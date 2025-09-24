import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to document upload page
    await page.goto('/documents');
  });

  test('should display document upload interface @smoke', async ({ page }) => {
    // Should have page title
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/documents|upload/i);
    
    // Should have upload area
    const uploadArea = page.locator('[data-testid="upload-area"], .upload-area, .dropzone');
    const uploadButton = page.locator('button, a').filter({ hasText: /upload|add document/i });
    
    await expect(uploadArea.or(uploadButton)).toBeVisible();
  });

  test('should allow uploading Excel file @smoke', async ({ page }) => {
    // Create test file path
    const testFilePath = path.join(__dirname, '../test-files/sample-curriculum.xlsx');
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    // If file input is hidden, click upload button to reveal it
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    // Create a mock file since we don't have actual test files
    await page.setInputFiles(fileInput, {
      name: 'sample-curriculum.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('Mock Excel file content')
    });
    
    // Submit upload
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show upload progress or success
    const progressBar = page.locator('.progress, [data-testid="upload-progress"]');
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Upload successful, text=File uploaded')
    );
    
    await expect(progressBar.or(successMessage)).toBeVisible({ timeout: 15000 });
  });

  test('should allow uploading Word document @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    await page.setInputFiles(fileInput, {
      name: 'program-handbook.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('Mock Word document content')
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Upload successful, text=File uploaded')
    );
    
    await expect(successMessage).toBeVisible({ timeout: 15000 });
  });

  test('should allow uploading PDF document @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    await page.setInputFiles(fileInput, {
      name: 'accreditation-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Upload successful, text=File uploaded')
    );
    
    await expect(successMessage).toBeVisible({ timeout: 15000 });
  });

  test('should reject unsupported file types @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    // Try to upload unsupported file type
    await page.setInputFiles(fileInput, {
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Plain text content')
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show error message
    const errorMessage = page.locator('.error, .alert-danger').or(
      page.locator('text=Unsupported file type, text=Invalid file format')
    );
    
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should reject files that are too large @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    // Create large file buffer (simulate 60MB file)
    const largeBuffer = Buffer.alloc(60 * 1024 * 1024, 'x');
    
    await page.setInputFiles(fileInput, {
      name: 'large-document.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: largeBuffer
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show file size error
    const errorMessage = page.locator('.error, .alert-danger').or(
      page.locator('text=File too large, text=Size limit exceeded')
    );
    
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should support drag and drop upload @regression', async ({ page }) => {
    const dropZone = page.locator('[data-testid="upload-area"], .upload-area, .dropzone');
    
    if (await dropZone.count() === 0) {
      test.skip('No drag and drop area found');
    }
    
    // Create data transfer object
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    
    // Create file
    const file = await page.evaluateHandle(([name, type, content]) => {
      const file = new File([content], name, { type });
      return file;
    }, ['curriculum.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Mock content']);
    
    // Add file to data transfer
    await page.evaluate(([dataTransfer, file]) => {
      dataTransfer.items.add(file);
    }, [dataTransfer, file]);
    
    // Dispatch drop event
    await dropZone.dispatchEvent('drop', { dataTransfer });
    
    // Should show upload progress or success
    const uploadProgress = page.locator('.progress, [data-testid="upload-progress"]');
    const successMessage = page.locator('.success, .alert-success');
    
    await expect(uploadProgress.or(successMessage)).toBeVisible({ timeout: 15000 });
  });

  test('should show upload progress @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    // Upload a medium-sized file to see progress
    const mediumBuffer = Buffer.alloc(5 * 1024 * 1024, 'x'); // 5MB
    
    await page.setInputFiles(fileInput, {
      name: 'medium-document.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: mediumBuffer
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show progress bar
    const progressBar = page.locator('.progress, [data-testid="upload-progress"]');
    const progressPercent = page.locator('.progress-percent, [data-testid="progress-percent"]');
    
    await expect(progressBar.or(progressPercent)).toBeVisible({ timeout: 5000 });
  });

  test('should allow cancelling upload @regression', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    // Upload a large file to have time to cancel
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'x'); // 10MB
    
    await page.setInputFiles(fileInput, {
      name: 'large-document.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: largeBuffer
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Look for cancel button
    const cancelButton = page.locator('[data-testid="cancel-upload"]').or(
      page.locator('button').filter({ hasText: /cancel|abort|stop/i })
    );
    
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      
      // Should show cancelled message
      const cancelMessage = page.locator('text=Upload cancelled, text=Upload aborted');
      await expect(cancelMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should associate document with program @regression', async ({ page }) => {
    // Look for program selection
    const programSelect = page.locator('[data-testid="program-select"], select[name="program"]');
    
    if (await programSelect.count() === 0) {
      test.skip('No program selection found');
    }
    
    // Select a program
    await programSelect.selectOption({ index: 1 });
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await page.setInputFiles(fileInput, {
      name: 'program-curriculum.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('Mock Excel content')
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show success with program association
    const successMessage = page.locator('.success, .alert-success');
    await expect(successMessage).toBeVisible({ timeout: 15000 });
  });

  test('should show document processing status @regression', async ({ page }) => {
    // Upload a document first
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('[data-testid="upload-button"]').or(
      page.locator('button').filter({ hasText: /upload|choose file|browse/i })
    );
    
    if (await uploadButton.count() > 0 && !(await fileInput.isVisible())) {
      await uploadButton.click();
    }
    
    await page.setInputFiles(fileInput, {
      name: 'processing-test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('Mock Excel content')
    });
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /upload|submit/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should show processing status
    const processingStatus = page.locator('[data-testid="processing-status"]').or(
      page.locator('text=Processing, text=Analyzing, .status')
    );
    
    await expect(processingStatus).toBeVisible({ timeout: 15000 });
    
    // Eventually should complete processing
    const completedStatus = page.locator('text=Completed, text=Ready, text=Processed');
    await expect(completedStatus).toBeVisible({ timeout: 30000 });
  });

  test('should display uploaded documents list @smoke', async ({ page }) => {
    // Navigate to documents list if not already there
    const documentsListLink = page.locator('a, button').filter({ hasText: /my documents|document list/i });
    
    if (await documentsListLink.count() > 0) {
      await documentsListLink.click();
    }
    
    // Should show documents list or empty state
    const documentsList = page.locator('[data-testid="documents-list"], .documents-list');
    const emptyState = page.locator('.empty-state').filter({ hasText: /no documents|empty/i });
    
    await expect(documentsList.or(emptyState)).toBeVisible();
  });

  test('should allow deleting uploaded documents @regression', async ({ page }) => {
    // Navigate to documents list
    const documentsListLink = page.locator('a, button').filter({ hasText: /my documents|document list/i });
    
    if (await documentsListLink.count() > 0) {
      await documentsListLink.click();
    }
    
    const documentItems = page.locator('[data-testid="document-item"], .document-item');
    
    if (await documentItems.count() === 0) {
      test.skip('No documents available to delete');
    }
    
    // Find delete button
    const deleteButton = page.locator('[data-testid="delete-document"]').or(
      page.locator('button').filter({ hasText: /delete|remove/i })
    ).first();
    
    if (await deleteButton.count() === 0) {
      test.skip('No delete button found');
    }
    
    await deleteButton.click();
    
    // Should show confirmation
    const confirmDialog = page.locator('.modal, .dialog').filter({ hasText: /delete|confirm/i });
    await expect(confirmDialog).toBeVisible();
    
    const confirmButton = page.locator('button').filter({ hasText: /yes|delete|confirm/i });
    await confirmButton.click();
    
    // Should show success message
    const successMessage = page.locator('.success, .alert-success');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });
});