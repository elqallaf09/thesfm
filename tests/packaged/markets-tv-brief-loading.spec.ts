import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('brief distinguishes loading and errors from a real empty selection and supports retry by remote', async ({ page }) => {
  let finish: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', scene: 'overview' })));
  let fail = true;
  await page.route('**/api/tv/snapshot?*', async route => {
    await waiting;
    return fail ? route.fulfill({ status: 503, json: { code: 'MARKET_UNAVAILABLE' } })
      : route.fulfill({ json: { group: 'global', scene: 'overview', summary: [], quotes: [], total: 0, available: 0, generatedAt: new Date().toISOString() } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/history', route => route.fulfill({ json: { points: [] } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await page.locator('.tv-scene-tabs button').nth(6).click();
  await expect(page.getByRole('heading', { name: 'Loading brief data' })).toBeVisible();
  await expect(page.locator('.tv-brief-metrics')).toHaveCount(0);
  finish!();
  await expect(page.getByRole('heading', { name: 'Brief data could not be loaded' })).toBeVisible();
  fail = false;
  await page.locator('.tv-brief-dashboard button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'No instruments selected for this brief' })).toBeVisible();
  await expect(page.locator('.tv-brief-metrics')).toHaveCount(0);
});
