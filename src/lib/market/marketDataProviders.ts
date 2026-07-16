import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { detectPriceUnit, normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeAssetType, type MarketAssetType, type MarketHistoryPoint, type MarketSearchItem } from '@/lib/market/marketService';
import { isValidChange, isValidPrice } from '@/lib/market/quoteNormalization';
import { cleanEnv } from '@/lib/market/providerConfig';
import { providerSymbolsForProviderAlias } from '@/lib/market/providerSymbolAliases';
import { cryptoQuoteRejectionReason, resolveCanonicalCryptoSymbol } from '@/lib/market/canonicalSymbols';
import { classifyRuntimeFailure, logReliabilityEvent } from '@/lib/runtime/reliability';
import { recordProviderMetric } from '@/lib/observability/server';

export type MarketDataProviderName = 'twelve_data' | 'finnhub' | 'eodhd' | 'marketstack' | 'yahoo';
export type MarketDelayType = 'realtime' | 'delayed' | 'eod' | 'cached' | 'unknown';

export type MarketDataProviderContext = {
  symbol?: string | null;
  market?: string | null;
  assetType?: MarketAssetType | string | null;
  name?: string | null;
  exchange?: string | null;
  exchangeCode?: string | null;
  country?: string | null;
  currency?: string | null;
  excludeProviders?: MarketDataProviderName[];
  forceFresh?: boolean;
};

export type NormalizedMarketQuote = {
  symbol: string;
  providerSymbol: string;
  name: string | null;
  price: number;
  currency: string | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  market: string | null;
  exchange: string | null;
  exchangeCode: string | null;
  country: string | null;
  assetType: string | null;
  provider: MarketDataProviderName;
  providerName: string;
  delayType: MarketDelayType;
  lastUpdated: string | null;
  cached?: boolean;
  cacheAgeSeconds?: number;
};

export type NormalizedMarketCandle = MarketHistoryPoint & {
  timestamp?: string;
  provider?: MarketDataProviderName;
};

export type NormalizedCompanyProfile = {
  symbol: string;
  providerSymbol: string;
  provider: MarketDataProviderName;
  name?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
  website?: string;
  description?: string;
  marketCap?: number | string;
  employees?: number | string;
  logo?: string | null;
  raw?: Record<string, unknown>;
};

export type NormalizedMarketNewsItem = {
  id: string;
  symbol?: string;
  title: string;
  source?: string;
  url?: string;
  summary?: string;
  publishedAt?: string;
  provider: MarketDataProviderName;
};

export type NormalizedExchangeMetadata = {
  provider: MarketDataProviderName;
  exchange: string;
  name?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  raw?: Record<string, unknown>;
};

export type ProviderHealthStatus =
  | 'healthy'
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'tls_error'
  | 'dns_error'
  | 'timeout'
  | 'network_error'
  | 'provider_unavailable'
  | 'maintenance'
  | 'no_data'
  | 'invalid_symbol'
  | 'unsupported_asset'
  | 'server_error'
  | 'invalid_response'
  | 'error';

export type ProviderHealthResult = {
  provider: MarketDataProviderName;
  displayName: string;
  configured: boolean;
  status: ProviderHealthStatus;
  latencyMs: number | null;
  remainingQuota: string | number | null;
  latestError: string | null;
  lastCheckedAt: string;
};

export type ProviderAttemptFailure = {
  provider: MarketDataProviderName;
  providerSymbol?: string;
  code: string;
  status?: number;
  message: string;
  category: string;
  retryable: boolean;
};

export type ProviderFallbackResult<T> =
  | { ok: true; data: T; provider: MarketDataProviderName; attempts: ProviderAttemptFailure[] }
  | { ok: false; attempts: ProviderAttemptFailure[]; latestError: string | null };

export interface MarketDataProvider {
  name: MarketDataProviderName;
  displayName: string;
  configured(): boolean;
  getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext): Promise<NormalizedMarketQuote | null>;
  getCandles(symbol: string, market?: string | null, interval?: string | null, context?: MarketDataProviderContext): Promise<NormalizedMarketCandle[]>;
  getCompanyProfile(symbol: string, market?: string | null, context?: MarketDataProviderContext): Promise<NormalizedCompanyProfile | null>;
  getLogo(symbol: string, market?: string | null, context?: MarketDataProviderContext): Promise<string | null>;
  getNews(symbol: string, market?: string | null, context?: MarketDataProviderContext): Promise<NormalizedMarketNewsItem[]>;
  getSymbolSearch(query: string, market?: string | null, context?: MarketDataProviderContext): Promise<MarketSearchItem[]>;
  getExchangeMetadata(exchange: string): Promise<NormalizedExchangeMetadata | null>;
  healthCheck(): Promise<ProviderHealthResult>;
}

const USER_AGENT = 'THE-SFM/1.0 (+https://www.the-sfm.com)';
const REQUEST_TIMEOUT_MS = 9000;
const QUOTE_CACHE_MS = 45 * 1000;
const PROFILE_CACHE_MS = 24 * 60 * 60 * 1000;
const LOGO_CACHE_MS = 24 * 60 * 60 * 1000;
const SYMBOL_CACHE_MS = 24 * 60 * 60 * 1000;
const CANDLES_CACHE_MS = 5 * 60 * 1000;

const providerErrors = new Map<MarketDataProviderName, string>();
const memoryCache = new Map<string, { data: unknown; createdAt: number; expiresAt: number }>();
const fallbackCache = new Map<string, { data: unknown; provider: MarketDataProviderName; storedAt: number }>();
const FALLBACK_QUOTE_TTL_MS = 6 * 60 * 60 * 1000;
const FALLBACK_CANDLES_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function apiKey(name: 'TWELVE_DATA_API_KEY' | 'FINNHUB_API_KEY' | 'EODHD_API_KEY' | 'MARKETSTACK_API_KEY') {
  return cleanEnv(process.env[name]);
}

function cacheGet<T>(key: string, forceFresh?: boolean): { data: T; ageSeconds: number } | null {
  if (forceFresh) return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return { data: entry.data as T, ageSeconds: Math.max(0, Math.round((Date.now() - entry.createdAt) / 1000)) };
}

function cacheSet(key: string, data: unknown, ttlMs: number) {
  const now = Date.now();
  memoryCache.set(key, { data, createdAt: now, expiresAt: now + ttlMs });
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text && !/^n\/?a$/i.test(text) ? text : null;
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return new Date(numeric * (String(Math.trunc(numeric)).length <= 10 ? 1000 : 1)).toISOString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function round(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(6));
}

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function stripSuffix(symbol: string) {
  return upper(symbol).replace(/\.(KW|SR|SA|AE|DU|AD|QA|BH|OM|US)$/i, '');
}

function compactPair(symbol: string) {
  return upper(symbol).replace(/=X$/i, '').replace(/[-_/]/g, '').replace(/[^A-Z0-9]/g, '');
}

function canonicalCryptoFor(symbol: string, context?: MarketDataProviderContext) {
  return resolveCanonicalCryptoSymbol(context?.symbol ?? symbol, {
    assetClass: context?.assetType,
    allowInferred: normalizeAssetType(context?.assetType) === 'crypto',
  }) ?? resolveCanonicalCryptoSymbol(symbol, {
    assetClass: context?.assetType,
    allowInferred: normalizeAssetType(context?.assetType) === 'crypto',
  });
}

