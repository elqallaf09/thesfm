/**
 * Smart provider router for market data.
 *
 * Single entry-point for all market quote fetches. Selects the best provider
 * per asset class, validates the response, caches the result, and returns a
 * clean normalized quote with NO internal provider details exposed publicly.
 *
 * Priority matrix
 * ───────────────
 *   Gulf / GCC stocks        → Twelve Data → EODHD → Yahoo
 *   US stocks / ETFs         → Twelve Data → EODHD → Yahoo
 *   Indices                  → Twelve Data → EODHD → Yahoo
 *   Forex                    → Twelve Data → EODHD → Yahoo
 *   Crypto                   → Twelve Data → EODHD → Yahoo
 *   Metals / Commodities     → EODHD → Twelve Data → Yahoo
 *   Unknown                  → Twelve Data → EODHD → Yahoo
 *
 * Yahoo is an internal fallback only — it is NEVER mentioned publicly.
 * FMP and Finnhub remain available as env-key providers for fundamentals
 * and calendar events but are not part of the quote priority chain.
 *
 * Server logs contain safe diagnostics (provider ID, latency, error reason).
 * API keys are NEVER logged.
 */

import {
  fetchTwelveDataQuote,
  fetchTwelveDataBatch,
  isTwelveDataConfigured,
  mapSymbolForTd,
} from './providers/twelveData';

import {
  fetchEodhdQuote,
  fetchEodhdBatch,
  isEodhdConfigured,
} from './providers/eodhd';
import { classifyRuntimeFailure, logReliabilityEvent } from '@/lib/runtime/reliability';

// ─── Asset class ─────────────────────────────────────────────────────────────

export type AssetClass =
  | 'gulf'    // Kuwait, Saudi, UAE, Qatar, Bahrain, Oman stocks
  | 'us'      // US stocks (NASDAQ / NYSE)
  | 'index'   // Market indices (S&P 500, FTSE 100, Nikkei, …)
  | 'forex'   // Currency pairs (EUR/USD, etc.)
  | 'crypto'  // Cryptocurrency (BTC, ETH, …)
  | 'metal'   // Precious metals & commodities (XAU, OIL, …)
  | 'etf'     // Exchange-traded funds
  | 'other';  // Fallback

type ProviderKey = 'twelvedata' | 'eodhd' | 'fmp' | 'yahoo' | 'finnhub';

// First provider is tried first; sequential fallback on failure or bad data.
const PROVIDER_PRIORITY: Record<AssetClass, ProviderKey[]> = {
  gulf:   ['twelvedata', 'eodhd',      'yahoo'],
  us:     ['twelvedata', 'eodhd',      'yahoo'],
  index:  ['twelvedata', 'eodhd',      'yahoo'],
  forex:  ['twelvedata', 'eodhd',      'yahoo'],
  crypto: ['twelvedata', 'eodhd',      'yahoo'],
  metal:  ['eodhd',      'twelvedata', 'yahoo'],   // EODHD leads for commodities
  etf:    ['twelvedata', 'eodhd',      'yahoo'],
  other:  ['twelvedata', 'eodhd',      'yahoo'],
};

// ─── Asset class detection ────────────────────────────────────────────────────

// Gulf/GCC exchange identifiers (ISO alpha-2 + common exchange codes)
const GULF_EXCHANGES = new Set([
  'KW', 'KWD', 'KUWSE', 'BKK',         // Kuwait Stock Exchange
  'SA', 'TADAWUL', 'SASE',             // Saudi Tadawul
  'AE', 'ADX', 'DFM', 'DIFX',         // UAE (Abu Dhabi / Dubai)
  'QA', 'DSM', 'QATSE',               // Qatar Stock Exchange
  'BH', 'BSE', 'BAHSE',               // Bahrain Bourse
  'OM', 'MSM', 'MUSCAT',              // Muscat Stock Exchange
]);

// Symbol dot-suffix patterns for Gulf-listed stocks
const GULF_SUFFIXES = ['.KW', '.SR', '.AE', '.QA', '.BH', '.OM', '.SA'];

// Top-50 crypto base symbols
const CRYPTO_SYMBOLS = new Set([
  'BTC','ETH','BNB','XRP','ADA','DOGE','SOL','MATIC','DOT','AVAX',
  'LINK','LTC','BCH','XLM','ATOM','ALGO','VET','FIL','TRX','ETC',
  'NEAR','APT','ARB','OP','IMX','INJ','SUI','SEI','MANTA','STRK',
  'WLD','PYTH','JTO','JUP','DYM','TIA','BLUR','CFX','GMX',
  'DYDX','PERP','SNX','UNI','SUSHI','AAVE','COMP','MKR','CRV','BAL',
]);

