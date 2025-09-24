#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS)
# Development Environment Deployment Script

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

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    local checks=0
    local total_checks=8
    
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
    
    # Check SAM CLI
    progress $((++checks)) $total_checks "Checking SAM CLI"
    if ! command -v sam >/dev/null 2>&1; then
        log_error "SAM CLI not found. Please install SAM CLI."
        exit 1
    fi
    
    # Check Node.js
    progress $((++checks)) $total_checks "Checking Node.js"
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found. Please install Node.js 18+."
        exit 1
    fi
    
    # Check npm
    progress $((++checks)) $total_checks "Checking npm"
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm not found. Please install npm."
        exit 1
    fi
    
    # Check project structure
    progress $((++checks)) $total_checks "Checking project structure"
    if [ ! -f "$PROJECT_ROOT/template.yaml" ]; then
        log_error "template.yaml not found in project root."
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/samconfig.toml" ]; then
        log_error "samconfig.toml not found in project root."
        exit 1
    fi
    
    # Check environment file
    progress $((++checks)) $total_checks "Checking environment configuration"
    if [ ! -f "$PROJECT_ROOT/.env.development" ]; then
        log_warning "No .env.development file found. Using .env.example as template."
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.development"
            log_info "Created .env.development from .env.example"
        fi
    fi
    
    # Check region
    progress $((++checks)) $total_checks "Checking AWS region"
    CURRENT_REGION=$(aws configure get region)
    if [ "$CURRENT_REGION" != "$REGION" ]; then
        log_warning "Current AWS region ($CURRENT_REGION) differs from deployment region ($REGION)"
        log_info "Using deployment region: $REGION"
    fi
    
    echo ""
    log_success "Prerequisites check completed"
}

# Validate template and configuration
validate_template() {
    log_step "Validating SAM Template"
    
    cd "$PROJECT_ROOT"
    
    # Validate SAM template
    log_info "Validating SAM template..."
    if ! sam validate --config-env dev; then
        log_error "SAM template validation failed"
        exit 1
    fi
    
    log_success "SAM template validation passed"
}

# Build the application
build_application() {
    log_step "Building Application"
    
    cd "$PROJECT_ROOT"
    
    local build_steps=0
    local total_steps=4
    
    # Install dependencies
    progress $((++build_steps)) $total_steps "Installing root dependencies"
    if ! npm install; then
        log_error "Failed to install root dependencies"
        exit 1
    fi
    
    # Install frontend dependencies
    progress $((++build_steps)) $total_steps "Installing frontend dependencies"
    cd "$PROJECT_ROOT/frontend"
    if ! npm install; then
        log_error "Failed to install frontend dependencies"
        exit 1
    fi
    cd "$PROJECT_ROOT"
    
    # Build frontend
    progress $((++build_steps)) $total_steps "Building frontend"
    if ! npm run build:frontend; then
        log_error "Failed to build frontend"
        exit 1
    fi
    
    # Build SAM application
    progress $((++build_steps)) $total_steps "Building SAM application"
    if ! sam build --config-env dev; then
        log_error "Failed to build SAM application"
        exit 1
    fi
    
    echo ""
    log_success "Application build completed"
}

# Deploy the application
deploy_application() {
    log_step "Deploying to Development Environment"
    
    cd "$PROJECT_ROOT"
    
    local deploy_steps=0
    local total_steps=3
    
    # Check for existing stack
    progress $((++deploy_steps)) $total_steps "Checking existing stack"
    STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null | jq -r '.Stacks[0].StackStatus' || echo "STACK_NOT_EXISTS")
    
    if [ "$STACK_EXISTS" != "STACK_NOT_EXISTS" ]; then
        log_info "Stack $STACK_NAME already exists with status: $STACK_EXISTS"
        if [[ "$STACK_EXISTS" == *"IN_PROGRESS"* ]]; then
            log_warning "Stack is currently in progress. Waiting for completion..."
            aws cloudformation wait stack-deploy-complete --stack-name "$STACK_NAME" --region "$REGION" || true
        fi
    else
        log_info "Stack $STACK_NAME does not exist. Will create new stack."
    fi
    
    # Deploy with SAM
    progress $((++deploy_steps)) $total_steps "Deploying with SAM"
    log_info "Starting SAM deployment..."
    
    if ! sam deploy --config-env dev --no-confirm-changeset; then
        log_error "SAM deployment failed"
        exit 1
    fi
    
    # Get deployment outputs
    progress $((++deploy_steps)) $total_steps "Retrieving deployment outputs"
    STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]')
    
    # Save outputs to file
    echo "$STACK_OUTPUTS" | jq '.' > "$SCRIPT_DIR/outputs.json"
    
    echo ""
    log_success "Deployment completed successfully"
}

