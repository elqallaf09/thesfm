import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const copy = {
  ar: { title: 'محلل الأراضي والعقار', action: 'فتح محلل الأراضي والعقار', back: 'العودة إلى مركز الاستثمارات', country: 'الدولة', search: 'البحث عن أدلة موثقة' },
  en: { title: 'Land & Real Estate Analyst', action: 'Open Land & Real Estate Analyst', back: 'Back to Investments Center', country: 'Country', search: 'Search verified evidence' },
  fr: { title: 'Analyste immobilier et foncier', action: 'Ouvrir l’analyste immobilier et foncier', back: 'Retour au centre d’investissements', country: 'Pays', search: 'Rechercher des preuves vérifiées' },
} as const;

// This suite uses the existing isolated Preview user. It never writes asset rows
// and must not capture private portfolio DOM, screenshots or session artifacts.
test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });

test.describe('property analyst official center entry', () => {
  for (const language of ['ar', 'en', 'fr'] as const) {
    test(`${language}: overview -> analyst -> real-estate center`, async ({ page }) => {
      test.skip(!userAuthConfigured, 'Authenticated browser coverage requires the configured isolated Preview fixture.');
      test.setTimeout(60_000);
      await page.addInitScript(lang => { localStorage.setItem('sfm_lang', lang); }, language);
      await page.goto('/investments', { waitUntil: 'domcontentloaded' });
      const entry = page.getByTestId('real-estate-intelligence-entry');
      await expect(entry).toBeVisible();
      await expect(entry.getByRole('heading', { name: copy[language].title, exact: true })).toBeVisible();
      const open = entry.getByRole('link', { name: copy[language].action, exact: true });
      await expect(open).toHaveAttribute('href', '/invest/real-estate');
      await open.click();
      await expect(page).toHaveURL(/\/invest\/real-estate$/);
      await expect(page.getByRole('heading', { name: copy[language].title, exact: true, level: 1 })).toBeVisible();
      await expect(page.getByLabel(copy[language].country, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: copy[language].search, exact: true })).toBeDisabled();
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'The property workspace must not introduce horizontal page overflow').toBeLessThanOrEqual(2);
      await page.getByRole('link', { name: copy[language].back, exact: true }).click();
      await expect(page).toHaveURL(/\/investments\/real-estate$/);
      await expect(page.getByTestId('real-estate-intelligence-entry')).toBeVisible();
    });
  }
});
