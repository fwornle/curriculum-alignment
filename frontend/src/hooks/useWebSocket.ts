import { useEffect, useCallback, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { 
  connectWebSocket, 
  disconnectWebSocket, 
  sendWebSocketMessage,
  messageReceived,
  connectionStatusChanged,
  markNotificationRead,
  clearNotifications,
  type WebSocketState 
} from '../store/slices/websocketSlice'
import { websocketService, type WebSocketEventType, type WebSocketListener } from '../services/websocket/websocketService'

export function useWebSocket() {
  const dispatch = useAppDispatch()
  const websocketState = useAppSelector(state => state.websocket)
  const authState = useAppSelector(state => state.auth)
  const isInitialized = useRef(false)

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.tokens?.accessToken && !isInitialized.current) {
      isInitialized.current = true
      dispatch(connectWebSocket(authState.tokens.accessToken))
    } else if (!authState.isAuthenticated && websocketState.isConnected) {
      dispatch(disconnectWebSocket())
      isInitialized.current = false
    }
  }, [authState.isAuthenticated, authState.tokens?.accessToken, dispatch, websocketState.isConnected])

  // Set up message listeners
  useEffect(() => {
    const globalListener: WebSocketListener = (message) => {
      dispatch(messageReceived(message))
    }

    const connectionListener = () => {
      const state = websocketService.getConnectionState()
      dispatch(connectionStatusChanged(state))
    }

    // Subscribe to all messages
    const unsubscribeGlobal = websocketService.subscribeToAll(globalListener)
    
    // Monitor connection status changes
    const statusInterval = setInterval(() => {
      const state = websocketService.getConnectionState()
      if (state.isConnected !== websocketState.isConnected || 
          state.reconnectAttempts !== websocketState.reconnectAttempts) {
        dispatch(connectionStatusChanged(state))
      }
    }, 1000)

    return () => {
      unsubscribeGlobal()
      clearInterval(statusInterval)
    }
  }, [dispatch, websocketState.isConnected, websocketState.reconnectAttempts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(disconnectWebSocket())
    }
  }, [dispatch])

  const sendMessage = useCallback((type: WebSocketEventType, payload: any) => {
    dispatch(sendWebSocketMessage({ type, payload }))
  }, [dispatch])

  const subscribe = useCallback((eventType: WebSocketEventType, listener: WebSocketListener) => {
    return websocketService.subscribe(eventType, listener)
  }, [])

  const markAsRead = useCallback((notificationId: string) => {
    dispatch(markNotificationRead(notificationId))
  }, [dispatch])

  const clearAllNotifications = useCallback(() => {
    dispatch(clearNotifications())
  }, [dispatch])

  return {
    // Connection state
    isConnected: websocketState.isConnected,
    reconnectAttempts: websocketState.reconnectAttempts,
    error: websocketState.error,
    connectionUrl: websocketState.connectionUrl,

    // Real-time data
    notifications: websocketState.notifications,
    unreadNotificationsCount: websocketState.notifications.filter(n => !n.read).length,
    documentProcessing: websocketState.documentProcessing,
    analysisStatus: websocketState.analysisStatus,
    chatMessages: websocketState.chatMessages,
    onlineUsers: websocketState.onlineUsers,

    // Actions
    sendMessage,
    subscribe,
    markAsRead,
    clearAllNotifications,
    
    // Manual connection controls (usually not needed due to auto-connect)
    connect: (token?: string) => dispatch(connectWebSocket(token)),
    disconnect: () => dispatch(disconnectWebSocket())
  }
}

export function useRealtimeNotifications() {
  const { notifications, unreadNotificationsCount, markAsRead, clearAllNotifications } = useWebSocket()
  
  return {
    notifications,
    unreadCount: unreadNotificationsCount,
    markAsRead,
    clearAll: clearAllNotifications,
    latestNotification: notifications[0] || null
  }
}

export function useDocumentProcessing(documentId?: string) {
  const { documentProcessing, subscribe } = useWebSocket()
  
  const status = documentId ? documentProcessing[documentId] : null
  
  const subscribeToDocument = useCallback((docId: string, callback: (status: any) => void) => {
    const unsubscribes = [
      subscribe('document.processing.started', (message) => {
        if (message.payload.documentId === docId) callback(message.payload)
      }),
      subscribe('document.processing.progress', (message) => {
        if (message.payload.documentId === docId) callback(message.payload)
      }),
      subscribe('document.processing.completed', (message) => {
        if (message.payload.documentId === docId) callback(message.payload)
      }),
      subscribe('document.processing.failed', (message) => {
        if (message.payload.documentId === docId) callback(message.payload)
      })
    ]
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [subscribe])

  return {
    status,
    allStatuses: documentProcessing,
    subscribeToDocument
  }
}

export function useAnalysisStatus(analysisId?: string) {
  const { analysisStatus, subscribe } = useWebSocket()
  
  const status = analysisId ? analysisStatus[analysisId] : null
  
  const subscribeToAnalysis = useCallback((id: string, callback: (status: any) => void) => {
    const unsubscribes = [
      subscribe('analysis.started', (message) => {
        if (message.payload.analysisId === id) callback(message.payload)
      }),
      subscribe('analysis.progress', (message) => {
        if (message.payload.analysisId === id) callback(message.payload)
      }),
      subscribe('analysis.completed', (message) => {
        if (message.payload.analysisId === id) callback(message.payload)
      }),
      subscribe('analysis.failed', (message) => {
        if (message.payload.analysisId === id) callback(message.payload)
      })
    ]
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [subscribe])

  return {
    status,
    allStatuses: analysisStatus,
    subscribeToAnalysis
  }
}

export function useRealtimeChat() {
  const { chatMessages, onlineUsers, sendMessage } = useWebSocket()
  
  const sendChatMessage = useCallback((message: string, type: 'text' | 'system' | 'file' | 'image' = 'text') => {
    sendMessage('chat.message', { message, type })
  }, [sendMessage])

  return {
    messages: chatMessages,
    onlineUsers,
    sendMessage: sendChatMessage
  }
}