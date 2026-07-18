import { expect, test, type Locator, type Page } from '@playwright/test';
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

function kwdMetalInvestment(metal: 'gold' | 'silver'): Investment {
  const isSilver = metal === 'silver';
  return {
    ...sampleInvestments[0],
    id: `currency-integrity-${metal}`,
    name: isSilver ? 'Currency Integrity Silver' : 'Currency Integrity Gold',
    type: metal,
    assetType: metal,
    metalType: metal,
    symbol: isSilver ? 'XAGUSD' : 'XAUUSD',
    providerSymbol: isSilver ? 'XAGUSD' : 'XAUUSD',
    market: 'Metals',
    currency: 'KWD',
    priceCurrency: 'USD',
    nativeCurrency: 'USD',
    userCurrency: 'KWD',
    quantity: 10,
    grams: 10,
    purchasePrice: 9,
    purchaseTotal: 90,
    currentPrice: 30,
    currentValue: 92.4,
    displayValue: 92.4,
    currentMarketValue: 300,
    nativeMarketValue: 300,
    convertedMarketValue: 92.4,
    fxRateToUserCurrency: 0.308,
    fxSource: 'frankfurter',
    profitLoss: 2.4,
    profitLossPercent: 2.6666666667,
  };
}
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

async function selectOverflowAction(page: Page, card: Locator, name: 'Edit' | 'Delete') {
  const trigger = card.getByRole('button', { name: 'More actions' });
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeEnabled();
  await trigger.click();

  const menu = page.locator('.invest-card-menu[data-state="open"]');
  await expect(menu).toBeVisible();
  const item = menu.getByRole('menuitem', { name, exact: true });
  await expect(item).toBeVisible();
  await expect(item).toBeEnabled();
  await item.press('Enter');
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
  await expect(card.locator('.invest-holding-metric')).toHaveCount(3);
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
  for (const heading of ['Asset overview', 'Price history', 'Allocation', 'Performance', 'Notes']) {
    await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  // Placeholder-only sections were removed by the UX refinement pass:
  // the expansion now renders sections that carry real content only.
  for (const removedHeading of ['AI summary', 'Dividends', 'Attachments', 'Broker notes', 'Transactions', 'Documents']) {
    await expect(card.getByRole('heading', { name: removedHeading, exact: true })).toHaveCount(0);
  }
  await expect(card.getByText('Historical prices are unavailable from the data provider')).toBeVisible();
  await expect(card.getByText('Current price')).toBeVisible();
  await expect(card.getByText('Purchase price')).toBeVisible();
  await expect(card.getByText('Average cost')).toHaveCount(0);
  await expect(card.getByText('Today change')).toHaveCount(0);
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

  await selectOverflowAction(page, card, 'Edit');
  await expect(page.locator('.invest-modal[role="dialog"]')).toBeVisible();
  const closeEditDialog = page.locator('.invest-modal[role="dialog"]').getByRole('button', { name: 'Close' });
  await expect(closeEditDialog).toBeEnabled();
  await closeEditDialog.press('Enter');

  await selectOverflowAction(page, card, 'Delete');
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

for (const scenario of [
  { metal: 'silver', width: 1440, height: 900, lang: 'en', dir: 'ltr' },
  { metal: 'gold', width: 390, height: 844, lang: 'ar', dir: 'rtl' },
] as const) {
  test(`${scenario.metal} keeps KWD holding values separate from its USD market quote (${scenario.lang}/${scenario.dir})`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', error => problems.push(`page: ${error.message}`));
    page.on('requestfailed', request => problems.push(`request: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
    page.on('response', response => {
      if (response.status() >= 500) problems.push(`response: ${response.status()} ${response.url()}`);
    });

    await enterPremiumPortfolio(page, scenario.width, {
      investments: [kwdMetalInvestment(scenario.metal)],
      lang: scenario.lang,
      theme: 'light',
      historyPoints: [],
    });
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await expect(page.locator('html')).toHaveAttribute('dir', scenario.dir);

    const card = page.locator('.invest-holding-card').filter({ hasText: `Currency Integrity ${scenario.metal === 'silver' ? 'Silver' : 'Gold'}` });
    await expect(card).toBeVisible();
    await expect(card.locator('.invest-asset-lens .asset-avatar')).toBeVisible();

    const primaryValues = card.locator('.invest-holding-metric strong');
    await expect(primaryValues).toHaveCount(3);
    for (const value of await primaryValues.allTextContents()) {
      expect(value).not.toContain('USD');
      expect(value).toMatch(scenario.lang === 'ar' ? /KWD|د\.ك/ : /KWD/);
    }

    await card.locator('.invest-expand-btn').click();
    const financialDetails = card.locator('.invest-financial-details');
    await expect(financialDetails).toContainText('USD');
    await expect(financialDetails).toContainText(scenario.lang === 'ar' ? /KWD|د\.ك/ : /KWD/);

    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(4);

    await card.locator('.invest-card-action--primary').click();
    await expect(page.locator('.invest-drawer')).toBeVisible();
    await expect(page.locator('.invest-drawer')).toContainText('USD');
    await expect(page.locator('.invest-drawer')).toContainText(scenario.lang === 'ar' ? /KWD|د\.ك/ : /KWD/);
    expect(problems).toEqual([]);
  });
}

test('sticky shell, single asset visual, verified zad logo, and dialog stacking survive scroll', async ({ page }, testInfo) => {
  const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

  const zadInvestment: Investment = {
    ...sampleInvestments[0],
    id: 'regression-zad-nvda',
    name: 'NVIDIA Corporation',
    symbol: 'NVDA',
    providerSymbol: 'NVDA',
    market: 'NASDAQ',
    purchasePlatformId: undefined,
    purchasePlatformName: 'zad',
  };
  await enterPremiumPortfolio(page, 1440, { investments: [zadInvestment] });

  const card = page.locator('.invest-holding-card').filter({ hasText: 'NVIDIA Corporation' });
  await expect(card).toBeVisible();

  // Exactly one asset visual: once the verified logo loads, the fallback
  // icon/monogram must leave the avatar entirely.
  const avatar = card.locator('.invest-asset-lens .asset-avatar');
  await expect(avatar.locator('img')).toHaveCount(1);
  await expect(avatar.locator('svg')).toHaveCount(0);

  // ZAD identifier variants resolve to the verified platform logo.
  const platformLogo = card.locator('.invest-platform-logo');
  await expect(platformLogo).toHaveAttribute('data-fallback', 'false');
  await expect(platformLogo.locator('img')).toHaveCount(1);

  const isMobileProject = testInfo.project.name.includes('mobile');
  if (!isMobileProject) {
    // Sticky chrome: after scrolling, the header hugs the viewport top, the
    // sidebar stays fully in view below it, and content never sits under it.
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(400);
    const chrome = await page.evaluate(() => {
      const header = document.querySelector('.sfm-global-header')?.getBoundingClientRect();
      const sidebar = document.querySelector('.sfm-shared-sidebar')?.getBoundingClientRect();
      const main = document.querySelector('main.invest-main')?.getBoundingClientRect();
      return {
        scrolled: window.scrollY,
        headerTop: header ? Math.round(header.top) : null,
        sidebarTop: sidebar ? Math.round(sidebar.top) : null,
        sidebarBottom: sidebar ? Math.round(sidebar.bottom) : null,
        overlap: main && sidebar
          ? Math.max(0, Math.min(main.right, sidebar.right) - Math.max(main.left, sidebar.left))
          : 0,
        viewport: window.innerHeight,
      };
    });
    expect(chrome.scrolled).toBeGreaterThan(0);
    // Variant 03: the floating header sticks at --app-header-inset-block
    // (10px), not flush against the viewport edge.
    expect(chrome.headerTop).toBeGreaterThanOrEqual(0);
    expect(chrome.headerTop).toBeLessThanOrEqual(12);
    expect(chrome.sidebarTop).toBeGreaterThanOrEqual(64);
    expect(chrome.sidebarBottom).toBeLessThanOrEqual(chrome.viewport + 1);
    expect(chrome.overlap).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // The details dialog backdrop must stack above the sticky header so the
  // dark overlay always covers chrome uniformly, never cards behind chrome.
  const detailsTrigger = card.getByRole('button', { name: 'View details' });
  await detailsTrigger.click();
  const stacking = await page.evaluate(() => ({
    overlay: Number(getComputedStyle(document.querySelector('.invest-overlay')!).zIndex),
    header: Number(getComputedStyle(document.querySelector('.sfm-global-header')!).zIndex),
  }));
  expect(stacking.overlay).toBeGreaterThan(stacking.header);
  await page.locator('.invest-drawer .invest-icon-btn').focus();
  await page.locator('.invest-drawer .invest-icon-btn').press('Enter');
  await expect(page.locator('.invest-overlay')).toHaveCount(0);
  await expect(detailsTrigger).toBeFocused();
});

const tsmAliasInvestments: Array<[label: string, symbol: string, name: string]> = [
  ['ticker TSM', 'TSM', 'Taiwan Semiconductor Manufacturing Company'],
  ['ticker TSMC', 'TSMC', 'Taiwan Semiconductor Manufacturing Company'],
  ['full ADR display name', 'TSM', 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR'],
];

for (const [label, symbol, name] of tsmAliasInvestments) {
  test(`TSM asset card (${label}) shows the verified TSMC logo, not the generic building fallback`, async ({ page }) => {
    const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    let tsmcFaviconRequested = false;
    // Playwright matches routes most-recently-registered-first, so the
    // specific tsmc.com assertion route must be registered LAST to take
    // priority over the generic favicon/simpleicons mocks below it.
    await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
    await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
    await page.route('**tsmc.com**', route => {
      tsmcFaviconRequested = true;
      return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    });

    const tsmInvestment: Investment = {
      ...sampleInvestments[0],
      id: `regression-tsm-${symbol.toLowerCase()}`,
      name,
      symbol,
      providerSymbol: symbol,
      market: 'NYSE',
      assetType: 'stock',
      purchasePlatformId: undefined,
      purchasePlatformName: 'zad',
    };
    await enterPremiumPortfolio(page, 1440, { investments: [tsmInvestment] });

    const card = page.locator('.invest-holding-card').filter({ hasText: name });
    await expect(card).toBeVisible();

    // Exactly one asset visual, and it must be the verified TSMC logo — not
    // the generic Building2 fallback icon that shows for unresolved tickers.
    const avatar = card.locator('.invest-asset-lens .asset-avatar');
    await expect(avatar.locator('img')).toHaveCount(1);
    await expect(avatar.locator('svg')).toHaveCount(0);
    await expect(avatar.locator('img')).toHaveAttribute('src', /tsmc\.com/);
    expect(tsmcFaviconRequested).toBe(true);

    // The ZAD platform badge stays separate secondary ownership metadata —
    // its own element, verified, and not overlapping the asset avatar.
    const platformIdentity = card.locator('.invest-platform-identity');
    await expect(platformIdentity).toBeVisible();
    const platformLogo = card.locator('.invest-platform-logo');
    await expect(platformLogo).toHaveAttribute('data-fallback', 'false');
    await expect(platformLogo.locator('img')).toHaveCount(1);
    const overlap = await page.evaluate(() => {
      const assetBox = document.querySelector('.invest-asset-lens .asset-avatar')?.getBoundingClientRect();
      const platformBox = document.querySelector('.invest-platform-logo')?.getBoundingClientRect();
      if (!assetBox || !platformBox) return -1;
      const xOverlap = Math.max(0, Math.min(assetBox.right, platformBox.right) - Math.max(assetBox.left, platformBox.left));
      const yOverlap = Math.max(0, Math.min(assetBox.bottom, platformBox.bottom) - Math.max(assetBox.top, platformBox.top));
      return xOverlap * yOverlap;
    });
    expect(overlap).toBe(0);
  });
}

test('TSM asset card falls back safely (no broken image, no duplicate icon) when the verified logo request fails', async ({ page }) => {
  const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  // Registered last so it takes priority over the generic favicon mock below
  // (Playwright matches the most-recently-registered route first).
  await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**tsmc.com**', route => route.fulfill({ status: 500 }));

  const tsmInvestment: Investment = {
    ...sampleInvestments[0],
    id: 'regression-tsm-broken-logo',
    name: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR',
    symbol: 'TSM',
    providerSymbol: 'TSM',
    market: 'NYSE',
    assetType: 'stock',
    purchasePlatformId: undefined,
    purchasePlatformName: 'zad',
  };
  await enterPremiumPortfolio(page, 1440, { investments: [tsmInvestment] });

  const card = page.locator('.invest-holding-card').filter({ hasText: 'Taiwan Semiconductor Manufacturing' });
  await expect(card).toBeVisible();
  const avatar = card.locator('.invest-asset-lens .asset-avatar');

  // The broken remote logo must never render as a broken <img>: once it
  // fails to load, AssetAvatar unmounts the image entirely and the single
  // fallback icon takes over — no broken image left behind, no duplicate
  // fallback rendered alongside it.
  await expect(avatar.locator('img')).toHaveCount(0);
  await expect(avatar.locator('svg')).toHaveCount(1);
});

function longNameTsmInvestment(): Investment {
  return {
    ...sampleInvestments[0],
    id: 'regression-tsm-long-name',
    name: 'Taiwan Semiconductor Manufacturing Company Limited American Depositary Shares (Sponsored)',
    symbol: 'TSM',
    providerSymbol: 'TSM',
    market: 'NYSE',
    assetType: 'stock',
    purchasePlatformId: undefined,
    purchasePlatformName: 'zad',
  };
}

async function routeVerifiedLogoHosts(page: Page) {
  const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**tsmc.com**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
}

async function assertLongNameTsmLogoLayout(page: Page, label: string) {
  const card = page.locator('.invest-holding-card').filter({ hasText: 'Taiwan Semiconductor Manufacturing' });
  await expect(card).toBeVisible();
  const avatar = card.locator('.invest-asset-lens .asset-avatar');

  // Exactly one verified asset image, still the TSMC logo under a very long name.
  await expect(avatar.locator('img')).toHaveCount(1);
  await expect(avatar.locator('img')).toHaveAttribute('src', /tsmc\.com/);
  await expect(avatar.locator('svg')).toHaveCount(0);

  // The long name must not push the logo off, clip it, or overlap the ZAD badge.
  const geometry = await card.evaluate(cardEl => {
    const avatarEl = cardEl.querySelector('.invest-asset-lens .asset-avatar') as HTMLElement | null;
    const platformEl = cardEl.querySelector('.invest-platform-logo') as HTMLElement | null;
    const cardBox = cardEl.getBoundingClientRect();
    const a = avatarEl?.getBoundingClientRect();
    const p = platformEl?.getBoundingClientRect();
    const intersect = (x?: DOMRect, y?: DOMRect) => (!x || !y) ? 0
      : Math.max(0, Math.min(x.right, y.right) - Math.max(x.left, y.left))
        * Math.max(0, Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top));
    return {
      avatarW: a ? Math.round(a.width) : 0,
      avatarH: a ? Math.round(a.height) : 0,
      avatarInsideCard: !!a && a.left >= cardBox.left - 1 && a.right <= cardBox.right + 1,
      avatarPlatformOverlap: intersect(a, p),
    };
  });
  // Logo keeps its rendered box (not collapsed/clipped by the long label).
  expect(geometry.avatarW, `${label} avatar width`).toBeGreaterThanOrEqual(40);
  expect(geometry.avatarH, `${label} avatar height`).toBeGreaterThanOrEqual(40);
  expect(geometry.avatarInsideCard, `${label} avatar within card`).toBe(true);
  expect(geometry.avatarPlatformOverlap, `${label} asset/platform overlap`).toBe(0);

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(4);
}

test('long ADR company name never shifts, clips, or overlaps the TSM asset logo (desktop, English LTR)', async ({ page }) => {
  await routeVerifiedLogoHosts(page);
  await enterPremiumPortfolio(page, 1440, { investments: [longNameTsmInvestment()], lang: 'en', theme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await assertLongNameTsmLogoLayout(page, 'en');
});

test('long ADR company name never shifts, clips, or overlaps the TSM asset logo (mobile, Arabic RTL)', async ({ page }) => {
  await routeVerifiedLogoHosts(page);
  await enterPremiumPortfolio(page, 390, { investments: [longNameTsmInvestment()], lang: 'ar', theme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await assertLongNameTsmLogoLayout(page, 'ar');
});
