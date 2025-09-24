# MACAS API Reference

This document provides a complete reference for all MACAS API endpoints, request/response formats, and data models.

## Base URL

```
https://api.curriculum-alignment.ceu.edu/v1
```

All API requests must be made over HTTPS. HTTP requests will be redirected to HTTPS.

## Authentication

All endpoints require authentication. Include your API key or OAuth token in the request headers:

```http
# API Key Authentication
X-API-Key: your-api-key-here

# OAuth 2.0 Authentication  
Authorization: Bearer your-oauth-token-here
```

## System Endpoints

### Health Check

Check API service availability and health status.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-03-15T10:30:00Z",
  "uptime": 1234567
}
```

**Status Values:**
- `healthy`: All services operational
- `degraded`: Some services experiencing issues
- `unhealthy`: Critical services down

### System Status

Get detailed system status and component health information.

```http
GET /status
```

**Response:**
```json
{
  "data": {
    "api": {
      "status": "operational",
      "responseTime": 45,
      "lastCheck": "2024-03-15T10:30:00Z"
    },
    "database": {
      "status": "operational",
      "responseTime": 12,
      "lastCheck": "2024-03-15T10:30:00Z"
    },
    "analysisEngine": {
      "status": "operational",
      "responseTime": 150,
      "lastCheck": "2024-03-15T10:30:00Z"
    },
    "documentProcessor": {
      "status": "operational",
      "responseTime": 89,
      "lastCheck": "2024-03-15T10:30:00Z"
    },
    "queueStatus": {
      "pending": 5,
      "processing": 2,
      "completed": 1847,
      "failed": 3
    }
  }
}
```

## Authentication Endpoints

### User Login

Authenticate user and receive access token.

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@ceu.edu",
  "password": "user-password"
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "uuid-user-id",
      "email": "user@ceu.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "faculty"
    }
  }
}
```

### Token Refresh

Refresh access token using refresh token.

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

## Programs Endpoints

### List Programs

Retrieve list of curriculum programs with filtering and pagination.

```http
GET /programs?department={dept}&level={level}&status={status}&page={page}&limit={limit}
```

