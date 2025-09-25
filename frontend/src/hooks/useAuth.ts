import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { checkAuthStatus } from '../store/slices/authSlice'
import { apiClient } from '../services/api/apiClient'

export function useAuth() {
  const dispatch = useAppDispatch()
  const authState = useAppSelector(state => state.auth)

  useEffect(() => {
    // Connect the Redux store to API client for token management
    apiClient.setStore({ 
      getState: () => ({ auth: authState }),
      dispatch
    })
  }, [authState, dispatch])

  useEffect(() => {
    // Check authentication status on app initialization
    dispatch(checkAuthStatus())
  }, [dispatch])

  return {
    user: authState.user,
    tokens: authState.tokens,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    loginAttempts: authState.loginAttempts,
    lastLoginTime: authState.lastLoginTime,
    pendingVerification: authState.pendingVerification
  }
}

export function useAuthActions() {
  const dispatch = useAppDispatch()

  return {
    login: (credentials: { username: string; password: string }) =>
      dispatch({ type: 'auth/loginUser', payload: credentials }),
    
    signUp: (userData: { 
      username: string; 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string 
    }) => dispatch({ type: 'auth/signUpUser', payload: userData }),
    
    confirmSignUp: (data: { username: string; confirmationCode: string }) =>
      dispatch({ type: 'auth/confirmSignUp', payload: data }),
    
    resendConfirmationCode: (username: string) =>
      dispatch({ type: 'auth/resendConfirmationCode', payload: username }),
    
    forgotPassword: (username: string) =>
      dispatch({ type: 'auth/forgotPassword', payload: { username } }),
    
    resetPassword: (data: { 
      username: string; 
      confirmationCode: string; 
      newPassword: string 
    }) => dispatch({ type: 'auth/resetPassword', payload: data }),
    
    logout: () => dispatch({ type: 'auth/logout' }),
    
    clearError: () => dispatch({ type: 'auth/clearError' }),
    
    clearPendingVerification: () => dispatch({ type: 'auth/clearPendingVerification' })
  }
}