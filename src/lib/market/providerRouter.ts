/**
 * Smart provider router for market data.
 *
 * Single entry-point for all market quote fetches. Selects the best provider
 * per asset class, validates the response, caches the result, and returns a
 * clean normalized quote with NO internal provider details exposed publicly.
 *
 * Priority matrix
 * ───────────────
 *   Gulf / GCC stocks      → Yahoo first  (broader local exchange coverage)
 *   US stocks / ETFs       → FMP first, Yahoo fallback
 *   Indices                → FMP first, Yahoo fallback
 *   Forex                  → FMP first, Yahoo fallback
 *   Crypto                 → FMP first, Yahoo fallback
 *   Metals / Commodities   → FMP first, Yahoo fallback
 *   Unknown                → Yahoo first, FMP fallback
 *
 * Server logs contain safe diagnostics (provider ID, latency, error reason).
 * API keys are NEVER logged.
 */

// ─── Asset class ─────────────────────────────────────────────────────────────

export type AssetClass =
  | 'gulf'    // Kuwait, Saudi, UAE, Qatar, Bahrain, Oman stocks
  | 'us'      // US stocks (NASDAQ / NYSE)
  | 'index'   // Market indices (S&P 500, FTSE 100, Nikkei, ...)
  | 'forex'   // Currency pairs (EUR/USD, etc.)
  | 'crypto'  // Cryptocurrency (BTC, ETH, ...)
  | 'metal'   // Precious metals & commodities (XAU, OIL, ...)
  | 'etf'     // Exchange-traded funds
  | 'other';  // Fallback

type ProviderKey = 'fmp' | 'yahoo' | 'finnhub';

// First provider in the list is tried first; fallback to next if it fails.
const PROVIDER_PRIORITY: Record<AssetClass, ProviderKey[]> = {
  gulf: ['yahoo', 'fmp'],
  us: ['fmp', 'yahoo'],
  index: ['fmp', 'yahoo'],
  forex: ['fmp', 'yahoo'],
  crypto: ['fmp', 'yahoo'],
  metal: ['fmp', 'yahoo'],
  etf: ['fmp', 'yahoo'],
  other: ['yahoo', 'fmp'],
};

// ─── Asset class detection ───────────────────────────────────────────────────

// Gulf/GCC exchange identifiers (ISO alpha-2 + common exchange codes)
const GULF_EXCHANGES = new Set([
  'KW', 'KWD', 'KUWSE', 'BKK',         // Kuwait Stock Exchange
  'SA', 'TADAWUL', 'SASE',             // Saudi Tadawul
  'AE', 'ADX', 'DFM', 'DIFX',          // UAE (Abu Dhabi / Dubai)
  'QA', 'DSM', 'QATSE',                // Qatar Stock Exchange
  'BH', 'BSE', 'BAHSE',                // Bahrain Bourse
  'OM', 'MSM', 'MUSCAT',               // Muscat Stock Exchange
]);

// Symbol dot-suffix patterns for Gulf-listed stocks
const GULF_SUFFIXES = ['.KW', '.SR', '.AE', '.QA', '.BH', '.OM', '.SA'];

// Top crypto base symbols
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'MATIC', 'DOT', 'AVAX',
  'LINK', 'LTC', 'BCH', 'XLM', 'ATOM', 'ALGO', 'VET', 'FIL', 'TRX', 'ETC',
  'NEAR', 'APT', 'ARB', 'OP', 'IMX', 'INJ', 'SUI', 'SEI', 'MANTA', 'STRK',
  'WLD', 'PYTH', 'JTO', 'JUP', 'DYM', 'TIA', 'BLUR', 'CFX', 'GMX',
  'DYDX', 'PERP', 'SNX', 'UNI', 'SUSHI', 'AAVE', 'COMP', 'MKR', 'CRV', 'BAL',
]);

