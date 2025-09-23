/**
 * Error Handler Utilities
 * 
 * Comprehensive error handling framework with retry logic, circuit breaker,
 * error classification, and proper logging integration.
 */

import { 
  BaseError, 
  ErrorCategory, 
  ErrorSeverity, 
  RetryStrategy, 
  RetryConfig, 
  ErrorClassifier,
  DEFAULT_RETRY_CONFIGS,
  TimeoutError,
  ExternalServiceError,
  NetworkError,
  RateLimitError
} from '../types/errors';
import { logger } from '../services/logging.service';
import { metrics } from '../services/metrics.service';

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  error: Error;
  delayMs: number;
  totalElapsedMs: number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: RetryAttempt[];
  totalDuration: number;
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringPeriodMs: number;
  minimumThroughput: number;
}

/**
 * Circuit breaker statistics
 */
interface CircuitBreakerStats {
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableRetry: boolean;
  enableCircuitBreaker: boolean;
  enableMetrics: boolean;
  enableLogging: boolean;
  defaultRetryConfig: RetryConfig;
  circuitBreakerConfig: CircuitBreakerConfig;
}

/**
 * Operation context for error handling
 */
export interface OperationContext {
  operationName: string;
  agentType?: string;
  userId?: string;
  correlationId?: string;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  circuitBreakerKey?: string;
}

/**
 * Retry mechanism with configurable strategies
 */
export class RetryHandler {
  /**
   * Execute operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: OperationContext
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts + 1; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if there were previous failures
        if (attempts.length > 0) {
          logger.info('Operation succeeded after retry', {
            operationName: context.operationName,
            attempt,
            totalAttempts: attempts.length + 1,
            totalDuration: Date.now() - startTime,
            correlationId: context.correlationId,
          });
        }

        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error as Error;
        
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          error: lastError,
          delayMs: 0,
          totalElapsedMs: Date.now() - startTime,
        };

        attempts.push(attemptInfo);

        // Check if we should retry
        if (attempt <= config.maxAttempts && this.shouldRetry(lastError, config)) {
          const delayMs = this.calculateDelay(attempt, config);
          attemptInfo.delayMs = delayMs;

          logger.warn('Operation failed, retrying', {
            operationName: context.operationName,
            attempt,
            maxAttempts: config.maxAttempts,
            delayMs,
            error: lastError.message,
            errorCategory: ErrorClassifier.getCategory(lastError),
            correlationId: context.correlationId,
          });

          // Record retry metric
          metrics.counter('operation.retry', 1, [
            { Name: 'Operation', Value: context.operationName },
            { Name: 'ErrorCategory', Value: ErrorClassifier.getCategory(lastError) },
          ]);

          await this.sleep(delayMs);
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    logger.error('Operation failed after all retries', lastError!, {
      operationName: context.operationName,
      totalAttempts: attempts.length,
      totalDuration: Date.now() - startTime,
      correlationId: context.correlationId,
    });

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Determine if error should be retried
   */
  private static shouldRetry(error: Error, config: RetryConfig): boolean {
    if (config.retryCondition) {
      return config.retryCondition(error);
    }

    return ErrorClassifier.isRetryable(error);
  }

