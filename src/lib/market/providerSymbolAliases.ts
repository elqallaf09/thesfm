import { validateSymbol, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';

export type ProviderSymbolAlias = {
  displaySymbol: string;
  providerSymbols: string[];
  assetType: MarketAssetType;
  name: string;
  exchange?: string;
  country?: string;
  currency?: string;
  aliases: string[];
};

const ALIASES: ProviderSymbolAlias[] = [
  {
    displaySymbol: 'XAUUSD',
    providerSymbols: ['GC=F', 'XAUUSD=X'],
    assetType: 'gold',
    name: 'Gold / US Dollar',
    exchange: 'COMEX',
    country: 'Global',
    currency: 'USD',
    aliases: ['XAUUSD', 'XAU/USD', 'XAU', 'GOLD', 'GC=F'],
  },
  {
    displaySymbol: 'XAGUSD',
    providerSymbols: ['SI=F', 'XAGUSD=X'],
    assetType: 'commodity',
    name: 'Silver / US Dollar',
    exchange: 'COMEX',
    country: 'Global',
    currency: 'USD',
    aliases: ['XAGUSD', 'XAG/USD', 'XAG', 'SILVER', 'SI=F'],
  },
  {
    displaySymbol: 'EURUSD',
    providerSymbols: ['EURUSD=X'],
    assetType: 'forex',
    name: 'EUR/USD',
    exchange: 'FX',
    country: 'Global',
    currency: 'USD',
    aliases: ['EURUSD', 'EUR/USD'],
  },
  {
    displaySymbol: 'GBPUSD',
    providerSymbols: ['GBPUSD=X'],
    assetType: 'forex',
    name: 'GBP/USD',
    exchange: 'FX',
    country: 'Global',
    currency: 'USD',
    aliases: ['GBPUSD', 'GBP/USD'],
  },
  {
    displaySymbol: 'USDJPY',
    providerSymbols: ['USDJPY=X', 'JPY=X'],
    assetType: 'forex',
    name: 'USD/JPY',
    exchange: 'FX',
    country: 'Global',
    currency: 'JPY',
    aliases: ['USDJPY', 'USD/JPY', 'JPY=X'],
  },
  {
    displaySymbol: 'BTCUSD',
    providerSymbols: ['BTC-USD'],
    assetType: 'crypto',
    name: 'Bitcoin / US Dollar',
    exchange: 'Crypto',
    country: 'Global',
    currency: 'USD',
    aliases: ['BTCUSD', 'BTC/USD', 'BTC-USD', 'BTC', 'BITCOIN'],
  },
  {
    displaySymbol: 'ETHUSD',
    providerSymbols: ['ETH-USD'],
    assetType: 'crypto',
    name: 'Ethereum / US Dollar',
    exchange: 'Crypto',
    country: 'Global',
    currency: 'USD',
    aliases: ['ETHUSD', 'ETH/USD', 'ETH-USD', 'ETH', 'ETHEREUM'],
  },
];

function compactAlias(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/:]/g, '')
    .replace(/-/g, '')
    .replace(/^([A-Z]{6})=X$/, '$1');
}

function aliasMatches(alias: ProviderSymbolAlias, value: unknown) {
  const compact = compactAlias(value);
  const raw = String(value ?? '').trim().toUpperCase();
  return alias.aliases.some(candidate => compactAlias(candidate) === compact || String(candidate).toUpperCase() === raw)
    || alias.providerSymbols.some(candidate => compactAlias(candidate) === compact || candidate === raw)
    || compactAlias(alias.displaySymbol) === compact;
}

export function resolveProviderSymbolAlias(value: unknown, assetType?: MarketAssetType | null) {
  const normalizedAssetType = assetType && assetType !== 'stock' ? assetType : null;
  return ALIASES.find(alias => (
    (!normalizedAssetType || alias.assetType === normalizedAssetType || (normalizedAssetType === 'commodity' && alias.assetType === 'gold'))
    && aliasMatches(alias, value)
  )) ?? null;
}

export function providerAliasToMarketSearchItem(alias: ProviderSymbolAlias): MarketSearchItem {
  return {
    symbol: alias.displaySymbol,
    providerSymbol: alias.providerSymbols[0],
    name: alias.name,
    assetType: alias.assetType,
    exchange: alias.exchange,
    country: alias.country,
    currency: alias.currency,
    aliases: [...alias.aliases, ...alias.providerSymbols],
  };
}

export function providerSymbolsForAlias(value: unknown, assetType?: MarketAssetType | null) {
  const alias = resolveProviderSymbolAlias(value, assetType);
  if (!alias) return [];
  return alias.providerSymbols
    .map(symbol => validateSymbol(symbol))
    .filter((symbol): symbol is string => Boolean(symbol));
}
