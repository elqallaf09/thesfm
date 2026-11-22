import { openAndroidTvPackage, openTvMenu, closeTvMenu, openTvHeaderActions, chooseTvDestination } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import type { TvLanguage } from '../../src/lib/markets-tv/types';
import { expectTvMenuActionFits, expectTvMenuRemoteAccess, focusTvMenuAction, TV_MENU_KEYS } from '../helpers/tv-menu-layout';

const instant = '2026-11-19T10:00:00Z';
const deviceToken = 'c'.repeat(64);
const signIn = { ar: 'تسجيل الدخول', en: 'Sign in', fr: 'Se connecter' };
const signOut = { ar: 'تسجيل الخروج', en: 'Sign out', fr: 'Se déconnecter' };
const myAccount = { ar: 'حسابي', en: 'My account', fr: 'Mon compte' };
const orderedKeys = TV_MENU_KEYS;

async function fixture(page: Page, language: TvLanguage = 'ar', theme: 'light' | 'dark' = 'light', paired = false, options: { allocationCount?: number; ticker?: boolean } = {}) {
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ language, theme, paired, deviceToken, ticker }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, accent: 'green', autoRotate: false, sessionAutoRotate: false, ticker }));
    if (paired) localStorage.setItem('sfm-markets-tv-device-v1', deviceToken);
  }, { language, theme, paired, deviceToken, ticker: options.ticker ?? true });
  const assetClasses = ['stocks', 'real-estate', 'gold-silver', 'crypto', 'funds'].slice(0, options.allocationCount ?? 0);
  const positions = (assetClasses.length ? assetClasses : ['stocks']).map((assetClass, index) => ({
    id: `test-position-${index}`, name: 'Private fixture holding', symbol: `QA${index}`, assetClass, quantity: 10,
    value: { amount: 1250, currency: 'USD' }, baseValue: 1250, baseCost: 1000, platform: 'QA', source: 'Recorded test source', valuedAt: instant, freshness: 'recorded',
  }));
  const requests: { path: string; method: string; token?: string }[] = [];
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, method: route.request().method(), token: route.request().headers()['x-sfm-tv-token'] });
    if (url.pathname === '/api/tv/device') return route.fulfill({ json: {
      device: { id: 'test-device', name: 'Living room QA', settings: { language, theme, accent: 'green', autoRotate: false, sessionAutoRotate: false, ticker: options.ticker ?? true } }, symbols: ['QA0'], alerts: [],
    } });
    if (url.pathname === '/api/tv/portfolio') return route.fulfill({ json: {
      currency: 'USD', generatedAt: instant, total: positions.length, totalValue: positions.length * 1250, totalCost: positions.length * 1000, valueCoverage: positions.length, costCoverage: positions.length,
      positions, allocation: assetClasses.map(assetClass => ({ assetClass, amount: 1250, count: 1 })),
    } });
    if (url.pathname === '/api/tv/catalog') return route.fulfill({ json: { markets: [
      { id: 'QA', group: 'us', labelAr: 'سوق الاختبار', labelEn: 'QA market', labelFr: 'Marché test', count: 6, status: 'directory' },
    ] } });
    if (url.pathname === '/api/tv/instruments') return route.fulfill({ json: { items: [], total: 0, directoryTotal: 0, page: 0, pageSize: 6 } });
    if (url.pathname === '/api/tv/snapshot') return route.fulfill({ json: {
      group: 'global', summary: [], quotes: Array.from({ length: 6 }, (_, index) => ({ symbol: `QA${index}`, name: `Test company ${index}`, nameAr: `شركة الاختبار ${index}`,
        price: 10 + index, currency: 'USD', changePercent: 1, source: 'QA source', observedAt: instant, receivedAt: instant, status: 'available', exchange: 'QA', country: 'US', changeBasis: 'session' })),
      total: 6, available: 6, generatedAt: instant,
    } });
    return route.fulfill({ json: { stories: [], items: [], points: [], total: 0 } });
  });
  await openAndroidTvPackage(page, { keepMenu: true, profile: paired ? 0 : undefined });
  await expect(page.locator('.tv-side-menu')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return requests;
}

