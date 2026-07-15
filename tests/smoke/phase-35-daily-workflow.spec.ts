import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect.poll(async () => page.evaluate(() => (
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(4);
}

test.describe('Phase 3.5 daily workflow consolidation', () => {
  test('guest navigation to the retired Command Center is safely auth-gated', async ({ page }) => {
    const response = await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page).toHaveURL(/\/login\?next=.*command-center/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('the legacy reports bookmark redirects to the full Reports Center for a guest session', async ({ page }) => {
    await page.goto('/guest', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard(?:\?|$)/);
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/reports-center(?:\?|$)/);
    await expect(page.locator('.reports-center-main')).toBeVisible();
    await expect(page.locator('.reports-layout')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('Reports Center remains responsive across the required viewport widths', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'The complete width matrix runs once in desktop Chromium.');
    await page.goto('/guest', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard(?:\?|$)/);

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      await page.goto('/reports-center', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.reports-center-main')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test.describe('authenticated daily workflow', () => {
    test.use({ storageState: userAuthStatePath });

    test('Today, Tasks, and Command Center redirect work without duplicate navigation', async ({ page }) => {
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
      await expect(page.locator('.tasks-tabs')).toBeVisible();

      await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/today(?:\?|$)/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/today(?:\?|$)/);
    });
  });
});
