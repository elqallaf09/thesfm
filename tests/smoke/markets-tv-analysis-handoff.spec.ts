import { expect, test } from '@playwright/test';
import { intelligenceResult, stubApis } from './fixtures/intelligence-analysis';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(90_000);

test('the TV asset QR link opens its analysis on a phone viewport', async ({ page }) => {
  await stubApis(page, 'partial');
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
  const quote = { symbol: '^GDAXI', name: 'DAX 40', nameAr: 'داكس 40', price: null, currency: null, changePercent: null,
    source: null, observedAt: null, receivedAt: null, exchange: null, country: null, status: 'unavailable', issue: 'rate_limited' };
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { group: 'global', scene: 'overview', summary: [quote],
    quotes: [], generatedAt: new Date().toISOString(), available: 0, total: 0, selectionTotal: 1 } }));
  let posts = 0;
  await page.route('**/api/intelligence/analyze', route => {
    posts++;
    expect(route.request().postDataJSON()).toMatchObject({ asset: { symbol: '^GDAXI', assetType: 'INDEX' } });
    return route.fulfill({ status: 503, json: { ok: false, error: { code: 'PROVIDER_UNAVAILABLE' } } });
  });
  await page.goto('/tv');
  await page.locator('button.tv-scene-summary').first().click();
  const handoff = page.locator('.tv-phone-link a');
  await expect(handoff).toHaveAttribute('href', /\/ai-analyst\/analyze\/%5EGDAXI\?assetType=INDEX&autoRun=1&source=markets-tv$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await handoff.click();
  await expect.poll(() => posts).toBe(1);
});

for (const locale of ['ar', 'en', 'fr']) {
  test(`TV DAX handoff starts exactly one correctly typed analysis (${locale})`, async ({ page }) => {
    await page.addInitScript(language => localStorage.setItem('sfm_lang', language), locale);
    await stubApis(page, 'partial');
    let posts = 0;
    await page.route('**/api/intelligence/analyze', route => {
      posts++;
      expect(route.request().postDataJSON()).toMatchObject({ asset: { symbol: '^GDAXI', assetType: 'INDEX' }, locale, forceRefresh: false });
      return route.fulfill({ status: 503, json: { ok: false, error: { code: 'PROVIDER_UNAVAILABLE' } } });
    });
    await page.goto('/ai-analyst/analyze/%5EGDAXI?assetType=INDEX&autoRun=1&source=markets-tv');
    await expect.poll(() => posts).toBe(1);
    await expect(page.getByTestId('intelligence-status-panel')).toHaveAttribute('role', 'alert');
    // A failed auto-run stays actionable without an automatic retry loop.
    await expect(page.getByTestId('ai-agent-task-status')).not.toBeEmpty();
    await page.waitForTimeout(1500);
    expect(posts).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
  });
}

test('a current saved analysis opens immediately without another analysis request', async ({ page }) => {
  await stubApis(page, 'partial');
  const result = { ...intelligenceResult(), expiresAt: new Date(Date.now() + 600_000).toISOString() };
  let posts = 0;
  await page.route('**/api/intelligence/analyze', route => { posts++; return route.fulfill({ status: 500, json: { ok: false } }); });
  await page.route('**/api/intelligence/latest**', route => route.fulfill({ json: { ok: true, result } }));
  await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&autoRun=1&source=markets-tv');
  await expect(page.getByTestId('ai-analyst-canonical-result')).toBeVisible();
  expect(posts).toBe(0);
});

test('ordinary analysis links remain read-only until the user runs analysis', async ({ page }) => {
  await stubApis(page, 'partial');
  let posts = 0;
  await page.route('**/api/intelligence/analyze', route => { posts++; return route.fulfill({ status: 503, json: { ok: false } }); });
  await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&autoRun=1');
  await expect(page.getByTestId('ai-analyst-research-workspace')).toBeVisible();
  await expect(page.getByTestId('ai-agent-task-status')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(posts).toBe(0);
});
