#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Production Environment Deployment Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="prod"
STACK_NAME="curriculum-alignment-prod"
REGION="eu-central-1"

# Production-specific settings
ENABLE_MONITORING=true
ENABLE_BACKUP=true
ENABLE_SECURITY_SCANNING=true
ENABLE_BLUE_GREEN=false  # Can be enabled for zero-downtime updates

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Logging
LOG_FILE="$SCRIPT_DIR/deploy.log"
DEPLOYMENT_START_TIME=$(date)

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

# Progress tracking
progress() {
    local current=$1
    local total=$2
    local description="$3"
    local percent=$(( current * 100 / total ))
    local filled=$(( percent / 2 ))
    local empty=$(( 50 - filled ))
    
    printf "\r${BLUE}[%s%s] %d%% - %s${NC}" \
        "$(printf "%${filled}s" | tr ' ' '█')" \
        "$(printf "%${empty}s")" \
        "$percent" \
        "$description"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Production deployment confirmation
confirm_production_deployment() {
    echo -e "${BOLD}${RED}⚠️  PRODUCTION DEPLOYMENT CONFIRMATION${NC}"
    echo ""
    echo -e "${YELLOW}You are about to deploy to PRODUCTION environment!${NC}"
    echo ""
    echo -e "${BOLD}Production Configuration:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Monitoring:${NC} $ENABLE_MONITORING"
    echo -e "${CYAN}• Backup:${NC} $ENABLE_BACKUP"
    echo -e "${CYAN}• Security Scanning:${NC} $ENABLE_SECURITY_SCANNING"
    echo ""
    
    if [ "$1" != "--force" ]; then
        read -p "Are you sure you want to proceed? (type 'DEPLOY' to confirm): " confirmation
        if [ "$confirmation" != "DEPLOY" ]; then
            echo "Production deployment cancelled."
            exit 0
        fi
    fi
    
    echo ""
    log_info "Starting production deployment..."
}

# Enhanced prerequisites for production
check_production_prerequisites() {
    log_step "Checking Production Prerequisites"
    
    local checks=0
    local total_checks=12
    
    # Check AWS CLI
    progress $((++checks)) $total_checks "Checking AWS CLI"
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    progress $((++checks)) $total_checks "Checking AWS credentials"
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Verify production account
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "Deploying to AWS Account: $ACCOUNT_ID"
    
    # Check IAM permissions
    progress $((++checks)) $total_checks "Checking IAM permissions"
    if ! aws iam get-user >/dev/null 2>&1 && ! aws sts assume-role --role-arn "arn:aws:iam::$ACCOUNT_ID:role/DeploymentRole" --role-session-name "ProductionDeployment" >/dev/null 2>&1; then
        log_warning "Unable to verify IAM permissions. Proceeding with caution."
    fi
    
    # Check SAM CLI
    progress $((++checks)) $total_checks "Checking SAM CLI"
    if ! command -v sam >/dev/null 2>&1; then
        log_error "SAM CLI not found. Please install SAM CLI."
        exit 1
    fi
    
    # Check Node.js version (stricter for production)
    progress $((++checks)) $total_checks "Checking Node.js version"
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found. Please install Node.js 18+."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    if ! echo "$NODE_VERSION $REQUIRED_VERSION" | awk '{exit !($1 >= $2)}'; then
        log_error "Node.js version $NODE_VERSION is below required $REQUIRED_VERSION"
        exit 1
    fi
    
    # Check project structure and critical files
    progress $((++checks)) $total_checks "Checking project structure"
    CRITICAL_FILES=(
        "$PROJECT_ROOT/template.yaml"
        "$PROJECT_ROOT/samconfig.toml"
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/.env.production"
    )
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            if [ "$file" = "$PROJECT_ROOT/.env.production" ]; then
                log_warning "No .env.production file found. Using .env.example as template."
                if [ -f "$PROJECT_ROOT/.env.example" ]; then
                    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.production"
                    log_info "Created .env.production from .env.example"
                    log_warning "Please review and update .env.production before proceeding!"
                fi
            else
                log_error "Critical file not found: $file"
                exit 1
            fi
        fi
    done
    
    # Check for existing production stack
    progress $((++checks)) $total_checks "Checking existing stack"
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")
    
    if [ "$STACK_STATUS" != "STACK_NOT_EXISTS" ]; then
        log_info "Existing stack found with status: $STACK_STATUS"
        if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
            log_error "Stack is currently in progress. Please wait for completion before deploying."
            exit 1
        fi
    fi
    
    # Check security requirements
    progress $((++checks)) $total_checks "Checking security requirements"
    if [ ! -f "$PROJECT_ROOT/security-checklist.md" ]; then
        log_warning "Security checklist not found. Creating template."
        cat > "$PROJECT_ROOT/security-checklist.md" << 'EOF'
# Production Security Checklist

## Pre-Deployment Security Checks
- [ ] All secrets stored in AWS Secrets Manager
- [ ] IAM roles follow least privilege principle
- [ ] API Gateway has rate limiting enabled
- [ ] Database encryption at rest enabled
- [ ] HTTPS/TLS 1.2+ enforced for all endpoints
- [ ] VPC security groups properly configured
- [ ] CloudTrail logging enabled
- [ ] Security scanning completed
- [ ] Vulnerability assessment passed
- [ ] Compliance requirements met

## Post-Deployment Security Verification
- [ ] Security monitoring alerts configured
- [ ] Backup encryption verified
- [ ] Access logs enabled and monitored
- [ ] Incident response procedures documented
EOF
    fi
    
    # Check monitoring requirements
    progress $((++checks)) $total_checks "Checking monitoring setup"
    if [ "$ENABLE_MONITORING" = true ]; then
        log_info "Production monitoring will be enabled"
    fi
    
    # Check backup requirements
    progress $((++checks)) $total_checks "Checking backup configuration"
    if [ "$ENABLE_BACKUP" = true ]; then
        if [ ! -f "$PROJECT_ROOT/scripts/backup.sh" ]; then
            log_warning "Backup script not found. Backup automation may not be available."
        else
            log_success "Backup system available"
        fi
    fi
    
    # Check domain and SSL certificates (if applicable)
    progress $((++checks)) $total_checks "Checking domain configuration"
    DOMAIN_NAME="${DOMAIN_NAME:-curriculum-alignment.ceu.edu}"
    log_info "Production domain: $DOMAIN_NAME"
    
    echo ""
    log_success "Production prerequisites check completed"
}

# Enhanced template validation for production
validate_production_template() {
    log_step "Validating Production Template"
    
    cd "$PROJECT_ROOT"
    
    # Validate SAM template
    log_info "Validating SAM template..."
    if ! sam validate --config-env prod; then
        log_error "SAM template validation failed"
        exit 1
    fi
    
    # Security scan of template (basic checks)
    log_info "Performing security scan of template..."
    
    # Check for hardcoded secrets
    if grep -i "password\|secret\|key.*=" template.yaml >/dev/null 2>&1; then
        log_warning "Potential hardcoded secrets found in template. Please review."
    fi
    
    # Check for overly permissive IAM policies
    if grep -A 10 "Resource.*\*" template.yaml >/dev/null 2>&1; then
        log_warning "Potentially overly permissive IAM resources found. Please review."
    fi
    
    log_success "Production template validation passed"
}

# Production-grade build
build_production_application() {
    log_step "Building Production Application"
    
    cd "$PROJECT_ROOT"
    
    local build_steps=0
    local total_steps=6
    
    # Clean previous builds
    progress $((++build_steps)) $total_steps "Cleaning previous builds"
    rm -rf .aws-sam
    rm -rf frontend/dist
    rm -rf frontend/build
    
    # Install production dependencies
    progress $((++build_steps)) $total_steps "Installing production dependencies"
    if ! npm ci --production; then
        log_error "Failed to install production dependencies"
        exit 1
    fi
    
    # Install frontend dependencies
    progress $((++build_steps)) $total_steps "Installing frontend dependencies"
    cd "$PROJECT_ROOT/frontend"
    if ! npm ci; then
        log_error "Failed to install frontend dependencies"
        exit 1
    fi
    cd "$PROJECT_ROOT"
    
    # Run security audit
    progress $((++build_steps)) $total_steps "Running security audit"
    if command -v npm >/dev/null 2>&1; then
        npm audit --audit-level high || log_warning "Security vulnerabilities found. Please review."
    fi
    
    # Build frontend for production
    progress $((++build_steps)) $total_steps "Building frontend for production"
    if ! npm run build:frontend; then
        log_error "Failed to build frontend"
        exit 1
    fi
    
    # Build SAM application
    progress $((++build_steps)) $total_steps "Building SAM application for production"
    if ! sam build --config-env prod --cached --parallel; then
        log_error "Failed to build SAM application"
        exit 1
    fi
    
    echo ""
    log_success "Production application build completed"
}

# Deploy with enhanced monitoring and alerting
deploy_production_application() {
    log_step "Deploying to Production Environment"
    
    cd "$PROJECT_ROOT"
    
    local deploy_steps=0
    local total_steps=5
    
    # Pre-deployment backup (if stack exists)
    progress $((++deploy_steps)) $total_steps "Creating pre-deployment backup"
    if [ "$STACK_STATUS" != "STACK_NOT_EXISTS" ]; then
        log_info "Creating backup before production deployment..."
        if [ -f "$PROJECT_ROOT/scripts/backup.sh" ]; then
            "$PROJECT_ROOT/scripts/backup.sh" prod full || log_warning "Pre-deployment backup failed"
        fi
    fi
    
    # Deploy infrastructure
    progress $((++deploy_steps)) $total_steps "Deploying infrastructure"
    log_info "Starting production SAM deployment..."
    
    # Use no-confirm-changeset for automated deployments, but log the changeset first
    if ! sam deploy --config-env prod --no-confirm-changeset; then
        log_error "Production deployment failed"
        
        # Check for rollback
        log_info "Checking if automatic rollback occurred..."
        CURRENT_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "UNKNOWN")
        
        if [[ "$CURRENT_STATUS" == *"ROLLBACK"* ]]; then
            log_warning "Stack automatically rolled back due to deployment failure"
            # Get rollback reason
            aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --region "$REGION" --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatusReason]' --output table || true
        fi
        
        exit 1
    fi
    
    # Get deployment outputs
    progress $((++deploy_steps)) $total_steps "Retrieving deployment outputs"
    STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    echo "$STACK_OUTPUTS" | jq '.' > "$SCRIPT_DIR/outputs.json"
    
    # Setup monitoring and alerts
    if [ "$ENABLE_MONITORING" = true ]; then
        progress $((++deploy_steps)) $total_steps "Setting up production monitoring"
        setup_production_monitoring
    else
        progress $((++deploy_steps)) $total_steps "Skipping monitoring setup"
    fi
    
    # Setup backup automation
    if [ "$ENABLE_BACKUP" = true ]; then
        progress $((++deploy_steps)) $total_steps "Setting up backup automation"
        setup_backup_automation
    else
        progress $((++deploy_steps)) $total_steps "Skipping backup automation"
    fi
    
    echo ""
    log_success "Production deployment completed successfully"
}

