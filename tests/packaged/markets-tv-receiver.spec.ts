import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Financial values below are isolated browser fixtures, never app fallbacks.
async function open(page: Page, language = 'ar') {
  await page.clock.install({ time: new Date('2026-11-08T07:10:00Z') });
  await page.addInitScript(language => {
    if (!localStorage.getItem('sfm-markets-tv-settings-v1')) localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, broadcastChannel: 'allStocks' }));
  }, language);
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [
    { id: 'US', group: 'us', labelAr: 'الأسهم الأمريكية', labelEn: 'US stocks', labelFr: 'Actions américaines', count: 24, status: 'directory' },
    { id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait', labelFr: 'Bourse du Koweït', count: 12, status: 'directory' },
    { id: 'TD_XTAE', group: 'world', labelAr: 'Excluded', labelEn: 'Excluded', labelFr: 'Excluded', count: 10, status: 'directory' },
  ] } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const kuwait = params.get('market') === 'BOURSA_KUWAIT', size = Number(params.get('pageSize') || 6), page = Number(params.get('page') || 0);
    const quotes = Array.from({ length: size }, (_, index) => ({ symbol: `${kuwait ? 'KW' : 'US'}${page * size + index}`, name: 'A source-backed company name', nameAr: 'شركة استثمار مدرجة في دليل السوق', currency: kuwait ? 'KWD' : 'USD', price: index === 1 ? null : kuwait ? 0.901 : 18.42, changePercent: -1.5, changeBasis: 'session', source: 'QA source', observedAt: '2026-11-06T12:00:00Z', receivedAt: '2026-11-08T07:10:00Z', status: 'closed', exchange: params.get('market'), country: kuwait ? 'KW' : 'US' }));
    return route.fulfill({ json: { quotes, available: size - 1, total: size, directoryTotal: kuwait ? 12 : 24, generatedAt: '2026-11-08T07:10:00Z' } });
  });
  await page.route('**/api/tv/news?*', route => {
    const channel = new URL(route.request().url()).searchParams.get('channel') || 'general';
    return route.fulfill({ json: { channel, stories: Array.from({ length: 6 }, (_, index) => ({ id: `${channel}-${index}`, title: `${channel} ${index} · أخبار الشركات المدرجة ونتائجها المالية وتطورات استثماراتها وأعمالها خلال جلسات التداول الأخيرة مع مصادر وتواريخ النشر الأصلية`, source: 'QA source', publishedAt: '2026-11-08T07:00:00Z', url: 'https://example.com/story' })) } });
  });
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await expect(page.locator('.tv-receiver-quotes .tv-market-strip-item')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
}

test('receiver numbers and channel keys select separate feeds, respect dialogs and survive reload', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page);
  await page.keyboard.press('2');
  await expect(page.locator('.tv-receiver-technology .tv-headline-items')).toContainText('technology');
  await expect(page.locator('.tv-receiver-technology .tv-headline-items')).not.toContainText('kuwait');
  await page.keyboard.press('3');
  await expect(page.locator('.tv-receiver-kuwait .tv-headline-items')).toContainText('kuwait');
  await expect(page.locator('.tv-receiver-quotes .tv-strip-symbol b').first()).toHaveText('KW0');
  await expect(page.locator('.tv-receiver-quotes .tv-strip-price').first()).toContainText('0.901');
  await expect(page.locator('.tv-receiver-quotes .tv-market-strip-item').nth(1).locator('.tv-strip-price')).toHaveCount(0);
  await page.locator('.tv-headline-items button').first().click();
  await page.keyboard.press('4'); await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'kuwait');
  await page.keyboard.press('Escape'); await page.keyboard.press('4');
  await expect(page.locator('.tv-session')).toHaveCount(17);
  await page.keyboard.press('5'); await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'investments');
  await expect(page.locator('.tv-portfolio-gate')).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ChannelDown', bubbles: true }))); await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'sessions');
  await page.keyboard.press('3'); await page.reload();
  await expect(page.locator('.tv-receiver-kuwait .tv-strip-symbol b').first()).toHaveText('KW0');
});

