import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OIL_SCENARIO_INPUT,
  calculateOilScenario,
  sanitizeOilScenarioInput,
} from '@/lib/market/oilScenarioEngine';

describe('oil scenario engine', () => {
  it('keeps the reference price unchanged when no shock assumptions are entered', () => {
    const result = calculateOilScenario({ ...DEFAULT_OIL_SCENARIO_INPUT, referencePrice: 100 });
    expect(result.centralImpactPct).toBe(0);
    expect(result.scenarios.map(scenario => scenario.priceMid)).toEqual([100, 100, 100]);
    expect(result.scenarios.map(scenario => [scenario.priceLow, scenario.priceHigh])).toEqual([
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
  });

  it('raises modeled pressure when route, production, tanker and insurance stress increase', () => {
    const baseline = calculateOilScenario({ ...DEFAULT_OIL_SCENARIO_INPUT, referencePrice: 100 });
    const stressed = calculateOilScenario({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
      hormuzDisruptionPct: 60,
      babElMandebDisruptionPct: 40,
      offlineProductionMbd: 4,
      tankerDisruptionPct: 30,
      freightInsurancePremiumPct: 70,
      durationDays: 90,
    });
    expect(stressed.centralImpactPct).toBeGreaterThan(baseline.centralImpactPct);
    expect(stressed.scenarios.find(item => item.id === 'central')?.priceMid).toBeGreaterThan(100);
  });

  it('lets spare capacity, stock releases and weaker demand offset supply pressure', () => {
    const stressed = calculateOilScenario({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
      offlineProductionMbd: 5,
      durationDays: 60,
    });
    const offset = calculateOilScenario({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
      offlineProductionMbd: 5,
      spareCapacityResponseMbd: 3,
      stockReleaseMbd: 2,
      demandChangePct: -2,
      policyRateChangeBps: 200,
      durationDays: 60,
    });
    expect(offset.centralImpactPct).toBeLessThan(stressed.centralImpactPct);
  });

  it('clamps invalid or out-of-range inputs instead of allowing runaway values', () => {
    const input = sanitizeOilScenarioInput({
      referencePrice: -50,
      hormuzDisruptionPct: 150,
      demandChangePct: -99,
      policyRateChangeBps: 9999,
      durationDays: 1000,
    });
    expect(input.referencePrice).toBe(0);
    expect(input.hormuzDisruptionPct).toBe(100);
    expect(input.demandChangePct).toBe(-15);
    expect(input.policyRateChangeBps).toBe(1000);
    expect(input.durationDays).toBe(365);
  });

  it('keeps the methodology explicit so output is not represented as a forecast', () => {
    const result = calculateOilScenario({ ...DEFAULT_OIL_SCENARIO_INPUT, referencePrice: 80 });
    expect(result.methodology).toBe('transparent_sensitivity_model_v1');
  });
});
