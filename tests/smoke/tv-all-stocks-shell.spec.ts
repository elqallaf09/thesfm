import { closeTvMenu, openTvMenu, chooseTvDestination } from './helpers/tv-controls';
import { expect, test } from '@playwright/test';

// Keep fresh anonymous contexts while inheriting the selected configuration's
// deployment-only Preview protection state. An empty override drops that cookie.

test('TV stock directory occupies the web viewport and keeps its own controls in a light application theme', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    localStorage.setItem('the-sfm-theme', 'light');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', theme: 'dark', displayMode: 'viewing' }));
  });
  const now = new Date().toISOString();
  const items = Array.from({ length: 6 }, (_, index) => ({ symbol: `QA${index}`, name: index ? '*ST Example' : '-1x Test ETF', nameAr: index ? '*ST Example' : '-1x Test ETF', currency: 'USD', region: 'US' }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الولايات المتحدة', labelEn: 'United States', labelFr: 'États-Unis', count: 6, status: 'directory' }] } }));
  await page.route('**/api/tv/instruments?*', route => route.fulfill({ json: { items, total: 6, directoryTotal: 6, page: 0, pageSize: 6 } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: {
      group: params.get('group') || 'global', market: params.get('market') || undefined, scene: params.get('scene') || undefined,
      quotes: items.map(item => ({ ...item, price: 10, changePercent: 1, source: 'Browser test source', observedAt: now, receivedAt: now, status: 'delayed', exchange: 'US' })), total: 6, available: 6, generatedAt: now,
    } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.goto('/tv/all-stocks');
  await closeTvMenu(page);
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-browsing\b/);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar')).toHaveCount(0);
  await page.keyboard.press('Shift');
  const documents: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()); });
  await page.locator('.tv-screen').evaluate(root => root.setAttribute('data-navigation-marker', 'original'));
  await chooseTvDestination(page, 'hall');
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  // pushState changes the URL before React commits the mode. The row count is
  // shared by viewing and browse, so require the destination mode as well.
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-viewing\b/);
  await expect(page.locator('.tv-viewing .tv-hall-content')).toBeVisible();
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await chooseTvDestination(page, 'allStocks');
  await expect(page).toHaveURL(/\/tv\/all-stocks$/);
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-browsing\b/);
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-startup')).toHaveCount(0);
  await chooseTvDestination(page, 'strips');
  await expect(page).toHaveURL(/\/tv\/strips$/);
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-strips-only\b/);
  await expect(page.locator('.tv-strips-only')).toBeVisible();
  await expect(page.locator('.tv-market-strip-item[data-priced="true"]').first()).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  await page.goBack();
  await expect(page).toHaveURL(/\/tv\/all-stocks$/);
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-browsing\b/);
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  await page.goBack();
  await expect(page.locator('.tv-hall-content')).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-viewing\b/);
  await expect(page.locator('.tv-viewing .tv-hall-content')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/tv\/all-stocks$/);
  await expect(page.locator('.tv-screen')).toHaveClass(/\btv-browsing\b/);
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-screen')).toHaveAttribute('data-navigation-marker', 'original');
  expect(documents).toEqual([]);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar, .sfm-route-loading')).toHaveCount(0);
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await page.locator('[data-tv-focus-key=settings-tab-playback]').click();
  await page.locator('[data-tv-focus-key=replay-intro]').click();
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
  await page.reload(); await closeTvMenu(page);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.sfm-global-header, .sfm-shared-sidebar')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  test(`tablet directory keeps Arabic labels and dated prices in their own row in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 872 });
    await page.addInitScript(theme => {
      sessionStorage.setItem('sfm-tv-welcome-shown', '1');
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', theme, autoRotate: false }));
    }, theme);
    const observedAt = '2026-11-19T10:11:00Z', generatedAt = new Date().toISOString();
    const items = Array.from({ length: 12 }, (_, i) => ({ symbol: `TEST${i}`, region: 'US', currency: 'USD', name: 'Mixed-script test company', nameAr: 'Mixed-script test company' }));
    await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
    await page.route('**/api/tv/instruments?*', route => {
      const p = new URL(route.request().url()).searchParams;
      const size = Number(p.get('pageSize')), start = Number(p.get('page')) * size;
      return route.fulfill({ json: { items: items.slice(start, start + size), total: items.length, directoryTotal: items.length } });
    });
    await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: { group: 'world', generatedAt,
      quotes: items.map(item => ({ ...item, exchange: 'US', price: .86, changePercent: -3.37, changeBasis: 'session',
        source: 'Yahoo Finance', status: 'stale', observedAt, receivedAt: observedAt })) } }));
    await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: Array.from({ length: 8 }, (_, i) => ({
      id: `story-${i}`, title: 'خبر أسواق تجريبي', source: 'مصدر الاختبار', publishedAt: generatedAt, url: `https://example.com/news/${i}`,
    })) } }));
    await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { error: { code: 'NO_SAVED_ANALYSIS' } } }));
    await page.goto('/tv/all-stocks');
    await closeTvMenu(page);
    for (const [width, height, count] of [[1536, 872, 6], [1200, 681, 4]]) {
      await page.setViewportSize({ width, height });
      const rows = page.locator('.tv-all-stocks .tv-hall-row');
      await expect(rows).toHaveCount(count);
      await expect(rows.first().locator('time')).toHaveAttribute('datetime', observedAt);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => rows.evaluateAll(rows => rows.every(row => {
        const box = row.getBoundingClientRect();
        return [...row.querySelectorAll('strong, .tv-hall-change-label, .tv-status, time, .tv-hall-price small, .tv-hall-listing')].every(child => {
          const rect = child.getBoundingClientRect();
          return rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1 && rect.height > 0;
        });
      }))).toBe(true);
      await expect(page.locator('.tv-headline-band')).toBeInViewport({ ratio: .99 });
      await expect(page.locator('.tv-quote-marquee')).toBeInViewport({ ratio: .99 });
    }
    await page.locator('.tv-hall-row').first().getByRole('button').click();
    const detail = page.locator('.tv-quote-dialog');
    await expect(detail.locator('.tv-detail-change')).toContainText('3.37%');
    await expect(detail.getByText('لا يوجد تحليل محفوظ صالح لهذا الأصل')).toBeVisible();
    await expect(detail.locator('.tv-phone-link a')).toHaveAttribute('href', /\/ai-analyst\/analyze\/TEST0\?/);
    await expect(detail.locator('.tv-qr')).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);
  });
}
