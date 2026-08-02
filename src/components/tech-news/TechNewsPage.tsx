'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Newspaper,
  RefreshCcw,
} from 'lucide-react';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechNewsItem, TechNewsPayload } from '@/lib/market/fetchTechNews';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { EvidenceLabels } from '@/components/tech-news/TechNewsEvidence';
import { TechNewsUnifiedFeed } from '@/components/tech-news/TechNewsUnifiedFeed';
import { TechNewsQuickFilters } from '@/components/tech-news/TechNewsQuickFilters';
import { TechNewsAdvancedFilters } from '@/components/tech-news/TechNewsAdvancedFilters';
import { TechNewsHeader } from '@/components/tech-news/TechNewsHeader';
import { TechNewsSkeleton } from '@/components/tech-news/TechNewsSkeleton';
import { TechTickerStrip } from '@/components/tech-news/TechTickerStrip';
import { TechNewsLayoutStyles } from '@/components/tech-news/TechNewsLayoutStyles';
import { TechNewsCardStyles } from '@/components/tech-news/TechNewsCardStyles';
import {
  CATEGORY_ORDER,
  canonicalSourceLabel,
  categoryMatches,
  computeMentionedTickers,
  computeSourceCounts,
  dedupeNewsItems,
  impactMatches,
  itemMatchesSearch,
  sortNewsItems,
  sourceMatches,
  timeMatches,
  type TechNewsDashboardCategory,
  type TechNewsImpactFilter,
  type TechNewsSort,
  type TechNewsTimeFilter,
} from '@/lib/tech-news/newsProcessing';

const TechNewsSidePanel = dynamic(
  () => import('@/components/tech-news/TechNewsSidePanel').then(module => module.TechNewsSidePanel),
  { loading: () => null },
);

type ApiResponse = TechNewsPayload | { success: false; error?: string; reason?: string };
type TechNewsViewMode = 'grid' | 'list';
type NewsDeliveryStatus = Pick<TechNewsPayload, 'partialFailure' | 'liveUpdatesAvailable' | 'storedFallbackUsed'>;

const NEWS_PAGE_SIZE = 9;
const FEATURED_NEWS_COUNT = 3;
const INITIAL_VISIBLE_NEWS_COUNT = NEWS_PAGE_SIZE + FEATURED_NEWS_COUNT;
const TRACKED_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'TSLA', 'AMD', 'INTC', 'ORCL', 'CRM', 'AVGO', 'NFLX'] as const;
const INITIAL_NEWS_DELIVERY_STATUS: NewsDeliveryStatus = {
  partialFailure: false,
  liveUpdatesAvailable: true,
  storedFallbackUsed: false,
};

