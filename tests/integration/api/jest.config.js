/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test files
  testMatch: [
    '<rootDir>/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../../setup.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@lambda/(.*)$': '<rootDir>/../../../lambda/$1',
    '^@config/(.*)$': '<rootDir>/../../../config/$1'
  },
  
  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../../../src/**/*.ts',
    '<rootDir>/../../../lambda/**/*.ts',
    '!<rootDir>/../../../**/*.d.ts',
    '!<rootDir>/../../../**/node_modules/**',
    '!<rootDir>/../../../**/*.config.{js,ts}',
    '!<rootDir>/../../../**/dist/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Parallel execution
  maxWorkers: 4,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(aws-sdk|@aws-sdk|@supabase|@qdrant)/)'
  ],
  
  // Global settings
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        compilerOptions: {
          module: 'commonjs'
        }
      }
    }
  },
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Mock settings
  automock: false,
  resetModules: true
};