import { expect, test } from '@playwright/test';
import { chooseTvDestination, openAndroidTvPackage, openTvMenu } from './packageHarness';
import { TV_NEWS_TOPICS } from '../../src/lib/markets-tv/newsReceiver';

test('crypto pages, topic images, currency flags and direct news access in the Arabic receiver', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
    language: 'ar', scene: 'crypto', displayMode: 'viewing', autoRotate: false,
  })));
  const bases = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'LINK', 'LTC'];
  const image = 'https://publisher.example/story.png';
  await page.route(image, route => route.fulfill({ path: 'public/brand/sfm-original-logo.png' }));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), group = url.searchParams.get('group');
    if (url.pathname === '/api/crypto-news') return route.fulfill({ json: { success: true, items: [{
      id: 'crypto-example', title: 'خبر العملات الرقمية', source: 'Publisher', imageUrl: image,
      publishedAt: new Date().toISOString(), url: 'https://publisher.example/crypto',
    }] } });
    if (url.pathname !== '/api/tv/snapshot') return route.fulfill({ json: { stories: [], channel: 'all' } });
    const pageNumber = Number(url.searchParams.get('page')), pageSize = Number(url.searchParams.get('pageSize'));
    const symbols = group === 'crypto' ? bases.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize).map(base => base + '/USDT') : ['EUR/USD'];
    return route.fulfill({ json: {
      group, scene: group === 'crypto' ? 'crypto' : undefined, page: pageNumber, pageSize, summary: [],
      directoryTotal: group === 'crypto' ? bases.length : 1, total: symbols.length, available: symbols.length,
      quotes: symbols.map(symbol => ({ symbol, name: symbol, nameAr: symbol, price: 1, currency: symbol.split('/')[1], changePercent: 1,
        changeBasis: '24h', observedAt: new Date().toISOString(), source: 'Fixture', exchange: group === 'crypto' ? 'BINANCE' : 'FOREX', status: 'available' })),
    } });
  });
  await openAndroidTvPackage(page);
  const rows = page.locator('.tv-scene-row');
  await expect(rows).toHaveCount(6);
  await expect(rows.first().locator('.tv-asset-icon')).toHaveAttribute('data-logo-state', 'loaded');
  await expect(page.locator('.tv-scene-sidebar .tv-news-thumbnail img').first()).toHaveAttribute('src', image);
  const next = page.locator('.tv-scene-panel-heading nav button').last();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('LINK/USDT');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rows.first()).toContainText('BTC/USDT');
  await openTvMenu(page);
  const drawer = page.locator('.tv-side-menu');
  for (const topic of TV_NEWS_TOPICS) {
    await expect(drawer.locator(`[data-tv-focus-key="menu:${topic}"]`)).toHaveCount(1);
  }
  const cryptoNews = drawer.locator('[data-tv-focus-key="menu:cryptoNews"]');
  await cryptoNews.focus();
  await page.keyboard.press('Enter');
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('.tv-news-topics')).toHaveCount(0);
  await expect(page.locator('.tv-receiver-cryptoNews h1')).toHaveText('أخبار العملات الرقمية');
  await chooseTvDestination(page, 'forex');
  const flags = page.locator('.tv-receiver-forex .tv-pair-flags').first();
  await expect(flags.locator('[data-region="EU"]')).toBeVisible();
  await expect(flags.locator('[data-region="US"]')).toBeVisible();
});
