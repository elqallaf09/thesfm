import { DEFENSIVE_STOCKS } from '@/lib/market/defensiveStocks';

export type DefensiveMoverItem = {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  currency: string;
  changePercent: number | null;
  volume: number | null;
};

export type DefensiveMoversData = {
  topGainers: DefensiveMoverItem[];
  topLosers: DefensiveMoverItem[];
  highestPrice: DefensiveMoverItem[];
  lowestPrice: DefensiveMoverItem[];
  highestVolume: DefensiveMoverItem[];
  lowestVolume: DefensiveMoverItem[];
};

export type DefensiveMoversResponse =
  | {
    ok: true;
    updated_at: string;
    source: 'Yahoo Finance';
    data: DefensiveMoversData;
    warnings?: string[];
  }
  | {
    ok: false;
    code: 'DEFENSIVE_MOVERS_UNAVAILABLE';
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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function configuredName(symbol: string) {
  return DEFENSIVE_STOCKS.find(stock => stock.symbol === symbol)?.name ?? symbol;
}

function normalizeQuoteRow(row: YahooQuoteRow) {
  const symbol = String(row.symbol ?? '').toUpperCase();
  const price = finiteNumber(row.regularMarketPrice);
  if (!symbol || price === null || price <= 0) return null;
  return {
    symbol,
    name: row.longName ?? row.shortName ?? configuredName(symbol),
    price,
    currency: String(row.currency ?? 'USD').toUpperCase(),
    changePercent: finiteNumber(row.regularMarketChangePercent),
    volume: finiteNumber(row.regularMarketVolume),
  };
}

function normalizeChartRow(symbol: string, meta: NonNullable<NonNullable<YahooChartResponse['chart']>['result']>[number]['meta']) {
  const price = finiteNumber(meta?.regularMarketPrice);
  if (price === null || price <= 0) return null;
  const previousClose = finiteNumber(meta?.chartPreviousClose) ?? finiteNumber(meta?.previousClose);
  const changePercent = previousClose && previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : null;
  return {
    symbol,
    name: meta?.longName ?? meta?.shortName ?? configuredName(symbol),
    price,
    currency: String(meta?.currency ?? 'USD').toUpperCase(),
    changePercent,
    volume: finiteNumber(meta?.regularMarketVolume),
  };
}

async function fetchYahooChartRow(symbol: string) {
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
  return normalizeChartRow(symbol, payload?.chart?.result?.[0]?.meta);
}

async function fetchYahooRows() {
  const symbols = DEFENSIVE_STOCKS.map(stock => stock.symbol);
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
        .map(normalizeQuoteRow)
        .filter((row): row is Omit<DefensiveMoverItem, 'rank'> => Boolean(row));
      if (rows.length > 0) return rows;
    }
  } catch {
    // Chart fallback is used when Yahoo quote returns an empty or blocked response.
  }

  const settled = await Promise.allSettled(symbols.map(symbol => fetchYahooChartRow(symbol)));
  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((row): row is Omit<DefensiveMoverItem, 'rank'> => Boolean(row));
}

function ranked(
  rows: Array<Omit<DefensiveMoverItem, 'rank'>>,
  sorter: (a: Omit<DefensiveMoverItem, 'rank'>, b: Omit<DefensiveMoverItem, 'rank'>) => number,
  limit: number,
) {
  return rows
    .slice()
    .sort(sorter)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankedByNullable(
  rows: Array<Omit<DefensiveMoverItem, 'rank'>>,
  selector: (row: Omit<DefensiveMoverItem, 'rank'>) => number | null,
  direction: 'asc' | 'desc',
  limit: number,
) {
  return ranked(
    rows.filter(row => selector(row) !== null),
    (a, b) => {
      const left = selector(a) ?? 0;
      const right = selector(b) ?? 0;
      return direction === 'asc' ? left - right : right - left;
    },
    limit,
  );
}

function buildMoversData(rows: Array<Omit<DefensiveMoverItem, 'rank'>>, limit: number): DefensiveMoversData {
  return {
    topGainers: rankedByNullable(rows, row => row.changePercent, 'desc', limit).filter(row => (row.changePercent ?? 0) > 0),
    topLosers: rankedByNullable(rows, row => row.changePercent, 'asc', limit).filter(row => (row.changePercent ?? 0) < 0),
    highestPrice: ranked(rows, (a, b) => b.price - a.price, limit),
    lowestPrice: ranked(rows, (a, b) => a.price - b.price, limit),
    highestVolume: rankedByNullable(rows, row => row.volume, 'desc', limit),
    lowestVolume: rankedByNullable(rows, row => row.volume, 'asc', limit),
  };
}

function hasAnyMoverData(data: DefensiveMoversData) {
  return Object.values(data).some(list => list.length > 0);
}

export async function fetchDefensiveStockMovers(limitInput = 5): Promise<DefensiveMoversResponse> {
  const limit = Math.max(1, Math.min(5, Math.floor(limitInput)));
  try {
    const rows = await fetchYahooRows();
    const data = buildMoversData(rows, limit);
    if (!hasAnyMoverData(data)) {
      return {
        ok: false,
        code: 'DEFENSIVE_MOVERS_UNAVAILABLE',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      };
    }
    return {
      ok: true,
      updated_at: new Date().toISOString(),
      source: 'Yahoo Finance',
      data,
      warnings: rows.length < limit ? ['provider_returned_limited_rows'] : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DefensiveStockMovers] Failed to fetch movers', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: false,
      code: 'DEFENSIVE_MOVERS_UNAVAILABLE',
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
    };
  }
}
