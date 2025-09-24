#!/bin/bash

# Comprehensive Restore Script for Curriculum Alignment System
# Supports PostgreSQL, S3 documents, configuration, and application data restoration

set -e

# Configuration
ENVIRONMENT="${1:-development}"
BACKUP_NAME="${2}"
RESTORE_TYPE="${3:-full}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-curriculum-alignment-backups}"
ENCRYPTION_KEY_ID="${ENCRYPTION_KEY_ID:-alias/curriculum-alignment-backup}"

# AWS Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_CLI_PROFILE="${AWS_CLI_PROFILE:-default}"

# Database Configuration
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

# Restore Configuration
RESTORE_DIR="/tmp/curriculum-restore"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESTORE_LOG_FILE="/var/log/curriculum-restore-${TIMESTAMP}.log"

# Safety Configuration
REQUIRE_CONFIRMATION="${REQUIRE_CONFIRMATION:-true}"
ENABLE_PRE_RESTORE_BACKUP="${ENABLE_PRE_RESTORE_BACKUP:-true}"
VERIFY_AFTER_RESTORE="${VERIFY_AFTER_RESTORE:-true}"

# Parallel Processing
PARALLEL_JOBS="${PARALLEL_JOBS:-$(nproc)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    local message="[INFO] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$RESTORE_LOG_FILE"
}

log_success() {
    local message="[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$RESTORE_LOG_FILE"
}

log_warning() {
    local message="[WARNING] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$RESTORE_LOG_FILE"
}

log_error() {
    local message="[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$RESTORE_LOG_FILE"
}

