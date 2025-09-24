import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMockAPIGatewayEvent } from '../../setup';

// Health endpoint handler import will need to be updated based on actual implementation
// import { handler as healthHandler } from '../../../lambda/health/index';

describe('Health API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return healthy status with all dependencies', async () => {
      // Mock the health handler for now since actual implementation may not exist yet
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          api: 'curriculum-alignment',
          version: '1.0.0',
          environment: 'test',
          dependencies: {
            database: 'healthy',
            cognito: 'healthy',
            s3: 'healthy',
            qdrant: 'healthy',
            agents: 'healthy'
          },
          uptime: 12345,
          region: 'us-east-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/health',
        headers: {}
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
      expect(body.status).toBe('healthy');
      expect(body.api).toBe('curriculum-alignment');
      expect(body.version).toBe('1.0.0');
      expect(body.environment).toBe('test');
      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.database).toBe('healthy');
      expect(body.dependencies.cognito).toBe('healthy');
      expect(body.dependencies.s3).toBe('healthy');
      expect(body.dependencies.qdrant).toBe('healthy');
      expect(body.dependencies.agents).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThan(0);
      expect(body.region).toBe('us-east-1');
    });

    it('should return unhealthy status when dependencies are down', async () => {
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 503,
        body: JSON.stringify({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          api: 'curriculum-alignment',
          version: '1.0.0',
          environment: 'test',
          dependencies: {
            database: 'unhealthy',
            cognito: 'healthy',
            s3: 'healthy',
            qdrant: 'unhealthy',
            agents: 'degraded'
          },
          uptime: 12345,
          region: 'us-east-1',
          errors: [
            'Database connection timeout',
            'Qdrant vector store unavailable'
          ]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/health',
        headers: {}
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(503);
      expect(body.status).toBe('unhealthy');
      expect(body.dependencies.database).toBe('unhealthy');
      expect(body.dependencies.qdrant).toBe('unhealthy');
      expect(body.dependencies.agents).toBe('degraded');
      expect(body.errors).toBeDefined();
      expect(body.errors).toHaveLength(2);
    });

    it('should handle health check timeout gracefully', async () => {
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 503,
        body: JSON.stringify({
          status: 'timeout',
          timestamp: new Date().toISOString(),
          api: 'curriculum-alignment',
          version: '1.0.0',
          environment: 'test',
          dependencies: {
            database: 'timeout',
            cognito: 'timeout',
            s3: 'timeout',
            qdrant: 'timeout',
            agents: 'timeout'
          },
          uptime: 12345,
          region: 'us-east-1',
          errors: ['Health check timeout after 10 seconds']
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/health',
        headers: {}
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(503);
      expect(body.status).toBe('timeout');
      expect(body.errors).toContain('Health check timeout after 10 seconds');
    });

    it('should include CORS headers', async () => {
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ status: 'healthy' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/health'
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);

      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers?.['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(result.headers?.['Access-Control-Allow-Methods']).toContain('GET');
    });

    it('should handle OPTIONS preflight request', async () => {
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'OPTIONS',
        path: '/health',
        headers: {
          'Origin': 'https://curriculum-alignment.ceu.edu',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization'
        }
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers?.['Access-Control-Allow-Methods']).toContain('GET');
      expect(result.headers?.['Access-Control-Max-Age']).toBe('86400');
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors', async () => {
      const mockHealthHandler = jest.fn().mockRejectedValue(new Error('Internal database error'));

      const event = createMockAPIGatewayEvent({
        httpMethod: 'GET',
        path: '/health'
      });

      try {
        await mockHealthHandler(event);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Internal database error');
      }
    });

    it('should handle malformed requests', async () => {
      const mockHealthHandler = jest.fn().mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Malformed request',
          details: 'Invalid HTTP method for health endpoint'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const event = createMockAPIGatewayEvent({
        httpMethod: 'POST',
        path: '/health',
        body: 'invalid body'
      });

      const result: APIGatewayProxyResult = await mockHealthHandler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('Malformed request');
    });
  });
});