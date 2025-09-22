# Environment Configuration

This document describes the environment configuration setup for the Curriculum Alignment System.

## Overview

The system uses environment-specific configuration files to manage different deployment environments (development, staging, production) with proper security and optimization settings.

## Architecture

### Configuration Files
- **`.env.example`**: Template with all available configuration options
- **`.env.development`**: Development environment settings
- **`.env.production`**: Production environment settings  
- **`src/config/environment.ts`**: TypeScript configuration manager with validation

### Environment Management
- Type-safe configuration with validation
- Environment-specific defaults
- Required variable validation
- Secure secrets management (AWS Secrets Manager in production)
- Feature flags for different environments

## Files

### Configuration Templates
- `.env.example`: Complete configuration template with documentation
- `.env.development`: Development-optimized settings
- `.env.production`: Production-optimized settings with security focus

### TypeScript Configuration
- `src/config/environment.ts`: Environment configuration manager
  - Type-safe configuration interface
  - Environment variable parsing and validation
  - Default value management
  - Required variable enforcement

### Scripts
```bash
# Validate environment configuration
npm run env:validate

# Check required environment variables
npm run env:check

# Display current environment configuration
npm run env:info
```

## Environment Variables

### Application Settings
```bash
NODE_ENV=development|staging|production
PORT=3000
DEBUG=true|false
LOG_LEVEL=debug|info|warn|error
```

### Database Configuration
```bash
# PostgreSQL/Supabase
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=600000
```

### AWS Configuration
```bash
# Core AWS
AWS_REGION=eu-central-1
AWS_ACCOUNT_ID=930500114053

# S3 Buckets
S3_BUCKET_DOCUMENTS=curriculum-alignment-documents-env
S3_BUCKET_STATIC=curriculum-alignment-static-env
S3_BUCKET_BACKUP=curriculum-alignment-backup-env
S3_BUCKET_TEMP=curriculum-alignment-temp-env
S3_BUCKET_LOGS=curriculum-alignment-logs-env

# Lambda
LAMBDA_TIMEOUT=300
LAMBDA_MEMORY=1024

# Cognito
COGNITO_USER_POOL_ID=eu-central-1_xxxxxxxxx
COGNITO_USER_POOL_CLIENT_ID=your-client-id
COGNITO_IDENTITY_POOL_ID=eu-central-1:your-identity-pool-id

# CloudFront
CLOUDFRONT_DOMAIN=cdn.curriculum-alignment.ceu.edu
CLOUDFRONT_DISTRIBUTION_ID=ABCDEFGHIJK123
```

### Vector Database (Qdrant)
```bash
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION_NAME=curriculum_embeddings
```

### LLM Configuration
```bash
LLM_PROVIDER=openai|anthropic|grok|google|azure
LLM_MODEL=gpt-4o
LLM_MAX_TOKENS=4000
LLM_TEMPERATURE=0.3
```

### API Configuration
```bash
API_BASE_URL=https://api.curriculum-alignment.ceu.edu
WEBSOCKET_URL=wss://ws.curriculum-alignment.ceu.edu
FRONTEND_URL=https://app.curriculum-alignment.ceu.edu
```

### Security Settings
```bash
# Stored in AWS Secrets Manager in production
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret
```

### Feature Flags
```bash
ENABLE_CORS=true
RATE_LIMIT_ENABLED=false
ENABLE_REQUEST_LOGGING=true
ENABLE_SQL_LOGGING=true
ENABLE_MOCK_DATA=true
ENABLE_SWAGGER_UI=true
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_DEBUG_ENDPOINTS=true
```

### Cost Tracking
```bash
MAX_MONTHLY_COST_USD=500
COST_ALERT_THRESHOLD=0.8
COST_TRACKING_ENABLED=true
```

### Monitoring
```bash
CLOUDWATCH_LOG_GROUP=/aws/lambda/curriculum-alignment
CLOUDWATCH_LOG_RETENTION_DAYS=14
ENABLE_METRICS=true
METRICS_NAMESPACE=CurriculumAlignment
ENABLE_XRAY_TRACING=true
XRAY_SAMPLING_RATE=0.1
```

### WebSocket Configuration
```bash
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000
WS_MAX_CONNECTIONS=100
```

### File Processing
```bash
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,docx,xlsx,doc,xls
UPLOAD_TIMEOUT_MS=300000
```

### Cache Configuration
```bash
CACHE_TTL_SECONDS=3600
CACHE_MAX_SIZE_MB=100
ENABLE_CACHE=true
CACHE_PREFIX=curriculum_
```

### Agent Configuration
```bash
AGENT_COORDINATOR_TIMEOUT=120000
AGENT_MAX_RETRIES=3
AGENT_RETRY_DELAY=5000
ENABLE_AGENT_LOGGING=true
```

