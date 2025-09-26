import { errorHandler, AppError } from './errorHandler'

// Types for queued operations
export interface QueuedOperation {
  id: string
  type: OperationType
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  headers?: Record<string, string>
  metadata: OperationMetadata
  timestamp: number
  attempts: number
  maxAttempts: number
  nextRetry: number
  priority: OperationPriority
  status: OperationStatus
  error?: AppError
}

export type OperationType = 
  | 'api-request'
  | 'file-upload'
  | 'settings-sync'
  | 'analysis-request'
  | 'document-processing'
  | 'user-action'

export type OperationPriority = 'low' | 'normal' | 'high' | 'critical'
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface OperationMetadata {
  userId?: string
  component: string
  description: string
  originalTimestamp: number
  dependencies?: string[] // IDs of operations this depends on
  onSuccess?: (result: any) => void
  onFailure?: (error: AppError) => void
  optimisticUpdate?: any
}

export interface RetryStrategy {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  jitter: boolean
}

export interface QueueStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  oldestPending?: number
  queuedDataSize: number
}

// Retry queue implementation
class RetryQueue {
  private queue: Map<string, QueuedOperation> = new Map()
  private processing: Set<string> = new Set()
  private maxQueueSize = 1000
  private persistenceKey = 'curriculum-alignment-retry-queue'
  private processInterval: NodeJS.Timeout | null = null
  private listeners: Array<(stats: QueueStats) => void> = []
  
  // Default retry strategies by operation type
  private defaultStrategies: Record<OperationType, RetryStrategy> = {
    'api-request': {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true
    },
    'file-upload': {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffFactor: 2,
      jitter: true
    },
    'settings-sync': {
      maxAttempts: 10,
      baseDelay: 5000,
      maxDelay: 120000,
      backoffFactor: 1.5,
      jitter: true
    },
    'analysis-request': {
      maxAttempts: 3,
      baseDelay: 3000,
      maxDelay: 90000,
      backoffFactor: 2,
      jitter: false
    },
    'document-processing': {
      maxAttempts: 3,
      baseDelay: 5000,
      maxDelay: 180000,
      backoffFactor: 2,
      jitter: false
    },
    'user-action': {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 15000,
      backoffFactor: 2,
      jitter: true
    }
  }

  constructor() {
    this.loadFromStorage()
    this.startProcessing()
    
    // Save queue periodically and on page unload
    setInterval(() => this.saveToStorage(), 30000) // Every 30 seconds
    window.addEventListener('beforeunload', () => this.saveToStorage())
  }

  // Add operation to queue
  enqueue(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data: any = null,
    options: {
      type?: OperationType
      priority?: OperationPriority
      metadata?: Partial<OperationMetadata>
      customRetryStrategy?: Partial<RetryStrategy>
      headers?: Record<string, string>
    } = {}
  ): string {
    const {
      type = 'api-request',
      priority = 'normal',
      metadata = {},
      customRetryStrategy = {},
      headers = {}
    } = options

    const strategy = { ...this.defaultStrategies[type], ...customRetryStrategy }
    const operationId = this.generateId()

    const operation: QueuedOperation = {
      id: operationId,
      type,
      endpoint,
      method,
      data,
      headers,
      metadata: {
        component: metadata.component || 'unknown',
        description: metadata.description || `${method} ${endpoint}`,
        originalTimestamp: Date.now(),
        ...metadata
      },
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: strategy.maxAttempts,
      nextRetry: Date.now(),
      priority,
      status: 'pending',
    }

    // Check queue size limit
    if (this.queue.size >= this.maxQueueSize) {
      this.cleanupOldOperations()
    }

    this.queue.set(operationId, operation)
    this.notifyListeners()
    
    console.log(`[RetryQueue] Enqueued ${type} operation: ${operationId}`)
    
    return operationId
  }

