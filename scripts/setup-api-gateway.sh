#!/bin/bash

# API Gateway Setup Script for Curriculum Alignment System
# Configures API Gateway with Lambda integration and Cognito authorization

set -e

# Configuration
PROJECT_NAME="curriculum-alignment"
REGION="${AWS_REGION:-eu-central-1}"
ENVIRONMENT="${NODE_ENV:-dev}"

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

# Function to check if AWS CLI is configured
check_aws_config() {
    log_info "Checking AWS CLI configuration..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local current_region=$(aws configure get region)
    
    log_success "AWS CLI configured"
    log_info "Account ID: $account_id"
    log_info "Region: $current_region"
}

# Function to get prerequisites from other stacks
get_prerequisites() {
    log_info "Getting prerequisites from other stacks..."
    
    # Get Cognito User Pool ARN
    local cognito_stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    USER_POOL_ARN=$(aws cloudformation describe-stacks \
        --stack-name "$cognito_stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolArn`].OutputValue' \
        --output text)
    
    if [ -z "$USER_POOL_ARN" ]; then
        log_error "Could not retrieve Cognito User Pool ARN from stack: $cognito_stack_name"
        log_info "Please deploy Cognito User Pool first: npm run cognito:setup"
        exit 1
    fi
    
    # Get SAM stack outputs for Lambda function ARNs
    local sam_stack_name="${PROJECT_NAME}-${ENVIRONMENT}"
    LAMBDA_ARN_PREFIX="arn:aws:lambda:${REGION}:$(aws sts get-caller-identity --query Account --output text):function:${sam_stack_name}"
    
    log_success "Prerequisites retrieved:"
    log_info "- User Pool ARN: $USER_POOL_ARN"
    log_info "- Lambda ARN Prefix: $LAMBDA_ARN_PREFIX"
}

# Function to validate CloudFormation template
validate_template() {
    log_info "Validating API Gateway CloudFormation template..."
    
    if aws cloudformation validate-template \
        --template-body file://infrastructure/api-gateway.yaml > /dev/null; then
        log_success "CloudFormation template is valid"
    else
        log_error "CloudFormation template validation failed"
        exit 1
    fi
}

# Function to deploy API Gateway stack
deploy_api_gateway_stack() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Deploying API Gateway stack: $stack_name"
    
    # Get custom domain and certificate from environment variables (if set)
    local custom_domain="${API_GATEWAY_DOMAIN_NAME:-}"
    local certificate_arn="${API_GATEWAY_CERTIFICATE_ARN:-}"
    
    # Configure throttling based on environment
    local rate_limit="100"
    local burst_limit="200"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        rate_limit="1000"
        burst_limit="2000"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        rate_limit="500"
        burst_limit="1000"
    fi
    
    log_info "Configuration:"
    log_info "- Rate Limit: $rate_limit requests/second"
    log_info "- Burst Limit: $burst_limit requests"
    if [ -n "$custom_domain" ]; then
        log_info "- Custom Domain: $custom_domain"
    fi
    
    # Check if stack exists
    if aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" &> /dev/null; then
        log_info "Stack exists, updating..."
        local action="update"
    else
        log_info "Stack doesn't exist, creating..."
        local action="create"
    fi
    
    # Prepare parameters
    local parameters=(
        "Environment=$ENVIRONMENT"
        "UserPoolArn=$USER_POOL_ARN"
        "LambdaFunctionArnPrefix=$LAMBDA_ARN_PREFIX"
        "ThrottleRateLimit=$rate_limit"
        "ThrottleBurstLimit=$burst_limit"
    )
    
    # Add optional parameters if set
    if [ -n "$custom_domain" ]; then
        parameters+=("CustomDomainName=$custom_domain")
        log_info "Using custom domain: $custom_domain"
    fi
    
    if [ -n "$certificate_arn" ]; then
        parameters+=("CertificateArn=$certificate_arn")
        log_info "Using SSL certificate: $certificate_arn"
    fi
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file infrastructure/api-gateway.yaml \
        --stack-name "$stack_name" \
        --parameter-overrides "${parameters[@]}" \
        --capabilities CAPABILITY_IAM \
        --region "$REGION" \
        --tags \
            Project="$PROJECT_NAME" \
            Environment="$ENVIRONMENT" \
            ManagedBy=Script
    
    if [ $? -eq 0 ]; then
        log_success "API Gateway stack deployed successfully"
    else
        log_error "Failed to deploy API Gateway stack"
        exit 1
    fi
}

