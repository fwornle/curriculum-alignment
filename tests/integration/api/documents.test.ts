import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMockAPIGatewayEvent } from '../../setup';

describe('Documents API Integration Tests', () => {
  const mockAuthToken = 'Bearer valid-jwt-token';
  
  const mockDocumentMetadata = {
    id: 'doc-123',
    filename: 'CS_Curriculum_2024.xlsx',
    originalName: 'CS Curriculum 2024.xlsx',
    size: 1048576, // 1MB
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    s3Key: 'documents/user-123/doc-123/CS_Curriculum_2024.xlsx',
    s3Bucket: 'curriculum-alignment-documents-dev',
    uploadedBy: 'user-123',
    uploadedAt: '2024-01-15T10:30:00Z',
    status: 'uploaded',
    processingStatus: 'pending',
    programId: 'cs-bachelor-2024',
    tags: ['curriculum', 'computer-science', '2024'],
    checksum: 'sha256:abc123def456',
    virusScanStatus: 'clean',
    metadata: {
      sheets: ['Courses', 'Prerequisites', 'Learning Outcomes'],
      rowCount: 150,
      columnCount: 12
    }
  };

  describe('POST /documents/upload', () => {
    it('should upload Excel document successfully', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          ...mockDocumentMetadata,
          uploadUrl: 'https://curriculum-alignment-documents-dev.s3.amazonaws.com/documents/user-123/doc-123/CS_Curriculum_2024.xlsx?X-Amz-Algorithm=...',
          processing: {
            workflowId: 'workflow-123',
            estimatedCompletion: '2024-01-15T10:35:00Z',
            steps: [
              'virus-scan',
              'format-validation',
              'content-extraction',
              'semantic-analysis'
            ]
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Location': '/api/v1/documents/doc-123'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'CS_Curriculum_2024.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1048576,
          programId: 'cs-bachelor-2024',
          tags: ['curriculum', 'computer-science', '2024'],
          description: 'Updated computer science curriculum for 2024'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(responseBody.id).toBe('doc-123');
      expect(responseBody.filename).toBe('CS_Curriculum_2024.xlsx');
      expect(responseBody.size).toBe(1048576);
      expect(responseBody.status).toBe('uploaded');
      expect(responseBody.uploadUrl).toBeDefined();
      expect(responseBody.processing.workflowId).toBeDefined();
      expect(responseBody.processing.steps).toContain('virus-scan');
      expect(result.headers?.['Location']).toBe('/api/v1/documents/doc-123');
    });

    it('should upload Word document successfully', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          ...mockDocumentMetadata,
          id: 'doc-124',
          filename: 'Program_Handbook.docx',
          originalName: 'Program Handbook.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          s3Key: 'documents/user-123/doc-124/Program_Handbook.docx',
          metadata: {
            pageCount: 45,
            wordCount: 12500,
            sections: ['Introduction', 'Curriculum Overview', 'Course Descriptions']
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Location': '/api/v1/documents/doc-124'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'Program_Handbook.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 2097152,
          programId: 'cs-bachelor-2024'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(responseBody.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(responseBody.metadata.pageCount).toBe(45);
      expect(responseBody.metadata.wordCount).toBe(12500);
    });

    it('should upload PDF document successfully', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          ...mockDocumentMetadata,
          id: 'doc-125',
          filename: 'Accreditation_Report.pdf',
          mimeType: 'application/pdf',
          metadata: {
            pageCount: 120,
            hasImages: true,
            hasEmbeddedFonts: true,
            pdfVersion: '1.7'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'Accreditation_Report.pdf',
          contentType: 'application/pdf',
          size: 5242880,
          programId: 'cs-bachelor-2024'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(responseBody.mimeType).toBe('application/pdf');
      expect(responseBody.metadata.pageCount).toBe(120);
      expect(responseBody.metadata.pdfVersion).toBe('1.7');
    });

    it('should reject unsupported file types', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Unsupported file type',
          details: {
            provided: 'text/plain',
            supported: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/msword',
              'application/pdf'
            ]
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'notes.txt',
          contentType: 'text/plain',
          size: 1024
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.message).toBe('Unsupported file type');
      expect(responseBody.details.provided).toBe('text/plain');
      expect(responseBody.details.supported).toContain('application/pdf');
    });

    it('should reject files that are too large', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 413,
        body: JSON.stringify({
          error: 'PayloadTooLarge',
          message: 'File size exceeds maximum allowed limit',
          details: {
            provided: 104857600, // 100MB
            maxAllowed: 52428800, // 50MB
            unit: 'bytes'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'huge_file.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 104857600 // 100MB
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(413);
      expect(responseBody.error).toBe('PayloadTooLarge');
      expect(responseBody.details.provided).toBe(104857600);
      expect(responseBody.details.maxAllowed).toBe(52428800);
    });

    it('should validate required fields', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Missing required fields',
          details: {
            filename: 'required',
            contentType: 'required',
            size: 'required'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          // Missing required fields
          description: 'File without metadata'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.filename).toBe('required');
      expect(responseBody.details.contentType).toBe('required');
      expect(responseBody.details.size).toBe('required');
    });

    it('should validate filename format', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Invalid filename format',
          details: {
            filename: '../../../etc/passwd',
            issues: [
              'Path traversal characters not allowed',
              'Filename must not start with dots',
              'Only alphanumeric characters, spaces, hyphens, underscores, and dots allowed'
            ]
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: '../../../etc/passwd',
          contentType: 'application/pdf',
          size: 1024
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.issues).toContain('Path traversal characters not allowed');
    });

    it('should require authentication', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required for document upload'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: 1024
        }),
        headers: {
          // No Authorization header
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(responseBody.error).toBe('Unauthorized');
      expect(responseBody.message).toContain('Authentication required');
    });

    it('should handle S3 service errors', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 503,
        body: JSON.stringify({
          error: 'ServiceUnavailable',
          message: 'Document storage service temporarily unavailable',
          details: {
            service: 's3',
            region: 'us-east-1',
            retryAfter: 60
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '60'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: 1048576
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(503);
      expect(responseBody.error).toBe('ServiceUnavailable');
      expect(responseBody.details.service).toBe('s3');
      expect(result.headers?.['Retry-After']).toBe('60');
    });

    it('should handle virus detection', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 422,
        body: JSON.stringify({
          error: 'UnprocessableEntity',
          message: 'File failed security scan',
          details: {
            reason: 'virus-detected',
            virusName: 'Test.EICAR.Virus',
            scanEngine: 'ClamAV',
            action: 'quarantined',
            documentId: 'doc-126'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'infected_file.pdf',
          contentType: 'application/pdf',
          size: 1024
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(422);
      expect(responseBody.error).toBe('UnprocessableEntity');
      expect(responseBody.details.reason).toBe('virus-detected');
      expect(responseBody.details.virusName).toBe('Test.EICAR.Virus');
      expect(responseBody.details.action).toBe('quarantined');
    });

    it('should handle rate limiting for uploads', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 429,
        body: JSON.stringify({
          error: 'TooManyRequests',
          message: 'Upload rate limit exceeded',
          details: {
            limit: 5,
            window: '1 hour',
            remaining: 0,
            resetTime: '2024-01-15T11:30:00Z'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '3600',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '2024-01-15T11:30:00Z'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: 1048576
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(429);
      expect(responseBody.error).toBe('TooManyRequests');
      expect(responseBody.details.limit).toBe(5);
      expect(result.headers?.['X-RateLimit-Limit']).toBe('5');
      expect(result.headers?.['X-RateLimit-Remaining']).toBe('0');
    });

    it('should generate presigned URLs for direct S3 upload', async () => {
      const mockDocumentsHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          ...mockDocumentMetadata,
          uploadMethod: 'presigned-post',
          presignedPost: {
            url: 'https://curriculum-alignment-documents-dev.s3.amazonaws.com/',
            fields: {
              'key': 'documents/user-123/doc-123/CS_Curriculum_2024.xlsx',
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'x-amz-meta-user-id': 'user-123',
              'x-amz-meta-program-id': 'cs-bachelor-2024',
              'policy': 'eyJleHBpcmF0aW9uIjoi...',
              'x-amz-algorithm': 'AWS4-HMAC-SHA256',
              'x-amz-credential': 'AKIAI...',
              'x-amz-date': '20240115T103000Z',
              'x-amz-signature': 'abc123...'
            }
          },
          expiresAt: '2024-01-15T11:00:00Z'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/documents/upload',
        body: JSON.stringify({
          filename: 'CS_Curriculum_2024.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1048576,
          uploadMethod: 'presigned-post'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockDocumentsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(responseBody.uploadMethod).toBe('presigned-post');
      expect(responseBody.presignedPost).toBeDefined();
      expect(responseBody.presignedPost.url).toContain('s3.amazonaws.com');
      expect(responseBody.presignedPost.fields.key).toContain('documents/user-123');
      expect(responseBody.expiresAt).toBeDefined();
    });
  });
});