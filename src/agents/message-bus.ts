import { EventEmitter } from 'events';
import { AgentMessage, AgentCommunicationService } from './communication';
import { logger } from '../services/logging.service';
import { costTracker } from '../services/cost-tracking.service';

export interface MessageBusConfig {
  enableLocalRouting: boolean;
  enableBroadcast: boolean;
  maxLocalQueueSize: number;
  localMessageTimeout: number;
  enableRetryOnFailure: boolean;
  retryBackoffMultiplier: number;
}

export interface MessageRoute {
  source: string;
  target: string;
  messageType: string;
  routingKey: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BroadcastMessage extends Omit<AgentMessage, 'targetAgent'> {
  targets: string[];
  excludeTargets?: string[];
}

export interface MessageSubscription {
  agentName: string;
  messageTypes: string[];
  handler: (message: AgentMessage) => Promise<any>;
  priority: number;
}

export class MessageBus extends EventEmitter {
  private communicationService: AgentCommunicationService;
  private config: MessageBusConfig;
  private localQueues: Map<string, AgentMessage[]>;
  private subscriptions: Map<string, MessageSubscription[]>;
  private routingTable: Map<string, MessageRoute>;
  private isStarted: boolean = false;

  constructor(communicationService: AgentCommunicationService, config: MessageBusConfig) {
    super();
    this.communicationService = communicationService;
    this.config = config;
    this.localQueues = new Map();
    this.subscriptions = new Map();
    this.routingTable = new Map();
  }

  /**
   * Start the message bus
   */
  async start(agentName: string): Promise<void> {
    if (this.isStarted) {
      logger.warn('Message bus already started');
      return;
    }

    this.isStarted = true;
    
    logger.info('Starting message bus', { agentName });

    // Register standard message handlers
    this.registerStandardHandlers();

    // Start local message processing
    if (this.config.enableLocalRouting) {
      this.startLocalMessageProcessing();
    }

    // Start communication service
    await this.communicationService.startListening(agentName);

    this.emit('started', { agentName });
    logger.info('Message bus started', { agentName });
  }

