#!/bin/bash

# Deploy CloudWatch Dashboards and Alarms for Curriculum Alignment System
# This script creates comprehensive monitoring infrastructure

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
DASHBOARD_CONFIG="cloudwatch-dashboards.json"
SNS_TOPIC_ALERTS="curriculum-alignment-alerts"
SNS_TOPIC_COST="curriculum-alignment-cost-alerts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check if dashboard config exists
    if [[ ! -f "$DASHBOARD_CONFIG" ]]; then
        log_error "Dashboard configuration file not found: $DASHBOARD_CONFIG"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create SNS topics for alerts
create_sns_topics() {
    log_info "Creating SNS topics for alerts..."
    
    # Create general alerts topic
    if aws sns create-topic --name "$SNS_TOPIC_ALERTS" --region "$AWS_REGION" &> /dev/null; then
        log_success "Created SNS topic: $SNS_TOPIC_ALERTS"
    else
        log_warning "SNS topic $SNS_TOPIC_ALERTS already exists or creation failed"
    fi
    
    # Create cost alerts topic
    if aws sns create-topic --name "$SNS_TOPIC_COST" --region "$AWS_REGION" &> /dev/null; then
        log_success "Created SNS topic: $SNS_TOPIC_COST"
    else
        log_warning "SNS topic $SNS_TOPIC_COST already exists or creation failed"
    fi
    
    # Get topic ARNs
    ALERTS_TOPIC_ARN=$(aws sns get-topic-attributes --topic-arn "arn:aws:sns:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):$SNS_TOPIC_ALERTS" --query "Attributes.TopicArn" --output text 2>/dev/null || echo "")
    COST_TOPIC_ARN=$(aws sns get-topic-attributes --topic-arn "arn:aws:sns:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):$SNS_TOPIC_COST" --query "Attributes.TopicArn" --output text 2>/dev/null || echo "")
    
    log_info "Alerts Topic ARN: $ALERTS_TOPIC_ARN"
    log_info "Cost Topic ARN: $COST_TOPIC_ARN"
}

# Deploy CloudWatch dashboards
deploy_dashboards() {
    log_info "Deploying CloudWatch dashboards..."
    
    # Extract dashboard names and bodies from JSON config
    local dashboard_names=(
        "CurriculumAlignmentSystem-Overview"
        "CurriculumAlignmentSystem-AgentPerformance"
        "CurriculumAlignmentSystem-Costs"
        "CurriculumAlignmentSystem-Errors"
        "CurriculumAlignmentSystem-BusinessMetrics"
    )
    
    for dashboard_name in "${dashboard_names[@]}"; do
        log_info "Deploying dashboard: $dashboard_name"
        
        # Extract dashboard body for this specific dashboard
        local dashboard_body=$(jq -c --arg name "$dashboard_name" '.dashboards[] | select(.name == $name) | .body' "$DASHBOARD_CONFIG")
        
        if [[ -n "$dashboard_body" && "$dashboard_body" != "null" ]]; then
            if aws cloudwatch put-dashboard \
                --dashboard-name "$dashboard_name" \
                --dashboard-body "$dashboard_body" \
                --region "$AWS_REGION" &> /dev/null; then
                log_success "Deployed dashboard: $dashboard_name"
            else
                log_error "Failed to deploy dashboard: $dashboard_name"
            fi
        else
            log_warning "No dashboard body found for: $dashboard_name"
        fi
    done
}

