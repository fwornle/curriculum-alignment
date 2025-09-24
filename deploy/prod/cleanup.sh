#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Production Environment Cleanup Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="prod"
STACK_NAME="curriculum-alignment-prod"
REGION="eu-central-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Logging
LOG_FILE="$SCRIPT_DIR/cleanup.log"
CLEANUP_START_TIME=$(date)

log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}ℹ️  $message${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}✅ $message${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${YELLOW}⚠️  $message${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${RED}❌ $message${NC}" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "\n${BOLD}${CYAN}🚀 $1${NC}" | tee -a "$LOG_FILE"
}

# Enhanced confirmation for production cleanup
confirm_production_cleanup() {
    echo -e "${BOLD}${RED}🚨 CRITICAL WARNING: PRODUCTION ENVIRONMENT CLEANUP 🚨${NC}"
    echo ""
    echo -e "${RED}YOU ARE ABOUT TO PERMANENTLY DELETE THE PRODUCTION ENVIRONMENT!${NC}"
    echo ""
    echo -e "${YELLOW}This will IRREVERSIBLY destroy:${NC}"
    echo "• All production data and databases"
    echo "• All user accounts and authentication"
    echo "• All uploaded documents and files"
    echo "• All system configurations"
    echo "• All monitoring and logging history"
    echo "• All backup data (unless stored externally)"
    echo "• Production API endpoints (will cause downtime)"
    echo ""
    echo -e "${BOLD}Production Environment Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Account:${NC} $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Unknown')"
    echo ""
    
    if [ "$1" != "--force" ]; then
        echo -e "${BOLD}${RED}SAFETY CONFIRMATION REQUIRED${NC}"
        echo ""
        echo "To proceed with production cleanup, you must:"
        echo "1. Type the exact phrase: 'DELETE PRODUCTION ENVIRONMENT'"
        echo "2. Confirm you have proper authorization"
        echo "3. Confirm you have recent backups if data recovery is needed"
        echo ""
        
        read -p "Enter confirmation phrase: " confirmation
        if [ "$confirmation" != "DELETE PRODUCTION ENVIRONMENT" ]; then
            echo "Production cleanup cancelled - incorrect confirmation phrase."
            exit 0
        fi
        
        echo ""
        read -p "Do you have proper authorization to delete production? (yes/no): " auth_confirm
        if [ "$auth_confirm" != "yes" ]; then
            echo "Production cleanup cancelled - authorization not confirmed."
            exit 0
        fi
        
        echo ""
        read -p "Do you have recent backups if data recovery is needed? (yes/no): " backup_confirm
        if [ "$backup_confirm" != "yes" ]; then
            echo "Production cleanup cancelled - backups not confirmed."
            echo "Please ensure you have recent backups before proceeding."
            exit 0
        fi
        
        echo ""
        echo -e "${RED}FINAL WARNING: This action cannot be undone!${NC}"
        read -p "Type 'PROCEED' to continue: " final_confirm
        if [ "$final_confirm" != "PROCEED" ]; then
            echo "Production cleanup cancelled."
            exit 0
        fi
    fi
    
    echo ""
    log_info "Starting PRODUCTION environment cleanup..."
    log_warning "THIS IS A DESTRUCTIVE OPERATION!"
}

# Enhanced prerequisites for production cleanup
check_production_cleanup_prerequisites() {
    log_step "Checking Production Cleanup Prerequisites"
    
    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Verify we're in the correct account
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    log_info "Operating in AWS Account: $account_id"
    
    # Check if stack exists
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    
    if [ "$STACK_STATUS" = "STACK_NOT_EXISTS" ]; then
        log_info "Stack $STACK_NAME does not exist in production. Nothing to clean up."
        exit 0
    fi
    
    # Warn if stack is in a problematic state
    if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
        log_warning "Stack is currently in progress state: $STACK_STATUS"
        log_warning "Cleanup may fail if stack operations are ongoing."
        sleep 5
    fi
    
    log_info "Found production stack $STACK_NAME with status: $STACK_STATUS"
    log_success "Production cleanup prerequisites verified"
}

# Create final backup before destruction
create_final_backup() {
    log_step "Creating Final Production Backup"
    
    if [ -f "$PROJECT_ROOT/scripts/backup.sh" ]; then
        log_info "Creating final backup before production cleanup..."
        
        # Create timestamped backup
        local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
        local backup_name="final-backup-before-cleanup-$backup_timestamp"
        
        # Set environment variables for the backup
        export BACKUP_NAME_PREFIX="$backup_name"
        
        if "$PROJECT_ROOT/scripts/backup.sh" prod full; then
            log_success "Final backup created successfully"
            log_info "Backup identifier: $backup_name"
        else
            log_error "Final backup failed!"
            echo ""
            echo -e "${RED}CRITICAL: Final backup failed!${NC}"
            echo "Do you want to continue with cleanup without a backup?"
            echo "This could result in permanent data loss!"
            echo ""
            read -p "Continue anyway? (type 'CONTINUE' to proceed): " backup_fail_confirm
            if [ "$backup_fail_confirm" != "CONTINUE" ]; then
                log_info "Production cleanup cancelled due to backup failure."
                exit 1
            fi
        fi
    else
        log_warning "Backup script not found - proceeding without final backup"
        echo ""
        echo -e "${YELLOW}Warning: No backup script available!${NC}"
        echo "Proceeding without creating a final backup."
        read -p "Are you sure? (type 'YES' to continue): " no_backup_confirm
        if [ "$no_backup_confirm" != "YES" ]; then
            log_info "Production cleanup cancelled - no backup available."
            exit 1
        fi
    fi
}

# Get comprehensive resource inventory
get_production_resource_inventory() {
    log_step "Gathering Production Resource Inventory"
    
    # Get all stack resources
    local stack_resources=$(aws cloudformation describe-stack-resources --stack-name "$STACK_NAME" --region "$REGION" --output json 2>/dev/null || echo '{"StackResources":[]}')
    
    # Get stack outputs
    local stack_outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    
    # Get S3 buckets from outputs and resources
    local s3_buckets=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null | grep -v null || true)
    if [ -z "$s3_buckets" ]; then
        s3_buckets=$(echo "$stack_resources" | jq -r '.StackResources[] | select(.ResourceType=="AWS::S3::Bucket") | .PhysicalResourceId' 2>/dev/null || true)
    fi
    
    # Get Lambda functions
    local lambda_functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-prod')].FunctionName" --output text 2>/dev/null || echo "")
    
    # Get DynamoDB tables
    local dynamodb_tables=$(echo "$stack_resources" | jq -r '.StackResources[] | select(.ResourceType=="AWS::DynamoDB::Table") | .PhysicalResourceId' 2>/dev/null || true)
    
    # Get CloudWatch log groups
    local log_groups=$(aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "/aws/lambda/curriculum-alignment-prod" --query 'logGroups[].logGroupName' --output text 2>/dev/null || echo "")
    
    # Get API Gateway APIs
    local api_gateways=$(echo "$stack_resources" | jq -r '.StackResources[] | select(.ResourceType=="AWS::ApiGateway::RestApi") | .PhysicalResourceId' 2>/dev/null || true)
    
    # Get CloudWatch alarms
    local cw_alarms=$(aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --region "$REGION" --query 'MetricAlarms[].AlarmName' --output text 2>/dev/null || echo "")
    
    # Save comprehensive inventory
    cat > "$SCRIPT_DIR/production-resource-inventory.json" << EOF
{
    "cleanup_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "stack_name": "$STACK_NAME",
    "stack_status": "$STACK_STATUS",
    "region": "$REGION",
    "account_id": "$(aws sts get-caller-identity --query Account --output text)",
    "stack_resources": $stack_resources,
    "stack_outputs": $stack_outputs,
    "s3_buckets": $(echo "$s3_buckets" | jq -R -s 'split("\n") | map(select(. != ""))'),
    "lambda_functions": $(echo "$lambda_functions" | tr ' ' '\n' | jq -R -s 'split("\n") | map(select(. != ""))'),
    "dynamodb_tables": $(echo "$dynamodb_tables" | jq -R -s 'split("\n") | map(select(. != ""))'),
    "log_groups": $(echo "$log_groups" | tr '\t' '\n' | jq -R -s 'split("\n") | map(select(. != ""))'),
    "api_gateways": $(echo "$api_gateways" | jq -R -s 'split("\n") | map(select(. != ""))'),
    "cloudwatch_alarms": $(echo "$cw_alarms" | tr '\t' '\n' | jq -R -s 'split("\n") | map(select(. != ""))')
}
EOF
    
    # Display inventory summary
    local bucket_count=$(echo "$s3_buckets" | wc -l)
    local function_count=$(echo "$lambda_functions" | wc -w)
    local table_count=$(echo "$dynamodb_tables" | wc -l)
    local log_count=$(echo "$log_groups" | wc -w)
    
    log_info "Production Resource Inventory:"
    log_info "• S3 Buckets: $bucket_count"
    log_info "• Lambda Functions: $function_count"
    log_info "• DynamoDB Tables: $table_count"
    log_info "• CloudWatch Log Groups: $log_count"
    
    log_success "Resource inventory completed and saved"
}

