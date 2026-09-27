import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getPersistentCache = vi.fn();
const setPersistentCache = vi.fn();
const createServerSupabaseAdmin = vi.fn();

vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: (...args: unknown[]) => getPersistentCache(...args),
  setPersistentCache: (...args: unknown[]) => setPersistentCache(...args),
}));
vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args),
}));

beforeEach(() => {
  vi.resetModules();
  getPersistentCache.mockReset().mockResolvedValue(null);
  setPersistentCache.mockReset().mockResolvedValue(undefined);
  createServerSupabaseAdmin.mockReset().mockReturnValue({
    rpc: vi.fn().mockResolvedValue({ data: new Date(Date.now() + 60_000).toISOString(), error: null }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('shared FMP cooldown', () => {
  it('keeps a configured but unobserved provider unknown, even when a cache marker exists', async () => {
    const { getFmpRuntimeStatus, markFmpCacheAvailable, markFmpSuccess } = await import('@/lib/trader/providers/fmpRuntime');

    expect(getFmpRuntimeStatus(true)).toMatchObject({ healthy: false, status: 'unknown' });
    markFmpCacheAvailable('catalog:cached');
    expect(getFmpRuntimeStatus(true)).toMatchObject({ healthy: false, status: 'unknown', cacheAvailable: true });

    markFmpSuccess();
    expect(getFmpRuntimeStatus(true)).toMatchObject({ healthy: true, status: 'healthy' });
  });

  it('uses a cooldown published by another server before issuing a provider request', async () => {
    const until = new Date(Date.now() + 60_000).toISOString();
    getPersistentCache.mockResolvedValue({ version: 1, until, reason: 'provider_rate_limited' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { FmpRateLimitError } = await import('@/lib/trader/providers/fmpRuntime');
    const { fmpQueuedFetch } = await import('@/lib/trader/providers/fmpRuntime.server');

    await expect(fmpQueuedFetch('https://financialmodelingprep.com/stable/quote/AAPL')).rejects.toBeInstanceOf(FmpRateLimitError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hydrates the local runtime status from a cooldown published by another server', async () => {
    const until = new Date(Date.now() + 60_000).toISOString();
    getPersistentCache.mockResolvedValue({ version: 1, until, reason: 'provider_rate_limited' });

    const { getFmpRuntimeStatus } = await import('@/lib/trader/providers/fmpRuntime');
    const { synchronizeFmpSharedCooldown } = await import('@/lib/trader/providers/fmpRuntime.server');
    await synchronizeFmpSharedCooldown();

    expect(getFmpRuntimeStatus(true)).toMatchObject({
      healthy: false,
      rateLimited: true,
      status: 'rate_limited',
      nextRetryAt: until,
    });
  });

  it('uses the database atomic maximum so a shorter response cannot reopen the provider early', async () => {
    const longerExistingUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const rpc = vi.fn().mockResolvedValue({ data: longerExistingUntil, error: null });
    createServerSupabaseAdmin.mockReturnValue({ rpc });

    const { markFmpRateLimited } = await import('@/lib/trader/providers/fmpRuntime.server');
    markFmpRateLimited(new Response(null, { headers: { 'retry-after': '1' } }));

    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));

    expect(rpc).toHaveBeenCalledWith('extend_trader_cache_cooldown', expect.objectContaining({
      p_cache_key: 'market_provider_cooldown:fmp',
      p_reason: 'provider_rate_limited',
    }));

    const { getFmpRuntimeStatus } = await import('@/lib/trader/providers/fmpRuntime');
    expect(getFmpRuntimeStatus(true)).toMatchObject({
      status: 'rate_limited',
      nextRetryAt: longerExistingUntil,
    });
  });
});
