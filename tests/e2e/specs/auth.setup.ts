import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../test-results/auth.json');

/**
 * Authentication setup for E2E tests
 * This runs before other tests to authenticate and save the auth state
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...');
  
  // Navigate to the login page
  await page.goto('/login');
  
  // Wait for the page to load
  await expect(page).toHaveTitle(/Curriculum Alignment/);
  
  // Check if we're already logged in (redirect to dashboard)
  if (page.url().includes('/dashboard')) {
    console.log('✅ Already authenticated, saving state...');
    await page.context().storageState({ path: authFile });
    return;
  }
  
  // Look for login form
  const loginForm = page.locator('form[data-testid="login-form"]').or(
    page.locator('form').filter({ hasText: /email|login|sign in/i })
  );
  
  if (await loginForm.count() > 0) {
    console.log('📝 Filling login form...');
    
    // Fill in test credentials
    const emailInput = page.locator('input[type="email"]').or(
      page.locator('input[name="email"]')
    );
    const passwordInput = page.locator('input[type="password"]').or(
      page.locator('input[name="password"]')
    );
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login|submit/i })
    );
    
    await emailInput.fill('test.admin@ceu.edu');
    await passwordInput.fill('TestAdmin123!');
    
    // Submit the form
    await submitButton.click();
    
    // Wait for successful login (redirect to dashboard)
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    
    // Verify we're on the dashboard
    await expect(page.locator('h1, [data-testid="dashboard-title"]')).toContainText(/dashboard/i);
    
    console.log('✅ Authentication successful');
    
  } else {
    console.log('🔄 No login form found, checking for OAuth/SSO...');
    
    // Check for OAuth login buttons (Google, Microsoft, etc.)
    const oauthButtons = page.locator('button').filter({ 
      hasText: /sign in with|continue with|google|microsoft|oauth/i 
    });
    
    if (await oauthButtons.count() > 0) {
      console.log('🌐 OAuth login detected, using mock authentication...');
      
      // In a real E2E test, you would:
      // 1. Click the OAuth button
      // 2. Handle the OAuth flow
      // 3. Return to the application
      
      // For this implementation, we'll simulate successful OAuth
      // by directly navigating to the dashboard and setting auth state
      await page.evaluate(() => {
        // Mock successful authentication in localStorage
        const mockAuth = {
          accessToken: 'mock-access-token',
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: Date.now() + 3600000, // 1 hour from now
          user: {
            id: 'test-user-123',
            email: 'test.admin@ceu.edu',
            name: 'Test Admin',
            roles: ['admin']
          }
        };
        localStorage.setItem('auth', JSON.stringify(mockAuth));
      });
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Mock OAuth authentication successful');
      
    } else {
      console.log('⚠️ No authentication method found, proceeding with anonymous access...');
      
      // Some applications might work without authentication in development
      // Try to access the dashboard directly
      await page.goto('/dashboard');
      
      // If we get redirected back to login, that's expected
      if (page.url().includes('/login')) {
        console.log('🔒 Authentication required but not available, using mock state...');
        
        // Set up minimal auth state for testing
        await page.evaluate(() => {
          const mockAuth = {
            accessToken: 'mock-access-token',
            user: { id: 'test-user', email: 'test@example.com' }
          };
          localStorage.setItem('auth', JSON.stringify(mockAuth));
        });
      }
    }
  }
  
  // Save the authentication state
  await page.context().storageState({ path: authFile });
  console.log('💾 Authentication state saved');
});

/**
 * Verify authentication works
 */
setup('verify auth', async ({ page }) => {
  console.log('🔍 Verifying authentication state...');
  
  // Navigate to a protected route
  await page.goto('/dashboard');
  
  // Should not be redirected to login
  await expect(page).not.toHaveURL(/\/login/);
  
  // Should see authenticated content
  const userMenu = page.locator('[data-testid="user-menu"]').or(
    page.locator('.user-menu, .profile-menu, .account-menu')
  );
  
  const dashboardTitle = page.locator('h1, [data-testid="dashboard-title"]').or(
    page.locator('.dashboard-title, .page-title')
  );
  
  // Check for either user menu or dashboard title
  await expect(
    userMenu.or(dashboardTitle)
  ).toBeVisible({ timeout: 5000 });
  
  console.log('✅ Authentication verification successful');
});