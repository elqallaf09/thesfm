import { expect, test, type Page, type Route } from '@playwright/test';
import { closeTvMenu, openAndroidTvPackage, openTvMenu } from './packageHarness';

const instant = '2026-11-20T09:00:00Z';
const instruments = Array.from({ length: 18 }, (_, index) => ({
  symbol: `ROT${String(index).padStart(2, '0')}`, name: `Rotation test company ${index}`,
  nameAr: `شركة اختبار التبديل ${index}`, currency: 'KWD', region: index < 12 ? 'KW' : 'US',
}));
type FixtureState = {
  directory: 'ready' | 'loading' | 'error';
  snapshot: 'prices' | 'empty' | 'cooling' | 'loading' | 'error';
  pendingDirectory: Route[];
  pendingSnapshots: Route[];
  directoryPages: number[];
};

async function open(page: Page, options: { reducedMotion?: boolean; snapshot?: FixtureState['snapshot'] } = {}) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(() => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    if (!localStorage.getItem('sfm-markets-tv-settings-v1')) {
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
        language: 'ar', theme: 'dark', displayMode: 'browse', scene: 'overview', ticker: true,
      }));
    }
  });
  const state: FixtureState = { directory: 'ready', snapshot: options.snapshot ?? 'prices', pendingDirectory: [], pendingSnapshots: [], directoryPages: [] };
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [
    { id: 'KW', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 12, status: 'directory' },
    { id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US markets', labelFr: 'Marchés américains', count: 6, status: 'directory' },
  ] } }));
  async function serveDirectory(route: Route) {
    const params = new URL(route.request().url()).searchParams;
    const batch = Number(params.get('page') || 0), size = Number(params.get('pageSize') || 6);
    const market = params.get('market'), query = params.get('q') || '';
    const matches = instruments.filter(item => (!market || item.region === market) && `${item.symbol} ${item.name} ${item.nameAr}`.includes(query));
    await route.fulfill({ json: { items: matches.slice(batch * size, (batch + 1) * size), total: matches.length, directoryTotal: instruments.length, page: batch, pageSize: size } });
  }
  await page.route('**/api/tv/instruments?*', async route => {
    state.directoryPages.push(Number(new URL(route.request().url()).searchParams.get('page') || 0));
    if (state.directory === 'loading') { state.pendingDirectory.push(route); return; }
    if (state.directory === 'error') { await route.fulfill({ status: 503, json: { error: 'Fixture directory unavailable' } }); return; }
    await serveDirectory(route);
  });
  async function serveSnapshot(route: Route) {
    const params = new URL(route.request().url()).searchParams;
    const symbols: string[] = JSON.parse(params.get('symbols') || '[]');
    const hasPrices = state.snapshot === 'prices';
    const retryAt = state.snapshot === 'cooling' ? '2026-11-20T09:10:00Z' : undefined;
    const quotes = instruments.filter(item => symbols.includes(item.symbol)).map((item, index) => ({
      ...item, price: hasPrices ? 1.234 + index : null, changePercent: hasPrices ? index % 2 ? -1.2 : 2.1 : null,
      source: hasPrices ? 'Browser rotation fixture' : null, observedAt: instant, receivedAt: instant,
      status: hasPrices ? 'delayed' : 'unavailable', delayType: hasPrices ? 'delayed' : 'unknown',
      exchange: item.region, country: item.region, changeBasis: 'session',
      ...(retryAt ? { retryAt, issue: 'rate_limited' } : {}),
    }));
    await route.fulfill({ json: { group: 'world', quotes, available: hasPrices ? quotes.length : 0, total: quotes.length, generatedAt: instant, retryAt } });
  }
  await page.route('**/api/tv/snapshot?*', async route => {
    if (state.snapshot === 'loading') { state.pendingSnapshots.push(route); return; }
    if (state.snapshot === 'error') { await route.fulfill({ status: 503, json: { error: 'Fixture prices unavailable' } }); return; }
    await serveSnapshot(route);
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: {} }));
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 3');
  await expect(page.locator('.tv-hall-table')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await activity(page);
  return { state, serveDirectory, serveSnapshot };
}

