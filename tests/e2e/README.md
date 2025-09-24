# End-to-End Tests

This directory contains comprehensive end-to-end tests for the Curriculum Alignment System using Playwright. These tests verify complete user workflows across the entire application stack, from the browser interface through the API to the database.

## Overview

The E2E tests cover critical user journeys:

- **Authentication Flow** - Login, logout, session management
- **Program Management** - CRUD operations for academic programs  
- **Document Upload** - File upload, processing, and management
- **Analysis Workflow** - Curriculum analysis from start to completion

## Test Architecture

### Framework: Playwright
- **Cross-browser testing** - Chromium, Firefox, WebKit, Mobile browsers
- **Parallel execution** - Fast test runs with configurable workers
- **Visual testing** - Screenshot comparisons and visual regression testing
- **Network interception** - API mocking and network condition simulation
- **Trace recording** - Detailed execution traces for debugging

### Project Structure

```
tests/e2e/
├── specs/                          # Test specification files
│   ├── authentication.spec.ts      # Authentication flow tests
│   ├── program-management.spec.ts  # Program CRUD tests
│   ├── document-upload.spec.ts     # Document upload tests
│   ├── analysis-workflow.spec.ts   # Analysis workflow tests
│   ├── auth.setup.ts              # Authentication setup
│   └── auth.cleanup.ts            # Authentication cleanup
├── test-files/                     # Test data files
├── test-results/                   # Test output (screenshots, videos, traces)
├── playwright-report/              # HTML test reports
├── playwright.config.ts            # Playwright configuration
├── global-setup.ts                 # Global test setup
├── global-teardown.ts             # Global test cleanup
├── package.json                    # Dependencies and scripts
├── run-e2e-tests.sh               # Test runner script
└── README.md                      # This file
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Running application at `http://localhost:3000`
- Running API server (if separate) at `http://localhost:3001`

## Installation

Install dependencies and Playwright browsers:

```bash
cd tests/e2e
npm install
npx playwright install
npx playwright install-deps
```

## Running Tests

### Using the Test Runner Script (Recommended)

```bash
# Run all E2E tests
./run-e2e-tests.sh

# Run with browser visible (headed mode)
./run-e2e-tests.sh --headed

# Run in debug mode (step through tests)
./run-e2e-tests.sh --debug

# Run with Playwright UI
./run-e2e-tests.sh --ui

# Run specific browser
./run-e2e-tests.sh --browser firefox
./run-e2e-tests.sh --browser webkit

# Run smoke tests only
./run-e2e-tests.sh --smoke

# Run regression tests only  
./run-e2e-tests.sh --regression

# Run specific test categories
./run-e2e-tests.sh --auth        # Authentication tests only
./run-e2e-tests.sh --programs    # Program management tests only
./run-e2e-tests.sh --documents   # Document upload tests only
./run-e2e-tests.sh --analysis    # Analysis workflow tests only

# Run tests with tracing enabled
./run-e2e-tests.sh --trace

# Run with specific pattern
./run-e2e-tests.sh --pattern "should login"

# Performance options
./run-e2e-tests.sh --workers 4 --retries 2 --timeout 60000
```

### Using npm Scripts

```bash
# Basic test execution
npm test                    # Run all tests
npm run test:debug         # Debug mode
npm run test:headed        # Headed mode
npm run test:ui           # Playwright UI

# Browser-specific tests
npm run test:chromium     # Chrome/Chromium only
npm run test:firefox      # Firefox only  
npm run test:webkit       # Safari/WebKit only
npm run test:mobile       # Mobile browsers

# Test categories
npm run test:auth         # Authentication tests
npm run test:programs     # Program management tests
npm run test:analysis     # Analysis workflow tests
npm run test:documents    # Document upload tests
npm run test:smoke        # Smoke tests (@smoke tag)
npm run test:regression   # Regression tests (@regression tag)

# Utilities
npm run test:report       # Show HTML report
npm run test:trace        # Run with tracing
npm run codegen          # Generate test code
npm run clean            # Clean test artifacts
```

