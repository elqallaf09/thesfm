import { expect, test } from '@playwright/test';
import { enterGuest, factor, intelligenceResult, now, stubApis } from './fixtures/intelligence-analysis';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);

test('approved analyst dashboard: readable responsive layout, source links and read-only chart ranges', async ({ page }, testInfo) => {
  await stubApis(page, 'partial');
  const reading = intelligenceResult('partial');
  const newsEvidence = [
    { id: 'news:headline:0', labelKey: 'intelligence_evidence_latest_news_headline', value: 'Verified fixture headline for the selected asset' },
    { id: 'news:source:0', labelKey: 'intelligence_evidence_news_source_url', value: 'https://example.com/news/verified' },
  ].map(item => ({ ...item, factor: 'NEWS', kind: 'OBSERVATION', unit: null, observedAt: now, source: 'Example Wire', provider: 'verified-e2e-provider', direction: 'NEUTRAL', significance: 50 }));
  const result = { ...reading, factors: [...reading.factors, { ...factor('SENTIMENT', -30), factor: 'NEWS', source: 'Example Wire', evidence: newsEvidence }] };
  let analyzeRequests = 0;
  await page.route('**/api/intelligence/analyze', route => {
    analyzeRequests += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
  });
  await enterGuest(page);
  await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING', { waitUntil: 'domcontentloaded' });
  const run = page.getByRole('button', { name: 'Run research and analysis', exact: true });
  await expect(run).toBeEnabled();
  expect(analyzeRequests).toBe(0);
  await run.click();
  const dashboard = page.getByTestId('ai-analyst-dashboard');
  const chart = page.getByTestId('ai-analyst-verified-chart');
  await expect(dashboard).toBeVisible();
  await expect(chart.locator('svg[role="img"]')).toBeVisible();
  await expect(dashboard.getByTestId('analyst-summary-metrics').locator(':scope > article')).toHaveCount(5);
  await expect(dashboard.getByTestId('analyst-factor-cards').locator(':scope > section')).toHaveCount(4);
  await expect(page.getByTestId('analyst-evidence-detail')).not.toHaveAttribute('open', '');
  await expect(dashboard.getByRole('link', { name: 'Read article: Verified fixture headline for the selected asset' })).toHaveAttribute('href', 'https://example.com/news/verified');
  await expect(dashboard.getByRole('cell', { name: 'Unclassified', exact: true })).toBeVisible();
  await expect(dashboard.getByTestId('analyst-summary-metrics').locator(':scope > article').last()).toContainText('Unavailable');
  await expect(dashboard).not.toContainText('Fear and greed');

  const historyRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === '/api/market/history' && url.searchParams.get('range') === '1W';
  });
  await chart.getByRole('button', { name: '1W', exact: true }).click();
  await historyRequest;
  await expect(chart.getByRole('button', { name: '1W', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.locator('svg[role="img"]')).toBeVisible();
  expect(analyzeRequests).toBe(1);

  for (const [language, direction] of [['ar', 'rtl'], ['en', 'ltr'], ['fr', 'ltr']] as const) {
    await page.evaluate(lang => { localStorage.setItem('sfm_lang', lang); window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang } })); }, language);
    await expect(dashboard).toHaveAttribute('dir', direction);
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate(value => { localStorage.setItem('the-sfm-theme', value); document.documentElement.classList.toggle('dark', value === 'dark'); }, theme);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
        await expect.poll(() => dashboard.getByTestId('analyst-current-price').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28);
        await expect.poll(() => dashboard.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
        if (language === 'ar' && theme === 'light') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await testInfo.attach(`approved-dashboard-${width}.png`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
        }
      }
    }
  }
  expect(analyzeRequests).toBe(1);
});
