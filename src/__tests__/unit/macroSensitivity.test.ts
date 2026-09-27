import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { ASSETS, CASES, EVENT_KINDS, LIMITS, defaultInput, parseInput, simulate, template, type CaseId, type EventKind } from '../../domain/macro-simulator/engine';
import { sensitivitySweep } from '../../domain/macro-simulator/sensitivity';
import { sensitivityCopy } from '../../components/macro-simulator/sensitivity-copy';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

describe('one-shock educational sensitivity', () => {
  it('builds five distinct legal rates around the exact baseline', () => {
    const sweep = sensitivitySweep(defaultInput(), 'rates');
    assert.deepEqual(sweep.points.map(point => point.magnitude), [0, 25, 50, 75, 100]);
    assert.equal(sweep.points.filter(point => point.baseline).length, 1);
    const baseline = sweep.points.find(point => point.baseline)!;
    const original = simulate(defaultInput()).scenarios[1];
    assert.deepEqual(baseline.returns, original.returns);
    assert.equal(baseline.impact, original.impact);
    assert.equal(baseline.value, original.value);
    assert.equal(baseline.deltaImpact, 0);
  });
  it('matches the original model for every path without mutating any assumptions', () => {
    for (const caseId of CASES) for (const kind of ['rates', 'oilSupply', 'growth'] as const) {
      const input = template('compound');
      const before = JSON.stringify(input);
      const sweep = sensitivitySweep(input, kind, caseId);
      const base = simulate(input).scenarios.find(path => path.id === caseId)!;
      for (const point of sweep.points) {
        const variant = { ...input, shocks: input.shocks.map(shock => shock.kind === kind ? { ...shock, magnitude: point.magnitude } : shock) };
        const result = simulate(variant).scenarios.find(path => path.id === caseId)!;
        assert.deepEqual(point.returns, result.returns);
        near(point.impact, result.impact);
        near(point.deltaImpact, result.impact - base.impact);
        near(point.value, input.capital * (1 + point.impact / 100));
      }
      assert.equal(JSON.stringify(input), before);
      sweep.input.weights.gold = 0;
      sweep.input.shocks[0].expected = 200;
      assert.equal(JSON.stringify(input), before);
    }
  });
  it('retains five valid nonduplicated points at every supported bound and normalizes floating steps', () => {
    for (const kind of EVENT_KINDS) for (const magnitude of [LIMITS[kind].min, 0, LIMITS[kind].max]) {
      const input = defaultInput(); input.shocks = [{ kind, magnitude, expected: 0, pricedIn: 0 }];
      const { points } = sensitivitySweep(input, kind);
      assert.equal(points.length, 5);
      assert.equal(new Set(points.map(point => point.magnitude)).size, 5);
      assert.equal(points.filter(point => point.baseline).length, 1);
      assert.equal(points.find(point => point.baseline)!.magnitude, magnitude);
      for (const point of points) {
        parseInput({ ...input, shocks: [{ ...input.shocks[0], magnitude: point.magnitude }] });
        assert.ok(Number.isFinite(point.impact) && Number.isFinite(point.deltaImpact) && Number.isFinite(point.value));
        for (const asset of ASSETS) assert.ok(Number.isFinite(point.returns[asset]));
      }
      assert.deepEqual(points.map(point => point.magnitude), points.map(point => point.magnitude).sort((a, b) => a - b));
    }
    const input = template('inflation'); input.shocks[0].magnitude = 0.3;
    assert.deepEqual(sensitivitySweep(input, 'inflation').points.map(point => point.magnitude), [0.1, 0.2, 0.3, 0.4, 0.5]);
  });
  it('holds prior rate expectations fixed rather than shifting them with the announcement', () => {
    const input = defaultInput();
    const sweep = sensitivitySweep(input, 'rates');
    assert.equal(sweep.input.shocks[0].expected, 25);
    assert.equal(sweep.points.find(point => point.magnitude === 25)!.impact, 0);
    assert.notEqual(sweep.points.find(point => point.magnitude === 50)!.impact, 0);
  });
  it('does not force oil or dollar moves from gold-only changes', () => {
    for (const point of sensitivitySweep(template('gold'), 'gold').points) {
      for (const asset of ASSETS.filter(asset => asset !== 'gold')) assert.equal(point.returns[asset], 0);
      near(point.impact, point.returns.gold * 0.2);
    }
  });
  it('fully priced non-rate shocks remain flat for every magnitude', () => {
    const input = template('supply'); input.shocks[0].pricedIn = 100;
    for (const point of sensitivitySweep(input, 'oilSupply').points) {
      assert.equal(point.impact, 0); assert.equal(point.deltaImpact, 0);
      for (const asset of ASSETS) assert.equal(point.returns[asset], 0);
    }
  });
  it('rejects invalid source data, unknown paths and shocks absent from the source', () => {
    assert.throws(() => sensitivitySweep({ ...defaultInput(), capital: NaN }, 'rates'));
    assert.throws(() => sensitivitySweep(defaultInput(), 'oilSupply'), /shock/);
    assert.throws(() => sensitivitySweep(defaultInput(), 'other' as EventKind), /shock/);
    assert.throws(() => sensitivitySweep(defaultInput(), 'rates', 'other' as CaseId), /case/);
    const input = defaultInput(); input.shocks[0].magnitude = 51;
    assert.throws(() => sensitivitySweep(input, 'rates'));
  });
  it('has complete trilingual copy and no new numerical model or probability output', () => {
    for (const label of Object.values(sensitivityCopy)) {
      assert.deepEqual(Object.keys(label).sort(), ['ar', 'en', 'fr']);
      for (const text of Object.values(label)) assert.ok(text.trim().length);
    }
    const input = sensitivitySweep(defaultInput(), 'rates').input;
    const report = simulate(input);
    assert.equal(report.calibration, 'illustrative');
    assert.equal(report.probabilities, null);
    assert.equal(report.marketData, 'not-connected');
  });
});
