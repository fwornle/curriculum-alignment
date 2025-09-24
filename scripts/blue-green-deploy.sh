#!/bin/bash

# Blue-Green Deployment Script for Curriculum Alignment System
# Implements zero-downtime deployment with instant rollback capability

set -e

# Configuration
ENVIRONMENT="${1:-staging}"
ACTION="${2:-deploy}"
VERSION="${3:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="curriculum-alignment-$ENVIRONMENT"
BLUE_STACK_NAME="$STACK_NAME-blue"
GREEN_STACK_NAME="$STACK_NAME-green"
ALIAS_STACK_NAME="$STACK_NAME-alias"

# Traffic distribution for canary deployments
CANARY_PERCENTAGE="${CANARY_PERCENTAGE:-10}"
CANARY_DURATION="${CANARY_DURATION:-300}" # 5 minutes

# Health check configuration
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-5}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_deploy() {
    echo -e "${CYAN}[DEPLOY]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check SAM CLI
    if ! command -v sam &> /dev/null; then
        log_error "SAM CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed (required for JSON parsing)"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get current active environment (blue or green)
get_current_active() {
    local current_active
    
    # Check which stack is currently receiving traffic
    current_active=$(aws cloudformation describe-stacks \
        --stack-name "$ALIAS_STACK_NAME" \
        --query 'Stacks[0].Parameters[?ParameterKey==`ActiveEnvironment`].ParameterValue' \
        --output text 2>/dev/null || echo "none")
    
    if [[ "$current_active" == "blue" ]]; then
        echo "blue"
    elif [[ "$current_active" == "green" ]]; then
        echo "green"
    else
        # Default to blue if no active environment is set
        echo "blue"
    fi
}

# Get inactive environment
get_inactive_environment() {
    local active="$1"
    if [[ "$active" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Check if stack exists
stack_exists() {
    local stack_name="$1"
    aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null
}

# Get stack status
get_stack_status() {
    local stack_name="$1"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_EXISTS"
}

# Wait for stack operation to complete
wait_for_stack() {
    local stack_name="$1"
    local operation="$2"
    
    log_info "Waiting for $operation to complete on stack: $stack_name"
    
    while true; do
        local status
        status=$(get_stack_status "$stack_name")
        
        case "$status" in
            *_COMPLETE)
                log_success "$operation completed successfully"
                return 0
                ;;
            *_FAILED|*_ROLLBACK_COMPLETE)
                log_error "$operation failed with status: $status"
                return 1
                ;;
            *_IN_PROGRESS)
                log_info "Stack operation in progress... (Status: $status)"
                sleep 30
                ;;
            *)
                log_error "Unknown stack status: $status"
                return 1
                ;;
        esac
    done
}

# Get API Gateway URL from stack
get_api_url() {
    local stack_name="$1"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo ""
}

# Health check function
health_check() {
    local api_url="$1"
    local retries="$2"
    
    log_info "Running health checks against: $api_url"
    
    for ((i=1; i<=retries; i++)); do
        log_info "Health check attempt $i/$retries"
        
        # Check health endpoint
        if curl -sf --max-time "$HEALTH_CHECK_TIMEOUT" "$api_url/health" > /dev/null; then
            log_success "Health check passed"
            return 0
        else
            log_warning "Health check failed, attempt $i/$retries"
            if [[ $i -lt $retries ]]; then
                sleep "$HEALTH_CHECK_INTERVAL"
            fi
        fi
    done
    
    log_error "All health checks failed"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    local api_url="$1"
    
    log_info "Running smoke tests against: $api_url"
    
    if [[ -d "tests/smoke" ]]; then
        cd tests/smoke
        API_URL="$api_url" ENVIRONMENT="$ENVIRONMENT" npm test
        local result=$?
        cd ../..
        
        if [[ $result -eq 0 ]]; then
            log_success "Smoke tests passed"
            return 0
        else
            log_error "Smoke tests failed"
            return 1
        fi
    else
        log_warning "Smoke tests not found, skipping"
        return 0
    fi
}

