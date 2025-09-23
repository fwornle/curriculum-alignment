import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: string
  metadata?: {
    analysisId?: string
    workflowId?: string
    attachments?: Array<{
      type: 'chart' | 'report' | 'data'
      url: string
      name: string
    }>
    actions?: Array<{
      type: 'start-analysis' | 'view-report' | 'download-data'
      label: string
      parameters?: Record<string, any>
    }>
  }
  isLoading?: boolean
  error?: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  lastActivity: string
  messageCount: number
  context: {
    currentTopic?: string
    activeAnalyses?: string[]
    referencedPrograms?: string[]
  }
  isActive: boolean
}

export interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  messages: Record<string, Message[]> // sessionId -> messages
  isTyping: boolean
  isConnected: boolean
  connectionError: string | null
  suggestedQueries: string[]
  quickActions: Array<{
    id: string
    label: string
    description: string
    icon: string
    action: string
    category: 'analysis' | 'curriculum' | 'reports'
  }>
  conversationMode: 'guided' | 'free-form'
  voiceEnabled: boolean
  isListening: boolean
  speechToTextEnabled: boolean
  preferences: {
    autoScroll: boolean
    soundEnabled: boolean
    showTimestamps: boolean
    compactMode: boolean
  }
}

const initialState: ChatState = {
  sessions: [],
  currentSession: null,
  messages: {},
  isTyping: false,
  isConnected: true,
  connectionError: null,
  suggestedQueries: [
    "Compare MIT's Computer Science program with Stanford's",
    "Analyze CEU's CS program against ABET standards",
    "What courses are missing for EUR-ACE compliance?",
    "Show me programs similar to Computer Science at CEU",
    "Generate a curriculum alignment report"
  ],
  quickActions: [
    {
      id: 'compare-programs',
      label: 'Compare Programs',
      description: 'Compare two curriculum programs',
      icon: 'compare',
      action: 'start-comparison',
      category: 'analysis'
    },
    {
      id: 'check-accreditation',
      label: 'Check Accreditation',
      description: 'Analyze program against standards',
      icon: 'shield-check',
      action: 'start-accreditation-check',
      category: 'analysis'
    },
    {
      id: 'upload-curriculum',
      label: 'Upload Curriculum',
      description: 'Add a new curriculum document',
      icon: 'upload',
      action: 'open-upload-modal',
      category: 'curriculum'
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      description: 'Create analysis report',
      icon: 'file-text',
      action: 'start-report-generation',
      category: 'reports'
    }
  ],
  conversationMode: 'guided',
  voiceEnabled: false,
  isListening: false,
  speechToTextEnabled: false,
  preferences: {
    autoScroll: true,
    soundEnabled: true,
    showTimestamps: false,
    compactMode: false
  }
}

