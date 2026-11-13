import { expect, test, type Page } from '@playwright/test';

// Public local fixtures only: never run AI or touch private account records.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const labels = {
  ar: { details: 'تفاصيل الأصل', unavailable: 'غير متوفر حاليًا', retry: 'إعادة تحميل ملف الأصل', issuer: 'جهة الإصدار', objective: 'الهدف الاستثماري', index: 'المؤشر المتتبع' },
  en: { details: 'Asset details', unavailable: 'Currently unavailable', retry: 'Reload asset profile', issuer: 'Issuer', objective: 'Investment objective', index: 'Tracked index' },
  fr: { details: 'Détails de l’actif', unavailable: 'Actuellement indisponible', retry: 'Recharger le profil', issuer: 'Émetteur', objective: 'Objectif d’investissement', index: 'Indice suivi' },
};
const identity = (symbol: string) => ({ canonicalSymbol: symbol, providerSymbol: symbol, displaySymbol: symbol,
  name: symbol === 'QQQ' ? 'Invesco QQQ Trust' : 'Apple Inc.', assetType: symbol === 'QQQ' ? 'FUND' : 'STOCK',
  exchange: 'NASDAQ', market: 'NASDAQ', country: 'US', quoteCurrency: 'USD', logoUrl: null });

async function setup(page: Page, locale: 'ar' | 'en' | 'fr') {
  await page.addInitScript(language => { localStorage.setItem('sfm_lang', language); }, locale);
  await page.route('**/api/markets?**', route => route.fulfill({ json: {
    markets: [{ symbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'fund', exchange: 'NASDAQ', currency: 'USD', source: 'Fixture directory' }],
    groups: [], envelope: { status: 'available' },
  } }));
  await page.route('**/api/intelligence/latest**', route => route.fulfill({ status: 404, json: { ok: false, error: { code: 'NOT_FOUND' } } }));
  await page.route('**/api/intelligence/asset-details**', route => {
    const symbol = new URL(route.request().url()).searchParams.get('symbol')!;
    return route.fulfill({ json: { ok: true, asset: identity(symbol), quote: null, quoteStatus: 'unavailable', fetchedAt: '2026-11-08T00:00:00Z', correlationId: 'fixture' } });
  });
  await page.route('**/api/market/search**', route => {
    const symbol = new URL(route.request().url()).searchParams.get('query')!;
    const asset = identity(symbol);
    return route.fulfill({ json: { ok: true, results: [], resolved: { ...asset, symbol, assetType: symbol === 'QQQ' ? 'etf' : 'stock' } } });
  });
}

for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`canonical QQQ unavailable fields, stock data, retry and navigation (${locale})`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await setup(page, locale);
    let analysisPosts = 0;
    await page.route('**/api/intelligence/analyze', route => { analysisPosts += 1; return route.fulfill({ status: 503, json: { ok: false } }); });
    let failProfile = false;
    let fullFund = false;
    const requested: string[] = [];
    await page.route('**/api/market/asset-profile**', route => {
      const params = new URL(route.request().url()).searchParams;
      const symbol = params.get('symbol')!;
      requested.push(symbol);
      expect(params.get('type')).toBe(symbol === 'QQQ' ? 'etf' : 'stock');
      if (failProfile) return route.fulfill({ status: 503, json: { success: false } });
      const profile = symbol === 'QQQ'
        ? { ticker: 'QQQ', ...(fullFund ? { issuer: 'Fixture fund issuer', objective: 'Fixture provider investment objective', indexTracked: 'Fixture tracked index' } : {}) }
        : { ticker: 'AAPL', sector: 'Technology', industry: 'Technology Hardware', website: 'https://www.apple.com/' };
      return route.fulfill({ json: { success: true, symbol, assetType: symbol === 'QQQ' ? 'fund' : 'stock', profileAvailable: true,
        source: 'Fixture profile provider', lastUpdated: '2026-11-08T06:30:32Z', profile } });
    });
    await page.goto('/market-analysis', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/ai-analyst\/market-leadership/);
    await page.locator('[data-ai-analyst-surface="market-leadership"] a[href*="/ai-analyst/analyze/QQQ"]').click();
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/QQQ\?/);
    const details = page.locator('#details');
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    const profile = page.getByTestId('ai-analyst-asset-profile');
    await expect(profile).toBeVisible();
    for (const [field, label] of [['issuer', labels[locale].issuer], ['objective', labels[locale].objective], ['indexTracked', labels[locale].index]]) {
      await expect(profile.locator(`[data-profile-field="${field}"]`)).toContainText(label);
      await expect(profile.locator(`[data-profile-field="${field}"] dd`)).toHaveText(labels[locale].unavailable);
    }
    await expect(profile).toContainText('Fixture profile provider');
    expect(requested).toEqual(['QQQ']);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);

    // Exercise a real picker transition, not only a direct new-page visit.
    const form = page.getByTestId('ai-analyst-research-workspace').locator('form');
    await form.locator('input').fill('AAPL');
    await form.locator('select').first().selectOption('STOCK');
    failProfile = true;
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/AAPL\?/);
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    await expect(profile.getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('ai-analyst-asset-details')).toContainText('Apple Inc.');
    await expect(profile.locator('[data-profile-field="issuer"]')).toHaveCount(0);
    failProfile = false;
    await profile.getByRole('button', { name: labels[locale].retry }).click();
    await expect(profile.locator('[data-profile-field="sector"] dd')).toHaveText('Technology');
    await expect(profile.getByRole('link', { name: 'https://www.apple.com/' })).toHaveAttribute('href', 'https://www.apple.com/');
    await expect(profile.locator('[data-profile-field="description"] dd')).toHaveText(labels[locale].unavailable);
    expect(analysisPosts).toBe(0);

    // Back/forward must never retain the other asset's profile.
    fullFund = true;
    await page.goBack();
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/QQQ\?/);
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    await expect(profile.locator('[data-profile-field="issuer"] dd')).toHaveText('Fixture fund issuer');
    await expect(profile.locator('[data-profile-field="objective"] dd')).toHaveText('Fixture provider investment objective');
    await expect(profile.locator('[data-profile-field="indexTracked"] dd')).toHaveText('Fixture tracked index');
    await expect(profile).not.toContainText('Technology Hardware');
    await page.goForward();
    await expect(page).toHaveURL(/\/ai-analyst\/analyze\/AAPL\?/);
    if (await details.getAttribute('open') === null) await details.locator('summary').click();
    await expect(profile.locator('[data-profile-field="sector"] dd')).toHaveText('Technology');
    await expect(profile).not.toContainText('Fixture fund issuer');
    expect(analysisPosts).toBe(0);
    await testInfo.attach(`asset-profile-${locale}-${testInfo.project.name}`, { body: await details.screenshot(), contentType: 'image/png' });
  });
}