**Query Parameters:**
- `department` (string, optional): Filter by department
- `level` (string, optional): Filter by academic level (`undergraduate`, `graduate`, `professional`, `certificate`)
- `status` (string, optional): Filter by status (`draft`, `active`, `archived`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-program-id",
      "name": "Computer Science Bachelor",
      "shortName": "CS-BS",
      "description": "Comprehensive computer science program...",
      "department": "Computer Science",
      "faculty": "School of Engineering",
      "programCode": "CS-UG-001",
      "academicLevel": "undergraduate",
      "degreeType": "BS",
      "language": "en",
      "mode": "on-campus",
      "duration": 8,
      "totalCredits": 120,
      "academicYear": "2024-2025",
      "status": "active",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z",
      "owner": {
        "id": "uuid-user-id",
        "displayName": "Dr. Jane Smith",
        "email": "jane.smith@ceu.edu"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Get Program

Retrieve detailed information about a specific program.

```http
GET /programs/{programId}
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Response:**
```json
{
  "data": {
    "id": "uuid-program-id",
    "name": "Computer Science Bachelor",
    "shortName": "CS-BS",
    "description": "Comprehensive computer science program covering theoretical foundations and practical applications.",
    "department": "Computer Science",
    "faculty": "School of Engineering",
    "programCode": "CS-UG-001",
    "academicLevel": "undergraduate",
    "degreeType": "BS",
    "language": "en",
    "mode": "on-campus",
    "duration": 8,
    "totalCredits": 120,
    "academicYear": "2024-2025",
    "status": "active",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-03-10T14:30:00Z",
    "owner": {
      "id": "uuid-user-id",
      "displayName": "Dr. Jane Smith",
      "email": "jane.smith@ceu.edu",
      "department": "Computer Science"
    },
    "documents": [
      {
        "id": "uuid-doc-id",
        "title": "CS Curriculum 2024-2025",
        "type": "catalog",
        "uploadedAt": "2024-02-01T10:00:00Z",
        "processingStatus": "completed"
      }
    ],
    "analyses": [
      {
        "id": "uuid-analysis-id",
        "type": "comprehensive",
        "status": "completed",
        "completedAt": "2024-03-01T15:30:00Z"
      }
    ]
  }
}
```

### Create Program

Create a new curriculum program.

```http
POST /programs
```

**Request Body:**
```json
{
  "name": "Data Science Master",
  "shortName": "DS-MS",
  "description": "Advanced data science program focusing on machine learning and big data analytics.",
  "department": "Computer Science",
  "faculty": "School of Engineering",
  "programCode": "DS-GR-001",
  "academicLevel": "graduate",
  "degreeType": "MS",
  "language": "en",
  "mode": "on-campus",
  "duration": 4,
  "totalCredits": 60,
  "academicYear": "2024-2025"
}
```

**Required Fields:**
- `name`: Program name
- `department`: Department name
- `academicLevel`: One of `undergraduate`, `graduate`, `professional`, `certificate`

**Response:**
```json
{
  "data": {
    "id": "uuid-new-program-id",
    "name": "Data Science Master",
    "shortName": "DS-MS",
    "department": "Computer Science",
    "academicLevel": "graduate",
    "status": "draft",
    "createdAt": "2024-03-15T11:00:00Z",
    "owner": {
      "id": "uuid-current-user-id",
      "displayName": "Dr. John Doe"
    }
  }
}
```

### Update Program

Update existing program information.

```http
PUT /programs/{programId}
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Request Body:**
```json
{
  "name": "Updated Program Name",
  "description": "Updated program description",
  "totalCredits": 125,
  "status": "active"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-program-id",
    "name": "Updated Program Name",
    "description": "Updated program description",
    "totalCredits": 125,
    "status": "active",
    "updatedAt": "2024-03-15T11:15:00Z"
  }
}
```

### Delete Program

Delete a program and all associated data.

```http
DELETE /programs/{programId}
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Response:**
```http
HTTP/1.1 204 No Content
```

**Error Responses:**
- `409 Conflict`: Cannot delete program with active analyses

## Documents Endpoints

### List Program Documents

Retrieve list of documents associated with a program.

```http
GET /programs/{programId}/documents?type={type}
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Query Parameters:**
- `type` (string, optional): Filter by document type (`catalog`, `handbook`, `syllabus`, `assessment`, `accreditation`, `policy`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-doc-id",
      "programId": "uuid-program-id",
      "title": "Course Catalog 2024-2025",
      "description": "Complete course catalog with descriptions and requirements",
      "type": "catalog",
      "language": "en",
      "academicYear": "2024-2025",
      "fileName": "cs-catalog-2024-25.pdf",
      "fileSize": 2048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-02-01T10:00:00Z",
      "processedAt": "2024-02-01T10:05:00Z",
      "processingStatus": "completed",
      "extractionQuality": 95,
      "downloadUrl": "https://storage.curriculum-alignment.ceu.edu/documents/uuid-doc-id",
      "uploadedBy": {
        "id": "uuid-user-id",
        "displayName": "Dr. Jane Smith"
      }
    }
  ]
}
```

### Upload Document

Upload a document to a program.

```http
POST /programs/{programId}/documents
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Request Body (multipart/form-data):**
- `file` (binary, required): Document file (PDF, Word, Excel)
- `title` (string, required): Document title
- `type` (string, required): Document type (`catalog`, `handbook`, `syllabus`, `assessment`, `accreditation`, `policy`)
- `description` (string, optional): Document description
- `language` (string, optional): Document language (`en`, `de`, `hu`, `cs`)
- `academicYear` (string, optional): Academic year (e.g., "2024-2025")

**Example with curl:**
```bash
curl -X POST "https://api.curriculum-alignment.ceu.edu/v1/programs/{program-id}/documents" \
  -H "X-API-Key: $MACAS_API_KEY" \
  -F "file=@course-catalog.pdf" \
  -F "title=Course Catalog 2024-2025" \
  -F "type=catalog" \
  -F "language=en" \
  -F "academicYear=2024-2025"
```

