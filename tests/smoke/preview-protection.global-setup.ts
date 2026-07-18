import { promises as fs } from 'node:fs';
import { request, type FullConfig } from '@playwright/test';
import { previewProtectionStatePath } from './preview-protection-state';

function deploymentOrigin(config: FullConfig) {
  const configured = config.projects
    .map(project => project.use.baseURL)
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  if (!configured) throw new Error('E2E_BASE_URL is required for authenticated Preview validation.');

  const target = new URL(configured);
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.vercel.app')) {
    throw new Error('E2E_BASE_URL must be an HTTPS Vercel Preview deployment URL.');
  }
  return target.origin;
}

function isAllowedResponse(status: number, location: string | undefined, origin: string) {
  if (status >= 200 && status < 300) return true;
  if (status < 300 || status >= 400 || !location) return false;
  try {
    return new URL(location, origin).origin === origin;
  } catch {
    return false;
  }
}

export default async function previewProtectionSetup(config: FullConfig) {
  await fs.rm(previewProtectionStatePath, { force: true });
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret?.trim()) {
    throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is required for authenticated Preview validation.');
  }

  const origin = deploymentOrigin(config);
  const bootstrap = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': secret,
      'x-vercel-set-bypass-cookie': 'true',
    },
  });

  try {
    const response = await bootstrap.get('/', { failOnStatusCode: false, maxRedirects: 0 });
    if (!isAllowedResponse(response.status(), response.headers().location, origin)) {
      throw new Error(`Vercel Preview protection bypass was rejected with HTTP ${response.status()}.`);
    }

    const state = await bootstrap.storageState();
    if (!state.cookies.some(cookie => origin.endsWith(cookie.domain.replace(/^\./, '')))) {
      throw new Error('Vercel Preview protection bypass did not issue a browser cookie.');
    }

    const verification = await request.newContext({ baseURL: origin, storageState: state });
    try {
      const verified = await verification.get('/', { failOnStatusCode: false, maxRedirects: 0 });
      if (!isAllowedResponse(verified.status(), verified.headers().location, origin)) {
        throw new Error(`Vercel Preview protection cookie was rejected with HTTP ${verified.status()}.`);
      }
    } finally {
      await verification.dispose();
    }

    await fs.writeFile(previewProtectionStatePath, JSON.stringify(state), { mode: 0o600 });
    await fs.chmod(previewProtectionStatePath, 0o600);
  } finally {
    await bootstrap.dispose();
  }
}
