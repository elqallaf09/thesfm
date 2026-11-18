import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

const instant = '2026-11-18T18:00:00Z';
async function openNews(page: Page, theme: 'light' | 'dark', view: 'hall' | 'world' | 'kuwait' | 'europeNews') {
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ theme, view }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language: 'ar', theme, displayMode: 'viewing', autoRotate: false, sessionAutoRotate: false,
      scene: view === 'world' ? 'world' : 'overview',
      ...(view === 'kuwait' || view === 'europeNews' ? { broadcastChannel: view } : {}),
    }));
  }, { theme, view });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), channel = url.searchParams.get('channel') || 'all';
    const count = url.pathname === '/api/europe-news' ? 24 : channel === 'kuwait' ? 12 : 8;
    const stories = Array.from({ length: count }, (_, index) => ({
      id: `news-${index}`, title: `خبر ${index + 1}: الأسواق العالمية تتابع نتائج الشركات وتطورات أسعار الفائدة`,
      source: 'مصدر الاختبار', publishedAt: instant, url: `https://example.com/news/${index}`,
    }));
    if (url.pathname === '/api/tv/news') return route.fulfill({ json: { stories, channel, generatedAt: instant } });
    if (url.pathname === '/api/europe-news') return route.fulfill({ json: { items: stories, success: true, lastSuccessfulUpdate: instant } });
    if (url.pathname === '/api/tv/snapshot') {
      const quotes = Array.from({ length: 6 }, (_, index) => ({
        symbol: `TEST${index}`, name: `Test company ${index}`, nameAr: `شركة الاختبار ${index}`,
        price: 20 + index, currency: 'USD', changePercent: index % 2 ? 1.1 : -1.3,
        changeBasis: 'session', source: 'Fixture provider', observedAt: instant, receivedAt: instant,
        status: 'available', delayType: 'realtime', exchange: 'QA', country: 'US',
      }));
      return route.fulfill({ json: { summary: quotes.slice(0, 4), quotes, total: 6, available: 6, generatedAt: instant } });
    }
    if (url.pathname === '/api/tv/catalog') return route.fulfill({ json: { markets: [] } });
    return route.fulfill({ json: {} });
  });
  await openAndroidTvPackage(page);
}

for (const theme of ['light', 'dark'] as const) {
  for (const view of ['hall', 'world', 'kuwait', 'europeNews'] as const) {
    test(`${theme} ${view}: all received headlines are simultaneously visible in the TV viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openNews(page, theme, view);
      const board = page.locator('.tv-news-board'), cards = board.locator('.tv-news-board-card');
      const count = view === 'kuwait' ? 12 : view === 'europeNews' ? 24 : 8;
      await expect(cards).toHaveCount(count);
      await expect(board.locator('.tv-broadcast-pager,.tv-headline-playback')).toHaveCount(0);
      const headlines = await cards.allTextContents();
      for (const [width, height] of [[1280, 720], [1920, 1080]]) {
        await page.setViewportSize({ width, height });
        await expect(board).toBeInViewport({ ratio: 1 });
        for (const card of await cards.all()) await expect(card).toBeInViewport({ ratio: 1 });
        await expect.poll(() => board.evaluate(element => {
          const boxes = [element, ...element.querySelectorAll('.tv-news-board-grid,.tv-news-board-card')];
          return boxes.filter(box => box.scrollHeight > box.clientHeight + 2 || box.scrollWidth > box.clientWidth + 2).map(box => box.className);
        })).toEqual([]);
      }
      await page.clock.runFor(80_000);
      await expect(cards).toHaveText(headlines);
      await cards.last().focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toContainText(`خبر ${count}:`);
      await expect(page.getByRole('dialog')).toContainText('مصدر الاختبار');
    });
  }
}
