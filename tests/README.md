# QueryJSON Automated Tests

This directory contains comprehensive automated browser tests for QueryJSON using [Playwright](https://playwright.dev/).

## Test Coverage

### Core Features
- **json-parsing.spec.js** - JSON/XML/CSV parsing, data loading, error handling
- **columns.spec.js** - Column selection, reordering, show/hide functionality
- **filtering.spec.js** - All filter operators (equals, contains, greater than, etc.)
- **regex-filter.spec.js** - Regex pattern matching in filters (NEW)
- **computed-columns.spec.js** - Creating computed columns with math/string/date expressions (NEW)
- **search-sort.spec.js** - Search functionality and column sorting
- **export.spec.js** - CSV and JSON export functionality
- **file-upload.spec.js** - File upload for JSON/XML/CSV files

## Prerequisites

```bash
npm install
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/regex-filter.spec.js
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run with verbose output
```bash
npx playwright test --reporter=list
```

## Test Configuration

Tests are configured in `playwright.config.js`:
- **Browsers**: Chromium, Firefox, WebKit (Safari)
- **Base URL**: http://localhost:8000
- **Web Server**: Automatically started before tests
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: On failure only
- **Traces**: On first retry

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

See `.github/workflows/playwright-tests.yml` for GitHub Actions configuration.

## Test Structure

Each test file follows this pattern:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - navigate and parse default data
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Writing New Tests

1. Create a new `.spec.js` file in the `tests/` directory
2. Use descriptive test names: `should [expected behavior]`
3. Add `test.beforeEach()` for common setup
4. Use `await page.waitForTimeout()` for async operations
5. Use meaningful assertions with `expect()`

## Debugging Failed Tests

### View HTML Report
```bash
npx playwright show-report
```

### View Traces
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Run Single Test
```bash
npx playwright test --grep "test name pattern"
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

## Common Test Patterns

### Wait for table to load
```javascript
await page.waitForSelector('table', { timeout: 10000 });
```

### Parse default JSON
```javascript
await page.click('button:has-text("Parse")');
```

### Add a filter
```javascript
await page.click('button:has-text("+ Add")');
await page.locator('.filter-row select').first().selectOption('columnName');
```

### Create computed column
```javascript
await page.click('button:has-text("+ Computed")');
await page.fill('#computedColumnName', 'newColumn');
await page.fill('#computedColumnExpression', 'expression');
await page.click('button:has-text("Create")');
```

## Troubleshooting

### Tests timing out
- Increase timeout in test: `{ timeout: 30000 }`
- Check if web server is running
- Verify selectors are correct

### Flaky tests
- Add explicit waits: `await page.waitForSelector()`
- Use `waitForTimeout()` for async operations
- Check for race conditions

### CI failures but local passes
- Check browser compatibility
- Verify CI environment has necessary dependencies
- Review CI logs and screenshots

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset state in `beforeEach()`
3. **Assertions**: Use specific, meaningful assertions
4. **Selectors**: Prefer user-facing selectors (text, role) over CSS
5. **Waits**: Use explicit waits instead of arbitrary timeouts
6. **DRY**: Extract common operations into helper functions

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
