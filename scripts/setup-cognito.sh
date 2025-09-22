#!/bin/bash

# AWS Cognito Setup Script for Curriculum Alignment System
# Configures Cognito User Pool with authentication and authorization

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
    log_info "Validating Cognito User Pool CloudFormation template..."
    
    if aws cloudformation validate-template \
        --template-body file://infrastructure/cognito-user-pool.yaml > /dev/null; then
        log_success "CloudFormation template is valid"
    else
        log_error "CloudFormation template validation failed"
        exit 1
    fi
}

# Function to deploy Cognito User Pool stack
deploy_cognito_stack() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Deploying Cognito User Pool stack: $stack_name"
    
    # Get admin email from environment or prompt
    local admin_email="${COGNITO_ADMIN_EMAIL:-admin@ceu.edu}"
    if [ -z "$COGNITO_ADMIN_EMAIL" ]; then
        read -p "Enter administrator email address [$admin_email]: " input_email
        admin_email="${input_email:-$admin_email}"
    fi
    
    # Configure security settings based on environment
    local enable_mfa="true"
    local password_min_length="12"
    local token_validity_days="30"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        # Relaxed settings for development
        enable_mfa="false"
        password_min_length="8"
        token_validity_days="7"
    elif [ "$ENVIRONMENT" = "prod" ]; then
        # Strict settings for production
        enable_mfa="true"
        password_min_length="14"
        token_validity_days="14"
    fi
    
    log_info "Configuration:"
    log_info "- Admin Email: $admin_email"
    log_info "- MFA Enabled: $enable_mfa"
    log_info "- Min Password Length: $password_min_length"
    log_info "- Token Validity: $token_validity_days days"
    
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
        --template-file infrastructure/cognito-user-pool.yaml \
        --stack-name "$stack_name" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            AdminEmail="$admin_email" \
            EnableMFA="$enable_mfa" \
            PasswordMinLength="$password_min_length" \
            TokenValidityDays="$token_validity_days" \
            PasswordRequireUppercase="true" \
            PasswordRequireLowercase="true" \
            PasswordRequireNumbers="true" \
            PasswordRequireSymbols="true" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" \
        --tags \
            Project="$PROJECT_NAME" \
            Environment="$ENVIRONMENT" \
            ManagedBy=Script
    
    if [ $? -eq 0 ]; then
        log_success "Cognito User Pool stack deployed successfully"
    else
        log_error "Failed to deploy Cognito User Pool stack"
        exit 1
    fi
}

# Function to create admin user
create_admin_user() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Creating initial administrator user..."
    
    # Get Cognito configuration from stack outputs
    local user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text)
    
    if [ -z "$user_pool_id" ]; then
        log_error "Could not retrieve User Pool ID from stack outputs"
        exit 1
    fi
    
    # Get admin email
    local admin_email="${COGNITO_ADMIN_EMAIL:-admin@ceu.edu}"
    if [ -z "$COGNITO_ADMIN_EMAIL" ]; then
        read -p "Enter administrator email address [$admin_email]: " input_email
        admin_email="${input_email:-$admin_email}"
    fi
    
    # Check if admin user already exists
    if aws cognito-idp admin-get-user \
        --user-pool-id "$user_pool_id" \
        --username "$admin_email" \
        --region "$REGION" &> /dev/null; then
        log_info "Administrator user already exists: $admin_email"
    else
        # Create admin user
        log_info "Creating administrator user: $admin_email"
        
        # Generate temporary password
        local temp_password=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
        
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$admin_email" \
            --user-attributes \
                Name=email,Value="$admin_email" \
                Name=given_name,Value="System" \
                Name=family_name,Value="Administrator" \
                Name=email_verified,Value="true" \
                Name="custom:department",Value="IT Services" \
                Name="custom:role",Value="admin_staff" \
                Name="custom:access_level",Value="admin" \
            --temporary-password "$temp_password" \
            --message-action SUPPRESS \
            --region "$REGION"
        
        # Add user to administrators group
        aws cognito-idp admin-add-user-to-group \
            --user-pool-id "$user_pool_id" \
            --username "$admin_email" \
            --group-name "administrators" \
            --region "$REGION"
        
        log_success "Administrator user created: $admin_email"
        log_warning "Temporary password: $temp_password"
        log_info "Please save this password and change it on first login"
    fi
}