log_critical() {
    local message="[CRITICAL] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${RED}🚨 $message${NC}" >&2
    echo "$message" >> "$RESTORE_LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("aws" "pg_restore" "psql" "gunzip" "tar")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile "$AWS_CLI_PROFILE" &> /dev/null; then
        log_error "AWS credentials not configured or invalid for profile: $AWS_CLI_PROFILE"
        exit 1
    fi
    
    # Check S3 bucket access
    if ! aws s3 ls "s3://$S3_BACKUP_BUCKET" --profile "$AWS_CLI_PROFILE" &> /dev/null; then
        log_error "S3 backup bucket $S3_BACKUP_BUCKET not accessible"
        exit 1
    fi
    
    # Create restore directory
    mkdir -p "$RESTORE_DIR"
    
    # Check disk space
    local available_space
    available_space=$(df "$RESTORE_DIR" | tail -1 | awk '{print $4}')
    local required_space=2097152 # 2GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# List available backups
list_available_backups() {
    log_info "Listing available backups for environment: $ENVIRONMENT"
    
    local s3_prefix="$ENVIRONMENT/"
    
    echo -e "\n${CYAN}Available Backups:${NC}"
    aws s3 ls "s3://$S3_BACKUP_BUCKET/$s3_prefix" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION" \
        --recursive | \
        grep "manifest.json" | \
        sort -r | \
        head -20 | \
        while read -r line; do
            local manifest_path=$(echo "$line" | awk '{print $4}')
            local manifest_date=$(echo "$line" | awk '{print $1 " " $2}')
            local backup_name=$(basename "$manifest_path" "_manifest.json")
            echo "  $manifest_date - $backup_name"
        done
    echo ""
}

# Get database credentials from AWS Systems Manager
get_database_credentials() {
    if [[ -z "$DB_HOST" || -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
        log_info "Retrieving database credentials from AWS Systems Manager..."
        
        DB_HOST=$(aws ssm get-parameter \
            --name "/curriculum-alignment/$ENVIRONMENT/db/host" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --query "Parameter.Value" \
            --output text 2>/dev/null || echo "")
        
        DB_NAME=$(aws ssm get-parameter \
            --name "/curriculum-alignment/$ENVIRONMENT/db/name" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --query "Parameter.Value" \
            --output text 2>/dev/null || echo "")
        
        DB_USER=$(aws ssm get-parameter \
            --name "/curriculum-alignment/$ENVIRONMENT/db/username" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --query "Parameter.Value" \
            --output text 2>/dev/null || echo "")
        
        DB_PASSWORD=$(aws ssm get-parameter \
            --name "/curriculum-alignment/$ENVIRONMENT/db/password" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --with-decryption \
            --query "Parameter.Value" \
            --output text 2>/dev/null || echo "")
    fi
    
    if [[ -z "$DB_HOST" || -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
        log_error "Database credentials not found in environment variables or AWS Systems Manager"
        exit 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    log_success "Database credentials retrieved"
}

# Test database connectivity
test_database_connection() {
    log_info "Testing database connectivity..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        exit 1
    fi
}

# Find backup in S3
find_backup_in_s3() {
    local backup_name="$1"
    local manifest_path=""
    
    log_info "Searching for backup: $backup_name"
    
    # Search for manifest file
    manifest_path=$(aws s3 ls "s3://$S3_BACKUP_BUCKET/$ENVIRONMENT/" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION" \
        --recursive | \
        grep "${backup_name}_manifest.json" | \
        head -1 | \
        awk '{print $4}')
    
    if [[ -z "$manifest_path" ]]; then
        log_error "Backup not found: $backup_name"
        log_info "Use --list to see available backups"
        exit 1
    fi
    
    echo "$manifest_path"
}

# Download and decrypt backup files
download_backup_files() {
    local manifest_path="$1"
    local backup_dir_path
    backup_dir_path=$(dirname "$manifest_path")
    
    log_info "Downloading backup files from: s3://$S3_BACKUP_BUCKET/$backup_dir_path"
    
    # Download manifest first
    local local_manifest="$RESTORE_DIR/manifest.json"
    aws s3 cp "s3://$S3_BACKUP_BUCKET/$manifest_path" "$local_manifest" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION"
    
    # Read manifest to get file list
    local backup_files
    backup_files=$(jq -r '.files[]' "$local_manifest" 2>/dev/null || echo "")
    
    if [[ -z "$backup_files" ]]; then
        log_error "Failed to read backup manifest"
        exit 1
    fi
    
    # Download backup files
    echo "$backup_files" | while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            local s3_file_path="$backup_dir_path/$file"
            local local_file_path="$RESTORE_DIR/$file"
            
            log_info "Downloading: $file"
            
            if aws s3 cp "s3://$S3_BACKUP_BUCKET/$s3_file_path" "$local_file_path" \
                --profile "$AWS_CLI_PROFILE" \
                --region "$AWS_REGION"; then
                
                log_success "Downloaded: $file"
                
                # Decrypt if needed
                decrypt_file "$local_file_path"
            else
                log_error "Failed to download: $file"
                exit 1
            fi
        fi
    done
    
    log_success "All backup files downloaded"
}

# Decrypt backup file
decrypt_file() {
    local file="$1"
    
    # Check if file is encrypted by looking at manifest
    local encryption_enabled
    encryption_enabled=$(jq -r '.encryption_enabled' "$RESTORE_DIR/manifest.json" 2>/dev/null || echo "false")
    
    if [[ "$encryption_enabled" == "true" ]]; then
        log_info "Decrypting: $(basename "$file")"
        
        # Decrypt using AWS KMS
        local decrypted_file="${file}.decrypted"
        
        if aws kms decrypt \
            --ciphertext-blob fileb://"$file" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --query "Plaintext" \
            --output text | base64 --decode > "$decrypted_file"; then
            
            # Replace encrypted file with decrypted version
            mv "$decrypted_file" "$file"
            log_success "Decrypted: $(basename "$file")"
        else
            log_error "Failed to decrypt: $(basename "$file")"
            exit 1
        fi
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    if [[ "$ENABLE_PRE_RESTORE_BACKUP" != "true" ]]; then
        log_info "Pre-restore backup disabled, skipping"
        return 0
    fi
    
    log_warning "Creating pre-restore backup of current state..."
    
    local pre_restore_name="pre-restore-${ENVIRONMENT}-${TIMESTAMP}"
    local current_backup_script="$(dirname "$0")/backup.sh"
    
    if [[ -x "$current_backup_script" ]]; then
        if "$current_backup_script" "$ENVIRONMENT" "database" \
            S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET}-pre-restore" \
            BACKUP_RETENTION_DAYS=7; then
            log_success "Pre-restore backup completed"
        else
            log_error "Pre-restore backup failed"
            if [[ "$REQUIRE_CONFIRMATION" == "true" ]]; then
                echo -n "Continue without pre-restore backup? [y/N]: "
                read -r response
                if [[ "$response" != "y" && "$response" != "Y" ]]; then
                    log_info "Restore cancelled by user"
                    exit 0
                fi
            fi
        fi
    else
        log_warning "Backup script not found, skipping pre-restore backup"
    fi
}

# Restore database
restore_database() {
    local database_backup_custom="$RESTORE_DIR/${BACKUP_NAME}_database.sql.custom"
    local database_backup_sql="$RESTORE_DIR/${BACKUP_NAME}_database.sql.gz"
    
    log_warning "🚨 STARTING DATABASE RESTORE - THIS WILL OVERWRITE EXISTING DATA 🚨"
    
    if [[ "$REQUIRE_CONFIRMATION" == "true" ]]; then
        echo -e "${RED}WARNING: This will completely replace the current database!${NC}"
        echo -n "Are you absolutely sure you want to proceed? [y/N]: "
        read -r response
        if [[ "$response" != "y" && "$response" != "Y" ]]; then
            log_info "Database restore cancelled by user"
            return 0
        fi
    fi
    
    # Use custom format if available, otherwise use compressed SQL
    if [[ -f "$database_backup_custom" ]]; then
        log_info "Restoring database from custom format backup..."
        
        # Drop and recreate database (if not production)
        if [[ "$ENVIRONMENT" != "production" ]]; then
            log_warning "Dropping and recreating database..."
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
                -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
                -c "CREATE DATABASE \"$DB_NAME\";"
        else
            log_warning "Production environment - cleaning existing tables..."
            # Get list of all tables and truncate them
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -t -c "SELECT 'TRUNCATE TABLE ' || string_agg(table_name, ', ') || ' CASCADE;' FROM information_schema.tables WHERE table_schema = 'public';" | \
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
        fi
        
        # Restore using pg_restore
        if pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --jobs="$PARALLEL_JOBS" \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            "$database_backup_custom"; then
            
            log_success "Database restored from custom format backup"
        else
            log_error "Database restore failed"
            return 1
        fi
        
    elif [[ -f "$database_backup_sql" ]]; then
        log_info "Restoring database from compressed SQL backup..."
        
        # Decompress and restore
        if gunzip -c "$database_backup_sql" | \
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --quiet \
            --single-transaction; then
            
            log_success "Database restored from SQL backup"
        else
            log_error "Database restore failed"
            return 1
        fi
    else
        log_error "No database backup file found"
        return 1
    fi
    
    # Verify database restore
    if [[ "$VERIFY_AFTER_RESTORE" == "true" ]]; then
        verify_database_restore
    fi
}

# Verify database restore
verify_database_restore() {
    log_info "Verifying database restore..."
    
    # Check table count
    local table_count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    if [[ "$table_count" -gt 0 ]]; then
        log_success "Database verification passed - $table_count tables found"
        
        # Check for critical tables
        local critical_tables=("users" "programs" "courses" "universities")
        for table in "${critical_tables[@]}"; do
            local row_count
            row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
            
            if [[ "$row_count" -gt 0 ]]; then
                log_info "Table $table: $row_count rows"
            else
                log_warning "Table $table: no data found"
            fi
        done
    else
        log_error "Database verification failed - no tables found"
        return 1
    fi
}

# Restore S3 documents
restore_s3_documents() {
    local s3_documents_backup="$RESTORE_DIR/${BACKUP_NAME}_s3_documents.tar.gz"
    local s3_target_bucket="curriculum-alignment-documents-$ENVIRONMENT"
    local temp_dir="$RESTORE_DIR/s3_restore_temp"
    
    if [[ ! -f "$s3_documents_backup" ]]; then
        log_warning "S3 documents backup not found, skipping"
        return 0
    fi
    
    log_info "Restoring S3 documents..."
    log_info "Target bucket: $s3_target_bucket"
    
    if [[ "$REQUIRE_CONFIRMATION" == "true" ]]; then
        echo -n "This will overwrite files in S3 bucket $s3_target_bucket. Continue? [y/N]: "
        read -r response
        if [[ "$response" != "y" && "$response" != "Y" ]]; then
            log_info "S3 documents restore cancelled by user"
            return 0
        fi
    fi
    
    # Create temp directory and extract files
    mkdir -p "$temp_dir"
    
    log_info "Extracting document archive..."
    if tar -xzf "$s3_documents_backup" -C "$temp_dir"; then
        log_success "Document archive extracted"
        
        # Sync to S3 bucket
        log_info "Uploading documents to S3..."
        if aws s3 sync "$temp_dir" "s3://$s3_target_bucket" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" \
            --delete; then
            
            log_success "S3 documents restored"
        else
            log_error "Failed to restore S3 documents"
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Clean up
        rm -rf "$temp_dir"
    else
        log_error "Failed to extract document archive"
        return 1
    fi
}

# Restore configuration
restore_configuration() {
    local config_backup="$RESTORE_DIR/${BACKUP_NAME}_configuration.tar.gz"
    local temp_dir="$RESTORE_DIR/config_restore_temp"
    
    if [[ ! -f "$config_backup" ]]; then
        log_warning "Configuration backup not found, skipping"
        return 0
    fi
    
    log_info "Restoring configuration..."
    
    if [[ "$REQUIRE_CONFIRMATION" == "true" ]]; then
        echo -n "This will overwrite current configuration. Continue? [y/N]: "
        read -r response
        if [[ "$response" != "y" && "$response" != "Y" ]]; then
            log_info "Configuration restore cancelled by user"
            return 0
        fi
    fi
    
    # Extract configuration files
    mkdir -p "$temp_dir"
    
    if tar -xzf "$config_backup" -C "$temp_dir"; then
        log_success "Configuration archive extracted"
        
        # Restore SSM parameters
        if [[ -f "$temp_dir/ssm_parameters.json" ]]; then
            log_info "Restoring SSM parameters..."
            
            jq -r '.[] | "\(.Name)=\(.Value)"' "$temp_dir/ssm_parameters.json" | \
            while IFS='=' read -r name value; do
                if [[ -n "$name" && -n "$value" ]]; then
                    aws ssm put-parameter \
                        --name "$name" \
                        --value "$value" \
                        --type "SecureString" \
                        --overwrite \
                        --profile "$AWS_CLI_PROFILE" \
                        --region "$AWS_REGION" &> /dev/null || true
                fi
            done
            
            log_success "SSM parameters restored"
        fi
        
        # List other configuration files that were backed up
        log_info "Configuration files in backup:"
        find "$temp_dir" -type f -name "*.json" -o -name "*.toml" -o -name ".env.*" | \
        while IFS= read -r file; do
            log_info "  $(basename "$file")"
        done
        
        # Clean up
        rm -rf "$temp_dir"
    else
        log_error "Failed to extract configuration archive"
        return 1
    fi
}

# Run post-restore tasks
run_post_restore_tasks() {
    log_info "Running post-restore tasks..."
    
    # Update database statistics
    log_info "Updating database statistics..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "ANALYZE;" &> /dev/null || log_warning "Failed to update database statistics"
    
    # Check database integrity
    log_info "Checking database integrity..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "SELECT COUNT(*) FROM users;" &> /dev/null || log_warning "Database integrity check failed"
    
    log_success "Post-restore tasks completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send SNS notification if topic is configured
    local sns_topic_arn="${RESTORE_NOTIFICATION_TOPIC_ARN}"
    
    if [[ -n "$sns_topic_arn" ]]; then
        local subject="Curriculum Alignment Restore - $status"
        
        aws sns publish \
            --topic-arn "$sns_topic_arn" \
            --subject "$subject" \
            --message "$message" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" &> /dev/null || true
    fi
}

# Main restore function
main_restore() {
    local start_time
    start_time=$(date +%s)
    
    log_info "Starting restore process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Backup name: $BACKUP_NAME"
    log_info "Restore type: $RESTORE_TYPE"
    
    # Find backup in S3
    local manifest_path
    manifest_path=$(find_backup_in_s3 "$BACKUP_NAME")
    
    # Download backup files
    download_backup_files "$manifest_path"
    
    # Get database credentials
    get_database_credentials
    test_database_connection
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Execute restore based on type
    case "$RESTORE_TYPE" in
        "full")
            restore_database
            restore_s3_documents
            restore_configuration
            ;;
        "database")
            restore_database
            ;;
        "documents")
            restore_s3_documents
            ;;
        "config")
            restore_configuration
            ;;
        *)
            log_error "Invalid restore type: $RESTORE_TYPE"
            exit 1
            ;;
    esac
    
    # Run post-restore tasks
    run_post_restore_tasks
    
    # Clean up temporary files
    rm -rf "$RESTORE_DIR"
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Restore completed successfully in ${duration} seconds"
    
    # Send success notification
    local notification_message="Restore completed successfully for environment: $ENVIRONMENT
Backup: $BACKUP_NAME
Restore type: $RESTORE_TYPE
Duration: ${duration} seconds"
    
    send_notification "SUCCESS" "$notification_message"
}

