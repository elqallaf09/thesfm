import { expect, test } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

// Exercise the shared TV client with the launch identifier injected by the iOS wrapper.
test.use({
  viewport: { width: 430, height: 932 },
  launchOptions: {
    executablePath: process.env.TV_CHROMIUM_EXECUTABLE,
    args: ['--autoplay-policy=no-user-gesture-required'],
  },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => Object.assign(window, { __sfmTvIosLaunch: 'phone-launch' }));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Offline' } }));
});

test('the iPhone ident plays through without tapping and stays dismissed on reload', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.endsWith('/sfm-ident.wav')) {
        this.addEventListener('ended', () => document.documentElement.dataset.identDuration = String(this.duration));
      }
      return play.call(this);
    };
  });
  await openAndroidTvPackage(page, { keepMenu: true });
  const intro = page.locator('.sfm-startup');
  await expect(intro).toHaveAttribute('data-sound', 'playing');
  await expect(intro.getByRole('button')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Number(document.documentElement.dataset.identDuration))).toBeGreaterThan(1);
  await expect(intro).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-tv-root]')).toBeVisible();
  await expect(intro).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/sfm-ident.wav')))).toBe(false);
});

test('an audio interruption never adds a button or stalls the iPhone ident', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Interrupted', 'NotAllowedError'));
  });
  await openAndroidTvPackage(page, { keepMenu: true });
  const intro = page.locator('.sfm-startup');
  await expect(intro).toHaveAttribute('data-sound', 'blocked');
  await expect(intro.getByRole('button')).toHaveCount(0);
  await expect(intro).toHaveCount(0);
});
