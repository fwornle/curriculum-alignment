# Blue-Green Deployment Guide

Zero-downtime deployment strategy for the Curriculum Alignment System with instant rollback capability.

## Overview

Blue-Green deployment is a deployment strategy that reduces downtime and risk by maintaining two identical production environments:
- **Blue Environment**: Currently serving production traffic
- **Green Environment**: Staging area for new deployments

## Architecture

```
Internet → Load Balancer/API Gateway → Blue Environment (Active)
                     ↓
                   Green Environment (Inactive)
```

### Components

1. **Blue Stack**: `curriculum-alignment-{env}-blue`
2. **Green Stack**: `curriculum-alignment-{env}-green` 
3. **Alias Stack**: `curriculum-alignment-{env}-alias` (Traffic routing)
4. **Load Balancer**: Routes traffic between environments
5. **Health Checks**: Validates environment health before switching

## Features

### Zero-Downtime Deployment
- Deploy to inactive environment while active serves traffic
- Instant traffic switch after validation
- No service interruption during deployment

### Canary Deployments
- Route small percentage of traffic to new version
- Monitor metrics during canary phase
- Automatic rollback on health check failure

### Instant Rollback
- One-command rollback to previous version
- Traffic switch back in seconds
- Maintains both environments for quick recovery

### Comprehensive Validation
- Health checks before traffic switch
- Smoke tests on new environment
- Performance monitoring during canary phase

## Usage

### Basic Deployment
```bash
# Deploy version 1.2.3 to staging
./blue-green-deploy.sh staging deploy v1.2.3

# Deploy to production
./blue-green-deploy.sh production deploy v1.2.3
```

### Canary Deployment
```bash
# Deploy with 10% canary traffic for 5 minutes
CANARY_PERCENTAGE=10 CANARY_DURATION=300 \
./blue-green-deploy.sh production deploy v1.2.3
```

### Status and Monitoring
```bash
# Check current deployment status
./blue-green-deploy.sh staging status

# View detailed stack information
./blue-green-deploy.sh production status
```

### Rollback
```bash
# Instant rollback to previous version
./blue-green-deploy.sh production rollback
```

### Cleanup
```bash
# Clean up inactive environment
./blue-green-deploy.sh staging cleanup inactive

# Clean up specific environment
./blue-green-deploy.sh staging cleanup blue
```

## Configuration

### Environment Variables

```bash
# AWS Configuration
export AWS_REGION=us-east-1

# Canary Deployment Settings
export CANARY_PERCENTAGE=10        # Percentage of traffic for canary
export CANARY_DURATION=300         # Canary duration in seconds

# Health Check Configuration
export HEALTH_CHECK_RETRIES=5      # Number of health check attempts
export HEALTH_CHECK_INTERVAL=30    # Seconds between health checks
export HEALTH_CHECK_TIMEOUT=10     # Timeout for individual health checks
```

### Stack Naming Convention

- **Blue Stack**: `{base-stack-name}-blue`
- **Green Stack**: `{base-stack-name}-green`
- **Alias Stack**: `{base-stack-name}-alias`

Example for staging environment:
- `curriculum-alignment-staging-blue`
- `curriculum-alignment-staging-green`
- `curriculum-alignment-staging-alias`

## Deployment Process

### 1. Pre-deployment Checks
- Validate AWS credentials and permissions
- Check SAM CLI and required tools
- Verify current active environment

### 2. Build and Package
```bash
# Build application
sam build --use-container

# Package for deployment
sam package --s3-bucket deployment-bucket --s3-prefix version
```

### 3. Deploy to Inactive Environment
- Deploy CloudFormation stack to inactive environment
- Wait for stack creation/update to complete
- Validate deployment success

### 4. Health Validation
```bash
# Health endpoint check
curl -sf "$API_URL/health"

# Database connectivity
curl -sf "$API_URL/health/database"

# System info
curl -sf "$API_URL/health/info"
```

### 5. Smoke Tests
- Run automated smoke tests against new environment
- Validate critical functionality
- Check performance benchmarks

### 6. Traffic Switch

#### Standard Deployment
- Update alias stack to point to new environment
- Switch 100% of traffic instantly
- Monitor for immediate issues

#### Canary Deployment
```bash
# Phase 1: Route small percentage to new version
CANARY_PERCENTAGE=10

# Phase 2: Monitor for specified duration
CANARY_DURATION=300

# Phase 3: Full switch if metrics are healthy
# Phase 4: Rollback if issues detected
```

### 7. Post-deployment Validation
- Final health checks on live traffic
- Update monitoring dashboards
- Verify all services operational

## Rollback Process