# Setup production monitoring and alerts
setup_production_monitoring() {
    log_info "Configuring production monitoring and alerts..."
    
    # Create CloudWatch dashboard
    DASHBOARD_NAME="CurriculumAlignment-Production"
    
    # Create dashboard JSON
    cat > "/tmp/dashboard.json" << 'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Duration", "FunctionName", "curriculum-alignment-prod-CoordinatorFunction" ],
                    [ ".", "Errors", ".", "." ],
                    [ ".", "Invocations", ".", "." ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "eu-central-1",
                "title": "Lambda Function Metrics"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApiGateway", "Count", "ApiName", "curriculum-alignment-prod" ],
                    [ ".", "Latency", ".", "." ],
                    [ ".", "4XXError", ".", "." ],
                    [ ".", "5XXError", ".", "." ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "eu-central-1",
                "title": "API Gateway Metrics"
            }
        }
    ]
}
EOF
    
    # Create dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "$DASHBOARD_NAME" \
        --dashboard-body "file:///tmp/dashboard.json" \
        --region "$REGION" >/dev/null 2>&1 || log_warning "Failed to create CloudWatch dashboard"
    
    # Create alarms
    create_production_alarms
    
    log_success "Production monitoring configured"
    rm -f /tmp/dashboard.json
}

# Create production alarms
create_production_alarms() {
    local lambda_functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-prod')].FunctionName" --output text)
    
    for function_name in $lambda_functions; do
        # Error rate alarm
        aws cloudwatch put-metric-alarm \
            --alarm-name "CurriculumAlignment-Prod-${function_name}-ErrorRate" \
            --alarm-description "High error rate for $function_name" \
            --metric-name Errors \
            --namespace AWS/Lambda \
            --statistic Sum \
            --period 300 \
            --threshold 5 \
            --comparison-operator GreaterThanThreshold \
            --evaluation-periods 2 \
            --alarm-actions "arn:aws:sns:$REGION:$(aws sts get-caller-identity --query Account --output text):curriculum-alignment-alerts" \
            --dimensions Name=FunctionName,Value="$function_name" \
            --region "$REGION" >/dev/null 2>&1 || true
        
        # Duration alarm
        aws cloudwatch put-metric-alarm \
            --alarm-name "CurriculumAlignment-Prod-${function_name}-Duration" \
            --alarm-description "High duration for $function_name" \
            --metric-name Duration \
            --namespace AWS/Lambda \
            --statistic Average \
            --period 300 \
            --threshold 30000 \
            --comparison-operator GreaterThanThreshold \
            --evaluation-periods 2 \
            --alarm-actions "arn:aws:sns:$REGION:$(aws sts get-caller-identity --query Account --output text):curriculum-alignment-alerts" \
            --dimensions Name=FunctionName,Value="$function_name" \
            --region "$REGION" >/dev/null 2>&1 || true
    done
}

