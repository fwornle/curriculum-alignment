/**
 * Coordinator Agent Lambda Function
 * 
 * Central orchestration agent responsible for managing multi-agent workflows,
 * routing requests to appropriate agents, and coordinating the overall
 * curriculum alignment process.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { WorkflowEngine, WorkflowRequest, WorkflowStep, WorkflowResult } from './workflow-engine';
import { logger } from '../../src/services/logging.service';
import { metrics } from '../../src/services/metrics.service';
import { errorHandler } from '../../src/utils/error-handler';
import { authenticate } from '../../src/middleware/auth.middleware';
import { AgentType, WorkflowStatus } from '../../src/database/models';
import { query } from '../../src/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Coordinator request types
 */
export enum CoordinatorRequestType {
  START_ANALYSIS = 'start_analysis',
  GET_STATUS = 'get_status',
  STOP_WORKFLOW = 'stop_workflow',
  LIST_WORKFLOWS = 'list_workflows',
  GET_WORKFLOW_HISTORY = 'get_workflow_history',
  HEALTH_CHECK = 'health_check',
}

/**
 * Analysis request structure
 */
interface AnalysisRequest {
  type: CoordinatorRequestType.START_ANALYSIS;
  data: {
    universityId: string;
    programId: string;
    targetPrograms?: string[];
    analysisType: 'full' | 'quick' | 'comparison';
    preferences?: {
      includeAccreditation?: boolean;
      includePeerComparison?: boolean;
      includeGapAnalysis?: boolean;
      priority?: 'speed' | 'accuracy' | 'cost';
    };
  };
}

/**
 * Status request structure
 */
interface StatusRequest {
  type: CoordinatorRequestType.GET_STATUS;
  data: {
    workflowId: string;
  };
}

/**
 * Workflow response structure
 */
interface WorkflowResponse {
  workflowId: string;
  status: WorkflowStatus;
  currentStep?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  agents: {
    agentType: AgentType;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    startTime?: string;
    endTime?: string;
    error?: string;
  }[];
  results?: any;
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
}

/**
 * Global workflow engine instance
 */
const workflowEngine = new WorkflowEngine();

/**
 * Lambda handler for coordinator agent
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Set up request context
  const requestId = context.awsRequestId;
  const startTime = Date.now();
  
  logger.info('Coordinator agent invoked', {
    requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    userAgent: event.headers['User-Agent'],
  });

  try {
    // Parse request body
    let requestBody;
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }
    }

    // Route based on HTTP method and path
    const method = event.httpMethod.toUpperCase();
    const pathSegments = event.path.split('/').filter(Boolean);
    
    let response: APIGatewayProxyResult;

    switch (method) {
      case 'POST':
        if (pathSegments.includes('analyze')) {
          response = await handleStartAnalysis(requestBody, event, requestId);
        } else if (pathSegments.includes('stop')) {
          response = await handleStopWorkflow(requestBody, event, requestId);
        } else {
          response = createErrorResponse(404, 'Endpoint not found');
        }
        break;

      case 'GET':
        if (pathSegments.includes('status')) {
          const workflowId = pathSegments[pathSegments.indexOf('status') + 1];
          response = await handleGetStatus(workflowId, event, requestId);
        } else if (pathSegments.includes('workflows')) {
          response = await handleListWorkflows(event, requestId);
        } else if (pathSegments.includes('health')) {
          response = await handleHealthCheck(requestId);
        } else {
          response = createErrorResponse(404, 'Endpoint not found');
        }
        break;

      default:
        response = createErrorResponse(405, 'Method not allowed');
    }

    // Record metrics
    const duration = Date.now() - startTime;
    metrics.recordHttpMetrics(method, event.path, response.statusCode, duration);

    logger.info('Coordinator request completed', {
      requestId,
      statusCode: response.statusCode,
      duration,
    });

    return response;

  } catch (error) {
    logger.error('Coordinator agent error', error as Error, { requestId });
    
    const duration = Date.now() - startTime;
    metrics.recordHttpMetrics(event.httpMethod, event.path, 500, duration);

    return createErrorResponse(500, 'Internal server error');
  }
};

/**
 * Handle start analysis request
 */
async function handleStartAnalysis(
  requestBody: AnalysisRequest,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Validate request
    if (!requestBody || requestBody.type !== CoordinatorRequestType.START_ANALYSIS) {
      return createErrorResponse(400, 'Invalid analysis request');
    }

    const { universityId, programId, targetPrograms, analysisType, preferences } = requestBody.data;

    if (!universityId || !programId) {
      return createErrorResponse(400, 'universityId and programId are required');
    }

    // Create workflow request
    const workflowRequest: WorkflowRequest = {
      workflowId: uuidv4(),
      type: 'curriculum_analysis',
      parameters: {
        universityId,
        programId,
        targetPrograms: targetPrograms || [],
        analysisType,
        preferences: preferences || {},
      },
      requestId,
      userId: getUserIdFromEvent(event),
      priority: preferences?.priority || 'accuracy',
    };

    // Start workflow
    const workflowResult = await errorHandler.execute(
      () => workflowEngine.startWorkflow(workflowRequest),
      {
        operationName: 'start_workflow',
        correlationId: requestId,
        timeout: 30000, // 30 second timeout for workflow start
      }
    );

    // Convert to response format
    const response: WorkflowResponse = {
      workflowId: workflowResult.workflowId,
      status: workflowResult.status,
      currentStep: workflowResult.currentStep?.name,
      progress: {
        completed: workflowResult.completedSteps.length,
        total: workflowResult.steps.length,
        percentage: Math.round((workflowResult.completedSteps.length / workflowResult.steps.length) * 100),
      },
      agents: workflowResult.steps.map(step => ({
        agentType: step.agentType,
        status: step.status,
        progress: step.progress,
        startTime: step.startTime?.toISOString(),
        endTime: step.endTime?.toISOString(),
        error: step.error,
      })),
      createdAt: workflowResult.createdAt.toISOString(),
      updatedAt: workflowResult.updatedAt.toISOString(),
      estimatedCompletion: workflowResult.estimatedCompletion?.toISOString(),
    };

    logger.info('Analysis workflow started', {
      workflowId: workflowResult.workflowId,
      universityId,
      programId,
      analysisType,
      requestId,
    });

    return createSuccessResponse(response);

  } catch (error) {
    logger.error('Failed to start analysis', error as Error, { requestId });
    return createErrorResponse(500, 'Failed to start analysis workflow');
  }
}