test('all-stock broadcast gives each exchange airtime every forty seconds and remembers batches', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  const pause = page.locator('.tv-receiver-actions button[aria-pressed]');
  await pause.click(); await pause.click();
  await page.clock.runFor(39999); await expect(page.locator('.tv-strip-symbol b').first()).toHaveText('US0');
  await page.clock.runFor(1); await expect(page.locator('.tv-strip-symbol b').first()).toHaveText('KW0');
  await page.clock.runFor(40000); await expect(page.locator('.tv-strip-symbol b').first()).toHaveText('US6');
  await pause.click(); await page.clock.runFor(80000); await expect(page.locator('.tv-strip-symbol b').first()).toHaveText('US6');
  expect(await page.locator('.tv-receiver-actions select option').allTextContents()).not.toContain('Excluded');
});

test('automatic channel batches wait for provider retry windows', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  let requests = 0;
  await page.route('**/api/tv/snapshot?*', route => { requests++; return route.fulfill({ status: 429, headers: { 'Retry-After': '120', 'Access-Control-Expose-Headers': 'Retry-After' }, json: { code: 'RATE_LIMITED' } }); });
  await page.locator('.tv-receiver-actions button').last().click();
  await expect.poll(() => requests).toBe(1);
  await expect(page.locator('.tv-receiver-notice')).toBeVisible();
  await expect(page.locator('.tv-receiver-market')).toHaveAttribute('aria-busy','false');
  await page.clock.runFor(100000);
  expect(requests).toBe(1);
  await expect(page.locator('.tv-strip-symbol b').first()).toHaveText('US0');
});

test('receiver refuses unscoped legacy news instead of mixing general stories into Kuwait', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page);
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [{ id: 'legacy', title: 'GENERAL LEGACY HEADLINE', source: 'QA', publishedAt: '2026-11-08T07:00:00Z', url: 'https://example.com/story' }] } }));
  await page.keyboard.press('3');
  await expect(page.locator('.tv-receiver-news [role=status]')).toBeVisible();
  await expect(page.locator('.tv-headline-items')).not.toContainText('GENERAL LEGACY HEADLINE');
});

for (const language of ['ar','en','fr']) test(`receiver ${language}: complete cards and news fit TV and tablet canvases`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await open(page, language);
  for (const channel of ['allStocks','kuwait','technology']) {
    await page.locator(`[data-tv-focus-key="channel:${channel}"]`).click();
    for (const [width, height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator('.tv-receiver-screen')).toBeInViewport({ ratio: 1 });
      await expect.poll(() => page.locator('.tv-receiver-screen,.tv-receiver-market,.tv-receiver-quotes,.tv-receiver-news,.tv-receiver-quotes .tv-market-strip-item').evaluateAll(elements => elements.flatMap(element => {
        const b = element.getBoundingClientRect();
        return [...element.children].filter(child => { const r = child.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.top < b.top - 2 || r.bottom > b.bottom + 2 || r.left < b.left - 2 || r.right > b.right + 2); }).map(child => ({ parent: element.className, child: child.className }));
      }))).toEqual([]);
      if (channel !== 'technology') expect(await page.locator('.tv-strip-price').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(width === 960 && channel === 'kuwait' ? 20 : width === 960 ? 24 : 28);
      if (channel !== 'allStocks') await expect(page.locator('.tv-headline-items button').first()).toBeInViewport({ ratio: 1 });
    }
  }
  if (language === 'ar') { await page.setViewportSize({ width: 1920, height: 1080 }); await page.locator('[data-tv-focus-key="channel:kuwait"]').click(); await page.screenshot({ path: testInfo.outputPath('receiver-kuwait.png') }); }
});