for (const language of ['ar', 'en', 'fr'] as const) for (const theme of ['light', 'dark'] as const) {
  test(`side menu ${language} ${theme}: visible icon labels, one navigation surface and TV fit`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await fixture(page, language, theme);
    const menu = page.locator('.tv-side-menu');
    await expect(menu.locator('button')).toHaveCount(orderedKeys.length);
    await expect(menu.locator('[data-tv-focus-key=account]')).toHaveText(signIn[language]);
    await expect(page.locator('.tv-header-actions,.tv-viewing-nav,.tv-scene-tabs,.tv-footer')).toHaveCount(0);
    await expect(menu.locator('[aria-current=page]')).toHaveAttribute('data-tv-focus-key', 'menu:hall');
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await expectTvMenuRemoteAccess(page, orderedKeys);
      const box = (await menu.boundingBox())!;
      if (language === 'ar') expect(box.x + box.width).toBeCloseTo(width, 0);
      else expect(box.x).toBeCloseTo(0, 0);
      if (language === 'ar' && width === 1920) await page.screenshot({ path: testInfo.outputPath(`side-menu-${theme}.png`) });
    }
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
    await expect(page.locator('[data-tv-focus-key=menu-toggle] > span')).toBeVisible();
  });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`side menu ${language}: remote order, media isolation, inward return and modal Back`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fixture(page, language);
    await page.locator('[data-tv-focus-key=menu-close]').focus();
    for (const key of orderedKeys.slice(1)) {
      await page.keyboard.press('ArrowDown');
      await expectTvMenuActionFits(page, key);
    }
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-tv-focus-key=account]')).toBeFocused();
    for (const key of orderedKeys.slice(0, -1).reverse()) {
      await page.keyboard.press('ArrowUp');
      await expectTvMenuActionFits(page, key);
    }
    const before = await page.evaluate(() => localStorage.getItem('sfm-markets-tv-settings-v1'));
    for (const key of ['2', 'MediaPlayPause']) await page.keyboard.press(key);
    await page.evaluate(() => { for (const key of ['MediaPlay', 'MediaPause']) document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ChannelUp', bubbles: true })));
    expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-settings-v1'))).toBe(before);
    await expect(page.locator('.tv-side-menu')).toBeVisible();
    await closeTvMenu(page);
    const quote = page.locator('.tv-hall-identity button').first();
    await expect(quote).toBeVisible();
    await quote.focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.tv-side-menu')).toBeVisible();
    await page.keyboard.press(language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.locator('.tv-side-menu')).toHaveCount(0);
    await expect(quote).toBeFocused();
    await openTvMenu(page);
    await page.locator('[data-tv-focus-key=settings]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tv-dialog]')).toBeVisible();
    await expect(page.locator('.tv-side-menu')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
  });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`side menu ${language}: My account opens the profile handoff with remote focus and Back`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 960, height: 540 });
    await fixture(page, language, 'light', true);
    await page.locator('[data-tv-focus-key=account]').click();
    await focusTvMenuAction(page, 'my-account');
    await expect(page.locator('[data-tv-focus-key=my-account]')).toHaveText(myAccount[language]);
    await page.keyboard.press('Enter');
    await expect(page.locator('#tv-dialog-title')).toHaveText(myAccount[language]);
    await expect(page.locator('.tv-side-menu')).toHaveCount(0);
    const profile = page.locator('[data-tv-focus-key=account-profile]');
    await expect(profile).toHaveAttribute('href', 'https://www.the-sfm.com/profile');
    await expect(profile).toBeFocused();
    await expect(profile).toBeInViewport();
    const qr = page.locator('.tv-my-account canvas[role=img]');
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate(element => (element as HTMLCanvasElement).getContext('2d')?.getImageData(0, 0, 1, 1).data[3])).toBe(255);
    const tvQrBounds = (await qr.boundingBox())!;
    expect(tvQrBounds.width).toBeCloseTo(tvQrBounds.height, 0);
    await expect(page.locator('.tv-my-account')).toContainText({ ar: 'الحساب الذي تريد تعديله', en: 'account you want to edit', fr: 'compte à modifier' }[language]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(profile).toBeInViewport();
    await expect(qr).toBeInViewport();
    const phoneQrBounds = (await qr.boundingBox())!;
    expect(phoneQrBounds.width).toBeCloseTo(phoneQrBounds.height, 0);
    if (language === 'ar') await page.screenshot({ path: testInfo.outputPath('my-account-mobile.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
    await openTvMenu(page);
    await expect(page.locator('[data-tv-focus-key=account]')).toHaveText(myAccount[language]);
  });
}

test('My account opens the normal profile route without transferring a paired-TV credential', async ({ page }) => {
  const requests = await fixture(page, 'en', 'dark', true);
  await page.locator('[data-tv-focus-key=account]').click();
  await focusTvMenuAction(page, 'my-account');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-my-account')).not.toContainText('Living room QA');
  expect(requests.filter(request => request.path === '/api/mobile/account' || request.path === '/api/tv/account')).toEqual([]);
  let profileRequests = 0;
  await page.route('https://www.the-sfm.com/profile', route => {
    profileRequests++;
    const request = route.request();
    expect(request.method()).toBe('GET');
    expect(request.postData()).toBeNull();
    expect(request.headers()['x-sfm-tv-token']).toBeUndefined();
    expect(request.headers().authorization).toBeUndefined();
    expect(request.headers().referer).toBeUndefined();
    return route.fulfill({ contentType: 'text/html', body: '<h1>Normal profile authentication entry</h1>' });
  });
  await expect(page.locator('[data-tv-focus-key=account-profile]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('https://www.the-sfm.com/profile');
  expect(profileRequests).toBe(1);
});

test('existing saved shortcuts still play directly after the channel editor is removed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-channels-v1', JSON.stringify([{
    id: 'office-screen', name: 'Saved office screen', view: 'technology', selections: {},
    settings: { language: 'fr', theme: 'dark', displayMode: 'viewing', broadcastChannel: 'technology', autoRotate: false, sessionAutoRotate: false },
  }])));
  await page.setViewportSize({ width: 960, height: 540 });
  await fixture(page, 'en');
  const insertion = orderedKeys.indexOf('customize');
  await expectTvMenuRemoteAccess(page, [...orderedKeys.slice(0, insertion), 'saved:office-screen', ...orderedKeys.slice(insertion)]);
  await expect(page.getByRole('button', { name: 'My channels', exact: true })).toHaveCount(0);
  await focusTvMenuAction(page, 'settings');
  await page.keyboard.press('Enter');
  await page.locator('#tv-settings-tab-display').click();
  await expect(page.locator('#tv-settings-panel-display')).toBeVisible();
  await expect(page.getByRole('button', { name: 'My channels', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openTvMenu(page);
  await focusTvMenuAction(page, 'saved:office-screen');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tv-side-menu')).toHaveCount(0);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'technology');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('[data-tv-root]')).toHaveClass(/tv-dark/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1') || '{}').broadcastChannel)).toBe('technology');
});

