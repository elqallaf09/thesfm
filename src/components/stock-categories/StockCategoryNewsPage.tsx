'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { getStockCategoryConfig, type StockCategoryFilterKey, type StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import type { StockCategoryNewsItem, StockCategoryNewsPayload } from '@/lib/market/fetchStockCategoryNews';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { TR } from '@/lib/translations';

type NewsApiResponse = StockCategoryNewsPayload | { success: false; error?: string; reason?: string };
type MentionedTicker = { ticker: string; companyName: string; count: number };
type MoverSectionKey = 'topGainers' | 'topLosers' | 'highestPrice' | 'lowestPrice' | 'highestVolume' | 'lowestVolume';

const NEWS_PAGE_SIZE = 12;
const PRIMARY_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestVolume'];
const ALL_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestPrice', 'lowestPrice', 'highestVolume', 'lowestVolume'];

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function changeTone(value: number | null) {
  if (value === null || value === 0) return 'text-slate-500 dark:text-slate-300';
  return value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';
}

function changeBadgeClass(value: number | null) {
  if (value === null || value === 0) return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return value > 0
    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100'
    : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-100';
}

function itemSearchText(item: StockCategoryNewsItem) {
  return [
    item.companyName,
    item.ticker,
    item.source,
    item.sector,
    ...(item.sectors ?? []),
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
  ].join(' ').toLowerCase();
}

function categoryMatches(item: StockCategoryNewsItem, category: StockCategoryFilterKey) {
  if (category === 'all') return true;
  return new Set([item.sector, ...(item.sectors ?? [])]).has(category);
}