const COPY = {
  ar: {
    title: 'أخبار السوق التقني',
    subtitle: 'تابع أهم أخبار شركات التقنية والذكاء الاصطناعي والرقائق والسحابة مع حركة الأسهم المرتبطة بها.',
    sourceNote: 'الأخبار مجمعة من مصادر مالية خارجية، ويُنصح بالرجوع إلى المصدر الأصلي.',
    dataStatus: 'بيانات سوق متأخرة',
    articleUnit: 'خبر',
    latestNewsUpdate: 'آخر تحديث للأخبار',
    marketUpdate: 'تحديث بيانات السوق',
    unavailable: 'غير متاح',
    delayed: 'أسعار السوق قد تكون متأخرة',
    tickerUpdated: 'محدّث',
    search: 'ابحث في الأخبار أو رمز السهم...',
    categoryNav: 'تصنيفات الأخبار',
    filter: 'تصفية متقدمة',
    close: 'إغلاق',
    source: 'المصدر',
    allSources: 'كل المصادر',
    symbol: 'الشركة / الرمز',
    allSymbols: 'كل الرموز',
    impact: 'التأثير',
    time: 'الفترة الزمنية',
    sort: 'الترتيب',
    clear: 'مسح الفلاتر',
    results: 'عدد النتائج: {count}',
    activeFilters: 'الفلاتر النشطة',
    viewMode: 'طريقة العرض',
    grid: 'شبكة',
    list: 'قائمة',
    featuredTitle: 'الأخبار الأبرز',
    featuredLead: 'قصة رئيسية',
    readNews: 'قراءة الخبر',
    readMore: 'قراءة الخبر',
    openArticle: 'فتح الخبر الأصلي',
    linkUnavailable: 'الرابط غير متاح',
    translated: 'ترجمة آلية',
    originalLanguage: 'النص الأصلي',
    showOriginal: 'عرض النص الأصلي',
    showTranslation: 'عرض الترجمة',
    automatedTranslation: 'ترجمة آلية',
    stockMove: 'حركة السهم المرتبط',
    priceUnavailable: 'بيانات السهم غير متاحة حالياً',
    delayedQuote: 'سعر متأخر',
    resultsTitle: 'أخبار التقنية المتاحة',
    showing: 'المعروض {visible} من {total}',
    loadMore: 'تحميل المزيد',
    allLoaded: 'تم عرض جميع الأخبار المتاحة',
    latest: 'أحدث الأخبار',
    mentioned: 'الأسهم الأكثر ذكراً',
    sources: 'مصادر الأخبار',
    articles: 'أخبار',
    mentions: 'ذكر',
    sourceTransparency: 'شفافية المصدر',
    sourceTransparencyText: 'كل خبر يفتح من ناشره الأصلي، ولا يتم تقديم المحتوى كتحرير من THE SFM.',
    noResults: 'لا توجد أخبار مطابقة',
    noResultsHint: 'جرّب تغيير الفلاتر أو توسيع نطاق البحث.',
    noNews: 'لا توجد أخبار تقنية حالياً',
    retry: 'إعادة المحاولة',
    categories: {
      all: 'الكل',
      ai: 'الذكاء الاصطناعي',
      semiconductors: 'أشباه الموصلات',
      cloud: 'الحوسبة السحابية',
      software: 'البرمجيات',
      cybersecurity: 'الأمن السيبراني',
      hardware: 'الأجهزة',
      ev: 'السيارات الكهربائية',
      techCrypto: 'العملات الرقمية التقنية',
      breaking: 'الأخبار العاجلة',
    },
    impacts: {
      all: 'الكل',
      high: 'تأثير مرتفع',
      medium: 'تأثير متوسط',
      low: 'تأثير منخفض',
    },
    times: {
      today: 'اليوم',
      week: 'آخر 7 أيام',
      month: 'آخر 30 يوماً',
      all: 'الكل',
    },
    sorts: {
      recent: 'الأحدث أولاً',
      oldest: 'الأقدم أولاً',
      impact: 'الأعلى تأثيراً',
      market: 'الأكثر ارتباطاً بالسوق',
      company: 'حسب الشركة',
      source: 'حسب المصدر',
    },
  },
  en: {
    title: 'Tech Market News',
    subtitle: 'Track technology, AI, chips, cloud, and software news with the related stock move.',
    sourceNote: 'News is aggregated from external financial sources. Always review the original source.',
    dataStatus: 'Delayed market data',
    articleUnit: 'articles',
    latestNewsUpdate: 'News updated',
    marketUpdate: 'Market data updated',
    unavailable: 'Unavailable',
    delayed: 'Market prices may be delayed',
    tickerUpdated: 'Updated',
    search: 'Search headline, company, or ticker...',
    categoryNav: 'News categories',
    filter: 'Advanced filters',
    close: 'Close',
    source: 'Source',
    allSources: 'All sources',
    symbol: 'Company / symbol',
    allSymbols: 'All symbols',
    impact: 'Impact',
    time: 'Time range',
    sort: 'Sort',
    clear: 'Clear filters',
    results: '{count} matching articles',
    activeFilters: 'Active filters',
    viewMode: 'View mode',
    grid: 'Grid',
    list: 'List',
    featuredTitle: 'Featured technology news',
    featuredLead: 'Lead story',
    readNews: 'Read news',
    readMore: 'Read news',
    openArticle: 'Open original article',
    linkUnavailable: 'Link unavailable',
    translated: 'Machine translation',
    originalLanguage: 'Original text',
    showOriginal: 'Show original',
    showTranslation: 'Show translation',
    automatedTranslation: 'Machine translation',
    stockMove: 'Related stock move',
    priceUnavailable: 'Stock quote unavailable',
    delayedQuote: 'Delayed quote',
    resultsTitle: 'Available technology news',
    showing: 'Showing {visible} of {total}',
    loadMore: 'Load more',
    allLoaded: 'All available news are shown',
    latest: 'Latest news',
    mentioned: 'Most mentioned stocks',
    sources: 'News sources',
    articles: 'articles',
    mentions: 'mentions',
    sourceTransparency: 'Source transparency',
    sourceTransparencyText: 'Each story opens from its original publisher and is not presented as THE SFM editorial content.',
    noResults: 'No matching news found.',
    noResultsHint: 'Try changing the search or removing some filters.',
    noNews: 'No technology news right now',
    retry: 'Retry',
    categories: {
      all: 'All',
      ai: 'Artificial intelligence',
      semiconductors: 'Semiconductors',
      cloud: 'Cloud',
      software: 'Software',
      cybersecurity: 'Cybersecurity',
      hardware: 'Devices',
      ev: 'Electric vehicles',
      techCrypto: 'Tech crypto',
      breaking: 'Breaking news',
    },
    impacts: {
      all: 'All',
      high: 'High impact',
      medium: 'Medium impact',
      low: 'Low impact',
    },
    times: {
      today: 'Today',
      week: 'Last 7 days',
      month: 'Last 30 days',
      all: 'All',
    },
    sorts: {
      recent: 'Newest first',
      oldest: 'Oldest first',
      impact: 'Highest impact',
      market: 'Most market-related',
      company: 'By company',
      source: 'By source',
    },
  },
  fr: {
    title: 'Actualités du marché technologique',
    subtitle: 'Suivez les actualités technologie, IA, puces, cloud et logiciels avec le mouvement des actions liées.',
    sourceNote: 'Les actualités sont agrégées depuis des sources financières externes. Vérifiez toujours la source originale.',
    dataStatus: 'Données de marché différées',
    articleUnit: 'articles',
    latestNewsUpdate: 'Actualités mises à jour',
    marketUpdate: 'Données de marché mises à jour',
    unavailable: 'Indisponible',
    delayed: 'Les prix de marché peuvent être différés',
    tickerUpdated: 'Mis à jour',
    search: 'Rechercher un titre, une entreprise ou un symbole...',
    categoryNav: 'Catégories d’actualités',
    filter: 'Filtres avancés',
    close: 'Fermer',
    source: 'Source',
    allSources: 'Toutes les sources',
    symbol: 'Entreprise / symbole',
    allSymbols: 'Tous les symboles',
    impact: 'Impact',
    time: 'Période',
    sort: 'Tri',
    clear: 'Effacer les filtres',
    results: '{count} actualités',
    activeFilters: 'Filtres actifs',
    viewMode: 'Affichage',
    grid: 'Grille',
    list: 'Liste',
    featuredTitle: 'Actualités technologiques à la une',
    featuredLead: 'Article principal',
    readNews: 'Lire',
    readMore: 'Lire',
    openArticle: "Ouvrir l'article original",
    linkUnavailable: 'Lien indisponible',
    translated: 'Traduction automatique',
    originalLanguage: 'Texte original',
    showOriginal: 'Voir original',
    showTranslation: 'Voir traduction',
    automatedTranslation: 'Traduction automatique',
    stockMove: "Mouvement de l'action liée",
    priceUnavailable: 'Cours indisponible',
    delayedQuote: 'Cours différé',
    resultsTitle: 'Actualités technologiques disponibles',
    showing: '{visible} sur {total} affichées',
    loadMore: 'Charger plus',
    allLoaded: 'Toutes les actualités disponibles sont affichées',
    latest: 'Dernières actualités',
    mentioned: 'Actions les plus citées',
    sources: "Sources d'actualités",
    articles: 'articles',
    mentions: 'mentions',
    sourceTransparency: 'Transparence des sources',
    sourceTransparencyText: "Chaque actualité s'ouvre chez son éditeur original et n'est pas présentée comme contenu éditorial de THE SFM.",
    noResults: 'Aucune actualité correspondante.',
    noResultsHint: 'Essayez de modifier la recherche ou de supprimer des filtres.',
    noNews: 'Aucune actualité technologique pour le moment',
    retry: 'Réessayer',
    categories: {
      all: 'Tout',
      ai: 'Intelligence artificielle',
      semiconductors: 'Semi-conducteurs',
      cloud: 'Cloud',
      software: 'Logiciels',
      cybersecurity: 'Cybersécurité',
      hardware: 'Appareils',
      ev: 'Véhicules électriques',
      techCrypto: 'Crypto technologique',
      breaking: 'Actualités urgentes',
    },
    impacts: {
      all: 'Tout',
      high: 'Impact élevé',
      medium: 'Impact moyen',
      low: 'Impact faible',
    },
    times: {
      today: "Aujourd'hui",
      week: '7 derniers jours',
      month: '30 derniers jours',
      all: 'Tout',
    },
    sorts: {
      recent: 'Plus récent',
      oldest: 'Plus ancien',
      impact: 'Impact le plus élevé',
      market: 'Plus lié au marché',
      company: 'Par entreprise',
      source: 'Par source',
    },
  },
} as const;

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
}

