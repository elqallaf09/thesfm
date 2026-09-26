import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { ASSETS, MODEL_VERSION, defaultInput, simulate } from '../../domain/macro-simulator/engine';
import { GAME_VERSION, ROUND_IDS, advanceRound, draftAllocation, gameSummary, roundInput, settleRound, startGame, valueOf, type Allocation, type Decision } from '../../domain/macro-simulator/game';
import { gameCopy, modeCopy, roundCopy } from '../../components/macro-simulator/game-copy';

const reason = 'I am recording my assumptions and uncertainty before revealing the model outcome.';
const hold: Decision = { action: 'hold', rationale: reason };
const concentrated = (asset: typeof ASSETS[number]): Allocation => Object.fromEntries(ASSETS.map(id => [id, id === asset ? 100 : 0])) as Allocation;
const close = (actual: number, expected: number, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

describe('macro simulator sequential educational game', () => {
  it('starts with explicit model provenance, identical portfolios and no hidden result', () => {
    const state = startGame();
    assert.equal(state.model, MODEL_VERSION); assert.equal(state.version, GAME_VERSION);
    assert.equal(state.phase, 'planning'); assert.equal(state.roundIndex, 0);
    assert.deepEqual(state.history, []); assert.deepEqual(state.holdings, state.benchmark);
    assert.notEqual(state.holdings, state.benchmark); close(valueOf(state.holdings), 100000);
  });
  it('rejects invalid starting capital', () => {
    for (const capital of [NaN, Infinity, -1, 0, 1e9 + 1]) assert.throws(() => startGame(capital));
    assert.throws(() => startGame('100000' as unknown as number));
  });
  it('supplies three fresh, explicit one-day inputs', () => {
    assert.equal(ROUND_IDS.length, 3);
    for (let index = 0; index < ROUND_IDS.length; index += 1) {
      assert.equal(roundInput(index).horizon, '1d');
      assert.equal(simulate(roundInput(index)).calibration, 'illustrative');
      assert.equal(simulate(roundInput(index)).probabilities, null);
    }
    const first = roundInput(0); first.shocks[0].magnitude = 200;
    assert.equal(roundInput(0).shocks[0].magnitude, 50);
    assert.equal(roundInput(0).shocks[0].expected, 25);
    assert.equal(roundInput(1).shocks[0].magnitude, 20);
    assert.equal(roundInput(2).shocks[0].magnitude, -2);
  });
  it('rejects out-of-range and non-integer rounds', () => {
    for (const index of [-1, 3, NaN, Infinity, 0.5]) assert.throws(() => roundInput(index), /round/);
  });
  it('requires a meaningful-length recorded rationale without claiming to grade it', () => {
    for (const rationale of ['', 'short', ' '.repeat(100), 'a'.repeat(601)]) assert.throws(() => settleRound(startGame(), { action: 'hold', rationale }), /rationale/);
    const state = settleRound(startGame(), { action: 'hold', rationale: `  ${reason}  ` });
    assert.equal(state.history[0].decision.rationale, reason);
  });
  it('cannot advance before reveal, reveal twice or credit the same round twice', () => {
    const state = startGame(); assert.throws(() => advanceRound(state), /phase/);
    const settled = settleRound(state, hold);
    assert.throws(() => settleRound(settled, hold), /phase/);
    const next = advanceRound(settled);
    assert.equal(next.roundIndex, 1); assert.equal(next.phase, 'planning');
    assert.throws(() => advanceRound(next), /phase/);
  });
  it('keeps all-hold play identical to a genuine buy-and-hold comparator', () => {
    let state = startGame();
    for (let index = 0; index < 3; index += 1) {
      state = settleRound(state, hold);
      assert.deepEqual(state.holdings, state.benchmark);
      assert.equal(gameSummary(state).difference, 0);
      state = advanceRound(state);
    }
    assert.equal(state.phase, 'finished'); assert.equal(state.history.length, 3);
  });
  it('applies new incremental shocks to actual drifted holdings, not reset initial weights', () => {
    const first = settleRound(startGame(), hold);
    const second = settleRound(advanceRound(first), hold);
    const returns = simulate(roundInput(1)).scenarios.find(path => path.id === 'reference')!.returns;
    for (const asset of ASSETS) close(second.holdings[asset], first.holdings[asset] * (1 + returns[asset] / 100));
    assert.notDeepEqual(draftAllocation(first.holdings), defaultInput().weights);
  });
  it('leaves nominal USD cash unchanged after a deliberate all-cash rebalance', () => {
    let state = startGame();
    state = settleRound(state, { action: 'rebalance', rationale: reason, weights: concentrated('cash') });
    for (let index = 1; index < 3; index += 1) state = settleRound(advanceRound(state), hold);
    close(valueOf(state.holdings), state.initialCapital);
    assert.equal(state.history[0].returns.cash, 0);
    assert.notDeepEqual(state.holdings, state.benchmark);
  });
  it('rejects invalid weights and never silently normalizes a decision', () => {
    const good = defaultInput().weights;
    for (const value of [NaN, Infinity, -1, 101, 20.0001, '20', null]) {
      const weights = { ...good, gold: value } as Allocation;
      assert.throws(() => settleRound(startGame(), { action: 'rebalance', rationale: reason, weights }), /weights/);
    }
  });
  it('rejects unsupported actions', () => {
    assert.throws(() => settleRound(startGame(), { action: 'trade-real-money', rationale: reason } as unknown as Decision), /decision/);
  });
  it('credits only the reference sensitivity path and attributes its changes', () => {
    const state = settleRound(startGame(), hold); const result = state.history[0];
    assert.deepEqual(result.paths.map(path => path.id), ['contained', 'reference', 'amplified']);
    close(result.paths.find(path => path.id === 'reference')!.value, result.endingValue);
    close(valueOf(result.contributions), result.endingValue - result.startingValue);
    close(result.impact, (result.endingValue / result.startingValue - 1) * 100);
  });
  it('compounds rather than adding percentage returns', () => {
    let state = startGame();
    for (let index = 0; index < 3; index += 1) { state = settleRound(state, hold); state = advanceRound(state); }
    const factor = state.history.reduce((product, round) => product * (1 + round.impact / 100), 1);
    close(valueOf(state.holdings), state.initialCapital * factor);
    close(gameSummary(state).totalReturn, (factor - 1) * 100);
  });
  it('does not mutate state, caller weights or earlier locked decisions', () => {
    const initial = startGame(); const original = JSON.stringify(initial);
    const weights = concentrated('gold');
    const settled = settleRound(initial, { action: 'rebalance', weights, rationale: reason });
    assert.equal(JSON.stringify(initial), original);
    const journal = JSON.stringify(settled.history); weights.gold = 0;
    assert.equal(JSON.stringify(settled.history), journal);
    settleRound(advanceRound(settled), hold);
    assert.equal(JSON.stringify(settled.history), journal);
  });
  it('produces normalized display drafts without mutating or rebalancing holdings', () => {
    const state = settleRound(startGame(), hold); const before = JSON.stringify(state.holdings);
    const allocation = draftAllocation(state.holdings);
    close(valueOf(allocation), 100, 1e-10);
    for (const asset of ASSETS) { assert.ok(allocation[asset] >= 0); close(allocation[asset] * 100, Math.round(allocation[asset] * 100), 1e-9); }
    assert.equal(JSON.stringify(state.holdings), before);
    assert.throws(() => draftAllocation(Object.fromEntries(ASSETS.map(a => [a, 0])) as Allocation));
  });
  it('keeps round-end drawdown distinct from intraround market risk', () => {
    let state = startGame();
    for (let index = 0; index < 3; index += 1) { state = settleRound(state, hold); state = advanceRound(state); }
    const balances = [state.initialCapital, ...state.history.map(round => round.endingValue)];
    const expected = Math.max(...balances.map((value, index) => (Math.max(...balances.slice(0, index + 1)) - value) / Math.max(...balances.slice(0, index + 1)) * 100));
    close(gameSummary(state).maxDrawdown, expected);
  });
  it('allows a valid starting balance to grow beyond the initial input ceiling', () => {
    let state = settleRound(startGame(1e9), hold);
    state = settleRound(advanceRound(state), { action: 'rebalance', rationale: reason, weights: concentrated('oil') });
    assert.ok(valueOf(state.holdings) > 1e9);
    state = settleRound(advanceRound(state), hold);
    assert.ok(Number.isFinite(valueOf(state.holdings)));
  });
  it('finishes after the third revealed round and forbids further transitions', () => {
    let state = startGame();
    for (let index = 0; index < 3; index += 1) { state = settleRound(state, hold); state = advanceRound(state); }
    assert.equal(state.phase, 'finished');
    assert.throws(() => settleRound(state, hold), /phase/); assert.throws(() => advanceRound(state), /phase/);
  });
  it('has complete non-empty Arabic, English and French game copy', () => {
    for (const text of [...Object.values(modeCopy), ...Object.values(gameCopy), ...Object.values(roundCopy).flatMap(round => Object.values(round))]) {
      assert.deepEqual(Object.keys(text).sort(), ['ar', 'en', 'fr']);
      for (const language of ['ar', 'en', 'fr'] as const) assert.ok(text[language].trim().length > 0);
    }
    assert.deepEqual(Object.keys(roundCopy), [...ROUND_IDS]);
  });
});
