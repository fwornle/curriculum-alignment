import { CloudWatch, DynamoDB } from 'aws-sdk';
import { EventEmitter } from 'events';
import { logger } from '../services/logging.service';
import { costTracker } from '../services/cost-tracking.service';

export interface AgentStatus {
  agentName: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline' | 'starting' | 'stopping';
  lastHeartbeat: string;
  version: string;
  environment: string;
  metrics: AgentMetrics;
  errors: AgentError[];
  dependencies: DependencyStatus[];
  configuration: AgentConfiguration;
  deploymentInfo: DeploymentInfo;
}

export interface AgentMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
  lastRequestTime: string;
  uptime: number;
  costMetrics: CostMetrics;
}

export interface AgentError {
  timestamp: string;
  level: 'warning' | 'error' | 'critical';
  message: string;
  stack?: string;
  context: any;
  resolved: boolean;
  acknowledgedBy?: string;
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'api' | 'queue' | 'storage' | 'cache';
  status: 'healthy' | 'degraded' | 'failed';
  responseTime: number;
  lastCheck: string;
  errorMessage?: string;
}

export interface AgentConfiguration {
  llmModel: string;
  maxConcurrentRequests: number;
  timeoutMs: number;
  retryCount: number;
  enabledFeatures: string[];
  resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxRequestsPerMinute: number;
  maxCostPerHour: number;
}

export interface DeploymentInfo {
  version: string;
  deployedAt: string;
  deployedBy: string;
  environment: string;
  region: string;
  instanceId: string;
}

export interface CostMetrics {
  hourlyRate: number;
  dailyCost: number;
  monthlyCost: number;
  llmTokenCost: number;
  infraCost: number;
  totalCost: number;
}

export interface MonitoringConfig {
  region: string;
  statusTableName: string;
  metricsNamespace: string;
  heartbeatIntervalMs: number;
  healthCheckTimeoutMs: number;
  alertThresholds: AlertThresholds;
  enableCostMonitoring: boolean;
  enablePerformanceMonitoring: boolean;
  retentionDays: number;
}

export interface AlertThresholds {
  errorRatePercent: number;
  responseTimeMs: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  costPerHourUSD: number;
  heartbeatTimeoutMs: number;
}

export interface HealthCheckResult {
  agentName: string;
  isHealthy: boolean;
  responseTime: number;
  checks: {
    [checkName: string]: {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      value?: any;
    };
  };
  timestamp: string;
}