# Deploy to inactive environment
deploy_to_inactive() {
    local inactive_env="$1"
    local inactive_stack_name="$STACK_NAME-$inactive_env"
    
    log_deploy "Deploying to inactive environment: $inactive_env"
    
    # Build application
    log_info "Building application..."
    sam build --use-container
    
    # Package application
    log_info "Packaging application..."
    sam package \
        --template-file .aws-sam/build/template.yaml \
        --s3-bucket "curriculum-alignment-deployments-$ENVIRONMENT" \
        --s3-prefix "$VERSION-$inactive_env" \
        --output-template-file "packaged-template-$inactive_env.yaml"
    
    # Deploy to inactive environment
    log_info "Deploying to $inactive_env environment..."
    sam deploy \
        --template-file "packaged-template-$inactive_env.yaml" \
        --stack-name "$inactive_stack_name" \
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
        --parameter-overrides \
            Environment="$ENVIRONMENT-$inactive_env" \
            Version="$VERSION" \
            BlueGreenEnvironment="$inactive_env" \
        --no-fail-on-empty-changeset \
        --tags \
            Environment="$ENVIRONMENT" \
            BlueGreenRole="$inactive_env" \
            Version="$VERSION"
    
    # Wait for deployment to complete
    if ! wait_for_stack "$inactive_stack_name" "deployment"; then
        log_error "Deployment to $inactive_env failed"
        return 1
    fi
    
    log_success "Deployment to $inactive_env completed"
}

# Create or update alias stack for traffic routing
setup_alias_stack() {
    local blue_stack="$BLUE_STACK_NAME"
    local green_stack="$GREEN_STACK_NAME"
    local active_env="$1"
    
    log_info "Setting up alias stack for traffic routing"
    
    # Create alias CloudFormation template
    cat > alias-template.yaml << EOF
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Blue-Green Deployment Alias Stack'

Parameters:
  ActiveEnvironment:
    Type: String
    Default: '$active_env'
    AllowedValues: [blue, green]
    Description: 'Currently active environment'
  
  BlueStackName:
    Type: String
    Default: '$blue_stack'
  
  GreenStackName:
    Type: String
    Default: '$green_stack'
  
  CanaryPercentage:
    Type: Number
    Default: 0
    MinValue: 0
    MaxValue: 100
    Description: 'Percentage of traffic to route to inactive environment'

Resources:
  ApiGatewayAlias:
    Type: AWS::ApiGateway::BasePathMapping
    Properties:
      DomainName: !Ref DomainName
      RestApiId: !If
        - IsBlueActive
        - !ImportValue !Sub '\${BlueStackName}-ApiId'
        - !ImportValue !Sub '\${GreenStackName}-ApiId'
      Stage: !If
        - IsBlueActive
        - !ImportValue !Sub '\${BlueStackName}-ApiStage'
        - !ImportValue !Sub '\${GreenStackName}-ApiStage'

  DomainName:
    Type: AWS::ApiGateway::DomainName
    Properties:
      DomainName: !Sub 'api-\${AWS::StackName}.example.com'
      CertificateArn: !Ref SSLCertificateArn
      
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub '\${AWS::StackName}-alb'
      Type: application
      Scheme: internet-facing
      IpAddressType: ipv4
      Subnets: !Ref SubnetIds
      SecurityGroups: [!Ref LoadBalancerSecurityGroup]
      
  LoadBalancerSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: 'Security group for blue-green load balancer'
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

Conditions:
  IsBlueActive: !Equals [!Ref ActiveEnvironment, 'blue']
  HasCanaryTraffic: !Not [!Equals [!Ref CanaryPercentage, 0]]

Outputs:
  LoadBalancerUrl:
    Description: 'Load balancer URL'
    Value: !GetAtt LoadBalancer.DNSName
    Export:
      Name: !Sub '\${AWS::StackName}-LoadBalancerUrl'
  
  ActiveEnvironment:
    Description: 'Currently active environment'
    Value: !Ref ActiveEnvironment
    Export:
      Name: !Sub '\${AWS::StackName}-ActiveEnvironment'
EOF

    # Deploy alias stack
    if stack_exists "$ALIAS_STACK_NAME"; then
        log_info "Updating existing alias stack..."
        aws cloudformation update-stack \
            --stack-name "$ALIAS_STACK_NAME" \
            --template-body file://alias-template.yaml \
            --parameters ParameterKey=ActiveEnvironment,ParameterValue="$active_env" \
            --capabilities CAPABILITY_IAM
    else
        log_info "Creating new alias stack..."
        aws cloudformation create-stack \
            --stack-name "$ALIAS_STACK_NAME" \
            --template-body file://alias-template.yaml \
            --parameters ParameterKey=ActiveEnvironment,ParameterValue="$active_env" \
            --capabilities CAPABILITY_IAM
    fi
    
    wait_for_stack "$ALIAS_STACK_NAME" "alias stack update"
}

