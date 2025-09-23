import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (e.g., Sentry)
      this.logErrorToService(error, errorInfo)
    }

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Implement error logging service integration
    // Example: Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    // Send to API endpoint
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(err => console.error('Failed to log error:', err))
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    
    // Optionally reload the page if errors persist
    if (this.state.errorCount > 2) {
      window.location.reload()
    }
  }

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    window.location.href = '/'
  }

  handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Unknown Error'}`)
    const body = encodeURIComponent(`
Error Details:
--------------
Message: ${this.state.error?.message}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Stack Trace:
${this.state.error?.stack}

Component Stack:
${this.state.errorInfo?.componentStack}

Steps to Reproduce:
1. 
2. 
3. 

Expected Behavior:


Actual Behavior:


Additional Context:

    `)
    
    window.open(`mailto:support@ceu.edu?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full academic-card">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-red-50">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl academic-header">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription>
                We encountered an unexpected error. Our team has been notified.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-sm text-red-900 mb-2">
                    Error Details (Development Mode)
                  </h3>
                  <p className="text-sm text-red-800 font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer hover:underline">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                  {this.state.errorInfo && (
                    <details className="text-xs text-red-700 mt-2">
                      <summary className="cursor-pointer hover:underline">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReportBug}
                  className="flex-1"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report Bug
                </Button>
              </div>

              {/* Additional Help Text */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>
                  If this problem persists, please contact support at{' '}
                  <a 
                    href="mailto:support@ceu.edu" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    support@ceu.edu
                  </a>
                </p>
                <p className="mt-1 text-xs">
                  Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    throwError: setError,
    clearError: () => setError(null)
  }
}