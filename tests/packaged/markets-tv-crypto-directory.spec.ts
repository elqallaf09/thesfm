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
for (const language of ['ar', 'en'] as const) {
  test(`iPhone crypto quotes ${language}: price, change and evidence fit`, async ({ page }) => {
    const prices = [107948.01, 3471.41, 170.57, 558.37, 0.000295, 0.00000084];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ language }) => {
      sessionStorage.setItem('sfm-tv-welcome-shown', '1');
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
        language, scene: 'crypto', displayMode: 'viewing', autoRotate: false,
        sessionAutoRotate: false, ticker: false,
      }));
    }, { language });
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/tv/snapshot') return route.fulfill({ json: {
        group: 'crypto', scene: 'crypto', page: 0, pageSize: 6, directoryTotal: 229,
        total: 6, available: 6, summary: [],
        quotes: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE'].map((base, index) => ({
          symbol: base + '/USDT', displaySymbol: base + '/USDT',
          name: base + '/USDT', nameAr: base + '/USDT',
          price: prices[index], currency: 'USDT', changePercent: index % 2 ? -0.82 : 16.63,
          changeBasis: '24h', observedAt: '2026-11-22T17:39:00Z',
          source: 'Binance Spot · 24h', exchange: 'BINANCE', status: 'available',
        })),
      } });
      if (url.pathname === '/api/crypto-news') return route.fulfill({ json: { success: true, items: [] } });
      return route.fulfill({ json: { markets: [], stories: [], items: [], total: 0 } });
    });
    await openAndroidTvPackage(page);
    await page.evaluate(() => document.fonts.ready);
    const rows = page.locator('.tv-scene-row');
    await expect(rows).toHaveCount(6);
    for (const width of [375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => rows.evaluateAll(elements => elements.flatMap((element, index) => {
        const row = element.getBoundingClientRect();
        const selectors = ['.tv-scene-identity', '.tv-scene-price', '.tv-scene-change', '.tv-quote-evidence'];
        const boxes = selectors.map(selector => element.querySelector(selector)?.getBoundingClientRect());
        const issues: string[] = [];
        if (element.scrollWidth > element.clientWidth + 2) issues.push(index + ': horizontal row overflow');
        if (boxes.some(box => !box)) issues.push(index + ': missing cell');
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          if (!a) continue;
          if (a.left < row.left - 1 || a.right > row.right + 1 || a.top < row.top - 1 || a.bottom > row.bottom + 1)
            issues.push(index + ': cell outside row ' + i);
          for (let j = i + 1; j < boxes.length; j++) {
            const b = boxes[j];
            if (b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
              && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
              issues.push(index + ': overlapping cells ' + i + ' and ' + j);
          }
        }
        const price = element.querySelector('.tv-scene-price strong');
        if (price) {
          const clip = price.getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(price);
          for (const glyph of range.getClientRects()) {
            if (glyph.left < clip.left - 1 || glyph.right > clip.right + 1)
              issues.push(index + ': price text escapes its cell');
          }
        }
        return issues;
      }))).toEqual([]);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    }
  });
}
