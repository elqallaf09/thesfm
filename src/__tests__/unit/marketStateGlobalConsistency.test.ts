import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTraderMarketCatalog = vi.fn();
const getConfiguredProviderDescriptors = vi.fn();
const getFmpRuntimeStatus = vi.fn();
const createServerSupabaseAdmin = vi.fn();
const getPersistentCache = vi.fn();
const setPersistentCache = vi.fn();

vi.mock('@/lib/trader/marketCatalog', () => ({ getTraderMarketCatalog: (...args: unknown[]) => getTraderMarketCatalog(...args) }));
vi.mock('@/lib/market-news/registry', () => ({ getConfiguredProviderDescriptors: (...args: unknown[]) => getConfiguredProviderDescriptors(...args) }));
vi.mock('@/lib/trader/providers/fmpRuntime', () => ({ getFmpRuntimeStatus: (...args: unknown[]) => getFmpRuntimeStatus(...args) }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args) }));
vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: (...args: unknown[]) => getPersistentCache(...args),
  setPersistentCache: (...args: unknown[]) => setPersistentCache(...args),
}));

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

function catalogFixture(fmp: Partial<typeof baseCapability> = {}, yahoo: Partial<typeof baseCapability> = {}, fmpStatus = 'healthy') {
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
      summary: { loadedSymbols: 13307, failedSymbols: 0, cachedSymbols: 13307, skippedDueToRateLimit: 0, fmpStatus, openbbStatus: 'unavailable' },
      sources: {},
      generatedAt: '2026-07-10T12:00:00.000Z',
    },
    capabilityMatrix: {
      fmp: { ...baseCapability, ...fmp },
      yahoo: { ...baseCapability, ...yahoo },
    },
  };
}

describe('market system state — no contradictory combinations (the core bug from the problem statement)', () => {
  beforeEach(() => {
    vi.resetModules();
    getConfiguredProviderDescriptors.mockReset().mockReturnValue([]);
    getFmpRuntimeStatus.mockReset().mockReturnValue({
      configured: true, healthy: true, rateLimited: false, status: 'healthy',
      lastSuccessfulFetch: null, lastError: null, lastErrorAt: null, rateLimitedUntil: null,
      nextRetryAt: null, cacheAvailable: false, supportedFeatures: [], skippedDueToRateLimit: 0, consecutiveRateLimitCount: 0,
    });
    createServerSupabaseAdmin.mockReset().mockReturnValue(null);
    getPersistentCache.mockReset().mockResolvedValue(null);
    setPersistentCache.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('never reports overall "connected" while any capability is in featuresFailed', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture({}, { status: 'error', healthy: false, supportsQuotes: false }));
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    if (state.overall === 'connected') {
      expect(state.featuresFailed).toEqual([]);
    }
  });

  it('never reports overall "disconnected" unless BOTH symbols and quotes are actually unusable', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture({}, { status: 'error', healthy: false, supportsQuotes: false }));
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    // FMP (symbols) is healthy in this fixture — only Yahoo (one quotes provider) failed — so the
    // system as a whole must never read as fully disconnected.
    expect(state.overall).not.toBe('disconnected');
  });

  it('a fully-healthy fixture never simultaneously reports any feature as failed or degraded', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.overall).toBe('connected');
    expect(state.featuresFailed).toEqual([]);
    expect(state.featuresDegraded).toEqual([]);
  });

  it('catalog.discovered and catalog.liveQuoteAvailable are never asserted equal unless a live sample was actually measured', async () => {
    getTraderMarketCatalog.mockResolvedValue(catalogFixture());
    const { getMarketSystemState } = await import('@/lib/market-state/aggregateMarketState');
    const state = await getMarketSystemState({ forceFresh: true });
    expect(state.catalog.discovered).toBeGreaterThan(0);
    expect(state.catalog.liveQuoteAvailable).not.toBe(state.catalog.discovered);
  });
});
