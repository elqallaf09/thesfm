import { currencyDisplaySymbol, getCurrency } from '@/lib/currencies';
import { formatCurrency } from '@/lib/locale';
import { formatMarketPrice, marketCurrencyLabel, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import type { MarketAssetType, MarketSearchItem } from '@/lib/market/marketService';
import { normalizeAssetType } from '@/lib/market/marketService';
import type {
  AlertType, ApiListState, MarketAiInsightView, MarketAssetFilter, MarketChartType,
  MarketResultWithMeta, MarketSearchSuggestion, MarketServiceState, MarketTimeframe,
  MarketViewAnalysis, PipCalculatorAsset, PipCalculatorAssetType, ScenarioCurrencyCode,
  TechnicalState, TechnicalSymbolCategory, TechnicalSymbolOption, TraderToolsSubTab,
  ScenarioCurrencyCode, AccountCurrencyCode,
} from './types';

export type { MarketChartType, MarketTimeframe, ApiListState, TechnicalState,
  MarketSearchSuggestion, MarketAssetFilter, MarketViewAnalysis, PipCalculatorAsset,
  PipCalculatorAssetType, TechnicalSymbolOption, TechnicalSymbolCategory,
  ScenarioCurrencyCode, AccountCurrencyCode };

export const WATCHLIST_STORAGE_KEY = 'sfm_market_watchlist';
export const ALERTS_STORAGE_KEY = 'sfm_market_alerts';
export const DEFAULT_MARKET_TYPE: MarketAssetType = 'stock';
export const DEFAULT_MARKET_ASSET_FILTER: MarketAssetFilter = 'all';
export const MARKET_REQUEST_TIMEOUT_MS = 12000;
export const MARKET_SLOW_NOTICE_MS = 5000;
export const MARKET_TOOL_REQUEST_TIMEOUT_MS = 12000;
export const MARKET_TIMEFRAMES = ['1D', '1W', '1M', '6M', '1Y'] as const;
export const MARKET_CHART_TYPES = ['line', 'area', 'candlestick', 'ohlc'] as const;
export const MARKET_CHART_TYPE_STORAGE_KEY = 'sfm_market_chart_type';
type PriceHistoryPoint = {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
};
type PriceHistoryResponse = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  error?: string;
  symbol?: string;
  providerSymbol?: string;
  range?: MarketTimeframe;
  period?: string;
  interval?: string;
  points?: PriceHistoryPoint[];
  history?: MarketHistoryPoint[];
  source?: string;
  updated_at?: string;
  cached?: boolean;
};
export const SCENARIO_CURRENCY_OPTIONS = [
  { code: 'KWD', symbol: 'د.ك' },
  { code: 'USD', symbol: '$' },
  { code: 'SAR', symbol: 'ر.س' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'QAR', symbol: 'ر.ق' },
  { code: 'BHD', symbol: 'د.ب' },
  { code: 'OMR', symbol: 'ر.ع' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
] as const;
export const ACCOUNT_CURRENCY_OPTIONS = [
  'KWD',
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'AED',
  'QAR',
  'BHD',
  'OMR',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'NZD',
] as const;
export const QUICK_MARKET_EXAMPLES: MarketSearchItem[] = [
  { symbol: 'MSFT', providerSymbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', providerSymbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', providerSymbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'SPY', providerSymbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetType: 'etf', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', providerSymbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'etf', exchange: 'NASDAQ' },
  { symbol: 'BTC', providerSymbol: 'BTC-USD', name: 'Bitcoin', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'ETH', providerSymbol: 'ETH-USD', name: 'Ethereum', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'XAU', providerSymbol: 'GC=F', name: 'Gold', assetType: 'gold', exchange: 'COMEX' },
  { symbol: 'EURUSD', providerSymbol: 'EURUSD=X', name: 'Euro / US Dollar', assetType: 'forex', exchange: 'FX' },
  { symbol: '^GSPC', providerSymbol: '^GSPC', name: 'S&P 500 Index', assetType: 'index', exchange: 'CBOE' },
  { symbol: '^IXIC', providerSymbol: '^IXIC', name: 'Nasdaq Composite', assetType: 'index', exchange: 'NASDAQ' },
];
export const TECHNICAL_SYMBOL_CATEGORIES: TechnicalSymbolCategory[] = ['forex', 'stocks', 'indices', 'metals', 'crypto'];
export const TECHNICAL_SYMBOL_GROUPS: Record<TechnicalSymbolCategory, TechnicalSymbolOption[]> = {
  forex: [
    { symbol: 'EURUSD', label: 'EUR/USD', description: { ar: 'Euro / US Dollar', en: 'Euro / US Dollar', fr: 'Euro / dollar US' }, category: 'forex' },
    { symbol: 'GBPUSD', label: 'GBP/USD', description: { ar: 'British Pound / US Dollar', en: 'British Pound / US Dollar', fr: 'Livre sterling / dollar US' }, category: 'forex' },
    { symbol: 'USDJPY', label: 'USD/JPY', description: { ar: 'US Dollar / Japanese Yen', en: 'US Dollar / Japanese Yen', fr: 'Dollar US / yen japonais' }, category: 'forex' },
    { symbol: 'USDCHF', label: 'USD/CHF', description: { ar: 'US Dollar / Swiss Franc', en: 'US Dollar / Swiss Franc', fr: 'Dollar US / franc suisse' }, category: 'forex' },
    { symbol: 'AUDUSD', label: 'AUD/USD', description: { ar: 'Australian Dollar / US Dollar', en: 'Australian Dollar / US Dollar', fr: 'Dollar australien / dollar US' }, category: 'forex' },
    { symbol: 'NZDUSD', label: 'NZD/USD', description: { ar: 'New Zealand Dollar / US Dollar', en: 'New Zealand Dollar / US Dollar', fr: 'Dollar neo-zelandais / dollar US' }, category: 'forex' },
    { symbol: 'USDCAD', label: 'USD/CAD', description: { ar: 'US Dollar / Canadian Dollar', en: 'US Dollar / Canadian Dollar', fr: 'Dollar US / dollar canadien' }, category: 'forex' },
  ],
  stocks: [
    { symbol: 'AAPL', label: 'AAPL', description: { ar: 'Apple Inc.', en: 'Apple Inc.', fr: 'Apple Inc.' }, category: 'stocks' },
    { symbol: 'NVDA', label: 'NVDA', description: { ar: 'NVIDIA Corporation', en: 'NVIDIA Corporation', fr: 'NVIDIA Corporation' }, category: 'stocks' },
    { symbol: 'MSFT', label: 'MSFT', description: { ar: 'Microsoft Corporation', en: 'Microsoft Corporation', fr: 'Microsoft Corporation' }, category: 'stocks' },
    { symbol: 'TSLA', label: 'TSLA', description: { ar: 'Tesla Inc.', en: 'Tesla Inc.', fr: 'Tesla Inc.' }, category: 'stocks' },
  ],
  indices: [
    { symbol: 'QQQ', label: 'QQQ', description: { ar: 'Invesco QQQ Trust', en: 'Invesco QQQ Trust', fr: 'Invesco QQQ Trust' }, category: 'indices' },
    { symbol: 'SPY', label: 'SPY', description: { ar: 'SPDR S&P 500 ETF Trust', en: 'SPDR S&P 500 ETF Trust', fr: 'SPDR S&P 500 ETF Trust' }, category: 'indices' },
  ],
  metals: [
    { symbol: 'XAUUSD', label: 'XAU/USD', description: { ar: 'Gold / US Dollar', en: 'Gold / US Dollar', fr: 'Or / dollar US' }, category: 'metals' },
    { symbol: 'XAGUSD', label: 'XAG/USD', description: { ar: 'Silver / US Dollar', en: 'Silver / US Dollar', fr: 'Argent / dollar US' }, category: 'metals' },
  ],
  crypto: [
    { symbol: 'BTCUSD', label: 'BTC/USD', description: { ar: 'Bitcoin / US Dollar', en: 'Bitcoin / US Dollar', fr: 'Bitcoin / dollar US' }, category: 'crypto' },
    { symbol: 'ETHUSD', label: 'ETH/USD', description: { ar: 'Ethereum / US Dollar', en: 'Ethereum / US Dollar', fr: 'Ethereum / dollar US' }, category: 'crypto' },
  ],
};
export const TECHNICAL_SYMBOL_OPTIONS = Object.values(TECHNICAL_SYMBOL_GROUPS).flat();
export const TECHNICAL_SYMBOL_FAVORITES_KEY = 'sfm_market_technical_favorites';


export const PIP_CALCULATOR_ASSET_TYPES: PipCalculatorAssetType[] = ['forex', 'metals', 'oil', 'indices', 'crypto'];
export const PIP_CALCULATOR_ASSETS: Record<PipCalculatorAssetType, PipCalculatorAsset[]> = {
  forex: [
    { type: 'forex', name: { ar: 'يورو / دولار', en: 'Euro / US Dollar', fr: 'Euro / dollar US' }, symbol: 'EUR/USD', internalSymbol: 'EURUSD', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'جنيه إسترليني / دولار', en: 'British Pound / US Dollar', fr: 'Livre sterling / dollar US' }, symbol: 'GBP/USD', internalSymbol: 'GBPUSD', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'دولار / ين ياباني', en: 'US Dollar / Japanese Yen', fr: 'Dollar US / yen japonais' }, symbol: 'USD/JPY', internalSymbol: 'USDJPY', pointSize: 0.01, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'دولار / فرنك سويسري', en: 'US Dollar / Swiss Franc', fr: 'Dollar US / franc suisse' }, symbol: 'USD/CHF', internalSymbol: 'USDCHF', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'دولار أسترالي / دولار', en: 'Australian Dollar / US Dollar', fr: 'Dollar australien / dollar US' }, symbol: 'AUD/USD', internalSymbol: 'AUDUSD', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'دولار نيوزيلندي / دولار', en: 'New Zealand Dollar / US Dollar', fr: 'Dollar néo-zélandais / dollar US' }, symbol: 'NZD/USD', internalSymbol: 'NZDUSD', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'دولار / دولار كندي', en: 'US Dollar / Canadian Dollar', fr: 'Dollar US / dollar canadien' }, symbol: 'USD/CAD', internalSymbol: 'USDCAD', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'يورو / جنيه إسترليني', en: 'Euro / British Pound', fr: 'Euro / livre sterling' }, symbol: 'EUR/GBP', internalSymbol: 'EURGBP', pointSize: 0.0001, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'يورو / ين ياباني', en: 'Euro / Japanese Yen', fr: 'Euro / yen japonais' }, symbol: 'EUR/JPY', internalSymbol: 'EURJPY', pointSize: 0.01, defaultPointValue: 10 },
    { type: 'forex', name: { ar: 'جنيه إسترليني / ين ياباني', en: 'British Pound / Japanese Yen', fr: 'Livre sterling / yen japonais' }, symbol: 'GBP/JPY', internalSymbol: 'GBPJPY', pointSize: 0.01, defaultPointValue: 10 },
  ],
  metals: [
    { type: 'metals', name: { ar: 'الذهب', en: 'Gold', fr: 'Or' }, symbol: 'XAU/USD', internalSymbol: 'XAUUSD', pointSize: 0.01, defaultPointValue: 1 },
    { type: 'metals', name: { ar: 'الفضة', en: 'Silver', fr: 'Argent' }, symbol: 'XAG/USD', internalSymbol: 'XAGUSD', pointSize: 0.001, defaultPointValue: 1 },
    { type: 'metals', name: { ar: 'البلاتين', en: 'Platinum', fr: 'Platine' }, symbol: 'XPT/USD', internalSymbol: 'XPTUSD', pointSize: 0.01, defaultPointValue: 1 },
    { type: 'metals', name: { ar: 'البلاديوم', en: 'Palladium', fr: 'Palladium' }, symbol: 'XPD/USD', internalSymbol: 'XPDUSD', pointSize: 0.01, defaultPointValue: 1 },
  ],
  oil: [
    { type: 'oil', name: { ar: 'نفط خام WTI', en: 'WTI crude oil', fr: 'Pétrole brut WTI' }, symbol: 'XTI/USD', internalSymbol: 'XTIUSD', pointSize: 0.01, defaultPointValue: 1 },
    { type: 'oil', name: { ar: 'نفط برنت', en: 'Brent crude oil', fr: 'Pétrole Brent' }, symbol: 'XBR/USD', internalSymbol: 'XBRUSD', pointSize: 0.01, defaultPointValue: 1 },
  ],
  indices: [
    { type: 'indices', name: { ar: 'ناسداك 100', en: 'Nasdaq 100', fr: 'Nasdaq 100' }, symbol: 'NAS100', internalSymbol: 'NAS100', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'ستاندرد آند بورز 500', en: 'S&P 500', fr: 'S&P 500' }, symbol: 'SPX500', internalSymbol: 'SPX500', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'داو جونز', en: 'Dow Jones', fr: 'Dow Jones' }, symbol: 'US30', internalSymbol: 'US30', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'داكس الألماني', en: 'Germany DAX', fr: 'DAX allemand' }, symbol: 'GER40', internalSymbol: 'GER40', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'فوتسي البريطاني', en: 'UK FTSE', fr: 'FTSE britannique' }, symbol: 'UK100', internalSymbol: 'UK100', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'كاك الفرنسي', en: 'France CAC', fr: 'CAC français' }, symbol: 'FRA40', internalSymbol: 'FRA40', pointSize: 1, defaultPointValue: 1 },
    { type: 'indices', name: { ar: 'نيكاي الياباني', en: 'Japan Nikkei', fr: 'Nikkei japonais' }, symbol: 'JPN225', internalSymbol: 'JPN225', pointSize: 1, defaultPointValue: 1 },
  ],
  crypto: [
    { type: 'crypto', name: { ar: 'بيتكوين', en: 'Bitcoin', fr: 'Bitcoin' }, symbol: 'BTC/USD', internalSymbol: 'BTCUSD', pointSize: 1, defaultPointValue: 1 },
    { type: 'crypto', name: { ar: 'إيثريوم', en: 'Ethereum', fr: 'Ethereum' }, symbol: 'ETH/USD', internalSymbol: 'ETHUSD', pointSize: 1, defaultPointValue: 1 },
    { type: 'crypto', name: { ar: 'سولانا', en: 'Solana', fr: 'Solana' }, symbol: 'SOL/USD', internalSymbol: 'SOLUSD', pointSize: 0.01, defaultPointValue: 1 },
    { type: 'crypto', name: { ar: 'ريبل', en: 'Ripple', fr: 'Ripple' }, symbol: 'XRP/USD', internalSymbol: 'XRPUSD', pointSize: 0.0001, defaultPointValue: 1 },
    { type: 'crypto', name: { ar: 'كاردانو', en: 'Cardano', fr: 'Cardano' }, symbol: 'ADA/USD', internalSymbol: 'ADAUSD', pointSize: 0.0001, defaultPointValue: 1 },
  ],
};

