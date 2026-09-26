import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { ASSETS, MODEL_VERSION, defaultInput } from '../../domain/macro-simulator/engine';
import { GAME_VERSION, advanceRound, draftAllocation, settleRound, startGame, valueOf, type Allocation, type GameState } from '../../domain/macro-simulator/game';
import { MAX_GAME_SAVE_BYTES, gameStorageKey, restoreGame, serializeGame, type GameDraft } from '../../domain/macro-simulator/game-session';
import { sessionCopy } from '../../components/macro-simulator/session-copy';

const rationale = 'أراجع الافتراضات والمخاطر قبل تثبيت القرار التعليمي.';
const draft = (game: GameState): GameDraft => ({ action: 'hold', rationale: '', weights: draftAllocation(game.holdings) });
const hold = { action: 'hold', rationale } as const;
const cash = Object.fromEntries(ASSETS.map(asset => [asset, asset === 'cash' ? 100 : 0])) as Allocation;
function decoded(game = startGame()) { return JSON.parse(serializeGame(game, draft(game))) as Record<string, unknown>; }
function rejects(patch: Record<string, unknown>) { assert.throws(() => restoreGame(JSON.stringify({ ...decoded(), ...patch }))); }
function allStates(): GameState[] {
  let game = startGame(123456.78); const states = [game];
  for (let round = 0; round < 3; round += 1) {
    game = settleRound(game, round === 1 ? { action: 'rebalance', rationale, weights: cash } : hold); states.push(game);
    game = advanceRound(game); states.push(game);
  }
  return states;
}

