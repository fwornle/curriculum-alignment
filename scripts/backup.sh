#!/bin/bash

# Comprehensive Backup Script for Curriculum Alignment System
# Supports PostgreSQL, S3 documents, configuration, and application data

set -e

# Configuration
ENVIRONMENT="${1:-development}"
BACKUP_TYPE="${2:-full}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-curriculum-alignment-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
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

# Backup Configuration
BACKUP_DIR="/tmp/curriculum-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="curriculum-alignment-${ENVIRONMENT}"
BACKUP_NAME="${BACKUP_PREFIX}-${BACKUP_TYPE}-${TIMESTAMP}"

# Compression and Encryption
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
ENABLE_ENCRYPTION="${ENABLE_ENCRYPTION:-true}"
PARALLEL_JOBS="${PARALLEL_JOBS:-$(nproc)}"

# Logging
LOG_FILE="/var/log/curriculum-backup.log"
ENABLE_DETAILED_LOGGING="${ENABLE_DETAILED_LOGGING:-true}"

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
    if [[ "$ENABLE_DETAILED_LOGGING" == "true" ]]; then
        echo "$message" >> "$LOG_FILE"
    fi
}

log_success() {
    local message="[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${GREEN}$message${NC}"
    if [[ "$ENABLE_DETAILED_LOGGING" == "true" ]]; then
        echo "$message" >> "$LOG_FILE"
    fi
}

log_warning() {
    local message="[WARNING] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${YELLOW}$message${NC}"
    if [[ "$ENABLE_DETAILED_LOGGING" == "true" ]]; then
        echo "$message" >> "$LOG_FILE"
    fi
}