test('guest signs in through the existing pairing flow and sees a labelled sign-out action', async ({ page }) => {
  await fixture(page, 'en');
  await expect(page.locator('[data-tv-focus-key=account]')).toHaveText('Sign in');
  await page.route('**/api/tv/pair', route => route.fulfill({ json: route.request().method() === 'POST'
    ? { code: 'ABCDEF123456', secret: 'd'.repeat(64), expiresAt: '2026-11-19T10:10:00Z' }
    : { state: 'active', token: deviceToken } }));
  await page.locator('[data-tv-focus-key=account]').click();
  await expect(page.locator('#tv-dialog-title')).toHaveText('Sign in');
  await page.locator('.tv-pair-content button').click();
  await expect(page.locator('.tv-pair-code')).toHaveText('ABCD — EF12 — 3456');
  await page.clock.runFor(5100);
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(deviceToken);
  await openTvMenu(page);
  await expect(page.locator('[data-tv-focus-key=account]')).toHaveText('My account');
  await page.locator('[data-tv-focus-key=account]').click();
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign out');
});

test('sign out cancellation preserves access and successful confirmation removes private holdings', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixture(page, 'en', 'dark', true);
  let deletions = 0;
  await page.route('**/api/tv/device', route => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deletions++;
    expect(route.request().headers()['x-sfm-tv-token']).toBe(deviceToken);
    return route.fulfill({ json: { success: true } });
  });
  await chooseTvDestination(page, 'investments');
  await expect(page.locator('.tv-portfolio-position')).toContainText('Private fixture holding');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=account]').click();
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign out');
  await page.locator('[data-tv-focus-key=pair]').click();
  await expect(page.locator('[data-tv-focus-key=sign-out-cancel]')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(deletions).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(deviceToken);
  await expect(page.locator('.tv-portfolio-position')).toContainText('Private fixture holding');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=account]').click();
  await page.locator('[data-tv-focus-key=pair]').click();
  await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
  await expect.poll(() => deletions).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
  await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);
  await expect(page.locator('[data-tv-root]')).not.toContainText('Private fixture holding');
  await openTvMenu(page);
  await expect(page.locator('[data-tv-focus-key=account]')).toHaveText('Sign in');
  await chooseTvDestination(page, 'investments');
  await expect(page.locator('.tv-portfolio-gate')).toBeVisible();
});

