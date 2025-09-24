/**
 * Performance optimization utilities for the Curriculum Alignment System
 * Includes query optimization, resource pooling, and performance monitoring
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { createCacheKey, CacheManager, CacheLayer, CacheStrategy } from './cache';

// Performance metrics types
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface QueryOptimizationConfig {
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
  enablePagination: boolean;
  defaultPageSize: number;
  maxPageSize: number;
  enableIndexHints: boolean;
}

export interface ResourcePoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

// Database query optimization
export class QueryOptimizer {
  private config: QueryOptimizationConfig;
  private batchedQueries: Map<string, any[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: QueryOptimizationConfig) {
    this.config = config;
  }

  /**
   * Optimize SELECT queries with pagination and indexing hints
   */
  optimizeSelectQuery(
    baseQuery: string,
    params: any[] = [],
    options: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      indexHint?: string;
    } = {}
  ): { query: string; params: any[] } {
    let optimizedQuery = baseQuery;
    let optimizedParams = [...params];

    // Add index hint if enabled and provided
    if (this.config.enableIndexHints && options.indexHint) {
      optimizedQuery = optimizedQuery.replace(
        /FROM\s+(\w+)/i,
        `FROM $1 USE INDEX (${options.indexHint})`
      );
    }

    // Add sorting if specified
    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'ASC';
      if (!optimizedQuery.toLowerCase().includes('order by')) {
        optimizedQuery += ` ORDER BY ${options.sortBy} ${sortOrder}`;
      }
    }

    // Add pagination if enabled
    if (this.config.enablePagination) {
      const page = options.page || 1;
      const pageSize = Math.min(
        options.pageSize || this.config.defaultPageSize,
        this.config.maxPageSize
      );
      const offset = (page - 1) * pageSize;

      if (!optimizedQuery.toLowerCase().includes('limit')) {
        optimizedQuery += ` LIMIT ? OFFSET ?`;
        optimizedParams.push(pageSize, offset);
      }
    }

    return { query: optimizedQuery, params: optimizedParams };
  }

  /**
   * Batch multiple queries for execution
   */
  async batchQuery<T>(
    queryKey: string,
    query: string,
    params: any[],
    executor: (queries: { query: string; params: any[] }[]) => Promise<T[]>
  ): Promise<Promise<T>> {
    if (!this.config.enableBatching) {
      // Execute immediately if batching is disabled
      const results = await executor([{ query, params }]);
      return Promise.resolve(results[0]);
    }

    return new Promise((resolve, reject) => {
      // Add to batch
      if (!this.batchedQueries.has(queryKey)) {
        this.batchedQueries.set(queryKey, []);
      }

      const batch = this.batchedQueries.get(queryKey)!;
      batch.push({ query, params, resolve, reject });

      // Set timer for batch execution if not already set
      if (!this.batchTimers.has(queryKey)) {
        const timer = setTimeout(async () => {
          await this.executeBatch(queryKey, executor);
        }, this.config.batchTimeout);
        
        this.batchTimers.set(queryKey, timer);
      }

      // Execute immediately if batch is full
      if (batch.length >= this.config.batchSize) {
        clearTimeout(this.batchTimers.get(queryKey)!);
        this.batchTimers.delete(queryKey);
        await this.executeBatch(queryKey, executor);
      }
    });
  }

  private async executeBatch<T>(
    queryKey: string,
    executor: (queries: { query: string; params: any[] }[]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batchedQueries.get(queryKey);
    if (!batch || batch.length === 0) return;

    this.batchedQueries.delete(queryKey);
    this.batchTimers.delete(queryKey);

    try {
      const queries = batch.map(item => ({ query: item.query, params: item.params }));
      const results = await executor(queries);

      // Resolve all promises in the batch
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises in the batch
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}

/**
 * Resource pool for managing database connections, HTTP clients, etc.
 */
export class ResourcePool<T> extends EventEmitter {
  private resources: T[] = [];
  private available: T[] = [];
  private pending: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private config: ResourcePoolConfig;
  private factory: {
    create: () => Promise<T>;
    destroy: (resource: T) => Promise<void>;
    validate: (resource: T) => Promise<boolean>;
  };

  private reapTimer?: NodeJS.Timeout;
  private destroyed = false;

  constructor(
    config: ResourcePoolConfig,
    factory: {
      create: () => Promise<T>;
      destroy: (resource: T) => Promise<void>;
      validate: (resource: T) => Promise<boolean>;
    }
  ) {
    super();
    this.config = config;
    this.factory = factory;
    
    // Initialize minimum resources
    this.initialize();
    
    // Start reaper for idle resources
    this.startReaper();
  }

  private async initialize(): Promise<void> {
    for (let i = 0; i < this.config.min; i++) {
      try {
        const resource = await this.createResource();
        this.available.push(resource);
        this.resources.push(resource);
      } catch (error) {
        console.error('Failed to initialize resource pool:', error);
      }
    }
  }

  private async createResource(): Promise<T> {
    const start = performance.now();
    
    try {
      const resource = await Promise.race([
        this.factory.create(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Resource creation timeout')), this.config.createTimeoutMillis);
        })
      ]);
      
      const duration = performance.now() - start;
      this.emit('resourceCreated', { resource, duration });
      
      return resource;
    } catch (error) {
      const duration = performance.now() - start;
      this.emit('resourceCreationFailed', { error, duration });
      throw error;
    }
  }

  async acquire(): Promise<T> {
    if (this.destroyed) {
      throw new Error('Resource pool has been destroyed');
    }

    // Try to get an available resource
    if (this.available.length > 0) {
      const resource = this.available.pop()!;
      
      // Validate resource before returning
      try {
        const isValid = await this.factory.validate(resource);
        if (isValid) {
          this.emit('resourceAcquired', { resource });
          return resource;
        } else {
          // Resource is invalid, destroy it and try again
          await this.destroyResource(resource);
          return this.acquire();
        }
      } catch (error) {
        await this.destroyResource(resource);
        return this.acquire();
      }
    }

    // Create new resource if under limit
    if (this.resources.length < this.config.max) {
      try {
        const resource = await this.createResource();
        this.resources.push(resource);
        this.emit('resourceAcquired', { resource });
        return resource;
      } catch (error) {
        // Fall through to queueing logic
      }
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.resolve === resolve);
        if (index !== -1) {
          this.pending.splice(index, 1);
        }
        reject(new Error('Resource acquisition timeout'));
      }, this.config.acquireTimeoutMillis);

      this.pending.push({ resolve, reject, timeout });
    });
  }

  async release(resource: T): Promise<void> {
    if (this.destroyed) {
      await this.destroyResource(resource);
      return;
    }

    // Check if there are pending requests
    if (this.pending.length > 0) {
      const { resolve, timeout } = this.pending.shift()!;
      clearTimeout(timeout);
      
      try {
        const isValid = await this.factory.validate(resource);
        if (isValid) {
          resolve(resource);
          this.emit('resourceAcquired', { resource });
          return;
        }
      } catch (error) {
        // Resource is invalid, destroy it
        await this.destroyResource(resource);
      }
    }

    // Return to available pool
    this.available.push(resource);
    this.emit('resourceReleased', { resource });
  }

  private async destroyResource(resource: T): Promise<void> {
    const index = this.resources.indexOf(resource);
    if (index !== -1) {
      this.resources.splice(index, 1);
    }

    const availableIndex = this.available.indexOf(resource);
    if (availableIndex !== -1) {
      this.available.splice(availableIndex, 1);
    }

    try {
      await Promise.race([
        this.factory.destroy(resource),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Resource destruction timeout')), this.config.destroyTimeoutMillis);
        })
      ]);
      
      this.emit('resourceDestroyed', { resource });
    } catch (error) {
      console.error('Failed to destroy resource:', error);
      this.emit('resourceDestructionFailed', { resource, error });
    }
  }

  private startReaper(): void {
    this.reapTimer = setInterval(async () => {
      if (this.available.length <= this.config.min) {
        return;
      }

      // Remove excess idle resources
      const excess = this.available.length - this.config.min;
      const toRemove = this.available.splice(0, excess);
      
      for (const resource of toRemove) {
        await this.destroyResource(resource);
      }
    }, this.config.reapIntervalMillis);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    
    if (this.reapTimer) {
      clearInterval(this.reapTimer);
    }

    // Reject all pending requests
    this.pending.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Resource pool destroyed'));
    });
    this.pending.length = 0;

    // Destroy all resources
    const destroyPromises = this.resources.map(resource => this.destroyResource(resource));
    await Promise.all(destroyPromises);

    this.resources.length = 0;
    this.available.length = 0;
    
    this.emit('poolDestroyed');
  }

  getStats() {
    return {
      totalResources: this.resources.length,
      availableResources: this.available.length,
      pendingRequests: this.pending.length,
      destroyed: this.destroyed
    };
  }
}

