'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Bell, Brain, Calculator, FileText, LineChart, Plus, Search, ShieldAlert, Sparkles, Star, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import type { MarketAnalysis, MarketAssetType, MarketResult, MarketSearchItem } from '@/lib/market/marketService';
import { getFallbackMockData, normalizeAssetType, validateSymbol } from '@/lib/market/marketService';

type MarketServiceState = 'checking' | 'connected' | 'not_configured' | 'unavailable';
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

const WATCHLIST_STORAGE_KEY = 'sfm_market_watchlist';
const ALERTS_STORAGE_KEY = 'sfm_market_alerts';
const DEFAULT_MARKET_ASSET = 'AAPL';
const DEFAULT_MARKET_TYPE: MarketAssetType = 'stock';

function money(value: number) {
  const maximumFractionDigits = value > 1000 ? 0 : 2;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

function sparkPath(points: MarketAnalysis['history']) {
  const width = 420;
  const height = 150;
  const closes = points.map(point => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const spread = max - min || 1;
  return closes.map((value, index) => {
    const x = (index / Math.max(closes.length - 1, 1)) * width;
    const y = height - ((value - min) / spread) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function chartTicks(points: MarketAnalysis['history']) {
  if (points.length === 0) return [];
  const indexes = [0, Math.floor(points.length / 2), points.length - 1];
  return indexes.map(index => points[index]).filter(Boolean);
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

function makeClientFallback(symbol: string, assetType: MarketAssetType, fallbackReason?: string): MarketViewAnalysis {
  return {
    ...getFallbackMockData(symbol, assetType),
    source: 'mock',
    fallback: true,
    fallbackReason,
  };
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

export default function MarketAnalysisPage() {
  const { dir, t } = useLanguage();
  const { user, isGuest } = useAuth();
  const [query, setQuery] = useState(DEFAULT_MARKET_ASSET);
  const [assetType, setAssetType] = useState<MarketAssetType | 'all'>(DEFAULT_MARKET_TYPE);
  const [analysis, setAnalysis] = useState<MarketViewAnalysis>(() => makeClientFallback(DEFAULT_MARKET_ASSET, DEFAULT_MARKET_TYPE, 'initial_load'));
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [serviceState, setServiceState] = useState<MarketServiceState>('checking');
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [alertThreshold, setAlertThreshold] = useState('200');
  const [whatIfAmount, setWhatIfAmount] = useState('1000');
  const [reportOpen, setReportOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const requestAnalysis = useCallback(async (symbolInput: string, typeInput: MarketAssetType | 'all', selectedInput?: Partial<SelectedMarketAsset>) => {
    const displaySymbol = validateSymbol(selectedInput?.symbol ?? symbolInput);
    const requestSymbol = validateSymbol(selectedInput?.providerSymbol ?? symbolInput);
    if (!requestSymbol || !displaySymbol) {
      setError(t('market_select_asset_to_start'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
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
      const response = await fetch(`/api/market/analyze?symbol=${encodeURIComponent(requestSymbol)}&assetType=${encodeURIComponent(normalizedType)}`);
      const result = await response.json() as MarketResult & { openbbService?: MarketServiceState; source?: string; fallback?: boolean; fallbackReason?: string };
      if (process.env.NODE_ENV === 'development') {
        console.log('Market analysis source:', {
          symbol,
          source: result.success ? result.source : null,
          fallback: result.success ? result.fallback : null,
          fallbackReason: result.success ? result.fallbackReason : null,
        });
      }
      if (!response.ok || !result.success) throw new Error(!result.success ? result.error : t('market_analysis_unavailable'));

      if (hasUsableAnalysis(result)) {
        setAnalysis({
          ...result,
          symbol: selectedMeta.symbol,
          providerSymbol: result.providerSymbol ?? selectedMeta.providerSymbol,
          name: selectedMeta.name ?? result.name,
          assetType: normalizedType,
        });
      } else {
        setAnalysis({
          ...makeClientFallback(selectedMeta.symbol, normalizedType, 'provider_returned_no_usable_data'),
          name: selectedMeta.name ?? `${selectedMeta.symbol} Market Asset`,
          providerSymbol: selectedMeta.providerSymbol,
        });
        setNotice(t('market_demo_data_shown'));
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (result.openbbService === 'not_configured' || result.openbbService === 'unavailable') {
        setServiceState(result.openbbService);
      }
    } catch (err) {
      setAnalysis({
        ...makeClientFallback(displaySymbol, normalizedType, err instanceof Error ? err.message : 'client_request_failed'),
        name: selectedMeta.name ?? `${displaySymbol} Market Asset`,
        providerSymbol: selectedMeta.providerSymbol,
      });
      setError('');
      setNotice(t('market_demo_data_shown'));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        const response = await fetch(`/api/market/search?${params.toString()}`);
        const data = await response.json() as { results?: MarketSearchItem[] };
        if (cancelled) return;
        const results = (data.results ?? []).map(normalizeSearchItem).slice(0, 12);
        setSearchResults(results);
        setSearchMessage(results.length === 0 ? t('market_no_search_results') : '');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchMessage(t('market_no_search_results'));
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
        const response = await fetch('/api/market/health');
        const health = await response.json() as { ok?: boolean; openbbService?: MarketServiceState };
        if (!cancelled) {
          setServiceState(health.ok ? 'connected' : health.openbbService ?? 'unavailable');
        }
      } catch {
        if (!cancelled) setServiceState('unavailable');
      } finally {
        if (!cancelled) void requestAnalysis(DEFAULT_MARKET_ASSET, DEFAULT_MARKET_TYPE);
      }
    }
    void checkService();
    return () => {
      cancelled = true;
    };
  }, [requestAnalysis]);

  useEffect(() => {
    let cancelled = false;
    async function loadSupportingData() {
      try {
        const [searchResponse, compareResponse] = await Promise.all([
          fetch('/api/market/search'),
          fetch('/api/market/compare?symbols=AAPL,MSFT,NVDA,BTC&assetType=stock'),
        ]);
        const searchJson = await searchResponse.json() as { results?: MarketSearchItem[] };
        const compareJson = await compareResponse.json() as { results?: MarketResult[] };
        if (cancelled) return;
        setSuggestedAssets(searchJson.results?.slice(0, 5) ?? []);
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
  const isFallbackData = Boolean(selected?.fallback || selected?.source === 'mock');
  const serviceNotice = serviceState === 'connected'
    ? isFallbackData
      ? t('market_status_demo')
      : t('market_service_connected')
    : serviceState === 'not_configured'
      ? t('market_service_not_configured')
      : serviceState === 'unavailable'
        ? t('market_service_unavailable')
        : t('loading');
  const heroBadge = isFallbackData ? t('market_badge_demo') : t('market_badge_live');
  const chartBadge = isFallbackData ? t('market_chart_demo') : t('market_chart_live');
  const fallbackReasonText = isFallbackData
    ? t('market_demo_data_shown')
    : t('market_no_fallback');
  const selectedDisplayName = selectedAsset.symbol === selected?.symbol ? selectedAsset.name : undefined;
  const localizedAssetName = selectedDisplayName ?? (selected?.name?.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', selected.symbol) : selected?.name);
  const localizedSummary = selected?.summary?.includes('Educational market summary only')
    ? t('market_summary_educational')
    : selected?.summary;
  const chartColor = selected && selected.changePercent >= 0 ? '#22C55E' : '#EF4444';
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
  const estimatedUnits = selected?.latestPrice ? whatIfValue / selected.latestPrice : 0;
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
    `${t('market_report_levels')}: ${t('market_support_zone')} ${money(selected.levels.support)} / ${t('market_resistance_zone')} ${money(selected.levels.resistance)}`,
    `${t('market_report_portfolio')}: ${portfolioMatch ? t('market_asset_in_portfolio') : t('market_asset_not_in_portfolio')}`,
    `${t('market_report_monitor')}: RSI ${selected.indicators.rsi}, SMA 20 ${money(selected.indicators.sma20)}, SMA 50 ${money(selected.indicators.sma50)}`,
  ] : [];

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
                  <div className="market-search-results" role="listbox" aria-label={t('market_search_results')}>
                    <strong>{t('market_search_results')}</strong>
                    {searchLoading ? (
                      <p>{t('loading')}</p>
                    ) : searchResults.length > 0 ? searchResults.map(item => (
                      <button
                        type="button"
                        key={`${item.symbol}-${item.assetType}-${item.providerSymbol ?? item.symbol}`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => analyzeSearchSelection(item)}
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
                <select value={assetType} onChange={event => setAssetType(event.target.value as MarketAssetType | 'all')}>
                  <option value="all">{t('market_asset_all')}</option>
                  <option value="stock">{t('market_asset_stocks')}</option>
                  <option value="etf">{t('market_asset_etf')}</option>
                  <option value="crypto">{t('market_asset_crypto')}</option>
                  <option value="forex">{t('market_asset_forex')}</option>
                  <option value="commodity">{t('market_asset_commodities')}</option>
                  <option value="gold">{t('market_asset_gold')}</option>
                </select>
              </label>
              <button type="submit" disabled={loading}><Activity size={17} />{loading ? t('loading') : t('market_analyze_now')}</button>
            </form>
          </div>
          <div className="market-hero-card">
            <span>{t('market_selected_asset')}</span>
            <strong>{selected?.symbol ?? '--'}</strong>
            <p>{localizedAssetName ?? t('market_no_data')}</p>
            {selected && <em>{money(selected.latestPrice)} · {isFallbackData ? t('market_badge_demo') : t('market_badge_live')}</em>}
            {selected && <b className={`risk ${selected.riskLevel}`}>{t(`market_risk_${selected.riskLevel}`)}</b>}
          </div>
        </section>

        <div className={`market-service ${serviceState}`}>
          <Activity size={17} />
          <span>{t('market_service_status')}: {serviceNotice}</span>
        </div>

        <section className="market-status-grid">
          <MarketMetric label={t('market_service_state')} value={serviceState === 'connected' ? t('market_connected_short') : serviceNotice} />
          <MarketMetric label={t('market_data_source')} value={isFallbackData ? t('market_badge_demo') : t('market_badge_live')} />
          <MarketMetric label={t('market_selected_asset')} value={selected?.symbol ?? '--'} />
          {isFallbackData ? (
            <MarketMetric label={t('market_fallback_reason')} value={fallbackReasonText} />
          ) : (
            <MarketMetric label={t('market_last_updated')} value={lastUpdated || '--'} />
          )}
        </section>

        {notice && <div className="market-notice success">{notice}</div>}
        {isFallbackData && <div className="market-notice demo">{t('market_demo_data_shown')}</div>}
        {error && <div className="market-notice">{error}</div>}

        <section className="market-card-grid" aria-label={t('market_sample_cards')}>
          {loading ? (
            <div className="market-empty">{t('loading')}</div>
          ) : cards.length === 0 ? (
            <div className="market-empty">{t('market_no_data')}</div>
          ) : cards.map(asset => (
            <article className="market-card" key={asset.symbol}>
              <div className="market-card-head">
                <div>
                  <strong>{asset.symbol}</strong>
                  <span>{asset.name.includes('Market Asset') ? t('market_asset_generic').replace('{symbol}', asset.symbol) : asset.name}</span>
                </div>
                <b className={`risk ${asset.riskLevel}`}>{t(`market_risk_${asset.riskLevel}`)}</b>
              </div>
              <div className="market-price">{money(asset.latestPrice)}</div>
              <div className={asset.changePercent >= 0 ? 'change up' : 'change down'}>
                {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
              </div>
            </article>
          ))}
        </section>

        {selected ? (
          <>
            <section className="market-decision-grid">
              <article className={`market-panel decision ${decision?.tone ?? ''}`}>
                <div className="market-section-head">
                  <Brain size={19} />
                  <div>
                    <span>{t('market_educational_only')}</span>
                    <h2>{t('market_smart_decision_card')}</h2>
                  </div>
                </div>
                {decision && (
                  <div className="decision-body">
                    <b>{decision.status}</b>
                    <p>{decision.reason}</p>
                    <small>{decision.warning}</small>
                    <strong>{decision.action}</strong>
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
                  <MarketMetric label={t('market_purchase_price')} value={portfolioMatch ? money(purchasePrice) : '--'} />
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice)} />
                  <MarketMetric label={t('market_unrealized_pl')} value={portfolioMatch ? money(unrealized) : '--'} />
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
                <svg viewBox="0 0 420 180" role="img" aria-label={t('market_price_chart')}>
                  <defs>
                    <linearGradient id="marketLineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${sparkPath(selected.history)} L 420 180 L 0 180 Z`} fill="url(#marketLineFill)" />
                  <path d={sparkPath(selected.history)} fill="none" stroke={chartColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="0" y="176" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[0]?.date ?? ''}</text>
                  <text x="205" y="176" textAnchor="middle" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[1]?.date ?? ''}</text>
                  <text x="420" y="176" textAnchor="end" fill="#8A7060" fontSize="11" fontWeight="800">{chartTicks(selected.history)[2]?.date ?? ''}</text>
                  <text x="0" y="15" fill="#8A7060" fontSize="11" fontWeight="800">{money(Math.max(...selected.history.map(point => point.close)))}</text>
                  <text x="0" y="98" fill="#8A7060" fontSize="11" fontWeight="800">{selected.symbol}</text>
                  <text x="0" y="165" fill="#8A7060" fontSize="11" fontWeight="800">{money(Math.min(...selected.history.map(point => point.close)))}</text>
                </svg>
                <div className="market-stat-row">
                  <MarketMetric label={t('market_current_price')} value={money(selected.latestPrice)} />
                  <MarketMetric label={t('market_daily_change')} value={`${selected.changePercent >= 0 ? '+' : ''}${selected.changePercent.toFixed(2)}%`} />
                  <MarketMetric label={t('market_trend')} value={t(`market_trend_${selected.trend}`)} icon={trendIcon} />
                </div>
                <div className="levels-strip">
                  <span>{t('market_support_zone')} {money(selected.levels.support)} ({distancePercent(selected.levels.support, selected.latestPrice).toFixed(1)}%)</span>
                  <i>
                    <b style={{ insetInlineStart: '20%' }} />
                    <b className="current" style={{ insetInlineStart: '50%' }} />
                    <b style={{ insetInlineStart: '80%' }} />
                  </i>
                  <span>{t('market_resistance_zone')} {money(selected.levels.resistance)} ({percent(distancePercent(selected.levels.resistance, selected.latestPrice))})</span>
                </div>
              </div>

              <aside className="market-panel">
                <div className="market-section-head">
                  <BarChart3 size={19} />
                  <div>
                    <span>{isFallbackData ? t('market_mock_data') : t('market_live_data')}</span>
                    <h2>{t('market_technical_indicators')}</h2>
                  </div>
                </div>
                <div className="indicator-list">
                  <MarketMetric label="RSI" value={String(selected.indicators.rsi)} />
                  <MarketMetric label="SMA 20" value={money(selected.indicators.sma20)} />
                  <MarketMetric label="SMA 50" value={money(selected.indicators.sma50)} />
                  <MarketMetric label={t('market_risk_level')} value={`${selected.indicators.volatility.toFixed(1)}%`} />
                  <MarketMetric label={t('market_support_zone')} value={money(selected.levels.support)} />
                  <MarketMetric label={t('market_resistance_zone')} value={money(selected.levels.resistance)} />
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
                  <input value={whatIfAmount} inputMode="decimal" onChange={event => setWhatIfAmount(event.target.value)} />
                </label>
                <div className="scenario-grid">
                  <MarketMetric label={t('market_estimated_units')} value={estimatedUnits.toFixed(4)} />
                  {[5, -5, 10, -10].map(change => (
                    <MarketMetric
                      key={change}
                      label={change > 0 ? `${t('market_positive_scenario')} ${change}%` : `${t('market_negative_scenario')} ${change}%`}
                      value={money((whatIfValue * change) / 100)}
                    />
                  ))}
                </div>
              </article>

              <article className="market-panel">
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
              <div className="market-panel">
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
                        <span>{money(asset.latestPrice)}</span>
                        <span className={asset.changePercent >= 0 ? 'up' : 'down'}>{percent(asset.changePercent)}</span>
                        <span>{asset.indicators.rsi}</span>
                        <span>{t(`market_risk_${asset.riskLevel}`)}</span>
                        <span>{view.fallback || view.source === 'mock' ? t('market_status_demo') : 'OpenBB'}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="market-muted">{t('market_compare_note')}</p>
              </div>
            </section>
          </>
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
        .market-shell{min-height:100dvh;background:#F7F3EA;color:#111;overflow-x:hidden;font-family:Tajawal,Arial,sans-serif}
        .market-main{width:100%;max-width:1320px;margin:0 auto;padding:22px;margin-inline-start:230px;display:grid;gap:16px;overflow-x:hidden}
        .market-hero{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(135deg,#111 0%,#2B1A0D 58%,#D8AE63 150%);color:#FFFDFC;padding:28px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end;box-shadow:0 20px 60px rgba(45,26,10,.16);border:1px solid rgba(216,174,99,.24)}
        .market-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(216,174,99,.14);filter:blur(18px)}
        .market-hero-copy,.market-hero-card{position:relative;z-index:1}.market-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(216,174,99,.28);background:rgba(216,174,99,.12);color:#D8AE63;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin-bottom:14px}
        .market-hero h1{margin:0 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;font-weight:900}.market-hero p{max-width:760px;margin:0;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .market-search-panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:10px;align-items:end}.market-search-panel label{display:grid;gap:7px}.market-search-panel label>span{font-size:12px;font-weight:900;color:#D8AE63}.market-search-field{position:relative}.market-search-panel label>div{height:48px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);padding:0 13px}.market-search-panel input,.market-search-panel select{width:100%;height:48px;min-width:0;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);color:#FFFDFC;padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.market-search-panel input{border:0;background:transparent;padding:0}.market-search-panel input::placeholder{color:rgba(255,255,255,.48)}.market-search-panel select option{color:#111}.market-search-panel button{height:48px;border:0;border-radius:15px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.market-search-panel button:disabled{opacity:.65;cursor:wait}.market-search-results{position:absolute;z-index:40;inset-inline:0;top:calc(100% + 8px);max-height:320px;overflow-y:auto;background:#FFFDFC;color:#111;border:1px solid rgba(216,174,99,.28);border-radius:18px;box-shadow:0 20px 50px rgba(18,14,10,.22);padding:10px;display:grid;gap:7px}.market-search-results strong{color:#9A6C3C;font-size:12px;font-weight:900;padding:4px 6px}.market-search-results p{margin:0;color:#8A7060;font-size:12px;font-weight:900;line-height:1.6;padding:10px}.market-search-results button{height:auto;min-height:54px;width:100%;border:1px solid rgba(216,174,99,.14);background:#F7F3EA;color:#111;border-radius:13px;padding:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:start}.market-search-results button span{display:grid;gap:3px;min-width:0}.market-search-results button b{font-size:14px}.market-search-results button em{font-style:normal;color:#5B4332;font-size:12px;line-height:1.4;white-space:normal;overflow-wrap:anywhere}.market-search-results button small{color:#9A6C3C;font-size:11px;font-weight:900;line-height:1.4;flex-shrink:0}
        .market-hero-card{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;display:grid;gap:8px;backdrop-filter:blur(14px)}.market-hero-card span{font-size:12px;color:rgba(255,255,255,.62);font-weight:900}.market-hero-card strong{font-size:42px;color:#D8AE63;line-height:1}.market-hero-card p{margin:0;font-size:13px}.market-hero-card em{font-style:normal;color:rgba(255,255,255,.78);font-size:12px;font-weight:900;line-height:1.5}.risk{justify-self:start;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.risk.low{background:rgba(34,197,94,.14);color:#16A34A}.risk.medium{background:rgba(216,174,99,.18);color:#9A6C3C}.risk.high{background:rgba(239,68,68,.12);color:#DC2626}
        .market-card-grid,.market-status-grid,.market-decision-grid,.market-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.market-status-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.market-decision-grid{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr)}.market-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-card,.market-panel,.market-disclaimer,.market-notice{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:22px;box-shadow:0 6px 24px rgba(90,67,51,.06)}.market-card{padding:16px;display:grid;gap:10px}.market-card-head{display:flex;justify-content:space-between;gap:10px}.market-card-head strong{display:block;font-size:18px}.market-card-head span{display:block;color:#8A7060;font-size:12px;font-weight:800;margin-top:3px}.market-price{font-size:24px;font-weight:900;color:#111}.change{font-size:13px;font-weight:900}.change.up,.up{color:#16A34A}.change.down,.down{color:#DC2626}.market-empty{grid-column:1/-1;padding:24px;text-align:center;color:#9A6C3C;font-weight:900;background:#FFFDFC;border:1px dashed rgba(216,174,99,.24);border-radius:18px}.market-notice{padding:13px 15px;color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18);font-weight:900}.market-notice.success{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-notice.demo{color:#9A6C3C;background:rgba(216,174,99,.10);border-color:rgba(216,174,99,.20)}
        .market-service{display:flex;align-items:center;gap:9px;background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:18px;padding:12px 14px;color:#5B4332;font-weight:900;box-shadow:0 6px 24px rgba(90,67,51,.05)}.market-service.connected{color:#15803D;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.18)}.market-service.not_configured{color:#9A6C3C;background:rgba(216,174,99,.10)}.market-service.unavailable{color:#B91C1C;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.18)}
        .market-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}.market-panel{padding:20px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:#D8AE63}.market-section-head span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:#111;font-size:17px;font-weight:900;line-height:1.35}.market-chart svg{width:100%;height:auto;max-height:300px;display:block}.market-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.metric{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:16px;padding:13px;display:grid;gap:7px;min-width:0;align-content:start}.metric span{font-size:11px;color:#9A6C3C;font-weight:900;line-height:1.45}.metric strong{font-size:15px;color:#111;display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.45}.indicator-list,.scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.decision-body{display:grid;gap:13px}.decision-body b{font-size:25px;font-weight:900;color:#111;line-height:1.25}.decision-body p,.decision-body small,.decision-body strong{margin:0;color:#5B4332;line-height:1.9;font-weight:800;overflow-wrap:anywhere}.decision-body small{font-size:12px;color:#7B6251}.decision-body strong{color:#9A6C3C}.decision.ok{border-color:rgba(34,197,94,.22)}.decision.warn{border-color:rgba(216,174,99,.28)}.decision.danger{border-color:rgba(239,68,68,.22)}.levels-strip{margin-top:16px;display:grid;gap:10px;color:#5B4332;font-size:12px;font-weight:900;line-height:1.6}.levels-strip i{position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,#22C55E,#D8AE63,#EF4444);display:block}.levels-strip b{position:absolute;top:-4px;width:4px;height:18px;border-radius:999px;background:#111}.levels-strip b.current{width:10px;height:10px;top:0;transform:translateX(-50%);background:#FFF;border:2px solid #111}.tool-input,.alert-form{display:grid;gap:10px}.tool-input span{font-size:12px;font-weight:900;color:#9A6C3C;line-height:1.5}.tool-input input,.alert-form input,.alert-form select{width:100%;min-width:0;border:1px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:12px 13px;font:900 13px Tajawal,Arial,sans-serif;outline:0;line-height:1.5}.alert-form{grid-template-columns:minmax(0,1fr) 110px auto;align-items:stretch}.alert-form button,.inline-action,.report-button{border:0;border-radius:14px;background:#111;color:#FFFDFC;padding:12px 14px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;line-height:1.45}.inline-action{margin-bottom:14px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);color:#111}.inline-action:disabled{opacity:.58;cursor:default}.saved-alerts,.asset-report{display:grid;gap:10px;margin-top:14px}.saved-alerts span,.asset-report p{margin:0;background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:12px;padding:10px 11px;color:#5B4332;font-size:12px;font-weight:900;line-height:1.65}.saved-alerts span{display:flex;align-items:center;justify-content:space-between;gap:9px}.saved-alerts span b{min-width:0;overflow-wrap:anywhere}.saved-alerts button{border:0;background:transparent;color:#9A6C3C;cursor:pointer;display:inline-flex;padding:2px}.asset-report small{color:#8A7060;line-height:1.75;font-weight:800;display:block}
        .market-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.market-copy,.market-muted{margin:0;color:#5B4332;line-height:1.8;font-size:13px;font-weight:800}.market-muted{margin-top:12px;color:#8A7060;font-size:12px}.watchlist{display:flex;flex-wrap:wrap;gap:8px}.watchlist span,.watchlist>button{border-radius:999px;background:#F7F3EA;border:1px solid rgba(216,174,99,.14);padding:7px 11px;color:#5B4332;font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:6px}.watchlist button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0}.compare-bars{display:grid;gap:10px}.compare-bars div{display:grid;grid-template-columns:46px minmax(0,1fr) 54px;gap:8px;align-items:center}.compare-bars span,.compare-bars b{font-size:12px;font-weight:900;color:#5B4332}.compare-bars div i{height:9px;border-radius:999px;background:linear-gradient(90deg,#D8AE63,#9A6C3C);display:block}.compare-table{margin-top:14px;overflow-x:auto;display:grid;gap:7px}.compare-table>div{display:grid;grid-template-columns:60px 90px 70px 52px 76px 80px;gap:7px;min-width:470px}.compare-table b,.compare-table span{font-size:11px;font-weight:900;color:#5B4332}.compare-table b{color:#9A6C3C}
        .market-disclaimer{display:flex;align-items:flex-start;gap:12px;padding:16px;color:#9A6C3C}.market-disclaimer strong{display:block;color:#111;margin-bottom:4px}.market-disclaimer p{margin:0;color:#5B4332;font-size:13px;line-height:1.7;font-weight:800}
        @media(max-width:1180px){.market-card-grid,.market-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.market-layout,.market-bottom-grid,.market-decision-grid,.market-tools-grid{grid-template-columns:1fr}.market-search-panel{grid-template-columns:1fr 1fr}}
        @media(max-width:1024px){.market-main{margin-inline-start:0;padding:calc(88px + env(safe-area-inset-top)) 16px 18px;max-width:100%}}
        @media(max-width:720px){.market-main{padding-inline:14px}.market-hero{grid-template-columns:1fr;padding:22px;border-radius:22px}.market-search-panel,.market-card-grid,.market-status-grid,.market-stat-row,.indicator-list,.scenario-grid,.alert-form{grid-template-columns:1fr}.market-search-panel button{width:100%}.market-hero-card strong{font-size:36px}.market-panel,.market-card{border-radius:18px}.compare-bars div{grid-template-columns:42px minmax(0,1fr) 48px}}
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
