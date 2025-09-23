#!/bin/bash

# Multi-Agent Curriculum Alignment System - Individual Agent Update Script
# This script updates a single agent with minimal downtime

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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
RUN_TESTS="${RUN_TESTS:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-120}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Available agents
AVAILABLE_AGENTS=(
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
    
    if [[ "$ROLLBACK_ON_FAILURE" == "true" && -n "${PREVIOUS_VERSION:-}" ]]; then
        log_warning "Rolling back to previous version: $PREVIOUS_VERSION"
        rollback_agent "$AGENT_NAME" "$PREVIOUS_VERSION"
    fi
    
    exit 1
}

# Help function
show_help() {
    cat << EOF
Multi-Agent Curriculum Alignment System - Agent Update Script

Usage: $0 [OPTIONS] AGENT_NAME

Arguments:
    AGENT_NAME              Name of the agent to update

Options:
    -h, --help              Show this help message
    -e, --environment ENV   Target environment (dev, staging, prod) [default: dev]
    -r, --region REGION     AWS region [default: us-east-1]
    -s, --stack-prefix NAME Stack name prefix [default: curriculum-alignment]
    --no-tests              Skip running tests
    --no-rollback           Disable automatic rollback on failure
    --timeout SECONDS       Health check timeout [default: 120]
    --dry-run               Show what would be updated without executing
    --force                 Force update even if no changes detected
    --version VERSION       Deploy specific version/commit

Available Agents:
$(printf "    %s\n" "${AVAILABLE_AGENTS[@]}")

Examples:
    $0 coordinator                        # Update coordinator agent in dev
    $0 -e prod qa-agent                   # Update QA agent in production
    $0 --no-tests web-search              # Update without running tests
    $0 --version abc123 semantic-search   # Update to specific commit

Environment Variables:
    AWS_PROFILE             AWS profile to use
    ENVIRONMENT             Target environment
    AWS_REGION              AWS region
    STACK_NAME_PREFIX       Stack name prefix
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
            -s|--stack-prefix)
                STACK_NAME_PREFIX="$2"
                shift 2
                ;;
            --no-tests)
                RUN_TESTS="false"
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE="false"
                shift
                ;;
            --timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --force)
                FORCE_UPDATE="true"
                shift
                ;;
            --version)
                TARGET_VERSION="$2"
                shift 2
                ;;
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                if [[ -z "${AGENT_NAME:-}" ]]; then
                    AGENT_NAME="$1"
                else
                    error_exit "Multiple agent names specified"
                fi
                shift
                ;;
        esac
    done
    
    # Validate agent name
    if [[ -z "${AGENT_NAME:-}" ]]; then
        error_exit "Agent name is required"
    fi
    
    # Check if agent is valid
    local valid_agent=false
    for agent in "${AVAILABLE_AGENTS[@]}"; do
        if [[ "$agent" == "$AGENT_NAME" ]]; then
            valid_agent=true
            break
        fi
    done
    
    if [[ "$valid_agent" == "false" ]]; then
        error_exit "Invalid agent name: $AGENT_NAME. Available agents: ${AVAILABLE_AGENTS[*]}"
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites for agent: $AGENT_NAME"
    
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
    
    # Check agent directory exists
    local agent_dir="${PROJECT_ROOT}/lambda/${AGENT_NAME}"
    if [[ ! -d "$agent_dir" ]]; then
        error_exit "Agent directory not found: $agent_dir"
    fi
    
    # Check if function exists in AWS
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    if ! aws lambda get-function --function-name "$function_name" --region "$AWS_REGION" &>/dev/null; then
        error_exit "Lambda function not found: $function_name"
    fi
    
    log_success "Prerequisites validated"
}

