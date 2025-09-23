/**
 * WebSocket Service
 * 
 * Real-time communication service for chat, agent status updates,
 * and live progress notifications using WebSocket connections.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { authenticateWebSocket } from '../middleware/auth.middleware';
import { User, AgentType } from '../database/models';
import { logger } from './logging.service';
import { metrics } from './metrics.service';
import { v4 as uuidv4 } from 'uuid';
import * as EventEmitter from 'events';

/**
 * WebSocket message types
 */
export enum MessageType {
  // Connection management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // Authentication
  AUTH = 'auth',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  
  // Chat messages
  CHAT_MESSAGE = 'chat_message',
  CHAT_HISTORY = 'chat_history',
  TYPING = 'typing',
  
  // Agent status
  AGENT_STATUS = 'agent_status',
  AGENT_PROGRESS = 'agent_progress',
  AGENT_RESULT = 'agent_result',
  AGENT_ERROR = 'agent_error',
  
  // Analysis updates
  ANALYSIS_START = 'analysis_start',
  ANALYSIS_PROGRESS = 'analysis_progress',
  ANALYSIS_COMPLETE = 'analysis_complete',
  
  // Notifications
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  
  // Errors
  ERROR = 'error',
  INVALID_MESSAGE = 'invalid_message',
}

/**
 * WebSocket message structure
 */
