import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage, openTvMenu, closeTvMenu } from './packageHarness';

const settingsKey = 'sfm-markets-tv-settings-v1';
const languages = [
  { code: 'ar', name: 'العربية', dir: 'rtl', title: 'إعدادات الشاشة' },
  { code: 'en', name: 'English', dir: 'ltr', title: 'Display settings' },
  { code: 'fr', name: 'Français', dir: 'ltr', title: 'Réglages de l’écran' },
] as const;

async function openSettings(page: Page) {
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await expect(page.locator('.tv-settings-dialog')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function fixture(page: Page, theme: 'dark' | 'light' = 'dark') {
  await page.addInitScript(({ key, theme }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    // Seed once so reload tests exercise saved user preferences.
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      language: 'ar', theme, accent: 'champagne', autoRotate: false,
      rotationSeconds: 60, sound: false, ticker: true,
    }));
  }, { key: settingsKey, theme });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/tv/catalog') return route.fulfill({ json: { markets: [] } });
    if (path === '/api/tv/snapshot') return route.fulfill({ json: {
      group: 'global', summary: [], quotes: [], available: 0, total: 0,
      generatedAt: '2026-11-19T22:00:00Z',
    } });
    return route.fulfill({ json: { stories: [], items: [], points: [], total: 0 } });
  });
  await openAndroidTvPackage(page);
  await openSettings(page);
}

for (const theme of ['dark', 'light'] as const) {
  test(`settings ${theme}: language names and dialog fit 720p and 1080p in every language`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await fixture(page, theme);
    const dialog = page.locator('.tv-settings-dialog');
    const options = dialog.locator('.tv-language-options');
    for (const size of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      for (const language of languages) {
        await options.getByRole('button', { name: language.name, exact: true }).click();
        await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', language.code);
        await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', language.dir);
        await expect(dialog.locator('#tv-dialog-title')).toHaveText(language.title);
        await expect(options.locator('button[aria-pressed=true]')).toHaveCount(1);
        await expect(dialog).toBeInViewport({ ratio: 1 });
        const metrics = await options.locator('button').evaluateAll(buttons => buttons.map(button => {
          const bounds = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
          const clipped: string[] = [];
          let textNode: Node | null;
          while ((textNode = walker.nextNode())) {
            if (!textNode.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            for (const rect of range.getClientRects()) {
              if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1
                || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) clipped.push(textNode.textContent);
            }
          }
          return { height: bounds.height, fontSize: Number.parseFloat(style.fontSize), clipped,
            overflow: button.scrollHeight > button.clientHeight + 1 || button.scrollWidth > button.clientWidth + 1 };
        }));
        expect(metrics).toHaveLength(3);
        for (const metric of metrics) {
          expect(metric.height).toBeGreaterThanOrEqual(52);
          expect(metric.fontSize).toBeGreaterThanOrEqual(18);
          expect(metric.clipped).toEqual([]);
          expect(metric.overflow).toBe(false);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width + 1);
        if (language.code === 'ar') await page.screenshot({ path: testInfo.outputPath(`settings-${theme}-${size.width}.png`) });
      }
    }
  });
}

test('settings language persists and remote can reach the last control and close without losing focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await fixture(page);
  const dialog = page.locator('.tv-settings-dialog');
  const options = dialog.locator('.tv-language-options');
  const appearance = dialog.locator('#tv-settings-tab-appearance');
  const display = dialog.locator('#tv-settings-tab-display');
  const playback = dialog.locator('#tv-settings-tab-playback');
  await appearance.focus();
  await appearance.dispatchEvent('keydown', { key: 'Unidentified', keyCode: 37, bubbles: true });
  await expect(display).toBeFocused();
  await expect(display).toHaveAttribute('aria-selected', 'true');
  await display.dispatchEvent('keydown', { key: 'Unidentified', keyCode: 39, bubbles: true });
  await expect(appearance).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(display).toBeFocused();
  await expect(display).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.locator('#tv-settings-panel-display')).toBeVisible();
  await page.keyboard.press('End');
  await expect(playback).toBeFocused();
  await expect(playback).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(appearance).toBeFocused();
  await expect(appearance).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Tab');
  await expect(options.getByRole('button', { name: 'العربية', exact: true })).toBeFocused();
  const english = options.getByRole('button', { name: 'English', exact: true });
  await page.keyboard.press('ArrowLeft');
  await expect(english).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).language, settingsKey)).toBe('en');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), settingsKey);
  expect(saved).toMatchObject({ rotationSeconds: 60, autoRotate: false, sound: false, ticker: true });

  // Tab order is trapped in the dialog and scrolls every setting into view.
  // Shift+Tab from its first control reaches its last control without a mouse.
  await playback.click();
  const close = dialog.locator(':scope > header button');
  const last = dialog.locator('#tv-settings-panel-playback').locator('button, summary').last();
  await close.focus();
  const headerTop = (await dialog.locator('header').boundingBox())!.y;
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport({ ratio: 1 });
  expect((await dialog.locator('header').boundingBox())!.y).toBeCloseTo(headerTop, 0);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  const notes = dialog.locator('.tv-settings-info > p');
  await expect(notes.first()).toBeFocused();
  await expect(notes.first()).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('ArrowDown');
  await expect(notes.last()).toBeFocused();
  await expect(notes.last()).toBeInViewport({ ratio: 1 });
  expect((await dialog.locator('header').boundingBox())!.y).toBeCloseTo(headerTop, 0);
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();

  await page.reload();
  await closeTvMenu(page);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await openSettings(page);
  await expect(options.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await options.getByRole('button', { name: 'Français', exact: true }).click();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
});