describe('macro game checkpoint integrity', () => {
  it('reconstructs all seven legal round/phase checkpoints exactly', () => {
    const states = allStates(); assert.equal(states.length, 7);
    for (const game of states) assert.deepEqual(restoreGame(serializeGame(game, draft(game))).game, game);
  });
  it('keeps an unfinished rationale without revealing or crediting a round', () => {
    const game = startGame(); const restored = restoreGame(serializeGame(game, { ...draft(game), rationale: 'أفكر' }));
    assert.equal(restored.draft.rationale, 'أفكر'); assert.equal(restored.game.history.length, 0);
    assert.throws(() => settleRound(restored.game, { action: 'hold', rationale: restored.draft.rationale }), /rationale/);
  });
  it('preserves a valid pending rebalance and its whitespace verbatim', () => {
    const game = advanceRound(settleRound(startGame(), hold));
    const proposed: GameDraft = { action: 'rebalance', rationale: '  pending decision  ', weights: cash };
    const restored = restoreGame(serializeGame(game, proposed));
    assert.deepEqual(restored.draft, proposed); assert.equal(restored.game.phase, 'planning');
    assert.notDeepEqual(restored.game.holdings, cash);
  });
  it('never uses dormant hold-mode weight edits to rebalance', () => {
    const game = advanceRound(settleRound(startGame(), hold));
    const restored = restoreGame(serializeGame(game, { action: 'hold', rationale, weights: cash }));
    assert.deepEqual(restored.game.holdings, game.holdings);
    assert.deepEqual(restored.draft.weights, draftAllocation(game.holdings));
    assert.deepEqual(settleRound(restored.game, hold), settleRound(game, hold));
  });
  it('restores locked fields from the recorded decision, not a supplied UI draft', () => {
    const game = settleRound(startGame(), { action: 'rebalance', rationale, weights: cash });
    const restored = restoreGame(serializeGame(game, { ...draft(game), rationale: 'different' }));
    assert.deepEqual(restored.draft, { action: 'rebalance', rationale, weights: cash });
    assert.throws(() => settleRound(restored.game, hold), /phase/);
  });
  it('continues the next round once without double credit', () => {
    const game = settleRound(startGame(), hold);
    const restored = restoreGame(serializeGame(game, draft(game))).game;
    const next = settleRound(advanceRound(restored), hold);
    assert.deepEqual(next, settleRound(advanceRound(game), hold)); assert.equal(next.history.length, 2);
    assert.throws(() => settleRound(next, hold), /phase/);
  });
  it('preserves drifted benchmark holdings rather than rebalancing them on restore', () => {
    const game = allStates()[4]; const restored = restoreGame(serializeGame(game, draft(game))).game;
    assert.deepEqual(restored.benchmark, game.benchmark);
    assert.notDeepEqual(draftAllocation(restored.benchmark), defaultInput().weights);
    assert.equal(valueOf(restored.holdings), valueOf(game.holdings));
  });
  it('exports no calculated output, account identity or user key', () => {
    const game = allStates()[5]; const encoded = serializeGame(game, draft(game));
    for (const forbidden of ['"holdings"', '"returns"', '"benchmark"', '"endingValue"', '"paths"', '"userKey"', '"account"', '"history"']) assert.equal(encoded.includes(forbidden), false);
    assert.equal(JSON.parse(encoded).decisions.length, 3);
  });
  it('ignores no top-level fabricated outputs: it rejects them', () => {
    for (const property of ['holdings', 'returns', 'endingValue', 'userKey', '__proto__']) rejects({ [property]: { cash: 1e9 } });
  });
  it('rejects wrong format, save version, game version and model', () => {
    for (const patch of [{ format: 'other' }, { version: 2 }, { gameVersion: `${GAME_VERSION}-new` }, { model: `${MODEL_VERSION}-new` }]) rejects(patch);
  });
  it('rejects incompatible phases and absent or extra drafts', () => {
    for (const phase of ['revealed', 'finished', 'unknown', null]) rejects({ phase });
    rejects({ draft: undefined });
    const locked = decoded(settleRound(startGame(), hold));
    assert.throws(() => restoreGame(JSON.stringify({ ...locked, draft: { action: 'hold', rationale } })));
  });
  it('rejects out-of-order, duplicated and skipped round identities', () => {
    const game = allStates()[3]; const saved = decoded(game);
    const decisions = saved.decisions as { round: string; decision: unknown }[];
    for (const rounds of [[decisions[1], decisions[0]], [decisions[0], decisions[0]], [{ ...decisions[0], round: 'slowdown' }]]) {
      assert.throws(() => restoreGame(JSON.stringify({ ...saved, decisions: rounds })));
    }
  });
  it('bounds replay to three decisions and rejects non-arrays', () => {
    for (const decisions of [null, {}, 'bad', Array(4).fill({ round: 'tightening', decision: hold })]) rejects({ decisions });
  });
  it('rejects forged result fields inside a saved round', () => {
    const saved = decoded(settleRound(startGame(), hold));
    const decisions = saved.decisions as Record<string, unknown>[];
    assert.throws(() => restoreGame(JSON.stringify({ ...saved, decisions: [{ ...decisions[0], endingValue: 1e9 }] })));
  });
  it('rejects unsupported actions and fabricated weights on hold decisions', () => {
    for (const choice of [{ action: 'buy', rationale }, { action: 'hold', rationale, weights: cash }, { action: 'hold' }]) rejects({ draft: choice });
  });
  it('rejects malformed or overlong rationales', () => {
    for (const reason of [null, 123, {}, 'x'.repeat(601)]) rejects({ draft: { action: 'hold', rationale: reason } });
    const saved = decoded(settleRound(startGame(), hold));
    assert.throws(() => restoreGame(JSON.stringify({ ...saved, decisions: [{ round: 'tightening', decision: { action: 'hold', rationale: 'short' } }] })));
  });
  it('rejects invalid capital without coercion', () => {
    for (const initialCapital of [0, -1, 1e9 + 1, '100000', null, true]) rejects({ initialCapital });
  });
  it('validates draft weights strictly without implicit normalization', () => {
    for (const weights of [{ ...cash, gold: 1 }, { ...cash, gold: -1, cash: 101 }, { ...cash, cash: '100' }, { ...cash, cash: null }, { ...cash, cash: 99.9999 }]) {
      rejects({ draft: { action: 'rebalance', rationale, weights } });
    }
  });
  it('requires exactly the supported asset keys', () => {
    const missing: Partial<Allocation> = { ...cash }; delete missing.oil;
    for (const weights of [missing, { ...cash, other: 0 }, Object.values(cash)]) rejects({ draft: { action: 'rebalance', rationale, weights } });
  });
  it('validates historical rebalance weights with the same strict contract', () => {
    const saved = decoded(settleRound(startGame(), hold));
    assert.throws(() => restoreGame(JSON.stringify({ ...saved, decisions: [{ round: 'tightening', decision: { action: 'rebalance', rationale, weights: { ...cash, cash: 99.9999 } } }] })));
  });
  it('rejects malformed JSON, primitive roots and oversized UTF-8 input', () => {
    for (const text of ['{', 'null', '[]', '42', '"text"', ' '.repeat(MAX_GAME_SAVE_BYTES + 1)]) assert.throws(() => restoreGame(text));
    const encoded = serializeGame(startGame(), draft(startGame()));
    const padded = ' '.repeat(MAX_GAME_SAVE_BYTES - encoded.length) + encoded;
    assert.ok(new TextEncoder().encode(padded).length <= MAX_GAME_SAVE_BYTES); restoreGame(padded);
    assert.throws(() => restoreGame(padded + ' '), /size/);
  });
  it('counts UTF-8 bytes, not just JavaScript string length', () => {
    const text = JSON.stringify({ ...decoded(), comment: 'ع'.repeat(12000) });
    assert.ok(text.length < MAX_GAME_SAVE_BYTES); assert.ok(new TextEncoder().encode(text).length > MAX_GAME_SAVE_BYTES);
    assert.throws(() => restoreGame(text), /size/);
  });
  it('does not mutate state or caller-owned draft allocations', () => {
    const game = allStates()[2]; const pending: GameDraft = { action: 'rebalance', rationale, weights: { ...cash } };
    const before = JSON.stringify({ game, pending }); const restored = restoreGame(serializeGame(game, pending));
    restored.draft.weights.cash = 0;
    assert.equal(JSON.stringify({ game, pending }), before);
  });
  it('round-trips tiny and maximum starting capital', () => {
    for (const capital of [1, 1.25, 1e9]) {
      const game = settleRound(startGame(capital), hold);
      assert.deepEqual(restoreGame(serializeGame(game, draft(game))).game, game);
    }
  });
  it('rejects inconsistent in-memory version and round index at save time', () => {
    const game = startGame();
    assert.throws(() => serializeGame({ ...game, roundIndex: 2 }, draft(game)), /phase/);
    assert.throws(() => serializeGame({ ...game, version: 'wrong' } as unknown as GameState, draft(game)), /version/);
  });
  it('uses separate account namespaces and rejects absent identity', () => {
    assert.notEqual(gameStorageKey('user-a'), gameStorageKey('user-b'));
    assert.notEqual(gameStorageKey('guest'), gameStorageKey('user-a'));
    assert.ok(gameStorageKey('a/b').endsWith('a%2Fb'));
    for (const key of ['', ' ', 'x'.repeat(201)]) assert.throws(() => gameStorageKey(key));
  });
  it('supplies every new visible message in Arabic, English and French', () => {
    for (const label of Object.values(sessionCopy)) {
      assert.deepEqual(Object.keys(label).sort(), ['ar', 'en', 'fr']);
      for (const value of Object.values(label)) assert.ok(value.trim().length > 0);
    }
  });
});
