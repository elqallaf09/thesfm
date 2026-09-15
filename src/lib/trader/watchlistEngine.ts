import 'server-only';
import { getTraderMarketCatalog, type TraderCatalogSymbol } from '@/lib/trader/marketCatalog';
import { fetchTraderQuotesDetailed, type TraderQuote, type TraderQuoteLoadResult } from '@/lib/trader/marketQuotes';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';

/** Owned orchestration, not a replacement for licensed market-data sources. */
export const WATCHLIST_ENGINE_VERSION = 1;
export const WATCHLIST_BATCH_LIMIT = 50;
const FRESH_MS = 60_000;
const ANALYSIS_FRESH_MS = 180_000;
const MAX_QUOTE_AGE_MS = 15 * 60_000;
const RETAIN_MS = 7 * 24 * 60 * 60_000;
const MAX_MEMORY_ENTRIES = 500;
export type WatchlistPhase = 'quotes' | 'analysis';
type Snapshot = { version: 1; fetchedAt: number; quote: TraderQuote };
export type WatchlistState = {
  version: 1;
  quoteStatus: 'available' | 'cached' | 'last_known' | 'stale' | 'timestamp_unknown' | 'unavailable';
  analysisStatus: 'pending' | 'available' | 'insufficient_data' | 'stale';
  asOf: string | null;
  fetchedAt: string | null;
  reason: string | null;
};
export type WatchlistRow = Partial<TraderQuote> & { symbol: string; requestedSymbol: string; engine: WatchlistState };

type Dependencies = {
  now: () => number;
  catalog: () => Promise<{ symbols: TraderCatalogSymbol[] }>;
  load: typeof fetchTraderQuotesDetailed;
  read: (key: string) => Promise<Snapshot | null>;
  write: (key: string, value: Snapshot, ttlMs: number) => Promise<void>;
};

export function parseWatchlistSymbols(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  if (raw.length > 2_100) throw new Error('INVALID_SYMBOLS');
  const values = raw.split(',').map(value => value.trim().toUpperCase());
  if (values.some(value => !/^[A-Z0-9^][A-Z0-9.^=/_-]{0,39}$/.test(value))) throw new Error('INVALID_SYMBOLS');
  const symbols = Array.from(new Set(values));
  if (symbols.length > WATCHLIST_BATCH_LIMIT) throw new Error('TOO_MANY_SYMBOLS');
  return symbols;
}

