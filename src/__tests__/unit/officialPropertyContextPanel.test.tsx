import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfficialPropertyContext } from '@/lib/investments/intelligence/official-context';
const language = vi.hoisted(() => ({ lang: 'en', dir: 'ltr' }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => language }));
import { OfficialPropertyContextPanel } from '@/components/invest/OfficialPropertyContextPanel';
const report: OfficialPropertyContext = { providerId: 'qa-moj-open-sales-context', sourceName: 'Qatar MOJ', sourceUrl: 'https://www.data.gov.qa/', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', status: 'CONNECTED_REVIEW_REQUIRED', retrievedAt: '2026-09-16T12:00:00Z', metadataUpdatedAt: '2026-08-31', latestObservationOn: '2025-12-31', sampleTotal: 0, sampleTruncated: false, records: [], valuationEligible: false, reasons: ['STALE_OBSERVATIONS', 'NO_LOCAL_RECORDS'] };
beforeEach(() => { language.lang = 'en'; language.dir = 'ltr'; });
describe('official property source presentation', () => {
  it.each(['ar', 'en', 'fr'])('renders source dates, attribution and no valuation claim in %s', lang => {
    language.lang = lang; language.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const html = renderToStaticMarkup(<OfficialPropertyContextPanel report={report} />);
    expect(html).toContain('2025-12-31'); expect(html).toContain('2026-08-31');
    expect(html).toContain('CC BY 4.0'); expect(html).toContain('THE SFM');
    expect(html).toContain(`dir="${language.dir}"`);
    expect(html).not.toContain('Save valuation');
  });
  it('renders Cook County with its official link and explicit comparison limits', () => {
    const cook: OfficialPropertyContext = {
      ...report,
      providerId: 'us-il-cook-assessor-sales',
      sourceName: 'Cook County Assessor Parcel Sales',
      sourceUrl: 'https://datacatalog.cookcountyil.gov/d/wvhk-k5uv',
      licenseName: 'Cook County Open Data public access',
      licenseUrl: 'https://datacatalog.cookcountyil.gov/',
      metadataUpdatedAt: '2026-09-01',
      latestObservationOn: '2026-07-14',
      reasons: ['AREA_METADATA_MISSING', 'NON_ARMS_LENGTH_SALES_REQUIRE_REVIEW', 'SALES_REPORTING_LAG'],
    };
    const html = renderToStaticMarkup(<OfficialPropertyContextPanel report={cook} />);
    expect(html).toContain('Cook County Assessor · Parcel Sales');
    expect(html).toContain('https://datacatalog.cookcountyil.gov/d/wvhk-k5uv');
    expect(html).toContain('non-arm');
    expect(html).toContain('months after recording');
  });
  it('refuses unsafe source/attribution links', () => {
    const html = renderToStaticMarkup(<OfficialPropertyContextPanel report={{ ...report, sourceUrl: 'javascript:alert(1)', licenseUrl: 'https://attacker.invalid/' }} />);
    expect(html).not.toContain('href=');
  });
});
