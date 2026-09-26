import { describe, expect, it } from 'vitest';
import { ASSETS, CASES, EVENT_KINDS, HORIZONS, LIMITS, MODEL_VERSION, defaultInput, parseInput, readSnapshot, simulate, snapshot, surprise, template } from '../../domain/macro-simulator/engine';
import { assetLabels, caseLabels, copy, eventLabels, explanations, factorLabels, horizonLabels, regimeLabels, templateLabels, units } from '../../components/macro-simulator/copy';

describe('macro simulation educational model', () => {
  it('labels output as uncalibrated and supplies no fabricated data or probabilities', () => {
    const report = simulate(defaultInput());
    expect(report.model).toBe(MODEL_VERSION);
    expect(report.calibration).toBe('illustrative');
    expect(report.marketData).toBe('not-connected');
    expect(report.probabilities).toBeNull();
    expect(report.scenarios.map(s => s.id)).toEqual([...CASES]);
  });
  it('uses the surprise rather than the announced rate direction', () => {
    expect(surprise({ kind: 'rates', magnitude: 25, expected: 50, pricedIn: 0 })).toBe(-1);
    const input = defaultInput(); input.shocks[0].expected = input.shocks[0].magnitude;
    for (const scenario of simulate(input).scenarios) for (const value of Object.values(scenario.returns)) expect(value).toBe(0);
  });
  it('does not apply priced-in attenuation twice to rate surprises', () => {
    const input = defaultInput(); const before = simulate(input); input.shocks[0].pricedIn = 100;
    expect(simulate(input).scenarios).toEqual(before.scenarios);
  });
  it('a fully priced non-rate event creates no new shock', () => {
    const input = template('supply'); input.shocks[0].pricedIn = 100;
    expect(simulate(input).scenarios[1].impact).toBe(0);
  });
  it('a gold-only exercise imposes no causality on oil, USD or other assets', () => {
    const report = simulate(template('gold'));
    for (const scenario of report.scenarios) {
      expect(scenario.returns.gold).toBeGreaterThan(0);
      for (const asset of ASSETS.filter(a => a !== 'gold')) expect(scenario.returns[asset]).toBe(0);
    }
  });
  it('distinguishes cash USD from the dollar-index proxy', () => {
    const report = simulate(defaultInput());
    expect(report.scenarios[1].returns.usd).not.toBe(0);
    for (const s of report.scenarios) expect(s.returns.cash).toBe(0);
  });
  it('calculates portfolio contributions and ending value consistently', () => {
    const input = template('compound');
    for (const s of simulate(input).scenarios) {
      expect(Object.values(s.contributions).reduce((a, b) => a + b, 0)).toBeCloseTo(s.impact, 10);
      expect(s.value).toBeCloseTo(input.capital * (1 + s.impact / 100), 8);
      expect(s.timeline.find(p => p.time === input.horizon)?.impact).toBe(s.impact);
      expect(s.timeline[0].impact).toBe(0);
    }
  });
  it('keeps selected-horizon values consistent with the timeline', () => {
    for (const horizon of HORIZONS) {
      const input = defaultInput(); input.horizon = horizon;
      const s = simulate(input).scenarios[1];
      expect(s.returns).toEqual(s.timeline.find(p => p.time === horizon)?.returns);
    }
  });
  it('rejects invalid allocations rather than silently normalizing', () => {
    const input = defaultInput(); input.weights.gold += 1;
    expect(() => simulate(input)).toThrow('weights');
    input.weights.gold = -1; expect(() => simulate(input)).toThrow();
  });
  it('rejects non-finite, wrong-type, duplicate and oversized input', () => {
    for (const bad of [NaN, Infinity, -Infinity, '50', null]) {
      const input = defaultInput(); (input.shocks[0] as unknown as Record<string, unknown>).magnitude = bad;
      expect(() => simulate(input)).toThrow();
    }
    const input = defaultInput(); input.shocks.push({ ...input.shocks[0] }); expect(() => simulate(input)).toThrow('duplicate');
    expect(() => parseInput({ ...defaultInput(), eventTime: '25:00' })).toThrow();
    expect(() => parseInput({ ...defaultInput(), title: 'x'.repeat(101) })).toThrow();
    expect(() => parseInput({ ...defaultInput(), shocks: [] })).toThrow();
    expect(() => parseInput({ ...defaultInput(), regime: 'unknown' })).toThrow();
  });
  it('round-trips only versioned validated assumptions, never imported outputs', () => {
    const input = template('compound'); expect(readSnapshot(snapshot(input))).toEqual(input);
    expect(() => readSnapshot('{')).toThrow(); expect(() => readSnapshot('x'.repeat(20001))).toThrow();
    expect(() => readSnapshot(JSON.stringify({ version: 999, model: MODEL_VERSION, input }))).toThrow('version');
    expect(() => readSnapshot(JSON.stringify({ version: 1, model: MODEL_VERSION, input: { ...input, capital: 0 } }))).toThrow();
  });
  it('is deterministic, does not mutate input, and stays finite at supported extremes', () => {
    const input = defaultInput(); const original = JSON.stringify(input);
    expect(simulate(input)).toEqual(simulate(input)); expect(JSON.stringify(input)).toBe(original);
    for (const kind of EVENT_KINDS) for (const magnitude of [LIMITS[kind].min, 0, LIMITS[kind].max]) {
      const scenario = defaultInput(); scenario.shocks = [{ kind, magnitude, expected: 0, pricedIn: 0 }];
      for (const s of simulate(scenario).scenarios) for (const value of Object.values(s.returns)) {
        expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(-95); expect(value).toBeLessThanOrEqual(200);
      }
    }
  });
  it('supplies non-empty Arabic, English and French strings for every visible label', () => {
    for (const group of [copy, assetLabels, caseLabels, eventLabels, explanations, factorLabels, horizonLabels, regimeLabels, templateLabels, units]) {
      for (const label of Object.values(group)) {
        expect(Object.keys(label).sort()).toEqual(['ar', 'en', 'fr']);
        for (const lang of ['ar', 'en', 'fr'] as const) expect(label[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
