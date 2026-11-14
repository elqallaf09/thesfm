import { expect, test } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

test('hall retries prices and general news together, retaining real prior values during later errors', async ({ page }) => {
  let fail = true, version = 0, newsRequests = 0;
  const stamp = '2026-11-14T10:00:00Z';
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', theme: 'dark', displayMode: 'viewing', scene: 'overview', autoRotate: false, sessionAutoRotate: false }));
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { markets: [] } });
    if (url.pathname.endsWith('/news')) {
      newsRequests++;
      return fail ? route.fulfill({ status: 503, json: { error: 'SOURCE_UNAVAILABLE' } }) : route.fulfill({ json: { stories: [{
        id: `source-${version}`, title: `Verified headline ${version}`, source: 'Test publisher', publishedAt: stamp, url: 'https://example.com/news',
      }], generatedAt: stamp } });
    }
    if (url.pathname.endsWith('/snapshot')) return fail ? route.fulfill({ status: 503, json: { error: 'SOURCE_UNAVAILABLE' } }) : route.fulfill({ json: {
      group: 'global', generatedAt: stamp, total: 1, available: 1, quotes: [{ symbol: 'QA', name: 'Source instrument', nameAr: 'QA', price: 12.34, currency: 'USD', changePercent: 1.2, source: 'Test provider', observedAt: stamp, receivedAt: stamp, status: 'closed', exchange: 'QA' }],
    } });
    return route.fulfill({ json: {} });
  });
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-hall-error')).toBeVisible();
  await expect(page.locator('.tv-hall-market-table')).toContainText('Update failed');
  await expect(page.locator('.tv-hall-market-table')).not.toContainText('No matching stocks');
  await expect(page.locator('.tv-headline-band .tv-news-status')).toContainText('Update failed');
  const firstRequests = newsRequests;
  fail = false;
  await page.locator('.tv-hall-error button').click();
  await expect(page.locator('.tv-hall-row')).toHaveCount(1);
  await expect(page.locator('.tv-headline-story')).toContainText('Verified headline 0');
  expect(newsRequests).toBeGreaterThan(firstRequests);
  version = 1;
  await page.locator('.tv-viewing-footer button').last().click();
  await expect(page.locator('.tv-headline-story')).toContainText('Verified headline 1');
  fail = true;
  await page.locator('.tv-viewing-footer button').last().click();
  await expect(page.locator('.tv-hall-error')).toBeVisible();
  await expect(page.locator('.tv-hall-row')).toHaveCount(1);
  await expect(page.locator('.tv-headline-story')).toContainText('Verified headline 1');
  await expect(page.locator('.tv-headline-story time')).toHaveAttribute('datetime', stamp);
});
