import { useCallback, useRef, useState, useEffect } from 'react'
import { cache } from '../services/cache'

// Types for optimistic updates
export interface OptimisticAction<T, P> {
  type: string
  payload: P
  optimisticUpdate: (currentData: T | null, payload: P) => T
  rollback: (currentData: T, payload: P) => T
}

export interface OptimisticState<T> {
  data: T | null
  optimisticData: T | null
  isOptimistic: boolean
  pendingActions: Array<{ id: string; action: OptimisticAction<T, any> }>
  error: Error | null
}

export interface UseOptimisticReturn<T> {
  data: T | null
  isOptimistic: boolean
  pendingCount: number
  error: Error | null
  
  // Actions
  executeOptimistic: <P>(action: OptimisticAction<T, P>, serverAction: () => Promise<T>) => Promise<T>
  rollback: (actionId?: string) => void
  reset: () => void
}

// Main optimistic hook
export function useOptimistic<T = any>(initialData: T | null = null): UseOptimisticReturn<T> {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    optimisticData: null,
    isOptimistic: false,
    pendingActions: [],
    error: null
  })

  const actionIdCounter = useRef(0)
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const executeOptimistic = useCallback(async <P>(
    action: OptimisticAction<T, P>,
    serverAction: () => Promise<T>
  ): Promise<T> => {
    const actionId = `action_${++actionIdCounter.current}_${Date.now()}`
    
    // Apply optimistic update immediately
    setState(prevState => {
      const currentData = prevState.optimisticData || prevState.data
      const optimisticResult = action.optimisticUpdate(currentData, action.payload)
      
      return {
        ...prevState,
        optimisticData: optimisticResult,
        isOptimistic: true,
        pendingActions: [...prevState.pendingActions, { id: actionId, action: { ...action, payload: action.payload } }],
        error: null
      }
    })

    try {
      // Execute server action
      const result = await serverAction()
      
      // Server action succeeded - update with real data
      setState(prevState => ({
        ...prevState,
        data: result,
        optimisticData: null,
        isOptimistic: false,
        pendingActions: prevState.pendingActions.filter(a => a.id !== actionId),
        error: null
      }))

      // Clear rollback timeout
      const timeout = rollbackTimeouts.current.get(actionId)
      if (timeout) {
        clearTimeout(timeout)
        rollbackTimeouts.current.delete(actionId)
      }

      return result
    } catch (error: any) {
      console.error(`[useOptimistic] Action ${actionId} failed:`, error)
      
      // Server action failed - rollback optimistic update
      setState(prevState => {
        const pendingAction = prevState.pendingActions.find(a => a.id === actionId)
        if (!pendingAction) return prevState

        const currentData = prevState.optimisticData || prevState.data
        const rolledBackData = pendingAction.action.rollback(currentData as T, pendingAction.action.payload)
        
        return {
          ...prevState,
          optimisticData: prevState.pendingActions.length > 1 ? rolledBackData : null,
          isOptimistic: prevState.pendingActions.length > 1,
          pendingActions: prevState.pendingActions.filter(a => a.id !== actionId),
          error
        }
      })

      throw error
    }
  }, [])

  const rollback = useCallback((actionId?: string) => {
    setState(prevState => {
      if (!actionId) {
        // Rollback all actions
        return {
          ...prevState,
          optimisticData: null,
          isOptimistic: false,
          pendingActions: [],
          error: null
        }
      }

      // Rollback specific action
      const actionIndex = prevState.pendingActions.findIndex(a => a.id === actionId)
      if (actionIndex === -1) return prevState

      const updatedActions = [...prevState.pendingActions]
      updatedActions.splice(actionIndex, 1)

      // Reapply remaining optimistic updates
      let currentData = prevState.data
      for (const { action } of updatedActions) {
        currentData = action.optimisticUpdate(currentData, action.payload)
      }

      return {
        ...prevState,
        optimisticData: updatedActions.length > 0 ? currentData : null,
        isOptimistic: updatedActions.length > 0,
        pendingActions: updatedActions
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      optimisticData: null,
      isOptimistic: false,
      pendingActions: [],
      error: null
    }))
    
    // Clear all rollback timeouts
    rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout))
    rollbackTimeouts.current.clear()
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  const finalData = state.optimisticData || state.data

  return {
    data: finalData,
    isOptimistic: state.isOptimistic,
    pendingCount: state.pendingActions.length,
    error: state.error,
    executeOptimistic,
    rollback,
    reset
  }
}

// Specialized hooks for common use cases

