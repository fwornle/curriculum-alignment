import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import {
  testLLMConnection,
  saveLLMConfiguration,
  fetchUsageStats,
  setCurrentConfiguration,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  setDefaultConfiguration,
  updateProviderStatus,
  updateCostTracking,
  updateMonitoring,
  addUsage,
  clearError,
  type LLMConfiguration,
  type LLMConfigState
} from '../store/slices/llmConfigSlice'
import { llmService, type LLMRequest, type LLMResponse } from '../services/llm/llmService'

export function useLLM() {
  const dispatch = useAppDispatch()
  const llmState = useAppSelector(state => state.llmConfig)
  
  // Get current configuration or default
  const currentConfig = llmState.currentConfiguration || 
    llmState.configurations.find(c => c.id === llmState.defaultConfiguration) ||
    llmState.configurations[0]

  // Generate completion using current or specified configuration
  const generateCompletion = useCallback(async (
    messages: LLMRequest['messages'],
    configId?: string
  ): Promise<LLMResponse> => {
    const config = configId 
      ? llmState.configurations.find(c => c.id === configId)
      : currentConfig

    if (!config) {
      throw new Error('No LLM configuration available')
    }

    const request: LLMRequest = {
      configurationId: config.id,
      messages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty
    }

    const response = await llmService.generateCompletion(request)
    
    // Track usage
    dispatch(addUsage({
      configId: config.id,
      tokens: response.usage.totalTokens,
      cost: response.cost
    }))

    return response
  }, [dispatch, llmState.configurations, currentConfig])

  // Stream completion with real-time updates
  const streamCompletion = useCallback(async (
    messages: LLMRequest['messages'],
    onChunk: (chunk: string) => void,
    configId?: string
  ): Promise<LLMResponse> => {
    const config = configId 
      ? llmState.configurations.find(c => c.id === configId)
      : currentConfig

    if (!config) {
      throw new Error('No LLM configuration available')
    }

    const request: LLMRequest = {
      configurationId: config.id,
      messages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty
    }

    return new Promise((resolve, reject) => {
      llmService.streamCompletion(
        request,
        onChunk,
        (response) => {
          // Track usage
          dispatch(addUsage({
            configId: config.id,
            tokens: response.usage.totalTokens,
            cost: response.cost
          }))
          resolve(response)
        },
        reject
      )
    })
  }, [dispatch, llmState.configurations, currentConfig])

  // Test connection for a configuration
  const testConnection = useCallback((configId: string) => {
    dispatch(testLLMConnection(configId))
  }, [dispatch])

  // Save new or updated configuration
  const saveConfiguration = useCallback((config: Omit<LLMConfiguration, 'id' | 'usageStats'>) => {
    dispatch(saveLLMConfiguration(config))
  }, [dispatch])

  // Fetch latest usage statistics
  const refreshUsageStats = useCallback(() => {
    dispatch(fetchUsageStats())
  }, [dispatch])

  // Set current active configuration
  const setActiveConfiguration = useCallback((configId: string) => {
    dispatch(setCurrentConfiguration(configId))
  }, [dispatch])

  // Configuration management
  const createConfiguration = useCallback((config: LLMConfiguration) => {
    dispatch(addConfiguration(config))
  }, [dispatch])

  const editConfiguration = useCallback((id: string, updates: Partial<LLMConfiguration>) => {
    dispatch(updateConfiguration({ id, updates }))
  }, [dispatch])

  const removeConfiguration = useCallback((id: string) => {
    dispatch(deleteConfiguration(id))
  }, [dispatch])

  const setDefault = useCallback((configId: string) => {
    dispatch(setDefaultConfiguration(configId))
  }, [dispatch])

  // Provider management
  const toggleProvider = useCallback((providerId: string, isActive: boolean) => {
    dispatch(updateProviderStatus({ providerId, isActive }))
  }, [dispatch])

  // Update cost tracking settings
  const updateCostSettings = useCallback((settings: Partial<LLMConfigState['costTracking']>) => {
    dispatch(updateCostTracking(settings))
  }, [dispatch])

  // Update monitoring settings
  const updateMonitoringSettings = useCallback((settings: Partial<LLMConfigState['monitoring']>) => {
    dispatch(updateMonitoring(settings))
  }, [dispatch])

  // Clear any errors
  const clearErrors = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    // State
    ...llmState,
    currentConfiguration: currentConfig,

    // Actions
    generateCompletion,
    streamCompletion,
    testConnection,
    saveConfiguration,
    refreshUsageStats,
    setActiveConfiguration,
    createConfiguration,
    editConfiguration,
    removeConfiguration,
    setDefault,
    toggleProvider,
    updateCostSettings,
    updateMonitoringSettings,
    clearErrors,

    // Computed values
    hasConfigurations: llmState.configurations.length > 0,
    activeProviders: llmState.providers.filter(p => p.isActive),
    totalDailyCost: llmState.costTracking.currentDaySpent,
    totalMonthlyCost: llmState.costTracking.currentMonthSpent,
    isDailyBudgetExceeded: llmState.costTracking.currentDaySpent >= llmState.costTracking.dailyBudget,
    isMonthlyBudgetExceeded: llmState.costTracking.currentMonthSpent >= llmState.costTracking.monthlyBudget,
    isNearDailyLimit: llmState.costTracking.currentDaySpent >= (llmState.costTracking.dailyBudget * llmState.costTracking.alertThreshold),
    isNearMonthlyLimit: llmState.costTracking.currentMonthSpent >= (llmState.costTracking.monthlyBudget * llmState.costTracking.alertThreshold)
  }
}

