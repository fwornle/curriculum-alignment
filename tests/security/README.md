# Security Testing Suite

Comprehensive security vulnerability testing for the Curriculum Alignment System using Jest and specialized security testing patterns.

## Overview

This security testing suite provides thorough coverage of common web application vulnerabilities and security concerns specific to multi-agent AI systems. The tests are designed to identify vulnerabilities before they reach production and ensure compliance with security best practices.

## Security Coverage Areas

### 🔐 Authentication Security
- **JWT Token Validation**: Proper token expiration, signature validation, and format checking
- **Password Security**: Strong password requirements, secure storage, and reset procedures
- **Session Management**: Secure session creation, invalidation, and cookie security
- **Multi-Factor Authentication**: MFA validation and bypass prevention
- **Brute Force Protection**: Rate limiting and account lockout mechanisms

### 🛡️ Authorization Security
- **Role-Based Access Control (RBAC)**: Proper role separation and permission enforcement
- **Resource-Level Authorization**: User-specific resource access validation
- **Privilege Escalation Prevention**: Protection against unauthorized permission increases
- **API Key Authorization**: Proper API key validation and rate limiting
- **Cross-Origin Resource Sharing (CORS)**: Secure CORS policy implementation

### 💉 Injection Vulnerabilities
- **SQL Injection**: Parameterized query validation and input sanitization
- **NoSQL Injection**: MongoDB and other NoSQL database protection
- **Command Injection**: Operating system command execution prevention
- **LDAP Injection**: Directory service query protection
- **XML/XXE Injection**: XML External Entity attack prevention
- **JNDI Injection**: Java Naming and Directory Interface security
- **Template Injection**: Server-side template injection protection

### ✅ Input Validation Security
- **Cross-Site Scripting (XSS)**: Stored, reflected, and DOM-based XSS prevention
- **Cross-Site Request Forgery (CSRF)**: CSRF token validation and protection
- **File Upload Security**: File type, size, and content validation
- **Input Sanitization**: Length limits, format validation, and encoding handling
- **Business Logic Validation**: Domain-specific rule enforcement

### 🌐 API Security
- **HTTP Method Security**: Appropriate method enforcement and verb tampering prevention
- **Rate Limiting**: Per-endpoint and per-user request throttling
- **Content Type Validation**: Proper content type handling and confusion prevention
- **Response Security**: Security headers and information leakage prevention
- **API Discovery Protection**: Documentation and debug endpoint security

## Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Jest** testing framework
- **axios** for HTTP requests

### Installation
```bash
# Install dependencies
npm install

# Install security testing dependencies
npm install --save-dev jest axios @types/jest @types/node
```

## Quick Start

### Run All Security Tests
```bash
./run-security-tests.sh all
```

### Run Specific Test Suites
```bash
# Authentication tests
./run-security-tests.sh authentication

# Authorization tests  
./run-security-tests.sh authorization

# Injection vulnerability tests
./run-security-tests.sh injection

# Input validation tests
./run-security-tests.sh input-validation

# API security tests
./run-security-tests.sh api-security
```

### Custom Configuration
```bash
# Test against different environment
./run-security-tests.sh all --base-url https://staging.example.com --environment staging

# Higher coverage requirements
./run-security-tests.sh all --coverage 90

# Clean previous results
./run-security-tests.sh all --clean
```

## Test Configuration

### Environment Variables
```bash
# Target system configuration
export BASE_URL="http://localhost:3000"
export ENVIRONMENT="test"

# Test execution settings
export COVERAGE_THRESHOLD="70"
export PARALLEL_TESTS="false"
export MAX_WORKERS="4"

# Safety settings (automatically set)
export NODE_ENV="test"
export DISABLE_REAL_AUTH="true"
export MOCK_EXTERNAL_APIS="true"
```

### Test Environment File
Create `.env.test` in the project root:
```bash
# Test environment configuration
TEST_BASE_URL=http://localhost:3000
NODE_ENV=test

# Mock credentials (never use real credentials in tests)
TEST_VALID_TOKEN=test-valid-token-12345
TEST_INVALID_TOKEN=test-invalid-token-12345
TEST_EXPIRED_TOKEN=test-expired-token-12345
TEST_API_KEY=test-api-key-12345

# Test user accounts
TEST_USER_EMAIL=security-test@example.com
TEST_USER_PASSWORD=SecureTestPassword123!
TEST_ADMIN_EMAIL=admin-test@example.com
TEST_ADMIN_PASSWORD=AdminTestPassword123!
```

## Test Suites

### Authentication Security (`authentication.security.test.ts`)
Tests authentication mechanisms and session management:

