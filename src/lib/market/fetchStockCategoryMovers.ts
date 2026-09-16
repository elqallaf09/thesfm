import { getStockCategoryConfig, type StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import { finiteQuoteNumber, isValidChange, isValidPrice } from '@/lib/market/quoteNormalization';
import { screenStockCategory } from '@/lib/market/stockCategoryScanner';

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
    source: string;
    data: StockCategoryMoversData;
    warnings?: string[];
  }
  | {
    ok: false;
    category: string;
    code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE' | 'UNSUPPORTED_STOCK_CATEGORY';
    updated_at: string | null;
    source: string;
    data: null;
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
      source: 'SFM category scanner',
      data: null,
    };
  }

  try {
    const scan = await screenStockCategory(config.id, { limit: 300 });
    const rows = scan.items
      .filter(item => item.available && isValidPrice(item.price))
      .map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price as number,
        currency: item.currency,
        changePercent: finiteNumber(item.changePercent),
        volume: finiteNumber(item.volume),
      }));
    const data = buildMoversData(rows, limit);

    if (!hasAnyMoverData(data)) {
      return {
        ok: false,
        category: config.id,
        code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
        updated_at: scan.updatedAt,
        source: scan.source,
        data: null,
      };
    }

    const warnings: string[] = [];
    if (scan.mode === 'fallback_watchlist') warnings.push('scanner_degraded_to_configured_watchlist');
    if (scan.quoteEnrichedCount < Math.min(scan.returnedCount, 20)) warnings.push('limited_live_quote_coverage');

    return {
      ok: true,
      category: config.id,
      updated_at: scan.updatedAt,
      source: scan.source,
      data,
      warnings: warnings.length ? warnings : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StockCategoryMovers] Scanner failed', {
        category: config.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: false,
      category: config.id,
      code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
      updated_at: null,
      source: 'SFM category scanner',
      data: null,
    };
  }
}
