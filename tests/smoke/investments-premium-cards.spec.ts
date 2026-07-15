import { expect, test, type Page } from '@playwright/test';
import type { Investment } from '@/types/investment';

const sampleInvestments: Investment[] = [
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

type PortfolioOptions = {
  lang?: 'ar' | 'en' | 'fr';
  theme?: 'light' | 'dark';
  investments?: Investment[];
  historyPoints?: Array<{ time: string; close: number }>;
};

async function enterPremiumPortfolio(page: Page, width: number, options: PortfolioOptions = {}) {
  const lang = options.lang ?? 'en';
  const theme = options.theme ?? 'dark';
  const investments = options.investments ?? sampleInvestments;
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: 'sfm_guest', value: 'true', url: baseURL, sameSite: 'Lax' }]);
  await page.addInitScript(({ investments: storedInvestments, lang: storedLang, theme: storedTheme }) => {
    if (!localStorage.getItem('sfm_lang')) localStorage.setItem('sfm_lang', storedLang);
    if (!localStorage.getItem('the-sfm-theme')) localStorage.setItem('the-sfm-theme', storedTheme);
    localStorage.setItem('sfm_guest_mode', 'true');
    localStorage.setItem('sfm_guest_investments', JSON.stringify(storedInvestments));
  }, { investments, lang, theme });
  await page.route('**/api/investment-platforms?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, page: 1, limit: 50, total: 1, items: [] }),
  }));
  await page.route('**/api/market/history?**', route => route.fulfill({
    status: options.historyPoints ? 200 : 422,
    contentType: 'application/json',
    body: JSON.stringify(options.historyPoints
      ? { ok: true, symbol: 'KFH.KW', range: '1M', points: options.historyPoints }
      : { ok: false, code: 'PRICE_HISTORY_UNAVAILABLE', points: [] }),
  }));
  await page.goto('/invest', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.invest-main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', /^(ar|en|fr)$/);
  await page.evaluate(settledLang => {
    localStorage.setItem('sfm_lang', settledLang);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: settledLang } }));
  }, lang);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));
}

test('compact card preserves identity, financial hierarchy, accessible actions, and 320px reflow', async ({ page }) => {
  let historyRequests = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/market/history') historyRequests += 1;
  });
  await enterPremiumPortfolio(page, 320);
  const card = page.locator('.invest-holding-card').filter({ hasText: 'Kuwait Finance House' });
  await expect(card).toBeVisible();
  await expect(card.locator('.invest-asset-lens .asset-avatar')).toBeVisible();
  await expect(card.locator('.invest-platform-identity')).toContainText('Interactive Brokers');
  await expect(card.locator('.invest-holding-metric')).toHaveCount(2);
  await expect(card.locator('.invest-holding-metric').first().locator('strong')).toContainText('771.000');
  await expect(card.locator('.invest-expanded-section')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'View details' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'More actions' })).toBeVisible();
  expect(historyRequests).toBe(0);

  await card.getByRole('button', { name: 'More actions' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Refresh price' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual(320);
  expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(900);
  await page.keyboard.press('Escape');

  const compactHeight = await card.evaluate(element => element.getBoundingClientRect().height);
  expect(compactHeight).toBeLessThan(620);

  const expand = card.getByRole('button', { name: 'Expand card details' });
  await expect(expand).toHaveAttribute('aria-controls', /.+/);
  await expand.click();
  await expect(card.getByRole('button', { name: 'Collapse card details' })).toHaveAttribute('aria-expanded', 'true');
  for (const heading of ['Asset overview', 'AI summary', 'Allocation', 'Performance', 'Dividends', 'Notes', 'Attachments', 'Broker notes', 'Transactions', 'Price history', 'Documents']) {
    await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(card.getByText('Historical prices are unavailable from the data provider')).toBeVisible();
  await expect(card.getByText('Average cost')).toBeVisible();
  await expect(card.getByText('Today change')).toBeVisible();
  expect(historyRequests).toBe(1);

  await card.getByRole('button', { name: 'Collapse card details' }).click();
  await expect(card.locator('.invest-expanded-section')).toHaveCount(0);

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(4);
  }
});