const playback = (page: Page) => page.locator('[data-tv-focus-key="stocks-playback"]');
const rotation = (page: Page) => page.locator('.tv-stock-rotation');
const next = (page: Page) => page.locator('[data-tv-focus-key="stocks-next"]');
async function activity(page: Page) {
  await next(page).focus();
  await page.keyboard.press('Shift');
}
async function expectPage(page: Page, current: number, total = 3) {
  await expect(page.locator('.tv-stock-pagination')).toContainText(`${current} / ${total}`);
  await expect(page.locator('.tv-hall-table')).toHaveAttribute('aria-busy', 'false');
}

test('priced stock groups count down, advance every twelve seconds and wrap to the first page', async ({ page }) => {
  await open(page);
  await expect(playback(page)).toHaveText('إيقاف التبديل');
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(rotation(page)).toHaveAttribute('data-running', 'true');
  await expect(page.locator('.tv-hall-identity').first()).toContainText('ROT00');
  await page.clock.runFor(1000);
  await expect(page.locator('.tv-stock-countdown')).toContainText('11');
  await page.clock.runFor(10_999);
  await expectPage(page, 1);
  await page.clock.runFor(1);
  await expectPage(page, 2);
  await expect(page.locator('.tv-hall-identity').first()).toContainText('ROT06');
  await page.clock.runFor(12_000);
  await expectPage(page, 3);
  await page.clock.runFor(12_000);
  await expectPage(page, 1);
  await expect(page.locator('.tv-hall-identity').first()).toContainText('ROT00');
});

test('stock playback survives reload and stays independent of ticker and retained Next focus', async ({ page }) => {
  await open(page);
  const ticker = page.locator('.tv-marquee-toggle');
  await ticker.click();
  await expect(ticker).toHaveAttribute('aria-pressed', 'true');
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await next(page).click();
  await expectPage(page, 2);
  await expect(next(page)).toBeFocused();
  await page.clock.runFor(10_000);
  await page.keyboard.press('Shift');
  await page.clock.runFor(11_999);
  await expectPage(page, 2);
  await page.clock.runFor(1);
  await expectPage(page, 3);
  await playback(page).click();
  await expect(playback(page)).toHaveText('تشغيل التبديل');
  await page.clock.runFor(24_000);
  await expectPage(page, 3);
  await page.reload(); await closeTvMenu(page);
  await expectPage(page, 1);
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(ticker).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', bubbles: true })));
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(ticker).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(12_000);
  await expectPage(page, 2);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', bubbles: true })));
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'false');
  await page.clock.runFor(24_000);
  await expectPage(page, 2);
});

test('search and market selection reset the page and hold rotation during browsing', async ({ page }) => {
  await open(page);
  await next(page).click(); await expectPage(page, 2);
  const search = page.getByRole('searchbox');
  await search.focus();
  await page.clock.runFor(24_000);
  await expectPage(page, 2);
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  await search.fill('ROT0'); await page.clock.runFor(301);
  await expectPage(page, 1, 2);
  await next(page).focus();
  await page.clock.runFor(24_000);
  await expectPage(page, 1, 2);
  await search.fill(''); await page.clock.runFor(301);
  await next(page).click(); await expectPage(page, 2);
  const market = page.locator('[data-tv-focus-key="stock-market"]');
  await market.selectOption('KW'); await market.focus();
  await expectPage(page, 1, 2);
  await page.clock.runFor(24_000);
  await expectPage(page, 1, 2);
  await activity(page);
  await page.clock.runFor(12_000);
  await expectPage(page, 2, 2);
  await expect(page.locator('.tv-hall-identity').first()).toContainText('ROT06');
  await search.fill('ROT11'); await page.clock.runFor(301);
  await expectPage(page, 1, 1);
  await next(page).focus(); await page.clock.runFor(24_000);
  await expect(page.locator('.tv-hall-row')).toHaveCount(1);
  await search.fill('missing company'); await page.clock.runFor(301);
  await expect(page.locator('.tv-hall-row')).toHaveCount(0);
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
});

