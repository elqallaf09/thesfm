import { getStockCategoryConfig, type StockCategoryId, type StockCategoryStock } from '@/lib/market/stockCategoryConfigs';
import { finiteQuoteNumber, isValidChange, isValidPrice } from '@/lib/market/quoteNormalization';

export type StockCategoryMoverItem = {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  currency: string;
  changePercent: number | null;
  volume: number | null;
};

export type StockCategoryMoversData = {
  topGainers: StockCategoryMoverItem[];
  topLosers: StockCategoryMoverItem[];
  highestPrice: StockCategoryMoverItem[];
  lowestPrice: StockCategoryMoverItem[];
  highestVolume: StockCategoryMoverItem[];
  lowestVolume: StockCategoryMoverItem[];
};

export type StockCategoryMoversResponse =
  | {
    ok: true;
    category: StockCategoryId;
    updated_at: string;
    source: 'Yahoo Finance';
    data: StockCategoryMoversData;
    warnings?: string[];
  }
  | {
    ok: false;
    category: string;
    code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE' | 'UNSUPPORTED_STOCK_CATEGORY';
    updated_at: string | null;
    source: 'Yahoo Finance';
    data: null;
  };

type YahooQuoteRow = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: YahooQuoteRow[];
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketVolume?: number;
      };
    }>;
  };
};

function finiteNumber(value: unknown) {
  return finiteQuoteNumber(value);
}

function moverSymbolKey(row: Omit<StockCategoryMoverItem, 'rank'>) {
  return row.symbol.trim().toUpperCase();
}

function uniqueMoverRows(rows: Array<Omit<StockCategoryMoverItem, 'rank'>>) {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = moverSymbolKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function configuredName(stocks: StockCategoryStock[], symbol: string) {
  return stocks.find(stock => stock.symbol === symbol)?.name ?? symbol;
}

function normalizeQuoteRow(stocks: StockCategoryStock[], row: YahooQuoteRow) {
  const symbol = String(row.symbol ?? '').toUpperCase();
  const price = finiteNumber(row.regularMarketPrice);
  if (!symbol || !isValidPrice(price)) return null;
  return {
    symbol,
    name: row.longName ?? row.shortName ?? configuredName(stocks, symbol),
    price,
    currency: String(row.currency ?? 'USD').toUpperCase(),
    changePercent: finiteNumber(row.regularMarketChangePercent),
    volume: finiteNumber(row.regularMarketVolume),
  };
}

function normalizeChartRow(stocks: StockCategoryStock[], symbol: string, meta: NonNullable<NonNullable<YahooChartResponse['chart']>['result']>[number]['meta']) {
  const price = finiteNumber(meta?.regularMarketPrice);
  if (!isValidPrice(price)) return null;
  const previousClose = finiteNumber(meta?.chartPreviousClose) ?? finiteNumber(meta?.previousClose);
  const changePercent = previousClose && previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : null;
  return {
    symbol,
    name: meta?.longName ?? meta?.shortName ?? configuredName(stocks, symbol),
    price,
    currency: String(meta?.currency ?? 'USD').toUpperCase(),
    changePercent,
    volume: finiteNumber(meta?.regularMarketVolume),
  };
}

async function fetchYahooChartRow(stocks: StockCategoryStock[], symbol: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as YahooChartResponse | null;
  return normalizeChartRow(stocks, symbol, payload?.chart?.result?.[0]?.meta);
}

async function fetchYahooRows(stocks: StockCategoryStock[]) {
  const symbols = stocks.map(stock => stock.symbol);
  const params = new URLSearchParams({ symbols: symbols.join(',') });

  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
      headers: {
        accept: 'application/json',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
    });
    if (response.ok) {
      const payload = await response.json().catch(() => null) as YahooQuoteResponse | null;
      const rows = (payload?.quoteResponse?.result ?? [])
        .map(row => normalizeQuoteRow(stocks, row))
        .filter((row): row is Omit<StockCategoryMoverItem, 'rank'> => Boolean(row));
      if (rows.length > 0) return rows;
    }
  } catch {
    // Chart fallback is used when Yahoo quote returns an empty or blocked response.
  }

  const settled = await Promise.allSettled(symbols.map(symbol => fetchYahooChartRow(stocks, symbol)));
  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((row): row is Omit<StockCategoryMoverItem, 'rank'> => Boolean(row));
}

