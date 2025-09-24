// k6 Load Testing Utilities
// Shared utility functions for all load tests

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getAuthHeaders, isTokenValid, generateTestData } from './config.js';

// Custom metrics
export const errorRate = new Rate('errors');
export const responseTime = new Trend('response_time');
export const requestCount = new Counter('requests');
export const authFailures = new Counter('auth_failures');
export const uploadSuccesses = new Counter('upload_successes');
export const analysisStarts = new Counter('analysis_starts');

// Authentication utilities
export function authenticate() {
  const payload = {
    email: config.auth.email,
    password: config.auth.password
  };
  
  const response = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify(payload),
    {
      headers: config.requestOptions.headers,
      tags: { name: 'auth' }
    }
  );
  
  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken && body.accessToken.length > 0;
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      config.tokens.accessToken = body.accessToken;
      config.tokens.refreshToken = body.refreshToken;
      config.tokens.expiresAt = Date.now() + (body.expiresIn * 1000);
    } catch (error) {
      console.error('Failed to parse login response:', error);
      authFailures.add(1);
    }
  } else {
    authFailures.add(1);
    console.error('Authentication failed:', response.status, response.body);
  }
  
  return success;
}

export function refreshToken() {
  if (!config.tokens.refreshToken) {
    return authenticate();
  }
  
  const payload = {
    refreshToken: config.tokens.refreshToken
  };
  
  const response = http.post(
    `${config.baseUrl}/auth/refresh`,
    JSON.stringify(payload),
    {
      headers: config.requestOptions.headers,
      tags: { name: 'auth_refresh' }
    }
  );
  
  const success = check(response, {
    'refresh successful': (r) => r.status === 200
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      config.tokens.accessToken = body.accessToken;
      config.tokens.expiresAt = Date.now() + (body.expiresIn * 1000);
    } catch (error) {
      console.error('Failed to parse refresh response:', error);
    }
  }
  
  return success;
}

export function ensureAuthenticated() {
  if (!isTokenValid()) {
    if (config.tokens.refreshToken) {
      if (!refreshToken()) {
        return authenticate();
      }
    } else {
      return authenticate();
    }
  }
  return true;
}

// HTTP request utilities
export function makeAuthenticatedRequest(method, url, body = null, options = {}) {
  if (!ensureAuthenticated()) {
    errorRate.add(1);
    return null;
  }
  
  const requestOptions = {
    headers: getAuthHeaders(),
    ...options
  };
  
  let response;
  
  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, requestOptions);
      break;
    case 'POST':
      response = http.post(url, body, requestOptions);
      break;
    case 'PUT':
      response = http.put(url, body, requestOptions);
      break;
    case 'DELETE':
      response = http.del(url, requestOptions);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
  
  // Record metrics
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  if (response.status >= 400) {
    errorRate.add(1);
  }
  
  return response;
}

// Health check utility
export function healthCheck() {
  const response = http.get(`${config.baseUrl}/health`, {
    tags: { name: 'health' }
  });
  
  return check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1s': (r) => r.timings.duration < 1000,
    'health check body contains status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch {
        return false;
      }
    }
  });
}

// Program management utilities
export function createProgram() {
  const testData = generateTestData();
  
  const response = makeAuthenticatedRequest(
    'POST',
    `${config.baseUrl}/programs`,
    JSON.stringify(testData.program),
    { tags: { name: 'programs_create' } }
  );
  
  if (response) {
    const success = check(response, {
      'program creation successful': (r) => r.status === 201,
      'program response has ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.id.length > 0;
        } catch {
          return false;
        }
      }
    });
    
    if (success) {
      try {
        const body = JSON.parse(response.body);
        return body.id;
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

export function getPrograms() {
  const response = makeAuthenticatedRequest(
    'GET',
    `${config.baseUrl}/programs`,
    null,
    { tags: { name: 'programs_list' } }
  );
  
  if (response) {
    return check(response, {
      'programs list successful': (r) => r.status === 200,
      'programs list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.programs);
        } catch {
          return false;
        }
      }
    });
  }
  
  return false;
}

