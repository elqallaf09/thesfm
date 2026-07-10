import { expect, test } from '@playwright/test';

test.describe('Arabic Sharia research page', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('renders RTL without horizontal overflow or bottom-navigation overlap', async ({ page }) => {
    await page.goto('/sharia-stocks');
    const main = page.locator('main[dir="rtl"]');
    await expect(main).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      mainPaddingBottom: Number.parseFloat(getComputedStyle(document.querySelector('main[dir="rtl"]')!).paddingBottom),
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.mainPaddingBottom).toBeGreaterThanOrEqual(100);
    await page.screenshot({ path: 'artifacts/sharia-research-mobile-ar.png', fullPage: true });
  });
});
