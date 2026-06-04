'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  Layers,
  Newspaper,
  Pill,
  Radio,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { getStockCategoryConfig, type StockCategoryFilterKey } from '@/lib/market/stockCategoryConfigs';
import type { StockCategoryNewsItem, StockCategoryNewsPayload } from '@/lib/market/fetchStockCategoryNews';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import type { TR } from '@/lib/translations';

type UiLang = 'ar' | 'en' | 'fr';
type NewsApiResponse = StockCategoryNewsPayload | { success: false; error?: string; reason?: string };
type MentionedTicker = { ticker: string; companyName: string; count: number };
type MoverSectionKey = 'topGainers' | 'topLosers' | 'highestPrice' | 'lowestPrice' | 'highestVolume' | 'lowestVolume';
type TickerItem = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
};
type TickerResponse =
  | { ok: true; source: string; updated_at: string; items: TickerItem[] }
  | { ok: false; code: string; source: string | null; updated_at: string | null; items: [] };

const config = getStockCategoryConfig('defensive');
const NEWS_PAGE_SIZE = 10;
const PRIMARY_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestVolume'];
const ALL_MOVER_SECTIONS: MoverSectionKey[] = ['topGainers', 'topLosers', 'highestPrice', 'lowestPrice', 'highestVolume', 'lowestVolume'];

