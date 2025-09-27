import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { sampleAnalyses, sampleWorkflows } from '@/lib/sampleData'
import { analysisService } from '../../services/api/analysisService'
import type { CreateAnalysisRequest } from '../../services/api/types'

export interface AnalysisResult {
  id: string
  type: 'curriculum-comparison' | 'accreditation-analysis' | 'gap-analysis' | 'semantic-analysis'
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  progress: number
  createdAt: string
  completedAt?: string
  parameters: {
    sourceProgram?: string
    targetProgram?: string
    standards?: string[]
    analysisOptions?: Record<string, any>
  }
  results?: {
    overallScore?: number
    similarities?: any[]
    differences?: any[]
    gaps?: any[]
    recommendations?: any[]
    compliance?: Record<string, any>
    mappings?: any[]
  }
  error?: string
}

export interface Workflow {
  id: string
  name: string
  status: 'initiated' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  steps: Array<{
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    startTime?: string
    endTime?: string
    result?: any
  }>
  createdAt: string
  estimatedDuration?: number
  actualDuration?: number
}

export interface AnalysisState {
  analyses: AnalysisResult[]
  workflows: Workflow[]
  currentAnalysis: AnalysisResult | null
  currentWorkflow: Workflow | null
  comparisonCache: Record<string, AnalysisResult>
  isRunningAnalysis: boolean
  selectedAnalysisType: AnalysisResult['type'] | null
  analysisHistory: AnalysisResult[]
  error: string | null
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    timestamp: string
    read: boolean
  }>
}

const initialState: AnalysisState = {
  analyses: sampleAnalyses,
  workflows: sampleWorkflows,
  currentAnalysis: sampleAnalyses.find(a => a.status === 'in-progress') || null,
  currentWorkflow: sampleWorkflows.find(w => w.status === 'running') || null,
  comparisonCache: {},
  isRunningAnalysis: false,
  selectedAnalysisType: null,
  analysisHistory: [],
  error: null,
  notifications: [],
}

// Async thunks for analysis operations
export const fetchAnalyses = createAsyncThunk(
  'analysis/fetchAnalyses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analysisService.getAnalyses()
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch analyses')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const createAnalysis = createAsyncThunk(
  'analysis/createAnalysis',
  async (analysisData: CreateAnalysisRequest, { rejectWithValue }) => {
    try {
      const response = await analysisService.createAnalysis(analysisData)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create analysis')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to create analysis')
    }
  }
)

export const startAnalysis = createAsyncThunk(
  'analysis/startAnalysis',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await analysisService.startAnalysis(analysisId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to start analysis')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const pauseAnalysis = createAsyncThunk(
  'analysis/pauseAnalysis',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await analysisService.pauseAnalysis(analysisId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to pause analysis')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to pause analysis')
    }
  }
)

export const stopAnalysis = createAsyncThunk(
  'analysis/stopAnalysis',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await analysisService.stopAnalysis(analysisId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to stop analysis')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to stop analysis')
    }
  }
)

export const resumeAnalysis = createAsyncThunk(
  'analysis/resumeAnalysis',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await analysisService.resumeAnalysis(analysisId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to resume analysis')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to resume analysis')
    }
  }
)

