import { describe, expect, it, vi } from 'vitest';
import { collectCookCountyPropertyContext, isChicagoCookCountyAsset } from './cook-county-open-data';

describe('Cook County Assessor parcel sales context', () => {
  it('recognizes Chicago without claiming nationwide US coverage', () => {
    expect(isChicagoCookCountyAsset({ countryCode: 'US', region: 'IL', city: 'Chicago', propertyType: 'APARTMENT' })).toBe(true);
    expect(isChicagoCookCountyAsset({ countryCode: 'US', region: 'NY', city: 'New York City', propertyType: 'APARTMENT' })).toBe(false);
    expect(isChicagoCookCountyAsset({ countryCode: 'US', region: 'CA', city: 'Los Angeles', propertyType: 'HOUSE' })).toBe(false);
  });

  it('uses the County filters and keeps official sales outside valuation evidence', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://datacatalog.cookcountyil.gov');
      expect(url.pathname).toBe('/resource/wvhk-k5uv.json');
      const where = url.searchParams.get('$where') ?? '';
      expect(where).toContain('sale_filter_less_than_10k=false');
      expect(where).toContain('sale_filter_deed_type=false');
      expect(where).toContain('sale_filter_same_sale_within_365=false');
      expect(where).toContain('is_multisale=false');
      expect(where).toContain('num_parcels_sale=1');
      return new Response(JSON.stringify([
        {
          row_id: 'sale-1', pin: '17042070861145', township_code: '74', class: '299',
          sale_date: '2026-07-14T00:00:00.000', sale_price: '162000', doc_no: '2619521029', deed_type: 'Other',
          is_multisale: false, num_parcels_sale: '1', sale_filter_same_sale_within_365: false,
          sale_filter_less_than_10k: false, sale_filter_deed_type: false,
        },
        {
          row_id: 'sale-blocked', pin: '17042070861146', township_code: '74', class: '299',
          sale_date: '2026-07-14T00:00:00.000', sale_price: '5000', is_multisale: false, num_parcels_sale: '1',
          sale_filter_same_sale_within_365: false, sale_filter_less_than_10k: true, sale_filter_deed_type: false,
        },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const fetcher = fetchMock as unknown as typeof fetch;

    const report = await collectCookCountyPropertyContext(
      { countryCode: 'US', region: 'Illinois', city: 'Chicago', propertyType: 'APARTMENT', landArea: 80, landAreaUnit: 'M2', address: 'private address' },
      { fetcher, now: () => new Date('2026-09-16T00:00:00Z') },
    );

    expect(report.providerId).toBe('us-il-cook-assessor-sales');
    expect(report.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(report.records).toHaveLength(1);
    expect(report.records[0]).toMatchObject({ currency: 'USD', reportedValue: 162000, areaM2: null, municipality: 'Chicago' });
    expect(report.valuationEligible).toBe(false);
    expect(report.reasons).toContain('NON_ARMS_LENGTH_SALES_REQUIRE_REVIEW');
    expect(report.reasons).toContain('AREA_METADATA_MISSING');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('private address');
  });
});