test('failed sign out retains the paired state, shows an error and permits retry', async ({ page }) => {
  await fixture(page, 'fr', 'light', true);
  let fail = true, deletions = 0;
  await page.route('**/api/tv/device', route => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deletions++;
    return route.fulfill({ status: fail ? 503 : 200, json: fail ? { code: 'UNAVAILABLE' } : { success: true } });
  });
  await page.locator('[data-tv-focus-key=account]').click();
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText(signOut.fr);
  await page.locator('[data-tv-focus-key=pair]').click();
  await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
  await expect(page.locator('.tv-sign-out [role=alert]')).toContainText('Échec');
  await expect(page.locator('[data-tv-focus-key=sign-out-confirm]')).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(deviceToken);
  expect(deletions).toBe(1);
  fail = false;
  await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
  expect(deletions).toBe(2);
});

for (const status of [200, 401]) {
  test(`an older sign-out response (${status}) cannot revoke a newly paired account or change its view`, async ({ page }) => {
    await fixture(page, 'en', 'light', true);
    await expect(page.locator('.tv-side-menu-account-name')).toHaveText('Living room QA');
    await page.clock.pauseAt(new Date('2026-11-19T10:00:30Z'));
    const nextToken = 'e'.repeat(64);
    let releaseOldDelete = () => {};
    const heldDelete = new Promise<void>(resolve => { releaseOldDelete = resolve; });
    let deletions = 0;
    await page.route('**/api/tv/device', async route => {
      const request = route.request(), token = request.headers()['x-sfm-tv-token'];
      if (request.method() === 'DELETE' && token === deviceToken) {
        deletions++;
        await heldDelete;
        return route.fulfill({ status, json: status === 200 ? { success: true } : { code: 'UNAUTHORIZED' } });
      }
      if (request.method() === 'GET' && token === deviceToken) return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } });
      if (request.method() === 'GET' && token === nextToken) return route.fulfill({ json: {
        device: { id: 'new-device', name: 'New living room QA', settings: { language: 'en', theme: 'light', autoRotate: false, sessionAutoRotate: false } }, symbols: ['QA1'], alerts: [],
      } });
      return route.fallback();
    });
    await page.route('**/api/tv/pair', route => route.fulfill({ json: route.request().method() === 'POST'
      ? { code: 'ABCDEF123456', secret: 'd'.repeat(64), expiresAt: '2026-11-19T10:10:00Z' }
      : { state: 'active', token: nextToken } }));
    await page.locator('[data-tv-focus-key=account]').click();
    await page.locator('[data-tv-focus-key=pair]').click();
    // Commit the first lazy sign-out panel while the test clock is paused.
    await page.clock.runFor(500);
    await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
    await expect.poll(() => deletions).toBe(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
    // A connection refresh rechecks authorization while the earlier DELETE is pending.
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
    await openTvMenu(page);
    await expect(page.locator('[data-tv-focus-key=account]')).toHaveText('Sign in');
    await page.locator('[data-tv-focus-key=account]').click();
    // Let React commit the first lazy panel while the test clock is paused.
    await page.clock.runFor(500);
    await page.locator('.tv-pair-content button').click();
    await expect(page.locator('.tv-pair-code')).toBeVisible();
    await page.clock.runFor(5100);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(nextToken);
    await chooseTvDestination(page, 'sessions');
    await page.clock.runFor(500);
    await expect(page.locator('.tv-world-sessions')).toBeVisible();
    await openTvMenu(page);
    await expect(page.locator('.tv-side-menu-account-name')).toHaveText('New living room QA');
    await page.locator('[data-tv-focus-key=account]').click();
    await page.locator('[data-tv-focus-key=pair]').click();
    const confirm = page.locator('[data-tv-focus-key=sign-out-confirm]');
    await expect(confirm).toBeDisabled();
    const oldResponse = page.waitForResponse(response => response.request().method() === 'DELETE'
      && response.request().headers()['x-sfm-tv-token'] === deviceToken);
    releaseOldDelete();
    const response = await oldResponse;
    expect(response.status()).toBe(status);
    await response.finished();
    await expect(confirm).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(nextToken);
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'sessions');
    await expect(page.locator('.tv-sign-out')).toContainText('New living room QA');
    await expect(page.locator('#tv-dialog-title')).toHaveText('Sign out');
    expect(deletions).toBe(1);
  });
}