const COPY = {
  ar: {
    searchPlaceholder: 'ابحث عن سهم أو شركة أو تصنيف...',
    latestNews: 'أحدث الأخبار',
    quickSummary: 'ملخص سريع',
    realDataOnly: 'تُعرض الأخبار والأسعار المتاحة من مزودي البيانات فقط.',
    watchlistLabel: 'قائمة متابعة دفاعية',
    watchlistNote: 'هذه الرموز للمتابعة التعليمية وليست توصيات استثمارية.',
    noNewsTitle: 'لا توجد أخبار حاليًا في هذا التصنيف',
    noNewsBody: 'جرّب تصنيفًا آخر أو ابحث عن شركة محددة.',
    noTicker: 'لا توجد بيانات كافية لعرض شريط الأسهم الدفاعية.',
    tickerError: 'تعذر تحديث شريط الأسهم الدفاعية حاليًا.',
    tickerCached: 'أسعار محدثة دوريًا',
    tickerLoading: 'جارٍ تحديث شريط الأسهم الدفاعية...',
    provider: 'المصدر',
    newsCount: 'عدد الأخبار',
    watchlistCount: 'عدد الرموز',
    sourceCount: 'مصدر',
    mentionCount: 'أخبار',
    currentPrice: 'السعر الحالي',
    change: 'التغير',
    published: 'وقت النشر',
    sectorGuide: 'دليل القطاعات الدفاعية',
    differenceTitle: 'الفرق بينها وبين الأسهم الدورية',
    defensiveSide: 'الأسهم الدفاعية',
    cyclicalSide: 'الأسهم الدورية',
    moversCompactTitle: 'حركة الأسهم الدفاعية',
    moversCompactBody: 'أبرز التحركات المختصرة في قائمة المتابعة الدفاعية.',
    viewDetails: 'عرض التفاصيل',
    disclaimerBody: 'هذه المعلومات تعليمية وتحليلية فقط، ولا تُعد توصية شراء أو بيع أو نصيحة استثمارية. الأسهم الدفاعية قد تنخفض أيضًا، ولا يوجد أصل خالٍ من المخاطر.',
    unavailable: 'غير متاح',
    allLoaded: 'تم عرض جميع الأخبار',
    loadMore: 'عرض المزيد',
    updated: 'آخر تحديث',
  },
  en: {
    searchPlaceholder: 'Search by stock, company, or category...',
    latestNews: 'Latest News',
    quickSummary: 'Quick Summary',
    realDataOnly: 'Only available news and prices from data providers are shown.',
    watchlistLabel: 'Defensive watchlist',
    watchlistNote: 'These symbols are for educational monitoring, not recommendations.',
    noNewsTitle: 'No news available in this category right now',
    noNewsBody: 'Try another category or search for a specific company.',
    noTicker: 'Not enough data to show the defensive stocks ticker.',
    tickerError: 'Could not update the defensive stocks ticker right now.',
    tickerCached: 'Periodically updated prices',
    tickerLoading: 'Updating defensive stocks ticker...',
    provider: 'Source',
    newsCount: 'News items',
    watchlistCount: 'Symbols',
    sourceCount: 'source',
    mentionCount: 'news',
    currentPrice: 'Current price',
    change: 'Change',
    published: 'Published',
    sectorGuide: 'Defensive Sectors Guide',
    differenceTitle: 'How they differ from cyclical stocks',
    defensiveSide: 'Defensive stocks',
    cyclicalSide: 'Cyclical stocks',
    moversCompactTitle: 'Defensive Stock Movers',
    moversCompactBody: 'A compact view of notable moves across the defensive watchlist.',
    viewDetails: 'View details',
    disclaimerBody: 'This information is for education and analysis only. It is not a buy or sell recommendation or investment advice. Defensive stocks can also decline, and no asset is risk-free.',
    unavailable: 'Unavailable',
    allLoaded: 'All news loaded',
    loadMore: 'Load more',
    updated: 'Last updated',
  },
  fr: {
    searchPlaceholder: 'Rechercher une action, une société ou une catégorie...',
    latestNews: 'Dernières actualités',
    quickSummary: 'Résumé rapide',
    realDataOnly: 'Seules les actualités et les prix disponibles auprès des fournisseurs sont affichés.',
    watchlistLabel: 'Liste de suivi défensive',
    watchlistNote: 'Ces symboles servent au suivi éducatif, pas à des recommandations.',
    noNewsTitle: 'Aucune actualité disponible dans cette catégorie',
    noNewsBody: 'Essayez une autre catégorie ou recherchez une entreprise précise.',
    noTicker: 'Données insuffisantes pour afficher le téléscripteur défensif.',
    tickerError: 'Impossible de mettre à jour le téléscripteur des actions défensives.',
    tickerCached: 'Prix mis à jour périodiquement',
    tickerLoading: 'Mise à jour du téléscripteur défensif...',
    provider: 'Source',
    newsCount: 'Actualités',
    watchlistCount: 'Symboles',
    sourceCount: 'source',
    mentionCount: 'actualités',
    currentPrice: 'Prix actuel',
    change: 'Variation',
    published: 'Publié',
    sectorGuide: 'Guide des secteurs défensifs',
    differenceTitle: 'Différence avec les actions cycliques',
    defensiveSide: 'Actions défensives',
    cyclicalSide: 'Actions cycliques',
    moversCompactTitle: 'Mouvements des actions défensives',
    moversCompactBody: 'Vue compacte des mouvements notables de la liste défensive.',
    viewDetails: 'Voir les détails',
    disclaimerBody: 'Ces informations sont fournies à des fins éducatives et analytiques uniquement. Elles ne constituent ni une recommandation d’achat ou de vente ni un conseil en investissement. Les actions défensives peuvent aussi baisser, et aucun actif n’est sans risque.',
    unavailable: 'Indisponible',
    allLoaded: 'Toutes les actualités sont affichées',
    loadMore: 'Afficher plus',
    updated: 'Dernière mise à jour',
  },
} satisfies Record<UiLang, Record<string, string>>;

