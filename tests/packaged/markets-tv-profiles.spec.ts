import { expect, test, type Page } from '@playwright/test';
import { chooseTvDestination, openAndroidTvPackage, openTvMenu } from './packageHarness';
import type { TvLanguage } from '../../src/lib/markets-tv/types';

// Isolated account fixtures only; credentials and holdings never enter app fallbacks.
const tokens = ['a'.repeat(64), 'b'.repeat(64)];
const names = ['First household', 'Second household'];
const holdings = ['Private account Alpha holding', 'Private account Beta holding'];
const instant = '2026-11-19T10:00:00Z';
const pickerCopy = {
  ar: { title: 'من يشاهد الآن؟', guest: 'المشاهدة كضيف', add: 'إضافة حساب' },
  en: { title: 'Who is watching?', guest: 'Watch as guest', add: 'Add account' },
  fr: { title: 'Qui regarde ?', guest: 'Regarder en invité', add: 'Ajouter un compte' },
};
type ObservedRequest = { path: string; url: string; token?: string; body: string; referrer: string };

async function fixture(page: Page, language: TvLanguage) {
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ language, tokens, names }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    if (localStorage.getItem('sfm-markets-tv-profiles-v1')) return;
    localStorage.setItem('sfm-markets-tv-profiles-v1', JSON.stringify(tokens.map((token, index) => ({ token, name: names[index] }))));
    localStorage.setItem('sfm-markets-tv-device-v1', tokens[0]);
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme: 'dark', displayMode: 'viewing', broadcastChannel: 'investments', autoRotate: false, sessionAutoRotate: false, ticker: false }));
  }, { language, tokens, names });
  const requests: ObservedRequest[] = [], messages: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push({ path: new URL(request.url()).pathname, url: request.url(),
    token: request.headers()['x-sfm-tv-token'], body: request.postData() || '', referrer: request.headers().referer || '' }));
  page.on('console', message => messages.push(message.text()));
  page.on('pageerror', error => { messages.push(error.message); errors.push(error.message); });
  await page.route('**/api/**', route => {
    const request = route.request(), url = new URL(request.url());
    const account = tokens.indexOf(request.headers()['x-sfm-tv-token']);
    if (url.pathname === '/api/tv/device' || url.pathname === '/api/tv/portfolio') {
      if (account < 0) return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } });
      if (url.pathname === '/api/tv/device') return route.fulfill({ json: {
        device: { id: `test-device-${account}`, name: names[account], settings: { language, theme: 'dark', displayMode: 'viewing', broadcastChannel: 'investments', autoRotate: false, sessionAutoRotate: false, ticker: false } }, symbols: [], alerts: [],
      } });
      const amount = account === 0 ? 11111.01 : 22222.02;
      return route.fulfill({ json: { currency: 'USD', generatedAt: instant, total: 1, totalValue: amount, totalCost: 1000, valueCoverage: 1, costCoverage: 1,
        positions: [{ id: `private-position-${account}`, name: holdings[account], symbol: '', assetClass: 'funds', quantity: 1,
          value: { amount, currency: 'USD' }, baseValue: amount, baseCost: 1000, platform: 'QA', source: 'Recorded test source', valuedAt: instant, freshness: 'recorded' }],
        allocation: [{ assetClass: 'funds', amount, count: 1 }],
      } });
    }
    return route.fulfill({ json: { markets: [], quotes: [], summary: [], items: [], stories: [], points: [], total: 0, available: 0, generatedAt: instant } });
  });
  await openAndroidTvPackage(page, { keepMenu: true });
  return { requests, messages, errors };
}

