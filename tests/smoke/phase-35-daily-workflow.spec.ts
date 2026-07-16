import { expect, test, type Page } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => (
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(4);
}

const authenticatedRouteMatrix = [
  { path: '/today', url: /\/today(?:\?|$)/, marker: '.today-main' },
  { path: '/tasks', url: /\/tasks(?:\?|$)/, marker: '.tasks-toolbar [role="tablist"]' },
  { path: '/notifications', url: /\/notifications(?:\?|$)/, marker: '.notification-list' },
] as const;

async function navigateToStableAuthenticatedRoute(
  page: Page,
  route: (typeof authenticatedRouteMatrix)[number],
) {
  if (page.url() !== 'about:blank') await page.waitForLoadState('domcontentloaded');

  const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).toHaveURL(route.url);
  await expect(page.locator(route.marker)).toBeVisible();
}

test.describe('Phase 3.5 daily workflow consolidation', () => {
  test('guest navigation to the retired Command Center is safely auth-gated', async ({ page }) => {
    const response = await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page).toHaveURL(/\/login\?next=.*command-center/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('the legacy reports bookmark redirects to the full Reports Center for a guest session', async ({ page }) => {
    // The guest page intentionally replaces the document as soon as it hydrates.
    // Waiting only for the initial response commit avoids WebKit treating that
    // expected replacement as an interrupted navigation.
    await page.goto('/guest', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 25_000 });
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/reports-center(?:\?|$)/);
    await expect(page.locator('.reports-center-main:visible')).toBeVisible();
    await expect(page.locator('.reports-layout')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('Reports Center remains responsive across the required viewport widths', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'The complete width matrix runs once in desktop Chromium.');
    await page.goto('/guest', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      await page.goto('/reports-center', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.reports-center-main:visible')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test.describe('authenticated daily workflow', () => {
    test.use({ storageState: userAuthStatePath });

    test('Today, Tasks, Notifications, and Command Center redirect respect the unified responsibility model', async ({ page }) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for source-backed daily workflow validation.');

      await page.goto('/today', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/today(?:\?|$)/);
      await expect(page.locator('.today-main')).toBeVisible();
      await expect(page.locator('a[href="/tasks"]').first()).toBeVisible();
      await expect(page.locator('a[href="/reports-center"]').first()).toBeVisible();
      await expect(page.locator('a[href="/command-center"]')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.tasks-search input')).toBeVisible();
      await expect(page.locator('.tasks-toolbar [role="tablist"]')).toBeVisible();

      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.notif-page')).toBeVisible();
      await expect(page.locator('.notification-list')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/today(?:\?|$)/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/today(?:\?|$)/);
    });

    test('Today, Tasks, and Notifications reflow across the required viewport matrix', async ({ page }, testInfo) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for source-backed workflow validation.');
      test.skip(testInfo.project.name !== 'chromium-desktop', 'The complete width matrix runs once in desktop Chromium.');

      for (const route of authenticatedRouteMatrix) {
        await navigateToStableAuthenticatedRoute(page, route);
        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
          await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
          await expect(page).toHaveURL(route.url);
          await expect(page.locator(route.marker)).toBeVisible();
          await expectNoHorizontalOverflow(page);
        }
      }
    });

    test('Today renders Arabic, English, French, dark, and light without changing routes', async ({ page }, testInfo) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for localized workflow validation.');
      test.skip(testInfo.project.name !== 'chromium-desktop', 'Locale and theme combinations run once in desktop Chromium.');
      await page.goto('/today', { waitUntil: 'domcontentloaded' });

      for (const [lang, theme, direction] of [
        ['ar', 'dark', 'rtl'],
        ['en', 'light', 'ltr'],
        ['fr', 'dark', 'ltr'],
      ] as const) {
        await page.evaluate(({ nextLang, nextTheme }) => {
          window.localStorage.setItem('sfm_lang', nextLang);
          window.localStorage.setItem('the-sfm-theme', nextTheme);
        }, { nextLang: lang, nextTheme: theme });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.locator('html')).toHaveAttribute('dir', direction);
        await expect(page.locator('html')).toHaveClass(new RegExp(theme));
        await expect(page.locator('.today-main')).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });
  });
});
