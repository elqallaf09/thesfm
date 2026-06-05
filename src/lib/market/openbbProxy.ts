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

function isRealProviderPayload(data: Record<string, any>) {
  return data.success === true && data.fallback !== true && String(data.source ?? 'openbb').toLowerCase() === 'openbb';
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

  return {
    success: true,
    provider: 'openbb',
    dataStatus: meta?.fromCache ? 'delayed' : 'live',
    source: 'openbb',
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
      return marketError(code, { openbbService: 'degraded' });
    }
    let marketAnalysis: MarketAnalysis & { displaySymbol?: string } = {
      ...enriched,
      symbol: displaySymbol,
      displaySymbol,
      providerSymbol: enriched.providerSymbol ?? providerSymbol,
      name: friendlyName || enriched.name,
    };
    if (marketAnalysis.assetType === 'stock' && !marketAnalysis.fundamentalsAvailable) {
      const fallback = await fetchFinnhubFundamentals(providerSymbol);
      if (fallback.fundamentals) {
        marketAnalysis = {
          ...marketAnalysis,
          fundamentals: {
            ...(marketAnalysis.fundamentals ?? {}),
            ...fallback.fundamentals,
          },
          fundamentalsAvailable: true,
          fundamentalsUnavailableReason: undefined,
          fundamentalsSource: 'finnhub',
        };
      } else {
        marketAnalysis = {
          ...marketAnalysis,
          fundamentalsAvailable: false,
          fundamentalsUnavailableReason: fallback.reason,
          fundamentalsSource: marketAnalysis.fundamentalsSource,
        };
      }
    }
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
  if (result.configured && result.available && result.data?.success && result.data?.fallback !== true && result.data?.source !== 'mock') {
    return { ...result.data, period, interval: interval || undefined, cached: result.fromCache, cacheAgeSeconds: result.cacheAgeSeconds };
  }

  return {
    success: false,
    code: result.configured && !result.available ? result.code || (result.timedOut ? 'openbb_timeout' : 'provider_no_data') : 'openbb_unreachable',
    source: 'openbb',
    fallback: false,
    openbbService: result.configured ? 'unavailable' : 'not_configured',
    symbol,
    assetType,
    period,
    interval: interval || undefined,
    history: [],
    error: result.configured ? 'Market data provider is unavailable.' : 'Market data provider is not configured.',
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
