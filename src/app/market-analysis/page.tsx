'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Brain, Calculator, FileText, LineChart, Plus, Search, ShieldAlert, Sparkles, Star, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
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
import type { AssetProfileResponse } from '@/lib/market/fetchAssetProfile';
import type { MarketAiInsight, MarketAnalysis, MarketAssetType, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import { marketSymbolSuggestions, normalizeAssetType, normalizeMarketSymbolInput, validateSymbol } from '@/lib/market/marketService';

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
type MarketTab = 'analyze' | 'watchlist' | 'alerts' | 'comparison' | 'assetReport';
type MarketAiInsightView = MarketAiInsight & { riskScore?: number };
type MarketSearchSuggestion = MarketSearchItem & { provider?: string };
type MarketResultWithMeta = MarketResult & {
  code?: string;
  openbbService?: MarketServiceState;
  source?: string;
  fallback?: boolean;
  fallbackReason?: string;
  suggestions?: string[];
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
      setError(t('market_symbol_not_found_helpful'));
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
      setError(t('market_symbol_not_found_helpful'));
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
        setErrorSuggestions(result.suggestions?.length ? result.suggestions : symbolIssue ? normalizedInput.suggestions : []);
        setAiInsight({ status: 'skipped', error: t('market_no_real_data_ai') });
        throw new Error(marketErrorText(result.code, result.error || t('market_analysis_unavailable'), t));
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
      setSearchMessage(t('market_symbol_not_found_helpful'));
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
        selectedItem = {
          symbol: normalizedInput.displaySymbol ?? normalizedInput.symbol,
          providerSymbol: normalizedInput.providerSymbol,
          name: normalizedInput.displaySymbol ?? normalizedInput.symbol,
          assetType: normalizedInput.assetType,
          exchange: normalizedInput.assetType === 'forex' ? 'FX' : normalizedInput.assetType === 'crypto' ? 'Crypto' : normalizedInput.assetType === 'gold' ? 'COMEX' : undefined,
          provider: 'THE SFM',
        };
      } else {
        setSelectedAsset(null);
        setAnalysis(null);
        setServiceState(current => current === 'checking' ? 'connected' : current);
        setError(t('market_symbol_not_found_helpful'));
        setErrorSuggestions(normalizedInput.suggestions);
        setSearchMessage(t('market_symbol_not_found_helpful'));
        return;
      }
    }

    if (!selectedItem) {
      setSelectedAsset(null);
      setAnalysis(null);
      setError(t('market_symbol_not_found_helpful'));
      setErrorSuggestions(marketSymbolSuggestions(cleanQuery));
      setSearchMessage(t('market_symbol_not_found_helpful'));
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
    { id: 'watchlist', label: t('market_watchlist'), count: watchlist.length },
    { id: 'alerts', label: t('market_price_alerts'), count: alerts.length },
    { id: 'comparison', label: t('market_compare_assets'), count: compare.length },
    { id: 'assetReport', label: t('market_ai_asset_report') },
  ], [alerts.length, compare.length, t, watchlist.length]);

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
          <div className="market-hero-card">
            <span>{t('market_selected_asset')}</span>
            <strong>{selected?.symbol ?? selectedAsset?.symbol ?? '--'}</strong>
            <p>{localizedAssetName ?? selectedAsset?.name ?? t('market_select_asset_to_start')}</p>
            {selected && <em>{money(selected.latestPrice, selectedCurrency)} · {selected.cached ? t('market_cached_data') : t('market_badge_live')}</em>}
            {selected && <b className={`risk ${selected.riskLevel}`}>{t(`market_risk_${selected.riskLevel}`)}</b>}
          </div>
        </section>

        <div className={`market-service ${serviceState}`}>
          <Activity size={17} />
          <span>{t('market_service_status')}: {serviceNotice}</span>
        </div>

        <section className="market-status-grid">
          <MarketMetric label={t('market_service_state')} value={serviceState === 'connected' ? t('market_connected_short') : serviceNotice} />
          <MarketMetric label={t('market_data_source')} value={selected ? (selected.cached ? t('market_cached_data') : t('market_badge_live')) : t('market_no_data')} />
          <MarketMetric label={t('market_selected_asset')} value={selected?.symbol ?? selectedAsset?.symbol ?? '--'} />
          <MarketMetric label={t('market_last_updated')} value={selected ? lastUpdated || '--' : '--'} />
        </section>

        <PageTabs
          tabs={marketTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as MarketTab)}
          ariaLabel={t('market_title')}
        />

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

        {activeTab === 'analyze' && <section className="market-card-grid" aria-label={t('market_analysis_cards')}>
          {loading ? (
            <div className="market-empty" role="status">{loadingLabel}</div>
          ) : cards.length === 0 ? (
            <div className="market-empty market-empty-detailed">
              <strong>{selectedAsset?.symbol ? t('market_symbol_data_unavailable') : t('market_select_asset_to_start')}</strong>
              {selectedAsset?.symbol && <span>{t('market_selected_asset')}: {selectedAsset.symbol}{selectedAsset.name ? ` - ${selectedAsset.name}` : ''}</span>}
              {selectedAsset?.symbol && <span>{t('market_data_source')}: OpenBB / {selectedAsset.exchange ?? 'US market symbols'}</span>}
              {error && <span>{t('market_error_reason')}: {error}</span>}
              {selectedAsset?.symbol && <p>{t('market_symbol_exists_note')}</p>}
              {selectedAsset && (
                <button type="button" onClick={() => void requestAnalysis(selectedAsset.providerSymbol ?? selectedAsset.symbol, selectedAsset.assetType, selectedAsset)}>
                  {t('market_retry')}
                </button>
              )}
            </div>
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

        {selected && activeTab === 'analyze' ? (
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
                <small>{t('market_last_updated')}: {lastUpdated || '--'} · {selectedCurrency}</small>
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
                    <span>{portfolio.length === 0 ? 'لا توجد بيانات استثمارية حالياً' : portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}</span>
                    <h2>{t('market_portfolio_comparison')}</h2>
                  </div>
                </div>
                <div className="indicator-list">
                  <MarketMetric label={t('market_purchase_price')} value={portfolioMatch ? money(purchasePrice, selectedCurrency) : '--'} />
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice, selectedCurrency)} />
                  <MarketMetric label={t('market_unrealized_pl')} value={portfolioMatch ? money(unrealized, selectedCurrency) : '--'} />
                  <MarketMetric label={t('market_gain_loss_percent')} value={portfolioMatch ? percent(unrealizedPct) : '--'} />
                  <MarketMetric label={t('market_portfolio_exposure')} value={portfolioMatch ? `${exposure.toFixed(1)}%` : '--'} />
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
                  {invalidWhatIfAmount && <small id="market-what-if-error" className="market-field-error">{t('market_invalid_amount')}</small>}
                </label>
                <div className="scenario-grid">
                  <MarketMetric label={t('market_estimated_units')} value={hasWhatIfAmount ? estimatedUnits.toFixed(4) : '--'} />
                  {[5, -5, 10, -10].map(change => (
                    <MarketMetric
                      key={change}
                      label={change > 0 ? `${t('market_positive_scenario')} ${change}%` : `${t('market_negative_scenario')} ${change}%`}
                      value={hasWhatIfAmount ? formatScenarioCurrency((whatIfValue * change) / 100) : '--'}
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
        .market-main{width:100%;max-width:1320px;margin:0 auto;padding:22px;margin-inline-start:230px;display:grid;gap:16px;overflow-x:hidden}
        .market-hero{position:relative;overflow:visible;border-radius:26px;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end;box-shadow:0 20px 60px rgba(3,18,37,.16);border:1px solid rgba(167,243,240,.24)}
        .market-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(167,243,240,.14);filter:blur(18px)}
        .market-hero-copy,.market-hero-card{position:relative;z-index:1}.market-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.28);background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}
        .market-hero h1{margin:0 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;font-weight:900}.market-hero p{max-width:760px;margin:0;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan)}.market-search-field{position:relative}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel label>div:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel label>div svg{color:var(--sfm-primary);flex-shrink:0}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:var(--sfm-card);color:var(--sfm-foreground);padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0;color:var(--sfm-foreground)}.market-search-panel input::placeholder{color:var(--sfm-muted);opacity:1}.market-search-panel select{cursor:pointer;box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel select option{color:var(--sfm-foreground);background:var(--sfm-card)}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-panel button svg{color:var(--sfm-primary-dark)}.market-search-panel button:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute;z-index:90;inset-inline:0;top:calc(100% + 12px);max-height:min(320px,48dvh);overflow-y:auto;background:var(--sfm-card);color:var(--sfm-foreground);border:1px solid rgba(29,140,255,.25);border-radius:14px;box-shadow:0 22px 60px rgba(3,18,37,.32);padding:10px;display:grid;gap:8px;overscroll-behavior:contain}.market-search-results strong{color:var(--sfm-primary-hover);font-size:12px;font-weight:900;padding:5px 7px}.market-search-results p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7;padding:12px}.market-search-results button{height:auto;min-height:58px;width:100%;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:12px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:start;box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(29,140,255,.10);border-color:rgba(29,140,255,.32);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-search-results button span{display:grid;gap:4px;min-width:0}.market-search-results button b{font-size:15px;color:var(--sfm-foreground);letter-spacing:.02em;direction:ltr;unicode-bidi:isolate}.market-search-results button em{font-style:normal;color:var(--sfm-midnight);font-size:13px;line-height:1.45;white-space:normal;overflow-wrap:anywhere}.market-search-results button small{color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.18);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;line-height:1.3;flex-shrink:0;white-space:nowrap}
        .market-search-field{z-index:70;min-width:0}.market-search-panel .market-search-input-shell{position:relative;z-index:2}.market-search-results{z-index:9999;top:calc(100% + 10px);max-height:min(360px,52dvh);overflow-y:auto;overflow-x:hidden;background:var(--sfm-card);border-color:rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;gap:6px}.market-search-results strong{padding:6px 8px;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-results p{border-radius:12px;background:rgba(29,140,255,.06);text-align:start}.market-search-results button{min-height:68px;display:grid;grid-template-columns:1fr;align-items:center;justify-items:stretch;gap:7px;padding:11px 12px;border-radius:14px;background:var(--sfm-light-card);border-color:rgba(29,140,255,.14);text-align:start;color:var(--sfm-foreground);box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(24,212,212,.10);border-color:rgba(47,214,192,.55);box-shadow:0 0 0 3px rgba(24,212,212,.16);outline:none}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:inherit;unicode-bidi:normal;letter-spacing:0;color:var(--sfm-foreground);font-size:14px}.market-search-results button em{flex-shrink:0;border-radius:999px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan);padding:4px 8px;font-style:normal;font-size:11px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;border:0;background:transparent;color:var(--sfm-muted);font-size:12px;line-height:1.55;text-align:start}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;box-shadow:0 24px 70px rgba(0,0,0,.42)}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.dark .market-search-results p{background:rgba(47,214,192,.08)}
        .market-search-field{position:relative;z-index:100;display:grid;gap:7px;min-width:0;overflow:visible}.market-search-field>label{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-combobox{position:relative;width:100%;overflow:visible}.market-search-panel .market-search-input-shell{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-submit{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-submit svg{color:var(--sfm-primary-dark)}.market-search-submit:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute!important;top:calc(100% + 10px)!important;right:0!important;left:0!important;z-index:9999!important;width:100%;max-height:min(320px,48dvh);overflow-y:auto!important;overflow-x:hidden!important;display:block!important;background:var(--sfm-card);border:1px solid rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;overscroll-behavior:contain}.market-search-results button{width:100%;min-height:68px;height:auto!important;display:grid!important;grid-template-columns:1fr!important;gap:7px;margin:0 0 6px;padding:11px 12px;border-radius:14px;text-align:start;cursor:pointer}.market-search-results button:last-of-type{margin-bottom:0}.market-search-results p{margin:0;padding:12px;border-radius:12px;text-align:start}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0;width:100%}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dark .market-search-panel .market-search-input-shell{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:var(--sfm-soft-cyan);line-height:1}.market-hero-card p{margin:0;font-size:13px}.market-hero-card em{font-style:normal;color:rgba(255,255,255,.78);font-size:12px;font-weight:900;line-height:1.5}.risk{justify-self:start;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.risk.low{background:#CCFBF1;color:#047857;border-color:rgba(15,118,110,.25)}.risk.medium{background:rgba(167,243,240,.18);color:var(--sfm-muted);border-color:rgba(167,243,240,.20)}.risk.high{background:#FEE2E2;color:#DC2626;border-color:rgba(220,38,38,.20)}.dark .risk.low{background:rgba(47,214,192,.12);color:#2FD6C0;border-color:rgba(47,214,192,.25)}.dark .risk.high{background:rgba(255,91,110,.12);color:#FF5B6E;border-color:rgba(255,91,110,.25)}
        .market-card-grid,.market-status-grid,.market-decision-grid,.market-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-status-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.market-decision-grid{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr)}.market-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-card,.market-panel,.market-disclaimer,.market-notice,.market-stock-header{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 6px 24px rgba(3,18,37,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:var(--sfm-foreground)}.change{display:inline-flex;align-items:center;gap:4px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.up:not(.change){color:#047857}.down:not(.change){color:#DC2626}.dark .change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.dark .up:not(.change){color:#2FD6C0}.dark .down:not(.change){color:#FF5B6E}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--sfm-muted);font-weight:900;background:var(--sfm-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px}.market-empty-detailed{display:grid;gap:10px;justify-items:center;text-align:center}.market-empty-detailed strong{color:var(--sfm-foreground);font-size:17px}.market-empty-detailed span{color:var(--sfm-muted);font-size:13px;line-height:1.6}.market-empty-detailed p{margin:0;max-width:680px;color:var(--sfm-muted);line-height:1.8}.market-empty-detailed button{border:0;border-radius:999px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:10px 16px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.market-notice button{border:0;border-radius:999px;background:var(--sfm-foreground);color:var(--sfm-card);padding:8px 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-notice button:disabled{opacity:.55;cursor:not-allowed}.market-suggestion-chips{flex-basis:100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.market-suggestion-chips small{color:var(--sfm-muted);font-size:12px;font-weight:950;line-height:1.4}.market-suggestion-chips button{background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.28);color:var(--sfm-primary-hover);min-height:34px;padding:0 12px}.market-suggestion-chips button:hover,.market-suggestion-chips button:focus-visible{outline:none;background:rgba(47,214,192,.18);border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.market-notice.success{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-notice.slow{color:#92400E;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22)}
        .market-stock-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}.market-stock-header h2{margin:8px 0 4px;color:var(--sfm-foreground);font-size:28px}.market-stock-header p{margin:0;color:var(--sfm-muted);font-weight:850}.stock-price-block{display:grid;justify-items:end;gap:5px;text-align:end}.stock-price-block strong{font-size:30px;color:var(--sfm-foreground);font-weight:950}.stock-price-block small{color:var(--sfm-muted);font-weight:850}.data-badge{display:inline-flex;width:max-content;border-radius:999px;border:1px solid rgba(29,140,255,.22);background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-size:11px;font-weight:950}.data-badge.delayed{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22);color:#B45309}.data-badge.unavailable{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.22);color:#B91C1C}
        .market-service{display:flex;align-items:center;gap:9px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:18px;padding:12px 14px;color:var(--sfm-muted);font-weight:900;box-shadow:0 6px 24px rgba(3,18,37,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.slow,.market-service.not_configured{color:#92400E;background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.20)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}.market-chart{grid-row:span 2}.market-panel{padding:20px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:var(--sfm-soft-cyan)}.market-section-head span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:var(--sfm-foreground);font-size:17px;font-weight:900;line-height:1.35}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.timeframe-row{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 12px}.timeframe-row button{border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:7px 11px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.timeframe-row button[aria-pressed="true"],.timeframe-row button:hover,.timeframe-row button:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.metric{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:13px;display:grid;gap:7px;min-width:0;align-content:start}.metric span{font-size:11px;color:var(--sfm-muted);font-weight:900;line-height:1.45}.metric strong{font-size:15px;color:var(--sfm-foreground);display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.45}.indicator-list,.scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fundamentals-empty{display:grid;gap:9px;background:var(--sfm-light-card);border:1px dashed rgba(167,243,240,.22);border-radius:18px;padding:16px;color:var(--sfm-muted);line-height:1.8}.fundamentals-empty svg{color:var(--sfm-soft-cyan)}.fundamentals-empty strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45}.fundamentals-empty p{margin:0;color:var(--sfm-muted);font-weight:850}.fundamentals-empty small{width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.25);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:5px 9px;font-weight:950;line-height:1.35}.asset-profile-card{margin:16px 0;display:grid;gap:0}.asset-profile-body{display:grid;gap:14px}.asset-profile-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid rgba(47,214,192,.18);background:rgba(47,214,192,.08);border-radius:18px;padding:15px}.asset-profile-header strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.35}.asset-profile-header p,.asset-profile-section p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.8}.asset-profile-badges{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.asset-profile-badges span{border:1px solid rgba(47,214,192,.24);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2}.asset-profile-section{display:grid;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:18px;padding:14px}.asset-profile-section h3{margin:0;display:flex;align-items:center;gap:7px;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.asset-profile-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.asset-profile-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:14px;padding:10px}.asset-profile-metric span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.asset-profile-metric strong{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}.asset-profile-link{min-height:58px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.10);border-radius:14px;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;text-decoration:none}.asset-profile-link:hover,.asset-profile-link:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.asset-profile-holdings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.asset-profile-holdings span{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:13px;padding:9px 10px;min-width:0}.asset-profile-holdings b{color:var(--sfm-foreground);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-profile-holdings em{color:var(--sfm-soft-cyan);font-size:11px;font-weight:950;font-style:normal;white-space:nowrap}.asset-profile-limitations ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.asset-profile-footer{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-muted);font-size:11px;font-weight:900}.asset-profile-footer span{border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.asset-profile-state{display:flex;align-items:center;gap:9px;border:1px dashed rgba(167,243,240,.22);background:var(--sfm-light-card);border-radius:16px;padding:14px;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.6}.asset-profile-state.error{border-color:rgba(239,68,68,.25);color:#B91C1C}.dark .asset-profile-state.error{color:#FF8A96}.asset-profile-pulse{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}.decision-body{display:grid;gap:13px}.decision-body b{font-size:25px;font-weight:900;color:var(--sfm-foreground);line-height:1.25}.decision-body p,.decision-body small,.decision-body strong{margin:0;color:var(--sfm-muted);line-height:1.9;font-weight:800;overflow-wrap:anywhere}.decision-body small{font-size:12px;color:var(--sfm-muted)}.decision-body strong{color:var(--sfm-muted)}.ai-summary-body{align-content:start}.ai-summary-intro{border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);border-radius:14px;padding:10px 12px;color:var(--sfm-foreground)!important;font-size:13px;line-height:1.75}.ai-summary-section{display:grid;gap:5px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:12px}.ai-summary-section b{font-size:13px;color:var(--sfm-foreground);font-weight:950}.ai-summary-section p{font-size:13px;line-height:1.75}.ai-summary-section ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.75}.ai-summary-loading{display:flex;align-items:center;gap:9px;color:var(--sfm-muted);font-size:13px;font-weight:950}.ai-summary-loading span{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}@keyframes marketPulse{50%{transform:scale(.72);opacity:.55}}.ai-summary-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ai-summary-actions small{flex:1;min-width:180px}.ai-regenerate{margin:0;width:max-content;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff}.risk-score{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:10px 12px}.risk-score span,.risk-score strong{font-size:12px!important;color:var(--sfm-foreground)!important;font-weight:950!important;line-height:1.3!important}.risk-score i{height:9px;border-radius:999px;background:rgba(29,140,255,.12);overflow:hidden}.risk-score i b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sfm-primary),#F59E0B,#EF4444)}.decision.ok{border-color:rgba(34,197,94,.22)}.decision.warn{border-color:rgba(167,243,240,.28)}.decision.danger{border-color:rgba(239,68,68,.22)}.levels-strip{margin-top:16px;display:grid;gap:10px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.6}.levels-strip i{position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,#22C55E,var(--sfm-soft-cyan),#EF4444);display:block}.levels-strip b{position:absolute;top:-4px;width:4px;height:18px;border-radius:999px;background:var(--sfm-foreground)}.levels-strip b.current{width:10px;height:10px;top:0;transform:translateX(-50%);background:#FFF;border:2px solid var(--sfm-foreground)}.tool-input,.alert-form{display:grid;gap:10px}.tool-input span{font-size:12px;font-weight:900;color:var(--sfm-muted);line-height:1.5}.tool-input input,.alert-form input,.alert-form select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;line-height:1.5}.market-currency-input{min-height:52px;display:flex;align-items:center;gap:9px;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 9px;transition:border-color .18s ease,box-shadow .18s ease;position:relative}.market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.tool-input .market-currency-input input{border:0;background:transparent;padding:0;box-shadow:none;flex:1;min-width:0}.tool-input .market-currency-input input::placeholder{color:var(--sfm-muted);opacity:1}.market-scenario-currency{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:7px}.market-scenario-currency>span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.2}.market-scenario-currency-trigger{min-width:62px;height:36px;border-radius:999px;border:1px solid rgba(15,118,110,.25);background:#CCFBF1;color:#0F766E;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-scenario-currency-trigger:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-scenario-currency-trigger b{direction:rtl;unicode-bidi:isolate;font-size:12px}.market-scenario-currency-trigger small{font-size:10px;line-height:1}.market-scenario-currency-menu{position:absolute;inset-inline-end:0;top:calc(100% + 8px);z-index:80;width:150px;max-height:260px;overflow:auto;border:1px solid rgba(47,214,192,.28);border-radius:14px;background:var(--sfm-card);box-shadow:0 18px 44px rgba(3,18,37,.22);padding:6px;display:grid;gap:5px}.market-scenario-currency-menu button{height:38px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--sfm-foreground);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-scenario-currency-menu button:hover,.market-scenario-currency-menu button:focus-visible,.market-scenario-currency-menu button[aria-selected="true"]{outline:none;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.28)}.market-scenario-currency-menu button span{color:var(--sfm-foreground);font-size:13px}.market-scenario-currency-menu button b{direction:ltr;unicode-bidi:isolate;color:var(--sfm-muted);font-size:11px}.dark .market-scenario-currency-trigger{border-color:rgba(47,214,192,.25);background:rgba(47,214,192,.12);color:#2FD6C0}.dark .market-scenario-currency-menu{background:#0f1d31;border-color:#1d3050;box-shadow:0 22px 56px rgba(0,0,0,.38)}.dark .market-scenario-currency-menu button:hover,.dark .market-scenario-currency-menu button:focus-visible,.dark .market-scenario-currency-menu button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.market-field-error{display:block;color:#B91C1C;font-size:12px;font-weight:900;line-height:1.55}.dark .market-field-error{color:#FF5B6E}.alert-form{grid-template-columns:minmax(0,1fr) 110px auto;align-items:stretch}.alert-form button,.inline-action,.report-button{border:0;border-radius:14px;background:var(--sfm-foreground);color:var(--sfm-card);padding:12px 14px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;line-height:1.45}.inline-action{margin-bottom:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.inline-action:disabled{opacity:.58;cursor:default}.saved-alerts,.asset-report{display:grid;gap:10px;margin-top:14px}.saved-alerts span,.asset-report p{margin:0;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:12px;padding:10px 11px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.65}.saved-alerts span{display:flex;align-items:center;justify-content:space-between;gap:9px}.saved-alerts span b{min-width:0;overflow-wrap:anywhere}.saved-alerts button{border:0;background:transparent;color:var(--sfm-muted);cursor:pointer;display:inline-flex;padding:2px}.asset-report small{color:var(--sfm-muted);line-height:1.75;font-weight:800;display:block}
        .ai-summary-compact{display:grid;gap:10px;align-content:start}.ai-summary-compact small{color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.7}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:var(--sfm-muted);line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:var(--sfm-muted);font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span,.watchlist>button{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);padding:7px 11px;color:var(--sfm-muted);font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:6px}.watchlist button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:var(--sfm-muted)}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));display:block}.compare-table{margin-top:14px;overflow-x:auto;display:grid;gap:7px}.compare-table>div{display:grid;grid-template-columns:60px 90px 70px 52px 76px 80px;gap:7px;min-width:470px}.compare-table b,.compare-table span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.compare-table b{color:var(--sfm-muted)}
        .market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:16px;color:var(--sfm-muted)}.market-disclaimer strong{display:block;color:var(--sfm-foreground);margin-bottom:4px}.market-disclaimer p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.7;font-weight:800}
        @media(max-width:1180px){.market-card-grid,.market-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid,.market-decision-grid,.market-tools-grid{grid-template-columns:1fr}.market-chart{grid-row:auto}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{margin-inline-start:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px;max-width:100%}}
        @media(max-width:720px){.market-main{padding-inline:14px}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-status-grid,.market-stat-row,.indicator-list,.scenario-grid,.alert-form{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-search-results{max-height:min(300px,42dvh);top:calc(100% + 10px);border-radius:16px}.market-search-results button{min-height:68px;align-items:flex-start}.market-search-results button small{white-space:normal;text-align:end}.market-hero-card strong{font-size:36px}.market-stock-header{display:grid;gap:14px}.stock-price-block{justify-items:start;text-align:start}.market-panel,.market-card,.market-stock-header{border-radius:18px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}}
        @media(max-width:720px){.market-search-results{width:100%;max-height:min(320px,48dvh)}.market-search-results button{align-items:stretch}.market-search-results button small{white-space:nowrap;text-align:start}.market-search-result-main{gap:10px}.market-search-results button b{font-size:13px}}
      `}</style>
    </div>
  );
}

function MarketMetric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{icon}{value}</strong>
    </div>
  );
}
