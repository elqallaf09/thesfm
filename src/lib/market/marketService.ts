import type { MarketCurrencySource, MarketPriceUnit } from '@/lib/market/marketCurrency';

export type MarketAssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold' | 'index';
export type MarketTrend = 'bullish' | 'neutral' | 'bearish';
export type MarketRiskLevel = 'low' | 'medium' | 'high';
export type MarketDataStatus = 'live' | 'delayed' | 'unavailable';
export type FundamentalsUnavailableReason = 'not_supported_for_asset_type' | 'provider_returned_empty' | 'symbol_not_supported' | 'api_error';
export type MarketAiInsight = {
  status: 'ready' | 'unavailable' | 'skipped';
  provider?: 'openai' | 'anthropic' | 'rule-based';
  summary?: string;
  trendStatus?: string;
  riskNotes?: string;
  watchNext?: string[];
  error?: string;
};

export type MarketHistoryPoint = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number | null;
};

export type MarketAnalysis = {
  success: true;
  provider?: 'openbb';
  dataStatus?: MarketDataStatus;
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  currency?: string | null;
  currencySource?: MarketCurrencySource;
  priceUnit?: MarketPriceUnit;
  exchange?: string;
  country?: string;
  market?: string;
  lastUpdated?: string;
  latestPrice: number;
  changePercent: number;
  quote?: {
    price: number;
    change: number;
    changePercent: number;
    currency: string | null;
    currencySource?: MarketCurrencySource;
    priceUnit?: MarketPriceUnit;
    timestamp: string;
  };
  fundamentals?: Record<string, unknown>;
  fundamentalsAvailable?: boolean;
  fundamentalsUnavailableReason?: FundamentalsUnavailableReason;
  fundamentalsSource?: string;
  technicals?: Record<string, unknown>;
  trend: MarketTrend;
  riskLevel: MarketRiskLevel;
  indicators: {
    rsi: number;
    sma20: number;
    sma50: number;
    volatility: number;
  };
  levels: {
    support: number;
    resistance: number;
  };
  history: MarketHistoryPoint[];
  summary: string;
  source?: string;
  fallback?: boolean;
  fallbackReason?: string;
  cached?: boolean;
  cacheAgeSeconds?: number;
  fetchedAt?: string;
  warnings?: string[];
  aiInsight?: MarketAiInsight;
};

export type MarketError = {
  success: false;
  code?: string;
  error: string;
  suggestions?: string[];
  correction?: string | null;
  provider?: 'openbb';
  dataStatus?: 'unavailable';
  source?: string;
  fallback?: false;
  openbbService?: 'connected' | 'degraded' | 'slow' | 'not_configured' | 'unavailable';
  warnings?: string[];
};

export type MarketResult = MarketAnalysis | MarketError;

export type MarketSearchItem = {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
  exchange?: string;
  country?: string;
  currency?: string;
  currencySource?: MarketCurrencySource;
  providerSymbol?: string;
};

const SUPPORTED_ASSET_TYPES: MarketAssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold', 'index'];
const COMMON_CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD'] as const;
const COMMON_FOREX_PAIRS = ['USDJPY', 'EURUSD', 'GBPUSD', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURJPY', 'GBPJPY'] as const;
const COMMON_CRYPTO_PAIRS: Record<string, string> = {
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
};
const COMMON_METAL_PAIRS: Record<string, string> = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  GOLD: 'GC=F',
  XAU: 'GC=F',
  SILVER: 'SI=F',
  XAG: 'SI=F',
};

export function validateSymbol(symbol: unknown) {
  const normalized = String(symbol ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9.^=:/-]{1,24}$/.test(normalized)) return null;
  return normalized;
}

function compactSymbol(symbol: unknown) {
  const compact = String(symbol ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/]/g, '')
    .replace(/:/g, '');
  return compact
    .replace(/^([A-Z]{6})=X$/, '$1')
    .replace(/^(FX|FOREX|OANDA|TVC)(?=[A-Z]{6}$)/, '')
    .replace(/^(NASDAQ|NYSE|AMEX|COINBASE)(?=[A-Z0-9.^=-]{1,12}$)/, '');
}

function isCurrencyCode(code: string) {
  return COMMON_CURRENCY_CODES.includes(code as typeof COMMON_CURRENCY_CODES[number]);
}

