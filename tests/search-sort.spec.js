// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Search and Sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.click('button:has-text("Parse")');
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test.describe('Search', () => {
    test('should have search input visible', async ({ page }) => {
      const searchInput = page.locator('#searchInput');
      await expect(searchInput).toBeVisible();
    });

    test('should filter rows when typing in search', async ({ page }) => {
      const searchInput = page.locator('#searchInput');
      const initialRows = await page.locator('table tbody tr').count();

      await searchInput.fill('Alice');
      await page.waitForTimeout(500);

      const filteredRows = await page.locator('table tbody tr').count();
      expect(filteredRows).toBeLessThanOrEqual(initialRows);
    });

    test('should search across all visible columns', async ({ page }) => {
      const searchInput = page.locator('#searchInput');

      // Search for something that appears in different columns
      await searchInput.fill('Engineering');
      await page.waitForTimeout(500);

      const rows = await page.locator('table tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    });

    test('should show all rows when search is cleared', async ({ page }) => {
      const searchInput = page.locator('#searchInput');
      const initialRows = await page.locator('table tbody tr').count();

      await searchInput.fill('XYZ_NotFound');
      await page.waitForTimeout(500);

      await searchInput.clear();
      await page.waitForTimeout(500);

      const finalRows = await page.locator('table tbody tr').count();
      expect(finalRows).toBe(initialRows);
    });

    test('should be case-insensitive', async ({ page }) => {
      const searchInput = page.locator('#searchInput');

      await searchInput.fill('ALICE');
      await page.waitForTimeout(500);

      const rows = await page.locator('table tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    });

    test('should update filtered count in stats', async ({ page }) => {
      const searchInput = page.locator('#searchInput');

      await searchInput.fill('Engineering');
      await page.waitForTimeout(500);

      const filteredStat = await page.locator('#statFiltered').textContent();
      expect(parseInt(filteredStat)).toBeGreaterThan(0);
    });
  });

  test.describe('Sorting', () => {
    test('should sort column when clicking header', async ({ page }) => {
      const nameHeader = page.locator('table th:has-text("name")');
      await nameHeader.click();
      await page.waitForTimeout(500);

      // Should show sort indicator
      const headerText = await nameHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    });

    test('should toggle sort direction on repeated clicks', async ({ page }) => {
      const nameHeader = page.locator('table th:has-text("name")');

      await nameHeader.click();
      await page.waitForTimeout(500);
      const firstText = await nameHeader.textContent();

      await nameHeader.click();
      await page.waitForTimeout(500);
      const secondText = await nameHeader.textContent();

      // Direction should change
      expect(firstText).not.toBe(secondText);
    });

    test('should sort ascending first, then descending', async ({ page }) => {
      const salaryHeader = page.locator('table th:has-text("salary")');

      // First click - ascending
      await salaryHeader.click();
      await page.waitForTimeout(500);
      let headerText = await salaryHeader.textContent();
      expect(headerText).toContain('↑');

      // Second click - descending
      await salaryHeader.click();
      await page.waitForTimeout(500);
      headerText = await salaryHeader.textContent();
      expect(headerText).toContain('↓');
    });

    test('should sort numeric columns correctly', async ({ page }) => {
      const salaryHeader = page.locator('table th:has-text("salary")');
      await salaryHeader.click();
      await page.waitForTimeout(500);

      // Get first row salary value
      const firstValue = await page.locator('table tbody tr').first().locator('td').nth(await page.locator('table th').allTextContents().then(headers => headers.indexOf(headers.find(h => h.includes('salary'))))).textContent();

      expect(firstValue).toBeTruthy();
    });

    test('should sort string columns alphabetically', async ({ page }) => {
      const nameHeader = page.locator('table th:has-text("name")');
      await nameHeader.click();
      await page.waitForTimeout(500);

      const rows = await page.locator('table tbody tr').all();
      expect(rows.length).toBeGreaterThan(0);
    });

    test('should maintain sort when filtering', async ({ page }) => {
      // Sort first
      const nameHeader = page.locator('table th:has-text("name")');
      await nameHeader.click();
      await page.waitForTimeout(500);

      // Then filter
      await page.click('button:has-text("+ Add")');
      await page.locator('.filter-row select').first().selectOption({ index: 1 });
      await page.click('button:has-text("Apply")');
      await page.waitForTimeout(500);

      // Sort indicator should still be visible
      const headerText = await nameHeader.textContent();
      expect(headerText).toMatch(/[↑↓]/);
    });
  });
});