export const DEFAULT_PIP_CALCULATOR_ASSET: PipCalculatorAsset = PIP_CALCULATOR_ASSETS.forex[0]!;

export function pipAssetTypeTranslationKey(type: PipCalculatorAssetType) {
  if (type === 'oil') return 'market_pip_asset_type_oil';
  if (type === 'metals') return 'market_symbol_category_metals';
  if (type === 'indices') return 'market_symbol_category_indices';
  if (type === 'crypto') return 'market_symbol_category_crypto';
  return 'market_symbol_category_forex';
}

export function pipAssetName(asset: PipCalculatorAsset, locale: string) {
  const lang = locale === 'fr' ? 'fr' : locale === 'en' ? 'en' : 'ar';
  return asset.name[lang];
}

export function getPipCalculatorAsset(type: PipCalculatorAssetType, internalSymbol: string) {
  const normalized = internalSymbol.trim().toUpperCase();
  return PIP_CALCULATOR_ASSETS[type].find(asset => asset.internalSymbol === normalized) ?? PIP_CALCULATOR_ASSETS[type][0] ?? DEFAULT_PIP_CALCULATOR_ASSET;
}

export function pipCalculatorWarningKey(type: PipCalculatorAssetType) {
  return `market_pip_value_warning_${type}`;
}

