import { describe, expect, it } from 'vitest';
import {
  buildGoldAdvancedAnalysis,
  buildGoldCausalChains,
  buildGoldStressTests,
  detectGoldRegime,
  diagnoseGoldModel,
  findGoldHistoricalAnalogs,
} from '@/lib/gold-intelligence/advanced';
import type { GoldDriver, GoldScenarioSnapshot } from '@/lib/gold-intelligence/types';

function driver(id: GoldDriver['id'], score: number | null, weight = 0.125): GoldDriver {
  return {
    id,
    label: id,
    labelAr: id,
    weight,
    score,
    available: score !== null,
    value: null,
    unit: null,
    change: null,
    source: score === null ? null : 'test',
    asOf: null,
    quality: score === null ? 'unavailable' : 'live',
    explanation: '',
    explanationAr: '',
  };
}

function snapshot(overrides: Partial<GoldScenarioSnapshot> = {}): GoldScenarioSnapshot {
  return {
    engine: 'SFM Gold Scenario Engine',
    engineVersion: '1.1.0',
    methodology: 'explainable-quant-v1',
    status: 'available',
    generatedAt: '2026-09-20T00:00:00.000Z',
    spot: { symbol: 'XAUUSD', price: 3000, currency: 'USD', changePercent: 0.2, source: 'test', asOf: '2026-09-20T00:00:00.000Z' },
    factorScore: 0.28,
    confidence: 82,
    dataCoverage: 92,
    annualizedVolatility: 17,
    drivers: [
      driver('usd', 0.2),
      driver('real_yields', 0.65),
      driver('risk_events', 0.15),
      driver('momentum', 0.3),
      driver('nominal_rates', 0.1),
      driver('oil', 0.08),
      driver('etf_proxy', 0.2),
      driver('macro_policy', 0.1),
    ],
    horizons: [],
    events: [],
    upcomingEvents: [],
    sourceStatus: { quotes: 'live', macro: 'live', realYields: 'live', news: 'live', calendar: 'live' },
    warnings: [],
    ...overrides,
  };
}

describe('gold advanced intelligence engines', () => {
  it('detects a real-yield tailwind when it dominates verified evidence', () => {
    const result = detectGoldRegime(snapshot());
    expect(result.id).toBe('real_yield_tailwind');
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('builds explainable causal chains only from material available drivers', () => {
    const chains = buildGoldCausalChains(snapshot());
    expect(chains.some(chain => chain.sourceDriver === 'real_yields')).toBe(true);
    expect(chains.every(chain => chain.nodes.length >= 3)).toBe(true);
    expect(chains.every(chain => chain.confidence > 0)).toBe(true);
  });

  it('runs a stress matrix where a hawkish shock is more restrictive than dovish easing', () => {
    const tests = buildGoldStressTests(snapshot());
    const hawkish = tests.find(test => test.id === 'hawkish-fed');
    const dovish = tests.find(test => test.id === 'dovish-fed');
    expect(hawkish).toBeDefined();
    expect(dovish).toBeDefined();
    expect(hawkish!.result.simulatedFactorScore).toBeLessThan(dovish!.result.simulatedFactorScore);
    expect(tests.every(test => test.result.forecast.scenarios.reduce((sum, item) => sum + item.probability, 0) === 100)).toBe(true);
  });

  it('does not claim calibration when history is too thin', () => {
    const result = diagnoseGoldModel([2800, 2810, 2795]);
    expect(result.status).toBe('unavailable');
    expect(result.calibrationScore).toBeNull();
    expect(result.volatilityBandCoverage).toBeNull();
  });

  it('finds bounded historical analogs without treating them as forecast probabilities', () => {
    const closes = Array.from({ length: 180 }, (_, index) =>
      2500 * (1 + index * 0.0009 + Math.sin(index / 7) * 0.008 + Math.sin(index / 19) * 0.004));
    const result = findGoldHistoricalAnalogs(closes);
    expect(result.status).not.toBe('unavailable');
    expect(result.analogs.length).toBeGreaterThan(0);
    expect(result.analogs.every(item => item.similarity >= 0 && item.similarity <= 100)).toBe(true);
    expect(result.note).toContain('not forecast probabilities');
  });

  it('produces bounded diagnostics and combines all advanced engines', () => {
    const closes = Array.from({ length: 120 }, (_, index) =>
      2700 * (1 + index * 0.0012 + Math.sin(index / 5) * 0.006));
    const result = buildGoldAdvancedAnalysis(snapshot(), closes);
    expect(result.diagnostics.status).toBe('strong');
    expect(result.diagnostics.calibrationScore).not.toBeNull();
    expect(result.diagnostics.calibrationScore!).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.calibrationScore!).toBeLessThanOrEqual(100);
    expect(result.stressTests).toHaveLength(5);
    expect(result.causalChains.length).toBeGreaterThan(0);
    expect(result.historicalAnalogs).toBeDefined();
  });
});