// Metal / commodity root symbols
const METAL_SYMBOLS = new Set([
  'XAU','XAG','XPT','XPD','GOLD','SILVER',
  'OIL','WTI','BRENT','USOIL','UKOIL','NGAS',
  'COPPER','WHEAT','CORN','SOYBEAN','SUGAR','COTTON',
]);

// Index name prefixes / root symbols
const INDEX_ROOTS = new Set([
  'SPX','SPY','QQQ','NDX','DJIA','DJI','RUT','VIX',
  'FTSE','DAX','CAC','IBEX','MIB','AEX','SMI',
  'NIKKEI','NK225','HSI','KOSPI','ASX','TSX',
  'NI225','N225','STI','SENSEX','NIFTY',
]);

/**
 * Classify a symbol into an asset class.
 * `exchange` is optional (e.g. 'KW', 'TADAWUL', 'NASDAQ').
 */
export function detectAssetClass(symbol: string, exchange?: string | null): AssetClass {
  const upper = symbol.toUpperCase().trim();
  const exch  = (exchange ?? '').toUpperCase().trim();

  // Gulf check — exchange code first (most reliable)
  if (exch && GULF_EXCHANGES.has(exch)) return 'gulf';
  if (GULF_SUFFIXES.some(suffix => upper.endsWith(suffix))) return 'gulf';

  // Indices — starts with '^' OR matches known index roots
  if (upper.startsWith('^')) return 'index';
  if (INDEX_ROOTS.has(upper)) return 'index';

  // Metals / commodities
  if (METAL_SYMBOLS.has(upper)) return 'metal';
  if (/^(XAU|XAG|XPT|XPD)/.test(upper)) return 'metal';

  // Crypto — known symbol OR 3-6 letter base paired with USD/USDT/BTC
  if (CRYPTO_SYMBOLS.has(upper)) return 'crypto';
  const cryptoBase = upper.replace(/(USD|USDT|BTC|ETH)$/, '');
  if (cryptoBase !== upper && CRYPTO_SYMBOLS.has(cryptoBase)) return 'crypto';

  // Forex — 6-letter pair (EURUSD) or slash notation (EUR/USD)
  const stripped = upper.replace('/', '');
  if (/^[A-Z]{6}$/.test(stripped) && !CRYPTO_SYMBOLS.has(stripped)) return 'forex';
  if (upper.includes('/') && upper.length <= 9) return 'forex';

  // Default to US stocks
  return 'us';
}

// ─── Normalized quote shape ───────────────────────────────────────────────────

export type RouterStatus = 'live' | 'delayed' | 'cached' | 'unavailable';

/**
 * The public-facing normalized quote.
 * `source` is always 'THE SFM' — the underlying provider is NEVER exposed.
 */
export type RouterQuote = {
  symbol:          string;
  name:            string;
  market:          string;
  price:           number | null;
  currency:        string | null;
  change:          number | null;
  changePercent:   number | null;
  recommendation:  string | null;
  confidence:      number | null;
  source:          'THE SFM';
  lastUpdated:     string | null;
  status:          RouterStatus;
};

