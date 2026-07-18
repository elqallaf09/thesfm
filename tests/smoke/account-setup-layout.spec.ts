import { expect, test, type Page } from '@playwright/test';

import { userAuthStatePath } from './auth-state';

const supabaseUrl = process.env.SUPABASE_PREVIEW_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://missing-supabase-env.supabase.co';
const mobileWidths = [320, 375, 390, 430, 768] as const;
const desktopWidths = [1024, 1280, 1440, 1920] as const;

test.use({
  storageState: userAuthStatePath,
  trace: 'off',
  screenshot: 'off',
  video: 'off',
});

test.describe('Account Setup workspace layout', () => {
  test.beforeEach(async ({ page }) => {
    await installMockUserSession(page);
  });

  test('uses the shared full-width shell with responsive columns and no overflow', async ({ page }) => {
    test.slow();

    for (const width of [...mobileWidths, ...desktopWidths]) {
      await page.setViewportSize({ width, height: 900 });
      await openSetup(page);

      const workspaceContainer = page.locator('[data-workspace-page-container="true"]').first();
      const pageShell = page.locator('.account-setup-workspace-page');
      const content = page.locator('.setup-content');

      await expect(workspaceContainer).toHaveAttribute('data-workspace-page-variant', 'full');
      await expect(pageShell).toBeVisible();
      await expect(content).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const geometry = await pageShell.evaluate(shell => {
        const contentElement = shell.querySelector<HTMLElement>('.setup-content')!;
        const mainElement = shell.querySelector<HTMLElement>('.step-main')!;
        const progressElement = shell.querySelector<HTMLElement>('.step-side')!;
        const shellRect = shell.getBoundingClientRect();
        const contentRect = contentElement.getBoundingClientRect();
        const mainRect = mainElement.getBoundingClientRect();
        const progressRect = progressElement.getBoundingClientRect();
        return {
          shellWidth: shellRect.width,
          contentWidth: contentRect.width,
          main: { x: mainRect.x, y: mainRect.y, width: mainRect.width, bottom: mainRect.bottom },
          progress: { x: progressRect.x, y: progressRect.y, width: progressRect.width },
        };
      });

      expect(geometry.contentWidth).toBeGreaterThanOrEqual(geometry.shellWidth - 2);
      if (desktopWidths.includes(width as (typeof desktopWidths)[number])) {
        expect(Math.abs(geometry.main.y - geometry.progress.y)).toBeLessThanOrEqual(2);
        expect(geometry.main.width).toBeGreaterThan(geometry.progress.width);
        expect(geometry.progress.width).toBeGreaterThanOrEqual(279);
        expect(geometry.progress.width).toBeLessThanOrEqual(321);
      } else {
        expect(geometry.progress.y).toBeGreaterThanOrEqual(geometry.main.bottom - 2);
        expect(Math.abs(geometry.main.width - geometry.progress.width)).toBeLessThanOrEqual(2);
      }
    }
  });

  test('mirrors logical columns in Arabic RTL and English LTR', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSetup(page);

    await setLanguage(page, 'en');
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('ltr');
    const ltr = await columnPositions(page);
    expect(ltr.mainX).toBeLessThan(ltr.progressX);

    await setLanguage(page, 'ar');
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');
    const rtl = await columnPositions(page);
    expect(rtl.mainX).toBeGreaterThan(rtl.progressX);
    await expectNoHorizontalOverflow(page);
  });

  test('keeps the sticky progress panel below the header in light and dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const theme of ['light', 'dark'] as const) {
      await page.addInitScript(nextTheme => {
        window.localStorage.setItem('the-sfm-theme', nextTheme);
      }, theme);
      await openSetup(page);
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
      else await expect(page.locator('html')).not.toHaveClass(/dark/);

      const stickyOffset = await page.locator('.step-side').evaluate(element => {
        const rootStyle = getComputedStyle(document.documentElement);
        const workspaceContainer = document.querySelector<HTMLElement>('[data-workspace-page-container="true"]')!;
        const expected = [
          '--global-header-height',
          '--app-header-inset-block',
          '--app-header-gap-block',
        ].reduce((sum, token) => sum + Number.parseFloat(rootStyle.getPropertyValue(token)), 0)
          + Number.parseFloat(getComputedStyle(workspaceContainer).paddingTop);
        return {
          actual: Number.parseFloat(getComputedStyle(element).top),
          expected,
        };
      });

      expect(Math.abs(stickyOffset.actual - stickyOffset.expected)).toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow(page);
    }
  });
});

async function openSetup(page: Page) {
  const response = await page.goto('/setup', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).toHaveURL(/\/setup(?:\?|$)/);
  await expect(page.locator('.setup-page')).toBeVisible();
}

async function installMockUserSession(page: Page) {
  const hostname = new URL(supabaseUrl).hostname;
  const projectRef = hostname.split('.')[0];

  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));
  await page.route(`**/${hostname}/**`, route => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith('/auth/v1/user')
      ? { id: 'account-setup-layout-user', role: 'authenticated', user_metadata: {} }
      : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.addInitScript(({ storageKey }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
    const encode = (value: object) => window.btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      sub: 'account-setup-layout-user',
      role: 'authenticated',
      exp: expiresAt,
    })}.layout-test`;

    window.localStorage.setItem(storageKey, JSON.stringify({
      access_token: accessToken,
      refresh_token: 'account-setup-layout-refresh-token',
      expires_at: expiresAt,
      expires_in: 60 * 60,
      token_type: 'bearer',
      user: {
        id: 'account-setup-layout-user',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'layout-test@example.invalid',
        app_metadata: {},
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    }));
  }, { storageKey: `sb-${projectRef}-auth-token` });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

async function setLanguage(page: Page, lang: 'ar' | 'en') {
  await page.evaluate(nextLanguage => {
    window.localStorage.setItem('sfm_lang', nextLanguage);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
  }, lang);
}

async function columnPositions(page: Page) {
  const main = page.locator('.step-main');
  const progress = page.locator('.step-side');
  await expect(main).toBeVisible();
  await expect(progress).toBeVisible();
  const [mainBox, progressBox] = await Promise.all([main.boundingBox(), progress.boundingBox()]);
  expect(mainBox).not.toBeNull();
  expect(progressBox).not.toBeNull();
  return {
    mainX: mainBox!.x,
    progressX: progressBox!.x,
  };
}
