// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Filtering (Non-Regex)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should add new filter row when clicking + Add', async ({ page }) => {
    const initialFilters = await page.locator('.filter-row').count();

    await page.click('button:has-text("+ Add")');

    const newFilters = await page.locator('.filter-row').count();
    expect(newFilters).toBe(initialFilters + 1);
  });

  test('should show Apply button when filter is added', async ({ page }) => {
    const applyBtn = page.locator('#applyFilterBtn');

    // Initially hidden
    await expect(applyBtn).toBeHidden();

    // Add filter
    await page.click('button:has-text("+ Add")');

    // Now visible
    await expect(applyBtn).toBeVisible();
  });

  test('should filter with equals operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('department');
    await page.locator('.filter-row select').nth(1).selectOption('equals');
    await page.locator('.filter-row input[type="text"]').fill('Engineering');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    // Check filtered count
    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with contains operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('contains');
    await page.locator('.filter-row input[type="text"]').fill('Ali');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with starts with operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('starts');
    await page.locator('.filter-row input[type="text"]').fill('Alice');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with ends with operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('email');
    await page.locator('.filter-row select').nth(1).selectOption('ends');
    await page.locator('.filter-row input[type="text"]').fill('.com');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with greater than operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('salary');
    await page.locator('.filter-row select').nth(1).selectOption('gt');
    await page.locator('.filter-row input[type="text"]').fill('90000');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with less than operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('salary');
    await page.locator('.filter-row select').nth(1).selectOption('lt');
    await page.locator('.filter-row input[type="text"]').fill('80000');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with IS NULL operator', async ({ page }) => {
    // First add some null data
    const jsonWithNull = JSON.stringify([
      { id: 1, name: 'Alice', email: 'alice@test.com' },
      { id: 2, name: 'Bob', email: null },
      { id: 3, name: 'Carol', email: '' }
    ]);

    await page.fill('#jsonInput', jsonWithNull);
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });

    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('email');
    await page.locator('.filter-row select').nth(1).selectOption('isnull');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should filter with IS NOT NULL operator', async ({ page }) => {
    await page.click('button:has-text("+ Add")');

    await page.locator('.filter-row select').first().selectOption('name');
    await page.locator('.filter-row select').nth(1).selectOption('isnotnull');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThan(0);
  });

  test('should support multiple filters (AND logic)', async ({ page }) => {
    // Add first filter
    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row').first().locator('select').first().selectOption('department');
    await page.locator('.filter-row').first().locator('select').nth(1).selectOption('equals');
    await page.locator('.filter-row').first().locator('input[type="text"]').fill('Engineering');

    // Add second filter
    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row').nth(1).locator('select').first().selectOption('salary');
    await page.locator('.filter-row').nth(1).locator('select').nth(1).selectOption('gt');
    await page.locator('.filter-row').nth(1).locator('input[type="text"]').fill('90000');

    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    const filteredStat = await page.locator('#statFiltered').textContent();
    expect(parseInt(filteredStat)).toBeGreaterThanOrEqual(0);
  });

  test('should remove filter when clicking × button', async ({ page }) => {
    await page.click('button:has-text("+ Add")');
    const initialFilters = await page.locator('.filter-row').count();

    // Click remove button
    await page.locator('.filter-row .btn-danger').first().click();

    await page.waitForTimeout(500);
    const newFilters = await page.locator('.filter-row').count();
    expect(newFilters).toBe(initialFilters - 1);
  });

  test('should update stats after filtering', async ({ page }) => {
    const totalRows = await page.locator('#statRows').textContent();

    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row select').first().selectOption('department');
    await page.locator('.filter-row select').nth(1).selectOption('equals');
    await page.locator('.filter-row input[type="text"]').fill('Engineering');
    await page.click('button:has-text("Apply")');

    await page.waitForTimeout(500);

    const filteredRows = await page.locator('#statFiltered').textContent();

    // Total should remain same, filtered should be less or equal
    expect(parseInt(filteredRows)).toBeLessThanOrEqual(parseInt(totalRows));
  });
});
