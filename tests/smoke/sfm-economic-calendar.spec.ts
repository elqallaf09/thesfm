import { expect, test } from '@playwright/test';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`SFM calendar sources, search and force refresh (${locale})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(lang => { localStorage.setItem('sfm_lang', lang); localStorage.setItem('sfm_theme', 'light'); }, locale);
    await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
    await page.locator('button.guest-btn').first().click();
    await page.waitForURL(/\/dashboard(?:\?|$)/);
    const requested: string[] = [];
    const updated = new Date().toISOString();
    const date = new Date(Date.now() + 9 * 86_400_000).toISOString();
    await page.route('**/api/economic-calendar**', async route => {
      requested.push(route.request().url());
      const event = { id: 'calendar-browser-fixture', title: 'GDP verification fixture', dateTime: date, country: 'US', currency: 'USD', impact: 'high', actual: null, forecast: null, previous: null, source: 'BEA', sourceUrl: 'https://www.bea.gov/news/schedule', retrievedAt: updated };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        items: [event], source: 'THE SFM', provider: 'THE SFM', providerId: 'sfm', status: 'partial', providerStatus: 'partial', updated_at: updated, lastSuccessfulUpdate: updated, checkedAt: updated,
        sources: [{ provider: 'bea', status: 'success', count: 1, checkedAt: updated, lastSuccessfulUpdate: updated, errorCode: null }, { provider: 'bls', status: 'failed', count: 0, checkedAt: updated, lastSuccessfulUpdate: null, errorCode: 'http_403' }],
      }) });
    });
    await page.goto('/ai-analyst/calendar');
    const calendar = page.locator('[data-ai-analyst-surface="economic-calendar"]');
    await expect(calendar).toBeVisible();
    const summary = calendar.locator('summary').filter({ hasText: 'THE SFM' });
    await expect(summary).toContainText('1/2');
    await summary.click();
    await expect(calendar.getByText('BLS · US', { exact: true })).toBeVisible();
    const month = { ar: '30 يومًا', en: '30 days', fr: '30 jours' }[locale];
    await calendar.getByRole('button', { name: month, exact: true }).click();
    const search = calendar.locator('input[type="search"]');
    await search.fill(locale === 'ar' ? 'الناتج المحلي' : 'GDP');
    await expect(calendar.locator('a[href="https://www.bea.gov/news/schedule"]').first()).toBeVisible();
    await search.fill('no-such-economic-event');
    await expect(calendar.locator('.economic-calendar-table-card')).toHaveCount(0);
    await search.fill('');
    const refresh = { ar: 'تحديث البيانات', en: 'Refresh data', fr: 'Actualiser les données' }[locale];
    await calendar.getByRole('button', { name: refresh, exact: true }).click();
    await expect.poll(() => requested.some(url => url.includes('refresh=1'))).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
  });
}
