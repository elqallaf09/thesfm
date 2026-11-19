import { openTvMenu, closeTvMenu, openTvHeaderActions, closeTvHeaderActions, chooseTvDestination } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TvLanguage, TvQuote, TvSnapshot } from '../../src/lib/markets-tv/types';

// Synthetic values exist only in this browser fixture, never in packaged assets.
// Pin both observations and the browser clock; wall-clock dates must not age fixtures.
const fixtureNow = '2026-11-03T09:00:00.000Z';
const observedAt = '2026-11-02T21:00:00.000Z';

test.beforeEach(async ({ page }) => {
  // Install once before navigation; individual timing tests can move this clock.
  await page.clock.install({ time: new Date(fixtureNow) });
});

function snapshot(asOf = Date.parse(fixtureNow)): TvSnapshot {
  const quote = (index: number): TvQuote => ({
    symbol: `QA${index}`, name: `Test instrument ${index}`, nameAr: `أداة الاختبار ${index}`,
    price: 338.32 + index, currency: 'USD', changePercent: -1.83,
    source: 'Verified test source', observedAt, receivedAt: observedAt,
    status: 'closed', exchange: 'NASDAQ', country: 'US', changeBasis: 'session',
  });
  return {
    group: 'global', scene: 'overview', generatedAt: new Date(asOf).toISOString(),
    available: 6, total: 6, selectionTotal: 10,
    summary: Array.from({ length: 4 }, (_, index) => index < 3 ? { ...quote(index),
      price: null, changePercent: null, source: null, observedAt: null, receivedAt: null,
      issue: 'rate_limited', status: 'unavailable', retryAt: new Date(asOf + 300_000).toISOString(),
    } : quote(index)),
    quotes: Array.from({ length: 6 }, (_, index) => quote(index + 4)),
  };
}

async function openTv(page: Page, language: TvLanguage, settings: Record<string, unknown> = {}) {
  const asOf = await page.evaluate(() => Date.now());
  await page.addInitScript(({ language, settings }) => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, scene: 'world', sessionIds: ['XKUW','XSAU','XLON','XNYS','XTKS'], ...settings })), { language, settings });
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: snapshot(asOf) }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/instruments?*', route => { const params = new URL(route.request().url()).searchParams; const size = Number(params.get('pageSize') || 50); const items = snapshot(asOf).quotes; return route.fulfill({ json: { items: items.slice(0, size), total: items.length, directoryTotal: items.length, page: 0, pageSize: size } }); });
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);await closeTvMenu(page);
  await expect(page.locator(settings.displayMode === 'browse' ? '.tv-hall-row' : '.tv-scene-row')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
}

async function containedContent(page: Page, selector: string) {
  const overflow = await page.locator(selector).evaluateAll(items => items.flatMap(item => {
    const bounds = item.getBoundingClientRect();
    return Array.from(item.children).filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1;
    }).map(child => child.className);
  }));
  expect(overflow).toEqual([]);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`packaged ${language} prices remain readable from 540p through 4K`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openTv(page, language);
    const viewLabels = language === 'ar' ? ['الأسعار', 'خريطة التغيّر']
      : language === 'fr' ? ['Cours', 'Carte des variations'] : ['Quotes', 'Change map'];
    await expect(page.locator('[data-tv-focus-key="scene-list"]')).toHaveText(viewLabels[0]);
    await expect(page.locator('[data-tv-focus-key="scene-heatmap"]')).toHaveText(viewLabels[1]);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await containedContent(page, '.tv-scene-row');
      const bounds = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
        panelBottom: document.querySelector('.tv-scene-quotes')!.getBoundingClientRect().bottom,
        lastRowBottom: document.querySelector('.tv-scene-row:last-child')!.getBoundingClientRect().bottom,
        rowsBottom: document.querySelector('.tv-scene-rows')!.getBoundingClientRect().bottom,
        tickerTop: document.querySelector('.tv-quote-marquee')!.getBoundingClientRect().top,
      }));
      expect(bounds.width).toBeLessThanOrEqual(width + 2);
      expect(bounds.height).toBeLessThanOrEqual(height + 2);
      expect(bounds.panelBottom).toBeLessThan(bounds.tickerTop);
      if (width >= 1280) expect(bounds.lastRowBottom).toBeLessThanOrEqual(bounds.rowsBottom + 1);
      const captionSizes = await page.locator('.tv-scene-row small, .tv-scene-row time, .tv-scene-source')
        .evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).fontSize)));
      expect(Math.min(...captionSizes)).toBeGreaterThanOrEqual(12);
    }
    await page.setViewportSize({ width: 960, height: 540 });
    await page.locator('[data-tv-focus-key="scene-heatmap"]').click();
    await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(6);
    await containedContent(page, '.tv-scene-heatmap > button');
    expect(errors).toEqual([]);
  });
}

