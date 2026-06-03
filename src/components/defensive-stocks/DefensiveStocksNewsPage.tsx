'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Clock3,
  ExternalLink,
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
import { DEFENSIVE_STOCK_SECTORS, type DefensiveStockSector, type DefensiveStockSectorFilter } from '@/lib/market/defensiveStocks';
import type { DefensiveStockNewsItem, DefensiveStocksNewsPayload } from '@/lib/market/fetchDefensiveStocksNews';
import type { DefensiveMoverItem, DefensiveMoversResponse } from '@/lib/market/fetchDefensiveStockMovers';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

type NewsApiResponse = DefensiveStocksNewsPayload | { success: false; error?: string; reason?: string };
type MentionedTicker = { ticker: string; companyName: string; count: number };
type MoverSectionKey = keyof NonNullable<Extract<DefensiveMoversResponse, { ok: true }>['data']>;

const NEWS_PAGE_SIZE = 12;
const PRIMARY_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestVolume'];
const ALL_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestPrice', 'lowestPrice', 'highestVolume', 'lowestVolume'];

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function itemSearchText(item: DefensiveStockNewsItem) {
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

function categoryMatches(item: DefensiveStockNewsItem, category: DefensiveStockSectorFilter) {
  if (category === 'all') return true;
  return new Set([item.sector, ...(item.sectors ?? [])]).has(category);
}

function itemMatchesSearch(item: DefensiveStockNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
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

export function DefensiveStocksNewsPage() {
  const { dir, lang, t } = useLanguage();
  const locale = localeFor(lang);
  const [items, setItems] = useState<DefensiveStockNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DefensiveStockSectorFilter>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [movers, setMovers] = useState<DefensiveMoversResponse | null>(null);
  const [moversLoading, setMoversLoading] = useState(true);
  const [showMoversDetails, setShowMoversDetails] = useState(false);

  const loadNews = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/defensive-stocks/news?lang=${encodeURIComponent(lang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as NewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('defensive_news_error') : t('defensive_news_error'));
      }
      setItems(json.items);
      setPrices(json.prices ?? []);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setPrices([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : t('defensive_news_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [lang, t]);

  const loadMovers = useCallback(async () => {
    setMoversLoading(true);
    try {
      const response = await fetch('/api/defensive-stocks/movers?limit=5');
      const json = await response.json().catch(() => null) as DefensiveMoversResponse | null;
      setMovers(json);
    } catch {
      setMovers({
        ok: false,
        code: 'DEFENSIVE_MOVERS_UNAVAILABLE',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      });
    } finally {
      setMoversLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
    void loadMovers();
  }, [loadNews, loadMovers]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [category, query, lang]);

  const categoryLabels: Record<DefensiveStockSectorFilter | 'defensive_etf', string> = {
    all: t('defensive_news_category_all'),
    consumer_staples: t('defensive_news_category_consumer_staples'),
    healthcare: t('defensive_news_category_healthcare'),
    utilities: t('defensive_news_category_utilities'),
    telecom: t('defensive_news_category_telecom'),
    food_beverage: t('defensive_news_category_food_beverage'),
    essential_retail: t('defensive_news_category_essential_retail'),
    pharmaceuticals: t('defensive_news_category_pharmaceuticals'),
    insurance_stable: t('defensive_news_category_insurance_stable'),
    defensive_etf: t('defensive_news_category_defensive_etf'),
  };

  const baseFilteredItems = useMemo(() => (
    items.filter(item => itemMatchesSearch(item, query))
  ), [items, query]);

  const categoryCounts = useMemo(() => Object.fromEntries(
    DEFENSIVE_STOCK_SECTORS.map(item => [item, baseFilteredItems.filter(newsItem => categoryMatches(newsItem, item)).length]),
  ) as Record<DefensiveStockSectorFilter, number>, [baseFilteredItems]);

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
      if (!ticker || ticker === 'DEF') return;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName ?? item.companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredItems]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const formatPrice = (value: number | null, currency = 'USD') => {
    if (value === null) return t('market_unavailable_short');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return t('market_unavailable_short');
    return new Intl.NumberFormat(locale, { notation: value > 999_999 ? 'compact' : 'standard' }).format(value);
  };

  const updatedLabel = lastUpdated ? `${t('tech_news_last_updated')}: ${formatDateTime(lastUpdated)}` : t('tech_news_updated_daily');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f7ff_0%,#f8fbff_36%,#eef6ff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#0b2b4a_0%,#06182d_38%,#020817_100%)] dark:text-white" dir={dir}>
      <Sidebar />
      <main className="defensive-news-main w-full max-w-full overflow-x-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6">
          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,118,110,.12)] backdrop-blur dark:border-cyan-400/20 dark:bg-slate-950/72 dark:shadow-[0_24px_90px_rgba(0,0,0,.35)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
                  <ShieldCheck size={28} />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-950/40 dark:text-cyan-100">
                    {t('defensive_news_badge')}
                  </span>
                  <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
                    {t('defensive_news_title')}
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm font-semibold leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
                    {t('defensive_news_subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadNews(false);
                  void loadMovers();
                }}
                disabled={refreshing}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 px-5 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100 active:scale-[.98] disabled:opacity-60 dark:border-cyan-400/30 dark:bg-cyan-950/30 dark:text-cyan-100 dark:hover:bg-cyan-900/40"
              >
                <RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} />
                {t('market_refresh_news')}
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {prices.slice(0, 6).map(price => (
                <div key={price.symbol} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/70">
                  <div className="min-w-0">
                    <b dir="ltr" className="block text-sm font-black text-slate-950 dark:text-white">{price.symbol}</b>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{price.source}</span>
                  </div>
                  <div className="shrink-0 text-end">
                    <strong dir="ltr" className="block text-sm font-black text-slate-950 dark:text-white">{formatPrice(price.price)}</strong>
                    {price.changePercent !== null ? (
                      <span dir="ltr" className={`text-xs font-black ${changeTone(price.changePercent)}`}>
                        {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid min-w-0 gap-5">
              <EducationCard />

              <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-5">
                <div className="grid gap-4">
                  <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-900">
                    <Search size={18} className="shrink-0 text-cyan-600 dark:text-cyan-300" />
                    <input
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder={t('defensive_news_search_placeholder')}
                      type="search"
                      autoComplete="off"
                      className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </label>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('defensive_news_filter_label')}>
                    {DEFENSIVE_STOCK_SECTORS.map(item => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={category === item}
                        onClick={() => setCategory(item)}
                        className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-4 text-sm font-bold transition ${
                          category === item
                            ? 'border-cyan-400 bg-gradient-to-l from-sky-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-950/30'
                        }`}
                      >
                        <span>{categoryLabels[item]}</span>
                        <b className={`rounded-full px-2 py-0.5 text-xs ${category === item ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {categoryCounts[item] ?? 0}
                        </b>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {loading ? (
                <NewsLoadingState />
              ) : error ? (
                <section className="grid place-items-center gap-3 rounded-[2rem] border border-rose-200 bg-rose-50 p-10 text-center text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-100" role="alert">
                  <AlertTriangle size={26} />
                  <strong className="text-lg font-black">{t('defensive_news_error')}</strong>
                  <p className="max-w-2xl text-sm font-semibold leading-7">{error}</p>
                </section>
              ) : filteredItems.length === 0 ? (
                <section className="grid place-items-center gap-3 rounded-[2rem] border border-dashed border-cyan-300 bg-white/80 p-10 text-center dark:border-cyan-400/30 dark:bg-slate-950/60">
                  <Newspaper size={28} className="text-cyan-600 dark:text-cyan-300" />
                  <strong className="text-lg font-black">{t('defensive_news_empty')}</strong>
                  <p className="max-w-2xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{t('defensive_news_empty_hint')}</p>
                </section>
              ) : (
                <section className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    <span>{t('tech_news_results_count').replace('{count}', String(filteredItems.length))}</span>
                    <span>{updatedLabel}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleItems.map(item => (
                      <DefensiveNewsCard
                        key={item.id}
                        item={item}
                        labels={{
                          readMore: t('defensive_news_read_article'),
                          priceUnavailable: t('market_unavailable_short'),
                          linkUnavailable: t('tech_news_link_unavailable'),
                          translated: t('news_translated_badge'),
                          originalLanguage: t('news_original_language_badge'),
                        }}
                        formatDateTime={formatDateTime}
                        formatPrice={formatPrice}
                        categoryLabels={categoryLabels}
                      />
                    ))}
                  </div>
                  <div className="grid place-items-center">
                    {hasMoreItems ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}
                        className="min-h-12 rounded-full bg-gradient-to-l from-sky-500 to-cyan-400 px-6 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-105 active:scale-[.98]"
                      >
                        {t('tech_news_load_more')}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('tech_news_all_loaded')}</span>
                    )}
                  </div>
                </section>
              )}
            </div>

            <aside className="grid content-start gap-5 xl:sticky xl:top-6">
              <DefensiveMoversPanel
                movers={movers}
                loading={moversLoading}
                labels={moverLabels(t)}
                formatPrice={formatPrice}
                formatNumber={formatNumber}
                onOpenDetails={() => setShowMoversDetails(true)}
              />
              <MostMentionedCard items={mentionedTickers} />
              <SectorsGuide />
            </aside>
          </section>

          <section className="rounded-[2rem] border border-sky-200 bg-sky-50/80 p-5 text-center text-sm font-semibold leading-8 text-slate-700 dark:border-sky-400/20 dark:bg-sky-950/30 dark:text-slate-200">
            <div className="mb-2 inline-grid h-10 w-10 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-300">
              <Info size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{t('defensive_news_disclaimer_title')}</h2>
            <p>{t('defensive_news_disclaimer_body')}</p>
          </section>
        </div>
      </main>

      {showMoversDetails ? (
        <MoversDetailsModal
          movers={movers}
          labels={moverLabels(t)}
          formatPrice={formatPrice}
          formatNumber={formatNumber}
          onClose={() => setShowMoversDetails(false)}
        />
      ) : null}

      <style>{`
        @media (min-width:1025px) {
          [dir="rtl"] .defensive-news-main { margin-right: var(--sidebar-w, 230px); }
          [dir="ltr"] .defensive-news-main { margin-left: var(--sidebar-w, 230px); }
        }
      `}</style>
    </div>
  );

  function EducationCard() {
    return (
      <section className="rounded-[2rem] border border-cyan-200/80 bg-white/90 p-5 shadow-sm dark:border-cyan-400/20 dark:bg-slate-950/70 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
              <BookOpen size={22} />
            </div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('defensive_news_what_title')}</h2>
            <p className="mt-3 text-sm font-semibold leading-8 text-slate-600 dark:text-slate-300">{t('defensive_news_what_body')}</p>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <ComparisonTile title={t('defensive_news_defensive_label')} items={[
              t('defensive_news_defensive_point_1'),
              t('defensive_news_defensive_point_2'),
              t('defensive_news_defensive_point_3'),
              t('defensive_news_defensive_point_4'),
            ]} tone="cyan" />
            <ComparisonTile title={t('defensive_news_cyclical_label')} items={[
              t('defensive_news_cyclical_point_1'),
              t('defensive_news_cyclical_point_2'),
              t('defensive_news_cyclical_point_3'),
            ]} tone="slate" />
          </div>
        </div>
      </section>
    );
  }

  function MostMentionedCard({ items: mentionedItems }: { items: MentionedTicker[] }) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
          <Sparkles size={18} className="text-cyan-600 dark:text-cyan-300" />
          {t('defensive_news_most_mentioned')}
        </h2>
        {mentionedItems.length === 0 ? (
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">{t('defensive_news_empty')}</p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {mentionedItems.map((item, index) => (
              <li key={item.ticker} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300 bg-cyan-100 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">{index + 1}</span>
                <div className="min-w-0">
                  <b dir="ltr" className="block text-sm font-black text-slate-950 dark:text-white">{item.ticker}</b>
                  <small className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.companyName}</small>
                </div>
                <em className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black not-italic text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                  {item.count} {t('tech_news_mentions_count')}
                </em>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  function SectorsGuide() {
    const guideItems: DefensiveStockSectorFilter[] = ['consumer_staples', 'healthcare', 'utilities', 'telecom'];
    const guideDescriptions: Record<DefensiveStockSectorFilter, string> = {
      all: '',
      consumer_staples: t('defensive_news_sector_consumer_staples_guide'),
      healthcare: t('defensive_news_sector_healthcare_guide'),
      utilities: t('defensive_news_sector_utilities_guide'),
      telecom: t('defensive_news_sector_telecom_guide'),
      food_beverage: '',
      essential_retail: '',
      pharmaceuticals: '',
      insurance_stable: '',
    };
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
          <Layers size={18} className="text-cyan-600 dark:text-cyan-300" />
          {t('defensive_news_sectors_guide')}
        </h2>
        <div className="mt-4 grid gap-3">
          {guideItems.map(item => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <b className="text-sm font-black text-slate-950 dark:text-white">{categoryLabels[item]}</b>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{guideDescriptions[item]}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
}

function ComparisonTile({ title, items, tone }: { title: string; items: string[]; tone: 'cyan' | 'slate' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'cyan' ? 'border-cyan-200 bg-cyan-50/70 dark:border-cyan-400/20 dark:bg-cyan-950/25' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70'}`}>
      <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {items.map(item => (
          <li key={item} className="flex gap-2 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DefensiveNewsCard({
  item,
  labels,
  formatDateTime,
  formatPrice,
  categoryLabels,
}: {
  item: DefensiveStockNewsItem;
  labels: {
    readMore: string;
    priceUnavailable: string;
    linkUnavailable: string;
    translated: string;
    originalLanguage: string;
  };
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null, currency?: string) => string;
  categoryLabels: Record<DefensiveStockSectorFilter | DefensiveStockSector, string>;
}) {
  const title = item.title || item.headline;
  const summary = item.summary || title;
  const hasArticleUrl = Boolean(item.url);
  const contentDir = item.isTranslated && item.translatedTo === 'ar' ? 'rtl' : item.isTranslated ? 'ltr' : 'auto';
  const ChangeIcon = item.changePercent !== null && item.changePercent < 0 ? TrendingDown : TrendingUp;

  return (
    <article className="grid min-w-0 gap-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-900/5 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-cyan-400/30" dir={contentDir}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span dir="ltr" className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">{item.ticker}</span>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">{categoryLabels[item.sector]}</span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {item.isTranslated ? labels.translated : labels.originalLanguage}
          </span>
        </div>
        <div className="shrink-0 text-end">
          {item.price !== null ? (
            <>
              <strong dir="ltr" className="block text-sm font-black text-slate-950 dark:text-white">{formatPrice(item.price)}</strong>
              {item.changePercent !== null ? (
                <span dir="ltr" className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${changeBadgeClass(item.changePercent)}`}>
                  <ChangeIcon size={13} />
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              ) : null}
            </>
          ) : (
            <strong className="text-xs font-bold text-slate-500 dark:text-slate-400">{labels.priceUnavailable}</strong>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.companyName}</span>
        <h2 className="mt-2 break-words text-xl font-black leading-8 text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-3 break-words text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{summary}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">{item.source}</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={13} />{formatDateTime(item.publishedAt)}</span>
        </div>
        {hasArticleUrl ? (
          <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-l from-sky-500 to-cyan-400 px-4 text-xs font-black text-white shadow-md shadow-cyan-500/20 transition hover:brightness-105 active:scale-[.98]" href={item.url} target="_blank" rel="noreferrer" aria-label={title}>
            {labels.readMore}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {labels.linkUnavailable}
            <ExternalLink size={14} />
          </span>
        )}
      </div>
    </article>
  );
}

function NewsLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/60" />
      ))}
    </div>
  );
}

function moverLabels(t: (key: keyof typeof import('@/lib/translations').TR) => string) {
  return {
    title: t('defensive_news_movers_title'),
    subtitle: t('defensive_news_movers_subtitle'),
    fullTitle: t('defensive_news_movers_full_title'),
    fullSubtitle: t('defensive_news_movers_full_subtitle'),
    loading: t('defensive_news_movers_loading'),
    empty: t('defensive_news_movers_empty'),
    error: t('defensive_news_movers_error'),
    details: t('defensive_news_movers_details'),
    close: t('common_close'),
    sections: {
      topGainers: t('defensive_news_movers_top_gainers'),
      topLosers: t('defensive_news_movers_top_losers'),
      highestPrice: t('defensive_news_movers_highest_price'),
      lowestPrice: t('defensive_news_movers_lowest_price'),
      highestVolume: t('defensive_news_movers_highest_volume'),
      lowestVolume: t('defensive_news_movers_lowest_volume'),
    } satisfies Record<MoverSectionKey, string>,
    fiveStocks: t('defensive_news_movers_five_stocks'),
    noSectionData: t('defensive_news_movers_no_section_data'),
    volume: t('defensive_news_volume'),
  };
}

function DefensiveMoversPanel({
  movers,
  loading,
  labels,
  formatPrice,
  formatNumber,
  onOpenDetails,
}: {
  movers: DefensiveMoversResponse | null;
  loading: boolean;
  labels: ReturnType<typeof moverLabels>;
  formatPrice: (value: number | null, currency?: string) => string;
  formatNumber: (value: number | null) => string;
  onOpenDetails: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
          <TrendingUp size={21} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{labels.title}</h2>
          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{labels.subtitle}</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{labels.loading}</p>
      ) : !movers?.ok || !movers.data ? (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">{labels.empty}</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {PRIMARY_MOVER_SECTIONS.map(section => (
              <MoverSection
                key={section}
                title={labels.sections[section]}
                items={movers.data[section].slice(0, 3)}
                labels={labels}
                formatPrice={formatPrice}
                formatNumber={formatNumber}
                compact
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenDetails}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 active:scale-[.98] dark:border-cyan-400/30 dark:bg-cyan-950/30 dark:text-cyan-100 dark:hover:bg-cyan-900/40"
          >
            {labels.details}
            <ExternalLink size={15} />
          </button>
        </>
      )}
    </section>
  );
}

function MoverSection({
  title,
  items,
  labels,
  formatPrice,
  formatNumber,
  compact = false,
}: {
  title: string;
  items: DefensiveMoverItem[];
  labels: ReturnType<typeof moverLabels>;
  formatPrice: (value: number | null, currency?: string) => string;
  formatNumber: (value: number | null) => string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
        <span className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">{labels.fiveStocks}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">{labels.noSectionData}</p>
      ) : (
        <ol className="grid gap-2">
          {items.map(item => (
            <li key={`${title}-${item.symbol}-${item.rank}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white bg-white p-2 dark:border-slate-800 dark:bg-slate-950/70">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-xs font-black text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">{item.rank}</span>
              <div className="min-w-0">
                <b dir="ltr" className="block text-sm font-black text-slate-950 dark:text-white">{item.symbol}</b>
                <small className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.name}</small>
              </div>
              <div className="text-end">
                <strong dir="ltr" className="block whitespace-nowrap text-xs font-black text-slate-950 dark:text-white">{formatPrice(item.price, item.currency)}</strong>
                <span dir="ltr" className={`block whitespace-nowrap text-xs font-black ${changeTone(item.changePercent)}`}>
                  {item.changePercent === null ? labels.noSectionData : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}
                </span>
                {!compact ? <small className="block whitespace-nowrap text-[10px] font-bold text-slate-400">{labels.volume}: {formatNumber(item.volume)}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MoversDetailsModal({
  movers,
  labels,
  formatPrice,
  formatNumber,
  onClose,
}: {
  movers: DefensiveMoversResponse | null;
  labels: ReturnType<typeof moverLabels>;
  formatPrice: (value: number | null, currency?: string) => string;
  formatNumber: (value: number | null) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={labels.fullTitle}>
      <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[2rem] border border-cyan-200 bg-white shadow-2xl dark:border-cyan-400/20 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{labels.fullTitle}</h2>
            <p className="mt-1 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">{labels.fullSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label={labels.close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="overflow-y-auto p-5">
          {!movers?.ok || !movers.data ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">{labels.empty}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ALL_MOVER_SECTIONS.map(section => (
                <MoverSection
                  key={section}
                  title={labels.sections[section]}
                  items={movers.data[section]}
                  labels={labels}
                  formatPrice={formatPrice}
                  formatNumber={formatNumber}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DefensiveStocksNewsPage;
