/** Educational sensitivity model, NOT calibrated prices, probabilities or advice. */
export const MODEL_VERSION = 'sfm-macro-educational/1' as const;
export const ASSETS = ['gold', 'silver', 'oil', 'usd', 'equities', 'bonds', 'gcc', 'crypto', 'cash'] as const;
export const EVENT_KINDS = ['rates', 'inflation', 'oilSupply', 'growth', 'risk', 'gold'] as const;
export const HORIZONS = ['5m', '1h', '1d', '1w', '1m', '3m', '12m'] as const;
export const CASES = ['contained', 'reference', 'amplified'] as const;
export type Asset = typeof ASSETS[number];
export type EventKind = typeof EVENT_KINDS[number];
export type Horizon = typeof HORIZONS[number];
export type CaseId = typeof CASES[number];
export type Regime = 'balanced' | 'inflationary' | 'recessionary';
export type Shock = { kind: EventKind; magnitude: number; expected: number; pricedIn: number };
export type Input = {
  title: string; notes: string; eventTime: string; regime: Regime; horizon: Horizon;
  shocks: Shock[]; capital: number; weights: Record<Asset, number>;
};
export type Factor = 'yields' | 'prices' | 'demand' | 'risk' | 'dollar';
export const FACTORS: Factor[] = ['yields', 'prices', 'demand', 'risk', 'dollar'];
export type Factors = Record<Factor, number>;
export type Scenario = {
  id: CaseId; returns: Record<Asset, number>; impact: number; value: number;
  contributions: Record<Asset, number>; factors: Factors;
  timeline: { time: '0' | Horizon; returns: Record<Asset, number>; impact: number }[];
};
export type Report = {
  model: typeof MODEL_VERSION; input: Input; scenarios: Scenario[];
  calibration: 'illustrative'; probabilities: null; marketData: 'not-connected';
};
export const LIMITS: Record<EventKind, { min: number; max: number; step: number }> = {
  rates: { min: -200, max: 200, step: 25 }, inflation: { min: -3, max: 3, step: 0.1 },
  oilSupply: { min: -50, max: 100, step: 5 }, growth: { min: -5, max: 5, step: 0.1 },
  risk: { min: -3, max: 3, step: 0.25 }, gold: { min: -30, max: 30, step: 1 },
};
export function defaultInput(): Input {
  return { title: '', notes: '', eventTime: '21:00', regime: 'balanced', horizon: '1d',
    shocks: [{ kind: 'rates', magnitude: 50, expected: 25, pricedIn: 0 }], capital: 100000,
    weights: { gold: 20, silver: 5, oil: 10, usd: 0, equities: 30, bonds: 10, gcc: 10, crypto: 5, cash: 10 } };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('invalid');
  return value;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('invalid');
  return value;
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error('invalid');
  return value as T;
}
/** Strict validation is shared by the UI, engine and imported snapshots. */
export function parseInput(value: unknown): Input {
  const raw = object(value); const weights = object(raw.weights);
  if (!Array.isArray(raw.shocks) || raw.shocks.length < 1 || raw.shocks.length > 4) throw new Error('invalid');
  const shocks = raw.shocks.map((item): Shock => {
    const shock = object(item); const kind = oneOf(shock.kind, EVENT_KINDS); const limits = LIMITS[kind];
    return { kind, magnitude: number(shock.magnitude, limits.min, limits.max),
      expected: number(shock.expected, -200, 200), pricedIn: number(shock.pricedIn, 0, 100) };
  });
  if (new Set(shocks.map(s => s.kind)).size !== shocks.length) throw new Error('duplicate');
  const allocation = Object.fromEntries(ASSETS.map(id => [id, number(weights[id], 0, 100)])) as Record<Asset, number>;
  if (Math.abs(Object.values(allocation).reduce((a, b) => a + b, 0) - 100) > 0.001) throw new Error('weights');
  const eventTime = text(raw.eventTime, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(eventTime)) throw new Error('invalid');
  return { title: text(raw.title, 100), notes: text(raw.notes, 1200), eventTime,
    regime: oneOf(raw.regime, ['balanced', 'inflationary', 'recessionary']), horizon: oneOf(raw.horizon, HORIZONS),
    shocks, capital: number(raw.capital, 1, 1e9), weights: allocation };
}
/** Units are deliberately stylized; these coefficients are product assumptions, not empirical estimates. */
export const SENSITIVITY: Record<Asset, Record<Factor, number>> = {
  gold: { yields: -0.7, prices: 0.3, demand: 0.1, risk: 0.8, dollar: -0.7 },
  silver: { yields: -0.8, prices: 0.4, demand: 0.8, risk: -0.2, dollar: -0.8 },
  oil: { yields: -0.1, prices: 0.1, demand: 1.3, risk: -0.1, dollar: -0.3 },
  usd: { yields: 0.4, prices: -0.1, demand: 0.2, risk: 0.3, dollar: 0.7 },
  equities: { yields: -0.8, prices: -0.3, demand: 1.1, risk: -1.0, dollar: -0.2 },
  bonds: { yields: -1.5, prices: -0.4, demand: -0.2, risk: 0.4, dollar: 0 },
  gcc: { yields: -0.5, prices: -0.1, demand: 0.7, risk: -0.9, dollar: -0.1 },
  crypto: { yields: -1.2, prices: -0.3, demand: 0.9, risk: -1.5, dollar: -0.6 },
  cash: { yields: 0, prices: 0, demand: 0, risk: 0, dollar: 0 },
};
const TRANSMISSION: Record<Exclude<EventKind, 'gold'>, Factors> = {
  rates: { yields: 1, prices: -0.15, demand: -0.25, risk: 0.2, dollar: 0.5 },
  inflation: { yields: 0.7, prices: 1, demand: -0.3, risk: 0.2, dollar: 0.3 },
  oilSupply: { yields: 0.12, prices: 0.45, demand: -0.2, risk: 0.15, dollar: 0.05 },
  growth: { yields: 0.2, prices: 0.2, demand: 1, risk: -0.2, dollar: 0.1 },
  risk: { yields: -0.2, prices: 0, demand: -0.4, risk: 1, dollar: 0.25 },
};
const STRENGTH: Record<CaseId, number> = { contained: 0.55, reference: 1, amplified: 1.6 };
const TIME_RESPONSE: Record<'0' | Horizon, number> = { '0': 0, '5m': 0.28, '1h': 0.48, '1d': 0.68, '1w': 0.87, '1m': 1, '3m': 1.06, '12m': 0.82 };
const clamp = (n: number) => {
  const bounded = Math.max(-95, Math.min(200, n));
  // Multiplication by a zero surprise can produce -0; a flat asset has one canonical zero.
  return bounded === 0 ? 0 : bounded;
};
export function surprise(shock: Shock): number {
  if (shock.kind === 'rates') return (shock.magnitude - shock.expected) / 25;
  const scale = shock.kind === 'inflation' ? 0.5 : shock.kind === 'oilSupply' ? 10 : 1;
  return shock.magnitude / scale * (1 - shock.pricedIn / 100);
}
function buildFactors(input: Input): Factors {
  const result: Factors = { yields: 0, prices: 0, demand: 0, risk: 0, dollar: 0 };
  for (const shock of input.shocks) {
    if (shock.kind === 'gold') continue; // A price change alone establishes no causal effect on other assets.
    const size = surprise(shock);
    for (const factor of FACTORS) result[factor] += size * TRANSMISSION[shock.kind][factor];
  }
  if (input.regime === 'inflationary') { result.yields *= 1.25; result.prices *= 1.3; }
  if (input.regime === 'recessionary') { result.demand *= 1.4; result.risk *= 1.25; }
  return result;
}
export function simulate(value: unknown): Report {
  const input = parseInput(value); const factors = buildFactors(input);
  const directGold = input.shocks.filter(s => s.kind === 'gold').reduce((n, s) => n + surprise(s), 0);
  const directOil = input.shocks.filter(s => s.kind === 'oilSupply').reduce((n, s) => n + surprise(s) * 10, 0);
  const portfolio = (returns: Record<Asset, number>) => ASSETS.reduce((n, id) => n + returns[id] * input.weights[id] / 100, 0);
  const scenarios = CASES.map((id): Scenario => {
    const at = (time: '0' | Horizon) => Object.fromEntries(ASSETS.map(asset => {
      const indirect = FACTORS.reduce((n, f) => n + factors[f] * SENSITIVITY[asset][f], 0);
      const direct = asset === 'gold' ? directGold : asset === 'oil' ? directOil : asset === 'gcc' ? directOil * 0.04 : 0;
      return [asset, clamp((indirect + direct) * STRENGTH[id] * TIME_RESPONSE[time])];
    })) as Record<Asset, number>;
    const returns = at(input.horizon); const impact = portfolio(returns);
    return { id, returns, impact, value: input.capital * (1 + impact / 100),
      contributions: Object.fromEntries(ASSETS.map(asset => [asset, returns[asset] * input.weights[asset] / 100])) as Record<Asset, number>,
      factors: Object.fromEntries(FACTORS.map(f => [f, factors[f] * STRENGTH[id]])) as Factors,
      timeline: (['0', ...HORIZONS] as const).map(time => { const changes = at(time); return { time, returns: changes, impact: portfolio(changes) }; }) };
  });
  return { model: MODEL_VERSION, input, scenarios, calibration: 'illustrative', probabilities: null, marketData: 'not-connected' };
}
export function snapshot(input: Input): string {
  return JSON.stringify({ version: 1, model: MODEL_VERSION, input: parseInput(input) }, null, 2);
}
export function readSnapshot(value: string): Input {
  if (value.length > 20000) throw new Error('invalid');
  const raw = object(JSON.parse(value));
  if (raw.version !== 1 || raw.model !== MODEL_VERSION) throw new Error('version');
  return parseInput(raw.input);
}
export type Template = 'hike' | 'cut' | 'supply' | 'inflation' | 'recession' | 'risk' | 'compound' | 'gold';
export const TEMPLATES: Template[] = ['hike', 'cut', 'supply', 'inflation', 'recession', 'risk', 'compound', 'gold'];
export function template(id: Template): Input {
  const input = defaultInput();
  const shock = (kind: EventKind, magnitude: number, expected = 0): Shock => ({ kind, magnitude, expected, pricedIn: 0 });
  const scenarios: Record<Template, Shock[]> = {
    hike: [shock('rates', 50, 25)], cut: [shock('rates', -50, -25)],
    supply: [shock('oilSupply', 20)], inflation: [shock('inflation', 0.5)],
    recession: [shock('growth', -2)], risk: [shock('risk', 1)],
    compound: [shock('rates', 50, 25), shock('oilSupply', 25), shock('growth', -1)], gold: [shock('gold', 5)],
  };
  input.shocks = scenarios[id];
  if (id === 'recession') input.regime = 'recessionary';
  return input;
}
