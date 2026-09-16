import { describe, expect, it } from 'vitest';
import { collectUkHmlrPropertyContext } from '@/lib/investments/intelligence/adapters/uk-hmlr-open-data';
import { collectNycPropertyContext } from '@/lib/investments/intelligence/adapters/nyc-dof-open-data';

const enabled = process.env.SFM_GLOBAL_PROPERTY_LIVE_CHECK === '1';

describe.runIf(enabled)('live official London and NYC property sources', () => {
  it('reads recent London sale records from HM Land Registry without promoting them to valuation evidence', async () => {
    const report = await collectUkHmlrPropertyContext({
      countryCode: 'GB', region: 'England', city: 'London', district: 'CITY OF WESTMINSTER',
      propertyType: 'APARTMENT', landArea: 80, landAreaUnit: 'M2',
    });
    expect(report.providerId).toBe('uk-hmlr-price-paid');
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.records.length).toBeGreaterThan(0);
    expect(report.records.every(row => row.currency === 'GBP' && row.reportedValue !== null && row.areaM2 === null)).toBe(true);
    expect(report.valuationEligible).toBe(false);
    expect(report.reasons).toContain('AREA_METADATA_MISSING');
  }, 20_000);

  it('reads current NYC rolling sales from Department of Finance without treating every transfer as a comparable', async () => {
    const report = await collectNycPropertyContext({
      countryCode: 'US', region: 'NY', city: 'New York City', district: 'Manhattan',
      propertyType: 'APARTMENT', landArea: 80, landAreaUnit: 'M2',
    });
    expect(report.providerId).toBe('us-nyc-dof-rolling-sales');
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.records.length).toBeGreaterThan(0);
    expect(report.records.every(row => row.currency === 'USD' && row.reportedValue !== null)).toBe(true);
    expect(report.valuationEligible).toBe(false);
    expect(report.reasons).toContain('NON_MARKET_SALES_REQUIRE_FILTERING');
  }, 20_000);
});
