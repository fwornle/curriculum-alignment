-- Initial Database Schema Migration
-- Multi-Agent Curriculum Alignment System
-- 
-- This migration creates the complete database schema for the system including:
-- - User management and authentication
-- - Academic program and course definitions
-- - Curriculum analysis and comparison
-- - Document storage and processing
-- - Multi-agent workflow tracking
-- - System configuration and monitoring

-- =============================================================================
-- EXTENSIONS AND SETUP
-- =============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Set timezone
SET timezone = 'UTC';

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- User roles
CREATE TYPE user_role AS ENUM (
    'admin',
    'coordinator', 
    'analyst',
    'viewer'
);

-- Program types
CREATE TYPE program_type AS ENUM (
    'bachelor',
    'master',
    'phd',
    'certificate',
    'diploma'
);

-- Course levels
CREATE TYPE course_level AS ENUM (
    'foundation',
    'intermediate',
    'advanced',
    'graduate'
);

-- Analysis status
CREATE TYPE analysis_status AS ENUM (
    'initiated',
    'running',
    'completed',
    'failed',
    'cancelled'
);

-- Analysis depth
CREATE TYPE analysis_depth AS ENUM (
    'quick',
    'standard',
    'comprehensive'
);

-- Document types
CREATE TYPE document_type AS ENUM (
    'curriculum',
    'syllabus',
    'course_catalog',
    'accreditation',
    'assessment',
    'other'
);

-- Document formats
CREATE TYPE document_format AS ENUM (
    'pdf',
    'docx',
    'xlsx',
    'txt',
    'html'
);

-- Processing status
CREATE TYPE processing_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

-- Agent status
CREATE TYPE agent_status AS ENUM (
    'idle',
    'busy',
    'error',
    'offline'
);

-- Workflow status
CREATE TYPE workflow_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'paused'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- User sessions for tracking active sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_sessions_token_not_empty CHECK (LENGTH(TRIM(token_hash)) > 0)
);

-- Universities table for peer institution data
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    website_url VARCHAR(1000),
    ranking_national INTEGER,
    ranking_international INTEGER,
    accreditation_bodies TEXT[],
    established_year INTEGER,
    student_count INTEGER,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT universities_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT universities_website_valid CHECK (website_url IS NULL OR website_url ~* '^https?://.*'),
    CONSTRAINT universities_year_valid CHECK (established_year IS NULL OR (established_year >= 800 AND established_year <= EXTRACT(YEAR FROM NOW())))
);

-- Academic programs table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    program_type program_type NOT NULL,
    duration_years NUMERIC(3,1),
    credit_hours INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    accreditation_bodies TEXT[],
    admission_requirements TEXT,
    career_outcomes TEXT[],
    tuition_annual DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    website_url VARCHAR(1000),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT programs_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT programs_duration_positive CHECK (duration_years IS NULL OR duration_years > 0),
    CONSTRAINT programs_credits_positive CHECK (credit_hours IS NULL OR credit_hours > 0),
    CONSTRAINT programs_tuition_positive CHECK (tuition_annual IS NULL OR tuition_annual >= 0),
    CONSTRAINT programs_website_valid CHECK (website_url IS NULL OR website_url ~* '^https?://.*')
);

-- Courses table for individual course definitions
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    credit_hours NUMERIC(3,1) NOT NULL,
    course_level course_level NOT NULL,
    prerequisites TEXT[],
    learning_outcomes TEXT[],
    assessment_methods TEXT[],
    required BOOLEAN DEFAULT true,
    semester VARCHAR(20),
    year_level INTEGER,
    instructor VARCHAR(255),
    syllabus_url VARCHAR(1000),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT courses_code_not_empty CHECK (LENGTH(TRIM(code)) > 0),
    CONSTRAINT courses_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT courses_credits_positive CHECK (credit_hours > 0),
    CONSTRAINT courses_year_valid CHECK (year_level IS NULL OR (year_level >= 1 AND year_level <= 10)),
    CONSTRAINT courses_syllabus_valid CHECK (syllabus_url IS NULL OR syllabus_url ~* '^https?://.*'),
    
    -- Unique constraint for course codes within a program
    UNIQUE(program_id, code)
);

