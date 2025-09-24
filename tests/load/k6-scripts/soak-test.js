// k6 Soak Test (Endurance Test)
// Tests system stability over extended periods

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
  makeAuthenticatedRequest,
  errorRate,
  responseTime,
  requestCount,
  uploadSuccesses,
  analysisStarts
} from './utils.js';

export let options = {
  stages: [
    { duration: '10m', target: 10 },  // Gentle ramp up
    { duration: '4h', target: 15 },   // Extended steady load (4 hours)
    { duration: '10m', target: 10 },  // Gentle ramp down
    { duration: '5m', target: 0 }     // Final cool down
  ],
  thresholds: {
    // Soak test thresholds - focus on stability over time
    'http_req_duration': ['p(95)<3000', 'p(99)<8000'],
    'http_req_failed': ['rate<0.08'], // Allow 8% error rate over long duration
    'checks': ['rate>0.85'], // 85% of checks should pass consistently
    
    // Memory leak detection through response time degradation
    'http_req_duration{name:health}': ['p(95)<1000'], // Health should stay fast
    'http_req_duration{name:auth}': ['p(95)<3000'], // Auth shouldn't degrade
    'http_req_duration{name:programs_list}': ['p(95)<2500'] // Core operations stable
  },
  tags: {
    testType: 'soak',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

// Track metrics over time for trend analysis
let timeBasedMetrics = {
  hourlyErrorRates: [],
  hourlyResponseTimes: [],
  systemHealthChecks: []
};

let testStartTime = 0;
let lastHealthCheck = 0;
let lastMetricsSnapshot = 0;

export default function() {
  // Initialize timing on first run
  if (testStartTime === 0) {
    testStartTime = Date.now();
  }
  
  const currentTime = Date.now();
  const testDurationMinutes = (currentTime - testStartTime) / (1000 * 60);
  
  group('Soak Test - Extended Stability', function() {
    
    // Periodic health monitoring during soak test
    if (currentTime - lastHealthCheck > 300000) { // Every 5 minutes
      performHealthMonitoring();
      lastHealthCheck = currentTime;
    }
    
    // Capture metrics snapshots every hour
    if (currentTime - lastMetricsSnapshot > 3600000) { // Every hour
      captureMetricsSnapshot();
      lastMetricsSnapshot = currentTime;
    }
    
    // Vary load patterns over time to simulate real usage
    const timeBasedScenario = getTimeBasedScenario(testDurationMinutes);
    
    switch (timeBasedScenario) {
      case 'light':
        lightUsagePattern();
        break;
      case 'moderate':
        moderateUsagePattern();
        break;
      case 'peak':
        peakUsagePattern();
        break;
      case 'maintenance':
        maintenancePattern();
        break;
      default:
        standardUsagePattern();
    }
  });
}

function getTimeBasedScenario(minutes) {
  // Simulate different usage patterns throughout the day
  const hour = Math.floor(minutes / 60) % 24;
  
  if (hour >= 2 && hour < 6) {
    return 'maintenance'; // Late night/early morning - minimal activity
  } else if (hour >= 9 && hour < 11) {
    return 'peak'; // Morning peak
  } else if (hour >= 14 && hour < 16) {
    return 'peak'; // Afternoon peak
  } else if (hour >= 6 && hour < 9 || hour >= 16 && hour < 18) {
    return 'moderate'; // Moderate usage periods
  } else {
    return 'light'; // Light usage
  }
}

function lightUsagePattern() {
  group('Light Usage Pattern', function() {
    
    // Basic user workflow with longer think times
    const success = userWorkflow();
    
    if (success) {
      // Occasional read operations
      if (Math.random() < 0.3) {
        getPrograms();
        sleep(5);
      }
      
      if (Math.random() < 0.1) {
        getProgram(config.testData.programId);
        sleep(3);
      }
    }
    
    // Extended think time for light usage
    sleep(Math.random() * 10 + 15);
  });
}

function moderateUsagePattern() {
  group('Moderate Usage Pattern', function() {
    
    if (!authenticate()) return;
    
    // Standard operations mix
    const operations = Math.floor(Math.random() * 2) + 1; // 1-2 operations
    
    for (let i = 0; i < operations; i++) {
      const operation = Math.random();
      
      if (operation < 0.5) {
        getPrograms();
        sleep(2);
      } else if (operation < 0.7) {
        getProgram(config.testData.programId);
        sleep(2);
      } else if (operation < 0.9) {
        createProgram();
        sleep(5);
      } else {
        uploadDocument();
        sleep(8);
      }
    }
    
    // Moderate think time
    sleep(Math.random() * 5 + 5);
  });
}

function peakUsagePattern() {
  group('Peak Usage Pattern', function() {
    
    if (!authenticate()) return;
    
    // More intensive operations during peak times
    const operations = Math.floor(Math.random() * 3) + 2; // 2-4 operations
    
    for (let i = 0; i < operations; i++) {
      const operation = Math.random();
      
      if (operation < 0.4) {
        getPrograms();
        sleep(1);
      } else if (operation < 0.6) {
        getProgram(config.testData.programId);
        sleep(1);
      } else if (operation < 0.8) {
        const programId = createProgram();
        if (programId) {
          sleep(2);
          uploadDocument();
          sleep(3);
        }
      } else {
        const analysisId = startAnalysis();
        if (analysisId) {
          sleep(5);
          getAnalysisStatus(analysisId);
          sleep(2);
        }
      }
    }
    
    // Shorter think time during peak
    sleep(Math.random() * 3 + 2);
  });
}

function maintenancePattern() {
  group('Maintenance Pattern', function() {
    
    // Minimal operations during maintenance windows
    if (Math.random() < 0.5) {
      const healthOk = healthCheck();
      
      check(healthOk, {
        'system available during maintenance window': (ok) => ok === true
      });
    }
    
    // Very long sleep during maintenance
    sleep(Math.random() * 20 + 30);
  });
}

function standardUsagePattern() {
  group('Standard Usage Pattern', function() {
    userWorkflow();
    sleep(Math.random() * 5 + 3);
  });
}

function performHealthMonitoring() {
  group('Health Monitoring', function() {
    
    const healthOk = healthCheck();
    const currentTime = Date.now();
    
    timeBasedMetrics.systemHealthChecks.push({
      timestamp: currentTime,
      healthy: healthOk,
      testDuration: (currentTime - testStartTime) / (1000 * 60) // minutes
    });
    
    check(healthOk, {
      'system health maintained over time': (ok) => ok === true
    });
    
    // Additional system checks
    const memoryCheck = makeAuthenticatedRequest(
      'GET',
      `${config.baseUrl}/system/metrics`,
      null,
      { tags: { name: 'memory_check' } }
    );
    
    if (memoryCheck && memoryCheck.json) {
      const metrics = memoryCheck.json();
      check(metrics, {
        'memory usage reasonable': (m) => !m.memory || m.memory.usage < 0.85,
        'no memory leaks detected': (m) => !m.memory || m.memory.growth < 0.1
      });
    }
  });
}

function captureMetricsSnapshot() {
  const currentTime = Date.now();
  const testDurationHours = (currentTime - testStartTime) / (1000 * 60 * 60);
  
  timeBasedMetrics.hourlyErrorRates.push({
    hour: Math.floor(testDurationHours),
    errorRate: errorRate.rate || 0,
    timestamp: currentTime
  });
  
  timeBasedMetrics.hourlyResponseTimes.push({
    hour: Math.floor(testDurationHours),
    avgResponseTime: responseTime.avg || 0,
    p95ResponseTime: responseTime.p95 || 0,
    timestamp: currentTime
  });
  
  console.log(`📊 Hour ${Math.floor(testDurationHours)} metrics captured`);
}

export function setup() {
  console.log('⏱️  Starting Soak Test (Endurance Test)');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Duration: 4+ hours of sustained load');
  console.log('Focus: System stability, memory leaks, performance degradation');
  console.log('Patterns: Light → Moderate → Peak → Maintenance (cycling)');
  console.log('');
  
  // Baseline health check
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed - aborting soak test');
  }
  
  const authOk = authenticate();
  if (!authOk) {
    throw new Error('Authentication failed');
  }
  
  console.log('✅ Soak test initialized - beginning extended monitoring');
  console.log('⚠️  This test will run for several hours - monitor system resources');
  
  return { 
    startTime: Date.now(),
    baselineMetrics: {
      errorRate: 0,
      responseTime: 0,
      memoryUsage: 0
    }
  };
}

export function teardown(data) {
  const totalDuration = Math.round((Date.now() - data.startTime) / 1000);
  const durationHours = Math.round(totalDuration / 3600 * 100) / 100;
  
  console.log('⏱️  Soak Test Completed');
  console.log('');
  console.log('📊 Extended Stability Results:');
  console.log(`Total Duration: ${durationHours} hours (${totalDuration} seconds)`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Final Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  
  // Analyze trends over time
  console.log('📈 Stability Analysis:');
  
  // Error rate trend analysis
  if (timeBasedMetrics.hourlyErrorRates.length > 1) {
    const firstHourError = timeBasedMetrics.hourlyErrorRates[0].errorRate;
    const lastHourError = timeBasedMetrics.hourlyErrorRates[timeBasedMetrics.hourlyErrorRates.length - 1].errorRate;
    const errorTrend = ((lastHourError - firstHourError) / firstHourError) * 100;
    
    console.log(`Error Rate Trend: ${errorTrend > 0 ? '+' : ''}${Math.round(errorTrend * 100) / 100}% over test duration`);
    
    if (Math.abs(errorTrend) < 10) {
      console.log('✅ EXCELLENT: Error rate remained stable throughout test');
    } else if (errorTrend > 50) {
      console.log('❌ POOR: Significant error rate increase indicates system degradation');
    } else {
      console.log('⚠️  MODERATE: Some error rate fluctuation detected');
    }
  }
  
  // Response time trend analysis
  if (timeBasedMetrics.hourlyResponseTimes.length > 1) {
    const firstHourRT = timeBasedMetrics.hourlyResponseTimes[0].avgResponseTime;
    const lastHourRT = timeBasedMetrics.hourlyResponseTimes[timeBasedMetrics.hourlyResponseTimes.length - 1].avgResponseTime;
    const rtTrend = ((lastHourRT - firstHourRT) / firstHourRT) * 100;
    
    console.log(`Response Time Trend: ${rtTrend > 0 ? '+' : ''}${Math.round(rtTrend * 100) / 100}% over test duration`);
    
    if (Math.abs(rtTrend) < 15) {
      console.log('✅ EXCELLENT: Response times remained stable - no performance degradation');
    } else if (rtTrend > 50) {
      console.log('❌ POOR: Significant response time increase suggests memory leaks or resource exhaustion');
    } else {
      console.log('⚠️  MODERATE: Some response time degradation detected');
    }
  }
  
  // System health consistency
  const healthCheckCount = timeBasedMetrics.systemHealthChecks.length;
  const healthyChecks = timeBasedMetrics.systemHealthChecks.filter(check => check.healthy).length;
  const healthPercentage = healthCheckCount > 0 ? (healthyChecks / healthCheckCount) * 100 : 0;
  
  console.log(`System Health: ${Math.round(healthPercentage)}% uptime during soak test`);
  
  if (healthPercentage > 95) {
    console.log('✅ EXCELLENT: System maintained high availability throughout soak test');
  } else if (healthPercentage > 90) {
    console.log('⚠️  GOOD: System mostly stable with minor availability issues');
  } else {
    console.log('❌ POOR: System availability issues detected during extended load');
  }
  
  console.log('');
  console.log('🔍 Soak Test Assessment:');
  
  const avgResponseTime = responseTime.avg || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  
  if (avgResponseTime < 2000 && errorRatePercent < 5) {
    console.log('✅ EXCELLENT: System passed soak test with excellent stability');
  } else if (avgResponseTime < 4000 && errorRatePercent < 8) {
    console.log('⚠️  GOOD: System showed good endurance with acceptable degradation');
  } else {
    console.log('❌ POOR: System showed significant degradation during soak test');
  }
  
  console.log('');
  console.log('💡 Soak Test Recommendations:');
  
  if (timeBasedMetrics.hourlyResponseTimes.length > 0) {
    const rtIncrease = timeBasedMetrics.hourlyResponseTimes[timeBasedMetrics.hourlyResponseTimes.length - 1].avgResponseTime > timeBasedMetrics.hourlyResponseTimes[0].avgResponseTime * 1.5;
    
    if (rtIncrease) {
      console.log('- CRITICAL: Investigate memory leaks and resource cleanup');
      console.log('- Review garbage collection settings and memory allocation');
      console.log('- Implement connection pooling and resource recycling');
    }
  }
  
  if (errorRatePercent > 5) {
    console.log('- Review error handling for long-running operations');
    console.log('- Implement circuit breakers for external service calls');
    console.log('- Add retry logic with exponential backoff');
  }
  
  if (healthPercentage < 95) {
    console.log('- Investigate system instability causes during extended load');
    console.log('- Review log files for recurring errors or resource exhaustion');
    console.log('- Consider implementing health check improvements');
  }
  
  console.log('- Monitor production systems for similar long-running performance patterns');
  console.log('- Implement automated alerts for performance degradation trends');
  console.log('- Schedule regular soak testing to catch regressions early');
}