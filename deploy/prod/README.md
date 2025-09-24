# Production Environment Deployment

This directory contains production deployment scripts and configuration for the Curriculum Alignment System. **Handle with extreme care** - these scripts manage the live production environment serving real users.

## ⚠️ CRITICAL PRODUCTION WARNINGS

- **ALL CHANGES MUST GO THROUGH STAGING FIRST**
- **NEVER deploy directly to production without testing**
- **ALWAYS have rollback procedures ready**
- **MONITOR closely for 24-48 hours after deployment**
- **NOTIFY stakeholders before maintenance windows**

## Overview

The production environment provides:
- **Enterprise-grade AWS infrastructure** with high availability
- **Comprehensive monitoring and alerting** for all system components
- **Automated backup and disaster recovery** with point-in-time restoration
- **Security hardening** with encryption, access controls, and audit logging
- **Performance optimization** with auto-scaling and caching

## Quick Start

### 🚀 Deploy Production Environment
```bash
# IMPORTANT: Only run after successful staging deployment
./deploy.sh
```

### 📊 Check Production Status
```bash
./status.sh
```

### 🔥 Emergency Cleanup (DESTRUCTIVE)
```bash
# WARNING: This permanently destroys everything!
./cleanup.sh
```

## Scripts

### deploy.sh
**Purpose**: Production deployment with enterprise-grade safety checks

**Critical Features**:
- **Multiple confirmation prompts** preventing accidental deployment
- **Pre-deployment backup** of existing production data
- **Security scanning** and compliance validation
- **Comprehensive smoke testing** of all production services
- **Monitoring setup** with CloudWatch dashboards and alarms
- **Rollback capabilities** for failed deployments

**Usage**:
```bash
./deploy.sh                    # Interactive deployment with confirmations
./deploy.sh --force            # Skip confirmations (DANGEROUS - CI/CD only)
./deploy.sh --no-backup        # Skip pre-deployment backup
./deploy.sh --no-monitor       # Skip monitoring configuration
./deploy.sh --help             # Show detailed help
```

**Production Prerequisites**:
- AWS CLI configured with production account access
- SAM CLI (latest version) with all dependencies
- Node.js 18+ with production-optimized build tools
- Security checklist completed (`security-checklist.md`)
- Stakeholder approval for production changes
- Staging environment successfully tested

**Safety Features**:
- Account verification to prevent cross-account accidents
- IAM permission validation
- Template security scanning
- Resource conflict detection
- Automated rollback on failure

### status.sh
**Purpose**: Real-time production health monitoring and diagnostics

**Monitoring Capabilities**:
- **CloudFormation stack** status and resource health
- **Lambda functions** performance metrics and error rates
- **API Gateway** endpoint availability and latency
- **CloudWatch alarms** status and alert summaries
- **S3 buckets** accessibility and storage metrics
- **Database connectivity** and performance indicators
- **Backup systems** status and recent backup verification

**Usage**:
```bash
./status.sh                    # Complete production health check
./status.sh --json             # Machine-readable output (future)
./status.sh --help             # Show monitoring details
```

**Alert Conditions**:
- Stack in failed state
- Active CloudWatch alarms
- Lambda error rates > 1%
- API Gateway 5xx errors
- Database connection issues
- Missing or failed backups

### cleanup.sh
**Purpose**: Complete production environment destruction

**⚠️ EXTREME CAUTION**: This script **permanently destroys** the entire production environment and **all data**.

**Destructive Actions**:
- **Deletes all production data** (databases, files, configurations)
- **Destroys all AWS resources** (Lambda, API Gateway, S3, DynamoDB)
- **Removes all monitoring** (CloudWatch logs, alarms, dashboards)
- **Cancels all automation** (backup schedules, scaling policies)
- **Causes immediate downtime** (all production URLs go offline)

**Safety Mechanisms**:
- **Multiple confirmation prompts** requiring exact phrase matching
- **Authorization verification** requiring explicit approval
- **Backup confirmation** ensuring data recovery options exist
- **Resource inventory** documenting everything before destruction
- **Final backup creation** as last safety measure

**Usage**:
```bash
./cleanup.sh                  # Interactive destruction with safety checks
./cleanup.sh --force          # Skip confirmations (EXTREMELY DANGEROUS)
./cleanup.sh --help           # Show destruction details
```

