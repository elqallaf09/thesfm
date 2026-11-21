import { expect, test, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { chooseTvDestination, closeTvMenu, openAndroidTvPackage, selectTvProfile } from './packageHarness';

const token = 'd'.repeat(64);

async function fixture(page: Page, paired = false) {
  await page.addInitScript(({ token, paired }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    if (!localStorage.getItem('sfm-markets-tv-settings-v1')) {
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', autoRotate: false, sessionAutoRotate: false }));
    }
    if (paired) localStorage.setItem('sfm-markets-tv-device-v1', token);
  }, { token, paired });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/tv/device') return route.fulfill({ json: {
      device: { id: 'navigation-qa', name: 'Navigation QA device', settings: {
        language: 'en', displayMode: 'viewing', broadcastChannel: 'technology', autoRotate: false, sessionAutoRotate: false,
      } }, symbols: [], alerts: [],
    } });
    return route.fulfill({ json: { markets: [], items: [], summary: [], quotes: [], stories: [], points: [], total: 0, available: 0, directoryTotal: 0, generatedAt: new Date().toISOString() } });
  });
}

async function openHostedPackage(page: Page) {
  const root = resolve('.tv-build/web');
  // Exercise the real TV client with website history semantics. Serve only the
  // built local assets; all data requests stay in the fixture above.
  await page.route('https://www.the-sfm.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/')) return route.fallback();
    const asset = ['/tv', '/tv/all-stocks', '/tv/strips'].includes(path) ? '/index.html' : path.replace(/^\/tv\//, '/');
    const file = resolve(root, `.${decodeURIComponent(asset)}`);
    if (!file.startsWith(`${root}${sep}`)) return route.abort();
    const entry = await stat(file).catch(() => null);
    return entry?.isFile() ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://www.the-sfm.com/tv');
  await closeTvMenu(page);
}

test('website brief and map survive reload and Back/Forward, then leave a clean display URL', async ({ page }) => {
  await fixture(page);
  await openHostedPackage(page);
  await chooseTvDestination(page, 'brief');
  await expect(page).toHaveURL('https://www.the-sfm.com/tv?view=brief');
  await page.reload();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'brief');
  await expect(page.locator('.tv-brief-dashboard')).toBeVisible();

  await chooseTvDestination(page, 'map');
  await expect(page).toHaveURL('https://www.the-sfm.com/tv/all-stocks?view=map');
  await page.reload();
  await expect(page.locator('.tv-atlas')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('https://www.the-sfm.com/tv?view=brief');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'brief');
  await page.goForward();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'map');

  await chooseTvDestination(page, 'allStocks');
  await expect(page).toHaveURL('https://www.the-sfm.com/tv/all-stocks');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'markets');
  await page.goBack();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'map');
  await closeTvMenu(page);
  await page.locator('[data-tv-focus-key=atlas-gulf]').click();
  await expect(page).toHaveURL('https://www.the-sfm.com/tv/all-stocks');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'markets');
});

test('packaged features survive reload without adding native Back entries or changing asset paths', async ({ page }) => {
  await fixture(page);
  await openAndroidTvPackage(page);
  const entries = await page.evaluate(() => history.length);
  for (const feature of ['brief', 'map'] as const) {
    await chooseTvDestination(page, feature);
    await expect(page).toHaveURL(`https://appassets.androidplatform.net/index.html?view=${feature}`);
    expect(await page.evaluate(() => history.length)).toBe(entries);
    await page.reload();
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', feature);
  }
  await chooseTvDestination(page, 'hall');
  await expect(page).toHaveURL('https://appassets.androidplatform.net/index.html');
  await page.reload();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'markets');
  await expect(page.locator('.tv-atlas,.tv-brief-dashboard')).toHaveCount(0);
});

test('restored device settings cannot replace a requested map or brief with its saved broadcast', async ({ page }) => {
  await fixture(page, true);
  await openAndroidTvPackage(page, { profile: 0 });
  for (const feature of ['map', 'brief'] as const) {
    await chooseTvDestination(page, feature);
    await page.reload();
    const response = page.waitForResponse(result => new URL(result.url()).pathname === '/api/tv/device' && result.request().method() === 'GET');
    await selectTvProfile(page, 0);
    await response;
    await expect(page.locator('.tv-side-menu-account-name')).toHaveText('Navigation QA device');
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', feature);
    await expect(page).toHaveURL(`https://appassets.androidplatform.net/index.html?view=${feature}`);
  }
});
