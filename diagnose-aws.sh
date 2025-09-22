#!/bin/bash

# AWS Credentials Diagnostic Script
echo "🔍 AWS Credentials Diagnostic"
echo "================================"
echo ""

# Check AWS CLI version
echo "📋 AWS CLI Version:"
aws --version 2>/dev/null || echo "❌ AWS CLI not installed"
echo ""

# Check configuration files
echo "📁 AWS Configuration Files:"
echo "Config file: ~/.aws/config"
if [ -f ~/.aws/config ]; then
    echo "✅ Config file exists"
    echo "Contents (without sensitive data):"
    grep -v "aws_" ~/.aws/config 2>/dev/null || echo "No non-sensitive content"
else
    echo "❌ Config file missing"
fi
echo ""

echo "Credentials file: ~/.aws/credentials"
if [ -f ~/.aws/credentials ]; then
    echo "✅ Credentials file exists"
    echo "Profiles found:"
    grep "\[" ~/.aws/credentials 2>/dev/null || echo "No profiles found"
else
    echo "❌ Credentials file missing"
fi
echo ""

# Check environment variables
echo "🌍 Environment Variables:"
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "✅ AWS_ACCESS_KEY_ID is set (${AWS_ACCESS_KEY_ID:0:4}...)"
else
    echo "❌ AWS_ACCESS_KEY_ID not set"
fi

if [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "✅ AWS_SECRET_ACCESS_KEY is set (${AWS_SECRET_ACCESS_KEY:0:4}...)"
else
    echo "❌ AWS_SECRET_ACCESS_KEY not set"
fi

if [ ! -z "$AWS_DEFAULT_REGION" ]; then
    echo "✅ AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION"
else
    echo "❌ AWS_DEFAULT_REGION not set"
fi

if [ ! -z "$AWS_PROFILE" ]; then
    echo "✅ AWS_PROFILE: $AWS_PROFILE"
else
    echo "ℹ️  AWS_PROFILE not set (using default)"
fi
echo ""

# Test basic AWS commands
echo "🧪 Testing AWS Commands:"

echo "1. Testing configuration list:"
aws configure list 2>/dev/null || echo "❌ aws configure list failed"
echo ""

echo "2. Testing STS get-caller-identity:"
aws sts get-caller-identity 2>/dev/null || echo "❌ aws sts get-caller-identity failed"
echo ""

echo "3. Testing S3 list (minimal permissions test):"
aws s3 ls 2>/dev/null || echo "❌ aws s3 ls failed (this might be expected)"
echo ""

# Common issues and solutions
echo "🔧 Common Solutions:"
echo "1. If credentials are invalid:"
echo "   aws configure"
echo ""
echo "2. If using MFA/temporary credentials:"
echo "   aws sts get-session-token --duration-seconds 3600"
echo ""
echo "3. If using SSO:"
echo "   aws sso login"
echo ""
echo "4. Check IAM user has minimum permissions:"
echo "   - sts:GetCallerIdentity"
echo "   - iam:ListRoles (for CloudFormation)"
echo "   - cloudformation:* (for deployment)"
echo ""
echo "5. Verify account ID: 930500114053 (tanfra)"