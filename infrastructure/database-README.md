# Database Configuration

This document describes the PostgreSQL database setup for the Curriculum Alignment System using either Supabase or Neon as the provider.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
# Run the interactive setup script
npm run db:setup

# Or directly:
./scripts/setup-database.sh
```

### Option 2: Manual Setup

#### Using Supabase (Recommended)
1. Go to [Supabase](https://supabase.com)
2. Create a new project:
   - Name: `curriculum-alignment-dev`
   - Region: `EU Central (Frankfurt)`
   - Database password: Generate strong password
3. Wait for project to be ready (2-3 minutes)
4. Get connection details from Settings > Database

#### Using Neon
1. Go to [Neon](https://neon.tech)
2. Create a new project:
   - Name: `curriculum-alignment-dev`
   - Database: `curriculum_alignment`
   - Region: `EU Central (Frankfurt)`
3. Copy the connection string from dashboard

## Configuration Files

### 1. Environment Variables (.env.development)
```bash
# Copy from .env.example and update with your values
cp .env.example .env.development

# Required variables:
DATABASE_URL=postgresql://username:password@host:5432/database
DB_POOL_MAX=20
DB_POOL_MIN=2
```

### 2. AWS Secrets Manager
For production, store credentials in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name "curriculum-alignment/dev/database" \
  --description "PostgreSQL database credentials" \
  --secret-string '{
    "host": "your-host",
    "port": "5432",
    "database": "your-database",
    "username": "your-username",
    "password": "your-password",
    "ssl": true,
    "connection_limit": 20,
    "pool_timeout": 30000,
    "idle_timeout": 600000
  }'
```

## Testing Connection

### Basic Test
```bash
npm run db:test
```

### Health Check
```bash
npm run db:health
```

### Manual Test with psql
```bash
psql "postgresql://username:password@host:5432/database" -c "SELECT version();"
```

## Connection Pooling

The system uses connection pooling for optimal performance:

- **Min Connections**: 2
- **Max Connections**: 20 (configurable)
- **Acquire Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes

### Pool Configuration
```typescript
const poolConfig = {
  max: 20,          // Maximum connections
  min: 2,           // Minimum connections
  acquireTimeoutMillis: 30000,   // Connection acquire timeout
  idleTimeoutMillis: 600000,     // Idle connection timeout
  connectionTimeoutMillis: 10000  // Initial connection timeout
};
```

## Database Providers

### Supabase Features
- ✅ Free tier: 500MB storage, 2 concurrent connections
- ✅ Built-in Auth, Storage, and APIs
- ✅ Real-time subscriptions
- ✅ Dashboard and SQL editor
- ✅ Automatic backups
- 🌍 Global CDN

### Neon Features
- ✅ Free tier: 512MB storage, 1GB data transfer
- ✅ Serverless PostgreSQL
- ✅ Branching for development
- ✅ Automatic scaling
- ✅ Point-in-time recovery
- 🚀 Very fast cold starts

## Security Configuration

### SSL/TLS
Always enable SSL for database connections:
```typescript
ssl: {
  rejectUnauthorized: false  // For self-signed certificates
}
```

### Network Security
- Database accessible only from your application
- Use connection pooling to limit connections
- Store credentials in AWS Secrets Manager (production)
- Rotate passwords regularly

## CloudFormation Template

The `database-config.yaml` CloudFormation template creates:

1. **AWS Secrets Manager Secret**: Stores database credentials
2. **Lambda Health Check**: Monitors database connectivity
3. **IAM Roles**: For accessing database credentials

Deploy with:
```bash
aws cloudformation deploy \
  --template-file infrastructure/database-config.yaml \
  --stack-name curriculum-alignment-database-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

## Database Schema

The database schema will be created using migrations (Task 11):
- Users and authentication
- Academic programs and courses
- Curriculum alignment data
- Agent workflow state
- File metadata and processing status

## Monitoring and Logs

### Health Checks
- Automated health checks via Lambda function
- CloudWatch metrics for connection pool status
- Query performance monitoring

### Alerts
Set up CloudWatch alarms for:
- Connection failures
- High query response times
- Pool exhaustion
- Storage usage

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```
   Error: connect ETIMEDOUT
   ```
   - Check network connectivity
   - Verify host and port
   - Check firewall settings

2. **Authentication Failed**
   ```
   Error: password authentication failed
   ```
   - Verify username and password
   - Check database name
   - Ensure user has necessary permissions

3. **SSL Certificate Issues**
   ```
   Error: self signed certificate
   ```
   - Set `ssl: { rejectUnauthorized: false }`
   - Or download proper certificate

4. **Pool Exhaustion**
   ```
   Error: remaining connection slots are reserved
   ```
   - Increase max pool size
   - Check for connection leaks
   - Review query performance

### Debug Commands

```bash
# Test basic connectivity
nc -zv your-host 5432

# Test with psql
psql "postgresql://user:pass@host:5432/db" -c "SELECT 1;"

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name curriculum-alignment-database-dev

# Check AWS Secrets
aws secretsmanager get-secret-value --secret-id curriculum-alignment/dev/database
```

## Performance Optimization

### Query Optimization
- Use connection pooling
- Implement query caching where appropriate
- Add proper indexes (in migrations)
- Monitor slow queries

### Connection Management
- Close connections promptly
- Use transactions for multiple operations
- Monitor pool statistics
- Set appropriate timeouts

## Backup and Recovery

### Automated Backups
- **Supabase**: Automatic daily backups (7-day retention on free tier)
- **Neon**: Point-in-time recovery (7-day retention on free tier)

### Manual Backups
```bash
# Create backup
pg_dump "postgresql://user:pass@host:5432/db" > backup.sql

# Restore backup
psql "postgresql://user:pass@host:5432/db" < backup.sql
```

## Cost Considerations

### Free Tier Limits
- **Supabase**: 500MB storage, 2 concurrent connections
- **Neon**: 512MB storage, 1GB data transfer/month

### Optimization Tips
- Use connection pooling efficiently
- Monitor storage usage
- Implement data archiving for old records
- Use appropriate data types and indexes

## Next Steps

After database configuration:
1. ✅ Task 3: Configure PostgreSQL Database (this task)
2. ⏳ Task 4: Setup Qdrant Vector Database
3. ⏳ Task 5: Initialize AWS SAM Project
4. ⏳ Task 11: Implement PostgreSQL Schema
5. ⏳ Task 12: Create Database Access Layer