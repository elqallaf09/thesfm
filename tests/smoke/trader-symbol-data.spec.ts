import { expect, test } from '@playwright/test';
import { createTraderDrawerFixture, openTraderDrawerFixture } from './helpers/trader-drawer-fixture';

let fixture: Awaited<ReturnType<typeof createTraderDrawerFixture>>;
test.beforeAll(async () => { fixture = await createTraderDrawerFixture(); });
test.afterAll(async () => { await fixture.close(); });
for (const setup of [
  { width: 320, height: 740, language: 'ar', theme: 'dark' },
  { width: 390, height: 844, language: 'ar', theme: 'light' },
  { width: 430, height: 932, language: 'en', theme: 'dark' },
  { width: 844, height: 390, language: 'fr', theme: 'light' },
  { width: 1280, height: 900, language: 'ar', theme: 'light' },
]) {
  test(`cold symbol data, retry and mobile layout ${setup.width} ${setup.language} ${setup.theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: setup.width, height: setup.height });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const frame = await openTraderDrawerFixture(page, fixture.origin, setup.language, setup.theme, ['MSFT', 'AAPL']);
    const calls = new Map<string, number>(); let failNews = false;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path = url.pathname;
      calls.set(path, (calls.get(path) || 0) + 1);
      const pathSymbol = path.split('/').filter(Boolean).at(-1) || '';
      const symbol = url.searchParams.get('symbol') || url.searchParams.get('symbols') || (path.includes('/sfm-market/v1/trader/') ? pathSymbol : '') || 'MSFT';
      let payload: Record<string, unknown> = { success: false, status: 'unavailable', items: [], data: [] };
      if (path === '/api/recommendations') payload = { status: 'available', recommendations: [{ symbol, name: 'Fixture company', price: 151.23, currentPrice: 151.23, currency: 'USD', available: true, source: 'THE SFM Market Data Engine' }] };
      if (path.endsWith('/asset-profile')) payload = { profile: { symbol, name: 'Fixture company', currency: 'USD' } };
      if (path === '/api/market-news') {
        if (failNews) return route.fulfill({ status: 429, json: { status: 'rate_limited', message: 'Fixture rate limit' } });
        payload = { status: 'available', items: [{ title: 'Fixture company announcement', url: 'https://example.org/fixture-news', source: 'Fixture provider', publishedAt: new Date().toISOString() }] };
      }
      if (path.includes('/calendar/earnings')) payload = { status: 'available', data: [{ symbol, companyName: 'Fixture earnings MSFT', reportDate: '2026-10-20', epsEstimate: 0 }] };
      if (path.includes('/calendar/dividends')) payload = { status: 'available', data: [] };
      if (path.includes('/sfm-market/v1/trader/technical/')) payload = { ok: true, success: true, feature: 'technical_analysis', available: true, technicalAvailable: true, symbol, indicators: { rsi: 48 }, dataQuality: 'partial', status: 'partial', source: 'THE SFM Market Data Engine' };
      if (path.includes('/sfm-market/v1/trader/signal/')) payload = { ok: true, success: true, status: 'empty', available: false, signal: null, item: null, source: 'THE SFM Market Data Engine' };
      if (path.includes('/sfm-market/v1/trader/history/')) payload = { ok: true, success: true, status: 'available', source: 'THE SFM Market Data Engine', points: [] };
      await route.fulfill({ status: 200, json: payload });
    });
    await frame.locator('[data-symbol-details="MSFT"]').first().click();
    const drawer = frame.locator('[data-symbol-drawer]');
    await expect(drawer.locator('.drawer-price')).toContainText('151.23');
    await expect(frame.locator('#drawer-panel-summary')).toHaveAttribute('aria-busy', 'false');
    await frame.locator('#drawer-tab-news').click();
    await expect(drawer).toContainText('Fixture company announcement');
    const newsCount = calls.get('/api/market-news');
    await frame.locator('#drawer-tab-earnings').click();
    await expect(drawer).toContainText('Fixture earnings MSFT');
    await expect(frame.locator('#drawer-panel-earnings')).toHaveAttribute('aria-busy', 'false');
    await frame.locator('#drawer-tab-technical').click();
    await expect(frame.locator('#drawer-panel-technical')).toHaveAttribute('aria-busy', 'false');
    expect(calls.get('/api/sfm-market/v1/trader/technical/MSFT')).toBe(1);
    expect(calls.get('/api/sfm-market/v1/trader/history/MSFT')).toBe(1);
    expect(calls.get('/api/sfm-market/v1/trader/signal/MSFT')).toBe(1);
    expect(calls.get('/api/market/technical-analysis')).toBeUndefined();
    await frame.locator('#drawer-tab-news').click();
    await expect(drawer).toContainText('Fixture company announcement');
    expect(calls.get('/api/market-news')).toBe(newsCount);
    failNews = true; await drawer.locator('[data-drawer-retry]').click();
    await expect(drawer.locator('.drawer-load-status')).toContainText(setup.language === 'ar' ? 'تعذر' : setup.language === 'fr' ? 'Certaines' : 'Some data');
    await expect(drawer).toContainText('Fixture company announcement');
    failNews = false; await drawer.locator('[data-drawer-retry]').click();
    await expect(frame.locator('#drawer-panel-news')).toHaveAttribute('aria-busy', 'false');
    const geometry = await drawer.evaluate(element => {
      const box = element.getBoundingClientRect(); const header = element.querySelector('.drawer-head')!.getBoundingClientRect();
      const content = element.querySelector('.drawer-panel')!.getBoundingClientRect(); const close = element.querySelector('.drawer-close')!.getBoundingClientRect();
      return { width: box.width, right: box.right, left: box.left, height: box.height, headerHeight: header.height, contentHeight: content.height, closeWidth: close.width, closeHeight: close.height, viewport: innerWidth, viewportHeight: innerHeight };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(-1); expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.headerHeight).toBeLessThan(125); expect(geometry.contentHeight).toBeGreaterThan(80);
    expect(geometry.closeWidth).toBeGreaterThanOrEqual(44); expect(geometry.closeHeight).toBeGreaterThanOrEqual(44);
    await frame.locator('#drawer-tab-ai').click();
    const analysis = drawer.locator('.analysis-terminal');
    await expect(analysis).toBeVisible();
    const analysisGeometry = await analysis.evaluate(element => {
      const box = element.getBoundingClientRect(); const hero = element.querySelector('.analysis-terminal-hero')!.getBoundingClientRect();
      const metrics = element.querySelector('.analysis-terminal-grid')!.getBoundingClientRect();
      return { width: box.width, contentWidth: element.scrollWidth, heroBottom: hero.bottom, metricsTop: metrics.top };
    });
    expect(analysisGeometry.contentWidth).toBeLessThanOrEqual(analysisGeometry.width + 1);
    expect(analysisGeometry.metricsTop).toBeGreaterThanOrEqual(analysisGeometry.heroBottom - 1);
    await drawer.locator('#drawer-more-toggle').click();
    await expect(drawer.locator('[data-drawer-share]')).toBeVisible();
    await info.attach('fixture-symbol-drawer', { body: await page.screenshot({ scale: 'css', path: info.outputPath('quick-analysis.png') }), contentType: 'image/png' });
    await drawer.locator('.drawer-close').click();
    await expect(drawer).toHaveCount(0);
    await expect(frame.locator('[data-symbol-details="MSFT"]').first()).toBeFocused();
    expect(errors).toEqual([]);
  });
}
