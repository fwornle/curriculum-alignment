# Development Environment Deployment

This directory contains deployment scripts and configuration for the Curriculum Alignment System development environment.

## Overview

The development environment provides:
- **Complete AWS serverless infrastructure** deployed via CloudFormation
- **Automated testing and validation** of all system components
- **Monitoring and logging** for development activities
- **Easy cleanup and redeployment** for rapid iteration

## Quick Start

### Deploy Development Environment
```bash
./deploy.sh
```

### Check Environment Status
```bash
./status.sh
```

### Clean Up Environment
```bash
./cleanup.sh
```

## Scripts

### deploy.sh
**Purpose**: Complete deployment of the development environment

**Features**:
- Prerequisites checking (AWS CLI, SAM CLI, Node.js, credentials)
- SAM template validation
- Application building (frontend + lambda functions)
- CloudFormation stack deployment
- Smoke testing of deployed resources
- Deployment status reporting

**Usage**:
```bash
./deploy.sh                    # Full deployment
./deploy.sh --no-build         # Skip build step
./deploy.sh --no-tests         # Skip smoke tests
./deploy.sh --help             # Show help
```

**Requirements**:
- AWS CLI configured with appropriate permissions
- SAM CLI installed (latest version recommended)
- Node.js 18+ and npm
- 2GB+ available disk space
- Internet connectivity

### status.sh
**Purpose**: Health check and status monitoring of the development environment

**Features**:
- AWS connectivity verification
- CloudFormation stack status
- Lambda function health checks
- API Gateway endpoint testing
- S3 bucket accessibility
- CloudWatch logs review
- Database configuration verification

**Usage**:
```bash
./status.sh                    # Complete status check
./status.sh --json             # JSON output format
./status.sh --help             # Show help
```

### cleanup.sh
**Purpose**: Complete removal of the development environment

**Features**:
- Safety confirmation prompts
- S3 bucket content cleanup (all versions and delete markers)
- CloudWatch logs deletion
- CloudFormation stack deletion with progress monitoring
- Cleanup verification and reporting

**Usage**:
```bash
./cleanup.sh                  # Interactive cleanup
./cleanup.sh --force          # Skip confirmation
./cleanup.sh --help           # Show help
```

**⚠️ Warning**: This operation is irreversible and will delete all data in the development environment.

## Environment Configuration

### AWS Configuration
The deployment uses the following AWS configuration:
- **Region**: eu-central-1
- **Stack Name**: curriculum-alignment-dev
- **Profile**: Default AWS CLI profile

### SAM Configuration
Configuration is defined in `samconfig.toml` under the `[dev]` section:
- Environment-specific parameters
- Resource tags
- Build and deployment settings

### Environment Variables
Environment-specific settings are loaded from:
- `.env.development` (if exists)
- `.env.example` (fallback template)

## Architecture

### CloudFormation Resources
The development environment creates:
- **Lambda Functions**: All application microservices
- **API Gateway**: RESTful API endpoints
- **S3 Buckets**: Document storage and static assets
- **DynamoDB Tables**: Application data storage
- **IAM Roles**: Function execution permissions
- **CloudWatch Logs**: Application logging
- **Cognito**: User authentication (if configured)

### Network Configuration
- Public API Gateway endpoints
- Lambda functions in default VPC
- S3 buckets with public read access (configurable)
- CloudWatch logs with 14-day retention

### Security
- IAM roles with least privilege access
- API Gateway with CORS enabled for development
- Encrypted S3 storage (server-side)
- VPC endpoints for private AWS service access (optional)

## Monitoring and Logging

### CloudWatch Integration
- **Function Logs**: `/aws/lambda/curriculum-alignment-dev-*`
- **API Gateway Logs**: Execution and access logs
- **Custom Metrics**: Application performance metrics
- **Alarms**: Error rate and latency monitoring

### Local Monitoring
```bash
# View recent logs
sam logs -n CoordinatorFunction --stack-name curriculum-alignment-dev --tail

# Monitor stack events
aws cloudformation describe-stack-events --stack-name curriculum-alignment-dev

# Check function metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration --dimensions Name=FunctionName,Value=curriculum-alignment-dev-CoordinatorFunction --start-time 2023-01-01T00:00:00Z --end-time 2023-01-02T00:00:00Z --period 3600 --statistics Average
```

## Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check template validation
sam validate --config-env dev

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name curriculum-alignment-dev

