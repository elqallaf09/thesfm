import { validateSymbol, type MarketAssetType } from '@/lib/market/marketService';

const SUPPORTED_ASSET_TYPES: MarketAssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold', 'index'];
const CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD'] as const;
const COMMON_FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURJPY', 'GBPJPY'] as const;
const ETF_SYMBOLS = new Set(['QQQ', 'SPY', 'VOO', 'DIA', 'IWM']);
const CRYPTO_PAIRS: Record<string, { display: string; provider: string; alternatives: string[] }> = {
  BTCUSD: { display: 'BTC/USD', provider: 'BTC-USD', alternatives: ['BTC-USD', 'BTC/USD', 'BTCUSD'] },
  ETHUSD: { display: 'ETH/USD', provider: 'ETH-USD', alternatives: ['ETH-USD', 'ETH/USD', 'ETHUSD'] },
  SOLUSD: { display: 'SOL/USD', provider: 'SOL-USD', alternatives: ['SOL-USD', 'SOL/USD', 'SOLUSD'] },
  XRPUSD: { display: 'XRP/USD', provider: 'XRP-USD', alternatives: ['XRP-USD', 'XRP/USD', 'XRPUSD'] },
  BNBUSD: { display: 'BNB/USD', provider: 'BNB-USD', alternatives: ['BNB-USD', 'BNB/USD', 'BNBUSD'] },
  ADAUSD: { display: 'ADA/USD', provider: 'ADA-USD', alternatives: ['ADA-USD', 'ADA/USD', 'ADAUSD'] },
  DOGEUSD: { display: 'DOGE/USD', provider: 'DOGE-USD', alternatives: ['DOGE-USD', 'DOGE/USD', 'DOGEUSD'] },
  TONUSD: { display: 'TON/USD', provider: 'TON11419-USD', alternatives: ['TON11419-USD', 'TON/USD', 'TONUSD'] },
  AVAXUSD: { display: 'AVAX/USD', provider: 'AVAX-USD', alternatives: ['AVAX-USD', 'AVAX/USD', 'AVAXUSD'] },
  LINKUSD: { display: 'LINK/USD', provider: 'LINK-USD', alternatives: ['LINK-USD', 'LINK/USD', 'LINKUSD'] },
};
const METAL_PAIRS: Record<string, { display: string; provider: string; assetType: MarketAssetType; alternatives: string[] }> = {
  XAUUSD: { display: 'XAU/USD', provider: 'XAUUSD', assetType: 'gold', alternatives: ['XAUUSD', 'XAU/USD', 'GC=F'] },
  XAGUSD: { display: 'XAG/USD', provider: 'XAGUSD', assetType: 'commodity', alternatives: ['XAGUSD', 'XAG/USD', 'SI=F'] },
};

export type NormalizedMarketSymbol = {
  inputSymbol: string;
  displaySymbol: string;
  providerSymbol: string;
  assetType: MarketAssetType;
  alternatives: string[];
};

function explicitAssetType(value: unknown): MarketAssetType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return null;
  if (normalized === 'stocks') return 'stock';
  if (normalized === 'commodities') return 'commodity';
  if (normalized === 'indices' || normalized === 'indexes') return 'index';
  if (normalized === 'metals') return 'gold';
  return SUPPORTED_ASSET_TYPES.includes(normalized as MarketAssetType) ? normalized as MarketAssetType : null;
}

function compactSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/:/g, '')
    .replace(/[\\/]/g, '')
    .replace(/-/g, '')
    .replace(/^([A-Z]{6})=X$/, '$1')
    .replace(/^(FX|FOREX|OANDA|TVC)(?=[A-Z]{6}$)/, '')
    .replace(/^(NASDAQ|NYSE|AMEX|COINBASE)(?=[A-Z0-9.^=-]{1,12}$)/, '');
}

function pairDisplay(symbol: string) {
  return `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}`;
}

function isCurrency(code: string) {
  return CURRENCY_CODES.includes(code as typeof CURRENCY_CODES[number]);
}

function uniqueSymbols(symbols: string[]) {
  const seen = new Set<string>();
  return symbols
    .map(symbol => validateSymbol(symbol))
    .filter((symbol): symbol is string => Boolean(symbol))
    .filter(symbol => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    });
}

export function normalizeMarketSymbol(input: unknown, assetTypeInput?: unknown): NormalizedMarketSymbol | null {
  const raw = String(input ?? '').trim();
  const compact = compactSymbol(raw);
  const requestedAssetType = explicitAssetType(assetTypeInput);

  if (!compact || !validateSymbol(compact)) return null;

  const metal = METAL_PAIRS[compact] ?? (compact === 'XAU' || compact === 'GOLD' ? METAL_PAIRS.XAUUSD : null) ?? (compact === 'XAG' || compact === 'SILVER' ? METAL_PAIRS.XAGUSD : null);
  if (metal) {
    return {
      inputSymbol: raw,
      displaySymbol: metal.display,
      providerSymbol: metal.provider,
      assetType: requestedAssetType && requestedAssetType !== 'stock' ? requestedAssetType : metal.assetType,
      alternatives: uniqueSymbols(metal.alternatives),
    };
  }

  const cryptoKey = compact.length <= 5 ? `${compact}USD` : compact;
  const crypto = CRYPTO_PAIRS[cryptoKey];
  if (crypto) {
    return {
      inputSymbol: raw,
      displaySymbol: crypto.display,
      providerSymbol: crypto.provider,
      assetType: 'crypto',
      alternatives: uniqueSymbols(crypto.alternatives),
    };
  }

  if (COMMON_FOREX_PAIRS.includes(compact as typeof COMMON_FOREX_PAIRS[number]) || (compact.length === 6 && isCurrency(compact.slice(0, 3)) && isCurrency(compact.slice(3, 6)))) {
    return {
      inputSymbol: raw,
      displaySymbol: pairDisplay(compact),
      providerSymbol: `${compact}=X`,
      assetType: 'forex',
      alternatives: uniqueSymbols([`${compact}=X`, pairDisplay(compact), compact]),
    };
  }

  const validatedRaw = validateSymbol(raw) ?? validateSymbol(compact);
  if (!validatedRaw) return null;

  const inferredAssetType = requestedAssetType ?? (ETF_SYMBOLS.has(compact) ? 'etf' : compact.startsWith('^') ? 'index' : 'stock');
  return {
    inputSymbol: raw,
    displaySymbol: validatedRaw,
    providerSymbol: validatedRaw,
    assetType: inferredAssetType,
    alternatives: uniqueSymbols([validatedRaw]),
  };
}