log_error() {
    local message="[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${RED}$message${NC}" >&2
    if [[ "$ENABLE_DETAILED_LOGGING" == "true" ]]; then
        echo "$message" >> "$LOG_FILE"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("aws" "pg_dump" "psql" "gzip" "tar")
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
        log_warning "S3 bucket $S3_BACKUP_BUCKET not accessible, attempting to create..."
        if ! aws s3 mb "s3://$S3_BACKUP_BUCKET" --region "$AWS_REGION" --profile "$AWS_CLI_PROFILE"; then
            log_error "Failed to create S3 bucket: $S3_BACKUP_BUCKET"
            exit 1
        fi
        log_success "Created S3 bucket: $S3_BACKUP_BUCKET"
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check disk space
    local available_space
    available_space=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    local required_space=1048576 # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get database connection parameters from AWS Systems Manager
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

# Create database backup
backup_database() {
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}_database.sql"
    local compressed_file="${backup_file}.gz"
    
    log_info "Creating database backup..."
    log_info "Database: $DB_NAME on $DB_HOST"
    log_info "Output: $backup_file"
    
    # Create the backup with optimal settings
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --format=custom \
        --compress=0 \
        --jobs="$PARALLEL_JOBS" \
        --file="$backup_file.custom" \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='session_logs'; then
        
        # Also create a plain SQL backup for easier restore options
        pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --format=plain \
            --file="$backup_file" \
            --exclude-table-data='audit_logs' \
            --exclude-table-data='session_logs'
        
        # Compress the plain SQL backup
        log_info "Compressing database backup..."
        gzip -"$COMPRESSION_LEVEL" "$backup_file"
        
        # Get backup file sizes
        local custom_size
        local compressed_size
        custom_size=$(du -h "$backup_file.custom" | cut -f1)
        compressed_size=$(du -h "$compressed_file" | cut -f1)
        
        log_success "Database backup completed"
        log_info "Custom format backup: $backup_file.custom ($custom_size)"
        log_info "Compressed SQL backup: $compressed_file ($compressed_size)"
        
        # Verify backup integrity
        verify_database_backup "$backup_file.custom"
        
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Verify database backup integrity
verify_database_backup() {
    local backup_file="$1"
    
    log_info "Verifying database backup integrity..."
    
    if pg_restore --list "$backup_file" &> /dev/null; then
        local table_count
        table_count=$(pg_restore --list "$backup_file" | grep -c "TABLE DATA")
        log_success "Backup verification passed - $table_count tables found"
    else
        log_error "Backup verification failed"
        return 1
    fi
}

# Backup S3 documents and files
backup_s3_documents() {
    local s3_source_bucket="curriculum-alignment-documents-$ENVIRONMENT"
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}_s3_documents.tar.gz"
    local temp_dir="$BACKUP_DIR/s3_temp"
    
    log_info "Backing up S3 documents..."
    log_info "Source bucket: $s3_source_bucket"
    
    # Check if source bucket exists
    if ! aws s3 ls "s3://$s3_source_bucket" --profile "$AWS_CLI_PROFILE" &> /dev/null; then
        log_warning "S3 source bucket $s3_source_bucket not found, skipping document backup"
        return 0
    fi
    
    mkdir -p "$temp_dir"
    
    # Sync S3 bucket to local directory
    if aws s3 sync "s3://$s3_source_bucket" "$temp_dir" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION" \
        --exclude "*" \
        --include "*.pdf" \
        --include "*.doc*" \
        --include "*.txt" \
        --include "*.csv" \
        --include "*.json"; then
        
        # Create compressed archive
        log_info "Compressing document archive..."
        tar -czf "$backup_file" -C "$temp_dir" .
        
        # Clean up temporary directory
        rm -rf "$temp_dir"
        
        local archive_size
        archive_size=$(du -h "$backup_file" | cut -f1)
        log_success "S3 documents backup completed: $backup_file ($archive_size)"
    else
        log_error "Failed to backup S3 documents"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Backup application configuration
backup_configuration() {
    local config_file="$BACKUP_DIR/${BACKUP_NAME}_configuration.tar.gz"
    
    log_info "Backing up application configuration..."
    
    # Create temporary directory for config files
    local temp_config_dir="$BACKUP_DIR/config_temp"
    mkdir -p "$temp_config_dir"
    
    # Export environment-specific configuration from AWS Systems Manager
    log_info "Exporting configuration parameters..."
    aws ssm get-parameters-by-path \
        --path "/curriculum-alignment/$ENVIRONMENT" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION" \
        --recursive \
        --with-decryption \
        --query "Parameters[*].{Name:Name,Value:Value}" \
        --output json > "$temp_config_dir/ssm_parameters.json"
    
    # Export CloudFormation stack parameters if available
    local stack_name="curriculum-alignment-$ENVIRONMENT"
    if aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION" \
        --query "Stacks[0].{Parameters:Parameters,Outputs:Outputs}" \
        --output json > "$temp_config_dir/cloudformation_config.json" 2>/dev/null; then
        log_info "CloudFormation configuration exported"
    fi
    
    # Backup local configuration files if they exist
    local config_files=(
        "samconfig.toml"
        "template.yaml"
        ".env.$ENVIRONMENT"
        "infrastructure/config/${ENVIRONMENT}.json"
    )
    
    for config_file_path in "${config_files[@]}"; do
        if [[ -f "$config_file_path" ]]; then
            cp "$config_file_path" "$temp_config_dir/"
            log_info "Backed up configuration file: $config_file_path"
        fi
    done
    
    # Create configuration metadata
    cat > "$temp_config_dir/backup_metadata.json" << EOF
{
    "backup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "backup_type": "$BACKUP_TYPE",
    "aws_region": "$AWS_REGION",
    "database_host": "$DB_HOST",
    "database_name": "$DB_NAME"
}
EOF
    
    # Create compressed archive
    tar -czf "$config_file" -C "$temp_config_dir" .
    rm -rf "$temp_config_dir"
    
    local config_size
    config_size=$(du -h "$config_file" | cut -f1)
    log_success "Configuration backup completed: $config_file ($config_size)"
}

# Encrypt backup files
encrypt_backups() {
    if [[ "$ENABLE_ENCRYPTION" != "true" ]]; then
        log_info "Encryption disabled, skipping encryption step"
        return 0
    fi
    
    log_info "Encrypting backup files..."
    
    local files_to_encrypt=(
        "$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz"
        "$BACKUP_DIR/${BACKUP_NAME}_database.sql.custom"
        "$BACKUP_DIR/${BACKUP_NAME}_s3_documents.tar.gz"
        "$BACKUP_DIR/${BACKUP_NAME}_configuration.tar.gz"
    )
    
    for file in "${files_to_encrypt[@]}"; do
        if [[ -f "$file" ]]; then
            log_info "Encrypting: $(basename "$file")"
            
            # Encrypt using AWS KMS
            aws kms encrypt \
                --key-id "$ENCRYPTION_KEY_ID" \
                --plaintext fileb://"$file" \
                --profile "$AWS_CLI_PROFILE" \
                --region "$AWS_REGION" \
                --query "CiphertextBlob" \
                --output text | base64 --decode > "${file}.encrypted"
            
            # Remove unencrypted file
            rm "$file"
            mv "${file}.encrypted" "$file"
            
            log_success "Encrypted: $(basename "$file")"
        fi
    done
}

# Upload backups to S3
upload_to_s3() {
    log_info "Uploading backups to S3..."
    
    local s3_prefix="$ENVIRONMENT/$BACKUP_TYPE/$(date +%Y/%m/%d)"
    local upload_path="s3://$S3_BACKUP_BUCKET/$s3_prefix"
    
    log_info "S3 destination: $upload_path"
    
    # Upload all backup files
    for file in "$BACKUP_DIR"/${BACKUP_NAME}_*; do
        if [[ -f "$file" ]]; then
            local filename
            filename=$(basename "$file")
            local s3_key="$s3_prefix/$filename"
            
            log_info "Uploading: $filename"
            
            if aws s3 cp "$file" "s3://$S3_BACKUP_BUCKET/$s3_key" \
                --profile "$AWS_CLI_PROFILE" \
                --region "$AWS_REGION" \
                --storage-class STANDARD_IA \
                --metadata "Environment=$ENVIRONMENT,BackupType=$BACKUP_TYPE,Timestamp=$TIMESTAMP"; then
                
                log_success "Uploaded: $filename"
                
                # Remove local file after successful upload
                rm "$file"
            else
                log_error "Failed to upload: $filename"
                return 1
            fi
        fi
    done
    
    log_success "All backups uploaded to S3"
}

# Create backup manifest
create_backup_manifest() {
    local manifest_file="$BACKUP_DIR/${BACKUP_NAME}_manifest.json"
    
    log_info "Creating backup manifest..."
    
    cat > "$manifest_file" << EOF
{
    "backup_name": "$BACKUP_NAME",
    "environment": "$ENVIRONMENT",
    "backup_type": "$BACKUP_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": {
        "host": "$DB_HOST",
        "port": "$DB_PORT",
        "name": "$DB_NAME",
        "backup_format": "custom+sql"
    },
    "s3_backup_bucket": "$S3_BACKUP_BUCKET",
    "encryption_enabled": "$ENABLE_ENCRYPTION",
    "compression_level": "$COMPRESSION_LEVEL",
    "files": [
        "${BACKUP_NAME}_database.sql.gz",
        "${BACKUP_NAME}_database.sql.custom",
        "${BACKUP_NAME}_s3_documents.tar.gz",
        "${BACKUP_NAME}_configuration.tar.gz"
    ],
    "retention_days": "$BACKUP_RETENTION_DAYS",
    "aws_region": "$AWS_REGION"
}
EOF
    
    # Upload manifest to S3
    local s3_prefix="$ENVIRONMENT/$BACKUP_TYPE/$(date +%Y/%m/%d)"
    aws s3 cp "$manifest_file" "s3://$S3_BACKUP_BUCKET/$s3_prefix/$(basename "$manifest_file")" \
        --profile "$AWS_CLI_PROFILE" \
        --region "$AWS_REGION"
    
    rm "$manifest_file"
    log_success "Backup manifest created and uploaded"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    local cutoff_date
    cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d)
    
    # List and delete old backups
    aws s3api list-objects-v2 \
        --bucket "$S3_BACKUP_BUCKET" \
        --prefix "$ENVIRONMENT/$BACKUP_TYPE/" \
        --profile "$AWS_CLI_PROFILE" \
        --query "Contents[?LastModified<='$cutoff_date'].Key" \
        --output text | \
    while IFS=$'\t' read -r key; do
        if [[ -n "$key" ]]; then
            log_info "Deleting old backup: $key"
            aws s3 rm "s3://$S3_BACKUP_BUCKET/$key" \
                --profile "$AWS_CLI_PROFILE" \
                --region "$AWS_REGION"
        fi
    done
    
    log_success "Old backup cleanup completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send SNS notification if topic is configured
    local sns_topic_arn="${BACKUP_NOTIFICATION_TOPIC_ARN}"
    
    if [[ -n "$sns_topic_arn" ]]; then
        local subject="Curriculum Alignment Backup - $status"
        
        aws sns publish \
            --topic-arn "$sns_topic_arn" \
            --subject "$subject" \
            --message "$message" \
            --profile "$AWS_CLI_PROFILE" \
            --region "$AWS_REGION" &> /dev/null || true
    fi
}

