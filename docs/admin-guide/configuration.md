# Configuration Management Guide

This guide covers system configuration, environment setup, and configuration management for the MACAS system.

## Environment Configuration

### 🌍 Environment Variables

**Core Application Settings:**
```bash
# Application Environment
NODE_ENV=production
PORT=3001
API_PORT=3002

# Database Configuration
DATABASE_URL=postgresql://macas_user:secure_password@db-cluster.cluster-xyz.us-east-1.rds.amazonaws.com:5432/macas
DB_HOST=db-cluster.cluster-xyz.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=macas
DB_USER=macas_user
DB_PASSWORD=secure_password
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis Configuration
REDIS_URL=redis://macas-cache.xyz.cache.amazonaws.com:6379
REDIS_HOST=macas-cache.xyz.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# Message Queue (RabbitMQ)
RABBITMQ_URL=amqp://macas_user:rabbitmq_password@rabbitmq.internal:5672
RABBITMQ_HOST=rabbitmq.internal
RABBITMQ_PORT=5672
RABBITMQ_USER=macas_user
RABBITMQ_PASSWORD=rabbitmq_password
RABBITMQ_VHOST=/macas

# File Storage (AWS S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_DOCUMENTS=macas-documents-prod
S3_BUCKET_REPORTS=macas-reports-prod
S3_BUCKET_BACKUPS=macas-backups-prod
```

**AI/ML Service Configuration:**
```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_MODEL_GPT4=gpt-4-turbo-preview
OPENAI_MODEL_GPT35=gpt-3.5-turbo
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4000

# Google AI Platform
GOOGLE_AI_API_KEY=AIza...
GOOGLE_PROJECT_ID=macas-ai-project
GOOGLE_AI_LOCATION=us-central1

# Azure OpenAI Service
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://macas-openai.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

**Authentication and Security:**
```bash
# JWT Configuration
JWT_SECRET=ultra-secure-jwt-secret-key-2024
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=ultra-secure-session-secret-2024
SESSION_TIMEOUT=1800000
SESSION_SECURE=true
SESSION_SAME_SITE=strict

# OAuth/SSO Configuration
CEU_SSO_CLIENT_ID=macas-production
CEU_SSO_CLIENT_SECRET=sso-client-secret
CEU_SSO_CALLBACK_URL=https://curriculum-alignment.ceu.edu/auth/callback
CEU_SSO_AUTHORIZATION_URL=https://sso.ceu.edu/oauth/authorize
CEU_SSO_TOKEN_URL=https://sso.ceu.edu/oauth/token
CEU_SSO_USER_INFO_URL=https://sso.ceu.edu/api/user

# API Security
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
API_KEY_ADMIN=admin-api-key-2024
API_KEY_USER=user-api-key-2024
```

**Monitoring and Logging:**
```bash
# Application Monitoring
APP_LOG_LEVEL=info
APP_LOG_FORMAT=json
APP_LOG_FILE=/var/log/macas/application.log

# Metrics Collection
METRICS_ENABLED=true
METRICS_PORT=9090
PROMETHEUS_ENDPOINT=/metrics

# External Monitoring Services
NEW_RELIC_LICENSE_KEY=...
NEW_RELIC_APP_NAME=MACAS-Production
DATADOG_API_KEY=...
DATADOG_APP_KEY=...

# Error Tracking
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
```

### 📁 Configuration File Structure

**Main Configuration Directory:**
```
/etc/macas/
├── config/
│   ├── production.json
│   ├── staging.json
│   ├── development.json
│   └── test.json
├── ssl/
│   ├── certificate.pem
│   ├── private-key.pem
│   └── ca-bundle.pem
├── secrets/
│   ├── database.env
│   ├── api-keys.env
│   ├── oauth.env
│   └── monitoring.env
└── nginx/
    ├── nginx.conf
    ├── ssl.conf
    └── upstream.conf
