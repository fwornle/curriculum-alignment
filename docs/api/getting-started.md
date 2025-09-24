# Getting Started with MACAS API

This guide will help you get started with the Multi-Agent Curriculum Alignment System (MACAS) API. Learn how to authenticate, make your first requests, and begin integrating MACAS into your applications.

## Prerequisites

Before you begin, ensure you have:
- Access to a CEU account or approved external partnership
- Basic understanding of REST APIs and HTTP requests
- A development environment capable of making HTTP requests
- Familiarity with JSON data format

## API Access Overview

The MACAS API provides programmatic access to:
- **Curriculum Program Management**: Create, read, update, and delete programs
- **Document Processing**: Upload and process curriculum documents
- **Multi-Agent Analysis**: Execute sophisticated curriculum analysis
- **Report Generation**: Create and download professional reports
- **User Management**: Manage users, roles, and permissions (admin only)
- **Real-time Monitoring**: Track analysis progress and system status

## Step 1: Get API Credentials

### For CEU Users (API Key Method)

1. **Log into MACAS Dashboard**:
   - Navigate to https://curriculum-alignment.ceu.edu
   - Sign in with your CEU credentials

2. **Generate API Key**:
   - Go to **Settings** → **API Keys**
   - Click **"Generate New API Key"**
   - Provide a descriptive name for your key
   - Select appropriate permissions (read, write, admin)
   - Copy the generated API key immediately (it won't be shown again)

3. **Store Your API Key Securely**:
   ```bash
   # Store in environment variable (recommended)
   export MACAS_API_KEY="your-api-key-here"
   
   # Or in a configuration file (ensure proper permissions)
   echo "MACAS_API_KEY=your-api-key-here" > .env
   chmod 600 .env
   ```

### For External Partners (OAuth 2.0 Method)

1. **Request Partnership Access**:
   - Contact MACAS support at api-support@ceu.edu
   - Provide your organization details and integration requirements
   - Complete the partnership agreement
   - Receive OAuth 2.0 client credentials

2. **OAuth 2.0 Flow Setup**:
   ```javascript
   const clientId = 'your-client-id';
   const clientSecret = 'your-client-secret';
   const redirectUri = 'https://yourapp.com/callback';
   const scopes = 'read write';
   
   // Authorization URL
   const authUrl = `https://auth.ceu.edu/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code`;
   ```

## Step 2: Set Up Your Development Environment

### Command Line with curl

Most examples in this documentation use `curl` for simplicity:

```bash
# Test basic connectivity
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/health" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json"
```

### Python with requests

```python
import requests
import os

# Configuration
BASE_URL = "https://api.curriculum-alignment.ceu.edu/v1"
API_KEY = os.getenv('MACAS_API_KEY')

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Test connection
response = requests.get(f"{BASE_URL}/health", headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

### JavaScript with fetch

```javascript
const BASE_URL = 'https://api.curriculum-alignment.ceu.edu/v1';
const API_KEY = process.env.MACAS_API_KEY;

const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
};

// Test connection
fetch(`${BASE_URL}/health`, { headers })
    .then(response => response.json())
    .then(data => console.log('Health check:', data))
    .catch(error => console.error('Error:', error));
```

### Node.js with axios

```javascript
const axios = require('axios');

const apiClient = axios.create({
    baseURL: 'https://api.curriculum-alignment.ceu.edu/v1',
    headers: {
        'X-API-Key': process.env.MACAS_API_KEY,
        'Content-Type': 'application/json'
    }
});

// Test connection
apiClient.get('/health')
    .then(response => console.log('Health check:', response.data))
    .catch(error => console.error('Error:', error.response.data));
```

## Step 3: Test Your Connection

### Health Check

Start by testing the API health endpoint:

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/health" \
  -H "X-API-Key: $MACAS_API_KEY"
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

### Authentication Verification

Test your authentication with the user profile endpoint:

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/users/me" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "data": {
    "id": "uuid-here",
    "email": "your.email@ceu.edu",
    "firstName": "Your",
    "lastName": "Name",
    "department": "Computer Science",
    "role": "faculty",
    "permissions": ["read", "write"]
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00Z",
    "requestId": "uuid-request-id"
  }
}
```

### System Status Check

Verify system components are operational:

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/status" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json"
```

## Step 4: Your First API Requests