# Function to test Cognito configuration
test_cognito_configuration() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Testing Cognito configuration..."
    
    # Get stack outputs
    local user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text)
    
    local web_client_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebClientId`].OutputValue' \
        --output text)
    
    local identity_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
        --output text)
    
    local hosted_ui_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`HostedUIURL`].OutputValue' \
        --output text)
    
    # Test User Pool
    if aws cognito-idp describe-user-pool \
        --user-pool-id "$user_pool_id" \
        --region "$REGION" > /dev/null 2>&1; then
        log_success "User Pool accessible: $user_pool_id"
    else
        log_error "User Pool not accessible"
        exit 1
    fi
    
    # Test User Pool Client
    if aws cognito-idp describe-user-pool-client \
        --user-pool-id "$user_pool_id" \
        --client-id "$web_client_id" \
        --region "$REGION" > /dev/null 2>&1; then
        log_success "User Pool Client accessible: $web_client_id"
    else
        log_error "User Pool Client not accessible"
        exit 1
    fi
    
    # Test Identity Pool
    if aws cognito-identity describe-identity-pool \
        --identity-pool-id "$identity_pool_id" \
        --region "$REGION" > /dev/null 2>&1; then
        log_success "Identity Pool accessible: $identity_pool_id"
    else
        log_error "Identity Pool not accessible"
        exit 1
    fi
    
    log_success "All Cognito resources are accessible"
    
    # Test Hosted UI (basic connectivity)
    if curl -s -o /dev/null -w "%{http_code}" "$hosted_ui_url" | grep -q "200\|302"; then
        log_success "Hosted UI is responding"
    else
        log_warning "Hosted UI may not be fully ready yet"
    fi
}

# Function to update environment configuration
update_environment_config() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Updating environment configuration..."
    
    # Get stack outputs
    local user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text)
    
    local web_client_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebClientId`].OutputValue' \
        --output text)
    
    local mobile_client_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`MobileClientId`].OutputValue' \
        --output text)
    
    local identity_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
        --output text)
    
    local user_pool_domain=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
        --output text)
    
    # Create/update environment file
    local env_file=".env.${ENVIRONMENT}"
    
    # Create environment file if it doesn't exist
    if [ ! -f "$env_file" ]; then
        touch "$env_file"
    fi
    
    # Update Cognito configuration in environment file
    {
        echo "# Cognito Configuration"
        echo "COGNITO_USER_POOL_ID=$user_pool_id"
        echo "COGNITO_WEB_CLIENT_ID=$web_client_id"
        echo "COGNITO_MOBILE_CLIENT_ID=$mobile_client_id"
        echo "COGNITO_IDENTITY_POOL_ID=$identity_pool_id"
        echo "COGNITO_USER_POOL_DOMAIN=${user_pool_domain#https://}"
        echo "COGNITO_REGION=$REGION"
        echo ""
    } >> "$env_file"
    
    log_success "Environment configuration updated: $env_file"
}

# Function to setup monitoring
setup_monitoring() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Setting up Cognito monitoring..."
    
    # Get alert topic ARN
    local topic_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`SecurityAlertTopicArn`].OutputValue' \
        --output text)
    
    if [ -n "$topic_arn" ]; then
        log_success "Security monitoring configured with topic: $topic_arn"
        log_info "Subscribe to this topic to receive security alerts"
        
        # Optionally subscribe an email (uncomment and modify)
        # read -p "Enter email for security alerts (optional): " email
        # if [ -n "$email" ]; then
        #     aws sns subscribe \
        #         --topic-arn "$topic_arn" \
        #         --protocol email \
        #         --notification-endpoint "$email"
        #     log_info "Email subscription created (check your email for confirmation)"
        # fi
    fi
}