export function useLLMConfiguration(configId?: string) {
  const { configurations, testResults, testConnection, editConfiguration, removeConfiguration } = useLLM()
  
  const config = configId ? configurations.find(c => c.id === configId) : null
  const testResult = configId ? testResults[configId] : null

  return {
    config,
    testResult,
    testConnection: configId ? () => testConnection(configId) : undefined,
    updateConfig: configId ? (updates: Partial<LLMConfiguration>) => editConfiguration(configId, updates) : undefined,
    deleteConfig: configId ? () => removeConfiguration(configId) : undefined,
    exists: !!config
  }
}

export function useLLMCostTracking() {
  const { 
    costTracking, 
    totalDailyCost, 
    totalMonthlyCost, 
    isDailyBudgetExceeded, 
    isMonthlyBudgetExceeded, 
    isNearDailyLimit, 
    isNearMonthlyLimit,
    updateCostSettings 
  } = useLLM()

  const dailyBudgetPercentage = (totalDailyCost / costTracking.dailyBudget) * 100
  const monthlyBudgetPercentage = (totalMonthlyCost / costTracking.monthlyBudget) * 100

  return {
    ...costTracking,
    totalDailyCost,
    totalMonthlyCost,
    isDailyBudgetExceeded,
    isMonthlyBudgetExceeded,
    isNearDailyLimit,
    isNearMonthlyLimit,
    dailyBudgetPercentage,
    monthlyBudgetPercentage,
    updateSettings: updateCostSettings
  }
}

export function useStreamingCompletion() {
  const { streamCompletion } = useLLM()
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startStream = useCallback(async (
    messages: LLMRequest['messages'],
    configId?: string
  ) => {
    setContent('')
    setIsStreaming(true)
    setError(null)

    try {
      await streamCompletion(
        messages,
        (chunk) => {
          setContent(prev => prev + chunk)
        },
        configId
      )
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsStreaming(false)
    }
  }, [streamCompletion])

  const reset = useCallback(() => {
    setContent('')
    setError(null)
    setIsStreaming(false)
  }, [])

  return {
    content,
    isStreaming,
    error,
    startStream,
    reset
  }
}