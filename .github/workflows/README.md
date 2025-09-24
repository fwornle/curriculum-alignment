# CI/CD Pipeline Documentation

Comprehensive GitHub Actions workflows for automated testing and deployment of the Curriculum Alignment System.

## Overview

The CI/CD pipeline consists of two main workflows:
- **Test Workflow** (`test.yml`): Automated testing suite
- **Deploy Workflow** (`deploy.yml`): Automated deployment pipeline

## Test Workflow (`test.yml`)

### Triggers
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main` or `develop`
- Manual trigger with test suite selection

### Test Suites

#### 1. Unit Tests
- **Backend**: API and Lambda function unit tests
- **Frontend**: React component and utility tests
- **Lambda**: Individual agent function tests
- **Coverage**: Codecov integration with 80% threshold

#### 2. Integration Tests
- Database integration with PostgreSQL 15
- API endpoint integration
- Cross-service communication tests
- Test database migrations

#### 3. End-to-End Tests
- **Browsers**: Chromium and Firefox via Playwright
- **Scenarios**: Full user workflows
- **Environment**: Local test server with mock backend

#### 4. Security Tests
- **SAST**: CodeQL static analysis
- **Dependency Audit**: npm audit for vulnerabilities
- **Security Test Suite**: Custom security tests
- **Environment**: Isolated test environment with mocks

#### 5. Load Tests
- **Optional**: Manual trigger only
- **Metrics**: Response time, throughput, error rate
- **Duration**: Configurable (default 60s)

### Quality Gate
- **Required**: Unit and Integration tests must pass
- **Optional**: E2E and Security tests (warnings only)
- **Coverage**: Minimum 80% code coverage
- **Artifacts**: Test results uploaded for analysis

## Deploy Workflow (`deploy.yml`)

### Triggers
- Push to `main` → Staging deployment
- Tagged releases (`v*`) → Production deployment
- Manual trigger with environment selection
- Rollback capability

### Environments
- **Development**: Feature branches (manual)
- **Staging**: Main branch (automatic)
- **Production**: Tagged releases (manual approval)

### Deployment Stages

#### 1. Pre-deployment Tests
- Runs abbreviated test suite (unit, integration, security)
- Can be skipped with manual flag
- Blocks deployment on failure

#### 2. Build
- **Frontend**: React build with Vite
- **Backend**: Lambda function compilation
- **SAM**: CloudFormation template packaging
- **Artifacts**: Versioned deployment packages

#### 3. Infrastructure Deployment
- **SAM Deploy**: CloudFormation stack updates
- **Monitoring**: CloudWatch dashboards and alarms
- **Outputs**: API URLs, S3 buckets, database endpoints

#### 4. Frontend Deployment
- **S3**: Static file deployment with caching
- **CloudFront**: CDN invalidation
- **Optimization**: Gzipped assets with proper cache headers

#### 5. Database Migration
- **Migrations**: Sequential SQL script execution
- **Rollback**: Available for failed migrations
- **Environment**: Production uses different seed data

#### 6. Post-deployment Tests
- **Smoke Tests**: Critical functionality verification
- **Health Checks**: API and database connectivity
- **Performance**: Basic response time validation

## Configuration

### Required Secrets
```bash
AWS_ACCESS_KEY_ID          # AWS deployment credentials
AWS_SECRET_ACCESS_KEY      # AWS deployment credentials
```

### Environment Variables
```bash
NODE_VERSION=18            # Node.js version
AWS_REGION=us-east-1      # Primary AWS region
SAM_CLI_VERSION=1.100.0   # SAM CLI version
```

### Repository Settings
- **Branch Protection**: Main branch requires PR and status checks
- **Environments**: Staging and Production with approval requirements
- **Secrets**: Environment-specific secrets configuration

## Usage Examples

### Running Tests
```bash
# All tests (automatic on PR)
git push origin feature/new-feature

