/**
 * Twelve Data provider module.
 *
 * Endpoints used:
 *   GET /quote?symbol=...&apikey=...          — single or comma-separated batch
 *   GET /time_series?symbol=...&interval=...  — historical OHLCV candles
 *
 * API key: TWELVE_DATA_API_KEY env var (never logged).
 * Server-side only. All public-facing output uses source: "THE SFM".
 *
 * Symbol mapping:
 *   Forex    EURUSD  → EUR/USD
 *   Crypto   BTC     → BTC/USD
 *   Others   pass through unchanged
 *
 * Gulf/GCC coverage:
 *   Twelve Data covers KSE (Kuwait), Tadawul (Saudi), DFM/ADX (UAE),
 *   QSE (Qatar), BSE (Bahrain), MSM (Oman) via exchange= parameter or suffix.
 */

const TD_BASE = 'https://api.twelvedata.com';
const TIMEOUT_MS = 10_000;
const BATCH_CAP  = 120;          // max symbols per request
const MAX_SANE_CHANGE_PCT = 200; // reject |Δ%| ≥ 200 as likely bad data

// ─── Config ───────────────────────────────────────────────────────────────────

export function isTwelveDataConfigured(): boolean {
  return Boolean(process.env.TWELVE_DATA_API_KEY?.trim());
}

function tdKey(): string {
  return (process.env.TWELVE_DATA_API_KEY ?? '').trim();
}

// ─── Logging (server-side; API keys never logged) ─────────────────────────────

function log(level: 'info' | 'warn' | 'error', event: string, meta: Record<string, unknown>): void {
  if (typeof process === 'undefined') return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`[twelveData] ${event}`, meta);
}

// ─── API response shapes ──────────────────────────────────────────────────────

type TdQuoteRaw = {
  symbol?:         string;
  name?:           string;
  exchange?:       string;
  mic_code?:       string;
  currency?:       string;
  datetime?:       string;
  timestamp?:      number;
  open?:           string | number;
  high?:           string | number;
  low?:            string | number;
  close?:          string | number;
  previous_close?: string | number;
  change?:         string | number;
  percent_change?: string | number;
  volume?:         string | number;
  is_market_open?: boolean;
  // Error fields
  status?:         string;
  code?:           number;
  message?:        string;
};

type TdTimeSeriesRaw = {
  meta: {
    symbol:   string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type:     string;
  };
  values: Array<{
    datetime: string;
    open:     string;
    high:     string;
    low:      string;
    close:    string;
    volume:   string;
  }>;
  status: string;
  message?: string;
};

// ─── Normalized shapes ────────────────────────────────────────────────────────

export type TdNormalizedQuote = {
  symbol:        string;
  name:          string | null;
  exchange:      string | null;
  currency:      string | null;
  price:         number;
  change:        number | null;
  changePercent: number | null;
  lastUpdated:   string;
  isMarketOpen:  boolean;
  /** Internal diagnostics only — never expose publicly. */
  _diag: {
    provider:   'twelvedata';
    keyPresent: true;
    latencyMs:  number;
    fallback:   false;
  };
};

