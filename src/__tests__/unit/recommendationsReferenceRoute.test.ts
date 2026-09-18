import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('@/lib/trader/marketCatalog', async original => {
  const actual = await original<typeof import('@/lib/trader/marketCatalog')>();
  const meta = { symbol: 'AAPL', providerSymbol: 'AAPL', aliases: [], name: 'Apple', assetType: 'stock',
    market: 'us-stocks', exchange: 'NASDAQ', country: 'US', currency: 'USD' };
  return { ...actual, getFullSymbolUniverse: async () => ({ symbolMeta: [meta], entries: [meta], total: 1, source: 'fixture' }) };
});
vi.mock('@/lib/trader/marketQuotes', () => ({
  fetchTraderQuotesDetailed: mocks.load,
  getConnectedProvider: () => ({ active: 'twelve_data', provider: 'twelve_data', configured: true }),
  resolveTraderMarketDynamic: async () => ({
    market: { id: 'us-stocks', currency: 'USD', family: 'US', symbols: ['AAPL'] },
    catalog: { capabilityMatrix: { twelve_data: { configured: true, supportsQuotes: true } },
      diagnostics: { totalSymbolsDiscovered: 1, cacheStatus: 'memory', providerLatencyMs: {} } },
  }),
}));

import { GET } from '@/app/api/recommendations/route';

beforeEach(() => { vi.clearAllMocks(); });

describe('recommendations reference-only response', () => {
  it.each([true, false])('distinguishes returned reference evidence (%s) from provider failure', async hasEvidence => {
    mocks.load.mockResolvedValue({
      quotes: [{ symbol: 'AAPL', name: 'Apple', assetType: 'stock', market: 'us-stocks', exchange: 'NASDAQ',
        country: 'US', currency: 'USD', available: false, price: null, lastKnownPrice: hasEvidence ? 337 : null,
        technicalAvailable: hasEvidence, chartAvailable: hasEvidence, signalAvailable: false,
        dataSufficiency: { sufficient: true }, confidence: null, targetPrice: null, stopLoss: null,
        analyticalSource: 'THE SFM Market Data Engine', upstreamSource: 'Twelve Data', dataQuality: 'partial',
        source: 'THE SFM Market Data Engine', provider: 'twelve_data', providerStatus: { provider: 'twelve_data' },
        lastUpdated: hasEvidence ? '2026-09-17T00:00:00Z' : null, unavailableReason: hasEvidence ? 'sfm_quote_daily' : 'provider_no_data',
        priceReference: hasEvidence ? { kind: 'daily', price: 337, precision: 'date' } : null,
        technicalAsOf: hasEvidence ? '2026-09-17' : null,
      }],
      loaded: [], skipped: [], failed: [{ symbol: 'AAPL', provider: 'twelve_data', reason: hasEvidence ? 'sfm_quote_daily' : 'provider_no_data' }],
      provider: null, reason: 'sfm_market_data_unavailable', cacheStatus: 'not_configured',
      summary: { loadedSymbols: 0, failedSymbols: 1, cachedSymbols: 0, skippedDueToRateLimit: 0 },
      generatedAt: '2026-09-18T10:00:00Z',
    });
    const response = await GET(new Request('https://example.test/api/recommendations?symbols=AAPL&market=us-stocks'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe(hasEvidence ? 'partial' : 'provider_error');
    expect(body.dataQuality).toBe(hasEvidence ? 'partial' : 'unavailable');
    expect(body.lastUpdated).toBe(hasEvidence ? '2026-09-17T00:00:00Z' : null);
    expect(body.diagnostics.lastUpdated).toBe(body.lastUpdated);
    expect(body.analysisStatus).toBe(hasEvidence ? 'insufficient_data' : 'failed');
    expect(body.envelope.status).toBe(hasEvidence ? 'partial' : 'error');
    expect(body.coverage).toMatchObject({ availableWithPrice: 0, referencePriceCount: hasEvidence ? 1 : 0,
      historicalAnalysisCount: hasEvidence ? 1 : 0, sufficientRecommendationCount: 0 });
    expect(body.recommendations[0]).toMatchObject({ tradeable: false, price: null, confidence: null });
    if (hasEvidence) expect(body.recommendations[0]).toMatchObject({ priceReference: { kind: 'daily', price: 337 }, technicalAsOf: '2026-09-17' });
  });
});
