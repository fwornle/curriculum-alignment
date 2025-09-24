// k6 Analysis Workflow Load Test
// Focused load testing for curriculum analysis operations

import { check, group, sleep } from 'k6';
import { config } from './config.js';
import { 
  authenticate,
  healthCheck,
  startAnalysis,
  getAnalysisStatus,
  createProgram,
  uploadDocument,
  makeAuthenticatedRequest,
  generateTestData,
  errorRate,
  responseTime,
  requestCount,
  analysisStarts
} from './utils.js';

export let options = {
  stages: [
    { duration: '2m', target: 5 },   // Ramp up slowly for analysis
    { duration: '5m', target: 15 },  // Moderate load for analysis operations
    { duration: '8m', target: 25 },  // Peak analysis load
    { duration: '3m', target: 15 },  // Scale back
    { duration: '2m', target: 0 }    // Cool down
  ],
  thresholds: {
    // Analysis-specific thresholds (more lenient due to complex operations)
    'http_req_duration': ['p(95)<30000', 'p(99)<60000'], // Analysis can be slow
    'http_req_failed': ['rate<0.10'], // Allow 10% error rate for analysis
    'checks': ['rate>0.85'], // 85% of checks should pass
    
    // Specific analysis operation thresholds
    'http_req_duration{name:analysis_start}': ['p(95)<45000', 'p(99)<90000'],
    'http_req_duration{name:analysis_status}': ['p(95)<3000', 'p(99)<10000'],
    'http_req_duration{name:programs_create}': ['p(95)<5000', 'p(99)<15000'],
    'http_req_duration{name:document_upload}': ['p(95)<20000', 'p(99)<45000']
  },
  tags: {
    testType: 'analysis_load',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

export default function() {
  group('Analysis Workflow Load Test', function() {
    
    if (!authenticate()) {
      return;
    }
    
    const workflow = Math.random();
    
    if (workflow < 0.4) {
      // Full analysis workflow (40%)
      fullAnalysisWorkflow();
    } else if (workflow < 0.7) {
      // Quick analysis workflow (30%)
      quickAnalysisWorkflow();
    } else if (workflow < 0.9) {
      // Status monitoring workflow (20%)
      statusMonitoringWorkflow();
    } else {
      // Bulk analysis workflow (10%)
      bulkAnalysisWorkflow();
    }
    
  });
}

function fullAnalysisWorkflow() {
  group('Full Analysis Workflow', function() {
    
    // Step 1: Create program for analysis
    const programId = createProgram();
    if (!programId) {
      console.warn('Failed to create program for analysis');
      return;
    }
    sleep(1);
    
    // Step 2: Upload supporting document
    const documentId = uploadDocument();
    if (!documentId) {
      console.warn('Failed to upload document for analysis');
    }
    sleep(2);
    
    // Step 3: Start comprehensive analysis
    const testData = generateTestData();
    testData.analysis.programId = programId;
    testData.analysis.configuration.analysisDepth = 'comprehensive';
    
    const analysisId = startAnalysis();
    if (!analysisId) {
      console.warn('Failed to start analysis');
      return;
    }
    
    sleep(3);
    
    // Step 4: Monitor analysis progress
    let status = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && status !== 'completed' && status !== 'failed') {
      status = getAnalysisStatus(analysisId);
      attempts++;
      
      if (status === 'running' || status === 'initiated') {
        sleep(5); // Wait longer between status checks
      } else {
        break;
      }
    }
    
    check(status, {
      'analysis completed or still running': (s) => s === 'completed' || s === 'running' || s === 'initiated'
    });
    
    sleep(2);
  });
}

function quickAnalysisWorkflow() {
  group('Quick Analysis Workflow', function() {
    
    // Use existing program for quick analysis
    const testData = generateTestData();
    testData.analysis.programId = config.testData.programId;
    testData.analysis.configuration.analysisDepth = 'quick';
    testData.analysis.configuration.comparisonUniversities = ['MIT']; // Single comparison
    
    const analysisId = startAnalysis();
    if (!analysisId) {
      return;
    }
    
    sleep(2);
    
    // Quick status check
    const status = getAnalysisStatus(analysisId);
    check(status, {
      'quick analysis started': (s) => s === 'initiated' || s === 'running' || s === 'completed'
    });
    
    sleep(1);
  });
}

function statusMonitoringWorkflow() {
  group('Status Monitoring Workflow', function() {
    
    // Monitor existing analyses
    const existingAnalysisIds = [
      config.testData.analysisId,
      `test-analysis-${Math.floor(Math.random() * 1000)}`
    ];
    
    existingAnalysisIds.forEach(analysisId => {
      const status = getAnalysisStatus(analysisId);
      
      // This might return 404 for non-existent analyses, which is expected
      if (status) {
        check(status, {
          'valid analysis status': (s) => ['initiated', 'running', 'completed', 'failed', 'cancelled'].includes(s)
        });
      }
      
      sleep(0.5);
    });
    
    sleep(1);
  });
}

function bulkAnalysisWorkflow() {
  group('Bulk Analysis Workflow', function() {
    
    // Start multiple analyses rapidly
    const analysisIds = [];
    const bulkSize = Math.floor(Math.random() * 3) + 2; // 2-4 analyses
    
    for (let i = 0; i < bulkSize; i++) {
      const testData = generateTestData();
      testData.analysis.programId = config.testData.programId;
      testData.analysis.configuration.analysisDepth = i % 2 === 0 ? 'quick' : 'comprehensive';
      
      const analysisId = startAnalysis();
      if (analysisId) {
        analysisIds.push(analysisId);
      }
      
      sleep(1); // Brief pause between starts
    }
    
    sleep(3);
    
    // Check status of all started analyses
    analysisIds.forEach(analysisId => {
      const status = getAnalysisStatus(analysisId);
      check(status, {
        'bulk analysis tracking': (s) => s !== null
      });
      
      sleep(0.5);
    });
    
    sleep(2);
  });
}

// Analysis-specific utility functions
function waitForAnalysisCompletion(analysisId, maxWaitTime = 300) {
  const startTime = Date.now();
  let status = null;
  
  while (Date.now() - startTime < maxWaitTime * 1000) {
    status = getAnalysisStatus(analysisId);
    
    if (status === 'completed' || status === 'failed') {
      break;
    }
    
    sleep(10); // Wait 10 seconds between checks
  }
  
  return status;
}

function cancelAnalysis(analysisId) {
  const response = makeAuthenticatedRequest(
    'DELETE',
    `${config.baseUrl}/analysis/${analysisId}`,
    null,
    { tags: { name: 'analysis_cancel' } }
  );
  
  if (response) {
    return check(response, {
      'analysis cancellation successful': (r) => r.status === 200
    });
  }
  
  return false;
}

export function setup() {
  console.log('🧪 Starting Analysis Load Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Focus: Curriculum analysis workflow performance');
  console.log('Scenarios:');
  console.log('  - Full Analysis Workflow (40%): Complete analysis with document upload');
  console.log('  - Quick Analysis Workflow (30%): Fast analysis with minimal configuration');
  console.log('  - Status Monitoring (20%): Checking analysis progress');
  console.log('  - Bulk Analysis (10%): Multiple simultaneous analyses');
  console.log('');
  
  // Verify system readiness
  const healthOk = healthCheck();
  if (!healthOk) {
    throw new Error('System health check failed');
  }
  
  const authOk = authenticate();
  if (!authOk) {
    throw new Error('Authentication failed');
  }
  
  // Pre-create test program if needed
  console.log('🛠️  Setting up test data...');
  const programId = createProgram();
  if (programId) {
    console.log(`✅ Test program created: ${programId}`);
    config.testData.programId = programId;
  }
  
  return { 
    startTime: Date.now(),
    testProgramId: programId
  };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('🧪 Analysis Load Test Completed');
  console.log('');
  console.log('📊 Analysis Performance Results:');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Analysis Started: ${analysisStarts.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  
  // Analysis-specific metrics
  const avgResponseTime = responseTime.avg || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  const analysisRate = (analysisStarts.count || 0) / duration;
  
  console.log('🔍 Analysis Workflow Assessment:');
  console.log(`Analysis Initiation Rate: ${Math.round(analysisRate * 100) / 100} per second`);
  console.log(`System Capacity: ${analysisStarts.count || 0} concurrent analyses handled`);
  console.log('');
  
  // Performance benchmarks for analysis operations
  if (avgResponseTime < 10000) {
    console.log('✅ EXCELLENT: Analysis operations responding quickly');
  } else if (avgResponseTime < 30000) {
    console.log('⚠️  ACCEPTABLE: Analysis operations within reasonable time');
  } else {
    console.log('❌ POOR: Analysis operations taking too long');
  }
  
  if (errorRatePercent < 5) {
    console.log('✅ EXCELLENT: Very low error rate for analysis operations');
  } else if (errorRatePercent < 10) {
    console.log('⚠️  ACCEPTABLE: Moderate error rate for complex operations');
  } else {
    console.log('❌ POOR: High error rate indicates system strain');
  }
  
  if (analysisRate > 0.1) {
    console.log('✅ GOOD: System handling analysis requests efficiently');
  } else {
    console.log('⚠️  Limited analysis throughput - may need capacity increase');
  }
  
  console.log('');
  console.log('💡 Analysis Load Test Recommendations:');
  
  if (avgResponseTime > 30000) {
    console.log('- Consider optimizing analysis algorithms for better performance');
    console.log('- Implement async processing with better progress reporting');
  }
  
  if (errorRatePercent > 10) {
    console.log('- Review analysis service error handling and retry logic');
    console.log('- Consider implementing analysis queuing for high load periods');
  }
  
  if (analysisRate < 0.05) {
    console.log('- Analysis bottleneck detected - investigate processing capacity');
    console.log('- Consider horizontal scaling of analysis services');
  }
  
  console.log('- Monitor real-world analysis usage patterns for capacity planning');
  console.log('- Implement analysis result caching to reduce duplicate processing');
}