/**
 * Metrics Service
 * 
 * Service for collecting, aggregating, and sending application metrics
 * to CloudWatch for monitoring and alerting.
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum, StandardUnit } from '@aws-sdk/client-cloudwatch';
import { env } from '../config/environment';
import { AgentType } from '../database/models';

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

/**
 * Metric dimension
 */
export interface MetricDimension {
  Name: string;
  Value: string;
}

/**
 * Base metric interface
 */
export interface BaseMetric {
  name: string;
  value: number;
  unit: StandardUnit;
  timestamp?: Date;
  dimensions?: MetricDimension[];
  namespace?: string;
}

/**
 * Counter metric (always incrementing)
 */
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
}

/**
 * Gauge metric (point-in-time value)
 */
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
}

/**
 * Histogram metric (distribution of values)
 */
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  samples: number[];
  percentiles?: number[];
}

/**
 * Timer metric (duration measurements)
 */
export interface TimerMetric extends BaseMetric {
  type: MetricType.TIMER;
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Application-specific metrics
 */
export interface AgentMetrics {
  agentType: AgentType;
  executionCount: number;
  averageDuration: number;
  successRate: number;
  errorCount: number;
  costPerExecution?: number;
}

export interface LLMMetrics {
  provider: string;
  model: string;
  requestCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  averageLatency: number;
  errorRate: number;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueDepth: number;
  cacheHitRate: number;
}

export interface BusinessMetrics {
  analysesCompleted: number;
  documentsProcessed: number;
  userSessions: number;
  reportGenerated: number;
  averageProcessingTime: number;
}

/**
 * Metrics buffer for batching
 */
interface MetricsBuffer {
  metrics: MetricDatum[];
  namespace: string;
}

/**
 * Metrics Service Configuration
 */
export interface MetricsConfig {
  namespace: string;
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  defaultDimensions: MetricDimension[];
}

/**
 * Metrics Collection Service
 */
export class MetricsService {
  private client: CloudWatchClient;
  private config: MetricsConfig;
  private buffer: Map<string, MetricsBuffer> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private timers: Map<string, number> = new Map();

  constructor(config?: Partial<MetricsConfig>) {
    this.config = {
      namespace: 'CurriculumAlignment',
      enabled: env.NODE_ENV === 'production' || env.ENABLE_METRICS === 'true',
      batchSize: 20, // CloudWatch limit
      flushInterval: 60000, // 1 minute
      defaultDimensions: [
        { Name: 'Environment', Value: env.NODE_ENV },
        { Name: 'Service', Value: 'curriculum-alignment' },
      ],
      ...config,
    };

    this.client = new CloudWatchClient({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });

    if (this.config.enabled) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Record a counter metric (incremental value)
   */
  counter(name: string, value: number = 1, dimensions?: MetricDimension[]): void {
    this.recordMetric({
      name,
      value,
      unit: StandardUnit.Count,
      dimensions: this.mergeDimensions(dimensions),
      timestamp: new Date(),
    });
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  gauge(name: string, value: number, unit: StandardUnit = StandardUnit.None, dimensions?: MetricDimension[]): void {
    this.recordMetric({
      name,
      value,
      unit,
      dimensions: this.mergeDimensions(dimensions),
      timestamp: new Date(),
    });
  }

  /**
   * Start a timer
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * End a timer and record the duration
   */
  endTimer(name: string, dimensions?: MetricDimension[]): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      throw new Error(`Timer ${name} was not started`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name: `${name}.duration`,
      value: duration,
      unit: StandardUnit.Milliseconds,
      dimensions: this.mergeDimensions(dimensions),
      timestamp: new Date(),
    });

    return duration;
  }