/**
 * Performance monitor for tracking execution times and metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();
  private cache: CacheManager;

  constructor(cacheManager?: CacheManager) {
    this.cache = cacheManager || new CacheManager(
      { ttl: 3600, namespace: 'performance' },
      CacheStrategy.LRU,
      [CacheLayer.MEMORY]
    );
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.activeTimers.set(name, performance.now());
  }

  /**
   * End timing an operation and record the metric
   */
  endTimer(name: string, metadata?: Record<string, any>): PerformanceMetric | null {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      console.warn(`No active timer found for: ${name}`);
      return null;
    }

    this.activeTimers.delete(name);
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    return metric;
  }

  /**
   * Record a metric directly
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  /**
   * Decorator for automatic performance monitoring
   */
  static monitor(monitor: PerformanceMonitor, metricName?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      const name = metricName || `${target.constructor.name}.${propertyName}`;

      descriptor.value = async function (...args: any[]) {
        monitor.startTimer(name);
        
        try {
          const result = await method.apply(this, args);
          monitor.endTimer(name, { success: true, argsLength: args.length });
          return result;
        } catch (error) {
          monitor.endTimer(name, { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            argsLength: args.length 
          });
          throw error;
        }
      };
    };
  }

  /**
   * Get performance statistics
   */
  getStats(timeRangeMs?: number): {
    totalMetrics: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    slowestOperations: PerformanceMetric[];
    errorRate: number;
  } {
    let relevantMetrics = this.metrics;
    
    if (timeRangeMs) {
      const cutoff = Date.now() - timeRangeMs;
      relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    }

    if (relevantMetrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowestOperations: [],
        errorRate: 0
      };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const errorCount = relevantMetrics.filter(m => m.metadata?.success === false).length;

    return {
      totalMetrics: relevantMetrics.length,
      averageDuration: totalDuration / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      slowestOperations: relevantMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      errorRate: (errorCount / relevantMetrics.length) * 100
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.length = 0;
    this.activeTimers.clear();
  }
}