function exchangeCurrency(symbol: string, context?: MarketDataProviderContext) {
  const s = upper(symbol || context?.symbol);
  const market = upper(context?.market);
  const exchange = upper(context?.exchange);
  const haystack = `${s} ${market} ${exchange} ${upper(context?.country)}`;
  if (/\.KW\b|KUWAIT|BOURSA|KSE/.test(haystack)) return 'KWD';
  if (/\.SR\b|\.SA\b|SAUDI|TADAWUL/.test(haystack)) return 'SAR';
  if (/\.AE\b|\.DU\b|\.AD\b|DUBAI|ABU DHABI|UAE|DFM|ADX/.test(haystack)) return 'AED';
  if (/\.QA\b|QATAR/.test(haystack)) return 'QAR';
  if (/\.OM\b|OMAN|MUSCAT/.test(haystack)) return 'OMR';
  if (/\.BH\b|BAHRAIN/.test(haystack)) return 'BHD';
  if (/\.L\b|LONDON|LSE/.test(haystack)) return 'GBP';
  if (/\.DE\b|\.PA\b|\.AS\b|XETRA|EURONEXT|FRANKFURT|PARIS|AMSTERDAM/.test(haystack)) return 'EUR';
  if (/\.T\b|TOKYO|JAPAN/.test(haystack)) return 'JPY';
  if (/\.HK\b|HONG KONG|HKEX/.test(haystack)) return 'HKD';
  return context?.currency ?? null;
}

function normalizeQuote(input: {
  symbol: string;
  providerSymbol: string;
  provider: MarketDataProviderName;
  providerName: string;
  name?: unknown;
  price?: unknown;
  currency?: unknown;
  change?: unknown;
  changePercent?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  previousClose?: unknown;
  volume?: unknown;
  market?: unknown;
  exchange?: unknown;
  exchangeCode?: unknown;
  country?: unknown;
  assetType?: unknown;
  delayType: MarketDelayType;
  lastUpdated?: unknown;
  context?: MarketDataProviderContext;
}): NormalizedMarketQuote | null {
  const rawPrice = numberOrNull(input.price);
  if (rawPrice === null || rawPrice <= 0) return null;
  const assetType = normalizeAssetType(input.context?.assetType ?? input.assetType);
  const collisionReason = cryptoQuoteRejectionReason({
    requestedSymbol: input.context?.symbol ?? input.symbol,
    canonicalSymbol: canonicalCryptoFor(input.symbol, input.context)?.canonicalSymbol,
    assetClass: assetType,
    provider: input.provider,
    providerSymbol: input.providerSymbol,
    responseSymbol: input.providerSymbol,
    responseName: input.name,
    responseAssetType: input.assetType,
    responsePrice: rawPrice,
  });
  if (collisionReason) {
    console.warn('[market-data-provider] rejected quote collision', {
      assetClass: assetType,
      provider: input.provider,
      rejectionReason: collisionReason,
    });
    return null;
  }
  const resolved = resolveMarketCurrency({
    providerCurrency: input.currency ?? input.context?.currency ?? exchangeCurrency(input.symbol, input.context),
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    exchange: input.exchange ?? input.context?.exchange,
    market: input.market ?? input.context?.market,
    country: input.context?.country,
    assetType,
  });
  const priceUnit = detectPriceUnit({
    price: rawPrice,
    currency: resolved.currency,
    providerCurrency: input.currency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    exchange: String(input.exchange ?? input.context?.exchange ?? ''),
    market: String(input.market ?? input.context?.market ?? ''),
    assetType,
  });
  const normalizeValue = (value: unknown) => {
    const parsed = numberOrNull(value);
    if (parsed === null) return null;
    return normalizeMarketPrice({
      price: parsed,
      currency: resolved.currency,
      providerCurrency: input.currency,
      symbol: input.symbol,
      providerSymbol: input.providerSymbol,
      exchange: String(input.exchange ?? input.context?.exchange ?? ''),
      market: String(input.market ?? input.context?.market ?? ''),
      assetType,
      priceUnit,
    }).price;
  };
  const price = normalizeValue(rawPrice);
  if (!isValidPrice(price)) return null;
  const previousClose = normalizeValue(input.previousClose);
  const validPreviousClose = isValidPrice(previousClose) ? previousClose : null;
  const change = validPreviousClose !== null ? price - validPreviousClose : null;
  const explicitChangePercent = numberOrNull(input.changePercent);
  const changePercent = validPreviousClose !== null
    ? ((price - validPreviousClose) / validPreviousClose) * 100
    : isValidChange(explicitChangePercent)
      ? explicitChangePercent
      : null;
  return {
    symbol: upper(input.symbol),
    providerSymbol: input.providerSymbol,
    name: textOrNull(input.name) ?? textOrNull(input.context?.name),
    price: round(price) ?? price,
    currency: resolved.currency,
    change: round(change),
    changePercent: round(changePercent),
    open: round(normalizeValue(input.open)),
    high: round(normalizeValue(input.high)),
    low: round(normalizeValue(input.low)),
    previousClose: round(validPreviousClose),
    volume: numberOrNull(input.volume),
    market: textOrNull(input.market ?? input.context?.market),
    exchange: textOrNull(input.exchange ?? input.context?.exchange),
    exchangeCode: textOrNull(input.exchangeCode ?? input.context?.exchangeCode),
    country: textOrNull(input.country ?? input.context?.country),
    assetType: textOrNull(input.assetType ?? input.context?.assetType),
    provider: input.provider,
    providerName: input.providerName,
    delayType: input.delayType,
    lastUpdated: toIso(input.lastUpdated) ?? new Date().toISOString(),
  };
}

function logProviderSuccess(provider: MarketDataProviderName, operation: string, _symbol: string, latencyMs: number, cacheHit?: boolean) {
  providerErrors.delete(provider);
  console.info('[market-data-provider] success', { provider, operation, latencyMs, cacheHit: Boolean(cacheHit) });
}

function logProviderFailure(provider: MarketDataProviderName, operation: string, symbol: string, error: ProviderAttemptFailure) {
  providerErrors.set(provider, error.code);
  logReliabilityEvent('warn', 'market_data_provider_failed', {
    provider,
    operation,
    symbol,
    providerSymbol: error.providerSymbol,
    failureCode: error.code,
    category: error.category,
    httpStatus: error.status,
    retryable: error.retryable,
  });
}

