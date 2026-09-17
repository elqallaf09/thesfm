import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const configured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const copy = {
  ar: { country: 'الدولة', city: 'البلدية من المصدر الرسمي', district: 'الحي من المصدر الرسمي', area: 'مساحة الأرض', search: 'البحث عن أدلة موثقة', source: 'اتصال المصدر الرسمي', save: 'حفظ التقييم وأدلته', details: 'عرض سجلات المصدر، وليست تقييمًا', warning: 'المصدر متصل للفحص، وسجلاته منفصلة عن التقييم الحالي للعقار.' },
  en: { country: 'Country', city: 'Official municipality', district: 'Official district', area: 'Land area', search: 'Search verified evidence', source: 'Official source connection', save: 'Save valuation and evidence', details: 'Inspect source records, not a valuation', warning: 'Source connected for inspection; its records remain separate from current-property valuation.' },
  fr: { country: 'Pays', city: 'Municipalité officielle', district: 'Quartier officiel', area: 'Surface du terrain', search: 'Rechercher des preuves vérifiées', source: 'Connexion à la source officielle', save: 'Enregistrer l’estimation et ses preuves', details: 'Consulter les transactions, pas une estimation', warning: 'Source connectée pour consultation ; ses données restent séparées de l’estimation actuelle.' },
} as const;
const location = { municipality: 'Synthetic Municipality', municipalityAr: 'بلدية اختبار', district: 'Synthetic District', districtAr: 'حي اختبار' };
// Isolated test-only public-source data. No private portfolio reads or writes.
const report = {
  providerId: 'qa-moj-open-sales-context', sourceName: 'Qatar Ministry of Justice', sourceUrl: 'https://www.data.gov.qa/explore/dataset/weekly-real-estates-sales-bulletin/', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  status: 'CONNECTED_REVIEW_REQUIRED', retrievedAt: '2026-09-16T12:00:00Z', metadataUpdatedAt: '2026-08-31', latestObservationOn: '2025-12-31', sampleTotal: 1, sampleTruncated: false, valuationEligible: false,
  reasons: ['STALE_OBSERVATIONS', 'CURRENCY_METADATA_MISSING', 'SOURCE_CLASSIFICATION_REVIEW'],
  records: [{ ...location, id: 'synthetic-source-row', observedOn: '2025-12-31', propertyType: 'Two separate villas', propertyTypeAr: 'أرض فضاء', usage: 'Test residential', usageAr: 'سكني تجريبي', areaM2: 100, reportedValue: 100000, reportedPricePerM2: 1000, currency: null, fullOwnership: true, sourceUrl: 'https://www.data.gov.qa/explore/dataset/weekly-real-estates-sales-bulletin/table/' }],
};

test.use({ storageState: userAuthStatePath, trace: 'off', screenshot: 'off', video: 'off' });
for (const language of ['ar', 'en', 'fr'] as const) {
  test(`${language}: official source selection is not a current property valuation`, async ({ page }) => {
    test.skip(!configured, 'Requires the existing isolated Preview auth fixture.');
    test.setTimeout(90_000);
    const labels = copy[language];
    let analysisRequests = 0; let snapshotRequests = 0;
    await page.route('**/api/investments/real-estate/locations?countryCode=QA', route => route.fulfill({ json: { ok: true, countryCode: 'QA', valuationEligible: false, locations: [location] } }));
    await page.route('**/api/investments/real-estate/analyze', async route => {
      analysisRequests += 1;
      const payload = route.request().postDataJSON();
      expect(payload.asset).toMatchObject({ countryCode: 'QA', municipality: location.municipality, district: location.district, landArea: 100 });
      await route.fulfill({ json: { ok: true, analysis: { status: 'SOURCE_DATA_REVIEW_REQUIRED', valuation: null, evidence: [], evidenceCount: 0, sourceFailures: [], message: 'Context only', officialContext: report } } });
    });
    await page.route('**/api/investments/real-estate/snapshots', route => { snapshotRequests += 1; return route.fulfill({ status: 500, json: { ok: false } }); });
    await page.addInitScript(lang => { localStorage.setItem('sfm_lang', lang); localStorage.setItem('the-sfm-theme', 'light'); }, language);
    await page.goto('/invest/real-estate', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(labels.country, { exact: true }).selectOption('QA');
    const city = page.getByLabel(labels.city, { exact: true });
    await expect(city).toBeEnabled();
    await city.selectOption(location.municipality);
    await page.getByLabel(labels.district, { exact: true }).selectOption(location.district);
    await page.getByLabel(labels.area, { exact: true }).fill('100');
    expect(analysisRequests).toBe(0);
    await page.getByRole('button', { name: labels.search, exact: true }).click();
    const source = page.getByRole('region', { name: labels.source, exact: true });
    await expect(source).toBeVisible();
    await expect(source.getByText(labels.warning, { exact: true })).toBeVisible();
    await expect(source.getByText('2025-12-31', { exact: true }).first()).toBeVisible();
    await expect(source.getByText('2026-08-31', { exact: true })).toBeVisible();
    await expect(source.getByRole('link', { name: 'CC BY 4.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    await source.locator('summary').filter({ hasText: labels.details }).click();
    await expect(source.getByText('أرض فضاء', { exact: true })).toBeVisible();
    await expect(source.getByText('Two separate villas', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: labels.save, exact: true })).toHaveCount(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(selected => { document.documentElement.classList.remove('light', 'dark'); document.documentElement.classList.add(selected); }, theme);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${language}/${theme} official source horizontal overflow`).toBeLessThanOrEqual(2);
    }
    await page.getByLabel(labels.area, { exact: true }).fill('101');
    await expect(source).toHaveCount(0);
    expect(analysisRequests).toBe(1);
    expect(snapshotRequests).toBe(0);
  });
}
