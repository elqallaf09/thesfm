import { expect, test, type FrameLocator, type Page } from '@playwright/test';
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

async function expectTraderThemeStable(frame: FrameLocator, expectedTheme: 'light' | 'dark') {
  await expect.poll(async () => frame.locator('html').evaluate(element => {
    const frameWindow = element.ownerDocument.defaultView as (Window & {
      SFMTraderTheme?: { getResolvedTheme?: () => string };
    }) | null;

    return {
      attribute: element.getAttribute('data-theme'),
      bridge: frameWindow?.SFMTraderTheme?.getResolvedTheme?.() ?? null,
    };
  }), {
    message: `Trader theme bridge should settle on ${expectedTheme}`,
    timeout: 20_000,
  }).toEqual({ attribute: expectedTheme, bridge: expectedTheme });
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
    let guestSessionActivations = 0;
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/auth/session'
        && request.method() === 'DELETE'
        && request.headers()['x-sfm-guest-session'] === 'activate') {
        guestSessionActivations += 1;
      }
    });

    await expectUsablePage(page, '/login?mode=register');
    const guestButton = page.locator('button.guest-btn').first();
    await expect(guestButton).toBeVisible();
    await guestButton.click();
    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
    await expect(page.locator('main[data-dashboard-executive="true"]')).toBeVisible();
    await expect(page.locator('.sfm-user-chip').first()).toBeAttached();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('sfm_guest_mode'))).toBe('true');
    const cookie = await page.evaluate(() => document.cookie);
    expect(cookie).toContain('sfm_guest=true');
    expect(cookie).not.toContain('sfm_auth=true');
    expect(cookie).not.toContain('sfm_access_token=');
    expect(guestSessionActivations).toBe(1);

    for (const guestPath of ['/invest', '/reports-center', '/dashboard']) {
      await expectUsablePage(page, guestPath);
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('sfm_guest_mode'))).toBe('true');
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    expect(guestSessionActivations).toBe(1);

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
        await expect(page).toHaveURL(/\/(?:dashboard|setup)(?:\?|$)/);
        if (new URL(page.url()).pathname === '/dashboard') {
          await expect(page.locator('main[data-dashboard-executive="true"]')).toBeVisible();
        } else {
          await expect(page.locator('.setup-page')).toBeVisible();
        }
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
        const adminShell = page
          .locator('main[data-sfm-shell="dashboard"]')
          .filter({ has: page.locator('.admin-dashboard') });
        await expect(adminShell).toHaveCount(1);
        await expect(adminShell).toBeVisible();
        await expect(adminShell.locator('.admin-dashboard')).toBeVisible();
        await expect(isMobile
          ? page.locator('header.sfm-global-header')
          : page.locator('aside.sfm-shared-sidebar')).toBeVisible();
      } else {
        await expect(page).toHaveURL(/\/login|\/dashboard|\/sfm-admin-control/);
      }
    });

    test('smart trading terminal access route loads or redirects safely', async ({ page, isMobile }) => {
      test.slow();
      await page.addInitScript(() => {
        if (window.localStorage.getItem('sfm-phase34-theme-seeded') === 'true') return;
        window.localStorage.setItem('sfm-phase34-theme-seeded', 'true');
        window.localStorage.setItem('the-sfm-theme', 'light');
        window.localStorage.setItem('theme', 'light');
        window.localStorage.setItem('sfm_settings', JSON.stringify({ theme: 'light' }));
        window.localStorage.setItem('sfmTraderTheme', 'dark');
        window.localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ theme: 'dark' }));
        window.localStorage.setItem('the-sfm-trader-settings', JSON.stringify({ theme: 'dark' }));
      });
      const response = await page.goto('/thesfm-trader-own', { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 200).toBeLessThan(500);

      if (adminAuthConfigured) {
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        const traderShell = page.getByRole('main', { name: 'SFM Smart Analyzer' });
        await expect(traderShell).toBeVisible();
        const iframeSelector = 'iframe.trader-shell-frame[title="SFM Smart Analyzer"]';
        await expect(page.locator(iframeSelector)).toHaveCount(1);
        const iframe = traderShell.locator(iframeSelector);
        await expect(iframe).toHaveCount(1);
        await expect(iframe).toBeVisible();
        await expect(iframe).toHaveAttribute('src', '/thesfm-trader-own/app/index.html?route=home');
        const traderFrame = traderShell.frameLocator(iframeSelector);
        await page.waitForLoadState('load');
        await expect(traderFrame.locator('#app-shell')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('html')).toHaveClass(/light/);
        await expectTraderThemeStable(traderFrame, 'light');
        await expect(traderFrame.locator('#theme-switcher, #terminal-language-switcher, .workspace-exit-link, .workspace-exit-chip')).toHaveCount(0);
        const stableFrameSrc = await iframe.getAttribute('src');

        if (isMobile) {
          const mobileMenuButton = page.locator('.sfm-global-menu-button');
          const mobileMenu = page.locator('#sfm-mobile-menu');
          await expect(mobileMenuButton).toBeVisible();
          await expect(async () => {
            if (await mobileMenu.count() === 0) await mobileMenuButton.click();
            await expect(mobileMenu).toBeAttached({ timeout: 1_000 });
          }).toPass({ timeout: 20_000 });
          await expect(mobileMenu).toBeVisible({ timeout: 20_000 });
        }

        const themeToggle = isMobile
          ? page.locator('#sfm-mobile-menu .sfm-theme-toggle:not(.sfm-density-toggle)')
          : page.locator('header.sfm-global-header .sfm-theme-toggle:not(.sfm-density-toggle)');
        await expect(themeToggle).toHaveCount(1);
        await expect(themeToggle).toBeVisible();
        await themeToggle.focus();
        await expect(themeToggle).toBeFocused();
        await expect(async () => {
          if (await page.locator('html').evaluate(element => element.classList.contains('dark'))) return;
          if (isMobile) await themeToggle.press('Enter');
          else await themeToggle.click();
          await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 1_000 });
        }).toPass({ timeout: 8_000 });
        await expect(themeToggle).toBeFocused();
        if (isMobile) {
          await page.locator('#sfm-mobile-menu .sfm-mobile-close').click();
          await expect(page.locator('#sfm-mobile-menu')).toBeHidden();
        }
        await expectTraderThemeStable(traderFrame, 'dark');
        await expect(iframe).toHaveAttribute('src', stableFrameSrc ?? '/thesfm-trader-own/app/index.html?route=home');

        await page.waitForLoadState('load');
        await page.reload({ waitUntil: 'load' });
        const reloadedTraderShell = page.getByRole('main', { name: 'SFM Smart Analyzer' });
        await expect(reloadedTraderShell).toHaveCount(1);
        const reloadedIframe = reloadedTraderShell.locator(iframeSelector);
        await expect(reloadedIframe).toHaveCount(1);
        await expect(reloadedIframe).toBeVisible();
        await expect(page.locator(`${iframeSelector}:visible`)).toHaveCount(1);
        const reloadedFrame = reloadedIframe.contentFrame();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(reloadedFrame.locator('#app-shell')).toBeVisible({ timeout: 20_000 });
        await expectTraderThemeStable(reloadedFrame, 'dark');
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
