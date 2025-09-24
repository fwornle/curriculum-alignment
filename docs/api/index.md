# MACAS API Documentation

Welcome to the Multi-Agent Curriculum Alignment System (MACAS) API documentation. This comprehensive guide provides everything you need to integrate with MACAS programmatically.

## Table of Contents

1. [Getting Started](./getting-started.md) - API access and authentication
2. [API Reference](./api-reference.md) - Complete endpoint documentation
3. [Authentication](./authentication.md) - Security and access control
4. [Programs API](./programs.md) - Program management endpoints
5. [Documents API](./documents.md) - Document upload and processing
6. [Analysis API](./analysis.md) - Curriculum analysis execution
7. [Reports API](./reports.md) - Report generation and retrieval
8. [Users API](./users.md) - User management (admin only)
9. [Webhooks](./webhooks.md) - Event notifications and callbacks
10. [SDKs and Libraries](./sdks.md) - Client libraries and tools
11. [Examples](./examples.md) - Code examples and tutorials
12. [Error Handling](./errors.md) - Error codes and troubleshooting

## API Overview

The MACAS API is a RESTful web service that provides programmatic access to all curriculum alignment features:

### 🔍 **Core Capabilities**
- **Program Management**: Create, update, and manage curriculum programs
- **Document Processing**: Upload and process curriculum documents
- **Multi-Agent Analysis**: Execute sophisticated curriculum analysis
- **Report Generation**: Generate and retrieve professional reports
- **User Administration**: Manage users, roles, and permissions
- **Real-time Monitoring**: Track analysis progress and system status

### 🌐 **API Specifications**
- **Base URL**: `https://api.curriculum-alignment.ceu.edu/v1`
- **Protocol**: HTTPS only (TLS 1.3)
- **Format**: JSON request/response bodies
- **Authentication**: API Keys and OAuth 2.0
- **Rate Limiting**: Tiered limits based on endpoint type
- **Versioning**: URL-based versioning (v1, v2, etc.)

### 📊 **Integration Features**
- **Real-time Status**: WebSocket connections for live updates
- **Bulk Operations**: Batch processing for large datasets
- **Webhook Support**: Event-driven notifications
- **File Upload**: Multipart form data for document upload
- **Streaming**: Large file downloads and report generation
- **Pagination**: Efficient handling of large result sets

## Quick Start

### 1. Get API Access

**For CEU Users**:
1. Log into MACAS dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New API Key**
4. Copy and securely store your API key

**For External Partners**:
1. Contact MACAS support at support@ceu.edu
2. Provide integration requirements and use case
3. Complete partnership agreement
4. Receive OAuth 2.0 credentials

### 2. Make Your First API Call

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/health" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-03-15T10:30:00Z",
  "uptime": 1234567
}
```

### 3. Explore the API

- **Interactive Documentation**: https://api.curriculum-alignment.ceu.edu/docs
- **OpenAPI Specification**: https://api.curriculum-alignment.ceu.edu/openapi.yaml
- **Postman Collection**: Available in the [SDKs section](./sdks.md)

## Authentication Methods

### API Key Authentication (Recommended for most use cases)
```http
GET /v1/programs
Host: api.curriculum-alignment.ceu.edu
X-API-Key: your-api-key-here
Content-Type: application/json
```

### OAuth 2.0 (Required for user-specific actions)
```http
GET /v1/programs
Host: api.curriculum-alignment.ceu.edu
Authorization: Bearer your-oauth-token-here
Content-Type: application/json
```

## Rate Limits

API requests are rate-limited to ensure fair usage and system stability:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| **Authentication** | 100 requests | 15 minutes |
| **Read Operations** | 1000 requests | 1 hour |
| **Write Operations** | 200 requests | 1 hour |
| **Analysis Execution** | 50 requests | 1 hour |
| **Bulk Operations** | 10 requests | 1 hour |
| **Report Generation** | 100 requests | 1 hour |

Rate limit information is included in response headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1616161616
X-RateLimit-Window: 3600
```

## Response Format

All API responses follow a consistent structure:

### Successful Response
```json
{
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00Z",
    "requestId": "uuid-request-identifier",
    "version": "1.0.0"
  },
  "pagination": {  // Only for list responses
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The provided parameter is invalid",
    "details": {
      "parameter": "department",
      "value": "invalid-dept",
      "validValues": ["cs", "math", "physics"]
    }
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00Z",
    "requestId": "uuid-request-identifier",
    "version": "1.0.0"
  }
}
```

## Status Codes

MACAS API uses standard HTTP status codes:

| Code | Meaning | Description |
|------|---------|-------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **204** | No Content | Request successful, no response body |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Authentication required or invalid |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Resource conflict (duplicate, etc.) |
| **413** | Payload Too Large | Request body too large |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **502** | Bad Gateway | Upstream service error |
| **503** | Service Unavailable | Service temporarily unavailable |

## API Versioning

MACAS API uses URL-based versioning to ensure backward compatibility:

- **Current Version**: v1
- **Base URL**: `https://api.curriculum-alignment.ceu.edu/v1`
- **Version Header**: `X-API-Version: 1.0.0` (optional)

### Version Deprecation Policy
- **New versions** are announced 90 days before release
- **Deprecated versions** are supported for 12 months after replacement
- **Breaking changes** require major version increment
- **Backward-compatible changes** use minor version increment

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- **Authentication**: Multiple authentication methods available
- **Authorization**: Fine-grained permission system
- **Audit Logging**: Comprehensive API access logging
- **Data Residency**: EU data residency compliance

### Best Practices
- **Store API keys securely** and never expose in client-side code
- **Use HTTPS only** for all API communications
- **Implement proper error handling** for all API calls
- **Respect rate limits** to avoid service disruption
- **Validate all inputs** on both client and server sides
- **Monitor API usage** and implement alerting for anomalies

### Compliance
- **GDPR**: Full European data protection regulation compliance
- **FERPA**: US educational privacy act compliance
- **SOC 2**: System and Organization Controls compliance
- **ISO 27001**: Information security management standards

## Support and Community

### Getting Help
- **Documentation**: Comprehensive guides and tutorials
- **API Support**: support@ceu.edu for technical questions
- **Status Page**: https://status.curriculum-alignment.ceu.edu
- **Community Forum**: Connect with other developers

### Support Channels
- **Email Support**: api-support@ceu.edu (Technical issues)
- **Phone Support**: +36-1-327-3000 ext. 2500 (Mon-Fri, 9 AM-5 PM CET)
- **Emergency Support**: +36-1-327-3000 ext. 9999 (Critical production issues)
- **Documentation Issues**: Submit issues on our documentation repository

### Response Times
- **Standard Support**: 4 business hours
- **Priority Support**: 1 business hour (premium customers)
- **Emergency Support**: 30 minutes (critical production issues)

## What's New

### Version 1.0.0 (Current)
- **Initial Release**: Complete REST API with all core functionality
- **Multi-Agent Analysis**: Full analysis engine integration
- **Document Processing**: Advanced document upload and extraction
- **Report Generation**: Professional report creation in multiple formats
- **User Management**: Complete user and permission management
- **Webhook Support**: Event-driven notifications and callbacks

### Upcoming Features
- **GraphQL Endpoint**: Flexible query interface
- **Real-time Subscriptions**: WebSocket-based live updates
- **Bulk Import API**: Large-scale data import capabilities
- **Advanced Analytics**: Extended reporting and analytics endpoints
- **Mobile SDK**: Native mobile app development support

---

## Next Steps

Ready to start building with the MACAS API?

- **New to APIs?** Start with the [Getting Started Guide](./getting-started.md)
- **Need specific functionality?** Browse the [API Reference](./api-reference.md)
- **Looking for examples?** Check out our [Code Examples](./examples.md)
- **Building a specific integration?** Review the [SDKs and Libraries](./sdks.md)

For additional support, contact our API team at api-support@ceu.edu.

---

*This documentation is regularly updated to reflect the latest API features and improvements. Last updated: March 2024*