import { expect, test, type Page } from '@playwright/test';
import type { TvLanguage } from '../../src/lib/markets-tv/types';
import { openAndroidTvPackage } from './packageHarness';

async function openPicker(page: Page, language: TvLanguage, theme = 'light') {
  await page.addInitScript(({ language, theme }) => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
    language, theme, scene: 'world', displayMode: 'viewing', autoRotate: false, sessionAutoRotate: false,
  })), { language, theme });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { summary: [], quotes: [], total: 0, available: 0 } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
  await openAndroidTvPackage(page);
  await page.keyboard.press('Shift');
  const hours = page.locator('[data-tv-focus-key="view:sessions"]');
  await hours.focus(); await page.keyboard.press('Enter');
  const choose = page.locator('[data-tv-focus-key=sessions-choose]');
  await choose.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-focus-key=sessions-done]')).toBeFocused();
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const viewport of [{ width: 900, height: 500 }, { width: 960, height: 540 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    test(`${language} session chooser shows all 81 exchanges and Save on one ${viewport.width} screen`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openPicker(page, language, viewport.width === 1280 ? 'light' : 'dark');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('checkbox')).toHaveCount(81);
      await expect(page.locator('.tv-session-picker-pages')).toHaveCount(0);
      await expect.poll(() => page.locator('.tv-session-picker button,.tv-session-picker input').evaluateAll(elements => elements.flatMap(element => {
        const rect = element.getBoundingClientRect();
        return rect.top < 0 || rect.bottom > innerHeight + 1 || rect.left < 0 || rect.right > innerWidth + 1
          ? [element.getAttribute('data-tv-focus-key')] : [];
      }))).toEqual([]);
      const grid = await page.locator('.tv-session-options').evaluate(element => ({
        height: element.clientHeight, scrollHeight: element.scrollHeight,
        minCell: Math.min(...Array.from(element.children).map(child => child.getBoundingClientRect().height)),
        font: parseFloat(getComputedStyle(element.querySelector('strong')!).fontSize),
      }));
      expect(grid.scrollHeight).toBeLessThanOrEqual(grid.height + 1);
      expect(grid.minCell).toBeGreaterThanOrEqual(viewport.width < 1200 ? 20 : 24);
      expect(grid.font).toBeGreaterThanOrEqual(13);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
      if (language === 'ar') await page.screenshot({ path: testInfo.outputPath(`sessions-${viewport.width}.png`) });
    });
  }
}

test('RTL remote grid reaches Save, preserves selection and handles local Back before global settings', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'ar');
  const save = page.locator('[data-tv-focus-key=sessions-done]'), cells = page.getByRole('checkbox');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-tv-focus-key="sessions-region:all"]')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(cells.first()).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(cells.nth(1)).toBeFocused();
  const wasChecked = await cells.nth(1).getAttribute('aria-checked');
  await page.keyboard.press('Enter'); await expect(cells.nth(1)).toHaveAttribute('aria-checked', wasChecked === 'true' ? 'false' : 'true');
  await page.keyboard.press('ArrowDown'); await expect(cells.nth(7)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(cells.nth(6)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(cells.nth(6)).toBeFocused();
  for (let row = 2; row < 14; row++) { await page.keyboard.press('ArrowDown'); await expect(cells.nth(row * 6)).toBeFocused(); }
  await page.keyboard.press('ArrowDown'); await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-session-picker')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=sessions-choose]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cells.nth(1)).toHaveAttribute('aria-checked', wasChecked === 'true' ? 'false' : 'true');

  // A dialog opened above an embedded editor owns Back until it closes.
  await page.locator('[data-tv-focus-key=settings]').click();
  await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect(page.locator('.tv-session-picker')).toBeVisible();
  await expect(save).toBeFocused();
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', keyCode: 4, bubbles: true })));
  await expect(page.locator('.tv-session-picker')).toHaveCount(0);
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=sessions-choose]')).toBeFocused();
});

test('chooser keeps Tab and channel keys scoped while search retains native editing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPicker(page, 'en');
  const search = page.locator('[data-tv-focus-key=sessions-search]');
  await search.focus(); await page.keyboard.type('London');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Backspace');
  await expect(search).toHaveValue('Londn');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-tv-focus-key=sessions-done]')).toBeFocused();
  await page.keyboard.press('5');
  await expect(page.locator('.tv-session-picker')).toBeVisible();
  await expect(page.locator('[data-tv-focus-key=sessions-done]')).toBeFocused();
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press('Tab');
    expect(await page.locator('.tv-session-picker').evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=sessions-choose]')).toBeFocused();
});

test('small-screen remote reaches the next exchange page and saves with arrows and OK only', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  await openPicker(page, 'ar');
  const cells = page.getByRole('checkbox'), next = page.locator('[data-tv-focus-key=session-picker-next]');
  await expect(cells).toHaveCount(12);
  await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 3 && !(await cells.first().evaluate(element => element === document.activeElement)); step++) await page.keyboard.press('ArrowDown');
  await expect(cells.first()).toBeFocused();
  for (let row = 1; row < 4; row++) await page.keyboard.press('ArrowDown');
  await expect(cells.nth(9)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-session-picker-pages bdi')).toHaveText('2 / 7');
  await page.keyboard.press('ArrowUp'); await expect(cells.nth(9)).toBeFocused();
  const key = await cells.nth(9).getAttribute('data-tv-focus-key');
  const id = key!.replace('choose-session:', ''), wasChecked = await cells.nth(9).getAttribute('aria-checked');
  await page.keyboard.press('Enter');
  await expect(cells.nth(9)).toHaveAttribute('aria-checked', wasChecked === 'true' ? 'false' : 'true');
  await page.keyboard.press('ArrowDown'); await expect(next).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.locator('[data-tv-focus-key=sessions-done]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-session-picker')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=sessions-choose]')).toBeFocused();
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1') || '{}').sessionIds?.includes(id), id)).toBe(wasChecked !== 'true');
});
