import { openAndroidTvPackage, openTvMenu, closeTvMenu } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import type { TvLanguage, TvMarket, TvQuote } from '../../src/lib/markets-tv/types';
import { expectTvMenuRemoteAccess } from '../helpers/tv-menu-layout';

// Layout fixtures only. Synthetic prices are never included in the application.
const markets: TvMarket[] = [
  { id: 'indices', group: 'global', labelAr: 'المؤشرات العالمية', labelEn: 'World indices', labelFr: 'Indices mondiaux', count: 6, status: 'selected' },
  { id: 'kuwait', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait', labelFr: 'Bourse du Koweït', count: 138, status: 'directory' },
  { id: 'sparse', group: 'gulf', labelAr: 'سوق أبوظبي للأوراق المالية', labelEn: 'Abu Dhabi Securities Exchange', labelFr: 'Bourse d’Abou Dabi', count: 1, status: 'selected' },
  { id: 'unavailable', group: 'gulf', labelAr: 'ناسداك دبي', labelEn: 'Nasdaq Dubai', labelFr: 'Nasdaq Dubaï', count: 9, status: 'directory' },
];
async function openStrips(page: Page, language: TvLanguage, theme: 'light' | 'dark') {
  await page.addInitScript(({ language, theme }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, displayMode: 'strips', autoHideControls: false, marketIds: ['indices', 'kuwait', 'sparse', 'unavailable'] }));
  }, { language, theme });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { markets } });
    if (url.pathname.endsWith('/snapshot')) {
      const market = markets.find(entry => entry.id === url.searchParams.get('market')) || markets[0];
      const quotes: TvQuote[] = Array.from({ length: market.id === 'sparse' ? 1 : market.id === 'kuwait' ? 12 : 6 }, (_, i) => ({
        symbol: `QA${i}`, name: `Test company with a complete name ${i}`, nameAr: `شركة الاختبار ذات الاسم الكامل ${i}`,
        price: market.id === 'unavailable' ? null : 7.321 + i, currency: 'KWD', changePercent: -1.26,
        source: 'Verified test provider', observedAt: '2026-11-10T10:14:00Z', receivedAt: '2026-11-10T10:14:00Z',
        status: market.id === 'unavailable' ? 'unavailable' : 'stale', exchange: market.id, country: 'KW', changeBasis: 'session',
      }));
      return route.fulfill({ json: { group: market.group, quotes, total: market.count, directoryTotal: market.count, available: quotes.filter(q => q.price !== null).length, generatedAt: new Date().toISOString() } });
    }
    return route.fulfill({ json: { stories: [], items: [], total: 0 } });
  });
  await openAndroidTvPackage(page);
  await expect(page.locator('[data-market="kuwait"] .tv-strip-price').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`readable strips ${language} ${theme}: named controls, distinct metadata and sparse cards`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openStrips(page, language, theme);
      for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        const menu = await openTvMenu(page);
        await expectTvMenuRemoteAccess(page);
        await expect(page.locator('.tv-header-actions,.tv-viewing-nav,.tv-footer')).toHaveCount(0);
        await page.keyboard.press('Tab');
        await expect.poll(() => menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await closeTvMenu(page);
        await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
        await expect(page.locator('[data-market="sparse"] .tv-market-strip-item')).toHaveCount(1);
        await expect(page.locator('[data-market="sparse"] .tv-market-strip-track')).toHaveCSS('animation-name', 'none');
        const card = page.locator('[data-market="kuwait"] .tv-market-strip-item').first();
        await expect.poll(() => card.evaluate(element => {
          const box = element.getBoundingClientRect();
          const origin = element.querySelector('.tv-evidence-origin')!.getBoundingClientRect();
          const time = element.querySelector('time')!.getBoundingClientRect();
          const evidence = element.querySelector('.tv-strip-evidence')!.getBoundingClientRect();
          return { inside: evidence.left >= box.left && evidence.right <= box.right + 1 && evidence.bottom <= box.bottom + 1,
            separate: origin.bottom <= time.top + 1 || time.bottom <= origin.top + 1 || origin.right <= time.left + 1 || time.right <= origin.left + 1 };
        })).toEqual({ inside: true, separate: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height + 1);
        if (width === 1920 && language === 'ar') await page.screenshot({ path: testInfo.outputPath(`strips-${theme}.png`) });
      }
      // Vertical navigation follows the named actions without requiring Tab.
      await openTvMenu(page);
      await page.locator('[data-tv-focus-key="broadcast:incomeNews"]').focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-tv-focus-key="customize"]')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-tv-dialog]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
    });
  }
}