test('menus, quote details and offline state suspend pages without losing play intent', async ({ page, context }) => {
  await open(page);
  await openTvMenu(page);
  await page.clock.runFor(24_000);
  await expectPage(page, 1);
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  await closeTvMenu(page);
  await page.locator('.tv-hall-identity button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.runFor(24_000);
  await expectPage(page, 1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await context.setOffline(true);
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  await page.clock.runFor(24_000);
  await expectPage(page, 1);
  await context.setOffline(false);
  await activity(page);
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(11_999); await expectPage(page, 1);
  await page.clock.runFor(1); await expectPage(page, 2);
});

test('reduced motion keeps stocks still until explicit Play and preserves that choice', async ({ page }) => {
  await open(page, { reducedMotion: true });
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(playback(page)).toHaveText('تشغيل التبديل');
  await page.clock.runFor(24_000); await expectPage(page, 1);
  await playback(page).click();
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(12_000); await expectPage(page, 2);
  await expect(page.locator('.tv-marquee-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await closeTvMenu(page);
  await expectPage(page, 1);
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
  await activity(page);
  await page.clock.runFor(12_000); await expectPage(page, 2);
});

test('pending directory or quotes and request errors never skip an unread page', async ({ page }) => {
  const fixture = await open(page);
  fixture.state.directory = 'loading';
  await next(page).click();
  await expect.poll(() => fixture.state.pendingDirectory.length).toBe(1);
  await expect(page.locator('.tv-hall-table')).toHaveAttribute('aria-busy', 'true');
  await page.clock.runFor(24_000);
  await expect(page.locator('.tv-stock-pagination')).toContainText('2 / 3');
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  fixture.state.directory = 'ready'; fixture.state.snapshot = 'loading';
  await fixture.serveDirectory(fixture.state.pendingDirectory.shift()!);
  await expect.poll(() => fixture.state.pendingSnapshots.length).toBe(1);
  await page.clock.runFor(24_000);
  await expect(page.locator('.tv-stock-pagination')).toContainText('2 / 3');
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  fixture.state.snapshot = 'prices';
  await fixture.serveSnapshot(fixture.state.pendingSnapshots.shift()!);
  await expectPage(page, 2);
  await page.clock.runFor(12_000); await expectPage(page, 3);
  for (const target of ['directory', 'snapshot'] as const) {
    fixture.state.directory = target === 'directory' ? 'error' : 'ready';
    fixture.state.snapshot = target === 'snapshot' ? 'error' : 'prices';
    await page.reload(); await closeTvMenu(page);
    await expect(page.locator('.tv-all-stocks .tv-hall-error')).toBeVisible();
    const requestCount = fixture.state.directoryPages.length;
    await page.clock.runFor(24_000);
    await expect(page.locator('.tv-stock-pagination')).toContainText('1 /');
    await expect(rotation(page)).toHaveAttribute('data-running', 'false');
    expect(fixture.state.directoryPages.slice(requestCount).every(batch => batch === 0)).toBe(true);
  }
});

test('missing prices advance after eight seconds while a cooling provider stays on the same page', async ({ page }) => {
  const fixture = await open(page, { snapshot: 'empty' });
  await expect(page.locator('.tv-hall-row')).toHaveCount(0);
  await page.clock.runFor(7_999); await expectPage(page, 1);
  await page.clock.runFor(1); await expectPage(page, 2);
  fixture.state.snapshot = 'cooling';
  await page.reload(); await closeTvMenu(page);
  await expectPage(page, 1);
  await expect(rotation(page)).toHaveAttribute('data-running', 'false');
  await page.clock.runFor(24_000);
  await expectPage(page, 1);
  await expect(playback(page)).toHaveAttribute('aria-pressed', 'true');
});
