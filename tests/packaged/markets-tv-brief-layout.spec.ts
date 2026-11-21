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
  ['^FCHI', 'CAC 40', 'كاك 40'],
  ['^STOXX50E', 'Euro Stoxx 50', 'يورو ستوكس 50'],
];
async function openBrief(page: Page, changes: (number | Partial<TvQuote>)[], language: TvLanguage, theme: 'light' | 'dark') {
  await page.clock.install({ time: new Date('2026-11-20T17:27:00Z') });
  const summary = changes.map((change, index): TvQuote => {
    const [symbol, name, nameAr] = instruments[index];
    return { symbol, name, nameAr, changePercent: null, price: 1000 + index, currency: null, status: 'delayed',
      changeBasis: 'session', delayType: 'delayed', observedAt, receivedAt: observedAt, source: 'QA', exchange: null, country: null,
      ...(typeof change === 'number' ? { changePercent: change } : change) };
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
    await expect(rankings.locator('.tv-brief-change')).toHaveText(['−3.77%', '−2.60%', '−2.08%']);
    await expect(page.locator('.tv-brief-scope')).toContainText(/100\u200e?%/);
    await expect(page.locator('.tv-brief-distribution i')).toHaveCount(1);
    await expect(page.locator('.tv-brief-leader')).toContainText('ناسداك 100');
    await expect(page.locator('.tv-brief-leader')).toContainText('−3.77%');
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
  await expect(groups.last().locator('.tv-brief-change')).toHaveText(['−0.60%', '−0.10%']);
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
  await expect(page.locator('.tv-brief-leader')).toHaveCount(0);
  await expect(page.locator('.tv-brief-distribution i')).toHaveAttribute('data-trend', 'flat');
  await page.getByRole('button', { name: 'Sample prices' }).click();
  await expect(page.locator('.tv-brief-sample-move')).toHaveText(['0.00%', '0.00%']);
});

test('sample pages preserve evidence and exclude ineligible prices from rankings', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 872 });
  await openBrief(page, [-2, 1, 0, { changePercent: 80, status: 'stale' }, { changePercent: 70, changeBasis: '24h' },
    {}, .1, { price: null, changePercent: 900 }], 'en', 'light');
  const shortcuts = page.locator('.tv-brief-toolbar');
  const leader = shortcuts.getByRole('button', { name: /Largest move/ });
  await expect(leader).toContainText('Nasdaq 100');
  await leader.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(leader).toBeFocused();
  await shortcuts.getByRole('button', { name: 'Highlights' }).focus();
  await page.keyboard.press('ArrowRight');
  const sample = shortcuts.getByRole('button', { name: /Sample prices 7/ });
  await expect(sample).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sample).toHaveAttribute('aria-pressed', 'true');
  const rows = page.locator('.tv-brief-sample-quote');
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(3)).toContainText('Last known price');
  await expect(rows.nth(3)).toContainText('Outside comparison');
  await expect(rows.nth(4)).toContainText('Different change period');
  await expect(rows.nth(5)).toContainText('Change unavailable');
  await expect(rows.nth(3).locator('.tv-brief-sample-move')).toHaveCount(0);
  await expect(rows.nth(3).locator('time')).toHaveAttribute('datetime', observedAt);
  for (const [width, height] of [[960, 540], [1536, 872], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect(rows).toHaveCount(width === 960 ? 3 : 6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    if (width > 760) await expect(rows.last()).toBeInViewport({ ratio: .99 });
  }
  await page.setViewportSize({ width: 960, height: 540 });
  await expect(rows).toHaveCount(3);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(rows.first()).toContainText('Dow Jones');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('CAC 40');
  await rows.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rows.first()).toBeFocused();
  await shortcuts.getByRole('button', { name: 'Highlights' }).click();
  await expect(page.locator('.tv-brief-rankings')).toBeVisible();
});

