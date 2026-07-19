import { describe, expect, it } from 'vitest';
import type { FactorResult, IntelligenceFactorKey } from '@/domain/intelligence/contracts';
import { calculateDeterministicConfidence } from '@/lib/intelligence/confidence';
import { getIntelligenceMethodologyConfig } from '@/lib/intelligence/config';

function factor(
  key: IntelligenceFactorKey,
  score: number | null,
  options: Partial<FactorResult> = {},
): FactorResult {
  return {
    factor: key,
    availability: score === null ? 'UNAVAILABLE' : 'AVAILABLE',
    normalizedScore: score,
    directionalBias: score === null ? 'UNAVAILABLE' : score > 10 ? 'BULLISH' : score < -10 ? 'BEARISH' : 'NEUTRAL',
    strength: score === null ? 0 : Math.abs(score),
    required: ['TECHNICAL', 'MOMENTUM', 'RISK'].includes(key),
    freshness: { state: 'FRESH', observedAt: '2026-07-19T08:00:00.000Z', ageSeconds: 10, thresholdSeconds: 900 },
    evidence: [],
    source: 'verified-test-provider',
    provider: 'verified-test-provider',
    operationalReliability: 1,
    warnings: [],
    failureReason: score === null ? `${key}_UNAVAILABLE` : null,
    ...options,
  };
}

function completeFactors() {
  return [
    factor('TECHNICAL', 62),
    factor('MOMENTUM', 58),
    factor('RISK', 12),
    factor('VOLATILITY', 10),
    factor('LIQUIDITY', 18),
    factor('FUNDAMENTAL', 35),
    factor('SENTIMENT', null),
    factor('NEWS', null),
    factor('MACRO', null),
    factor('SHARIA', null, { required: false }),
  ];
}

describe('deterministic intelligence confidence', () => {
  const config = getIntelligenceMethodologyConfig('STOCK', 'SWING');

  it('is reproducible from the same explicit inputs', () => {
    const first = calculateDeterministicConfidence(completeFactors(), config);
    const second = calculateDeterministicConfidence(completeFactors(), config);
    expect(first).toEqual(second);
    expect(first.calculation.methodologyVersion).toBe('deterministic-confidence-v1');
    expect(first.calculation.weightingVersion).toBe('asset-horizon-weights-v1');
  });

  it('penalizes stale data without changing the underlying factor score', () => {
    const fresh = calculateDeterministicConfidence(completeFactors(), config);
    const staleFactors = completeFactors().map(item => item.availability === 'UNAVAILABLE' ? item : {
      ...item,
      freshness: { ...item.freshness, state: 'STALE' as const, ageSeconds: 50_000 },
    });
    const stale = calculateDeterministicConfidence(staleFactors, config);
    expect(stale.confidence).toBeLessThan(fresh.confidence);
    expect(stale.calculation.penalties).toContainEqual({ code: 'STALE_DATA', points: 12 });
  });

  it('penalizes missing required factors and refuses strong confidence', () => {
    const missing = completeFactors().map(item => item.factor === 'TECHNICAL' ? factor('TECHNICAL', null) : item);
    const result = calculateDeterministicConfidence(missing, config);
    expect(result.calculation.minimumEvidenceMet).toBe(false);
    expect(result.quality).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.confidence).toBeLessThanOrEqual(29);
    expect(result.completeness.missingRequiredFactors).toContain('TECHNICAL');
  });

  it('detects and penalizes conflicting strong signals', () => {
    const conflicting = completeFactors().map(item => {
      if (item.factor === 'TECHNICAL') return factor('TECHNICAL', 80);
      if (item.factor === 'MOMENTUM') return factor('MOMENTUM', -82);
      if (item.factor === 'FUNDAMENTAL') return factor('FUNDAMENTAL', 75);
      return item;
    });
    const result = calculateDeterministicConfidence(conflicting, config);
    expect(result.conflictStatus).toBe('STRONG');
    expect(result.calculation.penalties.some(penalty => penalty.code === 'STRONG_PROVIDER_OR_FACTOR_CONFLICT')).toBe(true);
  });

  it('caps confidence when only one weak factor exists', () => {
    const result = calculateDeterministicConfidence([
      factor('TECHNICAL', 18, { required: true }),
      factor('MOMENTUM', null, { required: true }),
      factor('RISK', null, { required: true }),
    ], config);
    expect(result.confidence).toBeLessThanOrEqual(29);
    expect(result.quality).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('uses different reproducible weights for asset class and horizon', () => {
    const cryptoIntraday = getIntelligenceMethodologyConfig('CRYPTO', 'INTRADAY');
    const stockLongTerm = getIntelligenceMethodologyConfig('STOCK', 'LONG_TERM');
    expect(cryptoIntraday.weights.MOMENTUM).not.toBe(stockLongTerm.weights.MOMENTUM);
    expect(cryptoIntraday.weights.FUNDAMENTAL).toBeLessThan(stockLongTerm.weights.FUNDAMENTAL);
    expect(cryptoIntraday.weightingVersion).toBe(stockLongTerm.weightingVersion);
  });
});
