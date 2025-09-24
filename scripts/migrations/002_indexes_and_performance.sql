-- Performance Optimization Migration
-- Multi-Agent Curriculum Alignment System
-- 
-- This migration adds additional indexes, optimizations, and performance enhancements
-- for the curriculum alignment system. It includes:
-- - Additional composite indexes for complex queries
-- - Partial indexes for common filtered queries
-- - Performance-oriented database configurations
-- - Query optimization hints and statistics

-- =============================================================================
-- ADDITIONAL COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Programs with multiple filters (most common query pattern)
CREATE INDEX CONCURRENTLY idx_programs_multi_filter 
ON programs(university_id, program_type, is_active, created_at DESC)
WHERE is_active = true;

-- Courses by program and requirements
CREATE INDEX CONCURRENTLY idx_courses_program_required 
ON courses(program_id, required, course_level)
WHERE required = true;

-- Analysis sessions with status and date filtering
CREATE INDEX CONCURRENTLY idx_analysis_sessions_status_date 
ON analysis_sessions(analysis_status, started_at DESC, started_by)
WHERE analysis_status IN ('running', 'completed');

-- Document processing queue
CREATE INDEX CONCURRENTLY idx_documents_processing_queue
ON documents(processing_status, uploaded_at ASC)
WHERE processing_status IN ('pending', 'processing');

-- Agent tasks by status and priority (for task queue processing)
CREATE INDEX CONCURRENTLY idx_agent_tasks_queue
ON agent_tasks(status, priority DESC, created_at ASC)
WHERE status = 'pending';

-- Workflow executions by status and date
CREATE INDEX CONCURRENTLY idx_workflow_executions_active
ON workflow_executions(status, started_at DESC)
WHERE status IN ('pending', 'running');

-- =============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =============================================================================

-- Active user sessions (most queries only care about active sessions)
CREATE INDEX CONCURRENTLY idx_user_sessions_active_only
ON user_sessions(user_id, expires_at DESC)
WHERE is_revoked = false AND expires_at > NOW();

-- Failed agent tasks for retry processing
CREATE INDEX CONCURRENTLY idx_agent_tasks_failed_retry
ON agent_tasks(agent_id, retry_count, created_at DESC)
WHERE status = 'failed' AND retry_count < max_retries;

