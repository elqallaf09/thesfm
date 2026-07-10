'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  ExternalLink,
  LayoutGrid,
  List,
  Newspaper,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechNewsItem, TechNewsPayload } from '@/lib/market/fetchTechNews';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import {
  TechNewsFilters,
  type TechNewsDashboardCategory,
  type TechNewsImpactFilter,
  type TechNewsSort,
  type TechNewsTimeFilter,
} from '@/components/tech-news/TechNewsFilters';
import { TechNewsHeader } from '@/components/tech-news/TechNewsHeader';
import { TechNewsSkeleton } from '@/components/tech-news/TechNewsSkeleton';
import { TechTickerStrip } from '@/components/tech-news/TechTickerStrip';

type ApiResponse = TechNewsPayload | { success: false; error?: string; reason?: string };
type TechNewsViewMode = 'grid' | 'list';
type NewsDeliveryStatus = Pick<TechNewsPayload, 'partialFailure' | 'liveUpdatesAvailable' | 'storedFallbackUsed'>;
type EvidenceLabels = {
  official: string;
  confirmed: string;
  singleSource: string;
  conflicting: string;
  unverified: string;
  sourceCount: string;
  confirmations: string;
  singleSourceDetail: string;
  conflictDetail: string;
};
type MentionedTicker = {
  ticker: string;
  companyName: string;
  count: number;
};

const NEWS_PAGE_SIZE = 9;
const FEATURED_NEWS_COUNT = 3;
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
    filter: 'تصفية الأخبار',
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
    filter: 'Filter news',
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
    filter: 'Filtrer les actualités',
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

