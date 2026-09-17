import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  history: vi.fn(),
}));

vi.mock('@/lib/sfm-market/engine', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/sfm-market/engine')>();
  return { ...actual, getSfmMarketQuote: mocks.quote };
});

vi.mock('@/lib/sfm-market/history', () => ({
  getSfmMarketHistory: mocks.history,
}));

import { fetchSfmTraderQuotesDetailed } from '@/lib/trader/sfmMarketQuotes';

function quote(patch: Partial<SfmMarketQuote> = {}): SfmMarketQuote {
  return {
    schemaVersion: 'sfm-market.v1',
    engine: 'THE SFM Market Data Engine',
    engineVersion: '1.0.0',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    market: 'US Stocks',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    price: 320,
    change: 2,
    changePercent: 0.63,
    open: 317,
    high: 322,
    low: 316,
    previousClose: 318,
    volume: 48_000_000,
    quality: {
      state: 'complete',
      score: 100,
      completenessPercent: 100,
      freshnessSeconds: 15,
      missingFields: [],
      reasons: [],
    },
    provenance: {
      sourceClass: 'aggregator',
      upstreamProvider: 'finnhub',
      upstreamProviderName: 'Finnhub',
      providerSymbol: 'AAPL',
      observedAt: '2026-09-16T19:00:00.000Z',
      receivedAt: '2026-09-16T19:00:15.000Z',
      delayType: 'realtime',
      cached: false,
      cacheAgeSeconds: null,
      attemptCount: 1,
      derivedFields: ['change', 'changePercent'],
    },
    ...patch,
  };
}

function candles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    open: 99 + index,
    high: 102 + index,
    low: 98 + index,
    close: 100 + index,
    volume: 1_000_000 + index * 5_000,
    provider: 'finnhub' as const,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SFM trader quote adapter', () => {
  it('withholds a current recommendation when the quote is stale even with a full history', async () => {
    const stale = quote();
    stale.quality.state = 'stale';
    stale.provenance.cached = true;
    mocks.quote.mockResolvedValue(stale);
    mocks.history.mockResolvedValue({ ok: true, candles: candles(220), attempts: [] });
    const result = await fetchSfmTraderQuotesDetailed(['AAPL']);
    expect(result.quotes[0]).toMatchObject({ available: false, price: null, signalAvailable: false, confidence: null, targetPrice: null });
  });
  it('does not spend history requests on quote-only lists', async () => {
    mocks.quote.mockResolvedValue(quote());
    const result = await fetchSfmTraderQuotesDetailed(['AAPL'], { includeHistory: false });
    expect(mocks.history).not.toHaveBeenCalled();
    expect(result.quotes[0]).toMatchObject({ available: true, price: 320, chartAvailable: false, signalAvailable: false });
    expect(result.quotes[0].targetPrice).toBeNull();
  });

  it('preserves a valid quote when the independent history provider fails', async () => {
    mocks.quote.mockResolvedValue(quote());
    mocks.history.mockRejectedValue(new Error('history provider timeout'));
    const result = await fetchSfmTraderQuotesDetailed(['AAPL']);
    expect(result.quotes[0]).toMatchObject({ available: true, price: 320, chartAvailable: false, signalAvailable: false });
    expect(result.summary.loadedSymbols).toBe(1);
  });

  it('retains a stale observation only as last-known evidence and withholds trade outputs', async () => {
    const stale = quote();
    stale.quality.state = 'stale';
    stale.marketCap = 2_000_000;
    mocks.quote.mockResolvedValue(stale);
    mocks.history.mockResolvedValue({ ok: true, provider: 'fmp', candles: candles(220), attempts: [] });
    const { quotes } = await fetchSfmTraderQuotesDetailed(['AAPL']);
    expect(quotes[0]).toMatchObject({ available: false, price: null, lastKnownPrice: 320,
      lastUpdated: stale.provenance.observedAt, marketCap: 2_000_000, signalAvailable: false,
      targetPrice: null, stopLoss: null, confidence: null, finalRecommendation: 'Insufficient data' });
  });

  it('presents THE SFM as the analytical source while keeping upstream provenance', async () => {
    mocks.quote.mockResolvedValue(quote());
    mocks.history.mockResolvedValue({
      ok: true,
      symbol: 'AAPL',
      providerSymbol: 'AAPL',
      provider: 'finnhub',
      candles: candles(220),
      attempts: [],
    });

    const result = await fetchSfmTraderQuotesDetailed(['AAPL']);
    const item = result.quotes[0] as typeof result.quotes[0] & {
      analyticalSource?: string;
      upstreamSource?: string | null;
      sfmProvenance?: { upstreamProvider?: string | null };
    };

    expect(item.available).toBe(true);
    expect(item.source).toBe('THE SFM Market Data Engine');
    expect(item.analyticalSource).toBe('THE SFM Market Data Engine');
    expect(item.upstreamSource).toBe('Finnhub');
    expect(item.sfmProvenance?.upstreamProvider).toBe('finnhub');
    expect(item.provider).toBe('finnhub');
    expect(item.samples).toBe(220);
    expect(item.signalAvailable).toBe(true);
    expect(item.confidence).not.toBeNull();
  });

  it('withholds confidence, target, stop and risk when evidence is incomplete', async () => {
    mocks.quote.mockResolvedValue(quote({
      quality: {
        state: 'partial',
        score: 55,
        completenessPercent: 62,
        freshnessSeconds: 15,
        missingFields: ['volume'],
        reasons: ['volume is missing'],
      },
      volume: null,
    }));
    mocks.history.mockResolvedValue({
      ok: true,
      symbol: 'AAPL',
      providerSymbol: 'AAPL',
      provider: 'finnhub',
      candles: candles(10),
      attempts: [],
    });

    const result = await fetchSfmTraderQuotesDetailed(['AAPL']);
    const item = result.quotes[0];

    expect(item.available).toBe(true);
    expect(item.signalAvailable).toBe(false);
    expect(item.confidence).toBeNull();
    expect(item.aiConfidence).toBeNull();
    expect(item.targetPrice).toBeNull();
    expect(item.stopLoss).toBeNull();
    expect(item.riskLevel).toBeNull();
    expect(item.finalRecommendation).toBe('Insufficient data');
  });

  it('returns an honest unavailable SFM row rather than a replacement quote', async () => {
    mocks.quote.mockResolvedValue(null);
    mocks.history.mockResolvedValue({
      ok: false,
      symbol: 'AAPL',
      providerSymbol: 'AAPL',
      provider: null,
      candles: [],
      attempts: [],
      reason: 'provider_no_data',
    });

    const result = await fetchSfmTraderQuotesDetailed(['AAPL']);
    const item = result.quotes[0];

    expect(item.available).toBe(false);
    expect(item.price).toBeNull();
    expect(item.confidence).toBeNull();
    expect(item.source).toBe('THE SFM Market Data Engine');
    expect(item.unavailableReason).toBe('provider_no_data');
  });
});
