import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { 
  cognitoService, 
  type LoginCredentials, 
  type SignUpData, 
  type ConfirmSignUpData,
  type ForgotPasswordData,
  type ResetPasswordData,
  type CognitoUser,
  type AuthTokens
} from '../../services/auth/cognitoService'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  name: string // Full name computed from firstName + lastName
  role: 'admin' | 'faculty' | 'student' | 'guest'
  permissions: string[]
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: boolean
  }
  emailVerified: boolean
  phoneVerified?: boolean
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  loginAttempts: number
  lastLoginTime: string | null
  pendingVerification: {
    username: string
    email: string
  } | null
}

// Helper function to load auth state from localStorage
const loadAuthFromStorage = (): Partial<AuthState> => {
  try {
    const storedAuth = localStorage.getItem('auth_state')
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth)
      // Validate the stored auth state
      if (parsed.user && parsed.isAuthenticated) {
        return {
          user: parsed.user,
          tokens: parsed.tokens,
          isAuthenticated: true,
          lastLoginTime: parsed.lastLoginTime
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load auth state from localStorage:', error)
    localStorage.removeItem('auth_state')
  }
  return {}
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  loginAttempts: 0,
  lastLoginTime: null,
  pendingVerification: null,
  ...loadAuthFromStorage()
}

// Helper function to map Cognito user to application user
function mapCognitoUserToUser(cognitoUser: CognitoUser): User {
  const firstName = cognitoUser.firstName || ''
  const lastName = cognitoUser.lastName || ''
  const name = `${firstName} ${lastName}`.trim() || cognitoUser.username
  
  return {
    id: cognitoUser.userId,
    username: cognitoUser.username,
    email: cognitoUser.email,
    firstName: firstName,
    lastName: lastName,
    name: name,
    role: 'faculty', // Default role - this should be determined by user attributes or groups
    permissions: [], // This should be determined by user groups/roles
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: true
    },
    emailVerified: cognitoUser.emailVerified,
    phoneVerified: cognitoUser.phoneVerified
  }
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const result = await cognitoService.signIn(credentials)
      return {
        user: mapCognitoUserToUser(result.user),
        tokens: result.tokens
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed')
    }
  }
)

export const signUpUser = createAsyncThunk(
  'auth/signUpUser',
  async (userData: SignUpData, { rejectWithValue }) => {
    try {
      const result = await cognitoService.signUp(userData)
      return {
        userId: result.userId,
        username: userData.username,
        email: userData.email,
        codeDeliveryDetails: result.codeDeliveryDetails
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed')
    }
  }
)

export const confirmSignUp = createAsyncThunk(
  'auth/confirmSignUp',
  async (data: ConfirmSignUpData, { rejectWithValue }) => {
    try {
      await cognitoService.confirmSignUp(data)
      return { username: data.username }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Email confirmation failed')
    }
  }
)

export const resendConfirmationCode = createAsyncThunk(
  'auth/resendConfirmationCode',
  async (username: string, { rejectWithValue }) => {
    try {
      const codeDeliveryDetails = await cognitoService.resendConfirmationCode(username)
      return { username, codeDeliveryDetails }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resend confirmation code')
    }
  }
)

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (data: ForgotPasswordData, { rejectWithValue }) => {
    try {
      const codeDeliveryDetails = await cognitoService.forgotPassword(data)
      return { username: data.username, codeDeliveryDetails }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initiate password reset')
    }
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: ResetPasswordData, { rejectWithValue }) => {
    try {
      await cognitoService.confirmResetPassword(data)
      return { username: data.username }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset failed')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = await cognitoService.refreshAuthSession()
      return tokens
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed')
    }
  }
)

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const result = await cognitoService.getCurrentAuthenticatedUser()
      if (result) {
        return {
          user: mapCognitoUserToUser(result.user),
          tokens: result.tokens
        }
      }
      return null
    } catch (error: any) {
      return rejectWithValue(error.message || 'Auth check failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await cognitoService.signOut()
      return undefined
    } catch (error: any) {
      // Still proceed with logout even if Cognito signOut fails
      console.error('Cognito sign out error:', error)
      return undefined
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0
    },
    updateUserPreferences: (state, action: PayloadAction<Partial<User['preferences']>>) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload }
      }
    },
    clearPendingVerification: (state) => {
      state.pendingVerification = null
    },
    // Simple login for demo purposes without Cognito
    login: (state, action: PayloadAction<Omit<User, 'preferences'> & { preferences?: Partial<User['preferences']> }>) => {
      state.user = {
        ...action.payload,
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: true,
          ...action.payload.preferences
        }
      }
      state.isAuthenticated = true
      state.lastLoginTime = new Date().toISOString()
      state.error = null
      
      // Persist auth state to localStorage
      try {
        localStorage.setItem('auth_state', JSON.stringify({
          user: state.user,
          tokens: state.tokens,
          isAuthenticated: state.isAuthenticated,
          lastLoginTime: state.lastLoginTime
        }))
      } catch (error) {
        console.warn('Failed to persist auth state to localStorage:', error)
      }
    },
    // Local logout action for immediate state clearing
    logoutLocal: (state) => {
      state.user = null
      state.tokens = null
      state.isAuthenticated = false
      state.error = null
      state.loginAttempts = 0
      state.lastLoginTime = null
      state.pendingVerification = null
      
      // Clear auth state from localStorage
      try {
        localStorage.removeItem('auth_state')
      } catch (error) {
        console.warn('Failed to clear auth state from localStorage:', error)
      }
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.isAuthenticated = true
        state.loginAttempts = 0
        state.lastLoginTime = new Date().toISOString()
        state.pendingVerification = null
        
        // Persist auth state to localStorage
        try {
          localStorage.setItem('auth_state', JSON.stringify({
            user: state.user,
            tokens: state.tokens,
            isAuthenticated: state.isAuthenticated,
            lastLoginTime: state.lastLoginTime
          }))
        } catch (error) {
          console.warn('Failed to persist auth state to localStorage:', error)
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.loginAttempts += 1
      })

    // Sign up
    builder
      .addCase(signUpUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.pendingVerification = {
          username: action.payload.username,
          email: action.payload.email
        }
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Confirm sign up
    builder
      .addCase(confirmSignUp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(confirmSignUp.fulfilled, (state) => {
        state.isLoading = false
        state.pendingVerification = null
      })
      .addCase(confirmSignUp.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Resend confirmation
    builder
      .addCase(resendConfirmationCode.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resendConfirmationCode.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(resendConfirmationCode.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Forgot password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload
      })
      .addCase(refreshToken.rejected, (state) => {
        // Clear auth state if token refresh fails
        state.user = null
        state.tokens = null
        state.isAuthenticated = false
      })

    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.user = action.payload.user
          state.tokens = action.payload.tokens
          state.isAuthenticated = true
        }
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.tokens = null
        state.isAuthenticated = false
      })

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.tokens = null
        state.isAuthenticated = false
        state.error = null
        state.loginAttempts = 0
        state.lastLoginTime = null
        state.pendingVerification = null
        
        // Clear auth state from localStorage
        try {
          localStorage.removeItem('auth_state')
        } catch (error) {
          console.warn('Failed to clear auth state from localStorage:', error)
        }
      })
  }
})

export const {
  clearError,
  incrementLoginAttempts,
  resetLoginAttempts,
  updateUserPreferences,
  clearPendingVerification,
  login,
  logoutLocal
} = authSlice.actions

export default authSlice.reducer