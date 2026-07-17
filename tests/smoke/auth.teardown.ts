import { promises as fs } from 'node:fs';
import { test } from '@playwright/test';
import { authStateDir } from './auth-state';
import { cleanupAllSyntheticIncomeRecords } from './authenticated-data-client';

test('temporary browser auth states are removed', async () => {
  await cleanupAllSyntheticIncomeRecords();
  await fs.rm(authStateDir, { recursive: true, force: true });
});
