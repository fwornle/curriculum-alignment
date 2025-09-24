# API Integration Tests

This directory contains comprehensive integration tests for the Curriculum Alignment System API endpoints. These tests verify the correct behavior of all API endpoints including authentication, request validation, error handling, and data processing.

## Overview

The integration tests cover:

- **Health API** (`health.test.ts`) - System health checks and dependency status
- **Authentication API** (`auth.test.ts`) - Token refresh and validation
- **Programs API** (`programs.test.ts`) - CRUD operations for academic programs
- **Documents API** (`documents.test.ts`) - Document upload and processing
- **Analysis API** (`analysis.test.ts`) - Curriculum analysis workflows

## Test Structure

```
tests/integration/api/
├── health.test.ts          # Health endpoint tests
├── auth.test.ts           # Authentication tests  
├── programs.test.ts       # Programs CRUD tests
├── documents.test.ts      # Document upload tests
├── analysis.test.ts       # Analysis workflow tests
├── jest.config.js         # Jest configuration
├── package.json           # Test dependencies
├── run-tests.sh          # Test runner script
└── README.md             # This file
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Jest test framework
- TypeScript

## Installation

Install test dependencies:

```bash
cd tests/integration/api
npm install
```

## Running Tests

### Using the Test Runner Script

The recommended way to run tests is using the provided shell script:

```bash
# Run all API integration tests
./run-tests.sh

# Run with coverage report
./run-tests.sh --coverage

# Run specific endpoint tests
./run-tests.sh --health      # Health API only
./run-tests.sh --auth        # Authentication API only
./run-tests.sh --programs    # Programs API only
./run-tests.sh --documents   # Documents API only
./run-tests.sh --analysis    # Analysis API only

# Run in watch mode for development
./run-tests.sh --watch

# Run in CI mode (coverage + no watch)
./run-tests.sh --ci

# Run with verbose output
./run-tests.sh --verbose

# Run tests matching a pattern
./run-tests.sh --pattern "should return 200"
```

### Using npm Scripts

Alternative npm commands:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode
npm run test:ci

# Specific endpoint tests
npm run test:health
npm run test:auth
npm run test:programs
npm run test:documents
npm run test:analysis
```

### Using Jest Directly

For more control:

```bash
# Run all tests
npx jest

# Run specific test file
npx jest health.test.ts

# Run with coverage
npx jest --coverage

# Run tests matching pattern
npx jest --testNamePattern "should return healthy status"
```

## Test Configuration

### Environment Variables

Tests use mocked environment variables for consistency:

```bash
NODE_ENV=test
AWS_REGION=us-east-1
LOG_LEVEL=error
MOCK_EXTERNAL_SERVICES=true

# AWS Service Mocks
EVENT_BUS_NAME=test-event-bus
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/test-queue
STATUS_TABLE_NAME=test-agent-status

# Authentication Mocks  
COGNITO_USER_POOL_ID=us-east-1_testpool
COGNITO_CLIENT_ID=test-client-id

# LLM Configuration Mocks
DEFAULT_LLM_MODEL=gpt-4
OPENAI_API_KEY=test-openai-key
ANTHROPIC_API_KEY=test-anthropic-key
```

### Jest Configuration

Key Jest settings in `jest.config.js`:

- **Test Environment**: Node.js
- **Timeout**: 30 seconds per test
- **Coverage Threshold**: 80% for branches, functions, lines, statements
- **Parallel Execution**: Up to 4 workers
- **Mock Management**: Clear/reset/restore mocks between tests

## Test Categories

### Health API Tests

- System health status checks
- Dependency health verification (database, Cognito, S3, Qdrant, agents)
- Error handling for unhealthy dependencies
- Timeout handling
- CORS header validation
- OPTIONS preflight requests

### Authentication API Tests

- Token refresh with valid refresh tokens
- Invalid/expired token handling
- Request validation (malformed JSON, missing fields)
- Cognito service unavailability handling
- Rate limiting
- Bearer token format validation

### Programs API Tests

- **GET /programs**: List with pagination, filtering, authentication
- **POST /programs**: Creation, validation, duplicate handling, permissions
- **GET /programs/{id}**: Retrieval, 404 handling, ETag support, access control
- Field validation and constraint checking
- Error response formatting

