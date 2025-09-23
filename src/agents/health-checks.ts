import { DynamoDB, Lambda, SQS, S3 } from 'aws-sdk';
import { logger } from '../services/logging.service';

export interface HealthCheck {
  name: string;
  type: 'database' | 'lambda' | 'queue' | 'storage' | 'external-api' | 'custom';
  description: string;
  timeout: number;
  retryCount: number;
  critical: boolean;
}

export interface HealthCheckExecutor {
  execute(params?: any): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  responseTime: number;
  message: string;
  details?: any;
  timestamp: string;
}

export interface DependencyHealthCheck extends HealthCheck {
  endpoint?: string;
  credentials?: any;
  expectedResponse?: any;
}

export interface HealthCheckRegistry {
  checks: Map<string, HealthCheckExecutor>;
  register(name: string, executor: HealthCheckExecutor): void;
  execute(name: string, params?: any): Promise<HealthCheckResult>;
  executeAll(filter?: string[]): Promise<HealthCheckResult[]>;
}

export class DatabaseHealthCheck implements HealthCheckExecutor {
  private dynamoDB: DynamoDB;
  private tableName: string;

  constructor(tableName: string, region: string = 'us-east-1') {
    this.dynamoDB = new DynamoDB({ region });
    this.tableName = tableName;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Test table access with a simple describe operation
      const result = await this.dynamoDB.describeTable({
        TableName: this.tableName
      }).promise();

      const responseTime = Date.now() - startTime;

      if (result.Table?.TableStatus === 'ACTIVE') {
        return {
          name: 'database',
          status: 'pass',
          responseTime,
          message: `Database table ${this.tableName} is active`,
          details: {
            tableName: this.tableName,
            status: result.Table.TableStatus,
            itemCount: result.Table.ItemCount
          },
          timestamp
        };
      } else {
        return {
          name: 'database',
          status: 'warn',
          responseTime,
          message: `Database table ${this.tableName} status: ${result.Table?.TableStatus}`,
          details: {
            tableName: this.tableName,
            status: result.Table?.TableStatus
          },
          timestamp
        };
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Database health check failed: ${error.message}`,
        details: {
          tableName: this.tableName,
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class LambdaHealthCheck implements HealthCheckExecutor {
  private lambda: Lambda;
  private functionName: string;

  constructor(functionName: string, region: string = 'us-east-1') {
    this.lambda = new Lambda({ region });
    this.functionName = functionName;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Test lambda function with a dry run invocation
      const result = await this.lambda.invoke({
        FunctionName: this.functionName,
        InvocationType: 'DryRun'
      }).promise();

      const responseTime = Date.now() - startTime;

      if (result.StatusCode === 204) {
        return {
          name: 'lambda',
          status: 'pass',
          responseTime,
          message: `Lambda function ${this.functionName} is available`,
          details: {
            functionName: this.functionName,
            statusCode: result.StatusCode
          },
          timestamp
        };
      } else {
        return {
          name: 'lambda',
          status: 'warn',
          responseTime,
          message: `Lambda function ${this.functionName} returned status ${result.StatusCode}`,
          details: {
            functionName: this.functionName,
            statusCode: result.StatusCode,
            error: result.FunctionError
          },
          timestamp
        };
      }
    } catch (error) {
      return {
        name: 'lambda',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Lambda health check failed: ${error.message}`,
        details: {
          functionName: this.functionName,
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class QueueHealthCheck implements HealthCheckExecutor {
  private sqs: SQS;
  private queueUrl: string;

  constructor(queueUrl: string, region: string = 'us-east-1') {
    this.sqs = new SQS({ region });
    this.queueUrl = queueUrl;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Get queue attributes to test access
      const result = await this.sqs.getQueueAttributes({
        QueueUrl: this.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
      }).promise();

      const responseTime = Date.now() - startTime;
      const messageCount = parseInt(result.Attributes?.ApproximateNumberOfMessages || '0');
      const inFlightCount = parseInt(result.Attributes?.ApproximateNumberOfMessagesNotVisible || '0');

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = `Queue ${this.queueUrl.split('/').pop()} is accessible`;

      // Check for queue depth issues
      if (messageCount > 1000) {
        status = 'warn';
        message = `Queue has high message count: ${messageCount}`;
      }

      return {
        name: 'queue',
        status,
        responseTime,
        message,
        details: {
          queueUrl: this.queueUrl,
          messageCount,
          inFlightCount
        },
        timestamp
      };
    } catch (error) {
      return {
        name: 'queue',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Queue health check failed: ${error.message}`,
        details: {
          queueUrl: this.queueUrl,
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class StorageHealthCheck implements HealthCheckExecutor {
  private s3: S3;
  private bucketName: string;

  constructor(bucketName: string, region: string = 'us-east-1') {
    this.s3 = new S3({ region });
    this.bucketName = bucketName;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Test bucket access with head bucket operation
      await this.s3.headBucket({
        Bucket: this.bucketName
      }).promise();

      const responseTime = Date.now() - startTime;

      return {
        name: 'storage',
        status: 'pass',
        responseTime,
        message: `S3 bucket ${this.bucketName} is accessible`,
        details: {
          bucketName: this.bucketName
        },
        timestamp
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Storage health check failed: ${error.message}`,
        details: {
          bucketName: this.bucketName,
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class ExternalAPIHealthCheck implements HealthCheckExecutor {
  private apiUrl: string;
  private expectedStatus: number;
  private apiKey?: string;

  constructor(apiUrl: string, expectedStatus: number = 200, apiKey?: string) {
    this.apiUrl = apiUrl;
    this.expectedStatus = expectedStatus;
    this.apiKey = apiKey;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const headers: any = {
        'User-Agent': 'CurriculumAlignment-HealthCheck/1.0'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers,
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;

      if (response.status === this.expectedStatus) {
        return {
          name: 'external-api',
          status: 'pass',
          responseTime,
          message: `External API ${this.apiUrl} is responding`,
          details: {
            url: this.apiUrl,
            status: response.status,
            statusText: response.statusText
          },
          timestamp
        };
      } else {
        return {
          name: 'external-api',
          status: 'warn',
          responseTime,
          message: `External API returned unexpected status: ${response.status}`,
          details: {
            url: this.apiUrl,
            status: response.status,
            statusText: response.statusText,
            expected: this.expectedStatus
          },
          timestamp
        };
      }
    } catch (error) {
      return {
        name: 'external-api',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `External API health check failed: ${error.message}`,
        details: {
          url: this.apiUrl,
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class MemoryHealthCheck implements HealthCheckExecutor {
  private warningThresholdMB: number;
  private criticalThresholdMB: number;

  constructor(warningThresholdMB: number = 800, criticalThresholdMB: number = 1000) {
    this.warningThresholdMB = warningThresholdMB;
    this.criticalThresholdMB = criticalThresholdMB;
  }

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const memUsage = process.memoryUsage();
      const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const externalMB = Math.round(memUsage.external / 1024 / 1024);

      const responseTime = Date.now() - startTime;

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = `Memory usage is normal: ${usedMB}MB`;

      if (usedMB > this.criticalThresholdMB) {
        status = 'fail';
        message = `Critical memory usage: ${usedMB}MB (threshold: ${this.criticalThresholdMB}MB)`;
      } else if (usedMB > this.warningThresholdMB) {
        status = 'warn';
        message = `High memory usage: ${usedMB}MB (threshold: ${this.warningThresholdMB}MB)`;
      }

      return {
        name: 'memory',
        status,
        responseTime,
        message,
        details: {
          heapUsedMB: usedMB,
          heapTotalMB: totalMB,
          externalMB,
          warningThresholdMB: this.warningThresholdMB,
          criticalThresholdMB: this.criticalThresholdMB
        },
        timestamp
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: `Memory health check failed: ${error.message}`,
        details: {
          error: error.message
        },
        timestamp
      };
    }
  }
}

export class HealthCheckRegistryImpl implements HealthCheckRegistry {
  public checks: Map<string, HealthCheckExecutor>;

  constructor() {
    this.checks = new Map();
  }

  register(name: string, executor: HealthCheckExecutor): void {
    this.checks.set(name, executor);
    logger.info('Health check registered', { name });
  }

  async execute(name: string, params?: any): Promise<HealthCheckResult> {
    const executor = this.checks.get(name);
    if (!executor) {
      throw new Error(`Health check '${name}' not found`);
    }

    try {
      const result = await executor.execute(params);
      logger.debug('Health check executed', {
        name,
        status: result.status,
        responseTime: result.responseTime
      });
      return result;
    } catch (error) {
      logger.error('Health check execution failed', {
        name,
        error: error.message
      });
      
      return {
        name,
        status: 'fail',
        responseTime: 0,
        message: `Health check execution failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeAll(filter?: string[]): Promise<HealthCheckResult[]> {
    const checksToRun = filter 
      ? Array.from(this.checks.keys()).filter(name => filter.includes(name))
      : Array.from(this.checks.keys());

    const results = await Promise.allSettled(
      checksToRun.map(name => this.execute(name))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: checksToRun[index],
          status: 'fail' as const,
          responseTime: 0,
          message: `Health check failed: ${result.reason.message}`,
          timestamp: new Date().toISOString()
        };
      }
    });
  }
}

// Factory functions
export function createDatabaseHealthCheck(tableName: string, region?: string): DatabaseHealthCheck {
  return new DatabaseHealthCheck(tableName, region);
}

export function createLambdaHealthCheck(functionName: string, region?: string): LambdaHealthCheck {
  return new LambdaHealthCheck(functionName, region);
}

export function createQueueHealthCheck(queueUrl: string, region?: string): QueueHealthCheck {
  return new QueueHealthCheck(queueUrl, region);
}

export function createStorageHealthCheck(bucketName: string, region?: string): StorageHealthCheck {
  return new StorageHealthCheck(bucketName, region);
}

export function createExternalAPIHealthCheck(apiUrl: string, expectedStatus?: number, apiKey?: string): ExternalAPIHealthCheck {
  return new ExternalAPIHealthCheck(apiUrl, expectedStatus, apiKey);
}

export function createMemoryHealthCheck(warningThresholdMB?: number, criticalThresholdMB?: number): MemoryHealthCheck {
  return new MemoryHealthCheck(warningThresholdMB, criticalThresholdMB);
}

export function createHealthCheckRegistry(): HealthCheckRegistry {
  return new HealthCheckRegistryImpl();
}

// Utility function to setup standard health checks for an agent
export function setupStandardHealthChecks(
  registry: HealthCheckRegistry,
  config: {
    tableName?: string;
    queueUrl?: string;
    bucketName?: string;
    externalAPIs?: { url: string; expectedStatus?: number; apiKey?: string }[];
    region?: string;
  }
): void {
  const region = config.region || process.env.AWS_REGION || 'us-east-1';

  // Memory check
  registry.register('memory', createMemoryHealthCheck());

  // Database check
  if (config.tableName) {
    registry.register('database', createDatabaseHealthCheck(config.tableName, region));
  }

  // Queue check
  if (config.queueUrl) {
    registry.register('queue', createQueueHealthCheck(config.queueUrl, region));
  }

  // Storage check
  if (config.bucketName) {
    registry.register('storage', createStorageHealthCheck(config.bucketName, region));
  }

  // External API checks
  if (config.externalAPIs) {
    config.externalAPIs.forEach((api, index) => {
      registry.register(
        `external-api-${index}`,
        createExternalAPIHealthCheck(api.url, api.expectedStatus, api.apiKey)
      );
    });
  }

  logger.info('Standard health checks configured', {
    checks: Array.from(registry.checks.keys())
  });
}