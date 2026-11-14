import { expect, test, type Page, type Route } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

// Browser-only fixtures. Product data always comes from the configured providers.
const instant = '2026-11-14T10:00:00Z';
const token = 'a'.repeat(64);
const items = Array.from({ length: 18 }, (_, index) => ({
  symbol: `QA${index}`, displaySymbol: `QA${index}`, name: `Market company ${index}`,
  nameAr: `شركة الأسواق ${index}`, currency: 'KWD', region: 'BOURSA_KUWAIT',
}));
const markets = [
  { id: 'global', group: 'global', labelAr: 'المؤشرات العالمية', labelEn: 'Global indices', labelFr: 'Indices mondiaux', count: 6, status: 'selected' },
  { id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait', labelFr: 'Bourse du Koweït', count: 18, status: 'directory' },
  { id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'United States', labelFr: 'États-Unis', count: 18, status: 'directory' },
];
const stories = Array.from({ length: 18 }, (_, index) => ({
  id: `news-${index}`, title: `الأسواق العالمية تتابع نتائج الشركات وتطورات الاقتصاد والسيولة في جلسة التداول ${index + 1}`,
  source: 'QA market newsroom', publishedAt: instant, url: `https://example.com/news/${index}`,
}));
const price = (item: typeof items[number], index: number) => ({ ...item,
  price: 1.234 + index, changePercent: index % 2 ? -1.2 : 2.1, source: 'QA market source',
  observedAt: instant, receivedAt: instant, status: 'delayed', delayType: 'delayed',
  exchange: item.region, country: 'KW', changeBasis: 'session',
});

async function fixture(page: Page, theme: 'light' | 'dark', linked = true, language = 'ar', options: { marketList?: typeof markets; watchlistSize?: number } = {}) {
  const marketList = options.marketList || markets;
  const settings = { language, theme, accent: 'green', scene: 'overview', displayMode: 'viewing',
    autoRotate: false, sessionAutoRotate: false, marketIds: marketList.map(market => market.id), groups: ['global', 'gulf', 'us'],
  };
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ settings, token, linked }) => {
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify(settings));
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    if (linked) localStorage.setItem('sfm-markets-tv-device-v1', token);
  }, { settings, token, linked });
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { markets: marketList } });
    if (url.pathname.endsWith('/device')) return route.fulfill({ json: {
      device: { id: 'qa-device', name: 'QA TV', expiresAt: '2099-01-01T00:00:00Z', settings },
      symbols: items.slice(0, options.watchlistSize ?? 6).map(item => item.symbol), alerts: [],
    } });
    if (url.pathname.endsWith('/instruments')) {
      const size = Number(url.searchParams.get('pageSize') || 6), current = Number(url.searchParams.get('page') || 0);
      const query = url.searchParams.get('q') || '';
      const matched = items.filter(item => `${item.symbol} ${item.name}`.includes(query));
      return route.fulfill({ json: { items: matched.slice(current * size, (current + 1) * size), total: matched.length, directoryTotal: items.length, page: current, pageSize: size } });
    }
    if (url.pathname.endsWith('/snapshot')) {
      const symbols: string[] = JSON.parse(url.searchParams.get('symbols') || '[]');
      const size = Number(url.searchParams.get('pageSize') || 6), current = Number(url.searchParams.get('page') || 0);
      const watchlist = url.searchParams.get('scene') === 'watchlist';
      const selected = watchlist && options.watchlistSize !== undefined ? items.slice(0, options.watchlistSize)
        : symbols.length ? items.filter(item => symbols.includes(item.symbol)) : items.slice(current * size, (current + 1) * size);
      const quotes = selected.map(price);
      return route.fulfill({ json: { group: url.searchParams.get('group'), scene: url.searchParams.get('scene'), quotes,
        ...(url.searchParams.has('scene') ? { summary: (watchlist ? selected.slice(0, 4) : items.slice(0, 4)).map(price) } : {}),
        available: quotes.length, total: quotes.length, directoryTotal: items.length, generatedAt: instant,
      } });
    }
    if (url.pathname.endsWith('/history')) return route.fulfill({ json: { points: [] } });
    if (url.pathname.endsWith('/portfolio')) {
      const positions = items.slice(0, 8).map((item, index) => ({ id: `record-${index}`, name: item.nameAr, symbol: item.symbol,
        assetClass: 'stocks', quantity: 10, value: { amount: 1000 + index, currency: 'KWD' }, baseValue: 1000 + index,
        baseCost: 900, platform: 'THE SFM', source: 'QA recorded value', valuedAt: instant, freshness: 'recorded',
      }));
      return route.fulfill({ json: { currency: 'KWD', generatedAt: instant, total: positions.length, positions,
        totalValue: 8028, totalCost: 7200, valueCoverage: 8, costCoverage: 8,
        allocation: [{ assetClass: 'stocks', amount: 8028, count: 8 }],
      } });
    }
    if (url.pathname.includes('news')) return route.fulfill({ json: {
      stories, items: stories, channel: url.searchParams.get('channel'), topic: url.searchParams.get('topic'),
      success: true, generatedAt: instant, lastSuccessfulUpdate: instant,
    } });
    return route.fulfill({ json: { result: null } });
  });
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-hall-row')).toHaveCount((page.viewportSize()?.height || 1080) <= 650 ? 3 : 6);
  await page.evaluate(() => document.fonts.ready);
}

