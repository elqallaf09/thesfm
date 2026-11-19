import { closeTvMenu, chooseTvDestination } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Browser-only fixtures. No sample quotes or news are included in the application.
const items = Array.from({ length: 83 }, (_, i) => ({ symbol: `QA${i}`, name: `Test company ${i}`, nameAr: `شركة الاختبار ${i}`, currency: 'KWD', region: 'KW' }));
const headline = 'خبر اختبار طويل للتحقق من ظهور العنوان كاملًا: الأسواق العالمية تتابع نتائج الشركات وتطورات الاقتصاد مع استمرار التداول في البورصات الرئيسية';
async function open(page: Page, language = 'ar', mode = 'viewing') {
  await page.addInitScript(({ language, mode }) => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, displayMode: mode, scene: 'overview' })), { language, mode });
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'KW', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 83, status: 'directory' }] } }));
  await page.route('**/api/tv/instruments?*', route => {
    const params = new URL(route.request().url()).searchParams, q = params.get('q') || '', page = Number(params.get('page') || 0), size = Number(params.get('pageSize') || 50);
    const matches = items.filter(item => `${item.symbol} ${item.name} ${item.nameAr}`.includes(q));
    return route.fulfill({ json: { items: matches.slice(page * size, (page + 1) * size), total: matches.length, directoryTotal: items.length, page, pageSize: size } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams, symbols: string[] = JSON.parse(params.get('symbols') || '[]');
    const selected = symbols.length ? items.filter(item => symbols.includes(item.symbol)) : items.slice(0, 6);
    const quotes = selected.map((item, i) => ({ ...item, price: 1.234 + i, changePercent: i % 2 ? -1.2 : 2.1, source: 'Browser test source', observedAt: new Date().toISOString(), receivedAt: new Date().toISOString(), status: 'delayed', delayType: 'delayed', exchange: 'KW', country: 'KW', changeBasis: 'session' }));
    return route.fulfill({ json: { quotes, group: params.get('group'), total: quotes.length, available: quotes.length, generatedAt: new Date().toISOString() } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [headline, 'عنوان الخبر الثاني كاملًا', 'عنوان الخبر الثالث'].map((title, i) => ({ id: String(i), title, source: 'مصدر اختبار', publishedAt: new Date().toISOString(), url: 'https://example.com/news' })) } }));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);await closeTvMenu(page);
  await expect(page.locator('.tv-hall-row')).toHaveCount((page.viewportSize()?.height ?? 1080) <= 650 ? 3 : 6);
  await page.keyboard.press('Shift');
  await expect(page.locator('.sfm-startup')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

for (const [width, height] of [[1920, 1080], [1280, 720], [960, 540]]) {
  test(`hall and all stocks fit ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await open(page);
    await expect(page.locator('.tv-headline-story').first()).toContainText(headline);
    for (const mode of ['viewing', 'browse']) {
      if (mode === 'browse') await chooseTvDestination(page, 'allStocks');
      await expect(page.locator('.tv-hall-row')).toHaveCount(height <= 650 ? 3 : 6);
      const overflow = await page.evaluate(() => {
        const root = document.querySelector('.tv-hall-screen')!;
        const targets = [...document.querySelectorAll('.tv-hall-row, .tv-headline-band, .tv-quote-marquee, .tv-stock-pagination')];
        return { root: root.scrollHeight - root.clientHeight, clipped: targets.filter(el => { const r = el.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.top < -1 || r.right > innerWidth + 1 || r.left < -1; }).map(el => el.className), rows: [...document.querySelectorAll('.tv-hall-row')].some(el => el.scrollHeight > el.clientHeight + 2) };
      });
      expect(overflow).toEqual({ root: 0, clipped: [], rows: false });
    }
  });
}
test('search finds remote directory pages, resets paging and limits quote requests', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page, 'en', 'browse');
  await page.locator('[data-tv-focus-key="stocks-next"]').click();
  await expect(page.locator('.tv-hall-identity').first()).toContainText('QA6');
  await page.getByRole('searchbox').fill('QA82');
  await expect(page.locator('.tv-hall-row')).toHaveCount(1);
  await expect(page.locator('.tv-hall-identity')).toContainText('QA82');
  await expect(page.locator('.tv-stock-pagination')).toContainText('1 / 1');
  const response = page.waitForRequest(request => request.url().includes('/api/tv/instruments?') && new URL(request.url()).searchParams.get('market') === 'KW');
  await page.locator('[data-tv-focus-key="stock-market"]').selectOption('KW'); await response;
  await page.getByRole('searchbox').fill('not found');
  await expect(page.locator('.tv-hall-row')).toHaveCount(0);
  await expect(page.getByText('No matching stocks')).toBeVisible();
});
test('initial and equivalent directory searches do not undo Next', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.clock.install();
  await open(page, 'en');
  // Load the hall normally, then freeze time before All Stocks first mounts.
  // Its initial search timer cannot elapse before we deliberately press Next.
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  const next = page.locator('[data-tv-focus-key="stocks-next"]');
  const first = page.locator('.tv-hall-identity').first();
  const pagination = page.locator('.tv-stock-pagination');
  const search = page.getByRole('searchbox');
  await expect(next).toBeEnabled();
  await next.click();
  await expect(first).toContainText('QA6');
  await page.clock.runFor(301);
  await expect(first).toContainText('QA6');
  await expect(pagination).toContainText('2 / 14');
  await search.fill('   ');
  await page.clock.runFor(301);
  await expect(first).toContainText('QA6');
  await expect(pagination).toContainText('2 / 14');
  // A genuinely changed query still resets to its first page.
  await search.fill('QA');
  await page.clock.runFor(301);
  await expect(first).toContainText('QA0');
  await expect(pagination).toContainText('1 / 14');
  await next.click();
  await expect(first).toContainText('QA6');
  await search.fill(' QA ');
  await page.clock.runFor(301);
  await expect(first).toContainText('QA6');
  await expect(pagination).toContainText('2 / 14');
});

test('ticker really moves, pauses, and exposes no duplicate focus targets', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page);
  const track = page.locator('.tv-marquee-track');
  await expect(page.locator('.tv-quote-marquee')).toHaveAttribute('data-paused', 'false');
  const first = await track.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => track.evaluate(el => getComputedStyle(el).transform)).not.toBe(first);
  await page.locator('[data-tv-focus-key="ticker-pause"]').click();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await expect(page.locator('.tv-marquee-set[aria-hidden=true]')).toHaveAttribute('inert', '');
  expect(await page.locator('.tv-marquee-set[aria-hidden=true] [tabindex="0"]').count()).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
});
test('all headlines remain visible and remote OK opens the full story', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.clock.install(); await open(page);
  const cards = page.locator('.tv-headline-story');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('.tv-headline-playback,.tv-headline-band .tv-broadcast-pager')).toHaveCount(0);
  const headlines = await cards.locator('.tv-news-title').allTextContents();
  await cards.nth(1).focus();
  await page.clock.fastForward(80000);
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('عنوان الخبر الثاني كاملًا');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cards.nth(1)).toBeFocused();
});
for (const language of ['en', 'fr']) test(`hall supports ${language} layout`, async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page, language);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
});
