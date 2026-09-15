import type { GlobalMarketSector, GlobalMarketStripId, GlobalMarketStripKind } from './globalMarketStrips';
import type { TechStockPrice } from './fetchStockPrices';

export type GlobalDirectoryRow = {
  id: string;
  symbol: string;
  providerSymbol: string;
  name: string;
  nameAr?: string;
  localName?: string;
  sector?: GlobalMarketSector;
  countryCode: string | null;
  stripId: GlobalMarketStripId;
  kind: GlobalMarketStripKind;
  currency: string | null;
  priceUnit?: 'fils';
};

export type GlobalDirectoryCoverage = {
  stripId: GlobalMarketStripId;
  count: number;
  status: 'directory' | 'snapshot' | 'selected' | 'unavailable';
  source: string;
  asOf: string | null;
};

export type GlobalDirectoryPage = {
  success: true;
  items: GlobalDirectoryRow[];
  total: number;
  offset: number;
  nextOffset: number | null;
  coverage: GlobalDirectoryCoverage[];
};

export type GlobalDirectoryQuoteResponse = {
  success: true;
  prices: Record<string, TechStockPrice>;
};

export type GlobalDirectoryFilters = { query: string; country: string; exchange: string; sector: string; assetType: string };
export const EMPTY_DIRECTORY_FILTERS: GlobalDirectoryFilters = { query: '', country: 'all', exchange: 'all', sector: 'all', assetType: 'all' };
export const DIRECTORY_MAX_PAGE_SIZE = 24;