test('side menu owns destinations and settings while market hours keep the full directory', async ({ page }) => {
  await fixture(page, 'ar');
  for (const destination of ['gulf', 'assets', 'brief', 'map']) {
    await chooseTvDestination(page, destination);
    const menu = await openTvMenu(page);
    await expect(menu.locator('[aria-current=page]')).toHaveAttribute('data-tv-focus-key', `menu:${destination}`);
  }
  await chooseTvDestination(page, 'hall');
  const tools = await openTvHeaderActions(page);
  for (const key of ['fullscreen', 'refresh', 'ticker-playback', 'scene-playback', 'scene-previous', 'scene-next']) {
    await expect(tools.locator(`[data-tv-focus-key="${key}"] > span`)).toBeVisible();
  }
  for (const key of ['gulf', 'assets', 'brief', 'map', 'replay-intro', 'world-stocks-phone']) {
    await expect(tools.locator(`[data-tv-focus-key="${key}"]`)).toHaveCount(0);
  }
  await expect(tools.locator('.tv-tools-grid button')).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await page.locator('[data-tv-focus-key=settings-tab-playback]').click();
  await expect(page.locator('.tv-settings [data-tv-focus-key=replay-intro]')).toBeVisible();
  await page.keyboard.press('Escape');
  await chooseTvDestination(page, 'sessions');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1') || '{}').sessionIds?.length)).toBe(81);
  await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 5');
  await expect(page.locator('.tv-quote-marquee')).toBeVisible();
  const sessionTools = await openTvHeaderActions(page);
  await expect(sessionTools.locator('[data-tv-focus-key=scene-playback]')).toHaveText('تشغيل تقليب الصفحات');
  await expect(sessionTools.locator('[data-tv-focus-key=ticker-playback]')).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`investment screen tools ${theme}: only current controls, correct page label and working pause`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const requests = await fixture(page, 'ar', theme, true, { allocationCount: 5 });
    await chooseTvDestination(page, 'investments');
    const allocationPage = page.locator('.tv-portfolio-allocation .tv-broadcast-pager > bdi');
    await expect(allocationPage).toHaveText('1/2');
    // Let the first lazy tools panel mount before freezing playback time.
    const tools = await openTvHeaderActions(page);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
    await expect(tools.locator('.tv-tools-grid button')).toHaveCount(3);
    const playback = tools.locator('[data-tv-focus-key=scene-playback]');
    await expect(playback).toHaveText('تشغيل تقليب صفحات التوزيع');
    await expect(playback).toHaveAttribute('aria-pressed', 'false');
    for (const key of ['ticker-playback', 'scene-previous', 'scene-next', 'world-stocks-phone', 'gulf', 'assets', 'brief', 'map', 'replay-intro']) {
      await expect(tools.locator(`[data-tv-focus-key="${key}"]`)).toHaveCount(0);
    }
    const refreshedBefore = requests.filter(request => request.path === '/api/tv/portfolio').length;
    await tools.locator('[data-tv-focus-key=refresh]').click();
    await expect.poll(() => requests.filter(request => request.path === '/api/tv/portfolio').length).toBeGreaterThan(refreshedBefore);
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', 'investments');
    expect(requests.filter(request => request.path === '/api/tv/portfolio').every(request => request.token === deviceToken)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`investment-screen-tools-${theme}.png`) });
    await playback.focus();
    await page.keyboard.press('Enter');
    await expect(playback).toHaveText('إيقاف تقليب صفحات التوزيع');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeFocused();
    await page.clock.runFor(40000);
    await expect(allocationPage).toHaveText('2/2');
    await openTvHeaderActions(page);
    await playback.click();
    await expect(playback).toHaveText('تشغيل تقليب صفحات التوزيع');
    await page.keyboard.press('Escape');
    await page.clock.runFor(80000);
    await expect(allocationPage).toHaveText('2/2');
    await openTvHeaderActions(page);
    await playback.click();
    await page.keyboard.press('Escape');
    await page.clock.runFor(40000);
    await expect(allocationPage).toHaveText('1/2');
  });
}

