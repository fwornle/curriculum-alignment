import { retryQueue, queueApiRequest } from './retryQueue'
import { errorHandler } from './errorHandler'

// Types for offline management
export interface OfflineState {
  isOnline: boolean
  lastOnlineAt: number | null
  lastOfflineAt: number | null
  connectionType: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
}

export interface OfflineConfig {
  enableOfflineDetection: boolean
  enableBackgroundSync: boolean
  enableOptimisticUpdates: boolean
  syncInterval: number
  maxOfflineTime: number
  healthCheckUrl: string
  healthCheckInterval: number
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

// Network status detection utilities
class NetworkMonitor {
  private listeners: Array<(state: OfflineState) => void> = []
  private state: OfflineState = {
    isOnline: navigator.onLine,
    lastOnlineAt: navigator.onLine ? Date.now() : null,
    lastOfflineAt: navigator.onLine ? null : Date.now(),
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null
  }

  constructor() {
    this.updateConnectionInfo()
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Basic online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', this.updateConnectionInfo.bind(this))
    }

    // Page visibility changes (helps detect network issues)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  private handleOnline(): void {
    this.state.isOnline = true
    this.state.lastOnlineAt = Date.now()
    this.updateConnectionInfo()
    this.notifyListeners()
  }

  private handleOffline(): void {
    this.state.isOnline = false
    this.state.lastOfflineAt = Date.now()
    this.notifyListeners()
  }

  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // Page became visible, check connection
      this.performHealthCheck()
    }
  }

  private updateConnectionInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.state.connectionType = connection.type || null
      this.state.effectiveType = connection.effectiveType || null
      this.state.downlink = connection.downlink || null
      this.state.rtt = connection.rtt || null
    }
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      
      const wasOffline = !this.state.isOnline
      this.state.isOnline = response.ok
      
      if (this.state.isOnline) {
        this.state.lastOnlineAt = Date.now()
        if (wasOffline) {
          this.notifyListeners()
        }
      }

      return response.ok
    } catch (error) {
      const wasOnline = this.state.isOnline
      this.state.isOnline = false
      this.state.lastOfflineAt = Date.now()
      
      if (wasOnline) {
        this.notifyListeners()
      }
      
      return false
    }
  }

  getState(): OfflineState {
    return { ...this.state }
  }

  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState())
      } catch (error) {
        console.error('Error in network monitor listener:', error)
      }
    })
  }

  // Start periodic health checks
  startHealthChecks(interval: number = 30000): () => void {
    const intervalId = setInterval(() => {
      this.performHealthCheck()
    }, interval)

    return () => clearInterval(intervalId)
  }
}

