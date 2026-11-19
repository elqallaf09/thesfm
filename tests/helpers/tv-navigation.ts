import { expect, type Page } from '@playwright/test';

export type TvTestDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'gulf' | 'assets' | 'brief' | 'map';

/** Open the same labelled side menu available to a TV remote or touch user. */
export async function openTvMenu(page: Page) {
  await expect(page.locator('[data-tv-root]')).toBeVisible();
  if (await page.locator('.sfm-startup').isVisible()) await page.keyboard.press('Escape');
  const menu = page.locator('.tv-side-menu');
  if (!await menu.isVisible()) await page.locator('[data-tv-focus-key="menu-toggle"]').click();
  await expect(menu).toBeVisible();
  return menu;
}

export async function closeTvMenu(page: Page) {
  await expect(page.locator('[data-tv-root]')).toBeVisible();
  if (await page.locator('.sfm-startup').isVisible()) await page.keyboard.press('Escape');
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
  const tools = ['gulf', 'assets', 'brief', 'map'].includes(destination);
  if (tools) await openTvHeaderActions(page); else await openTvMenu(page);
  await page.locator(`[data-tv-focus-key="${tools ? destination : `menu:${destination}`}"]`).click();
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