/**
 * Handle get status request
 */
async function handleGetStatus(
  workflowId: string,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    if (!workflowId) {
      return createErrorResponse(400, 'workflowId is required');
    }

    // Get workflow status
    const workflowResult = await errorHandler.execute(
      () => workflowEngine.getWorkflowStatus(workflowId),
      {
        operationName: 'get_workflow_status',
        correlationId: requestId,
      }
    );

    if (!workflowResult) {
      return createErrorResponse(404, 'Workflow not found');
    }

    // Convert to response format
    const response: WorkflowResponse = {
      workflowId: workflowResult.workflowId,
      status: workflowResult.status,
      currentStep: workflowResult.currentStep?.name,
      progress: {
        completed: workflowResult.completedSteps.length,
        total: workflowResult.steps.length,
        percentage: Math.round((workflowResult.completedSteps.length / workflowResult.steps.length) * 100),
      },
      agents: workflowResult.steps.map(step => ({
        agentType: step.agentType,
        status: step.status,
        progress: step.progress,
        startTime: step.startTime?.toISOString(),
        endTime: step.endTime?.toISOString(),
        error: step.error,
      })),
      results: workflowResult.results,
      createdAt: workflowResult.createdAt.toISOString(),
      updatedAt: workflowResult.updatedAt.toISOString(),
      estimatedCompletion: workflowResult.estimatedCompletion?.toISOString(),
    };

    return createSuccessResponse(response);

  } catch (error) {
    logger.error('Failed to get workflow status', error as Error, { workflowId, requestId });
    return createErrorResponse(500, 'Failed to get workflow status');
  }
}

/**
 * Handle stop workflow request
 */
async function handleStopWorkflow(
  requestBody: { workflowId: string },
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    if (!requestBody || !requestBody.workflowId) {
      return createErrorResponse(400, 'workflowId is required');
    }

    const { workflowId } = requestBody;

    // Stop workflow
    await errorHandler.execute(
      () => workflowEngine.stopWorkflow(workflowId),
      {
        operationName: 'stop_workflow',
        correlationId: requestId,
      }
    );

    logger.info('Workflow stopped', { workflowId, requestId });

    return createSuccessResponse({ 
      message: 'Workflow stopped successfully',
      workflowId 
    });

  } catch (error) {
    logger.error('Failed to stop workflow', error as Error, { requestId });
    return createErrorResponse(500, 'Failed to stop workflow');
  }
}

/**
 * Handle list workflows request
 */
async function handleListWorkflows(
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserIdFromEvent(event);
    const limit = parseInt(event.queryStringParameters?.limit || '20');
    const offset = parseInt(event.queryStringParameters?.offset || '0');
    const status = event.queryStringParameters?.status as WorkflowStatus;

    // Get workflows from database
    let query_text = `
      SELECT 
        workflow_id,
        workflow_type,
        status,
        parameters,
        created_at,
        updated_at,
        completed_at
      FROM agent_workflows 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query_text += ` AND user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (status) {
      query_text += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query_text += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(query_text, params);

    const workflows = result.rows.map(row => ({
      workflowId: row.workflow_id,
      type: row.workflow_type,
      status: row.status,
      parameters: row.parameters,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    }));

    return createSuccessResponse({
      workflows,
      pagination: {
        limit,
        offset,
        count: workflows.length,
      },
    });

  } catch (error) {
    logger.error('Failed to list workflows', error as Error, { requestId });
    return createErrorResponse(500, 'Failed to list workflows');
  }
}

/**
 * Handle health check request
 */
async function handleHealthCheck(requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const health = await workflowEngine.healthCheck();
    
    return createSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      coordinator: health,
      requestId,
    });

  } catch (error) {
    logger.error('Health check failed', error as Error, { requestId });
    return createErrorResponse(503, 'Service unhealthy');
  }
}

/**
 * Extract user ID from event (assuming JWT authentication)
 */
function getUserIdFromEvent(event: APIGatewayProxyEvent): string | undefined {
  // In a real implementation, this would extract the user ID from the JWT token
  // For now, we'll use a header or query parameter
  return event.headers['x-user-id'] || event.queryStringParameters?.userId;
}

/**
 * Create success response
 */
function createSuccessResponse(data: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Create error response
 */
function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        code: statusCode,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}