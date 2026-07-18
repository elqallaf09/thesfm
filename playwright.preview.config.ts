import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { previewProtectionStatePath } from './tests/smoke/preview-protection-state';

export default defineConfig(baseConfig, {
  globalSetup: require.resolve('./tests/smoke/preview-protection.global-setup'),
  globalTeardown: require.resolve('./tests/smoke/preview-protection.global-teardown'),
  reporter: 'list',
  use: {
    storageState: previewProtectionStatePath,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
