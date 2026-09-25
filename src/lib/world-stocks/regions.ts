import { MARKET_EXCHANGE_OPTIONS, type MarketExchangeId, type MarketExchangeOption } from '@/lib/market/marketExchangeOptions';

/** A World Stocks "region" is one real, currently-syncable exchange. This
 * intentionally does not group Kuwait/UAE under a "GCC" umbrella label.
 * Tadawul, ADX, QSE, Bahrain Bourse and Muscat remain excluded until their
 * official directories are synchronized. The checked-in official directory
 * snapshot also includes Shanghai and Shenzhen, while the US directory is
 * fetched from Nasdaq Trader. Every result is paginated; the browser never
 * receives the whole universe in one response. */
export type WorldStockRegion = {
  id: string;
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
  SSE: 'Bourse de Shanghai',
  SZSE: 'Bourse de Shenzhen',
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

export function isSupportedWorldStockRegion(value: unknown): value is string {
  return typeof value === 'string' && (REGION_BY_ID.has(value) || /^TD_[A-Z0-9]{4}$/.test(value));
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
