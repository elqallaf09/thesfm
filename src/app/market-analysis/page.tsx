'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Brain, CalendarDays, Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, FileText, Gauge, Info, Landmark, LineChart, Newspaper, Percent, PieChart, Plus, RefreshCw, Search, ShieldAlert, ShoppingCart, Sparkles, Star, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { PageTabs } from '@/components/layout/PageTabs';
import { AssetProfileCard } from '@/components/market/AssetProfileCard';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { currencyDisplaySymbol, getCurrency } from '@/lib/currencies';
import { formatCurrency } from '@/lib/locale';
import { useCurrency } from '@/lib/useCurrency';
import { generateEducationalMarketSummary, type EducationalSummaryLanguage } from '@/lib/market/generateEducationalMarketSummary';
import { formatMarketPrice, marketCurrencyLabel, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { normalizeEconomicEvents, type EconomicImpact, type NormalizedEconomicEvent } from '@/lib/market/normalizeEconomicEvents';
import type { AssetProfileResponse } from '@/lib/market/fetchAssetProfile';
import type { MarketAiInsight, MarketAnalysis, MarketAssetType, MarketHistoryPoint, MarketResult, MarketSearchItem, MarketTrend } from '@/lib/market/marketService';
import { marketSymbolSuggestions, normalizeAssetType, normalizeMarketSymbolInput, validateSymbol } from '@/lib/market/marketService';
import { calculateLotSizeByRisk, calculatePips, calculatePositionSize, type TradeDirection, type TradingInstrumentType } from '@/lib/trading/calculators';
import { getActiveOverlapIds, getTradingSessionsState, isHighLiquidityPeriod, TRADING_OVERLAPS } from '@/lib/trading/sessions';

// ── Local types (extracted to components/market-analysis/types.ts) ──────────
import type {
  AlertType, ApiListState, MarketAiInsightView, MarketAssetFilter, MarketChartType,
  MarketPerformanceItem, MarketResultWithMeta, MarketSearchSuggestion, MarketSearchResponse,
  MarketServiceState, MarketTab, MarketTimeframe, MarketViewAnalysis, PipCalculatorAsset,
  PipCalculatorAssetType, PortfolioInvestment, SavedAlert, ScenarioCurrencyCode,
  AccountCurrencyCode, SelectedMarketAsset, TechnicalState, TechnicalSymbolCategory,
  TechnicalSymbolOption, TraderToolsSubTab, WatchlistItem,
} from '@/components/market-analysis/types';

// ── Local utils (extracted to components/market-analysis/utils.ts) ────────
import {
  WATCHLIST_STORAGE_KEY, ALERTS_STORAGE_KEY, DEFAULT_MARKET_TYPE, DEFAULT_MARKET_ASSET_FILTER,
  MARKET_REQUEST_TIMEOUT_MS, MARKET_SLOW_NOTICE_MS, MARKET_TIMEFRAMES, MARKET_CHART_TYPES,
  MARKET_CHART_TYPE_STORAGE_KEY, MARKET_TOOL_REQUEST_TIMEOUT_MS,
  QUICK_MARKET_EXAMPLES, TECHNICAL_SYMBOL_CATEGORIES, TECHNICAL_SYMBOL_GROUPS,
  TECHNICAL_SYMBOL_OPTIONS, TECHNICAL_SYMBOL_FAVORITES_KEY,
  DEFAULT_PIP_CALCULATOR_ASSET, PIP_CALCULATOR_ASSET_TYPES, PIP_CALCULATOR_ASSETS,
  SCENARIO_CURRENCY_OPTIONS, ACCOUNT_CURRENCY_OPTIONS,
  money, percent, normalizePerformanceTrend, getTechnicalSymbolOption, compactTechnicalSymbol,
  getTechnicalSymbolCategory, technicalSymbolDescription, technicalSymbolAssetType,
  formatTechnicalSymbol, normalizeTechnicalSymbolInput, formatTechnicalTimestamp,
  formatNumber, sanitizeMarketToolMessage, isAbortLikeError, marketToolFailureState,
  logMarketToolPerformance, normalizeSummaryLanguage, distancePercent, levelMarkerPercent,
  readableLevelMarkerPercent, parseNumber, hasDisplayValue, finiteTechnicalNumber,
  formatTechnicalNumberValue, formatTechnicalPrice, technicalTrendLabelKey,
  technicalRsiStatusKey, technicalSignalStrength, formatFundamentalValue,
  assetTypeTranslationKey, fundamentalsReasonTranslationKey, cleanSearchText,
  normalizeSearchComparable, compactSearchComparable, normalizeSearchSymbol,
  marketSearchMatchRank, normalizeAssetSearchResult, normalizeSearchItems,
  findExactSearchMatch, normalizeSearchItem, suggestionToMarketItem,
  normalizeErrorSuggestions, suggestionButtonLabel, normalizePublicMarketErrorCode,
  canAnalyzeDirectNormalizedInput, hasUsableAnalysis, historyFromPricePoints,
  normalizeChartType, hasCompleteOhlc, pipAssetTypeTranslationKey, pipAssetName,
  getPipCalculatorAsset, pipCalculatorWarningKey, technicalEmptyStateCopy,
  fetchMarketToolState,
} from '@/components/market-analysis/utils';

// ── Extracted panel components ─────────────────────────────────────────────
import { TraderToolsDashboard } from '@/components/market-analysis/TraderToolsDashboard';
import { EconomicCalendarPanel, LegacyEconomicCalendarPanel } from '@/components/market-analysis/EconomicCalendarPanel';
import { MarketDataPanel, TradingSessionsPanel } from '@/components/market-analysis/TradingSessionsPanel';
import { LegacyTechnicalAnalysisPanel, TechnicalAnalysisPanel, MarketDefaultDashboard, MarketEmptyState, MarketStatusCard, MarketStatusBanner } from '@/components/market-analysis/TechnicalAnalysisPanel';
import { NewsSentimentPanel, MarketSectionRefreshButton, MarketSectionLoading } from '@/components/market-analysis/NewsSentimentPanel';
import { MarketAsyncToolStyles } from '@/components/market-analysis/MarketStyles';
import { PriceHistoryChart, MarketMetric, PortfolioComparisonMetric } from '@/components/market-analysis/MarketChartComponents';

export default function MarketAnalysisPage() {
  const { dir, lang, t } = useLanguage();
  const { currency: userCurrency } = useCurrency();
  const currentUserProfile = useCurrentUserProfile();
  const { user, isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [assetType, setAssetType] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [analysis, setAnalysis] = useState<MarketViewAnalysis | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedMarketAsset | null>(null);
  const [searchResults, setSearchResults] = useState<MarketSearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);
  const searchRequestIdRef = useRef(0);
  const [suggestedAssets, setSuggestedAssets] = useState<MarketSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioInvestment[]>([]);
  const [compare, setCompare] = useState<MarketAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<MarketAiInsightView | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiInsightLoadingRef = useRef(false);
  const aiQuotaExceededRef = useRef(false);
  const [assetProfile, setAssetProfile] = useState<AssetProfileResponse | null>(null);
  const [assetProfileLoading, setAssetProfileLoading] = useState(false);
  const [assetProfileError, setAssetProfileError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState<MarketSearchSuggestion[]>([]);
  const [notice, setNotice] = useState('');
  const [serviceState, setServiceState] = useState<MarketServiceState>('checking');
  const [timeframe, setTimeframe] = useState<MarketTimeframe>('1D');
  const [chartType, setChartType] = useState<MarketChartType>('area');
  const [chartHistory, setChartHistory] = useState<MarketHistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartMessage, setChartMessage] = useState('');
  const [chartMeta, setChartMeta] = useState<{ interval?: string; source?: string; updatedAt?: string }>({});
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
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
  const [sentimentHealthLoading, setSentimentHealthLoading] = useState(false);
  const newsSentimentLoadedRef = useRef<Record<'news' | 'sentiment', boolean>>({ news: false, sentiment: false });
  const newsSentimentLoadingRef = useRef<Record<'news' | 'sentiment', boolean>>({ news: false, sentiment: false });
  const newsSentimentSymbolRef = useRef('');
  const [technicalSymbol, setTechnicalSymbol] = useState('EURUSD');
  const [technicalState, setTechnicalState] = useState<TechnicalState>({ loading: false, data: null, message: '' });
  const [technicalRefreshKey, setTechnicalRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadPerformance = useCallback(() => {
    setPerformance(prev => ({ ...prev, loading: true, message: '', code: undefined }));
    void fetchMarketToolState<MarketPerformanceItem>('/api/market/performance', 'asset-performance').then(setPerformance);
  }, []);

  const loadEconomicCalendar = useCallback(() => {
    setEconomicCalendar(prev => ({ ...prev, loading: true, message: '', code: undefined }));
    void fetchMarketToolState<Record<string, any>>('/api/market/economic-calendar', 'economic-calendar').then(setEconomicCalendar);
  }, []);

  const selectedSentimentSymbol = useMemo(() => (selectedAsset?.symbol ?? '').trim(), [selectedAsset]);
  const selectedSentimentProviderSymbol = useMemo(() => (selectedAsset?.providerSymbol ?? '').trim(), [selectedAsset]);
  const selectedSentimentAssetType = selectedAsset?.assetType;
  const selectedSentimentRequestKey = useMemo(() => {
    if (!selectedSentimentSymbol || !selectedSentimentAssetType) return '';
    return [
      selectedSentimentSymbol,
      selectedSentimentProviderSymbol,
      selectedSentimentAssetType,
    ].join('|').toUpperCase();
  }, [selectedSentimentAssetType, selectedSentimentProviderSymbol, selectedSentimentSymbol]);
  const selectedSentimentAsset = useMemo<SelectedMarketAsset | null>(() => {
    if (!selectedSentimentSymbol || !selectedSentimentAssetType) return null;
    return {
      symbol: selectedSentimentSymbol,
      providerSymbol: selectedSentimentProviderSymbol || undefined,
      assetType: selectedSentimentAssetType,
      name: selectedAsset?.name,
      exchange: selectedAsset?.exchange,
    };
  }, [selectedAsset?.exchange, selectedAsset?.name, selectedSentimentAssetType, selectedSentimentProviderSymbol, selectedSentimentSymbol]);

  const loadNewsSentiment = useCallback((targets: Array<'news' | 'sentiment'> = ['news', 'sentiment'], options: { force?: boolean } = {}) => {
    const requestedTargets = [...new Set(targets)];

    if (requestedTargets.includes('sentiment') && !selectedSentimentRequestKey) {
      newsSentimentLoadingRef.current.sentiment = false;
      newsSentimentSymbolRef.current = '';
      setMarketSentiment({
        loading: false,
        items: [],
        message: t('market_sentiment_symbol_required_body'),
        code: 'NO_SELECTED_ASSET',
      });
    }

    const uniqueTargets = requestedTargets.filter(target => {
      if (target === 'sentiment' && !selectedSentimentRequestKey) return false;
      if (options.force) return !newsSentimentLoadingRef.current[target];
      if (target === 'sentiment' && selectedSentimentRequestKey !== newsSentimentSymbolRef.current) {
        return !newsSentimentLoadingRef.current[target];
      }
      return !newsSentimentLoadedRef.current[target] && !newsSentimentLoadingRef.current[target];
    });

    if (uniqueTargets.length === 0) return;

    if (uniqueTargets.includes('news')) {
      newsSentimentLoadingRef.current.news = true;
      if (options.force) newsSentimentLoadedRef.current.news = false;
      setCentralBankNews(prev => ({ ...prev, loading: true, message: '', code: undefined }));
    }
    if (uniqueTargets.includes('sentiment')) {
      newsSentimentLoadingRef.current.sentiment = true;
      if (options.force) newsSentimentLoadedRef.current.sentiment = false;
      setMarketSentiment(prev => ({ ...prev, loading: true, message: '', code: undefined }));
    }

    const refreshKey = options.force ? Date.now() : null;
    const requests = uniqueTargets.map(target => {
      const newsUrl = refreshKey
        ? `/api/market/central-bank-news?refresh=${refreshKey}`
        : '/api/market/central-bank-news';
      const sentimentParams = new URLSearchParams();
      if (refreshKey) sentimentParams.set('refresh', String(refreshKey));
      if (selectedSentimentSymbol) sentimentParams.set('symbol', selectedSentimentSymbol);
      if (selectedSentimentProviderSymbol) sentimentParams.set('providerSymbol', selectedSentimentProviderSymbol);
      if (selectedSentimentAssetType) sentimentParams.set('assetType', selectedSentimentAssetType);
      const sentimentQuery = sentimentParams.toString();
      const sentimentUrl = `/api/market/sentiment${sentimentQuery ? `?${sentimentQuery}` : ''}`;
      if (process.env.NODE_ENV === 'development' && target === 'sentiment') {
        console.info('[market-sentiment] frontend request', {
          route: '/api/market/sentiment',
          symbol: selectedSentimentSymbol,
          providerSymbol: selectedSentimentProviderSymbol || null,
          assetType: selectedSentimentAssetType,
          force: Boolean(options.force),
        });
      }
      return {
        target,
        request: target === 'news'
          ? fetchMarketToolState<Record<string, any>>(newsUrl, 'central-bank-news')
          : fetchMarketToolState<Record<string, any>>(sentimentUrl, 'market-sentiment'),
      };
    });

    void Promise.allSettled(requests.map(item => item.request)).then(results => {
      results.forEach((result, index) => {
        const target = requests[index]?.target;
        const nextState = result.status === 'fulfilled'
          ? result.value
          : marketToolFailureState<Record<string, any>>(result.reason);
        if (target === 'news') setCentralBankNews(nextState);
        if (target === 'sentiment') {
          setMarketSentiment(nextState);
          newsSentimentSymbolRef.current = selectedSentimentRequestKey;
        }
        if (target) {
          newsSentimentLoadedRef.current[target] = true;
          newsSentimentLoadingRef.current[target] = false;
        }
      });
    });
  }, [selectedSentimentAssetType, selectedSentimentProviderSymbol, selectedSentimentRequestKey, selectedSentimentSymbol, t]);

  const checkMyfxbookHealth = useCallback(() => {
    setSentimentHealthLoading(true);
    void (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), MARKET_TOOL_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch('/api/market/sentiment/health', { cache: 'no-store', signal: controller.signal });
        const payload = await response.json().catch(() => ({})) as {
          loginStatus?: string;
          message?: string;
          lastCheckedAt?: string;
          providerMessage?: string | null;
        };
        const loginStatus = String(payload.loginStatus ?? '').trim().toLowerCase();
        const providerStatus = loginStatus === 'success'
          ? 'connected'
          : loginStatus === 'timeout'
            ? 'timeout'
          : loginStatus === 'rate_limited'
            ? 'limited'
            : loginStatus === 'missing_env'
              ? 'needs_setup'
              : 'unavailable';
        const codeMap: Record<string, string | undefined> = {
          success: undefined,
          timeout: 'TIMEOUT',
          missing_env: 'MISSING_CREDENTIALS',
          invalid_credentials: 'LOGIN_REJECTED',
          html_response: 'HTML_RESPONSE',
          cloudflare_blocked: 'CLOUDFLARE_BLOCKED',
          rate_limited: 'RATE_LIMIT',
          provider_unavailable: 'PROVIDER_DOWN',
          unknown_error: 'PROVIDER_DOWN',
        };
        setMarketSentiment(prev => ({
          ...prev,
          loading: false,
          provider: 'myfxbook',
          source: 'Myfxbook',
          providerStatus,
          code: codeMap[loginStatus],
          message: loginStatus === 'success' ? '' : String(payload.message ?? t('market_sentiment_myfxbook_provider_failed_body')),
          providerMessage: payload.providerMessage ?? null,
          lastCheckedAt: payload.lastCheckedAt ?? new Date().toISOString(),
          checkedAt: payload.lastCheckedAt ?? new Date().toISOString(),
        }));
      } catch (error) {
        const checkedAt = new Date().toISOString();
        const timedOut = isAbortLikeError(error);
        setMarketSentiment(prev => ({
          ...prev,
          loading: false,
          provider: 'myfxbook',
          source: 'Myfxbook',
          providerStatus: timedOut ? 'timeout' : 'unavailable',
          code: timedOut ? 'TIMEOUT' : 'PROVIDER_DOWN',
          message: timedOut ? t('market_sentiment_timeout_body') : t('market_sentiment_myfxbook_provider_failed_body'),
          lastCheckedAt: checkedAt,
          checkedAt,
        }));
      } finally {
        window.clearTimeout(timeoutId);
        setSentimentHealthLoading(false);
      }
    })();
  }, [t]);

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
    if (activeTab !== 'traderTools' || traderToolTab !== 'performance' || performance.loading || performance.items.length > 0 || performance.message || performance.code) return;
    loadPerformance();
  }, [activeTab, loadPerformance, performance.code, performance.items.length, performance.loading, performance.message, traderToolTab]);

  useEffect(() => {
    if (activeTab !== 'economicCalendar' || economicCalendar.loading || economicCalendar.items.length > 0 || economicCalendar.message || economicCalendar.code) return;
    loadEconomicCalendar();
  }, [activeTab, economicCalendar.code, economicCalendar.items.length, economicCalendar.loading, economicCalendar.message, loadEconomicCalendar]);

  useEffect(() => {
    if (activeTab !== 'newsSentiment') return;
    loadNewsSentiment();
  }, [activeTab, loadNewsSentiment]);

  useEffect(() => {
    if (activeTab !== 'technicalAnalysis' || !selectedAsset) return;
    const symbol = compactTechnicalSymbol(technicalSymbol);
    if (!symbol) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MARKET_TOOL_REQUEST_TIMEOUT_MS);
    const startedAt = globalThis.performance.now();
    const assetType = technicalSymbolAssetType(symbol);
    const normalizedInput = normalizeMarketSymbolInput(symbol, assetType);
    const providerSymbol = normalizedInput.valid ? normalizedInput.providerSymbol : symbol;
    const params = new URLSearchParams({
      symbol,
      assetType,
      interval: '1d',
    });
    if (providerSymbol && providerSymbol !== symbol) {
      params.set('providerSymbol', providerSymbol);
    }
    setTechnicalState({ loading: true, data: null, message: '', symbol });
    fetch(`/api/market/technical-analysis?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const isSuccess = response.ok && payload.success;
        logMarketToolPerformance('technical-analysis', startedAt, {
          status: response.status,
          code: typeof payload.code === 'string' ? payload.code : '',
          symbol,
          success: isSuccess,
        });
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
        logMarketToolPerformance('technical-analysis', startedAt, {
          status: 'failed',
          code: isAbortLikeError(error) ? 'MARKET_DATA_TIMEOUT' : 'MARKET_DATA_UNAVAILABLE',
          symbol,
        });
        if (!cancelled) {
          setTechnicalState({
            loading: false,
            data: null,
            message: isAbortLikeError(error) ? '' : error instanceof Error ? error.message : t('market_technical_no_data'),
            code: isAbortLikeError(error) ? 'MARKET_DATA_TIMEOUT' : 'MARKET_DATA_UNAVAILABLE',
            symbol,
          });
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, selectedAsset, technicalRefreshKey, technicalSymbol, t]);

  const applyTechnicalAsset = useCallback((input: string) => {
    const normalized = normalizeTechnicalSymbolInput(input);
    if (!normalized.valid) {
      setTechnicalState({
        loading: false,
        data: null,
        message: normalized.code === 'symbol_required' ? t('market_technical_symbol_required_body') : t('market_technical_unsupported_symbol_body'),
        code: normalized.code === 'symbol_required' ? 'SYMBOL_REQUIRED' : 'UNSUPPORTED_SYMBOL',
        symbol: compactTechnicalSymbol(input),
      });
      return false;
    }

    setTechnicalSymbol(normalized.symbol);
    setSelectedAsset({
      symbol: normalized.displaySymbol,
      providerSymbol: normalized.providerSymbol,
      name: normalized.name,
      assetType: normalized.assetType,
      exchange: normalized.assetType === 'forex'
        ? 'FX'
        : normalized.assetType === 'crypto'
          ? 'Crypto'
          : normalized.assetType === 'gold'
            ? 'COMEX'
            : undefined,
    });
    setTechnicalRefreshKey(value => value + 1);
    return true;
  }, [t]);

  const baseScenarioCurrency = normalizeScenarioCurrency(
    userCurrency && userCurrency !== 'KWD' ? userCurrency : currentUserProfile.defaultCurrency || userCurrency,
  );

  useEffect(() => {
    if (!scenarioCurrencyTouched) {
      setScenarioCurrency(baseScenarioCurrency);
    }
  }, [baseScenarioCurrency, scenarioCurrencyTouched]);

  const requestAiInsight = useCallback(async (marketData: MarketAnalysis, options?: { force?: boolean }) => {
    if (aiInsightLoadingRef.current) return;
    if (!hasUsableAnalysis(marketData)) {
      setAiInsight({ status: 'skipped', error: t('market_no_real_data_ai') });
      return;
    }
    if (aiQuotaExceededRef.current && !options?.force) {
      setAiInsight({
        status: 'unavailable',
        provider: 'rule-based',
        error: t('market_ai_quota_exceeded'),
      });
      return;
    }
    aiInsightLoadingRef.current = true;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const result = await fetchJsonWithTimeout<{ ok?: boolean; success?: boolean; code?: string; insight?: MarketAiInsightView | null; updated_at?: string | null }>('/api/market/ai-insight', 12000, true, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketData, language: lang }),
      });
      if (result.success && result.insight?.status === 'ready') {
        aiQuotaExceededRef.current = false;
        setAiInsight(result.insight);
      } else {
        if (String(result.code ?? '').toUpperCase() === 'AI_PROVIDER_QUOTA_EXCEEDED') {
          aiQuotaExceededRef.current = true;
        }
        setAiInsight({
          status: 'unavailable',
          provider: 'rule-based',
          error: marketAiInsightErrorText(result.code, t),
        });
      }
    } catch {
      setAiInsight({
        status: 'unavailable',
        provider: 'rule-based',
        error: t('market_ai_provider_unavailable_clean'),
      });
    } finally {
      aiInsightLoadingRef.current = false;
      setAiLoading(false);
    }
  }, [lang, t]);

  const requestAnalysis = useCallback(async (symbolInput: string, typeInput: MarketAssetFilter, selectedInput?: Partial<SelectedMarketAsset>) => {
    const normalizedInput = normalizeMarketSymbolInput(selectedInput?.providerSymbol ?? symbolInput, typeInput);
    if (!normalizedInput.valid) {
      const suggestions = normalizedInput.suggestions.length ? normalizedInput.suggestions : marketSymbolSuggestions(symbolInput);
      setError(invalidSymbolMessage(t, normalizedInput.correction));
      setErrorSuggestions(normalizeErrorSuggestions(suggestions, symbolInput));
      setSelectedAsset(null);
      setAnalysis(null);
      setChartHistory([]);
      setAiInsight(null);
      setServiceState(current => current === 'checking' ? 'connected' : current);
      setLoading(false);
      return;
    }
    const displaySymbol = validateSymbol(selectedInput?.symbol ?? normalizedInput.displaySymbol ?? symbolInput);
    const requestSymbol = normalizeProviderSymbolForRequest(String(selectedInput?.providerSymbol ?? normalizedInput.providerSymbol));
    if (!requestSymbol || !displaySymbol) {
      setError(invalidSymbolMessage(t, normalizedInput.correction));
      setErrorSuggestions(normalizeErrorSuggestions(normalizedInput.suggestions, symbolInput));
      setSelectedAsset(null);
      setAnalysis(null);
      setChartHistory([]);
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
    setChartHistory([]);
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
      country: selectedInput?.country,
      currency: resolveMarketCurrency({
        providerCurrency: selectedInput?.currency,
        symbol: displaySymbol,
        providerSymbol: selectedInput?.providerSymbol ?? requestSymbol,
        exchange: selectedInput?.exchange,
        country: selectedInput?.country,
        assetType: normalizeAssetType(selectedInput?.assetType ?? normalizedType),
      }).currency,
    };
    setQuery(displaySymbol);
    try {
      const params = new URLSearchParams({
        symbol: requestSymbol,
        assetType: normalizedType,
        displaySymbol: selectedMeta.symbol,
      });
      if (selectedMeta.name) params.set('name', selectedMeta.name);
      if (selectedMeta.exchange) params.set('exchange', selectedMeta.exchange);
      if (selectedMeta.country) params.set('country', selectedMeta.country);
      if (selectedMeta.currency) params.set('currency', selectedMeta.currency);
      let result: MarketResultWithMeta | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          setNotice(attempt === 0 ? t('market_progress_loading_symbol') : t('market_service_waking'));
          result = await fetchJsonWithTimeout<MarketResultWithMeta>(`/api/market/analyze?${params.toString()}`, MARKET_REQUEST_TIMEOUT_MS, true);
          const retryableCode = !result.success && ['TIMEOUT', 'PROVIDER_DOWN'].includes(normalizePublicMarketErrorCode(result.code));
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
      if (!result.success) {
        const publicCode = normalizePublicMarketErrorCode(result.code);
        const symbolIssue = publicCode === 'INVALID_SYMBOL';
        setServiceState(symbolIssue ? 'connected' : result.openbbService === 'degraded' || result.openbbService === 'slow' ? 'degraded' : result.openbbService === 'not_configured' ? 'not_configured' : 'unavailable');
        const suggestions = result.suggestions?.length ? result.suggestions : symbolIssue ? normalizedInput.suggestions : [];
        setSelectedAsset(symbolIssue ? null : selectedMeta);
        setErrorSuggestions(normalizeErrorSuggestions(suggestions, symbolInput));
        setAiInsight({ status: 'skipped', error: t('market_no_real_data_ai') });
        throw new Error(symbolIssue ? marketErrorText(publicCode, result.message || result.error || t('market_analysis_unavailable'), t) : marketErrorText(publicCode, result.message || result.error || t('market_analysis_unavailable'), t));
      }

      if (hasUsableAnalysis(result)) {
        setNotice(t('market_progress_preparing_analysis'));
        setTimeframe('1D');
        setChartMessage('');
        setChartMeta({});
        const nextAnalysis = {
          ...result,
          symbol: selectedMeta.symbol,
          providerSymbol: result.providerSymbol ?? selectedMeta.providerSymbol,
          name: selectedMeta.name ?? result.name,
          exchange: result.exchange ?? selectedMeta.exchange,
          country: result.country ?? selectedMeta.country,
          currency: result.currency ?? selectedMeta.currency,
          assetType: normalizedType,
        };
        setChartHistory(Array.isArray(nextAnalysis.history) ? nextAnalysis.history : []);
        setAnalysis(nextAnalysis);
        setSelectedAsset({
          symbol: nextAnalysis.symbol,
          providerSymbol: nextAnalysis.providerSymbol ?? selectedMeta.providerSymbol,
          name: nextAnalysis.name ?? selectedMeta.name,
          assetType: nextAnalysis.assetType,
          exchange: nextAnalysis.exchange ?? selectedMeta.exchange,
          country: nextAnalysis.country ?? selectedMeta.country,
          currency: nextAnalysis.currency ?? selectedMeta.currency,
        });
        setWatchlist(previous => previous.map(item => item.symbol === selectedMeta.symbol && item.assetType === selectedMeta.assetType
          ? {
            ...item,
            providerSymbol: nextAnalysis.providerSymbol ?? item.providerSymbol ?? selectedMeta.providerSymbol,
            currency: nextAnalysis.currency ?? item.currency ?? selectedMeta.currency,
            exchange: nextAnalysis.exchange ?? item.exchange ?? selectedMeta.exchange,
            country: nextAnalysis.country ?? item.country ?? selectedMeta.country,
          }
          : item));
        if (user && !isGuest) {
          void supabase
            .from('market_watchlist')
            .update({
              provider_symbol: nextAnalysis.providerSymbol ?? selectedMeta.providerSymbol ?? selectedMeta.symbol,
              currency: nextAnalysis.currency ?? selectedMeta.currency ?? null,
              exchange: nextAnalysis.exchange ?? selectedMeta.exchange ?? null,
              country: nextAnalysis.country ?? selectedMeta.country ?? null,
            })
            .eq('user_id', user.id)
            .eq('symbol', selectedMeta.symbol)
            .eq('asset_type', selectedMeta.assetType);
        }
        void requestAiInsight(nextAnalysis);
        if (result.cached) setNotice(t('market_cached_data'));
      } else {
        setAnalysis(null);
        setChartHistory([]);
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
      setChartHistory([]);
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
  }, [isGuest, requestAiInsight, t, user]);

  const historySymbol = analysis?.symbol ?? '';
  const historyProviderSymbol = analysis?.providerSymbol ?? historySymbol;
  const historyAssetType = analysis?.assetType ?? DEFAULT_MARKET_TYPE;

  useEffect(() => {
    try {
      setChartType(normalizeChartType(window.localStorage.getItem(MARKET_CHART_TYPE_STORAGE_KEY)));
    } catch {
      setChartType('area');
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MARKET_CHART_TYPE_STORAGE_KEY, chartType);
    } catch {
      // Ignore storage failures; the chart still works with the in-memory selection.
    }
  }, [chartType]);

  const loadHistory = useCallback((nextTimeframe: MarketTimeframe) => {
    setChartHistory([]);
    setChartMessage('');
    setChartMeta({});
    setTimeframe(nextTimeframe);
    setChartRefreshKey(value => value + 1);
  }, []);

  useEffect(() => {
    if (!historySymbol) {
      setChartLoading(false);
      setChartMessage('');
      setChartMeta({});
      setChartHistory([]);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      symbol: historySymbol,
      providerSymbol: historyProviderSymbol,
      assetType: historyAssetType,
      range: timeframe,
    });

    setChartLoading(true);
    setChartMessage('');
    setChartMeta({});
    setChartHistory([]);

    async function fetchHistory() {
      try {
        const result = await fetchJsonWithTimeout<PriceHistoryResponse>(`/api/market/history?${params.toString()}`, MARKET_REQUEST_TIMEOUT_MS, true);
        if (cancelled) return;
        const points = Array.isArray(result.points) ? result.points : [];
        const nextHistory = points.length > 0
          ? historyFromPricePoints(points)
          : Array.isArray(result.history) ? result.history : [];
        if (!result.success || nextHistory.length === 0) {
          setChartHistory([]);
          setChartMessage(chartErrorText(result.code, result.error, t));
          setChartMeta({
            interval: result.interval,
            source: result.source,
            updatedAt: result.updated_at,
          });
          return;
        }
        setChartHistory(nextHistory);
        setAnalysis(current => {
          if (!current) return current;
          if ((current.providerSymbol ?? current.symbol) !== historyProviderSymbol || current.assetType !== historyAssetType) return current;
          return {
            ...current,
            history: nextHistory,
            cached: current.cached || result.cached,
            dataStatus: result.cached ? 'delayed' : current.dataStatus,
          };
        });
        setChartMessage('');
        setChartMeta({
          interval: result.interval,
          source: result.source,
          updatedAt: result.updated_at,
        });
        if (result.cached) setNotice(t('market_cached_data'));
      } catch {
        if (!cancelled) {
          setChartHistory([]);
          setChartMessage(t('market_chart_provider_error'));
          setChartMeta({});
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [chartRefreshKey, historyAssetType, historyProviderSymbol, historySymbol, timeframe, t]);

  useEffect(() => {
    const cleanQuery = query.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    if (cleanQuery.length < 2) {
      setSearchResults([]);
      setSearchMessage('');
      setSearchLoading(false);
      setHighlightedSearchIndex(0);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchResults([]);
    setSearchMessage('');
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: cleanQuery });
        if (assetType !== 'all') params.set('assetType', assetType);
        const data = await fetchJsonWithTimeout<MarketSearchResponse>(`/api/market/search?${params.toString()}`, 8000, true);
        if (cancelled || searchRequestIdRef.current !== requestId) return;
        const responseItems = [
          ...(data.resolved ? [data.resolved] : []),
          ...(data.results ?? []),
          ...normalizeErrorSuggestions(data.suggestions, cleanQuery, false),
        ];
        const results = normalizeSearchItems(responseItems, cleanQuery, assetType);
        setSearchResults(results);
        setHighlightedSearchIndex(0);
        setSearchMessage(results.length === 0 ? marketErrorText(data.code, data.message || data.error || t('market_symbol_not_found_helpful'), t) : '');
      } catch {
        if (!cancelled && searchRequestIdRef.current === requestId) {
          setSearchResults([]);
          setHighlightedSearchIndex(0);
          setSearchMessage(t('market_symbol_not_found_helpful'));
        }
      } finally {
        if (!cancelled && searchRequestIdRef.current === requestId) setSearchLoading(false);
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
          .select('id, symbol, provider_symbol, asset_type, name, currency, exchange, country, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('market_price_alerts')
          .select('id, symbol, asset_type, alert_type, threshold, currency, exchange, country, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('investment_items')
          .select('id, name, amount, current_value, current_market_value, converted_market_value, native_market_value, native_currency, price_currency, currency, created_at, ai_analysis')
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
        provider_symbol: item.providerSymbol ?? item.symbol,
        asset_type: item.assetType,
        name: item.name ?? item.symbol,
        currency: item.currency ?? null,
        exchange: item.exchange ?? null,
        country: item.country ?? null,
      }, { onConflict: 'user_id,symbol,asset_type' })
      .select('id, symbol, provider_symbol, asset_type, name, currency, exchange, country, created_at')
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

    const alertCurrency = analysis.currency ?? analysis.quote?.currency ?? selectedAsset?.currency ?? null;
    const payload: SavedAlert = {
      symbol: analysis.symbol,
      assetType: analysis.assetType,
      alertType,
      threshold,
      currency: alertCurrency,
      exchange: analysis.exchange ?? selectedAsset?.exchange ?? null,
      country: analysis.country ?? selectedAsset?.country ?? null,
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
        currency: payload.currency ?? null,
        exchange: payload.exchange ?? null,
        country: payload.country ?? null,
      })
      .select('id, symbol, asset_type, alert_type, threshold, currency, exchange, country, created_at')
      .single();

    if (saveError) {
      setNotice(saveError.code === '42P01' ? t('market_alert_migration_error') : t('market_alert_error'));
      return;
    }

    setAlerts(previous => [normalizeAlertRow(data as Record<string, unknown>), ...previous]);
    setNotice(t('market_alert_saved'));
  }, [alertThreshold, alertType, alerts, analysis, isGuest, selectedAsset?.country, selectedAsset?.currency, selectedAsset?.exchange, t, user]);

  const analyzeSearchSelection = useCallback(async (item?: MarketSearchItem) => {
    const cleanQuery = query.trim();
    if (!item && cleanQuery.length < 2) {
      setError(t('market_select_asset_to_start'));
      return;
    }

    let suggestionCandidates = searchResults;
    let selectedItem: MarketSearchSuggestion | undefined = item ? normalizeSearchItem(item) : findExactSearchMatch(searchResults, cleanQuery);
    if (!selectedItem && cleanQuery) {
      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;
      try {
        setSearchLoading(true);
        const params = new URLSearchParams({ q: cleanQuery });
        if (assetType !== 'all') params.set('assetType', assetType);
        const data = await fetchJsonWithTimeout<MarketSearchResponse>(`/api/market/search?${params.toString()}`, 8000, true);
        if (searchRequestIdRef.current !== requestId) return;
        const responseItems = [
          ...(data.resolved ? [data.resolved] : []),
          ...(data.results ?? []),
          ...normalizeErrorSuggestions(data.suggestions, cleanQuery, false),
        ];
        const results = normalizeSearchItems(responseItems, cleanQuery, assetType);
        const resolvedItem = data.resolved ? normalizeSearchItems([data.resolved], cleanQuery, assetType)[0] : undefined;
        suggestionCandidates = results;
        setSearchResults(results);
        setHighlightedSearchIndex(0);
        setSearchMessage(results.length === 0 ? marketErrorText(data.code, data.message || data.error || t('market_symbol_not_found_helpful'), t) : '');
        selectedItem = resolvedItem ?? findExactSearchMatch(results, cleanQuery) ?? (results.length === 1 ? results[0] : undefined);
      } catch {
        selectedItem = undefined;
      } finally {
        if (searchRequestIdRef.current === requestId) setSearchLoading(false);
      }
    }

    if (!selectedItem) {
      const normalizedInput = normalizeMarketSymbolInput(cleanQuery, assetType);
      if (canAnalyzeDirectNormalizedInput(normalizedInput)) {
        const validInput = normalizedInput as Extract<ReturnType<typeof normalizeMarketSymbolInput>, { valid: true }>;
        const exchange = validInput.assetType === 'forex' ? 'FX' : validInput.assetType === 'crypto' ? 'Crypto' : validInput.assetType === 'gold' ? 'COMEX' : undefined;
        const currency = resolveMarketCurrency({
          symbol: validInput.displaySymbol ?? validInput.symbol,
          providerSymbol: validInput.providerSymbol,
          exchange,
          assetType: validInput.assetType,
        });
        selectedItem = {
          symbol: validInput.displaySymbol ?? validInput.symbol,
          providerSymbol: validInput.providerSymbol,
          name: validInput.displaySymbol ?? validInput.symbol,
          assetType: validInput.assetType,
          exchange,
          currency: currency.currency ?? undefined,
          currencySource: currency.source,
          provider: 'THE SFM',
        };
      } else {
        setSelectedAsset(null);
        setAnalysis(null);
        setServiceState(current => current === 'checking' ? 'connected' : current);
        setError(invalidSymbolMessage(t, normalizedInput.correction));
        setErrorSuggestions(suggestionCandidates.length > 0 ? suggestionCandidates : normalizeErrorSuggestions(normalizedInput.suggestions, cleanQuery));
        setSearchMessage(invalidSymbolMessage(t, normalizedInput.correction));
        return;
      }
    }

    if (!selectedItem) {
      setSelectedAsset(null);
      setAnalysis(null);
      const suggestions = marketSymbolSuggestions(cleanQuery);
      setError(invalidSymbolMessage(t));
      setErrorSuggestions(normalizeErrorSuggestions(suggestions, cleanQuery));
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
      country: selectedItem.country,
      currency: selectedItem.currency,
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
  const concentrationRiskLevel = exposure >= 35 ? 'high' : exposure >= 20 ? 'medium' : 'low';
  const concentrationRisk = t(`market_concentration_risk_${concentrationRiskLevel}`);
  const concentrationRiskTone = concentrationRiskLevel === 'high' ? 'danger' : concentrationRiskLevel === 'medium' ? 'warning' : 'success';
  const whatIfValue = parseNumber(whatIfAmount);
  const hasWhatIfAmount = whatIfValue > 0;
  const hasWhatIfInput = whatIfAmount.trim().length > 0;
  const invalidWhatIfAmount = hasWhatIfInput && !hasWhatIfAmount;
  const estimatedUnits = selected?.latestPrice ? whatIfValue / selected.latestPrice : 0;
  const loadingLabel = slowLoading ? t('market_service_waking') : notice || t('market_loading_data');
  const selectedCurrency = selected?.currency ?? selected?.quote?.currency ?? selectedAsset?.currency ?? null;
  const selectedExchange = selected?.exchange ?? selectedAsset?.exchange ?? null;
  const selectedCountry = selected?.country ?? selectedAsset?.country ?? null;
  const selectedMarketSymbol = selected?.symbol ?? selectedAsset?.symbol ?? null;
  const selectedCurrencyLabel = marketCurrencyLabel(selectedCurrency, lang);
  const levelRange = useMemo(() => {
    if (!selected) return { min: 0, max: 1, support: 0, current: 50, resistance: 100 };
    const values = [selected.levels.support, selected.latestPrice, selected.levels.resistance].filter(value => Number.isFinite(value));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const spread = max - min;
    const paddedMin = Math.max(0, min - Math.max(spread * 0.08, Math.abs(max || 1) * 0.01));
    const paddedMax = max + Math.max(spread * 0.08, Math.abs(max || 1) * 0.01);
    return {
      min: paddedMin,
      max: paddedMax,
      support: levelMarkerPercent(selected.levels.support, paddedMin, paddedMax),
      current: levelMarkerPercent(selected.latestPrice, paddedMin, paddedMax),
      resistance: levelMarkerPercent(selected.levels.resistance, paddedMin, paddedMax),
    };
  }, [selected]);
  const selectedMoney = useCallback(
    (value: number, extra?: { includeKuwaitDinarEquivalent?: boolean }) => money(value, selectedCurrency, {
      locale: lang,
      exchange: selectedExchange,
      symbol: selectedMarketSymbol,
      includeKuwaitDinarEquivalent: extra?.includeKuwaitDinarEquivalent,
    }),
    [lang, selectedCurrency, selectedExchange, selectedMarketSymbol],
  );
  const assetMoney = useCallback(
    (asset: Pick<MarketAnalysis, 'currency' | 'quote' | 'exchange' | 'symbol'>, value: number) => money(value, asset.currency ?? asset.quote?.currency ?? null, {
      locale: lang,
      exchange: asset.exchange,
      symbol: asset.symbol,
    }),
    [lang],
  );
  const selectedHasOhlc = chartHistory.filter(point => hasCompleteOhlc(point)).length >= 2;

  useEffect(() => {
    if ((chartType === 'candlestick' || chartType === 'ohlc') && !selectedHasOhlc) {
      setChartType('area');
    }
  }, [chartType, selectedHasOhlc]);
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
      exchange: selectedExchange,
      scenarioAmount: hasWhatIfAmount ? whatIfValue : null,
      scenarioCurrency,
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
    selectedExchange,
    scenarioCurrency,
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
    void requestAiInsight(selected, { force: true });
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
    `${t('market_report_levels')}: ${t('market_support_zone')} ${selectedMoney(selected.levels.support)} / ${t('market_resistance_zone')} ${selectedMoney(selected.levels.resistance)}`,
    `${t('market_report_portfolio')}: ${portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}`,
    `${t('market_report_monitor')}: RSI ${selected.indicators.rsi}, SMA 20 ${selectedMoney(selected.indicators.sma20)}, SMA 50 ${selectedMoney(selected.indicators.sma50)}`,
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
      const search = document.getElementById('market-asset-search');
      search?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      search?.focus({ preventScroll: true });
    });
  }, []);
  const primaryErrorSuggestion = errorSuggestions[0];

  return (
    <div className="market-shell" dir={dir}>
      <Sidebar />
      <main className="market-main">
        <MarketAsyncToolStyles />
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
                      searchRequestIdRef.current += 1;
                      setQuery(nextQuery);
                      setError('');
                      setErrorSuggestions([]);
                      setSearchResults([]);
                      setSearchMessage('');
                      setSearchLoading(nextQuery.trim().length >= 2);
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
                        marketCurrencyLabel(item.currency, lang),
                        marketAssetTypeLabel(item.assetType, t),
                        item.provider,
                      ].filter(Boolean).join(' · ');
                      const cleanMeta = meta.replace(/\u00c2\u00b7/g, '·');
                      const readableMeta = [
                        item.symbol,
                        item.exchange,
                        marketCurrencyLabel(item.currency, lang),
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
                <select value={assetType} aria-label={t('market_asset_type')} onChange={event => setAssetType(event.target.value as MarketAssetFilter)}>
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
                <em className="market-hero-card-meta" dir="ltr">{selectedMoney(selected.latestPrice)} / {selected.cached ? t('market_cached_data') : t('market_badge_live')}</em>
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
          <div className="market-error-alert" role="alert">
            <span className="market-error-alert-icon"><AlertTriangle size={20} /></span>
            <div className="market-error-alert-copy">
              <strong>{t('market_error_alert_title')}</strong>
              <p>{error || t('market_error_alert_body')}</p>
            </div>
            <div className="market-error-actions">
              <button
                type="button"
                className="market-error-action primary"
                disabled={!selectedAsset || loading}
                onClick={() => selectedAsset && void requestAnalysis(selectedAsset.providerSymbol ?? selectedAsset.symbol, selectedAsset.assetType, selectedAsset)}
              >
                {t('market_retry')}
              </button>
              {primaryErrorSuggestion && (
                <button
                  type="button"
                  className="market-error-action secondary"
                  disabled={loading}
                  onClick={() => {
                    setQuery(primaryErrorSuggestion.symbol);
                    setError('');
                    setErrorSuggestions([]);
                    void analyzeSearchSelection(primaryErrorSuggestion);
                  }}
                >
                  {t('market_use_suggestion').replace('{symbol}', primaryErrorSuggestion.symbol)}
                </button>
              )}
            </div>
            {errorSuggestions.length > 0 && (
              <div className="market-suggestion-chips" aria-label={t('market_symbol_suggestions')}>
                <small>{t('market_symbol_suggestions')}</small>
                {errorSuggestions.map(suggestion => (
                  <button
                    type="button"
                    key={`${suggestion.symbol}-${suggestion.assetType}-${suggestion.providerSymbol ?? suggestion.symbol}`}
                    onClick={() => {
                      setQuery(suggestion.symbol);
                      setError('');
                      setErrorSuggestions([]);
                      void analyzeSearchSelection(suggestion);
                    }}
                  >
                    {suggestionButtonLabel(suggestion)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <section className="market-active-dashboard">
        {activeTab === 'analyze' && <section className="market-card-grid" aria-label={t('market_analysis_cards')}>
          {loading ? (
            <MarketSectionLoading label={loadingLabel} cards={4} />
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
              <div className="market-price">{assetMoney(asset, asset.latestPrice)}</div>
              <div className={asset.changePercent >= 0 ? 'change up' : 'change down'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
              </div>
            </article>
          ))}
        </section>}

        {activeTab === 'traderTools' && (
          <TraderToolsDashboard
            t={t}
            locale={lang}
            currency={baseScenarioCurrency}
            userId={!isGuest ? user?.id : undefined}
            subTab={traderToolTab}
            setSubTab={setTraderToolTab}
            performance={performance}
          />
        )}

        {activeTab === 'economicCalendar' && (
          <EconomicCalendarPanel t={t} locale={lang} state={economicCalendar} onRefresh={loadEconomicCalendar} />
        )}

        {activeTab === 'sessions' && (
          <TradingSessionsPanel t={t} locale={lang} />
        )}

        {activeTab === 'technicalAnalysis' && (
          <TechnicalAnalysisPanel
            t={t}
            locale={lang}
            symbol={technicalSymbol}
            state={technicalState}
            hasSelectedAsset={Boolean(selectedAsset || selected)}
            onSelectAsset={focusMarketSearch}
            onApplySymbol={applyTechnicalAsset}
            onRefresh={() => setTechnicalRefreshKey(value => value + 1)}
          />
        )}

        {activeTab === 'newsSentiment' && (
          <NewsSentimentPanel
            t={t}
            lang={lang}
            news={centralBankNews}
            sentiment={marketSentiment}
            selectedAsset={selectedSentimentAsset}
            onSelectAsset={focusMarketSearch}
            onRefreshNews={() => loadNewsSentiment(['news'], { force: true })}
            onRefreshSentiment={() => selectedSentimentAsset ? loadNewsSentiment(['sentiment'], { force: true }) : focusMarketSearch()}
            onCheckSentimentHealth={checkMyfxbookHealth}
            checkingSentimentHealth={sentimentHealthLoading}
            onOpenTechnicalAnalysis={() => setActiveTab('technicalAnalysis')}
            onApplySentimentSuggestion={(symbol) => {
              const normalized = normalizeMarketSymbolInput(symbol, 'forex');
              void requestAnalysis(normalized.valid ? normalized.providerSymbol : symbol, 'forex', {
                symbol: normalized.valid ? normalized.symbol : symbol,
                providerSymbol: normalized.valid ? normalized.providerSymbol : symbol,
                name: symbol,
                assetType: 'forex',
                exchange: 'FX',
              });
            }}
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
                <strong>{selectedMoney(selected.latestPrice, { includeKuwaitDinarEquivalent: true })}</strong>
                <b className={selected.changePercent >= 0 ? 'change up' : 'change down'}>{percent(selected.changePercent)}</b>
                <small>{t('market_last_updated')}: {lastUpdated || t('market_unavailable')} · {selectedCurrencyLabel}</small>
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

              <article className="market-panel portfolio-card" aria-labelledby="portfolio-comparison-title">
                <div className="portfolio-card-head">
                  <div className="portfolio-card-title">
                    <span aria-hidden="true"><WalletCards size={24} /></span>
                    <div>
                      <h2 id="portfolio-comparison-title">{t('market_portfolio_comparison')}</h2>
                      <p>{t('market_portfolio_comparison_subtitle')}</p>
                      <i aria-hidden="true" />
                    </div>
                  </div>
                  <span className={`portfolio-card-status ${portfolioMatch ? 'available' : 'unavailable'}`}>
                    {portfolioMatch ? t('market_portfolio_data_available') : portfolio.length === 0 ? t('market_no_portfolio_data') : t('market_asset_not_in_portfolio')}
                  </span>
                </div>

                {portfolio.length === 0 ? (
                  <div className="portfolio-empty-note">
                    <AlertTriangle size={17} />
                    <div>
                      <strong>{t('market_portfolio_comparison_empty_title')}</strong>
                      <p>{t('market_portfolio_comparison_empty_body')}</p>
                    </div>
                  </div>
                ) : null}

                <div className="portfolio-comparison-grid">
                  <PortfolioComparisonMetric icon={<CircleDollarSign size={18} />} label={t('market_current_price')} value={selectedMoney(selected.latestPrice)} valueDir="ltr" />
                  <PortfolioComparisonMetric icon={<ShoppingCart size={18} />} label={t('market_purchase_price')} value={portfolioMatch ? selectedMoney(purchasePrice) : t('market_unavailable')} valueDir={portfolioMatch ? 'ltr' : undefined} status={portfolioMatch ? 'default' : 'unavailable'} />
                  <PortfolioComparisonMetric icon={<Percent size={18} />} label={t('market_gain_loss_percent')} value={portfolioMatch ? percent(unrealizedPct) : t('market_unavailable')} valueDir={portfolioMatch ? 'ltr' : undefined} status={portfolioMatch ? unrealizedPct >= 0 ? 'success' : 'danger' : 'unavailable'} />
                  <PortfolioComparisonMetric icon={<LineChart size={18} />} label={t('market_unrealized_pl')} value={portfolioMatch ? selectedMoney(unrealized) : t('market_unavailable')} valueDir={portfolioMatch ? 'ltr' : undefined} status={portfolioMatch ? unrealized >= 0 ? 'success' : 'danger' : 'unavailable'} />
                  <PortfolioComparisonMetric icon={<PieChart size={18} />} label={t('market_portfolio_exposure')} value={portfolioMatch ? `${exposure.toFixed(1)}%` : t('market_unavailable')} valueDir={portfolioMatch ? 'ltr' : undefined} status={portfolioMatch ? 'default' : 'unavailable'} />
                  <PortfolioComparisonMetric icon={<ShieldAlert size={18} />} label={t('market_concentration_risk')} value={portfolioMatch ? concentrationRisk : t('market_unavailable')} status={portfolioMatch ? concentrationRiskTone : 'unavailable'} />
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
                <div className="market-chart-controls">
                  <div className="timeframe-row" role="group" aria-label={t('market_timeframe')}>
                    {MARKET_TIMEFRAMES.map(item => (
                      <button
                        type="button"
                        key={item}
                        aria-pressed={timeframe === item}
                        onClick={() => loadHistory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="chart-type-control">
                    <span>{t('market_chart_type')}</span>
                    <div className="chart-type-row" role="group" aria-label={t('market_chart_type')}>
                      {MARKET_CHART_TYPES.map(item => {
                        const requiresOhlc = item === 'candlestick' || item === 'ohlc';
                        const disabled = requiresOhlc && !selectedHasOhlc;
                        return (
                          <button
                            type="button"
                            key={item}
                            aria-pressed={chartType === item}
                            disabled={disabled}
                            aria-describedby={disabled ? 'market-chart-ohlc-helper' : undefined}
                            title={disabled ? t('market_chart_requires_historical_ohlc') : undefined}
                            onClick={() => setChartType(item)}
                          >
                            {t(`market_chart_type_${item}`)}
                          </button>
                        );
                      })}
                    </div>
                    {!selectedHasOhlc ? (
                      <small id="market-chart-ohlc-helper" className="chart-type-helper">
                        {t('market_chart_requires_historical_ohlc')}
                      </small>
                    ) : null}
                  </div>
                </div>
                <PriceHistoryChart
                  history={chartHistory}
                  loading={chartLoading}
                  message={chartMessage}
                  timeframe={timeframe}
                  chartType={chartType}
                  locale={lang}
                  currency={selectedCurrency}
                  exchange={selectedExchange}
                  symbol={selectedMarketSymbol}
                  currentPrice={selected.latestPrice}
                  changePercent={selected.changePercent}
                  trend={selected.trend}
                  support={selected.levels.support}
                  resistance={selected.levels.resistance}
                  source={chartMeta.source ?? selected.source ?? selected.provider}
                  updatedAt={chartMeta.updatedAt ?? selected.lastUpdated ?? selected.quote?.timestamp ?? selected.fetchedAt}
                  onRetry={() => loadHistory(timeframe)}
                  t={t}
                />
                <div className="market-chart-meta">
                  <span>{t('market_timeframe')}: <b dir="ltr">{timeframe}</b></span>
                  {chartMeta.interval ? <span>{t('market_chart_interval')}: <b dir="ltr">{chartMeta.interval}</b></span> : null}
                  {chartMeta.source ? <span>{t('market_asset_profile_data_source')}: <b>{chartMeta.source}</b></span> : null}
                </div>
                <div className="market-stat-row">
                  <MarketMetric label={t('market_current_price')} value={selectedMoney(selected.latestPrice)} valueDir="ltr" />
                  <MarketMetric label={t('market_daily_change')} value={percent(selected.changePercent)} valueDir="ltr" />
                  <MarketMetric label={t('market_trend')} value={t(`market_trend_${selected.trend}`)} icon={trendIcon} />
                </div>
                <div className="levels-strip" aria-label={t('market_support_resistance_levels')}>
                  <div className="levels-strip-labels">
                    <span className="support">
                      <small>{t('market_support_zone')}</small>
                      <b className="market-numeric-value" dir="ltr">{selectedMoney(selected.levels.support)}</b>
                      <em className="market-numeric-value" dir="ltr">{percent(distancePercent(selected.levels.support, selected.latestPrice))}</em>
                    </span>
                    <span className="current">
                      <small>{t('market_current_price')}</small>
                      <b className="market-numeric-value" dir="ltr">{selectedMoney(selected.latestPrice)}</b>
                      <em>{t(`market_trend_${selected.trend}`)}</em>
                    </span>
                    <span className="resistance">
                      <small>{t('market_resistance_zone')}</small>
                      <b className="market-numeric-value" dir="ltr">{selectedMoney(selected.levels.resistance)}</b>
                      <em className="market-numeric-value" dir="ltr">{percent(distancePercent(selected.levels.resistance, selected.latestPrice))}</em>
                    </span>
                  </div>
                  <div className="levels-bar" aria-hidden="true">
                    <span className="support" style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.support)}%` }}>
                      <i />
                      <em>{t('market_support_zone')}</em>
                    </span>
                    <span className="current" style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.current)}%` }}>
                      <i />
                      <em>{t('market_current_price')}</em>
                    </span>
                    <span className="resistance" style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.resistance)}%` }}>
                      <i />
                      <em>{t('market_resistance_zone')}</em>
                    </span>
                  </div>
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
                  <MarketMetric label="RSI" value={String(selected.indicators.rsi)} valueDir="ltr" />
                  <MarketMetric label="SMA 20" value={selectedMoney(selected.indicators.sma20)} valueDir="ltr" />
                  <MarketMetric label="SMA 50" value={selectedMoney(selected.indicators.sma50)} valueDir="ltr" />
                  <MarketMetric label={t('market_risk_level')} value={Number.isFinite(selected.indicators.volatility) ? `${selected.indicators.volatility.toFixed(1)}%` : '--'} valueDir="ltr" />
                  <MarketMetric label={t('market_support_zone')} value={selectedMoney(selected.levels.support)} valueDir="ltr" />
                  <MarketMetric label={t('market_resistance_zone')} value={selectedMoney(selected.levels.resistance)} valueDir="ltr" />
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
                      <b>{alert.symbol} - {t(`market_alert_type_${alert.alertType}`)} {formatSavedAlertThreshold(alert, lang)}</b>
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
                  onClick={() => void saveWatchlist({ symbol: selected.symbol, providerSymbol: selected.providerSymbol ?? selected.symbol, assetType: selected.assetType, name: localizedAssetName, currency: selectedCurrency, exchange: selectedExchange, country: selectedCountry })}
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
                        country: asset.country,
                        currency: asset.currency,
                      })}
                    >
                      {asset.symbol}
                    </button>
                  )) : watchlist.map(asset => (
                    <span key={`${asset.id ?? asset.symbol}-${asset.assetType}`}>
                      <button type="button" onClick={() => void requestAnalysis(asset.providerSymbol ?? asset.symbol, asset.assetType, {
                        symbol: asset.symbol,
                        providerSymbol: asset.providerSymbol ?? undefined,
                        name: asset.name ?? undefined,
                        assetType: asset.assetType,
                        exchange: asset.exchange ?? undefined,
                        country: asset.country ?? undefined,
                        currency: asset.currency,
                      })}>{asset.symbol}</button>
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
                        <span>{assetMoney(asset, asset.latestPrice)}</span>
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
                      <b>{alert.symbol} - {t(`market_alert_type_${alert.alertType}`)} {formatSavedAlertThreshold(alert, lang)}</b>
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
                  onClick={() => void saveWatchlist({ symbol: selected.symbol, providerSymbol: selected.providerSymbol ?? selected.symbol, assetType: selected.assetType, name: localizedAssetName, currency: selectedCurrency, exchange: selectedExchange, country: selectedCountry })}
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
                        country: asset.country,
                        currency: asset.currency,
                      })}
                    >
                      {asset.symbol}
                    </button>
                  )) : watchlist.map(asset => (
                    <span key={`${asset.id ?? asset.symbol}-${asset.assetType}`}>
                      <button type="button" onClick={() => void requestAnalysis(asset.providerSymbol ?? asset.symbol, asset.assetType, {
                        symbol: asset.symbol,
                        providerSymbol: asset.providerSymbol ?? undefined,
                        name: asset.name ?? undefined,
                        assetType: asset.assetType,
                        exchange: asset.exchange ?? undefined,
                        country: asset.country ?? undefined,
                        currency: asset.currency,
                      })}>{asset.symbol}</button>
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
                        <span>{assetMoney(asset, asset.latestPrice)}</span>
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
        .market-main{width:100%;max-width:100%;min-width:0;margin:0;padding:24px;display:grid;gap:18px;overflow-x:hidden;box-sizing:border-box}.market-main>*{width:100%;max-width:1400px;min-width:0;margin-inline:auto;box-sizing:border-box}
        @media(min-width:1025px){[dir="rtl"].market-shell .market-main{padding-inline-start:32px;padding-inline-end:calc(var(--sidebar-w,230px) + 32px)}[dir="ltr"].market-shell .market-main{padding-inline-start:calc(var(--sidebar-w,230px) + 32px);padding-inline-end:32px}}
        .market-hero{position:relative;overflow:visible;border-radius:26px;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end;box-shadow:0 20px 60px rgba(3,18,37,.16);border:1px solid rgba(167,243,240,.24)}
        .market-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(167,243,240,.14);filter:blur(18px)}
        .market-hero-copy,.market-hero-card{position:relative;z-index:1}.market-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.28);background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}
        .market-hero h1{margin:0 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;font-weight:900}.market-hero p{max-width:760px;margin:0;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan)}.market-search-field{position:relative}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel label>div:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel label>div svg{color:var(--sfm-primary);flex-shrink:0}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:var(--sfm-card);color:var(--sfm-foreground);padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0;color:var(--sfm-foreground)}.market-search-panel input::placeholder{color:var(--sfm-muted);opacity:1}.market-search-panel select{cursor:pointer;box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-panel select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.22),0 10px 24px rgba(3,18,37,.14)}.market-search-panel select option{color:var(--sfm-foreground);background:var(--sfm-card)}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-panel button svg{color:var(--sfm-primary-dark)}.market-search-panel button:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute;z-index:90;inset-inline:0;top:calc(100% + 12px);max-height:min(320px,48dvh);overflow-y:auto;background:var(--sfm-card);color:var(--sfm-foreground);border:1px solid rgba(29,140,255,.25);border-radius:14px;box-shadow:0 22px 60px rgba(3,18,37,.32);padding:10px;display:grid;gap:8px;overscroll-behavior:contain}.market-search-results strong{color:var(--sfm-primary-hover);font-size:12px;font-weight:900;padding:5px 7px}.market-search-results p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7;padding:12px}.market-search-results button{height:auto;min-height:58px;width:100%;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:12px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:start;box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(29,140,255,.10);border-color:rgba(29,140,255,.32);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-search-results button span{display:grid;gap:4px;min-width:0}.market-search-results button b{font-size:15px;color:var(--sfm-foreground);letter-spacing:.02em;direction:ltr;unicode-bidi:isolate}.market-search-results button em{font-style:normal;color:var(--sfm-midnight);font-size:13px;line-height:1.45;white-space:normal;overflow-wrap:anywhere}.market-search-results button small{color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.18);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;line-height:1.3;flex-shrink:0;white-space:nowrap}
        .market-search-field{z-index:70;min-width:0}.market-search-panel .market-search-input-shell{position:relative;z-index:2}.market-search-results{z-index:9999;top:calc(100% + 10px);max-height:min(360px,52dvh);overflow-y:auto;overflow-x:hidden;background:var(--sfm-card);border-color:rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;gap:6px}.market-search-results strong{padding:6px 8px;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-results p{border-radius:12px;background:rgba(29,140,255,.06);text-align:start}.market-search-results button{min-height:68px;display:grid;grid-template-columns:1fr;align-items:center;justify-items:stretch;gap:7px;padding:11px 12px;border-radius:14px;background:var(--sfm-light-card);border-color:rgba(29,140,255,.14);text-align:start;color:var(--sfm-foreground);box-shadow:none}.market-search-results button:hover,.market-search-results button:focus-visible,.market-search-results button[aria-selected="true"]{background:rgba(24,212,212,.10);border-color:rgba(47,214,192,.55);box-shadow:0 0 0 3px rgba(24,212,212,.16);outline:none}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:inherit;unicode-bidi:normal;letter-spacing:0;color:var(--sfm-foreground);font-size:14px}.market-search-results button em{flex-shrink:0;border-radius:999px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan);padding:4px 8px;font-style:normal;font-size:11px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;border:0;background:transparent;color:var(--sfm-muted);font-size:12px;line-height:1.55;text-align:start}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;box-shadow:0 24px 70px rgba(0,0,0,.42)}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.dark .market-search-results p{background:rgba(47,214,192,.08)}
        .market-search-field{position:relative;z-index:100;display:grid;gap:7px;min-width:0;overflow:visible}.market-search-field>label{font-size:12px;font-weight:900;color:var(--sfm-soft-cyan);line-height:1.4}.market-search-combobox{position:relative;width:100%;overflow:visible}.market-search-panel .market-search-input-shell{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(29,140,255,.35);border-radius:15px;background:rgba(234,246,255,.94);padding:0 13px;color:var(--sfm-foreground);box-shadow:0 8px 22px rgba(3,18,37,.12)}.market-search-submit{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.16)}.market-search-submit svg{color:var(--sfm-primary-dark)}.market-search-submit:disabled{opacity:.9;cursor:wait;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark)}.market-search-results{position:absolute!important;top:calc(100% + 10px)!important;right:0!important;left:0!important;z-index:9999!important;width:100%;max-height:min(320px,48dvh);overflow-y:auto!important;overflow-x:hidden!important;display:block!important;background:var(--sfm-card);border:1px solid rgba(29,140,255,.24);border-radius:18px;box-shadow:0 24px 70px rgba(3,18,37,.36);padding:8px;overscroll-behavior:contain}.market-search-results button{width:100%;min-height:68px;height:auto!important;display:grid!important;grid-template-columns:1fr!important;gap:7px;margin:0 0 6px;padding:11px 12px;border-radius:14px;text-align:start;cursor:pointer}.market-search-results button:last-of-type{margin-bottom:0}.market-search-results p{margin:0;padding:12px;border-radius:12px;text-align:start}.market-search-result-main{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-width:0;width:100%}.market-search-results button b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.market-search-results button small{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dark .market-search-panel .market-search-input-shell{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .market-search-results button{background:#0a1422;border-color:#1d3050}.dark .market-search-results button:hover,.dark .market-search-results button:focus-visible,.dark .market-search-results button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:var(--sfm-soft-cyan);line-height:1}.market-hero-card p{margin:0;font-size:13px}.market-hero-card em{font-style:normal;color:rgba(255,255,255,.78);font-size:12px;font-weight:900;line-height:1.5}.risk{justify-self:start;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.risk.low{background:#CCFBF1;color:#047857;border-color:rgba(15,118,110,.25)}.risk.medium{background:rgba(167,243,240,.18);color:var(--sfm-muted);border-color:rgba(167,243,240,.20)}.risk.high{background:#FEE2E2;color:#DC2626;border-color:rgba(220,38,38,.20)}.dark .risk.low{background:rgba(47,214,192,.12);color:#2FD6C0;border-color:rgba(47,214,192,.25)}.dark .risk.high{background:rgba(255,91,110,.12);color:#FF5B6E;border-color:rgba(255,91,110,.25)}
        .market-card-grid,.market-status-grid,.market-decision-grid,.market-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:stretch}.market-status-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-decision-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}.market-decision-grid>.market-panel{align-self:start}.market-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-card,.market-panel,.market-disclaimer,.market-notice,.market-stock-header{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:24px;box-shadow:0 6px 24px rgba(3,18,37,.06)}.market-card{padding:16px;display:grid;gap:10px;min-width:0;height:100%;align-content:start}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:var(--sfm-foreground)}.change{display:inline-flex;align-items:center;gap:4px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate}.change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.up:not(.change){color:#047857}.down:not(.change){color:#DC2626}.dark .change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.dark .up:not(.change){color:#2FD6C0}.dark .down:not(.change){color:#FF5B6E}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--sfm-muted);font-weight:900;background:var(--sfm-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px}.market-empty-detailed{display:grid;gap:10px;justify-items:center;text-align:center}.market-empty-detailed strong{color:var(--sfm-foreground);font-size:17px}.market-empty-detailed span{color:var(--sfm-muted);font-size:13px;line-height:1.6}.market-empty-detailed p{margin:0;max-width:680px;color:var(--sfm-muted);line-height:1.8}.market-empty-detailed button{border:0;border-radius:999px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-primary-dark);padding:10px 16px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.market-notice button{border:0;border-radius:999px;background:var(--sfm-foreground);color:var(--sfm-card);padding:8px 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-notice button:disabled{opacity:.55;cursor:not-allowed}.market-suggestion-chips{flex-basis:100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.market-suggestion-chips small{color:var(--sfm-muted);font-size:12px;font-weight:950;line-height:1.4}.market-suggestion-chips button{background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.28);color:var(--sfm-primary-hover);min-height:34px;padding:0 12px}.market-suggestion-chips button:hover,.market-suggestion-chips button:focus-visible{outline:none;background:rgba(47,214,192,.18);border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.market-notice.success{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-notice.slow{color:#92400E;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22)}
        .market-stock-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}.market-stock-header h2{margin:8px 0 4px;color:var(--sfm-foreground);font-size:28px}.market-stock-header p{margin:0;color:var(--sfm-muted);font-weight:850}.stock-price-block{display:grid;justify-items:end;gap:5px;text-align:end}.stock-price-block strong{font-size:30px;color:var(--sfm-foreground);font-weight:950}.stock-price-block small{color:var(--sfm-muted);font-weight:850}.data-badge{display:inline-flex;width:max-content;border-radius:999px;border:1px solid rgba(29,140,255,.22);background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-size:11px;font-weight:950}.data-badge.delayed{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22);color:#B45309}.data-badge.unavailable{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.22);color:#B91C1C}
        .market-service{display:flex;align-items:center;gap:9px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:18px;padding:12px 14px;color:var(--sfm-muted);font-weight:900;box-shadow:0 6px 24px rgba(3,18,37,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.slow,.market-service.not_configured{color:#92400E;background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.20)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px}.market-chart{grid-row:span 2}.market-panel{padding:22px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:var(--sfm-soft-cyan)}.market-section-head span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:var(--sfm-foreground);font-size:17px;font-weight:900;line-height:1.35}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.timeframe-row{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 12px}.timeframe-row button{border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:7px 11px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.timeframe-row button[aria-pressed="true"],.timeframe-row button:hover,.timeframe-row button:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.price-history-chart{position:relative;min-height:320px;border-radius:20px;border:1px solid rgba(167,243,240,.16);background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(248,252,255,.72));overflow:hidden;padding:16px;display:grid;align-content:stretch}.price-history-chart svg{width:100%;height:260px;max-height:none;display:block;overflow:visible}.price-chart-values{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}.price-chart-values span{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.4}.price-chart-values strong{color:var(--sfm-foreground);font-size:20px;font-weight:950;line-height:1.2}.price-chart-grid-line{stroke:rgba(100,116,139,.18);stroke-width:1}.price-chart-line-path{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 10px 18px rgba(29,140,255,.16))}.price-chart-area-path{pointer-events:none}.price-chart-last-dot{fill:#fff;stroke:var(--sfm-accent);stroke-width:4}.price-chart-axis{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--sfm-muted);font-size:11px;font-weight:900}.price-chart-state{position:absolute;inset:16px;display:grid;place-items:center;gap:10px;text-align:center;border:1px dashed rgba(29,140,255,.22);background:rgba(255,255,255,.84);backdrop-filter:blur(10px);border-radius:16px;color:var(--sfm-muted);padding:22px;line-height:1.8}.price-chart-state svg{width:18px;height:18px;color:#F59E0B}.price-chart-state strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;max-width:520px}.price-chart-loading{position:absolute;inset:16px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:16px;background:rgba(255,255,255,.74);backdrop-filter:blur(8px);color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.6}.price-chart-loading span{width:10px;height:10px;border-radius:50%;background:var(--sfm-accent);box-shadow:0 0 0 4px rgba(47,214,192,.16);animation:marketPulse 1.1s ease-in-out infinite}.market-chart-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;color:var(--sfm-muted);font-size:11px;font-weight:900}.market-chart-meta span{border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.market-chart-meta b{color:var(--sfm-foreground)}.dark .price-history-chart{border-color:rgba(167,243,240,.14);background:linear-gradient(180deg,rgba(15,29,49,.88),rgba(10,20,34,.72))}.dark .price-chart-state{border-color:rgba(167,243,240,.18);background:rgba(15,29,49,.82)}.dark .price-chart-loading{background:rgba(15,29,49,.76)}.dark .price-chart-grid-line{stroke:rgba(184,199,217,.16)}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.metric{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:13px;display:grid;gap:7px;min-width:0;align-content:start}.metric span{font-size:11px;color:var(--sfm-muted);font-weight:900;line-height:1.45}.metric strong{font-size:15px;color:var(--sfm-foreground);display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.45}.indicator-list,.scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.portfolio-card{display:grid;gap:14px;align-content:start;padding:18px}.portfolio-card .market-section-head{margin-bottom:0}.portfolio-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.portfolio-metric-grid .metric{border-radius:14px;padding:11px 12px;gap:5px}.portfolio-metric-grid .metric span{font-size:10.5px;line-height:1.35}.portfolio-metric-grid .metric strong{font-size:14px;line-height:1.35}.fundamentals-empty{display:grid;gap:9px;background:var(--sfm-light-card);border:1px dashed rgba(167,243,240,.22);border-radius:18px;padding:16px;color:var(--sfm-muted);line-height:1.8}.fundamentals-empty svg{color:var(--sfm-soft-cyan)}.fundamentals-empty strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45}.fundamentals-empty p{margin:0;color:var(--sfm-muted);font-weight:850}.fundamentals-empty small{width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.25);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:5px 9px;font-weight:950;line-height:1.35}.asset-profile-card{margin:16px 0;display:grid;gap:0}.asset-profile-body{display:grid;gap:14px}.asset-profile-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid rgba(47,214,192,.18);background:rgba(47,214,192,.08);border-radius:18px;padding:15px}.asset-profile-header strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.35}.asset-profile-header p,.asset-profile-section p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.8}.asset-profile-badges{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.asset-profile-badges span{border:1px solid rgba(47,214,192,.24);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2}.asset-profile-section{display:grid;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:18px;padding:14px}.asset-profile-section h3{margin:0;display:flex;align-items:center;gap:7px;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.asset-profile-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.asset-profile-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:14px;padding:10px}.asset-profile-metric span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.asset-profile-metric strong{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}.asset-profile-link{min-height:58px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.10);border-radius:14px;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;text-decoration:none}.asset-profile-link:hover,.asset-profile-link:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.asset-profile-holdings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.asset-profile-holdings span{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:13px;padding:9px 10px;min-width:0}.asset-profile-holdings b{color:var(--sfm-foreground);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-profile-holdings em{color:var(--sfm-soft-cyan);font-size:11px;font-weight:950;font-style:normal;white-space:nowrap}.asset-profile-limitations ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.asset-profile-footer{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-muted);font-size:11px;font-weight:900}.asset-profile-footer span{border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.asset-profile-state{display:flex;align-items:center;gap:9px;border:1px dashed rgba(167,243,240,.22);background:var(--sfm-light-card);border-radius:16px;padding:14px;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.6}.asset-profile-state.error{border-color:rgba(239,68,68,.25);color:#B91C1C}.dark .asset-profile-state.error{color:#FF8A96}.asset-profile-pulse{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}.decision-body{display:grid;gap:13px}.decision-body b{font-size:25px;font-weight:900;color:var(--sfm-foreground);line-height:1.25}.decision-body p,.decision-body small,.decision-body strong{margin:0;color:var(--sfm-muted);line-height:1.9;font-weight:800;overflow-wrap:anywhere}.decision-body small{font-size:12px;color:var(--sfm-muted)}.decision-body strong{color:var(--sfm-muted)}.ai-summary-body{align-content:start}.ai-summary-intro{border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);border-radius:14px;padding:10px 12px;color:var(--sfm-foreground)!important;font-size:13px;line-height:1.75}.ai-summary-section{display:grid;gap:5px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:12px}.ai-summary-section b{font-size:13px;color:var(--sfm-foreground);font-weight:950}.ai-summary-section p{font-size:13px;line-height:1.75}.ai-summary-section ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.75}.ai-summary-loading{display:flex;align-items:center;gap:9px;color:var(--sfm-muted);font-size:13px;font-weight:950}.ai-summary-loading span{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:marketPulse 1.1s ease-in-out infinite}@keyframes marketPulse{50%{transform:scale(.72);opacity:.55}}.ai-summary-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ai-summary-actions small{flex:1;min-width:180px}.ai-regenerate{margin:0;width:max-content;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff}.risk-score{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:10px 12px}.risk-score span,.risk-score strong{font-size:12px!important;color:var(--sfm-foreground)!important;font-weight:950!important;line-height:1.3!important}.risk-score i{height:9px;border-radius:999px;background:rgba(29,140,255,.12);overflow:hidden}.risk-score i b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sfm-primary),#F59E0B,#EF4444)}.decision.ok{border-color:rgba(34,197,94,.22)}.decision.warn{border-color:rgba(167,243,240,.28)}.decision.danger{border-color:rgba(239,68,68,.22)}.levels-strip{margin-top:16px;display:grid;gap:10px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.6}.levels-strip i{position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,#22C55E,var(--sfm-soft-cyan),#EF4444);display:block}.levels-strip b{position:absolute;top:-4px;width:4px;height:18px;border-radius:999px;background:var(--sfm-foreground)}.levels-strip b.current{width:10px;height:10px;top:0;transform:translateX(-50%);background:#FFF;border:2px solid var(--sfm-foreground)}.tool-input,.alert-form{display:grid;gap:10px}.tool-input span{font-size:12px;font-weight:900;color:var(--sfm-muted);line-height:1.5}.tool-input input,.alert-form input,.alert-form select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;line-height:1.5}.market-currency-input{min-height:52px;display:flex;align-items:center;gap:9px;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 9px;transition:border-color .18s ease,box-shadow .18s ease;position:relative}.market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.tool-input .market-currency-input input{border:0;background:transparent;padding:0;box-shadow:none;flex:1;min-width:0}.tool-input .market-currency-input input::placeholder{color:var(--sfm-muted);opacity:1}.market-scenario-currency{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:7px}.market-scenario-currency>span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.2}.market-scenario-currency-trigger{min-width:62px;height:36px;border-radius:999px;border:1px solid rgba(15,118,110,.25);background:#CCFBF1;color:#0F766E;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-scenario-currency-trigger:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18)}.market-scenario-currency-trigger b{direction:rtl;unicode-bidi:isolate;font-size:12px}.market-scenario-currency-trigger small{font-size:10px;line-height:1}.market-scenario-currency-menu{position:absolute;inset-inline-end:0;top:calc(100% + 8px);z-index:80;width:150px;max-height:260px;overflow:auto;border:1px solid rgba(47,214,192,.28);border-radius:14px;background:var(--sfm-card);box-shadow:0 18px 44px rgba(3,18,37,.22);padding:6px;display:grid;gap:5px}.market-scenario-currency-menu button{height:38px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--sfm-foreground);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.market-scenario-currency-menu button:hover,.market-scenario-currency-menu button:focus-visible,.market-scenario-currency-menu button[aria-selected="true"]{outline:none;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.28)}.market-scenario-currency-menu button span{color:var(--sfm-foreground);font-size:13px}.market-scenario-currency-menu button b{direction:ltr;unicode-bidi:isolate;color:var(--sfm-muted);font-size:11px}.dark .market-scenario-currency-trigger{border-color:rgba(47,214,192,.25);background:rgba(47,214,192,.12);color:#2FD6C0}.dark .market-scenario-currency-menu{background:#0f1d31;border-color:#1d3050;box-shadow:0 22px 56px rgba(0,0,0,.38)}.dark .market-scenario-currency-menu button:hover,.dark .market-scenario-currency-menu button:focus-visible,.dark .market-scenario-currency-menu button[aria-selected="true"]{background:#10263f;border-color:#2fd6c0}.market-field-error{display:block;color:#B91C1C;font-size:12px;font-weight:900;line-height:1.55}.dark .market-field-error{color:#FF5B6E}.alert-form{grid-template-columns:minmax(0,1fr) 110px auto;align-items:stretch}.alert-form button,.inline-action,.report-button{border:0;border-radius:14px;background:var(--sfm-foreground);color:var(--sfm-card);padding:12px 14px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;line-height:1.45}.inline-action{margin-bottom:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.inline-action:disabled{opacity:.58;cursor:default}.saved-alerts,.asset-report{display:grid;gap:10px;margin-top:14px}.saved-alerts span,.asset-report p{margin:0;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:12px;padding:10px 11px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.65}.saved-alerts span{display:flex;align-items:center;justify-content:space-between;gap:9px}.saved-alerts span b{min-width:0;overflow-wrap:anywhere}.saved-alerts button{border:0;background:transparent;color:var(--sfm-muted);cursor:pointer;display:inline-flex;padding:2px}.asset-report small{color:var(--sfm-muted);line-height:1.75;font-weight:800;display:block}
        .ai-summary-compact{display:grid;gap:10px;align-content:start}.ai-summary-compact small{color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.7}
        .economic-calendar-panel{display:grid;gap:16px;overflow:hidden}.economic-calendar-empty{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;border:1px solid rgba(245,158,11,.24);background:linear-gradient(135deg,rgba(245,158,11,.10),rgba(29,140,255,.06)),var(--sfm-card);border-radius:28px;padding:20px;box-shadow:0 16px 40px rgba(3,18,37,.07)}.economic-calendar-empty-icon{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.24);color:#B45309}.economic-calendar-empty small{display:block;color:#B45309;font-size:12px;font-weight:950;line-height:1.4;margin-bottom:5px}.economic-calendar-empty strong{display:block;color:var(--sfm-foreground);font-size:clamp(18px,2vw,24px);font-weight:950;line-height:1.35}.economic-calendar-empty p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.9}.economic-calendar-empty em{display:inline-flex;width:max-content;max-width:100%;margin-top:12px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 11px;font-style:normal;font-size:12px;font-weight:950;line-height:1.4}.economic-calendar-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}.economic-calendar-chips span{border:1px solid rgba(245,158,11,.22);background:rgba(255,255,255,.62);color:#92400E;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}.economic-calendar-next{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(47,214,192,.08)),var(--sfm-card);border-radius:24px;padding:16px;box-shadow:0 12px 32px rgba(3,18,37,.06)}.economic-calendar-next span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950;margin-bottom:5px}.economic-calendar-next strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.4}.economic-calendar-next-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.economic-calendar-next-meta b,.economic-calendar-next-meta small{border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}.economic-calendar-filters{width:100%;max-width:100%;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.economic-calendar-filters::-webkit-scrollbar{display:none}.economic-calendar-filters button{flex:0 0 auto;min-height:40px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.economic-calendar-filters button[aria-pressed="true"],.economic-calendar-filters button:hover,.economic-calendar-filters button:focus-visible{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;box-shadow:0 10px 22px rgba(29,140,255,.18)}.economic-calendar-list{display:grid;gap:12px}.economic-calendar-event{display:grid;gap:14px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:22px;padding:15px;box-shadow:0 10px 26px rgba(3,18,37,.05)}.economic-calendar-event-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.economic-calendar-event-main b{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.5}.economic-calendar-event-main span{flex:0 0 auto;color:var(--sfm-muted);font-size:12px;font-weight:950;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.economic-calendar-event-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.economic-calendar-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px}.economic-calendar-metric small{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.economic-calendar-metric b{color:var(--sfm-foreground);font-size:12px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}.dark .economic-calendar-empty{background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(29,140,255,.07)),#0f1d31;border-color:rgba(245,185,66,.26)}.dark .economic-calendar-empty-icon{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.24);color:#F5B942}.dark .economic-calendar-empty small{color:#F5B942}.dark .economic-calendar-chips span{background:rgba(245,185,66,.11);border-color:rgba(245,185,66,.22);color:#FDE68A}.dark .economic-calendar-empty em,.dark .economic-calendar-next-meta b,.dark .economic-calendar-next-meta small{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .economic-calendar-next,.dark .economic-calendar-event{background:#0f1d31;border-color:#1d3050}.dark .economic-calendar-event-main span,.dark .economic-calendar-metric{background:#0a1422;border-color:#1d3050}.dark .economic-calendar-filters button{background:#0a1422;border-color:#1d3050;color:#b8c7d9}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:var(--sfm-muted);line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:var(--sfm-muted);font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span,.watchlist>button{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);padding:7px 11px;color:var(--sfm-muted);font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:6px}.watchlist button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:var(--sfm-muted)}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));display:block}.compare-table{margin-top:14px;overflow-x:auto;display:grid;gap:7px}.compare-table>div{display:grid;grid-template-columns:60px 90px 70px 52px 76px 80px;gap:7px;min-width:470px}.compare-table b,.compare-table span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.compare-table b{color:var(--sfm-muted)}
        .trader-dashboard{display:grid;gap:16px}.tool-tabs,.symbol-chip-row,.overlap-row{display:flex;flex-wrap:wrap;gap:8px}.tool-tabs button,.symbol-chip-row button{min-height:38px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-muted);padding:0 13px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.tool-tabs button[aria-pressed="true"],.tool-tabs button:hover,.tool-tabs button:focus-visible,.symbol-chip-row button[aria-pressed="true"],.symbol-chip-row button:hover,.symbol-chip-row button:focus-visible{outline:none;background:linear-gradient(135deg,rgba(29,140,255,.18),rgba(47,214,192,.14));border-color:rgba(47,214,192,.38);color:var(--sfm-foreground);box-shadow:0 0 0 3px rgba(24,212,212,.12)}.trader-tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.trader-tool-card{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:18px;padding:16px;display:grid;gap:14px;min-width:0}.trader-tool-card.compact{align-content:start}.trader-tool-card h3{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:950;line-height:1.45}.trader-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tool-input select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;color:var(--sfm-foreground)}.tool-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tool-warning{margin:0;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.10);color:#92400E;border-radius:13px;padding:10px 12px;font-size:12px;font-weight:900;line-height:1.7}.trader-table-wrap{overflow-x:auto;border:1px solid rgba(167,243,240,.14);border-radius:18px}.trader-table{display:grid;min-width:780px}.trader-table>div{display:grid;grid-template-columns:90px minmax(160px,1fr) 110px 90px 90px 90px 90px;gap:10px;padding:11px 12px;border-bottom:1px solid rgba(167,243,240,.10);align-items:center}.trader-table>div:last-child{border-bottom:0}.trader-table b{color:var(--sfm-muted);font-size:11px;font-weight:950}.trader-table span{color:var(--sfm-foreground);font-size:12px;font-weight:900;overflow-wrap:anywhere}.trader-empty-state{display:grid;gap:9px;justify-items:start;border:1px dashed rgba(167,243,240,.24);background:var(--sfm-light-card);border-radius:18px;padding:18px;color:var(--sfm-muted)}.trader-empty-state svg{color:var(--sfm-soft-cyan)}.trader-empty-state strong{color:var(--sfm-foreground);font-size:15px;font-weight:950}.trader-empty-state p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.session-timeline{position:relative;height:48px;border-radius:999px;background:linear-gradient(90deg,rgba(29,140,255,.10),rgba(47,214,192,.12));border:1px solid rgba(167,243,240,.14);overflow:hidden}.session-timeline span{position:absolute;top:7px;bottom:7px;border-radius:999px;background:rgba(148,163,184,.22);color:var(--sfm-muted);display:grid;place-items:center;font-size:11px;font-weight:950;min-width:54px}.session-timeline span.open{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.sessions-grid{margin-top:14px}.session-badge{width:max-content;border-radius:999px;padding:6px 10px;background:rgba(148,163,184,.12);color:var(--sfm-muted);font-size:12px}.session-badge.open{background:rgba(47,214,192,.14);color:var(--sfm-primary-hover)}.overlap-row{margin-top:14px}.overlap-row span{border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.overlap-row span.active{background:rgba(47,214,192,.14);border-color:rgba(47,214,192,.32);color:var(--sfm-primary-hover)}
        .technical-analysis-panel{display:grid;gap:16px;overflow:hidden}.technical-selector-shell{display:grid;gap:13px;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.08)),var(--sfm-light-card);border-radius:24px;padding:14px;min-width:0}.technical-search{min-height:48px;display:flex;align-items:center;gap:10px;border:1px solid rgba(167,243,240,.18);background:var(--sfm-card);border-radius:18px;padding:0 13px;color:var(--sfm-muted);min-width:0}.technical-search:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.technical-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--sfm-foreground);font:900 13px Tajawal,Arial,sans-serif;line-height:1.4}.technical-search input::placeholder{color:var(--sfm-muted);opacity:1}.technical-search button{width:28px;height:28px;border:0;border-radius:999px;background:rgba(148,163,184,.12);color:var(--sfm-muted);font:950 15px Arial,sans-serif;cursor:pointer}.technical-category-row,.technical-symbol-row{width:100%;max-width:100%;display:flex;flex-wrap:nowrap;gap:9px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.technical-category-row::-webkit-scrollbar,.technical-symbol-row::-webkit-scrollbar{display:none}.technical-category-row button{flex:0 0 auto;min-height:40px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 15px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.technical-category-row button[aria-pressed="true"],.technical-category-row button:hover,.technical-category-row button:focus-visible{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;box-shadow:0 10px 22px rgba(29,140,255,.18)}.technical-symbol-pill{flex:0 0 auto;display:flex;align-items:center;gap:4px;min-height:42px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);padding:3px;color:var(--sfm-foreground);box-shadow:0 10px 24px rgba(5,22,42,.05)}.technical-symbol-pill[data-active="true"]{border-color:transparent;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 14px 30px rgba(29,140,255,.22)}.technical-symbol-main,.technical-symbol-favorite{border:0;background:transparent;color:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.technical-symbol-main{min-height:34px;padding:0 10px;font:950 13px Tajawal,Arial,sans-serif;letter-spacing:.01em}.technical-symbol-main span{unicode-bidi:isolate}.technical-symbol-favorite{width:32px;height:32px;border-radius:999px;color:inherit;opacity:.78}.technical-symbol-favorite:hover,.technical-symbol-favorite:focus-visible{outline:none;background:rgba(255,255,255,.18);opacity:1}.technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite:hover,.technical-symbol-pill:not([data-active="true"]) .technical-symbol-favorite:focus-visible{background:rgba(47,214,192,.12);color:var(--sfm-primary-hover)}.technical-favorites{display:grid;gap:6px;min-width:0}.technical-favorites>span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.4}.technical-symbol-row.compact{padding-bottom:2px}.technical-no-results{flex:0 0 auto;border:1px dashed rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:10px 13px;font-size:12px;font-weight:900}.technical-selected-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.technical-result-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.market-status-grid .metric{border-radius:20px;background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07)),var(--sfm-light-card);border-color:rgba(47,214,192,.16)}
        .market-panel.trader-dashboard{width:100%;max-width:100%;overflow:hidden;padding:clamp(16px,4vw,28px);border-radius:28px;background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.08)),var(--sfm-card);display:grid;gap:18px;box-sizing:border-box}.trader-dashboard *{box-sizing:border-box}.trader-dashboard-head{margin:0;align-items:center;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.09));border-radius:22px;padding:14px;min-width:0}.trader-dashboard-head>div{min-width:0}.trader-dashboard-head h2{font-size:clamp(24px,5vw,34px);line-height:1.15}.trader-head-icon,.trader-tool-card-head span{width:42px;height:42px;border-radius:16px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.14);color:var(--sfm-soft-cyan);border:1px solid rgba(47,214,192,.22)}.tool-tabs{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tool-tabs::-webkit-scrollbar{display:none}.tool-tabs button{flex:0 0 auto;white-space:nowrap;min-height:42px;border-radius:16px;padding:0 14px;font-size:13px;max-width:none}.trader-tool-grid{grid-template-columns:1fr;gap:16px;min-width:0}.trader-tool-card{width:100%;max-width:100%;overflow:hidden;border-radius:24px;padding:18px;gap:16px;background:var(--sfm-card);border-color:rgba(47,214,192,.16);box-shadow:0 10px 30px rgba(3,18,37,.06)}.trader-tool-card-head{display:flex;align-items:center;gap:10px;min-width:0}.trader-tool-card-head h3{font-size:clamp(18px,4vw,22px);line-height:1.35;min-width:0;overflow-wrap:anywhere}.trader-form-grid{grid-template-columns:1fr;gap:14px;min-width:0}.tool-input{width:100%;max-width:100%;display:grid!important;grid-template-columns:1fr!important;gap:8px;min-width:0;align-items:start}.tool-input span{display:block;color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.55;text-align:start}.tool-input input,.tool-input select{width:100%;max-width:100%;min-width:0;height:50px;border:1px solid rgba(167,243,240,.24);border-radius:16px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 14px;font:900 16px Tajawal,Arial,sans-serif;outline:0;box-shadow:none}.tool-input input:focus,.tool-input select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}.tool-input input[dir="ltr"]{text-align:left;direction:ltr;unicode-bidi:isolate}.tool-results{display:grid;gap:10px;border-top:1px solid rgba(167,243,240,.14);padding-top:14px;min-width:0}.tool-results-title{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-result-grid{grid-template-columns:1fr;gap:10px;min-width:0}.tool-result-card{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:18px;padding:13px 14px}.tool-result-card span{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.45;text-align:start}.tool-result-card b{color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.3;overflow-wrap:anywhere;text-align:start}.tool-warning{display:block;margin:0;border-radius:16px;padding:12px 14px;font-size:13px;line-height:1.75}.dark .trader-tool-card{background:#0f1d31;border-color:#1d3050}.dark .tool-input input,.dark .tool-input select,.dark .tool-result-card{background:#0a1422;border-color:#1d3050;color:#e8eef6}@media(min-width:640px){.tool-result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:760px){.trader-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1180px){.trader-tool-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}[dir="rtl"] .trader-dashboard,[dir="rtl"] .trader-tool-card,[dir="rtl"] .tool-input span,[dir="rtl"] .tool-result-card span{text-align:right}[dir="rtl"] .tool-result-card b{text-align:left}[dir="ltr"] .trader-dashboard,[dir="ltr"] .trader-tool-card,[dir="ltr"] .tool-input span,[dir="ltr"] .tool-result-card span,[dir="ltr"] .tool-result-card b{text-align:left}
        .trader-dashboard-head{justify-content:space-between;gap:14px}.trader-dashboard-head small{margin-inline-start:auto;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:950;line-height:1.3;white-space:nowrap}.trader-tool-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px}.trader-tool-card{grid-column:span 4;border-radius:26px;padding:20px;background:linear-gradient(135deg,rgba(255,255,255,.70),rgba(234,246,255,.52)),var(--sfm-card);border-color:rgba(47,214,192,.18);box-shadow:0 16px 38px rgba(3,18,37,.08);align-content:start}.trader-tool-card-head{align-items:flex-start;justify-content:space-between;gap:12px;border:1px solid rgba(47,214,192,.14);background:rgba(47,214,192,.07);border-radius:20px;padding:12px}.trader-tool-card-head>div{display:grid;gap:5px;min-width:0}.trader-tool-card-head h3{margin:0;color:var(--sfm-foreground);font-size:clamp(17px,1.4vw,21px);font-weight:950;line-height:1.35}.trader-tool-card-head p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.7}.tool-reset{min-height:36px;border:1px solid rgba(47,214,192,.24);border-radius:999px;background:var(--sfm-card);color:var(--sfm-primary-hover);padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.tool-reset:hover,.tool-reset:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14);background:rgba(47,214,192,.12)}.tool-input{gap:8px}.tool-input span{color:var(--sfm-foreground);font-size:12px;font-weight:950;letter-spacing:0}.tool-input small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.6}.tool-input-shell,.market-currency-input{width:100%;min-height:56px;display:flex;align-items:center;gap:10px;border:1px solid rgba(47,214,192,.22);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.84),rgba(234,246,255,.58)),var(--sfm-card);padding:0 10px;box-shadow:0 12px 26px rgba(3,18,37,.06);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.tool-input-shell:focus-within,.market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16),0 14px 30px rgba(3,18,37,.09)}.tool-input-shell em,.market-input-affix{flex:0 0 auto;min-width:48px;text-align:center;border:1px solid rgba(47,214,192,.24);background:linear-gradient(135deg,rgba(47,214,192,.13),rgba(29,140,255,.08));color:var(--sfm-primary-hover);border-radius:14px;padding:8px 10px;font-style:normal;font-size:11px;font-weight:950;line-height:1.2;white-space:nowrap}.tool-input .tool-input-shell input,.tool-input .tool-input-shell select,.tool-input .market-currency-input input{height:54px!important;width:100%;min-width:0;border:0!important;background:transparent!important;color:var(--sfm-foreground);padding:0!important;box-shadow:none!important;font:950 16px Tajawal,Arial,sans-serif;outline:0}.tool-input .tool-input-shell input[dir="ltr"],.tool-input .market-currency-input input{text-align:left;direction:ltr;unicode-bidi:isolate}.tool-input-shell.select{padding-inline-end:12px}.tool-input-shell.select select{cursor:pointer}.market-scenario-currency{flex:0 0 auto}.market-scenario-currency>span{display:none}.market-scenario-currency-trigger{height:38px;min-width:54px;border-radius:14px}.tool-results{border:1px solid rgba(47,214,192,.16);border-radius:24px;background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07)),var(--sfm-light-card);padding:14px;display:grid;gap:12px}.tool-results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.tool-results-head small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.55}.tool-results-title{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-result-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tool-result-card{position:relative;overflow:hidden;min-height:96px;border-radius:20px;padding:15px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(234,246,255,.62)),var(--sfm-card);border:1px solid rgba(47,214,192,.18);box-shadow:0 12px 28px rgba(3,18,37,.06)}.tool-result-card:before{content:"";position:absolute;inset-inline-start:0;top:14px;bottom:14px;width:3px;border-radius:999px;background:linear-gradient(180deg,var(--sfm-primary),var(--sfm-accent))}.tool-result-card span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.4}.tool-result-card b{color:var(--sfm-foreground);font-size:clamp(18px,1.7vw,25px);font-weight:950;line-height:1.2;letter-spacing:0;direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere}.scenario-grid .metric,.portfolio-metric-grid .metric{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(234,246,255,.58)),var(--sfm-card);border-color:rgba(47,214,192,.18);box-shadow:0 10px 26px rgba(3,18,37,.05);padding:14px}.scenario-grid .metric:before,.portfolio-metric-grid .metric:before{content:"";position:absolute;inset-inline-start:0;top:12px;bottom:12px;width:3px;border-radius:999px;background:linear-gradient(180deg,var(--sfm-primary),var(--sfm-accent))}.scenario-grid .metric span,.portfolio-metric-grid .metric span{font-size:11px;color:var(--sfm-muted);font-weight:950}.scenario-grid .metric strong,.portfolio-metric-grid .metric strong{font-size:clamp(16px,1.4vw,21px);font-weight:950;direction:ltr;unicode-bidi:isolate;line-height:1.25}.dark .trader-dashboard-head small,.dark .tool-reset,.dark .tool-input-shell em,.dark .market-input-affix{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .trader-tool-card{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .trader-tool-card-head,.dark .tool-input-shell,.dark .market-currency-input,.dark .tool-result-card,.dark .scenario-grid .metric,.dark .portfolio-metric-grid .metric{background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.05)),#0a1422;border-color:#1d3050}.dark .tool-results{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .tool-input .tool-input-shell input,.dark .tool-input .tool-input-shell select,.dark .tool-input .market-currency-input input{color:#e8eef6}
        .trader-dashboard .tool-input{width:100%;max-width:100%;min-width:0;display:grid;grid-template-columns:1fr;gap:9px}.trader-dashboard .tool-input>span,.market-tools-grid .tool-input>span{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45}.trader-dashboard .tool-input small,.market-tools-grid .tool-input small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.65}.trader-dashboard .tool-input-shell,.market-tools-grid .market-currency-input{min-width:0;min-height:60px;border-radius:20px;border-color:rgba(47,214,192,.24);background:linear-gradient(135deg,rgba(255,255,255,.90),rgba(234,246,255,.66)),var(--sfm-card);box-shadow:0 14px 32px rgba(3,18,37,.07);padding-inline:12px}.trader-dashboard .tool-input-shell:focus-within,.market-tools-grid .market-currency-input:focus-within{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18),0 18px 36px rgba(3,18,37,.10)}.trader-dashboard .tool-input-shell em,.market-tools-grid .market-input-affix{min-width:54px;min-height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:15px;background:linear-gradient(135deg,rgba(47,214,192,.16),rgba(29,140,255,.10));border-color:rgba(47,214,192,.28);color:var(--sfm-primary-hover);font-size:11px;font-weight:950;font-variant-numeric:tabular-nums}.trader-dashboard .tool-input .tool-input-shell input,.trader-dashboard .tool-input .tool-input-shell select,.market-tools-grid .market-currency-input input{height:58px!important;font-size:16px!important;font-weight:950!important;font-variant-numeric:tabular-nums;letter-spacing:0;color:var(--sfm-foreground)}.trader-dashboard .tool-results{border-radius:26px;padding:16px;background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.085)),var(--sfm-light-card);box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}.trader-dashboard .tool-results-head{padding-bottom:12px;border-bottom:1px solid rgba(47,214,192,.13)}.trader-dashboard .tool-result-grid{gap:12px}.trader-dashboard .tool-result-card{isolation:isolate;display:grid;align-content:space-between;gap:12px;min-height:104px;border-radius:22px;padding:16px;background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(234,246,255,.70)),var(--sfm-card);border-color:rgba(47,214,192,.20);box-shadow:0 14px 32px rgba(3,18,37,.07)}.trader-dashboard .tool-result-card span{font-size:11px;font-weight:950;color:var(--sfm-muted);line-height:1.45}.trader-dashboard .tool-result-card b{display:block;max-width:100%;text-align:left;font-size:clamp(18px,2vw,26px);font-weight:950;line-height:1.2;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere}.market-tools-grid .scenario-grid .metric,.portfolio-metric-grid .metric{min-width:0}.dark .trader-dashboard .tool-input-shell,.dark .market-tools-grid .market-currency-input,.dark .trader-dashboard .tool-result-card{background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(47,214,192,.06)),#0a1422;border-color:#1d3050}.dark .trader-dashboard .tool-results{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}@media(max-width:520px){.trader-dashboard .tool-input-shell,.market-tools-grid .market-currency-input{min-height:54px;border-radius:18px;padding-inline:8px;gap:7px}.trader-dashboard .tool-input-shell em,.market-tools-grid .market-input-affix{min-width:42px;min-height:34px;padding-inline:7px;font-size:10px}.market-scenario-currency-trigger{min-width:48px;height:34px;padding-inline:7px}.trader-dashboard .tool-input .tool-input-shell input,.trader-dashboard .tool-input .tool-input-shell select,.market-tools-grid .market-currency-input input{height:52px!important;font-size:15px!important}.trader-dashboard .tool-results{padding:13px;border-radius:22px}.trader-dashboard .tool-result-card{min-height:88px;padding:14px;border-radius:18px}.trader-dashboard .tool-result-card b{font-size:17px}.trader-dashboard,.trader-tool-card,.tool-result-grid{width:100%;max-width:100%;min-width:0;overflow:hidden}}
        .trader-currency-bar{display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:14px;align-items:end;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(234,246,255,.55)),var(--sfm-light-card);border-radius:24px;padding:14px;min-width:0}.trader-currency-action{display:grid;justify-items:start;align-content:end;gap:8px;min-width:0}.trader-currency-action button{min-height:46px;border:1px solid rgba(47,214,192,.26);border-radius:999px;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));color:var(--sfm-primary-hover);padding:0 16px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(3,18,37,.06)}.trader-currency-action button:hover,.trader-currency-action button:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14),0 12px 26px rgba(3,18,37,.08)}.trader-currency-action button:disabled{opacity:.72;cursor:not-allowed}.trader-currency-action small{font-size:12px;font-weight:900;line-height:1.45}.trader-currency-action small.success{color:#047857}.trader-currency-action small.error{color:#B91C1C}.trader-active-tool{display:grid;gap:16px;min-width:0}.trader-active-intro{display:grid;gap:6px;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.08)),var(--sfm-light-card);border-radius:24px;padding:16px;min-width:0}.trader-active-intro span{color:var(--sfm-primary-hover);font-size:11px;font-weight:950;line-height:1.4}.trader-active-intro h3{margin:0;color:var(--sfm-foreground);font-size:clamp(20px,2.5vw,28px);font-weight:950;line-height:1.25}.trader-active-intro p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.trader-dashboard .trader-tool-grid{grid-template-columns:minmax(0,1.18fr) minmax(300px,.82fr);gap:16px;align-items:start}.trader-dashboard .trader-tool-card,.trader-dashboard .trader-result-stack{grid-column:auto;min-width:0}.trader-result-stack{display:grid;gap:14px;align-content:start;min-width:0}.tool-formula-card{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.08)),var(--sfm-card);border-radius:24px;padding:15px;box-shadow:0 10px 28px rgba(3,18,37,.05);min-width:0}.tool-formula-card>span{width:38px;height:38px;border-radius:15px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.13);border:1px solid rgba(47,214,192,.22);color:var(--sfm-soft-cyan)}.tool-formula-card div{display:grid;gap:6px;min-width:0}.tool-formula-card strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.tool-formula-card p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.75}.tool-formula-card b{display:block;width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.35;overflow-wrap:anywhere;white-space:normal}.tool-advanced{grid-column:1/-1;border:1px solid rgba(47,214,192,.16);background:rgba(47,214,192,.06);border-radius:20px;padding:10px;min-width:0}.tool-advanced summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;color:var(--sfm-foreground);font-size:13px;font-weight:950;cursor:pointer;list-style:none}.tool-advanced summary::-webkit-details-marker{display:none}.tool-advanced summary:after{content:"+";width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);font-weight:950}.tool-advanced[open] summary{margin-bottom:12px}.tool-advanced[open] summary:after{content:"−"}.trader-disclaimer{margin:0;border:1px solid rgba(29,140,255,.18);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.06)),var(--sfm-card);border-radius:22px;padding:13px 15px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.dark .trader-currency-bar,.dark .trader-active-intro,.dark .tool-formula-card,.dark .trader-disclaimer{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050}.dark .tool-advanced{background:#0a1422;border-color:#1d3050}.dark .tool-formula-card b{background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25);color:#2FD6C0}.dark .trader-currency-action small.success{color:#2FD6C0}.dark .trader-currency-action small.error{color:#FF5B6E}@media(max-width:1180px){.trader-dashboard .trader-tool-grid,.trader-currency-bar{grid-template-columns:1fr}.trader-dashboard .trader-tool-card,.trader-dashboard .trader-result-stack{grid-column:1/-1}}@media(max-width:720px){.trader-currency-action{justify-items:stretch}.trader-currency-action button{width:100%;min-height:44px}.tool-formula-card{display:grid}.tool-formula-card b{width:100%}.trader-active-intro,.trader-currency-bar{border-radius:20px;padding:13px}}
        .trader-premium-dashboard{width:100%;max-width:1400px;margin-inline:auto;display:grid;gap:18px;min-width:0;overflow:hidden}.trader-premium-header{display:flex;align-items:center;gap:16px;min-width:0;border:1px solid rgba(47,214,192,.18);border-radius:30px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(234,246,255,.68)),var(--sfm-card);box-shadow:0 18px 46px rgba(3,18,37,.08);padding:clamp(18px,2vw,26px)}.trader-premium-header-icon,.trader-premium-tool-icon,.trader-support-icon,.trader-accordion-icon{width:46px;height:46px;border-radius:18px;display:grid;place-items:center;flex:0 0 auto;color:#fff;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));box-shadow:0 14px 28px rgba(29,140,255,.18)}.trader-premium-header span:not(.trader-premium-header-icon),.trader-premium-main-head span:not(.trader-premium-tool-icon){color:var(--sfm-primary-hover);font-size:12px;font-weight:950;line-height:1.35}.trader-premium-header h2,.trader-premium-main-head h3{margin:4px 0 0;color:var(--sfm-foreground);font-size:clamp(24px,3.2vw,36px);font-weight:950;line-height:1.2}.trader-premium-header p,.trader-premium-main-head p,.trader-support-card p{margin:7px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.trader-premium-layout{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);grid-template-areas:"support main";gap:18px;align-items:start;min-width:0}.trader-support-column{grid-area:support;display:grid;gap:14px;min-width:0}.trader-premium-main-card{grid-area:main;display:grid;gap:16px;min-width:0;border:1px solid rgba(47,214,192,.18);border-radius:30px;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(234,246,255,.66)),var(--sfm-card);box-shadow:0 18px 46px rgba(3,18,37,.08);padding:clamp(16px,2vw,24px);overflow:hidden}.trader-support-card{display:flex;gap:13px;min-width:0;border:1px solid rgba(47,214,192,.16);border-radius:24px;background:linear-gradient(135deg,rgba(255,255,255,.86),rgba(234,246,255,.58)),var(--sfm-card);box-shadow:0 12px 30px rgba(3,18,37,.06);padding:16px}.trader-support-card.highlight{background:linear-gradient(135deg,rgba(29,140,255,.11),rgba(47,214,192,.12)),var(--sfm-card);border-color:rgba(47,214,192,.28)}.trader-support-icon{width:38px;height:38px;border-radius:15px}.trader-support-card h3{margin:0;color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.4}.trader-side-result-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}.trader-side-stat{border:1px solid rgba(47,214,192,.14);border-radius:16px;background:rgba(255,255,255,.72);padding:11px;display:grid;gap:5px}.trader-side-stat span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.3}.trader-side-stat b{color:var(--sfm-primary-hover);font-size:20px;font-weight:950;line-height:1.2;text-align:start}.trader-steps{margin:10px 0 0;padding-inline-start:20px;color:var(--sfm-muted);display:grid;gap:8px;font-size:13px;font-weight:850;line-height:1.7}.trader-premium-main-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;min-width:0;border:1px solid rgba(47,214,192,.14);border-radius:24px;background:rgba(47,214,192,.07);padding:14px}.trader-premium-tool-icon{width:42px;height:42px;border-radius:16px}.trader-premium-main-head h3{font-size:clamp(20px,2.4vw,28px)}.trader-premium-save{display:grid;gap:6px;justify-items:end;min-width:180px}.trader-premium-save button{border:1px solid rgba(47,214,192,.28);border-radius:999px;background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);min-height:40px;padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .2s ease,transform .2s ease,border-color .2s ease}.trader-premium-save button:hover{background:rgba(47,214,192,.18);border-color:rgba(47,214,192,.42);transform:translateY(-1px)}.trader-premium-save button:disabled{cursor:wait;opacity:.72;transform:none}.trader-premium-save small{font-size:11px;font-weight:900;line-height:1.35}.trader-premium-save small.success{color:#047857}.trader-premium-save small.error{color:#DC2626}.trader-accordion-list{display:grid;gap:12px;min-width:0}.trader-accordion-item{min-width:0;border:1px solid rgba(47,214,192,.15);border-radius:22px;background:rgba(255,255,255,.76);box-shadow:0 10px 26px rgba(3,18,37,.05);overflow:hidden}.trader-accordion-item.active{background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(234,246,255,.68));border-color:rgba(47,214,192,.34);box-shadow:0 16px 38px rgba(3,18,37,.08)}.trader-accordion-item>button{width:100%;border:0;background:transparent;color:var(--sfm-foreground);display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;text-align:start;padding:14px;cursor:pointer}.trader-accordion-icon{width:38px;height:38px;border-radius:15px}.trader-accordion-copy{display:grid;gap:4px;min-width:0}.trader-accordion-copy strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.35}.trader-accordion-copy small{color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.55;overflow-wrap:anywhere}.trader-accordion-chevron{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(47,214,192,.12);color:var(--sfm-primary-hover);font-weight:950;transition:transform .2s ease}.trader-accordion-item.active .trader-accordion-chevron{transform:rotate(180deg)}.trader-accordion-panel{border-top:1px solid rgba(47,214,192,.14);padding:14px;background:rgba(234,246,255,.35);min-width:0}.trader-premium-panel-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.78fr);gap:14px;align-items:start;min-width:0}.trader-premium-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.trader-premium-result-stack{gap:12px}.trader-highlight-result{border:1px solid rgba(47,214,192,.32);border-radius:22px;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));box-shadow:inset 0 1px 0 rgba(255,255,255,.55);padding:15px;display:grid;gap:7px}.trader-highlight-result span{color:var(--sfm-primary-hover);font-size:12px;font-weight:950}.trader-highlight-result strong{color:#047857;font-size:clamp(30px,4vw,42px);font-weight:950;line-height:1}.trader-highlight-result p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.75}.trader-highlight-result b{color:var(--sfm-foreground)}.trader-premium-disclaimer{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(29,140,255,.18);border-radius:26px;background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.06)),var(--sfm-card);box-shadow:0 12px 32px rgba(3,18,37,.06);padding:17px 18px}.trader-premium-disclaimer>span{width:40px;height:40px;border-radius:16px;display:grid;place-items:center;color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.16);flex:0 0 auto}.trader-premium-disclaimer strong{display:block;color:var(--sfm-foreground);font-size:14px;font-weight:950;margin-bottom:4px}.trader-premium-disclaimer p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}.dark .trader-premium-header,.dark .trader-premium-main-card,.dark .trader-support-card,.dark .trader-accordion-item,.dark .trader-premium-disclaimer{background:linear-gradient(135deg,rgba(29,140,255,.10),rgba(47,214,192,.07)),#0f1d31;border-color:#1d3050;box-shadow:0 18px 46px rgba(0,0,0,.28)}.dark .trader-premium-main-head,.dark .trader-accordion-panel{background:rgba(47,214,192,.08);border-color:#1d3050}.dark .trader-accordion-item.active{background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.10)),#0f1d31;border-color:rgba(47,214,192,.32)}.dark .trader-side-stat{background:#0a1422;border-color:#1d3050}.dark .trader-highlight-result{background:linear-gradient(135deg,rgba(29,140,255,.16),rgba(47,214,192,.14)),#0a1422;border-color:rgba(47,214,192,.30);box-shadow:none}.dark .trader-highlight-result strong,.dark .trader-side-stat b,.dark .trader-premium-save small.success{color:#2FD6C0}.dark .trader-premium-save small.error{color:#FF5B6E}.dark .trader-premium-save button{background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25);color:#2FD6C0}.dark .trader-premium-save button:hover{background:rgba(47,214,192,.18);border-color:rgba(47,214,192,.42)}@media(max-width:1180px){.trader-premium-layout{grid-template-columns:1fr;grid-template-areas:"main" "support"}.trader-premium-panel-grid{grid-template-columns:1fr}.trader-premium-main-head{grid-template-columns:auto minmax(0,1fr)}.trader-premium-save{grid-column:1/-1;justify-items:stretch;min-width:0}.trader-premium-save button{width:100%}}@media(max-width:720px){.trader-premium-header,.trader-support-card,.trader-premium-main-card,.trader-premium-disclaimer{border-radius:22px}.trader-premium-header{align-items:flex-start}.trader-premium-form-grid{grid-template-columns:1fr}.trader-accordion-item>button{grid-template-columns:auto minmax(0,1fr) auto;padding:12px}.trader-accordion-copy small{display:none}.trader-accordion-panel{padding:12px}.trader-premium-main-head{border-radius:20px;padding:12px}.trader-premium-header h2{font-size:25px}.trader-side-result-grid{grid-template-columns:1fr}.trader-support-column{order:2}}
        .performance-card-list{display:none}.performance-table-desktop{display:block}.trader-table-wrap{width:100%;max-width:100%;overflow-x:auto;border:1px solid rgba(167,243,240,.14);border-radius:18px;-webkit-overflow-scrolling:touch}.trader-table{display:table;width:100%;min-width:760px;border-collapse:separate;border-spacing:0 8px;padding:8px}.trader-table th{padding:12px 16px;color:var(--sfm-muted);font-size:13px;font-weight:950;line-height:1.35;text-align:start;white-space:nowrap}.trader-table td{padding:13px 16px;background:var(--sfm-light-card);color:var(--sfm-foreground);font-size:13px;font-weight:900;line-height:1.45;white-space:nowrap;vertical-align:middle}.trader-table tbody tr td:first-child{border-start-start-radius:14px;border-end-start-radius:14px}.trader-table tbody tr td:last-child{border-start-end-radius:14px;border-end-end-radius:14px}.performance-symbol{display:inline-flex;direction:ltr;unicode-bidi:isolate;font-weight:950;letter-spacing:.02em}.performance-value{display:inline-flex;direction:ltr;unicode-bidi:isolate;font-weight:950}.performance-trend{display:inline-flex;align-items:center;justify-content:center;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2;white-space:nowrap}.performance-trend.bullish{background:#CCFBF1;color:#047857;border-color:rgba(15,118,110,.20)}.performance-trend.bearish{background:#FEE2E2;color:#DC2626;border-color:rgba(220,38,38,.20)}.performance-trend.neutral{background:rgba(148,163,184,.12);color:var(--sfm-muted);border-color:rgba(148,163,184,.20)}.performance-card{width:100%;max-width:100%;min-width:0;overflow:hidden;border:1px solid rgba(167,243,240,.16);border-radius:20px;background:var(--sfm-card);padding:15px;box-shadow:0 10px 26px rgba(3,18,37,.06)}.performance-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}.performance-card-head div{display:grid;gap:4px;min-width:0}.performance-card-head strong{color:var(--sfm-foreground);font-size:17px;font-weight:950;line-height:1.2;direction:ltr;unicode-bidi:isolate;text-align:start}.performance-card-head span{color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.45;overflow-wrap:anywhere}.performance-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.performance-metric{min-width:0;border:1px solid rgba(167,243,240,.12);border-radius:15px;background:var(--sfm-light-card);padding:11px;display:grid;gap:5px}.performance-metric span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}.performance-metric b{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.3;direction:ltr;unicode-bidi:isolate;text-align:start;overflow-wrap:anywhere}.performance-metric b.up,.performance-value.up{color:#047857}.performance-metric b.down,.performance-value.down{color:#DC2626}.dark .trader-table td,.dark .performance-card{background:#0f1d31;border-color:#1d3050}.dark .performance-metric{background:#0a1422;border-color:#1d3050}.dark .performance-trend.bullish{background:rgba(47,214,192,.12);color:#2FD6C0;border-color:rgba(47,214,192,.25)}.dark .performance-trend.bearish{background:rgba(255,91,110,.12);color:#FF5B6E;border-color:rgba(255,91,110,.25)}.dark .performance-metric b.up,.dark .performance-value.up{color:#2FD6C0}.dark .performance-metric b.down,.dark .performance-value.down{color:#FF5B6E}
        .market-status-card{display:flex;align-items:center;gap:13px;min-width:0;border:1px solid rgba(47,214,192,.16);border-radius:24px;background:linear-gradient(135deg,rgba(29,140,255,.045),rgba(47,214,192,.07)),var(--sfm-card);box-shadow:0 12px 32px rgba(3,18,37,.06);padding:16px}.market-status-card>span{width:42px;height:42px;border-radius:16px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.20);color:var(--sfm-soft-cyan)}.market-status-card div{display:grid;gap:5px;min-width:0}.market-status-card small{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.35}.market-status-card strong{color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.3;min-width:0;overflow-wrap:anywhere}.market-status-banner{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(34,197,94,.22);background:rgba(34,197,94,.08);color:#15803D;border-radius:24px;padding:15px 17px;box-shadow:0 8px 26px rgba(3,18,37,.05)}.market-status-banner.preparing{border-color:rgba(47,214,192,.22);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.08));color:var(--sfm-primary-hover)}.market-status-banner svg{flex:0 0 auto;margin-top:2px}.market-status-banner strong{display:block;color:inherit;font-size:14px;font-weight:950;line-height:1.4}.market-status-banner p{margin:4px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.7}.technical-analysis-panel{width:100%;max-width:100%;border-radius:30px!important;padding:clamp(16px,2.2vw,28px)!important;background:linear-gradient(135deg,rgba(255,255,255,.72),rgba(234,246,255,.62)),var(--sfm-card)!important;border-color:rgba(47,214,192,.18)!important;box-shadow:0 18px 46px rgba(3,18,37,.08)!important}.technical-analysis-panel .market-section-head{align-items:center;border:1px solid rgba(47,214,192,.16);background:rgba(47,214,192,.07);border-radius:22px;padding:14px;margin-bottom:0}.technical-analysis-panel .market-section-head>svg{width:42px;height:42px;border-radius:16px;padding:10px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.18)}.technical-selector-shell{background:var(--sfm-card)!important;border-radius:24px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}.technical-category-row,.technical-symbol-row{flex-wrap:wrap;overflow:visible;padding-bottom:2px}.technical-category-row button{min-height:44px;padding:0 17px;font-size:13px}.technical-symbol-pill{min-height:44px}.technical-selected-summary{border:1px solid rgba(47,214,192,.16);background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.07));border-radius:24px;padding:12px}.technical-summary-item{display:flex;align-items:center;gap:10px;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:18px;padding:13px}.technical-summary-item>span{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;flex:0 0 auto;background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan)}.technical-summary-item div{display:grid;gap:4px;min-width:0}.technical-summary-item small{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.35}.technical-summary-item strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.technical-empty-state{display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(245,158,11,.28);background:rgba(245,158,11,.11);border-radius:22px;padding:16px;color:#92400E}.technical-empty-state svg{flex:0 0 auto;margin-top:2px}.technical-empty-state strong{display:block;color:#78350F;font-size:15px;font-weight:950;line-height:1.5}.technical-empty-state p{margin:5px 0 0;color:#92400E;font-size:13px;font-weight:850;line-height:1.8}.technical-data-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.technical-data-card{display:grid;gap:12px;align-content:start;min-width:0;border:1px solid rgba(167,243,240,.15);background:var(--sfm-card);border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(3,18,37,.05)}.technical-data-card-head{display:flex;align-items:center;gap:9px;min-width:0}.technical-data-card-head span{width:34px;height:34px;border-radius:13px;display:grid;place-items:center;background:rgba(47,214,192,.12);color:var(--sfm-soft-cyan);border:1px solid rgba(47,214,192,.20);flex:0 0 auto}.technical-data-card h3{margin:0;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.technical-data-card>strong{color:var(--sfm-foreground);font-size:23px;font-weight:950;line-height:1.2}.technical-data-rows{display:grid;gap:8px}.technical-data-rows div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:14px;padding:9px 10px}.technical-data-rows small{color:var(--sfm-muted);font-size:11px;font-weight:950}.technical-data-rows b{color:var(--sfm-foreground);font-size:13px;font-weight:950}.market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:17px 18px;color:var(--sfm-muted);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.06)),var(--sfm-card);border-color:rgba(29,140,255,.18);border-radius:24px}.market-disclaimer svg{color:var(--sfm-primary-hover);flex:0 0 auto}.market-disclaimer strong{display:block;color:var(--sfm-foreground);margin-bottom:4px}.market-disclaimer p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.7;font-weight:800}.dark .technical-analysis-panel{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.07)),#0f1d31!important;border-color:#1d3050!important}.dark .market-status-card,.dark .technical-summary-item,.dark .technical-data-card{background:#0f1d31;border-color:#1d3050}.dark .technical-selector-shell,.dark .technical-search,.dark .technical-data-rows div{background:#0a1422!important;border-color:#1d3050}.dark .market-status-banner.connected{color:#2FD6C0;background:rgba(47,214,192,.10);border-color:rgba(47,214,192,.24)}.dark .technical-empty-state{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.26);color:#F5B942}.dark .technical-empty-state strong{color:#FDE68A}.dark .technical-empty-state p{color:#F5B942}
        @media(max-width:1180px){.market-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.technical-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid,.market-decision-grid,.market-tools-grid,.trader-tool-grid{grid-template-columns:1fr}.trader-tool-card{grid-column:1/-1}.market-chart{grid-row:auto}.market-search-panel{grid-template-columns:1fr 1fr}}
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
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0;
          margin: 0 !important;
          padding: 24px 24px 36px !important;
          box-sizing: border-box;
          justify-items: stretch;
          gap: 18px;
        }

        @media (min-width: 1025px) {
          [dir="rtl"].market-shell .market-main {
            padding-inline-start: 32px !important;
            padding-inline-end: calc(var(--sidebar-w, 230px) + 32px) !important;
          }

          [dir="ltr"].market-shell .market-main {
            padding-inline-start: calc(var(--sidebar-w, 230px) + 32px) !important;
            padding-inline-end: 32px !important;
          }
        }

        .market-main > * {
          box-sizing: border-box;
          width: 100%;
          max-width: 1400px;
          min-width: 0;
          margin-inline: auto;
        }

        .market-hero {
          position: relative !important;
          z-index: 5 !important;
          isolation: isolate;
        }

        .market-hero:before {
          z-index: 0;
          pointer-events: none;
        }

        .market-hero-copy,
        .market-hero-card,
        .market-search-panel {
          position: relative;
          z-index: 2;
        }

        .market-search-field,
        .market-search-combobox,
        .market-search-results {
          isolation: isolate;
        }

        .market-status-grid,
        .market-status-banner,
        .market-active-dashboard,
        .market-layout {
          position: relative;
          z-index: 1;
          isolation: isolate;
        }

        .market-panel.market-chart,
        .market-chart,
        .price-history-chart,
        .market-chart .levels-strip,
        .levels-bar {
          position: relative !important;
          isolation: isolate;
          overflow: hidden !important;
          contain: paint;
        }

        .market-chart .market-section-head,
        .market-chart-controls,
        .price-history-chart > * {
          position: relative;
          z-index: 1;
        }

        .price-history-chart svg {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow: hidden !important;
          contain: paint;
        }

        .price-chart-tooltip {
          z-index: 4;
          max-width: min(260px, calc(100% - 24px));
          max-height: calc(100% - 24px);
          overflow: hidden;
        }

        .levels-strip-labels,
        .levels-strip-labels > span {
          min-width: 0;
        }

        .levels-bar > span {
          max-width: calc(100% - 16px);
          z-index: 1;
        }

        .levels-bar em {
          max-width: 128px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .market-active-dashboard {
          width: 100%;
          max-width: 1400px;
          min-width: 0;
          margin-inline: auto;
          display: grid;
          gap: 20px;
          align-items: stretch;
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

        .trader-premium-layout.performance-layout {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "main";
        }

        .performance-layout .trader-premium-main-card,
        .performance-table-section {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .market-active-dashboard > .market-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }

        .market-active-dashboard .market-card {
          height: 100%;
          min-height: 148px;
          min-width: 0;
        }

        .performance-table-section {
          display: grid;
          gap: 14px;
        }

        .performance-table-wrap {
          border-radius: 28px;
          border: 1px solid rgba(47, 214, 192, .18);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(234, 246, 255, .58)),
            var(--sfm-card);
          box-shadow: 0 18px 46px rgba(3, 18, 37, .08);
          padding: 8px;
        }

        .performance-table {
          border-spacing: 0 10px;
          padding: 6px;
        }

        .performance-table th {
          background: transparent;
          color: #475569;
          font-size: 12px;
          letter-spacing: 0;
        }

        .performance-table td {
          background: rgba(255, 255, 255, .92);
          border-block: 1px solid rgba(47, 214, 192, .12);
          box-shadow: 0 8px 22px rgba(3, 18, 37, .045);
        }

        .performance-table td:first-child {
          border-inline-start: 1px solid rgba(47, 214, 192, .12);
        }

        .performance-table td:last-child {
          border-inline-end: 1px solid rgba(47, 214, 192, .12);
        }

        .performance-table tbody tr {
          transition: transform .18s ease, filter .18s ease;
        }

        .performance-table tbody tr:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 10px 22px rgba(29, 140, 255, .08));
        }

        .dark .performance-table-wrap {
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: #1d3050;
          box-shadow: 0 18px 46px rgba(0, 0, 0, .24);
        }

        .dark .performance-table th {
          color: #b8c7d9;
        }

        .dark .performance-table td {
          background: #10243a;
          border-color: #1d3050;
          box-shadow: none;
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

        .market-shell {
          background:
            radial-gradient(circle at 92% 0%, rgba(47, 214, 192, .12), transparent 30%),
            radial-gradient(circle at 8% 12%, rgba(29, 140, 255, .10), transparent 28%),
            linear-gradient(180deg, #f8fbff 0%, #eef7ff 46%, #f8fbff 100%) !important;
          color: #0f172a !important;
        }

        .market-main {
          background: transparent !important;
          gap: 18px !important;
        }

        .market-main > *,
        .market-active-dashboard,
        .news-sentiment-section {
          max-width: 1400px !important;
        }

        .market-active-dashboard {
          gap: 16px !important;
          border-radius: 26px !important;
          padding: 16px !important;
        }

        .market-hero {
          background:
            radial-gradient(circle at 12% 10%, rgba(47, 214, 192, .18), transparent 32%),
            linear-gradient(135deg, rgba(255, 255, 255, .97), rgba(234, 246, 255, .92) 58%, rgba(224, 242, 254, .88) 130%) !important;
          color: #0f172a !important;
          border-color: rgba(14, 165, 233, .18) !important;
          box-shadow: 0 20px 56px rgba(3, 18, 37, .08) !important;
          grid-template-columns: minmax(0, 1fr) 220px !important;
          align-items: center !important;
          border-radius: 22px !important;
          padding: 20px !important;
          gap: 16px !important;
        }

        .market-hero:before {
          background: rgba(47, 214, 192, .14) !important;
        }

        .market-hero h1 {
          color: #0f172a !important;
          font-size: clamp(26px, 4vw, 40px) !important;
          line-height: 1.08 !important;
          margin-bottom: 8px !important;
        }

        .market-hero p {
          color: #475569 !important;
          font-size: 13px !important;
          line-height: 1.7 !important;
        }

        .market-eyebrow {
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(15, 118, 110, .18) !important;
          color: #0f766e !important;
        }

        .market-search-panel label > span,
        .market-search-field > label {
          color: #0f766e !important;
        }

        .market-hero-card {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .88), rgba(224, 242, 254, .72)) !important;
          border-color: rgba(14, 165, 233, .20) !important;
          color: #0f172a !important;
          box-shadow: 0 16px 36px rgba(3, 18, 37, .08) !important;
          border-radius: 18px !important;
          padding: 14px !important;
          gap: 7px !important;
        }

        .market-hero-card span {
          color: #64748b !important;
        }

        .market-hero-card strong {
          color: #0f172a !important;
          font-size: 34px !important;
        }

        .market-hero-card p,
        .market-hero-card em {
          color: #475569 !important;
        }

        .market-hero-card-icon {
          color: #0f766e !important;
          background: rgba(204, 251, 241, .72) !important;
          border: 1px solid rgba(15, 118, 110, .16) !important;
          box-shadow: 0 12px 24px rgba(15, 118, 110, .10) !important;
        }

        .market-hero-card.empty {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .92), rgba(224, 242, 254, .80)) !important;
          border-color: rgba(14, 165, 233, .22) !important;
        }

        .market-hero-card.empty p {
          color: #475569 !important;
        }

        .market-hero-card.empty button {
          color: #0f766e !important;
          background: rgba(204, 251, 241, .72) !important;
          border-color: rgba(15, 118, 110, .22) !important;
        }

        .market-hero-card.empty button:hover,
        .market-hero-card.empty button:focus-visible {
          color: #fff !important;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)) !important;
          border-color: transparent !important;
        }

        .market-search-panel {
          margin-top: 16px !important;
        }

        .market-status-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .market-status-card {
          border-radius: 18px !important;
          padding: 12px !important;
          gap: 10px !important;
          box-shadow: 0 8px 22px rgba(3, 18, 37, .05) !important;
        }

        .market-status-card > span {
          width: 36px !important;
          height: 36px !important;
          border-radius: 14px !important;
        }

        .market-status-card strong {
          font-size: 15px !important;
        }

        .market-status-card small {
          font-size: 11px !important;
        }

        .dark .market-shell {
          background:
            radial-gradient(circle at 92% 0%, rgba(29, 140, 255, .16), transparent 28%),
            radial-gradient(circle at 12% 10%, rgba(47, 214, 192, .10), transparent 30%),
            #0a1422 !important;
          color: #e8eef6 !important;
        }

        .dark .market-hero {
          background:
            radial-gradient(circle at 12% 10%, rgba(24, 212, 212, .22), transparent 30%),
            linear-gradient(135deg, #071426 0%, #08203a 58%, #0f3650 150%) !important;
          color: #e8eef6 !important;
          border-color: rgba(47, 214, 192, .22) !important;
          box-shadow: 0 24px 64px rgba(0, 0, 0, .32) !important;
        }

        .dark .market-hero:before {
          background: rgba(47, 214, 192, .14) !important;
        }

        .dark .market-hero h1 {
          color: #f8fbff !important;
        }

        .dark .market-hero p {
          color: rgba(232, 238, 246, .72) !important;
        }

        .dark .market-eyebrow {
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .24) !important;
          color: #2fd6c0 !important;
        }

        .dark .market-search-panel label > span,
        .dark .market-search-field > label {
          color: #2fd6c0 !important;
        }

        .dark .market-hero-card {
          background:
            linear-gradient(135deg, rgba(15, 29, 49, .72), rgba(10, 20, 34, .82)) !important;
          border-color: rgba(47, 214, 192, .22) !important;
          color: #e8eef6 !important;
          box-shadow: 0 20px 52px rgba(0, 0, 0, .28) !important;
        }

        .dark .market-hero-card span {
          color: #8ea6c3 !important;
        }

        .dark .market-hero-card strong {
          color: #2fd6c0 !important;
        }

        .dark .market-hero-card p,
        .dark .market-hero-card em {
          color: #b8c7d9 !important;
        }

        .dark .market-hero-card-icon {
          color: #2fd6c0 !important;
          background: rgba(47, 214, 192, .12) !important;
          border-color: rgba(47, 214, 192, .24) !important;
          box-shadow: 0 14px 28px rgba(0, 0, 0, .20) !important;
        }

        .dark .market-hero-card.empty {
          background:
            linear-gradient(135deg, rgba(15, 29, 49, .78), rgba(10, 20, 34, .86)) !important;
          border-color: rgba(47, 214, 192, .24) !important;
        }

        .dark .market-hero-card.empty p {
          color: #b8c7d9 !important;
        }

        .dark .market-hero-card.empty button {
          color: #e8eef6 !important;
          background: rgba(47, 214, 192, .14) !important;
          border-color: rgba(47, 214, 192, .28) !important;
        }

        .dark .market-error-alert {
          background:
            linear-gradient(135deg, rgba(245, 185, 66, .12), rgba(47, 214, 192, .07)),
            #0f1d31;
          border-color: rgba(245, 185, 66, .24);
          color: #F5B942;
        }

        .dark .market-error-alert-icon {
          color: #F5B942;
          background: rgba(245, 185, 66, .13);
          border-color: rgba(245, 185, 66, .26);
        }

        .dark .market-error-alert-copy strong {
          color: #FDE68A;
        }

        .dark .market-error-alert-copy p {
          color: #F5B942;
        }

        .market-dashboard-tabs {
          width: 100% !important;
          max-width: 1400px !important;
          min-width: 0 !important;
          margin-inline: auto !important;
          border-radius: 28px !important;
          padding: 10px !important;
          background:
            linear-gradient(135deg, rgba(29, 140, 255, .055), rgba(47, 214, 192, .075)),
            var(--sfm-card) !important;
          box-shadow: 0 16px 42px rgba(3, 18, 37, .07) !important;
        }

        .market-error-alert {
          width: 100%;
          max-width: 1400px;
          margin-inline: auto;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: start;
          gap: 14px;
          border: 1px solid rgba(245, 158, 11, .26);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(255, 251, 235, .92), rgba(240, 253, 250, .72)),
            var(--sfm-card);
          box-shadow: 0 14px 36px rgba(3, 18, 37, .07);
          padding: 15px;
          color: #92400E;
          min-width: 0;
        }

        .market-error-alert-icon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #B45309;
          background: rgba(245, 158, 11, .14);
          border: 1px solid rgba(245, 158, 11, .22);
          flex: 0 0 auto;
        }

        .market-error-alert-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .market-error-alert-copy strong {
          color: #78350F;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.35;
        }

        .market-error-alert-copy p {
          margin: 0;
          color: #92400E;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.75;
          overflow-wrap: anywhere;
        }

        .market-error-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .market-error-action {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 13px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid transparent;
        }

        .market-error-action.primary {
          background: var(--sfm-foreground);
          color: var(--sfm-card);
        }

        .market-error-action.secondary {
          background: rgba(47, 214, 192, .12);
          color: var(--sfm-primary-hover);
          border-color: rgba(47, 214, 192, .28);
        }

        .market-error-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .market-error-alert .market-suggestion-chips {
          grid-column: 2 / -1;
          flex-basis: auto;
        }

        .market-error-alert .market-suggestion-chips button {
          height: auto;
          min-height: 34px;
          max-width: 100%;
          white-space: normal;
          text-align: start;
          line-height: 1.35;
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
          max-width: 1400px;
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
          align-items: start;
          min-width: 0;
        }

        .news-tool-card {
          min-width: 0;
          align-self: start;
          display: grid;
          gap: 14px;
          align-content: start;
          height: auto;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 26px;
          padding: clamp(15px, 1.8vw, 20px);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, .76), rgba(234, 246, 255, .54)),
            var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .06);
        }

        .sentiment-tool-card {
          min-height: 0;
        }

        .sentiment-tool-card .tool-empty-state {
          min-height: 0;
        }

        .sentiment-tool-card .market-section-loading {
          min-height: 180px;
        }

        .sentiment-context-block {
          display: grid;
          gap: 9px;
          min-width: 0;
          border: 1px solid rgba(47, 214, 192, .16);
          border-radius: 20px;
          background:
            linear-gradient(135deg, rgba(47, 214, 192, .07), rgba(29, 140, 255, .05)),
            var(--sfm-light-card);
          padding: 10px;
        }

        .sentiment-selected-asset {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
          border: 0;
          border-radius: 14px;
          background: rgba(255, 255, 255, .58);
          padding: 8px 10px;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.45;
        }

        .sentiment-selected-asset b {
          color: var(--sfm-foreground);
          font-size: 14px;
          font-weight: 950;
          letter-spacing: .02em;
        }

        .sentiment-selected-asset small {
          min-width: 0;
          overflow-wrap: anywhere;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .sentiment-context-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .sentiment-context-badge {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid rgba(47, 214, 192, .18);
          border-radius: 14px;
          background: rgba(47, 214, 192, .09);
          padding: 8px 10px;
        }

        .sentiment-context-badge.source {
          border-color: rgba(29, 140, 255, .18);
          background: rgba(29, 140, 255, .08);
        }

        .sentiment-context-badge.status.connected {
          border-color: rgba(34, 197, 94, .22);
          background: rgba(34, 197, 94, .08);
        }

        .sentiment-context-badge.status.limited {
          border-color: rgba(245, 158, 11, .24);
          background: rgba(245, 158, 11, .10);
        }

        .sentiment-context-badge.status.timeout {
          border-color: rgba(245, 158, 11, .28);
          background: rgba(245, 158, 11, .12);
        }

        .sentiment-context-badge.status.needs-setup,
        .sentiment-context-badge.status.disconnected {
          border-color: rgba(239, 68, 68, .20);
          background: rgba(239, 68, 68, .07);
        }

        .sentiment-context-badge small {
          min-width: 0;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.3;
        }

        .sentiment-context-badge b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.3;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .sentiment-context-note {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 820;
          line-height: 1.7;
        }

        .sentiment-updated-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(29, 140, 255, .16);
          border-radius: 999px;
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-weight: 950;
        }

        .sentiment-updated-note svg {
          flex: 0 0 auto;
        }

        .sentiment-cache-note {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          max-width: 100%;
          border: 1px solid rgba(245, 158, 11, .22);
          border-radius: 14px;
          background: rgba(245, 158, 11, .09);
          color: #9A5F04;
          padding: 7px 9px;
          font-weight: 900;
        }

        .sentiment-cache-note svg {
          flex: 0 0 auto;
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

        .tool-empty-state small {
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 999px;
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.35;
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

        .sentiment-extra-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .sentiment-extra-metrics span {
          min-width: 0;
          display: grid;
          gap: 3px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 14px;
          background: rgba(29, 140, 255, .055);
          padding: 7px 9px;
        }

        .sentiment-extra-metrics small {
          min-width: 0;
          color: var(--sfm-muted);
          font-size: 10.5px;
          font-weight: 900;
          line-height: 1.35;
        }

        .sentiment-extra-metrics b {
          min-width: 0;
          color: var(--sfm-foreground);
          font-size: 12px;
          font-weight: 950;
          line-height: 1.35;
          overflow-wrap: anywhere;
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

        .sentiment-empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .sentiment-card-actions {
          padding-top: 2px;
        }

        .sentiment-empty-actions button {
          min-height: 36px;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(47, 214, 192, .22);
          border-radius: 999px;
          background: rgba(255, 255, 255, .72);
          color: var(--sfm-primary-hover);
          padding: 8px 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .sentiment-empty-actions button:first-child {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .16);
        }

        .sentiment-empty-actions button:hover,
        .sentiment-empty-actions button:focus-visible {
          transform: translateY(-1px);
          border-color: rgba(29, 140, 255, .30);
          box-shadow: 0 12px 24px rgba(3, 18, 37, .08);
          outline: none;
        }

        .sentiment-empty-actions button:disabled {
          cursor: not-allowed;
          opacity: .62;
          transform: none;
          box-shadow: none;
        }

        .sentiment-empty-actions button:active {
          transform: translateY(0);
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
        .dark .sentiment-selected-asset,
        .dark .tool-empty-state {
          background: #0a1422;
          border-color: #1d3050;
        }

        .dark .sentiment-selected-asset {
          background: rgba(47, 214, 192, .09);
          color: #b8c7d9;
        }

        .dark .sentiment-selected-asset b {
          color: #e8eef6;
        }

        .dark .sentiment-selected-asset small {
          color: #8ea6c3;
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
        .dark .tool-empty-state small,
        .dark .central-news-meta small,
        .dark .central-news-footer small,
        .dark .central-news-card p,
        .dark .sentiment-card-head span,
        .dark .sentiment-card p,
        .dark .sentiment-metrics span,
        .dark .sentiment-extra-metrics small,
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

        .dark .sentiment-context-block,
        .dark .sentiment-selected-asset,
        .dark .sentiment-empty-actions button {
          background: linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)), #0a1422;
          border-color: #1d3050;
        }

        .dark .sentiment-context-badge {
          background: rgba(47, 214, 192, .10);
          border-color: rgba(47, 214, 192, .24);
        }

        .dark .sentiment-context-badge.source {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .24);
        }

        .dark .sentiment-context-badge.status.connected {
          background: rgba(34, 197, 94, .12);
          border-color: rgba(34, 197, 94, .28);
        }

        .dark .sentiment-context-badge.status.limited,
        .dark .sentiment-context-badge.status.timeout,
        .dark .sentiment-cache-note {
          background: rgba(245, 158, 11, .13);
          border-color: rgba(245, 158, 11, .30);
          color: #FCD34D;
        }

        .dark .sentiment-context-badge.status.needs-setup,
        .dark .sentiment-context-badge.status.disconnected {
          background: rgba(239, 68, 68, .12);
          border-color: rgba(239, 68, 68, .26);
        }

        .dark .sentiment-extra-metrics span {
          background: rgba(29, 140, 255, .08);
          border-color: rgba(29, 140, 255, .22);
        }

        .dark .sentiment-empty-actions button:first-child {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #fff;
        }

        @media (max-width: 1180px) {
          .market-active-dashboard > .market-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

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

        @media (max-width: 1024px) {
          .market-shell .market-main {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: calc(88px + env(safe-area-inset-top)) 16px 22px !important;
          }

          .market-main > *,
          .market-active-dashboard,
          .news-sentiment-section {
            max-width: 100% !important;
          }
        }

        @media (max-width: 720px) {
          .market-main {
            gap: 16px !important;
            padding-inline: 14px !important;
          }

          .market-active-dashboard > .market-card-grid {
            grid-template-columns: 1fr;
          }

          .market-hero {
            grid-template-columns: 1fr !important;
            padding: 16px !important;
            border-radius: 20px !important;
          }

          .market-hero-card strong {
            font-size: 30px !important;
          }

          .market-error-alert {
            grid-template-columns: 1fr;
            gap: 11px;
            border-radius: 20px;
            padding: 13px;
          }

          .market-error-alert-icon {
            width: 38px;
            height: 38px;
            border-radius: 14px;
          }

          .market-error-actions,
          .market-error-action {
            width: 100%;
          }

          .market-error-alert .market-suggestion-chips {
            grid-column: 1;
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

          .performance-table-wrap {
            overflow: visible;
            padding: 10px;
            border-radius: 22px;
          }

          .performance-table,
          .performance-table thead,
          .performance-table tbody,
          .performance-table tr,
          .performance-table td {
            display: block;
            width: 100%;
            min-width: 0;
          }

          .performance-table {
            padding: 0;
            border-spacing: 0;
          }

          .performance-table thead {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
          }

          .performance-table tbody {
            display: grid;
            gap: 12px;
          }

          .performance-table tbody tr {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            border: 1px solid rgba(47, 214, 192, .16);
            border-radius: 20px;
            background: rgba(255, 255, 255, .9);
            padding: 12px;
            box-shadow: 0 10px 28px rgba(3, 18, 37, .06);
          }

          .performance-table tbody tr:hover {
            transform: none;
            filter: none;
          }

          .performance-table td,
          .performance-table td:first-child,
          .performance-table td:last-child {
            display: grid;
            gap: 5px;
            border: 1px solid rgba(47, 214, 192, .12);
            border-radius: 15px;
            background: var(--sfm-light-card);
            padding: 11px;
            box-shadow: none;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .performance-table td::before {
            content: attr(data-label);
            color: var(--sfm-muted);
            font-size: 11px;
            font-weight: 950;
            line-height: 1.35;
          }

          .performance-table td:nth-child(2) {
            color: var(--sfm-foreground);
            font-weight: 950;
          }

          .dark .performance-table tbody tr {
            background: #0f1d31;
            border-color: #1d3050;
            box-shadow: none;
          }

          .dark .performance-table td,
          .dark .performance-table td:first-child,
          .dark .performance-table td:last-child {
            background: #0a1422;
            border-color: #1d3050;
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

          .sentiment-tool-card .market-section-loading {
            min-height: 160px;
          }

          .sentiment-context-row {
            grid-template-columns: 1fr;
          }

          .sentiment-extra-metrics {
            grid-template-columns: 1fr;
          }

          .sentiment-empty-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sentiment-empty-actions button {
            width: 100%;
            min-height: 40px;
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

