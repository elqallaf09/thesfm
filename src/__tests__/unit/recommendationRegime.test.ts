import { describe, expect, it } from 'vitest';
import {
  adxFromPoints,
  buildMultiFactorRecommendation,
  marketRegimeFromAdx,
  type RecommendationPricePoint,
} from '@/lib/trader/recommendationEngine';

function trendingSeries(length = 120): RecommendationPricePoint[] {
  // صعود مستمر بنطاقات يومية ضيقة: +DM يهيمن → ADX مرتفع
  const points: RecommendationPricePoint[] = [];
  let close = 100;
  for (let i = 0; i < length; i++) {
    close += 1.2;
    points.push({ close, high: close + 0.6, low: close - 0.6, volume: 1_000_000 });
  }
  return points;
}

function rangingSeries(length = 120): RecommendationPricePoint[] {
  // تعرّج سريع حول 100: حركات الصعود والهبوط تتعادل → ADX منخفض حتماً
  const points: RecommendationPricePoint[] = [];
  for (let i = 0; i < length; i++) {
    const close = 100 + (i % 2 === 0 ? 1.5 : -1.5) + Math.sin(i / 2) * 0.5;
    points.push({ close, high: close + 0.8, low: close - 0.8, volume: 1_000_000 });
  }
  return points;
}

describe('adxFromPoints', () => {
  it('returns high ADX for a persistent trend', () => {
    const value = adxFromPoints(trendingSeries());
    expect(value).not.toBeNull();
    expect(value as number).toBeGreaterThanOrEqual(25);
  });

  it('returns low ADX for a sideways range', () => {
    const value = adxFromPoints(rangingSeries());
    expect(value).not.toBeNull();
    expect(value as number).toBeLessThan(20);
  });

  it('returns null when history is too short or lacks high/low', () => {
    expect(adxFromPoints(trendingSeries(10))).toBeNull();
    const noHiLo = trendingSeries().map(point => ({ close: point.close }));
    expect(adxFromPoints(noHiLo)).toBeNull();
  });
});

describe('marketRegimeFromAdx', () => {
  it('maps thresholds to regimes', () => {
    expect(marketRegimeFromAdx(null)).toBe('unknown');
    expect(marketRegimeFromAdx(30)).toBe('trending');
    expect(marketRegimeFromAdx(25)).toBe('trending');
    expect(marketRegimeFromAdx(22)).toBe('mixed');
    expect(marketRegimeFromAdx(15)).toBe('ranging');
  });
});

describe('buildMultiFactorRecommendation regime integration', () => {
  const baseInput = (history: RecommendationPricePoint[]) => ({
    assetType: 'stock',
    price: history[history.length - 1]?.close ?? 100,
    history,
    dataQuality: 'complete' as const,
    delayed: false,
  });

  it('classifies a trending market and surfaces it in the payload', () => {
    const rec = buildMultiFactorRecommendation(baseInput(trendingSeries()));
    expect(rec.marketRegime.regime).toBe('trending');
    expect(rec.marketRegime.adx).toBeGreaterThanOrEqual(25);
    expect(rec.marketRegime.labelAr).toBe('سوق ذو اتجاه');
    expect(rec.technicalSummary.summaryAr).toContain('نظام السوق ذو اتجاه');
  });

  it('classifies a ranging market and surfaces it in the payload', () => {
    const rec = buildMultiFactorRecommendation(baseInput(rangingSeries()));
    expect(rec.marketRegime.regime).toBe('ranging');
    expect(rec.marketRegime.adx).toBeLessThan(20);
    expect(rec.marketRegime.labelAr).toBe('سوق عرضي');
  });

  it('reports unknown regime when data is insufficient', () => {
    const rec = buildMultiFactorRecommendation({
      assetType: 'stock',
      price: null,
      history: [],
      dataQuality: 'unavailable',
      delayed: false,
    });
    expect(rec.finalRecommendationAr).toBe('بيانات غير كافية');
    expect(rec.marketRegime.regime).toBe('unknown');
    expect(rec.marketRegime.adx).toBeNull();
  });

  it('keeps percentages and score sane across regimes', () => {
    for (const history of [trendingSeries(), rangingSeries()]) {
      const rec = buildMultiFactorRecommendation(baseInput(history));
      expect(rec.finalScore).not.toBeNull();
      expect(rec.finalScore as number).toBeGreaterThanOrEqual(0);
      expect(rec.finalScore as number).toBeLessThanOrEqual(100);
    }
  });
});
