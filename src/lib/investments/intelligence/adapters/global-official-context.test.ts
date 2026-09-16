import { describe, expect, it, vi } from 'vitest';
import { collectUkHmlrPropertyContext } from './uk-hmlr-open-data';
import { collectNycPropertyContext, isNewYorkCityAsset } from './nyc-dof-open-data';

function response(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('global official property context', () => {
  it('connects London HMLR sale-price context without inventing area or price-per-m2', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      expect(body).toContain('CITY+OF+WESTMINSTER');
      expect(body).not.toContain('221B Baker Street');
      expect(body).not.toContain('secret-plot-id');
      return response({ results: { bindings: [{
        transaction: { value: 'http://landregistry.data.gov.uk/data/ppi/transaction/abc' },
        amount: { value: '925000' }, date: { value: '2026-07-02' },
        propertyType: { value: 'http://landregistry.data.gov.uk/def/common/flat-maisonette' },
        estateType: { value: 'http://landregistry.data.gov.uk/def/common/leasehold' },
        town: { value: 'LONDON' }, district: { value: 'CITY OF WESTMINSTER' }, postcode: { value: 'W1' },
      }] } });
    }) as unknown as typeof fetch;
    const report = await collectUkHmlrPropertyContext({ countryCode: 'GB', city: 'London', district: 'City of Westminster', propertyType: 'APARTMENT', landArea: 80, landAreaUnit: 'M2', address: '221B Baker Street', parcelIdentifier: 'secret-plot-id' }, { fetcher, now: () => new Date('2026-09-16T00:00:00Z') });
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.valuationEligible).toBe(false);
    expect(report.records).toHaveLength(1);
    expect(report.records[0].currency).toBe('GBP');
    expect(report.records[0].reportedValue).toBe(925000);
    expect(report.records[0].areaM2).toBeNull();
    expect(report.records[0].reportedPricePerM2).toBeNull();
    expect(report.reasons).toContain('AREA_METADATA_MISSING');
  });

  it('rejects Scotland from the England/Wales HMLR Price Paid connection', async () => {
    const report = await collectUkHmlrPropertyContext({ countryCode: 'GB', region: 'Scotland', city: 'Edinburgh', propertyType: 'HOUSE', landArea: 100, landAreaUnit: 'M2' });
    expect(report.status).toBe('INPUT_REQUIRED');
    expect(report.reasons).toContain('ENGLAND_WALES_ONLY');
  });

  it('recognizes NYC jurisdiction without claiming nationwide US coverage', () => {
    expect(isNewYorkCityAsset({ countryCode: 'US', region: 'NY', city: 'New York City', propertyType: 'LAND' })).toBe(true);
    expect(isNewYorkCityAsset({ countryCode: 'US', region: 'CA', city: 'Los Angeles', propertyType: 'LAND' })).toBe(false);
  });

  it('connects NYC rolling sales with official square footage while keeping rows out of valuation evidence', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('data.cityofnewyork.us/resource/usep-8jbt.json');
      expect(decodeURIComponent(url)).toContain("borough='1'");
      expect(url).not.toContain('private condo address');
      return response([{ borough: '1', neighborhood: 'MIDTOWN WEST', building_class_category: '10 COOPS - ELEVATOR APARTMENTS', block: '1000', lot: '10', address: 'PUBLIC SOURCE ADDRESS', gross_square_feet: '1000', land_square_feet: '800', building_class_at_time_of_sale: 'D4', sale_price: '1500000', sale_date: '2026-08-20T00:00:00.000' }]);
    }) as unknown as typeof fetch;
    const report = await collectNycPropertyContext({ countryCode: 'US', region: 'NY', city: 'New York City', district: 'Manhattan', propertyType: 'APARTMENT', landArea: 90, landAreaUnit: 'M2', address: 'private condo address' }, { fetcher, now: () => new Date('2026-09-16T00:00:00Z') });
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.valuationEligible).toBe(false);
    expect(report.records).toHaveLength(1);
    expect(report.records[0].currency).toBe('USD');
    expect(report.records[0].reportedValue).toBe(1500000);
    expect(report.records[0].areaM2).toBeCloseTo(92.903, 3);
    expect(report.records[0].reportedPricePerM2).toBeGreaterThan(0);
    expect(report.reasons).toContain('NON_MARKET_SALES_REQUIRE_FILTERING');
  });
});
