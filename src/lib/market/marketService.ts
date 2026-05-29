export type MarketAssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold';
export type MarketTrend = 'bullish' | 'neutral' | 'bearish';
export type MarketRiskLevel = 'low' | 'medium' | 'high';
export type MarketDataStatus = 'live' | 'delayed' | 'unavailable';
export type FundamentalsUnavailableReason = 'not_supported_for_asset_type' | 'provider_returned_empty' | 'symbol_not_supported' | 'api_error';
export type MarketAiInsight = {
  status: 'ready' | 'unavailable' | 'skipped';
  provider?: 'anthropic' | 'rule-based';
  summary?: string;
  trendStatus?: string;
  riskNotes?: string;
  watchNext?: string[];
  error?: string;
};

export type MarketHistoryPoint = {
  date: string;
  close: number;
};

export type MarketAnalysis = {
  success: true;
  provider?: 'openbb';
  dataStatus?: MarketDataStatus;
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  currency?: string;
  latestPrice: number;
  changePercent: number;
  quote?: {
    price: number;
    change: number;
    changePercent: number;
    currency: string;
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
  providerSymbol?: string;
};

const SUPPORTED_ASSET_TYPES: MarketAssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold'];

export function validateSymbol(symbol: unknown) {
  const normalized = String(symbol ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9.=:/-]{1,24}$/.test(normalized)) return null;
  return normalized;
}

export function normalizeAssetType(assetType: unknown): MarketAssetType {
  const normalized = String(assetType ?? '').trim().toLowerCase();
  if (normalized === 'stocks') return 'stock';
  if (normalized === 'commodities') return 'commodity';
  if (SUPPORTED_ASSET_TYPES.includes(normalized as MarketAssetType)) return normalized as MarketAssetType;
  return 'stock';
}
