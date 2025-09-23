#!/bin/bash

# Multi-Agent Curriculum Alignment System - Agent Deployment Script
# This script deploys all agents with blue-green deployment strategy

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_CONFIG_FILE="${PROJECT_ROOT}/.deployment-config"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="deploy_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME_PREFIX="${STACK_NAME_PREFIX:-curriculum-alignment}"
BLUE_GREEN="${BLUE_GREEN:-true}"
RUN_TESTS="${RUN_TESTS:-true}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-1800}"  # 30 minutes
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"  # 5 minutes

# Agent list - all agents that need deployment
AGENTS=(
    "coordinator"
    "web-search" 
    "browser"
    "document-processing"
    "accreditation-expert"
    "qa-agent"
    "semantic-search"
    "chat-interface"
    "dlq-handler"
)

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Error handling
error_exit() {
    log_error "$1"
    cleanup_on_error
    exit 1
}

cleanup_on_error() {
    log_warning "Cleaning up failed deployment..."
    
    # Remove temporary files
    rm -f /tmp/deploy-*.json /tmp/agent-*.zip
    
    # If blue-green deployment failed, ensure we're back to stable state
    if [[ "$BLUE_GREEN" == "true" && -n "${CURRENT_STACK:-}" ]]; then
        log "Rolling back to stable version: $CURRENT_STACK"
        switch_traffic_to_stack "$CURRENT_STACK" 2>/dev/null || true
    fi
}

# Trap for cleanup
trap cleanup_on_error ERR

# Help function
show_help() {
    cat << EOF
Multi-Agent Curriculum Alignment System - Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -e, --environment ENV   Target environment (dev, staging, prod) [default: dev]
    -r, --region REGION     AWS region [default: us-east-1]
    -a, --agent AGENT       Deploy specific agent only
    -s, --stack-prefix NAME Stack name prefix [default: curriculum-alignment]
    --no-blue-green         Disable blue-green deployment
    --no-tests              Skip running tests
    --timeout SECONDS       Deployment timeout [default: 1800]
    --dry-run               Show what would be deployed without executing
    --force                 Force deployment even if no changes detected

Examples:
    $0                                    # Deploy all agents to dev
    $0 -e prod -r us-west-2              # Deploy to production in us-west-2
    $0 -a coordinator                     # Deploy only coordinator agent
    $0 --no-blue-green --no-tests        # Quick deployment without safety features

Environment Variables:
    AWS_PROFILE             AWS profile to use
    ENVIRONMENT             Target environment
    AWS_REGION              AWS region
    STACK_NAME_PREFIX       Stack name prefix
    BLUE_GREEN              Enable blue-green deployment (true/false)
    RUN_TESTS               Run tests before deployment (true/false)
    
EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            -a|--agent)
                DEPLOY_SINGLE_AGENT="$2"
                shift 2
                ;;
            -s|--stack-prefix)
                STACK_NAME_PREFIX="$2"
                shift 2
                ;;
            --no-blue-green)
                BLUE_GREEN="false"
                shift
                ;;
            --no-tests)
                RUN_TESTS="false"
                shift
                ;;
            --timeout)
                DEPLOY_TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --force)
                FORCE_DEPLOY="true"
                shift
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("aws" "sam" "npm" "jq" "zip")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured or invalid"
    fi
    
    # Check SAM CLI version
    local sam_version
    sam_version=$(sam --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [[ -z "$sam_version" ]]; then
        error_exit "Unable to determine SAM CLI version"
    fi
    
    # Check if environment-specific config exists
    local env_config="${PROJECT_ROOT}/config/${ENVIRONMENT}.json"
    if [[ ! -f "$env_config" ]]; then
        error_exit "Environment configuration not found: $env_config"
    fi
    
    # Validate agent directories
    for agent in "${AGENTS[@]}"; do
        if [[ ! -d "${PROJECT_ROOT}/lambda/${agent}" ]]; then
            error_exit "Agent directory not found: lambda/${agent}"
        fi
    done
    
    log_success "Prerequisites validated"
}

