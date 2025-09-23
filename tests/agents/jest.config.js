module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // File patterns for tests
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform files
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'lambda/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    'lambda/coordinator/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'lambda/qa-agent/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/agents/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Parallel testing
  maxWorkers: '50%',
  
  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Module paths
  modulePaths: ['<rootDir>/src', '<rootDir>/lambda'],
  
  // Mock patterns
  unmockedModulePathPatterns: [
    'node_modules/(?!aws-sdk)'
  ],
  
  // Test reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'report.html',
      expand: true
    }]
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ],
  
  // Notification settings
  notify: false,
  notifyMode: 'failure-change',
  
  // Bail configuration
  bail: 0,
  
  // Force exit
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};