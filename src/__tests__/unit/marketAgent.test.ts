import { describe, expect, it } from 'vitest';
import {
  analyzeMarketAgentFromHistory,
  isMarketAgentResponse,
  MARKET_AGENT_INSUFFICIENT_DATA_AR,
  type MarketAgentInput,
  type MarketAgentPricePoint,
} from '@/lib/market/marketAgent';

const baseInput: MarketAgentInput = {
  symbol: 'TEST',
  assetType: 'stock',
  timeframe: '1D',
  source: 'unit-test',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makePatternHistory(pattern: number[], start = 120, count = 260): MarketAgentPricePoint[] {
  const points: MarketAgentPricePoint[] = [];
  let close = start;

  for (let index = 0; index < count; index += 1) {
    const previousClose = close;
    if (index > 0) close += pattern[(index - 1) % pattern.length];
    const move = close - previousClose;
    const range = Math.max(0.35, Math.abs(move) * 2.4);

    points.push({
      time: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
      open: Number(previousClose.toFixed(4)),
      high: Number((Math.max(previousClose, close) + range).toFixed(4)),
      low: Number((Math.min(previousClose, close) - range).toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: 1000 + (index % 20) * 12 + (move > 0 ? 180 : 40),
    });
  }

  return points;
}

describe('market agent analysis rules', () => {
  it('returns a buy signal when trend, RSI, MACD, and averages align upward', () => {
    const response = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([0.32, -0.18, 0.24, -0.12]));

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.message);
    expect(response.suggestedAction).toBe('buy');
    expect(response.direction).toBe('bullish');
    expect(response.confidence).toBeLessThanOrEqual(85);
    expect(response.indicators.ema20).not.toBeNull();
    expect(response.indicators.ema50).not.toBeNull();
  });

  it('returns a sell signal when trend, RSI, MACD, and averages align downward', () => {
    const response = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([-0.32, 0.18, -0.24, 0.12], 150));

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.message);
    expect(response.suggestedAction).toBe('sell');
    expect(response.direction).toBe('bearish');
    expect(response.confidence).toBeLessThanOrEqual(85);
    expect(response.stopLoss).not.toBeNull();
  });

  it('returns wait when the asset is overextended without confirmation', () => {
    const response = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([0.82, 0.74, 0.91, 0.68], 50));

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.message);
    expect(response.suggestedAction).toBe('wait');
    expect(response.riskLevel).toBe('high');
    expect(response.indicators.rsi).toBeGreaterThan(75);
  });

  it('handles missing or weak data without returning invented analysis fields', () => {
    const response = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([0.2, -0.1], 100, 12));

    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('Expected unavailable response');
    expect(response.currentPrice).toBeNull();
    expect(response.message).toBe(MARKET_AGENT_INSUFFICIENT_DATA_AR);
    expect(response.summaryArabic).toBe(MARKET_AGENT_INSUFFICIENT_DATA_AR);
    expect(response).not.toHaveProperty('suggestedAction');
    expect(response).not.toHaveProperty('entryZone');
    expect(response).not.toHaveProperty('indicators');
  });

  it('never exceeds 85% confidence, even with strongly aligned data', () => {
    const response = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([0.45, -0.12, 0.38, -0.08]));

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.message);
    expect(response.confidence).toBeLessThanOrEqual(85);
    expect(response.confidence).toBeLessThan(100);
  });

  it('validates success and unavailable API response shapes', () => {
    const success = analyzeMarketAgentFromHistory(baseInput, makePatternHistory([0.32, -0.18, 0.24, -0.12]));
    const unavailable = analyzeMarketAgentFromHistory(baseInput, []);

    expect(isMarketAgentResponse(success)).toBe(true);
    expect(isMarketAgentResponse(unavailable)).toBe(true);
  });
});
