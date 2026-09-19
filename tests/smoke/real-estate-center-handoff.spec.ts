import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const copy = {
  ar: { title: 'مركز السوق العقاري', back: 'العودة إلى مركز الأسواق العالمية', country: 'الدولة', search: 'بحث بيانات السوق الرسمية' },
  en: { title: 'Real Estate Market Center', back: 'Back to Global Markets Hub', country: 'Country', search: 'Search official market records' },
  fr: { title: 'Centre du marché immobilier', back: 'Retour au centre des marchés mondiaux', country: 'Pays', search: 'Rechercher les données officielles' },
} as const;

// This suite uses the existing isolated Preview user. It never writes asset rows
// and must not capture private portfolio DOM, screenshots or session artifacts.
test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });

test.describe('real estate market center placement', () => {
  for (const language of ['ar', 'en', 'fr'] as const) {
    test(`${language}: Global Markets -> Real Estate Market Center`, async ({ page, isMobile }) => {
      test.skip(!userAuthConfigured, 'Authenticated browser coverage requires the configured isolated Preview fixture.');
      test.setTimeout(60_000);
      await page.addInitScript(lang => { localStorage.setItem('sfm_lang', lang); }, language);
      await page.goto('/global-markets/real-estate', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: copy[language].title, exact: true, level: 1 })).toBeVisible();
      await expect(page.getByLabel(copy[language].country, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: copy[language].search, exact: true })).toBeDisabled();
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'The property workspace must not introduce horizontal page overflow').toBeLessThanOrEqual(2);
      await expect(page.getByRole('link', { name: copy[language].back, exact: true })).toHaveCount(0);
      if (isMobile) {
        await page.locator('button[aria-controls="sfm-mobile-menu"]').click();
        await expect(page.locator('#sfm-mobile-menu')).toBeVisible();
      }
      const navigation = page.locator(isMobile ? '#sfm-mobile-menu' : 'aside.sfm-shared-sidebar');
      const marketLink = navigation.locator('a[href="/global-markets"]').first();
      await expect(marketLink).toBeVisible();
      await expect(marketLink).toHaveAttribute('href', '/global-markets');
      await marketLink.click();
      await expect(page).toHaveURL(/\/global-markets$/);
    });
  }

  test('legacy property analyst URL redirects to the canonical market center', async ({ page }) => {
    await page.goto('/invest/real-estate', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/global-markets\/real-estate$/);
  });
});
