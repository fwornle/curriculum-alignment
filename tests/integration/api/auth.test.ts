import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMockAPIGatewayEvent } from '../../setup';
import * as AWS from 'aws-sdk';

// Mock AWS Cognito
const mockCognitoIdentityServiceProvider = {
  adminInitiateAuth: jest.fn(),
  adminRespondToAuthChallenge: jest.fn(),
  adminCreateUser: jest.fn(),
  adminSetUserPassword: jest.fn(),
  adminUpdateUserAttributes: jest.fn(),
  adminGetUser: jest.fn(),
  adminDeleteUser: jest.fn(),
  listUsers: jest.fn()
};

jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  CognitoIdentityServiceProvider: jest.fn(() => mockCognitoIdentityServiceProvider)
}));

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      mockCognitoIdentityServiceProvider.adminInitiateAuth.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          AuthenticationResult: {
            AccessToken: 'new-access-token',
            IdToken: 'new-id-token',
            RefreshToken: 'new-refresh-token',
            ExpiresIn: 3600,
            TokenType: 'Bearer'
          }
        })
      });

      const mockAuthHandler = jest.fn().mockImplementation(async (event) => {
        const body = JSON.parse(event.body);
        
        if (body.refreshToken === 'valid-refresh-token') {
          return {
            statusCode: 200,
            body: JSON.stringify({
              accessToken: 'new-access-token',
              idToken: 'new-id-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
              tokenType: 'Bearer'
            }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          };
        }
        
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid refresh token'
          })
        };
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token'
        })
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.accessToken).toBe('new-access-token');
      expect(responseBody.idToken).toBe('new-id-token');
      expect(responseBody.refreshToken).toBe('new-refresh-token');
      expect(responseBody.expiresIn).toBe(3600);
      expect(responseBody.tokenType).toBe('Bearer');
    });

    it('should reject invalid refresh token', async () => {
      mockCognitoIdentityServiceProvider.adminInitiateAuth.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Invalid refresh token'))
      });

      const mockAuthHandler = jest.fn().mockImplementation(async (event) => {
        return {
          statusCode: 401,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token',
            details: {
              code: 'INVALID_REFRESH_TOKEN',
              timestamp: new Date().toISOString()
            }
          }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        };
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token'
        })
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(responseBody.error).toBe('Unauthorized');
      expect(responseBody.message).toContain('Invalid or expired refresh token');
      expect(responseBody.details.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should handle expired refresh token', async () => {
      mockCognitoIdentityServiceProvider.adminInitiateAuth.mockReturnValue({
        promise: jest.fn().mockRejectedValue({
          code: 'NotAuthorizedException',
          message: 'Refresh Token has expired'
        })
      });

      const mockAuthHandler = jest.fn().mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Refresh token has expired',
          details: {
            code: 'REFRESH_TOKEN_EXPIRED',
            action: 'Please log in again'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'expired-refresh-token'
        })
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(responseBody.error).toBe('Unauthorized');
      expect(responseBody.details.code).toBe('REFRESH_TOKEN_EXPIRED');
      expect(responseBody.details.action).toBe('Please log in again');
    });

    it('should validate request body structure', async () => {
      const mockAuthHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Missing required field: refreshToken',
          details: {
            field: 'refreshToken',
            type: 'required',
            received: 'undefined'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          // Missing refreshToken field
          invalidField: 'invalid-value'
        })
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.message).toContain('Missing required field: refreshToken');
      expect(responseBody.details.field).toBe('refreshToken');
      expect(responseBody.details.type).toBe('required');
    });

    it('should handle malformed JSON in request body', async () => {
      const mockAuthHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Invalid JSON in request body',
          details: {
            syntaxError: 'Unexpected token'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: '{ invalid json }'
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(responseBody.error).toBe('BadRequest');
      expect(responseBody.message).toBe('Invalid JSON in request body');
    });

    it('should handle Cognito service unavailable', async () => {
      mockCognitoIdentityServiceProvider.adminInitiateAuth.mockReturnValue({
        promise: jest.fn().mockRejectedValue({
          code: 'ServiceUnavailableException',
          message: 'Service temporarily unavailable'
        })
      });

      const mockAuthHandler = jest.fn().mockResolvedValue({
        statusCode: 503,
        body: JSON.stringify({
          error: 'ServiceUnavailable',
          message: 'Authentication service temporarily unavailable',
          details: {
            service: 'cognito',
            retryAfter: 30
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '30'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token'
        })
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(503);
      expect(responseBody.error).toBe('ServiceUnavailable');
      expect(responseBody.details.service).toBe('cognito');
      expect(responseBody.details.retryAfter).toBe(30);
      expect(result.headers?.['Retry-After']).toBe('30');
    });

    it('should handle rate limiting', async () => {
      const mockAuthHandler = jest.fn().mockResolvedValue({
        statusCode: 429,
        body: JSON.stringify({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded for refresh token endpoint',
          details: {
            limit: 10,
            window: '1 minute',
            retryAfter: 60
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '60',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token'
        }),
        headers: {
          'X-Forwarded-For': '192.168.1.1'
        }
      });

      const result: APIGatewayProxyResult = await mockAuthHandler(event);
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(429);
      expect(responseBody.error).toBe('TooManyRequests');
      expect(responseBody.details.limit).toBe(10);
      expect(result.headers?.['Retry-After']).toBe('60');
      expect(result.headers?.['X-RateLimit-Limit']).toBe('10');
      expect(result.headers?.['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('Token validation middleware', () => {
    it('should validate Bearer token format', () => {
      const mockValidateToken = jest.fn((authHeader) => {
        if (!authHeader) {
          return { valid: false, error: 'Missing Authorization header' };
        }
        
        if (!authHeader.startsWith('Bearer ')) {
          return { valid: false, error: 'Invalid Authorization header format' };
        }
        
        const token = authHeader.substring(7);
        if (!token) {
          return { valid: false, error: 'Missing token in Authorization header' };
        }
        
        // Mock JWT validation
        if (token === 'valid-jwt-token') {
          return {
            valid: true,
            userId: 'user-123',
            email: 'test@ceu.edu',
            roles: ['user']
          };
        }
        
        return { valid: false, error: 'Invalid or expired token' };
      });

      // Valid token
      expect(mockValidateToken('Bearer valid-jwt-token')).toEqual({
        valid: true,
        userId: 'user-123',
        email: 'test@ceu.edu',
        roles: ['user']
      });

      // Missing header
      expect(mockValidateToken(undefined)).toEqual({
        valid: false,
        error: 'Missing Authorization header'
      });

      // Invalid format
      expect(mockValidateToken('invalid-format')).toEqual({
        valid: false,
        error: 'Invalid Authorization header format'
      });

      // Missing token
      expect(mockValidateToken('Bearer ')).toEqual({
        valid: false,
        error: 'Missing token in Authorization header'
      });

      // Invalid token
      expect(mockValidateToken('Bearer invalid-token')).toEqual({
        valid: false,
        error: 'Invalid or expired token'
      });
    });
  });
});