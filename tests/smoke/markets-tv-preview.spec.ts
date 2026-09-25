import { expect, test } from '@playwright/test';
import { adminAuthStatePath, userAuthStatePath } from './auth-state';
import { previewProtectionStatePath } from './preview-protection-state';

test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });
test('isolated Preview TV pairing consumes its code, isolates owners and revokes access', async ({ browser, page, baseURL }, testInfo) => {
  test.skip(process.env.SFM_PREVIEW_OBSERVABILITY_QA !== '1' || testInfo.project.name !== 'chromium-desktop', 'Requires the verified isolated authenticated Preview job.');
  test.setTimeout(60000);
  const preview = process.env.SUPABASE_PREVIEW_REF;
  const production = process.env.SUPABASE_PRODUCTION_REF;
  if (!preview || !production || preview === production || !/^[a-z0-9]{20}$/.test(preview)) throw new Error('Verified isolated database is required before pairing writes.');
  const origin = new URL(baseURL || '');
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.vercel.app')) throw new Error('Exact Vercel Preview origin required.');
  const tv = await browser.newContext({ baseURL, storageState: previewProtectionStatePath });
  const other = await browser.newContext({ baseURL, storageState: adminAuthStatePath });
  let deviceId: string | null = null;
  try {
    // Verify the isolated fixture session against the deployed app before any write.
    expect((await page.request.get(`${origin.origin}/api/tv/account`)).status()).toBe(200);
    const created = await tv.request.post('/api/tv/pair', { headers: { origin: origin.origin }, data: { name: 'Isolated CI television' } });
    expect(created.status()).toBe(201);
    const pair = await created.json();
    if (!/^[A-F0-9]{12}$/.test(pair.code) || !/^[a-f0-9]{64}$/.test(pair.secret)) throw new Error('Pair credential format was invalid.');
    expect((await tv.request.get('/api/tv/device')).status()).toBe(401);
    await page.goto(`/tv/pair#${pair.code}`);
    await page.getByRole('button', { name: 'الموافقة على ربط التلفزيون', exact: true }).click();
    await expect(page.getByText('تم الربط. ارجع إلى التلفزيون.', { exact: true })).toBeVisible();
    const replay = await other.request.post('/api/tv/account', { headers: { origin: origin.origin }, data: { code: pair.code } });
    expect(replay.status()).toBe(400);
    const claimed = await tv.request.get('/api/tv/pair', { headers: { 'x-sfm-tv-token': pair.secret } });
    expect(claimed.status()).toBe(200);
    const claim = await claimed.json();
    if (!/^[a-f0-9]{64}$/.test(claim.token) || claim.token === pair.secret) throw new Error('TV credential rotation failed.');
    const headers = { 'x-sfm-tv-token': claim.token };
    expect((await tv.request.get('/api/tv/pair', { headers: { 'x-sfm-tv-token': pair.secret } })).status()).toBe(410);
    const linked = await tv.request.get('/api/tv/device', { headers });
    expect(linked.status()).toBe(200);
    const data = await linked.json(); deviceId = data.device.id;
    expect(Array.isArray(data.symbols)).toBe(true);
    const foreignRevoke = await other.request.delete('/api/tv/account', { headers: { origin: origin.origin }, data: { id: deviceId } });
    expect(foreignRevoke.status()).toBe(200);
    expect((await tv.request.get('/api/tv/device', { headers })).status()).toBe(200);
    const revoke = await page.request.delete(`${origin.origin}/api/tv/account`, { headers: { origin: origin.origin }, data: { id: deviceId } });
    expect(revoke.status()).toBe(200);
    expect((await tv.request.get('/api/tv/device', { headers })).status()).toBe(401);
  } finally {
    if (deviceId) await page.request.delete(`${origin.origin}/api/tv/account`, { headers: { origin: origin.origin }, data: { id: deviceId } });
    await tv.close(); await other.close();
  }
});
