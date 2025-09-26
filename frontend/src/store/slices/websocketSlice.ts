import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { websocketService, type WebSocketMessage, type WebSocketEventType } from '../../services/websocket/websocketService'

interface RealtimeNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  userId?: string
}

interface DocumentProcessingStatus {
  documentId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  timestamp: string
}

interface AnalysisStatus {
  analysisId: string
  status: 'started' | 'in_progress' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  message?: string
  timestamp: string
}

interface ChatMessage {
  id: string
  userId: string
  username: string
  message: string
  timestamp: string
  type: 'text' | 'system' | 'file' | 'image'
}

interface OnlineUser {
  userId: string
  username: string
  lastSeen: string
  status: 'online' | 'away' | 'offline'
}

export interface WebSocketState {
  isConnected: boolean
  reconnectAttempts: number
  error: string | null
  notifications: RealtimeNotification[]
  documentProcessing: Record<string, DocumentProcessingStatus>
  analysisStatus: Record<string, AnalysisStatus>
  chatMessages: ChatMessage[]
  onlineUsers: OnlineUser[]
  connectionUrl: string
}

const initialState: WebSocketState = {
  isConnected: false,
  reconnectAttempts: 0,
  error: null,
  notifications: [],
  documentProcessing: {},
  analysisStatus: {},
  chatMessages: [],
  onlineUsers: [],
  connectionUrl: ''
}

// Async thunks
export const connectWebSocket = createAsyncThunk(
  'websocket/connect',
  async (authToken: string | undefined, { rejectWithValue }) => {
    try {
      await websocketService.connect(authToken)
      return websocketService.getConnectionState()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to connect to WebSocket')
    }
  }
)

export const disconnectWebSocket = createAsyncThunk(
  'websocket/disconnect',
  async () => {
    websocketService.disconnect()
    return undefined
  }
)

export const sendWebSocketMessage = createAsyncThunk(
  'websocket/sendMessage',
  async ({ type, payload }: { type: WebSocketEventType; payload: any }, { rejectWithValue }) => {
    try {
      websocketService.send(type, payload)
      return { type, payload, timestamp: new Date().toISOString() }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message')
    }
  }
)

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    messageReceived: (state, action: PayloadAction<WebSocketMessage>) => {
      const message = action.payload
      
      switch (message.type) {
        case 'notification':
          const notification: RealtimeNotification = {
            id: Math.random().toString(36).substring(2),
            type: message.payload.type || 'info',
            title: message.payload.title || 'Notification',
            message: message.payload.message || '',
            timestamp: message.timestamp,
            read: false,
            userId: message.userId
          }
          state.notifications.unshift(notification)
          // Keep only last 100 notifications
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100)
          }
          break

        case 'document.processing.started':
        case 'document.processing.progress':
        case 'document.processing.completed':
        case 'document.processing.failed':
          const docStatus: DocumentProcessingStatus = {
            documentId: message.payload.documentId,
            status: message.type.split('.')[2] as 'processing' | 'completed' | 'failed',
            progress: message.payload.progress || 0,
            message: message.payload.message,
            timestamp: message.timestamp
          }
          state.documentProcessing[message.payload.documentId] = docStatus
          break

        case 'analysis.started':
        case 'analysis.progress':
        case 'analysis.completed':
        case 'analysis.failed':
          const analysisStatus: AnalysisStatus = {
            analysisId: message.payload.analysisId,
            status: message.type.split('.')[1] as 'started' | 'in_progress' | 'completed' | 'failed',
            progress: message.payload.progress || 0,
            currentStep: message.payload.currentStep,
            message: message.payload.message,
            timestamp: message.timestamp
          }
          state.analysisStatus[message.payload.analysisId] = analysisStatus
          break

        case 'chat.message':
          const chatMessage: ChatMessage = {
            id: message.payload.id || Math.random().toString(36).substring(2),
            userId: message.payload.userId,
            username: message.payload.username,
            message: message.payload.message,
            timestamp: message.timestamp,
            type: message.payload.type || 'text'
          }
          state.chatMessages.push(chatMessage)
          // Keep only last 1000 messages
          if (state.chatMessages.length > 1000) {
            state.chatMessages = state.chatMessages.slice(-1000)
          }
          break

        case 'user.online':
          const onlineUser: OnlineUser = {
            userId: message.payload.userId,
            username: message.payload.username,
            lastSeen: message.timestamp,
            status: 'online'
          }
          const existingUserIndex = state.onlineUsers.findIndex(u => u.userId === onlineUser.userId)
          if (existingUserIndex >= 0) {
            state.onlineUsers[existingUserIndex] = onlineUser
          } else {
            state.onlineUsers.push(onlineUser)
          }
          break

        case 'user.offline':
          const offlineUserIndex = state.onlineUsers.findIndex(u => u.userId === message.payload.userId)
          if (offlineUserIndex >= 0) {
            state.onlineUsers[offlineUserIndex].status = 'offline'
            state.onlineUsers[offlineUserIndex].lastSeen = message.timestamp
          }
          break

        case 'report.generated':
          // Add report generation notification
          const reportNotification: RealtimeNotification = {
            id: Math.random().toString(36).substring(2),
            type: 'success',
            title: 'Report Generated',
            message: `Report "${message.payload.reportName}" has been generated successfully`,
            timestamp: message.timestamp,
            read: false,
            userId: message.userId
          }
          state.notifications.unshift(reportNotification)
          break
      }
    },

    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },

    markAllNotificationsRead: (state) => {
      state.notifications.forEach(n => n.read = true)
    },

    clearNotifications: (state) => {
      state.notifications = []
    },

    clearDocumentProcessing: (state, action: PayloadAction<string>) => {
      delete state.documentProcessing[action.payload]
    },

    clearAnalysisStatus: (state, action: PayloadAction<string>) => {
      delete state.analysisStatus[action.payload]
    },

    clearChatMessages: (state) => {
      state.chatMessages = []
    },

    connectionStatusChanged: (state, action: PayloadAction<{
      isConnected: boolean
      reconnectAttempts: number
      url: string
    }>) => {
      state.isConnected = action.payload.isConnected
      state.reconnectAttempts = action.payload.reconnectAttempts
      state.connectionUrl = action.payload.url
      if (action.payload.isConnected) {
        state.error = null
      }
    }
  },
  extraReducers: (builder) => {
    // Connect WebSocket
    builder
      .addCase(connectWebSocket.pending, (state) => {
        state.error = null
      })
      .addCase(connectWebSocket.fulfilled, (state, action) => {
        state.isConnected = action.payload.isConnected
        state.reconnectAttempts = action.payload.reconnectAttempts
        state.connectionUrl = action.payload.url
        state.error = null
      })
      .addCase(connectWebSocket.rejected, (state, action) => {
        state.isConnected = false
        state.error = action.payload as string
      })

    // Disconnect WebSocket
    builder
      .addCase(disconnectWebSocket.fulfilled, (state) => {
        state.isConnected = false
        state.reconnectAttempts = 0
        state.error = null
        state.onlineUsers = []
      })

    // Send message
    builder
      .addCase(sendWebSocketMessage.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export const {
  messageReceived,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  clearDocumentProcessing,
  clearAnalysisStatus,
  clearChatMessages,
  connectionStatusChanged
} = websocketSlice.actions

export default websocketSlice.reducer