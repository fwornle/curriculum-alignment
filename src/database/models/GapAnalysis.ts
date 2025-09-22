/**
 * Gap Analysis Model
 * 
 * Represents curriculum gap analysis results.
 */

import { BaseEntity, UUID, AnalysisType, JsonObject } from './types';

/**
 * Gap Analysis entity interface
 */
export interface GapAnalysis extends BaseEntity {
  analysis_id: UUID;
  program_id: UUID;
  analysis_type?: AnalysisType;
  gaps_identified: JsonObject;
  recommendations: string[];
  created_by?: UUID;
}

/**
 * Input for creating a new gap analysis
 */
export interface CreateGapAnalysisInput {
  program_id: UUID;
  analysis_type?: AnalysisType;
  gaps_identified?: JsonObject;
  recommendations?: string[];
  created_by?: UUID;
}

/**
 * Input for updating an existing gap analysis
 */
export interface UpdateGapAnalysisInput {
  analysis_type?: AnalysisType;
  gaps_identified?: JsonObject;
  recommendations?: string[];
}

/**
 * Gap Analysis with populated relationships
 */
export interface GapAnalysisWithRelations extends GapAnalysis {
  program?: import('./Program').Program;
  created_by_user?: import('./User').User;
}

/**
 * Structured gap identification data
 */
export interface GapIdentificationData {
  content_gaps: {
    gap_id: string;
    category: 'knowledge_area' | 'skill' | 'competency' | 'methodology';
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    missing_content: string[];
    evidence: {
      peer_programs: string[];
      industry_standards: string[];
      accreditation_requirements: string[];
    };
    impact_assessment: {
      student_readiness: number; // 1-10 scale
      industry_alignment: number;
      accreditation_compliance: number;
    };
  }[];
  
  structural_gaps: {
    gap_id: string;
    type: 'credit_distribution' | 'course_sequence' | 'prerequisite_chain' | 'specialization';
    title: string;
    description: string;
    current_state: string;
    recommended_state: string;
    implementation_complexity: 'low' | 'medium' | 'high';
    resource_requirements: string[];
  }[];
  
  outcome_gaps: {
    gap_id: string;
    learning_outcome_area: string;
    current_coverage: number; // percentage
    target_coverage: number;
    missing_outcomes: string[];
    enhancement_opportunities: string[];
    bloom_taxonomy_gaps: {
      cognitive_level: string;
      current_emphasis: number;
      recommended_emphasis: number;
    }[];
  }[];
  
  quality_gaps: {
    gap_id: string;
    quality_dimension: 'depth' | 'breadth' | 'currency' | 'rigor' | 'practical_application';
    current_rating: number; // 1-10 scale
    target_rating: number;
    improvement_areas: string[];
    benchmarking_data: {
      peer_average: number;
      industry_standard: number;
      best_practice_example: string;
    };
  }[];
}

/**
 * Gap analysis recommendations
 */
export interface GapAnalysisRecommendations {
  priority_recommendations: {
    recommendation_id: string;
    priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    title: string;
    description: string;
    rationale: string;
    addresses_gaps: string[]; // gap_ids
    implementation_steps: {
      step: number;
      action: string;
      timeline: string;
      responsible_party: string;
      resources_needed: string[];
    }[];
    success_metrics: {
      metric: string;
      target_value: string;
      measurement_method: string;
    }[];
    estimated_cost: {
      financial: string;
      time_investment: string;
      human_resources: string;
    };
  }[];
  
  alternative_approaches: {
    approach_id: string;
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    feasibility_score: number; // 1-10
    impact_score: number; // 1-10
  }[];
  
  quick_wins: {
    action: string;
    effort_level: 'low' | 'medium';
    expected_impact: string;
    timeline: string;
  }[];
}

/**
 * Gap analysis summary for display
 */
export interface GapAnalysisSummary {
  analysis_id: UUID;
  program_name: string;
  analysis_type?: AnalysisType;
  analysis_date: Date;
  created_by_name?: string;
  gap_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  recommendation_counts: {
    immediate: number;
    short_term: number;
    medium_term: number;
    long_term: number;
    total: number;
  };
  overall_health_score: number; // 1-100
  key_findings: string[];
}

/**
 * Gap analysis comparison
 */
export interface GapAnalysisComparison {
  baseline_analysis: GapAnalysisSummary;
  current_analysis: GapAnalysisSummary;
  progress_metrics: {
    gaps_resolved: number;
    new_gaps_identified: number;
    recommendations_implemented: number;
    overall_improvement: number; // percentage
  };
  trend_analysis: {
    improving_areas: string[];
    concerning_areas: string[];
    stable_areas: string[];
  };
}

/**
 * Gap analysis export data
 */
export interface GapAnalysisExportData extends GapAnalysis {
  program: {
    program_id: UUID;
    ceu_program_name: string;
    department?: string;
  };
  detailed_gaps: GapIdentificationData;
  detailed_recommendations: GapAnalysisRecommendations;
  analysis_metadata: {
    peer_programs_analyzed: number;
    data_sources: string[];
    analysis_methodology: string;
    confidence_level: number;
    limitations: string[];
  };
  executive_summary: {
    key_findings: string[];
    critical_issues: string[];
    top_priorities: string[];
    success_factors: string[];
  };
}