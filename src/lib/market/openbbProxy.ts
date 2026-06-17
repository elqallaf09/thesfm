import {
  type FundamentalsUnavailableReason,
  normalizeMarketSymbolInput,
  normalizeAssetType,
  validateSymbol,
  type MarketAnalysis,
  type MarketAssetType,
  type MarketResult,
} from '@/lib/market/marketService';
import { detectPriceUnit, normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { fetchYahooNormalizedQuote, type YahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import symbolDirectory from '../../../openbb-service/data/symbols.json';

const OPENBB_TIMEOUT_MS = 12000;
const OPENBB_HEALTH_TIMEOUT_MS = 12000;
const QUOTE_CACHE_MS = 60 * 1000;
const HISTORY_CACHE_MS = 10 * 60 * 1000;
const SEARCH_CACHE_MS = 5 * 60 * 1000;

type ProxyState = 'connected' | 'degraded' | 'slow' | 'not_configured' | 'unavailable';
type FetchOpenBBResult =
  | { configured: false; elapsedMs: number; fromCache?: false }
  | { configured: true; available: true; data: any; elapsedMs: number; fromCache: boolean; cacheAgeSeconds?: number; status: number }
  | { configured: true; available: false; elapsedMs: number; fromCache?: false; status?: number; timedOut?: boolean; error?: string; code?: string };

const responseCache = new Map<string, { expiresAt: number; createdAt: number; data: any }>();
let lastSuccessfulRequestAt: string | null = null;

const FUNDAMENTAL_KEYS = ['marketCap', 'peRatio', 'eps', 'revenue', 'dividend'];

export function getOpenBBServiceUrl() {
  return (process.env.OPENBB_API_URL || process.env.OPENBB_SERVICE_URL || '').trim().replace(/\/+$/, '');
}

export function marketServiceNotConfigured() {
  return {
    ok: false,
    marketService: 'openbb',
    openbbService: 'not_configured' as ProxyState,
    serviceUrlConfigured: false,
    message: 'OPENBB_API_URL or OPENBB_SERVICE_URL is missing',
  };
}

export function marketServiceUnavailable() {
  return {
    ok: false,
    marketService: 'openbb',
    openbbService: 'unavailable' as ProxyState,
    serviceUrlConfigured: true,
  };
}

export function marketServiceConnected() {
  return {
    ok: true,
    marketService: 'openbb',
    openbbService: 'connected' as ProxyState,
    serviceUrlConfigured: true,
    lastSuccessfulRequestAt,
  };
}

export function marketServiceSlow(responseTimeMs: number) {
  return {
    ok: true,
    marketService: 'openbb',
    openbbService: 'degraded' as ProxyState,
    serviceUrlConfigured: true,
    responseTimeMs,
    lastSuccessfulRequestAt,
  };
}

async function fetchWithTimeout(url: string, timeoutMs = OPENBB_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(process.env.OPENBB_API_KEY ? { authorization: `Bearer ${process.env.OPENBB_API_KEY}` } : {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function cacheTtlForPath(path: string) {
  if (path.includes('/history')) return HISTORY_CACHE_MS;
  if (path.includes('/search')) return SEARCH_CACHE_MS;
  if (path.includes('/compare') || path.includes('/analyze')) return QUOTE_CACHE_MS;
  return 0;
}

async function fetchOpenBB(path: string, params?: URLSearchParams, options?: { timeoutMs?: number; cacheTtlMs?: number }): Promise<FetchOpenBBResult> {
  const baseUrl = getOpenBBServiceUrl();
  if (!baseUrl) return { configured: false as const, elapsedMs: 0 };

  const url = new URL(`${baseUrl}${path}`);
  params?.forEach((value, key) => url.searchParams.set(key, value));
  const startedAt = Date.now();
  const ttlMs = options?.cacheTtlMs ?? cacheTtlForPath(path);
  const cacheKey = url.toString();
  const cached = ttlMs > 0 ? responseCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > startedAt) {
    return {
      configured: true as const,
      available: true as const,
      data: cached.data,
      elapsedMs: 0,
      fromCache: true,
      cacheAgeSeconds: Math.max(0, Math.round((startedAt - cached.createdAt) / 1000)),
      status: 200,
    };
  }

  try {
    const response = await fetchWithTimeout(url.toString(), options?.timeoutMs);
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) {
      const code = response.status === 404
        ? 'symbol_not_found'
        : response.status === 408 || response.status === 504
          ? 'openbb_timeout'
          : response.status === 429
            ? 'openbb_rate_limit'
            : response.status >= 500
              ? 'openbb_unreachable'
              : 'provider_error';
      const errorBody = await response.text().catch(() => '');
      console.warn('OpenBB request failed', {
        path,
        url: url.pathname,
        status: response.status,
        elapsedMs,
        code,
        body: errorBody.slice(0, 400),
      });
      return { configured: true as const, available: false as const, elapsedMs, status: response.status, code };
    }
    const data = await response.json();
    lastSuccessfulRequestAt = new Date().toISOString();
    if (ttlMs > 0) {
      const now = Date.now();
      responseCache.set(cacheKey, { expiresAt: now + ttlMs, createdAt: now, data });
    }
    console.info('OpenBB request completed', {
      path,
      symbol: url.searchParams.get('symbol') || url.searchParams.get('symbols'),
      status: response.status,
      elapsedMs,
      success: data?.success === true,
      hasQuote: Boolean(data?.latestPrice || data?.quote?.price),
      hasHistory: Array.isArray(data?.history) ? data.history.length > 0 : Array.isArray(data?.results) ? data.results.some((item: any) => Array.isArray(item?.history) && item.history.length > 0) : false,
    });
    return { configured: true as const, available: true as const, data, elapsedMs, fromCache: false, status: response.status };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    console.warn('OpenBB request exception', { path, url: url.pathname, elapsedMs: Date.now() - startedAt, code: timedOut ? 'openbb_timeout' : 'openbb_unreachable' });
    return {
      configured: true as const,
      available: false as const,
      elapsedMs: Date.now() - startedAt,
      timedOut,
      code: timedOut ? 'openbb_timeout' : 'openbb_unreachable',
      error: error instanceof Error ? error.message : 'OpenBB request failed',
    };
  }
}

function cleanProviderSymbol(symbolInput: unknown) {
  const validated = validateSymbol(symbolInput);
  if (!validated) return null;
  const withoutExchange = validated.includes(':') ? validated.split(':').pop() || validated : validated;
  return validateSymbol(withoutExchange);
}

function normalizeProviderSymbol(symbolInput: unknown) {
  const normalized = normalizeMarketSymbolInput(symbolInput);
  if (normalized.valid) return cleanProviderSymbol(normalized.providerSymbol);
  return cleanProviderSymbol(symbolInput);
}

function errorMessageForCode(code: string) {
  const messages: Record<string, string> = {
    openbb_unreachable: 'Market data service is unavailable.',
    openbb_timeout: 'Market data request timed out.',
    openbb_rate_limit: 'Market data provider rate limit was reached.',
    symbol_not_found: 'Symbol not found.',
    invalid_symbol: 'Invalid symbol.',
    provider_no_data: 'Market provider returned no usable data.',
    provider_error: 'Market provider returned an error.',
    response_mapping_failed: 'Market provider response could not be mapped.',
    ai_skipped_no_market_data: 'AI analysis was skipped because real market data is unavailable.',
  };
  return messages[code] || 'Market data provider is unavailable.';
}

function marketError(code: string, patch: Partial<MarketResult> & { openbbService?: ProxyState } = {}): MarketResult & { code: string; openbbService?: ProxyState } {
  return {
    success: false,
    code,
    error: errorMessageForCode(code),
    provider: 'openbb',
    dataStatus: 'unavailable',
    source: 'openbb',
    fallback: false,
    warnings: ['AI analysis was skipped because real market data is unavailable.'],
    ...patch,
  } as MarketResult & { code: string; openbbService?: ProxyState };
}

function scoreDirectoryItem(item: Record<string, any>, query: string) {
  const needle = query.toLowerCase();
  const symbol = String(item.symbol ?? '').toLowerCase();
  const providerSymbol = String(item.providerSymbol ?? '').toLowerCase();
  const name = String(item.name ?? '').toLowerCase();
  const assetType = String(item.assetType ?? '').toLowerCase();
  if (!needle) return 1;
  if (symbol === needle || providerSymbol === needle) return 100;
  if (symbol.startsWith(needle)) return 88;
  if (name.startsWith(needle)) return 78;
  if (symbol.includes(needle) || providerSymbol.includes(needle)) return 62;
  if (name.includes(needle)) return 50;
  if (assetType.includes(needle)) return 35;
  return 0;
}

function directorySymbol(symbol: string) {
  const normalized = symbol.toUpperCase();
  return (symbolDirectory as Array<Record<string, any>>)
    .find(item => String(item.symbol ?? '').toUpperCase() === normalized
      || String(item.providerSymbol ?? '').toUpperCase() === normalized);
}

function searchLocalSymbolDirectory(query: string, assetType?: MarketAssetType) {
  return (symbolDirectory as Array<Record<string, any>>)
    .filter(item => !assetType || normalizeAssetType(item.assetType) === assetType)
    .map(item => ({ score: scoreDirectoryItem(item, query), item }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.symbol).localeCompare(String(b.item.symbol)))
    .slice(0, 12)
    .map(({ item }) => {
      const assetType = normalizeAssetType(item.assetType);
      const symbol = String(item.symbol ?? '').toUpperCase();
      const providerSymbol = item.providerSymbol ? String(item.providerSymbol).toUpperCase() : symbol;
      const exchange = item.exchange ? String(item.exchange) : undefined;
      const country = item.country ? String(item.country) : undefined;
      const currency = resolveMarketCurrency({
        providerCurrency: item.currency,
        symbol,
        providerSymbol,
        exchange,
        country,
        assetType,
      });
      return {
        symbol,
        name: String(item.name ?? item.symbol ?? ''),
        assetType,
        exchange,
        country,
        currency: currency.currency ?? undefined,
        currencySource: currency.source,
        providerSymbol,
      };
    });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function optionalFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = average(values.map(value => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function calculateRsi(closes: number[]) {
  if (closes.length < 2) return 50;
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  const gains = changes.filter(change => change > 0);
  const losses = changes.filter(change => change < 0).map(Math.abs);
  const avgGain = average(gains);
  const avgLoss = average(losses);
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return Math.max(0, Math.min(100, 100 - (100 / (1 + rs))));
}

function dailyChangePercent(closes: number[]) {
  const latest = closes.at(-1);
  const previous = closes.at(-2);
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || !previous) return 0;
  return ((Number(latest) - Number(previous)) / Number(previous)) * 100;
}

function isRealProviderPayload(data: Record<string, any>) {
  const source = String(data.source ?? 'openbb').trim().toLowerCase();
  return data.success === true
    && data.fallback !== true
    && (source === 'openbb' || source === 'yahoo' || source === 'yahoo finance');
}

function hasUsableFundamentals(fundamentals: unknown) {
  if (!fundamentals || typeof fundamentals !== 'object') return false;
  const data = fundamentals as Record<string, unknown>;
  return FUNDAMENTAL_KEYS.some(key => {
    const value = data[key];
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0 && !/^n\/?a$/i.test(value.trim());
    return false;
  });
}

function fundamentalsReason(assetType: MarketAssetType, fundamentals: unknown): FundamentalsUnavailableReason | undefined {
  if (assetType !== 'stock') return 'not_supported_for_asset_type';
  return hasUsableFundamentals(fundamentals) ? undefined : 'provider_returned_empty';
}

function normalizeFinnhubMetric(metric: Record<string, unknown>) {
  return {
    marketCap: metric.marketCapitalization,
    peRatio: metric.peNormalizedAnnual ?? metric.peTTM,
    eps: metric.epsNormalizedAnnual ?? metric.epsTTM,
    revenue: metric.revenuePerShareAnnual,
    dividend: metric.dividendYieldIndicatedAnnual ?? metric.dividendYield5Y,
  };
}

async function fetchFinnhubFundamentals(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) return { fundamentals: null, reason: 'provider_returned_empty' as FundamentalsUnavailableReason };

  const params = new URLSearchParams({ symbol, metric: 'all', token: apiKey });
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/metric?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 6 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[MarketAnalysis] Finnhub fundamentals failed', { symbol, status: response.status });
      }
      return { fundamentals: null, reason: response.status === 404 ? 'symbol_not_supported' as const : 'api_error' as const };
    }
    const payload = await response.json() as Record<string, unknown>;
    const metric = payload.metric && typeof payload.metric === 'object' ? payload.metric as Record<string, unknown> : {};
    const fundamentals = normalizeFinnhubMetric(metric);
    return hasUsableFundamentals(fundamentals)
      ? { fundamentals, reason: undefined }
      : { fundamentals: null, reason: 'provider_returned_empty' as const };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MarketAnalysis] Finnhub fundamentals exception', {
        symbol,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return { fundamentals: null, reason: 'api_error' as const };
  }
}

