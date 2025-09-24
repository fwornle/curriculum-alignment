# Database Administration Guide

This guide covers PostgreSQL database administration, maintenance, backup, and performance optimization for the MACAS system.

## Database Architecture

### 🏗️ Database Schema Overview

**Core Tables:**
```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    sso_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Educational Programs
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    institution VARCHAR(255),
    level education_level NOT NULL,
    duration_years INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status document_status DEFAULT 'pending',
    extracted_text TEXT,
    metadata JSONB
);

-- Analysis Results
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    parameters JSONB,
    results JSONB NOT NULL,
    status analysis_status DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    execution_time_ms INTEGER,
    error_message TEXT
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type report_type NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analysis_results(id),
    content JSONB NOT NULL,
    file_path VARCHAR(1000),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_at TIMESTAMP,
    is_public BOOLEAN DEFAULT false
);
```

**Custom Types and Enums:**
```sql
-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'user');

-- Education levels
CREATE TYPE education_level AS ENUM ('bachelor', 'master', 'phd', 'certificate', 'diploma');

-- Document processing status
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Analysis types
CREATE TYPE analysis_type AS ENUM (
    'curriculum_alignment',
    'gap_analysis',
    'competency_mapping',
    'learning_outcomes',
    'assessment_alignment'
);

-- Analysis status
CREATE TYPE analysis_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Report types
CREATE TYPE report_type AS ENUM (
    'alignment_report',
    'gap_analysis_report',
    'competency_report',
    'summary_report',
    'detailed_report'
);
```

### 🔍 Indexes and Constraints

