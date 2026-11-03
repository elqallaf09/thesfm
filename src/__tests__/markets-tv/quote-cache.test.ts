import { AsyncLocalStorage } from 'node:async_hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { WorkStore } from 'next/dist/server/app-render/work-async-storage.external';

const now = Date.parse('2026-11-03T09:00:00Z');
const quote: TvQuote = { symbol: 'ASML.AS', name: 'ASML', nameAr: 'ASML', price: 100, currency: 'EUR', changePercent: 1,
  source: 'Verified test source', observedAt: new Date(now).toISOString(), receivedAt: new Date(now).toISOString(),
  exchange: 'TD_XAMS', country: 'NL', status: 'delayed', delayType: 'delayed' };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubGlobal('AsyncLocalStorage', AsyncLocalStorage); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

// Exercise Next's real cache implementation against a test-only storage adapter.
// The adapter stores bytes; Next owns hits, revalidation and failed-refresh retention.
async function fixture() {
  const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external');
  const { cachedTvQuote } = await import('@/lib/server/markets-tv/quoteCache');
  const entries = new Map<string, { value: unknown; savedAt: number }>();
  const incrementalCache = {
    generateSimpleCacheKey: async (key: string) => key,
    get: async (key: string, options: { revalidate: number }) => {
      const entry = entries.get(key);
      return entry ? { value: entry.value, isStale: Date.now() - entry.savedAt > options.revalidate * 1000 } : null;
    },
    set: async (key: string, value: unknown) => { entries.set(key, { value, savedAt: Date.now() }); },
  };
  const read = async (key: string, load: () => Promise<TvQuote>) => {
    const store = { incrementalCache, pendingRevalidates: {} } as unknown as WorkStore;
    return workAsyncStorage.run(store, async () => {
      const result = await cachedTvQuote(key, load);
      await Promise.all(Object.values(store.pendingRevalidates || {}));
      return result;
    });
  };
  return { read, entries };
}

describe('shared verified TV observations', () => {
  it('reuses one listing across independent requests instead of spending credits per scene', async () => {
    const { read } = await fixture(), load = vi.fn().mockResolvedValue(quote);
    expect(await read('ASML:XAMS:EUR', load)).toEqual(quote);
    vi.setSystemTime(now + 60_000);
    expect(await read('ASML:XAMS:EUR', load)).toEqual(quote);
    expect(load).toHaveBeenCalledTimes(1);
    await read('ASML:XNAS:USD', load);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('retains price and original clocks after quota failure, then recovers without a reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { read } = await fixture();
    const load = vi.fn().mockResolvedValueOnce(quote).mockResolvedValueOnce({ ...quote, price: null, issue: 'rate_limited' })
      .mockResolvedValue({ ...quote, price: 102, receivedAt: new Date(now + 360_000).toISOString() });
    await read('ASML:XAMS:EUR', load);
    vi.setSystemTime(now + 320_000);
    expect(await read('ASML:XAMS:EUR', load)).toMatchObject({ price: 100, status: 'stale', observedAt: quote.observedAt, receivedAt: quote.receivedAt });
    vi.setSystemTime(now + 360_000);
    await read('ASML:XAMS:EUR', load);
    expect(await read('ASML:XAMS:EUR', load)).toMatchObject({ price: 102, status: 'delayed' });
    expect(load).toHaveBeenCalledTimes(3);
  });
  it('does not save an empty initial response or poison later recovery', async () => {
    const { read, entries } = await fixture();
    const missing = { ...quote, price: null, issue: 'rate_limited' as const };
    const load = vi.fn().mockResolvedValueOnce(missing).mockResolvedValue(quote);
    expect(await read('ASML:XAMS:EUR', load)).toEqual(missing);
    expect(entries.size).toBe(0);
    expect(await read('ASML:XAMS:EUR', load)).toEqual(quote);
    expect(entries.size).toBe(1);
  });
  it('keeps a verified market close valid even if the original receive time is old', async () => {
    const { read } = await fixture();
    const closing = { ...quote, receivedAt: new Date(now - 3_600_000).toISOString(), status: 'closed' as const, delayType: 'eod' };
    expect(await read('ASML:XAMS:EUR', async () => closing)).toMatchObject({ status: 'closed', receivedAt: closing.receivedAt });
  });
  it.each([null, 'invalid', new Date(now + 3_600_000).toISOString()])('does not replace a dated price with an unverified timestamp (%s)', async observedAt => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { read } = await fixture();
    const load = vi.fn().mockResolvedValueOnce(quote).mockResolvedValue({ ...quote, price: 102, observedAt });
    await read('ASML:XAMS:EUR', load);
    vi.setSystemTime(now + 320_000);
    await read('ASML:XAMS:EUR', load);
    expect(await read('ASML:XAMS:EUR', load)).toMatchObject({ price: 100, observedAt: quote.observedAt, status: 'stale' });
  });
});
