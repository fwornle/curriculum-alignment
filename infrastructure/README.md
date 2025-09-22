# Infrastructure - IAM Roles and Policies

This directory contains the AWS Infrastructure as Code (IaC) templates for the Curriculum Alignment Multi-Agent System IAM configuration.

## Overview

The IAM setup follows the principle of least privilege, creating specific roles for each agent with minimal required permissions. This ensures security while enabling all necessary functionality for the multi-agent system.

## Components

### IAM Policies (`iam-policies.json`)
Contains JSON policy documents for all agents and services:

- **CoordinatorAgentPolicy** - Central orchestration with Lambda/Step Functions access
- **WebSearchAgentPolicy** - Web search with S3 and Secrets Manager access  
- **BrowserAgentPolicy** - Web scraping with S3 storage capabilities
- **DocumentProcessingAgentPolicy** - Document operations with full S3 access
- **AccreditationExpertAgentPolicy** - Analysis with read-only S3 access
- **QAAgentPolicy** - Quality assurance with document modification rights
- **SemanticSearchAgentPolicy** - Vector search with minimal permissions
- **ChatInterfaceAgentPolicy** - Chat functionality with Secrets Manager access
- **APIGatewayExecutionPolicy** - API Gateway Lambda integration
- **DeadLetterQueueHandlerPolicy** - Error handling and recovery

### IAM Roles (`roles.yaml`)
CloudFormation template defining all IAM roles:

#### Agent Roles
- `CoordinatorAgentRole` - Central workflow orchestration
- `WebSearchAgentRole` - Peer university discovery
- `BrowserAgentRole` - TimeEdit and website scraping
- `DocumentProcessingAgentRole` - Excel/Word/PDF processing
- `AccreditationExpertAgentRole` - Curriculum analysis
- `QAAgentRole` - Terminology standardization
- `SemanticSearchAgentRole` - Vector similarity search
- `ChatInterfaceAgentRole` - Interactive Q&A

#### Service Roles
- `APIGatewayExecutionRole` - API Gateway Lambda integration
- `StepFunctionsExecutionRole` - Workflow orchestration
- `EventBridgeExecutionRole` - Event-driven architecture
- `DeadLetterQueueHandlerRole` - Error recovery
- `CloudWatchRole` - Centralized logging

## Account Configuration

The infrastructure is designed to be easily configurable for different AWS accounts:

### Development Account (tanfra)
- **Account ID**: 930500114053
- **Alias**: tanfra  
- **Region**: eu-central-1
- **Resource Prefix**: ca-dev
- **Configuration**: `config/dev.json`

### Production Account (Future)
- **Configuration**: `config/prod.json`
- **Requires**: Production AWS account setup

## Deployment

### Prerequisites
1. AWS CLI installed and configured
2. Valid AWS credentials with IAM permissions
3. CloudFormation permissions
4. jq installed for JSON parsing

### Quick Setup for tanfra Development
```bash
# One-command setup for personal development account
./setup-tanfra-dev.sh

# Or manual deployment
cd infrastructure && ./deploy-iam.sh dev
```

### Manual Deployment
```bash
# Deploy to development environment
./deploy-iam.sh dev

# Deploy to production environment  
./deploy-iam.sh prod
```

### Manual Deployment
```bash
# Validate template
aws cloudformation validate-template --template-body file://roles.yaml

# Create stack
aws cloudformation create-stack \
  --stack-name curriculum-alignment-iam-dev \
  --template-body file://roles.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name curriculum-alignment-iam-dev
```

## Security Features

### Least Privilege Access
- Each agent has only the minimum permissions required
- Resource ARNs are scoped to project-specific resources
- No wildcard permissions except where necessary for CloudWatch logs

### Resource Scoping
- S3 bucket access limited to `curriculum-alignment-*` buckets
- Lambda function access scoped to `curriculum-alignment-*` functions
- Secrets Manager access limited to `curriculum-alignment/*` secrets
- SQS queue access restricted to project queues

### Trust Relationships
- Lambda execution roles trust only `lambda.amazonaws.com`
- API Gateway roles trust only `apigateway.amazonaws.com`
- Step Functions roles trust only `states.amazonaws.com`
- EventBridge roles trust only `events.amazonaws.com`

## Role Capabilities