**Performance Indexes:**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sso_id ON users(sso_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Program queries
CREATE INDEX idx_programs_institution ON programs(institution);
CREATE INDEX idx_programs_level ON programs(level);
CREATE INDEX idx_programs_created_by ON programs(created_by);
CREATE INDEX idx_programs_active ON programs(is_active);
CREATE INDEX idx_programs_created_at ON programs(created_at DESC);

-- Document searches
CREATE INDEX idx_documents_program_id ON documents(program_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_name ON documents USING GIN(to_tsvector('english', name));

-- Full-text search on extracted text
CREATE INDEX idx_documents_text_search ON documents 
    USING GIN(to_tsvector('english', extracted_text));

-- Analysis performance
CREATE INDEX idx_analysis_program_id ON analysis_results(program_id);
CREATE INDEX idx_analysis_type ON analysis_results(analysis_type);
CREATE INDEX idx_analysis_status ON analysis_results(status);
CREATE INDEX idx_analysis_created_at ON analysis_results(created_at DESC);
CREATE INDEX idx_analysis_created_by ON analysis_results(created_by);

-- JSON field indexes for analysis parameters and results
CREATE INDEX idx_analysis_parameters ON analysis_results USING GIN(parameters);
CREATE INDEX idx_analysis_results ON analysis_results USING GIN(results);

-- Report queries
CREATE INDEX idx_reports_program_id ON reports(program_id);
CREATE INDEX idx_reports_analysis_id ON reports(analysis_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_public ON reports(is_public);

-- Composite indexes for common query patterns
CREATE INDEX idx_programs_user_active ON programs(created_by, is_active, created_at DESC);
CREATE INDEX idx_documents_program_status ON documents(program_id, processing_status);
CREATE INDEX idx_analysis_program_type_status ON analysis_results(program_id, analysis_type, status);
```

## Database Administration

### 🔧 Daily Operations

**Connection Monitoring:**
```sql
-- Check active connections
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    temp_files,
    temp_bytes
FROM pg_stat_database 
WHERE datname = 'macas';

-- Monitor connection pool usage
SELECT 
    state,
    COUNT(*) as connections,
    AVG(EXTRACT(EPOCH FROM (now() - state_change))) as avg_duration
FROM pg_stat_activity 
WHERE datname = 'macas'
GROUP BY state;

-- Long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND datname = 'macas';
```

**Performance Monitoring:**
```sql
-- Table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_tup_hot_upd as hot_updates,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read as index_reads,
    idx_tup_fetch as index_fetches,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Cache hit ratio (should be > 95%)
SELECT 
    'buffer_cache_hit_ratio' as metric,
    ROUND(
        (blks_hit * 100.0 / (blks_hit + blks_read))::numeric, 2
    ) as percentage
FROM pg_stat_database 
WHERE datname = 'macas';
```

### 🛠️ Maintenance Tasks

**Automated Maintenance Script:**
```bash
#!/bin/bash
# /opt/macas/scripts/db-maintenance.sh

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-macas}"
DB_USER="${DB_USER:-macas_admin}"
LOG_FILE="/var/log/macas/db-maintenance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log_message() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log_message "Starting database maintenance"

# Vacuum and analyze tables
log_message "Running VACUUM ANALYZE on all tables"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    VACUUM ANALYZE users;
    VACUUM ANALYZE programs;
    VACUUM ANALYZE documents;
    VACUUM ANALYZE analysis_results;
    VACUUM ANALYZE reports;
"

# Reindex critical indexes
log_message "Reindexing critical indexes"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    REINDEX INDEX CONCURRENTLY idx_documents_text_search;
    REINDEX INDEX CONCURRENTLY idx_analysis_results;
    REINDEX INDEX CONCURRENTLY idx_analysis_parameters;
"

# Update table statistics
log_message "Updating table statistics"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    ANALYZE users;
    ANALYZE programs;
    ANALYZE documents;
    ANALYZE analysis_results;
    ANALYZE reports;
"

# Clean up old temporary data
log_message "Cleaning up old temporary data"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    DELETE FROM analysis_results 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM pg_stat_statements_info 
    WHERE calls < 10 
    AND last_exec < NOW() - INTERVAL '7 days';
"

log_message "Database maintenance completed successfully"
```

**Weekly Maintenance Checklist:**
```bash
#!/bin/bash
# /opt/macas/scripts/weekly-maintenance.sh

# 1. Full database vacuum
echo "Performing full database VACUUM..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM FULL;"

# 2. Update all statistics
echo "Updating all table statistics..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"

# 3. Check for unused indexes
echo "Checking for unused indexes..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan < 10 
ORDER BY pg_relation_size(indexrelid) DESC;
"

# 4. Check table bloat
echo "Checking table bloat..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /opt/macas/sql/check-bloat.sql

# 5. Archive old logs
echo "Archiving old database logs..."
find /var/log/postgresql -name "*.log" -mtime +7 -exec gzip {} \;
find /var/log/postgresql -name "*.log.gz" -mtime +30 -delete
```

## Backup and Recovery

### 💾 Backup Strategy

**Full Database Backup Script:**
```bash
#!/bin/bash
# /opt/macas/scripts/backup-database.sh

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-macas}"
DB_USER="${DB_USER:-macas_backup}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/macas}"
S3_BUCKET="${S3_BACKUP_BUCKET:-macas-backups-prod}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/macas_full_$TIMESTAMP.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

echo "Starting full database backup..."

# Create full backup
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --file="$BACKUP_FILE"

# Compress backup
echo "Compressing backup file..."
gzip "$BACKUP_FILE"

# Upload to S3
echo "Uploading backup to S3..."
aws s3 cp "$COMPRESSED_FILE" "s3://$S3_BUCKET/database/full/" \
    --storage-class STANDARD_IA

# Create backup metadata
cat > "$BACKUP_DIR/macas_full_$TIMESTAMP.meta" << EOF
{
    "timestamp": "$TIMESTAMP",
    "database": "$DB_NAME",
    "size": $(stat -f%z "$COMPRESSED_FILE"),
    "checksum": "$(sha256sum "$COMPRESSED_FILE" | cut -d' ' -f1)",
    "s3_location": "s3://$S3_BUCKET/database/full/macas_full_$TIMESTAMP.sql.gz"
}
EOF

# Clean up old local backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "macas_full_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "macas_full_*.meta" -mtime +7 -delete

echo "Backup completed successfully: $COMPRESSED_FILE"
```

**Incremental Backup with WAL-E:**
```bash
#!/bin/bash
# /opt/macas/scripts/setup-wal-e.sh

# Configure WAL-E for continuous archiving
export WALE_S3_PREFIX="s3://macas-backups-prod/wal-e"
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_REGION="us-east-1"

# PostgreSQL configuration for WAL archiving
cat >> /etc/postgresql/13/main/postgresql.conf << EOF
# WAL-E Configuration
wal_level = replica
archive_mode = on
archive_command = '/usr/local/bin/wal-e wal-push %p'
archive_timeout = 60
max_wal_senders = 3
wal_keep_segments = 32
EOF

# Create base backup
wal-e backup-push /var/lib/postgresql/13/main

# Set up automated base backups (weekly)
cat > /etc/cron.d/wal-e-backup << EOF
# Weekly base backup
0 2 * * 0 postgres /usr/local/bin/wal-e backup-push /var/lib/postgresql/13/main
# Daily backup cleanup (keep 7 base backups)
0 3 * * * postgres /usr/local/bin/wal-e delete --confirm retain 7
EOF
```

### 🔄 Recovery Procedures

**Point-in-Time Recovery:**
```bash
#!/bin/bash
# /opt/macas/scripts/restore-database.sh

set -euo pipefail

RESTORE_POINT="${1:-latest}"
RESTORE_DIR="/var/lib/postgresql/13/restore"
BACKUP_DIR="/var/backups/macas"

echo "Starting point-in-time recovery to: $RESTORE_POINT"

# Stop PostgreSQL
systemctl stop postgresql

# Create restore directory
mkdir -p "$RESTORE_DIR"
chown postgres:postgres "$RESTORE_DIR"

# Fetch base backup from WAL-E
sudo -u postgres wal-e backup-fetch "$RESTORE_DIR" "$RESTORE_POINT"

# Create recovery configuration
sudo -u postgres cat > "$RESTORE_DIR/recovery.conf" << EOF
restore_command = '/usr/local/bin/wal-e wal-fetch "%f" "%p"'
recovery_target_time = '$RESTORE_POINT'
recovery_target_action = 'promote'
EOF

# Set permissions
chown -R postgres:postgres "$RESTORE_DIR"
chmod 700 "$RESTORE_DIR"

# Replace data directory
mv /var/lib/postgresql/13/main /var/lib/postgresql/13/main.backup
mv "$RESTORE_DIR" /var/lib/postgresql/13/main

# Start PostgreSQL
systemctl start postgresql

echo "Recovery completed successfully"
```

**Backup Verification Script:**
```bash
#!/bin/bash
# /opt/macas/scripts/verify-backup.sh

BACKUP_FILE="$1"
TEST_DB="macas_test_restore"

echo "Verifying backup file: $BACKUP_FILE"

# Create test database
createdb -U postgres "$TEST_DB"

# Restore backup to test database
pg_restore \
    -U postgres \
    -d "$TEST_DB" \
    --verbose \
    --no-owner \
    --no-privileges \
    "$BACKUP_FILE"

# Run verification queries
psql -U postgres -d "$TEST_DB" -c "
SELECT 'users' as table_name, count(*) as row_count FROM users
UNION ALL
SELECT 'programs', count(*) FROM programs
UNION ALL
SELECT 'documents', count(*) FROM documents
UNION ALL
SELECT 'analysis_results', count(*) FROM analysis_results
UNION ALL
SELECT 'reports', count(*) FROM reports;
"

# Test data integrity
psql -U postgres -d "$TEST_DB" -c "
SELECT 
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT id) THEN 'PASS'
        ELSE 'FAIL'
    END as unique_ids_test
