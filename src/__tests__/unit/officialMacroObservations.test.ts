import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseOfficialRates } from '@/providers/intelligence/officialMacroObservations';
const source = { series: 'SOFR', url: 'https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json', sourceUrl: 'https://www.newyorkfed.org/markets/reference-rates/sofr' } as const;
const now = Date.parse('2026-09-19T12:00:00Z');
const row = (date: string, value: unknown = 3.5, type = 'SOFR') => ({ effectiveDate: date, percentRate: value, type });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('official economic observations', () => {
  it('sorts and deduplicates source periods without treating retrieval as the effective date', () => {
    const value = parseOfficialRates({ refRates: [row('2026-09-16', 3.25), row('2026-09-17', 3.5), row('2026-09-17', 3.5)] }, source, now);
    expect(value).toMatchObject({ value: 3.5, previous: 3.25, period: '2026-09-17', previousPeriod: '2026-09-16', unit: '%', retrievedAt: new Date(now).toISOString(), provider: 'New York Fed' });
    expect(value).not.toHaveProperty('forecast');
  });
  it.each([null, undefined, '', '3.5', false, [], NaN, Infinity])('rejects absent or malformed rate %s rather than producing zero', value => {
    expect(parseOfficialRates({ refRates: [{ ...row('2026-09-17'), percentRate: value }] }, source, now)).toBeNull();
  });
  it('preserves an actual published zero', () => {
    expect(parseOfficialRates({ refRates: [row('2026-09-17', 0)] }, source, now)?.value).toBe(0);
  });
  it('rejects old, future, rolled-over dates and the wrong series', () => {
    expect(parseOfficialRates({ refRates: [row('2026-08-17'), row('2026-09-20'), row('2026-02-30'), row('2026-09-17', 3, 'EFFR')] }, source, now)).toBeNull();
  });
  it('continues with SOFR when EFFR is denied and retains dated cache only within its lifetime', async () => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
    const fetch = vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(url.includes('/sofr/') ? JSON.stringify({ refRates: [row('2026-09-17')] }) : '{}', { status: url.includes('/sofr/') ? 200 : 403 })));
    vi.stubGlobal('fetch', fetch);
    const { loadOfficialMacroObservations } = await import('@/providers/intelligence/officialMacroObservations');
    const first = await loadOfficialMacroObservations(); expect(first).toHaveLength(1); expect(first[0].series).toBe('SOFR');
    expect(await loadOfficialMacroObservations()).toEqual(first); expect(fetch).toHaveBeenCalledTimes(2);
    vi.setSystemTime(now + 20 * 60_000); fetch.mockRejectedValue(new Error('temporary outage'));
    expect(await loadOfficialMacroObservations()).toEqual(first);
    vi.setSystemTime(now + 8 * 86_400_000); expect(await loadOfficialMacroObservations()).toEqual([]);
  });
});
