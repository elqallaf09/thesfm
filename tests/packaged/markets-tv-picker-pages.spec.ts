import { openAndroidTvPackage, openTvMenu } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import type { TvGroup, TvLanguage, TvMarket } from '../../src/lib/markets-tv/types';
import { TV_STRIP_SPEEDS, TV_GROUPS } from '../../src/lib/markets-tv/types';
import { tvText } from '../../src/lib/markets-tv/i18n';
import { sessionText } from '../../src/lib/markets-tv/sessionCopy';

// Synthetic directory fixtures exercise large catalogs without live providers.
const groups: TvGroup[] = ['gulf', 'us', 'europe', 'asia'];
const directoryGroups = TV_GROUPS.filter(group => group !== 'watchlist');
const markets: TvMarket[] = Array.from({ length: 17 }, (_, index) => ({
  id: `QA_${index}`, group: groups[index % groups.length], count: index === 16 ? 0 : 120,
  labelAr: `بورصة الشركات والاستثمارات ${index + 1}`,
  labelEn: `Companies and investments exchange ${index + 1}`,
  labelFr: `Bourse des entreprises et investissements ${index + 1}`,
  status: index === 16 ? 'unavailable' : 'directory',
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
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key="customize"]').click();
  await expect(page.locator('.tv-market-picker-tv')).toBeVisible();
  await expect(page.locator('.tv-market-row')).toHaveCount(directory.length);
  await page.evaluate(() => document.fonts.ready);
}

async function expectOnePage(page: Page) {
  await expect.poll(() => page.locator('.tv-market-picker-tv').evaluate(element => {
    const dialog = element.closest('[role="dialog"]')!;
    const bounds = dialog.getBoundingClientRect();
    const footer = element.querySelector('.tv-picker-footer')!;
    const footerTop = footer.getBoundingClientRect().top;
    const scroller = element.querySelector('.tv-picker-scroll')!;
    const grid = element.querySelector('.tv-market-list')!;
    const editor = element.querySelector('.tv-market-editor')!;
    const controls = [...element.querySelectorAll('button,input')].filter(control => control.getClientRects().length);
    return {
      clipped: controls.filter(control => {
        const box = control.getBoundingClientRect();
        return box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom;
      }).map(control => control.getAttribute('data-tv-focus-key') || control.textContent),
      dialogOutsideViewport: bounds.top < 0 || bounds.left < 0 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1,
      dialogScroll: dialog.scrollHeight > dialog.clientHeight + 1,
      pickerScroll: scroller.scrollHeight > scroller.clientHeight + 1,
      gridScroll: grid.scrollHeight > grid.clientHeight + 1,
      editorScroll: editor.scrollHeight > editor.clientHeight + 1,
      editorOverFooter: editor.getBoundingClientRect().bottom > footerTop + 1,
      controlsOverFooter: controls.some(control => !footer.contains(control) && control.getBoundingClientRect().bottom > footerTop + 1),
    };
  })).toEqual({ clipped: [], dialogOutsideViewport: false, dialogScroll: false, pickerScroll: false,
    gridScroll: false, editorScroll: false, editorOverFooter: false, controlsOverFooter: false });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`market customization ${language} ${theme}: all markets and options fit one TV page`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openPicker(page, language, theme);
      const done = page.locator('[data-tv-focus-key="markets-done"]');
      await expect(done).toHaveText(sessionText(language, 'done'));
      await expect(done).toBeFocused();
      for (const [width, height] of [[900, 500], [960, 540], [1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        for (const index of [0, 16]) {
          await page.locator(`[data-tv-focus-key="market-QA_${index}"]`).click();
          await expectOnePage(page);
          const name = page.locator('.tv-market-editor h3');
          expect(await name.evaluate(element => element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
        await expect(page.locator('.tv-market-row')).toHaveCount(markets.length);
        expect(await page.locator('.tv-market-row strong').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
        await expect(done).toBeInViewport({ ratio: 1 });
        if (language === 'ar') await page.screenshot({ path: testInfo.outputPath(`picker-${width}-${theme}.png`) });
      }
    });
  }
}

for (const language of ['ar', 'en', 'fr'] as const) {
test(`large market directory ${language}: one canvas with full selected names and no pagination`, async ({ page }) => {
  const directory: TvMarket[] = Array.from({ length: 81 }, (_, index) => ({
    ...markets[index % markets.length], id: `QA_${index}`, group: directoryGroups[index % directoryGroups.length], count: index === 80 ? 0 : 120, status: index === 80 ? 'unavailable' : 'directory',
    labelAr: index === 0 || index === 80 ? `بورصة الاختبار الدولية للأوراق المالية ${index + 1}` : `بورصة الاختبار ${index + 1}`,
    labelEn: index === 80 ? 'International test securities exchange 81' : `Test exchange ${index + 1}`,
    labelFr: index === 80 ? 'Bourse internationale des valeurs de test 81' : `Bourse de test ${index + 1}`,
  }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, language, 'light', directory);
  for (const [width, height] of [[900, 500], [960, 540], [1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-tv-focus-key="market-QA_80"]').click();
    await expect(page.locator('.tv-market-editor h3')).toHaveText(language === 'ar' ? directory[80].labelAr : language === 'en' ? directory[80].labelEn : directory[80].labelFr);
    await expectOnePage(page);
    await expect(page.locator('.tv-market-row')).toHaveCount(81);
    const sizes = await page.locator('.tv-market-row strong').evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).fontSize)));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
  }
  expect(await page.locator('.tv-market-row').evaluateAll(rows => rows.map(row => row.getAttribute('data-tv-focus-key')))).toEqual(directory.map(market => `market-${market.id}`));
  await expect(page.locator('.tv-market-pagination')).toHaveCount(0);
  await page.locator('[data-tv-focus-key="markets-search"]').fill('QA_80');
  await expect(page.locator('.tv-market-row')).toHaveCount(1);
  await expect(page.locator('.tv-market-row')).toHaveAttribute('data-tv-focus-key', 'market-QA_80');
});

}

test('remote changes the region and enters its results with arrows and OK without Tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'light');
  await page.locator('[data-tv-focus-key="markets-region-all"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-tv-focus-key="markets-region-gulf"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="markets-region-gulf"]')).toHaveText(tvText('ar', 'gulf'));
  await expect(page.locator('[data-tv-focus-key="markets-region-gulf"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tv-market-row')).toHaveCount(5);
  await expect(page.locator('.tv-market-row').first()).toHaveAttribute('data-tv-focus-key', 'market-QA_0');
  await expect(page.locator('.tv-market-row').last()).toHaveAttribute('data-tv-focus-key', 'market-QA_16');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('.tv-market-list')))).toBe(true);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeInViewport({ ratio: 1 });
});