**Recovery Requirements**:
- Complete redeployment from source code
- Data restoration from external backups only
- Full system reconfiguration and testing
- DNS and domain reconfiguration

## Production Configuration

### Environment Settings
Production environment uses enhanced configuration:
- **Region**: eu-central-1 (Frankfurt) for EU compliance
- **Stack Name**: curriculum-alignment-prod
- **Domain**: curriculum-alignment.ceu.edu (configure DNS)
- **Security**: All data encrypted at rest and in transit

### AWS Resources
Production deployment creates:
- **Lambda Functions**: Auto-scaling serverless compute
- **API Gateway**: Enterprise API with rate limiting and caching
- **S3 Buckets**: Encrypted storage with lifecycle policies
- **DynamoDB Tables**: High-performance NoSQL with backup
- **CloudWatch**: Comprehensive monitoring and alerting
- **IAM Roles**: Least-privilege security policies
- **CloudFormation**: Infrastructure as code management

### Security Configuration
- **Encryption**: AWS KMS for all data at rest
- **SSL/TLS**: 1.2+ enforced for all connections
- **API Security**: Rate limiting, CORS, authentication required
- **Network**: VPC isolation with security groups
- **Monitoring**: CloudTrail auditing all API calls
- **Backup**: Encrypted backups with retention policies

## Monitoring and Alerting

### CloudWatch Integration
Production monitoring includes:
- **Custom Dashboard**: CurriculumAlignment-Production
- **Lambda Metrics**: Duration, errors, invocations, memory usage
- **API Metrics**: Latency, error rates, request counts
- **Infrastructure**: CPU, memory, disk usage, network I/O
- **Business Metrics**: User activity, document processing

### Alert Configuration
Critical alerts notify on:
- **High Error Rates**: Lambda functions > 5 errors/hour
- **API Failures**: 5xx errors or > 30s latency
- **Resource Limits**: Memory/CPU > 80% sustained
- **Security Events**: Unauthorized access attempts
- **Backup Failures**: Missed or failed backup operations

### SNS Integration
```bash
# Configure alert notifications
aws sns create-topic --name curriculum-alignment-prod-alerts
aws sns subscribe --topic-arn [TOPIC-ARN] --protocol email --notification-endpoint ops@ceu.edu
```

## Backup and Disaster Recovery

### Automated Backups
Production backup strategy:
- **Database**: Full backup daily at 2 AM, incremental every 4 hours
- **Documents**: S3 sync with versioning, weekly archives
- **Configuration**: System state backup daily at 3 AM
- **Retention**: 90 days for compliance, then archive

### Manual Backup
```bash
# Create immediate production backup
/scripts/backup.sh prod full

# Verify backup integrity
aws s3 ls s3://curriculum-alignment-backups-prod/
```

### Disaster Recovery
**RPO (Recovery Point Objective)**: 4 hours maximum data loss
**RTO (Recovery Time Objective)**: 2 hours maximum downtime

Recovery procedures:
1. **Assess Impact**: Determine scope and root cause
2. **Activate DR Team**: Notify stakeholders and technical team
3. **Restore from Backup**: Use most recent valid backup
4. **Verify System**: Complete functional testing
5. **Resume Operations**: Gradual traffic restoration
6. **Post-Incident**: Root cause analysis and improvements

## Production Operations

### Deployment Process
1. **Development**: Feature development and local testing
2. **Staging**: Deploy to staging for integration testing
3. **User Acceptance**: Business validation and sign-off
4. **Production**: Automated deployment with monitoring
5. **Verification**: Post-deployment health checks
6. **Monitoring**: 24-48 hour close observation

### Maintenance Windows
Regular maintenance:
- **Weekly**: Dependency updates and security patches
- **Monthly**: Infrastructure optimization and scaling review
- **Quarterly**: Security audit and disaster recovery testing

### Change Management
All production changes require:
- Technical review and approval
- Business stakeholder sign-off
- Rollback plan documentation
- Risk assessment and mitigation
- Post-deployment monitoring plan

## Security and Compliance

### Security Controls
- **Data Encryption**: AES-256 for data at rest, TLS 1.2+ in transit
- **Access Control**: IAM roles with least privilege
- **Network Security**: VPC isolation, security groups, NACLs
- **API Security**: Authentication, rate limiting, input validation
- **Monitoring**: Real-time security event detection