# Build agents
build_agents() {
    log "Building agents..."
    
    # Build TypeScript
    cd "$PROJECT_ROOT"
    
    if [[ "$RUN_TESTS" == "true" ]]; then
        log "Running tests..."
        npm run test:agents || error_exit "Tests failed"
        log_success "All tests passed"
    fi
    
    # Type check
    log "Running type check..."
    npm run typecheck || error_exit "Type check failed"
    log_success "Type check passed"
    
    # Build project
    log "Building project..."
    npm run build || error_exit "Build failed"
    log_success "Build completed"
    
    # Package each agent
    for agent in "${AGENTS[@]}"; do
        if [[ -n "${DEPLOY_SINGLE_AGENT:-}" && "$agent" != "$DEPLOY_SINGLE_AGENT" ]]; then
            continue
        fi
        
        log "Packaging agent: $agent"
        package_agent "$agent"
    done
    
    log_success "All agents built and packaged"
}

# Package individual agent
package_agent() {
    local agent="$1"
    local agent_dir="${PROJECT_ROOT}/lambda/${agent}"
    local package_file="/tmp/agent-${agent}-${TIMESTAMP}.zip"
    
    # Create package directory
    local temp_dir="/tmp/package-${agent}-${TIMESTAMP}"
    mkdir -p "$temp_dir"
    
    # Copy agent files
    cp -r "${agent_dir}/"* "$temp_dir/"
    
    # Copy shared dependencies
    if [[ -d "${PROJECT_ROOT}/src" ]]; then
        mkdir -p "${temp_dir}/src"
        cp -r "${PROJECT_ROOT}/src/"* "${temp_dir}/src/"
    fi
    
    # Copy node_modules (production only)
    if [[ -d "${PROJECT_ROOT}/node_modules" ]]; then
        mkdir -p "${temp_dir}/node_modules"
        # Only copy production dependencies
        cd "$PROJECT_ROOT"
        npm install --production --prefix "$temp_dir"
    fi
    
    # Create ZIP package
    cd "$temp_dir"
    zip -r "$package_file" . -x "*.test.*" "*.spec.*" > /dev/null
    
    # Cleanup temp directory
    rm -rf "$temp_dir"
    
    log_success "Agent $agent packaged: $package_file"
    echo "$package_file"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure..."
    
    local stack_name="${STACK_NAME_PREFIX}-infrastructure-${ENVIRONMENT}"
    local template_file="${PROJECT_ROOT}/infrastructure/template.yaml"
    local params_file="${PROJECT_ROOT}/config/${ENVIRONMENT}.json"
    
    if [[ ! -f "$template_file" ]]; then
        error_exit "Infrastructure template not found: $template_file"
    fi
    
    # Deploy with SAM
    sam deploy \
        --template-file "$template_file" \
        --stack-name "$stack_name" \
        --parameter-overrides "$(jq -r '.Parameters | to_entries | map("\(.key)=\(.value)") | join(" ")' "$params_file")" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" \
        --no-fail-on-empty-changeset \
        --no-confirm-changeset \
        ${DRY_RUN:+--no-execute-changeset} \
        || error_exit "Infrastructure deployment failed"
    
    log_success "Infrastructure deployed"
}

# Deploy agents with blue-green strategy
deploy_agents_blue_green() {
    log "Starting blue-green deployment..."
    
    # Get current active stack
    CURRENT_STACK=$(get_active_stack)
    local new_color
    
    if [[ "$CURRENT_STACK" == *"-blue" ]]; then
        new_color="green"
    else
        new_color="blue"
    fi
    
    local new_stack="${STACK_NAME_PREFIX}-agents-${new_color}-${ENVIRONMENT}"
    
    log "Deploying to $new_color environment: $new_stack"
    
    # Deploy to new color
    deploy_agent_stack "$new_stack"
    
    # Health check new deployment
    if ! health_check_stack "$new_stack"; then
        error_exit "Health check failed for new deployment"
    fi
    
    # Switch traffic
    switch_traffic_to_stack "$new_stack"
    
    # Final health check
    if ! health_check_stack "$new_stack"; then
        error_exit "Health check failed after traffic switch"
    fi
    
    # Clean up old stack (if exists and different)
    if [[ -n "$CURRENT_STACK" && "$CURRENT_STACK" != "$new_stack" ]]; then
        log "Cleaning up old stack: $CURRENT_STACK"
        cleanup_old_stack "$CURRENT_STACK"
    fi
    
    log_success "Blue-green deployment completed successfully"
}

