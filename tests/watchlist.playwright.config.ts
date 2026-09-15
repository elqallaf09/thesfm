import { defineConfig } from '@playwright/test';
import path from 'node:path';
import base from '../playwright.config';

// The test owns an ephemeral same-origin HTTP server and always navigates to its
// assigned absolute URL. It does not need a Next server, deployment or E2E URL.
// Preserve the existing device profiles, timeouts and privacy-safe reporting.
export default defineConfig({
  ...base,
  testDir: path.join(process.cwd(), 'tests/smoke'),
  testMatch: 'trader-watchlist-engine.spec.ts',
  webServer: undefined,
  retries: 0,
});
