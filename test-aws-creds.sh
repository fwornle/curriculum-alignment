#!/bin/bash

# Simple AWS credentials test
echo "🧪 Testing AWS Credentials for user 'reaillm'"
echo "============================================="
echo ""

echo "1. AWS CLI version:"
aws --version
echo ""

echo "2. Current AWS configuration:"
aws configure list
echo ""

echo "3. Testing STS call (this is what's failing):"
echo "Command: aws sts get-caller-identity"
aws sts get-caller-identity
echo ""

echo "If the above failed with 'InvalidClientTokenId', then:"
echo "- The Access Key ID or Secret Access Key is incorrect"
echo "- Double-check the credentials in AWS Console under IAM -> Users -> reaillm -> Security credentials"
echo "- Make sure you copied the keys correctly (no extra spaces)"
echo ""

echo "Expected result should show:"
echo "- Account: 930500114053"  
echo "- User: arn:aws:iam::930500114053:user/reaillm"