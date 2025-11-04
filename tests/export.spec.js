// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Parse the default JSON data
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should have CSV download button visible', async ({ page }) => {
    const csvButton = page.locator('button:has-text("📥 CSV")');
    await expect(csvButton).toBeVisible();
  });

  test('should have JSON download button visible', async ({ page }) => {
    const jsonButton = page.locator('button:has-text("📥 JSON")');
    await expect(jsonButton).toBeVisible();
  });

  test('should have Copy JSON button visible', async ({ page }) => {
    const copyJsonButton = page.locator('button:has-text("📋 Copy JSON")');
    await expect(copyJsonButton).toBeVisible();
  });

  test('should have Copy Markdown button visible', async ({ page }) => {
    const copyMarkdownButton = page.locator('button:has-text("📋 Copy Markdown")');
    await expect(copyMarkdownButton).toBeVisible();
  });

  test('should export to CSV format', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click CSV export button
    await page.click('button:has-text("📥 CSV")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('data.csv');

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Exported as data.csv', { timeout: 5000 });
  });

  test('should export to JSON format', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click JSON export button
    await page.click('button:has-text("📥 JSON")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('data.json');

    // Verify success message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('Exported as data.json', { timeout: 5000 });
  });

  test('should copy JSON to clipboard', async ({ page }) => {
    // Click Copy JSON button
    await page.click('button:has-text("📋 Copy JSON")');

    // Wait for clipboard operation to complete
    await page.waitForTimeout(1500);

    // Verify clipboard content
    const clipboardContent = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Should be valid JSON
    expect(() => JSON.parse(clipboardContent)).not.toThrow();

    // Should contain expected data
    expect(clipboardContent).toContain('Alice Johnson');
    expect(clipboardContent).toContain('Engineering');
  });

  test('should copy Markdown to clipboard', async ({ page }) => {
    // Click Copy Markdown button
    await page.click('button:has-text("📋 Copy Markdown")');

    // Wait a bit for clipboard operation to complete
    await page.waitForTimeout(1500);

    // Verify clipboard content first (this is the main test)
    const clipboardContent = await page.evaluate(async () => {
      // Wait a bit inside the browser context too
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
    // Format is: | --- | --- | --- |
    expect(lines[1]).toMatch(/^\|\s*---(\s*\|\s*---)*\s*\|$/);
    expect(lines[1]).toContain('---');

    // Should contain data
    expect(clipboardContent).toContain('Alice');
  });

  test('should generate valid markdown table format', async ({ page }) => {
    // Click Copy Markdown button
    await page.click('button:has-text("📋 Copy Markdown")');

    await page.waitForTimeout(1500);

    // Get clipboard content with retry
    const content = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return navigator.clipboard.readText();
    });

    // Verify markdown table structure
    const lines = content.split('\n').filter(line => line.trim());

    // Verify minimum lines
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // First line should be header with pipes
    expect(lines[0]).toMatch(/^\|.*\|$/);

    // Second line should be separator with dashes
    // Format is: | --- | --- | --- |
    expect(lines[1]).toMatch(/^\|\s*---(\s*\|\s*---)*\s*\|$/);
    expect(lines[1]).toContain('---');

    // Remaining lines should be data rows with pipes
    for (let i = 2; i < lines.length; i++) {
      expect(lines[i]).toMatch(/^\|.*\|$/);
    }
  });

  test('should copy filtered data to markdown', async ({ page }) => {
    // Add a filter
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(1000);

    // Select column and operator - select 'name' column which should be at a higher index
    const filterSelects = await page.locator('.filter-row select').all();
    if (filterSelects.length >= 2) {
      // Select 'name' column by value instead of index
      await filterSelects[0].selectOption('name');
      await page.waitForTimeout(300);
      await filterSelects[1].selectOption('contains'); // Select contains operator
      await page.waitForTimeout(300);
    }

    // Enter filter value
    const filterInput = page.locator('.filter-row input[type="text"]').first();
    await filterInput.fill('Alice');
    await page.waitForTimeout(500);

    // Apply filter if there's an apply button
    const applyButton = page.locator('#applyFilterBtn');
    if (await applyButton.isVisible()) {
      await applyButton.click();
      await page.waitForTimeout(1000);
    }

    // Wait for table to update
    await page.waitForTimeout(1000);

    // Verify table has filtered data visible
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);

    // Copy to markdown
    await page.click('button:has-text("📋 Copy Markdown")');
    await page.waitForTimeout(2000);

    // Get clipboard content with retry
    const content = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return navigator.clipboard.readText();
    });

    // Should have content
    expect(content.length).toBeGreaterThan(0);

    // Verify the content includes the filter term
    expect(content).toContain('Alice');
  });

  test('should handle empty data copy gracefully', async ({ page }) => {
    // Clear the input
    await page.fill('#jsonInput', '');
    await page.click('button:has-text("Clear")');

    await page.waitForTimeout(1000);

    // Try to copy markdown
    await page.click('button:has-text("📋 Copy Markdown")');

    await page.waitForTimeout(1000);

    // Should show error message
    const statusMessage = page.locator('#detailsStatusMessage');
    await expect(statusMessage).toContainText('No data to copy', { timeout: 5000 });
  });

  test('should escape pipe characters in markdown copy', async ({ page }) => {
    // Add custom JSON with pipe characters
    const jsonWithPipes = {
      "data": [
        { "name": "Test | Name", "value": "100" },
        { "name": "Another", "value": "200 | 300" }
      ]
    };

    await page.fill('#jsonInput', JSON.stringify(jsonWithPipes, null, 2));
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });

    // Copy to markdown
    await page.click('button:has-text("📋 Copy Markdown")');
    await page.waitForTimeout(500);

    // Get clipboard content
    const content = await page.evaluate(() => navigator.clipboard.readText());

    // Verify pipes are escaped
    expect(content).toContain('\\|');
  });

  test('should copy JSON with proper formatting', async ({ page }) => {
    // Click Copy JSON button
    await page.click('button:has-text("📋 Copy JSON")');
    await page.waitForTimeout(500);

    // Get clipboard content
    const content = await page.evaluate(() => navigator.clipboard.readText());

    // Should be formatted JSON (with indentation)
    expect(content).toContain('  '); // Has indentation
    expect(content).toContain('\n'); // Has newlines

    // Parse and verify structure
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
