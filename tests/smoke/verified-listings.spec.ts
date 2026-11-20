import { expect, test } from '@playwright/test';

const listing = { symbol: 'ADRX', name: 'ADARx Pharmaceuticals, Inc.', exchange: 'NASDAQ', cik: '1802369',
  securityType: 'common-stock', listingType: 'ipo', firstTradeDate: '2026-09-25', evidence: 'completed-first-trade',
  sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1802369/000119312526458321/adrx-ex99_1.htm',
  sourceLabel: 'SEC EDGAR · 8-K Exhibit 99.1', sourceSection: 'Recent Business Highlights',
  verifiedAt: '2026-11-16', reviewAfter: '2026-12-16' };

test('reviewed listing sources remain distinct from prices and clear on offline', async ({ page, context }) => {
  await page.route('**/api/market/special-news?**', async route => {
    const ticker = new URL(route.request().url()).searchParams.get('part') === 'ticker';
    await route.fulfill({ json: ticker
      ? { success: true, listings: [listing], tickerItems: [], quoteStatus: 'rights-unverified' }
      : { success: true, items: [], partialFailure: false } });
  });
  await page.goto('/new-stocks-news', { waitUntil: 'domcontentloaded' });
  const source = page.locator(`a[href="${listing.sourceUrl}"]`);
  await expect(source).toBeVisible();
  await expect(source).toContainText('2026-11-16');
  const section = source.locator('xpath=ancestor::section[1]');
  await expect(section).toContainText('90');
  await expect(section).toContainText('2026-09-25');
  await expect(section).not.toContainText('$');
  expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await context.setOffline(true);
  await expect(source).toHaveCount(0);
  await context.setOffline(false);
  await expect(source).toBeVisible();
});

test('empty registry does not render invented listing cards', async ({ page }) => {
  await page.route('**/api/market/special-news?**', route => route.fulfill({ json: {
    success: true, items: [], listings: [], tickerItems: [], quoteStatus: 'rights-unverified',
  } }));
  await page.goto('/new-stocks-news', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: '90' })).toBeVisible();
  await expect(page.locator('a[href*="sec.gov/Archives"]')).toHaveCount(0);
});
