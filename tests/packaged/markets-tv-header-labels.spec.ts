import { expect, test } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

for (const language of ['ar', 'en', 'fr']) {
  test(`TV header keeps ${language} action names visible with one top navigation destination`, async ({ page }, testInfo) => {
    await page.addInitScript(language => {
      sessionStorage.setItem('sfm-tv-welcome-shown', '1');
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme: 'light', scene: 'world', autoRotate: false }));
    }, language);
    await page.route('**/api/**', route => route.fulfill({ json: { markets: [], stories: [], items: [], quotes: [], summary: [], total: 0, available: 0 } }));
    await page.setViewportSize({ width: 1280, height: 720 });
    await openAndroidTvPackage(page);
    await page.keyboard.press('Shift');
    const header = page.locator('.tv-labelled-header');
    for (const [width, height] of [[1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['viewing', 'strips', 'browse']) {
        await page.locator(`.tv-mode-${mode}`).click();
        await expect.poll(() => header.locator('.tv-header-actions button,.tv-display-link').evaluateAll(elements => elements.flatMap(element => {
          const label = element.querySelector('span'), rect = element.getBoundingClientRect();
          const labelRect = label?.getBoundingClientRect();
          return !label?.textContent?.trim() || !labelRect?.width || !labelRect.height || rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight
            ? [element.getAttribute('aria-label')] : [];
        }))).toEqual([]);
        await expect(page.locator('.tv-viewing-footer [data-tv-focus-key="channels"]')).toHaveCount(0);
        await expect(header.locator('[data-tv-focus-key="channels"]')).toHaveCount(1);
        await expect(header.locator('[data-tv-focus-key="channels"] > span')).toBeVisible();
      }
    }
    await page.locator('.tv-mode-viewing').click();
    await expect(page.locator('[data-tv-focus-key="view:sessions"]')).toHaveCount(1);
    await expect(page.locator('.tv-viewing-footer')).not.toContainText(language === 'ar' ? 'ساعات الأسواق' : language === 'fr' ? 'Horaires des marchés' : 'Market hours');
    const channels = header.locator('[data-tv-focus-key="channels"]');
    await channels.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(channels).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 720 });
    if (language === 'ar') await page.screenshot({ path: testInfo.outputPath('tv-labelled-header-720.png') });
  });
}