-- Recent API usage for rate limiting
CREATE INDEX CONCURRENTLY idx_api_usage_recent_by_user
ON api_usage(user_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '1 hour';

-- High-priority curriculum gaps
CREATE INDEX CONCURRENTLY idx_curriculum_gaps_high_priority
ON curriculum_gaps(priority_score DESC, created_at DESC)
WHERE addressed = false AND priority_score >= 70;

-- Documents with successful OCR for search
CREATE INDEX CONCURRENTLY idx_documents_searchable
ON documents USING GIN(to_tsvector('english', extracted_text))
WHERE processing_status = 'completed' AND ocr_confidence >= 80;

-- =============================================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- =============================================================================

-- Index on normalized program names for fuzzy search
CREATE INDEX CONCURRENTLY idx_programs_name_normalized
ON programs(LOWER(TRIM(name)));

-- Index on university names for search
CREATE INDEX CONCURRENTLY idx_universities_name_normalized  
ON universities(LOWER(TRIM(name)));

-- Index on course codes without spaces/dashes
CREATE INDEX CONCURRENTLY idx_courses_code_normalized
ON courses(UPPER(REGEXP_REPLACE(code, '[^A-Z0-9]', '', 'g')));

-- Index for date-based partitioning queries
CREATE INDEX CONCURRENTLY idx_analysis_sessions_year_month
ON analysis_sessions(EXTRACT(YEAR FROM started_at), EXTRACT(MONTH FROM started_at));

-- Index for workflow execution duration analysis
CREATE INDEX CONCURRENTLY idx_workflow_executions_duration
ON workflow_executions(EXTRACT(EPOCH FROM duration))
WHERE duration IS NOT NULL;

-- =============================================================================
-- COVERING INDEXES TO AVOID TABLE LOOKUPS
-- =============================================================================

-- Programs list with basic info (covers most list queries)
CREATE INDEX CONCURRENTLY idx_programs_list_covering
ON programs(university_id, is_active, created_at DESC)
INCLUDE (name, program_type, duration_years, credit_hours);

-- Analysis sessions list with basic info
CREATE INDEX CONCURRENTLY idx_analysis_sessions_list_covering
ON analysis_sessions(started_by, analysis_status, started_at DESC)
INCLUDE (name, progress_percentage, target_program_id);

-- Agent tasks queue with full task info
CREATE INDEX CONCURRENTLY idx_agent_tasks_queue_covering
ON agent_tasks(agent_id, status, priority DESC)
INCLUDE (task_type, created_at, retry_count, max_retries);

-- =============================================================================
-- FOREIGN KEY INDEXES (if not already covered)
-- =============================================================================

-- Some foreign key indexes that might be missing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_versions_created_by
ON document_versions(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_curriculum_gaps_addressed_by
ON curriculum_gaps(addressed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_session_program
ON analysis_results(analysis_session_id, comparison_program_id);

-- =============================================================================
-- MATERIALIZED VIEWS FOR EXPENSIVE AGGREGATIONS
-- =============================================================================

-- University program statistics
CREATE MATERIALIZED VIEW university_program_stats AS
SELECT 
    u.id as university_id,
    u.name as university_name,
    u.country,
    COUNT(p.id) as total_programs,
    COUNT(CASE WHEN p.program_type = 'bachelor' THEN 1 END) as bachelor_programs,
    COUNT(CASE WHEN p.program_type = 'master' THEN 1 END) as master_programs,
    COUNT(CASE WHEN p.program_type = 'phd' THEN 1 END) as phd_programs,
    COUNT(CASE WHEN p.program_type = 'certificate' THEN 1 END) as certificate_programs,
    AVG(p.duration_years) as avg_duration_years,
    AVG(p.credit_hours) as avg_credit_hours,
    MAX(p.updated_at) as last_updated
FROM universities u
LEFT JOIN programs p ON u.id = p.university_id AND p.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.name, u.country;

-- Create index on materialized view
CREATE INDEX idx_university_program_stats_country
ON university_program_stats(country, total_programs DESC);

-- Program course statistics
CREATE MATERIALIZED VIEW program_course_stats AS
SELECT 
    p.id as program_id,
    p.name as program_name,
    p.university_id,
    COUNT(c.id) as total_courses,
    COUNT(CASE WHEN c.required = true THEN 1 END) as required_courses,
    COUNT(CASE WHEN c.course_level = 'foundation' THEN 1 END) as foundation_courses,
    COUNT(CASE WHEN c.course_level = 'intermediate' THEN 1 END) as intermediate_courses,
    COUNT(CASE WHEN c.course_level = 'advanced' THEN 1 END) as advanced_courses,
    COUNT(CASE WHEN c.course_level = 'graduate' THEN 1 END) as graduate_courses,
    SUM(c.credit_hours) as total_credit_hours,
    AVG(c.credit_hours) as avg_credit_hours,
    MAX(c.updated_at) as last_updated
FROM programs p
LEFT JOIN courses c ON p.id = c.program_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.university_id;

-- Create index on materialized view
CREATE INDEX idx_program_course_stats_university
ON program_course_stats(university_id, total_courses DESC);

-- Analysis performance statistics
CREATE MATERIALIZED VIEW analysis_performance_stats AS
SELECT 
    DATE_TRUNC('day', a.started_at) as analysis_date,
    a.analysis_depth,
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN a.analysis_status = 'completed' THEN 1 END) as completed_analyses,
    COUNT(CASE WHEN a.analysis_status = 'failed' THEN 1 END) as failed_analyses,
    AVG(EXTRACT(EPOCH FROM (a.completed_at - a.started_at))) as avg_duration_seconds,
    AVG(ar.similarity_score) as avg_similarity_score,
    AVG(ar.alignment_percentage) as avg_alignment_percentage
FROM analysis_sessions a
LEFT JOIN analysis_results ar ON a.id = ar.analysis_session_id
WHERE a.started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', a.started_at), a.analysis_depth;

-- Create index on materialized view
CREATE INDEX idx_analysis_performance_stats_date
ON analysis_performance_stats(analysis_date DESC, analysis_depth);

-- =============================================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- =============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY university_program_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY program_course_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analysis_performance_stats;
    
    -- Log the refresh
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
    VALUES ('materialized_views_refreshed', 1, 'count');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- QUERY OPTIMIZATION HELPER FUNCTIONS
-- =============================================================================

-- Function to get similar programs based on courses and metadata
CREATE OR REPLACE FUNCTION find_similar_programs(
    target_program_id UUID,
    similarity_threshold NUMERIC DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    program_id UUID,
    program_name VARCHAR(500),
    university_name VARCHAR(500),
    similarity_score NUMERIC,
    shared_courses INTEGER,
    total_courses INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH target_courses AS (
        SELECT ARRAY_AGG(DISTINCT LOWER(TRIM(name))) as course_names,
               COUNT(*) as total_target_courses
        FROM courses 
        WHERE program_id = target_program_id
    ),
    program_similarities AS (
        SELECT 
            p.id,
            p.name,
            u.name as university_name,
            ARRAY_AGG(DISTINCT LOWER(TRIM(c.name))) as course_names,
            COUNT(c.id) as course_count
        FROM programs p
        JOIN universities u ON p.university_id = u.id
        LEFT JOIN courses c ON p.id = c.program_id
        WHERE p.id != target_program_id AND p.is_active = true
        GROUP BY p.id, p.name, u.name
    )
    SELECT 
        ps.id::UUID,
        ps.name::VARCHAR(500),
        ps.university_name::VARCHAR(500),
        (
            CASE 
                WHEN ps.course_count = 0 OR tc.total_target_courses = 0 THEN 0
                ELSE (
                    -- Calculate Jaccard similarity
                    CARDINALITY(ps.course_names & tc.course_names)::NUMERIC /
                    CARDINALITY(ps.course_names | tc.course_names)::NUMERIC
                )
            END
        ) as similarity_score,
        CARDINALITY(ps.course_names & tc.course_names) as shared_courses,
        ps.course_count as total_courses
    FROM program_similarities ps
    CROSS JOIN target_courses tc
    WHERE (
        CASE 
            WHEN ps.course_count = 0 OR tc.total_target_courses = 0 THEN 0
            ELSE (
                CARDINALITY(ps.course_names & tc.course_names)::NUMERIC /
                CARDINALITY(ps.course_names | tc.course_names)::NUMERIC
            )
        END
    ) >= similarity_threshold
    ORDER BY similarity_score DESC, shared_courses DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get program statistics with caching
CREATE OR REPLACE FUNCTION get_program_statistics(program_uuid UUID)
RETURNS TABLE (
    total_courses INTEGER,
    required_courses INTEGER,
    elective_courses INTEGER,
    total_credit_hours NUMERIC,
    foundation_courses INTEGER,
    intermediate_courses INTEGER,
    advanced_courses INTEGER,
    graduate_courses INTEGER,
    avg_credit_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_courses,
        COUNT(CASE WHEN required = true THEN 1 END)::INTEGER as required_courses,
        COUNT(CASE WHEN required = false THEN 1 END)::INTEGER as elective_courses,
        COALESCE(SUM(credit_hours), 0) as total_credit_hours,
        COUNT(CASE WHEN course_level = 'foundation' THEN 1 END)::INTEGER as foundation_courses,
        COUNT(CASE WHEN course_level = 'intermediate' THEN 1 END)::INTEGER as intermediate_courses,
        COUNT(CASE WHEN course_level = 'advanced' THEN 1 END)::INTEGER as advanced_courses,
        COUNT(CASE WHEN course_level = 'graduate' THEN 1 END)::INTEGER as graduate_courses,
        COALESCE(AVG(credit_hours), 0) as avg_credit_hours
    FROM courses
    WHERE program_id = program_uuid;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to clean up old sessions and logs
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up expired user sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old audit logs (keep based on retention policy)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Clean up old API usage records
    DELETE FROM api_usage 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Clean up old system metrics (keep recent data)
    DELETE FROM system_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Log cleanup operation
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
    VALUES ('cleanup_records_deleted', deleted_count, 'count');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reindex tables for performance maintenance
CREATE OR REPLACE FUNCTION reindex_tables()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    -- Reindex main tables that get heavy write traffic
    FOR table_record IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('analysis_sessions', 'agent_tasks', 'documents', 'api_usage')
    LOOP
        EXECUTE format('REINDEX TABLE %I', table_record.tablename);
    END LOOP;
    
    -- Log reindex operation
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
    VALUES ('tables_reindexed', 1, 'operation');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for slow query monitoring
CREATE VIEW slow_queries_view AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 20;

-- View for table usage statistics
CREATE VIEW table_stats_view AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- View for index usage statistics
CREATE VIEW index_usage_view AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- =============================================================================
-- AUTOMATED MAINTENANCE SCHEDULING
-- =============================================================================

-- Function to run daily maintenance tasks
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS void AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_materialized_views();
    
    -- Clean up old data
    PERFORM cleanup_old_data(90); -- Keep 90 days of data
    
    -- Update table statistics
    ANALYZE;
    
    -- Log maintenance completion
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
    VALUES ('daily_maintenance_completed', 1, 'operation');
END;
$$ LANGUAGE plpgsql;

-- Function to run weekly maintenance tasks  
CREATE OR REPLACE FUNCTION run_weekly_maintenance()
RETURNS void AS $$
BEGIN
    -- Reindex tables
    PERFORM reindex_tables();
    
    -- Vacuum analyze tables
    VACUUM ANALYZE;
    
    -- Log maintenance completion
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit)
    VALUES ('weekly_maintenance_completed', 1, 'operation');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATABASE TUNING RECOMMENDATIONS
-- =============================================================================

-- Function to check for missing indexes
CREATE OR REPLACE FUNCTION check_missing_indexes()
RETURNS TABLE (
    table_name TEXT,
    column_name TEXT,
    n_distinct REAL,
    correlation REAL,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.tablename::TEXT,
        ps.attname::TEXT,
        ps.n_distinct,
        ps.correlation,
        CASE 
            WHEN ps.n_distinct > 100 AND ps.correlation < 0.1 THEN 'Consider adding index'
            WHEN ps.n_distinct > 1000 THEN 'Strongly consider adding index'
            ELSE 'Index may not be beneficial'
        END::TEXT as recommendation
    FROM pg_stats ps
    JOIN pg_class c ON c.relname = ps.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND ps.n_distinct > 50
    AND ps.attname NOT IN (
        SELECT column_name
        FROM information_schema.statistics
        WHERE table_schema = 'public'
        AND table_name = ps.tablename
    )
    ORDER BY ps.n_distinct DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Performance optimization migration completed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Summary of optimizations:';
    RAISE NOTICE '- Added % composite indexes', (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE '%_multi_%' OR indexname LIKE '%_covering'
    );
    RAISE NOTICE '- Created % materialized views', (
        SELECT COUNT(*) 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    );
    RAISE NOTICE '- Added % maintenance functions', (
        SELECT COUNT(*) 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_name LIKE '%maintenance%'
    );
    RAISE NOTICE '';
    RAISE NOTICE 'Maintenance recommendations:';
    RAISE NOTICE '1. Schedule daily maintenance: SELECT run_daily_maintenance();';
    RAISE NOTICE '2. Schedule weekly maintenance: SELECT run_weekly_maintenance();';
    RAISE NOTICE '3. Monitor slow queries: SELECT * FROM slow_queries_view;';
    RAISE NOTICE '4. Check index usage: SELECT * FROM index_usage_view;';
    RAISE NOTICE '5. Review missing indexes: SELECT * FROM check_missing_indexes();';
    RAISE NOTICE '=================================================================';
END $$;