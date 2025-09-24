# Installation and Deployment Guide

This guide provides comprehensive instructions for installing and deploying MACAS in production environments, including prerequisites, configuration, and verification procedures.

## Overview

MACAS uses a modern containerized architecture deployed on AWS infrastructure. The system supports both single-instance development deployments and highly available production clusters.

## Prerequisites

### Hardware Requirements

**Production Environment:**
```
Minimum Configuration:
├── CPU: 8 vCPUs (Intel Xeon or AMD EPYC)
├── RAM: 32 GB
├── Storage: 500 GB SSD + 2 TB for documents
├── Network: 1 Gbps with low latency
└── OS: Ubuntu 20.04 LTS or Amazon Linux 2

Recommended Configuration:
├── CPU: 16 vCPUs across multiple instances
├── RAM: 64 GB per instance
├── Storage: 1 TB NVMe SSD + S3 for document storage
├── Database: RDS PostgreSQL Multi-AZ
├── Cache: ElastiCache Redis cluster
└── Load Balancer: Application Load Balancer
```

**Development Environment:**
```
Minimum Configuration:
├── CPU: 4 vCPUs
├── RAM: 16 GB
├── Storage: 100 GB SSD
└── OS: Ubuntu 20.04 LTS, macOS, or Windows with WSL2
```

### Software Prerequisites

**Required Software:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl (for Kubernetes deployments)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm (for Kubernetes package management)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install PostgreSQL client tools
sudo apt install postgresql-client-12 -y

# Install Redis client tools
sudo apt install redis-tools -y
```

### AWS Account Setup

**Required AWS Services:**
- **EC2**: Virtual machines for application hosting
- **RDS**: Managed PostgreSQL database
- **ElastiCache**: Managed Redis cache
- **S3**: Document and report storage
- **CloudFront**: Content delivery network
- **Application Load Balancer**: Traffic distribution
- **CloudWatch**: Monitoring and logging
- **CloudFormation**: Infrastructure as code
- **IAM**: Identity and access management

**IAM Permissions Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "rds:*",
        "elasticache:*",
        "s3:*",
        "cloudfront:*",
        "elasticloadbalancing:*",
        "cloudwatch:*",
        "logs:*",
        "cloudformation:*",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

## Production Deployment

### Step 1: Infrastructure Deployment

**Using CloudFormation:**
```bash
# Clone the MACAS repository
git clone https://github.com/ceu-edu/macas-deployment.git
cd macas-deployment

# Configure AWS credentials
aws configure

# Deploy infrastructure
cd deploy/prod
./deploy.sh

# Verify deployment
./status.sh
```

**Manual Infrastructure Setup:**
```bash
# Create VPC and subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=MACAS-VPC}]'

# Create public and private subnets
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier macas-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 13.7 \
  --allocated-storage 100 \
  --storage-type gp2 \
  --storage-encrypted \
  --master-username macas \
  --master-user-password "$(openssl rand -base64 32)" \
  --vpc-security-group-ids $DB_SECURITY_GROUP_ID \
  --db-subnet-group-name macas-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az

# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id macas-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name macas-cache-subnet-group \
  --security-group-ids $CACHE_SECURITY_GROUP_ID

# Create S3 buckets
aws s3 mb s3://macas-documents-prod
aws s3 mb s3://macas-reports-prod
aws s3 mb s3://macas-backups-prod
```

### Step 2: Application Deployment

**Docker Compose Production Setup:**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    image: macas/frontend:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api.curriculum-alignment.ceu.edu
    volumes:
      - /etc/ssl/certs:/etc/ssl/certs:ro
    restart: always
    depends_on:
      - backend

  backend:
    image: macas/backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET_DOCUMENTS=${S3_BUCKET_DOCUMENTS}
      - S3_BUCKET_REPORTS=${S3_BUCKET_REPORTS}
    restart: always
    depends_on:
      - analysis-engine

  analysis-engine:
    image: macas/analysis-engine:latest
    environment:
      - QUEUE_URL=${RABBITMQ_URL}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    restart: always
    depends_on:
      - rabbitmq

  document-processor:
    image: macas/document-processor:latest
    environment:
      - QUEUE_URL=${RABBITMQ_URL}
      - DATABASE_URL=${DATABASE_URL}
      - S3_BUCKET_DOCUMENTS=${S3_BUCKET_DOCUMENTS}
    restart: always

  report-generator:
    image: macas/report-generator:latest
    environment:
      - QUEUE_URL=${RABBITMQ_URL}
      - DATABASE_URL=${DATABASE_URL}
      - S3_BUCKET_REPORTS=${S3_BUCKET_REPORTS}
    restart: always

  rabbitmq:
    image: rabbitmq:3.8-management
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    restart: always
    depends_on:
      - frontend
      - backend

volumes:
  rabbitmq_data:
```