export type TdCandle = {
  datetime: string;  // ISO or YYYY-MM-DD HH:mm:ss
  open:     number;
  high:     number;
  low:      number;
  close:    number;
  volume:   number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Adapt symbol to Twelve Data format.
 *   - Forex: EURUSD → EUR/USD
 *   - Crypto: BTC → BTC/USD  (only bare base symbols without slash)
 *   - Gulf:   ZAIN.KW → ZAIN:KW  (TD uses colon for exchange disambiguation)
 *             or pass as-is and let TD resolve via exchange= param
 */
export function mapSymbolForTd(symbol: string, assetClass: string): string {
  const s = symbol.toUpperCase().trim();
  if (assetClass === 'forex') {
    const stripped = s.replace('/', '');
    if (/^[A-Z]{6}$/.test(stripped)) return `${stripped.slice(0, 3)}/${stripped.slice(3)}`;
  }
  if (assetClass === 'crypto' && !s.includes('/') && !s.includes('-')) {
    // Only append /USD if it looks like a bare base symbol
    if (/^[A-Z]{2,8}$/.test(s)) return `${s}/USD`;
  }
  // Gulf dot-suffix (e.g. ZAIN.KW) — Twelve Data accepts these directly
  return s;
}

function parseTdQuote(
  q: TdQuoteRaw,
  origSymbol: string,
  latencyMs: number,
): TdNormalizedQuote | null {
  if (q.status === 'error' || (typeof q.code === 'number' && q.code !== 200)) {
    return null;
  }
  const price = toNum(q.close);
  if (price == null || price <= 0) return null;
  const changePercent = toNum(q.percent_change);
  if (changePercent != null && Math.abs(changePercent) >= MAX_SANE_CHANGE_PCT) return null;

  const lastUpdated = q.timestamp
    ? new Date(q.timestamp * 1000).toISOString()
    : q.datetime
      ? new Date(q.datetime).toISOString()
      : new Date().toISOString();

  return {
    symbol:        (q.symbol ?? origSymbol).toUpperCase(),
    name:          q.name ?? null,
    exchange:      q.exchange ?? null,
    currency:      q.currency ?? null,
    price,
    change:        toNum(q.change),
    changePercent,
    lastUpdated,
    isMarketOpen:  q.is_market_open ?? false,
    _diag: { provider: 'twelvedata', keyPresent: true, latencyMs, fallback: false },
  };
}

// ─── Single-symbol quote ──────────────────────────────────────────────────────

export async function fetchTwelveDataQuote(
  symbol: string,
  assetClass = 'us',
): Promise<TdNormalizedQuote | null> {
  const apiKey = tdKey();
  if (!apiKey) return null;

  const tdSym = mapSymbolForTd(symbol, assetClass);
  const url   = `${TD_BASE}/quote?symbol=${encodeURIComponent(tdSym)}&apikey=${apiKey}`;
  const t0    = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'quote_http_error', { symbol, tdSym, status: res.status, ms });
      return null;
    }

    const q = await res.json() as TdQuoteRaw;
    const parsed = parseTdQuote(q, symbol, ms);

    if (!parsed) {
      log('warn', 'quote_invalid', { symbol, tdSym, code: q.code, message: q.message, ms });
      return null;
    }

    log('info', 'quote_ok', { symbol, ms, keyPresent: true });
    return parsed;
  } catch (err) {
    log('warn', 'quote_error', {
      symbol, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
    return null;
  }
}

// ─── Batch quote (comma-separated symbols, up to BATCH_CAP) ──────────────────

export async function fetchTwelveDataBatch(
  symbols: string[],
  assetClass = 'us',
): Promise<Map<string, TdNormalizedQuote>> {
  const apiKey = tdKey();
  const result = new Map<string, TdNormalizedQuote>();
  if (!apiKey || symbols.length === 0) return result;

  const batch  = symbols.slice(0, BATCH_CAP);
  const tdSyms = batch.map(s => mapSymbolForTd(s, assetClass));
  const url    = `${TD_BASE}/quote?symbol=${encodeURIComponent(tdSyms.join(','))}&apikey=${apiKey}`;
  const t0     = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'batch_http_error', { count: batch.length, status: res.status, ms });
      return result;
    }

    const raw = await res.json() as TdQuoteRaw | Record<string, TdQuoteRaw>;

    // Single symbol → TdQuoteRaw; multiple → { SYMBOL: TdQuoteRaw, ... }
    const isSingle = typeof (raw as TdQuoteRaw).symbol === 'string' && !Object.keys(raw).some(k => typeof (raw as Record<string, TdQuoteRaw>)[k]?.close === 'string');
    const entries: [string, TdQuoteRaw][] = isSingle
      ? [[(raw as TdQuoteRaw).symbol ?? batch[0], raw as TdQuoteRaw]]
      : Object.entries(raw as Record<string, TdQuoteRaw>);

    let ok = 0;
    for (const [sym, q] of entries) {
      const parsed = parseTdQuote(q, sym, ms);
      if (!parsed) continue;
      result.set(parsed.symbol, parsed);
      ok++;
    }

    log('info', 'batch_ok', { requested: batch.length, returned: ok, ms, keyPresent: true });
  } catch (err) {
    log('warn', 'batch_error', {
      count: batch.length, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
  }

  return result;
}

// ─── Time-series candles ──────────────────────────────────────────────────────

export async function fetchTwelveDataTimeSeries(
  symbol: string,
  options: {
    interval?:   '1min' | '5min' | '15min' | '1h' | '1day' | '1week' | '1month';
    outputsize?: number;
    assetClass?: string;
  } = {},
): Promise<TdCandle[] | null> {
  const apiKey     = tdKey();
  if (!apiKey) return null;

  const assetClass = options.assetClass ?? 'us';
  const interval   = options.interval   ?? '1day';
  const outputsize = Math.min(options.outputsize ?? 30, 5000);
  const tdSym      = mapSymbolForTd(symbol, assetClass);
  const url        = `${TD_BASE}/time_series?symbol=${encodeURIComponent(tdSym)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
  const t0         = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'timeseries_http_error', { symbol, status: res.status, ms });
      return null;
    }

    const data = await res.json() as TdTimeSeriesRaw;

    if (data.status === 'error' || !Array.isArray(data.values)) {
      log('warn', 'timeseries_api_error', { symbol, status: data.status, message: data.message, ms });
      return null;
    }

    const candles: TdCandle[] = data.values
      .map(v => ({
        datetime: v.datetime,
        open:     parseFloat(v.open),
        high:     parseFloat(v.high),
        low:      parseFloat(v.low),
        close:    parseFloat(v.close),
        volume:   parseFloat(v.volume) || 0,
      }))
      .filter(c => Number.isFinite(c.close) && c.close > 0);

    log('info', 'timeseries_ok', { symbol, interval, candles: candles.length, ms, keyPresent: true });
    return candles;
  } catch (err) {
    log('warn', 'timeseries_error', {
      symbol, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
    return null;
  }
}
