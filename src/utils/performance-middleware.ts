/**
 * Performance middleware and integrations for Express, Lambda, and database operations
 */

import { Request, Response, NextFunction } from 'express';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { performanceMonitor, queryOptimizer, PerformanceMonitor } from './optimization';
import { defaultCacheManager } from './cache';
import { performance } from 'perf_hooks';

// Express middleware for performance monitoring
export function performanceMiddleware(monitor: PerformanceMonitor = performanceMonitor) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const timerName = `${req.method}_${req.route?.path || req.path}`;
    
    monitor.startTimer(timerName);
    
    // Override res.end to capture timing
    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      const duration = performance.now() - startTime;
      
      monitor.endTimer(timerName, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
        success: res.statusCode < 400
      });
      
      // Add performance headers
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      
      originalEnd.call(this, chunk);
    };
    
    next();
  };
}

// Cache middleware for Express routes
export function cacheMiddleware(
  options: {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    skipIfHeader?: string;
    varyBy?: string[];
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if specified header is present
    if (options.skipIfHeader && req.get(options.skipIfHeader)) {
      return next();
    }
    
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : `route:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    try {
      const cachedResponse = await defaultCacheManager.get(cacheKey);
      if (cachedResponse) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedResponse);
      }
    } catch (error) {
      console.warn('Cache retrieval error:', error);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body: any) {
      if (res.statusCode === 200) {
        // Cache successful responses
        defaultCacheManager.set(cacheKey, body, options.ttl)
          .catch(error => console.warn('Cache set error:', error));
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

// Lambda wrapper for performance monitoring
export function performanceLambdaWrapper<T extends APIGatewayProxyEvent>(
  handler: (event: T, context: Context) => Promise<APIGatewayProxyResult>,
  monitor: PerformanceMonitor = performanceMonitor
) {
  return async (event: T, context: Context): Promise<APIGatewayProxyResult> => {
    const functionName = context.functionName;
    const timerName = `lambda:${functionName}`;
    
    monitor.startTimer(timerName);
    
    try {
      const result = await handler(event, context);
      
      monitor.endTimer(timerName, {
        functionName,
        httpMethod: event.httpMethod,
        path: event.path,
        statusCode: result.statusCode,
        requestId: context.awsRequestId,
        success: parseInt(result.statusCode) < 400
      });
      
      // Add performance headers
      result.headers = {
        ...result.headers,
        'X-Lambda-Duration': `${context.getRemainingTimeInMillis()}ms`,
        'X-Request-ID': context.awsRequestId
      };
      
      return result;
    } catch (error) {
      monitor.endTimer(timerName, {
        functionName,
        httpMethod: event.httpMethod,
        path: event.path,
        requestId: context.awsRequestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };
}

// Database query performance wrapper
export function performanceQueryWrapper<T>(
  queryFunction: (...args: any[]) => Promise<T>,
  queryName: string,
  monitor: PerformanceMonitor = performanceMonitor
) {
  return async (...args: any[]): Promise<T> => {
    const timerName = `db:${queryName}`;
    monitor.startTimer(timerName);
    
    try {
      const result = await queryFunction(...args);
      
      monitor.endTimer(timerName, {
        queryName,
        argsCount: args.length,
        success: true
      });
      
      return result;
    } catch (error) {
      monitor.endTimer(timerName, {
        queryName,
        argsCount: args.length,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };
}

// Optimized pagination middleware
export function paginationMiddleware(
  options: {
    defaultLimit?: number;
    maxLimit?: number;
    defaultSort?: string;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      parseInt(req.query.limit as string) || options.defaultLimit || 50,
      options.maxLimit || 1000
    );
    const sortBy = (req.query.sortBy as string) || options.defaultSort || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder
    };
    
    // Add helper for response metadata
    res.setPaginationMeta = function(total: number) {
      const totalPages = Math.ceil(total / limit);
      
      this.set({
        'X-Total-Count': total.toString(),
        'X-Total-Pages': totalPages.toString(),
        'X-Current-Page': page.toString(),
        'X-Per-Page': limit.toString()
      });
      
      return this;
    };
    
    next();
  };
}

// Rate limiting middleware
export function rateLimitMiddleware(
  options: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    skipIf?: (req: Request) => boolean;
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skipIf && options.skipIf(req)) {
      return next();
    }
    
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : req.ip || 'unknown';
    
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime <= windowStart) {
        requests.delete(k);
      }
    }
    
    // Check current request count
    const current = requests.get(key);
    if (!current) {
      requests.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }
    
    if (current.count >= options.maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': current.resetTime.toString(),
        'Retry-After': retryAfter.toString()
      });
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter
      });
    }
    
    current.count++;
    
    res.set({
      'X-RateLimit-Limit': options.maxRequests.toString(),
      'X-RateLimit-Remaining': (options.maxRequests - current.count).toString(),
      'X-RateLimit-Reset': current.resetTime.toString()
    });
    
    next();
  };
}

// Compression middleware configuration
export function compressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip compression for small responses
    const originalJson = res.json;
    res.json = function(body: any) {
      const bodyString = JSON.stringify(body);
      
      if (bodyString.length > 1024 && req.get('Accept-Encoding')?.includes('gzip')) {
        res.set('Content-Encoding', 'gzip');
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

// Health check endpoint with performance metrics
export function healthCheckEndpoint(monitor: PerformanceMonitor = performanceMonitor) {
  return (req: Request, res: Response) => {
    const stats = monitor.getStats(300000); // Last 5 minutes
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      performance: {
        averageResponseTime: stats.averageDuration,
        p95ResponseTime: stats.p95Duration,
        errorRate: stats.errorRate,
        totalRequests: stats.totalMetrics
      },
      cache: defaultCacheManager.getAllStats()
    };
    
    res.json(health);
  };
}

// Error handling middleware with performance tracking
export function errorHandlingMiddleware(monitor: PerformanceMonitor = performanceMonitor) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Record error metric
    monitor.recordMetric(`error:${req.method}_${req.path}`, 0, {
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack }),
      requestId: req.get('X-Request-ID') || 'unknown'
    });
  };
}

// Performance metrics endpoint
export function performanceMetricsEndpoint(monitor: PerformanceMonitor = performanceMonitor) {
  return (req: Request, res: Response) => {
    const timeRange = parseInt(req.query.timeRange as string) || 300000; // 5 minutes default
    const stats = monitor.getStats(timeRange);
    
    res.json({
      timeRange: timeRange / 1000, // Convert to seconds
      metrics: stats,
      timestamp: new Date().toISOString()
    });
  };
}

// Declare module augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
        sortBy: string;
        sortOrder: 'ASC' | 'DESC';
      };
    }
    
    interface Response {
      setPaginationMeta?(total: number): Response;
    }
  }
}