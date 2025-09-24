// k6 Load Testing Configuration
// This file contains shared configuration for all load tests

export const config = {
  // Base URLs
  baseUrl: __ENV.API_BASE_URL || 'http://localhost:3001/api/v1',
  frontendUrl: __ENV.FRONTEND_BASE_URL || 'http://localhost:3000',
  
  // Authentication
  auth: {
    email: __ENV.TEST_USER_EMAIL || 'test.admin@ceu.edu',
    password: __ENV.TEST_USER_PASSWORD || 'TestAdmin123!'
  },
  
  // Test data
  testData: {
    programId: __ENV.TEST_PROGRAM_ID || 'test-cs-bachelor-2024',
    documentId: __ENV.TEST_DOCUMENT_ID || 'test-document-123',
    analysisId: __ENV.TEST_ANALYSIS_ID || 'test-analysis-456'
  },
  
  // Performance thresholds
  thresholds: {
    // Response time thresholds
    http_req_duration: {
      p95: 2000,  // 95% of requests should be below 2s
      p99: 5000   // 99% of requests should be below 5s
    },
    
    // Success rate thresholds
    http_req_failed: {
      rate: 0.05  // Error rate should be below 5%
    },
    
    // Specific endpoint thresholds
    'http_req_duration{name:health}': {
      p95: 500,   // Health endpoint should be fast
      p99: 1000
    },
    
    'http_req_duration{name:auth}': {
      p95: 3000,  // Auth can be slower due to hashing
      p99: 8000
    },
    
    'http_req_duration{name:analysis}': {
      p95: 10000, // Analysis operations can be slow
      p99: 30000
    },
    
    // Database operation thresholds
    'http_req_duration{name:programs_list}': {
      p95: 1000,
      p99: 3000
    },
    
    'http_req_duration{name:document_upload}': {
      p95: 15000, // File uploads can be slow
      p99: 45000
    }
  },
  
  // Load test stages
  stages: {
    // Smoke test - minimal load
    smoke: [
      { duration: '2m', target: 1 },
      { duration: '3m', target: 5 },
      { duration: '2m', target: 1 }
    ],
    
    // Load test - normal expected load
    load: [
      { duration: '5m', target: 10 },  // Ramp up
      { duration: '10m', target: 50 }, // Stay at normal load
      { duration: '5m', target: 10 },  // Scale down
      { duration: '2m', target: 0 }    // Cool down
    ],
    
    // Stress test - beyond normal capacity
    stress: [
      { duration: '5m', target: 20 },   // Ramp up to normal
      { duration: '5m', target: 50 },   // Reach normal capacity
      { duration: '10m', target: 100 }, // Stress level
      { duration: '5m', target: 150 },  // Beyond capacity
      { duration: '10m', target: 100 }, // Scale back to stress
      { duration: '5m', target: 20 },   // Scale back to normal
      { duration: '2m', target: 0 }     // Cool down
    ],
    
    // Spike test - sudden load increase
    spike: [
      { duration: '2m', target: 10 },   // Normal load
      { duration: '1m', target: 100 },  // Spike up
      { duration: '2m', target: 10 },   // Scale down
      { duration: '1m', target: 200 },  // Bigger spike
      { duration: '2m', target: 10 },   // Scale down
      { duration: '2m', target: 0 }     // Cool down
    ],
    
    // Volume test - large amounts of data
    volume: [
      { duration: '5m', target: 20 },
      { duration: '30m', target: 100 },
      { duration: '5m', target: 0 }
    ],
    
    // Soak test - extended duration
    soak: [
      { duration: '10m', target: 20 },  // Ramp up
      { duration: '4h', target: 30 },   // Extended run
      { duration: '10m', target: 0 }    // Cool down
    ]
  },
  
  // Request options
  requestOptions: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'k6-load-test/1.0.0'
    },
    timeout: '60s'
  },
  
  // Authentication tokens (set during test execution)
  tokens: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  },
  
  // Test scenarios
  scenarios: {
    // API-focused load testing
    api_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s'
    },
    
    // User workflow simulation
    user_workflow: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 100,
      maxDuration: '10m'
    },
    
    // Constant rate testing
    constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100
    }
  },
  
  // Monitoring and observability
  monitoring: {
    influxdb: {
      url: __ENV.INFLUXDB_URL || null,
      database: __ENV.INFLUXDB_DATABASE || 'k6',
      tags: {
        environment: __ENV.ENVIRONMENT || 'test',
        service: 'curriculum-alignment'
      }
    },
    
    prometheus: {
      url: __ENV.PROMETHEUS_URL || null,
      pushgateway: __ENV.PROMETHEUS_PUSHGATEWAY_URL || null
    },
    
    grafana: {
      url: __ENV.GRAFANA_URL || null,
      dashboardId: __ENV.GRAFANA_DASHBOARD_ID || null
    }
  }
};

// Helper functions
export function getAuthHeaders() {
  if (config.tokens.accessToken) {
    return {
      ...config.requestOptions.headers,
      'Authorization': `Bearer ${config.tokens.accessToken}`
    };
  }
  return config.requestOptions.headers;
}

export function isTokenValid() {
  if (!config.tokens.accessToken || !config.tokens.expiresAt) {
    return false;
  }
  return Date.now() < config.tokens.expiresAt;
}

export function generateTestData() {
  return {
    program: {
      name: `Test Program ${Math.random().toString(36).substring(7)}`,
      department: 'Computer Science and Information Systems',
      level: 'bachelor',
      duration: 6,
      credits: 180,
      description: 'Load testing program created by k6'
    },
    
    document: {
      filename: `load-test-${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
      programId: config.testData.programId
    },
    
    analysis: {
      type: 'curriculum-alignment',
      programId: config.testData.programId,
      configuration: {
        comparisonUniversities: ['MIT', 'Stanford', 'CMU'],
        analysisDepth: Math.random() > 0.5 ? 'quick' : 'comprehensive',
        includePrerequisites: true,
        includeLearningOutcomes: true,
        generateRecommendations: true
      }
    },
    
    user: {
      email: `loadtest+${Math.random().toString(36).substring(7)}@example.com`,
      password: 'LoadTest123!',
      name: `Load Test User ${Math.floor(Math.random() * 1000)}`
    }
  };
}

export default config;