test('heatmap excludes stale closed quotes without dropping the saved quote list', async ({ page }) => {
  await openTv(page, 'en', { autoRotate: false });
  const heatmap = page.locator('[data-tv-focus-key="scene-heatmap"]');
  await heatmap.click();
  await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(6);
  await page.clock.setSystemTime(new Date('2026-11-11T09:00:00Z'));
  await page.reload();await closeTvMenu(page);
  await heatmap.click();
  await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(0);
  await expect(page.locator('.tv-scene-no-data')).toContainText('Not enough verified changes for the map');
  await expect(page.locator('.tv-scene-table')).toHaveCount(0);
  await expect(page.locator('.tv-scene-row')).toHaveCount(0);
  await page.locator('[data-tv-focus-key="scene-show-quotes"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  await expect(page.locator('[data-tv-focus-key="scene-list"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tv-scene-row').first()).toContainText('342.32');
  await expect(page.locator('.tv-scene-row time').first()).toHaveAttribute('datetime', observedAt);
  await expect(page.locator('.tv-scene-row time').last()).toHaveAttribute('datetime', observedAt);
});

for (const { language, theme, showQuotes } of [
  { language: 'ar', theme: 'dark', showQuotes: 'عرض الأسعار' },
  { language: 'en', theme: 'light', showQuotes: 'View quotes' },
  { language: 'fr', theme: 'light', showQuotes: 'Voir les cours' },
] as const) {
  test(`same-day retained midnight quotes stay dated in ${language}/${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openTv(page, language, { theme, autoRotate: false });
    const retained = snapshot();
    retained.quotes = retained.quotes.map(quote => ({ ...quote, status: 'stale', issue: 'timeout' }));
    await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: retained }));
    await page.reload();
    await closeTvMenu(page);
    const rows = page.locator('.tv-scene-row');
    await expect(rows).toHaveCount(6);
    // Midnight is a real Kuwait time. Its date makes the retained observation
    // explicit even though the quote and viewer are on the same local day.
    await expect(rows.first().locator('time')).toHaveText('2026-11-03 · 00:00');
    await expect(rows.first().locator('time')).toHaveAttribute('datetime', observedAt);
    await expect(rows.first().locator('.tv-status')).toHaveAttribute('data-status', 'stale');
    await containedContent(page, '.tv-scene-row');
    await page.locator('[data-tv-focus-key="scene-heatmap"]').click();
    await expect(page.locator('.tv-scene-no-data')).toBeVisible();
    await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(0);
    await expect(rows).toHaveCount(0);
    const returnToQuotes = page.locator('[data-tv-focus-key="scene-show-quotes"]');
    await expect(returnToQuotes).toHaveText(showQuotes);
    await returnToQuotes.focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toContainText('342.32');
    await expect(rows.first()).toContainText('Verified test source');
    await expect(rows.first().locator('time')).toHaveText('2026-11-03 · 00:00');
    await expect(rows.last().locator('time')).toHaveAttribute('datetime', observedAt);
  });
}

test('remote reaches every clipped row and restores focus after quote details', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await openTv(page, 'ar');
  const rows = page.locator('.tv-scene-row');
  // The side menu frees enough height for this six-row fixture. Constrain its
  // panel to three rows so this test still exercises remote scroll recovery.
  await rows.first().evaluate(row => {
    row.parentElement!.style.maxHeight = `${Math.floor(row.getBoundingClientRect().height * 3)}px`;
  });
  await expect.poll(() => page.locator('.tv-scene-rows').evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await rows.first().focus();
  for (let index = 0; index < 6; index++) {
    if (index) await page.keyboard.press('ArrowDown');
    await expect(rows.nth(index)).toBeFocused();
    const visible = await rows.nth(index).evaluate(row => {
      const bounds = row.getBoundingClientRect(), viewport = row.parentElement!.getBoundingClientRect();
      return bounds.top >= viewport.top - 1 && bounds.bottom <= viewport.bottom + 1;
    });
    expect(visible).toBe(true);
  }
  expect(await page.locator('.tv-scene-rows').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rows.last()).toBeFocused();
  await expect(rows.last().locator('time')).toHaveAttribute('datetime', observedAt);
  await expect(page.locator('.tv-scene-coverage-total')).toContainText('7 / 10');
  await expect(page.locator('.tv-data-notice time')).toBeAttached();
  await expect(page.locator('.tv-quote-marquee')).toBeVisible();
});

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`packaged ${language} sessions fit the TV and preserve remote focus and local clocks`, async ({ page }) => {
    await page.clock.setSystemTime(new Date('2026-11-03T09:52:00Z'));
    await page.setViewportSize({ width: 960, height: 540 });
    await openTv(page, language);
    await chooseTvDestination(page, 'sessions');
    const sessions = page.locator('.tv-world-sessions');
    await expect(page.locator('.tv-session')).toHaveCount(5);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(()=>sessions.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await containedContent(page, '.tv-session');
    }
    for (const [market, clock] of [['XKUW', '12:52'], ['XSAU', '12:52'], ['XNYS', '04:52'], ['XTKS', '18:52']]) {
      await expect(page.locator(`[data-market="${market}"] .tv-world-local time`)).toHaveText(clock);
    }
    // New York's clock follows daylight saving without claiming the exchange is open.
    await page.clock.setSystemTime(new Date('2026-07-01T09:52:00Z'));
    await page.clock.runFor(10_000);
    await expect(page.locator('[data-market="XNYS"] .tv-world-local time')).toHaveText('05:52');
    await page.setViewportSize({ width: 960, height: 540 });
    await expect(page.locator('.tv-session')).toHaveCount(5);
    await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 1');
    const london = page.locator('[data-tv-focus-key="session:XLON"]');
    const nyse = page.locator('[data-tv-focus-key="session:XNYS"]');
    await london.focus();
    await page.keyboard.press(language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    await expect(nyse).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tv-focus-key=session-source-back]')).toBeFocused();
    await expect(page.locator('.tv-session-qr canvas')).toBeVisible();
    await expect(page.locator('.tv-session-qr canvas')).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await expect(nyse).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.tv-side-menu')).toBeVisible();
    await chooseTvDestination(page, 'world');
    await expect(page.locator('.tv-scene-health')).not.toHaveAttribute('open', '');
    await page.locator('.tv-scene-health > summary').click();
    await expect(page.locator('.tv-scene-coverage-total')).toBeVisible();
    await expect(page.locator('.tv-scene-coverage-total')).toContainText('7 / 10');
  });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`packaged ${language} browse fits directory rows and reachable pagination`, async ({ page }) => {
    await openTv(page, language, { displayMode: 'browse', autoRotate: false });
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator('.tv-hall-row')).toHaveCount(height <= 650 ? 3 : 6);
      await containedContent(page, '.tv-hall-row');
      const measurements = await page.evaluate(() => {
        const grid = document.querySelector('.tv-hall-rows')!, pager = document.querySelector('.tv-stock-pagination')!;
        const cards = [...grid.children];
        return { gridBottom: grid.getBoundingClientRect().bottom, lastBottom: cards.at(-1)!.getBoundingClientRect().bottom,
          pagerBottom: pager.getBoundingClientRect().bottom, width: document.documentElement.scrollWidth };
      });
      expect(measurements.width).toBeLessThanOrEqual(width + 2);
      expect(measurements.pagerBottom).toBeLessThan(height);
      if (width >= 1280) expect(measurements.lastBottom).toBeLessThanOrEqual(measurements.gridBottom + 1);
      await expect(page.locator('.tv-stock-pagination')).toBeInViewport({ ratio: 1 });
    }
    await chooseTvDestination(page, 'hall');
    await expect(page.locator('.tv-hall-row')).toHaveCount(6);
    await expect(page.locator('.tv-unified-brand img')).toHaveAttribute('alt', 'THE SFM');
    await chooseTvDestination(page, 'strips');
    await expect(page.locator('.tv-strips-only')).toBeVisible();
    await expect(page.locator('.tv-unified-brand img')).toHaveAttribute('alt', 'THE SFM');
    await chooseTvDestination(page, 'allStocks');
    await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  });
}

test('wall-clock ticks do not render the dashboard and quote freshness remains scheduled', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-11-03T09:59:58Z'));
  await page.addInitScript(() => {
    type Fiber = { type?: unknown; memoizedProps?: Record<string, unknown>; memoizedState?: unknown; child?: Fiber; sibling?: Fiber; return?: Fiber };
    const scope = window as typeof window & { tvRootRenders: number; tvCommits: number; __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown };
    scope.tvRootRenders = 0; scope.tvCommits = 0;
    let previous: unknown;
    const find = (fiber?: Fiber): Fiber | undefined => {
      if (!fiber) return;
      if (fiber.memoizedProps && 'data-tv-root' in fiber.memoizedProps) {
        // Context providers can sit between the host root and its function owner.
        let owner = fiber.return;
        while (owner && typeof owner.type !== 'function') owner = owner.return;
        return owner;
      }
      return find(fiber.child) || find(fiber.sibling);
    };
    scope.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => 1, onCommitFiberUnmount: () => {},
      onCommitFiberRoot: (_id: number, root: { current: Fiber }) => {
        scope.tvCommits++;
        const state = find(root.current)?.memoizedState;
        if (state && state !== previous) { scope.tvRootRenders++; previous = state; }
      } };
  });
  await openTv(page, 'ar', { autoHideControls: false, autoRotate: false, ticker: false });
  const counts = () => page.evaluate(() => {
    const scope = window as typeof window & { tvRootRenders: number; tvCommits: number };
    return { renders: scope.tvRootRenders, commits: scope.tvCommits };
  });
  await page.clock.runFor(100);
  const before = await counts();
  expect(before.renders).toBeGreaterThan(0);
  await page.clock.runFor(3100);
  await expect(page.locator('.tv-unified-clock strong')).toHaveText('13:00');
  const after = await counts();
  expect(after.commits).toBeGreaterThan(before.commits);
  expect(after.renders).toBe(before.renders);
  await page.clock.runFor(15000);
  expect((await counts()).renders).toBeGreaterThan(after.renders);
});

test('full Arabic news, isolated quote evidence and legacy-compatible colors', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-11-03T09:00:00Z'));
  await openTv(page, 'ar');
  const title = 'عنوان خبري طويل لاختبار ظهور النص كاملاً في العمود الجانبي وإمكانية فتح تفاصيله بالريموت دون إخفاء بقية الكلمات أو قص السطر الأخير من الخبر';
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [{ id: 'full', title, source: 'مصدر الاختبار', publishedAt: '2026-11-03T08:30:00Z', url: 'https://example.com/story' }] } }));
  await page.reload();await closeTvMenu(page);
  await expect(page.locator('.tv-scene-headlines .tv-news-title')).toHaveText(title);
  expect(await page.locator('.tv-scene-headlines .tv-news-title').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await expect(page.locator('.tv-scene-row time').first()).toHaveText('00:00');
  await expect(page.locator('.tv-quote-marquee .tv-quote-evidence').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.tv-quote-marquee .tv-quote-evidence time').first()).toHaveAttribute('dir', 'ltr');
  await page.locator('[data-tv-focus-key="scene-heatmap"]').click();
  expect(await page.locator('.tv-scene-heatmap > button').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(244, 221, 224)');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key="settings"]').click();
  expect(await page.locator('.tv-modal-backdrop').evaluate(el => getComputedStyle(el).backdropFilter)).toBe('none');
});

test('pairing rejects malformed responses, times out, and accepts a valid activation', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-11-03T09:00:00Z'));
  await openTv(page, 'en');
  let state: 'invalid' | 'timeout' | 'valid' = 'invalid';
  await page.route('**/api/tv/pair', route => {
    if (state === 'timeout') return;
    if (state === 'invalid') return route.fulfill({ json: { code: 123456789012, secret: 'a'.repeat(64), expiresAt: '2026-11-03T09:10:00Z' } });
    return route.fulfill({ json: route.request().method() === 'POST'
      ? { code: 'ABCDEF123456', secret: 'a'.repeat(64), expiresAt: '2026-11-03T09:10:00Z' }
      : { state: 'active', token: 'b'.repeat(64) } });
  });
  await page.route('**/api/tv/device', route => route.fulfill({ json: { device: { name: 'Test TV', settings: { language: 'en' } }, symbols: ['QA4'], alerts: [] } }));
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key="pair"]').click();
  const create = page.locator('.tv-pair-content button');
  await create.click();
  await expect(page.locator('.tv-pair-code')).toHaveCount(0);
  await expect(create).toBeEnabled();
  state = 'timeout';
  await create.click();
  await expect(create).toBeDisabled();
  await page.clock.runFor(16000);
  await expect(create).toBeEnabled();
  state = 'valid';
  await create.click();
  await expect(page.locator('.tv-pair-code')).toHaveText('ABCD — EF12 — 3456');
  await page.clock.runFor(5100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe('b'.repeat(64));
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
});

test('strips use index points and hide unpriced instruments until the provider recovers', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-11-03T09:00:00Z'));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', displayMode: 'strips', marketIds: ['US'], groups: ['us'], autoHideControls: false })));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US', labelFr: 'US', count: 24 }] } }));
  let price: number | null = 5961.2;
  let observed = '2026-11-03T09:00:00Z';
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { ...snapshot(), summary: undefined, directoryTotal: 24,
    quotes: [{ ...snapshot().quotes[0], symbol: '^GSPC', price, status: price ? 'available' : 'unavailable',
      source: price ? 'Verified source' : null, observedAt: price ? observed : null, issue: price ? undefined : 'rate_limited' }],
    retryAt: price ? undefined : '2026-11-03T09:05:00Z' } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);await closeTvMenu(page);
  const strip = page.locator('[data-market="US"]');
  await expect(strip.locator('.tv-strip-price').first()).toContainText('5,961.20 نقطة');
  await expect(strip.locator('.tv-strip-evidence').first()).toHaveAttribute('dir', 'rtl');
  await expect(strip.locator('.tv-strip-evidence time').first()).toHaveText('12:00');
  await page.clock.runFor(2000);
  price = 5962.2; observed = '2026-11-03T09:00:02Z';
  await openTvHeaderActions(page);
  await page.locator('[data-tv-focus-key=refresh]').click();
  await closeTvHeaderActions(page);
  await expect(strip.locator('.tv-market-strip-item').first()).toHaveAttribute('data-tick', 'up');
  await expect(strip.locator('.tv-market-strip-item').first()).toHaveCSS('background-color', 'rgb(216, 238, 231)');
  price = null;
  await page.reload();await closeTvMenu(page);
  await expect(strip).toHaveAttribute('data-empty', 'true');
  await expect(strip.locator('.tv-market-strip-item')).toHaveCount(0);
  await expect(strip.locator('.tv-strip-price')).toHaveCount(0);
  await expect(strip.locator('.tv-market-strip-track')).toHaveCount(0);
  await expect(strip).toHaveAttribute('data-source-cooling', 'true');
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.tv-market-strips').boundingBox();
    expect(bounds!.height).toBeGreaterThan(viewport.height * .5);
    const header = await page.locator('.tv-unified-header').boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
  }
  price = 5962.2;
  await page.clock.fastForward(301_000);
  await expect(strip.locator('.tv-market-strip-item')).toHaveCount(1);
  await expect(strip.locator('.tv-market-strip-track')).toHaveAttribute('data-marquee', 'false');
  await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'none');
});