export function money(value: number, currency?: string | null, options?: { locale?: string | null; exchange?: string | null; symbol?: string | null; includeKuwaitDinarEquivalent?: boolean }) {
  return formatMarketPrice({
    price: value,
    currency,
    exchange: options?.exchange,
    symbol: options?.symbol,
    locale: options?.locale ?? 'ar',
    includeKuwaitDinarEquivalent: options?.includeKuwaitDinarEquivalent,
  });
}

export function percent(value: number | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`;
}

export function normalizePerformanceTrend(value?: string | null): 'bullish' | 'bearish' | 'neutral' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['bullish', 'up', 'positive', 'صاعد', 'haussier'].some(token => normalized.includes(token))) return 'bullish';
  if (['bearish', 'down', 'negative', 'هابط', 'baissier'].some(token => normalized.includes(token))) return 'bearish';
  return 'neutral';
}

export function getTechnicalSymbolOption(symbol: string) {
  const normalized = compactTechnicalSymbol(symbol);
  return TECHNICAL_SYMBOL_OPTIONS.find(item => item.symbol === normalized);
}

export function compactTechnicalSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase().replace(/[\s_-]+/g, '').replace(/\//g, '');
  return normalized.endsWith('=X') ? normalized.slice(0, -2) : normalized;
}

export function getTechnicalSymbolCategory(symbol: string): TechnicalSymbolCategory {
  return getTechnicalSymbolOption(symbol)?.category ?? 'forex';
}

export function technicalSymbolDescription(option: TechnicalSymbolOption | undefined, locale: string, t: (key: string) => string) {
  if (!option) return t('market_technical_symbol_used_for_analysis');
  const lang = locale === 'fr' ? 'fr' : locale === 'en' ? 'en' : 'ar';
  return option.description[lang];
}

export function technicalSymbolAssetType(symbol: string): MarketAssetType {
  const compact = compactTechnicalSymbol(symbol);
  if (compact.startsWith('XAG')) return 'commodity';
  const category = getTechnicalSymbolCategory(symbol);
  if (category === 'stocks') return 'stock';
  if (category === 'indices') return 'index';
  if (category === 'metals') return 'gold';
  if (category === 'crypto') return 'crypto';
  return 'forex';
}

export function formatTechnicalSymbol(symbol: string) {
  const normalized = compactTechnicalSymbol(symbol);
  return getTechnicalSymbolOption(normalized)?.label ?? normalized;
}

export function normalizeTechnicalSymbolInput(input: string) {
  const compact = compactTechnicalSymbol(input);
  if (!compact) return { valid: false as const, code: 'symbol_required' };
  const option = getTechnicalSymbolOption(compact);
  if (option) {
    const normalized = normalizeMarketSymbolInput(option.symbol, technicalSymbolAssetType(option.symbol));
    return {
      valid: true as const,
      symbol: option.symbol,
      displaySymbol: option.label,
      providerSymbol: normalized.valid ? normalized.providerSymbol : option.symbol,
      assetType: technicalSymbolAssetType(option.symbol),
      name: option.description.en,
      category: option.category,
    };
  }
  const normalized = normalizeMarketSymbolInput(input, 'all');
  if (!normalized.valid) {
    return { valid: false as const, code: normalized.code === 'symbol_not_found' ? 'unsupported_symbol' : 'invalid_symbol' };
  }
  const displaySymbol = formatTechnicalSymbol(normalized.symbol);
  return {
    valid: true as const,
    symbol: compactTechnicalSymbol(normalized.symbol),
    displaySymbol,
    providerSymbol: normalized.providerSymbol,
    assetType: normalized.assetType,
    name: displaySymbol,
    category: getTechnicalSymbolCategory(normalized.symbol),
  };
}

export function formatTechnicalTimestamp(value?: string, locale = 'ar') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number.isFinite(value) ? value : 0);
}

export function sanitizeMarketToolMessage(code: string, message: string) {
  if (
    code === 'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED' ||
    code === 'ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED' ||
    code === 'ECONOMIC_CALENDAR_NOT_CONFIGURED' ||
    code === 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED' ||
    code.startsWith('MARKET_SENTIMENT_') ||
    code.startsWith('MYFXBOOK_') ||
    code === 'NO_MARKET_SENTIMENT_DATA' ||
    code === 'NO_SENTIMENT_DATA' ||
    code === 'UNSUPPORTED_ASSET_TYPE' ||
    code === 'PROVIDER_DOWN' ||
    code === 'NO_DATA' ||
    code === 'RATE_LIMIT' ||
    code === 'LOGIN_FAILED' ||
    code === 'TIMEOUT' ||
    code === 'MISSING_CREDENTIALS' ||
    code === 'LOGIN_REJECTED' ||
    code === 'INVALID_SESSION' ||
    code === 'NO_SESSION' ||
    code === 'INVALID_FOREX_PAIR' ||
    code === 'MISSING_PROVIDER' ||
    code === 'SYMBOL_REQUIRED' ||
    code === 'MARKET_DATA_TIMEOUT' ||
    /ECONOMIC_CALENDAR_|\b[A-Z0-9_]*(API_)?(KEY|TOKEN|SECRET)\b|provider integration is not configured/i.test(message)
  ) {
    return '';
  }
  return message;
}

export function isAbortLikeError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export function marketToolFailureState<T>(error: unknown): ApiListState<T> {
  const isTimeout = isAbortLikeError(error);
  return {
    loading: false,
    items: [],
    message: isTimeout ? '' : error instanceof Error ? error.message : 'Data source is unavailable.',
    code: isTimeout ? 'MARKET_DATA_TIMEOUT' : 'MARKET_DATA_UNAVAILABLE',
  };
}

export function logMarketToolPerformance(label: string, startedAt: number, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  const durationMs = Math.round(globalThis.performance.now() - startedAt);
  console.info('[market-analysis] section loaded', { section: label, durationMs, ...meta });
}

export async function fetchMarketToolState<T>(url: string, label = url): Promise<ApiListState<T>> {
  const startedAt = globalThis.performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MARKET_TOOL_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const payload = await response.json().catch(() => ({})) as {
      items?: T[];
      events?: T[];
      message?: string;
      updated_at?: string | null;
      updatedAt?: string | null;
      code?: string | null;
      ok?: boolean;
      success?: boolean;
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
      suggestions?: unknown[];
    };
    const code = String(payload.code ?? '').trim().toUpperCase();
    const sourceAvailable = response.ok && payload.ok !== false && payload.success !== false;
    const rawMessage = sourceAvailable
      ? (label === 'market-sentiment' ? String(payload.message ?? '') : '')
      : String(payload.message ?? 'Data source is not configured.');
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.events) ? payload.events : [];
    logMarketToolPerformance(label, startedAt, {
      status: response.status,
      code,
      count: items.length,
      providerStatus: payload.providerStatus,
      cacheStatus: payload.cacheStatus,
      sentimentStatus: payload.sentimentStatus,
      communityOutlookStatus: payload.communityOutlookStatus,
      diagnosticSource: payload.diagnosticSource,
    });
    return {
      loading: false,
      items,
      message: sanitizeMarketToolMessage(code, rawMessage),
      updatedAt: payload.updated_at ?? payload.updatedAt ?? undefined,
      code,
      symbol: payload.symbol,
      assetType: payload.assetType,
      provider: payload.provider,
      source: payload.source,
      sentimentAvailable: payload.sentimentAvailable,
      providerStatus: payload.providerStatus,
      cacheStatus: payload.cacheStatus,
      cached: payload.cached,
      stale: payload.stale,
      lastCheckedAt: payload.lastCheckedAt ?? payload.checkedAt ?? undefined,
      checkedAt: payload.checkedAt ?? payload.lastCheckedAt ?? undefined,
      providerMessage: payload.providerMessage,
      buyPercent: payload.buyPercent,
      sellPercent: payload.sellPercent,
      sentimentLabel: payload.sentimentLabel,
      diagnostics: payload.diagnostics ?? null,
      loginStatus: payload.loginStatus,
      sessionReceived: payload.sessionReceived,
      sessionUsed: payload.sessionUsed,
      sentimentStatus: payload.sentimentStatus,
      communityOutlookStatus: payload.communityOutlookStatus,
      diagnosticSource: payload.diagnosticSource,
      suggestions: Array.isArray(payload.suggestions)
        ? payload.suggestions.map(item => String(item ?? '').trim()).filter(Boolean).slice(0, 4)
        : undefined,
    };
  } catch (error) {
    logMarketToolPerformance(label, startedAt, { status: 'failed', code: isAbortLikeError(error) ? 'MARKET_DATA_TIMEOUT' : 'MARKET_DATA_UNAVAILABLE' });
    return marketToolFailureState<T>(error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function normalizeSummaryLanguage(lang: string): EducationalSummaryLanguage {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

export function distancePercent(level: number, current: number) {
  if (!level || !current) return 0;
  return ((level - current) / current) * 100;
}

export function levelMarkerPercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function readableLevelMarkerPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(92, Math.max(8, value));
}

export function parseNumber(value: unknown) {
  const normalized = String(value ?? '')
    .replace(/[\u0660-\u0669]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '');
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0 && !/^n\/?a$/i.test(value.trim());
  return false;
}

export function finiteTechnicalNumber(...values: unknown[]) {
  for (const value of values) {
    if (!hasDisplayValue(value)) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function formatTechnicalNumberValue(value: unknown, maximumFractionDigits = 4) {
  const parsed = finiteTechnicalNumber(value);
  return parsed === null ? '' : formatNumber(parsed, maximumFractionDigits);
}

export function formatTechnicalPrice(value: unknown) {
  const parsed = finiteTechnicalNumber(value);
  if (parsed === null) return '';
  const digits = Math.abs(parsed) >= 10 ? 2 : 4;
  return formatNumber(parsed, digits);
}

export function technicalTrendLabelKey(trend: string) {
  const normalized = normalizePerformanceTrend(trend);
  return normalized === 'neutral' ? 'market_trend_sideways' : `market_trend_${normalized}`;
}

export function technicalRsiStatusKey(value: unknown) {
  const rsi = finiteTechnicalNumber(value);
  if (rsi === null) return null;
  if (rsi >= 70) return 'market_rsi_status_overbought';
  if (rsi <= 30) return 'market_rsi_status_oversold';
  return 'market_rsi_status_normal';
}

export function technicalSignalStrength(data: Record<string, any>, currentPrice: number | null, pivotValue: number | null) {
  const trend = normalizePerformanceTrend(String(data?.trend ?? 'neutral'));
  const rsi = finiteTechnicalNumber(data?.rsi);
  const sma20 = finiteTechnicalNumber(data?.movingAverages?.sma20, data?.sma20);
  const sma50 = finiteTechnicalNumber(data?.movingAverages?.sma50, data?.sma50);
  const sma200 = finiteTechnicalNumber(data?.movingAverages?.sma200, data?.sma200);
  let available = 0;
  let aligned = 0;

  if (trend !== 'neutral') {
    available += 1;
    aligned += 1;
  }

  if (currentPrice !== null && pivotValue !== null) {
    available += 1;
    if ((trend === 'bullish' && currentPrice >= pivotValue) || (trend === 'bearish' && currentPrice <= pivotValue)) {
      aligned += 1;
    }
  }

  if (rsi !== null) {
    available += 1;
    if (rsi > 35 && rsi < 65) aligned += 1;
  }

  if (sma20 !== null && sma50 !== null) {
    available += 1;
    if ((trend === 'bullish' && sma20 >= sma50) || (trend === 'bearish' && sma20 <= sma50)) {
      aligned += 1;
    }
  }

  if (sma20 !== null && sma200 !== null) {
    available += 1;
    if ((trend === 'bullish' && sma20 >= sma200) || (trend === 'bearish' && sma20 <= sma200)) {
      aligned += 1;
    }
  }

  if (available >= 4 && aligned >= 3) return 'strong';
  if (available >= 2 && aligned >= 1) return 'medium';
  return 'weak';
}

export function formatFundamentalValue(value: unknown) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2 }).format(value);
  }
  return String(value ?? '');
}

export function assetTypeTranslationKey(assetType: MarketAssetType) {
  const map: Record<MarketAssetType, keyof typeof import('@/lib/translations').TR> = {
    stock: 'market_asset_type_stock',
    etf: 'market_asset_type_etf',
    crypto: 'market_asset_type_crypto',
    forex: 'market_asset_type_forex',
    commodity: 'market_asset_type_commodity',
    gold: 'market_asset_type_gold',
    index: 'market_asset_type_index',
  };
  return map[assetType];
}

export function fundamentalsReasonTranslationKey(reason: MarketAnalysis['fundamentalsUnavailableReason']) {
  if (reason === 'not_supported_for_asset_type') return 'market_fundamentals_unsupported_asset';
  if (reason === 'api_error') return 'market_fundamentals_api_error';
  if (reason === 'symbol_not_supported') return 'market_fundamentals_symbol_not_supported';
  return 'market_fundamentals_unavailable_source';
}

export function cleanSearchText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s|:·,-]+|[\s|:·,-]+$/g, '')
    .trim();
}

export function normalizeSearchComparable(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s./:-]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactSearchComparable(value: unknown) {
  return normalizeSearchComparable(value).replace(/\s+/g, '');
}

export function normalizeSearchSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/]/g, '')
    .replace(/:/g, '');
}

export function marketSearchMatchRank(item: MarketSearchSuggestion, query: string) {
  const normalizedQuery = normalizeSearchComparable(query);
  const compactQuery = compactSearchComparable(query);
  const symbolQuery = normalizeSearchSymbol(query);
  if (!normalizedQuery || !compactQuery) return 1;

  const symbol = String(item.symbol ?? '').toUpperCase();
  const providerSymbol = String(item.providerSymbol ?? '').toUpperCase();
  const compactSymbol = normalizeSearchSymbol(item.symbol);
  const compactProviderSymbol = normalizeSearchSymbol(item.providerSymbol);
  const name = normalizeSearchComparable(item.name);
  const compactName = compactSearchComparable(item.name);
  const aliases = (item.aliases ?? []).map(alias => normalizeSearchComparable(alias)).filter(Boolean);
  const compactAliases = (item.aliases ?? []).map(alias => compactSearchComparable(alias)).filter(Boolean);
  const exactAliasMatch = aliases.some(alias => alias === normalizedQuery) || compactAliases.some(alias => alias === compactQuery);

  if (item.assetType === 'crypto' && exactAliasMatch) return 110;
  if (symbol === symbolQuery || providerSymbol === symbolQuery || compactSymbol === symbolQuery || compactProviderSymbol === symbolQuery) return 100;
  if (exactAliasMatch) return 95;
  if (symbol.startsWith(symbolQuery) || providerSymbol.startsWith(symbolQuery) || compactSymbol.startsWith(symbolQuery) || compactProviderSymbol.startsWith(symbolQuery)) return 90;
  if (name === normalizedQuery || compactName === compactQuery || name.startsWith(normalizedQuery) || compactName.startsWith(compactQuery)) return 80;
  if (name.includes(normalizedQuery) || compactName.includes(compactQuery)) return 70;
  if (aliases.some(alias => alias.startsWith(normalizedQuery)) || compactAliases.some(alias => alias.startsWith(compactQuery))) return 50;
  if (aliases.some(alias => alias.includes(normalizedQuery)) || compactAliases.some(alias => alias.includes(compactQuery))) return 40;
  return 0;
}

export function normalizeAssetSearchResult(result: Partial<MarketSearchItem> & Record<string, unknown>): MarketSearchSuggestion | null {
  const rawSymbol = cleanSearchText(result.symbol ?? result.ticker ?? result.providerSymbol ?? result.provider_symbol);
  const rawProviderSymbol = cleanSearchText(result.providerSymbol ?? result.provider_symbol ?? result.symbol ?? result.ticker);
  const symbol = validateSymbol(rawSymbol) ?? validateSymbol(rawProviderSymbol);
  const providerSymbol = validateSymbol(rawProviderSymbol) ?? symbol ?? undefined;
  const name = cleanSearchText(result.name ?? result.description ?? result.label ?? result.securityName ?? result.security_name ?? symbol);

  if (!symbol && !name) return null;

  const assetType = normalizeAssetType(result.assetType ?? result.asset_type ?? result.type);
  const exchange = cleanSearchText(result.exchange ?? result.market ?? result.venue ?? result.mic) || undefined;
  const country = cleanSearchText(result.country) || undefined;
  const aliases = Array.isArray(result.aliases)
    ? result.aliases.map(alias => cleanSearchText(alias)).filter(Boolean)
    : [];
  const currency = resolveMarketCurrency({
    providerCurrency: result.currency,
    symbol,
    providerSymbol,
    exchange,
    country,
    assetType,
  });

  return {
    symbol: symbol ?? name.toUpperCase(),
    providerSymbol,
    name: name || symbol || '',
    assetType,
    exchange,
    country,
    currency: currency.currency ?? undefined,
    currencySource: currency.source,
    provider: cleanSearchText(result.provider ?? result.source) || 'OpenBB',
    aliases,
  };
}

export function normalizeSearchItems(items: MarketSearchItem[], query: string, assetTypeFilter: MarketAssetFilter = 'all'): MarketSearchSuggestion[] {
  const seen = new Set<string>();
  const normalized = items
    .map(item => normalizeAssetSearchResult(item as Partial<MarketSearchItem> & Record<string, unknown>))
    .filter((item): item is MarketSearchSuggestion => Boolean(item))
    .filter(item => assetTypeFilter === 'all' || item.assetType === assetTypeFilter)
    .filter(item => {
      const key = `${item.symbol}-${item.providerSymbol ?? item.symbol}-${item.assetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return normalized
    .map(item => ({ item, rank: marketSearchMatchRank(item, query) }))
    .filter(entry => !query.trim() || entry.rank > 0)
    .sort((a, b) => {
      return b.rank - a.rank || a.item.symbol.localeCompare(b.item.symbol);
    })
    .map(entry => entry.item)
    .slice(0, 8);
}

export function findExactSearchMatch(items: MarketSearchSuggestion[], query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return undefined;
  const normalizedSymbolQuery = cleanQuery.toUpperCase();
  const normalizedNameQuery = cleanQuery.toLowerCase();
  return items.find(result => result.symbol.toUpperCase() === normalizedSymbolQuery || result.providerSymbol?.toUpperCase() === normalizedSymbolQuery)
    ?? items.find(result => result.name.toLowerCase() === normalizedNameQuery);
}

export function normalizeSearchItem(item: MarketSearchItem): MarketSearchSuggestion {
  return normalizeAssetSearchResult(item as Partial<MarketSearchItem> & Record<string, unknown>) ?? {
    symbol: '',
    name: '',
    assetType: DEFAULT_MARKET_TYPE,
  };
}

export function suggestionToMarketItem(suggestion: string | Partial<MarketSearchItem>): MarketSearchSuggestion {
  if (typeof suggestion !== 'string') {
    const normalized = normalizeAssetSearchResult(suggestion as Partial<MarketSearchItem> & Record<string, unknown>);
    if (normalized) return normalized;
  }
  const symbol = typeof suggestion === 'string' ? suggestion : String(suggestion.symbol ?? '');
  const normalized = normalizeMarketSymbolInput(symbol, 'all');
  const assetType = normalized.valid ? normalized.assetType : DEFAULT_MARKET_TYPE;
  const providerSymbol = normalized.valid ? normalized.providerSymbol : symbol;
  const exchange = normalized.valid && normalized.assetType === 'forex'
    ? 'FX'
    : normalized.valid && normalized.assetType === 'crypto'
      ? 'Crypto'
      : normalized.valid && normalized.assetType === 'gold'
        ? 'COMEX'
        : undefined;
  const currency = resolveMarketCurrency({
    symbol,
    providerSymbol,
    exchange,
    assetType,
  });
  return {
    symbol,
    providerSymbol,
    name: symbol,
    assetType,
    exchange,
    currency: currency.currency ?? undefined,
    currencySource: currency.source,
    provider: 'THE SFM',
  };
}

export function normalizeErrorSuggestions(value: unknown, query = '', includeFallback = true): MarketSearchSuggestion[] {
  const rawItems = Array.isArray(value) ? value : [];
  const normalized = rawItems
    .map(item => typeof item === 'string' ? suggestionToMarketItem(item) : normalizeAssetSearchResult(item as Partial<MarketSearchItem> & Record<string, unknown>))
    .filter((item): item is MarketSearchSuggestion => Boolean(item));
  const fallback = normalized.length > 0 || !includeFallback ? normalized : marketSymbolSuggestions(query).map(symbol => suggestionToMarketItem(symbol));
  const seen = new Set<string>();
  return fallback.filter(item => {
    const key = `${item.symbol}-${item.providerSymbol ?? item.symbol}-${item.assetType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

export function suggestionButtonLabel(item: MarketSearchSuggestion) {
  return item.name && item.name !== item.symbol ? `${item.symbol} - ${item.name}` : item.symbol;
}

export function normalizePublicMarketErrorCode(code: string | undefined) {
  const normalized = String(code ?? '').trim().toUpperCase();
  const map: Record<string, string> = {
    INVALID_SYMBOL: 'INVALID_SYMBOL',
    SYMBOL_NOT_FOUND: 'INVALID_SYMBOL',
    NO_DATA: 'NO_DATA',
    PROVIDER_NO_DATA: 'NO_DATA',
    PRICE_HISTORY_UNAVAILABLE: 'NO_DATA',
    PROVIDER_DOWN: 'PROVIDER_DOWN',
    OPENBB_UNREACHABLE: 'PROVIDER_DOWN',
    PROVIDER_ERROR: 'PROVIDER_DOWN',
    TIMEOUT: 'TIMEOUT',
    OPENBB_TIMEOUT: 'TIMEOUT',
    RATE_LIMIT: 'RATE_LIMIT',
    OPENBB_RATE_LIMIT: 'RATE_LIMIT',
  };
  return map[normalized] ?? normalized;
}

export function canAnalyzeDirectNormalizedInput(normalized: ReturnType<typeof normalizeMarketSymbolInput>) {
  if (!normalized.valid) return false;
  if (normalized.assetType === 'forex') return normalized.providerSymbol.endsWith('=X');
  if (normalized.assetType === 'crypto') return normalized.providerSymbol.includes('-') && normalized.providerSymbol !== normalized.symbol;
  if (normalized.assetType === 'gold' || normalized.assetType === 'commodity') return normalized.providerSymbol !== normalized.symbol;
  return normalized.assetType === 'index';
}

export function hasUsableAnalysis(result: MarketResult): result is MarketAnalysis {
  return Boolean(
    result.success
    && Number.isFinite(result.latestPrice)
    && result.latestPrice > 0
    && Array.isArray(result.history)
    && result.history.length > 0,
  );
}

export function historyFromPricePoints(points: PriceHistoryPoint[]): MarketHistoryPoint[] {
  return points
    .filter(point => {
      const time = String(point.time ?? '').trim();
      return time && Number.isFinite(new Date(time).getTime()) && Number.isFinite(point.close) && point.close > 0;
    })
    .map(point => ({
      date: point.time,
      open: point.open ?? undefined,
      high: point.high ?? undefined,
      low: point.low ?? undefined,
      close: point.close,
      volume: point.volume,
    }))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

export function normalizeChartType(value: unknown): MarketChartType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return MARKET_CHART_TYPES.includes(normalized as MarketChartType) ? normalized as MarketChartType : 'area';
}

export function hasCompleteOhlc(point: MarketHistoryPoint) {
  const open = Number(point.open);
  const high = Number(point.high);
  const low = Number(point.low);
  const close = Number(point.close);
  return [open, high, low, close].every(value => Number.isFinite(value) && value > 0)
    && high >= Math.max(open, close)
    && low <= Math.min(open, close);
}

export function formatChartTimestamp(value: string, locale: string, timeframe: MarketTimeframe) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const normalizedLocale = locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(normalizedLocale, timeframe === '1D'
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }).format(date);
}

export function chartErrorText(code: string | undefined, fallback: string | undefined, t: (key: string) => string) {
  if (code === 'invalid_symbol' || code === 'symbol_not_found') return t('market_chart_unsupported_symbol');
  if (code === 'provider_no_data' || code === 'PRICE_HISTORY_UNAVAILABLE') return t('market_chart_empty_range');
  if (code === 'openbb_timeout' || code === 'openbb_unreachable' || code === 'provider_error') return t('market_chart_provider_error');
  return fallback || t('market_chart_provider_error');
}

export function normalizeWatchlistRow(row: Record<string, unknown>): WatchlistItem {
  return {
    id: String(row.id ?? ''),
    symbol: String(row.symbol ?? '').toUpperCase(),
    assetType: normalizeAssetType(row.asset_type ?? row.assetType),
    name: typeof row.name === 'string' ? row.name : null,
    providerSymbol: typeof row.provider_symbol === 'string' ? row.provider_symbol : typeof row.providerSymbol === 'string' ? row.providerSymbol : null,
    currency: typeof row.currency === 'string' ? row.currency : null,
    exchange: typeof row.exchange === 'string' ? row.exchange : null,
    country: typeof row.country === 'string' ? row.country : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

export function normalizeAlertRow(row: Record<string, unknown>): SavedAlert {
  return {
    id: String(row.id ?? ''),
    symbol: String(row.symbol ?? '').toUpperCase(),
    assetType: normalizeAssetType(row.asset_type ?? row.assetType),
    alertType: normalizeAlertType(row.alert_type ?? row.alertType),
    threshold: parseNumber(row.threshold),
    currency: typeof row.currency === 'string' ? row.currency : null,
    exchange: typeof row.exchange === 'string' ? row.exchange : null,
    country: typeof row.country === 'string' ? row.country : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

export function normalizeInvestmentItem(row: Record<string, unknown>): PortfolioInvestment {
  const amount = parseNumber(row.converted_market_value ?? row.current_value ?? row.amount);
  const nativeMarketValue = parseNumber(row.native_market_value ?? row.current_market_value);
  const name = String(row.name ?? '').trim();
  return {
    id: String(row.id ?? ''),
    name,
    amount,
    currentValue: amount,
    nativeMarketValue: nativeMarketValue > 0 ? nativeMarketValue : null,
    nativeCurrency: typeof row.native_currency === 'string' ? row.native_currency : typeof row.price_currency === 'string' ? row.price_currency : typeof row.currency === 'string' ? row.currency : null,
    type: name || 'investment',
    riskLevel: 'medium',
  };
}

export function normalizeAlertType(value: unknown): AlertType {
  const normalized = String(value ?? '').trim();
  if (normalized === 'below' || normalized === 'change_exceeds' || normalized === 'rsi_above' || normalized === 'rsi_below') return normalized;
  return 'above';
}

export function formatSavedAlertThreshold(alert: SavedAlert, locale: string) {
  if (alert.alertType === 'change_exceeds') return `${formatNumber(alert.threshold, 2)}%`;
  if (alert.alertType === 'rsi_above' || alert.alertType === 'rsi_below') return formatNumber(alert.threshold, 0);
  return money(alert.threshold, alert.currency, { locale, exchange: alert.exchange, symbol: alert.symbol });
}

export function readLocalList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function writeLocalList<T>(key: string, value: T[]) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeMarketTab(value: string | null | undefined): MarketTab | null {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .replace(/_/g, '-')
    .toLowerCase();

  if (normalized === 'analysis' || normalized === 'analyze') return 'analyze';
  if (normalized === 'trader-tools' || normalized === 'tradertools' || normalized === 'tools') return 'traderTools';
  if (normalized === 'economic-calendar' || normalized === 'calendar') return 'economicCalendar';
  if (normalized === 'sessions' || normalized === 'trading-sessions') return 'sessions';
  if (normalized === 'technical-analysis' || normalized === 'technical') return 'technicalAnalysis';
  if (normalized === 'news-sentiment' || normalized === 'news' || normalized === 'sentiment') return 'newsSentiment';
  if (normalized === 'watchlist' || normalized === 'market-watchlist') return 'watchlist';
  if (normalized === 'alerts' || normalized === 'market-alerts' || normalized === 'price-alerts') return 'alerts';
  if (normalized === 'comparison' || normalized === 'compare') return 'comparison';
  if (normalized === 'asset-report' || normalized === 'assetreport' || normalized === 'report') return 'assetReport';
  return null;
}

export async function fetchJsonWithTimeout<T>(url: string, timeoutMs = MARKET_REQUEST_TIMEOUT_MS, allowErrorStatus = false, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const json = await response.json().catch(() => ({}));
    if (!response.ok && !allowErrorStatus) {
      const message = typeof json?.error === 'string' ? json.error : `HTTP ${response.status}`;
      throw new Error(message);
    }
    return json as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function marketErrorText(code: string | undefined, fallback: string, t: (key: string) => string) {
  if (!code) return fallback;
  const publicCode = normalizePublicMarketErrorCode(code);
  const publicMap: Record<string, string> = {
    INVALID_SYMBOL: t('market_symbol_not_found_helpful'),
    NO_DATA: t('market_no_data_for_symbol'),
    PROVIDER_DOWN: t('market_service_unavailable'),
    TIMEOUT: t('market_timeout_error'),
    RATE_LIMIT: t('market_rate_limit_error'),
  };
  if (publicMap[publicCode]) return publicMap[publicCode];
  const map: Record<string, string> = {
    openbb_unreachable: t('market_service_unavailable'),
    openbb_timeout: t('market_timeout_error'),
    openbb_rate_limit: t('market_rate_limit_error'),
    symbol_not_found: t('market_symbol_not_found_helpful'),
    invalid_symbol: t('market_symbol_not_found_helpful'),
    provider_no_data: t('market_no_data_for_symbol'),
    provider_error: t('market_service_unavailable'),
    response_mapping_failed: t('market_provider_no_real_data'),
    ai_skipped_no_market_data: t('market_no_real_data_ai'),
  };
  return map[code] || fallback;
}

export function marketAiInsightErrorText(code: string | undefined, t: (key: string) => string) {
  const normalized = String(code ?? '').trim().toUpperCase();
  const map: Record<string, string> = {
    AI_PROVIDER_NOT_CONFIGURED: t('market_ai_provider_not_configured'),
    AI_PROVIDER_AUTH_FAILED: t('market_ai_auth_failed'),
    AI_PROVIDER_QUOTA_EXCEEDED: t('market_ai_quota_exceeded'),
    AI_PROVIDER_RATE_LIMITED: t('market_ai_rate_limited'),
    AI_PROVIDER_TIMEOUT: t('market_ai_timeout'),
    AI_PROVIDER_BAD_REQUEST: t('market_ai_bad_request'),
    MARKET_DATA_REQUIRED: t('market_ai_market_data_required'),
    AI_PROVIDER_UNAVAILABLE: t('market_ai_provider_unavailable_clean'),
    AI_INSIGHT_INTERNAL_ERROR: t('market_ai_internal_error'),
  };
  return map[normalized] || t('market_ai_summary_error');
}

export function invalidSymbolMessage(t: (key: string) => string, correction?: string | null) {
  return correction
    ? t('market_invalid_symbol_did_you_mean').replace('{symbol}', correction)
    : t('market_symbol_not_found_helpful');
}

export function normalizeProviderSymbolForRequest(value: string | undefined | null) {
  const symbol = validateSymbol(value);
  if (!symbol) return null;
  return validateSymbol(symbol.includes(':') ? symbol.split(':').pop() || symbol : symbol);
}

export function marketAssetTypeLabel(assetType: MarketAssetType, t: (key: string) => string) {
  const keyMap: Record<MarketAssetType, string> = {
    stock: 'market_asset_stocks',
    etf: 'market_asset_etf',
    crypto: 'market_asset_crypto',
    forex: 'market_asset_forex',
    commodity: 'market_asset_commodities',
    gold: 'market_asset_gold',
    index: 'market_asset_index',
  };
  return t(keyMap[assetType]);
}

type SentimentAssetBadgeType = 'forex' | 'stock' | 'etf' | 'crypto' | 'gold' | 'silver' | 'metals' | 'index' | 'unknown';

export function compactSentimentSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/=X$/, '')
    .replace(/[\s/_-]+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

export function sentimentAssetBadgeType(assetType: unknown, selectedAsset?: SelectedMarketAsset | null): SentimentAssetBadgeType {
  const normalized = String(assetType ?? selectedAsset?.assetType ?? '').trim().toLowerCase();
  const symbol = compactSentimentSymbol(selectedAsset?.symbol ?? selectedAsset?.providerSymbol);
  if (normalized === 'stock') return 'stock';
  if (normalized === 'etf') return 'etf';
  if (normalized === 'forex') return 'forex';
  if (normalized === 'crypto') return 'crypto';
  if (normalized === 'index') return 'index';
  if (normalized === 'gold' || symbol.startsWith('XAU') || symbol === 'GC') return 'gold';
  if (symbol.startsWith('XAG') || symbol === 'SI') return 'silver';
  if (normalized === 'metal' || normalized === 'metals' || normalized === 'commodity') return 'metals';
  return 'unknown';
}

export function sentimentAssetBadgeKey(assetType: SentimentAssetBadgeType) {
  const map: Record<SentimentAssetBadgeType, string> = {
    forex: 'market_sentiment_asset_type_forex',
    stock: 'market_sentiment_asset_type_stock',
    etf: 'market_sentiment_asset_type_etf',
    crypto: 'market_sentiment_asset_type_crypto',
    gold: 'market_sentiment_asset_type_gold',
    silver: 'market_sentiment_asset_type_silver',
    metals: 'market_sentiment_asset_type_metals',
    index: 'market_sentiment_asset_type_index',
    unknown: 'market_asset_type_unknown',
  };
  return map[assetType];
}

export function sentimentProviderBadgeKey(provider: unknown, sentimentAvailable: boolean | undefined, assetType: SentimentAssetBadgeType) {
  const normalized = String(provider ?? '').trim().toLowerCase();
  if (
    normalized === 'myfxbook'
    && (assetType === 'forex' || assetType === 'gold' || assetType === 'silver' || assetType === 'metals')
  ) return 'market_sentiment_provider_myfxbook';
  if (normalized === 'news' && sentimentAvailable) return 'market_sentiment_provider_news';
  return 'market_sentiment_provider_none';
}

export function sentimentAssetEmptyBodyKey(assetType: SentimentAssetBadgeType) {
  if (assetType === 'stock') return 'market_sentiment_empty_stock_body';
  if (assetType === 'etf') return 'market_sentiment_empty_etf_body';
  if (assetType === 'forex') return 'market_sentiment_empty_forex_body';
  if (assetType === 'gold' || assetType === 'silver' || assetType === 'metals') return 'market_sentiment_empty_metals_body';
  if (assetType === 'crypto') return 'market_sentiment_empty_crypto_body';
  return 'market_sentiment_empty_unknown_body';
}

export function sentimentContextBodyKey(assetType: SentimentAssetBadgeType) {
  if (assetType === 'stock') return 'market_sentiment_context_stock_body';
  if (assetType === 'etf') return 'market_sentiment_context_etf_body';
  if (assetType === 'forex') return 'market_sentiment_context_forex_body';
  if (assetType === 'gold' || assetType === 'silver' || assetType === 'metals') return 'market_sentiment_context_metals_body';
  if (assetType === 'crypto') return 'market_sentiment_context_crypto_body';
  return 'market_sentiment_context_unknown_body';
}

export function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function normalizeScenarioCurrency(value: string | null | undefined): ScenarioCurrencyCode {
  const normalized = String(value ?? '').trim().toUpperCase();
  return SCENARIO_CURRENCY_OPTIONS.some(option => option.code === normalized)
    ? normalized as ScenarioCurrencyCode
    : 'KWD';
}

export function normalizeAccountCurrency(value: string | null | undefined): AccountCurrencyCode {
  const normalized = String(value ?? '').trim().toUpperCase();
  return ACCOUNT_CURRENCY_OPTIONS.includes(normalized as AccountCurrencyCode)
    ? normalized as AccountCurrencyCode
    : 'KWD';
}


export function technicalEmptyStateCopy(code: string | undefined, t: (key: string) => string) {
  const normalizedCode = String(code ?? '').toUpperCase();
  if (normalizedCode === 'MARKET_DATA_TIMEOUT') {
    return { title: t('market_section_timeout_title'), body: t('market_section_timeout_body') };
  }
  if (normalizedCode === 'SYMBOL_REQUIRED') {
    return { title: t('market_technical_choose_asset_title'), body: t('market_technical_symbol_required_body') };
  }
  if (normalizedCode === 'UNSUPPORTED_SYMBOL') {
    return { title: t('market_technical_unified_empty_title'), body: t('market_technical_unsupported_symbol_body') };
  }
  if (normalizedCode === 'OHLC_DATA_NOT_AVAILABLE') {
    return { title: t('market_technical_partial_title'), body: t('market_technical_ohlc_unavailable_body') };
  }
  if (normalizedCode === 'PROVIDER_UNAVAILABLE' || normalizedCode === 'MARKET_DATA_UNAVAILABLE') {
    return { title: t('market_analysis_unavailable'), body: t('market_technical_provider_unavailable_body') };
  }
  return { title: t('market_technical_unified_empty_title'), body: t('market_technical_unified_empty_body') };
}
