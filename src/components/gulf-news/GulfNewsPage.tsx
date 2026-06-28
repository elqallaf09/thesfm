'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Clock3,
  Filter,
  LayoutGrid,
  List,
  Newspaper,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useMarketLanguage } from '@/hooks/useMarketLanguage';
import { GULF_MARKETS, getGulfMarket, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';
import { GulfExchangeSelector } from '@/components/gulf-news/GulfExchangeSelector';
import { GulfMarketSummary } from '@/components/gulf-news/GulfMarketSummary';
import { GulfNewsCard } from '@/components/gulf-news/GulfNewsCard';
import { GulfNewsHeader } from '@/components/gulf-news/GulfNewsHeader';
import { GulfNewsSkeleton } from '@/components/gulf-news/GulfNewsSkeleton';
import { GulfNewsStatusBar } from '@/components/gulf-news/GulfNewsStatusBar';
import { GulfTickerStrip } from '@/components/gulf-news/GulfTickerStrip';
import { MarketMoversCard } from '@/components/market-news/MarketMoversCard';

type GulfNewsApiResponse =
  | {
    success: true;
    source: string;
    language: string;
    translationEnabled: boolean;
    lastUpdated: string;
    markets?: Array<{
      code: string;
      name: string;
      indexName: string;
      requestedSymbol: string | null;
      symbolUsed: string | null;
      value: number | null;
      change: number | null;
      changePercent: number | null;
      currency: string | null;
      marketTime: string | null;
      source: string;
      sourceLabel?: string;
      delayed: boolean;
      available: boolean;
      unavailableReason?: string;
    }>;
    items: GulfNewsItem[];
    marketData: Partial<Record<GulfMarketId, GulfMarketData>>;
  }
  | { success: false; error?: string; reason?: string };

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function secondsUntilNextRefresh(lastLoadedAt: number) {
  const elapsed = Math.floor((Date.now() - lastLoadedAt) / 1000);
  return Math.max(0, 300 - elapsed);
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const INITIAL_NEWS_LIMIT = 12;

type GulfNewsSort = 'recent' | 'oldest' | 'source';
type GulfNewsTimeRange = 'all' | 'hour' | 'today' | '7d' | '30d';
type GulfNewsViewMode = 'grid' | 'list';

function normalizeNewsTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeNewsItems(newsItems: GulfNewsItem[]) {
  const seen = new Set<string>();
  return newsItems.filter(item => {
    const urlKey = item.url.trim().toLowerCase();
    const titleKey = `${item.market}:${normalizeNewsTitle(item.title || item.headline)}`;
    const key = urlKey || titleKey;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    seen.add(titleKey);
    return true;
  });
}

function isWithinRange(value: string, range: GulfNewsTimeRange) {
  if (range === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const elapsed = now - date.getTime();
  if (range === 'hour') return elapsed <= 60 * 60 * 1000;
  if (range === 'today') return elapsed <= 24 * 60 * 60 * 1000;
  if (range === '7d') return elapsed <= 7 * 24 * 60 * 60 * 1000;
  return elapsed <= 30 * 24 * 60 * 60 * 1000;
}

export function GulfNewsPage() {
  const { dir, lang, t } = useMarketLanguage();
  const [items, setItems] = useState<GulfNewsItem[]>([]);
  const [marketData, setMarketData] = useState<Partial<Record<GulfMarketId, GulfMarketData>>>({});
  const [selectedMarket, setSelectedMarket] = useState<GulfMarketId>('saudi');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<GulfNewsTimeRange>('all');
  const [sortBy, setSortBy] = useState<GulfNewsSort>('recent');
  const [viewMode, setViewMode] = useState<GulfNewsViewMode>('grid');
  const [visibleCount, setVisibleCount] = useState(INITIAL_NEWS_LIMIT);
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(Date.now());
  const [countdown, setCountdown] = useState(300);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const locale = localeFor(lang);
  const ui = useMemo(() => {
    if (lang === 'en') {
      return {
        allSources: 'All sources',
        allTime: 'All time',
        lastHour: 'Last hour',
        today: 'Today',
        last7Days: 'Last 7 days',
        last30Days: 'Last 30 days',
        source: 'Source',
        timeRange: 'Time range',
        clearFilters: 'Clear filters',
        resultsTitle: 'Available market stories',
        featuredTitle: 'Latest highlighted stories',
        featuredSubtitle: 'A compact lead area based on the newest matching real news.',
        resultCount: (count: number) => `${count} ${count === 1 ? 'story' : 'stories'}`,
        sortOldest: 'Oldest',
        sortSource: 'Source name',
        gridView: 'Grid',
        listView: 'List',
        loadMore: 'Load more news',
        activeFilters: 'Active filters',
        marketPulse: 'Gulf market pulse',
        risingMarkets: 'Rising markets',
        fallingMarkets: 'Falling markets',
        availableIndexes: 'Available indexes',
        strongestMarket: 'Strongest market',
      };
    }
    if (lang === 'fr') {
      return {
        allSources: 'Toutes les sources',
        allTime: 'Toute la période',
        lastHour: 'Dernière heure',
        today: 'Aujourd’hui',
        last7Days: '7 derniers jours',
        last30Days: '30 derniers jours',
        source: 'Source',
        timeRange: 'Période',
        clearFilters: 'Effacer les filtres',
        resultsTitle: 'Actualités disponibles',
        featuredTitle: 'Actualités récentes mises en avant',
        featuredSubtitle: 'Une zone de lecture basée sur les dernières actualités réelles.',
        resultCount: (count: number) => `${count} actualité${count > 1 ? 's' : ''}`,
        sortOldest: 'Les plus anciennes',
        sortSource: 'Nom de source',
        gridView: 'Grille',
        listView: 'Liste',
        loadMore: 'Afficher plus',
        activeFilters: 'Filtres actifs',
        marketPulse: 'Synthèse des marchés du Golfe',
        risingMarkets: 'Marchés en hausse',
        fallingMarkets: 'Marchés en baisse',
        availableIndexes: 'Indices disponibles',
        strongestMarket: 'Marché le plus fort',
      };
    }
    return {
      allSources: 'كل المصادر',
      allTime: 'كل الفترات',
      lastHour: 'آخر ساعة',
      today: 'اليوم',
      last7Days: 'آخر 7 أيام',
      last30Days: 'آخر 30 يوما',
      source: 'مصدر الخبر',
      timeRange: 'الفترة الزمنية',
      clearFilters: 'مسح الفلاتر',
      resultsTitle: 'الأخبار المتاحة',
      featuredTitle: 'أبرز الأخبار الحديثة',
      featuredSubtitle: 'منطقة مختصرة تعرض أحدث الأخبار المطابقة من البيانات الفعلية.',
      resultCount: (count: number) => `${count} ${count === 1 ? 'خبر' : 'خبر'}`,
      sortOldest: 'الأقدم',
      sortSource: 'اسم المصدر',
      gridView: 'شبكة',
      listView: 'قائمة',
      loadMore: 'عرض المزيد من الأخبار',
      activeFilters: 'الفلاتر النشطة',
      marketPulse: 'ملخص الأسواق الخليجية اليوم',
      risingMarkets: 'أسواق مرتفعة',
      fallingMarkets: 'أسواق منخفضة',
      availableIndexes: 'مؤشرات متاحة',
      strongestMarket: 'أقوى سوق',
    };
  }, [lang]);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/gulf-news?lang=${encodeURIComponent(lang)}&limit=50`);
      const json = await response.json().catch(() => ({})) as GulfNewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('gulf_news_error') : t('gulf_news_error'));
      }
      setItems(json.items);
      setMarketData(json.marketData ?? {});
      setLastUpdated(json.lastUpdated);
      setLastLoadedAt(Date.now());
      setCountdown(300);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('gulf_news_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [lang, t]);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => {
      void load(false);
    }, 300000);
    return () => window.clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(secondsUntilNextRefresh(lastLoadedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [lastLoadedAt]);

  const selectedMarketConfig = getGulfMarket(selectedMarket);
  const unavailableHelperByMarket: Partial<Record<GulfMarketId, string>> = {
    bahrain: t('gulf_news_bahrain_unavailable_helper'),
    oman: t('gulf_news_oman_unavailable_helper'),
    'uae-adx': t('gulf_news_uae_adx_unavailable_helper'),
  };
  const selectedUnavailableHelper = unavailableHelperByMarket[selectedMarket] ?? t('gulf_news_unavailable_helper');
  const marketLabels = useMemo<Record<GulfMarketId, string>>(() => ({
    kuwait: t('gulf_news_market_kuwait'),
    saudi: t('gulf_news_market_saudi'),
    oman: t('gulf_news_market_oman'),
    bahrain: t('gulf_news_market_bahrain'),
    'uae-dfm': t('gulf_news_market_uae_dfm'),
    'uae-adx': t('gulf_news_market_uae_adx'),
    qatar: t('gulf_news_market_qatar'),
  }), [t]);

  useEffect(() => {
    setVisibleCount(INITIAL_NEWS_LIMIT);
  }, [selectedMarket, query, sourceFilter, timeRange, sortBy]);

  useEffect(() => {
    setSourceFilter('all');
  }, [selectedMarket]);

  const dedupedItems = useMemo(() => dedupeNewsItems(items), [items]);

  const selectedMarketItems = useMemo(() => (
    dedupedItems.filter(item => item.market === selectedMarket)
  ), [dedupedItems, selectedMarket]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(selectedMarketItems.map(item => item.source).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [selectedMarketItems]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = selectedMarketItems
      .filter(item => !needle
        || item.title.toLowerCase().includes(needle)
        || item.summary.toLowerCase().includes(needle)
        || (item.titleOriginal ?? '').toLowerCase().includes(needle)
        || (item.summaryOriginal ?? '').toLowerCase().includes(needle)
        || item.source.toLowerCase().includes(needle)
        || marketLabels[item.market].toLowerCase().includes(needle))
      .filter(item => sourceFilter === 'all' || item.source === sourceFilter)
      .filter(item => isWithinRange(item.publishedAt, timeRange));

    return [...sorted].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (sortBy === 'source') return a.source.localeCompare(b.source) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [marketLabels, query, selectedMarketItems, sortBy, sourceFilter, timeRange]);

  const featuredItems = useMemo(() => filteredItems.slice(0, Math.min(3, filteredItems.length)), [filteredItems]);
  const featuredIds = useMemo(() => new Set(featuredItems.map(item => item.id)), [featuredItems]);
  const regularItems = useMemo(() => filteredItems.filter(item => !featuredIds.has(item.id)), [featuredIds, filteredItems]);
  const visibleItems = useMemo(() => regularItems.slice(0, visibleCount), [regularItems, visibleCount]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (query.trim()) filters.push({ key: 'query', label: query.trim(), onClear: () => setQuery('') });
    if (sourceFilter !== 'all') filters.push({ key: 'source', label: sourceFilter, onClear: () => setSourceFilter('all') });
    if (timeRange !== 'all') {
      const timeLabel = {
        hour: ui.lastHour,
        today: ui.today,
        '7d': ui.last7Days,
        '30d': ui.last30Days,
        all: ui.allTime,
      }[timeRange];
      filters.push({ key: 'time', label: timeLabel, onClear: () => setTimeRange('all') });
    }
    return filters;
  }, [query, sourceFilter, timeRange, ui]);

  const marketPulse = useMemo(() => {
    const availableMarkets = GULF_MARKETS
      .map(market => ({ market, data: marketData[market.id] }))
      .filter(entry => entry.data?.value !== null && entry.data?.value !== undefined);
    const rising = availableMarkets.filter(entry => (entry.data?.changePercent ?? 0) > 0);
    const falling = availableMarkets.filter(entry => (entry.data?.changePercent ?? 0) < 0);
    const strongest = [...availableMarkets].sort((a, b) => (b.data?.changePercent ?? -Infinity) - (a.data?.changePercent ?? -Infinity))[0];
    return {
      availableCount: availableMarkets.length,
      risingCount: rising.length,
      fallingCount: falling.length,
      strongestLabel: strongest ? marketLabels[strongest.market.id] : t('gulf_news_unavailable'),
      strongestChange: strongest?.data?.changePercent ?? null,
    };
  }, [marketData, marketLabels, t]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return t('gulf_news_unavailable');
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return t('gulf_news_unavailable');
    return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value)}%`;
  };

  const searchPlaceholder = t('gulf_news_search_market_placeholder').replace('{market}', marketLabels[selectedMarket]);

  return (
    <div className="gulf-news-shell" dir={dir}>
      <Sidebar />
      <main className="gulf-news-main">
        <GulfTickerStrip
          labels={marketLabels}
          unavailableLabel={t('gulf_news_unavailable')}
          marketData={marketData}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <GulfNewsHeader
          title={t('gulf_news_title')}
          subtitle={t('gulf_news_header_subtitle')}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />

        <GulfNewsStatusBar
          labels={{
            lastUpdated: t('gulf_news_last_updated'),
            nextUpdate: t('gulf_news_next_update'),
            delayed: t('gulf_news_delayed_short'),
            source: t('gulf_news_source_rss'),
          }}
          lastUpdated={lastUpdated}
          nextUpdate={formatCountdown(countdown)}
          formatDateTime={formatDateTime}
        />

        <GulfExchangeSelector
          markets={GULF_MARKETS}
          selectedMarket={selectedMarket}
          labels={marketLabels}
          unavailableLabel={t('gulf_news_unavailable')}
          marketData={marketData}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
          onSelect={setSelectedMarket}
        />

        <GulfMarketSummary
          market={selectedMarketConfig}
          marketLabel={marketLabels[selectedMarket]}
          data={marketData[selectedMarket]}
          labels={{
            title: t('gulf_news_market_summary'),
            indexName: t('gulf_news_index_name'),
            indexValue: t('gulf_news_index_value'),
            dailyChange: t('gulf_news_daily_change'),
            source: t('gulf_news_source'),
            unavailable: t('gulf_news_unavailable'),
            unavailableHelper: selectedUnavailableHelper,
            delayed: t('gulf_news_delayed_badge'),
          }}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <section className="gulf-news-market-pulse" aria-label={ui.marketPulse}>
          <div className="gulf-news-section-heading compact">
            <span>
              <BarChart3 size={18} />
            </span>
            <div>
              <h2>{ui.marketPulse}</h2>
              <p>{t('gulf_news_delayed_15')}</p>
            </div>
          </div>
          <div className="gulf-news-pulse-grid">
            <div>
              <span>{ui.risingMarkets}</span>
              <strong>{marketPulse.risingCount}</strong>
            </div>
            <div>
              <span>{ui.fallingMarkets}</span>
              <strong>{marketPulse.fallingCount}</strong>
            </div>
            <div>
              <span>{ui.availableIndexes}</span>
              <strong>{marketPulse.availableCount}</strong>
            </div>
            <div>
              <span>{ui.strongestMarket}</span>
              <strong>{marketPulse.strongestLabel}</strong>
              <em dir="ltr">{formatPercent(marketPulse.strongestChange)}</em>
            </div>
          </div>
        </section>

        <section className="gulf-news-content-layout">
          <div className="gulf-news-news-column">
            <section className="gulf-news-controls">
              <label className="gulf-news-search">
                <Search size={17} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </label>
              <div className="gulf-news-filter-row">
                <label>
                  <span>{ui.source}</span>
                  <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
                    <option value="all">{ui.allSources}</option>
                    {sourceOptions.map(source => (
                      <option value={source} key={source}>{source}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{ui.timeRange}</span>
                  <select value={timeRange} onChange={event => setTimeRange(event.target.value as GulfNewsTimeRange)}>
                    <option value="all">{ui.allTime}</option>
                    <option value="hour">{ui.lastHour}</option>
                    <option value="today">{ui.today}</option>
                    <option value="7d">{ui.last7Days}</option>
                    <option value="30d">{ui.last30Days}</option>
                  </select>
                </label>
                <label>
                  <span>{t('gulf_news_sort')}</span>
                  <select value={sortBy} onChange={event => setSortBy(event.target.value as GulfNewsSort)}>
                    <option value="recent">{t('gulf_news_sort_recent')}</option>
                    <option value="oldest">{ui.sortOldest}</option>
                    <option value="source">{ui.sortSource}</option>
                  </select>
                </label>
              </div>
              {activeFilters.length > 0 && (
                <div className="gulf-news-active-filters" aria-label={ui.activeFilters}>
                  <span>
                    <Filter size={14} />
                    {ui.activeFilters}
                  </span>
                  {activeFilters.map(filter => (
                    <button type="button" key={filter.key} onClick={filter.onClear}>
                      {filter.label}
                      <X size={13} />
                    </button>
                  ))}
                  <button type="button" className="clear" onClick={() => {
                    setQuery('');
                    setSourceFilter('all');
                    setTimeRange('all');
                  }}>
                    {ui.clearFilters}
                  </button>
                </div>
              )}
            </section>

            {loading ? (
              <GulfNewsSkeleton />
            ) : error ? (
              <section className="gulf-news-state error" role="alert">
                <AlertTriangle size={24} />
                <strong>{t('gulf_news_error')}</strong>
                <p>{error}</p>
                <button type="button" onClick={() => void load()}>
                  <RefreshCcw size={16} />
                  {t('market_retry')}
                </button>
              </section>
            ) : filteredItems.length === 0 ? (
              <section className="gulf-news-state">
                <Newspaper size={24} />
                <strong>{t('gulf_news_empty')}</strong>
                <p>{t('gulf_news_empty_hint')}</p>
                {activeFilters.length > 0 && (
                  <button type="button" onClick={() => {
                    setQuery('');
                    setSourceFilter('all');
                    setTimeRange('all');
                  }}>
                    <X size={16} />
                    {ui.clearFilters}
                  </button>
                )}
              </section>
            ) : (
              <>
                <section className="gulf-news-featured" aria-label={ui.featuredTitle}>
                  <div className="gulf-news-section-heading">
                    <span>
                      <Newspaper size={18} />
                    </span>
                    <div>
                      <h2>{ui.featuredTitle}</h2>
                      <p>{ui.featuredSubtitle}</p>
                    </div>
                  </div>
                  <div className="gulf-news-featured-grid">
                    {featuredItems.map((item, index) => {
                      const market = getGulfMarket(item.market);
                      return (
                        <GulfNewsCard
                          key={item.id}
                          item={item}
                          variant={index === 0 ? 'featured' : 'compact'}
                          marketBadge={`${market.code} ${marketLabels[item.market]}`}
                          labels={{
                            source: t('gulf_news_source'),
                            published: t('gulf_news_published'),
                            openArticle: t('gulf_news_open_article'),
                            translated: t('news_translated_badge'),
                            originalLanguage: t('news_original_language_badge'),
                          }}
                          formatDateTime={formatDateTime}
                        />
                      );
                    })}
                  </div>
                </section>

                <section className="gulf-news-results-toolbar">
                  <div>
                    <span>
                      <Clock3 size={16} />
                      {ui.resultCount(filteredItems.length)}
                    </span>
                    <h2>{ui.resultsTitle}</h2>
                  </div>
                  <div className="gulf-news-view-toggle" role="group" aria-label="View mode">
                    <button type="button" className={viewMode === 'grid' ? 'active' : ''} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                      <LayoutGrid size={15} />
                      {ui.gridView}
                    </button>
                    <button type="button" className={viewMode === 'list' ? 'active' : ''} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>
                      <List size={15} />
                      {ui.listView}
                    </button>
                  </div>
                </section>

                <section className={`gulf-news-grid ${viewMode}`} aria-label={t('gulf_news_title')}>
                  {visibleItems.map(item => {
                    const market = getGulfMarket(item.market);
                    return (
                      <GulfNewsCard
                        key={item.id}
                        item={item}
                        variant={viewMode === 'list' ? 'compact' : 'standard'}
                        marketBadge={`${market.code} ${marketLabels[item.market]}`}
                        labels={{
                          source: t('gulf_news_source'),
                          published: t('gulf_news_published'),
                          openArticle: t('gulf_news_open_article'),
                          translated: t('news_translated_badge'),
                          originalLanguage: t('news_original_language_badge'),
                        }}
                        formatDateTime={formatDateTime}
                      />
                    );
                  })}
                </section>

                {visibleCount < regularItems.length && (
                  <button type="button" className="gulf-news-load-more" onClick={() => setVisibleCount(count => count + INITIAL_NEWS_LIMIT)}>
                    <ArrowUpDown size={16} />
                    {ui.loadMore}
                  </button>
                )}
              </>
            )}

            <p className="gulf-news-disclaimer">{t('gulf_news_disclaimer')}</p>
          </div>

          <aside className="gulf-news-side-panel" aria-label={t('market_movers_title')}>
            <MarketMoversCard
              market={selectedMarket}
              marketLabel={marketLabels[selectedMarket]}
              locale={locale}
              indexDataAvailable={marketData[selectedMarket]?.available === true}
              labels={{
                title: t('market_movers_title'),
                subtitle: t('market_movers_subtitle'),
                compactTitle: t('market_movers_compact_title'),
                compactSubtitle: t('market_movers_compact_subtitle'),
                fullDetails: t('market_movers_full_details'),
                fullTitle: t('market_movers_full_title'),
                fullSubtitle: t('market_movers_full_subtitle'),
                close: t('market_movers_close'),
                topGainers: t('market_movers_top_gainers'),
                topLosers: t('market_movers_top_losers'),
                highestPrice: t('market_movers_highest_price'),
                lowestPrice: t('market_movers_lowest_price'),
                highestVolume: t('market_movers_highest_volume'),
                lowestVolume: t('market_movers_lowest_volume'),
                topGainersShort: t('market_movers_top_gainers_short'),
                topLosersShort: t('market_movers_top_losers_short'),
                highestVolumeShort: t('market_movers_highest_volume_short'),
                stocksCount: t('market_movers_stocks_count'),
                price: t('market_movers_price'),
                change: t('market_movers_change'),
                volume: t('market_movers_volume'),
                source: t('market_movers_source'),
                lastUpdated: t('market_movers_last_updated'),
                refresh: t('market_movers_refresh'),
                loading: t('market_movers_loading'),
                unavailableTitle: t('market_movers_unavailable_title'),
                unavailableBody: t('market_movers_unavailable_body'),
                indexOnlyTitle: t('market_movers_index_only_title'),
                indexOnlyBody: t('market_movers_index_only_body'),
                emptyTitle: t('market_movers_empty_title'),
                emptyBody: t('market_movers_empty_body'),
                limitedData: t('market_movers_limited_data'),
              }}
            />
          </aside>
        </section>
      </main>

      <style jsx global>{`
        .gulf-news-shell{
          --gulf-bg:#F4F8FC;
          --gulf-panel:var(--sfm-card);
          --gulf-panel-soft:var(--sfm-light-card);
          --gulf-border:rgba(29,140,255,.14);
          --gulf-border-strong:rgba(29,140,255,.24);
          --gulf-text:var(--sfm-primary-dark);
          --gulf-muted:var(--sfm-muted);
          --gulf-accent:var(--sfm-soft-cyan);
          --gulf-amber:#B45309;
          --gulf-red:#DC2626;
          min-height:100dvh;background:var(--gulf-bg);color:var(--gulf-text);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden
        }
        .dark .gulf-news-shell{
          --gulf-bg:#0A1422;
          --gulf-panel:#0F1D31;
          --gulf-panel-soft:#0B1829;
          --gulf-border:#1D3050;
          --gulf-border-strong:#2A456C;
          --gulf-text:#E8EEF6;
          --gulf-muted:#8EA6C3;
          --gulf-accent:#2FD6C0;
          --gulf-amber:#F5B942;
          --gulf-red:#FF5B6E;
        }
        .gulf-news-main{box-sizing:border-box;width:100%;max-width:100%;margin:0;padding:18px 22px 32px;display:grid;gap:18px;overflow-x:hidden}
        @media(min-width:1025px){[dir="rtl"].gulf-news-shell .gulf-news-main{width:100%;margin:0;padding-right:calc(var(--sidebar-w,230px) + 32px);padding-left:32px}[dir="ltr"].gulf-news-shell .gulf-news-main{width:100%;margin:0;padding-left:calc(var(--sidebar-w,230px) + 32px);padding-right:32px}.gulf-news-main>*{width:100%;max-width:1280px;margin-inline:auto}}
        .gulf-ticker-strip{position:relative;z-index:2;display:block;width:100%;min-height:52px;border:1px solid var(--gulf-border);background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border-radius:18px;overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}
        .gulf-ticker-viewport{width:100%;overflow:hidden;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.gulf-ticker-viewport::-webkit-scrollbar{display:none}.gulf-ticker-track{width:max-content;display:flex;align-items:center;animation:gulfTickerMarquee 38s linear infinite;will-change:transform}.gulf-ticker-strip:hover .gulf-ticker-track,.gulf-ticker-strip:focus-within .gulf-ticker-track,.gulf-ticker-strip:active .gulf-ticker-track,.gulf-ticker-strip.is-paused .gulf-ticker-track{animation-play-state:paused}.gulf-ticker-set{display:flex;align-items:center;flex:0 0 auto}.gulf-ticker-item{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--gulf-border);white-space:nowrap}.gulf-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--gulf-accent);font-size:12px;font-weight:950}.gulf-ticker-item span{color:var(--gulf-text);font-size:12px;font-weight:950;max-width:230px;overflow:hidden;text-overflow:ellipsis}.gulf-ticker-item b{direction:ltr;unicode-bidi:isolate;color:var(--gulf-muted);font-size:12px;font-style:normal}.gulf-ticker-item em{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;font-style:normal;line-height:1.2}.gulf-ticker-item em.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.gulf-ticker-item em.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.gulf-ticker-item em.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10);border-color:var(--gulf-border)}@keyframes gulfTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .gulf-news-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 0}.gulf-news-title-row{display:flex;align-items:center;gap:14px;min-width:0}.gulf-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--gulf-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}.gulf-news-header h1{margin:0;color:var(--gulf-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950}.gulf-news-header p{margin:8px 0 0;color:var(--gulf-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}.gulf-news-status-dot,.gulf-news-status-health{width:8px;height:8px;border-radius:50%;background:var(--gulf-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}.gulf-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}.gulf-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--gulf-border);background:var(--gulf-panel);color:var(--gulf-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}.gulf-news-icon-btn:hover,.gulf-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--gulf-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}.gulf-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:gulfNewsSpin .9s linear infinite}@keyframes gulfNewsSpin{to{transform:rotate(360deg)}}.gulf-news-sun,.dark .gulf-news-moon{display:block}.gulf-news-moon,.dark .gulf-news-sun{display:none}
        .gulf-news-status-bar{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--gulf-muted);box-shadow:0 12px 30px rgba(3,18,37,.05);font-size:12px;font-weight:900}.gulf-news-status-bar strong{border-radius:999px;padding:5px 10px;background:rgba(245,185,66,.12);color:var(--gulf-amber);border:1px solid rgba(245,185,66,.24)}
        .gulf-news-exchange-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.gulf-news-exchange-grid button{min-width:0;min-height:118px;border:1px solid var(--gulf-border);border-radius:20px;background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));color:var(--gulf-text);box-shadow:0 16px 44px rgba(3,18,37,.10);font-family:Tajawal,Arial,sans-serif;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"code name" "code value" "code change";gap:6px 12px;align-items:center;text-align:start;padding:16px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.gulf-news-exchange-grid button:hover,.gulf-news-exchange-grid button:focus-visible{outline:none;transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 0 0 4px rgba(47,214,192,.08),0 18px 48px rgba(3,18,37,.14)}.gulf-news-exchange-grid button.active{background:linear-gradient(135deg,var(--gulf-accent),#1AAE9D);border-color:rgba(47,214,192,.7);color:#061A2E;box-shadow:0 18px 48px rgba(47,214,192,.20)}.gulf-news-exchange-code{grid-area:code;direction:ltr;unicode-bidi:isolate;width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--gulf-accent);font-size:20px;font-weight:950}.active .gulf-news-exchange-code{background:rgba(6,26,46,.18);border-color:rgba(6,26,46,.20);color:#061A2E}.gulf-news-exchange-name{grid-area:name;font-size:15px;font-weight:950}.gulf-news-exchange-value{grid-area:value;direction:ltr;unicode-bidi:isolate;color:var(--gulf-text);font-size:16px;font-weight:950;line-height:1.2}.active .gulf-news-exchange-value{color:#061A2E}.gulf-news-exchange-change{grid-area:change;display:inline-flex;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.gulf-news-exchange-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.gulf-news-exchange-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.gulf-news-exchange-change.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10);border-color:var(--gulf-border)}.active .gulf-news-exchange-change{background:rgba(6,26,46,.16);color:#061A2E}
        .gulf-news-summary{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:22px;padding:20px;box-shadow:0 18px 48px rgba(3,18,37,.12);display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}.gulf-news-summary-identity{display:flex;align-items:center;gap:13px;min-width:0}.gulf-news-summary-code{direction:ltr;unicode-bidi:isolate;width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.24);color:var(--gulf-accent);font-size:22px;font-weight:950}.gulf-news-summary-identity span:not(.gulf-news-summary-code){display:block;color:var(--gulf-muted);font-size:12px;font-weight:950}.gulf-news-summary-identity h2{margin:4px 0;color:var(--gulf-text);font-size:24px;font-weight:950;line-height:1.2}.gulf-news-summary-identity p{margin:0;color:var(--gulf-muted);font-size:13px;font-weight:850}.gulf-news-summary-identity>strong{align-self:flex-start;border-radius:999px;padding:6px 10px;background:rgba(245,185,66,.12);color:var(--gulf-amber);border:1px solid rgba(245,185,66,.24);font-size:11px;font-weight:950;white-space:nowrap}.gulf-news-summary-market{display:grid;justify-items:end;gap:5px;min-width:210px}.gulf-news-summary-market span{color:var(--gulf-muted);font-size:12px;font-weight:950}.gulf-news-summary-market strong{direction:ltr;unicode-bidi:isolate;color:var(--gulf-text);font-size:30px;font-weight:950;line-height:1.15}.gulf-news-summary-market p{margin:0;max-width:320px;text-align:end;color:var(--gulf-muted);font-size:12px;font-weight:820;line-height:1.6}.gulf-news-summary-market small{color:var(--gulf-muted);font-size:11px;font-weight:820}.gulf-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex!important;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-style:normal;font-size:13px;font-weight:950;line-height:1.2}.gulf-news-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.gulf-news-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.gulf-news-change.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10);border-color:var(--gulf-border)}.dark .gulf-ticker-item em.up,.dark .gulf-news-exchange-change.up,.dark .gulf-news-change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .gulf-ticker-item em.down,.dark .gulf-news-exchange-change.down,.dark .gulf-news-change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.gulf-news-exchange-grid button.active .gulf-news-exchange-change{background:rgba(6,26,46,.16);border-color:rgba(6,26,46,.20);color:#061A2E}
        .gulf-news-content-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start;min-width:0;width:100%}.gulf-news-news-column{display:grid;gap:16px;min-width:0}.gulf-news-side-panel{width:100%;min-width:0;align-self:start;position:sticky;top:96px}
        .gulf-news-controls{background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;min-width:0}.gulf-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--gulf-border);background:var(--gulf-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--gulf-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}.gulf-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}.gulf-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--gulf-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}.gulf-news-search input::placeholder{color:var(--gulf-muted);opacity:1}
        .gulf-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}.gulf-news-card{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:20px;padding:18px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.gulf-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}.gulf-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--gulf-muted);font-size:11px;font-weight:900;line-height:1.55;flex-wrap:wrap}.gulf-news-market-tag{border-radius:999px;background:#CCFBF1;border:1px solid rgba(15,118,110,.25);color:#0F766E;padding:6px 10px;font-size:12px;font-weight:950}.gulf-news-translation-badge{border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;border:1px solid var(--gulf-border);color:var(--gulf-muted);background:rgba(142,166,195,.10)}.gulf-news-translation-badge.translated{color:#0F766E;border-color:rgba(15,118,110,.25);background:#CCFBF1}.gulf-news-card h2{margin:0;color:var(--gulf-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.gulf-news-card p{margin:0;color:var(--gulf-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.gulf-news-meta{border-top:1px solid var(--gulf-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--gulf-muted);font-size:12px;font-weight:900;line-height:1.55}.gulf-news-meta a,.gulf-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;color:var(--gulf-muted);text-decoration:none}.gulf-news-meta a:hover,.gulf-news-meta a:focus-visible{outline:none;color:var(--gulf-accent)}
        .dark .gulf-news-market-tag,.dark .gulf-news-translation-badge.translated{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.gulf-news-summary-code,.gulf-news-exchange-code{background:#CCFBF1!important;border-color:rgba(15,118,110,.25)!important;color:#0F766E!important}.dark .gulf-news-summary-code,.dark .gulf-news-exchange-code{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.25)!important;color:#2FD6C0!important}.gulf-news-exchange-grid button.active .gulf-news-exchange-code{background:rgba(6,26,46,.18)!important;border-color:rgba(6,26,46,.20)!important;color:#061A2E!important}
        .gulf-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--gulf-muted);background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px dashed var(--gulf-border-strong);border-radius:22px}.gulf-news-state svg{color:var(--gulf-accent)}.gulf-news-state strong{display:block;color:var(--gulf-text);font-size:19px;font-weight:950}.gulf-news-state p{margin:0;max-width:620px;color:var(--gulf-muted);font-weight:850;line-height:1.75}.gulf-news-state button{border:0;border-radius:14px;background:var(--gulf-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.gulf-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--gulf-muted);font-size:12px;font-weight:820;line-height:1.7}
        .gulf-news-skeleton span,.gulf-news-skeleton i,.gulf-news-skeleton b,.gulf-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:gulfNewsShimmer 1.2s linear infinite}.gulf-news-skeleton span{width:42%;height:18px}.gulf-news-skeleton i{width:100%;height:15px}.gulf-news-skeleton i:nth-child(3){width:76%}.gulf-news-skeleton b{width:58%;height:38px;border-radius:14px}.gulf-news-skeleton small{width:35%;height:14px}@keyframes gulfNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1024px){.gulf-news-content-layout{grid-template-columns:1fr}.gulf-news-side-panel{position:relative;top:auto;order:-1}}
        @media(max-width:1024px){.gulf-news-main{margin-inline-start:0;padding-top:92px}.gulf-news-header{align-items:flex-start}.gulf-news-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.gulf-news-main{padding-inline:14px}.gulf-news-header{display:grid}.gulf-news-header-actions{justify-content:flex-start}.gulf-news-title-icon{width:50px;height:50px}.gulf-news-header h1{font-size:29px}.gulf-news-exchange-grid,.gulf-news-summary{grid-template-columns:1fr}.gulf-news-summary-market{justify-items:start;min-width:0}.gulf-news-summary-market p{text-align:start}.gulf-news-card,.gulf-news-search{border-radius:18px}.gulf-news-meta{display:grid;gap:8px}.gulf-ticker-strip{margin-inline:-2px}.gulf-ticker-viewport{overflow-x:auto;scrollbar-width:thin;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.gulf-ticker-item span{max-width:210px}}
        .gulf-news-main{padding:24px clamp(16px,2vw,32px) 40px;gap:20px}
        @media(min-width:1025px){[dir="rtl"].gulf-news-shell .gulf-news-main{padding-right:calc(var(--sidebar-w,230px) + 32px);padding-left:32px}[dir="ltr"].gulf-news-shell .gulf-news-main{padding-left:calc(var(--sidebar-w,230px) + 32px);padding-right:32px}.gulf-news-main>*{max-width:1500px}}
        .gulf-news-header{position:relative;overflow:hidden;padding:24px;border:1px solid var(--gulf-border);border-radius:24px;background:linear-gradient(135deg,#071C31 0%,#0B2F44 58%,rgba(47,214,192,.28) 100%);box-shadow:0 20px 54px rgba(3,18,37,.14)}
        .gulf-news-header:before{content:"";position:absolute;inset-inline-start:5%;top:-70px;width:220px;height:220px;border-radius:50%;background:rgba(47,214,192,.18);filter:blur(32px);pointer-events:none}
        .gulf-news-header h1{color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.12)}
        .gulf-news-header p{color:rgba(232,244,255,.78)}
        .gulf-news-title-row,.gulf-news-header-actions{position:relative;z-index:1}
        .gulf-news-icon-btn{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#fff}
        .gulf-news-status-bar{border-radius:16px;padding:12px 16px;justify-content:space-between}
        .gulf-news-exchange-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
        .gulf-news-exchange-grid button{min-width:180px;min-height:104px;padding:14px;border-radius:18px;box-shadow:0 14px 34px rgba(3,18,37,.08)}
        .gulf-news-exchange-code{width:48px;height:48px;border-radius:15px;font-size:17px}
        .gulf-news-exchange-name{font-size:14px}
        .gulf-news-exchange-value{font-size:15px}
        .gulf-news-summary{border-radius:22px;padding:18px 20px;box-shadow:0 16px 40px rgba(3,18,37,.08)}
        .gulf-news-market-pulse{display:grid;grid-template-columns:minmax(240px,.65fr) 1fr;gap:16px;align-items:stretch;border:1px solid var(--gulf-border);border-radius:22px;background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));padding:18px;box-shadow:0 16px 40px rgba(3,18,37,.08)}
        .gulf-news-section-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0}
        .gulf-news-section-heading.compact{justify-content:flex-start}
        .gulf-news-section-heading>span{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.24);color:var(--gulf-accent);flex:0 0 auto}
        .gulf-news-section-heading h2{margin:0;color:var(--gulf-text);font-size:20px;font-weight:950;line-height:1.25}
        .gulf-news-section-heading p{margin:5px 0 0;color:var(--gulf-muted);font-size:13px;font-weight:800;line-height:1.55}
        .gulf-news-pulse-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .gulf-news-pulse-grid div{min-width:0;border:1px solid var(--gulf-border);border-radius:16px;background:rgba(255,255,255,.46);padding:14px;display:grid;gap:5px}
        .dark .gulf-news-pulse-grid div{background:rgba(255,255,255,.035)}
        .gulf-news-pulse-grid span{color:var(--gulf-muted);font-size:12px;font-weight:900}
        .gulf-news-pulse-grid strong{color:var(--gulf-text);font-size:22px;font-weight:950;line-height:1.15}
        .gulf-news-pulse-grid em{font-style:normal;color:var(--gulf-accent);font-size:12px;font-weight:950}
        .gulf-news-content-layout{grid-template-columns:minmax(0,1fr) 380px;gap:24px}
        .gulf-news-side-panel{top:112px}
        .gulf-news-controls{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:22px;padding:16px;box-shadow:0 16px 40px rgba(3,18,37,.08)}
        .gulf-news-search{min-height:52px;border-radius:16px;box-shadow:none;background:rgba(255,255,255,.68)}
        .dark .gulf-news-search{background:rgba(255,255,255,.04)}
        .gulf-news-filter-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .gulf-news-filter-row label{display:grid;gap:7px;min-width:0;color:var(--gulf-muted);font-size:12px;font-weight:950}
        .gulf-news-filter-row select{width:100%;min-height:46px;border:1px solid var(--gulf-border);border-radius:14px;background:rgba(255,255,255,.72);color:var(--gulf-text);font:900 13px Tajawal,Arial,sans-serif;padding-inline:12px;outline:none}
        .dark .gulf-news-filter-row select{background:rgba(255,255,255,.04)}
        .gulf-news-filter-row select:focus-visible{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10)}
        .gulf-news-active-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--gulf-muted);font-size:12px;font-weight:900}
        .gulf-news-active-filters>span,.gulf-news-active-filters button{min-height:34px;display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid var(--gulf-border);background:rgba(255,255,255,.58);color:var(--gulf-text);padding:0 11px;font:900 12px Tajawal,Arial,sans-serif}
        .dark .gulf-news-active-filters>span,.dark .gulf-news-active-filters button{background:rgba(255,255,255,.04)}
        .gulf-news-active-filters button{cursor:pointer}
        .gulf-news-active-filters button:hover,.gulf-news-active-filters button:focus-visible{outline:none;border-color:rgba(47,214,192,.48);color:var(--gulf-accent)}
        .gulf-news-active-filters button.clear{background:rgba(47,214,192,.12);color:var(--gulf-accent);border-color:rgba(47,214,192,.28)}
        .gulf-news-featured{display:grid;gap:14px}
        .gulf-news-featured-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr);gap:16px;align-items:stretch}
        .gulf-news-featured-grid .gulf-news-card.featured{grid-row:span 2}
        .gulf-news-results-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--gulf-border);border-radius:20px;background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));padding:14px 16px;box-shadow:0 14px 34px rgba(3,18,37,.06)}
        .gulf-news-results-toolbar h2{margin:3px 0 0;color:var(--gulf-text);font-size:20px;font-weight:950}
        .gulf-news-results-toolbar span{display:inline-flex;align-items:center;gap:6px;color:var(--gulf-muted);font-size:12px;font-weight:950}
        .gulf-news-view-toggle{display:flex;align-items:center;gap:6px;border:1px solid var(--gulf-border);background:rgba(142,166,195,.08);padding:5px;border-radius:999px}
        .gulf-news-view-toggle button{min-height:36px;border:0;border-radius:999px;background:transparent;color:var(--gulf-muted);display:inline-flex;align-items:center;gap:6px;padding:0 11px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .gulf-news-view-toggle button.active{background:var(--gulf-accent);color:#061A2E}
        .gulf-news-view-toggle button:focus-visible{outline:2px solid rgba(47,214,192,.66);outline-offset:2px}
        .gulf-news-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .gulf-news-grid.list{grid-template-columns:1fr}
        .gulf-news-card{min-height:100%;padding:18px;border-radius:20px;box-shadow:0 16px 40px rgba(3,18,37,.09)}
        .gulf-news-card.featured{padding:22px;background:linear-gradient(135deg,var(--gulf-panel) 0%,var(--gulf-panel-soft) 55%,rgba(47,214,192,.13) 100%);border-color:rgba(47,214,192,.30)}
        .gulf-news-card.compact{box-shadow:0 12px 30px rgba(3,18,37,.07)}
        .gulf-news-card-body{display:grid;gap:9px;min-width:0}
        .gulf-news-card-kicker{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;color:var(--gulf-muted);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gulf-news-card.featured h2{font-size:24px;line-height:1.35;-webkit-line-clamp:3}
        .gulf-news-card.featured p{-webkit-line-clamp:4;font-size:14px}
        .gulf-news-grid.list .gulf-news-card{grid-template-columns:minmax(0,1fr) auto;align-items:center}
        .gulf-news-grid.list .gulf-news-card-top{grid-column:1 / -1}
        .gulf-news-grid.list .gulf-news-meta{border-top:0;padding-top:0;min-width:220px;justify-content:end}
        .gulf-news-meta{gap:12px}
        .gulf-news-read-link{min-height:38px;border-radius:999px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.12);color:var(--gulf-accent)!important;padding:0 12px;font-weight:950;white-space:nowrap}
        .gulf-news-read-link:hover,.gulf-news-read-link:focus-visible{background:var(--gulf-accent);color:#061A2E!important}
        .gulf-news-load-more{justify-self:center;min-height:46px;border:1px solid rgba(47,214,192,.34);border-radius:999px;background:linear-gradient(135deg,#1D8CFF,var(--gulf-accent));color:#061A2E;display:inline-flex;align-items:center;gap:8px;padding:0 18px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 14px 34px rgba(29,140,255,.18)}
        .gulf-news-load-more:hover,.gulf-news-load-more:focus-visible{outline:none;transform:translateY(-1px);box-shadow:0 18px 42px rgba(29,140,255,.24)}
        .gulf-news-state{padding:46px 20px}
        @media(max-width:1280px){.gulf-news-content-layout{grid-template-columns:1fr}.gulf-news-side-panel{position:relative;top:auto;order:-1}.gulf-news-exchange-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.gulf-news-market-pulse{grid-template-columns:1fr}}
        @media(max-width:900px){.gulf-news-featured-grid,.gulf-news-grid,.gulf-news-grid.list .gulf-news-card{grid-template-columns:1fr}.gulf-news-filter-row{grid-template-columns:1fr}.gulf-news-results-toolbar{display:grid}.gulf-news-view-toggle{width:max-content;max-width:100%;overflow-x:auto}.gulf-news-pulse-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gulf-news-grid.list .gulf-news-meta{min-width:0;justify-content:space-between;border-top:1px solid var(--gulf-border);padding-top:13px}.gulf-news-card.featured h2{font-size:20px}}
        @media(max-width:720px){.gulf-news-main{padding-top:92px;padding-inline:12px;overflow-x:hidden}.gulf-news-header{padding:18px;border-radius:20px}.gulf-news-title-row{min-width:0}.gulf-news-header-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;justify-content:stretch}.gulf-news-icon-btn{width:100%;min-height:44px}.gulf-news-status-bar{justify-content:flex-start}.gulf-news-exchange-grid{display:flex;overflow-x:auto;scroll-padding-inline:12px}.gulf-news-exchange-grid button{min-width:min(82vw,260px);min-height:112px}.gulf-news-pulse-grid{grid-template-columns:1fr}.gulf-news-summary{padding:16px}.gulf-news-summary-identity{align-items:flex-start}.gulf-news-summary-code{width:52px;height:52px}.gulf-news-results-toolbar h2{font-size:18px}.gulf-news-card{padding:15px}.gulf-news-card h2{font-size:17px;overflow-wrap:anywhere}.gulf-news-card p{font-size:13px}.gulf-news-meta{display:grid}.gulf-news-read-link{justify-content:center;min-height:44px}.gulf-news-filter-row select{min-height:44px}.gulf-news-state{padding:22px 14px;border-radius:20px}.gulf-news-state button{min-height:44px}.gulf-news-view-toggle button{min-height:44px}.gulf-ticker-item span{max-width:68vw;overflow:hidden;text-overflow:ellipsis}.gulf-news-market-pulse{padding:14px;border-radius:20px}}
        @media(prefers-reduced-motion:reduce){.gulf-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.gulf-ticker-track{animation-duration:60s}.gulf-ticker-set[aria-hidden="true"]{display:none}}
      `}</style>
    </div>
  );
}

export default GulfNewsPage;
