import 'server-only';
import { after } from 'next/server';
import type { Investment } from '@/types/investment';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvQuote } from '@/lib/markets-tv/types';
import { summarizeTvPortfolioPositions, type TvPortfolioPosition, type TvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { quoteStatus, toTvQuote } from '@/lib/markets-tv/quotes';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { getFxRate, type FxRateResult } from '@/lib/market/fxRates';
import { resolveTvQuotes } from './quoteLoader';
import { portfolioMarketTarget, portfolioTargetKey, type PortfolioMarketTarget } from './portfolioAssets';

const MAX_LISTINGS = 100;
const MAX_FX_PAIRS = 128;
const BUDGET_MS = 9_000;
const BACKGROUND_BUDGET_MS = 30_000;
const MAX_FX_AGE_MS = 36 * 60 * 60_000;
const cache = new Map<string, { expires: number; quote: TvQuote | null }>();
const pending = new Map<string, Promise<TvQuote | null>>();
const fxPending = new Map<string, Promise<FxRateResult>>();

/** Exact provider contracts: USD is not USDT, and spot metal is not a future. */
export function portfolioSpecialQuoteMatches(target: PortfolioMarketTarget, row: SfmMarketQuote) {
  if (row.currency !== target.asset.currency) return false;
  const provider = row.provenance.upstreamProvider, supplied = row.provenance.providerSymbol?.toUpperCase();
  if (!provider || !supplied) return false;
  if (target.kind === 'crypto-usd') {
    const base = target.asset.baseCurrency;
    const expected: Record<string, string> = { fmp: `${base}USD`, twelve_data: `${base}/USD`, eodhd: `${base}-USD.CC` };
    return row.assetType === 'crypto' && supplied === expected[provider]
      && row.symbol.toUpperCase().replace(/[-/]/g, '') === `${base}USD`;
  }
  if (target.kind !== 'metal' || !['gold', 'commodity'].includes(row.assetType)) return false;
  const metal = target.asset.symbol === 'XAUUSD' ? 'XAU' : 'XAG';
  const expected: Record<string, string> = { twelve_data: `${metal}/USD`, eodhd: `${metal}USD.FOREX`, ...(metal === 'XAG' ? { gold_api: 'XAG' } : {}) };
  return supplied === expected[provider] && row.symbol.toUpperCase().replace(/[-/]/g, '') === `${metal}USD`;
}

function specialQuote(target: PortfolioMarketTarget): Promise<TvQuote | null> {
  const key = portfolioTargetKey(target), previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return Promise.resolve(previous.quote);
  const running = pending.get(key); if (running) return running;
  const backgroundDeadline = Date.now() + BACKGROUND_BUDGET_MS;
  const work = getSfmMarketQuote(target.asset.symbol, {
    assetType: target.kind === 'crypto-usd' ? 'crypto' : 'commodity',
    preferredProviders: target.kind === 'metal' ? ['gold_api', 'twelve_data', 'eodhd'] : ['fmp', 'twelve_data', 'eodhd'],
    // Finnhub crypto quotes are denominated in USDT. Its metal aliases may
    // identify futures. Neither contract can price these saved holdings.
    excludeProviders: target.kind === 'metal' ? ['finnhub', 'fmp', 'marketstack'] : ['finnhub', 'marketstack'],
  }).then(row => row && portfolioSpecialQuoteMatches(target, row) ? toTvQuote(target.asset.symbol, row) : null)
    .catch(() => null).then(quote => {
      if (cache.size >= 256) cache.delete(cache.keys().next().value!);
      cache.set(key, { quote, expires: Date.now() + 30_000 });
      return quote;
    }).finally(() => pending.delete(key));
  pending.set(key, work);
  // A sequential provider fallback can outlast the TV response budget. Keep
  // this public quote alive for the next refresh without prolonging the UI
  // wait or retaining the invocation indefinitely after a provider failure.
  try { after(async () => { await beforeDeadline(work, backgroundDeadline, null); }); } catch { /* No request scope in offline callers. */ }
  return work;
}

function sharedFx(from: string, to: string) {
  const key = `${from}:${to}`, running = fxPending.get(key); if (running) return running;
  const work = getFxRate(from, to).finally(() => fxPending.delete(key));
  fxPending.set(key, work); return work;
}

export function usablePortfolioFx(result: FxRateResult | null | undefined, from: string, to: string, now = Date.now()): result is FxRateResult & { rate: number } {
  const observed = Date.parse(result?.lastUpdated || '');
  return Boolean(result?.available && result.identityVerified && !result.stale && result.from === from && result.to === to
    && result.source && typeof result.rate === 'number' && Number.isFinite(result.rate) && result.rate > 0
    && Number.isFinite(observed) && observed <= now + 60_000 && now - observed <= MAX_FX_AGE_MS);
}

async function beforeDeadline<T>(work: Promise<T>, deadline: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work.catch(() => fallback), new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), Math.max(0, deadline - Date.now())); })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function marketQuotes(targets: PortfolioMarketTarget[], deadline: number) {
  const rows = new Map<string, TvQuote>();
  const ordinary = targets.filter(target => target.kind === 'listing' || target.kind === 'crypto-usdt');
  const ordinaryWork = ordinary.length ? beforeDeadline(resolveTvQuotes(ordinary.map(target => target.asset), 'watchlist'), deadline, []).then(quotes => {
    quotes.forEach((quote, index) => { if (ordinary[index]) rows.set(portfolioTargetKey(ordinary[index]), quote); });
  }) : Promise.resolve();
  const specials = targets.filter(target => target.kind === 'metal' || target.kind === 'crypto-usd');
  let cursor = 0;
  async function worker() {
    while (cursor < specials.length && Date.now() < deadline) {
      const target = specials[cursor++];
      const quote = await beforeDeadline(specialQuote(target), deadline, null);
      if (quote) rows.set(portfolioTargetKey(target), quote);
    }
  }
  await Promise.all([ordinaryWork, ...Array.from({ length: Math.min(4, specials.length) }, () => worker())]);
  return rows;
}

