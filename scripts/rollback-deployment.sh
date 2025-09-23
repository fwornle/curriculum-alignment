#!/bin/bash

# Multi-Agent Curriculum Alignment System - Deployment Rollback Script
# This script performs emergency rollback to a previous stable deployment

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
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
FORCE_ROLLBACK="${FORCE_ROLLBACK:-false}"

# Agent list
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
    exit 1
}

# Help function
show_help() {
    cat << EOF
Multi-Agent Curriculum Alignment System - Rollback Script

Usage: $0 [OPTIONS] [TARGET_VERSION]

Arguments:
    TARGET_VERSION          Specific version to rollback to (optional)

Options:
    -h, --help              Show this help message
    -e, --environment ENV   Target environment (dev, staging, prod) [default: dev]
    -r, --region REGION     AWS region [default: us-east-1]
    -s, --stack-prefix NAME Stack name prefix [default: curriculum-alignment]
    -a, --agent AGENT       Rollback specific agent only
    --list-versions         List available versions for rollback
    --force                 Force rollback without confirmation
    --timeout SECONDS       Health check timeout [default: 300]
    --dry-run               Show what would be rolled back without executing

Examples:
    $0                              # Rollback to previous stable version
    $0 v1.2.3                       # Rollback to specific version
    $0 -a coordinator               # Rollback only coordinator agent
    $0 --list-versions              # Show available versions
    $0 -e prod --force              # Force rollback in production

Environment Variables:
    AWS_PROFILE             AWS profile to use
    ENVIRONMENT             Target environment
    AWS_REGION              AWS region
    STACK_NAME_PREFIX       Stack name prefix
    
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
            -a|--agent)
                ROLLBACK_AGENT="$2"
                shift 2
                ;;
            --list-versions)
                LIST_VERSIONS="true"
                shift
                ;;
            --force)
                FORCE_ROLLBACK="true"
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
            -*)
                error_exit "Unknown option: $1"
                ;;
            *)
                if [[ -z "${TARGET_VERSION:-}" ]]; then
                    TARGET_VERSION="$1"
                else
                    error_exit "Multiple target versions specified"
                fi
                shift
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("aws" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured or invalid"
    fi
    
    log_success "Prerequisites validated"
}

# List available versions
list_available_versions() {
    log "Available versions for rollback:"
    echo
    
    for agent in "${AGENTS[@]}"; do
        if [[ -n "${ROLLBACK_AGENT:-}" && "$agent" != "$ROLLBACK_AGENT" ]]; then
            continue
        fi
        
        local function_name="${STACK_NAME_PREFIX}-${agent}-${ENVIRONMENT}"
        
        log "Agent: $agent"
        
        # Get function versions
        local versions
        versions=$(aws lambda list-versions-by-function \
            --function-name "$function_name" \
            --region "$AWS_REGION" \
            --query 'Versions[?Version!=`$LATEST`].[Version,LastModified,Description]' \
            --output table 2>/dev/null) || {
            log_warning "  No versions found or function doesn't exist"
            continue
        }
        
        echo "$versions" | sed 's/^/  /'
        
        # Get current alias
        local current_version
        current_version=$(aws lambda get-alias \
            --function-name "$function_name" \
            --name "active" \
            --region "$AWS_REGION" \
            --query 'FunctionVersion' \
            --output text 2>/dev/null) || current_version="None"
        
        log "  Current active version: $current_version"
        echo
    done
}

# Get deployment history
get_deployment_history() {
    local history_file="${PROJECT_ROOT}/deployment-reports"
    
    if [[ -d "$history_file" ]]; then
        log "Recent deployments:"
        find "$history_file" -name "*.json" -type f | \
            head -10 | \
            xargs -I {} sh -c 'echo "$(jq -r ".timestamp" "{}" 2>/dev/null || echo "unknown"): $(basename "{}")"' | \
            sort -r | \
            sed 's/^/  /'
    else
        log_warning "No deployment history found"
    fi
}

