import { describe, expect, it } from 'vitest';
import type { NormalizedMarketCandle, NormalizedMarketQuote } from '@/lib/market/marketDataProviders';
import {
  buildSfmTechnicalSnapshot,
  SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS,
} from '@/lib/sfm-market/engine';
import { assessSfmQuoteQuality, marketSourceClassForProvider } from '@/lib/sfm-market/quality';

function completeQuote(patch: Partial<NormalizedMarketQuote> = {}): NormalizedMarketQuote {
  return {
    symbol: 'AAPL',
    providerSymbol: 'AAPL',
    name: 'Apple Inc.',
    price: 200,
    currency: 'USD',
    change: 2,
    changePercent: 1.01,
    open: 198,
    high: 202,
    low: 197,
    previousClose: 198,
    volume: 50_000_000,
    market: 'US',
    exchange: 'NASDAQ',
    exchangeCode: 'XNAS',
    country: 'US',
    assetType: 'stock',
    provider: 'finnhub',
    providerName: 'Finnhub',
    delayType: 'realtime',
    lastUpdated: '2026-09-16T15:00:00.000Z',
    ...patch,
  };
}

function candles(count = 60): NormalizedMarketCandle[] {
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 6, 1 + index)).toISOString().slice(0, 10),
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 1_000_000 + index * 10_000,
    provider: 'finnhub',
  }));
}

describe('SFM Market Data Engine v1', () => {
  it('keeps current third-party providers labelled as aggregators instead of claiming primary-source ownership', () => {
    expect(marketSourceClassForProvider('finnhub')).toBe('aggregator');
    expect(marketSourceClassForProvider('yahoo')).toBe('aggregator');
  });

  it('explicitly forbids Yahoo fallback in the SFM-owned v1 contract', () => {
    expect(SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS).toContain('yahoo');
  });

  it('marks a complete fresh quote as complete', () => {
    const quality = assessSfmQuoteQuality(
      completeQuote(),
      new Date('2026-09-16T15:05:00.000Z'),
    );

    expect(quality.state).toBe('complete');
    expect(quality.completenessPercent).toBe(100);
    expect(quality.missingFields).toEqual([]);
  });

  it('does not turn missing volume or session fields into zeros', () => {
    const quality = assessSfmQuoteQuality(
      completeQuote({ volume: null, open: null, high: null, low: null }),
      new Date('2026-09-16T15:05:00.000Z'),
    );

    expect(quality.state).not.toBe('complete');
    expect(quality.missingFields).toEqual(expect.arrayContaining(['volume', 'open', 'high', 'low']));
  });

  it('marks stale observations explicitly instead of presenting them as current', () => {
    const quality = assessSfmQuoteQuality(
      completeQuote({ lastUpdated: '2026-09-16T10:00:00.000Z' }),
      new Date('2026-09-16T15:05:00.000Z'),
    );

    expect(quality.state).toBe('stale');
    expect(quality.reasons.join(' ')).toMatch(/stale/i);
  });

  it('derives technical indicators only when enough history exists', () => {
    const snapshot = buildSfmTechnicalSnapshot(candles(60), 'finnhub', 161);

    expect(snapshot.historyPoints).toBe(60);
    expect(snapshot.sma20).not.toBeNull();
    expect(snapshot.sma50).not.toBeNull();
    expect(snapshot.rsi14).not.toBeNull();
    expect(snapshot.annualizedVolatilityPercent).not.toBeNull();
    expect(snapshot.averageVolume20).not.toBeNull();
    expect(snapshot.trend).toBe('bullish');
  });

  it('leaves unsupported indicators unavailable instead of fabricating neutral numbers', () => {
    const snapshot = buildSfmTechnicalSnapshot(candles(10), 'finnhub', 110);

    expect(snapshot.sma20).toBeNull();
    expect(snapshot.sma50).toBeNull();
    expect(snapshot.rsi14).toBeNull();
    expect(snapshot.annualizedVolatilityPercent).toBeNull();
    expect(snapshot.trend).toBeNull();
  });
});