# Main backup function
main_backup() {
    local start_time
    start_time=$(date +%s)
    
    log_info "Starting backup process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Backup name: $BACKUP_NAME"
    
    # Execute backup steps
    check_prerequisites
    get_database_credentials
    test_database_connection
    
    case "$BACKUP_TYPE" in
        "full")
            backup_database
            backup_s3_documents
            backup_configuration
            ;;
        "database")
            backup_database
            ;;
        "documents")
            backup_s3_documents
            ;;
        "config")
            backup_configuration
            ;;
        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac
    
    encrypt_backups
    upload_to_s3
    create_backup_manifest
    cleanup_old_backups
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Backup completed successfully in ${duration} seconds"
    
    # Send success notification
    local notification_message="Backup completed successfully for environment: $ENVIRONMENT
Backup type: $BACKUP_TYPE
Duration: ${duration} seconds
S3 location: s3://$S3_BACKUP_BUCKET/$ENVIRONMENT/$BACKUP_TYPE/$(date +%Y/%m/%d)"
    
    send_notification "SUCCESS" "$notification_message"
}

# Error handler
error_handler() {
    local exit_code=$?
    log_error "Backup failed with exit code: $exit_code"
    
    # Clean up temporary files
    rm -rf "$BACKUP_DIR"/${BACKUP_NAME}_*
    
    # Send failure notification
    local notification_message="Backup failed for environment: $ENVIRONMENT
Backup type: $BACKUP_TYPE
Exit code: $exit_code
Please check logs for details: $LOG_FILE"
    
    send_notification "FAILURE" "$notification_message"
    
    exit $exit_code
}