// Async thunks
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (params: {
    sessionId: string
    content: string
    context?: Record<string, any>
  }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: params.sessionId,
          message: {
            content: params.content,
            context: params.context
          }
        })
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to send message')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const createChatSession = createAsyncThunk(
  'chat/createSession',
  async (title: string | undefined, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to create session')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const loadChatHistory = createAsyncThunk(
  'chat/loadHistory',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      
      if (!response.ok) {
        return rejectWithValue('Failed to load chat history')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const processSpeechToText = createAsyncThunk(
  'chat/processSpeechToText',
  async (audioBlob: Blob, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'speech.wav')
      
      const response = await fetch('/api/chat/speech-to-text', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to process speech')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Speech processing failed')
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<ChatSession | null>) => {
      if (state.currentSession) {
        state.currentSession.isActive = false
      }
      state.currentSession = action.payload
      if (action.payload) {
        action.payload.isActive = true
        action.payload.lastActivity = new Date().toISOString()
      }
    },
    addMessage: (state, action: PayloadAction<{
      sessionId: string
      message: Omit<Message, 'id' | 'timestamp'>
    }>) => {
      const { sessionId, message } = action.payload
      const newMessage: Message = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      }
      
      if (!state.messages[sessionId]) {
        state.messages[sessionId] = []
      }
      
      state.messages[sessionId].push(newMessage)
      
      // Update session
      const session = state.sessions.find(s => s.id === sessionId)
      if (session) {
        session.messageCount = state.messages[sessionId].length
        session.lastActivity = newMessage.timestamp
      }
    },
    updateMessage: (state, action: PayloadAction<{
      sessionId: string
      messageId: string
      updates: Partial<Message>
    }>) => {
      const { sessionId, messageId, updates } = action.payload
      const messages = state.messages[sessionId]
      if (messages) {
        const message = messages.find(m => m.id === messageId)
        if (message) {
          Object.assign(message, updates)
        }
      }
    },
    deleteMessage: (state, action: PayloadAction<{
      sessionId: string
      messageId: string
    }>) => {
      const { sessionId, messageId } = action.payload
      const messages = state.messages[sessionId]
      if (messages) {
        const index = messages.findIndex(m => m.id === messageId)
        if (index !== -1) {
          messages.splice(index, 1)
        }
      }
    },
    clearSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload
      state.messages[sessionId] = []
      
      const session = state.sessions.find(s => s.id === sessionId)
      if (session) {
        session.messageCount = 0
        session.lastActivity = new Date().toISOString()
      }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload
      const sessionIndex = state.sessions.findIndex(s => s.id === sessionId)
      
      if (sessionIndex !== -1) {
        state.sessions.splice(sessionIndex, 1)
        delete state.messages[sessionId]
        
        if (state.currentSession?.id === sessionId) {
          state.currentSession = state.sessions[0] || null
        }
      }
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload
    },
    setConnectionStatus: (state, action: PayloadAction<{
      isConnected: boolean
      error?: string
    }>) => {
      state.isConnected = action.payload.isConnected
      state.connectionError = action.payload.error || null
    },
    updateSuggestedQueries: (state, action: PayloadAction<string[]>) => {
      state.suggestedQueries = action.payload
    },
    setConversationMode: (state, action: PayloadAction<ChatState['conversationMode']>) => {
      state.conversationMode = action.payload
    },
    setVoiceEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceEnabled = action.payload
    },
    setListening: (state, action: PayloadAction<boolean>) => {
      state.isListening = action.payload
    },
    setSpeechToTextEnabled: (state, action: PayloadAction<boolean>) => {
      state.speechToTextEnabled = action.payload
    },
    updateChatPreferences: (state, action: PayloadAction<Partial<ChatState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload }
    },
    updateSessionContext: (state, action: PayloadAction<{
      sessionId: string
      context: Partial<ChatSession['context']>
    }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId)
      if (session) {
        session.context = { ...session.context, ...action.payload.context }
      }
    },
  },
  extraReducers: (builder) => {
    // Send message
    builder
      .addCase(sendMessage.pending, (state, action) => {
        const { sessionId, content } = action.meta.arg
        
        // Add user message immediately
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          content,
          role: 'user',
          timestamp: new Date().toISOString()
        }
        
        if (!state.messages[sessionId]) {
          state.messages[sessionId] = []
        }
        state.messages[sessionId].push(userMessage)
        
        // Add loading assistant message
        const loadingMessage: Message = {
          id: `loading-${Date.now()}`,
          content: '',
          role: 'assistant',
          timestamp: new Date().toISOString(),
          isLoading: true
        }
        state.messages[sessionId].push(loadingMessage)
        state.isTyping = true
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { sessionId } = action.meta.arg
        const messages = state.messages[sessionId]
        
        if (messages) {
          // Remove loading message
          const loadingIndex = messages.findIndex(m => m.isLoading)
          if (loadingIndex !== -1) {
            messages.splice(loadingIndex, 1)
          }
          
          // Add actual response
          messages.push({
            ...action.payload.message,
            id: action.payload.messageId,
            timestamp: new Date().toISOString()
          })
        }
        
        state.isTyping = false
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const { sessionId } = action.meta.arg
        const messages = state.messages[sessionId]
        
        if (messages) {
          // Remove loading message
          const loadingIndex = messages.findIndex(m => m.isLoading)
          if (loadingIndex !== -1) {
            messages.splice(loadingIndex, 1)
          }
          
          // Add error message
          messages.push({
            id: `error-${Date.now()}`,
            content: 'Sorry, I encountered an error processing your message.',
            role: 'assistant',
            timestamp: new Date().toISOString(),
            error: action.payload as string
          })
        }
        
        state.isTyping = false
      })
    
    // Create session
    builder
      .addCase(createChatSession.fulfilled, (state, action) => {
        const newSession = {
          ...action.payload,
          isActive: false
        }
        state.sessions.unshift(newSession)
        state.messages[newSession.id] = []
      })
    
    // Load history
    builder
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        const { sessionId, messages } = action.payload
        state.messages[sessionId] = messages
      })
    
    // Speech to text
    builder
      .addCase(processSpeechToText.pending, (state) => {
        state.isListening = false
      })
      .addCase(processSpeechToText.fulfilled, () => {
        // The transcribed text will be handled by the component
        // that initiated the speech-to-text process
      })
  },
})

export const {
  setCurrentSession,
  addMessage,
  updateMessage,
  deleteMessage,
  clearSession,
  deleteSession,
  setTyping,
  setConnectionStatus,
  updateSuggestedQueries,
  setConversationMode,
  setVoiceEnabled,
  setListening,
  setSpeechToTextEnabled,
  updateChatPreferences,
  updateSessionContext,
} = chatSlice.actions

export default chatSlice.reducer