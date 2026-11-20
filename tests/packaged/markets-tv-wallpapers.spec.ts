import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage, openTvMenu } from './packageHarness';
import { wallpaperIds } from '../../src/lib/markets-tv/wallpapers';

const key = (page: Page, id: string) => page.locator(`[data-tv-focus-key="${id}"]`);

async function start(page: Page, wallpaper = 'original') {
  await page.addInitScript(initial => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    if (!localStorage.getItem('sfm-markets-tv-settings-v1')) {
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ theme: 'dark', language: 'ar', wallpaper: initial }));
    }
  }, wallpaper);
  await page.route('**/api/**', route => route.fulfill({ json: { markets: [], quotes: [], summary: [], stories: [], items: [], total: 0 } }));
  await openAndroidTvPackage(page, { keepMenu: true });
}

test('section shortcuts jump directly to markets and account, and Back restores the shortcut', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await key(page, 'sections').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(key(page, 'wallpapers')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(key(page, 'sections')).toBeFocused();
  for (const [group, target] of [['markets', 'menu:allStocks'], ['account', 'my-account']]) {
    await key(page, 'sections').click();
    await expect(key(page, 'jump:overview')).toBeFocused();
    await key(page, `jump:${group}`).focus();
    await page.keyboard.press('Enter');
    await expect(key(page, target)).toBeFocused();
    await expect(key(page, target)).toBeInViewport({ ratio: 1 });
  }
  await key(page, 'sections').click();
  await page.keyboard.press('Escape');
  await expect(key(page, 'sections')).toBeFocused();
});

test('all six bundled wallpapers render, apply, survive reload and restore the original', async ({ page }) => {
  await start(page, 'obsolete-id');
  const root = page.locator('[data-tv-root]');
  await expect(root).toHaveAttribute('data-tv-wallpaper', 'original');
  for (const id of [...wallpaperIds.filter(value => value !== 'original'), 'original']) {
    await openTvMenu(page);
    await key(page, 'wallpapers').click();
    const grid = page.locator('.tv-wallpaper-grid');
    await expect(grid.getByRole('button')).toHaveCount(7);
    const tile = key(page, `wallpaper:${id}`);
    const width = await tile.locator('.tv-wallpaper-preview').evaluate(async el => {
      const image = new Image();
      image.src = getComputedStyle(el).backgroundImage.slice(5, -2);
      await image.decode();
      return image.naturalWidth;
    });
    expect(width).toBeGreaterThanOrEqual(640);
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(grid).toHaveCount(0);
    await expect(root).toHaveAttribute('data-tv-wallpaper', id);
    if (id !== 'original') {
      await expect.poll(() => root.evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain(`/${id}.webp`);
    }
  }
  await openTvMenu(page);
  await key(page, 'wallpapers').click();
  await key(page, 'wallpaper:kuwait-bay').click();
  await page.reload();
  await expect(root).toHaveAttribute('data-tv-wallpaper', 'kuwait-bay');
  await openTvMenu(page);
  await key(page, 'wallpapers').click();
  await expect(key(page, 'wallpaper:kuwait-bay')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(root).toHaveAttribute('data-tv-wallpaper', 'kuwait-bay');
});