function enrichAnalysis(raw: unknown, symbol: string, assetType: MarketAssetType, meta?: { fromCache?: boolean; cacheAgeSeconds?: number; exchange?: unknown; country?: unknown; providerCurrency?: unknown }): MarketAnalysis | null {
  const data = raw && typeof raw === 'object' ? raw as Record<string, any> : {};
  if (!isRealProviderPayload(data)) return null;
  const history = Array.isArray(data.history) ? data.history : [];
  const rawCloses = history
    .map(point => Number(point?.close))
    .filter(value => Number.isFinite(value));
  const explicitQuotePrice = Number(data.quote?.price ?? data.latestPrice);
  const rawLatestPrice = Number(Number.isFinite(explicitQuotePrice) ? explicitQuotePrice : rawCloses.at(-1) ?? 0);
  if (!Number.isFinite(rawLatestPrice) || rawLatestPrice <= 0 || rawCloses.length === 0) return null;

  const providerSymbol = data.providerSymbol ? String(data.providerSymbol) : undefined;
  const directory = directorySymbol(String(data.symbol ?? symbol)) ?? (providerSymbol ? directorySymbol(providerSymbol) : undefined);
  const exchange = String(data.exchange ?? data.market ?? data.quote?.exchange ?? meta?.exchange ?? directory?.exchange ?? '').trim() || undefined;
  const country = String(data.country ?? data.quote?.country ?? meta?.country ?? directory?.country ?? '').trim() || undefined;
  const market = String(data.market ?? data.quote?.market ?? exchange ?? '').trim() || undefined;
  const providerCurrency = data.currency ?? data.quote?.currency ?? meta?.providerCurrency;
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency,
    symbol: data.symbol ?? symbol,
    providerSymbol: providerSymbol ?? symbol,
    exchange,
    market,
    country,
    assetType,
  });
  const priceUnit = detectPriceUnit({
    price: rawLatestPrice,
    currency: resolvedCurrency.currency,
    providerCurrency,
    symbol: data.symbol ?? symbol,
    providerSymbol: providerSymbol ?? symbol,
    exchange,
    market,
    assetType,
  });
  const normalizePriceValue = (value: unknown) => normalizeMarketPrice({
    price: optionalFiniteNumber(value) ?? null,
    currency: resolvedCurrency.currency,
    providerCurrency,
    symbol: data.symbol ?? symbol,
    providerSymbol: providerSymbol ?? symbol,
    exchange,
    market,
    assetType,
    priceUnit,
  }).price;
  const closes = rawCloses
    .map(value => normalizePriceValue(value))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const latestPrice = normalizePriceValue(rawLatestPrice);
  if (latestPrice === null || !Number.isFinite(latestPrice) || latestPrice <= 0 || closes.length === 0) return null;

  const firstClose = closes[0] || latestPrice;
  const derivedChange = firstClose ? ((latestPrice - firstClose) / firstClose) * 100 : 0;
  const changePercent = Number.isFinite(Number(data.changePercent)) ? Number(data.changePercent) : derivedChange;
  const volatility = Number.isFinite(Number(data.indicators?.volatility))
    ? Number(data.indicators.volatility)
    : latestPrice ? (standardDeviation(closes) / latestPrice) * 100 : 0;
  const trend = ['bullish', 'neutral', 'bearish'].includes(String(data.trend))
    ? data.trend
    : changePercent > 0.5 ? 'bullish' : changePercent < -0.5 ? 'bearish' : 'neutral';
  const riskLevel = ['low', 'medium', 'high'].includes(String(data.riskLevel))
    ? data.riskLevel
    : volatility >= 30 ? 'high' : volatility >= 12 ? 'medium' : 'low';
  const lastUpdated = String(data.timestamp ?? data.updatedAt ?? data.quote?.timestamp ?? new Date().toISOString());
  const rawSource = String(data.source ?? 'openbb').trim();
  const normalizedSource = rawSource.toLowerCase();
  const source = normalizedSource === 'yahoo' || normalizedSource === 'yahoo finance' ? 'Yahoo Finance' : 'openbb';
  const provider = source === 'Yahoo Finance' ? 'yahoo' : 'openbb';

  return {
    success: true,
    provider,
    dataStatus: meta?.fromCache || provider === 'yahoo' ? 'delayed' : 'live',
    source,
    fallback: false,
    symbol: String(data.symbol ?? symbol).toUpperCase(),
    providerSymbol,
    name: String(data.name ?? `${symbol} Market Asset`),
    assetType,
    currency: resolvedCurrency.currency,
    currencySource: resolvedCurrency.source,
    priceUnit,
    exchange,
    country,
    market,
    lastUpdated,
    latestPrice,
    changePercent,
    quote: {
      price: latestPrice,
      change: latestPrice - (closes.at(-2) ?? latestPrice),
      changePercent,
      currency: resolvedCurrency.currency,
      currencySource: resolvedCurrency.source,
      priceUnit,
      timestamp: lastUpdated,
    },
    fundamentals: data.fundamentals && typeof data.fundamentals === 'object' ? data.fundamentals : undefined,
    fundamentalsAvailable: hasUsableFundamentals(data.fundamentals),
    fundamentalsUnavailableReason: fundamentalsReason(assetType, data.fundamentals),
    fundamentalsSource: hasUsableFundamentals(data.fundamentals) ? 'openbb' : undefined,
    technicals: data.technicals && typeof data.technicals === 'object' ? data.technicals : undefined,
    trend,
    riskLevel,
    indicators: {
      rsi: Number.isFinite(Number(data.indicators?.rsi)) ? Number(data.indicators.rsi) : Number(calculateRsi(closes).toFixed(1)),
      sma20: Number.isFinite(Number(data.indicators?.sma20)) ? Number(data.indicators.sma20) : Number(average(closes.slice(-20)).toFixed(2)),
      sma50: Number.isFinite(Number(data.indicators?.sma50)) ? Number(data.indicators.sma50) : Number(average(closes.slice(-50)).toFixed(2)),
      volatility: Number(volatility.toFixed(1)),
    },
    levels: {
      support: Math.min(...closes),
      resistance: Math.max(...closes),
    },
    history: history.length ? history.map((point: any) => ({
      date: String(point.date ?? ''),
      open: normalizePriceValue(point.open ?? point.o) ?? undefined,
      high: normalizePriceValue(point.high ?? point.h) ?? undefined,
      low: normalizePriceValue(point.low ?? point.l) ?? undefined,
      close: normalizePriceValue(point.close ?? 0) ?? 0,
      volume: optionalFiniteNumber(point.volume ?? point.v) ?? null,
    })).filter(point => point.date && Number.isFinite(point.close) && point.close > 0) : [],
    summary: String(data.summary ?? 'Market data loaded from the configured provider. Review the source before making decisions.'),
    fallbackReason: data.fallbackReason ? String(data.fallbackReason) : undefined,
    cached: Boolean(meta?.fromCache),
    cacheAgeSeconds: meta?.cacheAgeSeconds,
    fetchedAt: new Date().toISOString(),
    warnings: [
      ...(Number.isFinite(Number(data.quote?.price)) ? [] : ['Live quote was unavailable; latest history close was used.']),
      ...(meta?.fromCache ? ['Cached market data was used.'] : []),
    ],
  };
}

