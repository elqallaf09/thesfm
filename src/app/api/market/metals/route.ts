import { NextResponse } from 'next/server';
import { normalizeDigits } from '@/lib/locale';
import { classifyRuntimeFailure, logReliabilityEvent, type ClassifiedRuntimeFailure } from '@/lib/runtime/reliability';

export const dynamic = 'force-dynamic';

const TROY_OUNCE_GRAMS = 31.1034768;
const DEFAULT_CURRENCY = 'KWD';
const DEFAULT_METALS_PROVIDER_URL = 'https://api.metals.live/v1/spot/gold,silver';
const DEFAULT_EXCHANGE_URL = 'https://open.er-api.com/v6/latest/USD';
const PROVIDER_TIMEOUT_MS = 6_000;
const MAX_PROVIDER_ATTEMPTS = 2;
const LIVE_CACHE_TTL_MS = 5 * 60_000;
const STALE_CACHE_TTL_MS = 6 * 60 * 60_000;

type MetalPayload = {
  price: number;
  currency: string;
  unit: 'gram';
  lastUpdated: string;
};

type MetalsResponse = {
  success: boolean;
  gold?: MetalPayload;
  silver?: MetalPayload;
  source?: 'api' | 'cache';
  cached?: boolean;
  stale?: boolean;
  code?: string;
  retryable?: boolean;
  error?: string;
};

type CachedMetals = { response: MetalsResponse; storedAt: number };
const metalsCache = new Map<string, CachedMetals>();

export function __resetMetalsCacheForTests() {
  metalsCache.clear();
}

class UpstreamHttpError extends Error {
  status: number;
  retryAfterMs: number;

  constructor(status: number, retryAfterMs = 0) {
    super(`upstream_http_${status}`);
    this.name = 'UpstreamHttpError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function num(value: unknown) {
  const parsed = typeof value === 'string' ? Number(normalizeDigits(value).replace(/,/g, '')) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = num(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function pick(payload: unknown, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((node, key) => (
      node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined
    ), payload);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function providerCurrency(payload: unknown) {
  return String(pick(payload, ['currency', 'base', 'baseCurrency', 'gold.currency', 'data.currency', 'meta.currency']) || 'USD').toUpperCase();
}

function extractOuncePrices(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      goldOunce: firstNumber(...payload.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).gold : undefined)),
      silverOunce: firstNumber(...payload.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).silver : undefined)),
    };
  }
  return {
    goldOunce: firstNumber(
      pick(payload, ['gold.pricePerOunce', 'gold.price_per_ounce', 'gold.ounce', 'gold.ask', 'gold.price']),
      pick(payload, ['XAU', 'xau', 'GOLD', 'rates.XAU', 'rates.GOLD', 'data.XAU', 'data.gold']),
      pick(payload, ['goldPricePerOunce', 'goldOunce', 'gold_usd_ounce', 'price.gold']),
    ),
    silverOunce: firstNumber(
      pick(payload, ['silver.pricePerOunce', 'silver.price_per_ounce', 'silver.ounce', 'silver.ask', 'silver.price']),
      pick(payload, ['XAG', 'xag', 'SILVER', 'rates.XAG', 'rates.SILVER', 'data.XAG', 'data.silver']),
      pick(payload, ['silverPricePerOunce', 'silverOunce', 'silver_usd_ounce', 'price.silver']),
    ),
  };
}

function extractGramPrices(payload: unknown) {
  return {
    goldGram: firstNumber(
      pick(payload, ['gold.pricePerGram', 'gold.price_per_gram', 'gold.gram', 'gold.pricePerGram24k']),
      pick(payload, ['goldPricePerGram', 'gold_gram', 'gold_gram_kwd']),
    ),
    silverGram: firstNumber(
      pick(payload, ['silver.pricePerGram', 'silver.price_per_gram', 'silver.gram']),
      pick(payload, ['silverPricePerGram', 'silver_gram', 'silver_gram_kwd']),
    ),
  };
}

function hasUsableMetalPrices(payload: unknown) {
  const grams = extractGramPrices(payload);
  const ounces = extractOuncePrices(payload);
  return (grams.goldGram > 0 || ounces.goldOunce > 0) && (grams.silverGram > 0 || ounces.silverOunce > 0);
}

function retryAfterMs(response: Response) {
  const value = response.headers.get('retry-after');
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new UpstreamHttpError(response.status, retryAfterMs(response));
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error('invalid response payload');
  return payload;
}