# Cleanup production S3 buckets with extra safety
cleanup_production_s3() {
    log_step "Cleaning Production S3 Buckets"
    
    if [ -n "$s3_buckets" ]; then
        echo "$s3_buckets" | while IFS= read -r bucket; do
            if [ -n "$bucket" ]; then
                log_info "Processing production bucket: $bucket"
                
                # Get bucket size and object count
                local bucket_info=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | tail -2 || echo "")
                local object_count=$(echo "$bucket_info" | grep "Total Objects:" | awk '{print $3}' || echo "0")
                local total_size=$(echo "$bucket_info" | grep "Total Size:" | awk '{print $3}' || echo "0")
                
                log_warning "Bucket $bucket contains $object_count objects ($total_size bytes)"
                
                # Extra confirmation for large buckets
                if [ "$object_count" -gt 1000 ] || [ "$total_size" -gt 1073741824 ]; then  # > 1GB
                    echo -e "${YELLOW}Large bucket detected: $bucket${NC}"
                    echo "Objects: $object_count, Size: $total_size bytes"
                    read -p "Confirm deletion of this large bucket? (type 'DELETE'): " large_bucket_confirm
                    if [ "$large_bucket_confirm" != "DELETE" ]; then
                        log_info "Skipping bucket $bucket"
                        continue
                    fi
                fi
                
                # Delete all versions and delete markers (versioned buckets)
                aws s3api list-object-versions --bucket "$bucket" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text 2>/dev/null | while read -r key version; do
                    if [ -n "$key" ] && [ -n "$version" ]; then
                        aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$version" >/dev/null 2>&1 || true
                    fi
                done
                
                # Delete all delete markers
                aws s3api list-object-versions --bucket "$bucket" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output text 2>/dev/null | while read -r key version; do
                    if [ -n "$key" ] && [ -n "$version" ]; then
                        aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$version" >/dev/null 2>&1 || true
                    fi
                done
                
                # Delete all objects (current versions)
                aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true
                
                log_success "Cleaned production bucket: $bucket"
            fi
        done
    else
        log_info "No S3 buckets found to clean"
    fi
}