async function enrichWithStockFundamentals(marketAnalysis: MarketAnalysis, providerSymbol: string): Promise<MarketAnalysis> {
  if (marketAnalysis.assetType !== 'stock' || marketAnalysis.fundamentalsAvailable) return marketAnalysis;

  const fallback = await fetchFinnhubFundamentals(providerSymbol);
  if (fallback.fundamentals) {
    return {
      ...marketAnalysis,
      fundamentals: {
        ...(marketAnalysis.fundamentals ?? {}),
        ...fallback.fundamentals,
      },
      fundamentalsAvailable: true,
      fundamentalsUnavailableReason: undefined,
      fundamentalsSource: 'finnhub',
    };
  }

  return {
    ...marketAnalysis,
    fundamentalsAvailable: false,
    fundamentalsUnavailableReason: fallback.reason,
    fundamentalsSource: marketAnalysis.fundamentalsSource,
  };
}

async function analyzeWithYahooFallback(input: {
  providerSymbol: string;
  displaySymbol: string;
  assetType: MarketAssetType;
  friendlyName?: string;
  exchange?: unknown;
  country?: unknown;
  providerCurrency?: unknown;
  openbbCode: string;
  openbbFromCache?: boolean;
}): Promise<(MarketAnalysis & { displaySymbol?: string; openbbService?: ProxyState }) | null> {
  const yahoo = await fetchYahooHistory(input.providerSymbol, input.assetType, '1y', '1d');
  if (!yahoo.success || yahoo.history.length === 0) return null;

  const closes = yahoo.history
    .map(point => Number(point.close))
    .filter(value => Number.isFinite(value) && value > 0);
  const latestPrice = closes.at(-1);
  if (!Number.isFinite(latestPrice) || Number(latestPrice) <= 0) return null;

  const directory = directorySymbol(input.displaySymbol) ?? directorySymbol(yahoo.providerSymbol) ?? directorySymbol(input.providerSymbol);
  const name = input.friendlyName || String(directory?.name ?? `${input.displaySymbol} Market Asset`);
  const payload = {
    success: true,
    source: yahoo.source,
    fallback: false,
    symbol: input.displaySymbol,
    providerSymbol: yahoo.providerSymbol || input.providerSymbol,
    name,
    assetType: input.assetType,
    currency: yahoo.currency,
    exchange: input.exchange ?? directory?.exchange,
    country: input.country ?? directory?.country,
    latestPrice,
    changePercent: dailyChangePercent(closes),
    quote: {
      price: latestPrice,
      currency: yahoo.currency,
      timestamp: yahoo.fetchedAt,
    },
    timestamp: yahoo.fetchedAt,
    history: yahoo.history,
    technicals: {
      source: yahoo.source,
      ohlc: yahoo.history,
    },
    summary: 'Market data loaded from Yahoo Finance because the primary OpenBB provider is unavailable. Prices may be delayed.',
  };

  const enriched = enrichAnalysis(payload, input.displaySymbol, input.assetType, {
    fromCache: Boolean(yahoo.cached || input.openbbFromCache),
    cacheAgeSeconds: yahoo.cacheAgeSeconds,
    exchange: input.exchange ?? directory?.exchange,
    country: input.country ?? directory?.country,
    providerCurrency: input.providerCurrency ?? yahoo.currency,
  });
  if (!enriched) return null;

  const withSource: MarketAnalysis & { displaySymbol?: string; openbbService?: ProxyState } = {
    ...enriched,
    provider: 'yahoo',
    dataStatus: 'delayed',
    source: yahoo.source,
    fallback: false,
    fallbackReason: input.openbbCode,
    symbol: input.displaySymbol,
    displaySymbol: input.displaySymbol,
    providerSymbol: enriched.providerSymbol ?? yahoo.providerSymbol ?? input.providerSymbol,
    name,
    warnings: [
      'Primary OpenBB market data is unavailable; delayed Yahoo Finance data was used.',
      ...(yahoo.cached ? ['Cached Yahoo Finance market data was used.'] : []),
    ],
    fetchedAt: yahoo.fetchedAt,
    openbbService: 'degraded',
  };

  const withFundamentals = await enrichWithStockFundamentals(withSource, yahoo.providerSymbol || input.providerSymbol);
  return {
    ...withFundamentals,
    displaySymbol: input.displaySymbol,
    openbbService: 'degraded',
  };
}

