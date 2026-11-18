import { expect, type Page } from '@playwright/test';

/** Follow the labelled header route, including when idle controls are hidden. */
export async function openTvHeaderActions(page: Page) {
  await page.keyboard.press('Shift');
  const more = page.locator('[data-tv-focus-key="more"]');
  await expect(more).toBeVisible();
  if (await more.getAttribute('aria-expanded') !== 'true') await more.click();
  await expect(page.locator('#tv-header-more-dialog')).toBeVisible();
  return page.locator('#tv-header-more-dialog');
}

export async function closeTvHeaderActions(page: Page) {
  if (await page.locator('#tv-header-more-dialog').isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.locator('#tv-header-more-dialog')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key="more"]')).toBeFocused();
  }
}
