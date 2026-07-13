import { expect, test, type Page } from '@playwright/test';
import { adminAuthStatePath, userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const adminAuthConfigured = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

// Credentialed auth responses and prefilled identifiers can enter Playwright
// traces/screenshots. Keep this file artifact-free while preserving every
// assertion; the remaining smoke files still retain failure diagnostics.
test.use({ trace: 'off', screenshot: 'off' });

async function expectUsablePage(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    return Math.max(documentElement.scrollWidth, body.scrollWidth) - documentElement.clientWidth;
  })).toBeLessThanOrEqual(4);
}

async function setLanguage(page: Page, lang: 'ar' | 'en') {
  await page.evaluate(nextLang => {
    window.localStorage.setItem('sfm_lang', nextLang);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLang } }));
  }, lang);
}

test.describe('launch smoke coverage', () => {
  test('login/auth page renders and is interactive after hydration', async ({ page }) => {
    await expectUsablePage(page, '/login');
    await expect(page.locator('input[autocomplete="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeEnabled();
  });

  test('continue as guest works from the registration view', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await expectUsablePage(page, '/login?mode=register');
    const guestButton = page.locator('button.guest-btn').first();
    await expect(guestButton).toBeVisible();
    await guestButton.click();
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
    await expect(page.locator('main.dashboard-main')).toBeVisible();
    await expect(page.locator('.sfm-user-chip').first()).toBeAttached();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('sfm_guest_mode'))).toBe('true');
    const cookie = await page.evaluate(() => document.cookie);
    expect(cookie).toContain('sfm_guest=true');
    expect(cookie).not.toContain('sfm_auth=true');
    expect(cookie).not.toContain('sfm_access_token=');

    await expectUsablePage(page, '/sfm-admin-control');
    await expect(page).toHaveURL(/\/login\?next=.*sfm-admin-control/);
    expect(consoleErrors).toEqual([]);
  });

  test.describe('authenticated user routes', () => {
    test.use({ storageState: userAuthStatePath });

    test('dashboard route loads or redirects safely', async ({ page }) => {
      await expectUsablePage(page, '/dashboard');
      if (userAuthConfigured) {
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        await expect(page.locator('main.dashboard-main')).toBeVisible();
      }
    });

    test('company submission flow route loads without server failure', async ({ page }) => {
      await expectUsablePage(page, '/company-listing/submit');
      if (userAuthConfigured) {
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        await expect(page.locator('.company-submit-shell')).toBeVisible();
      }
    });
  });

  test.describe('authenticated admin routes', () => {
    test.use({ storageState: adminAuthStatePath });

    test('admin page access is gated and responsive admin shell is available for admins', async ({ page, isMobile }) => {
      await expectUsablePage(page, '/sfm-admin-control');
      if (adminAuthConfigured) {
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        await expect(page.locator('main.admin-dashboard').first()).toBeVisible();
        await expect(isMobile
          ? page.locator('header.sfm-global-header')
          : page.locator('aside.sfm-shared-sidebar')).toBeVisible();
      } else {
        await expect(page).toHaveURL(/\/login|\/dashboard|\/sfm-admin-control/);
      }
    });

    test('smart trading terminal access route loads or redirects safely', async ({ page }) => {
      const response = await page.goto('/thesfm-trader-own', { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 200).toBeLessThan(500);

      if (adminAuthConfigured) {
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        const iframe = page.locator('iframe.trader-shell-frame[title="SFM Smart Analyzer"]');
        await expect(iframe).toBeVisible();
        await expect(iframe).toHaveAttribute('src', '/thesfm-trader-own/app/index.html?route=home');
        await expect(page.frameLocator('iframe.trader-shell-frame').locator('#app-shell')).toBeVisible();
        await expectNoHorizontalOverflow(page);
      } else {
        await expect(page.locator('body')).toBeVisible();
        await expect(page).toHaveURL(/\/login|\/thesfm-trader-own/);
      }
    });
  });

  test('Stripe checkout session route returns a safe API response', async ({ request }) => {
    const response = await request.post('/api/stripe/create-checkout-session', {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
    const bodyText = await response.text();
    expect(bodyText).not.toMatch(/sk_live|sk_test|whsec_|stack|ECONNREFUSED/i);
  });

  test('market-analysis page loads', async ({ page }) => {
    await expectUsablePage(page, '/market-analysis');
  });

  test('Arabic RTL and English LTR basics are applied', async ({ page }) => {
    await expectUsablePage(page, '/login');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.sfmLang)).toBeTruthy();

    await setLanguage(page, 'ar');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.sfmLang)).toBe('ar');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe('rtl');

    await setLanguage(page, 'en');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.sfmLang)).toBe('en');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe('ltr');
  });

  test('mobile viewport navigation and sidebar basics do not overflow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile viewport coverage runs in the mobile project');
    await expectUsablePage(page, '/market-analysis');
    const navTrigger = page.locator('button[aria-label*="menu" i], button[aria-label*="القائمة"], button:has-text("☰")').first();
    if (await navTrigger.isVisible().catch(() => false)) {
      await navTrigger.click();
      await expectNoHorizontalOverflow(page);
    }
  });
});
