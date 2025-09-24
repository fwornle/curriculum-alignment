# MACAS System Administration Guide

This comprehensive guide provides system administrators with everything needed to deploy, configure, monitor, and maintain the Multi-Agent Curriculum Alignment System (MACAS) in production environments.

## Table of Contents

1. [Installation and Deployment](./installation.md) - System installation and initial setup
2. [Configuration Management](./configuration.md) - System configuration and environment setup
3. [User Management](./user-management.md) - User accounts, roles, and permissions
4. [System Monitoring](./monitoring.md) - Performance monitoring and alerting
5. [Database Administration](./database.md) - Database setup, backup, and maintenance
6. [Security Management](./security.md) - Security configuration and compliance
7. [Backup and Recovery](./backup-recovery.md) - Data protection and disaster recovery
8. [Troubleshooting](./troubleshooting.md) - Common issues and resolution procedures
9. [Maintenance Procedures](./maintenance.md) - Routine maintenance and updates
10. [API Management](./api-management.md) - API configuration and monitoring
11. [Integration Management](./integrations.md) - External system integrations
12. [Performance Tuning](./performance.md) - System optimization and scaling

## Administrator Overview

### 🔧 System Architecture

MACAS is a distributed system built on modern cloud-native architecture:

**Core Components:**
- **Web Application**: React frontend with Node.js backend
- **API Gateway**: RESTful API with authentication and rate limiting
- **Analysis Engine**: Multi-agent AI system for curriculum analysis
- **Document Processor**: AI-powered document extraction and processing
- **Report Generator**: Automated report creation and formatting
- **Database**: PostgreSQL with Redis caching
- **Message Queue**: RabbitMQ for asynchronous processing
- **File Storage**: AWS S3 for document and report storage

**Infrastructure:**
- **Deployment**: AWS CloudFormation and Docker containers
- **Load Balancing**: Application Load Balancer (ALB)
- **Auto Scaling**: EC2 Auto Scaling Groups
- **Monitoring**: CloudWatch, Prometheus, Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **CDN**: CloudFront for global content delivery

### 🎯 Administrative Responsibilities

**Daily Operations:**
- Monitor system health and performance metrics
- Review error logs and resolve issues
- Manage user accounts and permissions
- Monitor backup completion status
- Review security alerts and incidents

**Weekly Tasks:**
- Performance analysis and optimization
- Security patch review and deployment
- Database maintenance and optimization
- Capacity planning and resource monitoring
- User access audit and cleanup

**Monthly Activities:**
- System backup verification and testing
- Security audit and compliance review
- Performance trend analysis
- Infrastructure cost optimization
- Documentation updates and reviews

### 🚀 Quick Start for New Administrators

#### Prerequisites
- AWS account with appropriate permissions
- Docker and Docker Compose installed
- PostgreSQL client tools
- Basic knowledge of Linux system administration
- Understanding of web application architecture

#### Initial System Access
1. **AWS Console Access**: Contact DevOps team for AWS console credentials
2. **SSH Access**: Set up SSH keys for EC2 instance access
3. **Database Access**: Configure database client with read-only credentials
4. **Monitoring Access**: Set up Grafana and Kibana dashboard access
5. **API Access**: Generate administrative API keys for system management

#### Essential Commands
```bash
# Check system status
curl -H "X-API-Key: $ADMIN_API_KEY" https://api.curriculum-alignment.ceu.edu/v1/status

# View application logs
docker logs macas-backend --tail 100 -f

# Check database connections
psql -h $DB_HOST -U $DB_USER -d macas -c "SELECT count(*) FROM programs;"

# Monitor system resources
top
df -h
free -m

# Check service status
systemctl status docker
systemctl status nginx
```

## System Requirements

### 🖥️ Production Environment

**Minimum Requirements:**
- **CPU**: 8 vCPUs (Intel Xeon or AMD EPYC)
- **RAM**: 32 GB RAM
- **Storage**: 500 GB SSD (primary) + 2 TB (document storage)
- **Network**: 1 Gbps connection with low latency
- **OS**: Ubuntu 20.04 LTS or Amazon Linux 2

**Recommended Production Setup:**
- **CPU**: 16 vCPUs across multiple instances
- **RAM**: 64 GB RAM per instance
- **Storage**: 1 TB NVMe SSD + S3 for document storage
- **Database**: RDS PostgreSQL with Multi-AZ deployment
- **Caching**: ElastiCache Redis cluster
- **Load Balancer**: Application Load Balancer with SSL termination

### 🔐 Security Requirements

**Authentication and Authorization:**
- Integration with CEU Single Sign-On (SSO)
- Multi-factor authentication (MFA) for administrators
- Role-based access control (RBAC)
- API key management with proper scoping

**Data Protection:**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Regular security audits and vulnerability scans
- GDPR and FERPA compliance measures

**Network Security:**
- VPC with proper subnet isolation
- Security groups with least-privilege access
- WAF (Web Application Firewall) configuration
- DDoS protection through CloudFlare or AWS Shield

### 📊 Monitoring and Alerting

**System Metrics:**
- CPU, memory, and disk utilization
- Network I/O and latency metrics
- Application response times
- Database performance indicators
- Queue depth and processing rates

