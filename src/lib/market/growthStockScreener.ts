import 'server-only';

import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import {
  GROWTH_SCREEN_CRITERIA,
  normalizeGrowthStatementRows,
  normalizeGrowthUniverseRows,
  recentCompletedQuarters,
  selectGrowthCandidates,
  type GrowthScreenCandidate,
  type GrowthScreenPeriod,
} from '@/lib/market/growthStockScreenerCore';
import { fetchTraderQuotes, type TraderQuote } from '@/lib/trader/marketQuotes';
import { fmpQueuedFetch } from '@/lib/trader/providers/fmpRuntime';

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';
const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const;
const MAX_RETURNED_GROWTH_STOCKS = 200;
const FUNDAMENTAL_CACHE_SECONDS = 30 * 60;

type ScreenerMode = 'fundamental_screener' | 'fallback_watchlist';

export type GrowthScreenerItem = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available: boolean;
  unavailableReason?: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  marketCap: number | null;
  revenueGrowthPercent: number | null;
  earningsGrowthPercent: number | null;
  operatingIncomeGrowthPercent: number | null;
  netIncomeGrowthPercent: number | null;
  growthPeriod: string | null;
  screenBasis: ScreenerMode;
};

export type GrowthScreenerResult = {
  mode: ScreenerMode;
  source: string;
  updatedAt: string;
  universeCount: number;
  matchedCount: number;
  returnedCount: number;
  availableCount: number;
  periods: string[];
  criteria: typeof GROWTH_SCREEN_CRITERIA;
  degradedReason: string | null;
  items: GrowthScreenerItem[];
};

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percent(value: number | null) {
  return value === null || !Number.isFinite(value) ? null : Number((value * 100).toFixed(2));
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : 'growth_screener_unavailable';
}

