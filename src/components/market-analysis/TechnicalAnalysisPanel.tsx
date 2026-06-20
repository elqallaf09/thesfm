'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, Brain, CalendarDays, Calculator, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Gauge, Info, LineChart, RefreshCw, Search, ShieldAlert, Sparkles, Star, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import type { MarketAssetType } from '@/lib/market/marketService';
import type { ApiListState, MarketServiceState, MarketTab, TechnicalState, TechnicalSymbolCategory, TechnicalSymbolOption } from './types';
import {
  MARKET_TOOL_REQUEST_TIMEOUT_MS, TECHNICAL_SYMBOL_CATEGORIES, TECHNICAL_SYMBOL_GROUPS,
  TECHNICAL_SYMBOL_OPTIONS, TECHNICAL_SYMBOL_FAVORITES_KEY,
  getTechnicalSymbolOption, compactTechnicalSymbol, getTechnicalSymbolCategory,
  technicalSymbolDescription, technicalSymbolAssetType, formatTechnicalSymbol,
  normalizeTechnicalSymbolInput, formatTechnicalTimestamp, formatTechnicalNumberValue,
  formatTechnicalPrice, technicalTrendLabelKey, technicalRsiStatusKey, technicalSignalStrength,
  finiteTechnicalNumber, hasDisplayValue, parseNumber, readableLevelMarkerPercent,
  levelMarkerPercent, distancePercent, formatFundamentalValue, technicalEmptyStateCopy,
  isAbortLikeError, logMarketToolPerformance, marketToolFailureState,
  normalizePerformanceTrend, formatNumber, sentimentAssetEmptyBodyKey,
  type SentimentAssetBadgeType,
} from './utils';
import { MarketSectionLoading } from './NewsSentimentPanel';

