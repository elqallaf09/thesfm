import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('TV stock directory occupies the web viewport and keeps its own controls in a light application theme', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    localStorage.setItem('the-sfm-theme', 'light');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', theme: 'dark', displayMode: 'viewing' }));
  });
  const now = new Date().toISOString();
  const items = Array.from({ length: 6 }, (_, index) => ({ symbol: `QA${index}`, name: index ? '*ST Example' : '-1x Test ETF', nameAr: index ? '*ST Example' : '-1x Test ETF', currency: 'USD', region: 'US' }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الولايات المتحدة', labelEn: 'United States', labelFr: 'États-Unis', count: 6, status: 'directory' }] } }));
  await page.route('**/api/tv/instruments?*', route => route.fulfill({ json: { items, total: 6, directoryTotal: 6, page: 0, pageSize: 6 } }));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { quotes: items.map(item => ({ ...item, price: 10, changePercent: 1, source: 'Browser test source', observedAt: now, receivedAt: now, status: 'delayed', exchange: 'US' })), total: 6, available: 6, generatedAt: now } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.goto('/tv/all-stocks');
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar')).toHaveCount(0);
  await page.keyboard.press('Shift');
  const documents: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()); });
  await page.locator('.tv-screen').evaluate(root => root.setAttribute('data-navigation-marker', 'original'));
  await page.locator('.tv-mode-viewing').click();
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await page.locator('.tv-mode-browse').click();
  await expect(page).toHaveURL(/\/tv\/all-stocks$/);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-startup')).toHaveCount(0);
  await page.locator('.tv-mode-strips').click();
  await expect(page).toHaveURL(/\/tv\/strips$/);
  await expect(page.locator('.tv-strips-only')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.tv-hall-content')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  expect(documents).toEqual([]);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar, .sfm-route-loading')).toHaveCount(0);
  await page.locator('.tv-intro-replay').click();
  await expect(page.locator('.sfm-startup')).toBeVisible();
  await page.keyboard.press('Shift');
  await expect(page.locator('.tv-hall-listing small').first()).toHaveText('الولايات المتحدة');
  await expect.poll(() => page.locator('.tv-screen').evaluate(root => {
    const box = root.getBoundingClientRect();
    return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) };
  })).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
  const style = await page.getByRole('searchbox').evaluate(input => ({ text: getComputedStyle(input).webkitTextFillColor, color: getComputedStyle(input).color, size: parseFloat(getComputedStyle(input).fontSize), background: getComputedStyle(input).backgroundColor }));
  expect(style.text).toBe(style.color);
  expect(style.size).toBeGreaterThanOrEqual(18);
  expect(style.background).not.toBe('rgb(255, 255, 255)');
  await expect(page.locator('.tv-headline-band')).toBeInViewport({ ratio: 1 });
  await page.reload();
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar')).toHaveCount(0);
});
