import { useCallback, useEffect, useRef, useState } from 'react'
import { errorHandler, AppError } from '../services/errorHandler'

// Types for async operations
export interface AsyncState<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isIdle: boolean
}

export interface AsyncOptions {
  immediate?: boolean
  retryAttempts?: number
  retryDelay?: number
  onSuccess?: (data: any) => void
  onError?: (error: AppError) => void
  context?: Record<string, any>
}

export interface UseAsyncReturn<T> {
  // State
  data: T | null
  error: AppError | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isIdle: boolean
  
  // Actions
  execute: (...args: any[]) => Promise<T>
  reset: () => void
  cancel: () => void
}

// Main useAsync hook
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: AsyncOptions = {}
): UseAsyncReturn<T> {
  const {
    immediate = false,
    retryAttempts = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    context = {}
  } = options

  // State
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    isIdle: true
  })

  // Refs for cleanup and cancellation
  const cancelRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(true)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset state
  const reset = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isIdle: true
    })
  }, [])

  // Cancel operation
  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isIdle: true
      }))
    }
  }, [])

  // Execute async function with retry logic
  const execute = useCallback(async (...args: any[]): Promise<T> => {
    // Cancel any previous operation
    cancel()

    let isCancelled = false
    cancelRef.current = () => {
      isCancelled = true
    }

    // Set loading state
    if (mountedRef.current) {
      setState({
        data: null,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
        isIdle: false
      })
    }

    const executeWithRetry = async (attempt: number = 0): Promise<T> => {
      try {
        if (isCancelled || !mountedRef.current) {
          throw new Error('Operation cancelled')
        }

        const result = await asyncFunction(...args)

        if (isCancelled || !mountedRef.current) {
          throw new Error('Operation cancelled')
        }

        // Success
        setState({
          data: result,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
          isIdle: false
        })

        onSuccess?.(result)
        return result

      } catch (err: any) {
        if (isCancelled || !mountedRef.current) {
          throw new Error('Operation cancelled')
        }

        // Handle error
        const appError = errorHandler.handle(err, {
          component: 'useAsync',
          action: 'async-operation',
          additionalData: {
            attempt: attempt + 1,
            maxAttempts: retryAttempts + 1,
            ...context
          }
        })

        // Check if we should retry
        const shouldRetry = attempt < retryAttempts && appError.retryable
        
        if (shouldRetry) {
          console.log(`Retrying async operation (attempt ${attempt + 2}/${retryAttempts + 1})`)
          
          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(async () => {
              try {
                const result = await executeWithRetry(attempt + 1)
                resolve(result)
              } catch (retryError) {
                reject(retryError)
              }
            }, retryDelay * Math.pow(2, attempt)) // Exponential backoff
          })
        }

        // No more retries or not retryable
        if (mountedRef.current) {
          setState({
            data: null,
            error: appError,
            isLoading: false,
            isError: true,
            isSuccess: false,
            isIdle: false
          })
        }

        onError?.(appError)
        throw appError
      }
    }

    return executeWithRetry()
  }, [asyncFunction, retryAttempts, retryDelay, onSuccess, onError, context, cancel])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      cancel()
    }
  }, [cancel])

  return {
    // State
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isError: state.isError,
    isSuccess: state.isSuccess,
    isIdle: state.isIdle,
    
    // Actions
    execute,
    reset,
    cancel
  }
}

