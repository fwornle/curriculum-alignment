# AWS SAM Project - Curriculum Alignment System

This document describes the AWS SAM (Serverless Application Model) project structure and deployment process for the Multi-Agent Curriculum Alignment System.

## Project Structure

```
curriculum-alignment/
├── template.yaml              # Main SAM template
├── samconfig.toml             # SAM configuration
├── statemachine/              # Step Functions definitions
│   └── curriculum-analysis.asl.json
├── lambda/                    # Lambda function code
│   ├── coordinator/
│   ├── web-search/
│   ├── browser/
│   ├── document-processing/
│   ├── accreditation-expert/
│   ├── qa-agent/
│   ├── semantic-search/
│   ├── chat-interface/
│   ├── dlq-handler/
│   └── websocket-handler/
└── infrastructure/            # Additional CloudFormation templates
    ├── database-config.yaml
    └── qdrant-config.yaml
```

## Prerequisites

### 1. Install AWS SAM CLI
```bash
# macOS
brew install aws-sam-cli

# Windows (using Chocolatey)
choco install aws-sam-cli

# Linux
curl -L https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip -o aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and Region
```

### 3. Install Dependencies
```bash
npm install
```

## Quick Start

### 1. Deploy Infrastructure Dependencies
First deploy the database and vector database configurations:

```bash
# Deploy PostgreSQL configuration
aws cloudformation deploy \
  --template-file infrastructure/database-config.yaml \
  --stack-name curriculum-alignment-database-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM

# Deploy Qdrant configuration
aws cloudformation deploy \
  --template-file infrastructure/qdrant-config.yaml \
  --stack-name curriculum-alignment-qdrant-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

### 2. Build and Deploy SAM Application
```bash
# Build the application
sam build

# Deploy to development environment
sam deploy --config-env dev

# Or deploy with guided prompts
sam deploy --guided
```

### 3. Test Local Development
```bash
# Start API locally
sam local start-api --config-env dev

