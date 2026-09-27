import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMarketSystemState = vi.fn();
const getTraderMarketCatalog = vi.fn();
const getTraderProviderStatus = vi.fn();
const getFmpRuntimeStatus = vi.fn();
const synchronizeFmpSharedCooldown = vi.fn();
const rateLimitRequest = vi.fn();

vi.mock('@/lib/market-state/aggregateMarketState', () => ({
  getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args),
}));
vi.mock('@/lib/trader/marketCatalog', () => ({
  clearTraderMarketCatalogCache: vi.fn(),
  getTraderMarketCatalog: (...args: unknown[]) => getTraderMarketCatalog(...args),
}));
vi.mock('@/lib/trader/marketQuotes', () => ({ clearTraderQuoteCache: vi.fn() }));
vi.mock('@/lib/trader/providers/providerStatus', () => ({
  getTraderProviderStatus: (...args: unknown[]) => getTraderProviderStatus(...args),
}));
vi.mock('@/lib/trader/providers/fmpRuntime', () => ({
  clearFmpRuntimeCacheMarkers: vi.fn(),
  getFmpRuntimeStatus: (...args: unknown[]) => getFmpRuntimeStatus(...args),
  resetFmpRateLimitCooldown: vi.fn(),
}));
vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({
  synchronizeFmpSharedCooldown: (...args: unknown[]) => synchronizeFmpSharedCooldown(...args),
}));
vi.mock('@/lib/server/adminApiRoute', () => ({ createAdminApiRoute: vi.fn(() => vi.fn()) }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: (...args: unknown[]) => rateLimitRequest(...args) }));

function capability(overrides: Record<string, unknown> = {}) {
  return {
    configured: false,
    healthy: false,
    supportsQuotes: false,
    supportsTechnicalAnalysis: false,
    supportsEarnings: false,
    supportsDividends: false,
    supportsIpos: false,
    supportsEconomicCalendar: false,
    status: 'unknown',
    rateLimited: false,
    lastSuccessfulFetch: null,
    lastError: null,
    nextRetryAt: null,
    ...overrides,
  };
}

function catalogFixture(capabilityMatrix: Record<string, Record<string, unknown>>) {
  return {
    symbols: [],
    diagnostics: {
      provider: 'fmp',
      reason: null,
      totalSymbolsDiscovered: 0,
      totalSymbolsLoaded: 0,
      failedSymbols: [],
      unsupportedSymbols: [],
      providerLatencyMs: {},
      cacheStatus: 'miss',
      summary: {
        cachedSymbols: 0,
        skippedDueToRateLimit: 0,
        fmpStatus: 'not_configured',
      },
    },
    capabilityMatrix,
  };
}

function providerStatusFixture() {
  const feature = (provider: string | null, configured: boolean) => ({
    configured,
    provider,
    status: configured ? 'unknown' : 'not_configured',
    resultCount: null,
    lastUpdated: null,
    lastSuccessfulUpdate: null,
    failureReason: configured ? null : 'provider_not_configured',
    supportedProviders: provider ? [provider] : [],
    supportedFeatures: [],
  });

  return {
    features: {
      earnings: feature('finnhub', true),
      dividends: feature('finnhub', true),
      ipos: feature(null, false),
      economic: feature('tradingeconomics', true),
      prices: feature('yahoo', true),
      news: feature('multi-source', true),
    },
    dataProvider: {
      configured: true,
      active: 'yahoo',
      provider: 'yahoo',
      status: 'unknown',
      supportedFeatures: ['prices'],
      lastUpdated: null,
      resultCount: null,
      failureReason: null,
    },
  };
}

function stateFixture(statuses: Record<string, 'unknown' | 'rate_limited'>) {
  const entries = Object.entries(statuses).map(([provider, status]) => ({
    provider,
    status,
    configured: true,
    healthy: false,
    latencyMs: null,
  }));

  return {
    generatedAt: '2026-09-27T04:00:00.000Z',
    overall: 'degraded',
    providers: Object.fromEntries(entries.map(entry => [entry.provider, entry])),
    capabilityMatrix: entries.map(entry => ({
      ...entry,
      capability: 'quotes',
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorReason: null,
      rateLimitedUntil: entry.status === 'rate_limited' ? '2026-09-27T04:05:00.000Z' : null,
      nextRetryAt: entry.status === 'rate_limited' ? '2026-09-27T04:05:00.000Z' : null,
    })),
    providerProfiles: entries.map(entry => ({
      ...entry,
      role: 'fallback',
      successRatePercent: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      rateLimitedUntil: entry.status === 'rate_limited' ? '2026-09-27T04:05:00.000Z' : null,
    })),
    configuration: null,
    featuresSucceeded: [],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: {
      discovered: 0,
      metadataAvailable: 0,
      liveQuoteAvailable: null,
      delayedQuoteAvailable: null,
      staleRecords: 0,
      duplicates: 0,
      malformed: 0,
      failed: 0,
      lastSyncAt: null,
    },
    lastSynchronizedAt: null,
    delivery: { source: 'live', cached: false, delayed: false, reason: null },
  };
}

