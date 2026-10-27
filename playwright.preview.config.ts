import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { previewProtectionStatePath } from './tests/smoke/preview-protection-state';

export default defineConfig(baseConfig, {
  globalSetup: require.resolve('./tests/smoke/preview-protection.global-setup'),
  globalTeardown: require.resolve('./tests/smoke/preview-protection.global-teardown'),
  reporter: 'list',
  use: {
    storageState: previewProtectionStatePath,
    // Remote HTTPS enables the PWA worker (loopback CI does not). Keep the
    // browser route fixtures observable instead of letting the worker bypass
    // Playwright interception. Real account/API requests remain live.
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