# Error handler
error_handler() {
    local exit_code=$?
    log_error "Restore failed with exit code: $exit_code"
    
    # Clean up temporary files
    rm -rf "$RESTORE_DIR"
    
    # Send failure notification
    local notification_message="Restore failed for environment: $ENVIRONMENT
Backup: $BACKUP_NAME
Restore type: $RESTORE_TYPE
Exit code: $exit_code
Please check logs for details: $RESTORE_LOG_FILE"
    
    send_notification "FAILURE" "$notification_message"
    
    exit $exit_code
}

# Set error handler
trap error_handler ERR

# Show usage
usage() {
    echo "Usage: $0 <environment> <backup_name> [restore_type]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (development, staging, production)"
    echo "  backup_name    Name of backup to restore (or 'latest' for most recent)"
    echo "  restore_type   Type of restore (full, database, documents, config) - default: full"
    echo ""
    echo "Options:"
    echo "  --list         List available backups for environment"
    echo "  --no-confirm   Skip confirmation prompts (DANGEROUS)"
    echo "  --no-pre-backup  Skip pre-restore backup"
    echo ""
    echo "Environment Variables:"
    echo "  S3_BACKUP_BUCKET           S3 bucket containing backups"
    echo "  REQUIRE_CONFIRMATION       Require confirmation (default: true)"
    echo "  ENABLE_PRE_RESTORE_BACKUP  Create backup before restore (default: true)"
    echo "  VERIFY_AFTER_RESTORE       Verify restore completion (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0 staging curriculum-alignment-staging-full-20231201_120000"
    echo "  $0 production latest database"
    echo "  $0 development --list"
}

