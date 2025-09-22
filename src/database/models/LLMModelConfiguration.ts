/**
 * LLM Model Configuration Model
 * 
 * Represents user-specific LLM model preferences per agent.
 */

import { BaseEntity, UUID, AgentType, ModelProvider } from './types';

/**
 * LLM Model Configuration entity interface
 */
export interface LLMModelConfiguration extends BaseEntity {
  config_id: UUID;
  user_id: UUID;
  agent_type: AgentType;
  model_provider: ModelProvider;
  model_name: string;
  api_key_reference?: string;
}

/**
 * Input for creating a new LLM model configuration
 */
export interface CreateLLMModelConfigurationInput {
  user_id: UUID;
  agent_type: AgentType;
  model_provider: ModelProvider;
  model_name: string;
  api_key_reference?: string;
}

/**
 * Input for updating an existing LLM model configuration
 */
export interface UpdateLLMModelConfigurationInput {
  model_provider?: ModelProvider;
  model_name?: string;
  api_key_reference?: string;
}

/**
 * LLM Model Configuration with populated relationships
 */
export interface LLMModelConfigurationWithRelations extends LLMModelConfiguration {
  user?: import('./User').User;
}

/**
 * Available model information
 */
export interface AvailableModel {
  provider: ModelProvider;
  model_name: string;
  display_name: string;
  description: string;
  capabilities: {
    text_generation: boolean;
    text_analysis: boolean;
    code_generation: boolean;
    image_analysis: boolean;
    document_processing: boolean;
    reasoning: boolean;
  };
  specifications: {
    context_window: number;
    max_output_tokens: number;
    training_cutoff?: string;
    languages_supported: string[];
  };
  performance_metrics: {
    speed_tier: 'fast' | 'medium' | 'slow';
    quality_tier: 'basic' | 'good' | 'excellent';
    reasoning_capability: 'basic' | 'intermediate' | 'advanced';
  };
  pricing: {
    input_cost_per_1k_tokens: number;
    output_cost_per_1k_tokens: number;
    currency: 'USD';
    billing_model: 'per_token' | 'per_request' | 'subscription';
  };
  availability: {
    status: 'available' | 'limited' | 'deprecated' | 'beta';
    rate_limits: {
      requests_per_minute: number;
      tokens_per_minute: number;
      requests_per_day?: number;
    };
    regions: string[];
  };
}

/**
 * Model recommendation for specific use case
 */
export interface ModelRecommendation {
  agent_type: AgentType;
  use_case_description: string;
  recommended_models: {
    model: AvailableModel;
    suitability_score: number; // 0-100
    pros: string[];
    cons: string[];
    estimated_monthly_cost: number;
    performance_prediction: {
      speed: 'fast' | 'medium' | 'slow';
      quality: 'basic' | 'good' | 'excellent';
      reliability: 'high' | 'medium' | 'low';
    };
  }[];
  cost_comparison: {
    lowest_cost: number;
    highest_cost: number;
    recommended_budget: number;
  };
  performance_tradeoffs: {
    speed_vs_quality: string;
    cost_vs_performance: string;
    recommendations: string[];
  };
}

/**
 * User's complete model configuration profile
 */
export interface UserModelProfile {
  user_id: UUID;
  configurations: LLMModelConfiguration[];
  usage_preferences: {
    priority_factor: 'cost' | 'speed' | 'quality' | 'balanced';
    max_monthly_budget?: number;
    preferred_providers: ModelProvider[];
    fallback_strategy: 'cheaper_model' | 'same_provider' | 'best_available';
  };
  usage_statistics: {
    total_requests_this_month: number;
    total_cost_this_month: number;
    average_response_time: number;
    success_rate: number;
    most_used_models: {
      agent_type: AgentType;
      model_name: string;
      usage_count: number;
    }[];
  };
  cost_tracking: {
    daily_costs: {
      date: string;
      cost: number;
      requests: number;
    }[];
    projected_monthly_cost: number;
    budget_alerts: {
      level: 'warning' | 'critical';
      threshold_percentage: number;
      message: string;
    }[];
  };
}

/**
 * Model performance analytics
 */
export interface ModelPerformanceAnalytics {
  config_id: UUID;
  agent_type: AgentType;
  model_name: string;
  time_period: {
    start_date: Date;
    end_date: Date;
  };
  performance_metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time_ms: number;
    average_tokens_per_request: number;
    total_cost: number;
  };
  quality_metrics: {
    user_satisfaction_rating?: number; // 1-5
    task_success_rate: number; // 0-100
    output_quality_score?: number; // 1-100
    error_rate: number; // 0-100
  };
  efficiency_analysis: {
    cost_per_successful_task: number;
    time_per_successful_task: number;
    resource_utilization: number; // 0-100
    optimization_opportunities: string[];
  };
  comparison_with_alternatives: {
    alternative_model: string;
    cost_difference: number;
    performance_difference: number;
    quality_difference: number;
    recommendation: 'switch' | 'keep' | 'consider';
  }[];
}

/**
 * Model configuration validation result
 */
export interface ModelConfigurationValidation {
  config_id: UUID;
  validation_status: 'valid' | 'invalid' | 'warning';
  checks_performed: {
    api_key_validity: boolean;
    model_availability: boolean;
    rate_limit_compliance: boolean;
    cost_budget_check: boolean;
    provider_status: boolean;
  };
  issues_found: {
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    suggested_action: string;
  }[];
  recommendations: {
    immediate_actions: string[];
    optimization_suggestions: string[];
    cost_saving_opportunities: string[];
  };
}

/**
 * Bulk model configuration update
 */
export interface BulkModelConfigurationUpdate {
  operation_id: UUID;
  user_id: UUID;
  updates: {
    agent_type: AgentType;
    new_model_provider?: ModelProvider;
    new_model_name?: string;
    reason?: string;
  }[];
  operation_result: {
    successful_updates: number;
    failed_updates: number;
    total_estimated_cost_change: number;
    performance_impact_summary: string;
    details: {
      agent_type: AgentType;
      status: 'success' | 'failed' | 'skipped';
      error_message?: string;
      old_config?: string;
      new_config?: string;
    }[];
  };
}