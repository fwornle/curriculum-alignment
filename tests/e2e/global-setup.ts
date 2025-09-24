import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * This runs once before all tests and sets up the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be available
    console.log(`📍 Checking application availability at ${baseURL}...`);
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Verify the application loaded correctly
    const title = await page.title();
    console.log(`✅ Application loaded successfully. Title: ${title}`);
    
    // Check if health endpoint is available
    try {
      const healthResponse = await page.request.get(`${baseURL.replace('3000', '3001')}/api/v1/health`);
      if (healthResponse.ok()) {
        console.log('✅ API health check passed');
      } else {
        console.log('⚠️ API health check failed, but continuing with tests');
      }
    } catch (error) {
      console.log('⚠️ Could not reach API health endpoint, but continuing with tests');
    }
    
    // Set up test data if needed
    await setupTestData(page);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Set up test data needed for E2E tests
 */
async function setupTestData(page: any) {
  console.log('📝 Setting up test data...');
  
  // This would typically involve:
  // 1. Creating test users
  // 2. Setting up test programs
  // 3. Uploading test documents
  // 4. Configuring test environment
  
  // For now, we'll just log that this step would happen
  // In a real implementation, this would make API calls to set up data
  
  const testData = {
    users: [
      {
        email: 'test.admin@ceu.edu',
        password: 'TestAdmin123!',
        role: 'admin'
      },
      {
        email: 'test.faculty@ceu.edu', 
        password: 'TestFaculty123!',
        role: 'faculty'
      }
    ],
    programs: [
      {
        id: 'test-cs-bachelor',
        name: 'Test Computer Science Bachelor',
        department: 'Computer Science',
        level: 'bachelor'
      }
    ]
  };
  
  // Store test data in global for use by tests
  (global as any).__TEST_DATA__ = testData;
  
  console.log('✅ Test data setup completed');
}

export default globalSetup;