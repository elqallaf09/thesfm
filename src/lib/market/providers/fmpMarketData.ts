import { cleanEnv } from '@/lib/market/providerConfig';
import { fmpQueuedFetch } from '@/lib/trader/providers/fmpRuntime.server';
import { getFmpRateLimitedUntil } from '@/lib/trader/providers/fmpRuntime';
import { QuoteProviderError } from './quoteFailure';
import type {
  MarketDataProvider, MarketDataProviderContext, NormalizedMarketCandle,
  NormalizedMarketQuote, ProviderHealthResult,
} from '@/lib/market/marketDataProviders';

type Row = Record<string, unknown>;
const cache = new Map<string, { expires: number; rows: Row[] }>();
const pending = new Map<string, Promise<Row[]>>();
const failures = new Map<string, { until: number; error: QuoteProviderError }>();
const INDEX_COUNTRY: Record<string, string> = { '^GSPC': 'US', '^DJI': 'US', '^NDX': 'US', '^FTSE': 'GB', '^GDAXI': 'DE', '^N225': 'JP' };
export function fmpIndexSymbol(symbol: string, context: MarketDataProviderContext = {}) {
  const value = symbol.trim().toUpperCase();
  return context.assetType === 'index' && Object.hasOwn(INDEX_COUNTRY, value) ? value : null;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

// This adapter deliberately covers US equities/ETFs only. Never strip a foreign
// exchange suffix or reinterpret a crypto ticker as an unrelated US company.
export function fmpEquitySymbol(symbol: string, market?: string | null, context: MarketDataProviderContext = {}) {
  const value = symbol.trim().toUpperCase();
  if (context.assetType && !['stock', 'etf', 'fund'].includes(context.assetType)) return null;
  if (context.currency && context.currency !== 'USD') return null;
  if (market && /kuwait|saudi|uae|qatar|bahrain|oman|europe|asia|china|japan|forex|crypto|commodit/i.test(market)) return null;
  return /^[A-Z]{1,5}(?:[.-][AB])?$/.test(value) ? value.replace('.', '-') : null;
}

async function rows(endpoint: string, symbol: string, forceFresh = false): Promise<Row[]> {
  const key = `${endpoint}:${symbol}`;
  const cached = cache.get(key);
  if (!forceFresh && cached && cached.expires > Date.now()) return cached.rows;
  const failed = failures.get(key);
  if (failed && failed.until > Date.now()) throw failed.error;
  if (failed) failures.delete(key);
  const existing = pending.get(key);
  if (existing) return existing;
  const load = (async () => {
    const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
    url.searchParams.set('symbol', symbol);
    if (endpoint.includes('historical')) {
      url.searchParams.set('from', new Date(Date.now() - 550 * 86_400_000).toISOString().slice(0, 10));
    }
    const response = await fmpQueuedFetch(url, {
      headers: { accept: 'application/json', apikey: cleanEnv(process.env.FMP_API_KEY) },
      signal: AbortSignal.timeout(8000),
      ...(forceFresh ? { cache: 'no-store' as const } : { next: { revalidate: endpoint === 'quote' ? 60 : 900 } }),
    });
    if (!response.ok) {
      const until = [401, 402, 403].includes(response.status) ? Date.now() + 300_000 : null;
      const error = new QuoteProviderError(response.status, `provider_http_${response.status}`,
        until ? new Date(until).toISOString() : response.status === 429 ? getFmpRateLimitedUntil() : undefined, symbol);
      if (until) {
        if (failures.size >= 500) failures.delete(failures.keys().next().value!);
        failures.set(key, { until, error });
      }
      throw error;
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('provider_invalid_response');
    const result = payload.filter((item): item is Row => !!item && typeof item === 'object');
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { rows: result, expires: Date.now() + (endpoint === 'quote' ? 60_000 : 900_000) });
    return result;
  })().finally(() => pending.delete(key));
  pending.set(key, load);
  return load;
}

export class FmpMarketDataProvider implements MarketDataProvider {
  name = 'fmp' as const;
  displayName = 'Financial Modeling Prep';
  configured() { return Boolean(cleanEnv(process.env.FMP_API_KEY)); }
  supports(symbol: string, context: MarketDataProviderContext) {
    return Boolean(fmpIndexSymbol(symbol, context) || fmpEquitySymbol(symbol, context.market, context));
  }

  async getQuote(symbol: string, market?: string | null, context: MarketDataProviderContext = {}): Promise<NormalizedMarketQuote | null> {
    const indexSymbol = fmpIndexSymbol(symbol, context);
    const providerSymbol = indexSymbol || fmpEquitySymbol(symbol, market, context);
    if (!providerSymbol || !this.configured()) return null;
    const data = await rows('quote', providerSymbol, context.forceFresh);
    const row = data.find(item => String(item.symbol).toUpperCase() === providerSymbol);
    const price = number(row?.price);
    if (!row || price === null || price <= 0) return null;
    const previousClose = number(row.previousClose);
    const change = number(row.change) ?? (previousClose !== null && previousClose > 0 ? price - previousClose : null);
    const timestamp = number(row.timestamp);
    return {
      symbol: context.symbol || symbol, providerSymbol, price,
      name: typeof row.name === 'string' ? row.name : context.name ?? null,
      currency: indexSymbol ? null : typeof row.currency === 'string' ? row.currency : 'USD',
      previousClose, change, marketCap: number(row.marketCap),
      changePercent: number(row.changePercentage ?? row.changesPercentage)
        ?? (change !== null && previousClose !== null && previousClose > 0 ? change / previousClose * 100 : null),
      open: number(row.open), high: number(row.dayHigh), low: number(row.dayLow), volume: number(row.volume),
      market: market ?? (indexSymbol ? 'indices' : 'us-stocks'), exchange: typeof row.exchange === 'string' ? row.exchange : context.exchange ?? null,
      exchangeCode: context.exchangeCode ?? null, country: indexSymbol ? INDEX_COUNTRY[indexSymbol] : 'US', assetType: indexSymbol ? 'index' : context.assetType ?? 'stock',
      provider: this.name, providerName: this.displayName,
      // A configured key alone does not establish a realtime entitlement.
      delayType: 'delayed',
      lastUpdated: timestamp !== null && timestamp > 0 && Number.isFinite(new Date(timestamp * 1000).getTime())
        ? new Date(timestamp * 1000).toISOString() : null,
    };
  }

  async getCandles(symbol: string, market?: string | null, interval?: string | null, context: MarketDataProviderContext = {}): Promise<NormalizedMarketCandle[]> {
    const providerSymbol = fmpEquitySymbol(symbol, market, context);
    if (!providerSymbol || !this.configured() || (interval && interval !== '1d')) return [];
    const data = await rows('historical-price-eod/full', providerSymbol, context.forceFresh);
    const byDate = new Map<string, NormalizedMarketCandle>();
    for (const row of data) {
      if (row.symbol && String(row.symbol).toUpperCase() !== providerSymbol) continue;
      const close = number(row.close);
      const date = typeof row.date === 'string' ? row.date : '';
      if (close === null || close <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) continue;
      const open = number(row.open), high = number(row.high), low = number(row.low), volume = number(row.volume);
      byDate.set(date, { date, close, ...(open !== null && open > 0 ? { open } : {}),
        ...(high !== null && high > 0 ? { high } : {}), ...(low !== null && low > 0 ? { low } : {}),
        volume: volume !== null && volume >= 0 ? volume : null, provider: this.name });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-320);
  }

  async getCompanyProfile() { return null; }
  async getLogo() { return null; }
  async getNews() { return []; }
  async getSymbolSearch() { return []; }
  async getExchangeMetadata() { return null; }
  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    const base = { provider: this.name, displayName: this.displayName, configured: this.configured(), remainingQuota: null, lastCheckedAt: new Date().toISOString() };
    if (!base.configured) return { ...base, status: 'not_configured', latencyMs: null, latestError: null };
    try {
      const quote = await this.getQuote('AAPL', 'us-stocks');
      return { ...base, status: quote ? 'healthy' : 'no_data', latencyMs: Date.now() - started, latestError: null };
    } catch {
      return { ...base, status: 'error', latencyMs: Date.now() - started, latestError: 'fmp_request_failed' };
    }
  }
}