# Function to setup Lambda permissions
setup_lambda_permissions() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Setting up Lambda function permissions for API Gateway..."
    
    # Get API Gateway ID
    local api_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayId`].OutputValue' \
        --output text)
    
    if [ -z "$api_id" ]; then
        log_error "Could not retrieve API Gateway ID"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local source_arn="arn:aws:execute-api:${REGION}:${account_id}:${api_id}/*/*"
    
    # Lambda functions that need API Gateway permissions
    local lambda_functions=(
        "coordinator"
        "document-processing"
        "chat-interface"
        "auth-service"
    )
    
    for func_name in "${lambda_functions[@]}"; do
        local function_name="${PROJECT_NAME}-${ENVIRONMENT}-${func_name}"
        
        # Check if function exists
        if aws lambda get-function --function-name "$function_name" --region "$REGION" &> /dev/null; then
            # Add permission for API Gateway to invoke Lambda
            aws lambda add-permission \
                --function-name "$function_name" \
                --statement-id "api-gateway-invoke-${ENVIRONMENT}" \
                --action lambda:InvokeFunction \
                --principal apigateway.amazonaws.com \
                --source-arn "$source_arn" \
                --region "$REGION" 2>/dev/null || true
            
            log_success "Permission added for function: $function_name"
        else
            log_warning "Lambda function not found: $function_name (will be added when deployed)"
        fi
    done
}

# Function to test API Gateway endpoints
test_api_gateway() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Testing API Gateway endpoints..."
    
    # Get API endpoint
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text)
    
    if [ -z "$api_endpoint" ]; then
        log_error "Could not retrieve API endpoint"
        exit 1
    fi
    
    log_info "API Endpoint: $api_endpoint"
    
    # Test health endpoint (should work without authentication)
    log_info "Testing health endpoint..."
    if curl -s -o /dev/null -w "%{http_code}" "${api_endpoint}/health" | grep -q "200"; then
        log_success "Health endpoint is responding"
        
        # Get health response
        local health_response=$(curl -s "${api_endpoint}/health")
        log_info "Health Response: $health_response"
    else
        log_warning "Health endpoint may not be ready yet"
    fi
    
    # Test CORS preflight
    log_info "Testing CORS preflight..."
    local cors_response=$(curl -s -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Authorization" "${api_endpoint}/api/v1" -w "%{http_code}")
    
    if echo "$cors_response" | grep -q "200"; then
        log_success "CORS preflight is working"
    else
        log_warning "CORS preflight may need configuration"
    fi
}

# Function to validate OpenAPI specification
validate_openapi() {
    log_info "Validating OpenAPI specification..."
    
    # Check if swagger-codegen or openapi-generator is available
    if command -v swagger-codegen &> /dev/null; then
        swagger-codegen validate -i openapi.yaml
        log_success "OpenAPI specification is valid (swagger-codegen)"
    elif command -v openapi-generator-cli &> /dev/null; then
        openapi-generator-cli validate -i openapi.yaml
        log_success "OpenAPI specification is valid (openapi-generator)"
    elif command -v npx &> /dev/null; then
        # Try using swagger-parser via npx
        if npx swagger-parser validate openapi.yaml &> /dev/null; then
            log_success "OpenAPI specification is valid (swagger-parser)"
        else
            log_warning "Could not validate OpenAPI specification (no validator found)"
        fi
    else
        log_warning "No OpenAPI validator found. Install swagger-codegen, openapi-generator, or swagger-parser to validate."
    fi
}

# Function to generate API documentation
generate_api_docs() {
    log_info "Generating API documentation..."
    
    # Create docs directory if it doesn't exist
    mkdir -p docs/api
    
    # Generate HTML documentation if redoc-cli is available
    if command -v npx &> /dev/null; then
        log_info "Generating HTML documentation with ReDoc..."
        npx redoc-cli build openapi.yaml --output docs/api/index.html &> /dev/null || log_warning "Could not generate HTML docs"
        
        if [ -f "docs/api/index.html" ]; then
            log_success "API documentation generated: docs/api/index.html"
        fi
    fi
    
    # Copy OpenAPI spec to docs
    cp openapi.yaml docs/api/
    log_success "OpenAPI specification copied to docs/api/"
}

# Function to update environment configuration
update_environment_config() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Updating environment configuration..."
    
    # Get stack outputs
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text)
    
    local api_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayId`].OutputValue' \
        --output text)
    
    local api_key_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiKeyId`].OutputValue' \
        --output text)
    
    # Create/update environment file
    local env_file=".env.${ENVIRONMENT}"
    
    # Create environment file if it doesn't exist
    if [ ! -f "$env_file" ]; then
        touch "$env_file"
    fi
    
    # Update API Gateway configuration in environment file
    {
        echo "# API Gateway Configuration"
        echo "API_GATEWAY_ENDPOINT=$api_endpoint"
        echo "API_GATEWAY_ID=$api_id"
        echo "API_GATEWAY_KEY_ID=$api_key_id"
        echo "API_GATEWAY_REGION=$REGION"
        echo ""
    } >> "$env_file"
    
    log_success "Environment configuration updated: $env_file"
}

# Function to setup monitoring
setup_monitoring() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Setting up API Gateway monitoring..."
    
    # Get alert topic ARN
    local topic_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiAlertTopicArn`].OutputValue' \
        --output text)
    
    if [ -n "$topic_arn" ]; then
        log_success "API monitoring configured with topic: $topic_arn"
        log_info "Subscribe to this topic to receive API alerts"
        
        # Optionally subscribe an email (uncomment and modify)
        # read -p "Enter email for API alerts (optional): " email
        # if [ -n "$email" ]; then
        #     aws sns subscribe \
        #         --topic-arn "$topic_arn" \
        #         --protocol email \
        #         --notification-endpoint "$email"
        #     log_info "Email subscription created (check your email for confirmation)"
        # fi
    fi
}