async function expectNoRenderedCredentials(page: Page) {
  const rendered = `${page.url()}\n${await page.content()}`;
  for (const token of tokens) expect(rendered).not.toContain(token);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test(`profiles ${language}: explicit account choice, isolated holdings, guest access and no credential leaks`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 });
    const { requests, messages, errors } = await fixture(page, language);
    const privateRequests = () => requests.filter(request => ['/api/tv/device', '/api/tv/portfolio'].includes(request.path));
    const picker = page.locator('.tv-account-picker');
    await expect(picker).toBeVisible();
    await expect(picker.getByRole('heading')).toHaveText(pickerCopy[language].title);
    await expect(picker.locator('[data-tv-focus-key=account-guest]')).toHaveText(pickerCopy[language].guest);
    await expect(picker.locator('[data-tv-focus-key=account-add]')).toHaveText(pickerCopy[language].add);
    await expect(picker.locator('.tv-account-list button > span > bdi')).toHaveText(names);
    await expect(picker.locator('[data-tv-focus-key=account-0]')).toBeFocused();
    for (const [width, height] of [[960, 540], [390, 844], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await expect(picker).toBeInViewport({ ratio: 1 });
      for (const control of await picker.locator('button').all()) await expect(control).toBeInViewport({ ratio: 1 });
      expect(await picker.evaluate(element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    }
    // Back and channel shortcuts cannot silently select the saved legacy token.
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    await page.clock.fastForward(61_000);
    await expect(picker).toBeVisible();
    expect(privateRequests()).toEqual([]);
    await expectNoRenderedCredentials(page);

    await picker.locator('[data-tv-focus-key=account-0]').press('Enter');
    await expect(picker).toHaveCount(0);
    await chooseTvDestination(page, 'investments');
    await expect(page.locator('.tv-portfolio-position')).toContainText(holdings[0]);
    await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('11,111.01');
    expect(privateRequests().length).toBeGreaterThan(0);
    expect(privateRequests().every(request => request.token === tokens[0])).toBe(true);
    await expectNoRenderedCredentials(page);

    await openTvMenu(page);
    await page.locator('[data-tv-focus-key=switch-account]').click();
    await expect(picker).toBeVisible();
    await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);
    for (const holding of holdings) await expect(page.locator('[data-tv-root]')).not.toContainText(holding);
    const beforeSecondChoice = privateRequests().length;
    await page.clock.fastForward(61_000);
    expect(privateRequests()).toHaveLength(beforeSecondChoice);
    await picker.locator('[data-tv-focus-key=account-1]').press('Enter');
    await chooseTvDestination(page, 'investments');
    await expect(page.locator('.tv-portfolio-position')).toContainText(holdings[1]);
    await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('22,222.02');
    await expect(page.locator('[data-tv-root]')).not.toContainText(holdings[0]);
    const secondRequests = privateRequests().slice(beforeSecondChoice);
    expect(secondRequests.length).toBeGreaterThan(0);
    expect(secondRequests.every(request => request.token === tokens[1])).toBe(true);
    await expectNoRenderedCredentials(page);

    await openTvMenu(page);
    await page.locator('[data-tv-focus-key=switch-account]').click();
    await expect(picker).toBeVisible();
    await picker.locator('[data-tv-focus-key=account-guest]').press('Enter');
    await expect(picker).toHaveCount(0);
    await chooseTvDestination(page, 'investments');
    await expect(page.locator('.tv-portfolio-gate')).toBeVisible();
    await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);
    const beforeGuestRefresh = privateRequests().length;
    await page.clock.fastForward(90_000);
    expect(privateRequests()).toHaveLength(beforeGuestRefresh);
    expect(await page.evaluate(() => localStorage.getItem('sfm-markets-tv-device-v1'))).toBeNull();
    const stored = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
    for (const holding of holdings) {
      await expect(page.locator('[data-tv-root]')).not.toContainText(holding);
      expect(stored.local + stored.session).not.toContain(holding);
    }

    // Guest viewing retains saved account choices but never restores access on reload.
    await page.reload();
    await expect(picker).toBeVisible();
    await expect(picker.locator('.tv-account-list button > span > bdi')).toHaveText(names);
    await page.clock.fastForward(61_000);
    expect(privateRequests()).toHaveLength(beforeGuestRefresh);
    await expectNoRenderedCredentials(page);
    for (const token of tokens) {
      expect(messages.join('\n')).not.toContain(token);
      expect(requests.map(request => request.url + request.body + request.referrer).join('\n')).not.toContain(token);
    }
    expect(requests.filter(request => !['/api/tv/device', '/api/tv/portfolio'].includes(request.path)).every(request => !request.token)).toBe(true);
    expect(errors).toEqual([]);
  });
}
