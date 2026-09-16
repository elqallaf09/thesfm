import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  persist: vi.fn(),
}));

vi.mock('@/lib/sfm-market/engine', () => ({
  getSfmMarketQuote: mocks.quote,
}));

vi.mock('@/lib/sfm-market/observationStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/sfm-market/observationStore')>();
  return { ...actual, persistSfmMarketObservation: mocks.persist };
});

import { ingestSfmMarketSymbols } from '@/lib/sfm-market/ingestion';

function quote(symbol = 'AAPL'): SfmMarketQuote {
  return {
    schemaVersion: 'sfm-market.v1',
    engine: 'THE SFM Market Data Engine',
    engineVersion: '1.0.0',
    symbol,
    name: symbol,
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
      state: 'complete', score: 100, completenessPercent: 100, freshnessSeconds: 10,
      missingFields: [], reasons: [],
    },
    provenance: {
      sourceClass: 'aggregator', upstreamProvider: 'finnhub', upstreamProviderName: 'Finnhub',
      providerSymbol: symbol, observedAt: '2026-09-16T19:00:00.000Z', receivedAt: '2026-09-16T19:00:10.000Z',
      delayType: 'realtime', cached: false, cacheAgeSeconds: null, attemptCount: 1, derivedFields: [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.quote.mockImplementation(async (symbol: string) => quote(symbol));
  mocks.persist.mockImplementation(async (value: SfmMarketQuote) => ({
    ok: true, stored: true, fingerprint: `fingerprint-${value.symbol}`,
  }));
});

describe('SFM bounded market ingestion', () => {
  it('deduplicates requested symbols, force-refreshes them and defaults storage to internal-only', async () => {
    const result = await ingestSfmMarketSymbols({ symbols: ['aapl', 'AAPL', 'msft'], persistenceEnabled: true });

    expect(result).toMatchObject({ requested: 2, stored: 2, unavailable: 0, skipped: 0, failed: 0 });
    expect(mocks.quote).toHaveBeenCalledTimes(2);
    expect(mocks.quote).toHaveBeenCalledWith('AAPL', expect.objectContaining({ forceFresh: true }));
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL' }), expect.objectContaining({
      enabled: true,
      distributionScope: 'internal_only',
    }));
  });

  it('does not persist an unavailable observation or invent a replacement', async () => {
    mocks.quote.mockResolvedValueOnce(null);
    const result = await ingestSfmMarketSymbols({ symbols: ['AAPL'], persistenceEnabled: true });

    expect(result).toMatchObject({ requested: 1, stored: 0, unavailable: 1 });
    expect(mocks.persist).not.toHaveBeenCalled();
    expect(result.items[0]).toEqual({ symbol: 'AAPL', status: 'unavailable', fingerprint: null, reason: 'sfm_quote_unavailable' });
  });

  it('surfaces disabled persistence as skipped rather than pretending data was stored', async () => {
    mocks.persist.mockResolvedValueOnce({ ok: true, stored: false, fingerprint: 'abc', reason: 'disabled' });
    const result = await ingestSfmMarketSymbols({ symbols: ['AAPL'], persistenceEnabled: false });

    expect(result).toMatchObject({ requested: 1, stored: 0, skipped: 1 });
    expect(result.items[0].status).toBe('skipped');
    expect(result.items[0].reason).toBe('disabled');
  });

  it('bounds one ingestion batch to 100 unique symbols', async () => {
    const symbols = Array.from({ length: 140 }, (_, index) => `T${index}`);
    const result = await ingestSfmMarketSymbols({ symbols, persistenceEnabled: true, concurrency: 7 });

    expect(result.requested).toBe(100);
    expect(mocks.quote).toHaveBeenCalledTimes(100);
    expect(result.stored).toBe(100);
  });
});
