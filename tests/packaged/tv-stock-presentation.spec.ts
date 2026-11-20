import { expect, test, type Page } from '@playwright/test';
import { chooseTvDestination, openAndroidTvPackage } from './packageHarness';

// Synthetic browser fixtures only; production never receives these quotes.
const changes = [3.38, -4.82, 0, -0, null, -0.004, 1.25, -0.4];
const items = changes.map((changePercent, index) => ({
  symbol: index === 0 ? 'AAPL' : `QA${index}`,
  name: index === 0 ? 'Apple Inc' : `Presentation test company ${index}`,
  nameAr: index === 1
    ? 'شركة اختبار ذات اسم طويل للتحقق من وضوح هوية الشركة ومنع تداخل الأعمدة'
    : `شركة اختبار العرض ${index}`,
  currency: 'USD', region: 'US', changePercent,
}));

async function openStocks(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(theme => {
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language: 'ar', theme, accent: 'champagne', displayMode: 'viewing', autoRotate: false,
    }));
  }, theme);
  const now = new Date().toISOString();
  const retainedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{
    id: 'US', group: 'us', labelAr: 'سوق اختبار', labelEn: 'Test exchange', labelFr: 'Bourse de test',
    count: items.length, status: 'directory',
  }] } }));
  await page.route('**/api/tv/instruments?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const pageNumber = Number(params.get('page') || 0), size = Number(params.get('pageSize') || 6);
    return route.fulfill({ json: {
      items: items.slice(pageNumber * size, (pageNumber + 1) * size),
      total: items.length, directoryTotal: items.length, page: pageNumber, pageSize: size,
    } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const symbols: string[] = JSON.parse(params.get('symbols') || '[]');
    const selected = symbols.length ? items.filter(item => symbols.includes(item.symbol)) : items.slice(0, 6);
    const quotes = selected.map(item => ({
      ...item, price: item.symbol === 'QA1' ? 0.939 : 123.45,
      source: 'Presentation QA source',
      observedAt: item.symbol === 'QA1' ? retainedAt : now, receivedAt: now,
      status: item.symbol === 'QA1' ? 'stale' : 'delayed', delayType: 'delayed',
      exchange: 'US', country: 'US', changeBasis: 'session',
    }));
    return route.fulfill({ json: {
      quotes, group: params.get('group'), total: quotes.length, available: quotes.length, generatedAt: now,
    } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ json: { result: null } }));
  await openAndroidTvPackage(page);
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('.tv-all-stocks .tv-hall-row')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
  return { retainedAt };
}

async function tableGeometry(page: Page) {
  return page.locator('.tv-all-stocks .tv-hall-table').evaluate(table => {
    const headers = Array.from(table.querySelectorAll('[role="columnheader"]'));
    const rows = Array.from(table.querySelectorAll('.tv-hall-row'));
    const alignmentErrors: string[] = [], overflow: string[] = [];
    for (const [rowIndex, row] of rows.entries()) {
      const cells = Array.from(row.querySelectorAll(':scope > [role="cell"]'));
      for (const [index, cell] of cells.entries()) {
        const rect = cell.getBoundingClientRect(), header = headers[index].getBoundingClientRect();
        if (Math.abs(rect.left - header.left) > 2 || Math.abs(rect.right - header.right) > 2) {
          alignmentErrors.push(`${rowIndex}:${index}`);
        }
        if (cell.scrollWidth > cell.clientWidth + 2) overflow.push(`${rowIndex}:${index}:width`);
      }
      const bounds = row.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > innerHeight + 1 || bounds.left < 0 || bounds.right > innerWidth + 1) {
        overflow.push(`${rowIndex}:viewport`);
      }
      if (row.scrollHeight > row.clientHeight + 2) overflow.push(`${rowIndex}:height`);
    }
    return {
      alignmentErrors, overflow,
      rowHeights: rows.map(row => row.getBoundingClientRect().height),
      bodyTop: table.querySelector('.tv-hall-rows')!.getBoundingClientRect().top,
      firstRowTop: rows[0].getBoundingClientRect().top,
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    test(`all-stocks ${theme} ${width}×${height}: aligned readable rows keep their height on sparse pages`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.setViewportSize({ width, height });
      const { retainedAt } = await openStocks(page, theme);
      await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'rtl');

      const rows = page.locator('.tv-all-stocks .tv-hall-row');
      await expect(rows.locator('.tv-asset-icon')).toHaveCount(6);
      const full = await tableGeometry(page);
      expect(full.alignmentErrors).toEqual([]);
      expect(full.overflow).toEqual([]);
      expect(Math.max(...full.rowHeights) - Math.min(...full.rowHeights)).toBeLessThanOrEqual(2);

      // Quote provenance remains visible even as the presentation changes.
      const retained = rows.filter({ has: page.locator('[data-tv-focus-key="hall:QA1"]') });
      await expect(retained.locator('.tv-quote-evidence')).toHaveAttribute('data-status', 'stale');
      await expect(retained.locator('time')).toHaveAttribute('datetime', retainedAt);
      await expect(retained.locator('.tv-scene-source')).toHaveText('Presentation QA source');
      await expect(retained.locator('.tv-hall-price')).toContainText('0.939');
      if (width === 1920) await testInfo.attach(`all-stocks-${theme}-full`, {
        body: await page.screenshot(), contentType: 'image/png',
      });

      await page.locator('[data-tv-focus-key="stocks-next"]').click();
      await expect(rows).toHaveCount(2);
      await expect(rows.first()).toContainText('QA6');
      const sparse = await tableGeometry(page);
      expect(sparse.alignmentErrors).toEqual([]);
      expect(sparse.overflow).toEqual([]);
      expect(Math.abs(sparse.rowHeights[0] - full.rowHeights[0])).toBeLessThanOrEqual(2);
      expect(Math.abs(sparse.firstRowTop - sparse.bodyTop)).toBeLessThanOrEqual(2);
      await expect(page.locator('.tv-headline-band')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.tv-quote-marquee')).toBeInViewport({ ratio: 1 });
      expect(pageErrors).toEqual([]);
    });
  }
}

test('stock movements, logo failure, and remote selection stay understandable without color alone', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openStocks(page, 'dark');
  const rows = page.locator('.tv-all-stocks .tv-hall-row');
  for (const [index, trend] of ['up', 'down', 'flat', 'flat', 'unknown', 'down'].entries()) {
    await expect(rows.nth(index)).toHaveAttribute('data-trend', trend);
    await expect(rows.nth(index).locator('.tv-hall-change-badge svg')).toBeVisible();
    await expect(rows.nth(index).locator('.tv-hall-change-label')).not.toHaveText('');
  }
  await expect(rows.nth(0).locator('.tv-hall-change-badge')).toContainText('+3.38%');
  await expect(rows.nth(1).locator('.tv-hall-change-badge')).toContainText('−4.82%');
  for (const index of [2, 3]) {
    await expect(rows.nth(index).locator('.tv-hall-change-badge')).toHaveText('0.00%');
  }
  await expect(rows.nth(4).locator('.tv-hall-change-badge')).toHaveText('—');
  expect(await rows.nth(4).locator('.tv-hall-change-label').textContent())
    .not.toBe(await rows.nth(3).locator('.tv-hall-change-label').textContent());
  await expect(rows.nth(5).locator('.tv-hall-change-badge')).toContainText('−<0.01%');

  // A verified local logo has the same footprint as its failure fallback.
  const apple = rows.first().locator('.tv-asset-icon');
  const logo = apple.locator('img');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  const before = await apple.boundingBox();
  await logo.dispatchEvent('error');
  await expect(apple.locator('img')).toHaveCount(0);
  await expect(apple.locator('svg')).toBeVisible();
  await expect(apple).toContainText('AAPL');
  const after = await apple.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);

  const target = page.locator('[data-tv-focus-key="hall:QA1"]');
  await page.keyboard.press('Tab');
  await target.focus();
  await expect(target).toBeFocused();
  const focus = await target.evaluate(button => {
    const style = getComputedStyle(button);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText(items[1].nameAr);
  await expect(page.getByRole('dialog').locator('.tv-symbol')).toHaveText('QA1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(target).toBeFocused();
});
