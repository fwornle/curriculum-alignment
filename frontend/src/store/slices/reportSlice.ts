import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
// Temporarily remove circular import - will be replaced with API data
// import { sampleReports, sampleReportTemplates } from '../../lib/sampleData'
import { reportService } from '../../services/api/reportService'
import type { CreateReportRequest } from '../../services/api/types'

export interface ReportTemplate {
  id: string
  name: string
  description: string
  type: 'comparison' | 'accreditation' | 'gap-analysis' | 'custom'
  sections: Array<{
    id: string
    title: string
    type: 'summary' | 'table' | 'chart' | 'list' | 'text'
    required: boolean
    configurable: boolean
  }>
  defaultConfig: Record<string, any>
}

export interface Report {
  id: string
  title: string
  type: ReportTemplate['type']
  status: 'draft' | 'generating' | 'completed' | 'failed'
  progress: number
  createdAt: string
  completedAt?: string
  parameters: {
    templateId: string
    analysisId?: string
    workflowId?: string
    customConfig?: Record<string, any>
  }
  content?: {
    sections: Array<{
      id: string
      title: string
      content: any
      charts?: Array<{
        type: 'bar' | 'pie' | 'line' | 'scatter'
        data: any
        config: any
      }>
    }>
    metadata: {
      generatedBy: string
      dataSource: string
      totalPages: number
      wordCount: number
    }
  }
  exports?: Array<{
    format: 'pdf' | 'docx' | 'html' | 'json'
    url: string
    size: number
    createdAt: string
  }>
  sharing?: {
    isPublic: boolean
    shareUrl?: string
    accessLevel: 'view' | 'edit'
    expiresAt?: string
  }
}

export interface ReportState {
  templates: ReportTemplate[]
  reports: Report[]
  currentReport: Report | null
  generationQueue: string[]
  isGenerating: boolean
  exportProgress: Record<string, number>
  previewData: any
  filters: {
    type: ReportTemplate['type'][]
    status: Report['status'][]
    dateRange: {
      start?: string
      end?: string
    }
  }
  sortBy: 'createdAt' | 'title' | 'type' | 'status'
  sortOrder: 'asc' | 'desc'
  error: string | null
}

const initialState: ReportState = {
  templates: [],
  reports: [],
  currentReport: null,
  generationQueue: [],
  isGenerating: false,
  exportProgress: {},
  previewData: null,
  filters: {
    type: [],
    status: [],
    dateRange: {}
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  error: null
}

// Async thunks for report operations
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportService.getReports()
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch reports')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const createReport = createAsyncThunk(
  'reports/createReport',
  async (reportData: CreateReportRequest, { rejectWithValue }) => {
    try {
      const response = await reportService.createReport(reportData)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create report')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to create report')
    }
  }
)

export const generateReport = createAsyncThunk(
  'reports/generateReport',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await reportService.generateReport(reportId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to generate report')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const downloadReport = createAsyncThunk(
  'reports/downloadReport',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await reportService.downloadReport(reportId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to download report')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to download report')
    }
  }
)

export const cancelReport = createAsyncThunk(
  'reports/cancelReport',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await reportService.cancelReport(reportId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to cancel report')
      }
      return reportId
    } catch (error) {
      return rejectWithValue('Failed to cancel report')
    }
  }
)

