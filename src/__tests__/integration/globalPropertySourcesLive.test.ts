import { describe, expect, it } from 'vitest';
import { collectUkHmlrPropertyContext } from '@/lib/investments/intelligence/adapters/uk-hmlr-open-data';
import { collectNycPropertyContext } from '@/lib/investments/intelligence/adapters/nyc-dof-open-data';
import { collectCookCountyPropertyContext } from '@/lib/investments/intelligence/adapters/cook-county-open-data';
import { collectLaCountyPropertyContext } from '@/lib/investments/intelligence/adapters/la-county-assessor';

const enabled = process.env.SFM_GLOBAL_PROPERTY_LIVE_CHECK === '1';

describe.runIf(enabled)('live official London and US property sources', () => {
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

  it('reads filtered Chicago parcel sales from Cook County Assessor without promoting them to valuation evidence', async () => {
    const report = await collectCookCountyPropertyContext({
      countryCode: 'US', region: 'IL', city: 'Chicago', district: 'Cook County',
      propertyType: 'APARTMENT', landArea: 80, landAreaUnit: 'M2',
    });
    expect(report.providerId).toBe('us-il-cook-assessor-sales');
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.records.length).toBeGreaterThan(0);
    expect(report.records.every(row => row.currency === 'USD' && row.reportedValue !== null && row.areaM2 === null)).toBe(true);
    expect(report.valuationEligible).toBe(false);
    expect(report.reasons).toContain('NON_ARMS_LENGTH_SALES_REQUIRE_REVIEW');
    expect(report.reasons).toContain('SALES_REPORTING_LAG');
  }, 20_000);

  it('queries the LA County Assessor Recent Sales layer by AIN without promoting the response to valuation evidence', async () => {
    const report = await collectLaCountyPropertyContext({
      countryCode: 'US', region: 'CA', city: 'Los Angeles',
      propertyType: 'MULTI_FAMILY', parcelIdentifier: '6032-023-009',
    });
    expect(report.providerId).toBe('us-ca-la-assessor-recent-sales');
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(Array.isArray(report.records)).toBe(true);
    expect(report.records.every(row => row.currency === 'USD' && row.areaM2 === null && row.reportedPricePerM2 === null)).toBe(true);
    expect(report.valuationEligible).toBe(false);
    expect(report.reasons).toContain('UNVERIFIED_SINGLE_PARCEL_SALE');
    expect(report.reasons).toContain('INDICATED_SALE_PRICE_MAY_BE_DTT_DERIVED');
    expect(report.reasons).toContain('AREA_SEMANTICS_NOT_VERIFIED');
  }, 20_000);
});
