#!/bin/bash

# Deploy IAM Roles and Policies for Curriculum Alignment Multi-Agent System
# This script creates all necessary IAM roles and policies with least privilege access

set -e  # Exit on any error

# Configuration
ENVIRONMENT="${1:-dev}"
CONFIG_FILE="config/${ENVIRONMENT}.json"
TEMPLATE_FILE="roles.yaml"

# Load configuration from JSON file
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file '$CONFIG_FILE' not found${NC}"
    echo "Available environments: dev, prod"
    exit 1
fi

# Extract configuration values using jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Please install jq to parse configuration files"
    echo "On macOS: brew install jq"
    echo "On Ubuntu: sudo apt-get install jq"
    exit 1
fi

PROJECT_NAME=$(jq -r '.projectName' "$CONFIG_FILE")
ACCOUNT_ID=$(jq -r '.account.id' "$CONFIG_FILE")
ACCOUNT_ALIAS=$(jq -r '.account.alias' "$CONFIG_FILE")
REGION=$(jq -r '.region' "$CONFIG_FILE")
RESOURCE_PREFIX=$(jq -r '.resourcePrefix' "$CONFIG_FILE")
STACK_NAME="${RESOURCE_PREFIX}-iam"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Curriculum Alignment IAM Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI and configure your credentials"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured or expired${NC}"
    echo "Please run 'aws configure' or refresh your credentials"
    exit 1
fi

# Check if CloudFormation template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: CloudFormation template '$TEMPLATE_FILE' not found${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed${NC}"
echo ""

# Validate account context
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "unknown")
if [ "$CURRENT_ACCOUNT" != "$ACCOUNT_ID" ]; then
    echo -e "${RED}WARNING: Account mismatch!${NC}"
    echo "Expected Account: $ACCOUNT_ID ($ACCOUNT_ALIAS)"
    echo "Current Account: $CURRENT_ACCOUNT"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Display configuration
echo -e "${YELLOW}Deployment Configuration:${NC}"
echo "Stack Name: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo "Environment: $ENVIRONMENT"
echo "Project: $PROJECT_NAME"
echo "Account: $ACCOUNT_ID ($ACCOUNT_ALIAS)"
echo "Region: $REGION"
echo "Resource Prefix: $RESOURCE_PREFIX"
echo ""

# Confirm deployment
read -p "Do you want to proceed with IAM deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting IAM deployment...${NC}"

# Validate CloudFormation template
echo -e "${YELLOW}Validating CloudFormation template...${NC}"
if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE --region $REGION; then
    echo -e "${GREEN}Template validation successful${NC}"
else
    echo -e "${RED}Template validation failed${NC}"
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region $REGION 2>/dev/null || echo "false")

if [ "$STACK_EXISTS" != "false" ]; then
    echo -e "${YELLOW}Stack exists. Updating...${NC}"
    OPERATION="update-stack"
    WAIT_CONDITION="stack-update-complete"
else
    echo -e "${YELLOW}Creating new stack...${NC}"
    OPERATION="create-stack"
    WAIT_CONDITION="stack-create-complete"
fi

# Extract tags from configuration
TAGS_JSON=$(jq -r '.tags | to_entries | map("Key=\(.key),Value=\(.value)") | join(" ")' "$CONFIG_FILE")

# Deploy/Update stack
echo -e "${YELLOW}Executing CloudFormation $OPERATION...${NC}"
aws cloudformation $OPERATION \
    --stack-name "$STACK_NAME" \
    --template-body file://$TEMPLATE_FILE \
    --parameters \
        ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
        ParameterKey=ResourcePrefix,ParameterValue=$RESOURCE_PREFIX \
        ParameterKey=AccountId,ParameterValue=$ACCOUNT_ID \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags $TAGS_JSON

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudFormation operation initiated successfully${NC}"
else
    echo -e "${RED}CloudFormation operation failed${NC}"
    exit 1
fi

# Wait for completion
echo -e "${YELLOW}Waiting for stack operation to complete...${NC}"
aws cloudformation wait $WAIT_CONDITION \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region $REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Stack operation completed successfully${NC}"
else
    echo -e "${RED}Stack operation failed or timed out${NC}"
    
    # Get stack events for debugging
    echo -e "${YELLOW}Recent stack events:${NC}"
    aws cloudformation describe-stack-events \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region $REGION \
        --max-items 10 \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
        --output table
    
    exit 1
fi

# Display outputs
echo -e "${YELLOW}Stack outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region $REGION \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue,Description]' \
    --output table

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}IAM Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Save outputs to file for reference
echo -e "${YELLOW}Saving stack outputs to iam-outputs-$ENVIRONMENT.json...${NC}"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    > "iam-outputs-$ENVIRONMENT.json"

echo -e "${GREEN}IAM roles and policies are now ready for the multi-agent system!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure PostgreSQL database (Task 3)"
echo "2. Setup Qdrant vector database (Task 4)"
echo "3. Initialize AWS SAM project (Task 5)"
echo ""
echo -e "${BLUE}Role ARNs are available in iam-outputs-$ENVIRONMENT.json${NC}"