// Metal / commodity root symbols
const METAL_SYMBOLS = new Set([
  'XAU', 'XAG', 'XPT', 'XPD', 'GOLD', 'SILVER',
  'OIL', 'WTI', 'BRENT', 'USOIL', 'UKOIL', 'NGAS',
  'COPPER', 'WHEAT', 'CORN', 'SOYBEAN', 'SUGAR', 'COTTON',
]);

// Index name prefixes / root symbols
const INDEX_ROOTS = new Set([
  'SPX', 'SPY', 'QQQ', 'NDX', 'DJIA', 'DJI', 'RUT', 'VIX',
  'FTSE', 'DAX', 'CAC', 'IBEX', 'MIB', 'AEX', 'SMI',
  'NIKKEI', 'NK225', 'HSI', 'KOSPI', 'ASX', 'TSX',
  'NI225', 'N225', 'STI', 'SENSEX', 'NIFTY',
]);

/**
 * Classify a symbol into an asset class.
 * `exchange` is optional (e.g., 'KW', 'TADAWUL', 'NASDAQ').
 */
export function detectAssetClass(symbol: string, exchange?: string | null): AssetClass {
  const upper = symbol.toUpperCase().trim();
  const exch = (exchange ?? '').toUpperCase().trim();

  // Gulf check — exchange code first (most reliable)
  if (exch && GULF_EXCHANGES.has(exch)) return 'gulf';
  if (GULF_SUFFIXES.some((suffix) => upper.endsWith(suffix))) return 'gulf';

  // Indices — starts with '^' OR matches known index roots
  if (upper.startsWith('^')) return 'index';
  if (INDEX_ROOTS.has(upper)) return 'index';

  // Metals / commodities
  if (METAL_SYMBOLS.has(upper)) return 'metal';
  if (/^(XAU|XAG|XPT|XPD)/.test(upper)) return 'metal';

  // Crypto — known symbol OR base paired with USD/USDT/BTC/ETH
  if (CRYPTO_SYMBOLS.has(upper)) return 'crypto';
  const cryptoBase = upper.replace(/(USD|USDT|BTC|ETH)$/, '');
  if (cryptoBase !== upper && CRYPTO_SYMBOLS.has(cryptoBase)) return 'crypto';

  // Forex — slash notation first, then 6-letter pair.
  const stripped = upper.replace('/', '');
  if (upper.includes('/') && upper.length <= 9) return 'forex';
  if (/^[A-Z]{6}$/.test(stripped) && !CRYPTO_SYMBOLS.has(stripped)) return 'forex';

  // ETF — not reliably detectable without exchange metadata; default US.
  return 'us';
}

// ─── Normalized quote shape ──────────────────────────────────────────────────

export type RouterStatus = 'live' | 'delayed' | 'cached' | 'unavailable';

/**
 * The public-facing normalized quote.
 * `source` is always 'THE SFM' — the underlying provider is never exposed.
 */
export type RouterQuote = {
  symbol: string;
  name: string;
  market: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  recommendation: string | null;
  confidence: number | null;
  source: 'THE SFM';
  lastUpdated: string;
  status: RouterStatus;
};