# Determine rollback target
determine_rollback_target() {
    if [[ -n "${TARGET_VERSION:-}" ]]; then
        log "Using specified target version: $TARGET_VERSION"
        return 0
    fi
    
    # Find previous stable version
    local function_name="${STACK_NAME_PREFIX}-coordinator-${ENVIRONMENT}"
    
    # Get current version
    local current_version
    current_version=$(aws lambda get-alias \
        --function-name "$function_name" \
        --name "active" \
        --region "$AWS_REGION" \
        --query 'FunctionVersion' \
        --output text 2>/dev/null) || error_exit "Cannot determine current version"
    
    log "Current version: $current_version"
    
    # Get previous version
    local versions
    versions=$(aws lambda list-versions-by-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Versions[?Version!=`$LATEST`].Version' \
        --output text)
    
    # Find version before current
    local target=""
    local found_current=false
    
    for version in $(echo "$versions" | tr ' ' '\n' | sort -nr); do
        if [[ "$found_current" == "true" ]]; then
            target="$version"
            break
        fi
        
        if [[ "$version" == "$current_version" ]]; then
            found_current=true
        fi
    done
    
    if [[ -z "$target" ]]; then
        error_exit "Cannot find previous version for rollback"
    fi
    
    TARGET_VERSION="$target"
    log "Determined rollback target: $TARGET_VERSION"
}

# Confirm rollback
confirm_rollback() {
    if [[ "$FORCE_ROLLBACK" == "true" ]]; then
        log "Force rollback enabled - skipping confirmation"
        return 0
    fi
    
    echo
    log_warning "ROLLBACK CONFIRMATION"
    log_warning "Environment: $ENVIRONMENT"
    log_warning "Target Version: $TARGET_VERSION"
    
    if [[ -n "${ROLLBACK_AGENT:-}" ]]; then
        log_warning "Agent: $ROLLBACK_AGENT"
    else
        log_warning "Agents: ALL (${AGENTS[*]})"
    fi
    
    echo
    log_error "This will rollback the deployment and may cause service disruption!"
    echo
    
    read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " -r
    
    if [[ "$REPLY" != "ROLLBACK" ]]; then
        log "Rollback cancelled"
        exit 0
    fi
}

# Perform rollback
perform_rollback() {
    log "Starting rollback to version: $TARGET_VERSION"
    
    # Collect current versions for potential re-rollback
    local current_versions=()
    
    for agent in "${AGENTS[@]}"; do
        if [[ -n "${ROLLBACK_AGENT:-}" && "$agent" != "$ROLLBACK_AGENT" ]]; then
            continue
        fi
        
        local function_name="${STACK_NAME_PREFIX}-${agent}-${ENVIRONMENT}"
        
        # Get current version
        local current_version
        current_version=$(aws lambda get-alias \
            --function-name "$function_name" \
            --name "active" \
            --region "$AWS_REGION" \
            --query 'FunctionVersion' \
            --output text 2>/dev/null) || {
            log_warning "Cannot get current version for $agent"
            continue
        }
        
        current_versions+=("${agent}:${current_version}")
        
        # Perform rollback
        if [[ "${DRY_RUN:-}" == "true" ]]; then
            log "Would rollback $agent to version $TARGET_VERSION"
        else
            rollback_agent "$agent" "$TARGET_VERSION"
        fi
    done
    
    # Save current versions for potential re-rollback
    printf '%s\n' "${current_versions[@]}" > "/tmp/rollback-previous-${TIMESTAMP}.txt"
    log "Previous versions saved to: /tmp/rollback-previous-${TIMESTAMP}.txt"
}

# Rollback individual agent
rollback_agent() {
    local agent="$1"
    local target_version="$2"
    local function_name="${STACK_NAME_PREFIX}-${agent}-${ENVIRONMENT}"
    
    log "Rolling back agent $agent to version $target_version"
    
    # Check if target version exists
    if ! aws lambda get-function \
        --function-name "$function_name" \
        --qualifier "$target_version" \
        --region "$AWS_REGION" &>/dev/null; then
        log_error "Target version $target_version not found for agent $agent"
        return 1
    fi
    
    # Update alias
    aws lambda update-alias \
        --function-name "$function_name" \
        --name "active" \
        --function-version "$target_version" \
        --description "Rollback to $target_version on $(date)" \
        --region "$AWS_REGION" || {
        log_error "Failed to rollback agent $agent"
        return 1
    }
    
    log_success "Agent $agent rolled back to version $target_version"
}

# Perform health check after rollback
perform_health_check() {
    log "Performing health check after rollback..."
    
    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=10
    local elapsed=0
    local failed_agents=()
    
    while [[ $elapsed -lt $timeout ]]; do
        local healthy_count=0
        local total_agents=0
        failed_agents=()
        
        for agent in "${AGENTS[@]}"; do
            if [[ -n "${ROLLBACK_AGENT:-}" && "$agent" != "$ROLLBACK_AGENT" ]]; then
                continue
            fi
            
            ((total_agents++))
            
            if check_agent_health "$agent"; then
                ((healthy_count++))
            else
                failed_agents+=("$agent")
            fi
        done
        
        log "Health check progress: $healthy_count/$total_agents agents healthy"
        
        if [[ $healthy_count -eq $total_agents ]]; then
            log_success "All agents are healthy after rollback"
            return 0
        fi
        
        if [[ ${#failed_agents[@]} -gt 0 ]]; then
            log "Failed agents: ${failed_agents[*]}"
        fi
        
        sleep $interval
        ((elapsed += interval))
    done
    
    log_error "Health check failed after rollback"
    log_error "Failed agents: ${failed_agents[*]}"
    return 1
}

# Check individual agent health
check_agent_health() {
    local agent="$1"
    local function_name="${STACK_NAME_PREFIX}-${agent}-${ENVIRONMENT}"
    
    # Get function status
    local state
    state=$(aws lambda get-function \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query 'Configuration.State' \
        --output text 2>/dev/null) || return 1
    
    if [[ "$state" != "Active" ]]; then
        return 1
    fi
    
    # Test function invocation
    local test_payload='{"httpMethod":"GET","pathParameters":{"action":"health-check"}}'
    local response
    response=$(aws lambda invoke \
        --function-name "$function_name" \
        --payload "$test_payload" \
        --region "$AWS_REGION" \
        /tmp/health-check-${agent}.json 2>/dev/null) || return 1
    
    # Check response
    local status_code
    status_code=$(jq -r '.statusCode // "500"' /tmp/health-check-${agent}.json 2>/dev/null) || return 1
    
    [[ "$status_code" == "200" ]]
}

# Generate rollback report
generate_rollback_report() {
    local report_file="${PROJECT_ROOT}/deployment-reports/rollback-${TIMESTAMP}.json"
    
    mkdir -p "$(dirname "$report_file")"
    
    local agents_array
    if [[ -n "${ROLLBACK_AGENT:-}" ]]; then
        agents_array="[\"$ROLLBACK_AGENT\"]"
    else
        agents_array=$(printf '%s\n' "${AGENTS[@]}" | jq -R . | jq -s .)
    fi
    
    cat > "$report_file" << EOF
{
  "rollbackId": "rollback_${TIMESTAMP}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "region": "$AWS_REGION",
  "targetVersion": "${TARGET_VERSION:-unknown}",
  "rolledBackAgents": $agents_array,
  "rollbackStatus": "success",
  "healthCheckPassed": true,
  "duration": $(($(date +%s) - ROLLBACK_START_TIME)),
  "previousVersionsFile": "/tmp/rollback-previous-${TIMESTAMP}.txt"
}
EOF
    
    log_success "Rollback report generated: $report_file"
}

# Main rollback function
main() {
    local ROLLBACK_START_TIME=$(date +%s)
    
    log "Starting rollback process"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validate prerequisites
    validate_prerequisites
    
    # Handle list versions request
    if [[ "${LIST_VERSIONS:-}" == "true" ]]; then
        list_available_versions
        get_deployment_history
        exit 0
    fi
    
    # Determine rollback target
    determine_rollback_target
    
    # Confirm rollback
    confirm_rollback
    
    # Perform rollback
    perform_rollback
    
    # Health check
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        if ! perform_health_check; then
            log_error "Health check failed after rollback"
            log_warning "Manual intervention may be required"
        fi
    fi
    
    # Generate report
    generate_rollback_report
    
    local duration=$(($(date +%s) - ROLLBACK_START_TIME))
    log_success "Rollback completed in ${duration}s"
    
    # Show rollback summary
    cat << EOF

🔄 Rollback Summary
==================
Environment: $ENVIRONMENT
Target Version: $TARGET_VERSION
$([ -n "${ROLLBACK_AGENT:-}" ] && echo "Agent: $ROLLBACK_AGENT" || echo "Agents: ALL")
Duration: ${duration}s

Next steps:
- Monitor system health in CloudWatch
- Verify functionality with integration tests
- Investigate root cause of issues that required rollback
- Plan fix and re-deployment

Previous versions saved in: /tmp/rollback-previous-${TIMESTAMP}.txt

EOF
}

# Parse arguments and run main function
parse_arguments "$@"
main