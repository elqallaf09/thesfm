/**
 * Shared, reusable ticker logic for every market/category ticker route.
 *
 * The golden rule: a ticker strip must NEVER collapse to an empty container just
 * because live quote data is missing. Each configured symbol is always returned
 * as a card; when its quote is unavailable the card carries `available: false`
 * and null price fields so the UI can render an "unavailable" (غير متاح) state
 * instead of hiding the whole strip.
 */

export const TICKER_FALLBACK_SOURCE = 'market_data';

export type ResilientTickerPrice = {
  price: number | null;
  changePercent: number | null;
  change: number | null;
  source: string;
  delayed?: boolean;
  available: boolean;
  unavailableReason?: string;
};

export function isUsableMarketPrice(
  price: ResilientTickerPrice | undefined,
): price is ResilientTickerPrice & { price: number } {
  return Boolean(
    price?.available &&
      price.price !== null &&
      Number.isFinite(price.price) &&
      price.price > 0 &&
      price.source,
  );
}

export type ResilientTickerItem = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available: boolean;
  unavailableReason?: string;
};

/**
 * Map a watchlist entry + its (possibly missing) quote into a ticker item that is
 * always present. Extra per-category fields (sector, market, dividend metrics, …)
 * can be merged into the returned object by the caller.
 */
export function toResilientTickerItem(
  stock: { symbol: string; name: string },
  price: ResilientTickerPrice | undefined,
  options: { currency?: string; fallbackSource?: string } = {},
): ResilientTickerItem {
  const { currency = 'USD', fallbackSource = TICKER_FALLBACK_SOURCE } = options;
  const available = isUsableMarketPrice(price);
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: available ? price.price : null,
    currency,
    change: available ? price.change : null,
    changePercent: available ? price.changePercent : null,
    source: price?.source ?? fallbackSource,
    delayed: price?.delayed ?? true,
    available,
    unavailableReason: available ? undefined : price?.unavailableReason ?? 'provider_returned_empty_quote',
  };
}