async function fetchJson(url: string, options?: { cacheKey?: string; ttlMs?: number; forceFresh?: boolean; timeoutMs?: number; headers?: HeadersInit }) {
  if (options?.cacheKey && options.ttlMs) {
    const cached = cacheGet<unknown>(options.cacheKey, options.forceFresh);
    if (cached) return { ok: true, status: 200, data: cached.data, cacheHit: true, cacheAgeSeconds: cached.ageSeconds, headers: new Headers() };
  }
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(options?.timeoutMs ?? REQUEST_TIMEOUT_MS),
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
      ...(options?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (response.ok && options?.cacheKey && options.ttlMs) cacheSet(options.cacheKey, data, options.ttlMs);
  return { ok: response.ok, status: response.status, data, cacheHit: false, cacheAgeSeconds: 0, headers: response.headers };
}

function providerError(provider: MarketDataProviderName, code: string, message: string, providerSymbol?: string, status?: number): ProviderAttemptFailure {
  const classified = classifyRuntimeFailure(
    status === undefined ? new Error(message || code) : { status, message },
    {
      httpStatus: status,
      noData: /returned_empty|no_data|empty_result/i.test(code),
      notConfigured: code === 'not_configured',
      invalidSymbol: /invalid_symbol/i.test(code),
      unsupportedAsset: /unsupported/i.test(code),
    },
  );
  return {
    provider,
    providerSymbol,
    code: classified.code,
    status,
    message: classified.messageKey,
    category: classified.category,
    retryable: classified.retryable,
  };
}

function fallbackKey(operation: string, symbol: string, market?: string | null, context?: MarketDataProviderContext) {
  return [operation, upper(symbol), upper(market), upper(context?.assetType), upper(context?.exchange)].join(':');
}

function setFallback<T>(key: string, data: T, provider: MarketDataProviderName) {
  fallbackCache.set(key, { data, provider, storedAt: Date.now() });
}

function getFallback<T>(key: string, maxAgeMs: number) {
  const cached = fallbackCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.storedAt > maxAgeMs) {
    fallbackCache.delete(key);
    return null;
  }
  return cached as { data: T; provider: MarketDataProviderName; storedAt: number };
}

function healthStatusForFailure(code: string): ProviderHealthStatus {
  const statuses: Partial<Record<string, ProviderHealthStatus>> = {
    UNAUTHORIZED: 'unauthorized',
    AUTHENTICATION_EXPIRED: 'unauthorized',
    FORBIDDEN: 'forbidden',
    NOT_FOUND: 'not_found',
    RATE_LIMITED: 'rate_limited',
    TLS_FAILURE: 'tls_error',
    DNS_FAILURE: 'dns_error',
    TIMEOUT: 'timeout',
    NETWORK_FAILURE: 'network_error',
    PROVIDER_UNAVAILABLE: 'provider_unavailable',
    PROVIDER_MAINTENANCE: 'maintenance',
    NO_MARKET_DATA: 'no_data',
    INVALID_SYMBOL: 'invalid_symbol',
    UNSUPPORTED_ASSET: 'unsupported_asset',
    SERVER_ERROR: 'server_error',
    INVALID_RESPONSE: 'invalid_response',
    NOT_CONFIGURED: 'not_configured',
  };
  return statuses[code] ?? 'error';
}

function twelveExchangeCandidates(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
  const s = upper(symbol);
  const marketText = upper(market ?? context?.market ?? context?.exchange);
  const suffix = s.includes('.') ? s.split('.').pop() : '';
  const exchange = suffix === 'KW' || /KUWAIT|BOURSA|KSE/.test(marketText) ? 'KSE'
    : suffix === 'SR' || suffix === 'SA' || /SAUDI|TADAWUL/.test(marketText) ? 'TADAWUL'
      : suffix === 'DU' || suffix === 'AE' || /DUBAI|DFM/.test(marketText) ? 'DFM'
        : suffix === 'AD' || /ABU DHABI|ADX/.test(marketText) ? 'ADX'
          : suffix === 'QA' || /QATAR/.test(marketText) ? 'QE'
            : suffix === 'OM' || /OMAN|MUSCAT/.test(marketText) ? 'MSM'
              : suffix === 'BH' || /BAHRAIN/.test(marketText) ? 'BHB'
                : null;
  const base = stripSuffix(s);
  const assetType = normalizeAssetType(context?.assetType);
  if (assetType === 'forex') {
    const pair = compactPair(s);
    return [{ symbol: `${pair.slice(0, 3)}/${pair.slice(3, 6)}`, exchange: null }];
  }
  if (assetType === 'crypto') {
    const canonical = canonicalCryptoFor(s, context);
    if (canonical) return [{ symbol: canonical.providerSymbols.twelveData, exchange: null }];
    const pair = compactPair(s).replace(/USDT$/, 'USD');
    return [{ symbol: `${pair.replace(/USD$/, '')}/USD`, exchange: null }];
  }
  if (assetType === 'gold' || assetType === 'commodity') {
    const pair = compactPair(s);
    if (pair === 'XAUUSD' || pair === 'GOLD') return [{ symbol: 'XAU/USD', exchange: null }, { symbol: 'Gold', exchange: null }];
    if (pair === 'XAGUSD' || pair === 'SILVER') return [{ symbol: 'XAG/USD', exchange: null }];
    if (pair === 'WTI') return [{ symbol: 'WTI/USD', exchange: null }];
  }
  return [
    ...(exchange ? [{ symbol: base, exchange }] : []),
    { symbol: s, exchange: null },
    { symbol: base, exchange: null },
  ];
}

function finnhubCandidates(symbol: string, context?: MarketDataProviderContext) {
  const alias = providerSymbolsForProviderAlias(symbol, 'finnhub', normalizeAssetType(context?.assetType));
  const s = upper(symbol);
  const assetType = normalizeAssetType(context?.assetType);
  const base = stripSuffix(s);
  if (assetType === 'forex') {
    const pair = compactPair(s);
    return [...alias, `OANDA:${pair.slice(0, 3)}_${pair.slice(3, 6)}`, pair];
  }
  if (assetType === 'crypto') {
    const canonical = canonicalCryptoFor(s, context);
    if (canonical) return [...alias, canonical.providerSymbols.finnhub, canonical.providerSymbols.binance];
    const pair = compactPair(s).replace(/USD$/, 'USDT');
    return [...alias, `BINANCE:${pair}`];
  }
  return [...alias, s, base];
}

function eodhdCandidates(symbol: string, context?: MarketDataProviderContext) {
  const s = upper(symbol);
  const assetType = normalizeAssetType(context?.assetType);
  const base = stripSuffix(s);
  if (assetType === 'forex') return [`${compactPair(s)}.FOREX`, compactPair(s)];
  if (assetType === 'crypto') {
    const canonical = canonicalCryptoFor(s, context);
    if (canonical) return [canonical.providerSymbols.eodhd];
    return [`${compactPair(s).replace(/USD$/, '-USD')}.CC`, `${compactPair(s).replace(/USD$/, '')}-USD.CC`];
  }
  if (assetType === 'gold' || assetType === 'commodity') {
    const pair = compactPair(s);
    if (pair === 'XAUUSD' || pair === 'GOLD') return ['XAUUSD.FOREX', 'GC.COMM'];
    if (pair === 'XAGUSD') return ['XAGUSD.FOREX', 'SI.COMM'];
  }
  if (/\.KW$/.test(s)) return [s, `${base}.KW`, `${base}.KSE`];
  if (/\.SR$|\.SA$/.test(s)) return [s, `${base}.SR`, `${base}.SAU`];
  if (/\.AE$|\.DU$/.test(s)) return [`${base}.DU`, `${base}.AE`, s];
  if (/\.AD$/.test(s)) return [`${base}.AD`, `${base}.AE`, s];
  if (/\.QA$/.test(s)) return [s, `${base}.QA`];
  if (/\.OM$/.test(s)) return [s, `${base}.OM`];
  if (/\.BH$/.test(s)) return [s, `${base}.BH`];
  if (/^[A-Z]{1,5}$/.test(s)) return [`${s}.US`, s];
  return [s];
}

