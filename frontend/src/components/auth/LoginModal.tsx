import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { loginUser, signUpUser, confirmSignUp, resendConfirmationCode, setPendingVerification, clearPendingVerification } from '../../store/slices/authSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { User, Mail, Lock, AlertCircle, LogIn, UserPlus, Github } from 'lucide-react'
import { cn } from "@/lib/utils"
import { cognitoService } from '../../services/auth/cognitoService'

export const LoginModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const { pendingVerification, isLoading, error } = useAppSelector(state => state.auth)
  const [isRegister, setIsRegister] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const isOpen = modals.login

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }))
      setRememberMe(true)
    }
  }, [])

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({})
      setVerificationCode('')
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (isRegister) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required'
      }
      
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required'
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVerificationCode = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Please enter the 6-digit verification code' })
      return false
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setErrors({ code: 'Verification code must be 6 digits' })
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // Always save email if "Remember me" is checked, even before attempting login
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', formData.email)
    } else {
      localStorage.removeItem('rememberedEmail')
    }
    
    try {
      if (isRegister) {
        // Sign up with Cognito using separate first/last names
        await dispatch(signUpUser({
          username: formData.email,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim()
        })).unwrap()
        
        // Don't close modal - user needs to verify email
        // pendingVerification will be set in Redux, UI will switch to verification step
        setErrors({})
      } else {
        // Sign in with Cognito
        await dispatch(loginUser({
          username: formData.email,
          password: formData.password
        })).unwrap()
        
        dispatch(closeModal('login'))
        handleClose()
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Check for unverified user and automatically switch to verification mode
      if (error.includes('not been verified') || 
          error.includes('UserNotConfirmedException') || 
          error.includes('CONFIRM_SIGN_UP') ||
          error.includes('Additional steps required')) {
        
        // Set up pending verification state to show verification UI
        dispatch(setPendingVerification({
          username: formData.email,
          email: formData.email
        }))
        
        // Trigger resend of verification code
        try {
          await dispatch(resendConfirmationCode(formData.email)).unwrap()
          setErrors({ 
            form: 'Your email is not verified. We\'ve sent a new 6-digit verification code to your email. Please check your inbox and enter it below.' 
          })
        } catch (resendError: any) {
          setErrors({ 
            form: 'Your email is not verified. Please check your inbox for a verification code or sign up again.' 
          })
        }
      } else if (error.includes('Invalid email or password') || 
                 error.includes('NotAuthorizedException')) {
        setErrors({ 
          form: 'Invalid email or password. Please check your credentials and try again.' 
        })
      } else if (error.includes('No account found') || 
                 error.includes('UserNotFoundException')) {
        setErrors({ 
          form: 'No account found with this email address. Please sign up first.' 
        })
      } else {
        // Use the actual error message from the service
        setErrors({ 
          form: error || 'Authentication failed. Please try again.' 
        })
      }
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateVerificationCode() || !pendingVerification) {
      return
    }
    
    try {
      // First, confirm the signup
      await dispatch(confirmSignUp({
        username: pendingVerification.username,
        confirmationCode: verificationCode
      })).unwrap()
      
      // Success! Now automatically sign in the user
      setErrors({})
      setVerificationCode('')
      
      // Auto-login with stored credentials
      if (formData.password) {
        try {
          await dispatch(loginUser({
            username: pendingVerification.username,
            password: formData.password
          })).unwrap()
          
          // Save email if remember me was checked
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', pendingVerification.email)
          }
          
          dispatch(closeModal('login'))
          handleClose()
        } catch (loginError: any) {
          // If auto-login fails, show message to manually sign in
          setErrors({ 
            form: 'Email verified! Please sign in with your credentials.' 
          })
          // Clear verification state to go back to login form
          dispatch(clearPendingVerification())
          setIsRegister(false)
        }
      } else {
        // No password stored, user needs to manually sign in
        setErrors({ 
          form: 'Email verified successfully! Please sign in with your credentials.' 
        })
        dispatch(clearPendingVerification())
        setIsRegister(false)
      }
      
    } catch (error: any) {
      setErrors({ 
        code: error || 'Verification failed. Please try again.' 
      })
    }
  }

  const handleResendCode = async () => {
    if (!pendingVerification) return
    
    try {
      await dispatch(resendConfirmationCode(pendingVerification.username)).unwrap()
      setErrors({})
      alert('Verification code sent to your email!')
    } catch (error: any) {
      setErrors({ 
        form: error || 'Failed to resend verification code.' 
      })
    }
  }

  const handleClose = () => {
    dispatch(closeModal('login'))
    
    // Keep remembered email if "Remember me" was previously enabled
    const shouldKeepEmail = localStorage.getItem('rememberedEmail')
    setFormData({
      email: shouldKeepEmail || '',
      password: '',
      firstName: '',
      lastName: '',
      confirmPassword: ''
    })
    setRememberMe(!!shouldKeepEmail)
    setErrors({})
    setVerificationCode('')
    setIsRegister(false)
  }

  const handleBackToSignup = () => {
    dispatch(clearPendingVerification())
    setVerificationCode('')
    setErrors({})
    setIsRegister(true)
  }

  const handleFederatedLogin = async (provider: 'Google' | 'GitHub' | 'Facebook') => {
    try {
      setErrors({})
      await cognitoService.signInWithProvider(provider)
      // The redirect will happen automatically
    } catch (error: any) {
      setErrors({
        form: `Failed to sign in with ${provider}: ${error.message}`
      })
    }
  }

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we're returning from OAuth redirect
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('code') || window.location.hash.includes('access_token')) {
        try {
          const result = await cognitoService.handleAuthCallback()
          if (result) {
            // Successfully authenticated via OAuth
            dispatch(closeModal('login'))
            handleClose()
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (error: any) {
          console.error('OAuth callback error:', error)
          setErrors({
            form: 'Authentication failed. Please try again.'
          })
        }
      }
    }

    if (isOpen) {
      handleOAuthCallback()
    }
  }, [isOpen, dispatch])

  if (!isOpen) return null

  // Show verification step if pendingVerification exists
  if (pendingVerification) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl text-white">
                <Mail className="h-5 w-5" />
              </div>
              Verify Your Email
            </CardTitle>
            <CardDescription>
              We sent a 6-digit verification code to {pendingVerification.email}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleVerificationSubmit}>
            <CardContent className="space-y-4">
              {(errors.form || errors.code) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.form || errors.code}
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest",
                    errors.code ? "border-red-500" : "border-gray-300"
                  )}
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the 6-digit code from your email
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
              
              <div className="flex items-center justify-between w-full text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Back to Sign Up
                </button>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // Normal login/signup flow
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl text-white">
              {isRegister ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            </div>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isRegister 
              ? 'Sign up to access CEU-it' 
              : 'Sign in to your account to continue'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errors.form && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {errors.form}
                </p>
              </div>
            )}
            
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={cn(
                        "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                        errors.firstName ? "border-red-500" : "border-gray-300"
                      )}
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={cn(
                        "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                        errors.lastName ? "border-red-500" : "border-gray-300"
                      )}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={cn(
                    "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.email ? "border-red-500" : "border-gray-300"
                  )}
                  placeholder="user@ceu.edu"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={cn(
                    "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.password ? "border-red-500" : "border-gray-300"
                  )}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>
            
            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={cn(
                      "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    )}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}
            
            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (isRegister ? 'Creating Account...' : 'Signing In...') : (isRegister ? 'Create Account' : 'Sign In')}
            </Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">OR</span>
              </div>
            </div>
            
            {/* Federated Login Buttons */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50"
                onClick={() => handleFederatedLogin('Google')}
                disabled={isLoading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => handleFederatedLogin('GitHub')}
                disabled={isLoading}
              >
                <Github className="w-4 h-4" />
                Continue with GitHub
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                onClick={() => handleFederatedLogin('Facebook')}
                disabled={isLoading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>
            </div>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">OR</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}