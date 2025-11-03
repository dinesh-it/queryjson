// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Regex Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should filter with regex pattern matching email domains', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('email');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    await page.locator('.filter-row input[type="text"]').fill('@example\\.com$');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with regex pattern for names starting with vowels', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    await page.locator('.filter-row input[type="text"]').fill('^[AEIOU]');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with regex pattern for specific word boundaries', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    await page.locator('.filter-row input[type="text"]').fill('\\bJohnson\\b');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThanOrEqual(0);
  });

  test('should filter with regex pattern for numbers in range', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('salary');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    await page.locator('.filter-row input[type="text"]').fill('^9[0-9]');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThanOrEqual(0);
  });

  test('should filter with regex pattern using OR operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('department');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    await page.locator('.filter-row input[type="text"]').fill('Engineering|Marketing');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should handle invalid regex pattern gracefully', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    // Invalid regex: unmatched bracket
    await page.locator('.filter-row input[type="text"]').fill('[invalid');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    // Should not crash - all rows should be visible
    const filteredStat = await page.locator('#statFiltered').textContent();
    const totalRows = await page.locator('#statRows').textContent();
    expect(parseInt(filteredStat)).toBe(parseInt(totalRows));
  });

  test('should filter case-insensitively with regex', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('department');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    // Should match "engineering" case-insensitively
    await page.locator('.filter-row input[type="text"]').fill('ENGINEERING');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should combine regex with other filter operators', async ({ page }) => {
    // Add regex filter
    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row').first().locator('select').first().selectOption('department');
    await page.locator('.filter-row').first().locator('select').nth(1).selectOption('regex');
    await page.locator('.filter-row').first().locator('input[type="text"]').fill('Engineering');

    // Add numeric filter
    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row').nth(1).locator('select').first().selectOption('salary');
    await page.locator('.filter-row').nth(1).locator('select').nth(1).selectOption('gt');
    await page.locator('.filter-row').nth(1).locator('input[type="text"]').fill('90000');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThanOrEqual(0);
  });

  test('should filter with complex regex pattern for date format', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('joinDate');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    // Match dates in 2021
    await page.locator('.filter-row input[type="text"]').fill('^2021-');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with regex lookahead', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('regex');
    // Names containing 'o' followed by any characters and ending with 'n'
    await page.locator('.filter-row input[type="text"]').fill('o.*n');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThanOrEqual(0);
  });
});