### Compliance Requirements
- **GDPR**: EU data protection compliance
- **Educational Records**: Student data privacy protections
- **Audit Logging**: Complete activity trails
- **Data Retention**: Configurable retention policies

### Security Checklist
Before production deployment:
- [ ] Security scan completed without critical issues
- [ ] All secrets stored in AWS Secrets Manager
- [ ] IAM policies follow least privilege principle
- [ ] API Gateway configured with authentication
- [ ] Database encryption enabled
- [ ] S3 buckets properly secured
- [ ] CloudTrail logging enabled
- [ ] Security monitoring alerts configured

## Cost Management

### Cost Optimization
Production cost controls:
- **Auto-scaling**: Lambda and API Gateway scale to zero
- **Reserved Capacity**: RDS and DynamoDB reserved instances
- **Storage Lifecycle**: S3 intelligent tiering
- **Monitoring**: Cost alerts and budgets

### Budget Monitoring
```bash
# Set up cost alerts
aws budgets create-budget --account-id [ACCOUNT-ID] --budget '{
  "BudgetName": "CurriculumAlignment-Prod-Monthly",
  "BudgetLimit": {"Amount": "500", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}'
```

## Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name curriculum-alignment-prod

# View deployment logs
cat deploy.log

# Rollback if needed
aws cloudformation cancel-update-stack --stack-name curriculum-alignment-prod
```

#### Performance Issues
```bash
# Check Lambda performance
./status.sh
sam logs -n CoordinatorFunction --stack-name curriculum-alignment-prod --tail

# API Gateway metrics
aws cloudwatch get-metric-statistics --namespace AWS/ApiGateway --metric-name Latency
```

#### Security Incidents
1. **Immediate**: Block suspicious traffic via security groups
2. **Assess**: Determine scope and impact
3. **Contain**: Isolate affected resources
4. **Investigate**: Analyze logs and evidence
5. **Recover**: Restore from clean backups if needed
6. **Report**: Document and notify as required

### Emergency Procedures

#### Service Outage
1. Check `./status.sh` for immediate diagnosis
2. Review CloudWatch alarms for root cause
3. Check recent deployments or changes
4. Scale up resources if capacity issue
5. Rollback recent changes if necessary
6. Engage incident response team

#### Data Loss
1. **STOP**: Immediately prevent further damage
2. **Assess**: Determine scope of data loss
3. **Restore**: Use most recent backup
4. **Verify**: Confirm data integrity
5. **Investigate**: Root cause analysis
6. **Prevent**: Implement safeguards

## Support and Escalation

### Contact Information
- **Operations Team**: ops@ceu.edu
- **Emergency Hotline**: +36-1-EMERGENCY
- **AWS Support**: Enterprise support plan active
- **Escalation**: CTO and IT Director notification

### Incident Response
- **P1 (Critical)**: Complete service outage, data loss
- **P2 (High)**: Performance degradation, partial outage  
- **P3 (Medium)**: Non-critical feature issues
- **P4 (Low)**: Minor bugs, cosmetic issues

### Documentation
- **Runbooks**: `/docs/operations/`
- **Architecture**: `/docs/architecture/`
- **Security**: `/docs/security/`
- **Compliance**: `/docs/compliance/`

---

## File Structure
```
deploy/prod/
├── deploy.sh          # Production deployment with safety checks
├── cleanup.sh         # Environment destruction (DANGEROUS)
├── status.sh          # Health monitoring and diagnostics
├── README.md          # This production operations guide
├── outputs.json       # Stack outputs (generated)
├── deploy.log         # Deployment logs (generated)
├── cleanup.log        # Cleanup logs (generated)
└── production-resource-inventory.json  # Resource tracking (generated)
```

## Related Documentation
- **Main README**: [../../README.md](../../README.md) - System overview
- **Development**: [../dev/README.md](../dev/README.md) - Development environment
- **Architecture**: [../../docs/architecture.md](../../docs/architecture.md) - System design
- **Security**: [../../security-checklist.md](../../security-checklist.md) - Security requirements
- **Backup**: [../../scripts/Backup-README.md](../../scripts/Backup-README.md) - Backup procedures

---

**Remember**: Production is live and serves real users. Every action has consequences. When in doubt, test in staging first and ask for help.