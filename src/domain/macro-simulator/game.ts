import { ASSETS, MODEL_VERSION, defaultInput, parseInput, simulate, template, type Asset, type CaseId, type Input } from './engine';

/** No live data, random outcomes, investment-skill score, persistence or trade execution. */
export const GAME_VERSION = 'sfm-macro-game/1' as const;
export const ROUND_IDS = ['tightening', 'energy', 'slowdown'] as const;
export type RoundId = typeof ROUND_IDS[number];
export type Allocation = Record<Asset, number>;
export type Decision = { action: 'hold'; rationale: string } | { action: 'rebalance'; rationale: string; weights: Allocation };
export type RoundResult = {
  round: RoundId; decision: Decision; startingValue: number; endingValue: number;
  benchmarkStart: number; benchmarkEnd: number; impact: number;
  returns: Allocation; contributions: Allocation; openingHoldings: Allocation;
  paths: { id: CaseId; value: number; impact: number }[];
};
export type GameState = {
  version: typeof GAME_VERSION; model: typeof MODEL_VERSION;
  phase: 'planning' | 'revealed' | 'finished'; roundIndex: number;
  initialCapital: number; holdings: Allocation; benchmark: Allocation; history: RoundResult[];
};
const mapAssets = (fn: (asset: Asset) => number): Allocation => Object.fromEntries(ASSETS.map(asset => [asset, fn(asset)])) as Allocation;
export const valueOf = (holdings: Allocation): number => ASSETS.reduce((sum, asset) => sum + holdings[asset], 0);
const change = (end: number, start: number) => (end / start - 1) * 100;

/** Every round is a NEW fictional one-day shock, not a reapplication of a cumulative price path. */
export function roundInput(index: number): Input {
  if (!Number.isInteger(index) || index < 0 || index >= ROUND_IDS.length) throw new Error('round');
  const input = template((['hike', 'supply', 'recession'] as const)[index]);
  input.capital = 1; // Return generation must not constrain a compounded game balance.
  input.horizon = '1d';
  if (index === 1) input.regime = 'inflationary';
  return input;
}
export function startGame(capital = 100000): GameState {
  const input = parseInput({ ...defaultInput(), capital });
  const holdings = mapAssets(asset => capital * input.weights[asset] / 100);
  return { version: GAME_VERSION, model: MODEL_VERSION, phase: 'planning', roundIndex: 0,
    initialCapital: capital, holdings, benchmark: { ...holdings }, history: [] };
}
/** Display drafts only. Holding never uses rounded weights and never secretly rebalances. */
export function draftAllocation(holdings: Allocation): Allocation {
  const total = valueOf(holdings);
  if (!Number.isFinite(total) || total <= 0 || ASSETS.some(asset => !Number.isFinite(holdings[asset]) || holdings[asset] < 0)) throw new Error('holdings');
  const scaled = ASSETS.map(asset => holdings[asset] / total * 10000);
  const points = scaled.map(Math.floor);
  const order = ASSETS.map((_, index) => index).sort((a, b) => (scaled[b] - points[b]) - (scaled[a] - points[a]));
  const remaining = 10000 - points.reduce((sum, item) => sum + item, 0);
  for (let index = 0; index < remaining; index += 1) points[order[index % order.length]] += 1;
  return Object.fromEntries(ASSETS.map((asset, index) => [asset, points[index] / 100])) as Allocation;
}
function validateDecision(decision: Decision): Decision {
  if (!decision || typeof decision.rationale !== 'string') throw new Error('rationale');
  const rationale = decision.rationale.trim();
  if (rationale.length < 10 || rationale.length > 600) throw new Error('rationale');
  if (decision.action === 'hold') return { action: 'hold', rationale };
  if (decision.action !== 'rebalance') throw new Error('decision');
  let weights: Allocation;
  try { weights = parseInput({ ...defaultInput(), weights: decision.weights }).weights; }
  catch { throw new Error('weights'); }
  // A tolerance for floating arithmetic, not a way to create capital on each rebalance.
  if (Math.abs(valueOf(weights) - 100) > 1e-8) throw new Error('weights');
  return { action: 'rebalance', rationale, weights };
}
function afterReturns(holdings: Allocation, returns: Allocation): Allocation {
  return mapAssets(asset => holdings[asset] * (1 + returns[asset] / 100));
}
/** Atomic state transition: locks the decision and credits the reference path exactly once. */
export function settleRound(state: GameState, proposed: Decision): GameState {
  if (state.phase !== 'planning' || state.history.length !== state.roundIndex) throw new Error('phase');
  const input = roundInput(state.roundIndex);
  const decision = validateDecision(proposed);
  const startingValue = valueOf(state.holdings);
  const openingHoldings = decision.action === 'hold' ? { ...state.holdings }
    : mapAssets(asset => startingValue * decision.weights[asset] / 100);
  const report = simulate(input);
  const reference = report.scenarios.find(path => path.id === 'reference');
  if (!reference) throw new Error('model');
  const holdings = afterReturns(openingHoldings, reference.returns);
  const benchmark = afterReturns(state.benchmark, reference.returns);
  const endingValue = valueOf(holdings);
  const result: RoundResult = {
    round: ROUND_IDS[state.roundIndex], decision, startingValue, endingValue,
    benchmarkStart: valueOf(state.benchmark), benchmarkEnd: valueOf(benchmark),
    impact: change(endingValue, startingValue), returns: { ...reference.returns }, openingHoldings,
    contributions: mapAssets(asset => holdings[asset] - openingHoldings[asset]),
    paths: report.scenarios.map(path => {
      const value = valueOf(afterReturns(openingHoldings, path.returns));
      return { id: path.id, value, impact: change(value, startingValue) };
    }),
  };
  return { ...state, phase: 'revealed', holdings, benchmark, history: [...state.history, result] };
}
export function advanceRound(state: GameState): GameState {
  if (state.phase !== 'revealed' || state.history.length !== state.roundIndex + 1) throw new Error('phase');
  if (state.roundIndex === ROUND_IDS.length - 1) return { ...state, phase: 'finished' };
  return { ...state, phase: 'planning', roundIndex: state.roundIndex + 1 };
}
export function gameSummary(state: GameState) {
  const current = valueOf(state.holdings); const benchmark = valueOf(state.benchmark);
  let peak = state.initialCapital; let maxDrawdown = 0;
  for (const round of state.history) {
    peak = Math.max(peak, round.endingValue);
    maxDrawdown = Math.max(maxDrawdown, (peak - round.endingValue) / peak * 100);
  }
  return { current, benchmark, totalReturn: change(current, state.initialCapital),
    benchmarkReturn: change(benchmark, state.initialCapital), difference: current - benchmark,
    maxDrawdown, rounds: state.history.length };
}
