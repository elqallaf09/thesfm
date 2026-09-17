import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectQatarPropertyContext, getQatarPropertyLocations } from './qatar-open-data';
import { readQatarPublicJson, QATAR_API, QATAR_DATASET, QATAR_LICENSE } from './qatar-public-client';
import { analyzeRealEstateAsset } from '../analyst';

// Synthetic fixtures live ONLY in tests, never application source or persistent databases.
const fieldTypes: Record<string, string> = { registration_date: 'date', encrypted_transaction_number: 'text', municipality_name: 'text', sm_lbldy: 'text', district_name: 'text', sm_lmntq: 'text', property_type: 'text', nw_l_qr: 'text', usage: 'text', lstkhdm: 'text', area_square_meters: 'int', price_per_square_meter: 'int', property_value: 'int', number_of_shares_2400: 'int', share_area: 'int', share_value: 'int' };
const metadata = { dataset_id: QATAR_DATASET, metas: { default: { publisher: 'Ministry of Justice', license_url: QATAR_LICENSE, modified: '2026-08-31T00:00:00Z' } }, fields: Object.entries(fieldTypes).map(([name, type]) => ({ name, type })) };
const place = { municipality_name: 'Test Municipality', sm_lbldy: 'بلدية اختبار', district_name: 'Test District', sm_lmntq: 'حي اختبار' };
const record = { ...place, encrypted_transaction_number: 'synthetic-1', registration_date: '2025-12-31', property_type: 'Two separate villas', nw_l_qr: 'أرض فضاء', usage: 'Residential', lstkhdm: 'سكني', area_square_meters: 100, price_per_square_meter: 1000, property_value: 100000, number_of_shares_2400: 2400, share_area: 100, share_value: 100000 };
const asset = { countryCode: 'QA', city: 'Test Municipality', district: 'Test District', propertyType: 'LAND', landArea: 100, landAreaUnit: 'M2' as const, address: 'PRIVATE ADDRESS', parcelIdentifier: 'PRIVATE PARCEL', purchasePrice: 12345 };
const now = () => new Date('2026-09-16T12:00:00Z');
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
function fixture(options: { metadata?: unknown; records?: unknown[]; latest?: string; total?: number } = {}) {
  return vi.fn<typeof fetch>(async input => {
    const url = new URL(String(input));
    if (url.href === QATAR_API) return json(options.metadata ?? metadata);
    const select = url.searchParams.get('select');
    if (select?.startsWith('max(')) return json({ total_count: 1, results: [{ last_date: options.latest ?? '2025-12-31T00:00:00Z' }] });
    if (url.searchParams.has('group_by')) return json({ total_count: 1, results: [place] });
    return json({ total_count: options.total ?? (options.records?.length ?? 1), results: options.records ?? [record] });
  });
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('live Qatar official source boundary', () => {
  it('fetches actual endpoint shapes while separating metadata age, observation age and currency', async () => {
    const fetcher = fixture();
    const result = await collectQatarPropertyContext(asset, { fetcher, now });
    expect(result.status).toBe('CONNECTED_REVIEW_REQUIRED');
    expect(result.latestObservationOn).toBe('2025-12-31');
    expect(result.metadataUpdatedAt).toBe('2026-08-31');
    expect(result.valuationEligible).toBe(false);
    expect(result.reasons).toContain('STALE_OBSERVATIONS');
    expect(result.records[0]).toMatchObject({ currency: null, reportedValue: 100000, reportedPricePerM2: 1000, propertyTypeAr: 'أرض فضاء', propertyType: 'Two separate villas', fullOwnership: true });
    for (const [input, options] of fetcher.mock.calls) {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://www.data.gov.qa');
      expect(url.href).not.toMatch(/PRIVATE|12345/);
      expect(options?.redirect).toBe('error');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      expect(options?.headers).toEqual({ Accept: 'application/json' });
    }
  });
  it('uses both municipality and district; unknown geography does not broaden the search', async () => {
    const fetcher = fixture();
    const report = await collectQatarPropertyContext({ ...asset, district: 'unknown' }, { fetcher, now });
    expect(report.status).toBe('INPUT_REQUIRED');
    expect(report.records).toEqual([]);
    expect(fetcher.mock.calls.every(([url]) => !new URL(String(url)).searchParams.has('where'))).toBe(true);
  });
  it('accepts normalized official Arabic location labels without inventing English translations', async () => {
    const result = await collectQatarPropertyContext({ ...asset, city: 'بلدية اختبار', district: 'حي اختبار' }, { fetcher: fixture(), now });
    expect(result.records).toHaveLength(1);
  });
  it('rejects changed license, identity and schema before reading transaction records', async () => {
    for (const invalid of [
      { ...metadata, dataset_id: 'other' },
      { ...metadata, metas: { default: { publisher: 'Other', license_url: QATAR_LICENSE } } },
      { ...metadata, metas: { default: { publisher: 'Ministry of Justice', license_url: 'unknown' } } },
      { ...metadata, fields: [] },
    ]) {
      const fetcher = fixture({ metadata: invalid });
      await expect(getQatarPropertyLocations(fetcher)).rejects.toThrow('SOURCE_');
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('deduplicates transactions and excludes foreign, future and impossible dates', async () => {
    const result = await collectQatarPropertyContext(asset, { fetcher: fixture({ records: [record, record, { ...record, encrypted_transaction_number: 'other', municipality_name: 'Other' }, { ...record, encrypted_transaction_number: 'future', registration_date: '2099-01-01' }, { ...record, encrypted_transaction_number: 'invalid', registration_date: '2025-02-30' }] }), now });
    expect(result.records).toHaveLength(1);
  });
  it('retains partial-share and invalid-money warnings without coercing strings into numbers', async () => {
    const result = await collectQatarPropertyContext(asset, { fetcher: fixture({ records: [{ ...record, number_of_shares_2400: 1200, property_value: '100000', price_per_square_meter: -1 }] }), now });
    expect(result.records[0]).toMatchObject({ fullOwnership: false, reportedValue: null, reportedPricePerM2: null, currency: null });
  });
  it('marks bounded sampling rather than claiming complete local-market coverage', async () => {
    const result = await collectQatarPropertyContext(asset, { fetcher: fixture({ total: 500 }), now });
    expect(result.sampleTruncated).toBe(true);
    expect(result.sampleTotal).toBe(500);
    expect(result.reasons).toContain('PARTIAL_SAMPLE');
  });
  it('rejects future dataset dates and bounded transport errors', async () => {
    await expect(collectQatarPropertyContext(asset, { fetcher: fixture({ latest: '2099-01-01' }), now })).rejects.toThrow('SOURCE_DATE_INVALID');
    await expect(readQatarPublicJson('metadata', {}, vi.fn(async () => new Response('', { status: 429 })))).rejects.toThrow('SOURCE_UNAVAILABLE');
    await expect(readQatarPublicJson('metadata', {}, vi.fn(async () => new Response('html', { headers: { 'content-type': 'text/html' } })))).rejects.toThrow('SOURCE_SCHEMA_CHANGED');
    await expect(readQatarPublicJson('metadata', {}, vi.fn(async () => new Response('x'.repeat(1_000_001), { headers: { 'content-type': 'application/json' } })))).rejects.toThrow('SOURCE_RESPONSE_TOO_LARGE');
  });
  it('does not allow connected historical records into valuation or a saved valuation payload', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now()); vi.stubGlobal('fetch', fixture());
    const analysis = await analyzeRealEstateAsset(asset, 'USD');
    expect(analysis.officialContext?.records).toHaveLength(1);
    expect(analysis.status).toBe('SOURCE_DATA_REVIEW_REQUIRED');
    expect(analysis.valuation).toBeNull();
    expect(analysis.evidence).toEqual([]);
    expect(analysis.evidenceCount).toBe(0);
  });
  it('reports transport failures separately from an empty connected dataset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('private transport detail'); }));
    const result = await analyzeRealEstateAsset(asset, 'USD');
    expect(result.officialContext?.status).toBe('UNAVAILABLE');
    expect(result.valuation).toBeNull();
    expect(JSON.stringify(result)).not.toContain('private transport detail');
  });
});
