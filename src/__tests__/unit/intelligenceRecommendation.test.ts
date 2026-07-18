import { describe, expect, it } from 'vitest';
import type { FactorResult, IntelligenceFactorKey } from '@/domain/intelligence/contracts';
import { getIntelligenceMethodologyConfig } from '@/lib/intelligence/config';
import { determineRecommendation } from '@/lib/intelligence/recommendation';

function factor(key: IntelligenceFactorKey, score: number): FactorResult {
  return {
    factor: key,
    availability: 'AVAILABLE',
    normalizedScore: score,
    directionalBias: score > 10 ? 'BULLISH' : score < -10 ? 'BEARISH' : 'NEUTRAL',
    strength: Math.abs(score),
    required: ['TECHNICAL', 'MOMENTUM', 'RISK'].includes(key),
    freshness: { state: 'FRESH', observedAt: '2026-07-19T08:00:00.000Z', ageSeconds: 1, thresholdSeconds: 900 },
    evidence: [],
    source: 'verified-test-provider',
    provider: 'verified-test-provider',
    operationalReliability: 1,
    warnings: [],
    failureReason: null,
  };
}

describe('deterministic intelligence recommendation policy', () => {
  const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');
  const base = [factor('TECHNICAL', 60), factor('MOMENTUM', 55), factor('RISK', 10), factor('VOLATILITY', 5), factor('LIQUIDITY', 10)];

  it('selects BUY and SELL only across configured thresholds', () => {
    const buy = determineRecommendation({
      factors: base,
      config,
      confidence: 72,
      confidenceQuality: 'MODERATE_EVIDENCE',
      conflictStatus: 'NONE',
      compositeScore: config.buyThreshold + 1,
      minimumEvidenceMet: true,
    });
    const sell = determineRecommendation({
      factors: base.map(item => item.factor === 'RISK' ? item : { ...item, normalizedScore: -Math.abs(item.normalizedScore ?? 0) }),
      config,
      confidence: 72,
      confidenceQuality: 'MODERATE_EVIDENCE',
      conflictStatus: 'NONE',
      compositeScore: config.sellThreshold - 1,
      minimumEvidenceMet: true,
    });
    expect(buy.recommendation).toBe('BUY');
    expect(sell.recommendation).toBe('SELL');
  });

  it('returns WAIT for strong conflicts and blocks BUY at high risk', () => {
    const conflict = determineRecommendation({
      factors: base,
      config,
      confidence: 80,
      confidenceQuality: 'STRONG_EVIDENCE',
      conflictStatus: 'STRONG',
      compositeScore: config.buyThreshold + 20,
      minimumEvidenceMet: true,
    });
    const highRiskFactors = base.map(item => item.factor === 'RISK' ? factor('RISK', -70) : item);
    const highRisk = determineRecommendation({
      factors: highRiskFactors,
      config,
      confidence: 80,
      confidenceQuality: 'STRONG_EVIDENCE',
      conflictStatus: 'NONE',
      compositeScore: config.buyThreshold + 20,
      minimumEvidenceMet: true,
    });
    expect(conflict.recommendation).toBe('WAIT');
    expect(conflict.decision.reasonCode).toBe('STRONG_SIGNALS_CONFLICT');
    expect(highRisk.recommendation).toBe('WAIT');
    expect(highRisk.decision.reasonCode).toBe('HIGH_RISK_BLOCKED_BUY');
  });

  it('returns INSUFFICIENT_DATA instead of forcing direction', () => {
    const result = determineRecommendation({
      factors: base,
      config,
      confidence: 25,
      confidenceQuality: 'INSUFFICIENT_EVIDENCE',
      conflictStatus: 'NONE',
      compositeScore: 90,
      minimumEvidenceMet: false,
    });
    expect(result.recommendation).toBe('INSUFFICIENT_DATA');
    expect(result.decision.policyVersion).toBe('recommendation-policy-v1');
  });
});
