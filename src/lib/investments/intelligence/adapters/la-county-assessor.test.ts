import { describe, expect, it, vi } from 'vitest';
import type { RealEstateAssetInput } from '../real-estate';
import {
  collectLaCountyPropertyContext,
  isLosAngelesCountyAsset,
  normalizeLaCountyAin,
} from './la-county-assessor';

function asset(overrides: Partial<RealEstateAssetInput> = {}): RealEstateAssetInput {
  return {
    countryCode: 'US',
    region: 'CA',
    city: 'Los Angeles',
    propertyType: 'REAL_ESTATE',
    parcelIdentifier: '6032-023-009',
    ...overrides,
  };
}

describe('Los Angeles County Assessor context', () => {
  it('recognizes Los Angeles County only inside California/US scope', () => {
    expect(isLosAngelesCountyAsset(asset())).toBe(true);
    expect(isLosAngelesCountyAsset(asset({ region: 'California', city: 'Los Angeles County' }))).toBe(true);
    expect(isLosAngelesCountyAsset(asset({ region: 'NY' }))).toBe(false);
    expect(isLosAngelesCountyAsset(asset({ countryCode: 'CA' }))).toBe(false);
  });

  it('normalizes only valid 10-digit Assessor Identification Numbers', () => {
    expect(normalizeLaCountyAin('6032-023-009')).toBe('6032023009');
    expect(normalizeLaCountyAin('6032023009')).toBe('6032023009');
    expect(normalizeLaCountyAin('60320230')).toBeNull();
    expect(normalizeLaCountyAin('not-a-parcel')).toBeNull();
  });

  it('requires an AIN instead of sending a private address to the provider', async () => {
    const fetcher = vi.fn();
    const result = await collectLaCountyPropertyContext(
      asset({ parcelIdentifier: undefined, address: '123 private address' }),
      { fetcher },
    );

    expect(result.status).toBe('INPUT_REQUIRED');
    expect(result.valuationEligible).toBe(false);
    expect(result.reasons).toContain('VALID_10_DIGIT_AIN_REQUIRED');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('maps an official recent sale as review-only context without inventing area', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe('assessor.gis.lacounty.gov');
      expect(url.searchParams.get('where')).toBe("AIN='6032023009'");
      expect(url.searchParams.get('returnGeometry')).toBe('false');
      expect(url.searchParams.get('outFields')).not.toContain('SAADDR');

      return new Response(JSON.stringify({
        features: [{
          attributes: {
            OBJECTID: 99,
            AIN: '6032023009',
            FORMATTED_AIN: '6032-023-009',
            SALEDATE: Date.UTC(2026, 1, 14),
            FORMATTED_SALEDATE: '02/14/2026',
            SALEPRICE: 1_250_012,
            FORMATTED_SALEPRICE: '$1,250,012',
            SIZE: 2000,
            FORMATTED_SIZE: '2,000',
            YEARBUILT: '1995',
            USECODE: '0100',
            USETYPE: 'SFR',
          },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const result = await collectLaCountyPropertyContext(asset(), {
      fetcher,
      now: () => new Date('2026-09-17T12:00:00.000Z'),
    });

    expect(result.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(result.valuationEligible).toBe(false);
    expect(result.latestObservationOn).toBe('2026-02-14');
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      observedOn: '2026-02-14',
      propertyType: 'Single Family Residence',
      reportedValue: 1_250_012,
      currency: 'USD',
      areaM2: null,
      reportedPricePerM2: null,
      fullOwnership: false,
    });
    expect(result.reasons).toContain('UNVERIFIED_SINGLE_PARCEL_SALE');
    expect(result.reasons).toContain('INDICATED_SALE_PRICE_MAY_BE_DTT_DERIVED');
    expect(result.reasons).toContain('AREA_SEMANTICS_NOT_VERIFIED');
  });

  it('does not fabricate a record when the official layer has no recent sale', async () => {
    const result = await collectLaCountyPropertyContext(asset(), {
      fetcher: vi.fn(async () => new Response(JSON.stringify({ features: [] }), { status: 200 })),
    });

    expect(result.records).toEqual([]);
    expect(result.latestObservationOn).toBeNull();
    expect(result.reasons).toContain('NO_RECENT_SALE_RECORD');
    expect(result.valuationEligible).toBe(false);
  });
});
