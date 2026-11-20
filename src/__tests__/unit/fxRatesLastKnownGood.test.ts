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

  it.each([{}, { updated_at: 'invalid date' }])('retains unknown source time instead of using fetch time: %j', async time => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ base_code: 'USD', rates: { KWD: 0.305 }, ...time })));
    expect(await getFxRate('USD', 'KWD')).toMatchObject({ available: true, rate: 0.305, identityVerified: true, lastUpdated: null });
  });

  it('keeps legacy payloads available but does not claim their currency pair is verified', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ rates: { KWD: 0.305 }, updated_at: '2026-11-19T12:00:00Z' })));
    expect(await getFxRate('USD', 'KWD')).toMatchObject({ available: true, identityVerified: false });
  });

  it.each([{ base_code: 'EUR', rates: { KWD: 0.305 } }, { from: 'USD', to: 'EUR', rate: 0.305 }])('rejects explicit mismatched pair evidence: %j', async payload => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload)));
    expect(await getFxRate('USD', 'KWD')).toMatchObject({ available: false, rate: null, error: 'FX_PAIR_MISMATCH' });
  });
});
