// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Only run Chromium tests for faster builds
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Add launch args for CI/headless environments with WASM/SharedArrayBuffer support
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--enable-features=SharedArrayBuffer',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
            '--disable-web-security',
            '--js-flags=--experimental-wasm-threads'
          ]
        },
        // Add context options to enable SharedArrayBuffer
        contextOptions: {
          ...devices['Desktop Chrome'].contextOptions,
        }
      },
    },
    // Uncomment to test other browsers (requires `npx playwright install firefox webkit`)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
