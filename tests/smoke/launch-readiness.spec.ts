import { expect, test, type Page } from '@playwright/test';

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

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

async function signIn(page: Page, email: string, password: string) {
  await expectUsablePage(page, '/login');
  const loginInput = page
    .locator('input[type="email"], input[autocomplete="username"], input[name="email"], input[name="username"]')
    .first();
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(loginInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await loginInput.fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('domcontentloaded');
}

async function setLanguage(page: Page, lang: 'ar' | 'en') {
  await page.evaluate(nextLang => {
    window.localStorage.setItem('sfm_lang', nextLang);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLang } }));
  }, lang);
}

test.describe('launch smoke coverage', () => {
  test('login/auth page renders and supports credential smoke when configured', async ({ page }) => {
    if (userEmail && userPassword) {
      await signIn(page, userEmail, userPassword);
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    } else {
      await expectUsablePage(page, '/login');
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]').first()).toBeVisible();
    }
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

    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('sfm_guest_mode'))).toBe('true');
    const cookie = await page.evaluate(() => document.cookie);
    expect(cookie).toContain('sfm_guest=true');
    expect(cookie).not.toContain('sfm_auth=true');
    expect(cookie).not.toContain('sfm_access_token=');

    await expectUsablePage(page, '/sfm-admin-control');
    await expect(page).toHaveURL(/\/login\?next=.*sfm-admin-control/);
    expect(consoleErrors).toEqual([]);
  });

  test('dashboard route loads or redirects safely', async ({ page }) => {
    if (userEmail && userPassword) await signIn(page, userEmail, userPassword);
    await expectUsablePage(page, '/dashboard');
  });

  test('admin page access is gated and sidebar shell is available for admins', async ({ page }) => {
    if (adminEmail && adminPassword) {
      await signIn(page, adminEmail, adminPassword);
      await expectUsablePage(page, '/sfm-admin-control');
      await expect(page.locator('nav, aside').first()).toBeVisible();
    } else {
      await expectUsablePage(page, '/sfm-admin-control');
      await expect(page).toHaveURL(/\/login|\/dashboard|\/sfm-admin-control/);
    }
  });

  test('company submission flow route loads without server failure', async ({ page }) => {
    if (userEmail && userPassword) await signIn(page, userEmail, userPassword);
    await expectUsablePage(page, '/company-listing/submit');
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

  test('smart trading terminal access route loads or redirects safely', async ({ page }) => {
    if (adminEmail && adminPassword) await signIn(page, adminEmail, adminPassword);
    await expectUsablePage(page, '/thesfm-trader-own');
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
