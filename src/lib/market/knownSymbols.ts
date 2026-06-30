import {
  normalizeAssetType,
  validateSymbol,
  type MarketAssetType,
  type MarketSearchItem,
} from '@/lib/market/marketService';

export type KnownMarketSymbol = MarketSearchItem & {
  providerSymbol: string;
  aliases: string[];
};

export const KNOWN_MARKET_SYMBOLS: KnownMarketSymbol[] = [
  {
    symbol: 'T',
    providerSymbol: 'T',
    name: 'AT&T',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['t', 'at&t', 'att', 'at and t', 'at&t inc'],
  },
  {
    symbol: 'F',
    providerSymbol: 'F',
    name: 'Ford',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['f', 'ford', 'ford motor', 'ford motor company'],
  },
  {
    symbol: 'C',
    providerSymbol: 'C',
    name: 'Citigroup',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['c', 'citigroup', 'citi', 'citigroup inc'],
  },
  {
    symbol: 'V',
    providerSymbol: 'V',
    name: 'Visa',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['v', 'visa', 'visa inc'],
  },
  {
    symbol: 'O',
    providerSymbol: 'O',
    name: 'Realty Income',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['o', 'realty income', 'realty income corporation'],
  },
  {
    symbol: 'AAPL',
    providerSymbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['aapl', 'apple', 'apple inc', 'apple incorporated'],
  },
  {
    symbol: 'MSFT',
    providerSymbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['msft', 'microsoft', 'microsoft corporation'],
  },
  {
    symbol: 'NVDA',
    providerSymbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['nvda', 'nvidia', 'nvidia corporation'],
  },
  {
    symbol: 'GOOGL',
    providerSymbol: 'GOOGL',
    name: 'Alphabet Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['googl', 'alphabet', 'alphabet inc', 'google'],
  },
  {
    symbol: 'AMZN',
    providerSymbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['amzn', 'amazon', 'amazon.com', 'amazon.com inc'],
  },
  {
    symbol: 'META',
    providerSymbol: 'META',
    name: 'Meta Platforms Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['meta', 'meta platforms', 'facebook'],
  },
  {
    symbol: 'TSLA',
    providerSymbol: 'TSLA',
    name: 'Tesla Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['tsla', 'tesla', 'tesla inc'],
  },
  {
    symbol: 'AMD',
    providerSymbol: 'AMD',
    name: 'Advanced Micro Devices',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['amd', 'advanced micro devices', 'advanced micro devices inc'],
  },
  {
    symbol: 'INTC',
    providerSymbol: 'INTC',
    name: 'Intel Corporation',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['intc', 'intel', 'intel corporation'],
  },
];

export type KnownSymbol = KnownMarketSymbol;

export const knownSymbols: Record<string, KnownMarketSymbol> = Object.fromEntries(
  KNOWN_MARKET_SYMBOLS.map(item => [item.symbol, item]),
);

function normalizeKnownText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function compactKnownText(value: unknown) {
  return normalizeKnownText(value).replace(/\s+/g, '');
}

function matchesAssetType(item: MarketSearchItem, assetTypeInput?: MarketAssetType | 'all' | null) {
  if (!assetTypeInput || assetTypeInput === 'all') return true;
  return normalizeAssetType(item.assetType) === normalizeAssetType(assetTypeInput);
}

export function findKnownMarketSymbol(query: unknown, assetType?: MarketAssetType | 'all' | null) {
  const symbol = validateSymbol(query);
  const normalized = normalizeKnownText(query);
  const compact = compactKnownText(query);
  if (!symbol && !normalized) return null;

  return KNOWN_MARKET_SYMBOLS.find(item => {
    if (!matchesAssetType(item, assetType)) return false;
    if (symbol && (item.symbol === symbol || item.providerSymbol === symbol)) return true;
    return item.aliases.some(alias => normalizeKnownText(alias) === normalized || compactKnownText(alias) === compact);
  }) ?? null;
}

export function isKnownExactMarketSymbol(query: unknown, assetType?: MarketAssetType | 'all' | null) {
  const symbol = validateSymbol(query);
  if (!symbol) return false;
  return KNOWN_MARKET_SYMBOLS.some(item => matchesAssetType(item, assetType) && (item.symbol === symbol || item.providerSymbol === symbol));
}

export function resolveKnownSymbol(input: string) {
  const key = validateSymbol(input);
  return key ? knownSymbols[key] ?? null : null;
}