function yahooQuoteSymbols(providerSymbol: string, displaySymbol: string, assetType: MarketAssetType) {
  const clean = (value: unknown) => String(value ?? '').trim().toUpperCase();
  const compact = (value: unknown) => clean(value).replace(/[\\/:]/g, '').replace(/-/g, '');
  const symbols = new Set<string>();
  const provider = clean(providerSymbol);
  const display = clean(displaySymbol);

  if (provider) symbols.add(provider);
  if (display) symbols.add(display);

  if (assetType === 'crypto') {
    const base = compact(display || provider).replace(/USD$/, '').replace(/USDT$/, '');
    if (/^[A-Z0-9]{2,12}$/.test(base)) symbols.add(`${base}-USD`);
  }

  if (assetType === 'forex') {
    const pair = compact(display || provider).replace(/=X$/, '');
    if (/^[A-Z]{6}$/.test(pair)) symbols.add(`${pair}=X`);
  }

  return Array.from(symbols).filter(Boolean);
}

function analysisFromYahooQuote(input: {
  quote: YahooNormalizedQuote;
  providerSymbol: string;
  displaySymbol: string;
  assetType: MarketAssetType;
  friendlyName?: string;
  exchange?: unknown;
  country?: unknown;
  providerCurrency?: unknown;
  openbbCode: string;
}): (MarketAnalysis & { displaySymbol?: string; openbbService?: ProxyState }) | null {
  const { quote, displaySymbol, providerSymbol, assetType } = input;
  if (!quote.available || quote.price === null || !Number.isFinite(quote.price) || quote.price <= 0) return null;

  const directory = directorySymbol(displaySymbol) ?? directorySymbol(quote.symbolUsed ?? '') ?? directorySymbol(providerSymbol);
  const exchange = input.exchange ?? directory?.exchange;
  const country = input.country ?? directory?.country;
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: quote.currency ?? input.providerCurrency,
    symbol: displaySymbol,
    providerSymbol: quote.symbolUsed ?? providerSymbol,
    exchange,
    country,
    assetType,
  });
  const priceUnit = detectPriceUnit({
    price: quote.price,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency ?? input.providerCurrency,
    symbol: displaySymbol,
    providerSymbol: quote.symbolUsed ?? providerSymbol,
    exchange,
    assetType,
  });
  const normalizePriceValue = (value: unknown) => normalizeMarketPrice({
    price: optionalFiniteNumber(value) ?? null,
    currency: resolvedCurrency.currency,
    providerCurrency: quote.currency ?? input.providerCurrency,
    symbol: displaySymbol,
    providerSymbol: quote.symbolUsed ?? providerSymbol,
    exchange,
    assetType,
    priceUnit,
  }).price;
  const latestPrice = normalizePriceValue(quote.price);
  if (latestPrice === null || latestPrice <= 0) return null;

  const change = normalizePriceValue(quote.change) ?? 0;
  const changePercent = Number.isFinite(Number(quote.changePercent)) ? Number(quote.changePercent) : 0;
  const bandValue = Math.max(Math.abs(change), latestPrice * 0.02);
  const support = Math.max(0, latestPrice - bandValue);
  const resistance = latestPrice + bandValue;
  const volatility = Math.min(100, Math.max(Math.abs(changePercent), (bandValue / latestPrice) * 100));
  const trend = changePercent > 0.35 ? 'bullish' : changePercent < -0.35 ? 'bearish' : 'neutral';
  const riskLevel = assetType === 'crypto' ? 'high' : volatility >= 6 ? 'high' : volatility >= 2 ? 'medium' : 'low';
  const lastUpdated = quote.marketTime ?? new Date().toISOString();
  const name = input.friendlyName || quote.name || String(directory?.name ?? displaySymbol);

  return {
    success: true,
    provider: 'yahoo',
    dataStatus: 'delayed',
    source: quote.source,
    fallback: false,
    fallbackReason: input.openbbCode,
    symbol: displaySymbol,
    displaySymbol,
    providerSymbol: quote.symbolUsed ?? providerSymbol,
    name,
    assetType,
    currency: resolvedCurrency.currency,
    currencySource: resolvedCurrency.source,
    priceUnit,
    exchange: typeof exchange === 'string' ? exchange : undefined,
    country: typeof country === 'string' ? country : undefined,
    market: typeof exchange === 'string' ? exchange : undefined,
    latestPrice,
    changePercent,
    quote: {
      price: latestPrice,
      change,
      changePercent,
      currency: resolvedCurrency.currency,
      currencySource: resolvedCurrency.source,
      priceUnit,
      timestamp: lastUpdated,
    },
    fundamentals: undefined,
    fundamentalsAvailable: false,
    fundamentalsUnavailableReason: fundamentalsReason(assetType, undefined),
    fundamentalsSource: undefined,
    technicals: undefined,
    trend,
    riskLevel,
    indicators: {
      rsi: 50,
      sma20: latestPrice,
      sma50: latestPrice,
      volatility: Number(volatility.toFixed(2)),
    },
    levels: {
      support: Number(support.toFixed(6)),
      resistance: Number(resistance.toFixed(6)),
    },
    history: [],
    summary: 'Latest delayed quote is available, but historical chart data is not currently available from the configured provider.',
    fetchedAt: new Date().toISOString(),
    lastUpdated,
    warnings: [
      'Primary OpenBB historical analysis is unavailable; delayed Yahoo Finance quote data was used.',
      'Historical chart candles are not available for this response.',
    ],
    openbbService: 'degraded',
  };
}

