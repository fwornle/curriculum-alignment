import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { samplePrograms, sampleUploadedDocuments } from '../../lib/sampleData'
import { programService } from '../../services/api/programService'
import type { CreateProgramRequest, UpdateProgramRequest, Course as APICourse, Program as APIProgram } from '../../services/api/types'


// Use API types for consistency
export type Course = APICourse
export type Program = APIProgram

export interface CurriculumState {
  programs: Program[]
  currentProgram: Program | null
  selectedCourses: string[]
  uploadedDocuments: Array<{
    id: string
    name: string
    type: string
    status: 'uploading' | 'processing' | 'completed' | 'error'
    url?: string
    extractedData?: any
  }>
  searchResults: Program[]
  isLoading: boolean
  error: string | null
  filters: {
    university: string[]
    degree: string[]
    department: string[]
    level: string[]
  }
  sortBy: 'name' | 'university' | 'lastUpdated' | 'credits'
  sortOrder: 'asc' | 'desc'
}

const initialState: CurriculumState = {
  programs: samplePrograms,
  currentProgram: null,
  selectedCourses: [],
  uploadedDocuments: sampleUploadedDocuments,
  searchResults: [],
  isLoading: false,
  error: null,
  filters: {
    university: [],
    degree: [],
    department: [],
    level: [],
  },
  sortBy: 'name',
  sortOrder: 'asc',
}

// Async thunks for program operations
export const fetchPrograms = createAsyncThunk(
  'curriculum/fetchPrograms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await programService.getPrograms()
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch programs')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const createProgram = createAsyncThunk(
  'curriculum/createProgram',
  async (programData: CreateProgramRequest, { rejectWithValue }) => {
    try {
      const response = await programService.createProgram(programData)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to create program')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to create program')
    }
  }
)

export const updateProgram = createAsyncThunk(
  'curriculum/updateProgram',
  async ({ programId, programData }: { programId: string; programData: UpdateProgramRequest }, { rejectWithValue }) => {
    try {
      const response = await programService.updateProgram(programId, programData)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to update program')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Failed to update program')
    }
  }
)

export const deleteProgram = createAsyncThunk(
  'curriculum/deleteProgram',
  async (programId: string, { rejectWithValue }) => {
    try {
      const response = await programService.deleteProgram(programId)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to delete program')
      }
      return programId
    } catch (error) {
      return rejectWithValue('Failed to delete program')
    }
  }
)

export const uploadProgramDocument = createAsyncThunk(
  'curriculum/uploadProgramDocument',
  async ({ 
    programId, 
    file, 
    metadata, 
    onProgress 
  }: { 
    programId: string; 
    file: File; 
    metadata: { documentType: string; title: string; description?: string }; 
    onProgress?: (progress: number) => void 
  }, { rejectWithValue }) => {
    try {
      const response = await programService.uploadDocument(programId, file, metadata, onProgress)
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to upload document')
      }
      return response.data
    } catch (error) {
      return rejectWithValue('Upload failed')
    }
  }
)

export const processDocument = createAsyncThunk(
  'curriculum/processDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to process document')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Processing failed')
    }
  }
)

export const searchPrograms = createAsyncThunk(
  'curriculum/searchPrograms',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/curricula/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        return rejectWithValue('Search failed')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

const curriculumSlice = createSlice({
  name: 'curriculum',
  initialState,
  reducers: {
    setCurrentProgram: (state, action: PayloadAction<Program | null>) => {
      state.currentProgram = action.payload
    },
    toggleCourseSelection: (state, action: PayloadAction<string>) => {
      const courseId = action.payload
      const index = state.selectedCourses.indexOf(courseId)
      if (index === -1) {
        state.selectedCourses.push(courseId)
      } else {
        state.selectedCourses.splice(index, 1)
      }
    },
    clearCourseSelection: (state) => {
      state.selectedCourses = []
    },
    setFilters: (state, action: PayloadAction<Partial<CurriculumState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setSorting: (state, action: PayloadAction<{
      sortBy: CurriculumState['sortBy']
      sortOrder: CurriculumState['sortOrder']
    }>) => {
      state.sortBy = action.payload.sortBy
      state.sortOrder = action.payload.sortOrder
    },
    clearError: (state) => {
      state.error = null
    },
    updateDocumentStatus: (state, action: PayloadAction<{
      id: string
      status: CurriculumState['uploadedDocuments'][0]['status']
      extractedData?: any
    }>) => {
      const document = state.uploadedDocuments.find(doc => doc.id === action.payload.id)
      if (document) {
        document.status = action.payload.status
        if (action.payload.extractedData) {
          document.extractedData = action.payload.extractedData
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch programs
    builder
      .addCase(fetchPrograms.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPrograms.fulfilled, (state, action) => {
        state.isLoading = false
        state.programs = action.payload || []
      })
      .addCase(fetchPrograms.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Create program
    builder
      .addCase(createProgram.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createProgram.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.programs.push(action.payload)
        }
      })
      .addCase(createProgram.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Update program
    builder
      .addCase(updateProgram.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProgram.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.programs.findIndex(p => p.id === action.payload?.id)
        if (index !== -1) {
          if (action.payload) {
            state.programs[index] = action.payload
          }
        }
        if (action.payload && state.currentProgram?.id === action.payload.id) {
          state.currentProgram = action.payload
        }
      })
      .addCase(updateProgram.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Delete program
    builder
      .addCase(deleteProgram.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteProgram.fulfilled, (state, action) => {
        state.isLoading = false
        state.programs = state.programs.filter(p => p.id !== action.payload)
        if (state.currentProgram?.id === action.payload) {
          state.currentProgram = null
        }
      })
      .addCase(deleteProgram.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Upload program document
    builder
      .addCase(uploadProgramDocument.pending, (state, action) => {
        const uploadId = Date.now().toString()
        state.uploadedDocuments.push({
          id: uploadId,
          name: action.meta.arg.file.name,
          type: action.meta.arg.file.type,
          status: 'uploading',
        })
      })
      .addCase(uploadProgramDocument.fulfilled, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.name === action.meta.arg.file.name
        )
        if (document) {
          document.id = action.payload?.id || document.id
          document.status = 'completed'
          document.url = action.payload?.url || ''
        }
      })
      .addCase(uploadProgramDocument.rejected, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.name === action.meta.arg.file.name
        )
        if (document) {
          document.status = 'error'
        }
      })
    
    // Process document
    builder
      .addCase(processDocument.fulfilled, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.id === action.meta.arg
        )
        if (document) {
          document.status = 'completed'
          document.extractedData = action.payload
        }
      })
      .addCase(processDocument.rejected, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.id === action.meta.arg
        )
        if (document) {
          document.status = 'error'
        }
      })
    
    // Search programs
    builder
      .addCase(searchPrograms.pending, (state) => {
        state.isLoading = true
      })
      .addCase(searchPrograms.fulfilled, (state, action) => {
        state.isLoading = false
        state.searchResults = action.payload
      })
      .addCase(searchPrograms.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setCurrentProgram,
  toggleCourseSelection,
  clearCourseSelection,
  setFilters,
  setSorting,
  clearError,
  updateDocumentStatus,
} = curriculumSlice.actions

export default curriculumSlice.reducer