function yahooCandidates(symbol: string, context?: MarketDataProviderContext) {
  const alias = providerSymbolsForProviderAlias(symbol, 'yahoo', normalizeAssetType(context?.assetType));
  const s = upper(symbol);
  const assetType = normalizeAssetType(context?.assetType);
  if (assetType === 'forex') return [...alias, `${compactPair(s)}=X`, compactPair(s)];
  if (assetType === 'crypto') {
    const canonical = canonicalCryptoFor(s, context);
    if (canonical) return [...alias, canonical.providerSymbols.yahoo];
    return [...alias, `${compactPair(s).replace(/USD$/, '')}-USD`];
  }
  if (assetType === 'gold' || assetType === 'commodity') {
    const pair = compactPair(s);
    if (pair === 'XAUUSD' || pair === 'GOLD') return [...alias, 'GC=F', 'XAUUSD=X'];
    if (pair === 'XAGUSD') return [...alias, 'SI=F', 'XAGUSD=X'];
  }
  return [...alias, s];
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter(value => {
    const text = String(value ?? '').trim();
    const key = text.toUpperCase();
    if (!text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

abstract class BaseProvider implements MarketDataProvider {
  abstract name: MarketDataProviderName;
  abstract displayName: string;
  abstract configured(): boolean;
  abstract getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext): Promise<NormalizedMarketQuote | null>;
  async getCandles(_symbol: string, _market?: string | null, _interval?: string | null, _context?: MarketDataProviderContext): Promise<NormalizedMarketCandle[]> { return []; }
  async getCompanyProfile(_symbol: string, _market?: string | null, _context?: MarketDataProviderContext): Promise<NormalizedCompanyProfile | null> { return null; }
  async getLogo(_symbol: string, _market?: string | null, _context?: MarketDataProviderContext): Promise<string | null> { return null; }
  async getNews(_symbol: string, _market?: string | null, _context?: MarketDataProviderContext): Promise<NormalizedMarketNewsItem[]> { return []; }
  async getSymbolSearch(_query: string, _market?: string | null, _context?: MarketDataProviderContext): Promise<MarketSearchItem[]> { return []; }
  async getExchangeMetadata(_exchange: string): Promise<NormalizedExchangeMetadata | null> { return null; }
  async healthCheck(): Promise<ProviderHealthResult> {
    const checkedAt = new Date().toISOString();
    if (!this.configured()) {
      return { provider: this.name, displayName: this.displayName, configured: false, status: 'not_configured', latencyMs: null, remainingQuota: null, latestError: null, lastCheckedAt: checkedAt };
    }
    const started = Date.now();
    try {
      const quote = await this.getQuote('AAPL', 'US', { assetType: 'stock', exchange: 'NASDAQ', currency: 'USD', forceFresh: true });
      return {
        provider: this.name,
        displayName: this.displayName,
        configured: true,
        status: quote ? 'healthy' : healthStatusForFailure(providerErrors.get(this.name) ?? 'NO_MARKET_DATA'),
        latencyMs: Date.now() - started,
        remainingQuota: null,
        latestError: quote ? null : providerErrors.get(this.name) ?? 'NO_MARKET_DATA',
        lastCheckedAt: checkedAt,
      };
    } catch (error) {
      const classified = classifyRuntimeFailure(error);
      providerErrors.set(this.name, classified.code);
      logReliabilityEvent('warn', 'market_data_provider_health_failed', {
        provider: this.name,
        failureCode: classified.code,
        category: classified.category,
        retryable: classified.retryable,
      });
      return {
        provider: this.name,
        displayName: this.displayName,
        configured: true,
        status: healthStatusForFailure(classified.code),
        latencyMs: Date.now() - started,
        remainingQuota: null,
        latestError: classified.code,
        lastCheckedAt: checkedAt,
      };
    }
  }
}

class TwelveDataProvider extends BaseProvider {
  name = 'twelve_data' as const;
  displayName = 'Twelve Data';
  configured() { return Boolean(apiKey('TWELVE_DATA_API_KEY')); }

  async getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('TWELVE_DATA_API_KEY');
    if (!key) return null;
    for (const candidate of twelveExchangeCandidates(symbol, market, context)) {
      const params = new URLSearchParams({ symbol: candidate.symbol, apikey: key });
      if (candidate.exchange) params.set('exchange', candidate.exchange);
      const cacheKey = `quote:${this.name}:${params.get('symbol')}:${params.get('exchange') ?? ''}`;
      const started = Date.now();
      const result = await fetchJson(`https://api.twelvedata.com/quote?${params.toString()}`, { cacheKey, ttlMs: QUOTE_CACHE_MS, forceFresh: context?.forceFresh });
      const body = result.data as Record<string, unknown> | null;
      if (!result.ok || !body || body.status === 'error') {
        logProviderFailure(this.name, 'quote', symbol, providerError(this.name, String(body?.code ?? `http_${result.status}`), String(body?.message ?? 'provider_error'), candidate.symbol, result.status));
        continue;
      }
      const quote = normalizeQuote({
        symbol: context?.symbol ?? symbol,
        providerSymbol: candidate.exchange ? `${candidate.symbol}:${candidate.exchange}` : candidate.symbol,
        provider: this.name,
        providerName: this.displayName,
        name: body.name,
        price: body.close ?? body.price,
        currency: body.currency,
        change: body.change,
        changePercent: body.percent_change,
        open: body.open,
        high: body.high,
        low: body.low,
        previousClose: body.previous_close,
        volume: body.volume,
        market: market ?? body.exchange,
        exchange: body.exchange ?? candidate.exchange,
        exchangeCode: body.mic_code ?? candidate.exchange,
        country: body.country,
        assetType: body.type ?? body.instrument_type,
        delayType: body.is_market_open === true ? 'realtime' : 'delayed',
        lastUpdated: body.datetime ?? body.timestamp,
        context,
      });
      if (quote) {
        if (result.cacheHit) Object.assign(quote, { cached: true, cacheAgeSeconds: result.cacheAgeSeconds, delayType: 'cached' as MarketDelayType });
        logProviderSuccess(this.name, 'quote', symbol, Date.now() - started, result.cacheHit);
        return quote;
      }
    }
    return null;
  }

  async getCandles(symbol: string, market?: string | null, interval = '1day', context?: MarketDataProviderContext) {
    const key = apiKey('TWELVE_DATA_API_KEY');
    if (!key) return [];
    const candidate = twelveExchangeCandidates(symbol, market, context)[0];
    if (!candidate) return [];
    const params = new URLSearchParams({ symbol: candidate.symbol, interval: interval || '1day', outputsize: '120', apikey: key });
    if (candidate.exchange) params.set('exchange', candidate.exchange);
    const result = await fetchJson(`https://api.twelvedata.com/time_series?${params.toString()}`, {
      cacheKey: `candles:${this.name}:${params.get('symbol')}:${params.get('exchange') ?? ''}:${params.get('interval')}`,
      ttlMs: CANDLES_CACHE_MS,
      forceFresh: context?.forceFresh,
    });
    const values = Array.isArray((result.data as Record<string, unknown> | null)?.values) ? (result.data as { values: Record<string, unknown>[] }).values : [];
    return values.map(item => ({
      date: String(item.datetime ?? item.date ?? ''),
      open: numberOrNull(item.open) ?? undefined,
      high: numberOrNull(item.high) ?? undefined,
      low: numberOrNull(item.low) ?? undefined,
      close: numberOrNull(item.close) ?? 0,
      volume: numberOrNull(item.volume),
      provider: this.name,
    })).filter(item => item.date && item.close > 0).reverse();
  }

  async getSymbolSearch(query: string, market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('TWELVE_DATA_API_KEY');
    if (!key || query.trim().length < 2) return [];
    const params = new URLSearchParams({ symbol: query.trim(), apikey: key });
    if (market) params.set('exchange', market);
    const result = await fetchJson(`https://api.twelvedata.com/symbol_search?${params.toString()}`, {
      cacheKey: `search:${this.name}:${query}:${market ?? ''}:${context?.assetType ?? ''}`,
      ttlMs: SYMBOL_CACHE_MS,
    });
    const rows = Array.isArray((result.data as Record<string, unknown> | null)?.data) ? (result.data as { data: Record<string, unknown>[] }).data : [];
    return rows.slice(0, 20).map(row => ({
      symbol: upper(row.symbol),
      providerSymbol: upper(row.symbol),
      name: String(row.instrument_name ?? row.name ?? row.symbol ?? ''),
      assetType: normalizeAssetType(row.instrument_type ?? context?.assetType),
      exchange: textOrNull(row.exchange) ?? undefined,
      exchangeCode: textOrNull(row.mic_code ?? row.exchange) ?? undefined,
      market: textOrNull(row.exchange) ?? undefined,
      country: textOrNull(row.country) ?? undefined,
      currency: textOrNull(row.currency) ?? undefined,
    })).filter(item => item.symbol && item.name);
  }
}

class FinnhubProvider extends BaseProvider {
  name = 'finnhub' as const;
  displayName = 'Finnhub';
  configured() { return Boolean(apiKey('FINNHUB_API_KEY')); }

  async getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('FINNHUB_API_KEY');
    if (!key) return null;
    for (const candidate of uniqueStrings(finnhubCandidates(symbol, context))) {
      const params = new URLSearchParams({ symbol: candidate, token: key });
      const started = Date.now();
      const result = await fetchJson(`https://finnhub.io/api/v1/quote?${params.toString()}`, {
        cacheKey: `quote:${this.name}:${candidate}`,
        ttlMs: QUOTE_CACHE_MS,
        forceFresh: context?.forceFresh,
      });
      const body = result.data as Record<string, unknown> | null;
      if (!result.ok || !body) {
        logProviderFailure(this.name, 'quote', symbol, providerError(this.name, `http_${result.status}`, 'provider_error', candidate, result.status));
        continue;
      }
      const quote = normalizeQuote({
        symbol: context?.symbol ?? symbol,
        providerSymbol: candidate,
        provider: this.name,
        providerName: this.displayName,
        name: context?.name,
        price: body.c,
        currency: context?.currency ?? exchangeCurrency(symbol, context),
        change: body.d,
        changePercent: body.dp,
        open: body.o,
        high: body.h,
        low: body.l,
        previousClose: body.pc,
        volume: null,
        market,
        exchange: body.exchange ?? context?.exchange,
        exchangeCode: body.mic ?? context?.exchangeCode,
        country: body.country ?? context?.country,
        assetType: body.type ?? context?.assetType,
        delayType: 'delayed',
        lastUpdated: body.t,
        context,
      });
      if (quote) {
        if (result.cacheHit) Object.assign(quote, { cached: true, cacheAgeSeconds: result.cacheAgeSeconds, delayType: 'cached' as MarketDelayType });
        logProviderSuccess(this.name, 'quote', symbol, Date.now() - started, result.cacheHit);
        return quote;
      }
      logProviderFailure(this.name, 'quote', symbol, providerError(this.name, 'provider_returned_empty', 'provider_returned_empty', candidate, result.status));
    }
    return null;
  }

  async getCandles(symbol: string, _market?: string | null, interval = 'D', context?: MarketDataProviderContext) {
    const key = apiKey('FINNHUB_API_KEY');
    if (!key) return [];
    const candidate = uniqueStrings(finnhubCandidates(symbol, context))[0];
    if (!candidate) return [];
    const to = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 180;
    const resolution = (interval || 'D').toLowerCase().includes('min') ? '15' : 'D';
    const params = new URLSearchParams({ symbol: candidate, resolution, from: String(from), to: String(to), token: key });
    const path = normalizeAssetType(context?.assetType) === 'forex' ? 'forex/candle' : normalizeAssetType(context?.assetType) === 'crypto' ? 'crypto/candle' : 'stock/candle';
    const result = await fetchJson(`https://finnhub.io/api/v1/${path}?${params.toString()}`, {
      cacheKey: `candles:${this.name}:${path}:${candidate}:${resolution}`,
      ttlMs: CANDLES_CACHE_MS,
      forceFresh: context?.forceFresh,
    });
    const body = result.data as Record<string, unknown> | null;
    const times = Array.isArray(body?.t) ? body.t : [];
    const closes = Array.isArray(body?.c) ? body.c : [];
    return times.map((time, index) => ({
      date: toIso(time) ?? String(time),
      open: numberOrNull(Array.isArray(body?.o) ? body.o[index] : null) ?? undefined,
      high: numberOrNull(Array.isArray(body?.h) ? body.h[index] : null) ?? undefined,
      low: numberOrNull(Array.isArray(body?.l) ? body.l[index] : null) ?? undefined,
      close: numberOrNull(closes[index]) ?? 0,
      volume: numberOrNull(Array.isArray(body?.v) ? body.v[index] : null),
      provider: this.name,
    })).filter(item => item.close > 0);
  }

  async getCompanyProfile(symbol: string, _market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('FINNHUB_API_KEY');
    if (!key) return null;
    const candidate = uniqueStrings(finnhubCandidates(symbol, context)).find(item => /^[A-Z0-9.-]{1,24}$/.test(item)) ?? stripSuffix(symbol);
    const params = new URLSearchParams({ symbol: candidate, token: key });
    const result = await fetchJson(`https://finnhub.io/api/v1/stock/profile2?${params.toString()}`, {
      cacheKey: `profile:${this.name}:${candidate}`,
      ttlMs: PROFILE_CACHE_MS,
      forceFresh: context?.forceFresh,
    });
    const body = result.data as Record<string, unknown> | null;
    if (!result.ok || !body || Object.keys(body).length === 0) return null;
    return {
      symbol: upper(context?.symbol ?? symbol),
      providerSymbol: candidate,
      provider: this.name,
      name: textOrNull(body.name) ?? undefined,
      exchange: textOrNull(body.exchange) ?? undefined,
      industry: textOrNull(body.finnhubIndustry) ?? undefined,
      country: textOrNull(body.country) ?? undefined,
      currency: textOrNull(body.currency) ?? undefined,
      website: textOrNull(body.weburl) ?? undefined,
      marketCap: numberOrNull(body.marketCapitalization) ?? undefined,
      logo: textOrNull(body.logo),
      raw: body,
    };
  }

  async getLogo(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    const profile = await this.getCompanyProfile(symbol, market, context);
    return profile?.logo ?? null;
  }

  async getNews(symbol: string, _market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('FINNHUB_API_KEY');
    if (!key) return [];
    const candidate = stripSuffix(symbol);
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      symbol: candidate,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      token: key,
    });
    const result = await fetchJson(`https://finnhub.io/api/v1/company-news?${params.toString()}`, {
      cacheKey: `news:${this.name}:${candidate}`,
      ttlMs: 10 * 60 * 1000,
      forceFresh: context?.forceFresh,
    });
    const rows = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return rows.slice(0, 20).map((row, index) => ({
      id: String(row.id ?? `${candidate}-${index}`),
      symbol: upper(context?.symbol ?? symbol),
      title: String(row.headline ?? row.title ?? ''),
      source: textOrNull(row.source) ?? undefined,
      url: textOrNull(row.url) ?? undefined,
      summary: textOrNull(row.summary) ?? undefined,
      publishedAt: toIso(row.datetime) ?? undefined,
      provider: this.name,
    })).filter(item => item.title);
  }
}

