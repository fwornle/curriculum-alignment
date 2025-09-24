#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Development Environment Status Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="dev"
STACK_NAME="curriculum-alignment-dev"
REGION="eu-central-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BOLD}${CYAN}🔍 $1${NC}"
}

# Check AWS connectivity
check_aws_connectivity() {
    log_step "AWS Connectivity"
    
    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not found"
        return 1
    fi
    
    # Check credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured or invalid"
        return 1
    fi
    
    local caller_identity=$(aws sts get-caller-identity --output json 2>/dev/null)
    local account_id=$(echo "$caller_identity" | jq -r '.Account')
    local user_arn=$(echo "$caller_identity" | jq -r '.Arn')
    
    log_success "AWS CLI connected"
    echo "  Account: $account_id"
    echo "  Identity: $user_arn"
    echo "  Region: $REGION"
}

# Check CloudFormation stack status
check_stack_status() {
    log_step "CloudFormation Stack Status"
    
    local stack_info=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --output json 2>/dev/null || echo '{}')
    
    if [ "$stack_info" = "{}" ]; then
        log_warning "Stack '$STACK_NAME' not found"
        return 1
    fi
    
    local stack_status=$(echo "$stack_info" | jq -r '.Stacks[0].StackStatus')
    local creation_time=$(echo "$stack_info" | jq -r '.Stacks[0].CreationTime')
    local last_updated=$(echo "$stack_info" | jq -r '.Stacks[0].LastUpdatedTime // "Never"')
    
    case "$stack_status" in
        *"COMPLETE")
            log_success "Stack Status: $stack_status"
            ;;
        *"IN_PROGRESS")
            log_info "Stack Status: $stack_status (Operation in progress)"
            ;;
        *"FAILED")
            log_error "Stack Status: $stack_status"
            ;;
        *)
            log_warning "Stack Status: $stack_status"
            ;;
    esac
    
    echo "  Created: $creation_time"
    echo "  Last Updated: $last_updated"
    
    # Get stack outputs
    local stack_outputs=$(echo "$stack_info" | jq -r '.Stacks[0].Outputs // []')
    if [ "$stack_outputs" != "[]" ]; then
        echo ""
        echo -e "${BOLD}Stack Outputs:${NC}"
        echo "$stack_outputs" | jq -r '.[] | "  \(.OutputKey): \(.OutputValue)"'
    fi
}

# Check Lambda functions
check_lambda_functions() {
    log_step "Lambda Functions"
    
    local functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-dev')]" --output json 2>/dev/null || echo '[]')
    
    if [ "$functions" = "[]" ]; then
        log_warning "No Lambda functions found"
        return 1
    fi
    
    local function_count=$(echo "$functions" | jq '. | length')
    log_success "Found $function_count Lambda functions"
    
    echo "$functions" | jq -r '.[] | "  • \(.FunctionName) (\(.Runtime), \(.MemorySize)MB)"'
    
    # Check function health (basic invocation test)
    echo ""
    echo -e "${BOLD}Function Health Check:${NC}"
    
    echo "$functions" | jq -r '.[0:3] | .[] | .FunctionName' | while read -r function_name; do
        if [ -n "$function_name" ]; then
            local invoke_result=$(aws lambda invoke --function-name "$function_name" --region "$REGION" --payload '{}' /tmp/test-response.json 2>/dev/null && echo "success" || echo "failed")
            
            if [ "$invoke_result" = "success" ]; then
                log_success "$function_name"
            else
                log_error "$function_name (invoke failed)"
            fi
            rm -f /tmp/test-response.json
        fi
    done
}

# Check API Gateway
check_api_gateway() {
    log_step "API Gateway"
    
    # Get API Gateway info from stack outputs
    local stack_outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    local api_endpoint=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' 2>/dev/null || echo "")
    
    if [ -z "$api_endpoint" ] || [ "$api_endpoint" = "null" ]; then
        log_warning "API Gateway endpoint not found in stack outputs"
        return 1
    fi
    
    log_success "API Gateway endpoint found"
    echo "  Endpoint: $api_endpoint"
    
    # Test API health
    echo ""
    echo -e "${BOLD}API Health Check:${NC}"
    
    local health_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$api_endpoint/health" 2>/dev/null || echo "000")
    
    if [ "$health_response" = "200" ]; then
        log_success "Health endpoint responding (HTTP 200)"
        if [ -f "/tmp/health_response.json" ]; then
            local health_data=$(cat /tmp/health_response.json)
            echo "  Response: $health_data"
        fi
    else
        log_error "Health endpoint not responding (HTTP $health_response)"
    fi
    
    rm -f /tmp/health_response.json
}

# Check S3 buckets
check_s3_buckets() {
    log_step "S3 Buckets"
    
    local stack_outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    local buckets=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null || echo "")
    
    if [ -z "$buckets" ]; then
        log_warning "No S3 buckets found in stack outputs"
        return 1
    fi
    
    local bucket_count=$(echo "$buckets" | wc -l)
    log_success "Found $bucket_count S3 buckets"
    
    echo "$buckets" | while IFS= read -r bucket; do
        if [ -n "$bucket" ]; then
            local bucket_info=$(aws s3api head-bucket --bucket "$bucket" 2>/dev/null && echo "accessible" || echo "not accessible")
            local object_count=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | tail -1 | awk '{print $3}' || echo "0")
            
            if [ "$bucket_info" = "accessible" ]; then
                log_success "$bucket ($object_count objects)"
            else
                log_error "$bucket (not accessible)"
            fi
        fi
    done
}