# Switch traffic to new environment
switch_traffic() {
    local new_active="$1"
    local canary="${2:-false}"
    
    if [[ "$canary" == "true" ]]; then
        log_deploy "Starting canary deployment: $CANARY_PERCENTAGE% traffic to $new_active"
        
        # Update alias stack with canary traffic
        aws cloudformation update-stack \
            --stack-name "$ALIAS_STACK_NAME" \
            --use-previous-template \
            --parameters \
                ParameterKey=ActiveEnvironment,UsePreviousValue=true \
                ParameterKey=CanaryPercentage,ParameterValue="$CANARY_PERCENTAGE"
        
        wait_for_stack "$ALIAS_STACK_NAME" "canary deployment"
        
        log_info "Canary deployment active, waiting $CANARY_DURATION seconds for monitoring..."
        sleep "$CANARY_DURATION"
        
        # Check metrics and health during canary
        local canary_api_url
        canary_api_url=$(get_api_url "$STACK_NAME-$new_active")
        
        if ! health_check "$canary_api_url" "$HEALTH_CHECK_RETRIES"; then
            log_error "Canary health checks failed, rolling back..."
            rollback_traffic
            return 1
        fi
        
        log_success "Canary deployment successful, proceeding with full switch"
    fi
    
    log_deploy "Switching traffic to: $new_active"
    
    # Update alias stack to point to new environment
    aws cloudformation update-stack \
        --stack-name "$ALIAS_STACK_NAME" \
        --use-previous-template \
        --parameters \
            ParameterKey=ActiveEnvironment,ParameterValue="$new_active" \
            ParameterKey=CanaryPercentage,ParameterValue=0
    
    if wait_for_stack "$ALIAS_STACK_NAME" "traffic switch"; then
        log_success "Traffic successfully switched to $new_active"
        
        # Update monitoring to point to new environment
        update_monitoring "$new_active"
        
        return 0
    else
        log_error "Failed to switch traffic"
        return 1
    fi
}

# Rollback traffic to previous environment
rollback_traffic() {
    local current_active
    current_active=$(get_current_active)
    local previous_active
    previous_active=$(get_inactive_environment "$current_active")
    
    log_warning "Rolling back traffic to: $previous_active"
    
    aws cloudformation update-stack \
        --stack-name "$ALIAS_STACK_NAME" \
        --use-previous-template \
        --parameters \
            ParameterKey=ActiveEnvironment,ParameterValue="$previous_active" \
            ParameterKey=CanaryPercentage,ParameterValue=0
    
    if wait_for_stack "$ALIAS_STACK_NAME" "rollback"; then
        log_success "Traffic successfully rolled back to $previous_active"
        return 0
    else
        log_error "Rollback failed!"
        return 1
    fi
}

# Update monitoring dashboards to point to active environment
update_monitoring() {
    local active_env="$1"
    local active_stack="$STACK_NAME-$active_env"
    
    log_info "Updating monitoring for active environment: $active_env"
    
    if [[ -x "infrastructure/deploy-monitoring.sh" ]]; then
        cd infrastructure
        STACK_NAME="$active_stack" ./deploy-monitoring.sh
        cd ..
        log_success "Monitoring updated for $active_env environment"
    else
        log_warning "Monitoring deployment script not found or not executable"
    fi
}

# Cleanup old environment
cleanup_old_environment() {
    local old_env="$1"
    local old_stack="$STACK_NAME-$old_env"
    
    log_info "Cleaning up old environment: $old_env"
    
    if stack_exists "$old_stack"; then
        log_info "Deleting old stack: $old_stack"
        aws cloudformation delete-stack --stack-name "$old_stack"
        wait_for_stack "$old_stack" "deletion"
        log_success "Old environment $old_env cleaned up"
    else
        log_info "Old stack $old_stack does not exist, nothing to clean up"
    fi
}

# Main deployment function
deploy() {
    log_deploy "Starting blue-green deployment to $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Get current state
    local current_active
    current_active=$(get_current_active)
    local inactive_env
    inactive_env=$(get_inactive_environment "$current_active")
    
    log_info "Current active environment: $current_active"
    log_info "Deploying to inactive environment: $inactive_env"
    
    # Deploy to inactive environment
    if ! deploy_to_inactive "$inactive_env"; then
        log_error "Deployment to inactive environment failed"
        exit 1
    fi
    
    # Get API URL for testing
    local new_api_url
    new_api_url=$(get_api_url "$STACK_NAME-$inactive_env")
    
    if [[ -z "$new_api_url" ]]; then
        log_error "Could not get API URL for new environment"
        exit 1
    fi
    
    log_info "New environment API URL: $new_api_url"
    
    # Run health checks on new environment
    if ! health_check "$new_api_url" "$HEALTH_CHECK_RETRIES"; then
        log_error "Health checks failed on new environment"
        exit 1
    fi
    
    # Run smoke tests
    if ! run_smoke_tests "$new_api_url"; then
        log_error "Smoke tests failed on new environment"
        exit 1
    fi
    
    # Setup alias stack if it doesn't exist
    if ! stack_exists "$ALIAS_STACK_NAME"; then
        setup_alias_stack "$current_active"
    fi
    
    # Switch traffic (with canary if enabled)
    local use_canary="${CANARY_PERCENTAGE:-0}"
    if [[ "$use_canary" -gt 0 ]]; then
        if ! switch_traffic "$inactive_env" true; then
            log_error "Canary deployment failed"
            exit 1
        fi
    else
        if ! switch_traffic "$inactive_env" false; then
            log_error "Traffic switch failed"
            exit 1
        fi
    fi
    
    # Final health check on live traffic
    local live_api_url
    live_api_url=$(aws cloudformation describe-stacks \
        --stack-name "$ALIAS_STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
        --output text)
    
    if [[ -n "$live_api_url" ]] && ! health_check "http://$live_api_url" "$HEALTH_CHECK_RETRIES"; then
        log_error "Final health check failed, initiating rollback"
        rollback_traffic
        exit 1
    fi
    
    log_success "🎉 Blue-green deployment completed successfully!"
    log_success "Active environment: $inactive_env"
    log_success "Previous environment: $current_active (available for rollback)"
}

