import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nycComparableObservations, nycTransactionAdapter } from '@/lib/investments/intelligence/adapters/nyc-transactions';
import { cookComparableObservations, cookTransactionAdapter } from '@/lib/investments/intelligence/adapters/cook-transactions';
import { transactionRows } from '@/lib/investments/intelligence/adapters/transaction-data';
import { observationToEvidence, geographyMatch } from '@/lib/investments/intelligence/sources';
import { buildRealEstateValuationRange } from '@/lib/investments/intelligence/valuation-range';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';

vi.mock('server-only', () => ({}));
const now = new Date('2026-09-19T12:00:00Z');
const house = { countryCode: 'US', city: 'New York City', municipality: 'Brooklyn', district: 'MARINE PARK', propertyType: 'HOUSE', builtArea: 140, builtAreaUnit: 'M2' as const };
const sale = { borough: '3', neighborhood: 'MARINE PARK', block: '7701', lot: '63', building_class_at_time_of: 'A1', sale_price: '1090000', sale_date: '2026-08-31T00:00:00.000', gross_square_feet: '1,304', land_square_feet: '3,100', residential_units: '1', commercial_units: '0', total_units: '1' };
const chicago = { ...house, city: 'Chicago', municipality: undefined, district: '71030' };
const cookSale = { pin: '17123456780000', year: '2026.0', nbhd: '71030', township_code: '71', class: '205', sale_date: '2026-07-10', sale_price: '300000', doc_no: '1234567890', is_multisale: false, num_parcels_sale: '1.0', sale_filter_same_sale_within_365: false, sale_filter_less_than_10k: false, sale_filter_deed_type: false };
const property = { pin: cookSale.pin, year: '2026.0', class: '205', char_bldg_sf: '1400', pin_is_multicard: false, pin_num_cards: '1.0', tieback_proration_rate: '1.0', card_proration_rate: '0.0', char_ncu: '0', char_use: 'Single-Family' };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('official transaction qualification', () => {
  it('converts NYC sales using building area, preserving source currency and traceable parcel identity', () => {
    const observations = nycComparableObservations(house, [sale], now);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ areaBasis: 'BUILT', currency: 'USD', unitCode: 'FT2', unitValue: 1090000 / 1304 });
    expect(new URL(observations[0].sourceUrl!).searchParams.get('$where')).toContain("block='7701'");
  });
  it.each([{ sale_price: '0' }, { sale_price: '9999' }, { sale_date: '2025-01-01' }, { sale_date: '2027-01-01' }, { sale_date: '2026-02-30' }, { gross_square_feet: '0' }, { gross_square_feet: '99999' }, { building_class_at_time_of: 'A8' }, { total_units: '2' }, { borough: '4' }, { neighborhood: 'OTHER' }, { ease_ment: 'Y' }])('rejects noncomparable NYC rows %j', patch => {
    expect(nycComparableObservations(house, [{ ...sale, ...patch }], now)).toEqual([]);
  });
  it('uses distinct properties, not repeated transfers or the subject itself', () => {
    expect(nycComparableObservations(house, [sale, { ...sale, sale_date: '2026-07-01', sale_price: '900000' }], now)).toHaveLength(1);
    expect(nycComparableObservations({ ...house, parcelIdentifier: '3-07701-0063' }, [sale], now)).toEqual([]);
  });
  it('does not value a house from land area or mix floor-area and land-area evidence', () => {
    const asset = { ...house, builtArea: undefined, landArea: 140, landAreaUnit: 'M2' as const };
    expect(assessRealEstateReadiness(asset, []).checks.area).toBe(false);
    expect(nycComparableObservations(asset, [sale], now)).toEqual([]);
    const observations = nycComparableObservations(house, [sale, { ...sale, lot: '64' }], now);
    const evidence = observations.map(row => ({ ...observationToEvidence(nycTransactionAdapter, house, row), areaBasis: 'LAND' as const }));
    expect(buildRealEstateValuationRange(house, evidence, 'USD').status).toBe('INSUFFICIENT_EVIDENCE');
  });
  it('requires a single matching sale-year building with full parcel attribution in Cook County', () => {
    expect(cookComparableObservations(chicago, [cookSale], [property], now)).toHaveLength(1);
    for (const patch of [{ year: '2025' }, { class: '211' }, { pin_is_multicard: true }, { tieback_proration_rate: '0.5' }, { char_use: 'Multi-Family' }, { char_ncu: '1' }, { char_bldg_sf: '' }]) {
      expect(cookComparableObservations(chicago, [cookSale], [{ ...property, ...patch }], now)).toEqual([]);
    }
    expect(cookComparableObservations(chicago, [cookSale], [property, property], now)).toEqual([]);
    expect(cookComparableObservations(chicago, [{ ...cookSale, is_multisale: true }], [property], now)).toEqual([]);
    expect(cookComparableObservations(chicago, [{ ...cookSale, sale_filter_deed_type: true }], [property], now)).toEqual([]);
  });
  it('never upgrades contradictory districts or regions to a strong city match', () => {
    expect(geographyMatch(house, { evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'test', countryCode: 'US', city: house.city, district: 'OTHER' })).toBe('WEAK');
  });
  it('uses the complete observed range and low confidence for two independent sales', () => {
    const observations = nycComparableObservations(house, [sale, { ...sale, lot: '64', sale_price: '1300000' }], now);
    const evidence = observations.map(row => observationToEvidence(nycTransactionAdapter, house, row));
    const result = buildRealEstateValuationRange(house, evidence, 'USD');
    expect(result).toMatchObject({ status: 'VALUED', estimateKind: 'PRELIMINARY', confidence: 'LOW', sampleSize: 2, areaBasis: 'BUILT' });
    expect(result.highValue!).toBeGreaterThan(result.lowValue!);
    expect(buildRealEstateValuationRange(house, evidence.slice(0, 1), 'USD').status).toBe('INSUFFICIENT_EVIDENCE');
  });
});