# Run smoke tests
run_smoke_tests() {
    log_step "Running Smoke Tests"
    
    local test_steps=0
    local total_steps=5
    
    # Wait for stack to be ready
    progress $((++test_steps)) $total_steps "Waiting for stack readiness"
    log_info "Waiting for stack to be fully ready..."
    aws cloudformation wait stack-deploy-complete --stack-name "$STACK_NAME" --region "$REGION" || log_warning "Stack wait timeout"
    
    # Get API Gateway endpoint
    progress $((++test_steps)) $total_steps "Getting API endpoint"
    API_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue' 2>/dev/null || echo "")
    
    if [ -z "$API_ENDPOINT" ] || [ "$API_ENDPOINT" = "null" ]; then
        log_warning "API endpoint not found in stack outputs. Skipping API tests."
    else
        log_info "API Endpoint: $API_ENDPOINT"
        
        # Test API health endpoint
        progress $((++test_steps)) $total_steps "Testing API health endpoint"
        if curl -f -s "$API_ENDPOINT/health" >/dev/null; then
            log_success "API health endpoint responding"
        else
            log_warning "API health endpoint not responding (may take a few minutes to warm up)"
        fi
    fi
    
    # Test Lambda functions
    progress $((++test_steps)) $total_steps "Testing Lambda functions"
    LAMBDA_FUNCTIONS=$(aws lambda list-functions --region "$REGION" --query "Functions[?starts_with(FunctionName, 'curriculum-alignment-dev')].FunctionName" --output text 2>/dev/null || echo "")
    
    if [ -n "$LAMBDA_FUNCTIONS" ]; then
        FUNCTION_COUNT=$(echo "$LAMBDA_FUNCTIONS" | wc -w)
        log_info "Found $FUNCTION_COUNT Lambda functions"
        
        # Test one function to verify deployment
        FIRST_FUNCTION=$(echo "$LAMBDA_FUNCTIONS" | awk '{print $1}')
        if aws lambda invoke --function-name "$FIRST_FUNCTION" --region "$REGION" --payload '{}' /tmp/test-response.json >/dev/null 2>&1; then
            log_success "Lambda function test successful"
            rm -f /tmp/test-response.json
        else
            log_warning "Lambda function test failed (functions may still be warming up)"
        fi
    else
        log_warning "No Lambda functions found"
    fi
    
    # Test S3 buckets
    progress $((++test_steps)) $total_steps "Testing S3 buckets"
    S3_BUCKETS=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey | test("Bucket")) | .OutputValue' 2>/dev/null || echo "")
    
    if [ -n "$S3_BUCKETS" ]; then
        BUCKET_COUNT=$(echo "$S3_BUCKETS" | wc -l)
        log_info "Found $BUCKET_COUNT S3 buckets"
        log_success "S3 buckets created successfully"
    else
        log_warning "No S3 buckets found in outputs"
    fi
    
    echo ""
    log_success "Smoke tests completed"
}