  // Process a specific operation
  async processOperation(operationId: string): Promise<boolean> {
    const operation = this.queue.get(operationId)
    if (!operation || this.processing.has(operationId)) {
      return false
    }

    // Check if it's time to retry
    if (Date.now() < operation.nextRetry) {
      return false
    }

    // Check dependencies
    if (operation.metadata.dependencies) {
      const dependenciesResolved = operation.metadata.dependencies.every(depId => {
        const dep = this.queue.get(depId)
        return !dep || dep.status === 'completed'
      })

      if (!dependenciesResolved) {
        return false
      }
    }

    this.processing.add(operationId)
    operation.status = 'processing'
    operation.attempts++

    console.log(`[RetryQueue] Processing operation ${operationId} (attempt ${operation.attempts}/${operation.maxAttempts})`)

    try {
      const result = await this.executeOperation(operation)
      
      // Success
      operation.status = 'completed'
      operation.metadata.onSuccess?.(result)
      
      console.log(`[RetryQueue] Operation ${operationId} completed successfully`)
      
      this.processing.delete(operationId)
      this.notifyListeners()
      
      return true

    } catch (error: any) {
      console.error(`[RetryQueue] Operation ${operationId} failed:`, error)
      
      const appError = errorHandler.handle(error, {
        component: 'RetryQueue',
        action: 'process-operation',
        additionalData: {
          operationId,
          operationType: operation.type,
          attempt: operation.attempts,
          maxAttempts: operation.maxAttempts
        }
      })

      operation.error = appError

      // Check if we should retry
      if (operation.attempts < operation.maxAttempts && appError.retryable) {
        // Calculate next retry time with exponential backoff
        const strategy = this.defaultStrategies[operation.type]
        const delay = Math.min(
          strategy.baseDelay * Math.pow(strategy.backoffFactor, operation.attempts - 1),
          strategy.maxDelay
        )

        // Add jitter if enabled
        const jitter = strategy.jitter ? Math.random() * 0.1 * delay : 0
        operation.nextRetry = Date.now() + delay + jitter
        operation.status = 'pending'

        console.log(`[RetryQueue] Will retry operation ${operationId} in ${Math.round((delay + jitter) / 1000)}s`)
      } else {
        // No more retries
        operation.status = 'failed'
        operation.metadata.onFailure?.(appError)
        
        console.log(`[RetryQueue] Operation ${operationId} failed permanently`)
      }

      this.processing.delete(operationId)
      this.notifyListeners()
      
      return false
    }
  }

  // Execute the actual HTTP request
  private async executeOperation(operation: QueuedOperation): Promise<any> {
    const url = operation.endpoint.startsWith('http') 
      ? operation.endpoint 
      : `${window.location.origin}/api${operation.endpoint}`

    const config: RequestInit = {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers
      }
    }

    if (operation.data && ['POST', 'PUT', 'PATCH'].includes(operation.method)) {
      config.body = JSON.stringify(operation.data)
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    
    return response.text()
  }

