import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMockAPIGatewayEvent } from '../../setup';

describe('Programs API Integration Tests', () => {
  const mockAuthToken = 'Bearer valid-jwt-token';
  const mockProgram = {
    id: 'cs-bachelor-2024',
    name: 'Bachelor of Science in Computer Science',
    department: 'Computer Science and Information Systems',
    level: 'bachelor',
    duration: 6,
    credits: 180,
    description: 'Comprehensive computer science program focusing on software engineering, algorithms, and system design',
    outcomes: [
      'Design and implement complex software systems',
      'Analyze computational problems and develop efficient solutions',
      'Apply software engineering principles in team environments'
    ],
    courses: [
      {
        code: 'CS101',
        name: 'Introduction to Programming',
        credits: 6,
        semester: 1,
        mandatory: true
      },
      {
        code: 'CS201',
        name: 'Data Structures and Algorithms',
        credits: 6,
        semester: 2,
        mandatory: true
      }
    ],
    accreditation: {
      status: 'active',
      validUntil: '2026-12-31',
      accreditingBody: 'European Computer Science Accreditation Board'
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: 'user-123'
  };

  describe('GET /programs', () => {
    it('should return paginated list of programs', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          programs: [mockProgram],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          },
          filters: {
            department: null,
            level: null
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs',
        queryStringParameters: {
          page: '1',
          limit: '20'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.programs).toHaveLength(1);
      expect(responseBody.programs[0]).toEqual(mockProgram);
      expect(responseBody.pagination.page).toBe(1);
      expect(responseBody.pagination.limit).toBe(20);
      expect(responseBody.pagination.total).toBe(1);
    });

    it('should filter programs by department', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          programs: [mockProgram],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          },
          filters: {
            department: 'Computer Science and Information Systems',
            level: null
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs',
        queryStringParameters: {
          department: 'Computer Science and Information Systems',
          page: '1',
          limit: '20'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.programs).toHaveLength(1);
      expect(responseBody.filters.department).toBe('Computer Science and Information Systems');
      expect(responseBody.programs[0].department).toBe('Computer Science and Information Systems');
    });

    it('should filter programs by academic level', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          programs: [mockProgram],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          },
          filters: {
            department: null,
            level: 'bachelor'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs',
        queryStringParameters: {
          level: 'bachelor',
          page: '1',
          limit: '20'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.programs[0].level).toBe('bachelor');
      expect(responseBody.filters.level).toBe('bachelor');
    });

    it('should require authentication', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid authentication token'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs',
        headers: {} // No Authorization header
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(responseBody.error).toBe('Unauthorized');
      expect(responseBody.message).toContain('Missing or invalid authentication token');
    });

    it('should validate pagination parameters', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Invalid pagination parameters',
          details: {
            page: 'must be a positive integer',
            limit: 'must be between 1 and 100'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs',
        queryStringParameters: {
          page: '-1',
          limit: '200'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.page).toContain('positive integer');
      expect(responseBody.details.limit).toContain('between 1 and 100');
    });
  });

  describe('POST /programs', () => {
    const programCreateRequest = {
      name: 'Master of Science in Artificial Intelligence',
      department: 'Computer Science and Information Systems',
      level: 'master',
      duration: 4,
      credits: 120,
      description: 'Advanced AI program focusing on machine learning and neural networks',
      outcomes: [
        'Design and implement AI systems',
        'Apply machine learning algorithms to real-world problems'
      ]
    };

    it('should create a new program successfully', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 201,
        body: JSON.stringify({
          ...mockProgram,
          id: 'ai-master-2024',
          name: programCreateRequest.name,
          level: 'master',
          credits: 120
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Location': '/api/v1/programs/ai-master-2024'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/programs',
        body: JSON.stringify(programCreateRequest),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(responseBody.name).toBe(programCreateRequest.name);
      expect(responseBody.level).toBe('master');
      expect(responseBody.credits).toBe(120);
      expect(responseBody.id).toBeDefined();
      expect(result.headers?.['Location']).toBe('/api/v1/programs/ai-master-2024');
    });

    it('should validate required fields', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Missing required fields',
          details: {
            name: 'required',
            department: 'required',
            level: 'required'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/programs',
        body: JSON.stringify({
          // Missing required fields
          description: 'Program without required fields'
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.name).toBe('required');
      expect(responseBody.details.department).toBe('required');
      expect(responseBody.details.level).toBe('required');
    });

    it('should validate field constraints', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Field validation failed',
          details: {
            level: 'must be one of: bachelor, master, phd',
            duration: 'must be between 1 and 10',
            credits: 'must be between 60 and 240'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/programs',
        body: JSON.stringify({
          ...programCreateRequest,
          level: 'invalid-level',
          duration: 15,
          credits: 500
        }),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.details.level).toContain('must be one of');
      expect(responseBody.details.duration).toContain('between 1 and 10');
      expect(responseBody.details.credits).toContain('between 60 and 240');
    });

    it('should handle duplicate program names', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 409,
        body: JSON.stringify({
          error: 'Conflict',
          message: 'Program with this name already exists',
          details: {
            field: 'name',
            value: programCreateRequest.name,
            existingId: 'existing-program-id'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/programs',
        body: JSON.stringify(programCreateRequest),
        headers: {
          'Authorization': mockAuthToken,
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(409);
      expect(responseBody.error).toBe('Conflict');
      expect(responseBody.message).toContain('already exists');
      expect(responseBody.details.field).toBe('name');
    });

    it('should require write permissions', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Insufficient permissions to create programs',
          details: {
            required: ['program:write'],
            provided: ['program:read']
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/programs',
        body: JSON.stringify(programCreateRequest),
        headers: {
          'Authorization': 'Bearer read-only-token',
          'Content-Type': 'application/json'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(403);
      expect(responseBody.error).toBe('Forbidden');
      expect(responseBody.details.required).toContain('program:write');
    });
  });

  describe('GET /programs/{programId}', () => {
    it('should return program by ID', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify(mockProgram),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'ETag': '"program-etag-123"',
          'Last-Modified': mockProgram.updatedAt
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs/cs-bachelor-2024',
        pathParameters: {
          programId: 'cs-bachelor-2024'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody).toEqual(mockProgram);
      expect(result.headers?.['ETag']).toBe('"program-etag-123"');
      expect(result.headers?.['Last-Modified']).toBe(mockProgram.updatedAt);
    });

    it('should return 404 for non-existent program', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 404,
        body: JSON.stringify({
          error: 'NotFound',
          message: 'Program not found',
          details: {
            programId: 'non-existent-program'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs/non-existent-program',
        pathParameters: {
          programId: 'non-existent-program'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(responseBody.error).toBe('NotFound');
      expect(responseBody.details.programId).toBe('non-existent-program');
    });

    it('should validate program ID format', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Invalid program ID format',
          details: {
            programId: 'invalid@program#id',
            expected: 'alphanumeric characters, hyphens, and underscores only'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs/invalid@program#id',
        pathParameters: {
          programId: 'invalid@program#id'
        },
        headers: {
          'Authorization': mockAuthToken
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.details.programId).toBe('invalid@program#id');
      expect(responseBody.details.expected).toContain('alphanumeric');
    });

    it('should handle conditional requests with If-None-Match', async () => {
      const mockProgramsHandler = jest.fn().mockResolvedValue({
        statusCode: 304,
        body: '',
        headers: {
          'ETag': '"program-etag-123"',
          'Cache-Control': 'max-age=300'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/programs/cs-bachelor-2024',
        pathParameters: {
          programId: 'cs-bachelor-2024'
        },
        headers: {
          'Authorization': mockAuthToken,
          'If-None-Match': '"program-etag-123"'
        }
      });

      const result: APIGatewayProxyResult = await mockProgramsHandler(event);

      expect(result.statusCode).toBe(304);
      expect(result.body).toBe('');
      expect(result.headers?.['ETag']).toBe('"program-etag-123"');
    });
  });
});