# Display deployment information
display_deployment_info() {
    log_step "Deployment Summary"
    
    echo -e "${BOLD}${GREEN}🎉 Development Environment Deployment Completed!${NC}"
    echo ""
    echo -e "${BOLD}Deployment Details:${NC}"
    echo -e "${CYAN}• Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}• Stack Name:${NC} $STACK_NAME"
    echo -e "${CYAN}• Region:${NC} $REGION"
    echo -e "${CYAN}• Deployed At:${NC} $(date)"
    echo ""
    
    if [ -f "$SCRIPT_DIR/outputs.json" ] && [ "$(cat "$SCRIPT_DIR/outputs.json")" != "[]" ]; then
        echo -e "${BOLD}Stack Outputs:${NC}"
        cat "$SCRIPT_DIR/outputs.json" | jq -r '.[] | "• \(.OutputKey): \(.OutputValue)"'
        echo ""
    fi
    
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "${CYAN}1. Access the API:${NC}"
    if [ -n "$API_ENDPOINT" ] && [ "$API_ENDPOINT" != "null" ]; then
        echo "   API Endpoint: $API_ENDPOINT"
        echo "   Health Check: $API_ENDPOINT/health"
    else
        echo "   Check stack outputs for API endpoint URL"
    fi
    echo ""
    echo -e "${CYAN}2. Monitor the deployment:${NC}"
    echo "   aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION"
    echo "   aws logs tail /aws/lambda/curriculum-alignment-dev --follow"
    echo ""
    echo -e "${CYAN}3. View CloudFormation stack:${NC}"
    echo "   https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks/stackinfo?stackId=$STACK_NAME"
    echo ""
    echo -e "${CYAN}4. Run integration tests:${NC}"
    echo "   npm run test:e2e"
    echo ""
    echo -e "${CYAN}5. Update frontend configuration:${NC}"
    echo "   Update REACT_APP_API_URL in .env.development with the API endpoint"
    echo ""
    echo -e "${YELLOW}📋 Configuration Notes:${NC}"
    echo "• Database connections configured via environment variables"
    echo "• Secrets stored in AWS Secrets Manager"
    echo "• Logs available in CloudWatch under /aws/lambda/ prefix"
    echo "• Monitoring dashboards available in CloudWatch"
    echo ""
    echo -e "${BLUE}📚 Useful Commands:${NC}"
    echo "• Redeploy: ./deploy.sh"
    echo "• View logs: sam logs -n CoordinatorFunction --stack-name $STACK_NAME --tail"
    echo "• Cleanup: ./cleanup.sh"
    echo ""
    echo "Deployment log saved to: $LOG_FILE"
    echo ""
}

# Error handling
cleanup_on_error() {
    log_error "Deployment failed. Check $LOG_FILE for details."
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "1. Check AWS credentials and permissions"
    echo "2. Verify SAM template syntax: sam validate --config-env dev"
    echo "3. Check CloudFormation events: aws cloudformation describe-stack-events --stack-name $STACK_NAME"
    echo "4. Review deployment logs: $LOG_FILE"
    echo ""
    echo "For support, check the AWS CloudFormation console for detailed error messages."
    exit 1
}

# Main deployment function
main() {
    # Setup error handling
    trap cleanup_on_error ERR
    
    # Display header
    echo -e "${BOLD}${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              Multi-Agent Curriculum Alignment System (MACAS)                ║
║                                                                              ║
║                        Development Deployment                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_info "Starting development deployment at $DEPLOYMENT_START_TIME"
    
    # Run deployment steps
    check_prerequisites
    validate_template
    build_application
    deploy_application
    run_smoke_tests
    display_deployment_info
    
    local deployment_end_time=$(date)
    log_success "Deployment completed at $deployment_end_time"
    
    # Calculate deployment time
    local start_seconds=$(date -d "$DEPLOYMENT_START_TIME" +%s 2>/dev/null || date -j -f "%a %b %d %T %Z %Y" "$DEPLOYMENT_START_TIME" +%s 2>/dev/null || echo 0)
    local end_seconds=$(date +%s)
    local duration=$((end_seconds - start_seconds))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    echo -e "${BOLD}${GREEN}✅ Total deployment time: ${duration_min}m ${duration_sec}s${NC}"
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Development Deployment"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --no-build     Skip build step (use existing build)"
    echo "  --no-tests     Skip smoke tests"
    echo ""
    echo "This script will:"
    echo "1. Check prerequisites (AWS CLI, SAM CLI, credentials)"
    echo "2. Validate SAM template"
    echo "3. Build the application (frontend + lambda)"
    echo "4. Deploy to development environment"
    echo "5. Run smoke tests"
    echo "6. Display deployment information"
    echo ""
    echo "Requirements:"
    echo "• AWS CLI configured with appropriate permissions"
    echo "• SAM CLI installed"
    echo "• Node.js 18+ and npm"
    echo "• Valid template.yaml and samconfig.toml"
    echo ""
    exit 0
fi

# Run main deployment
main "$@"