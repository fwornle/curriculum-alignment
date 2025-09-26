type WebSocketEventType = 
  | 'document.processing.started'
  | 'document.processing.progress'
  | 'document.processing.completed'
  | 'document.processing.failed'
  | 'analysis.started'
  | 'analysis.progress'
  | 'analysis.completed'
  | 'analysis.failed'
  | 'report.generated'
  | 'chat.message'
  | 'notification'
  | 'user.online'
  | 'user.offline'

interface WebSocketMessage {
  type: WebSocketEventType
  payload: any
  timestamp: string
  userId?: string
  sessionId?: string
}

interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  authToken?: string
}

type WebSocketListener = (message: WebSocketMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private listeners = new Map<WebSocketEventType, Set<WebSocketListener>>()
  private globalListeners = new Set<WebSocketListener>()
  private reconnectAttempts = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected = false
  private shouldReconnect = true

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: import.meta.env.VITE_WS_URL || 'wss://localhost:8080',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config
    }
  }

  connect(authToken?: string): Promise<void> {
    if (authToken) {
      this.config.authToken = authToken
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.authToken 
          ? `${this.config.url}?token=${this.config.authToken}`
          : this.config.url

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnected = false
          this.stopHeartbeat()
          
          if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000)

      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    
    this.isConnected = false
  }

  send(type: WebSocketEventType, payload: any): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send message: WebSocket not connected')
      return
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
    }
  }

  subscribe(eventType: WebSocketEventType, listener: WebSocketListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  subscribeToAll(listener: WebSocketListener): () => void {
    this.globalListeners.add(listener)
    
    return () => {
      this.globalListeners.delete(listener)
    }
  }

  getConnectionState(): {
    isConnected: boolean
    reconnectAttempts: number
    url: string
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      url: this.config.url
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      
      // Notify global listeners
      this.globalListeners.forEach(listener => {
        try {
          listener(message)
        } catch (error) {
          console.error('Error in WebSocket global listener:', error)
        }
      })

      // Notify specific event listeners
      const listeners = this.listeners.get(message.type)
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(message)
          } catch (error) {
            console.error(`Error in WebSocket listener for ${message.type}:`, error)
          }
        })
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send('notification', { type: 'heartbeat' })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.config.authToken).catch(error => {
        console.error('Reconnection failed:', error)
        this.scheduleReconnect()
      })
    }, delay)
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
export type { WebSocketMessage, WebSocketEventType, WebSocketListener }