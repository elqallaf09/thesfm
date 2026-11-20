import { expect, test } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

test.use({ viewport: { width: 1536, height: 900 }, hasTouch: true });

for (const errorName of ['NotAllowedError', 'NotSupportedError']) {
  test(`browser introduction finishes without controls after ${errorName}`, async ({ page }) => {
    await page.addInitScript(errorName => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback unavailable', errorName));
    }, errorName);
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
    await openAndroidTvPackage(page, { keepMenu: true });
    const intro = page.locator('.sfm-startup');
    await expect(intro).toHaveAttribute('data-sound', errorName === 'NotAllowedError' ? 'blocked' : 'unavailable');
    await expect(intro.getByRole('button')).toHaveCount(0);
    await expect(intro).toHaveCount(0, { timeout: 5000 });
  });
}

test('a tap can unlock blocked audio without restarting the logo or exposing a button', async ({ page }) => {
  await page.addInitScript(() => {
    let tapped = false;
    window.addEventListener('click', event => { tapped = event.isTrusted; }, { capture: true, once: true });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return tapped ? play.call(this) : Promise.reject(new DOMException('Gesture required', 'NotAllowedError'));
    };
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await openAndroidTvPackage(page, { keepMenu: true });
  const intro = page.locator('.sfm-startup');
  await expect(intro).toHaveAttribute('data-sound', 'blocked');
  await expect(intro.getByRole('button')).toHaveCount(0);
  await intro.evaluate(element => element.setAttribute('data-before-tap', 'true'));
  await intro.tap();
  await expect(intro).toHaveAttribute('data-sound', 'playing');
  await expect(intro).toHaveAttribute('data-before-tap', 'true');
  await expect(intro).toHaveCount(0, { timeout: 5000 });
});
