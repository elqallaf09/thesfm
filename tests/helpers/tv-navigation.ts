import { expect, type Page } from '@playwright/test';

export type TvTestDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'gulf' | 'assets' | 'brief' | 'map';

async function dismissTvIntro(page: Page) {
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('sfm-tv-welcome-shown')))).toBe(true);
  const intro = page.locator('.sfm-startup');
  if (await intro.isVisible()) await intro.locator('.sfm-startup-actions button').last().click();
  await expect(intro).not.toBeVisible();
}

/** Open the same labelled side menu available to a TV remote or touch user. */
export async function openTvMenu(page: Page) {
  await expect(page.locator('[data-tv-root]')).toBeVisible();
  await dismissTvIntro(page);
  const menu = page.locator('.tv-side-menu');
  if (!await menu.isVisible()) await page.locator('[data-tv-focus-key="menu-toggle"]').click();
  await expect(menu).toBeVisible();
  return menu;
}

export async function closeTvMenu(page: Page) {
  await expect(page.locator('[data-tv-root]')).toBeVisible();
  await dismissTvIntro(page);
  const close = page.locator('[data-tv-focus-key="menu-close"]');
  if (await close.isVisible()) await close.click();
  await expect(page.locator('.tv-side-menu')).not.toBeVisible();
}

/** Secondary display tools remain labelled in a bounded global dialog. */
export async function openTvHeaderActions(page: Page) {
  const tools = page.locator('#tv-tools-dialog');
  if (!await tools.isVisible()) {
    await openTvMenu(page);
    await page.locator('[data-tv-focus-key="more"]').click();
  }
  await expect(tools).toBeVisible();
  return tools;
}

export async function closeTvHeaderActions(page: Page) {
  if (await page.locator('#tv-tools-dialog').isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.locator('#tv-tools-dialog')).toHaveCount(0);
    await expect(page.locator('[data-tv-focus-key="menu-toggle"]')).toBeFocused();
  }
}

export async function chooseTvDestination(page: Page, destination: string) {
  await openTvMenu(page);
  await page.locator(`[data-tv-focus-key="menu:${destination}"]`).click();
  await expect(page.locator('.tv-side-menu')).not.toBeVisible();
  await expect(page.locator('#tv-tools-dialog')).toHaveCount(0);
}

export async function chooseTvBroadcast(page: Page, channel: string) {
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key="channels"]').click();
  const target = page.locator(`[data-tv-focus-key="channel:${channel}"]`);
  for (let index = 0; index < 6 && !await target.isVisible(); index++) {
    await page.locator('.tv-receiver-nav .tv-channel-page').last().click();
  }
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
}
