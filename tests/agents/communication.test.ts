import { AgentCommunicationService, MessageBus, createCommunicationService, createMessageBus } from '../../src/agents/communication';
import { MockAWSServices } from './mocks/aws-services.mock';

// Mock AWS services
jest.mock('aws-sdk');
jest.mock('../../src/services/logging.service');
jest.mock('../../src/services/cost-tracking.service');

const mockAWS = new MockAWSServices();

describe('Agent Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAWS.reset();
  });

  describe('AgentCommunicationService', () => {
    let communicationService: AgentCommunicationService;

    beforeEach(() => {
      communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });
    });

    it('should send high-priority messages via EventBridge', async () => {
      const message = {
        sourceAgent: 'coordinator',
        targetAgent: 'web-search',
        messageType: 'search-request',
        payload: { query: 'computer science curriculum' },
        correlationId: 'test-correlation-123',
        priority: 'urgent' as const
      };

      const result = await communicationService.sendMessage(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockAWS.eventBridge.putEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              Source: 'curriculum-alignment.agent.coordinator',
              DetailType: 'search-request',
              Detail: expect.stringContaining('computer science curriculum')
            })
          ])
        })
      );
    });

    it('should send normal-priority messages via SQS', async () => {
      const message = {
        sourceAgent: 'document-processing',
        targetAgent: 'qa-agent',
        messageType: 'quality-check',
        payload: { documentId: 'doc-123' },
        correlationId: 'test-correlation-456',
        priority: 'normal' as const
      };

      const result = await communicationService.sendMessage(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
          MessageBody: expect.stringContaining('quality-check'),
          MessageAttributes: expect.objectContaining({
            targetAgent: expect.objectContaining({
              StringValue: 'qa-agent'
            }),
            messageType: expect.objectContaining({
              StringValue: 'quality-check'
            })
          })
        })
      );
    });

    it('should handle message delivery failures', async () => {
      mockAWS.eventBridge.shouldFail('putEvents', new Error('EventBridge unavailable'));

      const message = {
        sourceAgent: 'coordinator',
        targetAgent: 'web-search',
        messageType: 'search-request',
        payload: { query: 'test' },
        correlationId: 'test-correlation-789',
        priority: 'urgent' as const
      };

      const result = await communicationService.sendMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('EventBridge unavailable');
    });

    it('should register and execute message handlers', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ processed: true });
      
      communicationService.registerHandler('test-message', mockHandler);

      // Simulate receiving a message
      mockAWS.sqs.addMessage('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
        MessageId: 'test-msg-123',
        Body: JSON.stringify({
          id: 'test-msg-123',
          sourceAgent: 'test-sender',
          targetAgent: 'test-receiver',
          messageType: 'test-message',
          payload: { data: 'test' },
          timestamp: new Date().toISOString(),
          correlationId: 'test-correlation',
          priority: 'normal',
          retryCount: 0
        }),
        ReceiptHandle: 'receipt-123'
      });

      await communicationService.startListening('test-receiver');

      // Allow some time for message processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          messageType: 'test-message',
          payload: { data: 'test' },
          targetAgent: 'test-receiver'
        })
      );
    });

    it('should retry failed messages with exponential backoff', async () => {
      const message = {
        id: 'retry-test-123',
        sourceAgent: 'test-sender',
        targetAgent: 'test-receiver',
        messageType: 'test-retry',
        payload: { data: 'retry-test' },
        timestamp: new Date().toISOString(),
        correlationId: 'retry-correlation',
        priority: 'normal' as const,
        retryCount: 1
      };

      // Mock handler that fails
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      communicationService.registerHandler('test-retry', mockHandler);

      // Simulate message processing
      mockAWS.sqs.addMessage('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
        MessageId: message.id,
        Body: JSON.stringify(message),
        ReceiptHandle: 'receipt-retry'
      });

      await communicationService.startListening('test-receiver');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should retry the message with increased retry count
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageBody: expect.stringContaining('"retryCount":2'),
          DelaySeconds: expect.any(Number)
        })
      );
    });

    it('should send messages to DLQ after max retries', async () => {
      const message = {
        id: 'dlq-test-123',
        sourceAgent: 'test-sender',
        targetAgent: 'test-receiver',
        messageType: 'test-dlq',
        payload: { data: 'dlq-test' },
        timestamp: new Date().toISOString(),
        correlationId: 'dlq-correlation',
        priority: 'normal' as const,
        retryCount: 3 // Max retries reached
      };

      const mockHandler = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      communicationService.registerHandler('test-dlq', mockHandler);

      mockAWS.sqs.addMessage('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
        MessageId: message.id,
        Body: JSON.stringify(message),
        ReceiptHandle: 'receipt-dlq'
      });

      await communicationService.startListening('test-receiver');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should send to DLQ instead of retrying
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
          MessageBody: expect.stringContaining('dlqReason')
        })
      );
    });

    it('should provide communication statistics', async () => {
      const stats = await communicationService.getStatistics();

      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('dlq');
      expect(stats).toHaveProperty('handlers');
      expect(stats).toHaveProperty('status');
      expect(stats.status.isListening).toBe(false);
    });
  });

  describe('MessageBus', () => {
    let messageBus: MessageBus;
    let communicationService: AgentCommunicationService;

    beforeEach(() => {
      communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });

      messageBus = createMessageBus(communicationService, {
        enableLocalRouting: true,
        enableBroadcast: true,
        maxLocalQueueSize: 100,
        localMessageTimeout: 30000,
        enableRetryOnFailure: true,
        retryBackoffMultiplier: 2
      });
    });

    it('should start and stop message bus', async () => {
      await messageBus.start('test-agent');
      expect(messageBus.isStarted).toBe(true);

      await messageBus.stop();
      expect(messageBus.isStarted).toBe(false);
    });

    it('should send messages through communication service', async () => {
      await messageBus.start('test-agent');

      const message = {
        sourceAgent: 'test-agent',
        targetAgent: 'target-agent',
        messageType: 'test-message',
        payload: { data: 'test' },
        correlationId: 'test-correlation',
        priority: 'normal' as const
      };

      await messageBus.sendMessage(message);

      expect(mockAWS.sqs.sendMessage).toHaveBeenCalled();
    });

    it('should broadcast messages to multiple targets', async () => {
      await messageBus.start('test-agent');

      const broadcastMessage = {
        sourceAgent: 'coordinator',
        targets: ['web-search', 'document-processing', 'qa-agent'],
        messageType: 'broadcast-message',
        payload: { action: 'status-update' },
        correlationId: 'broadcast-correlation',
        priority: 'normal' as const
      };

      await messageBus.broadcastMessage(broadcastMessage);

      // Should send to each target
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should exclude targets from broadcast', async () => {
      await messageBus.start('test-agent');

      const broadcastMessage = {
        sourceAgent: 'coordinator',
        targets: ['web-search', 'document-processing', 'qa-agent', 'semantic-search'],
        excludeTargets: ['qa-agent'],
        messageType: 'broadcast-message',
        payload: { action: 'status-update' },
        correlationId: 'broadcast-correlation',
        priority: 'normal' as const
      };

      await messageBus.broadcastMessage(broadcastMessage);

      // Should send to 3 targets (excluding qa-agent)
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle subscriptions and message routing', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ processed: true });

      messageBus.subscribe({
        agentName: 'test-agent',
        messageTypes: ['subscription-test'],
        handler: mockHandler,
        priority: 1
      });

      await messageBus.start('test-agent');

      // Verify subscription was registered
      const stats = await messageBus.getStatistics();
      expect(stats.subscriptions.totalSubscriptions).toBeGreaterThan(0);
    });

    it('should add and remove custom routes', async () => {
      const route = {
        source: 'web-search',
        target: 'semantic-search',
        messageType: 'search-results',
        routingKey: 'priority-route',
        priority: 'high' as const
      };

      messageBus.addRoute(route);

      const routes = messageBus.getRoutes();
      expect(routes).toContainEqual(route);

      messageBus.removeRoute('web-search', 'semantic-search', 'search-results');

      const updatedRoutes = messageBus.getRoutes();
      expect(updatedRoutes).not.toContainEqual(route);
    });

    it('should handle standard message types (ping, echo, health-check)', async () => {
      await messageBus.start('test-agent');

      // Test ping message
      const pingMessage = {
        sourceAgent: 'test-sender',
        targetAgent: 'test-agent',
        messageType: 'ping',
        payload: { timestamp: new Date().toISOString() },
        correlationId: 'ping-test',
        priority: 'normal' as const
      };

      await messageBus.sendMessage(pingMessage);

      // Should respond with pong
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageBody: expect.stringContaining('pong')
        })
      );
    });

    it('should provide comprehensive statistics', async () => {
      await messageBus.start('test-agent');

      const subscription = {
        agentName: 'test-agent',
        messageTypes: ['test-message'],
        handler: jest.fn(),
        priority: 1
      };

      messageBus.subscribe(subscription);

      const stats = await messageBus.getStatistics();

      expect(stats).toHaveProperty('communication');
      expect(stats).toHaveProperty('localQueues');
      expect(stats).toHaveProperty('subscriptions');
      expect(stats).toHaveProperty('routing');
      expect(stats).toHaveProperty('status');
      expect(stats.status.isStarted).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete end-to-end message flow', async () => {
      const communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });

      const messageBus = createMessageBus(communicationService, {
        enableLocalRouting: false,
        enableBroadcast: true,
        maxLocalQueueSize: 100,
        localMessageTimeout: 30000,
        enableRetryOnFailure: true,
        retryBackoffMultiplier: 2
      });

      const receivedMessages: any[] = [];
      const mockHandler = jest.fn().mockImplementation((message) => {
        receivedMessages.push(message);
        return Promise.resolve({ processed: true });
      });

      // Setup receiver
      messageBus.subscribe({
        agentName: 'receiver-agent',
        messageTypes: ['integration-test'],
        handler: mockHandler,
        priority: 1
      });

      await messageBus.start('receiver-agent');

      // Send message
      const message = {
        sourceAgent: 'sender-agent',
        targetAgent: 'receiver-agent',
        messageType: 'integration-test',
        payload: { data: 'integration test data' },
        correlationId: 'integration-correlation',
        priority: 'normal' as const
      };

      await messageBus.sendMessage(message);

      // Verify message was sent
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageBody: expect.stringContaining('integration-test')
        })
      );

      await messageBus.stop();
    });

    it('should handle multi-agent communication workflow', async () => {
      const agents = ['coordinator', 'web-search', 'document-processing', 'qa-agent'];
      const messageBuses: MessageBus[] = [];
      const receivedMessages: { [agent: string]: any[] } = {};

      // Setup all agents
      for (const agentName of agents) {
        const communicationService = createCommunicationService({
          region: 'us-east-1',
          eventBusName: 'test-event-bus',
          sqsQueueUrl: `https://sqs.us-east-1.amazonaws.com/123456789012/${agentName}-queue`,
          dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
          maxRetries: 3,
          defaultTimeout: 30000,
          enableMetrics: true,
          enableCostTracking: true
        });

        const messageBus = createMessageBus(communicationService, {
          enableLocalRouting: false,
          enableBroadcast: true,
          maxLocalQueueSize: 100,
          localMessageTimeout: 30000,
          enableRetryOnFailure: true,
          retryBackoffMultiplier: 2
        });

        receivedMessages[agentName] = [];

        messageBus.subscribe({
          agentName,
          messageTypes: ['workflow-message', 'status-update'],
          handler: jest.fn().mockImplementation((message) => {
            receivedMessages[agentName].push(message);
            return Promise.resolve({ processed: true });
          }),
          priority: 1
        });

        await messageBus.start(agentName);
        messageBuses.push(messageBus);
      }

      // Coordinator broadcasts workflow initiation
      await messageBuses[0].broadcastMessage({
        sourceAgent: 'coordinator',
        targets: ['web-search', 'document-processing', 'qa-agent'],
        messageType: 'workflow-message',
        payload: { action: 'start-analysis', workflowId: 'workflow-123' },
        correlationId: 'workflow-correlation',
        priority: 'high' as const
      });

      // Verify broadcast was sent
      expect(mockAWS.sqs.sendMessage).toHaveBeenCalledTimes(3);

      // Cleanup
      for (const messageBus of messageBuses) {
        await messageBus.stop();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle AWS service failures gracefully', async () => {
      mockAWS.sqs.shouldFail('sendMessage', new Error('SQS unavailable'));

      const communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });

      const message = {
        sourceAgent: 'test-sender',
        targetAgent: 'test-receiver',
        messageType: 'test-failure',
        payload: { data: 'test' },
        correlationId: 'failure-correlation',
        priority: 'normal' as const
      };

      const result = await communicationService.sendMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SQS unavailable');
    });

    it('should handle malformed messages', async () => {
      const communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });

      // Add malformed message to queue
      mockAWS.sqs.addMessage('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
        MessageId: 'malformed-123',
        Body: 'invalid-json-content',
        ReceiptHandle: 'receipt-malformed'
      });

      await communicationService.startListening('test-receiver');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle gracefully without crashing
      const stats = await communicationService.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high message throughput', async () => {
      const communicationService = createCommunicationService({
        region: 'us-east-1',
        eventBusName: 'test-event-bus',
        sqsQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
        maxRetries: 3,
        defaultTimeout: 30000,
        enableMetrics: true,
        enableCostTracking: true
      });

      const messages = Array.from({ length: 100 }, (_, i) => ({
        sourceAgent: 'test-sender',
        targetAgent: 'test-receiver',
        messageType: 'performance-test',
        payload: { messageNumber: i },
        correlationId: `perf-correlation-${i}`,
        priority: 'normal' as const
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        messages.map(message => communicationService.sendMessage(message))
      );
      
      const duration = Date.now() - startTime;

      // All messages should be sent successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time (10 seconds for 100 messages)
      expect(duration).toBeLessThan(10000);
    });
  });
});