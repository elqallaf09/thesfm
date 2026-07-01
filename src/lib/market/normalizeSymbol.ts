import { validateSymbol, type MarketAssetType } from '@/lib/market/marketService';
import cryptoSymbols from '@/data/market-symbols/crypto.json';
import { resolveProviderSymbolAlias } from '@/lib/market/providerSymbolAliases';

const SUPPORTED_ASSET_TYPES: MarketAssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold', 'index'];
const CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD'] as const;
const COMMON_FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURJPY', 'GBPJPY'] as const;
const ETF_SYMBOLS = new Set(['QQQ', 'SPY', 'VOO', 'DIA', 'IWM']);
const CRYPTO_PAIRS: Record<string, { display: string; provider: string; alternatives: string[] }> = (
  cryptoSymbols as Array<{ symbol?: string; provider_symbol?: string | null; aliases?: string[] | null }>
).reduce<Record<string, { display: string; provider: string; alternatives: string[] }>>((pairs, record) => {
  const symbol = String(record.symbol ?? '').trim().toUpperCase();
  const provider = String(record.provider_symbol ?? '').trim().toUpperCase();
  if (!symbol || !provider) return pairs;
  pairs[`${symbol}USD`] = {
    display: `${symbol}/USD`,
    provider,
    alternatives: [provider, `${symbol}/USD`, `${symbol}USD`, symbol, ...(record.aliases ?? [])],
  };
  return pairs;
}, {});
const METAL_PAIRS: Record<string, { display: string; provider: string; assetType: MarketAssetType; alternatives: string[] }> = {
  XAUUSD: { display: 'XAUUSD', provider: 'GC=F', assetType: 'gold', alternatives: ['GC=F', 'XAUUSD=X', 'XAUUSD', 'XAU/USD', 'GOLD'] },
  XAGUSD: { display: 'XAGUSD', provider: 'SI=F', assetType: 'commodity', alternatives: ['SI=F', 'XAGUSD=X', 'XAGUSD', 'XAG/USD', 'SILVER'] },
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

  const aliased = resolveProviderSymbolAlias(raw, requestedAssetType);
  if (aliased) {
    return {
      inputSymbol: raw,
      displaySymbol: aliased.displaySymbol,
      providerSymbol: aliased.providerSymbols[0],
      assetType: requestedAssetType && requestedAssetType !== 'stock' ? requestedAssetType : aliased.assetType,
      alternatives: uniqueSymbols([...aliased.providerSymbols, ...aliased.aliases]),
    };
  }

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