-- =============================================================================
-- DOCUMENT MANAGEMENT
-- =============================================================================

-- Documents table for file storage and metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    document_type document_type NOT NULL,
    document_format document_format NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(1000),
    processing_status processing_status DEFAULT 'pending',
    processing_error TEXT,
    extracted_text TEXT,
    extracted_metadata JSONB,
    ocr_confidence NUMERIC(5,2),
    language_detected VARCHAR(10),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Add constraints
    CONSTRAINT documents_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT documents_file_size_positive CHECK (file_size > 0),
    CONSTRAINT documents_hash_not_empty CHECK (LENGTH(TRIM(file_hash)) > 0),
    CONSTRAINT documents_path_not_empty CHECK (LENGTH(TRIM(storage_path)) > 0),
    CONSTRAINT documents_confidence_valid CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 100))
);

-- Document versions for change tracking
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    changes_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for versions within a document
    UNIQUE(document_id, version_number)
);

-- =============================================================================
-- ANALYSIS AND COMPARISON
-- =============================================================================

-- Analysis sessions for curriculum comparison workflows
CREATE TABLE analysis_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    target_program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    comparison_programs UUID[] NOT NULL,
    analysis_depth analysis_depth DEFAULT 'standard',
    analysis_status analysis_status DEFAULT 'initiated',
    configuration JSONB NOT NULL DEFAULT '{}',
    results JSONB,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0,
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Add constraints
    CONSTRAINT analysis_sessions_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT analysis_sessions_progress_valid CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT analysis_sessions_comparisons_not_empty CHECK (array_length(comparison_programs, 1) > 0)
);

-- Analysis results for detailed curriculum comparison findings
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    comparison_program_id UUID NOT NULL REFERENCES programs(id),
    similarity_score NUMERIC(5,2),
    gap_analysis JSONB,
    course_mapping JSONB,
    recommendations JSONB,
    strengths TEXT[],
    weaknesses TEXT[],
    missing_topics TEXT[],
    additional_topics TEXT[],
    alignment_percentage NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT analysis_results_similarity_valid CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 100)),
    CONSTRAINT analysis_results_alignment_valid CHECK (alignment_percentage IS NULL OR (alignment_percentage >= 0 AND alignment_percentage <= 100))
);

-- Gap analysis details for specific curriculum gaps
CREATE TABLE curriculum_gaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    gap_type VARCHAR(50) NOT NULL,
    gap_category VARCHAR(100),
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    recommended_action TEXT,
    priority_score INTEGER DEFAULT 50,
    addressed BOOLEAN DEFAULT false,
    addressed_by UUID REFERENCES users(id),
    addressed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT curriculum_gaps_description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT curriculum_gaps_severity_valid CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT curriculum_gaps_priority_valid CHECK (priority_score >= 0 AND priority_score <= 100)
);

-- =============================================================================
-- AGENT WORKFLOW MANAGEMENT
-- =============================================================================

-- Agent definitions for multi-agent system
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    agent_type VARCHAR(50) NOT NULL,
    endpoint_url VARCHAR(1000),
    capabilities TEXT[],
    configuration JSONB DEFAULT '{}',
    status agent_status DEFAULT 'idle',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    total_tasks_processed INTEGER DEFAULT 0,
    average_processing_time INTERVAL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT agents_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT agents_type_not_empty CHECK (LENGTH(TRIM(agent_type)) > 0),
    CONSTRAINT agents_error_count_positive CHECK (error_count >= 0),
    CONSTRAINT agents_tasks_positive CHECK (total_tasks_processed >= 0)
);