async function fits(page: Page, view: string, selector: string) {
  await expect(page.locator(selector).first(), `${view} renders`).toBeVisible();
  await expect.poll(() => page.locator(selector).evaluateAll(elements => elements.flatMap(element => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return [];
    return box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1
      ? [{ element: element.className, x: box.x, y: box.y, width: box.width, height: box.height }] : [];
  })), `${view} stays inside the viewport`).toEqual([]);
  expect.soft(await page.evaluate(() => ({
    horizontal: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    vertical: Math.max(0, document.documentElement.scrollHeight - innerHeight),
  })), `${view} does not move content below the TV viewport`).toEqual({ horizontal: 0, vertical: 0 });
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'rtl');
}

for (const theme of ['light', 'dark'] as const) {
  for (const [width, height] of [[1920, 1080], [1280, 720], [960, 540], [1536, 1009]]) {
    test(`readiness ${theme} ${width}x${height}: all TV surfaces fit and retain remote access`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      const capture = async (view: string) => {
        if (width === 960 || width === 1536) await page.screenshot({ path: testInfo.outputPath(`${view}-${theme}-${width}.png`) });
      };
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height }); await fixture(page, theme);
      await fits(page, 'hall', '.tv-hall-market-table,.tv-hall-sessions,.tv-headline-band,.tv-quote-marquee');
      await capture('hall');
      await page.locator('.tv-mode-browse').click();
      await fits(page, 'all stocks', '.tv-stock-filters,.tv-hall-market-table,.tv-stock-pagination,.tv-headline-band,.tv-quote-marquee');
      await capture('all-stocks');
      await page.locator('.tv-mode-strips').click();
      await expect(page.locator('.tv-market-strip')).toHaveCount(3);
      await fits(page, 'strips', '.tv-unified-header,.tv-market-strips');
      await capture('strips');
      await page.locator('.tv-mode-viewing').click();
      for (const scene of ['gulf', 'world', 'assets', 'watchlist']) {
        await page.locator(`[data-tv-focus-key="scene:${scene}"]`).click();
        await expect(page.locator('.tv-scene-row').first()).toBeVisible();
        await fits(page, scene, '.tv-scene-summaries,.tv-scene-body,.tv-quote-marquee');
        if (scene === 'watchlist') await capture('watchlist');
      }
      await page.locator('[data-tv-focus-key="scene-heatmap"]').click();
      await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(6);
      await fits(page, 'watchlist heatmap', '.tv-scene-heatmap');
      await page.locator('.tv-scene-heatmap > button').first().focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('.tv-scene-heatmap > button').nth(3)).toBeFocused();
      // Scroll positions round to pixels while scaled TV cards have fractional edges.
      await expect(page.locator('.tv-scene-heatmap > button').nth(3)).toBeInViewport({ ratio: 0.99 });
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('.tv-scene-heatmap > button:focus'), 'Remote focus can leave the heatmap at the last row').toHaveCount(0);
      await expect(page.locator('[data-tv-root] :focus')).toBeInViewport({ ratio: 0.99 });
      await page.locator('.tv-scene-heatmap > button').first().click();
      await fits(page, 'quote detail', '.tv-dialog');
      await page.keyboard.press('Escape');
      for (const [index, label, selector] of [
        [5, 'hours', '.tv-world-grid,.tv-world-pages,.tv-sessions-note'],
        [6, 'brief', '.tv-brief-dashboard,.tv-brief-rankings'],
        [7, 'investments', '.tv-portfolio,.tv-portfolio-footer'],
      ] as const) {
        await page.locator('.tv-scene-tabs button').nth(index).click();
        await fits(page, label, selector);
      }
      await page.keyboard.press('2');
      await expect(page.locator('.tv-news-desk-grid > button')).toHaveCount(height <= 650 ? 3 : height <= 800 ? 4 : 6);
      await fits(page, 'news', '.tv-receiver-heading,.tv-news-desk,.tv-news-desk-grid > button');
      await capture('news');
      expect.soft(await page.locator('.tv-news-desk-grid > button').evaluateAll(buttons => buttons.filter(button => button.scrollHeight > button.clientHeight + 2).length), 'News is readable without clipping').toBe(0);
      await page.locator('.tv-news-desk-grid > button').first().click();
      await fits(page, 'news dialog', '.tv-dialog');
      await page.keyboard.press('Escape');
      await expect(page.locator('.tv-dialog')).toHaveCount(0);
      await page.locator('[data-tv-focus-key="settings"]').click();
      await fits(page, 'settings', '.tv-dialog');
      const close = page.locator('.tv-dialog > header button');
      await close.focus(); await expect(close).toBeFocused();
      expect.soft(await close.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth)), 'Remote focus remains visible').toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Shift+Tab');
      expect(await page.locator('.tv-dialog').evaluate(dialog => dialog.contains(document.activeElement)), 'Settings keeps keyboard focus inside the dialog').toBe(true);
      await expect(page.locator('.tv-dialog :focus')).toBeInViewport({ ratio: 0.99 });
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('.tv-dialog')).toHaveCount(0);
      await expect(page.locator('[data-tv-root]')).toHaveClass(new RegExp(`tv-${theme}`));
      await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-accent', 'green');
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`readiness-${theme}-${width}.png`) });
    });
  }
}

