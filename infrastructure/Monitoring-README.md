# CloudWatch Monitoring for Curriculum Alignment System

Comprehensive monitoring and alerting infrastructure for the Multi-Agent Curriculum Alignment System.

## Overview

This monitoring setup provides complete visibility into system performance, costs, and business metrics across all agents and infrastructure components.

## Dashboard Architecture

### 1. System Overview Dashboard (`CurriculumAlignmentSystem-Overview`)
- **Purpose**: High-level system health and performance metrics
- **Key Metrics**:
  - API Lambda performance (invocations, errors, duration, throttles)
  - Database performance (CPU, connections, latency)
  - Agent activity across all agents
  - API Gateway metrics (errors, latency)
  - Document storage metrics

### 2. Agent Performance Dashboard (`CurriculumAlignmentSystem-AgentPerformance`)
- **Purpose**: Detailed monitoring of individual agent performance
- **Key Metrics**:
  - Agent execution duration by function
  - Agent error rates and concurrent executions
  - Agent error logs and warnings
- **Agents Monitored**:
  - `curriculum-analysis-agent`
  - `program-matcher-agent`
  - `outcome-alignment-agent`
  - `content-processor-agent`
  - `report-generator-agent`
  - `workflow-coordinator-agent`

### 3. Cost Monitoring Dashboard (`CurriculumAlignmentSystem-Costs`)
- **Purpose**: Track and optimize system costs
- **Key Metrics**:
  - Daily costs by AWS service
  - Total compute time per agent
  - Daily cost and invocation totals
  - Database I/O operations (cost drivers)

### 4. Error Tracking Dashboard (`CurriculumAlignmentSystem-Errors`)
- **Purpose**: Comprehensive error monitoring and system health
- **Key Metrics**:
  - System-wide error counts
  - API error responses (4XX/5XX)
  - Database connection health
  - Error rate trends over time

### 5. Business Metrics Dashboard (`CurriculumAlignmentSystem-BusinessMetrics`)
- **Purpose**: Business-focused operational metrics
- **Key Metrics**:
  - Completed analyses per hour
  - Program matches per hour
  - Reports generated per day
  - Documents processed per hour
  - Workflow status distribution

## Alert Configuration

### Critical Alerts

1. **High Error Rate** (`CurriculumAlignment-HighErrorRate`)
   - **Trigger**: More than 10 errors in 10 minutes (2 evaluation periods)
   - **Action**: Send to general alerts SNS topic
   - **Purpose**: Detect system-wide failures

2. **Database Connection Issues** (`CurriculumAlignment-DatabaseConnections`)
   - **Trigger**: Average connections > 80 for 10 minutes
   - **Action**: Send to general alerts SNS topic
   - **Purpose**: Prevent database connection pool exhaustion

3. **API Latency** (`CurriculumAlignment-ApiLatency`)
   - **Trigger**: Average API response time > 5 seconds for 15 minutes
   - **Action**: Send to general alerts SNS topic
   - **Purpose**: Maintain acceptable user experience

4. **Daily Cost Threshold** (`CurriculumAlignment-DailyCost`)
   - **Trigger**: Daily costs exceed $100
   - **Action**: Send to cost alerts SNS topic
   - **Purpose**: Cost control and budget management

## Custom Metrics

### Business Metrics
- `CurriculumAlignment/Business/AnalysisCompleted`: Analysis completion count
- `CurriculumAlignment/Business/ProgramMatches`: Program matching success count
- `CurriculumAlignment/Business/DocumentsProcessed`: Document processing count
- `CurriculumAlignment/Business/ReportsGenerated`: Report generation count

### Performance Metrics
- `CurriculumAlignment/Performance/ProcessingTime`: Document processing duration
- `CurriculumAlignment/Performance/AnalysisQuality`: Quality scores (0-100)

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- `jq` installed for JSON processing
- CloudWatch dashboard and alarm permissions
- Lambda functions deployed with expected names

### Quick Deployment
```bash
cd infrastructure
./deploy-monitoring.sh
```

### Advanced Deployment Options
```bash
# Deploy to specific region
AWS_REGION=us-west-2 ./deploy-monitoring.sh

# Verify deployment
./deploy-monitoring.sh verify

# Clean up monitoring resources
./deploy-monitoring.sh cleanup
```

