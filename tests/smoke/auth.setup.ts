import { promises as fs } from 'node:fs';
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type Response as PlaywrightResponse,
} from '@playwright/test';
import { adminAuthStatePath, authStateDir, userAuthStatePath } from './auth-state';
import { previewProtectionStatePath } from './preview-protection-state';

const httpsLoopback = process.env.PLAYWRIGHT_HTTPS_LOOPBACK === '1';
const baseURL = process.env.E2E_BASE_URL
  || (httpsLoopback ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3000');

type SafeLoginPayload = {
  ok?: boolean;
  code?: string;
  status?: string;
  mfaType?: string;
};

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(90_000);

test('real user and admin sign-ins create reusable browser sessions', async ({ browser }) => {
  await fs.rm(authStateDir, { recursive: true, force: true });
  await fs.mkdir(authStateDir, { recursive: true });

  await createRoleState(
    browser,
    'user',
    process.env.E2E_USER_EMAIL,
    process.env.E2E_USER_PASSWORD,
    userAuthStatePath,
  );
  await createRoleState(
    browser,
    'admin',
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_ADMIN_PASSWORD,
    adminAuthStatePath,
  );
});

async function createRoleState(
  browser: Browser,
  role: 'user' | 'admin',
  email: string | undefined,
  password: string | undefined,
  statePath: string,
) {
  const hasEmail = Boolean(email);
  const hasPassword = Boolean(password);
  if (hasEmail !== hasPassword) {
    throw new Error(`Both E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD are required together.`);
  }

  if (!email || !password) {
    await fs.writeFile(statePath, JSON.stringify({ cookies: [], origins: [] }), { mode: 0o600 });
    return;
  }

  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: httpsLoopback,
    ...(process.env.E2E_BASE_URL ? { storageState: previewProtectionStatePath } : {}),
  });
  try {
    const page = await context.newPage();
    await signIn(page, context, email, password, role);
    await context.storageState({ path: statePath });
    await fs.chmod(statePath, 0o600);
  } finally {
    await context.close();
  }
}

async function signIn(
  page: Page,
  context: BrowserContext,
  email: string,
  password: string,
  role: 'user' | 'admin',
) {
  const pageResponse = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  expect(pageResponse?.status() ?? 200).toBeLessThan(500);

  const loginInput = page
    .locator('input[type="email"], input[autocomplete="username"], input[name="email"], input[name="username"]')
    .first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submit = page.locator('button[type="submit"]').first();
  await expect(loginInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submit).toBeEnabled();
  await loginInput.fill(email);
  await passwordInput.fill(password);

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
  if (baseURL.startsWith('https://')) {
    expect(accessCookie?.secure === true, `${role} access cookie must be Secure over HTTPS.`).toBe(true);
    expect(authStateCookie?.secure === true, `${role} auth-state cookie must be Secure over HTTPS.`).toBe(true);
  }

  await expect.poll(async () => {
    return page.evaluate(() => {
      return Object.keys(window.localStorage).some(key => /^sb-[a-z0-9]+-auth-token$/i.test(key));
    }).catch(() => false);
  }, {
    message: `${role} sign-in did not persist the browser session.`,
    timeout: 30_000,
  }).toBe(true);
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
