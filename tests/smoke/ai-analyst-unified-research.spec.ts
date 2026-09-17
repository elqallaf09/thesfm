import { expect, test } from '@playwright/test';
// Guest-only browser interception: no real account data or live AI charges.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`one research workspace, explicit execution and full-width rules (${locale})`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.addInitScript(language => { localStorage.setItem('sfm_lang', language); localStorage.setItem('sfm_theme', 'light'); localStorage.setItem('the-sfm-theme', 'light'); }, locale);
    await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
    await page.locator('button.guest-btn').first().click(); await page.waitForURL(/\/dashboard(?:\?|$)/);
    let posts = 0;
    await page.route('**/api/intelligence/analyze', async route => {
      posts += 1;
      expect(route.request().postDataJSON()).toMatchObject({ asset: { symbol: 'NVDA', assetType: 'STOCK' }, source: 'SMART_MARKET_ANALYSIS', forceRefresh: false });
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE' } }) });
    });
    await page.route('**/api/intelligence/latest**', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'NOT_FOUND' } }) }));
    await page.route('**/api/intelligence/asset-details**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      asset: { canonicalSymbol: 'NVDA', providerSymbol: 'NVDA', displaySymbol: 'NVDA', name: 'Verified fixture asset', assetType: 'STOCK', exchange: 'NASDAQ', market: 'NASDAQ', country: 'US', quoteCurrency: 'USD', logoUrl: null }, quote: null, quoteStatus: 'unavailable', fetchedAt: '2026-09-16T00:00:00Z', correlationId: 'fixture',
    }) }));
    await page.goto('/ai-analyst/assets?symbol=NVDA&assetType=STOCK&horizon=SWING&autoRun=1');
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/NVDA\?assetType=STOCK&horizon=SWING#details$/);
    const workspace = page.getByTestId('ai-analyst-research-workspace');
    await expect(workspace).toBeVisible(); await expect(workspace.getByRole('heading', { name: 'Verified fixture asset' })).toBeVisible();
    await expect(workspace.locator('form')).toHaveCount(1);
    const runLabel = { ar: 'تشغيل البحث والتحليل', en: 'Run research and analysis', fr: 'Lancer la recherche et l’analyse' }[locale];
    const run = workspace.getByRole('button', { name: runLabel, exact: true });
    await expect(run).toBeEnabled(); expect(posts).toBe(0);
    await workspace.locator('a[href="#rules"]').click(); expect(posts).toBe(0);
    const rule = page.getByTestId('ai-analyst-rule-engine'); await expect(rule).toBeVisible();
    await expect(rule.locator('[data-tone="available"]')).toHaveCount(0);
    await workspace.locator('a[href="#research"]').click(); await run.click();
    await expect.poll(() => posts).toBe(1);
    await expect(workspace.getByTestId('intelligence-status-panel')).toHaveAttribute('role', 'alert');
    await expect(run).toBeEnabled(); await expect(page).toHaveURL(/\/ai-analyst\/analyze\/NVDA/);
    await page.goto('/ai-analyst/agent?symbol=NVDA&assetType=STOCK&timeframe=1D');
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/NVDA\?assetType=STOCK&horizon=INTRADAY#research$/);
    await expect(run).toBeEnabled(); expect(posts).toBe(1);
    await expect(workspace.locator('form select').last()).toHaveValue('INTRADAY');
    const widths = testInfo.project.name === 'chromium-desktop' ? [820, 1440] : [390];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(() => rule.evaluate(element => element.getBoundingClientRect().width / element.parentElement!.getBoundingClientRect().width)).toBeGreaterThan(0.95);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
    }
    await testInfo.attach(`unified-${locale}-${testInfo.project.name}`, { body: await workspace.screenshot(), contentType: 'image/png' });
  });
}
