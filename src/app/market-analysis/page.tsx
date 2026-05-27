'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Brain, Calculator, FileText, LineChart, Plus, Search, ShieldAlert, Sparkles, Star, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { PageTabs } from '@/components/layout/PageTabs';
import { TradingViewChart } from '@/components/market/TradingViewChart';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import type { MarketAiInsight, MarketAnalysis, MarketAssetType, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import { normalizeAssetType, validateSymbol } from '@/lib/market/marketService';

type MarketServiceState = 'checking' | 'connected' | 'slow' | 'not_configured' | 'unavailable';
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

const WATCHLIST_STORAGE_KEY = 'sfm_market_watchlist';
const ALERTS_STORAGE_KEY = 'sfm_market_alerts';
const DEFAULT_MARKET_ASSET = 'AAPL';
const DEFAULT_MARKET_TYPE: MarketAssetType = 'stock';
const MARKET_REQUEST_TIMEOUT_MS = 12000;
const MARKET_SLOW_NOTICE_MS = 5000;
const MARKET_TIMEFRAMES = ['1D', '1W', '1M', '6M', '1Y'] as const;
const QUICK_MARKET_EXAMPLES: MarketSearchItem[] = [
  { symbol: 'AAPL', providerSymbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', providerSymbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', providerSymbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', providerSymbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'SPY', providerSymbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetType: 'etf', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', providerSymbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'etf', exchange: 'NASDAQ' },
  { symbol: 'BTC', providerSymbol: 'BTC-USD', name: 'Bitcoin', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'ETH', providerSymbol: 'ETH-USD', name: 'Ethereum', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'XAU', providerSymbol: 'GC=F', name: 'Gold', assetType: 'gold', exchange: 'COMEX' },
  { symbol: 'EURUSD', providerSymbol: 'EURUSD=X', name: 'Euro / US Dollar', assetType: 'forex', exchange: 'FX' },
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

function normalizeSearchItem(item: MarketSearchItem): MarketSearchItem {
  return {
    ...item,
    symbol: item.symbol.toUpperCase(),
    providerSymbol: item.providerSymbol?.toUpperCase(),
    assetType: normalizeAssetType(item.assetType),
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

export default function MarketAnalysisPage() {
  const { dir, t } = useLanguage();
  const { user, isGuest } = useAuth();
  const [query, setQuery] = useState(DEFAULT_MARKET_ASSET);
  const [assetType, setAssetType] = useState<MarketAssetType | 'all'>(DEFAULT_MARKET_TYPE);
  const [analysis, setAnalysis] = useState<MarketViewAnalysis | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SelectedMarketAsset>({ symbol: DEFAULT_MARKET_ASSET, assetType: DEFAULT_MARKET_TYPE, name: 'Apple Inc.', providerSymbol: DEFAULT_MARKET_ASSET });
  const [searchResults, setSearchResults] = useState<MarketSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [suggestedAssets, setSuggestedAssets] = useState<MarketSearchItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioInvestment[]>([]);
  const [compare, setCompare] = useState<MarketAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<MarketAiInsightView | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [serviceState, setServiceState] = useState<MarketServiceState>('checking');
  const [timeframe, setTimeframe] = useState<typeof MARKET_TIMEFRAMES[number]>('6M');
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [whatIfAmount, setWhatIfAmount] = useState('');
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

  const requestAiInsight = useCallback(async (marketData: MarketAnalysis) => {
    setAiLoading(true);
    setAiError('');
    setAiInsight(null);
    try {
      const result = await fetchJsonWithTimeout<{ success?: boolean; insight?: MarketAiInsightView; error?: string }>('/api/market/ai-insight', 30000, true, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketData }),
      });
      if (result.success && result.insight?.status === 'ready') {
        setAiInsight(result.insight);
      } else {
        setAiInsight(result.insight ?? null);
        setAiError(result.error || t('market_ai_provider_unavailable'));
      }
    } catch {
      setAiInsight(null);
      setAiError(t('market_ai_provider_unavailable'));
    } finally {
      setAiLoading(false);
    }
  }, [t]);

  const requestAnalysis = useCallback(async (symbolInput: string, typeInput: MarketAssetType | 'all', selectedInput?: Partial<SelectedMarketAsset>) => {
    const displaySymbol = validateSymbol(selectedInput?.symbol ?? symbolInput);
    const requestSymbol = validateSymbol(selectedInput?.providerSymbol ?? symbolInput);
    if (!requestSymbol || !displaySymbol) {
      setError(t('market_select_asset_to_start'));
      setAnalysis(null);
      setAiInsight(null);
      setAiError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setSlowLoading(false);
    setError('');
    setNotice('');
    setAiInsight(null);
    setAiError('');
    const slowTimer = window.setTimeout(() => setSlowLoading(true), MARKET_SLOW_NOTICE_MS);
    const normalizedType = typeInput === 'all' ? DEFAULT_MARKET_TYPE : normalizeAssetType(typeInput);
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
      const result = await fetchJsonWithTimeout<MarketResult & { openbbService?: MarketServiceState; source?: string; fallback?: boolean; fallbackReason?: string }>(`/api/market/analyze?${params.toString()}`);
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
      if (!result.success) throw new Error(result.error || t('market_analysis_unavailable'));

      if (hasUsableAnalysis(result)) {
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
        setAnalysis(current => current);
        setError(t('market_analysis_unavailable'));
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (result.openbbService === 'not_configured' || result.openbbService === 'unavailable' || result.openbbService === 'slow') {
        setServiceState(result.openbbService);
      } else if (result.success) {
        setServiceState(result.cached ? 'slow' : 'connected');
      }
    } catch (err) {
      setAnalysis(current => current);
      const message = err instanceof Error && err.name === 'AbortError'
        ? t('market_timeout_error')
        : err instanceof Error
          ? err.message
          : t('market_analysis_unavailable');
      setError(message);
      setNotice('');
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
        const results = (data.results ?? []).map(normalizeSearchItem).slice(0, 12);
        setSearchResults(results);
        setSearchMessage(results.length === 0 ? t('market_symbol_not_found') : '');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
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
        const health = await fetchJsonWithTimeout<{ ok?: boolean; openbbService?: MarketServiceState }>('/api/market/health', 6500, true);
        if (!cancelled) {
          setServiceState(health.openbbService ?? (health.ok ? 'connected' : 'unavailable'));
          if (health.ok) {
            void requestAnalysis(DEFAULT_MARKET_ASSET, DEFAULT_MARKET_TYPE);
          } else {
            setLoading(false);
            setError(health.openbbService === 'not_configured' ? t('market_service_not_configured') : t('market_service_unavailable'));
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
          fetchJsonWithTimeout<{ results?: MarketResult[] }>('/api/market/compare?symbols=AAPL,MSFT,NVDA,BTC&assetType=stock', 12000, true),
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
          .select('id, name, amount, current_value, type, risk_level')
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
        setPortfolio((portfolioResult.value.data ?? []).map(row => {
          const item = row as Record<string, unknown>;
          const amount = parseNumber(item.amount);
          return {
            id: String(item.id ?? ''),
            name: String(item.name ?? ''),
            amount,
            currentValue: parseNumber(item.current_value) || amount,
            type: typeof item.type === 'string' ? item.type : null,
            riskLevel: typeof item.risk_level === 'string' ? item.risk_level : null,
          };
        }));
      } else {
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

  const analyzeSearchSelection = useCallback((item?: MarketSearchItem) => {
    const selectedItem = item ? normalizeSearchItem(item) : searchResults[0];
    if (selectedItem && query.trim().length >= 2) {
      setSearchOpen(false);
      void requestAnalysis(selectedItem.providerSymbol ?? selectedItem.symbol, selectedItem.assetType, {
        symbol: selectedItem.symbol,
        providerSymbol: selectedItem.providerSymbol ?? selectedItem.symbol,
        name: selectedItem.name,
        assetType: selectedItem.assetType,
        exchange: selectedItem.exchange,
      });
      return;
    }

    void requestAnalysis(query, assetType);
  }, [assetType, query, requestAnalysis, searchResults]);

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
    : serviceState === 'slow'
      ? t('market_service_slow')
      : serviceState === 'not_configured'
        ? t('market_service_not_configured')
        : serviceState === 'unavailable'
          ? t('market_service_unavailable')
          : t('loading');
  const heroBadge = t('market_badge_live');
  const chartBadge = t('market_chart_live');
  const selectedDisplayName = selectedAsset.symbol === selected?.symbol ? selectedAsset.name : undefined;
  const localizedAssetName = selectedDisplayName ?? (selected?.name?.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', selected.symbol) : selected?.name);
  const localizedSummary = selected?.summary?.includes('Educational market summary only')
    ? t('market_summary_educational')
    : selected?.summary;
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
  const estimatedUnits = selected?.latestPrice ? whatIfValue / selected.latestPrice : 0;
  const loadingLabel = slowLoading ? t('market_slow_loading') : t('market_loading_data');
  const selectedCurrency = selected?.currency ?? selected?.quote?.currency ?? 'USD';
  const calculatedRiskScore = selected
    ? Math.min(100, Math.max(0, Math.round(
      (selected.indicators.volatility * 1.35)
      + (selected.riskLevel === 'high' ? 28 : selected.riskLevel === 'medium' ? 14 : 4)
      + (selected.indicators.rsi >= 70 || selected.indicators.rsi <= 30 ? 12 : 0),
    )))
    : 0;
  const visibleRiskScore = aiInsight?.riskScore ?? calculatedRiskScore;
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
      <AppHeader />
      <Sidebar />
      <main className="market-main">
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="market-eyebrow"><Sparkles size={15} />{heroBadge}</span>
            <h1>{t('market_title')}</h1>
            <p>{t('market_hero_subtitle')}</p>
            <form className="market-search-panel" onSubmit={event => { event.preventDefault(); analyzeSearchSelection(); }}>
              <label className="market-search-field">
                <span>{t('market_search_label')}</span>
                <div>
                  <Search size={17} />
                  <input
                    value={query}
                    type="search"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-label={t('market_search_label')}
                    aria-expanded={searchOpen && query.trim().length >= 2}
                    aria-controls="market-search-results"
                    onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                    onChange={event => {
                      setQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder={t('market_search_placeholder')}
                  />
                </div>
                {searchOpen && query.trim().length >= 2 && (
                  <div id="market-search-results" className="market-search-results" role="listbox" aria-label={t('market_search_results')}>
                    <strong>{t('market_search_results')}</strong>
                    {searchLoading ? (
                      <p>{t('loading')}</p>
                    ) : searchResults.length > 0 ? searchResults.map(item => (
                      <button
                        type="button"
                        key={`${item.symbol}-${item.assetType}-${item.providerSymbol ?? item.symbol}`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => analyzeSearchSelection(item)}
                        role="option"
                        aria-selected={selectedAsset.symbol === item.symbol}
                      >
                        <span>
                          <b>{item.symbol}</b>
                          <em>{item.name}</em>
                        </span>
                        <small>{t(`market_asset_${item.assetType === 'stock' ? 'stocks' : item.assetType === 'commodity' ? 'commodities' : item.assetType}`)}{item.exchange ? ` · ${item.exchange}` : ''}</small>
                      </button>
                    )) : (
                      <p>{searchMessage || t('market_no_search_results')}</p>
                    )}
                  </div>
                )}
              </label>
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
                </select>
              </label>
              <button type="submit" disabled={loading}><Activity size={17} />{loading ? loadingLabel : t('market_analyze_now')}</button>
            </form>
          </div>
          <div className="market-hero-card">
            <span>{t('market_selected_asset')}</span>
            <strong>{selected?.symbol ?? '--'}</strong>
            <p>{localizedAssetName ?? t('market_no_data')}</p>
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
          <MarketMetric label={t('market_selected_asset')} value={selected?.symbol ?? '--'} />
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
            <button type="button" onClick={() => void requestAnalysis(selectedAsset.providerSymbol ?? selectedAsset.symbol, selectedAsset.assetType, selectedAsset)}>
              {t('market_retry')}
            </button>
          </div>
        )}

        {activeTab === 'analyze' && <section className="market-card-grid" aria-label={t('market_analysis_cards')}>
          {loading ? (
            <div className="market-empty" role="status">{loadingLabel}</div>
          ) : cards.length === 0 ? (
            <div className="market-empty">{error || t('market_no_data_for_symbol')}</div>
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

            <section className="market-decision-grid">
              <article className={`market-panel decision ${decision?.tone ?? ''}`}>
                <div className="market-section-head">
                  <Brain size={19} />
                  <div>
                    <span>{aiLoading ? t('market_ai_loading') : aiInsight?.status === 'ready' ? t('market_educational_only') : t('market_ai_unavailable_with_data')}</span>
                    <h2>{t('market_ai_summary')}</h2>
                  </div>
                </div>
                {decision && (
                  <div className="decision-body">
                    <b>{aiLoading ? t('market_ai_loading') : aiInsight?.trendStatus || decision.status}</b>
                    <p>{aiInsight?.summary || (aiError ? t('market_ai_provider_unavailable') : decision.reason)}</p>
                    <small>{aiInsight?.riskNotes || (aiError ? t('market_ai_unavailable_with_data') : decision.warning)}</small>
                    <div className="risk-score" aria-label={`${t('market_risk_score')} ${visibleRiskScore}`}>
                      <span>{t('market_risk_score')}</span>
                      <i><b style={{ width: `${visibleRiskScore}%` }} /></i>
                      <strong>{visibleRiskScore}/100</strong>
                    </div>
                    {(aiInsight?.watchNext ?? [decision.action]).map(item => <strong key={item}>{item}</strong>)}
                  </div>
                )}
              </article>

              <article className="market-panel portfolio-card">
                <div className="market-section-head">
                  <WalletCards size={19} />
                  <div>
                    <span>{portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}</span>
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
                <TradingViewChart symbol={selected.providerSymbol ?? selected.symbol} assetType={selected.assetType} exchange={selectedAsset.exchange} theme={chartTheme} />
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
                <div className="indicator-list">
                  <MarketMetric label={t('market_market_cap')} value={String(selected.fundamentals?.marketCap ?? t('market_data_unavailable'))} />
                  <MarketMetric label={t('market_pe_ratio')} value={String(selected.fundamentals?.peRatio ?? t('market_data_unavailable'))} />
                  <MarketMetric label={t('market_eps')} value={String(selected.fundamentals?.eps ?? t('market_data_unavailable'))} />
                  <MarketMetric label={t('market_revenue')} value={String(selected.fundamentals?.revenue ?? t('market_data_unavailable'))} />
                  <MarketMetric label={t('market_dividend')} value={String(selected.fundamentals?.dividend ?? t('market_data_unavailable'))} />
                  <MarketMetric label={t('market_data_status')} value={t(`market_data_status_${selected.dataStatus ?? 'live'}`)} />
                </div>
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
                  <input value={whatIfAmount} inputMode="decimal" onChange={event => setWhatIfAmount(event.target.value)} placeholder={t('market_amount')} />
                </label>
                <div className="scenario-grid">
                  <MarketMetric label={t('market_estimated_units')} value={hasWhatIfAmount ? estimatedUnits.toFixed(4) : '--'} />
                  {[5, -5, 10, -10].map(change => (
                    <MarketMetric
                      key={change}
                      label={change > 0 ? `${t('market_positive_scenario')} ${change}%` : `${t('market_negative_scenario')} ${change}%`}
                      value={hasWhatIfAmount ? money((whatIfValue * change) / 100, selectedCurrency) : '--'}
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
                <p className="market-copy">{localizedSummary || t('market_ai_summary_text')}</p>
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
                <p className="market-copy">{localizedSummary || t('market_ai_summary_text')}</p>
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
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:var(--sfm-soft-cyan);line-height:1}.market-hero-card p{margin:0;font-size:13px}.market-hero-card em{font-style:normal;color:rgba(255,255,255,.78);font-size:12px;font-weight:900;line-height:1.5}.risk{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.risk.low{background:rgba(34,197,94,.14);color:#16A34A}.risk.medium{background:rgba(167,243,240,.18);color:var(--sfm-muted)}.risk.high{background:rgba(239,68,68,.12);color:#DC2626}
        .market-card-grid,.market-status-grid,.market-decision-grid,.market-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-status-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.market-decision-grid{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr)}.market-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-card,.market-panel,.market-disclaimer,.market-notice,.market-stock-header{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 6px 24px rgba(3,18,37,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:var(--sfm-foreground)}.change{font-size:13px;font-weight:900}.change.up,.up{color:#16A34A}.change.down,.down{color:#DC2626}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--sfm-muted);font-weight:900;background:var(--sfm-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px}.market-notice button{border:0;border-radius:999px;background:var(--sfm-foreground);color:var(--sfm-card);padding:8px 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.market-notice.success{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-notice.slow{color:#92400E;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22)}
        .market-stock-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}.market-stock-header h2{margin:8px 0 4px;color:var(--sfm-foreground);font-size:28px}.market-stock-header p{margin:0;color:var(--sfm-muted);font-weight:850}.stock-price-block{display:grid;justify-items:end;gap:5px;text-align:end}.stock-price-block strong{font-size:30px;color:var(--sfm-foreground);font-weight:950}.stock-price-block small{color:var(--sfm-muted);font-weight:850}.data-badge{display:inline-flex;width:max-content;border-radius:999px;border:1px solid rgba(29,140,255,.22);background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-size:11px;font-weight:950}.data-badge.delayed{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.22);color:#B45309}.data-badge.unavailable{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.22);color:#B91C1C}
        .market-service{display:flex;align-items:center;gap:9px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:18px;padding:12px 14px;color:var(--sfm-muted);font-weight:900;box-shadow:0 6px 24px rgba(3,18,37,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.slow,.market-service.not_configured{color:#92400E;background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.20)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}.market-chart{grid-row:span 2}.market-panel{padding:20px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:var(--sfm-soft-cyan)}.market-section-head span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:var(--sfm-foreground);font-size:17px;font-weight:900;line-height:1.35}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.timeframe-row{display:flex;flex-wrap:wrap;gap:8px;margin:-4px 0 12px}.timeframe-row button{border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:7px 11px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.timeframe-row button[aria-pressed="true"],.timeframe-row button:hover,.timeframe-row button:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#FFFFFF;outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.metric{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:13px;display:grid;gap:7px;min-width:0;align-content:start}.metric span{font-size:11px;color:var(--sfm-muted);font-weight:900;line-height:1.45}.metric strong{font-size:15px;color:var(--sfm-foreground);display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.45}.indicator-list,.scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.decision-body{display:grid;gap:13px}.decision-body b{font-size:25px;font-weight:900;color:var(--sfm-foreground);line-height:1.25}.decision-body p,.decision-body small,.decision-body strong{margin:0;color:var(--sfm-muted);line-height:1.9;font-weight:800;overflow-wrap:anywhere}.decision-body small{font-size:12px;color:var(--sfm-muted)}.decision-body strong{color:var(--sfm-muted)}.risk-score{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:10px 12px}.risk-score span,.risk-score strong{font-size:12px!important;color:var(--sfm-foreground)!important;font-weight:950!important;line-height:1.3!important}.risk-score i{height:9px;border-radius:999px;background:rgba(29,140,255,.12);overflow:hidden}.risk-score i b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sfm-primary),#F59E0B,#EF4444)}.decision.ok{border-color:rgba(34,197,94,.22)}.decision.warn{border-color:rgba(167,243,240,.28)}.decision.danger{border-color:rgba(239,68,68,.22)}.levels-strip{margin-top:16px;display:grid;gap:10px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.6}.levels-strip i{position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,#22C55E,var(--sfm-soft-cyan),#EF4444);display:block}.levels-strip b{position:absolute;top:-4px;width:4px;height:18px;border-radius:999px;background:var(--sfm-foreground)}.levels-strip b.current{width:10px;height:10px;top:0;transform:translateX(-50%);background:#FFF;border:2px solid var(--sfm-foreground)}.tool-input,.alert-form{display:grid;gap:10px}.tool-input span{font-size:12px;font-weight:900;color:var(--sfm-muted);line-height:1.5}.tool-input input,.alert-form input,.alert-form select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;line-height:1.5}.alert-form{grid-template-columns:minmax(0,1fr) 110px auto;align-items:stretch}.alert-form button,.inline-action,.report-button{border:0;border-radius:14px;background:var(--sfm-foreground);color:var(--sfm-card);padding:12px 14px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;line-height:1.45}.inline-action{margin-bottom:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.inline-action:disabled{opacity:.58;cursor:default}.saved-alerts,.asset-report{display:grid;gap:10px;margin-top:14px}.saved-alerts span,.asset-report p{margin:0;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:12px;padding:10px 11px;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.65}.saved-alerts span{display:flex;align-items:center;justify-content:space-between;gap:9px}.saved-alerts span b{min-width:0;overflow-wrap:anywhere}.saved-alerts button{border:0;background:transparent;color:var(--sfm-muted);cursor:pointer;display:inline-flex;padding:2px}.asset-report small{color:var(--sfm-muted);line-height:1.75;font-weight:800;display:block}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:var(--sfm-muted);line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:var(--sfm-muted);font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span,.watchlist>button{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);padding:7px 11px;color:var(--sfm-muted);font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:6px}.watchlist button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:var(--sfm-muted)}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent));display:block}.compare-table{margin-top:14px;overflow-x:auto;display:grid;gap:7px}.compare-table>div{display:grid;grid-template-columns:60px 90px 70px 52px 76px 80px;gap:7px;min-width:470px}.compare-table b,.compare-table span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.compare-table b{color:var(--sfm-muted)}
        .market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:16px;color:var(--sfm-muted)}.market-disclaimer strong{display:block;color:var(--sfm-foreground);margin-bottom:4px}.market-disclaimer p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.7;font-weight:800}
        @media(max-width:1180px){.market-card-grid,.market-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid,.market-decision-grid,.market-tools-grid{grid-template-columns:1fr}.market-chart{grid-row:auto}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{margin-inline-start:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px;max-width:100%}}
        @media(max-width:720px){.market-main{padding-inline:14px}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-status-grid,.market-stat-row,.indicator-list,.scenario-grid,.alert-form{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-search-results{max-height:min(300px,42dvh);top:calc(100% + 10px);border-radius:16px}.market-search-results button{min-height:68px;align-items:flex-start}.market-search-results button small{white-space:normal;text-align:end}.market-hero-card strong{font-size:36px}.market-stock-header{display:grid;gap:14px}.stock-price-block{justify-items:start;text-align:start}.market-panel,.market-card,.market-stock-header{border-radius:18px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}}
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