class EodhdProvider extends BaseProvider {
  name = 'eodhd' as const;
  displayName = 'EODHD';
  configured() { return Boolean(apiKey('EODHD_API_KEY')); }

  private tokenParams() {
    return new URLSearchParams({ api_token: apiKey('EODHD_API_KEY'), fmt: 'json' });
  }

  async getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    if (!this.configured()) return null;
    for (const candidate of uniqueStrings(eodhdCandidates(symbol, context))) {
      const params = this.tokenParams();
      const started = Date.now();
      const result = await fetchJson(`https://eodhd.com/api/real-time/${encodeURIComponent(candidate)}?${params.toString()}`, {
        cacheKey: `quote:${this.name}:${candidate}`,
        ttlMs: QUOTE_CACHE_MS,
        forceFresh: context?.forceFresh,
      });
      const body = result.data as Record<string, unknown> | null;
      if (!result.ok || !body) {
        logProviderFailure(this.name, 'quote', symbol, providerError(this.name, `http_${result.status}`, 'provider_error', candidate, result.status));
        continue;
      }
      const quote = normalizeQuote({
        symbol: context?.symbol ?? symbol,
        providerSymbol: candidate,
        provider: this.name,
        providerName: this.displayName,
        name: body.name ?? context?.name,
        price: body.close,
        currency: body.currency ?? context?.currency ?? exchangeCurrency(symbol, context),
        change: body.change,
        changePercent: body.change_p,
        open: body.open,
        high: body.high,
        low: body.low,
        previousClose: body.previousClose ?? body.previous_close,
        volume: body.volume,
        market,
        exchange: body.exchange ?? context?.exchange,
        exchangeCode: body.exchangeCode ?? body.exchange ?? context?.exchangeCode,
        country: body.country ?? context?.country,
        assetType: body.type ?? context?.assetType,
        delayType: 'delayed',
        lastUpdated: body.timestamp ?? body.date,
        context,
      });
      if (quote) {
        if (result.cacheHit) Object.assign(quote, { cached: true, cacheAgeSeconds: result.cacheAgeSeconds, delayType: 'cached' as MarketDelayType });
        logProviderSuccess(this.name, 'quote', symbol, Date.now() - started, result.cacheHit);
        return quote;
      }
      logProviderFailure(this.name, 'quote', symbol, providerError(this.name, 'provider_returned_empty', 'provider_returned_empty', candidate, result.status));
    }
    return null;
  }

  async getCandles(symbol: string, _market?: string | null, interval = 'd', context?: MarketDataProviderContext) {
    if (!this.configured()) return [];
    const candidate = uniqueStrings(eodhdCandidates(symbol, context))[0];
    if (!candidate) return [];
    const params = this.tokenParams();
    params.set('period', (interval || 'd').toLowerCase().startsWith('1') ? 'd' : interval || 'd');
    const result = await fetchJson(`https://eodhd.com/api/eod/${encodeURIComponent(candidate)}?${params.toString()}`, {
      cacheKey: `candles:${this.name}:${candidate}:${params.get('period')}`,
      ttlMs: CANDLES_CACHE_MS,
      forceFresh: context?.forceFresh,
    });
    const rows = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return rows.map(row => ({
      date: String(row.date ?? ''),
      open: numberOrNull(row.open) ?? undefined,
      high: numberOrNull(row.high) ?? undefined,
      low: numberOrNull(row.low) ?? undefined,
      close: numberOrNull(row.close) ?? 0,
      volume: numberOrNull(row.volume),
      provider: this.name,
    })).filter(item => item.date && item.close > 0);
  }

  async getCompanyProfile(symbol: string, _market?: string | null, context?: MarketDataProviderContext) {
    if (!this.configured()) return null;
    const candidate = uniqueStrings(eodhdCandidates(symbol, context)).find(item => item.includes('.')) ?? uniqueStrings(eodhdCandidates(symbol, context))[0];
    if (!candidate) return null;
    const params = this.tokenParams();
    const result = await fetchJson(`https://eodhd.com/api/fundamentals/${encodeURIComponent(candidate)}?${params.toString()}`, {
      cacheKey: `profile:${this.name}:${candidate}`,
      ttlMs: PROFILE_CACHE_MS,
      forceFresh: context?.forceFresh,
    });
    const body = result.data as Record<string, unknown> | null;
    const general = body?.General && typeof body.General === 'object' ? body.General as Record<string, unknown> : {};
    if (!result.ok || Object.keys(general).length === 0) return null;
    return {
      symbol: upper(context?.symbol ?? symbol),
      providerSymbol: candidate,
      provider: this.name,
      name: textOrNull(general.Name) ?? textOrNull(general.CompanyName) ?? undefined,
      exchange: textOrNull(general.Exchange) ?? undefined,
      sector: textOrNull(general.Sector) ?? undefined,
      industry: textOrNull(general.Industry) ?? undefined,
      country: textOrNull(general.CountryName) ?? textOrNull(general.CountryISO) ?? undefined,
      currency: textOrNull(general.CurrencyCode) ?? textOrNull(general.CurrencyName) ?? undefined,
      website: textOrNull(general.WebURL) ?? undefined,
      description: textOrNull(general.Description) ?? undefined,
      marketCap: numberOrNull(general.MarketCapitalization) ?? undefined,
      employees: numberOrNull(general.FullTimeEmployees) ?? undefined,
      raw: body ?? undefined,
    };
  }

  async getLogo(_symbol: string, _market?: string | null, _context?: MarketDataProviderContext) {
    // EODHD logo URLs are tokenized; do not return API-key-bearing URLs to the frontend.
    return null;
  }

  async getSymbolSearch(query: string, _market?: string | null, context?: MarketDataProviderContext) {
    if (!this.configured() || query.trim().length < 2) return [];
    const params = this.tokenParams();
    const result = await fetchJson(`https://eodhd.com/api/search/${encodeURIComponent(query.trim())}?${params.toString()}`, {
      cacheKey: `search:${this.name}:${query}:${context?.assetType ?? ''}`,
      ttlMs: SYMBOL_CACHE_MS,
    });
    const rows = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    return rows.slice(0, 20).map(row => ({
      symbol: upper(row.Code ?? row.symbol),
      providerSymbol: `${upper(row.Code ?? row.symbol)}${row.Exchange ? `.${upper(row.Exchange)}` : ''}`,
      name: String(row.Name ?? row.name ?? row.Code ?? ''),
      assetType: normalizeAssetType(row.Type ?? context?.assetType),
      exchange: textOrNull(row.Exchange) ?? undefined,
      exchangeCode: textOrNull(row.Exchange) ?? undefined,
      market: textOrNull(row.Exchange) ?? undefined,
      country: textOrNull(row.Country) ?? undefined,
      currency: textOrNull(row.Currency) ?? undefined,
    })).filter(item => item.symbol && item.name);
  }

  async getExchangeMetadata(exchange: string) {
    if (!this.configured() || !exchange) return null;
    const params = this.tokenParams();
    const result = await fetchJson(`https://eodhd.com/api/exchange-details/${encodeURIComponent(exchange)}?${params.toString()}`, {
      cacheKey: `exchange:${this.name}:${exchange}`,
      ttlMs: SYMBOL_CACHE_MS,
    });
    const body = result.data as Record<string, unknown> | null;
    if (!result.ok || !body) return null;
    return {
      provider: this.name,
      exchange,
      name: textOrNull(body.Name) ?? undefined,
      country: textOrNull(body.Country) ?? undefined,
      currency: textOrNull(body.Currency) ?? undefined,
      timezone: textOrNull(body.Timezone) ?? undefined,
      raw: body,
    };
  }
}