```

**Production Configuration (production.json):**
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3001,
    "ssl": {
      "enabled": true,
      "cert": "/etc/macas/ssl/certificate.pem",
      "key": "/etc/macas/ssl/private-key.pem"
    }
  },
  "database": {
    "host": "${DB_HOST}",
    "port": 5432,
    "database": "${DB_NAME}",
    "username": "${DB_USER}",
    "password": "${DB_PASSWORD}",
    "ssl": true,
    "pool": {
      "min": 5,
      "max": 20,
      "acquireTimeoutMillis": 30000,
      "idleTimeoutMillis": 30000
    },
    "retry": {
      "max": 3,
      "delay": 1000
    }
  },
  "redis": {
    "host": "${REDIS_HOST}",
    "port": 6379,
    "password": "${REDIS_PASSWORD}",
    "database": 0,
    "retryDelayOnFailover": 100,
    "maxRetriesPerRequest": 3
  },
  "storage": {
    "provider": "aws-s3",
    "region": "${AWS_REGION}",
    "buckets": {
      "documents": "${S3_BUCKET_DOCUMENTS}",
      "reports": "${S3_BUCKET_REPORTS}",
      "backups": "${S3_BUCKET_BACKUPS}"
    }
  },
  "ai": {
    "providers": {
      "openai": {
        "apiKey": "${OPENAI_API_KEY}",
        "model": "gpt-4-turbo-preview",
        "maxTokens": 4000,
        "temperature": 0.7
      },
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}",
        "model": "claude-3-sonnet-20240229",
        "maxTokens": 4000
      }
    },
    "defaultProvider": "openai",
    "timeout": 60000,
    "retries": 2
  },
  "security": {
    "jwt": {
      "secret": "${JWT_SECRET}",
      "expiresIn": "24h",
      "refreshExpiresIn": "7d"
    },
    "rateLimiting": {
      "api": {
        "windowMs": 900000,
        "max": 100
      },
      "auth": {
        "windowMs": 900000,
        "max": 5
      }
    },
    "cors": {
      "origin": [
        "https://curriculum-alignment.ceu.edu",
        "https://admin.curriculum-alignment.ceu.edu"
      ],
      "credentials": true
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "port": 9090,
      "endpoint": "/metrics"
    },
    "logging": {
      "level": "info",
      "format": "json",
      "file": "/var/log/macas/application.log",
      "maxFiles": 7,
      "maxSize": "100MB"
    },
    "health": {
      "endpoint": "/health",
      "checks": ["database", "redis", "storage", "ai-providers"]
    }
  }
}
```

## Application Configuration

### 🔧 Service Configuration

**Backend API Configuration:**
```javascript
// backend/config/production.js
module.exports = {
  port: process.env.API_PORT || 3002,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://curriculum-alignment.ceu.edu'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.csv'],
    storage: 's3',
    tempPath: '/tmp/uploads'
  },
  analysis: {
    timeout: 300000, // 5 minutes
    maxConcurrent: 5,
    retries: 2,
    queue: 'analysis-queue'
  }
};
```

**Frontend Application Configuration:**
```javascript
// frontend/src/config/production.js
export const config = {
  apiUrl: 'https://api.curriculum-alignment.ceu.edu/v1',
  websocketUrl: 'wss://api.curriculum-alignment.ceu.edu/ws',
  auth: {
    ssoEnabled: true,
    ssoUrl: 'https://sso.ceu.edu',
    tokenKey: 'macas_token',
    refreshKey: 'macas_refresh_token'
  },
  features: {
    enableBetaFeatures: false,
    enableDebugMode: false,
    enableAnalytics: true,
    maxFileUploadSize: 50 * 1024 * 1024
  },
  ui: {
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/Budapest'
  },
  monitoring: {
    errorTracking: true,
    performanceTracking: true,
    userAnalytics: true
  }
};
```

### 🐳 Docker Configuration

**Production Docker Compose Override:**
```yaml
# docker-compose.prod.override.yml
version: '3.8'

services:
  frontend:
    image: macas/frontend:${TAG:-latest}
    environment:
      - REACT_APP_API_URL=https://api.curriculum-alignment.ceu.edu/v1
      - REACT_APP_WS_URL=wss://api.curriculum-alignment.ceu.edu/ws
      - REACT_APP_SSO_URL=https://sso.ceu.edu
      - REACT_APP_ENVIRONMENT=production
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  backend:
    image: macas/backend:${TAG:-latest}
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  nginx:
    image: nginx:alpine
    volumes:
      - /etc/macas/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/macas/ssl:/etc/ssl/certs:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    deploy:
      replicas: 2
```

## Infrastructure Configuration

### ☁️ AWS Configuration

**IAM Policies and Roles:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::macas-documents-prod",
        "arn:aws:s3:::macas-documents-prod/*",
        "arn:aws:s3:::macas-reports-prod",
        "arn:aws:s3:::macas-reports-prod/*"
      ]
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SESEmailSending",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

**VPC and Networking Configuration:**
```bash
# VPC Configuration
VPC_CIDR=10.0.0.0/16
PUBLIC_SUBNET_1=10.0.1.0/24
PUBLIC_SUBNET_2=10.0.2.0/24
PRIVATE_SUBNET_1=10.0.10.0/24
PRIVATE_SUBNET_2=10.0.20.0/24
DB_SUBNET_1=10.0.100.0/24
DB_SUBNET_2=10.0.200.0/24

# Security Groups
WEB_SG=sg-web-tier
APP_SG=sg-app-tier
DB_SG=sg-database-tier
CACHE_SG=sg-cache-tier

# Load Balancer
ALB_NAME=macas-production-alb
ALB_SCHEME=internet-facing
ALB_SUBNETS=subnet-pub1,subnet-pub2
```

### 🔐 SSL/TLS Configuration

