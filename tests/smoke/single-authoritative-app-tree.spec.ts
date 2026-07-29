import { expect, test, type Page } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

function stubAnalystReads(page: Page) {
  return Promise.all([
    page.route('**/api/intelligence/recent**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, recent: { items: [] } }),
    })),
    page.route('**/api/intelligence/accuracy**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, accuracy: null }),
    })),
    page.route('**/api/intelligence/latest**', route => route.fulfill({
      status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'NOT_FOUND' } }),
    })),
  ]);
}

async function enterGuest(page: Page) {
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').first().click();
  await page.waitForURL(/\/dashboard(?:\?|$)/);
}

async function setStoredLang(page: Page, lang: 'ar' | 'en' | 'fr') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('sfm_lang', value);
  }, lang);
}

async function switchLangAtRuntime(page: Page, lang: 'ar' | 'en' | 'fr') {
  await page.evaluate((value) => {
    window.localStorage.setItem('sfm_lang', value);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: value } }));
  }, lang);
}

test.describe('single authoritative application tree', () => {
  test.describe('AI Analyst workspace (guest)', () => {
    test('initial Arabic load renders exactly one workspace tree in rtl', async ({ page }) => {
      await stubAnalystReads(page);
      await enterGuest(page);
      await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });

      await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);
      await expect(page.locator('main[data-testid="ai-analyst-workspace"]')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('main')).toHaveCount(1);
    });

    test('initial English load renders exactly one workspace tree in ltr', async ({ page }) => {
      await stubAnalystReads(page);
      await enterGuest(page);
      await setStoredLang(page, 'en');
      await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });

      await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);
      await expect(page.locator('main[data-testid="ai-analyst-workspace"]')).toHaveAttribute('dir', 'ltr');
      await expect(page.locator('main')).toHaveCount(1);
    });

    test('locale switching AR -> EN -> FR keeps exactly one workspace tree at every step', async ({ page }) => {
      await stubAnalystReads(page);
      await enterGuest(page);
      await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);

      for (const [lang, dir] of [['en', 'ltr'], ['fr', 'ltr'], ['ar', 'rtl']] as const) {
        await switchLangAtRuntime(page, lang);
        await expect(page.locator('main[data-testid="ai-analyst-workspace"]')).toHaveAttribute('dir', dir);
        await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
      }
    });

    test('refresh after a locale change still renders exactly one workspace tree', async ({ page }) => {
      await stubAnalystReads(page);
      await enterGuest(page);
      await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });
      await switchLangAtRuntime(page, 'fr');
      await expect(page.locator('main[data-testid="ai-analyst-workspace"]')).toHaveAttribute('dir', 'ltr');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);
      await expect(page.locator('main[data-testid="ai-analyst-workspace"]')).toHaveAttribute('dir', 'ltr');
      await expect(page.locator('main')).toHaveCount(1);
    });

    test('many rapid full-page navigations across locales never leave a duplicate tree', async ({ page }) => {
      await stubAnalystReads(page);
      await enterGuest(page);

      const routes = [
        '/ai-analyst/overview',
        '/ai-analyst/market-leadership',
        '/ai-analyst/markets',
        '/ai-analyst/news',
        '/ai-analyst/calendar',
        '/ai-analyst/agent',
        '/ai-analyst/opportunities',
      ];
      for (const [index, route] of routes.entries()) {
        if (index % 2 === 0) await setStoredLang(page, 'en');
        else await setStoredLang(page, 'ar');
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('ai-analyst-workspace')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
      }
    });
  });

  test.describe('Notifications (authenticated)', () => {
    test.use({ storageState: userAuthStatePath });

    test('authenticated navigation into Notifications renders exactly one .notif-page and no lingering loading state', async ({ page }) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for source-backed notification validation.');

      await page.goto('/today', { waitUntil: 'domcontentloaded' });
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('.notif-page')).toHaveCount(1);
      await expect(page.locator('main.notif-shell')).toHaveCount(1);
      // The loaded state must fully replace the loading state, not sit alongside it.
      await expect(page.locator('.notif-page.loading-state')).toHaveCount(0);
      await expect(page.locator('.notification-list')).toBeVisible();
    });

    test('Notifications reached via several full navigations across locales stays a single tree', async ({ page }) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for source-backed notification validation.');

      for (const lang of ['en', 'ar', 'fr'] as const) {
        await setStoredLang(page, lang);
        await page.goto('/today', { waitUntil: 'domcontentloaded' });
        await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.notif-page')).toHaveCount(1);
        await expect(page.locator('main.notif-shell')).toHaveCount(1);
      }
    });

    test('refresh on Notifications after a locale change stays a single tree', async ({ page }) => {
      test.skip(!userAuthConfigured, 'No E2E user credentials are configured for source-backed notification validation.');

      await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
      await switchLangAtRuntime(page, 'fr');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('.notif-page')).toHaveCount(1);
      await expect(page.locator('main.notif-shell')).toHaveCount(1);
    });
  });
});