-- Workflow definitions for multi-agent orchestration
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    workflow_definition JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT workflows_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT workflows_version_positive CHECK (version > 0),
    
    -- Unique constraint for active workflow names
    UNIQUE(name, version)
);

-- Workflow executions for tracking workflow runs
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    analysis_session_id UUID REFERENCES analysis_sessions(id),
    status workflow_status DEFAULT 'pending',
    input_data JSONB NOT NULL,
    output_data JSONB,
    error_message TEXT,
    execution_trace JSONB,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    
    -- Computed column for duration
    CONSTRAINT workflow_executions_duration_check CHECK (
        (completed_at IS NULL) OR 
        (started_at <= completed_at)
    )
);

-- Agent tasks for individual agent work items
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    task_type VARCHAR(100) NOT NULL,
    task_data JSONB NOT NULL,
    task_result JSONB,
    status workflow_status DEFAULT 'pending',
    priority INTEGER DEFAULT 50,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT agent_tasks_type_not_empty CHECK (LENGTH(TRIM(task_type)) > 0),
    CONSTRAINT agent_tasks_priority_valid CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT agent_tasks_retry_valid CHECK (retry_count >= 0 AND retry_count <= max_retries),
    CONSTRAINT agent_tasks_max_retries_valid CHECK (max_retries >= 0)
);

-- =============================================================================
-- SYSTEM CONFIGURATION AND MONITORING
-- =============================================================================

-- System configuration for application settings
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(200) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT system_config_key_not_empty CHECK (LENGTH(TRIM(config_key)) > 0)
);

-- Audit logs for tracking system changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT audit_logs_action_not_empty CHECK (LENGTH(TRIM(action)) > 0)
);

-- System metrics for performance monitoring
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT system_metrics_name_not_empty CHECK (LENGTH(TRIM(metric_name)) > 0)
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- milliseconds
    request_size INTEGER, -- bytes
    response_size INTEGER, -- bytes
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT api_usage_endpoint_not_empty CHECK (LENGTH(TRIM(endpoint)) > 0),
    CONSTRAINT api_usage_method_valid CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD')),
    CONSTRAINT api_usage_status_valid CHECK (status_code >= 100 AND status_code < 600),
    CONSTRAINT api_usage_response_time_positive CHECK (response_time IS NULL OR response_time >= 0)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created ON users(created_at);

-- Session indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, expires_at) WHERE is_revoked = false;

-- University indexes
CREATE INDEX idx_universities_name ON universities USING GIN(name gin_trgm_ops);
CREATE INDEX idx_universities_country ON universities(country);
CREATE INDEX idx_universities_active ON universities(is_active);
CREATE INDEX idx_universities_ranking_national ON universities(ranking_national);

-- Program indexes
CREATE INDEX idx_programs_university ON programs(university_id);
CREATE INDEX idx_programs_name ON programs USING GIN(name gin_trgm_ops);
CREATE INDEX idx_programs_type ON programs(program_type);
CREATE INDEX idx_programs_active ON programs(is_active);
CREATE INDEX idx_programs_created_by ON programs(created_by);
CREATE INDEX idx_programs_metadata ON programs USING GIN(metadata);

-- Course indexes
CREATE INDEX idx_courses_program ON courses(program_id);
CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_name ON courses USING GIN(name gin_trgm_ops);
CREATE INDEX idx_courses_level ON courses(course_level);
CREATE INDEX idx_courses_required ON courses(required);
CREATE INDEX idx_courses_metadata ON courses USING GIN(metadata);