export interface WSMessage<T = any> {
  id: string;
  type: MessageType;
  timestamp: Date;
  data: T;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Client connection information
 */
export interface ClientConnection {
  id: string;
  socket: WebSocket;
  user?: User;
  authenticated: boolean;
  sessionId?: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
}

/**
 * Chat message data
 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    name: string;
    type: string;
    url: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Agent status data
 */
export interface AgentStatus {
  agentType: AgentType;
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentOperation?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  startTime?: Date;
  estimatedCompletion?: Date;
  metadata?: Record<string, any>;
}

/**
 * Analysis progress data
 */
export interface AnalysisProgress {
  analysisId: string;
  phase: string;
  progress: number;
  currentAgent?: AgentType;
  completedAgents: AgentType[];
  remainingAgents: AgentType[];
  estimatedTimeRemaining?: number;
  messages: string[];
}

/**
 * Room/Channel management
 */
export interface Room {
  id: string;
  name: string;
  type: 'chat' | 'analysis' | 'broadcast';
  clients: Set<string>;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * WebSocket Service Configuration
 */
export interface WSConfig {
  port?: number;
  path?: string;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConnections: number;
  maxMessageSize: number;
  enableCompression: boolean;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
}

/**
 * WebSocket Service
 */
export class WebSocketService extends EventEmitter {
  private wss?: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private rooms: Map<string, Room> = new Map();
  private config: WSConfig;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config?: Partial<WSConfig>) {
    super();
    
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 1 minute
      maxConnections: 1000,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      enableCompression: true,
      ...config,
    };
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer, path: string = '/ws'): void {
    this.wss = new WebSocketServer({
      server,
      path,
      maxPayload: this.config.maxMessageSize,
      perMessageDeflate: this.config.enableCompression,
      verifyClient: (info, cb) => {
        // Basic origin verification
        if (this.config.cors?.origin) {
          const origin = info.origin;
          const allowed = Array.isArray(this.config.cors.origin)
            ? this.config.cors.origin.includes(origin)
            : this.config.cors.origin === origin || this.config.cors.origin === '*';
          
          if (!allowed) {
            cb(false, 403, 'Forbidden');
            return;
          }
        }
        cb(true);
      },
    });

    this.wss.on('connection', (socket, req) => {
      this.handleConnection(socket, req);
    });

    // Start heartbeat monitoring
    this.startHeartbeat();

    logger.info('WebSocket server initialized', {
      path,
      maxConnections: this.config.maxConnections,
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, req: any): void {
    const clientId = uuidv4();
    
    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      this.sendError(socket, 'Server at maximum capacity');
      socket.close(1008, 'Maximum connections reached');
      return;
    }

    // Create client connection
    const client: ClientConnection = {
      id: clientId,
      socket,
      authenticated: false,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set(),
      metadata: {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    };

    this.clients.set(clientId, client);

    // Set up event handlers
    socket.on('message', (data) => this.handleMessage(clientId, data));
    socket.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    socket.on('error', (error) => this.handleError(clientId, error));
    socket.on('pong', () => this.handlePong(clientId));

    // Send connection success message
    this.sendMessage(client, {
      id: uuidv4(),
      type: MessageType.CONNECT,
      timestamp: new Date(),
      data: {
        clientId,
        message: 'Connected to WebSocket server',
        requiresAuth: true,
      },
    });

    // Increment connection metrics
    metrics.gauge('websocket.connections', this.clients.size, 'Count');

    logger.info('WebSocket client connected', {
      clientId,
      ip: client.metadata.ip,
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      // Validate message structure
      if (!message.type || !message.data) {
        this.sendError(client.socket, 'Invalid message format');
        return;
      }

      // Handle authentication first
      if (message.type === MessageType.AUTH) {
        await this.handleAuthentication(client, message.data);
        return;
      }

      // Check authentication for other messages
      if (!client.authenticated) {
        this.sendError(client.socket, 'Authentication required');
        return;
      }

      // Route message based on type
      switch (message.type) {
        case MessageType.PING:
          this.handlePing(client);
          break;
          
        case MessageType.CHAT_MESSAGE:
          await this.handleChatMessage(client, message);
          break;
          
        case MessageType.TYPING:
          this.handleTyping(client, message);
          break;
          
        case MessageType.AGENT_STATUS:
          this.broadcastAgentStatus(message.data);
          break;
          
        default:
          this.sendError(client.socket, `Unknown message type: ${message.type}`);
      }

      // Emit event for external handlers
      this.emit('message', { client, message });

    } catch (error) {
      logger.error('Failed to handle WebSocket message', error as Error, { clientId });
      this.sendError(client.socket, 'Failed to process message');
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(client: ClientConnection, data: { token: string }): Promise<void> {
    try {
      const result = await authenticateWebSocket(data.token);
      
      if (result.success && result.user) {
        client.authenticated = true;
        client.user = result.user;
        client.sessionId = uuidv4();

        this.sendMessage(client, {
          id: uuidv4(),
          type: MessageType.AUTH_SUCCESS,
          timestamp: new Date(),
          data: {
            sessionId: client.sessionId,
            user: {
              userId: result.user.user_id,
              email: result.user.email,
              role: result.user.role,
            },
          },
        });

        logger.info('WebSocket client authenticated', {
          clientId: client.id,
          userId: result.user.user_id,
        });

      } else {
        this.sendMessage(client, {
          id: uuidv4(),
          type: MessageType.AUTH_ERROR,
          timestamp: new Date(),
          data: {
            error: result.error || 'Authentication failed',
          },
        });

        // Close connection after auth failure
        setTimeout(() => {
          client.socket.close(1008, 'Authentication failed');
        }, 1000);
      }

    } catch (error) {
      logger.error('WebSocket authentication error', error as Error);
      this.sendError(client.socket, 'Authentication error');
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(client: ClientConnection, message: WSMessage<ChatMessage>): Promise<void> {
    const chatMessage = message.data;
    
    // Add user information
    if (client.user) {
      chatMessage.userId = client.user.user_id;
    }

    // Store message (would typically go to database)
    // await storeChatMessage(chatMessage);

    // Broadcast to room if in one
    const room = this.getRoomForClient(client.id);
    if (room) {
      this.broadcastToRoom(room.id, message, client.id);
    }

    // Emit event for processing
    this.emit('chatMessage', { client, message: chatMessage });

    logger.debug('Chat message received', {
      clientId: client.id,
      sessionId: chatMessage.sessionId,
      messageId: chatMessage.messageId,
    });
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(client: ClientConnection, message: WSMessage): void {
    const room = this.getRoomForClient(client.id);
    if (room) {
      this.broadcastToRoom(room.id, message, client.id);
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(client: ClientConnection): void {
    this.sendMessage(client, {
      id: uuidv4(),
      type: MessageType.PONG,
      timestamp: new Date(),
      data: {},
    });
  }

  /**
   * Handle pong response
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    this.rooms.forEach((room) => {
      room.clients.delete(clientId);
    });

    // Remove client
    this.clients.delete(clientId);

    // Update metrics
    metrics.gauge('websocket.connections', this.clients.size, 'Count');

    logger.info('WebSocket client disconnected', {
      clientId,
      code,
      reason: reason.toString(),
    });

    // Emit disconnection event
    this.emit('disconnect', { clientId, client });
  }

  /**
   * Handle WebSocket error
   */
  private handleError(clientId: string, error: Error): void {
    logger.error('WebSocket error', error, { clientId });
    
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.close(1011, 'Internal error');
    }
  }

  /**
   * Send message to client
   */
  sendMessage(client: ClientConnection, message: WSMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(socket: WebSocket, error: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        id: uuidv4(),
        type: MessageType.ERROR,
        timestamp: new Date(),
        data: { error },
      }));
    }
  }

  /**
   * Broadcast message to all authenticated clients
   */
  broadcast(message: WSMessage, excludeClientId?: string): void {
    this.clients.forEach((client) => {
      if (client.authenticated && client.id !== excludeClientId) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(roomId: string, message: WSMessage, excludeClientId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.clients.forEach((clientId) => {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client && client.authenticated) {
          this.sendMessage(client, message);
        }
      }
    });
  }

  /**
   * Send agent status update
   */
  broadcastAgentStatus(status: AgentStatus): void {
    const message: WSMessage<AgentStatus> = {
      id: uuidv4(),
      type: MessageType.AGENT_STATUS,
      timestamp: new Date(),
      data: status,
    };

    this.broadcast(message);
  }

  /**
   * Send analysis progress update
   */
  broadcastAnalysisProgress(progress: AnalysisProgress): void {
    const message: WSMessage<AnalysisProgress> = {
      id: uuidv4(),
      type: MessageType.ANALYSIS_PROGRESS,
      timestamp: new Date(),
      data: progress,
    };

    this.broadcast(message);
  }

  /**
   * Create or join room
   */
  joinRoom(clientId: string, roomId: string, roomName?: string): boolean {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      return false;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomName || roomId,
        type: 'chat',
        clients: new Set(),
        createdAt: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    room.clients.add(clientId);
    client.subscriptions.add(roomId);

    logger.debug('Client joined room', { clientId, roomId });
    return true;
  }

  /**
   * Leave room
   */
  leaveRoom(clientId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(clientId);
      
      // Delete room if empty
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(roomId);
    }

    logger.debug('Client left room', { clientId, roomId });
    return true;
  }

  /**
   * Get room for client
   */
  private getRoomForClient(clientId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.clients.has(clientId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout;

      this.clients.forEach((client, clientId) => {
        const inactivityTime = now - client.lastActivity.getTime();
        
        if (inactivityTime > timeout) {
          // Connection timeout
          logger.warn('WebSocket client timed out', { clientId, inactivityTime });
          client.socket.terminate();
          this.clients.delete(clientId);
        } else if (inactivityTime > this.config.heartbeatInterval) {
          // Send ping
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.ping();
          }
        }
      });

      // Update metrics
      metrics.gauge('websocket.connections', this.clients.size, 'Count');
      metrics.gauge('websocket.rooms', this.rooms.size, 'Count');

    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated).length;
    
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedClients,
      unauthenticatedConnections: this.clients.size - authenticatedClients,
      rooms: this.rooms.size,
      clientDetails: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        authenticated: client.authenticated,
        userId: client.user?.user_id,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
        subscriptions: Array.from(client.subscriptions),
      })),
      roomDetails: Array.from(this.rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        clientCount: room.clients.size,
        createdAt: room.createdAt,
      })),
    };
  }

  /**
   * Close all connections and shutdown
   */
  shutdown(): void {
    logger.info('Shutting down WebSocket service');
    
    // Stop heartbeat
    this.stopHeartbeat();

    // Close all client connections
    this.clients.forEach((client) => {
      client.socket.close(1001, 'Server shutting down');
    });

    // Clear data
    this.clients.clear();
    this.rooms.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Remove all event listeners
    this.removeAllListeners();
  }
}

/**
 * Global WebSocket service instance
 */
export const wsService = new WebSocketService();

/**
 * Convenience functions
 */
export const websocket = {
  initialize: (server: HTTPServer, path?: string) => wsService.initialize(server, path),
  broadcast: (message: WSMessage, excludeClientId?: string) => wsService.broadcast(message, excludeClientId),
  broadcastToRoom: (roomId: string, message: WSMessage, excludeClientId?: string) => 
    wsService.broadcastToRoom(roomId, message, excludeClientId),
  broadcastAgentStatus: (status: AgentStatus) => wsService.broadcastAgentStatus(status),
  broadcastAnalysisProgress: (progress: AnalysisProgress) => wsService.broadcastAnalysisProgress(progress),
  joinRoom: (clientId: string, roomId: string, roomName?: string) => wsService.joinRoom(clientId, roomId, roomName),
  leaveRoom: (clientId: string, roomId: string) => wsService.leaveRoom(clientId, roomId),
  getStats: () => wsService.getStats(),
  shutdown: () => wsService.shutdown(),
  on: (event: string, listener: (...args: any[]) => void) => wsService.on(event, listener),
  off: (event: string, listener: (...args: any[]) => void) => wsService.off(event, listener),
};

export default wsService;