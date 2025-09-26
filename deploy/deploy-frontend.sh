#!/bin/bash

# Frontend-only deployment script for Curriculum Alignment System
# This deploys to curriculum.tanfra.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME="curriculum.tanfra.com"
STACK_NAME="curriculum-alignment-frontend"
REGION="eu-central-1"
CERT_REGION="us-east-1"  # ACM certificates for CloudFront must be in us-east-1

echo -e "${BLUE}🚀 Starting frontend deployment to ${DOMAIN_NAME}${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure'${NC}"
    exit 1
fi

# Build the frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd "$(dirname "$0")/.."
npm install
npm run build:frontend

# Note: Using existing tanfra.com hosted zone (Z0723384SK5JNYHFTSGW)

# Create or update the CloudFormation stack
echo -e "${BLUE}🏗️  Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file deploy/frontend-only.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        DomainName=$DOMAIN_NAME \
        Environment=prod \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Stack deployed successfully${NC}"
echo -e "${BLUE}📤 Uploading frontend files to S3...${NC}"

# Sync frontend files to S3
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "*.html" \
    --region $REGION

# Upload HTML files with different cache settings
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --region $REGION

echo -e "${BLUE}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✅ Cache invalidation created: ${INVALIDATION_ID}${NC}"

# Wait for certificate validation (if needed)
echo -e "${BLUE}🔒 Checking SSL certificate status...${NC}"
aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $REGION 2>/dev/null || echo "Stack already exists"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📱 Your application is available at:${NC}"
echo -e "${GREEN}  ${CLOUDFRONT_URL}${NC}"
echo -e "${YELLOW}⏰ Note: CloudFront distribution may take 5-10 minutes to fully propagate${NC}"

# Show useful information
echo -e "\n${BLUE}📋 Deployment Information:${NC}"
echo -e "  • CloudFront URL: ${CLOUDFRONT_URL}"
echo -e "  • S3 Bucket: ${BUCKET_NAME}"
echo -e "  • CloudFront Distribution: ${DISTRIBUTION_ID}"

echo -e "\n${BLUE}🔧 Useful commands:${NC}"
echo -e "  • View stack: aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION}"
echo -e "  • Update frontend: aws s3 sync frontend/dist/ s3://${BUCKET_NAME}/ --delete --region ${REGION}"
echo -e "  • Invalidate cache: aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths '/*'"