/** Canonical unavailable placeholder — never throws, always returns something usable. */
export function unavailableRouterQuote(symbol: string, name?: string): RouterQuote {
  return {
    symbol:         symbol.toUpperCase(),
    name:           name ?? symbol,
    market:         '',
    price:          null,
    currency:       null,
    change:         null,
    changePercent:  null,
    recommendation: null,
    confidence:     null,
    source:         'THE SFM',
    lastUpdated:    null,
    status:         'unavailable',
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const MAX_DATA_AGE_MS = 15 * 60 * 1000; // 15 minutes

function isValidPrice(p: number | null | undefined): p is number {
  return typeof p === 'number' && Number.isFinite(p) && p > 0;
}

function isValidChangePercent(pct: number | null | undefined): boolean {
  return pct == null || (typeof pct === 'number' && Number.isFinite(pct) && Math.abs(pct) < 200);
}

function isStale(ts: string | null | undefined): boolean {
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() > MAX_DATA_AGE_MS;
}

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateQuote(q: {
  price?: number | null;
  changePercent?: number | null;
  lastUpdated?: string | null;
}): ValidationResult {
  if (!isValidPrice(q.price))                   return { valid: false, reason: 'invalid_price' };
  if (!isValidChangePercent(q.changePercent))   return { valid: false, reason: 'invalid_change_percent' };
  if (isStale(q.lastUpdated))                   return { valid: false, reason: 'stale_data' };
  return { valid: true };
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

type CacheEntry = { quote: RouterQuote; fetchedAt: number };

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const _cache = new Map<string, CacheEntry>();

function cacheGet(sym: string, allowStale = false): RouterQuote | null {
  const entry = _cache.get(sym);
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  if (age > STALE_CACHE_TTL_MS) { _cache.delete(sym); return null; }
  if (!allowStale && age > CACHE_TTL_MS) return null;
  return { ...entry.quote, status: 'cached' };
}

function cacheSet(sym: string, quote: RouterQuote): void {
  _cache.set(sym, { quote, fetchedAt: Date.now() });
}

/** Reset cache — for unit tests only. */
export function __resetRouterCacheForTests(): void { _cache.clear(); }

// ─── Diagnostics (server-side only) ──────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

function logDiag(level: LogLevel, event: string, meta: Record<string, unknown>): void {
  if (typeof process === 'undefined') return;
  logReliabilityEvent(level, `provider_router_${event}`, meta);
}

// ─── Quote normalization ──────────────────────────────────────────────────────

function normalize(
  symbol: string,
  raw: {
    name?:           string | null;
    market?:         string | null;
    price:           number;
    currency?:       string | null;
    change?:         number | null;
    changePercent?:  number | null;
    recommendation?: string | null;
    confidence?:     number | null;
    lastUpdated?:    string | null;
  },
  status: RouterStatus = 'live',
): RouterQuote {
  return {
    symbol:         symbol.toUpperCase(),
    name:           raw.name ?? symbol,
    market:         raw.market ?? '',
    price:          raw.price,
    currency:       raw.currency ?? 'USD',
    change:         raw.change ?? null,
    changePercent:  raw.changePercent ?? null,
    recommendation: raw.recommendation ?? null,
    confidence:     raw.confidence ?? null,
    source:         'THE SFM',
    lastUpdated:    raw.lastUpdated ?? new Date().toISOString(),
    status,
  };
}

// ─── Provider availability ────────────────────────────────────────────────────

function isConfigured(provider: ProviderKey): boolean {
  switch (provider) {
    case 'twelvedata': return isTwelveDataConfigured();
    case 'eodhd':      return isEodhdConfigured();
    case 'fmp':        return Boolean(process.env.FMP_API_KEY?.trim());
    case 'yahoo':      return true;  // Always available — no API key required
    case 'finnhub':    return Boolean(process.env.FINNHUB_API_KEY?.trim());
  }
}

// ─── Provider fetchers ────────────────────────────────────────────────────────

async function fetchViaTwelveData(
  symbol: string,
  assetClass: AssetClass,
): Promise<RouterQuote | null> {
  const q = await fetchTwelveDataQuote(symbol, assetClass);
  if (!q) return null;
  if (!isValidPrice(q.price)) return null;
  if (!isValidChangePercent(q.changePercent)) {
    logDiag('warn', 'td_invalid_change_percent', { symbol });
    return null;
  }
  return normalize(symbol, {
    name:          q.name,
    market:        q.exchange,
    price:         q.price,
    currency:      q.currency,
    change:        q.change,
    changePercent: q.changePercent,
    lastUpdated:   q.lastUpdated,
  });
}

async function fetchViaEodhd(
  symbol: string,
  assetClass: AssetClass,
  exchange?: string | null,
): Promise<RouterQuote | null> {
  const q = await fetchEodhdQuote(symbol, { assetClass, exchange });
  if (!q) return null;
  if (!isValidPrice(q.price)) return null;
  if (!isValidChangePercent(q.changePercent)) {
    logDiag('warn', 'eodhd_invalid_change_percent', { symbol });
    return null;
  }
  return normalize(symbol, {
    name:          q.name,
    market:        q.exchange,
    price:         q.price,
    currency:      q.currency,
    change:        q.change,
    changePercent: q.changePercent,
    lastUpdated:   q.lastUpdated,
  });
}

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

function toYahooIsoTime(value: YahooQuoteResult['regularMarketTime']): string {
  if (value == null) return new Date().toISOString();

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : new Date().toISOString();
  }

  if (typeof value === 'number') {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

async function fetchViaYahoo(symbol: string): Promise<RouterQuote | null> {
  try {
    const yahooFinanceModule = (await import('yahoo-finance2')) as unknown as
      | YahooFinanceClient
      | { default?: YahooFinanceClient };

    const yf =
      'default' in yahooFinanceModule && yahooFinanceModule.default
        ? yahooFinanceModule.default
        : (yahooFinanceModule as YahooFinanceClient);

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
      lastUpdated: toYahooIsoTime(q.regularMarketTime),
    });
  } catch (err) {
    logDiag('warn', 'yahoo_fetch_error', {
      symbol,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}


async function fetchViaFmp(symbol: string): Promise<RouterQuote | null> {
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
    type FmpQuote = {
      symbol?: string; name?: string; exchange?: string;
      price?: number; currency?: string;
      change?: number; changesPercentage?: number; timestamp?: number;
    };
    const data = await res.json() as FmpQuote[];
    const q = Array.isArray(data) ? data[0] : null;
    if (!q || !isValidPrice(q.price)) return null;
    if (!isValidChangePercent(q.changesPercentage)) {
      logDiag('warn', 'fmp_invalid_change_percent', { symbol });
      return null;
    }
    return normalize(symbol, {
      name:          q.name,
      market:        q.exchange,
      price:         q.price!,
      currency:      q.currency ?? 'USD',
      change:        q.change ?? null,
      changePercent: q.changesPercentage ?? null,
      lastUpdated:   q.timestamp ? new Date(q.timestamp * 1000).toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    logDiag('warn', 'fmp_fetch_error', {
      symbol,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

async function batchViaTwelveData(
  symbols: string[],
  assetClass: AssetClass,
): Promise<Map<string, RouterQuote>> {
  const result = new Map<string, RouterQuote>();
  const raw = await fetchTwelveDataBatch(symbols, assetClass);
  for (const [, q] of raw) {
    if (!isValidPrice(q.price) || !isValidChangePercent(q.changePercent)) continue;
    const rq = normalize(q.symbol, {
      name:          q.name,
      market:        q.exchange,
      price:         q.price,
      currency:      q.currency,
      change:        q.change,
      changePercent: q.changePercent,
      lastUpdated:   q.lastUpdated,
    });
    result.set(rq.symbol, rq);
  }
  return result;
}

async function batchViaEodhd(
  symbols: string[],
  assetClass: AssetClass,
  exchange?: string | null,
): Promise<Map<string, RouterQuote>> {
  const result = new Map<string, RouterQuote>();
  const raw = await fetchEodhdBatch(symbols, { assetClass, exchange });
  for (const [, q] of raw) {
    if (!isValidPrice(q.price) || !isValidChangePercent(q.changePercent)) continue;
    const rq = normalize(q.symbol, {
      name:          q.name,
      market:        q.exchange,
      price:         q.price,
      currency:      q.currency,
      change:        q.change,
      changePercent: q.changePercent,
      lastUpdated:   q.lastUpdated,
    });
    result.set(rq.symbol, rq);
  }
  return result;
}

async function batchViaFmp(symbols: string[]): Promise<Map<string, RouterQuote>> {
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
    type FmpQuote = {
      symbol?: string; name?: string; exchange?: string;
      price?: number; currency?: string;
      change?: number; changesPercentage?: number; timestamp?: number;
    };
    const data = await res.json() as FmpQuote[];
    if (!Array.isArray(data)) return result;
    for (const q of data) {
      if (!q.symbol || !isValidPrice(q.price)) continue;
      if (!isValidChangePercent(q.changesPercentage)) continue;
      result.set(q.symbol.toUpperCase(), normalize(q.symbol, {
        name:          q.name,
        market:        q.exchange,
        price:         q.price!,
        currency:      q.currency ?? 'USD',
        change:        q.change ?? null,
        changePercent: q.changesPercentage ?? null,
        lastUpdated:   q.timestamp ? new Date(q.timestamp * 1000).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (err) {
    logDiag('warn', 'fmp_batch_error', {
      count: symbols.length,
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return result;
}

// ─── Main single-symbol router ────────────────────────────────────────────────

/**
 * Fetch a clean normalized quote for `symbol`.
 * Provider is auto-selected per asset class. Returns an unavailable placeholder
 * instead of throwing on error. `source` is always 'THE SFM'.
 */
export async function routeQuote(
  symbol: string,
  options: {
    exchange?:    string | null;
    assetClass?:  AssetClass;
    bypassCache?: boolean;
  } = {},
): Promise<RouterQuote> {
  const sym        = symbol.trim().toUpperCase();
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

    try {
      switch (provider) {
        case 'twelvedata': quote = await fetchViaTwelveData(sym, assetClass);               break;
        case 'eodhd':      quote = await fetchViaEodhd(sym, assetClass, options.exchange);  break;
        case 'yahoo':      quote = await fetchViaYahoo(sym);                                break;
        case 'fmp':        quote = await fetchViaFmp(sym);                                  break;
        case 'finnhub':    quote = null; break; // reserved
      }
    } catch (error) {
      const failure = classifyRuntimeFailure(error);
      logDiag('warn', 'provider_failed', {
        symbol: sym,
        provider,
        assetClass,
        failureCode: failure.code,
        category: failure.category,
        retryable: failure.retryable,
        elapsedMs: Date.now() - t0,
      });
      continue;
    }

    const ms = Date.now() - t0;

    if (quote) {
      logDiag('info', 'quote_success', { symbol: sym, provider, assetClass, elapsedMs: ms });
      cacheSet(sym, quote);
      return quote;
    }

    logDiag('warn', 'provider_empty', { symbol: sym, provider, assetClass, elapsedMs: ms });
  }

  const cachedFallback = cacheGet(sym, true);
  if (cachedFallback) {
    logDiag('warn', 'stale_cache_fallback', { symbol: sym, assetClass });
    return cachedFallback;
  }
  logDiag('error', 'all_providers_failed', { symbol: sym, assetClass, priority });
  return unavailableRouterQuote(sym);
}

// ─── Batch router ─────────────────────────────────────────────────────────────

/**
 * Fetch normalized quotes for multiple symbols efficiently.
 * Groups by asset class and uses batch API calls where available:
 *   1. Twelve Data batch (primary)
 *   2. EODHD batch for misses
 *   3. Yahoo per-symbol for remaining misses
 */
export async function routeBatchQuotes(
  symbols: string[],
  options: { exchange?: string | null; bypassCache?: boolean } = {},
): Promise<Map<string, RouterQuote>> {
  const result = new Map<string, RouterQuote>();
  if (symbols.length === 0) return result;

  const unique = [...new Set(symbols.map(s => s.toUpperCase()))];

  // Split cache hits from misses
  const misses: string[] = [];
  for (const sym of unique) {
    if (!options.bypassCache) {
      const hit = cacheGet(sym);
      if (hit) { result.set(sym, hit); continue; }
    }
    misses.push(sym);
  }

  if (misses.length === 0) return result;

  // Group misses by asset class
  const groups = new Map<AssetClass, string[]>();
  for (const sym of misses) {
    const cls = detectAssetClass(sym, options.exchange);
    if (!groups.has(cls)) groups.set(cls, []);
    groups.get(cls)!.push(sym);
  }

  const fetches: Promise<void>[] = [];

  for (const [cls, syms] of groups) {
    fetches.push((async () => {
      let remaining = [...syms];

      // ── 1. Twelve Data batch ──────────────────────────────────────────────
      if (remaining.length > 0 && isTwelveDataConfigured()) {
        const batchResult = await batchViaTwelveData(remaining, cls);
        for (const [sym, q] of batchResult) { cacheSet(sym, q); result.set(sym, q); }
        remaining = remaining.filter(s => !batchResult.has(s));
        logDiag('info', 'td_batch_done', {
          cls, requested: syms.length, filled: batchResult.size, remaining: remaining.length,
        });
      }

      // ── 2. EODHD batch for misses ─────────────────────────────────────────
      if (remaining.length > 0 && isEodhdConfigured()) {
        const batchResult = await batchViaEodhd(remaining, cls, options.exchange);
        for (const [sym, q] of batchResult) { cacheSet(sym, q); result.set(sym, q); }
        remaining = remaining.filter(s => !batchResult.has(s));
        logDiag('info', 'eodhd_batch_done', {
          cls, filled: batchResult.size, remaining: remaining.length,
        });
      }

      // ── 3. Yahoo per-symbol for remaining misses ───────────────────────────
      if (remaining.length > 0) {
        await Promise.allSettled(remaining.map(async sym => {
          const q = await fetchViaYahoo(sym);
          if (q) { cacheSet(sym, q); result.set(sym, q); }
          else {
            const cachedFallback = cacheGet(sym, true);
            result.set(sym, cachedFallback ?? unavailableRouterQuote(sym));
          }
        }));
      }
    })());
  }

  await Promise.allSettled(fetches);
  return result;
}

// Re-export symbol mapping helpers for convenience
export { mapSymbolForTd };
