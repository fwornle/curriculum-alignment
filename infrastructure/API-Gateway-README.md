# API Gateway Configuration

This document describes the API Gateway setup for the Curriculum Alignment System REST API.

## Overview

The API Gateway provides a secure, scalable REST API with:
- Cognito User Pool authentication and authorization
- Request validation and response modeling
- Rate limiting and throttling
- CORS support for frontend integration
- Lambda proxy integration for all endpoints
- Comprehensive monitoring and logging

## Architecture

### API Structure
- **Base Path**: `/api/v1`
- **Authentication**: AWS Cognito User Pools with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Integration**: Lambda proxy integration with all backend functions
- **Documentation**: OpenAPI 3.0 specification

### Security Features
- JWT token validation through Cognito authorizer
- Request/response validation with JSON Schema
- Rate limiting and burst protection
- CORS configuration for web clients
- CloudWatch logging and monitoring

## Files

### Infrastructure
- `infrastructure/api-gateway.yaml`: CloudFormation template
- `openapi.yaml`: OpenAPI 3.0 specification
- `scripts/setup-api-gateway.sh`: Deployment and management script

### API Components
1. **REST API**: Main API Gateway resource
2. **Authorizer**: Cognito User Pool authorizer
3. **Resources**: Hierarchical API endpoints
4. **Methods**: HTTP methods with validation and integration
5. **Models**: JSON Schema models for request/response validation
6. **Stage**: Environment-specific API deployment

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Cognito User Pool deployed (run `npm run cognito:setup` first)
- Lambda functions available for integration

### Commands

```bash
# Deploy API Gateway
npm run api:setup

# Test API endpoints
npm run api:test

# View API information
npm run api:info

# Generate API documentation
npm run api:docs

# Setup Lambda permissions
npm run api:permissions

# Setup monitoring
npm run api:monitor
```

### Environment Variables (Optional)
```bash
# For custom domain
export API_GATEWAY_DOMAIN_NAME="api.curriculum-alignment.ceu.edu"
export API_GATEWAY_CERTIFICATE_ARN="arn:aws:acm:region:account:certificate/example"

# Environment-specific settings
export NODE_ENV="dev|staging|prod"
export AWS_REGION="eu-central-1"
```

## API Endpoints

### Health and System
- `GET /health` - Health check (no authentication required)

### Authentication
- `POST /auth/refresh` - Refresh JWT tokens

### Programs Management
- `GET /programs` - List academic programs
- `POST /programs` - Create new program
- `GET /programs/{id}` - Get program by ID
- `PUT /programs/{id}` - Update program

### Document Processing
- `POST /documents/upload` - Upload curriculum documents
- `GET /documents/{id}` - Get document metadata

### Analysis Workflows
- `POST /analysis/start` - Start curriculum analysis
- `GET /analysis/{id}/status` - Get analysis status
- `GET /analysis/{id}/results` - Get analysis results

### Chat Interface
- `POST /chat/message` - Send message to chat agent

### Report Generation
- `POST /reports/generate` - Generate analysis reports
- `GET /reports/{id}/download` - Download generated reports

## Authentication and Authorization

### JWT Token Authentication
```http
Authorization: Bearer <jwt-id-token>
```

### User Groups and Permissions
- **Administrators**: Full access to all endpoints
- **Faculty**: Access to programs, analysis, and reports
- **Students**: Read-only access to programs and reports

### Token Validation
The API Gateway validates JWT tokens using Cognito User Pool authorizer:
1. Extract token from Authorization header
2. Validate token signature and claims
3. Check token expiration
4. Extract user information and groups
5. Allow/deny request based on endpoint requirements

## Request/Response Validation

### JSON Schema Models
- **AnalysisRequest**: Curriculum analysis parameters
- **ProgramRequest**: Academic program data
- **ChatMessageRequest**: Chat interface messages
- **ReportRequest**: Report generation parameters

### Validation Rules
- Required fields validation
- Data type validation
- Pattern matching (e.g., IDs, emails)
- Range validation (e.g., numbers, string length)
- Enum validation for predefined values

### Error Responses
```json
{
  "error": "BadRequest",
  "message": "Invalid request parameters",
  "details": {
    "field": "programId",
    "issue": "required field missing"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/programs"
}
```

## Rate Limiting and Throttling

### Environment-Specific Limits
- **Development**: 100 requests/second, 200 burst
- **Staging**: 500 requests/second, 1000 burst
- **Production**: 1000 requests/second, 2000 burst

### Usage Plans
- Monthly request quotas
- Per-user rate limiting
- API key management for external integrations

### Throttling Behavior
- HTTP 429 (Too Many Requests) when limits exceeded
- Retry-After header with recommended retry time
- Exponential backoff recommended for clients

## CORS Configuration

### Allowed Origins
- Development: `http://localhost:3000`
- Staging: `https://staging.curriculum-alignment.ceu.edu`
- Production: `https://app.curriculum-alignment.ceu.edu`

### Allowed Headers
- `Content-Type`
- `Authorization`
- `X-Amz-Date`
- `X-Api-Key`
- `X-Amz-Security-Token`

### Allowed Methods
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

## Lambda Integration

### Proxy Integration
All endpoints use Lambda proxy integration:
- Request forwarded to Lambda with full context
- Lambda returns structured response
- API Gateway handles HTTP status codes and headers

