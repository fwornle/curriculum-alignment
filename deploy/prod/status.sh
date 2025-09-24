#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Production Environment Status Script

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

# Display production overview
display_overview() {
    echo -e "${BOLD}${RED}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              Multi-Agent Curriculum Alignment System (MACAS)                ║
║                                                                              ║
║                        PRODUCTION STATUS                                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${BOLD}Production Environment:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Status Check:${NC} $(date)"
    echo ""
}

# Check AWS connectivity
check_aws_connectivity() {
    log_step "AWS Connectivity"
    
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not found"
        return 1
    fi
    
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
        log_error "Production stack '$STACK_NAME' not found"
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
            log_warning "Stack Status: $stack_status (Operation in progress)"
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

# Check Lambda functions health
check_lambda_health() {
    log_step "Lambda Functions Health"
    
    local functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-prod')]" --output json 2>/dev/null || echo '[]')
    
    if [ "$functions" = "[]" ]; then
        log_warning "No Lambda functions found"
        return 1
    fi
    
    local function_count=$(echo "$functions" | jq '. | length')
    log_success "Found $function_count Lambda functions"
    
    # Check each function's health
    echo "$functions" | jq -r '.[].FunctionName' | while read -r function_name; do
        if [ -n "$function_name" ]; then
            # Get function metrics
            local error_count=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/Lambda \
                --metric-name Errors \
                --dimensions Name=FunctionName,Value="$function_name" \
                --statistics Sum \
                --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
                --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
                --period 3600 \
                --region "$REGION" \
                --query 'Datapoints[0].Sum // 0' \
                --output text 2>/dev/null || echo "0")
            
            local invocation_count=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/Lambda \
                --metric-name Invocations \
                --dimensions Name=FunctionName,Value="$function_name" \
                --statistics Sum \
                --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
                --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
                --period 3600 \
                --region "$REGION" \
                --query 'Datapoints[0].Sum // 0' \
                --output text 2>/dev/null || echo "0")
            
            if [ "$error_count" = "0" ] || [ "$error_count" = "0.0" ]; then
                echo -e "  ${GREEN}✅${NC} $function_name (Invocations: $invocation_count, Errors: 0)"
            else
                echo -e "  ${YELLOW}⚠️${NC} $function_name (Invocations: $invocation_count, Errors: $error_count)"
            fi
        fi
    done
}

# Check API Gateway health
check_api_health() {
    log_step "API Gateway Health"
    
    local stack_outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    local api_endpoint=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' 2>/dev/null || echo "")
    
    if [ -z "$api_endpoint" ] || [ "$api_endpoint" = "null" ]; then
        log_warning "API Gateway endpoint not found"
        return 1
    fi
    
    log_success "API Gateway endpoint found"
    echo "  Endpoint: $api_endpoint"
    
    # Test health endpoint
    echo ""
    echo -e "${BOLD}API Health Check:${NC}"
    
    local health_response=$(curl -s -w "\n%{http_code}" -o /tmp/prod_health_response.txt "$api_endpoint/health" 2>/dev/null || echo "000")
    local http_code=$(echo "$health_response" | tail -1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Health endpoint responding (HTTP 200)"
        if [ -f "/tmp/prod_health_response.txt" ]; then
            local health_data=$(cat /tmp/prod_health_response.txt | head -n -1)
            echo "  Response: $health_data"
        fi
    else
        log_error "Health endpoint not responding (HTTP $http_code)"
    fi
    
    rm -f /tmp/prod_health_response.txt
}

# Check CloudWatch alarms
check_alarms() {
    log_step "CloudWatch Alarms"
    
    local alarms=$(aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --region "$REGION" --output json 2>/dev/null || echo '{"MetricAlarms":[]}')
    local alarm_count=$(echo "$alarms" | jq '.MetricAlarms | length')
    
    if [ "$alarm_count" = "0" ]; then
        log_warning "No CloudWatch alarms configured"
        return 1
    fi
    
    log_success "Found $alarm_count CloudWatch alarms"
    
    # Check alarm states
    local ok_count=$(echo "$alarms" | jq '[.MetricAlarms[] | select(.StateValue=="OK")] | length')
    local alarm_state_count=$(echo "$alarms" | jq '[.MetricAlarms[] | select(.StateValue=="ALARM")] | length')
    local insufficient_count=$(echo "$alarms" | jq '[.MetricAlarms[] | select(.StateValue=="INSUFFICIENT_DATA")] | length')
    
    echo "  States:"
    if [ "$ok_count" -gt 0 ]; then
        echo -e "    ${GREEN}✅ OK: $ok_count${NC}"
    fi
    if [ "$alarm_state_count" -gt 0 ]; then
        echo -e "    ${RED}🚨 ALARM: $alarm_state_count${NC}"
        # List alarms in ALARM state
        echo "$alarms" | jq -r '.MetricAlarms[] | select(.StateValue=="ALARM") | "      - \(.AlarmName)"'
    fi
    if [ "$insufficient_count" -gt 0 ]; then
        echo -e "    ${YELLOW}⚠️  INSUFFICIENT_DATA: $insufficient_count${NC}"
    fi
}

# Check S3 buckets
check_s3_buckets() {
    log_step "S3 Buckets"
    
    local stack_outputs=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    local buckets=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null | grep -v null || echo "")
    
    if [ -z "$buckets" ]; then
        log_warning "No S3 buckets found"
        return 1
    fi
    
    local bucket_count=$(echo "$buckets" | wc -l)
    log_success "Found $bucket_count S3 buckets"
    
    echo "$buckets" | while IFS= read -r bucket; do
        if [ -n "$bucket" ]; then
            local bucket_info=$(aws s3api head-bucket --bucket "$bucket" 2>/dev/null && echo "accessible" || echo "not accessible")
            local object_count=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | tail -1 | awk '{print $3}' || echo "0")
            local bucket_size=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | tail -1 | awk '{print $6}' || echo "0")
            
            if [ "$bucket_info" = "accessible" ]; then
                log_success "$bucket"
                echo "    Objects: $object_count, Size: $bucket_size bytes"
            else
                log_error "$bucket (not accessible)"
            fi
        fi
    done
}