-- Document indexes
CREATE INDEX idx_documents_program ON documents(program_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_format ON documents(document_format);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_text_search ON documents USING GIN(to_tsvector('english', extracted_text));
CREATE INDEX idx_documents_metadata ON documents USING GIN(extracted_metadata);

-- Document version indexes
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_number ON document_versions(document_id, version_number);

-- Analysis session indexes
CREATE INDEX idx_analysis_sessions_target ON analysis_sessions(target_program_id);
CREATE INDEX idx_analysis_sessions_status ON analysis_sessions(analysis_status);
CREATE INDEX idx_analysis_sessions_started_by ON analysis_sessions(started_by);
CREATE INDEX idx_analysis_sessions_started_at ON analysis_sessions(started_at);
CREATE INDEX idx_analysis_sessions_progress ON analysis_sessions(progress_percentage);
CREATE INDEX idx_analysis_sessions_comparisons ON analysis_sessions USING GIN(comparison_programs);

-- Analysis result indexes
CREATE INDEX idx_analysis_results_session ON analysis_results(analysis_session_id);
CREATE INDEX idx_analysis_results_program ON analysis_results(comparison_program_id);
CREATE INDEX idx_analysis_results_similarity ON analysis_results(similarity_score);
CREATE INDEX idx_analysis_results_alignment ON analysis_results(alignment_percentage);

-- Gap analysis indexes
CREATE INDEX idx_curriculum_gaps_result ON curriculum_gaps(analysis_result_id);
CREATE INDEX idx_curriculum_gaps_type ON curriculum_gaps(gap_type);
CREATE INDEX idx_curriculum_gaps_severity ON curriculum_gaps(severity);
CREATE INDEX idx_curriculum_gaps_priority ON curriculum_gaps(priority_score);
CREATE INDEX idx_curriculum_gaps_addressed ON curriculum_gaps(addressed);

-- Agent indexes
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_enabled ON agents(is_enabled);
CREATE INDEX idx_agents_heartbeat ON agents(last_heartbeat);

-- Workflow indexes
CREATE INDEX idx_workflows_name ON workflows(name);
CREATE INDEX idx_workflows_active ON workflows(is_active);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

-- Workflow execution indexes
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_session ON workflow_executions(analysis_session_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_by ON workflow_executions(started_by);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);

-- Agent task indexes
CREATE INDEX idx_agent_tasks_workflow ON agent_tasks(workflow_execution_id);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_type ON agent_tasks(task_type);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_priority ON agent_tasks(priority);
CREATE INDEX idx_agent_tasks_created_at ON agent_tasks(created_at);
CREATE INDEX idx_agent_tasks_pending ON agent_tasks(agent_id, status, priority) WHERE status = 'pending';

-- System config indexes
CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_updated ON system_config(updated_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at);

-- System metrics indexes
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, timestamp);
CREATE INDEX idx_system_metrics_tags ON system_metrics USING GIN(tags);

-- API usage indexes
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_method ON api_usage(method);
CREATE INDEX idx_api_usage_status ON api_usage(status_code);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX idx_api_usage_user_endpoint ON api_usage(user_id, endpoint, created_at);

-- =============================================================================
-- TRIGGERS FOR AUTOMATED FUNCTIONALITY
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate workflow execution duration
CREATE OR REPLACE FUNCTION calculate_workflow_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        NEW.duration = NEW.completed_at - NEW.started_at;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply duration calculation trigger
CREATE TRIGGER calculate_workflow_execution_duration BEFORE UPDATE ON workflow_executions
    FOR EACH ROW EXECUTE FUNCTION calculate_workflow_duration();

