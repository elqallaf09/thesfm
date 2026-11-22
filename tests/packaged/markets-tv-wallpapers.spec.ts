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
    const previewBox = await tile.locator('.tv-wallpaper-preview').boundingBox();
    const tileBox = await tile.boundingBox();
    expect(previewBox!.width).toBeGreaterThan(tileBox!.width * .9);
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

test('appearance settings expose the selected wallpaper and open the same gallery with the remote', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, 'kuwait-bay');
  const root = page.locator('[data-tv-root]');
  for (const language of [
    { code: 'ar', title: 'اختيار صورة الخلفية', current: 'أبراج الكويت' },
    { code: 'en', title: 'Choose background image', current: 'Kuwait Towers' },
    { code: 'fr', title: 'Choisir une image de fond', current: 'Tours du Koweït' },
  ]) {
    await openTvMenu(page);
    await key(page, 'settings').click();
    await key(page, `settings-language-${language.code}`).click();
    const entry = key(page, 'settings-wallpapers');
    await expect(entry).toContainText(language.title);
    await expect(entry).toContainText(language.current);
    await entry.focus();
    await page.keyboard.press('Enter');
    const gallery = page.locator('.tv-wallpaper-grid');
    await expect(gallery).toBeVisible();
    await expect(gallery.getByRole('button')).toHaveCount(7);
    await expect(key(page, 'wallpaper:kuwait-bay')).toHaveAttribute('aria-pressed', 'true');
    await expect(key(page, 'wallpaper:kuwait-bay')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(gallery).toHaveCount(0);
    await expect(key(page, 'menu-toggle')).toBeFocused();
  }
  await openTvMenu(page);
  await key(page, 'settings').click();
  await key(page, 'settings-wallpapers').click();
  await key(page, 'wallpaper:tokyo').focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-tv-wallpaper', 'tokyo');
  await expect(key(page, 'menu-toggle')).toBeFocused();
  await page.reload();
  await expect(root).toHaveAttribute('data-tv-wallpaper', 'tokyo');
});


test('a pending initial focus never overrides the next wallpaper selected with the remote', async ({ page }) => {
  await start(page, 'kuwait-bay');
  await key(page, 'settings').click();
  await page.evaluate(() => {
    const schedule = window.requestAnimationFrame;
    const cancel = window.cancelAnimationFrame;
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
    window.cancelAnimationFrame = id => { frames.delete(id); };
    window.addEventListener('sfm-test-flush-wallpaper-focus', () => {
      window.requestAnimationFrame = schedule;
      window.cancelAnimationFrame = cancel;
      for (const callback of frames.values()) callback(performance.now());
      frames.clear();
    }, { once: true });
  });
  await key(page, 'settings-wallpapers').click();
  const tokyo = key(page, 'wallpaper:tokyo');
  await tokyo.focus();
  await page.evaluate(() => window.dispatchEvent(new Event('sfm-test-flush-wallpaper-focus')));
  await expect(tokyo).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-wallpaper', 'tokyo');
  await page.reload();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-wallpaper', 'tokyo');
});
