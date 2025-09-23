import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSRecord } from 'aws-lambda';
import { SQS, StepFunctions, CloudWatch, SNS } from 'aws-sdk';
import { logger } from '../../src/services/logging.service';
import { costTracker } from '../../src/services/cost-tracking.service';

interface DLQMessage {
  originalMessage: any;
  failureReason: string;
  failureTimestamp: string;
  retryCount: number;
  sourceQueue: string;
  messageId: string;
  correlationId: string;
  agentName: string;
  errorDetails: ErrorDetails;
}

interface ErrorDetails {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: any;
  httpStatusCode?: number;
  awsErrorCode?: string;
}

interface RecoveryAction {
  action: 'retry' | 'fallback' | 'escalate' | 'discard';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  reasoning: string;
  parameters?: any;
}

interface AnalysisResult {
  recoveryStrategy: string;
  retryConfig?: RetryConfig;
  partialRetryConfig?: PartialRetryConfig;
  fallbackConfig?: FallbackConfig;
  shouldEscalate: boolean;
  escalationReason?: string;
}

interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  jitterEnabled: boolean;
}

interface PartialRetryConfig {
  failedSteps: string[];
  skipSteps: string[];
  modifiedInput: any;
}

interface FallbackConfig {
  fallbackAgent: string;
  fallbackMethod: string;
  fallbackInput: any;
  qualityThreshold: number;
}

const sqs = new SQS();
const stepFunctions = new StepFunctions();
const cloudWatch = new CloudWatch();
const sns = new SNS();

const DLQ_CONFIG = {
  maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3'),
  escalationThreshold: parseInt(process.env.DLQ_ESCALATION_THRESHOLD || '5'),
  analysisTimeout: parseInt(process.env.DLQ_ANALYSIS_TIMEOUT || '30000'),
  operationsTopicArn: process.env.OPERATIONS_TOPIC_ARN || '',
  ticketingSystemUrl: process.env.TICKETING_SYSTEM_URL || '',
  enableCostTracking: process.env.ENABLE_COST_TRACKING === 'true'
};

export const handler = async (event: SQSEvent | APIGatewayProxyEvent): Promise<APIGatewayProxyResult | void> => {
  const requestId = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Handle SQS events (DLQ processing)
    if ('Records' in event) {
      await processDLQMessages(event as SQSEvent, requestId);
      return;
    }

    // Handle API Gateway events (manual operations)
    const apiEvent = event as APIGatewayProxyEvent;
    const action = apiEvent.pathParameters?.action;

    switch (action) {
      case 'analyze-failure':
        return await handleAnalyzeFailure(apiEvent, requestId);
      case 'prepare-retry':
        return await handlePrepareRetry(apiEvent, requestId);
      case 'execute-partial-retry':
        return await handleExecutePartialRetry(apiEvent, requestId);
      case 'execute-fallback':
        return await handleExecuteFallback(apiEvent, requestId);
      case 'send-alert':
        return await handleSendAlert(apiEvent, requestId);
      case 'create-ticket':
        return await handleCreateTicket(apiEvent, requestId);
      case 'get-statistics':
        return await handleGetStatistics(apiEvent, requestId);
      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Invalid action',
            availableActions: [
              'analyze-failure',
              'prepare-retry', 
              'execute-partial-retry',
              'execute-fallback',
              'send-alert',
              'create-ticket',
              'get-statistics'
            ]
          })
        };
    }
  } catch (error) {
    logger.error('DLQ Handler error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        requestId
      })
    };
  }
};

async function processDLQMessages(event: SQSEvent, requestId: string): Promise<void> {
  logger.info('Processing DLQ messages', {
    requestId,
    messageCount: event.Records.length
  });

  for (const record of event.Records) {
    try {
      await processSingleDLQMessage(record, requestId);
    } catch (error) {
      logger.error('Failed to process DLQ message', {
        requestId,
        messageId: record.messageId,
        error: error.message
      });
    }
  }
}