async function fetchWithRetry(provider: string, request: () => Promise<unknown>) {
  let lastFailure: ClassifiedRuntimeFailure = classifyRuntimeFailure(null);
  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const payload = await request();
      logReliabilityEvent('info', 'market_provider_success', {
        provider,
        capability: 'metals',
        attempt,
        durationMs: Date.now() - startedAt,
      });
      return payload;
    } catch (error) {
      lastFailure = classifyRuntimeFailure(error);
      logReliabilityEvent(attempt === MAX_PROVIDER_ATTEMPTS || !lastFailure.retryable ? 'error' : 'warn', 'market_provider_failure', {
        provider,
        capability: 'metals',
        attempt,
        durationMs: Date.now() - startedAt,
        failureCode: lastFailure.code,
        category: lastFailure.category,
        httpStatus: lastFailure.httpStatus,
        retryable: lastFailure.retryable,
      });
      if (!lastFailure.retryable || attempt === MAX_PROVIDER_ATTEMPTS) break;
      const requestedDelay = error instanceof UpstreamHttpError ? error.retryAfterMs : 0;
      await delay(Math.min(750, Math.max(requestedDelay, attempt * 150)));
    }
  }
  throw Object.assign(new Error(lastFailure.code), { classifiedFailure: lastFailure });
}

async function fetchYahooOuncePrice(symbol: string) {
  const payload = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, { Accept: 'application/json' });
  const result = pick(payload, ['chart.result.0']) as Record<string, unknown> | undefined;
  return firstNumber(
    pick(result, ['meta.regularMarketPrice']),
    Array.isArray(pick(result, ['indicators.quote.0.close']))
      ? (pick(result, ['indicators.quote.0.close']) as unknown[]).find(value => num(value) > 0)
      : undefined,
  );
}

async function fetchYahooMetalsPayload() {
  const [goldOunce, silverOunce] = await Promise.all([
    fetchYahooOuncePrice('GC=F'),
    fetchYahooOuncePrice('SI=F'),
  ]);
  if (goldOunce <= 0 || silverOunce <= 0) throw Object.assign(new Error('no market data'), { noData: true });
  return { currency: 'USD', gold: { pricePerOunce: goldOunce }, silver: { pricePerOunce: silverOunce } };
}

function configuredProviderRequest() {
  const apiUrl = process.env.METALS_API_URL?.trim();
  const apiKey = process.env.METALS_API_KEY?.trim();
  if (!apiUrl) return null;
  const url = apiKey ? apiUrl.replace('{METALS_API_KEY}', encodeURIComponent(apiKey)) : apiUrl;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey && url === apiUrl) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }
  return () => fetchJson(url, headers);
}

