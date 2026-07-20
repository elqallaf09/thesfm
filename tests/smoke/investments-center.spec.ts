import { expect, test, type Page } from '@playwright/test';
import type { Investment } from '@/types/investment';
import { installOptionalStorageApiCompatibility } from './browser-api-compat';

const baseURL = process.env.E2E_BASE_URL || (process.env.PLAYWRIGHT_HTTPS_LOOPBACK === '1' ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3000');

const records: Investment[] = [
  {
    id: '89e7c6d8-ecdf-4d10-83d7-2ed37b3c5a04', name: 'Missing Logo Holdings', type: 'stocks',
    currentValue: 200, displayValue: 200, displayValueStatus: 'valid', monthlyContribution: 0,
    startDate: '2025-01-01', riskLevel: 'medium', symbol: 'MISSING', providerSymbol: 'MISSING',
    assetType: 'stock', market: 'NASDAQ', currency: 'USD', userCurrency: 'USD',
    purchaseTotal: 150, purchasePlatformName: 'Interactive Brokers',
    valuationSource: 'Official market price', valuationLastUpdatedAt: '2026-07-20T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z',
  },
  {
    id: 'd9d9e4f4-f68d-454b-a2c3-33ff7b13c065', name: 'Kuwait private property', type: 'realEstate',
    currentValue: 0, displayValue: null, displayValueStatus: 'missing', monthlyContribution: 0,
    startDate: '2024-05-01', riskLevel: 'medium', assetType: 'realEstate', currency: 'KWD',
    purchasePlatformName: 'Private seller', createdAt: '2024-05-01T00:00:00.000Z', updatedAt: '2024-05-01T00:00:00.000Z',
  },
];

async function enterCenter(page: Page, lang: 'ar' | 'en' | 'fr', theme: 'light' | 'dark') {
  await installOptionalStorageApiCompatibility(page);
  await page.context().addCookies([{ name: 'sfm_guest', value: 'true', url: baseURL, sameSite: 'Lax' }]);
  await page.addInitScript(({ investments, language, selectedTheme }) => {
    localStorage.setItem('sfm_guest_mode', 'true');
    localStorage.setItem('sfm_guest_investments', JSON.stringify(investments));
    localStorage.setItem('sfm_lang', language);
    localStorage.setItem('the-sfm-theme', selectedTheme);
  }, { investments: records, language: lang, selectedTheme: theme });
  await page.goto('/investments', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: lang === 'ar' ? 'الاستثمارات' : lang === 'fr' ? 'Investissements' : 'Investments' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));
}

test('Investments Center preserves the legacy-read data, canonical handoff, and responsive language/theme shell', async ({ page }) => {
  let missingLogoRequests = 0;
  await page.route('**financialmodelingprep.com/image-stock/MISSING.png', route => {
    missingLogoRequests += 1;
    return route.fulfill({ status: 404, body: '' });
  });

  await enterCenter(page, 'en', 'dark');
  await expect(page.getByText('Legacy-read compatibility stage')).toBeVisible();
  await expect(page.getByText('Missing Logo Holdings')).toBeVisible();
  await expect(page.getByText('Kuwait private property')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Analyze this asset' }).first()).toHaveAttribute('href', /\/ai-analyst\/analyze\/MISSING\?assetType=STOCK/);
  await expect(page.getByRole('link', { name: 'Analyze this asset' }).last()).toHaveAttribute('href', /privateAsset=1/);
  // The resolver may keep an in-flight image node briefly on WebKit, but it
  // must never retry a known missing URL. Phase 6.3 resolver tests cover the
  // final fallback DOM after the error event across the cache boundary.
  expect(missingLogoRequests).toBeLessThanOrEqual(1);

  for (const [lang, theme] of [['ar', 'light'], ['fr', 'dark']] as const) {
    await page.goto('about:blank');
    await enterCenter(page, lang, theme);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `${lang} ${theme} horizontal overflow`).toBeLessThanOrEqual(4);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('details')).toBeVisible();
  await page.locator('details').click();
  await expect(page.locator('details nav a')).toHaveCount(8);
});
