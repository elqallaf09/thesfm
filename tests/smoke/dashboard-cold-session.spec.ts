import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const ownerTables = ['monthly_income_sources', 'expense_items', 'savings_items', 'financial_goals', 'investment_items', 'debts'];

// auth.setup logs in once and saves both browser auth and Preview protection
// state. Each Playwright test starts a fresh context with that state in memory;
// no login page or previous navigation has warmed this context's SDK modules.
test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });

test('a cold dashboard restores its persisted session before shared owner reads', async ({ page }, testInfo) => {
  test.skip(!userAuthConfigured, 'Cold authenticated startup requires the configured Preview user fixture.');
  expect(page.url()).toBe('about:blank');
  const reads = new Map<string, number>();
  const successfulReads = new Set<string>();
  const scriptRequests = new Map<string, number>();
  const sdkScripts = new Set<string>();
  const inspectScripts: Promise<void>[] = [];
  let verifiedSession = false;
  let sessionPosts = 0;
  let prematureOwnerReads = 0;
  let duplicateClientWarnings = 0;
  let runtimeErrors = 0;

  page.on('console', message => {
    if (/Multiple GoTrueClient instances/i.test(message.text())) duplicateClientWarnings += 1;
  });
  page.on('pageerror', () => { runtimeErrors += 1; });
  page.on('request', request => {
    const url = new URL(request.url());
    const table = url.pathname.startsWith('/rest/v1/') ? url.pathname.split('/').at(-1) ?? '' : '';
    if (request.method() === 'GET' && ownerTables.includes(table)) {
      reads.set(table, (reads.get(table) ?? 0) + 1);
      if (!verifiedSession) prematureOwnerReads += 1;
    }
    if (url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js')) {
      scriptRequests.set(url.pathname, (scriptRequests.get(url.pathname) ?? 0) + 1);
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname === '/api/auth/session' && response.request().method() === 'POST') {
      sessionPosts += 1;
      if (response.ok()) verifiedSession = true;
    }
    const table = url.pathname.startsWith('/rest/v1/') ? url.pathname.split('/').at(-1) ?? '' : '';
    if (response.request().method() === 'GET' && response.ok() && ownerTables.includes(table)) successfulReads.add(table);
    if (url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js') && response.ok()) {
      // Inspect only public static JavaScript, never auth responses or storage.
      inspectScripts.push(response.text().then(source => {
        if (source.includes('supabaseUrl is required') || source.includes('GoTrueClient')) sdkScripts.add(url.pathname);
      }));
    }
  });

  const document = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  expect(document?.ok()).toBe(true);
  const html = await document!.text();
  const initialScripts = new Set([...html.matchAll(/(?:src|href)="([^"]+\.js(?:\?[^"]*)?)"/g)]
    .map(match => new URL(match[1], page.url()).pathname));
  await expect(page).toHaveURL(url => url.pathname === '/dashboard');
  const dashboard = page.locator('[data-dashboard-executive="true"]');
  await expect(dashboard).toBeVisible();
  await expect.poll(() => successfulReads.size, { message: 'All six owner-scoped dashboard reads should succeed.' }).toBe(ownerTables.length);
  // The timestamp is committed after profile + all six queries settle, unlike
  // the executive container, which can appear after the first source responds.
  await expect(dashboard.getByText(/^(Last updated|آخر تحديث|Dernière mise à jour):/)).toBeVisible();
  const measurements = await page.evaluate(() => {
    const scripts = performance.getEntriesByType('resource').filter((entry): entry is PerformanceResourceTiming => {
      const url = new URL(entry.name);
      return url.origin === location.origin && url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js');
    });
    return {
      readyAfterMs: Math.round(performance.now()),
      javascriptRequestsThroughReady: scripts.length,
      javascriptEncodedBytesThroughReady: scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      javascriptTransferBytesThroughReady: scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
    };
  });
  await Promise.all(inspectScripts);
  // Numbers only: no tokens, cookies, account identifiers, query strings, or DOM.
  // The SDK remains necessary through data-ready; report total transfer rather
  // than claiming that deferring its blocking parse removes those bytes.
  await testInfo.attach('cold-dashboard-startup', {
    contentType: 'application/json',
    body: JSON.stringify({ ...measurements, initialScriptCount: initialScripts.size, sdkScriptCount: sdkScripts.size }),
  });
  console.info('cold-dashboard-startup', JSON.stringify({ project: testInfo.project.name, ...measurements,
    initialScriptCount: initialScripts.size, sdkScriptCount: sdkScripts.size }));
  expect(verifiedSession).toBe(true);
  expect(sessionPosts, 'Session restore should coalesce verification into one request.').toBe(1);
  expect(prematureOwnerReads, 'Owner data must wait for server session verification.').toBe(0);
  expect(ownerTables.map(table => reads.get(table))).toEqual(ownerTables.map(() => 1));
  successfulReads.clear();
  await dashboard.getByRole('button', { name: /^(Refresh data|تحديث البيانات|Actualiser les données)$/ }).click();
  await expect.poll(() => successfulReads.size, { message: 'Refreshing should complete fresh shared owner reads.' }).toBe(ownerTables.length);
  expect(ownerTables.map(table => reads.get(table))).toEqual(ownerTables.map(() => 2));
  expect(sdkScripts.size, 'The real browser SDK should load during persisted-session restore.').toBeGreaterThan(0);
  for (const script of sdkScripts) {
    expect(initialScripts.has(script), 'The SDK must not block the initial document or SSR-preloaded shell.').toBe(false);
    expect(scriptRequests.get(script), 'Auth and data consumers should share one SDK transfer.').toBe(1);
  }
  expect(duplicateClientWarnings).toBe(0);
  expect(runtimeErrors).toBe(0);
  expect((await page.context().cookies()).some(cookie => cookie.name === 'sfm_access_token' && cookie.httpOnly)).toBe(true);
});