# Function to display Cognito information
display_cognito_info() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    log_info "Retrieving Cognito configuration information..."
    
    echo
    echo "===================================="
    echo "Cognito User Pool Configuration"
    echo "===================================="
    
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
    local user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text)
    
    local hosted_ui_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`HostedUIURL`].OutputValue' \
        --output text)
    
    echo "- User Pool ID: $user_pool_id"
    echo "- Hosted UI URL: $hosted_ui_url"
    
    echo
    echo "User Groups:"
    echo "- administrators: Full system access"
    echo "- faculty: Curriculum management access"
    echo "- students: Read-only access"
    
    echo
    echo "Next Steps:"
    echo "1. Configure frontend with Cognito settings"
    echo "2. Test authentication flow"
    echo "3. Set up API Gateway integration (Task 9)"
    echo "4. Create additional users and assign groups"
}

# Function to create test users
create_test_users() {
    local stack_name="${PROJECT_NAME}-cognito-${ENVIRONMENT}"
    
    if [ "$ENVIRONMENT" != "dev" ]; then
        log_info "Skipping test user creation (not in development environment)"
        return
    fi
    
    log_info "Creating test users for development..."
    
    local user_pool_id=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
        --output text)
    
    # Test faculty user
    local faculty_email="faculty.test@ceu.edu"
    if ! aws cognito-idp admin-get-user \
        --user-pool-id "$user_pool_id" \
        --username "$faculty_email" \
        --region "$REGION" &> /dev/null; then
        
        local temp_password=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
        
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$faculty_email" \
            --user-attributes \
                Name=email,Value="$faculty_email" \
                Name=given_name,Value="Test" \
                Name=family_name,Value="Faculty" \
                Name=email_verified,Value="true" \
                Name="custom:department",Value="Computer Science" \
                Name="custom:role",Value="professor" \
                Name="custom:access_level",Value="faculty" \
            --temporary-password "$temp_password" \
            --message-action SUPPRESS \
            --region "$REGION"
        
        aws cognito-idp admin-add-user-to-group \
            --user-pool-id "$user_pool_id" \
            --username "$faculty_email" \
            --group-name "faculty" \
            --region "$REGION"
        
        log_success "Test faculty user created: $faculty_email (password: $temp_password)"
    fi
    
    # Test student user
    local student_email="student.test@student.ceu.edu"
    if ! aws cognito-idp admin-get-user \
        --user-pool-id "$user_pool_id" \
        --username "$student_email" \
        --region "$REGION" &> /dev/null; then
        
        local temp_password=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)
        
        aws cognito-idp admin-create-user \
            --user-pool-id "$user_pool_id" \
            --username "$student_email" \
            --user-attributes \
                Name=email,Value="$student_email" \
                Name=given_name,Value="Test" \
                Name=family_name,Value="Student" \
                Name=email_verified,Value="true" \
                Name="custom:department",Value="Computer Science" \
                Name="custom:role",Value="student" \
                Name="custom:access_level",Value="student" \
                Name="custom:university_id",Value="ST123456" \
            --temporary-password "$temp_password" \
            --message-action SUPPRESS \
            --region "$REGION"
        
        aws cognito-idp admin-add-user-to-group \
            --user-pool-id "$user_pool_id" \
            --username "$student_email" \
            --group-name "students" \
            --region "$REGION"
        
        log_success "Test student user created: $student_email (password: $temp_password)"
    fi
}

# Main execution
main() {
    echo "==============================================="
    echo "Curriculum Alignment System - Cognito Setup"
    echo "==============================================="
    echo
    
    # Parse command line arguments
    case "${1:-setup}" in
        "setup")
            check_aws_config
            validate_template
            deploy_cognito_stack
            sleep 5  # Wait for resources to be ready
            create_admin_user
            test_cognito_configuration
            update_environment_config
            setup_monitoring
            create_test_users
            display_cognito_info
            ;;
        "test")
            check_aws_config
            test_cognito_configuration
            ;;
        "info")
            check_aws_config
            display_cognito_info
            ;;
        "users")
            check_aws_config
            create_test_users
            ;;
        "monitor")
            check_aws_config
            setup_monitoring
            ;;
        "help")
            echo "Usage: $0 [setup|test|info|users|monitor|help]"
            echo
            echo "Commands:"
            echo "  setup   - Deploy Cognito User Pool and configure (default)"
            echo "  test    - Test Cognito configuration"
            echo "  info    - Display Cognito information"
            echo "  users   - Create test users (dev environment only)"
            echo "  monitor - Setup monitoring and alerts"
            echo "  help    - Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "Cognito setup completed successfully!"
}

# Run main function with all arguments
main "$@"