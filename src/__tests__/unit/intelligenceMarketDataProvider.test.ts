import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisRequest, CanonicalAssetIdentity } from '@/domain/intelligence/contracts';

const { proxyAnalyzeMock, proxyHistoryMock } = vi.hoisted(() => ({
  proxyAnalyzeMock: vi.fn(),
  proxyHistoryMock: vi.fn(),
}));

vi.mock('@/lib/market/marketDataProvider', () => ({
  proxyAnalyze: proxyAnalyzeMock,
  proxyHistory: proxyHistoryMock,
}));

import { ExistingMarketDataIntelligenceProvider } from '@/providers/intelligence/existingMarketDataProvider';

const asset: CanonicalAssetIdentity = {
  canonicalSymbol: 'BOUBYAN.KW',
  providerSymbol: 'BOUBYAN.KW',
  displaySymbol: 'BOUBYAN.KW',
  name: 'Boubyan Bank',
  assetType: 'STOCK',
  exchange: 'Boursa Kuwait',
  market: 'Boursa Kuwait',
  quoteCurrency: 'KWD',
  country: 'KW',
  logoUrl: null,
};

const request: AnalysisRequest = {
  userId: null,
  asset: { symbol: 'BOUBYAN.KW', assetType: 'STOCK' },
  horizon: 'SWING',
  locale: 'ar',
  requestedModules: [],
  providerPreferences: null,
  source: 'SMART_MARKET_ANALYSIS',
  correlationId: 'provider-history-test',
  forceRefresh: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExistingMarketDataIntelligenceProvider', () => {
  it('recovers and normalizes Kuwait history when the quote provider has no candles', async () => {
    proxyAnalyzeMock.mockResolvedValue({
      success: true,
      provider: 'finnhub',
      source: 'Finnhub',
      dataStatus: 'delayed',
      fallback: false,
      latestPrice: 0.665,
      name: 'Boubyan Bank',
      currency: 'KWD',
      exchange: 'Boursa Kuwait',
      market: 'Boursa Kuwait',
      country: 'KW',
      lastUpdated: '2026-09-14T00:00:00.000Z',
      quote: {
        price: 0.665,
        change: 0.003,
        changePercent: 0.45,
        currency: 'KWD',
        timestamp: '2026-09-14T00:00:00.000Z',
      },
      history: [],
      fundamentals: { marketCap: 3152.68, peRatio: 31.36, eps: 0.0213 },
      fundamentalsAvailable: true,
      fundamentalsSource: 'finnhub',
      levels: { support: 0.65, resistance: 0.68 },
      riskLevel: 'low',
      warnings: ['Historical candles are not available for this response.'],
    });

    const lastPoint = Date.parse('2026-09-15T06:00:00.000Z');
    proxyHistoryMock.mockResolvedValue({
      success: true,
      source: 'Yahoo Finance',
      fallbackProvider: 'yahoo',
      currency: 'KWF',
      history: Array.from({ length: 60 }, (_, index) => {
        const close = 610 + index;
        return {
          date: new Date(lastPoint - ((59 - index) * 24 * 60 * 60 * 1000)).toISOString(),
          open: close - 2,
          high: close + 4,
          low: close - 4,
          close,
          volume: 1_000_000 + index,
        };
      }),
    });

    const snapshot = await new ExistingMarketDataIntelligenceProvider().getSnapshot(request, asset);

    expect(proxyHistoryMock).toHaveBeenCalledWith('BOUBYAN.KW', 'stock', '1y', '1d');
    expect(snapshot.candles).toHaveLength(60);
    expect(snapshot.candles.at(-1)?.close).toBeCloseTo(0.669);
    expect(snapshot.candles.at(-1)?.high).toBeCloseTo(0.673);
    expect(snapshot.dataAsOf).toBe('2026-09-15T06:00:00.000Z');
    expect(snapshot.quote.price).toBe(0.665);
    expect(snapshot.dataStatus).toBe('DELAYED');
    expect(snapshot.fallbackUsed).toBe(true);
    expect(snapshot.provider).toBe('finnhub+yahoo');
    expect(snapshot.warnings).toContain('SUPPLEMENTAL_HISTORY_FALLBACK_USED');
    expect(snapshot.levels).toEqual({ support: null, resistance: null });
    expect(snapshot.reportedRiskLevel).toBeNull();
    expect(snapshot.quote.volume).toBeNull();
  });
});