test('a tie opens every equally large mover with its actual sign', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBrief(page, [-2.5, 2.5, 0, .1], 'ar', 'dark');
  const leaders = page.getByRole('button', { name: /تعادل في أكبر حركة/ });
  await expect(leaders).toContainText('2.50%');
  await leaders.click();
  await expect(leaders).toHaveAttribute('aria-pressed', 'true');
  const subset = page.getByRole('region', { name: 'تعادل في أكبر حركة' });
  await expect(subset.locator('.tv-brief-sample-move')).toHaveText(['−2.50%', '+2.50%']);
  await page.locator('[data-tv-focus-key="brief-sample"]').click();
  await expect(page.locator('.tv-brief-sample-quote')).toHaveCount(4);
});

test('recent prices without comparable changes retain their timestamps and never get a leader', async ({ page }) => {
  await openBrief(page, [{}, { changePercent: 2, changeBasis: 'reference' }], 'en', 'dark');
  await expect(page.getByRole('heading', { name: 'Waiting for comparable prices' })).toBeVisible();
  await expect(page.locator('.tv-brief-distribution,.tv-brief-leader,.tv-brief-saved')).toHaveCount(0);
  await expect(page.locator('.tv-brief-sample-quote time')).toHaveCount(2);
  await expect(page.locator('.tv-brief-excluded')).toHaveText(['Change unavailable', 'Different change period']);
});

test('regional brief opens on Kuwait, keeps a missing benchmark visible and pages to world indices', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 872 });
  await page.clock.install({ time: new Date('2026-11-20T17:27:00Z') });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar' })));
  const symbols = [
    ['KSE:BKA', 'بورصة الكويت · السوق العام', 'KW'], ['^TASI.SR', 'تداول السعودية · تاسي', 'SA'],
    ['DFM:DFMGI', 'سوق دبي المالي · المؤشر العام', 'AE'], ['QSE:GNRI', 'مؤشر بورصة قطر', 'QA'],
    ['^GSPC', 'إس آند بي 500', 'US'], ['^DJI', 'داو جونز', 'US'], ['^NDX', 'ناسداك 100', 'US'],
    ['^FTSE', 'فوتسي 100', 'GB'], ['^GDAXI', 'داكس 40', 'DE'], ['^N225', 'نيكاي 225', 'JP'],
  ];
  await page.route('**/api/tv/snapshot?*', route => {
    const query = new URL(route.request().url()).searchParams;
    const brief = query.get('group') === 'global' && query.get('market') === 'brief' && query.get('pageSize') === '10';
    const quotes = brief ? symbols.map(([symbol, nameAr, country], i) => ({
      symbol, name: symbol, nameAr, country, price: i === 2 ? null : 8000 + i,
      source: i === 2 ? null : 'QA', observedAt: i === 2 ? null : observedAt, receivedAt: observedAt,
      status: i === 2 ? 'unavailable' : 'closed', changePercent: i === 2 ? null : 1, changeBasis: 'session', currency: null,
    })) : [];
    return route.fulfill({ json: { group: 'global', market: brief ? 'brief' : undefined, quotes,
      total: quotes.length, available: brief ? 9 : 0, generatedAt: observedAt } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await openAndroidTvPackage(page);
  await chooseTvDestination(page, 'brief');
  const cards = page.locator('.tv-brief-sample-quote');
  await expect(cards).toHaveCount(6);
  await expect(cards.first()).toContainText('بورصة الكويت · السوق العام');
  await expect(cards.first()).toContainText('نقطة');
  await expect(cards.first().locator('time')).toHaveAttribute('datetime', observedAt);
  await expect(cards.nth(2)).toContainText('غير متاح');
  await expect(cards.nth(2).locator('time')).toHaveCount(0);
  await expect(page.locator('.tv-brief-metrics article').nth(2)).toContainText('9 / 10');
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(cards).toHaveCount(4);
  await expect(cards.last()).toContainText('نيكاي 225');
});
