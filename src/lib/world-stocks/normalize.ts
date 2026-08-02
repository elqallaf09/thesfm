import type { MarketSearchItem } from '@/lib/market/marketService';
import type { MarketSymbolSearchResult } from '@/lib/market/marketSymbolDirectory';
import { getMarketExchangeOption, normalizeMarketExchange } from '@/lib/market/marketExchangeOptions';
import type { WorldStock, WorldStockAssetType } from './types';

const COUNTRY_NAMES: Record<string, { ar: string; en: string; fr: string }> = {
  KW: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
  AE: { ar: 'الإمارات العربية المتحدة', en: 'United Arab Emirates', fr: 'Émirats arabes unis' },
  US: { ar: 'الولايات المتحدة', en: 'United States', fr: 'États-Unis' },
};

export function worldStockCountryName(countryCode: string | null, locale: 'ar' | 'en' | 'fr'): string | null {
  if (!countryCode) return null;
  const entry = COUNTRY_NAMES[countryCode.toUpperCase()];
  if (!entry) return countryCode;
  return entry[locale];
}

/** World Stocks is an equities/ETF discovery workspace, not an all-asset-class
 * search -- crypto, forex, commodity, gold, and index results are filtered
 * out by the caller before this ever runs (see search.ts). */
function toWorldStockAssetType(assetType: MarketSearchItem['assetType']): WorldStockAssetType | null {
  return assetType === 'stock' || assetType === 'etf' ? assetType : null;
}

/**
 * MarketSearchItem (from the bundled directory, Supabase market_symbols, or
 * the live US symbol universe) never carries a live price -- that only
 * exists once a quote has actually been fetched for this item (see
 * quotes.ts, which fills price/change/changePercent/quoteTimestamp in
 * afterward for the current page only). Until then quoteStatus is
 * 'not_fetched', never 'unavailable' -- unavailable means a quote was
 * genuinely attempted and failed, not merely "not requested yet".
 */
export function marketSearchItemToWorldStock(item: MarketSearchItem | MarketSymbolSearchResult, locale: 'ar' | 'en' | 'fr'): WorldStock | null {
  const assetType = toWorldStockAssetType(item.assetType);
  if (!assetType) return null;

  const exchangeId = normalizeMarketExchange(item.exchange) ?? normalizeMarketExchange((item as MarketSymbolSearchResult).exchangeId);
  const exchangeOption = getMarketExchangeOption(exchangeId);
  const countryCode = item.country ?? exchangeOption?.country ?? null;

  return {
    canonicalSymbol: String(item.symbol ?? '').toUpperCase(),
    providerSymbol: String(item.providerSymbol ?? item.symbol ?? '').toUpperCase(),
    displayName: item.name || item.symbol,
    exchangeCode: exchangeId ?? item.exchange ?? '',
    exchangeName: exchangeOption
      ? (locale === 'ar' ? exchangeOption.labelAr : exchangeOption.labelEn)
      : (item.exchange ?? ''),
    countryCode,
    countryName: worldStockCountryName(countryCode, locale),
    region: exchangeId ?? 'US',
    currency: item.currency ?? exchangeOption?.currency ?? null,
    // Neither the bundled-directory nor the Supabase market_symbols search
    // path (see marketSymbolRecordToSearchItem / mapMarketSymbol) currently
    // carries sector/industry through into MarketSearchItem, even though
    // MarketSymbolRecord has a raw `sector` column -- so this is always
    // truthfully null today rather than silently dropped or guessed.
    sector: null,
    industry: null,
    assetType,
    price: null,
    change: null,
    changePercent: null,
    marketCap: null,
    quoteTimestamp: null,
    delayed: true,
    dataSource: (item as MarketSymbolSearchResult).source ?? null,
    logoKey: String(item.symbol ?? '').toUpperCase(),
    metadataStatus: 'available',
    quoteStatus: 'not_fetched',
  };
}