# Deploy CloudWatch alarms
deploy_alarms() {
    log_info "Deploying CloudWatch alarms..."
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local alerts_topic_arn="arn:aws:sns:$AWS_REGION:$account_id:$SNS_TOPIC_ALERTS"
    local cost_topic_arn="arn:aws:sns:$AWS_REGION:$account_id:$SNS_TOPIC_COST"
    
    # High Error Rate Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "CurriculumAlignment-HighErrorRate" \
        --alarm-description "Triggers when system error rate exceeds threshold" \
        --metric-name "Errors" \
        --namespace "AWS/Lambda" \
        --statistic "Sum" \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 10 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions "Name=FunctionName,Value=curriculum-alignment-api" \
        --alarm-actions "$alerts_topic_arn" \
        --treat-missing-data "breaching" \
        --region "$AWS_REGION" && \
    log_success "Created alarm: CurriculumAlignment-HighErrorRate"
    
    # Database Connections Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "CurriculumAlignment-DatabaseConnections" \
        --alarm-description "Monitors database connection pool health" \
        --metric-name "DatabaseConnections" \
        --namespace "AWS/RDS" \
        --statistic "Average" \
        --period 300 \
        --evaluation-periods 2 \
        --threshold 80 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions "Name=DBInstanceIdentifier,Value=curriculum-alignment-db" \
        --alarm-actions "$alerts_topic_arn" \
        --region "$AWS_REGION" && \
    log_success "Created alarm: CurriculumAlignment-DatabaseConnections"
    
    # API Latency Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "CurriculumAlignment-ApiLatency" \
        --alarm-description "Monitors API response time" \
        --metric-name "Duration" \
        --namespace "AWS/Lambda" \
        --statistic "Average" \
        --period 300 \
        --evaluation-periods 3 \
        --threshold 5000 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions "Name=FunctionName,Value=curriculum-alignment-api" \
        --alarm-actions "$alerts_topic_arn" \
        --region "$AWS_REGION" && \
    log_success "Created alarm: CurriculumAlignment-ApiLatency"
    
    # Daily Cost Alarm - requires us-east-1 region and special SNS topic
    local cost_topic_arn_us_east="arn:aws:sns:us-east-1:$account_id:$SNS_TOPIC_COST"
    
    # Create SNS topic in us-east-1 for cost alerts
    AWS_DEFAULT_REGION=us-east-1 aws sns create-topic --name "$SNS_TOPIC_COST" --region "us-east-1" &> /dev/null || true
    
    # Create cost alarm in us-east-1
    AWS_DEFAULT_REGION=us-east-1 aws cloudwatch put-metric-alarm \
        --alarm-name "CurriculumAlignment-DailyCost" \
        --alarm-description "Monitors daily cost threshold" \
        --metric-name "EstimatedCharges" \
        --namespace "AWS/Billing" \
        --statistic "Maximum" \
        --period 86400 \
        --evaluation-periods 1 \
        --threshold 100 \
        --comparison-operator "GreaterThanThreshold" \
        --dimensions "Name=Currency,Value=USD" \
        --alarm-actions "$cost_topic_arn_us_east" \
        --region "us-east-1" && \
    log_success "Created alarm: CurriculumAlignment-DailyCost"
}

# Create custom metric filters for business metrics
create_custom_metrics() {
    log_info "Creating custom metric filters..."
    
    # Helper function to create metric filter if log group exists
    create_metric_filter_if_exists() {
        local log_group_name="$1"
        local filter_name="$2"
        local filter_pattern="$3"
        local metric_name="$4"
        
        # Check if log group exists
        if aws logs describe-log-groups --log-group-name-prefix "$log_group_name" --region "$AWS_REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$log_group_name"; then
            aws logs put-metric-filter \
                --log-group-name "$log_group_name" \
                --filter-name "$filter_name" \
                --filter-pattern "$filter_pattern" \
                --metric-transformations \
                    metricName="$metric_name",metricNamespace=CurriculumAlignment/Business,metricValue=1 \
                --region "$AWS_REGION" && \
            log_success "Created metric filter: $filter_name for $log_group_name"
        else
            log_warning "Log group $log_group_name does not exist yet - skipping metric filter creation"
            log_info "Log groups are created when Lambda functions first execute"
        fi
    }
    
    # Analysis completion metric (Coordinator function)
    create_metric_filter_if_exists \
        "/aws/lambda/curriculum-alignment-dev-coordinator" \
        "AnalysisCompleted" \
        '[timestamp, requestId, level="INFO", message="analysis_completed"]' \
        "AnalysisCompleted"
    
    # Document processing metric
    create_metric_filter_if_exists \
        "/aws/lambda/curriculum-alignment-dev-document-processing" \
        "DocumentsProcessed" \
        '[timestamp, requestId, level="INFO", message="document_processed"]' \
        "DocumentsProcessed"
    
    # Semantic search metric
    create_metric_filter_if_exists \
        "/aws/lambda/curriculum-alignment-dev-semantic-search" \
        "SearchQueries" \
        '[timestamp, requestId, level="INFO", message="search_completed"]' \
        "SearchQueries"
    
    # Chat interface metric
    create_metric_filter_if_exists \
        "/aws/lambda/curriculum-alignment-dev-chat-interface" \
        "ChatInteractions" \
        '[timestamp, requestId, level="INFO", message="chat_response"]' \
        "ChatInteractions"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check dashboards
    local dashboard_count=$(aws cloudwatch list-dashboards --region "$AWS_REGION" --query 'DashboardEntries[?starts_with(DashboardName, `CurriculumAlignmentSystem`)] | length(@)' --output text)
    log_info "Found $dashboard_count CurriculumAlignment dashboards"
    
    # Check alarms in main region
    local alarm_count=$(aws cloudwatch describe-alarms --region "$AWS_REGION" --alarm-names \
        "CurriculumAlignment-HighErrorRate" \
        "CurriculumAlignment-DatabaseConnections" \
        "CurriculumAlignment-ApiLatency" \
        --query 'MetricAlarms | length(@)' --output text 2>/dev/null || echo "0")
    
    # Check cost alarm in us-east-1
    local cost_alarm_count=$(AWS_DEFAULT_REGION=us-east-1 aws cloudwatch describe-alarms --region "us-east-1" --alarm-names \
        "CurriculumAlignment-DailyCost" \
        --query 'MetricAlarms | length(@)' --output text 2>/dev/null || echo "0")
    
    local total_alarm_count=$((alarm_count + cost_alarm_count))
    log_info "Found $total_alarm_count CurriculumAlignment alarms ($alarm_count in $AWS_REGION, $cost_alarm_count in us-east-1)"
    
    if [[ "$dashboard_count" -ge 5 && "$total_alarm_count" -ge 4 ]]; then
        log_success "Monitoring deployment verification passed"
    else
        log_warning "Monitoring deployment verification found issues"
    fi
}