# Cleanup production monitoring and alarms
cleanup_production_monitoring() {
    log_step "Cleaning Production Monitoring"
    
    # Delete CloudWatch alarms
    if [ -n "$cw_alarms" ]; then
        echo "$cw_alarms" | tr '\t' '\n' | while IFS= read -r alarm; do
            if [ -n "$alarm" ]; then
                log_info "Deleting alarm: $alarm"
                aws cloudwatch delete-alarms --alarm-names "$alarm" --region "$REGION" >/dev/null 2>&1 || log_warning "Failed to delete alarm: $alarm"
            fi
        done
    fi
    
    # Delete CloudWatch dashboard
    local dashboard_name="CurriculumAlignment-Production"
    aws cloudwatch delete-dashboards --dashboard-names "$dashboard_name" --region "$REGION" >/dev/null 2>&1 || true
    
    log_success "Production monitoring cleanup completed"
}

# Delete production CloudWatch logs
cleanup_production_logs() {
    log_step "Cleaning Production CloudWatch Logs"
    
    if [ -n "$log_groups" ]; then
        echo "$log_groups" | tr '\t' '\n' | while IFS= read -r log_group; do
            if [ -n "$log_group" ]; then
                log_info "Deleting production log group: $log_group"
                
                # Get log group info
                local log_size=$(aws logs describe-log-groups --log-group-name-prefix "$log_group" --region "$REGION" --query 'logGroups[0].storedBytes' --output text 2>/dev/null || echo "0")
                log_info "Log group $log_group size: $log_size bytes"
                
                aws logs delete-log-group --log-group-name "$log_group" --region "$REGION" >/dev/null 2>&1 || log_warning "Failed to delete log group: $log_group"
            fi
        done
        log_success "Production CloudWatch logs cleanup completed"
    else
        log_info "No production CloudWatch log groups found to clean"
    fi
}