async function analyzeWithYahooQuoteFallback(input: {
  providerSymbol: string;
  displaySymbol: string;
  assetType: MarketAssetType;
  friendlyName?: string;
  exchange?: unknown;
  country?: unknown;
  providerCurrency?: unknown;
  openbbCode: string;
}) {
  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: input.displaySymbol,
    symbols: yahooQuoteSymbols(input.providerSymbol, input.displaySymbol, input.assetType),
    name: input.friendlyName || input.displaySymbol,
    debugContext: {
      route: '/api/market/analyze',
      fallback: 'openbb_to_yahoo_quote',
      assetType: input.assetType,
    },
  }).catch(() => null);

  return quote ? analysisFromYahooQuote({ ...input, quote }) : null;
}

export async function proxyHealth() {
  const result = await fetchOpenBB('/health', undefined, { timeoutMs: OPENBB_HEALTH_TIMEOUT_MS, cacheTtlMs: 0 });
  if (!result.configured) return marketServiceNotConfigured();
  if (!result.available) {
    return {
      ...marketServiceUnavailable(),
      code: result.code || (result.timedOut ? 'openbb_timeout' : 'openbb_unreachable'),
      responseTimeMs: result.elapsedMs,
      lastSuccessfulRequestAt,
    };
  }
  return {
    ...marketServiceConnected(),
    marketService: 'openbb',
    responseTimeMs: result.elapsedMs,
    lastSuccessfulRequestAt,
  };
}