test('remote opens market options, reaches save, and preserves order, selection and speed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'dark');
  await page.locator('[data-tv-focus-key="market-QA_5"]').focus();
  await expect(page.locator('.tv-market-editor h3')).toHaveText(markets[5].labelAr);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="market-visible"]')).toBeFocused();
  const fast = page.locator(`[data-tv-focus-key="market-speed-${TV_STRIP_SPEEDS[2]}"]`);
  // Every editor option is already visible; traversal preserves the fixed footer.
  for (const key of ['market-instruments', 'market-up', 'market-speed-inherit', `market-speed-${TV_STRIP_SPEEDS[1]}`]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`[data-tv-focus-key="${key}"]`)).toBeFocused();
    if (key === 'market-up') {
      await page.keyboard.press('Enter');
      const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!).marketIds as string[]);
      expect(ids.indexOf('QA_5')).toBe(4);
    }
  }
  await page.keyboard.press('ArrowLeft');
  await expect(fast).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fast).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
  await page.locator('[data-tv-focus-key="market-visible"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="market-visible"]')).toHaveAttribute('aria-checked', 'false');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'BrowserBack', bubbles: true, cancelable: true })));
  await expect(page.locator('[data-tv-focus-key="market-QA_5"]')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('[data-tv-focus-key="markets-done"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!));
  expect(settings.marketIds).not.toContain('QA_5');
  expect(settings.marketIds).toContain('QA_0');
  expect(settings.marketIds).toContain('QA_16');
  expect(settings.marketSpeeds.QA_5).toBe(TV_STRIP_SPEEDS[2]);
  // Reopening uses the cached lazy component. Its focus effect must not replace
  // the persistent opener captured by the parent dialog's remote handler.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.keyboard.press('Enter');
    await expect(page.locator('.tv-side-menu')).toBeVisible();
    await page.locator('[data-tv-focus-key="customize"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
  }
});

test('remote skips disabled options and still reaches save for a single empty market', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'light', [{ ...markets[0], count: 0, status: 'unavailable' }]);
  await page.locator('[data-tv-focus-key="market-QA_0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="market-visible"]')).toBeFocused();
  await expect(page.locator('[data-tv-focus-key="market-instruments"]')).toBeDisabled();
  await expect(page.locator('[data-tv-focus-key="market-up"]')).toBeDisabled();
  await expect(page.locator('[data-tv-focus-key="market-down"]')).toBeDisabled();
  for (const key of ['market-speed-inherit', `market-speed-${TV_STRIP_SPEEDS[1]}`, 'markets-done']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`[data-tv-focus-key="${key}"]`)).toBeFocused();
  }
  await page.locator('[data-tv-focus-key="market-visible"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="market-visible"]')).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
});
