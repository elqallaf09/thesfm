import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetFxCacheForTests, getFxRate } from '@/lib/market/fxRates';

describe('FX last-known-good fallback', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    __resetFxCacheForTests();
  });

  it('returns the last verified rate as stale when the provider temporarily fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T00:00:00.000Z'));
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ rates: { KWD: 0.305 }, time_last_update_utc: '2026-07-18T00:00:00.000Z' }), { status: 200 }))
      .mockRejectedValueOnce(new Error('temporary provider failure'));

    const verified = await getFxRate('USD', 'KWD');
    expect(verified).toMatchObject({ available: true, stale: false, rate: 0.305 });

    vi.setSystemTime(new Date('2026-07-18T00:06:00.000Z'));
    const fallback = await getFxRate('USD', 'KWD');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fallback).toMatchObject({ available: true, stale: true, rate: 0.305 });
    expect(fallback.source).toContain('stale_cache');
  });
});