**Environment Configuration:**
```bash
# Create production environment file
cat > .env.prod << EOF
# Database Configuration
DATABASE_URL=postgresql://macas:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/macas
REDIS_URL=redis://${ELASTICACHE_ENDPOINT}:6379

# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET_DOCUMENTS=macas-documents-prod
S3_BUCKET_REPORTS=macas-reports-prod

# Application Configuration
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 64)
API_PORT=3001
FRONTEND_URL=https://curriculum-alignment.ceu.edu

# Queue Configuration
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672

# External Integrations
CEU_SSO_CLIENT_ID=${SSO_CLIENT_ID}
CEU_SSO_CLIENT_SECRET=${SSO_CLIENT_SECRET}
CEU_SSO_CALLBACK_URL=https://curriculum-alignment.ceu.edu/auth/callback

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
DATADOG_API_KEY=${DATADOG_API_KEY}
EOF
```

**Deploy Application:**
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Step 3: Database Setup

**Initialize Database:**
```bash
# Connect to RDS instance
export PGPASSWORD=${DB_PASSWORD}
psql -h ${RDS_ENDPOINT} -U macas -d postgres

# Create application database
CREATE DATABASE macas;
CREATE USER macas_app WITH PASSWORD '${APP_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE macas TO macas_app;

# Create read-only user for monitoring
CREATE USER macas_readonly WITH PASSWORD '${READONLY_DB_PASSWORD}';
GRANT CONNECT ON DATABASE macas TO macas_readonly;
GRANT USAGE ON SCHEMA public TO macas_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO macas_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO macas_readonly;
```

**Run Database Migrations:**
```bash
# Run migrations from application container
docker exec macas_backend npm run migrate

# Verify database schema
docker exec macas_backend npm run migrate:status

# Create initial admin user
docker exec macas_backend npm run seed:admin
```

**Database Performance Tuning:**
```sql
-- PostgreSQL performance tuning for MACAS
-- Apply these settings to RDS parameter group

-- Connection settings
max_connections = 200
shared_buffers = '8GB'
effective_cache_size = '24GB'
maintenance_work_mem = '2GB'
checkpoint_completion_target = 0.7
wal_buffers = '16MB'
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = '32MB'
min_wal_size = '1GB'
max_wal_size = '4GB'
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

-- Logging settings
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000
```

### Step 4: SSL Certificate Setup

**Using Let's Encrypt:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d curriculum-alignment.ceu.edu -d api.curriculum-alignment.ceu.edu

# Verify auto-renewal
sudo certbot renew --dry-run

# Update nginx configuration for SSL
sudo nginx -t && sudo systemctl reload nginx
```

**Using AWS Certificate Manager:**
```bash
# Request certificate through ACM
aws acm request-certificate \
  --domain-name curriculum-alignment.ceu.edu \
  --subject-alternative-names api.curriculum-alignment.ceu.edu \
  --validation-method DNS \
  --region us-east-1

# Configure ALB with ACM certificate
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERTIFICATE_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

### Step 5: Load Balancer Configuration

**Application Load Balancer Setup:**
```bash
# Create target group
aws elbv2 create-target-group \
  --name macas-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create load balancer
aws elbv2 create-load-balancer \
  --name macas-alb \
  --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
  --security-groups $ALB_SECURITY_GROUP \
  --scheme internet-facing \
  --type application

# Register targets
aws elbv2 register-targets \
  --target-group-arn $TARGET_GROUP_ARN \
  --targets Id=$INSTANCE_ID_1,Port=3001 Id=$INSTANCE_ID_2,Port=3001
```

