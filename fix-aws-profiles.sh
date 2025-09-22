#!/bin/bash

# Fix AWS Profile Configuration for Mixed SSO/Access Key Setup
echo "🔧 AWS Profile Configuration Fix"
echo "================================="
echo ""

echo "Current situation:"
echo "- Work account uses SSO"
echo "- Personal tanfra account uses access keys"
echo "- These are conflicting"
echo ""

echo "📁 Checking current AWS config files..."
echo ""

echo "~/.aws/config contents:"
cat ~/.aws/config 2>/dev/null || echo "Config file not found"
echo ""

echo "~/.aws/credentials profiles:"
if [ -f ~/.aws/credentials ]; then
    grep "\[" ~/.aws/credentials
else
    echo "Credentials file not found"
fi
echo ""

echo "🛠️  Recommended fix:"
echo ""
echo "Option 1: Create a separate profile for tanfra account"
echo "------------------------------------------------------"
echo "aws configure --profile tanfra"
echo "# Enter your tanfra access keys when prompted"
echo ""
echo "Then use: export AWS_PROFILE=tanfra"
echo "Or run commands with: aws --profile tanfra sts get-caller-identity"
echo ""

echo "Option 2: Temporarily clear SSO config"
echo "---------------------------------------"
echo "1. Backup current config:"
echo "   cp ~/.aws/config ~/.aws/config.backup"
echo "   cp ~/.aws/credentials ~/.aws/credentials.backup"
echo ""
echo "2. Remove SSO sections from ~/.aws/config"
echo "3. Keep only the tanfra credentials in ~/.aws/credentials"
echo ""

echo "Option 3: Use environment variables (temporary)"
echo "------------------------------------------------"
echo "export AWS_ACCESS_KEY_ID=your_tanfra_access_key"
echo "export AWS_SECRET_ACCESS_KEY=your_tanfra_secret_key"
echo "export AWS_DEFAULT_REGION=eu-central-1"
echo "unset AWS_PROFILE"
echo ""

echo "🧪 Quick test which option to use:"
echo ""
read -p "Do you want me to help set up a tanfra profile? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting up tanfra profile..."
    echo ""
    echo "Please enter your tanfra account credentials:"
    aws configure --profile tanfra
    
    echo ""
    echo "Testing tanfra profile..."
    aws --profile tanfra sts get-caller-identity
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Success! To use tanfra account:"
        echo "export AWS_PROFILE=tanfra"
        echo ""
        echo "Add this to your shell profile (~/.zshrc or ~/.bash_profile):"
        echo "alias aws-tanfra='export AWS_PROFILE=tanfra'"
        echo "alias aws-work='unset AWS_PROFILE'  # or set to your work profile"
    else
        echo ""
        echo "❌ Still failing. Check the access keys are correct."
    fi
else
    echo "Skipping profile setup."
    echo ""
    echo "Manual steps:"
    echo "1. aws configure --profile tanfra"
    echo "2. export AWS_PROFILE=tanfra"
    echo "3. ./setup-tanfra-dev.sh"
fi