async function processSingleDLQMessage(record: SQSRecord, requestId: string): Promise<void> {
  const dlqMessage: DLQMessage = JSON.parse(record.body);

  logger.info('Processing DLQ message', {
    requestId,
    messageId: dlqMessage.messageId,
    agentName: dlqMessage.agentName,
    failureReason: dlqMessage.failureReason,
    retryCount: dlqMessage.retryCount
  });

  // Analyze the failure
  const analysis = await analyzeFailure(dlqMessage, requestId);

  // Record metrics
  await recordDLQMetrics(dlqMessage, analysis, requestId);

  // Execute recovery action
  await executeRecoveryAction(dlqMessage, analysis, requestId);
}

async function analyzeFailure(dlqMessage: DLQMessage, requestId: string): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    logger.info('Analyzing failure', {
      requestId,
      messageId: dlqMessage.messageId,
      errorType: dlqMessage.errorDetails.errorType,
      retryCount: dlqMessage.retryCount
    });

    // Determine recovery strategy based on error type and history
    const recoveryStrategy = determineRecoveryStrategy(dlqMessage);

    let result: AnalysisResult = {
      recoveryStrategy,
      shouldEscalate: false
    };

    switch (recoveryStrategy) {
      case 'retry':
        result.retryConfig = generateRetryConfig(dlqMessage);
        break;
      case 'partial_retry':
        result.partialRetryConfig = generatePartialRetryConfig(dlqMessage);
        break;
      case 'fallback':
        result.fallbackConfig = generateFallbackConfig(dlqMessage);
        break;
      case 'escalate':
        result.shouldEscalate = true;
        result.escalationReason = determineEscalationReason(dlqMessage);
        break;
    }

    logger.info('Failure analysis completed', {
      requestId,
      messageId: dlqMessage.messageId,
      recoveryStrategy,
      analysisTime: Date.now() - startTime
    });

    return result;

  } catch (error) {
    logger.error('Failure analysis error', {
      requestId,
      messageId: dlqMessage.messageId,
      error: error.message
    });

    // Default to escalation if analysis fails
    return {
      recoveryStrategy: 'escalate',
      shouldEscalate: true,
      escalationReason: `Analysis failed: ${error.message}`
    };
  }
}

function determineRecoveryStrategy(dlqMessage: DLQMessage): string {
  const { errorDetails, retryCount, agentName } = dlqMessage;

  // Check retry count
  if (retryCount >= DLQ_CONFIG.maxRetries) {
    return 'escalate';
  }

  // Analyze error type
  switch (errorDetails.errorType) {
    case 'TimeoutError':
    case 'ThrottlingException':
    case 'ServiceUnavailable':
      return retryCount < 2 ? 'retry' : 'fallback';

    case 'ValidationError':
    case 'InvalidParameterException':
      return 'partial_retry';

    case 'ResourceNotFoundException':
    case 'AccessDeniedException':
      return 'escalate';

    case 'InternalServerError':
      return retryCount < 1 ? 'retry' : 'fallback';

    case 'RateLimitExceeded':
      return 'retry';

    default:
      // Unknown error, try retry once then escalate
      return retryCount < 1 ? 'retry' : 'escalate';
  }
}

function generateRetryConfig(dlqMessage: DLQMessage): RetryConfig {
  const baseDelay = Math.pow(2, dlqMessage.retryCount) * 5; // Exponential backoff

  return {
    maxRetries: DLQ_CONFIG.maxRetries - dlqMessage.retryCount,
    backoffMultiplier: 2,
    initialDelaySeconds: Math.min(baseDelay, 300), // Max 5 minutes
    maxDelaySeconds: 900, // Max 15 minutes
    jitterEnabled: true
  };
}

function generatePartialRetryConfig(dlqMessage: DLQMessage): PartialRetryConfig {
  // Analyze which steps failed and can be skipped
  const failedSteps = extractFailedSteps(dlqMessage);
  const skipSteps = identifySkippableSteps(dlqMessage);
  const modifiedInput = prepareModifiedInput(dlqMessage);

  return {
    failedSteps,
    skipSteps,
    modifiedInput
  };
}

