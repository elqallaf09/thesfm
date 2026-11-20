import { expect, type Page } from '@playwright/test';

export type TvTestDestination = 'hall' | 'allStocks' | 'strips' | 'world' | 'kuwait' | 'news' | 'sessions' | 'watchlist' | 'investments' | 'gulf' | 'assets' | 'brief' | 'map';

async function waitForTvRoot(page: Page) {
  // Next's streamed response can briefly include a hidden replacement tree.
  // Wait for exactly one root; a persistent duplicate must still fail.
  await expect(page.locator('[data-tv-root]')).toHaveCount(1);
  await expect(page.locator('[data-tv-root]')).toBeVisible();
}

export async function waitForTvIntro(page: Page) {
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('sfm-tv-welcome-shown')))).toBe(true);
  const intro = page.locator('.sfm-startup');
  await expect(intro.getByRole('button', { name: /^(تخطي|Skip|Passer)$/ })).toHaveCount(0);
  await expect(intro).not.toBeVisible();
}

/** Saved credentials remain idle until the viewer explicitly chooses an account. */
export async function selectTvProfile(page: Page, index: number) {
  await waitForTvIntro(page);
  const picker = page.locator('.tv-account-picker');
  await expect(picker).toBeVisible();
  await picker.locator(`[data-tv-focus-key="account-${index}"]`).click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator('.tv-side-menu')).toBeVisible();
}

/** Open the same labelled side menu available to a TV remote or touch user. */
export async function openTvMenu(page: Page) {
  await waitForTvRoot(page);
  await waitForTvIntro(page);
  const menu = page.locator('.tv-side-menu');
  if (!await menu.isVisible()) await page.locator('[data-tv-focus-key="menu-toggle"]').click();
  await expect(menu).toBeVisible();
  return menu;
}

export async function closeTvMenu(page: Page) {
  await waitForTvRoot(page);
  await waitForTvIntro(page);
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
  const numberedChannels: Record<string, string> = { allStocks: '1', kuwait: '3', sessions: '4', investments: '5' };
  const receiverNumber = numberedChannels[channel];
  if (receiverNumber) {
    await closeTvMenu(page);
    await page.keyboard.press(receiverNumber);
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', channel);
    return;
  }
  await openTvMenu(page);
  const target = page.locator(`[data-tv-focus-key="broadcast:${channel}"]`);
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.locator('.tv-side-menu')).toHaveCount(0);
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view', channel);
}