export async function proxyAnalyze(
  symbolInput: unknown,
  assetTypeInput: unknown,
  metaInput?: { displaySymbol?: unknown; name?: unknown; exchange?: unknown; country?: unknown; currency?: unknown },
): Promise<MarketResult & { displaySymbol?: string; source?: string; fallback?: boolean; openbbService?: ProxyState }> {
  const normalizedSymbol = normalizeMarketSymbolInput(symbolInput, assetTypeInput);
  if (!normalizedSymbol.valid) {
    return marketError(normalizedSymbol.code, { openbbService: 'connected', suggestions: normalizedSymbol.suggestions, correction: normalizedSymbol.correction });
  }
  const providerSymbol = normalizeProviderSymbol(normalizedSymbol.providerSymbol);
  if (!providerSymbol) return marketError('invalid_symbol', { openbbService: 'connected', suggestions: normalizedSymbol.suggestions, correction: normalizedSymbol.correction });

  const assetType = normalizedSymbol.assetType;
  const displaySymbol = validateSymbol(metaInput?.displaySymbol) ?? normalizedSymbol.displaySymbol ?? providerSymbol;
  const friendlyName = typeof metaInput?.name === 'string' ? metaInput.name.trim().slice(0, 120) : '';
  const params = new URLSearchParams({ symbol: providerSymbol, assetType });
  const result = await fetchOpenBB('/market/analyze', params, { timeoutMs: OPENBB_TIMEOUT_MS });
  const startedLog = {
    requestedSymbol: String(symbolInput ?? ''),
    normalizedSymbol: providerSymbol,
    path: '/market/analyze',
    assetType,
  };

  if (result.configured && result.available && result.data?.success) {
    const enriched = enrichAnalysis(result.data, displaySymbol, assetType, {
      fromCache: result.fromCache,
      cacheAgeSeconds: result.cacheAgeSeconds,
      exchange: metaInput?.exchange,
      country: metaInput?.country,
      providerCurrency: metaInput?.currency,
    });
    if (!enriched) {
      const code = result.data?.fallback === true || result.data?.source === 'mock' ? 'provider_no_data' : 'response_mapping_failed';
      console.warn('OpenBB analyze mapping failed', { ...startedLog, status: result.status, elapsedMs: result.elapsedMs, code });
      const yahooFallback = await analyzeWithYahooFallback({
        providerSymbol,
        displaySymbol,
        assetType,
        friendlyName,
        exchange: metaInput?.exchange,
        country: metaInput?.country,
        providerCurrency: metaInput?.currency,
        openbbCode: code,
        openbbFromCache: result.fromCache,
      });
      if (yahooFallback) return yahooFallback;

      const yahooQuoteFallback = await analyzeWithYahooQuoteFallback({
        providerSymbol,
        displaySymbol,
        assetType,
        friendlyName,
        exchange: metaInput?.exchange,
        country: metaInput?.country,
        providerCurrency: metaInput?.currency,
        openbbCode: code,
      });
      if (yahooQuoteFallback) return yahooQuoteFallback;

      return marketError(code, { openbbService: 'degraded' });
    }
    let marketAnalysis: MarketAnalysis & { displaySymbol?: string } = {
      ...enriched,
      symbol: displaySymbol,
      displaySymbol,
      providerSymbol: enriched.providerSymbol ?? providerSymbol,
      name: friendlyName || enriched.name,
    };
    marketAnalysis = await enrichWithStockFundamentals(marketAnalysis, providerSymbol) as MarketAnalysis & { displaySymbol?: string };
    return marketAnalysis;
  }

  const code = !result.configured
    ? 'openbb_unreachable'
    : !result.available
      ? result.code || (result.timedOut ? 'openbb_timeout' : 'openbb_unreachable')
      : result.data?.success === false
        ? (/rate limit|too many/i.test(String(result.data.error || result.data.message || '')) ? 'openbb_rate_limit' : /invalid/i.test(String(result.data.error || result.data.message || '')) ? 'invalid_symbol' : /not found/i.test(String(result.data.error || result.data.message || '')) ? 'symbol_not_found' : 'provider_no_data')
        : 'provider_no_data';
  console.warn('OpenBB analyze failed', {
    ...startedLog,
    status: result.configured && 'status' in result ? result.status : undefined,
    elapsedMs: result.elapsedMs,
    code,
  });

  const yahooFallback = await analyzeWithYahooFallback({
    providerSymbol,
    displaySymbol,
    assetType,
    friendlyName,
    exchange: metaInput?.exchange,
    country: metaInput?.country,
    providerCurrency: metaInput?.currency,
    openbbCode: code,
    openbbFromCache: result.configured && result.available ? result.fromCache : false,
  });
  if (yahooFallback) return yahooFallback;

  const yahooQuoteFallback = await analyzeWithYahooQuoteFallback({
    providerSymbol,
    displaySymbol,
    assetType,
    friendlyName,
    exchange: metaInput?.exchange,
    country: metaInput?.country,
    providerCurrency: metaInput?.currency,
    openbbCode: code,
  });
  if (yahooQuoteFallback) return yahooQuoteFallback;

  return marketError(code, {
    openbbService: result.configured ? (code === 'provider_no_data' || code === 'symbol_not_found' ? 'degraded' : 'unavailable') : 'not_configured',
    suggestions: normalizedSymbol.suggestions,
    correction: normalizedSymbol.correction,
  });
}

