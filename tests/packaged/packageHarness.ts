import { expect, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Android's WebViewAssetLoader uses this HTTPS origin. A stable origin is
// essential for reload/storage tests; file: storage behavior is browser-specific.
export async function openAndroidTvPackage(page: Page) {
  const root = resolve('.tv-build/web');
  await page.route('https://appassets.androidplatform.net/**', async route => {
    const file = resolve(root, `.${decodeURIComponent(new URL(route.request().url()).pathname)}`);
    if (!file.startsWith(`${root}${sep}`)) return route.abort();
    const entry = await stat(file).catch(() => null);
    if (!entry?.isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file });
  });
  await page.goto('https://appassets.androidplatform.net/index.html');
}

// Secondary actions are grouped under the labelled More button. Wake controls
// through normal keyboard activity, then exercise the same route as a TV user.
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