function closestCurrencyCode(code: string) {
  if (isCurrencyCode(code)) return code;
  const sorted = COMMON_CURRENCY_CODES
    .map(currency => ({
      currency,
      score: [...currency].reduce((sum, letter, index) => sum + (letter === code[index] ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  return sorted[0]?.score >= 2 ? sorted[0].currency : null;
}

function closestForexPair(symbol: string) {
  const directPrefix = COMMON_FOREX_PAIRS.find(pair => symbol.startsWith(pair) && symbol.length <= pair.length + 2);
  if (directPrefix) return directPrefix;
  const compact = symbol.replace(/[^A-Z]/g, '');
  const scored = COMMON_FOREX_PAIRS
    .map(pair => {
      let score = 0;
      const max = Math.max(compact.length, pair.length);
      for (let index = 0; index < max; index += 1) {
        if (compact[index] === pair[index]) score += 2;
        else if (compact.includes(pair[index] ?? '')) score += 0.25;
      }
      score -= Math.abs(compact.length - pair.length);
      return { pair, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 9 ? scored[0].pair : null;
}

export function marketSymbolCorrection(symbol: unknown) {
  const compact = compactSymbol(symbol);
  if (compact === 'USDERU') return 'USDEUR';
  const forexPair = closestForexPair(compact);
  return forexPair && compact !== forexPair ? forexPair : null;
}

export function marketSymbolSuggestions(symbol: unknown) {
  const compact = compactSymbol(symbol);
  const base = ['USDJPY', 'EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'NVDA'];
  if (compact === 'USDERU') return ['USDEUR', 'EURUSD', 'AAPL', 'NVDA', 'XAUUSD', 'BTCUSD'];
  const typoPair = closestForexPair(compact);
  if (typoPair) return [typoPair, ...base].filter((item, index, list) => list.indexOf(item) === index).slice(0, 6);
  if (compact.length === 6) {
    const from = closestCurrencyCode(compact.slice(0, 3));
    const to = closestCurrencyCode(compact.slice(3, 6));
    const pairSuggestions = from && to ? [`${from}${to}`, `${to}${from}`] : [];
    return [...pairSuggestions, ...base].filter((item, index, list) => list.indexOf(item) === index).slice(0, 6);
  }
  return base;
}

export function normalizeMarketSymbolInput(symbol: unknown, assetTypeInput?: unknown) {
  const raw = String(symbol ?? '').trim();
  const compact = compactSymbol(raw);
  const requestedAssetType = normalizeAssetType(assetTypeInput);
  if (!compact || !validateSymbol(compact)) {
    return { valid: false as const, code: 'invalid_symbol', suggestions: marketSymbolSuggestions(raw) };
  }

  if (COMMON_METAL_PAIRS[compact]) {
    const normalizedMetalSymbol = compact === 'GOLD' ? 'XAUUSD' : compact === 'SILVER' ? 'XAGUSD' : compact;
    return {
      valid: true as const,
      symbol: normalizedMetalSymbol,
      displaySymbol: normalizedMetalSymbol,
      providerSymbol: COMMON_METAL_PAIRS[compact],
      assetType: normalizedMetalSymbol === 'XAGUSD' ? 'commodity' as MarketAssetType : 'gold' as MarketAssetType,
      suggestions: marketSymbolSuggestions(compact),
    };
  }

  if (COMMON_CRYPTO_PAIRS[compact]) {
    return {
      valid: true as const,
      symbol: compact,
      displaySymbol: compact,
      providerSymbol: COMMON_CRYPTO_PAIRS[compact],
      assetType: 'crypto' as MarketAssetType,
      suggestions: marketSymbolSuggestions(compact),
    };
  }

  const likelyForexTypo = closestForexPair(compact);
  if (likelyForexTypo && compact !== likelyForexTypo) {
    return { valid: false as const, code: 'invalid_symbol', suggestions: marketSymbolSuggestions(compact), correction: likelyForexTypo };
  }

  if (compact.length === 6) {
    const base = compact.slice(0, 3);
    const quote = compact.slice(3, 6);
    const baseValid = isCurrencyCode(base);
    const quoteValid = isCurrencyCode(quote);
    if (baseValid && quoteValid) {
      const providerSymbol = `${compact}=X`;
      return {
        valid: true as const,
        symbol: compact,
        displaySymbol: compact,
        providerSymbol,
        assetType: 'forex' as MarketAssetType,
        suggestions: marketSymbolSuggestions(compact),
      };
    }
    if (baseValid || quoteValid || requestedAssetType === 'forex') {
      return { valid: false as const, code: 'symbol_not_found', suggestions: marketSymbolSuggestions(compact), correction: marketSymbolCorrection(compact) };
    }
  }

  const validated = validateSymbol(raw);
  return {
    valid: true as const,
    symbol: validated!,
    displaySymbol: validated!,
    providerSymbol: validated!,
    assetType: requestedAssetType,
    suggestions: marketSymbolSuggestions(validated),
  };
}

export function normalizeAssetType(assetType: unknown): MarketAssetType {
  const normalized = String(assetType ?? '').trim().toLowerCase();
  if (normalized === 'stocks') return 'stock';
  if (normalized === 'commodities') return 'commodity';
  if (normalized === 'indices' || normalized === 'indexes') return 'index';
  if (SUPPORTED_ASSET_TYPES.includes(normalized as MarketAssetType)) return normalized as MarketAssetType;
  return 'stock';
}
