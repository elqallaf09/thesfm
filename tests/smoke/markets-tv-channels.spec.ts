import { expect, test, type Page } from '@playwright/test';

// Synthetic geometry/state fixtures only; no production fallback data.
async function fixtures(page: Page, emptyFirstBatch = false) {
  const markets = [
    { id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US markets', labelFr: 'Marchés américains', count: 2000, status: 'directory' },
    { id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 137, status: 'directory' },
  ];
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams, batch = Number(params.get('page'));
    const symbols = params.has('symbols') ? JSON.parse(params.get('symbols')!) as string[] : ['QA0', 'QA1', 'QA2'];
    const quotes = symbols.map((symbol, index) => ({ symbol, name: `QA company ${symbol}`, nameAr: `شركة اختبار ${symbol}`,
      price: (emptyFirstBatch && batch === 0) || index === 1 ? null : 10 + index, currency: 'USD', changePercent: index ? -1 : 1,
      source: 'QA fixture', observedAt: new Date(Date.now() - (index === 2 ? 86400000 : 1000)).toISOString(),
      receivedAt: new Date().toISOString(), status: index === 1 ? 'unavailable' : 'available', exchange: params.get('market'), country: null,
    }));
    return route.fulfill({ json: { group: params.get('group'), market: params.get('market'), quotes,
      directoryTotal: emptyFirstBatch ? 24 : 2000, page: batch, total: quotes.length,
      available: quotes.filter(q => q.price !== null).length, generatedAt: new Date().toISOString() } });
  });
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_ANALYSIS' } }));
}

test('TV channels restore stock choices, order, per-market speed, density and language after reload', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('tv-qa-initialized')) return;
    localStorage.setItem('tv-qa-initialized', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', marketIds: ['US', 'BOURSA_KUWAIT'] }));
    localStorage.setItem('sfm-markets-tv-instruments-v1', JSON.stringify({ US: ['QA0'] }));
  });
  await page.goto('/tv/strips');
  await page.getByRole('button', { name: 'تخصيص الأسواق', exact: true }).click();
  await page.getByRole('button', { name: 'تقديم السوق: بورصة الكويت' }).click();
  await page.getByRole('combobox', { name: 'سرعة حركة الأشرطة: الأسواق الأمريكية', exact: true }).selectOption('80');
  await page.keyboard.press('Escape');
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market', 'BOURSA_KUWAIT');
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).click();
  await page.getByRole('button', { name: 'مضغوط', exact: true }).click();
  await page.locator('.tv-language-setting select').selectOption('fr');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mes chaînes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nom de la chaîne' }).fill('شاشة المكتب');
  await page.getByRole('button', { name: 'Enregistrer l’affichage actuel', exact: true }).click();
  await expect(page.getByText('Chaînes enregistrées', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Réglages de l’écran', exact: true }).click();
  await page.getByRole('button', { name: 'Confortable', exact: true }).click();
  await page.locator('.tv-language-setting select').selectOption('en');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'My channels', exact: true }).click();
  await page.getByRole('button', { name: 'Show channel: شاشة المكتب', exact: true }).click();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('[data-tv-root]')).toHaveClass(/tv-density-compact/);
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market', 'BOURSA_KUWAIT');
  await expect(page.locator('[data-market="US"] .tv-market-strip-set').first().locator('button')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!).marketSpeeds.US)).toBe(80);
  await page.getByRole('button', { name: 'Mes chaînes', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer la chaîne: شاشة المكتب', exact: true }).click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.tv-channel')).toHaveCount(1);
  await page.keyboard.press('Escape');
});

test('TV density preserves source evidence, batch coverage and responsive layout', async ({ page }) => {
  await fixtures(page);
  await page.goto('/tv/strips');
  const row = page.locator('[data-market="US"]');
  await expect(row.locator('.tv-strip-coverage')).toContainText('2 / 3');
  await expect(row.locator('.tv-market-strip-heading small')).toContainText('2,000');
  const heights: number[] = [];
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const density of ['مريح', 'متوازن', 'مضغوط']) {
    await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).click();
    await page.getByRole('button', { name: density, exact: true }).click();
    await page.keyboard.press('Escape');
    heights.push((await row.boundingBox())!.height);
    await expect(row.locator('.tv-strip-evidence').first()).toContainText('QA fixture');
    await expect(row.locator('.tv-strip-symbol').first()).toContainText('شركة اختبار');
  }
  expect(heights[0]).toBeGreaterThan(heights[1]); expect(heights[1]).toBeGreaterThan(heights[2]);
  await page.getByRole('button', { name: 'إعدادات الشاشة', exact: true }).click();
  await page.getByRole('switch', { name: 'عرض الأدوات المتوفر لها سعر فقط' }).click();
  await page.keyboard.press('Escape');
  await expect(row.locator('.tv-market-strip-set').first().locator('button')).toHaveCount(2);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 2);
  }
  await row.locator('.tv-market-strip-set').first().locator('button').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(row.locator('.tv-market-strip-set').first().locator('button').first()).toBeFocused();
});

test('priced-only mode advances an empty batch and idle controls wake without hiding remote focus', async ({ page }) => {
  test.setTimeout(60000);
  await fixtures(page, true);
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', marketIds: ['US'], pricedOnly: true, autoHideControls: true })));
  await page.goto('/tv/strips');
  await expect(page.locator('.tv-market-strip-empty')).toContainText('continuing to the next batch');
  await expect(page.locator('.tv-market-strip-set').first().locator('button')).toHaveCount(2, { timeout: 18000 });
  await expect(page.locator('.tv-strip-coverage')).toContainText('2 / 2');
  await page.locator('.tv-market-strip-heading').focus();
  await expect(page.locator('.tv-strips-toolbar')).toHaveAttribute('data-controls-hidden', 'true', { timeout: 16000 });
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.tv-strips-toolbar')).toHaveAttribute('data-controls-hidden', 'false');
  await page.getByRole('button', { name: 'Display settings', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});