export const getAnalysisStatus = createAsyncThunk(
  'analysis/getStatus',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/status`)
      if (!response.ok) {
        return rejectWithValue('Failed to get analysis status')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const getAnalysisResults = createAsyncThunk(
  'analysis/getResults',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/results`)
      if (!response.ok) {
        return rejectWithValue('Failed to get analysis results')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const cancelAnalysis = createAsyncThunk(
  'analysis/cancel',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/cancel`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to cancel analysis')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const startWorkflow = createAsyncThunk(
  'analysis/startWorkflow',
  async (params: {
    workflowType: string
    parameters: Record<string, any>
  }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/workflows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to start workflow')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setCurrentAnalysis: (state, action: PayloadAction<AnalysisResult | null>) => {
      state.currentAnalysis = action.payload
    },
    setSelectedAnalysisType: (state, action: PayloadAction<AnalysisResult['type'] | null>) => {
      state.selectedAnalysisType = action.payload
    },
    updateAnalysisProgress: (state, action: PayloadAction<{
      analysisId: string
      progress: number
      status?: AnalysisResult['status']
    }>) => {
      const analysis = state.analyses.find(a => a.id === action.payload.analysisId)
      if (analysis) {
        analysis.progress = action.payload.progress
        if (action.payload.status) {
          analysis.status = action.payload.status
        }
      }
      
      if (state.currentAnalysis?.id === action.payload.analysisId) {
        state.currentAnalysis.progress = action.payload.progress
        if (action.payload.status) {
          state.currentAnalysis.status = action.payload.status
        }
      }
    },
    updateWorkflowProgress: (state, action: PayloadAction<{
      workflowId: string
      progress: number
      status?: Workflow['status']
      currentStep?: string
    }>) => {
      const workflow = state.workflows.find(w => w.id === action.payload.workflowId)
      if (workflow) {
        workflow.progress = action.payload.progress
        if (action.payload.status) {
          workflow.status = action.payload.status
        }
        if (action.payload.currentStep) {
          const step = workflow.steps.find(s => s.name === action.payload.currentStep)
          if (step) {
            step.status = 'running'
            step.startTime = new Date().toISOString()
          }
        }
      }
    },
    addNotification: (state, action: PayloadAction<Omit<AnalysisState['notifications'][0], 'id' | 'timestamp' | 'read'>>) => {
      state.notifications.unshift({
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      })
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    cacheComparison: (state, action: PayloadAction<{
      key: string
      result: AnalysisResult
    }>) => {
      state.comparisonCache[action.payload.key] = action.payload.result
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Start analysis
    builder
      .addCase(startAnalysis.pending, (state) => {
        state.isRunningAnalysis = true
        state.error = null
      })
      .addCase(startAnalysis.fulfilled, (state, action) => {
        state.isRunningAnalysis = false
        const newAnalysis = {
          ...action.payload,
          type: 'gap-analysis' as const,
          parameters: {},
          progress: 0,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        }
        state.analyses.unshift(newAnalysis as any)
        state.currentAnalysis = newAnalysis as any
      })
      .addCase(startAnalysis.rejected, (state, action) => {
        state.isRunningAnalysis = false
        state.error = action.payload as string
      })
    
    // Get analysis status
    builder
      .addCase(getAnalysisStatus.fulfilled, (state, action) => {
        const analysis = state.analyses.find(a => a.id === action.payload.id)
        if (analysis) {
          Object.assign(analysis, action.payload)
        }
        if (state.currentAnalysis?.id === action.payload.id && state.currentAnalysis) {
          Object.assign(state.currentAnalysis, action.payload)
        }
      })
    
    // Get analysis results
    builder
      .addCase(getAnalysisResults.fulfilled, (state, action) => {
        const analysis = state.analyses.find(a => a.id === action.payload.id)
        if (analysis) {
          analysis.results = action.payload.results
          analysis.status = 'completed'
          analysis.completedAt = new Date().toISOString()
        }
        if (state.currentAnalysis?.id === action.payload.id && state.currentAnalysis) {
          state.currentAnalysis.results = action.payload.results
          state.currentAnalysis.status = 'completed'
          state.currentAnalysis.completedAt = new Date().toISOString()
        }
      })
    
    // Cancel analysis
    builder
      .addCase(cancelAnalysis.fulfilled, (state, action) => {
        const analysis = state.analyses.find(a => a.id === action.payload.id)
        if (analysis) {
          analysis.status = 'failed'
          analysis.error = 'Analysis cancelled by user'
        }
      })
    
    // Start workflow
    builder
      .addCase(startWorkflow.fulfilled, (state, action) => {
        const newWorkflow = {
          ...action.payload,
          progress: 0,
          status: 'initiated' as const,
          createdAt: new Date().toISOString(),
        }
        state.workflows.unshift(newWorkflow)
        state.currentWorkflow = newWorkflow
      })
  },
})

export const {
  setCurrentAnalysis,
  setSelectedAnalysisType,
  updateAnalysisProgress,
  updateWorkflowProgress,
  addNotification,
  markNotificationRead,
  clearNotifications,
  cacheComparison,
  clearError,
} = analysisSlice.actions

export default analysisSlice.reducer