/**
 * Database Models Index
 * 
 * Centralized export of all database models and types.
 */

// Core types and interfaces
export * from './types';

// Entity models
export * from './User';
export * from './Program';
export * from './Course';
export * from './PeerUniversity';
export * from './PeerProgram';
export * from './GapAnalysis';
export * from './ComparisonReport';
export * from './AgentWorkflow';
export * from './ChatSession';
export * from './Document';
export * from './LLMModelConfiguration';
export * from './SystemStatus';

// Re-export common types for convenience
export type {
  UUID,
  UserRole,
  WorkflowStatus,
  AgentStatus,
  DocumentType,
  AnalysisType,
  ModelProvider,
  AgentType,
  JsonObject,
  PaginationParams,
  PaginatedResult,
  SearchParams,
  BaseEntity,
  FilterOperator,
  FilterCondition,
  ComplexFilter,
  SortConfig,
  QueryOptions,
  CreateResult,
  UpdateResult,
  DeleteResult
} from './types';

// Database error types
export {
  DatabaseError,
  ValidationError,
  NotFoundError,
  ConflictError
} from './types';