/**
 * LLM Model Types and Configurations
 * 
 * Centralized definitions for all supported LLM models, providers,
 * and their capabilities, pricing, and performance characteristics.
 */

import { AgentType, ModelProvider } from '../database/models';

/**
 * LLM Model capability flags
 */
export interface ModelCapabilities {
  textGeneration: boolean;
  textAnalysis: boolean;
  codeGeneration: boolean;
  imageAnalysis: boolean;
  documentProcessing: boolean;
  reasoning: boolean;
  multiModal: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
  streaming: boolean;
}

/**
 * Model performance tiers
 */
export type PerformanceTier = 'fast' | 'balanced' | 'quality';
export type QualityTier = 'basic' | 'good' | 'excellent';
export type ReasoningCapability = 'basic' | 'intermediate' | 'advanced';

/**
 * Model specifications
 */
export interface ModelSpecifications {
  contextWindow: number;
  maxOutputTokens: number;
  trainingCutoff?: string;
  languagesSupported: string[];
  inputTypes: ('text' | 'image' | 'audio' | 'video')[];
  outputTypes: ('text' | 'image' | 'audio')[];
}

/**
 * Model pricing structure
 */
export interface ModelPricing {
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  currency: 'USD';
  billingModel: 'per_token' | 'per_request' | 'subscription';
  minimumCharge?: number;
  discountTiers?: {
    volumeThreshold: number;
    discountPercentage: number;
  }[];
}

/**
 * Rate limits and availability
 */
export interface ModelAvailability {
  status: 'available' | 'limited' | 'deprecated' | 'beta' | 'preview';
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay?: number;
    tokensPerDay?: number;
  };
  regions: string[];
  requiresApproval: boolean;
  betaAccess?: boolean;
}

/**
 * Complete model definition
 */
export interface LLMModel {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  description: string;
  version?: string;
  capabilities: ModelCapabilities;
  specifications: ModelSpecifications;
  performance: {
    speedTier: PerformanceTier;
    qualityTier: QualityTier;
    reasoningCapability: ReasoningCapability;
    averageLatencyMs: number;
    reliabilityScore: number; // 0-100
  };
  pricing: ModelPricing;
  availability: ModelAvailability;
  recommendedFor: AgentType[];
  notRecommendedFor?: AgentType[];
  metadata: {
    releaseDate?: string;
    lastUpdated: string;
    documentation?: string;
    examples?: string[];
    limitations?: string[];
  };
}

/**
 * Agent-specific model requirements
 */
export interface AgentModelRequirements {
  agentType: AgentType;
  requiredCapabilities: (keyof ModelCapabilities)[];
  preferredPerformance: {
    speedTier?: PerformanceTier;
    qualityTier?: QualityTier;
    reasoningCapability?: ReasoningCapability;
  };
  maxCostPer1kTokens?: number;
  minContextWindow?: number;
  taskDescription: string;
  typicalUsage: {
    averageInputTokens: number;
    averageOutputTokens: number;
    requestsPerDay: number;
  };
}

/**
 * Model selection criteria
 */
export interface ModelSelectionCriteria {
  priorityFactor: 'cost' | 'speed' | 'quality' | 'balanced';
  maxMonthlyCost?: number;
  maxLatencyMs?: number;
  minQualityScore?: number;
  requiredCapabilities?: (keyof ModelCapabilities)[];
  preferredProviders?: ModelProvider[];
  excludedProviders?: ModelProvider[];
  fallbackStrategy: 'cheaper_model' | 'same_provider' | 'best_available' | 'fail';
}

/**
 * Model usage statistics
 */
export interface ModelUsageStats {
  modelId: string;
  agentType: AgentType;
  userId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  usage: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    averageLatencyMs: number;
    successRate: number;
    errorRate: number;
  };
  performance: {
    userSatisfactionRating?: number; // 1-5
    taskSuccessRate: number; // 0-100
    qualityScore?: number; // 1-100
    costEfficiencyScore: number; // 0-100
  };
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  agentType: AgentType;
  criteria: ModelSelectionCriteria;
  candidates: {
    model: LLMModel;
    suitabilityScore: number; // 0-100
    costAnalysis: {
      estimatedMonthlyCost: number;
      costRank: number; // 1-based
      costEfficiencyScore: number;
    };
    performanceAnalysis: {
      speedRank: number;
      qualityRank: number;
      reliabilityScore: number;
      overallPerformanceScore: number;
    };
    pros: string[];
    cons: string[];
    recommendation: 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended';
  }[];
  topRecommendation: string; // model ID
  alternativeRecommendations: string[];
  costComparison: {
    cheapest: string;
    mostExpensive: string;
    bestValue: string;
  };
}

/**
 * Pre-defined model configurations for each agent type
 */