### Using Playwright CLI Directly

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test authentication.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run tests matching pattern
npx playwright test --grep "should login"

# Debug tests
npx playwright test --debug

# Generate test code
npx playwright codegen localhost:3000
```

## Test Configuration

### Environment Variables

```bash
# Application URLs
E2E_BASE_URL=http://localhost:3000         # Frontend URL
E2E_API_URL=http://localhost:3001          # API URL (if separate)

# Test user credentials
TEST_USER_EMAIL=test.admin@ceu.edu
TEST_USER_PASSWORD=TestAdmin123!

# Test data
TEST_PROGRAM_ID=test-cs-bachelor

# CI/CD settings
CI=false                                   # Set to true in CI environment
```

### Browser Projects

The configuration supports multiple browser projects:

- **chromium** - Google Chrome/Chromium (default)
- **firefox** - Mozilla Firefox
- **webkit** - Safari/WebKit
- **mobile-chrome** - Mobile Chrome (Pixel 5)
- **mobile-safari** - Mobile Safari (iPhone 12)
- **Microsoft Edge** - Edge browser

### Timeouts and Retries

```typescript
// Global settings
timeout: 60 * 1000,           // 60 seconds per test
expect.timeout: 10 * 1000,    // 10 seconds for assertions
actionTimeout: 15 * 1000,     // 15 seconds for actions
navigationTimeout: 30 * 1000, // 30 seconds for navigation

// Retry configuration
retries: process.env.CI ? 2 : 0,  // Retry failed tests in CI
```

## Test Categories and Tags

Tests are organized using tags for easy filtering:

### Tag System
- `@smoke` - Critical functionality tests (fast, essential features)
- `@regression` - Comprehensive tests (slower, edge cases)

### Test Categories

#### Authentication Flow (`authentication.spec.ts`)
- ✅ Login form validation
- ✅ Successful login/logout
- ✅ OAuth/SSO integration
- ✅ Session persistence
- ✅ Access control

#### Program Management (`program-management.spec.ts`)  
- ✅ Program listing and filtering
- ✅ Program creation and validation
- ✅ Program editing and updating
- ✅ Program deletion with confirmation
- ✅ Search and pagination

#### Document Upload (`document-upload.spec.ts`)
- ✅ File upload (Excel, Word, PDF)
- ✅ File type and size validation
- ✅ Drag and drop functionality
- ✅ Upload progress tracking
- ✅ Processing status monitoring
- ✅ Document management

#### Analysis Workflow (`analysis-workflow.spec.ts`)
- ✅ Analysis configuration and start
- ✅ Progress monitoring and agent status
- ✅ Real-time updates via WebSocket
- ✅ Results display and interpretation  
- ✅ Report generation and download
- ✅ Analysis history and comparison

## Test Data and Fixtures

### Authentication Setup
Tests use a shared authentication state to avoid repeated logins:

```typescript
// auth.setup.ts creates authenticated session
// Other tests reuse the auth state
storageState: 'test-results/auth.json'
```

### Test Data Generation
```typescript
// Mock data for testing
const mockProgram = {
  name: 'Test Computer Science Program',
  department: 'Computer Science',
  level: 'bachelor',
  // ...
};

// File uploads use Buffer.from() for mock files
await page.setInputFiles(input, {
  name: 'test-document.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('Mock Excel content')
});
```

## Visual Testing

Playwright supports visual regression testing with screenshots:

```bash
# Update visual baselines
./run-e2e-tests.sh --update-snapshots

# Visual comparisons automatically run during tests
await expect(page).toHaveScreenshot('login-form.png');
```

## Debugging and Troubleshooting

### Debug Mode
```bash
# Step through tests interactively
./run-e2e-tests.sh --debug