# Test specific function
sam local invoke CoordinatorFunction --event events/coordinator-test.json
```

## Environments

The project supports three deployment environments:

### Development (dev)
- **Purpose**: Local development and testing
- **Features**: Debug logging, unrestricted CORS, all features enabled
- **Deploy**: `sam deploy --config-env dev`

### Staging (staging)
- **Purpose**: Pre-production testing
- **Features**: Info logging, restricted CORS, production-like configuration
- **Deploy**: `sam deploy --config-env staging`

### Production (prod)
- **Purpose**: Live production environment
- **Features**: Warn logging, strict CORS, optimized performance
- **Deploy**: `sam deploy --config-env prod`

## Architecture Overview

### Lambda Functions

#### Core Agent Functions
1. **Coordinator** (`/coordinator/*`)
   - Central orchestration and workflow management
   - Manages Step Functions execution
   - Handles inter-agent communication

2. **Web Search** (`/web-search/*`)
   - Discovers peer university curricula
   - Manages search API integrations
   - Rate limiting and result filtering

3. **Browser Agent** (`/browser/*`)
   - Web scraping with Stagehand/MCP
   - Handles dynamic content and JavaScript rendering
   - Respects robots.txt and implements delays

4. **Document Processing** (`/document-processing/*`)
   - Processes Excel, Word, and PDF documents
   - Extracts structured data from curriculum files
   - Triggered by S3 uploads

5. **Accreditation Expert** (`/accreditation-expert/*`)
   - Curriculum analysis and gap identification
   - LLM-powered analysis with configurable models
   - Generates recommendations and insights

6. **QA Agent** (`/qa-agent/*`)
   - Terminology standardization
   - Quality control and validation
   - Ensures data consistency

7. **Semantic Search** (`/semantic-search/*`)
   - Vector similarity searches using Qdrant
   - Embedding generation and management
   - Fast approximate search with HNSW

8. **Chat Interface** (`/chat/*`)
   - Natural language Q&A interface
   - WebSocket integration for real-time responses
   - Context-aware conversations

#### Support Functions
9. **WebSocket Handler**
   - Manages WebSocket connections
   - Real-time status updates and chat
   - Connection lifecycle management

10. **DLQ Handler**
    - Processes failed messages from dead letter queue
    - Implements retry logic and error escalation
    - Sends alerts via SNS

### API Gateway

- **REST API**: Main application endpoints
- **WebSocket API**: Real-time communication
- **Authentication**: AWS Cognito integration
- **CORS**: Configurable cross-origin support
- **Throttling**: Rate limiting and burst controls

### Step Functions

**Curriculum Analysis Workflow**:
1. Initialize analysis request
2. Route based on input type (URL, document, text)
3. Parallel processing with semantic search and accreditation analysis
4. Quality assurance validation
5. Result combination and report generation
6. Storage and notification

### Storage Services

#### S3 Buckets
- **Documents Bucket**: Stores uploaded curriculum files
- **Static Website Bucket**: Hosts React frontend
- **Features**: Encryption, versioning, lifecycle policies

#### DynamoDB Tables
- **Connection Table**: WebSocket connection management
- **Features**: TTL for automatic cleanup

#### Message Queues
- **Message Queue**: Inter-service communication
- **Dead Letter Queue**: Failed message handling
- **Features**: Retry policies, visibility timeouts

### Security & Monitoring

#### Authentication
- **AWS Cognito**: User pool with MFA support
- **JWT Tokens**: Secure API access
- **IAM Roles**: Least privilege access

#### Monitoring
- **CloudWatch Logs**: Centralized logging
- **X-Ray Tracing**: Distributed tracing
- **CloudWatch Metrics**: Performance monitoring
- **SNS Alerts**: Failure notifications

## Configuration

### Environment Variables

#### Global Variables (All Functions)
- `NODE_ENV`: Deployment environment
- `LOG_LEVEL`: Logging verbosity
- `REGION`: AWS region
- `ACCOUNT_ID`: AWS account ID

#### Database Access
- `DATABASE_SECRET_ARN`: PostgreSQL credentials
- `QDRANT_SECRET_ARN`: Vector database credentials

#### Function-Specific Variables
- `S3_DOCUMENTS_BUCKET`: Document storage bucket
- `CONNECTION_TABLE`: WebSocket connections table
- `WEBSOCKET_API_ENDPOINT`: Real-time communication endpoint

### Parameters

Configurable via `samconfig.toml`:
- `Environment`: Deployment environment (dev/staging/prod)
- `LogLevel`: Logging level (debug/info/warn/error)
- `CorsOrigin`: CORS origin policy

## Deployment Commands

### Build and Deploy
```bash
# Build all functions
sam build

# Deploy to specific environment
sam deploy --config-env dev
sam deploy --config-env staging
sam deploy --config-env prod

# Deploy with parameter overrides
sam deploy --parameter-overrides \
  Environment=dev \
  LogLevel=debug \
  CorsOrigin="*"
```

### Local Development
```bash
# Start API Gateway locally
sam local start-api --config-env dev

# Start Lambda functions locally
sam local start-lambda

# Invoke specific function
sam local invoke CoordinatorFunction \
  --event events/coordinator-test.json \
  --config-env dev

# Generate sample events
sam local generate-event apigateway aws-proxy > test-event.json
```

### Testing
```bash
# Validate template
sam validate

# Run unit tests
npm test

# Test deployment (dry run)
sam deploy --config-env dev --no-execute-changeset
```

### Monitoring and Logs
```bash
# Tail function logs
sam logs -n CoordinatorFunction --stack-name curriculum-alignment-dev --tail

# View specific time range
sam logs -n CoordinatorFunction \
  --stack-name curriculum-alignment-dev \
  --start-time '2024-01-01T00:00:00' \
  --end-time '2024-01-02T00:00:00'
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear build cache
sam build --use-container --cached=false

# Build with verbose output
sam build --debug
```

#### 2. Deployment Errors
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name curriculum-alignment-dev

# Validate template syntax
sam validate --lint

# Check IAM permissions
aws sts get-caller-identity
```

#### 3. Function Errors
```bash
# Check function logs
sam logs -n FunctionName --stack-name curriculum-alignment-dev

# Test function locally
sam local invoke FunctionName --event test-event.json

# Debug with environment variables
sam local start-api --env-vars env.json
```

#### 4. API Gateway Issues
```bash
# Test API endpoint
curl -X GET https://your-api-id.execute-api.region.amazonaws.com/dev/health

# Check API Gateway logs
aws logs filter-log-events \
  --log-group-name /aws/apigateway/curriculum-alignment-dev
```

### Debug Configuration

Create `env.json` for local debugging:
```json
{
  "CoordinatorFunction": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug",
    "DATABASE_SECRET_ARN": "arn:aws:secretsmanager:...",
    "QDRANT_SECRET_ARN": "arn:aws:secretsmanager:..."
  }
}
```

## Performance Optimization

### Cold Start Reduction
- **Provisioned Concurrency**: Enable for critical functions
- **Function Size**: Optimize memory allocation
- **Layer Usage**: Share common dependencies

### Cost Optimization
- **Memory Tuning**: Right-size function memory
- **Timeout Settings**: Optimize timeout values
- **Reserved Concurrency**: Limit concurrent executions

### Monitoring Setup
```bash
# Enable X-Ray tracing
sam deploy --config-env prod --parameter-overrides \
  EnableTracing=true

# Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "HighErrorRate" \
  --alarm-description "Lambda function error rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Security Best Practices

### IAM Policies
- Use least privilege access
- Regularly audit permissions
- Implement resource-based policies

### Secrets Management
- Store sensitive data in AWS Secrets Manager
- Rotate credentials regularly
- Use IAM roles for service-to-service communication

### Network Security
- Enable VPC for Lambda functions if needed
- Use security groups and NACLs
- Implement API Gateway throttling

## Next Steps

After SAM deployment:
1. ✅ Task 5: Initialize AWS SAM Project (this task)
2. ⏳ Task 6: Setup S3 Buckets
3. ⏳ Task 7: Configure CloudFront CDN
4. ⏳ Task 8: Setup AWS Cognito User Pool
5. ⏳ Task 9: Configure API Gateway

The SAM template provides the foundation for all serverless infrastructure, ready for multi-agent curriculum alignment system deployment.

## Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)