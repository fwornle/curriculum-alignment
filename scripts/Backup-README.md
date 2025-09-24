# Backup and Recovery System

Comprehensive backup and disaster recovery solution for the Curriculum Alignment System with automated PostgreSQL, S3 document, and configuration backups.

## Overview

The backup and recovery system provides:
- **Automated PostgreSQL database backups** with custom and SQL formats
- **S3 document synchronization** with compression and encryption
- **Configuration backup** from AWS Systems Manager and CloudFormation
- **Point-in-time recovery** capabilities with verification
- **Encrypted storage** using AWS KMS
- **Automated retention management** with configurable policies

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   Application    │    │   Documents     │
│   PostgreSQL    │    │   Configuration  │    │   S3 Bucket     │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backup Process                              │
│  • pg_dump (custom + SQL)  • SSM Parameters    • S3 Sync      │
│  • Compression & Encryption • CloudFormation   • Archive      │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    S3 Backup Storage                           │
│  • Encrypted with KMS    • Lifecycle Policies                 │
│  • Versioning Enabled    • Cross-Region Replication (optional)│
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Restore Process                             │
│  • Verification      • Pre-restore Backup     • Rollback      │
│  • Point-in-time     • Integrity Checks       • Monitoring    │
└─────────────────────────────────────────────────────────────────┘
```

## Backup Types

### Full Backup
Complete system backup including database, documents, and configuration:
```bash
./backup.sh production full
```

### Database Only
PostgreSQL database backup with both custom and SQL formats:
```bash
./backup.sh production database
```

### Documents Only
S3 document synchronization and archival:
```bash
./backup.sh production documents
```

### Configuration Only
System configuration backup from AWS Systems Manager:
```bash
./backup.sh production config
```

## Quick Start

### Prerequisites
```bash
# Install required tools
sudo apt-get install postgresql-client-15 awscli gzip tar jq

# Configure AWS credentials
aws configure --profile curriculum-alignment

# Set environment variables
export S3_BACKUP_BUCKET=curriculum-alignment-backups
export BACKUP_RETENTION_DAYS=30
export ENCRYPTION_KEY_ID=alias/curriculum-alignment-backup
```

### Basic Usage

#### Create Full Backup
```bash
# Production full backup
./backup.sh production full

# Staging database backup
./backup.sh staging database

# Development with custom settings
S3_BACKUP_BUCKET=my-dev-backups ./backup.sh development full
```

#### List Available Backups
```bash
# List backups for production
./restore.sh production --list

# List backups for staging
./restore.sh staging --list
```

#### Restore from Backup
```bash
# Restore latest full backup
./restore.sh production latest full

# Restore specific backup (database only)
./restore.sh production curriculum-alignment-production-database-20231201_120000 database

# Restore without confirmation prompts (DANGEROUS)
./restore.sh staging latest --no-confirm
```

## Configuration

### Environment Variables

#### Backup Configuration
```bash
# S3 Configuration
export S3_BACKUP_BUCKET=curriculum-alignment-backups
export BACKUP_RETENTION_DAYS=30

# Encryption
export ENCRYPTION_KEY_ID=alias/curriculum-alignment-backup
export ENABLE_ENCRYPTION=true

# Compression and Performance
export COMPRESSION_LEVEL=6
export PARALLEL_JOBS=4

# Notifications
export BACKUP_NOTIFICATION_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:backup-alerts
```

#### Database Configuration
```bash
# Manual database credentials (optional)
export DB_HOST=curriculum-db.cluster-xyz.us-east-1.rds.amazonaws.com
export DB_PORT=5432
export DB_NAME=curriculum_alignment
export DB_USER=curriculum_user
export DB_PASSWORD=secure_password

# Or use AWS Systems Manager (recommended)
# Parameters will be read from:
# /curriculum-alignment/{environment}/db/host
# /curriculum-alignment/{environment}/db/name
# /curriculum-alignment/{environment}/db/username
# /curriculum-alignment/{environment}/db/password
```

#### Restore Configuration
```bash
# Safety Settings
export REQUIRE_CONFIRMATION=true
export ENABLE_PRE_RESTORE_BACKUP=true
export VERIFY_AFTER_RESTORE=true

# Notifications
export RESTORE_NOTIFICATION_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:restore-alerts
```

### AWS Resources Setup

#### S3 Backup Bucket
```bash
# Create backup bucket with versioning
aws s3 mb s3://curriculum-alignment-backups --region us-east-1

aws s3api put-bucket-versioning \
  --bucket curriculum-alignment-backups \
  --versioning-configuration Status=Enabled

# Set lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket curriculum-alignment-backups \
  --lifecycle-configuration file://backup-lifecycle.json