test('strip movement respects reduced motion, and pause remains keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await fixture(page, 'dark');
  await page.locator('.tv-mode-strips').click();
  const track = page.locator('.tv-market-strip-track').first();
  await expect(track).toBeVisible();
  const initial = await track.evaluate(element => getComputedStyle(element).transform);
  await page.clock.runFor(800);
  await expect.poll(() => track.evaluate(element => getComputedStyle(element).transform)).not.toBe(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
  const pause = page.locator('.tv-header-actions button[aria-pressed]').first();
  await pause.focus(); await page.keyboard.press('Enter');
  await expect(pause).toBeFocused();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
});

test('many market strips stay reachable by remote without scrolling the whole screen', async ({ page }) => {
  const marketList = [...markets, ...Array.from({ length: 6 }, (_, index) => ({ ...markets[1],
    id: `QA_MARKET_${index}`, labelEn: `QA market ${index}`, labelAr: `سوق الاختبار ${index}`,
  }))];
  await page.setViewportSize({ width: 960, height: 540 });
  await fixture(page, 'light', true, 'ar', { marketList });
  await page.locator('.tv-mode-strips').click();
  await expect(page.locator('.tv-market-strip')).toHaveCount(marketList.length);
  const headings = page.locator('.tv-market-strip-heading');
  await headings.first().focus();
  for (let index = 1; index < marketList.length; index++) {
    await page.keyboard.press('ArrowDown');
    await expect(headings.nth(index)).toBeFocused();
    if (index === marketList.length - 1) await test.info().attach('last-strip-geometry', {
      contentType: 'application/json', body: JSON.stringify(await headings.nth(index).evaluate(element => {
        const geometry = [];
        for (let current: Element | null = element; current; current = current.parentElement) {
          const rect = current.getBoundingClientRect(), css = getComputedStyle(current);
          geometry.push({ element: current.className, top: rect.top, bottom: rect.bottom, height: rect.height,
            scrollHeight: current.scrollHeight, clientHeight: current.clientHeight, scrollTop: current.scrollTop,
            overflowY: css.overflowY, gridRows: css.gridTemplateRows });
        }
        return geometry;
      })),
    });
    await expect(headings.nth(index)).toBeInViewport({ ratio: 0.99 });
  }
  expect(await page.locator('.tv-market-strips').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await fits(page, 'scrolled strips', '.tv-unified-header,.tv-market-strips');
  await page.locator('[data-tv-focus-key="settings"]').focus();
  await page.keyboard.press('Enter');
  await fits(page, 'settings after strip scrolling', '.tv-dialog');
});

for (const theme of ['light', 'dark'] as const) test(`two holding watchlist remains usable in ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 1009 });
  await fixture(page, theme, true, 'ar', { watchlistSize: 2 });
  await page.locator('[data-tv-focus-key="scene:watchlist"]').click();
  await expect(page.locator('.tv-scene-row')).toHaveCount(2);
  await expect(page.locator('.tv-scene-summary'), 'A small watchlist does not repeat the same holdings in hero cards').toHaveCount(0);
  await fits(page, 'two holding watchlist', '.tv-scene-summaries,.tv-scene-body,.tv-quote-marquee');
  await page.locator('.tv-scene-row').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.tv-scene-row').nth(1)).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`watchlist-two-${theme}.png`) });
});

for (const theme of ['light', 'dark'] as const) test(`empty stocks and unpaired investments remain explicit in ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 }); await fixture(page, theme, false, 'en');
  await page.locator('.tv-mode-browse').click();
  await page.getByRole('searchbox').fill('no-such-company');
  await page.clock.runFor(350);
  await expect(page.locator('.tv-hall-row')).toHaveCount(0);
  await expect(page.getByText('No matching stocks', { exact: true })).toBeVisible();
  await page.locator('.tv-mode-viewing').click();
  await page.locator('.tv-scene-tabs button').nth(7).click();
  await expect(page.locator('.tv-portfolio-gate')).toContainText('Link this TV');
  await expect(page.locator('.tv-portfolio-metrics,.tv-portfolio-position')).toHaveCount(0);
});