CREATE TRIGGER calculate_agent_task_duration BEFORE UPDATE ON agent_tasks
    FOR EACH ROW EXECUTE FUNCTION calculate_workflow_duration();

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    excluded_tables TEXT[] := ARRAY['audit_logs', 'system_metrics', 'api_usage'];
BEGIN
    -- Skip audit logging for certain tables to prevent infinite loops
    IF TG_TABLE_NAME = ANY(excluded_tables) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Insert audit log record
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
        COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to main tables (excluding system tables)
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_programs AFTER INSERT OR UPDATE OR DELETE ON programs
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_courses AFTER INSERT OR UPDATE OR DELETE ON courses
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_analysis_sessions AFTER INSERT OR UPDATE OR DELETE ON analysis_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('system.version', '"1.0.0"', 'System version'),
    ('analysis.default_depth', '"standard"', 'Default analysis depth for new sessions'),
    ('analysis.max_comparisons', '5', 'Maximum number of comparison programs per analysis'),
    ('documents.max_file_size', '52428800', 'Maximum file size in bytes (50MB)'),
    ('documents.allowed_formats', '["pdf", "docx", "xlsx", "txt"]', 'Allowed document formats'),
    ('agents.heartbeat_interval', '30', 'Agent heartbeat interval in seconds'),
    ('agents.max_retries', '3', 'Maximum retry attempts for failed tasks'),
    ('auth.session_timeout', '7200', 'Session timeout in seconds (2 hours)'),
    ('auth.password_min_length', '8', 'Minimum password length'),
    ('auth.require_mfa_admin', 'true', 'Require MFA for admin users'),
    ('api.rate_limit_requests', '1000', 'API rate limit requests per hour'),
    ('api.rate_limit_window', '3600', 'API rate limit window in seconds');

-- Insert default agent definitions
INSERT INTO agents (name, description, agent_type, capabilities, configuration) VALUES
    ('coordinator', 'Central orchestration agent managing workflows', 'coordinator', 
     ARRAY['workflow_orchestration', 'task_distribution', 'status_monitoring'], 
     '{"max_concurrent_workflows": 10, "task_timeout": 300}'),
    
    ('web-search', 'Web search agent for discovering peer universities', 'web_search',
     ARRAY['web_search', 'content_discovery', 'data_extraction'],
     '{"search_engines": ["google", "bing"], "rate_limit": 100, "timeout": 30}'),
     
    ('browser', 'Web scraping agent with Stagehand/MCP integration', 'browser',
     ARRAY['web_scraping', 'dynamic_content', 'form_interaction'],
     '{"browser_type": "chromium", "timeout": 60, "max_pages": 50}'),
     
    ('document-processing', 'Document parsing and content extraction', 'document_processor',
     ARRAY['pdf_parsing', 'ocr', 'text_extraction', 'metadata_extraction'],
     '{"ocr_enabled": true, "supported_formats": ["pdf", "docx", "xlsx"]}'),
     
    ('accreditation-expert', 'Curriculum analysis and gap identification', 'analysis',
     ARRAY['curriculum_analysis', 'gap_identification', 'recommendation_generation'],
     '{"analysis_models": ["gpt-4", "claude-3"], "confidence_threshold": 0.8}'),
     
    ('qa-agent', 'Quality assurance and terminology standardization', 'quality_assurance',
     ARRAY['quality_control', 'terminology_standardization', 'data_validation'],
     '{"validation_rules": "strict", "terminology_db": "educational_terms"}'),
     
    ('semantic-search', 'Vector similarity search using Qdrant', 'semantic_search',
     ARRAY['vector_search', 'similarity_analysis', 'content_matching'],
     '{"embedding_model": "text-embedding-ada-002", "similarity_threshold": 0.7}'),
     
    ('chat-interface', 'Natural language Q&A interface', 'chat',
     ARRAY['natural_language_processing', 'question_answering', 'conversation'],
     '{"chat_model": "gpt-4", "context_window": 4000, "response_max_tokens": 500}');

-- Insert sample universities for testing
INSERT INTO universities (name, country, city, website_url, ranking_national, established_year) VALUES
    ('Massachusetts Institute of Technology', 'United States', 'Cambridge', 'https://mit.edu', 1, 1861),
    ('Stanford University', 'United States', 'Stanford', 'https://stanford.edu', 2, 1885),
    ('Harvard University', 'United States', 'Cambridge', 'https://harvard.edu', 3, 1636),
    ('California Institute of Technology', 'United States', 'Pasadena', 'https://caltech.edu', 4, 1891),
    ('University of Cambridge', 'United Kingdom', 'Cambridge', 'https://cam.ac.uk', 1, 1209),
    ('University of Oxford', 'United Kingdom', 'Oxford', 'https://ox.ac.uk', 2, 1096);