export async function proxyHistory(symbolInput: unknown, assetTypeInput: unknown, periodInput: unknown, intervalInput?: unknown) {
  const symbol = normalizeProviderSymbol(symbolInput);
  if (!symbol) return { success: false, code: 'invalid_symbol', error: errorMessageForCode('invalid_symbol') };

  const assetType = normalizeAssetType(assetTypeInput);
  const period = String(periodInput ?? '6m');
  const interval = String(intervalInput ?? '').trim();
  const params = new URLSearchParams({ symbol, assetType, period });
  if (interval) params.set('interval', interval);
  const result = await fetchOpenBB('/market/history', params, { timeoutMs: OPENBB_TIMEOUT_MS });
  const openbbHistory = Array.isArray(result.configured && result.available ? result.data?.history : null)
    ? result.configured && result.available ? result.data.history : []
    : [];
  if (result.configured && result.available && result.data?.success && result.data?.fallback !== true && result.data?.source !== 'mock' && openbbHistory.length > 0) {
    return { ...result.data, period, interval: interval || undefined, cached: result.fromCache, cacheAgeSeconds: result.cacheAgeSeconds };
  }

  const yahoo = await fetchYahooHistory(symbol, assetType, period, interval || undefined);
  if (yahoo.success && yahoo.history.length > 0) {
    return {
      ...yahoo,
      fallbackProvider: 'yahoo',
      openbbService: result.configured
        ? result.available
          ? 'degraded'
          : 'unavailable'
        : 'not_configured',
    };
  }

  const openbbCode = result.configured && !result.available
    ? result.code || (result.timedOut ? 'openbb_timeout' : 'provider_no_data')
    : result.configured && result.available && result.data?.success && openbbHistory.length === 0
      ? 'provider_no_data'
      : 'openbb_unreachable';
  const yahooError = yahoo.success ? null : yahoo.error;
  const yahooUnavailableReason = yahoo.success ? null : yahoo.unavailableReason;

  return {
    success: false,
    code: openbbCode,
    source: yahoo.source,
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    symbol,
    assetType,
    period,
    interval: interval || undefined,
    history: [],
    error: yahooError || (result.configured ? 'Market data provider is unavailable.' : 'Market data provider is not configured.'),
    yahooUnavailableReason,
  };
}

