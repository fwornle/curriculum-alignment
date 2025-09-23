/**
 * Error Types and Classifications
 * 
 * Comprehensive error type definitions for proper error handling,
 * categorization, and retry logic throughout the application.
 */

/**
 * Base error interface that all custom errors extend
 */
export interface BaseError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  context?: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  agentType?: string;
  cause?: Error;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Retry strategies
 */
export enum RetryStrategy {
  NONE = 'none',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  FIXED_INTERVAL = 'fixed_interval',
  IMMEDIATE = 'immediate',
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Authentication errors
 */
export class AuthenticationError extends Error implements BaseError {
  readonly code = 'AUTH_ERROR';
  readonly category = ErrorCategory.AUTHENTICATION;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends Error implements BaseError {
  readonly code = 'AUTHZ_ERROR';
  readonly category = ErrorCategory.AUTHORIZATION;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends Error implements BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly category = ErrorCategory.VALIDATION;
  readonly severity = ErrorSeverity.LOW;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public validationErrors?: Array<{ field: string; message: string }>,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends Error implements BaseError {
  readonly code = 'BUSINESS_ERROR';
  readonly category = ErrorCategory.BUSINESS_LOGIC;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public businessRule?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

/**
 * External service errors (APIs, LLMs, etc.)
 */
export class ExternalServiceError extends Error implements BaseError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly category = ErrorCategory.EXTERNAL_SERVICE;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public serviceName: string,
    public statusCode?: number,
    public serviceResponse?: any,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database errors
 */
export class DatabaseError extends Error implements BaseError {
  readonly code = 'DATABASE_ERROR';
  readonly category = ErrorCategory.DATABASE;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public operation: string,
    public sqlState?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Network errors
 */
export class NetworkError extends Error implements BaseError {
  readonly code = 'NETWORK_ERROR';
  readonly category = ErrorCategory.NETWORK;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public networkCode?: string,
    public url?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * System errors (file system, memory, etc.)
 */
export class SystemError extends Error implements BaseError {
  readonly code = 'SYSTEM_ERROR';
  readonly category = ErrorCategory.SYSTEM;
  readonly severity = ErrorSeverity.CRITICAL;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public systemComponent: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SystemError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends Error implements BaseError {
  readonly code = 'CONFIG_ERROR';
  readonly category = ErrorCategory.CONFIGURATION;
  readonly severity = ErrorSeverity.CRITICAL;
  readonly retryable = false;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public configKey?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends Error implements BaseError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly category = ErrorCategory.RATE_LIMIT;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public retryAfterMs?: number,
    public service?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends Error implements BaseError {
  readonly code = 'TIMEOUT_ERROR';
  readonly category = ErrorCategory.TIMEOUT;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public timeoutMs: number,
    public operation?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Agent-specific errors
 */
export class AgentError extends Error implements BaseError {
  readonly code = 'AGENT_ERROR';
  readonly category = ErrorCategory.BUSINESS_LOGIC;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public agentType: string,
    public operation: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

/**
 * LLM-specific errors
 */
export class LLMError extends Error implements BaseError {
  readonly code = 'LLM_ERROR';
  readonly category = ErrorCategory.EXTERNAL_SERVICE;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public provider: string,
    public model: string,
    public errorType: 'quota_exceeded' | 'invalid_request' | 'model_unavailable' | 'content_filter' | 'unknown',
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Document processing errors
 */
export class DocumentProcessingError extends Error implements BaseError {
  readonly code = 'DOCUMENT_ERROR';
  readonly category = ErrorCategory.BUSINESS_LOGIC;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public documentType: string,
    public processingStep: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

/**
 * Storage errors (S3, file system, etc.)
 */
export class StorageError extends Error implements BaseError {
  readonly code = 'STORAGE_ERROR';
  readonly category = ErrorCategory.EXTERNAL_SERVICE;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;
  readonly timestamp = new Date();

  constructor(
    message: string,
    public storageType: string,
    public operation: string,
    public resourcePath?: string,
    public context?: Record<string, any>,
    public correlationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Error factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create authentication error
   */
  static authentication(message: string, context?: Record<string, any>): AuthenticationError {
    return new AuthenticationError(message, context);
  }

  /**
   * Create authorization error
   */
  static authorization(message: string, context?: Record<string, any>): AuthorizationError {
    return new AuthorizationError(message, context);
  }

  /**
   * Create validation error
   */
  static validation(
    message: string, 
    validationErrors?: Array<{ field: string; message: string }>,
    context?: Record<string, any>
  ): ValidationError {
    return new ValidationError(message, validationErrors, context);
  }

  /**
   * Create business logic error
   */
  static businessLogic(message: string, businessRule?: string, context?: Record<string, any>): BusinessLogicError {
    return new BusinessLogicError(message, businessRule, context);
  }

  /**
   * Create external service error
   */
  static externalService(
    message: string,
    serviceName: string,
    statusCode?: number,
    serviceResponse?: any,
    context?: Record<string, any>
  ): ExternalServiceError {
    return new ExternalServiceError(message, serviceName, statusCode, serviceResponse, context);
  }

  /**
   * Create database error
   */
  static database(message: string, operation: string, context?: Record<string, any>): DatabaseError {
    return new DatabaseError(message, operation, undefined, context);
  }

  /**
   * Create network error
   */
  static network(message: string, url?: string, context?: Record<string, any>): NetworkError {
    return new NetworkError(message, undefined, url, context);
  }

  /**
   * Create system error
   */
  static system(message: string, systemComponent: string, context?: Record<string, any>): SystemError {
    return new SystemError(message, systemComponent, context);
  }

  /**
   * Create configuration error
   */
  static configuration(message: string, configKey?: string, context?: Record<string, any>): ConfigurationError {
    return new ConfigurationError(message, configKey, context);
  }

  /**
   * Create rate limit error
   */
  static rateLimit(message: string, retryAfterMs?: number, service?: string, context?: Record<string, any>): RateLimitError {
    return new RateLimitError(message, retryAfterMs, service, context);
  }

  /**
   * Create timeout error
   */
  static timeout(message: string, timeoutMs: number, operation?: string, context?: Record<string, any>): TimeoutError {
    return new TimeoutError(message, timeoutMs, operation, context);
  }

  /**
   * Create agent error
   */
  static agent(message: string, agentType: string, operation: string, context?: Record<string, any>): AgentError {
    return new AgentError(message, agentType, operation, context);
  }

  /**
   * Create LLM error
   */
  static llm(
    message: string,
    provider: string,
    model: string,
    errorType: 'quota_exceeded' | 'invalid_request' | 'model_unavailable' | 'content_filter' | 'unknown',
    context?: Record<string, any>
  ): LLMError {
    return new LLMError(message, provider, model, errorType, context);
  }

  /**
   * Create document processing error
   */
  static documentProcessing(
    message: string,
    documentType: string,
    processingStep: string,
    context?: Record<string, any>
  ): DocumentProcessingError {
    return new DocumentProcessingError(message, documentType, processingStep, context);
  }

  /**
   * Create storage error
   */
  static storage(
    message: string,
    storageType: string,
    operation: string,
    resourcePath?: string,
    context?: Record<string, any>
  ): StorageError {
    return new StorageError(message, storageType, operation, resourcePath, context);
  }
}

/**
 * Error classification utilities
 */
export class ErrorClassifier {
  /**
   * Determine if an error is retryable
   */
  static isRetryable(error: Error): boolean {
    if ('retryable' in error) {
      return (error as BaseError).retryable;
    }

    // Default classification for standard errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return true;
    }

    if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
      return true;
    }

    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return true;
    }

    return false;
  }

  /**
   * Get error category
   */
  static getCategory(error: Error): ErrorCategory {
    if ('category' in error) {
      return (error as BaseError).category;
    }

    // Default classification
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    if (error.message.includes('network') || error.message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }

    if (error.message.includes('database') || error.message.includes('sql')) {
      return ErrorCategory.DATABASE;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Get error severity
   */
  static getSeverity(error: Error): ErrorSeverity {
    if ('severity' in error) {
      return (error as BaseError).severity;
    }

    const category = this.getCategory(error);

    switch (category) {
      case ErrorCategory.SYSTEM:
      case ErrorCategory.CONFIGURATION:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.DATABASE:
      case ErrorCategory.EXTERNAL_SERVICE:
        return ErrorSeverity.HIGH;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.BUSINESS_LOGIC:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Get appropriate retry strategy for error
   */
  static getRetryStrategy(error: Error): RetryStrategy {
    if (!this.isRetryable(error)) {
      return RetryStrategy.NONE;
    }

    const category = this.getCategory(error);

    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return RetryStrategy.EXPONENTIAL;
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return RetryStrategy.EXPONENTIAL;
      case ErrorCategory.EXTERNAL_SERVICE:
        return RetryStrategy.EXPONENTIAL;
      case ErrorCategory.DATABASE:
        return RetryStrategy.LINEAR;
      default:
        return RetryStrategy.FIXED_INTERVAL;
    }
  }
}

/**
 * Default retry configurations by error category
 */
export const DEFAULT_RETRY_CONFIGS: Record<ErrorCategory, RetryConfig> = {
  [ErrorCategory.AUTHENTICATION]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.AUTHORIZATION]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.VALIDATION]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.BUSINESS_LOGIC]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.EXTERNAL_SERVICE]: {
    strategy: RetryStrategy.EXPONENTIAL,
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 500,
  },
  [ErrorCategory.DATABASE]: {
    strategy: RetryStrategy.LINEAR,
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    jitterMs: 100,
  },
  [ErrorCategory.NETWORK]: {
    strategy: RetryStrategy.EXPONENTIAL,
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 500,
  },
  [ErrorCategory.SYSTEM]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.CONFIGURATION]: {
    strategy: RetryStrategy.NONE,
    maxAttempts: 0,
    baseDelayMs: 0,
    maxDelayMs: 0,
  },
  [ErrorCategory.RATE_LIMIT]: {
    strategy: RetryStrategy.EXPONENTIAL,
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterMs: 1000,
  },
  [ErrorCategory.TIMEOUT]: {
    strategy: RetryStrategy.EXPONENTIAL,
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    jitterMs: 500,
  },
  [ErrorCategory.UNKNOWN]: {
    strategy: RetryStrategy.FIXED_INTERVAL,
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    jitterMs: 200,
  },
};