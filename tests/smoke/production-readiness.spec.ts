import { expect, test, type Page } from '@playwright/test';

type Locale = 'ar' | 'en' | 'fr';
type Theme = 'light' | 'dark';

async function enterGuestWorkspace(page: Page, locale: Locale, theme: Theme) {
  await page.addInitScript(({ locale: nextLocale, theme: nextTheme }) => {
    localStorage.setItem('sfm_lang', nextLocale);
    localStorage.setItem('the-sfm-theme', nextTheme);
  }, { locale, theme });

  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').first().click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

function relativeLuminance([red, green, blue]: readonly number[]) {
  const linear = [red, green, blue].map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function parseRgb(color: string): [number, number, number] {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Expected an RGB color, received ${color}`);
  return [channels[0], channels[1], channels[2]];
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(parseRgb(foreground));
  const backgroundLuminance = relativeLuminance(parseRgb(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Phase 2.10 production-readiness regressions', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`savings step markers retain AA contrast in ${theme} mode`, async ({ page }) => {
      await enterGuestWorkspace(page, 'en', theme);
      await page.goto('/savings', { waitUntil: 'domcontentloaded' });

      const marker = page.locator('.savings-guide-step b').first();
      await expect(marker).toBeVisible();
      const colors = await marker.evaluate(element => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: style.backgroundColor };
      });

      expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('Arabic UI keeps Latin digits and an overflow-safe document', async ({ page }) => {
    await enterGuestWorkspace(page, 'ar', 'dark');

    for (const path of ['/dashboard', '/reports-center', '/savings']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

      const audit = await page.evaluate(() => ({
        text: document.body.innerText,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          - document.documentElement.clientWidth,
      }));
      expect(audit.text).not.toMatch(/[\u0660-\u0669\u06f0-\u06f9]/);
      expect(audit.overflow).toBeLessThanOrEqual(4);
    }
  });
});
