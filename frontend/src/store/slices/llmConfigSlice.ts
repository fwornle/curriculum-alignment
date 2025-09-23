import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface LLMProvider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'azure' | 'custom'
  models: Array<{
    id: string
    name: string
    description: string
    contextWindow: number
    costPer1kTokens: {
      input: number
      output: number
    }
    capabilities: string[]
  }>
  endpoint?: string
  isActive: boolean
  requiresApiKey: boolean
}

export interface LLMConfiguration {
  id: string
  name: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  systemPrompt?: string
  isDefault: boolean
  usageStats: {
    totalRequests: number
    totalTokens: number
    totalCost: number
    lastUsed?: string
  }
}

export interface LLMConfigState {
  providers: LLMProvider[]
  configurations: LLMConfiguration[]
  defaultConfiguration: string | null
  currentConfiguration: LLMConfiguration | null
  isTestingConnection: boolean
  testResults: Record<string, {
    success: boolean
    latency?: number
    error?: string
    timestamp: string
  }>
  costTracking: {
    enabled: boolean
    dailyBudget: number
    monthlyBudget: number
    currentDaySpent: number
    currentMonthSpent: number
    alertThreshold: number
  }
  monitoring: {
    enabled: boolean
    logRequests: boolean
    trackPerformance: boolean
  }
  error: string | null
  isLoading: boolean
}

const initialState: LLMConfigState = {
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Most capable model for complex reasoning',
          contextWindow: 8192,
          costPer1kTokens: { input: 0.03, output: 0.06 },
          capabilities: ['text-generation', 'analysis', 'reasoning']
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and efficient for most tasks',
          contextWindow: 4096,
          costPer1kTokens: { input: 0.002, output: 0.002 },
          capabilities: ['text-generation', 'analysis']
        }
      ],
      isActive: true,
      requiresApiKey: true
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'anthropic',
      models: [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Most powerful model for complex analysis',
          contextWindow: 200000,
          costPer1kTokens: { input: 0.015, output: 0.075 },
          capabilities: ['text-generation', 'analysis', 'reasoning', 'code']
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          description: 'Balanced performance and speed',
          contextWindow: 200000,
          costPer1kTokens: { input: 0.003, output: 0.015 },
          capabilities: ['text-generation', 'analysis', 'reasoning']
        }
      ],
      isActive: true,
      requiresApiKey: true
    }
  ],
  configurations: [
    {
      id: 'default-gpt4',
      name: 'Default GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      topP: 1.0,
      presencePenalty: 0,
      frequencyPenalty: 0,
      systemPrompt: 'You are an expert educational curriculum analyst. Provide detailed, accurate analysis.',
      isDefault: true,
      usageStats: {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0
      }
    }
  ],
  defaultConfiguration: 'default-gpt4',
  currentConfiguration: null,
  isTestingConnection: false,
  testResults: {},
  costTracking: {
    enabled: true,
    dailyBudget: 50,
    monthlyBudget: 1000,
    currentDaySpent: 0,
    currentMonthSpent: 0,
    alertThreshold: 0.8
  },
  monitoring: {
    enabled: true,
    logRequests: true,
    trackPerformance: true
  },
  error: null,
  isLoading: false
}

