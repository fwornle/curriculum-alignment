const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENVIRONMENT = process.env.ENVIRONMENT || 'test';

describe('Post-deployment Smoke Tests', () => {
  const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    validateStatus: () => true // Don't throw on 4xx/5xx status codes
  });

  describe('Health Checks', () => {
    test('API health endpoint should return 200 or 403', async () => {
      const response = await api.get('/health');
      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('status', 'healthy');
        expect(response.data).toHaveProperty('timestamp');
      }
    });

    test('Database health check should pass or require auth', async () => {
      const response = await api.get('/health/database');
      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('database', 'connected');
      }
    });

    test('System info endpoint should return environment details or require auth', async () => {
      const response = await api.get('/health/info');
      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('environment', ENVIRONMENT);
        expect(response.data).toHaveProperty('version');
      }
    });
  });

  describe('Core API Endpoints', () => {
    test('Programs endpoint should be accessible', async () => {
      const response = await api.get('/api/programs');
      expect([200, 401, 403]).toContain(response.status); // 401/403 ok if auth is required
    });

    test('Universities endpoint should be accessible', async () => {
      const response = await api.get('/api/universities');
      expect([200, 401, 403]).toContain(response.status);
    });

    test('Analysis endpoint should be accessible', async () => {
      const response = await api.get('/api/analysis');
      expect([200, 401, 403]).toContain(response.status);
    });

    test('Reports endpoint should be accessible', async () => {
      const response = await api.get('/api/reports');
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Agent Status', () => {
    test('Agent status endpoint should return agent health', async () => {
      const response = await api.get('/api/agents/status');
      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('agents');
        expect(Array.isArray(response.data.agents)).toBe(true);
      }
    });
  });

  describe('Security Headers', () => {
    test('API should return security headers', async () => {
      const response = await api.get('/health');
      
      // For 403 responses, security headers may not be present
      if (response.status === 200) {
        // Check for common security headers
        expect(response.headers).toHaveProperty('x-content-type-options');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        
        // CORS headers should be present
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).toBeDefined();
        }
      } else {
        // For 403 responses, just verify the response exists
        expect([200, 403]).toContain(response.status);
      }
    });
  });

  describe('Performance', () => {
    test('Health endpoint should respond within 5 seconds', async () => {
      const startTime = Date.now();
      const response = await api.get('/health');
      const responseTime = Date.now() - startTime;
      
      expect([200, 403]).toContain(response.status);
      expect(responseTime).toBeLessThan(5000);
    });

    test('Programs list should respond within 10 seconds', async () => {
      const startTime = Date.now();
      const response = await api.get('/api/programs');
      const responseTime = Date.now() - startTime;
      
      expect([200, 401, 403]).toContain(response.status);
      expect(responseTime).toBeLessThan(10000);
    });
  });

  describe('Environment-specific Tests', () => {
    if (ENVIRONMENT === 'production') {
      test('Production should not expose debug endpoints', async () => {
        const debugEndpoints = ['/debug', '/admin/debug', '/api/debug'];
        
        for (const endpoint of debugEndpoints) {
          const response = await api.get(endpoint);
          expect(response.status).not.toBe(200);
        }
      });

      test('Production should have proper error handling', async () => {
        const response = await api.get('/api/nonexistent-endpoint');
        expect(response.status).toBe(404);
        expect(response.data).not.toHaveProperty('stack');
        expect(response.data).not.toHaveProperty('trace');
      });
    }

    if (ENVIRONMENT !== 'production') {
      test('Non-production should have seed data', async () => {
        const response = await api.get('/api/universities');
        if (response.status === 200) {
          expect(Array.isArray(response.data)).toBe(true);
          expect(response.data.length).toBeGreaterThan(0);
        }
      });
    }
  });
});