# Delete production CloudFormation stack
delete_production_stack() {
    log_step "Deleting Production CloudFormation Stack"
    
    log_warning "Initiating production stack deletion: $STACK_NAME"
    
    # Final confirmation before stack deletion
    echo -e "${RED}FINAL CONFIRMATION: About to delete production CloudFormation stack${NC}"
    echo "This will delete ALL remaining AWS resources in the production environment."
    echo ""
    read -p "Type 'DELETE STACK' to proceed: " stack_delete_confirm
    if [ "$stack_delete_confirm" != "DELETE STACK" ]; then
        log_info "Production stack deletion cancelled."
        exit 1
    fi
    
    # Initiate stack deletion
    if aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"; then
        log_success "Production stack deletion initiated"
        
        # Wait for stack deletion with progress updates
        log_info "Waiting for production stack deletion to complete..."
        log_warning "This may take 10-30 minutes depending on resources..."
        
        local max_wait=3600  # 60 minutes
        local wait_time=0
        local check_interval=60  # Check every minute
        
        while [ $wait_time -lt $max_wait ]; do
            local current_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DELETE_COMPLETE")
            
            case "$current_status" in
                "DELETE_COMPLETE"|"STACK_NOT_EXISTS")
                    log_success "Production stack deleted successfully"
                    return 0
                    ;;
                "DELETE_FAILED")
                    log_error "Production stack deletion failed!"
                    
                    # Get failure details
                    log_info "Getting stack events for failure analysis..."
                    aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --region "$REGION" --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatusReason]' --output table || true
                    
                    echo ""
                    echo -e "${RED}Production stack deletion failed!${NC}"
                    echo "Some resources may need manual cleanup."
                    echo "Check the CloudFormation console for detailed error information."
                    return 1
                    ;;
                "DELETE_IN_PROGRESS")
                    local elapsed_min=$((wait_time / 60))
                    echo -n "⏳ Deleting production stack... (${elapsed_min}m elapsed)"
                    ;;
                *)
                    log_warning "Stack status: $current_status"
                    ;;
            esac
            
            sleep $check_interval
            wait_time=$((wait_time + check_interval))
        done
        
        log_error "Stack deletion timed out after $((max_wait / 60)) minutes"
        return 1
        
    else
        log_error "Failed to initiate production stack deletion"
        return 1
    fi
}

# Verify complete production cleanup
verify_production_cleanup() {
    log_step "Verifying Complete Production Cleanup"
    
    local verification_issues=0
    
    # Check CloudFormation stack
    local remaining_stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    
    if [ "$remaining_stack_status" = "STACK_NOT_EXISTS" ]; then
        log_success "CloudFormation stack completely removed"
    else
        log_error "Stack still exists with status: $remaining_stack_status"
        verification_issues=$((verification_issues + 1))
    fi
    
    # Check Lambda functions
    local remaining_functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-prod')].FunctionName" --output text 2>/dev/null || echo "")
    
    if [ -z "$remaining_functions" ]; then
        log_success "All production Lambda functions removed"
    else
        log_warning "Some Lambda functions may still exist: $remaining_functions"
        verification_issues=$((verification_issues + 1))
    fi
    
    # Check S3 buckets (they should be deleted by stack deletion, but verify)
    if [ -n "$s3_buckets" ]; then
        echo "$s3_buckets" | while IFS= read -r bucket; do
            if [ -n "$bucket" ]; then
                if aws s3 ls "s3://$bucket" >/dev/null 2>&1; then
                    log_warning "S3 bucket still exists: $bucket"
                    verification_issues=$((verification_issues + 1))
                else
                    log_success "S3 bucket removed: $bucket"
                fi
            fi
        done
    fi
    
    # Check CloudWatch alarms
    local remaining_alarms=$(aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --region "$REGION" --query 'MetricAlarms[].AlarmName' --output text 2>/dev/null || echo "")
    
    if [ -z "$remaining_alarms" ]; then
        log_success "All production CloudWatch alarms removed"
    else
        log_warning "Some CloudWatch alarms may still exist: $remaining_alarms"
    fi
    
    # Summary
    if [ $verification_issues -eq 0 ]; then
        log_success "Production cleanup verification PASSED"
        return 0
    else
        log_warning "Production cleanup verification found $verification_issues issues"
        log_warning "Manual cleanup of remaining resources may be required"
        return 1
    fi
}

