// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Column Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should show column list after parsing', async ({ page }) => {
    const columnList = page.locator('#columnList');
    await expect(columnList).toBeVisible();

    // Should have checkboxes
    const checkboxes = await columnList.locator('input[type="checkbox"]').count();
    expect(checkboxes).toBeGreaterThan(0);
  });

  test('should have all columns selected by default', async ({ page }) => {
    const checkboxes = await page.locator('#columnList input[type="checkbox"]').all();

    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('should deselect column when unchecking checkbox', async ({ page }) => {
    const firstCheckbox = page.locator('#columnList input[type="checkbox"]').first();
    const columnName = await firstCheckbox.locator('..').textContent();

    await firstCheckbox.uncheck();
    await page.waitForTimeout(500);

    // Column should not appear in table
    const headerCells = await page.locator('table th').allTextContents();
    expect(headerCells).not.toContain(columnName.trim());
  });

  test('should select all columns when clicking All button', async ({ page }) => {
    // First deselect one
    await page.locator('#columnList input[type="checkbox"]').first().uncheck();
    await page.waitForTimeout(500);

    // Click All button
    await page.click('button:has-text("All")');
    await page.waitForTimeout(500);

    // All should be checked
    const checkboxes = await page.locator('#columnList input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
  });

  test('should deselect all columns when clicking None button', async ({ page }) => {
    await page.click('button:has-text("None")');
    await page.waitForTimeout(500);

    const checkboxes = await page.locator('#columnList input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      await expect(checkbox).not.toBeChecked();
    }
  });

  test('should update column count in stats', async ({ page }) => {
    const initialCount = await page.locator('#statColumns').textContent();

    // Deselect one column
    await page.locator('#columnList input[type="checkbox"]').first().uncheck();
    await page.waitForTimeout(500);

    const newCount = await page.locator('#statColumns').textContent();
    expect(parseInt(newCount)).toBe(parseInt(initialCount) - 1);
  });

  test('should support column drag and drop reordering', async ({ page }) => {
    // Get first two column labels
    const firstColumn = page.locator('#columnList .column-item').first();
    const secondColumn = page.locator('#columnList .column-item').nth(1);

    const firstText = await firstColumn.locator('label').textContent();
    const secondText = await secondColumn.locator('label').textContent();

    // Drag first to second position
    await firstColumn.dragTo(secondColumn);
    await page.waitForTimeout(500);

    // Order should be swapped
    const newFirstText = await page.locator('#columnList .column-item').first().locator('label').textContent();
    expect(newFirstText).toBe(secondText);
  });

  test('should persist column selection when applying filters', async ({ page }) => {
    // Deselect a column
    const firstCheckbox = page.locator('#columnList input[type="checkbox"]').first();
    await firstCheckbox.uncheck();
    await page.waitForTimeout(500);

    // Apply a filter
    await page.click('button:has-text("+ Add")');
    await page.locator('.filter-row select').first().selectOption({ index: 1 });
    await page.click('button:has-text("Apply")');
    await page.waitForTimeout(500);

    // Column should still be deselected
    await expect(firstCheckbox).not.toBeChecked();
  });
});