# Deploy agents without blue-green
deploy_agents_direct() {
    log "Starting direct deployment..."
    
    local stack_name="${STACK_NAME_PREFIX}-agents-${ENVIRONMENT}"
    
    deploy_agent_stack "$stack_name"
    
    if ! health_check_stack "$stack_name"; then
        error_exit "Health check failed for deployment"
    fi
    
    log_success "Direct deployment completed successfully"
}

# Deploy agent stack
deploy_agent_stack() {
    local stack_name="$1"
    local template_file="${PROJECT_ROOT}/template.yaml"
    local params_file="${PROJECT_ROOT}/config/${ENVIRONMENT}.json"
    
    log "Deploying agent stack: $stack_name"
    
    # Build SAM parameters
    local sam_params=""
    if [[ -f "$params_file" ]]; then
        sam_params="--parameter-overrides $(jq -r '.Parameters | to_entries | map("\(.key)=\(.value)") | join(" ")' "$params_file")"
    fi
    
    # Add deployment-specific parameters
    sam_params="$sam_params Environment=${ENVIRONMENT} DeploymentId=${DEPLOYMENT_ID}"
    
    # Deploy with timeout
    timeout "$DEPLOY_TIMEOUT" sam deploy \
        --template-file "$template_file" \
        --stack-name "$stack_name" \
        $sam_params \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" \
        --no-fail-on-empty-changeset \
        --no-confirm-changeset \
        ${DRY_RUN:+--no-execute-changeset} \
        || error_exit "Agent stack deployment failed: $stack_name"
    
    log_success "Agent stack deployed: $stack_name"
}

# Get currently active stack
get_active_stack() {
    local alias_name="${STACK_NAME_PREFIX}-agents-active-${ENVIRONMENT}"
    
    aws lambda get-alias \
        --function-name "${STACK_NAME_PREFIX}-coordinator-${ENVIRONMENT}" \
        --name "$alias_name" \
        --region "$AWS_REGION" \
        --query 'FunctionVersion' \
        --output text 2>/dev/null || echo ""
}

