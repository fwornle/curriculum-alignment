/**
 * Chat Session Model
 * 
 * Represents chat interface conversation history.
 */

import { BaseEntity, UUID, JsonObject } from './types';

/**
 * Chat Session entity interface
 */
export interface ChatSession extends BaseEntity {
  session_id: UUID;
  user_id: UUID;
  conversation_history: JsonObject;
  context_data: JsonObject;
  model_used?: string;
}

/**
 * Input for creating a new chat session
 */
export interface CreateChatSessionInput {
  user_id: UUID;
  conversation_history?: JsonObject;
  context_data?: JsonObject;
  model_used?: string;
}

/**
 * Input for updating an existing chat session
 */
export interface UpdateChatSessionInput {
  conversation_history?: JsonObject;
  context_data?: JsonObject;
  model_used?: string;
}

/**
 * Chat Session with populated relationships
 */
export interface ChatSessionWithRelations extends ChatSession {
  user?: import('./User').User;
}

/**
 * Individual chat message structure
 */
export interface ChatMessage {
  message_id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: 'text' | 'file' | 'image' | 'document' | 'analysis_result';
  metadata?: {
    tokens_used?: number;
    response_time_ms?: number;
    model_used?: string;
    confidence_score?: number;
    sources?: string[];
    attachments?: {
      file_id: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }[];
  };
  context_references?: {
    program_id?: UUID;
    course_id?: UUID;
    analysis_id?: UUID;
    workflow_id?: UUID;
  };
}

/**
 * Structured conversation history
 */
export interface ConversationHistory {
  messages: ChatMessage[];
  session_metadata: {
    start_time: Date;
    last_activity: Date;
    total_messages: number;
    total_tokens_used: number;
    average_response_time: number;
    topics_discussed: string[];
    context_switches: number;
  };
  conversation_summary?: {
    key_topics: string[];
    decisions_made: string[];
    action_items: string[];
    unresolved_questions: string[];
  };
}

/**
 * Chat context data structure
 */
export interface ChatContextData {
  current_context: {
    active_program?: UUID;
    active_analysis?: UUID;
    active_workflow?: UUID;
    focus_area?: 'programs' | 'analysis' | 'comparison' | 'general';
  };
  user_preferences: {
    response_style?: 'detailed' | 'concise' | 'technical' | 'conversational';
    include_sources?: boolean;
    include_confidence?: boolean;
    preferred_language?: string;
  };
  session_goals: {
    primary_objective?: string;
    specific_questions?: string[];
    expected_outcomes?: string[];
  };
  conversation_state: {
    last_query_type?: 'information' | 'analysis' | 'comparison' | 'recommendation';
    pending_clarifications?: string[];
    context_entities?: {
      programs: UUID[];
      courses: UUID[];
      universities: UUID[];
    };
  };
}

/**
 * Chat session analytics
 */
export interface ChatSessionAnalytics {
  session_id: UUID;
  engagement_metrics: {
    session_duration_minutes: number;
    message_count: number;
    average_message_length: number;
    response_satisfaction?: number; // 1-5 rating
    completion_rate: number; // did user achieve their goal?
  };
  content_analysis: {
    topics_covered: {
      topic: string;
      message_count: number;
      time_spent_minutes: number;
    }[];
    query_types: {
      information_seeking: number;
      analysis_requests: number;
      comparison_requests: number;
      recommendation_requests: number;
    };
    complexity_levels: {
      simple: number;
      moderate: number;
      complex: number;
    };
  };
  technical_metrics: {
    total_tokens_used: number;
    total_cost_usd: number;
    average_response_time_ms: number;
    error_count: number;
    model_switches: number;
  };
  outcome_tracking: {
    workflows_initiated: number;
    analyses_requested: number;
    reports_generated: number;
    decisions_supported: string[];
  };
}

/**
 * Chat session summary for display
 */
export interface ChatSessionSummary {
  session_id: UUID;
  user_email: string;
  start_time: Date;
  last_activity: Date;
  message_count: number;
  duration_minutes: number;
  primary_topics: string[];
  status: 'active' | 'completed' | 'abandoned';
  key_outcomes?: string[];
}

/**
 * Chat session export data
 */
export interface ChatSessionExportData extends ChatSession {
  user_info: {
    email: string;
    role: string;
  };
  formatted_conversation: {
    timestamp: Date;
    speaker: string;
    message: string;
    attachments?: string[];
    context_info?: string;
  }[];
  session_analytics: ChatSessionAnalytics;
  conversation_insights: {
    key_insights: string[];
    action_items: string[];
    follow_up_required: boolean;
    satisfaction_level?: 'high' | 'medium' | 'low';
  };
}

/**
 * Chat message search result
 */
export interface ChatMessageSearchResult {
  session_id: UUID;
  message_id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content_snippet: string;
  match_score: number;
  context_info: {
    user_email: string;
    session_topic?: string;
    related_entities?: string[];
  };
}