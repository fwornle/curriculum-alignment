// Global test setup for smoke tests
console.log(`Running smoke tests against: ${process.env.API_URL || 'http://localhost:3000'}`);
console.log(`Environment: ${process.env.ENVIRONMENT || 'test'}`);

// Add custom matchers or global setup here if needed
beforeAll(() => {
  // Ensure API_URL is set
  if (!process.env.API_URL) {
    console.warn('API_URL not set, using default: http://localhost:3000');
  }
});

afterAll(() => {
  console.log('Smoke tests completed');
});