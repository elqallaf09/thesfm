import type { MarketAssetType } from '@/lib/market/marketService';

export type SentimentAssetType = 'forex' | 'metals' | 'crypto' | 'stock' | 'etf' | 'unsupported';

export type NormalizedSentimentRequest = {
  symbol: string;
  displaySymbol: string;
  providerSymbol: string;
  assetType: SentimentAssetType;
  requestedAssetType: MarketAssetType | null;
};

type SentimentRequestInput = {
  symbol?: string | null;
  providerSymbol?: string | null;
  symbols?: string | null;
  assetType?: string | null;
};

const MARKET_ASSET_TYPES = new Set<MarketAssetType>([
  'stock',
  'etf',
  'crypto',
  'forex',
  'commodity',
  'gold',
  'index',
]);

const MARKET_ASSET_ALIASES: Readonly<Record<string, MarketAssetType>> = {
  stocks: 'stock',
  commodities: 'commodity',
  indices: 'index',
  indexes: 'index',
};

const COMMON_CURRENCY_CODES = new Set([
  'USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK',
  'DKK', 'CNH', 'HKD', 'SGD', 'MXN', 'ZAR', 'TRY', 'PLN',
]);

const COMMON_CRYPTO_CODES = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'BNB', 'LTC', 'BCH', 'DOT',
  'AVAX', 'LINK', 'MATIC',
]);

const COMMON_ETFS = new Set([
  'SPY', 'QQQ', 'DIA', 'IWM', 'VOO', 'VTI', 'IVV', 'VEA', 'VWO', 'GLD',
  'SLV', 'TLT', 'HYG', 'EFA', 'EEM', 'ARKK', 'XLK', 'XLF', 'XLE', 'XLV',
  'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'VNQ',
]);

export function compactSentimentSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/=X$/, '')
    .replace(/^(FX|FOREX|OANDA|TVC|NASDAQ|NYSE|AMEX|COINBASE):?/i, '')
    .replace(/[\s/_-]+/g, '')
    .replace(/[^A-Z0-9.]/g, '');
}

export function compactPairSymbol(value: unknown) {
  return compactSentimentSymbol(value).replace(/\./g, '');
}

function isMetalSymbol(value: unknown) {
  const raw = String(value ?? '').trim().toUpperCase();
  const compact = compactPairSymbol(value);
  return ['GC=F', 'SI=F', 'XAU', 'XAG', 'GOLD', 'SILVER', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].includes(raw)
    || /^X(AU|AG|PT|PD)USD$/.test(compact);
}

function isCryptoPair(value: unknown) {
  const compact = compactPairSymbol(value);
  return compact.endsWith('USD') && COMMON_CRYPTO_CODES.has(compact.slice(0, -3));
}

function isForexPair(value: unknown) {
  const compact = compactPairSymbol(value);
  if (!/^[A-Z]{6}$/.test(compact) || isMetalSymbol(value) || isCryptoPair(value)) return false;
  return COMMON_CURRENCY_CODES.has(compact.slice(0, 3)) && COMMON_CURRENCY_CODES.has(compact.slice(3, 6));
}

function parseRequestedAssetType(value: unknown): MarketAssetType | null | 'invalid' {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (!normalized || normalized === 'all') return null;
  if (['metal', 'metals', 'preciousmetal', 'preciousmetals'].includes(normalized)) return 'gold';
  const alias = MARKET_ASSET_ALIASES[normalized];
  if (alias) return alias;
  return MARKET_ASSET_TYPES.has(normalized as MarketAssetType) ? normalized as MarketAssetType : 'invalid';
}

function resolveAssetType(assetTypeInput: unknown, symbol: unknown): {
  assetType: SentimentAssetType;
  requestedAssetType: MarketAssetType | null;
} {
  const requested = parseRequestedAssetType(assetTypeInput);
  if (requested === 'invalid') return { assetType: 'unsupported', requestedAssetType: null };
  if (requested === 'forex') return { assetType: 'forex', requestedAssetType: requested };
  if (requested === 'crypto') return { assetType: 'crypto', requestedAssetType: requested };
  if (requested === 'gold' || requested === 'commodity') return { assetType: 'metals', requestedAssetType: requested };
  if (requested === 'stock' || requested === 'etf') return { assetType: requested, requestedAssetType: requested };
  if (requested === 'index') return { assetType: 'unsupported', requestedAssetType: requested };

  if (isMetalSymbol(symbol)) return { assetType: 'metals', requestedAssetType: null };
  if (isCryptoPair(symbol)) return { assetType: 'crypto', requestedAssetType: null };
  if (isForexPair(symbol)) return { assetType: 'forex', requestedAssetType: null };
  if (COMMON_ETFS.has(compactPairSymbol(symbol))) return { assetType: 'etf', requestedAssetType: null };
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(compactSentimentSymbol(symbol))) return { assetType: 'stock', requestedAssetType: null };
  return { assetType: 'unsupported', requestedAssetType: null };
}

export function normalizeSentimentRequest(input: SentimentRequestInput): NormalizedSentimentRequest {
  const firstListedSymbol = input.symbols?.split(',')[0] ?? '';
  const rawSymbol = input.symbol || input.providerSymbol || firstListedSymbol || '';
  const rawProviderSymbol = input.providerSymbol || input.symbol || firstListedSymbol || '';
  const { assetType, requestedAssetType } = resolveAssetType(input.assetType, rawSymbol || rawProviderSymbol);
  const symbolCompact = compactPairSymbol(rawSymbol);
  const providerCompact = compactPairSymbol(rawProviderSymbol);
  const fallbackSymbol = symbolCompact || providerCompact;
  const symbol = assetType === 'stock' || assetType === 'etf'
    ? (compactSentimentSymbol(rawSymbol) || compactSentimentSymbol(rawProviderSymbol))
    : fallbackSymbol;

  return {
    symbol,
    displaySymbol: symbol || String(rawSymbol || rawProviderSymbol).trim().toUpperCase(),
    providerSymbol: rawProviderSymbol.trim() || rawSymbol.trim(),
    assetType,
    requestedAssetType,
  };
}

