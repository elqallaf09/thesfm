import { describe, expect, it } from 'vitest';
import { buildResearchEvidence, cleanResearchHistory } from '@/lib/trader/researchEvidence';

const now = Date.parse('2026-09-18T21:00:00Z');
const history = Array.from({ length: 260 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 8, 17) - (259 - index) * 86400000).toISOString().slice(0, 10),
  close: 100 + index * 0.1 + Math.sin(index) * 2, open: 100 + index * 0.1,
  high: 104 + index * 0.1, low: 96 + index * 0.1, volume: 100000 + index * 100,
}));

describe('daily research evidence', () => {
  it('computes agreement, confidence and risk from dated candles without a live quote', () => {
    const result = buildResearchEvidence(history, 'twelve_data', 'stock', now);
    expect(result.available).toBe(true);
    expect(result.samples).toBe(260);
    expect(result.asOf).toBe('2026-09-17');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidenceKind).toBe('rule_based_evidence_score');
    expect(result.strategyAgreement.strategyCount).toBeGreaterThanOrEqual(3);
    expect(result.risk.annualizedVolatilityPercent).toBeGreaterThan(0);
    expect(result.risk.atrPercent).toBeGreaterThan(0);
    expect(result.risk.maximumDrawdownPercent).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('targetPrice');
  });
  it('retains partial indicators without inventing confidence or volume', () => {
    const result = buildResearchEvidence(history.slice(-50).map(point => ({ ...point, volume: null })), 'twelve_data', 'commodity', now);
    expect(result.technicalSummary.indicators.rsi14).not.toBeNull();
    expect(result.technicalSummary.indicators.volumeRatio).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.dataSufficiency.sufficient).toBe(false);
  });
  it('withholds confidence for old histories and empty histories', () => {
    const old = buildResearchEvidence(history, 'twelve_data', 'stock', now + 20 * 86400000);
    expect(old.available).toBe(true);
    expect(old.freshness).toBe('stale');
    expect(old.confidence).toBeNull();
    const empty = buildResearchEvidence([], null, 'stock', now);
    expect(empty.available).toBe(false); expect(empty.confidence).toBeNull(); expect(empty.risk.level).toBeNull();
  });
  it('sorts, deduplicates dates and rejects invalid or future observations', () => {
    const points = cleanResearchHistory([history[1], history[0], history[1], { date: '2026-09-20', close: 10 },
      { date: 'unknown', close: 10 }, { date: '2026-09-17', close: NaN }], now);
    expect(points).toEqual([history[0], history[1]]);
  });
  it('calculates drawdown exactly and uses the asset-specific annualization period', () => {
    const closes = Array.from({ length: 21 }, (_, index) => index === 10 ? 80 : 100);
    const points = history.slice(-21).map((point, index) => ({ ...point, close: closes[index] }));
    const stock = buildResearchEvidence(points, 'fixture', 'stock', now);
    const crypto = buildResearchEvidence(points, 'fixture', 'crypto', now);
    expect(stock.risk.maximumDrawdownPercent).toBe(20);
    expect(stock.risk.annualizationDays).toBe(252); expect(crypto.risk.annualizationDays).toBe(365);
    const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
    const mean = returns.reduce((a, b) => a + b, 0) / 20;
    const expected = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 19 * 252) * 100;
    expect(stock.risk.annualizedVolatilityPercent).toBeCloseTo(expected, 2);
  });
});
