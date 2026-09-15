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
    levels: { support: 120, resistance: 160 },
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

function contextualSnapshot() {
  return {
    ...snapshot(),
    contextEvidence: {
      sentiment: {
        provider: 'finnhub' as const,
        positivePercent: 70,
        negativePercent: 30,
        sampleSize: 12,
        observedAt: '2026-07-19T06:30:00.000Z',
      },
      news: {
        provider: 'finnhub',
        observedAt: '2026-07-19T06:45:00.000Z',
        stale: false,
        failureCode: null,
        articles: [
          {
            headline: 'Apple reports record profit and raises guidance',
            source: 'Reuters',
            publishedAt: '2026-07-19T06:45:00.000Z',
            sentiment: null,
            sentimentSource: null,
          },
          {
            headline: 'Apple supplier outlook remains stable',
            source: 'Reuters',
            publishedAt: '2026-07-19T05:30:00.000Z',
            sentiment: 'neutral' as const,
            sentimentSource: 'provider' as const,
          },
        ],
      },
      macro: {
        provider: 'finnhub',
        observedAt: '2026-07-19T07:00:00.000Z',
        stale: false,
        failureCode: null,
        events: [
          {
            title: 'US GDP Growth Rate',
            country: 'US',
            currency: 'USD',
            dateTimeUtc: '2026-07-19T05:00:00.000Z',
            impact: 'high' as const,
            actual: 3.2,
            forecast: 2.1,
            previous: 2.4,
            provider: 'finnhub',
          },
          {
            title: 'Federal Reserve Rate Decision',
            country: 'US',
            currency: 'USD',
            dateTimeUtc: '2026-07-20T18:00:00.000Z',
            impact: 'high' as const,
            actual: null,
            forecast: 4.5,
            previous: 4.5,
            provider: 'finnhub',
          },
        ],
      },
      sharia: null,
    },
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

  it('reports missing contextual evidence truthfully instead of fabricating factors', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const factors = runIntelligenceFactors(
      { request, snapshot: snapshot(), config, now: Date.parse('2026-07-19T08:00:00.000Z') },
      ['SENTIMENT', 'NEWS', 'MACRO'],
    );
    expect(factors.every(factor => factor.availability === 'UNAVAILABLE')).toBe(true);
    expect(factors.map(factor => factor.failureReason)).toEqual([
      'SENTIMENT_PROVIDER_NOT_AVAILABLE',
      'NEWS_NO_RELEVANT_RESULTS',
      'MACRO_NO_RELEVANT_EVENTS',
    ]);
  });

  it('turns verified contextual evidence into deterministic sentiment, news, and macro factors', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const factors = runIntelligenceFactors(
      { request, snapshot: contextualSnapshot(), config, now: Date.parse('2026-07-19T08:00:00.000Z') },
      ['SENTIMENT', 'NEWS', 'MACRO'],
    );
    const sentiment = factors.find(factor => factor.factor === 'SENTIMENT')!;
    const news = factors.find(factor => factor.factor === 'NEWS')!;
    const macro = factors.find(factor => factor.factor === 'MACRO')!;

    expect(sentiment.availability).toBe('AVAILABLE');
    expect(sentiment.normalizedScore).toBeGreaterThan(0);
    expect(sentiment.source).toBe('finnhub');
    expect(sentiment.evidence.some(item => item.labelKey === 'intelligence_evidence_sentiment_sample_size')).toBe(true);

    expect(news.availability).toBe('AVAILABLE');
    expect(news.normalizedScore).toBeGreaterThan(0);
    expect(news.evidence.some(item => item.value === 'Apple reports record profit and raises guidance')).toBe(true);

    expect(macro.availability).toBe('AVAILABLE');
    expect(macro.normalizedScore).toBeGreaterThan(0);
    expect(macro.evidence.some(item => item.labelKey === 'intelligence_evidence_next_macro_event')).toBe(true);
  });

  it('keeps upcoming macro events informative without inventing a directional surprise', () => {
    const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
    const base = contextualSnapshot();
    const onlyUpcoming = {
      ...base,
      contextEvidence: {
        ...base.contextEvidence,
        macro: {
          ...base.contextEvidence.macro,
          events: [base.contextEvidence.macro.events[1]],
        },
      },
    };
    const [macro] = runIntelligenceFactors(
      { request, snapshot: onlyUpcoming, config, now: Date.parse('2026-07-19T08:00:00.000Z') },
      ['MACRO'],
    );
    expect(macro.availability).toBe('PARTIAL');
    expect(macro.normalizedScore).toBe(0);
    expect(macro.warnings.some(item => item.code === 'MACRO_DIRECTION_UNCLEAR')).toBe(true);
  });
});
