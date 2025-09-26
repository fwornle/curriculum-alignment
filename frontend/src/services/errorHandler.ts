// Error types and interfaces
export interface AppError {
  id: string
  type: ErrorType
  code: string
  message: string
  userMessage: string
  details?: any
  timestamp: number
  context?: ErrorContext
  stack?: string
  retryable: boolean
  severity: ErrorSeverity
}

export type ErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'business'
  | 'system'
  | 'unknown'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  userId?: string
  sessionId: string
  userAgent: string
  url: string
  component?: string
  action?: string
  additionalData?: Record<string, any>
}

export interface ToastNotification {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  title: string
  message: string
  duration?: number
  dismissible: boolean
  actions?: ToastAction[]
}

export interface ToastAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

// Error handler configuration
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  enableToastNotifications: boolean
  remoteLoggingUrl?: string
  maxErrorsInMemory: number
  defaultToastDuration: number
  autoRetryableErrors: boolean
  retryAttempts: number
  retryDelay: number
}

// Toast notification system
class ToastManager {
  private toasts: ToastNotification[] = []
  private listeners: Array<(toasts: ToastNotification[]) => void> = []
  private nextId = 1

  show(notification: Omit<ToastNotification, 'id'>): string {
    const toast: ToastNotification = {
      ...notification,
      id: String(this.nextId++),
      duration: notification.duration ?? 5000
    }

    this.toasts.push(toast)
    this.notifyListeners()

    // Auto-dismiss toast after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id)
      }, toast.duration)
    }

    return toast.id
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
    this.notifyListeners()
  }

  clear(): void {
    this.toasts = []
    this.notifyListeners()
  }

  getToasts(): ToastNotification[] {
    return [...this.toasts]
  }

  subscribe(listener: (toasts: ToastNotification[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getToasts()))
  }
}

