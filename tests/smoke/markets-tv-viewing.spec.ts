import { expect, test, type Page } from '@playwright/test';

// Synthetic prices are confined to this browser test. Production scenes use the
// same source-backed snapshot API as the existing market browser.
function snapshot(scene = 'overview', observedAt = new Date().toISOString(), missing = false) {
  const quote = (index: number) => ({
    symbol: `QA${index}`, name: `Scene test asset ${index}`, nameAr: `أصل المشهد ${index}`,
    price: missing ? null : 123.45 + index, currency: 'USD',
    changePercent: missing ? null : index % 2 ? -1.25 : 2.5,
    exchange: 'QA', country: 'QA', source: 'Synthetic browser fixture',
    observedAt: missing ? null : observedAt, receivedAt: missing ? null : observedAt,
    status: missing ? 'unavailable' : 'available', delayType: 'realtime', changeBasis: 'session',
    ...(missing ? { issue: 'timeout' } : {}),
  });
  return { group: scene === 'gulf' ? 'gulf' : 'global', scene, generatedAt: new Date().toISOString(),
    summary: Array.from({ length: 4 }, (_, index) => quote(index)),
    quotes: Array.from({ length: 6 }, (_, index) => quote(index + 4)),
    available: missing ? 0 : 6, total: 6, selectionTotal: 10 };
}

async function fixtures(page: Page) {
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: snapshot(new URL(route.request().url()).searchParams.get('scene') || 'overview') }));
}

test('default viewing requests a bounded scene and keeps watchlist access private', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixtures(page);
  const requests: URL[] = [];
  page.on('request', request => { if (request.url().includes('/api/tv/')) requests.push(new URL(request.url())); });
  await page.goto('/tv');
  await expect(page.locator('.tv-viewing')).toBeVisible();
  await expect(page.locator('.tv-scene-summary')).toHaveCount(4);
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  await expect(page.locator('.tv-scene-ticker')).toHaveCount(1);
  await expect(page.locator('.tv-scene-coverage-total')).toContainText('10 / 10');
  expect(requests.filter(url => url.pathname === '/api/tv/catalog')).toHaveLength(0);
  expect(requests.filter(url => url.pathname === '/api/tv/snapshot').map(url => url.search)).toEqual(['?group=global&scene=overview&pageSize=10']);

  await page.locator('[data-tv-focus-key="scene:gulf"]').click();
  await expect(page.locator('[data-tv-focus-key="scene:gulf"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => requests.filter(url => url.searchParams.get('scene') === 'gulf').length).toBe(1);
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'خريطة التغيّر', exact: true }).click();
  await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(6);
  await expect(page.locator('.tv-scene-panel-heading')).toContainText('عينة المشهد');

  await page.locator('[data-tv-focus-key="scene:watchlist"]').click();
  await expect(page.locator('.tv-viewing-empty')).toBeVisible();
  expect(requests.some(url => url.searchParams.get('scene') === 'watchlist')).toBe(false);
});

test('partial quote failure retains both row and summary source times without becoming live', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixtures(page);
  const observedAt = new Date(Date.now() - 60_000).toISOString();
  let failed = false;
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: snapshot('overview', observedAt, failed) }));
  await page.goto('/tv');
  const row = page.locator('.tv-scene-row').first();
  const summary = page.locator('.tv-scene-summary').first();
  await expect(row).toContainText('127.45');
  await expect(summary).toContainText('123.45');
  await expect(row.locator('time')).toHaveAttribute('dateTime', observedAt);
  await expect(summary.locator('time')).toHaveAttribute('dateTime', observedAt);
  failed = true;
  await page.getByRole('button', { name: 'تحديث الأسعار', exact: true }).click();
  await expect(row.locator('.tv-status')).toHaveAttribute('data-status', 'stale');
  await expect(summary.locator('.tv-status')).toHaveAttribute('data-status', 'stale');
  await expect(row).toContainText('127.45');
  await expect(summary).toContainText('123.45');
  await expect(row.locator('time')).toHaveAttribute('dateTime', observedAt);
  await expect(summary.locator('time')).toHaveAttribute('dateTime', observedAt);
  await page.getByRole('button', { name: 'خريطة التغيّر', exact: true }).click();
  await expect(page.locator('.tv-scene-heatmap > button')).toHaveCount(0);
  await expect(page.getByText('لا توجد تغيّرات موثقة كافية للخريطة', { exact: true })).toBeVisible();
});

