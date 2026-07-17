import { promises as fs } from 'node:fs';
import path from 'node:path';
import { request, type FullConfig } from '@playwright/test';
import {
  previewBypassStatePath,
  previewProtectionHeaders,
  usesPreviewProtection,
} from './preview-protection';

export default async function globalSetup(config: FullConfig) {
  if (!usesPreviewProtection) return;

  const configuredBaseUrl = config.projects[0]?.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Protected Preview validation requires E2E_BASE_URL.');
  }

  const previewOrigin = new URL(configuredBaseUrl).origin;
  await fs.mkdir(path.dirname(previewBypassStatePath), { recursive: true });

  const api = await request.newContext({
    baseURL: previewOrigin,
    extraHTTPHeaders: previewProtectionHeaders(),
  });

  try {
    const response = await api.get('/login', { failOnStatusCode: false });
    const finalOrigin = new URL(response.url()).origin;
    if (finalOrigin !== previewOrigin) {
      throw new Error('Vercel Preview protection bypass redirected outside the configured Preview origin.');
    }
    if (response.status() >= 500) {
      throw new Error(`Protected Preview bootstrap failed with HTTP ${response.status()}.`);
    }

    await api.storageState({ path: previewBypassStatePath });
    const state = JSON.parse(await fs.readFile(previewBypassStatePath, 'utf8')) as {
      cookies?: Array<{ name?: string }>;
    };
    if (!state.cookies?.some(cookie => /vercel|bypass/i.test(cookie.name ?? ''))) {
      throw new Error('Vercel Preview protection bypass did not issue a reusable bypass cookie.');
    }
    await fs.chmod(previewBypassStatePath, 0o600);
  } finally {
    await api.dispose();
  }
}