### Documents API Tests

- File upload for Excel, Word, and PDF documents
- File type validation and restrictions
- File size limits and validation
- Filename security validation (path traversal prevention)
- Virus scanning simulation
- S3 service error handling
- Presigned URL generation
- Rate limiting for uploads
- Authentication and authorization

### Analysis API Tests

- **POST /analysis/start**: Workflow initiation, validation, cost estimation
- **GET /analysis/{id}**: Status tracking, results retrieval, access control
- **DELETE /analysis/{id}**: Cancellation, refund handling
- Concurrent analysis limits
- Progress tracking for running analyses
- Error handling and recovery
- Multi-agent workflow status

## Mock Data and Utilities

### Test Utilities

The tests use helper functions from `../../setup.ts`:

- `createMockAPIGatewayEvent()` - Creates mock API Gateway events
- `createMockSQSEvent()` - Creates mock SQS events  
- `measureExecutionTime()` - Performance testing helper
- `simulateError()` - Error simulation utilities
- `generateMockCurriculumData()` - Mock curriculum data generation

### AWS Service Mocks

All AWS services are mocked including:

- **Step Functions** - Workflow execution
- **SQS** - Message queuing
- **EventBridge** - Event publishing
- **DynamoDB** - Data storage
- **S3** - File storage
- **CloudWatch** - Metrics and logging
- **SNS** - Notifications
- **Lambda** - Function invocation

## Coverage Reports

Tests generate comprehensive coverage reports:

- **Text Summary** - Console output during test run
- **LCOV Report** - Machine-readable format
- **HTML Report** - Interactive web report at `coverage/lcov-report/index.html`
- **JSON Report** - Raw coverage data

### Coverage Thresholds

Minimum required coverage:

- **Branches**: 80%
- **Functions**: 80%  
- **Lines**: 80%
- **Statements**: 80%

## Error Handling Testing

Tests verify proper error responses:

- **4xx Client Errors**: Validation, authentication, authorization
- **5xx Server Errors**: Service unavailability, internal errors
- **Custom Errors**: Domain-specific error codes and messages
- **Error Response Format**: Consistent JSON error structure

## Performance Considerations

- Tests run with a 30-second timeout per test
- Parallel execution with up to 4 workers
- Mock external services to avoid network latency
- Memory-efficient test data generation
- Proper cleanup after each test

## Security Testing

Security aspects covered:

- **Authentication**: Token validation and expiration
- **Authorization**: Role-based access control  
- **Input Validation**: SQL injection, XSS prevention
- **File Upload Security**: Virus scanning, filename validation
- **Rate Limiting**: Request throttling verification
- **CORS**: Cross-origin request handling

## CI/CD Integration

Tests are designed for continuous integration:

- Deterministic test execution with fixed timestamps
- No external dependencies or network calls
- Comprehensive coverage reporting
- JUnit XML output for CI systems
- Exit codes for build pipeline integration

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase timeout in Jest configuration
- Check for infinite loops in mocked functions
- Verify async/await usage

**Coverage not meeting thresholds:**  
- Review uncovered code paths
- Add tests for error conditions
- Check for unused utility functions

**Mock-related errors:**
- Ensure mocks are cleared between tests
- Verify mock implementations match real services
- Check for async mock timing issues

### Debug Mode

Enable verbose logging for debugging:

```bash
./run-tests.sh --verbose
```

Or set environment variables:

```bash
LOG_LEVEL=debug
JEST_VERBOSE=true
npm test
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Use provided test utilities and mocks
3. Include both success and error scenarios
4. Add proper JSDoc comments
5. Maintain code coverage above thresholds
6. Update this README with new test categories

### Test Naming Convention

```typescript
describe('API Endpoint Name', () => {
  describe('HTTP_METHOD /path', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Test implementation
    });
  });
});
```

## Related Documentation

- [OpenAPI Specification](../../../openapi.yaml)
- [Lambda Functions](../../../lambda/)
- [Database Schema](../../../database/)
- [Agent Testing](../../agents/)
- [End-to-End Tests](../../e2e/)