test('guest automatic refresh never calls the protected investment price endpoint', async ({ page }) => {
  let protectedRefreshRequests = 0;
  await page.route('**/api/market/refresh-investment-price', route => {
    protectedRefreshRequests += 1;
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, code: 'UNAUTHORIZED' }),
    });
  });

  await enterPremiumPortfolio(page, 390, { lang: 'en', theme: 'dark' });
  await expect(page.getByText('Automatic refresh is paused in guest mode')).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(protectedRefreshRequests).toBe(0);

  const card = page.locator('.invest-holding-card').first();
  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Refresh price' }).click();
  await expect(page.getByText('Automatic refresh is paused in guest mode').last()).toBeVisible();
  expect(protectedRefreshRequests).toBe(0);
});

test('offline manual metal refresh recovers without issuing an upstream request', async ({ page }) => {
  const goldInvestment: Investment = {
    ...sampleInvestments[0],
    id: 'offline-gold',
    name: 'Physical Gold',
    type: 'gold',
    assetType: 'gold',
    metalType: 'gold',
    symbol: 'XAUUSD',
    providerSymbol: 'XAUUSD',
    market: 'Metals',
  };
  let metalsRequests = 0;
  await page.route('**/api/market/metals?**', route => {
    metalsRequests += 1;
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) });
  });

  await enterPremiumPortfolio(page, 390, { investments: [goldInvestment], lang: 'en' });
  const card = page.locator('.invest-holding-card').first();
  await card.getByRole('button', { name: 'More actions' }).click();
  const refreshAction = page.getByRole('menuitem', { name: 'Refresh price' });
  await expect(refreshAction).toBeVisible();
  await page.context().setOffline(true);
  await refreshAction.click();
  await expect(page.getByText('You are offline').last()).toBeVisible();
  expect(metalsRequests).toBe(0);
  await page.context().setOffline(false);
});

test('provider-unavailable metal refresh reports a safe failure and preserves the prior price', async ({ page }) => {
  const goldInvestment: Investment = {
    ...sampleInvestments[0],
    id: 'unavailable-gold',
    name: 'Physical Gold',
    type: 'gold',
    assetType: 'gold',
    metalType: 'gold',
    symbol: 'XAUUSD',
    providerSymbol: 'XAUUSD',
    market: 'Metals',
    currentPrice: 24.5,
  };
  await page.route('**/api/market/metals?**', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      code: 'PROVIDER_UNAVAILABLE',
      retryable: true,
      error: 'Metals market data is temporarily unavailable.',
    }),
  }));

  await enterPremiumPortfolio(page, 390, { investments: [goldInvestment], lang: 'en' });
  const card = page.locator('.invest-holding-card').first();
  const valueBefore = await card.locator('.invest-holding-metric').first().locator('strong').textContent();
  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Refresh price' }).click();
  await expect(page.getByText('Could not update the price right now').last()).toBeVisible();
  await expect(card.locator('.invest-holding-metric').first().locator('strong')).toHaveText(valueBefore || '');
  await expect(page.getByText(/PROVIDER_UNAVAILABLE|503/)).toHaveCount(0);
});

test('overflow edit and delete retain their existing dialogs and destructive confirmation', async ({ page }) => {
  await enterPremiumPortfolio(page, 390);
  const card = page.locator('.invest-holding-card').filter({ hasText: 'Kuwait Finance House' });

  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.locator('.invest-modal[role="dialog"]')).toBeVisible();
  await page.locator('.invest-modal[role="dialog"]').getByRole('button', { name: 'Close' }).click();

  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirmation = page.locator('.invest-confirm[role="alertdialog"]');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText('Kuwait Finance House');
  await expect(card).toBeVisible();
  await confirmation.locator('.invest-form-actions').getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation).toHaveCount(0);
});