# Status function
status() {
    log_info "Blue-Green Deployment Status for $ENVIRONMENT"
    echo
    
    local current_active
    current_active=$(get_current_active)
    
    # Check stack statuses
    local blue_status green_status alias_status
    blue_status=$(get_stack_status "$BLUE_STACK_NAME")
    green_status=$(get_stack_status "$GREEN_STACK_NAME")
    alias_status=$(get_stack_status "$ALIAS_STACK_NAME")
    
    echo -e "${BLUE}Stack Status:${NC}"
    echo -e "  Blue Stack:  ${BLUE_STACK_NAME} - $blue_status"
    echo -e "  Green Stack: ${GREEN_STACK_NAME} - $green_status"
    echo -e "  Alias Stack: ${ALIAS_STACK_NAME} - $alias_status"
    echo
    
    echo -e "${CYAN}Traffic Routing:${NC}"
    echo -e "  Active Environment: $current_active"
    echo -e "  Inactive Environment: $(get_inactive_environment "$current_active")"
    echo
    
    # Get API URLs
    if [[ "$blue_status" == *"COMPLETE" ]]; then
        local blue_url
        blue_url=$(get_api_url "$BLUE_STACK_NAME")
        echo -e "  Blue API URL: $blue_url"
    fi
    
    if [[ "$green_status" == *"COMPLETE" ]]; then
        local green_url
        green_url=$(get_api_url "$GREEN_STACK_NAME")
        echo -e "  Green API URL: $green_url"
    fi
}

# Rollback function
rollback() {
    log_warning "Initiating rollback for $ENVIRONMENT"
    
    if rollback_traffic; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    local env_to_cleanup="${1:-inactive}"
    
    if [[ "$env_to_cleanup" == "inactive" ]]; then
        local current_active
        current_active=$(get_current_active)
        local inactive_env
        inactive_env=$(get_inactive_environment "$current_active")
        cleanup_old_environment "$inactive_env"
    elif [[ "$env_to_cleanup" == "blue" || "$env_to_cleanup" == "green" ]]; then
        cleanup_old_environment "$env_to_cleanup"
    else
        log_error "Invalid environment to cleanup: $env_to_cleanup"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 <environment> <action> [version]"
    echo
    echo "Arguments:"
    echo "  environment    Target environment (staging, production)"
    echo "  action         Action to perform (deploy, status, rollback, cleanup)"
    echo "  version        Version to deploy (optional, defaults to 'latest')"
    echo
    echo "Actions:"
    echo "  deploy         Deploy new version using blue-green strategy"
    echo "  status         Show current blue-green deployment status"
    echo "  rollback       Rollback to previous version"
    echo "  cleanup        Clean up inactive environment"
    echo
    echo "Environment Variables:"
    echo "  AWS_REGION                AWS region (default: us-east-1)"
    echo "  CANARY_PERCENTAGE         Percentage of traffic for canary (default: 10)"
    echo "  CANARY_DURATION          Canary duration in seconds (default: 300)"
    echo "  HEALTH_CHECK_RETRIES     Number of health check retries (default: 5)"
    echo "  HEALTH_CHECK_INTERVAL    Health check interval in seconds (default: 30)"
    echo
    echo "Examples:"
    echo "  $0 staging deploy v1.2.3"
    echo "  $0 production status"
    echo "  $0 staging rollback"
    echo "  $0 production cleanup inactive"
}

# Main execution
main() {
    case "$ACTION" in
        deploy)
            check_prerequisites
            deploy
            ;;
        status)
            check_prerequisites
            status
            ;;
        rollback)
            check_prerequisites
            rollback
            ;;
        cleanup)
            check_prerequisites
            cleanup "$VERSION"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Handle script arguments
if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

main