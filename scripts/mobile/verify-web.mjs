// Isolated browser contract QA. Every API is intercepted; no production data is written.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MOBILE_RESOURCES, localized } from '../../src/lib/mobile/resourceContract.ts';
const require = createRequire(import.meta.url);
const { chromium, expect } = require('@playwright/test');
const product = process.argv[2] ?? 'investor';
const root = path.resolve(process.argv[3] ?? 'apps/expo-go/.expo-validation/web');
if (!existsSync(path.join(root, 'index.html'))) throw new Error('Export the selected product for web first.');
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
  if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) { response.writeHead(403).end(); return; }
  try { const data = readFileSync(target); response.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : target.endsWith('.html') ? 'text/html' : 'application/octet-stream'); response.end(data); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SFM_QA_BROWSER_PATH ? { executablePath: process.env.SFM_QA_BROWSER_PATH } : {}),
  args: process.env.SFM_QA_SINGLE_PROCESS === '1' ? ['--no-sandbox', '--single-process', '--no-zygote'] : [],
});
const results = [];
try {
  for (const [layout, width, height] of [['phone', 390, 844], ['landscape', 844, 390], ['tablet', 1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    let language = 'ar', theme = 'system'; let writes = 0;
    const records = new Map();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
    await page.route('https://**/*', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
      let body;
      if (url.pathname === '/auth/v1/token') body = { access_token: 'isolated-browser-fixture', refresh_token: 'isolated-browser-refresh', expires_in: 3600 };
      else if (url.pathname === '/auth/v1/logout') body = {};
      else if (url.pathname === '/api/mobile/account') {
        if (request.method() === 'PATCH') { const patch = request.postDataJSON(); language = patch.preferred_lang ?? language; theme = patch.preferred_theme ?? theme; writes++; }
        body = { ok: true, user: { id: 'qa-owner', email: 'qa@example.test' }, profile: { display_name: 'QA account', username: 'qa_user', preferred_lang: language, preferred_theme: theme }, subscriptions: [] };
      } else if (url.pathname.endsWith('/summary')) body = { ok: true, summary: product === 'finance' ? { currency: 'KWD', monthlyIncome: 100, monthlyExpenses: 40, monthlyNet: 60, activeDebtCount: 1, trackedPosition: null } : { currency: 'KWD', projectCount: 1, customerCount: 1, supplierCount: 0, monthlySales: 100, monthlyOperatingExpenses: 40 } };
      else if (/\/records\/[^/]+$/.test(url.pathname)) {
        const key = url.pathname.split('/').at(-1); const rows = records.get(key) ?? [];
        if (request.method() === 'POST') { const record = { ...request.postDataJSON(), id: 'c52a014b-e3fc-4e4c-9279-418377c2267e', created_at: '2026-10-24T00:00:00Z' }; records.set(key, [...rows, record]); writes++; body = { ok: true, record }; }
        else body = { ok: true, version: 1, records: rows, nextCursor: null };
      } else if (url.pathname === '/api/notifications') body = { notifications: [] };
      else if (url.pathname === '/api/markets') body = { markets: [{ symbol: 'NBK.KW', displaySymbol: 'NBK.KW', name: 'QA market fixture', assetType: 'stock', currency: 'KWD', exchange: 'XKUW', country: 'KW' }], pagination: { hasMore: false } };
      else body = { ok: true, items: [], events: [] };
      await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const start = Date.now(); await page.goto(origin);
    await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('qa@example.test');
    await page.getByLabel('كلمة المرور', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
    await page.getByRole('button', { name: 'حسابي', exact: true }).waitFor();
    const readyMs = Date.now() - start;
    const catalogLabel = product === 'finance' ? 'أموالي' : product === 'investor' ? 'استثماراتي' : 'إدارة الأعمال';
    await page.getByRole('button', { name: catalogLabel, exact: true }).click();
    const resource = MOBILE_RESOURCES.find(item => item.id === (product === 'finance' ? 'expenses' : product === 'investor' ? 'watchlist' : 'customers'));
    await page.getByRole('button', { name: localized(resource.label, 'ar'), exact: true }).click();
    await page.getByRole('button', { name: 'إضافة سجل', exact: true }).click();
    for (const field of resource.fields.filter(field => field.required)) {
      const label = `${localized(field.label, 'ar')} *${field.type === 'currency' ? ' (KWD / USD / EUR)' : ''}`;
      await page.getByLabel(label, { exact: true }).fill(field.type === 'number' ? '10' : field.type === 'currency' ? 'KWD' : field.key === 'symbol' ? 'NBK.KW' : field.key === 'asset_type' ? 'stock' : 'QA record');
    }
    await page.getByRole('button', { name: 'حفظ في حسابي', exact: true }).click();
    await expect(page.getByRole('button', { name: 'تعديل', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'حسابي', exact: true }).click();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Français', exact: true }).click();
    await page.getByRole('button', { name: 'Déconnexion', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clair', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
    await page.getByRole('button', { name: 'Connexion', exact: true }).waitFor();
    expect(await page.getByText('QA record', { exact: true }).count()).toBe(0);
    expect(errors).toEqual([]); expect(writes).toBeGreaterThanOrEqual(4);
    results.push({ product, layout, viewport: [width, height], readyMs, recordSave: 'passed', languages: ['ar', 'en', 'fr'], themes: ['dark', 'light'], signOutPrivacy: 'passed', overflow: false, runtimeErrors: errors.length, source: 'intercepted QA APIs; no production writes' });
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