test('history chart renders provider points only after expansion', async ({ page }) => {
  const points = [
    { time: '2025-07-14T00:00:00.000Z', close: 0.500 },
    { time: '2026-06-16T00:00:00.000Z', close: 0.744 },
    { time: '2026-06-23T00:00:00.000Z', close: 0.752 },
    { time: '2026-06-30T00:00:00.000Z', close: 0.748 },
    { time: '2026-07-07T00:00:00.000Z', close: 0.763 },
    { time: '2026-07-14T00:00:00.000Z', close: 0.771 },
  ];
  await enterPremiumPortfolio(page, 390, { historyPoints: points });
  const card = page.locator('.invest-holding-card').first();
  await expect(card.locator('.invest-sparkline')).toHaveCount(0);
  await card.getByRole('button', { name: 'Expand card details' }).click();
  const chart = card.locator('.invest-sparkline');
  await expect(chart).toBeVisible();
  await expect(chart).toContainText('30D');
  const path = chart.locator('.invest-sparkline-path');
  await expect(path).toHaveAttribute('d', /^M2\.00/);
  expect(((await path.getAttribute('d'))?.match(/L/g) ?? []).length).toBe(4);
  await expect(card.getByText('Historical prices are unavailable from the data provider')).toHaveCount(0);
});

test('unverified asset and platform identities use honest fallback treatments', async ({ page }) => {
  const fallbackInvestment: Investment = {
    ...sampleInvestments[0],
    id: 'premium-card-fallback',
    name: 'Gulf Private Credit',
    type: 'project',
    assetType: 'project',
    symbol: 'PRIV-1',
    providerSymbol: 'PRIV-1',
    market: 'Private market',
    purchasePlatformName: 'Gulf Private Desk',
    purchasePlatformType: 'other',
  };
  await enterPremiumPortfolio(page, 390, { investments: [fallbackInvestment] });
  const card = page.locator('.invest-holding-card').filter({ hasText: 'Gulf Private Credit' });
  await expect(card.locator('.invest-asset-lens .asset-avatar img')).toHaveCount(0);
  await expect(card.locator('.invest-platform-logo')).toHaveAttribute('data-fallback', 'true');
  await expect(card.locator('.invest-platform-monogram')).toHaveText('GP');
  await expect(card.locator('.invest-platform-identity')).toContainText('Gulf Private Desk');
});

test('light, dark, Arabic, and French card surfaces retain direction and boundaries', async ({ page }) => {
  await enterPremiumPortfolio(page, 390, { lang: 'en', theme: 'light' });
  const card = page.locator('.invest-holding-card').first();
  const surfaceColors = new Set<string>();

  for (const scenario of [
    { lang: 'en', dir: 'ltr', theme: 'light' },
    { lang: 'ar', dir: 'rtl', theme: 'dark' },
    { lang: 'fr', dir: 'ltr', theme: 'light' },
  ] as const) {
    await page.evaluate(current => {
      localStorage.setItem('sfm_lang', current.lang);
      localStorage.setItem('the-sfm-theme', current.theme);
    }, scenario);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', scenario.lang);
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.dir);
    await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${scenario.theme}(\\s|$)`));
    await expect(card).toBeVisible();
    const styles = await card.evaluate(element => {
      const computed = getComputedStyle(element);
      return { background: computed.backgroundColor, backgroundImage: computed.backgroundImage, border: computed.borderColor };
    });
    expect(styles.background !== 'rgba(0, 0, 0, 0)' || styles.backgroundImage !== 'none').toBe(true);
    expect(styles.border).not.toBe('rgba(0, 0, 0, 0)');
    surfaceColors.add(`${scenario.theme}:${styles.background}:${styles.backgroundImage}`);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(4);
  }

  expect(surfaceColors.size).toBeGreaterThanOrEqual(2);
});