# Cleanup function for failed deployments
cleanup_on_failure() {
    log_warning "Cleaning up partial deployment..."
    
    # Remove dashboards
    aws cloudwatch list-dashboards --region "$AWS_REGION" --query 'DashboardEntries[?starts_with(DashboardName, `CurriculumAlignmentSystem`)].DashboardName' --output text | \
    xargs -I {} aws cloudwatch delete-dashboards --dashboard-names {} --region "$AWS_REGION" 2>/dev/null || true
    
    # Remove alarms in main region
    aws cloudwatch delete-alarms --alarm-names \
        "CurriculumAlignment-HighErrorRate" \
        "CurriculumAlignment-DatabaseConnections" \
        "CurriculumAlignment-ApiLatency" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Remove cost alarm in us-east-1
    AWS_DEFAULT_REGION=us-east-1 aws cloudwatch delete-alarms --alarm-names \
        "CurriculumAlignment-DailyCost" \
        --region "us-east-1" 2>/dev/null || true
}

# Main execution
main() {
    log_info "Starting CloudWatch monitoring deployment for Curriculum Alignment System"
    log_info "Region: $AWS_REGION"
    
    # Set up error handling
    trap cleanup_on_failure ERR
    
    # Execute deployment steps
    check_prerequisites
    create_sns_topics
    deploy_dashboards
    deploy_alarms
    create_custom_metrics
    verify_deployment
    
    log_success "CloudWatch monitoring deployment completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Subscribe to SNS topics for alert notifications"
    log_info "2. Configure email/SMS endpoints for alerts"
    log_info "3. Review dashboard URLs in CloudWatch console"
    log_info "4. Implement custom metrics in Lambda functions"
    log_info ""
    log_info "Dashboard URLs:"
    log_info "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=CurriculumAlignmentSystem-Overview"
    log_info "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=CurriculumAlignmentSystem-AgentPerformance"
    log_info "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=CurriculumAlignmentSystem-Costs"
    log_info "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=CurriculumAlignmentSystem-Errors"
    log_info "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=CurriculumAlignmentSystem-BusinessMetrics"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    cleanup)
        cleanup_on_failure
        log_success "Cleanup completed"
        ;;
    verify)
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|cleanup|verify}"
        echo ""
        echo "  deploy  - Deploy monitoring dashboards and alarms (default)"
        echo "  cleanup - Remove all monitoring resources"
        echo "  verify  - Verify deployment status"
        exit 1
        ;;
esac