**Application Metrics:**
- User activity and session statistics
- API request rates and error rates
- Analysis execution times and success rates
- Document processing metrics
- Report generation statistics

**Alert Thresholds:**
- CPU usage > 80% for 5 minutes
- Memory usage > 85% for 5 minutes
- Disk usage > 90%
- Application response time > 2 seconds
- Error rate > 5% over 10 minutes
- Database connection pool exhaustion

## Emergency Procedures

### 🚨 Critical Issue Response

**Severity Levels:**
- **P0 - Critical**: System completely down, data loss risk
- **P1 - High**: Major functionality impaired, significant user impact
- **P2 - Medium**: Partial functionality affected, workarounds available
- **P3 - Low**: Minor issues, cosmetic problems

**Emergency Contacts:**
```
Primary On-Call: +36-1-327-3000 ext. 9999
DevOps Team: devops@ceu.edu
Database Admin: dba@ceu.edu
Security Team: security@ceu.edu
Management: director@ceu.edu
```

**Escalation Matrix:**
- **P0**: Immediate notification to all stakeholders
- **P1**: Notification within 15 minutes
- **P2**: Notification within 1 hour
- **P3**: Notification within 4 hours

### 🔧 Quick Recovery Procedures

**System Restart:**
```bash
# Restart application services
docker-compose restart

# Restart individual services
systemctl restart nginx
systemctl restart docker

# Check service status
systemctl status macas-backend
systemctl status macas-frontend
```

**Database Issues:**
```bash
# Check database connectivity
pg_isready -h $DB_HOST -p 5432

# Check active connections
psql -h $DB_HOST -U $DB_USER -d macas -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database (if using local PostgreSQL)
systemctl restart postgresql
```

**Storage Issues:**
```bash
# Check disk space
df -h

# Clean up temporary files
docker system prune -f

# Clear application cache
redis-cli FLUSHALL

# Check S3 connectivity
aws s3 ls s3://macas-documents
```

## Compliance and Governance

### 📋 Compliance Requirements

**Data Protection:**
- **GDPR**: European Union General Data Protection Regulation
- **FERPA**: Family Educational Rights and Privacy Act
- **CCPA**: California Consumer Privacy Act (if applicable)
- **SOC 2**: Service Organization Control 2 compliance

**Security Standards:**
- **ISO 27001**: Information security management
- **NIST Cybersecurity Framework**: Risk management
- **CIS Controls**: Center for Internet Security best practices
- **OWASP**: Web application security guidelines

**Educational Standards:**
- **EDUCAUSE**: Higher education IT governance
- **IMS Global**: Educational technology interoperability
- **QAA**: Quality Assurance Agency guidelines (where applicable)

### 📊 Audit and Reporting

**Audit Logs:**
- User authentication and authorization events
- Data access and modification logs
- System configuration changes
- Security incidents and responses
- Performance and availability metrics

**Compliance Reports:**
- Monthly security assessment reports
- Quarterly compliance status reports
- Annual penetration testing results
- Data processing impact assessments
- Business continuity plan updates

## Support and Documentation

### 📚 Additional Resources

**Internal Documentation:**
- System architecture diagrams
- Network topology documentation
- Database schema documentation
- API documentation and specifications
- Runbook procedures and checklists

**External Resources:**
- AWS Well-Architected Framework
- PostgreSQL administration guides
- Docker deployment best practices
- Kubernetes operations (if applicable)
- Security incident response procedures

### 🤝 Support Channels

**Internal Support:**
- **IT Help Desk**: +36-1-327-3000 ext. 2500
- **DevOps Team**: devops@ceu.edu
- **Database Team**: dba@ceu.edu
- **Security Team**: security@ceu.edu

**External Support:**
- **AWS Support**: Enterprise support plan
- **Database Vendor**: PostgreSQL community support
- **Security Vendor**: Third-party security service provider
- **Development Team**: external contractor support (if applicable)

### 📋 Change Management

**Change Process:**
1. **Change Request**: Submit detailed change request with impact analysis
2. **Review and Approval**: Technical review and management approval
3. **Testing**: Validate changes in staging environment
4. **Implementation**: Execute changes during maintenance window
5. **Verification**: Confirm successful implementation
6. **Documentation**: Update relevant documentation and procedures

**Maintenance Windows:**
- **Regular Maintenance**: Sunday 2:00-4:00 AM CET
- **Emergency Maintenance**: As needed with minimal notice
- **Major Updates**: Scheduled quarterly with advance notice

---

## Getting Started

New system administrators should begin with:

1. **[Installation and Deployment Guide](./installation.md)** - Set up development and production environments
2. **[Configuration Management](./configuration.md)** - Configure system settings and integrations
3. **[User Management](./user-management.md)** - Set up user accounts and permissions
4. **[System Monitoring](./monitoring.md)** - Configure monitoring and alerting systems

For immediate support or emergency issues, contact the on-call administrator at +36-1-327-3000 ext. 9999.

---

*This administrator guide is maintained by the CEU DevOps team and is updated regularly to reflect current system configuration and best practices. Last updated: March 2024*