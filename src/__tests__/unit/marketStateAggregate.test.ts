import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTraderMarketCatalog = vi.fn();
const getConfiguredProviderDescriptors = vi.fn();
const getFmpRuntimeStatus = vi.fn();
const createServerSupabaseAdmin = vi.fn();
const getPersistentCache = vi.fn();
const setPersistentCache = vi.fn();
const getProviderHealth = vi.fn();

vi.mock('@/lib/trader/marketCatalog', () => ({ getTraderMarketCatalog: (...args: unknown[]) => getTraderMarketCatalog(...args) }));
vi.mock('@/lib/market-news/registry', () => ({ getConfiguredProviderDescriptors: (...args: unknown[]) => getConfiguredProviderDescriptors(...args) }));
vi.mock('@/lib/trader/providers/fmpRuntime', () => ({ getFmpRuntimeStatus: (...args: unknown[]) => getFmpRuntimeStatus(...args) }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args) }));
vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: (...args: unknown[]) => getPersistentCache(...args),
  setPersistentCache: (...args: unknown[]) => setPersistentCache(...args),
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
      summary: { loadedSymbols: 13307, failedSymbols: 0, cachedSymbols: 13307, skippedDueToRateLimit: 0, fmpStatus: 'healthy', openbbStatus: 'unavailable' },
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
    createServerSupabaseAdmin.mockReset().mockReturnValue(null);
    getPersistentCache.mockReset().mockResolvedValue(null);
    setPersistentCache.mockReset().mockResolvedValue(undefined);
    getProviderHealth.mockReset().mockResolvedValue([]);
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
    expect(state).toEqual(persistedSnapshot);
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
      expect(twelveDataForex?.status).toBe('degraded');
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
