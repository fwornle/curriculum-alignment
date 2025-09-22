/**
 * LLM Model Configuration Service
 * 
 * Manages LLM model configurations per agent, handles model selection,
 * cost tracking, and performance optimization with comprehensive validation.
 */

import { query, namedQuery, transaction } from '../database';
import {
  LLMModelConfiguration,
  CreateLLMModelConfigurationInput,
  UpdateLLMModelConfigurationInput,
  AgentType,
  ModelProvider,
  UUID,
  User,
} from '../database/models';
import {
  LLMModel,
  ModelCapabilities,
  ModelSelectionCriteria,
  ModelComparison,
  ModelUsageStats,
  CostEstimate,
  RecommendationContext,
  AGENT_MODEL_REQUIREMENTS,
} from '../types/llm-models';

/**
 * Model registry entry
 */
interface ModelRegistryEntry extends LLMModel {
  isActive: boolean;
  lastValidated: Date;
  validationErrors?: string[];
}

/**
 * User model profile with usage and preferences
 */
interface UserModelProfile {
  userId: UUID;
  configurations: LLMModelConfiguration[];
  totalMonthlyCost: number;
  budgetLimit?: number;
  usageStats: Record<AgentType, ModelUsageStats>;
  preferences: {
    priorityFactor: 'cost' | 'speed' | 'quality' | 'balanced';
    maxMonthlyCost?: number;
    preferredProviders: ModelProvider[];
    fallbackStrategy: string;
  };
}

/**
 * LLM Configuration Service
 */
