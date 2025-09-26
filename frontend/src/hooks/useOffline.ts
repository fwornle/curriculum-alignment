import { useCallback, useEffect, useState } from 'react'
import { 
  offlineManager, 
  OfflineState, 
  SyncResult,
  isOnline,
  isOffline,
  queueWhenOffline,
  offlineFetch
} from '../services/offlineManager'
import { retryQueue, QueuedOperation, QueueStats } from '../services/retryQueue'

// Hook for offline state management
export interface UseOfflineReturn {
  // Network state
  isOnline: boolean
  isOffline: boolean
  networkState: OfflineState
  offlineDuration: number
  
  // Queue management
  queueStats: QueueStats
  pendingOperations: QueuedOperation[]
  
  // Actions
  forceSync: () => Promise<SyncResult>
  clearOfflineData: () => void
  queueOperation: (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    options?: any
  ) => string
  
  // Utilities
  executeWhenOnline: (callback: () => void) => void
  offlineFetch: typeof offlineFetch
}

export const useOffline = (): UseOfflineReturn => {
  const [networkState, setNetworkState] = useState<OfflineState>(offlineManager.getNetworkState())
  const [queueStats, setQueueStats] = useState<QueueStats>(offlineManager.getQueueStats())
  const [pendingOperations, setPendingOperations] = useState<QueuedOperation[]>([])

  // Update network state
  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((state) => {
      setNetworkState(state)
    })

    return unsubscribe
  }, [])

  // Update queue stats
  useEffect(() => {
    const updateStats = () => {
      setQueueStats(offlineManager.getQueueStats())
      setPendingOperations(retryQueue.getOperationsByStatus('pending'))
    }

    const unsubscribe = retryQueue.subscribe(updateStats)
    updateStats() // Initial load

    return unsubscribe
  }, [])

  const forceSync = useCallback(async (): Promise<SyncResult> => {
    return offlineManager.forceSync()
  }, [])

  const clearOfflineData = useCallback(() => {
    offlineManager.clearOfflineData()
  }, [])

  const queueOperation = useCallback((
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    options?: any
  ) => {
    return queueWhenOffline(endpoint, method, data, options)
  }, [])

  const executeWhenOnline = useCallback((callback: () => void) => {
    if (networkState.isOnline) {
      callback()
    } else {
      const unsubscribe = offlineManager.subscribe((state) => {
        if (state.isOnline) {
          callback()
          unsubscribe()
        }
      })
    }
  }, [networkState.isOnline])

  return {
    // Network state
    isOnline: networkState.isOnline,
    isOffline: !networkState.isOnline,
    networkState,
    offlineDuration: offlineManager.getOfflineDuration(),
    
    // Queue management
    queueStats,
    pendingOperations,
    
    // Actions
    forceSync,
    clearOfflineData,
    queueOperation,
    
    // Utilities
    executeWhenOnline,
    offlineFetch
  }
}

// Hook for offline-aware API requests
export interface UseOfflineAPIReturn<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isOffline: boolean
  isPending: boolean // Queued for later execution
  
  // Actions
  execute: (...args: any[]) => Promise<T>
  retry: () => Promise<T>
  cancel: () => void
}

export function useOfflineAPI<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  options: {
    immediate?: boolean
    data?: any
    headers?: Record<string, string>
    priority?: 'low' | 'normal' | 'high' | 'critical'
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
  } = {}
): UseOfflineAPIReturn<T> {
  const {
    immediate = false,
    data: requestData,
    headers = {},
    priority = 'normal',
    onSuccess,
    onError
  } = options

  const [state, setState] = useState<{
    data: T | null
    error: Error | null
    isLoading: boolean
    isPending: boolean
    operationId: string | null
  }>({
    data: null,
    error: null,
    isLoading: false,
    isPending: false,
    operationId: null
  })

  const { isOffline } = useOffline()

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (isOffline) {
        // Queue for later execution
        const operationId = queueWhenOffline(endpoint, method, requestData || args[0], {
          priority,
          headers,
          metadata: {
            component: 'useOfflineAPI',
            description: `${method} ${endpoint}`,
            onSuccess: (result: T) => {
              setState(prev => ({ ...prev, data: result, isLoading: false, isPending: false }))
              onSuccess?.(result)
            },
            onFailure: (error: any) => {
              setState(prev => ({ ...prev, error, isLoading: false, isPending: false }))
              onError?.(error)
            }
          }
        })

        setState(prev => ({ ...prev, isPending: true, isLoading: false, operationId }))
        
        // Return a promise that will resolve when the operation completes
        return new Promise((resolve, reject) => {
          const checkOperation = () => {
            const operation = retryQueue.getOperation(operationId)
            if (!operation) {
              reject(new Error('Operation not found'))
              return
            }

            if (operation.status === 'completed') {
              resolve({} as T) // Will be handled by onSuccess callback
            } else if (operation.status === 'failed') {
              reject(operation.error || new Error('Operation failed'))
            } else {
              setTimeout(checkOperation, 1000)
            }
          }

          setTimeout(checkOperation, 1000)
        })
      } else {
        // Execute immediately
        const response = await offlineFetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: (requestData || args[0]) ? JSON.stringify(requestData || args[0]) : undefined
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json() as T
        setState(prev => ({ ...prev, data: result, isLoading: false, error: null }))
        onSuccess?.(result)
        
        return result
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error, isLoading: false }))
      onError?.(error)
      throw error
    }
  }, [endpoint, method, requestData, headers, priority, isOffline, onSuccess, onError])

  const retry = useCallback(async (): Promise<T> => {
    if (state.operationId) {
      return retryQueue.processOperation(state.operationId) as any
    }
    return execute()
  }, [state.operationId, execute])

  const cancel = useCallback(() => {
    if (state.operationId) {
      retryQueue.cancel(state.operationId)
      setState(prev => ({ ...prev, isPending: false, isLoading: false, operationId: null }))
    }
  }, [state.operationId])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isOffline,
    isPending: state.isPending,
    
    execute,
    retry,
    cancel
  }
}

