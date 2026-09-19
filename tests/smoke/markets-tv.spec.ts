import { expect, test } from '@playwright/test';

test('instrument choices search beyond the first page, persist and restore all stocks', async ({ page }) => {
  const markets = [{ id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US Markets', labelFr: 'Marchés américains', count: 2000, status: 'directory' }];
  const instruments = Array.from({ length: 2000 }, (_, i) => ({ symbol: `QA${i}`, name: `Synthetic company ${i}`, nameAr: `شركة اختبار ${i}`, region: 'US', currency: 'USD' }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets } }));
  await page.route('**/api/tv/instruments?*', route => {
    const params = new URL(route.request().url()).searchParams, query = params.get('q') || '', p = Number(params.get('page'));
    const items = instruments.filter(a => `${a.symbol} ${a.name} ${a.nameAr}`.includes(query));
    return route.fulfill({ json: { items: items.slice(p * 50, (p + 1) * 50), total: items.length, directoryTotal: 2000, page: p, pageSize: 50 } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const selection: string[] | null = params.has('symbols') ? JSON.parse(params.get('symbols')!) : null;
    const rows = (selection ? instruments.filter(a => selection.includes(a.symbol)) : instruments).slice(0, 12);
    return route.fulfill({ json: { group: 'us', directoryTotal: selection?.length ?? 2000, total: rows.length, available: 0, quotes: rows.map(a => ({ ...a, exchange: 'US', price: null, changePercent: null, observedAt: null, source: null, status: 'unavailable' })) } });
  });
  await page.goto('/tv/strips');
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).click();
  await expect(page.locator('.tv-language-setting select')).toHaveValue('ar');
  await page.locator('.tv-language-setting select').selectOption('fr');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.locator('.tv-language-setting select').selectOption('ar');
  await page.getByRole('dialog').getByRole('button', { name: 'تخصيص الأسواق', exact: true }).click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await expect(page.locator('.tv-picker-count')).toContainText('2,000');
  await page.getByRole('button', { name: 'أسهم وأصول محددة', exact: true }).click();
  await page.getByRole('checkbox', { name: /QA0 شركة اختبار 0/ }).click();
  await page.getByRole('textbox', { name: 'ابحث بالرمز أو اسم الشركة' }).fill('QA1999');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('checkbox').click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.press('Escape');
  const cards = page.locator('.tv-market-strip-set').first().locator('.tv-market-strip-item');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('QA0'); await expect(cards.nth(1)).toContainText('QA1999');
  await expect(cards.nth(1)).toContainText('شركة اختبار 1999');
  await page.reload(); await expect(cards).toHaveCount(2);
  await page.getByRole('button', { name: 'تخصيص الأسواق', exact: true }).click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await expect(page.getByRole('button', { name: 'أسهم وأصول محددة', exact: true })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button', { name: 'إلغاء الكل', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(cards).toHaveCount(0); await expect(page.getByText('لم تختر أي سهم لهذا الشريط', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تخصيص الأسواق', exact: true }).click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await page.getByRole('button', { name: 'جميع الأسهم والأصول', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(cards).toHaveCount(12);
});

// UI-only synthetic fixtures: never imported by production providers or clients.
test('TV fits a television and supports remote focus, languages and QR details', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: {
    group: 'global', total: 12, available: 12, generatedAt: new Date().toISOString(),
    quotes: Array.from({ length: 12 }, (_, index) => ({
      symbol: `QA${index}`, name: 'Synthetic QA asset', nameAr: 'أصل اختبار اصطناعي',
      price: 123.45 + index, currency: 'USD', changePercent: index % 2 ? -1.2 : 1.2,
      source: 'Synthetic QA fixture', observedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
      status: 'available', exchange: 'QA', country: null,
    })),
  } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US Markets', labelFr: 'Marchés américains', count: 1035, status: 'directory' }, { id: 'SSE', group: 'asia', labelAr: 'شنغهاي', labelEn: 'Shanghai', labelFr: 'Shanghai', count: 2359, status: 'snapshot' }] } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto('/tv');
  await expect(page.locator('.tv-quote')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(1082);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(722);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-tv-dialog]')))).toBe(true);
  await page.locator('.tv-language-setting select').selectOption('en');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Display settings', exact: true })).toBeFocused();
  await page.locator('.tv-quote').first().click();
  await expect(page.locator('canvas.tv-qr')).toBeVisible();
  await expect(page.getByText('No valid saved analysis for this asset')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  await page.locator('.tv-language-setting select').selectOption('fr');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.setViewportSize({ width: 3840, height: 2160 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(2162);
  expect(errors).toEqual([]);
});

test('phone pairing keeps the QR code out of the login query', async ({ page }) => {
  await page.route('**/api/tv/account', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }));
  await page.goto('/tv/pair#ABCDEF123456');
  const login = page.getByRole('link', { name: 'تسجيل الدخول للمتابعة', exact: true });
  await expect(login).toHaveAttribute('href', '/login?next=%2Ftv%2Fpair');
  expect(await page.evaluate(() => sessionStorage.getItem('sfm-tv-pair-code'))).toBe('ABCDEF123456');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth + 2));
});

