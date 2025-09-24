// k6 Volume Test
// Tests system behavior under high data volume conditions

import { check, group, sleep } from 'k6';
import { config } from './config.js';
import { 
  authenticate,
  healthCheck,
  createProgram,
  uploadDocument,
  startAnalysis,
  getAnalysisStatus,
  makeAuthenticatedRequest,
  generateTestData,
  errorRate,
  responseTime,
  requestCount,
  uploadSuccesses,
  analysisStarts
} from './utils.js';

export let options = {
  stages: [
    { duration: '10m', target: 20 },  // Gradual ramp up
    { duration: '30m', target: 40 },  // Sustained volume
    { duration: '10m', target: 20 },  // Scale back
    { duration: '5m', target: 0 }     // Cool down
  ],
  thresholds: {
    // Volume test thresholds - focus on data handling capacity
    'http_req_duration': ['p(95)<20000', 'p(99)<60000'],
    'http_req_failed': ['rate<0.15'], // Allow 15% error rate for volume operations
    'checks': ['rate>0.75'], // 75% of checks should pass
    
    // Data-intensive operation thresholds
    'http_req_duration{name:document_upload}': ['p(95)<30000', 'p(99)<120000'],
    'http_req_duration{name:bulk_analysis}': ['p(95)<180000'], // 3 minutes for bulk operations
    'http_req_duration{name:program_create}': ['p(95)<10000', 'p(99)<30000']
  },
  tags: {
    testType: 'volume',
    environment: __ENV.ENVIRONMENT || 'test'
  }
};

export default function() {
  group('Volume Test - High Data Load', function() {
    
    const scenario = Math.random();
    
    if (scenario < 0.3) {
      // Bulk program creation (30%)
      bulkProgramCreation();
    } else if (scenario < 0.6) {
      // Mass document upload (30%)
      massDocumentUpload();
    } else if (scenario < 0.8) {
      // Bulk analysis operations (20%)
      bulkAnalysisOperations();
    } else {
      // Data-intensive queries (20%)
      dataIntensiveQueries();
    }
    
  });
}

function bulkProgramCreation() {
  group('Bulk Program Creation', function() {
    
    if (!authenticate()) return;
    
    // Create multiple programs in batch
    const batchSize = Math.floor(Math.random() * 5) + 3; // 3-7 programs
    const programIds = [];
    
    for (let i = 0; i < batchSize; i++) {
      const testData = generateTestData();
      testData.program.name = `Volume Test Program ${Date.now()}-${i}`;
      testData.program.description = `Large volume test program with extensive curriculum data and multiple requirements. This program includes comprehensive course listings, detailed prerequisites, and complex degree requirements that test the system's ability to handle substantial data volumes during program creation operations.`;
      
      // Add large curriculum data
      testData.program.courses = [];
      for (let j = 0; j < 50; j++) {
        testData.program.courses.push({
          code: `CS${1000 + j}`,
          title: `Computer Science Course ${j + 1}`,
          credits: Math.floor(Math.random() * 4) + 1,
          description: `Comprehensive course covering advanced topics in computer science. This course provides in-depth knowledge and practical experience in various aspects of the field, preparing students for complex challenges in their professional careers.`,
          prerequisites: j > 0 ? [`CS${1000 + j - 1}`] : []
        });
      }
      
      const programId = createProgram();
      if (programId) {
        programIds.push(programId);
      }
      
      sleep(2); // Allow processing time between creations
    }
    
    check(programIds.length, {
      'bulk program creation successful': (count) => count > 0,
      'majority of programs created': (count) => count >= batchSize * 0.7
    });
    
    sleep(5); // Allow system to process bulk data
  });
}

function massDocumentUpload() {
  group('Mass Document Upload', function() {
    
    if (!authenticate()) return;
    
    // Upload multiple documents rapidly
    const uploadCount = Math.floor(Math.random() * 4) + 2; // 2-5 documents
    let successfulUploads = 0;
    
    for (let i = 0; i < uploadCount; i++) {
      const success = uploadDocument();
      if (success) {
        successfulUploads++;
      }
      
      sleep(3); // Brief pause between uploads
    }
    
    check(successfulUploads, {
      'mass upload partially successful': (count) => count > 0,
      'majority of uploads successful': (count) => count >= uploadCount * 0.6
    });
    
    sleep(8); // Allow document processing time
  });
}

function bulkAnalysisOperations() {
  group('Bulk Analysis Operations', function() {
    
    if (!authenticate()) return;
    
    // Start multiple comprehensive analyses
    const analysisIds = [];
    const analysisCount = Math.floor(Math.random() * 3) + 2; // 2-4 analyses
    
    for (let i = 0; i < analysisCount; i++) {
      const testData = generateTestData();
      testData.analysis.programId = config.testData.programId;
      testData.analysis.configuration.analysisDepth = 'comprehensive';
      testData.analysis.configuration.comparisonUniversities = [
        'MIT', 'Stanford', 'Carnegie Mellon', 'UC Berkeley', 'Harvard'
      ]; // Full comparison set
      
      const analysisId = startAnalysis();
      if (analysisId) {
        analysisIds.push(analysisId);
      }
      
      sleep(5); // Spacing between analysis starts
    }
    
    sleep(10); // Allow analyses to initialize
    
    // Check status of all started analyses
    let runningAnalyses = 0;
    analysisIds.forEach(id => {
      const status = getAnalysisStatus(id);
      if (status && (status === 'running' || status === 'initiated' || status === 'completed')) {
        runningAnalyses++;
      }
      sleep(2);
    });
    
    check(runningAnalyses, {
      'bulk analysis tracking': (count) => count > 0,
      'majority of analyses started': (count) => count >= analysisIds.length * 0.5
    });
    
    sleep(15); // Allow bulk processing time
  });
}

