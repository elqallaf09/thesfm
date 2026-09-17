import type { CanonicalAssetIdentity } from './contracts';

/** Quote-only evidence: no generated recommendations, targets or indicators. */
export type AssetDetailsQuote = {
  price: number;
  currency: string | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  source: string;
  observedAt: string | null;
  delay: 'realtime' | 'delayed' | 'eod' | 'cached' | 'unknown';
};
export type AssetDetailsResponse = {
  ok: true;
  asset: CanonicalAssetIdentity;
  quote: AssetDetailsQuote | null;
  quoteStatus: 'available' | 'unavailable';
  fetchedAt: string;
  correlationId: string;
};
