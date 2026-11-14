import { describe, expect, it } from 'vitest';
import { analyzeDailyReturns, concentration } from './core';

function metrics(values: number[]) {
  const result = analyzeDailyReturns(values);
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('portfolio risk primitives', () => {
  it('rejects insufficient, sparse and invalid daily observations', () => {
    for (const values of [[0.01], Array(60), Array(60).fill(NaN), Array(60).fill(Infinity), Array(60).fill(-1.01)]) {
      expect(analyzeDailyReturns(values)).toEqual({ error: 'INSUFFICIENT_OR_INVALID_RETURNS' });
    }
    for (const calendar of [0, -1, 2.5, Infinity, Number.MAX_VALUE]) {
      expect(analyzeDailyReturns(Array(60).fill(0), calendar)).toEqual({ error: 'INVALID_CALENDAR' });
    }
  });
  it('returns finite zero metrics for zero returns', () => {
    expect(metrics(Array(100).fill(0))).toEqual({ observations: 100, volatilityAnnualized: 0, historicalVar95: 0, historicalCvar95: 0, maximumDrawdown: 0 });
  });
  it('calculates known tail losses and compounded drawdown', () => {
    const result = metrics([...Array(98).fill(0), -0.1, -0.2]);
    expect(result.historicalVar95).toBe(0);
    expect(result.historicalCvar95).toBeCloseTo(0.06, 12);
    expect(result.maximumDrawdown).toBeCloseTo(0.28, 12);
  });
  it('uses inverse empirical loss CDF at an exact 95% boundary', () => {
    const result = metrics([-0.6, -0.5, -0.4, ...Array(57).fill(0)]);
    expect(result.historicalVar95).toBe(0);
    expect(result.historicalCvar95).toBeCloseTo(0.5, 12);
  });
  it('weights the fractional tail observation at n=61', () => {
    const result = metrics([-0.4, -0.3, -0.2, -0.1, ...Array(57).fill(0)]);
    expect(result.historicalVar95).toBeCloseTo(0.1, 12);
    expect(result.historicalCvar95).toBeCloseTo((0.4 + 0.3 + 0.2 + 0.05 * 0.1) / 3.05, 12);
  });
  it('handles ties without including extra probability mass', () => {
    const result = metrics([...Array(7).fill(-0.1), ...Array(94).fill(0.01)]);
    expect(result.historicalVar95).toBeCloseTo(0.1, 12);
    expect(result.historicalCvar95).toBeCloseTo(0.1, 12);
  });
  it('reports gains-only tail outcomes as zero losses', () => {
    const result = metrics(Array(61).fill(0.02));
    expect(result.historicalVar95).toBe(0);
    expect(result.historicalCvar95).toBe(0);
    expect(result.maximumDrawdown).toBe(0);
  });
  it('does not overflow compounded wealth after many large gains', () => {
    const result = metrics([...Array(1100).fill(1), -0.5]);
    expect(result.maximumDrawdown).toBeCloseTo(0.5, 12);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });
  it('tracks a complete loss as 100% drawdown', () => {
    expect(metrics([...Array(59).fill(0.01), -1, 0.5]).maximumDrawdown).toBe(1);
  });
  it('rejects arithmetic outside the supported numeric range', () => {
    expect(analyzeDailyReturns([Number.MAX_VALUE, ...Array(60).fill(0)])).toEqual({ error: 'NUMERIC_RANGE_EXCEEDED' });
  });
  it('agrees with an independently computed sample variance', () => {
    const values = Array.from({ length: 60 }, (_, i) => i % 2 ? 0.01 : -0.01);
    expect(metrics(values).volatilityAnnualized).toBeCloseTo(Math.sqrt(60 * 0.0001 / 59) * Math.sqrt(252), 12);
  });
  it('does not mutate observations', () => {
    const values = [-0.4, -0.1, -0.3, ...Array(60).fill(0)];
    const original = [...values];
    metrics(values);
    expect(values).toEqual(original);
  });
  it('checks concentration and rejects sparse or unbalanced weights', () => {
    expect(concentration([0.5, 0.5])).toEqual({ hhi: 0.5, largestWeight: 0.5 });
    for (const weights of [[], Array(2), [0.8, 0.3], [-0.1, 1.1], [1.0000001], [NaN]]) {
      expect(concentration(weights)).toEqual({ error: 'INVALID_WEIGHTS' });
    }
  });
});
