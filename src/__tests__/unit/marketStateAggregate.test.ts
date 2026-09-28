import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTraderMarketCatalog = vi.fn();
const getConfiguredProviderDescriptors = vi.fn();
const getFmpRuntimeStatus = vi.fn();
const synchronizeFmpSharedCooldown = vi.fn();
const createServerSupabaseAdmin = vi.fn();
const getPersistentCache = vi.fn();
const setPersistentCache = vi.fn();
const getProviderHealth = vi.fn();
const acquireScanLock = vi.fn();
const releaseScanLock = vi.fn();

vi.mock('@/lib/trader/marketCatalog', () => ({ getTraderMarketCatalog: (...args: unknown[]) => getTraderMarketCatalog(...args) }));
vi.mock('@/lib/market-news/registry', () => ({ getConfiguredProviderDescriptors: (...args: unknown[]) => getConfiguredProviderDescriptors(...args) }));
vi.mock('@/lib/trader/providers/fmpRuntime', () => ({ getFmpRuntimeStatus: (...args: unknown[]) => getFmpRuntimeStatus(...args) }));
vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({ synchronizeFmpSharedCooldown: (...args: unknown[]) => synchronizeFmpSharedCooldown(...args) }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args) }));
vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: (...args: unknown[]) => getPersistentCache(...args),
  setPersistentCache: (...args: unknown[]) => setPersistentCache(...args),
}));
vi.mock('@/lib/trader/scannerLock', () => ({
  acquireScanLock: (...args: unknown[]) => acquireScanLock(...args),
  releaseScanLock: (...args: unknown[]) => releaseScanLock(...args),
}));
// Never let the real live-quote health probe run in tests — no network calls in unit tests.
vi.mock('@/lib/market/marketDataProviders', () => ({ getProviderHealth: (...args: unknown[]) => getProviderHealth(...args) }));

const baseCapability = {
  configured: true,
  healthy: true,
  status: 'healthy',
  rateLimited: false,
  lastSuccessfulFetch: '2026-07-10T12:00:00.000Z',
  lastError: null,
  nextRetryAt: null,
  supportsQuotes: true,
  supportsTechnicalAnalysis: false,
  supportsEarnings: false,
  supportsDividends: false,
  supportsIpos: false,
  supportsEconomicCalendar: false,
};

function catalogFixture(overrides: { fmp?: Partial<typeof baseCapability>; yahoo?: Partial<typeof baseCapability> } = {}) {
  return {
    markets: [],
    symbols: [],
    diagnostics: {
      provider: 'fmp',
      reason: null,
      totalSymbolsDiscovered: 13307,
      totalSymbolsLoaded: 13307,
      failedSymbols: [],
      unsupportedSymbols: [],
      providerLatencyMs: { fmp: 120 },
      cacheStatus: 'hit',
      summary: { loadedSymbols: 13307, failedSymbols: 0, cachedSymbols: 13307, skippedDueToRateLimit: 0, fmpStatus: 'healthy' },
      sources: {},
      generatedAt: '2026-07-10T12:00:00.000Z',
    },
    capabilityMatrix: {
      fmp: { ...baseCapability, ...overrides.fmp },
      yahoo: { ...baseCapability, ...overrides.yahoo },
    },
  };
}