function marketPosition(original: TvPortfolioPosition, target: PortfolioMarketTarget, quote: TvQuote | undefined, now: number): TvPortfolioPosition {
  const failed: TvPortfolioPosition = { ...original, valuationKind: 'recorded', valuationIssue: 'quote_unavailable' };
  if (!quote || quote.issue || quote.symbol !== target.asset.symbol || quote.currency !== target.asset.currency || !quote.source) return failed;
  const state = quoteStatus(quote, now);
  if (['unavailable', 'stale', 'unknown_time'].includes(state) || quote.price === null || !quote.observedAt) return failed;
  const previousAt = Date.parse(original.valuedAt || '');
  if (Number.isFinite(previousAt) && Date.parse(quote.observedAt) < previousAt) return failed;
  const amount = quote.price * target.multiplier;
  if (!Number.isFinite(amount) || amount <= 0) return failed;
  return {
    ...original, value: { amount, currency: quote.currency! }, baseValue: null, valuationKind: 'market', quoteStatus: state, marketQuote: quote,
    source: quote.source, valuedAt: quote.observedAt, freshness: 'recorded',
    recordedValue: original.value, recordedBaseValue: original.baseValue, recordedValuedAt: original.valuedAt, recordedSource: original.source,
  };
}

type PortfolioMoney = NonNullable<TvPortfolioPosition['value']>;
type PortfolioRates = ReadonlyMap<string, FxRateResult | null>;

function valueIn(value: PortfolioMoney | null | undefined, currency: string | null | undefined, rates: PortfolioRates, now: number) {
  if (!value || !currency || !Number.isFinite(value.amount) || value.amount < 0) return { amount: null, fx: null };
  if (value.currency === currency) return { amount: value.amount, fx: null };
  const rate = rates.get(`${value.currency}:${currency}`);
  if (!usablePortfolioFx(rate, value.currency, currency, now)) return { amount: null, fx: null };
  const amount = value.amount * rate.rate;
  return Number.isFinite(amount) && amount >= 0 ? { amount, fx: rate } : { amount: null, fx: null };
}

