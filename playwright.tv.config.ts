import { defineConfig } from '@playwright/test';

// Test the actual standalone assets embedded in Android/Tizen/webOS, without
// Next.js global styles or a development server hiding packaging differences.
export default defineConfig({
  testDir: './tests/packaged',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  use: { browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.TV_CHROMIUM_EXECUTABLE ? { executablePath: process.env.TV_CHROMIUM_EXECUTABLE } : undefined },
});
