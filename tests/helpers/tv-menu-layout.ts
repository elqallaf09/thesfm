import { expect, type Page } from '@playwright/test';

const destinations = ['hall', 'allStocks', 'strips', 'world', 'kuwait', 'gulf', 'assets', 'crypto', 'news', 'sessions', 'watchlist', 'investments', 'brief', 'map'];
export const TV_MENU_KEYS = [
  'menu-close', ...destinations.map(key => `menu:${key}`),
  'customize', 'settings', 'my-account', 'switch-account', 'pair', 'more',
];

/** Check the clipped viewport of the scrollable list, not only the document viewport. */
export async function expectTvMenuActionFits(page: Page, key: string, footerTop?: number) {
  const action = page.locator(`.tv-side-menu [data-tv-focus-key="${key}"]`);
  await expect(action).toBeFocused();
  await expect.poll(() => action.evaluate((button, expectedFooterTop) => {
    const menu = button.closest('.tv-side-menu')!;
    const list = menu.querySelector('.tv-side-menu-items')!;
    const footer = menu.querySelector('.tv-side-menu-account')!;
    const bounds = (list.contains(button) ? list : menu).getBoundingClientRect();
    const rect = button.getBoundingClientRect(), label = button.querySelector('span'), icon = button.querySelector('svg');
    const violations: string[] = [];
    if (!label || !icon || !label.textContent?.trim()) violations.push('missing visible icon label');
    if (label && (getComputedStyle(label).display === 'none' || label.getBoundingClientRect().width === 0 || parseFloat(getComputedStyle(label).fontSize) < 14)) violations.push('unreadable label');
    if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) violations.push('clipped focused action');
    if (rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1 || rect.bottom > innerHeight + 1) violations.push('offscreen focused action');
    if (button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1) violations.push('clipped label');
    if (list.scrollWidth > list.clientWidth + 1) violations.push('horizontal menu scrolling');
    if (expectedFooterTop !== undefined && Math.abs(footer.getBoundingClientRect().top - expectedFooterTop) > 1) violations.push('moving account footer');
    if (document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1 || scrollX !== 0 || scrollY !== 0) violations.push('scrolling document');
    // Offscreen rows are clipped by the list. Every visible portion must remain
    // separate from the other actions, including the fixed account footer.
    const visible = [...menu.querySelectorAll('button')].map(control => {
      const area = (list.contains(control) ? list : menu).getBoundingClientRect();
      const item = control.getBoundingClientRect();
      return { left: Math.max(item.left, area.left), right: Math.min(item.right, area.right), top: Math.max(item.top, area.top), bottom: Math.min(item.bottom, area.bottom) };
    }).filter(item => item.right > item.left && item.bottom > item.top);
    if (visible.some((a, index) => visible.slice(index + 1).some(b => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1))) violations.push('overlapping visible actions');
    return violations;
  }, footerTop)).toEqual([]);
}

/** Traverse every row with the same directional input used by a TV remote. */
export async function expectTvMenuRemoteAccess(page: Page, expectedKeys: readonly string[] = TV_MENU_KEYS) {
  const menu = page.locator('.tv-side-menu');
  await expect(menu).toBeInViewport({ ratio: 1 });
  expect(await menu.locator('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('data-tv-focus-key')))).toEqual(expectedKeys);
  const footerTop = (await menu.locator('.tv-side-menu-account').boundingBox())!.y;
  await menu.locator('[data-tv-focus-key="menu-close"]').focus();
  await expectTvMenuActionFits(page, expectedKeys[0], footerTop);
  for (const key of expectedKeys.slice(1)) {
    await page.keyboard.press('ArrowDown');
    await expectTvMenuActionFits(page, key, footerTop);
  }
  const scrolling = await menu.locator('.tv-side-menu-items').evaluate(list => ({ needed: list.scrollHeight > list.clientHeight + 1, top: list.scrollTop }));
  if (scrolling.needed) expect(scrolling.top).toBeGreaterThan(0);
}

export async function focusTvMenuAction(page: Page, key: string) {
  const menu = page.locator('.tv-side-menu');
  const keys = await menu.locator('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('data-tv-focus-key')));
  const target = keys.indexOf(key);
  expect(target).toBeGreaterThanOrEqual(0);
  const active = await page.evaluate(() => document.activeElement?.getAttribute('data-tv-focus-key'));
  let current = keys.indexOf(active ?? null);
  if (current < 0) {
    await menu.locator('[data-tv-focus-key="menu-close"]').focus();
    current = 0;
  }
  const direction = current > target ? 'ArrowUp' : 'ArrowDown';
  while (current !== target) {
    await page.keyboard.press(direction);
    current += direction === 'ArrowDown' ? 1 : -1;
    await expect(menu.locator(`[data-tv-focus-key="${keys[current]}"]`)).toBeFocused();
  }
  await expectTvMenuActionFits(page, key);
}
