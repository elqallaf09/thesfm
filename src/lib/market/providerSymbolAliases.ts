import { validateSymbol, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import { listCanonicalCryptoAssets } from '@/lib/market/canonicalSymbols';

export type ProviderSymbolAlias = {
  displaySymbol: string;
  providerSymbols: string[];
  fmpSymbols?: string[];
  yahooSymbols?: string[];
  finnhubSymbols?: string[];
  assetType: MarketAssetType;
  name: string;
  exchange?: string;
  country?: string;
  currency?: string;
  aliases: string[];
};

const CRYPTO_PROVIDER_ALIASES: ProviderSymbolAlias[] = listCanonicalCryptoAssets().map(asset => ({
  displaySymbol: asset.displaySymbol,
  providerSymbols: [asset.providerSymbols.yahoo],
  fmpSymbols: [asset.providerSymbols.fmp],
  yahooSymbols: [asset.providerSymbols.yahoo],
  finnhubSymbols: [asset.providerSymbols.finnhub, asset.providerSymbols.binance],
  assetType: 'crypto',
  name: asset.name,
  exchange: 'Crypto',
  country: 'Global',
  currency: 'USD',
  aliases: asset.aliases,
}));

const ALIASES: ProviderSymbolAlias[] = [
  {
    displaySymbol: 'XAUUSD',
    providerSymbols: ['GC=F', 'XAUUSD=X'],
    fmpSymbols: ['GCUSD', 'XAUUSD', 'GC=F'],
    yahooSymbols: ['GC=F', 'XAUUSD=X'],
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
    fmpSymbols: ['SIUSD', 'XAGUSD', 'SI=F'],
    yahooSymbols: ['SI=F', 'XAGUSD=X'],
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
    fmpSymbols: ['EURUSD'],
    yahooSymbols: ['EURUSD=X'],
    finnhubSymbols: ['OANDA:EUR_USD', 'EURUSD'],
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
    fmpSymbols: ['GBPUSD'],
    yahooSymbols: ['GBPUSD=X'],
    finnhubSymbols: ['OANDA:GBP_USD', 'GBPUSD'],
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
    fmpSymbols: ['USDJPY'],
    yahooSymbols: ['USDJPY=X', 'JPY=X'],
    finnhubSymbols: ['OANDA:USD_JPY', 'USDJPY'],
    assetType: 'forex',
    name: 'USD/JPY',
    exchange: 'FX',
    country: 'Global',
    currency: 'JPY',
    aliases: ['USDJPY', 'USD/JPY', 'JPY=X'],
  },
  ...CRYPTO_PROVIDER_ALIASES,
  {
    displaySymbol: 'BTCUSD',
    providerSymbols: ['BTC-USD'],
    fmpSymbols: ['BTCUSD'],
    yahooSymbols: ['BTC-USD'],
    finnhubSymbols: ['BINANCE:BTCUSDT', 'COINBASE:BTC-USD'],
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
    fmpSymbols: ['ETHUSD'],
    yahooSymbols: ['ETH-USD'],
    finnhubSymbols: ['BINANCE:ETHUSDT', 'COINBASE:ETH-USD'],
    assetType: 'crypto',
    name: 'Ethereum / US Dollar',
    exchange: 'Crypto',
    country: 'Global',
    currency: 'USD',
    aliases: ['ETHUSD', 'ETH/USD', 'ETH-USD', 'ETH', 'ETHEREUM'],
  },
  {
    displaySymbol: 'US30',
    providerSymbols: ['^DJI', 'YM=F', 'US30'],
    fmpSymbols: ['^DJI', 'DJI', 'US30'],
    yahooSymbols: ['^DJI', 'YM=F'],
    assetType: 'index',
    name: 'Dow Jones Industrial Average',
    exchange: 'DJI',
    country: 'US',
    currency: 'USD',
    aliases: ['US30', 'US 30', 'DJI', 'DOW', 'DOW JONES', '^DJI', 'YM=F'],
  },
  {
    displaySymbol: 'NAS100',
    providerSymbols: ['^NDX', 'NQ=F', 'NAS100'],
    fmpSymbols: ['^NDX', 'NDX', 'NAS100'],
    yahooSymbols: ['^NDX', 'NQ=F'],
    assetType: 'index',
    name: 'Nasdaq 100',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['NAS100', 'NAS 100', 'NASDAQ100', 'NASDAQ 100', 'NDX', '^NDX', 'NQ=F'],
  },
  {
    displaySymbol: 'SPX500',
    providerSymbols: ['^GSPC', 'ES=F', 'SPX500'],
    fmpSymbols: ['^GSPC', 'GSPC', 'SPX', 'SPX500'],
    yahooSymbols: ['^GSPC', 'ES=F'],
    assetType: 'index',
    name: 'S&P 500',
    exchange: 'S&P Dow Jones Indices',
    country: 'US',
    currency: 'USD',
    aliases: ['SPX500', 'SPX 500', 'SP500', 'S&P500', 'S&P 500', 'SPX', '^GSPC', 'ES=F'],
  },
  {
    displaySymbol: 'DAX',
    providerSymbols: ['^GDAXI', 'DAX'],
    fmpSymbols: ['^GDAXI', 'GDAXI', 'DAX'],
    yahooSymbols: ['^GDAXI'],
    assetType: 'index',
    name: 'DAX Index',
    exchange: 'Xetra',
    country: 'Germany',
    currency: 'EUR',
    aliases: ['DAX', 'GER40', 'GERMANY40', '^GDAXI'],
  },
  {
    displaySymbol: 'FTSE',
    providerSymbols: ['^FTSE', 'FTSE'],
    fmpSymbols: ['^FTSE', 'FTSE'],
    yahooSymbols: ['^FTSE'],
    assetType: 'index',
    name: 'FTSE 100',
    exchange: 'London Stock Exchange',
    country: 'United Kingdom',
    currency: 'GBP',
    aliases: ['FTSE', 'FTSE100', 'FTSE 100', 'UK100', '^FTSE'],
  },
  {
    displaySymbol: 'CAC40',
    providerSymbols: ['^FCHI', 'CAC40'],
    fmpSymbols: ['^FCHI', 'FCHI', 'CAC40'],
    yahooSymbols: ['^FCHI'],
    assetType: 'index',
    name: 'CAC 40',
    exchange: 'Euronext Paris',
    country: 'France',
    currency: 'EUR',
    aliases: ['CAC40', 'CAC 40', 'FRA40', '^FCHI'],
  },
  {
    displaySymbol: 'NIKKEI',
    providerSymbols: ['^N225', 'NIKKEI'],
    fmpSymbols: ['^N225', 'N225', 'NIKKEI'],
    yahooSymbols: ['^N225'],
    assetType: 'index',
    name: 'Nikkei 225',
    exchange: 'Tokyo Stock Exchange',
    country: 'Japan',
    currency: 'JPY',
    aliases: ['NIKKEI', 'NIKKEI225', 'NIKKEI 225', 'JP225', '^N225'],
  },
  {
    displaySymbol: 'HSI',
    providerSymbols: ['^HSI', 'HSI'],
    fmpSymbols: ['^HSI', 'HSI'],
    yahooSymbols: ['^HSI'],
    assetType: 'index',
    name: 'Hang Seng Index',
    exchange: 'Hong Kong Exchange',
    country: 'Hong Kong',
    currency: 'HKD',
    aliases: ['HSI', 'HANGSENG', 'HANG SENG', 'HK50', '^HSI'],
  },
  {
    displaySymbol: 'WTI',
    providerSymbols: ['CL=F', 'WTI'],
    fmpSymbols: ['CLUSD', 'WTI', 'CL=F'],
    yahooSymbols: ['CL=F'],
    assetType: 'commodity',
    name: 'WTI Crude Oil',
    exchange: 'NYMEX',
    country: 'Global',
    currency: 'USD',
    aliases: ['WTI', 'USOIL', 'CL=F', 'CLUSD', 'CRUDE OIL'],
  },
  {
    displaySymbol: 'BRENT',
    providerSymbols: ['BZ=F', 'BRENT'],
    fmpSymbols: ['BZUSD', 'BRENT', 'BZ=F'],
    yahooSymbols: ['BZ=F'],
    assetType: 'commodity',
    name: 'Brent Crude Oil',
    exchange: 'ICE',
    country: 'Global',
    currency: 'USD',
    aliases: ['BRENT', 'UKOIL', 'BZ=F', 'BZUSD', 'BRENT OIL'],
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
  const normalizedAssetType = assetType ?? null;
  return ALIASES.find(alias => (
    (!normalizedAssetType || alias.assetType === normalizedAssetType || (normalizedAssetType === 'commodity' && alias.assetType === 'gold'))
    && aliasMatches(alias, value)
  )) ?? null;
}

export function providerAliasToMarketSearchItem(alias: ProviderSymbolAlias): MarketSearchItem {
  const primaryProviderSymbol = alias.providerSymbols[0] ?? alias.displaySymbol;
  return {
    symbol: alias.displaySymbol,
    providerSymbol: primaryProviderSymbol,
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

export function providerSymbolsForProviderAlias(value: unknown, provider: 'fmp' | 'yahoo' | 'finnhub', assetType?: MarketAssetType | null) {
  const alias = resolveProviderSymbolAlias(value, assetType);
  if (!alias) return [];
  const providerSymbols = provider === 'fmp'
    ? alias.fmpSymbols
    : provider === 'finnhub'
      ? alias.finnhubSymbols
      : alias.yahooSymbols;
  return (providerSymbols ?? alias.providerSymbols)
    .map(symbol => validateSymbol(symbol))
    .filter((symbol): symbol is string => Boolean(symbol));
}