function ranked(
  rows: Array<Omit<StockCategoryMoverItem, 'rank'>>,
  sorter: (a: Omit<StockCategoryMoverItem, 'rank'>, b: Omit<StockCategoryMoverItem, 'rank'>) => number,
  limit: number,
) {
  return rows
    .slice()
    .sort(sorter)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankedByNullable(
  rows: Array<Omit<StockCategoryMoverItem, 'rank'>>,
  selector: (row: Omit<StockCategoryMoverItem, 'rank'>) => number | null,
  direction: 'asc' | 'desc',
  limit: number,
) {
  return ranked(
    rows.filter(row => finiteNumber(selector(row)) !== null),
    (a, b) => {
      const left = finiteNumber(selector(a)) ?? 0;
      const right = finiteNumber(selector(b)) ?? 0;
      return direction === 'asc' ? left - right : right - left;
    },
    limit,
  );
}

function rankedByChange(
  rows: Array<Omit<StockCategoryMoverItem, 'rank'>>,
  direction: 'asc' | 'desc',
  limit: number,
  excludedSymbols = new Set<string>(),
) {
  const candidates = rows.filter(row => {
    const key = moverSymbolKey(row);
    const changePercent = finiteNumber(row.changePercent);
    if (!key || excludedSymbols.has(key) || !isValidPrice(row.price) || !isValidChange(changePercent)) return false;
    return direction === 'desc' ? changePercent > 0 : changePercent < 0;
  });
  return ranked(
    candidates,
    (a, b) => {
      const left = finiteNumber(a.changePercent) ?? 0;
      const right = finiteNumber(b.changePercent) ?? 0;
      return direction === 'asc' ? left - right : right - left;
    },
    limit,
  );
}

function buildMoversData(rows: Array<Omit<StockCategoryMoverItem, 'rank'>>, limit: number): StockCategoryMoversData {
  const uniqueRows = uniqueMoverRows(rows);
  const topGainers = rankedByChange(uniqueRows, 'desc', limit);
  const gainerSymbols = new Set(topGainers.map(moverSymbolKey));
  const topLosers = rankedByChange(uniqueRows, 'asc', limit, gainerSymbols);

  return {
    topGainers,
    topLosers,
    highestPrice: ranked(uniqueRows, (a, b) => b.price - a.price, limit),
    lowestPrice: ranked(uniqueRows, (a, b) => a.price - b.price, limit),
    highestVolume: rankedByNullable(uniqueRows, row => row.volume, 'desc', limit),
    lowestVolume: rankedByNullable(uniqueRows, row => row.volume, 'asc', limit),
  };
}

function hasAnyMoverData(data: StockCategoryMoversData) {
  return Object.values(data).some(list => list.length > 0);
}

export async function fetchStockCategoryMovers(categoryInput: string | null | undefined, limitInput = 5): Promise<StockCategoryMoversResponse> {
  const config = getStockCategoryConfig(categoryInput);
  const category = String(categoryInput ?? '');
  const limit = Math.max(1, Math.min(5, Math.floor(limitInput)));

  if (!config) {
    return {
      ok: false,
      category,
      code: 'UNSUPPORTED_STOCK_CATEGORY',
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
    };
  }

  try {
    const rows = await fetchYahooRows(config.watchlist);
    const data = buildMoversData(rows, limit);
    if (!hasAnyMoverData(data)) {
      return {
        ok: false,
        category: config.id,
        code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      };
    }
    return {
      ok: true,
      category: config.id,
      updated_at: new Date().toISOString(),
      source: 'Yahoo Finance',
      data,
      warnings: rows.length < limit ? ['provider_returned_limited_rows'] : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StockCategoryMovers] Failed to fetch movers', {
        category: config.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: false,
      category: config.id,
      code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
    };
  }
}