describe('connected valuation orchestration', () => {
  it('collects real adapter evidence and retains a USD estimate when account KWD has no verified FX', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([sale, { ...sale, lot: '64', sale_price: '1300000' }]), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const result = await analyzeRealEstateAsset(house, 'KWD');
    expect(result).toMatchObject({ status: 'VALUED', nativeCurrencyFallback: true, requestedCurrency: 'KWD', qualifiedEvidenceCount: 2 });
    expect(result.valuation?.currency).toBe('USD');
    expect(result.officialContext?.valuationEligible).toBe(false);
    expect(result.evidence.every(row => row.id.startsWith('us-nyc-qualified-sales:'))).toBe(true);
  });
  it('reports missing precise neighborhood and excludes unsupported US jurisdictions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')));
    const result = await analyzeRealEstateAsset({ ...house, municipality: undefined, district: 'Brooklyn' }, 'USD');
    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.sourceFailures).toContainEqual({ adapterId: nycTransactionAdapter.id, reason: 'NYC_NEIGHBORHOOD_REQUIRED' });
    expect(nycTransactionAdapter.supportsAsset?.({ ...house, city: 'Buffalo' })).toBe(false);
    expect(cookTransactionAdapter.supportsAsset?.({ ...chicago, city: 'Springfield' })).toBe(false);
  });
  it('rejects provider schema changes and oversized responses', async () => {
    await expect(transactionRows('https://data.cityofnewyork.us/resource/usep-8jbt.json', { $limit: '2' }, vi.fn(async () => new Response('{}')) as typeof fetch)).rejects.toThrow('SOURCE_SCHEMA_INVALID');
    await expect(transactionRows('https://data.cityofnewyork.us/resource/usep-8jbt.json', { $limit: '2' }, vi.fn(async () => new Response('[]', { headers: { 'content-length': '2000001' } })) as typeof fetch)).rejects.toThrow('SOURCE_RESPONSE_TOO_LARGE');
  });
});
