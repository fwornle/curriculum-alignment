import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeModal } from '../../store/slices/uiSlice'
import { loginUser, signUpUser } from '../../store/slices/authSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { User, Mail, Lock, AlertCircle, LogIn, UserPlus } from 'lucide-react'
import { cn } from '../../lib/utils'

export const LoginModal: React.FC = () => {
  const dispatch = useAppDispatch()
  const { modals } = useAppSelector(state => state.ui)
  const [isRegister, setIsRegister] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
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
      if (!formData.name) {
        newErrors.name = 'Name is required'
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      if (isRegister) {
        // Sign up with Cognito
        await dispatch(signUpUser({
          username: formData.email,
          email: formData.email,
          password: formData.password,
          given_name: formData.name?.split(' ')[0] || '',
          family_name: formData.name?.split(' ').slice(1).join(' ') || ''
        })).unwrap()
        
        // Don't close modal yet - user needs to verify email
        setErrors({})
      } else {
        // Sign in with Cognito
        await dispatch(loginUser({
          username: formData.email,
          password: formData.password
        })).unwrap()
        
        // Handle "Remember me" functionality
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }
        
        dispatch(closeModal('login'))
        
        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          confirmPassword: ''
        })
        setRememberMe(false)
        setErrors({})
      }
    } catch (error: any) {
      setErrors({ 
        form: error || 'Authentication failed. Please try again.' 
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
      name: '',
      confirmPassword: ''
    })
    setRememberMe(!!shouldKeepEmail)
    setErrors({})
    setIsRegister(false)
  }

  if (!isOpen) return null

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
              ? 'Sign up to access the Curriculum Alignment System' 
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
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={cn(
                      "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                      errors.name ? "border-red-500" : "border-gray-300"
                    )}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
            
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