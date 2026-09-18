import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { getStockCategoryConfig, type StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import { screenGrowthStocks } from '@/lib/market/growthStockScreener';
import { fetchTraderQuotes, type TraderQuote } from '@/lib/trader/marketQuotes';
import { fmpQueuedFetch } from '@/lib/trader/providers/fmpRuntime';

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';
const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const;
const UNIVERSE_CACHE_SECONDS = 15 * 60;
const MAX_RESULTS = 500;
const MAX_QUOTE_ENRICHMENT = 180;
let universeRequest: Promise<{ rows: UniverseRow[]; degradedReason: string | null }> | null = null;
let universeExpiresAt = 0;
const scans = new Map<StockCategoryId, { expiresAt: number; request: Promise<StockCategoryScannerResult> }>();

export type StockCategoryScannerMode =
  | 'dynamic_market_screener'
  | 'fundamental_growth_screener'
  | 'shariah_catalog'
  | 'fallback_watchlist';

export type StockCategoryScannerItem = {
  symbol: string;
  name: string;
  category: StockCategoryId;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available: boolean;
  quoteEnriched?: boolean;
  unavailableReason?: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  marketCap: number | null;
  volume: number | null;
  beta: number | null;
  lastAnnualDividend: number | null;
  dividendYieldPercent: number | null;
  revenueGrowthPercent: number | null;
  earningsGrowthPercent: number | null;
  operatingIncomeGrowthPercent: number | null;
  netIncomeGrowthPercent: number | null;
  growthPeriod: string | null;
  shariahStatus: string | null;
  shariahSource: string | null;
  shariahLastReviewedAt: string | null;
  classificationReason: string;
  screenBasis: StockCategoryScannerMode;
};

export type StockCategoryScannerResult = {
  category: StockCategoryId;
  mode: StockCategoryScannerMode;
  source: string;
  updatedAt: string;
  universeCount: number;
  matchedCount: number;
  returnedCount: number;
  availableCount: number;
  quoteEnrichedCount: number;
  criteria: Record<string, unknown>;
  degradedReason: string | null;
  items: StockCategoryScannerItem[];
};

type UniverseRow = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  marketCap: number | null;
  sector: string | null;
  industry: string | null;
  beta: number | null;
  volume: number | null;
  exchange: string | null;
  country: string | null;
  lastAnnualDividend: number | null;
};

type ScanOptions = {
  limit?: number;
  forceRefresh?: boolean;
};

const CRITERIA: Record<Exclude<StockCategoryId, 'growth' | 'sharia'>, Record<string, unknown>> = {
  energy: {
    universe: 'All active US common stocks returned by NASDAQ, NYSE and AMEX scans',
    classification: 'Sector = Energy',
  },
  banking: {
    universe: 'All active US common stocks returned by NASDAQ, NYSE and AMEX scans',
    classification: 'Financial Services companies whose industry or company name identifies banking activity',
  },
  defensive: {
    universe: 'All active US common stocks returned by NASDAQ, NYSE and AMEX scans',
    classification: 'Consumer Defensive, Healthcare, Utilities, plus telecom-oriented Communication Services',
  },
  cyclical: {
    universe: 'All active US common stocks returned by NASDAQ, NYSE and AMEX scans',
    classification: 'Consumer Cyclical, Industrials, Basic Materials and Real Estate',
  },
  dividend: {
    universe: 'All active US common stocks returned by NASDAQ, NYSE and AMEX scans',
    classification: 'Positive annual cash dividend and indicated dividend yield of at least 1.5%',
    minimumDividendYieldPercent: 1.5,
  },
};

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 350;
  return Math.max(24, Math.min(MAX_RESULTS, Math.floor(value ?? 350)));
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : 'category_scanner_unavailable';
}

function validSymbol(value: string) {
  return /^[A-Z0-9][A-Z0-9.-]{0,24}$/.test(value) && !value.includes('^');
}

