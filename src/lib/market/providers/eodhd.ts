/**
 * EODHD (EOD Historical Data) provider module.
 *
 * Endpoints used:
 *   GET /api/real-time/{sym}.{exch}?...                 — live/delayed quote
 *   GET /api/real-time/{sym}.{exch}?s={sym1,sym2,...}   — batch quotes
 *   GET /api/eod/{sym}.{exch}?from=&to=&period=         — historical OHLCV
 *   GET /api/fundamentals/{sym}.{exch}?filter=...       — company fundamentals
 *
 * API key: EODHD_API_KEY env var (never logged).
 * Server-side only.
 *
 * Symbol/exchange mapping:
 *   US stocks    → .US        Forex      → .FOREX
 *   Crypto       → -{base}-USD.CC        Indices    → .INDX
 *   Kuwait       → .KW        Saudi      → .SR
 *   UAE          → .AE        Qatar      → .QA
 *   Bahrain      → .BH        Oman       → .MSM
 */

const EO_BASE   = 'https://eodhd.com';
const TIMEOUT_MS = 10_000;
const MAX_SANE_CHANGE_PCT = 200;

// ─── Config ───────────────────────────────────────────────────────────────────

export function isEodhdConfigured(): boolean {
  return Boolean(process.env.EODHD_API_KEY?.trim());
}

function eoKey(): string {
  return (process.env.EODHD_API_KEY ?? '').trim();
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', event: string, meta: Record<string, unknown>): void {
  if (typeof process === 'undefined') return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`[eodhd] ${event}`, meta);
}

// ─── Exchange / symbol mapping ─────────────────────────────────────────────────

/** Map asset class → EODHD exchange suffix. */
export function eoExchangeSuffix(
  assetClass: string,
  exchangeHint?: string | null,
): string {
  if (exchangeHint) {
    const h = exchangeHint.toUpperCase();
    const MAP: Record<string, string> = {
      KW: 'KW',  KUWSE: 'KW',
      SA: 'SR',  TADAWUL: 'SR', SASE: 'SR',
      AE: 'AE',  ADX: 'AE',    DFM: 'DFM',
      QA: 'QA',  DSM: 'QA',
      BH: 'BH',
      OM: 'MSM', MSM: 'MSM',
      NASDAQ: 'US', NYSE: 'US', AMEX: 'US',
      LSE: 'LSE',
      XETRA: 'XETRA', FSX: 'F',
      TSE: 'TSE', TYO: 'T',
      TSX: 'TO',
    };
    if (MAP[h]) return MAP[h];
  }
  switch (assetClass) {
    case 'gulf':   return 'KW';     // default; caller should pass exchangeHint for specificity
    case 'forex':  return 'FOREX';
    case 'crypto': return 'CC';
    case 'index':  return 'INDX';
    case 'metal':  return 'COMM';
    default:       return 'US';
  }
}

/** Build the full EODHD ticker string (e.g. AAPL.US, BTCUSD.CC, EURUSD.FOREX). */
export function eoFullTicker(
  symbol: string,
  assetClass: string,
  exchangeHint?: string | null,
): string {
  const s    = symbol.toUpperCase().trim();
  const exch = eoExchangeSuffix(assetClass, exchangeHint);

  // Crypto: BTC → BTC-USD.CC, BTC/USD → BTC-USD.CC
  if (assetClass === 'crypto') {
    const base = s.replace(/\/?(USD|USDT|BTC|ETH)$/, '').replace('/', '');
    return `${base}-USD.CC`;
  }

  // Forex: EURUSD → EURUSD.FOREX
  if (assetClass === 'forex') {
    return `${s.replace('/', '')}.FOREX`;
  }

  // Metals with known mappings
  if (assetClass === 'metal') {
    const metalMap: Record<string, string> = {
      XAU: 'XAUUSD.FOREX',   XAG: 'XAGUSD.FOREX',
      GOLD: 'XAUUSD.FOREX',  SILVER: 'XAGUSD.FOREX',
      OIL: 'USOIL.COMM',     WTI: 'USOIL.COMM',
      BRENT: 'BRENT.COMM',   COPPER: 'COPPER.COMM',
      NGAS: 'NGAS.COMM',
    };
    if (metalMap[s]) return metalMap[s];
    return `${s}.COMM`;
  }

  // Indices: strip leading '^'
  if (assetClass === 'index') {
    const clean = s.startsWith('^') ? s.slice(1) : s;
    const indexMap: Record<string, string> = {
      GSPC: 'GSPC.INDX', SPX: 'GSPC.INDX', DJI: 'DJI.INDX', DJIA: 'DJI.INDX',
      NDX: 'NDX.INDX', RUT: 'RUT.INDX', VIX: 'VIX.INDX',
      FTSE: 'FTSE.INDX', DAX: 'GDAXI.INDX', N225: 'N225.INDX', HSI: 'HSI.INDX',
    };
    if (indexMap[clean]) return indexMap[clean];
    return `${clean}.INDX`;
  }

  // Gulf stocks already have suffix (e.g. ZAIN.KW)
  if (s.includes('.')) return s;

  // Default
  return `${s}.${exch}`;
}