### List Your Programs

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/programs" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json"
```

**Response Structure**:
```json
{
  "data": [
    {
      "id": "uuid-program-id",
      "name": "Computer Science Bachelor",
      "department": "Computer Science",
      "academicLevel": "undergraduate",
      "status": "active",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### Create a New Program

```bash
curl -X POST "https://api.curriculum-alignment.ceu.edu/v1/programs" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Science Master",
    "shortName": "DS-MS",
    "department": "Computer Science",
    "academicLevel": "graduate",
    "degreeType": "MS",
    "language": "en",
    "mode": "on-campus",
    "duration": 4,
    "totalCredits": 60,
    "academicYear": "2024-2025"
  }'
```

### Upload a Document

```bash
curl -X POST "https://api.curriculum-alignment.ceu.edu/v1/programs/{program-id}/documents" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -F "file=@course-catalog.pdf" \
  -F "title=Course Catalog 2024-2025" \
  -F "type=catalog" \
  -F "language=en" \
  -F "academicYear=2024-2025"
```

### Start an Analysis

```bash
curl -X POST "https://api.curriculum-alignment.ceu.edu/v1/programs/{program-id}/analyses" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "gap",
    "parameters": {
      "detailLevel": "intermediate",
      "focusAreas": ["core-curriculum", "electives"],
      "includeHistoricalData": false
    }
  }'
```

## Step 5: Handle API Responses

### Success Response Pattern

All successful API responses follow this structure:

```json
{
  "data": {
    // Actual response data
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00Z",
    "requestId": "uuid-request-identifier",
    "version": "1.0.0"
  }
}
```

### Error Response Pattern

Error responses provide detailed information for debugging:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The provided department is invalid",
    "details": {
      "parameter": "department",
      "value": "invalid-dept",
      "validValues": ["computer-science", "mathematics", "physics"]
    }
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00Z",
    "requestId": "uuid-request-identifier",
    "version": "1.0.0"
  }
}
```

### Python Error Handling Example

```python
import requests
import json

def make_api_request(method, endpoint, data=None):
    try:
        response = requests.request(
            method=method,
            url=f"{BASE_URL}/{endpoint}",
            headers=headers,
            json=data
        )
        
        # Raise exception for HTTP errors
        response.raise_for_status()
        
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        # Handle HTTP errors (4xx, 5xx)
        error_data = response.json()
        print(f"HTTP Error {response.status_code}: {error_data['error']['message']}")
        return None
        
    except requests.exceptions.RequestException as e:
        # Handle network errors
        print(f"Request Error: {str(e)}")
        return None
        
    except json.JSONDecodeError as e:
        # Handle JSON parsing errors
        print(f"JSON Decode Error: {str(e)}")
        return None

# Usage
result = make_api_request('GET', 'programs')
if result:
    programs = result['data']
    print(f"Found {len(programs)} programs")
```

## Step 6: Understand Rate Limits

The API implements rate limiting to ensure fair usage:

### Rate Limit Headers

Every API response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1616161616
X-RateLimit-Window: 3600
Content-Type: application/json

{
  "data": { ... }
}
```

### Rate Limit Categories

| Category | Limit | Window | Description |
|----------|-------|--------|-------------|
| **Authentication** | 100 requests | 15 minutes | Login, token refresh |
| **Read Operations** | 1000 requests | 1 hour | GET endpoints |
| **Write Operations** | 200 requests | 1 hour | POST, PUT, PATCH |
| **Analysis Execution** | 50 requests | 1 hour | Analysis start/stop |
| **Bulk Operations** | 10 requests | 1 hour | Bulk import/export |

### Handling Rate Limits

```python
import time
import requests

def api_request_with_backoff(method, endpoint, data=None, max_retries=3):
    for attempt in range(max_retries):
        response = requests.request(
            method=method,
            url=f"{BASE_URL}/{endpoint}",
            headers=headers,
            json=data
        )
        
        if response.status_code == 429:  # Rate limit exceeded
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"Rate limit hit. Waiting {retry_after} seconds...")
            time.sleep(retry_after)
            continue
            
        return response
    
    raise Exception("Max retries exceeded due to rate limiting")
```

## Step 7: Monitor Your Usage

### Check API Usage

```bash
curl -X GET "https://api.curriculum-alignment.ceu.edu/v1/usage" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "data": {
    "currentPeriod": {
      "startTime": "2024-03-15T09:00:00Z",
      "endTime": "2024-03-15T10:00:00Z",
      "requests": {
        "total": 45,
        "read": 40,
        "write": 5,
        "analysis": 2
      },
      "remainingQuota": {
        "read": 960,
        "write": 195,
        "analysis": 48
      }
    }
  }
}
```

## Common Integration Patterns

### 1. Program Synchronization

```python
def sync_programs():
    """Synchronize local programs with MACAS."""
    # Get all programs from MACAS
    response = make_api_request('GET', 'programs')
    remote_programs = response['data']
    
    # Process each program
    for program in remote_programs:
        # Update local database
        update_local_program(program)
        
        # Check for new documents
        doc_response = make_api_request('GET', f"programs/{program['id']}/documents")
        process_documents(doc_response['data'])

def update_local_program(program_data):
    """Update program in local database."""
    # Your local database update logic
    pass

def process_documents(documents):
    """Process program documents."""
    for doc in documents:
        if doc['processingStatus'] == 'completed':
            # Document ready for analysis
            print(f"Document {doc['title']} is ready")
```

### 2. Automated Analysis Pipeline

```python
import time
from enum import Enum

class AnalysisStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

def run_analysis_pipeline(program_id, analysis_type="comprehensive"):
    """Run complete analysis pipeline."""
    
    # 1. Start analysis
    analysis_data = {
        "type": analysis_type,
        "parameters": {
            "detailLevel": "intermediate",
            "includeHistoricalData": False
        }
    }
    
    response = make_api_request('POST', f'programs/{program_id}/analyses', analysis_data)
    analysis_id = response['data']['id']
    print(f"Started analysis {analysis_id}")
    
    # 2. Monitor progress
    status = monitor_analysis_progress(analysis_id)
    
    # 3. Generate reports when complete
    if status == AnalysisStatus.COMPLETED:
        generate_analysis_reports(analysis_id)
        return True
    else:
        print(f"Analysis failed with status: {status}")
        return False

def monitor_analysis_progress(analysis_id):
    """Monitor analysis until completion."""
    while True:
        response = make_api_request('GET', f'analyses/{analysis_id}/status')
        status = response['data']['status']
        progress = response['data']['progress']
        
        print(f"Analysis {analysis_id}: {status} ({progress}%)")
        
        if status in ['completed', 'failed', 'cancelled']:
            return AnalysisStatus(status)
        
        time.sleep(30)  # Check every 30 seconds

def generate_analysis_reports(analysis_id):
    """Generate all report types for analysis."""
    report_types = ['executive', 'detailed', 'action-plan']
    
    for report_type in report_types:
        report_data = {
            "type": report_type,
            "format": "pdf",
            "parameters": {
                "includeCharts": True,
                "customBranding": True
            }
        }
        
        response = make_api_request('POST', f'analyses/{analysis_id}/reports', report_data)
        report_id = response['data']['id']
        print(f"Generated {report_type} report: {report_id}")
```

### 3. Webhook Event Handling

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = "your-webhook-secret"

@app.route('/webhooks/macas', methods=['POST'])
def handle_macas_webhook():
    """Handle MACAS webhook events."""
    
    # Verify webhook signature
    signature = request.headers.get('X-MACAS-Signature')
    if not verify_webhook_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    event = request.json
    event_type = event.get('type')
    
    # Handle different event types
    if event_type == 'analysis.completed':
        handle_analysis_completed(event['data'])
    elif event_type == 'document.processed':
        handle_document_processed(event['data'])
    elif event_type == 'report.generated':
        handle_report_generated(event['data'])
    else:
        print(f"Unknown event type: {event_type}")
    
    return jsonify({"status": "processed"}), 200

def verify_webhook_signature(payload, signature):
    """Verify webhook signature for security."""
    expected = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

def handle_analysis_completed(data):
    """Handle completed analysis event."""
    analysis_id = data['analysisId']
    program_id = data['programId']
    print(f"Analysis {analysis_id} completed for program {program_id}")
    
    # Automatically generate reports
    generate_analysis_reports(analysis_id)

def handle_document_processed(data):
    """Handle document processing event."""
    document_id = data['documentId']
    status = data['processingStatus']
    
    if status == 'completed':
        print(f"Document {document_id} processing completed")
        # Trigger analysis if all documents are ready
        check_and_trigger_analysis(data['programId'])

def handle_report_generated(data):
    """Handle report generation event."""
    report_id = data['reportId']
    download_url = data['downloadUrl']
    print(f"Report {report_id} available at: {download_url}")
    
    # Download and store report locally
    download_and_store_report(report_id, download_url)
```

## Next Steps

Now that you've successfully connected to the MACAS API, explore these topics:

1. **[API Reference](./api-reference.md)**: Complete endpoint documentation
2. **[Authentication](./authentication.md)**: Advanced authentication scenarios
3. **[Programs API](./programs.md)**: Detailed program management
4. **[Analysis API](./analysis.md)**: Advanced analysis features
5. **[Examples](./examples.md)**: More complex integration examples

## Troubleshooting

### Common Issues

**Authentication Errors (401)**:
- Verify your API key is correct and not expired
- Check if your key has the required permissions
- Ensure you're using the correct authentication method

**Rate Limiting (429)**:
- Implement exponential backoff in your requests
- Monitor your usage patterns
- Consider caching responses when appropriate

**Validation Errors (400)**:
- Check request body format and required fields
- Verify data types match the API specification
- Review parameter constraints and valid values

**Not Found Errors (404)**:
- Verify resource IDs exist and are accessible
- Check if resources have been deleted or archived
- Ensure you have permission to access the resource

For additional help, contact api-support@ceu.edu or visit our [Error Handling Guide](./errors.md).