function itemMatchesSearch(item: StockCategoryNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

export function StockCategoryNewsPage({ categoryId }: { categoryId: StockCategoryId }) {
  const config = getStockCategoryConfig(categoryId);
  const { dir, lang, t } = useLanguage();
  const locale = localeFor(lang);
  const tr = useCallback((key: keyof typeof TR) => t(key), [t]);
  const [items, setItems] = useState<StockCategoryNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StockCategoryFilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [moversLoading, setMoversLoading] = useState(true);
  const [showMoversDetails, setShowMoversDetails] = useState(false);

  const loadNews = useCallback(async (showLoader = true) => {
    if (!config) return;
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/stock-categories/news?category=${encodeURIComponent(config.id)}&lang=${encodeURIComponent(lang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as NewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || tr('stock_category_error') : tr('stock_category_error'));
      }
      setItems(json.items);
      setPrices(json.prices ?? []);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setPrices([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : tr('stock_category_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [config, lang, tr]);

  const loadMovers = useCallback(async () => {
    if (!config) return;
    setMoversLoading(true);
    try {
      const response = await fetch(`/api/stock-categories/movers?category=${encodeURIComponent(config.id)}&limit=5`);
      const json = await response.json().catch(() => null) as StockCategoryMoversResponse | null;
      setMovers(json);
    } catch {
      setMovers({
        ok: false,
        category: config.id,
        code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      });
    } finally {
      setMoversLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void loadNews();
    void loadMovers();
  }, [loadNews, loadMovers]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
    setCategory('all');
    setQuery('');
  }, [categoryId]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [category, query, lang]);

  const baseFilteredItems = useMemo(() => items.filter(item => itemMatchesSearch(item, query)), [items, query]);
  const categoryCounts = useMemo(() => {
    if (!config) return {};
    return Object.fromEntries(
      config.filters.map(filter => [filter.key, baseFilteredItems.filter(item => categoryMatches(item, filter.key)).length]),
    ) as Record<string, number>;
  }, [baseFilteredItems, config]);

  const filteredItems = useMemo(() => (
    baseFilteredItems
      .filter(item => categoryMatches(item, category))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  ), [baseFilteredItems, category]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < filteredItems.length;

  const mentionedTickers = useMemo(() => {
    const counts = new Map<string, MentionedTicker>();
    filteredItems.forEach(item => {
      const ticker = String(item.ticker ?? '').trim().toUpperCase();
      if (!ticker || ticker === categoryId.toUpperCase()) return;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName ?? item.companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [categoryId, filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(item => counts.set(item.source, (counts.get(item.source) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const formatPrice = (value: number | null, currency = 'USD') => {
    if (value === null) return tr('market_unavailable_short');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return tr('market_unavailable_short');
    return new Intl.NumberFormat(locale, { notation: value > 999_999 ? 'compact' : 'standard' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return tr('market_unavailable_short');
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  };

  const sectionTitle = (key: MoverSectionKey) => ({
    topGainers: tr('stock_category_movers_top_gainers'),
    topLosers: tr('stock_category_movers_top_losers'),
    highestPrice: tr('stock_category_movers_highest_price'),
    lowestPrice: tr('stock_category_movers_lowest_price'),
    highestVolume: tr('stock_category_movers_highest_volume'),
    lowestVolume: tr('stock_category_movers_lowest_volume'),
  }[key]);

  const renderMoverRows = (rows: StockCategoryMoverItem[]) => {
    if (rows.length === 0) {
      return (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          {tr('stock_category_movers_no_section_data')}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {rows.map(row => (
          <div key={`${row.rank}-${row.symbol}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-xs font-black text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span dir="ltr" className="font-black text-slate-950 dark:text-white">{row.symbol}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${changeBadgeClass(row.changePercent)}`} dir="ltr">
                  {formatPercent(row.changePercent)}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.name}</p>
            </div>
            <div className="shrink-0 text-end">
              <p dir="ltr" className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(row.price, row.currency)}</p>
              <p dir="ltr" className="text-[11px] text-slate-500 dark:text-slate-400">{formatNumber(row.volume)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const priceMap = useMemo(() => new Map(prices.map(price => [price.symbol, price])), [prices]);
  const updatedLabel = lastUpdated ? `${tr('tech_news_last_updated')}: ${formatDateTime(lastUpdated)}` : tr('tech_news_updated_daily');

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white" dir={dir}>
        <Sidebar />
        <main className="px-4 py-24">
          <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
            <AlertTriangle className="mx-auto mb-3 text-rose-500" />
            <p className="font-bold">{tr('stock_category_error')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f7ff_0%,#f8fbff_36%,#eef6ff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#0b2b4a_0%,#06182d_38%,#020817_100%)] dark:text-white" dir={dir}>
      <Sidebar />
      <main className="w-full max-w-full overflow-x-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6">
          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,118,110,.12)] backdrop-blur dark:border-cyan-400/20 dark:bg-slate-950/72 dark:shadow-[0_24px_90px_rgba(0,0,0,.35)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                  {config.shariaCaution ? <ShieldCheck size={26} /> : <Newspaper size={26} />}
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
                    <Sparkles size={14} />
                    {tr(config.badgeKey)}
                  </span>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {tr(config.titleKey)}
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                    {tr(config.subtitleKey)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { void loadNews(false); void loadMovers(); }}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-white px-5 text-sm font-bold text-cyan-800 shadow-sm transition hover:bg-cyan-50 active:scale-[0.98] disabled:opacity-60 dark:border-cyan-500/30 dark:bg-slate-900/70 dark:text-cyan-100 dark:hover:bg-cyan-950/50"
              >
                <RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? tr('tech_news_refreshing') : tr('market_refresh_news')}
              </button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="grid min-w-0 gap-6">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-3xl border border-cyan-200 bg-cyan-50/70 p-5 dark:border-cyan-500/25 dark:bg-cyan-950/25">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-200">
                        <BookOpen size={19} />
                      </span>
                      <h2 className="text-lg font-black text-slate-950 dark:text-white">{tr(config.explanationTitleKey)}</h2>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-650 dark:text-slate-300">{tr(config.explanationBodyKey)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                        <Info size={19} />
                      </span>
                      <h3 className="font-black text-slate-950 dark:text-white">{tr(config.sectorGuideTitleKey)}</h3>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {(config.metricCards ?? config.filters.filter(filter => filter.key !== 'all').slice(0, 4).map(filter => ({ labelKey: filter.labelKey, bodyKey: filter.labelKey }))).map(card => (
                        <div key={`${card.labelKey}-${card.bodyKey}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{tr(card.labelKey)}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{tr(card.bodyKey)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr(config.titleKey)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{updatedLabel}</p>
                  </div>
                  <label className="relative block w-full lg:max-w-md">
                    <span className="sr-only">{tr(config.searchPlaceholderKey)}</span>
                    <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={18} />
                    <input
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder={tr(config.searchPlaceholderKey)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-11 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-900/30"
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">{tr(config.filterLabelKey)}</p>
                  <div className="w-full overflow-x-auto no-scrollbar">
                    <div className="flex min-w-max gap-2">
                      {config.filters.map(filter => {
                        const active = category === filter.key;
                        return (
                          <button
                            key={filter.key}
                            type="button"
                            onClick={() => setCategory(filter.key)}
                            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition active:scale-[0.98] ${
                              active
                                ? 'border-cyan-500 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/30'
                            }`}
                          >
                            {tr(filter.labelKey)}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {categoryCounts[filter.key] ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                    {tr('stock_category_error')}
                  </div>
                )}

                {loading ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-52 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
                    ))}
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                    <Newspaper className="mx-auto mb-3 text-cyan-600 dark:text-cyan-300" size={30} />
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">{tr('stock_category_empty')}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_empty_hint')}</p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {visibleItems.map(item => {
                      const price = priceMap.get(item.ticker);
                      return (
                        <article key={item.id} className="group flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span dir="ltr" className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">
                              {item.ticker}
                            </span>
                            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                              {item.source}
                            </span>
                            {item.shariaStatus && (
                              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-100">
                                {tr('stock_category_sharia_status_unclassified')}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-4 text-lg font-black leading-relaxed text-slate-950 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {item.summary || item.title}
                          </p>
                          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                              <p dir="ltr" className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                {formatPrice(price?.price ?? item.price, 'USD')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{tr('stock_category_change_percent')}</p>
                              <p dir="ltr" className={`mt-1 text-sm font-black ${changeTone(price?.changePercent ?? item.changePercent)}`}>
                                {formatPercent(price?.changePercent ?? item.changePercent)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <Clock3 size={14} />
                              {formatDateTime(item.publishedAt)}
                            </span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-sm transition hover:shadow-lg active:scale-[0.98]"
                            >
                              {tr('defensive_news_read_article')}
                              <ExternalLink size={15} />
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {!loading && visibleItems.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    {hasMoreItems ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-300 bg-white px-6 text-sm font-black text-cyan-800 transition hover:bg-cyan-50 active:scale-[0.98] dark:border-cyan-500/30 dark:bg-slate-900 dark:text-cyan-100"
                      >
                        {tr('tech_news_load_more')}
                      </button>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        {tr('tech_news_all_loaded')}
                      </span>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="grid min-w-0 gap-6 xl:sticky xl:top-24 xl:self-start">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">{tr(config.moversTitleKey)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_movers_subtitle')}</p>
                  </div>
                  <BarChart3 className="text-cyan-600 dark:text-cyan-300" />
                </div>
                {moversLoading ? (
                  <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {tr('stock_category_movers_loading')}
                  </p>
                ) : movers?.ok && movers.data ? (
                  <div className="mt-5 space-y-5">
                    {PRIMARY_MOVER_SECTIONS.map(section => (
                      <div key={section}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{sectionTitle(section)}</h3>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            {tr('stock_category_movers_three_stocks')}
                          </span>
                        </div>
                        {renderMoverRows(movers.data[section].slice(0, 3))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowMoversDetails(true)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 active:scale-[0.98] dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-100"
                    >
                      <Layers size={16} />
                      {tr('stock_category_movers_details')}
                    </button>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                    {tr('stock_category_movers_empty')}
                  </p>
                )}
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <TrendingUp size={19} className="text-cyan-600 dark:text-cyan-300" />
                  {tr(config.mentionedTitleKey)}
                </h2>
                <div className="mt-4 space-y-2">
                  {mentionedTickers.length > 0 ? mentionedTickers.map((item, index) => (
                    <div key={item.ticker} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-black text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-100">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p dir="ltr" className="font-black text-slate-950 dark:text-white">{item.ticker}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                      </div>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                        {tr('tech_news_mentions_count').replace('{count}', String(item.count))}
                      </span>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                      {tr('stock_category_empty')}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <FileText size={19} className="text-cyan-600 dark:text-cyan-300" />
                  {tr(config.sourcesTitleKey)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sourceCounts.length > 0 ? sourceCounts.map(([source, count]) => (
                    <span key={source} className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                      {source} · {count}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_empty')}</span>
                  )}
                </div>
              </section>
            </aside>
          </section>

          {config.shariaCaution && (
            <section className="rounded-[2rem] border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 shrink-0" />
                <div>
                  <h2 className="text-lg font-black">{tr(config.disclaimerTitleKey)}</h2>
                  <p className="mt-2 text-sm leading-7">{tr(config.disclaimerBodyKey)}</p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 text-center shadow-sm dark:border-cyan-500/20 dark:bg-slate-950/70 sm:p-6">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{config.shariaCaution ? tr('defensive_news_disclaimer_title') : tr(config.disclaimerTitleKey)}</h2>
            <p className="mx-auto mt-2 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {config.shariaCaution ? tr('stock_category_standard_disclaimer') : tr(config.disclaimerBodyKey)}
            </p>
          </section>
        </div>
      </main>

      {showMoversDetails && movers?.ok && movers.data && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr('stock_category_movers_full_title')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('stock_category_movers_full_subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoversDetails(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label={tr('common_close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-100px)] overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ALL_MOVER_SECTIONS.map(section => (
                  <section key={section} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-black text-slate-950 dark:text-white">{sectionTitle(section)}</h3>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {tr('stock_category_movers_five_stocks')}
                      </span>
                    </div>
                    {renderMoverRows(movers.data[section])}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockCategoryNewsPage;