async function fetchFmpArray(endpoint: string, params: Record<string, string | number | boolean>) {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) throw new Error('fmp_api_key_not_configured');

  const url = new URL(`${FMP_STABLE_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  url.searchParams.set('apikey', apiKey);

  const response = await fmpQueuedFetch(url, {
    next: { revalidate: FUNDAMENTAL_CACHE_SECONDS },
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`fmp_${endpoint}_http_${response.status}`);

  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : [];
  } catch {
    throw new Error(`fmp_${endpoint}_invalid_json`);
  }
  if (!Array.isArray(payload)) {
    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
    const message = String(record?.message ?? record?.error ?? '').toLowerCase();
    if (message.includes('limit') || message.includes('quota')) throw new Error('fmp_growth_screener_rate_limited');
    throw new Error(`fmp_${endpoint}_unexpected_payload`);
  }
  return payload as Array<Record<string, unknown>>;
}

async function fetchUsUniverse() {
  const result = await Promise.all(US_EXCHANGES.map(exchange => fetchFmpArray('company-screener', {
    exchange,
    country: 'US',
    isEtf: false,
    isFund: false,
    isActivelyTrading: true,
    marketCapMoreThan: GROWTH_SCREEN_CRITERIA.minimumMarketCap,
    priceMoreThan: GROWTH_SCREEN_CRITERIA.minimumPrice,
    volumeMoreThan: GROWTH_SCREEN_CRITERIA.minimumVolume,
    limit: 10_000,
  })));
  return normalizeGrowthUniverseRows(result.flat());
}

async function fetchRecentGrowthRows(periods: GrowthScreenPeriod[]) {
  const settled = await Promise.allSettled(periods.map(period => fetchFmpArray('income-statement-growth-bulk', {
    year: period.year,
    period: period.period,
  })));
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!rows.length) {
    const firstFailure = settled.find(result => result.status === 'rejected');
    throw firstFailure?.status === 'rejected' ? firstFailure.reason : new Error('growth_bulk_empty');
  }
  return normalizeGrowthStatementRows(rows);
}

function growthPeriod(candidate: GrowthScreenCandidate) {
  const fiscalYear = candidate.fiscalYear?.trim();
  const period = candidate.period?.trim();
  if (fiscalYear && period) return `${fiscalYear} ${period}`;
  return candidate.date;
}

function mapCandidate(candidate: GrowthScreenCandidate, quote: TraderQuote | undefined): GrowthScreenerItem {
  const quotePrice = quote?.available && finite(quote.price) !== null ? finite(quote.price) : null;
  const screenerPrice = finite(candidate.price);
  const price = quotePrice ?? screenerPrice;
  const usingQuote = quotePrice !== null;
  return {
    symbol: candidate.symbol,
    name: quote?.name || candidate.name || candidate.symbol,
    price,
    currency: quote?.currency || candidate.currency || 'USD',
    change: usingQuote ? finite(quote?.change) : null,
    changePercent: usingQuote ? finite(quote?.changePercent) : null,
    source: usingQuote ? (quote?.source ?? 'market_data') : 'Financial Modeling Prep Screener',
    delayed: quote?.delayed ?? true,
    available: price !== null && price > 0,
    ...(price === null || price <= 0 ? { unavailableReason: quote?.unavailableReason ?? 'quote_unavailable' } : {}),
    sector: candidate.sector,
    industry: candidate.industry,
    exchange: candidate.exchange,
    marketCap: candidate.marketCap,
    revenueGrowthPercent: percent(candidate.revenueGrowth),
    earningsGrowthPercent: percent(candidate.epsDilutedGrowth ?? candidate.epsGrowth),
    operatingIncomeGrowthPercent: percent(candidate.operatingIncomeGrowth),
    netIncomeGrowthPercent: percent(candidate.netIncomeGrowth),
    growthPeriod: growthPeriod(candidate),
    screenBasis: 'fundamental_screener',
  };
}

async function fallbackWatchlist(reason: string): Promise<GrowthScreenerResult> {
  const watchlist = getStockCategoryConfig('growth')?.watchlist ?? [];
  const symbols = watchlist.map(stock => stock.symbol);
  const quotes = symbols.length
    ? await fetchTraderQuotes(symbols, { includeHistory: false, includeNews: false }).catch(() => [])
    : [];
  const quoteBySymbol = new Map(quotes.map(quote => [quote.symbol.toUpperCase(), quote]));
  const updatedAt = new Date().toISOString();
  const items: GrowthScreenerItem[] = watchlist.map(stock => {
    const quote = quoteBySymbol.get(stock.symbol.toUpperCase());
    const price = finite(quote?.price);
    return {
      symbol: stock.symbol,
      name: quote?.name || stock.name,
      price,
      currency: quote?.currency || 'USD',
      change: finite(quote?.change),
      changePercent: finite(quote?.changePercent),
      source: quote?.source ?? 'market_data',
      delayed: quote?.delayed ?? true,
      available: Boolean(quote?.available && price !== null && price > 0),
      ...(!quote?.available ? { unavailableReason: quote?.unavailableReason ?? reason } : {}),
      sector: stock.filter,
      industry: null,
      exchange: quote?.exchange ?? null,
      marketCap: finite(quote?.marketCap),
      revenueGrowthPercent: null,
      earningsGrowthPercent: null,
      operatingIncomeGrowthPercent: null,
      netIncomeGrowthPercent: null,
      growthPeriod: null,
      screenBasis: 'fallback_watchlist',
    };
  });

  return {
    mode: 'fallback_watchlist',
    source: 'configured_growth_watchlist',
    updatedAt,
    universeCount: watchlist.length,
    matchedCount: watchlist.length,
    returnedCount: items.length,
    availableCount: items.filter(item => item.available).length,
    periods: [],
    criteria: GROWTH_SCREEN_CRITERIA,
    degradedReason: reason,
    items,
  };
}

export async function screenGrowthStocks(): Promise<GrowthScreenerResult> {
  if (!process.env.FMP_API_KEY?.trim()) return fallbackWatchlist('fmp_api_key_not_configured');

  try {
    const periods = recentCompletedQuarters(new Date(), 4);
    const [universe, growthRows] = await Promise.all([
      fetchUsUniverse(),
      fetchRecentGrowthRows(periods),
    ]);
    const matches = selectGrowthCandidates(universe, growthRows);
    if (!universe.length) return fallbackWatchlist('growth_universe_empty');
    if (!matches.length) return fallbackWatchlist('growth_screen_no_matches');

    const selected = matches.slice(0, MAX_RETURNED_GROWTH_STOCKS);
    const quotes = await fetchTraderQuotes(selected.map(candidate => candidate.symbol), {
      includeHistory: false,
      includeNews: false,
    }).catch(() => []);
    const quoteBySymbol = new Map(quotes.map(quote => [quote.symbol.toUpperCase(), quote]));
    const items = selected.map(candidate => mapCandidate(candidate, quoteBySymbol.get(candidate.symbol)));

    return {
      mode: 'fundamental_screener',
      source: 'Financial Modeling Prep + market quote providers',
      updatedAt: new Date().toISOString(),
      universeCount: universe.length,
      matchedCount: matches.length,
      returnedCount: items.length,
      availableCount: items.filter(item => item.available).length,
      periods: periods.map(period => `${period.year} ${period.period}`),
      criteria: GROWTH_SCREEN_CRITERIA,
      degradedReason: null,
      items,
    };
  } catch (error) {
    return fallbackWatchlist(safeMessage(error));
  }
}
