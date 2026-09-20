import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OIL_SCENARIO_INPUT,
  calculateOilScenario,
  calculateOilTargetStress,
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

  it('uses official chokepoint flow as arithmetic context without choosing the disruption assumption', () => {
    const result = calculateOilScenario({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
      hormuzDisruptionPct: 40,
      babElMandebDisruptionPct: 25,
    }, {
      hormuzReferenceMbd: 4.9,
      babElMandebReferenceMbd: 8.1,
      sourceLabel: 'EIA',
      referencePeriod: '2Q26',
    });

    expect(result.context).toMatchObject({
      mode: 'official_flow_baseline',
      hormuzReferenceMbd: 4.9,
      babElMandebReferenceMbd: 8.1,
      referencePeriod: '2Q26',
    });
    expect(result.drivers.find(driver => driver.key === 'hormuz')?.impliedDisruptionMbd).toBeCloseTo(1.96, 2);
    expect(result.drivers.find(driver => driver.key === 'babElMandeb')?.impliedDisruptionMbd).toBeCloseTo(2.025, 3);
    expect(result.input.hormuzDisruptionPct).toBe(40);
  });

  it('falls back to the transparent percentage proxy when official flow context is unavailable', () => {
    const result = calculateOilScenario({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 80,
      hormuzDisruptionPct: 10,
    });
    expect(result.context.mode).toBe('percentage_proxy');
    expect(result.drivers.find(driver => driver.key === 'hormuz')?.impliedDisruptionMbd).toBeNull();
  });

  it('reverse-solves a target price as single-variable sensitivity equivalents', () => {
    const result = calculateOilTargetStress({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
    }, 130, {
      hormuzReferenceMbd: 4.9,
      babElMandebReferenceMbd: 8.1,
      sourceLabel: 'EIA',
      referencePeriod: '2Q26',
    });

    expect(result.methodology).toBe('single_variable_reverse_sensitivity_v1');
    expect(result.requiredImpactPct).toBe(30);
    expect(result.direction).toBe('up');
    expect(result.modelReachable).toBe(true);
    expect(result.context.mode).toBe('official_flow_baseline');
    expect(result.equivalents.find(item => item.key === 'offlineProduction')?.insideConfiguredRange).toBe(true);
    expect(result.equivalents.find(item => item.key === 'hormuz')?.insideConfiguredRange).toBe(false);
  });

  it('marks targets beyond the central model impact cap as outside the configured model', () => {
    const result = calculateOilTargetStress({
      ...DEFAULT_OIL_SCENARIO_INPUT,
      referencePrice: 100,
    }, 300);
    expect(result.requiredImpactPct).toBe(200);
    expect(result.modelReachable).toBe(false);
    expect(result.equivalents.every(item => item.insideConfiguredRange === false)).toBe(true);
  });

  it('keeps the methodology explicit so output is not represented as a forecast', () => {
    const result = calculateOilScenario({ ...DEFAULT_OIL_SCENARIO_INPUT, referencePrice: 80 });
    expect(result.methodology).toBe('transparent_sensitivity_model_v2');
  });
});
