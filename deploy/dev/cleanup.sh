#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Development Environment Cleanup Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="dev"
STACK_NAME="curriculum-alignment-dev"
REGION="eu-central-1"

# Always use tanfra AWS profile for this project
export AWS_PROFILE=tanfra

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

# Confirmation prompt
confirm_cleanup() {
    echo -e "${BOLD}${RED}⚠️  WARNING: This will DELETE all resources in the development environment!${NC}"
    echo ""
    echo -e "${YELLOW}Resources to be deleted:${NC}"
    echo "• CloudFormation stack: $STACK_NAME"
    echo "• All Lambda functions"
    echo "• API Gateway"
    echo "• S3 buckets (with all contents)"
    echo "• DynamoDB tables"
    echo "• CloudWatch logs"
    echo "• IAM roles and policies"
    echo "• All associated resources"
    echo ""
    
    if [ "$1" != "--force" ]; then
        read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "Cleanup cancelled."
            exit 0
        fi
    fi
    
    echo ""
    log_info "Starting cleanup of development environment..."
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
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
    
    # Check if stack exists
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    
    if [ "$STACK_STATUS" = "STACK_NOT_EXISTS" ]; then
        log_info "Stack $STACK_NAME does not exist. Nothing to clean up."
        exit 0
    fi
    
    log_info "Found stack $STACK_NAME with status: $STACK_STATUS"
    log_success "Prerequisites check completed"
}

# Get stack resources before deletion
get_stack_resources() {
    log_step "Gathering Stack Resources"
    
    # Get stack outputs for cleanup reference
    STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    
    # Get S3 buckets from outputs
    S3_BUCKETS=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null | grep -v null || true)
    
    # Get Lambda functions
    LAMBDA_FUNCTIONS=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-dev')].FunctionName" --output text 2>/dev/null || echo "")
    
    # Get CloudWatch log groups
    LOG_GROUPS=$(aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "/aws/lambda/curriculum-alignment-dev" --query 'logGroups[].logGroupName' --output text 2>/dev/null || echo "")
    
    # Save resource information
    cat > "$SCRIPT_DIR/resources-to-cleanup.json" << EOF
{
    "stack_name": "$STACK_NAME",
    "stack_status": "$STACK_STATUS",
    "s3_buckets": $(echo "$S3_BUCKETS" | jq -R -s 'split("\n") | map(select(. != ""))'),
    "lambda_functions": $(echo "$LAMBDA_FUNCTIONS" | tr ' ' '\n' | jq -R -s 'split("\n") | map(select(. != ""))'),
    "log_groups": $(echo "$LOG_GROUPS" | tr '\t' '\n' | jq -R -s 'split("\n") | map(select(. != ""))')
}
EOF
    
    log_success "Resource inventory completed"
}

# Clean S3 buckets
cleanup_s3_buckets() {
    log_step "Cleaning S3 Buckets"
    
    if [ -n "$S3_BUCKETS" ]; then
        echo "$S3_BUCKETS" | while IFS= read -r bucket; do
            if [ -n "$bucket" ]; then
                log_info "Cleaning bucket: $bucket"
                
                # Delete all versions and delete markers
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
                
                # Delete all objects (in case versioning is disabled)
                aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true
                
                log_success "Cleaned bucket: $bucket"
            fi
        done
    else
        log_info "No S3 buckets found to clean"
    fi
}

# Delete CloudWatch logs
cleanup_cloudwatch_logs() {
    log_step "Cleaning CloudWatch Logs"
    
    if [ -n "$LOG_GROUPS" ]; then
        echo "$LOG_GROUPS" | tr '\t' '\n' | while IFS= read -r log_group; do
            if [ -n "$log_group" ]; then
                log_info "Deleting log group: $log_group"
                aws logs delete-log-group --log-group-name "$log_group" --region "$REGION" >/dev/null 2>&1 || log_warning "Failed to delete log group: $log_group"
            fi
        done
        log_success "CloudWatch logs cleanup completed"
    else
        log_info "No CloudWatch log groups found to clean"
    fi
}

# Delete CloudFormation stack
delete_stack() {
    log_step "Deleting CloudFormation Stack"
    
    log_info "Deleting stack: $STACK_NAME"
    
    # Initiate stack deletion
    if aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"; then
        log_success "Stack deletion initiated"
        
        # Wait for stack deletion to complete
        log_info "Waiting for stack deletion to complete..."
        
        local max_wait=1800  # 30 minutes
        local wait_time=0
        local check_interval=30
        
        while [ $wait_time -lt $max_wait ]; do
            STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DELETE_COMPLETE")
            
            if [ "$STACK_STATUS" = "DELETE_COMPLETE" ] || [ "$STACK_STATUS" = "STACK_NOT_EXISTS" ]; then
                log_success "Stack deleted successfully"
                break
            elif [ "$STACK_STATUS" = "DELETE_FAILED" ]; then
                log_error "Stack deletion failed. Check CloudFormation console for details."
                break
            else
                echo -n "."
                sleep $check_interval
                wait_time=$((wait_time + check_interval))
            fi
        done
        
        if [ $wait_time -ge $max_wait ]; then
            log_warning "Stack deletion is taking longer than expected. Check CloudFormation console."
        fi
        
    else
        log_error "Failed to initiate stack deletion"
        exit 1
    fi
}