function localeFor(lang: UiLang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function uiLang(value: string): UiLang {
  if (value === 'en' || value === 'fr') return value;
  return 'ar';
}

function changeTone(value: number | null | undefined) {
  if (!value) return 'text-slate-600 dark:text-slate-300';
  return value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';
}

function changeBadgeClass(value: number | null | undefined) {
  if (!value) return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
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

export function DefensiveStocksNewsPage() {
  const { dir, lang, t } = useLanguage();
  const currentLang = uiLang(lang);
  const copy = COPY[currentLang];
  const locale = localeFor(currentLang);
  const tr = useCallback((key: keyof typeof TR) => t(key), [t]);
  const [items, setItems] = useState<StockCategoryNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StockCategoryFilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [lastUpdated, setLastUpdated] = useState('');
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [moversLoading, setMoversLoading] = useState(true);
  const [showMoversDetails, setShowMoversDetails] = useState(false);

  const loadNews = useCallback(async (showLoader = true) => {
    if (!config) return;
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/stock-categories/news?category=defensive&lang=${encodeURIComponent(currentLang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as NewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || tr('stock_category_error') : tr('stock_category_error'));
      }
      setItems(json.items);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : tr('stock_category_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [currentLang, tr]);

  const loadMovers = useCallback(async () => {
    setMoversLoading(true);
    try {
      const response = await fetch('/api/stock-categories/movers?category=defensive&limit=5');
      const json = await response.json().catch(() => null) as StockCategoryMoversResponse | null;
      setMovers(json);
    } catch {
      setMovers({
        ok: false,
        category: 'defensive',
        code: 'STOCK_CATEGORY_MOVERS_UNAVAILABLE',
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
  }, [category, query, currentLang]);

  const baseFilteredItems = useMemo(() => items.filter(item => itemMatchesSearch(item, query)), [items, query]);
  const categoryCounts = useMemo(() => {
    if (!config) return {};
    return Object.fromEntries(
      config.filters.map(filter => [filter.key, baseFilteredItems.filter(item => categoryMatches(item, filter.key)).length]),
    ) as Record<string, number>;
  }, [baseFilteredItems]);

  const filteredItems = useMemo(() => (
    baseFilteredItems
      .filter(item => categoryMatches(item, category))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  ), [baseFilteredItems, category]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const latestItems = filteredItems.slice(0, 4);
  const hasMoreItems = visibleCount < filteredItems.length;

  const mentionedTickers = useMemo(() => {
    const counts = new Map<string, MentionedTicker>();
    filteredItems.forEach(item => {
      const ticker = String(item.ticker ?? '').trim().toUpperCase();
      if (!ticker) return;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName ?? item.companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach(item => counts.set(item.source, (counts.get(item.source) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return copy.unavailable;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const formatPrice = (value: number | null | undefined, currency = 'USD') => {
    if (value === null || value === undefined) return copy.unavailable;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return copy.unavailable;
    return new Intl.NumberFormat(locale, { notation: value > 999_999 ? 'compact' : 'standard' }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return copy.unavailable;
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  };

  const sectionTitle = (key: MoverSectionKey) => ({
    topGainers: tr('defensive_news_movers_top_gainers'),
    topLosers: tr('defensive_news_movers_top_losers'),
    highestPrice: tr('defensive_news_movers_highest_price'),
    lowestPrice: tr('defensive_news_movers_lowest_price'),
    highestVolume: tr('defensive_news_movers_highest_volume'),
    lowestVolume: tr('defensive_news_movers_lowest_volume'),
  }[key]);

  const renderMoverRows = (rows: StockCategoryMoverItem[]) => {
    if (rows.length === 0) {
      return (
        <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
          {tr('defensive_news_movers_no_section_data')}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {rows.map(row => (
          <div key={`${row.rank}-${row.symbol}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-xs font-black text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
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

  const sectorGuides = [
    {
      key: 'consumer',
      title: tr('defensive_news_category_consumer_staples'),
      body: tr('defensive_news_sector_consumer_staples_guide'),
      symbols: ['PG', 'KO', 'PEP', 'WMT', 'COST'],
      Icon: ShoppingBasket,
    },
    {
      key: 'healthcare',
      title: tr('defensive_news_category_healthcare'),
      body: tr('defensive_news_sector_healthcare_guide'),
      symbols: ['JNJ', 'MRK', 'PFE', 'ABBV', 'UNH'],
      Icon: HeartPulse,
    },
    {
      key: 'utilities',
      title: tr('defensive_news_category_utilities'),
      body: tr('defensive_news_sector_utilities_guide'),
      symbols: ['NEE', 'DUK', 'SO', 'AEP'],
      Icon: Zap,
    },
    {
      key: 'telecom',
      title: tr('defensive_news_category_telecom'),
      body: tr('defensive_news_sector_telecom_guide'),
      symbols: ['VZ', 'T'],
      Icon: Radio,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dff8ff_0%,#f8fbff_34%,#eef6ff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#0b2b4a_0%,#06182d_38%,#020817_100%)] dark:text-white" dir={dir}>
      <Sidebar />
      <main className="w-full max-w-full overflow-x-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6">
          <DefensiveStocksTicker copy={copy} locale={locale} />

          <section className="overflow-hidden rounded-[2rem] border border-cyan-200/70 bg-white/90 shadow-[0_24px_70px_rgba(15,118,110,.12)] backdrop-blur dark:border-cyan-400/20 dark:bg-slate-950/72 dark:shadow-[0_24px_90px_rgba(0,0,0,.35)]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
                  <Sparkles size={14} />
                  {tr('defensive_news_badge')}
                </span>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {tr('defensive_news_title')}
                </h1>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                  {tr('defensive_news_subtitle')}
                </p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/25 sm:h-24 sm:w-24">
                <ShieldCheck size={38} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <article className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 shadow-sm dark:border-cyan-500/20 dark:bg-slate-950/70 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                  <BookOpen size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr('defensive_news_what_title')}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{tr('defensive_news_what_body')}</p>
                </div>
              </div>
            </article>
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                  <Info size={22} />
                </span>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{copy.differenceTitle}</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CompactEducationCard title={copy.defensiveSide} points={[
                  tr('defensive_news_defensive_point_1'),
                  tr('defensive_news_defensive_point_2'),
                  tr('defensive_news_defensive_point_3'),
                  tr('defensive_news_defensive_point_4'),
                ]} tone="cyan" />
                <CompactEducationCard title={copy.cyclicalSide} points={[
                  tr('defensive_news_cyclical_point_1'),
                  tr('defensive_news_cyclical_point_2'),
                  tr('defensive_news_cyclical_point_3'),
                ]} tone="amber" />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="grid min-w-0 gap-6">
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{tr('defensive_news_title')}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {lastUpdated ? `${copy.updated}: ${formatDateTime(lastUpdated)}` : copy.realDataOnly}
                    </p>
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

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <label className="relative block min-w-0">
                    <span className="sr-only">{copy.searchPlaceholder}</span>
                    <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={18} />
                    <input
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-11 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-900/30"
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                    {filteredItems.length} {copy.newsCount}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">{tr('defensive_news_filter_label')}</p>
                  <div className="w-full overflow-x-auto pb-1">
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
                    {tr('defensive_news_error')}
                  </div>
                )}

                {loading ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
                    ))}
                  </div>
                ) : visibleItems.length === 0 ? (
                  <EmptyState title={copy.noNewsTitle} body={copy.noNewsBody} />
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {visibleItems.map(item => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        copy={copy}
                        locale={locale}
                        formatDateTime={formatDateTime}
                        formatPrice={formatPrice}
                        formatPercent={formatPercent}
                        tr={tr}
                      />
                    ))}
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
                        {copy.loadMore}
                      </button>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        {copy.allLoaded}
                      </span>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="grid min-w-0 gap-5 xl:sticky xl:top-24 xl:self-start">
              <SidebarPanel title={copy.latestNews} icon={<Newspaper size={19} />}>
                <div className="space-y-3">
                  {latestItems.length > 0 ? latestItems.map(item => (
                    <a key={`latest-${item.id}`} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/30">
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-black text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100">{item.ticker}</span>
                        <span className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.source}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-slate-900 dark:text-white">{item.title}</p>
                    </a>
                  )) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">{copy.noNewsBody}</p>
                  )}
                </div>
              </SidebarPanel>

              <SidebarPanel title={tr('defensive_news_most_mentioned')} icon={<TrendingUp size={19} />}>
                <div className="space-y-2">
                  {mentionedTickers.length > 0 ? mentionedTickers.map((item, index) => (
                    <div key={item.ticker} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-black text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-100">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p dir="ltr" className="font-black text-slate-950 dark:text-white">{item.ticker}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                      </div>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                        {item.count} {copy.mentionCount}
                      </span>
                    </div>
                  )) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">{copy.noNewsBody}</p>
                  )}
                </div>
              </SidebarPanel>

              <SidebarPanel title={tr('stock_category_sources_title')} icon={<FileText size={19} />}>
                <div className="flex flex-wrap gap-2">
                  {sourceCounts.length > 0 ? sourceCounts.map(([source, count]) => (
                    <span key={source} className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
                      {source} · {count}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">{copy.unavailable}</span>
                  )}
                </div>
              </SidebarPanel>

              <SidebarPanel title={copy.quickSummary} icon={<Activity size={19} />}>
                <div className="grid gap-2">
                  <MiniStat label={copy.newsCount} value={String(items.length)} />
                  <MiniStat label={copy.watchlistCount} value={String(config.watchlist.length)} />
                  <MiniStat label={copy.provider} value="Finnhub / Yahoo Finance" ltr />
                </div>
                <p className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-xs font-semibold leading-6 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-100">
                  {copy.watchlistNote}
                </p>
              </SidebarPanel>
            </aside>
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                  <BarChart3 size={22} />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">{copy.moversCompactTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.moversCompactBody}</p>
                </div>
              </div>
              {movers?.ok && movers.data && (
                <button
                  type="button"
                  onClick={() => setShowMoversDetails(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 px-5 text-sm font-black text-cyan-800 transition hover:bg-cyan-100 active:scale-[0.98] dark:border-cyan-500/30 dark:bg-cyan-950/30 dark:text-cyan-100"
                >
                  <Layers size={16} />
                  {copy.viewDetails}
                </button>
              )}
            </div>

            {moversLoading ? (
              <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {tr('defensive_news_movers_loading')}
              </p>
            ) : movers?.ok && movers.data ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {PRIMARY_MOVER_SECTIONS.map(section => (
                  <div key={section} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{sectionTitle(section)}</h3>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {tr('stock_category_movers_three_stocks')}
                      </span>
                    </div>
                    {renderMoverRows(movers.data[section].slice(0, 3))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                {tr('defensive_news_movers_empty')}
              </p>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                <Pill size={22} />
              </span>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{copy.sectorGuide}</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sectorGuides.map(({ key, title, body, symbols, Icon }) => (
                <article key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {symbols.map(symbol => (
                      <span key={symbol} dir="ltr" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                        {symbol}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-cyan-200/70 bg-white/90 p-5 shadow-sm dark:border-cyan-500/20 dark:bg-slate-950/70 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                <ShieldCheck size={21} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">{tr('defensive_news_disclaimer_title')}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.disclaimerBody}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showMoversDetails && movers?.ok && movers.data && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{tr('defensive_news_movers_full_title')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('defensive_news_movers_full_subtitle')}</p>
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
                        {tr('defensive_news_movers_five_stocks')}
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

function DefensiveStocksTicker({ copy, locale }: { copy: Record<string, string>; locale: string }) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hasRealTickerPrice = (item: TickerItem) => (
      Boolean(item.symbol && item.source)
      && Number.isFinite(item.price)
      && item.price > 0
    );
    async function loadTicker() {
      try {
        const response = await fetch('/api/defensive-stocks/ticker');
        const json = await response.json().catch(() => null) as TickerResponse | null;
        if (cancelled) return;
        const realItems = json?.ok ? json.items.filter(hasRealTickerPrice) : [];
        if (!response.ok || !json?.ok || realItems.length === 0) {
          setStatus(response.ok ? 'empty' : 'error');
          setItems([]);
          setUpdatedAt('');
          return;
        }
        setItems(realItems);
        setUpdatedAt(json.updated_at);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setItems([]);
          setUpdatedAt('');
        }
      }
    }
    void loadTicker();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatPrice = (value: number, currency = 'USD') => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: value > 100 ? 2 : 3,
  }).format(value);

  const formatPercent = (value: number | null) => {
    if (value === null) return copy.unavailable;
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  };

  const tickerItems = items.length > 6 ? [...items, ...items] : items;
  const updatedDate = updatedAt ? new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(updatedAt)) : '';
  const statusLabel = status === 'ready'
    ? copy.tickerCached
    : status === 'loading'
      ? copy.tickerLoading
      : status === 'error'
        ? copy.tickerError
        : copy.noTicker;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-cyan-200/70 bg-white/90 shadow-sm dark:border-cyan-500/20 dark:bg-slate-950/70">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
            <Activity size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">{copy.watchlistLabel}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {status === 'ready' && updatedDate ? `${copy.updated}: ${updatedDate}` : statusLabel}
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
          {statusLabel}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="flex gap-3 overflow-hidden px-4 py-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 w-48 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : status === 'ready' ? (
        <div className="ticker-viewport overflow-x-auto">
          <div className="defensive-ticker-track flex w-max gap-3 px-4 py-4">
            {tickerItems.map((item, index) => (
              <div key={`${item.symbol}-${index}`} className="flex min-w-[210px] shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="min-w-0">
                  <p dir="ltr" className="text-sm font-black text-slate-950 dark:text-white">{item.symbol}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.name}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p dir="ltr" className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(item.price, item.currency)}</p>
                  <span dir="ltr" className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${changeBadgeClass(item.changePercent)}`}>
                    {formatPercent(item.changePercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {status === 'error' ? copy.tickerError : copy.noTicker}
        </p>
      )}

      <style jsx>{`
        .ticker-viewport {
          scrollbar-width: none;
        }
        .ticker-viewport::-webkit-scrollbar {
          display: none;
        }
        .defensive-ticker-track {
          animation: defensiveTicker 55s linear infinite;
        }
        .defensive-ticker-track:hover,
        .defensive-ticker-track:focus-within {
          animation-play-state: paused;
        }
        @keyframes defensiveTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .defensive-ticker-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

function CompactEducationCard({ title, points, tone }: { title: string; points: string[]; tone: 'cyan' | 'amber' }) {
  const toneClass = tone === 'cyan'
    ? 'border-cyan-200 bg-cyan-50/70 text-cyan-950 dark:border-cyan-500/25 dark:bg-cyan-950/25 dark:text-cyan-100'
    : 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-100';

  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <h3 className="font-black">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {points.map(point => (
          <li key={point} className="flex items-start gap-2 text-sm leading-6">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
      <Newspaper className="mx-auto mb-3 text-cyan-600 dark:text-cyan-300" size={30} />
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

function NewsCard({
  item,
  copy,
  formatDateTime,
  formatPrice,
  formatPercent,
  tr,
}: {
  item: StockCategoryNewsItem;
  copy: Record<string, string>;
  locale: string;
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null | undefined, currency?: string) => string;
  formatPercent: (value: number | null | undefined) => string;
  tr: (key: keyof typeof TR) => string;
}) {
  return (
    <article className="group flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span dir="ltr" className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/40 dark:text-cyan-100">
          {item.ticker}
        </span>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 dark:border-blue-500/40 dark:bg-blue-900/40 dark:text-blue-100">
          {item.companyName}
        </span>
        <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-100">
          {item.source}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-3 text-lg font-black leading-relaxed text-slate-950 dark:text-white">
        {item.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {item.summary || item.title}
      </p>
      <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.currentPrice}</p>
          <p dir="ltr" className="mt-1 text-sm font-black text-slate-900 dark:text-white">
            {formatPrice(item.price, 'USD')}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.change}</p>
          <p dir="ltr" className={`mt-1 text-sm font-black ${changeTone(item.changePercent)}`}>
            {formatPercent(item.changePercent)}
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
}

function SidebarPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
        <span className="text-cyan-600 dark:text-cyan-300">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p dir={ltr ? 'ltr' : undefined} className="mt-1 text-sm font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export default DefensiveStocksNewsPage;
