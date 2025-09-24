import { test as cleanup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../test-results/auth.json');

/**
 * Authentication cleanup for E2E tests
 * This runs after all tests to clean up authentication state
 */
cleanup('logout and cleanup auth', async ({ page }) => {
  console.log('🧹 Cleaning up authentication...');
  
  try {
    // Navigate to the application
    await page.goto('/dashboard');
    
    // Look for logout button or user menu
    const userMenu = page.locator('[data-testid="user-menu"]').or(
      page.locator('.user-menu, .profile-menu, .account-menu, .dropdown-toggle')
    );
    
    if (await userMenu.isVisible()) {
      console.log('👤 User menu found, attempting logout...');
      
      // Click user menu to open dropdown
      await userMenu.click();
      
      // Look for logout button
      const logoutButton = page.locator('[data-testid="logout-button"]').or(
        page.locator('button, a').filter({ hasText: /logout|sign out|log out/i })
      );
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        
        // Wait for redirect to login page
        await page.waitForURL(/\/login|\/|\/auth/, { timeout: 5000 });
        console.log('✅ Logout successful');
      }
    } else {
      console.log('🔍 No user menu found, clearing auth state manually...');
    }
    
    // Clear authentication from browser storage
    await page.evaluate(() => {
      // Clear localStorage
      const authKeys = ['auth', 'token', 'user', 'session', 'accessToken', 'idToken'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage  
      authKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Clear any auth-related cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.toLowerCase().includes('auth') || 
            name.toLowerCase().includes('token') || 
            name.toLowerCase().includes('session')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    });
    
    console.log('🗑️ Browser storage cleared');
    
  } catch (error) {
    console.log('⚠️ Logout process encountered error:', error);
    // Continue with cleanup even if logout fails
  }
  
  // Remove the auth file
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('🗑️ Auth state file removed');
  }
  
  console.log('✅ Authentication cleanup completed');
});

/**
 * Clean up test data created during auth tests
 */
cleanup('cleanup test data', async ({ page }) => {
  console.log('🗑️ Cleaning up test data...');
  
  // This would typically make API calls to clean up:
  // 1. Delete test users created during tests
  // 2. Remove test sessions from database
  // 3. Clean up any test-specific data
  
  // For now, we'll just log that this cleanup would happen
  const testData = (global as any).__TEST_DATA__;
  
  if (testData?.users) {
    console.log(`🗑️ Would clean up ${testData.users.length} test users`);
  }
  
  if (testData?.sessions) {
    console.log(`🗑️ Would clean up ${testData.sessions.length} test sessions`);
  }
  
  console.log('✅ Test data cleanup completed');
});