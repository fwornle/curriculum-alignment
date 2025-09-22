/**
 * Peer University Model
 * 
 * Represents external universities used for comparison.
 */

import { BaseEntity, UUID } from './types';

/**
 * Peer University entity interface
 */
export interface PeerUniversity extends BaseEntity {
  university_id: UUID;
  name: string;
  country?: string;
  website_url?: string;
  programs_url?: string;
  last_analyzed_at?: Date;
}

/**
 * Input for creating a new peer university
 */
export interface CreatePeerUniversityInput {
  name: string;
  country?: string;
  website_url?: string;
  programs_url?: string;
}

/**
 * Input for updating an existing peer university
 */
export interface UpdatePeerUniversityInput {
  name?: string;
  country?: string;
  website_url?: string;
  programs_url?: string;
  last_analyzed_at?: Date;
}

/**
 * Peer University with populated relationships
 */
export interface PeerUniversityWithRelations extends PeerUniversity {
  peer_programs?: import('./PeerProgram').PeerProgram[];
}

/**
 * University summary for display
 */
export interface PeerUniversitySummary {
  university_id: UUID;
  name: string;
  country?: string;
  program_count: number;
  last_analyzed_at?: Date;
  analysis_status: 'never' | 'analyzing' | 'completed' | 'failed' | 'stale';
  total_comparisons: number;
}

/**
 * University ranking and reputation data
 */
export interface UniversityRankingData {
  university_id: UUID;
  rankings: {
    source: string; // e.g., "QS World Rankings", "Times Higher Education"
    year: number;
    overall_rank?: number;
    subject_ranks?: {
      subject: string;
      rank: number;
    }[];
  }[];
  reputation_score?: number;
  accreditations: string[];
  notable_features: string[];
}

/**
 * University analysis capabilities
 */
export interface UniversityAnalysisCapabilities {
  university_id: UUID;
  capabilities: {
    web_scraping: {
      supported: boolean;
      last_successful: Date | null;
      success_rate: number;
      common_issues: string[];
    };
    api_access: {
      available: boolean;
      endpoint?: string;
      rate_limits?: {
        requests_per_hour: number;
        requests_per_day: number;
      };
    };
    data_quality: {
      completeness_score: number;
      freshness_score: number;
      structure_score: number;
      reliability_score: number;
    };
  };
  recommended_update_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

/**
 * University comparison metrics
 */
export interface UniversityComparisonMetrics {
  university_id: UUID;
  university_name: string;
  comparison_stats: {
    total_programs_compared: number;
    average_similarity_score: number;
    strong_match_programs: number; // similarity > 80%
    weak_match_programs: number;   // similarity < 40%
    unique_programs: number;       // programs not found at CEU
  };
  subject_area_coverage: {
    subject_area: string;
    program_count: number;
    average_quality_score: number;
    coverage_percentage: number; // vs CEU offerings
  }[];
  collaboration_opportunities: {
    potential_partnerships: string[];
    exchange_programs: string[];
    joint_degrees: string[];
  };
}

/**
 * University data collection status
 */
export interface UniversityDataStatus {
  university_id: UUID;
  data_collection: {
    status: 'idle' | 'queued' | 'collecting' | 'processing' | 'completed' | 'failed';
    started_at?: Date;
    completed_at?: Date;
    progress_percentage: number;
    current_step?: string;
    errors: {
      timestamp: Date;
      error_type: string;
      error_message: string;
      retry_count: number;
    }[];
  };
  data_freshness: {
    programs_updated: Date | null;
    courses_updated: Date | null;
    metadata_updated: Date | null;
    next_scheduled_update: Date | null;
  };
  quality_metrics: {
    programs_collected: number;
    courses_collected: number;
    success_rate: number;
    data_completeness: number;
  };
}

/**
 * University search result
 */
export interface PeerUniversitySearchResult {
  university_id: UUID;
  name: string;
  country?: string;
  match_score?: number;
  program_matches: {
    program_name: string;
    similarity_score: number;
  }[];
  ranking_info?: {
    overall_rank?: number;
    subject_ranks?: string[];
  };
}