test('TV market selection changes the main screen and promotes its independent ticker', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const markets = [
    { id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US Markets', labelFr: 'Marchés américains', count: 1035, status: 'directory' },
    { id: 'SSE', group: 'asia', labelAr: 'شنغهاي', labelEn: 'Shanghai', labelFr: 'Shanghai', count: 2359, status: 'snapshot' },
  ];
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const group = params.get('group'), market = params.get('market') || group, pageNumber = Number(params.get('page') || 0);
    return route.fulfill({ json: { group, page: pageNumber, pageSize: Number(params.get('pageSize')), total: 6, directoryTotal: 1035, available: 0,
      quotes: Array.from({ length: 6 }, (_, index) => ({ symbol: `${market}-${pageNumber * 6 + index}`, name: 'Synthetic QA', nameAr: 'اختبار', price: null, changePercent: null, currency: 'USD', source: null, observedAt: null, status: 'unavailable' })) } });
  });
  await page.goto('/tv');
  await expect(page.locator('.tv-market-strip')).toHaveCount(2);
  await page.locator('[data-market="SSE"] .tv-market-strip-heading').click();
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market','SSE');
  await expect(page.locator('.tv-quote').first()).toContainText('SSE-0');
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.locator('.tv-quote').first()).toContainText('SSE-6');
  await page.locator('[data-market="US"] .tv-market-strip-heading').click();
  await expect(page.locator('.tv-quote').first()).toContainText('US-0');
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market','US');
  await expect(page.locator('.tv-world-stocks-link')).toHaveAttribute('href', /\/world-stocks$/);
  await page.getByRole('link', { name: 'الأشرطة فقط', exact: true }).click();
  await expect(page).toHaveURL(/\/tv\/strips$/);
  await expect(page.locator('.tv-strips-only')).toBeVisible();
});

test('strips page fills the viewport, browses all rows and omits dashboard requests', async ({ page }) => {
  const requests: string[] = [];
  let quotePrice = 123.45;
  page.on('request', request => { if (request.url().includes('/api/tv/')) requests.push(request.url()); });
  await page.addInitScript(() => { if (!localStorage.getItem('sfm-markets-tv-settings-v1')) localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ ticker: false, autoRotate: true })); });
  const markets = Array.from({ length: 30 }, (_, index) => ({ id: `QA${index}`, group: 'us', labelAr: `سوق اختبار ${index}`, labelEn: `QA market ${index}`, labelFr: `Marché test ${index}`, count: 120, status: 'directory' }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { group: 'us', directoryTotal: 120, total: 1, available: 1, quotes: [{
      symbol: `${params.get('market')}-${params.get('page')}`, name: 'Synthetic QA', nameAr: 'اختبار', price: quotePrice, currency: 'USD', changePercent: 1.2,
      source: 'Synthetic QA fixture', observedAt: new Date().toISOString(), status: 'available', exchange: 'QA',
    }] } });
  });
  await page.goto('/tv/strips');
  await expect(page.locator('.tv-market-strip')).toHaveCount(30);
  await expect(page.locator('.tv-market-strip-item').first()).toContainText('QA0-0');
  await expect(page.locator('.tv-quote-grid,.tv-news-panel,.tv-markets-nav,.tv-footer')).toHaveCount(0);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.tv-market-strips').boundingBox();
    expect(bounds!.height).toBeGreaterThan(viewport.height * .85);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 2);
    const window = await page.locator('.tv-market-strip-window').first().boundingBox();
    for (const element of ['.tv-asset-icon', '.tv-strip-symbol b', '.tv-strip-price', '.tv-strip-evidence']) {
      const box = await page.locator('.tv-market-strip-item').first().locator(element).boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(window!.y - 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(window!.y + window!.height + 1);
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator('[data-market="QA29"] .tv-market-strip-heading').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market', 'QA29');
  await expect(page.locator('.tv-market-strip-item').first()).toContainText('QA29-0');
  await page.locator('.tv-strip-next').first().click();
  await expect(page.locator('.tv-market-strip-item').first()).toContainText('QA29-1');
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).click();
  await page.locator('.tv-language-setting select').selectOption('en');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  expect(requests.some(url => url.includes('/news'))).toBe(false);
  expect(requests.filter(url => url.includes('/snapshot')).every(url => new URL(url).searchParams.get('pageSize') === '12')).toBe(true);
  await expect(page.getByRole('img', { name: 'THE SFM', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Customize markets', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search markets', exact: true }).fill('QA market 7');
  await page.locator('.tv-market-options .tv-market-toggle').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tv-market-strip')).toHaveCount(1);
  await expect(page.locator('.tv-market-strip')).toHaveAttribute('data-market', 'QA7');
  await page.reload();
  await expect(page.locator('.tv-market-strip')).toHaveCount(1);
  await expect(page.locator('.tv-market-strip')).toHaveAttribute('data-market', 'QA7');
  await expect(page.locator('.tv-strip-price').first()).toContainText('123.45');
  quotePrice = 124.45;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.tv-strip-price').first()).toContainText('124.45');
  await expect(page.locator('.tv-market-strip-item').first()).toHaveAttribute('data-tick', 'up');
  await page.getByRole('button', { name: 'Pause strips', exact: true }).click();
  await expect(page.locator('.tv-market-strip-track')).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('button', { name: 'Resume strips', exact: true }).click();
  await expect(page.locator('.tv-strip-change svg').first()).toBeVisible();
  await page.getByRole('link', { name: 'TV dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('.tv-strips-only')).toHaveCount(0);
});