  /**
   * Time an operation and record metrics
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    dimensions?: MetricDimension[]
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (error) {
      this.counter(`${name}.error`, 1, dimensions);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordMetric({
        name: `${name}.duration`,
        value: duration,
        unit: StandardUnit.Milliseconds,
        dimensions: this.mergeDimensions(dimensions),
        timestamp: new Date(),
      });

      this.counter(`${name}.${success ? 'success' : 'failure'}`, 1, dimensions);
    }
  }

  /**
   * Record agent execution metrics
   */
  recordAgentMetrics(metrics: AgentMetrics): void {
    const dimensions = [{ Name: 'AgentType', Value: metrics.agentType }];

    this.counter('agent.executions', metrics.executionCount, dimensions);
    this.gauge('agent.average_duration', metrics.averageDuration, StandardUnit.Milliseconds, dimensions);
    this.gauge('agent.success_rate', metrics.successRate, StandardUnit.Percent, dimensions);
    this.counter('agent.errors', metrics.errorCount, dimensions);

    if (metrics.costPerExecution !== undefined) {
      this.gauge('agent.cost_per_execution', metrics.costPerExecution, StandardUnit.None, dimensions);
    }
  }

  /**
   * Record LLM usage metrics
   */
  recordLLMMetrics(metrics: LLMMetrics): void {
    const dimensions = [
      { Name: 'Provider', Value: metrics.provider },
      { Name: 'Model', Value: metrics.model },
    ];

    this.counter('llm.requests', metrics.requestCount, dimensions);
    this.counter('llm.tokens.input', metrics.tokenUsage.input, dimensions);
    this.counter('llm.tokens.output', metrics.tokenUsage.output, dimensions);
    this.counter('llm.tokens.total', metrics.tokenUsage.total, dimensions);
    this.gauge('llm.cost', metrics.cost, StandardUnit.None, dimensions);
    this.gauge('llm.latency', metrics.averageLatency, StandardUnit.Milliseconds, dimensions);
    this.gauge('llm.error_rate', metrics.errorRate, StandardUnit.Percent, dimensions);
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(metrics: SystemMetrics): void {
    this.gauge('system.memory_usage', metrics.memoryUsage, StandardUnit.Bytes);
    this.gauge('system.cpu_usage', metrics.cpuUsage, StandardUnit.Percent);
    this.gauge('system.active_connections', metrics.activeConnections, StandardUnit.Count);
    this.gauge('system.queue_depth', metrics.queueDepth, StandardUnit.Count);
    this.gauge('system.cache_hit_rate', metrics.cacheHitRate, StandardUnit.Percent);
  }

  /**
   * Record business metrics
   */
  recordBusinessMetrics(metrics: BusinessMetrics): void {
    this.counter('business.analyses_completed', metrics.analysesCompleted);
    this.counter('business.documents_processed', metrics.documentsProcessed);
    this.gauge('business.user_sessions', metrics.userSessions, StandardUnit.Count);
    this.counter('business.reports_generated', metrics.reportGenerated);
    this.gauge('business.average_processing_time', metrics.averageProcessingTime, StandardUnit.Milliseconds);
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseMetrics(operation: string, duration: number, success: boolean): void {
    const dimensions = [{ Name: 'Operation', Value: operation }];
    
    this.gauge(`database.${operation}.duration`, duration, StandardUnit.Milliseconds, dimensions);
    this.counter(`database.${operation}.${success ? 'success' : 'failure'}`, 1, dimensions);
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpMetrics(method: string, endpoint: string, statusCode: number, duration: number): void {
    const dimensions = [
      { Name: 'Method', Value: method },
      { Name: 'Endpoint', Value: endpoint },
      { Name: 'StatusCode', Value: statusCode.toString() },
    ];

    this.counter('http.requests', 1, dimensions);
    this.gauge('http.duration', duration, StandardUnit.Milliseconds, dimensions);
    
    if (statusCode >= 400) {
      this.counter('http.errors', 1, dimensions);
    }
  }

  /**
   * Record cost metrics
   */
  recordCostMetrics(service: string, cost: number, currency: string = 'USD'): void {
    const dimensions = [
      { Name: 'Service', Value: service },
      { Name: 'Currency', Value: currency },
    ];

    this.gauge(`cost.${service}`, cost, StandardUnit.None, dimensions);
  }

  /**
   * Flush all buffered metrics to CloudWatch
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.buffer.size === 0) {
      return;
    }

    const promises = Array.from(this.buffer.entries()).map(async ([namespace, buffer]) => {
      if (buffer.metrics.length === 0) return;

      try {
        // Split into batches if needed
        const batches = this.chunkArray(buffer.metrics, this.config.batchSize);
        
        for (const batch of batches) {
          const command = new PutMetricDataCommand({
            Namespace: namespace,
            MetricData: batch,
          });

          await this.client.send(command);
        }

        // Clear the buffer after successful send
        buffer.metrics = [];

      } catch (error) {
        console.error(`Failed to send metrics to CloudWatch for namespace ${namespace}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return Array.from(this.buffer.values()).reduce((total, buffer) => total + buffer.metrics.length, 0);
  }

  /**
   * Clear all metrics buffers
   */
  clearBuffers(): void {
    this.buffer.clear();
  }

  /**
   * Stop metrics collection and flush remaining metrics
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
    this.clearBuffers();
  }

  /**
   * Health check for metrics service
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: string; bufferSize: number } {
    const bufferSize = this.getBufferSize();
    
    return {
      status: this.config.enabled ? 'healthy' : 'unhealthy',
      details: this.config.enabled ? 'Metrics collection enabled' : 'Metrics collection disabled',
      bufferSize,
    };
  }

  /**
   * Record a generic metric
   */
  private recordMetric(metric: BaseMetric): void {
    if (!this.config.enabled) return;

    const namespace = metric.namespace || this.config.namespace;
    
    // Get or create buffer for this namespace
    if (!this.buffer.has(namespace)) {
      this.buffer.set(namespace, { metrics: [], namespace });
    }

    const buffer = this.buffer.get(namespace)!;
    
    const metricDatum: MetricDatum = {
      MetricName: metric.name,
      Value: metric.value,
      Unit: metric.unit,
      Timestamp: metric.timestamp || new Date(),
      Dimensions: metric.dimensions,
    };

    buffer.metrics.push(metricDatum);

    // Auto-flush if buffer is getting full
    if (buffer.metrics.length >= this.config.batchSize) {
      this.flush().catch(error => 
        console.error('Auto-flush failed:', error)
      );
    }
  }

  /**
   * Merge dimensions with defaults
   */
  private mergeDimensions(dimensions?: MetricDimension[]): MetricDimension[] {
    return [
      ...this.config.defaultDimensions,
      ...(dimensions || []),
    ];
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Start periodic flush of metrics
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(error => 
        console.error('Periodic metrics flush failed:', error)
      );
    }, this.config.flushInterval);
  }
}

/**
 * Global metrics service instance
 */
export const metrics = new MetricsService();

/**
 * Convenience functions for common metrics
 */
export const metricsClient = {
  counter: (name: string, value?: number, dimensions?: MetricDimension[]) => 
    metrics.counter(name, value, dimensions),
  gauge: (name: string, value: number, unit?: StandardUnit, dimensions?: MetricDimension[]) => 
    metrics.gauge(name, value, unit, dimensions),
  startTimer: (name: string) => metrics.startTimer(name),
  endTimer: (name: string, dimensions?: MetricDimension[]) => metrics.endTimer(name, dimensions),
  time: <T>(name: string, operation: () => Promise<T>, dimensions?: MetricDimension[]) => 
    metrics.timeOperation(name, operation, dimensions),
  agent: (agentMetrics: AgentMetrics) => metrics.recordAgentMetrics(agentMetrics),
  llm: (llmMetrics: LLMMetrics) => metrics.recordLLMMetrics(llmMetrics),
  system: (systemMetrics: SystemMetrics) => metrics.recordSystemMetrics(systemMetrics),
  business: (businessMetrics: BusinessMetrics) => metrics.recordBusinessMetrics(businessMetrics),
  database: (operation: string, duration: number, success: boolean) => 
    metrics.recordDatabaseMetrics(operation, duration, success),
  http: (method: string, endpoint: string, statusCode: number, duration: number) => 
    metrics.recordHttpMetrics(method, endpoint, statusCode, duration),
  cost: (service: string, cost: number, currency?: string) => 
    metrics.recordCostMetrics(service, cost, currency),
  flush: () => metrics.flush(),
  health: () => metrics.healthCheck(),
};

export default metrics;