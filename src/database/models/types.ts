/**
 * Common Types for Database Models
 * 
 * This file contains shared types and interfaces used across all database models.
 */

/**
 * Base interface for all database entities with timestamps
 */
export interface BaseEntity {
  created_at: Date;
  updated_at: Date;
}

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'faculty' | 'staff' | 'student' | 'readonly';

/**
 * Agent workflow statuses
 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * System agent statuses
 */
export type AgentStatus = 'active' | 'idle' | 'error' | 'maintenance' | 'unknown';

/**
 * Document types
 */
export type DocumentType = 'excel' | 'word' | 'pdf' | 'text' | 'csv' | 'json' | 'xml';

/**
 * Analysis types
 */
export type AnalysisType = 'gap' | 'comparison' | 'semantic' | 'comprehensive' | 'quick';

/**
 * LLM Model providers
 */
export type ModelProvider = 'openai' | 'anthropic' | 'grok' | 'google' | 'azure';

/**
 * Agent types in the system
 */
export type AgentType = 
  | 'coordinator'
  | 'web-search'
  | 'browser'
  | 'document-processing'
  | 'accreditation-expert'
  | 'qa'
  | 'semantic-search'
  | 'chat-interface';

/**
 * Generic JSON object type
 */
export type JsonObject = Record<string, any>;

/**
 * UUID type for better type safety
 */
export type UUID = string;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Search parameters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create/Update timestamps interface
 */
export interface Timestamps {
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Soft delete interface
 */
export interface SoftDelete {
  deleted_at?: Date | null;
}

/**
 * Common error types for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, public field?: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * Model operation result types
 */
export interface CreateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateResult<T> {
  success: boolean;
  data?: T;
  rowsAffected: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  rowsAffected: number;
  error?: string;
}

/**
 * Filter operators for advanced queries
 */
export type FilterOperator = 
  | 'eq'      // equals
  | 'ne'      // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'like'    // SQL LIKE
  | 'ilike'   // case-insensitive LIKE
  | 'in'      // IN array
  | 'nin'     // NOT IN array
  | 'null'    // IS NULL
  | 'nnull';  // IS NOT NULL

/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Complex filter with logical operators
 */
export interface ComplexFilter {
  and?: FilterCondition[];
  or?: FilterCondition[];
  not?: FilterCondition;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Query builder options
 */
export interface QueryOptions {
  filters?: ComplexFilter;
  sort?: SortConfig[];
  pagination?: PaginationParams;
  includes?: string[];
  fields?: string[];
}