test('viewing fits 720p, 1080p and 4K, keeps remote focus and supports three languages', async ({ page }) => {
  await fixtures(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/tv');
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      last: document.querySelector('.tv-scene-row:last-child')?.getBoundingClientRect().bottom,
      ticker: document.querySelector('.tv-scene-ticker')?.getBoundingClientRect().top }));
    expect(metrics.width).toBeLessThanOrEqual(viewport.width + 2);
    expect(metrics.height).toBeLessThanOrEqual(viewport.height + 2);
    expect(metrics.last).toBeLessThan(metrics.ticker!);
    // A viewport can fit while fixed-height grid rows still overlap each other.
    const overflowingRows = await page.locator('.tv-scene-row').evaluateAll(rows => rows.flatMap(row => {
      const bounds = row.getBoundingClientRect();
      return Array.from(row.children).filter(child => {
        const content = child.getBoundingClientRect();
        return content.top < bounds.top - 1 || content.bottom > bounds.bottom + 1;
      }).map(child => child.className);
    }));
    expect(overflowingRows).toEqual([]);
    const captionSizes = await page.locator([
      '.tv-scene-source', '.tv-scene-evidence time', '.tv-scene-change small',
      '.tv-scene-price small', '.tv-scene-summary-value small', '.tv-viewing-footer',
    ].join(',')).evaluateAll(elements => elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(Math.min(...captionSizes)).toBeGreaterThanOrEqual(12);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  const settings = page.locator('[data-tv-focus-key="settings"]');
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('.tv-language-setting select').selectOption('en');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[data-tv-root]')).toHaveClass(/tv-light/);

  const row = page.locator('.tv-scene-row').first();
  await row.click();
  await expect(page.locator('canvas.tv-qr')).toBeVisible();
  await expect.poll(() => page.locator('canvas.tv-qr').evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width !== 260 || canvas.height !== 260) return false;
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) return false;
    return pixels.some((value, index) => index % 4 === 0 && value === 0 && pixels[index + 3] === 255);
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
  await settings.click();
  await page.locator('.tv-language-setting select').selectOption('fr');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('remote media keys control rotation and interaction postpones the next scene', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixtures(page);
  await page.clock.install();
  await page.goto('/tv');
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  const overview = page.locator('[data-tv-focus-key="scene:overview"]');
  await page.keyboard.press('MediaPlayPause');
  await expect(page.locator('[data-tv-focus-key="scene-playback"]')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(20_000);
  await overview.focus();
  await page.keyboard.press('ArrowLeft');
  await page.clock.fastForward(20_000);
  await expect(overview).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(11_000);
  await expect(page.locator('[data-tv-focus-key="scene:gulf"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('MediaPlayPause');
  await expect(page.locator('[data-tv-focus-key="scene-playback"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.tv-scene-ticker')).toHaveAttribute('data-paused', 'true');
});

test('a short linked watchlist keeps its prices visible and counts each instrument once', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixtures(page);
  const settings = { displayMode: 'viewing', scene: 'watchlist', language: 'ar' };
  await page.addInitScript(value => {
    localStorage.setItem('sfm-markets-tv-device-v1', 'synthetic-browser-device');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify(value));
  }, settings);
  await page.route('**/api/tv/device', route => route.fulfill({ json: {
    device: { id: 'qa-device', name: 'Synthetic TV', settings }, symbols: ['QA0', 'QA1'], alerts: [],
  } }));
  let empty = false;
  await page.route('**/api/tv/snapshot?*', route => {
    const body = snapshot('watchlist');
    return route.fulfill({ json: { ...body, group: 'watchlist', summary: empty ? [] : body.summary.slice(0, 2),
      quotes: [], total: 0, available: 0, selectionTotal: empty ? 0 : 2 } });
  });
  await page.goto('/tv');
  await expect(page.locator('.tv-scene-summary')).toHaveCount(2);
  await expect(page.locator('.tv-scene-row')).toHaveCount(2);
  await expect(page.locator('.tv-scene-coverage-total')).toContainText('2 / 2');
  await expect(page.getByText('لا تتوفر أسعار موثقة لهذا المشهد الآن', { exact: true })).toHaveCount(0);
  empty = true;
  await page.getByRole('button', { name: 'تحديث الأسعار', exact: true }).click();
  await expect(page.getByText('قائمة المتابعة فارغة. أضف أصولك من الموقع أو الهاتف.', { exact: true })).toBeVisible();
  await expect(page.locator('.tv-scene-row')).toHaveCount(0);
});

test('an unavailable scene keeps instruments readable and explains the source cooldown', async ({ page }) => {
  await fixtures(page);
  const retryAt = new Date(Date.now() + 300_000).toISOString();
  await page.route('**/api/tv/snapshot?*', route => {
    const body = snapshot('gulf', undefined, true);
    for (const quote of [...body.summary, ...body.quotes]) quote.issue = 'rate_limited';
    return route.fulfill({ json: { ...body, retryAt } });
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/tv');
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
  await expect(page.locator('.tv-data-notice')).toContainText('حد الطلبات لدى المصدر');
  await expect(page.locator('.tv-data-notice time')).toHaveAttribute('dateTime', retryAt);
  await expect(page.locator('[data-tv-focus-key="source-retry"]')).toBeDisabled();
  await expect(page.locator('.tv-scene-no-data')).toHaveCount(0);
  await expect(page.locator('.tv-scene-row .tv-scene-price')).toHaveCount(0);
  await expect(page.locator('.tv-scene-summary .tv-status')).toHaveCount(4);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
    const lastRow = await page.locator('.tv-scene-row').last().boundingBox();
    expect(lastRow!.y + lastRow!.height).toBeLessThan(viewport.height);
  }
  const row = page.locator('.tv-scene-row').first();
  await row.click();
  await expect(page.getByRole('dialog')).toContainText('حد الطلبات لدى المصدر');
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});