export const fetchReportTemplates = createAsyncThunk(
  'reports/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportService.getReportTemplates()
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch templates')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const getReportStatus = createAsyncThunk(
  'reports/getStatus',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/status`)
      
      if (!response.ok) {
        return rejectWithValue('Failed to get report status')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const exportReport = createAsyncThunk(
  'reports/export',
  async (params: {
    reportId: string
    format: 'pdf' | 'docx' | 'html' | 'json'
    options?: Record<string, any>
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/reports/${params.reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: params.format,
          options: params.options
        })
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to export report')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Export failed')
    }
  }
)

export const shareReport = createAsyncThunk(
  'reports/share',
  async (params: {
    reportId: string
    sharing: Report['sharing']
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/reports/${params.reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.sharing)
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to share report')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Sharing failed')
    }
  }
)

export const previewReport = createAsyncThunk(
  'reports/preview',
  async (params: {
    templateId: string
    analysisId?: string
    customConfig?: Record<string, any>
  }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to generate preview')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Preview generation failed')
    }
  }
)

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setCurrentReport: (state, action: PayloadAction<Report | null>) => {
      state.currentReport = action.payload
    },
    updateReportProgress: (state, action: PayloadAction<{
      reportId: string
      progress: number
      status?: Report['status']
    }>) => {
      const report = state.reports.find(r => r.id === action.payload.reportId)
      if (report) {
        report.progress = action.payload.progress
        if (action.payload.status) {
          report.status = action.payload.status
        }
      }
      
      if (state.currentReport?.id === action.payload.reportId) {
        state.currentReport.progress = action.payload.progress
        if (action.payload.status) {
          state.currentReport.status = action.payload.status
        }
      }
    },
    updateExportProgress: (state, action: PayloadAction<{
      reportId: string
      progress: number
    }>) => {
      state.exportProgress[action.payload.reportId] = action.payload.progress
    },
    addToGenerationQueue: (state, action: PayloadAction<string>) => {
      state.generationQueue.push(action.payload)
    },
    removeFromGenerationQueue: (state, action: PayloadAction<string>) => {
      const index = state.generationQueue.indexOf(action.payload)
      if (index !== -1) {
        state.generationQueue.splice(index, 1)
      }
    },
    setFilters: (state, action: PayloadAction<Partial<ReportState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSorting: (state, action: PayloadAction<{
      sortBy: ReportState['sortBy']
      sortOrder: ReportState['sortOrder']
    }>) => {
      state.sortBy = action.payload.sortBy
      state.sortOrder = action.payload.sortOrder
    },
    deleteReport: (state, action: PayloadAction<string>) => {
      const index = state.reports.findIndex(r => r.id === action.payload)
      if (index !== -1) {
        state.reports.splice(index, 1)
      }
      
      if (state.currentReport?.id === action.payload) {
        state.currentReport = null
      }
    },
    duplicateReport: (state, action: PayloadAction<string>) => {
      const original = state.reports.find(r => r.id === action.payload)
      if (original) {
        const duplicate: Report = {
          ...original,
          id: `${original.id}-copy-${Date.now()}`,
          title: `${original.title} (Copy)`,
          status: 'draft',
          progress: 0,
          createdAt: new Date().toISOString(),
          completedAt: undefined,
          content: undefined,
          exports: undefined
        }
        state.reports.unshift(duplicate)
      }
    },
    updateReportSharing: (state, action: PayloadAction<{
      reportId: string
      sharing: Report['sharing']
    }>) => {
      const report = state.reports.find(r => r.id === action.payload.reportId)
      if (report) {
        report.sharing = action.payload.sharing
      }
    },
    clearPreviewData: (state) => {
      state.previewData = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Generate report
    builder
      .addCase(generateReport.pending, (state) => {
        state.isGenerating = true
        state.error = null
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.isGenerating = false
        const newReport = {
          ...action.payload,
          title: action.payload?.name || 'Untitled Report',
          status: 'generating',
          progress: 0,
          createdAt: new Date().toISOString()
        }
        state.reports.unshift(newReport as any)
        state.currentReport = newReport as any
        state.generationQueue.push(newReport.id)
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isGenerating = false
        state.error = action.payload as string
      })
    
    // Get report status
    builder
      .addCase(getReportStatus.fulfilled, (state, action) => {
        const report = state.reports.find(r => r.id === action.payload.id)
        if (report) {
          Object.assign(report, action.payload)
        }
        if (state.currentReport?.id === action.payload.id && state.currentReport) {
          Object.assign(state.currentReport, action.payload)
        }
      })
    
    // Export report
    builder
      .addCase(exportReport.pending, (state, action) => {
        state.exportProgress[action.meta.arg.reportId] = 0
      })
      .addCase(exportReport.fulfilled, (state, action) => {
        const { reportId } = action.meta.arg
        const report = state.reports.find(r => r.id === reportId)
        
        if (report) {
          if (!report.exports) {
            report.exports = []
          }
          report.exports.push(action.payload)
        }
        
        delete state.exportProgress[reportId]
      })
      .addCase(exportReport.rejected, (state, action) => {
        const { reportId } = action.meta.arg
        delete state.exportProgress[reportId]
      })
    
    // Share report
    builder
      .addCase(shareReport.fulfilled, (state, action) => {
        const { reportId } = action.meta.arg
        const report = state.reports.find(r => r.id === reportId)
        
        if (report) {
          report.sharing = action.payload.sharing
        }
      })
    
    // Preview report
    builder
      .addCase(previewReport.pending, (state) => {
        state.previewData = null
      })
      .addCase(previewReport.fulfilled, (state, action) => {
        state.previewData = action.payload
      })
      .addCase(previewReport.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const {
  setCurrentReport,
  updateReportProgress,
  updateExportProgress,
  addToGenerationQueue,
  removeFromGenerationQueue,
  setFilters,
  setSorting,
  deleteReport,
  duplicateReport,
  updateReportSharing,
  clearPreviewData,
  clearError,
} = reportSlice.actions

export default reportSlice.reducer