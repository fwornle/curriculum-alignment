import React, { Component, ReactNode } from 'react'
import { errorHandler, AppError } from '../services/errorHandler'
import { Button } from './ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (error: AppError, retry: () => void) => ReactNode
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
}

interface State {
  hasError: boolean
  error: AppError | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Handle the error with our error handler
    const appError = errorHandler.handle(error, {
      component: 'ErrorBoundary',
      action: 'component-error',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: this.props.level || 'component'
      }
    })

    this.setState({
      error: appError,
      errorInfo,
      errorId: appError.id
    })

    // Call custom error handler if provided
    this.props.onError?.(appError, errorInfo)

    // Dispatch custom event for global error handling
    window.dispatchEvent(new CustomEvent('ReactErrorBoundary', {
      detail: { error, errorInfo }
    }))
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry)
      }

      // Default fallback based on level
      return this.renderDefaultFallback()
    }

    return this.props.children
  }

  private renderDefaultFallback() {
    const { level = 'component' } = this.props
    const { error } = this.state

    if (level === 'critical') {
      return this.renderCriticalError()
    }

    if (level === 'page') {
      return this.renderPageError()
    }

    return this.renderComponentError()
  }

  private renderCriticalError() {
    const { error } = this.state

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Application Error
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              A critical error occurred that prevented the application from running properly.
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <div className="text-xs bg-gray-100 dark:bg-gray-700 rounded p-2 mb-4 text-left">
                <p className="font-mono text-red-600 dark:text-red-400">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                    {error.stack.substring(0, 200)}...
                  </pre>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Application
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'} 
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private renderPageError() {
    const { error } = this.state

    return (
      <div className="min-h-96 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow border p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Page Error
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error?.userMessage || error?.message || 'An error occurred while loading this page.'}
            </p>
            
            {process.env.NODE_ENV === 'development' && error?.code && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">
                Error Code: {error.code} | Type: {error.type} | ID: {error.id?.slice(-8)}
              </p>
            )}
            
            <div className="flex space-x-2 justify-center">
              <Button onClick={this.retry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.history.back()} 
                size="sm"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private renderComponentError() {
    const { error } = this.state

    // Get specific error message
    const getErrorMessage = () => {
      if (error?.userMessage) {
        return error.userMessage
      }
      
      if (error?.message) {
        // For development, show the actual error message
        if (process.env.NODE_ENV === 'development') {
          return `Component error: ${error.message}`
        }
        
        // For production, categorize common errors with helpful messages
        if (error.message.includes('Cannot read prop')) {
          return 'Component failed to load due to missing data. Please refresh the page.'
        }
        if (error.message.includes('undefined')) {
          return 'Component failed to load due to missing information. Please try again.'
        }
        if (error.message.includes('fetch')) {
          return 'Failed to load component data. Please check your connection and try again.'
        }
        if (error.message.includes('network')) {
          return 'Network error prevented component from loading. Please try again.'
        }
        
        return `Component error: ${error.message}`
      }
      
      // If we have error type information, use it
      if (error?.type) {
        switch (error.type) {
          case 'network':
            return 'Network connection issue prevented this component from loading.'
          case 'authentication':
            return 'Authentication issue prevented this component from loading. Please sign in again.'
          case 'authorization':
            return 'You don\'t have permission to access this component.'
          case 'validation':
            return 'Invalid data prevented this component from loading.'
          case 'system':
            return 'A system error prevented this component from loading.'
          default:
            return 'An error prevented this component from loading.'
        }
      }
      
      return 'This component encountered an error and could not be displayed.'
    }

    const errorMessage = getErrorMessage()

    return (
      <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Component Error
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              {errorMessage}
            </p>
            
            {process.env.NODE_ENV === 'development' && error?.code && (
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 font-mono">
                Error Code: {error.code} | ID: {error.id?.slice(-8)}
              </p>
            )}
            
            <div className="mt-3 flex space-x-2">
              <button
                onClick={this.retry}
                className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
              >
                Retry
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    console.group('Component Error Details')
                    console.error('Error:', this.state.error)
                    console.error('Error Info:', this.state.errorInfo)
                    console.groupEnd()
                  }}
                  className="text-xs text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded border border-yellow-300 dark:border-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors"
                >
                  <Bug className="w-3 h-3 inline mr-1" />
                  Debug
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for triggering error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // This will trigger the nearest error boundary
    throw error
  }
}