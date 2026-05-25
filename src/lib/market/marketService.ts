export type MarketAssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold';
export type MarketTrend = 'bullish' | 'neutral' | 'bearish';
export type MarketRiskLevel = 'low' | 'medium' | 'high';

export type MarketHistoryPoint = {
  date: string;
  close: number;
};

export type MarketAnalysis = {
  success: true;
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  latestPrice: number;
  changePercent: number;
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
};

export type MarketError = {
  success: false;
  error: string;
  source?: string;
  fallback?: false;
  openbbService?: 'connected' | 'not_configured' | 'unavailable';
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