```

#### KMS Encryption Key
```bash
# Create KMS key for backup encryption
aws kms create-alias \
  --alias-name alias/curriculum-alignment-backup \
  --target-key-id $(aws kms create-key \
    --description "Curriculum Alignment Backup Encryption" \
    --query KeyMetadata.KeyId --output text)
```

#### SNS Notification Topics
```bash
# Create notification topics
aws sns create-topic --name curriculum-alignment-backup-alerts
aws sns create-topic --name curriculum-alignment-restore-alerts

# Subscribe email endpoints
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:curriculum-alignment-backup-alerts \
  --protocol email \
  --notification-endpoint admin@example.com
```

## Advanced Features

### Automated Scheduling

#### Cron Setup
```bash
# Edit crontab
crontab -e

# Daily full backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh production full >> /var/log/curriculum-backup-cron.log 2>&1

# Hourly database backup during business hours
0 9-17 * * 1-5 /path/to/scripts/backup.sh production database >> /var/log/curriculum-backup-cron.log 2>&1

# Weekly document backup on Sundays
0 1 * * 0 /path/to/scripts/backup.sh production documents >> /var/log/curriculum-backup-cron.log 2>&1
```

#### AWS EventBridge (CloudWatch Events)
```yaml
# CloudFormation template for automated backups
BackupScheduleRule:
  Type: AWS::Events::Rule
  Properties:
    Description: "Daily backup schedule"
    ScheduleExpression: "cron(0 2 * * ? *)"
    State: ENABLED
    Targets:
      - Arn: !GetAtt BackupLambdaFunction.Arn
        Id: "BackupTarget"
        Input: |
          {
            "environment": "production",
            "backup_type": "full"
          }
```

### Cross-Region Replication

#### Setup Replication
```bash
# Enable cross-region replication for disaster recovery
aws s3api put-bucket-replication \
  --bucket curriculum-alignment-backups \
  --replication-configuration file://replication-config.json
```

#### Replication Configuration
```json
{
  "Role": "arn:aws:iam::123456789012:role/replication-role",
  "Rules": [
    {
      "ID": "curriculum-backup-replication",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::curriculum-alignment-backups-replica",
        "StorageClass": "GLACIER"
      }
    }
  ]
}
```

### Point-in-Time Recovery

#### Database Point-in-Time Recovery
```bash
# Create point-in-time recovery backup
./backup.sh production database

# Restore to specific point in time
./restore.sh production curriculum-alignment-production-database-20231201_120000 database

# Verify restore with timestamp check
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT MAX(updated_at) FROM audit_logs;"
```

### Backup Verification

#### Automated Verification
```bash
# The backup script automatically verifies:
# 1. Database backup integrity using pg_restore --list
# 2. Archive integrity using tar -tzf
# 3. Encryption success by attempting decryption
# 4. S3 upload verification with checksums
```

#### Manual Verification
```bash
# Download and verify specific backup
aws s3 cp s3://curriculum-alignment-backups/production/full/2023/12/01/backup_manifest.json .

# Check backup manifest
jq '.' backup_manifest.json

# Verify database backup
pg_restore --list backup_file.custom | head -20
```

## Monitoring and Alerting

### Backup Monitoring

#### CloudWatch Metrics
```bash
# Custom metrics sent during backup process
aws cloudwatch put-metric-data \
  --namespace "CurriculumAlignment/Backup" \
  --metric-data \
    MetricName=BackupDuration,Value=1800,Unit=Seconds \
    MetricName=BackupSize,Value=5368709120,Unit=Bytes \
    MetricName=BackupSuccess,Value=1,Unit=Count
```

#### Dashboard Setup
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["CurriculumAlignment/Backup", "BackupSuccess"],
          [".", "BackupDuration"],
          [".", "BackupSize"]
        ],
        "period": 3600,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Backup Metrics"
      }
    }
  ]
}
```

### Alerting Rules

#### Backup Failure Alert
```bash
# Create CloudWatch alarm for backup failures
aws cloudwatch put-metric-alarm \
  --alarm-name "CurriculumAlignment-BackupFailure" \
  --alarm-description "Backup process failed" \
  --metric-name BackupSuccess \
  --namespace CurriculumAlignment/Backup \
  --statistic Sum \
  --period 86400 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:backup-alerts
```

#### Backup Size Alert
```bash
# Alert on unusually small backup sizes (may indicate failure)
aws cloudwatch put-metric-alarm \
  --alarm-name "CurriculumAlignment-BackupSizeAnomaly" \
  --alarm-description "Backup size significantly smaller than expected" \
  --metric-name BackupSize \
  --namespace CurriculumAlignment/Backup \
  --statistic Average \
  --period 86400 \
  --threshold 1073741824 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:backup-alerts
```