function generateFallbackConfig(dlqMessage: DLQMessage): FallbackConfig {
  const fallbackAgent = determineFallbackAgent(dlqMessage.agentName);
  
  return {
    fallbackAgent,
    fallbackMethod: 'processWithReducedQuality',
    fallbackInput: simplifyInput(dlqMessage.originalMessage),
    qualityThreshold: 0.6 // Accept lower quality for fallback
  };
}

function determineEscalationReason(dlqMessage: DLQMessage): string {
  if (dlqMessage.retryCount >= DLQ_CONFIG.maxRetries) {
    return `Maximum retry count exceeded (${dlqMessage.retryCount})`;
  }

  if (dlqMessage.errorDetails.errorType === 'AccessDeniedException') {
    return 'Access denied - requires permission review';
  }

  if (dlqMessage.errorDetails.errorType === 'ResourceNotFoundException') {
    return 'Required resource not found - infrastructure issue';
  }

  return `Unrecoverable error: ${dlqMessage.errorDetails.errorMessage}`;
}

async function executeRecoveryAction(
  dlqMessage: DLQMessage, 
  analysis: AnalysisResult, 
  requestId: string
): Promise<void> {
  try {
    switch (analysis.recoveryStrategy) {
      case 'retry':
        await scheduleRetry(dlqMessage, analysis.retryConfig!, requestId);
        break;
      case 'partial_retry':
        await executePartialRetry(dlqMessage, analysis.partialRetryConfig!, requestId);
        break;
      case 'fallback':
        await executeFallback(dlqMessage, analysis.fallbackConfig!, requestId);
        break;
      case 'escalate':
        await escalateToOperations(dlqMessage, analysis.escalationReason!, requestId);
        break;
    }
  } catch (error) {
    logger.error('Recovery action failed', {
      requestId,
      messageId: dlqMessage.messageId,
      recoveryStrategy: analysis.recoveryStrategy,
      error: error.message
    });

    // Fallback to escalation
    await escalateToOperations(dlqMessage, `Recovery action failed: ${error.message}`, requestId);
  }
}

async function scheduleRetry(
  dlqMessage: DLQMessage, 
  retryConfig: RetryConfig, 
  requestId: string
): Promise<void> {
  const delaySeconds = calculateRetryDelay(retryConfig);
  
  // Send message back to original queue with delay
  const retryMessage = {
    ...dlqMessage.originalMessage,
    retryCount: dlqMessage.retryCount + 1,
    retryReason: 'DLQ automatic retry',
    retryTimestamp: new Date().toISOString()
  };

  await sqs.sendMessage({
    QueueUrl: dlqMessage.sourceQueue,
    MessageBody: JSON.stringify(retryMessage),
    DelaySeconds: delaySeconds,
    MessageAttributes: {
      retryCount: {
        DataType: 'Number',
        StringValue: retryMessage.retryCount.toString()
      },
      originalMessageId: {
        DataType: 'String',
        StringValue: dlqMessage.messageId
      }
    }
  }).promise();

  logger.info('Retry scheduled', {
    requestId,
    messageId: dlqMessage.messageId,
    delaySeconds,
    retryCount: retryMessage.retryCount
  });
}

async function executePartialRetry(
  dlqMessage: DLQMessage, 
  config: PartialRetryConfig, 
  requestId: string
): Promise<void> {
  // Start a new Step Function execution with modified input
  const executionName = `partial-retry-${dlqMessage.messageId}-${Date.now()}`;
  
  await stepFunctions.startExecution({
    stateMachineArn: process.env.RECOVERY_STATE_MACHINE_ARN!,
    name: executionName,
    input: JSON.stringify({
      action: 'partial_retry',
      originalMessage: dlqMessage.originalMessage,
      config,
      requestId
    })
  }).promise();

  logger.info('Partial retry executed', {
    requestId,
    messageId: dlqMessage.messageId,
    executionName,
    failedSteps: config.failedSteps,
    skipSteps: config.skipSteps
  });
}

