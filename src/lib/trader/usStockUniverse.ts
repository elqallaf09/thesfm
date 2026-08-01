import { getBundledUsSymbolCatalog, type BundledUsSymbolRow } from '@/lib/server/usSymbolCatalog';
import type { TradableAsset } from '@/lib/trader/types';

const US_UNIVERSE_SYMBOLS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'GOOGL',
  'AMZN',
  'META',
  'TSLA',
  'AMD',
  'INTC',
  'NFLX',
  'CRM',
  'ORCL',
  'AVGO',
  'COST',
  'PLTR',
  'UNH',
  'LLY',
  'PFE',
  'JPM',
  'BAC',
] as const;

const SECTOR_BY_SYMBOL: Record<string, string> = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  GOOGL: 'Communication Services',
  AMZN: 'Consumer Discretionary',
  META: 'Communication Services',
  TSLA: 'Consumer Discretionary',
  AMD: 'Technology',
  INTC: 'Technology',
  NFLX: 'Communication Services',
  CRM: 'Technology',
  ORCL: 'Technology',
  AVGO: 'Technology',
  COST: 'Consumer Staples',
  PLTR: 'Technology',
  UNH: 'Healthcare',
  LLY: 'Healthcare',
  PFE: 'Healthcare',
  JPM: 'Financials',
  BAC: 'Financials',
};

const INDUSTRY_BY_SYMBOL: Record<string, string> = {
  AAPL: 'Consumer Electronics',
  MSFT: 'Software',
  NVDA: 'Semiconductors',
  GOOGL: 'Internet Content',
  AMZN: 'Online Retail',
  META: 'Social Platforms',
  TSLA: 'Automobiles',
  AMD: 'Semiconductors',
  INTC: 'Semiconductors',
  NFLX: 'Streaming Media',
  CRM: 'Cloud Software',
  ORCL: 'Enterprise Software',
  AVGO: 'Semiconductors',
  COST: 'Retail',
  PLTR: 'Data Analytics',
  UNH: 'Managed Healthcare',
  LLY: 'Pharmaceuticals',
  PFE: 'Pharmaceuticals',
  JPM: 'Banking',
  BAC: 'Banking',
};

function normalizeAsset(symbol: string, directory: ReadonlyMap<string, BundledUsSymbolRow>): TradableAsset {
  const directoryRow = directory.get(symbol);
  return {
    symbol,
    providerSymbol: directoryRow?.providerSymbol || symbol,
    name: directoryRow?.name || symbol,
    exchange: directoryRow?.exchange || null,
    market: 'US',
    currency: directoryRow?.currency || 'USD',
    sector: SECTOR_BY_SYMBOL[symbol] || null,
    industry: INDUSTRY_BY_SYMBOL[symbol] || null,
    logoUrl: null,
    active: true,
  };
}

export async function getUsStockUniverse(symbols?: string[]) {
  const catalog = await getBundledUsSymbolCatalog();
  const requested = Array.isArray(symbols) && symbols.length > 0
    ? symbols
    : Array.from(catalog.bySymbol.entries())
        .filter(([, row]) => row.country === 'US')
        .map(([symbol]) => symbol);
  const seen = new Set<string>();

  return requested
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .map(symbol => normalizeAsset(symbol, catalog.bySymbol));
}
