import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

// Synthetic browser-only identities verify venue isolation and page boundaries.
const listings = Array.from({ length: 15 }, (_, index) => {
  const region = index % 2 ? 'TD_XSWX' : 'TD_XAMS';
  const symbol = index < 2 ? 'QA' : `QA${index}`;
  return { symbol, region, listingKey: `${region}:${symbol}`, name: `Directory company ${index}`,
    nameAr: `شركة الدليل ${index}`, currency: index % 2 ? 'CHF' : 'EUR' };
});
const fallback = listings.slice(0, 3);
async function fixture(page: Page, theme: 'dark' | 'light', pending = false) {
  const requests: string[][] = [];
  let ready = !pending, directoryReads = 0;
  await page.addInitScript(theme => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ displayMode: 'browse', language: 'ar', theme, ticker: false })), theme);
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [
    { id: 'europe', group: 'europe', labelAr: 'أوروبا', labelEn: 'Europe', labelFr: 'Europe', count: 15, status: 'directory' },
    { id: 'TD_XAMS', group: 'europe', labelAr: 'أمستردام', labelEn: 'Amsterdam', labelFr: 'Amsterdam', count: 8, status: 'directory' },
    { id: 'TD_XSWX', group: 'europe', labelAr: 'سويسرا', labelEn: 'Switzerland', labelFr: 'Suisse', count: 7, status: 'directory' },
  ] } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/instruments?*', route => {
    directoryReads++;
    const params = new URL(route.request().url()).searchParams;
    const market = params.get('market'), batch = Number(params.get('page')), size = Number(params.get('pageSize'));
    const source = ready ? listings : fallback;
    const selected = source.filter(item => !market || market === 'europe' || item.region === market);
    return route.fulfill({ json: { items: selected.slice(batch * size, (batch + 1) * size), total: selected.length,
      directoryTotal: selected.length, page: batch, pageSize: size, coverage: ready ? 'directory' : 'selected',
      ...(!ready ? { retryAfterMs: 5000 } : {}) } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const keys: string[] = JSON.parse(params.get('listingKeys') || '[]');
    if (keys.length) requests.push(keys);
    const selected = listings.filter(item => keys.includes(item.listingKey));
    const quotes = selected.map(item => ({ ...item, exchange: item.region, country: null,
      price: item.symbol === 'QA2' ? null : item.region === 'TD_XAMS' ? 111 : 222,
      changePercent: 1.2, source: 'QA browser source', observedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
      status: item.symbol === 'QA2' ? 'unavailable' : 'delayed', delayType: 'delayed',
      ...(item.symbol === 'QA2' ? { issue: 'provider_unavailable' } : {}) }));
    return route.fulfill({ json: { group: 'world', quotes, total: quotes.length, available: quotes.filter(row => row.price !== null).length, generatedAt: new Date().toISOString() } });
  });
  await openAndroidTvPackage(page);
  return { requests, complete: () => { ready = true; }, reads: () => directoryReads };
}

for (const theme of ['light', 'dark'] as const) {
  test(`European pages preserve listing identity and unavailable rows in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const context = await fixture(page, theme);
    await page.locator('[data-tv-focus-key="stock-market"]').selectOption('europe');
    const rows = page.locator('.tv-hall-row');
    await expect(rows).toHaveCount(6);
    await expect(rows.nth(0)).toContainText('111.00');
    await expect(rows.nth(1)).toContainText('222.00');
    await expect(rows.nth(0)).toContainText('EUR');
    await expect(rows.nth(1)).toContainText('CHF');
    await expect(rows.nth(2)).toContainText('QA2');
    await expect(rows.nth(2).locator('.tv-hall-price strong')).toHaveText('—');
    await expect(page.locator('.tv-stock-coverage > span:first-child bdi')).toHaveText('5 / 6');
    await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 3');
    expect(context.requests.some(keys => JSON.stringify(keys) === JSON.stringify(listings.slice(0, 6).map(item => item.listingKey)))).toBe(true);
    const next = page.locator('[data-tv-focus-key="stocks-next"]');
    await next.focus(); await page.keyboard.press('Enter');
    await expect(rows.first()).toContainText('QA6');
    await expect(page.locator('.tv-stock-pagination')).toContainText('2 / 3');
    await expect.poll(() => context.requests.at(-1)).toEqual(listings.slice(6, 12).map(item => item.listingKey));
    await next.click();
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText('QA12');
    await expect.poll(() => context.requests.at(-1)).toEqual(listings.slice(12).map(item => item.listingKey));
    await expect(next).toBeDisabled();
    await page.locator('[data-tv-focus-key="stock-market"]').selectOption('TD_XSWX');
    await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 2');
    await expect(rows).toHaveCount(6);
    await expect.poll(() => context.requests.at(-1)?.every(key => key.startsWith('TD_XSWX:'))).toBe(true);
    expect(context.requests.every(keys => keys.length <= 6)).toBe(true);
  });
}

test('European stock rotation preserves company identity, movement and page-only quote requests', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.clock.install({ time: new Date('2026-11-20T10:00:00Z') });
  const context = await fixture(page, 'dark');
  await page.locator('[data-tv-focus-key="stock-market"]').selectOption('europe');
  const rows = page.locator('.tv-hall-row');
  await expect(rows).toHaveCount(6);
  await expect(page.locator('.tv-stock-rotation')).toHaveAttribute('data-running', 'true');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await page.locator('[data-tv-focus-key="stocks-next"]').focus();
  await page.keyboard.press('Shift');
  await expect(page.locator('.tv-stock-countdown')).toContainText('12');
  await page.clock.runFor(12_000);
  await expect(page.locator('.tv-stock-pagination')).toContainText('2 / 3');
  await expect(rows.locator('.tv-asset-icon')).toHaveCount(6);
  await expect(rows.first()).toContainText('QA6');
  await expect(rows.first()).toContainText('111.00');
  await expect(rows.nth(1)).toContainText('222.00');
  await expect(rows.first().locator('.tv-hall-change')).toHaveAttribute('data-trend', 'up');
  await expect(rows.first().locator('.tv-hall-change-label')).toHaveText('صاعد');
  await expect(page.locator('.tv-stock-coverage > span:first-child bdi')).toHaveText('6 / 6');
  await expect.poll(() => context.requests.at(-1)).toEqual(listings.slice(6, 12).map(item => item.listingKey));
  expect(context.requests.every(keys => keys.length <= 6)).toBe(true);
});

test('selected coverage recovers automatically when the directory completes', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  const context = await fixture(page, 'light', true);
  await page.locator('[data-tv-focus-key="stock-market"]').selectOption('europe');
  await expect(page.getByText('قائمة مختارة — التغطية غير مكتملة')).toBeVisible();
  await expect(page.locator('.tv-hall-title h1')).toContainText('مختارات الأسواق');
  await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 1');
  await expect(page.locator('.tv-directory-coverage')).toBeInViewport({ ratio: 1 });
  const reads = context.reads();
  context.complete();
  await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 5', { timeout: 15000 });
  expect(context.reads()).toBeGreaterThan(reads);
  await expect(page.getByText('قائمة مختارة — التغطية غير مكتملة')).toHaveCount(0);
  await expect(page.locator('.tv-hall-title h1')).toContainText('كل الأسهم');
  await expect(page.locator('.tv-hall-row')).toHaveCount(3);
});
