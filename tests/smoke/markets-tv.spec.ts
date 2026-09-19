import { expect, test } from '@playwright/test';

// UI-only synthetic fixtures: never imported by production providers or clients.
test('TV fits a television and supports remote focus, languages and QR details', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: {
    group: 'global', total: 12, available: 12, generatedAt: new Date().toISOString(),
    quotes: Array.from({ length: 12 }, (_, index) => ({
      symbol: `QA${index}`, name: 'Synthetic QA asset', nameAr: 'أصل اختبار اصطناعي',
      price: 123.45 + index, currency: 'USD', changePercent: index % 2 ? -1.2 : 1.2,
      source: 'Synthetic QA fixture', observedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
      status: 'available', exchange: 'QA', country: null,
    })),
  } }));
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [] } }));
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_SAVED_ANALYSIS' } }));
  await page.goto('/tv');
  await expect(page.locator('.tv-quote')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(1082);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(722);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-tv-dialog]')))).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Display settings', exact: true })).toBeFocused();
  await page.locator('.tv-quote').first().click();
  await expect(page.locator('canvas.tv-qr')).toBeVisible();
  await expect(page.getByText('No valid saved analysis for this asset')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  await page.getByRole('button', { name: 'Français', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await page.setViewportSize({ width: 3840, height: 2160 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(2162);
  expect(errors).toEqual([]);
});

test('phone pairing keeps the QR code out of the login query', async ({ page }) => {
  await page.route('**/api/tv/account', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }));
  await page.goto('/tv/pair#ABCDEF123456');
  const login = page.getByRole('link', { name: 'تسجيل الدخول للمتابعة', exact: true });
  await expect(login).toHaveAttribute('href', '/login?next=%2Ftv%2Fpair');
  expect(await page.evaluate(() => sessionStorage.getItem('sfm-tv-pair-code'))).toBe('ABCDEF123456');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth + 2));
});
