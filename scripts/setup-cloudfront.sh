#!/bin/bash

# CloudFront CDN Setup Script for Curriculum Alignment System
# Configures CloudFront distribution with caching, security, and monitoring

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

# Function to get S3 bucket names from existing stack
get_s3_bucket_names() {
    local s3_stack_name="${PROJECT_NAME}-s3-${ENVIRONMENT}"
    
    log_info "Getting S3 bucket names from stack: $s3_stack_name"
    
    # Check if S3 stack exists
    if ! aws cloudformation describe-stacks \
        --stack-name "$s3_stack_name" \
        --region "$REGION" &> /dev/null; then
        log_error "S3 stack '$s3_stack_name' not found. Please deploy S3 buckets first."
        log_info "Run: npm run s3:setup"
        exit 1
    fi
    
    # Get bucket names
    STATIC_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$s3_stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticWebsiteBucketName`].OutputValue' \
        --output text)
    
    DOCUMENTS_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$s3_stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DocumentsBucketName`].OutputValue' \
        --output text)
    
    if [ -z "$STATIC_BUCKET" ] || [ -z "$DOCUMENTS_BUCKET" ]; then
        log_error "Could not retrieve S3 bucket names from stack outputs"
        exit 1
    fi
    
    log_success "Retrieved S3 bucket names"
    log_info "Static Website Bucket: $STATIC_BUCKET"
    log_info "Documents Bucket: $DOCUMENTS_BUCKET"
}

# Function to validate CloudFormation template
validate_template() {
    log_info "Validating CloudFront distribution CloudFormation template..."
    
    if aws cloudformation validate-template \
        --template-body file://infrastructure/cloudfront-distribution.yaml > /dev/null; then
        log_success "CloudFormation template is valid"
    else
        log_error "CloudFormation template validation failed"
        exit 1
    fi
}

# Function to deploy CloudFront distribution stack
deploy_cloudfront_stack() {
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    log_info "Deploying CloudFront distribution stack: $stack_name"
    
    # Get custom domain and certificate from environment variables (if set)
    local domain_name="${CLOUDFRONT_DOMAIN_NAME:-}"
    local certificate_arn="${CLOUDFRONT_CERTIFICATE_ARN:-}"
    
    # Determine price class based on environment
    local price_class="PriceClass_100"
    if [ "$ENVIRONMENT" = "prod" ]; then
        price_class="PriceClass_All"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        price_class="PriceClass_200"
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
        "StaticWebsiteBucketName=$STATIC_BUCKET"
        "DocumentsBucketName=$DOCUMENTS_BUCKET"
        "EnableCompression=true"
        "PriceClass=$price_class"
    )
    
    # Add optional parameters if set
    if [ -n "$domain_name" ]; then
        parameters+=("DomainName=$domain_name")
        log_info "Using custom domain: $domain_name"
    fi
    
    if [ -n "$certificate_arn" ]; then
        parameters+=("CertificateArn=$certificate_arn")
        log_info "Using SSL certificate: $certificate_arn"
    fi
    
    # Deploy stack
    aws cloudformation deploy \
        --template-file infrastructure/cloudfront-distribution.yaml \
        --stack-name "$stack_name" \
        --parameter-overrides "${parameters[@]}" \
        --capabilities CAPABILITY_IAM \
        --region "$REGION" \
        --tags \
            Project="$PROJECT_NAME" \
            Environment="$ENVIRONMENT" \
            ManagedBy=Script
    
    if [ $? -eq 0 ]; then
        log_success "CloudFront distribution stack deployed successfully"
    else
        log_error "Failed to deploy CloudFront distribution stack"
        exit 1
    fi
}

