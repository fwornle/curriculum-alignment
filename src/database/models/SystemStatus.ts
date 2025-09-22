/**
 * System Status Model
 * 
 * Represents real-time status of system agents.
 */

import { BaseEntity, UUID, AgentStatus, JsonObject } from './types';

/**
 * System Status entity interface
 */
export interface SystemStatus extends BaseEntity {
  status_id: UUID;
  agent_name: string;
  status: AgentStatus;
  last_heartbeat?: Date;
  performance_metrics: JsonObject;
  error_count: number;
}

/**
 * Input for creating a new system status entry
 */
export interface CreateSystemStatusInput {
  agent_name: string;
  status?: AgentStatus;
  last_heartbeat?: Date;
  performance_metrics?: JsonObject;
  error_count?: number;
}

/**
 * Input for updating an existing system status entry
 */
export interface UpdateSystemStatusInput {
  status?: AgentStatus;
  last_heartbeat?: Date;
  performance_metrics?: JsonObject;
  error_count?: number;
}

/**
 * Agent performance metrics structure
 */
export interface AgentPerformanceMetrics {
  response_time: {
    average_ms: number;
    min_ms: number;
    max_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  throughput: {
    requests_per_minute: number;
    requests_per_hour: number;
    successful_requests_rate: number; // 0-1
  };
  resource_usage: {
    cpu_percentage?: number;
    memory_mb?: number;
    disk_io_mb?: number;
    network_io_mb?: number;
  };
  api_metrics: {
    total_api_calls: number;
    failed_api_calls: number;
    rate_limited_calls: number;
    average_tokens_per_call?: number;
    total_cost_usd?: number;
  };
  quality_metrics: {
    success_rate: number; // 0-1
    user_satisfaction?: number; // 1-5
    task_completion_rate: number; // 0-1
    accuracy_score?: number; // 0-1
  };
  availability: {
    uptime_percentage: number; // 0-100
    last_downtime?: Date;
    total_downtime_minutes_today: number;
    health_check_success_rate: number; // 0-1
  };
}

/**
 * System health overview
 */
export interface SystemHealthOverview {
  overall_status: 'healthy' | 'degraded' | 'critical' | 'maintenance';
  timestamp: Date;
  agents_summary: {
    total_agents: number;
    active_agents: number;
    idle_agents: number;
    error_agents: number;
    maintenance_agents: number;
  };
  system_metrics: {
    average_response_time: number;
    overall_success_rate: number;
    total_requests_last_hour: number;
    total_errors_last_hour: number;
    cost_burn_rate_per_hour: number;
  };
  alerts: {
    critical_count: number;
    warning_count: number;
    info_count: number;
    recent_alerts: {
      level: 'critical' | 'warning' | 'info';
      agent_name: string;
      message: string;
      timestamp: Date;
    }[];
  };
  trends: {
    performance_trend: 'improving' | 'stable' | 'degrading';
    error_trend: 'improving' | 'stable' | 'degrading';
    cost_trend: 'decreasing' | 'stable' | 'increasing';
  };
}

/**
 * Agent status detail
 */
export interface AgentStatusDetail {
  agent_name: string;
  status: AgentStatus;
  last_heartbeat?: Date;
  uptime_hours: number;
  current_load: number; // 0-100
  performance_metrics: AgentPerformanceMetrics;
  recent_activities: {
    timestamp: Date;
    activity_type: 'request_processed' | 'error_occurred' | 'status_changed' | 'maintenance';
    description: string;
    duration_ms?: number;
    success: boolean;
  }[];
  configuration: {
    model_provider?: string;
    model_name?: string;
    max_concurrent_requests: number;
    timeout_ms: number;
    retry_attempts: number;
  };
  dependencies: {
    service_name: string;
    status: 'available' | 'unavailable' | 'degraded';
    last_check: Date;
    response_time_ms?: number;
  }[];
}

/**
 * System monitoring alert
 */
export interface SystemAlert {
  alert_id: UUID;
  agent_name: string;
  alert_level: 'critical' | 'warning' | 'info';
  alert_type: 'performance' | 'error_rate' | 'availability' | 'cost' | 'configuration';
  message: string;
  details: JsonObject;
  timestamp: Date;
  resolved: boolean;
  resolved_at?: Date;
  resolution_notes?: string;
  auto_resolved: boolean;
}

/**
 * Agent diagnostic information
 */
export interface AgentDiagnostics {
  agent_name: string;
  diagnostic_timestamp: Date;
  health_checks: {
    check_name: string;
    status: 'pass' | 'fail' | 'warning';
    response_time_ms: number;
    details: string;
    last_success?: Date;
    failure_count: number;
  }[];
  configuration_status: {
    is_valid: boolean;
    validation_errors: string[];
    missing_requirements: string[];
    deprecated_settings: string[];
  };
  performance_analysis: {
    bottlenecks: string[];
    optimization_suggestions: string[];
    resource_constraints: string[];
    scalability_assessment: string;
  };
  error_analysis: {
    recent_errors: {
      timestamp: Date;
      error_type: string;
      error_message: string;
      frequency: number;
      impact_level: 'low' | 'medium' | 'high';
    }[];
    error_patterns: string[];
    suggested_fixes: string[];
  };
}

/**
 * System capacity planning data
 */
export interface SystemCapacityData {
  current_capacity: {
    max_concurrent_requests: number;
    current_utilization: number; // 0-100
    available_capacity: number; // 0-100
  };
  usage_patterns: {
    peak_hours: string[];
    average_load_by_hour: number[];
    seasonal_patterns: string[];
  };
  scaling_recommendations: {
    immediate_needs: string[];
    short_term_planning: string[];
    long_term_strategy: string[];
    cost_implications: {
      current_monthly_cost: number;
      projected_cost_with_scaling: number;
      roi_analysis: string;
    };
  };
  resource_forecasting: {
    projected_growth_rate: number; // percentage
    expected_peak_load: number;
    recommended_capacity_buffer: number; // percentage
    scaling_trigger_points: {
      cpu_threshold: number;
      memory_threshold: number;
      response_time_threshold: number;
      error_rate_threshold: number;
    };
  };
}

/**
 * System maintenance schedule
 */
export interface MaintenanceSchedule {
  maintenance_id: UUID;
  agent_name?: string; // null for system-wide maintenance
  maintenance_type: 'routine' | 'emergency' | 'update' | 'scaling';
  scheduled_start: Date;
  scheduled_end: Date;
  estimated_downtime_minutes: number;
  impact_level: 'none' | 'minimal' | 'moderate' | 'high';
  description: string;
  preparations_required: string[];
  rollback_plan: string;
  notification_schedule: {
    advance_notice_hours: number[];
    notification_channels: string[];
    stakeholder_groups: string[];
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  actual_duration_minutes?: number;
  completion_notes?: string;
}