# Check IAM permissions
aws sts get-caller-identity
aws iam get-user
```

#### Function Errors
```bash
# View function logs
./status.sh
sam logs -n FunctionName --stack-name curriculum-alignment-dev

# Test function directly
aws lambda invoke --function-name curriculum-alignment-dev-CoordinatorFunction --payload '{}' response.json
```

#### API Gateway Issues
```bash
# Test API health
curl https://your-api-endpoint/health

# Check API Gateway logs
aws logs filter-log-events --log-group-name API-Gateway-Execution-Logs_xxx
```

### Recovery Procedures

#### Partial Deployment Failure
1. Check CloudFormation stack status: `./status.sh`
2. Review stack events for specific errors
3. Fix underlying issue (permissions, quotas, etc.)
4. Redeploy: `./deploy.sh`

#### Complete Environment Reset
1. Clean existing environment: `./cleanup.sh`
2. Wait for complete cleanup (check AWS console)
3. Redeploy fresh environment: `./deploy.sh`

#### Resource Conflicts
1. Identify conflicting resources in AWS console
2. Manually remove or rename conflicting resources
3. Retry deployment: `./deploy.sh`

## Development Workflow

### Typical Development Cycle
1. **Code Changes**: Modify lambda functions or frontend
2. **Local Testing**: Use SAM local for testing
3. **Deployment**: Deploy to dev environment
4. **Testing**: Run smoke tests and integration tests
5. **Monitoring**: Check logs and metrics
6. **Iteration**: Repeat cycle

### Local Development
```bash
# Start local API
sam local start-api --config-env dev

# Start frontend development server
cd frontend && npm run dev

# Run tests locally
npm test
npm run test:e2e
```

### Environment Promotion
```bash
# From development to staging
sam deploy --config-env staging

# From staging to production
sam deploy --config-env prod
```

## Cost Management

### Cost Optimization
- Lambda functions use ARM architecture for lower costs
- S3 buckets configured with intelligent tiering
- CloudWatch logs with automatic retention
- Development resources automatically stop when not in use

### Cost Monitoring
```bash
# Check current costs
aws ce get-cost-and-usage --time-period Start=2023-01-01,End=2023-01-31 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE

# Set up billing alerts (one-time setup)
aws budgets create-budget --account-id YOUR_ACCOUNT_ID --budget file://budget.json
```

### Resource Cleanup
Regular cleanup of development resources:
- Remove old CloudFormation stacks
- Clean up unused S3 objects
- Delete old CloudWatch log streams
- Remove test data from DynamoDB

## Security Considerations

### Development Security
- Use IAM roles instead of access keys where possible
- Enable CloudTrail for API auditing
- Regular security scanning of dependencies
- Environment isolation from production

### Secrets Management
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret --name curriculum-alignment/dev/database --secret-string '{"username":"user","password":"pass"}'

# Access secrets in Lambda functions
aws secretsmanager get-secret-value --secret-id curriculum-alignment/dev/database
```

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review CloudWatch logs and metrics
- **Monthly**: Update dependencies and redeploy
- **Quarterly**: Security review and compliance check

### Getting Help
1. Check this README and script help messages
2. Review CloudWatch logs for specific errors
3. Check AWS CloudFormation console for stack events
4. Consult AWS documentation for service-specific issues

### Useful Commands
```bash
# Complete status overview
./status.sh

# Deploy with verbose output
sam deploy --config-env dev --debug

# View all stack resources
aws cloudformation describe-stack-resources --stack-name curriculum-alignment-dev

# Monitor real-time logs
aws logs tail /aws/lambda/curriculum-alignment-dev-CoordinatorFunction --follow
```

## File Structure
```
deploy/dev/
├── deploy.sh          # Main deployment script
├── cleanup.sh         # Environment cleanup script
├── status.sh          # Status monitoring script
├── README.md          # This documentation
├── outputs.json       # Stack outputs (generated)
├── resources-to-cleanup.json  # Cleanup tracking (generated)
├── deploy.log         # Deployment logs (generated)
└── cleanup.log        # Cleanup logs (generated)
```

## Configuration Files
- `../../samconfig.toml` - SAM deployment configuration
- `../../template.yaml` - CloudFormation template
- `../../.env.development` - Environment variables
- `../../package.json` - Project dependencies

For more information about the overall system architecture, see the main [README.md](../../README.md) and [SAM-README.md](../../SAM-README.md).