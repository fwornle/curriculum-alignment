// k6 Smoke Test
// Basic functionality test with minimal load to verify system is working

import { check, group, sleep } from 'k6';
import { config } from './config.js';
import { 
  authenticate, 
  healthCheck, 
  getPrograms, 
  getProgram,
  errorRate,
  responseTime,
  requestCount
} from './utils.js';

export let options = {
  stages: config.stages.smoke,
  thresholds: {
    ...config.thresholds,
    // Stricter thresholds for smoke tests
    'http_req_duration': ['p(95)<1000', 'p(99)<3000'],
    'http_req_failed': ['rate<0.01'], // Less than 1% error rate
    'checks': ['rate>0.95'] // 95% of checks should pass
  },
  tags: {
    testType: 'smoke',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

export default function() {
  group('Smoke Test - Basic Functionality', function() {
    
    group('Health Check', function() {
      const healthOk = healthCheck();
      
      if (!healthOk) {
        console.error('Health check failed - system may be unavailable');
        return; // Exit early if health check fails
      }
      
      sleep(1);
    });
    
    group('Authentication', function() {
      const authSuccess = authenticate();
      
      check(authSuccess, {
        'authentication successful': (success) => success === true
      });
      
      if (!authSuccess) {
        console.error('Authentication failed - cannot proceed with smoke test');
        return;
      }
      
      sleep(1);
    });
    
    group('Programs API', function() {
      // Test programs listing
      const listSuccess = getPrograms();
      
      check(listSuccess, {
        'programs list accessible': (success) => success === true
      });
      
      sleep(1);
      
      // Test specific program retrieval
      const getSuccess = getProgram(config.testData.programId);
      
      check(getSuccess, {
        'specific program accessible': (success) => success === true
      });
      
      sleep(1);
    });
    
    // Basic think time
    sleep(Math.random() * 2 + 1);
  });
}

export function setup() {
  console.log('🚀 Starting Smoke Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Objective: Verify basic system functionality with minimal load');
  
  // Verify system is accessible before starting test
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed - aborting smoke test');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('✅ Smoke Test Completed');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Average Response Time: ${responseTime.avg || 0}ms`);
  console.log(`Error Rate: ${(errorRate.rate || 0) * 100}%`);
  
  // Smoke test should have very low error rates
  if (errorRate.rate > 0.01) {
    console.warn('⚠️  Warning: Error rate above 1% in smoke test');
  }
  
  if (responseTime.avg > 1000) {
    console.warn('⚠️  Warning: Average response time above 1s in smoke test');
  }
}