**Response:**
```json
{
  "data": {
    "id": "uuid-new-doc-id",
    "programId": "uuid-program-id",
    "title": "Course Catalog 2024-2025",
    "type": "catalog",
    "fileName": "course-catalog.pdf",
    "fileSize": 2048576,
    "processingStatus": "pending",
    "uploadedAt": "2024-03-15T11:30:00Z",
    "uploadedBy": {
      "id": "uuid-current-user-id",
      "displayName": "Dr. John Doe"
    }
  }
}
```

### Get Document

Retrieve document metadata and download information.

```http
GET /programs/{programId}/documents/{documentId}
```

**Path Parameters:**
- `programId` (string, required): Program UUID
- `documentId` (string, required): Document UUID

**Response:**
```json
{
  "data": {
    "id": "uuid-doc-id",
    "programId": "uuid-program-id",
    "title": "Course Catalog 2024-2025",
    "description": "Complete course catalog",
    "type": "catalog",
    "language": "en",
    "academicYear": "2024-2025",
    "fileName": "course-catalog.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "processingStatus": "completed",
    "extractionQuality": 95,
    "downloadUrl": "https://storage.curriculum-alignment.ceu.edu/documents/uuid-doc-id?expires=1616161616&signature=...",
    "uploadedAt": "2024-02-01T10:00:00Z",
    "processedAt": "2024-02-01T10:05:00Z",
    "uploadedBy": {
      "id": "uuid-user-id",
      "displayName": "Dr. Jane Smith",
      "email": "jane.smith@ceu.edu"
    },
    "extractedData": {
      "courseCount": 45,
      "creditHours": 120,
      "prerequisites": 23,
      "learningOutcomes": 15
    }
  }
}
```

### Delete Document

Delete a document from a program.

```http
DELETE /programs/{programId}/documents/{documentId}
```

**Path Parameters:**
- `programId` (string, required): Program UUID
- `documentId` (string, required): Document UUID

**Response:**
```http
HTTP/1.1 204 No Content
```

## Analysis Endpoints

### List Program Analyses

Retrieve list of analyses for a program.

```http
GET /programs/{programId}/analyses?type={type}&status={status}
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Query Parameters:**
- `type` (string, optional): Filter by analysis type (`gap`, `peer`, `semantic`, `comprehensive`)
- `status` (string, optional): Filter by status (`pending`, `processing`, `completed`, `failed`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-analysis-id",
      "programId": "uuid-program-id",
      "type": "comprehensive",
      "status": "completed",
      "progress": 100,
      "parameters": {
        "detailLevel": "intermediate",
        "peerInstitutions": ["harvard", "mit", "stanford"],
        "focusAreas": ["core-curriculum", "electives"]
      },
      "startedAt": "2024-03-01T14:00:00Z",
      "completedAt": "2024-03-01T15:30:00Z",
      "estimatedDuration": 90,
      "actualDuration": 90,
      "results": {
        "overallScore": 78,
        "componentScores": {
          "completeness": 85,
          "competitiveness": 72,
          "coherence": 80,
          "innovation": 75
        }
      },
      "startedBy": {
        "id": "uuid-user-id",
        "displayName": "Dr. Jane Smith"
      }
    }
  ]
}
```

### Start Analysis

Start a new curriculum analysis for a program.

```http
POST /programs/{programId}/analyses
```

**Path Parameters:**
- `programId` (string, required): Program UUID

**Request Body:**
```json
{
  "type": "comprehensive",
  "parameters": {
    "detailLevel": "intermediate",
    "peerInstitutions": ["harvard", "mit", "stanford"],
    "geographicScope": "international",
    "focusAreas": ["core-curriculum", "electives", "capstone"],
    "includeHistoricalData": false,
    "customCriteria": {
      "industryAlignment": true,
      "innovationIndex": true
    }
  }
}
```

**Analysis Types:**
- `gap`: Gap analysis against standards
- `peer`: Peer institution comparison
- `semantic`: Semantic content analysis
- `comprehensive`: All analysis types combined

**Detail Levels:**
- `basic`: High-level overview (15-30 min)
- `intermediate`: Balanced detail (30-90 min)
- `advanced`: Comprehensive analysis (60-180 min)