export function getProgram(programId) {
  const response = makeAuthenticatedRequest(
    'GET',
    `${config.baseUrl}/programs/${programId}`,
    null,
    { tags: { name: 'programs_get' } }
  );
  
  if (response) {
    return check(response, {
      'program get successful': (r) => r.status === 200,
      'program response has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === programId;
        } catch {
          return false;
        }
      }
    });
  }
  
  return false;
}

// Document upload utilities
export function uploadDocument() {
  const testData = generateTestData();
  
  const response = makeAuthenticatedRequest(
    'POST',
    `${config.baseUrl}/documents/upload`,
    JSON.stringify(testData.document),
    { tags: { name: 'document_upload' } }
  );
  
  if (response) {
    const success = check(response, {
      'document upload successful': (r) => r.status === 201,
      'document response has ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.id.length > 0;
        } catch {
          return false;
        }
      }
    });
    
    if (success) {
      uploadSuccesses.add(1);
      try {
        const body = JSON.parse(response.body);
        return body.id;
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

// Analysis workflow utilities
export function startAnalysis() {
  const testData = generateTestData();
  
  const response = makeAuthenticatedRequest(
    'POST',
    `${config.baseUrl}/analysis/start`,
    JSON.stringify(testData.analysis),
    { tags: { name: 'analysis_start' } }
  );
  
  if (response) {
    const success = check(response, {
      'analysis start successful': (r) => r.status === 202,
      'analysis response has ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.id.length > 0;
        } catch {
          return false;
        }
      }
    });
    
    if (success) {
      analysisStarts.add(1);
      try {
        const body = JSON.parse(response.body);
        return body.id;
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

export function getAnalysisStatus(analysisId) {
  const response = makeAuthenticatedRequest(
    'GET',
    `${config.baseUrl}/analysis/${analysisId}`,
    null,
    { tags: { name: 'analysis_status' } }
  );
  
  if (response) {
    const success = check(response, {
      'analysis status successful': (r) => r.status === 200,
      'analysis status has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === analysisId && body.status;
        } catch {
          return false;
        }
      }
    });
    
    if (success) {
      try {
        const body = JSON.parse(response.body);
        return body.status;
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

// Load testing patterns
export function userWorkflow() {
  // Simulate realistic user workflow
  
  // 1. Health check
  healthCheck();
  sleep(1);
  
  // 2. Authentication
  if (!ensureAuthenticated()) {
    return;
  }
  sleep(1);
  
  // 3. Browse programs (80% of users)
  if (Math.random() < 0.8) {
    getPrograms();
    sleep(2);
    
    // View specific program (50% of browsers)
    if (Math.random() < 0.5) {
      getProgram(config.testData.programId);
      sleep(3);
    }
  }
  
  // 4. Upload document (20% of users)
  if (Math.random() < 0.2) {
    uploadDocument();
    sleep(5);
  }
  
  // 5. Start analysis (10% of users)
  if (Math.random() < 0.1) {
    const analysisId = startAnalysis();
    if (analysisId) {
      sleep(2);
      // Check status once
      getAnalysisStatus(analysisId);
    }
  }
  
  // Random think time
  sleep(Math.random() * 5 + 1);
}

export function adminWorkflow() {
  // Simulate admin user workflow with more operations
  
  if (!ensureAuthenticated()) {
    return;
  }
  
  // Create new program
  const programId = createProgram();
  sleep(2);
  
  if (programId) {
    // View created program
    getProgram(programId);
    sleep(1);
    
    // Upload document for program
    uploadDocument();
    sleep(3);
    
    // Start analysis
    const analysisId = startAnalysis();
    if (analysisId) {
      sleep(5);
      getAnalysisStatus(analysisId);
    }
  }
  
  sleep(Math.random() * 3 + 1);
}

// Utility for graceful degradation
export function handleError(response, operation) {
  if (!response) {
    console.error(`${operation}: No response received`);
    return false;
  }
  
  if (response.status >= 500) {
    console.error(`${operation}: Server error ${response.status}`);
    errorRate.add(1);
    return false;
  }
  
  if (response.status === 429) {
    console.warn(`${operation}: Rate limited, backing off`);
    sleep(Math.random() * 5 + 5); // Wait 5-10 seconds
    return false;
  }
  
  if (response.status >= 400) {
    console.warn(`${operation}: Client error ${response.status}`);
    errorRate.add(1);
    return false;
  }
  
  return true;
}