describe('getMarketSystemState', () => {
  beforeEach(() => {
    vi.resetModules();
    getTraderMarketCatalog.mockReset();
    getConfiguredProviderDescriptors.mockReset().mockReturnValue([]);
    getFmpRuntimeStatus.mockReset().mockReturnValue({
      configured: true, healthy: true, rateLimited: false, status: 'healthy',
      lastSuccessfulFetch: null, lastError: null, lastErrorAt: null, rateLimitedUntil: null,
      nextRetryAt: null, cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 0, consecutiveRateLimitCount: 0,
    });
    synchronizeFmpSharedCooldown.mockReset().mockResolvedValue(undefined);
    createServerSupabaseAdmin.mockReset().mockReturnValue(null);
    getPersistentCache.mockReset().mockResolvedValue(null);
    setPersistentCache.mockReset().mockResolvedValue(undefined);
    getProviderHealth.mockReset().mockResolvedValue([]);
    acquireScanLock.mockReset().mockResolvedValue({ acquired: true });
    releaseScanLock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports overall degraded (not disconnected) when the provider is connected but one capability is unavailable', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture({ yahoo: { status: 'error', healthy: false, supportsQuotes: false } }));
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.overall).not.toBe('disconnected');
    expect(['connected', 'degraded']).toContain(state.overall);
  });

  it('preserves the official DFM disclosure provider identity instead of collapsing it into generic RSS', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    getConfiguredProviderDescriptors.mockReturnValue([{
      id: 'official-dfm-disclosures',
      enabled: true,
      configured: true,
    }]);

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });

    expect(state.capabilityMatrix).toContainEqual(expect.objectContaining({
      provider: 'official-dfm-disclosures',
      capability: 'news',
      status: 'unknown',
    }));
    expect(state.providerProfiles).toContainEqual(expect.objectContaining({
      provider: 'official-dfm-disclosures',
      role: 'news_only',
    }));
  });

  it('applies the shared FMP cooldown before deriving the capability matrix', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    getFmpRuntimeStatus.mockReturnValue({
      configured: true, healthy: false, rateLimited: true, status: 'rate_limited',
      lastSuccessfulFetch: null, lastError: 'provider_rate_limited', lastErrorAt: null,
      rateLimitedUntil: '2026-07-10T12:05:00.000Z', nextRetryAt: '2026-07-10T12:05:00.000Z',
      cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 0, consecutiveRateLimitCount: 1,
    });

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });

    expect(synchronizeFmpSharedCooldown).toHaveBeenCalledTimes(1);
    expect(state.capabilityMatrix).toContainEqual(expect.objectContaining({
      provider: 'fmp',
      capability: 'shariah_financials',
      status: 'rate_limited',
    }));
  });

  it('reports overall disconnected only when core capabilities (symbols + quotes) are all unusable', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture({
      fmp: { status: 'error', healthy: false, configured: false, supportsQuotes: true },
      yahoo: { status: 'error', healthy: false, configured: false, supportsQuotes: true },
    }));
    getFmpRuntimeStatus.mockReturnValue({
      configured: false, healthy: false, rateLimited: false, status: 'not_configured',
      lastSuccessfulFetch: null, lastError: null, lastErrorAt: null, rateLimitedUntil: null,
      nextRetryAt: null, cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 0, consecutiveRateLimitCount: 0,
    });
    const catalogAllFailed = catalogFixture({
      fmp: { status: 'error', healthy: false, configured: false, supportsQuotes: true },
      yahoo: { status: 'error', healthy: false, configured: false, supportsQuotes: true },
    });
    catalogAllFailed.diagnostics.summary.fmpStatus = 'error';
    getTraderMarketCatalog.mockResolvedValue(catalogAllFailed);

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.overall).toBe('disconnected');
  });

  it('never fabricates liveQuoteAvailable from the discovered catalog count (13,307 discovered != 13,307 live quotes)', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.catalog.discovered).toBe(13307);
    expect(state.catalog.liveQuoteAvailable).toBeNull();
  });

  it('uses a recent persisted snapshot on a cold start instead of repeating provider probes', async () => {
    const now = new Date().toISOString();
    const persistedSnapshot = {
      generatedAt: now,
      overall: 'connected',
      providers: {},
      capabilityMatrix: [],
      providerProfiles: [],
      configuration: [],
      featuresSucceeded: ['quotes'],
      featuresDegraded: [],
      featuresFailed: [],
      catalog: { discovered: 100, metadataAvailable: 100, liveQuoteAvailable: null, delayedQuoteAvailable: 100, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: now },
      lastSynchronizedAt: now,
      delivery: { source: 'live' as const, cached: false, delayed: false, reason: null },
    };
    getPersistentCache.mockResolvedValue(persistedSnapshot);

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState();

    expect(getTraderMarketCatalog).not.toHaveBeenCalled();
    expect(getProviderHealth).not.toHaveBeenCalled();
    expect(state.delivery).toEqual({
      source: 'persistent_cache',
      cached: true,
      delayed: false,
      reason: 'aggregate_persistent_cache_hit',
    });
  });

  it('overlays an active shared FMP cooldown onto a fresh persisted snapshot', async () => {
    const now = new Date().toISOString();
    getFmpRuntimeStatus.mockReturnValue({
      configured: true, healthy: false, rateLimited: true, status: 'rate_limited',
      lastSuccessfulFetch: null, lastError: 'provider_rate_limited', lastErrorAt: now,
      rateLimitedUntil: '2026-07-10T12:05:00.000Z', nextRetryAt: '2026-07-10T12:05:00.000Z',
      cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 1, consecutiveRateLimitCount: 1,
    });
    getPersistentCache.mockResolvedValue({
      generatedAt: now,
      overall: 'connected',
      providers: { fmp: { status: 'connected', configured: true, healthy: true, latencyMs: null } },
      capabilityMatrix: [
        { provider: 'fmp', capability: 'symbols', status: 'connected', configured: true, healthy: true, lastSuccessAt: now, lastErrorAt: null, lastErrorReason: null, rateLimitedUntil: null, nextRetryAt: null, latencyMs: null },
        { provider: 'fmp', capability: 'dividends', status: 'connected', configured: true, healthy: true, lastSuccessAt: now, lastErrorAt: null, lastErrorReason: null, rateLimitedUntil: null, nextRetryAt: null, latencyMs: null },
      ],
      providerProfiles: [],
      configuration: [],
      featuresSucceeded: ['symbols', 'dividends'],
      featuresDegraded: [],
      featuresFailed: [],
      catalog: { discovered: 100, metadataAvailable: 100, liveQuoteAvailable: null, delayedQuoteAvailable: 100, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: now },
      lastSynchronizedAt: now,
      delivery: { source: 'live', cached: false, delayed: false, reason: null },
    });

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState();

    expect(synchronizeFmpSharedCooldown).toHaveBeenCalledTimes(1);
    expect(getTraderMarketCatalog).not.toHaveBeenCalled();
    expect(state.delivery?.source).toBe('persistent_cache');
    expect(state.providers.fmp).toMatchObject({ status: 'rate_limited', healthy: false });
    expect(state.capabilityMatrix.filter(cell => cell.provider === 'fmp')).toEqual([
      expect.objectContaining({ status: 'rate_limited', healthy: false, rateLimitedUntil: '2026-07-10T12:05:00.000Z' }),
      expect.objectContaining({ status: 'rate_limited', healthy: false, rateLimitedUntil: '2026-07-10T12:05:00.000Z' }),
    ]);
    expect(state.featuresDegraded).toEqual(expect.arrayContaining(['symbols', 'dividends']));
    expect(state.overall).toBe('degraded');
  });

  it('overlays an active shared FMP cooldown on a memory-cache hit without re-running provider probes', async () => {
    let cooldownActive = false;
    getFmpRuntimeStatus.mockImplementation(() => cooldownActive
      ? {
          configured: true, healthy: false, rateLimited: true, status: 'rate_limited',
          lastSuccessfulFetch: null, lastError: 'provider_rate_limited', lastErrorAt: '2026-07-10T12:00:30.000Z',
          rateLimitedUntil: '2026-07-10T12:05:00.000Z', nextRetryAt: '2026-07-10T12:05:00.000Z',
          cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 1, consecutiveRateLimitCount: 1,
        }
      : {
          configured: true, healthy: true, rateLimited: false, status: 'healthy',
          lastSuccessfulFetch: null, lastError: null, lastErrorAt: null, rateLimitedUntil: null,
          nextRetryAt: null, cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 0, consecutiveRateLimitCount: 0,
        });
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    await getMarketSystemState({ forceFresh: true });
    cooldownActive = true;
    const state = await getMarketSystemState();

    expect(synchronizeFmpSharedCooldown).toHaveBeenCalledTimes(2);
    expect(getTraderMarketCatalog).toHaveBeenCalledTimes(1);
    expect(getProviderHealth).toHaveBeenCalledTimes(1);
    expect(state.delivery?.source).toBe('memory_cache');
    expect(state.providers.fmp).toMatchObject({ status: 'rate_limited', healthy: false });
    expect(state.capabilityMatrix.filter(cell => cell.provider === 'fmp')).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'rate_limited', healthy: false, nextRetryAt: '2026-07-10T12:05:00.000Z' }),
    ]));
  });

  it('does not treat an older persisted snapshot as fresh system health', async () => {
    const old = new Date(Date.now() - 30_001).toISOString();
    getPersistentCache.mockResolvedValue({ generatedAt: old });
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    await getMarketSystemState();

    expect(getTraderMarketCatalog).toHaveBeenCalledTimes(1);
  });

  it('returns a delayed stale snapshot instead of duplicating a refresh held by another instance', async () => {
    const old = new Date(Date.now() - 30_001).toISOString();
    const persistedSnapshot = {
      generatedAt: old,
      overall: 'connected',
      providers: {},
      capabilityMatrix: [],
      providerProfiles: [],
      configuration: [],
      featuresSucceeded: ['quotes'],
      featuresDegraded: [],
      featuresFailed: [],
      catalog: { discovered: 100, metadataAvailable: 100, liveQuoteAvailable: null, delayedQuoteAvailable: 100, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: old },
      lastSynchronizedAt: old,
      delivery: { source: 'live' as const, cached: false, delayed: false, reason: null },
    };
    getPersistentCache.mockResolvedValue(persistedSnapshot);
    acquireScanLock.mockResolvedValue({ acquired: false, existing: { runId: 'other-instance', lockedAt: new Date().toISOString() } });

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState();

    expect(getTraderMarketCatalog).not.toHaveBeenCalled();
    expect(getProviderHealth).not.toHaveBeenCalled();
    expect(state.delivery).toEqual({
      source: 'persistent_cache',
      cached: true,
      delayed: true,
      reason: 'aggregate_refresh_in_progress',
    });
  });

  it('fails open to live provider probes when the optional distributed refresh lock is unavailable', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    acquireScanLock.mockResolvedValue({ acquired: false, unavailable: true });

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState();

    expect(getTraderMarketCatalog).toHaveBeenCalledTimes(1);
    expect(getProviderHealth).toHaveBeenCalledTimes(1);
    expect(state.delivery).toMatchObject({ source: 'live', cached: false, delayed: false });
  });

  it('fails open to live provider probes when acquiring the distributed refresh lock throws', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    acquireScanLock.mockRejectedValue(new Error('lock store unreachable'));

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState();

    expect(getTraderMarketCatalog).toHaveBeenCalledTimes(1);
    expect(state.delivery).toMatchObject({ source: 'live', cached: false, delayed: false });
  });

  it('bypasses a fresh persisted snapshot when an administrator requests forceFresh', async () => {
    getPersistentCache.mockResolvedValue({ generatedAt: new Date().toISOString() });
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    await getMarketSystemState({ forceFresh: true });

    expect(getTraderMarketCatalog).toHaveBeenCalledTimes(1);
    expect(acquireScanLock).not.toHaveBeenCalled();
  });

  it('falls back to the last persisted snapshot instead of a blank state when the live aggregation throws (malformed provider response)', async () => {
    getTraderMarketCatalog.mockRejectedValue(new Error('malformed upstream response'));
    const persistedSnapshot = {
      generatedAt: '2026-07-10T11:00:00.000Z',
      overall: 'connected',
      providers: {},
      capabilityMatrix: [],
      featuresSucceeded: ['quotes'],
      featuresDegraded: [],
      featuresFailed: [],
      catalog: { discovered: 100, metadataAvailable: 100, liveQuoteAvailable: null, delayedQuoteAvailable: null, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: null },
      lastSynchronizedAt: '2026-07-10T11:00:00.000Z',
    };
    getPersistentCache.mockResolvedValue(persistedSnapshot);

    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state).toMatchObject({
      ...persistedSnapshot,
      delivery: {
        source: 'persistent_cache',
        cached: true,
        delayed: true,
        reason: 'live_aggregation_failed',
      },
    });
  });

  it('falls back to an explicit unknown state (never throws to the caller) when there is no catalog and no persisted snapshot', async () => {
    getTraderMarketCatalog.mockRejectedValue(new Error('total outage'));
    getPersistentCache.mockResolvedValue(null);
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.overall).toBe('unknown');
    expect(state.featuresFailed.length).toBeGreaterThan(0);
  });

  it('attaches providerProfiles and (admin-shaped, non-null) configuration to every returned state', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(Array.isArray(state.providerProfiles)).toBe(true);
    expect(state.providerProfiles.length).toBeGreaterThan(0);
    expect(state.configuration).not.toBeNull();
    expect(state.configuration).toHaveLength(7);
  });

  it('derives a role for every provider profile it returns', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    const roles = ['primary', 'secondary', 'fallback', 'discovery_only', 'news_only', 'metadata_only'];
    for (const profile of state.providerProfiles) {
      expect(roles).toContain(profile.role);
    }
  });

  describe('getProviderHealth() wiring for the 5 previously bare-boolean providers', () => {
    const previousTwelveDataKey = process.env.TWELVE_DATA_API_KEY;

    afterEach(() => {
      if (previousTwelveDataKey === undefined) delete process.env.TWELVE_DATA_API_KEY;
      else process.env.TWELVE_DATA_API_KEY = previousTwelveDataKey;
    });

    it('uses the live getProviderHealth() result for Twelve Data instead of the bare "is the key set" check when a live result is available', async () => {
      delete process.env.TWELVE_DATA_API_KEY; // bare-boolean check alone would say "misconfigured"
      getProviderHealth.mockResolvedValue([{ provider: 'twelve_data', configured: true, status: 'degraded' }]);
      getTraderMarketCatalog.mockResolvedValue(catalogFixture());
      const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
      const state = await getMarketSystemState({ forceFresh: true });
      const twelveDataForex = state.capabilityMatrix.find(cell => cell.provider === 'twelvedata' && cell.capability === 'forex');
      // A successful quote probe establishes the quote path only; Forex has
      // not been measured and must not inherit that success/degradation.
      expect(twelveDataForex?.status).toBe('unknown');
    });

    it('falls back to the cheap configured-key check when getProviderHealth() times out or throws (never blocks aggregation)', async () => {
      delete process.env.TWELVE_DATA_API_KEY;
      getProviderHealth.mockRejectedValue(new Error('network unreachable'));
      getTraderMarketCatalog.mockResolvedValue(catalogFixture());
      const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
      const state = await getMarketSystemState({ forceFresh: true });
      const twelveDataForex = state.capabilityMatrix.find(cell => cell.provider === 'twelvedata' && cell.capability === 'forex');
      expect(twelveDataForex?.status).toBe('misconfigured');
    });
  });
});