// Async thunks
export const testLLMConnection = createAsyncThunk(
  'llmConfig/testConnection',
  async (configId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { llmConfig: LLMConfigState }
      const config = state.llmConfig.configurations.find(c => c.id === configId)
      
      if (!config) {
        return rejectWithValue('Configuration not found')
      }
      
      const startTime = Date.now()
      const response = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          testPrompt: 'Hello, please respond with "Test successful"'
        })
      })
      
      const endTime = Date.now()
      
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.message || 'Connection test failed')
      }
      
      return {
        configId,
        success: true,
        latency: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const saveLLMConfiguration = createAsyncThunk(
  'llmConfig/saveConfiguration',
  async (config: Omit<LLMConfiguration, 'id' | 'usageStats'>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/llm/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to save configuration')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const fetchUsageStats = createAsyncThunk(
  'llmConfig/fetchUsageStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/llm/usage-stats')
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch usage stats')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

const llmConfigSlice = createSlice({
  name: 'llmConfig',
  initialState,
  reducers: {
    setCurrentConfiguration: (state, action: PayloadAction<string>) => {
      const config = state.configurations.find(c => c.id === action.payload)
      state.currentConfiguration = config || null
    },
    addConfiguration: (state, action: PayloadAction<LLMConfiguration>) => {
      state.configurations.push(action.payload)
    },
    updateConfiguration: (state, action: PayloadAction<{
      id: string
      updates: Partial<LLMConfiguration>
    }>) => {
      const config = state.configurations.find(c => c.id === action.payload.id)
      if (config) {
        Object.assign(config, action.payload.updates)
      }
    },
    deleteConfiguration: (state, action: PayloadAction<string>) => {
      const index = state.configurations.findIndex(c => c.id === action.payload)
      if (index !== -1) {
        state.configurations.splice(index, 1)
        
        // If this was the default, set a new default
        if (state.defaultConfiguration === action.payload) {
          state.defaultConfiguration = state.configurations[0]?.id || null
        }
      }
    },
    setDefaultConfiguration: (state, action: PayloadAction<string>) => {
      // Unset previous default
      state.configurations.forEach(config => {
        config.isDefault = config.id === action.payload
      })
      state.defaultConfiguration = action.payload
    },
    updateProviderStatus: (state, action: PayloadAction<{
      providerId: string
      isActive: boolean
    }>) => {
      const provider = state.providers.find(p => p.id === action.payload.providerId)
      if (provider) {
        provider.isActive = action.payload.isActive
      }
    },
    updateCostTracking: (state, action: PayloadAction<Partial<LLMConfigState['costTracking']>>) => {
      state.costTracking = { ...state.costTracking, ...action.payload }
    },
    updateMonitoring: (state, action: PayloadAction<Partial<LLMConfigState['monitoring']>>) => {
      state.monitoring = { ...state.monitoring, ...action.payload }
    },
    addUsage: (state, action: PayloadAction<{
      configId: string
      tokens: number
      cost: number
    }>) => {
      const config = state.configurations.find(c => c.id === action.payload.configId)
      if (config) {
        config.usageStats.totalRequests += 1
        config.usageStats.totalTokens += action.payload.tokens
        config.usageStats.totalCost += action.payload.cost
        config.usageStats.lastUsed = new Date().toISOString()
      }
      
      // Update daily/monthly tracking
      state.costTracking.currentDaySpent += action.payload.cost
      state.costTracking.currentMonthSpent += action.payload.cost
    },
    resetDailyUsage: (state) => {
      state.costTracking.currentDaySpent = 0
    },
    resetMonthlyUsage: (state) => {
      state.costTracking.currentMonthSpent = 0
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Test LLM connection
    builder
      .addCase(testLLMConnection.pending, (state) => {
        state.isTestingConnection = true
        state.error = null
      })
      .addCase(testLLMConnection.fulfilled, (state, action) => {
        state.isTestingConnection = false
        state.testResults[action.payload.configId] = {
          success: action.payload.success,
          latency: action.payload.latency,
          timestamp: action.payload.timestamp
        }
      })
      .addCase(testLLMConnection.rejected, (state, action) => {
        state.isTestingConnection = false
        state.error = action.payload as string
      })
    
    // Save configuration
    builder
      .addCase(saveLLMConfiguration.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(saveLLMConfiguration.fulfilled, (state, action) => {
        state.isLoading = false
        const existingIndex = state.configurations.findIndex(c => c.id === action.payload.id)
        if (existingIndex !== -1) {
          state.configurations[existingIndex] = action.payload
        } else {
          state.configurations.push(action.payload)
        }
      })
      .addCase(saveLLMConfiguration.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Fetch usage stats
    builder
      .addCase(fetchUsageStats.fulfilled, (state, action) => {
        state.costTracking.currentDaySpent = action.payload.dailySpent
        state.costTracking.currentMonthSpent = action.payload.monthlySpent
        
        // Update individual configuration stats
        action.payload.configurations?.forEach((configStats: any) => {
          const config = state.configurations.find(c => c.id === configStats.id)
          if (config) {
            config.usageStats = configStats.usageStats
          }
        })
      })
  },
})

export const {
  setCurrentConfiguration,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  setDefaultConfiguration,
  updateProviderStatus,
  updateCostTracking,
  updateMonitoring,
  addUsage,
  resetDailyUsage,
  resetMonthlyUsage,
  clearError,
} = llmConfigSlice.actions

export default llmConfigSlice.reducer