// Main offline manager class
export class OfflineManager {
  private config: OfflineConfig
  private networkMonitor: NetworkMonitor
  private syncInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: (() => void) | null = null
  private optimisticUpdates: Map<string, any> = new Map()
  private listeners: Array<(state: OfflineState) => void> = []

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOfflineDetection: true,
      enableBackgroundSync: true,
      enableOptimisticUpdates: true,
      syncInterval: 30000, // 30 seconds
      maxOfflineTime: 24 * 60 * 60 * 1000, // 24 hours
      healthCheckUrl: '/api/health',
      healthCheckInterval: 60000, // 1 minute
      ...config
    }

    this.networkMonitor = new NetworkMonitor()
    this.setupNetworkListener()
    
    if (this.config.enableOfflineDetection) {
      this.start()
    }
  }

  private setupNetworkListener(): void {
    this.networkMonitor.subscribe((state) => {
      this.listeners.forEach(listener => {
        try {
          listener(state)
        } catch (error) {
          console.error('Error in offline manager listener:', error)
        }
      })

      // Handle state transitions
      if (state.isOnline && state.lastOnlineAt && state.lastOfflineAt && 
          state.lastOnlineAt > state.lastOfflineAt) {
        this.handleBackOnline()
      } else if (!state.isOnline) {
        this.handleGoOffline()
      }
    })
  }

  private handleGoOffline(): void {
    console.log('[OfflineManager] Application went offline')
    
    // Show offline notification
    errorHandler.getToastManager().show({
      type: 'warning',
      title: 'You\'re offline',
      message: 'Changes will be saved and synced when you reconnect.',
      duration: 5000,
      dismissible: true
    })
  }

  private async handleBackOnline(): void {
    console.log('[OfflineManager] Application back online')
    
    // Show back online notification
    errorHandler.getToastManager().show({
      type: 'success',
      title: 'Back online',
      message: 'Syncing your changes...',
      duration: 3000,
      dismissible: true
    })

    // Trigger sync
    if (this.config.enableBackgroundSync) {
      await this.syncPendingOperations()
    }
  }

  // Start offline management
  start(): void {
    if (this.config.enableBackgroundSync) {
      this.startBackgroundSync()
    }

    if (this.config.enableOfflineDetection) {
      this.healthCheckInterval = this.networkMonitor.startHealthChecks(
        this.config.healthCheckInterval
      )
    }

    console.log('[OfflineManager] Started offline management')
  }

  // Stop offline management
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    if (this.healthCheckInterval) {
      this.healthCheckInterval()
      this.healthCheckInterval = null
    }

    console.log('[OfflineManager] Stopped offline management')
  }

  // Background sync management
  private startBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline()) {
        await this.syncPendingOperations()
      }
    }, this.config.syncInterval)
  }

  // Sync pending operations
  async syncPendingOperations(): Promise<SyncResult> {
    const pendingOperations = retryQueue.getOperationsByStatus('pending')
    
    if (pendingOperations.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    console.log(`[OfflineManager] Syncing ${pendingOperations.length} pending operations`)

    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Process operations in order of priority
    const sortedOperations = pendingOperations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })

    for (const operation of sortedOperations) {
      try {
        const success = await retryQueue.processOperation(operation.id)
        if (success) {
          syncedCount++
        } else {
          failedCount++
        }
      } catch (error: any) {
        failedCount++
        errors.push(`${operation.id}: ${error.message}`)
      }

      // Don't overwhelm the network
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const result: SyncResult = {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors
    }

    if (syncedCount > 0) {
      errorHandler.getToastManager().show({
        type: 'success',
        title: 'Sync complete',
        message: `Synced ${syncedCount} operation${syncedCount > 1 ? 's' : ''}`,
        duration: 3000,
        dismissible: true
      })
    }

    if (failedCount > 0) {
      console.warn(`[OfflineManager] ${failedCount} operations failed to sync:`, errors)
    }

    return result
  }

  // Optimistic updates management
  addOptimisticUpdate(key: string, data: any): void {
    if (!this.config.enableOptimisticUpdates) return
    
    this.optimisticUpdates.set(key, {
      data,
      timestamp: Date.now()
    })

    // Clean up old optimistic updates
    this.cleanupOptimisticUpdates()
  }

  getOptimisticUpdate(key: string): any {
    const update = this.optimisticUpdates.get(key)
    return update ? update.data : null
  }

  removeOptimisticUpdate(key: string): void {
    this.optimisticUpdates.delete(key)
  }

  private cleanupOptimisticUpdates(): void {
    const maxAge = 10 * 60 * 1000 // 10 minutes
    const cutoff = Date.now() - maxAge

    for (const [key, update] of this.optimisticUpdates.entries()) {
      if (update.timestamp < cutoff) {
        this.optimisticUpdates.delete(key)
      }
    }
  }

  // Public API methods
  isOnline(): boolean {
    return this.networkMonitor.getState().isOnline
  }

  isOffline(): boolean {
    return !this.isOnline()
  }

  getNetworkState(): OfflineState {
    return this.networkMonitor.getState()
  }

  getOfflineDuration(): number {
    const state = this.networkMonitor.getState()
    if (state.isOnline || !state.lastOfflineAt) return 0
    return Date.now() - state.lastOfflineAt
  }

  // Queue an operation for when back online
  queueForOnline(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    options?: Parameters<typeof queueApiRequest>[3]
  ): string {
    return queueApiRequest(endpoint, method, data, {
      ...options,
      metadata: {
        ...options?.metadata,
        component: options?.metadata?.component || 'OfflineManager',
        description: options?.metadata?.description || 'Queued for online sync'
      }
    })
  }

  // Subscribe to network state changes
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Update configuration
  updateConfig(config: Partial<OfflineConfig>): void {
    const oldConfig = this.config
    this.config = { ...this.config, ...config }

    // Restart if intervals changed
    if (oldConfig.syncInterval !== this.config.syncInterval ||
        oldConfig.healthCheckInterval !== this.config.healthCheckInterval) {
      this.stop()
      this.start()
    }
  }

  // Get queue stats
  getQueueStats() {
    return retryQueue.getStats()
  }

  // Force sync
  async forceSync(): Promise<SyncResult> {
    console.log('[OfflineManager] Force sync requested')
    return this.syncPendingOperations()
  }

  // Clear all offline data
  clearOfflineData(): void {
    retryQueue.clear()
    this.optimisticUpdates.clear()
    console.log('[OfflineManager] Cleared all offline data')
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager()

// Utility functions
export const isOnline = () => offlineManager.isOnline()
export const isOffline = () => offlineManager.isOffline()
export const queueWhenOffline = (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  data?: any,
  options?: Parameters<typeof queueApiRequest>[3]
) => {
  if (isOffline()) {
    return offlineManager.queueForOnline(endpoint, method, data, options)
  } else {
    // Execute immediately if online
    return queueApiRequest(endpoint, method, data, options)
  }
}

// Enhanced fetch that automatically queues when offline
export const offlineFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  if (isOffline()) {
    // Queue the request for when back online
    const operationId = offlineManager.queueForOnline(
      url,
      (options.method as any) || 'GET',
      options.body ? JSON.parse(options.body as string) : undefined,
      {
        priority: 'normal',
        metadata: {
          component: 'offlineFetch',
          description: `Offline fetch: ${options.method || 'GET'} ${url}`
        }
      }
    )

    // Return a promise that will resolve when the operation completes
    return new Promise((resolve, reject) => {
      const checkOperation = () => {
        const operation = retryQueue.getOperation(operationId)
        if (!operation) {
          reject(new Error('Operation not found'))
          return
        }

        if (operation.status === 'completed') {
          // Create a mock response
          resolve(new Response(JSON.stringify({}), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }))
        } else if (operation.status === 'failed') {
          reject(operation.error || new Error('Operation failed'))
        } else {
          // Still pending, check again later
          setTimeout(checkOperation, 1000)
        }
      }

      setTimeout(checkOperation, 1000)
    })
  }

  // Online - execute normally
  return fetch(url, options)
}