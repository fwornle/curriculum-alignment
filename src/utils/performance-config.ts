/**
 * Performance configuration and monitoring dashboard for the Curriculum Alignment System
 */

import { CacheConfig, CacheLayer, CacheStrategy } from './cache';
import { QueryOptimizationConfig, ResourcePoolConfig } from './optimization';

// Environment-based performance configurations
export const performanceConfig = {
  development: {
    cache: {
      ttl: 300, // 5 minutes
      maxSize: 100,
      namespace: 'dev-cache',
      compression: false,
      layers: [CacheLayer.MEMORY],
      strategy: CacheStrategy.LRU
    } as CacheConfig & { layers: CacheLayer[]; strategy: CacheStrategy },
    
    queryOptimization: {
      enableBatching: false,
      batchSize: 5,
      batchTimeout: 50,
      enablePagination: true,
      defaultPageSize: 20,
      maxPageSize: 100,
      enableIndexHints: false
    } as QueryOptimizationConfig,
    
    resourcePool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 5000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 10000
    } as ResourcePoolConfig,
    
    monitoring: {
      enableDetailedMetrics: true,
      metricsRetentionMs: 300000, // 5 minutes
      slowQueryThresholdMs: 1000,
      errorAlertThresholdPercent: 5
    }
  },
  
  staging: {
    cache: {
      ttl: 1800, // 30 minutes
      maxSize: 500,
      namespace: 'staging-cache',
      compression: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      strategy: CacheStrategy.WRITE_THROUGH
    } as CacheConfig & { layers: CacheLayer[]; strategy: CacheStrategy },
    
    queryOptimization: {
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 100,
      enablePagination: true,
      defaultPageSize: 50,
      maxPageSize: 500,
      enableIndexHints: true
    } as QueryOptimizationConfig,
    
    resourcePool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 15000,
      destroyTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      reapIntervalMillis: 30000
    } as ResourcePoolConfig,
    
    monitoring: {
      enableDetailedMetrics: true,
      metricsRetentionMs: 900000, // 15 minutes
      slowQueryThresholdMs: 2000,
      errorAlertThresholdPercent: 3
    }
  },
  
  production: {
    cache: {
      ttl: 3600, // 1 hour
      maxSize: 1000,
      namespace: 'prod-cache',
      compression: true,
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS, CacheLayer.DYNAMODB],
      strategy: CacheStrategy.WRITE_BEHIND
    } as CacheConfig & { layers: CacheLayer[]; strategy: CacheStrategy },
    
    queryOptimization: {
      enableBatching: true,
      batchSize: 20,
      batchTimeout: 200,
      enablePagination: true,
      defaultPageSize: 50,
      maxPageSize: 1000,
      enableIndexHints: true
    } as QueryOptimizationConfig,
    
    resourcePool: {
      min: 5,
      max: 50,
      acquireTimeoutMillis: 15000,
      createTimeoutMillis: 20000,
      destroyTimeoutMillis: 10000,
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 60000
    } as ResourcePoolConfig,
    
    monitoring: {
      enableDetailedMetrics: false, // Reduce overhead in production
      metricsRetentionMs: 1800000, // 30 minutes
      slowQueryThresholdMs: 3000,
      errorAlertThresholdPercent: 1
    }
  }
};

// Get configuration for current environment
export function getPerformanceConfig() {
  const env = process.env.NODE_ENV as keyof typeof performanceConfig || 'development';
  return performanceConfig[env] || performanceConfig.development;
}

// Performance thresholds and alerts
export const performanceThresholds = {
  responseTime: {
    good: 200,      // < 200ms
    acceptable: 1000, // < 1s
    slow: 3000,     // < 3s
    critical: 10000  // > 10s
  },
  
  errorRate: {
    good: 0.1,      // < 0.1%
    acceptable: 1,   // < 1%
    warning: 5,      // < 5%
    critical: 10     // > 10%
  },
  
  cacheHitRate: {
    good: 95,       // > 95%
    acceptable: 80,  // > 80%
    warning: 60,     // > 60%
    critical: 40     // < 40%
  },
  
  cpuUsage: {
    good: 50,       // < 50%
    acceptable: 70,  // < 70%
    warning: 85,     // < 85%
    critical: 95     // > 95%
  },
  
  memoryUsage: {
    good: 60,       // < 60%
    acceptable: 75,  // < 75%
    warning: 85,     // < 85%
    critical: 95     // > 95%
  }
};

