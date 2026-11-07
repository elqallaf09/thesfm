import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TvLanguage, TvQuote, TvSnapshot } from '../../src/lib/markets-tv/types';

// Synthetic values exist only in this browser fixture, never in packaged assets.
const observedAt = '2026-11-02T21:00:00.000Z';
function snapshot(): TvSnapshot {
  const quote = (index: number): TvQuote => ({
    symbol: `QA${index}`, name: `Test instrument ${index}`, nameAr: `أداة الاختبار ${index}`,
    price: 338.32 + index, currency: 'USD', changePercent: -1.83,
    source: 'Verified test source', observedAt, receivedAt: observedAt,
    status: 'closed', exchange: 'NASDAQ', country: 'US', changeBasis: 'session',
  });
  return {
    group: 'global', scene: 'overview', generatedAt: new Date().toISOString(),
    available: 6, total: 6, selectionTotal: 10,
    summary: Array.from({ length: 4 }, (_, index) => index < 3 ? { ...quote(index),
      price: null, changePercent: null, source: null, observedAt: null, receivedAt: null,
      issue: 'rate_limited', status: 'unavailable', retryAt: new Date(Date.now() + 300_000).toISOString(),
    } : quote(index)),
    quotes: Array.from({ length: 6 }, (_, index) => quote(index + 4)),
  };
}

async function openTv(page: Page, language: TvLanguage, settings: Record<string, unknown> = {}) {
  await page.addInitScript(({ language, settings }) => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, scene: 'world', ...settings })), { language, settings });
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: snapshot() }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await expect(page.locator(settings.displayMode === 'browse' ? '.tv-quote-grid > button' : '.tv-scene-row')).toHaveCount(6);
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
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await containedContent(page, '.tv-scene-row');
      const bounds = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
        panelBottom: document.querySelector('.tv-scene-quotes')!.getBoundingClientRect().bottom,
        lastRowBottom: document.querySelector('.tv-scene-row:last-child')!.getBoundingClientRect().bottom,
        rowsBottom: document.querySelector('.tv-scene-rows')!.getBoundingClientRect().bottom,
        tickerTop: document.querySelector('.tv-scene-ticker')!.getBoundingClientRect().top,
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

test('remote reaches every clipped row and restores focus after quote details', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await openTv(page, 'ar');
  const rows = page.locator('.tv-scene-row');
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
  await expect(page.locator('.tv-scene-ticker')).toBeVisible();
});

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`packaged ${language} sessions fit the TV and preserve remote focus and local clocks`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-03T09:52:00Z') });
    await page.setViewportSize({ width: 960, height: 540 });
    await openTv(page, language);
    const opener = page.locator('.tv-viewing-footer button').first();
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(page.locator('.tv-session')).toHaveCount(5);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await containedContent(page, '.tv-session');
    }
    for (const [market, clock] of [['XKUW', '12:52'], ['XSAU', '12:52'], ['XNYS', '04:52'], ['XTKS', '18:52']]) {
      await expect(page.locator(`[data-market="${market}"] header time`)).toHaveText(clock);
    }
    // New York's clock follows daylight saving without claiming the exchange is open.
    await page.clock.setSystemTime(new Date('2026-07-01T09:52:00Z'));
    await page.clock.runFor(10_000);
    await expect(page.locator('[data-market="XNYS"] header time')).toHaveText('05:52');
    await page.setViewportSize({ width: 960, height: 540 });
    const kuwait = page.locator('[data-tv-focus-key="session:XKUW"]');
    const nyse = page.locator('[data-tv-focus-key="session:XNYS"]');
    await kuwait.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(nyse).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(nyse).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.tv-session-qr canvas')).toBeVisible();
    await expect(page.locator('.tv-session-qr canvas')).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await expect(nyse).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await expect(page.locator('.tv-scene-health')).not.toHaveAttribute('open', '');
    await page.locator('.tv-scene-health > summary').click();
    await expect(page.locator('.tv-scene-coverage-total')).toBeVisible();
    await expect(page.locator('.tv-scene-coverage-total')).toContainText('7 / 10');
  });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`packaged ${language} browse fits both card rows and reachable pagination`, async ({ page }) => {
    await openTv(page, language, { displayMode: 'browse', autoRotate: false });
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await containedContent(page, '.tv-quote-grid > button');
      const measurements = await page.evaluate(() => {
        const grid = document.querySelector('.tv-quote-grid')!, pager = document.querySelector('.tv-pagination')!;
        const cards = [...grid.children];
        return { gridBottom: grid.getBoundingClientRect().bottom, lastBottom: cards.at(-1)!.getBoundingClientRect().bottom,
          pagerBottom: pager.getBoundingClientRect().bottom, width: document.documentElement.scrollWidth };
      });
      expect(measurements.width).toBeLessThanOrEqual(width + 2);
      expect(measurements.pagerBottom).toBeLessThan(height);
      if (width >= 1280) expect(measurements.lastBottom).toBeLessThanOrEqual(measurements.gridBottom + 1);
      await expect(page.locator('.tv-pagination')).toBeInViewport({ ratio: 1 });
    }
    await page.locator('.tv-mode-viewing').click();
    await expect(page.locator('.tv-scene-row')).toHaveCount(6);
    await expect(page.locator('.tv-unified-brand img')).toHaveAttribute('alt', 'THE SFM');
    await page.locator('.tv-mode-strips').click();
    await expect(page.locator('.tv-strips-only')).toBeVisible();
    await expect(page.locator('.tv-unified-brand img')).toHaveAttribute('alt', 'THE SFM');
    await page.locator('.tv-mode-browse').click();
    await expect(page.locator('.tv-quote-grid > button')).toHaveCount(6);
  });
}