# Get current agent version
get_current_version() {
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    
    PREVIOUS_VERSION=$(aws lambda get-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Configuration.Version' \
        --output text)
    
    log "Current version: $PREVIOUS_VERSION"
}

# Check if update is needed
check_update_needed() {
    if [[ "${FORCE_UPDATE:-}" == "true" ]]; then
        log "Force update requested - skipping change detection"
        return 0
    fi
    
    local agent_dir="${PROJECT_ROOT}/lambda/${AGENT_NAME}"
    local last_modified
    
    # Get last modification time of agent files
    last_modified=$(find "$agent_dir" -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | \
        xargs stat -f "%m" | sort -n | tail -1)
    
    # Get last deployment time from function metadata
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    local last_deployment
    last_deployment=$(aws lambda get-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Configuration.LastModified' \
        --output text | xargs -I {} date -d {} +%s)
    
    if [[ $last_modified -le $last_deployment ]]; then
        log_warning "No changes detected since last deployment"
        
        if [[ "${DRY_RUN:-}" == "true" ]]; then
            log "Would skip update (no changes)"
            exit 0
        fi
        
        read -p "Continue with update anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Update cancelled"
            exit 0
        fi
    fi
}

# Run agent-specific tests
run_agent_tests() {
    if [[ "$RUN_TESTS" != "true" ]]; then
        log "Skipping tests (disabled)"
        return 0
    fi
    
    log "Running tests for agent: $AGENT_NAME"
    
    cd "$PROJECT_ROOT"
    
    # Run specific agent tests
    local test_file="tests/agents/${AGENT_NAME}.test.ts"
    if [[ -f "$test_file" ]]; then
        npm test -- "$test_file" || error_exit "Agent-specific tests failed"
    else
        log_warning "No specific tests found for agent: $AGENT_NAME"
    fi
    
    # Run integration tests that involve this agent
    local integration_pattern="*${AGENT_NAME}*"
    if find tests/integration -name "${integration_pattern}.test.ts" -o -name "${integration_pattern}.spec.ts" | grep -q .; then
        log "Running integration tests for agent: $AGENT_NAME"
        npm run test:integration -- --testNamePattern="$AGENT_NAME" || error_exit "Integration tests failed"
    fi
    
    log_success "Tests passed"
}

# Build and package agent
build_and_package_agent() {
    log "Building and packaging agent: $AGENT_NAME"
    
    cd "$PROJECT_ROOT"
    
    # Type check
    log "Running type check..."
    npm run typecheck || error_exit "Type check failed"
    
    # Build project
    log "Building project..."
    npm run build || error_exit "Build failed"
    
    # Package agent
    local agent_dir="${PROJECT_ROOT}/lambda/${AGENT_NAME}"
    local package_file="/tmp/agent-${AGENT_NAME}-${TIMESTAMP}.zip"
    
    # Create temporary package directory
    local temp_dir="/tmp/package-${AGENT_NAME}-${TIMESTAMP}"
    mkdir -p "$temp_dir"
    
    # Copy agent files
    cp -r "${agent_dir}/"* "$temp_dir/"
    
    # Copy shared dependencies
    if [[ -d "${PROJECT_ROOT}/src" ]]; then
        mkdir -p "${temp_dir}/src"
        cp -r "${PROJECT_ROOT}/src/"* "${temp_dir}/src/"
    fi
    
    # Copy production dependencies
    if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
        cp "${PROJECT_ROOT}/package.json" "$temp_dir/"
        cd "$temp_dir"
        npm install --production --silent
        cd "$PROJECT_ROOT"
    fi
    
    # Create package
    cd "$temp_dir"
    zip -r "$package_file" . -x "*.test.*" "*.spec.*" > /dev/null
    
    # Cleanup
    rm -rf "$temp_dir"
    
    PACKAGE_FILE="$package_file"
    log_success "Agent packaged: $PACKAGE_FILE"
}

# Update Lambda function
update_lambda_function() {
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "Would update Lambda function: $function_name"
        return 0
    fi
    
    log "Updating Lambda function: $function_name"
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$function_name" \
        --zip-file "fileb://$PACKAGE_FILE" \
        --region "$AWS_REGION" \
        --no-cli-pager > /dev/null
    
    # Wait for update to complete
    log "Waiting for function update to complete..."
    aws lambda wait function-updated \
        --function-name "$function_name" \
        --region "$AWS_REGION"
    
    # Get new version
    NEW_VERSION=$(aws lambda get-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Configuration.Version' \
        --output text)
    
    log_success "Function updated. New version: $NEW_VERSION"
    
    # Cleanup package file
    rm -f "$PACKAGE_FILE"
}

# Perform health check
perform_health_check() {
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=5
    local elapsed=0
    
    log "Performing health check for agent: $AGENT_NAME"
    
    while [[ $elapsed -lt $timeout ]]; do
        # Check function state
        local state
        state=$(aws lambda get-function \
            --function-name "$function_name" \
            --region "$AWS_REGION" \
            --query 'Configuration.State' \
            --output text)
        
        if [[ "$state" == "Active" ]]; then
            # Test function invocation
            if test_function_invocation "$function_name"; then
                log_success "Health check passed"
                return 0
            fi
        fi
        
        log "Health check in progress... (${elapsed}/${timeout}s)"
        sleep $interval
        ((elapsed += interval))
    done
    
    log_error "Health check failed after ${timeout}s"
    return 1
}

# Test function invocation
test_function_invocation() {
    local function_name="$1"
    local test_payload='{"httpMethod":"GET","pathParameters":{"action":"health-check"}}'
    
    local response
    response=$(aws lambda invoke \
        --function-name "$function_name" \
        --payload "$test_payload" \
        --region "$AWS_REGION" \
        --log-type Tail \
        /tmp/health-check-${AGENT_NAME}.json 2>/dev/null)
    
    # Check for errors
    if echo "$response" | jq -e '.FunctionError' > /dev/null 2>&1; then
        local error_type
        error_type=$(echo "$response" | jq -r '.FunctionError')
        log_error "Function error during health check: $error_type"
        return 1
    fi
    
    # Check response
    local status_code
    status_code=$(jq -r '.statusCode // "500"' /tmp/health-check-${AGENT_NAME}.json 2>/dev/null)
    
    if [[ "$status_code" == "200" ]]; then
        return 0
    else
        log_error "Health check returned status: $status_code"
        return 1
    fi
}

# Update alias to new version
update_alias() {
    local function_name="${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}"
    local alias_name="active"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "Would update alias $alias_name to version $NEW_VERSION"
        return 0
    fi
    
    log "Updating alias $alias_name to version $NEW_VERSION"
    
    # Update or create alias
    aws lambda update-alias \
        --function-name "$function_name" \
        --name "$alias_name" \
        --function-version "$NEW_VERSION" \
        --description "Updated on $(date)" \
        --region "$AWS_REGION" 2>/dev/null || \
    aws lambda create-alias \
        --function-name "$function_name" \
        --name "$alias_name" \
        --function-version "$NEW_VERSION" \
        --description "Created on $(date)" \
        --region "$AWS_REGION"
    
    log_success "Alias updated to version $NEW_VERSION"
}

# Rollback agent to previous version
rollback_agent() {
    local agent_name="$1"
    local version="$2"
    local function_name="${STACK_NAME_PREFIX}-${agent_name}-${ENVIRONMENT}"
    
    log "Rolling back agent $agent_name to version $version"
    
    # Update alias to previous version
    aws lambda update-alias \
        --function-name "$function_name" \
        --name "active" \
        --function-version "$version" \
        --description "Rollback on $(date)" \
        --region "$AWS_REGION"
    
    log_success "Rollback completed"
}

# Generate update report
generate_update_report() {
    local report_file="${PROJECT_ROOT}/deployment-reports/${AGENT_NAME}-update-${TIMESTAMP}.json"
    
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
  "agentName": "$AGENT_NAME",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "previousVersion": "${PREVIOUS_VERSION:-unknown}",
  "newVersion": "${NEW_VERSION:-unknown}",
  "updateStatus": "success",
  "testsRan": $RUN_TESTS,
  "healthCheckPassed": true,
  "rollbackEnabled": $ROLLBACK_ON_FAILURE,
  "duration": $(($(date +%s) - UPDATE_START_TIME))
}
EOF
    
    log_success "Update report generated: $report_file"
}

# Main update function
main() {
    local UPDATE_START_TIME=$(date +%s)
    
    log "Starting agent update: $AGENT_NAME"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validate prerequisites
    validate_prerequisites
    
    # Get current version for potential rollback
    get_current_version
    
    # Check if update is needed
    check_update_needed
    
    # Run tests
    run_agent_tests
    
    # Build and package
    build_and_package_agent
    
    # Update function
    update_lambda_function
    
    # Health check
    if ! perform_health_check; then
        error_exit "Health check failed"
    fi
    
    # Update alias
    update_alias
    
    # Generate report
    generate_update_report
    
    local duration=$(($(date +%s) - UPDATE_START_TIME))
    log_success "Agent update completed successfully in ${duration}s"
    
    # Show update summary
    cat << EOF

🎉 Update Summary
=================
Agent: $AGENT_NAME
Environment: $ENVIRONMENT
Previous Version: $PREVIOUS_VERSION
New Version: $NEW_VERSION
Duration: ${duration}s

Next steps:
- Monitor agent health in CloudWatch
- Test agent functionality
- View logs: aws logs tail /aws/lambda/${STACK_NAME_PREFIX}-${AGENT_NAME}-${ENVIRONMENT}

EOF
}

# Parse arguments and run main function
parse_arguments "$@"
main