class MarketstackProvider extends BaseProvider {
  name = 'marketstack' as const;
  displayName = 'Marketstack';
  configured() { return Boolean(apiKey('MARKETSTACK_API_KEY')); }

  async getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    const key = apiKey('MARKETSTACK_API_KEY');
    if (!key) return null;
    const candidates = uniqueStrings(eodhdCandidates(symbol, context).concat(upper(symbol)));
    for (const candidate of candidates) {
      const params = new URLSearchParams({ access_key: key, symbols: candidate, limit: '1' });
      const result = await fetchJson(`https://api.marketstack.com/v2/eod/latest?${params.toString()}`, {
        cacheKey: `quote:${this.name}:${candidate}`,
        ttlMs: QUOTE_CACHE_MS,
        forceFresh: context?.forceFresh,
      });
      const row = Array.isArray((result.data as Record<string, unknown> | null)?.data) ? (result.data as { data: Record<string, unknown>[] }).data[0] : null;
      if (!result.ok || !row) {
        logProviderFailure(this.name, 'quote', symbol, providerError(this.name, `http_${result.status}`, 'provider_error', candidate, result.status));
        continue;
      }
      const quote = normalizeQuote({
        symbol: context?.symbol ?? symbol,
        providerSymbol: candidate,
        provider: this.name,
        providerName: this.displayName,
        name: row.name ?? context?.name,
        price: row.close,
        currency: context?.currency ?? exchangeCurrency(symbol, context),
        change: null,
        changePercent: null,
        open: row.open,
        high: row.high,
        low: row.low,
        previousClose: null,
        volume: row.volume,
        market,
        exchange: row.exchange ?? context?.exchange,
        exchangeCode: row.exchange ?? context?.exchangeCode,
        country: row.country ?? context?.country,
        assetType: row.type ?? context?.assetType,
        delayType: 'eod',
        lastUpdated: row.date,
        context,
      });
      if (quote) return quote;
    }
    return null;
  }
}

