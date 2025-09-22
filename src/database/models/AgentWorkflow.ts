/**
 * Agent Workflow Model
 * 
 * Represents multi-agent workflow execution tracking.
 */

import { BaseEntity, UUID, WorkflowStatus, AgentType, JsonObject } from './types';

/**
 * Agent Workflow entity interface
 */
export interface AgentWorkflow extends BaseEntity {
  workflow_id: UUID;
  initiating_user?: UUID;
  agents_involved: AgentType[];
  status: WorkflowStatus;
  start_time: Date;
  end_time?: Date;
  results: JsonObject;
  model_configurations: JsonObject;
}

/**
 * Input for creating a new agent workflow
 */
export interface CreateAgentWorkflowInput {
  initiating_user?: UUID;
  agents_involved: AgentType[];
  model_configurations?: JsonObject;
}

/**
 * Input for updating an existing agent workflow
 */
export interface UpdateAgentWorkflowInput {
  status?: WorkflowStatus;
  end_time?: Date;
  results?: JsonObject;
  agents_involved?: AgentType[];
}

/**
 * Agent Workflow with populated relationships
 */
export interface AgentWorkflowWithRelations extends AgentWorkflow {
  initiating_user_info?: import('./User').User;
}

/**
 * Workflow execution step
 */
export interface WorkflowExecutionStep {
  step_id: string;
  agent_type: AgentType;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  start_time?: Date;
  end_time?: Date;
  duration_ms?: number;
  input_data?: JsonObject;
  output_data?: JsonObject;
  error_details?: {
    error_type: string;
    error_message: string;
    stack_trace?: string;
    retry_count: number;
  };
  performance_metrics: {
    tokens_used?: number;
    api_calls_made?: number;
    cost_incurred?: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

/**
 * Complete workflow execution data
 */
export interface WorkflowExecutionData {
  workflow_metadata: {
    workflow_type: 'gap_analysis' | 'peer_comparison' | 'semantic_search' | 'full_analysis';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    estimated_duration?: number;
    estimated_cost?: number;
  };
  execution_steps: WorkflowExecutionStep[];
  agent_coordination: {
    coordinator_decisions: {
      timestamp: Date;
      decision_type: 'agent_selection' | 'retry_logic' | 'error_handling' | 'optimization';
      details: JsonObject;
    }[];
    inter_agent_communication: {
      from_agent: AgentType;
      to_agent: AgentType;
      timestamp: Date;
      message_type: string;
      payload: JsonObject;
    }[];
  };
  performance_summary: {
    total_duration_ms: number;
    total_tokens_used: number;
    total_api_calls: number;
    total_cost: number;
    efficiency_score: number; // 1-100
    success_rate: number; // percentage of successful steps
  };
  quality_metrics: {
    result_accuracy?: number;
    result_completeness?: number;
    result_timeliness?: number;
    user_satisfaction?: number;
  };
}

/**
 * Workflow configuration for different agent types
 */
export interface WorkflowAgentConfiguration {
  agent_type: AgentType;
  model_config: {
    provider: string;
    model_name: string;
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
  };
  execution_params: {
    retry_attempts?: number;
    retry_delay_ms?: number;
    fallback_models?: string[];
    rate_limit_per_minute?: number;
  };
  resource_limits: {
    max_execution_time_ms?: number;
    max_memory_mb?: number;
    max_cost_usd?: number;
  };
}

/**
 * Workflow template for reusable patterns
 */
export interface WorkflowTemplate {
  template_id: string;
  template_name: string;
  description: string;
  workflow_type: string;
  agent_sequence: {
    step_order: number;
    agent_type: AgentType;
    step_name: string;
    is_required: boolean;
    depends_on_steps?: number[];
    parallel_execution?: boolean;
  }[];
  default_configurations: Record<AgentType, WorkflowAgentConfiguration>;
  estimated_metrics: {
    duration_range: [number, number]; // min, max in minutes
    cost_range: [number, number]; // min, max in USD
    success_rate: number;
  };
}

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
  workflow_id: UUID;
  overall_progress: number; // 0-100
  current_step: {
    step_name: string;
    agent_type: AgentType;
    progress: number; // 0-100
    estimated_remaining_time?: number; // milliseconds
  };
  completed_steps: number;
  total_steps: number;
  stages: {
    stage_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    steps_in_stage: number;
  }[];
}

/**
 * Workflow summary for display
 */
export interface WorkflowSummary {
  workflow_id: UUID;
  workflow_type: string;
  status: WorkflowStatus;
  initiated_by?: string;
  start_time: Date;
  duration?: number; // milliseconds
  agents_count: number;
  success_rate: number;
  total_cost?: number;
  key_results?: string[];
}

/**
 * Workflow analytics data
 */
export interface WorkflowAnalytics {
  workflow_id: UUID;
  performance_breakdown: {
    agent_type: AgentType;
    execution_time_ms: number;
    success_rate: number;
    average_response_time: number;
    error_count: number;
    cost_breakdown: {
      api_calls: number;
      tokens_used: number;
      cost_usd: number;
    };
  }[];
  bottlenecks: {
    step_name: string;
    delay_reason: string;
    impact_score: number;
    suggestions: string[];
  }[];
  optimization_opportunities: {
    area: string;
    potential_improvement: string;
    estimated_savings: {
      time_ms?: number;
      cost_usd?: number;
    };
    implementation_effort: 'low' | 'medium' | 'high';
  }[];
}