function normalizeUniverseRows(rows: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  const output: UniverseRow[] = [];

  for (const row of rows) {
    const symbol = text(row.symbol).toUpperCase();
    if (!validSymbol(symbol) || seen.has(symbol)) continue;
    if (row.isEtf === true || row.isFund === true || row.isActivelyTrading === false) continue;

    const country = text(row.country || 'US') || 'US';
    if (country && !/^US$|United States/i.test(country)) continue;

    seen.add(symbol);
    output.push({
      symbol,
      name: text(row.companyName ?? row.name) || symbol,
      price: finite(row.price),
      currency: text(row.currency) || 'USD',
      marketCap: finite(row.marketCap),
      sector: text(row.sector) || null,
      industry: text(row.industry) || null,
      beta: finite(row.beta),
      volume: finite(row.volume),
      exchange: text(row.exchangeShortName ?? row.exchange) || null,
      country,
      lastAnnualDividend: finite(row.lastAnnualDividend ?? row.dividend),
    });
  }

  return output;
}

async function fetchFmpArray(
  endpoint: string,
  params: Record<string, string | number | boolean>,
  forceRefresh: boolean,
) {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) throw new Error('fmp_api_key_not_configured');

  const url = new URL(`${FMP_STABLE_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  url.searchParams.set('apikey', apiKey);

  const response = await fmpQueuedFetch(url, {
    ...(forceRefresh ? { cache: 'no-store' as const } : { next: { revalidate: UNIVERSE_CACHE_SECONDS } }),
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`fmp_${endpoint}_http_${response.status}`);

  let payload: unknown;
  try {
    payload = body ? JSON.parse(body) : [];
  } catch {
    throw new Error(`fmp_${endpoint}_invalid_json`);
  }

  if (!Array.isArray(payload)) {
    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
    const message = normalized(record?.message ?? record?.error);
    if (message.includes('limit') || message.includes('quota')) throw new Error('fmp_category_scanner_rate_limited');
    throw new Error(`fmp_${endpoint}_unexpected_payload`);
  }

  return payload as Array<Record<string, unknown>>;
}

async function fetchUsUniverse(forceRefresh: boolean) {
  if (universeRequest && Date.now() < universeExpiresAt && (!forceRefresh || universeExpiresAt === Infinity)) return universeRequest;
  const request = Promise.allSettled(US_EXCHANGES.map(exchange => fetchFmpArray('company-screener', {
    exchange,
    country: 'US',
    isEtf: false,
    isFund: false,
    isActivelyTrading: true,
    limit: 10_000,
  }, forceRefresh))).then(groups => {
    const rows = normalizeUniverseRows(groups.flatMap(group => group.status === 'fulfilled' ? group.value : []));
    const missing = US_EXCHANGES.filter((_, index) => {
      const group = groups[index];
      return group.status === 'rejected' || group.value.length === 0;
    });
    if (!rows.length) {
      const failed = groups.find(group => group.status === 'rejected');
      throw new Error(failed?.status === 'rejected' ? safeError(failed.reason) : 'category_universe_unavailable');
    }
    const degradedReason = missing.length ? `partial_exchange_coverage:${missing.join(',')}` : null;
    universeExpiresAt = Date.now() + (degradedReason ? 60_000 : UNIVERSE_CACHE_SECONDS * 1000);
    return { rows, degradedReason };
  }).catch(error => {
    // Share a short failed request across callers instead of amplifying a 429.
    universeExpiresAt = Date.now() + 60_000;
    throw error;
  });
  universeRequest = request;
  universeExpiresAt = Infinity;
  return request;
}

function dividendYieldPercent(row: UniverseRow) {
  if (!row.lastAnnualDividend || row.lastAnnualDividend <= 0 || !row.price || row.price <= 0) return null;
  return Number(((row.lastAnnualDividend / row.price) * 100).toFixed(2));
}

function categoryMatch(category: Exclude<StockCategoryId, 'growth' | 'sharia'>, row: UniverseRow) {
  const sector = normalized(row.sector);
  const industry = normalized(row.industry);
  const name = normalized(row.name);

  if (category === 'energy') return sector === 'energy';
  if (category === 'banking') {
    return sector === 'financial services'
      && (/\bbank(?:s|ing)?\b/.test(industry) || /\bbank(?:corp|group|shares)?\b/.test(name));
  }
  if (category === 'defensive') {
    if (['consumer defensive', 'healthcare', 'utilities'].includes(sector)) return true;
    return sector === 'communication services' && /telecom|wireless|communication/.test(industry);
  }
  if (category === 'cyclical') {
    return ['consumer cyclical', 'industrials', 'basic materials', 'real estate'].includes(sector);
  }

  const yieldPercent = dividendYieldPercent(row);
  return yieldPercent !== null && yieldPercent >= 1.5;
}

function classificationReason(category: Exclude<StockCategoryId, 'growth' | 'sharia'>, row: UniverseRow) {
  if (category === 'dividend') {
    const yieldPercent = dividendYieldPercent(row);
    return yieldPercent === null ? 'Dividend data unavailable' : `Indicated dividend yield ${yieldPercent.toFixed(2)}%`;
  }
  if (category === 'banking') return row.industry ? `Banking industry: ${row.industry}` : 'Banking company classification';
  return row.sector ? `Sector: ${row.sector}` : 'Category classification';
}

function sortMatches(category: Exclude<StockCategoryId, 'growth' | 'sharia'>, rows: UniverseRow[]) {
  return rows.slice().sort((left, right) => {
    if (category === 'dividend') {
      const yieldDifference = (dividendYieldPercent(right) ?? -1) - (dividendYieldPercent(left) ?? -1);
      if (yieldDifference !== 0) return yieldDifference;
    }
    const marketCapDifference = (right.marketCap ?? -1) - (left.marketCap ?? -1);
    if (marketCapDifference !== 0) return marketCapDifference;
    const volumeDifference = (right.volume ?? -1) - (left.volume ?? -1);
    if (volumeDifference !== 0) return volumeDifference;
    return left.symbol.localeCompare(right.symbol);
  });
}

function quoteMap(quotes: TraderQuote[]) {
  return new Map(quotes.map(quote => [quote.symbol.toUpperCase(), quote]));
}

function mapUniverseItem(
  category: Exclude<StockCategoryId, 'growth' | 'sharia'>,
  row: UniverseRow,
  quote?: TraderQuote,
): StockCategoryScannerItem {
  const quotePrice = quote?.available ? finite(quote.price) : null;
  const price = quotePrice ?? row.price;
  const available = price !== null && price > 0;

  return {
    symbol: row.symbol,
    name: quote?.name || row.name,
    category,
    price,
    currency: quote?.currency || row.currency || 'USD',
    change: quote?.available ? finite(quote.change) : null,
    changePercent: quote?.available ? finite(quote.changePercent) : null,
    source: quotePrice !== null ? (quote?.source ?? 'market data') : 'Financial Modeling Prep Screener',
    delayed: quote?.delayed ?? true,
    available,
    quoteEnriched: Boolean(quote?.available),
    ...(!available ? { unavailableReason: quote?.unavailableReason ?? 'price_unavailable' } : {}),
    sector: row.sector,
    industry: row.industry,
    exchange: quote?.exchange ?? row.exchange,
    country: row.country,
    marketCap: finite(quote?.marketCap) ?? row.marketCap,
    volume: row.volume,
    beta: row.beta,
    lastAnnualDividend: row.lastAnnualDividend,
    dividendYieldPercent: dividendYieldPercent(row),
    revenueGrowthPercent: null,
    earningsGrowthPercent: null,
    operatingIncomeGrowthPercent: null,
    netIncomeGrowthPercent: null,
    growthPeriod: null,
    shariahStatus: null,
    shariahSource: null,
    shariahLastReviewedAt: null,
    classificationReason: classificationReason(category, row),
    screenBasis: 'dynamic_market_screener',
  };
}

async function dynamicUsScanner(
  category: Exclude<StockCategoryId, 'growth' | 'sharia'>,
  options: ScanOptions,
): Promise<StockCategoryScannerResult> {
  const limit = normalizeLimit(options.limit);
  const { rows: universe, degradedReason } = await fetchUsUniverse(Boolean(options.forceRefresh));
  const matches = sortMatches(category, universe.filter(row => categoryMatch(category, row)));
  const selected = matches.slice(0, limit);
  const quoteCandidates = selected.slice(0, MAX_QUOTE_ENRICHMENT);
  const quotes = quoteCandidates.length
    ? await fetchTraderQuotes(quoteCandidates.map(row => row.symbol), { includeHistory: false, includeNews: false }).catch(() => [])
    : [];
  const bySymbol = quoteMap(quotes);
  const items = selected.map(row => mapUniverseItem(category, row, bySymbol.get(row.symbol)));

  return {
    category,
    mode: 'dynamic_market_screener',
    source: 'Financial Modeling Prep US universe + market quote providers',
    updatedAt: new Date().toISOString(),
    universeCount: universe.length,
    matchedCount: matches.length,
    returnedCount: items.length,
    availableCount: items.filter(item => item.available).length,
    quoteEnrichedCount: quoteCandidates.filter(row => bySymbol.get(row.symbol)?.available).length,
    criteria: CRITERIA[category],
    degradedReason,
    items,
  };
}

function mapGrowthResult(limit: number, result: Awaited<ReturnType<typeof screenGrowthStocks>>): StockCategoryScannerResult {
  const items: StockCategoryScannerItem[] = result.items.slice(0, limit).map(item => ({
    symbol: item.symbol,
    name: item.name,
    category: 'growth',
    price: item.price,
    currency: item.currency,
    change: item.change,
    changePercent: item.changePercent,
    source: item.source,
    delayed: item.delayed,
    available: item.available,
    ...(item.unavailableReason ? { unavailableReason: item.unavailableReason } : {}),
    sector: item.sector,
    industry: item.industry,
    exchange: item.exchange,
    country: 'US',
    marketCap: item.marketCap,
    volume: null,
    beta: null,
    lastAnnualDividend: null,
    dividendYieldPercent: null,
    revenueGrowthPercent: item.revenueGrowthPercent,
    earningsGrowthPercent: item.earningsGrowthPercent,
    operatingIncomeGrowthPercent: item.operatingIncomeGrowthPercent,
    netIncomeGrowthPercent: item.netIncomeGrowthPercent,
    growthPeriod: item.growthPeriod,
    shariahStatus: null,
    shariahSource: null,
    shariahLastReviewedAt: null,
    classificationReason: item.growthPeriod ? `Fundamental growth screen · ${item.growthPeriod}` : 'Growth fallback watchlist',
    screenBasis: result.mode === 'fundamental_screener' ? 'fundamental_growth_screener' : 'fallback_watchlist',
  }));

  return {
    category: 'growth',
    mode: result.mode === 'fundamental_screener' ? 'fundamental_growth_screener' : 'fallback_watchlist',
    source: result.source,
    updatedAt: result.updatedAt,
    universeCount: result.universeCount,
    matchedCount: result.matchedCount,
    returnedCount: items.length,
    availableCount: items.filter(item => item.available).length,
    quoteEnrichedCount: items.filter(item => item.changePercent !== null).length,
    criteria: { ...result.criteria, screeningPeriods: result.periods },
    degradedReason: result.degradedReason,
    items,
  };
}

type ShariaCatalogRow = {
  symbol?: string | null;
  name?: string | null;
  asset_type?: string | null;
  exchange?: string | null;
  sector?: string | null;
  country?: string | null;
  currency?: string | null;
  shariah_status?: string | null;
  shariah_source?: string | null;
  shariah_reason?: string | null;
  shariah_last_reviewed_at?: string | null;
};

async function shariaScanner(options: ScanOptions): Promise<StockCategoryScannerResult> {
  const limit = normalizeLimit(options.limit);
  const admin = createServerSupabaseAdmin();
  if (!admin) return fallbackWatchlist('sharia', 'screening_storage_unavailable', limit);

  const rows: ShariaCatalogRow[] = [];
  for (let offset = 0; rows.length < MAX_RESULTS; offset += 1000) {
    const result = await admin.from('market_symbols')
      .select('symbol,name,asset_type,exchange,sector,country,currency,shariah_status,shariah_source,shariah_reason,shariah_last_reviewed_at')
      .eq('is_active', true)
      .in('asset_type', ['stock', 'etf'])
      .order('symbol')
      .range(offset, offset + 999);
    if (result.error) throw new Error('sharia_catalog_read_failed');
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) break;
  }

  const statusRank: Record<string, number> = { compliant: 0, needs_review: 1, unclassified: 2, non_compliant: 3 };
  const normalizedRows = rows
    .map(row => ({ ...row, symbol: text(row.symbol).toUpperCase(), name: text(row.name) || text(row.symbol) }))
    .filter(row => validSymbol(row.symbol))
    .sort((left, right) => (statusRank[text(left.shariah_status)] ?? 9) - (statusRank[text(right.shariah_status)] ?? 9) || left.symbol.localeCompare(right.symbol));
  const selected = normalizedRows.slice(0, limit);
  const quoteCandidates = selected.slice(0, MAX_QUOTE_ENRICHMENT);
  const quotes = quoteCandidates.length
    ? await fetchTraderQuotes(quoteCandidates.map(row => row.symbol), { includeHistory: false, includeNews: false }).catch(() => [])
    : [];
  const bySymbol = quoteMap(quotes);

  const items: StockCategoryScannerItem[] = selected.map(row => {
    const quote = bySymbol.get(row.symbol);
    const price = quote?.available ? finite(quote.price) : null;
    return {
      symbol: row.symbol,
      name: quote?.name || row.name,
      category: 'sharia',
      price,
      currency: quote?.currency || text(row.currency) || 'USD',
      change: quote?.available ? finite(quote.change) : null,
      changePercent: quote?.available ? finite(quote.changePercent) : null,
      source: quote?.source ?? 'SFM Sharia screening catalog',
      delayed: quote?.delayed ?? true,
      available: Boolean(quote?.available && price !== null && price > 0),
      ...(!quote?.available ? { unavailableReason: quote?.unavailableReason ?? 'quote_not_enriched' } : {}),
      sector: text(row.sector) || null,
      industry: null,
      exchange: quote?.exchange ?? (text(row.exchange) || null),
      country: text(row.country) || null,
      marketCap: finite(quote?.marketCap),
      volume: null,
      beta: null,
      lastAnnualDividend: null,
      dividendYieldPercent: null,
      revenueGrowthPercent: null,
      earningsGrowthPercent: null,
      operatingIncomeGrowthPercent: null,
      netIncomeGrowthPercent: null,
      growthPeriod: null,
      shariahStatus: text(row.shariah_status) || 'unclassified',
      shariahSource: text(row.shariah_source) || null,
      shariahLastReviewedAt: text(row.shariah_last_reviewed_at) || null,
      classificationReason: text(row.shariah_reason) || 'Persisted SFM screening status',
      screenBasis: 'shariah_catalog',
    };
  });

  return {
    category: 'sharia',
    mode: 'shariah_catalog',
    source: 'SFM persisted Sharia screening catalog + market quote providers',
    updatedAt: new Date().toISOString(),
    universeCount: rows.length,
    matchedCount: normalizedRows.length,
    returnedCount: items.length,
    availableCount: items.filter(item => item.available).length,
    quoteEnrichedCount: items.filter(item => item.changePercent !== null).length,
    criteria: {
      universe: 'All active stock/ETF rows persisted in market_symbols',
      methodology: 'Use persisted SFM screening status; never infer compliance from sector or price',
    },
    degradedReason: null,
    items,
  };
}

async function fallbackWatchlist(category: StockCategoryId, reason: string, requestedLimit: number): Promise<StockCategoryScannerResult> {
  const watchlist = (getStockCategoryConfig(category)?.watchlist ?? []).slice(0, requestedLimit);
  const quotes = watchlist.length
    ? await fetchTraderQuotes(watchlist.map(stock => stock.symbol), { includeHistory: false, includeNews: false }).catch(() => [])
    : [];
  const bySymbol = quoteMap(quotes);
  const items: StockCategoryScannerItem[] = watchlist.map(stock => {
    const quote = bySymbol.get(stock.symbol.toUpperCase());
    const price = quote?.available ? finite(quote.price) : null;
    return {
      symbol: stock.symbol,
      name: quote?.name || stock.name,
      category,
      price,
      currency: quote?.currency || 'USD',
      change: quote?.available ? finite(quote.change) : null,
      changePercent: quote?.available ? finite(quote.changePercent) : null,
      source: quote?.source ?? 'configured category fallback',
      delayed: quote?.delayed ?? true,
      available: Boolean(quote?.available && price !== null && price > 0),
      ...(!quote?.available ? { unavailableReason: quote?.unavailableReason ?? reason } : {}),
      sector: stock.filter,
      industry: null,
      exchange: quote?.exchange ?? null,
      country: 'US',
      marketCap: finite(quote?.marketCap),
      volume: null,
      beta: null,
      lastAnnualDividend: null,
      dividendYieldPercent: null,
      revenueGrowthPercent: null,
      earningsGrowthPercent: null,
      operatingIncomeGrowthPercent: null,
      netIncomeGrowthPercent: null,
      growthPeriod: null,
      shariahStatus: null,
      shariahSource: null,
      shariahLastReviewedAt: null,
      classificationReason: 'Configured fallback watchlist',
      screenBasis: 'fallback_watchlist',
    };
  });

  return {
    category,
    mode: 'fallback_watchlist',
    source: 'configured category fallback + market quote providers',
    updatedAt: new Date().toISOString(),
    universeCount: watchlist.length,
    matchedCount: watchlist.length,
    returnedCount: items.length,
    availableCount: items.filter(item => item.available).length,
    quoteEnrichedCount: items.filter(item => item.changePercent !== null).length,
    criteria: { fallback: true },
    degradedReason: reason,
    items,
  };
}

async function loadStockCategory(category: StockCategoryId, options: ScanOptions = {}): Promise<StockCategoryScannerResult> {
  const limit = normalizeLimit(options.limit);

  if (category === 'growth') {
    try {
      return mapGrowthResult(limit, await screenGrowthStocks());
    } catch (error) {
      return fallbackWatchlist(category, safeError(error), limit);
    }
  }

  if (category === 'sharia') {
    try {
      return await shariaScanner({ ...options, limit });
    } catch (error) {
      return fallbackWatchlist(category, safeError(error), limit);
    }
  }

  try {
    return await dynamicUsScanner(category, { ...options, limit });
  } catch (error) {
    return fallbackWatchlist(category, safeError(error), limit);
  }
}

export async function screenStockCategory(category: StockCategoryId, options: ScanOptions = {}): Promise<StockCategoryScannerResult> {
  const cached = scans.get(category);
  let request = cached && cached.expiresAt > Date.now() && (!options.forceRefresh || cached.expiresAt === Infinity) ? cached.request : null;
  if (!request) {
    request = loadStockCategory(category, { ...options, limit: MAX_RESULTS });
    const entry = { request, expiresAt: Number.POSITIVE_INFINITY };
    // Ticker, scanner, news and movers share one bounded scan per category.
    scans.set(category, entry);
    void request.then(result => {
      entry.expiresAt = Date.now() + (result.degradedReason ? 60_000 : 300_000);
    }, () => { if (scans.get(category) === entry) scans.delete(category); });
  }
  const result = await request;
  const items = result.items.slice(0, normalizeLimit(options.limit));
  return { ...result, items, returnedCount: items.length, availableCount: items.filter(item => item.available).length,
    quoteEnrichedCount: items.filter(item => item.quoteEnriched ?? item.changePercent !== null).length };
}