FROM users;
"

# Clean up test database
dropdb -U postgres "$TEST_DB"

echo "Backup verification completed"
```

## Performance Optimization

### ⚡ Query Optimization

**Slow Query Analysis:**
```sql
-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Most time-consuming queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;

-- Most frequently executed queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY calls DESC 
LIMIT 20;

-- Queries with low cache hit ratio
SELECT 
    query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE shared_blks_read > 0
ORDER BY hit_percent ASC 
LIMIT 20;
```

**Index Optimization:**
```sql
-- Missing indexes analysis
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Unused indexes (candidates for removal)
SELECT 
    s.schemaname,
    s.tablename,
    s.indexname,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as size,
    s.idx_scan
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan < 100  -- Less than 100 scans
AND NOT i.indisunique   -- Not unique indexes
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- Duplicate indexes
SELECT 
    a.schemaname,
    a.tablename,
    a.indexname as index1,
    b.indexname as index2
FROM pg_stat_user_indexes a
JOIN pg_stat_user_indexes b ON (
    a.schemaname = b.schemaname AND
    a.tablename = b.tablename AND
    a.indexname < b.indexname
)
WHERE a.indexdef = b.indexdef;
```

### 📊 Connection Pool Configuration

**PgBouncer Configuration:**
```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
macas = host=macas-db.cluster-xyz.us-east-1.rds.amazonaws.com port=5432 dbname=macas

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = trust
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
max_db_connections = 50

# Performance tuning
server_reset_query = DISCARD ALL
server_check_query = select 1
server_check_delay = 30
server_connect_timeout = 15
server_login_retry = 15

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

# Security
ignore_startup_parameters = extra_float_digits
```

### 🔧 PostgreSQL Tuning

**Production PostgreSQL Configuration:**
```bash
# /etc/postgresql/13/main/postgresql.conf

# Memory Configuration
shared_buffers = 8GB                    # 25% of total RAM
effective_cache_size = 24GB             # 75% of total RAM
work_mem = 256MB                        # Per-operation memory
maintenance_work_mem = 1GB              # Maintenance operations
temp_buffers = 128MB                    # Temporary table memory

# Checkpointing and WAL
checkpoint_completion_target = 0.9      # Spread checkpoints
checkpoint_timeout = 15min              # Maximum time between checkpoints
max_wal_size = 4GB                     # Maximum WAL size
min_wal_size = 1GB                     # Minimum WAL size
wal_buffers = 64MB                     # WAL buffer size

# Query Planner
random_page_cost = 1.5                 # SSD storage
effective_io_concurrency = 200         # Concurrent I/O operations
seq_page_cost = 1.0                    # Sequential scan cost

# Background Writer
bgwriter_delay = 200ms                 # Background writer delay
bgwriter_lru_maxpages = 100           # Pages written per round
bgwriter_lru_multiplier = 2.0         # Multiplier for next round

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05

# Connection and Authentication
max_connections = 200                  # Maximum connections
listen_addresses = '*'                 # Listen on all addresses
port = 5432                           # PostgreSQL port

# Logging
log_destination = 'csvlog'            # CSV format logs
logging_collector = on                # Enable log collector
log_directory = '/var/log/postgresql' # Log directory
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d                 # Rotate daily
log_rotation_size = 100MB             # Rotate at 100MB
log_min_duration_statement = 1000     # Log slow queries (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_lock_waits = on                   # Log lock waits
log_temp_files = 0                    # Log all temp files

# Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
```

---

This database administration guide provides comprehensive coverage of PostgreSQL management, maintenance, backup strategies, and performance optimization for the MACAS system.