import usSymbols from '@/data/us-symbols.json';
import type { TradableAsset } from '@/lib/trader/types';

type SymbolDirectoryRow = {
  symbol?: string;
  providerSymbol?: string;
  name?: string;
  assetType?: string;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
};

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

const directory = new Map(
  (usSymbols as SymbolDirectoryRow[])
    .filter((row) => row.symbol && row.country === 'US')
    .map((row) => [String(row.symbol).toUpperCase(), row]),
);

function normalizeAsset(symbol: string): TradableAsset {
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

export function getUsStockUniverse(symbols?: string[]) {
  const requested = Array.isArray(symbols) && symbols.length > 0
    ? symbols
    : [...US_UNIVERSE_SYMBOLS];
  const seen = new Set<string>();

  return requested
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .slice(0, 30)
    .map(normalizeAsset);
}
