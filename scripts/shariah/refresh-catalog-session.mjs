import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Explicitly authorized maintenance using the existing admin session only.
// No service-role key, cron bypass, password reset, role mutation or manual rating.
const ORIGIN = 'https://www.the-sfm.com';
const expected = process.env.SFM_EXPECTED_PRODUCTION_SHA;
const proof = { startedAt: new Date().toISOString(), revision: expected, operations: [], persisted: [] };
const requireCheck = (condition, code) => { if (!condition) throw new Error(code); };
const safeCode = value => typeof value === 'string' && /^[a-zA-Z0-9_]+$/.test(value) ? value : 'UNCLASSIFIED_SOURCE_ERROR';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
async function checkRevision() {
  const response = await fetch(`${ORIGIN}/api/sharia-stocks/screening`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  requireCheck(response.ok && data.revision === expected, 'PRODUCTION_REVISION_CHANGED');
}
try {
  requireCheck(process.env.GITHUB_REPOSITORY === 'elqallaf09/thesfm' && /^[a-f0-9]{40}$/.test(expected ?? ''), 'INVALID_TARGET');
  const email = process.env.E2E_ADMIN_EMAIL?.trim(), password = process.env.E2E_ADMIN_PASSWORD;
  requireCheck(email && password, 'ADMIN_CREDENTIALS_NOT_CONFIGURED');
  await checkRevision();
  browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: ORIGIN });
  const denied = await context.request.post('/api/market/shariah/refresh', { data: { limit: 1 }, maxRedirects: 0 });
  requireCheck([401, 403].includes(denied.status()), 'ANONYMOUS_REFRESH_NOT_DENIED');
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto('/login?next=%2Fsfm-admin-control%2Fshariah', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"],input[autocomplete="username"],input[name="email"],input[name="username"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  const loginResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST');
  await page.locator('button[type="submit"]').first().click();
  requireCheck((await loginResponse).status() === 200, 'ADMIN_LOGIN_FAILED');
  await page.waitForURL(url => url.origin === ORIGIN && url.pathname !== '/login');
  const cookies = await context.cookies(ORIGIN);
  requireCheck(['sfm_access_token', 'sfm_auth'].every(name => cookies.some(c => c.name === name && c.httpOnly && c.secure)), 'SECURE_SESSION_MISSING');
  async function catalog() {
    const response = await context.request.get('/api/admin/shariah?limit=100', { maxRedirects: 0, timeout: 15000 });
    const data = await response.json();
    requireCheck(response.ok() && data.ok && Array.isArray(data.items) && data.items.length < 100, 'CATALOG_MISSING_OR_TRUNCATED');
    return data.items;
  }
  const before = await catalog();
  const targets = before.filter(row => ['stock', 'etf'].includes(row.asset_type) && !row.shariah_manual_override
    && (!row.shariah_next_refresh_at || Date.parse(row.shariah_next_refresh_at) <= Date.now()));
  const manual = before.filter(row => row.shariah_manual_override).map(row => ({ id: row.id, status: row.shariah_status, reviewedAt: row.shariah_last_reviewed_at }));
  proof.targetCount = targets.length;
  console.log(JSON.stringify({ event: 'catalog-targets', count: targets.length, symbols: targets.map(row => row.symbol) }));
  for (const target of targets) {
    await checkRevision();
    const response = await context.request.post('/api/market/shariah/refresh', { data: { symbolId: target.id, limit: 1, force: false },
      headers: { Origin: ORIGIN }, maxRedirects: 0, timeout: 60000 });
    const result = await response.json();
    requireCheck(![401, 403, 429].includes(response.status()), 'AUTHORIZATION_OR_RATE_LIMIT_STOP');
    const operation = { symbol: target.symbol, id: target.id, httpStatus: response.status(), runId: result.runId,
      scanned: result.scanned, updated: result.updated, failures: (result.failed ?? []).map(item => ({ symbol: item.symbol, reason: safeCode(item.reason) })) };
    proof.operations.push(operation);
    console.log(JSON.stringify(operation));
    requireCheck(!result.fatal, 'REFRESH_FATAL_STOP');
    if (result.updated === 1) {
      const after = (await catalog()).find(row => row.id === target.id);
      requireCheck(after && !after.shariah_manual_override && after.shariah_refresh_run_id === result.runId
        && after.shariah_last_reviewed_at !== target.shariah_last_reviewed_at, 'PERSISTED_RESULT_MISMATCH');
      proof.persisted.push({ symbol: after.symbol, runId: result.runId, reviewedAt: after.shariah_last_reviewed_at, status: after.shariah_status });
    }
    // Stay strictly below the existing 12/minute API limit, including fast funds.
    await delay(6500);
  }
  const after = await catalog();
  requireCheck(manual.every(old => after.some(row => row.id === old.id && row.shariah_manual_override && row.shariah_status === old.status && row.shariah_last_reviewed_at === old.reviewedAt)), 'MANUAL_REVIEW_CHANGED');
  proof.catalog = after.filter(row => ['stock','etf'].includes(row.asset_type)).map(row => ({ symbol: row.symbol, exchange: row.exchange,
    status: row.shariah_status, reviewedAt: row.shariah_last_reviewed_at, nextAt: row.shariah_next_refresh_at,
    refreshError: row.shariah_refresh_error, evidence: row.shariah_screening_data }));
  proof.ok = proof.operations.every(row => row.failures.length === 0);
  proof.finishedAt = new Date().toISOString();
  console.log(JSON.stringify({ event: 'catalog-continuation-complete', ok: proof.ok, targeted: targets.length, saved: proof.persisted.length,
    statuses: proof.catalog.map(row => ({ symbol: row.symbol, status: row.status, missing: row.evidence?.missingFinancialFields,
      coverage: row.evidence?.fieldCoverage, fundReview: row.evidence?.fundReview, rules: row.evidence?.screeningRules, error: row.refreshError })) }));
  if (!proof.ok) process.exitCode = 1;
  await context.close();
} catch (error) {
  proof.ok = false; proof.error = safeCode(error?.message); process.exitCode = 1;
  console.log(JSON.stringify({ event: 'catalog-continuation-stop', code: proof.error }));
} finally {
  await browser?.close().catch(() => undefined);
  mkdirSync('proof', { recursive: true });
  writeFileSync('proof/catalog-continuation.json', JSON.stringify(proof, null, 2), { mode: 0o600 });
}