async function fetchProviderPayload() {
  const candidates: Array<{ id: string; request: () => Promise<unknown> }> = [];
  const configured = configuredProviderRequest();
  if (configured) candidates.push({ id: 'configured_metals', request: configured });
  if (!process.env.METALS_API_URL?.trim() || process.env.METALS_API_URL?.trim() !== DEFAULT_METALS_PROVIDER_URL) {
    candidates.push({ id: 'metals_live', request: () => fetchJson(DEFAULT_METALS_PROVIDER_URL, { Accept: 'application/json' }) });
  }
  candidates.push({ id: 'yahoo_futures', request: fetchYahooMetalsPayload });

  let lastError: unknown = new Error('provider unavailable');
  for (const candidate of candidates) {
    try {
      const payload = await fetchWithRetry(candidate.id, candidate.request);
      if (!hasUsableMetalPrices(payload)) {
        const failure = classifyRuntimeFailure(null, { noData: true });
        logReliabilityEvent('warn', 'market_provider_no_data', {
          provider: candidate.id,
          capability: 'metals',
          failureCode: failure.code,
        });
        lastError = Object.assign(new Error(failure.code), { classifiedFailure: failure });
        continue;
      }
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchUsdRate(targetCurrency: string) {
  if (targetCurrency === 'USD') return 1;
  const exchangeUrl = process.env.EXCHANGE_API_URL?.trim();
  const exchangeKey = process.env.EXCHANGE_API_KEY?.trim();
  const candidates: Array<{ id: string; request: () => Promise<unknown> }> = [];
  if (exchangeUrl) {
    const url = exchangeKey ? exchangeUrl.replace('{EXCHANGE_API_KEY}', encodeURIComponent(exchangeKey)) : exchangeUrl;
    const headers = exchangeKey && url === exchangeUrl ? { Authorization: `Bearer ${exchangeKey}`, 'x-api-key': exchangeKey } : undefined;
    candidates.push({ id: 'configured_fx', request: () => fetchJson(url, headers) });
  }
  candidates.push({ id: 'open_er_api', request: () => fetchJson(DEFAULT_EXCHANGE_URL) });

  let lastError: unknown = new Error('provider unavailable');
  for (const candidate of candidates) {
    try {
      const payload = await fetchWithRetry(candidate.id, candidate.request);
      const rate = firstNumber(pick(payload, [`rates.${targetCurrency}`, `conversion_rates.${targetCurrency}`, targetCurrency]));
      if (rate > 0) return rate;
      lastError = Object.assign(new Error('NO_MARKET_DATA'), { classifiedFailure: classifyRuntimeFailure(null, { noData: true }) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function cachedResponse(currency: string) {
  const cached = metalsCache.get(currency);
  if (!cached || Date.now() - cached.storedAt > STALE_CACHE_TTL_MS) return null;
  return {
    ...cached.response,
    source: 'cache' as const,
    cached: true,
    stale: Date.now() - cached.storedAt > LIVE_CACHE_TTL_MS,
  };
}

export async function GET(request: Request) {
  const requestId = request.headers.get('x-vercel-id') || crypto.randomUUID();
  const requestedCurrency = new URL(request.url).searchParams.get('currency')?.toUpperCase() || DEFAULT_CURRENCY;
  if (!/^[A-Z]{3}$/.test(requestedCurrency)) {
    return NextResponse.json({ success: false, code: 'INVALID_CURRENCY', retryable: false, error: 'Market data is unavailable for this currency.' } satisfies MetalsResponse, { status: 400 });
  }

  const freshCache = cachedResponse(requestedCurrency);
  if (freshCache && !freshCache.stale) return NextResponse.json(freshCache);

  const startedAt = Date.now();
  try {
    const payload = await fetchProviderPayload();
    const sourceCurrency = providerCurrency(payload);
    const grams = extractGramPrices(payload);
    const ounces = extractOuncePrices(payload);
    const conversionRate = sourceCurrency === requestedCurrency
      ? 1
      : sourceCurrency === 'USD'
        ? await fetchUsdRate(requestedCurrency)
        : 0;
    if (conversionRate <= 0) throw Object.assign(new Error('UNSUPPORTED_ASSET'), { classifiedFailure: classifyRuntimeFailure(null, { unsupportedAsset: true }) });

    const goldPerGram = (grams.goldGram > 0 ? grams.goldGram : ounces.goldOunce / TROY_OUNCE_GRAMS) * conversionRate;
    const silverPerGram = (grams.silverGram > 0 ? grams.silverGram : ounces.silverOunce / TROY_OUNCE_GRAMS) * conversionRate;
    if (goldPerGram <= 0 || silverPerGram <= 0) throw Object.assign(new Error('NO_MARKET_DATA'), { classifiedFailure: classifyRuntimeFailure(null, { noData: true }) });

    const now = new Date().toISOString();
    const response: MetalsResponse = {
      success: true,
      gold: { price: goldPerGram, currency: requestedCurrency, unit: 'gram', lastUpdated: now },
      silver: { price: silverPerGram, currency: requestedCurrency, unit: 'gram', lastUpdated: now },
      source: 'api',
      cached: false,
      stale: false,
    };
    metalsCache.set(requestedCurrency, { response, storedAt: Date.now() });
    logReliabilityEvent('info', 'metals_request_complete', {
      requestId,
      currency: requestedCurrency,
      durationMs: Date.now() - startedAt,
      deliverySource: 'live',
    });
    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=21600' } });
  } catch (error) {
    const stale = cachedResponse(requestedCurrency);
    const classified = error && typeof error === 'object' && 'classifiedFailure' in error
      ? (error as { classifiedFailure: ClassifiedRuntimeFailure }).classifiedFailure
      : classifyRuntimeFailure(error);
    logReliabilityEvent(stale ? 'warn' : 'error', 'metals_request_failed', {
      requestId,
      currency: requestedCurrency,
      durationMs: Date.now() - startedAt,
      failureCode: classified.code,
      category: classified.category,
      httpStatus: classified.httpStatus,
      retryable: classified.retryable,
      cacheFallback: Boolean(stale),
    });
    if (stale) return NextResponse.json(stale, { headers: { 'Cache-Control': 'private, no-cache' } });
    return NextResponse.json({
      success: false,
      code: classified.code,
      retryable: classified.retryable,
      error: 'Metals market data is temporarily unavailable.',
    } satisfies MetalsResponse, { status: classified.code === 'RATE_LIMITED' ? 429 : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
