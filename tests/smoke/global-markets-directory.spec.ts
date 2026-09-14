import { expect, test, type Page } from '@playwright/test';
import { mockMarketDirectory } from './helpers/global-market-directory';

async function openDirectory(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'en'));
  await mockMarketDirectory(page);
  await page.route('**/api/market-strips**', route => route.fulfill({ json: { success: true, lastUpdated: new Date().toISOString(), prices: {} } }));
  await page.route('**/api/market-news**', route => route.fulfill({ json: { ok: true, success: true, items: [], total: 0 } }));
  await page.goto('/global-markets', { waitUntil: 'domcontentloaded' });
  const explorer = page.locator('.gm-shell:visible .gm-explorer');
  await explorer.getByRole('button', { name: 'Browse all assets', exact: true }).click();
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(12);
  return explorer;
}

test('Kuwait directory includes unselected stocks, paginates, and requests their prices', async ({ page }) => {
  const priceRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/market-directory/quotes?')) priceRequests.push(request.url()); });
  const explorer = await openDirectory(page);
  await explorer.getByLabel('Exchange', { exact: true }).selectOption('kuwait_boursa');
  await expect(explorer.locator('.gm-explorer-count')).toContainText('134');
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(12);
  await explorer.getByRole('button', { name: /Load more/ }).click();
  const count = await page.evaluate(() => matchMedia('(max-width: 640px)').matches ? 18 : 24);
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(count);
  await explorer.getByRole('searchbox').fill('BOUBYAN');
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(1);
  await expect(explorer.locator('.gm-strip-item')).toContainText('BOUBYAN.KW');
  await expect(explorer.locator('.gm-strip-item')).toContainText('123.45');
  expect(priceRequests.some(url => decodeURIComponent(url).includes('BOUBYAN.KW'))).toBe(true);
});

test('NASDAQ, Shanghai and Shenzhen searches extend beyond the strip selections', async ({ page }) => {
  const explorer = await openDirectory(page);
  for (const [exchange, symbol] of [['us_nasdaq', 'AMD'], ['china_sse', '600000.SS'], ['china_szse', '000002.SZ']]) {
    await explorer.getByLabel('Exchange', { exact: true }).selectOption(exchange);
    await explorer.getByRole('searchbox').fill(symbol);
    await expect(explorer.locator('.gm-strip-item')).toHaveCount(1);
    await expect(explorer.locator('.gm-strip-item')).toContainText(symbol);
    await expect(explorer.locator('.gm-strip-item')).toContainText('123.45');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('directory errors show retry and unconnected markets have an explicit explanation', async ({ page }) => {
  const explorer = await openDirectory(page);
  await page.route('**/api/market-directory?**', route => route.fulfill({ status: 503, json: { success: false } }), { times: 1 });
  await explorer.getByLabel('Exchange', { exact: true }).selectOption('kuwait_boursa');
  await expect(explorer.getByRole('alert')).toContainText('could not be loaded');
  await explorer.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(explorer.locator('.gm-explorer-count')).toContainText('134');
  await explorer.getByLabel('Exchange', { exact: true }).selectOption('egypt_egx');
  await expect(explorer.locator('.gm-directory-feedback')).toContainText('not connected yet');
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(0);
});

test('each strip opens its own directory', async ({ page }) => {
  const explorer = await openDirectory(page);
  await page.locator('.gm-shell:visible .gm-strip').first().getByRole('button', { name: 'Market selection · Browse directory', exact: true }).click();
  await expect(explorer.getByLabel('Exchange', { exact: true })).toHaveValue('kuwait_boursa');
  await expect(explorer.locator('.gm-explorer-count')).toContainText('134');
});