# Display production cleanup summary
display_production_cleanup_summary() {
    log_step "Production Cleanup Summary"
    
    echo -e "${BOLD}${RED}🔥 PRODUCTION ENVIRONMENT DESTROYED 🔥${NC}"
    echo ""
    echo -e "${BOLD}Cleanup Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT (DESTROYED)"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME (DELETED)"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Cleanup Completed:${NC} $(date)"
    echo -e "${CYAN}• Account:${NC} $(aws sts get-caller-identity --query Account --output text 2>/dev/null)"
    echo ""
    
    if [ -f "$SCRIPT_DIR/production-resource-inventory.json" ]; then
        echo -e "${BOLD}Resources That Were Destroyed:${NC}"
        
        local bucket_count=$(cat "$SCRIPT_DIR/production-resource-inventory.json" | jq -r '.s3_buckets | length')
        local function_count=$(cat "$SCRIPT_DIR/production-resource-inventory.json" | jq -r '.lambda_functions | length')
        local table_count=$(cat "$SCRIPT_DIR/production-resource-inventory.json" | jq -r '.dynamodb_tables | length')
        local log_count=$(cat "$SCRIPT_DIR/production-resource-inventory.json" | jq -r '.log_groups | length')
        
        echo -e "${CYAN}• S3 Buckets Destroyed:${NC} $bucket_count"
        echo -e "${CYAN}• Lambda Functions Deleted:${NC} $function_count"
        echo -e "${CYAN}• DynamoDB Tables Deleted:${NC} $table_count"
        echo -e "${CYAN}• CloudWatch Log Groups Deleted:${NC} $log_count"
        echo -e "${CYAN}• All API Gateway Endpoints:${NC} DELETED"
        echo -e "${CYAN}• All IAM Roles and Policies:${NC} DELETED"
        echo -e "${CYAN}• All CloudWatch Alarms:${NC} DELETED"
        echo -e "${CYAN}• All Monitoring Dashboards:${NC} DELETED"
        echo ""
    fi
    
    echo -e "${BOLD}⚠️  CRITICAL POST-CLEANUP ACTIONS:${NC}"
    echo ""
    echo -e "${CYAN}1. Notify stakeholders:${NC}"
    echo "   • Production system is completely offline"
    echo "   • All user data has been destroyed"
    echo "   • All production URLs are now inactive"
    echo ""
    echo -e "${CYAN}2. Update DNS and domain settings:${NC}"
    echo "   • Remove or redirect production domain"
    echo "   • Update any external integrations"
    echo ""
    echo -e "${CYAN}3. Financial cleanup:${NC}"
    echo "   • All recurring AWS charges have stopped"
    echo "   • Verify no unexpected charges appear"
    echo "   • Cancel any related subscriptions"
    echo ""
    echo -e "${CYAN}4. Documentation updates:${NC}"
    echo "   • Mark production environment as decommissioned"
    echo "   • Update system architecture docs"
    echo "   • Archive production runbooks"
    echo ""
    echo -e "${CYAN}5. Team notification:${NC}"
    echo "   • Inform development and operations teams"
    echo "   • Update incident response procedures"
    echo "   • Archive production access credentials"
    echo ""
    
    echo -e "${YELLOW}📋 Recovery Information:${NC}"
    echo "• Resource inventory: $SCRIPT_DIR/production-resource-inventory.json"
    echo "• Cleanup log: $LOG_FILE"
    echo "• To redeploy: Create new environment from scratch"
    echo "• Data recovery: Use backups created before cleanup"
    echo ""
    
    echo -e "${GREEN}✅ Production environment cleanup completed successfully${NC}"
    echo ""
    echo -e "${BOLD}The Curriculum Alignment System production environment${NC}"
    echo -e "${BOLD}has been completely removed from AWS.${NC}"
    echo ""
}