function copyFor(lang: string) {
  if (lang === 'en') return COPY.en;
  if (lang === 'fr') return COPY.fr;
  return COPY.ar;
}

function minutesAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function buildUpdateLabel(prefix: string, value: string, locale: string, unavailable: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${prefix}: ${unavailable}`;
  return `${prefix}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

function replaceMany(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), template);
}

export function TechNewsPage() {
  const { dir, lang, t } = useLanguage();
  const ui = copyFor(lang);
  const [items, setItems] = useState<TechNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [newsDeliveryStatus, setNewsDeliveryStatus] = useState<NewsDeliveryStatus>(INITIAL_NEWS_DELIVERY_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TechNewsDashboardCategory>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState<TechNewsImpactFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TechNewsTimeFilter>('all');
  const [sort, setSort] = useState<TechNewsSort>('recent');
  const [viewMode, setViewMode] = useState<TechNewsViewMode>('grid');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_NEWS_COUNT);
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true, signal?: AbortSignal) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/tech-news?lang=${encodeURIComponent(lang)}&limit=60`, { signal });
      const json = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || ui.noNews : ui.noNews);
      }
      setItems(json.items);
      setPrices(json.prices ?? []);
      setLastUpdated(json.lastUpdated);
      setNewsDeliveryStatus({
        partialFailure: json.partialFailure,
        liveUpdatesAvailable: json.liveUpdatesAvailable,
        storedFallbackUsed: json.storedFallbackUsed,
      });
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setItems([]);
      setPrices([]);
      setLastUpdated('');
      setNewsDeliveryStatus(INITIAL_NEWS_DELIVERY_STATUS);
      setError(loadError instanceof Error ? loadError.message : ui.noNews);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [lang, ui.noNews]);

  useEffect(() => {
    const controller = new AbortController();
    void load(true, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_NEWS_COUNT);
  }, [category, impactFilter, lang, query, sort, sourceFilter, symbolFilter, timeFilter]);

  const dedupedItems = useMemo(() => dedupeNewsItems(items), [items]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(dedupedItems.map(item => canonicalSourceLabel(item.source)).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
  ), [dedupedItems]);

  const symbolOptions = useMemo(() => [...TRACKED_SYMBOLS], []);

  const baseFilteredItems = useMemo(() => {
    return dedupedItems
      .filter(item => sourceMatches(item, sourceFilter))
      .filter(item => symbolFilter === 'all' || item.ticker === symbolFilter)
      .filter(item => impactMatches(item, impactFilter))
      .filter(item => timeMatches(item, timeFilter))
      .filter(item => itemMatchesSearch(item, query));
  }, [dedupedItems, impactFilter, query, sourceFilter, symbolFilter, timeFilter]);

  const categoryCounts = useMemo(() => Object.fromEntries(
    CATEGORY_ORDER.map(cat => [cat, baseFilteredItems.filter(item => categoryMatches(item, cat)).length]),
  ) as Record<TechNewsDashboardCategory, number>, [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    const nextItems = baseFilteredItems.filter(item => categoryMatches(item, category));
    return sortNewsItems(nextItems, sort, locale);
  }, [baseFilteredItems, category, locale, sort]);

  const visibleNewsItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < filteredItems.length;

  const mentionedTickers = useMemo(() => computeMentionedTickers(filteredItems), [filteredItems]);
  const sourceCounts = useMemo(() => computeSourceCounts(filteredItems), [filteredItems]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return ui.unavailable;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatPrice = (value: number | null) => {
    if (value === null) return ui.priceUnavailable;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const updatedMinutes = minutesAgo(lastUpdated);
  const newsUpdatedLabel = updatedMinutes === null
    ? buildUpdateLabel(ui.latestNewsUpdate, lastUpdated, locale, ui.unavailable)
    : `${ui.latestNewsUpdate}: ${updatedMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}`;
  const marketUpdatedLabel = buildUpdateLabel(ui.marketUpdate, lastUpdated, locale, ui.unavailable);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setSourceFilter('all');
    setSymbolFilter('all');
    setImpactFilter('all');
    setTimeFilter('all');
    setSort('recent');
  };

  const cardLabels = {
    source: ui.source,
    published: ui.latestNewsUpdate,
    openArticle: ui.openArticle,
    readMore: ui.readMore,
    priceUnavailable: ui.priceUnavailable,
    translated: ui.translated,
    originalLanguage: ui.originalLanguage,
    linkUnavailable: ui.linkUnavailable,
    showOriginal: ui.showOriginal,
    showTranslation: ui.showTranslation,
    automatedTranslation: ui.automatedTranslation,
    stockMove: ui.stockMove,
    delayedQuote: ui.delayedQuote,
  };
  const evidenceLabels: EvidenceLabels = {
    official: t('news_verification_official'),
    confirmed: t('news_verification_confirmed'),
    singleSource: t('news_verification_single_source'),
    conflicting: t('news_verification_conflicting'),
    unverified: t('news_verification_unverified'),
    sourceCount: t('news_independent_source_count'),
    confirmations: t('news_independent_confirmations'),
    singleSourceDetail: t('news_single_source_detail'),
    conflictDetail: t('news_conflict_detail'),
  };
  const coverageNotice = newsDeliveryStatus.storedFallbackUsed || !newsDeliveryStatus.liveUpdatesAvailable
    ? t('news_stored_fallback')
    : newsDeliveryStatus.partialFailure
      ? t('news_partial_coverage')
      : '';

  return (
    <NewsPageShell category="tech" className="tech-news-shell" dir={dir} wide>
      <TechNewsLayoutStyles />
      <TechNewsCardStyles />
      <WorkspacePageContainer as="main" variant="wide" className="tech-news-main">
        <TechNewsHeader
          title={ui.title}
          subtitle={ui.subtitle}
          articleCount={dedupedItems.length}
          articleUnitLabel={ui.articleUnit}
          lastUpdatedLabel={newsUpdatedLabel}
          marketUpdatedLabel={marketUpdatedLabel}
          dataStatusLabel={ui.dataStatus}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />
        {coverageNotice ? (
          <div className="tech-news-coverage-notice" role="status">
            <AlertTriangle size={17} />
            <span>{coverageNotice}</span>
          </div>
        ) : null}
        <TechTickerStrip
          prices={prices}
          formatPrice={formatPrice}
          direction={dir === 'rtl' ? 'rtl' : 'ltr'}
          labels={{
            priceUnavailable: ui.priceUnavailable,
            unavailable: ui.unavailable,
            delayedGlobal: ui.delayed,
            lastUpdated: ui.tickerUpdated,
            sourceLabel: ui.source,
          }}
        />

        {loading ? (
          <TechNewsSkeleton />
        ) : error ? (
          <section className="tech-news-state" role="alert">
            <AlertTriangle size={24} />
            <strong>{ui.noNews}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCcw size={16} />
              {ui.retry}
            </button>
          </section>
        ) : (
          <>
            <TechNewsQuickFilters
              query={query}
              category={category}
              categoryCounts={categoryCounts}
              labels={{ search: ui.search, categoryNav: ui.categoryNav, categories: ui.categories }}
              onQueryChange={setQuery}
              onCategoryChange={setCategory}
            />

            <TechNewsAdvancedFilters
              source={sourceFilter}
              symbol={symbolFilter}
              impactFilter={impactFilter}
              timeFilter={timeFilter}
              sort={sort}
              sources={sourceOptions}
              symbols={symbolOptions}
              resultsCount={filteredItems.length}
              labels={{
                filter: ui.filter,
                close: ui.close,
                source: ui.source,
                allSources: ui.allSources,
                symbol: ui.symbol,
                allSymbols: ui.allSymbols,
                impact: ui.impact,
                time: ui.time,
                sort: ui.sort,
                clear: ui.clear,
                results: ui.results,
                activeFilters: ui.activeFilters,
                impacts: ui.impacts,
                times: ui.times,
                sorts: ui.sorts,
              }}
              onSourceChange={setSourceFilter}
              onSymbolChange={setSymbolFilter}
              onImpactFilterChange={setImpactFilter}
              onTimeFilterChange={setTimeFilter}
              onSortChange={setSort}
              onClearFilters={clearFilters}
            />

            {filteredItems.length === 0 ? (
              <section className="tech-news-state">
                <Newspaper size={24} />
                <strong>{dedupedItems.length === 0 ? ui.noNews : ui.noResults}</strong>
                <p>{ui.noResultsHint}</p>
                {dedupedItems.length > 0 ? (
                  <button type="button" onClick={clearFilters}>
                    <RefreshCcw size={16} />
                    {ui.clear}
                  </button>
                ) : null}
              </section>
            ) : (
              <>
                <div className="tech-news-results-bar">
                  <div>
                    <span>{ui.resultsTitle}</span>
                    <b>{replaceMany(ui.showing, { visible: visibleNewsItems.length, total: filteredItems.length })}</b>
                  </div>
                  <div className="tech-news-view-toggle" aria-label={ui.viewMode}>
                    <button
                      type="button"
                      className={viewMode === 'grid' ? 'active' : ''}
                      onClick={() => setViewMode('grid')}
                      aria-pressed={viewMode === 'grid'}
                    >
                      <LayoutGrid size={15} />
                      {ui.grid}
                    </button>
                    <button
                      type="button"
                      className={viewMode === 'list' ? 'active' : ''}
                      onClick={() => setViewMode('list')}
                      aria-pressed={viewMode === 'list'}
                    >
                      <List size={15} />
                      {ui.list}
                    </button>
                  </div>
                </div>

                <section className="tech-news-layout" aria-label={ui.title} data-testid="tech-news-feed-layout">
                  <div className="tech-news-content-column">
                    <TechNewsUnifiedFeed
                      items={visibleNewsItems}
                      viewMode={viewMode}
                      label={ui.resultsTitle}
                      cardLabels={cardLabels}
                      evidenceLabels={evidenceLabels}
                      formatDateTime={formatDateTime}
                      formatPrice={formatPrice}
                    />

                    <div className="tech-news-load-more-wrap">
                      {hasMoreItems ? (
                        <button
                          type="button"
                          className="tech-news-load-more"
                          onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}
                        >
                          {ui.loadMore}
                        </button>
                      ) : (
                        <span>{ui.allLoaded}</span>
                      )}
                    </div>
                  </div>

                  <TechNewsSidePanel
                    latestItems={filteredItems.slice(0, 6)}
                    mentionedTickers={mentionedTickers}
                    sourceCounts={sourceCounts}
                    labels={{
                      latest: ui.latest,
                      mentioned: ui.mentioned,
                      sources: ui.sources,
                      articles: ui.articles,
                      mentions: ui.mentions,
                      source: ui.source,
                      sourceTransparency: ui.sourceTransparency,
                      sourceTransparencyText: ui.sourceTransparencyText,
                    }}
                    formatDateTime={formatDateTime}
                  />
                </section>
              </>
            )}
          </>
        )}

        <p className="tech-news-disclaimer">{ui.sourceNote}</p>
      </WorkspacePageContainer>
    </NewsPageShell>
  );
}

export default TechNewsPage;