# Health check stack
health_check_stack() {
    local stack_name="$1"
    local timeout=${HEALTH_CHECK_TIMEOUT}
    local interval=10
    local elapsed=0
    
    log "Performing health check for stack: $stack_name"
    
    while [[ $elapsed -lt $timeout ]]; do
        local healthy_count=0
        local total_agents=${#AGENTS[@]}
        
        if [[ -n "${DEPLOY_SINGLE_AGENT:-}" ]]; then
            total_agents=1
        fi
        
        for agent in "${AGENTS[@]}"; do
            if [[ -n "${DEPLOY_SINGLE_AGENT:-}" && "$agent" != "$DEPLOY_SINGLE_AGENT" ]]; then
                continue
            fi
            
            if check_agent_health "$stack_name" "$agent"; then
                ((healthy_count++))
            fi
        done
        
        log "Health check progress: $healthy_count/$total_agents agents healthy"
        
        if [[ $healthy_count -eq $total_agents ]]; then
            log_success "All agents are healthy"
            return 0
        fi
        
        sleep $interval
        ((elapsed += interval))
    done
    
    log_error "Health check timed out after ${timeout}s"
    return 1
}

# Check individual agent health
check_agent_health() {
    local stack_name="$1"
    local agent="$2"
    local function_name="${stack_name}-${agent}"
    
    # Get function status
    local status
    status=$(aws lambda get-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Configuration.State' \
        --output text 2>/dev/null) || return 1
    
    if [[ "$status" != "Active" ]]; then
        return 1
    fi
    
    # Test function invocation
    local test_payload='{"httpMethod":"GET","pathParameters":{"action":"health-check"}}'
    local response
    response=$(aws lambda invoke \
        --function-name "$function_name" \
        --payload "$test_payload" \
        --region "$AWS_REGION" \
        /tmp/health-check-response.json 2>/dev/null) || return 1
    
    # Check response
    local status_code
    status_code=$(jq -r '.statusCode' /tmp/health-check-response.json 2>/dev/null) || return 1
    
    [[ "$status_code" == "200" ]]
}

# Switch traffic to new stack
switch_traffic_to_stack() {
    local stack_name="$1"
    
    log "Switching traffic to stack: $stack_name"
    
    # Update Lambda aliases to point to new versions
    for agent in "${AGENTS[@]}"; do
        if [[ -n "${DEPLOY_SINGLE_AGENT:-}" && "$agent" != "$DEPLOY_SINGLE_AGENT" ]]; then
            continue
        fi
        
        local function_name="${stack_name}-${agent}"
        local alias_name="${STACK_NAME_PREFIX}-${agent}-active-${ENVIRONMENT}"
        
        # Get latest version
        local version
        version=$(aws lambda get-function \
            --function-name "$function_name" \
            --region "$AWS_REGION" \
            --query 'Configuration.Version' \
            --output text)
        
        # Update or create alias
        aws lambda update-alias \
            --function-name "$function_name" \
            --name "$alias_name" \
            --function-version "$version" \
            --region "$AWS_REGION" 2>/dev/null || \
        aws lambda create-alias \
            --function-name "$function_name" \
            --name "$alias_name" \
            --function-version "$version" \
            --description "Active version for $agent in $ENVIRONMENT" \
            --region "$AWS_REGION"
    done
    
    log_success "Traffic switched to: $stack_name"
}

# Cleanup old stack
cleanup_old_stack() {
    local old_stack="$1"
    
    log "Scheduling cleanup of old stack: $old_stack"
    
    # Schedule deletion after grace period (could be done immediately in dev)
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        log "Deleting old stack immediately (dev environment)"
        aws cloudformation delete-stack \
            --stack-name "$old_stack" \
            --region "$AWS_REGION" || log_warning "Failed to delete old stack"
    else
        log "Old stack will be cleaned up manually: $old_stack"
    fi
}

# Generate deployment report
generate_deployment_report() {
    local report_file="${PROJECT_ROOT}/deployment-reports/${DEPLOYMENT_ID}.json"
    
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "stackNamePrefix": "$STACK_NAME_PREFIX",
  "blueGreenEnabled": $BLUE_GREEN,
  "testsRan": $RUN_TESTS,
  "deployedAgents": $(printf '%s\n' "${AGENTS[@]}" | jq -R . | jq -s .),
  "deploymentStatus": "success",
  "duration": $(($(date +%s) - DEPLOYMENT_START_TIME)),
  "healthCheckStatus": "passed"
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    local DEPLOYMENT_START_TIME=$(date +%s)
    
    log "Starting Multi-Agent Curriculum Alignment System deployment"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    log "Blue-Green: $BLUE_GREEN"
    log "Run Tests: $RUN_TESTS"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validate prerequisites
    validate_prerequisites
    
    # Build agents
    build_agents
    
    # Deploy infrastructure first
    deploy_infrastructure
    
    # Deploy agents
    if [[ "$BLUE_GREEN" == "true" ]]; then
        deploy_agents_blue_green
    else
        deploy_agents_direct
    fi
    
    # Generate deployment report
    generate_deployment_report
    
    local duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
    log_success "Deployment completed successfully in ${duration}s"
    
    # Show deployment summary
    cat << EOF

🎉 Deployment Summary
====================
Environment: $ENVIRONMENT
Region: $AWS_REGION
Deployment ID: $DEPLOYMENT_ID
Duration: ${duration}s
Strategy: $([ "$BLUE_GREEN" == "true" ] && echo "Blue-Green" || echo "Direct")

Next steps:
- Monitor agent health in CloudWatch
- Run integration tests: npm run test:integration
- View logs: aws logs tail /aws/lambda/${STACK_NAME_PREFIX}-coordinator-${ENVIRONMENT}

EOF
}

# Parse arguments and run main function
parse_arguments "$@"
main