// Main error handler class
export class ErrorHandler {
  private config: ErrorHandlerConfig
  private errors: AppError[] = []
  private toastManager = new ToastManager()

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: true,
      enableToastNotifications: true,
      maxErrorsInMemory: 100,
      defaultToastDuration: 5000,
      autoRetryableErrors: false,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    }

    // Global error handling
    this.setupGlobalErrorHandlers()
  }

  // Main error handling method
  handle(error: Error | AppError | any, context?: Partial<ErrorContext>): AppError {
    const appError = this.normalizeError(error, context)
    
    // Store error in memory
    this.addToErrorHistory(appError)

    // Log error
    if (this.config.enableConsoleLogging) {
      this.logToConsole(appError)
    }

    if (this.config.enableRemoteLogging) {
      this.logToRemote(appError).catch(err => 
        console.warn('Failed to log error remotely:', err)
      )
    }

    // Show toast notification
    if (this.config.enableToastNotifications) {
      this.showErrorToast(appError)
    }

    return appError
  }

  // Normalize different error types to AppError
  private normalizeError(error: any, context?: Partial<ErrorContext>): AppError {
    const baseContext: ErrorContext = {
      sessionId: this.generateSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    }

    // If already an AppError, just add context
    if (error.id && error.type) {
      return {
        ...error,
        context: { ...error.context, ...baseContext }
      }
    }

    // Handle different error types
    if (error instanceof TypeError) {
      return this.createAppError(error, 'system', 'TYPE_ERROR', baseContext)
    }

    if (error instanceof ReferenceError) {
      return this.createAppError(error, 'system', 'REFERENCE_ERROR', baseContext)
    }

    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.createAppError(error, 'network', 'NETWORK_ERROR', baseContext)
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        return this.createAppError(error, 'authentication', 'UNAUTHORIZED', baseContext)
      }
      if (status === 403) {
        return this.createAppError(error, 'authorization', 'FORBIDDEN', baseContext)
      }
      if (status >= 400 && status < 500) {
        return this.createAppError(error, 'validation', `CLIENT_ERROR_${status}`, baseContext)
      }
      if (status >= 500) {
        return this.createAppError(error, 'system', `SERVER_ERROR_${status}`, baseContext)
      }
    }

    // Default error
    return this.createAppError(error, 'unknown', 'UNKNOWN_ERROR', baseContext)
  }

  private createAppError(
    error: any, 
    type: ErrorType, 
    code: string, 
    context: ErrorContext
  ): AppError {
    const message = error.message || error.toString() || 'An unexpected error occurred'
    
    return {
      id: this.generateErrorId(),
      type,
      code,
      message,
      userMessage: this.generateUserFriendlyMessage(type, code, message),
      details: error.response?.data || error.details,
      timestamp: Date.now(),
      context,
      stack: error.stack,
      retryable: this.isRetryable(type, code),
      severity: this.getSeverity(type, code)
    }
  }

  private generateUserFriendlyMessage(type: ErrorType, code: string, message: string): string {
    const templates: Record<ErrorType, Record<string, string>> = {
      network: {
        NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
        TIMEOUT: 'The request timed out. Please try again.',
        default: 'Network connection problem. Please try again.'
      },
      authentication: {
        UNAUTHORIZED: 'Your session has expired. Please sign in again.',
        INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
        default: 'Authentication failed. Please sign in again.'
      },
      authorization: {
        FORBIDDEN: 'You don\'t have permission to perform this action.',
        INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation.',
        default: 'Access denied. You don\'t have permission for this action.'
      },
      validation: {
        VALIDATION_ERROR: 'Please check your input and try again.',
        REQUIRED_FIELD: 'Please fill in all required fields.',
        INVALID_FORMAT: 'Please check the format of your input.',
        default: 'Please check your input and try again.'
      },
      business: {
        BUSINESS_RULE_VIOLATION: 'This operation is not allowed at this time.',
        QUOTA_EXCEEDED: 'You have exceeded your usage limit.',
        default: 'Unable to complete the operation due to business rules.'
      },
      system: {
        SERVER_ERROR_500: 'A server error occurred. Our team has been notified.',
        DATABASE_ERROR: 'A temporary issue occurred. Please try again.',
        default: 'A system error occurred. Please try again later.'
      },
      unknown: {
        default: 'An unexpected error occurred. Please try again.'
      }
    }

    const typeTemplates = templates[type] || templates.unknown
    return typeTemplates[code] || typeTemplates.default || message
  }

  private isRetryable(type: ErrorType, code: string): boolean {
    const retryableErrors = {
      network: true,
      system: ['DATABASE_ERROR', 'TIMEOUT', 'SERVER_ERROR_500', 'SERVER_ERROR_502', 'SERVER_ERROR_503'],
      authentication: ['TOKEN_EXPIRED'],
      validation: false,
      authorization: false,
      business: false,
      unknown: false
    }

    const retryable = retryableErrors[type]
    if (typeof retryable === 'boolean') {
      return retryable
    }
    if (Array.isArray(retryable)) {
      return retryable.includes(code)
    }
    return false
  }

  private getSeverity(type: ErrorType, code: string): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      network: 'medium',
      authentication: 'high',
      authorization: 'high',
      validation: 'low',
      business: 'medium',
      system: 'critical',
      unknown: 'medium'
    }

    return severityMap[type] || 'medium'
  }

  private showErrorToast(error: AppError): void {
    const actions: ToastAction[] = []

    // Add retry action for retryable errors
    if (error.retryable && this.config.autoRetryableErrors) {
      actions.push({
        label: 'Retry',
        action: () => {
          // This would be handled by the calling component
          console.log('Retry action triggered for error:', error.id)
        },
        style: 'primary'
      })
    }

    // Add details action for development
    if (process.env.NODE_ENV === 'development') {
      actions.push({
        label: 'Details',
        action: () => {
          console.group(`Error Details: ${error.id}`)
          console.error('Error:', error)
          console.groupEnd()
        },
        style: 'secondary'
      })
    }

    const toastType = error.severity === 'critical' ? 'error' : 'warning'

    this.toastManager.show({
      type: toastType,
      title: 'Error',
      message: error.userMessage,
      duration: error.severity === 'critical' ? 0 : this.config.defaultToastDuration, // Critical errors stay until dismissed
      dismissible: true,
      actions: actions.length > 0 ? actions : undefined
    })
  }

  private logToConsole(error: AppError): void {
    const logLevel = error.severity === 'critical' ? 'error' : 'warn'
    console[logLevel](`[${error.type.toUpperCase()}] ${error.code}:`, {
      id: error.id,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
      stack: error.stack,
      details: error.details
    })
  }

  private async logToRemote(error: AppError): Promise<void> {
    if (!this.config.remoteLoggingUrl) {
      return
    }

    try {
      await fetch(this.config.remoteLoggingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...error,
          timestamp: new Date(error.timestamp).toISOString()
        })
      })
    } catch (loggingError) {
      // Silently fail remote logging to avoid infinite loops
      console.warn('Remote logging failed:', loggingError)
    }
  }

  private addToErrorHistory(error: AppError): void {
    this.errors.unshift(error)

    // Keep only the most recent errors
    if (this.errors.length > this.config.maxErrorsInMemory) {
      this.errors = this.errors.slice(0, this.config.maxErrorsInMemory)
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handle(event.error, {
        component: 'window',
        action: 'global-error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, {
        component: 'window',
        action: 'unhandled-promise-rejection'
      })
    })

    // React error boundaries would catch this
    window.addEventListener('ReactErrorBoundary', (event: any) => {
      this.handle(event.detail.error, {
        component: event.detail.errorInfo?.componentStack,
        action: 'react-error-boundary'
      })
    })
  }

  // Utility methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    // Simple session ID - in production, this would come from auth system
    return sessionStorage.getItem('sessionId') || 
           (() => {
             const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
             sessionStorage.setItem('sessionId', id)
             return id
           })()
  }

  // Public API methods
  getErrorHistory(): AppError[] {
    return [...this.errors]
  }

  clearErrorHistory(): void {
    this.errors = []
  }

  getToastManager(): ToastManager {
    return this.toastManager
  }

  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // Specific error creation helpers
  createNetworkError(message: string, context?: Partial<ErrorContext>): AppError {
    return this.handle(new Error(message), { ...context, component: 'network' })
  }

  createAuthenticationError(message: string, context?: Partial<ErrorContext>): AppError {
    return this.handle({ name: 'AuthenticationError', message }, context)
  }

  createValidationError(message: string, details?: any, context?: Partial<ErrorContext>): AppError {
    return this.handle({ name: 'ValidationError', message, details }, context)
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()

// Export types for use in components
export type { ToastManager }