import { describe, expect, it } from 'vitest';
import type { IntelligenceHistoricalPricePoint } from '@/domain/intelligence/outcomes';
import {
  calculateDirectionalReturn,
  calculateExcursions,
  classifyDirectionalOutcome,
  confidenceBucket,
  createEvaluationWindow,
  getOutcomeWindowConfig,
  isEvaluationEligible,
  referencePointAfter,
} from '@/lib/intelligence/outcomePolicy';

const points: IntelligenceHistoricalPricePoint[] = [
  { at: '2026-07-01T00:00:00.000Z', open: 100, high: 103, low: 98, close: 101, volume: 1 },
  { at: '2026-07-02T00:00:00.000Z', open: 101, high: 110, low: 96, close: 108, volume: 1 },
];

describe('intelligence outcome policy', () => {
  it('uses documented, versioned horizon windows and never evaluates before the window closes', () => {
    const intraday = createEvaluationWindow({
      horizon: 'INTRADAY',
      generatedAt: '2026-07-01T10:00:00.000Z',
      dataAsOf: '2026-07-01T09:59:00.000Z',
    });
    const longTerm = createEvaluationWindow({
      horizon: 'LONG_TERM',
      generatedAt: '2026-07-01T10:00:00.000Z',
      dataAsOf: null,
    });

    expect(intraday.methodologyVersion).toBe('outcome-evaluation-v1');
    expect(intraday.referenceSource).toBe('DATA_AS_OF');
    expect(Date.parse(intraday.endAt) - Date.parse(intraday.startAt)).toBe(4 * 60 * 60 * 1000);
    expect(Date.parse(longTerm.endAt) - Date.parse(longTerm.startAt)).toBe(365 * 24 * 60 * 60 * 1000);
    expect(isEvaluationEligible(intraday, Date.parse(intraday.eligibleAt) - 1)).toBe(false);
    expect(isEvaluationEligible(intraday, Date.parse(intraday.eligibleAt))).toBe(true);
    expect(getOutcomeWindowConfig('SWING').historyPeriod).toBe('6mo');
  });

  it('uses only an observed post-boundary candle within policy tolerance', () => {
    const found = referencePointAfter(points, '2026-07-01T12:00:00.000Z', 36 * 60 * 60);
    const missing = referencePointAfter(points, '2026-07-03T00:00:00.000Z', 60 * 60);
    expect(found?.at).toBe('2026-07-02T00:00:00.000Z');
    expect(missing).toBeNull();
  });

  it('classifies BUY and SELL directionally but keeps WAIT non-directional', () => {
    expect(calculateDirectionalReturn('BUY', 100, 105)).toBe(5);
    expect(calculateDirectionalReturn('SELL', 100, 95)).toBe(5);
    expect(classifyDirectionalOutcome({ recommendation: 'BUY', assetType: 'STOCK', directionalReturn: 3 })).toBe('CORRECT');
    expect(classifyDirectionalOutcome({ recommendation: 'SELL', assetType: 'STOCK', directionalReturn: -3 })).toBe('INCORRECT');
    expect(classifyDirectionalOutcome({ recommendation: 'BUY', assetType: 'STOCK', directionalReturn: 0.2 })).toBe('NEUTRAL');
    expect(classifyDirectionalOutcome({ recommendation: 'WAIT', assetType: 'STOCK', directionalReturn: 20 })).toBe('NOT_APPLICABLE');
    expect(classifyDirectionalOutcome({ recommendation: 'INSUFFICIENT_DATA', assetType: 'STOCK', directionalReturn: null })).toBe('NOT_APPLICABLE');
  });

  it('calculates directional MFE/MAE only from verified OHLC points', () => {
    expect(calculateExcursions({ recommendation: 'BUY', entryPrice: 100, points })).toEqual({
      maximumFavorableExcursion: 10,
      maximumAdverseExcursion: -4,
      complete: true,
    });
    expect(calculateExcursions({ recommendation: 'SELL', entryPrice: 100, points })).toEqual({
      maximumFavorableExcursion: 4,
      maximumAdverseExcursion: -10,
      complete: true,
    });
    expect(calculateExcursions({
      recommendation: 'BUY',
      entryPrice: 100,
      points: [{ ...points[0]!, high: null }],
    }).complete).toBe(false);
  });

  it('uses deterministic calibration buckets', () => {
    expect([confidenceBucket(0), confidenceBucket(39), confidenceBucket(40), confidenceBucket(59), confidenceBucket(60), confidenceBucket(79), confidenceBucket(80), confidenceBucket(100)])
      .toEqual(['0_39', '0_39', '40_59', '40_59', '60_79', '60_79', '80_100', '80_100']);
  });
});
