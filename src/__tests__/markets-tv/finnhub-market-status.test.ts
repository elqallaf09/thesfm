import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const now = Date.parse('2026-10-28T05:15:00Z');
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('FINNHUB_API_KEY', 'test-only'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('source-reported US market closure', () => {
  it('coalesces a fresh exchange state and does not replace price observation timestamps', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ exchange: 'US', isOpen: false, t: now / 1000 })); vi.stubGlobal('fetch', fetch);
    const { finnhubUsMarketOpen } = await import('@/lib/server/markets-tv/finnhubMarketStatus');
    expect(await Promise.all([finnhubUsMarketOpen(), finnhubUsMarketOpen()])).toEqual([false, false]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const address = new URL(fetch.mock.calls[0][0]); expect(address.pathname).toBe('/api/v1/stock/market-status');
    expect(address.searchParams.get('exchange')).toBe('US');
  });
  it.each([
    { exchange: 'L', isOpen: false, t: now / 1000 },
    { exchange: 'US', isOpen: false, t: now / 1000 - 3600 },
    { exchange: 'US', isOpen: false },
    { exchange: 'US', isOpen: 'false', t: now / 1000 },
  ])('does not infer closure from an unverifiable response %#', async payload => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(payload)));
    const { finnhubUsMarketOpen } = await import('@/lib/server/markets-tv/finnhubMarketStatus');
    expect(await finnhubUsMarketOpen()).toBeNull();
  });
  it('backs off a denied market-state endpoint without changing quote availability', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 })); vi.stubGlobal('fetch', fetch);
    const { finnhubUsMarketOpen } = await import('@/lib/server/markets-tv/finnhubMarketStatus');
    expect(await finnhubUsMarketOpen()).toBeNull(); vi.setSystemTime(now + 60_000);
    expect(await finnhubUsMarketOpen()).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
