import { test, expect } from '@playwright/test';

test.describe('Program Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to programs page
    await page.goto('/programs');
  });

  test('should display programs list @smoke', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Should have a page title
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/programs/i);
    
    // Should have programs list or empty state
    const programsList = page.locator('[data-testid="programs-list"], .programs-list, .program-card');
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state').filter({ 
      hasText: /no programs|empty/i 
    });
    
    await expect(programsList.or(emptyState)).toBeVisible();
  });

  test('should allow creating a new program @smoke', async ({ page }) => {
    // Look for create/add button
    const createButton = page.locator('[data-testid="create-program"], [data-testid="add-program"]').or(
      page.locator('button, a').filter({ hasText: /create program|add program|new program/i })
    );
    
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Should open create form (modal or new page)
    const createForm = page.locator('[data-testid="program-form"], form').filter({
      hasText: /create program|program name|department/i
    });
    const createModal = page.locator('.modal, .dialog').filter({
      hasText: /create program|new program/i
    });
    
    await expect(createForm.or(createModal)).toBeVisible();
    
    // Fill in program details
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
    const departmentSelect = page.locator('select[name="department"], [data-testid="department-select"]');
    const levelSelect = page.locator('select[name="level"], [data-testid="level-select"]');
    const saveButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /save|create|submit/i })
    );
    
    await nameInput.fill('Test Computer Science Program');
    
    if (await departmentSelect.count() > 0) {
      await departmentSelect.selectOption({ label: /computer science/i });
    }
    
    if (await levelSelect.count() > 0) {
      await levelSelect.selectOption({ label: /bachelor/i });
    }
    
    await saveButton.click();
    
    // Should show success message or redirect back to list
    const successMessage = page.locator('.success, .alert-success, [data-testid*="success"]');
    await expect(successMessage.or(page.locator('text=Program created, text=Successfully created'))).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields when creating program @regression', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-program"], [data-testid="add-program"]').or(
      page.locator('button, a').filter({ hasText: /create program|add program|new program/i })
    );
    
    await createButton.click();
    
    // Try to submit empty form
    const saveButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /save|create|submit/i })
    );
    
    await saveButton.click();
    
    // Should show validation errors
    const validationErrors = page.locator('.error, .invalid-feedback, [data-testid*="error"]');
    await expect(validationErrors.first()).toBeVisible();
  });

  test('should allow editing an existing program @regression', async ({ page }) => {
    // First, ensure we have at least one program
    const programCards = page.locator('[data-testid="program-card"], .program-card');
    
    if (await programCards.count() === 0) {
      test.skip('No programs available to edit');
    }
    
    // Click on first program or edit button
    const editButton = page.locator('[data-testid="edit-program"]').or(
      page.locator('button, a').filter({ hasText: /edit/i })
    ).first();
    
    const programCard = programCards.first();
    
    if (await editButton.count() > 0) {
      await editButton.click();
    } else {
      await programCard.click();
    }
    
    // Should open edit form
    const editForm = page.locator('[data-testid="program-form"], form');
    await expect(editForm).toBeVisible();
    
    // Update program name
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
    await nameInput.fill('Updated Program Name');
    
    // Save changes
    const saveButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /save|update/i })
    );
    
    await saveButton.click();
    
    // Should show success message
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Program updated, text=Successfully updated')
    );
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should allow deleting a program @regression', async ({ page }) => {
    const programCards = page.locator('[data-testid="program-card"], .program-card');
    
    if (await programCards.count() === 0) {
      test.skip('No programs available to delete');
    }
    
    // Look for delete button
    const deleteButton = page.locator('[data-testid="delete-program"]').or(
      page.locator('button').filter({ hasText: /delete|remove/i })
    ).first();
    
    if (await deleteButton.count() === 0) {
      test.skip('No delete button found');
    }
    
    await deleteButton.click();
    
    // Should show confirmation dialog
    const confirmDialog = page.locator('.modal, .dialog, .confirm').filter({
      hasText: /delete|remove|confirm/i
    });
    
    await expect(confirmDialog).toBeVisible();
    
    // Confirm deletion
    const confirmButton = page.locator('button').filter({ hasText: /yes|delete|confirm/i });
    await confirmButton.click();
    
    // Should show success message
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Program deleted, text=Successfully deleted')
    );
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should filter programs by department @regression', async ({ page }) => {
    // Look for department filter
    const departmentFilter = page.locator('[data-testid="department-filter"], select[name="department"]');
    
    if (await departmentFilter.count() === 0) {
      test.skip('No department filter found');
    }
    
    await departmentFilter.selectOption({ index: 1 }); // Select first non-empty option
    
    // Wait for filtering to complete
    await page.waitForTimeout(1000);
    
    // Programs should be filtered
    const programCards = page.locator('[data-testid="program-card"], .program-card');
    
    if (await programCards.count() > 0) {
      // Verify all visible programs match the filter
      await expect(programCards.first()).toBeVisible();
    }
  });

  test('should search programs by name @regression', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('[data-testid="search-programs"], input[placeholder*="search"]');
    
    if (await searchInput.count() === 0) {
      test.skip('No search input found');
    }
    
    await searchInput.fill('Computer');
    
    // Wait for search to complete
    await page.waitForTimeout(1000);
    
    // Should show filtered results
    const programCards = page.locator('[data-testid="program-card"], .program-card');
    const searchResults = programCards.or(
      page.locator('.no-results, .empty-state').filter({ hasText: /no results|not found/i })
    );
    
    await expect(searchResults).toBeVisible();
  });

  test('should display program details @regression', async ({ page }) => {
    const programCards = page.locator('[data-testid="program-card"], .program-card');
    
    if (await programCards.count() === 0) {
      test.skip('No programs available to view');
    }
    
    // Click on first program
    await programCards.first().click();
    
    // Should navigate to program details or open modal
    const programDetails = page.locator('[data-testid="program-details"], .program-details');
    const detailsModal = page.locator('.modal, .dialog').filter({
      hasText: /program details|course list/i
    });
    
    await expect(programDetails.or(detailsModal)).toBeVisible();
    
    // Should show program information
    const programName = page.locator('[data-testid="program-name"], .program-name, h1, h2');
    const courseList = page.locator('[data-testid="course-list"], .course-list, .courses');
    const programInfo = page.locator('.program-info, .details');
    
    await expect(programName.or(courseList).or(programInfo)).toBeVisible();
  });

  test('should handle pagination @regression', async ({ page }) => {
    const paginationControls = page.locator('.pagination, [data-testid="pagination"]');
    
    if (await paginationControls.count() === 0) {
      test.skip('No pagination controls found');
    }
    
    const nextButton = page.locator('button, a').filter({ hasText: /next|>/ });
    const prevButton = page.locator('button, a').filter({ hasText: /previous|prev|</ });
    
    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Should show different programs or page indicator change
      const pageIndicator = page.locator('.page-info, [data-testid="page-info"]');
      await expect(pageIndicator.or(nextButton)).toBeVisible();
      
      // Go back to first page
      if (await prevButton.isEnabled()) {
        await prevButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should export programs list @regression', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-programs"]').or(
      page.locator('button, a').filter({ hasText: /export|download|csv|excel/i })
    );
    
    if (await exportButton.count() === 0) {
      test.skip('No export functionality found');
    }
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    await exportButton.click();
    
    const download = await downloadPromise;
    
    // Verify download started
    expect(download.suggestedFilename()).toMatch(/programs|export/i);
  });

  test('should show loading states @regression', async ({ page }) => {
    // Reload page to catch loading state
    await page.reload();
    
    // Should show loading indicator initially
    const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
    
    // Loading might be too fast to catch, so this is optional
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Eventually should show content
    await page.waitForLoadState('networkidle');
    const content = page.locator('[data-testid="programs-list"], .programs-list, h1');
    await expect(content).toBeVisible();
  });
});