/**
 * User Model
 * 
 * Represents users in the system with authentication and preferences.
 */

import { BaseEntity, UserRole, UUID, JsonObject } from './types';

/**
 * User entity interface
 */
export interface User extends BaseEntity {
  user_id: UUID;
  email: string;
  role: UserRole;
  ui_preferences: JsonObject;
  llm_model_preferences: JsonObject;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  role: UserRole;
  ui_preferences?: JsonObject;
  llm_model_preferences?: JsonObject;
}

/**
 * Input for updating an existing user
 */
export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  ui_preferences?: JsonObject;
  llm_model_preferences?: JsonObject;
}

/**
 * User preferences interface for UI settings
 */
export interface UserUIPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    workflow?: boolean;
  };
  dashboard?: {
    layout?: 'grid' | 'list';
    defaultView?: 'overview' | 'programs' | 'analysis';
  };
}

/**
 * User LLM model preferences
 */
export interface UserLLMPreferences {
  default_provider?: string;
  preferred_models?: {
    chat?: string;
    analysis?: string;
    search?: string;
    qa?: string;
  };
  cost_limits?: {
    daily?: number;
    monthly?: number;
  };
  performance_preference?: 'speed' | 'quality' | 'cost';
}

/**
 * User with populated relationships
 */
export interface UserWithRelations extends User {
  workflows?: import('./AgentWorkflow').AgentWorkflow[];
  chat_sessions?: import('./ChatSession').ChatSession[];
  documents?: import('./Document').Document[];
  llm_configurations?: import('./LLMModelConfiguration').LLMModelConfiguration[];
  gap_analyses?: import('./GapAnalysis').GapAnalysis[];
}

/**
 * User profile view (safe for public display)
 */
export interface UserProfile {
  user_id: UUID;
  email: string;
  role: UserRole;
  created_at: Date;
  ui_preferences: UserUIPreferences;
}

/**
 * User authentication context
 */
export interface UserAuthContext {
  user_id: UUID;
  email: string;
  role: UserRole;
  permissions: string[];
  session_id?: string;
  expires_at?: Date;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  user_id: UUID;
  total_workflows: number;
  total_analyses: number;
  total_chat_sessions: number;
  total_documents_uploaded: number;
  last_active: Date;
  this_month: {
    workflows: number;
    analyses: number;
    llm_usage_cost: number;
  };
}