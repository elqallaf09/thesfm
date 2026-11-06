import { expect, test, type Locator } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function fits(container: Locator, items: Locator) {
  const box = await container.boundingBox();
  expect(box).not.toBeNull();
  const bounds = await items.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
  expect(bounds.length).toBeGreaterThan(0);
  for (const rect of bounds) {
    expect(rect.left).toBeGreaterThanOrEqual(box!.x - 1);
    expect(rect.right).toBeLessThanOrEqual(box!.x + box!.width + 1);
    expect(rect.top).toBeGreaterThanOrEqual(box!.y - 1);
    expect(rect.bottom).toBeLessThanOrEqual(box!.y + box!.height + 1);
  }
}

for (const density of ['balanced', 'comfortable', 'compact']) {
  test(`Arabic Gulf browse fits a populated ${density} ticker and its secondary views`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 });
    await page.addInitScript(density => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      displayMode: 'browse', language: 'ar', stripDensity: density, marketIds: ['crypto'],
    })), density);
    await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{
      group: 'crypto', id: 'crypto', labelAr: 'العملات الرقمية', labelEn: 'Crypto', count: 24, status: 'directory',
    }] } }));
    await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
    await page.route('**/api/tv/snapshot?*', route => {
      const query = new URL(route.request().url()).searchParams;
      const size = Number(query.get('pageSize')), batch = Number(query.get('page'));
      const quotes = Array.from({ length: size }, (_, i) => ({
        symbol: `ASSET${size * batch + i}`, name: 'QA instrument', nameAr: 'أداة اختبار',
        source: 'Binance Spot', currency: 'USDT', price: 122.05, changePercent: i % 2 ? -1.3 : 1.3,
        exchange: 'QA', observedAt: new Date().toISOString(), status: 'delayed',
      }));
      return route.fulfill({ json: { group: query.get('group'), available: size, total: size, directoryTotal: 24, quotes } });
    });
    await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
    await page.getByRole('button', { name: 'أسواق الخليج', exact: true }).click();
    const body = page.locator('.tv-body'), ticker = page.locator('.tv-market-strips');
    const cards = ticker.locator('.tv-market-strip-item');
    await expect(cards.first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const next = ticker.getByRole('button', { name: 'التالي', exact: true });
    await next.focus();
    const first = await cards.first().innerText();
    await page.keyboard.press('Enter');
    await expect(cards.first()).not.toHaveText(first);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await expect(body.locator('.tv-quote')).toHaveCount(height <= 650 ? 3 : 6);
      await fits(body.locator('.tv-quote-grid'), body.locator('.tv-quote'));
      await fits(page.locator('.tv-markets-nav'), page.locator('.tv-markets-nav button'));
      await fits(ticker, cards);
      for (const card of await cards.all()) await fits(card, card.locator(':scope > *'));
      await expect(page.locator('.tv-pagination')).toBeInViewport({ ratio: 1 });
    }
    await page.setViewportSize({ width: 960, height: 540 });
    for (const [name, selector] of [['ساعات الأسواق', '.tv-session, .tv-sessions-note'], ['خريطة الأسواق', '.tv-map-point'], ['موجز السوق', '.tv-mover']]) {
      await page.locator('.tv-view-actions').getByRole('button', { name, exact: true }).click();
      await expect(body.locator(selector).first()).toBeVisible();
      await fits(body, body.locator(selector));
    }
    await page.locator('.tv-view-actions').getByRole('button', { name: 'الأسواق', exact: true }).click();
    await expect(ticker).toBeVisible();
  });
}
