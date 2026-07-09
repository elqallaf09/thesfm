import { describe, expect, it } from 'vitest';
import { confidenceForAction, generateMarketSignal } from '@/lib/market/signalEngine';

type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number };

function candles(count: number, start: number, step: number, wave = 0): Candle[] {
  const base = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const close = start + step * i + Math.sin(i / 7) * wave;
    return {
      date: new Date(base + i * 86_400_000).toISOString(),
      open: close - step * 0.3,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1_000_000 + i * 1000,
    };
  });
}

function build(overrides: Record<string, unknown>) {
  return generateMarketSignal({
    symbol: 'TEST',
    assetName: 'Test Asset',
    assetType: 'stock',
    market: 'US',
    currency: 'USD',
    ...overrides,
  } as Parameters<typeof generateMarketSignal>[0]);
}

describe('signal confidence is derived, never an invented placeholder', () => {
  it('reports confidence as not computed whenever the verdict is insufficient data', () => {
    for (const dataQuality of ['partial', 'delayed', 'live', 'unavailable'] as const) {
      const signal = build({ currentPrice: null, history: [], dataQuality });
      expect(signal.action).toBe('insufficient_data');
      expect(signal.confidenceComputed).toBe(false);
      expect(signal.confidence).toBe(0);
    }
  });

  it('never leaks a non-zero confidence for an unavailable data quality', () => {
    const histories = [candles(220, 100, 0.9), candles(220, 100, 0, 2), []];
    for (const history of histories) {
      const signal = build({
        currentPrice: history.at(-1)?.close ?? null,
        history,
        dataQuality: 'unavailable',
      });
      expect(signal.confidenceComputed).toBe(false);
      expect(signal.confidence).toBe(0);
    }
  });

  it('marks confidence as computed and derives a real number for tradable signals', () => {
    const history = candles(220, 100, 0.35);
    const signal = build({ currentPrice: history.at(-1)?.close, history, dataQuality: 'delayed' });
    expect(signal.confidenceComputed).toBe(true);
    expect(signal.confidence).toBeGreaterThan(0);
  });

  it('differentiates confidence across distinct price structures rather than clustering', () => {
    const flat = build({ currentPrice: 100, history: candles(220, 100, 0, 2), dataQuality: 'delayed' });
    const rising = build({ currentPrice: 177, history: candles(220, 100, 0.35), dataQuality: 'delayed' });
    const falling = build({ currentPrice: 85, history: candles(220, 140, -0.25), dataQuality: 'delayed' });

    const values = [flat.confidence, rising.confidence, falling.confidence];
    // The regression we guard against: one fixed value for every symbol regardless of its data.
    expect(new Set(values).size).toBeGreaterThan(1);
    expect(values.every(value => value === 52)).toBe(false);
  });

  it('confidenceForAction refuses to invent a number without usable data', () => {
    for (const action of ['buy', 'sell', 'watch', 'wait'] as const) {
      const result = confidenceForAction(action, 78, 'unavailable');
      expect(result.computed).toBe(false);
      expect(result.confidence).toBe(0);
    }
    const insufficient = confidenceForAction('insufficient_data', 78, 'delayed');
    expect(insufficient.computed).toBe(false);

    // With valid data, watch derives its number from the distance of the score from neutral (no fixed 52).
    const nearNeutral = confidenceForAction('watch', 51, 'delayed');
    const farFromNeutral = confidenceForAction('watch', 80, 'delayed');
    expect(nearNeutral.computed).toBe(true);
    expect(farFromNeutral.confidence).toBeGreaterThan(nearNeutral.confidence);
    expect(nearNeutral.confidence).not.toBe(52);
  });

  it('keeps confidence inside its declared bounds for every data quality', () => {
    for (const dataQuality of ['live', 'delayed', 'partial', 'unavailable'] as const) {
      const history = dataQuality === 'unavailable' ? [] : candles(220, 100, 0.2, 1);
      const signal = build({ currentPrice: history.at(-1)?.close ?? null, history, dataQuality });
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(95);
    }
  });
});