# Set error handler
trap error_handler ERR

# Show usage
usage() {
    echo "Usage: $0 <environment> <backup_type>"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (development, staging, production)"
    echo "  backup_type    Type of backup (full, database, documents, config)"
    echo ""
    echo "Environment Variables:"
    echo "  S3_BACKUP_BUCKET           S3 bucket for backups"
    echo "  BACKUP_RETENTION_DAYS      Backup retention period (default: 30)"
    echo "  ENCRYPTION_KEY_ID          AWS KMS key for encryption"
    echo "  ENABLE_ENCRYPTION          Enable backup encryption (default: true)"
    echo "  COMPRESSION_LEVEL          Compression level 1-9 (default: 6)"
    echo "  PARALLEL_JOBS              Parallel jobs for pg_dump (default: nproc)"
    echo ""
    echo "Examples:"
    echo "  $0 production full"
    echo "  $0 staging database"
    echo "  S3_BACKUP_BUCKET=my-backup-bucket $0 development full"
}

# Main execution
if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

case "$1" in
    development|staging|production)
        case "$2" in
            full|database|documents|config)
                main_backup
                ;;
            *)
                echo "Invalid backup type: $2"
                usage
                exit 1
                ;;
        esac
        ;;
    --help|-h)
        usage
        exit 0
        ;;
    *)
        echo "Invalid environment: $1"
        usage
        exit 1
        ;;
esac