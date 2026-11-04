import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
import type { TvInstrument } from './selections';
import type { TvMarket, TvSettings } from './types';

export function selectedTvMarkets(markets: TvMarket[], settings: TvSettings): string[] {
  const available = new Set(markets.map(market => market.id));
  return settings.marketIds?.filter(id => available.has(id)) ?? markets
    .filter(market => settings.groups.includes('world') || settings.groups.includes(market.group))
    .map(market => market.id);
}

export function moveTvMarket(order: string[], id: string, direction: -1 | 1): string[] {
  const index = order.indexOf(id), destination = index + direction;
  if (index < 0 || destination < 0 || destination >= order.length) return order;
  const next = [...order];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function matchesTvSearch(query: string, ...values: (string | undefined)[]) {
  const normalize = (value: string) => normalizeAssetSearchText(value.normalize('NFKD').replace(/\p{M}/gu, ''));
  return normalize(values.filter(Boolean).join(' ')).includes(normalize(query.trim()));
}

/** Saved symbols remain removable even before their directory page is loaded. */
export function selectedTvInstruments(symbols: string[], known: Record<string, TvInstrument>, query: string) {
  return symbols.map(symbol => Object.prototype.hasOwnProperty.call(known, symbol) ? known[symbol] : { symbol, name: symbol })
    .filter(item => matchesTvSearch(query, item.symbol, item.displaySymbol, item.name, item.nameAr));
}