# Function to update S3 bucket policies for CloudFront OAC
update_s3_bucket_policies() {
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    log_info "Updating S3 bucket policies for CloudFront Origin Access Control..."
    
    # Get CloudFront distribution ARN
    local distribution_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionArn`].OutputValue' \
        --output text)
    
    if [ -z "$distribution_arn" ]; then
        log_error "Could not retrieve CloudFront distribution ARN"
        exit 1
    fi
    
    # Update static website bucket policy
    cat > temp-static-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${STATIC_BUCKET}/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "${distribution_arn}"
                }
            }
        }
    ]
}
EOF
    
    # Update documents bucket policy
    cat > temp-documents-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${DOCUMENTS_BUCKET}/public/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "${distribution_arn}"
                }
            }
        }
    ]
}
EOF
    
    # Apply bucket policies
    aws s3api put-bucket-policy \
        --bucket "$STATIC_BUCKET" \
        --policy file://temp-static-bucket-policy.json
    
    aws s3api put-bucket-policy \
        --bucket "$DOCUMENTS_BUCKET" \
        --policy file://temp-documents-bucket-policy.json
    
    # Cleanup temporary files
    rm -f temp-static-bucket-policy.json temp-documents-bucket-policy.json
    
    log_success "S3 bucket policies updated for CloudFront access"
}

# Function to test CloudFront distribution
test_cloudfront_distribution() {
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    log_info "Testing CloudFront distribution..."
    
    # Get distribution domain name
    local domain_name=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
        --output text)
    
    if [ -z "$domain_name" ]; then
        log_error "Could not retrieve CloudFront domain name"
        exit 1
    fi
    
    log_info "Distribution domain: $domain_name"
    
    # Wait for distribution to be deployed
    log_info "Waiting for CloudFront distribution to be deployed (this may take 5-15 minutes)..."
    
    local distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    # Check deployment status
    local status=$(aws cloudfront get-distribution \
        --id "$distribution_id" \
        --query 'Distribution.Status' \
        --output text)
    
    log_info "Distribution status: $status"
    
    if [ "$status" = "Deployed" ]; then
        log_success "CloudFront distribution is deployed and ready"
        
        # Test basic connectivity
        if curl -s -o /dev/null -w "%{http_code}" "https://$domain_name" | grep -q "200\|403\|404"; then
            log_success "CloudFront distribution is responding"
        else
            log_warning "CloudFront distribution may not be fully ready yet"
        fi
    else
        log_warning "CloudFront distribution is still deploying. Status: $status"
        log_info "You can check the status later with: aws cloudfront get-distribution --id $distribution_id"
    fi
}

# Function to upload test content
upload_test_content() {
    log_info "Uploading test content to S3 buckets..."
    
    # Create test content directory
    mkdir -p temp-test-content
    
    # Create test index.html for React app
    cat > temp-test-content/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curriculum Alignment System</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.2rem;
            line-height: 1.6;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .status {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 Curriculum Alignment System</h1>
        <p>Multi-Agent Curriculum Alignment System (MACAS) for Central European University</p>
        
        <div class="status">
            <h3>Infrastructure Status</h3>
            <div class="badge">✅ CloudFront CDN</div>
            <div class="badge">✅ S3 Storage</div>
            <div class="badge">🚀 Ready for React App</div>
        </div>
        
        <p style="margin-top: 2rem; font-size: 1rem; opacity: 0.7;">
            This is a test page. The React frontend will be deployed here.
        </p>
    </div>
</body>
</html>
EOF
    
    # Create test documentation
    cat > temp-test-content/api-docs.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Curriculum Alignment System - API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #667eea; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        code { background: #e8e8e8; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>API Documentation</h1>
    <p>Welcome to the Curriculum Alignment System API documentation.</p>
    
    <div class="endpoint">
        <h3>GET /api/health</h3>
        <p>Health check endpoint</p>
        <code>curl https://api.curriculum-alignment.ceu.edu/health</code>
    </div>
    
    <div class="endpoint">
        <h3>POST /api/analyze</h3>
        <p>Analyze curriculum content</p>
        <code>curl -X POST https://api.curriculum-alignment.ceu.edu/analyze</code>
    </div>
    
    <p><em>This is test documentation served via CloudFront CDN.</em></p>
</body>
</html>
EOF
    
    # Upload to static website bucket
    aws s3 cp temp-test-content/index.html "s3://$STATIC_BUCKET/" \
        --content-type "text/html" \
        --cache-control "max-age=300"
    
    # Create public directory in documents bucket and upload
    aws s3 cp temp-test-content/api-docs.html "s3://$DOCUMENTS_BUCKET/public/docs/" \
        --content-type "text/html" \
        --cache-control "max-age=3600"
    
    # Cleanup
    rm -rf temp-test-content
    
    log_success "Test content uploaded successfully"
}

# Function to setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up CloudFront monitoring..."
    
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    # Get alert topic ARN
    local topic_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`AlertTopicArn`].OutputValue' \
        --output text)
    
    if [ -n "$topic_arn" ]; then
        log_success "CloudFront monitoring configured with topic: $topic_arn"
        log_info "Subscribe to this topic to receive CloudFront alerts"
        
        # Optionally subscribe an email (uncomment and modify)
        # read -p "Enter email for CloudFront alerts (optional): " email
        # if [ -n "$email" ]; then
        #     aws sns subscribe \
        #         --topic-arn "$topic_arn" \
        #         --protocol email \
        #         --notification-endpoint "$email"
        #     log_info "Email subscription created (check your email for confirmation)"
        # fi
    fi
}

# Function to display distribution information
display_distribution_info() {
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    log_info "Retrieving CloudFront distribution information..."
    
    echo
    echo "=================================="
    echo "CloudFront Distribution Summary"
    echo "=================================="
    
    # Get all outputs
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output table)
    
    echo "$outputs"
    
    echo
    echo "Configuration:"
    echo "- Environment: $ENVIRONMENT"
    echo "- Region: $REGION"
    echo "- Stack Name: $stack_name"
    
    # Get distribution details
    local distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    local domain_name=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
        --output text)
    
    local website_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
        --output text)
    
    echo "- Distribution ID: $distribution_id"
    echo "- CloudFront Domain: $domain_name"
    echo "- Website URL: $website_url"
    
    echo
    echo "Test URLs:"
    echo "- Main Site: $website_url"
    echo "- API Docs: $website_url/docs/api-docs.html"
    
    echo
    echo "Next Steps:"
    echo "1. Deploy React frontend to S3 static bucket"
    echo "2. Configure custom domain and SSL certificate"
    echo "3. Set up monitoring and alerts"
    echo "4. Integrate with API Gateway (Task 9)"
}

# Function to invalidate CloudFront cache
invalidate_cache() {
    local stack_name="${PROJECT_NAME}-cloudfront-${ENVIRONMENT}"
    
    log_info "Creating CloudFront cache invalidation..."
    
    local distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    if [ -n "$distribution_id" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$distribution_id" \
            --paths "/*" > /dev/null
        
        log_success "Cache invalidation created for distribution: $distribution_id"
    else
        log_error "Could not find distribution ID"
    fi
}

# Main execution
main() {
    echo "==============================================="
    echo "Curriculum Alignment System - CloudFront Setup"
    echo "==============================================="
    echo
    
    # Parse command line arguments
    case "${1:-setup}" in
        "setup")
            check_aws_config
            get_s3_bucket_names
            validate_template
            deploy_cloudfront_stack
            sleep 5  # Wait for stack to be created
            update_s3_bucket_policies
            upload_test_content
            setup_monitoring
            display_distribution_info
            ;;
        "test")
            check_aws_config
            test_cloudfront_distribution
            ;;
        "info")
            check_aws_config
            display_distribution_info
            ;;
        "invalidate")
            check_aws_config
            invalidate_cache
            ;;
        "monitor")
            check_aws_config
            setup_monitoring
            ;;
        "help")
            echo "Usage: $0 [setup|test|info|invalidate|monitor|help]"
            echo
            echo "Commands:"
            echo "  setup      - Deploy CloudFront distribution and configure (default)"
            echo "  test       - Test CloudFront distribution"
            echo "  info       - Display distribution information"
            echo "  invalidate - Invalidate CloudFront cache"
            echo "  monitor    - Setup monitoring and alerts"
            echo "  help       - Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "CloudFront setup completed successfully!"
}

# Run main function with all arguments
main "$@"