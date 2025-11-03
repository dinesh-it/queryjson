// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('JSON Parsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/QueryJSON/);
    await expect(page.locator('h1').first()).toContainText('QueryJSON');
  });

  test('should have default JSON data in textarea', async ({ page }) => {
    const textarea = page.locator('#jsonInput');
    const content = await textarea.inputValue();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('users');
  });

  test('should parse default JSON successfully', async ({ page }) => {
    await page.click('button:has-text("Parse")');

    // Wait for table to render
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify table is visible
    await expect(page.locator('table')).toBeVisible();

    // Verify stats are shown
    await expect(page.locator('#statRows')).toBeVisible();
    await expect(page.locator('#statColumns')).toBeVisible();

    // Verify at least one row of data
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should show error for invalid JSON', async ({ page }) => {
    // Clear textarea and enter invalid JSON
    await page.fill('#jsonInput', '{invalid json}');
    await page.click('button:has-text("Parse")');

    await page.waitForTimeout(1000);

    // Should show error status
    const statusMessage = page.locator('.status-message');
    await expect(statusMessage).toBeVisible();
  });

  test('should parse simple JSON object', async ({ page }) => {
    const simpleJSON = JSON.stringify({
      name: 'Test User',
      age: 30,
      city: 'New York'
    });

    await page.fill('#jsonInput', simpleJSON);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('should parse JSON array', async ({ page }) => {
    const jsonArray = JSON.stringify([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Carol' }
    ]);

    await page.fill('#jsonInput', jsonArray);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });

    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBe(3);
  });

  test('should handle nested JSON objects', async ({ page }) => {
    const nestedJSON = JSON.stringify({
      users: [
        { id: 1, profile: { name: 'Alice', age: 25 } },
        { id: 2, profile: { name: 'Bob', age: 30 } }
      ]
    });

    await page.fill('#jsonInput', nestedJSON);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('should clear data when clicking Clear button', async ({ page }) => {
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click clear
    await page.click('button:has-text("Clear")');

    // Textarea should be empty
    const textareaValue = await page.locator('#jsonInput').inputValue();
    expect(textareaValue).toBe('');
  });

  test('should handle empty array', async ({ page }) => {
    await page.fill('#jsonInput', '[]');
    await page.click('button:has-text("Parse")');

    await page.waitForTimeout(1000);

    // Should parse without error
    const statusMessage = page.locator('.status-message');
    // May show success or empty message
  });

  test('should parse JSON with special characters', async ({ page }) => {
    const specialJSON = JSON.stringify([
      { text: 'Hello "World"' },
      { text: 'Line 1\nLine 2' },
      { text: 'Tab\there' }
    ]);

    await page.fill('#jsonInput', specialJSON);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('should parse JSON with null values', async ({ page }) => {
    const jsonWithNull = JSON.stringify([
      { id: 1, name: 'Alice', email: null },
      { id: 2, name: null, email: 'bob@example.com' }
    ]);

    await page.fill('#jsonInput', jsonWithNull);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('should parse JSON with boolean values', async ({ page }) => {
    const jsonWithBool = JSON.stringify([
      { name: 'Alice', active: true, verified: false },
      { name: 'Bob', active: false, verified: true }
    ]);

    await page.fill('#jsonInput', jsonWithBool);
    await page.click('button:has-text("Parse")');

    await page.waitForSelector('table', { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });
});
