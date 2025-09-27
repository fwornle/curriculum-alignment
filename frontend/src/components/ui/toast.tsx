import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { errorHandler, ToastNotification } from '../../services/errorHandler'
import { Button } from './button'
import { 
  X, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils.ts'

// Individual toast component
interface ToastProps {
  toast: ToastNotification
  onDismiss: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    if (!toast.dismissible) return
    
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 200) // Animation duration
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getToastClasses = () => {
    const baseClasses = "relative w-full max-w-sm p-4 mb-3 rounded-lg shadow-lg border transition-all duration-200 transform"
    const typeClasses = {
      error: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
      success: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
      info: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
    }
    
    const visibilityClasses = isVisible && !isExiting 
      ? "translate-x-0 opacity-100" 
      : "translate-x-full opacity-0"
    
    return cn(baseClasses, typeClasses[toast.type], visibilityClasses)
  }

  return (
    <div className={getToastClasses()}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {toast.title}
            </h3>
            {toast.dismissible && (
              <button
                onClick={handleDismiss}
                className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {toast.message}
          </p>
          
          {toast.actions && toast.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {toast.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.style === 'primary' ? 'default' : 
                          action.style === 'danger' ? 'destructive' : 'outline'}
                  onClick={() => {
                    action.action()
                    handleDismiss()
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-current opacity-30 rounded-b-lg transition-all ease-linear"
            style={{
              animationName: 'toast-progress',
              animationDuration: `${toast.duration}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards'
            }}
          />
        </div>
      )}
    </div>
  )
}

// Toast container component
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  useEffect(() => {
    const toastManager = errorHandler.getToastManager()
    
    const unsubscribe = toastManager.subscribe((updatedToasts) => {
      setToasts(updatedToasts)
    })

    // Get initial toasts
    setToasts(toastManager.getToasts())

    return unsubscribe
  }, [])

  const handleDismiss = (id: string) => {
    const toastManager = errorHandler.getToastManager()
    toastManager.dismiss(id)
  }

  if (toasts.length === 0) {
    return null
  }

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={handleDismiss}
        />
      ))}
      
      {/* Global styles for toast animations */}
      <style>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>,
    document.body
  )
}

// Hook for using toast notifications
export const useToast = () => {
  const toastManager = errorHandler.getToastManager()

  const showToast = (
    message: string, 
    type: ToastNotification['type'] = 'info',
    options: Partial<Omit<ToastNotification, 'id' | 'message' | 'type'>> = {}
  ) => {
    return toastManager.show({
      type,
      title: options.title || type.charAt(0).toUpperCase() + type.slice(1),
      message,
      duration: options.duration ?? 5000,
      dismissible: options.dismissible ?? true,
      actions: options.actions
    })
  }

  const showError = (message: string, options?: Partial<Omit<ToastNotification, 'id' | 'message' | 'type'>>) => {
    return showToast(message, 'error', options)
  }

  const showWarning = (message: string, options?: Partial<Omit<ToastNotification, 'id' | 'message' | 'type'>>) => {
    return showToast(message, 'warning', options)
  }

  const showSuccess = (message: string, options?: Partial<Omit<ToastNotification, 'id' | 'message' | 'type'>>) => {
    return showToast(message, 'success', options)
  }

  const showInfo = (message: string, options?: Partial<Omit<ToastNotification, 'id' | 'message' | 'type'>>) => {
    return showToast(message, 'info', options)
  }

  const dismiss = (id: string) => {
    toastManager.dismiss(id)
  }

  const dismissAll = () => {
    toastManager.clear()
  }

  return {
    showToast,
    showError,
    showWarning,
    showSuccess,
    showInfo,
    dismiss,
    dismissAll
  }
}