# Check database connectivity
check_database() {
    log_step "Database Status"
    
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        local db_configured=$(grep -E "^(DATABASE_URL|SUPABASE_URL)" "$PROJECT_ROOT/.env.production" 2>/dev/null | wc -l)
        
        if [ "$db_configured" -gt 0 ]; then
            log_success "Database configuration found"
            
            # Check if we can get database status from CloudWatch
            local db_connections=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/RDS \
                --metric-name DatabaseConnections \
                --dimensions Name=DBInstanceIdentifier,Value="curriculum-alignment-prod" \
                --statistics Average \
                --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
                --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
                --period 3600 \
                --region "$REGION" \
                --query 'Datapoints[0].Average // "N/A"' \
                --output text 2>/dev/null || echo "N/A")
            
            if [ "$db_connections" != "N/A" ]; then
                echo "  Average connections (last hour): $db_connections"
            fi
        else
            log_warning "No database configuration found"
        fi
    else
        log_warning "No production environment file found"
    fi
}

# Check backup status
check_backup_status() {
    log_step "Backup Status"
    
    # Check if backup automation is configured
    if crontab -l 2>/dev/null | grep -q "curriculum-alignment-backup.*prod"; then
        log_success "Backup automation configured"
        
        # Show last backup time from logs if available
        if [ -f "/var/log/curriculum-backup.log" ]; then
            local last_backup=$(grep "prod.*SUCCESS" /var/log/curriculum-backup.log 2>/dev/null | tail -1 || echo "")
            if [ -n "$last_backup" ]; then
                echo "  Last successful backup: $last_backup"
            fi
        fi
    else
        log_warning "No automated backups configured"
    fi
    
    # Check S3 for recent backups
    local backup_bucket="${S3_BACKUP_BUCKET:-curriculum-alignment-backups}"
    local recent_backups=$(aws s3 ls "s3://$backup_bucket/prod/" --recursive 2>/dev/null | tail -5 || echo "")
    
    if [ -n "$recent_backups" ]; then
        echo "  Recent backups in S3:"
        echo "$recent_backups" | while IFS= read -r backup; do
            echo "    $backup"
        done
    fi
}

# Display production metrics summary
display_metrics_summary() {
    log_step "Production Metrics (Last Hour)"
    
    # API Gateway metrics
    local api_4xx=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name 4XXError \
        --dimensions Name=ApiName,Value="curriculum-alignment-prod" \
        --statistics Sum \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --region "$REGION" \
        --query 'Datapoints[0].Sum // 0' \
        --output text 2>/dev/null || echo "0")
    
    local api_5xx=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name 5XXError \
        --dimensions Name=ApiName,Value="curriculum-alignment-prod" \
        --statistics Sum \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --region "$REGION" \
        --query 'Datapoints[0].Sum // 0' \
        --output text 2>/dev/null || echo "0")
    
    echo "  API Gateway:"
    echo "    4XX Errors: $api_4xx"
    echo "    5XX Errors: $api_5xx"
    
    # Lambda metrics summary
    local total_invocations=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --statistics Sum \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --region "$REGION" \
        --query 'Datapoints[0].Sum // 0' \
        --output text 2>/dev/null || echo "0")
    
    local total_errors=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Errors \
        --statistics Sum \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --region "$REGION" \
        --query 'Datapoints[0].Sum // 0' \
        --output text 2>/dev/null || echo "0")
    
    echo "  Lambda Functions:"
    echo "    Total Invocations: $total_invocations"
    echo "    Total Errors: $total_errors"
    
    if [ "$total_invocations" != "0" ] && [ "$total_invocations" != "0.0" ]; then
        local error_rate=$(echo "scale=2; $total_errors * 100 / $total_invocations" | bc 2>/dev/null || echo "0")
        echo "    Error Rate: ${error_rate}%"
    fi
}

