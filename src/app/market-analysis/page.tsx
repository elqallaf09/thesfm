'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Brain, CalendarDays, Calculator, CheckCircle2, Clock3, FileText, Gauge, Landmark, LineChart, Newspaper, Plus, Search, ShieldAlert, Sparkles, Star, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { PageTabs } from '@/components/layout/PageTabs';
import { AssetProfileCard } from '@/components/market/AssetProfileCard';
import { TradingViewChart } from '@/components/market/TradingViewChart';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { currencyDisplaySymbol, getCurrency } from '@/lib/currencies';
import { formatCurrency } from '@/lib/locale';
import { useCurrency } from '@/lib/useCurrency';
import { generateEducationalMarketSummary, type EducationalSummaryLanguage } from '@/lib/market/generateEducationalMarketSummary';
import { normalizeEconomicEvents, type EconomicImpact, type NormalizedEconomicEvent } from '@/lib/market/normalizeEconomicEvents';
import type { AssetProfileResponse } from '@/lib/market/fetchAssetProfile';
import type { MarketAiInsight, MarketAnalysis, MarketAssetType, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import { marketSymbolSuggestions, normalizeAssetType, normalizeMarketSymbolInput, validateSymbol } from '@/lib/market/marketService';
import { calculateLotSizeByRisk, calculatePips, calculatePositionSize, type TradeDirection, type TradingInstrumentType } from '@/lib/trading/calculators';
import { getActiveOverlapIds, getTradingSessionsState, isHighLiquidityPeriod, TRADING_OVERLAPS } from '@/lib/trading/sessions';

type MarketServiceState = 'checking' | 'connected' | 'degraded' | 'slow' | 'not_configured' | 'unavailable';
type MarketViewAnalysis = MarketAnalysis & { source?: string; fallback?: boolean; fallbackReason?: string; openbbService?: MarketServiceState };
type WatchlistItem = { id?: string; symbol: string; assetType: MarketAssetType; name?: string | null; createdAt?: string | null };
type SavedAlert = { id?: string; symbol: string; assetType: MarketAssetType; alertType: AlertType; threshold: number; createdAt?: string | null };
type AlertType = 'above' | 'below' | 'change_exceeds' | 'rsi_above' | 'rsi_below';
type SelectedMarketAsset = {
  symbol: string;
  providerSymbol?: string;
  name?: string;
  assetType: MarketAssetType;
  exchange?: string;
};
type PortfolioInvestment = {
  id: string;
  name: string;
  amount: number;
  currentValue: number;
  type?: string | null;
  riskLevel?: string | null;
};
type MarketTab = 'analyze' | 'traderTools' | 'economicCalendar' | 'sessions' | 'technicalAnalysis' | 'newsSentiment' | 'watchlist' | 'alerts' | 'comparison' | 'assetReport';
type MarketAiInsightView = MarketAiInsight & { riskScore?: number };
type MarketSearchSuggestion = MarketSearchItem & { provider?: string };
type MarketResultWithMeta = MarketResult & {
  code?: string;
  openbbService?: MarketServiceState;
  source?: string;
  fallback?: boolean;
  fallbackReason?: string;
  suggestions?: string[];
  correction?: string | null;
};
type TraderToolsSubTab = 'risk' | 'pips' | 'lot' | 'performance';
type MarketPerformanceItem = {
  symbol: string;
  name: string;
  price: number;
  change_1d: number | null;
  change_1w: number | null;
  change_1m: number | null;
  asset_type: string;
  trend?: string;
  updated_at?: string;
};
type ApiListState<T> = {
  loading: boolean;
  items: T[];
  message: string;
  updatedAt?: string;
  code?: string;
};
type TechnicalState = {
  loading: boolean;
  data: Record<string, any> | null;
  message: string;
  updatedAt?: string;
  available?: Record<string, any> | null;
  code?: string;
  symbol?: string;
};

const WATCHLIST_STORAGE_KEY = 'sfm_market_watchlist';
const ALERTS_STORAGE_KEY = 'sfm_market_alerts';
const DEFAULT_MARKET_TYPE: MarketAssetType = 'stock';
const MARKET_REQUEST_TIMEOUT_MS = 12000;
const MARKET_SLOW_NOTICE_MS = 5000;
const MARKET_TIMEFRAMES = ['1D', '1W', '1M', '6M', '1Y'] as const;
const SCENARIO_CURRENCY_OPTIONS = [
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
type ScenarioCurrencyCode = typeof SCENARIO_CURRENCY_OPTIONS[number]['code'];
const ACCOUNT_CURRENCY_OPTIONS = [
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
type AccountCurrencyCode = typeof ACCOUNT_CURRENCY_OPTIONS[number];
const QUICK_MARKET_EXAMPLES: MarketSearchItem[] = [
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
type TechnicalSymbolCategory = 'forex' | 'stocks' | 'indices' | 'metals' | 'crypto';
type TechnicalSymbolOption = {
  symbol: string;
  label: string;
  category: TechnicalSymbolCategory;
};
const TECHNICAL_SYMBOL_CATEGORIES: TechnicalSymbolCategory[] = ['forex', 'stocks', 'indices', 'metals', 'crypto'];
const TECHNICAL_SYMBOL_GROUPS: Record<TechnicalSymbolCategory, TechnicalSymbolOption[]> = {
  forex: [
    { symbol: 'EURUSD', label: 'EUR/USD', category: 'forex' },
    { symbol: 'GBPUSD', label: 'GBP/USD', category: 'forex' },
    { symbol: 'USDJPY', label: 'USD/JPY', category: 'forex' },
    { symbol: 'USDCHF', label: 'USD/CHF', category: 'forex' },
    { symbol: 'AUDUSD', label: 'AUD/USD', category: 'forex' },
    { symbol: 'NZDUSD', label: 'NZD/USD', category: 'forex' },
    { symbol: 'USDCAD', label: 'USD/CAD', category: 'forex' },
  ],
  stocks: [
    { symbol: 'AAPL', label: 'AAPL', category: 'stocks' },
    { symbol: 'NVDA', label: 'NVDA', category: 'stocks' },
    { symbol: 'MSFT', label: 'MSFT', category: 'stocks' },
  ],
  indices: [
    { symbol: 'SPY', label: 'SPY', category: 'indices' },
    { symbol: 'QQQ', label: 'QQQ', category: 'indices' },
  ],
  metals: [
    { symbol: 'XAUUSD', label: 'XAU/USD', category: 'metals' },
  ],
  crypto: [
    { symbol: 'BTCUSD', label: 'BTC/USD', category: 'crypto' },
    { symbol: 'ETHUSD', label: 'ETH/USD', category: 'crypto' },
  ],
};
const TECHNICAL_SYMBOL_OPTIONS = Object.values(TECHNICAL_SYMBOL_GROUPS).flat();
const TECHNICAL_SYMBOL_FAVORITES_KEY = 'sfm_market_technical_favorites';
const TRADER_TOOL_TABS: TraderToolsSubTab[] = ['risk', 'pips', 'lot', 'performance'];

function money(value: number, currency = 'USD') {
  const maximumFractionDigits = value > 1000 ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits })}`;
  }
}

function percent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function normalizePerformanceTrend(value?: string | null): 'bullish' | 'bearish' | 'neutral' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['bullish', 'up', 'positive', 'صاعد', 'haussier'].some(token => normalized.includes(token))) return 'bullish';
  if (['bearish', 'down', 'negative', 'هابط', 'baissier'].some(token => normalized.includes(token))) return 'bearish';
  return 'neutral';
}

function getTechnicalSymbolOption(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return TECHNICAL_SYMBOL_OPTIONS.find(item => item.symbol === normalized);
}

function getTechnicalSymbolCategory(symbol: string): TechnicalSymbolCategory {
  return getTechnicalSymbolOption(symbol)?.category ?? 'forex';
}

function formatTechnicalSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return getTechnicalSymbolOption(normalized)?.label ?? normalized;
}

function formatTechnicalTimestamp(value?: string, locale = 'ar') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number.isFinite(value) ? value : 0);
}

function sanitizeMarketToolMessage(code: string, message: string) {
  if (
    code === 'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED' ||
    code === 'ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED' ||
    code === 'ECONOMIC_CALENDAR_NOT_CONFIGURED' ||
    code === 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED' ||
    code === 'MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED' ||
    /ECONOMIC_CALENDAR_|\b[A-Z0-9_]*(API_)?(KEY|TOKEN|SECRET)\b|provider integration is not configured/i.test(message)
  ) {
    return '';
  }
  return message;
}

async function fetchMarketToolState<T>(url: string): Promise<ApiListState<T>> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({})) as { items?: T[]; events?: T[]; message?: string; updated_at?: string | null; code?: string; ok?: boolean; success?: boolean };
    const code = String(payload.code ?? '').trim().toUpperCase();
    const sourceAvailable = response.ok && payload.ok !== false && payload.success !== false;
    const rawMessage = sourceAvailable ? '' : String(payload.message ?? 'Data source is not configured.');
    return {
      loading: false,
      items: Array.isArray(payload.items) ? payload.items : Array.isArray(payload.events) ? payload.events : [],
      message: sanitizeMarketToolMessage(code, rawMessage),
      updatedAt: payload.updated_at ?? undefined,
      code,
    };
  } catch (error) {
    return {
      loading: false,
      items: [],
      message: error instanceof Error ? error.message : 'Data source is unavailable.',
    };
  }
}

function normalizeSummaryLanguage(lang: string): EducationalSummaryLanguage {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

function distancePercent(level: number, current: number) {
  if (!level || !current) return 0;
  return ((level - current) / current) * 100;
}

function parseNumber(value: unknown) {
  const normalized = String(value ?? '')
    .replace(/[\u0660-\u0669]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u06F0-\u06F9]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '');
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0 && !/^n\/?a$/i.test(value.trim());
  return false;
}

function formatFundamentalValue(value: unknown) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2 }).format(value);
  }
  return String(value ?? '');
}

function assetTypeTranslationKey(assetType: MarketAssetType) {
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

function fundamentalsReasonTranslationKey(reason: MarketAnalysis['fundamentalsUnavailableReason']) {
  if (reason === 'not_supported_for_asset_type') return 'market_fundamentals_unsupported_asset';
  if (reason === 'api_error') return 'market_fundamentals_api_error';
  if (reason === 'symbol_not_supported') return 'market_fundamentals_symbol_not_supported';
  return 'market_fundamentals_unavailable_source';
}

function cleanSearchText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s|:·,-]+|[\s|:·,-]+$/g, '')
    .trim();
}

function normalizeAssetSearchResult(result: Partial<MarketSearchItem> & Record<string, unknown>): MarketSearchSuggestion | null {
  const rawSymbol = cleanSearchText(result.symbol ?? result.ticker ?? result.providerSymbol ?? result.provider_symbol);
  const rawProviderSymbol = cleanSearchText(result.providerSymbol ?? result.provider_symbol ?? result.symbol ?? result.ticker);
  const symbol = validateSymbol(rawSymbol) ?? validateSymbol(rawProviderSymbol);
  const providerSymbol = validateSymbol(rawProviderSymbol) ?? symbol ?? undefined;
  const name = cleanSearchText(result.name ?? result.description ?? result.label ?? result.securityName ?? result.security_name ?? symbol);

  if (!symbol && !name) return null;

  return {
    symbol: symbol ?? name.toUpperCase(),
    providerSymbol,
    name: name || symbol || '',
    assetType: normalizeAssetType(result.assetType ?? result.asset_type ?? result.type),
    exchange: cleanSearchText(result.exchange ?? result.market ?? result.venue ?? result.mic) || undefined,
    country: cleanSearchText(result.country) || undefined,
    currency: cleanSearchText(result.currency) || undefined,
    provider: cleanSearchText(result.provider ?? result.source) || 'OpenBB',
  };
}

function normalizeSearchItems(items: MarketSearchItem[], query: string): MarketSearchSuggestion[] {
  const normalizedQuery = query.trim().toUpperCase();
  const seen = new Set<string>();
  const normalized = items
    .map(item => normalizeAssetSearchResult(item as Partial<MarketSearchItem> & Record<string, unknown>))
    .filter((item): item is MarketSearchSuggestion => Boolean(item))
    .filter(item => {
      const key = `${item.symbol}-${item.providerSymbol ?? item.symbol}-${item.assetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return normalized
    .sort((a, b) => {
      const score = (item: MarketSearchSuggestion) => {
        const symbol = item.symbol.toUpperCase();
        const providerSymbol = item.providerSymbol?.toUpperCase() ?? '';
        const name = item.name.toUpperCase();
        if (symbol === normalizedQuery || providerSymbol === normalizedQuery) return 0;
        if (symbol.startsWith(normalizedQuery) || providerSymbol.startsWith(normalizedQuery)) return 1;
        if (name.startsWith(normalizedQuery)) return 2;
        if (name.includes(normalizedQuery)) return 3;
        return 4;
      };
      return score(a) - score(b) || a.symbol.localeCompare(b.symbol);
    })
    .slice(0, 8);
}

function normalizeSearchItem(item: MarketSearchItem): MarketSearchSuggestion {
  return normalizeAssetSearchResult(item as Partial<MarketSearchItem> & Record<string, unknown>) ?? {
    symbol: '',
    name: '',
    assetType: DEFAULT_MARKET_TYPE,
  };
}

function suggestionToMarketItem(symbol: string): MarketSearchItem {
  const normalized = normalizeMarketSymbolInput(symbol, 'all');
  return {
    symbol,
    providerSymbol: normalized.valid ? normalized.providerSymbol : symbol,
    name: symbol,
    assetType: normalized.valid ? normalized.assetType : DEFAULT_MARKET_TYPE,
    exchange: normalized.valid && normalized.assetType === 'forex'
      ? 'FX'
      : normalized.valid && normalized.assetType === 'crypto'
        ? 'Crypto'
        : normalized.valid && normalized.assetType === 'gold'
          ? 'COMEX'
          : undefined,
  };
}

function hasUsableAnalysis(result: MarketResult): result is MarketAnalysis {
  return Boolean(
    result.success
    && Number.isFinite(result.latestPrice)
    && result.latestPrice > 0
    && Array.isArray(result.history)
    && result.history.length > 0,
  );
}

function normalizeWatchlistRow(row: Record<string, unknown>): WatchlistItem {
  return {
    id: String(row.id ?? ''),
    symbol: String(row.symbol ?? '').toUpperCase(),
    assetType: normalizeAssetType(row.asset_type ?? row.assetType),
    name: typeof row.name === 'string' ? row.name : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

function normalizeAlertRow(row: Record<string, unknown>): SavedAlert {
  return {
    id: String(row.id ?? ''),
    symbol: String(row.symbol ?? '').toUpperCase(),
    assetType: normalizeAssetType(row.asset_type ?? row.assetType),
    alertType: normalizeAlertType(row.alert_type ?? row.alertType),
    threshold: parseNumber(row.threshold),
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

function normalizeInvestmentItem(row: Record<string, unknown>): PortfolioInvestment {
  const amount = parseNumber(row.amount);
  const name = String(row.name ?? '').trim();
  return {
    id: String(row.id ?? ''),
    name,
    amount,
    currentValue: amount,
    type: name || 'investment',
    riskLevel: 'medium',
  };
}

function normalizeAlertType(value: unknown): AlertType {
  const normalized = String(value ?? '').trim();
  if (normalized === 'below' || normalized === 'change_exceeds' || normalized === 'rsi_above' || normalized === 'rsi_below') return normalized;
  return 'above';
}

function readLocalList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeLocalList<T>(key: string, value: T[]) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function normalizeMarketTab(value: string | null | undefined): MarketTab | null {
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

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = MARKET_REQUEST_TIMEOUT_MS, allowErrorStatus = false, init?: RequestInit): Promise<T> {
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

function marketErrorText(code: string | undefined, fallback: string, t: (key: string) => string) {
  if (!code) return fallback;
  const map: Record<string, string> = {
    openbb_unreachable: t('market_service_unavailable'),
    openbb_timeout: t('market_timeout_error'),
    symbol_not_found: t('market_symbol_not_found_helpful'),
    invalid_symbol: t('market_symbol_not_found_helpful'),
    provider_no_data: t('market_no_data_for_symbol'),
    provider_error: t('market_service_unavailable'),
    response_mapping_failed: t('market_provider_no_real_data'),
    ai_skipped_no_market_data: t('market_no_real_data_ai'),
  };
  return map[code] || fallback;
}

function invalidSymbolMessage(t: (key: string) => string, correction?: string | null) {
  return correction
    ? t('market_invalid_symbol_did_you_mean').replace('{symbol}', correction)
    : t('market_symbol_not_found_helpful');
}

function normalizeProviderSymbolForRequest(value: string | undefined | null) {
  const symbol = validateSymbol(value);
  if (!symbol) return null;
  return validateSymbol(symbol.includes(':') ? symbol.split(':').pop() || symbol : symbol);
}

function marketAssetTypeLabel(assetType: MarketAssetType, t: (key: string) => string) {
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

function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function normalizeScenarioCurrency(value: string | null | undefined): ScenarioCurrencyCode {
  const normalized = String(value ?? '').trim().toUpperCase();
  return SCENARIO_CURRENCY_OPTIONS.some(option => option.code === normalized)
    ? normalized as ScenarioCurrencyCode
    : 'KWD';
}

function normalizeAccountCurrency(value: string | null | undefined): AccountCurrencyCode {
  const normalized = String(value ?? '').trim().toUpperCase();
  return ACCOUNT_CURRENCY_OPTIONS.includes(normalized as AccountCurrencyCode)
    ? normalized as AccountCurrencyCode
    : 'KWD';
}

export default function MarketAnalysisPage() {
  const { dir, lang, t } = useLanguage();
  const { currency: userCurrency } = useCurrency();
  const currentUserProfile = useCurrentUserProfile();
  const { user, isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [assetType, setAssetType] = useState<MarketAssetType | 'all'>(DEFAULT_MARKET_TYPE);
  const [analysis, setAnalysis] = useState<MarketViewAnalysis | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedMarketAsset | null>(null);
  const [searchResults, setSearchResults] = useState<MarketSearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);
  const [suggestedAssets, setSuggestedAssets] = useState<MarketSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioInvestment[]>([]);
  const [compare, setCompare] = useState<MarketAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<MarketAiInsightView | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [assetProfile, setAssetProfile] = useState<AssetProfileResponse | null>(null);
  const [assetProfileLoading, setAssetProfileLoading] = useState(false);
  const [assetProfileError, setAssetProfileError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [serviceState, setServiceState] = useState<MarketServiceState>('checking');
  const [timeframe, setTimeframe] = useState<typeof MARKET_TIMEFRAMES[number]>('6M');
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [whatIfAmount, setWhatIfAmount] = useState('');
  const [scenarioCurrency, setScenarioCurrency] = useState<ScenarioCurrencyCode>('KWD');
  const [scenarioCurrencyTouched, setScenarioCurrencyTouched] = useState(false);
  const [scenarioCurrencyOpen, setScenarioCurrencyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketTab>('analyze');
  const [traderToolTab, setTraderToolTab] = useState<TraderToolsSubTab>('risk');
  const [performance, setPerformance] = useState<ApiListState<MarketPerformanceItem>>({ loading: false, items: [], message: '' });
  const [economicCalendar, setEconomicCalendar] = useState<ApiListState<Record<string, any>>>({ loading: false, items: [], message: '' });
  const [centralBankNews, setCentralBankNews] = useState<ApiListState<Record<string, any>>>({ loading: false, items: [], message: '' });
  const [marketSentiment, setMarketSentiment] = useState<ApiListState<Record<string, any>>>({ loading: false, items: [], message: '' });
  const [technicalSymbol, setTechnicalSymbol] = useState('EURUSD');
  const [technicalState, setTechnicalState] = useState<TechnicalState>({ loading: false, data: null, message: '' });
  const [lastUpdated, setLastUpdated] = useState('');
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const syncTabFromRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const routeTab = normalizeMarketTab(params.get('tab')) ?? normalizeMarketTab(window.location.hash);
      if (routeTab) setActiveTab(routeTab);
    };

    syncTabFromRoute();
    window.addEventListener('hashchange', syncTabFromRoute);
    window.addEventListener('popstate', syncTabFromRoute);
    return () => {
      window.removeEventListener('hashchange', syncTabFromRoute);
      window.removeEventListener('popstate', syncTabFromRoute);
    };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark')
        || root.dataset.theme === 'dark'
        || root.getAttribute('data-theme') === 'dark';
      setChartTheme(isDark ? 'dark' : 'light');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeTab !== 'traderTools' || traderToolTab !== 'performance' || performance.loading || performance.items.length > 0 || performance.message || performance.code) return;
    setPerformance(prev => ({ ...prev, loading: true }));
    void fetchMarketToolState<MarketPerformanceItem>('/api/market/performance').then(setPerformance);
  }, [activeTab, performance.code, performance.items.length, performance.loading, performance.message, traderToolTab]);

  useEffect(() => {
    if (activeTab !== 'economicCalendar' || economicCalendar.loading || economicCalendar.items.length > 0 || economicCalendar.message || economicCalendar.code) return;
    setEconomicCalendar(prev => ({ ...prev, loading: true }));
    void fetchMarketToolState<Record<string, any>>('/api/market/economic-calendar').then(setEconomicCalendar);
  }, [activeTab, economicCalendar.code, economicCalendar.items.length, economicCalendar.loading, economicCalendar.message]);

  useEffect(() => {
    if (activeTab !== 'newsSentiment') return;
    if (!centralBankNews.loading && centralBankNews.items.length === 0 && !centralBankNews.message && !centralBankNews.code) {
      setCentralBankNews(prev => ({ ...prev, loading: true }));
      void fetchMarketToolState<Record<string, any>>('/api/market/central-bank-news').then(setCentralBankNews);
    }
    if (!marketSentiment.loading && marketSentiment.items.length === 0 && !marketSentiment.message && !marketSentiment.code) {
      setMarketSentiment(prev => ({ ...prev, loading: true }));
      void fetchMarketToolState<Record<string, any>>('/api/market/sentiment').then(setMarketSentiment);
    }
  }, [activeTab, centralBankNews.code, centralBankNews.items.length, centralBankNews.loading, centralBankNews.message, marketSentiment.code, marketSentiment.items.length, marketSentiment.loading, marketSentiment.message]);

  useEffect(() => {
    if (activeTab !== 'technicalAnalysis' || !selectedAsset) return;
    const symbol = technicalSymbol.trim().toUpperCase();
    if (!symbol) return;
    let cancelled = false;
    setTechnicalState({ loading: true, data: null, message: '' });
    fetch(`/api/market/technical-analysis?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const isSuccess = response.ok && payload.success;
        setTechnicalState({
          loading: false,
          data: isSuccess ? payload : null,
          message: isSuccess ? '' : String(payload.message ?? t('market_technical_no_data')),
          updatedAt: typeof payload.updated_at === 'string' ? payload.updated_at : undefined,
          available: !isSuccess && payload.available && typeof payload.available === 'object' ? payload.available : null,
          code: typeof payload.code === 'string' ? payload.code : undefined,
          symbol: typeof payload.symbol === 'string' ? payload.symbol : symbol,
        });
      })
      .catch(error => {
        if (!cancelled) setTechnicalState({ loading: false, data: null, message: error instanceof Error ? error.message : t('market_technical_no_data') });
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedAsset, technicalSymbol, t]);

  const baseScenarioCurrency = normalizeScenarioCurrency(
    userCurrency && userCurrency !== 'KWD' ? userCurrency : currentUserProfile.defaultCurrency || userCurrency,
  );

  useEffect(() => {
    if (!scenarioCurrencyTouched) {
      setScenarioCurrency(baseScenarioCurrency);
    }
  }, [baseScenarioCurrency, scenarioCurrencyTouched]);

  const requestAiInsight = useCallback(async (marketData: MarketAnalysis) => {
    if (!hasUsableAnalysis(marketData)) {
      setAiInsight({ status: 'skipped', error: t('market_no_real_data_ai') });
      return;
    }
    setAiLoading(true);
    setAiInsight(null);
    try {
      const result = await fetchJsonWithTimeout<{ success?: boolean; insight?: MarketAiInsightView; error?: string }>('/api/market/ai-insight', 30000, true, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketData, language: lang }),
      });
      if (result.success && result.insight?.status === 'ready') {
        setAiInsight(result.insight);
      } else {
        setAiInsight(result.insight ?? null);
      }
    } catch {
      setAiInsight(null);
    } finally {
      setAiLoading(false);
    }
  }, [lang, t]);

  const requestAnalysis = useCallback(async (symbolInput: string, typeInput: MarketAssetType | 'all', selectedInput?: Partial<SelectedMarketAsset>) => {
    const normalizedInput = normalizeMarketSymbolInput(selectedInput?.providerSymbol ?? symbolInput, typeInput);
    if (!normalizedInput.valid) {
      const suggestions = normalizedInput.suggestions.length ? normalizedInput.suggestions : marketSymbolSuggestions(symbolInput);
      setError(invalidSymbolMessage(t, normalizedInput.correction));
      setErrorSuggestions(suggestions);
      setAnalysis(null);
      setAiInsight(null);
      setServiceState(current => current === 'checking' ? 'connected' : current);
      setLoading(false);
      return;
    }
    const displaySymbol = validateSymbol(selectedInput?.symbol ?? normalizedInput.displaySymbol ?? symbolInput);
    const requestSymbol = normalizeProviderSymbolForRequest(String(selectedInput?.providerSymbol ?? normalizedInput.providerSymbol));
    if (!requestSymbol || !displaySymbol) {
      setError(invalidSymbolMessage(t, normalizedInput.correction));
      setErrorSuggestions(normalizedInput.suggestions);
      setAnalysis(null);
      setAiInsight(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSlowLoading(false);
    setError('');
    setErrorSuggestions([]);
    setNotice(t('market_progress_connecting'));
    setAnalysis(null);
    setAiInsight(null);
    const slowTimer = window.setTimeout(() => {
      setSlowLoading(true);
      setNotice(t('market_service_waking'));
    }, MARKET_SLOW_NOTICE_MS);
    const normalizedType = normalizeAssetType(selectedInput?.assetType ?? normalizedInput.assetType ?? (typeInput === 'all' ? DEFAULT_MARKET_TYPE : typeInput));
    const selectedMeta: SelectedMarketAsset = {
      symbol: displaySymbol,
      providerSymbol: selectedInput?.providerSymbol ? validateSymbol(selectedInput.providerSymbol) ?? requestSymbol : requestSymbol,
      name: selectedInput?.name,
      assetType: normalizeAssetType(selectedInput?.assetType ?? normalizedType),
      exchange: selectedInput?.exchange,
    };
    setSelectedAsset(selectedMeta);
    setQuery(displaySymbol);
    setAssetType(normalizedType);
    try {
      const params = new URLSearchParams({
        symbol: requestSymbol,
        assetType: normalizedType,
        displaySymbol: selectedMeta.symbol,
      });
      if (selectedMeta.name) params.set('name', selectedMeta.name);
      let result: MarketResultWithMeta | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          setNotice(attempt === 0 ? t('market_progress_loading_symbol') : t('market_service_waking'));
          result = await fetchJsonWithTimeout<MarketResultWithMeta>(`/api/market/analyze?${params.toString()}`, MARKET_REQUEST_TIMEOUT_MS, true);
          const retryableCode = !result.success && ['openbb_timeout', 'openbb_unreachable', 'provider_error'].includes(result.code || '');
          if (retryableCode && attempt === 0) {
            setSlowLoading(true);
            setNotice(t('market_service_waking'));
            await delay(5000);
            continue;
          }
          break;
        } catch (fetchErr) {
          const timedOut = fetchErr instanceof Error && fetchErr.name === 'AbortError';
          if (timedOut && attempt === 0) {
            setSlowLoading(true);
            setNotice(t('market_service_waking'));
            await delay(5000);
            continue;
          }
          throw fetchErr;
        }
      }
      if (!result) throw new Error(t('market_analysis_unavailable'));
      if (process.env.NODE_ENV === 'development') {
        console.log('Market analysis source:', {
          symbol: displaySymbol,
          source: result.success ? result.source : null,
          fallback: result.success ? result.fallback : null,
          fallbackReason: result.success ? result.fallbackReason : null,
          cached: result.success ? result.cached : null,
          dataStatus: result.success ? result.dataStatus : result.dataStatus,
        });
      }
      if (!result.success) {
        const symbolIssue = result.code === 'invalid_symbol' || result.code === 'symbol_not_found';
        setServiceState(symbolIssue ? 'connected' : result.openbbService === 'degraded' || result.openbbService === 'slow' ? 'degraded' : result.openbbService === 'not_configured' ? 'not_configured' : 'unavailable');
        const suggestions = result.suggestions?.length ? result.suggestions : symbolIssue ? normalizedInput.suggestions : [];
        setErrorSuggestions(suggestions);
        setAiInsight({ status: 'skipped', error: t('market_no_real_data_ai') });
        throw new Error(symbolIssue ? invalidSymbolMessage(t, result.correction) : marketErrorText(result.code, result.error || t('market_analysis_unavailable'), t));
      }

      if (hasUsableAnalysis(result)) {
        setNotice(t('market_progress_preparing_analysis'));
        setTimeframe('6M');
        const nextAnalysis = {
          ...result,
          symbol: selectedMeta.symbol,
          providerSymbol: result.providerSymbol ?? selectedMeta.providerSymbol,
          name: selectedMeta.name ?? result.name,
          assetType: normalizedType,
        };
        setAnalysis(nextAnalysis);
        void requestAiInsight(nextAnalysis);
        if (result.cached) setNotice(t('market_cached_data'));
      } else {
        setAnalysis(null);
        setError(t('market_analysis_unavailable'));
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (result.openbbService === 'not_configured' || result.openbbService === 'unavailable' || result.openbbService === 'slow' || result.openbbService === 'degraded') {
        setServiceState(result.openbbService === 'slow' ? 'degraded' : result.openbbService);
      } else if (result.success) {
        setServiceState('connected');
      }
    } catch (err) {
      setAnalysis(null);
      const message = err instanceof Error && err.name === 'AbortError'
        ? t('market_timeout_error')
        : err instanceof Error
          ? err.message
          : t('market_analysis_unavailable');
      setError(message);
      if (message === t('market_timeout_error')) setNotice(t('market_service_waking'));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      window.clearTimeout(slowTimer);
      setSlowLoading(false);
      setLoading(false);
    }
  }, [requestAiInsight, t]);

  const loadHistory = useCallback(async (nextTimeframe: typeof MARKET_TIMEFRAMES[number]) => {
    if (!analysis) return;
    setTimeframe(nextTimeframe);
    setNotice('');
    const period = nextTimeframe.toLowerCase();
    try {
      const params = new URLSearchParams({
        symbol: analysis.providerSymbol ?? analysis.symbol,
        assetType: analysis.assetType,
        period: period === '1d' ? '2d' : period,
      });
      const result = await fetchJsonWithTimeout<{ success?: boolean; history?: MarketAnalysis['history']; cached?: boolean; error?: string }>(`/api/market/history?${params.toString()}`);
      if (!result.success || !Array.isArray(result.history) || result.history.length === 0) {
        throw new Error(result.error || t('market_no_data_for_symbol'));
      }
      setAnalysis(current => current ? {
        ...current,
        history: result.history ?? current.history,
        cached: current.cached || result.cached,
        dataStatus: result.cached ? 'delayed' : current.dataStatus,
      } : current);
      if (result.cached) setNotice(t('market_cached_data'));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t('market_service_unavailable'));
    }
  }, [analysis, t]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setSearchResults([]);
      setSearchMessage('');
      setSearchLoading(false);
      setHighlightedSearchIndex(0);
      return;
    }
    const normalizedTypedSymbol = normalizeMarketSymbolInput(cleanQuery, assetType);
    if (!normalizedTypedSymbol.valid) {
      setSearchResults([]);
      setSearchMessage(invalidSymbolMessage(t, normalizedTypedSymbol.correction));
      setSearchLoading(false);
      setHighlightedSearchIndex(0);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: cleanQuery });
        if (assetType !== 'all') params.set('assetType', assetType);
        const data = await fetchJsonWithTimeout<{ results?: MarketSearchItem[] }>(`/api/market/search?${params.toString()}`, 8000);
        if (cancelled) return;
        const results = normalizeSearchItems(data.results ?? [], cleanQuery);
        setSearchResults(results);
        setHighlightedSearchIndex(0);
        setSearchMessage(results.length === 0 ? t('market_symbol_not_found') : '');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setHighlightedSearchIndex(0);
          setSearchMessage(t('market_symbol_not_found'));
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [assetType, query, t]);

  useEffect(() => {
    let cancelled = false;
    async function checkService() {
      try {
        const health = await fetchJsonWithTimeout<{ ok?: boolean; openbbService?: MarketServiceState; code?: string }>('/api/market/health', MARKET_REQUEST_TIMEOUT_MS, true);
        if (!cancelled) {
          setServiceState(health.openbbService === 'slow' ? 'degraded' : health.openbbService ?? (health.ok ? 'connected' : 'unavailable'));
          if (health.ok) {
            setLoading(false);
          } else {
            setLoading(false);
            setError(health.openbbService === 'not_configured' ? t('market_service_not_configured') : health.openbbService === 'degraded' ? t('market_service_degraded') : marketErrorText(health.code, t('market_service_unavailable'), t));
          }
        }
      } catch {
        if (!cancelled) {
          setServiceState('unavailable');
          setLoading(false);
          setError(t('market_service_unavailable'));
        }
      }
    }
    void checkService();
    return () => {
      cancelled = true;
    };
  }, [requestAnalysis, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadSupportingData() {
      try {
        const [searchJson, compareJson] = await Promise.all([
          fetchJsonWithTimeout<{ results?: MarketSearchItem[] }>('/api/market/search', 8000),
          fetchJsonWithTimeout<{ results?: MarketResult[] }>('/api/market/compare?symbols=SPY,QQQ,NVDA,MSFT&assetType=stock', 12000, true),
        ]);
        if (cancelled) return;
        const apiExamples = (searchJson.results ?? []).slice(0, 10);
        const mergedExamples = [...QUICK_MARKET_EXAMPLES, ...apiExamples]
          .filter((asset, index, list) => list.findIndex(item => item.symbol === asset.symbol && item.assetType === asset.assetType) === index)
          .slice(0, 10);
        setSuggestedAssets(mergedExamples);
        setCompare((compareJson.results ?? []).filter((item): item is MarketAnalysis => Boolean(item.success)));
      } catch {
        if (!cancelled) {
          setSuggestedAssets([]);
          setCompare([]);
        }
      }
    }
    void loadSupportingData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedAsset) {
      setAssetProfile(null);
      setAssetProfileError(null);
      setAssetProfileLoading(false);
      return;
    }

    const asset = selectedAsset;
    let cancelled = false;
    async function loadAssetProfile() {
      const params = new URLSearchParams({
        symbol: asset.symbol,
        providerSymbol: asset.providerSymbol ?? asset.symbol,
        assetType: asset.assetType,
        lang,
      });
      if (asset.name) params.set('name', asset.name);
      if (asset.exchange) params.set('exchange', asset.exchange);

      setAssetProfile(null);
      setAssetProfileError(null);
      setAssetProfileLoading(true);
      try {
        const result = await fetchJsonWithTimeout<AssetProfileResponse | { success?: false; error?: string; message?: string }>(
          `/api/market/asset-profile?${params.toString()}`,
          12000,
          true,
        );
        if (cancelled) return;
        if (result.success) {
          setAssetProfile(result);
        } else {
          setAssetProfile(null);
          setAssetProfileError(result.message ?? result.error ?? t('market_asset_profile_error'));
        }
      } catch {
        if (!cancelled) {
          setAssetProfile(null);
          setAssetProfileError(t('market_asset_profile_error'));
        }
      } finally {
        if (!cancelled) setAssetProfileLoading(false);
      }
    }

    void loadAssetProfile();
    return () => {
      cancelled = true;
    };
  }, [lang, selectedAsset, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadUserMarketTools() {
      if (!user || isGuest) {
        setWatchlist(readLocalList<WatchlistItem>(WATCHLIST_STORAGE_KEY));
        setAlerts(readLocalList<SavedAlert>(ALERTS_STORAGE_KEY));
        setPortfolio([]);
        return;
      }

      const [watchlistResult, alertsResult, portfolioResult] = await Promise.allSettled([
        supabase
          .from('market_watchlist')
          .select('id, symbol, asset_type, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('market_price_alerts')
          .select('id, symbol, asset_type, alert_type, threshold, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('investment_items')
          .select('id, name, amount, created_at, ai_analysis')
          .eq('user_id', user.id),
      ]);

      if (cancelled) return;

      if (watchlistResult.status === 'fulfilled' && !watchlistResult.value.error) {
        setWatchlist((watchlistResult.value.data ?? []).map(row => normalizeWatchlistRow(row as Record<string, unknown>)));
      } else {
        setWatchlist([]);
      }

      if (alertsResult.status === 'fulfilled' && !alertsResult.value.error) {
        setAlerts((alertsResult.value.data ?? []).map(row => normalizeAlertRow(row as Record<string, unknown>)));
      } else {
        setAlerts([]);
      }

      if (portfolioResult.status === 'fulfilled' && !portfolioResult.value.error) {
        setPortfolio((portfolioResult.value.data ?? []).map(row => normalizeInvestmentItem(row as Record<string, unknown>)));
      } else {
        const investmentError = portfolioResult.status === 'fulfilled' ? portfolioResult.value.error : portfolioResult.reason;
        if (process.env.NODE_ENV !== 'production' && investmentError) {
          console.error('[MarketAnalysis] Failed to load investment_items', {
            code: investmentError.code,
            message: investmentError.message,
            details: investmentError.details,
            hint: investmentError.hint,
          });
        }
        setPortfolio([]);
      }
    }

    void loadUserMarketTools();
    return () => {
      cancelled = true;
    };
  }, [isGuest, user]);

  const saveWatchlist = useCallback(async (item: WatchlistItem) => {
    setNotice('');
    if (!user || isGuest) {
      const next = [item, ...watchlist.filter(asset => !(asset.symbol === item.symbol && asset.assetType === item.assetType))].slice(0, 20);
      setWatchlist(next);
      writeLocalList(WATCHLIST_STORAGE_KEY, next);
      setNotice(t('market_watchlist_saved'));
      return;
    }

    const { data, error: saveError } = await supabase
      .from('market_watchlist')
      .upsert({
        user_id: user.id,
        symbol: item.symbol,
        asset_type: item.assetType,
        name: item.name ?? item.symbol,
      }, { onConflict: 'user_id,symbol,asset_type' })
      .select('id, symbol, asset_type, name, created_at')
      .single();

    if (saveError) {
      setNotice(saveError.code === '42P01' ? t('market_watchlist_migration_error') : t('market_watchlist_error'));
      return;
    }

    const saved = normalizeWatchlistRow(data as Record<string, unknown>);
    setWatchlist(previous => [saved, ...previous.filter(asset => asset.id !== saved.id && !(asset.symbol === saved.symbol && asset.assetType === saved.assetType))]);
    setNotice(t('market_watchlist_saved'));
  }, [isGuest, t, user, watchlist]);

  const removeWatchlist = useCallback(async (item: WatchlistItem) => {
    if (item.id && user && !isGuest) {
      await supabase.from('market_watchlist').delete().eq('id', item.id).eq('user_id', user.id);
    }
    const next = watchlist.filter(asset => asset.id ? asset.id !== item.id : !(asset.symbol === item.symbol && asset.assetType === item.assetType));
    setWatchlist(next);
    if (!user || isGuest) writeLocalList(WATCHLIST_STORAGE_KEY, next);
  }, [isGuest, user, watchlist]);

  const saveAlert = useCallback(async () => {
    if (!analysis) return;
    const threshold = alertType === 'rsi_above' ? 70 : alertType === 'rsi_below' ? 30 : parseNumber(alertThreshold);
    if (threshold <= 0) {
      setNotice(t('market_alert_threshold_required'));
      return;
    }

    const payload: SavedAlert = {
      symbol: analysis.symbol,
      assetType: analysis.assetType,
      alertType,
      threshold,
      createdAt: new Date().toISOString(),
    };

    if (!user || isGuest) {
      const next = [payload, ...alerts].slice(0, 30);
      setAlerts(next);
      writeLocalList(ALERTS_STORAGE_KEY, next);
      setNotice(t('market_alert_saved'));
      return;
    }

    const { data, error: saveError } = await supabase
      .from('market_price_alerts')
      .insert({
        user_id: user.id,
        symbol: payload.symbol,
        asset_type: payload.assetType,
        alert_type: payload.alertType,
        threshold: payload.threshold,
      })
      .select('id, symbol, asset_type, alert_type, threshold, created_at')
      .single();

    if (saveError) {
      setNotice(saveError.code === '42P01' ? t('market_alert_migration_error') : t('market_alert_error'));
      return;
    }

    setAlerts(previous => [normalizeAlertRow(data as Record<string, unknown>), ...previous]);
    setNotice(t('market_alert_saved'));
  }, [alertThreshold, alertType, alerts, analysis, isGuest, t, user]);

  const analyzeSearchSelection = useCallback(async (item?: MarketSearchItem) => {
    const cleanQuery = query.trim();
    if (!item && cleanQuery.length < 2) {
      setError(t('market_select_asset_to_start'));
      return;
    }

    const selectBestMatch = (items: MarketSearchSuggestion[]) => {
      const normalizedQuery = cleanQuery.toUpperCase();
      return items.find(result => result.symbol.toUpperCase() === normalizedQuery || result.providerSymbol?.toUpperCase() === normalizedQuery)
        ?? items.find(result => result.name.toLowerCase() === cleanQuery.toLowerCase())
        ?? items[0];
    };

    let selectedItem: MarketSearchSuggestion | undefined = item ? normalizeSearchItem(item) : selectBestMatch(searchResults);
    if (!selectedItem && cleanQuery) {
      try {
        setSearchLoading(true);
        const params = new URLSearchParams({ q: cleanQuery });
        if (assetType !== 'all') params.set('assetType', assetType);
        const data = await fetchJsonWithTimeout<{ results?: MarketSearchItem[] }>(`/api/market/search?${params.toString()}`, 8000);
        const results = normalizeSearchItems(data.results ?? [], cleanQuery);
        setSearchResults(results);
        setHighlightedSearchIndex(0);
        selectedItem = selectBestMatch(results);
      } catch {
        selectedItem = undefined;
      } finally {
        setSearchLoading(false);
      }
    }

    if (!selectedItem) {
      const normalizedInput = normalizeMarketSymbolInput(cleanQuery, assetType);
      if (normalizedInput.valid) {
        const validInput = normalizedInput as Extract<ReturnType<typeof normalizeMarketSymbolInput>, { valid: true }>;
        selectedItem = {
          symbol: validInput.displaySymbol ?? validInput.symbol,
          providerSymbol: validInput.providerSymbol,
          name: validInput.displaySymbol ?? validInput.symbol,
          assetType: validInput.assetType,
          exchange: validInput.assetType === 'forex' ? 'FX' : validInput.assetType === 'crypto' ? 'Crypto' : validInput.assetType === 'gold' ? 'COMEX' : undefined,
          provider: 'THE SFM',
        };
      } else {
        setSelectedAsset(null);
        setAnalysis(null);
        setServiceState(current => current === 'checking' ? 'connected' : current);
        setError(invalidSymbolMessage(t, normalizedInput.correction));
        setErrorSuggestions(normalizedInput.suggestions);
        setSearchMessage(invalidSymbolMessage(t, normalizedInput.correction));
        return;
      }
    }

    if (!selectedItem) {
      setSelectedAsset(null);
      setAnalysis(null);
      const suggestions = marketSymbolSuggestions(cleanQuery);
      setError(invalidSymbolMessage(t));
      setErrorSuggestions(suggestions);
      setSearchMessage(invalidSymbolMessage(t));
      return;
    }

    setSearchOpen(false);
    setError('');
    setErrorSuggestions([]);
    await requestAnalysis(selectedItem.providerSymbol ?? selectedItem.symbol, selectedItem.assetType, {
      symbol: selectedItem.symbol,
      providerSymbol: selectedItem.providerSymbol ?? selectedItem.symbol,
      name: selectedItem.name,
      assetType: selectedItem.assetType,
      exchange: selectedItem.exchange,
    });
  }, [assetType, query, requestAnalysis, searchResults, t]);

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    const hasResults = searchResults.length > 0;

    if (event.key === 'Escape') {
      setSearchOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!searchOpen && query.trim().length >= 2) setSearchOpen(true);
      if (hasResults) {
        setHighlightedSearchIndex(current => Math.min(current + 1, searchResults.length - 1));
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (hasResults) {
        setHighlightedSearchIndex(current => Math.max(current - 1, 0));
      }
      return;
    }

    if (event.key === 'Enter' && searchOpen && hasResults) {
      event.preventDefault();
      void analyzeSearchSelection(searchResults[highlightedSearchIndex] ?? searchResults[0]);
    }
  }, [analyzeSearchSelection, highlightedSearchIndex, query, searchOpen, searchResults]);

  const removeAlert = useCallback(async (alert: SavedAlert, index: number) => {
    if (alert.id && user && !isGuest) {
      await supabase.from('market_price_alerts').delete().eq('id', alert.id).eq('user_id', user.id);
    }
    const next = alerts.filter((item, itemIndex) => alert.id ? item.id !== alert.id : itemIndex !== index);
    setAlerts(next);
    if (!user || isGuest) writeLocalList(ALERTS_STORAGE_KEY, next);
  }, [alerts, isGuest, user]);

  const selected = analysis;
  const serviceNotice = serviceState === 'connected'
    ? t('market_service_connected')
    : serviceState === 'slow' || serviceState === 'degraded'
      ? t('market_service_degraded')
      : serviceState === 'not_configured'
        ? t('market_service_not_configured')
        : serviceState === 'unavailable'
          ? t('market_service_unavailable')
          : t('loading');
  const heroBadge = t('market_badge_live');
  const chartBadge = t('market_chart_live');
  const selectedDisplayName = selectedAsset && selectedAsset.symbol === selected?.symbol ? selectedAsset.name : undefined;
  const localizedAssetName = selectedDisplayName ?? (selected?.name?.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', selected.symbol) : selected?.name);
  const trendIcon = selected?.trend === 'bearish' ? <TrendingDown size={18} /> : <TrendingUp size={18} />;
  const cards = useMemo(() => [analysis, ...compare].filter((item): item is MarketAnalysis => Boolean(item)).slice(0, 4), [analysis, compare]);
  const watchlistHasSelected = Boolean(selected && watchlist.some(item => item.symbol === selected.symbol && item.assetType === selected.assetType));
  const portfolioTotal = portfolio.reduce((sum, item) => sum + item.currentValue, 0);
  const portfolioMatch = selected
    ? portfolio.find(item => {
      const name = item.name.toUpperCase();
      return name.includes(selected.symbol) || selected.symbol.includes(name.replace(/[^A-Z0-9]/g, ''));
    })
    : undefined;
  const purchasePrice = portfolioMatch?.amount ?? 0;
  const unrealized = portfolioMatch && purchasePrice > 0 ? selected!.latestPrice - purchasePrice : 0;
  const unrealizedPct = portfolioMatch && purchasePrice > 0 ? (unrealized / purchasePrice) * 100 : 0;
  const exposure = portfolioMatch && portfolioTotal > 0 ? (portfolioMatch.currentValue / portfolioTotal) * 100 : 0;
  const concentrationRisk = exposure >= 35 ? t('market_concentration_high') : exposure >= 20 ? t('market_concentration_medium') : t('market_concentration_low');
  const whatIfValue = parseNumber(whatIfAmount);
  const hasWhatIfAmount = whatIfValue > 0;
  const hasWhatIfInput = whatIfAmount.trim().length > 0;
  const invalidWhatIfAmount = hasWhatIfInput && !hasWhatIfAmount;
  const estimatedUnits = selected?.latestPrice ? whatIfValue / selected.latestPrice : 0;
  const loadingLabel = slowLoading ? t('market_service_waking') : notice || t('market_loading_data');
  const selectedCurrency = selected?.currency ?? selected?.quote?.currency ?? 'USD';
  const scenarioCurrencyMeta = getCurrency(scenarioCurrency);
  const scenarioCurrencyOption = SCENARIO_CURRENCY_OPTIONS.find(option => option.code === scenarioCurrency) ?? SCENARIO_CURRENCY_OPTIONS[0];
  const scenarioCurrencySymbol = scenarioCurrencyOption.symbol || currencyDisplaySymbol(scenarioCurrencyMeta, lang);
  const scenarioAmountPlaceholder = t('market_amount_with_currency_placeholder');
  const formatScenarioCurrency = useCallback(
    (value: number) => formatCurrency(value, scenarioCurrency, lang),
    [scenarioCurrency, lang],
  );
  const fundamentals = selected?.fundamentals ?? {};
  const fundamentalsSupported = selected?.assetType === 'stock';
  const hasFundamentals = fundamentalsSupported
    && (selected?.fundamentalsAvailable === true
      || ['marketCap', 'peRatio', 'eps', 'revenue', 'dividend'].some(key => hasDisplayValue((fundamentals as Record<string, unknown>)[key])));
  const fundamentalsUnavailableReason = selected?.fundamentalsUnavailableReason
    ?? (fundamentalsSupported ? 'provider_returned_empty' : 'not_supported_for_asset_type');
  const fundamentalValue = (key: string) => {
    const value = (fundamentals as Record<string, unknown>)[key];
    return hasDisplayValue(value) ? formatFundamentalValue(value) : t('market_fundamentals_unavailable_source');
  };
  const calculatedRiskScore = selected
    ? Math.min(100, Math.max(0, Math.round(
      (selected.indicators.volatility * 1.35)
      + (selected.riskLevel === 'high' ? 28 : selected.riskLevel === 'medium' ? 14 : 4)
      + (selected.indicators.rsi >= 70 || selected.indicators.rsi <= 30 ? 12 : 0),
    )))
    : 0;
  const visibleRiskScore = aiInsight?.riskScore ?? calculatedRiskScore;
  const ruleBasedSummary = useMemo(() => {
    if (!selected) return null;
    return generateEducationalMarketSummary({
      language: normalizeSummaryLanguage(lang),
      symbol: selected.symbol,
      assetName: localizedAssetName,
      assetType: selected.assetType,
      latestPrice: selected.latestPrice,
      dailyChange: selected.quote?.change,
      dailyChangePercent: selected.changePercent,
      rsi: selected.indicators.rsi,
      sma20: selected.indicators.sma20,
      sma50: selected.indicators.sma50,
      support: selected.levels.support,
      resistance: selected.levels.resistance,
      hasFundamentals,
      marketDataSource: selected.source ?? selected.provider ?? selected.fundamentalsSource ?? null,
      currency: selectedCurrency,
      scenarioAmount: hasWhatIfAmount ? whatIfValue : null,
      estimatedUnits: hasWhatIfAmount ? estimatedUnits : null,
    });
  }, [
    estimatedUnits,
    hasFundamentals,
    hasWhatIfAmount,
    lang,
    localizedAssetName,
    selected,
    selectedCurrency,
    whatIfValue,
  ]);
  const decision = useMemo(() => {
    if (!selected) return null;
    const rsi = selected.indicators.rsi;
    const highRisk = selected.riskLevel === 'high' || selected.indicators.volatility >= 30 || rsi >= 75;
    const needsReview = selected.trend === 'bearish' || rsi <= 35 || rsi >= 68 || selected.changePercent <= -3;
    if (highRisk) {
      return {
        status: t('market_decision_high_risk'),
        reason: t('market_decision_reason_high'),
        warning: t('market_decision_warning_high'),
        action: t('market_decision_action_high'),
        tone: 'danger',
      };
    }
    if (needsReview) {
      return {
        status: t('market_decision_review'),
        reason: t('market_decision_reason_review'),
        warning: t('market_decision_warning_review'),
        action: t('market_decision_action_review'),
        tone: 'warn',
      };
    }
    return {
      status: t('market_decision_watch'),
      reason: t('market_decision_reason_watch'),
      warning: t('market_decision_warning_watch'),
      action: t('market_decision_action_watch'),
      tone: 'ok',
    };
  }, [selected, t]);
  const regenerateAiSummary = useCallback(() => {
    if (!selected || aiLoading || !hasUsableAnalysis(selected)) return;
    void requestAiInsight(selected);
  }, [aiLoading, requestAiInsight, selected]);
  const aiSummarySections = useMemo(() => {
    if (!selected) {
      return [{
        title: t('market_ai_summary_no_data'),
        body: t('market_ai_summary_no_data'),
      }];
    }

    if (aiLoading) {
      return [{
        title: t('market_ai_summary_loading'),
        body: t('market_ai_summary_loading'),
      }];
    }

    if (aiInsight?.status === 'ready') {
      return [
        {
          title: t('market_ai_summary_overview'),
          body: aiInsight.summary || ruleBasedSummary?.overview || t('market_ai_summary_generated_from_data'),
        },
        {
          title: t('market_ai_summary_observations'),
          body: aiInsight.trendStatus || ruleBasedSummary?.keyObservations[0] || t('market_ai_fallback_limited'),
        },
        {
          title: t('market_ai_summary_risks'),
          body: aiInsight.riskNotes || ruleBasedSummary?.limitations[0] || t('market_ai_fallback_limited'),
        },
        {
          title: t('market_ai_summary_watch'),
          items: (aiInsight.watchNext && aiInsight.watchNext.length > 0 ? aiInsight.watchNext : ruleBasedSummary?.whatToWatch ?? [t('market_ai_fallback_watch')]).slice(0, 4),
        },
      ];
    }

    if (!ruleBasedSummary) {
      return [{
        title: t('market_ai_summary_no_data'),
        body: t('market_ai_summary_no_data'),
      }];
    }

    return [
      {
        title: t('market_ai_summary_overview'),
        body: ruleBasedSummary.overview,
      },
      {
        title: t('market_ai_summary_observations'),
        items: ruleBasedSummary.keyObservations,
      },
      {
        title: t('market_ai_summary_risks'),
        items: ruleBasedSummary.limitations,
      },
      {
        title: t('market_ai_summary_watch'),
        items: ruleBasedSummary.whatToWatch,
      },
    ];
  }, [
    aiInsight,
    aiLoading,
    ruleBasedSummary,
    selected,
    t,
  ]);
  const aiSummaryEyebrow = aiLoading
    ? t('market_ai_summary_loading')
    : aiInsight?.status === 'ready'
      ? t('market_educational_only')
      : ruleBasedSummary?.badge ?? t('market_ai_summary_automatic_badge');
  const aiSummaryIntro = !aiLoading && ruleBasedSummary ? ruleBasedSummary.intro : '';
  const reportLines = selected ? [
    `${t('market_report_trend')}: ${t(`market_trend_${selected.trend}`)} ${percent(selected.changePercent)}`,
    `${t('market_report_risk')}: ${t(`market_risk_${selected.riskLevel}`)} - ${selected.indicators.volatility.toFixed(1)}%`,
    `${t('market_report_levels')}: ${t('market_support_zone')} ${money(selected.levels.support, selectedCurrency)} / ${t('market_resistance_zone')} ${money(selected.levels.resistance, selectedCurrency)}`,
    `${t('market_report_portfolio')}: ${portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}`,
    `${t('market_report_monitor')}: RSI ${selected.indicators.rsi}, SMA 20 ${money(selected.indicators.sma20, selectedCurrency)}, SMA 50 ${money(selected.indicators.sma50, selectedCurrency)}`,
  ] : [];
  const marketTabs = useMemo(() => [
    { id: 'analyze', label: t('market_analysis_tab') },
    { id: 'traderTools', label: t('market_trader_tools') },
    { id: 'economicCalendar', label: t('market_economic_calendar') },
    { id: 'sessions', label: t('market_trading_sessions') },
    { id: 'technicalAnalysis', label: t('market_daily_technical_analysis') },
    { id: 'newsSentiment', label: t('market_news_sentiment') },
    { id: 'watchlist', label: t('market_watchlist'), count: watchlist.length },
    { id: 'alerts', label: t('market_price_alerts'), count: alerts.length },
    { id: 'comparison', label: t('market_compare_assets'), count: compare.length },
    { id: 'assetReport', label: t('market_ai_asset_report') },
  ], [alerts.length, compare.length, t, watchlist.length]);
  const focusMarketSearch = useCallback(() => {
    setActiveTab('analyze');
    window.requestAnimationFrame(() => {
      document.getElementById('market-asset-search')?.focus();
    });
  }, []);

  return (
    <div className="market-shell" dir={dir}>
      <Sidebar />
      <main className="market-main">
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="market-eyebrow"><Sparkles size={15} />{heroBadge}</span>
            <h1>{t('market_title')}</h1>
            <p>{t('market_hero_subtitle')}</p>
            <form className="market-search-panel" onSubmit={event => { event.preventDefault(); void analyzeSearchSelection(); }}>
              <div className="market-search-field">
                <label htmlFor="market-asset-search">{t('market_search_label')}</label>
                <div className="market-search-combobox">
                <div className="market-search-input-shell">
                  <Search size={17} />
                  <input
                    id="market-asset-search"
                    value={query}
                    type="search"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-label={t('market_search_label')}
                    aria-expanded={searchOpen && query.trim().length >= 2}
                    aria-controls="market-search-results"
                    aria-activedescendant={searchOpen && searchResults[highlightedSearchIndex] ? `market-search-option-${highlightedSearchIndex}` : undefined}
                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                    onChange={event => {
                      const nextQuery = event.target.value;
                      setQuery(nextQuery);
                      setError('');
                      setErrorSuggestions([]);
                      setHighlightedSearchIndex(0);
                      if (selectedAsset && nextQuery.trim().toUpperCase() !== selectedAsset.symbol) {
                        setSelectedAsset(null);
                      }
                      setSearchOpen(nextQuery.trim().length >= 2);
                    }}
                    onFocus={() => setSearchOpen(query.trim().length >= 2)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t('market_search_placeholder')}
                  />
                </div>
                {searchOpen && query.trim().length >= 2 && (
                  <div id="market-search-results" className="market-search-results" role="listbox" aria-label={t('market_search_results')} dir={dir}>
                    {searchLoading ? (
                      <p role="status">{t('loading')}</p>
                    ) : searchResults.length > 0 ? searchResults.map((item, index) => {
                      const meta = [
                        item.symbol,
                        item.exchange,
                        marketAssetTypeLabel(item.assetType, t),
                        item.provider,
                      ].filter(Boolean).join(' · ');
                      const cleanMeta = meta.replace(/\u00c2\u00b7/g, '·');
                      const readableMeta = [
                        item.symbol,
                        item.exchange,
                        marketAssetTypeLabel(item.assetType, t),
                        item.provider,
                      ].filter(Boolean).join(' · ');
                      return (
                      <button
                        type="button"
                        id={`market-search-option-${index}`}
                        key={`${item.symbol}-${item.assetType}-${item.providerSymbol ?? item.symbol}`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => void analyzeSearchSelection(item)}
                        onMouseEnter={() => setHighlightedSearchIndex(index)}
                        role="option"
                        aria-selected={highlightedSearchIndex === index}
                      >
                        <span className="market-search-result-main">
                          <b title={item.name}>{item.name || item.symbol}</b>
                          <em>{item.symbol}</em>
                        </span>
                        <small title={readableMeta || cleanMeta}>{readableMeta || cleanMeta}</small>
                      </button>
                      );
                    }) : (
                      <p>{searchMessage || t('command_no_results')}</p>
                    )}
                  </div>
                )}
                </div>
              </div>
              <label>
                <span>{t('market_asset_type')}</span>
                <select value={assetType} aria-label={t('market_asset_type')} onChange={event => setAssetType(event.target.value as MarketAssetType | 'all')}>
                  <option value="all">{t('market_asset_all')}</option>
                  <option value="stock">{t('market_asset_stocks')}</option>
                  <option value="etf">{t('market_asset_etf')}</option>
                  <option value="crypto">{t('market_asset_crypto')}</option>
                  <option value="forex">{t('market_asset_forex')}</option>
                  <option value="commodity">{t('market_asset_commodities')}</option>
                  <option value="gold">{t('market_asset_gold')}</option>
                  <option value="index">{t('market_asset_index')}</option>
                </select>
              </label>
              <button className="market-search-submit" type="submit" disabled={loading || (!selectedAsset && query.trim().length < 2)}><Activity size={17} />{loading ? loadingLabel : t('market_analyze_now')}</button>
            </form>
          </div>
          <div className={`market-hero-card ${selected ? 'selected' : 'empty'}`}>
            {selected ? (
              <>
                <span>{t('market_selected_asset')}</span>
                <strong dir="ltr">{selected.symbol}</strong>
                <p>{localizedAssetName ?? selected.name}</p>
                <em className="market-hero-card-meta" dir="ltr">{money(selected.latestPrice, selectedCurrency)} / {selected.cached ? t('market_cached_data') : t('market_badge_live')}</em>
                <b className={`risk ${selected.riskLevel}`}>{t(`market_risk_${selected.riskLevel}`)}</b>
              </>
            ) : (
              <>
                <div className="market-hero-card-icon"><LineChart size={22} /></div>
                <span>{t('market_selected_asset')}</span>
                <strong>{t('market_no_asset_selected_yet')}</strong>
                <p>{t('market_selected_asset_empty_body')}</p>
                <button type="button" onClick={focusMarketSearch}>{t('market_search_asset_action')}</button>
              </>
            )}
          </div>
        </section>

        <section className="market-status-grid">
          <MarketStatusCard
            icon={<Activity size={18} />}
            label={t('market_data_source')}
            value={selected ? (selected.cached ? t('market_cached_data') : 'OpenBB') : 'OpenBB'}
            helper={t('market_status_source_hint')}
            valueDir={selected?.cached ? undefined : 'ltr'}
          />
          <MarketStatusCard
            icon={serviceState === 'connected' ? <CheckCircle2 size={18} /> : <Activity size={18} />}
            label={t('market_service_status')}
            value={serviceState === 'connected' ? t('market_connected_short') : serviceState === 'checking' ? t('market_service_checking_short') : t('market_service_not_connected_short')}
            helper={serviceState === 'connected' ? t('market_status_service_connected_hint') : t('market_status_service_pending_hint')}
            tone={serviceState === 'connected' ? 'success' : serviceState === 'checking' ? 'info' : 'warning'}
          />
          <MarketStatusCard
            icon={<WalletCards size={18} />}
            label={t('market_selected_asset')}
            value={selected?.symbol ?? selectedAsset?.symbol ?? t('market_no_asset_selected_yet')}
            helper={selected?.symbol || selectedAsset?.symbol ? localizedAssetName ?? selected?.name ?? selectedAsset?.name ?? t('market_selected_asset') : t('market_status_select_asset_hint')}
            tone={selected?.symbol || selectedAsset?.symbol ? undefined : 'muted'}
            valueDir={selected?.symbol || selectedAsset?.symbol ? 'ltr' : undefined}
          />
          <MarketStatusCard
            icon={<Clock3 size={18} />}
            label={t('market_last_updated')}
            value={selected && lastUpdated ? lastUpdated : t('market_unavailable')}
            helper={selected && lastUpdated ? t('market_status_update_current_hint') : t('market_status_update_after_fetch')}
            tone={selected && lastUpdated ? undefined : 'muted'}
            valueDir={selected && lastUpdated ? 'ltr' : undefined}
          />
        </section>

        <PageTabs
          tabs={marketTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as MarketTab)}
          ariaLabel={t('market_title')}
          className="market-dashboard-tabs"
        />

        <MarketStatusBanner t={t} state={serviceState} serviceNotice={serviceNotice} />

        {notice && <div className="market-notice success" role="status">{notice}</div>}
        {slowLoading && <div className="market-notice slow" role="status">{t('market_slow_loading')}</div>}
        {error && (
          <div className="market-notice" role="alert">
            <span>{error}</span>
            <button
              type="button"
              disabled={!selectedAsset}
              onClick={() => selectedAsset && void requestAnalysis(selectedAsset.providerSymbol ?? selectedAsset.symbol, selectedAsset.assetType, selectedAsset)}
            >
              {t('market_retry')}
            </button>
            {errorSuggestions.length > 0 && (
              <div className="market-suggestion-chips" aria-label={t('market_symbol_suggestions')}>
                <small>{t('market_symbol_suggestions')}</small>
                {errorSuggestions.map(symbol => (
                  <button
                    type="button"
                    key={symbol}
                    onClick={() => {
                      setQuery(symbol);
                      setError('');
                      setErrorSuggestions([]);
                      void analyzeSearchSelection(suggestionToMarketItem(symbol));
                    }}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <section className="market-active-dashboard">
        {activeTab === 'analyze' && <section className="market-card-grid" aria-label={t('market_analysis_cards')}>
          {loading ? (
            <div className="market-empty" role="status">{loadingLabel}</div>
          ) : cards.length === 0 ? (
            selectedAsset ? (
              <MarketEmptyState
                icon={<AlertTriangle size={22} />}
                title={t('market_symbol_data_unavailable')}
                description={error || t('market_symbol_exists_note')}
                actionLabel={t('market_retry')}
                onAction={() => void requestAnalysis(selectedAsset.providerSymbol ?? selectedAsset.symbol, selectedAsset.assetType, selectedAsset)}
              />
            ) : (
              <MarketDefaultDashboard t={t} onSearch={focusMarketSearch} onOpenTab={setActiveTab} />
            )
          ) : cards.map(asset => (
            <article className="market-card" key={asset.symbol}>
              <div className="market-card-head">
                <div>
                  <strong>{asset.symbol}</strong>
                  <span>{asset.name.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', asset.symbol) : asset.name}</span>
                </div>
                <b className={`risk ${asset.riskLevel}`}>{t(`market_risk_${asset.riskLevel}`)}</b>
              </div>
              <div className="market-price">{money(asset.latestPrice, asset.currency ?? asset.quote?.currency ?? 'USD')}</div>
              <div className={asset.changePercent >= 0 ? 'change up' : 'change down'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
              </div>
            </article>
          ))}
        </section>}

        {activeTab === 'traderTools' && (
          <TraderToolsDashboard
            t={t}
            currency={baseScenarioCurrency}
            userId={!isGuest ? user?.id : undefined}
            subTab={traderToolTab}
            setSubTab={setTraderToolTab}
            performance={performance}
          />
        )}

        {activeTab === 'economicCalendar' && (
          <EconomicCalendarPanel t={t} locale={lang} state={economicCalendar} />
        )}

        {activeTab === 'sessions' && (
          <TradingSessionsPanel t={t} locale={lang} />
        )}

        {activeTab === 'technicalAnalysis' && (
          <TechnicalAnalysisPanel
            t={t}
            locale={lang}
            symbol={technicalSymbol}
            setSymbol={setTechnicalSymbol}
            state={technicalState}
            hasSelectedAsset={Boolean(selectedAsset || selected)}
            onSelectAsset={focusMarketSearch}
          />
        )}

        {activeTab === 'newsSentiment' && (
          <NewsSentimentPanel
            t={t}
            news={centralBankNews}
            sentiment={marketSentiment}
          />
        )}

        {(['traderTools', 'economicCalendar', 'sessions', 'technicalAnalysis', 'newsSentiment'] as MarketTab[]).includes(activeTab) ? null : selected && activeTab === 'analyze' ? (
          <>
            <section className="market-stock-header">
              <div>
                <span className={`data-badge ${selected.dataStatus ?? 'live'}`}>
                  {selected.cached ? t('market_cached_data') : t(`market_data_status_${selected.dataStatus ?? 'live'}`)}
                </span>
                <h2>{selected.symbol}</h2>
                <p>{localizedAssetName ?? selected.name}</p>
              </div>
              <div className="stock-price-block">
                <strong>{money(selected.latestPrice, selectedCurrency)}</strong>
                <b className={selected.changePercent >= 0 ? 'change up' : 'change down'}>{percent(selected.changePercent)}</b>
                <small>{t('market_last_updated')}: {lastUpdated || t('market_unavailable')} · {selectedCurrency}</small>
              </div>
            </section>

            <AssetProfileCard
              response={assetProfile}
              loading={assetProfileLoading}
              error={assetProfileError}
              language={lang}
              assetType={selected.assetType}
              t={t}
            />

            <section className="market-decision-grid">
              <article className={`market-panel decision ${decision?.tone ?? ''}`}>
                <div className="market-section-head">
                  <Brain size={19} />
                  <div>
                    <span>{aiSummaryEyebrow}</span>
                    <h2>{t('market_ai_summary')}</h2>
                  </div>
                </div>
                <div className="decision-body ai-summary-body">
                  {aiLoading && <div className="ai-summary-loading" aria-live="polite"><span />{t('market_ai_summary_loading')}</div>}
                  {aiSummaryIntro && <p className="ai-summary-intro">{aiSummaryIntro}</p>}
                  {aiSummarySections.map(section => (
                    <section className="ai-summary-section" key={section.title}>
                      <b>{section.title}</b>
                      {'body' in section && section.body ? <p>{section.body}</p> : null}
                      {'items' in section && section.items ? (
                        <ul>
                          {section.items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                  <div className="risk-score" aria-label={`${t('market_risk_score')} ${visibleRiskScore}`}>
                    <span>{t('market_risk_score')}</span>
                    <i><b style={{ width: `${visibleRiskScore}%` }} /></i>
                    <strong>{visibleRiskScore}/100</strong>
                  </div>
                  <div className="ai-summary-actions">
                    <button
                      type="button"
                      className="inline-action ai-regenerate"
                      disabled={aiLoading || !selected || !hasUsableAnalysis(selected)}
                      onClick={regenerateAiSummary}
                    >
                      <Brain size={15} />
                      {t('market_ai_summary_regenerate')}
                    </button>
                    <small>{t('market_ai_summary_disclaimer')}</small>
                  </div>
                </div>
              </article>

              <article className="market-panel portfolio-card">
                <div className="market-section-head">
                  <WalletCards size={19} />
                  <div>
                    <span>{portfolio.length === 0 ? t('market_no_portfolio_data') : portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}</span>
                    <h2>{t('market_portfolio_comparison')}</h2>
                  </div>
                </div>
                <div className="portfolio-metric-grid">
                  <MarketMetric label={t('market_purchase_price')} value={portfolioMatch ? money(purchasePrice, selectedCurrency) : t('market_unavailable')} valueDir="ltr" />
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice, selectedCurrency)} valueDir="ltr" />
                  <MarketMetric label={t('market_unrealized_pl')} value={portfolioMatch ? money(unrealized, selectedCurrency) : t('market_unavailable')} valueDir="ltr" />
                  <MarketMetric label={t('market_gain_loss_percent')} value={portfolioMatch ? percent(unrealizedPct) : t('market_unavailable')} valueDir="ltr" />
                  <MarketMetric label={t('market_portfolio_exposure')} value={portfolioMatch ? `${exposure.toFixed(1)}%` : t('market_unavailable')} valueDir="ltr" />
                  <MarketMetric label={t('market_concentration_risk')} value={portfolioMatch ? concentrationRisk : t('market_no_data')} />
                </div>
              </article>
            </section>

            <section className="market-layout">
              <div className="market-panel market-chart">
                <div className="market-section-head">
                  <LineChart size={19} />
                  <div>
                    <span>{chartBadge}</span>
                    <h2>{selected.symbol}</h2>
                  </div>
                </div>
                <div className="timeframe-row" role="group" aria-label={t('market_timeframe')}>
                  {MARKET_TIMEFRAMES.map(item => (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={timeframe === item}
                      onClick={() => void loadHistory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <TradingViewChart symbol={selected.providerSymbol ?? selected.symbol} assetType={selected.assetType} exchange={selectedAsset?.exchange} theme={chartTheme} />
                <div className="market-stat-row">
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice, selectedCurrency)} />
                  <MarketMetric label={t('market_daily_change')} value={`${selected.changePercent >= 0 ? '+' : ''}${selected.changePercent.toFixed(2)}%`} />
                  <MarketMetric label={t('market_trend')} value={t(`market_trend_${selected.trend}`)} icon={trendIcon} />
                </div>
                <div className="levels-strip">
                  <span>{t('market_support_zone')} {money(selected.levels.support, selectedCurrency)} ({distancePercent(selected.levels.support, selected.latestPrice).toFixed(1)}%)</span>
                  <i>
                    <b style={{ insetInlineStart: '20%' }} />
                    <b className="current" style={{ insetInlineStart: '50%' }} />
                    <b style={{ insetInlineStart: '80%' }} />
                  </i>
                  <span>{t('market_resistance_zone')} {money(selected.levels.resistance, selectedCurrency)} ({percent(distancePercent(selected.levels.resistance, selected.latestPrice))})</span>
                </div>
              </div>

              <aside className="market-panel">
                <div className="market-section-head">
                  <BarChart3 size={19} />
                  <div>
                    <span>{t('market_live_data')}</span>
                    <h2>{t('market_technical_indicators')}</h2>
                  </div>
                </div>
                <div className="indicator-list">
                  <MarketMetric label="RSI" value={String(selected.indicators.rsi)} />
                  <MarketMetric label="SMA 20" value={money(selected.indicators.sma20, selectedCurrency)} />
                  <MarketMetric label="SMA 50" value={money(selected.indicators.sma50, selectedCurrency)} />
                  <MarketMetric label={t('market_risk_level')} value={`${selected.indicators.volatility.toFixed(1)}%`} />
                  <MarketMetric label={t('market_support_zone')} value={money(selected.levels.support, selectedCurrency)} />
                  <MarketMetric label={t('market_resistance_zone')} value={money(selected.levels.resistance, selectedCurrency)} />
                </div>
              </aside>

              <aside className="market-panel">
                <div className="market-section-head">
                  <FileText size={19} />
                  <div>
                    <span>{t('market_live_data')}</span>
                    <h2>{t('market_fundamental_snapshot')}</h2>
                  </div>
                </div>
                {hasFundamentals ? (
                  <div className="indicator-list">
                    <MarketMetric label={t('market_market_cap')} value={fundamentalValue('marketCap')} />
                    <MarketMetric label={t('market_pe_ratio')} value={fundamentalValue('peRatio')} />
                    <MarketMetric label={t('market_eps')} value={fundamentalValue('eps')} />
                    <MarketMetric label={t('market_revenue')} value={fundamentalValue('revenue')} />
                    <MarketMetric label={t('market_dividend')} value={fundamentalValue('dividend')} />
                    <MarketMetric label={t('market_data_status')} value={`${t(`market_data_status_${selected.dataStatus ?? 'live'}`)} · ${selected.fundamentalsSource ?? selected.source ?? 'OpenBB'}`} />
                  </div>
                ) : (
                  <div className="fundamentals-empty">
                    <AlertTriangle size={18} />
                    <strong>{t('market_fundamentals_empty_title')}</strong>
                    <p>{fundamentalsSupported ? t(fundamentalsReasonTranslationKey(fundamentalsUnavailableReason)) : t('market_fundamentals_unsupported_asset')}</p>
                    <small>{t('market_asset_type_label')}: {selected ? t(assetTypeTranslationKey(selected.assetType)) : t('market_asset_type_unknown')}</small>
                  </div>
                )}
              </aside>
            </section>

            <section className="market-tools-grid">
              <article className="market-panel">
                <div className="market-section-head">
                  <Calculator size={19} />
                  <div>
                    <span>{t('market_estimated_scenarios')}</span>
                    <h2>{t('market_what_if')}</h2>
                  </div>
                </div>
                <label className="tool-input">
                  <span>{t('market_amount')}</span>
                  <div className="market-currency-input">
                    <span className="market-input-affix" dir="ltr">{scenarioCurrency}</span>
                    <input
                      value={whatIfAmount}
                      inputMode="decimal"
                      onChange={event => setWhatIfAmount(event.target.value)}
                      placeholder={scenarioAmountPlaceholder}
                      aria-invalid={invalidWhatIfAmount}
                      aria-describedby={invalidWhatIfAmount ? 'market-what-if-error' : undefined}
                    />
                    <div
                      className="market-scenario-currency"
                      onBlur={event => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setScenarioCurrencyOpen(false);
                        }
                      }}
                    >
                      <span>{t('market_amount_currency_label')}</span>
                      <button
                        type="button"
                        className="market-scenario-currency-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={scenarioCurrencyOpen}
                        aria-label={t('currency_select')}
                        onClick={() => setScenarioCurrencyOpen(open => !open)}
                      >
                        <b>{scenarioCurrencySymbol}</b>
                        <small>▾</small>
                      </button>
                      {scenarioCurrencyOpen && (
                        <div className="market-scenario-currency-menu" role="listbox" aria-label={t('currency_select')}>
                          {SCENARIO_CURRENCY_OPTIONS.map(option => (
                            <button
                              key={option.code}
                              type="button"
                              role="option"
                              aria-selected={option.code === scenarioCurrency}
                              onClick={() => {
                                setScenarioCurrency(option.code);
                                setScenarioCurrencyTouched(true);
                                setScenarioCurrencyOpen(false);
                              }}
                            >
                              <span>{option.symbol}</span>
                              <b>{option.code}</b>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <small>{t('market_amount_helper')}</small>
                  {invalidWhatIfAmount && <small id="market-what-if-error" className="market-field-error">{t('market_invalid_amount')}</small>}
                </label>
                <div className="scenario-grid">
                  <MarketMetric label={t('market_estimated_units')} value={hasWhatIfAmount ? estimatedUnits.toFixed(4) : '--'} valueDir="ltr" />
                  {[5, -5, 10, -10].map(change => (
                    <MarketMetric
                      key={change}
                      label={change > 0 ? `${t('market_positive_scenario')} ${change}%` : `${t('market_negative_scenario')} ${change}%`}
                      value={hasWhatIfAmount ? formatScenarioCurrency((whatIfValue * change) / 100) : '--'}
                      valueDir="ltr"
                    />
                  ))}
                </div>
              </article>

              <article className="market-panel" id="market-alerts">
                <div className="market-section-head">
                  <Bell size={19} />
                  <div>
                    <span>{t('market_saved_alerts_only')}</span>
                    <h2>{t('market_price_alerts')}</h2>
                  </div>
                </div>
                <div className="alert-form">
                  <select value={alertType} onChange={event => setAlertType(normalizeAlertType(event.target.value))}>
                    <option value="above">{t('market_alert_above')}</option>
                    <option value="below">{t('market_alert_below')}</option>
                    <option value="change_exceeds">{t('market_alert_change')}</option>
                    <option value="rsi_above">{t('market_alert_rsi_above')}</option>
                    <option value="rsi_below">{t('market_alert_rsi_below')}</option>
                  </select>
                  <input value={alertThreshold} inputMode="decimal" onChange={event => setAlertThreshold(event.target.value)} disabled={alertType === 'rsi_above' || alertType === 'rsi_below'} />
                  <button type="button" onClick={() => void saveAlert()}><Plus size={15} />{t('market_create_alert')}</button>
                </div>
                <div className="saved-alerts">
                  {alerts.length === 0 ? <p className="market-muted">{t('market_no_data')}</p> : alerts.slice(0, 4).map((alert, index) => (
                    <span key={`${alert.id ?? index}-${alert.symbol}`}>
                      <b>{alert.symbol} - {t(`market_alert_type_${alert.alertType}`)} {alert.threshold}</b>
                      <button type="button" aria-label={t('delete')} onClick={() => void removeAlert(alert, index)}><Trash2 size={13} /></button>
                    </span>
                  ))}
                </div>
              </article>

              <article className="market-panel">
                <div className="market-section-head">
                  <FileText size={19} />
                  <div>
                    <span>{t('market_ai_summary')}</span>
                    <h2>{t('market_ai_asset_report')}</h2>
                  </div>
                </div>
                <button type="button" className="report-button" onClick={() => setReportOpen(open => !open)}>
                  <FileText size={16} />{t('market_generate_ai_report')}
                </button>
                {reportOpen && (
                  <div className="asset-report">
                    {reportLines.map(line => <p key={line}>{line}</p>)}
                    <small>{t('market_disclaimer')}</small>
                  </div>
                )}
              </article>
            </section>

            <section className="market-bottom-grid">
              <div className="market-panel">
                <div className="market-section-head">
                  <Brain size={19} />
                  <div>
                    <span>{t('market_volume_signal')}</span>
                    <h2>{t('market_ai_summary')}</h2>
                  </div>
                </div>
                <div className="ai-summary-compact">
                  {aiSummaryIntro && <p className="ai-summary-intro">{aiSummaryIntro}</p>}
                  {aiSummarySections.slice(0, 2).map(section => (
                    <section className="ai-summary-section" key={`bottom-${section.title}`}>
                      <b>{section.title}</b>
                      {'body' in section && section.body ? <p>{section.body}</p> : null}
                      {'items' in section && section.items ? (
                        <ul>
                          {section.items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                  <small>{t('market_ai_summary_disclaimer')}</small>
                </div>
              </div>
              <div className="market-panel" id="watchlist">
                <div className="market-section-head">
                  <Star size={19} />
                  <div>
                    <span>{watchlist.length === 0 ? t('market_search_examples') : watchlistHasSelected ? t('market_in_watchlist') : t('market_real_watchlist')}</span>
                    <h2>{t('market_watchlist')}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-action"
                  disabled={watchlistHasSelected}
                  onClick={() => void saveWatchlist({ symbol: selected.symbol, assetType: selected.assetType, name: localizedAssetName })}
                >
                  <Plus size={15} />{watchlistHasSelected ? t('market_in_watchlist') : t('market_add_to_watchlist')}
                </button>
                <div className="watchlist">
                  {watchlist.length === 0 ? suggestedAssets.map(asset => (
                    <button
                      type="button"
                      key={`${asset.symbol}-${asset.assetType}`}
                      onClick={() => void requestAnalysis(asset.providerSymbol ?? asset.symbol, asset.assetType, {
                        symbol: asset.symbol,
                        providerSymbol: asset.providerSymbol ?? asset.symbol,
                        name: asset.name,
                        assetType: asset.assetType,
                        exchange: asset.exchange,
                      })}
                    >
                      {asset.symbol}
                    </button>
                  )) : watchlist.map(asset => (
                    <span key={`${asset.id ?? asset.symbol}-${asset.assetType}`}>
                      <button type="button" onClick={() => void requestAnalysis(asset.symbol, asset.assetType)}>{asset.symbol}</button>
                      <button type="button" aria-label={t('delete')} onClick={() => void removeWatchlist(asset)}><Trash2 size={13} /></button>
                    </span>
                  ))}
                </div>
                <p className="market-muted">{t('market_watchlist_note')}</p>
              </div>
              <div className="market-panel">
                <div className="market-section-head">
                  <ShieldAlert size={19} />
                  <div>
                    <span>{t('market_risk_level')}</span>
                    <h2>{t('market_compare_assets')}</h2>
                  </div>
                </div>
                <div className="compare-bars">
                  {compare.length === 0 ? <p className="market-muted">{t('market_no_data')}</p> : compare.slice(0, 4).map(asset => (
                    <div key={asset.symbol}>
                      <span>{asset.symbol}</span>
                      <i style={{ width: `${Math.min(100, Math.abs(asset.changePercent) * 18 + 22)}%` }} />
                      <b>{asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
                <div className="compare-table">
                  <div>
                    <b>{t('market_symbol')}</b>
                    <b>{t('market_current_price')}</b>
                    <b>{t('market_daily_change')}</b>
                    <b>RSI</b>
                    <b>{t('market_risk_level')}</b>
                    <b>{t('market_data_source')}</b>
                  </div>
                  {[selected, ...compare].filter((asset): asset is MarketAnalysis => Boolean(asset)).slice(0, 5).map(asset => {
                    const view = asset as MarketViewAnalysis;
                    return (
                      <div key={`table-${asset.symbol}`}>
                        <span>{asset.symbol}</span>
                        <span>{money(asset.latestPrice, asset.currency ?? asset.quote?.currency ?? 'USD')}</span>
                        <span className={asset.changePercent >= 0 ? 'up' : 'down'}>{percent(asset.changePercent)}</span>
                        <span>{asset.indicators.rsi}</span>
                        <span>{t(`market_risk_${asset.riskLevel}`)}</span>
                        <span>{view.fallback ? t('market_no_data') : 'OpenBB'}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="market-muted">{t('market_compare_note')}</p>
              </div>
            </section>
          </>
        ) : selected ? (
          <section className="market-panel market-focused-tab">
            {activeTab === 'alerts' && (
              <>
                <div className="market-section-head">
                  <Bell size={19} />
                  <div>
                    <span>{t('market_saved_alerts_only')}</span>
                    <h2>{t('market_price_alerts')}</h2>
                  </div>
                </div>
                <div className="alert-form">
                  <select value={alertType} onChange={event => setAlertType(normalizeAlertType(event.target.value))}>
                    <option value="above">{t('market_alert_above')}</option>
                    <option value="below">{t('market_alert_below')}</option>
                    <option value="change_exceeds">{t('market_alert_change')}</option>
                    <option value="rsi_above">{t('market_alert_rsi_above')}</option>
                    <option value="rsi_below">{t('market_alert_rsi_below')}</option>
                  </select>
                  <input value={alertThreshold} inputMode="decimal" onChange={event => setAlertThreshold(event.target.value)} disabled={alertType === 'rsi_above' || alertType === 'rsi_below'} />
                  <button type="button" onClick={() => void saveAlert()}><Plus size={15} />{t('market_create_alert')}</button>
                </div>
                <div className="saved-alerts">
                  {alerts.length === 0 ? <p className="market-muted">{t('market_no_data')}</p> : alerts.map((alert, index) => (
                    <span key={`${alert.id ?? index}-${alert.symbol}`}>
                      <b>{alert.symbol} - {t(`market_alert_type_${alert.alertType}`)} {alert.threshold}</b>
                      <button type="button" aria-label={t('delete')} onClick={() => void removeAlert(alert, index)}><Trash2 size={13} /></button>
                    </span>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'watchlist' && (
              <>
                <div className="market-section-head">
                  <Star size={19} />
                  <div>
                    <span>{watchlist.length === 0 ? t('market_search_examples') : watchlistHasSelected ? t('market_in_watchlist') : t('market_real_watchlist')}</span>
                    <h2>{t('market_watchlist')}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-action"
                  disabled={watchlistHasSelected}
                  onClick={() => void saveWatchlist({ symbol: selected.symbol, assetType: selected.assetType, name: localizedAssetName })}
                >
                  <Plus size={15} />{watchlistHasSelected ? t('market_in_watchlist') : t('market_add_to_watchlist')}
                </button>
                <div className="watchlist">
                  {watchlist.length === 0 ? suggestedAssets.map(asset => (
                    <button
                      type="button"
                      key={`${asset.symbol}-${asset.assetType}`}
                      onClick={() => void requestAnalysis(asset.providerSymbol ?? asset.symbol, asset.assetType, {
                        symbol: asset.symbol,
                        providerSymbol: asset.providerSymbol ?? asset.symbol,
                        name: asset.name,
                        assetType: asset.assetType,
                        exchange: asset.exchange,
                      })}
                    >
                      {asset.symbol}
                    </button>
                  )) : watchlist.map(asset => (
                    <span key={`${asset.id ?? asset.symbol}-${asset.assetType}`}>
                      <button type="button" onClick={() => void requestAnalysis(asset.symbol, asset.assetType)}>{asset.symbol}</button>
                      <button type="button" aria-label={t('delete')} onClick={() => void removeWatchlist(asset)}><Trash2 size={13} /></button>
                    </span>
                  ))}
                </div>
                <p className="market-muted">{t('market_watchlist_note')}</p>
              </>
            )}

            {activeTab === 'comparison' && (
              <>
                <div className="market-section-head">
                  <ShieldAlert size={19} />
                  <div>
                    <span>{t('market_risk_level')}</span>
                    <h2>{t('market_compare_assets')}</h2>
                  </div>
                </div>
                <div className="compare-bars">
                  {compare.length === 0 ? <p className="market-muted">{t('market_no_data')}</p> : compare.map(asset => (
                    <div key={asset.symbol}>
                      <span>{asset.symbol}</span>
                      <i style={{ width: `${Math.min(100, Math.abs(asset.changePercent) * 18 + 22)}%` }} />
                      <b>{asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
                <div className="compare-table">
                  <div>
                    <b>{t('market_symbol')}</b>
                    <b>{t('market_current_price')}</b>
                    <b>{t('market_daily_change')}</b>
                    <b>RSI</b>
                    <b>{t('market_risk_level')}</b>
                    <b>{t('market_data_source')}</b>
                  </div>
                  {[selected, ...compare].filter((asset): asset is MarketAnalysis => Boolean(asset)).slice(0, 5).map(asset => {
                    const view = asset as MarketViewAnalysis;
                    return (
                      <div key={`focused-table-${asset.symbol}`}>
                        <span>{asset.symbol}</span>
                        <span>{money(asset.latestPrice, asset.currency ?? asset.quote?.currency ?? 'USD')}</span>
                        <span className={asset.changePercent >= 0 ? 'up' : 'down'}>{percent(asset.changePercent)}</span>
                        <span>{asset.indicators.rsi}</span>
                        <span>{t(`market_risk_${asset.riskLevel}`)}</span>
                        <span>{view.fallback ? t('market_no_data') : 'OpenBB'}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="market-muted">{t('market_compare_note')}</p>
              </>
            )}

            {activeTab === 'assetReport' && (
              <>
                <div className="market-section-head">
                  <FileText size={19} />
                  <div>
                    <span>{t('market_ai_summary')}</span>
                    <h2>{t('market_ai_asset_report')}</h2>
                  </div>
                </div>
                <button type="button" className="report-button" onClick={() => setReportOpen(open => !open)}>
                  <FileText size={16} />{t('market_generate_ai_report')}
                </button>
                {reportOpen && (
                  <div className="asset-report">
                    {reportLines.map(line => <p key={line}>{line}</p>)}
                    <small>{t('market_disclaimer')}</small>
                  </div>
                )}
                <div className="ai-summary-compact">
                  {aiSummaryIntro && <p className="ai-summary-intro">{aiSummaryIntro}</p>}
                  {aiSummarySections.slice(0, 2).map(section => (
                    <section className="ai-summary-section" key={`report-${section.title}`}>
                      <b>{section.title}</b>
                      {'body' in section && section.body ? <p>{section.body}</p> : null}
                      {'items' in section && section.items ? (
                        <ul>
                          {section.items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                  <small>{t('market_ai_summary_disclaimer')}</small>
                </div>
              </>
            )}
          </section>
        ) : (
          <div className="market-empty">{t('market_no_data')}</div>
        )}
        </section>

        <section className="market-disclaimer">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('market_disclaimer_title')}</strong>
            <p>{t('market_disclaimer')}</p>
          </div>
        </section>
      </main>

      <style jsx>{`
        .market-shell{min-height:100dvh;background:var(--sfm-light-card);color:var(--sfm-foreground);overflow-x:hidden;font-family:Tajawal,Arial,sans-serif}
        .market-main{width:calc(100% - var(--sidebar-w,230px));max-width:none;margin-inline-start:var(--sidebar-w,230px);margin-inline-end:0;padding:24px;display:grid;gap:22px;overflow-x:hidden;box-sizing:border-box}.market-main>*{width:100%;max-width:1500px;margin-inline:auto}
        .market-hero{position:relative;overflow:visible;border-radius:26px;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end;box-shadow:0 20px 60px rgba(3,18,37,.16);border:1px solid rgba(167,243,240,.24)}
        .market-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(167,243,240,.14);filter:blur(18px)}
        .market-hero-copy,.market-hero-card{position:relative;z-index:1}.market-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.28);background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}
        .market-hero h1{margin:0 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;font-weight:900}.market-hero p{max-width:760px;margin:0;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan)}.market-search-field{position:relative}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel label>div:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel label>div svg{color:var(--sfm-primary);flex-shrink:0}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:var(--sfm-card);color:var(--sfm-foreground);padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0;color:var(--sfm-foreground)}.market-search-panel input::placeholder{color:var(--sfm-muted);opacity:1}.market-search-panel select{cursor:pointer;box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel select option{color:var(--sfm-foreground);background:var(--sfm-card)}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-panel button svg{color:var(--sfm-primary-dark)}.market-search-panel button:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute;z-index:90;inset-inline:0;top:calc(100% + 12px);max-height:min(320px,48dvh);overflow-y:auto;background:var(--sfm-card);color:var(--sfm-foreground);border:1px solid rgba(29,140,255,.25);border-radius:14px;box-shadow:0 22px 60px rgba(3,18,37,.32);padding:10px;display:grid;gap:8px;overscroll-behavior:contain}.market-search-results strong{color:var(--sfm-primary-hover);font-size:12px;font-weight:900;padding:5px 7px}.market-search-results p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7;padding:12px}.market-search-results button{height:auto;min-height:58px;width:100%;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:12px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:start;box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(29,140,255,.10);border-color:rgba(29,140,255,.32);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-search-results button span{display:grid;gap:4px;min-width:0}.market-search-results button b{font-size:15px;color:var(--sfm-foreground);letter-spacing:.02em;direction:ltr;unicode-bidi:isolate}.market-search-results button em{font-style:normal;color:var(--sfm-midnight);font-size:13px;line-height:1.45;white-space:normal;overflow-wrap:anywhere}.market-search-results button small{color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.18);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;line-height:1.3;flex-shrink:0;white-space:nowrap}
        .market-search-field{z-index:70;min-width:0}.market-search-panel .market-search-input-shell{position:relative;z-index:2}.market-search-results{z-index:9999;top:calc(100% + 10px);max-height:min(360px,52dvh);overflow-y:auto;overflow-x:hidden;background:var(--sfm-card);border-color:rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;gap:6px}.market-search-results strong{padding:6px 8px;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-results p{border-radius:12px;background:rgba(29,140,255,.06);text-align:start}.market-search-results button{min-height:68px;display:grid;grid-template-columns:1fr;align-items:center;justify-items:stretch;gap:7px;padding:11px 12px;border-radius:14px;background:var(--sfm-light-card);border-color:rgba(29,140,255,.14);text-align:start;color:var(--sfm-foreground);box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(24,212,212,.10);border-color:rgba(47,214,192,.55);box-shadow:0 0 0 3px rgba(24,212,212,.16);outline:none}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:inherit;unicode-bidi:normal;letter-spacing:0;color:var(--sfm-foreground);font-size:14px}.market-search-results button em{flex-shrink:0;border-radius:999px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan);padding:4px 8px;font-style:normal;font-size:11px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;border:0;background:transparent;color:var(--sfm-muted);font-size:12px;line-height:1.55;text-align:start}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;box-shadow:0 24px 70px rgba(0,0,0,.42)}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.dark .market-search-results p{background:rgba(47,214,192,.08)}
        .market-search-field{position:relative;z-index:100;display:grid;gap:7px;min-width:0;overflow:visible}.market-search-field>label{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-combobox{position:relative;width:100%;overflow:visible}.market-search-panel .market-search-input-shell{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-submit{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-submit svg{color:var(--sfm-primary-dark)}.market-search-submit:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute!important;top:calc(100% + 10px)!important;right:0!important;left:0!important;z-index:9999!important;width:100%;max-height:min(320px,48dvh);overflow-y:auto!important;overflow-x:hidden!important;display:block!important;background:var(--sfm-card);border:1px solid rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;overscroll-behavior:contain}.market-search-results button{width:100%;min-height:68px;height:auto!important;display:grid!important;grid-template-columns:1fr!important;gap:7px;margin:0 0 6px;padding:11px 12px;border-radius:14px;text-align:start;cursor:pointer}.market-search-results button:last-of-type{margin-bottom:0}.market-search-results p{margin:0;padding:12px;border-radius:12px;text-align:start}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0;width:100%}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dark .market-search-panel .market-search-input-shell{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:var(--sfm-soft-cyan);line-height:1}.market-hero-card p{margin:0;font-size:13px}.market-hero-card em{font-style:normal;color:rgba(255,255,255,.78);font-size:12px;font-weight:900;line-height:1.5}.risk{justify-self:start;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.risk.low{background:#CCFBF1;color:#047857;border-color:rgba(15,118,110,.25)}.risk.medium{background:rgba(167,243,240,.18);color:var(--sfm-muted);border-color:rgba(167,243,240,.20)}.risk.high{background:#FEE2E2;color:#DC2626;border-color:rgba(220,38,38,.20)}.dark .risk.low{background:rgba(47,214,192,.12);color:#2FD6C0;border-color:rgba(47,214,192,.25)}.dark .risk.high{background:rgba(255,91,110,.12);color:#FF5B6E;border-color:rgba(255,91,110,.25)}
        .market-card-grid,.market-status-grid,.market-decision-grid,.market-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-status-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.market-decision-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}.market-decision-grid>.market-panel{align-self:start}.market-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-card,.market-panel,.market-disclaimer,.market-notice,.market-stock-header{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:24px;box-shadow:0 6px 24px rgba(3,18,37,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:var(--sfm-foreground)}.change{display:inline-flex;align-items:center;gap:4px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.up:not(.change){color:#047857}.down:not(.change){color:#DC2626}.dark .change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.dark .up:not(.change){color:#2FD6C0}.dark .down:not(.change){color:#FF5B6E}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--sfm-muted);font-weight:900;background:var(--sfm-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px}.market-empty-detailed{display:grid;gap:10px;justify-items:center;text-align:center}.market-empty-detailed strong{color:var(--sfm-foreground);font-size:17px}.market-empty-detailed span{color:var(--sfm-muted);font-size:13px;line-height:1.6}.market-empty-detailed p{margin:0;max-width:680px;color:var(--sfm-muted);line-height:1.8}.market-empty-detailed button{border:0;border-radius:999px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:10px 16px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.market-notice button{border:0;border-radius:999px;background:var(--sfm-foreground);color:var(--sfm-card);padding:8px 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-notice button:disabled{opacity:.55;cursor:not-allowed}.market-suggestion-chips{flex-basis:100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.market-suggestion-chips small{color:var(--sfm-muted);font-size:12px;font-weight:950;line-height:1.4}.market-suggestion-chips button{background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.28);color:var(--sfm-primary-hover);min-height:34px;padding:0 12px}.market-suggestion-chips button:hover,.market-suggestion-chips button:focus-visible{outline:none;background:rgba(47,214,192,.18);border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.market-notice.success{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-notice.slow{color:#92400E;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22)}
        .market-stock-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}.market-stock-header h2{margin:8px 0 4px;color:var(--sfm-foreground);font-size:28px}.market-stock-header p{margin:0;color:var(--sfm-muted);font-weight:850}.stock-price-block{display:grid;justify-items:end;gap:5px;text-align:end}.stock-price-block strong{font-size:30px;color:var(--sfm-foreground);font-weight:950}.stock-price-block small{color:var(--sfm-muted);font-weight:850}.data-badge{display:inline-flex;width:max-content;border-radius:999px;border:1px solid rgba(29,140,255,.22);background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-size:11px;font-weight:950}.data-badge.delayed{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22);color:#B45309}.data-badge.unavailable{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.22);color:#B91C1C}
        .market-service{display:flex;align-items:center;gap:9px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:18px;padding:12px 14px;color:var(--sfm-muted);font-weight:900;box-shadow:0 6px 24px rgba(3,18,37,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.slow,.market-service.not_configured{color:#92400E;background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.20)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px}.market-chart{grid-row:span 2}.market-panel{padding:22px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:var(--sfm-soft-cyan)}.market-section-head span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:var(--sfm-foreground);font-size:17px;font-weight:900;line-height:1.35}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.timeframe-row{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 12px}.timeframe-row button{border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:7px 11px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.timeframe-row button[aria-pressed="true"],.timeframe-row button:hover,.timeframe-row button:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.metric{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:13px;display:grid;gap:7px;min-width:0;align-content:start}.metric span{font-size:11px;color:var(--sfm-muted);font-weight:900;line-height:1.45}.metric strong{font-size:15px;color:var(--sfm-foreground);display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.45}.indicator-list,.scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.portfolio-card{display:grid;gap:14px;align-content:start;padding:18px}.portfolio-card .market-section-head{margin-bottom:0}.portfolio-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.portfolio-metric-grid .metric{border-radius:14px;padding:11px 12px;gap:5px}.portfolio-metric-grid .metric span{font-size:10.5px;line-height:1.35}.portfolio-metric-grid .metric strong{font-size:14px;line-height:1.35}.fundamentals-empty{display:grid;gap:9px;background:var(--sfm-light-card);border:1px dashed rgba(167,243,240,.22);border-radius:18px;padding:16px;color:var(--sfm-muted);line-height:1.8}.fundamentals-empty svg{color:var(--sfm-soft-cyan)}.fundamentals-empty strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45}.fundamentals-empty p{margin:0;color:var(--sfm-muted);font-weight:850}.fundamentals-empty small{width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.25);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:5px 9px;font-weight:950;line-height:1.35}.asset-profile-card{margin:16px 0;display:grid;gap:0}.asset-profile-body{display:grid;gap:14px}.asset-profile-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid rgba(47,214,192,.18);background:rgba(47,214,192,.08);border-radius:18px;padding:15px}.asset-profile-header strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.35}.asset-profile-header p,.asset-profile-section p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.8}.asset-profile-badges{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.asset-profile-badges span{border:1px solid rgba(47,214,192,.24);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2}.asset-profile-section{display:grid;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:18px;padding:14px}.asset-profile-section h3{margin:0;display:flex;align-items:center;gap:7px;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.asset-profile-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.asset-profile-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:14px;padding:10px}.asset-profile-metric span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.asset-profile-metric strong{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}.asset-profile-link{min-height:58px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.10);border-radius:14px;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;text-decoration:none}.asset-profile-link:hover,.asset-profile-link:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.asset-profile-holdings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.asset-profile-holdings span{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:13px;padding:9px 10px;min-width:0}.asset-profile-holdings b{color:var(--sfm-foreground);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-profile-holdings em{color:var(--sfm-soft-cyan);font-size:11px;font-weight:950;font-style:normal;white-space:nowrap}.asset-profile-limitations ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.asset-profile-footer{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-muted);font-size:11px;font-weight:900}.asset-profile-footer span{border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.asset-profile-state{display:flex;align-items:center;gap:9px;border:1px dashed rgba(167,243,240,.22);background:var(--sfm-light-card);border-radius:16px;padding:14px;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.6}.asset-profile-state.error{border-color:rgba(239,68,68,.25);color:#B91C1C}.dark .asset-profile-state.error{color:#FF8A96}.asset-profile-pulse{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}.decision-body{display:grid;gap:13px}.decision-body b{font-size:25px;font-weight:900;color:var(--sfm-foreground);line-height:1.25}.decision-body p,.decision-body small,.decision-body strong{margin:0;color:var(--sfm-muted);line-height:1.9;font-weight:800;overflow-wrap:anywhere}.decision-body small{font-size:12px;color:var(--sfm-muted)}.decision-body strong{color:var(--sfm-muted)}.ai-summary-body{align-content:start}.ai-summary-intro{border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);border-radius:14px;padding:10px 12px;color:var(--sfm-foreground)!important;font-size:13px;line-height:1.75}.ai-summary-section{display:grid;gap:5px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:12px}.ai-summary-section b{font-size:13px;color:var(--sfm-foreground);font-weight:950}.ai-summary-section p{font-size:13px;line-height:1.75}.ai-summary-section ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.75}.ai-summary-loading{display:flex;align-items:center;gap:9px;color:var(--sfm-muted);font-size:13px;font-weight:950}.ai-summary-loading span{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}@keyframes marketPulse{50%{transform:scale(.72);opacity:.55}}.ai-summary-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ai-summary-actions small{flex:1;min-width:180px}.ai-regenerate{margin:0;width:max-content;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff}.risk-score{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:10px 12px}.risk-score span,.risk-score strong{font-size:12px!important;color:var(--sfm-foreground)!important;font-weight:950!important;line-height:1.3!important}.risk-score i{height:9px;border-radius:999px;background:rgba(29,140,255,.12);overflow:hidden}.risk-score i b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sfm-primary),#F59E0B,#EF4444)}.decision.ok{border-color:rgba(34,197,94,.22)}.decision.warn{border-color:rgba(167,243,240,.28)}.decision.danger{border-color:rgba(239,68,68,.22)}.levels-strip{margin-top:16px;display:grid;gap:10px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.6}.levels-strip i{position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,#22C55E,var(--sfm-soft-cyan),#EF4444);display:block}.levels-strip b{position:absolute;top:-4px;width:4px;height:18px;border-radius:999px;background:var(--sfm-foreground)}.levels-strip b.current{width:10px;height:10px;top:0;transform:translateX(-50%);background:#FFF;border:2px solid var(--sfm-foreground)}.tool-input,.alert-form{display:grid;gap:10px}.tool-input span{font-size:12px;font-weight:900;color:var(--sfm-muted);line-height:1.5}.tool-input input,.alert-form input,.alert-form select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;line-height:1.5}.market-currency-input{min-height:52px;display:flex;align-items:center;gap:9px;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 9px;transition:border-color .18s ease,box-shadow .18s ease;position:relative}.market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.tool-input .market-currency-input input{border:0;background:transparent;padding:0;box-shadow:none;flex:1;min-width:0}.tool-input .market-currency-input input::placeholder{color:var(--sfm-muted);opacity:1}.market-scenario-currency{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:7px}.market-scenario-currency>span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.2}.market-scenario-currency-trigger{min-width:62px;height:36px;border-radius:999px;border:1px solid rgba(15,118,110,.25);background:#CCFBF1;color:#0F766E;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-scenario-currency-trigger:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-scenario-currency-trigger b{direction:rtl;unicode-bidi:isolate;font-size:12px}.market-scenario-currency-trigger small{font-size:10px;line-height:1}.market-scenario-currency-menu{position:absolute;inset-inline-end:0;top:calc(100% + 8px);z-index:80;width:150px;max-height:260px;overflow:auto;border:1px solid rgba(47,214,192,.28);border-radius:14px;background:var(--sfm-card);box-shadow:0 18px 44px rgba(3,18,37,.22);padding:6px;display:grid;gap:5px}.market-scenario-currency-menu button{height:38px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--sfm-foreground);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-scenario-currency-menu button:hover,.market-scenario-currency-menu button:focus-visible,.market-scenario-currency-menu button[aria-selected="true"]{outline:none;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.28)}.market-scenario-currency-menu button span{color:var(--sfm-foreground);font-size:13px}.market-scenario-currency-menu button b{direction:ltr;unicode-bidi:isolate;color:var(--sfm-muted);font-size:11px}.dark .market-scenario-currency-trigger{border-color:rgba(47,214,192,.25);background:rgba(47,214,192,.12);color:#2FD6C0}.dark .market-scenario-currency-menu{background:#0f1d31;border-color:#1d3050;box-shadow:0 22px 56px rgba(0,0,0,.38)}.dark .market-scenario-currency-menu button:hover,.dark .market-scenario-currency-menu button:focus-visible,.dark .market-scenario-currency-menu button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.market-field-error{display:block;color:#B91C1C;font-size:12px;font-weight:900;line-height:1.55}.dark .market-field-error{color:#FF5B6E}.alert-form{grid-template-columns:minmax(0,1fr) 110px auto;align-items:stretch}.alert-form button,.inline-action,.report-button{border:0;border-radius:14px;background:var(--sfm-foreground);color:var(--sfm-card);padding:12px 14px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;line-height:1.45}.inline-action{margin-bottom:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.inline-action:disabled{opacity:.58;cursor:default}.saved-alerts,.asset-report{display:grid;gap:10px;margin-top:14px}.saved-alerts span,.asset-report p{margin:0;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:12px;padding:10px 11px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.65}.saved-alerts span{display:flex;align-items:center;justify-content:space-between;gap:9px}.saved-alerts span b{min-width:0;overflow-wrap:anywhere}.saved-alerts button{border:0;background:transparent;color:var(--sfm-muted);cursor:pointer;display:inline-flex;padding:2px}.asset-report small{color:var(--sfm-muted);line-height:1.75;font-weight:800;display:block}
        .ai-summary-compact{display:grid;gap:10px;align-content:start}.ai-summary-compact small{color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.7}
        .economic-calendar-panel{display:grid;gap:16px;overflow:hidden}.economic-calendar-empty{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;border:1px solid rgba(245,158,11,.24);background:linear-gradient(135deg,rgba(245,158,11,.10),rgba(29,140,255,.06)),var(--sfm-card);border-radius:28px;padding:20px;box-shadow:0 16px 40px rgba(3,18,37,.07)}.economic-calendar-empty-icon{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.24);color:#B45309}.economic-calendar-empty small{display:block;color:#B45309;font-size:12px;font-weight:950;line-height:1.4;margin-bottom:5px}.economic-calendar-empty strong{display:block;color:var(--sfm-foreground);font-size:clamp(18px,2vw,24px);font-weight:950;line-height:1.35}.economic-calendar-empty p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.9}.economic-calendar-empty em{display:inline-flex;width:max-content;max-width:100%;margin-top:12px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 11px;font-style:normal;font-size:12px;font-weight:950;line-height:1.4}.economic-calendar-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}.economic-calendar-chips span{border:1px solid rgba(245,158,11,.22);background:rgba(255,255,255,.62);color:#92400E;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}.economic-calendar-next{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(47,214,192,.08)),var(--sfm-card);border-radius:24px;padding:16px;box-shadow:0 12px 32px rgba(3,18,37,.06)}.economic-calendar-next span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950;margin-bottom:5px}.economic-calendar-next strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.4}.economic-calendar-next-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.economic-calendar-next-meta b,.economic-calendar-next-meta small{border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}.economic-calendar-filters{width:100%;max-width:100%;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.economic-calendar-filters::-webkit-scrollbar{display:none}.economic-calendar-filters button{flex:0 0 auto;min-height:40px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.economic-calendar-filters button[aria-pressed="true"],.economic-calendar-filters button:hover,.economic-calendar-filters button:focus-visible{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;box-shadow:0 10px 22px rgba(29,140,255,.18)}.economic-calendar-list{display:grid;gap:12px}.economic-calendar-event{display:grid;gap:14px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:22px;padding:15px;box-shadow:0 10px 26px rgba(3,18,37,.05)}.economic-calendar-event-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.economic-calendar-event-main b{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.5}.economic-calendar-event-main span{flex:0 0 auto;color:var(--sfm-muted);font-size:12px;font-weight:950;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.economic-calendar-event-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.economic-calendar-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px}.economic-calendar-metric small{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.economic-calendar-metric b{color:var(--sfm-foreground);font-size:12px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}.dark .economic-calendar-empty{background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(29,140,255,.07)),#0f1d31;border-color:rgba(245,185,66,.26)}.dark .economic-calendar-empty-icon{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.24);color:#F5B942}.dark .economic-calendar-empty small{color:#F5B942}.dark .economic-calendar-chips span{background:rgba(245,185,66,.11);border-color:rgba(245,185,66,.22);color:#FDE68A}.dark .economic-calendar-empty em,.dark .economic-calendar-next-meta b,.dark .economic-calendar-next-meta small{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .economic-calendar-next,.dark .economic-calendar-event{background:#0f1d31;border-color:#1d3050}.dark .economic-calendar-event-main span,.dark .economic-calendar-metric{background:#0a1422;border-color:#1d3050}.dark .economic-calendar-filters button{background:#0a1422;border-color:#1d3050;color:#b8c7d9}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:var(--sfm-muted);line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:var(--sfm-muted);font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span,.watchlist>button{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);padding:7px 11px;color:var(--sfm-muted);font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:6px}.watchlist button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:var(--sfm-muted)}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));display:block}.compare-table{margin-top:14px;overflow-x:auto;display:grid;gap:7px}.compare-table>div{display:grid;grid-template-columns:60px 90px 70px 52px 76px 80px;gap:7px;min-width:470px}.compare-table b,.compare-table span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.compare-table b{color:var(--sfm-muted)}
        .trader-dashboard{display:grid;gap:16px}.tool-tabs,.symbol-chip-row,.overlap-row{display:flex;flex-wrap:wrap;gap:8px}.tool-tabs button,.symbol-chip-row button{min-height:38px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-muted);padding:0 13px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.tool-tabs button[aria-pressed="true"],.tool-tabs button:hover,.tool-tabs button:focus-visible,.symbol-chip-row button[aria-pressed="true"],.symbol-chip-row button:hover,.symbol-chip-row button:focus-visible{outline:none;background:linear-gradient(135deg,rgba(29,140,255,.18),rgba(47,214,192,.14));border-color:rgba(47,214,192,.38);color:var(--sfm-foreground);box-shadow:0 0 0 3px rgba(24,212,212,.12)}.trader-tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.trader-tool-card{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:18px;padding:16px;display:grid;gap:14px;min-width:0}.trader-tool-card.compact{align-content:start}.trader-tool-card h3{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:950;line-height:1.45}.trader-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tool-input select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;color:var(--sfm-foreground)}.tool-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tool-warning{margin:0;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.10);color:#92400E;border-radius:13px;padding:10px 12px;font-size:12px;font-weight:900;line-height:1.7}.trader-table-wrap{overflow-x:auto;border:1px solid rgba(167,243,240,.14);border-radius:18px}.trader-table{display:grid;min-width:780px}.trader-table>div{display:grid;grid-template-columns:90px minmax(160px,1fr) 110px 90px 90px 90px 90px;gap:10px;padding:11px 12px;border-bottom:1px solid rgba(167,243,240,.10);align-items:center}.trader-table>div:last-child{border-bottom:0}.trader-table b{color:var(--sfm-muted);font-size:11px;font-weight:950}.trader-table span{color:var(--sfm-foreground);font-size:12px;font-weight:900;overflow-wrap:anywhere}.trader-empty-state{display:grid;gap:9px;justify-items:start;border:1px dashed rgba(167,243,240,.24);background:var(--sfm-light-card);border-radius:18px;padding:18px;color:var(--sfm-muted)}.trader-empty-state svg{color:var(--sfm-soft-cyan)}.trader-empty-state strong{color:var(--sfm-foreground);font-size:15px;font-weight:950}.trader-empty-state p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.session-timeline{position:relative;height:48px;border-radius:999px;background:linear-gradient(90deg,rgba(29,140,255,.10),rgba(47,214,192,.12));border:1px solid rgba(167,243,240,.14);overflow:hidden}.session-timeline span{position:absolute;top:7px;bottom:7px;border-radius:999px;background:rgba(148,163,184,.22);color:var(--sfm-muted);display:grid;place-items:center;font-size:11px;font-weight:950;min-width:54px}.session-timeline span.open{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.sessions-grid{margin-top:14px}.session-badge{width:max-content;border-radius:999px;padding:6px 10px;background:rgba(148,163,184,.12);color:var(--sfm-muted);font-size:12px}.session-badge.open{background:rgba(47,214,192,.14);color:var(--sfm-primary-hover)}.overlap-row{margin-top:14px}.overlap-row span{border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.overlap-row span.active{background:rgba(47,214,192,.14);border-color:rgba(47,214,192,.32);color:var(--sfm-primary-hover)}
        .technical-analysis-panel{display:grid;gap:16px;overflow:hidden}.technical-selector-shell{display:grid;gap:13px;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.08)),var(--sfm-light-card);border-radius:24px;padding:14px;min-width:0}.technical-search{min-height:48px;display:flex;align-items:center;gap:10px;border:1px solid rgba(167,243,240,.18);background:var(--sfm-card);border-radius:18px;padding:0 13px;color:var(--sfm-muted);min-width:0}.technical-search:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.technical-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--sfm-foreground);font:900 13px Tajawal,Arial,sans-serif;line-height:1.4}.technical-search input::placeholder{color:var(--sfm-muted);opacity:1}.technical-search button{width:28px;height:28px;border:0;border-radius:999px;background:rgba(148,163,184,.12);color:var(--sfm-muted);font:950 15px Arial,sans-serif;cursor:pointer}.technical-category-row,.technical-symbol-row{width:100%;max-width:100%;display:flex;flex-wrap:nowrap;gap:9px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.technical-category-row::-webkit-scrollbar,.technical-symbol-row::-webkit-scrollbar{display:none}.technical-category-row button{flex:0 0 auto;min-height:40px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 15px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.technical-category-row button[aria-pressed="true"],.technical-category-row button:hover,.technical-category-row button:focus-visible{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;box-shadow:0 10px 22px rgba(29,140,255,.18)}.technical-symbol-pill{flex:0 0 auto;display:flex;align-items:center;gap:4px;min-height:42px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);padding:3px;color:var(--sfm-foreground);box-shadow:0 10px 24px rgba(5,22,42,.05)}.technical-symbol-pill[data-active="true"]{border-color:transparent;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 14px 30px rgba(29,140,255,.22)}.technical-symbol-main,.technical-symbol-favorite{border:0;background:transparent;color:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.technical-symbol-main{min-height:34px;padding:0 10px;font:950 13px Tajawal,Arial,sans-serif;letter-spacing:.01em}.technical-symbol-main span{unicode-bidi:isolate}.technical-symbol-favorite{width:32px;height:32px;border-radius:999px;color:inherit;opacity:.78}.technical-symbol-favorite:hover,.technical-symbol-favorite:focus-visible{outline:none;background:rgba(255,255,255,.18);opacity:1}.technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite:hover,.technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite:focus-visible{background:rgba(47,214,192,.12);color:var(--sfm-primary-hover)}.technical-favorites{display:grid;gap:6px;min-width:0}.technical-favorites>span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.4}.technical-symbol-row.compact{padding-bottom:2px}.technical-no-results{flex:0 0 auto;border:1px dashed rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:10px 13px;font-size:12px;font-weight:900}.technical-selected-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.technical-result-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.market-status-grid .metric{border-radius:20px;background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07)),var(--sfm-light-card);border-color:rgba(47,214,192,.16)}
        .market-panel.trader-dashboard{width:100%;max-width:100%;overflow:hidden;padding:clamp(16px,4vw,28px);border-radius:28px;background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.08)),var(--sfm-card);display:grid;gap:18px;box-sizing:border-box}.trader-dashboard *{box-sizing:border-box}.trader-dashboard-head{margin:0;align-items:center;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.09));border-radius:22px;padding:14px;min-width:0}.trader-dashboard-head>div{min-width:0}.trader-dashboard-head h2{font-size:clamp(24px,5vw,34px);line-height:1.15}.trader-head-icon,.trader-tool-card-head span{width:42px;height:42px;border-radius:16px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.14);color:var(--sfm-soft-cyan);border:1px solid rgba(47,214,192,.22)}.tool-tabs{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tool-tabs::-webkit-scrollbar{display:none}.tool-tabs button{flex:0 0 auto;white-space:nowrap;min-height:42px;border-radius:16px;padding:0 14px;font-size:13px;max-width:none}.trader-tool-grid{grid-template-columns:1fr;gap:16px;min-width:0}.trader-tool-card{width:100%;max-width:100%;overflow:hidden;border-radius:24px;padding:18px;gap:16px;background:var(--sfm-card);border-color:rgba(47,214,192,.16);box-shadow:0 10px 30px rgba(3,18,37,.06)}.trader-tool-card-head{display:flex;align-items:center;gap:10px;min-width:0}.trader-tool-card-head h3{font-size:clamp(18px,4vw,22px);line-height:1.35;min-width:0;overflow-wrap:anywhere}.trader-form-grid{grid-template-columns:1fr;gap:14px;min-width:0}.tool-input{width:100%;max-width:100%;display:grid!important;grid-template-columns:1fr!important;gap:8px;min-width:0;align-items:start}.tool-input span{display:block;color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.55;text-align:start}.tool-input input,.tool-input select{width:100%;max-width:100%;min-width:0;height:50px;border:1px solid rgba(167,243,240,.24);border-radius:16px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 14px;font:900 16px Tajawal,Arial,sans-serif;outline:0;box-shadow:none}.tool-input input:focus,.tool-input select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.tool-input input[dir="ltr"]{text-align:left;direction:ltr;unicode-bidi:isolate}.tool-results{display:grid;gap:10px;border-top:1px solid rgba(167,243,240,.14);padding-top:14px;min-width:0}.tool-results-title{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-result-grid{grid-template-columns:1fr;gap:10px;min-width:0}.tool-result-card{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:18px;padding:13px 14px}.tool-result-card span{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.45;text-align:start}.tool-result-card b{color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.3;overflow-wrap:anywhere;text-align:start}.tool-warning{display:block;margin:0;border-radius:16px;padding:12px 14px;font-size:13px;line-height:1.75}.dark .trader-tool-card{background:#0f1d31;border-color:#1d3050}.dark .tool-input input,.dark .tool-input select,.dark .tool-result-card{background:#0a1422;border-color:#1d3050;color:#e8eef6}@media(min-width:640px){.tool-result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:760px){.trader-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1180px){.trader-tool-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}[dir="rtl"] .trader-dashboard,[dir="rtl"] .trader-tool-card,[dir="rtl"] .tool-input span,[dir="rtl"] .tool-result-card span{text-align:right}[dir="rtl"] .tool-result-card b{text-align:left}[dir="ltr"] .trader-dashboard,[dir="ltr"] .trader-tool-card,[dir="ltr"] .tool-input span,[dir="ltr"] .tool-result-card span,[dir="ltr"] .tool-result-card b{text-align:left}
        .trader-dashboard-head{justify-content:space-between;gap:14px}.trader-dashboard-head small{margin-inline-start:auto;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:950;line-height:1.3;white-space:nowrap}.trader-tool-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px}.trader-tool-card{grid-column:span 4;border-radius:26px;padding:20px;background:linear-gradient(135deg,rgba(255,255,255,.70),rgba(234,246,255,.52)),var(--sfm-card);border-color:rgba(47,214,192,.18);box-shadow:0 16px 38px rgba(3,18,37,.08);align-content:start}.trader-tool-card-head{align-items:flex-start;justify-content:space-between;gap:12px;border:1px solid rgba(47,214,192,.14);background:rgba(47,214,192,.07);border-radius:20px;padding:12px}.trader-tool-card-head>div{display:grid;gap:5px;min-width:0}.trader-tool-card-head h3{margin:0;color:var(--sfm-foreground);font-size:clamp(17px,1.4vw,21px);font-weight:950;line-height:1.35}.trader-tool-card-head p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.7}.tool-reset{min-height:36px;border:1px solid rgba(47,214,192,.24);border-radius:999px;background:var(--sfm-card);color:var(--sfm-primary-hover);padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.tool-reset:hover,.tool-reset:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14);background:rgba(47,214,192,.12)}.tool-input{gap:8px}.tool-input span{color:var(--sfm-foreground);font-size:12px;font-weight:950;letter-spacing:0}.tool-input small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.6}.tool-input-shell,.market-currency-input{width:100%;min-height:56px;display:flex;align-items:center;gap:10px;border:1px solid rgba(47,214,192,.22);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.84),rgba(234,246,255,.58)),var(--sfm-card);padding:0 10px;box-shadow:0 12px 26px rgba(3,18,37,.06);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.tool-input-shell:focus-within,.market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16),0 14px 30px rgba(3,18,37,.09)}.tool-input-shell em,.market-input-affix{flex:0 0 auto;min-width:48px;text-align:center;border:1px solid rgba(47,214,192,.24);background:linear-gradient(135deg,rgba(47,214,192,.13),rgba(29,140,255,.08));color:var(--sfm-primary-hover);border-radius:14px;padding:8px 10px;font-style:normal;font-size:11px;font-weight:950;line-height:1.2;white-space:nowrap}.tool-input .tool-input-shell input,.tool-input .tool-input-shell select,.tool-input .market-currency-input input{height:54px!important;width:100%;min-width:0;border:0!important;background:transparent!important;color:var(--sfm-foreground);padding:0!important;box-shadow:none!important;font:950 16px Tajawal,Arial,sans-serif;outline:0}.tool-input .tool-input-shell input[dir="ltr"],.tool-input .market-currency-input input{text-align:left;direction:ltr;unicode-bidi:isolate}.tool-input-shell.select{padding-inline-end:12px}.tool-input-shell.select select{cursor:pointer}.market-scenario-currency{flex:0 0 auto}.market-scenario-currency>span{display:none}.market-scenario-currency-trigger{height:38px;min-width:54px;border-radius:14px}.tool-results{border:1px solid rgba(47,214,192,.16);border-radius:24px;background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07)),var(--sfm-light-card);padding:14px;display:grid;gap:12px}.tool-results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.tool-results-head small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.55}.tool-results-title{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-result-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tool-result-card{position:relative;overflow:hidden;min-height:96px;border-radius:20px;padding:15px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(234,246,255,.62)),var(--sfm-card);border:1px solid rgba(47,214,192,.18);box-shadow:0 12px 28px rgba(3,18,37,.06)}.tool-result-card:before{content:"";position:absolute;inset-inline-start:0;top:14px;bottom:14px;width:3px;border-radius:999px;background:linear-gradient(180deg,var(--sfm-primary),var(--sfm-accent))}.tool-result-card span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.4}.tool-result-card b{color:var(--sfm-foreground);font-size:clamp(18px,1.7vw,25px);font-weight:950;line-height:1.2;letter-spacing:0;direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere}.scenario-grid .metric,.portfolio-metric-grid .metric{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(234,246,255,.58)),var(--sfm-card);border-color:rgba(47,214,192,.18);box-shadow:0 10px 26px rgba(3,18,37,.05);padding:14px}.scenario-grid .metric:before,.portfolio-metric-grid .metric:before{content:"";position:absolute;inset-inline-start:0;top:12px;bottom:12px;width:3px;border-radius:999px;background:linear-gradient(180deg,var(--sfm-primary),var(--sfm-accent))}.scenario-grid .metric span,.portfolio-metric-grid .metric span{font-size:11px;color:var(--sfm-muted);font-weight:950}.scenario-grid .metric strong,.portfolio-metric-grid .metric strong{font-size:clamp(16px,1.4vw,21px);font-weight:950;direction:ltr;unicode-bidi:isolate;line-height:1.25}.dark .trader-dashboard-head small,.dark .tool-reset,.dark .tool-input-shell em,.dark .market-input-affix{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .trader-tool-card{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .trader-tool-card-head,.dark .tool-input-shell,.dark .market-currency-input,.dark .tool-result-card,.dark .scenario-grid .metric,.dark .portfolio-metric-grid .metric{background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.05)),#0a1422;border-color:#1d3050}.dark .tool-results{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .tool-input .tool-input-shell input,.dark .tool-input .tool-input-shell select,.dark .tool-input .market-currency-input input{color:#e8eef6}
        .trader-dashboard .tool-input{width:100%;max-width:100%;min-width:0;display:grid;grid-template-columns:1fr;gap:9px}.trader-dashboard .tool-input>span,.market-tools-grid .tool-input>span{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45}.trader-dashboard .tool-input small,.market-tools-grid .tool-input small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.65}.trader-dashboard .tool-input-shell,.market-tools-grid .market-currency-input{min-width:0;min-height:60px;border-radius:20px;border-color:rgba(47,214,192,.24);background:linear-gradient(135deg,rgba(255,255,255,.90),rgba(234,246,255,.66)),var(--sfm-card);box-shadow:0 14px 32px rgba(3,18,37,.07);padding-inline:12px}.trader-dashboard .tool-input-shell:focus-within,.market-tools-grid .market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18),0 18px 36px rgba(3,18,37,.10)}.trader-dashboard .tool-input-shell em,.market-tools-grid .market-input-affix{min-width:54px;min-height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:15px;background:linear-gradient(135deg,rgba(47,214,192,.16),rgba(29,140,255,.10));border-color:rgba(47,214,192,.28);color:var(--sfm-primary-hover);font-size:11px;font-weight:950;font-variant-numeric:tabular-nums}.trader-dashboard .tool-input .tool-input-shell input,.trader-dashboard .tool-input .tool-input-shell select,.market-tools-grid .market-currency-input input{height:58px!important;font-size:16px!important;font-weight:950!important;font-variant-numeric:tabular-nums;letter-spacing:0;color:var(--sfm-foreground)}.trader-dashboard .tool-results{border-radius:26px;padding:16px;background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.085)),var(--sfm-light-card);box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}.trader-dashboard .tool-results-head{padding-bottom:12px;border-bottom:1px solid rgba(47,214,192,.13)}.trader-dashboard .tool-result-grid{gap:12px}.trader-dashboard .tool-result-card{isolation:isolate;display:grid;align-content:space-between;gap:12px;min-height:104px;border-radius:22px;padding:16px;background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(234,246,255,.70)),var(--sfm-card);border-color:rgba(47,214,192,.20);box-shadow:0 14px 32px rgba(3,18,37,.07)}.trader-dashboard .tool-result-card span{font-size:11px;font-weight:950;color:var(--sfm-muted);line-height:1.45}.trader-dashboard .tool-result-card b{display:block;max-width:100%;text-align:left;font-size:clamp(18px,2vw,26px);font-weight:950;line-height:1.2;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere}.market-tools-grid .scenario-grid .metric,.portfolio-metric-grid .metric{min-width:0}.dark .trader-dashboard .tool-input-shell,.dark .market-tools-grid .market-currency-input,.dark .trader-dashboard .tool-result-card{background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(47,214,192,.06)),#0a1422;border-color:#1d3050}.dark .trader-dashboard .tool-results{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}@media(max-width:520px){.trader-dashboard .tool-input-shell,.market-tools-grid .market-currency-input{min-height:54px;border-radius:18px;padding-inline:8px;gap:7px}.trader-dashboard .tool-input-shell em,.market-tools-grid .market-input-affix{min-width:42px;min-height:34px;padding-inline:7px;font-size:10px}.market-scenario-currency-trigger{min-width:48px;height:34px;padding-inline:7px}.trader-dashboard .tool-input .tool-input-shell input,.trader-dashboard .tool-input .tool-input-shell select,.market-tools-grid .market-currency-input input{height:52px!important;font-size:15px!important}.trader-dashboard .tool-results{padding:13px;border-radius:22px}.trader-dashboard .tool-result-card{min-height:88px;padding:14px;border-radius:18px}.trader-dashboard .tool-result-card b{font-size:17px}.trader-dashboard,.trader-tool-card,.tool-result-grid{width:100%;max-width:100%;min-width:0;overflow:hidden}}
        .trader-currency-bar{display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:14px;align-items:end;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(234,246,255,.55)),var(--sfm-light-card);border-radius:24px;padding:14px;min-width:0}.trader-currency-action{display:grid;justify-items:start;align-content:end;gap:8px;min-width:0}.trader-currency-action button{min-height:46px;border:1px solid rgba(47,214,192,.26);border-radius:999px;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));color:var(--sfm-primary-hover);padding:0 16px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.06)}.trader-currency-action button:hover,.trader-currency-action button:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14),0 12px 26px rgba(3,18,37,.08)}.trader-currency-action button:disabled{opacity:.72;cursor:not-allowed}.trader-currency-action small{font-size:12px;font-weight:900;line-height:1.45}.trader-currency-action small.success{color:#047857}.trader-currency-action small.error{color:#B91C1C}.trader-active-tool{display:grid;gap:16px;min-width:0}.trader-active-intro{display:grid;gap:6px;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.08)),var(--sfm-light-card);border-radius:24px;padding:16px;min-width:0}.trader-active-intro span{color:var(--sfm-primary-hover);font-size:11px;font-weight:950;line-height:1.4}.trader-active-intro h3{margin:0;color:var(--sfm-foreground);font-size:clamp(20px,2.5vw,28px);font-weight:950;line-height:1.25}.trader-active-intro p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.trader-dashboard .trader-tool-grid{grid-template-columns:minmax(0,1.18fr) minmax(300px,.82fr);gap:16px;align-items:start}.trader-dashboard .trader-tool-card,.trader-dashboard .trader-result-stack{grid-column:auto;min-width:0}.trader-result-stack{display:grid;gap:14px;align-content:start;min-width:0}.tool-formula-card{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.08)),var(--sfm-card);border-radius:24px;padding:15px;box-shadow:0 10px 28px rgba(3,18,37,.05);min-width:0}.tool-formula-card>span{width:38px;height:38px;border-radius:15px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.13);border:1px solid rgba(47,214,192,.22);color:var(--sfm-soft-cyan)}.tool-formula-card div{display:grid;gap:6px;min-width:0}.tool-formula-card strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-formula-card p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.75}.tool-formula-card b{display:block;width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.35;overflow-wrap:anywhere;white-space:normal}.tool-advanced{grid-column:1/-1;border:1px solid rgba(47,214,192,.16);background:rgba(47,214,192,.06);border-radius:20px;padding:10px;min-width:0}.tool-advanced summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;color:var(--sfm-foreground);font-size:13px;font-weight:950;cursor:pointer;list-style:none}.tool-advanced summary::-webkit-details-marker{display:none}.tool-advanced summary:after{content:"+";width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);font-weight:950}.tool-advanced[open] summary{margin-bottom:12px}.tool-advanced[open] summary:after{content:"−"}.trader-disclaimer{margin:0;border:1px solid rgba(29,140,255,.18);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.06)),var(--sfm-card);border-radius:22px;padding:13px 15px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.dark .trader-currency-bar,.dark .trader-active-intro,.dark .tool-formula-card,.dark .trader-disclaimer{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .tool-advanced{background:#0a1422;border-color:#1d3050}.dark .tool-formula-card b{background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25);color:#2FD6C0}.dark .trader-currency-action small.success{color:#2FD6C0}.dark .trader-currency-action small.error{color:#FF5B6E}@media(max-width:1180px){.trader-dashboard .trader-tool-grid,.trader-currency-bar{grid-template-columns:1fr}.trader-dashboard .trader-tool-card,.trader-dashboard .trader-result-stack{grid-column:1/-1}}@media(max-width:720px){.trader-currency-action{justify-items:stretch}.trader-currency-action button{width:100%;min-height:44px}.tool-formula-card{display:grid}.tool-formula-card b{width:100%}.trader-active-intro,.trader-currency-bar{border-radius:20px;padding:13px}}
        .performance-card-list{display:none}.performance-table-desktop{display:block}.trader-table-wrap{width:100%;max-width:100%;overflow-x:auto;border:1px solid rgba(167,243,240,.14);border-radius:18px;-webkit-overflow-scrolling:touch}.trader-table{display:table;width:100%;min-width:760px;border-collapse:separate;border-spacing:0 8px;padding:8px}.trader-table th{padding:12px 16px;color:var(--sfm-muted);font-size:13px;font-weight:950;line-height:1.35;text-align:start;white-space:nowrap}.trader-table td{padding:13px 16px;background:var(--sfm-light-card);color:var(--sfm-foreground);font-size:13px;font-weight:900;line-height:1.45;white-space:nowrap;vertical-align:middle}.trader-table tbody tr td:first-child{border-start-start-radius:14px;border-end-start-radius:14px}.trader-table tbody tr td:last-child{border-start-end-radius:14px;border-end-end-radius:14px}.performance-symbol{display:inline-flex;direction:ltr;unicode-bidi:isolate;font-weight:950;letter-spacing:.02em}.performance-value{display:inline-flex;direction:ltr;unicode-bidi:isolate;font-weight:950}.performance-trend{display:inline-flex;align-items:center;justify-content:center;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2;white-space:nowrap}.performance-trend.bullish{background:#CCFBF1;color:#047857;border-color:rgba(15,118,110,.20)}.performance-trend.bearish{background:#FEE2E2;color:#DC2626;border-color:rgba(220,38,38,.20)}.performance-trend.neutral{background:rgba(148,163,184,.12);color:var(--sfm-muted);border-color:rgba(148,163,184,.20)}.performance-card{width:100%;max-width:100%;min-width:0;overflow:hidden;border:1px solid rgba(167,243,240,.16);border-radius:20px;background:var(--sfm-card);padding:15px;box-shadow:0 10px 26px rgba(3,18,37,.06)}.performance-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}.performance-card-head div{display:grid;gap:4px;min-width:0}.performance-card-head strong{color:var(--sfm-foreground);font-size:17px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate;text-align:start}.performance-card-head span{color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.45;overflow-wrap:anywhere}.performance-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.performance-metric{min-width:0;border:1px solid rgba(167,243,240,.12);border-radius:15px;background:var(--sfm-light-card);padding:11px;display:grid;gap:5px}.performance-metric span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.performance-metric b{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.3;direction:ltr;unicode-bidi:isolate;text-align:start;overflow-wrap:anywhere}.performance-metric b.up,.performance-value.up{color:#047857}.performance-metric b.down,.performance-value.down{color:#DC2626}.dark .trader-table td,.dark .performance-card{background:#0f1d31;border-color:#1d3050}.dark .performance-metric{background:#0a1422;border-color:#1d3050}.dark .performance-trend.bullish{background:rgba(47,214,192,.12);color:#2FD6C0;border-color:rgba(47,214,192,.25)}.dark .performance-trend.bearish{background:rgba(255,91,110,.12);color:#FF5B6E;border-color:rgba(255,91,110,.25)}.dark .performance-metric b.up,.dark .performance-value.up{color:#2FD6C0}.dark .performance-metric b.down,.dark .performance-value.down{color:#FF5B6E}
        .market-status-card{display:flex;align-items:center;gap:13px;min-width:0;border:1px solid rgba(47,214,192,.16);border-radius:24px;background:linear-gradient(135deg,rgba(29,140,255,.045),rgba(47,214,192,.07)),var(--sfm-card);box-shadow:0 12px 32px rgba(3,18,37,.06);padding:16px}.market-status-card>span{width:42px;height:42px;border-radius:16px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.20);color:var(--sfm-soft-cyan)}.market-status-card div{display:grid;gap:5px;min-width:0}.market-status-card small{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.35}.market-status-card strong{color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.3;min-width:0;overflow-wrap:anywhere}.market-status-banner{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(34,197,94,.22);background:rgba(34,197,94,.08);color:#15803D;border-radius:24px;padding:15px 17px;box-shadow:0 8px 26px rgba(3,18,37,.05)}.market-status-banner.preparing{border-color:rgba(47,214,192,.22);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.08));color:var(--sfm-primary-hover)}.market-status-banner svg{flex:0 0 auto;margin-top:2px}.market-status-banner strong{display:block;color:inherit;font-size:14px;font-weight:950;line-height:1.4}.market-status-banner p{margin:4px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.7}.technical-analysis-panel{width:100%;max-width:100%;border-radius:30px!important;padding:clamp(16px,2.2vw,28px)!important;background:linear-gradient(135deg,rgba(255,255,255,.72),rgba(234,246,255,.62)),var(--sfm-card)!important;border-color:rgba(47,214,192,.18)!important;box-shadow:0 18px 46px rgba(3,18,37,.08)!important}.technical-analysis-panel .market-section-head{align-items:center;border:1px solid rgba(47,214,192,.16);background:rgba(47,214,192,.07);border-radius:22px;padding:14px;margin-bottom:0}.technical-analysis-panel .market-section-head>svg{width:42px;height:42px;border-radius:16px;padding:10px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.18)}.technical-selector-shell{background:var(--sfm-card)!important;border-radius:24px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}.technical-category-row,.technical-symbol-row{flex-wrap:wrap;overflow:visible;padding-bottom:2px}.technical-category-row button{min-height:44px;padding:0 17px;font-size:13px}.technical-symbol-pill{min-height:44px}.technical-selected-summary{border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07));border-radius:24px;padding:12px}.technical-summary-item{display:flex;align-items:center;gap:10px;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:18px;padding:13px}.technical-summary-item>span{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan)}.technical-summary-item div{display:grid;gap:4px;min-width:0}.technical-summary-item small{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.35}.technical-summary-item strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.technical-empty-state{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(245,158,11,.28);background:rgba(245,158,11,.11);border-radius:22px;padding:16px;color:#92400E}.technical-empty-state svg{flex:0 0 auto;margin-top:2px}.technical-empty-state strong{display:block;color:#78350F;font-size:15px;font-weight:950;line-height:1.5}.technical-empty-state p{margin:5px 0 0;color:#92400E;font-size:13px;font-weight:850;line-height:1.8}.technical-data-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.technical-data-card{display:grid;gap:12px;align-content:start;min-width:0;border:1px solid rgba(167,243,240,.15);background:var(--sfm-card);border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(3,18,37,.05)}.technical-data-card-head{display:flex;align-items:center;gap:9px;min-width:0}.technical-data-card-head span{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan);border:1px solid rgba(47,214,192,.20);flex:0 0 auto}.technical-data-card h3{margin:0;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.technical-data-card>strong{color:var(--sfm-foreground);font-size:23px;font-weight:950;line-height:1.2}.technical-data-rows{display:grid;gap:8px}.technical-data-rows div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:14px;padding:9px 10px}.technical-data-rows small{color:var(--sfm-muted);font-size:11px;font-weight:950}.technical-data-rows b{color:var(--sfm-foreground);font-size:13px;font-weight:950}.market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:17px 18px;color:var(--sfm-muted);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.06)),var(--sfm-card);border-color:rgba(29,140,255,.18);border-radius:24px}.market-disclaimer svg{color:var(--sfm-primary-hover);flex:0 0 auto}.market-disclaimer strong{display:block;color:var(--sfm-foreground);margin-bottom:4px}.market-disclaimer p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.7;font-weight:800}.dark .technical-analysis-panel{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31!important;border-color:#1d3050!important}.dark .market-status-card,.dark .technical-summary-item,.dark .technical-data-card{background:#0f1d31;border-color:#1d3050}.dark .technical-selector-shell,.dark .technical-search,.dark .technical-data-rows div{background:#0a1422!important;border-color:#1d3050}.dark .market-status-banner.connected{color:#2FD6C0;background:rgba(47,214,192,.10);border-color:rgba(47,214,192,.24)}.dark .technical-empty-state{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.26);color:#F5B942}.dark .technical-empty-state strong{color:#FDE68A}.dark .technical-empty-state p{color:#F5B942}
        @media(max-width:1180px){.market-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-status-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.technical-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid,.market-decision-grid,.market-tools-grid,.trader-tool-grid{grid-template-columns:1fr}.trader-tool-card{grid-column:1/-1}.market-chart{grid-row:auto}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{width:100%;max-width:100%;margin-inline:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px}.technical-category-row,.technical-symbol-row{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:8px}}
        @media(max-width:720px){.market-main{padding-inline:14px;width:100%;max-width:100%;overflow-x:hidden}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-status-grid,.market-stat-row,.indicator-list,.scenario-grid,.alert-form,.trader-form-grid,.tool-result-grid{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-search-results{max-height:min(300px,42dvh);top:calc(100% + 10px);border-radius:16px}.market-search-results button{min-height:68px;align-items:flex-start}.market-search-results button small{white-space:normal;text-align:end}.market-hero-card strong{font-size:36px}.market-stock-header{display:grid;gap:14px}.stock-price-block{justify-items:start;text-align:start}.market-panel,.market-card,.market-stock-header{border-radius:18px}.portfolio-card{padding:16px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}.tool-tabs,.symbol-chip-row{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;gap:8px;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tool-tabs::-webkit-scrollbar,.symbol-chip-row::-webkit-scrollbar{display:none}.tool-tabs button,.symbol-chip-row button{flex:0 0 auto;white-space:nowrap}.trader-dashboard{overflow:hidden}.trader-dashboard-head{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start}.trader-dashboard-head small{grid-column:1/-1;margin-inline-start:0;width:max-content;max-width:100%;white-space:normal}.trader-tool-card{grid-column:1/-1;padding:16px}.trader-tool-card-head{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start}.tool-reset{grid-column:1/-1;justify-self:start}.economic-calendar-empty{grid-template-columns:1fr;padding:16px;border-radius:22px}.economic-calendar-empty-icon{width:46px;height:46px;border-radius:17px}.economic-calendar-next,.economic-calendar-event-main{display:grid;justify-content:stretch}.economic-calendar-next-meta{justify-content:flex-start}.economic-calendar-event-metrics{grid-template-columns:1fr}.technical-selector-shell{border-radius:20px;padding:12px}.technical-selected-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.technical-result-grid{grid-template-columns:1fr}.technical-category-row,.technical-symbol-row{gap:8px}.technical-category-row button{min-height:38px;padding-inline:13px}.technical-symbol-main{padding-inline:9px;font-size:12px}.performance-card-list{display:grid;grid-template-columns:1fr;gap:12px;width:100%;max-width:100%;min-width:0}.performance-table-desktop{display:none}.performance-card-head{align-items:flex-start}.performance-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.performance-metric{padding:10px}.performance-trend{flex:0 0 auto}}
        @media(max-width:720px){.market-search-results{width:100%;max-height:min(320px,48dvh)}.market-search-results button{align-items:stretch}.market-search-results button small{white-space:nowrap;text-align:start}.market-search-result-main{gap:10px}.market-search-results button b{font-size:13px}}
        @media(max-width:460px){.technical-selected-summary{grid-template-columns:1fr}.technical-search{min-height:46px}.technical-symbol-favorite{width:30px;height:30px}.technical-symbol-pill{min-height:40px}.portfolio-metric-grid,.performance-metric-grid{grid-template-columns:1fr}}
      `}</style>
      <style jsx global>{`
        .market-shell,
        .market-main {
          max-width: 100%;
          overflow-x: hidden;
        }

        .market-main {
          justify-items: stretch;
          gap: 24px;
        }

        .market-main > * {
          box-sizing: border-box;
          width: 100%;
          max-width: 1500px;
        }

        .market-active-dashboard {
          width: 100%;
          max-width: 1500px;
          min-width: 0;
          margin-inline: auto;
          display: grid;
          gap: 20px;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 32px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .84), rgba(234, 246, 255, .68)),
            var(--sfm-card);
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08);
          padding: clamp(16px, 2vw, 24px);
          overflow: hidden;
        }

        .market-active-dashboard > .market-card-grid,
        .market-active-dashboard > .market-panel,
        .market-active-dashboard > .market-bottom-grid,
        .market-active-dashboard > .market-stock-header,
        .market-active-dashboard > .market-decision-grid,
        .market-active-dashboard > .market-layout,
        .market-active-dashboard > .market-tools-grid {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .market-default-dashboard {
          grid-column: 1 / -1;
          display: grid;
          gap: 18px;
          width: 100%;
          min-width: 0;
        }

        .market-default-modules {
          display: grid;
          gap: 14px;
        }

        .market-default-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 0;
        }

        .market-default-section-head span {
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.45;
        }

        .market-quick-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .market-quick-card {
          min-width: 0;
          display: grid;
          gap: 14px;
          align-content: start;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 26px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .78), rgba(234, 246, 255, .55)),
            var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
          padding: 18px;
          transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .market-quick-card:hover {
          transform: translateY(-2px);
          border-color: rgba(47, 214, 192, .34);
          box-shadow: 0 18px 42px rgba(3, 18, 37, .09);
        }

        .market-quick-icon,
        .market-empty-state-icon,
        .market-hero-card-icon {
          width: 46px;
          height: 46px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 14px 28px rgba(29, 140, 255, .18);
          flex: 0 0 auto;
        }

        .market-quick-card h3 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 16px;
          font-weight: 950;
          line-height: 1.4;
        }

        .market-quick-card p {
          margin: 6px 0 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .market-quick-card button,
        .market-empty-state button,
        .market-hero-card.empty button {
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(47, 214, 192, .28);
          border-radius: 999px;
          background: rgba(47, 214, 192, .12);
          color: var(--sfm-primary-hover);
          padding: 9px 14px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background .2s ease, border-color .2s ease, transform .2s ease;
        }

        .market-quick-card button:hover,
        .market-quick-card button:focus-visible,
        .market-empty-state button:hover,
        .market-empty-state button:focus-visible,
        .market-hero-card.empty button:hover,
        .market-hero-card.empty button:focus-visible {
          outline: none;
          transform: translateY(-1px);
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          border-color: transparent;
          color: #fff;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .16);
        }

        .market-empty-state {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .08)),
            var(--sfm-card);
          padding: clamp(18px, 2.3vw, 26px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .48);
        }

        .market-empty-state div {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .market-empty-state strong {
          color: var(--sfm-foreground);
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 950;
          line-height: 1.35;
        }

        .market-empty-state p {
          max-width: 820px;
          margin: 0;
          color: var(--sfm-muted);
          font-size: 14px;
          font-weight: 850;
          line-height: 1.8;
        }

        .market-hero-card.empty {
          align-content: start;
          border-color: rgba(167, 243, 240, .28);
          background: rgba(255, 255, 255, .12);
        }

        .market-hero-card.empty strong {
          font-size: clamp(22px, 3vw, 32px);
          line-height: 1.25;
        }

        .market-hero-card.empty p {
          color: rgba(255, 255, 255, .74);
          line-height: 1.75;
        }

        .market-hero-card.empty button {
          color: #fff;
          border-color: rgba(167, 243, 240, .34);
          background: rgba(167, 243, 240, .14);
        }

        .market-status-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          align-items: stretch;
          gap: 16px !important;
          margin-block: 2px 4px;
        }

        .market-status-card {
          min-height: 126px;
          align-items: flex-start !important;
          gap: 14px !important;
          border-radius: 28px !important;
          border: 1px solid rgba(15, 118, 110, .16) !important;
          background:
            radial-gradient(circle at top right, rgba(47, 214, 192, .16), transparent 42%),
            linear-gradient(135deg, rgba(255, 255, 255, .94), rgba(234, 246, 255, .76)),
            #ffffff !important;
          box-shadow: 0 16px 38px rgba(3, 18, 37, .08) !important;
          padding: 18px !important;
          overflow: hidden;
        }

        .market-status-icon {
          width: 44px !important;
          height: 44px !important;
          border-radius: 18px !important;
          color: #0891b2 !important;
          background: linear-gradient(135deg, rgba(207, 250, 254, .94), rgba(204, 251, 241, .82)) !important;
          border: 1px solid rgba(14, 165, 233, .18) !important;
          box-shadow: 0 10px 24px rgba(8, 145, 178, .10);
        }

        .market-status-body {
          min-width: 0;
          display: grid;
          gap: 7px;
          align-content: start;
        }

        .market-status-body small {
          color: #64748b !important;
          font-size: 12px !important;
          font-weight: 950 !important;
          line-height: 1.35 !important;
        }

        .market-status-value,
        .market-status-badge {
          min-width: 0;
          width: max-content;
          max-width: 100%;
          overflow-wrap: anywhere;
          line-height: 1.25;
        }

        .market-status-value {
          color: #0f172a !important;
          font-size: 19px !important;
          font-weight: 950 !important;
        }

        .market-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(15, 118, 110, .20);
          background: rgba(204, 251, 241, .72);
          color: #0f766e;
          padding: 7px 11px;
          font-size: 13px;
          font-weight: 950;
        }

        .market-status-badge.success {
          color: #047857;
          background: #ccfbf1;
          border-color: rgba(15, 118, 110, .22);
        }

        .market-status-badge.info {
          color: #0369a1;
          background: #e0f2fe;
          border-color: rgba(14, 165, 233, .22);
        }

        .market-status-badge.warning {
          color: #92400e;
          background: #fef3c7;
          border-color: rgba(245, 158, 11, .24);
        }

        .market-status-badge.danger {
          color: #b91c1c;
          background: #fee2e2;
          border-color: rgba(239, 68, 68, .24);
        }

        .market-status-badge.muted {
          color: #475569;
          background: #f1f5f9;
          border-color: rgba(100, 116, 139, .18);
        }

        .market-status-body p {
          margin: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.6;
        }

        .dark .market-status-card {
          background:
            radial-gradient(circle at top right, rgba(47, 214, 192, .12), transparent 44%),
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31 !important;
          border-color: #1d3050 !important;
          box-shadow: 0 20px 44px rgba(0, 0, 0, .24) !important;
        }

        .dark .market-status-icon {
          color: #2fd6c0 !important;
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .25) !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, .18);
        }

        .dark .market-status-body small {
          color: #8ea6c3 !important;
        }

        .dark .market-status-value {
          color: #e8eef6 !important;
        }

        .dark .market-status-body p {
          color: #b8c7d9;
        }

        .dark .market-status-badge.success {
          color: #2fd6c0;
          background: rgba(47, 214, 192, .12);
          border-color: rgba(47, 214, 192, .25);
        }

        .dark .market-status-badge.info {
          color: #7dd3fc;
          background: rgba(29, 140, 255, .14);
          border-color: rgba(125, 211, 252, .24);
        }

        .dark .market-status-badge.warning {
          color: #f5b942;
          background: rgba(245, 185, 66, .13);
          border-color: rgba(245, 185, 66, .26);
        }

        .dark .market-status-badge.danger {
          color: #ff5b6e;
          background: rgba(255, 91, 110, .12);
          border-color: rgba(255, 91, 110, .25);
        }

        .dark .market-status-badge.muted {
          color: #b8c7d9;
          background: rgba(142, 166, 195, .12);
          border-color: rgba(142, 166, 195, .20);
        }

        .dark .market-active-dashboard,
        .dark .market-quick-card,
        .dark .market-empty-state {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
          box-shadow: 0 20px 56px rgba(0, 0, 0, .28);
        }

        .dark .market-quick-card p,
        .dark .market-empty-state p {
          color: #b8c7d9;
        }

        .market-dashboard-tabs {
          border-radius: 28px !important;
          padding: 10px !important;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .055), rgba(47, 214, 192, .075)),
            var(--sfm-card) !important;
          box-shadow: 0 16px 42px rgba(3, 18, 37, .07) !important;
        }

        .market-focused-tab,
        .market-bottom-grid.news-sentiment-dashboard > .market-panel {
          min-height: 260px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .74), rgba(234, 246, 255, .60)),
            var(--sfm-card);
        }

        .news-sentiment-dashboard {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .news-sentiment-section {
          width: 100%;
          max-width: 1500px;
          min-width: 0;
          margin-inline: auto;
          padding-inline: 0;
          overflow: hidden;
        }

        .news-sentiment-shell {
          display: grid;
          gap: 18px;
          overflow: hidden;
          width: 100%;
          min-width: 0;
          border-radius: 32px !important;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .82), rgba(234, 246, 255, .68)),
            var(--sfm-card) !important;
          border-color: rgba(47, 214, 192, .18) !important;
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08) !important;
        }

        .news-sentiment-head {
          align-items: center;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 24px;
          background: rgba(47, 214, 192, .07);
          padding: 14px;
          margin-bottom: 0;
        }

        .news-sentiment-head-icon,
        .news-tool-card-head > span,
        .tool-empty-state > span {
          width: 44px;
          height: 44px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 14px 28px rgba(29, 140, 255, .18);
          flex: 0 0 auto;
        }

        .news-sentiment-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          min-width: 0;
        }

        .news-tool-card {
          min-width: 0;
          display: grid;
          gap: 14px;
          align-content: start;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 26px;
          padding: clamp(15px, 1.8vw, 20px);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .76), rgba(234, 246, 255, .54)),
            var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        }

        .news-tool-card-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .news-tool-card-head div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .news-tool-card-head small {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.45;
        }

        .news-tool-card-head h3 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 18px;
          font-weight: 950;
          line-height: 1.35;
        }

        .tool-empty-state {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: flex-start;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 24px;
          padding: 16px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .08)),
            var(--sfm-light-card);
        }

        .tool-empty-state.info {
          border-color: rgba(29, 140, 255, .20);
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .075), rgba(47, 214, 192, .08)),
            var(--sfm-light-card);
        }

        .tool-empty-state.warning {
          border-color: rgba(245, 158, 11, .26);
          background:
            linear-gradient(135deg, rgba(245, 158, 11, .12), rgba(47, 214, 192, .05)),
            var(--sfm-light-card);
        }

        .tool-empty-state div {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .tool-empty-state strong {
          color: var(--sfm-foreground);
          font-size: 16px;
          font-weight: 950;
          line-height: 1.45;
        }

        .tool-empty-state p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.8;
        }

        .tool-empty-state button {
          width: max-content;
          max-width: 100%;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
          padding: 9px 13px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .central-news-list,
        .sentiment-card-list {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .central-news-card,
        .sentiment-card {
          min-width: 0;
          display: grid;
          gap: 11px;
          border: 1px solid rgba(167, 243, 240, .14);
          border-radius: 22px;
          padding: 14px;
          background: var(--sfm-light-card);
        }

        .central-news-meta,
        .central-news-footer,
        .sentiment-metrics,
        .sentiment-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .central-news-meta span,
        .sentiment-badge {
          display: inline-flex;
          width: max-content;
          max-width: 100%;
          align-items: center;
          border: 1px solid rgba(47, 214, 192, .22);
          border-radius: 999px;
          background: rgba(47, 214, 192, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.3;
        }

        .central-news-meta small,
        .central-news-footer small,
        .sentiment-card-head span,
        .sentiment-card p,
        .sentiment-metrics span {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.55;
        }

        .central-news-card h4,
        .sentiment-card-head b {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .central-news-card p,
        .sentiment-card p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
        }

        .central-news-footer a {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
        }

        .central-news-footer a:hover,
        .central-news-footer a:focus-visible {
          text-decoration: underline;
          outline: none;
        }

        .sentiment-card-head > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .sentiment-badge.buy {
          color: #047857;
          background: #CCFBF1;
          border-color: rgba(15, 118, 110, .22);
        }

        .sentiment-badge.sell {
          color: #DC2626;
          background: #FEE2E2;
          border-color: rgba(220, 38, 38, .20);
        }

        .sentiment-badge.balanced {
          color: var(--sfm-primary-hover);
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .18);
        }

        .sentiment-metrics b {
          color: var(--sfm-foreground);
          font-size: 13px;
          font-weight: 950;
        }

        .sentiment-bar {
          display: flex;
          width: 100%;
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, .15);
          background: rgba(148, 163, 184, .12);
        }

        .sentiment-bar i,
        .sentiment-bar b {
          display: block;
          min-width: 3px;
          height: 100%;
        }

        .sentiment-bar i {
          background: linear-gradient(135deg, #22C55E, var(--sfm-accent));
        }

        .sentiment-bar b {
          background: linear-gradient(135deg, #EF4444, #F97316);
        }

        .sentiment-info-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .20);
          border-radius: 20px;
          padding: 13px;
          background: rgba(29, 140, 255, .08);
          color: var(--sfm-primary-hover);
        }

        .sentiment-info-card svg {
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .sentiment-info-card p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.7;
        }

        .trading-sessions-dashboard {
          display: grid;
          gap: 18px;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .78), rgba(234, 246, 255, .62)),
            var(--sfm-card);
          border-radius: 30px;
        }

        .session-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          min-width: 0;
        }

        .session-card {
          display: grid;
          gap: 14px;
          min-width: 0;
          border: 1px solid rgba(167, 243, 240, .16);
          border-radius: 24px;
          padding: 15px;
          background: var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        }

        .session-card.open {
          border-color: rgba(47, 214, 192, .34);
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .07), rgba(47, 214, 192, .12)),
            var(--sfm-card);
        }

        .session-card-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .session-card-head div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .session-card-head strong {
          color: var(--sfm-foreground);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .session-card-head small {
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.35;
        }

        .session-icon {
          width: 38px;
          height: 38px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: var(--sfm-soft-cyan);
          background: rgba(47, 214, 192, .12);
          border: 1px solid rgba(47, 214, 192, .20);
        }

        .session-progress {
          height: 9px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, .16);
          border: 1px solid rgba(148, 163, 184, .14);
        }

        .session-progress i {
          display: block;
          height: 100%;
          min-width: 8px;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          transition: width .3s ease;
        }

        .session-card.closed .session-progress i {
          opacity: .28;
          width: 8px !important;
        }

        .session-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .session-metric {
          min-width: 0;
          border: 1px solid rgba(167, 243, 240, .13);
          border-radius: 16px;
          background: var(--sfm-light-card);
          padding: 10px;
          display: grid;
          gap: 5px;
        }

        .session-metric span {
          color: var(--sfm-muted);
          font-size: 10.5px;
          font-weight: 950;
          line-height: 1.35;
        }

        .session-metric strong {
          color: var(--sfm-foreground);
          font-size: 13px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .session-overlap-panel {
          display: grid;
          gap: 12px;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 24px;
          padding: 14px;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .045), rgba(47, 214, 192, .07)),
            var(--sfm-light-card);
          min-width: 0;
        }

        .session-overlap-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .session-overlap-head strong {
          color: var(--sfm-foreground);
          font-size: 14px;
          font-weight: 950;
          line-height: 1.45;
        }

        .session-overlap-head span {
          max-width: 520px;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.65;
        }

        .session-overlap-timeline {
          position: relative;
          height: 46px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, .12);
          border: 1px solid rgba(167, 243, 240, .14);
        }

        .session-overlap-timeline span {
          position: absolute;
          top: 8px;
          bottom: 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, .22);
        }

        .session-overlap-timeline span.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 0 22px rgba(47, 214, 192, .32);
        }

        .dark .market-focused-tab,
        .dark .market-bottom-grid.news-sentiment-dashboard > .market-panel,
        .dark .news-sentiment-shell,
        .dark .news-tool-card,
        .dark .trading-sessions-dashboard,
        .dark .session-card,
        .dark .session-card.open {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
        }

        .dark .session-metric,
        .dark .session-overlap-panel,
        .dark .central-news-card,
        .dark .sentiment-card,
        .dark .tool-empty-state {
          background: #0a1422;
          border-color: #1d3050;
        }

        .dark .tool-empty-state.info {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .11), rgba(47, 214, 192, .08)),
            #0a1422;
          border-color: rgba(47, 214, 192, .22);
        }

        .dark .tool-empty-state.warning {
          background:
            linear-gradient(135deg, rgba(245, 185, 66, .12), rgba(47, 214, 192, .05)),
            #0a1422;
          border-color: rgba(245, 185, 66, .24);
        }

        .dark .news-sentiment-head {
          background: rgba(47, 214, 192, .08);
          border-color: #1d3050;
        }

        .dark .tool-empty-state p,
        .dark .central-news-meta small,
        .dark .central-news-footer small,
        .dark .central-news-card p,
        .dark .sentiment-card-head span,
        .dark .sentiment-card p,
        .dark .sentiment-metrics span,
        .dark .sentiment-info-card p {
          color: #b8c7d9;
        }

        .dark .sentiment-badge.buy {
          background: rgba(47, 214, 192, .12);
          color: #2FD6C0;
          border-color: rgba(47, 214, 192, .25);
        }

        .dark .sentiment-badge.sell {
          background: rgba(255, 91, 110, .12);
          color: #FF5B6E;
          border-color: rgba(255, 91, 110, .25);
        }

        .dark .sentiment-info-card {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .24);
        }

        @media (max-width: 1180px) {
          .market-status-grid,
          .market-quick-grid,
          .session-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .news-sentiment-dashboard {
            grid-template-columns: 1fr !important;
          }

          .news-sentiment-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .market-main {
            gap: 18px;
          }

          .market-status-grid,
          .market-quick-grid,
          .session-card-grid,
          .session-metrics {
            grid-template-columns: 1fr !important;
          }

          .market-active-dashboard {
            border-radius: 24px;
            padding: 14px;
          }

          .market-empty-state {
            grid-template-columns: 1fr;
            justify-items: start;
            border-radius: 22px;
          }

          .news-sentiment-shell {
            border-radius: 24px !important;
            padding: 16px;
          }

          .news-sentiment-section {
            padding-inline: 0;
          }

          .news-sentiment-head,
          .news-tool-card-head,
          .tool-empty-state {
            grid-template-columns: 1fr;
          }

          .news-tool-card {
            border-radius: 22px;
            padding: 15px;
          }

          .tool-empty-state {
            display: grid;
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .market-empty-state-icon,
          .market-quick-icon,
          .market-hero-card-icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
          }

          .market-quick-card {
            border-radius: 22px;
            padding: 16px;
          }

          .market-dashboard-tabs {
            border-radius: 22px !important;
            padding: 8px !important;
          }

          .session-card {
            border-radius: 20px;
            padding: 14px;
          }

          .session-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .session-card-head .session-badge {
            grid-column: 1 / -1;
            justify-self: start;
          }

          .session-overlap-head {
            display: grid;
          }

          .session-overlap-head span {
            max-width: 100%;
          }

          .session-overlap-timeline {
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}

function TraderToolsDashboard({
  t,
  currency,
  userId,
  subTab,
  setSubTab,
  performance,
}: {
  t: (key: string) => string;
  currency: string;
  userId?: string;
  subTab: TraderToolsSubTab;
  setSubTab: (tab: TraderToolsSubTab) => void;
  performance: ApiListState<MarketPerformanceItem>;
}) {
  const defaultPositionInput = {
    accountBalance: '10000',
    riskPercentage: '1',
    stopLossDistance: '50',
    instrumentType: 'forex' as TradingInstrumentType,
    entryPrice: '',
    stopLossPrice: '',
  };
  const defaultPipsInput = {
    pair: 'EURUSD',
    entryPrice: '1.0800',
    exitPrice: '1.0850',
    lotSize: '1',
    direction: 'buy' as TradeDirection,
  };
  const defaultLotInput = {
    accountBalance: '10000',
    riskPercentage: '1',
    stopLossPips: '50',
    pipValue: '10',
    assetType: 'EURUSD',
  };
  const [positionInput, setPositionInput] = useState({ ...defaultPositionInput });
  const [pipsInput, setPipsInput] = useState({ ...defaultPipsInput });
  const [lotInput, setLotInput] = useState({ ...defaultLotInput });
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrencyCode>(() => normalizeAccountCurrency(currency));
  const [accountCurrencyTouched, setAccountCurrencyTouched] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState('');
  const [currencyError, setCurrencyError] = useState('');

  useEffect(() => {
    if (!accountCurrencyTouched) setAccountCurrency(normalizeAccountCurrency(currency));
  }, [accountCurrencyTouched, currency]);

  const position = calculatePositionSize({
    accountBalance: parseNumber(positionInput.accountBalance),
    riskPercentage: parseNumber(positionInput.riskPercentage),
    stopLossDistance: parseNumber(positionInput.stopLossDistance),
    instrumentType: positionInput.instrumentType,
    entryPrice: parseNumber(positionInput.entryPrice),
    stopLossPrice: parseNumber(positionInput.stopLossPrice),
  });
  const pips = calculatePips({
    pair: pipsInput.pair,
    entryPrice: parseNumber(pipsInput.entryPrice),
    exitPrice: parseNumber(pipsInput.exitPrice),
    lotSize: parseNumber(pipsInput.lotSize),
    direction: pipsInput.direction,
  });
  const lots = calculateLotSizeByRisk({
    accountBalance: parseNumber(lotInput.accountBalance),
    riskPercentage: parseNumber(lotInput.riskPercentage),
    stopLossPips: parseNumber(lotInput.stopLossPips),
    pipValue: parseNumber(lotInput.pipValue),
  });
  const pipUnit = t('market_unit_pip');
  const activeDescription = subTab === 'risk'
    ? t('market_risk_position_description')
    : subTab === 'pips'
      ? t('market_pips_description')
      : subTab === 'lot'
        ? t('market_lot_by_risk_description')
        : t('market_asset_performance');

  const handleSaveDefaultCurrency = async () => {
    setCurrencyMessage('');
    setCurrencyError('');
    if (!userId) {
      setCurrencyError(t('market_account_currency_signin_required'));
      return;
    }
    setSavingCurrency(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ default_currency: accountCurrency, preferred_currency: accountCurrency })
        .eq('id', userId);
      if (error) throw error;
      setCurrencyMessage(t('market_account_currency_saved'));
    } catch {
      setCurrencyError(t('market_account_currency_save_error'));
    } finally {
      setSavingCurrency(false);
    }
  };

  const accountCurrencyOptions = ACCOUNT_CURRENCY_OPTIONS.map(code => [code, code] as [string, string]);

  return (
    <section className="market-panel trader-dashboard">
      <div className="market-section-head trader-dashboard-head">
        <span className="trader-head-icon"><Calculator size={20} /></span>
        <div>
          <span>{t('market_trader_tools_subtitle')}</span>
          <h2>{t('market_trader_tools')}</h2>
        </div>
        <small>{t('market_live_calculation_note')}</small>
      </div>
      <div className="trader-currency-bar">
        <ToolSelect
          label={t('market_account_currency')}
          helper={t('market_account_currency_hint')}
          value={accountCurrency}
          onChange={value => {
            setAccountCurrency(normalizeAccountCurrency(value));
            setAccountCurrencyTouched(true);
            setCurrencyMessage('');
            setCurrencyError('');
          }}
          options={accountCurrencyOptions}
        />
        <div className="trader-currency-action">
          <button type="button" onClick={handleSaveDefaultCurrency} disabled={savingCurrency}>
            {savingCurrency ? t('market_saving') : t('market_save_account_currency_default')}
          </button>
          {currencyMessage ? <small className="success">{currencyMessage}</small> : null}
          {currencyError ? <small className="error">{currencyError}</small> : null}
        </div>
      </div>
      <div className="tool-tabs" role="tablist" aria-label={t('market_trader_tools')}>
        {TRADER_TOOL_TABS.map(tab => (
          <button key={tab} type="button" aria-pressed={subTab === tab} onClick={() => setSubTab(tab)}>
            {t(tab === 'risk'
              ? 'market_risk_calculator_tab'
              : tab === 'pips'
                ? 'market_pips_calculator'
                : tab === 'lot'
                  ? 'market_lot_calculator_tab'
                  : 'market_asset_performance')}
          </button>
        ))}
      </div>
      {subTab === 'performance' ? (
        <PerformanceTable t={t} performance={performance} />
      ) : (
        <div className="trader-active-tool">
          <div className="trader-active-intro">
            <span>{t('market_trader_tools_subtitle')}</span>
            <h3>{t(subTab === 'risk' ? 'market_risk_position_calculator' : subTab === 'pips' ? 'market_pips_calculator' : 'market_lot_size_by_risk')}</h3>
            <p>{activeDescription}</p>
          </div>
          <div className="trader-tool-grid">
          {subTab === 'risk' && (
          <>
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><ShieldAlert size={18} /></span>
              <div>
                <h3>{t('market_risk_position_calculator')}</h3>
                <p>{t('market_risk_position_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setPositionInput({ ...defaultPositionInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-form-grid">
              <ToolInput label={t('market_account_balance')} helper={t('market_account_balance_hint')} prefix={accountCurrency} value={positionInput.accountBalance} onChange={value => setPositionInput(prev => ({ ...prev, accountBalance: value }))} />
              <ToolInput label={t('market_risk_percentage')} helper={t('market_risk_percentage_hint')} suffix="%" value={positionInput.riskPercentage} onChange={value => setPositionInput(prev => ({ ...prev, riskPercentage: value }))} />
              <ToolInput label={t('market_stop_loss')} helper={t('market_stop_loss_hint')} suffix={pipUnit} value={positionInput.stopLossDistance} onChange={value => setPositionInput(prev => ({ ...prev, stopLossDistance: value }))} />
              <ToolSelect
                label={t('market_instrument_type')}
                helper={t('market_instrument_type_hint')}
                value={positionInput.instrumentType}
                onChange={value => setPositionInput(prev => ({ ...prev, instrumentType: value as TradingInstrumentType }))}
                options={[
                  ['forex', t('market_asset_forex')],
                  ['metals', t('market_gold_metals')],
                  ['indices', t('market_indices')],
                  ['crypto', t('market_asset_crypto')],
                  ['stocks', t('market_asset_stocks')],
                ]}
              />
              <details className="tool-advanced">
                <summary>{t('market_advanced_settings')}</summary>
                <div className="trader-form-grid">
                  <ToolInput label={t('market_entry_price_optional')} helper={t('market_entry_price_hint')} prefix={accountCurrency} value={positionInput.entryPrice} onChange={value => setPositionInput(prev => ({ ...prev, entryPrice: value }))} />
                  <ToolInput label={t('market_stop_price_optional')} helper={t('market_stop_price_hint')} prefix={accountCurrency} value={positionInput.stopLossPrice} onChange={value => setPositionInput(prev => ({ ...prev, stopLossPrice: value }))} />
                </div>
              </details>
            </div>
          </article>
          <aside className="trader-result-stack">
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_risk_amount'), money(position.riskAmount, accountCurrency)],
              [t('market_suggested_position_size'), formatNumber(position.positionSize, 4)],
              [t('market_lot_size'), position.lotSize === null ? t('market_unavailable') : formatNumber(position.lotSize, 4)],
              [t('market_expected_loss'), money(position.estimatedLoss, accountCurrency)],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_risk_formula')}
              example={`${accountCurrency} ${formatNumber(parseNumber(positionInput.accountBalance), 2)} × ${formatNumber(parseNumber(positionInput.riskPercentage), 2)}% = ${money(position.riskAmount, accountCurrency)}`}
            />
            {position.riskWarning && <p className="tool-warning">{t('market_risk_above_two_warning')}</p>}
          </aside>
          </>
          )}

          {subTab === 'pips' && (
          <>
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><LineChart size={18} /></span>
              <div>
                <h3>{t('market_pips_calculator')}</h3>
                <p>{t('market_pips_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setPipsInput({ ...defaultPipsInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-form-grid">
              <ToolInput label={t('market_currency_pair')} helper={t('market_pair_hint')} value={pipsInput.pair} inputDir="ltr" inputMode="text" onChange={value => setPipsInput(prev => ({ ...prev, pair: value.toUpperCase() }))} />
              <ToolInput label={t('market_entry_price')} helper={t('market_entry_price_hint')} value={pipsInput.entryPrice} onChange={value => setPipsInput(prev => ({ ...prev, entryPrice: value }))} />
              <ToolInput label={t('market_exit_price')} helper={t('market_exit_price_hint')} value={pipsInput.exitPrice} onChange={value => setPipsInput(prev => ({ ...prev, exitPrice: value }))} />
              <ToolInput label={t('market_lot_size')} helper={t('market_lot_size_hint')} value={pipsInput.lotSize} onChange={value => setPipsInput(prev => ({ ...prev, lotSize: value }))} />
              <ToolSelect
                label={t('market_trade_direction')}
                helper={t('market_trade_direction_hint')}
                value={pipsInput.direction}
                onChange={value => setPipsInput(prev => ({ ...prev, direction: value as TradeDirection }))}
                options={[
                  ['buy', t('market_buy')],
                  ['sell', t('market_sell')],
                ]}
              />
            </div>
          </article>
          <aside className="trader-result-stack">
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_number_of_pips'), `${formatNumber(pips.pips, 1)} ${pipUnit}`],
              [t('market_profit_loss'), money(pips.profitLoss, accountCurrency)],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_pips_formula')}
              example={`${pipsInput.pair.toUpperCase()} · ${formatNumber(parseNumber(pipsInput.entryPrice), 4)} → ${formatNumber(parseNumber(pipsInput.exitPrice), 4)} = ${formatNumber(pips.pips, 1)} ${pipUnit}`}
            />
          </aside>
          </>
          )}

          {subTab === 'lot' && (
          <>
          <article className="trader-tool-card trader-tool-input-card">
            <div className="trader-tool-card-head">
              <span><Calculator size={18} /></span>
              <div>
                <h3>{t('market_lot_size_by_risk')}</h3>
                <p>{t('market_lot_by_risk_description')}</p>
              </div>
              <button type="button" className="tool-reset" onClick={() => setLotInput({ ...defaultLotInput })}>
                {t('market_reset')}
              </button>
            </div>
            <div className="trader-form-grid">
              <ToolInput label={t('market_account_balance')} helper={t('market_account_balance_hint')} prefix={accountCurrency} value={lotInput.accountBalance} onChange={value => setLotInput(prev => ({ ...prev, accountBalance: value }))} />
              <ToolInput label={t('market_risk_percentage')} helper={t('market_risk_percentage_hint')} suffix="%" value={lotInput.riskPercentage} onChange={value => setLotInput(prev => ({ ...prev, riskPercentage: value }))} />
              <ToolInput label={t('market_stop_loss_pips')} helper={t('market_stop_loss_hint')} suffix={pipUnit} value={lotInput.stopLossPips} onChange={value => setLotInput(prev => ({ ...prev, stopLossPips: value }))} />
              <ToolInput label={t('market_pip_value')} helper={t('market_pip_value_hint')} prefix={accountCurrency} value={lotInput.pipValue} onChange={value => setLotInput(prev => ({ ...prev, pipValue: value }))} />
              <details className="tool-advanced">
                <summary>{t('market_advanced_settings')}</summary>
                <ToolInput label={t('market_pair_asset_type')} helper={t('market_asset_pair_hint')} value={lotInput.assetType} inputDir="ltr" inputMode="text" onChange={value => setLotInput(prev => ({ ...prev, assetType: value.toUpperCase() }))} />
              </details>
            </div>
          </article>
          <aside className="trader-result-stack">
            <ResultGrid title={t('market_calculation_results')} subtitle={t('market_live_calculation_note')} rows={[
              [t('market_recommended_lot_size'), formatNumber(lots.recommendedLotSize, 4)],
              [t('market_micro_lots'), formatNumber(lots.microLots, 2)],
              [t('market_mini_lots'), formatNumber(lots.miniLots, 2)],
              [t('market_standard_lots'), formatNumber(lots.standardLots, 4)],
            ]} />
            <FormulaCard
              title={t('market_calculation_method')}
              body={t('market_lot_formula')}
              example={`${money((parseNumber(lotInput.accountBalance) * parseNumber(lotInput.riskPercentage)) / 100, accountCurrency)} ÷ (${formatNumber(parseNumber(lotInput.stopLossPips), 2)} ${pipUnit} × ${accountCurrency} ${formatNumber(parseNumber(lotInput.pipValue), 2)})`}
            />
          </aside>
          </>
          )}
          </div>
        </div>
      )}
      <p className="trader-disclaimer">{t('market_trader_tools_disclaimer')}</p>
    </section>
  );
}

function ToolInput({
  label,
  value,
  inputDir = 'ltr',
  inputMode = 'decimal',
  prefix,
  suffix,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  inputDir?: 'ltr' | 'rtl';
  inputMode?: 'decimal' | 'text';
  prefix?: string;
  suffix?: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="tool-input">
      <span>{label}</span>
      <div className="tool-input-shell">
        {prefix ? <em dir="ltr">{prefix}</em> : null}
        <input value={value} inputMode={inputMode} dir={inputDir} onChange={event => onChange(event.target.value)} />
        {suffix ? <em dir={suffix === '%' ? 'ltr' : undefined}>{suffix}</em> : null}
      </div>
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function ToolSelect({
  label,
  value,
  options,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="tool-input">
      <span>{label}</span>
      <div className="tool-input-shell select">
        <select value={value} onChange={event => onChange(event.target.value)}>
          {options.map(([optionValue, optionLabel]) => (
            <option value={optionValue} key={optionValue}>{optionLabel}</option>
          ))}
        </select>
      </div>
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function ResultGrid({ rows, title, subtitle }: { rows: Array<[string, string]>; title?: string; subtitle?: string }) {
  return (
    <section className="tool-results" aria-label={title}>
      {(title || subtitle) && (
        <div className="tool-results-head">
          {title && <strong className="tool-results-title">{title}</strong>}
          {subtitle && <small>{subtitle}</small>}
        </div>
      )}
      <div className="tool-result-grid">
        {rows.map(([label, value]) => (
          <div className="tool-result-card" key={label}>
            <span>{label}</span>
            <b dir="ltr">{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormulaCard({ title, body, example }: { title: string; body: string; example: string }) {
  return (
    <article className="tool-formula-card">
      <span><Calculator size={16} /></span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        <b dir="ltr">{example}</b>
      </div>
    </article>
  );
}

function PerformanceTable({ t, performance }: { t: (key: string) => string; performance: ApiListState<MarketPerformanceItem> }) {
  if (performance.loading) return <div className="market-empty">{t('market_loading_data')}</div>;
  if (performance.items.length === 0) {
    return <EmptyToolState title={t('market_performance_unavailable_title')} body={performance.message || t('market_performance_unavailable_body')} />;
  }
  const sorted = [...performance.items].sort((a, b) => Number(b.change_1d ?? -Infinity) - Number(a.change_1d ?? -Infinity));
  const displayPrice = (value: number | null | undefined) => Number.isFinite(Number(value)) ? money(Number(value), 'USD') : t('market_unavailable');
  const displayPercent = (value: number | null | undefined) => Number.isFinite(Number(value)) ? percent(Number(value)) : t('market_unavailable');
  const trendLabel = (value?: string | null) => t(`market_trend_${normalizePerformanceTrend(value)}`);

  return (
    <>
      <div className="performance-card-list">
        {sorted.map(item => (
          <article className="performance-card" key={`card-${item.symbol}-${item.asset_type}`}>
            <div className="performance-card-head">
              <div>
                <strong dir="ltr">{item.symbol}</strong>
                <span>{item.name}</span>
              </div>
              <b className={`performance-trend ${normalizePerformanceTrend(item.trend)}`}>{trendLabel(item.trend)}</b>
            </div>
            <div className="performance-metric-grid">
              <PerformanceMetric label={t('market_current_price')} value={displayPrice(item.price)} />
              <PerformanceMetric label={t('market_daily_change')} value={displayPercent(item.change_1d)} tone={item.change_1d} />
              <PerformanceMetric label={t('market_weekly_change')} value={displayPercent(item.change_1w)} tone={item.change_1w} />
              <PerformanceMetric label={t('market_monthly_change')} value={displayPercent(item.change_1m)} tone={item.change_1m} />
            </div>
          </article>
        ))}
      </div>
      <div className="trader-table-wrap performance-table-desktop">
        <table className="trader-table">
          <thead>
            <tr>
              <th>{t('market_symbol')}</th>
              <th>{t('market_symbol_name')}</th>
              <th>{t('market_current_price')}</th>
              <th>{t('market_daily_change')}</th>
              <th>{t('market_weekly_change')}</th>
              <th>{t('market_monthly_change')}</th>
              <th>{t('market_trend')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr key={`${item.symbol}-${item.asset_type}`}>
                <td><span className="performance-symbol" dir="ltr">{item.symbol}</span></td>
                <td>{item.name}</td>
                <td><span className="performance-value" dir="ltr">{displayPrice(item.price)}</span></td>
                <td><span className={`performance-value ${Number(item.change_1d) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1d)}</span></td>
                <td><span className={`performance-value ${Number(item.change_1w) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1w)}</span></td>
                <td><span className={`performance-value ${Number(item.change_1m) >= 0 ? 'up' : 'down'}`} dir="ltr">{displayPercent(item.change_1m)}</span></td>
                <td><span className={`performance-trend ${normalizePerformanceTrend(item.trend)}`}>{trendLabel(item.trend)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PerformanceMetric({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  const toneClass = Number.isFinite(Number(tone)) ? Number(tone) >= 0 ? 'up' : 'down' : '';
  return (
    <div className="performance-metric">
      <span>{label}</span>
      <b className={toneClass} dir="ltr">{value}</b>
    </div>
  );
}

type EconomicCalendarFilter = 'today' | 'week' | 'high' | 'USD' | 'EUR' | 'GBP' | 'JPY';
type EconomicCalendarEvent = {
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

const ECONOMIC_CALENDAR_FILTERS: EconomicCalendarFilter[] = ['today', 'week', 'high', 'USD', 'EUR', 'GBP', 'JPY'];

function readCalendarField(event: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = event[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

function readCalendarDate(event: Record<string, any>) {
  const value = event.date ?? event.datetime ?? event.time ?? event.eventTime ?? event.event_time ?? event.timestamp;
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(typeof value === 'number' && value < 10000000000 ? value * 1000 : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCalendarDate(date: Date | null, locale: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatCalendarCountdown(date: Date | null, locale: string, fallback: string) {
  if (!date) return fallback;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return fallback;
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { numeric: 'auto' });
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return rtf.format(minutes, 'minute');
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return rtf.format(hours, 'hour');
  return rtf.format(Math.ceil(hours / 24), 'day');
}

function normalizeEconomicCalendarEvent(event: Record<string, any>, index: number, locale: string, unavailable: string): EconomicCalendarEvent {
  const eventTime = readCalendarDate(event);
  return {
    id: readCalendarField(event, ['id', 'event_id', 'eventId']) || `${readCalendarField(event, ['event', 'name', 'title'])}-${index}`,
    name: readCalendarField(event, ['event', 'name', 'title', 'headline']) || unavailable,
    currency: readCalendarField(event, ['currency', 'symbol', 'ccy']) || unavailable,
    country: readCalendarField(event, ['country', 'region']) || unavailable,
    impact: readCalendarField(event, ['impact', 'importance', 'level']) || unavailable,
    previous: readCalendarField(event, ['previous', 'prev']) || unavailable,
    forecast: readCalendarField(event, ['forecast', 'estimate', 'consensus']) || unavailable,
    actual: readCalendarField(event, ['actual', 'value']) || unavailable,
    eventTime,
    eventTimeLabel: formatCalendarDate(eventTime, locale) || unavailable,
  };
}

function isToday(date: Date | null) {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isWithinWeek(date: Date | null) {
  if (!date) return false;
  const now = Date.now();
  const diff = date.getTime() - now;
  return diff >= -86400000 && diff <= 7 * 86400000;
}

type CalendarTimeFilter = 'today' | 'tomorrow' | 'week';
type CalendarImpactFilter = 'all' | 'high' | 'medium' | 'low';
type CalendarCurrencyFilter = 'all' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF';

const CALENDAR_TIME_FILTERS: CalendarTimeFilter[] = ['today', 'tomorrow', 'week'];
const CALENDAR_IMPACT_FILTERS: CalendarImpactFilter[] = ['all', 'high', 'medium', 'low'];
const CALENDAR_CURRENCY_FILTERS: CalendarCurrencyFilter[] = ['all', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];
const CALENDAR_PAGE_SIZE = 12;

function marketIntlLocale(locale: string) {
  return locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US';
}

function getEconomicEventDate(event: NormalizedEconomicEvent) {
  if (!event.dateTime) return null;
  const date = new Date(event.dateTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameLocalDay(date: Date | null, compareTo: Date) {
  if (!date) return false;
  return startOfLocalDay(date).getTime() === startOfLocalDay(compareTo).getTime();
}

function isTomorrowLocalDay(date: Date | null, compareTo: Date) {
  if (!date) return false;
  const tomorrow = startOfLocalDay(compareTo);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfLocalDay(date).getTime() === tomorrow.getTime();
}

function isWithinCalendarWeek(date: Date | null, compareTo: Date) {
  if (!date) return false;
  const start = startOfLocalDay(compareTo).getTime();
  const end = start + 7 * 86400000;
  const value = date.getTime();
  return value >= start && value <= end;
}

function formatEconomicCalendarDate(date: Date | null, locale: string, unavailable: string) {
  if (!date) return unavailable;
  return new Intl.DateTimeFormat(marketIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatEconomicCalendarTime(date: Date | null, locale: string, unavailable: string) {
  if (!date) return unavailable;
  return new Intl.DateTimeFormat(marketIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatEconomicCalendarCountdown(date: Date | null, locale: string, fallback: string) {
  if (!date) return fallback;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return fallback;
  const relative = new Intl.RelativeTimeFormat(marketIntlLocale(locale), { numeric: 'auto' });
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return relative.format(minutes, 'minute');
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return relative.format(hours, 'hour');
  return relative.format(Math.ceil(hours / 24), 'day');
}

function displayEconomicValue(value: unknown, unavailable: string) {
  if (value === null || value === undefined || value === '') return unavailable;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : unavailable;
  if (typeof value === 'string') return value.trim() || unavailable;
  return unavailable;
}

function economicImpactLabel(impact: EconomicImpact, t: (key: string) => string) {
  if (impact === 'high') return t('market_calendar_impact_high');
  if (impact === 'medium') return t('market_calendar_impact_medium');
  if (impact === 'low') return t('market_calendar_impact_low');
  return t('market_unavailable');
}

function economicStatusLabel(status: NormalizedEconomicEvent['status'], t: (key: string) => string) {
  if (status === 'upcoming') return t('market_calendar_status_upcoming');
  if (status === 'released') return t('market_calendar_status_released');
  return t('market_unavailable');
}

function EconomicCalendarPanel({ t, locale, state }: { t: (key: string) => string; locale: string; state: ApiListState<Record<string, any>> }) {
  const [timeFilter, setTimeFilter] = useState<CalendarTimeFilter>('week');
  const [impactFilter, setImpactFilter] = useState<CalendarImpactFilter>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CalendarCurrencyFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(CALENDAR_PAGE_SIZE);
  const unavailable = t('market_unavailable');

  const events = useMemo(() => normalizeEconomicEvents(state.items), [state.items]);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => {
      const aTime = getEconomicEventDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = getEconomicEventDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    }),
    [events],
  );
  const now = new Date();
  const query = searchTerm.trim().toLowerCase();
  const todayCount = sortedEvents.filter(event => isSameLocalDay(getEconomicEventDate(event), now)).length;
  const highImpactCount = sortedEvents.filter(event => event.impact === 'high').length;
  const nextEvent = sortedEvents.find(event => event.impact === 'high' && (getEconomicEventDate(event)?.getTime() ?? 0) >= now.getTime())
    ?? sortedEvents.find(event => (getEconomicEventDate(event)?.getTime() ?? 0) >= now.getTime())
    ?? sortedEvents[0];
  const filteredEvents = sortedEvents.filter(event => {
    const date = getEconomicEventDate(event);
    if (timeFilter === 'today' && !isSameLocalDay(date, now)) return false;
    if (timeFilter === 'tomorrow' && !isTomorrowLocalDay(date, now)) return false;
    if (timeFilter === 'week' && !isWithinCalendarWeek(date, now)) return false;
    if (impactFilter !== 'all' && event.impact !== impactFilter) return false;
    if (currencyFilter !== 'all' && event.currency !== currencyFilter) return false;
    if (!query) return true;
    return [event.eventName, event.country, event.currency, event.source]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  useEffect(() => {
    setVisibleCount(CALENDAR_PAGE_SIZE);
  }, [currencyFilter, impactFilter, searchTerm, timeFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const lastUpdatedLabel = state.updatedAt ? formatEconomicCalendarDate(new Date(state.updatedAt), locale, unavailable) : unavailable;
  const isMissingSource = state.code === 'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED' || state.code === 'ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED' || state.code === 'ECONOMIC_CALENDAR_NOT_CONFIGURED';
  const emptyTitle = isMissingSource ? t('market_calendar_not_configured_title') : t('market_calendar_unavailable_title');
  const emptyBody = isMissingSource ? t('market_calendar_not_configured_body') : (state.message || t('market_calendar_unavailable_body'));

  return (
    <section className="economic-calendar-dashboard market-panel">
      <div className="economic-calendar-dashboard-head">
        <span className="economic-calendar-head-icon"><CalendarDays size={24} /></span>
        <div>
          <small>{t('market_high_impact_events')}</small>
          <h2>{t('market_economic_calendar')}</h2>
          <p>{t('market_calendar_dashboard_subtitle')}</p>
        </div>
      </div>

      <div className="economic-calendar-summary-grid">
        <CalendarStatCard icon={<Clock3 size={18} />} label={t('market_calendar_next_event')} value={nextEvent?.eventName ?? unavailable} valueDir="auto" tone="cyan" />
        <CalendarStatCard icon={<CalendarDays size={18} />} label={t('market_calendar_today_events')} value={String(todayCount)} valueDir="ltr" tone="blue" />
        <CalendarStatCard icon={<AlertTriangle size={18} />} label={t('market_calendar_high_impact_count')} value={String(highImpactCount)} valueDir="ltr" tone="amber" />
        <CalendarStatCard icon={<CheckCircle2 size={18} />} label={t('market_last_updated')} value={lastUpdatedLabel} valueDir="ltr" tone="green" />
      </div>

      {state.loading ? (
        <div className="market-empty">{t('market_loading_data')}</div>
      ) : sortedEvents.length === 0 ? (
        <div className="economic-calendar-empty-state">
          <span><CalendarDays size={24} /></span>
          <div>
            <small>{t('market_high_impact_events')}</small>
            <strong>{emptyTitle}</strong>
            <p>{emptyBody}</p>
            <em>{t('market_calendar_public_note')}</em>
          </div>
        </div>
      ) : (
        <>
          {nextEvent && <CalendarFeaturedEvent event={nextEvent} locale={locale} t={t} unavailable={unavailable} />}

          <div className="economic-calendar-filter-card">
            <label className="economic-calendar-search">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder={t('market_calendar_search_placeholder')}
                type="search"
              />
            </label>
            <CalendarFilterGroup
              label={t('market_calendar_time_filter')}
              options={CALENDAR_TIME_FILTERS}
              active={timeFilter}
              onSelect={setTimeFilter}
              getLabel={item => t(item === 'today' ? 'market_calendar_filter_today' : item === 'tomorrow' ? 'market_calendar_filter_tomorrow' : 'market_calendar_filter_week')}
            />
            <CalendarFilterGroup
              label={t('market_calendar_impact_filter')}
              options={CALENDAR_IMPACT_FILTERS}
              active={impactFilter}
              onSelect={setImpactFilter}
              getLabel={item => t(item === 'all' ? 'market_calendar_filter_all' : `market_calendar_filter_${item}`)}
            />
            <CalendarFilterGroup
              label={t('market_calendar_currency_filter')}
              options={CALENDAR_CURRENCY_FILTERS}
              active={currencyFilter}
              onSelect={setCurrencyFilter}
              getLabel={item => item === 'all' ? t('market_calendar_filter_all_currencies') : item}
              valueDir="ltr"
            />
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyToolState title={t('market_calendar_filter_empty_title')} body={t('market_calendar_filter_empty_body')} />
          ) : (
            <>
              <div className="economic-calendar-mobile-list">
                {visibleEvents.map(event => (
                  <CalendarEventCard key={event.id} event={event} locale={locale} t={t} unavailable={unavailable} />
                ))}
              </div>
              <div className="economic-calendar-table-card">
                <table>
                  <thead>
                    <tr>
                      <th>{t('market_calendar_event')}</th>
                      <th>{t('market_calendar_currency')}</th>
                      <th>{t('market_calendar_impact')}</th>
                      <th>{t('market_calendar_event_time')}</th>
                      <th>{t('market_calendar_previous')}</th>
                      <th>{t('market_calendar_forecast')}</th>
                      <th>{t('market_calendar_actual')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map(event => (
                      <tr key={event.id}>
                        <td>
                          <strong dir="auto">{event.eventName}</strong>
                          <small>{displayEconomicValue(event.country, unavailable)} · {economicStatusLabel(event.status, t)}</small>
                        </td>
                        <td><span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span></td>
                        <td><CalendarImpactBadge impact={event.impact} t={t} /></td>
                        <td dir="ltr">{formatEconomicCalendarDate(getEconomicEventDate(event), locale, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.previous, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.forecast, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.actual, unavailable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="economic-calendar-list-footer">
                {visibleCount < filteredEvents.length ? (
                  <button type="button" onClick={() => setVisibleCount(count => count + CALENDAR_PAGE_SIZE)}>
                    {t('market_calendar_show_more')}
                  </button>
                ) : (
                  <span>{t('market_calendar_all_displayed')}</span>
                )}
              </div>
            </>
          )}
        </>
      )}
      <style jsx global>{`
        .economic-calendar-dashboard{width:100%;max-width:1500px;margin-inline:auto;display:grid;gap:18px;overflow:hidden;border-radius:32px}
        .economic-calendar-dashboard-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
        .economic-calendar-head-icon{width:54px;height:54px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));border:1px solid rgba(47,214,192,.22);color:var(--sfm-primary-hover)}
        .economic-calendar-dashboard-head small{display:block;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;line-height:1.4}
        .economic-calendar-dashboard-head h2{margin:3px 0 0;color:var(--sfm-foreground);font-size:clamp(24px,3vw,34px);font-weight:950;line-height:1.2}
        .economic-calendar-dashboard-head p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.85}
        .economic-calendar-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .calendar-stat-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;min-width:0;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);border-radius:24px;padding:14px;box-shadow:0 14px 34px rgba(3,18,37,.06)}
        .calendar-stat-card i{width:42px;height:42px;border-radius:18px;display:grid;place-items:center;font-style:normal;border:1px solid rgba(167,243,240,.18);background:var(--sfm-light-card)}
        .calendar-stat-card small{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.45}
        .calendar-stat-card strong{display:block;margin-top:3px;color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .calendar-stat-card.cyan i{color:var(--sfm-primary-hover);background:rgba(47,214,192,.11)}
        .calendar-stat-card.blue i{color:#2563EB;background:rgba(37,99,235,.09)}
        .calendar-stat-card.amber i{color:#B45309;background:rgba(245,158,11,.11)}
        .calendar-stat-card.green i{color:#059669;background:rgba(16,185,129,.11)}
        .economic-calendar-featured{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;border:1px solid rgba(47,214,192,.22);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.11)),var(--sfm-card);border-radius:30px;padding:18px;box-shadow:0 18px 46px rgba(3,18,37,.08)}
        .economic-calendar-featured-main{display:grid;gap:12px;min-width:0}
        .economic-calendar-featured-main small,.economic-calendar-featured-metrics small{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.4}
        .economic-calendar-featured-main h3{margin:0;color:var(--sfm-foreground);font-size:clamp(19px,2.2vw,26px);font-weight:950;line-height:1.35;overflow-wrap:anywhere}
        .economic-calendar-featured-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        .calendar-currency-badge,.calendar-status-badge,.calendar-source-badge,.calendar-countdown-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;border-radius:999px;border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
        .calendar-status-badge{border-color:rgba(29,140,255,.20);background:rgba(29,140,255,.09);color:#2563EB}
        .calendar-source-badge{border-color:rgba(100,116,139,.18);background:rgba(100,116,139,.08);color:var(--sfm-muted)}
        .calendar-countdown-badge{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.11);color:#B45309}
        .economic-calendar-featured-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .economic-calendar-filter-card{display:grid;gap:12px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:26px;padding:14px;box-shadow:0 14px 34px rgba(3,18,37,.05)}
        .economic-calendar-search{display:flex;align-items:center;gap:10px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-light-card);border-radius:20px;padding:0 13px;min-height:48px;color:var(--sfm-muted)}
        .economic-calendar-search input{width:100%;min-width:0;border:0;background:transparent;outline:none;color:var(--sfm-foreground);font:850 14px Tajawal,Arial,sans-serif}
        .economic-calendar-search input::placeholder{color:var(--sfm-muted)}
        .calendar-filter-group{display:grid;gap:8px;min-width:0}
        .calendar-filter-group>span{color:var(--sfm-muted);font-size:12px;font-weight:950}
        .calendar-filter-row{display:flex;gap:8px;overflow-x:auto;padding:1px 1px 7px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .calendar-filter-row::-webkit-scrollbar{display:none}
        .calendar-filter-row button{flex:0 0 auto;min-height:39px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-muted);padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}
        .calendar-filter-row button:hover,.calendar-filter-row button:focus-visible,.calendar-filter-row button[aria-pressed="true"]{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.18);transform:translateY(-1px)}
        .economic-calendar-table-card{overflow-x:auto;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:28px;box-shadow:0 16px 40px rgba(3,18,37,.06)}
        .economic-calendar-table-card table{width:100%;min-width:900px;border-collapse:separate;border-spacing:0}
        .economic-calendar-table-card th{padding:14px 16px;text-align:inherit;color:var(--sfm-muted);font-size:12px;font-weight:950;background:var(--sfm-light-card);white-space:nowrap}
        .economic-calendar-table-card th:first-child{border-start-start-radius:24px}
        .economic-calendar-table-card th:last-child{border-start-end-radius:24px}
        .economic-calendar-table-card td{padding:15px 16px;border-top:1px solid rgba(167,243,240,.12);color:var(--sfm-foreground);font-size:13px;font-weight:850;white-space:nowrap;vertical-align:middle}
        .economic-calendar-table-card td:first-child{white-space:normal;min-width:270px}
        .economic-calendar-table-card td strong{display:block;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.5}
        .economic-calendar-table-card td small{display:block;margin-top:4px;color:var(--sfm-muted);font-size:11px;font-weight:900}
        .economic-calendar-mobile-list{display:none;gap:12px}
        .economic-calendar-event-card{display:grid;gap:13px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:24px;padding:15px;box-shadow:0 12px 30px rgba(3,18,37,.05)}
        .economic-calendar-event-head{display:grid;gap:10px}
        .economic-calendar-event-head h3{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .economic-calendar-event-badges{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
        .economic-calendar-event-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .economic-calendar-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:16px;padding:10px}
        .economic-calendar-metric small{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}
        .economic-calendar-metric b{color:var(--sfm-foreground);font-size:12px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .calendar-impact-badge{display:inline-flex;align-items:center;width:max-content;border-radius:999px;border:1px solid rgba(100,116,139,.18);background:rgba(100,116,139,.08);color:var(--sfm-muted);padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
        .calendar-impact-badge.high{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.10);color:#DC2626}
        .calendar-impact-badge.medium{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.12);color:#B45309}
        .calendar-impact-badge.low{border-color:rgba(16,185,129,.22);background:rgba(16,185,129,.10);color:#059669}
        .economic-calendar-list-footer{display:flex;justify-content:center}
        .economic-calendar-list-footer button,.economic-calendar-list-footer span{border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:10px 16px;font:950 13px Tajawal,Arial,sans-serif}
        .economic-calendar-list-footer button{cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
        .economic-calendar-list-footer button:hover,.economic-calendar-list-footer button:focus-visible{outline:none;transform:translateY(-1px);box-shadow:0 12px 24px rgba(29,140,255,.16)}
        .economic-calendar-empty-state{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;border:1px solid rgba(245,158,11,.24);background:linear-gradient(135deg,rgba(245,158,11,.10),rgba(29,140,255,.06)),var(--sfm-card);border-radius:28px;padding:20px;box-shadow:0 16px 40px rgba(3,18,37,.07)}
        .economic-calendar-empty-state>span{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.24);color:#B45309}
        .economic-calendar-empty-state small{display:block;color:#B45309;font-size:12px;font-weight:950;line-height:1.4;margin-bottom:5px}
        .economic-calendar-empty-state strong{display:block;color:var(--sfm-foreground);font-size:clamp(18px,2vw,24px);font-weight:950;line-height:1.35}
        .economic-calendar-empty-state p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.9}
        .economic-calendar-empty-state em{display:inline-flex;width:max-content;max-width:100%;margin-top:12px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 11px;font-style:normal;font-size:12px;font-weight:950;line-height:1.4}
        .dark .calendar-stat-card,.dark .economic-calendar-filter-card,.dark .economic-calendar-table-card,.dark .economic-calendar-event-card{background:#0f1d31;border-color:#1d3050}
        .dark .calendar-stat-card i,.dark .economic-calendar-search,.dark .calendar-filter-row button,.dark .economic-calendar-table-card th,.dark .economic-calendar-metric{background:#0a1422;border-color:#1d3050}
        .dark .economic-calendar-featured{background:linear-gradient(135deg,rgba(29,140,255,.09),rgba(47,214,192,.10)),#0f1d31;border-color:rgba(47,214,192,.24)}
        .dark .calendar-status-badge{color:#93C5FD;border-color:rgba(147,197,253,.24);background:rgba(147,197,253,.10)}
        .dark .calendar-countdown-badge{color:#FDE68A;border-color:rgba(245,185,66,.25);background:rgba(245,185,66,.12)}
        .dark .calendar-impact-badge.high{color:#FCA5A5}.dark .calendar-impact-badge.medium{color:#FDE68A}.dark .calendar-impact-badge.low{color:#86EFAC}
        .dark .economic-calendar-empty-state{background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(29,140,255,.07)),#0f1d31;border-color:rgba(245,185,66,.26)}
        .dark .economic-calendar-empty-state>span{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.24);color:#F5B942}
        .dark .economic-calendar-empty-state small{color:#F5B942}
        .dark .economic-calendar-empty-state em{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}
        @media(max-width:980px){.economic-calendar-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.economic-calendar-featured{grid-template-columns:1fr}.economic-calendar-table-card{display:none}.economic-calendar-mobile-list{display:grid}}
        @media(max-width:640px){.economic-calendar-dashboard{border-radius:24px;padding:16px}.economic-calendar-dashboard-head{grid-template-columns:1fr}.economic-calendar-summary-grid{grid-template-columns:1fr}.calendar-stat-card strong{white-space:normal}.economic-calendar-featured{border-radius:24px;padding:15px}.economic-calendar-featured-metrics,.economic-calendar-event-metrics{grid-template-columns:1fr}.economic-calendar-filter-card{border-radius:22px;padding:12px}.economic-calendar-empty-state{grid-template-columns:1fr;padding:16px;border-radius:22px}.economic-calendar-empty-state>span{width:46px;height:46px;border-radius:17px}}
      `}</style>
    </section>
  );
}

function CalendarStatCard({ icon, label, value, valueDir, tone }: { icon: ReactNode; label: string; value: string; valueDir?: 'ltr' | 'rtl' | 'auto'; tone: 'cyan' | 'blue' | 'amber' | 'green' }) {
  return (
    <article className={`calendar-stat-card ${tone}`}>
      <i>{icon}</i>
      <div>
        <small>{label}</small>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </article>
  );
}

function CalendarFeaturedEvent({ event, locale, t, unavailable }: { event: NormalizedEconomicEvent; locale: string; t: (key: string) => string; unavailable: string }) {
  const eventDate = getEconomicEventDate(event);
  return (
    <article className="economic-calendar-featured">
      <div className="economic-calendar-featured-main">
        <small>{t('market_calendar_featured_event')}</small>
        <h3 dir="auto">{event.eventName}</h3>
        <div className="economic-calendar-featured-meta">
          <span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span>
          <CalendarImpactBadge impact={event.impact} t={t} />
          <span className="calendar-countdown-badge">{formatEconomicCalendarCountdown(eventDate, locale, t('market_calendar_now'))}</span>
          <span className="calendar-source-badge" dir="ltr">{displayEconomicValue(event.source, unavailable)}</span>
        </div>
      </div>
      <div className="economic-calendar-featured-metrics">
        <CalendarMetric label={t('market_calendar_event_time')} value={formatEconomicCalendarTime(eventDate, locale, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_previous')} value={displayEconomicValue(event.previous, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_forecast')} value={displayEconomicValue(event.forecast, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_actual')} value={displayEconomicValue(event.actual, unavailable)} valueDir="ltr" />
      </div>
    </article>
  );
}

function CalendarFilterGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
  getLabel,
  valueDir,
}: {
  label: string;
  options: T[];
  active: T;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
  valueDir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="calendar-filter-group">
      <span>{label}</span>
      <div className="calendar-filter-row">
        {options.map(option => (
          <button key={option} type="button" aria-pressed={active === option} onClick={() => onSelect(option)} dir={valueDir}>
            {getLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarImpactBadge({ impact, t }: { impact: EconomicImpact; t: (key: string) => string }) {
  return <span className={`calendar-impact-badge ${impact}`}>{economicImpactLabel(impact, t)}</span>;
}

function CalendarEventCard({ event, locale, t, unavailable }: { event: NormalizedEconomicEvent; locale: string; t: (key: string) => string; unavailable: string }) {
  const eventDate = getEconomicEventDate(event);
  return (
    <article className="economic-calendar-event-card">
      <div className="economic-calendar-event-head">
        <div className="economic-calendar-event-badges">
          <span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span>
          <CalendarImpactBadge impact={event.impact} t={t} />
          <span className="calendar-status-badge">{economicStatusLabel(event.status, t)}</span>
        </div>
        <h3 dir="auto">{event.eventName}</h3>
      </div>
      <div className="economic-calendar-event-metrics">
        <CalendarMetric label={t('market_calendar_event_time')} value={formatEconomicCalendarDate(eventDate, locale, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_country')} value={displayEconomicValue(event.country, unavailable)} valueDir="auto" />
        <CalendarMetric label={t('market_calendar_previous')} value={displayEconomicValue(event.previous, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_forecast')} value={displayEconomicValue(event.forecast, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_actual')} value={displayEconomicValue(event.actual, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_source')} value={displayEconomicValue(event.source, unavailable)} valueDir="ltr" />
      </div>
    </article>
  );
}

function CalendarMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' | 'auto' }) {
  return (
    <span className="economic-calendar-metric">
      <small>{label}</small>
      <b dir={valueDir}>{value}</b>
    </span>
  );
}

function LegacyEconomicCalendarPanel({ t, locale, state }: { t: (key: string) => string; locale: string; state: ApiListState<Record<string, any>> }) {
  const [filter, setFilter] = useState<EconomicCalendarFilter>('week');
  const events = useMemo(
    () => state.items.map((event, index) => normalizeEconomicCalendarEvent(event, index, locale, t('market_unavailable'))),
    [locale, state.items, t],
  );
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.eventTime?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.eventTime?.getTime() ?? Number.MAX_SAFE_INTEGER)),
    [events],
  );
  const filteredEvents = useMemo(() => sortedEvents.filter(event => {
    if (filter === 'today') return isToday(event.eventTime);
    if (filter === 'week') return isWithinWeek(event.eventTime);
    if (filter === 'high') return /high|عالي|fort/i.test(event.impact);
    return event.currency.toUpperCase() === filter;
  }), [filter, sortedEvents]);
  const nextEvent = sortedEvents.find(event => event.eventTime && event.eventTime.getTime() >= Date.now()) ?? sortedEvents[0];
  const isMissingSource = state.code === 'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED' || state.code === 'ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED' || state.code === 'ECONOMIC_CALENDAR_NOT_CONFIGURED';
  const emptyTitle = isMissingSource ? t('market_calendar_not_configured_title') : t('market_calendar_unavailable_title');
  const emptyBody = isMissingSource ? t('market_calendar_not_configured_body') : (state.message || t('market_calendar_unavailable_body'));

  return (
    <section className="market-panel economic-calendar-panel">
      <div className="market-section-head">
        <CalendarDays size={20} />
        <div>
          <span>{t('market_high_impact_events')}</span>
          <h2>{t('market_economic_calendar')}</h2>
        </div>
      </div>

      {state.loading ? (
        <div className="market-empty">{t('market_loading_data')}</div>
      ) : sortedEvents.length === 0 ? (
        <div className="economic-calendar-empty">
          <span className="economic-calendar-empty-icon"><CalendarDays size={24} /></span>
          <div>
            <small>{t('market_high_impact_events')}</small>
            <strong>{emptyTitle}</strong>
            <p>{emptyBody}</p>
            <div className="economic-calendar-chips" aria-label={t('market_calendar_key_events')}>
              {['NFP', 'CPI', 'FOMC', 'ECB', 'BoE'].map(item => <span key={item} dir="ltr">{item}</span>)}
            </div>
            <em>{t('market_calendar_public_note')}</em>
          </div>
        </div>
      ) : (
        <>
          {nextEvent && (
            <article className="economic-calendar-next">
              <div>
                <span>{t('market_calendar_next_event')}</span>
                <strong>{nextEvent.name}</strong>
              </div>
              <div className="economic-calendar-next-meta">
                <b dir="ltr">{nextEvent.currency}</b>
                <small>{formatCalendarCountdown(nextEvent.eventTime, locale, t('market_calendar_now'))}</small>
              </div>
            </article>
          )}

          <div className="economic-calendar-filters" role="tablist" aria-label={t('market_economic_calendar')}>
            {ECONOMIC_CALENDAR_FILTERS.map(item => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
                {t(item === 'today' ? 'market_calendar_filter_today' : item === 'week' ? 'market_calendar_filter_week' : item === 'high' ? 'market_calendar_filter_high' : `market_calendar_filter_${item.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyToolState title={t('market_calendar_filter_empty_title')} body={t('market_calendar_filter_empty_body')} />
          ) : (
            <div className="economic-calendar-list">
              {filteredEvents.slice(0, 12).map(event => (
                <article className="economic-calendar-event" key={event.id}>
                  <div className="economic-calendar-event-main">
                    <b>{event.name}</b>
                    <span>{event.country}</span>
                  </div>
                  <div className="economic-calendar-event-metrics">
                    <CalendarMetric label={t('market_calendar_event_time')} value={event.eventTimeLabel} />
                    <CalendarMetric label={t('market_calendar_currency')} value={event.currency} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_impact')} value={event.impact} />
                    <CalendarMetric label={t('market_calendar_previous')} value={event.previous} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_forecast')} value={event.forecast} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_actual')} value={event.actual} valueDir="ltr" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LegacyCalendarMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <span className="economic-calendar-metric">
      <small>{label}</small>
      <b dir={valueDir}>{value}</b>
    </span>
  );
}

function MarketDataPanel({
  icon,
  title,
  eyebrow,
  state,
  emptyTitle,
  emptyBody,
  loadingLabel,
}: {
  icon: ReactNode;
  title: string;
  eyebrow: string;
  state: ApiListState<Record<string, any>>;
  emptyTitle: string;
  emptyBody: string;
  loadingLabel: string;
}) {
  return (
    <section className="market-panel">
      <div className="market-section-head">
        {icon}
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {state.loading ? <div className="market-empty">{loadingLabel}</div> : (
        <EmptyToolState title={emptyTitle} body={state.message || emptyBody} />
      )}
    </section>
  );
}

type TradingOverlapId = 'sydney-tokyo' | 'tokyo-london' | 'london-newyork';

const TIMELINE_HOUR_MARKERS = [0, 4, 8, 12, 16, 20, 24];

const SESSION_TONE: Record<string, string> = {
  sydney: 'sydney',
  tokyo: 'tokyo',
  london: 'london',
  newyork: 'newyork',
};

const OVERLAP_TONE: Record<TradingOverlapId, 'medium' | 'high' | 'highest'> = {
  'sydney-tokyo': 'medium',
  'tokyo-london': 'high',
  'london-newyork': 'highest',
};

function tradingSessionNameKey(id: string) {
  return `market_session_name_${id}`;
}

function tradingOverlapNameKey(id: string) {
  return `market_overlap_${id.replace('-', '_')}`;
}

function tradingOverlapDescriptionKey(id: string) {
  return `market_overlap_${id.replace('-', '_')}_description`;
}

function tradingLiquidityLabelKey(tone: 'medium' | 'high' | 'highest') {
  if (tone === 'highest') return 'market_liquidity_highest';
  if (tone === 'high') return 'market_liquidity_high';
  return 'market_liquidity_medium';
}

function utcHourToLocalMinute(hourUtc: number, referenceDate: Date) {
  const date = new Date(referenceDate);
  date.setUTCSeconds(0, 0);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.getHours() * 60 + date.getMinutes();
}

function timelineSegments(startHourUtc: number, endHourUtc: number, referenceDate: Date) {
  const start = utcHourToLocalMinute(startHourUtc, referenceDate);
  const end = utcHourToLocalMinute(endHourUtc, referenceDate);
  const rawSegments = start < end
    ? [{ start, end }]
    : [{ start, end: 1440 }, { start: 0, end }];
  return rawSegments
    .filter(segment => segment.end > segment.start)
    .map(segment => ({
      left: `${(segment.start / 1440) * 100}%`,
      width: `${((segment.end - segment.start) / 1440) * 100}%`,
    }));
}

function formatUtcHourRange(startHourUtc: number, endHourUtc: number, referenceDate: Date, formatter: Intl.DateTimeFormat) {
  const start = new Date(referenceDate);
  start.setUTCSeconds(0, 0);
  start.setUTCHours(startHourUtc, 0, 0, 0);
  const end = new Date(referenceDate);
  end.setUTCSeconds(0, 0);
  end.setUTCHours(endHourUtc, 0, 0, 0);
  if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function TradingSessionsPanel({ t, locale }: { t: (key: string) => string; locale: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const sessions = getTradingSessionsState(now);
  const activeOverlapIds = getActiveOverlapIds(now);
  const formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="market-panel trading-sessions-dashboard">
      <div className="session-liquidity-head">
        <span className="session-liquidity-icon"><Clock3 size={22} /></span>
        <div>
          <small>{isHighLiquidityPeriod(now) ? t('market_high_liquidity') : t('market_sessions_utc_note')}</small>
          <h2>{t('market_liquidity_overlaps')}</h2>
          <p>{t('market_london_newyork_liquidity_note')}</p>
        </div>
      </div>

      <div className="session-overlap-summary-grid">
        {TRADING_OVERLAPS.map(overlap => {
          const tone = OVERLAP_TONE[overlap.id as TradingOverlapId];
          return (
            <article className={`session-overlap-card ${tone} ${activeOverlapIds.includes(overlap.id) ? 'active' : ''}`} key={overlap.id}>
              <span className="session-overlap-card-icon"><Activity size={16} /></span>
              <div>
                <strong>{t(tradingOverlapNameKey(overlap.id))}</strong>
                <p>{t(tradingOverlapDescriptionKey(overlap.id))}</p>
                <small dir="ltr">{formatUtcHourRange(overlap.startHourUtc, overlap.endHourUtc, now, formatter)}</small>
              </div>
              <b>{t(tradingLiquidityLabelKey(tone))}</b>
            </article>
          );
        })}
      </div>

      <div className="session-timeline-shell">
        <div className="session-timeline-title">
          <strong>{t('market_twenty_four_hour_timeline')}</strong>
          <span>{t('market_sessions_utc_note')}</span>
        </div>
        <div className="session-timeline-scroll">
          <div className="session-timeline-board" dir="ltr">
            <div className="session-hour-row" aria-hidden="true">
              {TIMELINE_HOUR_MARKERS.map(hour => (
                <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>{String(hour).padStart(2, '0')}</span>
              ))}
            </div>
            <div className="session-overlap-lane" aria-label={t('market_liquidity_overlaps')}>
              {TRADING_OVERLAPS.map(overlap => {
                const tone = OVERLAP_TONE[overlap.id as TradingOverlapId];
                return timelineSegments(overlap.startHourUtc, overlap.endHourUtc, now).map((segment, segmentIndex) => (
                  <span
                    key={`${overlap.id}-${segmentIndex}`}
                    className={`session-overlap-zone ${tone} ${activeOverlapIds.includes(overlap.id) ? 'active' : ''}`}
                    style={{ left: segment.left, width: segment.width }}
                  >
                    <b dir={locale === 'ar' ? 'rtl' : 'ltr'}>{t(tradingOverlapNameKey(overlap.id))}</b>
                  </span>
                ));
              })}
            </div>
            <div className="session-rows">
              {sessions.map(session => (
                <div className={`session-row ${SESSION_TONE[session.id] ?? ''}`} key={session.id}>
                  <div className="session-row-label" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <strong>{t(tradingSessionNameKey(session.id))}</strong>
                    <span className={`session-badge ${session.isOpen ? 'open' : ''}`}>{session.isOpen ? t('market_session_open') : t('market_session_closed')}</span>
                    <small dir="ltr">{formatUtcHourRange(session.openHourUtc, session.closeHourUtc, now, formatter)}</small>
                  </div>
                  <div className="session-row-track">
                    {timelineSegments(session.openHourUtc, session.closeHourUtc, now).map((segment, segmentIndex) => (
                      <span key={`${session.id}-${segmentIndex}`} className={`session-bar ${session.isOpen ? 'open' : ''}`} style={{ left: segment.left, width: segment.width }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .session-liquidity-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
        .session-liquidity-icon{width:54px;height:54px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));border:1px solid rgba(47,214,192,.22);color:var(--sfm-primary-hover)}
        .session-liquidity-head small{display:block;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;line-height:1.4}
        .session-liquidity-head h2{margin:3px 0 0;color:var(--sfm-foreground);font-size:clamp(24px,3vw,34px);font-weight:950;line-height:1.2}
        .session-liquidity-head p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.85}
        .session-overlap-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .session-overlap-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);border-radius:24px;padding:14px;box-shadow:0 14px 34px rgba(3,18,37,.06);overflow:hidden}
        .session-overlap-card::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:rgba(47,214,192,.55)}
        .session-overlap-card.high::before{background:#1D8CFF}.session-overlap-card.highest::before{background:#2FD6C0}
        .session-overlap-card.active{border-color:rgba(47,214,192,.38);box-shadow:0 18px 44px rgba(29,140,255,.12)}
        .session-overlap-card-icon{width:40px;height:40px;border-radius:16px;display:grid;place-items:center;border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover)}
        .session-overlap-card strong{display:block;color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45}
        .session-overlap-card p{margin:5px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.65}
        .session-overlap-card small{display:inline-flex;margin-top:9px;border-radius:999px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-light-card);color:var(--sfm-foreground);padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2}
        .session-overlap-card b{grid-column:1/-1;width:max-content;max-width:100%;border-radius:999px;border:1px solid rgba(245,158,11,.22);background:rgba(245,158,11,.10);color:#B45309;padding:6px 10px;font-size:11px;font-weight:950;line-height:1.2}
        .session-overlap-card.high b{border-color:rgba(29,140,255,.22);background:rgba(29,140,255,.10);color:#2563EB}
        .session-overlap-card.highest b{border-color:rgba(47,214,192,.25);background:rgba(47,214,192,.12);color:var(--sfm-primary-hover)}
        .session-timeline-shell{display:grid;gap:12px;border:1px solid rgba(47,214,192,.16);border-radius:28px;padding:16px;background:linear-gradient(135deg,rgba(29,140,255,.045),rgba(47,214,192,.07)),var(--sfm-light-card);min-width:0;overflow:hidden}
        .session-timeline-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
        .session-timeline-title strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45}
        .session-timeline-title span{max-width:560px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.65}
        .session-timeline-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
        .session-timeline-board{position:relative;min-width:760px;display:grid;gap:10px;padding:10px 12px 14px;border-radius:22px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card)}
        .session-hour-row{position:relative;height:24px;border-bottom:1px solid rgba(148,163,184,.18)}
        .session-hour-row span{position:absolute;top:0;transform:translateX(-50%);color:var(--sfm-muted);font-size:11px;font-weight:950}
        .session-hour-row span::after{content:"";position:absolute;top:20px;left:50%;width:1px;height:218px;background:rgba(148,163,184,.16)}
        .session-overlap-lane{position:relative;height:58px;border-radius:18px;background:linear-gradient(90deg,rgba(29,140,255,.06),rgba(47,214,192,.07));border:1px solid rgba(167,243,240,.12);overflow:visible}
        .session-overlap-zone{position:absolute;top:10px;height:38px;border-radius:999px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.26);box-shadow:0 10px 22px rgba(3,18,37,.05)}
        .session-overlap-zone.high{background:rgba(29,140,255,.14);border-color:rgba(29,140,255,.28)}
        .session-overlap-zone.highest{background:rgba(47,214,192,.18);border-color:rgba(47,214,192,.34)}
        .session-overlap-zone.active{box-shadow:0 0 0 3px rgba(47,214,192,.16),0 12px 26px rgba(29,140,255,.14)}
        .session-overlap-zone b{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max-content;max-width:180px;white-space:nowrap;border-radius:999px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);color:var(--sfm-foreground);padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2;box-shadow:0 8px 18px rgba(3,18,37,.08)}
        .session-rows{display:grid;gap:10px}
        .session-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px;align-items:center}
        .session-row-label{min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:18px;padding:10px;display:grid;gap:7px}
        .session-row-label strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.35}
        .session-row-label small{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.2}
        .session-row-label .session-badge{width:max-content;border-radius:999px;padding:6px 9px;background:rgba(148,163,184,.12);color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.2}
        .session-row-label .session-badge.open{background:rgba(47,214,192,.14);color:var(--sfm-primary-hover)}
        .session-row-track{position:relative;height:44px;border-radius:999px;border:1px solid rgba(167,243,240,.12);background:rgba(148,163,184,.10);overflow:hidden}
        .session-bar{position:absolute;top:8px;bottom:8px;border-radius:999px;background:linear-gradient(135deg,rgba(148,163,184,.36),rgba(100,116,139,.28));border:1px solid rgba(255,255,255,.14)}
        .session-row.sydney .session-bar{background:linear-gradient(135deg,rgba(14,165,233,.38),rgba(29,140,255,.36))}
        .session-row.tokyo .session-bar{background:linear-gradient(135deg,rgba(16,185,129,.36),rgba(47,214,192,.34))}
        .session-row.london .session-bar{background:linear-gradient(135deg,rgba(99,102,241,.36),rgba(29,140,255,.34))}
        .session-row.newyork .session-bar{background:linear-gradient(135deg,rgba(245,158,11,.34),rgba(47,214,192,.30))}
        .session-bar.open{box-shadow:0 0 24px rgba(47,214,192,.22)}
        .dark .session-overlap-card,.dark .session-timeline-board{background:#0f1d31;border-color:#1d3050}
        .dark .session-timeline-shell,.dark .session-row-label{background:#0a1422;border-color:#1d3050}
        .dark .session-overlap-card small,.dark .session-overlap-zone b{background:#0a1422;border-color:#1d3050}
        .dark .session-overlap-card.high b{color:#93C5FD}.dark .session-overlap-card b{color:#FDE68A}.dark .session-overlap-card.highest b{color:#2FD6C0}
        @media(max-width:980px){.session-overlap-summary-grid{grid-template-columns:1fr}.session-timeline-title{display:grid}.session-timeline-title span{max-width:100%}}
        @media(max-width:640px){.session-liquidity-head{grid-template-columns:1fr}.session-timeline-shell{border-radius:22px;padding:12px}.session-overlap-card{border-radius:20px}.session-timeline-board{min-width:760px}.session-row{grid-template-columns:160px minmax(0,1fr);gap:10px}}
      `}</style>
    </section>
  );
}

function SessionMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <div className="session-metric">
      <span>{label}</span>
      <strong dir={valueDir}>{value}</strong>
    </div>
  );
}

function TechnicalAnalysisPanel({
  t,
  locale,
  symbol,
  setSymbol,
  state,
  hasSelectedAsset,
  onSelectAsset,
}: {
  t: (key: string) => string;
  locale: string;
  symbol: string;
  setSymbol: (symbol: string) => void;
  state: TechnicalState;
  hasSelectedAsset: boolean;
  onSelectAsset: () => void;
}) {
  const data = state.data;
  const [category, setCategory] = useState<TechnicalSymbolCategory>(() => getTechnicalSymbolCategory(symbol));
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const normalizedQuery = query.trim().toUpperCase();
  const filteredSymbols = normalizedQuery
    ? TECHNICAL_SYMBOL_OPTIONS.filter(item => `${item.symbol} ${item.label}`.includes(normalizedQuery))
    : TECHNICAL_SYMBOL_GROUPS[category];
  const favoriteSymbols = favorites
    .map(item => getTechnicalSymbolOption(item))
    .filter((item): item is TechnicalSymbolOption => Boolean(item));
  const currentTrend = normalizePerformanceTrend(String(data?.trend ?? state.available?.trend ?? 'neutral'));
  const currentUpdatedAt = String(data?.updated_at ?? state.updatedAt ?? '');
  const currentStatus = state.loading ? t('market_loading_data') : data ? t('market_analysis_ready') : t('market_analysis_insufficient');
  const pivotPoints = data?.pivotPoints && typeof data.pivotPoints === 'object' ? data.pivotPoints as Record<string, unknown> : {};
  const supportRows = [
    ['S1', pivotPoints.s1],
    ['S2', pivotPoints.s2],
    ['S3', pivotPoints.s3],
    [t('market_support_zone'), data?.support?.[0]],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const resistanceRows = [
    ['R1', pivotPoints.r1],
    ['R2', pivotPoints.r2],
    ['R3', pivotPoints.r3],
    [t('market_resistance_zone'), data?.resistance?.[0]],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const indicatorRows = [
    ['RSI', data?.rsi],
    ['SMA 20', data?.movingAverages?.sma20],
    ['SMA 50', data?.movingAverages?.sma50],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));

  useEffect(() => {
    setCategory(getTechnicalSymbolCategory(symbol));
  }, [symbol]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TECHNICAL_SYMBOL_FAVORITES_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((item): item is string => typeof item === 'string' && Boolean(getTechnicalSymbolOption(item))));
      }
    } catch {
      setFavorites([]);
    } finally {
      setFavoritesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    window.localStorage.setItem(TECHNICAL_SYMBOL_FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesLoaded]);

  const handleSelectSymbol = (nextSymbol: string) => {
    const option = getTechnicalSymbolOption(nextSymbol);
    if (option) setCategory(option.category);
    setSymbol(nextSymbol);
  };

  const toggleFavorite = (nextSymbol: string) => {
    setFavorites(prev => prev.includes(nextSymbol) ? prev.filter(item => item !== nextSymbol) : [...prev, nextSymbol]);
  };

  const renderSymbolPill = (item: TechnicalSymbolOption) => {
    const active = symbol === item.symbol;
    const favorite = favorites.includes(item.symbol);
    return (
      <div className="technical-symbol-pill" data-active={active ? 'true' : 'false'} key={item.symbol}>
        <button className="technical-symbol-main" type="button" aria-pressed={active} onClick={() => handleSelectSymbol(item.symbol)}>
          <span dir="ltr">{item.label}</span>
        </button>
        <button
          className="technical-symbol-favorite"
          type="button"
          aria-label={favorite ? t('market_remove_from_favorites') : t('market_add_to_favorites')}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(item.symbol)}
        >
          <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  return (
    <section className="market-panel technical-analysis-panel">
      <div className="market-section-head">
        <Gauge size={20} />
        <div>
          <span>{t('market_pivot_points')}</span>
          <h2>{t('market_daily_technical_analysis')}</h2>
        </div>
      </div>
      {!hasSelectedAsset ? (
        <MarketEmptyState
          icon={<LineChart size={22} />}
          title={t('market_technical_choose_asset_title')}
          description={t('market_technical_choose_asset_body')}
          actionLabel={t('market_search_asset_action')}
          onAction={onSelectAsset}
        />
      ) : (
        <>
      <div className="technical-selector-shell">
        <div className="technical-search">
          <Search size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('market_symbol_search_placeholder')}
            dir="auto"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label={t('market_clear_symbol_search')}>
              ×
            </button>
          ) : null}
        </div>
        <div className="technical-category-row" aria-label={t('market_asset_type')}>
          {TECHNICAL_SYMBOL_CATEGORIES.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {t(`market_symbol_category_${item}`)}
            </button>
          ))}
        </div>
        {favoriteSymbols.length > 0 ? (
          <div className="technical-favorites">
            <span>{t('market_favorites')}</span>
            <div className="technical-symbol-row compact">
              {favoriteSymbols.map(renderSymbolPill)}
            </div>
          </div>
        ) : null}
        <div className="technical-symbol-row">
          {filteredSymbols.length > 0 ? filteredSymbols.map(renderSymbolPill) : (
            <span className="technical-no-results">{t('market_no_search_results')}</span>
          )}
        </div>
      </div>
      <div className="technical-selected-summary">
        <TechnicalSummaryItem icon={<WalletCards size={16} />} label={t('market_selected_asset')} value={formatTechnicalSymbol(symbol)} valueDir="ltr" />
        <TechnicalSummaryItem icon={<TrendingUp size={16} />} label={t('market_trend')} value={t(currentTrend === 'neutral' ? 'market_trend_sideways' : `market_trend_${currentTrend}`)} />
        <TechnicalSummaryItem icon={<Clock3 size={16} />} label={t('market_last_updated')} value={formatTechnicalTimestamp(currentUpdatedAt, locale) || t('market_unavailable')} />
        <TechnicalSummaryItem icon={<CheckCircle2 size={16} />} label={t('market_analysis_status')} value={currentStatus} />
      </div>
      {state.loading ? <div className="market-empty">{t('market_loading_data')}</div> : state.message ? (
        <TechnicalEmptyState title={t('market_technical_unified_empty_title')} body={t('market_technical_unified_empty_body')} />
      ) : data ? (
        <div className="technical-data-grid">
          <TechnicalDataCard
            icon={<TrendingUp size={17} />}
            title={t('market_general_trend')}
            value={t(normalizePerformanceTrend(String(data.trend ?? 'neutral')) === 'neutral' ? 'market_trend_sideways' : `market_trend_${normalizePerformanceTrend(String(data.trend ?? 'neutral'))}`)}
          />
          <TechnicalDataCard
            icon={<Gauge size={17} />}
            title={t('market_pivot_point')}
            value={hasDisplayValue(pivotPoints.pivot) ? formatNumber(Number(pivotPoints.pivot), 4) : t('market_unavailable')}
            valueDir="ltr"
          />
          <TechnicalDataCard
            icon={<TrendingDown size={17} />}
            title={t('market_support_zone')}
            rows={supportRows.map(([label, value]) => [label, formatNumber(Number(value), 4)])}
          />
          <TechnicalDataCard
            icon={<TrendingUp size={17} />}
            title={t('market_resistance_zone')}
            rows={resistanceRows.map(([label, value]) => [label, formatNumber(Number(value), 4)])}
          />
          <TechnicalDataCard
            icon={<BarChart3 size={17} />}
            title={t('market_indicators')}
            rows={indicatorRows.map(([label, value]) => [label, formatNumber(Number(value), label === 'RSI' ? 1 : 4)])}
          />
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}

function MarketDefaultDashboard({
  t,
  onSearch,
  onOpenTab,
}: {
  t: (key: string) => string;
  onSearch: () => void;
  onOpenTab: (tab: MarketTab) => void;
}) {
  const modules: Array<{
    tab: MarketTab;
    icon: ReactNode;
    title: string;
    body: string;
    action: string;
    onClick: () => void;
  }> = [
    {
      tab: 'analyze',
      icon: <Search size={18} />,
      title: t('market_quick_analyze_title'),
      body: t('market_quick_analyze_body'),
      action: t('market_search_asset_action'),
      onClick: onSearch,
    },
    {
      tab: 'traderTools',
      icon: <Calculator size={18} />,
      title: t('market_trader_tools'),
      body: t('market_quick_trader_tools_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('traderTools'),
    },
    {
      tab: 'economicCalendar',
      icon: <CalendarDays size={18} />,
      title: t('market_economic_calendar'),
      body: t('market_quick_calendar_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('economicCalendar'),
    },
    {
      tab: 'sessions',
      icon: <Clock3 size={18} />,
      title: t('market_trading_sessions'),
      body: t('market_quick_sessions_body'),
      action: t('market_open_module'),
      onClick: () => onOpenTab('sessions'),
    },
  ];

  return (
    <div className="market-default-dashboard">
      <MarketEmptyState
        icon={<LineChart size={24} />}
        title={t('market_default_start_title')}
        description={t('market_default_start_body')}
        actionLabel={t('market_search_asset_action')}
        onAction={onSearch}
      />
      <section className="market-default-modules" aria-label={t('market_default_modules_title')}>
        <div className="market-default-section-head">
          <span>{t('market_default_modules_title')}</span>
        </div>
        <div className="market-quick-grid">
          {modules.map(module => (
            <article className="market-quick-card" key={module.tab}>
              <span className="market-quick-icon">{module.icon}</span>
              <div>
                <h3>{module.title}</h3>
                <p>{module.body}</p>
              </div>
              <button type="button" onClick={module.onClick}>
                {module.action}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MarketEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="market-empty-state">
      <span className="market-empty-state-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MarketStatusCard({
  icon,
  label,
  value,
  helper,
  tone,
  valueDir,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'muted';
  valueDir?: 'ltr' | 'rtl';
}) {
  return (
    <article className="market-status-card">
      <span className="market-status-icon">{icon}</span>
      <div className="market-status-body">
        <small>{label}</small>
        {tone ? (
          <span className={`market-status-badge ${tone}`} dir={valueDir}>{value}</span>
        ) : (
          <strong className="market-status-value" dir={valueDir}>{value}</strong>
        )}
        {helper ? <p>{helper}</p> : null}
      </div>
    </article>
  );
}

function MarketStatusBanner({
  t,
  state,
  serviceNotice,
}: {
  t: (key: string) => string;
  state: MarketServiceState;
  serviceNotice: string;
}) {
  const connected = state === 'connected';
  return (
    <section className={`market-status-banner ${connected ? 'connected' : 'preparing'}`} role="status">
      {connected ? <CheckCircle2 size={19} /> : <Activity size={19} />}
      <div>
        <strong>{connected ? t('market_service_connected_title') : t('market_preparing_analysis')}</strong>
        <p>{connected ? `${t('market_data_source')}: OpenBB` : serviceNotice || t('market_preparing_analysis_body')}</p>
      </div>
    </section>
  );
}

function TechnicalSummaryItem({
  icon,
  label,
  value,
  valueDir,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueDir?: 'ltr' | 'rtl';
}) {
  return (
    <article className="technical-summary-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </article>
  );
}

function TechnicalDataCard({
  icon,
  title,
  value,
  valueDir,
  rows,
}: {
  icon: ReactNode;
  title: string;
  value?: string;
  valueDir?: 'ltr' | 'rtl';
  rows?: Array<[string, string]>;
}) {
  return (
    <article className="technical-data-card">
      <div className="technical-data-card-head">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>
      {value ? <strong dir={valueDir}>{value}</strong> : null}
      {rows && rows.length > 0 ? (
        <div className="technical-data-rows">
          {rows.map(([label, rowValue]) => (
            <div key={`${title}-${label}`}>
              <small dir="ltr">{label}</small>
              <b dir="ltr">{rowValue}</b>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function TechnicalEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="technical-empty-state">
      <AlertTriangle size={19} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function textField(item: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function numberField(item: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed <= 1 && parsed >= 0 ? parsed * 100 : parsed;
  }
  return null;
}

function clampPercentValue(value: number) {
  return Math.max(0, Math.min(100, value));
}

function sentimentValues(item: Record<string, any>) {
  let buy = numberField(item, ['buyPercent', 'buy_percentage', 'buy_percent', 'buyRatio', 'buy_ratio', 'buy', 'longPercent', 'long_percentage', 'bullishPercent', 'bullish_percentage']);
  let sell = numberField(item, ['sellPercent', 'sell_percentage', 'sell_percent', 'sellRatio', 'sell_ratio', 'sell', 'shortPercent', 'short_percentage', 'bearishPercent', 'bearish_percentage']);
  if (buy !== null && sell === null) sell = 100 - buy;
  if (sell !== null && buy === null) buy = 100 - sell;
  if (buy === null || sell === null) return null;
  return {
    buy: clampPercentValue(buy),
    sell: clampPercentValue(sell),
  };
}

function sentimentTone(values: { buy: number; sell: number }) {
  if (values.buy > values.sell + 5) return 'buy';
  if (values.sell > values.buy + 5) return 'sell';
  return 'balanced';
}

function publicNewsEmptyCopy(code: string | undefined, t: (key: string) => string) {
  return code === 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED'
    ? { title: t('market_news_not_configured_title'), body: t('market_news_not_configured_body') }
    : { title: t('market_news_unavailable_title'), body: t('market_news_unavailable_body') };
}

function publicSentimentEmptyCopy(code: string | undefined, t: (key: string) => string) {
  return code === 'MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED'
    ? { title: t('market_sentiment_not_configured_title'), body: t('market_sentiment_not_configured_body') }
    : { title: t('market_sentiment_unavailable_title'), body: t('market_sentiment_unavailable_body') };
}

function NewsSentimentPanel({
  t,
  news,
  sentiment,
}: {
  t: (key: string) => string;
  news: ApiListState<Record<string, any>>;
  sentiment: ApiListState<Record<string, any>>;
}) {
  const newsEmpty = publicNewsEmptyCopy(news.code, t);
  const sentimentEmpty = publicSentimentEmptyCopy(sentiment.code, t);

  return (
    <section className="news-sentiment-section" aria-labelledby="market-news-sentiment-title">
      <div className="market-panel news-sentiment-shell">
        <div className="market-section-head news-sentiment-head">
          <span className="news-sentiment-head-icon"><Newspaper size={20} /></span>
          <div>
            <span>{t('market_news_sentiment_subtitle')}</span>
            <h2 id="market-news-sentiment-title">{t('market_news_sentiment')}</h2>
          </div>
        </div>

        <div className="news-sentiment-grid">
          <article className="news-tool-card">
            <div className="news-tool-card-head">
              <span><Landmark size={19} /></span>
              <div>
                <small>{t('market_central_bank_topics')}</small>
                <h3>{t('market_central_bank_news')}</h3>
              </div>
            </div>

            {news.loading ? (
              <div className="market-empty">{t('market_loading_data')}</div>
            ) : news.items.length > 0 ? (
              <div className="central-news-list">
                {news.items.map((item, index) => {
                  const headline = textField(item, ['title', 'headline', 'name']);
                  const summary = textField(item, ['summary', 'description', 'excerpt']);
                  const source = textField(item, ['source', 'sourceName', 'provider', 'publisher']);
                  const published = textField(item, ['publishedAt', 'published_at', 'published', 'date', 'time']);
                  const related = textField(item, ['bank', 'centralBank', 'central_bank', 'currency', 'region']);
                  const url = textField(item, ['url', 'link', 'sourceUrl', 'source_url']);
                  return (
                    <article className="central-news-card" key={`${headline || source || 'central-news'}-${index}`}>
                      <div className="central-news-meta">
                        {related ? <span dir="ltr">{related}</span> : null}
                        {published ? <small dir="ltr">{published}</small> : null}
                      </div>
                      <h4>{headline || t('market_news_no_items_title')}</h4>
                      {summary ? <p>{summary}</p> : null}
                      <div className="central-news-footer">
                        {source ? <small>{t('market_news_source')}: {source}</small> : null}
                        {url ? <a href={url} target="_blank" rel="noreferrer">{t('market_open_source')}</a> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <MarketToolEmptyState icon={<Newspaper size={18} />} title={newsEmpty.title} description={newsEmpty.body} variant="info" />
            )}
          </article>

          <article className="news-tool-card">
            <div className="news-tool-card-head">
              <span><BarChart3 size={19} /></span>
              <div>
                <small>{t('market_sentiment_note_title')}</small>
                <h3>{t('market_market_sentiment')}</h3>
              </div>
            </div>

            {sentiment.loading ? (
              <div className="market-empty">{t('market_loading_data')}</div>
            ) : sentiment.items.length > 0 ? (
              <div className="sentiment-card-list">
                {sentiment.items.map((item, index) => {
                  const symbol = textField(item, ['symbol', 'ticker', 'asset', 'instrument']);
                  const name = textField(item, ['name', 'assetName', 'asset_name', 'description']);
                  const values = sentimentValues(item);
                  if (!values) {
                    return (
                      <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                        <div className="sentiment-card-head">
                          <b dir="ltr">{symbol || t('market_unavailable')}</b>
                          {name ? <span>{name}</span> : null}
                        </div>
                        <p>{t('market_sentiment_no_items_body')}</p>
                      </article>
                    );
                  }
                  const tone = sentimentTone(values);
                  return (
                    <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                      <div className="sentiment-card-head">
                        <div>
                          <b dir="ltr">{symbol || t('market_unavailable')}</b>
                          {name ? <span>{name}</span> : null}
                        </div>
                        <em className={`sentiment-badge ${tone}`}>
                          {tone === 'buy' ? t('market_sentiment_majority_buy') : tone === 'sell' ? t('market_sentiment_majority_sell') : t('market_sentiment_balanced')}
                        </em>
                      </div>
                      <div className="sentiment-metrics">
                        <span>{t('market_buy_ratio')} <b dir="ltr">{values.buy.toFixed(0)}%</b></span>
                        <span>{t('market_sell_ratio')} <b dir="ltr">{values.sell.toFixed(0)}%</b></span>
                      </div>
                      <div className="sentiment-bar" aria-hidden="true">
                        <i style={{ width: `${values.buy}%` }} />
                        <b style={{ width: `${values.sell}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <MarketToolEmptyState icon={<BarChart3 size={18} />} title={sentimentEmpty.title} description={sentimentEmpty.body} variant="info" />
            )}

            <div className="sentiment-info-card">
              <ShieldAlert size={17} />
              <p>{t('market_sentiment_warning')}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function MarketToolEmptyState({
  icon = <AlertTriangle size={18} />,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'neutral',
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'warning' | 'neutral';
}) {
  return (
    <div className={`tool-empty-state ${variant}`}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
      </div>
    </div>
  );
}

function EmptyToolState({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return <MarketToolEmptyState icon={icon} title={title} description={body} variant="neutral" />;
}

function MarketMetric({ label, value, icon, valueDir }: { label: string; value: string; icon?: ReactNode; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong dir={valueDir}>{icon}{value}</strong>
    </div>
  );
}
