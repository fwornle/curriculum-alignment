import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Course {
  id: string
  code: string
  title: string
  description: string
  credits: number
  prerequisites: string[]
  corequisites: string[]
  level: 'undergraduate' | 'graduate'
  department: string
  semester: string[]
  status: 'active' | 'inactive' | 'planned'
}

export interface Program {
  id: string
  name: string
  degree: string
  university: string
  totalCredits: number
  duration: string
  department: string
  description: string
  courses: Course[]
  requirements: {
    core: string[]
    electives: {
      categories: string[]
      minimumCredits: number
    }
    general: string[]
  }
  lastUpdated: string
  version: string
}

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
  programs: [],
  currentProgram: null,
  selectedCourses: [],
  uploadedDocuments: [],
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

// Async thunks
export const fetchPrograms = createAsyncThunk(
  'curriculum/fetchPrograms',
  async (filters: Partial<CurriculumState['filters']> | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            params.append(key, values.join(','))
          }
        })
      }
      
      const response = await fetch(`/api/curricula?${params}`)
      if (!response.ok) {
        return rejectWithValue('Failed to fetch programs')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const uploadDocument = createAsyncThunk(
  'curriculum/uploadDocument',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('document', file)
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to upload document')
      }
      
      return await response.json()
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
        state.programs = action.payload
      })
      .addCase(fetchPrograms.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Upload document
    builder
      .addCase(uploadDocument.pending, (state, action) => {
        const uploadId = Date.now().toString()
        state.uploadedDocuments.push({
          id: uploadId,
          name: action.meta.arg.name,
          type: action.meta.arg.type,
          status: 'uploading',
        })
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.name === action.meta.arg.name
        )
        if (document) {
          document.id = action.payload.id
          document.status = 'processing'
          document.url = action.payload.url
        }
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        const document = state.uploadedDocuments.find(doc => 
          doc.name === action.meta.arg.name
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