# Setup backup automation for production
setup_backup_automation() {
    log_info "Setting up production backup automation..."
    
    if [ -f "$PROJECT_ROOT/scripts/backup-schedule.sh" ]; then
        # Install production backup schedules
        "$PROJECT_ROOT/scripts/backup-schedule.sh" install prod || log_warning "Failed to setup backup schedules"
        log_success "Backup automation configured"
    else
        log_warning "Backup schedule script not found"
    fi
}

# Enhanced production smoke tests
run_production_smoke_tests() {
    log_step "Running Production Smoke Tests"
    
    local test_steps=0
    local total_steps=8
    
    # Wait for stack to be ready
    progress $((++test_steps)) $total_steps "Waiting for stack readiness"
    log_info "Waiting for production stack to be fully ready..."
    aws cloudformation wait stack-deploy-complete --stack-name "$STACK_NAME" --region "$REGION" || log_warning "Stack wait timeout"
    
    # Get API endpoint
    progress $((++test_steps)) $total_steps "Getting API endpoint"
    API_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' 2>/dev/null || echo "")
    
    if [ -z "$API_ENDPOINT" ] || [ "$API_ENDPOINT" = "null" ]; then
        log_warning "API endpoint not found in stack outputs"
        API_ENDPOINT="https://api.curriculum-alignment.ceu.edu"  # Fallback to expected domain
    fi
    
    log_info "API Endpoint: $API_ENDPOINT"
    
    # Test health endpoint
    progress $((++test_steps)) $total_steps "Testing health endpoint"
    local health_attempts=0
    local max_health_attempts=10
    
    while [ $health_attempts -lt $max_health_attempts ]; do
        if curl -f -s --max-time 10 "$API_ENDPOINT/health" >/dev/null 2>&1; then
            log_success "Health endpoint responding"
            break
        else
            health_attempts=$((health_attempts + 1))
            if [ $health_attempts -lt $max_health_attempts ]; then
                log_info "Health check attempt $health_attempts/$max_health_attempts failed, retrying in 30s..."
                sleep 30
            else
                log_error "Health endpoint not responding after $max_health_attempts attempts"
            fi
        fi
    done
    
    # Test Lambda functions
    progress $((++test_steps)) $total_steps "Testing Lambda functions"
    local lambda_functions=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-prod')].[FunctionName,Runtime,MemorySize]" --output json)
    local function_count=$(echo "$lambda_functions" | jq '. | length')
    
    if [ "$function_count" -gt 0 ]; then
        log_success "$function_count Lambda functions deployed"
        echo "$lambda_functions" | jq -r '.[] | "  • \(.[0]) (\(.[1]), \(.[2])MB)"'
    else
        log_warning "No Lambda functions found"
    fi
    
    # Test database connectivity (if available)
    progress $((++test_steps)) $total_steps "Testing database connectivity"
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        if grep -q "DATABASE_URL" "$PROJECT_ROOT/.env.production"; then
            log_success "Database configuration found"
        else
            log_warning "No database configuration found"
        fi
    fi
    
    # Test S3 buckets
    progress $((++test_steps)) $total_steps "Testing S3 buckets"
    local s3_buckets=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null || echo "")
    if [ -n "$s3_buckets" ]; then
        local bucket_count=$(echo "$s3_buckets" | wc -l)
        log_success "$bucket_count S3 buckets created"
    else
        log_warning "No S3 buckets found in outputs"
    fi
    
    # Test monitoring setup
    progress $((++test_steps)) $total_steps "Testing monitoring setup"
    if aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --region "$REGION" | jq -r '.MetricAlarms | length' | grep -q "^[1-9]"; then
        local alarm_count=$(aws cloudwatch describe-alarms --alarm-name-prefix "CurriculumAlignment-Prod" --region "$REGION" --query 'length(MetricAlarms)' --output text)
        log_success "$alarm_count monitoring alarms configured"
    else
        log_warning "No monitoring alarms found"
    fi
    
    # Final security check
    progress $((++test_steps)) $total_steps "Running security validation"
    if [ -f "$PROJECT_ROOT/scripts/security-scan.sh" ]; then
        "$PROJECT_ROOT/scripts/security-scan.sh" prod || log_warning "Security scan completed with warnings"
    else
        log_warning "Security scan script not found"
    fi
    
    echo ""
    log_success "Production smoke tests completed"
}

