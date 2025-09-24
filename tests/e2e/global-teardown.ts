import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for E2E tests
 * This runs once after all tests and cleans up the test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment teardown...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    
    // Clean up auth files
    const authFilePath = path.join(__dirname, 'test-results', 'auth.json');
    if (fs.existsSync(authFilePath)) {
      fs.unlinkSync(authFilePath);
      console.log('✅ Auth state cleaned up');
    }
    
    // Clean up any temporary files
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Temporary files cleaned up');
    }
    
    // Generate test summary
    await generateTestSummary();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Clean up test data created during tests
 */
async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  // This would typically involve:
  // 1. Deleting test users
  // 2. Removing test programs
  // 3. Deleting uploaded test documents
  // 4. Clearing test database records
  
  // Get test data from global
  const testData = (global as any).__TEST_DATA__;
  
  if (testData) {
    console.log(`📊 Test data summary:`);
    console.log(`   - Users: ${testData.users?.length || 0}`);
    console.log(`   - Programs: ${testData.programs?.length || 0}`);
    
    // In a real implementation, make API calls to clean up data
    // For now, just clear the global data
    delete (global as any).__TEST_DATA__;
  }
  
  console.log('✅ Test data cleanup completed');
}

/**
 * Generate a summary of test results
 */
async function generateTestSummary() {
  console.log('📈 Generating test summary...');
  
  const resultsFile = path.join(__dirname, 'test-results', 'results.json');
  
  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      const summary = {
        totalTests: results.suites?.reduce((total: number, suite: any) => {
          return total + (suite.specs?.length || 0);
        }, 0) || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: results.stats?.duration || 0
      };
      
      // Calculate test outcomes
      results.suites?.forEach((suite: any) => {
        suite.specs?.forEach((spec: any) => {
          spec.tests?.forEach((test: any) => {
            switch (test.status) {
              case 'passed':
                summary.passed++;
                break;
              case 'failed':
                summary.failed++;
                break;
              case 'skipped':
                summary.skipped++;
                break;
            }
          });
        });
      });
      
      console.log('📊 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   ✅ Passed: ${summary.passed}`);
      console.log(`   ❌ Failed: ${summary.failed}`);
      console.log(`   ⏭️ Skipped: ${summary.skipped}`);
      console.log(`   ⏱️ Duration: ${Math.round(summary.duration / 1000)}s`);
      
      // Write summary to file
      const summaryFile = path.join(__dirname, 'test-results', 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      
    } catch (error) {
      console.log('⚠️ Could not parse test results for summary');
    }
  } else {
    console.log('⚠️ No test results file found for summary');
  }
  
  console.log('✅ Test summary generated');
}

export default globalTeardown;