# Check CloudWatch logs
check_cloudwatch_logs() {
    log_step "CloudWatch Logs"
    
    local log_groups=$(aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "/aws/lambda/curriculum-alignment-dev" --query 'logGroups' --output json 2>/dev/null || echo '[]')
    
    if [ "$log_groups" = "[]" ]; then
        log_warning "No CloudWatch log groups found"
        return 1
    fi
    
    local group_count=$(echo "$log_groups" | jq '. | length')
    log_success "Found $group_count CloudWatch log groups"
    
    echo "$log_groups" | jq -r '.[] | "  • \(.logGroupName) (size: \(.storedBytes // 0) bytes)"'
    
    # Show recent log entries
    echo ""
    echo -e "${BOLD}Recent Log Activity:${NC}"
    
    local first_group=$(echo "$log_groups" | jq -r '.[0].logGroupName')
    if [ -n "$first_group" ] && [ "$first_group" != "null" ]; then
        local recent_logs=$(aws logs filter-log-events --log-group-name "$first_group" --region "$REGION" --start-time $(( $(date +%s) * 1000 - 3600000 )) --query 'events[0:5]' --output json 2>/dev/null || echo '[]')
        
        if [ "$recent_logs" != "[]" ]; then
            local log_count=$(echo "$recent_logs" | jq '. | length')
            echo "  Last $log_count log entries from $first_group:"
            echo "$recent_logs" | jq -r '.[] | "    [\(.timestamp | strftime("%H:%M:%S"))] \(.message)"' | head -3
        else
            echo "  No recent log entries found"
        fi
    fi
}

# Check database connectivity
check_database() {
    log_step "Database Connectivity"
    
    # This would require actual database credentials and connection
    # For now, just check if database-related environment variables exist
    if [ -f "$PROJECT_ROOT/.env.development" ]; then
        local db_url=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/.env.development" 2>/dev/null | cut -d'=' -f2- || echo "")
        local supabase_url=$(grep "^SUPABASE_URL=" "$PROJECT_ROOT/.env.development" 2>/dev/null | cut -d'=' -f2- || echo "")
        
        if [ -n "$db_url" ] && [ "$db_url" != "" ]; then
            log_success "Database URL configured"
            echo "  Type: PostgreSQL"
        elif [ -n "$supabase_url" ] && [ "$supabase_url" != "" ]; then
            log_success "Supabase configuration found"
            echo "  Type: Supabase"
        else
            log_warning "No database configuration found in .env.development"
        fi
    else
        log_warning "No .env.development file found"
    fi
}

# Display system overview
display_overview() {
    echo -e "${BOLD}${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              Multi-Agent Curriculum Alignment System (MACAS)                ║
║                                                                              ║
║                        Development Status                                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${BOLD}Environment Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Status Check:${NC} $(date)"
    echo ""
}

# Display summary
display_summary() {
    echo ""
    log_step "Status Summary"
    
    local all_good=true
    local issues=()
    
    # Collect status information
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        all_good=false
        issues+=("AWS credentials not configured")
    fi
    
    local stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    if [ "$stack_status" = "STACK_NOT_EXISTS" ]; then
        all_good=false
        issues+=("CloudFormation stack not found")
    elif [[ "$stack_status" == *"FAILED"* ]]; then
        all_good=false
        issues+=("CloudFormation stack in failed state")
    fi
    
    if $all_good; then
        echo -e "${BOLD}${GREEN}🎉 Development Environment Status: HEALTHY${NC}"
        echo ""
        echo -e "${BOLD}Quick Actions:${NC}"
        echo -e "${CYAN}• View logs:${NC} sam logs -n CoordinatorFunction --stack-name $STACK_NAME --tail"
        echo -e "${CYAN}• Redeploy:${NC} ./deploy.sh"
        echo -e "${CYAN}• Cleanup:${NC} ./cleanup.sh"
        echo -e "${CYAN}• Monitor:${NC} aws cloudformation describe-stack-events --stack-name $STACK_NAME"
    else
        echo -e "${BOLD}${YELLOW}⚠️  Development Environment Status: NEEDS ATTENTION${NC}"
        echo ""
        echo -e "${BOLD}Issues Found:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "${RED}• $issue${NC}"
        done
        echo ""
        echo -e "${BOLD}Suggested Actions:${NC}"
        echo -e "${CYAN}• Deploy:${NC} ./deploy.sh"
        echo -e "${CYAN}• Check logs:${NC} Check AWS CloudFormation console"
        echo -e "${CYAN}• Get help:${NC} ./status.sh --help"
    fi
    
    echo ""
    echo -e "${BLUE}📚 Useful Links:${NC}"
    echo "• CloudFormation Console: https://console.aws.amazon.com/cloudformation/home?region=$REGION"
    echo "• Lambda Console: https://console.aws.amazon.com/lambda/home?region=$REGION"
    echo "• CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#logsV2:log-groups"
    echo ""
}

# Main status check function
main() {
    display_overview
    
    # Run status checks
    check_aws_connectivity
    
    if check_stack_status; then
        check_lambda_functions
        check_api_gateway
        check_s3_buckets
        check_cloudwatch_logs
    fi
    
    check_database
    display_summary
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Development Status"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --json         Output status in JSON format"
    echo ""
    echo "This script will:"
    echo "1. Check AWS connectivity and credentials"
    echo "2. Verify CloudFormation stack status"
    echo "3. Test Lambda function health"
    echo "4. Check API Gateway endpoints"
    echo "5. Verify S3 bucket accessibility"
    echo "6. Review CloudWatch logs"
    echo "7. Check database configuration"
    echo ""
    echo "Requirements:"
    echo "• AWS CLI configured with appropriate permissions"
    echo "• Deployed development environment"
    echo ""
    exit 0
fi

# Run main status check
main "$@"