export class AgentMonitoringService extends EventEmitter {
  private cloudWatch: CloudWatch;
  private dynamoDB: DynamoDB;
  private config: MonitoringConfig;
  private agentStatuses: Map<string, AgentStatus>;
  private healthCheckIntervals: Map<string, NodeJS.Timeout>;
  private isMonitoring: boolean = false;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.cloudWatch = new CloudWatch({ region: config.region });
    this.dynamoDB = new DynamoDB({ region: config.region });
    this.agentStatuses = new Map();
    this.healthCheckIntervals = new Map();
  }

  /**
   * Start monitoring service
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Monitoring service already started');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting agent monitoring service', {
      config: this.config
    });

    // Initialize status table if needed
    await this.initializeStatusTable();

    // Start background monitoring tasks
    this.startPeriodicTasks();

    this.emit('monitoring-started');
    logger.info('Agent monitoring service started');
  }

  /**
   * Stop monitoring service
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Clear all intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    this.emit('monitoring-stopped');
    logger.info('Agent monitoring service stopped');
  }

  /**
   * Register an agent for monitoring
   */
  async registerAgent(agentName: string, initialStatus: Partial<AgentStatus>): Promise<void> {
    const status: AgentStatus = {
      agentName,
      status: 'starting',
      lastHeartbeat: new Date().toISOString(),
      version: initialStatus.version || 'unknown',
      environment: initialStatus.environment || process.env.NODE_ENV || 'development',
      metrics: {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        queueSize: 0,
        lastRequestTime: new Date().toISOString(),
        uptime: 0,
        costMetrics: {
          hourlyRate: 0,
          dailyCost: 0,
          monthlyCost: 0,
          llmTokenCost: 0,
          infraCost: 0,
          totalCost: 0
        }
      },
      errors: [],
      dependencies: [],
      configuration: {
        llmModel: 'gpt-4',
        maxConcurrentRequests: 10,
        timeoutMs: 30000,
        retryCount: 3,
        enabledFeatures: [],
        resourceLimits: {
          maxMemoryMB: 1024,
          maxCpuPercent: 80,
          maxRequestsPerMinute: 100,
          maxCostPerHour: 10
        }
      },
      deploymentInfo: {
        version: initialStatus.version || '1.0.0',
        deployedAt: new Date().toISOString(),
        deployedBy: 'system',
        environment: initialStatus.environment || 'development',
        region: this.config.region,
        instanceId: process.env.AWS_LAMBDA_FUNCTION_NAME || 'local'
      },
      ...initialStatus
    };

    this.agentStatuses.set(agentName, status);

    // Save to persistent storage
    await this.saveAgentStatus(status);

    // Start health checks for this agent
    this.startHealthChecks(agentName);

    this.emit('agent-registered', { agentName, status });
    logger.info('Agent registered for monitoring', {
      agentName,
      status: status.status
    });
  }

  /**
   * Unregister an agent from monitoring
   */
  async unregisterAgent(agentName: string): Promise<void> {
    // Update status to offline
    const currentStatus = this.agentStatuses.get(agentName);
    if (currentStatus) {
      currentStatus.status = 'offline';
      currentStatus.lastHeartbeat = new Date().toISOString();
      await this.saveAgentStatus(currentStatus);
    }

    // Stop health checks
    const interval = this.healthCheckIntervals.get(agentName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(agentName);
    }

    this.agentStatuses.delete(agentName);

    this.emit('agent-unregistered', { agentName });
    logger.info('Agent unregistered from monitoring', { agentName });
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentName: string, updates: Partial<AgentStatus>): Promise<void> {
    const currentStatus = this.agentStatuses.get(agentName);
    if (!currentStatus) {
      logger.error('Cannot update status for unregistered agent', { agentName });
      return;
    }

    const updatedStatus: AgentStatus = {
      ...currentStatus,
      ...updates,
      lastHeartbeat: new Date().toISOString()
    };

    this.agentStatuses.set(agentName, updatedStatus);
    await this.saveAgentStatus(updatedStatus);

    // Check for status changes
    if (currentStatus.status !== updatedStatus.status) {
      this.emit('status-changed', {
        agentName,
        oldStatus: currentStatus.status,
        newStatus: updatedStatus.status
      });

      logger.info('Agent status changed', {
        agentName,
        oldStatus: currentStatus.status,
        newStatus: updatedStatus.status
      });
    }

    // Check for alerts
    await this.checkAlerts(updatedStatus);
  }

  /**
   * Record agent metrics
   */
  async recordMetrics(agentName: string, metrics: Partial<AgentMetrics>): Promise<void> {
    const status = this.agentStatuses.get(agentName);
    if (!status) {
      logger.error('Cannot record metrics for unregistered agent', { agentName });
      return;
    }

    status.metrics = {
      ...status.metrics,
      ...metrics
    };

    status.lastHeartbeat = new Date().toISOString();
    this.agentStatuses.set(agentName, status);

    // Send metrics to CloudWatch
    if (this.config.enablePerformanceMonitoring) {
      await this.sendMetricsToCloudWatch(agentName, status.metrics);
    }

    // Update cost tracking
    if (this.config.enableCostMonitoring && metrics.costMetrics) {
      await costTracker.updateAgentCosts(agentName, metrics.costMetrics);
    }

    this.emit('metrics-recorded', { agentName, metrics });
  }

  /**
   * Record agent error
   */
  async recordError(agentName: string, error: Omit<AgentError, 'timestamp'>): Promise<void> {
    const status = this.agentStatuses.get(agentName);
    if (!status) {
      logger.error('Cannot record error for unregistered agent', { agentName });
      return;
    }

    const agentError: AgentError = {
      ...error,
      timestamp: new Date().toISOString()
    };

    status.errors.push(agentError);
    status.metrics.errorCount++;
    status.lastHeartbeat = new Date().toISOString();

    // Keep only recent errors
    if (status.errors.length > 100) {
      status.errors = status.errors.slice(-100);
    }

    // Update status based on error severity
    if (error.level === 'critical' && status.status === 'healthy') {
      status.status = 'critical';
    } else if (error.level === 'error' && status.status === 'healthy') {
      status.status = 'warning';
    }

    this.agentStatuses.set(agentName, status);
    await this.saveAgentStatus(status);

    this.emit('error-recorded', { agentName, error: agentError });

    logger.error('Agent error recorded', {
      agentName,
      level: error.level,
      message: error.message
    });
  }

  /**
   * Perform health check on agent
   */
  async performHealthCheck(agentName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const status = this.agentStatuses.get(agentName);
      if (!status) {
        return {
          agentName,
          isHealthy: false,
          responseTime: Date.now() - startTime,
          checks: {
            registration: {
              status: 'fail',
              message: 'Agent not registered'
            }
          },
          timestamp
        };
      }

      const checks: HealthCheckResult['checks'] = {};
      let isHealthy = true;

      // Check heartbeat
      const heartbeatAge = Date.now() - new Date(status.lastHeartbeat).getTime();
      if (heartbeatAge > this.config.alertThresholds.heartbeatTimeoutMs) {
        checks.heartbeat = {
          status: 'fail',
          message: `Heartbeat timeout: ${heartbeatAge}ms`,
          value: heartbeatAge
        };
        isHealthy = false;
      } else {
        checks.heartbeat = {
          status: 'pass',
          message: 'Heartbeat current',
          value: heartbeatAge
        };
      }

      // Check resource usage
      if (status.metrics.memoryUsage > this.config.alertThresholds.memoryUsagePercent) {
        checks.memory = {
          status: 'warn',
          message: `High memory usage: ${status.metrics.memoryUsage}%`,
          value: status.metrics.memoryUsage
        };
      } else {
        checks.memory = {
          status: 'pass',
          message: 'Memory usage normal',
          value: status.metrics.memoryUsage
        };
      }

      // Check CPU usage
      if (status.metrics.cpuUsage > this.config.alertThresholds.cpuUsagePercent) {
        checks.cpu = {
          status: 'warn',
          message: `High CPU usage: ${status.metrics.cpuUsage}%`,
          value: status.metrics.cpuUsage
        };
      } else {
        checks.cpu = {
          status: 'pass',
          message: 'CPU usage normal',
          value: status.metrics.cpuUsage
        };
      }

      // Check error rate
      const totalRequests = status.metrics.requestCount;
      const errorRate = totalRequests > 0 ? (status.metrics.errorCount / totalRequests) * 100 : 0;
      
      if (errorRate > this.config.alertThresholds.errorRatePercent) {
        checks.errorRate = {
          status: 'fail',
          message: `High error rate: ${errorRate.toFixed(2)}%`,
          value: errorRate
        };
        isHealthy = false;
      } else {
        checks.errorRate = {
          status: 'pass',
          message: 'Error rate normal',
          value: errorRate
        };
      }

      // Check dependencies
      for (const dep of status.dependencies) {
        if (dep.status === 'failed') {
          checks[`dependency-${dep.name}`] = {
            status: 'fail',
            message: `Dependency ${dep.name} failed: ${dep.errorMessage}`,
            value: dep.responseTime
          };
          isHealthy = false;
        } else if (dep.status === 'degraded') {
          checks[`dependency-${dep.name}`] = {
            status: 'warn',
            message: `Dependency ${dep.name} degraded`,
            value: dep.responseTime
          };
        } else {
          checks[`dependency-${dep.name}`] = {
            status: 'pass',
            message: `Dependency ${dep.name} healthy`,
            value: dep.responseTime
          };
        }
      }

      const result: HealthCheckResult = {
        agentName,
        isHealthy,
        responseTime: Date.now() - startTime,
        checks,
        timestamp
      };

      // Update agent status based on health check
      const newStatus = isHealthy ? 'healthy' : 'warning';
      if (status.status !== newStatus) {
        await this.updateAgentStatus(agentName, { status: newStatus });
      }

      this.emit('health-check-completed', result);
      return result;

    } catch (error) {
      logger.error('Health check failed', {
        agentName,
        error: error.message
      });

      return {
        agentName,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        checks: {
          healthCheck: {
            status: 'fail',
            message: `Health check error: ${error.message}`
          }
        },
        timestamp
      };
    }
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentName: string): AgentStatus | undefined {
    return this.agentStatuses.get(agentName);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(): Promise<any> {
    const allStatuses = this.getAllAgentStatuses();
    
    const statusCounts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      offline: 0,
      starting: 0,
      stopping: 0
    };

    let totalRequests = 0;
    let totalErrors = 0;
    let totalCost = 0;

    for (const status of allStatuses) {
      statusCounts[status.status]++;
      totalRequests += status.metrics.requestCount;
      totalErrors += status.metrics.errorCount;
      totalCost += status.metrics.costMetrics.totalCost;
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Get recent errors
    const recentErrors = allStatuses
      .flatMap(status => status.errors.filter(error => !error.resolved))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      summary: {
        totalAgents: allStatuses.length,
        statusCounts,
        totalRequests,
        totalErrors,
        errorRate: errorRate.toFixed(2),
        totalCost: totalCost.toFixed(2)
      },
      agents: allStatuses,
      recentErrors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize DynamoDB status table
   */
  private async initializeStatusTable(): Promise<void> {
    try {
      // Check if table exists
      await this.dynamoDB.describeTable({
        TableName: this.config.statusTableName
      }).promise();
      
      logger.info('Status table already exists', {
        tableName: this.config.statusTableName
      });
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        logger.info('Creating status table', {
          tableName: this.config.statusTableName
        });
        
        // Create table
        await this.dynamoDB.createTable({
          TableName: this.config.statusTableName,
          KeySchema: [
            {
              AttributeName: 'agentName',
              KeyType: 'HASH'
            }
          ],
          AttributeDefinitions: [
            {
              AttributeName: 'agentName',
              AttributeType: 'S'
            }
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true
          }
        }).promise();
        
        logger.info('Status table created');
      } else {
        logger.error('Failed to initialize status table', {
          error: error.message
        });
        throw error;
      }
    }
  }

  /**
   * Save agent status to DynamoDB
   */
  private async saveAgentStatus(status: AgentStatus): Promise<void> {
    try {
      const ttl = Math.floor(Date.now() / 1000) + (this.config.retentionDays * 24 * 60 * 60);
      
      await this.dynamoDB.putItem({
        TableName: this.config.statusTableName,
        Item: {
          agentName: { S: status.agentName },
          status: { S: JSON.stringify(status) },
          lastHeartbeat: { S: status.lastHeartbeat },
          ttl: { N: ttl.toString() }
        }
      }).promise();
    } catch (error) {
      logger.error('Failed to save agent status', {
        agentName: status.agentName,
        error: error.message
      });
    }
  }

  /**
   * Send metrics to CloudWatch
   */
  private async sendMetricsToCloudWatch(agentName: string, metrics: AgentMetrics): Promise<void> {
    try {
      const metricData = [
        {
          MetricName: 'RequestCount',
          Value: metrics.requestCount,
          Unit: 'Count',
          Dimensions: [{ Name: 'AgentName', Value: agentName }]
        },
        {
          MetricName: 'ErrorCount',
          Value: metrics.errorCount,
          Unit: 'Count',
          Dimensions: [{ Name: 'AgentName', Value: agentName }]
        },
        {
          MetricName: 'ResponseTime',
          Value: metrics.averageResponseTime,
          Unit: 'Milliseconds',
          Dimensions: [{ Name: 'AgentName', Value: agentName }]
        },
        {
          MetricName: 'MemoryUsage',
          Value: metrics.memoryUsage,
          Unit: 'Percent',
          Dimensions: [{ Name: 'AgentName', Value: agentName }]
        },
        {
          MetricName: 'CPUUsage',
          Value: metrics.cpuUsage,
          Unit: 'Percent',
          Dimensions: [{ Name: 'AgentName', Value: agentName }]
        }
      ];

      await this.cloudWatch.putMetricData({
        Namespace: this.config.metricsNamespace,
        MetricData: metricData
      }).promise();
    } catch (error) {
      logger.error('Failed to send metrics to CloudWatch', {
        agentName,
        error: error.message
      });
    }
  }

  /**
   * Start periodic monitoring tasks
   */
  private startPeriodicTasks(): void {
    // Periodic status cleanup
    setInterval(async () => {
      if (!this.isMonitoring) return;
      await this.cleanupOldStatuses();
    }, 60000); // Every minute

    // Periodic cost calculation
    if (this.config.enableCostMonitoring) {
      setInterval(async () => {
        if (!this.isMonitoring) return;
        await this.updateCostMetrics();
      }, 300000); // Every 5 minutes
    }
  }

  /**
   * Start health checks for an agent
   */
  private startHealthChecks(agentName: string): void {
    const interval = setInterval(async () => {
      if (!this.isMonitoring) return;
      await this.performHealthCheck(agentName);
    }, this.config.heartbeatIntervalMs);

    this.healthCheckIntervals.set(agentName, interval);
  }

  /**
   * Check for alerts
   */
  private async checkAlerts(status: AgentStatus): Promise<void> {
    const alerts = [];

    // Check response time
    if (status.metrics.averageResponseTime > this.config.alertThresholds.responseTimeMs) {
      alerts.push({
        type: 'response-time',
        severity: 'warning',
        message: `High response time: ${status.metrics.averageResponseTime}ms`
      });
    }

    // Check cost
    if (status.metrics.costMetrics.hourlyRate > this.config.alertThresholds.costPerHourUSD) {
      alerts.push({
        type: 'cost',
        severity: 'warning',
        message: `High cost: $${status.metrics.costMetrics.hourlyRate}/hour`
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.emit('alert', {
        agentName: status.agentName,
        alert
      });
    }
  }

  /**
   * Clean up old statuses
   */
  private async cleanupOldStatuses(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    for (const [agentName, status] of this.agentStatuses.entries()) {
      const lastHeartbeat = new Date(status.lastHeartbeat).getTime();
      
      if (lastHeartbeat < cutoffTime && status.status === 'offline') {
        await this.unregisterAgent(agentName);
      }
    }
  }

  /**
   * Update cost metrics for all agents
   */
  private async updateCostMetrics(): Promise<void> {
    for (const [agentName, status] of this.agentStatuses.entries()) {
      try {
        const costs = await costTracker.getAgentCosts(agentName);
        
        status.metrics.costMetrics = {
          hourlyRate: costs.hourlyRate || 0,
          dailyCost: costs.dailyCost || 0,
          monthlyCost: costs.monthlyCost || 0,
          llmTokenCost: costs.llmCost || 0,
          infraCost: costs.infraCost || 0,
          totalCost: costs.totalCost || 0
        };

        this.agentStatuses.set(agentName, status);
      } catch (error) {
        logger.error('Failed to update cost metrics', {
          agentName,
          error: error.message
        });
      }
    }
  }
}

// Factory function
export function createMonitoringService(config: MonitoringConfig): AgentMonitoringService {
  return new AgentMonitoringService(config);
}

// Default configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  statusTableName: process.env.STATUS_TABLE_NAME || 'agent-status',
  metricsNamespace: process.env.METRICS_NAMESPACE || 'CurriculumAlignment/Agents',
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '60000'),
  healthCheckTimeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '30000'),
  alertThresholds: {
    errorRatePercent: parseFloat(process.env.ALERT_ERROR_RATE_PERCENT || '5'),
    responseTimeMs: parseInt(process.env.ALERT_RESPONSE_TIME_MS || '30000'),
    memoryUsagePercent: parseFloat(process.env.ALERT_MEMORY_USAGE_PERCENT || '80'),
    cpuUsagePercent: parseFloat(process.env.ALERT_CPU_USAGE_PERCENT || '80'),
    costPerHourUSD: parseFloat(process.env.ALERT_COST_PER_HOUR_USD || '10'),
    heartbeatTimeoutMs: parseInt(process.env.ALERT_HEARTBEAT_TIMEOUT_MS || '300000')
  },
  enableCostMonitoring: process.env.ENABLE_COST_MONITORING === 'true',
  enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  retentionDays: parseInt(process.env.STATUS_RETENTION_DAYS || '30')
};