### Coordinator Agent
- **Purpose**: Central workflow orchestration
- **Permissions**: 
  - Invoke other Lambda functions
  - Start/stop Step Functions executions
  - Send EventBridge events
  - Manage SQS messages
- **Resources**: Project-scoped Lambda, Step Functions, SQS

### Web Search Agent  
- **Purpose**: Discover peer university curricula
- **Permissions**:
  - Access API keys from Secrets Manager
  - Store search results in S3
- **Resources**: Project secrets, document storage

### Browser Agent
- **Purpose**: Automated web scraping (TimeEdit, university sites)
- **Permissions**:
  - Access browser automation credentials
  - Store extracted data in S3
- **Resources**: Project secrets, document storage

### Document Processing Agent
- **Purpose**: Excel/Word/PDF processing and generation
- **Permissions**:
  - Full S3 document operations (read/write/delete)
  - Access LLM API keys for content analysis
- **Resources**: Document storage, processing credentials

### Accreditation Expert Agent
- **Purpose**: Curriculum analysis and gap identification  
- **Permissions**:
  - Read curriculum documents from S3
  - Access LLM API keys for analysis
- **Resources**: Read-only document access, analysis credentials

### QA Agent
- **Purpose**: Terminology standardization and quality control
- **Permissions**:
  - Read/write documents for standardization
  - Access terminology and QA LLM models
- **Resources**: Document modification, QA credentials

### Semantic Search Agent  
- **Purpose**: Vector similarity search with Qdrant
- **Permissions**:
  - Access Qdrant credentials
  - Minimal S3 access for embeddings
- **Resources**: Vector database credentials

### Chat Interface Agent
- **Purpose**: Interactive Q&A about analysis results
- **Permissions**:
  - Access chat LLM API keys
  - Query database connections
- **Resources**: Chat credentials, database access

## Error Handling

### Dead Letter Queue Handler
- Processes failed agent executions
- Retries with exponential backoff
- Sends CloudWatch metrics for monitoring
- Escalates persistent failures

### CloudWatch Integration
- All roles include CloudWatch Logs permissions
- Structured logging for searchability
- Performance metrics collection
- Error tracking and alerting

## Environment Configuration

### Development (`dev`)
- Relaxed resource limits for testing
- Additional debugging permissions
- Non-production resource naming

### Production (`prod`)  
- Strict resource limits and quotas
- Enhanced security monitoring
- Production resource naming and tagging

## Outputs

The CloudFormation stack exports role ARNs for use in other templates:

```yaml
# Example usage in SAM template
CoordinatorFunction:
  Type: AWS::Serverless::Function
  Properties:
    Role: !ImportValue curriculum-alignment-dev-CoordinatorAgentRole
```

## Monitoring and Compliance

### Audit Trail
- All role assumptions logged in CloudTrail
- Resource access tracked in CloudWatch
- Permission usage monitored for optimization

### Compliance
- GDPR-compliant data access patterns
- OWASP security best practices
- AWS Well-Architected security pillar alignment

## Troubleshooting

### Common Issues

1. **Stack Creation Fails**
   - Check IAM permissions for CloudFormation
   - Verify role names don't conflict with existing roles
   - Review template validation errors

2. **Permission Denied Errors**
   - Verify role is attached to Lambda function
   - Check resource ARN patterns match actual resources
   - Review policy JSON syntax

3. **Cross-Account Access Issues**
   - Ensure account ID in resource ARNs is correct
   - Verify trust relationships are properly configured
   - Check for region-specific resource naming

### Debug Commands
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name curriculum-alignment-iam-dev

# View stack events
aws cloudformation describe-stack-events --stack-name curriculum-alignment-iam-dev

# Test role assumption
aws sts assume-role --role-arn <role-arn> --role-session-name test-session
```

## Next Steps

After IAM deployment:
1. Configure PostgreSQL database (Task 3)
2. Setup Qdrant vector database (Task 4)  
3. Initialize AWS SAM project (Task 5)
4. Deploy Lambda functions with appropriate roles
5. Test multi-agent workflow execution

## Security Notes

⚠️ **Important Security Considerations**:
- Never commit actual AWS credentials to version control
- Use AWS Secrets Manager for all API keys and passwords
- Regularly rotate credentials and review permissions
- Monitor CloudTrail logs for unusual activity
- Apply principle of least privilege strictly