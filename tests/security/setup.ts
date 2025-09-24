import { config } from 'dotenv';
import { beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';

// Load test environment variables
config({ path: '.env.test' });

// Security test configuration
const SECURITY_TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 0, // No retries for security tests to avoid false positives
  verbose: true,
};

// Mock sensitive operations to prevent accidental real API calls
const mockCredentials = {
  validToken: 'test-valid-token-12345',
  expiredToken: 'test-expired-token-12345',
  invalidToken: 'test-invalid-token-12345',
  maliciousToken: '<script>alert("xss")</script>',
  sqlInjectionToken: "'; DROP TABLE users; --",
  testApiKey: 'test-api-key-12345',
  testUserEmail: 'security-test@example.com',
  testUserPassword: 'SecureTestPassword123!',
  adminEmail: 'admin-test@example.com',
  adminPassword: 'AdminTestPassword123!',
};

// Security test utilities
global.SECURITY_CONFIG = SECURITY_TEST_CONFIG;
global.MOCK_CREDENTIALS = mockCredentials;

// Prevent accidental real API calls during security testing
beforeAll(async () => {
  console.log('🔒 Starting Security Test Suite');
  console.log('🎯 Target:', SECURITY_TEST_CONFIG.baseUrl);
  console.log('⚠️  Security tests use mock credentials only');
  
  // Verify we're not running against production
  if (SECURITY_TEST_CONFIG.baseUrl.includes('production') || 
      SECURITY_TEST_CONFIG.baseUrl.includes('prod') ||
      process.env.NODE_ENV === 'production') {
    throw new Error('🚨 SECURITY TESTS CANNOT RUN AGAINST PRODUCTION!');
  }
  
  // Set up test isolation
  process.env.NODE_ENV = 'test';
  process.env.DISABLE_REAL_AUTH = 'true';
  process.env.MOCK_EXTERNAL_APIS = 'true';
});

beforeEach(() => {
  // Clear any state between tests
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  // Ensure no sensitive data leaks between tests
  delete process.env.TEST_AUTH_TOKEN;
  delete process.env.TEST_API_KEY;
});

afterAll(async () => {
  console.log('🔒 Security Test Suite Completed');
  
  // Clean up any test artifacts
  jest.restoreAllMocks();
});