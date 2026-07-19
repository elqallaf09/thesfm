import { describe, expect, it } from 'vitest';
import type { AnalysisRequest, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { getIntelligenceMethodologyConfig } from '@/lib/intelligence/config';
import { runIntelligenceFactors } from '@/lib/intelligence/factors';

const request: AnalysisRequest = {
  userId: null,
  asset: { symbol: 'AAPL', assetType: 'STOCK' },
  horizon: 'SWING',
  locale: 'en',
  requestedModules: ['TECHNICAL', 'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK', 'SHARIA'],
  providerPreferences: null,
  source: 'INTERNAL',
  correlationId: '00000000-0000-4000-8000-000000000001',
  forceRefresh: false,
};

function snapshot(): VerifiedIntelligenceSnapshot {
  const start = Date.UTC(2026, 0, 1);
  return {
    asset: {
      canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.',
      assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null,
    },
    provider: 'verified-test-provider',
    receivedAt: '2026-07-19T08:00:00.000Z',
    dataAsOf: '2026-07-19T07:59:30.000Z',
    dataStatus: 'LIVE',
    fallbackUsed: false,
    operationalReliability: 1,
    reportedRiskLevel: 'MEDIUM',
    quote: { price: 150, change: 1, changePercent: 0.67, volume: 1_500_000 },
    candles: Array.from({ length: 80 }, (_, index) => ({
      at: new Date(start + index * 86_400_000).toISOString(),
      open: 100 + index * 0.6,
      high: 102 + index * 0.6,
      low: 99 + index * 0.6,
      close: 101 + index * 0.6,
      volume: 1_000_000 + index * 10_000,
    })),
    fundamentals: { trailingPE: 26, trailingEps: 6.2, revenueGrowth: 0.12 },
    fundamentalsSource: 'verified-test-provider',
    sharia: { status: 'unclassified', reason: null, source: null, reviewedAt: null },
    warnings: [],
    providerAttempts: [],
  };
}

describe('intelligence factor normalization', () => {
  it('normalizes verified observations inside the canonical score range', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const factors = runIntelligenceFactors({ request, snapshot: snapshot(), config, now: Date.parse('2026-07-19T08:00:00.000Z') }, request.requestedModules);
    for (const factor of factors.filter(item => item.availability !== 'UNAVAILABLE')) {
      expect(factor.normalizedScore).toBeGreaterThanOrEqual(-100);
      expect(factor.normalizedScore).toBeLessThanOrEqual(100);
      expect(factor.evidence.length).toBeGreaterThan(0);
    }
  });

  it('does not infer Sharia status when verified source context is missing', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const [factor] = runIntelligenceFactors(
      { request, snapshot: snapshot(), config, now: Date.parse('2026-07-19T08:00:00.000Z') },
      ['SHARIA'],
    );
    expect(factor.availability).toBe('UNAVAILABLE');
    expect(factor.normalizedScore).toBeNull();
    expect(factor.failureReason).toBe('VERIFIED_SHARIA_STATUS_UNAVAILABLE');
  });

  it('reports unsupported factor providers truthfully', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const factors = runIntelligenceFactors(
      { request, snapshot: snapshot(), config, now: Date.parse('2026-07-19T08:00:00.000Z') },
      ['SENTIMENT', 'NEWS', 'MACRO'],
    );
    expect(factors.every(factor => factor.availability === 'UNAVAILABLE')).toBe(true);
    expect(factors.map(factor => factor.failureReason)).toEqual([
      'SENTIMENT_PROVIDER_NOT_AVAILABLE',
      'NEWS_FACTOR_NOT_CONNECTED',
      'MACRO_FACTOR_NOT_CONNECTED',
    ]);
  });
});
