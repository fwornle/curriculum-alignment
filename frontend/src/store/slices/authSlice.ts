import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: string
  email: string
  name: string
  roles: string[]
  institution?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: boolean
  }
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  loginAttempts: number
  lastLoginTime: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  loginAttempts: 0,
  lastLoginTime: null,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.message || 'Login failed')
      }
      
      const data = await response.json()
      localStorage.setItem('auth_token', data.token)
      return data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.auth.token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        return rejectWithValue('Token refresh failed')
      }
      
      const data = await response.json()
      localStorage.setItem('auth_token', data.token)
      return data
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

export const updateUserPreferences = createAsyncThunk(
  'auth/updatePreferences',
  async (preferences: Partial<User['preferences']>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${state.auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to update preferences')
      }
      
      const data = await response.json()
      return data.preferences
    } catch (error) {
      return rejectWithValue('Network error occurred')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('auth_token')
    },
    clearError: (state) => {
      state.error = null
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      if (state.user) {
        state.user.preferences.theme = action.payload
      }
    },
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0
    },
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.loginAttempts = 0
        state.lastLoginTime = new Date().toISOString()
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.loginAttempts += 1
      })
    
    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token
        if (action.payload.user) {
          state.user = action.payload.user
        }
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        localStorage.removeItem('auth_token')
      })
    
    // Update preferences
    builder
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        if (state.user) {
          state.user.preferences = { ...state.user.preferences, ...action.payload }
        }
      })
  },
})

export const { 
  logout, 
  clearError, 
  setTheme, 
  incrementLoginAttempts, 
  resetLoginAttempts 
} = authSlice.actions

export default authSlice.reducer