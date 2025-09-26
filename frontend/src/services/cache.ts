// Cache types and interfaces
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  etag?: string
  lastModified?: string
  accessCount: number
  lastAccessed: number
  size: number
  tags: string[]
}

export interface CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default time to live in milliseconds
  enablePersistence: boolean // Save cache to localStorage
  enableCompression: boolean // Compress cached data
  gcInterval: number // Garbage collection interval
  enableAnalytics: boolean // Track cache performance
}

export interface CacheStats {
  hitRate: number
  missRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  totalSize: number
  entryCount: number
  averageResponseTime: number
  lastGC: number
}

export interface RequestOptions {
  ttl?: number
  tags?: string[]
  priority?: 'low' | 'normal' | 'high'
  staleWhileRevalidate?: boolean
  bypassCache?: boolean
  etag?: string
  lastModified?: string
}

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only'

// Request deduplication manager
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    const existing = this.pendingRequests.get(key)
    if (existing) {
      console.log(`[RequestDeduplicator] Deduplicating request: ${key}`)
      return existing as Promise<T>
    }

    // Start new request
    const promise = requestFn().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  cancel(key: string): void {
    this.pendingRequests.delete(key)
  }

  clear(): void {
    this.pendingRequests.clear()
  }

  getPendingCount(): number {
    return this.pendingRequests.size
  }
}

// Main cache implementation
export class Cache {
  private entries = new Map<string, CacheEntry>()
  private config: CacheConfig
  private deduplicator = new RequestDeduplicator()
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    entryCount: 0,
    averageResponseTime: 0,
    lastGC: Date.now()
  }
  private gcInterval: NodeJS.Timeout | null = null
  private persistenceKey = 'curriculum-alignment-cache'

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      enablePersistence: true,
      enableCompression: false,
      gcInterval: 5 * 60 * 1000, // 5 minutes
      enableAnalytics: true,
      ...config
    }

    this.loadFromStorage()
    this.startGarbageCollection()
  }

  // Main cache methods
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.stats.totalRequests++

    const entry = this.entries.get(key)
    
    if (!entry) {
      this.stats.totalMisses++
      this.updateStats()
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      this.stats.totalMisses++
      this.updateStats()
      return null
    }

    // Update access stats
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.stats.totalHits++
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + 
       (Date.now() - startTime)) / this.stats.totalRequests
    )
    this.updateStats()

    console.log(`[Cache] Hit: ${key}`)
    return entry.data as T
  }

  set<T>(
    key: string, 
    data: T, 
    options: RequestOptions = {}
  ): void {
    const {
      ttl = this.config.defaultTTL,
      tags = [],
      priority = 'normal'
    } = options

    const size = this.calculateSize(data)
    
    // Check if we need to evict entries
    if (this.shouldEvict(size)) {
      this.evictEntries(size)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      tags,
      etag: options.etag,
      lastModified: options.lastModified
    }

    this.entries.set(key, entry)
    this.updateStats()
    
    console.log(`[Cache] Set: ${key} (${this.formatBytes(size)}, TTL: ${ttl}ms)`)
  }

  delete(key: string): boolean {
    const deleted = this.entries.delete(key)
    if (deleted) {
      this.updateStats()
      console.log(`[Cache] Delete: ${key}`)
    }
    return deleted
  }

  clear(): void {
    this.entries.clear()
    this.deduplicator.clear()
    this.updateStats()
    console.log('[Cache] Cleared all entries')
  }

  // Request with caching
  async request<T>(
    key: string,
    requestFn: () => Promise<T>,
    strategy: CacheStrategy = 'cache-first',
    options: RequestOptions = {}
  ): Promise<T> {
    const { bypassCache = false } = options

    if (bypassCache) {
      return this.deduplicator.deduplicate(key, requestFn)
    }

    switch (strategy) {
      case 'cache-first':
        return this.cacheFirst(key, requestFn, options)
      
      case 'network-first':
        return this.networkFirst(key, requestFn, options)
      
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(key, requestFn, options)
      
      case 'network-only':
        return this.deduplicator.deduplicate(key, requestFn)
      
      default:
        return this.cacheFirst(key, requestFn, options)
    }
  }

  // Cache strategies
  private async cacheFirst<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fallback to network
    const result = await this.deduplicator.deduplicate(key, requestFn)
    this.set(key, result, options)
    return result
  }

  private async networkFirst<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    try {
      // Try network first
      const result = await this.deduplicator.deduplicate(key, requestFn)
      this.set(key, result, options)
      return result
    } catch (error) {
      // Fallback to cache
      const cached = await this.get<T>(key)
      if (cached !== null) {
        console.log(`[Cache] Network failed, using cached data: ${key}`)
        return cached
      }
      throw error
    }
  }

  private async staleWhileRevalidate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    const cached = await this.get<T>(key)
    
    // Start background revalidation
    this.deduplicator.deduplicate(key, async () => {
      try {
        const result = await requestFn()
        this.set(key, result, options)
        return result
      } catch (error) {
        console.warn(`[Cache] Background revalidation failed for ${key}:`, error)
        throw error
      }
    }).catch(() => {
      // Ignore background errors
    })

    // Return cached data immediately if available
    if (cached !== null) {
      return cached
    }

    // If no cached data, wait for network
    return this.deduplicator.deduplicate(`${key}_initial`, requestFn)
  }

  // Cache invalidation
  invalidate(keyOrPattern: string | RegExp): number {
    let count = 0

    if (typeof keyOrPattern === 'string') {
      if (this.entries.delete(keyOrPattern)) {
        count++
      }
    } else {
      for (const key of this.entries.keys()) {
        if (keyOrPattern.test(key)) {
          this.entries.delete(key)
          count++
        }
      }
    }

    if (count > 0) {
      this.updateStats()
      console.log(`[Cache] Invalidated ${count} entries`)
    }

    return count
  }

  invalidateByTags(tags: string[]): number {
    let count = 0

    for (const [key, entry] of this.entries.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.entries.delete(key)
        count++
      }
    }

    if (count > 0) {
      this.updateStats()
      console.log(`[Cache] Invalidated ${count} entries by tags:`, tags)
    }

    return count
  }

  // Cache management
  private shouldEvict(newEntrySize: number): boolean {
    const currentSize = this.stats.totalSize
    const maxSize = this.config.maxSize
    const maxEntries = this.config.maxEntries

    return (
      currentSize + newEntrySize > maxSize ||
      this.entries.size >= maxEntries
    )
  }

  private evictEntries(spaceNeeded: number): void {
    // LRU eviction strategy with priority
    const entries = Array.from(this.entries.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Sort by last accessed (LRU)
        return a.entry.lastAccessed - b.entry.lastAccessed
      })

    let freedSpace = 0
    let evictedCount = 0

    for (const { key, entry } of entries) {
      if (freedSpace >= spaceNeeded && evictedCount < 10) {
        break
      }

      this.entries.delete(key)
      freedSpace += entry.size
      evictedCount++
    }

    console.log(`[Cache] Evicted ${evictedCount} entries, freed ${this.formatBytes(freedSpace)}`)
  }

  private startGarbageCollection(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
    }

    this.gcInterval = setInterval(() => {
      this.collectGarbage()
    }, this.config.gcInterval)
  }

  private collectGarbage(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expiresAt) {
        this.entries.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      this.updateStats()
      console.log(`[Cache] Garbage collection removed ${expiredCount} expired entries`)
    }

    this.stats.lastGC = now
    
    // Persist to storage after GC
    if (this.config.enablePersistence) {
      this.saveToStorage()
    }
  }

  // Utility methods
  private calculateSize(data: any): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length
    } catch {
      return 1024 // Default size if calculation fails
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  private updateStats(): void {
    this.stats.entryCount = this.entries.size
    this.stats.totalSize = Array.from(this.entries.values())
      .reduce((sum, entry) => sum + entry.size, 0)
    
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.totalHits / this.stats.totalRequests
      this.stats.missRate = this.stats.totalMisses / this.stats.totalRequests
    }
  }

  // Persistence
  private saveToStorage(): void {
    if (!this.config.enablePersistence) return

    try {
      const serialized = {
        entries: Array.from(this.entries.entries()),
        stats: this.stats,
        timestamp: Date.now()
      }

      localStorage.setItem(this.persistenceKey, JSON.stringify(serialized))
    } catch (error) {
      console.warn('[Cache] Failed to save to storage:', error)
    }
  }

  private loadFromStorage(): void {
    if (!this.config.enablePersistence) return

    try {
      const stored = localStorage.getItem(this.persistenceKey)
      if (!stored) return

      const { entries, stats, timestamp } = JSON.parse(stored)
      
      // Only load if not too old (1 hour)
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        return
      }

      // Filter out expired entries
      const now = Date.now()
      const validEntries = entries.filter(([_, entry]: [string, CacheEntry]) => 
        now < entry.expiresAt
      )

      this.entries = new Map(validEntries)
      this.stats = { ...this.stats, ...stats }
      this.updateStats()

      console.log(`[Cache] Loaded ${validEntries.length} entries from storage`)
    } catch (error) {
      console.warn('[Cache] Failed to load from storage:', error)
    }
  }

  // Public API
  getStats(): CacheStats {
    return { ...this.stats }
  }

  has(key: string): boolean {
    const entry = this.entries.get(key)
    return entry ? Date.now() < entry.expiresAt : false
  }

  keys(): string[] {
    const now = Date.now()
    return Array.from(this.entries.entries())
      .filter(([_, entry]) => now < entry.expiresAt)
      .map(([key, _]) => key)
  }

  size(): number {
    return this.entries.size
  }

  // Cleanup
  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
      this.gcInterval = null
    }
    
    this.saveToStorage()
    this.clear()
  }
}