// Performance monitoring dashboard data structure
export interface PerformanceDashboard {
  overview: {
    status: 'healthy' | 'degraded' | 'critical';
    timestamp: string;
    uptime: number;
    version: string;
  };
  
  responseTime: {
    current: number;
    average: number;
    p95: number;
    p99: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    peakRps: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  
  errors: {
    errorRate: number;
    totalErrors: number;
    errorsByType: { [type: string]: number };
    recentErrors: Array<{
      timestamp: string;
      message: string;
      type: string;
      count: number;
    }>;
  };
  
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
    evictions: number;
    layers: { [layer: string]: {
      hitRate: number;
      size: number;
      operations: number;
    }};
  };
  
  database: {
    connectionPool: {
      active: number;
      idle: number;
      total: number;
      waiting: number;
    };
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    queryMetrics: {
      averageDuration: number;
      queriesPerSecond: number;
    };
  };
  
  resources: {
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
      heapUsed: number;
      heapTotal: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
    };
  };
  
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

// Generate performance dashboard
export function generatePerformanceDashboard(
  performanceStats: any,
  cacheStats: any,
  resourceStats: any
): PerformanceDashboard {
  const config = getPerformanceConfig();
  const thresholds = performanceThresholds;
  
  // Determine overall system status
  const getSystemStatus = (): 'healthy' | 'degraded' | 'critical' => {
    const errorRate = performanceStats.errorRate || 0;
    const avgResponseTime = performanceStats.averageDuration || 0;
    const cacheHitRate = cacheStats.memory?.hitRate || 0;
    
    if (errorRate > thresholds.errorRate.critical || avgResponseTime > thresholds.responseTime.critical) {
      return 'critical';
    }
    
    if (errorRate > thresholds.errorRate.warning || 
        avgResponseTime > thresholds.responseTime.slow ||
        cacheHitRate < thresholds.cacheHitRate.warning) {
      return 'degraded';
    }
    
    return 'healthy';
  };
  
  // Calculate trend based on recent metrics
  const calculateTrend = (current: number, historical: number[]): 'improving' | 'stable' | 'degrading' => {
    if (historical.length < 3) return 'stable';
    
    const recent = historical.slice(-3);
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const change = (current - average) / average;
    
    if (change < -0.05) return 'improving';
    if (change > 0.05) return 'degrading';
    return 'stable';
  };
  
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    overview: {
      status: getSystemStatus(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    },
    
    responseTime: {
      current: performanceStats.averageDuration || 0,
      average: performanceStats.averageDuration || 0,
      p95: performanceStats.p95Duration || 0,
      p99: performanceStats.p99Duration || 0,
      trend: 'stable' // Would need historical data to calculate properly
    },
    
    throughput: {
      requestsPerSecond: performanceStats.totalMetrics / 60 || 0, // Approximate
      requestsPerMinute: performanceStats.totalMetrics || 0,
      peakRps: 0, // Would need to track peak values
      trend: 'stable'
    },
    
    errors: {
      errorRate: performanceStats.errorRate || 0,
      totalErrors: Math.floor((performanceStats.totalMetrics || 0) * (performanceStats.errorRate || 0) / 100),
      errorsByType: {}, // Would need to categorize errors
      recentErrors: [] // Would need error history
    },
    
    cache: {
      hitRate: cacheStats.memory?.hitRate || 0,
      missRate: 100 - (cacheStats.memory?.hitRate || 0),
      size: cacheStats.memory?.size || 0,
      evictions: 0, // Would need eviction tracking
      layers: Object.entries(cacheStats).reduce((acc, [layer, stats]: [string, any]) => {
        acc[layer] = {
          hitRate: stats.hitRate || 0,
          size: stats.size || 0,
          operations: (stats.hits || 0) + (stats.misses || 0) + (stats.sets || 0)
        };
        return acc;
      }, {} as any)
    },
    
    database: {
      connectionPool: {
        active: resourceStats?.totalResources || 0,
        idle: resourceStats?.availableResources || 0,
        total: resourceStats?.totalResources || 0,
        waiting: resourceStats?.pendingRequests || 0
      },
      slowQueries: performanceStats.slowestOperations?.filter((op: any) => 
        op.name.startsWith('db:') && op.duration > config.monitoring.slowQueryThresholdMs
      ).map((op: any) => ({
        query: op.name,
        duration: op.duration,
        timestamp: new Date(op.timestamp).toISOString()
      })) || [],
      queryMetrics: {
        averageDuration: performanceStats.averageDuration || 0,
        queriesPerSecond: (performanceStats.totalMetrics || 0) / 60
      }
    },
    
    resources: {
      cpu: {
        usage: 0, // Would need system monitoring
        loadAverage: [] // Would need system monitoring
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      },
      network: {
        bytesIn: 0, // Would need network monitoring
        bytesOut: 0
      }
    },
    
    alerts: [] // Would generate based on threshold violations
  };
}

