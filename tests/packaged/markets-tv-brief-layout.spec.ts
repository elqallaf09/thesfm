import { expect, test, type Page } from '@playwright/test';
import { chooseTvDestination, openAndroidTvPackage } from './packageHarness';
import type { TvLanguage, TvQuote } from '../../src/lib/markets-tv/types';

const observedAt = '2026-11-20T17:25:00Z';
const instruments = [
  ['^NDX', 'Nasdaq 100', 'ناسداك 100'],
  ['^GDAXI', 'DAX 40', 'داكس 40'],
  ['^GSPC', 'S&P 500', 'إس آند بي 500'],
  ['^DJI', 'Dow Jones', 'داو جونز'],
  ['^FTSE', 'FTSE 100', 'فوتسي 100'],
  ['^N225', 'Nikkei 225', 'نيكاي 225'],
];
async function openBrief(page: Page, changes: number[], language: TvLanguage, theme: 'light' | 'dark') {
  await page.clock.install({ time: new Date('2026-11-20T17:27:00Z') });
  const summary = changes.map((changePercent, index): TvQuote => {
    const [symbol, name, nameAr] = instruments[index];
    return { symbol, name, nameAr, changePercent, price: 1000 + index, currency: null, status: 'delayed',
      changeBasis: 'session', delayType: 'delayed', observedAt, receivedAt: observedAt, source: 'QA', exchange: null, country: null };
  });
  await page.addInitScript(settings => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify(settings)), { language, theme });
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: {
    group: 'global', scene: 'overview', summary, quotes: [], available: 0, total: 0, selectionTotal: summary.length, generatedAt: observedAt,
  } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/history', route => route.fulfill({ json: { points: [] } }));
  await openAndroidTvPackage(page);
  await chooseTvDestination(page, 'brief');
  await expect(page.locator('.tv-brief-metrics')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
  test(`one-sided Arabic brief uses the full ranking width in ${theme} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1536, height: 872 });
    await openBrief(page, [-3.77, -2.6, -2.08, -.61], 'ar', theme);
    const rankings = page.locator('.tv-brief-rankings');
    await expect(rankings.getByRole('heading')).toHaveCount(1);
    await expect(rankings.getByRole('heading')).toHaveText('الأعلى انخفاضًا');
    await expect(rankings.locator('.tv-ranking-empty')).toBeVisible();
    await expect(rankings.locator('.tv-brief-change')).toHaveText(['-3.77%', '-2.60%', '-2.08%']);
    await expect(page.locator('.tv-brief-metrics article').first()).toContainText('-2.26%');
    for (const [width, height] of [[1536, 872], [1280, 720], [960, 540], [390, 844]]) {
      await page.setViewportSize({ width, height });
      const group = await rankings.locator('section').boundingBox();
      const bounds = await rankings.boundingBox();
      expect(group!.width).toBeGreaterThanOrEqual(bounds!.width - 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      if (width > 760) {
        await expect(rankings).toBeInViewport({ ratio: .99 });
        await expect(rankings.locator('time').last()).toBeInViewport({ ratio: .99 });
      }
      if (width === 1536) await page.screenshot({ path: testInfo.outputPath(`brief-${theme}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await rankings.getByRole('button').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tv-dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(rankings.getByRole('button').first()).toBeFocused();
  });
}

test('mixed and unchanged readings keep both rankings on a short TV', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await openBrief(page, [.1, .4, .2, -.6, -.1, 0], 'fr', 'dark');
  const groups = page.locator('.tv-brief-group');
  await expect(groups).toHaveCount(2);
  await expect(page.locator('.tv-brief-metrics article').first()).toContainText('0.00%');
  await expect(page.locator('.tv-brief-metrics article').first()).not.toContainText('-0.00%');
  await expect(groups.first().locator('.tv-brief-change')).toHaveText(['+0.40%', '+0.20%', '+0.10%']);
  await expect(groups.last().locator('.tv-brief-change')).toHaveText(['-0.60%', '-0.10%']);
  await expect(page.locator('.tv-brief-breadth + small')).toContainText('1 Stable');
  await expect(page.locator('.tv-ranking-empty')).toHaveCount(0);
  for (const time of await groups.locator('time').all()) await expect(time).toBeInViewport({ ratio: .99 });
});

test('gains take the same full width when no comparable price falls', async ({ page }) => {
  await openBrief(page, [0, .75, 1.5], 'en', 'light');
  const rankings = page.locator('.tv-brief-rankings');
  await expect(rankings).toHaveAttribute('data-single', 'true');
  await expect(rankings.getByRole('heading')).toHaveText('Top gainers');
  await expect(rankings.locator('.tv-brief-change')).toHaveText(['+1.50%', '+0.75%']);
  await expect(rankings.locator('.tv-ranking-empty')).toHaveText('No declines among comparable observations.');
});

test('an entirely flat sample shows one explanation and no mover buttons', async ({ page }) => {
  await openBrief(page, [0, 0], 'en', 'light');
  await expect(page.getByRole('heading', { name: 'Prices hold steady' })).toBeVisible();
  await expect(page.locator('.tv-brief-rankings .tv-ranking-empty')).toHaveText('All comparable prices are unchanged.');
  await expect(page.locator('.tv-ranked-quote')).toHaveCount(0);
});
