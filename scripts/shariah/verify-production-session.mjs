import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Only the normal, pre-existing admin account/session is used. No service key,
// credential reset, role changes, mocks, storage-state files or tracing.
const ORIGIN = 'https://www.the-sfm.com';
const main = process.env.GITHUB_REF === 'refs/heads/main';
const proof = { checkedAt: new Date().toISOString(), mode: main ? 'production-admin-refresh' : 'production-admin-readiness',
  revision: process.env.GITHUB_SHA, authenticated: false, savedReadBack: false };
let browser;
proof.stage = 'configuration';
function requireCheck(condition, code) { if (!condition) throw new Error(code); }
try {
  requireCheck(process.env.GITHUB_REPOSITORY === 'elqallaf09/thesfm', 'UNEXPECTED_REPOSITORY');
  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD;
  requireCheck(email && password, 'ADMIN_SESSION_CREDENTIALS_NOT_CONFIGURED');
  if (main) {
    requireCheck(/^[a-f0-9]{40}$/.test(proof.revision ?? ''), 'INVALID_REVISION');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const response = await fetch(`${ORIGIN}/api/sharia-stocks/screening`, { signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' }).catch(() => null);
      const data = response?.ok ? await response.json().catch(() => null) : null;
      if (data?.revision === proof.revision) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    requireCheck(ready, 'EXACT_PRODUCTION_HANDLER_NOT_DEPLOYED');
  }
  proof.stage = 'browser-login';
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: ORIGIN, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const denial = await context.request.get('/api/market/shariah/refresh');
  proof.unauthenticatedRefreshStatus = denial.status();
  requireCheck(denial.status() === 401, 'UNAUTHENTICATED_REFRESH_WAS_NOT_DENIED');
  await page.goto('/login?next=%2Fsfm-admin-control%2Fshariah', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"],input[autocomplete="username"],input[name="email"],input[name="username"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  const loginPromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST');
  await page.locator('button[type="submit"]').first().click();
  const login = await loginPromise;
  // Never print a login payload, cookie, request body, email or password.
  proof.loginStatus = login.status();
  requireCheck(login.status() === 200, 'ADMIN_LOGIN_NOT_SUCCESSFUL');
  await page.waitForURL(url => url.pathname !== '/login');
  const cookies = await context.cookies(ORIGIN);
  requireCheck(['sfm_access_token', 'sfm_auth'].every(name => cookies.some(cookie => cookie.name === name && cookie.httpOnly && cookie.secure)), 'SECURE_ADMIN_SESSION_NOT_ESTABLISHED');
  proof.stage = 'admin-catalog';
  await page.goto('/sfm-admin-control/shariah', { waitUntil: 'domcontentloaded' });
  await page.locator('.sharia-admin-table-shell tbody tr').first().waitFor();
  const catalog = await context.request.get('/api/admin/shariah?limit=50');
  proof.adminReadStatus = catalog.status();
  requireCheck(catalog.status() === 200, 'ADMIN_PAGE_ACCESS_NOT_AUTHORIZED');
  const before = await catalog.json();
  requireCheck(before.ok && Array.isArray(before.items) && before.items.length > 0, 'ADMIN_CATALOG_NOT_LOADED');
  proof.authenticated = true;
  proof.beforeCounts = before.counts;
  if (main) {
    const selected = before.items.find(row => row.asset_type === 'stock' && !row.shariah_manual_override && row.symbol === 'KO')
      ?? before.items.find(row => row.asset_type === 'stock' && !row.shariah_manual_override);
    requireCheck(selected, 'NO_AUTOMATIC_EQUITY_FOR_VERIFICATION');
    proof.stage = 'admin-refresh';
    await page.getByTestId(`shariah-row-${selected.id}`).locator('button').first().click();
    const refresh = page.getByTestId('shariah-refresh-selected');
    await refresh.waitFor();
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/market/shariah/refresh' && response.request().method() === 'POST', { timeout: 60000 });
    await refresh.click();
    await page.getByTestId('shariah-refresh-progress').waitFor();
    const response = await responsePromise;
    const outcome = await response.json();
    proof.refresh = { httpStatus: response.status(), ok: outcome.ok, runId: outcome.runId, scanned: outcome.scanned,
      updated: outcome.updated, failed: outcome.failed?.map(item => ({ symbol: item.symbol, code: item.reason })) };
    requireCheck(response.ok() && outcome.ok && outcome.updated === 1 && outcome.scanned === 1 && outcome.runId, 'AUTHENTICATED_REFRESH_DID_NOT_SAVE_ONE_RESULT');
    await page.getByTestId('shariah-refresh-progress').filter({ hasText: outcome.runId }).waitFor();
    proof.stage = 'reload-read-back';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.sharia-admin-table-shell tbody tr').first().waitFor();
    const afterResponse = await context.request.get('/api/admin/shariah?limit=50');
    requireCheck(afterResponse.ok(), 'READ_AFTER_RELOAD_FAILED');
    const after = await afterResponse.json();
    const stored = after.items?.find(item => item.id === selected.id);
    requireCheck(stored?.shariah_last_reviewed_at && stored.shariah_last_reviewed_at !== selected.shariah_last_reviewed_at && !stored.shariah_manual_override, 'NEW_REVIEW_NOT_PERSISTED');
    requireCheck(stored.shariah_refresh_run_id === outcome.runId, 'PERSISTED_ROW_RUN_ID_MISMATCH');
    proof.savedReadBack = true;
    proof.saved = { symbol: stored.symbol, exchange: stored.exchange, status: stored.shariah_status, reviewedAt: stored.shariah_last_reviewed_at, runId: outcome.runId };
    proof.afterCounts = after.counts;
  }
  proof.stage = 'complete';
  proof.ok = true;
  await context.close();
} catch (error) {
  // Playwright errors can contain locators/DOM/URLs. Only our allowlisted codes
  // are recorded; never serialize arbitrary exceptions from a login session.
  proof.ok = false;
  proof.error = /^[A-Z][A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'PRODUCTION_SESSION_STEP_FAILED';
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  mkdirSync('proof', { recursive: true });
  writeFileSync('proof/production-session.json', JSON.stringify(proof, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(proof));
}
