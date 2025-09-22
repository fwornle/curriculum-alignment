-- Migration 001: Initial Schema for Multi-Agent Curriculum Alignment System
-- Author: Database Developer
-- Date: 2025-09-22
-- Description: Create all PostgreSQL tables with proper relationships and indexes

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users and Authentication
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    ui_preferences JSONB DEFAULT '{}',
    llm_model_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Academic Programs
CREATE TABLE programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceu_program_name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(program_id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50),
    credits INTEGER,
    learning_outcomes TEXT[],
    content_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_course_code UNIQUE (program_id, course_code)
);

-- Peer Universities
CREATE TABLE peer_universities (
    university_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    website_url TEXT,
    programs_url TEXT,
    last_analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Peer Programs
CREATE TABLE peer_programs (
    peer_program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES peer_universities(university_id) ON DELETE CASCADE,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    courses_data JSONB DEFAULT '{}',
    analysis_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Gap Analyses
CREATE TABLE gap_analyses (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(program_id) ON DELETE CASCADE,
    analysis_type VARCHAR(50),
    gaps_identified JSONB DEFAULT '{}',
    recommendations TEXT[],
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comparison Reports
CREATE TABLE comparison_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceu_program_id UUID REFERENCES programs(program_id) ON DELETE CASCADE,
    peer_program_ids UUID[],
    similarities JSONB DEFAULT '{}',
    differences JSONB DEFAULT '{}',
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Workflows
CREATE TABLE agent_workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiating_user UUID REFERENCES users(user_id) ON DELETE SET NULL,
    agents_involved TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    results JSONB DEFAULT '{}',
    model_configurations JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_history JSONB DEFAULT '[]',
    context_data JSONB DEFAULT '{}',
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50),
    file_path TEXT,
    processed_content TEXT,
    extraction_metadata JSONB DEFAULT '{}',
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- LLM Model Configurations
CREATE TABLE llm_model_configurations (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    model_provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    api_key_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_agent_config UNIQUE (user_id, agent_type)
);

-- System Status
CREATE TABLE system_status (
    status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'unknown',
    last_heartbeat TIMESTAMP,
    performance_metrics JSONB DEFAULT '{}',
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_programs_department ON programs(department);
CREATE INDEX idx_programs_name ON programs(ceu_program_name);
CREATE INDEX idx_programs_created_at ON programs(created_at);

CREATE INDEX idx_courses_program ON courses(program_id);
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_name ON courses(course_name);

CREATE INDEX idx_peer_universities_country ON peer_universities(country);
CREATE INDEX idx_peer_universities_name ON peer_universities(name);

CREATE INDEX idx_peer_programs_university ON peer_programs(university_id);
CREATE INDEX idx_peer_programs_name ON peer_programs(program_name);

CREATE INDEX idx_gap_analyses_program ON gap_analyses(program_id);
CREATE INDEX idx_gap_analyses_type ON gap_analyses(analysis_type);
CREATE INDEX idx_gap_analyses_created_by ON gap_analyses(created_by);
CREATE INDEX idx_gap_analyses_created_at ON gap_analyses(created_at);

CREATE INDEX idx_comparison_reports_program ON comparison_reports(ceu_program_id);
CREATE INDEX idx_comparison_reports_generated_at ON comparison_reports(generated_at);

CREATE INDEX idx_workflows_user ON agent_workflows(initiating_user);
CREATE INDEX idx_workflows_status ON agent_workflows(status);
CREATE INDEX idx_workflows_start_time ON agent_workflows(start_time);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

CREATE INDEX idx_llm_configs_user ON llm_model_configurations(user_id);
CREATE INDEX idx_llm_configs_agent_type ON llm_model_configurations(agent_type);
CREATE INDEX idx_llm_configs_provider ON llm_model_configurations(model_provider);

CREATE INDEX idx_system_status_agent ON system_status(agent_name);
CREATE INDEX idx_system_status_status ON system_status(status);
CREATE INDEX idx_system_status_heartbeat ON system_status(last_heartbeat);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_peer_universities_updated_at BEFORE UPDATE ON peer_universities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_peer_programs_updated_at BEFORE UPDATE ON peer_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gap_analyses_updated_at BEFORE UPDATE ON gap_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comparison_reports_updated_at BEFORE UPDATE ON comparison_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON agent_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_llm_model_configurations_updated_at BEFORE UPDATE ON llm_model_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_status_updated_at BEFORE UPDATE ON system_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints and validations
ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT check_role_valid CHECK (role IN ('admin', 'faculty', 'staff', 'student', 'readonly'));

ALTER TABLE courses ADD CONSTRAINT check_credits_positive CHECK (credits > 0);

ALTER TABLE agent_workflows ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE system_status ADD CONSTRAINT check_agent_status_valid CHECK (status IN ('active', 'idle', 'error', 'maintenance', 'unknown'));
ALTER TABLE system_status ADD CONSTRAINT check_error_count_non_negative CHECK (error_count >= 0);

-- Comments for documentation
COMMENT ON TABLE users IS 'System users with authentication and preferences';
COMMENT ON TABLE programs IS 'Academic programs at CEU';
COMMENT ON TABLE courses IS 'Courses within academic programs';
COMMENT ON TABLE peer_universities IS 'External universities for comparison';
COMMENT ON TABLE peer_programs IS 'Programs from peer universities';
COMMENT ON TABLE gap_analyses IS 'Results of curriculum gap analysis';
COMMENT ON TABLE comparison_reports IS 'Comparison reports between CEU and peer programs';
COMMENT ON TABLE agent_workflows IS 'Multi-agent workflow execution tracking';
COMMENT ON TABLE chat_sessions IS 'Chat interface conversation history';
COMMENT ON TABLE documents IS 'Uploaded and processed documents';
COMMENT ON TABLE llm_model_configurations IS 'User-specific LLM model preferences per agent';
COMMENT ON TABLE system_status IS 'Real-time status of system agents';

-- Create initial system admin user (placeholder)
INSERT INTO users (email, role, ui_preferences, llm_model_preferences) 
VALUES (
    'admin@ceu.edu', 
    'admin', 
    '{"theme": "light", "language": "en"}',
    '{"default_provider": "openai", "preferred_models": {"chat": "gpt-4", "analysis": "claude-3.5-sonnet"}}'
);

-- Migration complete
-- Database schema created successfully with all tables, indexes, constraints, and triggers