// Singleton cache instance
export const cache = new Cache()

// Cache decorators and utilities
export const cacheRequest = <T>(
  key: string | ((...args: any[]) => string),
  strategy: CacheStrategy = 'cache-first',
  options: RequestOptions = {}
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = typeof key === 'function' ? key(...args) : key
      
      return cache.request<T>(
        cacheKey,
        () => originalMethod.apply(this, args),
        strategy,
        options
      )
    }

    return descriptor
  }
}

// HTTP cache helpers
export const httpCache = {
  // Cache GET requests automatically
  get: async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
    return cache.request<T>(
      `GET:${url}`,
      async () => {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(options.etag && { 'If-None-Match': options.etag }),
            ...(options.lastModified && { 'If-Modified-Since': options.lastModified })
          }
        })

        if (response.status === 304) {
          // Not modified, return cached version
          const cached = await cache.get<T>(`GET:${url}`)
          if (cached) return cached
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Update cache options with response headers
        options.etag = response.headers.get('etag') || options.etag
        options.lastModified = response.headers.get('last-modified') || options.lastModified
        
        return data
      },
      'cache-first',
      options
    )
  },

  // Invalidate cache on mutations
  mutate: (url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE') => {
    // Invalidate related cache entries
    const patterns = [
      new RegExp(`GET:${url.replace(/\/\d+$/, '')}`), // Collection URLs
      new RegExp(`GET:${url}`), // Specific resource URLs
    ]

    patterns.forEach(pattern => cache.invalidate(pattern))
  }
}