-- Create default admin user (password should be changed immediately)
INSERT INTO users (email, password_hash, name, role, is_active, email_verified_at) VALUES
    ('admin@curriculum-alignment.edu', 
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpJgMLsY/QLgFU6', -- 'admin123' - CHANGE THIS!
     'System Administrator', 
     'admin', 
     true, 
     NOW());

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for active programs with university information
CREATE VIEW active_programs_view AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.program_type,
    p.duration_years,
    p.credit_hours,
    p.language,
    u.name as university_name,
    u.country as university_country,
    u.city as university_city,
    p.created_at,
    p.updated_at
FROM programs p
JOIN universities u ON p.university_id = u.id
WHERE p.is_active = true AND u.is_active = true;

-- View for analysis session summary
CREATE VIEW analysis_summary_view AS
SELECT 
    a.id,
    a.name,
    a.analysis_status,
    a.analysis_depth,
    a.progress_percentage,
    p.name as target_program_name,
    u.name as target_university_name,
    a.started_at,
    a.completed_at,
    a.started_by,
    usr.name as started_by_name,
    array_length(a.comparison_programs, 1) as comparison_count
FROM analysis_sessions a
JOIN programs p ON a.target_program_id = p.id
JOIN universities u ON p.university_id = u.id
LEFT JOIN users usr ON a.started_by = usr.id;

-- View for agent performance metrics
CREATE VIEW agent_performance_view AS
SELECT 
    a.id,
    a.name,
    a.agent_type,
    a.status,
    a.total_tasks_processed,
    a.error_count,
    CASE 
        WHEN a.total_tasks_processed > 0 
        THEN ROUND((a.error_count::numeric / a.total_tasks_processed) * 100, 2)
        ELSE 0
    END as error_rate_percentage,
    a.average_processing_time,
    a.last_heartbeat,
    a.is_enabled
FROM agents a;

-- =============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Function to get program course count
CREATE OR REPLACE FUNCTION get_program_course_count(program_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    course_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO course_count
    FROM courses
    WHERE program_id = program_uuid;
    
    RETURN COALESCE(course_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate program credit hours
CREATE OR REPLACE FUNCTION calculate_program_total_credits(program_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_credits NUMERIC;
BEGIN
    SELECT SUM(credit_hours) INTO total_credits
    FROM courses
    WHERE program_id = program_uuid;
    
    RETURN COALESCE(total_credits, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's recent analysis sessions
CREATE OR REPLACE FUNCTION get_user_recent_analyses(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name VARCHAR(500),
    status analysis_status,
    progress_percentage INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.analysis_status,
        a.progress_percentage,
        a.started_at,
        a.completed_at
    FROM analysis_sessions a
    WHERE a.started_by = user_uuid
    ORDER BY a.started_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECURITY POLICIES (Row Level Security - Optional)
-- =============================================================================

-- Enable RLS on sensitive tables (uncomment if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for users (uncomment if needed)
-- CREATE POLICY users_own_data ON users
--     FOR ALL TO authenticated_users
--     USING (id = current_user_id());

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Database schema migration completed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Created % tables', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    );
    RAISE NOTICE '- Created % indexes', (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public'
    );
    RAISE NOTICE '- Created % functions', (
        SELECT COUNT(*) 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
    );
    RAISE NOTICE '- Created % triggers', (
        SELECT COUNT(*) 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    );
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Change the default admin password immediately';
    RAISE NOTICE '2. Configure system settings in system_config table';
    RAISE NOTICE '3. Add your university and program data';
    RAISE NOTICE '4. Test agent connectivity and configuration';
    RAISE NOTICE '=================================================================';
END $$;