export async function proxyCompare(symbolsInput: unknown, assetTypeInput: unknown) {
  const assetType = normalizeAssetType(assetTypeInput);
  const symbols = String(symbolsInput ?? '')
    .split(',')
    .map(validateSymbol)
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, 8);

  const result = await fetchOpenBB('/market/compare', new URLSearchParams({ symbols: symbols.join(','), assetType }));
  if (result.configured && result.available && result.data?.success) {
    const results = Array.isArray(result.data.results)
      ? result.data.results.map((item: unknown, index: number) => enrichAnalysis(item, symbols[index] ?? 'UNKNOWN', assetType, {
        fromCache: result.fromCache,
        cacheAgeSeconds: result.cacheAgeSeconds,
      })).filter(Boolean)
      : [];
    return { success: true, source: 'openbb', results, cached: result.fromCache, cacheAgeSeconds: result.cacheAgeSeconds };
  }

  return {
    success: true,
    source: 'openbb',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results: [],
  };
}

export async function proxySearch(queryInput: unknown, assetTypeInput: unknown) {
  const query = String(queryInput ?? '').trim();
  const assetType = assetTypeInput ? normalizeAssetType(assetTypeInput) : undefined;
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (assetType) params.set('assetType', assetType);

  const result = await fetchOpenBB('/market/search', params);
  if (result.configured && result.available && result.data?.success) return result.data;

  const directoryResults = searchLocalSymbolDirectory(query, assetType);
  if (directoryResults.length > 0) {
    return {
      success: true,
      query,
      source: 'cache',
      fallback: false,
      openbbService: result.configured ? 'unavailable' : 'not_configured',
      results: directoryResults,
    };
  }

  return {
    success: true,
    query,
    source: 'cache',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    results: [],
  };
}
