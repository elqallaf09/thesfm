import { describe, expect, it } from 'vitest';
import { analyzeStock } from '@/lib/trader/analysisEngine';
import type { MarketCandle, MarketQuote, TradableAsset } from '@/lib/trader/types';

const asset: TradableAsset = {
  symbol: 'AAPL',
  providerSymbol: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  market: 'US',
  currency: 'USD',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  logoUrl: null,
  active: true,
};

function makeQuote(price: number): MarketQuote {
  return {
    symbol: asset.symbol,
    price,
    open: null,
    high: null,
    low: null,
    previousClose: price - 1,
    change: 1,
    changePercent: 0.5,
    volume: null,
    timestamp: new Date().toISOString(),
    currency: 'USD',
    delayed: true,
    provider: 'Yahoo Finance',
  };
}

function makeCandles(count: number, start: number, step: number, wave = 0, frequency = 10): MarketCandle[] {
  const base = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const close = start + step * index + Math.sin(index / frequency) * wave;
    const open = close - step * 0.35 + Math.sin(index / frequency + 1) * wave * 0.1;
    return {
      timestamp: new Date(base + index * 86_400_000).toISOString(),
      open,
      high: Math.max(open, close) + 1.5,
      low: Math.min(open, close) - 1.5,
      close,
      volume: index % 10 === 0 ? 0 : 1_000_000 + index * 4_000,
    };
  });
}

describe('trader analysis engine', () => {
  it('returns hold and no target when historical data is insufficient', () => {
    const result = analyzeStock({
      asset,
      quote: makeQuote(103),
      candles: makeCandles(25, 100, 0.1),
      generatedAt: '2026-06-24T10:00:00.000Z',
    });

    expect(result.signal).toBe('hold');
    expect(result.targetPrice).toBeNull();
    expect(result.stopLoss).toBeNull();
    expect(result.warnings).toContain('Insufficient historical candles for a high-confidence scan.');
  });

  it('keeps aligned bullish technical data on hold when the precision filter does not pass', () => {
    const candles = makeCandles(240, 100, 0.08, 2, 13);
    const result = analyzeStock({
      asset,
      quote: makeQuote(candles.at(-1)?.close ?? 207),
      candles,
      generatedAt: '2026-06-24T10:00:00.000Z',
    });

    expect(result.signal).toBe('hold');
    expect(result.targetPrice).toBeNull();
    expect(result.stopLoss).toBeNull();
    expect(result.scoreBreakdown.totalScore).toBeGreaterThan(0);
    expect(result.precisionMode).toMatchObject({ enabled: true, passed: false });
    expect(result.reasons.some(reason => reason.includes('Precision mode'))).toBe(true);
  });

  it('derives a sell signal from aligned bearish technical data', () => {
    const candles = makeCandles(240, 220, -0.45);
    const result = analyzeStock({
      asset,
      quote: makeQuote(candles.at(-1)?.close ?? 112),
      candles,
      generatedAt: '2026-06-24T10:00:00.000Z',
    });

    expect(result.signal).toBe('sell');
    expect(result.confidence).toBeGreaterThanOrEqual(55);
    expect(result.targetPrice).toBeLessThan(result.currentPrice);
    expect(result.stopLoss).toBeGreaterThan(result.currentPrice);
    expect(result.scoreBreakdown.totalScore).toBeLessThan(0);
  });
});
