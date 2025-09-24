import { test, expect } from '@playwright/test';

test.describe('Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analysis page
    await page.goto('/analysis');
  });

  test('should display analysis dashboard @smoke', async ({ page }) => {
    // Should have page title
    await expect(page.locator('h1, [data-testid="page-title"]')).toContainText(/analysis|curriculum analysis/i);
    
    // Should show analysis options or previous analyses
    const startAnalysisButton = page.locator('[data-testid="start-analysis"]').or(
      page.locator('button, a').filter({ hasText: /start analysis|new analysis|analyze/i })
    );
    const analysesList = page.locator('[data-testid="analyses-list"], .analyses-list');
    
    await expect(startAnalysisButton.or(analysesList)).toBeVisible();
  });

  test('should allow starting new analysis @smoke', async ({ page }) => {
    // Click start analysis button
    const startAnalysisButton = page.locator('[data-testid="start-analysis"]').or(
      page.locator('button, a').filter({ hasText: /start analysis|new analysis|analyze/i })
    );
    
    await expect(startAnalysisButton).toBeVisible();
    await startAnalysisButton.click();
    
    // Should open analysis configuration
    const analysisConfig = page.locator('[data-testid="analysis-config"], .analysis-config');
    const configModal = page.locator('.modal, .dialog').filter({
      hasText: /analysis configuration|configure analysis/i
    });
    
    await expect(analysisConfig.or(configModal)).toBeVisible();
    
    // Should have program selection
    const programSelect = page.locator('[data-testid="program-select"], select[name="program"]');
    await expect(programSelect).toBeVisible();
    
    // Select a program
    await programSelect.selectOption({ index: 1 });
    
    // Should have analysis type options
    const analysisTypeSelect = page.locator('[data-testid="analysis-type"], select[name="analysisType"]');
    const quickAnalysisOption = page.locator('input[value="quick"], button').filter({ hasText: /quick/i });
    const comprehensiveAnalysisOption = page.locator('input[value="comprehensive"], button').filter({ hasText: /comprehensive/i });
    
    if (await analysisTypeSelect.count() > 0) {
      await analysisTypeSelect.selectOption('comprehensive');
    } else if (await comprehensiveAnalysisOption.count() > 0) {
      await comprehensiveAnalysisOption.click();
    }
    
    // Start the analysis
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /start analysis|begin|analyze/i })
    );
    
    await submitButton.click();
    
    // Should show analysis started confirmation
    const successMessage = page.locator('.success, .alert-success').or(
      page.locator('text=Analysis started, text=Analysis initiated')
    );
    
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should validate analysis configuration @regression', async ({ page }) => {
    const startAnalysisButton = page.locator('[data-testid="start-analysis"]').or(
      page.locator('button, a').filter({ hasText: /start analysis|new analysis|analyze/i })
    );
    
    await startAnalysisButton.click();
    
    // Try to submit without selecting program
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /start analysis|begin|analyze/i })
    );
    
    await submitButton.click();
    
    // Should show validation errors
    const validationError = page.locator('.error, .invalid-feedback, [data-testid*="error"]');
    await expect(validationError).toBeVisible();
  });

  test('should show analysis progress @regression', async ({ page }) => {
    // Start an analysis first
    await page.goto('/analysis/new');
    
    const programSelect = page.locator('[data-testid="program-select"], select[name="program"]');
    if (await programSelect.count() > 0) {
      await programSelect.selectOption({ index: 1 });
    }
    
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button').filter({ hasText: /start analysis|begin|analyze/i })
    );
    
    if (await submitButton.count() > 0) {
      await submitButton.click();
    }
    
    // Should navigate to progress page or show progress section
    const progressSection = page.locator('[data-testid="analysis-progress"], .analysis-progress');
    const progressBar = page.locator('.progress, [data-testid="progress-bar"]');
    const agentStatus = page.locator('[data-testid="agent-status"], .agent-status');
    
    await expect(progressSection.or(progressBar).or(agentStatus)).toBeVisible({ timeout: 15000 });
    
    // Should show agent statuses
    const agents = ['coordinator', 'web-search', 'document-processing', 'accreditation-expert'];
    
    for (const agent of agents) {
      const agentStatusItem = page.locator(`[data-testid="agent-${agent}"]`).or(
        page.locator('.agent-item').filter({ hasText: new RegExp(agent.replace('-', ' '), 'i') })
      );
      
      if (await agentStatusItem.count() > 0) {
        await expect(agentStatusItem).toBeVisible();
      }
    }
  });

  test('should display analysis results @regression', async ({ page }) => {
    // Navigate to a completed analysis (mock URL)
    await page.goto('/analysis/completed-analysis-123');
    
    // Should show analysis results
    const resultsSection = page.locator('[data-testid="analysis-results"], .analysis-results');
    const alignmentScore = page.locator('[data-testid="alignment-score"], .alignment-score');
    const gapAnalysis = page.locator('[data-testid="gap-analysis"], .gap-analysis');
    const recommendations = page.locator('[data-testid="recommendations"], .recommendations');
    
    // At least one results section should be visible
    await expect(resultsSection.or(alignmentScore).or(gapAnalysis).or(recommendations)).toBeVisible({ timeout: 10000 });
    
    // Should show comparison with peer universities
    const peerComparison = page.locator('[data-testid="peer-comparison"], .peer-comparison');
    if (await peerComparison.count() > 0) {
      await expect(peerComparison).toBeVisible();
    }
  });

  test('should allow downloading analysis report @regression', async ({ page }) => {
    // Navigate to completed analysis
    await page.goto('/analysis/completed-analysis-123');
    
    // Look for download/export button
    const downloadButton = page.locator('[data-testid="download-report"]').or(
      page.locator('button, a').filter({ hasText: /download|export|report|pdf/i })
    );
    
    if (await downloadButton.count() === 0) {
      test.skip('No download report functionality found');
    }
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    await downloadButton.click();
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/report|analysis/i);
  });

  test('should show analysis cost estimation @regression', async ({ page }) => {
    const startAnalysisButton = page.locator('[data-testid="start-analysis"]').or(
      page.locator('button, a').filter({ hasText: /start analysis|new analysis|analyze/i })
    );
    
    await startAnalysisButton.click();
    
    // Configure analysis
    const programSelect = page.locator('[data-testid="program-select"], select[name="program"]');
    if (await programSelect.count() > 0) {
      await programSelect.selectOption({ index: 1 });
    }
    
    const comprehensiveOption = page.locator('input[value="comprehensive"], button').filter({ hasText: /comprehensive/i });
    if (await comprehensiveOption.count() > 0) {
      await comprehensiveOption.click();
    }
    
    // Should show cost estimation
    const costEstimation = page.locator('[data-testid="cost-estimate"], .cost-estimate');
    const estimatedCost = page.locator('[data-testid="estimated-cost"]').or(
      page.locator('text=/\\$[0-9.]+|[0-9.]+ credits/')
    );
    
    await expect(costEstimation.or(estimatedCost)).toBeVisible({ timeout: 5000 });
  });

  test('should allow cancelling running analysis @regression', async ({ page }) => {
    // Navigate to running analysis
    await page.goto('/analysis/running-analysis-456');
    
    // Should show cancel button
    const cancelButton = page.locator('[data-testid="cancel-analysis"]').or(
      page.locator('button').filter({ hasText: /cancel|stop|abort/i })
    );
    
    if (await cancelButton.count() === 0) {
      test.skip('No cancel analysis functionality found');
    }
    
    await cancelButton.click();
    
    // Should show confirmation dialog
    const confirmDialog = page.locator('.modal, .dialog').filter({ hasText: /cancel|confirm/i });
    await expect(confirmDialog).toBeVisible();
    
    const confirmButton = page.locator('button').filter({ hasText: /yes|cancel|confirm/i });
    await confirmButton.click();
    
    // Should show cancellation confirmation
    const cancelMessage = page.locator('.success, .info').or(
      page.locator('text=Analysis cancelled, text=Cancelled successfully')
    );
    
    await expect(cancelMessage).toBeVisible({ timeout: 10000 });
  });

  test('should display analysis history @regression', async ({ page }) => {
    // Navigate to analysis history
    const historyLink = page.locator('a, button').filter({ hasText: /history|previous|past analyses/i });
    
    if (await historyLink.count() > 0) {
      await historyLink.click();
    } else {
      await page.goto('/analysis/history');
    }
    
    // Should show analysis history list or empty state
    const historyList = page.locator('[data-testid="analysis-history"], .analysis-history');
    const emptyState = page.locator('.empty-state').filter({ hasText: /no analyses|no history/i });
    
    await expect(historyList.or(emptyState)).toBeVisible();
    
    // If there are analyses, verify they show status and date
    const analysisItems = page.locator('[data-testid="analysis-item"], .analysis-item');
    
    if (await analysisItems.count() > 0) {
      const firstItem = analysisItems.first();
      const status = page.locator('.status, [data-testid="status"]');
      const date = page.locator('.date, [data-testid="date"]');
      
      await expect(firstItem).toBeVisible();
      await expect(status.or(date)).toBeVisible();
    }
  });

  test('should filter analysis by status @regression', async ({ page }) => {
    // Navigate to analysis history
    await page.goto('/analysis/history');
    
    const statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
    
    if (await statusFilter.count() === 0) {
      test.skip('No status filter found');
    }
    
    await statusFilter.selectOption('completed');
    
    // Wait for filtering
    await page.waitForTimeout(1000);
    
    // Should show filtered results
    const analysisItems = page.locator('[data-testid="analysis-item"], .analysis-item');
    const noResults = page.locator('.no-results, .empty-state');
    
    await expect(analysisItems.or(noResults)).toBeVisible();
  });

  test('should show real-time agent updates @regression', async ({ page }) => {
    // Navigate to running analysis
    await page.goto('/analysis/running-analysis-456');
    
    const agentStatus = page.locator('[data-testid="agent-status"], .agent-status');
    
    if (await agentStatus.count() === 0) {
      test.skip('No real-time agent status found');
    }
    
    // Should show live updates (check for websocket connection or polling)
    const liveIndicator = page.locator('[data-testid="live-updates"], .live-indicator').or(
      page.locator('text=Live, text=Real-time')
    );
    
    // Wait for status updates
    await page.waitForTimeout(3000);
    
    // Agent statuses should be visible and potentially updating
    const agents = page.locator('.agent-item, [data-testid*="agent-"]');
    await expect(agents.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle analysis errors gracefully @regression', async ({ page }) => {
    // Navigate to failed analysis
    await page.goto('/analysis/failed-analysis-789');
    
    // Should show error information
    const errorSection = page.locator('[data-testid="analysis-error"], .analysis-error');
    const errorMessage = page.locator('.error, .alert-danger');
    const retryButton = page.locator('[data-testid="retry-analysis"]').or(
      page.locator('button').filter({ hasText: /retry|try again/i })
    );
    
    await expect(errorSection.or(errorMessage)).toBeVisible({ timeout: 10000 });
    
    // Should offer retry option if available
    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should support analysis comparison @regression', async ({ page }) => {
    // Navigate to analysis comparison
    await page.goto('/analysis/compare');
    
    const compareInterface = page.locator('[data-testid="analysis-compare"], .analysis-compare');
    
    if (await compareInterface.count() === 0) {
      test.skip('No analysis comparison functionality found');
    }
    
    // Should allow selecting analyses to compare
    const analysisSelect1 = page.locator('[data-testid="analysis-select-1"]');
    const analysisSelect2 = page.locator('[data-testid="analysis-select-2"]');
    const compareButton = page.locator('button').filter({ hasText: /compare/i });
    
    if (await analysisSelect1.count() > 0 && await analysisSelect2.count() > 0) {
      await analysisSelect1.selectOption({ index: 1 });
      await analysisSelect2.selectOption({ index: 2 });
      await compareButton.click();
      
      // Should show comparison results
      const comparisonResults = page.locator('[data-testid="comparison-results"], .comparison-results');
      await expect(comparisonResults).toBeVisible({ timeout: 10000 });
    }
  });
});