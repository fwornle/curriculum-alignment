/**
 * Peer Program Model
 * 
 * Represents academic programs from peer universities.
 */

import { BaseEntity, UUID, JsonObject } from './types';

/**
 * Peer Program entity interface
 */
export interface PeerProgram extends BaseEntity {
  peer_program_id: UUID;
  university_id: UUID;
  program_name: string;
  description?: string;
  courses_data: JsonObject;
  analysis_date: Date;
}

/**
 * Input for creating a new peer program
 */
export interface CreatePeerProgramInput {
  university_id: UUID;
  program_name: string;
  description?: string;
  courses_data?: JsonObject;
}

/**
 * Input for updating an existing peer program
 */
export interface UpdatePeerProgramInput {
  program_name?: string;
  description?: string;
  courses_data?: JsonObject;
  analysis_date?: Date;
}

/**
 * Peer Program with populated relationships
 */
export interface PeerProgramWithRelations extends PeerProgram {
  university?: import('./PeerUniversity').PeerUniversity;
}

/**
 * Structured course data within peer programs
 */
export interface PeerCourseData {
  course_name: string;
  course_code?: string;
  credits?: number;
  ects_credits?: number;
  semester?: string;
  year?: number;
  description?: string;
  learning_outcomes?: string[];
  prerequisites?: string[];
  assessment_methods?: string[];
  instructors?: string[];
  schedule?: {
    lectures?: number;
    seminars?: number;
    labs?: number;
    total_hours?: number;
  };
}

/**
 * Complete peer program data structure
 */
export interface PeerProgramData {
  program_info: {
    duration_years?: number;
    degree_type?: string;
    language_of_instruction?: string;
    accreditation?: string[];
    admission_requirements?: string[];
    graduation_requirements?: string[];
  };
  curriculum: {
    total_credits?: number;
    core_courses: PeerCourseData[];
    elective_courses: PeerCourseData[];
    thesis_requirements?: {
      required: boolean;
      credits?: number;
      duration_semesters?: number;
    };
  };
  specializations?: {
    name: string;
    description?: string;
    required_courses: string[];
    elective_courses: string[];
  }[];
  metadata: {
    collected_date: Date;
    source_url?: string;
    collection_method: 'web_scraping' | 'api' | 'manual' | 'document_upload';
    data_quality_score?: number;
    completeness_percentage?: number;
  };
}

/**
 * Peer program analysis result
 */
export interface PeerProgramAnalysis {
  peer_program_id: UUID;
  ceu_program_comparisons: {
    ceu_program_id: UUID;
    ceu_program_name: string;
    similarity_scores: {
      overall: number;
      curriculum_structure: number;
      course_content: number;
      learning_outcomes: number;
      credit_distribution: number;
    };
    alignment_details: {
      matching_courses: {
        peer_course: string;
        ceu_course: string;
        similarity_score: number;
      }[];
      unique_peer_courses: string[];
      unique_ceu_courses: string[];
      content_gaps: {
        area: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }[];
    };
  }[];
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
  analysis_confidence: number;
}

/**
 * Peer program summary for display
 */
export interface PeerProgramSummary {
  peer_program_id: UUID;
  program_name: string;
  university_name: string;
  country?: string;
  total_courses: number;
  total_credits?: number;
  analysis_date: Date;
  best_ceu_match?: {
    program_name: string;
    similarity_score: number;
  };
  data_quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Peer program search result
 */
export interface PeerProgramSearchResult {
  peer_program_id: UUID;
  program_name: string;
  university_name: string;
  country?: string;
  match_score?: number;
  matching_fields: ('name' | 'description' | 'courses')[];
  preview_courses: string[];
  similarity_to_ceu?: {
    closest_program: string;
    similarity_score: number;
  };
}

/**
 * Peer program comparison matrix
 */
export interface PeerProgramComparisonMatrix {
  ceu_program: {
    program_id: UUID;
    program_name: string;
  };
  peer_programs: {
    peer_program_id: UUID;
    program_name: string;
    university_name: string;
    country?: string;
    comparison_metrics: {
      curriculum_overlap: number;
      outcome_alignment: number;
      structure_similarity: number;
      innovation_factor: number;
      overall_score: number;
    };
    distinctive_features: string[];
    transferable_elements: string[];
  }[];
  analysis_summary: {
    top_matches: number;
    average_similarity: number;
    best_practices_identified: string[];
    improvement_opportunities: string[];
  };
}