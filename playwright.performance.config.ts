import { defineConfig, devices } from '@playwright/test';

const httpsLoopback = process.env.PLAYWRIGHT_HTTPS_LOOPBACK === '1';
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL || (httpsLoopback ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3002');
const webServerCommand = httpsLoopback
  ? 'node scripts/playwright-https-proxy.mjs'
  : 'pnpm exec next start --hostname 127.0.0.1 --port 3002';
const authProjectFiles = /smoke\/auth\.(?:setup|teardown)\.ts/;
const performanceFiles = /performance\/.*\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/performance',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Performance budgets must run without other browser projects competing for
  // the same production server and CPU during a throttled interaction trace.
  workers: 1,
  // Shared GitHub runners occasionally add presentation delay without app-side
  // long tasks. Require a second failing trace before rejecting the change.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/performance', open: 'never' }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: httpsLoopback,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseURL ? undefined : {
    command: webServerCommand,
    url: baseURL,
    ignoreHTTPSErrors: httpsLoopback,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /smoke\/auth\.setup\.ts/,
      teardown: 'auth-cleanup',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth-cleanup',
      testMatch: /smoke\/auth\.teardown\.ts/,
    },
    {
      name: 'chromium-desktop',
      testMatch: performanceFiles,
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chrome',
      testMatch: performanceFiles,
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-webkit',
      testMatch: performanceFiles,
      testIgnore: authProjectFiles,
      dependencies: ['auth-setup'],
      use: { ...devices['iPhone 13'] },
    },
  ],
});
