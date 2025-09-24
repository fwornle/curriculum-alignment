import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios, { AxiosResponse } from 'axios';

// Security test for authentication vulnerabilities
describe('Authentication Security Tests', () => {
  const baseUrl = global.SECURITY_CONFIG.baseUrl;
  const mockCreds = global.MOCK_CREDENTIALS;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Token Security', () => {
    it('should reject expired JWT tokens', async () => {
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer ${mockCreds.expiredToken}`,
        },
        validateStatus: () => true, // Accept all status codes for testing
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toMatch(/expired|invalid/i);
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        mockCreds.maliciousToken,
        mockCreds.sqlInjectionToken,
      ];

      for (const token of malformedTokens) {
        const response = await axios.get(`${baseUrl}/api/programs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should not leak sensitive information in error responses', async () => {
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer invalid-token-12345`,
        },
        validateStatus: () => true,
      });
      
      expect(response.status).toBe(401);
      expect(response.data.error).not.toMatch(/secret|key|password|database|internal/i);
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should validate JWT signature properly', async () => {
      // Test with token that has valid structure but invalid signature
      const invalidSignatureToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.invalid_signature';
      
      const response = await axios.get(`${baseUrl}/api/programs`, {
        headers: {
          'Authorization': `Bearer ${invalidSignatureToken}`,
        },
        validateStatus: () => true,
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Authentication Bypass Attempts', () => {
    it('should prevent authentication bypass via header manipulation', async () => {
      const bypassAttempts = [
        { 'X-User-ID': '1', 'X-Admin': 'true' },
        { 'X-Forwarded-User': 'admin@example.com' },
        { 'X-Real-IP': '127.0.0.1', 'X-User': 'admin' },
        { 'User-Agent': 'admin' },
        { 'Referer': 'http://localhost/admin' },
      ];

      for (const headers of bypassAttempts) {
        const response = await axios.get(`${baseUrl}/api/admin/users`, {
          headers,
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(401);
      }
    });

    it('should prevent SQL injection in authentication', async () => {
      const sqlInjectionAttempts = [
        "admin'; --",
        "admin' OR '1'='1",
        "admin') OR ('1'='1",
        "admin' UNION SELECT * FROM users --",
        "'; DROP TABLE users; --",
      ];

      for (const payload of sqlInjectionAttempts) {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
          email: payload,
          password: 'password',
        }, {
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(400);
        expect(response.data.error).not.toMatch(/SQL|syntax|database/i);
      }
    });

    it('should prevent NoSQL injection attempts', async () => {
      const noSqlInjectionAttempts = [
        { '$ne': null },
        { '$gt': '' },
        { '$regex': '.*' },
        { '$where': 'this.password == this.username' },
      ];

      for (const payload of noSqlInjectionAttempts) {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
          email: payload,
          password: 'password',
        }, {
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement rate limiting for login attempts', async () => {
      const loginAttempts = [];
      
      // Attempt multiple failed logins rapidly
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          axios.post(`${baseUrl}/api/auth/login`, {
            email: 'test@example.com',
            password: `wrong-password-${i}`,
          }, {
            validateStatus: () => true,
          })
        );
      }
      
      const responses = await Promise.all(loginAttempts);
      
      // Should start rate limiting after several attempts
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should not reveal user existence through timing attacks', async () => {
      const existingUser = mockCreds.testUserEmail;
      const nonExistentUser = 'nonexistent-user@example.com';
      
      // Measure response times
      const measureResponseTime = async (email: string): Promise<number> => {
        const startTime = Date.now();
        await axios.post(`${baseUrl}/api/auth/login`, {
          email,
          password: 'wrong-password',
        }, {
          validateStatus: () => true,
        });
        return Date.now() - startTime;
      };
      
      const existingUserTimes = await Promise.all([
        measureResponseTime(existingUser),
        measureResponseTime(existingUser),
        measureResponseTime(existingUser),
      ]);
      
      const nonExistentUserTimes = await Promise.all([
        measureResponseTime(nonExistentUser),
        measureResponseTime(nonExistentUser),
        measureResponseTime(nonExistentUser),
      ]);
      
      const avgExistingTime = existingUserTimes.reduce((a, b) => a + b, 0) / existingUserTimes.length;
      const avgNonExistentTime = nonExistentUserTimes.reduce((a, b) => a + b, 0) / nonExistentUserTimes.length;
      
      // Response times should be similar (within 100ms) to prevent timing attacks
      const timeDifference = Math.abs(avgExistingTime - avgNonExistentTime);
      expect(timeDifference).toBeLessThan(100);
    });
  });

  describe('Session Management Security', () => {
    it('should invalidate sessions on logout', async () => {
      // First, login to get a token
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: mockCreds.testUserEmail,
        password: mockCreds.testUserPassword,
      }, {
        validateStatus: () => true,
      });
      
      if (loginResponse.status === 200 && loginResponse.data.token) {
        const token = loginResponse.data.token;
        
        // Verify token works
        const protectedResponse1 = await axios.get(`${baseUrl}/api/programs`, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true,
        });
        expect(protectedResponse1.status).toBe(200);
        
        // Logout
        await axios.post(`${baseUrl}/api/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true,
        });
        
        // Token should now be invalid
        const protectedResponse2 = await axios.get(`${baseUrl}/api/programs`, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true,
        });
        expect(protectedResponse2.status).toBe(401);
      }
    });

    it('should implement secure session cookies', async () => {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        email: mockCreds.testUserEmail,
        password: mockCreds.testUserPassword,
      }, {
        validateStatus: () => true,
      });
      
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'];
        const sessionCookie = cookies.find((cookie: string) => 
          cookie.includes('session') || cookie.includes('auth')
        );
        
        if (sessionCookie) {
          expect(sessionCookie).toMatch(/HttpOnly/i);
          expect(sessionCookie).toMatch(/Secure/i);
          expect(sessionCookie).toMatch(/SameSite/i);
        }
      }
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'admin',
        'qwerty',
        'password123',
        'admin123',
        '12345678',
        'test',
      ];

      for (const weakPassword of weakPasswords) {
        const response = await axios.post(`${baseUrl}/api/auth/register`, {
          email: 'test@example.com',
          password: weakPassword,
        }, {
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/password|strength|requirements/i);
      }
    });

    it('should not store passwords in plaintext', async () => {
      // This test would require database access to verify password hashing
      // For now, we'll test that password reset doesn't return the actual password
      const response = await axios.post(`${baseUrl}/api/auth/forgot-password`, {
        email: mockCreds.testUserEmail,
      }, {
        validateStatus: () => true,
      });
      
      if (response.status === 200) {
        expect(response.data).not.toHaveProperty('password');
        expect(JSON.stringify(response.data)).not.toMatch(/password.*:/i);
      }
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should require MFA for admin accounts', async () => {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        email: mockCreds.adminEmail,
        password: mockCreds.adminPassword,
      }, {
        validateStatus: () => true,
      });
      
      // Should either require MFA or indicate MFA is needed
      if (response.status === 200) {
        expect(response.data.requiresMFA || response.data.mfaRequired).toBe(true);
      }
    });

    it('should validate MFA tokens properly', async () => {
      const invalidMFACodes = [
        '000000',
        '123456',
        'invalid',
        '999999',
        '',
        'abcdef',
      ];

      for (const mfaCode of invalidMFACodes) {
        const response = await axios.post(`${baseUrl}/api/auth/verify-mfa`, {
          email: mockCreds.adminEmail,
          mfaCode,
        }, {
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(400);
      }
    });
  });
});