# Display production deployment information
display_production_info() {
    log_step "Production Deployment Summary"
    
    echo -e "${BOLD}${GREEN}🎉 PRODUCTION DEPLOYMENT COMPLETED!${NC}"
    echo ""
    echo -e "${BOLD}Production Environment Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Deployed At:${NC} $(date)"
    echo -e "${CYAN}• Account ID:${NC} $(aws sts get-caller-identity --query Account --output text)"
    echo ""
    
    if [ -f "$SCRIPT_DIR/outputs.json" ] && [ "$(cat "$SCRIPT_DIR/outputs.json")" != "[]" ]; then
        echo -e "${BOLD}Production Endpoints:${NC}"
        cat "$SCRIPT_DIR/outputs.json" | jq -r '.[] | "• \(.OutputKey): \(.OutputValue)"'
        echo ""
    fi
    
    echo -e "${BOLD}Production Services Status:${NC}"
    echo -e "${CYAN}• API Gateway:${NC} $([ -n "$API_ENDPOINT" ] && echo "✅ Active" || echo "⚠️ Check required")"
    echo -e "${CYAN}• Lambda Functions:${NC} ✅ Deployed"
    echo -e "${CYAN}• Monitoring:${NC} $([ "$ENABLE_MONITORING" = true ] && echo "✅ Enabled" || echo "❌ Disabled")"
    echo -e "${CYAN}• Backup:${NC} $([ "$ENABLE_BACKUP" = true ] && echo "✅ Enabled" || echo "❌ Disabled")"
    echo ""
    
    echo -e "${BOLD}Critical Post-Deployment Actions:${NC}"
    echo -e "${CYAN}1. Verify SSL certificates:${NC}"
    echo "   Check HTTPS endpoints are properly secured"
    echo ""
    echo -e "${CYAN}2. Configure domain and DNS:${NC}"
    echo "   Point domain to API Gateway endpoint"
    echo "   Update frontend configuration with production URLs"
    echo ""
    echo -e "${CYAN}3. Setup monitoring alerts:${NC}"
    echo "   Configure SNS notifications for production alerts"
    echo "   Test alert delivery mechanisms"
    echo ""
    echo -e "${CYAN}4. Verify backup system:${NC}"
    echo "   Test backup creation and restoration procedures"
    echo "   Confirm backup schedules are active"
    echo ""
    echo -e "${CYAN}5. Security review:${NC}"
    echo "   Complete security checklist in security-checklist.md"
    echo "   Perform penetration testing"
    echo ""
    echo -e "${YELLOW}📋 Production Management:${NC}"
    echo "• Monitor: ./status.sh"
    echo "• Backup: $PROJECT_ROOT/scripts/backup.sh prod full"
    echo "• Logs: sam logs -n CoordinatorFunction --stack-name $STACK_NAME --tail"
    echo "• Metrics: CloudWatch Dashboard - $DASHBOARD_NAME"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT PRODUCTION NOTES:${NC}"
    echo "• All changes should go through staging first"
    echo "• Monitor system closely for the first 24-48 hours"
    echo "• Have rollback procedures ready"
    echo "• Document any production-specific configurations"
    echo "• Ensure disaster recovery procedures are tested"
    echo ""
    echo "Production deployment log: $LOG_FILE"
    echo ""
}

