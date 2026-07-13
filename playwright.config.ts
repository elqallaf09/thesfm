import { defineConfig, devices } from '@playwright/test';

// Playwright's AI error context includes a full DOM snapshot by default. Auth
// fields and signed-in identifiers must never be copied into CI artifacts.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

const httpsLoopback = process.env.PLAYWRIGHT_HTTPS_LOOPBACK === '1';
const baseURL = process.env.E2E_BASE_URL || (httpsLoopback ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3000');
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'pnpm run build && pnpm run start';
const authProjectFiles = /auth\.(?:setup|teardown)\.ts/;

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    ignoreHTTPSErrors: httpsLoopback,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        ignoreHTTPSErrors: httpsLoopback,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
      },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      teardown: 'auth-cleanup',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'auth-cleanup',
      testMatch: /auth\.teardown\.ts/,
    },
    {
      name: 'chromium-desktop',
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chrome',
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-webkit',
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
