# CloudFront CDN Configuration

This document describes the CloudFront Content Delivery Network (CDN) setup for the Curriculum Alignment System.

## Overview

The CloudFront distribution provides global content delivery for:
- React frontend application (static website)
- API documentation and curriculum documents
- Enhanced security, caching, and performance optimization

## Architecture

### Origins
1. **Static Website Origin**: S3 bucket hosting the React application
2. **Documents Origin**: S3 bucket containing API docs and curriculum files

### Cache Behaviors
- **Default (`/*`)**: React app with SPA routing support
- **Static Assets (`/static/*`)**: Long-term caching for CSS, JS, images
- **API Documentation (`/docs/*`)**: Medium-term caching for documentation
- **Service Worker (`/sw.js`)**: No caching for PWA functionality

### Security Features
- Origin Access Control (OAC) for S3 bucket security
- Security headers policy (HSTS, CSP, X-Frame-Options)
- Web Application Firewall (WAF) for production
- SSL/TLS encryption with modern protocols

## Files

### Infrastructure
- `infrastructure/cloudfront-distribution.yaml`: CloudFormation template
- `scripts/setup-cloudfront.sh`: Deployment and management script

### Configuration Components
1. **Cache Policies**: Optimized caching for different content types
2. **Origin Request Policies**: Header forwarding configuration
3. **Response Headers Policies**: Security and custom headers
4. **Web ACL**: WAF rules for production security

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- S3 buckets deployed (run `npm run s3:setup` first)
- CloudFormation service permissions

### Commands

```bash
# Deploy CloudFront distribution
npm run cloudfront:setup

# Test distribution
npm run cloudfront:test

# View distribution information
npm run cloudfront:info

# Invalidate cache
npm run cloudfront:invalidate

# Setup monitoring
npm run cloudfront:monitor
```

### Environment Variables (Optional)
```bash
# For custom domain
export CLOUDFRONT_DOMAIN_NAME="app.curriculum-alignment.ceu.edu"
export CLOUDFRONT_CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789012:certificate/example"

# Environment-specific settings
export NODE_ENV="dev|staging|prod"
export AWS_REGION="eu-central-1"
```

## Cache Configuration

### React Application (Default)
- **TTL**: 1 day default, 1 year max
- **Compression**: Enabled (Gzip, Brotli)
- **SPA Support**: 403/404 → index.html

### Static Assets (/static/*)
- **TTL**: 1 year (immutable)
- **Compression**: Enabled
- **Headers**: Cache-Control with immutable flag

### API Documentation (/docs/*)
- **TTL**: 1 hour default, 1 day max
- **Compression**: Enabled
- **Headers**: Standard caching headers

### Service Worker (/sw.js)
- **TTL**: No caching (always fresh)
- **Compression**: Disabled
- **Headers**: No-cache directives

## Security Features

### Origin Access Control (OAC)
- Replaces legacy Origin Access Identity (OAI)
- Supports all S3 features including SSE-KMS
- Automatic S3 bucket policy updates

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
```

### Web Application Firewall (Production)
- Rate limiting (2000 requests/IP/5min)
- AWS Managed Rules (Core Rule Set)
- Known Bad Inputs protection
- Geographic restrictions (configurable)

## Monitoring and Alerts

### CloudWatch Metrics
- 4xx/5xx error rates
- Origin latency
- Cache hit ratio
- Request count and data transfer

### Alarms
- High error rate (>5% for 10 minutes)
- High origin latency (>1000ms for 15 minutes)
- Automatic SNS notifications

### Logging
- Access logs to S3 (production only)
- Real-time logs (optional)
- WAF logs for security analysis

## Custom Domain Setup

### SSL Certificate
1. Request certificate in **us-east-1** (required for CloudFront)
2. Validate domain ownership
3. Set `CLOUDFRONT_CERTIFICATE_ARN` environment variable

### DNS Configuration
```
CNAME: app.curriculum-alignment.ceu.edu → d123456789.cloudfront.net
```

### Deployment with Custom Domain
```bash
export CLOUDFRONT_DOMAIN_NAME="app.curriculum-alignment.ceu.edu"
export CLOUDFRONT_CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789012:certificate/example"
npm run cloudfront:setup
```

## Performance Optimization

### Compression
- Gzip and Brotli compression enabled
- Automatic content encoding
- 60-80% size reduction for text content

### Edge Locations
- Global distribution network
- Price classes: All (prod), 200 (staging), 100 (dev)
- HTTP/2 and IPv6 support

### Caching Strategy
- Long-term caching for static assets
- Dynamic content with appropriate TTLs
- Service worker bypass for real-time updates

## Troubleshooting

### Common Issues

1. **403 Forbidden Errors**
   - Check S3 bucket policies
   - Verify OAC configuration
   - Ensure content exists in bucket

2. **Slow Updates**
   - CloudFront propagation takes 5-15 minutes
   - Use cache invalidation for immediate updates
   - Check distribution status

3. **Custom Domain Issues**
   - Certificate must be in us-east-1
   - Domain validation required
   - DNS propagation time

### Debugging Commands
```bash
# Check distribution status
aws cloudfront get-distribution --id E1234567890123

# View real-time logs
aws logs filter-log-events --log-group-name /aws/cloudfront/realtime

# Test from different locations
curl -H "CloudFront-Viewer-Country: US" https://your-domain.com
```

## Cost Optimization

### Price Classes
- **PriceClass_100**: US, Europe (cheapest)
- **PriceClass_200**: US, Europe, Asia
- **PriceClass_All**: All edge locations (best performance)

### Data Transfer
- Monitor usage with CloudWatch
- Use appropriate cache TTLs
- Optimize image and asset sizes

## Integration Points

### Frontend (React)
- Static assets served from CloudFront
- API calls to API Gateway (Task 9)
- Service worker for offline functionality

### Backend (Lambda)
- API Gateway behind CloudFront (optional)
- Direct S3 integration for documents
- Real-time features via WebSocket

### CI/CD Pipeline
- Automatic invalidation on deployment
- Build artifacts uploaded to S3
- Health checks and rollback procedures

## Next Steps

1. **Task 8**: Setup AWS Cognito User Pool
2. **Task 9**: Configure API Gateway
3. **Frontend Deployment**: React application
4. **Performance Testing**: Load testing and optimization
5. **Monitoring Setup**: Detailed observability

## References

- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [Origin Access Control](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [Security Headers](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/adding-response-headers.html)
- [WAF v2 Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)