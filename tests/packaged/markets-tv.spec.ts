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

async function openTv(page: Page, language: TvLanguage) {
  await page.addInitScript(language => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language })), language);
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: snapshot() }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
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
        tickerTop: document.querySelector('.tv-scene-ticker')!.getBoundingClientRect().top,
      }));
      expect(bounds.width).toBeLessThanOrEqual(width + 2);
      expect(bounds.height).toBeLessThanOrEqual(height + 2);
      expect(bounds.panelBottom).toBeLessThan(bounds.tickerTop);
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
    await expect(page.locator('.tv-session')).toHaveCount(4);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await containedContent(page, '.tv-session');
    }
    for (const [market, clock] of [['XKUW', '12:52'], ['XSAU', '12:52'], ['XNYS', '04:52'], ['XTKS', '18:52']]) {
      await expect(page.locator(`[data-market="${market}"] time`)).toHaveText(clock);
    }
    // New York's clock follows daylight saving without claiming the exchange is open.
    await page.clock.setSystemTime(new Date('2026-07-01T09:52:00Z'));
    await page.clock.runFor(10_000);
    await expect(page.locator('[data-market="XNYS"] time')).toHaveText('05:52');
    await page.setViewportSize({ width: 960, height: 540 });
    const kuwait = page.locator('[data-tv-focus-key="session:XKUW"]');
    const nyse = page.locator('[data-tv-focus-key="session:XNYS"]');
    await kuwait.focus();
    await page.keyboard.press('ArrowDown');
    await expect(nyse).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(nyse).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-market="XNYS"] canvas')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(nyse).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '7');
  });
}
