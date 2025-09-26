import { apiClient } from '../api/apiClient'
import type { LLMConfiguration, LLMProvider } from '../../store/slices/llmConfigSlice'

export interface LLMRequest {
  configurationId?: string
  provider?: string
  model?: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  maxTokens?: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
}

export interface LLMResponse {
  id: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls'
  }>
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  provider: string
  cost: number
  latency: number
  timestamp: string
}

export interface LLMUsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  dailySpent: number
  monthlySpent: number
  configurations: Array<{
    id: string
    usageStats: {
      totalRequests: number
      totalTokens: number
      totalCost: number
      lastUsed?: string
    }
  }>
}

export interface LLMTestResult {
  success: boolean
  latency?: number
  error?: string
  timestamp: string
  response?: string
}

class LLMService {
  private baseUrl = '/api/llm'

  // Generate completion using LLM
  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/completions`, request)
      return response.data as LLMResponse
    } catch (error: any) {
      console.error('Failed to generate completion:', error)
      throw new Error(error.response?.data?.message || 'Failed to generate completion')
    }
  }

  // Stream completion (for real-time responses)
  async streamCompletion(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: LLMResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const authHeaders = await apiClient.getAuthHeaders()
      const response = await fetch(`${this.baseUrl}/completions/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      let buffer = ''
      let finalResponse: LLMResponse | null = null

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          if (finalResponse) {
            onComplete(finalResponse)
          }
          break
        }

        buffer += new TextDecoder().decode(value)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              continue
            }

            try {
              const chunk = JSON.parse(data)
              
              if (chunk.type === 'chunk') {
                onChunk(chunk.content)
              } else if (chunk.type === 'complete') {
                finalResponse = chunk.response
              }
            } catch (parseError) {
              console.warn('Failed to parse stream chunk:', parseError)
            }
          }
        }
      }
    } catch (error: any) {
      onError(new Error(error.message || 'Stream completion failed'))
    }
  }

  // Test LLM configuration
  async testConnection(configuration: Partial<LLMConfiguration>): Promise<LLMTestResult> {
    try {
      const startTime = Date.now()
      
      const response = await apiClient.post(`${this.baseUrl}/test`, {
        provider: configuration.provider,
        model: configuration.model,
        temperature: configuration.temperature || 0.3,
        testPrompt: 'Hello, please respond with "Test successful"'
      })

      const endTime = Date.now()
      
      return {
        success: true,
        latency: endTime - startTime,
        timestamp: new Date().toISOString(),
        response: (response.data as any)?.response || 'Test completed successfully'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Connection test failed',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Get available providers
  async getProviders(): Promise<LLMProvider[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/providers`)
      return response.data as LLMProvider[]
    } catch (error: any) {
      console.error('Failed to fetch providers:', error)
      return []
    }
  }

  // Save configuration
  async saveConfiguration(config: Omit<LLMConfiguration, 'id' | 'usageStats'>): Promise<LLMConfiguration> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/configurations`, config)
      return response.data as LLMConfiguration
    } catch (error: any) {
      console.error('Failed to save configuration:', error)
      throw new Error(error.response?.data?.message || 'Failed to save configuration')
    }
  }

  // Update configuration
  async updateConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/configurations/${id}`, updates)
      return response.data as LLMConfiguration
    } catch (error: any) {
      console.error('Failed to update configuration:', error)
      throw new Error(error.response?.data?.message || 'Failed to update configuration')
    }
  }

  // Delete configuration
  async deleteConfiguration(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/configurations/${id}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete configuration')
    }
  }

  // Get usage statistics
  async getUsageStats(): Promise<LLMUsageStats> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/usage-stats`)
      return response.data as LLMUsageStats
    } catch (error: any) {
      console.error('Failed to fetch usage statistics:', error)
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        dailySpent: 0,
        monthlySpent: 0,
        configurations: []
      }
    }
  }

  // Validate API key for a provider
  async validateApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/validate-key`, {
        provider,
        apiKey
      })
      return (response.data as any)?.valid || false
    } catch (error: any) {
      console.error('Failed to validate API key:', error)
      return false
    }
  }

  // Get model pricing information
  async getModelPricing(): Promise<Record<string, { input: number; output: number }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/pricing`)
      return response.data as Record<string, { input: number; output: number }>
    } catch (error: any) {
      console.warn('Failed to fetch model pricing:', error)
      return {}
    }
  }

  // Generate curriculum-specific analysis
  async analyzeCurriculum(
    documents: string[],
    analysisType: 'alignment' | 'gap' | 'structure' | 'quality',
    configuration?: string
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      configurationId: configuration,
      messages: [
        {
          role: 'system',
          content: `You are an expert educational curriculum analyst. Perform a ${analysisType} analysis on the provided curriculum documents.`
        },
        {
          role: 'user',
          content: `Please analyze these curriculum documents:\n\n${documents.join('\n\n---\n\n')}`
        }
      ]
    }

    return this.generateCompletion(request)
  }

  // Generate educational reports
  async generateReport(
    data: any,
    reportType: 'alignment' | 'gap' | 'summary' | 'recommendations',
    configuration?: string
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      configurationId: configuration,
      messages: [
        {
          role: 'system',
          content: `You are an expert educational report writer. Generate a comprehensive ${reportType} report based on the provided data.`
        },
        {
          role: 'user',
          content: `Generate a ${reportType} report using this data:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    }

    return this.generateCompletion(request)
  }
}

// Export singleton instance
export const llmService = new LLMService()