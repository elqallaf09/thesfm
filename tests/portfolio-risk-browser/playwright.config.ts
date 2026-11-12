import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)), testMatch: 'history.spec.ts',
  fullyParallel: false, workers: 1, retries: 0, timeout: 30_000,
  outputDir: 'test-results/portfolio-risk-history', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4175', browserName: 'chromium', trace: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: 'pnpm exec vite --config tests/portfolio-risk-browser/vite.config.mts',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 60_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', DATABASE_SERVICE_ROLE_KEY: '' },
  },
});