# Display summary and recommendations
display_summary() {
    echo ""
    log_step "Production Status Summary"
    
    local all_good=true
    local warnings=()
    local errors=()
    
    # Collect status information
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        all_good=false
        errors+=("AWS credentials not configured")
    fi
    
    local stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    if [ "$stack_status" = "STACK_NOT_EXISTS" ]; then
        all_good=false
        errors+=("CloudFormation stack not found")
    elif [[ "$stack_status" == *"FAILED"* ]]; then
        all_good=false
        errors+=("CloudFormation stack in failed state")
    elif [[ "$stack_status" == *"IN_PROGRESS"* ]]; then
        all_good=false
        warnings+=("Stack operation in progress")
    fi
    
    # Check for active alarms
    local active_alarms=$(aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --state-value ALARM --region "$REGION" --query 'MetricAlarms | length' --output text 2>/dev/null || echo "0")
    if [ "$active_alarms" -gt 0 ]; then
        all_good=false
        errors+=("$active_alarms CloudWatch alarms are active")
    fi
    
    # Overall status
    if $all_good && [ ${#warnings[@]} -eq 0 ]; then
        echo -e "${BOLD}${GREEN}🎉 Production Environment Status: HEALTHY${NC}"
    elif [ ${#errors[@]} -gt 0 ]; then
        echo -e "${BOLD}${RED}🚨 Production Environment Status: CRITICAL${NC}"
    else
        echo -e "${BOLD}${YELLOW}⚠️  Production Environment Status: WARNING${NC}"
    fi
    
    # Display issues
    if [ ${#errors[@]} -gt 0 ]; then
        echo ""
        echo -e "${BOLD}Critical Issues:${NC}"
        for error in "${errors[@]}"; do
            echo -e "${RED}• $error${NC}"
        done
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo ""
        echo -e "${BOLD}Warnings:${NC}"
        for warning in "${warnings[@]}"; do
            echo -e "${YELLOW}• $warning${NC}"
        done
    fi
    
    echo ""
    echo -e "${BOLD}Quick Actions:${NC}"
    echo -e "${CYAN}• View logs:${NC} sam logs -n CoordinatorFunction --stack-name $STACK_NAME --tail"
    echo -e "${CYAN}• CloudWatch:${NC} https://console.aws.amazon.com/cloudwatch/home?region=$REGION"
    echo -e "${CYAN}• Stack:${NC} https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
    
    if [ "$active_alarms" -gt 0 ]; then
        echo -e "${CYAN}• Check alarms:${NC} aws cloudwatch describe-alarms --alarm-name-prefix CurriculumAlignment-Prod --state-value ALARM"
    fi
    
    echo ""
    echo -e "${BLUE}📚 Management Commands:${NC}"
    echo "• Deploy updates: ./deploy.sh"
    echo "• Create backup: $PROJECT_ROOT/scripts/backup.sh prod full"
    echo "• View metrics: CloudWatch Dashboard - CurriculumAlignment-Production"
    echo ""
}

# Main status check function
main() {
    display_overview
    
    # Run status checks
    check_aws_connectivity
    
    if check_stack_status; then
        check_lambda_health
        check_api_health
        check_alarms
        check_s3_buckets
    fi
    
    check_database
    check_backup_status
    display_metrics_summary
    display_summary
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Production Status"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --json         Output status in JSON format (future feature)"
    echo ""
    echo "This script will:"
    echo "1. Check AWS connectivity and credentials"
    echo "2. Verify CloudFormation stack status"
    echo "3. Monitor Lambda function health"
    echo "4. Check API Gateway endpoints"
    echo "5. Review CloudWatch alarms"
    echo "6. Verify S3 bucket status"
    echo "7. Check database configuration"
    echo "8. Review backup status"
    echo "9. Display production metrics"
    echo ""
    echo "Requirements:"
    echo "• AWS CLI configured with production account access"
    echo "• Read permissions for CloudFormation, Lambda, CloudWatch, S3"
    echo "• Production stack deployed"
    echo ""
    exit 0
fi

# Run main status check
main "$@"