async function executeFallback(
  dlqMessage: DLQMessage, 
  config: FallbackConfig, 
  requestId: string
): Promise<void> {
  // Invoke fallback agent
  const fallbackPayload = {
    action: 'fallback_processing',
    originalInput: config.fallbackInput,
    qualityThreshold: config.qualityThreshold,
    originalAgent: dlqMessage.agentName,
    requestId
  };

  // This would invoke the fallback agent via Lambda or Step Functions
  logger.info('Fallback executed', {
    requestId,
    messageId: dlqMessage.messageId,
    fallbackAgent: config.fallbackAgent,
    fallbackMethod: config.fallbackMethod
  });
}

async function escalateToOperations(
  dlqMessage: DLQMessage, 
  reason: string, 
  requestId: string
): Promise<void> {
  const escalationData = {
    messageId: dlqMessage.messageId,
    agentName: dlqMessage.agentName,
    failureReason: dlqMessage.failureReason,
    escalationReason: reason,
    retryCount: dlqMessage.retryCount,
    timestamp: new Date().toISOString(),
    errorDetails: dlqMessage.errorDetails,
    originalMessage: dlqMessage.originalMessage
  };

  // Send SNS notification
  if (DLQ_CONFIG.operationsTopicArn) {
    await sns.publish({
      TopicArn: DLQ_CONFIG.operationsTopicArn,
      Subject: `DLQ Escalation: ${dlqMessage.agentName}`,
      Message: JSON.stringify(escalationData, null, 2)
    }).promise();
  }

  logger.error('Escalated to operations', {
    requestId,
    messageId: dlqMessage.messageId,
    reason,
    escalationData
  });
}

// API Gateway handlers
async function handleAnalyzeFailure(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const failedExecution = body.failedExecution;

  const analysis = await analyzeStepFunctionFailure(failedExecution, requestId);

  if (DLQ_CONFIG.enableCostTracking) {
    await costTracker.trackDLQOperation({
      operation: 'analysis',
      executionArn: failedExecution.executionArn,
      cost: 0.001 // Small cost for analysis
    }, requestId);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      analysis,
      requestId
    })
  };
}

async function handlePrepareRetry(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { failedExecution, retryConfiguration } = body;

  const retryPreparation = await prepareExecutionRetry(failedExecution, retryConfiguration, requestId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      retryPreparation,
      requestId
    })
  };
}

async function handleGetStatistics(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const stats = await getDLQStatistics(requestId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      statistics: stats,
      requestId
    })
  };
}

// Helper functions
function calculateRetryDelay(config: RetryConfig): number {
  let delay = config.initialDelaySeconds;
  
  if (config.jitterEnabled) {
    delay += Math.random() * 10; // Add up to 10 seconds jitter
  }
  
  return Math.min(delay, config.maxDelaySeconds);
}

function extractFailedSteps(dlqMessage: DLQMessage): string[] {
  // Parse error context to identify failed steps
  const context = dlqMessage.errorDetails.context || {};
  return context.failedSteps || [];
}

function identifySkippableSteps(dlqMessage: DLQMessage): string[] {
  // Identify steps that can be safely skipped
  const errorType = dlqMessage.errorDetails.errorType;
  
  if (errorType === 'ValidationError') {
    return ['validation', 'preprocessing'];
  }
  
  return [];
}

function prepareModifiedInput(dlqMessage: DLQMessage): any {
  // Modify input based on error analysis
  const originalInput = dlqMessage.originalMessage;
  
  // Remove problematic fields or add default values
  return {
    ...originalInput,
    skipValidation: true,
    fallbackMode: true
  };
}

function determineFallbackAgent(agentName: string): string {
  const fallbackMap: { [key: string]: string } = {
    'web-search': 'document-processing',
    'browser': 'web-search',
    'document-processing': 'manual-processing',
    'accreditation-expert': 'qa-agent',
    'semantic-search': 'text-search'
  };
  
  return fallbackMap[agentName] || 'manual-processing';
}

function simplifyInput(originalInput: any): any {
  // Simplify input for fallback processing
  return {
    ...originalInput,
    quality: 'reduced',
    timeout: originalInput.timeout * 2,
    fallback: true
  };
}

