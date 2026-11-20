import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chooseTvDestination } from '../helpers/tv-navigation';

const instant = new Date('2026-11-20T17:20:00Z');

async function openAtlas(page: Page, language: string, theme: string) {
  await page.clock.setFixedTime(instant);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, displayMode: 'browse' }));
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
  }, { language, theme });
  await page.route('**/api/tv/**', route => route.fulfill({ json: { markets: [], items: [], quotes: [], stories: [], total: 0, directoryTotal: 0 } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await chooseTvDestination(page, 'map');
  await expect(page.locator('.tv-atlas-clock')).toHaveCount(4);
}

for (const [language, theme, width, height] of [
  ['ar', 'light', 1536, 872], ['ar', 'dark', 1920, 1080], ['fr', 'light', 960, 540], ['en', 'dark', 390, 844],
] as const) {
  test(`atlas clocks, map points and local art fit ${language} ${theme} ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openAtlas(page, language, theme);
    await expect(page.locator('.tv-atlas-clock time')).toHaveText(['20:20', '17:20', '12:20', '02:20']);
    await expect(page.locator('[data-region=asia] .tv-atlas-weekday')).toHaveText({ ar:'السبت', en:'Saturday', fr:'samedi' }[language]);
    await expect(page.locator('.tv-atlas-cover img')).toHaveJSProperty('naturalWidth', 1280);
    expect(await page.locator('.tv-atlas-land').evaluate(async el => {
      const img = new Image();
      img.src = getComputedStyle(el).webkitMaskImage.slice(5,-2);
      await img.decode();
      return img.naturalWidth;
    })).toBe(2200);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator('.tv-atlas-clock, .tv-atlas-pin-name').evaluateAll(nodes =>
      nodes.every(el => {
        const { left, top, right, bottom } = el.getBoundingClientRect();
        return left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight;
      }))).toBe(true);
  });
}

test('both the map and remote open the regional directory and All stocks restores the world list', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 872 });
  await openAtlas(page, 'ar', 'light');
  for (const region of ['us', 'europe', 'asia', 'gulf']) {
    const requested = page.waitForRequest(req => req.url().includes('/api/tv/instruments?') && new URL(req.url()).searchParams.get('group') === region);
    if (region === 'europe') {
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-tv-focus-key="atlas-gulf"]')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-tv-focus-key="atlas-europe"]')).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await page.locator(`.tv-atlas-pin[data-region="${region}"]`).click();
    }
    await requested;
    await expect(page.locator('[data-tv-focus-key="stock-market"]')).toHaveValue(region);
    await chooseTvDestination(page, 'map');
  }
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('[data-tv-focus-key="stock-market"]')).toHaveValue('');
});
