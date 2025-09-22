#!/bin/bash

# S3 Buckets Setup Script for Curriculum Alignment System
# Configures S3 buckets with proper encryption, versioning, and policies

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

# Function to validate CloudFormation template
validate_template() {
    log_info "Validating S3 buckets CloudFormation template..."
    
    if aws cloudformation validate-template \
        --template-body file://infrastructure/s3-buckets.yaml > /dev/null; then
        log_success "CloudFormation template is valid"
    else
        log_error "CloudFormation template validation failed"
        exit 1
    fi
}

# Function to deploy S3 buckets stack
deploy_s3_stack() {
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "Deploying S3 buckets stack: $stack_name"
    
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
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file infrastructure/s3-buckets.yaml \
        --stack-name "$stack_name" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            RetentionPeriod=90 \
            EnableVersioning=Enabled \
        --capabilities CAPABILITY_IAM \
        --region "$REGION" \
        --tags \
            Project="$PROJECT_NAME" \
            Environment="$ENVIRONMENT" \
            ManagedBy=Script
    
    if [ $? -eq 0 ]; then
        log_success "S3 buckets stack deployed successfully"
    else
        log_error "Failed to deploy S3 buckets stack"
        exit 1
    fi
}

# Function to test bucket access
test_bucket_access() {
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "Testing bucket access..."
    
    # Get bucket names from CloudFormation outputs
    local documents_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
        --output text)
    
    local static_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticWebsiteBucketName`].OutputValue' \
        --output text)
    
    if [ -n "$documents_bucket" ]; then
        log_info "Testing documents bucket: $documents_bucket"
        if aws s3 ls "s3://$documents_bucket" > /dev/null 2>&1; then
            log_success "Documents bucket access confirmed"
        else
            log_warning "Documents bucket access test failed"
        fi
    fi
    
    if [ -n "$static_bucket" ]; then
        log_info "Testing static website bucket: $static_bucket"
        if aws s3 ls "s3://$static_bucket" > /dev/null 2>&1; then
            log_success "Static website bucket access confirmed"
        else
            log_warning "Static website bucket access test failed"
        fi
    fi
}

# Function to upload test files
upload_test_files() {
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "Uploading test files..."
    
    # Get bucket names
    local documents_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
        --output text)
    
    local static_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticWebsiteBucketName`].OutputValue' \
        --output text)
    
    # Create test files
    mkdir -p temp-test-files
    
    # Test document
    echo "This is a test curriculum document for the Curriculum Alignment System." > temp-test-files/test-curriculum.txt
    
    # Test HTML file
    cat > temp-test-files/test.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Curriculum Alignment System - Test</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>This is a test page for the Curriculum Alignment System.</p>
</body>
</html>
EOF
    
    # Upload test files
    if [ -n "$documents_bucket" ]; then
        aws s3 cp temp-test-files/test-curriculum.txt "s3://$documents_bucket/test/" \
            --metadata purpose=test,timestamp=$(date +%s)
        log_success "Test document uploaded to documents bucket"
    fi
    
    if [ -n "$static_bucket" ]; then
        aws s3 cp temp-test-files/test.html "s3://$static_bucket/" \
            --content-type "text/html"
        log_success "Test HTML uploaded to static website bucket"
    fi
    
    # Cleanup
    rm -rf temp-test-files
}

# Function to configure CORS for frontend integration
configure_cors() {
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "CORS configuration is handled by CloudFormation template"
    log_info "Verifying CORS configuration..."
    
    # Get bucket names
    local documents_bucket=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
        --output text)
    
    if [ -n "$documents_bucket" ]; then
        if aws s3api get-bucket-cors --bucket "$documents_bucket" > /dev/null 2>&1; then
            log_success "CORS configuration verified for documents bucket"
        else
            log_warning "CORS configuration not found for documents bucket"
        fi
    fi
}

# Function to set up monitoring
setup_monitoring() {
    log_info "Setting up S3 bucket monitoring..."
    
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    # Get SNS topic ARN
    local topic_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StorageAlertTopicArn`].OutputValue' \
        --output text)
    
    if [ -n "$topic_arn" ]; then
        log_success "Storage monitoring topic created: $topic_arn"
        log_info "Subscribe to this topic to receive storage alerts"
        
        # Optionally subscribe an email (uncomment and modify)
        # read -p "Enter email for storage alerts (optional): " email
        # if [ -n "$email" ]; then
        #     aws sns subscribe \
        #         --topic-arn "$topic_arn" \
        #         --protocol email \
        #         --notification-endpoint "$email"
        #     log_info "Email subscription created (check your email for confirmation)"
        # fi
    fi
}

# Function to display bucket information
display_bucket_info() {
    local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "Retrieving bucket information..."
    
    echo
    echo "=========================="
    echo "S3 Buckets Configuration"
    echo "=========================="
    
    # Get all outputs
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output table)
    
    echo "$outputs"
    
    echo
    echo "Environment Configuration:"
    echo "- Environment: $ENVIRONMENT"
    echo "- Region: $REGION"
    echo "- Stack Name: $stack_name"
    
    # Get website URL
    local website_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticWebsiteURL`].OutputValue' \
        --output text)
    
    if [ -n "$website_url" ]; then
        echo "- Static Website URL: $website_url"
    fi
    
    echo
    echo "Next Steps:"
    echo "1. Update .env files with bucket names"
    echo "2. Configure CloudFront CDN (Task 7)"
    echo "3. Deploy Lambda functions that use these buckets"
    echo "4. Set up bucket monitoring and alerts"
}

# Function to clean up test resources (for development)
cleanup_test_resources() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        log_info "Cleaning up test resources..."
        
        local stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
        
        # Get bucket names
        local documents_bucket=$(aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --region "$REGION" \
            --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
            --output text 2>/dev/null)
        
        if [ -n "$documents_bucket" ]; then
            aws s3 rm "s3://$documents_bucket/test/" --recursive 2>/dev/null || true
            log_info "Test files removed from documents bucket"
        fi
    fi
}

# Main execution
main() {
    echo "============================================="
    echo "Curriculum Alignment System - S3 Setup"
    echo "============================================="
    echo
    
    # Parse command line arguments
    case "${1:-setup}" in
        "setup")
            check_aws_config
            validate_template
            deploy_s3_stack
            sleep 10  # Wait for resources to be ready
            test_bucket_access
            upload_test_files
            configure_cors
            setup_monitoring
            display_bucket_info
            ;;
        "test")
            check_aws_config
            test_bucket_access
            upload_test_files
            ;;
        "info")
            check_aws_config
            display_bucket_info
            ;;
        "cleanup")
            check_aws_config
            cleanup_test_resources
            ;;
        "help")
            echo "Usage: $0 [setup|test|info|cleanup|help]"
            echo
            echo "Commands:"
            echo "  setup   - Deploy S3 buckets and configure (default)"
            echo "  test    - Test bucket access and upload test files"
            echo "  info    - Display bucket information"
            echo "  cleanup - Remove test resources (dev only)"
            echo "  help    - Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "S3 setup completed successfully!"
}

# Run main function with all arguments
main "$@"