function dataIntensiveQueries() {
  group('Data-Intensive Queries', function() {
    
    if (!authenticate()) return;
    
    // Perform queries that require processing large datasets
    const queries = [
      '/programs?limit=1000&includeDetails=true',
      '/programs/search?query=computer&includeTranscripts=true',
      '/analysis/reports?format=detailed&includeComparisons=true',
      '/documents/search?type=all&includeContent=true'
    ];
    
    queries.forEach((endpoint, index) => {
      const response = makeAuthenticatedRequest(
        'GET',
        `${config.baseUrl}${endpoint}`,
        null,
        { 
          tags: { 
            name: `data_query_${index + 1}`,
            queryType: 'intensive'
          } 
        }
      );
      
      if (response) {
        check(response, {
          [`data query ${index + 1} responded`]: (r) => r.status !== 0,
          [`data query ${index + 1} not server error`]: (r) => r.status < 500,
          [`data query ${index + 1} reasonable time`]: (r) => r.timings.duration < 60000
        });
      }
      
      sleep(5); // Allow processing time between intensive queries
    });
    
    sleep(10);
  });
}

export function setup() {
  console.log('📊 Starting Volume Test');
  console.log(`Target: ${config.baseUrl}`);
  console.log('Focus: System behavior under high data volume');
  console.log('Operations:');
  console.log('  - Bulk Program Creation (30%): Multiple programs with extensive data');
  console.log('  - Mass Document Upload (30%): Rapid document processing');
  console.log('  - Bulk Analysis Operations (20%): Multiple concurrent analyses');
  console.log('  - Data-Intensive Queries (20%): Large dataset processing');
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
  
  console.log('✅ Volume test ready to begin');
  
  return { 
    startTime: Date.now(),
    dataOperations: 0,
    volumeMetrics: {
      programsCreated: 0,
      documentsUploaded: 0,
      analysesStarted: 0
    }
  };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  
  console.log('📊 Volume Test Completed');
  console.log('');
  console.log('📈 Volume Test Results:');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Requests: ${requestCount.count || 0}`);
  console.log(`Data Operations: ${uploadSuccesses.count + analysisStarts.count || 0}`);
  console.log(`Average Response Time: ${Math.round(responseTime.avg || 0)}ms`);
  console.log(`95th Percentile: ${Math.round(responseTime.p95 || 0)}ms`);
  console.log(`99th Percentile: ${Math.round(responseTime.p99 || 0)}ms`);
  console.log(`Error Rate: ${Math.round((errorRate.rate || 0) * 10000) / 100}%`);
  console.log('');
  
  // Volume-specific analysis
  const avgResponseTime = responseTime.avg || 0;
  const errorRatePercent = (errorRate.rate || 0) * 100;
  const dataOperationsPerSecond = (uploadSuccesses.count + analysisStarts.count || 0) / duration;
  
  console.log('💾 Volume Processing Assessment:');
  console.log(`Data Operations Rate: ${Math.round(dataOperationsPerSecond * 100) / 100} per second`);
  console.log(`System Data Capacity: ${uploadSuccesses.count + analysisStarts.count || 0} operations handled`);
  console.log(`Upload Success Rate: ${Math.round((uploadSuccesses.count / (uploadSuccesses.count + 1)) * 10000) / 100}%`);
  console.log('');
  
  // Performance benchmarks for volume operations
  if (avgResponseTime < 15000) {
    console.log('✅ EXCELLENT: System handling volume operations efficiently');
  } else if (avgResponseTime < 40000) {
    console.log('⚠️  ACCEPTABLE: Volume operations within reasonable time');
  } else {
    console.log('❌ POOR: Volume operations taking too long');
  }
  
  if (errorRatePercent < 10) {
    console.log('✅ EXCELLENT: Low error rate despite high data volume');
  } else if (errorRatePercent < 15) {
    console.log('⚠️  ACCEPTABLE: Moderate error rate for volume operations');
  } else {
    console.log('❌ POOR: High error rate indicates volume processing issues');
  }
  
  if (dataOperationsPerSecond > 0.05) {
    console.log('✅ GOOD: System processing data operations at good rate');
  } else {
    console.log('⚠️  Limited data processing throughput detected');
  }
  
  console.log('');
  console.log('💡 Volume Test Recommendations:');
  
  if (avgResponseTime > 30000) {
    console.log('- Optimize database queries for large dataset operations');
    console.log('- Consider implementing data pagination for bulk operations');
    console.log('- Add database indexing for frequently queried large tables');
  }
  
  if (errorRatePercent > 15) {
    console.log('- Review memory allocation for large data processing operations');
    console.log('- Implement data streaming for large file uploads');
    console.log('- Consider breaking bulk operations into smaller chunks');
  }
  
  if (dataOperationsPerSecond < 0.02) {
    console.log('- Data processing bottleneck detected - investigate storage I/O');
    console.log('- Consider implementing asynchronous processing for bulk operations');
    console.log('- Review database connection pooling for concurrent data operations');
  }
  
  console.log('- Monitor disk space usage during high-volume periods');
  console.log('- Implement data archiving strategies for long-term volume management');
  console.log('- Consider implementing compression for large document uploads');
}