# Main execution
case "${1:-}" in
    --help|-h)
        usage
        exit 0
        ;;
    --list)
        check_prerequisites
        list_available_backups
        exit 0
        ;;
    development|staging|production)
        ENVIRONMENT="$1"
        
        if [[ "$2" == "--list" ]]; then
            check_prerequisites
            list_available_backups
            exit 0
        fi
        
        if [[ -z "$2" ]]; then
            echo "Error: backup_name is required"
            usage
            exit 1
        fi
        
        BACKUP_NAME="$2"
        
        if [[ "$3" == "--list" ]]; then
            check_prerequisites
            list_available_backups
            exit 0
        fi
        
        if [[ -n "$3" ]]; then
            case "$3" in
                full|database|documents|config)
                    RESTORE_TYPE="$3"
                    ;;
                --no-confirm)
                    REQUIRE_CONFIRMATION="false"
                    ;;
                --no-pre-backup)
                    ENABLE_PRE_RESTORE_BACKUP="false"
                    ;;
                *)
                    echo "Invalid restore type or option: $3"
                    usage
                    exit 1
                    ;;
            esac
        fi
        
        # Handle additional flags
        shift 3
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --no-confirm)
                    REQUIRE_CONFIRMATION="false"
                    ;;
                --no-pre-backup)
                    ENABLE_PRE_RESTORE_BACKUP="false"
                    ;;
                *)
                    echo "Unknown option: $1"
                    usage
                    exit 1
                    ;;
            esac
            shift
        done
        
        # Handle 'latest' backup name
        if [[ "$BACKUP_NAME" == "latest" ]]; then
            log_info "Finding latest backup..."
            BACKUP_NAME=$(aws s3 ls "s3://$S3_BACKUP_BUCKET/$ENVIRONMENT/" \
                --profile "$AWS_CLI_PROFILE" \
                --region "$AWS_REGION" \
                --recursive | \
                grep "manifest.json" | \
                sort -k1,2 | \
                tail -1 | \
                awk '{print $4}' | \
                sed 's|.*/||' | \
                sed 's/_manifest.json$//')
            
            if [[ -z "$BACKUP_NAME" ]]; then
                log_error "No backups found for environment: $ENVIRONMENT"
                exit 1
            fi
            
            log_info "Latest backup found: $BACKUP_NAME"
        fi
        
        check_prerequisites
        main_restore
        ;;
    *)
        if [[ -n "$1" ]]; then
            echo "Invalid environment: $1"
        fi
        usage
        exit 1
        ;;
esac