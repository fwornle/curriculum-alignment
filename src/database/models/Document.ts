/**
 * Document Model
 * 
 * Represents uploaded and processed documents.
 */

import { BaseEntity, UUID, DocumentType, JsonObject } from './types';

/**
 * Document entity interface
 */
export interface Document extends BaseEntity {
  document_id: UUID;
  document_type?: DocumentType;
  file_path?: string;
  processed_content?: string;
  extraction_metadata: JsonObject;
  uploaded_by?: UUID;
}

/**
 * Input for creating a new document
 */
export interface CreateDocumentInput {
  document_type?: DocumentType;
  file_path?: string;
  processed_content?: string;
  extraction_metadata?: JsonObject;
  uploaded_by?: UUID;
}

/**
 * Input for updating an existing document
 */
export interface UpdateDocumentInput {
  document_type?: DocumentType;
  file_path?: string;
  processed_content?: string;
  extraction_metadata?: JsonObject;
}

/**
 * Document with populated relationships
 */
export interface DocumentWithRelations extends Document {
  uploaded_by_user?: import('./User').User;
}

/**
 * Document extraction metadata structure
 */
export interface DocumentExtractionMetadata {
  file_info: {
    original_filename: string;
    file_size_bytes: number;
    mime_type: string;
    upload_timestamp: Date;
    checksum?: string;
  };
  processing_info: {
    processing_timestamp: Date;
    processing_method: 'ocr' | 'text_extraction' | 'ai_parsing' | 'manual';
    processing_agent?: string;
    processing_duration_ms: number;
    success_rate: number; // 0-1
    confidence_score?: number; // 0-1
  };
  content_analysis: {
    page_count?: number;
    word_count?: number;
    language_detected?: string;
    content_type: 'curriculum' | 'syllabus' | 'course_description' | 'academic_document' | 'other';
    structure_detected: {
      has_headers: boolean;
      has_tables: boolean;
      has_lists: boolean;
      has_images: boolean;
    };
  };
  extracted_entities: {
    programs?: string[];
    courses?: string[];
    universities?: string[];
    learning_outcomes?: string[];
    skills?: string[];
    topics?: string[];
    dates?: string[];
    credits?: number[];
  };
  quality_metrics: {
    text_clarity: number; // 0-1
    structure_preservation: number; // 0-1
    data_completeness: number; // 0-1
    extraction_accuracy?: number; // 0-1 (if validated)
  };
  errors_warnings: {
    level: 'error' | 'warning' | 'info';
    message: string;
    location?: string;
  }[];
}

/**
 * Document processing result
 */
export interface DocumentProcessingResult {
  document_id: UUID;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: {
    raw_text: string;
    structured_data?: {
      programs?: {
        name: string;
        description?: string;
        courses?: {
          name: string;
          code?: string;
          credits?: number;
          description?: string;
        }[];
      }[];
      metadata?: {
        institution?: string;
        academic_year?: string;
        department?: string;
        document_version?: string;
      };
    };
  };
  analysis_insights: {
    document_classification: {
      primary_type: string;
      confidence: number;
      secondary_types?: string[];
    };
    content_themes: {
      theme: string;
      relevance_score: number;
      key_phrases: string[];
    }[];
    curriculum_elements: {
      learning_objectives: string[];
      assessment_methods: string[];
      prerequisites: string[];
      outcomes: string[];
    };
  };
  recommendations: {
    data_integration: string[];
    quality_improvements: string[];
    further_processing: string[];
  };
}

/**
 * Document search result
 */
export interface DocumentSearchResult {
  document_id: UUID;
  original_filename: string;
  document_type?: DocumentType;
  upload_date: Date;
  uploaded_by?: string;
  match_score: number;
  content_snippet: string;
  matching_entities: string[];
  file_size_mb: number;
  processing_status: string;
}

/**
 * Document summary for display
 */
export interface DocumentSummary {
  document_id: UUID;
  original_filename: string;
  document_type?: DocumentType;
  upload_date: Date;
  uploaded_by_name?: string;
  file_size_mb: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  content_preview: string;
  extracted_entities_count: {
    programs: number;
    courses: number;
    outcomes: number;
  };
  quality_score: number; // 0-100
}

/**
 * Document analytics data
 */
export interface DocumentAnalytics {
  document_id: UUID;
  usage_statistics: {
    view_count: number;
    download_count: number;
    search_appearances: number;
    citation_count: number;
    last_accessed: Date;
  };
  content_impact: {
    programs_influenced: UUID[];
    analyses_referenced: UUID[];
    workflows_triggered: UUID[];
    insights_generated: number;
  };
  quality_evolution: {
    initial_quality_score: number;
    current_quality_score: number;
    improvement_history: {
      timestamp: Date;
      improvement_type: string;
      quality_change: number;
    }[];
  };
  user_feedback: {
    helpfulness_rating?: number; // 1-5
    accuracy_rating?: number; // 1-5
    completeness_rating?: number; // 1-5
    comments?: string[];
  };
}

/**
 * Document version information
 */
export interface DocumentVersion {
  version_id: UUID;
  document_id: UUID;
  version_number: string;
  upload_timestamp: Date;
  changes_summary: string;
  file_path: string;
  processing_differences: {
    new_entities: string[];
    removed_entities: string[];
    modified_entities: string[];
    quality_score_change: number;
  };
}

/**
 * Bulk document operation result
 */
export interface BulkDocumentOperation {
  operation_id: UUID;
  operation_type: 'upload' | 'process' | 'analyze' | 'delete';
  total_documents: number;
  successful_operations: number;
  failed_operations: number;
  operation_summary: {
    start_time: Date;
    end_time?: Date;
    duration_ms?: number;
    error_details: {
      document_id?: UUID;
      filename: string;
      error_message: string;
    }[];
  };
  results: {
    document_id: UUID;
    status: 'success' | 'failed' | 'skipped';
    details?: string;
  }[];
}