const CATEGORY_SEARCH_TERMS: Record<TechNewsDashboardCategory, string[]> = {
  all: [],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'openai', 'anthropic', 'copilot', 'gemini', 'data center ai'],
  semiconductors: ['semiconductor', 'semiconductors', 'chip', 'chips', 'gpu', 'cpu', 'nvidia', 'amd', 'intel', 'broadcom', 'tsmc', 'qualcomm', 'micron', 'asml'],
  cloud: ['cloud', 'cloud computing', 'aws', 'azure', 'google cloud', 'oracle cloud', 'data center'],
  software: ['software', 'saas', 'microsoft', 'salesforce', 'oracle', 'adobe', 'servicenow', 'palantir', 'datadog', 'snowflake'],
  cybersecurity: ['cybersecurity', 'cyber security', 'crowdstrike', 'palo alto', 'fortinet', 'zscaler', 'ransomware', 'breach'],
  hardware: ['devices', 'hardware', 'iphone', 'mac', 'pc', 'smartphones', 'apple', 'dell', 'hp'],
  ev: ['electric vehicle', 'ev', 'tesla', 'rivian', 'lucid', 'autonomous driving', 'battery'],
  techCrypto: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'stablecoin', 'coinbase', 'mining'],
  breaking: ['breaking', 'urgent', 'alert', 'just in', 'beats estimates', 'misses estimates', 'guidance', 'lawsuit', 'acquisition', 'merger', 'sec probe', 'stock jumps', 'stock falls', 'shares jump', 'shares fall'],
};

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

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an|to|for|and|or|of|in|on|with|as|by|from)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'guccounter'].forEach(param => url.searchParams.delete(param));
    return `${url.origin}${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function dedupeNewsItems(items: TechNewsItem[]) {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter(item => {
    const urlKey = item.url ? `url:${normalizeUrl(item.url)}` : '';
    const idKey = item.id ? `id:${item.id.toLowerCase()}` : '';
    const titleKey = normalizeTitle(item.titleOriginal || item.headline || item.title);
    const primaryKey = urlKey || idKey || `title:${titleKey}`;
    if (!primaryKey || seen.has(primaryKey) || (titleKey && seenTitles.has(titleKey))) return false;
    seen.add(primaryKey);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
}

function itemSearchText(item: TechNewsItem) {
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

function hasKeyword(item: TechNewsItem, keywords: string[]) {
  const haystack = itemSearchText(item);
  return keywords.some(keyword => haystack.includes(keyword.toLowerCase()));
}

function itemMatchesSearch(item: TechNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

function canonicalSourceLabel(source: string) {
  const raw = String(source ?? '').trim();
  const normalized = raw.toLowerCase().replace(/[\s._-]+/g, '');
  if (!raw) return '';
  if (normalized.includes('yahoo')) return 'Yahoo';
  if (normalized.includes('finnhub')) return 'Finnhub';
  if (normalized.includes('benzinga')) return 'Benzinga';
  if (normalized.includes('cnbc')) return 'CNBC';
  if (normalized.includes('seekingalpha')) return 'SeekingAlpha';
  return raw;
}

function sourceMatches(item: TechNewsItem, source: string) {
  if (source === 'all') return true;
  return canonicalSourceLabel(item.source) === source;
}

function TechNewsEvidence({ item, labels }: { item: TechNewsItem; labels: EvidenceLabels }) {
  const independentCount = Math.max(1, item.independentSourceCount || 0);
  const isConflicting = item.verificationStatus === 'conflicting';
  const isOfficial = item.isOfficial || item.verificationStatus === 'official';
  const status = isConflicting
    ? labels.conflicting
    : isOfficial
      ? labels.official
      : item.verificationStatus === 'confirmed'
      ? labels.confirmed
        : item.verificationStatus === 'single_source'
          ? labels.singleSource
          : labels.unverified;
  const detail = isConflicting
    ? labels.conflictDetail
    : independentCount > 1
      ? labels.confirmations.replace('{count}', String(independentCount))
      : isOfficial
        ? labels.sourceCount.replace('{count}', String(independentCount))
        : labels.singleSourceDetail;

  return (
    <div className={`tech-news-evidence ${isConflicting ? 'conflicting' : isOfficial ? 'official' : ''}`}>
      {isConflicting ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
      <div>
        <strong>{status}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function categoryMatches(item: TechNewsItem, category: TechNewsDashboardCategory) {
  if (category === 'all') return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])]);

  if (category === 'ai') return sectors.has('ai') || hasKeyword(item, CATEGORY_SEARCH_TERMS.ai);
  if (category === 'semiconductors') return sectors.has('semiconductors') || hasKeyword(item, CATEGORY_SEARCH_TERMS.semiconductors);
  if (category === 'cloud') return sectors.has('cloud') || hasKeyword(item, CATEGORY_SEARCH_TERMS.cloud);
  if (category === 'software') return sectors.has('software') || hasKeyword(item, CATEGORY_SEARCH_TERMS.software);
  if (category === 'cybersecurity') return sectors.has('cybersecurity') || hasKeyword(item, CATEGORY_SEARCH_TERMS.cybersecurity);
  if (category === 'hardware') return sectors.has('hardware') || hasKeyword(item, CATEGORY_SEARCH_TERMS.hardware);
  if (category === 'ev') return sectors.has('ev') || hasKeyword(item, CATEGORY_SEARCH_TERMS.ev);
  if (category === 'techCrypto') return hasKeyword(item, CATEGORY_SEARCH_TERMS.techCrypto);
  if (category === 'breaking') return hasKeyword(item, CATEGORY_SEARCH_TERMS.breaking) || (timeMatches(item, 'today') && impactLevel(item) === 'high');

  return false;
}

function timeMatches(item: TechNewsItem, filter: TechNewsTimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffHours = (Date.now() - date.getTime()) / 3600000;
  if (filter === 'today') return diffHours <= 24;
  if (filter === 'week') return diffHours <= 24 * 7;
  return diffHours <= 24 * 30;
}

function impactScore(item: TechNewsItem) {
  const changeImpact = Math.abs(Number(item.changePercent ?? 0));
  const tickerBonus = item.ticker && item.ticker !== 'TECH' ? 0.35 : 0;
  const translatedBonus = item.isTranslated ? 0.1 : 0;
  return changeImpact + tickerBonus + translatedBonus;
}

function impactLevel(item: TechNewsItem): TechNewsImpactFilter {
  const score = impactScore(item);
  if (score >= 3 || hasKeyword(item, ['earnings', 'guidance', 'acquisition', 'merger', 'lawsuit', 'sec probe', 'stock jumps', 'stock falls', 'shares jump', 'shares fall'])) {
    return 'high';
  }
  if (score >= 1 || hasKeyword(item, ['launch', 'partnership', 'deal', 'contract', 'upgrade', 'downgrade', 'analyst', 'forecast'])) {
    return 'medium';
  }
  return 'low';
}

function impactMatches(item: TechNewsItem, filter: TechNewsImpactFilter) {
  return filter === 'all' || impactLevel(item) === filter;
}

function marketConnectionScore(item: TechNewsItem) {
  const tickerBonus = item.ticker && item.ticker !== 'TECH' ? 12 : 0;
  const priceBonus = Math.min(Math.abs(Number(item.changePercent ?? 0)), 8);
  const marketTermsBonus = hasKeyword(item, ['stock', 'shares', 'earnings', 'revenue', 'profit', 'guidance', 'nasdaq', 'downgrade', 'upgrade', 'analyst', 'market']) ? 8 : 0;
  const sectorBonus = item.sectors?.length ? Math.min(item.sectors.length, 4) : 0;
  return tickerBonus + priceBonus + marketTermsBonus + sectorBonus + new Date(item.publishedAt).getTime() / 100000000000;
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
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/tech-news?lang=${encodeURIComponent(lang)}&limit=60`);
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
    void load();
  }, [load]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
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

  const categoryCounts = useMemo(() => ({
    all: baseFilteredItems.filter(item => categoryMatches(item, 'all')).length,
    ai: baseFilteredItems.filter(item => categoryMatches(item, 'ai')).length,
    semiconductors: baseFilteredItems.filter(item => categoryMatches(item, 'semiconductors')).length,
    cloud: baseFilteredItems.filter(item => categoryMatches(item, 'cloud')).length,
    software: baseFilteredItems.filter(item => categoryMatches(item, 'software')).length,
    cybersecurity: baseFilteredItems.filter(item => categoryMatches(item, 'cybersecurity')).length,
    hardware: baseFilteredItems.filter(item => categoryMatches(item, 'hardware')).length,
    ev: baseFilteredItems.filter(item => categoryMatches(item, 'ev')).length,
    techCrypto: baseFilteredItems.filter(item => categoryMatches(item, 'techCrypto')).length,
    breaking: baseFilteredItems.filter(item => categoryMatches(item, 'breaking')).length,
  }), [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    const nextItems = baseFilteredItems.filter(item => categoryMatches(item, category));

    return nextItems.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (sort === 'impact') {
        const impactDiff = impactScore(b) - impactScore(a);
        if (impactDiff !== 0) return impactDiff;
      }
      if (sort === 'market') {
        const marketDiff = marketConnectionScore(b) - marketConnectionScore(a);
        if (marketDiff !== 0) return marketDiff;
      }
      if (sort === 'company') {
        const companyDiff = a.companyName.localeCompare(b.companyName, locale);
        if (companyDiff !== 0) return companyDiff;
        return a.ticker.localeCompare(b.ticker, 'en-US');
      }
      if (sort === 'source') {
        const sourceDiff = canonicalSourceLabel(a.source).localeCompare(canonicalSourceLabel(b.source), locale);
        if (sourceDiff !== 0) return sourceDiff;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [baseFilteredItems, category, locale, sort]);

  const featuredItems = filteredItems.slice(0, FEATURED_NEWS_COUNT);
  const featuredIds = new Set(featuredItems.map(item => item.id));
  const regularItems = filteredItems.filter(item => !featuredIds.has(item.id));
  const visibleNewsItems = regularItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < regularItems.length;

  const mentionedTickers = useMemo(() => {
    const counts = new Map<string, MentionedTicker>();
    filteredItems.forEach(item => {
      const ticker = String(item.ticker ?? '').trim().toUpperCase();
      if (!ticker || ticker === 'TECH') return;
      const companyName = item.companyName && item.companyName !== 'Technology Market' ? item.companyName : ticker;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName && current.companyName !== ticker ? current.companyName : companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredItems.forEach(item => {
      if (!item.source) return;
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredItems]);

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

  const filterControls = (
    <TechNewsFilters
      query={query}
      category={category}
      source={sourceFilter}
      symbol={symbolFilter}
      impactFilter={impactFilter}
      timeFilter={timeFilter}
      sort={sort}
      sources={sourceOptions}
      symbols={symbolOptions}
      resultsCount={filteredItems.length}
      labels={{
        search: ui.search,
        filter: ui.filter,
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
        categories: ui.categories,
        impacts: ui.impacts,
        times: ui.times,
        sorts: ui.sorts,
      }}
      categoryCounts={categoryCounts}
      onQueryChange={setQuery}
      onCategoryChange={setCategory}
      onSourceChange={setSourceFilter}
      onSymbolChange={setSymbolFilter}
      onImpactFilterChange={setImpactFilter}
      onTimeFilterChange={setTimeFilter}
      onSortChange={setSort}
      onClearFilters={clearFilters}
    />
  );

  return (
    <NewsPageShell category="tech" className="tech-news-shell" dir={dir}>
      <main className="tech-news-main">
        <TechNewsHeader
          title={ui.title}
          subtitle={ui.subtitle}
          articleCount={dedupedItems.length}
          articleUnitLabel={ui.articleUnit}
          lastUpdatedLabel={newsUpdatedLabel}
          marketUpdatedLabel={marketUpdatedLabel}
          sourceNote={ui.sourceNote}
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
          <section className="tech-news-state error" role="alert">
            <AlertTriangle size={24} />
            <strong>{ui.noNews}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCcw size={16} />
              {ui.retry}
            </button>
          </section>
        ) : filteredItems.length === 0 ? (
          <>
            {filterControls}
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
          </>
        ) : (
          <>
            <FeaturedNewsSection
              items={featuredItems}
              labels={{
                title: ui.featuredTitle,
                lead: ui.featuredLead,
                openArticle: ui.openArticle,
                readMore: ui.readMore,
                linkUnavailable: ui.linkUnavailable,
              }}
              cardLabels={cardLabels}
              evidenceLabels={evidenceLabels}
              formatDateTime={formatDateTime}
              formatPrice={formatPrice}
            />

            {filterControls}

            <section className="tech-news-layout" aria-label={ui.title}>
              <div className="tech-news-content-column">
                <div className="tech-news-results-bar">
                  <div>
                    <span>{ui.resultsTitle}</span>
                    <b>{replaceMany(ui.showing, { visible: featuredItems.length + visibleNewsItems.length, total: filteredItems.length })}</b>
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

                {visibleNewsItems.length > 0 ? (
                  <section className={`tech-news-feed ${viewMode}`} aria-label={ui.resultsTitle}>
                    {visibleNewsItems.map(item => (
                      <div className="tech-news-evidence-card" key={item.id}>
                        <TechNewsCard
                          item={item}
                          variant={viewMode === 'list' ? 'list' : 'standard'}
                          labels={cardLabels}
                          formatDateTime={formatDateTime}
                          formatPrice={formatPrice}
                        />
                        <TechNewsEvidence item={item} labels={evidenceLabels} />
                      </div>
                    ))}
                  </section>
                ) : null}

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

        <p className="tech-news-disclaimer">{ui.sourceNote}</p>
      </main>

      <style jsx global>{`
        .tech-news-shell{
          --tech-bg:#EEF7FF;
          --tech-bg-soft:#F7FBFF;
          --tech-panel:#FFFFFF;
          --tech-panel-soft:#F8FCFF;
          --tech-text:#071C34;
          --tech-muted:#64748B;
          --tech-border:#D8E8F4;
          --tech-border-strong:#BFE6EF;
          --tech-primary:#1595F2;
          --tech-accent:#24D5C5;
          --tech-green:#047857;
          --tech-red:#B42318;
          --tech-amber:#B45309;
          --tech-shadow:0 20px 48px rgba(12,38,66,.10);
          min-height:100vh;
          background:
            radial-gradient(circle at 18% 10%, rgba(36,213,197,.18), transparent 32%),
            linear-gradient(180deg,var(--tech-bg),var(--tech-bg-soft));
          color:var(--tech-text);
          overflow-x:hidden;
        }

        .dark .tech-news-shell,
        .tech-news-shell .dark{
          --tech-bg:#06192D;
          --tech-bg-soft:#071F36;
          --tech-panel:#0B2742;
          --tech-panel-soft:#0D314F;
          --tech-text:#ECFEFF;
          --tech-muted:#A9C4D9;
          --tech-border:rgba(125,211,252,.20);
          --tech-border-strong:rgba(45,212,191,.32);
          --tech-shadow:0 22px 52px rgba(0,0,0,.28);
        }

        [dir].tech-news-shell .tech-news-main{
          width:min(1500px,calc(100% - 32px));
          margin-inline:auto;
          padding:24px 0 48px;
          display:grid;
          gap:20px;
          min-width:0;
        }

        @media(min-width:1025px){
          [dir="rtl"].tech-news-shell .tech-news-main{
            margin-inline-start:calc(var(--sidebar-width, 280px) + 24px);
            margin-inline-end:24px;
            width:min(1500px,calc(100vw - var(--sidebar-width, 280px) - 56px));
          }

          [dir="ltr"].tech-news-shell .tech-news-main{
            margin-inline-start:calc(var(--sidebar-width, 280px) + 24px);
            margin-inline-end:24px;
            width:min(1500px,calc(100vw - var(--sidebar-width, 280px) - 56px));
          }
        }

        .tech-ticker-strip{
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px;
          border:1px solid var(--tech-border);
          background:rgba(255,255,255,.78);
          box-shadow:0 10px 24px rgba(15,118,110,.07);
          backdrop-filter:blur(12px);
          border-radius:18px;
          overflow:hidden;
        }

        .tech-ticker-viewport{
          min-height:50px;
          min-width:0;
          flex:1;
          overflow:hidden;
        }
        .tech-ticker-track{
          display:flex;
          align-items:center;
          gap:8px;
          width:max-content;
        }
        .tech-ticker-set{
          display:flex;
          align-items:center;
          gap:8px;
          flex:none;
        }
        .tech-ticker-delay-badge{
          display:inline-flex;
          align-items:center;
          gap:5px;
          min-height:28px;
          padding:0 10px;
          border-radius:999px;
          background:#E0F2FE;
          color:#075985;
          font-size:11px;
          font-weight:900;
          white-space:nowrap;
        }

        .tech-ticker-item{
          width:210px;
          min-height:56px;
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          align-items:center;
          gap:4px 6px;
          padding:7px 10px;
          border:1px solid var(--tech-border);
          border-radius:14px;
          background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));
          box-shadow:0 8px 18px rgba(10,43,74,.05);
        }

        .tech-ticker-item .tech-ticker-identity{
          grid-column:1 / -1;
          display:flex;
          align-items:center;
          gap:7px;
          min-width:0;
        }
        .tech-ticker-item .tech-ticker-identity > div{
          display:grid;
          gap:1px;
          min-width:0;
          overflow:hidden;
        }
        .tech-ticker-item .tech-ticker-identity .asset-identity-name{
          font-size:10px;
          line-height:1.1;
        }
        .tech-ticker-item .tech-ticker-identity .asset-identity-symbol{
          font-size:10px;
        }
        .tech-ticker-item .tech-ticker-identity strong{
          font-size:9px;
          color:var(--tech-muted);
          text-transform:uppercase;
          letter-spacing:.2px;
          line-height:1;
        }
        .tech-ticker-item small{
          display:inline-flex;
          align-items:center;
          gap:3px;
          min-width:0;
          max-width:100%;
          overflow:hidden;
          color:var(--tech-muted);
          font-size:10px;
          font-weight:850;
          text-overflow:ellipsis;
          white-space:nowrap;
          grid-column:1 / -1;
        }
        .tech-ticker-price{
          grid-column:1;
          color:var(--tech-text);
          font-size:12px;
          font-weight:950;
          white-space:nowrap;
        }
        .tech-ticker-change{
          grid-column:2;
          display:inline-flex;
          align-items:center;
          gap:4px;
          justify-self:end;
          border-radius:999px;
          padding:3px 6px;
          font-size:10px;
          font-weight:950;
          white-space:nowrap;
        }
        .tech-ticker-change.up{
          background:#DCFCE7;
          color:#166534;
        }
        .tech-ticker-change.down{
          background:#FEE2E2;
          color:#991B1B;
        }
        .tech-ticker-change.neutral{
          background:#E2E8F0;
          color:#334155;
        }

        @media (max-width: 620px) {
          .tech-ticker-strip{
            padding:6px;
          }
          .tech-ticker-viewport{
            min-height:52px;
          }
          .tech-ticker-item{
            width:206px;
            min-height:58px;
            padding:7px 9px;
            gap:3px 6px;
          }
          .tech-ticker-item small{
            font-size:9.3px;
          }
          .tech-ticker-price{
            font-size:11.5px;
          }
          .tech-ticker-change{
            font-size:9px;
          }
        }

        .tech-news-header{
          position:relative;
          overflow:hidden;
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:22px;
          align-items:center;
          border:1px solid rgba(125,211,252,.20);
          border-radius:28px;
          padding:24px;
          background:
            radial-gradient(circle at 16% 18%, rgba(36,213,197,.26), transparent 32%),
            linear-gradient(135deg,#071A31 0%,#0B2A47 58%,#0E5666 100%);
          box-shadow:var(--tech-shadow);
          color:#F8FEFF;
        }

        .tech-news-header:after{
          content:"";
          position:absolute;
          inset:auto -10% -42% 30%;
          height:160px;
          background:radial-gradient(circle, rgba(125,211,252,.24), transparent 62%);
          pointer-events:none;
        }

        .tech-news-title-row{position:relative;z-index:1;display:flex;align-items:center;gap:16px;min-width:0}
        .tech-news-title-icon{
          width:58px;
          height:58px;
          flex:0 0 auto;
          display:grid;
          place-items:center;
          border-radius:20px;
          background:rgba(255,255,255,.10);
          border:1px solid rgba(255,255,255,.20);
          color:#7DF9E7;
        }
        .tech-news-title-copy{display:grid;gap:7px;min-width:0}
        .tech-news-eyebrow{
          width:max-content;
          max-width:100%;
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-height:30px;
          padding:0 12px;
          border-radius:999px;
          background:rgba(36,213,197,.14);
          border:1px solid rgba(125,249,231,.25);
          color:#A7FFF2;
          font-size:12px;
          font-weight:950;
        }
        .tech-news-header h1{margin:0;font-size:clamp(30px,3.6vw,48px);font-weight:950;line-height:1.08;letter-spacing:0;color:#FFFFFF}
        .tech-news-header p{margin:0;max-width:760px;color:#D8F3FF;font-size:15px;font-weight:800;line-height:1.75}
        .tech-news-header small{color:#9BD7E8;font-size:12px;font-weight:850;line-height:1.6}
        .tech-news-header-actions{position:relative;z-index:1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end}
        .tech-news-header-stat{
          min-width:98px;
          min-height:72px;
          display:grid;
          place-items:center;
          border-radius:20px;
          background:rgba(255,255,255,.10);
          border:1px solid rgba(255,255,255,.18);
        }
        .tech-news-header-stat span{font-size:26px;font-weight:950;color:#FFFFFF}
        .tech-news-header-stat b{font-size:11px;font-weight:950;color:#BFEFFF}
        .tech-news-header-meta{display:grid;gap:8px}
        .tech-news-header-meta span{
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-height:34px;
          padding:0 12px;
          border-radius:999px;
          background:rgba(255,255,255,.10);
          color:#EAFBFF;
          border:1px solid rgba(255,255,255,.16);
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
        }
        .tech-news-refresh-btn{
          width:46px;
          height:46px;
          border:1px solid rgba(125,249,231,.32);
          border-radius:16px;
          background:rgba(36,213,197,.18);
          color:#FFFFFF;
          display:grid;
          place-items:center;
          cursor:pointer;
          transition:transform .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .tech-news-refresh-btn:hover,.tech-news-refresh-btn:focus-visible{
          outline:none;
          transform:translateY(-1px);
          background:rgba(36,213,197,.28);
          box-shadow:0 0 0 4px rgba(36,213,197,.16);
        }
        .tech-news-refresh-btn:disabled{opacity:.68;cursor:not-allowed}
        .spinning{animation:techSpin 1s linear infinite}
        @keyframes techSpin{to{transform:rotate(360deg)}}

        .tech-news-controls{
          display:grid;
          gap:14px;
          padding:16px;
          border:1px solid var(--tech-border);
          border-radius:24px;
          background:rgba(255,255,255,.82);
          box-shadow:0 16px 40px rgba(12,38,66,.08);
          backdrop-filter:blur(12px);
        }
        .tech-news-controls-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .tech-news-controls-head > div{display:grid;gap:4px}
        .tech-news-controls-head span{display:inline-flex;align-items:center;gap:7px;color:var(--tech-muted);font-size:12px;font-weight:950}
        .tech-news-controls-head strong{color:var(--tech-text);font-size:18px;font-weight:950}
        .tech-news-clear-btn{
          min-height:40px;
          border:1px solid var(--tech-border);
          border-radius:999px;
          background:var(--tech-panel);
          color:var(--tech-text);
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:0 13px;
          font:900 12px Tajawal,Arial,sans-serif;
          cursor:pointer;
        }
        .tech-news-clear-btn:hover,.tech-news-clear-btn:focus-visible{outline:none;border-color:var(--tech-accent);box-shadow:0 0 0 4px rgba(36,213,197,.14)}

        .tech-news-filter-grid{display:grid;grid-template-columns:minmax(230px,1.45fr) repeat(6,minmax(112px,1fr));gap:10px;align-items:end}
        .tech-news-search{
          min-height:50px;
          display:flex;
          align-items:center;
          gap:10px;
          border:1px solid var(--tech-border);
          border-radius:17px;
          background:var(--tech-panel-soft);
          padding-inline:14px;
          min-width:0;
        }
        .tech-news-search svg{color:var(--tech-muted);flex:0 0 auto}
        .tech-news-search input{
          width:100%;
          min-width:0;
          border:0;
          outline:0;
          background:transparent;
          color:var(--tech-text);
          font:850 14px Tajawal,Arial,sans-serif;
        }
        .tech-news-search:focus-within{border-color:var(--tech-accent);box-shadow:0 0 0 4px rgba(36,213,197,.12)}
        .tech-news-select-control{display:grid;gap:6px;min-width:0}
        .tech-news-select-control span{color:var(--tech-muted);font-size:11px;font-weight:950}
        .tech-news-select-control select{
          width:100%;
          height:50px;
          border:1px solid var(--tech-border);
          border-radius:17px;
          background:var(--tech-panel-soft);
          color:var(--tech-text);
          padding-inline:12px;
          font:900 13px Tajawal,Arial,sans-serif;
          outline:none;
          text-overflow:ellipsis;
        }
        .tech-news-select-control select:focus{border-color:var(--tech-accent);box-shadow:0 0 0 4px rgba(36,213,197,.12)}
        .tech-news-active-filters{display:flex;flex-wrap:wrap;gap:8px}
        .tech-news-active-filters button{
          display:inline-flex;
          align-items:center;
          gap:7px;
          max-width:100%;
          min-height:34px;
          border:1px solid rgba(21,149,242,.18);
          border-radius:999px;
          background:#E0F2FE;
          color:#075985;
          padding:0 10px;
          font:900 11.5px Tajawal,Arial,sans-serif;
          cursor:pointer;
        }
        .tech-news-active-filters button span{color:#0369A1}
        .tech-news-active-filters button b{min-width:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:950}
        .tech-news-active-filters button:hover,.tech-news-active-filters button:focus-visible{outline:none;border-color:var(--tech-primary);box-shadow:0 0 0 4px rgba(21,149,242,.12)}
        .tech-news-chip-row{display:flex;flex-wrap:wrap;gap:9px;overflow:visible;padding-bottom:2px;scrollbar-width:thin}
        .tech-news-chip-row button{
          flex:0 0 auto;
          min-height:42px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          border:1px solid var(--tech-border);
          border-radius:999px;
          background:var(--tech-panel);
          color:var(--tech-text);
          padding:0 14px;
          font:900 12.5px Tajawal,Arial,sans-serif;
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .tech-news-chip-row button b{
          min-width:24px;
          height:24px;
          border-radius:999px;
          display:grid;
          place-items:center;
          background:rgba(21,149,242,.10);
          color:var(--tech-primary);
          font-size:11px;
        }
        .tech-news-chip-row button.active{
          background:linear-gradient(135deg,var(--tech-primary),var(--tech-accent));
          border-color:transparent;
          color:#061A2E;
          box-shadow:0 12px 30px rgba(21,149,242,.18);
        }
        .tech-news-chip-row button.active b{background:rgba(255,255,255,.32);color:#061A2E}
        .tech-news-chip-row button:hover,.tech-news-chip-row button:focus-visible{outline:none;transform:translateY(-1px);border-color:var(--tech-accent)}

        .tech-news-featured{display:grid;gap:14px}
        .tech-news-featured-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .tech-news-featured-head h2{margin:0;color:var(--tech-text);font-size:21px;font-weight:950}
        .tech-news-featured-head span{display:inline-flex;align-items:center;gap:7px;color:var(--tech-accent);font-size:12px;font-weight:950}
        .tech-news-featured-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.85fr);gap:16px;align-items:stretch}
        .tech-news-featured-side{display:grid;gap:12px;min-width:0}
        .tech-news-evidence-card{display:grid;gap:8px;min-width:0;align-content:start}
        .tech-news-featured-grid>.tech-news-evidence-card:first-child,.tech-news-evidence-card>.tech-news-card.featured{height:100%}
        .tech-news-evidence{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border:1px solid var(--tech-border);border-radius:14px;background:var(--tech-panel-soft);color:var(--tech-muted);font-size:12px;line-height:1.45}
        .tech-news-evidence>svg{margin-top:2px;flex:none;color:#167D91}
        .tech-news-evidence>div{display:grid;gap:2px;min-width:0}
        .tech-news-evidence strong{color:var(--tech-text);font-weight:900}
        .tech-news-evidence span{font-weight:700}
        .tech-news-evidence.official{border-color:rgba(21,149,242,.28);background:rgba(21,149,242,.07)}
        .tech-news-evidence.conflicting{border-color:rgba(217,119,6,.32);background:rgba(245,158,11,.09);color:#92400E}
        .dark .tech-news-evidence.conflicting{color:#FDE68A}
        .tech-news-coverage-notice{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border:1px solid rgba(217,119,6,.3);border-radius:16px;background:rgba(245,158,11,.09);color:#92400E;font-size:13px;font-weight:800;line-height:1.55}
        .tech-news-coverage-notice svg{margin-top:2px;flex:none}
        .dark .tech-news-coverage-notice{color:#FDE68A}
        .tech-news-card.featured{min-height:100%;grid-template-rows:minmax(170px,240px) auto auto}
        .tech-news-card.compact{padding:0}
        .tech-news-card-media{
          position:relative;
          min-height:210px;
          border-radius:20px;
          background:
            radial-gradient(circle at 22% 18%, rgba(36,213,197,.34), transparent 32%),
            linear-gradient(135deg,#071A31,#0B5570);
          background-size:cover;
          background-position:center;
          overflow:hidden;
        }
        .tech-news-card-media span{
          position:absolute;
          inset-inline-start:16px;
          inset-block-start:16px;
          min-height:34px;
          display:inline-flex;
          align-items:center;
          padding:0 12px;
          border-radius:999px;
          background:rgba(4,22,42,.72);
          color:#A7FFF2;
          font-size:13px;
          font-weight:950;
          border:1px solid rgba(125,249,231,.24);
        }

        .tech-news-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px;align-items:start}
        .tech-news-content-column{display:grid;gap:14px;min-width:0}
        .tech-news-results-bar{
          min-height:62px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:14px;
          border:1px solid var(--tech-border);
          background:rgba(255,255,255,.82);
          border-radius:22px;
          padding:12px 14px;
          box-shadow:0 12px 30px rgba(12,38,66,.06);
        }
        .tech-news-results-bar > div:first-child{display:grid;gap:3px}
        .tech-news-results-bar span{color:var(--tech-muted);font-size:12px;font-weight:950}
        .tech-news-results-bar b{color:var(--tech-text);font-size:17px;font-weight:950}
        .tech-news-view-toggle{display:inline-flex;gap:6px;padding:5px;border:1px solid var(--tech-border);background:var(--tech-panel-soft);border-radius:16px}
        .tech-news-view-toggle button{
          min-height:38px;
          display:inline-flex;
          align-items:center;
          gap:7px;
          border:0;
          border-radius:12px;
          background:transparent;
          color:var(--tech-muted);
          padding:0 11px;
          font:900 12px Tajawal,Arial,sans-serif;
          cursor:pointer;
        }
        .tech-news-view-toggle button.active{background:var(--tech-panel);color:var(--tech-primary);box-shadow:0 8px 18px rgba(12,38,66,.08)}
        .tech-news-view-toggle button:focus-visible{outline:2px solid var(--tech-accent);outline-offset:2px}

        .tech-news-feed{display:grid;gap:14px}
        .tech-news-feed.grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .tech-news-feed.list{grid-template-columns:1fr}

        .tech-news-card{
          display:grid;
          grid-template-rows:auto 1fr auto;
          gap:14px;
          min-width:0;
          min-height:100%;
          border:1px solid var(--tech-border);
          border-radius:24px;
          background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));
          padding:16px;
          box-shadow:0 16px 36px rgba(12,38,66,.08);
          color:var(--tech-text);
          overflow:hidden;
        }
        .tech-news-card.list{grid-template-columns:minmax(0,1fr);padding:18px}
        .tech-news-card:hover{border-color:rgba(36,213,197,.38);box-shadow:0 20px 46px rgba(12,38,66,.12)}
        .tech-news-card-body{display:grid;gap:12px;align-content:start;min-width:0}
        .tech-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
        .tech-news-card-kicker{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
        .tech-news-source-badge{
          display:inline-flex;
          align-items:center;
          max-width:180px;
          min-height:30px;
          padding:0 10px;
          border-radius:999px;
          background:#D1FAE5;
          color:#065F46;
          border:1px solid #A7F3D0;
          font-size:11.5px;
          font-weight:950;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .tech-news-date-meta{
          display:inline-flex;
          align-items:center;
          gap:5px;
          color:var(--tech-muted);
          font-size:11.5px;
          font-weight:850;
        }
        .tech-news-symbol-chip{
          min-height:32px;
          display:inline-flex;
          align-items:center;
          border-radius:999px;
          background:#E0F2FE;
          color:#075985;
          border:1px solid #BAE6FD;
          padding:0 10px;
          font-size:12px;
          font-weight:950;
          white-space:nowrap;
        }
        .tech-news-title-stack{display:grid;gap:8px;min-width:0}
        .tech-news-title-stack h2,.tech-news-card h2{
          margin:0;
          color:var(--tech-text);
          font-size:clamp(17px,1.4vw,20px);
          font-weight:950;
          line-height:1.48;
          letter-spacing:0;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .tech-news-card.featured h2{font-size:clamp(21px,2.2vw,28px);-webkit-line-clamp:3}
        .tech-news-card p{
          margin:0;
          color:var(--tech-muted);
          font-size:14px;
          font-weight:780;
          line-height:1.72;
          display:-webkit-box;
          -webkit-line-clamp:3;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .tech-news-card:not(.featured) p{-webkit-line-clamp:2}
        .tech-news-translation-toggle,.tech-news-translation-badge{
          width:max-content;
          max-width:100%;
          min-height:30px;
          display:inline-flex;
          align-items:center;
          gap:6px;
          border:1px solid var(--tech-border);
          border-radius:999px;
          background:var(--tech-panel-soft);
          color:var(--tech-muted);
          padding:0 10px;
          font:900 11.5px Tajawal,Arial,sans-serif;
        }
        .tech-news-translation-toggle{cursor:pointer}
        .tech-news-translation-toggle:hover,.tech-news-translation-toggle:focus-visible{outline:none;border-color:var(--tech-accent);color:var(--tech-primary)}
        .tech-news-translation-badge.translated{border-color:#BAE6FD;background:#E0F2FE;color:#075985}
        .tech-news-context-row{display:flex;flex-wrap:wrap;gap:7px}
        .tech-news-context-row span{
          display:inline-flex;
          align-items:center;
          min-height:28px;
          padding:0 9px;
          border:1px solid var(--tech-border);
          background:rgba(142,166,195,.08);
          color:var(--tech-muted);
          border-radius:999px;
          font-size:11.5px;
          font-weight:850;
        }
        .tech-news-stock-context{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          border:1px solid var(--tech-border);
          background:var(--tech-panel-soft);
          border-radius:18px;
          padding:12px;
          min-width:0;
        }
        .tech-news-stock-context > div:first-child{display:grid;gap:3px;min-width:0}
        .tech-news-stock-context small{color:var(--tech-muted);font-size:11px;font-weight:900}
        .tech-news-stock-context strong{color:var(--tech-text);font-size:15px;font-weight:950;letter-spacing:.02em}
        .tech-news-price-stack{display:grid;justify-items:end;gap:5px;min-width:0}
        .tech-news-price-stack b{color:var(--tech-text);font-size:14px;font-weight:950;white-space:nowrap}
        .tech-news-price-stack.unavailable b{color:var(--tech-muted);font-size:12px;white-space:normal;text-align:end}
        .tech-news-change{
          display:inline-flex;
          align-items:center;
          gap:5px;
          border-radius:999px;
          padding:5px 8px;
          font-size:11.5px;
          font-weight:950;
        }
        .tech-news-change.up{background:#DCFCE7;color:#166534}
        .tech-news-change.down{background:#FEE2E2;color:#991B1B}
        .tech-news-change.neutral{background:#E2E8F0;color:#334155}
        .tech-news-card-footer{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          border-top:1px solid var(--tech-border);
          padding-top:13px;
          min-width:0;
        }
        .tech-news-quote-note{color:var(--tech-muted);font-size:11.5px;font-weight:850}
        .tech-news-read-link{
          min-height:42px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          border:1px solid transparent;
          border-radius:999px;
          background:linear-gradient(135deg,var(--tech-primary),var(--tech-accent));
          color:#061A2E;
          padding:0 15px;
          font-size:12.5px;
          font-weight:950;
          text-decoration:none;
          white-space:nowrap;
          box-shadow:0 14px 30px rgba(21,149,242,.18);
        }
        .tech-news-read-link:hover,.tech-news-read-link:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(36,213,197,.14),0 16px 36px rgba(21,149,242,.22)}
        .tech-news-read-link.disabled{background:var(--tech-panel-soft);border-color:var(--tech-border);color:var(--tech-muted);box-shadow:none}

        .tech-news-side-panel{position:sticky;top:24px;display:grid;gap:14px;min-width:0}
        .tech-side-card{
          display:grid;
          gap:12px;
          border:1px solid var(--tech-border);
          background:rgba(255,255,255,.84);
          border-radius:22px;
          padding:15px;
          box-shadow:0 16px 38px rgba(12,38,66,.08);
          min-width:0;
        }
        .tech-side-card h3{margin:0;display:flex;align-items:center;gap:8px;color:var(--tech-text);font-size:15px;font-weight:950}
        .tech-side-card h3 svg{color:var(--tech-accent)}
        .tech-side-list{display:grid;gap:9px}
        .tech-side-list a,.tech-side-news-item{
          display:grid;
          gap:5px;
          text-decoration:none;
          color:inherit;
          border:1px solid var(--tech-border);
          background:var(--tech-panel-soft);
          border-radius:16px;
          padding:10px;
        }
        .tech-side-list a:hover,.tech-side-list a:focus-visible{outline:none;border-color:var(--tech-accent);background:rgba(36,213,197,.08)}
        .tech-side-list strong{
          color:var(--tech-text);
          font-size:12.5px;
          font-weight:950;
          line-height:1.55;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .tech-side-list small{display:inline-flex;align-items:center;gap:5px;color:var(--tech-muted);font-size:11px;font-weight:850}
        .tech-side-source{
          width:max-content;
          max-width:100%;
          border:1px solid #A7F3D0;
          background:#D1FAE5;
          color:#065F46;
          border-radius:999px;
          padding:4px 8px;
          font-size:10.5px;
          font-weight:950;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .tech-side-ranked-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
        .tech-side-ranked-list li{
          display:grid;
          grid-template-columns:auto minmax(0,1fr) auto;
          align-items:center;
          gap:9px;
          border:1px solid var(--tech-border);
          background:var(--tech-panel-soft);
          border-radius:16px;
          padding:10px;
        }
        .tech-side-rank{
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:linear-gradient(135deg,#E0F2FE,#CCFBF1);
          color:#155E75;
          font-size:12px;
          font-weight:950;
        }
        .tech-side-ranked-list div{display:grid;gap:2px;min-width:0}
        .tech-side-ranked-list b{color:var(--tech-text);font-size:14px;font-weight:950}
        .tech-side-ranked-list small{color:var(--tech-muted);font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tech-side-ranked-list em{
          font-style:normal;
          border:1px solid #A7F3D0;
          background:#D1FAE5;
          color:#065F46;
          border-radius:999px;
          padding:6px 8px;
          font-size:11px;
          font-weight:950;
          white-space:nowrap;
        }
        .tech-side-source-list{display:grid;gap:8px}
        .tech-side-source-list span{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          min-width:0;
          border:1px solid var(--tech-border);
          background:var(--tech-panel-soft);
          border-radius:15px;
          padding:10px;
        }
        .tech-side-source-list b{min-width:0;color:var(--tech-text);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .tech-side-source-list small{color:var(--tech-muted);font-size:11px;font-weight:900;white-space:nowrap}
        .tech-source-note{display:grid;gap:7px;color:var(--tech-muted);font-size:12px;font-weight:820;line-height:1.65}

        .tech-news-load-more-wrap{display:grid;place-items:center;min-height:48px;margin-top:2px}
        .tech-news-load-more-wrap span{color:var(--tech-muted);font-size:12px;font-weight:900}
        .tech-news-load-more{
          min-height:46px;
          border:0;
          border-radius:999px;
          background:linear-gradient(135deg,var(--tech-primary),var(--tech-accent));
          color:#061A2E;
          padding:0 22px;
          font:950 13px Tajawal,Arial,sans-serif;
          cursor:pointer;
          box-shadow:0 14px 32px rgba(21,149,242,.18);
        }
        .tech-news-load-more:hover,.tech-news-load-more:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(36,213,197,.14),0 16px 38px rgba(21,149,242,.24)}

        .tech-news-state{
          display:grid;
          place-items:center;
          gap:10px;
          text-align:center;
          padding:56px 20px;
          color:var(--tech-muted);
          background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));
          border:1px dashed var(--tech-border-strong);
          border-radius:24px;
        }
        .tech-news-state svg{color:var(--tech-accent)}
        .tech-news-state strong{display:block;color:var(--tech-text);font-size:20px;font-weight:950}
        .tech-news-state p{margin:0;max-width:640px;color:var(--tech-muted);font-weight:850;line-height:1.75}
        .tech-news-state button{
          border:0;
          border-radius:14px;
          background:var(--tech-accent);
          color:#061A2E;
          display:inline-flex;
          align-items:center;
          gap:8px;
          min-height:42px;
          padding:0 14px;
          font:950 12px Tajawal,Arial,sans-serif;
          cursor:pointer;
        }
        .tech-news-disclaimer{text-align:center;color:var(--tech-muted);font-size:12px;font-weight:820;line-height:1.7;margin:0}

        .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small{
          display:block;
          border-radius:999px;
          background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(36,213,197,.20),rgba(142,166,195,.10));
          background-size:220% 100%;
          animation:techNewsShimmer 1.2s linear infinite;
        }
        .tech-news-skeleton span{width:42%;height:18px}
        .tech-news-skeleton i{width:100%;height:15px}
        .tech-news-skeleton i:nth-child(3){width:76%}
        .tech-news-skeleton i:nth-child(4){width:64%}
        .tech-news-skeleton b{width:58%;height:38px;border-radius:14px}
        .tech-news-skeleton small{width:35%;height:14px}
        @keyframes techNewsShimmer{to{background-position:-220% 0}}

        @media(max-width:1280px){
          .tech-news-filter-grid{grid-template-columns:1fr 1fr 1fr}
          .tech-news-search{grid-column:1/-1}
          .tech-news-layout{grid-template-columns:1fr}
          .tech-news-side-panel{position:static;grid-template-columns:repeat(3,minmax(0,1fr))}
        }
        @media(max-width:1024px){
          [dir="rtl"].tech-news-shell .tech-news-main,
          [dir="ltr"].tech-news-shell .tech-news-main,
          [dir].tech-news-shell .tech-news-main{
            width:calc(100% - 28px);
            max-width:calc(100% - 28px);
            margin-inline-start:auto;
            margin-inline-end:auto;
            padding:92px 0 34px;
          }
          .tech-news-featured-grid{grid-template-columns:1fr}
          .tech-news-featured-side{grid-template-columns:repeat(2,minmax(0,1fr))}
          .tech-news-side-panel{grid-template-columns:1fr}
        }
        @media(max-width:760px){
          [dir].tech-news-shell .tech-news-main{padding-inline:14px;gap:16px}
          .tech-news-header{grid-template-columns:1fr;padding:18px;border-radius:24px}
          .tech-news-title-row{align-items:flex-start}
          .tech-news-title-icon{width:48px;height:48px;border-radius:16px}
          .tech-news-header h1{font-size:28px}
          .tech-news-header-actions{justify-content:flex-start}
          .tech-news-header-meta{width:100%}
          .tech-news-header-meta span{width:100%;white-space:normal}
          .tech-news-filter-grid{grid-template-columns:1fr}
          .tech-news-chip-row{margin-inline:-2px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:8px}
          .tech-news-chip-row::-webkit-scrollbar{display:none}
          .tech-news-featured-side{grid-template-columns:1fr}
          .tech-news-feed.grid{grid-template-columns:1fr}
          .tech-news-results-bar{display:grid}
          .tech-news-view-toggle{width:100%;justify-content:stretch}
          .tech-news-view-toggle button{flex:1;justify-content:center}
          .tech-news-card-footer{display:grid}
          .tech-news-read-link{width:100%}
          .tech-news-stock-context{display:grid}
          .tech-news-price-stack{justify-items:start}
          .tech-ticker-strip{gap:6px;padding:7px;border-radius:16px}
          .tech-ticker-viewport{min-height:46px;overflow:hidden}
          .tech-ticker-track{gap:7px;animation-duration:48s}
          .tech-ticker-set{gap:7px}
          .tech-ticker-item{inline-size:148px;min-height:46px;padding:6px 9px;border-radius:13px}
          .tech-ticker-delay-badge{min-height:26px;padding:0 9px;font-size:10.5px}
        }
        @media(prefers-reduced-motion:reduce){
          .tech-ticker-track{animation:none}
          .tech-news-card,.tech-news-chip-row button,.tech-news-refresh-btn{transition:none}
          .spinning{animation:none}
        }
      `}</style>
    </NewsPageShell>
  );
}

function FeaturedNewsSection({
  items,
  labels,
  cardLabels,
  evidenceLabels,
  formatDateTime,
  formatPrice,
}: {
  items: TechNewsItem[];
  labels: { title: string; lead: string; openArticle: string; readMore: string; linkUnavailable: string };
  cardLabels: Parameters<typeof TechNewsCard>[0]['labels'];
  evidenceLabels: EvidenceLabels;
  formatDateTime: (value: string) => string;
  formatPrice: (value: number | null) => string;
}) {
  const [lead, ...secondaryItems] = items;
  if (!lead) return null;

  return (
    <section className="tech-news-featured" aria-label={labels.title}>
      <div className="tech-news-featured-head">
        <h2>{labels.title}</h2>
        <span>
          <Sparkles size={16} />
          {labels.lead}
        </span>
      </div>
      <div className="tech-news-featured-grid">
        <div className="tech-news-evidence-card">
          <TechNewsCard
            item={lead}
            variant="featured"
            labels={cardLabels}
            formatDateTime={formatDateTime}
            formatPrice={formatPrice}
          />
          <TechNewsEvidence item={lead} labels={evidenceLabels} />
        </div>
        <div className="tech-news-featured-side">
          {secondaryItems.map(item => (
            <div className="tech-news-evidence-card" key={item.id}>
              <TechNewsCard
                item={item}
                variant="standard"
                labels={cardLabels}
                formatDateTime={formatDateTime}
                formatPrice={formatPrice}
              />
              <TechNewsEvidence item={item} labels={evidenceLabels} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechNewsSidePanel({
  latestItems,
  mentionedTickers,
  sourceCounts,
  labels,
  formatDateTime,
}: {
  latestItems: TechNewsItem[];
  mentionedTickers: MentionedTicker[];
  sourceCounts: Array<[string, number]>;
  labels: {
    latest: string;
    mentioned: string;
    sources: string;
    articles: string;
    mentions: string;
    source: string;
    sourceTransparency: string;
    sourceTransparencyText: string;
  };
  formatDateTime: (value: string) => string;
}) {
  return (
    <aside className="tech-news-side-panel">
      <section className="tech-side-card">
        <h3><Newspaper size={16} />{labels.latest}</h3>
        <div className="tech-side-list">
          {latestItems.map(item => {
            const itemTitle = item.title || item.headline;
            const content = (
              <>
                <span className="tech-side-source">{item.source || labels.source}</span>
                <strong>{itemTitle}</strong>
                <small><Clock3 size={12} />{formatDateTime(item.publishedAt)}</small>
              </>
            );
            return item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" key={`latest-${item.id}`} aria-label={`${labels.latest}: ${itemTitle}`}>
                {content}
              </a>
            ) : (
              <span className="tech-side-news-item unavailable" key={`latest-${item.id}`}>
                {content}
              </span>
            );
          })}
        </div>
      </section>

      {mentionedTickers.length > 0 ? (
        <section className="tech-side-card">
          <h3><TrendingUp size={16} />{labels.mentioned}</h3>
          <ol className="tech-side-ranked-list">
            {mentionedTickers.map((item, index) => (
              <li key={item.ticker}>
                <span className="tech-side-rank">{index + 1}</span>
                <div>
                  <b dir="ltr">{item.ticker}</b>
                  <small>{item.companyName}</small>
                </div>
                <em>{item.count} {labels.mentions}</em>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {sourceCounts.length > 0 ? (
        <section className="tech-side-card">
          <h3><BarChart3 size={16} />{labels.sources}</h3>
          <div className="tech-side-source-list">
            {sourceCounts.map(([source, count]) => (
              <span key={source}>
                <b>{source}</b>
                <small>{count} {labels.articles}</small>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="tech-side-card tech-source-note">
        <h3><ShieldCheck size={16} />{labels.sourceTransparency}</h3>
        <p>{labels.sourceTransparencyText}</p>
        <span>
          <ExternalLink size={13} />
          {labels.source}
        </span>
      </section>
    </aside>
  );
}

export default TechNewsPage;