**Response:**
```json
{
  "data": {
    "id": "uuid-new-analysis-id",
    "programId": "uuid-program-id",
    "type": "comprehensive",
    "status": "pending",
    "progress": 0,
    "parameters": {
      "detailLevel": "intermediate",
      "peerInstitutions": ["harvard", "mit", "stanford"]
    },
    "startedAt": "2024-03-15T12:00:00Z",
    "estimatedDuration": 90,
    "startedBy": {
      "id": "uuid-current-user-id",
      "displayName": "Dr. John Doe"
    }
  }
}
```

### Get Analysis

Retrieve analysis details and results.

```http
GET /analyses/{analysisId}
```

**Path Parameters:**
- `analysisId` (string, required): Analysis UUID

**Response:**
```json
{
  "data": {
    "id": "uuid-analysis-id",
    "programId": "uuid-program-id",
    "type": "comprehensive",
    "status": "completed",
    "progress": 100,
    "results": {
      "overallScore": 78,
      "componentScores": {
        "completeness": 85,
        "competitiveness": 72,
        "coherence": 80,
        "innovation": 75
      },
      "gaps": [
        {
          "id": "gap-1",
          "category": "emerging-technologies",
          "severity": "medium",
          "description": "Limited coverage of AI/ML topics",
          "evidence": ["No machine learning courses", "Outdated data science content"],
          "suggestedActions": ["Add ML elective track", "Update data structures course"]
        }
      ],
      "recommendations": [
        {
          "id": "rec-1",
          "priority": "high",
          "category": "curriculum-enhancement",
          "title": "Add AI/ML Specialization Track",
          "description": "Introduce specialized track focusing on artificial intelligence and machine learning",
          "implementation": {
            "effort": "high",
            "impact": "high",
            "timeline": "1-2 semesters",
            "resources": ["2 new faculty", "ML lab equipment", "Industry partnerships"]
          }
        }
      ],
      "peerComparison": {
        "ranking": 6,
        "totalInstitutions": 10,
        "averageScores": {
          "completeness": 82,
          "competitiveness": 75,
          "coherence": 78,
          "innovation": 71
        },
        "topPerformers": [
          {
            "institution": "Harvard University",
            "score": 95
          },
          {
            "institution": "MIT",
            "score": 94
          }
        ]
      }
    }
  }
}
```

### Get Analysis Status

Get real-time analysis progress and status.

```http
GET /analyses/{analysisId}/status
```

**Path Parameters:**
- `analysisId` (string, required): Analysis UUID

**Response:**
```json
{
  "data": {
    "id": "uuid-analysis-id",
    "status": "processing",
    "progress": 65,
    "currentStage": "peer-comparison",
    "stages": [
      {
        "name": "document-processing",
        "status": "completed",
        "startedAt": "2024-03-15T12:00:00Z",
        "completedAt": "2024-03-15T12:15:00Z"
      },
      {
        "name": "gap-analysis",
        "status": "completed",
        "startedAt": "2024-03-15T12:15:00Z",
        "completedAt": "2024-03-15T12:45:00Z"
      },
      {
        "name": "peer-comparison",
        "status": "processing",
        "startedAt": "2024-03-15T12:45:00Z"
      },
      {
        "name": "semantic-analysis",
        "status": "pending"
      },
      {
        "name": "report-generation",
        "status": "pending"
      }
    ],
    "estimatedCompletion": "2024-03-15T13:30:00Z",
    "messages": [
      {
        "timestamp": "2024-03-15T12:00:00Z",
        "level": "info",
        "message": "Analysis started successfully"
      },
      {
        "timestamp": "2024-03-15T12:15:00Z",
        "level": "info",
        "message": "Document processing completed"
      },
      {
        "timestamp": "2024-03-15T12:30:00Z",
        "level": "warning",
        "message": "One peer institution data temporarily unavailable"
      }
    ]
  }
}
```

### Cancel Analysis

Cancel a running analysis.

```http
DELETE /analyses/{analysisId}
```

**Path Parameters:**
- `analysisId` (string, required): Analysis UUID