/**
 * Memoization decorator with cache integration
 */
export function memoize(
  options: {
    ttl?: number;
    keyGenerator?: (...args: any[]) => string;
    cache?: CacheManager;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = options.cache || new CacheManager(
      { ttl: options.ttl || 3600, namespace: 'memoize' },
      CacheStrategy.LRU,
      [CacheLayer.MEMORY]
    );

    descriptor.value = async function (...args: any[]) {
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : createCacheKey(target.constructor.name, propertyName, ...args);
      
      const cachedResult = await cache.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      const result = await method.apply(this, args);
      await cache.set(key, result, options.ttl);
      
      return result;
    };
  };
}

/**
 * Debounce decorator for rate limiting
 */
export function debounce(delayMs: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    let timeout: NodeJS.Timeout | null = null;

    descriptor.value = function (...args: any[]) {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        method.apply(this, args);
        timeout = null;
      }, delayMs);
    };
  };
}

/**
 * Throttle decorator for rate limiting
 */
export function throttle(intervalMs: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    let lastCall = 0;

    descriptor.value = function (...args: any[]) {
      const now = Date.now();
      
      if (now - lastCall >= intervalMs) {
        lastCall = now;
        return method.apply(this, args);
      }
    };
  };
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const queryOptimizer = new QueryOptimizer({
  enableBatching: process.env.ENABLE_QUERY_BATCHING === 'true',
  batchSize: parseInt(process.env.QUERY_BATCH_SIZE || '10'),
  batchTimeout: parseInt(process.env.QUERY_BATCH_TIMEOUT || '100'),
  enablePagination: process.env.ENABLE_PAGINATION !== 'false',
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '50'),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '1000'),
  enableIndexHints: process.env.ENABLE_INDEX_HINTS === 'true'
});