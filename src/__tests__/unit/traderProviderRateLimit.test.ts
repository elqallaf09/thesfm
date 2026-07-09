import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { __resetTraderQuoteCacheForTests, fetchTraderQuotesDetailed } from '@/lib/trader/marketQuotes';
import { __resetFmpRuntimeForTests } from '@/lib/trader/providers/fmpRuntime';

function clearProviderEnvs() {
  vi.stubEnv('FMP_API_KEY', '');
  vi.stubEnv('TWELVE_DATA_API_KEY', '');
  vi.stubEnv('EODHD_API_KEY', '');
  vi.stubEnv('MARKETSTACK_API_KEY', '');
  vi.stubEnv('FINNHUB_API_KEY', '');
  vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
}

afterEach(() => {
  __resetFmpRuntimeForTests();
  __resetTraderQuoteCacheForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('trader provider rate-limit protection', () => {
  it('does not discover all FMP symbol lists on the default catalog path', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await getTraderMarketCatalog({ forceFresh: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(catalog.diagnostics.reason).toBe('fmp_discovery_skipped');
    expect(catalog.diagnostics.cacheStatus).toBe('disabled');
    expect(catalog.diagnostics.totalSymbolsLoaded).toBeGreaterThan(0);
  });

  it('limits explicit FMP discovery to the selected market and marks 429 as rate-limited', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await getTraderMarketCatalog({
      forceFresh: true,
      includeFmpDiscovery: true,
      marketId: 'crypto',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('batch-crypto-quotes');
    expect(catalog.diagnostics.reason).toBe('provider_rate_limited');
    expect(catalog.capabilityMatrix.fmp.status).toBe('rate_limited');
    expect(JSON.stringify(catalog.diagnostics.failedSymbols)).not.toContain('http_429');
  });

  it('returns stale quote cache with cached data quality when FMP becomes rate-limited', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');

    // mock واعٍ بالرابط بدل التسلسل: السلسلة الحالية تجري نداءات إثراء إضافية
    // (Yahoo chart/news) كانت تستهلك ردود التسلسل القديم وتكسر سيناريو الاختبار.
    let fmpCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('financialmodelingprep')) {
        fmpCalls += 1;
        if (fmpCalls === 1) {
          return new Response(
            JSON.stringify([
              {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                price: 210.12,
                change: 1.2,
                changesPercentage: 0.57,
                currency: 'USD',
                timestamp: 1782864000,
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
      }
      // أي مزود آخر (Yahoo chart/quote/news...) يفشل بنظافة
      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchTraderQuotesDetailed(['AAPL'], { forceFresh: true });
    const second = await fetchTraderQuotesDetailed(['AAPL'], { forceFresh: true });

    expect(first.quotes[0]?.provider).toBe('fmp');
    expect(second.quotes[0]).toMatchObject({
      symbol: 'AAPL',
      price: 210.12,
      dataQuality: 'cached',
    });
    expect(second.cacheStatus).toBe('provider-cache');
    expect(second.summary.cachedSymbols).toBe(1);
    expect(JSON.stringify(second)).toContain('provider_rate_limited');
    expect(JSON.stringify(second)).not.toContain('http_429');
  });
});