### Curriculum Analysis
```bash
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
SIMILARITY_THRESHOLD=0.75
MAX_CURRICULUM_PAGES=100
```

## Environment-Specific Settings

### Development Environment
- Debug mode enabled
- Verbose logging (debug level)
- Mock data enabled
- CORS enabled
- Rate limiting disabled
- Development tools enabled (Swagger, GraphQL playground)
- Local Qdrant instance
- Conservative resource limits
- Shorter cache TTL

### Production Environment  
- Debug mode disabled
- Error-only logging
- Mock data disabled
- Rate limiting enabled
- Development tools disabled
- Cloud Qdrant instance
- Optimized resource limits
- Longer cache TTL
- Enhanced security features
- Audit logging enabled
- Backup enabled
- Performance optimizations

## Security Best Practices

### Secrets Management
- **Development**: Local `.env` files (git-ignored)
- **Production**: AWS Secrets Manager
- **Never commit secrets** to version control

### Environment File Security
```bash
# Good: Use references to Secrets Manager
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}

# Bad: Hardcode secrets
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=actual-secret-here
```

### Key Rotation
- Regular rotation of encryption keys
- JWT secret rotation
- Database password rotation
- API key rotation

## Setup Instructions

### 1. Copy Environment Template
```bash
cp .env.example .env.development
cp .env.example .env.production
```

### 2. Configure Development Environment
Edit `.env.development`:
- Set local database URLs
- Configure local Qdrant instance
- Enable development features
- Set development-appropriate limits

### 3. Configure Production Environment
Edit `.env.production`:
- Use AWS Secrets Manager references
- Configure production services
- Enable security features
- Set production limits

### 4. Validate Configuration
```bash
# Check environment configuration
npm run env:validate

# Verify required variables
npm run env:check

# Display current config (for debugging)
npm run env:info
```

### 5. Deploy Secrets to AWS
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "curriculum-alignment/database" \
  --description "Database credentials" \
  --secret-string '{"url":"postgresql://...","password":"..."}'

aws secretsmanager create-secret \
  --name "curriculum-alignment/jwt" \
  --description "JWT signing key" \
  --secret-string '{"secret":"your-jwt-secret"}'
```

## Configuration Validation

### TypeScript Validation
The configuration manager provides:
- **Type Safety**: All configuration values are typed
- **Required Variables**: Validation of required environment variables
- **Default Values**: Sensible defaults for optional variables
- **Parsing**: Automatic parsing of numbers, booleans, arrays
- **Environment Detection**: Helper functions for environment checks

### Runtime Validation
```typescript
import { validateEnvironment, env } from './src/config/environment';

// Validate configuration on startup
validateEnvironment();

// Access typed configuration
console.log(env.database.url);
console.log(env.aws.s3.documents);
console.log(env.features.cors);
```

### Error Handling
- Missing required variables throw errors on startup
- Invalid values are replaced with defaults where possible
- Comprehensive error messages for debugging

## Environment Migration

### Adding New Variables
1. Add to `.env.example` with documentation
2. Add to TypeScript interface in `environment.ts`
3. Add parsing logic with default values
4. Update environment-specific files
5. Document in this README

### Removing Variables
1. Remove from environment files
2. Remove from TypeScript interface
3. Remove parsing logic
4. Update documentation

## Monitoring Configuration

### CloudWatch Integration
- Log groups per environment
- Retention policies
- Metrics namespacing
- X-Ray tracing configuration

### Cost Tracking
- Monthly budget limits
- Alert thresholds
- Cost attribution by environment

### Health Checks
- Database connectivity
- External service availability
- Configuration validation

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```bash
   Error: Required environment variable DATABASE_URL is not set
   ```
   - Check `.env` file exists and is readable
   - Verify variable name spelling
   - Ensure value is not empty

2. **Invalid Configuration Values**
   ```bash
   Error: ENCRYPTION_KEY must be at least 32 characters long
   ```
   - Check configuration requirements
   - Generate proper values for secrets
   - Validate format requirements

3. **Environment File Not Loaded**
   ```bash
   npm run env:validate
   ```
   - Check file paths
   - Verify NODE_ENV setting
   - Ensure proper file naming

### Debugging Commands
```bash
# Check which environment file is loaded
echo $NODE_ENV

# Validate configuration
npm run env:validate

# Display current environment (remove secrets first!)
npm run env:info | grep -v -E "(SECRET|KEY|PASSWORD)"

# Test database connection
npm run db:health

# Test AWS connectivity
aws sts get-caller-identity
```

## Next Steps

1. **Task 11**: Implement PostgreSQL Schema
2. **Task 12**: Create Database Access Layer
3. **AWS Secrets Integration**: Deploy secrets to AWS Secrets Manager
4. **Environment Testing**: Comprehensive testing of all environments
5. **Documentation**: Update API documentation with environment requirements

## References

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)