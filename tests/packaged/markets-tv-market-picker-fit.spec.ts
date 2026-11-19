import { expect, test, type Page } from '@playwright/test';
import type { TvGroup, TvLanguage, TvMarket } from '../../src/lib/markets-tv/types';
import { openAndroidTvPackage } from './packageHarness';

// Synthetic directory only; this stresses the TV layout without live providers.
const groups: TvGroup[] = ['global', 'gulf', 'us', 'europe', 'asia', 'world', 'crypto', 'forex', 'commodities'];
const markets: TvMarket[] = Array.from({ length: 81 }, (_, index) => ({
  id: `QA_${index}`, group: groups[index % groups.length], count: index === 80 ? 0 : 120,
  labelAr: index === 0 || index === 80 ? `بورصة الاختبار الدولية للأوراق المالية ${index + 1}` : `بورصة الاختبار ${index + 1}`,
  labelEn: index === 0 || index === 80 ? `International test securities exchange ${index + 1}` : `Test exchange ${index + 1}`,
  labelFr: index === 0 || index === 80 ? `Bourse internationale des valeurs de test ${index + 1}` : `Bourse de test ${index + 1}`,
  status: index === 80 ? 'unavailable' : 'directory',
}));

async function openPicker(page: Page, language: TvLanguage, theme: 'light' | 'dark', directory = markets) {
  await page.addInitScript(({ language, theme }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, scene: 'world', autoRotate: false }));
  }, { language, theme });
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/catalog')) return route.fulfill({ json: { markets: directory } });
    if (pathname.endsWith('/news')) return route.fulfill({ json: { stories: [] } });
    if (pathname.endsWith('/snapshot')) return route.fulfill({ json: {
      group: 'world', scene: 'world', quotes: [], summary: [], total: 0, available: 0, generatedAt: new Date().toISOString(),
    } });
    return route.fulfill({ json: { items: [], total: 0, directoryTotal: 0, points: [] } });
  });
  await openAndroidTvPackage(page);
  await page.locator('[data-tv-focus-key="customize"]').click();
  await expect(page.locator('.tv-market-picker-fit')).toBeVisible();
  await expect(page.locator('.tv-market-row')).toHaveCount(directory.length);
  await page.evaluate(() => document.fonts.ready);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`market customization ${language} ${theme}: directory and actions fit one TV page`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openPicker(page, language, theme);
      await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
      for (const [width, height] of [[900, 500], [960, 540], [1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        // The unavailable market adds a status paragraph; its editor must
        // also stay above Save instead of silently overlapping the footer.
        for (const index of [0, 80]) {
          await page.locator(`[data-tv-focus-key="market-QA_${index}"]`).click();
          await expect(page.locator('.tv-market-editor h3')).toHaveText(language === 'ar' ? markets[index].labelAr : language === 'en' ? markets[index].labelEn : markets[index].labelFr);
          await expect.poll(() => page.locator('.tv-market-picker-fit').evaluate(element => {
            const dialog = element.closest('[role="dialog"]')!;
            const bounds = dialog.getBoundingClientRect();
            const footer = element.querySelector('.tv-picker-footer')!;
            const footerTop = footer.getBoundingClientRect().top;
            const editor = element.querySelector('.tv-market-editor')!;
            const clipped = [...element.querySelectorAll('button,input')].filter(control => {
              if (!control.getClientRects().length) return false;
              const box = control.getBoundingClientRect();
              return box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom;
            });
            const scroller = element.querySelector('.tv-picker-scroll')!;
            const grid = element.querySelector('.tv-market-list')!;
            return {
              clipped: clipped.map(control => control.getAttribute('data-tv-focus-key') || control.textContent),
              dialogOutsideViewport: bounds.top < 0 || bounds.left < 0 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1,
              dialogScroll: dialog.scrollHeight > dialog.clientHeight + 1,
              pickerScroll: scroller.scrollHeight > scroller.clientHeight + 1 ? {
                clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight,
                scrollerBottom: scroller.getBoundingClientRect().bottom, editorBottom: editor.getBoundingClientRect().bottom,
                paddingBottom: getComputedStyle(scroller).paddingBottom, footerTop,
              } : false,
              gridScroll: grid.scrollHeight > grid.clientHeight + 1,
              editorOverFooter: editor.getBoundingClientRect().bottom > footerTop + 1,
              controlsOverFooter: [...element.querySelectorAll('button,input')].some(control =>
                control.getClientRects().length > 0 && !footer.contains(control) && control.getBoundingClientRect().bottom > footerTop + 1),
            };
          })).toEqual({ clipped: [], dialogOutsideViewport: false, dialogScroll: false, pickerScroll: false, gridScroll: false, editorOverFooter: false, controlsOverFooter: false });
          const name = page.locator('.tv-market-editor h3');
          expect(await name.evaluate(element => element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
        await expect(page.locator('.tv-market-row')).toHaveCount(81);
        const sizes = await page.locator('.tv-market-row strong').evaluateAll(elements =>
          elements.map(element => parseFloat(getComputedStyle(element).fontSize)));
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
        await page.screenshot({ path: testInfo.outputPath(`customize-${language}-${theme}-${width}.png`) });
      }
    });
  }
}

test('market controls keep selection, speed, order and save reachable with the remote', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'light');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-tv-focus-key="market-QA_0"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-tv-focus-key="market-QA_1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="markets-visibility"]')).toBeFocused();
  await expect(page.locator('.tv-market-editor h3')).toHaveText('بورصة الاختبار 2');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-instruments"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-order-up"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-tv-focus-key="markets-order-down"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-speed-default"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-speed-80"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="customize"]')).toBeFocused();
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!));
  expect(settings.marketIds.indexOf('QA_1')).toBe(2);
  expect(settings.marketSpeeds.QA_1).toBe(80);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="markets-visibility"]')).toBeFocused();
  await page.keyboard.press('Enter');
  // Native Android Back is delivered on document, not through the focused node.
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'BrowserBack', bubbles: true, cancelable: true })));
  await expect(page.locator('[data-tv-focus-key="market-QA_1"]')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="customize"]')).toBeFocused();
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!));
  expect(updated.marketIds).not.toContain('QA_1');
  expect(updated.marketIds.indexOf('QA_2')).toBe(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
  await page.locator('[data-tv-focus-key="markets-search"]').fill('missing-market');
  await expect(page.locator('.tv-market-row')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