for (const allocationCount of [0, 1]) {
  test(`investment tools hide page rotation with ${allocationCount} allocation groups`, async ({ page }) => {
    await fixture(page, 'en', 'light', true, { allocationCount });
    await chooseTvDestination(page, 'investments');
    await expect(page.locator('.tv-portfolio-position')).toBeVisible();
    const tools = await openTvHeaderActions(page);
    await expect(tools.locator('.tv-tools-grid button')).toHaveCount(2);
    await expect(tools.locator('[data-tv-focus-key=scene-playback], [data-tv-focus-key=ticker-playback]')).toHaveCount(0);
  });
}

test('screen tools hide ineffective controls on static pages and respect ticker visibility', async ({ page }) => {
  await fixture(page, 'en', 'dark', false, { ticker: false });
  const tools = await openTvHeaderActions(page);
  await expect(tools.locator('[data-tv-focus-key=ticker-playback]')).toHaveCount(0);
  await expect(tools.locator('[data-tv-focus-key=scene-playback]')).toBeVisible();
  await page.keyboard.press('Escape');
  // Start with a paginated screen to catch controls leaking into the next destination.
  await chooseTvDestination(page, 'sessions');
  await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 5');
  await openTvHeaderActions(page);
  await expect(tools.locator('[data-tv-focus-key=scene-playback]')).toHaveText('Resume page rotation');
  await page.keyboard.press('Escape');
  for (const destination of ['investments', 'news', 'brief', 'map', 'allStocks']) {
    await chooseTvDestination(page, destination);
    if (destination === 'investments') await expect(page.locator('.tv-portfolio-gate')).toBeVisible();
    await openTvHeaderActions(page);
    await expect(tools.locator('.tv-tools-grid button')).toHaveCount(2);
    await expect(tools.locator('[data-tv-focus-key=scene-playback], [data-tv-focus-key=ticker-playback], [data-tv-focus-key=scene-previous], [data-tv-focus-key=scene-next]')).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
  await chooseTvDestination(page, 'strips');
  await openTvHeaderActions(page);
  await expect(tools.locator('[data-tv-focus-key=ticker-playback]')).toBeVisible();
  await expect(tools.locator('[data-tv-focus-key=scene-playback], [data-tv-focus-key=scene-previous], [data-tv-focus-key=scene-next]')).toHaveCount(0);
});