function fmpRuntime(overrides: Record<string, unknown> = {}) {
  return {
    configured: false,
    healthy: false,
    rateLimited: false,
    status: 'not_configured',
    lastSuccessfulFetch: null,
    lastError: null,
    lastErrorAt: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    cacheAvailable: false,
    supportedFeatures: [],
    skippedDueToRateLimit: 0,
    consecutiveRateLimitCount: 0,
    ...overrides,
  };
}

describe('trader provider status truthfulness', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('FMP_API_KEY', '');
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-trading-economics-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    rateLimitRequest.mockReset().mockReturnValue(null);
    synchronizeFmpSharedCooldown.mockReset().mockResolvedValue(undefined);
    getTraderProviderStatus.mockReset().mockReturnValue(providerStatusFixture());
    getFmpRuntimeStatus.mockReset().mockReturnValue(fmpRuntime());
    getTraderMarketCatalog.mockReset().mockResolvedValue(catalogFixture({
      fmp: capability(),
      // This is intentionally declaration-only, not a measured success.
      yahoo: capability({ configured: true, supportsQuotes: true, status: 'degraded' }),
    }));
    getMarketSystemState.mockReset().mockResolvedValue(stateFixture({
      yahoo: 'unknown',
      finnhub: 'unknown',
      tradingeconomics: 'unknown',
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not turn configuration or declaration-only capability data into a healthy provider claim', async () => {
    const { GET } = await import('@/app/api/trader/provider-status/route');
    const response = await GET(new Request('https://thesfm.test/api/trader/provider-status'));
    const body = await response.json();

    expect(body.providers.yahoo).toMatchObject({ configured: true, healthy: false, status: 'unknown' });
    expect(body.providers.finnhub).toMatchObject({ configured: true, healthy: false, status: 'unknown' });
    expect(body.providers.tradingEconomics).toMatchObject({ configured: true, healthy: false, status: 'unknown' });
    expect(body.providerMatrix.yahoo).toMatchObject({ configured: true, healthy: false, status: 'unknown' });
    expect(body.providerMatrix.finnhub).toMatchObject({ configured: true, healthy: false, status: 'unknown' });
  });

  it('does not advertise Yahoo as an FMP cooldown fallback without a measured Yahoo success', async () => {
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    getFmpRuntimeStatus.mockReturnValue(fmpRuntime({
      configured: true,
      rateLimited: true,
      status: 'rate_limited',
      lastError: 'provider_rate_limited',
      rateLimitedUntil: '2026-09-27T04:05:00.000Z',
      nextRetryAt: '2026-09-27T04:05:00.000Z',
      consecutiveRateLimitCount: 1,
    }));
    getTraderMarketCatalog.mockResolvedValue(catalogFixture({
      fmp: capability({ configured: true, supportsQuotes: true, status: 'rate_limited', rateLimited: true }),
      // A configured, declaration-only fallback must not be enough to report a fallback attempt.
      yahoo: capability({ configured: true, supportsQuotes: true, status: 'degraded' }),
    }));
    getMarketSystemState.mockResolvedValue(stateFixture({ fmp: 'rate_limited', yahoo: 'unknown' }));

    const { GET } = await import('@/app/api/trader/provider-status/route');
    const response = await GET(new Request('https://thesfm.test/api/trader/provider-status'));
    const body = await response.json();

    expect(body.availableProviders).not.toContain('Yahoo Finance');
    expect(body.normalizedStatus.fallbackAttempted).toBe(false);
    expect(body.dataProvider).toMatchObject({
      active: 'fmp',
      provider: 'fmp',
      status: 'rate_limited',
    });
  });
});
