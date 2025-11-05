// @ts-check
const { test, expect } = require('@playwright/test');

test('Debug database initialization', async ({ page }) => {
  const logs = [];
  const errors = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type()}] ${text}`);
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

  console.log('=== Table visible, waiting for database... ===');

  // Check if PGLite is loaded
  const isPGLiteLoaded = await page.evaluate(() => window.PGlite !== undefined);
  console.log('Is PGLite loaded?', isPGLiteLoaded);

  // Check status message
  const statusMessage = await page.locator('#detailsStatusMessage').textContent();
  console.log('Status message:', statusMessage);

  // Check if query section is hidden
  const isQuerySectionHidden = await page.locator('#querySection').evaluate(el => el.classList.contains('hide'));
  console.log('Is query section hidden?', isQuerySectionHidden);

  // Check if pgliteNotReady is visible
  const isPgliteNotReadyVisible = await page.locator('#pgliteNotReady').isVisible();
  console.log('Is pgliteNotReady visible?', isPgliteNotReadyVisible);

  // Wait a bit and check again
  await page.waitForTimeout(5000);

  console.log('=== After 5 seconds... ===');
  const isPGLiteLoadedAfter = await page.evaluate(() => window.PGlite !== undefined);
  console.log('Is PGLite loaded after 5s?', isPGLiteLoadedAfter);

  const isQuerySectionHiddenAfter = await page.locator('#querySection').evaluate(el => el.classList.contains('hide'));
  console.log('Is query section hidden after 5s?', isQuerySectionHiddenAfter);

  const statusMessageAfter = await page.locator('#detailsStatusMessage').textContent();
  console.log('Status message after 5s:', statusMessageAfter);

  // Print all logs and errors
  console.log('\n=== ALL CONSOLE LOGS ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== ALL ERRORS ===');
  errors.forEach(error => console.log(error));
});
