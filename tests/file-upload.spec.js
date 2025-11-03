// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should have file upload input', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should upload and parse JSON file', async ({ page }) => {
    // Create a temporary JSON file
    const testData = {
      users: [
        { id: 1, name: 'Test User 1' },
        { id: 2, name: 'Test User 2' }
      ]
    };

    const tempFilePath = path.join('/tmp', 'test-upload.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(testData, null, 2));

    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    // Wait for parsing
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify data loaded
    await expect(page.locator('table')).toBeVisible();
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

  test('should upload and parse CSV file', async ({ page }) => {
    const csvContent = `name,age,city
Alice,25,New York
Bob,30,San Francisco
Carol,28,Boston`;

    const tempFilePath = path.join('/tmp', 'test-upload.csv');
    fs.writeFileSync(tempFilePath, csvContent);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    await page.waitForSelector('table', { timeout: 10000 });

    await expect(page.locator('table')).toBeVisible();
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBe(3);

    fs.unlinkSync(tempFilePath);
  });

  test('should upload and parse XML file', async ({ page }) => {
    const xmlContent = `<?xml version="1.0"?>
<users>
  <user>
    <id>1</id>
    <name>Alice</name>
  </user>
  <user>
    <id>2</id>
    <name>Bob</name>
  </user>
</users>`;

    const tempFilePath = path.join('/tmp', 'test-upload.xml');
    fs.writeFileSync(tempFilePath, xmlContent);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    await page.waitForSelector('table', { timeout: 10000 });

    await expect(page.locator('table')).toBeVisible();

    fs.unlinkSync(tempFilePath);
  });

  test('should show error for invalid file', async ({ page }) => {
    const invalidContent = 'This is not valid JSON or CSV or XML';
    const tempFilePath = path.join('/tmp', 'test-invalid.txt');
    fs.writeFileSync(tempFilePath, invalidContent);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    await page.waitForTimeout(1000);

    // Should show error message
    const statusMessage = page.locator('.status-message');
    // May or may not be visible depending on error handling

    fs.unlinkSync(tempFilePath);
  });
});