// Performance optimization recommendations
export interface PerformanceRecommendation {
  category: 'cache' | 'database' | 'api' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
}

export function generatePerformanceRecommendations(dashboard: PerformanceDashboard): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = [];
  const thresholds = performanceThresholds;
  
  // Cache optimization recommendations
  if (dashboard.cache.hitRate < thresholds.cacheHitRate.acceptable) {
    recommendations.push({
      category: 'cache',
      priority: dashboard.cache.hitRate < thresholds.cacheHitRate.critical ? 'critical' : 'high',
      title: 'Improve Cache Hit Rate',
      description: `Cache hit rate is ${dashboard.cache.hitRate.toFixed(1)}%, below acceptable threshold of ${thresholds.cacheHitRate.acceptable}%`,
      impact: 'Reducing database load and improving response times',
      effort: 'medium',
      implementation: 'Review cache TTL settings, identify frequently accessed data for caching, implement cache warming strategies'
    });
  }
  
  // Response time recommendations
  if (dashboard.responseTime.p95 > thresholds.responseTime.acceptable) {
    recommendations.push({
      category: 'api',
      priority: dashboard.responseTime.p95 > thresholds.responseTime.critical ? 'critical' : 'high',
      title: 'Optimize Response Times',
      description: `95th percentile response time is ${dashboard.responseTime.p95.toFixed(0)}ms, above acceptable threshold`,
      impact: 'Improving user experience and system throughput',
      effort: 'high',
      implementation: 'Implement query optimization, add database indexes, enable compression, optimize serialization'
    });
  }
  
  // Database optimization recommendations
  if (dashboard.database.slowQueries.length > 0) {
    recommendations.push({
      category: 'database',
      priority: 'medium',
      title: 'Optimize Slow Queries',
      description: `Found ${dashboard.database.slowQueries.length} slow queries that exceed performance thresholds`,
      impact: 'Reducing database load and improving overall response times',
      effort: 'medium',
      implementation: 'Add database indexes, rewrite queries, implement query result caching'
    });
  }
  
  // Memory usage recommendations
  if (dashboard.resources.memory.percentage > thresholds.memoryUsage.warning) {
    recommendations.push({
      category: 'infrastructure',
      priority: dashboard.resources.memory.percentage > thresholds.memoryUsage.critical ? 'critical' : 'high',
      title: 'Address High Memory Usage',
      description: `Memory usage is ${dashboard.resources.memory.percentage.toFixed(1)}%, above warning threshold`,
      impact: 'Preventing out-of-memory errors and performance degradation',
      effort: 'medium',
      implementation: 'Implement memory profiling, optimize data structures, adjust cache sizes, consider horizontal scaling'
    });
  }
  
  // Error rate recommendations
  if (dashboard.errors.errorRate > thresholds.errorRate.acceptable) {
    recommendations.push({
      category: 'api',
      priority: dashboard.errors.errorRate > thresholds.errorRate.critical ? 'critical' : 'high',
      title: 'Reduce Error Rate',
      description: `Error rate is ${dashboard.errors.errorRate.toFixed(2)}%, above acceptable threshold`,
      impact: 'Improving system reliability and user experience',
      effort: 'high',
      implementation: 'Implement better error handling, add input validation, improve monitoring and alerting'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Export performance configuration utilities
export default {
  getPerformanceConfig,
  performanceThresholds,
  generatePerformanceDashboard,
  generatePerformanceRecommendations
};