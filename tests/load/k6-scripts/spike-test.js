// k6 Spike Test
// Tests system behavior under sudden load spikes

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
  errorRate,
  responseTime,
  requestCount,
  uploadSuccesses,
  analysisStarts
} from './utils.js';

export let options = {
  stages: config.stages.spike,
  thresholds: {
    // Spike test thresholds - focus on recovery
    'http_req_duration': ['p(95)<15000', 'p(99)<45000'],
    'http_req_failed': ['rate<0.30'], // Allow higher error rate during spikes
    'checks': ['rate>0.60'], // 60% of checks should pass
    
    // Recovery thresholds - system should recover quickly
    'http_req_duration{name:health}': ['p(95)<5000'],
    'http_req_failed{expected_response:true}': ['rate<0.50']
  },
  tags: {
    testType: 'spike',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

let currentStage = 'normal';
let spikeStartTime = 0;
let spikeDuration = 0;

export default function() {
  // Determine current load stage based on VU count
  const currentVUs = __VU;
  const totalVUs = __ENV.K6_VUS || 100;
  
  if (currentVUs > totalVUs * 0.8) {
    if (currentStage !== 'spike') {
      currentStage = 'spike';
      spikeStartTime = Date.now();
      console.log(`🌋 SPIKE DETECTED: ${currentVUs} VUs active`);
    }
  } else if (currentStage === 'spike') {
    spikeDuration = Date.now() - spikeStartTime;
    currentStage = 'recovery';
    console.log(`📉 SPIKE ENDED: Duration ${Math.round(spikeDuration / 1000)}s`);
  }
  
  group('Spike Test - Sudden Load Changes', function() {
    
    if (currentStage === 'normal') {
      normalLoadBehavior();
    } else if (currentStage === 'spike') {
      spikeLoadBehavior();
    } else {
      recoveryBehavior();
    }
    
  });
}

function normalLoadBehavior() {
  group('Normal Load Phase', function() {
    // Standard user workflow
    userWorkflow();
    
    // Normal think time
    sleep(Math.random() * 3 + 2);
  });
}

function spikeLoadBehavior() {
  group('Spike Load Phase', function() {
    // Aggressive behavior during spike
    if (!authenticate()) return;
    
    // Random burst of operations
    const operations = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < operations; i++) {
      const operation = Math.random();
      
      if (operation < 0.4) {
        // Read operations (most common during spikes)
        getPrograms();
        if (Math.random() < 0.5) {
          getProgram(config.testData.programId);
        }
      } else if (operation < 0.7) {
        // Write operations
        const programId = createProgram();
        if (programId && Math.random() < 0.3) {
          uploadDocument();
        }
      } else {
        // Analysis operations
        const analysisId = startAnalysis();
        if (analysisId) {
          sleep(0.5);
          getAnalysisStatus(analysisId);
        }
      }
      
      // Very short delays during spike
      sleep(0.1);
    }
    
    // Minimal think time during spike
    sleep(0.5);
  });
}

function recoveryBehavior() {
  group('Recovery Phase', function() {
    // Gentler behavior to allow system recovery
    
    // Health check to verify recovery
    const healthOk = healthCheck();
    
    check(healthOk, {
      'system recovering': (ok) => ok === true
    });
    
    if (!healthOk) {
      // System still struggling, be very gentle
      sleep(5);
      return;
    }
    
    // Light operations during recovery
    if (authenticate()) {
      if (Math.random() < 0.5) {
        getPrograms();
        sleep(2);
      }
      
      if (Math.random() < 0.2) {
        getProgram(config.testData.programId);
        sleep(1);
      }
    }
    
    // Longer think time during recovery
    sleep(Math.random() * 5 + 3);
  });
}

export function setup() {
  console.log('🌋 Starting Spike Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Objective: Test system behavior under sudden load spikes');
  console.log('Pattern: Normal → Spike → Recovery → Bigger Spike → Recovery');
  console.log('');
  
  // Baseline health check
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed - aborting spike test');
  }
  
  const authOk = authenticate();
  if (!authOk) {
    throw new Error('Authentication failed - check credentials');
  }
  
  console.log('✅ Baseline established - monitoring for spikes');
  
  return { 
    startTime: Date.now(),
    spikes: [],
    recoveryTimes: []
  };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('🌋 Spike Test Completed');
  console.log('');
  console.log('📊 Spike Test Results:');
  console.log(`Total Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Max Response Time: ${Math.round(responseTime.max || 0)}ms`);
  console.log(`Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  
  // Spike-specific analysis
  const avgResponseTime = responseTime.avg || 0;
  const maxResponseTime = responseTime.max || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  const requestsPerSecond = (requestCount.count || 0) / duration;
  
  console.log('⚡ Spike Impact Analysis:');
  console.log(`Peak Throughput: ${Math.round(requestsPerSecond * 100) / 100} requests/second`);
  console.log(`Response Time Spike: ${Math.round((maxResponseTime / avgResponseTime) * 100) / 100}x normal`);
  console.log(`System Elasticity: ${errorRatePercent < 20 ? 'Good' : 'Poor'}`);
  console.log('');
  
  // Recovery assessment
  console.log('🔄 Recovery Assessment:');
  
  // Post-spike health check
  sleep(3); // Brief stabilization period
  const postHealthOk = healthCheck();
  
  if (postHealthOk) {
    console.log('✅ EXCELLENT: System recovered quickly from spikes');
    
    // Test system responsiveness after recovery
    const recoveryStart = Date.now();
    getPrograms();
    const recoveryTime = Date.now() - recoveryStart;
    
    if (recoveryTime < 2000) {
      console.log('✅ EXCELLENT: System responsiveness fully restored');
    } else if (recoveryTime < 5000) {
      console.log('⚠️  GOOD: System responsiveness mostly restored');
    } else {
      console.log('⚠️  POOR: System still showing degraded performance');
    }
    
  } else {
    console.log('❌ POOR: System showing instability after spikes');
  }
  
  console.log('');
  console.log('📈 Spike Handling Summary:');
  
  if (errorRatePercent < 10) {
    console.log('✅ EXCELLENT: Low error rate during spikes shows good resilience');
  } else if (errorRatePercent < 20) {
    console.log('⚠️  GOOD: Moderate error rate during spikes is acceptable');
  } else if (errorRatePercent < 40) {
    console.log('⚠️  POOR: High error rate indicates capacity issues');
  } else {
    console.log('❌ CRITICAL: Very high error rate shows poor spike handling');
  }
  
  if (maxResponseTime < avgResponseTime * 5) {
    console.log('✅ GOOD: Response time spikes were manageable');
  } else if (maxResponseTime < avgResponseTime * 10) {
    console.log('⚠️  MODERATE: Significant response time spikes detected');
  } else {
    console.log('❌ SEVERE: Extreme response time spikes indicate overload');
  }
  
  console.log('');
  console.log('💡 Spike Test Recommendations:');
  
  if (errorRatePercent > 20) {
    console.log('- Implement auto-scaling to handle traffic spikes');
    console.log('- Add circuit breakers to protect backend services');
  }
  
  if (maxResponseTime > avgResponseTime * 8) {
    console.log('- Add caching layers to reduce database load during spikes');
    console.log('- Implement request queuing with proper backpressure');
  }
  
  if (!postHealthOk) {
    console.log('- URGENT: Investigate why system struggles to recover from spikes');
    console.log('- Consider implementing graceful degradation mechanisms');
  }
  
  console.log('- Monitor real-world traffic patterns for similar spike scenarios');
  console.log('- Consider implementing rate limiting to smooth out traffic spikes');
}