export const AGENT_MODEL_REQUIREMENTS: Record<AgentType, AgentModelRequirements> = {
  'coordinator': {
    agentType: 'coordinator',
    requiredCapabilities: ['textGeneration', 'reasoning', 'functionCalling'],
    preferredPerformance: {
      speedTier: 'fast',
      qualityTier: 'good',
      reasoningCapability: 'intermediate',
    },
    maxCostPer1kTokens: 0.01,
    minContextWindow: 8000,
    taskDescription: 'Orchestrate multi-agent workflows and make routing decisions',
    typicalUsage: {
      averageInputTokens: 500,
      averageOutputTokens: 200,
      requestsPerDay: 1000,
    },
  },
  'web-search': {
    agentType: 'web-search',
    requiredCapabilities: ['textGeneration', 'textAnalysis'],
    preferredPerformance: {
      speedTier: 'fast',
      qualityTier: 'good',
      reasoningCapability: 'basic',
    },
    maxCostPer1kTokens: 0.005,
    minContextWindow: 4000,
    taskDescription: 'Search for and analyze peer university programs online',
    typicalUsage: {
      averageInputTokens: 300,
      averageOutputTokens: 150,
      requestsPerDay: 500,
    },
  },
  'browser': {
    agentType: 'browser',
    requiredCapabilities: ['textGeneration', 'textAnalysis'],
    preferredPerformance: {
      speedTier: 'balanced',
      qualityTier: 'good',
      reasoningCapability: 'intermediate',
    },
    maxCostPer1kTokens: 0.01,
    minContextWindow: 8000,
    taskDescription: 'Navigate websites and extract structured data',
    typicalUsage: {
      averageInputTokens: 800,
      averageOutputTokens: 400,
      requestsPerDay: 200,
    },
  },
  'document-processing': {
    agentType: 'document-processing',
    requiredCapabilities: ['textAnalysis', 'documentProcessing', 'multiModal'],
    preferredPerformance: {
      speedTier: 'balanced',
      qualityTier: 'excellent',
      reasoningCapability: 'advanced',
    },
    maxCostPer1kTokens: 0.02,
    minContextWindow: 16000,
    taskDescription: 'Process and extract structured data from academic documents',
    typicalUsage: {
      averageInputTokens: 2000,
      averageOutputTokens: 800,
      requestsPerDay: 100,
    },
  },
  'accreditation-expert': {
    agentType: 'accreditation-expert',
    requiredCapabilities: ['textGeneration', 'textAnalysis', 'reasoning'],
    preferredPerformance: {
      speedTier: 'quality',
      qualityTier: 'excellent',
      reasoningCapability: 'advanced',
    },
    maxCostPer1kTokens: 0.05,
    minContextWindow: 32000,
    taskDescription: 'Analyze curricula and identify gaps with expert-level reasoning',
    typicalUsage: {
      averageInputTokens: 4000,
      averageOutputTokens: 1500,
      requestsPerDay: 50,
    },
  },
  'qa': {
    agentType: 'qa',
    requiredCapabilities: ['textAnalysis', 'textGeneration'],
    preferredPerformance: {
      speedTier: 'fast',
      qualityTier: 'good',
      reasoningCapability: 'intermediate',
    },
    maxCostPer1kTokens: 0.003,
    minContextWindow: 8000,
    taskDescription: 'Quality assurance and terminology standardization',
    typicalUsage: {
      averageInputTokens: 600,
      averageOutputTokens: 300,
      requestsPerDay: 300,
    },
  },
  'semantic-search': {
    agentType: 'semantic-search',
    requiredCapabilities: ['textAnalysis'],
    preferredPerformance: {
      speedTier: 'fast',
      qualityTier: 'good',
      reasoningCapability: 'basic',
    },
    maxCostPer1kTokens: 0.002,
    minContextWindow: 2000,
    taskDescription: 'Perform vector similarity searches and ranking',
    typicalUsage: {
      averageInputTokens: 200,
      averageOutputTokens: 100,
      requestsPerDay: 800,
    },
  },
  'chat-interface': {
    agentType: 'chat-interface',
    requiredCapabilities: ['textGeneration', 'reasoning', 'streaming'],
    preferredPerformance: {
      speedTier: 'balanced',
      qualityTier: 'excellent',
      reasoningCapability: 'advanced',
    },
    maxCostPer1kTokens: 0.03,
    minContextWindow: 16000,
    taskDescription: 'Natural language Q&A and conversation management',
    typicalUsage: {
      averageInputTokens: 1000,
      averageOutputTokens: 500,
      requestsPerDay: 200,
    },
  },
};

/**
 * Cost estimation utilities
 */
export interface CostEstimate {
  dailyCost: number;
  monthlyCost: number;
  yearlyProjection: number;
  breakdown: {
    inputTokensCost: number;
    outputTokensCost: number;
    requestCount: number;
  };
  comparison: {
    vsBaseline: {
      model: string;
      costDifference: number;
      percentageDifference: number;
    };
    vsAlternatives: {
      model: string;
      costDifference: number;
    }[];
  };
}

/**
 * Model recommendation context
 */
export interface RecommendationContext {
  agentType: AgentType;
  userId?: string;
  currentModel?: string;
  budgetConstraints?: {
    maxMonthlyCost: number;
    currentSpend: number;
  };
  performanceRequirements?: {
    maxLatencyMs: number;
    minQualityScore: number;
    minReliabilityScore: number;
  };
  usagePatterns?: {
    peakUsageHours: number[];
    typicalRequestSize: number;
    burstyTraffic: boolean;
  };
  preferences?: {
    preferredProviders: ModelProvider[];
    avoidProviders: ModelProvider[];
    prioritizeLatency: boolean;
    prioritizeCost: boolean;
    prioritizeQuality: boolean;
  };
}