/** Canonical unavailable placeholder — never throw, always return something. */
export function unavailableRouterQuote(symbol: string, name?: string): RouterQuote {
  return {
    symbol: symbol.toUpperCase(),
    name: name ?? symbol,
    market: '',
    price: 0,
    currency: 'USD',
    change: null,
    changePercent: null,
    recommendation: null,
    confidence: null,
    source: 'THE SFM',
    lastUpdated: new Date().toISOString(),
    status: 'unavailable',
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

const MAX_DATA_AGE_MS = 15 * 60 * 1000; // 15 minutes

function isValidPrice(p: number | null | undefined): p is number {
  return typeof p === 'number' && Number.isFinite(p) && p > 0;
}

function isValidChangePercent(pct: number | null | undefined): boolean {
  return pct == null || (typeof pct === 'number' && Number.isFinite(pct) && Math.abs(pct) < 200);
}

function isStale(ts: string | null | undefined): boolean {
  if (!ts) return true;

  const time = new Date(ts).getTime();
  if (!Number.isFinite(time)) return true;

  return Date.now() - time > MAX_DATA_AGE_MS;
}

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateQuote(q: {
  price?: number | null;
  changePercent?: number | null;
  lastUpdated?: string | null;
}): ValidationResult {
  if (!isValidPrice(q.price)) return { valid: false, reason: 'invalid_price' };
  if (!isValidChangePercent(q.changePercent)) return { valid: false, reason: 'invalid_change_percent' };
  if (isStale(q.lastUpdated)) return { valid: false, reason: 'stale_data' };

  return { valid: true };
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

type CacheEntry = { quote: RouterQuote; fetchedAt: number };

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache = new Map<string, CacheEntry>();

function cacheGet(sym: string): RouterQuote | null {
  const entry = _cache.get(sym);
  if (!entry) return null;

  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    _cache.delete(sym);
    return null;
  }

  return { ...entry.quote, status: 'cached' };
}

function cacheSet(sym: string, quote: RouterQuote): void {
  _cache.set(sym, { quote, fetchedAt: Date.now() });
}

/** Reset cache — for use in unit tests only. */
export function __resetRouterCacheForTests(): void {
  _cache.clear();
}

// ─── Diagnostics (server-side only) ──────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

function logDiag(level: LogLevel, event: string, meta: Record<string, unknown>): void {
  if (typeof process === 'undefined') return;

  // Strip any fields that could carry sensitive data before logging.
  const { apiKey: _apiKey, token: _token, key: _key, password: _password, ...safe } = meta;

  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`[providerRouter] ${event}`, safe);
}

// ─── Quote normalization ─────────────────────────────────────────────────────

function normalize(
  symbol: string,
  raw: {
    name?: string | null;
    market?: string | null;
    price: number;
    currency?: string | null;
    change?: number | null;
    changePercent?: number | null;
    recommendation?: string | null;
    confidence?: number | null;
    lastUpdated?: string | null;
  },
  status: RouterStatus = 'live',
): RouterQuote {
  return {
    symbol: symbol.toUpperCase(),
    name: raw.name ?? symbol,
    market: raw.market ?? '',
    price: raw.price,
    currency: raw.currency ?? 'USD',
    change: raw.change ?? null,
    changePercent: raw.changePercent ?? null,
    recommendation: raw.recommendation ?? null,
    confidence: raw.confidence ?? null,
    source: 'THE SFM',
    lastUpdated: raw.lastUpdated ?? new Date().toISOString(),
    status,
  };
}

// ─── Provider availability ───────────────────────────────────────────────────

function isConfigured(provider: ProviderKey): boolean {
  switch (provider) {
    case 'fmp':
      return Boolean(process.env.FMP_API_KEY?.trim());
    case 'yahoo':
      return true; // Always available — no API key required
    case 'finnhub':
      return Boolean(process.env.FINNHUB_API_KEY?.trim());
    default:
      return false;
  }
}

// ─── Provider fetchers ───────────────────────────────────────────────────────

type YahooQuoteResult = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  displayName?: string;
  fullExchangeName?: string;
  exchange?: string;
  exchangeName?: string;
  market?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | string | number;
  currency?: string;
};

type YahooFinanceClient = {
  quote: (
    symbol: string,
    queryOptions?: Record<string, unknown>,
    moduleOptions?: Record<string, unknown>,
  ) => Promise<YahooQuoteResult | null>;
};

