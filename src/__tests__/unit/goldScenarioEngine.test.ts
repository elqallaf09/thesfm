import { describe, expect, it } from 'vitest';
import {
  annualizedVolatilityFromCloses,
  applyGoldWhatIf,
  buildGoldHorizonForecast,
  calculateGoldFactorScore,
  GOLD_HORIZON_DAYS,
} from '@/lib/gold-intelligence/core';
import type { GoldDriver, GoldScenarioSnapshot } from '@/lib/gold-intelligence/types';

const driver = (id: GoldDriver['id'], weight: number, score: number | null): GoldDriver => ({
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
});

describe('gold scenario engine core', () => {
  it('scales annualized volatility with trading-session horizon equivalents', () => {
    expect(GOLD_HORIZON_DAYS).toEqual({
      '24h': 1,
      '7d': 5,
      '1m': 21,
      '3m': 63,
      '6m': 126,
      '12m': 252,
    });
  });

  it('reweights around missing evidence instead of treating it as zero', () => {
    const result = calculateGoldFactorScore([
      driver('usd', 0.5, 1),
      driver('real_yields', 0.3, null),
      driver('momentum', 0.2, -0.5),
    ]);
    expect(result.coverage).toBeCloseTo(0.7, 4);
    expect(result.score).toBeCloseTo((0.5 - 0.1) / 0.7, 4);
  });

  it('keeps scenario probabilities at 100 percent', () => {
    const forecast = buildGoldHorizonForecast({
      price: 3000,
      annualizedVolatility: 16,
      factorScore: 0.42,
      horizon: '1m',
      eventRisk: 0.35,
      upcomingHighImpactCount: 2,
    });
    expect(forecast.scenarios.reduce((sum, item) => sum + item.probability, 0)).toBe(100);
    expect(forecast.scenarios.every(item => item.low !== null && item.high !== null)).toBe(true);
  });

  it('does not invent price ranges when verified volatility is unavailable', () => {
    const forecast = buildGoldHorizonForecast({
      price: 3000,
      annualizedVolatility: null,
      factorScore: 0.1,
      horizon: '7d',
      eventRisk: 0.2,
      upcomingHighImpactCount: 0,
    });
    expect(forecast.scenarios.every(item => item.low === null && item.high === null && item.midpoint === null)).toBe(true);
  });

  it('derives observed volatility from price history', () => {
    const closes = Array.from({ length: 40 }, (_, index) => 2800 * (1 + index * 0.001 + Math.sin(index / 3) * 0.002));
    const volatility = annualizedVolatilityFromCloses(closes);
    expect(volatility).not.toBeNull();
    expect(volatility!).toBeGreaterThan(0);
  });

  it('makes a stronger dollar and higher real yields restrictive in What If', () => {
    const snapshot: GoldScenarioSnapshot = {
      engine: 'SFM Gold Scenario Engine', engineVersion: '1.0.0', methodology: 'explainable-quant-v1', status: 'available',
      generatedAt: new Date().toISOString(),
      spot: { symbol: 'XAUUSD', price: 3000, currency: 'USD', changePercent: 0, source: 'test', asOf: null },
      factorScore: 0.15, confidence: 75, dataCoverage: 90, annualizedVolatility: 16,
      drivers: [], horizons: [], events: [], upcomingEvents: [],
      sourceStatus: { quotes: 'live', macro: 'live', realYields: 'live', news: 'live', calendar: 'live' }, warnings: [],
    };
    const restrictive = applyGoldWhatIf(snapshot, { horizon: '1m', shocks: { dollarPct: 5, realYieldBps: 50 } });
    const supportive = applyGoldWhatIf(snapshot, { horizon: '1m', shocks: { dollarPct: -5, realYieldBps: -50 } });
    expect(restrictive.simulatedFactorScore).toBeLessThan(snapshot.factorScore);
    expect(supportive.simulatedFactorScore).toBeGreaterThan(snapshot.factorScore);
  });
});