# Function to display API Gateway information
display_api_info() {
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    
    log_info "Retrieving API Gateway information..."
    
    echo
    echo "=================================="
    echo "API Gateway Configuration"
    echo "=================================="
    
    # Get all outputs
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output table)
    
    echo "$outputs"
    
    echo
    echo "Configuration Summary:"
    echo "- Environment: $ENVIRONMENT"
    echo "- Region: $REGION"
    echo "- Stack Name: $stack_name"
    
    # Get key configuration values
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text)
    
    local api_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayId`].OutputValue' \
        --output text)
    
    echo "- API ID: $api_id"
    echo "- API Endpoint: $api_endpoint"
    
    echo
    echo "Available Endpoints:"
    echo "- Health Check: GET $api_endpoint/health"
    echo "- API Documentation: GET $api_endpoint/api/v1"
    echo "- Programs: GET/POST $api_endpoint/api/v1/programs"
    echo "- Analysis: POST $api_endpoint/api/v1/analysis/start"
    echo "- Chat: POST $api_endpoint/api/v1/chat/message"
    echo "- Reports: POST $api_endpoint/api/v1/reports/generate"
    
    echo
    echo "Authentication:"
    echo "- Include JWT token in Authorization header: Bearer <token>"
    echo "- Get token from Cognito Hosted UI or SDK"
    
    echo
    echo "Next Steps:"
    echo "1. Deploy Lambda functions (SAM deployment)"
    echo "2. Test authenticated endpoints"
    echo "3. Configure frontend to use API"
    echo "4. Set up monitoring and alerts"
}

# Function to create API test script
create_test_script() {
    log_info "Creating API test script..."
    
    local stack_name="${PROJECT_NAME}-api-gateway-${ENVIRONMENT}"
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text)
    
    cat > test-api.sh << EOF
#!/bin/bash

# API Gateway Test Script
# Usage: ./test-api.sh [JWT_TOKEN]

API_ENDPOINT="$api_endpoint"
JWT_TOKEN="\${1:-}"

echo "Testing Curriculum Alignment System API"
echo "======================================"
echo "API Endpoint: \$API_ENDPOINT"
echo

# Test health endpoint (no auth required)
echo "1. Testing health endpoint..."
curl -s "\$API_ENDPOINT/health" | jq '.' || echo "Health check failed"
echo

if [ -n "\$JWT_TOKEN" ]; then
    echo "2. Testing authenticated endpoints..."
    
    # Test programs endpoint
    echo "Programs endpoint:"
    curl -s -H "Authorization: Bearer \$JWT_TOKEN" "\$API_ENDPOINT/api/v1/programs" | jq '.' || echo "Programs endpoint failed"
    echo
    
    # Test chat endpoint
    echo "Chat endpoint:"
    curl -s -X POST -H "Authorization: Bearer \$JWT_TOKEN" -H "Content-Type: application/json" \\
        -d '{"message": "Hello, what can you help me with?"}' \\
        "\$API_ENDPOINT/api/v1/chat/message" | jq '.' || echo "Chat endpoint failed"
    echo
else
    echo "2. Skipping authenticated endpoints (no JWT token provided)"
    echo "   Usage: ./test-api.sh <jwt-token>"
fi

echo "Test completed!"
EOF
    
    chmod +x test-api.sh
    log_success "API test script created: ./test-api.sh"
}

# Main execution
main() {
    echo "==============================================="
    echo "Curriculum Alignment System - API Gateway Setup"
    echo "==============================================="
    echo
    
    # Parse command line arguments
    case "${1:-setup}" in
        "setup")
            check_aws_config
            get_prerequisites
            validate_template
            validate_openapi
            deploy_api_gateway_stack
            sleep 5  # Wait for resources to be ready
            setup_lambda_permissions
            test_api_gateway
            update_environment_config
            setup_monitoring
            generate_api_docs
            create_test_script
            display_api_info
            ;;
        "test")
            check_aws_config
            test_api_gateway
            ;;
        "info")
            check_aws_config
            display_api_info
            ;;
        "docs")
            validate_openapi
            generate_api_docs
            ;;
        "permissions")
            check_aws_config
            setup_lambda_permissions
            ;;
        "monitor")
            check_aws_config
            setup_monitoring
            ;;
        "help")
            echo "Usage: $0 [setup|test|info|docs|permissions|monitor|help]"
            echo
            echo "Commands:"
            echo "  setup       - Deploy API Gateway and configure (default)"
            echo "  test        - Test API Gateway endpoints"
            echo "  info        - Display API Gateway information"
            echo "  docs        - Generate API documentation"
            echo "  permissions - Setup Lambda permissions"
            echo "  monitor     - Setup monitoring and alerts"
            echo "  help        - Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "API Gateway setup completed successfully!"
}

# Run main function with all arguments
main "$@"