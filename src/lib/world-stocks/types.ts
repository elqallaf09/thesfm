import type { MarketAssetType } from '@/lib/market/marketService';

export type WorldStockAssetType = Extract<MarketAssetType, 'stock' | 'etf'>;

/** Metadata (identity/profile) and quote (live price) availability are tracked
 * separately: a symbol can have verified metadata with no fetched quote yet
 * (list/browse view before a quote request), or -- less commonly -- a quote
 * with incomplete profile metadata. Neither implies the other. */
export type WorldStockMetadataStatus = 'available' | 'unavailable';
export type WorldStockQuoteStatus = 'available' | 'unavailable' | 'not_fetched';

/** Normalized, server-side World Stock record. Every field preserves
 * provenance: nothing here is inferred from the symbol string when the
 * underlying provider/catalog did not supply it -- see normalize.ts. */
export type WorldStock = {
  canonicalSymbol: string;
  providerSymbol: string;
  displayName: string;
  exchangeCode: string;
  exchangeName: string;
  countryCode: string | null;
  countryName: string | null;
  region: string;
  currency: string | null;
  sector: string | null;
  industry: string | null;
  assetType: WorldStockAssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  quoteTimestamp: string | null;
  delayed: boolean;
  dataSource: string | null;
  logoKey: string;
  metadataStatus: WorldStockMetadataStatus;
  quoteStatus: WorldStockQuoteStatus;
};

export type WorldStockSearchResponse = {
  ok: true;
  success: true;
  query: string;
  region: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  source: string;
  results: WorldStock[];
} | {
  ok: false;
  success: false;
  code: 'invalid_query' | 'provider_temporarily_unavailable';
  message: string;
};

export type WorldStockQuotesResponse = {
  ok: true;
  success: true;
  quotes: Record<string, WorldStockQuote>;
  partialFailure: boolean;
} | {
  ok: false;
  success: false;
  code: 'invalid_request' | 'provider_temporarily_unavailable';
  message: string;
};

export type WorldStockQuote = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  quoteTimestamp: string | null;
  delayed: boolean;
  dataSource: string | null;
  status: WorldStockQuoteStatus;
};
