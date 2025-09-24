module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.security.test.ts'],
  collectCoverageFrom: [
    '../../src/**/*.{ts,js}',
    '../../lambda/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.config.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  // Security-specific configurations
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@lambda/(.*)$': '<rootDir>/../../lambda/$1',
  },
  // Prevent accidental exposure of sensitive data in tests
  collectCoverage: false, // Disable by default for security tests
  silent: false,
  // Ensure tests don't accidentally leak credentials
  clearMocks: true,
  restoreMocks: true,
};