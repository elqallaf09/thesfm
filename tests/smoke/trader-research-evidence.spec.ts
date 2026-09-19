import { expect, test } from '@playwright/test';
import { createTraderDrawerFixture, openTraderDrawerFixture } from './helpers/trader-drawer-fixture';

let fixture: Awaited<ReturnType<typeof createTraderDrawerFixture>>;
test.beforeAll(async () => { fixture = await createTraderDrawerFixture(); });
test.afterAll(async () => { await fixture.close(); });

for (const language of ['ar', 'en', 'fr']) {
  test(`full symbol analysis retains historical agreement, confidence and risk in ${language}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const frame = await openTraderDrawerFixture(page, fixture.origin, language, 'light', ['XAUUSD']);
    const strategies = ['trend', 'momentum', 'support_resistance'].map(id => ({ id, nameEn: id, nameAr: id, nameFr: id, signal: 'buy', score: 75, weight: 25, available: true }));
    const research = { basis: 'daily_history', available: true, technicalAvailable: true, provider: 'Twelve Data',
      asOf: '2026-09-18', samples: 260, freshness: 'recent', confidence: 64,
      strategyCount: 3, strategies,
      strategyAgreement: { agreementPct: 75, strategyCount: 3, buyPct: 75, sellPct: 0, watchPct: 25 },
      dataQualityStatus: { status: 'delayed', score: 70 },
      dataSufficiency: { sufficient: true, samples: 260, strategyCoverage: { available: 3, total: 9 }, items: [], unavailableStrategies: [] },
      technicalSummary: { indicators: { rsi14: 57, ema20: 2900, ema50: 2800, ema200: 2500, macd: 12, macdSignal: 10, atr: 30, support: 2800, resistance: 3200 } },
      risk: { level: 'medium', atrPercent: 1, annualizedVolatilityPercent: 23.45, maximumDrawdownPercent: 7.89, drawdownSamples: 120 },
    };
    const row = { symbol: 'XAUUSD', name: 'Gold spot fixture', assetType: 'commodity', currency: 'USD',
      price: null, available: false, lastKnownPrice: 3000, confidence: null, aiConfidence: null,
      signalAvailable: false, finalRecommendation: 'Insufficient data', targetPrice: null, stopLoss: null,
      technicalAvailable: true, samples: 260, research, technicalSummary: research.technicalSummary,
      strategies, strategyAgreement: research.strategyAgreement, dataSufficiency: research.dataSufficiency,
      priceReference: { kind: 'daily', precision: 'date', observedAt: '2026-09-18', price: 3000 },
      source: 'THE SFM Market Data Engine', upstreamSource: 'Twelve Data', dataQuality: 'delayed' };
    const calls: string[] = []; let refreshed = false;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); calls.push(url.pathname);
      let payload: object = { ok: true, items: [], data: [] };
      if (url.pathname === '/api/recommendations') {
        refreshed ||= url.searchParams.get('refresh') === '1';
        payload = { ok: true, status: 'partial', recommendations: [row], data: [] };
      }
      if (url.pathname.includes('/technical/')) payload = { ok: true, ...research, research, feature: 'technical_analysis', indicators: research.technicalSummary.indicators };
      if (url.pathname.includes('/signal/')) payload = { ok: true, status: 'partial', signal: row };
      if (url.pathname.includes('asset-profile')) payload = { ok: true, profile: { symbol: 'XAUUSD', name: row.name } };
      await route.fulfill({ status: 200, json: payload });
    });
    await frame.locator('[data-symbol-details="XAUUSD"]').first().click();
    const drawer = frame.locator('[data-symbol-drawer]');
    await expect(drawer.locator('[data-research-evidence]')).toContainText('23.45%');
    await frame.locator('#drawer-tab-recommendation').click();
    await expect(drawer.locator('.final-recommendation-card')).toContainText('64%');
    await drawer.locator('[data-drawer-full]').click();
    const detail = frame.locator('#symbol-details-body');
    await expect(detail.locator('.final-recommendation-card')).toContainText('260');
    await expect(detail.locator('.final-recommendation-card')).toContainText('64%');
    await expect(detail.locator('.final-recommendation-card')).toContainText('7.89%');
    await expect(detail.locator('.technical-available')).toContainText('57');
    await expect(detail.locator('.consensus-panel .strat-row')).toHaveCount(3);
    await expect(detail.locator('.technical-unavailable')).toHaveCount(0);
    // Background hydration and preference changes rerender the page; loaded details must survive.
    await frame.evaluate(() => window.dispatchEvent(new Event('sfm-language-change')));
    await expect(detail.locator('.final-recommendation-card')).toContainText('64%');
    await expect(detail.locator('.technical-available')).toContainText('57');
    await expect(detail.locator('[data-follow-trade]')).toHaveCount(0);
    expect(calls).not.toContain('/api/market/technical-analysis');
    expect(calls.some(path => path.startsWith('/api/market/signals/'))).toBe(false);
    // A retry must bypass provider caches for this symbol, including from full details.
    await detail.locator('[data-retry]').first().click();
    await expect.poll(() => refreshed).toBe(true);
    await expect(detail.locator('.technical-available')).toContainText('57');
    expect(errors).toEqual([]);
  });
}


test('Arabic search opens canonical assets and lets users choose ambiguous names', async ({ page }) => {
  const frame = await openTraderDrawerFixture(page, fixture.origin, 'ar', 'light');
  const requestedSymbols: string[] = [];
  const names: Record<string, string> = { 'ذهب': 'XAUUSD', 'فضة': 'XAGUSD', 'سهم أبل': 'AAPL', 'بيتكوين': 'BTC/USD', 'اليورو مقابل الدولار': 'EURUSD' };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let payload: object = { ok: true, results: [], recommendations: [], items: [] };
    if (url.pathname === '/api/market/search') {
      const query = url.searchParams.get('q') || '';
      const symbol = names[query];
      payload = symbol ? { resolved: { symbol }, results: [{ symbol }] }
        : { resolved: null, results: query === 'بنك' ? [{ symbol: 'NBK.KW', name: 'بنك الكويت الوطني' }, { symbol: 'BOUBYAN.KW', name: 'بنك بوبيان' }] : [] };
    }
    if (url.pathname === '/api/recommendations' && url.searchParams.has('symbols')) {
      const symbol = url.searchParams.get('symbols')!; requestedSymbols.push(symbol);
      payload = { ok: true, recommendations: [{ symbol, name: symbol, price: null, available: false }] };
    }
    await route.fulfill({ status: 200, json: payload });
  });
  for (const [query, symbol] of Object.entries(names)) {
    await frame.locator('#symbol-input').fill(query);
    await frame.locator('#symbol-search button[type="submit"]').click();
    await expect(frame.locator('#symbol-input')).toHaveValue(symbol);
    await expect(frame.locator('#price-data-panel .symbol-code')).toHaveText(symbol);
    await expect.poll(() => requestedSymbols.includes(symbol.replaceAll('/', ''))).toBe(true);
  }
  await frame.locator('#symbol-input').fill('بنك');
  await frame.locator('#symbol-input').press('Enter');
  await expect(frame.locator('#symbol-search-results button')).toHaveCount(2);
  await frame.locator('#symbol-search-results button').filter({ hasText: 'بنك بوبيان' }).click();
  await expect(frame.locator('#price-data-panel .symbol-code')).toHaveText('BOUBYAN.KW');
  await frame.locator('#symbol-input').fill('اسم مجهول');
  await frame.locator('#symbol-input').press('Enter');
  await expect(frame.locator('#symbol-search-results')).toContainText('لم نجد اسماً مطابقاً');
  await expect(frame.locator('#price-data-panel .symbol-code')).toHaveText('BOUBYAN.KW');
  expect(requestedSymbols.some(value => /[\u0600-\u06ff]/.test(value))).toBe(false);
});
