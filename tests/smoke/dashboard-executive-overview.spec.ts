import { expect, test, type Page, type Route } from '@playwright/test';

const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dashboard-fixture.supabase.co';

const session = {
  access_token: fixtureAccessToken(),
  refresh_token: 'dashboard-safe-fixture-refresh',
  expires_in: 86_400,
  expires_at: 4_102_444_800,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dashboard-fixture@example.invalid',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

function fixtureAccessToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'dashboard-fixture@example.invalid', iat: 1_767_225_600, exp: 4_102_444_800 })}.dashboard-fixture-signature`;
}

const populatedRows: Record<string, unknown> = {
  profiles: { id: session.user.id, default_currency: 'KWD', preferred_currency: 'KWD', onboarding_completed: true },
  monthly_income_sources: [
    { id: 'salary', user_id: session.user.id, amount: 5000, currency: 'KWD', status: 'expected', is_recurring: true, frequency: 'monthly', start_date: '2026-01-01', label: 'Salary' },
    ...['01', '02', '03', '04', '05', '06', '07'].map((month, index) => ({ id: `income-${month}`, user_id: session.user.id, amount: 350 + index * 25, currency: 'KWD', status: 'received', received_date: `2026-${month}-05`, category: 'Additional income' })),
  ],
  expense_items: [
    { id: 'rent', user_id: session.user.id, amount: 1500, currency: 'KWD', is_recurring: true, frequency: 'monthly', start_date: '2026-01-01', date: '2026-01-01', category: 'Housing' },
    ...['02', '03', '04', '05', '06', '07'].map((month, index) => ({ id: `expense-${month}`, user_id: session.user.id, amount: 220 + index * 12, currency: 'KWD', date: `2026-${month}-10`, category: index % 2 ? 'Transport' : 'Living' })),
  ],
  savings_items: [{ id: 'saving-1', user_id: session.user.id, amount: 10000, currency: 'KWD', name: 'Reserve' }],
  financial_goals: [
    { id: 'goal-zero', user_id: session.user.id, goal: 'Emergency reserve', amount: 12000, current_amount: 0, created_at: '2026-01-01T00:00:00.000Z', notes: JSON.stringify({ deadline: '2026-12-31', currency: 'KWD' }) },
    { id: 'goal-active', user_id: session.user.id, goal: 'Education fund', amount: 1000, current_amount: 800, created_at: '2026-01-01T00:00:00.000Z', notes: JSON.stringify({ deadline: '2026-12-31', currency: 'KWD' }) },
  ],
  investment_items: [
    { id: 'investment-kwd', user_id: session.user.id, amount: 3500, current_market_value: 4000, currency: 'KWD', name: 'Local fund' },
    { id: 'investment-usd', user_id: session.user.id, native_market_value: 2000, native_currency: 'USD', currency: 'USD', name: 'US holding' },
  ],
  debts: [{ id: 'debt-1', user_id: session.user.id, remaining_amount: 3000, monthly_payment: 400, currency: 'KWD', status: 'active', name: 'Loan' }],
};

async function installDashboardFixture(page: Page, options: { empty?: boolean; failGoals?: boolean } = {}) {
  const calls = new Map<string, number>();
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        // This UI fixture does not exercise server-side token verification. Preserve an
        // allowed middleware state so the authenticated client fixture can reach dashboard.
        'set-cookie': 'sfm_guest=true; Path=/; SameSite=Lax',
      },
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'AUTHENTICATED', accessToken: session.access_token, refreshToken: session.refresh_token }),
    });
  });
  await page.route('**/api/admin/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, isAdmin: false }) });
  });
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    await fulfillJson(route, { ...session, user: session.user });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1) ?? '';
    if (route.request().method() === 'GET') calls.set(table, (calls.get(table) ?? 0) + 1);
    if (options.failGoals && table === 'financial_goals') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'XX000', message: 'fixture unavailable' }) });
      return;
    }
    const body = options.empty
      ? table === 'profiles' ? populatedRows.profiles : []
      : populatedRows[table] ?? [];
    await fulfillJson(route, body);
  });
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('sfm_lang')) window.localStorage.setItem('sfm_lang', 'en');
    if (!window.localStorage.getItem('the-sfm-theme')) window.localStorage.setItem('the-sfm-theme', 'light');
  });
  return calls;
}

async function authenticateFixture(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const loginInput = page.locator('input[type="email"], input[autocomplete="username"], input[name="email"], input[name="username"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(loginInput).toBeVisible();
  await loginInput.fill('dashboard-fixture@example.invalid');
  await passwordInput.fill('dashboard-safe-password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 15_000 });
  await page.context().addCookies([
    {
      name: 'sfm_guest',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      'content-range': '0-999/*',
    },
    body: JSON.stringify(body),
  });
}

function watchRuntime(page: Page) {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function expectNoHorizontalOverflow(page: Page, context = 'current viewport') {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const measurement = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const containers = ['body', '.sfm-global-header', '.sfm-global-workspaces', '.sfm-workspace-navigation', '[data-dashboard-executive="true"]']
      .map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return { selector, missing: true };
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { selector, left: rect.left, right: rect.right, width: rect.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowX: style.overflowX };
      });
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: element.className, left: rect.left, right: rect.right, width: rect.width };
      })
      .filter(({ left, right }) => left < -1 || right > root.clientWidth + 1)
      .slice(0, 6);
    return {
      clientWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      containers,
      offenders,
    };
  });
  expect(measurement.bodyScrollWidth, `${context}: ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(measurement.clientWidth + 1);
  for (const container of measurement.containers) {
    if ('missing' in container) continue;
    expect(container.left, `${context}: ${JSON.stringify(measurement)}`).toBeGreaterThanOrEqual(-1);
    expect(container.right, `${context}: ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(measurement.clientWidth + 1);
  }
}

test('populated executive overview renders verified data across locales, themes, and widths', async ({ page }, testInfo) => {
  const problems = watchRuntime(page);
  const calls = await installDashboardFixture(page);
  await authenticateFixture(page);
  await expect(page.locator('[data-dashboard-executive="true"]')).toBeVisible();
  await expect(page.locator('[role="progressbar"][aria-valuenow="0"]')).toBeVisible();
  await expect(page.locator('a[href="/goals"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/reports-center"]')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Profile data is also consumed by the authenticated shell. The six tables below
  // are owned exclusively by this page and must not be requested more than once.
  for (const table of ['monthly_income_sources', 'expense_items', 'savings_items', 'financial_goals', 'investment_items', 'debts']) {
    expect(calls.get(table), `${table} should load once on initial render`).toBe(1);
  }

  for (const locale of ['ar', 'en', 'fr'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate(({ locale, theme }) => {
        window.localStorage.setItem('sfm_lang', locale);
        window.localStorage.setItem('the-sfm-theme', theme);
      }, { locale, theme });
      await page.context().addCookies([
        {
          name: 'sfm_guest',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          sameSite: 'Lax',
        },
      ]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-dashboard-executive="true"]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await expect(page.locator('body')).not.toContainText('dashboard_exec_');
      const text = await page.locator('main').innerText();
      expect(text).not.toMatch(/[٠-٩۰-۹]/);
      await expectNoHorizontalOverflow(page, `${locale}/${theme}`);
      const capturePairs: Record<string, string[]> = {
        'chromium-desktop': ['en/light', 'ar/dark', 'fr/light'],
        'mobile-chrome': ['en/dark', 'ar/light', 'fr/dark'],
      };
      if (process.env.DASHBOARD_CAPTURE_SCREENSHOTS === '1' && capturePairs[testInfo.project.name]?.includes(`${locale}/${theme}`)) {
        await page.screenshot({
          path: `docs/screenshots/dashboard-executive/after-${testInfo.project.name}-${locale}-${theme}.png`,
          fullPage: true,
        });
      }
    }
  }

  if (testInfo.project.name === 'chromium-desktop') {
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await expectNoHorizontalOverflow(page, `${width}px`);
      await expect(page.getByRole('button', { name: /refresh|actualiser|تحديث/i })).toBeVisible();
      if (process.env.DASHBOARD_CAPTURE_SCREENSHOTS === '1' && [390, 768, 1440, 1920].includes(width)) {
        await page.screenshot({
          path: `docs/screenshots/dashboard-executive/phase-5-0c-${width}px-fr-dark.png`,
          fullPage: true,
        });
      }
    }
  }

  expect(problems.filter((message) => /hydration|uncaught|failed to fetch/i.test(message))).toEqual([]);
});

test('new-user state explains missing records without rendering fabricated metrics', async ({ page }) => {
  const problems = watchRuntime(page);
  await installDashboardFixture(page, { empty: true });
  await authenticateFixture(page);
  await expect(page.locator('[data-dashboard-executive="true"]')).toBeVisible();
  await expect(page.getByText('No financial goals yet. Add a goal to begin tracking progress.')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.locator('[data-financial-value="true"]').first()).toContainText('—');
  await expectNoHorizontalOverflow(page);
  expect(problems.filter((message) => /hydration|uncaught/i.test(message))).toEqual([]);
});

test('a failed goals source leaves the rest of the dashboard usable', async ({ page }) => {
  await installDashboardFixture(page, { failGoals: true });
  await authenticateFixture(page);
  await expect(page.locator('[data-dashboard-executive="true"]')).toBeVisible();
  await expect(page.getByText('The data source is currently unavailable.')).toBeVisible();
  await expect(page.getByText('A financial source needs review')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
