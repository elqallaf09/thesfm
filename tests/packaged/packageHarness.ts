import { type Page } from '@playwright/test';
import { closeTvMenu } from '../helpers/tv-navigation';
export { openTvMenu, closeTvMenu, openTvHeaderActions, closeTvHeaderActions, chooseTvDestination, chooseTvBroadcast } from '../helpers/tv-navigation';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Android's WebViewAssetLoader uses this HTTPS origin. A stable origin is
// essential for reload/storage tests; file: storage behavior is browser-specific.
export async function openAndroidTvPackage(page: Page, options: { keepMenu?: boolean } = {}) {
  const root = resolve('.tv-build/web');
  await page.route('https://appassets.androidplatform.net/**', async route => {
    const file = resolve(root, `.${decodeURIComponent(new URL(route.request().url()).pathname)}`);
    if (!file.startsWith(`${root}${sep}`)) return route.abort();
    const entry = await stat(file).catch(() => null);
    if (!entry?.isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file });
  });
  await page.goto('https://appassets.androidplatform.net/index.html');
  if (!options.keepMenu) await closeTvMenu(page);
}
