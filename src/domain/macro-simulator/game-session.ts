import { ASSETS, MODEL_VERSION, defaultInput, parseInput } from './engine';
import { GAME_VERSION, ROUND_IDS, advanceRound, draftAllocation, settleRound, startGame, valueOf, type Allocation, type Decision, type GameState } from './game';

export const GAME_SAVE_VERSION = 1 as const;
export const MAX_GAME_SAVE_BYTES = 20000;
export type GameDraft = { action: 'hold' | 'rebalance'; rationale: string; weights: Allocation };
export type RestoredGame = { game: GameState; draft: GameDraft };
const FORMAT = 'sfm-macro-game-save';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) throw new Error('invalid');
}
function readWeights(value: unknown): Allocation {
  const raw = record(value);
  exactKeys(raw, ASSETS);
  const weights = parseInput({ ...defaultInput(), weights: raw }).weights;
  if (Math.abs(valueOf(weights) - 100) > 1e-8) throw new Error('weights');
  return weights;
}
function readChoice(value: unknown, minimum: number): Decision {
  const raw = record(value);
  if (raw.action !== 'hold' && raw.action !== 'rebalance') throw new Error('decision');
  exactKeys(raw, raw.action === 'hold' ? ['action', 'rationale'] : ['action', 'rationale', 'weights']);
  if (typeof raw.rationale !== 'string' || raw.rationale.length > 600 || raw.rationale.trim().length < minimum) throw new Error('rationale');
  return raw.action === 'hold' ? { action: 'hold', rationale: raw.rationale }
    : { action: 'rebalance', rationale: raw.rationale, weights: readWeights(raw.weights) };
}
function draftFromChoice(choice: Decision, holdings: Allocation): GameDraft {
  return { ...choice, weights: choice.action === 'rebalance' ? { ...choice.weights } : draftAllocation(holdings) };
}
/** A namespace, not authentication or encryption. Only explicit UI actions access storage. */
export function gameStorageKey(userKey: string): string {
  if (typeof userKey !== 'string' || !userKey.trim() || userKey.length > 200) throw new Error('identity');
  return `sfm:macro-game:${GAME_SAVE_VERSION}:${encodeURIComponent(userKey)}`;
}
/** Save decisions, never balances, returns, user IDs, or imported result objects. */
export function serializeGame(game: GameState, draft: GameDraft): string {
  if (game.version !== GAME_VERSION || game.model !== MODEL_VERSION) throw new Error('version');
  const pending = draft.action === 'hold' ? { action: draft.action, rationale: draft.rationale }
    : { action: draft.action, rationale: draft.rationale, weights: draft.weights };
  const encoded = JSON.stringify({
    format: FORMAT, version: GAME_SAVE_VERSION, gameVersion: GAME_VERSION, model: MODEL_VERSION,
    initialCapital: game.initialCapital, phase: game.phase,
    decisions: game.history.map(round => ({ round: round.round, decision: round.decision })),
    ...(game.phase === 'planning' ? { draft: pending } : {}),
  });
  const restored = restoreGame(encoded);
  if (restored.game.roundIndex !== game.roundIndex) throw new Error('phase');
  return encoded;
}
/** Rebuild using the pinned teaching model; never trust persisted portfolio values. */
export function restoreGame(encoded: string): RestoredGame {
  if (typeof encoded !== 'string' || encoded.length > MAX_GAME_SAVE_BYTES || new TextEncoder().encode(encoded).length > MAX_GAME_SAVE_BYTES) throw new Error('size');
  const raw = record(JSON.parse(encoded));
  if (raw.format !== FORMAT || raw.version !== GAME_SAVE_VERSION || raw.gameVersion !== GAME_VERSION || raw.model !== MODEL_VERSION) throw new Error('version');
  if (raw.phase !== 'planning' && raw.phase !== 'revealed' && raw.phase !== 'finished') throw new Error('phase');
  exactKeys(raw, ['format', 'version', 'gameVersion', 'model', 'initialCapital', 'phase', 'decisions', ...(raw.phase === 'planning' ? ['draft'] : [])]);
  if (!Array.isArray(raw.decisions) || raw.decisions.length > ROUND_IDS.length) throw new Error('round');
  // startGame validates runtime capital even though the exported API is typed.
  const initial = parseInput({ ...defaultInput(), capital: raw.initialCapital }).capital;
  let game = startGame(initial);
  for (let index = 0; index < raw.decisions.length; index += 1) {
    const item = record(raw.decisions[index]);
    exactKeys(item, ['round', 'decision']);
    if (item.round !== ROUND_IDS[index]) throw new Error('round');
    game = settleRound(game, readChoice(item.decision, 10));
    if (index < raw.decisions.length - 1 || raw.phase !== 'revealed') game = advanceRound(game);
  }
  if (game.phase !== raw.phase) throw new Error('phase');
  if (game.phase === 'planning') return { game, draft: draftFromChoice(readChoice(raw.draft, 0), game.holdings) };
  const last = game.history[game.history.length - 1];
  if (!last) throw new Error('phase');
  return { game, draft: draftFromChoice(last.decision, last.openingHoldings) };
}
