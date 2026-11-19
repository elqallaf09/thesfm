import { expect, test } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

for (const language of ['ar', 'en', 'fr']) {
  test(`TV header keeps ${language} action names visible with one top navigation destination`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(language => {
      sessionStorage.setItem('sfm-tv-welcome-shown', '1');
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme: 'light', scene: 'world', autoRotate: false }));
    }, language);
    await page.route('**/api/**', route => route.fulfill({ json: { markets: [], stories: [], items: [], quotes: [], summary: [], total: 0, directoryTotal: 0, available: 0, page: 0, pageSize: 6 } }));
    await page.setViewportSize({ width: 1280, height: 720 });
    await openAndroidTvPackage(page);
    await page.keyboard.press('Shift');
    const header = page.locator('.tv-labelled-header');
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['viewing', 'strips', 'browse']) {
        await page.locator(`.tv-mode-${mode}`).click();
        await expect(header).toBeVisible();
        await expect(header.locator('[data-tv-focus-key="channels"]')).toHaveCount(1);
        await expect.poll(() => header.locator('.tv-header-actions button,.tv-display-link').evaluateAll(elements => elements.flatMap(element => {
          const label = element.querySelector('span'), rect = element.getBoundingClientRect();
          const labelRect = label?.getBoundingClientRect();
          return !label?.textContent?.trim() || !labelRect?.width || !labelRect.height || parseFloat(getComputedStyle(label).fontSize) < 13 || rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight
            || labelRect.left < rect.left - 1 || labelRect.right > rect.right + 1 || labelRect.top < rect.top - 1 || labelRect.bottom > rect.bottom + 1
            ? [element.getAttribute('aria-label')] : [];
        }))).toEqual([]);
        await expect(page.locator('.tv-viewing-footer [data-tv-focus-key="channels"]')).toHaveCount(0);
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
    expect(errors).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 720 });
    if (language === 'ar') await page.screenshot({ path: testInfo.outputPath('tv-labelled-header-720.png') });
  });

  test(`portrait strips retain their viewport share and labelled ${language} actions`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(language => {
      sessionStorage.setItem('sfm-tv-welcome-shown', '1');
      localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme: 'light', displayMode: 'strips', ticker: false, autoRotate: false }));
    }, language);
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: { markets: Array.from({ length: 30 }, (_, index) => ({
        id: `QA${index}`, group: 'us', labelAr: `سوق اختبار ${index}`, labelEn: `QA market ${index}`, labelFr: `Marché test ${index}`, count: 120, status: 'directory',
      })) } });
      const observedAt = new Date().toISOString();
      return route.fulfill({ json: { quotes: [{ symbol: `${url.searchParams.get('market')}-0`, name: 'Synthetic QA', nameAr: 'اختبار', price: 123.45,
        currency: 'USD', changePercent: 1.2, source: 'Synthetic QA fixture', observedAt, receivedAt: observedAt, status: 'available', exchange: 'QA' }],
      total: 1, directoryTotal: 120, available: 1, stories: [], items: [], summary: [] } });
    });
    await openAndroidTvPackage(page);
    await expect(page.locator('.tv-market-strip')).toHaveCount(30);
    await page.evaluate(() => document.fonts.ready);
    const strips = await page.locator('.tv-market-strips').boundingBox();
    expect(strips!.height).toBeGreaterThan(844 * .85);
    expect(strips!.y + strips!.height).toBeLessThanOrEqual(844);
    const actions = page.locator('.tv-labelled-header .tv-header-actions button,.tv-labelled-header .tv-display-link');
    for (const action of await actions.all()) {
      await action.focus();
      await expect(action).toBeInViewport({ ratio: 1 });
      expect(await action.evaluate(element => {
        const label = element.querySelector('span')!, box = element.getBoundingClientRect(), text = label.getBoundingClientRect();
        return !!label.textContent?.trim() && parseFloat(getComputedStyle(label).fontSize) >= 13 && text.height > 0
          && text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom;
      })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(846);
    await page.screenshot({ path: testInfo.outputPath(`strips-portrait-${language}.png`) });
  });
}