// ─── API response shapes ──────────────────────────────────────────────────────

type EoRealTimeRaw = {
  code:          string;
  timestamp:     number;
  gmtoffset:     number;
  open:          number;
  high:          number;
  low:           number;
  close:         number;
  volume:        number;
  previousClose: number;
  change:        number;
  p_change:      number;
};

// ─── Normalized shapes ─────────────────────────────────────────────────────────

export type EoNormalizedQuote = {
  symbol:        string;
  name:          string | null;
  exchange:      string | null;
  currency:      string | null;
  price:         number;
  change:        number | null;
  changePercent: number | null;
  lastUpdated:   string;
  /** Internal diagnostics only — never expose publicly. */
  _diag: {
    provider:   'eodhd';
    keyPresent: true;
    latencyMs:  number;
    fallback:   boolean;
  };
};

export type EoCandle = {
  date:   string;   // YYYY-MM-DD
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
};

export type EoFundamentals = {
  name:          string | null;
  currency:      string | null;
  exchange:      string | null;
  country:       string | null;
  sector:        string | null;
  industry:      string | null;
  marketCap:     number | null;
  peRatio:       number | null;
  eps:           number | null;
  dividendYield: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEoRow(
  q: EoRealTimeRaw,
  origSymbol: string,
  latencyMs: number,
  isFallback = false,
): EoNormalizedQuote | null {
  if (!Number.isFinite(q.close) || q.close <= 0) return null;
  if (Number.isFinite(q.p_change) && Math.abs(q.p_change) >= MAX_SANE_CHANGE_PCT) return null;

  const sym = q.code
    ? q.code.split('.')[0].toUpperCase()
    : origSymbol.toUpperCase();

  return {
    symbol:        sym,
    name:          null,   // real-time endpoint doesn't return name
    exchange:      null,
    currency:      null,   // populate from fundamentals if needed
    price:         q.close,
    change:        Number.isFinite(q.change) ? q.change : null,
    changePercent: Number.isFinite(q.p_change) ? q.p_change : null,
    lastUpdated:   q.timestamp
      ? new Date(q.timestamp * 1000).toISOString()
      : new Date().toISOString(),
    _diag: { provider: 'eodhd', keyPresent: true, latencyMs, fallback: isFallback },
  };
}

// ─── Single real-time quote ───────────────────────────────────────────────────

export async function fetchEodhdQuote(
  symbol: string,
  options: {
    assetClass?:  string;
    exchange?:    string | null;
    isFallback?:  boolean;
  } = {},
): Promise<EoNormalizedQuote | null> {
  const apiKey     = eoKey();
  if (!apiKey) return null;

  const assetClass = options.assetClass ?? 'us';
  const fullTicker = eoFullTicker(symbol, assetClass, options.exchange);
  const url        = `${EO_BASE}/api/real-time/${encodeURIComponent(fullTicker)}?api_token=${apiKey}&fmt=json`;
  const t0         = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'quote_http_error', { symbol, fullTicker, status: res.status, ms });
      return null;
    }

    const q = await res.json() as EoRealTimeRaw;
    const parsed = parseEoRow(q, symbol, ms, options.isFallback);

    if (!parsed) {
      log('warn', 'quote_invalid', { symbol, fullTicker, close: q?.close, ms });
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

// ─── Batch quotes (multiple symbols, same exchange) ───────────────────────────

export async function fetchEodhdBatch(
  symbols: string[],
  options: {
    assetClass?: string;
    exchange?:   string | null;
    isFallback?: boolean;
  } = {},
): Promise<Map<string, EoNormalizedQuote>> {
  const apiKey  = eoKey();
  const result  = new Map<string, EoNormalizedQuote>();
  if (!apiKey || symbols.length === 0) return result;

  const assetClass = options.assetClass ?? 'us';
  const firstTicker = eoFullTicker(symbols[0], assetClass, options.exchange);

  // EODHD batch: ?s=TICKER2,TICKER3,... added to the first ticker's endpoint
  const additional = symbols.slice(1)
    .map(s => eoFullTicker(s, assetClass, options.exchange))
    .join(',');
  const sParam = additional ? `&s=${encodeURIComponent(additional)}` : '';
  const url    = `${EO_BASE}/api/real-time/${encodeURIComponent(firstTicker)}?api_token=${apiKey}&fmt=json${sParam}`;
  const t0     = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'batch_http_error', { count: symbols.length, status: res.status, ms });
      return result;
    }

    const data = await res.json() as EoRealTimeRaw | EoRealTimeRaw[];
    const rows  = Array.isArray(data) ? data : [data];

    let ok = 0;
    for (const q of rows) {
      const sym    = q.code ? q.code.split('.')[0].toUpperCase() : symbols[ok]?.toUpperCase();
      const parsed = parseEoRow(q, sym ?? '', ms, options.isFallback);
      if (!parsed) continue;
      result.set(parsed.symbol, parsed);
      ok++;
    }

    log('info', 'batch_ok', { requested: symbols.length, returned: ok, ms, keyPresent: true });
  } catch (err) {
    log('warn', 'batch_error', {
      count: symbols.length, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
  }

  return result;
}

// ─── Historical OHLCV candles ─────────────────────────────────────────────────

export async function fetchEodhdCandles(
  symbol: string,
  options: {
    assetClass?: string;
    exchange?:   string | null;
    from?:       string;   // YYYY-MM-DD
    to?:         string;   // YYYY-MM-DD
    period?:     'd' | 'w' | 'm';
  } = {},
): Promise<EoCandle[] | null> {
  const apiKey = eoKey();
  if (!apiKey) return null;

  const assetClass  = options.assetClass ?? 'us';
  const period      = options.period     ?? 'd';
  const fullTicker  = eoFullTicker(symbol, assetClass, options.exchange);

  const defaultFrom = (() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();
  const from = options.from ?? defaultFrom;
  const to   = options.to   ?? new Date().toISOString().slice(0, 10);

  const url = `${EO_BASE}/api/eod/${encodeURIComponent(fullTicker)}?api_token=${apiKey}&fmt=json&from=${from}&to=${to}&period=${period}`;
  const t0  = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'candles_http_error', { symbol, fullTicker, status: res.status, ms });
      return null;
    }

    type EoRow = { date: string; open: number; high: number; low: number; close: number; volume: number };
    const rows = await res.json() as EoRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      log('warn', 'candles_empty', { symbol, ms });
      return null;
    }

    const candles: EoCandle[] = rows
      .filter(r => Number.isFinite(r.close) && r.close > 0)
      .map(r => ({ date: r.date, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume || 0 }));

    log('info', 'candles_ok', { symbol, count: candles.length, ms, keyPresent: true });
    return candles;
  } catch (err) {
    log('warn', 'candles_error', {
      symbol, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
    return null;
  }
}

// ─── Fundamentals ─────────────────────────────────────────────────────────────

export async function fetchEodhdFundamentals(
  symbol: string,
  options: {
    assetClass?: string;
    exchange?:   string | null;
  } = {},
): Promise<EoFundamentals | null> {
  const apiKey = eoKey();
  if (!apiKey) return null;

  const assetClass = options.assetClass ?? 'us';
  const fullTicker = eoFullTicker(symbol, assetClass, options.exchange);
  const filter     = 'General::Name,General::CurrencyCode,General::Exchange,General::CountryISO,General::Sector,General::Industry,Highlights::MarketCapitalization,Highlights::PERatio,Highlights::EPS,Highlights::DividendYield';
  const url        = `${EO_BASE}/api/fundamentals/${encodeURIComponent(fullTicker)}?api_token=${apiKey}&fmt=json&filter=${filter}`;
  const t0         = Date.now();

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - t0;

    if (!res.ok) {
      log('warn', 'fundamentals_http_error', { symbol, status: res.status, ms });
      return null;
    }

    const data       = await res.json() as Record<string, unknown>;
    const general    = (data?.General    ?? {}) as Record<string, unknown>;
    const highlights = (data?.Highlights ?? {}) as Record<string, unknown>;

    const toN = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n !== 0 ? n : null; };
    const toS = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;

    log('info', 'fundamentals_ok', { symbol, ms, keyPresent: true });
    return {
      name:          toS(general.Name),
      currency:      toS(general.CurrencyCode),
      exchange:      toS(general.Exchange),
      country:       toS(general.CountryISO),
      sector:        toS(general.Sector),
      industry:      toS(general.Industry),
      marketCap:     toN(highlights.MarketCapitalization),
      peRatio:       toN(highlights.PERatio),
      eps:           toN(highlights.EPS),
      dividendYield: toN(highlights.DividendYield),
    };
  } catch (err) {
    log('warn', 'fundamentals_error', {
      symbol, message: err instanceof Error ? err.message : String(err), ms: Date.now() - t0,
    });
    return null;
  }
}