// Specialized hook for data fetching
export function useFetch<T = any>(
  url: string | null,
  options: RequestInit & AsyncOptions = {}
): UseAsyncReturn<T> {
  const { immediate = true, ...asyncOptions } = options
  
  const fetchData = useCallback(async (): Promise<T> => {
    if (!url) {
      throw new Error('URL is required for fetch operation')
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  }, [url, options])

  return useAsync<T>(fetchData, { 
    immediate: immediate && !!url, 
    context: { url },
    ...asyncOptions 
  })
}

// Hook for handling form submissions
export function useAsyncSubmission<TData = any, TPayload = any>(
  submitFunction: (payload: TPayload) => Promise<TData>,
  options: AsyncOptions = {}
): UseAsyncReturn<TData> & {
  submit: (payload: TPayload) => Promise<TData>
} {
  const asyncState = useAsync<TData>(submitFunction, {
    ...options,
    immediate: false // Never execute immediately for form submissions
  })

  const submit = useCallback(async (payload: TPayload): Promise<TData> => {
    return asyncState.execute(payload)
  }, [asyncState.execute])

  return {
    ...asyncState,
    submit
  }
}

// Hook for handling async operations with optimistic updates
export function useOptimisticAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  optimisticUpdate: (data: T | null, ...args: any[]) => T,
  options: AsyncOptions = {}
): UseAsyncReturn<T> & {
  executeOptimistically: (...args: any[]) => Promise<T>
} {
  const asyncState = useAsync<T>(asyncFunction, options)
  const [optimisticData, setOptimisticData] = useState<T | null>(null)

  const executeOptimistically = useCallback(async (...args: any[]): Promise<T> => {
    // Apply optimistic update immediately
    const optimisticResult = optimisticUpdate(asyncState.data, ...args)
    setOptimisticData(optimisticResult)

    try {
      const result = await asyncState.execute(...args)
      setOptimisticData(null) // Clear optimistic data on success
      return result
    } catch (error) {
      setOptimisticData(null) // Revert optimistic data on error
      throw error
    }
  }, [asyncFunction, optimisticUpdate, asyncState.data, asyncState.execute])

  // Override data to show optimistic data when available
  const data = optimisticData !== null ? optimisticData : asyncState.data

  return {
    ...asyncState,
    data,
    executeOptimistically
  }
}

// Hook for handling multiple async operations in sequence
export function useAsyncSequence<T = any>(
  asyncFunctions: Array<(...args: any[]) => Promise<T>>,
  options: AsyncOptions = {}
): UseAsyncReturn<T[]> & {
  executeSequence: (...args: any[]) => Promise<T[]>
} {
  const executeSequence = useCallback(async (...args: any[]): Promise<T[]> => {
    const results: T[] = []
    
    for (let i = 0; i < asyncFunctions.length; i++) {
      const result = await asyncFunctions[i](...args)
      results.push(result)
    }
    
    return results
  }, [asyncFunctions])

  const asyncState = useAsync<T[]>(executeSequence, {
    ...options,
    immediate: false
  })

  return {
    ...asyncState,
    executeSequence: asyncState.execute
  }
}

// Hook for handling parallel async operations
export function useAsyncParallel<T = any>(
  asyncFunctions: Array<(...args: any[]) => Promise<T>>,
  options: AsyncOptions = {}
): UseAsyncReturn<T[]> & {
  executeParallel: (...args: any[]) => Promise<T[]>
} {
  const executeParallel = useCallback(async (...args: any[]): Promise<T[]> => {
    const promises = asyncFunctions.map(fn => fn(...args))
    return Promise.all(promises)
  }, [asyncFunctions])

  const asyncState = useAsync<T[]>(executeParallel, {
    ...options,
    immediate: false
  })

  return {
    ...asyncState,
    executeParallel: asyncState.execute
  }
}

// Hook for handling async operations with caching
export function useCachedAsync<T = any>(
  cacheKey: string,
  asyncFunction: (...args: any[]) => Promise<T>,
  options: AsyncOptions & {
    cacheTimeout?: number
    staleWhileRevalidate?: boolean
  } = {}
): UseAsyncReturn<T> {
  const { cacheTimeout = 5 * 60 * 1000, staleWhileRevalidate = false, ...asyncOptions } = options
  
  const getCacheKey = (args: any[]) => `${cacheKey}:${JSON.stringify(args)}`
  
  const cachedAsyncFunction = useCallback(async (...args: any[]): Promise<T> => {
    const key = getCacheKey(args)
    const cached = sessionStorage.getItem(key)
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const isExpired = Date.now() - timestamp > cacheTimeout
      
      if (!isExpired) {
        return data
      }
      
      if (staleWhileRevalidate) {
        // Return stale data immediately, but trigger refresh in background
        setTimeout(async () => {
          try {
            const freshData = await asyncFunction(...args)
            sessionStorage.setItem(key, JSON.stringify({
              data: freshData,
              timestamp: Date.now()
            }))
          } catch (error) {
            console.warn('Background cache refresh failed:', error)
          }
        }, 0)
        
        return data
      }
    }
    
    // Fetch fresh data
    const result = await asyncFunction(...args)
    
    // Cache the result
    sessionStorage.setItem(key, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }))
    
    return result
  }, [cacheKey, asyncFunction, cacheTimeout, staleWhileRevalidate])

  return useAsync<T>(cachedAsyncFunction, asyncOptions)
}