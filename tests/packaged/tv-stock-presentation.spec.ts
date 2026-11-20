import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
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

async function openStocks(page: Page, theme: 'light' | 'dark', beforeAllStocks?: () => Promise<void>) {
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
    // Reserve AAPL for All Stocks so the logo test can intercept its first load.
    const selected = symbols.length ? items.filter(item => symbols.includes(item.symbol)) : items.slice(1, 7);
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
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: Array.from({ length: 8 }, (_, index) => ({
    id: `presentation-news-${index}`, title: `خبر تجريبي عن أسواق الأسهم ونتائج الشركات ${index + 1}`,
    source: 'مصدر اختبار', publishedAt: now, url: `https://example.com/presentation-news/${index}`,
  })) } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ json: { result: null } }));
  await page.route('https://financialmodelingprep.com/image-stock/QA*.png', route => route.fulfill({ status: 404, body: '' }));
  await openAndroidTvPackage(page);
  await beforeAllStocks?.();
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('.tv-all-stocks .tv-hall-row')).toHaveCount(6);
  await expect(page.locator('.tv-all-stocks .tv-headline-story')).toHaveCount(8);
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
      rowMetrics: rows.map(row => {
        const bounds = row.getBoundingClientRect();
        return {
          height: bounds.height, clientHeight: row.clientHeight, scrollHeight: row.scrollHeight,
          children: Array.from(row.querySelectorAll('[role="cell"], .tv-hall-identity button, .tv-hall-company-copy, .tv-hall-listing, .tv-hall-change-badge, .tv-hall-change-label, .tv-hall-price strong, .tv-hall-price small')).map(child => ({
            element: child.className || child.tagName,
            top: child.getBoundingClientRect().top - bounds.top,
            height: child.getBoundingClientRect().height,
            clientHeight: child.clientHeight, scrollHeight: child.scrollHeight,
          })),
        };
      }),
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
      expect(full.alignmentErrors, JSON.stringify(full, null, 2)).toEqual([]);
      expect(full.overflow, JSON.stringify(full, null, 2)).toEqual([]);
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
      expect(sparse.alignmentErrors, JSON.stringify(sparse, null, 2)).toEqual([]);
      expect(sparse.overflow, JSON.stringify(sparse, null, 2)).toEqual([]);
      expect(Math.abs(sparse.rowHeights[0] - full.rowHeights[0])).toBeLessThanOrEqual(2);
      expect(Math.abs(sparse.firstRowTop - sparse.bodyTop)).toBeLessThanOrEqual(2);
      await expect(page.locator('.tv-headline-band')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.tv-quote-marquee')).toBeInViewport({ ratio: 1 });
      expect(pageErrors).toEqual([]);
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`all-stocks ${theme} 390×844: cards remain readable and the page scrolls without horizontal overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStocks(page, theme);
    await expect(page.locator('[data-tv-root]')).toHaveClass(new RegExp(`\\btv-${theme}\\b`));
    const rows = page.locator('.tv-all-stocks .tv-hall-row');

    // Exercise real page scrolling, rather than merely forcing an element into view.
    const lastCard = await rows.last().boundingBox();
    await page.mouse.move(195, 700);
    await page.mouse.wheel(0, Math.max(300, lastCard!.y - (844 - lastCard!.height) / 2));
    await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollTop)).toBeGreaterThan(0);
    await expect(rows.last()).toBeInViewport({ ratio: 1 });
    const pageWidth = await page.evaluate(() => ({
      content: document.scrollingElement!.scrollWidth, viewport: document.documentElement.clientWidth,
    }));
    expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport + 1);

    for (const row of await rows.all()) {
      await row.scrollIntoViewIfNeeded();
      for (const selector of ['.tv-asset-icon', '.tv-hall-company-copy strong', '.tv-hall-price', '.tv-hall-change', '.tv-hall-evidence']) {
        await expect(row.locator(selector)).toBeVisible();
        await expect(row.locator(selector)).toBeInViewport({ ratio: 1 });
      }
      const issues = await row.evaluate(card => {
        const bounds = card.getBoundingClientRect(), errors: string[] = [];
        const cells = Array.from(card.querySelectorAll(':scope > [role="cell"]'));
        for (const [index, cell] of cells.entries()) {
          const rect = cell.getBoundingClientRect();
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1
            || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
            || cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1) errors.push(`clipped:${index}`);
          for (const next of cells.slice(index + 1)) {
            const other = next.getBoundingClientRect();
            if (Math.min(rect.right, other.right) - Math.max(rect.left, other.left) > 1
              && Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) > 1) errors.push(`overlap:${index}`);
          }
        }
        return errors;
      });
      expect(issues).toEqual([]);
    }
    await testInfo.attach(`all-stocks-${theme}-mobile`, {
      body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
    });
  });
}

test('stock movements, logo failure, and remote selection stay understandable without color alone', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  let releaseLogo = () => {}, logoRequested = false;
  let loadingSize: { width: number; height: number } | null = null;
  const logoGate = new Promise<void>(release => { releaseLogo = release; });
  try {
    await openStocks(page, 'dark', async () => {
      await page.route('**/markets-tv/assets/aapl.png', async route => {
        logoRequested = true;
        await logoGate;
        await route.fulfill({ path: resolve('.tv-build/web/markets-tv/assets/aapl.png') });
      });
    });
    await expect.poll(() => logoRequested).toBe(true);
    const pending = page.locator('.tv-all-stocks .tv-hall-row').first().locator('.tv-asset-icon');
    await expect(pending).toHaveAttribute('data-logo-state', 'loading');
    await expect(pending.locator(':scope > svg')).toBeVisible();
    await expect(pending.locator(':scope > b')).toHaveText('AAPL');
    await expect(pending.locator('img')).toHaveCSS('opacity', '0');
    const box = await pending.boundingBox();
    expect(box).not.toBeNull();
    loadingSize = { width: box!.width, height: box!.height };
  } finally {
    // Always unblock the fixture, including after a failed pending-state assertion.
    releaseLogo();
  }
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
  await expect(apple).toHaveAttribute('data-logo-state', 'loaded');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(apple.locator(':scope > svg, :scope > b')).toHaveCount(0);
  const before = await apple.boundingBox();
  expect({ width: before?.width, height: before?.height }).toEqual(loadingSize);
  await logo.dispatchEvent('error');
  await expect(apple).toHaveAttribute('data-logo-state', 'fallback');
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