# Specific test suite
gh workflow run test.yml -f test_suite=security

# Load tests (manual only)
gh workflow run test.yml -f test_suite=load
```

### Deploying

#### Staging Deployment
```bash
# Automatic on main branch
git push origin main
```

#### Production Deployment
```bash
# Create and push tag
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

#### Manual Deployment
```bash
# Deploy to specific environment
gh workflow run deploy.yml -f environment=staging

# Skip tests (use carefully)
gh workflow run deploy.yml -f environment=staging -f skip_tests=true

# Rollback deployment
gh workflow run deploy.yml -f environment=production -f rollback=true
```

## Monitoring and Observability

### GitHub Integration
- **Status Checks**: Required for merge
- **Deployment Status**: GitHub Deployments API
- **Artifacts**: Test reports and build artifacts
- **Notifications**: Slack/Teams integration (optional)

### AWS Integration
- **CloudWatch**: Deployment metrics and logs
- **X-Ray**: Distributed tracing (if enabled)
- **CloudTrail**: Deployment audit logs

### Failure Handling
- **Automatic Rollback**: On deployment failure
- **Notification**: Failed deployment alerts
- **Logs**: Detailed error logs in GitHub Actions
- **Artifacts**: Failure artifacts for debugging

## Security Considerations

### Secrets Management
- **AWS Credentials**: IAM roles with least privilege
- **Environment Secrets**: Stored in GitHub Secrets
- **Database**: Connection strings in AWS Systems Manager

### Access Control
- **Branch Protection**: Requires code review
- **Environment Protection**: Production requires approval
- **Audit Trail**: All deployments logged and tracked

### Security Scanning
- **CodeQL**: Static analysis on every commit
- **Dependency Scanning**: npm audit and Dependabot
- **Container Scanning**: Docker images (if applicable)

## Troubleshooting

### Common Issues

#### Test Failures
```bash
# Check test logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed
```

#### Deployment Failures
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name curriculum-alignment-staging

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/curriculum"

# Manual rollback
aws cloudformation cancel-update-stack --stack-name curriculum-alignment-production
```

#### Environment Issues
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check environment secrets
gh secret list --env production

# Validate SAM template
sam validate --template template.yaml
```

### Performance Optimization

#### Build Optimization
- **Caching**: Node modules and build artifacts
- **Parallelization**: Matrix builds for different test types
- **Artifacts**: Only necessary files in deployment packages

#### Test Optimization
- **Selective Testing**: Skip unnecessary tests based on changed files
- **Test Sharding**: Parallel test execution
- **Mock Services**: Reduced external dependencies in tests

## Best Practices

### Development Workflow
1. **Feature Branches**: All development in feature branches
2. **Pull Requests**: Required for all changes to main
3. **Status Checks**: All tests must pass before merge
4. **Code Review**: At least one reviewer required

### Deployment Strategy
1. **Gradual Rollout**: Staging → Production
2. **Blue-Green**: Zero-downtime deployments
3. **Database Migrations**: Forward-compatible changes only
4. **Monitoring**: Health checks after each deployment

### Testing Strategy
1. **Pyramid**: More unit tests, fewer E2E tests
2. **Smoke Tests**: Critical path verification only
3. **Environment Parity**: Test environments match production
4. **Data Management**: Clean test data between runs

## Maintenance

### Regular Tasks
- **Weekly**: Review failed deployments and tests
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize CI/CD performance
- **Annually**: Full security audit of pipeline

### Updates
- **GitHub Actions**: Keep actions up to date
- **AWS Services**: Monitor for service updates
- **Dependencies**: Regular security updates
- **Documentation**: Keep current with changes

## Support

### Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Playwright Documentation](https://playwright.dev/)

### Getting Help
1. Check workflow logs in GitHub Actions tab
2. Review AWS CloudWatch logs for deployment issues
3. Consult team lead for pipeline configuration changes
4. Create issue in repository for persistent problems