**Response:**
```http
HTTP/1.1 204 No Content
```

**Error Responses:**
- `400 Bad Request`: Cannot cancel completed analysis

## Reports Endpoints

### List Analysis Reports

Retrieve available reports for an analysis.

```http
GET /analyses/{analysisId}/reports
```

**Path Parameters:**
- `analysisId` (string, required): Analysis UUID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-report-id",
      "analysisId": "uuid-analysis-id",
      "type": "executive",
      "format": "pdf",
      "status": "completed",
      "title": "Executive Summary - CS Bachelor Analysis",
      "description": "High-level analysis summary for leadership",
      "generatedAt": "2024-03-01T15:45:00Z",
      "fileSize": 1024768,
      "downloadUrl": "https://storage.curriculum-alignment.ceu.edu/reports/uuid-report-id?expires=...",
      "expiresAt": "2024-03-08T15:45:00Z",
      "generatedBy": {
        "id": "uuid-user-id",
        "displayName": "Dr. Jane Smith"
      }
    }
  ]
}
```

### Generate Report

Generate a new report for an analysis.

```http
POST /analyses/{analysisId}/reports
```

**Path Parameters:**
- `analysisId` (string, required): Analysis UUID

**Request Body:**
```json
{
  "type": "detailed",
  "format": "pdf",
  "parameters": {
    "includeCharts": true,
    "includeAppendices": true,
    "customBranding": true,
    "sections": [
      "executive-summary",
      "methodology",
      "findings",
      "recommendations",
      "appendices"
    ]
  }
}
```

**Report Types:**
- `executive`: Executive summary (2-4 pages)
- `detailed`: Detailed analysis (15-50 pages)
- `dashboard`: Interactive visual dashboard
- `action-plan`: Implementation-focused plan (5-15 pages)
- `peer-comparison`: Benchmarking report (10-25 pages)
- `accreditation`: Accreditation compliance report (20+ pages)

**Formats:**
- `pdf`: Portable Document Format
- `docx`: Microsoft Word document
- `xlsx`: Microsoft Excel spreadsheet
- `pptx`: Microsoft PowerPoint presentation
- `html`: Interactive web report

**Response:**
```json
{
  "data": {
    "id": "uuid-new-report-id",
    "analysisId": "uuid-analysis-id",
    "type": "detailed",
    "format": "pdf",
    "status": "generating",
    "title": "Detailed Analysis - CS Bachelor Program",
    "parameters": {
      "includeCharts": true,
      "includeAppendices": true,
      "customBranding": true
    },
    "generatedBy": {
      "id": "uuid-current-user-id",
      "displayName": "Dr. John Doe"
    }
  }
}
```

### Get Report

Retrieve report metadata and download information.

```http
GET /reports/{reportId}
```

**Path Parameters:**
- `reportId` (string, required): Report UUID

**Response:**
```json
{
  "data": {
    "id": "uuid-report-id",
    "analysisId": "uuid-analysis-id",
    "type": "executive",
    "format": "pdf",
    "status": "completed",
    "title": "Executive Summary - CS Bachelor Analysis",
    "description": "High-level analysis summary for leadership",
    "generatedAt": "2024-03-01T15:45:00Z",
    "fileSize": 1024768,
    "downloadUrl": "https://storage.curriculum-alignment.ceu.edu/reports/uuid-report-id?expires=1616161616&signature=...",
    "expiresAt": "2024-03-08T15:45:00Z",
    "generatedBy": {
      "id": "uuid-user-id",
      "displayName": "Dr. Jane Smith",
      "email": "jane.smith@ceu.edu"
    }
  }
}
```

### Download Report

Download report file directly.

```http
GET /reports/{reportId}/download?format={format}
```

**Path Parameters:**
- `reportId` (string, required): Report UUID

**Query Parameters:**
- `format` (string, optional): Override report format (`pdf`, `docx`, `xlsx`, `pptx`)

**Response:**
Binary file content with appropriate Content-Type header.

**Response Headers:**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="executive-summary-cs-bachelor.pdf"
Content-Length: 1024768
```

## Users Endpoints

**Note:** User management endpoints require admin privileges.

