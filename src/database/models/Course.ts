/**
 * Course Model
 * 
 * Represents courses within academic programs.
 */

import { BaseEntity, UUID } from './types';

/**
 * Course entity interface
 */
export interface Course extends BaseEntity {
  course_id: UUID;
  program_id: UUID;
  course_name: string;
  course_code?: string;
  credits?: number;
  learning_outcomes: string[];
  content_description?: string;
}

/**
 * Input for creating a new course
 */
export interface CreateCourseInput {
  program_id: UUID;
  course_name: string;
  course_code?: string;
  credits?: number;
  learning_outcomes?: string[];
  content_description?: string;
}

/**
 * Input for updating an existing course
 */
export interface UpdateCourseInput {
  course_name?: string;
  course_code?: string;
  credits?: number;
  learning_outcomes?: string[];
  content_description?: string;
}

/**
 * Course with populated relationships
 */
export interface CourseWithRelations extends Course {
  program?: import('./Program').Program;
}

/**
 * Course summary for display
 */
export interface CourseSummary {
  course_id: UUID;
  course_name: string;
  course_code?: string;
  credits?: number;
  learning_outcomes_count: number;
  program_name: string;
  department?: string;
}

/**
 * Learning outcome analysis
 */
export interface LearningOutcomeAnalysis {
  outcome: string;
  outcome_index: number;
  categories: string[];
  complexity_level: 'basic' | 'intermediate' | 'advanced';
  bloom_taxonomy: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  skills: string[];
  knowledge_areas: string[];
}

/**
 * Course analysis result
 */
export interface CourseAnalysisResult {
  course_id: UUID;
  course_name: string;
  analysis_date: Date;
  learning_outcomes_analysis: LearningOutcomeAnalysis[];
  content_analysis: {
    topics: string[];
    keywords: string[];
    complexity_score: number;
    coverage_areas: string[];
  };
  peer_comparisons: {
    peer_course_id: UUID;
    peer_course_name: string;
    university_name: string;
    similarity_score: number;
    common_outcomes: string[];
    unique_outcomes: string[];
  }[];
  gaps_identified: {
    gap_type: 'content' | 'outcome' | 'skill';
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendations: string[];
  }[];
}

/**
 * Course search result
 */
export interface CourseSearchResult {
  course_id: UUID;
  course_name: string;
  course_code?: string;
  program_name: string;
  department?: string;
  match_score?: number;
  match_fields: ('name' | 'code' | 'description' | 'outcomes')[];
  highlighted_text?: string;
}

/**
 * Course comparison data
 */
export interface CourseComparison {
  ceu_course: Course;
  peer_courses: {
    course_id: UUID;
    course_name: string;
    university_name: string;
    similarity_metrics: {
      outcome_similarity: number;
      content_similarity: number;
      credit_comparison: number;
      overall_similarity: number;
    };
    differences: {
      missing_outcomes: string[];
      additional_outcomes: string[];
      content_gaps: string[];
    };
  }[];
  overall_analysis: {
    strength_areas: string[];
    improvement_areas: string[];
    recommendations: string[];
  };
}

/**
 * Course export data
 */
export interface CourseExportData extends Course {
  program: {
    program_id: UUID;
    ceu_program_name: string;
    department?: string;
  };
  analysis_summary?: {
    total_analyses: number;
    last_analysis_date?: Date;
    average_similarity_score?: number;
    gap_count: number;
  };
}