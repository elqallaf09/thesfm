import { describe, expect, it } from 'vitest';
import {
  buildMultiFactorRecommendation,
  type RecommendationNewsSentiment,
  type RecommendationPricePoint,
} from '@/lib/trader/recommendationEngine';

const positiveNews: RecommendationNewsSentiment = {
  status: 'available',
  sentiment: 'positive',
  score: 72,
  summaryEn: 'Recent provider news sentiment is positive.',
  summaryAr: 'المعنويات الخبرية من المزود إيجابية.',
  articleCount: 4,
  provider: 'Finnhub',
  updatedAt: '2026-07-03T09:00:00.000Z',
};

function history(count: number, start = 100, step = 0.18): RecommendationPricePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const drift = index * step;
    const wave = Math.sin(index / 8) * 0.22;
    const close = start + drift + wave;
    return {
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      open: close - 0.12,
      high: close + 0.45,
      low: close - 0.42,
      close,
      volume: 1_000_000 + index * 1_200,
    };
  });
}

describe('trader multi-factor recommendation engine', () => {
  it('shows insufficient data when no real price history is available', () => {
    const result = buildMultiFactorRecommendation({
      price: 100,
      history: [],
      dataQuality: 'partial',
      delayed: false,
      assetType: 'stock',
    });

    expect(result.finalRecommendation).toBe('Insufficient data');
    expect(result.confidence).toBeNull();
    expect(result.strategyCount).toBe(0);
    expect(result.strategyAgreement.label).toBe('Insufficient data');
    expect(result.technicalAvailable).toBe(false);
  });

  it('labels strategy coverage as limited and caps agreement when fewer than three modules are available', () => {
    const shortHistory = history(15);
    const result = buildMultiFactorRecommendation({
      price: shortHistory.at(-1)?.close ?? null,
      history: shortHistory,
      dataQuality: 'partial',
      delayed: false,
      assetType: 'stock',
    });

    expect(result.finalRecommendation).toBe('Insufficient data');
    expect(result.strategyCount).toBeLessThan(3);
    expect(result.strategyAgreement.label).toBe('Limited consensus');
    expect(result.strategyAgreement.agreementPct ?? 0).toBeLessThanOrEqual(66);
  });

  it('keeps AI confidence separate from strategy agreement on complete technical coverage', () => {
    const fullHistory = history(240);
    const result = buildMultiFactorRecommendation({
      price: fullHistory.at(-1)?.close ?? null,
      history: fullHistory,
      dataQuality: 'partial',
      delayed: false,
      assetType: 'stock',
      newsSentiment: positiveNews,
    });

    expect(result.dataQualityStatus.status).toBe('complete');
    expect(result.technicalAvailable).toBe(true);
    expect(result.strategyCount).toBeGreaterThanOrEqual(3);
    expect(result.strategyAgreement.label).not.toBe('Limited consensus');
    expect(result.confidence).not.toBe(result.strategyAgreement.agreementPct);
  });

  it('downgrades cached provider data instead of promoting a buy or sell', () => {
    const fullHistory = history(240);
    const result = buildMultiFactorRecommendation({
      price: fullHistory.at(-1)?.close ?? null,
      history: fullHistory,
      dataQuality: 'cached',
      delayed: true,
      assetType: 'stock',
      newsSentiment: positiveNews,
    });

    expect(result.dataQualityStatus.status).toBe('cached');
    expect(result.finalRecommendation).toBe('Watch');
    expect(result.confidence ?? 100).toBeLessThanOrEqual(60);
  });
});