function time(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

function usable(quote: Partial<TraderQuote> | undefined): quote is TraderQuote {
  return Boolean(quote && quote.available === true && typeof quote.price === 'number'
    && Number.isFinite(quote.price) && quote.price > 0
    && typeof quote.currency === 'string' && /^[A-Z]{3}$/.test(quote.currency)
    && quote.provider && quote.source);
}

/** Cache/DB failure must not hold the provider path hostage. Late rejects are consumed. */
async function bounded<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise.catch(() => fallback), new Promise<T>(resolve => {
      timer = setTimeout(() => resolve(fallback), ms);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function compact(quote: TraderQuote): TraderQuote {
  // These are public quote/analysis fields only: never store the user's watchlist,
  // account, position sizes, provider payloads, or credentials in a shared cache.
  return { ...quote, history: [], sparkline: [] };
}

function rowFor(requestedSymbol: string, snapshot: Snapshot | null, phase: WatchlistPhase,
  now: number, fallback: boolean, reason: string | null = null): WatchlistRow {
  const quote = snapshot?.quote;
  const asOf = quote?.lastUpdated ?? quote?.updatedAt ?? null;
  const sourceTime = time(asOf);
  const knownTime = sourceTime !== null && sourceTime <= now + 60_000;
  const old = knownTime && now - sourceTime > MAX_QUOTE_AGE_MS;
  const analysisAvailable = Boolean(quote && phase === 'analysis' && !fallback && !old && knownTime
    && quote.signalAvailable && quote.technicalAvailable && quote.dataSufficiency?.sufficient);
  const quoteStatus: WatchlistState['quoteStatus'] = !quote ? 'unavailable'
    : fallback ? 'last_known' : !knownTime ? 'timestamp_unknown' : old ? 'stale'
      : now - snapshot!.fetchedAt > 1_000 || quote.dataQuality === 'cached' ? 'cached' : 'available';
  return {
    ...(quote ?? { symbol: requestedSymbol, name: requestedSymbol, price: null, currency: null, available: false }),
    requestedSymbol,
    symbol: quote?.symbol ?? requestedSymbol,
    // A cached price is NOT a current executable recommendation. Fail closed for
    // confidence/targets as well as the signal; never invent a neutral score.
    ...(!analysisAvailable ? {
      signalAvailable: false, confidence: null, aiConfidence: null, finalScore: null,
      targetPrice: null, target1: null, stopLoss: null, expectedMovePct: null,
      finalRecommendation: 'Insufficient data' as const,
      finalRecommendationAr: 'بيانات غير كافية', finalRecommendationFr: 'Données insuffisantes',
    } : {}),
    engine: {
      version: 1, quoteStatus,
      analysisStatus: analysisAvailable ? 'available' : fallback || old || !knownTime && Boolean(quote)
        ? 'stale' : phase === 'quotes' && Boolean(quote) ? 'pending' : 'insufficient_data',
      asOf, fetchedAt: snapshot ? new Date(snapshot.fetchedAt).toISOString() : null, reason,
    },
  };
}

/** Exact catalog IDs win. Ambiguous aliases are never guessed across exchanges. */
export function resolveWatchlistSymbols(symbols: string[], catalog: TraderCatalogSymbol[]) {
  const exact = new Map(catalog.map(meta => [meta.symbol.toUpperCase(), meta]));
  const aliases = new Map<string, TraderCatalogSymbol[]>();
  for (const meta of catalog) {
    for (const alias of new Set([meta.providerSymbol, ...meta.aliases].filter(Boolean).map(value => value.toUpperCase()))) {
      const list = aliases.get(alias) ?? [];
      list.push(meta); aliases.set(alias, list);
    }
  }
  return symbols.map(requested => {
    const matches = aliases.get(requested) ?? [];
    const meta = exact.get(requested) ?? (matches.length === 1 ? matches[0] : undefined);
    return { requested, canonical: meta?.symbol ?? requested, meta, ambiguous: !meta && matches.length > 1 };
  });
}

export function createWatchlistEngine(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    now: Date.now, catalog: () => getTraderMarketCatalog({ includeFmpDiscovery: false }),
    load: fetchTraderQuotesDetailed, read: key => getPersistentCache<Snapshot>(key),
    write: setPersistentCache, ...overrides,
  };
  const memory = new Map<string, Snapshot>();
  const pending = new Map<string, Promise<WatchlistRow[]>>();
  const cooldowns = new Map<string, number>();
  function key(symbol: string, phase: WatchlistPhase) { return `watchlist:v1:${phase}:${symbol}`; }
  function valid(snapshot: Snapshot | null): snapshot is Snapshot {
    if (!snapshot || snapshot.version !== 1 || !usable(snapshot.quote) || !Number.isFinite(snapshot.fetchedAt)) return false;
    const asOf = time(snapshot.quote.lastUpdated ?? snapshot.quote.updatedAt);
    return asOf !== null && asOf <= deps.now() + 60_000 && deps.now() - asOf <= RETAIN_MS
      && snapshot.fetchedAt <= deps.now() + 60_000 && deps.now() - snapshot.fetchedAt <= RETAIN_MS;
  }
  function remember(cacheKey: string, snapshot: Snapshot) {
    memory.delete(cacheKey); memory.set(cacheKey, snapshot);
    while (memory.size > MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value!);
  }
  async function snapshotFor(cacheKey: string): Promise<Snapshot | null> {
    const local = memory.get(cacheKey) ?? null;
    if (valid(local)) return local;
    memory.delete(cacheKey);
    const stored = await bounded(deps.read(cacheKey), 700, null);
    if (!valid(stored)) return null;
    remember(cacheKey, stored);
    return stored;
  }
  async function run(symbols: string[], phase: WatchlistPhase) {
    const catalog = await bounded(deps.catalog(), 5_000, { symbols: [] });
    const resolved = resolveWatchlistSymbols(symbols, catalog.symbols);
    const snapshots = new Map<string, Snapshot | null>();
    await Promise.all(resolved.filter(item => !item.ambiguous).map(async item => {
      snapshots.set(item.canonical, await snapshotFor(key(item.canonical, phase)));
    }));
    const needed = resolved.filter(item => !item.ambiguous && (cooldowns.get(key(item.canonical, phase)) ?? 0) <= deps.now()
      && (!snapshots.get(item.canonical) || deps.now() - snapshots.get(item.canonical)!.fetchedAt >= (phase === 'quotes' ? FRESH_MS : ANALYSIS_FRESH_MS)));
    let load: TraderQuoteLoadResult | null = null;
    if (needed.length) {
      load = await bounded(deps.load(Array.from(new Set(needed.map(item => item.canonical))), {
        symbolMeta: needed.flatMap(item => item.meta ? [item.meta] : []),
        includeHistory: phase === 'analysis', includeNews: false, concurrency: 4,
      }), 22_000, null);
    }
    const bySymbol = new Map<string, TraderQuote>();
    for (const quote of load?.quotes ?? []) {
      // Only match explicit canonical/requested IDs. Display tickers can collide.
      for (const id of [quote.symbol, quote.requestedSymbol, quote.canonicalSymbol]) {
        if (id) bySymbol.set(id.toUpperCase(), quote);
      }
    }
    const neededIds = new Set(needed.map(item => item.canonical));
    const writes: Promise<void>[] = [];
    const rows = resolved.map(item => {
      if (item.ambiguous) return rowFor(item.requested, null, phase, deps.now(), false, 'ambiguous_symbol');
      const cacheKey = key(item.canonical, phase);
      const prior = snapshots.get(item.canonical) ?? null;
      if (!neededIds.has(item.canonical)) {
        const coolingDown = (cooldowns.get(cacheKey) ?? 0) > deps.now();
        return rowFor(item.requested, prior, phase, deps.now(), coolingDown, coolingDown ? 'retry_backoff' : null);
      }
      const quote = bySymbol.get(item.canonical.toUpperCase());
      const sourceTime = time(quote?.lastUpdated ?? quote?.updatedAt);
      const priorTime = time(prior?.quote.lastUpdated ?? prior?.quote.updatedAt);
      const identityMatches = (!item.meta?.currency || quote?.currency === item.meta.currency)
        && (!prior || quote?.currency === prior.quote.currency);
      if (usable(quote) && identityMatches && (sourceTime === null || sourceTime <= deps.now() + 60_000)
        && (sourceTime === null || deps.now() - sourceTime <= RETAIN_MS)
        && (!prior || sourceTime !== null && (priorTime === null || sourceTime >= priorTime))) {
        const snapshot: Snapshot = { version: 1, fetchedAt: deps.now(), quote: compact(quote) };
        cooldowns.delete(cacheKey);
        if (valid(snapshot)) {
          remember(cacheKey, snapshot);
          writes.push(bounded(deps.write(cacheKey, snapshot, RETAIN_MS), 700, undefined));
        }
        return rowFor(item.requested, snapshot, phase, deps.now(), false);
      }
      const reason = usable(quote) && !identityMatches ? 'currency_mismatch' : usable(quote) && prior ? 'older_quote_rejected'
        : (load?.summary.skippedDueToRateLimit ?? 0) > 0 ? 'rate_limited' : 'provider_unavailable';
      cooldowns.set(cacheKey, deps.now() + 30_000);
      while (cooldowns.size > MAX_MEMORY_ENTRIES) cooldowns.delete(cooldowns.keys().next().value!);
      return rowFor(item.requested, prior, phase, deps.now(), true, reason);
    });
    await Promise.all(writes);
    return rows;
  }
  return {
    async load(symbols: string[], phase: WatchlistPhase = 'analysis') {
      if (!symbols.length) return [];
      // Defensive validation applies to internal callers as well as the route.
      const requested = parseWatchlistSymbols(symbols.join(','));
      const requestKey = JSON.stringify([phase, [...requested].sort()]);
      let work = pending.get(requestKey);
      if (!work) {
        work = run([...requested].sort(), phase).finally(() => pending.delete(requestKey));
        pending.set(requestKey, work);
      }
      const rows = await work;
      const byRequested = new Map(rows.map(row => [row.requestedSymbol, row]));
      return requested.map(symbol => byRequested.get(symbol)!);
    },
  };
}

export const watchlistEngine = createWatchlistEngine();
