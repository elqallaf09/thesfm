import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

const title = 'Goldman Sachs looks to cash in on a new technology listing: what investors are watching across the global stock markets';
async function setup(page: Page, count = 1, news = false) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(news => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', displayMode: news ? 'viewing' : 'browse', ...(news ? { broadcastChannel: 'europeNews' } : {}) })), news);
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), now = new Date().toISOString();
    const items = Array.from({ length: count }, (_, i) => ({ symbol: `QA${i}`, name: `Test ${i}`, nameAr: `اختبار ${i}`, currency: 'USD', region: 'US' }));
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US', labelFr: 'États-Unis', count, status: 'directory' }] } });
    if (url.pathname.endsWith('/instruments')) return route.fulfill({ json: { items, total: count, directoryTotal: count, page: 0, pageSize: 6 } });
    if (url.pathname.endsWith('/snapshot')) return route.fulfill({ json: { quotes: items.map((item, i) => ({ ...item, price: i ? null : 10, changePercent: i ? null : 1, source: 'QA source', observedAt: now, status: i ? 'unavailable' : 'delayed', issue: i ? 'no_price' : undefined, exchange: 'US' })), available: 1, total: count } });
    const stories = Array.from({ length: 24 }, (_, i) => ({ id: String(i), title: `${title} ${i}`, source: 'QA source', publishedAt: now, url: `https://example.com/${i}` }));
    return route.fulfill({ json: { stories, items: stories, topic: url.searchParams.get('topic'), success: true, lastSuccessfulUpdate: now } });
  });
  await openAndroidTvPackage(page);
}

test('welcome uses the official logo and plays an actual audio graph after a click or remote activation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const node = original.call(this), start = node.start.bind(node);
      node.start = (when?: number) => { const scope = window as Window & { sfmToneCount?: number }; scope.sfmToneCount = (scope.sfmToneCount || 0) + 1; start(when); };
      return node;
    };
  });
  await setup(page);
  await expect(page.locator('.sfm-startup')).toBeVisible();
  await expect.poll(() => page.locator('.sfm-startup img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.locator('.tv-intro-replay').click();
  await expect(page.locator('.sfm-startup')).toHaveAttribute('data-sound', 'playing');
  expect(await page.evaluate(() => (window as Window & { sfmToneCount?: number }).sfmToneCount)).toBeGreaterThanOrEqual(3);
  await expect.poll(() => page.locator('.sfm-startup-brand').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.9);
  await page.screenshot({ path: test.info().outputPath('welcome.png') });
  await page.getByRole('button', { name: 'تخطي', exact: true }).click();
  await expect(page.locator('.sfm-startup')).toHaveCount(0);
  await page.locator('.tv-intro-replay').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.sfm-startup')).toHaveAttribute('data-sound', 'playing');
});

test('one quote fills the ticker continuously without a viewport-sized gap', async ({ page }) => {
  await setup(page); await page.keyboard.press('Shift');
  await expect(page.locator('.tv-marquee-set').first().locator('button')).toHaveCount(1);
  await expect.poll(() => page.locator('.tv-marquee-set').count()).toBeGreaterThan(2);
  const uncovered = await page.locator('.tv-marquee-viewport').evaluate(viewport => {
    const track = viewport.querySelector('.tv-marquee-track')!;
    const animation = track.getAnimations()[0]; animation.pause(); animation.currentTime = Number(animation.effect!.getTiming().duration) * .99;
    const bounds = viewport.getBoundingClientRect();
    const ranges = [...viewport.querySelectorAll('button')].map(button => button.getBoundingClientRect()).filter(r => r.right > bounds.left && r.left < bounds.right).sort((a,b) => a.left-b.left);
    let edge = bounds.left, gap = 0; for (const range of ranges) { gap = Math.max(gap, range.left - edge); edge = Math.max(edge, range.right); }
    return Math.max(gap, bounds.right - edge);
  });
  expect(uncovered).toBeLessThanOrEqual(2);
  expect(await page.locator('.tv-marquee-set[aria-hidden=true] [tabindex="0"]').count()).toBe(0);
});

test('unavailable stocks remain in the ticker and news has no boxed transport controls', async ({ page }) => {
  await setup(page, 2); await page.keyboard.press('Shift');
  await expect(page.locator('.tv-marquee-set').first().locator('button')).toHaveCount(2);
  await expect(page.locator('.tv-marquee-set').first().locator('button').last().locator('bdi').first()).toContainText('—');
  await expect(page.locator('.tv-headline-controls')).toHaveCount(0);
  await page.locator('.tv-headline-label').click();
  await expect(page.locator('.tv-headline-label')).toHaveAttribute('aria-pressed', 'true');
});

test('news desk uses the TV area with a readable lead and a queue in 1080p and 540p', async ({ page }) => {
  await setup(page, 1, true); await page.getByRole('button', { name: 'تخطي', exact: true }).click();
  await expect(page.locator('.sfm-startup')).toHaveCount(0);
  for (const [width, height, count] of [[1920, 1080, 6], [960, 540, 3]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.tv-news-desk-grid > button')).toHaveCount(count);
    await expect(page.locator('.tv-news-title').first()).toHaveCSS('direction', 'ltr');
    const clipped = await page.locator('.tv-news-desk-grid > button').evaluateAll(buttons => buttons.filter(button => {
      const r = button.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || button.scrollHeight > button.clientHeight + 2;
    }).length);
    expect(clipped).toBe(0);
    await page.screenshot({ path: test.info().outputPath(`news-desk-${width}.png`) });
  }
});

test('direct news links open the channel and retain subsequent remote selections on reload', async ({ page }) => {
  await setup(page);
  await page.goto('https://appassets.androidplatform.net/index.html?channel=europeNews');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'europeNews');
  await expect(page.locator('.tv-news-desk-grid > button')).toHaveCount(6);
  await page.keyboard.press('2');
  await expect(page).toHaveURL(/channel=technology/);
  await page.reload();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'technology');
});
