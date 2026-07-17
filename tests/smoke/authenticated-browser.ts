import { expect, type Page, type Response as PlaywrightResponse } from '@playwright/test';
import { createAuthenticatedDataClientFromPage } from './authenticated-data-client';

export type E2EBrowserRole = 'user' | 'admin';

type SafeLoginPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  mfaType?: string;
};

function credentialsFor(role: E2EBrowserRole) {
  const prefix = `E2E_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email && !password) return null;
  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD must be configured together.`);
  return { email, password };
}

export async function authenticateBrowserRole(page: Page, role: E2EBrowserRole) {
  const credentials = credentialsFor(role);
  if (!credentials) throw new Error(`Authenticated ${role} browser validation is not configured.`);

  const context = page.context();
  await context.clearCookies({ name: /^(?:sfm_access_token|sfm_auth|sfm_guest)$/ });

  const loginResponse = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  expect(loginResponse?.status() ?? 200).toBeLessThan(500);
  await page.evaluate(() => {
    window.localStorage.removeItem('sfm_guest_mode');
    for (const key of Object.keys(window.localStorage)) {
      if (/^sb-[a-z0-9]+-auth-token$/i.test(key)) window.localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  const loginInput = page
    .locator('input[type="email"], input[autocomplete="username"], input[name="email"], input[name="username"]')
    .first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submit = page.locator('button[type="submit"]').first();
  await expect(loginInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submit).toBeEnabled();
  await loginInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  const responsePromise = page.waitForResponse(response => {
    if (response.request().method() !== 'POST') return false;
    try {
      return new URL(response.url()).pathname === '/api/auth/login';
    } catch {
      return false;
    }
  }, { timeout: 30_000 });

  await submit.click();
  const response = await responsePromise;
  const safePayload = await safeLoginPayload(response);
  expect(
    response.status(),
    `${role} credential sign-in failed: ${JSON.stringify({ status: response.status(), payload: safePayload })}`,
  ).toBe(200);
  expect(safePayload?.ok, `${role} credential sign-in did not return a successful safe status.`).toBe(true);
  expect(safePayload?.status, `${role} credential sign-in did not authenticate.`).toBe('AUTHENTICATED');
  await page.waitForURL(url => url.pathname !== '/login', {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });

  const cookies = await context.cookies();
  const accessCookie = cookies.find(cookie => cookie.name === 'sfm_access_token');
  const authStateCookie = cookies.find(cookie => cookie.name === 'sfm_auth');
  expect(Boolean(accessCookie), `${role} sign-in did not issue the access cookie.`).toBe(true);
  expect(Boolean(authStateCookie), `${role} sign-in did not issue the auth-state cookie.`).toBe(true);
  expect(accessCookie?.httpOnly === true, `${role} access cookie must be HttpOnly.`).toBe(true);
  expect(authStateCookie?.httpOnly === true, `${role} auth-state cookie must be HttpOnly.`).toBe(true);
  if (page.url().startsWith('https://')) {
    expect(accessCookie?.secure === true, `${role} access cookie must be Secure over HTTPS.`).toBe(true);
    expect(authStateCookie?.secure === true, `${role} auth-state cookie must be Secure over HTTPS.`).toBe(true);
  }

  await expect.poll(async () => page.evaluate(() => (
    Object.keys(window.localStorage).some(key => /^sb-[a-z0-9]+-auth-token$/i.test(key))
  )), {
    message: `${role} sign-in did not persist a fresh browser session.`,
    timeout: 30_000,
  }).toBe(true);

  // Validate the JWT with Supabase instead of trusting storage presence alone.
  await createAuthenticatedDataClientFromPage(page);

  const landingPath = role === 'admin' ? '/sfm-admin-control' : '/dashboard';
  const landingResponse = await page.goto(landingPath, { waitUntil: 'domcontentloaded' });
  expect(landingResponse?.status() ?? 200).toBeLessThan(500);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

  if (role === 'admin') {
    await expect(page.locator('.admin-dashboard')).toBeVisible();
    return;
  }

  await expect(page).toHaveURL(/\/(?:dashboard|setup)(?:\?|$)/);
  if (new URL(page.url()).pathname === '/dashboard') {
    await expect(page.locator('main[data-dashboard-executive="true"]')).toBeVisible();
  } else {
    await expect(page.locator('.setup-page')).toBeVisible();
  }
}

async function safeLoginPayload(response: PlaywrightResponse): Promise<SafeLoginPayload | null> {
  const value = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const payload: SafeLoginPayload = {};
  if (typeof value.ok === 'boolean') payload.ok = value.ok;
  if (typeof value.code === 'string') payload.code = value.code.slice(0, 80);
  if (typeof value.status === 'string') payload.status = value.status.slice(0, 80);
  if (typeof value.mfaType === 'string') payload.mfaType = value.mfaType.slice(0, 40);
  return payload;
}