export class LLMConfigService {
  private modelRegistry: Map<string, ModelRegistryEntry> = new Map();
  private costCache: Map<string, CostEstimate> = new Map();
  private lastRegistryUpdate: Date = new Date(0);
  private readonly REGISTRY_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeModelRegistry();
  }

  /**
   * Initialize model registry with supported models
   */
  private async initializeModelRegistry(): Promise<void> {
    const models: LLMModel[] = [
      // OpenAI Models
      {
        id: 'gpt-4o',
        provider: 'openai',
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'Most capable multimodal model with vision capabilities',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          codeGeneration: true,
          imageAnalysis: true,
          documentProcessing: true,
          reasoning: true,
          multiModal: true,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
        },
        specifications: {
          contextWindow: 128000,
          maxOutputTokens: 4096,
          trainingCutoff: '2024-04',
          languagesSupported: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'],
          inputTypes: ['text', 'image'],
          outputTypes: ['text'],
        },
        performance: {
          speedTier: 'balanced',
          qualityTier: 'excellent',
          reasoningCapability: 'advanced',
          averageLatencyMs: 2000,
          reliabilityScore: 95,
        },
        pricing: {
          inputCostPer1kTokens: 0.005,
          outputCostPer1kTokens: 0.015,
          currency: 'USD',
          billingModel: 'per_token',
        },
        availability: {
          status: 'available',
          rateLimits: {
            requestsPerMinute: 5000,
            tokensPerMinute: 800000,
            requestsPerDay: 10000,
          },
          regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
          requiresApproval: false,
        },
        recommendedFor: ['accreditation-expert', 'chat-interface', 'document-processing'],
        metadata: {
          releaseDate: '2024-05',
          lastUpdated: new Date().toISOString(),
          documentation: 'https://platform.openai.com/docs/models/gpt-4o',
        },
      },
      {
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        name: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective model for most tasks',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          codeGeneration: true,
          imageAnalysis: false,
          documentProcessing: true,
          reasoning: true,
          multiModal: false,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
        },
        specifications: {
          contextWindow: 16385,
          maxOutputTokens: 4096,
          trainingCutoff: '2024-01',
          languagesSupported: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
          inputTypes: ['text'],
          outputTypes: ['text'],
        },
        performance: {
          speedTier: 'fast',
          qualityTier: 'good',
          reasoningCapability: 'intermediate',
          averageLatencyMs: 800,
          reliabilityScore: 92,
        },
        pricing: {
          inputCostPer1kTokens: 0.001,
          outputCostPer1kTokens: 0.002,
          currency: 'USD',
          billingModel: 'per_token',
        },
        availability: {
          status: 'available',
          rateLimits: {
            requestsPerMinute: 10000,
            tokensPerMinute: 1000000,
          },
          regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
          requiresApproval: false,
        },
        recommendedFor: ['coordinator', 'web-search', 'qa'],
        metadata: {
          releaseDate: '2023-03',
          lastUpdated: new Date().toISOString(),
        },
      },
      // Anthropic Models
      {
        id: 'claude-3.5-sonnet',
        provider: 'anthropic',
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        description: 'Anthropic\'s most intelligent model with excellent reasoning',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          codeGeneration: true,
          imageAnalysis: true,
          documentProcessing: true,
          reasoning: true,
          multiModal: true,
          functionCalling: true,
          jsonMode: false,
          streaming: true,
        },
        specifications: {
          contextWindow: 200000,
          maxOutputTokens: 8192,
          trainingCutoff: '2024-04',
          languagesSupported: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
          inputTypes: ['text', 'image'],
          outputTypes: ['text'],
        },
        performance: {
          speedTier: 'balanced',
          qualityTier: 'excellent',
          reasoningCapability: 'advanced',
          averageLatencyMs: 2500,
          reliabilityScore: 96,
        },
        pricing: {
          inputCostPer1kTokens: 0.003,
          outputCostPer1kTokens: 0.015,
          currency: 'USD',
          billingModel: 'per_token',
        },
        availability: {
          status: 'available',
          rateLimits: {
            requestsPerMinute: 4000,
            tokensPerMinute: 400000,
          },
          regions: ['us-east-1', 'us-west-2'],
          requiresApproval: false,
        },
        recommendedFor: ['accreditation-expert', 'chat-interface', 'document-processing'],
        metadata: {
          releaseDate: '2024-06',
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: 'claude-3-haiku',
        provider: 'anthropic',
        name: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        description: 'Fast and cost-effective model for simple tasks',
        capabilities: {
          textGeneration: true,
          textAnalysis: true,
          codeGeneration: false,
          imageAnalysis: true,
          documentProcessing: true,
          reasoning: true,
          multiModal: true,
          functionCalling: false,
          jsonMode: false,
          streaming: true,
        },
        specifications: {
          contextWindow: 200000,
          maxOutputTokens: 4096,
          trainingCutoff: '2024-02',
          languagesSupported: ['en', 'es', 'fr', 'de'],
          inputTypes: ['text', 'image'],
          outputTypes: ['text'],
        },
        performance: {
          speedTier: 'fast',
          qualityTier: 'good',
          reasoningCapability: 'intermediate',
          averageLatencyMs: 900,
          reliabilityScore: 90,
        },
        pricing: {
          inputCostPer1kTokens: 0.00025,
          outputCostPer1kTokens: 0.00125,
          currency: 'USD',
          billingModel: 'per_token',
        },
        availability: {
          status: 'available',
          rateLimits: {
            requestsPerMinute: 5000,
            tokensPerMinute: 1000000,
          },
          regions: ['us-east-1', 'us-west-2'],
          requiresApproval: false,
        },
        recommendedFor: ['qa', 'semantic-search', 'web-search'],
        metadata: {
          releaseDate: '2024-03',
          lastUpdated: new Date().toISOString(),
        },
      },
      // Add more models as needed (Grok, Google, Azure)
    ];

    // Register all models
    for (const model of models) {
      this.modelRegistry.set(model.id, {
        ...model,
        isActive: true,
        lastValidated: new Date(),
      });
    }

    this.lastRegistryUpdate = new Date();
    console.log(`LLM Model Registry initialized with ${models.length} models`);
  }

  /**
   * Get user's LLM model configurations
   */
  async getUserConfigurations(userId: UUID): Promise<LLMModelConfiguration[]> {
    const result = await namedQuery<LLMModelConfiguration>(
      'SELECT * FROM llm_model_configurations WHERE user_id = :userId ORDER BY agent_type',
      { userId }
    );

    return result.rows;
  }

  /**
   * Get configuration for specific user and agent
   */
  async getConfiguration(userId: UUID, agentType: AgentType): Promise<LLMModelConfiguration | null> {
    const result = await namedQuery<LLMModelConfiguration>(
      'SELECT * FROM llm_model_configurations WHERE user_id = :userId AND agent_type = :agentType',
      { userId, agentType }
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create or update model configuration
   */
  async setConfiguration(input: CreateLLMModelConfigurationInput): Promise<LLMModelConfiguration> {
    // Validate model exists and is compatible
    const model = this.modelRegistry.get(input.model_name);
    if (!model) {
      throw new Error(`Model ${input.model_name} not found in registry`);
    }

    if (!this.isModelCompatibleWithAgent(model, input.agent_type)) {
      throw new Error(`Model ${input.model_name} is not compatible with agent ${input.agent_type}`);
    }

    return await transaction(async (client) => {
      // Check if configuration already exists
      const existingResult = await client.query(
        'SELECT config_id FROM llm_model_configurations WHERE user_id = $1 AND agent_type = $2',
        [input.user_id, input.agent_type]
      );

      if (existingResult.rows.length > 0) {
        // Update existing configuration
        const updateResult = await client.query<LLMModelConfiguration>(
          `UPDATE llm_model_configurations 
           SET model_provider = $1, model_name = $2, api_key_reference = $3, updated_at = NOW()
           WHERE user_id = $4 AND agent_type = $5
           RETURNING *`,
          [input.model_provider, input.model_name, input.api_key_reference, input.user_id, input.agent_type]
        );
        return updateResult.rows[0];
      } else {
        // Create new configuration
        const insertResult = await client.query<LLMModelConfiguration>(
          `INSERT INTO llm_model_configurations (user_id, agent_type, model_provider, model_name, api_key_reference)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [input.user_id, input.agent_type, input.model_provider, input.model_name, input.api_key_reference]
        );
        return insertResult.rows[0];
      }
    });
  }

  /**
   * Get model recommendations for an agent
   */
  async getModelRecommendations(
    agentType: AgentType,
    context?: RecommendationContext
  ): Promise<ModelComparison> {
    const requirements = AGENT_MODEL_REQUIREMENTS[agentType];
    const criteria: ModelSelectionCriteria = {
      priorityFactor: context?.preferences?.prioritizeCost ? 'cost' : 
                    context?.preferences?.prioritizeSpeed ? 'speed' :
                    context?.preferences?.prioritizeQuality ? 'quality' : 'balanced',
      maxMonthlyCost: context?.budgetConstraints?.maxMonthlyCost,
      maxLatencyMs: context?.performanceRequirements?.maxLatencyMs,
      minQualityScore: context?.performanceRequirements?.minQualityScore,
      requiredCapabilities: requirements.requiredCapabilities,
      preferredProviders: context?.preferences?.preferredProviders,
      excludedProviders: context?.preferences?.avoidProviders,
      fallbackStrategy: 'best_available',
    };

    const candidates = Array.from(this.modelRegistry.values())
      .filter(model => model.isActive)
      .filter(model => this.isModelCompatibleWithAgent(model, agentType))
      .filter(model => !criteria.excludedProviders?.includes(model.provider))
      .map(model => {
        const suitabilityScore = this.calculateSuitabilityScore(model, requirements, criteria);
        const costAnalysis = this.calculateCostAnalysis(model, requirements);
        const performanceAnalysis = this.calculatePerformanceAnalysis(model);

        return {
          model,
          suitabilityScore,
          costAnalysis,
          performanceAnalysis,
          pros: this.getModelPros(model, agentType),
          cons: this.getModelCons(model, agentType),
          recommendation: this.getRecommendationLevel(suitabilityScore),
        };
      })
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const topRecommendation = candidates.length > 0 ? candidates[0].model.id : '';
    const alternativeRecommendations = candidates.slice(1, 4).map(c => c.model.id);

    // Cost comparison
    const costSorted = [...candidates].sort((a, b) => a.costAnalysis.estimatedMonthlyCost - b.costAnalysis.estimatedMonthlyCost);
    const costComparison = {
      cheapest: costSorted[0]?.model.id || '',
      mostExpensive: costSorted[costSorted.length - 1]?.model.id || '',
      bestValue: this.findBestValueModel(candidates),
    };

    return {
      agentType,
      criteria,
      candidates,
      topRecommendation,
      alternativeRecommendations,
      costComparison,
    };
  }

  /**
   * Calculate cost estimate for model usage
   */
  async calculateCostEstimate(
    modelId: string,
    agentType: AgentType,
    customUsage?: { dailyRequests: number; avgInputTokens: number; avgOutputTokens: number }
  ): Promise<CostEstimate> {
    const cacheKey = `${modelId}-${agentType}-${JSON.stringify(customUsage)}`;
    
    if (this.costCache.has(cacheKey)) {
      return this.costCache.get(cacheKey)!;
    }

    const model = this.modelRegistry.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const requirements = AGENT_MODEL_REQUIREMENTS[agentType];
    const usage = customUsage || {
      dailyRequests: requirements.typicalUsage.requestsPerDay,
      avgInputTokens: requirements.typicalUsage.averageInputTokens,
      avgOutputTokens: requirements.typicalUsage.averageOutputTokens,
    };

    const dailyInputTokens = usage.dailyRequests * usage.avgInputTokens;
    const dailyOutputTokens = usage.dailyRequests * usage.avgOutputTokens;

    const dailyInputCost = (dailyInputTokens / 1000) * model.pricing.inputCostPer1kTokens;
    const dailyOutputCost = (dailyOutputTokens / 1000) * model.pricing.outputCostPer1kTokens;
    const dailyCost = dailyInputCost + dailyOutputCost;

    const estimate: CostEstimate = {
      dailyCost,
      monthlyCost: dailyCost * 30,
      yearlyProjection: dailyCost * 365,
      breakdown: {
        inputTokensCost: dailyInputCost,
        outputTokensCost: dailyOutputCost,
        requestCount: usage.dailyRequests,
      },
      comparison: {
        vsBaseline: {
          model: 'gpt-3.5-turbo',
          costDifference: 0,
          percentageDifference: 0,
        },
        vsAlternatives: [],
      },
    };

    // Calculate comparison with baseline
    const baselineModel = this.modelRegistry.get('gpt-3.5-turbo');
    if (baselineModel && modelId !== 'gpt-3.5-turbo') {
      const baselineEstimate = await this.calculateCostEstimate('gpt-3.5-turbo', agentType, customUsage);
      estimate.comparison.vsBaseline.costDifference = estimate.monthlyCost - baselineEstimate.monthlyCost;
      estimate.comparison.vsBaseline.percentageDifference = 
        ((estimate.monthlyCost - baselineEstimate.monthlyCost) / baselineEstimate.monthlyCost) * 100;
    }

    // Cache the result
    this.costCache.set(cacheKey, estimate);

    return estimate;
  }

  /**
   * Get all available models
   */
  getAvailableModels(): LLMModel[] {
    return Array.from(this.modelRegistry.values())
      .filter(model => model.isActive)
      .map(({ isActive, lastValidated, validationErrors, ...model }) => model);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): LLMModel | null {
    const model = this.modelRegistry.get(modelId);
    if (!model || !model.isActive) {
      return null;
    }
    
    const { isActive, lastValidated, validationErrors, ...modelData } = model;
    return modelData;
  }

  /**
   * Validate API key for a model
   */
  async validateApiKey(provider: ModelProvider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    // This would implement actual API key validation
    // For now, return a mock validation
    if (!apiKey || apiKey.length < 10) {
      return { valid: false, error: 'API key is too short' };
    }

    // In a real implementation, you would make a test API call
    return { valid: true };
  }

  /**
   * Get user's monthly cost summary
   */
  async getUserMonthlyCost(userId: UUID): Promise<{ totalCost: number; breakdown: Record<AgentType, number> }> {
    // This would query actual usage data from the database
    // For now, return mock data
    return {
      totalCost: 0,
      breakdown: {} as Record<AgentType, number>,
    };
  }

  // Private helper methods

  private isModelCompatibleWithAgent(model: LLMModel, agentType: AgentType): boolean {
    const requirements = AGENT_MODEL_REQUIREMENTS[agentType];
    
    // Check required capabilities
    for (const capability of requirements.requiredCapabilities) {
      if (!model.capabilities[capability]) {
        return false;
      }
    }

    // Check minimum context window
    if (requirements.minContextWindow && model.specifications.contextWindow < requirements.minContextWindow) {
      return false;
    }

    // Check cost constraints
    if (requirements.maxCostPer1kTokens && 
        model.pricing.outputCostPer1kTokens > requirements.maxCostPer1kTokens) {
      return false;
    }

    return true;
  }

  private calculateSuitabilityScore(
    model: LLMModel,
    requirements: typeof AGENT_MODEL_REQUIREMENTS[AgentType],
    criteria: ModelSelectionCriteria
  ): number {
    let score = 0;
    let maxScore = 0;

    // Capability score (40% weight)
    const capabilityWeight = 40;
    const requiredCaps = requirements.requiredCapabilities.length;
    const supportedCaps = requirements.requiredCapabilities.filter(cap => model.capabilities[cap]).length;
    score += (supportedCaps / requiredCaps) * capabilityWeight;
    maxScore += capabilityWeight;

    // Performance score (30% weight)
    const performanceWeight = 30;
    const performanceScore = this.calculatePerformanceScore(model, criteria.priorityFactor);
    score += performanceScore * performanceWeight / 100;
    maxScore += performanceWeight;

    // Cost score (20% weight)
    const costWeight = 20;
    const costScore = this.calculateCostScore(model, requirements);
    score += costScore * costWeight / 100;
    maxScore += costWeight;

    // Reliability score (10% weight)
    const reliabilityWeight = 10;
    score += (model.performance.reliabilityScore / 100) * reliabilityWeight;
    maxScore += reliabilityWeight;

    return Math.round((score / maxScore) * 100);
  }

  private calculatePerformanceScore(model: LLMModel, priorityFactor: string): number {
    switch (priorityFactor) {
      case 'speed':
        return model.performance.speedTier === 'fast' ? 100 : 
               model.performance.speedTier === 'balanced' ? 70 : 40;
      case 'quality':
        return model.performance.qualityTier === 'excellent' ? 100 :
               model.performance.qualityTier === 'good' ? 70 : 40;
      case 'cost':
        return 100 - (model.pricing.outputCostPer1kTokens * 1000); // Inverse of cost
      default:
        return (this.calculatePerformanceScore(model, 'speed') + 
                this.calculatePerformanceScore(model, 'quality')) / 2;
    }
  }

  private calculateCostScore(model: LLMModel, requirements: typeof AGENT_MODEL_REQUIREMENTS[AgentType]): number {
    const maxAcceptableCost = requirements.maxCostPer1kTokens || 0.1;
    const actualCost = model.pricing.outputCostPer1kTokens;
    
    if (actualCost > maxAcceptableCost) {
      return 0;
    }
    
    return Math.max(0, 100 - (actualCost / maxAcceptableCost) * 100);
  }

  private calculateCostAnalysis(model: LLMModel, requirements: typeof AGENT_MODEL_REQUIREMENTS[AgentType]) {
    const dailyRequests = requirements.typicalUsage.requestsPerDay;
    const inputTokens = dailyRequests * requirements.typicalUsage.averageInputTokens;
    const outputTokens = dailyRequests * requirements.typicalUsage.averageOutputTokens;
    
    const dailyCost = (inputTokens / 1000) * model.pricing.inputCostPer1kTokens + 
                      (outputTokens / 1000) * model.pricing.outputCostPer1kTokens;
    
    return {
      estimatedMonthlyCost: dailyCost * 30,
      costRank: 1, // Would be calculated relative to other models
      costEfficiencyScore: 80, // Mock score
    };
  }

  private calculatePerformanceAnalysis(model: LLMModel) {
    return {
      speedRank: 1, // Mock rank
      qualityRank: 1, // Mock rank
      reliabilityScore: model.performance.reliabilityScore,
      overallPerformanceScore: 85, // Mock score
    };
  }

  private getModelPros(model: LLMModel, agentType: AgentType): string[] {
    const pros: string[] = [];
    
    if (model.performance.speedTier === 'fast') {
      pros.push('Fast response times');
    }
    if (model.performance.qualityTier === 'excellent') {
      pros.push('High quality outputs');
    }
    if (model.pricing.outputCostPer1kTokens < 0.01) {
      pros.push('Cost-effective');
    }
    if (model.capabilities.multiModal) {
      pros.push('Supports images and text');
    }
    if (model.specifications.contextWindow > 50000) {
      pros.push('Large context window');
    }
    
    return pros;
  }

  private getModelCons(model: LLMModel, agentType: AgentType): string[] {
    const cons: string[] = [];
    
    if (model.performance.speedTier === 'quality') {
      cons.push('Slower response times');
    }
    if (model.pricing.outputCostPer1kTokens > 0.02) {
      cons.push('Higher cost');
    }
    if (model.availability.requiresApproval) {
      cons.push('Requires approval for access');
    }
    
    return cons;
  }

  private getRecommendationLevel(score: number): 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended' {
    if (score >= 90) return 'highly_recommended';
    if (score >= 75) return 'recommended';
    if (score >= 60) return 'suitable';
    return 'not_recommended';
  }

  private findBestValueModel(candidates: any[]): string {
    // Find model with best balance of performance and cost
    let bestValue = candidates[0];
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const valueScore = (candidate.performanceAnalysis.overallPerformanceScore * 0.6) + 
                        (candidate.costAnalysis.costEfficiencyScore * 0.4);
      if (valueScore > bestScore) {
        bestScore = valueScore;
        bestValue = candidate;
      }
    }
    
    return bestValue?.model.id || '';
  }
}

// Export singleton instance
export const llmConfigService = new LLMConfigService();
export default llmConfigService;