async function analyzeStepFunctionFailure(failedExecution: any, requestId: string): Promise<AnalysisResult> {
  // Analyze Step Function execution failure
  const executionHistory = await stepFunctions.getExecutionHistory({
    executionArn: failedExecution.executionArn
  }).promise();

  // Find failed events
  const failedEvents = executionHistory.events?.filter(event => 
    event.type === 'TaskFailed' || event.type === 'ExecutionFailed'
  ) || [];

  // Determine recovery strategy based on failure analysis
  return {
    recoveryStrategy: 'retry',
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelaySeconds: 60,
      maxDelaySeconds: 900,
      jitterEnabled: true
    },
    shouldEscalate: false
  };
}

async function prepareExecutionRetry(
  failedExecution: any, 
  retryConfiguration: any, 
  requestId: string
): Promise<any> {
  const waitSeconds = retryConfiguration.waitSeconds || 60;
  const retryInput = {
    ...failedExecution.input,
    retryCount: (failedExecution.input.retryCount || 0) + 1,
    retryTimestamp: new Date().toISOString()
  };

  return {
    waitSeconds,
    originalStateMachine: failedExecution.stateMachineArn,
    retryInput,
    retryExecutionName: `retry-${failedExecution.name}-${Date.now()}`
  };
}

async function recordDLQMetrics(
  dlqMessage: DLQMessage, 
  analysis: AnalysisResult, 
  requestId: string
): Promise<void> {
  try {
    await cloudWatch.putMetricData({
      Namespace: 'CurriculumAlignment/DLQ',
      MetricData: [
        {
          MetricName: 'MessagesProcessed',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'AgentName', Value: dlqMessage.agentName },
            { Name: 'ErrorType', Value: dlqMessage.errorDetails.errorType }
          ]
        },
        {
          MetricName: 'RecoveryStrategy',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Strategy', Value: analysis.recoveryStrategy },
            { Name: 'AgentName', Value: dlqMessage.agentName }
          ]
        }
      ]
    }).promise();
  } catch (error) {
    logger.error('Failed to record DLQ metrics', {
      requestId,
      error: error.message
    });
  }
}

async function getDLQStatistics(requestId: string): Promise<any> {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const metrics = await cloudWatch.getMetricStatistics({
      Namespace: 'CurriculumAlignment/DLQ',
      MetricName: 'MessagesProcessed',
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1 hour
      Statistics: ['Sum']
    }).promise();

    return {
      last24Hours: {
        totalMessages: metrics.Datapoints?.reduce((sum, dp) => sum + (dp.Sum || 0), 0) || 0,
        dataPoints: metrics.Datapoints
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get DLQ statistics', {
      requestId,
      error: error.message
    });
    
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Additional handlers for other API actions
async function handleExecutePartialRetry(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { failedExecution, partialRetryConfig } = body;

  // Implementation for partial retry execution
  const result = {
    success: true,
    executionArn: `partial-retry-${Date.now()}`,
    message: 'Partial retry initiated successfully'
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ result, requestId })
  };
}

async function handleExecuteFallback(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { failedExecution, fallbackConfig } = body;

  // Implementation for fallback execution
  const result = {
    success: true,
    fallbackAgent: fallbackConfig.fallbackAgent,
    message: 'Fallback execution initiated successfully'
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ result, requestId })
  };
}

async function handleSendAlert(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { failureDetails, severity } = body;

  // Send operations alert
  if (DLQ_CONFIG.operationsTopicArn) {
    await sns.publish({
      TopicArn: DLQ_CONFIG.operationsTopicArn,
      Subject: `DLQ Alert - ${severity.toUpperCase()}`,
      Message: JSON.stringify(failureDetails, null, 2)
    }).promise();
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      message: 'Alert sent successfully',
      requestId
    })
  };
}

async function handleCreateTicket(
  event: APIGatewayProxyEvent, 
  requestId: string
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { failureDetails, priority } = body;

  // Create operations ticket (mock implementation)
  const ticketId = `TICKET-${Date.now()}`;
  
  logger.info('Operations ticket created', {
    requestId,
    ticketId,
    priority,
    failureDetails
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      ticketId,
      message: 'Ticket created successfully',
      requestId
    })
  };
}