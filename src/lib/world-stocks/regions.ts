import { MARKET_EXCHANGE_OPTIONS, type MarketExchangeId, type MarketExchangeOption } from '@/lib/market/marketExchangeOptions';

/** A World Stocks "region" is one real, currently-syncable exchange. This
 * intentionally does not group Kuwait/UAE under a "GCC" umbrella label --
 * scripts/sync-market-symbols.mjs only fetches Boursa Kuwait and DFM; Tadawul
 * (Saudi), ADX, QSE, Bahrain Bourse, and Muscat are labeled in
 * marketExchangeOptions.ts (coverage: 'requires_sync') but have no real sync
 * pipeline or bundled data anywhere in this repo. Presenting a "GCC" region
 * that silently includes exchanges with zero real listings would violate the
 * "never claim coverage beyond what's actually supported" requirement, so
 * those five stay excluded here entirely -- not hidden behind a truthful
 * empty state, simply not offered as a selectable region at all. */
export type WorldStockRegion = {
  id: MarketExchangeId;
  labelAr: string;
  labelEn: string;
  labelFr: string;
  countryCode: string;
  currency: string;
};

const FR_LABELS: Partial<Record<MarketExchangeId, string>> = {
  BOURSA_KUWAIT: 'Bourse du Koweït',
  DFM: 'Marché financier de Dubaï',
  NASDAQ_DUBAI: 'Nasdaq Dubaï',
  US: 'Marchés américains',
};

function isSupported(option: MarketExchangeOption) {
  return option.coverage !== 'requires_sync';
}

export const WORLD_STOCK_REGIONS: WorldStockRegion[] = MARKET_EXCHANGE_OPTIONS
  .filter(isSupported)
  .map(option => ({
    id: option.id,
    labelAr: option.labelAr,
    labelEn: option.labelEn,
    labelFr: FR_LABELS[option.id] ?? option.labelEn,
    countryCode: option.country,
    currency: option.currency,
  }));

const REGION_BY_ID = new Map(WORLD_STOCK_REGIONS.map(region => [region.id, region]));

export function isSupportedWorldStockRegion(value: unknown): value is MarketExchangeId {
  return typeof value === 'string' && REGION_BY_ID.has(value as MarketExchangeId);
}

export function worldStockRegion(id: MarketExchangeId) {
  return REGION_BY_ID.get(id) ?? null;
}

export function worldStockRegionLabel(id: string, locale: 'ar' | 'en' | 'fr') {
  const region = REGION_BY_ID.get(id as MarketExchangeId);
  if (!region) return id;
  if (locale === 'ar') return region.labelAr;
  if (locale === 'fr') return region.labelFr;
  return region.labelEn;
}
