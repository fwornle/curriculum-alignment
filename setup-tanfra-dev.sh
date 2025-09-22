#!/bin/bash

# Quick setup script for tanfra development account
# This script configures the project for your personal AWS account

set -e

echo "🚀 Setting up Curriculum Alignment for tanfra development account..."
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed"
    echo "Installing jq..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install jq
        else
            echo "Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    else
        echo "Please install jq manually for your OS"
        exit 1
    fi
fi

# Verify AWS CLI is configured
echo "🔍 Checking AWS configuration..."

# First check if AWS CLI responds at all
aws --version >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ AWS CLI not installed or not in PATH"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if credentials are configured
aws configure list >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ AWS configuration not found"
    echo "Please run: aws configure"
    exit 1
fi

# Try to get account information with better error handling
echo "Testing AWS credentials..."
AWS_ERROR=$(aws sts get-caller-identity 2>&1)
if [ $? -eq 0 ]; then
    CURRENT_ACCOUNT=$(echo "$AWS_ERROR" | jq -r '.Account' 2>/dev/null)
    CURRENT_USER=$(echo "$AWS_ERROR" | jq -r '.Arn' 2>/dev/null)
    echo "✅ AWS credentials working"
    echo "Account: $CURRENT_ACCOUNT"
    echo "User: $CURRENT_USER"
    
    if [ "$CURRENT_ACCOUNT" = "930500114053" ]; then
        echo "✅ Correct tanfra account (930500114053)"
    else
        echo "⚠️  Account mismatch!"
        echo "Expected: 930500114053 (tanfra)"
        echo "Current: $CURRENT_ACCOUNT"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Setup cancelled"
            exit 0
        fi
    fi
else
    echo "❌ AWS credentials test failed"
    echo "Error details:"
    echo "$AWS_ERROR"
    echo ""
    echo "Common issues:"
    echo "1. Invalid Access Key ID or Secret Access Key"
    echo "2. IAM user doesn't have sts:GetCallerIdentity permission"
    echo "3. Credentials are for wrong AWS partition"
    echo ""
    echo "Solutions:"
    echo "1. Run 'aws configure' with correct credentials"
    echo "2. Check IAM user permissions in AWS Console"
    echo "3. Verify account is 930500114053 (tanfra)"
    echo ""
    read -p "Continue with setup anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 1
    fi
    echo "⚠️  Continuing without account verification..."
fi

# Update development configuration with your preferences
echo "📝 Configuring development environment..."

# Update dev.json with user's preferences (optional)
if [ ! -f "infrastructure/config/dev.json" ]; then
    echo "❌ Development configuration file not found!"
    exit 1
fi

# Display current configuration
echo ""
echo "📋 Current Development Configuration:"
echo "Account: $(jq -r '.account.id' infrastructure/config/dev.json) ($(jq -r '.account.alias' infrastructure/config/dev.json))"
echo "Region: $(jq -r '.region' infrastructure/config/dev.json)"
echo "Resource Prefix: $(jq -r '.resourcePrefix' infrastructure/config/dev.json)"
echo "Default LLM: $(jq -r '.llmProviders.default' infrastructure/config/dev.json)"
echo ""

# Optional: Allow user to update email for notifications
read -p "📧 Enter your email for notifications (or press Enter to skip): " USER_EMAIL
if [ ! -z "$USER_EMAIL" ]; then
    jq --arg email "$USER_EMAIL" '.notifications.email = $email' infrastructure/config/dev.json > tmp.json && mv tmp.json infrastructure/config/dev.json
    echo "✅ Email updated to: $USER_EMAIL"
fi

echo ""
echo "🔧 Available setup options:"
echo "1. Deploy IAM roles only"
echo "2. Full infrastructure setup (IAM + databases)"
echo "3. Skip deployment (configuration only)"
echo ""

read -p "Choose option (1-3): " -n 1 -r SETUP_OPTION
echo ""

case $SETUP_OPTION in
    1)
        echo "🚀 Deploying IAM roles..."
        cd infrastructure
        ./deploy-iam.sh dev
        cd ..
        ;;
    2)
        echo "🚀 Full infrastructure setup will be available after Task 5 (AWS SAM setup)"
        echo "For now, deploying IAM roles..."
        cd infrastructure
        ./deploy-iam.sh dev
        cd ..
        ;;
    3)
        echo "⏭️  Skipping deployment"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Setup completed for tanfra development account!"
echo ""
echo "📚 Next steps:"
echo "1. Task 3: Configure PostgreSQL database (Supabase/Neon)"
echo "2. Task 4: Setup Qdrant vector database"
echo "3. Task 5: Initialize AWS SAM project"
echo ""
echo "📁 Configuration files:"
echo "- Development: infrastructure/config/dev.json"
echo "- Production: infrastructure/config/prod.json"
echo ""
echo "🚀 To deploy again: cd infrastructure && ./deploy-iam.sh dev"
echo ""

# Display useful information
echo "🔑 AWS Account Information:"
echo "Account ID: 930500114053"
echo "Alias: tanfra" 
echo "Region: eu-central-1"
echo "Resource Prefix: ca-dev"
echo ""
echo "💰 Estimated Monthly Costs (Development):"
echo "AWS Infrastructure: ~$50"
echo "LLM API Calls: ~$100"
echo "Total: ~$150"