// Optimistic list operations
export function useOptimisticList<T extends { id: string | number }>(
  initialList: T[] = []
) {
  const optimistic = useOptimistic<T[]>(initialList)

  const addItem = useCallback(async (
    newItem: Omit<T, 'id'> & { id?: string | number },
    serverAction: () => Promise<T>
  ) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticItem = { ...newItem, id: newItem.id || tempId } as T

    return optimistic.executeOptimistic<T>(
      {
        type: 'ADD_ITEM',
        payload: optimisticItem,
        optimisticUpdate: (currentList, item) => {
          return currentList ? [...currentList, item] : [item]
        },
        rollback: (currentList, item) => {
          return currentList.filter(i => i.id !== item.id)
        }
      },
      async () => {
        const newItem = await serverAction()
        const currentList = optimistic.data || []
        return [...currentList, newItem]
      }
    )
  }, [optimistic])

  const updateItem = useCallback(async (
    itemId: string | number,
    updates: Partial<T>,
    serverAction: () => Promise<T>
  ) => {
    return optimistic.executeOptimistic<{ id: string | number; updates: Partial<T> }>(
      {
        type: 'UPDATE_ITEM',
        payload: { id: itemId, updates },
        optimisticUpdate: (currentList, { id, updates }) => {
          if (!currentList) return null
          return currentList.map(item => 
            item.id === id ? { ...item, ...updates } : item
          )
        },
        rollback: (currentList, { id, updates }) => {
          const originalItem = initialList.find(item => item.id === id)
          if (!originalItem || !currentList) return currentList
          
          return currentList.map(item => 
            item.id === id ? originalItem : item
          )
        }
      },
      async () => {
        const updatedItem = await serverAction()
        const currentList = optimistic.data || []
        return currentList.map(item => 
          item.id === itemId ? updatedItem : item
        )
      }
    )
  }, [optimistic, initialList])

  const removeItem = useCallback(async (
    itemId: string | number,
    serverAction: () => Promise<void>
  ) => {
    const itemToRemove = optimistic.data?.find(item => item.id === itemId)
    if (!itemToRemove) return

    return optimistic.executeOptimistic<{ id: string | number; item: T }>(
      {
        type: 'REMOVE_ITEM',
        payload: { id: itemId, item: itemToRemove },
        optimisticUpdate: (currentList, { id }) => {
          return currentList ? currentList.filter(item => item.id !== id) : null
        },
        rollback: (currentList, { id, item }) => {
          if (!currentList) return [item]
          const index = initialList.findIndex(i => i.id === id)
          if (index === -1) return [...currentList, item]
          
          const newList = [...currentList]
          newList.splice(index, 0, item)
          return newList
        }
      },
      async () => {
        await serverAction()
        return optimistic.data?.filter(item => item.id !== itemId) || []
      }
    )
  }, [optimistic, initialList])

  return {
    ...optimistic,
    addItem,
    updateItem,
    removeItem
  }
}

// Optimistic counter
export function useOptimisticCounter(initialValue: number = 0) {
  const optimistic = useOptimistic<number>(initialValue)

  const increment = useCallback(async (
    amount: number = 1,
    serverAction: () => Promise<number>
  ) => {
    return optimistic.executeOptimistic<number>(
      {
        type: 'INCREMENT',
        payload: amount,
        optimisticUpdate: (current, amount) => (current || 0) + amount,
        rollback: (current, amount) => current - amount
      },
      serverAction
    )
  }, [optimistic])

  const decrement = useCallback(async (
    amount: number = 1,
    serverAction: () => Promise<number>
  ) => {
    return optimistic.executeOptimistic<number>(
      {
        type: 'DECREMENT',
        payload: amount,
        optimisticUpdate: (current, amount) => (current || 0) - amount,
        rollback: (current, amount) => current + amount
      },
      serverAction
    )
  }, [optimistic])

  const setValue = useCallback(async (
    value: number,
    serverAction: () => Promise<number>
  ) => {
    const previousValue = optimistic.data || initialValue
    
    return optimistic.executeOptimistic<{ value: number; previousValue: number }>(
      {
        type: 'SET_VALUE',
        payload: { value, previousValue },
        optimisticUpdate: (_, { value }) => value,
        rollback: (_, { previousValue }) => previousValue
      },
      serverAction
    )
  }, [optimistic, initialValue])

  return {
    ...optimistic,
    increment,
    decrement,
    setValue
  }
}

// Optimistic toggle
export function useOptimisticToggle(initialValue: boolean = false) {
  const optimistic = useOptimistic<boolean>(initialValue)

  const toggle = useCallback(async (serverAction: () => Promise<boolean>) => {
    return optimistic.executeOptimistic<boolean>(
      {
        type: 'TOGGLE',
        payload: !optimistic.data,
        optimisticUpdate: (current) => !current,
        rollback: (current) => !current
      },
      serverAction
    )
  }, [optimistic])

  const setValue = useCallback(async (
    value: boolean,
    serverAction: () => Promise<boolean>
  ) => {
    const previousValue = optimistic.data || initialValue
    
    return optimistic.executeOptimistic<{ value: boolean; previousValue: boolean }>(
      {
        type: 'SET_VALUE',
        payload: { value, previousValue },
        optimisticUpdate: (_, { value }) => value,
        rollback: (_, { previousValue }) => previousValue
      },
      serverAction
    )
  }, [optimistic, initialValue])

  return {
    ...optimistic,
    toggle,
    setValue
  }
}

// Hook that combines caching with optimistic updates
export function useOptimisticCache<T>(
  cacheKey: string,
  fetchData: () => Promise<T>,
  options: {
    ttl?: number
    staleWhileRevalidate?: boolean
  } = {}
) {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const optimistic = useOptimistic<T>()

  const fetchWithCache = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await cache.request<T>(
        cacheKey,
        fetchData,
        staleWhileRevalidate ? 'stale-while-revalidate' : 'cache-first',
        { ttl }
      )
      
      optimistic.reset()
      return result
    } catch (err: any) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [cacheKey, fetchData, ttl, staleWhileRevalidate, optimistic])

  const executeOptimisticUpdate = useCallback(async <P>(
    action: OptimisticAction<T, P>,
    serverAction: () => Promise<T>
  ) => {
    const wrappedServerAction = async () => {
      const result = await serverAction()
      
      // Update cache with new data
      cache.set(cacheKey, result, { ttl })
      
      return result
    }
    
    return optimistic.executeOptimistic(action, wrappedServerAction)
  }, [optimistic, cacheKey, ttl])

  // Load initial data
  useEffect(() => {
    fetchWithCache()
  }, [fetchWithCache])

  return {
    data: optimistic.data,
    isOptimistic: optimistic.isOptimistic,
    isLoading,
    error,
    pendingCount: optimistic.pendingCount,
    executeOptimistic: executeOptimisticUpdate,
    rollback: optimistic.rollback,
    refresh: fetchWithCache,
    reset: optimistic.reset
  }
}