class YahooProvider extends BaseProvider {
  name = 'yahoo' as const;
  displayName = 'Yahoo Finance';
  configured() { return true; }

  async getQuote(symbol: string, market?: string | null, context?: MarketDataProviderContext) {
    const canonicalCrypto = canonicalCryptoFor(symbol, context);
    const assetType = canonicalCrypto?.assetClass ?? normalizeAssetType(context?.assetType);
    const symbols = uniqueStrings(yahooCandidates(symbol, context));
    const started = Date.now();
    const quote = await fetchYahooNormalizedQuote({
      requestedSymbol: upper(context?.symbol ?? symbol),
      symbols,
      name: canonicalCrypto?.name ?? context?.name ?? symbol,
      forceFresh: context?.forceFresh,
      canonicalSymbol: canonicalCrypto?.canonicalSymbol,
      assetClass: assetType,
      expectedName: canonicalCrypto?.name ?? context?.name ?? undefined,
      debugContext: {
        route: 'market-data-provider',
        provider: this.name,
        market,
        canonicalSymbol: canonicalCrypto?.canonicalSymbol,
        assetClass: assetType,
      },
    }).catch(() => null);
    if (!quote?.available || quote.price === null) return null;
    const normalized = normalizeQuote({
      symbol: context?.symbol ?? symbol,
      providerSymbol: quote.symbolUsed ?? symbols[0] ?? symbol,
      provider: this.name,
      providerName: this.displayName,
      name: quote.name,
      price: quote.price,
      currency: quote.currency,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.change !== null && quote.price !== null ? quote.price - quote.change : null,
      market: quote.market ?? market,
      exchange: quote.exchange ?? context?.exchange,
      exchangeCode: quote.exchangeCode ?? context?.exchangeCode,
      country: context?.country,
      assetType: quote.assetType ?? context?.assetType,
      delayType: 'delayed',
      lastUpdated: quote.marketTime,
      context,
    });
    if (normalized) logProviderSuccess(this.name, 'quote', symbol, Date.now() - started);
    return normalized;
  }

  async getCandles(symbol: string, _market?: string | null, interval?: string | null, context?: MarketDataProviderContext) {
    const candidate = yahooCandidates(symbol, context)[0] ?? symbol;
    const result = await fetchYahooHistory(candidate, normalizeAssetType(context?.assetType), '1y', interval || undefined);
    if (!result.success) return [];
    return result.history.map(item => ({ ...item, provider: this.name }));
  }
}

export const marketDataProviders: MarketDataProvider[] = [
  new TwelveDataProvider(),
  new FinnhubProvider(),
  new EodhdProvider(),
  new MarketstackProvider(),
  new YahooProvider(),
];

export function configuredMarketProviders() {
  return marketDataProviders.filter(provider => provider.configured());
}

function providerExcluded(provider: MarketDataProvider, context: MarketDataProviderContext) {
  return Boolean(context.excludeProviders?.includes(provider.name));
}

