import { EventBridge } from 'aws-sdk';
import { SQS } from 'aws-sdk';
import { logger } from '../services/logging.service';
import { costTracker } from '../services/cost-tracking.service';

export interface AgentMessage {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  messageType: string;
  payload: any;
  timestamp: string;
  correlationId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  expiresAt?: string;
  routingKey?: string;
}

export interface MessageDeliveryResult {
  success: boolean;
  messageId: string;
  error?: string;
  deliveryTime: number;
}

export interface MessageHandler {
  messageType: string;
  handler: (message: AgentMessage) => Promise<any>;
}

export interface CommunicationConfig {
  region: string;
  eventBusName: string;
  sqsQueueUrl: string;
  dlqUrl: string;
  maxRetries: number;
  defaultTimeout: number;
  enableMetrics: boolean;
  enableCostTracking: boolean;
}

export class AgentCommunicationService {
  private eventBridge: EventBridge;
  private sqs: SQS;
  private messageHandlers: Map<string, MessageHandler[]>;
  private config: CommunicationConfig;
  private isListening: boolean = false;

  constructor(config: CommunicationConfig) {
    this.config = config;
    this.eventBridge = new EventBridge({ region: config.region });
    this.sqs = new SQS({ region: config.region });
    this.messageHandlers = new Map();
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<MessageDeliveryResult> {
    const startTime = Date.now();
    const requestId = `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const fullMessage: AgentMessage = {
        ...message,
        id: requestId,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      // Log outbound message
      logger.info('Sending inter-agent message', {
        requestId,
        messageId: fullMessage.id,
        sourceAgent: fullMessage.sourceAgent,
        targetAgent: fullMessage.targetAgent,
        messageType: fullMessage.messageType,
        priority: fullMessage.priority
      });

      // Route message based on delivery preference
      let deliveryResult: MessageDeliveryResult;

      if (message.priority === 'urgent' || message.priority === 'high') {
        // Use EventBridge for high-priority messages (immediate delivery)
        deliveryResult = await this.sendViaEventBridge(fullMessage);
      } else {
        // Use SQS for normal/low priority messages (queued delivery)
        deliveryResult = await this.sendViaSQS(fullMessage);
      }

      // Track message delivery metrics
      if (this.config.enableMetrics) {
        await this.recordDeliveryMetrics(fullMessage, deliveryResult, Date.now() - startTime);
      }

      // Track communication costs
      if (this.config.enableCostTracking) {
        await costTracker.trackCommunicationCost({
          messageType: fullMessage.messageType,
          payloadSize: JSON.stringify(fullMessage.payload).length,
          deliveryMethod: deliveryResult.success ? 'eventbridge' : 'sqs'
        }, requestId);
      }

      return deliveryResult;
    } catch (error) {
      logger.error('Failed to send inter-agent message', {
        requestId,
        error: error.message,
        sourceAgent: message.sourceAgent,
        targetAgent: message.targetAgent
      });

      return {
        success: false,
        messageId: requestId,
        error: error.message,
        deliveryTime: Date.now() - startTime
      };
    }
  }

  /**
   * Send message via EventBridge for immediate delivery
   */
  private async sendViaEventBridge(message: AgentMessage): Promise<MessageDeliveryResult> {
    const params = {
      Entries: [{
        Source: `curriculum-alignment.agent.${message.sourceAgent}`,
        DetailType: message.messageType,
        Detail: JSON.stringify(message),
        EventBusName: this.config.eventBusName,
        Resources: [`agent:${message.targetAgent}`]
      }]
    };

    const result = await this.eventBridge.putEvents(params).promise();
    
    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      throw new Error(`Failed to deliver message via EventBridge: ${result.Entries[0]?.ErrorMessage}`);
    }

    return {
      success: true,
      messageId: message.id,
      deliveryTime: 0 // EventBridge is immediate
    };
  }

  /**
   * Send message via SQS for queued delivery
   */
  private async sendViaSQS(message: AgentMessage): Promise<MessageDeliveryResult> {
    const params = {
      QueueUrl: this.config.sqsQueueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        targetAgent: {
          DataType: 'String',
          StringValue: message.targetAgent
        },
        messageType: {
          DataType: 'String',
          StringValue: message.messageType
        },
        priority: {
          DataType: 'String',
          StringValue: message.priority
        }
      },
      DelaySeconds: message.priority === 'low' ? 5 : 0
    };

    const result = await this.sqs.sendMessage(params).promise();

    return {
      success: true,
      messageId: result.MessageId || message.id,
      deliveryTime: message.priority === 'low' ? 5000 : 0
    };
  }

  /**
   * Register a message handler for specific message types
   */
  registerHandler(messageType: string, handler: (message: AgentMessage) => Promise<any>): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }

    this.messageHandlers.get(messageType)!.push({
      messageType,
      handler
    });

    logger.info('Registered message handler', {
      messageType,
      handlerCount: this.messageHandlers.get(messageType)!.length
    });
  }

  /**
   * Start listening for incoming messages
   */
  async startListening(agentName: string): Promise<void> {
    if (this.isListening) {
      logger.warn('Communication service already listening');
      return;
    }

    this.isListening = true;
    logger.info('Starting message listener', { agentName });

    // Start SQS polling
    this.pollSQSMessages(agentName);

    // EventBridge messages will be handled via Lambda triggers
    logger.info('Message listener started', { agentName });
  }

  /**
   * Stop listening for messages
   */
  stopListening(): void {
    this.isListening = false;
    logger.info('Stopped message listener');
  }

  /**
   * Poll SQS for messages
   */
  private async pollSQSMessages(agentName: string): Promise<void> {
    while (this.isListening) {
      try {
        const params = {
          QueueUrl: this.config.sqsQueueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20, // Long polling
          MessageAttributeNames: ['All']
        };

        const result = await this.sqs.receiveMessage(params).promise();

        if (result.Messages && result.Messages.length > 0) {
          await Promise.all(
            result.Messages.map(sqsMessage => this.processIncomingMessage(sqsMessage, agentName))
          );
        }
      } catch (error) {
        logger.error('Error polling SQS messages', {
          error: error.message,
          agentName
        });
        
        // Wait before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process an incoming message
   */
  private async processIncomingMessage(sqsMessage: any, agentName: string): Promise<void> {
    try {
      const message: AgentMessage = JSON.parse(sqsMessage.Body);

      // Check if message is intended for this agent
      if (message.targetAgent !== agentName) {
        logger.debug('Message not for this agent, ignoring', {
          targetAgent: message.targetAgent,
          currentAgent: agentName,
          messageId: message.id
        });
        return;
      }

      // Check if message has expired
      if (message.expiresAt && new Date(message.expiresAt) < new Date()) {
        logger.warn('Received expired message', {
          messageId: message.id,
          expiresAt: message.expiresAt
        });
        
        await this.deleteMessage(sqsMessage.ReceiptHandle);
        return;
      }

      logger.info('Processing incoming message', {
        messageId: message.id,
        sourceAgent: message.sourceAgent,
        targetAgent: message.targetAgent,
        messageType: message.messageType
      });

      // Find and execute handlers
      const handlers = this.messageHandlers.get(message.messageType) || [];
      
      if (handlers.length === 0) {
        logger.warn('No handlers registered for message type', {
          messageType: message.messageType,
          messageId: message.id
        });
        
        // Send to DLQ for manual inspection
        await this.sendToDLQ(message, 'No handlers available');
        await this.deleteMessage(sqsMessage.ReceiptHandle);
        return;
      }

      // Execute all handlers
      const results = await Promise.allSettled(
        handlers.map(handler => handler.handler(message))
      );

      // Check for handler failures
      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        logger.error('Message handler failures', {
          messageId: message.id,
          failureCount: failures.length,
          totalHandlers: handlers.length,
          failures: failures.map(f => (f as PromiseRejectedResult).reason.message)
        });

        // Retry logic
        if (message.retryCount < this.config.maxRetries) {
          await this.retryMessage(message);
        } else {
          await this.sendToDLQ(message, 'Max retries exceeded');
        }
      } else {
        logger.info('Message processed successfully', {
          messageId: message.id,
          handlerCount: handlers.length
        });
      }

      // Delete message from queue
      await this.deleteMessage(sqsMessage.ReceiptHandle);

    } catch (error) {
      logger.error('Error processing incoming message', {
        error: error.message,
        sqsMessageId: sqsMessage.MessageId
      });
      
      // Don't delete the message, let it be retried
    }
  }

  /**
   * Delete message from SQS queue
   */
  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      await this.sqs.deleteMessage({
        QueueUrl: this.config.sqsQueueUrl,
        ReceiptHandle: receiptHandle
      }).promise();
    } catch (error) {
      logger.error('Failed to delete message from queue', {
        error: error.message,
        receiptHandle
      });
    }
  }

  /**
   * Retry a failed message
   */
  private async retryMessage(message: AgentMessage): Promise<void> {
    const retryMessage: AgentMessage = {
      ...message,
      retryCount: message.retryCount + 1,
      timestamp: new Date().toISOString()
    };

    // Exponential backoff delay
    const delaySeconds = Math.min(Math.pow(2, message.retryCount) * 5, 900); // Max 15 minutes

    const params = {
      QueueUrl: this.config.sqsQueueUrl,
      MessageBody: JSON.stringify(retryMessage),
      DelaySeconds: delaySeconds,
      MessageAttributes: {
        targetAgent: {
          DataType: 'String',
          StringValue: message.targetAgent
        },
        messageType: {
          DataType: 'String',
          StringValue: message.messageType
        },
        retryCount: {
          DataType: 'Number',
          StringValue: retryMessage.retryCount.toString()
        }
      }
    };

    await this.sqs.sendMessage(params).promise();

    logger.info('Message scheduled for retry', {
      messageId: message.id,
      retryCount: retryMessage.retryCount,
      delaySeconds
    });
  }

  /**
   * Send message to Dead Letter Queue
   */
  private async sendToDLQ(message: AgentMessage, reason: string): Promise<void> {
    try {
      const dlqMessage = {
        ...message,
        dlqReason: reason,
        dlqTimestamp: new Date().toISOString()
      };

      await this.sqs.sendMessage({
        QueueUrl: this.config.dlqUrl,
        MessageBody: JSON.stringify(dlqMessage)
      }).promise();

      logger.error('Message sent to DLQ', {
        messageId: message.id,
        reason
      });
    } catch (error) {
      logger.error('Failed to send message to DLQ', {
        messageId: message.id,
        error: error.message
      });
    }
  }

  /**
   * Record delivery metrics
   */
  private async recordDeliveryMetrics(
    message: AgentMessage, 
    result: MessageDeliveryResult, 
    processingTime: number
  ): Promise<void> {
    try {
      // Implementation would send metrics to CloudWatch
      logger.info('Message delivery metrics', {
        messageId: message.id,
        success: result.success,
        deliveryTime: result.deliveryTime,
        processingTime,
        sourceAgent: message.sourceAgent,
        targetAgent: message.targetAgent,
        messageType: message.messageType,
        priority: message.priority,
        payloadSize: JSON.stringify(message.payload).length
      });
    } catch (error) {
      logger.error('Failed to record delivery metrics', {
        error: error.message,
        messageId: message.id
      });
    }
  }

  /**
   * Get communication statistics
   */
  async getStatistics(): Promise<any> {
    try {
      // Get SQS queue attributes
      const queueAttributes = await this.sqs.getQueueAttributes({
        QueueUrl: this.config.sqsQueueUrl,
        AttributeNames: ['All']
      }).promise();

      const dlqAttributes = await this.sqs.getQueueAttributes({
        QueueUrl: this.config.dlqUrl,
        AttributeNames: ['All']
      }).promise();

      return {
        queue: {
          messagesAvailable: parseInt(queueAttributes.Attributes?.ApproximateNumberOfMessages || '0'),
          messagesInFlight: parseInt(queueAttributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'),
          messagesDelayed: parseInt(queueAttributes.Attributes?.ApproximateNumberOfMessagesDelayed || '0')
        },
        dlq: {
          messagesAvailable: parseInt(dlqAttributes.Attributes?.ApproximateNumberOfMessages || '0')
        },
        handlers: {
          registeredTypes: Array.from(this.messageHandlers.keys()),
          totalHandlers: Array.from(this.messageHandlers.values()).reduce((sum, handlers) => sum + handlers.length, 0)
        },
        status: {
          isListening: this.isListening
        }
      };
    } catch (error) {
      logger.error('Failed to get communication statistics', {
        error: error.message
      });
      
      return {
        error: error.message
      };
    }
  }
}

// Factory function for creating communication service
export function createCommunicationService(config: CommunicationConfig): AgentCommunicationService {
  return new AgentCommunicationService(config);
}

// Default configuration
export const defaultCommunicationConfig: CommunicationConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  eventBusName: process.env.EVENT_BUS_NAME || 'curriculum-alignment-events',
  sqsQueueUrl: process.env.SQS_QUEUE_URL || '',
  dlqUrl: process.env.DLQ_URL || '',
  maxRetries: parseInt(process.env.MAX_MESSAGE_RETRIES || '3'),
  defaultTimeout: parseInt(process.env.MESSAGE_TIMEOUT || '30000'),
  enableMetrics: process.env.ENABLE_COMMUNICATION_METRICS === 'true',
  enableCostTracking: process.env.ENABLE_COST_TRACKING === 'true'
};