import { expect, test, type Page, type Response as PlaywrightResponse } from '@playwright/test';

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

// Credentialed auth responses and prefilled identifiers can enter Playwright
// traces/screenshots. Keep this file artifact-free while preserving every
// assertion; the remaining smoke files still retain failure diagnostics.
test.use({ trace: 'off', screenshot: 'off' });

type SafeLoginPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  mfaType?: string;
};

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

async function safeLoginPayload(response: PlaywrightResponse | null): Promise<SafeLoginPayload | null> {
  if (!response) return null;
  const value = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const payload: SafeLoginPayload = {};
  if (typeof value.ok === 'boolean') payload.ok = value.ok;
  if (typeof value.code === 'string') payload.code = value.code.slice(0, 80);
  if (typeof value.status === 'string') payload.status = value.status.slice(0, 80);
  if (typeof value.mfaType === 'string') payload.mfaType = value.mfaType.slice(0, 40);
  return payload;
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

  const loginResponsePromise = page.waitForResponse(response => {
    if (response.request().method() !== 'POST') return false;
    try {
      return new URL(response.url()).pathname === '/api/auth/login';
    } catch {
      return false;
    }
  }, { timeout: 20_000 }).catch(() => null);

  await page.locator('button[type="submit"]').first().click();
  const loginError = page.locator('[role="alert"]').first();
  await Promise.race([
    page.waitForURL(url => url.pathname !== '/login', { timeout: 20_000 }),
    loginError.waitFor({ state: 'visible', timeout: 20_000 }),
  ]).catch(() => undefined);

  const response = await Promise.race([
    loginResponsePromise,
    page.waitForTimeout(250).then(() => null),
  ]);
  const cookies = (await page.context().cookies())
    .filter(cookie => cookie.name.startsWith('sfm_') || cookie.name.startsWith('sb-'))
    .map(cookie => ({
      name: cookie.name,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const visibleError = await loginError.isVisible().catch(() => false)
    ? (await loginError.textContent())?.trim().slice(0, 240) || null
    : null;
  const diagnostics = {
    loginResponseStatus: response?.status() ?? 'not_observed',
    loginResponse: await safeLoginPayload(response),
    visibleError,
    cookies,
  };

  await expect(page, `Sign-in did not leave /login. Safe diagnostics: ${JSON.stringify(diagnostics)}`)
    .not.toHaveURL(/\/login(?:\?|$)/);
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

  test('dashboard route loads or redirects safely', async ({ page }) => {
    if (userEmail && userPassword) await signIn(page, userEmail, userPassword);
    await expectUsablePage(page, '/dashboard');
  });

  test('admin page access is gated and responsive admin shell is available for admins', async ({ page, isMobile }) => {
    if (adminEmail && adminPassword) {
      await signIn(page, adminEmail, adminPassword);
      await expectUsablePage(page, '/sfm-admin-control');
      await expect(page.locator('main.admin-dashboard').first()).toBeVisible();
      await expect(isMobile
        ? page.locator('header.sfm-global-header')
        : page.locator('aside.sfm-shared-sidebar')).toBeVisible();
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
