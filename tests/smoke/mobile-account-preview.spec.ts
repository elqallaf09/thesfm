import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test, expect, request } from '@playwright/test';
import { userAuthStatePath, adminAuthStatePath } from './auth-state';
import { previewProtectionStatePath } from './preview-protection-state';

async function session(path: string) {
  const state = JSON.parse(await readFile(path, 'utf8'));
  const stored = state.cookies?.find((cookie: { name: string }) => cookie.name === 'sfm_access_token')?.value;
  if (!stored) throw new Error('Preview fixture session is missing.');
  const token = decodeURIComponent(stored);
  const subject = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
  if (typeof subject !== 'string' || !/^[0-9a-f-]{36}$/i.test(subject)) throw new Error('Invalid fixture identity.');
  return { token, subject };
}

test('native bearer sessions preserve record ownership in all three products', async ({ baseURL }, info) => {
  test.skip(process.env.SFM_PREVIEW_MOBILE_QA !== '1' || info.project.name !== 'chromium-desktop', 'Runs once against an isolated authenticated release Preview.');
  test.setTimeout(120_000);
  const ref = process.env.SUPABASE_PREVIEW_REF;
  if (!ref || !/^[a-z0-9]{20}$/.test(ref) || ref === process.env.SUPABASE_PRODUCTION_REF
    || process.env.SUPABASE_PREVIEW_URL !== `https://${ref}.supabase.co`
    || !baseURL || !/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(baseURL)) throw new Error('Refusing non-isolated mobile validation.');
  const owner = await session(userAuthStatePath), other = await session(adminAuthStatePath);
  expect(owner.subject).not.toBe(other.subject);
  const clients = await Promise.all([owner.token, other.token, null].map(token => request.newContext({
    baseURL, storageState: previewProtectionStatePath, extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  })));
  const [own, foreign, anonymous] = clients;
  try {
    expect((await anonymous.get('/api/mobile/session')).status()).toBe(401);
    expect((await own.get('/api/mobile/session')).status()).toBe(200);
    for (const [client, identity] of [[own, owner], [foreign, other]] as const) {
      const response = await client.get('/api/mobile/account');
      expect(response.status()).toBe(200);
      expect((await response.json()).user.id).toBe(identity.subject);
      expect(response.headers()['cache-control']).toContain('no-store');
    }
    const name = `isolated-mobile-${randomUUID()}`;
    for (const [product, resource, values] of [
      ['finance', 'expenses', { name, amount: 1, currency: 'KWD' }],
      ['investor', 'watchlist', { name, symbol: `QA${randomUUID().replaceAll('-', '').slice(0,12)}`, asset_type: 'stock', currency: 'KWD' }],
      ['business', 'customers', { name }],
    ] as const) {
      const path = `/api/mobile/${product}/records/${resource}`;
      const response = await own.post(path, { data: values });
      expect(response.status(), `${product} fixture creation`).toBe(201);
      const id = (await response.json()).record.id;
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      try {
        const foreignRows = await foreign.get(path);
        expect(foreignRows.status()).toBe(200);
        expect((await foreignRows.json()).records.some((row: { id: string }) => row.id === id)).toBe(false);
        expect((await foreign.patch(path, { data: { id, name: 'forbidden' } })).status()).toBe(404);
        expect((await foreign.delete(path, { data: { id } })).status()).toBe(404);
        expect((await own.patch(path, { data: { id, name: `${name}-updated` } })).status()).toBe(200);
        const ownRows = await own.get(path);
        expect(ownRows.status()).toBe(200);
        expect((await ownRows.json()).records.find((row: { id: string }) => row.id === id)?.name).toBe(`${name}-updated`);
      } finally {
        expect((await own.delete(path, { data: { id } })).status()).toBe(200);
      }
    }
  } finally { await Promise.all(clients.map(client => client.dispose())); }
});
