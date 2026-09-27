import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMarketSystemState = vi.fn();
const getTraderMarketCatalog = vi.fn();
const getTraderProviderStatus = vi.fn();
const getFmpRuntimeStatus = vi.fn();
const synchronizeFmpSharedCooldown = vi.fn();
const rateLimitRequest = vi.fn();
let synchronized = false;

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

function fmpRuntime(rateLimited: boolean) {
  return {
    configured: true,
    healthy: !rateLimited,
    rateLimited,
    status: rateLimited ? 'rate_limited' : 'healthy',
    lastSuccessfulFetch: null,
    lastError: rateLimited ? 'provider_rate_limited' : null,
    lastErrorAt: null,
    rateLimitedUntil: rateLimited ? '2026-09-27T04:05:00.000Z' : null,
    nextRetryAt: rateLimited ? '2026-09-27T04:05:00.000Z' : null,
    cacheAvailable: false,
    supportedFeatures: [],
    skippedDueToRateLimit: 0,
    consecutiveRateLimitCount: rateLimited ? 1 : 0,
  };
}

describe('trader provider status shared cooldown', () => {
  beforeEach(() => {
    vi.resetModules();
    synchronized = false;
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    rateLimitRequest.mockReset().mockReturnValue(null);
    synchronizeFmpSharedCooldown.mockReset().mockImplementation(async () => {
      synchronized = true;
    });
    getFmpRuntimeStatus.mockReset().mockImplementation(() => fmpRuntime(synchronized));
    getTraderProviderStatus.mockReset().mockReturnValue({
      features: {},
      dataProvider: {
        configured: true,
        active: 'fmp',
        provider: 'fmp',
        status: 'available',
        supportedFeatures: ['prices'],
        lastUpdated: null,
        resultCount: null,
        failureReason: null,
      },
    });
    getTraderMarketCatalog.mockReset().mockResolvedValue({
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
        summary: { cachedSymbols: 0, skippedDueToRateLimit: 0, fmpStatus: 'rate_limited' },
      },
      capabilityMatrix: {
        fmp: { configured: true, healthy: false, supportsQuotes: true, status: 'rate_limited', rateLimited: true },
        yahoo: { configured: true, healthy: true, supportsQuotes: true, status: 'healthy', rateLimited: false },
      },
    });
    getMarketSystemState.mockReset().mockResolvedValue({ overall: 'degraded' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('hydrates the shared cooldown before composing both the legacy and unified status fields', async () => {
    const { GET } = await import('@/app/api/trader/provider-status/route');
    const response = await GET(new Request('https://thesfm.test/api/trader/provider-status'));
    const body = await response.json();

    expect(synchronizeFmpSharedCooldown).toHaveBeenCalledTimes(1);
    expect(body.providers.fmp.status).toBe('rate_limited');
    expect(body.providerMatrix.fmp.status).toBe('rate_limited');
    expect(body.state).toEqual({ overall: 'degraded' });
  });
});
