import 'server-only';
import type { Investment } from '@/types/investment';
import type { TvPortfolioPosition } from '@/lib/markets-tv/portfolio';
import type { TvAsset } from './catalog';
import { portfolioCurrency, portfolioNumber } from '@/lib/investments/recordedPortfolio';
import { isKnownCryptoBase } from '@/lib/market/canonicalSymbols';
import { listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { globalDirectoryMarketItems } from '@/lib/world-stocks/globalDirectory';
import { reconcileKuwaitDirectory } from '@/lib/world-stocks/kuwaitDirectory';
import { getBundledUsSymbolCatalog } from '@/lib/server/usSymbolCatalog';

export type PortfolioMarketTarget = { asset: TvAsset; multiplier: number; kind: 'listing' | 'crypto-usd' | 'crypto-usdt' | 'metal' };
type TargetResult = { eligible: boolean; target?: PortfolioMarketTarget; issue?: TvPortfolioPosition['valuationIssue'] };
const upper = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : '';
const positive = (value: unknown) => { const n = portfolioNumber(value); return n !== null && n > 0 ? n : null; };
const TROY_OUNCE_GRAMS = 31.1034768;
const regional = reconcileKuwaitDirectory([...globalDirectoryMarketItems(), ...listBundledMarketSymbols({ assetType: 'stock', limit: 10000 })], '');
const regionalByIdentity = new Map<string, typeof regional>();
for (const row of regional) {
  const keys = [upper(row.symbol), upper(row.providerSymbol), ...(row.country === 'KW' ? [`${upper(row.symbol)}:KSE`] : [])];
  for (const key of new Set(keys.filter(Boolean))) regionalByIdentity.set(key, [...(regionalByIdentity.get(key) || []), row]);
}

function marketKey(value: unknown) {
  const key = upper(value).replace(/[\s_-]/g, '');
  if (['NASDAQ', 'NASDAQGS', 'NASDAQGM', 'NASDAQCM', 'XNAS', 'NMS', 'NGM', 'NCM'].includes(key)) return 'NASDAQ';
  if (['NYSE', 'XNYS', 'NYQ'].includes(key)) return 'NYSE';
  if (['US', 'USA', 'UNITEDSTATES', 'الأسواقالأمريكية', 'الاسواقالامريكية', 'الولاياتالمتحدة'].includes(key)) return 'US';
  if (['BOURSAKUWAIT', 'KUWAIT', 'KSE', 'XKUW', 'بورصةالكويت', 'الكويت'].includes(key)) return 'BOURSA_KUWAIT';
  return key;
}

function cryptoIdentity(value: string) {
  const input = value.replace(/^(BINANCE|COINBASE|KRAKEN|BITSTAMP|CRYPTO):/, '').replace(/\.CC$/, '');
  const pair = input.match(/^([A-Z0-9]{2,12})[-/]?(USDT|USD)$/);
  if (pair) return { base: pair[1], currency: pair[2] };
  return /^[A-Z0-9]{2,12}$/.test(input) ? { base: input, currency: null } : null;
}

function cryptoTarget(item: Investment): TargetResult {
  const identities = [item.symbol, item.providerSymbol].map(upper).filter(Boolean).map(cryptoIdentity);
  const first = identities.find(Boolean);
  if (!first || identities.some(identity => !identity || identity.base !== first.base)
    || !isKnownCryptoBase(first.base) || first.base === 'LUNA') return { eligible: true, issue: 'identity_unverified' };
  // LUNA's legacy holding cannot establish Terra 2.0 versus the old chain.
  const currencies = new Set(identities.flatMap(identity => identity?.currency ? [identity.currency] : []));
  const savedCurrency = upper(item.priceCurrency || item.nativeCurrency);
  if (savedCurrency) currencies.add(savedCurrency);
  const currency = [...currencies][0];
  if (currencies.size !== 1 || !['USD', 'USDT'].includes(currency)) return { eligible: true, issue: 'identity_unverified' };
  const multiplier = positive(item.quantity);
  if (multiplier === null) return { eligible: true, issue: 'quantity_unavailable' };
  return { eligible: true, target: { multiplier, kind: currency === 'USD' ? 'crypto-usd' : 'crypto-usdt', asset: {
    symbol: `${first.base}/${currency}`, name: `${first.base}/${currency}`, assetType: 'crypto', currency,
    baseCurrency: first.base, ...(currency === 'USDT' ? { region: 'BINANCE', providerSymbol: `${first.base}USDT` } : {}),
  } } };
}

function metalTarget(item: Investment): TargetResult {
  const metal = item.type === 'gold' || item.type === 'silver' ? item.type : item.metalType;
  if (!['gold', 'silver'].includes(metal || '') || item.metalType && item.metalType !== metal) return { eligible: true, issue: 'identity_unverified' };
  // A coin count is not a weight. Only a saved pure weight or an explicit
  // fineness/karat conversion can be multiplied by a spot price per troy ounce.
  let grams = positive(item.pureMetalGrams);
  if (grams === null) {
    const weight = positive(item.grams), purity = positive(item.metalPurity), karat = positive(item.metalKarat);
    const fineness = purity !== null && purity <= 1 ? purity : metal === 'gold' && karat !== null && karat <= 24 ? karat / 24 : null;
    if (weight !== null && fineness !== null) grams = weight * fineness;
  }
  if (grams === null) return { eligible: true, issue: 'units_unverified' };
  return { eligible: true, target: { kind: 'metal', multiplier: grams / TROY_OUNCE_GRAMS,
    asset: { symbol: metal === 'gold' ? 'XAUUSD' : 'XAGUSD', name: `${metal} spot`, currency: 'USD', exchange: 'OTC', assetType: 'commodity' } } };
}

async function stockTarget(item: Investment): Promise<TargetResult> {
  const inputs = [...new Set([upper(item.symbol), upper(item.providerSymbol)].filter(Boolean))];
  if (!inputs.length) return { eligible: true, issue: 'identity_unverified' };
  const market = marketKey(item.market), savedCurrency = portfolioCurrency(item.priceCurrency || item.nativeCurrency);
  const catalog = await getBundledUsSymbolCatalog();
  const us = inputs.flatMap(input => {
    const key = input.replace(/\.US$/, '');
    const row = catalog.bySymbol.get(key) || catalog.byProviderSymbol.get(key);
    return row ? [{ symbol: String(row.symbol), providerSymbol: String(row.providerSymbol || row.symbol),
      name: String(row.name || row.symbol), assetType: String(row.assetType || 'stock'), exchange: String(row.exchange || ''), currency: String(row.currency || 'USD'), country: 'US' }] : [];
  });
  const regionalCandidates = inputs.flatMap(input => regionalByIdentity.get(input) || []);
  const matches = [...regionalCandidates, ...us].filter(row => {
    if (!['stock', 'etf'].includes(row.assetType || '') || !row.currency || savedCurrency && row.currency !== savedCurrency) return false;
    if (market && (market === 'US' ? row.country !== 'US' : marketKey(row.exchange) !== market)) return false;
    const identities = [upper(row.symbol), upper(row.providerSymbol)];
    if (row.country === 'US') identities.push(`${upper(row.symbol)}.US`);
    if (marketKey(row.exchange) === 'BOURSA_KUWAIT') identities.push(`${upper(row.symbol)}:KSE`);
    return inputs.every(input => identities.includes(input));
  });
  const unique = new Map(matches.map(row => [`${row.exchange}:${row.providerSymbol || row.symbol}:${row.currency}`, row]));
  if (unique.size !== 1) return { eligible: true, issue: 'identity_unverified' };
  const listing = [...unique.values()][0], multiplier = positive(item.quantity);
  if (multiplier === null) return { eligible: true, issue: 'quantity_unavailable' };
  const exchange = marketKey(listing.exchange);
  return { eligible: true, target: { kind: 'listing', multiplier, asset: {
    symbol: listing.providerSymbol || listing.symbol, name: listing.name, assetType: 'stock', currency: listing.currency,
    country: listing.country, exchange: listing.exchange || undefined,
    region: listing.country === 'US' ? 'US' : exchange === 'BOURSA_KUWAIT' ? 'BOURSA_KUWAIT' : listing.exchange || undefined,
    ...(exchange === 'BOURSA_KUWAIT' ? { mic: 'XKUW', providerSymbol: listing.symbol } : {}),
  } } };
}

/** Resolve saved identity and units; never infer them from a position's title. */
export async function portfolioMarketTarget(item: Investment): Promise<TargetResult> {
  if (['realEstate', 'cash', 'project'].includes(item.type)) return { eligible: false };
  if (item.type === 'crypto') return cryptoTarget(item);
  if (item.type === 'gold' || item.type === 'silver') return metalTarget(item);
  if (item.type === 'stocks' || item.type === 'fund') return stockTarget(item);
  if (['commodity', 'commodities', 'gold', 'silver'].includes(item.assetType || '')) return { eligible: true, issue: 'units_unverified' };
  return { eligible: false };
}

export function portfolioTargetKey(target: PortfolioMarketTarget) {
  // Only public listing facts, never owner, amount, quantity, title or platform.
  const a = target.asset;
  return JSON.stringify([target.kind, a.symbol, a.region, a.exchange, a.mic, a.providerSymbol, a.currency]);
}