**Nginx SSL Configuration:**
```nginx
# /etc/macas/nginx/ssl.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/macas/ssl/ca-bundle.pem;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:; font-src 'self' data:;" always;
```

## Configuration Management

### 📝 Version Control

**Configuration Repository Structure:**
```
macas-config/
├── environments/
│   ├── production/
│   ├── staging/
│   └── development/
├── ansible/
│   ├── playbooks/
│   ├── roles/
│   └── inventory/
├── terraform/
│   ├── modules/
│   ├── environments/
│   └── shared/
└── scripts/
    ├── deploy.sh
    ├── backup-config.sh
    └── restore-config.sh
```

**Configuration Deployment Script:**
```bash
#!/bin/bash
# /etc/macas/scripts/deploy-config.sh

set -euo pipefail

ENVIRONMENT=${1:-production}
CONFIG_REPO="/opt/macas-config"
CONFIG_DIR="/etc/macas"
BACKUP_DIR="/var/backups/macas-config"

echo "Deploying configuration for environment: $ENVIRONMENT"

# Create backup of current configuration
mkdir -p "$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)"
cp -r "$CONFIG_DIR" "$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)/"

# Update configuration repository
cd "$CONFIG_REPO"
git fetch origin
git checkout "release/$ENVIRONMENT"
git pull origin "release/$ENVIRONMENT"

# Deploy configuration files
rsync -av --delete "$CONFIG_REPO/environments/$ENVIRONMENT/" "$CONFIG_DIR/"

# Set proper permissions
chown -R macas:macas "$CONFIG_DIR"
chmod 600 "$CONFIG_DIR/secrets/"*
chmod 644 "$CONFIG_DIR/config/"*

# Validate configuration
echo "Validating configuration..."
/opt/macas/bin/validate-config.js --env="$ENVIRONMENT"

# Restart services if validation passes
if [ $? -eq 0 ]; then
    echo "Configuration validation successful. Restarting services..."
    systemctl reload nginx
    docker-compose restart backend
    echo "Configuration deployment completed successfully."
else
    echo "Configuration validation failed. Rolling back..."
    # Rollback logic here
    exit 1
fi
```

### 🔄 Configuration Updates

**Hot Configuration Reload:**
```javascript
// backend/src/config/manager.js
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.configPath = process.env.CONFIG_FILE || '/etc/macas/config/production.json';
    this.config = this.loadConfig();
    this.watchConfig();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      process.exit(1);
    }
  }

  watchConfig() {
    fs.watchFile(this.configPath, (curr, prev) => {
      console.log('Configuration file changed, reloading...');
      try {
        const newConfig = this.loadConfig();
        this.config = newConfig;
        this.emit('configChanged', newConfig);
        console.log('Configuration reloaded successfully');
      } catch (error) {
        console.error('Failed to reload configuration:', error);
      }
    });
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
  }

  reload() {
    this.config = this.loadConfig();
    this.emit('configChanged', this.config);
  }
}

module.exports = new ConfigManager();
```

### 🔍 Configuration Validation

**Configuration Validation Script:**
```javascript
#!/usr/bin/env node
// /opt/macas/bin/validate-config.js

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const schema = {
  type: 'object',
  required: ['server', 'database', 'redis', 'storage', 'ai', 'security', 'monitoring'],
  properties: {
    server: {
      type: 'object',
      required: ['host', 'port'],
      properties: {
        host: { type: 'string' },
        port: { type: 'integer', minimum: 1, maximum: 65535 }
      }
    },
    database: {
      type: 'object',
      required: ['host', 'port', 'database', 'username'],
      properties: {
        host: { type: 'string' },
        port: { type: 'integer' },
        database: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' }
      }
    },
    redis: {
      type: 'object',
      required: ['host', 'port'],
      properties: {
        host: { type: 'string' },
        port: { type: 'integer' }
      }
    },
    security: {
      type: 'object',
      required: ['jwt'],
      properties: {
        jwt: {
          type: 'object',
          required: ['secret', 'expiresIn'],
          properties: {
            secret: { type: 'string', minLength: 32 },
            expiresIn: { type: 'string' }
          }
        }
      }
    }
  }
};

function validateConfig(configPath) {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    
    const validate = ajv.compile(schema);
    const valid = validate(config);
    
    if (!valid) {
      console.error('Configuration validation failed:');
      validate.errors.forEach(error => {
        console.error(`  - ${error.instancePath}: ${error.message}`);
      });
      return false;
    }
    
    console.log('Configuration validation passed');
    return true;
  } catch (error) {
    console.error('Configuration validation error:', error.message);
    return false;
  }
}

const environment = process.argv[2]?.replace('--env=', '') || 'production';
const configPath = `/etc/macas/config/${environment}.json`;

if (!validateConfig(configPath)) {
  process.exit(1);
}
```

---

This configuration management guide provides comprehensive coverage of system configuration, environment setup, and configuration lifecycle management for the MACAS system.