import type { MarketAiInsight, MarketAnalysis, MarketAssetType, MarketHistoryPoint, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import type { EconomicImpact, NormalizedEconomicEvent } from '@/lib/market/normalizeEconomicEvents';

export type MarketServiceState = 'checking' | 'connected' | 'degraded' | 'slow' | 'not_configured' | 'unavailable';
export type MarketViewAnalysis = MarketAnalysis & { source?: string; fallback?: boolean; fallbackReason?: string; marketDataService?: MarketServiceState };
export type WatchlistItem = { id?: string; symbol: string; assetType: MarketAssetType; name?: string | null; providerSymbol?: string | null; currency?: string | null; exchange?: string | null; country?: string | null; createdAt?: string | null };
export type SavedAlert = { id?: string; symbol: string; assetType: MarketAssetType; alertType: AlertType; threshold: number; currency?: string | null; exchange?: string | null; country?: string | null; createdAt?: string | null };
export type AlertType = 'above' | 'below' | 'change_exceeds' | 'rsi_above' | 'rsi_below';
export type SelectedMarketAsset = {
  symbol: string;
  providerSymbol?: string;
  name?: string;
  assetType: MarketAssetType;
  exchange?: string;
  country?: string;
  currency?: string | null;
};
export type PortfolioInvestment = {
  id: string;
  name: string;
  amount: number;
  currentValue: number;
  nativeMarketValue?: number | null;
  nativeCurrency?: string | null;
  type?: string | null;
  riskLevel?: string | null;
};
export type MarketTab = 'analyze' | 'traderTools' | 'economicCalendar' | 'sessions' | 'technicalAnalysis' | 'newsSentiment' | 'watchlist' | 'alerts' | 'comparison' | 'assetReport';
export type MarketAiInsightView = MarketAiInsight & { riskScore?: number };
export type MarketSearchSuggestion = MarketSearchItem & { provider?: string };
export type MarketResultWithMeta = MarketResult & {
  ok?: boolean;
  code?: string;
  message?: string;
  marketDataService?: MarketServiceState;
  source?: string;
  fallback?: boolean;
  fallbackReason?: string;
  suggestions?: unknown[];
  correction?: string | null;
};
export type MarketSearchResponse = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  results?: MarketSearchItem[];
  suggestions?: unknown[];
  resolved?: MarketSearchItem | null;
};
export type TraderToolsSubTab = 'risk' | 'pips' | 'lot' | 'margin' | 'performance';
export type MarketAssetFilter = MarketAssetType | 'all';
export type MarketPerformanceItem = {
  symbol: string;
  name: string;
  price: number;
  currency?: string | null;
  exchange?: string | null;
  country?: string | null;
  change_1d: number | null;
  change_1w: number | null;
  change_1m: number | null;
  asset_type: string;
  trend?: string;
  updated_at?: string;
};
export type ApiListState<T> = {
  loading: boolean;
  items: T[];
  message: string;
  updatedAt?: string;
  code?: string;
  symbol?: string;
  assetType?: string;
  provider?: string | null;
  source?: string | null;
  sentimentAvailable?: boolean;
  providerStatus?: string | null;
  cacheStatus?: string | null;
  cached?: boolean;
  stale?: boolean;
  lastCheckedAt?: string | null;
  checkedAt?: string | null;
  providerMessage?: string | null;
  buyPercent?: number | null;
  sellPercent?: number | null;
  sentimentLabel?: string | null;
  diagnostics?: Record<string, unknown> | null;
  loginStatus?: string | null;
  sessionReceived?: boolean;
  sessionUsed?: boolean;
  sentimentStatus?: string | null;
  communityOutlookStatus?: string | null;
  diagnosticSource?: string | null;
  suggestions?: string[];
};
export type TechnicalState = {
  loading: boolean;
  data: Record<string, any> | null;
  message: string;
  updatedAt?: string;
  available?: Record<string, any> | null;
  code?: string;
  symbol?: string;
};


export type MarketTimeframe = '1D' | '1W' | '1M' | '6M' | '1Y';
export type MarketChartType = 'line' | 'area' | 'candlestick' | 'ohlc';

export type ScenarioCurrencyCode = 'KWD' | 'USD' | 'SAR' | 'AED' | 'QAR' | 'BHD' | 'OMR' | 'EUR' | 'GBP';
export type AccountCurrencyCode = 'KWD' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'QAR' | 'BHD' | 'OMR' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD';

export type TechnicalSymbolCategory = 'forex' | 'stocks' | 'indices' | 'metals' | 'crypto';
export type TechnicalSymbolOption = {
  symbol: string;
  label: string;
  description: { ar: string; en: string; fr: string };
  category: TechnicalSymbolCategory;
  aliases?: string[];
};

export type PipCalculatorAssetType = 'forex' | 'metals' | 'oil' | 'indices' | 'crypto';
export type PipCalculatorAsset = {
  type: PipCalculatorAssetType;
  name: { ar: string; en: string; fr: string };
  symbol: string;
  internalSymbol: string;
  pointSize: number;
  defaultPointValue: number;
};

export type EconomicCalendarFilter = 'today' | 'week' | 'high' | 'USD' | 'EUR' | 'GBP' | 'JPY' | string;

export type EconomicCalendarEvent = {
  id: string;
  name: string;
  currency: string;
  country: string;
  impact: string;
  previous: string;
  forecast: string;
  actual: string;
  eventTime: Date | null;
  eventTimeLabel: string;
};