```javascript
describe('Authentication Security Tests', () => {
  // JWT token validation
  it('should reject expired JWT tokens', async () => {
    // Test implementation
  });
  
  // Brute force protection
  it('should implement rate limiting for login attempts', async () => {
    // Test implementation
  });
  
  // Session security
  it('should invalidate sessions on logout', async () => {
    // Test implementation
  });
});
```

**Key Test Cases:**
- Expired token rejection
- Malformed token handling  
- Authentication bypass prevention
- SQL injection in auth
- Rate limiting effectiveness
- Session invalidation
- Cookie security
- Password strength validation

### Authorization Security (`authorization.security.test.ts`)
Tests access control and permission systems:

```javascript
describe('Authorization Security Tests', () => {
  // Role-based access control
  it('should prevent privilege escalation attempts', async () => {
    // Test implementation
  });
  
  // Resource-level authorization
  it('should prevent access to resources belonging to other users', async () => {
    // Test implementation  
  });
});
```

**Key Test Cases:**
- Privilege escalation prevention
- Role separation enforcement
- Resource ownership validation
- API key authorization
- CORS policy validation
- Parameter pollution prevention

### Injection Vulnerabilities (`injection.security.test.ts`)
Tests various injection attack protections:

```javascript
describe('Injection Vulnerability Tests', () => {
  // SQL injection protection
  it('should prevent SQL injection in search queries', async () => {
    // Test with malicious SQL payloads
  });
  
  // Command injection prevention
  it('should prevent OS command injection', async () => {
    // Test with command injection payloads
  });
});
```

**Key Test Cases:**
- SQL injection (various techniques)
- NoSQL injection (MongoDB, etc.)
- Command injection prevention
- LDAP injection security
- XML/XXE attack protection
- JNDI injection prevention
- Template injection security

### Input Validation (`input-validation.security.test.ts`)
Tests input sanitization and validation:

```javascript
describe('Input Validation Security Tests', () => {
  // XSS prevention
  it('should prevent stored XSS attacks', async () => {
    // Test with XSS payloads
  });
  
  // File upload security
  it('should validate file types and extensions', async () => {
    // Test with malicious file uploads
  });
});
```

**Key Test Cases:**
- Stored XSS prevention
- Reflected XSS protection
- CSRF token validation
- File upload restrictions
- Input length validation
- Data type validation
- Unicode handling

### API Security (`api-security.security.test.ts`)
Tests API-specific vulnerabilities:

```javascript
describe('API Security Tests', () => {
  // HTTP method security
  it('should only allow appropriate HTTP methods', async () => {
    // Test method restrictions
  });
  
  // Rate limiting
  it('should implement rate limiting per endpoint', async () => {
    // Test rate limiting effectiveness
  });
});
```

**Key Test Cases:**
- HTTP method restrictions
- Rate limiting per endpoint
- Content type validation
- Response header security
- Mass assignment prevention
- Resource exhaustion protection

## Custom Security Test Patterns

### Payload Generation
```javascript
// SQL injection payloads
const sqlInjectionPayloads = [
  "'; DROP TABLE programs; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --"
];

// XSS payloads
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">'
];
```

### Response Validation
```javascript
// Validate security headers
expect(response.headers['x-content-type-options']).toBe('nosniff');
expect(response.headers['x-frame-options']).toMatch(/deny|sameorigin/i);

// Check for information leakage
expect(response.data.error).not.toMatch(/SQL|database|internal/i);
```

### Timing Attack Detection
```javascript
const measureResponseTime = async (payload) => {
  const startTime = Date.now();
  await makeRequest(payload);
  return Date.now() - startTime;
};

// Timing should be consistent to prevent user enumeration
const timeDifference = Math.abs(existingUserTime - nonExistentUserTime);
expect(timeDifference).toBeLessThan(100); // Within 100ms
```

## Safety Features

### Production Protection
The test suite includes multiple safety mechanisms to prevent accidental testing against production systems:

```bash
# Automatic production detection
if [[ "$BASE_URL" =~ (production|prod) ]] || [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🚨 CRITICAL: Security tests cannot run against production!"
    exit 1
fi
```

### Mock Credentials
All tests use mock credentials to prevent accidental use of real authentication:

```javascript
const mockCredentials = {
  validToken: 'test-valid-token-12345',
  expiredToken: 'test-expired-token-12345',
  maliciousToken: '<script>alert("xss")</script>',
  testUserEmail: 'security-test@example.com'
};
```

### Test Isolation
Each test is isolated and cannot affect other tests or leak sensitive data:

```javascript
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  delete process.env.TEST_AUTH_TOKEN;
  delete process.env.TEST_API_KEY;
});
```