export async function getQuoteWithFallback(symbol: string, market?: string | null, context: MarketDataProviderContext = {}): Promise<ProviderFallbackResult<NormalizedMarketQuote>> {
  const attempts: ProviderAttemptFailure[] = [];
  const key = fallbackKey('quote', symbol, market, context);
  for (const provider of marketDataProviders) {
    if (providerExcluded(provider, context)) continue;
    if (!provider.configured()) {
      attempts.push(providerError(provider.name, 'not_configured', 'provider_not_configured'));
      continue;
    }
    const providerStarted = Date.now();
    try {
      const quote = await provider.getQuote(symbol, market, context);
      if (quote) {
        setFallback(key, quote, provider.name);
        recordProviderMetric({ provider: provider.name, endpointClass: 'quote', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 0, cacheStatus: quote.cached ? 'hit' : 'miss', retryCount: attempts.length });
        return { ok: true, data: quote, provider: provider.name, attempts };
      }
      const failure = providerError(provider.name, 'provider_returned_empty', 'provider_returned_empty');
      attempts.push(failure);
      logProviderFailure(provider.name, 'quote', symbol, failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'quote', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    } catch (error) {
      const failure = providerError(provider.name, error instanceof Error && error.name === 'TimeoutError' ? 'provider_timeout' : 'provider_error', error instanceof Error ? error.message : 'provider_error');
      attempts.push(failure);
      logProviderFailure(provider.name, 'quote', symbol, failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'quote', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    }
  }
  const cached = getFallback<NormalizedMarketQuote>(key, FALLBACK_QUOTE_TTL_MS);
  if (cached) {
    logReliabilityEvent('warn', 'market_data_cache_fallback', { capability: 'quote', symbol: upper(symbol), provider: cached.provider });
    recordProviderMetric({ provider: cached.provider, endpointClass: 'quote', assetClass: context.assetType, durationMs: 0, fallbackUsed: true, cacheStatus: 'stale', retryCount: attempts.length });
    return { ok: true, data: { ...cached.data, cached: true, delayType: 'cached' }, provider: cached.provider, attempts };
  }
  return { ok: false, attempts, latestError: attempts.at(-1)?.code ?? null };
}

export async function getCandlesWithFallback(symbol: string, market?: string | null, interval?: string | null, context: MarketDataProviderContext = {}): Promise<ProviderFallbackResult<NormalizedMarketCandle[]>> {
  const attempts: ProviderAttemptFailure[] = [];
  const key = fallbackKey(`candles:${interval ?? ''}`, symbol, market, context);
  for (const provider of marketDataProviders) {
    if (providerExcluded(provider, context)) continue;
    if (!provider.configured()) {
      attempts.push(providerError(provider.name, 'not_configured', 'provider_not_configured'));
      continue;
    }
    const providerStarted = Date.now();
    try {
      const candles = await provider.getCandles(symbol, market, interval, context);
      if (candles.length > 0) {
        setFallback(key, candles, provider.name);
        recordProviderMetric({ provider: provider.name, endpointClass: 'historical_prices', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 0, cacheStatus: 'miss', retryCount: attempts.length });
        return { ok: true, data: candles, provider: provider.name, attempts };
      }
      const failure = providerError(provider.name, 'provider_returned_empty', 'provider_returned_empty');
      attempts.push(failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'historical_prices', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    } catch (error) {
      const failure = providerError(provider.name, 'provider_error', error instanceof Error ? error.message : 'provider_error');
      attempts.push(failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'historical_prices', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    }
  }
  const cached = getFallback<NormalizedMarketCandle[]>(key, FALLBACK_CANDLES_TTL_MS);
  if (cached) {
    logReliabilityEvent('warn', 'market_data_cache_fallback', { capability: 'historical_prices', symbol: upper(symbol), provider: cached.provider });
    recordProviderMetric({ provider: cached.provider, endpointClass: 'historical_prices', assetClass: context.assetType, durationMs: 0, fallbackUsed: true, cacheStatus: 'stale', retryCount: attempts.length });
    return { ok: true, data: cached.data, provider: cached.provider, attempts };
  }
  return { ok: false, attempts, latestError: attempts.at(-1)?.code ?? null };
}

export async function getCompanyProfileWithFallback(symbol: string, market?: string | null, context: MarketDataProviderContext = {}): Promise<ProviderFallbackResult<NormalizedCompanyProfile>> {
  const attempts: ProviderAttemptFailure[] = [];
  const key = fallbackKey('profile', symbol, market, context);
  for (const provider of marketDataProviders) {
    if (providerExcluded(provider, context)) continue;
    if (!provider.configured()) {
      attempts.push(providerError(provider.name, 'not_configured', 'provider_not_configured'));
      continue;
    }
    const providerStarted = Date.now();
    try {
      const profile = await provider.getCompanyProfile(symbol, market, context);
      if (profile) {
        setFallback(key, profile, provider.name);
        recordProviderMetric({ provider: provider.name, endpointClass: 'profile', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 0, cacheStatus: 'miss', retryCount: attempts.length });
        return { ok: true, data: profile, provider: provider.name, attempts };
      }
      const failure = providerError(provider.name, 'provider_returned_empty', 'provider_returned_empty');
      attempts.push(failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'profile', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    } catch (error) {
      const failure = providerError(provider.name, 'provider_error', error instanceof Error ? error.message : 'provider_error');
      attempts.push(failure);
      recordProviderMetric({ provider: provider.name, endpointClass: 'profile', assetClass: context.assetType, durationMs: Date.now() - providerStarted, fallbackUsed: attempts.length > 1, failureClass: failure.category, retryCount: attempts.length - 1 });
    }
  }
  const cached = getFallback<NormalizedCompanyProfile>(key, FALLBACK_PROFILE_TTL_MS);
  if (cached) {
    logReliabilityEvent('warn', 'market_data_cache_fallback', { capability: 'profile', symbol: upper(symbol), provider: cached.provider });
    recordProviderMetric({ provider: cached.provider, endpointClass: 'profile', assetClass: context.assetType, durationMs: 0, fallbackUsed: true, cacheStatus: 'stale', retryCount: attempts.length });
    return { ok: true, data: cached.data, provider: cached.provider, attempts };
  }
  return { ok: false, attempts, latestError: attempts.at(-1)?.code ?? null };
}

export async function getLogoWithFallback(symbol: string, market?: string | null, context: MarketDataProviderContext = {}) {
  for (const provider of marketDataProviders) {
    if (providerExcluded(provider, context)) continue;
    if (!provider.configured()) continue;
    const logo = await provider.getLogo(symbol, market, context).catch(() => null);
    if (logo) return { ok: true as const, logo, provider: provider.name };
  }
  return { ok: false as const, logo: null, provider: null };
}

export async function searchSymbolsWithFallback(query: string, market?: string | null, context: MarketDataProviderContext = {}) {
  const results: MarketSearchItem[] = [];
  const seen = new Set<string>();
  for (const provider of marketDataProviders) {
    if (providerExcluded(provider, context)) continue;
    if (!provider.configured()) continue;
    const items = await provider.getSymbolSearch(query, market, context).catch(() => []);
    for (const item of items) {
      const key = `${item.symbol}:${item.providerSymbol ?? ''}:${item.assetType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(item);
    }
    if (results.length >= 24) break;
  }
  return results;
}

export async function getProviderHealth() {
  return Promise.all(marketDataProviders.map(provider => provider.healthCheck()));
}
