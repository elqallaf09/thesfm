import { openAndroidTvPackage, openTvMenu, closeTvMenu, openTvHeaderActions, chooseTvDestination } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import type { TvLanguage } from '../../src/lib/markets-tv/types';

const instant = '2026-11-19T10:00:00Z';
const deviceToken = 'c'.repeat(64);
const signIn = { ar: 'تسجيل الدخول', en: 'Sign in', fr: 'Se connecter' };
const signOut = { ar: 'تسجيل الخروج', en: 'Sign out', fr: 'Se déconnecter' };
const routeKeys = ['hall', 'allStocks', 'strips', 'world', 'kuwait', 'news', 'sessions', 'watchlist', 'investments'];
const orderedKeys = ['menu-close', ...routeKeys.map(key => `menu:${key}`), 'channels', 'customize', 'settings', 'pair', 'more'];

async function fixture(page: Page, language: TvLanguage = 'ar', theme: 'light' | 'dark' = 'light', paired = false) {
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ language, theme, paired, deviceToken }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, accent: 'green', autoRotate: false, sessionAutoRotate: false }));
    if (paired) localStorage.setItem('sfm-markets-tv-device-v1', deviceToken);
  }, { language, theme, paired, deviceToken });
  const requests: { path: string; method: string; token?: string }[] = [];
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, method: route.request().method(), token: route.request().headers()['x-sfm-tv-token'] });
    if (url.pathname === '/api/tv/device') return route.fulfill({ json: {
      device: { id: 'test-device', name: 'Living room QA', settings: { language, theme, accent: 'green', autoRotate: false, sessionAutoRotate: false } }, symbols: ['QA0'], alerts: [],
    } });
    if (url.pathname === '/api/tv/portfolio') return route.fulfill({ json: {
      currency: 'USD', generatedAt: instant, total: 1, totalValue: 1250, totalCost: 1000, valueCoverage: 1, costCoverage: 1,
      positions: [{ id: 'test-position', name: 'Private fixture holding', symbol: 'QA0', assetClass: 'stocks', quantity: 10,
        value: { amount: 1250, currency: 'USD' }, baseValue: 1250, baseCost: 1000, platform: 'QA', source: 'Recorded test source', valuedAt: instant, freshness: 'recorded' }], allocation: [],
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
  await openAndroidTvPackage(page, { keepMenu: true });
  await expect(page.locator('.tv-side-menu')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return requests;
}

for (const language of ['ar', 'en', 'fr'] as const) for (const theme of ['light', 'dark'] as const) {
  test(`side menu ${language} ${theme}: visible icon labels, one navigation surface and TV fit`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await fixture(page, language, theme);
    const menu = page.locator('.tv-side-menu');
    await expect(menu.locator('button')).toHaveCount(15);
    await expect(menu.locator('[data-tv-focus-key=pair]')).toHaveText(signIn[language]);
    await expect(page.locator('.tv-header-actions,.tv-viewing-nav,.tv-scene-tabs,.tv-footer')).toHaveCount(0);
    await expect(menu.locator('[aria-current=page]')).toHaveAttribute('data-tv-focus-key', 'menu:hall');
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await expect(menu).toBeInViewport({ ratio: 1 });
      await expect.poll(() => menu.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const buttons = [...element.querySelectorAll('button')];
        const violations: string[] = [];
        for (const button of buttons) {
          const rect = button.getBoundingClientRect(), label = button.querySelector('span'), icon = button.querySelector('svg');
          if (!label || !icon || !label.textContent?.trim()) violations.push('missing visible icon label');
          if (label && (getComputedStyle(label).display === 'none' || label.getBoundingClientRect().width === 0 || parseFloat(getComputedStyle(label).fontSize) < 14)) violations.push('unreadable label');
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) violations.push('offscreen action');
          if (button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1) violations.push('clipped action');
        }
        const list = element.querySelector('.tv-side-menu-items')!;
        if (list.scrollHeight > list.clientHeight + 1) violations.push('scrolling primary list');
        return violations;
      })).toEqual([]);
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
      await expect(page.locator(`[data-tv-focus-key="${key}"]`)).toBeFocused();
    }
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-tv-focus-key=more]')).toBeFocused();
    for (const key of orderedKeys.slice(0, -1).reverse()) {
      await page.keyboard.press('ArrowUp');
      await expect(page.locator(`[data-tv-focus-key="${key}"]`)).toBeFocused();
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

test('guest signs in through the existing pairing flow and sees a labelled sign-out action', async ({ page }) => {
  await fixture(page, 'en');
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign in');
  await page.route('**/api/tv/pair', route => route.fulfill({ json: route.request().method() === 'POST'
    ? { code: 'ABCDEF123456', secret: 'd'.repeat(64), expiresAt: '2026-11-19T10:10:00Z' }
    : { state: 'active', token: deviceToken } }));
  await page.locator('[data-tv-focus-key=pair]').click();
  await expect(page.locator('#tv-dialog-title')).toHaveText('Sign in');
  await page.locator('.tv-pair-content button').click();
  await expect(page.locator('.tv-pair-code')).toHaveText('ABCD — EF12 — 3456');
  await page.clock.runFor(5100);
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(deviceToken);
  await openTvMenu(page);
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
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign out');
  await page.locator('[data-tv-focus-key=pair]').click();
  await expect(page.locator('[data-tv-focus-key=sign-out-cancel]')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(deletions).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBe(deviceToken);
  await expect(page.locator('.tv-portfolio-position')).toContainText('Private fixture holding');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=pair]').click();
  await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
  await expect.poll(() => deletions).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
  await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);
  await expect(page.locator('[data-tv-root]')).not.toContainText('Private fixture holding');
  await openTvMenu(page);
  await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign in');
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
    await page.locator('[data-tv-focus-key=pair]').click();
    await page.locator('[data-tv-focus-key=sign-out-confirm]').click();
    await expect.poll(() => deletions).toBe(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
    // A connection refresh rechecks authorization while the earlier DELETE is pending.
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
    await openTvMenu(page);
    await expect(page.locator('[data-tv-focus-key=pair]')).toHaveText('Sign in');
    await page.locator('[data-tv-focus-key=pair]').click();
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

test('side menu preserves all extra display tools and defaults market hours to the full directory', async ({ page }) => {
  await fixture(page, 'ar');
  const tools = await openTvHeaderActions(page);
  for (const key of ['gulf', 'assets', 'brief', 'map', 'fullscreen', 'refresh', 'ticker-playback', 'scene-playback', 'scene-previous', 'scene-next', 'replay-intro', 'world-stocks-phone']) {
    await expect(tools.locator(`[data-tv-focus-key="${key}"] > span`)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await chooseTvDestination(page, 'sessions');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1') || '{}').sessionIds?.length)).toBe(81);
  await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 5');
});
