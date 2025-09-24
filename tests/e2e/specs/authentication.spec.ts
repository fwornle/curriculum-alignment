import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the login page
    await page.goto('/login');
  });

  test('should display login form @smoke', async ({ page }) => {
    // Verify we're on the login page
    await expect(page).toHaveTitle(/Login|Sign In|Curriculum Alignment/);
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form @regression', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    
    // Try to submit empty form
    await submitButton.click();
    
    // Check for validation messages
    const errorMessages = page.locator('.error, .invalid-feedback, [data-testid*="error"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials @regression', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    
    // Enter invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // Should see error message
    const errorMessage = page.locator('.error, .alert-danger, [data-testid*="error"]').or(
      page.locator('text=Invalid credentials, text=Login failed, text=Authentication failed')
    );
    
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials @smoke', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    
    // Enter valid test credentials
    await emailInput.fill('test.admin@ceu.edu');
    await passwordInput.fill('TestAdmin123!');
    await submitButton.click();
    
    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    // Verify we're on the dashboard
    await expect(page.locator('h1, [data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should handle OAuth login flow @regression', async ({ page }) => {
    // Look for OAuth login buttons
    const oauthButtons = page.locator('button').filter({ 
      hasText: /sign in with|continue with|google|microsoft/i 
    });
    
    if (await oauthButtons.count() > 0) {
      const googleButton = oauthButtons.first();
      await expect(googleButton).toBeVisible();
      
      // Click OAuth button (this would normally open a popup)
      await googleButton.click();
      
      // In a real test, you would handle the OAuth popup window
      // For this test, we'll verify the button click was registered
      await expect(googleButton).toHaveAttribute('disabled', { timeout: 5000 });
    } else {
      test.skip('No OAuth login buttons found');
    }
  });

  test('should redirect authenticated users away from login @regression', async ({ page, context }) => {
    // Set up authenticated state
    await context.addCookies([
      {
        name: 'auth-token',
        value: 'mock-auth-token',
        domain: 'localhost',
        path: '/'
      }
    ]);
    
    // Navigate to login page
    await page.goto('/login');
    
    // Should be redirected to dashboard
    await page.waitForURL(/\/dashboard|\//, { timeout: 5000 });
    
    // Should not be on login page
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should show forgot password option @regression', async ({ page }) => {
    const forgotPasswordLink = page.locator('a, button').filter({ 
      hasText: /forgot password|reset password|can't sign in/i 
    });
    
    if (await forgotPasswordLink.count() > 0) {
      await expect(forgotPasswordLink.first()).toBeVisible();
      
      // Click forgot password
      await forgotPasswordLink.first().click();
      
      // Should navigate to forgot password page or show modal
      await expect(
        page.locator('h1, h2').filter({ hasText: /forgot password|reset password/i })
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('No forgot password option found');
    }
  });

  test('should handle password visibility toggle @regression', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"], .password-toggle, .show-password');
    
    if (await toggleButton.count() > 0) {
      await passwordInput.fill('testpassword');
      
      // Click toggle to show password
      await toggleButton.click();
      
      // Input type should change to text
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle again to hide password
      await toggleButton.click();
      
      // Input type should change back to password
      await expect(passwordInput).toHaveAttribute('type', 'password');
    } else {
      test.skip('No password visibility toggle found');
    }
  });

  test('should remember login state across browser sessions @regression', async ({ page, context }) => {
    // Login successfully
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    const rememberCheckbox = page.locator('input[type="checkbox"]').filter({ 
      hasText: /remember me|keep me signed in|stay signed in/i 
    });
    
    await emailInput.fill('test.admin@ceu.edu');
    await passwordInput.fill('TestAdmin123!');
    
    // Check remember me if available
    if (await rememberCheckbox.count() > 0) {
      await rememberCheckbox.check();
    }
    
    await submitButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    // Close and reopen browser
    await page.close();
    const newPage = await context.newPage();
    
    // Navigate to protected page
    await newPage.goto('/dashboard');
    
    // Should still be logged in (not redirected to login)
    await expect(newPage).not.toHaveURL(/\/login/);
    await expect(newPage.locator('h1, [data-testid="dashboard-title"]')).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully @smoke', async ({ page }) => {
    // First login
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /sign in|login/i })
    );
    
    await emailInput.fill('test.admin@ceu.edu');
    await passwordInput.fill('TestAdmin123!');
    await submitButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    // Now logout
    const userMenu = page.locator('[data-testid="user-menu"]').or(
      page.locator('.user-menu, .profile-menu, .dropdown-toggle')
    );
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
      
      const logoutButton = page.locator('[data-testid="logout-button"]').or(
        page.locator('button, a').filter({ hasText: /logout|sign out/i })
      );
      
      await logoutButton.click();
    } else {
      // Look for direct logout button
      const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i });
      await logoutButton.click();
    }
    
    // Should redirect to login page
    await page.waitForURL(/\/login|\/|\/auth/, { timeout: 5000 });
    
    // Verify logged out by trying to access protected page
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});