function convertPosition(position: TvPortfolioPosition, currency: string, rates: PortfolioRates, now: number): TvPortfolioPosition {
  const selected = valueIn(position.value, currency, rates, now);
  const holdingCurrency = position.holdingCurrency;
  const holding = valueIn(position.value, holdingCurrency, rates, now);
  const capital = valueIn(position.cost, currency, rates, now);
  return {
    ...position,
    recordedValue: position.recordedValue === undefined ? position.value : position.recordedValue,
    recordedBaseValue: position.recordedBaseValue === undefined ? position.baseValue : position.recordedBaseValue,
    holdingValue: holding.amount !== null && holdingCurrency ? { amount: holding.amount, currency: holdingCurrency } : null,
    baseValue: selected.amount, baseCost: capital.amount,
    fxSource: selected.fx?.source ?? null, fxAt: selected.fx?.lastUpdated ?? null,
    holdingFxSource: holding.fx?.source ?? null, holdingFxAt: holding.fx?.lastUpdated ?? null,
    costFxSource: capital.fx?.source ?? null, costFxAt: capital.fx?.lastUpdated ?? null,
    ...(position.value && selected.amount === null && !position.valuationIssue ? { valuationIssue: 'fx_unavailable' as const } : {}),
  };
}

async function portfolioRates(snapshot: TvPortfolioSnapshot, resolved: Awaited<ReturnType<typeof portfolioMarketTarget>>[], deadline: number) {
  const pairs = new Map<string, { from: string; to: string }>();
  function add(from: string | null | undefined, to: string | null | undefined) {
    // USDT and other non-fiat quote units are never treated as a USD peg.
    if (from && to && from !== to && /^[A-Z]{3}$/.test(from) && /^[A-Z]{3}$/.test(to) && pairs.size < MAX_FX_PAIRS) pairs.set(`${from}:${to}`, { from, to });
  }
  snapshot.positions.forEach((position, index) => {
    const quoteCurrency = resolved[index]?.target?.asset.currency;
    for (const from of [position.value?.currency, quoteCurrency]) {
      add(from, snapshot.currency);
      add(from, position.holdingCurrency);
    }
    add(position.cost?.currency, snapshot.currency);
  });
  const entries = [...pairs.entries()], rates = new Map<string, FxRateResult | null>();
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length && Date.now() < deadline) {
      const [key, pair] = entries[cursor++];
      rates.set(key, await beforeDeadline(sharedFx(pair.from, pair.to), deadline, null));
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, () => worker()));
  return rates;
}

/** A private response overlay only. Public caches never contain holdings,
 * quantities, user titles or owners, and no investment record is written. */
export async function withPortfolioMarketValues(items: Investment[], snapshot: TvPortfolioSnapshot): Promise<TvPortfolioSnapshot> {
  const resolved: Awaited<ReturnType<typeof portfolioMarketTarget>>[] = await Promise.all(items.map(item => portfolioMarketTarget(item).catch(() => ({ eligible: true, issue: 'identity_unverified' as const }))));
  const unique = new Map<string, PortfolioMarketTarget>();
  for (const entry of resolved) if (entry.target && unique.size < MAX_LISTINGS) unique.set(portfolioTargetKey(entry.target), entry.target);
  const targets = [...unique.values()], deadline = Date.now() + BUDGET_MS;
  // FX and prices start together, so a slow source cannot add another full wait.
  const [quotes, rates] = await Promise.all([
    marketQuotes(targets, deadline),
    portfolioRates(snapshot, resolved, deadline),
  ]);
  const now = Date.now();
  const positions = snapshot.positions.map((original, index) => {
    const entry = resolved[index];
    const position = !entry?.eligible ? { ...original, valuationKind: 'manual' as const }
      : !entry.target ? { ...original, valuationKind: 'recorded' as const, valuationIssue: entry.issue }
      : marketPosition(original, entry.target, quotes.get(portfolioTargetKey(entry.target)), now);
    return convertPosition(position, snapshot.currency, rates, now);
  });
  return { ...summarizeTvPortfolioPositions(positions, snapshot.currency, snapshot.generatedAt),
    marketCoverage: positions.filter(position => position.valuationKind === 'market' && position.baseValue !== null).length,
    marketEligible: resolved.filter(entry => entry.eligible).length };
}

export function __resetPortfolioQuoteCacheForTests() { cache.clear(); pending.clear(); fxPending.clear(); }
