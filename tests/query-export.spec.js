// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Query Export Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Parse the default JSON data
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });

    // Wait for query section to be visible (database ready)
    // PGLite can take a while to initialize, especially on first load
    await page.waitForSelector('#querySection:not(.hide)', { timeout: 30000 });

    // Execute a simple query
    await page.fill('#sqlQuery', 'SELECT * FROM json_data LIMIT 3');
    await page.click('button:has-text("Execute")');

    // Wait for query results to appear
    await page.waitForSelector('#queryResult:not(.hide)', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('should display export buttons in query results', async ({ page }) => {
    const queryResult = page.locator('#queryResult');
    await expect(queryResult).toBeVisible();

    // Check for all export buttons
    const csvButton = queryResult.locator('button:has-text("📥 CSV")');
    await expect(csvButton).toBeVisible();

    const jsonButton = queryResult.locator('button:has-text("📥 JSON")');
    await expect(jsonButton).toBeVisible();

    const copyJsonButton = queryResult.locator('button:has-text("📋 Copy JSON")');
    await expect(copyJsonButton).toBeVisible();

    const copyMarkdownButton = queryResult.locator('button:has-text("📋 Copy Markdown")');
    await expect(copyMarkdownButton).toBeVisible();
  });

  test('should export query results to CSV', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click CSV export button in query results
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📥 CSV")').click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('query-results.csv');

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Exported as query-results.csv', { timeout: 5000 });
  });

  test('should export query results to JSON', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click JSON export button in query results
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📥 JSON")').click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('query-results.json');

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Exported as query-results.json', { timeout: 5000 });
  });

  test('should copy query results as JSON to clipboard', async ({ page }) => {
    // Click Copy JSON button in query results
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📋 Copy JSON")').click();

    // Wait for clipboard operation to complete
    await page.waitForTimeout(1500);

    // Verify clipboard content
    const clipboardContent = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should be valid JSON
    expect(() => JSON.parse(clipboardContent)).not.toThrow();

    // Should contain expected data from query results
    const parsed = JSON.parse(clipboardContent);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeLessThanOrEqual(3); // We queried LIMIT 3

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Query results JSON copied to clipboard', { timeout: 5000 });
  });

  test('should copy query results as Markdown to clipboard', async ({ page }) => {
    // Click Copy Markdown button in query results
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📋 Copy Markdown")').click();

    // Wait a bit for clipboard operation to complete
    await page.waitForTimeout(1500);

    // Verify clipboard content
    const clipboardContent = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should have markdown table structure
    const lines = clipboardContent.split('\n').filter(line => line.trim());

    // Verify we have at least 3 lines (header, separator, data)
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // First line should be header with pipes
    expect(lines[0]).toMatch(/^\|.*\|$/);

    // Second line should be separator with dashes
    expect(lines[1]).toMatch(/^\|\s*---(\s*\|\s*---)*\s*\|$/);

    // Should contain data columns
    expect(clipboardContent).toContain('id');
    expect(clipboardContent).toContain('name');

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Query results Markdown table copied to clipboard', { timeout: 5000 });
  });

  test('should export query results with filters', async ({ page }) => {
    // Execute a filtered query
    await page.fill('#sqlQuery', 'SELECT * FROM json_data WHERE department = \'Engineering\' LIMIT 5');
    await page.click('button:has-text("Execute")');

    // Wait for query results
    await page.waitForTimeout(1500);

    // Copy to markdown
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📋 Copy Markdown")').click();
    await page.waitForTimeout(1500);

    // Get clipboard content
    const content = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should contain Engineering department
    expect(content).toContain('Engineering');
  });

  test('should handle aggregated query results', async ({ page }) => {
    // Execute an aggregation query
    await page.fill('#sqlQuery', 'SELECT department, COUNT(*) as count FROM json_data GROUP BY department');
    await page.click('button:has-text("Execute")');

    // Wait for query results
    await page.waitForTimeout(1500);

    // Copy to JSON
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📋 Copy JSON")').click();
    await page.waitForTimeout(1500);

    // Get clipboard content
    const content = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should be valid JSON
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);

    // Should have department and count columns
    if (parsed.length > 0) {
      expect(parsed[0]).toHaveProperty('department');
      expect(parsed[0]).toHaveProperty('count');
    }
  });

  test('should export JSONPath query results', async ({ page }) => {
    // Switch to JSONPath mode
    await page.click('button[data-mode="jsonpath"]');
    await page.waitForTimeout(500);

    // Execute a JSONPath query
    await page.fill('#jsonpathQuery', '$.users[0:2]');
    const executeButton = page.locator('#jsonpathSection button:has-text("Execute")');
    await executeButton.click();

    // Wait for query results
    await page.waitForTimeout(1500);

    // Copy to markdown
    const queryResult = page.locator('#queryResult');
    await queryResult.locator('button:has-text("📋 Copy Markdown")').click();
    await page.waitForTimeout(1500);

    // Get clipboard content
    const content = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should have markdown table structure
    const lines = content.split('\n').filter(line => line.trim());
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Query results Markdown table copied to clipboard', { timeout: 5000 });
  });
});