### Function Mapping
- `/auth/*` → `auth-service` function
- `/programs/*` → `coordinator` function
- `/documents/*` → `document-processing` function
- `/analysis/*` → `coordinator` function
- `/chat/*` → `chat-interface` function
- `/reports/*` → `coordinator` function

### Error Handling
- Lambda function errors mapped to HTTP status codes
- Structured error responses with details
- CloudWatch logging for debugging

## Monitoring and Alerting

### CloudWatch Metrics
- Request count and latency
- Error rates (4xx, 5xx)
- Integration latency
- Cache hit/miss rates

### Alarms
- **4xx Errors**: >10 errors in 5 minutes
- **5xx Errors**: >5 errors in 5 minutes
- **High Latency**: >5 seconds average for 15 minutes

### Access Logging
```json
{
  "requestId": "request-id",
  "ip": "client-ip",
  "requestTime": "timestamp",
  "httpMethod": "GET",
  "resourcePath": "/api/v1/programs",
  "status": "200",
  "responseTime": "123ms"
}
```

## Custom Domain Setup (Optional)

### SSL Certificate
1. Request certificate in the same region as API Gateway
2. Validate domain ownership
3. Set certificate ARN in environment variables

### DNS Configuration
```
CNAME: api.curriculum-alignment.ceu.edu → api-id.execute-api.region.amazonaws.com
```

### Deployment with Custom Domain
```bash
export API_GATEWAY_DOMAIN_NAME="api.curriculum-alignment.ceu.edu"
export API_GATEWAY_CERTIFICATE_ARN="arn:aws:acm:region:account:certificate/example"
npm run api:setup
```

## Testing

### Automated Testing
```bash
# Test all endpoints
./test-api.sh

# Test with authentication
./test-api.sh <jwt-token>
```

### Manual Testing
```bash
# Health check
curl https://api.example.com/health

# Authenticated request
curl -H "Authorization: Bearer <token>" https://api.example.com/api/v1/programs

# CORS preflight
curl -X OPTIONS -H "Origin: https://app.example.com" https://api.example.com/api/v1/programs
```

## OpenAPI Documentation

### Specification
- **Format**: OpenAPI 3.0.3
- **File**: `openapi.yaml`
- **Documentation**: Generated HTML docs in `docs/api/`

### Key Features
- Complete API documentation
- Request/response examples
- Authentication requirements
- Error code definitions
- Data model schemas

### Usage
- **Swagger UI**: View interactive documentation
- **Code Generation**: Generate client SDKs
- **Validation**: Validate API responses
- **Testing**: Use for API testing tools

## Integration with Frontend

### React/TypeScript Integration
```typescript
const API_BASE_URL = process.env.REACT_APP_API_ENDPOINT;
const token = getTokenFromStorage();

const response = await fetch(`${API_BASE_URL}/api/v1/programs`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Error Handling
```typescript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}
```

### Token Management
- Automatic token refresh on 401 responses
- Token storage in secure HTTP-only cookies
- Logout on token expiration

## Performance Optimization

### Caching
- Response caching for GET endpoints
- Cache TTL based on data volatility
- Cache invalidation on data updates

### Compression
- Gzip compression enabled
- Binary media type handling
- Optimal payload sizes

### Connection Management
- Keep-alive connections
- Connection pooling
- Timeout configuration

## Security Best Practices

### Input Validation
- All inputs validated against JSON schemas
- SQL injection prevention
- XSS protection through encoding

### Authentication Security
- JWT token validation
- Token expiration enforcement
- Secure token transmission (HTTPS only)

### Authorization Controls
- Role-based access control
- Resource-level permissions
- Audit logging for sensitive operations

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check JWT token validity
   - Verify user permissions
   - Check Cognito authorizer configuration

2. **404 Not Found**
   - Verify endpoint paths
   - Check API deployment
   - Confirm resource exists

3. **429 Too Many Requests**
   - Implement exponential backoff
   - Check rate limit configuration
   - Consider request optimization

### Debugging Commands
```bash
# Check API Gateway status
aws apigateway get-rest-api --rest-api-id <api-id>

# View CloudWatch logs
aws logs filter-log-events --log-group-name /aws/apigateway/<stack-name>

# Test specific endpoint
curl -v https://api.example.com/api/v1/health
```

## Cost Optimization

### Request Optimization
- Batch operations where possible
- Implement client-side caching
- Use appropriate HTTP methods

### Monitoring Usage
- Track request patterns
- Identify cost drivers
- Optimize expensive operations

### Pricing Considerations
- **Free Tier**: 1 million requests/month
- **Requests**: $3.50 per million requests
- **Data Transfer**: $0.09 per GB

## Backup and Recovery

### Configuration Backup
- CloudFormation templates in version control
- Stack export for disaster recovery
- Environment configuration documentation

### Rollback Procedures
- CloudFormation stack rollback
- API Gateway deployment rollback
- Blue-green deployment support

## Next Steps

1. **Task 10**: Setup Environment Configuration
2. **Lambda Functions**: Deploy and integrate Lambda functions
3. **Frontend Integration**: Connect React application
4. **Testing**: Comprehensive API testing
5. **Performance Testing**: Load testing and optimization

## References

- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JWT Token Validation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html)
- [CORS Configuration](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)