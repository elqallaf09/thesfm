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
  test(`Arabic all stocks fits ${density} density with keyboard paging and secondary views`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 });
    await page.addInitScript(density => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ displayMode: 'browse', language: 'ar', stripDensity: density })), density);
    await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
    await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
    await page.route('**/api/tv/instruments?*', route => {
      const query = new URL(route.request().url()).searchParams, size = Number(query.get('pageSize')), batch = Number(query.get('page'));
      const items = Array.from({ length: size }, (_, i) => ({ symbol: `ASSET${size * batch + i}`, name: 'QA instrument', nameAr: 'شركة اختبار', currency: 'USD' }));
      return route.fulfill({ json: { items, total: 24, directoryTotal: 24, page: batch, pageSize: size } });
    });
    await page.route('**/api/tv/snapshot?*', route => {
      const query = new URL(route.request().url()).searchParams;
      const symbols: string[] = JSON.parse(query.get('symbols') || '["ASSET0","ASSET1","ASSET2","ASSET3","ASSET4","ASSET5"]');
      const quotes = symbols.map(symbol => ({ symbol, name: 'QA instrument', nameAr: 'شركة اختبار', source: 'QA', currency: 'USD', price: 122.05, changePercent: 1.3, exchange: 'QA', observedAt: new Date().toISOString(), status: 'delayed' }));
      return route.fulfill({ json: { group: query.get('group'), available: quotes.length, total: quotes.length, directoryTotal: 24, quotes } });
    });
    await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
    await expect(page.locator('.tv-hall-row')).toHaveCount(3);
    await page.keyboard.press('Shift');
    const next = page.locator('[data-tv-focus-key=stocks-next]'); await next.focus();
    const first = await page.locator('.tv-hall-identity').first().innerText();
    await page.keyboard.press('Enter'); await expect(page.locator('.tv-hall-identity').first()).not.toHaveText(first);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160]]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator('.tv-hall-row')).toHaveCount(height <= 650 ? 3 : 6);
      await fits(page.locator('.tv-hall-rows'), page.locator('.tv-hall-row'));
      await expect(page.locator('.tv-stock-pagination')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.tv-quote-marquee')).toBeInViewport({ ratio: 1 });
    }
    await page.setViewportSize({ width: 960, height: 540 });
    await page.locator('.tv-mode-viewing').click();
    await expect(page.locator('.tv-hall-main')).toBeVisible();
    await page.locator('.tv-scene-tabs button').nth(5).click();
    await expect(page.locator('.tv-world-sessions')).toBeInViewport({ratio:1});
    await page.locator('.tv-scene-tabs button').nth(6).click();
    await expect(page.locator('.tv-brief-dashboard')).toBeInViewport({ratio:1});
    await page.locator('.tv-mode-browse').click();
    await expect(page.locator('.tv-hall-row')).toHaveCount(3);
  });
}
