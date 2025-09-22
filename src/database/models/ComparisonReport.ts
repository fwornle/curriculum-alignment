/**
 * Comparison Report Model
 * 
 * Represents comparison reports between CEU and peer programs.
 */

import { BaseEntity, UUID, JsonObject } from './types';

/**
 * Comparison Report entity interface
 */
export interface ComparisonReport extends BaseEntity {
  report_id: UUID;
  ceu_program_id: UUID;
  peer_program_ids: UUID[];
  similarities: JsonObject;
  differences: JsonObject;
  generated_at: Date;
}

/**
 * Input for creating a new comparison report
 */
export interface CreateComparisonReportInput {
  ceu_program_id: UUID;
  peer_program_ids: UUID[];
  similarities?: JsonObject;
  differences?: JsonObject;
}

/**
 * Input for updating an existing comparison report
 */
export interface UpdateComparisonReportInput {
  peer_program_ids?: UUID[];
  similarities?: JsonObject;
  differences?: JsonObject;
}

/**
 * Comparison Report with populated relationships
 */
export interface ComparisonReportWithRelations extends ComparisonReport {
  ceu_program?: import('./Program').Program;
  peer_programs?: import('./PeerProgram').PeerProgram[];
}

/**
 * Detailed similarity analysis structure
 */
export interface SimilarityAnalysis {
  overall_similarity_score: number; // 0-100
  curriculum_structure: {
    similarity_score: number;
    matching_elements: {
      element_type: 'course' | 'module' | 'specialization' | 'requirement';
      ceu_element: string;
      peer_element: string;
      match_confidence: number;
    }[];
    structural_alignment: {
      credit_distribution: number;
      course_sequencing: number;
      prerequisite_chains: number;
      graduation_requirements: number;
    };
  };
  content_similarity: {
    learning_outcomes: {
      similarity_score: number;
      common_outcomes: string[];
      outcome_coverage_comparison: {
        cognitive_levels: Record<string, number>;
        skill_categories: Record<string, number>;
        knowledge_domains: Record<string, number>;
      };
    };
    course_content: {
      similarity_score: number;
      topic_overlap: {
        topic: string;
        coverage_ceu: number; // 0-100
        coverage_peer: number; // 0-100
        depth_comparison: 'deeper' | 'similar' | 'shallower';
      }[];
      methodology_alignment: number;
    };
  };
  assessment_approaches: {
    similarity_score: number;
    common_methods: string[];
    unique_ceu_methods: string[];
    unique_peer_methods: string[];
    innovation_opportunities: string[];
  };
  practical_components: {
    similarity_score: number;
    internship_comparison: {
      ceu_requirements: string;
      peer_requirements: string;
      alignment_score: number;
    };
    project_work_comparison: {
      ceu_approach: string;
      peer_approach: string;
      innovation_potential: string[];
    };
  };
}

/**
 * Detailed difference analysis structure
 */
export interface DifferenceAnalysis {
  unique_ceu_strengths: {
    category: 'content' | 'methodology' | 'structure' | 'innovation';
    strength: string;
    description: string;
    competitive_advantage: boolean;
    transferability_to_peers: 'high' | 'medium' | 'low';
  }[];
  unique_peer_strengths: {
    category: 'content' | 'methodology' | 'structure' | 'innovation';
    strength: string;
    description: string;
    source_program: string;
    adoption_feasibility: 'high' | 'medium' | 'low' | 'not_applicable';
    implementation_complexity: 'low' | 'medium' | 'high';
    resource_requirements: string[];
  }[];
  gap_analysis: {
    content_gaps: {
      area: string;
      description: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      peer_examples: string[];
      remediation_suggestions: string[];
    }[];
    structural_gaps: {
      aspect: string;
      current_ceu_approach: string;
      peer_best_practices: string[];
      improvement_opportunities: string[];
    }[];
    innovation_gaps: {
      area: string;
      peer_innovations: {
        program: string;
        innovation: string;
        impact_potential: 'transformative' | 'significant' | 'moderate' | 'minimal';
      }[];
      adoption_recommendations: string[];
    }[];
  };
  trend_analysis: {
    emerging_trends: {
      trend: string;
      adoption_rate_peers: number; // 0-100
      ceu_adoption_status: 'adopted' | 'piloting' | 'considering' | 'not_aware';
      strategic_importance: 'critical' | 'high' | 'medium' | 'low';
      action_recommendations: string[];
    }[];
    declining_practices: {
      practice: string;
      ceu_usage: boolean;
      peer_abandonment_rate: number; // 0-100
      reasons_for_decline: string[];
      transition_recommendations: string[];
    }[];
  };
}

/**
 * Executive summary for comparison reports
 */
export interface ComparisonExecutiveSummary {
  report_id: UUID;
  summary_highlights: {
    overall_competitiveness: 'leading' | 'competitive' | 'average' | 'below_average';
    key_strengths: string[];
    priority_improvement_areas: string[];
    innovation_opportunities: string[];
    strategic_recommendations: string[];
  };
  quantitative_overview: {
    programs_compared: number;
    average_similarity_score: number;
    content_coverage_vs_peers: number; // percentage
    unique_ceu_elements: number;
    adoptable_peer_practices: number;
  };
  risk_assessment: {
    competitive_risks: {
      risk: string;
      probability: 'high' | 'medium' | 'low';
      impact: 'critical' | 'high' | 'medium' | 'low';
      mitigation_strategies: string[];
    }[];
    opportunity_risks: {
      missed_opportunity: string;
      cost_of_inaction: string;
      timeline_sensitivity: 'urgent' | 'important' | 'moderate' | 'low';
    }[];
  };
  implementation_roadmap: {
    immediate_actions: {
      action: string;
      timeline: string;
      resources_needed: string[];
      expected_impact: string;
    }[];
    medium_term_initiatives: {
      initiative: string;
      timeline: string;
      prerequisites: string[];
      success_metrics: string[];
    }[];
    strategic_investments: {
      investment_area: string;
      timeline: string;
      resource_commitment: string;
      transformational_potential: string;
    }[];
  };
}

/**
 * Comparison report summary for display
 */
export interface ComparisonReportSummary {
  report_id: UUID;
  ceu_program_name: string;
  peer_programs_count: number;
  generated_date: Date;
  overall_similarity: number;
  key_findings: string[];
  status: 'draft' | 'final' | 'archived';
  last_updated: Date;
}

/**
 * Comparison trend analysis
 */
export interface ComparisonTrendAnalysis {
  ceu_program_id: UUID;
  time_period: {
    start_date: Date;
    end_date: Date;
  };
  trend_metrics: {
    similarity_trend: {
      direction: 'improving' | 'stable' | 'declining';
      rate_of_change: number; // percentage points per time period
      peer_programs_driving_change: string[];
    };
    gap_closure_rate: {
      gaps_addressed: number;
      new_gaps_identified: number;
      net_improvement: number;
    };
    innovation_adoption: {
      peer_innovations_adopted: string[];
      ceu_innovations_recognized: string[];
      innovation_velocity: number; // innovations per time period
    };
  };
  competitive_positioning: {
    position_change: 'advancing' | 'maintaining' | 'slipping';
    ranking_vs_peers: number; // 1-based ranking
    differentiating_factors: string[];
    areas_of_concern: string[];
  };
  predictive_insights: {
    projected_gaps: string[];
    emerging_opportunities: string[];
    recommended_focus_areas: string[];
    timeline_for_next_review: string;
  };
}