**Nginx Load Balancer Configuration:**
```nginx
# /etc/nginx/sites-available/macas
upstream backend {
    least_conn;
    server backend1:3001 max_fails=3 fail_timeout=30s;
    server backend2:3001 max_fails=3 fail_timeout=30s;
}

upstream frontend {
    least_conn;
    server frontend1:80 max_fails=3 fail_timeout=30s;
    server frontend2:80 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen [::]:80;
    server_name curriculum-alignment.ceu.edu;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name curriculum-alignment.ceu.edu;

    ssl_certificate /etc/ssl/certs/curriculum-alignment.ceu.edu.pem;
    ssl_certificate_key /etc/ssl/private/curriculum-alignment.ceu.edu.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location / {
        proxy_pass http://frontend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Development Environment Setup

### Local Development with Docker

**Quick Start:**
```bash
# Clone repository
git clone https://github.com/ceu-edu/macas.git
cd macas

# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

**Development Docker Compose:**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: macas_dev
      POSTGRES_USER: macas
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3.8-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: macas
      RABBITMQ_DEFAULT_PASS: password

volumes:
  postgres_data:
```

### Native Development Setup

**Prerequisites:**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install RabbitMQ
sudo apt install rabbitmq-server -y
```

**Database Setup:**
```bash
# Create database and user
sudo -u postgres createuser -s macas
sudo -u postgres createdb macas_dev -O macas
sudo -u postgres psql -c "ALTER USER macas PASSWORD 'password';"

# Configure PostgreSQL
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Add: local   macas_dev   macas   trust

sudo systemctl restart postgresql
```

## Verification and Testing

### Health Check Verification

**System Health Checks:**
```bash
# Application health check
curl -f https://curriculum-alignment.ceu.edu/api/health

# Database connectivity
psql -h $RDS_ENDPOINT -U macas -d macas -c "SELECT version();"

# Cache connectivity
redis-cli -h $ELASTICACHE_ENDPOINT ping

# Queue connectivity
curl -u $RABBITMQ_USER:$RABBITMQ_PASS http://$RABBITMQ_ENDPOINT:15672/api/overview

# Storage connectivity
aws s3 ls s3://macas-documents-prod
```

**Performance Testing:**
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://curriculum-alignment.ceu.edu/api/health

# Database performance test
pgbench -h $RDS_ENDPOINT -U macas -d macas -T 60 -c 10

# Application stress test
node scripts/stress-test.js --concurrent 50 --duration 300
```

### Smoke Tests

**Automated Deployment Verification:**
```bash
#!/bin/bash
# scripts/verify-deployment.sh

echo "Running deployment verification..."

# Test application endpoints
test_endpoint() {
    local url=$1
    local expected_status=$2
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "$expected_status" ]; then
        echo "✓ $url returned $status"
    else
        echo "✗ $url returned $status, expected $expected_status"
        exit 1
    fi
}

test_endpoint "https://curriculum-alignment.ceu.edu" "200"
test_endpoint "https://curriculum-alignment.ceu.edu/api/health" "200"
test_endpoint "https://curriculum-alignment.ceu.edu/api/status" "200"

# Test authentication
token=$(curl -s -X POST https://curriculum-alignment.ceu.edu/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ceu.edu","password":"'$ADMIN_PASSWORD'"}' \
  | jq -r .data.accessToken)

if [ "$token" != "null" ]; then
    echo "✓ Authentication successful"
else
    echo "✗ Authentication failed"
    exit 1
fi

# Test API functionality
curl -f -H "Authorization: Bearer $token" \
  https://curriculum-alignment.ceu.edu/api/programs > /dev/null

if [ $? -eq 0 ]; then
    echo "✓ API endpoints accessible"
else
    echo "✗ API endpoints not accessible"
    exit 1
fi

echo "All deployment verification tests passed!"
```

## Rollback Procedures

### Application Rollback

**Docker Image Rollback:**
```bash
# List available image tags
docker images macas/backend

# Rollback to previous version
export ROLLBACK_TAG="v1.2.3"
docker-compose pull
docker tag macas/backend:$ROLLBACK_TAG macas/backend:latest
docker-compose up -d

# Verify rollback
docker-compose logs backend
```

**Database Rollback:**
```bash
# Rollback migrations (if needed)
docker exec macas_backend npm run migrate:rollback

# Restore from backup (if needed)
pg_restore -h $RDS_ENDPOINT -U macas -d macas backup_file.dump
```

### Infrastructure Rollback

**CloudFormation Stack Rollback:**
```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name macas-prod

# Monitor rollback progress
aws cloudformation describe-stack-events --stack-name macas-prod
```

This installation guide provides the foundation for deploying MACAS. Continue with [Configuration Management](./configuration.md) for detailed system configuration procedures.