# Verify cleanup completion
verify_cleanup() {
    log_step "Verifying Cleanup Completion"
    
    # Check if stack still exists
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    
    if [ "$STACK_STATUS" = "STACK_NOT_EXISTS" ]; then
        log_success "CloudFormation stack successfully deleted"
    else
        log_warning "Stack still exists with status: $STACK_STATUS"
    fi
    
    # Check for remaining Lambda functions
    REMAINING_FUNCTIONS=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-dev')].FunctionName" --output text 2>/dev/null || echo "")
    
    if [ -z "$REMAINING_FUNCTIONS" ]; then
        log_success "All Lambda functions deleted"
    else
        log_warning "Some Lambda functions may still exist: $REMAINING_FUNCTIONS"
    fi
    
    # Check for remaining log groups
    REMAINING_LOGS=$(aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "/aws/lambda/curriculum-alignment-dev" --query 'logGroups[].logGroupName' --output text 2>/dev/null || echo "")
    
    if [ -z "$REMAINING_LOGS" ]; then
        log_success "All log groups deleted"
    else
        log_warning "Some log groups may still exist: $REMAINING_LOGS"
    fi
    
    log_success "Cleanup verification completed"
}

# Display cleanup summary
display_cleanup_summary() {
    log_step "Cleanup Summary"
    
    echo -e "${BOLD}${GREEN}🎉 Development Environment Cleanup Completed!${NC}"
    echo ""
    echo -e "${BOLD}Cleanup Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Cleaned At:${NC} $(date)"
    echo ""
    
    if [ -f "$SCRIPT_DIR/resources-to-cleanup.json" ]; then
        echo -e "${BOLD}Resources Cleaned:${NC}"
        
        local s3_count=$(cat "$SCRIPT_DIR/resources-to-cleanup.json" | jq -r '.s3_buckets | length')
        local lambda_count=$(cat "$SCRIPT_DIR/resources-to-cleanup.json" | jq -r '.lambda_functions | length')
        local log_count=$(cat "$SCRIPT_DIR/resources-to-cleanup.json" | jq -r '.log_groups | length')
        
        echo -e "${CYAN}• S3 Buckets Cleaned:${NC} $s3_count"
        echo -e "${CYAN}• Lambda Functions Deleted:${NC} $lambda_count"
        echo -e "${CYAN}• Log Groups Deleted:${NC} $log_count"
        echo ""
    fi
    
    echo -e "${BOLD}What was deleted:${NC}"
    echo "• CloudFormation stack and all associated resources"
    echo "• Lambda functions and their execution roles"
    echo "• API Gateway endpoints"
    echo "• S3 buckets and all contents"
    echo "• DynamoDB tables and data"
    echo "• CloudWatch logs and metrics"
    echo "• IAM roles and policies created by the stack"
    echo "• All tags and metadata"
    echo ""
    
    echo -e "${YELLOW}📋 Post-Cleanup Notes:${NC}"
    echo "• The development environment has been completely removed"
    echo "• To redeploy, run: ./deploy.sh"
    echo "• Costs associated with the development environment have stopped"
    echo "• Manual resources (if any) may need separate cleanup"
    echo ""
    
    echo -e "${BLUE}📚 Verification Commands:${NC}"
    echo "• Check stacks: aws cloudformation list-stacks --region $REGION"
    echo "• Check functions: aws lambda list-functions --region $REGION"
    echo "• Check buckets: aws s3 ls"
    echo ""
    
    echo "Cleanup log saved to: $LOG_FILE"
    echo ""
}

# Error handling
cleanup_on_error() {
    log_error "Cleanup failed. Check $LOG_FILE for details."
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "1. Check AWS credentials and permissions"
    echo "2. Manual cleanup may be required via AWS Console"
    echo "3. Check CloudFormation stack events for specific errors"
    echo "4. Some resources may have delete protection enabled"
    echo ""
    echo "Resources that may need manual cleanup:"
    echo "• S3 buckets with versioning or MFA delete"
    echo "• RDS instances with deletion protection"
    echo "• Route53 hosted zones"
    echo ""
    exit 1
}

# Main cleanup function
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
║                        Development Cleanup                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_info "Starting development cleanup at $CLEANUP_START_TIME"
    
    # Get confirmation
    confirm_cleanup "$1"
    
    # Run cleanup steps
    check_prerequisites
    get_stack_resources
    cleanup_s3_buckets
    cleanup_cloudwatch_logs
    delete_stack
    verify_cleanup
    display_cleanup_summary
    
    local cleanup_end_time=$(date)
    log_success "Cleanup completed at $cleanup_end_time"
    
    # Calculate cleanup time
    local start_seconds=$(date -d "$CLEANUP_START_TIME" +%s 2>/dev/null || date -j -f "%a %b %d %T %Z %Y" "$CLEANUP_START_TIME" +%s 2>/dev/null || echo 0)
    local end_seconds=$(date +%s)
    local duration=$((end_seconds - start_seconds))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    echo -e "${BOLD}${GREEN}✅ Total cleanup time: ${duration_min}m ${duration_sec}s${NC}"
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Development Cleanup"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --force        Skip confirmation prompt"
    echo ""
    echo "This script will:"
    echo "1. Confirm cleanup operation"
    echo "2. Gather information about resources to be deleted"
    echo "3. Clean S3 buckets (delete all objects and versions)"
    echo "4. Delete CloudWatch log groups"
    echo "5. Delete CloudFormation stack and all resources"
    echo "6. Verify cleanup completion"
    echo ""
    echo "⚠️  WARNING: This operation is irreversible!"
    echo "All data in the development environment will be permanently lost."
    echo ""
    echo "Requirements:"
    echo "• AWS CLI configured with appropriate permissions"
    echo "• DELETE permissions for all AWS resources"
    echo ""
    exit 0
fi

# Run main cleanup
main "$@"