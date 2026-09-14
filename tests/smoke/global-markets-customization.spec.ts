import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, lang = 'en') {
  await page.addInitScript(language => localStorage.setItem('sfm_lang', language), lang);
  await page.route('**/api/market-strips**', route => route.fulfill({ json: {
    success: true, lastUpdated: '2026-09-14T08:00:00Z',
    prices: { AAPL: { symbol: 'AAPL', price: 100, change: 1, changePercent: 1, source: 'Yahoo Finance', delayed: true, available: true } },
  } }));
  await page.route('**/api/market-news**', route => route.fulfill({ json: {
    success: true, items: [{ id: 'qa-only', title: 'QA fixture for filter interactions', sourceName: 'QA Source', url: 'https://example.com/qa-only' }],
  } }));
}

// Streaming HTML may temporarily include a hidden server segment. Assert the
// visible application after locale hydration, including on cached WebKit reloads.
async function expectMarketsReady(page: Page, lang = 'en') {
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.locator('.gm-shell:visible')).toHaveCount(1);
}

for (const lang of ['ar', 'en', 'fr']) {
  test(`ticker covers the viewport throughout its full animation cycle: ${lang}`, async ({ page }) => {
    await prepare(page, lang);
    await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
    await expectMarketsReady(page, lang);
    await expect(page.locator('.gm-shell:visible .gm-strip[aria-busy="false"]')).toHaveCount(4);
    for (const width of [390, 768, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.locator('.gm-shell:visible .gm-strips .market-ticker-track').evaluateAll(tracks =>
        tracks.length === 4 && tracks.every(track => {
          const measured = Number(track.getAttribute('data-loop-distance'));
          const current = track.querySelector('[data-ticker-set="primary"]')!.getBoundingClientRect().width;
          return measured > 0 && Math.abs(measured - current) < .5;
        }),
      )).toBe(true);
      const samples = await page.locator('.gm-shell:visible .gm-strips .market-ticker-track').evaluateAll(tracks => {
        const results: Array<{ covered: boolean; velocity: number; offsetError: number }> = [];
        for (const track of tracks) {
          const animation = track.getAnimations()[0];
          if (!animation) throw new Error('Ticker animation is missing');
          const duration = Number(animation.effect?.getTiming().duration);
          animation.pause();
          animation.currentTime = 0;
          const startLeft = track.getBoundingClientRect().left;
          const loopDistance = Number(track.getAttribute('data-loop-distance'));
          for (const progress of [0, .1, .25, .5, .75, .95, .999, 1.001]) {
            animation.currentTime = duration * progress;
            // Seeking is synchronous; geometry reads flush animation styles.
            // Offscreen WebKit frames can throttle requestAnimationFrame.
            const viewport = track.parentElement!.getBoundingClientRect();
            const bounds = track.getBoundingClientRect();
            results.push({ covered: bounds.left <= viewport.left + 1 && bounds.right >= viewport.right - 1,
              velocity: loopDistance / (duration / 1000),
              offsetError: Math.abs(Math.abs(bounds.left - startLeft) - loopDistance * (progress % 1)) });
          }
          animation.play();
        }
        return results;
      });
      expect(samples).toHaveLength(32);
      for (const sample of samples) {
        expect(sample.covered, `${lang} ${width}px must never expose a blank loop`).toBe(true);
        expect(sample.velocity).toBeCloseTo(30, 1);
        expect(sample.offsetError, 'Every sample must reach its requested animation position').toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  });
}

test('manual navigation stops animation and resume clears the scroll offset', async ({ page }) => {
  await prepare(page);
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  const strip = page.locator('.gm-shell:visible .gm-strip').first();
  await expect(strip.locator('.market-ticker-track')).toHaveAttribute('data-pixels-per-second', '30');
  await strip.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(strip.locator('[data-market-ticker]')).toHaveAttribute('data-manual', 'true');
  await expect(strip.locator('.market-ticker-track')).toHaveCSS('animation-name', 'none');
  await expect.poll(() => strip.locator('.market-ticker-viewport').evaluate(element => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
  await strip.getByRole('button', { name: 'Resume ticker', exact: true }).click();
  await expect.poll(() => strip.locator('.market-ticker-viewport').evaluate(element => element.scrollLeft)).toBe(0);
  await expect(strip.locator('.market-ticker-track')).not.toHaveCSS('animation-name', 'none');
});

test('market selection is visible, replaces one market, saves, and keeps restore as a draft until saved', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await page.getByRole('button', { name: 'Customize markets', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize markets' });
  await expect(dialog.getByRole('checkbox', { checked: true })).toHaveCount(4);
  await expect(dialog.getByRole('checkbox', { name: 'Crypto', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Remove: Forex', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /Save markets/ })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Crypto', exact: true }).click();
  await dialog.getByRole('button', { name: /Save markets/ }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await expect(page.locator('.gm-shell:visible .gm-strip-heading-label').last()).toHaveText('Crypto');
  await page.getByRole('button', { name: 'Customize markets', exact: true }).click();
  await dialog.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.gm-shell:visible .gm-strip-heading-label').last()).toHaveText('Crypto');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await expect(page.locator('.gm-shell:visible .gm-strip-heading-label').last()).toHaveText('Crypto');
});

test('Customize news opens from automatic mode and applies selectable filters in one request', async ({ page }) => {
  await prepare(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/market-news')) requests.push(request.url()); });
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await expect(page.locator('.gm-shell:visible .gm-news-results')).toHaveAttribute('aria-busy', 'false');
  const before = requests.length;
  await page.getByRole('button', { name: 'Customize news', exact: true }).click();
  const filters = page.locator('#gm-news-filters');
  await expect(filters).toBeVisible();
  await filters.getByRole('combobox', { name: 'Country', exact: true }).selectOption('US');
  await filters.getByRole('combobox', { name: 'Exchange', exact: true }).selectOption('NASDAQ');
  await filters.getByRole('combobox', { name: 'Company or symbol', exact: true }).selectOption('AAPL');
  await filters.getByRole('combobox', { name: 'Source', exact: true }).selectOption('QA Source');
  expect(requests).toHaveLength(before);
  await filters.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect.poll(() => requests.length).toBe(before + 1);
  const query = new URL(requests.at(-1)!).searchParams;
  expect(query.get('countries')).toBe('US');
  expect(query.get('exchangeCode')).toBe('NASDAQ');
  expect(query.get('symbols')).toBe('AAPL');
  expect(query.get('sourceNames')).toBe('QA Source');
  expect(query.has('marketIds')).toBe(false);
  await expect(page.getByRole('button', { name: 'Manual customization', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('saving markets still works when browser storage is unavailable', async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('sfm.globalMarkets.')) throw new DOMException('Storage disabled', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await page.getByRole('button', { name: 'Customize markets', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove: Forex', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Crypto', exact: true }).click();
  await dialog.getByRole('button', { name: /Save markets/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.gm-shell:visible .gm-strip-heading-label').last()).toHaveText('Crypto');
});

test('saved selections reserve the same summary height for short and long market names', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await expect(page.locator('.gm-shell:visible .gm-strip[aria-busy="false"]')).toHaveCount(4);
  const before = await page.locator('.gm-shell:visible .gm-selection').boundingBox();
  await page.getByRole('button', { name: 'Customize markets', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Remove: Forex', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Commodities & Metals', exact: true }).click();
  await dialog.getByRole('button', { name: /Save markets/ }).click();
  await expect(page.locator('.gm-shell:visible .gm-selection-chips')).toContainText('Commodities & Metals');
  const after = await page.locator('.gm-shell:visible .gm-selection').boundingBox();
  expect(after?.height).toBe(before?.height);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectMarketsReady(page);
  await expect(page.locator('.gm-shell:visible .gm-selection-chips')).toContainText('Commodities & Metals');
  const reloaded = await page.locator('.gm-shell:visible .gm-selection').boundingBox();
  expect(reloaded?.height).toBe(before?.height);
});
