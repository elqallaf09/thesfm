import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentStatus, formatQuotePrice, parseSnapshot, sampleMetrics, snapshotPath } from '../../../apps/markets-tv-native/src/api';
const now = Date.parse('2026-11-06T21:00:00Z');
const q = { symbol: 'KFH.KW', name: 'KFH', nameAr: 'بيتك', price: .755, currency: 'KWD', source: 'Verified test source',
  observedAt: '2026-11-05T10:14:19Z', changePercent: .4, status: 'closed', changeBasis: 'session' };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('native TV public API contract', () => {
  it.each(['120', 'Fri, 06 Nov 2026 21:02:00 GMT'])('honours Retry-After %s during manual and cross-scene retries', async header => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': header } }))
      .mockResolvedValueOnce(Response.json({ scene: 'world', summary: [], quotes: [] }));
    vi.stubGlobal('fetch', fetch);
    const { readSnapshot } = await import('../../../apps/markets-tv-native/src/api');
    const signal = new AbortController().signal;
    await expect(readSnapshot('gulf', signal)).rejects.toMatchObject({ retryAfterMs: 120_000 });
    await expect(readSnapshot('world', signal)).rejects.toMatchObject({ retryAfterMs: 120_000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 120_001);
    expect((await readSnapshot('world', signal)).scene).toBe('world');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('requests exactly the existing public scenes and refuses cross-scene data', () => {
    expect(snapshotPath('gulf')).toBe('/api/tv/snapshot?group=gulf&scene=gulf&pageSize=10');
    expect(() => parseSnapshot({ scene: 'world', summary: [], quotes: [] }, 'gulf')).toThrow();
    expect(parseSnapshot({ scene: 'gulf', summary: [q], quotes: [] }, 'gulf').summary[0]).toMatchObject(q);
  });
  it('keeps unavailable readings absent instead of substituting zero or invented source evidence', () => {
    const snapshot = parseSnapshot({ scene: 'gulf', summary: [{ ...q, source: null }, { ...q, symbol: 'NBK.KW', observedAt: null }], quotes: [] }, 'gulf');
    expect(snapshot.summary.every(row => row.price === null)).toBe(true);
    expect(sampleMetrics(snapshot.summary, now)).toMatchObject({ total: 2, available: 0, comparable: 0, average: null });
  });
  it('preserves tiny crypto, forex precision and Kuwait fils without rounding a real price to zero', () => {
    expect(formatQuotePrice({ ...q, price: .0000123456 }, now)).toBe('0.0000123456');
    expect(formatQuotePrice({ ...q, symbol: 'EURUSD=X', currency: 'USD', price: 1.123456 }, now)).toBe('1.123456');
    expect(formatQuotePrice(q, now)).toBe('0.755');
    expect(sampleMetrics([q, { ...q, exchange: 'OTHER', currency: 'USD' }], now).total).toBe(2);
  });
  it('retains a dated close across the Gulf weekend and excludes stale or rolling changes from the brief', () => {
    const base = parseSnapshot({ scene: 'gulf', summary: [q], quotes: [] }, 'gulf').summary[0];
    expect(sampleMetrics([base, base], now)).toMatchObject({ total: 1, available: 1, comparable: 1, average: .4 });
    expect(currentStatus({ ...base, status: 'delayed' }, now)).toBe('stale');
    expect(sampleMetrics([{ ...base, status: 'delayed' }, { ...base, symbol: 'BTC/USDT', changeBasis: '24h' }], now).comparable).toBe(0);
  });
});