export function LegacyTechnicalAnalysisPanel({
  t,
  locale,
  symbol,
  state,
  hasSelectedAsset,
  onSelectAsset,
  onApplySymbol,
  onRefresh,
}: {
  t: (key: string) => string;
  locale: string;
  symbol: string;
  state: TechnicalState;
  hasSelectedAsset: boolean;
  onSelectAsset: () => void;
  onApplySymbol: (symbol: string) => boolean;
  onRefresh: () => void;
}) {
  const data = state.data;
  const [category, setCategory] = useState<TechnicalSymbolCategory>(() => getTechnicalSymbolCategory(symbol));
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const normalizedQuery = query.trim().toUpperCase();
  const filteredSymbols = normalizedQuery
    ? TECHNICAL_SYMBOL_OPTIONS.filter(item => `${item.symbol} ${item.label} ${item.description.ar} ${item.description.en} ${item.description.fr}`.toUpperCase().includes(normalizedQuery))
    : TECHNICAL_SYMBOL_GROUPS[category];
  const favoriteSymbols = favorites
    .map(item => getTechnicalSymbolOption(item))
    .filter((item): item is TechnicalSymbolOption => Boolean(item));
  const currentTrend = normalizePerformanceTrend(String(data?.trend ?? state.available?.trend ?? 'neutral'));
  const currentUpdatedAt = String(data?.updated_at ?? state.updatedAt ?? '');
  const currentPriceValue = finiteTechnicalNumber(data?.currentPrice, data?.latestPrice, data?.price, state.available?.currentPrice, state.available?.price);
  const currentStatus = state.loading
    ? t('market_loading_technical_analysis_short')
    : data
      ? t('market_data_complete')
      : state.available
        ? t('market_data_incomplete')
        : t('market_analysis_insufficient');
  const pivotPoints = data?.pivotPoints && typeof data.pivotPoints === 'object' ? data.pivotPoints as Record<string, unknown> : {};
  const pivotValue = finiteTechnicalNumber(pivotPoints.pivot);
  const supportRows = [
    ['S1', pivotPoints.s1],
    ['S2', pivotPoints.s2],
    ['S3', pivotPoints.s3],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const resistanceRows = [
    ['R1', pivotPoints.r1],
    ['R2', pivotPoints.r2],
    ['R3', pivotPoints.r3],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const movingAverageRows = [
    ['MA 20', data?.movingAverages?.sma20 ?? data?.sma20],
    ['MA 50', data?.movingAverages?.sma50 ?? data?.sma50],
    ['MA 200', data?.movingAverages?.sma200 ?? data?.sma200],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const rsiStatusKey = technicalRsiStatusKey(data?.rsi);
  const signalStrength = data ? technicalSignalStrength(data, currentPriceValue, pivotValue) : 'weak';
  const rangeLevels = [
    { label: 'S2', value: finiteTechnicalNumber(pivotPoints.s2), tone: 'support' as const },
    { label: 'S1', value: finiteTechnicalNumber(pivotPoints.s1), tone: 'support' as const },
    { label: 'Pivot', value: pivotValue, tone: 'pivot' as const },
    { label: 'R1', value: finiteTechnicalNumber(pivotPoints.r1), tone: 'resistance' as const },
    { label: 'R2', value: finiteTechnicalNumber(pivotPoints.r2), tone: 'resistance' as const },
  ].filter((item): item is { label: string; value: number; tone: 'support' | 'pivot' | 'resistance' } => item.value !== null);
  const technicalCode = String(state.code ?? '').toUpperCase();
  const partialData = (technicalCode === 'OHLC_DATA_NOT_AVAILABLE' || state.code === 'insufficient_ohlc_data') && state.available ? state.available : null;
  const technicalEmptyCopy = technicalEmptyStateCopy(state.code, t);

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
    const applied = onApplySymbol(nextSymbol);
    if (applied) setQuery('');
  };

  const handleApplySearch = () => {
    const applied = onApplySymbol(query);
    if (applied) setQuery('');
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleApplySearch();
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
      <div className="technical-dashboard-head">
        <span className="technical-dashboard-icon">
          <Gauge size={22} />
        </span>
        <div>
          <h2>{t('market_daily_technical_analysis')}</h2>
          <p>{t('market_daily_technical_subtitle')}</p>
        </div>
        <button className="technical-refresh-button" type="button" onClick={onRefresh} disabled={state.loading}>
          <Activity size={15} className={state.loading ? 'market-spin' : undefined} />
          {state.loading ? t('market_refreshing_technical_analysis') : t('market_refresh_section')}
        </button>
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
            <div className="technical-selector-head">
              <div>
                <span>{t('market_symbol_search_placeholder')}</span>
                <strong dir="ltr">{formatTechnicalSymbol(symbol)}</strong>
              </div>
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
            <TechnicalSummaryItem icon={<CircleDollarSign size={16} />} label={t('market_current_price')} value={currentPriceValue === null ? t('market_unavailable') : formatTechnicalPrice(currentPriceValue)} valueDir="ltr" />
            <TechnicalSummaryItem icon={<Clock3 size={16} />} label={t('market_last_updated')} value={formatTechnicalTimestamp(currentUpdatedAt, locale) || t('market_unavailable')} valueDir="ltr" />
            <TechnicalSummaryItem icon={<TrendingUp size={16} />} label={t('market_general_trend')} value={t(technicalTrendLabelKey(currentTrend))} />
            <TechnicalSummaryItem icon={<CheckCircle2 size={16} />} label={t('market_data_status')} value={currentStatus} />
          </div>
          {state.loading ? <MarketSectionLoading label={t('market_loading_technical_analysis')} /> : partialData ? (
            <TechnicalPartialDataState
              t={t}
              locale={locale}
              available={partialData}
              symbol={state.symbol || symbol}
              updatedAt={state.updatedAt}
              onRefresh={onRefresh}
            />
          ) : state.message || state.code ? (
            <TechnicalEmptyState
              title={technicalEmptyCopy.title}
              body={state.code === 'OHLC_DATA_NOT_AVAILABLE' ? t('market_technical_compact_empty_body') : technicalEmptyCopy.body}
              actionLabel={t('market_refresh_section')}
              onAction={onRefresh}
            />
          ) : data ? (
            <>
              <div className="technical-data-grid">
                <TechnicalDataCard
                  icon={<TrendingUp size={17} />}
                  title={t('market_general_trend')}
                  value={t(technicalTrendLabelKey(String(data.trend ?? 'neutral')))}
                />
                <TechnicalDataCard
                  icon={<Gauge size={17} />}
                  title={t('market_pivot_point')}
                  value={pivotValue === null ? t('market_unavailable') : formatNumber(pivotValue, 4)}
                  valueDir="ltr"
                />
                <TechnicalDataCard
                  icon={<TrendingDown size={17} />}
                  title={t('market_support_zone')}
                  rows={supportRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                  tone="support"
                />
                <TechnicalDataCard
                  icon={<TrendingUp size={17} />}
                  title={t('market_resistance_zone')}
                  rows={resistanceRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                  tone="resistance"
                />
                <TechnicalDataCard
                  icon={<BarChart3 size={17} />}
                  title="RSI"
                  value={formatTechnicalNumberValue(data?.rsi, 1) || t('market_unavailable')}
                  valueDir="ltr"
                  footer={rsiStatusKey ? t(rsiStatusKey) : t('market_unavailable')}
                />
                <TechnicalDataCard
                  icon={<LineChart size={17} />}
                  title={t('market_moving_averages')}
                  rows={movingAverageRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                />
                <TechnicalDataCard
                  icon={<ShieldAlert size={17} />}
                  title={t('market_signal_strength')}
                  value={t(`market_signal_${signalStrength}`)}
                  footer={t('market_signal_helper')}
                  tone="signal"
                />
              </div>
              <TechnicalRangeCard t={t} levels={rangeLevels} />
              <TechnicalEducationCard t={t} />
              <section className="technical-tab-disclaimer">
                <ShieldAlert size={19} />
                <div>
                  <strong>{t('market_disclaimer_title')}</strong>
                  <p>{t('market_disclaimer')}</p>
                </div>
              </section>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

export function TechnicalAnalysisPanel({
  t,
  locale,
  symbol,
  state,
  hasSelectedAsset,
  onSelectAsset,
  onApplySymbol,
  onRefresh,
}: {
  t: (key: string) => string;
  locale: string;
  symbol: string;
  state: TechnicalState;
  hasSelectedAsset: boolean;
  onSelectAsset: () => void;
  onApplySymbol: (symbol: string) => boolean;
  onRefresh: () => void;
}) {
  const data = state.data;
  const [category, setCategory] = useState<TechnicalSymbolCategory>(() => getTechnicalSymbolCategory(symbol));
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const normalizedQuery = query.trim().toUpperCase();
  const selectedSymbolOption = getTechnicalSymbolOption(symbol);
  const selectedSymbolDescription = technicalSymbolDescription(selectedSymbolOption, locale, t);
  const filteredSymbols = normalizedQuery
    ? TECHNICAL_SYMBOL_OPTIONS.filter(item => `${item.symbol} ${item.label} ${item.description.ar} ${item.description.en} ${item.description.fr}`.toUpperCase().includes(normalizedQuery))
    : TECHNICAL_SYMBOL_GROUPS[category];
  const favoriteSymbols = favorites
    .map(item => getTechnicalSymbolOption(item))
    .filter((item): item is TechnicalSymbolOption => Boolean(item));
  const currentTrend = normalizePerformanceTrend(String(data?.trend ?? state.available?.trend ?? 'neutral'));
  const currentUpdatedAt = String(data?.updated_at ?? state.updatedAt ?? '');
  const currentPriceValue = finiteTechnicalNumber(data?.currentPrice, data?.latestPrice, data?.price, state.available?.currentPrice, state.available?.price);
  const currentStatus = state.loading
    ? t('market_loading_technical_analysis_short')
    : data
      ? t('market_data_complete')
      : state.available
        ? t('market_data_incomplete')
        : t('market_analysis_insufficient');
  const pivotPoints = data?.pivotPoints && typeof data.pivotPoints === 'object' ? data.pivotPoints as Record<string, unknown> : {};
  const pivotValue = finiteTechnicalNumber(pivotPoints.pivot);
  const supportRows = [
    ['S1', pivotPoints.s1],
    ['S2', pivotPoints.s2],
    ['S3', pivotPoints.s3],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const resistanceRows = [
    ['R1', pivotPoints.r1],
    ['R2', pivotPoints.r2],
    ['R3', pivotPoints.r3],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const movingAverageRows = [
    ['MA 20', data?.movingAverages?.sma20 ?? data?.sma20],
    ['MA 50', data?.movingAverages?.sma50 ?? data?.sma50],
    ['MA 200', data?.movingAverages?.sma200 ?? data?.sma200],
  ].filter((row): row is [string, unknown] => hasDisplayValue(row[1]));
  const rsiStatusKey = technicalRsiStatusKey(data?.rsi);
  const signalStrength = data ? technicalSignalStrength(data, currentPriceValue, pivotValue) : 'weak';
  const rangeLevels = [
    { label: 'S2', value: finiteTechnicalNumber(pivotPoints.s2), tone: 'support' as const },
    { label: 'S1', value: finiteTechnicalNumber(pivotPoints.s1), tone: 'support' as const },
    { label: 'Pivot', value: pivotValue, tone: 'pivot' as const },
    { label: 'R1', value: finiteTechnicalNumber(pivotPoints.r1), tone: 'resistance' as const },
    { label: 'R2', value: finiteTechnicalNumber(pivotPoints.r2), tone: 'resistance' as const },
  ].filter((item): item is { label: string; value: number; tone: 'support' | 'pivot' | 'resistance' } => item.value !== null);
  const technicalCode = String(state.code ?? '').toUpperCase();
  const partialData = (technicalCode === 'OHLC_DATA_NOT_AVAILABLE' || state.code === 'insufficient_ohlc_data') && state.available ? state.available : null;
  const technicalEmptyCopy = technicalEmptyStateCopy(state.code, t);

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
    const applied = onApplySymbol(nextSymbol);
    if (applied) setQuery('');
  };

  const handleApplySearch = () => {
    const applied = onApplySymbol(query);
    if (applied) setQuery('');
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleApplySearch();
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
    <section className="technical-dashboard" aria-labelledby="daily-technical-title">
      <header className="technical-dashboard-head">
        <span className="technical-dashboard-icon">
          <Gauge size={22} />
        </span>
        <div className="technical-dashboard-title">
          <h2 id="daily-technical-title">{t('market_daily_technical_analysis')}</h2>
          <p>{t('market_daily_technical_subtitle')}</p>
        </div>
        <button className="technical-refresh-button" type="button" onClick={onRefresh} disabled={state.loading}>
          <Activity size={15} className={state.loading ? 'market-spin' : undefined} />
          {state.loading ? t('market_refreshing_technical_analysis') : t('market_refresh_section')}
        </button>
      </header>

      <div className="technical-dashboard-body">
        <section className="technical-selector-shell" aria-label={t('market_asset_type')}>
          <div className="technical-search-row">
            <div className="technical-selected-chip">
              <span className="technical-selected-chip-icon" aria-hidden="true">
                <WalletCards size={16} />
              </span>
              <div>
                <small>{t('market_selected_asset')}</small>
                <strong dir="ltr">{formatTechnicalSymbol(symbol)}</strong>
                <span dir="auto">{selectedSymbolDescription}</span>
              </div>
            </div>
            <div className="technical-search">
              <Search size={16} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('market_symbol_search_placeholder')}
                dir="auto"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label={t('market_clear_symbol_search')}>
                  <span aria-hidden="true">&times;</span>
                </button>
              ) : null}
            </div>
            <button className="technical-search-apply" type="button" onClick={handleApplySearch} disabled={state.loading}>
              <Search size={16} aria-hidden="true" />
              {t('market_search_button')}
            </button>
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
              <span className="technical-no-results">{t('market_no_matching_asset')}</span>
            )}
          </div>
        </section>

        {!hasSelectedAsset && !state.message && !state.code ? (
          <MarketEmptyState
            icon={<LineChart size={22} />}
            title={t('market_technical_choose_asset_title')}
            description={t('market_technical_choose_asset_body')}
            actionLabel={t('market_search_asset_action')}
            onAction={onSelectAsset}
          />
        ) : (
          <>
            {hasSelectedAsset ? (
              <section className="technical-selected-summary" aria-label={t('market_selected_asset')}>
                <TechnicalSummaryItem icon={<WalletCards size={16} />} label={t('market_selected_asset')} value={formatTechnicalSymbol(symbol)} valueDir="ltr" />
                <TechnicalSummaryItem icon={<CircleDollarSign size={16} />} label={t('market_current_price')} value={currentPriceValue === null ? t('market_unavailable') : formatTechnicalPrice(currentPriceValue)} valueDir="ltr" />
                <TechnicalSummaryItem icon={<Clock3 size={16} />} label={t('market_last_updated')} value={formatTechnicalTimestamp(currentUpdatedAt, locale) || t('market_unavailable')} valueDir="ltr" />
                <TechnicalSummaryItem icon={<TrendingUp size={16} />} label={t('market_general_trend')} value={t(technicalTrendLabelKey(currentTrend))} />
                <TechnicalSummaryItem icon={<CheckCircle2 size={16} />} label={t('market_data_status')} value={currentStatus} />
              </section>
            ) : null}

            <div className="technical-content-stage">
              {state.loading ? <MarketSectionLoading label={t('market_loading_technical_analysis')} /> : partialData ? (
                <TechnicalPartialDataState
                  t={t}
                  locale={locale}
                  available={partialData}
                  symbol={state.symbol || symbol}
                  updatedAt={state.updatedAt}
                  onRefresh={onRefresh}
                />
              ) : state.message || state.code ? (
                <TechnicalEmptyState
                  title={technicalEmptyCopy.title}
                  body={state.code === 'OHLC_DATA_NOT_AVAILABLE' ? t('market_technical_compact_empty_body') : technicalEmptyCopy.body}
                  actionLabel={t('market_refresh_section')}
                  onAction={onRefresh}
                />
              ) : data ? (
                <>
                  <section className="technical-data-grid" aria-label={t('market_daily_technical_analysis')}>
                    <TechnicalDataCard
                      icon={<Gauge size={17} />}
                      title={t('market_pivot_point')}
                      value={pivotValue === null ? t('market_unavailable') : formatNumber(pivotValue, 4)}
                      valueDir="ltr"
                    />
                    <TechnicalDataCard
                      icon={<TrendingDown size={17} />}
                      title={t('market_support_zone')}
                      rows={supportRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                      tone="support"
                    />
                    <TechnicalDataCard
                      icon={<TrendingUp size={17} />}
                      title={t('market_resistance_zone')}
                      rows={resistanceRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                      tone="resistance"
                    />
                    <TechnicalDataCard
                      icon={<BarChart3 size={17} />}
                      title="RSI"
                      value={formatTechnicalNumberValue(data?.rsi, 1) || t('market_unavailable')}
                      valueDir="ltr"
                      footer={rsiStatusKey ? t(rsiStatusKey) : t('market_unavailable')}
                    />
                    <TechnicalDataCard
                      icon={<LineChart size={17} />}
                      title={t('market_moving_averages')}
                      rows={movingAverageRows.map(([label, value]) => [label, formatTechnicalNumberValue(value, 4)])}
                    />
                    <TechnicalDataCard
                      icon={<ShieldAlert size={17} />}
                      title={t('market_signal_strength')}
                      value={t(`market_signal_${signalStrength}`)}
                      footer={t('market_signal_helper')}
                      tone="signal"
                    />
                  </section>

                  <TechnicalRangeCard t={t} levels={rangeLevels} />
                  <TechnicalEducationCard t={t} />
                  <section className="technical-tab-disclaimer">
                    <ShieldAlert size={19} />
                    <div>
                      <strong>{t('market_disclaimer_title')}</strong>
                      <p>{t('market_disclaimer')}</p>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function MarketDefaultDashboard({
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

export function MarketEmptyState({
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

export function MarketStatusCard({
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

export function MarketStatusBanner({
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
        <p>{connected ? `${t('market_data_source')}: Yahoo Finance` : serviceNotice || t('market_preparing_analysis_body')}</p>
      </div>
    </section>
  );
}

export function TechnicalSummaryItem({
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

export function TechnicalDataCard({
  icon,
  title,
  value,
  valueDir,
  rows,
  footer,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value?: string;
  valueDir?: 'ltr' | 'rtl';
  rows?: Array<[string, string]>;
  footer?: string;
  tone?: 'support' | 'resistance' | 'signal';
}) {
  return (
    <article className={`technical-data-card ${tone ?? ''}`}>
      <div className="technical-data-card-head">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>
      {value ? <strong dir={valueDir}>{value}</strong> : null}
      {rows && rows.length > 0 ? (
        <div className="technical-data-rows">
          {rows.map(([label, rowValue]) => (
            <div key={`${title}-${label}`}>
              <small dir="auto">{label}</small>
              <b dir="ltr">{rowValue}</b>
            </div>
          ))}
        </div>
      ) : null}
      {footer ? <p className="technical-data-card-foot">{footer}</p> : null}
    </article>
  );
}

export function TechnicalRangeCard({
  t,
  levels,
}: {
  t: (key: string) => string;
  levels: Array<{ label: string; value: number; tone: 'support' | 'pivot' | 'resistance' }>;
}) {
  if (levels.length < 3) return null;
  const values = levels.map(item => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <article className="technical-range-card">
      <div className="technical-range-head">
        <div>
          <strong>{t('market_support_resistance_levels')}</strong>
          <p>{t('market_support_resistance_helper')}</p>
        </div>
        <span><LineChart size={18} /></span>
      </div>
      <div className="technical-range-track">
        <span className="technical-range-fill support" />
        <span className="technical-range-fill pivot" />
        <span className="technical-range-fill resistance" />
        {levels.map(level => {
          const position = `${((level.value - min) / span) * 100}%`;
          return (
            <span className={`technical-range-marker ${level.tone}`} style={{ insetInlineStart: position }} key={level.label}>
              <b dir="ltr">{level.label}</b>
              <small dir="ltr">{formatNumber(level.value, 4)}</small>
            </span>
          );
        })}
      </div>
    </article>
  );
}

export function TechnicalEducationCard({ t }: { t: (key: string) => string }) {
  const bullets = [
    ['market_technical_explanation_pivot', 'Pivot'],
    ['market_technical_explanation_support', 'S1 / S2'],
    ['market_technical_explanation_resistance', 'R1 / R2'],
    ['market_technical_explanation_rsi', 'RSI'],
    ['market_technical_explanation_averages', 'MA'],
  ];

  return (
    <article className="technical-education-card">
      <div className="technical-education-head">
        <span><BarChart3 size={18} /></span>
        <strong>{t('market_technical_explanation_title')}</strong>
      </div>
      <ul className="technical-education-list">
        {bullets.map(([key, label]) => (
          <li key={key}>
            <b dir="ltr">{label}</b>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function TechnicalEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="technical-empty-state">
      <AlertTriangle size={19} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction}>
            <Activity size={15} />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TechnicalPartialDataState({
  t,
  locale,
  available,
  symbol,
  updatedAt,
  onRefresh,
}: {
  t: (key: string) => string;
  locale: string;
  available: Record<string, any>;
  symbol: string;
  updatedAt?: string;
  onRefresh: () => void;
}) {
  const parsedPrice = Number(available.currentPrice ?? available.price);
  const source = String(available.source ?? '').trim();
  const displaySymbol = String(available.symbol ?? available.providerSymbol ?? symbol ?? '').trim();
  const availableUpdatedAt = String(available.updatedAt ?? updatedAt ?? '').trim();
  const metricRows = [
    displaySymbol ? [t('market_symbol'), formatTechnicalSymbol(displaySymbol), 'ltr'] as const : null,
    Number.isFinite(parsedPrice) && parsedPrice > 0 ? [t('market_current_price'), formatTechnicalPrice(parsedPrice), 'ltr'] as const : null,
    availableUpdatedAt ? [t('market_last_updated'), formatTechnicalTimestamp(availableUpdatedAt, locale) || t('market_unavailable'), 'ltr'] as const : null,
    source ? [t('market_data_source'), ['yahoo', 'yahoo finance'].includes(source.toLowerCase()) ? 'Yahoo Finance' : source, 'ltr'] as const : null,
  ].filter((row): row is readonly [string, string, 'ltr'] => Boolean(row));

  return (
    <div className="technical-partial-state">
      <div className="technical-partial-state-head">
        <span><AlertTriangle size={18} /></span>
        <div>
          <strong>{t('market_technical_partial_title')}</strong>
          <p>{t('market_technical_partial_body')}</p>
        </div>
      </div>
      {metricRows.length > 0 ? (
        <div className="technical-partial-grid">
          {metricRows.map(([label, value, dir]) => (
            <span className="technical-partial-metric" key={label}>
              <small>{label}</small>
              <b dir={dir}>{value}</b>
            </span>
          ))}
        </div>
      ) : null}
      <div className="technical-partial-note">
        <p>{t('market_technical_pivot_unavailable_body')}</p>
        <small>{t('market_technical_ohlc_helper')}</small>
      </div>
      <button className="technical-partial-action" type="button" onClick={onRefresh}>
        <Activity size={15} />
        {t('market_refresh_section')}
      </button>
    </div>
  );
}

export function textField(item: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

export function numberField(item: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).replace('%', '').replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) return parsed <= 1 && parsed >= 0 ? parsed * 100 : parsed;
  }
  return null;
}

export function plainNumberField(item: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function clampPercentValue(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function sentimentValues(item: Record<string, any>) {
  const buy = numberField(item, ['buyPercent', 'buyPercentage', 'buy_percentage', 'buy_percent', 'buyRatio', 'buy_ratio', 'buy', 'longPercent', 'longPercentage', 'long_percentage', 'long', 'bullishPercent', 'bullish_percentage']);
  const sell = numberField(item, ['sellPercent', 'sellPercentage', 'sell_percentage', 'sell_percent', 'sellRatio', 'sell_ratio', 'sell', 'shortPercent', 'shortPercentage', 'short_percentage', 'short', 'bearishPercent', 'bearish_percentage']);
  if (buy === null || sell === null) return null;
  return {
    buy: clampPercentValue(buy),
    sell: clampPercentValue(sell),
  };
}

export function sentimentTone(values: { buy: number; sell: number }) {
  if (values.buy > values.sell + 5) return 'buy';
  if (values.sell > values.buy + 5) return 'sell';
  return 'balanced';
}

export function formatSentimentMetricNumber(value: number, locale: string, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatSentimentMetricPair(
  longValue: number | null,
  shortValue: number | null,
  locale: string,
  unavailableLabel: string,
) {
  if (longValue === null && shortValue === null) return '';
  const longText = longValue === null ? unavailableLabel : formatSentimentMetricNumber(longValue, locale);
  const shortText = shortValue === null ? unavailableLabel : formatSentimentMetricNumber(shortValue, locale);
  return `${longText} / ${shortText}`;
}

export function sentimentExtraMetrics(item: Record<string, any>, t: (key: string) => string, locale: string) {
  const provider = textField(item, ['source', 'provider']);
  const updatedAt = textField(item, ['updatedAt', 'updated_at', 'lastUpdated', 'timestamp']);
  const totalPositions = plainNumberField(item, ['positions', 'totalPositions', 'positionCount', 'positionsCount']);
  const longPositions = plainNumberField(item, ['longPositions', 'buyPositions', 'longPositionCount', 'buyPositionCount']);
  const shortPositions = plainNumberField(item, ['shortPositions', 'sellPositions', 'shortPositionCount', 'sellPositionCount']);
  const totalLots = plainNumberField(item, ['totalLots', 'lots', 'volume', 'totalVolume']);
  const longLots = plainNumberField(item, ['longLots', 'buyLots', 'longVolume']);
  const shortLots = plainNumberField(item, ['shortLots', 'sellLots', 'shortVolume']);
  const averagePrice = plainNumberField(item, ['averagePrice', 'avgPrice', 'average', 'priceAvg']);
  const averageLongPrice = plainNumberField(item, ['averageLongPrice', 'longAveragePrice', 'longAvgPrice', 'buyAveragePrice']);
  const averageShortPrice = plainNumberField(item, ['averageShortPrice', 'shortAveragePrice', 'shortAvgPrice', 'sellAveragePrice']);
  const unavailable = t('market_unavailable');
  const positionValue = totalPositions !== null
    ? formatSentimentMetricNumber(totalPositions, locale, { maximumFractionDigits: 0 })
    : formatSentimentMetricPair(longPositions, shortPositions, locale, unavailable);
  const lotValue = totalLots !== null
    ? formatSentimentMetricNumber(totalLots, locale)
    : formatSentimentMetricPair(longLots, shortLots, locale, unavailable);
  const averageValue = averagePrice !== null
    ? formatSentimentMetricNumber(averagePrice, locale, { maximumFractionDigits: 5 })
    : formatSentimentMetricPair(averageLongPrice, averageShortPrice, locale, unavailable);

  return [
    provider ? [t('market_sentiment_provider_metric'), provider] as const : null,
    updatedAt ? [t('market_sentiment_last_updated_metric'), formatMarketToolTimestamp(updatedAt, locale) || updatedAt] as const : null,
    positionValue ? [t('market_sentiment_positions'), positionValue] as const : null,
    lotValue ? [t('market_sentiment_lots'), lotValue] as const : null,
    averageValue ? [t('market_sentiment_average_price'), averageValue] as const : null,
  ].filter((row): row is readonly [string, string] => Boolean(row));
}

export function formatMarketToolTimestamp(value: string | undefined, locale = 'ar') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function publicNewsEmptyCopy(code: string | undefined, t: (key: string) => string) {
  if (code === 'MARKET_DATA_TIMEOUT') {
    return { title: t('market_section_timeout_title'), body: t('market_section_timeout_body') };
  }
  if (code === 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED') {
    return { title: t('market_news_not_configured_title'), body: t('market_news_not_configured_body') };
  }
  if (code === 'NO_CENTRAL_BANK_NEWS') {
    return { title: t('market_news_no_items_title'), body: t('market_news_no_items_body') };
  }
  if (code === 'CENTRAL_BANK_NEWS_PROVIDER_FAILED' || code === 'CENTRAL_BANK_NEWS_PROVIDER_ERROR') {
    return { title: t('market_news_unavailable_title'), body: t('market_news_provider_failed_body') };
  }
  return { title: t('market_news_unavailable_title'), body: t('market_news_unavailable_body') };
}

export function publicSentimentEmptyCopy(code: string | undefined, t: (key: string) => string, assetType: SentimentAssetBadgeType = 'unknown') {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  if (code === 'NO_SELECTED_ASSET') {
    return { title: t('market_sentiment_symbol_required_title'), body: t('market_sentiment_symbol_required_body') };
  }
  if (normalizedCode === 'MARKET_DATA_TIMEOUT' || normalizedCode === 'MARKET_SENTIMENT_TIMEOUT' || normalizedCode === 'TIMEOUT') {
    return { title: t('market_sentiment_timeout_title'), body: t('market_sentiment_timeout_body') };
  }
  if (normalizedCode === 'MISSING_CREDENTIALS') {
    return { title: t('market_sentiment_myfxbook_missing_credentials_title'), body: t('market_sentiment_myfxbook_missing_credentials_body') };
  }
  if (normalizedCode === 'LOGIN_REJECTED') {
    return { title: t('market_sentiment_myfxbook_login_rejected_title'), body: t('market_sentiment_myfxbook_login_rejected_body') };
  }
  if (normalizedCode === 'LOGIN_FAILED') {
    return { title: t('market_sentiment_myfxbook_login_rejected_title'), body: t('market_sentiment_myfxbook_login_rejected_body') };
  }
  if (normalizedCode === 'INVALID_SESSION' || normalizedCode === 'MYFXBOOK_INVALID_SESSION') {
    return { title: t('market_sentiment_myfxbook_outlook_failed_title'), body: t('market_sentiment_myfxbook_outlook_failed_body') };
  }
  if (normalizedCode === 'HTML_RESPONSE' || normalizedCode === 'MYFXBOOK_HTML_RESPONSE') {
    return { title: t('market_sentiment_myfxbook_html_title'), body: t('market_sentiment_myfxbook_html_body') };
  }
  if (normalizedCode === 'CLOUDFLARE_BLOCKED' || normalizedCode === 'MYFXBOOK_CLOUDFLARE_BLOCKED') {
    return { title: t('market_sentiment_myfxbook_cloudflare_title'), body: t('market_sentiment_myfxbook_cloudflare_body') };
  }
  if (normalizedCode === 'NO_SESSION') {
    return { title: t('market_sentiment_myfxbook_no_session_title'), body: t('market_sentiment_myfxbook_no_session_body') };
  }
  if (normalizedCode === 'INVALID_FOREX_PAIR') {
    return { title: t('market_sentiment_invalid_forex_pair_title'), body: t('market_sentiment_invalid_forex_pair_body') };
  }
  if (
    normalizedCode === 'NO_SENTIMENT_DATA'
    || normalizedCode === 'UNSUPPORTED_ASSET_TYPE'
    || normalizedCode === 'MISSING_PROVIDER'
  ) {
    return { title: t('market_sentiment_asset_unavailable_title'), body: t(sentimentAssetEmptyBodyKey(assetType)) };
  }
  if (normalizedCode === 'MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED') {
    return { title: t('market_sentiment_not_configured_title'), body: t('market_sentiment_not_configured_body') };
  }
  if (normalizedCode === 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED') {
    return { title: t('market_sentiment_myfxbook_not_configured_title'), body: t('market_sentiment_myfxbook_not_configured_body') };
  }
  if (normalizedCode === 'MARKET_SENTIMENT_PROVIDER_MISSING') {
    return { title: t('market_sentiment_provider_missing_title'), body: t('market_sentiment_provider_missing_body') };
  }
  if (normalizedCode === 'SYMBOL_REQUIRED') {
    return { title: t('market_sentiment_symbol_required_title'), body: t('market_sentiment_symbol_required_body') };
  }
  if (normalizedCode === 'MARKET_SENTIMENT_AUTH_FAILED') {
    return { title: t('market_sentiment_auth_failed_title'), body: t('market_sentiment_auth_failed_body') };
  }
  if (normalizedCode === 'MYFXBOOK_AUTH_FAILED') {
    return { title: t('market_sentiment_myfxbook_auth_failed_title'), body: t('market_sentiment_myfxbook_auth_failed_body') };
  }
  if (normalizedCode === 'MYFXBOOK_SESSION_MISSING') {
    return { title: t('market_sentiment_myfxbook_session_missing_title'), body: t('market_sentiment_myfxbook_session_missing_body') };
  }
  if (normalizedCode === 'MARKET_SENTIMENT_PLAN_NOT_ALLOWED') {
    return { title: t('market_sentiment_plan_not_allowed_title'), body: t('market_sentiment_plan_not_allowed_body') };
  }
  if (normalizedCode === 'MARKET_SENTIMENT_RATE_LIMITED' || normalizedCode === 'MYFXBOOK_RATE_LIMITED' || normalizedCode === 'RATE_LIMIT') {
    return { title: t('market_sentiment_rate_limited_title'), body: t('market_sentiment_rate_limited_body') };
  }
  if (normalizedCode === 'NO_DATA') {
    const bodyKey = assetType === 'forex' || assetType === 'gold' || assetType === 'silver' || assetType === 'metals'
      ? 'market_sentiment_myfxbook_no_items_body'
      : sentimentAssetEmptyBodyKey(assetType);
    return { title: t('market_sentiment_asset_unavailable_title'), body: t(bodyKey) };
  }
  if (normalizedCode === 'NO_MARKET_SENTIMENT_DATA') {
    const bodyKey = assetType === 'forex' || assetType === 'gold' || assetType === 'silver' || assetType === 'metals'
      ? 'market_sentiment_myfxbook_no_items_body'
      : sentimentAssetEmptyBodyKey(assetType);
    return { title: t('market_sentiment_asset_unavailable_title'), body: t(bodyKey) };
  }
  if (normalizedCode === 'MYFXBOOK_PROVIDER_FAILED') {
    return { title: t('market_sentiment_unavailable_title'), body: t('market_sentiment_myfxbook_provider_failed_body') };
  }
  if (
    normalizedCode === 'PROVIDER_DOWN'
    || normalizedCode === 'MARKET_SENTIMENT_PROVIDER_FAILED'
    || normalizedCode === 'MARKET_SENTIMENT_PROVIDER_ERROR'
    || normalizedCode === 'MARKET_SENTIMENT_PROVIDER_UNAVAILABLE'
  ) {
    return { title: t('market_sentiment_unavailable_title'), body: t('market_sentiment_provider_failed_body') };
  }
  return { title: t('market_sentiment_unavailable_title'), body: t('market_sentiment_unavailable_body') };
}

export function sentimentProviderStatusMeta(status: unknown, t: (key: string) => string) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'connected') {
    return { label: t('market_sentiment_status_connected'), className: 'connected' };
  }
  if (normalized === 'limited') {
    return { label: t('market_sentiment_status_limited'), className: 'limited' };
  }
  if (normalized === 'timeout') {
    return { label: t('market_sentiment_status_timeout'), className: 'timeout' };
  }
  if (normalized === 'needs_setup' || normalized === 'not_configured') {
    return { label: t('market_sentiment_status_needs_setup'), className: 'needs-setup' };
  }
  return { label: t('market_sentiment_status_disconnected'), className: 'disconnected' };
}

