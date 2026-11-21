import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chooseTvDestination } from '../helpers/tv-navigation';

test.use({ timezoneId: 'Asia/Kuwait' });

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
    await expect(page.locator('.tv-atlas-pin')).toHaveCount(12);
    await expect(page.locator('.tv-atlas-cover img')).toHaveJSProperty('naturalWidth', 1280);
    const geography = page.locator('img.tv-atlas-land');
    await expect(geography).toBeVisible();
    await expect(geography).toHaveJSProperty('naturalWidth', 2200);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator('.tv-atlas-clock, .tv-atlas-pin-name').evaluateAll(nodes =>
      nodes.every(el => {
        const { left, top, right, bottom } = el.getBoundingClientRect();
        return left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight;
      }))).toBe(true);
  });
}

test('map previews and remote clock cards open the regional directory and All stocks restores the world list', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 872 });
  await openAtlas(page, 'ar', 'light');
  for (const region of ['us', 'europe', 'asia', 'gulf']) {
    const requested = page.waitForRequest(req => req.url().includes('/api/tv/instruments?') && new URL(req.url()).searchParams.get('group') === region);
    if (region === 'europe') {
      await page.locator('[data-tv-focus-key="atlas-gulf"]').focus();
      await expect(page.locator('[data-tv-focus-key="atlas-gulf"]')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-tv-focus-key="atlas-europe"]')).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      const pin = page.locator(`.tv-atlas-pin[data-region="${region}"][data-labelled="true"]`);
      await pin.click();
      await expect(pin).toHaveAttribute('data-active', 'true');
      await page.locator(`[data-tv-focus-key="atlas-${region}"]`).click();
    }
    await requested;
    await expect(page.locator('[data-tv-focus-key="stock-market"]')).toHaveValue(region);
    await chooseTvDestination(page, 'map');
  }
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('[data-tv-focus-key="stock-market"]')).toHaveValue('');
});

test('every country selects its own bundled illustration and manual selection holds until resumed', async ({ page }) => {
  await page.clock.install({ time: instant });
  await openAtlas(page, 'ar', 'dark');
  const cover = page.locator('.tv-atlas-cover img');
  for (const code of ['kw', 'gb', 'us', 'jp', 'bh', 'fr', 'it', 'sa', 'ae', 'qa', 'om', 'in']) {
    await expect(cover).toHaveAttribute('data-country', code);
    await expect(cover).toHaveAttribute('src', code === 'kw' ? /kuwait-atlas\.webp$/ : new RegExp('/atlas/' + code + '\\.jpg$'));
    expect(await cover.evaluate(async element => { const img = element as HTMLImageElement; await img.decode(); return img.naturalWidth; })).toBeGreaterThan(600);
    await expect(page.locator('.tv-atlas-pin[data-active=true]')).toHaveAttribute('data-country', code);
    if (code === 'bh') await expect(page.locator('.tv-atlas-landmark')).toContainText('دلمون');
    await page.locator('[data-tv-focus-key=atlas-next]').click();
  }
  await expect(cover).toHaveAttribute('data-country', 'kw');
  await page.locator('[data-tv-focus-key=atlas-prev]').click();
  await page.clock.fastForward(11000);
  await expect(cover).toHaveAttribute('data-country', 'in');
  await page.locator('[data-tv-focus-key=atlas-play]').click();
  await page.clock.fastForward(11000);
  await expect(cover).toHaveAttribute('data-country', 'kw');
});

test.describe('local country on first visit', () => {
  test.use({ timezoneId: 'Europe/Paris' });
  test('opens with France when the device clock is set to Paris', async ({ page }) => {
    await openAtlas(page, 'ar', 'dark');
    await expect(page.locator('.tv-atlas-cover h1')).toHaveText('فرنسا');
    await expect(page.locator('.tv-atlas-landmark')).toHaveText('برج إيفل');
    await expect(page.locator('.tv-atlas-clock[data-region=europe] time')).toHaveText('18:20');
  });
});
