import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRegionalDirectory, regionalQuoteIdentity } from '@/lib/market/regionalDirectory';

function payload(count = 110) {
  return { status: 'ok', data: Array.from({ length: count }, (_, i) => ({ symbol: String(1000 + i), name: `Company ${i}`, currency: 'SAR', mic_code: 'XSAU', type: 'Common Stock' })) };
}
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('regional listing identity', () => {
  it('excludes aliases, cross-market rows, wrong currencies and duplicate records without claiming full exchange coverage', () => {
    const valid = payload(1).data[0];
    const parsed = parseRegionalDirectory({ status: 'ok', data: [valid, valid, { ...valid, symbol: '1010.SABE' }, { ...valid, symbol: '1011', mic_code: 'XADS' }, { ...valid, symbol: '1012', currency: 'USD' }, { ...valid, symbol: '1013', type: 'ETF' }] }, 'saudi_tadawul');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ symbol: '1000', providerSymbol: 'TD:XSAU:1000', currency: 'SAR' });
    expect(parsed).toMatchObject({ sourceRecords: 6, excludedRecords: 5 });
    expect(regionalQuoteIdentity('TD:XCAI:EGS01041C010')).toMatchObject({ mic: 'XCAI', currency: 'EGP' });
    expect(regionalQuoteIdentity('TD:XNAS:AAPL')).toBeNull();
    expect(regionalQuoteIdentity('TD:XSAU:1010?apikey=secret')).toBeNull();
  });
  it('rejects a provider error body instead of treating it as an empty successful directory', () => {
    expect(() => parseRegionalDirectory({ status: 'error', code: 429 }, 'saudi_tadawul')).toThrow();
  });
});

describe('regional source resilience', () => {
  it('shares concurrent requests and retains the last successful directory after a short response', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-18T10:00:00Z'));
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(payload())).mockResolvedValueOnce(Response.json(payload(1)));
    vi.stubGlobal('fetch', fetch);
    const { getRegionalMarketDirectory } = await import('@/lib/server/regionalMarketDirectory');
    const first = getRegionalMarketDirectory('saudi_tadawul');
    expect(getRegionalMarketDirectory('saudi_tadawul')).toBe(first);
    const ready = await first;
    expect(ready).toMatchObject({ status: 'directory', lastSyncAt: '2026-09-18T10:00:00.000Z' });
    vi.setSystemTime(new Date('2026-09-19T10:00:01Z'));
    const saved = await getRegionalMarketDirectory('saudi_tadawul');
    expect(saved).toMatchObject({ status: 'snapshot', reason: 'invalid_response', lastSyncAt: ready.lastSyncAt });
    expect(saved.rows).toEqual(ready.rows);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('reports a rate limit with an unknown source total on a cold failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    const { getRegionalMarketDirectory } = await import('@/lib/server/regionalMarketDirectory');
    expect(await getRegionalMarketDirectory('qatar_qse')).toMatchObject({ rows: [], status: 'unavailable', reason: 'rate_limited', sourceRecords: null, lastSyncAt: null });
  });
});