  // Start processing queue
  private startProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval)
    }

    this.processInterval = setInterval(async () => {
      await this.processQueue()
    }, 2000) // Check every 2 seconds
  }

  // Process all ready operations
  async processQueue(): Promise<void> {
    const readyOperations = Array.from(this.queue.values())
      .filter(op => 
        op.status === 'pending' && 
        Date.now() >= op.nextRetry &&
        !this.processing.has(op.id)
      )
      .sort((a, b) => {
        // Sort by priority and then by timestamp
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.timestamp - b.timestamp
      })

    // Process operations concurrently (up to 3 at a time)
    const maxConcurrent = 3
    const promises = readyOperations
      .slice(0, maxConcurrent)
      .map(op => this.processOperation(op.id))

    if (promises.length > 0) {
      await Promise.allSettled(promises)
    }
  }

  // Cancel operation
  cancel(operationId: string): boolean {
    const operation = this.queue.get(operationId)
    if (!operation || operation.status === 'completed') {
      return false
    }

    operation.status = 'cancelled'
    this.processing.delete(operationId)
    this.notifyListeners()
    
    console.log(`[RetryQueue] Cancelled operation ${operationId}`)
    return true
  }

  // Remove operation from queue
  remove(operationId: string): boolean {
    const removed = this.queue.delete(operationId)
    this.processing.delete(operationId)
    
    if (removed) {
      this.notifyListeners()
      console.log(`[RetryQueue] Removed operation ${operationId}`)
    }
    
    return removed
  }

  // Get operation status
  getOperation(operationId: string): QueuedOperation | null {
    return this.queue.get(operationId) || null
  }

  // Get all operations
  getAllOperations(): QueuedOperation[] {
    return Array.from(this.queue.values())
  }

  // Get operations by status
  getOperationsByStatus(status: OperationStatus): QueuedOperation[] {
    return Array.from(this.queue.values()).filter(op => op.status === status)
  }

  // Clear all operations
  clear(): void {
    this.queue.clear()
    this.processing.clear()
    this.notifyListeners()
    console.log('[RetryQueue] Cleared all operations')
  }

  // Clear completed operations
  clearCompleted(): void {
    const completed = Array.from(this.queue.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([id, _]) => id)

    completed.forEach(id => this.queue.delete(id))
    
    if (completed.length > 0) {
      this.notifyListeners()
      console.log(`[RetryQueue] Cleared ${completed.length} completed operations`)
    }
  }

  // Get queue statistics
  getStats(): QueueStats {
    const operations = Array.from(this.queue.values())
    const stats: QueueStats = {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      processing: operations.filter(op => op.status === 'processing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      queuedDataSize: this.calculateQueueSize()
    }

    const pendingOperations = operations.filter(op => op.status === 'pending')
    if (pendingOperations.length > 0) {
      stats.oldestPending = Math.min(...pendingOperations.map(op => op.timestamp))
    }

    return stats
  }

  // Subscribe to queue changes
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Utility methods
  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateQueueSize(): number {
    let size = 0
    this.queue.forEach(operation => {
      size += JSON.stringify(operation).length
    })
    return size
  }

  private cleanupOldOperations(): void {
    const operations = Array.from(this.queue.entries())
      .filter(([_, op]) => op.status === 'completed' || op.status === 'failed')
      .sort(([_, a], [__, b]) => a.timestamp - b.timestamp)

    // Remove oldest 20% of completed/failed operations
    const toRemove = Math.ceil(operations.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.queue.delete(operations[i][0])
    }

    console.log(`[RetryQueue] Cleaned up ${toRemove} old operations`)
  }

  private notifyListeners(): void {
    const stats = this.getStats()
    this.listeners.forEach(listener => {
      try {
        listener(stats)
      } catch (error) {
        console.error('Error in queue listener:', error)
      }
    })
  }

  // Persistence
  private saveToStorage(): void {
    try {
      const operations = Array.from(this.queue.entries()).map(([id, operation]) => [id, {
        ...operation,
        // Don't persist functions
        metadata: {
          ...operation.metadata,
          onSuccess: undefined,
          onFailure: undefined
        }
      }])
      
      localStorage.setItem(this.persistenceKey, JSON.stringify(operations))
    } catch (error) {
      console.warn('Failed to save retry queue to storage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.persistenceKey)
      if (stored) {
        const operations = JSON.parse(stored) as Array<[string, QueuedOperation]>
        this.queue = new Map(operations)
        
        // Reset processing status for any operations that were processing
        this.queue.forEach(operation => {
          if (operation.status === 'processing') {
            operation.status = 'pending'
            operation.nextRetry = Date.now() + 1000 // Retry in 1 second
          }
        })
        
        console.log(`[RetryQueue] Loaded ${this.queue.size} operations from storage`)
      }
    } catch (error) {
      console.warn('Failed to load retry queue from storage:', error)
      this.queue.clear()
    }
  }

  // Cleanup
  destroy(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
    this.saveToStorage()
    this.queue.clear()
    this.processing.clear()
    this.listeners = []
  }
}

// Export singleton instance
export const retryQueue = new RetryQueue()

// Enhanced API client integration
export const queueApiRequest = (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  data?: any,
  options: Parameters<typeof retryQueue.enqueue>[3] = {}
) => {
  return retryQueue.enqueue(endpoint, method, data, {
    type: 'api-request',
    ...options
  })
}