### Automatic Rollback Triggers
- Health check failures during canary phase
- Smoke test failures on new environment
- Traffic switch failures

### Manual Rollback
```bash
# Immediate rollback command
./blue-green-deploy.sh production rollback
```

### Rollback Process
1. Update alias stack to point to previous environment
2. Switch traffic back to stable version
3. Validate rollback success
4. Update monitoring dashboards

## Monitoring and Observability

### Key Metrics to Monitor
- **Response Time**: API endpoint latency
- **Error Rate**: 4xx/5xx HTTP responses
- **Throughput**: Requests per second
- **Database Connections**: Connection pool health

### CloudWatch Dashboards
- Separate dashboards for blue and green environments
- Automatic switching to active environment
- Canary deployment metrics during transition

### Alerts and Notifications
```bash
# High error rate during canary
aws cloudwatch put-metric-alarm \
  --alarm-name "BlueGreen-CanaryErrorRate" \
  --alarm-description "High error rate during canary deployment"

# Response time degradation
aws cloudwatch put-metric-alarm \
  --alarm-name "BlueGreen-ResponseTime" \
  --alarm-description "Response time increase after deployment"
```

## Security Considerations

### Network Security
- Blue and green environments in separate subnets
- Security groups allowing only necessary traffic
- Load balancer with SSL termination

### Access Control
- IAM roles with least privilege principles
- Separate deployment credentials per environment
- Audit trail for all deployment actions

### Data Security
- Database migrations tested in both environments
- No sensitive data in deployment scripts
- Encrypted communication between components

## Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name curriculum-alignment-staging-green

# Check stack status
./blue-green-deploy.sh staging status
```

#### Health Check Failures
```bash
# Check application logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/curriculum"

# Manual health check
curl -v http://api-url/health
```

#### Traffic Switch Issues
```bash
# Check alias stack status
aws cloudformation describe-stacks \
  --stack-name curriculum-alignment-staging-alias

# Verify load balancer configuration
aws elbv2 describe-load-balancers
```

### Recovery Procedures

#### Stuck Deployment
```bash
# Cancel CloudFormation update
aws cloudformation cancel-update-stack \
  --stack-name curriculum-alignment-staging-green

# Force rollback
./blue-green-deploy.sh staging rollback
```

#### Split-Brain Scenario
```bash
# Check which environment is receiving traffic
./blue-green-deploy.sh staging status

# Force traffic to known good environment
aws cloudformation update-stack \
  --stack-name curriculum-alignment-staging-alias \
  --parameters ParameterKey=ActiveEnvironment,ParameterValue=blue
```

## Best Practices

### Deployment Strategy
1. **Test in Staging First**: Always deploy to staging before production
2. **Use Canary for Production**: Enable canary deployments for production
3. **Monitor Metrics**: Watch key metrics during and after deployment
4. **Keep Both Environments**: Don't cleanup immediately after deployment

### Database Migrations
1. **Forward Compatible**: Ensure migrations are backward compatible
2. **Test Rollback**: Verify migration rollback procedures
3. **Staged Migration**: Use separate migration phases for complex changes

### Configuration Management
1. **Environment Parity**: Keep blue and green configurations identical
2. **Feature Flags**: Use feature flags for gradual feature rollouts
3. **Secrets Management**: Use AWS Systems Manager for sensitive configuration

### Monitoring and Alerting
1. **Baseline Metrics**: Establish performance baselines before deployment
2. **Automated Rollback**: Set up automated rollback on critical metric thresholds
3. **Real-time Monitoring**: Monitor deployments in real-time

## Cost Optimization

### Resource Management
- Terminate inactive environment after successful deployment
- Use scheduled cleanup for development environments
- Right-size instances based on actual usage

### Cost Monitoring
```bash
# Monitor deployment costs
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## Integration with CI/CD

### GitHub Actions Integration
```yaml
- name: Blue-Green Deploy
  run: |
    ./scripts/blue-green-deploy.sh ${{ env.ENVIRONMENT }} deploy ${{ github.sha }}
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    CANARY_PERCENTAGE: 10
```

### Automated Testing Integration
```bash
# Pre-deployment tests
npm test

# Deploy to inactive environment
./blue-green-deploy.sh staging deploy $VERSION

# Post-deployment validation
npm run test:smoke
```

## Support and Maintenance

### Regular Tasks
- **Weekly**: Review deployment metrics and success rates
- **Monthly**: Update deployment scripts and dependencies
- **Quarterly**: Review and optimize deployment strategy

### Documentation Updates
- Keep deployment procedures current
- Update troubleshooting guides based on incidents
- Document lessons learned from deployments

For additional support, refer to the main project documentation or contact the DevOps team.