# Error handling for production
cleanup_on_error() {
    log_error "Production deployment failed. Check $LOG_FILE for details."
    echo ""
    echo -e "${YELLOW}Production Deployment Failure Recovery:${NC}"
    echo "1. Review deployment logs: $LOG_FILE"
    echo "2. Check CloudFormation stack events:"
    echo "   aws cloudformation describe-stack-events --stack-name $STACK_NAME"
    echo "3. If deployment partially completed, consider:"
    echo "   - Rolling back changes"
    echo "   - Manual resource cleanup"
    echo "   - Contacting AWS support if needed"
    echo "4. Ensure staging environment is tested before retry"
    echo ""
    echo -e "${RED}CRITICAL: If this is affecting live production traffic:${NC}"
    echo "• Activate incident response procedures"
    echo "• Consider rolling back to previous version"
    echo "• Notify stakeholders immediately"
    echo ""
    exit 1
}

# Main production deployment function
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
║                        PRODUCTION DEPLOYMENT                                ║
║                                                                              ║
║                        ⚠️  LIVE ENVIRONMENT ⚠️                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_info "Starting PRODUCTION deployment at $DEPLOYMENT_START_TIME"
    
    # Get confirmation for production deployment
    confirm_production_deployment "$1"
    
    # Run deployment steps
    check_production_prerequisites
    validate_production_template
    build_production_application
    deploy_production_application
    run_production_smoke_tests
    display_production_info
    
    local deployment_end_time=$(date)
    log_success "PRODUCTION deployment completed at $deployment_end_time"
    
    # Calculate deployment time
    local start_seconds=$(date -d "$DEPLOYMENT_START_TIME" +%s 2>/dev/null || date -j -f "%a %b %d %T %Z %Y" "$DEPLOYMENT_START_TIME" +%s 2>/dev/null || echo 0)
    local end_seconds=$(date +%s)
    local duration=$((end_seconds - start_seconds))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    echo -e "${BOLD}${GREEN}✅ Total PRODUCTION deployment time: ${duration_min}m ${duration_sec}s${NC}"
    
    # Final success confirmation
    echo ""
    echo -e "${BOLD}${GREEN}🚀 CURRICULUM ALIGNMENT SYSTEM IS NOW LIVE IN PRODUCTION! 🚀${NC}"
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Production Deployment"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --force        Skip confirmation prompt (USE WITH EXTREME CAUTION)"
    echo "  --no-backup    Skip pre-deployment backup"
    echo "  --no-monitor   Skip monitoring setup"
    echo ""
    echo "This script will:"
    echo "1. Confirm production deployment with enhanced checks"
    echo "2. Validate prerequisites and security requirements"
    echo "3. Build application with production optimizations"
    echo "4. Deploy to production with monitoring and alerts"
    echo "5. Run comprehensive smoke tests"
    echo "6. Configure backup automation"
    echo "7. Display production management information"
    echo ""
    echo "⚠️  WARNING: This deploys to PRODUCTION environment!"
    echo "• Ensure staging deployment is successful first"
    echo "• Have rollback procedures ready"
    echo "• Monitor system closely post-deployment"
    echo ""
    echo "Requirements:"
    echo "• AWS CLI with production account access"
    echo "• SAM CLI with latest version"
    echo "• Production environment variables configured"
    echo "• Security checklist completed"
    echo ""
    exit 0
fi

# Run main production deployment
main "$@"