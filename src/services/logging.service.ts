/**
 * Logging Service
 * 
 * Centralized logging service for structured logging with CloudWatch integration.
 * Provides different log levels, structured formatting, and context enrichment.
 */

import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { env } from '../config/environment';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  error?: ErrorDetails;
  duration?: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  agentType?: string;
  traceId?: string;
}

/**
 * Log context information
 */
export interface LogContext {
  service: string;
  function?: string;
  component?: string;
  operation?: string;
  environment: string;
  version?: string;
  correlationId?: string;
}

/**
 * Error details for structured error logging
 */
export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  cause?: ErrorDetails;
}

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * CloudWatch log configuration
 */
interface CloudWatchConfig {
  logGroupName: string;
  logStreamName: string;
  region: string;
  enabled: boolean;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  cloudWatch: CloudWatchConfig;
  console: {
    enabled: boolean;
    prettyPrint: boolean;
  };
  context: LogContext;
}

/**
 * Centralized Logging Service
 */
export class LoggingService {
  private client: CloudWatchLogsClient;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private sequenceToken: string | undefined;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : 
             env.LOG_LEVEL === 'info' ? LogLevel.INFO :
             env.LOG_LEVEL === 'warn' ? LogLevel.WARN :
             env.LOG_LEVEL === 'error' ? LogLevel.ERROR : LogLevel.INFO,
      cloudWatch: {
        logGroupName: `/aws/lambda/curriculum-alignment-${env.NODE_ENV}`,
        logStreamName: `${env.NODE_ENV}-${Date.now()}`,
        region: env.AWS_REGION,
        enabled: env.NODE_ENV === 'production' || env.ENABLE_CLOUDWATCH_LOGS === 'true',
      },
      console: {
        enabled: true,
        prettyPrint: env.NODE_ENV === 'development',
      },
      context: {
        service: 'curriculum-alignment',
        environment: env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      },
      ...config,
    };

    this.client = new CloudWatchLogsClient({
      region: this.config.cloudWatch.region,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });

    // Initialize CloudWatch log group and stream
    if (this.config.cloudWatch.enabled) {
      this.initializeCloudWatch();
    }

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, metadata, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, metadata, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | ErrorDetails, metadata?: Record<string, any>, context?: Partial<LogContext>): void {
    const errorDetails = this.formatError(error);
    this.log(LogLevel.ERROR, message, metadata, context, errorDetails);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error | ErrorDetails, metadata?: Record<string, any>, context?: Partial<LogContext>): void {
    const errorDetails = this.formatError(error);
    this.log(LogLevel.FATAL, message, metadata, context, errorDetails);
  }

  /**
   * Log performance metrics
   */
  performance(metrics: PerformanceMetrics): void {
    this.info(`Performance: ${metrics.operationName}`, {
      duration: metrics.duration,
      startTime: metrics.startTime,
      endTime: metrics.endTime,
      success: metrics.success,
      ...metrics.metadata,
    }, {
      component: 'performance',
      operation: metrics.operationName,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): LoggingService {
    return new LoggingService({
      ...this.config,
      context: {
        ...this.config.context,
        ...context,
      },
    });
  }

  /**
   * Time an operation and log performance
   */
  async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      this.debug(`Starting operation: ${operationName}`, metadata);
      result = await operation();
      success = true;
      return result;
    } catch (error) {
      this.error(`Operation failed: ${operationName}`, error as Error, metadata);
      throw error;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.performance({
        operationName,
        duration,
        startTime,
        endTime,
        success,
        metadata,
      });
    }
  }

  /**
   * Flush all buffered logs to CloudWatch
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.cloudWatch.enabled) {
      return;
    }

    try {
      const logEvents = this.logBuffer.map(entry => ({
        timestamp: new Date(entry.timestamp).getTime(),
        message: JSON.stringify(entry),
      }));

      const command = new PutLogEventsCommand({
        logGroupName: this.config.cloudWatch.logGroupName,
        logStreamName: this.config.cloudWatch.logStreamName,
        logEvents,
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
      
      // Clear buffer after successful send
      this.logBuffer = [];

    } catch (error) {
      console.error('Failed to send logs to CloudWatch:', error);
      // Keep logs in buffer for retry
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Close logger and flush remaining logs
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    context?: Partial<LogContext>,
    error?: ErrorDetails,
    duration?: number
  ): void {
    // Check if this log level should be processed
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context: {
        ...this.config.context,
        ...context,
      },
      metadata,
      error,
      duration,
      requestId: this.getRequestId(),
      traceId: this.getTraceId(),
    };

    // Console logging
    if (this.config.console.enabled) {
      this.logToConsole(entry);
    }

    // CloudWatch logging (buffered)
    if (this.config.cloudWatch.enabled) {
      this.logBuffer.push(entry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.BUFFER_SIZE) {
        this.flush().catch(err => 
          console.error('Failed to flush logs:', err)
        );
      }
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
    };

    const resetColor = '\x1b[0m';
    const color = levelColors[entry.level] || '';

    if (this.config.console.prettyPrint) {
      console.log(
        `${color}[${entry.timestamp}] ${entry.levelName}${resetColor} ${entry.message}`,
        entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '',
        entry.error ? `\nError: ${JSON.stringify(entry.error, null, 2)}` : ''
      );
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Format error for structured logging
   */
  private formatError(error?: Error | ErrorDetails): ErrorDetails | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause ? this.formatError(error.cause as Error) : undefined,
      };
    }

    return error as ErrorDetails;
  }

  /**
   * Get request ID from context (AWS Lambda)
   */
  private getRequestId(): string | undefined {
    return process.env._X_AMZN_TRACE_ID || 
           process.env.AWS_REQUEST_ID ||
           (global as any).awsRequestId;
  }

  /**
   * Get trace ID for distributed tracing
   */
  private getTraceId(): string | undefined {
    return process.env._X_AMZN_TRACE_ID;
  }

  /**
   * Initialize CloudWatch log group and stream
   */
  private async initializeCloudWatch(): Promise<void> {
    try {
      // Create log group if it doesn't exist
      await this.client.send(new CreateLogGroupCommand({
        logGroupName: this.config.cloudWatch.logGroupName,
      }));
    } catch (error: any) {
      // Ignore if log group already exists
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('Failed to create log group:', error);
      }
    }

    try {
      // Create log stream
      await this.client.send(new CreateLogStreamCommand({
        logGroupName: this.config.cloudWatch.logGroupName,
        logStreamName: this.config.cloudWatch.logStreamName,
      }));
    } catch (error: any) {
      // Ignore if log stream already exists
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('Failed to create log stream:', error);
      }
    }
  }

  /**
   * Start periodic flush of logs
   */
  private startPeriodicFlush(): void {
    if (this.config.cloudWatch.enabled) {
      this.flushInterval = setInterval(() => {
        this.flush().catch(err => 
          console.error('Periodic flush failed:', err)
        );
      }, this.FLUSH_INTERVAL);
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new LoggingService();

/**
 * Convenience functions for common operations
 */
export const log = {
  debug: (message: string, metadata?: Record<string, any>, context?: Partial<LogContext>) => 
    logger.debug(message, metadata, context),
  info: (message: string, metadata?: Record<string, any>, context?: Partial<LogContext>) => 
    logger.info(message, metadata, context),
  warn: (message: string, metadata?: Record<string, any>, context?: Partial<LogContext>) => 
    logger.warn(message, metadata, context),
  error: (message: string, error?: Error | ErrorDetails, metadata?: Record<string, any>, context?: Partial<LogContext>) => 
    logger.error(message, error, metadata, context),
  fatal: (message: string, error?: Error | ErrorDetails, metadata?: Record<string, any>, context?: Partial<LogContext>) => 
    logger.fatal(message, error, metadata, context),
  performance: (metrics: PerformanceMetrics) => logger.performance(metrics),
  time: <T>(operationName: string, operation: () => Promise<T>, metadata?: Record<string, any>) => 
    logger.timeOperation(operationName, operation, metadata),
  child: (context: Partial<LogContext>) => logger.child(context),
};

export default logger;