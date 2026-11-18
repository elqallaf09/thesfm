import { expect, test, type Page } from '@playwright/test';
import type { TvGroup, TvLanguage, TvMarket } from '../../src/lib/markets-tv/types';
import { TV_STRIP_SPEEDS } from '../../src/lib/markets-tv/types';
import { tvText } from '../../src/lib/markets-tv/i18n';
import { sessionText } from '../../src/lib/markets-tv/sessionCopy';
import { openAndroidTvPackage } from './packageHarness';

// Synthetic directory fixtures exercise large catalogs without live providers.
const groups: TvGroup[] = ['gulf', 'us', 'europe', 'asia'];
const markets: TvMarket[] = Array.from({ length: 17 }, (_, index) => ({
  id: `QA_${index}`, group: groups[index % groups.length], count: 120,
  labelAr: `بورصة الشركات والاستثمارات ${index + 1}`,
  labelEn: `Companies and investments exchange ${index + 1}`,
  labelFr: `Bourse des entreprises et investissements ${index + 1}`,
  status: 'directory',
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
  await expect(page.locator('.tv-market-picker-tv')).toBeVisible();
  await expect(page.locator('.tv-market-row')).toHaveCount(Math.min(4, directory.length));
  await page.evaluate(() => document.fonts.ready);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`market pages ${language} ${theme}: readable rows and save stay inside the TV dialog`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openPicker(page, language, theme);
      const done = page.locator('[data-tv-focus-key="markets-done"]');
      await expect(done).toHaveText(sessionText(language, 'done'));
      await expect(done).toBeFocused();
      for (const [width, height] of [[1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        await expect(done).toBeInViewport({ ratio: 1 });
        await expect.poll(() => page.locator('.tv-market-picker-tv').evaluate(element => {
          const dialog = element.closest('[role="dialog"]')!;
          const bounds = dialog.getBoundingClientRect();
          // The editor intentionally scrolls independently; all directory and
          // footer controls must be fully in view, even at 720p.
          const outside = [...element.querySelectorAll('.tv-market-picker-controls button,.tv-market-picker-controls input,.tv-market-picker-controls select,.tv-market-row,.tv-market-pagination button,.tv-picker-footer button')]
            .filter(control => {
              const box = control.getBoundingClientRect();
              return box.left < bounds.left || box.right > bounds.right || box.top < bounds.top || box.bottom > bounds.bottom;
            }).map(control => control.getAttribute('data-tv-focus-key'));
          const list = element.querySelector('.tv-market-list')!;
          const rowsOverflow = [...list.querySelectorAll('.tv-market-row')].filter(row => {
            const bounds = row.getBoundingClientRect();
            return [...row.children].some(child => {
              const box = child.getBoundingClientRect();
              return box.top < bounds.top || box.bottom > bounds.bottom || box.left < bounds.left || box.right > bounds.right;
            });
          }).length;
          return { outside, rowsOverflow, dialogScroll: dialog.scrollHeight > dialog.clientHeight + 1,
            listScroll: list.scrollHeight > list.clientHeight + 1 };
        })).toEqual({ outside: [], rowsOverflow: 0, dialogScroll: false, listScroll: false });
        expect(await page.locator('.tv-market-row strong').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
        if (language === 'ar') await page.screenshot({ path: testInfo.outputPath(`picker-${width}-${theme}.png`) });
      }
    });
  }
}

test('market pagination reaches the entire directory without shrinking or duplicating rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'light');
  const seen: string[] = [];
  for (let index = 0; index < 5; index++) {
    seen.push(...await page.locator('.tv-market-row').evaluateAll(rows => rows.map(row => row.getAttribute('data-tv-focus-key')!)));
    await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeInViewport({ ratio: 1 });
    if (index < 4) {
      await page.locator('[data-tv-focus-key="markets-next"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.tv-market-row').first()).toHaveAttribute('data-tv-focus-key', `market-QA_${(index + 1) * 4}`);
    }
  }
  expect(seen).toEqual(markets.map(market => `market-${market.id}`));
  await expect(page.locator('[data-tv-focus-key="markets-next"]')).toBeDisabled();
  await page.locator('[data-tv-focus-key="markets-search"]').fill('QA_1');
  await expect(page.locator('.tv-market-row').first()).toHaveAttribute('data-tv-focus-key', 'market-QA_1');
  await expect(page.locator('[data-tv-focus-key="markets-previous"]')).toBeDisabled();
});

test('remote changes the region and exits its filter with arrows and OK without Tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'light');
  await expect(page.locator('.tv-market-region-current strong')).toHaveText(tvText('ar', 'allMarkets'));
  // Establish the starting control, then exercise only physical-remote keys.
  // A native select used to consume every arrow and trap focus in this filter.
  await page.locator('[data-tv-focus-key="region-prev"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-tv-focus-key="region-next"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-market-region-current strong')).toHaveText(tvText('ar', 'gulf'));
  await expect(page.locator('.tv-market-row')).toHaveCount(4);
  await expect(page.locator('.tv-market-row').first()).toHaveAttribute('data-tv-focus-key', 'market-QA_0');
  await expect(page.locator('.tv-market-row').last()).toHaveAttribute('data-tv-focus-key', 'market-QA_12');
  await expect(page.locator('[data-tv-focus-key="markets-previous"]')).toBeDisabled();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="markets-all"]')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeInViewport({ ratio: 1 });
});

test('remote opens market options, reaches save, and preserves selection and speed across pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar', 'dark');
  await page.locator('[data-tv-focus-key="markets-next"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-tv-focus-key="market-QA_5"]').focus();
  await expect(page.locator('.tv-market-editor h3')).toHaveText(markets[5].labelAr);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key="market-visible"]')).toBeFocused();
  const fast = page.locator(`[data-tv-focus-key="market-speed-${TV_STRIP_SPEEDS[2]}"]`);
  // Traversal must expose the bottom options without letting the footer scroll.
  for (const key of ['market-instruments', 'market-up', 'market-speed-inherit', `market-speed-${TV_STRIP_SPEEDS[1]}`]) {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(`[data-tv-focus-key="${key}"]`)).toBeFocused();
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
  await page.locator('[data-tv-focus-key="markets-done"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="customize"]')).toBeFocused();
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!));
  expect(settings.marketIds).not.toContain('QA_5');
  expect(settings.marketIds).toContain('QA_0');
  expect(settings.marketIds).toContain('QA_16');
  expect(settings.marketSpeeds.QA_5).toBe(TV_STRIP_SPEEDS[2]);
  // Reopening uses the cached lazy component. Its focus effect must not replace
  // the persistent opener captured by the parent dialog's remote handler.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tv-focus-key="markets-done"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key="customize"]')).toBeFocused();
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
