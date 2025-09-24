// k6 API Load Test
// Comprehensive load test for all API endpoints

import { check, group, sleep } from 'k6';
import { config } from './config.js';
import { 
  authenticate,
  healthCheck,
  getPrograms,
  getProgram,
  createProgram,
  uploadDocument,
  startAnalysis,
  getAnalysisStatus,
  userWorkflow,
  adminWorkflow,
  errorRate,
  responseTime,
  requestCount,
  uploadSuccesses,
  analysisStarts
} from './utils.js';

export let options = {
  stages: config.stages.load,
  thresholds: config.thresholds,
  scenarios: {
    // Regular user workflow - 70% of traffic
    user_workflow: {
      executor: 'ramping-vus',
      stages: config.stages.load,
      gracefulRampDown: '60s',
      exec: 'userScenario'
    },
    
    // Admin workflow - 20% of traffic  
    admin_workflow: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 2 },
        { duration: '10m', target: 10 },
        { duration: '5m', target: 2 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s',
      exec: 'adminScenario'
    },
    
    // API stress testing - 10% of traffic
    api_stress: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '15m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: 'apiStressScenario'
    }
  },
  tags: {
    testType: 'load',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

// Regular user scenario
export function userScenario() {
  userWorkflow();
}

// Admin user scenario
export function adminScenario() {
  adminWorkflow();
}

// API stress scenario - rapid API calls
export function apiStressScenario() {
  group('API Stress Test', function() {
    
    // Health check burst
    if (Math.random() < 0.3) {
      healthCheck();
    }
    
    // Authentication check
    if (Math.random() < 0.1) {
      authenticate();
    }
    
    // Programs API burst
    if (Math.random() < 0.5) {
      getPrograms();
      
      if (Math.random() < 0.3) {
        getProgram(config.testData.programId);
      }
    }
    
    // Document operations
    if (Math.random() < 0.2) {
      uploadDocument();
    }
    
    // Analysis operations
    if (Math.random() < 0.1) {
      const analysisId = startAnalysis();
      if (analysisId) {
        sleep(1);
        getAnalysisStatus(analysisId);
      }
    }
    
    // Minimal sleep for stress testing
    sleep(0.5);
  });
}

// Default function for backward compatibility
export default function() {
  userScenario();
}

export function setup() {
  console.log('🚀 Starting API Load Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Scenarios:');
  console.log('  - User Workflow (70%): Normal user browsing and operations');
  console.log('  - Admin Workflow (20%): Administrative operations');
  console.log('  - API Stress (10%): Rapid API calls');
  console.log('');
  
  // Pre-test validation
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed - aborting load test');
  }
  
  // Warm up authentication
  if (!authenticate()) {
    throw new Error('Authentication failed - check credentials');
  }
  
  return { 
    startTime: Date.now(),
    healthOk: true,
    authOk: true
  };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('✅ API Load Test Completed');
  console.log('');
  console.log('📊 Test Results:');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  console.log('📈 Business Metrics:');
  console.log(`Successful Uploads: ${uploadSuccesses.count || 0}`);
  console.log(`Analysis Started: ${analysisStarts.count || 0}`);
  console.log('');
  
  // Performance assessment
  const avgResponseTime = responseTime.avg || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  
  if (errorRatePercent > 5) {
    console.log('❌ FAIL: Error rate above 5%');
  } else if (errorRatePercent > 1) {
    console.log('⚠️  WARN: Error rate above 1%');
  } else {
    console.log('✅ PASS: Error rate within acceptable limits');
  }
  
  if (avgResponseTime > 3000) {
    console.log('❌ FAIL: Average response time above 3s');
  } else if (avgResponseTime > 2000) {
    console.log('⚠️  WARN: Average response time above 2s');
  } else {
    console.log('✅ PASS: Response times within acceptable limits');
  }
  
  // Load test specific checks
  const requestsPerSecond = (requestCount.count || 0) / duration;
  console.log(`Throughput: ${Math.round(requestsPerSecond * 100) / 100} requests/second`);
  
  if (requestsPerSecond < 10) {
    console.log('⚠️  WARN: Low throughput - system may be constrained');
  }
}