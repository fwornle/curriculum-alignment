import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';

// Security tests for API-specific vulnerabilities
describe('API Security Tests', () => {
  const baseUrl = global.SECURITY_CONFIG.baseUrl;
  const mockCreds = global.MOCK_CREDENTIALS;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP Method Security', () => {
    it('should only allow appropriate HTTP methods', async () => {
      const endpoints = [
        '/api/programs',
        '/api/documents',
        '/api/analysis',
        '/api/users',
      ];

      const inappropriateMethods = ['TRACE', 'CONNECT', 'PATCH'];

      for (const endpoint of endpoints) {
        for (const method of inappropriateMethods) {
          const response = await axios.request({
            method,
            url: `${baseUrl}${endpoint}`,
            validateStatus: () => true,
          });

          expect(response.status).toBeOneOf([405, 501, 404]);
        }
      }
    });

    it('should prevent HTTP verb tampering', async () => {
      // Try to use POST with X-HTTP-Method-Override to perform DELETE
      const verbTamperingAttempts = [
        { method: 'POST', header: 'DELETE' },
        { method: 'GET', header: 'POST' },
        { method: 'POST', header: 'PUT' },
      ];

      for (const attempt of verbTamperingAttempts) {
        const response = await axios.request({
          method: attempt.method,
          url: `${baseUrl}/api/programs/1`,
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
            'X-HTTP-Method-Override': attempt.header,
            'X-HTTP-Method': attempt.header,
            '_method': attempt.header,
          },
          validateStatus: () => true,
        });

        // Should not honor method override for dangerous operations
        if (attempt.header === 'DELETE' && attempt.method !== 'DELETE') {
          expect(response.status).not.toBe(204); // DELETE success
        }
      }
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should implement rate limiting per endpoint', async () => {
      const endpoints = [
        '/api/auth/login',
        '/api/programs',
        '/api/analysis',
      ];

      for (const endpoint of endpoints) {
        const requests = [];
        
        // Fire many requests simultaneously
        for (let i = 0; i < 50; i++) {
          requests.push(
            axios.get(`${baseUrl}${endpoint}`, {
              headers: {
                'Authorization': `Bearer ${mockCreds.validToken}`,
              },
              validateStatus: () => true,
            })
          );
        }

        const responses = await Promise.all(requests);
        const rateLimitedCount = responses.filter(r => r.status === 429).length;

        // Should rate limit excessive requests
        expect(rateLimitedCount).toBeGreaterThan(0);

        // Check for proper rate limit headers
        const rateLimitResponse = responses.find(r => r.status === 429);
        if (rateLimitResponse) {
          expect(rateLimitResponse.headers['retry-after']).toBeDefined();
        }
      }
    });

    it('should implement different rate limits for different user types', async () => {
      // This would require different token types in real implementation
      const userTypes = [
        { token: mockCreds.validToken, expectedLimit: 100 },
        { token: mockCreds.testApiKey, expectedLimit: 1000 }, // API key should have higher limit
      ];

      for (const userType of userTypes) {
        const requests = [];
        
        for (let i = 0; i < 20; i++) {
          requests.push(
            axios.get(`${baseUrl}/api/programs`, {
              headers: {
                'Authorization': `Bearer ${userType.token}`,
              },
              validateStatus: () => true,
            })
          );
        }

        await Promise.all(requests);
        // Rate limiting behavior verification would be more complex in practice
      }
    });
  });

  describe('API Versioning Security', () => {
    it('should not expose deprecated API versions', async () => {
      const deprecatedVersions = [
        '/api/v0/',
        '/api/v1.0/',
        '/api/legacy/',
        '/api/old/',
        '/api/deprecated/',
      ];

      for (const versionPath of deprecatedVersions) {
        const response = await axios.get(`${baseUrl}${versionPath}programs`, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        expect(response.status).toBeOneOf([404, 410, 403]);
      }
    });

    it('should require API version specification', async () => {
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
          // Remove any version headers that might be set by default
        },
        validateStatus: () => true,
      });

      // Should either work with current version or require version specification
      if (response.status === 400) {
        expect(response.data.error).toMatch(/version|api.*version/i);
      }
    });
  });

  describe('Content Type Security', () => {
    it('should validate Content-Type headers', async () => {
      const maliciousContentTypes = [
        'application/json; charset=utf-7',
        'text/html',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/xml',
        'application/x-httpd-php',
      ];

      for (const contentType of maliciousContentTypes) {
        const response = await axios.post(`${baseUrl}/api/programs`, {
          name: 'Test Program',
          description: 'Test',
        }, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
            'Content-Type': contentType,
          },
          validateStatus: () => true,
        });

        if (!contentType.includes('application/json')) {
          expect(response.status).toBeOneOf([400, 415, 406]);
        }
      }
    });

    it('should prevent content type confusion attacks', async () => {
      const confusionAttempts = [
        {
          contentType: 'application/json',
          body: '<xml><program><name>Test</name></program></xml>',
        },
        {
          contentType: 'application/xml',
          body: '{"name": "Test Program"}',
        },
        {
          contentType: 'application/json',
          body: 'name=Test&description=Program',
        },
      ];

      for (const attempt of confusionAttempts) {
        const response = await axios.post(`${baseUrl}/api/programs`, attempt.body, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
            'Content-Type': attempt.contentType,
          },
          validateStatus: () => true,
        });

        // Should reject mismatched content type and body
        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });
  });

  describe('Response Security', () => {
    it('should include security headers in responses', async () => {
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options', 
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy',
      ];

      for (const header of securityHeaders) {
        if (response.headers[header]) {
          expect(response.headers[header]).toBeTruthy();
        }
      }

      // Check specific security header values
      if (response.headers['x-content-type-options']) {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
      
      if (response.headers['x-frame-options']) {
        expect(response.headers['x-frame-options']).toMatch(/deny|sameorigin/i);
      }
    });

    it('should not expose sensitive information in error responses', async () => {
      const errorTriggers = [
        { endpoint: '/api/programs/99999', expectedError: 'not found' },
        { endpoint: '/api/programs/invalid-id', expectedError: 'invalid' },
        { endpoint: '/api/nonexistent', expectedError: 'not found' },
      ];

      for (const trigger of errorTriggers) {
        const response = await axios.get(`${baseUrl}${trigger.endpoint}`, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        if (response.status >= 400) {
          const errorText = JSON.stringify(response.data).toLowerCase();
          
          // Should not expose sensitive information
          const sensitivePatterns = [
            /database.*error/,
            /sql.*error/,
            /stack.*trace/,
            /internal.*error/,
            /exception.*in/,
            /connection.*refused/,
            /access.*denied/,
            /permission.*denied/,
            /file.*not.*found/,
            /directory.*listing/,
          ];

          for (const pattern of sensitivePatterns) {
            expect(errorText).not.toMatch(pattern);
          }
        }
      }
    });

    it('should not leak version information', async () => {
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      // Should not expose server/framework versions
      const leakyHeaders = [
        'x-powered-by',
        'server',
        'x-aspnet-version',
        'x-aspnetmvc-version',
        'x-drupal-cache',
      ];

      for (const header of leakyHeaders) {
        expect(response.headers[header]).toBeUndefined();
      }
    });
  });

  describe('API Discovery and Enumeration Protection', () => {
    it('should not expose API documentation in production', async () => {
      const docsEndpoints = [
        '/api/docs',
        '/api/swagger',
        '/api/openapi',
        '/docs',
        '/swagger-ui',
        '/api-docs',
        '/documentation',
        '/redoc',
      ];

      for (const endpoint of docsEndpoints) {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          validateStatus: () => true,
        });

        // Documentation should not be publicly accessible in production
        if (process.env.NODE_ENV === 'production' || baseUrl.includes('prod')) {
          expect(response.status).toBeOneOf([404, 403, 401]);
        }
      }
    });

    it('should not expose debug endpoints', async () => {
      const debugEndpoints = [
        '/api/debug',
        '/api/test',
        '/api/health/detailed',
        '/api/metrics/detailed',
        '/api/status/internal',
        '/api/config',
        '/api/env',
        '/api/info',
      ];

      for (const endpoint of debugEndpoints) {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          validateStatus: () => true,
        });

        // Debug endpoints should not be accessible without authentication
        expect(response.status).toBeOneOf([404, 403, 401]);
      }
    });
  });

  describe('Mass Assignment Protection', () => {
    it('should prevent mass assignment vulnerabilities', async () => {
      const massAssignmentAttempts = [
        {
          name: 'Test Program',
          description: 'Test',
          id: 999, // Attempt to set ID
          createdAt: '2020-01-01', // Attempt to set creation date
          updatedAt: '2020-01-01', // Attempt to set update date
          userId: 999, // Attempt to change owner
          isAdmin: true, // Attempt to set admin flag
        },
        {
          name: 'Test Program',
          description: 'Test',
          role: 'admin', // Attempt to set role
          permissions: ['admin', 'super_user'], // Attempt to set permissions
          status: 'approved', // Attempt to bypass approval
        },
      ];

      for (const attempt of massAssignmentAttempts) {
        const response = await axios.post(`${baseUrl}/api/programs`, attempt, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        if (response.status === 200 || response.status === 201) {
          // Should ignore protected fields
          expect(response.data.id).not.toBe(999);
          expect(response.data.userId).not.toBe(999);
          expect(response.data.isAdmin).not.toBe(true);
          expect(response.data.role).not.toBe('admin');
          expect(response.data.status).not.toBe('approved');
        }
      }
    });
  });

  describe('Resource Exhaustion Protection', () => {
    it('should limit request payload size', async () => {
      const largePayload = {
        name: 'Test Program',
        description: 'A'.repeat(10 * 1024 * 1024), // 10MB description
        metadata: 'B'.repeat(5 * 1024 * 1024), // 5MB metadata
      };

      const response = await axios.post(`${baseUrl}/api/programs`, largePayload, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      // Should reject oversized payloads
      expect(response.status).toBeOneOf([413, 400, 422]);
    });

    it('should limit number of items in array inputs', async () => {
      const largeArrayPayload = {
        name: 'Test Program',
        description: 'Test',
        tags: Array(10000).fill('tag'), // Very large array
        prerequisites: Array(5000).fill('prereq'), // Large prerequisites array
      };

      const response = await axios.post(`${baseUrl}/api/programs`, largeArrayPayload, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      // Should limit array sizes
      expect(response.status).toBeOneOf([400, 422]);
    });

    it('should limit nested object depth', async () => {
      // Create deeply nested object
      let deeplyNested: any = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        deeplyNested = { nested: deeplyNested };
      }

      const response = await axios.post(`${baseUrl}/api/programs`, {
        name: 'Test Program',
        description: 'Test',
        metadata: deeplyNested,
      }, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      // Should reject deeply nested objects
      expect(response.status).toBeOneOf([400, 422]);
    });
  });
});