# Run specific test in debug mode
npx playwright test authentication.spec.ts --debug
```

### Playwright UI
```bash
# Interactive test runner with time travel
./run-e2e-tests.sh --ui
```

### Trace Viewing
```bash
# Record and view execution traces
./run-e2e-tests.sh --trace
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos
- **Screenshots**: Automatically captured on test failures
- **Videos**: Recorded for failed tests (retained-on-failure)
- **Location**: `test-results/` directory

### Common Issues

**Tests timing out:**
- Increase timeout: `--timeout 120000` (2 minutes)
- Check application is running and responsive
- Verify network connectivity to application

**Flaky tests:**
- Run with `--retries 2` to retry failed tests
- Check for race conditions in async operations
- Ensure proper wait conditions (`waitForLoadState`, `waitForSelector`)

**Authentication issues:**
- Verify test credentials are correct
- Check if authentication setup completed successfully
- Clear auth state: `rm test-results/auth.json`

**Element not found:**
- Use flexible selectors with fallbacks: `locator1.or(locator2)`
- Add explicit waits: `await expect(element).toBeVisible()`
- Check if element is in different frame or shadow DOM

## Continuous Integration

The tests are CI/CD ready with:

- **GitHub Actions integration** - Built-in reporter
- **Parallel execution** - Configurable worker count
- **Artifact collection** - Screenshots, videos, traces, reports
- **Retry logic** - Automatic retry of flaky tests
- **Environment detection** - Different behavior in CI vs local

### CI Configuration Example

```yaml
- name: Run E2E Tests
  run: |
    cd tests/e2e
    ./run-e2e-tests.sh --workers=2 --retries=2
  env:
    CI: true
    E2E_BASE_URL: http://localhost:3000
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-results
    path: tests/e2e/test-results/
```

## Performance Testing

E2E tests also verify performance characteristics:

- **Page load times** - Navigation and load state monitoring  
- **Network conditions** - Slow 3G, offline scenarios
- **Resource usage** - Memory and CPU monitoring
- **Responsiveness** - Mobile and tablet viewport testing

```typescript
// Network throttling
await page.route('**/*', route => {
  route.continue({ delay: 1000 }); // Simulate slow network
});

// Performance monitoring  
const startTime = Date.now();
await page.goto('/dashboard');
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(5000); // 5 second load time SLA
```

## Best Practices

### Selector Strategy
1. **Prefer test IDs**: `[data-testid="element"]`
2. **Semantic selectors**: `role=button[name="Submit"]`
3. **Flexible fallbacks**: `locator1.or(locator2)`
4. **Avoid brittle selectors**: CSS classes that may change

### Wait Strategies
```typescript
// Good: Explicit waits for specific conditions
await expect(page.locator('.success')).toBeVisible();
await page.waitForLoadState('networkidle');

// Avoid: Fixed timeouts
await page.waitForTimeout(5000); // Brittle
```

### Test Organization
- **Independent tests** - Each test should run in isolation
- **Descriptive names** - Clear test intentions
- **Proper cleanup** - Reset state between tests
- **Shared utilities** - Reusable helper functions

### Error Handling
```typescript
// Graceful degradation for optional features
if (await element.count() > 0) {
  await element.click();
} else {
  test.skip('Feature not available in this build');
}
```

## Contributing

When adding new E2E tests:

1. **Follow naming conventions**: `feature-name.spec.ts`
2. **Use appropriate tags**: `@smoke` for critical paths, `@regression` for comprehensive coverage
3. **Include both positive and negative test cases**
4. **Add proper error handling and fallbacks**
5. **Update documentation** for new test categories
6. **Test across multiple browsers** before submitting

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feature-page');
  });

  test('should perform basic functionality @smoke', async ({ page }) => {
    // Test critical functionality
  });

  test('should handle edge cases @regression', async ({ page }) => {
    // Test edge cases and error conditions
  });
});
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [API Integration Tests](../integration/api/README.md)
- [Load Tests](../load/README.md)
- [Application Architecture](../../docs/architecture.md)
- [Frontend Components](../../frontend/src/components/)