## Results and Reporting

### Test Results
Tests generate comprehensive results in the `results/` directory:
- **JSON Results**: Detailed test execution data
- **Coverage Reports**: Code coverage analysis  
- **Security Assessment**: Consolidated security report

### Security Assessment Report
The test suite generates a comprehensive security assessment report:

```markdown
# Security Assessment Report

## Executive Summary
- Total Security Tests: 150
- Tests Passed: 145
- Tests Failed: 5
- Success Rate: 97%

## OWASP Top 10 Compliance
- A01:2021 – Broken Access Control: ✅ Covered
- A02:2021 – Cryptographic Failures: ⚠️ Partial
- A03:2021 – Injection: ✅ Comprehensive
```

### CI/CD Integration

#### GitHub Actions
```yaml
name: Security Tests
on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Security Tests
        run: |
          cd tests/security
          ./run-security-tests.sh all --base-url http://localhost:3000
        env:
          NODE_ENV: test
          
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-assessment
          path: tests/security/results/
```

#### Jenkins Pipeline
```groovy
pipeline {
    agent any
    
    environment {
        NODE_ENV = 'test'
        BASE_URL = 'http://test-server:3000'
    }
    
    stages {
        stage('Security Tests') {
            steps {
                sh '''
                    cd tests/security
                    ./run-security-tests.sh all --environment test
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'tests/security/results/*', allowEmptyArchive: false
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests/security/results',
                        reportFiles: '*.html',
                        reportName: 'Security Test Report'
                    ])
                }
            }
        }
    }
}
```

## Best Practices

### Security Test Design
1. **Use Realistic Payloads**: Test with actual attack vectors, not just basic examples
2. **Test Edge Cases**: Include boundary conditions and unusual input combinations
3. **Validate Responses**: Check both success and failure response patterns
4. **Test Timing**: Detect timing attacks and information leakage
5. **Mock External Dependencies**: Prevent tests from affecting external systems

### Test Execution
1. **Isolated Environment**: Always run security tests in isolated test environments
2. **Clean State**: Ensure tests don't interfere with each other
3. **Comprehensive Coverage**: Test all endpoints, methods, and user roles
4. **Regular Execution**: Run security tests with every deployment
5. **Monitor Results**: Track security test trends over time

### Vulnerability Management
1. **Immediate Response**: Address critical vulnerabilities immediately
2. **Risk Assessment**: Prioritize fixes based on risk and impact
3. **Regression Testing**: Ensure fixes don't introduce new vulnerabilities  
4. **Documentation**: Document security issues and their resolutions
5. **Regular Updates**: Keep security tests updated with new attack patterns

## Troubleshooting

### Common Issues

**Tests Failing Against Production**:
```bash
🚨 CRITICAL: Security tests cannot run against production!
```
**Solution**: Verify BASE_URL points to test environment

**Authentication Failures**:
```bash
Error: Authentication failed - check credentials
```
**Solution**: Ensure test credentials are properly configured

**Rate Limiting Issues**:
```bash
Error: Too many requests (429)
```
**Solution**: Reduce test parallelism or add delays between requests

**Timeout Errors**:
```bash
Error: Timeout exceeded (30000ms)
```
**Solution**: Increase timeout in jest.config.js or check server performance

### Debugging

**Enable Verbose Output**:
```bash
./run-security-tests.sh all --verbose
```

**Run Individual Test**:
```bash
npx jest authentication.security.test.ts --verbose
```

**Check Test Configuration**:
```bash
npx jest --showConfig
```

## Contributing

### Adding New Security Tests

1. **Create Test File**: Follow naming convention `*.security.test.ts`
2. **Use Test Patterns**: Follow existing patterns for consistency
3. **Include Documentation**: Document test purpose and expected behavior
4. **Add to Runner**: Update `run-security-tests.sh` to include new tests
5. **Update README**: Document new test coverage areas

### Security Test Guidelines

- **Never use real credentials** in security tests
- **Always validate both positive and negative cases**
- **Include edge cases and boundary conditions**
- **Test for information leakage in error responses**
- **Validate security headers and response patterns**
- **Use realistic attack payloads from security research**

## References

### Security Standards
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cybersecurity)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

### Testing Resources
- [OWASP ZAP](https://www.zaproxy.org/) - Web Application Security Scanner
- [Burp Suite](https://portswigger.net/burp) - Web Vulnerability Scanner  
- [Nuclei](https://nuclei.projectdiscovery.io/) - Fast Vulnerability Scanner
- [Security Headers](https://securityheaders.com/) - HTTP Security Header Analysis

For questions or issues with security testing, refer to the project documentation or create an issue in the repository.