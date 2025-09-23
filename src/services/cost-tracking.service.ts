/**
 * Cost Tracking Service
 * 
 * Service for tracking and monitoring costs across LLM usage, AWS resources,
 * and other cloud services. Provides cost analytics, budgeting, and alerting.
 */

import { CostExplorerClient, GetDimensionValuesCommand, GetRightsizingRecommendationCommand, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { env } from '../config/environment';
import { query } from '../database';
import { AgentType, ModelProvider } from '../database/models';
import { logger } from './logging.service';
import { metrics } from './metrics.service';

/**
 * Cost record for database storage
 */
export interface CostRecord {
  id?: string;
  user_id?: string;
  agent_type?: AgentType;
  service_type: 'llm' | 'aws' | 'external';
  provider?: ModelProvider | string;
  model_name?: string;
  resource_type?: string;
  cost_amount: number;
  currency: string;
  usage_units?: number;
  usage_type?: string;
  billing_period: Date;
  created_at?: Date;
  metadata?: Record<string, any>;
}

/**
 * LLM usage tracking
 */
export interface LLMUsage {
  provider: ModelProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  cost: number;
  agentType?: AgentType;
  userId?: string;
  sessionId?: string;
}

/**
 * AWS service usage
 */
export interface AWSUsage {
  service: string;
  resourceType: string;
  usage: number;
  unit: string;
  cost: number;
  region?: string;
}

/**
 * Cost summary for reporting
 */
export interface CostSummary {
  totalCost: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  breakdown: {
    llm: {
      total: number;
      byProvider: Record<string, number>;
      byModel: Record<string, number>;
      byAgent: Record<AgentType, number>;
    };
    aws: {
      total: number;
      byService: Record<string, number>;
      byRegion: Record<string, number>;
    };
    external: {
      total: number;
      byService: Record<string, number>;
    };
  };
  topSpenders?: {
    users: Array<{ userId: string; cost: number }>;
    agents: Array<{ agentType: AgentType; cost: number }>;
    models: Array<{ model: string; cost: number }>;
  };
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  id?: string;
  name: string;
  type: 'monthly' | 'daily' | 'total';
  amount: number;
  currency: string;
  scope: 'global' | 'user' | 'agent' | 'model';
  scope_id?: string;
  alert_thresholds: number[]; // Percentages: [50, 80, 90]
  notifications: {
    email?: string[];
    webhook?: string;
    sns_topic?: string;
  };
  active: boolean;
  created_at?: Date;
}

/**
 * Cost alert
 */
export interface CostAlert {
  id?: string;
  budget_id: string;
  alert_type: 'threshold_exceeded' | 'budget_exceeded' | 'anomaly_detected';
  current_amount: number;
  threshold_amount: number;
  percentage: number;
  period: Date;
  message: string;
  acknowledged: boolean;
  created_at?: Date;
}

/**
 * Pricing information for LLM models
 */
const LLM_PRICING = {
  'openai': {
    'gpt-4o': { input: 5.00, output: 15.00 }, // per 1M tokens
    'gpt-4o-mini': { input: 0.150, output: 0.600 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  },
  'anthropic': {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  },
  'google': {
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  },
} as const;

/**
 * Cost Tracking Service
 */
export class CostTrackingService {
  private costExplorerClient: CostExplorerClient;
  private cloudWatchClient: CloudWatchClient;

  constructor() {
    this.costExplorerClient = new CostExplorerClient({
      region: 'us-east-1', // Cost Explorer is only available in us-east-1
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });

    this.cloudWatchClient = new CloudWatchClient({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });
  }

  /**
   * Track LLM usage and calculate costs
   */
  async trackLLMUsage(usage: LLMUsage): Promise<void> {
    try {
      // Calculate cost if not provided
      let cost = usage.cost;
      if (cost === 0) {
        cost = this.calculateLLMCost(usage.provider, usage.model, usage.inputTokens, usage.outputTokens);
      }

      // Store cost record
      const costRecord: CostRecord = {
        user_id: usage.userId,
        agent_type: usage.agentType,
        service_type: 'llm',
        provider: usage.provider,
        model_name: usage.model,
        cost_amount: cost,
        currency: 'USD',
        usage_units: usage.totalTokens,
        usage_type: 'tokens',
        billing_period: new Date(),
        metadata: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          requestCount: usage.requestCount,
          sessionId: usage.sessionId,
        },
      };

      await this.recordCost(costRecord);

      // Send metrics
      metrics.recordLLMMetrics({
        provider: usage.provider,
        model: usage.model,
        requestCount: usage.requestCount,
        tokenUsage: {
          input: usage.inputTokens,
          output: usage.outputTokens,
          total: usage.totalTokens,
        },
        cost,
        averageLatency: 0, // Would need to be tracked separately
        errorRate: 0, // Would need to be tracked separately
      });

      logger.debug('Tracked LLM usage', {
        provider: usage.provider,
        model: usage.model,
        tokens: usage.totalTokens,
        cost,
        agentType: usage.agentType,
      });

    } catch (error) {
      logger.error('Failed to track LLM usage', error as Error, { usage });
      throw error;
    }
  }

  /**
   * Track AWS service usage
   */
  async trackAWSUsage(usage: AWSUsage): Promise<void> {
    try {
      const costRecord: CostRecord = {
        service_type: 'aws',
        provider: 'aws',
        resource_type: `${usage.service}:${usage.resourceType}`,
        cost_amount: usage.cost,
        currency: 'USD',
        usage_units: usage.usage,
        usage_type: usage.unit,
        billing_period: new Date(),
        metadata: {
          service: usage.service,
          resourceType: usage.resourceType,
          region: usage.region,
        },
      };

      await this.recordCost(costRecord);

      // Send cost metric
      metrics.recordCostMetrics(usage.service, usage.cost);

      logger.debug('Tracked AWS usage', {
        service: usage.service,
        resourceType: usage.resourceType,
        usage: usage.usage,
        cost: usage.cost,
      });

    } catch (error) {
      logger.error('Failed to track AWS usage', error as Error, { usage });
      throw error;
    }
  }

  /**
   * Get cost summary for a period
   */
  async getCostSummary(startDate: Date, endDate: Date, userId?: string, agentType?: AgentType): Promise<CostSummary> {
    try {
      let whereClause = 'WHERE billing_period >= $1 AND billing_period <= $2';
      const params: any[] = [startDate, endDate];

      if (userId) {
        whereClause += ' AND user_id = $3';
        params.push(userId);
      }

      if (agentType) {
        const paramIndex = params.length + 1;
        whereClause += ` AND agent_type = $${paramIndex}`;
        params.push(agentType);
      }

      // Get total costs
      const totalResult = await query(`
        SELECT 
          SUM(cost_amount) as total_cost,
          currency
        FROM cost_records 
        ${whereClause}
        GROUP BY currency
      `, params);

      const totalCost = totalResult.rows[0]?.total_cost || 0;
      const currency = totalResult.rows[0]?.currency || 'USD';

      // Get LLM breakdown
      const llmResult = await query(`
        SELECT 
          provider,
          model_name,
          agent_type,
          SUM(cost_amount) as cost
        FROM cost_records 
        ${whereClause} AND service_type = 'llm'
        GROUP BY provider, model_name, agent_type
      `, params);

      // Get AWS breakdown
      const awsResult = await query(`
        SELECT 
          resource_type,
          metadata->>'region' as region,
          SUM(cost_amount) as cost
        FROM cost_records 
        ${whereClause} AND service_type = 'aws'
        GROUP BY resource_type, metadata->>'region'
      `, params);

      // Build breakdown
      const llmBreakdown = {
        total: 0,
        byProvider: {} as Record<string, number>,
        byModel: {} as Record<string, number>,
        byAgent: {} as Record<AgentType, number>,
      };

      for (const row of llmResult.rows) {
        const cost = parseFloat(row.cost);
        llmBreakdown.total += cost;
        llmBreakdown.byProvider[row.provider] = (llmBreakdown.byProvider[row.provider] || 0) + cost;
        llmBreakdown.byModel[row.model_name] = (llmBreakdown.byModel[row.model_name] || 0) + cost;
        if (row.agent_type) {
          llmBreakdown.byAgent[row.agent_type] = (llmBreakdown.byAgent[row.agent_type] || 0) + cost;
        }
      }

      const awsBreakdown = {
        total: 0,
        byService: {} as Record<string, number>,
        byRegion: {} as Record<string, number>,
      };

      for (const row of awsResult.rows) {
        const cost = parseFloat(row.cost);
        awsBreakdown.total += cost;
        const service = row.resource_type.split(':')[0];
        awsBreakdown.byService[service] = (awsBreakdown.byService[service] || 0) + cost;
        if (row.region) {
          awsBreakdown.byRegion[row.region] = (awsBreakdown.byRegion[row.region] || 0) + cost;
        }
      }

      return {
        totalCost,
        currency,
        period: { start: startDate, end: endDate },
        breakdown: {
          llm: llmBreakdown,
          aws: awsBreakdown,
          external: { total: 0, byService: {} },
        },
      };

    } catch (error) {
      logger.error('Failed to get cost summary', error as Error, { startDate, endDate, userId, agentType });
      throw error;
    }
  }

  /**
   * Create or update a budget
   */
  async createBudget(budget: BudgetConfig): Promise<string> {
    try {
      const result = await query(`
        INSERT INTO budgets (
          name, type, amount, currency, scope, scope_id, 
          alert_thresholds, notifications, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        budget.name,
        budget.type,
        budget.amount,
        budget.currency,
        budget.scope,
        budget.scope_id,
        JSON.stringify(budget.alert_thresholds),
        JSON.stringify(budget.notifications),
        budget.active,
      ]);

      const budgetId = result.rows[0].id;
      
      logger.info('Created budget', { budgetId, name: budget.name, amount: budget.amount });
      
      return budgetId;

    } catch (error) {
      logger.error('Failed to create budget', error as Error, { budget });
      throw error;
    }
  }

  /**
   * Check budgets and create alerts
   */
  async checkBudgets(): Promise<CostAlert[]> {
    try {
      // Get all active budgets
      const budgetsResult = await query(`
        SELECT * FROM budgets WHERE active = true
      `);

      const alerts: CostAlert[] = [];

      for (const budgetRow of budgetsResult.rows) {
        const budget = budgetRow as BudgetConfig;
        
        // Calculate current spend for budget period
        const { startDate, endDate } = this.getBudgetPeriod(budget.type);
        let currentSpend = 0;

        if (budget.scope === 'global') {
          const summary = await this.getCostSummary(startDate, endDate);
          currentSpend = summary.totalCost;
        } else if (budget.scope === 'user') {
          const summary = await this.getCostSummary(startDate, endDate, budget.scope_id);
          currentSpend = summary.totalCost;
        } else if (budget.scope === 'agent') {
          const summary = await this.getCostSummary(startDate, endDate, undefined, budget.scope_id as AgentType);
          currentSpend = summary.totalCost;
        }

        // Check thresholds
        const percentage = (currentSpend / budget.amount) * 100;

        for (const threshold of budget.alert_thresholds) {
          if (percentage >= threshold) {
            // Check if alert already exists for this threshold
            const existingAlert = await query(`
              SELECT id FROM cost_alerts 
              WHERE budget_id = $1 AND threshold_amount = $2 AND period = $3
            `, [budget.id, (budget.amount * threshold) / 100, endDate]);

            if (existingAlert.rows.length === 0) {
              const alert: CostAlert = {
                budget_id: budget.id!,
                alert_type: percentage >= 100 ? 'budget_exceeded' : 'threshold_exceeded',
                current_amount: currentSpend,
                threshold_amount: (budget.amount * threshold) / 100,
                percentage,
                period: endDate,
                message: `Budget "${budget.name}" is at ${percentage.toFixed(1)}% (${currentSpend}/${budget.amount} ${budget.currency})`,
                acknowledged: false,
              };

              await this.createAlert(alert);
              alerts.push(alert);
            }
          }
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to check budgets', error as Error);
      throw error;
    }
  }

  /**
   * Get cost trends and projections
   */
  async getCostTrends(days: number = 30): Promise<{
    dailyCosts: Array<{ date: Date; cost: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    projectedMonthlyCost: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await query(`
        SELECT 
          DATE(billing_period) as date,
          SUM(cost_amount) as daily_cost
        FROM cost_records 
        WHERE billing_period >= $1 AND billing_period <= $2
        GROUP BY DATE(billing_period)
        ORDER BY date
      `, [startDate, endDate]);

      const dailyCosts = result.rows.map(row => ({
        date: new Date(row.date),
        cost: parseFloat(row.daily_cost),
      }));

      // Calculate trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (dailyCosts.length >= 7) {
        const firstWeekAvg = dailyCosts.slice(0, 7).reduce((sum, day) => sum + day.cost, 0) / 7;
        const lastWeekAvg = dailyCosts.slice(-7).reduce((sum, day) => sum + day.cost, 0) / 7;
        
        if (lastWeekAvg > firstWeekAvg * 1.1) {
          trend = 'increasing';
        } else if (lastWeekAvg < firstWeekAvg * 0.9) {
          trend = 'decreasing';
        }
      }

      // Project monthly cost based on recent average
      const recentDays = Math.min(7, dailyCosts.length);
      const recentAvg = dailyCosts.slice(-recentDays).reduce((sum, day) => sum + day.cost, 0) / recentDays;
      const projectedMonthlyCost = recentAvg * 30;

      return {
        dailyCosts,
        trend,
        projectedMonthlyCost,
      };

    } catch (error) {
      logger.error('Failed to get cost trends', error as Error);
      throw error;
    }
  }

  /**
   * Get AWS costs from Cost Explorer
   */
  async syncAWSCosts(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Yesterday

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0],
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        GroupBy: [
          { Type: 'DIMENSION', Key: 'SERVICE' },
          { Type: 'DIMENSION', Key: 'REGION' },
        ],
      });

      const response = await this.costExplorerClient.send(command);

      if (response.ResultsByTime) {
        for (const result of response.ResultsByTime) {
          for (const group of result.Groups || []) {
            const service = group.Keys?.[0] || 'Unknown';
            const region = group.Keys?.[1] || 'Unknown';
            const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || '0');

            if (cost > 0) {
              await this.trackAWSUsage({
                service,
                resourceType: 'service',
                usage: 1,
                unit: 'request',
                cost,
                region,
              });
            }
          }
        }
      }

      logger.info('Synced AWS costs from Cost Explorer');

    } catch (error) {
      logger.error('Failed to sync AWS costs', error as Error);
    }
  }

  /**
   * Calculate LLM cost based on pricing
   */
  private calculateLLMCost(provider: ModelProvider, model: string, inputTokens: number, outputTokens: number): number {
    const pricing = LLM_PRICING[provider]?.[model as keyof typeof LLM_PRICING[typeof provider]];
    
    if (!pricing) {
      logger.warn('No pricing found for model', { provider, model });
      return 0;
    }

    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Record cost in database
   */
  private async recordCost(costRecord: CostRecord): Promise<void> {
    await query(`
      INSERT INTO cost_records (
        user_id, agent_type, service_type, provider, model_name, 
        resource_type, cost_amount, currency, usage_units, usage_type, 
        billing_period, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      costRecord.user_id,
      costRecord.agent_type,
      costRecord.service_type,
      costRecord.provider,
      costRecord.model_name,
      costRecord.resource_type,
      costRecord.cost_amount,
      costRecord.currency,
      costRecord.usage_units,
      costRecord.usage_type,
      costRecord.billing_period,
      JSON.stringify(costRecord.metadata),
    ]);
  }

  /**
   * Create cost alert
   */
  private async createAlert(alert: CostAlert): Promise<void> {
    await query(`
      INSERT INTO cost_alerts (
        budget_id, alert_type, current_amount, threshold_amount, 
        percentage, period, message, acknowledged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      alert.budget_id,
      alert.alert_type,
      alert.current_amount,
      alert.threshold_amount,
      alert.percentage,
      alert.period,
      alert.message,
      alert.acknowledged,
    ]);

    logger.warn('Cost alert created', alert);
  }

  /**
   * Get budget period dates
   */
  private getBudgetPeriod(type: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (type) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setFullYear(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }
}

/**
 * Global cost tracking service instance
 */
export const costTracker = new CostTrackingService();

/**
 * Convenience functions
 */
export const costTracking = {
  trackLLM: (usage: LLMUsage) => costTracker.trackLLMUsage(usage),
  trackAWS: (usage: AWSUsage) => costTracker.trackAWSUsage(usage),
  getSummary: (start: Date, end: Date, userId?: string, agentType?: AgentType) => 
    costTracker.getCostSummary(start, end, userId, agentType),
  createBudget: (budget: BudgetConfig) => costTracker.createBudget(budget),
  checkBudgets: () => costTracker.checkBudgets(),
  getTrends: (days?: number) => costTracker.getCostTrends(days),
  syncAWS: () => costTracker.syncAWSCosts(),
};

export default costTracker;