  /**
   * Calculate delay based on retry strategy
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.strategy) {
      case RetryStrategy.LINEAR:
        delay = config.baseDelayMs * attempt;
        break;
      
      case RetryStrategy.EXPONENTIAL:
        delay = config.baseDelayMs * Math.pow(config.backoffMultiplier || 2, attempt - 1);
        break;
      
      case RetryStrategy.FIXED_INTERVAL:
        delay = config.baseDelayMs;
        break;
      
      case RetryStrategy.IMMEDIATE:
        delay = 0;
        break;
      
      default:
        delay = config.baseDelayMs;
    }

    // Apply jitter
    if (config.jitterMs) {
      const jitter = Math.random() * config.jitterMs;
      delay += jitter;
    }

    // Cap at maximum delay
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private static instances = new Map<string, CircuitBreaker>();
  private state = CircuitBreakerState.CLOSED;
  private stats: CircuitBreakerStats = {
    failures: 0,
    successes: 0,
    requests: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
  };

  constructor(
    private key: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Get or create circuit breaker instance
   */
  static getInstance(key: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.instances.has(key)) {
      this.instances.set(key, new CircuitBreaker(key, config));
    }
    return this.instances.get(key)!;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>, context: OperationContext): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.stats.lastFailureTime >= this.config.recoveryTimeoutMs) {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info('Circuit breaker transitioning to half-open', {
          key: this.key,
          operationName: context.operationName,
        });
      } else {
        const error = new ExternalServiceError(
          'Circuit breaker is open',
          this.key,
          503,
          undefined,
          { circuitBreakerState: this.state }
        );
        throw error;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.requests++;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.stats.failures = 0;
      logger.info('Circuit breaker closed after successful half-open test', {
        key: this.key,
      });
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.requests++;
    this.stats.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn('Circuit breaker opened after half-open failure', {
        key: this.key,
      });
    } else if (this.shouldTripCircuit()) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn('Circuit breaker tripped', {
        key: this.key,
        failures: this.stats.failures,
        requests: this.stats.requests,
        failureRate: this.getFailureRate(),
      });
    }
  }

  /**
   * Check if circuit should be tripped
   */
  private shouldTripCircuit(): boolean {
    if (this.stats.requests < this.config.minimumThroughput) {
      return false;
    }

    const failureRate = this.getFailureRate();
    return failureRate >= this.config.failureThreshold;
  }

  /**
   * Get current failure rate
   */
  private getFailureRate(): number {
    if (this.stats.requests === 0) return 0;
    return this.stats.failures / this.stats.requests;
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      stats: { ...this.stats },
      failureRate: this.getFailureRate(),
    };
  }
}

/**
 * Timeout wrapper
 */
export class TimeoutWrapper {
  /**
   * Execute operation with timeout
   */
  static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context: OperationContext
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(
          `Operation timed out after ${timeoutMs}ms`,
          timeoutMs,
          context.operationName,
          { correlationId: context.correlationId }
        ));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

/**
 * Main Error Handler
 */
export class ErrorHandler {
  private static defaultConfig: ErrorHandlerConfig = {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableLogging: true,
    defaultRetryConfig: {
      strategy: RetryStrategy.EXPONENTIAL,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 500,
    },
    circuitBreakerConfig: {
      failureThreshold: 0.5,
      recoveryTimeoutMs: 60000,
      monitoringPeriodMs: 300000,
      minimumThroughput: 10,
    },
  };

  private config: ErrorHandlerConfig;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = { ...ErrorHandler.defaultConfig, ...config };
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Prepare operation with timeout if specified
      let wrappedOperation = operation;
      if (context.timeout) {
        wrappedOperation = () => TimeoutWrapper.executeWithTimeout(
          operation,
          context.timeout!,
          context
        );
      }

      // Prepare operation with circuit breaker if enabled
      if (this.config.enableCircuitBreaker && context.circuitBreakerKey) {
        const circuitBreaker = CircuitBreaker.getInstance(
          context.circuitBreakerKey,
          this.config.circuitBreakerConfig
        );
        const originalOperation = wrappedOperation;
        wrappedOperation = () => circuitBreaker.execute(originalOperation, context);
      }