  /**
   * Stop the message bus
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;
    this.communicationService.stopListening();
    
    // Clear local queues
    this.localQueues.clear();
    
    this.emit('stopped');
    logger.info('Message bus stopped');
  }

  /**
   * Send a message to a specific agent
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const requestId = `bus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check for local routing first
      if (this.config.enableLocalRouting && this.isLocalAgent(message.targetAgent)) {
        await this.routeLocalMessage(message);
        return;
      }

      // Check routing table for custom routes
      const routeKey = `${message.sourceAgent}->${message.targetAgent}:${message.messageType}`;
      const route = this.routingTable.get(routeKey);

      if (route) {
        // Use custom routing
        const routedMessage = {
          ...message,
          routingKey: route.routingKey,
          priority: route.priority
        };
        
        await this.communicationService.sendMessage(routedMessage);
      } else {
        // Use standard routing
        await this.communicationService.sendMessage(message);
      }

      this.emit('message-sent', { message, requestId });

      logger.debug('Message sent via bus', {
        requestId,
        sourceAgent: message.sourceAgent,
        targetAgent: message.targetAgent,
        messageType: message.messageType
      });

    } catch (error) {
      logger.error('Failed to send message via bus', {
        requestId,
        error: error.message,
        sourceAgent: message.sourceAgent,
        targetAgent: message.targetAgent
      });

      this.emit('message-failed', { message, error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Broadcast a message to multiple agents
   */
  async broadcastMessage(message: BroadcastMessage): Promise<void> {
    if (!this.config.enableBroadcast) {
      throw new Error('Broadcast messaging is disabled');
    }

    const requestId = `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('Broadcasting message', {
        requestId,
        sourceAgent: message.sourceAgent,
        targets: message.targets,
        messageType: message.messageType
      });

      const targetAgents = message.excludeTargets 
        ? message.targets.filter(target => !message.excludeTargets!.includes(target))
        : message.targets;

      // Send to each target
      const sendPromises = targetAgents.map(targetAgent => {
        const individualMessage: Omit<AgentMessage, 'id' | 'timestamp' | 'retryCount'> = {
          sourceAgent: message.sourceAgent,
          targetAgent,
          messageType: message.messageType,
          payload: message.payload,
          correlationId: message.correlationId,
          priority: message.priority,
          expiresAt: message.expiresAt,
          routingKey: message.routingKey
        };

        return this.sendMessage(individualMessage);
      });

      await Promise.allSettled(sendPromises);

      this.emit('broadcast-sent', { message, requestId, targetCount: targetAgents.length });

      // Track broadcast costs
      if (process.env.ENABLE_COST_TRACKING === 'true') {
        await costTracker.trackCommunicationCost({
          messageType: 'broadcast',
          payloadSize: JSON.stringify(message.payload).length,
          targetCount: targetAgents.length,
          deliveryMethod: 'message-bus'
        }, requestId);
      }

    } catch (error) {
      logger.error('Failed to broadcast message', {
        requestId,
        error: error.message,
        sourceAgent: message.sourceAgent,
        targetCount: message.targets.length
      });

      this.emit('broadcast-failed', { message, error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(subscription: MessageSubscription): void {
    const agentKey = subscription.agentName;
    
    if (!this.subscriptions.has(agentKey)) {
      this.subscriptions.set(agentKey, []);
    }

    this.subscriptions.get(agentKey)!.push(subscription);

    // Register handlers with communication service
    subscription.messageTypes.forEach(messageType => {
      this.communicationService.registerHandler(messageType, subscription.handler);
    });

    logger.info('Message subscription added', {
      agentName: subscription.agentName,
      messageTypes: subscription.messageTypes,
      priority: subscription.priority
    });

    this.emit('subscription-added', subscription);
  }

  /**
   * Unsubscribe from message types
   */
  unsubscribe(agentName: string, messageTypes?: string[]): void {
    const agentSubscriptions = this.subscriptions.get(agentName);
    
    if (!agentSubscriptions) {
      return;
    }

    if (messageTypes) {
      // Remove specific message types
      const updatedSubscriptions = agentSubscriptions.filter(sub => 
        !sub.messageTypes.some(type => messageTypes.includes(type))
      );
      this.subscriptions.set(agentName, updatedSubscriptions);
    } else {
      // Remove all subscriptions for agent
      this.subscriptions.delete(agentName);
    }

    logger.info('Message subscription removed', {
      agentName,
      messageTypes: messageTypes || 'all'
    });

    this.emit('subscription-removed', { agentName, messageTypes });
  }

  /**
   * Add custom routing rule
   */
  addRoute(route: MessageRoute): void {
    const routeKey = `${route.source}->${route.target}:${route.messageType}`;
    this.routingTable.set(routeKey, route);

    logger.info('Message route added', {
      routeKey,
      route
    });

    this.emit('route-added', route);
  }

  /**
   * Remove routing rule
   */
  removeRoute(source: string, target: string, messageType: string): void {
    const routeKey = `${source}->${target}:${messageType}`;
    this.routingTable.delete(routeKey);

    logger.info('Message route removed', { routeKey });
    this.emit('route-removed', { source, target, messageType });
  }

  /**
   * Get all active routes
   */
  getRoutes(): MessageRoute[] {
    return Array.from(this.routingTable.values());
  }

  /**
   * Check if agent is local (same process/container)
   */
  private isLocalAgent(agentName: string): boolean {
    // Implementation depends on your deployment architecture
    // For now, assume all agents are remote
    return false;
  }

  /**
   * Route message locally
   */
  private async routeLocalMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    // Add to local queue
    if (!this.localQueues.has(message.targetAgent)) {
      this.localQueues.set(message.targetAgent, []);
    }

    const queue = this.localQueues.get(message.targetAgent)!;
    
    if (queue.length >= this.config.maxLocalQueueSize) {
      // Remove oldest message if queue is full
      queue.shift();
      logger.warn('Local queue full, removing oldest message', {
        targetAgent: message.targetAgent,
        queueSize: queue.length
      });
    }

    queue.push(fullMessage);

    logger.debug('Message added to local queue', {
      messageId: fullMessage.id,
      targetAgent: message.targetAgent,
      queueSize: queue.length
    });
  }

  /**
   * Start local message processing
   */
  private startLocalMessageProcessing(): void {
    setInterval(() => {
      if (!this.isStarted) {
        return;
      }

      this.processLocalQueues();
    }, 1000); // Process every second
  }

  /**
   * Process local message queues
   */
  private async processLocalQueues(): Promise<void> {
    for (const [agentName, queue] of this.localQueues.entries()) {
      if (queue.length === 0) {
        continue;
      }

      const message = queue.shift()!;
      
      try {
        // Find subscriptions for this agent and message type
        const agentSubscriptions = this.subscriptions.get(agentName) || [];
        const relevantSubscriptions = agentSubscriptions.filter(sub =>
          sub.messageTypes.includes(message.messageType)
        );

        if (relevantSubscriptions.length === 0) {
          logger.warn('No local subscriptions for message', {
            messageId: message.id,
            agentName,
            messageType: message.messageType
          });
          continue;
        }

        // Execute handlers by priority
        const sortedSubscriptions = relevantSubscriptions.sort((a, b) => b.priority - a.priority);
        
        for (const subscription of sortedSubscriptions) {
          try {
            await subscription.handler(message);
          } catch (error) {
            logger.error('Local message handler failed', {
              messageId: message.id,
              agentName,
              error: error.message
            });

            if (this.config.enableRetryOnFailure && message.retryCount < 3) {
              // Retry with backoff
              const delay = Math.pow(this.config.retryBackoffMultiplier, message.retryCount) * 1000;
              setTimeout(() => {
                const retryMessage = { ...message, retryCount: message.retryCount + 1 };
                queue.unshift(retryMessage);
              }, delay);
            }
          }
        }

        this.emit('local-message-processed', { message, agentName });

      } catch (error) {
        logger.error('Failed to process local message', {
          messageId: message.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Register standard message handlers
   */
  private registerStandardHandlers(): void {
    // Health check handler
    this.communicationService.registerHandler('health-check', async (message: AgentMessage) => {
      logger.debug('Received health check', {
        messageId: message.id,
        sourceAgent: message.sourceAgent
      });

      // Respond with health status
      await this.sendMessage({
        sourceAgent: message.targetAgent,
        targetAgent: message.sourceAgent,
        messageType: 'health-check-response',
        payload: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          correlationId: message.correlationId
        },
        correlationId: message.correlationId,
        priority: 'normal'
      });
    });

    // Echo handler for testing
    this.communicationService.registerHandler('echo', async (message: AgentMessage) => {
      logger.debug('Received echo request', {
        messageId: message.id,
        sourceAgent: message.sourceAgent
      });

      await this.sendMessage({
        sourceAgent: message.targetAgent,
        targetAgent: message.sourceAgent,
        messageType: 'echo-response',
        payload: {
          originalMessage: message.payload,
          timestamp: new Date().toISOString()
        },
        correlationId: message.correlationId,
        priority: message.priority
      });
    });

    // Ping handler
    this.communicationService.registerHandler('ping', async (message: AgentMessage) => {
      await this.sendMessage({
        sourceAgent: message.targetAgent,
        targetAgent: message.sourceAgent,
        messageType: 'pong',
        payload: {
          timestamp: new Date().toISOString(),
          originalTimestamp: message.payload.timestamp
        },
        correlationId: message.correlationId,
        priority: 'normal'
      });
    });
  }

  /**
   * Get message bus statistics
   */
  async getStatistics(): Promise<any> {
    const commStats = await this.communicationService.getStatistics();

    const localQueueSizes = new Map();
    for (const [agentName, queue] of this.localQueues.entries()) {
      localQueueSizes.set(agentName, queue.length);
    }

    return {
      communication: commStats,
      localQueues: Object.fromEntries(localQueueSizes),
      subscriptions: {
        agentCount: this.subscriptions.size,
        totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0)
      },
      routing: {
        customRoutes: this.routingTable.size,
        routes: this.getRoutes()
      },
      status: {
        isStarted: this.isStarted,
        config: this.config
      }
    };
  }
}

// Factory function
export function createMessageBus(
  communicationService: AgentCommunicationService, 
  config: MessageBusConfig
): MessageBus {
  return new MessageBus(communicationService, config);
}

// Default configuration
export const defaultMessageBusConfig: MessageBusConfig = {
  enableLocalRouting: process.env.ENABLE_LOCAL_ROUTING === 'true',
  enableBroadcast: process.env.ENABLE_BROADCAST === 'true',
  maxLocalQueueSize: parseInt(process.env.MAX_LOCAL_QUEUE_SIZE || '100'),
  localMessageTimeout: parseInt(process.env.LOCAL_MESSAGE_TIMEOUT || '30000'),
  enableRetryOnFailure: process.env.ENABLE_LOCAL_RETRY === 'true',
  retryBackoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2')
};