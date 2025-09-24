// k6 Stress Test
// Tests system behavior under extreme load conditions

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
  makeAuthenticatedRequest,
  handleError,
  errorRate,
  responseTime,
  requestCount,
  uploadSuccesses,
  analysisStarts
} from './utils.js';

export let options = {
  stages: config.stages.stress,
  thresholds: {
    // Relaxed thresholds for stress testing
    'http_req_duration': ['p(95)<10000', 'p(99)<30000'], // Allow longer response times
    'http_req_failed': ['rate<0.20'], // Allow up to 20% error rate under stress
    'checks': ['rate>0.70'], // 70% of checks should pass
    
    // Specific endpoint thresholds under stress
    'http_req_duration{name:health}': ['p(95)<2000'],
    'http_req_duration{name:auth}': ['p(95)<15000'],
    'http_req_duration{name:programs_list}': ['p(95)<5000'],
    'http_req_duration{name:analysis_start}': ['p(95)<45000']
  },
  tags: {
    testType: 'stress',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

export default function() {
  group('Stress Test - System Under Pressure', function() {
    
    // More aggressive operations for stress testing
    const scenario = Math.random();
    
    if (scenario < 0.4) {
      // Heavy read operations (40%)
      heavyReadScenario();
    } else if (scenario < 0.7) {
      // Mixed operations (30%)
      mixedOperationsScenario();
    } else if (scenario < 0.9) {
      // Heavy write operations (20%)
      heavyWriteScenario();
    } else {
      // Analysis stress (10%)
      analysisStressScenario();
    }
  });
}

function heavyReadScenario() {
  group('Heavy Read Operations', function() {
    if (!authenticate()) return;
    
    // Burst of read operations
    for (let i = 0; i < 5; i++) {
      getPrograms();
      
      if (i % 2 === 0) {
        getProgram(config.testData.programId);
      }
      
      // Short sleep between requests
      sleep(0.2);
    }
    
    sleep(1);
  });
}

function mixedOperationsScenario() {
  group('Mixed Operations', function() {
    if (!authenticate()) return;
    
    // Rapid sequence of different operations
    getPrograms();
    sleep(0.5);
    
    const programId = createProgram();
    sleep(1);
    
    if (programId) {
      getProgram(programId);
      sleep(0.5);
    }
    
    uploadDocument();
    sleep(2);
    
    const analysisId = startAnalysis();
    if (analysisId) {
      sleep(1);
      getAnalysisStatus(analysisId);
    }
    
    sleep(1);
  });
}

function heavyWriteScenario() {
  group('Heavy Write Operations', function() {
    if (!authenticate()) return;
    
    // Multiple program creations
    for (let i = 0; i < 3; i++) {
      const programId = createProgram();
      sleep(0.5);
      
      if (programId) {
        // Upload document for each program
        uploadDocument();
        sleep(1);
      }
    }
    
    sleep(2);
  });
}

function analysisStressScenario() {
  group('Analysis Stress Operations', function() {
    if (!authenticate()) return;
    
    // Start multiple analyses rapidly
    const analysisIds = [];
    
    for (let i = 0; i < 2; i++) {
      const analysisId = startAnalysis();
      if (analysisId) {
        analysisIds.push(analysisId);
      }
      sleep(0.5);
    }
    
    // Check status of all analyses
    analysisIds.forEach(id => {
      getAnalysisStatus(id);
      sleep(0.3);
    });
    
    sleep(3);
  });
}

// Stress-specific utility functions
function stressTestEndpoint(endpoint, expectedStatus = 200) {
  const response = makeAuthenticatedRequest('GET', `${config.baseUrl}${endpoint}`);
  
  if (response) {
    const success = check(response, {
      [`${endpoint} responded`]: (r) => r.status !== 0,
      [`${endpoint} not server error`]: (r) => r.status < 500
    });
    
    return handleError(response, `Stress test ${endpoint}`);
  }
  
  return false;
}

export function setup() {
  console.log('🔥 Starting Stress Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Objective: Test system behavior under extreme load');
  console.log('Warning: This test will push the system beyond normal capacity');
  console.log('');
  
  // Verify system baseline
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed - aborting stress test');
  }
  
  const authOk = authenticate();
  if (!authOk) {
    throw new Error('Authentication failed - check credentials');
  }
  
  console.log('✅ Baseline checks passed - beginning stress test');
  
  return { 
    startTime: Date.now(),
    baselineHealthy: true
  };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('🔥 Stress Test Completed');
  console.log('');
  console.log('📊 Stress Test Results:');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Max Response Time: ${Math.round(responseTime.max || 0)}ms`);
  console.log(`Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  
  // Stress test analysis
  const avgResponseTime = responseTime.avg || 0;
  const maxResponseTime = responseTime.max || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  const requestsPerSecond = (requestCount.count || 0) / duration;
  
  console.log('🔍 Stress Test Analysis:');
  console.log(`Peak Throughput: ${Math.round(requestsPerSecond * 100) / 100} requests/second`);
  console.log(`System Degradation: ${maxResponseTime > avgResponseTime * 3 ? 'Significant' : 'Acceptable'}`);
  console.log(`Recovery Capability: ${errorRatePercent < 10 ? 'Good' : 'Poor'}`);
  console.log('');
  
  // System resilience assessment
  if (errorRatePercent < 10) {
    console.log('✅ EXCELLENT: System maintained low error rate under stress');
  } else if (errorRatePercent < 20) {
    console.log('⚠️  GOOD: System handled stress with acceptable error rate');
  } else if (errorRatePercent < 50) {
    console.log('⚠️  POOR: High error rate indicates system struggling');
  } else {
    console.log('❌ CRITICAL: System failed under stress - investigate capacity');
  }
  
  if (maxResponseTime < 30000) {
    console.log('✅ GOOD: Response times remained reasonable under stress');
  } else {
    console.log('❌ POOR: Response times exceeded acceptable limits');
  }
  
  // Post-stress health check
  console.log('');
  console.log('🏥 Post-Stress System Health Check...');
  
  sleep(5); // Allow system to stabilize
  
  const postHealthOk = healthCheck();
  if (postHealthOk) {
    console.log('✅ System recovered successfully after stress test');
  } else {
    console.log('❌ System showing signs of instability after stress test');
  }
  
  console.log('');
  console.log('💡 Recommendations:');
  
  if (errorRatePercent > 15) {
    console.log('- Consider increasing server capacity or implementing auto-scaling');
  }
  
  if (maxResponseTime > 20000) {
    console.log('- Review database query performance and add caching layers');
  }
  
  if (requestsPerSecond < 20) {
    console.log('- Investigate bottlenecks in request processing pipeline');
  }
  
  if (!postHealthOk) {
    console.log('- URGENT: System instability detected - immediate investigation required');
  }
}