module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000, // 60 second timeout for smoke tests
  verbose: true,
  collectCoverage: false,
  testMatch: [
    '**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};