import { openTvMenu, closeTvMenu, openTvHeaderActions, closeTvHeaderActions, chooseTvDestination, selectTvProfile } from './helpers/tv-controls';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-tv-welcome-shown', '1'));
});

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
    const observedAt = new Date().toISOString();
    return route.fulfill({ json: { group: 'us', directoryTotal: selection?.length ?? 2000, total: rows.length, available: rows.length, quotes: rows.map((a, index) => ({ ...a, exchange: 'US', price: 10 + index, changePercent: 1, observedAt, receivedAt: observedAt, source: 'Synthetic QA fixture', status: 'available' })) } });
  });
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await expect(page.locator('.tv-language-options').getByRole('button', { name: 'العربية', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.tv-language-options').getByRole('button', { name: 'Français', exact: true }).click();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.locator('.tv-language-options').getByRole('button', { name: 'العربية', exact: true }).click();
  await page.locator('#tv-settings-tab-display').click();
  await page.getByRole('dialog').getByRole('button', { name: 'تخصيص الأسواق', exact: true }).click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await expect(page.locator('.tv-picker-count')).toContainText('2,000');
  await page.getByRole('button', { name: 'أسهم وأصول محددة', exact: true }).click();
  await page.getByRole('checkbox', { name: /QA0 شركة اختبار 0/ }).click();
  await page.getByRole('textbox', { name: 'ابحث بالرمز أو اسم الشركة' }).fill('QA1999');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('checkbox').click();
  await page.getByRole('textbox', { name: 'ابحث بالرمز أو اسم الشركة' }).fill('');
  await page.getByRole('button', { name: 'أسهمي المختارة · 2', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  await expect(page.getByRole('checkbox', { name: /QA1999/ })).toBeVisible();
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
  await page.reload(); await closeTvMenu(page); await expect(cards).toHaveCount(2);
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=customize]').click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await expect(page.getByRole('button', { name: 'أسهم وأصول محددة', exact: true })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button', { name: 'إلغاء الكل', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(cards).toHaveCount(0); await expect(page.getByText('لم تختر أي سهم لهذا الشريط', { exact: true })).toBeVisible();
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=customize]').click();
  await page.getByRole('button', { name: 'تخصيص الأسهم والأصول: الأسواق الأمريكية', exact: true }).click();
  await page.getByRole('button', { name: 'جميع الأسهم والأصول', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(cards).toHaveCount(12);
});

// UI-only synthetic fixtures: never imported by production providers or clients.
test('TV fits a television and supports remote focus, languages and QR details', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({scene:'gulf'})));
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
  await page.route('**/api/tv/instruments?*', route => route.fulfill({ json: { items: Array.from({ length: 12 }, (_, index) => ({ symbol: `QA${index}`, name: 'Synthetic QA asset', nameAr: 'أصل اختبار اصطناعي', region: 'US', currency: 'USD' })), total: 12, directoryTotal: 3394, page: 0, pageSize: 12 } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto('/tv');
  await closeTvMenu(page);
  await expect(page.locator('.tv-quote')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(1082);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(722);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-tv-dialog]')))).toBe(true);
  await page.locator('.tv-language-options').getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
  await page.locator('.tv-quote').first().click();
  await expect(page.locator('canvas.tv-qr')).toBeVisible();
  await expect(page.getByText('No valid saved analysis for this asset')).toBeVisible();
  await page.keyboard.press('Escape');
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(page.locator('.tv-hall-row')).toHaveCount(12);
  await chooseTvDestination(page, 'hall');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await page.locator('.tv-language-options').getByRole('button', { name: 'Français', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.setViewportSize({ width: 3840, height: 2160 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(2162);
  expect(errors).toEqual([]);
});

test('phone pairing keeps the QR code out of the login query', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/tv/account', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }));
  await page.goto('/tv/pair#ABCDEF123456');
  const login = page.getByRole('link', { name: 'تسجيل الدخول للمتابعة', exact: true });
  await expect(login).toHaveAttribute('href', '/login?next=%2Ftv%2Fpair');
  await expect(page.getByText('ABCD EF12 3456')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'أجهزتي المرتبطة' })).toHaveCount(0);
  await expect(page.locator('.tv-pair-primary')).toBeInViewport({ ratio: 1 });
  expect((await login.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('pair-phone-ar.png') });
  await page.setViewportSize({ width: 320, height: 667 });
  await expect(login).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.locator('.tv-pair-page')).toHaveAttribute('dir', 'ltr');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Associer mon téléviseur' })).toBeVisible();
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
  await page.route('**/api/tv/instruments?*', route => {
    const params = new URL(route.request().url()).searchParams, market = params.get('market') || 'US';
    const pageNumber = Number(params.get('page') || 0), pageSize = Number(params.get('pageSize') || 6);
    const items = Array.from({ length: pageSize }, (_, index) => ({ symbol: `${market}-${pageNumber * pageSize + index}`, name: 'Synthetic QA', nameAr: 'اختبار', region: market, currency: 'USD' }));
    return route.fulfill({ json: { items, total: 12, directoryTotal: market === 'SSE' ? 2359 : 1035, page: pageNumber, pageSize } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const group = params.get('group'), market = params.get('market') || group, pageNumber = Number(params.get('page') || 0);
    const symbols: string[] = params.has('symbols') ? JSON.parse(params.get('symbols')!) : Array.from({ length: 6 }, (_, index) => `${market}-${pageNumber * 6 + index}`);
    const observedAt = new Date().toISOString();
    return route.fulfill({ json: { group, page: pageNumber, pageSize: Number(params.get('pageSize')), total: symbols.length, directoryTotal: 1035, available: symbols.length,
      quotes: symbols.map((symbol, index) => ({ symbol, name: 'Synthetic QA', nameAr: 'اختبار', price: 20 + index, changePercent: 1, currency: 'USD', source: 'Synthetic QA fixture', observedAt, receivedAt: observedAt, status: 'available', exchange: market })) } });
  });
  await page.goto('/tv');
  await closeTvMenu(page);
  await chooseTvDestination(page, 'allStocks');
  await page.locator('[data-tv-focus-key="stock-market"]').selectOption('SSE');
  await expect(page.locator('.tv-hall-row').first()).toContainText('SSE-0');
  await page.locator('.tv-stock-pagination').getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.locator('.tv-hall-row').first()).toContainText(/SSE-\d+/);
  await page.locator('[data-tv-focus-key="stock-market"]').selectOption('US');
  await expect(page.locator('.tv-hall-row').first()).toContainText('US-0');
  await chooseTvDestination(page, 'strips');
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
  await closeTvMenu(page);
  await expect(page.locator('.tv-market-strip')).toHaveCount(30);
  await expect(page.locator('.tv-market-strip-item').first()).toContainText('QA0-0');
  await expect(page.locator('.tv-quote-grid,.tv-news-panel,.tv-markets-nav,.tv-footer')).toHaveCount(0);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const bounds = await page.locator('.tv-market-strips').boundingBox();
    const header = await page.locator('.tv-unified-header').boundingBox();
    // Named controls occupy the header; the strips fill the remaining content
    // area without overlapping that header or leaving unused space at the foot.
    expect(bounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(bounds!.height).toBeGreaterThan((viewport.height - header!.y - header!.height) * .85);
    const contentBottom = await page.locator('[data-tv-root]').evaluate(element => element.getBoundingClientRect().bottom - parseFloat(getComputedStyle(element).paddingBottom));
    expect(bounds!.y + bounds!.height).toBeGreaterThanOrEqual(contentBottom - 2);
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
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await page.locator('.tv-language-options').getByRole('button', { name: 'English', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  expect(requests.some(url => url.includes('/news'))).toBe(false);
  expect(requests.filter(url => url.includes('/snapshot')).every(url => new URL(url).searchParams.get('pageSize') === '12')).toBe(true);
  await expect(page.getByRole('img', { name: 'THE SFM', exact: true })).toBeVisible();
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=customize]').click();
  await page.getByRole('button', { name: 'Deselect all', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search markets', exact: true }).fill('QA market 7');
  await page.locator('.tv-market-editor').getByRole('switch').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tv-market-strip')).toHaveCount(1);
  await expect(page.locator('.tv-market-strip')).toHaveAttribute('data-market', 'QA7');
  await page.reload(); await closeTvMenu(page);
  await expect(page.locator('.tv-market-strip')).toHaveCount(1);
  await expect(page.locator('.tv-market-strip')).toHaveAttribute('data-market', 'QA7');
  await expect(page.locator('.tv-strip-price').first()).toContainText('123.45');
  // Opening a quote must not pause the strips merely because its detail overlay
  // is displayed.
  await page.mouse.move(10, 10);
  await expect(page.locator('.tv-market-strip-track').first()).toHaveCSS('animation-play-state', 'running');
  await page.locator('.tv-market-strip-item').first().evaluate(element => (element as HTMLButtonElement).click());
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.tv-market-strip-track').first()).toHaveCSS('animation-play-state', 'running');
  await page.keyboard.press('Escape');
  quotePrice = 124.45;
  await openTvHeaderActions(page);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.tv-strip-price').first()).toContainText('124.45');
  await expect(page.locator('.tv-market-strip-item').first()).toHaveAttribute('data-tick', 'up');
  await page.getByRole('button', { name: 'Pause strips', exact: true }).click();
  await expect(page.locator('.tv-market-strip-track')).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('button', { name: 'Resume strips', exact: true }).click();
  await closeTvHeaderActions(page);
  await expect(page.locator('.tv-strip-change svg').first()).toBeVisible();
  await chooseTvDestination(page, 'hall');
  await expect(page).toHaveURL(/\/tv$/);
  await expect(page.locator('.tv-strips-only')).toHaveCount(0);
});

test('phone pairing distinguishes loading, retry, approval and linked devices', async ({ page }) => {
  let fail = true, linked = false;
  const selectedCode = 'A1B2C3D4E5F6';
  await page.route('**/api/tv/account', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      if (route.request().postDataJSON().code !== selectedCode) return route.fulfill({ status: 400, json: { code: 'INVALID_CODE' } });
      linked = true;
    } else if (method === 'DELETE') linked = false;
    else if (fail) return route.fulfill({ status: 503, json: { code: 'DEVICE_UNAVAILABLE' } });
    await route.fulfill({ json: { devices: linked ? [{ id: 'qa-tv', name: 'Living room TV', expires_at: '2027-01-01T00:00:00Z' }] : [] } });
  });
  await page.goto('/tv/pair');
  await expect(page.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'أجهزتي المرتبطة' })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
  const input = page.getByRole('textbox', { name: 'رمز الربط' });
  const approve = page.getByRole('button', { name: 'الموافقة على ربط التلفزيون' });
  await expect(approve).toBeDisabled();
  await input.fill('FFFF FFFF FFFF');
  await approve.click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.fill('A1B2-C3D4-E5F6');
  await approve.click();
  await expect(page.getByRole('status')).toContainText('تم الربط');
  await expect(page.getByText('Living room TV')).toBeVisible();
  await page.getByRole('button', { name: 'إلغاء الوصول' }).click();
  await expect(page.getByText('لا توجد أجهزة مرتبطة')).toBeVisible();
});

test('investments deep link fits the actual tablet browser viewport', async ({ page }, testInfo) => {
  const settings = { language: 'ar', theme: 'light', displayMode: 'viewing', sessionAutoRotate: false };
  await page.addInitScript(value => {
    localStorage.setItem('sfm-markets-tv-device-v1', 'f'.repeat(64));
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify(value));
  }, settings);
  await page.route('**/api/tv/device', route => route.fulfill({ json: {
    device: { id: 'test-device', name: 'Test TV', settings }, symbols: [], alerts: [],
  } }));
  const names = ['صندوق أسهم تجريبي', 'أرض سكنية تجريبية', 'Global Equity Fund'];
  const positions = Array.from({length: 12}, (_, i) => ({
    id: String(i), name: names[i % 3], platform: 'SFM', symbol: null, assetClass: i % 3 === 1 ? 'real-estate' : 'funds',
    value: { amount: 100, currency: 'USD' }, holdingValue: { amount: 100, currency: 'USD' },
    holdingCurrency: 'USD', baseValue: 30, baseCost: 30, freshness: 'recorded', valuationKind: 'manual',
  }));
  await page.route('**/api/tv/portfolio**', route => route.fulfill({ json: {
    currency: 'KWD', generatedAt: '2026-11-20T12:00:00Z', total: 12, positions,
    totalValue: 360, valueCoverage: 12, totalCost: 360, costCoverage: 12,
    allocation: [{ assetClass: 'funds', amount: 240, count: 8 }, { assetClass: 'real-estate', amount: 120, count: 4 }],
  } }));
  await page.setViewportSize({ width: 1536, height: 872 });
  await page.goto('/tv?channel=investments');
  await selectTvProfile(page, 0);
  await closeTvMenu(page);
  await expect(page.locator('.tv-portfolio-position')).toHaveCount(12);
  await expect(page.locator('.tv-portfolio-native').first()).toContainText('100.00 USD');
  await page.evaluate(() => document.fonts.ready);
  const list = page.locator('.tv-portfolio-list');
  for (const size of [{ width: 1536, height: 872 }, { width: 1228, height: 690 }]) {
    await page.setViewportSize(size);
    await expect(page.locator('.tv-portfolio-footer')).toBeInViewport({ ratio: 1 });
    await expect.poll(() => list.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.children].every(card => {
        const row = card.getBoundingClientRect();
        return row.bottom <= bounds.top + 1 || row.top >= bounds.bottom - 1
          || (row.top >= bounds.top - 1 && row.bottom <= bounds.bottom + 1);
      });
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`portfolio-site-${size.width}.png`) });
  }
});