function toIsoFromYahooTime(value: YahooQuoteResult['regularMarketTime']): string {
  if (value == null) return new Date().toISOString();

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : new Date().toISOString();
  }

  if (typeof value === 'number') {
    // Yahoo usually returns epoch seconds. If it is already milliseconds, keep it as-is.
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

async function fetchYahoo(symbol: string): Promise<RouterQuote | null> {
  try {
    const yahooModule = (await import('yahoo-finance2')) as unknown as
      | YahooFinanceClient
      | { default?: YahooFinanceClient };

    const yf =
      'default' in yahooModule && yahooModule.default
        ? yahooModule.default
        : (yahooModule as YahooFinanceClient);

    const q = await yf.quote(symbol, {}, { validateResult: false });

    if (!q || !isValidPrice(q.regularMarketPrice)) return null;

    if (!isValidChangePercent(q.regularMarketChangePercent)) {
      logDiag('warn', 'yahoo_invalid_change_percent', { symbol });
      return null;
    }

    return normalize(symbol, {
      name: q.longName ?? q.shortName ?? q.displayName ?? undefined,
      market: q.fullExchangeName ?? q.exchangeName ?? q.exchange ?? q.market ?? undefined,
      price: q.regularMarketPrice,
      currency: q.currency ?? 'USD',
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      lastUpdated: toIsoFromYahooTime(q.regularMarketTime),
    });
  } catch (err) {
    logDiag('warn', 'yahoo_fetch_error', {
      symbol,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

type FmpQuote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  price?: number;
  currency?: string;
  change?: number;
  changesPercentage?: number;
  timestamp?: number;
};

function normalizeFmpQuote(symbol: string, q: FmpQuote): RouterQuote | null {
  if (!isValidPrice(q.price)) return null;

  if (!isValidChangePercent(q.changesPercentage)) {
    logDiag('warn', 'fmp_invalid_change_percent', { symbol });
    return null;
  }

  return normalize(symbol, {
    name: q.name,
    market: q.exchange,
    price: q.price,
    currency: q.currency ?? 'USD',
    change: q.change ?? null,
    changePercent: q.changesPercentage ?? null,
    lastUpdated: q.timestamp ? new Date(q.timestamp * 1000).toISOString() : new Date().toISOString(),
  });
}

async function fetchFmp(symbol: string): Promise<RouterQuote | null> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      logDiag('warn', 'fmp_http_error', { symbol, status: res.status });
      return null;
    }

    const data = (await res.json()) as FmpQuote[];
    const q = Array.isArray(data) ? data[0] : null;

    if (!q) return null;

    return normalizeFmpQuote(symbol, q);
  } catch (err) {
    logDiag('warn', 'fmp_fetch_error', {
      symbol,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Batch FMP (more efficient for many symbols) ─────────────────────────────

async function fetchFmpBatch(symbols: string[]): Promise<Map<string, RouterQuote>> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  const result = new Map<string, RouterQuote>();

  if (!apiKey || symbols.length === 0) return result;

  try {
    const joined = symbols.map(encodeURIComponent).join(',');
    const url = `https://financialmodelingprep.com/api/v3/quote/${joined}?apikey=${apiKey}`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return result;

    const data = (await res.json()) as FmpQuote[];
    if (!Array.isArray(data)) return result;

    for (const q of data) {
      if (!q.symbol) continue;

      const normalized = normalizeFmpQuote(q.symbol, q);
      if (!normalized) continue;

      result.set(q.symbol.toUpperCase(), normalized);
    }
  } catch (err) {
    logDiag('warn', 'fmp_batch_error', {
      count: symbols.length,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}

// ─── Main single-symbol router ───────────────────────────────────────────────

/**
 * Fetch a clean normalized quote for `symbol`.
 * Provider is auto-selected based on asset class. Returns an unavailable
 * placeholder instead of throwing.
 */
export async function routeQuote(
  symbol: string,
  options: {
    exchange?: string | null;
    assetClass?: AssetClass;
    bypassCache?: boolean;
  } = {},
): Promise<RouterQuote> {
  const sym = symbol.trim().toUpperCase();
  const assetClass = options.assetClass ?? detectAssetClass(sym, options.exchange);

  if (!options.bypassCache) {
    const hit = cacheGet(sym);
    if (hit) {
      logDiag('info', 'cache_hit', { symbol: sym });
      return hit;
    }
  }

  const priority = PROVIDER_PRIORITY[assetClass];

  for (const provider of priority) {
    if (!isConfigured(provider)) {
      logDiag('info', 'provider_skipped', { symbol: sym, provider, reason: 'not_configured' });
      continue;
    }

    const t0 = Date.now();
    let quote: RouterQuote | null = null;

    switch (provider) {
      case 'yahoo':
        quote = await fetchYahoo(sym);
        break;
      case 'fmp':
        quote = await fetchFmp(sym);
        break;
      case 'finnhub':
        quote = null; // placeholder for future
        break;
      default:
        quote = null;
        break;
    }

    const ms = Date.now() - t0;

    if (quote) {
      logDiag('info', 'quote_success', { symbol: sym, provider, assetClass, elapsedMs: ms });
      cacheSet(sym, quote);
      return quote;
    }

    logDiag('warn', 'provider_empty', { symbol: sym, provider, assetClass, elapsedMs: ms });
  }

  logDiag('error', 'all_providers_failed', { symbol: sym, assetClass, priority });
  return unavailableRouterQuote(sym);
}

// ─── Batch router ────────────────────────────────────────────────────────────

/**
 * Fetch normalized quotes for multiple symbols efficiently.
 * Groups by asset class; uses FMP batch endpoint where possible.
 */
export async function routeBatchQuotes(
  symbols: string[],
  options: { exchange?: string | null; bypassCache?: boolean } = {},
): Promise<Map<string, RouterQuote>> {
  const result = new Map<string, RouterQuote>();
  if (symbols.length === 0) return result;

  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];

  // Split cache hits from misses.
  const misses: string[] = [];

  for (const sym of unique) {
    if (!options.bypassCache) {
      const hit = cacheGet(sym);
      if (hit) {
        result.set(sym, hit);
        continue;
      }
    }

    misses.push(sym);
  }

  if (misses.length === 0) return result;

  // Group misses by asset class.
  const groups = new Map<AssetClass, string[]>();

  for (const sym of misses) {
    const cls = detectAssetClass(sym, options.exchange);
    const existing = groups.get(cls) ?? [];
    existing.push(sym);
    groups.set(cls, existing);
  }

  const fetches: Promise<void>[] = [];

  for (const [cls, syms] of groups) {
    const priority = PROVIDER_PRIORITY[cls];

    // Use FMP batch if FMP is first priority and configured.
    if (priority[0] === 'fmp' && isConfigured('fmp') && syms.length > 1) {
      fetches.push(
        (async () => {
          const batchResult = await fetchFmpBatch(syms);
          const missing = syms.filter((s) => !batchResult.has(s));

          for (const [sym, q] of batchResult) {
            cacheSet(sym, q);
            result.set(sym, q);
          }

          // Fall back to Yahoo for symbols FMP did not return.
          if (missing.length > 0 && isConfigured('yahoo')) {
            await Promise.allSettled(
              missing.map(async (sym) => {
                const q = await fetchYahoo(sym);

                if (q) {
                  cacheSet(sym, q);
                  result.set(sym, q);
                } else {
                  result.set(sym, unavailableRouterQuote(sym));
                }
              }),
            );
          } else {
            for (const sym of missing) {
              result.set(sym, unavailableRouterQuote(sym));
            }
          }
        })(),
      );
    } else {
      // Per-symbol routing for gulf or when FMP is not available.
      fetches.push(
        ...syms.map(async (sym) => {
          const q = await routeQuote(sym, {
            assetClass: cls,
            bypassCache: options.bypassCache,
          });

          result.set(sym, q);
        }),
      );
    }
  }

  await Promise.allSettled(fetches);
  return result;
}
