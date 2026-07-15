import { expect, test, type Page } from '@playwright/test';

const sampleInvestments = [
  {
    id: 'premium-card-stock', name: 'Kuwait Finance House', type: 'stocks', currentValue: 771,
    displayValue: 771, displayValueStatus: 'valid', monthlyContribution: 100, startDate: '2024-01-10',
    riskLevel: 'medium', expectedAnnualReturn: 7, symbol: 'KFH.KW', providerSymbol: 'KFH.KW',
    market: 'Boursa Kuwait', assetType: 'stock', currency: 'KWD', nativeCurrency: 'KWD', quantity: 1000,
    purchasePrice: 0.766, currentPrice: 0.771, purchaseTotal: 766, currentMarketValue: 771,
    nativeMarketValue: 771, userCurrency: 'KWD', convertedMarketValue: 771,
    purchasePlatformId: '10000000-0000-4000-8000-000000000002', purchasePlatformName: 'Interactive Brokers',
    purchasePlatformType: 'multi_asset_broker', purchasePlatformStatus: 'approved',
    notes: 'Core Kuwait equity position.', lastPriceUpdatedAt: '2026-07-15T10:14:00.000Z',
    createdAt: '2024-01-10T00:00:00.000Z', updatedAt: '2026-07-15T10:14:00.000Z',
  },
];
const baseURL = process.env.E2E_BASE_URL || (process.env.PLAYWRIGHT_HTTPS_LOOPBACK === '1' ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3000');

async function enterPremiumPortfolio(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: 'sfm_guest', value: 'true', url: baseURL, sameSite: 'Lax' }]);
  await page.addInitScript(investments => {
    localStorage.setItem('sfm_lang', 'en');
    localStorage.setItem('the-sfm-theme', 'dark');
    localStorage.setItem('sfm_guest_mode', 'true');
    localStorage.setItem('sfm_guest_investments', JSON.stringify(investments));
  }, sampleInvestments);
  await page.route('**/api/investment-platforms?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, page: 1, limit: 50, total: 1, items: [] }),
  }));
  await page.goto('/invest', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.invest-main')).toBeVisible();
}

test('premium card preserves identity, actions, metrics, expansion, and 320px reflow', async ({ page }) => {
  await enterPremiumPortfolio(page, 320);
  const card = page.locator('.invest-holding-card').filter({ hasText: 'Kuwait Finance House' });
  await expect(card).toBeVisible();
  await expect(card.locator('.invest-asset-lens .asset-avatar')).toBeVisible();
  await expect(card.locator('.invest-platform-identity')).toContainText('Interactive Brokers');
  await expect(card.locator('.invest-holding-metric')).toHaveCount(4);
  await expect(card.getByRole('button', { name: 'View details' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Delete' })).toBeVisible();

  const expand = card.getByRole('button', { name: 'Expand card details' });
  await expect(expand).toHaveAttribute('aria-controls', /.+/);
  await expand.click();
  await expect(card.getByRole('button', { name: 'Collapse card details' })).toHaveAttribute('aria-expanded', 'true');
  for (const heading of ['Asset overview', 'AI summary', 'Allocation', 'Performance', 'Dividends', 'Notes', 'Attachments', 'Broker notes', 'Transactions', 'Price history', 'Documents']) {
    await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(4);
  }
});