### Manual Deployment
```bash
# Create SNS topics
aws sns create-topic --name curriculum-alignment-alerts
aws sns create-topic --name curriculum-alignment-cost-alerts

# Deploy dashboards (use AWS CLI with the JSON config)
aws cloudwatch put-dashboard \
  --dashboard-name CurriculumAlignmentSystem-Overview \
  --dashboard-body file://cloudwatch-dashboards.json
```

## Configuration

### Environment Variables
```bash
export AWS_REGION=us-east-1
export SNS_ALERTS_TOPIC=curriculum-alignment-alerts
export SNS_COST_TOPIC=curriculum-alignment-cost-alerts
```

### Required Permissions
The deployment requires the following IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutDashboard",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:ListDashboards",
        "cloudwatch:DescribeAlarms",
        "logs:PutMetricFilter",
        "sns:CreateTopic",
        "sns:GetTopicAttributes",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## Monitoring Best Practices

### Dashboard Usage
1. **Daily Review**: Check Overview dashboard for system health
2. **Weekly Analysis**: Review Cost dashboard for optimization opportunities
3. **Incident Response**: Use Error dashboard during troubleshooting
4. **Performance Tuning**: Monitor Agent Performance dashboard for optimization

### Alert Management
1. **Alert Fatigue**: Tune thresholds to reduce false positives
2. **Escalation**: Configure appropriate notification channels
3. **Documentation**: Maintain runbooks for each alert type
4. **Review**: Regularly review and update alert thresholds

### Cost Optimization
1. **Regular Monitoring**: Check cost trends weekly
2. **Right-sizing**: Use performance data to optimize Lambda memory/timeout
3. **Usage Patterns**: Analyze business metrics for optimization opportunities
4. **Budget Alerts**: Set up graduated cost alerts ($25, $50, $100)

## Troubleshooting

### Common Issues

**Dashboard Not Loading**
- Check CloudWatch permissions
- Verify region settings
- Ensure Lambda functions exist with correct names

**No Metrics Data**
- Verify Lambda functions are being invoked
- Check CloudWatch Logs for function execution
- Ensure custom metric filters are configured

**Alerts Not Firing**
- Verify SNS topic permissions
- Check alarm thresholds and evaluation periods
- Confirm alarm state in CloudWatch console

**High Costs**
- Review Lambda memory/timeout settings
- Analyze database query performance
- Check for unused or over-provisioned resources

### Debugging Commands
```bash
# Check deployed dashboards
aws cloudwatch list-dashboards --region us-east-1

# Check alarm states
aws cloudwatch describe-alarms --region us-east-1

# View recent Lambda errors
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/curriculum"

# Check SNS topics
aws sns list-topics --region us-east-1
```

## Integration with CI/CD

### Automated Monitoring Deployment
Include monitoring deployment in your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Deploy Monitoring
  run: |
    cd infrastructure
    ./deploy-monitoring.sh
  env:
    AWS_REGION: us-east-1
```

### Monitoring as Code
- Version control all monitoring configurations
- Test monitoring changes in staging environment
- Automate monitoring deployment with infrastructure updates

## Maintenance

### Regular Tasks
1. **Weekly**: Review dashboard metrics and cost trends
2. **Monthly**: Update alert thresholds based on performance patterns
3. **Quarterly**: Review and optimize monitoring configuration
4. **Annually**: Comprehensive monitoring strategy review

### Metric Retention
- CloudWatch Logs: 30 days (configurable)
- Custom Metrics: 15 months
- Dashboards: Permanent until deleted

## Support

For monitoring-related issues:
1. Check CloudWatch console for immediate status
2. Review deployment logs in `deploy-monitoring.sh`
3. Consult AWS CloudWatch documentation
4. Contact system administrators with specific error messages

## Related Documentation
- [AWS CloudWatch User Guide](https://docs.aws.amazon.com/cloudwatch/)
- [Lambda Monitoring Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html)
- [RDS Monitoring Guide](https://docs.aws.amazon.com/rds/latest/userguide/monitoring-overview.html)