/**
 * Program Model
 * 
 * Represents academic programs at CEU.
 */

import { BaseEntity, UUID } from './types';

/**
 * Program entity interface
 */
export interface Program extends BaseEntity {
  program_id: UUID;
  ceu_program_name: string;
  description?: string;
  department?: string;
}

/**
 * Input for creating a new program
 */
export interface CreateProgramInput {
  ceu_program_name: string;
  description?: string;
  department?: string;
}

/**
 * Input for updating an existing program
 */
export interface UpdateProgramInput {
  ceu_program_name?: string;
  description?: string;
  department?: string;
}

/**
 * Program with populated relationships
 */
export interface ProgramWithRelations extends Program {
  courses?: import('./Course').Course[];
  gap_analyses?: import('./GapAnalysis').GapAnalysis[];
  comparison_reports?: import('./ComparisonReport').ComparisonReport[];
}

/**
 * Program summary for dashboard display
 */
export interface ProgramSummary {
  program_id: UUID;
  ceu_program_name: string;
  department?: string;
  course_count: number;
  analysis_count: number;
  last_analysis_date?: Date;
  analysis_status?: 'none' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Program statistics
 */
export interface ProgramStatistics {
  program_id: UUID;
  program_name: string;
  total_courses: number;
  total_credits: number;
  learning_outcomes_count: number;
  gap_analyses: {
    total: number;
    completed: number;
    pending: number;
  };
  comparison_reports: {
    total: number;
    recent: number; // last 30 days
  };
  peer_comparisons: number;
  last_updated: Date;
}

/**
 * Program search result
 */
export interface ProgramSearchResult {
  program_id: UUID;
  ceu_program_name: string;
  description?: string;
  department?: string;
  match_score?: number;
  highlighted_fields?: string[];
  course_matches?: {
    course_id: UUID;
    course_name: string;
    match_type: 'name' | 'description' | 'outcomes';
  }[];
}

/**
 * Program export data
 */
export interface ProgramExportData extends Program {
  courses: {
    course_id: UUID;
    course_name: string;
    course_code?: string;
    credits?: number;
    learning_outcomes: string[];
    content_description?: string;
  }[];
  statistics: ProgramStatistics;
  recent_analyses: {
    analysis_id: UUID;
    analysis_type: string;
    created_at: Date;
    gap_count: number;
    recommendation_count: number;
  }[];
}