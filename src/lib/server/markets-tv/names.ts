import 'server-only';
import { listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import type { TvAsset } from './catalog';

// Use existing identity metadata, scoped by exchange; never translate a price feed.
const arabicNames = new Map<string, string>();
for (const strip of GLOBAL_MARKET_STRIPS) for (const item of strip.items) {
  if (item.nameAr) arabicNames.set(`${strip.exchangeCode}:${item.symbol}`, item.nameAr);
}
for (const item of listBundledMarketSymbols({ limit: 10000 })) {
  if (item.companyNameAr && /[\u0600-\u06ff]/.test(item.companyNameAr)) arabicNames.set(`${item.exchangeId || item.exchange}:${item.providerSymbol || item.symbol}`, item.companyNameAr);
}
export function localizeTvAsset<T extends TvAsset>(asset: T): T {
  const nameAr = asset.nameAr && /[\u0600-\u06ff]/.test(asset.nameAr) ? asset.nameAr : arabicNames.get(`${asset.region}:${asset.symbol}`);
  const displaySymbol = ['BOURSA_KUWAIT','DFM','SSE','SZSE'].includes(asset.region || '') ? asset.symbol.replace(/\.(KW|DU|SS|SZ)$/, '') : asset.symbol;
  return { ...asset, nameAr: nameAr || asset.name, displaySymbol };
}