### List Users

Retrieve list of system users (admin only).

```http
GET /users?department={dept}&role={role}&page={page}&limit={limit}
```

**Query Parameters:**
- `department` (string, optional): Filter by department
- `role` (string, optional): Filter by role (`admin`, `faculty`, `staff`, `guest`)
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-user-id",
      "email": "jane.smith@ceu.edu",
      "firstName": "Jane",
      "lastName": "Smith",
      "displayName": "Dr. Jane Smith",
      "department": "Computer Science",
      "title": "Associate Professor",
      "role": "faculty",
      "permissions": ["read", "write", "analyze"],
      "lastLoginAt": "2024-03-15T09:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Create User

Create a new user account (admin only).

```http
POST /users
```

**Request Body:**
```json
{
  "email": "new.user@ceu.edu",
  "firstName": "John",
  "lastName": "Doe",
  "department": "Computer Science",
  "title": "Assistant Professor",
  "role": "faculty",
  "permissions": ["read", "write"],
  "sendWelcomeEmail": true
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid-new-user-id",
    "email": "new.user@ceu.edu",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "John Doe",
    "department": "Computer Science",
    "role": "faculty",
    "isActive": true,
    "createdAt": "2024-03-15T12:00:00Z"
  }
}
```

### Get Current User

Get information about the authenticated user.

```http
GET /users/me
```

**Response:**
```json
{
  "data": {
    "id": "uuid-current-user-id",
    "email": "current.user@ceu.edu",
    "firstName": "Current",
    "lastName": "User",
    "displayName": "Dr. Current User",
    "department": "Computer Science",
    "title": "Associate Professor",
    "role": "faculty",
    "permissions": ["read", "write", "analyze"],
    "preferences": {
      "theme": "light",
      "language": "en",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "lastLoginAt": "2024-03-15T09:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "isActive": true
  }
}
```

### Update User

Update user information.

```http
PUT /users/{userId}
```

**Path Parameters:**
- `userId` (string, required): User UUID

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "department": "Mathematics",
  "title": "Full Professor",
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": false
    }
  }
}
```

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  },
  "meta": {
    "timestamp": "2024-03-15T12:00:00Z",
    "requestId": "uuid-request-id",
    "version": "1.0.0"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |
| `ANALYSIS_IN_PROGRESS` | 409 | Cannot modify resource during analysis |
| `DOCUMENT_PROCESSING_FAILED` | 422 | Document could not be processed |
| `INVALID_FILE_FORMAT` | 422 | Unsupported file format |

For detailed error handling guidance, see the [Error Handling Guide](./errors.md).

## Rate Limiting

Rate limits are applied per API key and are reset hourly. Current limits:

| Endpoint Category | Requests/Hour |
|-------------------|---------------|
| Authentication | 100 |
| Read Operations | 1000 |
| Write Operations | 200 |
| Analysis Execution | 50 |
| Bulk Operations | 10 |
| Report Generation | 100 |

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1616161616
```

## Pagination

List endpoints support cursor-based pagination:

**Request:**
```http
GET /programs?page=2&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

## Webhooks

MACAS can send webhook notifications for various events. Configure webhooks in the dashboard under Settings > Webhooks.

### Webhook Events

- `analysis.started`: Analysis has begun
- `analysis.progress`: Analysis progress update (25%, 50%, 75%)
- `analysis.completed`: Analysis finished successfully
- `analysis.failed`: Analysis failed or was cancelled
- `document.uploaded`: Document uploaded successfully
- `document.processed`: Document processing completed
- `report.generated`: Report generation completed

### Webhook Payload

```json
{
  "event": "analysis.completed",
  "timestamp": "2024-03-15T13:30:00Z",
  "data": {
    "analysisId": "uuid-analysis-id",
    "programId": "uuid-program-id",
    "type": "comprehensive",
    "status": "completed",
    "results": {
      "overallScore": 78
    }
  }
}
```

For complete webhook documentation, see [Webhooks Guide](./webhooks.md).

---

This API reference is continuously updated to reflect the latest features and changes. For questions or clarification, contact api-support@ceu.edu.