      // Prepare operation with retry if enabled
      if (this.config.enableRetry) {
        const retryConfig = {
          ...this.getRetryConfig(context),
          ...context.retryConfig,
        };

        const retryResult = await RetryHandler.executeWithRetry(
          wrappedOperation,
          retryConfig,
          context
        );

        if (!retryResult.success) {
          throw retryResult.error;
        }

        // Record metrics for successful operation
        if (this.config.enableMetrics) {
          this.recordMetrics(context, null, retryResult.totalDuration, retryResult.attempts.length);
        }

        return retryResult.result!;

      } else {
        // Execute without retry
        const result = await wrappedOperation();
        
        if (this.config.enableMetrics) {
          this.recordMetrics(context, null, Date.now() - startTime, 1);
        }

        return result;
      }

    } catch (error) {
      const finalError = this.enhanceError(error as Error, context);
      
      if (this.config.enableLogging) {
        this.logError(finalError, context);
      }

      if (this.config.enableMetrics) {
        this.recordMetrics(context, finalError, Date.now() - startTime, 1);
      }

      throw finalError;
    }
  }

  /**
   * Handle error without retry (for immediate error processing)
   */
  handleError(error: Error, context: OperationContext): BaseError {
    const enhancedError = this.enhanceError(error, context);
    
    if (this.config.enableLogging) {
      this.logError(enhancedError, context);
    }

    if (this.config.enableMetrics) {
      this.recordMetrics(context, enhancedError, 0, 1);
    }

    return enhancedError;
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: Error, context: OperationContext): BaseError {
    // If already a BaseError, just add context
    if ('category' in error && 'severity' in error) {
      const baseError = error as BaseError;
      baseError.correlationId = context.correlationId;
      baseError.userId = context.userId;
      baseError.agentType = context.agentType;
      return baseError;
    }

    // Convert standard error to BaseError
    const category = ErrorClassifier.getCategory(error);
    const severity = ErrorClassifier.getSeverity(error);
    const retryable = ErrorClassifier.isRetryable(error);

    const enhancedError: BaseError = {
      ...error,
      code: error.name || 'UNKNOWN_ERROR',
      category,
      severity,
      retryable,
      context: {
        operationName: context.operationName,
        originalError: error.message,
      },
      timestamp: new Date(),
      correlationId: context.correlationId,
      userId: context.userId,
      agentType: context.agentType,
      cause: error,
    };

    return enhancedError;
  }

  /**
   * Get retry configuration for context
   */
  private getRetryConfig(context: OperationContext): RetryConfig {
    // Use operation-specific config if available
    if (context.retryConfig) {
      return { ...this.config.defaultRetryConfig, ...context.retryConfig };
    }

    return this.config.defaultRetryConfig;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: BaseError, context: OperationContext): void {
    const logContext = {
      component: 'error-handler',
      operation: context.operationName,
      correlationId: context.correlationId,
    };

    const metadata = {
      errorCode: error.code,
      errorCategory: error.category,
      errorSeverity: error.severity,
      retryable: error.retryable,
      userId: error.userId,
      agentType: error.agentType,
      context: error.context,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.fatal(error.message, error, metadata, logContext);
        break;
      case ErrorSeverity.HIGH:
        logger.error(error.message, error, metadata, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, metadata, logContext);
        break;
      case ErrorSeverity.LOW:
        logger.info(error.message, metadata, logContext);
        break;
    }
  }

  /**
   * Record error metrics
   */
  private recordMetrics(
    context: OperationContext,
    error: BaseError | null,
    duration: number,
    attempts: number
  ): void {
    const dimensions = [
      { Name: 'Operation', Value: context.operationName },
    ];

    if (context.agentType) {
      dimensions.push({ Name: 'AgentType', Value: context.agentType });
    }

    if (error) {
      dimensions.push(
        { Name: 'ErrorCategory', Value: error.category },
        { Name: 'ErrorSeverity', Value: error.severity }
      );

      metrics.counter('operation.error', 1, dimensions);
      metrics.counter(`operation.error.${error.category}`, 1, dimensions);
    } else {
      metrics.counter('operation.success', 1, dimensions);
    }

    metrics.gauge('operation.duration', duration, 'Milliseconds', dimensions);
    metrics.gauge('operation.attempts', attempts, 'Count', dimensions);
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

/**
 * Convenience functions for error handling
 */
export const handleError = {
  /**
   * Execute operation with error handling
   */
  execute: <T>(operation: () => Promise<T>, context: OperationContext) =>
    errorHandler.execute(operation, context),

  /**
   * Handle immediate error
   */
  handle: (error: Error, context: OperationContext) =>
    errorHandler.handleError(error, context),

  /**
   * Execute with simple retry
   */
  retry: <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    operationName: string = 'unknown'
  ) => RetryHandler.executeWithRetry(
    operation,
    DEFAULT_RETRY_CONFIGS[ErrorCategory.EXTERNAL_SERVICE],
    { operationName }
  ),

  /**
   * Execute with timeout
   */
  timeout: <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string = 'unknown'
  ) => TimeoutWrapper.executeWithTimeout(operation, timeoutMs, { operationName }),
};

export default ErrorHandler;