# Error handling for production cleanup
cleanup_on_error() {
    log_error "Production cleanup failed. Check $LOG_FILE for details."
    echo ""
    echo -e "${RED}CRITICAL: Production cleanup encountered errors!${NC}"
    echo ""
    echo -e "${YELLOW}Immediate actions required:${NC}"
    echo "1. Check the cleanup log: $LOG_FILE"
    echo "2. Review AWS CloudFormation console for stack status"
    echo "3. Manually verify and clean up any remaining resources"
    echo "4. Check for partially deleted resources that may incur costs"
    echo ""
    echo -e "${YELLOW}Resources that may need manual cleanup:${NC}"
    echo "• CloudFormation stack (if deletion failed)"
    echo "• S3 buckets with versioning or MFA delete"
    echo "• RDS instances with deletion protection"
    echo "• VPC resources (if custom VPC was used)"
    echo "• Route53 hosted zones and records"
    echo "• CloudWatch alarms and dashboards"
    echo ""
    echo "Resource inventory saved in: $SCRIPT_DIR/production-resource-inventory.json"
    exit 1
}

# Main production cleanup function
main() {
    # Setup error handling
    trap cleanup_on_error ERR
    
    # Display header
    echo -e "${BOLD}${RED}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              Multi-Agent Curriculum Alignment System (MACAS)                ║
║                                                                              ║
║                        PRODUCTION CLEANUP                                   ║
║                                                                              ║
║                    🚨 DESTRUCTIVE OPERATION 🚨                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_info "Starting PRODUCTION cleanup at $CLEANUP_START_TIME"
    log_warning "THIS WILL PERMANENTLY DESTROY THE PRODUCTION ENVIRONMENT!"
    
    # Get multiple confirmations
    confirm_production_cleanup "$1"
    
    # Run cleanup steps
    check_production_cleanup_prerequisites
    create_final_backup
    get_production_resource_inventory
    cleanup_production_s3
    cleanup_production_monitoring
    cleanup_production_logs
    delete_production_stack
    verify_production_cleanup
    display_production_cleanup_summary
    
    local cleanup_end_time=$(date)
    log_success "PRODUCTION cleanup completed at $cleanup_end_time"
    
    # Calculate cleanup time
    local start_seconds=$(date -d "$CLEANUP_START_TIME" +%s 2>/dev/null || date -j -f "%a %b %d %T %Z %Y" "$CLEANUP_START_TIME" +%s 2>/dev/null || echo 0)
    local end_seconds=$(date +%s)
    local duration=$((end_seconds - start_seconds))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    echo -e "${BOLD}${RED}💀 Total PRODUCTION cleanup time: ${duration_min}m ${duration_sec}s${NC}"
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Production Cleanup"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --force        Skip confirmation prompts (EXTREMELY DANGEROUS)"
    echo ""
    echo "⚠️  CRITICAL WARNING: This script permanently destroys the production environment!"
    echo ""
    echo "This script will:"
    echo "1. Require multiple safety confirmations"
    echo "2. Create a final backup (if backup system is available)"
    echo "3. Inventory all production resources"
    echo "4. Clean all S3 buckets completely"
    echo "5. Delete all CloudWatch logs and alarms"
    echo "6. Delete the CloudFormation stack and ALL resources"
    echo "7. Verify complete removal of all components"
    echo ""
    echo "💀 WHAT WILL BE PERMANENTLY DESTROYED:"
    echo "• All production data and databases"
    echo "• All user accounts and authentication systems"
    echo "• All uploaded documents and files"
    echo "• All system configurations and settings"
    echo "• All API endpoints (causing immediate downtime)"
    echo "• All monitoring and logging history"
    echo "• All AWS resources and infrastructure"
    echo ""
    echo "⚡ IMMEDIATE EFFECTS:"
    echo "• Production system will be completely offline"
    echo "• All production URLs will return errors"
    echo "• All user data will be permanently lost"
    echo "• All AWS costs will stop immediately"
    echo ""
    echo "📋 REQUIREMENTS:"
    echo "• AWS CLI with full production account access"
    echo "• Proper authorization from system owners"
    echo "• Recent backups if data recovery might be needed"
    echo "• Stakeholder notification before execution"
    echo ""
    echo "🔄 TO RECOVER:"
    echo "• Complete redeployment from source code required"
    echo "• Data restoration from external backups only"
    echo "• Full system reconfiguration needed"
    echo ""
    exit 0
fi

# Run main production cleanup
main "$@"