test('wall-clock ticks do not render the dashboard and quote freshness remains scheduled', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T09:59:58Z') });
  await page.addInitScript(() => {
    type Fiber = { memoizedProps?: Record<string, unknown>; memoizedState?: unknown; child?: Fiber; sibling?: Fiber; return?: Fiber };
    const scope = window as typeof window & { tvRootRenders: number; tvCommits: number; __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown };
    scope.tvRootRenders = 0; scope.tvCommits = 0;
    let previous: unknown;
    const find = (fiber?: Fiber): Fiber | undefined => {
      if (!fiber) return;
      if (fiber.memoizedProps && 'data-tv-root' in fiber.memoizedProps) return fiber.return;
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
  await page.clock.install({ time: new Date('2026-11-03T09:00:00Z') });
  await openTv(page, 'ar');
  const title = 'عنوان خبري طويل لاختبار ظهور النص كاملاً في العمود الجانبي وإمكانية فتح تفاصيله بالريموت دون إخفاء بقية الكلمات أو قص السطر الأخير من الخبر';
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [{ id: 'full', title, source: 'مصدر الاختبار', publishedAt: '2026-11-03T08:30:00Z', url: 'https://example.com/story' }] } }));
  await page.reload();
  await expect(page.locator('.tv-scene-headlines button > span')).toHaveText(title);
  expect(await page.locator('.tv-scene-headlines button > span').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await expect(page.locator('.tv-scene-row time').first()).toHaveText('00:00');
  await expect(page.locator('.tv-scene-ticker-evidence').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.tv-scene-ticker-evidence time').first()).toHaveAttribute('dir', 'ltr');
  await page.locator('[data-tv-focus-key="scene-heatmap"]').click();
  expect(await page.locator('.tv-scene-heatmap > button').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(55, 45, 53)');
  await page.locator('[data-tv-focus-key="settings"]').click();
  expect(await page.locator('.tv-modal-backdrop').evaluate(el => getComputedStyle(el).backdropFilter)).toBe('none');
});

test('pairing rejects malformed responses, times out, and accepts a valid activation', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T09:00:00Z') });
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
});

test('strips use index points, show compatible tick colors and keep unavailable instruments moving', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T09:00:00Z') });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', displayMode: 'strips', marketIds: ['US'], groups: ['us'], autoHideControls: false })));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US', labelFr: 'US', count: 24 }] } }));
  let price: number | null = 5961.2;
  let observed = '2026-11-03T09:00:00Z';
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { ...snapshot(), summary: undefined, directoryTotal: 24,
    quotes: [{ ...snapshot().quotes[0], symbol: '^GSPC', price, status: price ? 'available' : 'unavailable',
      source: price ? 'Verified source' : null, observedAt: price ? observed : null, issue: price ? undefined : 'rate_limited' }],
    retryAt: price ? undefined : '2026-11-03T09:05:00Z' } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  const strip = page.locator('[data-market="US"]');
  await expect(strip.locator('.tv-strip-price').first()).toContainText('5,961.20 نقطة');
  await expect(strip.locator('.tv-strip-evidence').first()).toHaveAttribute('dir', 'rtl');
  await expect(strip.locator('.tv-strip-evidence time').first()).toHaveText('12:00');
  await page.clock.runFor(2000);
  price = 5962.2; observed = '2026-11-03T09:00:02Z';
  await page.getByRole('button', { name: 'تحديث', exact: true }).click();
  await expect(strip.locator('.tv-market-strip-item').first()).toHaveAttribute('data-tick', 'up');
  await expect(strip.locator('.tv-market-strip-item').first()).toHaveCSS('background-color', 'rgb(30, 57, 58)');
  price = null;
  await page.reload();
  await expect(strip).toHaveAttribute('data-empty', 'true');
  await expect(strip.locator('.tv-market-strip-item')).toHaveCount(2);
  await expect(strip.locator('.tv-strip-price')).toHaveCount(0);
  await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'tv-scroll');
  await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-play-state', 'running');
  await expect(strip).toHaveAttribute('data-source-cooling', 'true');
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.tv-market-strips').boundingBox();
    expect(bounds!.height).toBeGreaterThan(viewport.height * .85);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
  }
});
