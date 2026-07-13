import { promises as fs } from 'node:fs';
import { test } from '@playwright/test';
import { authStateDir } from './auth-state';

test('temporary browser auth states are removed', async () => {
  await fs.rm(authStateDir, { recursive: true, force: true });
});