// Hook for offline-aware form submissions
export function useOfflineSubmit<T = any, P = any>(
  submitEndpoint: string,
  options: {
    method?: 'POST' | 'PUT' | 'PATCH'
    priority?: 'low' | 'normal' | 'high' | 'critical'
    optimisticUpdate?: (data: P) => T
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
  } = {}
) {
  const {
    method = 'POST',
    priority = 'normal',
    optimisticUpdate,
    onSuccess,
    onError
  } = options

  const [state, setState] = useState<{
    isSubmitting: boolean
    error: Error | null
    optimisticData: T | null
  }>({
    isSubmitting: false,
    error: null,
    optimisticData: null
  })

  const { isOffline } = useOffline()

  const submit = useCallback(async (data: P): Promise<T> => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }))

    try {
      // Apply optimistic update if provided
      let optimisticResult: T | null = null
      if (optimisticUpdate) {
        optimisticResult = optimisticUpdate(data)
        setState(prev => ({ ...prev, optimisticData: optimisticResult }))
        
        // Store optimistic update in offline manager
        const updateKey = `${submitEndpoint}_${Date.now()}`
        offlineManager.addOptimisticUpdate(updateKey, optimisticResult)
      }

      if (isOffline) {
        // Queue for later execution
        queueWhenOffline(submitEndpoint, method, data, {
          priority,
          metadata: {
            component: 'useOfflineSubmit',
            description: `Submit ${method} ${submitEndpoint}`,
            onSuccess: (result: T) => {
              setState(prev => ({ ...prev, isSubmitting: false, optimisticData: null }))
              onSuccess?.(result)
            },
            onFailure: (error: any) => {
              setState(prev => ({ ...prev, error, isSubmitting: false, optimisticData: null }))
              onError?.(error)
            }
          }
        })

        setState(prev => ({ ...prev, isSubmitting: false }))
        
        // Return optimistic result or empty object
        return optimisticResult || ({} as T)
      } else {
        // Submit immediately
        const response = await offlineFetch(submitEndpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json() as T
        setState(prev => ({ ...prev, isSubmitting: false, optimisticData: null, error: null }))
        onSuccess?.(result)
        
        return result
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error, isSubmitting: false, optimisticData: null }))
      onError?.(error)
      throw error
    }
  }, [submitEndpoint, method, priority, optimisticUpdate, isOffline, onSuccess, onError])

  return {
    submit,
    isSubmitting: state.isSubmitting,
    error: state.error,
    optimisticData: state.optimisticData,
    isOffline
  }
}

// Hook for monitoring sync status
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState({
    isSync: false,
    lastSyncAt: null as number | null,
    pendingCount: 0
  })

  const { queueStats, forceSync } = useOffline()

  useEffect(() => {
    setSyncStatus(prev => ({
      ...prev,
      pendingCount: queueStats.pending,
      isSync: queueStats.processing > 0
    }))
  }, [queueStats])

  const performSync = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, isSync: true }))
    
    try {
      const result = await forceSync()
      setSyncStatus(prev => ({ 
        ...prev, 
        isSync: false, 
        lastSyncAt: Date.now() 
      }))
      return result
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSync: false }))
      throw error
    }
  }, [forceSync])

  return {
    ...syncStatus,
    sync: performSync
  }
}