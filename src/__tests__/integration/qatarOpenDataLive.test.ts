import { describe, expect, it } from 'vitest';
import { collectQatarPropertyContext } from '@/lib/investments/intelligence/adapters/qatar-open-data';
import { readQatarPublicJson, rows, QATAR_LICENSE } from '@/lib/investments/intelligence/adapters/qatar-public-client';

// A separate, opt-in public-source probe. No auth, DB, provider keys or user-owned assets.
// Deterministic mocked regressions run unconditionally in the normal suite.
describe.skipIf(process.env.SFM_QATAR_LIVE_CHECK !== '1')('Qatar public source live contract', () => {
  it('retrieves real official records but does not promote unreviewed data to a valuation', async () => {
    const data = await readQatarPublicJson('records', { select: 'municipality_name,district_name', order_by: 'registration_date desc', limit: '1' });
    const latest = rows(data, 1)[0];
    expect(typeof latest?.municipality_name).toBe('string');
    expect(typeof latest?.district_name).toBe('string');
    const report = await collectQatarPropertyContext({ countryCode: 'QA', city: String(latest.municipality_name), district: String(latest.district_name), propertyType: 'LAND' });
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.records.length).toBeGreaterThan(0);
    expect(report.licenseUrl).toBe(QATAR_LICENSE);
    expect(report.valuationEligible).toBe(false);
    expect(report.records.every(record => record.currency === null)).toBe(true);
    expect(report.latestObservationOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    console.info(JSON.stringify({ scope: 'public source connection, not property valuation', checkedAt: report.retrievedAt,
      sourceAsOf: report.latestObservationOn, metadataAsOf: report.metadataUpdatedAt,
      sourceRecordCount: report.sampleTotal, displayedRecordCount: report.records.length,
      sampleTruncated: report.sampleTruncated, valuationEligible: report.valuationEligible, reasons: report.reasons }));
  }, 90_000);
});