## Disaster Recovery Procedures

### Complete System Recovery

#### Production Disaster Recovery
```bash
# 1. Create new database instance
aws rds create-db-instance \
  --db-instance-identifier curriculum-alignment-recovery \
  --db-instance-class db.r5.large \
  --engine postgres \
  --engine-version 15.3

# 2. Restore latest backup
./restore.sh production latest full --no-pre-backup

# 3. Update DNS/Load Balancer to point to recovery instance

# 4. Verify system functionality
curl -f https://api.curriculum-alignment.com/health
```

#### Cross-Region Recovery
```bash
# 1. Switch to backup region
export AWS_REGION=us-west-2
export S3_BACKUP_BUCKET=curriculum-alignment-backups-replica

# 2. Restore from replicated backup
./restore.sh production latest full
```

### Recovery Testing

#### Monthly DR Test
```bash
#!/bin/bash
# Monthly disaster recovery test script

# Create test environment
./backup.sh production full
./restore.sh dr-test latest full --no-confirm

# Run verification tests
cd tests/smoke
npm test -- --env dr-test

# Generate DR test report
echo "DR Test completed successfully at $(date)" >> dr-test-log.txt
```

## Security Considerations

### Encryption at Rest
- All backups encrypted with AWS KMS
- Customer-managed encryption keys
- Key rotation enabled automatically

### Encryption in Transit
- S3 transfers use HTTPS/TLS 1.2+
- Database connections use SSL
- AWS API calls encrypted

### Access Control
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:role/BackupRole"},
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::curriculum-alignment-backups/*"
    }
  ]
}
```

### Audit Logging
- All backup/restore operations logged
- CloudTrail integration for API calls
- SNS notifications for all activities

## Troubleshooting

### Common Issues

#### Backup Failures

**Database Connection Timeout**
```bash
# Check database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Verify credentials in AWS Systems Manager
aws ssm get-parameter --name /curriculum-alignment/production/db/host
```

**S3 Access Denied**
```bash
# Check S3 bucket permissions
aws s3 ls s3://curriculum-alignment-backups --profile curriculum-alignment

# Verify IAM role permissions
aws sts get-caller-identity --profile curriculum-alignment
```

**Disk Space Issues**
```bash
# Check available disk space
df -h /tmp

# Clean up old temporary files
find /tmp -name "curriculum-*" -mtime +1 -delete
```

#### Restore Issues

**Pre-restore Backup Failed**
```bash
# Skip pre-restore backup if necessary
./restore.sh production backup_name database --no-pre-backup
```

**Database Restore Validation Failed**
```bash
# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Manual validation
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM information_schema.tables;"
```

### Performance Optimization

#### Parallel Processing
```bash
# Increase parallel jobs for large databases
export PARALLEL_JOBS=8
./backup.sh production database
```

#### Compression Optimization
```bash
# Balance between compression ratio and speed
export COMPRESSION_LEVEL=3  # Faster, larger files
export COMPRESSION_LEVEL=9  # Slower, smaller files
```

## Maintenance

### Regular Tasks

#### Weekly
- Verify backup completeness
- Check disk space on backup systems
- Review backup/restore logs
- Test restore process on non-critical environments

#### Monthly
- Full disaster recovery test
- Review and update retention policies
- Audit backup access logs
- Update backup scripts and documentation

#### Quarterly
- Review backup strategy and requirements
- Update encryption keys (if manual rotation)
- Performance optimization review
- Disaster recovery plan updates

### Backup Hygiene

#### Retention Management
```bash
# Adjust retention policies based on requirements
export BACKUP_RETENTION_DAYS=90  # 3 months for production
export BACKUP_RETENTION_DAYS=30  # 1 month for staging
export BACKUP_RETENTION_DAYS=7   # 1 week for development
```

#### Storage Cost Optimization
```bash
# Use appropriate S3 storage classes
# Standard -> Standard-IA -> Glacier -> Deep Archive

# Example lifecycle policy
{
  "Rules": [
    {
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

## Support and Documentation

### Log Files
- Backup logs: `/var/log/curriculum-backup.log`
- Restore logs: `/var/log/curriculum-restore-*.log`
- Cron logs: `/var/log/curriculum-backup-cron.log`

### Contact Information
- **Operations Team**: ops@curriculum-alignment.com
- **Emergency Contact**: +1-555-BACKUP (24/7)
- **Documentation**: https://docs.curriculum-alignment.com/backup

### Related Documentation
- [Database Administration Guide](./Database-README.md)
- [Disaster Recovery Plan](./DR-README.md)
- [Security Policies](./Security-README.md)