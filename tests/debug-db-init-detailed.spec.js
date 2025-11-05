// @ts-check
const { test, expect } = require('@playwright/test');

test('Debug database initialization with detailed logging', async ({ page }) => {
  const logs = [];
  const errors = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[BROWSER ${msg.type()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('PAGE ERROR:', error.message);
  });

  // Navigate to page
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();

  console.log('=== Page loaded, clicking Parse ===');

  // Parse the default JSON data
  await page.click('button:has-text("Parse")');
  await page.waitForSelector('table', { timeout: 10000 });

  console.log('=== Table visible ===');

  // Check database state by evaluating in browser
  const dbState = await page.evaluate(async () => {
    const state = {
      isPGLiteLoaded: window.PGlite !== undefined,
      pgliteDB: window.pgliteDB !== null && window.pgliteDB !== undefined,
      pgliteDBType: typeof window.pgliteDB,
      parsedData: window.parsedData,
      parsedDataLength: window.parsedData ? window.parsedData.length : 0,
      selectedColumns: window.selectedColumns,
      selectedColumnsLength: window.selectedColumns ? window.selectedColumns.length : 0,
      jsonData: window.jsonData,
    };

    // Try to check if database is actually initialized
    if (window.pgliteDB) {
      try {
        const result = await window.pgliteDB.query("SELECT 1");
        state.dbConnectionWorks = true;
        state.dbTestResult = result;
      } catch (e) {
        state.dbConnectionWorks = false;
        state.dbError = e.message;
      }
    }

    return state;
  });

  console.log('Database state:', JSON.stringify(dbState, null, 2));

  // Wait and check again
  await page.waitForTimeout(10000);

  console.log('=== After 10 seconds ===');

  const dbStateAfter = await page.evaluate(async () => {
    const state = {
      isPGLiteLoaded: window.PGlite !== undefined,
      pgliteDB: window.pgliteDB !== null && window.pgliteDB !== undefined,
      pgliteDBType: typeof window.pgliteDB,
      querySectionHidden: document.getElementById('querySection').classList.contains('hide'),
      pgliteNotReadyVisible: !document.getElementById('pgliteNotReady').classList.contains('hide'),
    };

    if (window.pgliteDB) {
      try {
        const result = await window.pgliteDB.query("SELECT * FROM json_data LIMIT 1");
        state.tableExists = true;
        state.tableQuery = result;
      } catch (e) {
        state.tableExists = false;
        state.tableError = e.message;
      }
    }

    return state;
  });

  console.log('Database state after 10s:', JSON.stringify(dbStateAfter, null, 2));

  console.log('\n=== ALL ERRORS ===');
  errors.forEach(error => console.log(error));
});
