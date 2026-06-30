'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Coins,
  ExternalLink,
  Filter,
  Info,
  Layers3,
  LineChart,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Signal,
  Sparkles,
  Tags,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { CryptoNewsCategory, CryptoNewsItem, CryptoNewsPayload, CryptoNewsSymbol } from '@/lib/market/fetchCryptoNews';
import type { CryptoMarketCoin, CryptoMarketPayload } from '@/lib/market/fetchCryptoMarketData';

type LangCode = 'ar' | 'en' | 'fr';
type ApiResponse = CryptoNewsPayload | { success: false; error?: string; code?: string };
type CryptoMarketApiResponse = CryptoMarketPayload | { ok: false; code?: string; message?: string };
type CategoryFilter = 'all' | CryptoNewsCategory;
type AssetFilter = 'all' | CryptoNewsSymbol;
type TimeFilter = 'all' | 'hour' | 'day' | 'week' | 'month';
type SortFilter = 'latest' | 'oldest' | 'relevance';

const NEWS_PAGE_SIZE = 12;
const FEATURED_NEWS_COUNT = 4;
const REFRESH_INTERVAL_MS = 90_000;
const CATEGORY_ORDER: CategoryFilter[] = ['all', 'bitcoin', 'ethereum', 'altcoins', 'etfs', 'regulation', 'exchanges', 'blockchain'];
const ASSET_ORDER: AssetFilter[] = ['all', 'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE'];
const TIME_FILTERS: TimeFilter[] = ['all', 'hour', 'day', 'week', 'month'];
const SORT_FILTERS: SortFilter[] = ['latest', 'oldest', 'relevance'];

const SYMBOL_TO_MARKET_SYMBOL: Record<CryptoNewsSymbol, string> = {
  BTC: 'BTCUSD',
  ETH: 'ETHUSD',
  SOL: 'SOLUSD',
  XRP: 'XRPUSD',
  BNB: 'BNBUSD',
  DOGE: 'DOGEUSD',
};

const COPY = {
  ar: {
    title: 'أخبار العملات الرقمية',
    subtitle: 'تغطية مستمرة لأهم أخبار العملات الرقمية والأسواق والتشريعات والتقنيات المرتبطة بها.',
    badge: 'مركز أخبار كريبتو',
    connected: 'الخدمة متصلة',
    delayed: 'بيانات سوق متأخرة',
    unavailable: 'غير متاح',
    refresh: 'تحديث الأخبار',
    refreshing: 'جارٍ التحديث...',
    newStories: 'خبراً جديداً',
    lastUpdate: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    sourceNote: 'الأخبار مجمعة من مصادر مالية خارجية، ويُنصح بالرجوع إلى المصدر الأصلي قبل اتخاذ أي قرار.',
    marketSnapshot: 'لمحة سوق العملات الرقمية',
    snapshotHint: 'ملخص حقيقي من مزود السوق المتاح، بدون قيم افتراضية.',
    totalMarketCap: 'القيمة السوقية الإجمالية',
    volume24h: 'حجم التداول 24 ساعة',
    btcDominance: 'هيمنة Bitcoin',
    marketChange: 'تغير السوق 24 ساعة',
    risingCoins: 'عملات صاعدة',
    fallingCoins: 'عملات هابطة',
    featured: 'قصص بارزة',
    featuredHint: 'أحدث الأخبار بعد إزالة التكرار، ولا تتكرر داخل القائمة الرئيسية.',
    read: 'قراءة الخبر',
    source: 'المصدر',
    originalSource: 'فتح المصدر الأصلي',
    machineTranslated: 'ترجمة آلية',
    originalText: 'نص أصلي',
    aiBadge: 'تحليل آلي',
    categories: {
      all: 'الكل',
      bitcoin: 'Bitcoin',
      ethereum: 'Ethereum',
      altcoins: 'Altcoins',
      etfs: 'صناديق ETF',
      regulation: 'التنظيمات',
      exchanges: 'البورصات',
      blockchain: 'البلوك تشين',
    },
    marketMovers: 'محركات سوق العملات الرقمية',
    gainers: 'أكبر العملات ارتفاعاً',
    losers: 'أكبر العملات انخفاضاً',
    mostTraded: 'الأعلى تداولاً',
    trending: 'العملات الرائجة',
    price: 'السعر',
    volume: 'الحجم',
    change24h: 'تغير 24 ساعة',
    openAnalysis: 'فتح تحليل الأصل',
    filters: 'البحث والتصفية',
    searchPlaceholder: 'ابحث عن خبر أو عملة أو مصدر...',
    asset: 'العملة',
    category: 'التصنيف',
    sourceFilter: 'المصدر',
    timeRange: 'الفترة',
    sort: 'الترتيب',
    allAssets: 'كل العملات',
    allSources: 'كل المصادر',
    timeAll: 'كل الفترات',
    timeHour: 'آخر ساعة',
    timeDay: 'آخر 24 ساعة',
    timeWeek: 'آخر 7 أيام',
    timeMonth: 'آخر 30 يوماً',
    sortLatest: 'الأحدث',
    sortOldest: 'الأقدم',
    sortRelevant: 'الأكثر ارتباطاً',
    clearFilters: 'مسح عوامل التصفية',
    results: 'نتائج الأخبار',
    resultCount: 'خبر مطابق',
    showing: 'المعروض',
    activeFilters: 'الفلاتر النشطة',
    mainFeed: 'تدفق الأخبار',
    compactFeed: 'تحديثات مختصرة',
    latestUpdates: 'آخر الأخبار غير المعروضة',
    mentionedAssets: 'العملات الأكثر ذكراً',
    sources: 'أبرز المصادر',
    articles: 'أخبار',
    mentions: 'ذكر',
    loadMore: 'عرض المزيد من الأخبار',
    allLoaded: 'تم عرض كل الأخبار المتاحة',
    noResultsTitle: 'لم يتم العثور على أخبار',
    noResultsBody: 'جرّب تغيير كلمات البحث أو إزالة بعض عوامل التصفية.',
    noProviderTitle: 'الأخبار غير متاحة حالياً',
    noProviderBody: 'تعذر جلب أحدث الأخبار. يرجى المحاولة مرة أخرى.',
    marketError: 'تعذر تحديث بيانات السوق حالياً. يتم عرض آخر بيانات متاحة عند توفرها.',
    newsError: 'تعذر تحميل أخبار العملات الرقمية حالياً. حاول مرة أخرى لاحقاً.',
    loading: 'جارٍ تحميل مركز أخبار العملات الرقمية...',
    disclaimer: 'الأخبار والملخصات والتحليلات المعروضة لأغراض معلوماتية وتعليمية فقط، ولا تُعد نصيحة استثمارية. قد تتضمن بعض التصنيفات والملخصات نتائج مولدة آلياً.',
  },
  en: {
    title: 'Crypto News',
    subtitle: 'Continuous coverage of cryptocurrency markets, regulation, exchanges, and blockchain technology.',
    badge: 'Crypto newsroom',
    connected: 'Service connected',
    delayed: 'Delayed market data',
    unavailable: 'Unavailable',
    refresh: 'Refresh news',
    refreshing: 'Refreshing...',
    newStories: 'new stories',
    lastUpdate: 'Last update',
    notUpdated: 'Not updated yet',
    sourceNote: 'News is aggregated from external financial sources. Check the original source before acting.',
    marketSnapshot: 'Crypto market snapshot',
    snapshotHint: 'A real provider summary with no placeholder values.',
    totalMarketCap: 'Total market cap',
    volume24h: '24h volume',
    btcDominance: 'Bitcoin dominance',
    marketChange: '24h market move',
    risingCoins: 'Rising coins',
    fallingCoins: 'Falling coins',
    featured: 'Featured stories',
    featuredHint: 'Latest deduplicated stories; featured items are removed from the main feed.',
    read: 'Read article',
    source: 'Source',
    originalSource: 'Open original source',
    machineTranslated: 'Machine translation',
    originalText: 'Original text',
    aiBadge: 'AI analysis',
    categories: {
      all: 'All',
      bitcoin: 'Bitcoin',
      ethereum: 'Ethereum',
      altcoins: 'Altcoins',
      etfs: 'ETFs',
      regulation: 'Regulation',
      exchanges: 'Exchanges',
      blockchain: 'Blockchain',
    },
    marketMovers: 'Crypto market movers',
    gainers: 'Top gainers',
    losers: 'Top losers',
    mostTraded: 'Highest volume',
    trending: 'Trending coins',
    price: 'Price',
    volume: 'Volume',
    change24h: '24h change',
    openAnalysis: 'Open asset analysis',
    filters: 'Search and filters',
    searchPlaceholder: 'Search news, asset, or source...',
    asset: 'Asset',
    category: 'Category',
    sourceFilter: 'Source',
    timeRange: 'Time range',
    sort: 'Sort',
    allAssets: 'All assets',
    allSources: 'All sources',
    timeAll: 'All time',
    timeHour: 'Last hour',
    timeDay: 'Last 24 hours',
    timeWeek: 'Last 7 days',
    timeMonth: 'Last 30 days',
    sortLatest: 'Latest',
    sortOldest: 'Oldest',
    sortRelevant: 'Most relevant',
    clearFilters: 'Clear filters',
    results: 'News results',
    resultCount: 'matching stories',
    showing: 'Showing',
    activeFilters: 'Active filters',
    mainFeed: 'News feed',
    compactFeed: 'Compact updates',
    latestUpdates: 'Latest unshown stories',
    mentionedAssets: 'Most-mentioned assets',
    sources: 'Top sources',
    articles: 'articles',
    mentions: 'mentions',
    loadMore: 'Load more news',
    allLoaded: 'All available news is visible',
    noResultsTitle: 'No news found',
    noResultsBody: 'Try changing your search terms or removing filters.',
    noProviderTitle: 'News is unavailable',
    noProviderBody: 'Could not fetch the latest news. Please try again.',
    marketError: 'Market data could not be refreshed right now. Last available data is shown when available.',
    newsError: 'Could not load crypto news right now. Try again later.',
    loading: 'Loading crypto news center...',
    disclaimer: 'News, summaries, and analysis are for information and education only and are not investment advice. Some classifications or summaries may be machine-generated.',
  },
  fr: {
    title: 'Actualités crypto',
    subtitle: 'Couverture continue des cryptomonnaies, marchés, régulation, plateformes et technologies blockchain.',
    badge: 'Salle de presse crypto',
    connected: 'Service connecté',
    delayed: 'Données différées',
    unavailable: 'Indisponible',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    newStories: 'nouvelles actualités',
    lastUpdate: 'Dernière mise à jour',
    notUpdated: 'Pas encore mis à jour',
    sourceNote: 'Les actualités proviennent de sources financières externes. Consultez la source originale avant d’agir.',
    marketSnapshot: 'Aperçu du marché crypto',
    snapshotHint: 'Résumé réel du fournisseur, sans valeurs fictives.',
    totalMarketCap: 'Capitalisation totale',
    volume24h: 'Volume 24 h',
    btcDominance: 'Dominance Bitcoin',
    marketChange: 'Variation 24 h',
    risingCoins: 'Cryptos en hausse',
    fallingCoins: 'Cryptos en baisse',
    featured: 'À la une',
    featuredHint: 'Actualités récentes dédupliquées, retirées du flux principal.',
    read: 'Lire l’article',
    source: 'Source',
    originalSource: 'Ouvrir la source',
    machineTranslated: 'Traduction automatique',
    originalText: 'Texte original',
    aiBadge: 'Analyse IA',
    categories: {
      all: 'Tout',
      bitcoin: 'Bitcoin',
      ethereum: 'Ethereum',
      altcoins: 'Altcoins',
      etfs: 'ETF',
      regulation: 'Réglementation',
      exchanges: 'Plateformes',
      blockchain: 'Blockchain',
    },
    marketMovers: 'Mouvements du marché crypto',
    gainers: 'Plus fortes hausses',
    losers: 'Plus fortes baisses',
    mostTraded: 'Volumes élevés',
    trending: 'Cryptos tendances',
    price: 'Prix',
    volume: 'Volume',
    change24h: 'Variation 24 h',
    openAnalysis: 'Ouvrir l’analyse',
    filters: 'Recherche et filtres',
    searchPlaceholder: 'Rechercher actualité, actif ou source...',
    asset: 'Actif',
    category: 'Catégorie',
    sourceFilter: 'Source',
    timeRange: 'Période',
    sort: 'Tri',
    allAssets: 'Tous les actifs',
    allSources: 'Toutes les sources',
    timeAll: 'Toute période',
    timeHour: 'Dernière heure',
    timeDay: 'Dernières 24 h',
    timeWeek: '7 derniers jours',
    timeMonth: '30 derniers jours',
    sortLatest: 'Plus récent',
    sortOldest: 'Plus ancien',
    sortRelevant: 'Plus pertinent',
    clearFilters: 'Effacer les filtres',
    results: 'Résultats',
    resultCount: 'actualités',
    showing: 'Affichées',
    activeFilters: 'Filtres actifs',
    mainFeed: 'Flux d’actualités',
    compactFeed: 'Mises à jour compactes',
    latestUpdates: 'Dernières non affichées',
    mentionedAssets: 'Actifs les plus cités',
    sources: 'Sources principales',
    articles: 'articles',
    mentions: 'mentions',
    loadMore: 'Charger plus',
    allLoaded: 'Toutes les actualités disponibles sont visibles',
    noResultsTitle: 'Aucune actualité trouvée',
    noResultsBody: 'Modifiez la recherche ou supprimez certains filtres.',
    noProviderTitle: 'Actualités indisponibles',
    noProviderBody: 'Impossible de récupérer les dernières actualités. Réessayez.',
    marketError: 'Les données de marché ne peuvent pas être actualisées. La dernière donnée disponible est affichée.',
    newsError: 'Impossible de charger les actualités crypto pour le moment.',
    loading: 'Chargement du centre d’actualités crypto...',
    disclaimer: 'Les actualités, résumés et analyses sont fournis à titre informatif et éducatif et ne constituent pas un conseil d’investissement. Certaines classifications peuvent être générées automatiquement.',
  },
} as const;

function languageKey(lang: string): LangCode {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
}

function minutesAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function relativeUpdate(value: string, lang: LangCode, locale: string, fallback: string) {
  const minutes = minutesAgo(value);
  if (minutes === null) return fallback;
  if (minutes < 1) return lang === 'ar' ? 'الآن' : lang === 'fr' ? 'maintenant' : 'now';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  return formatter.format(-Math.floor(hours / 24), 'day');
}

function itemText(item: CryptoNewsItem) {
  return [
    item.source,
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    ...item.categories,
    ...item.symbols,
  ].join(' ').toLowerCase();
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function dedupeNews(items: CryptoNewsItem[]) {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter(item => {
    const urlKey = canonicalUrl(item.url);
    const titleKey = normalizeTitle(item.titleOriginal || item.title || item.headline);
    if (!urlKey || !titleKey || seenUrls.has(urlKey) || seenTitles.has(titleKey)) return false;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    return true;
  });
}

function itemMatchesSearch(item: CryptoNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemText(item).includes(needle);
}

function timeMatches(item: CryptoNewsItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffHours = (Date.now() - date.getTime()) / 3_600_000;
  if (filter === 'hour') return diffHours <= 1;
  if (filter === 'day') return diffHours <= 24;
  if (filter === 'week') return diffHours <= 24 * 7;
  return diffHours <= 24 * 30;
}

function relevanceScore(item: CryptoNewsItem, query: string, asset: AssetFilter) {
  const needle = query.trim().toLowerCase();
  let score = new Date(item.publishedAt).getTime() / 10_000_000_000;
  if (asset !== 'all' && item.symbols.includes(asset)) score += 75;
  if (needle) {
    if (item.symbols.some(symbol => symbol.toLowerCase() === needle)) score += 90;
    if (item.title.toLowerCase().includes(needle)) score += 35;
    if (item.summary.toLowerCase().includes(needle)) score += 15;
    if (item.source.toLowerCase().includes(needle)) score += 10;
  }
  return score;
}

function cryptoMarketHref(coin: CryptoMarketCoin) {
  return `/market-analysis?symbol=${encodeURIComponent(coin.marketSymbol)}`;
}

function symbolHref(symbol: CryptoNewsSymbol) {
  return `/market-analysis?symbol=${encodeURIComponent(SYMBOL_TO_MARKET_SYMBOL[symbol])}`;
}

function changeTone(value: number | null) {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function formatCompactUsd(value: number | null, locale: string) {
  if (value === null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCryptoPrice(value: number, locale: string) {
  const abs = Math.abs(value);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.min(2, digits),
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number | null, locale: string) {
  if (value === null) return '—';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

export function CryptoNewsPage() {
  const { dir, lang, t } = useLanguage();
  const activeLang = languageKey(lang);
  const text = COPY[activeLang];
  const locale = localeFor(activeLang);
  const [items, setItems] = useState<CryptoNewsItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newStoryCount, setNewStoryCount] = useState(0);
  const [error, setError] = useState('');
  const [marketData, setMarketData] = useState<CryptoMarketPayload | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState('');
  const [query, setQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sort, setSort] = useState<SortFilter>('latest');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [urlReady, setUrlReady] = useState(false);
  const itemIdsRef = useRef<Set<string>>(new Set());
  const refreshingRef = useRef(false);
  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(async (showLoader = true) => {
    if (!showLoader && refreshingRef.current) return;
    if (showLoader) setLoading(true);
    if (!showLoader) {
      refreshingRef.current = true;
      setRefreshing(true);
    }
    setError('');
    try {
      const response = await fetch(`/api/crypto-news?lang=${encodeURIComponent(activeLang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !json.success) throw new Error(t('crypto_news_error'));
      const nextItems = dedupeNews(json.items);
      const previousIds = itemIdsRef.current;
      setNewStoryCount(showLoader ? 0 : nextItems.filter(item => !previousIds.has(item.id)).length);
      itemIdsRef.current = new Set(nextItems.map(item => item.id));
      setItems(nextItems);
      setLastUpdated(json.lastUpdated);
    } catch {
      if (showLoader) setItems([]);
      setLastUpdated(current => showLoader ? '' : current);
      setError(text.newsError);
    } finally {
      if (showLoader) setLoading(false);
      if (!showLoader) {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    }
  }, [activeLang, t, text.newsError]);

  const loadMarket = useCallback(async (showLoader = true) => {
    if (showLoader) setMarketLoading(true);
    setMarketError('');
    try {
      const response = await fetch('/api/crypto-news/market');
      const json = await response.json().catch(() => ({})) as CryptoMarketApiResponse;
      if (!response.ok || !json.ok) throw new Error((json as { message?: string }).message || text.marketError);
      setMarketData(json);
    } catch {
      if (showLoader) setMarketData(null);
      setMarketError(text.marketError);
    } finally {
      if (showLoader) setMarketLoading(false);
    }
  }, [text.marketError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load(false);
      void loadMarket(false);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load, loadMarket]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get('q') ?? '';
    const nextAsset = params.get('asset') as AssetFilter | null;
    const nextCategory = params.get('category') as CategoryFilter | null;
    const nextSource = params.get('source') ?? 'all';
    const nextTime = params.get('time') as TimeFilter | null;
    const nextSort = params.get('sort') as SortFilter | null;
    setQuery(nextQuery);
    if (nextAsset && ASSET_ORDER.includes(nextAsset)) setAssetFilter(nextAsset);
    if (nextCategory && CATEGORY_ORDER.includes(nextCategory)) setCategory(nextCategory);
    setSourceFilter(nextSource || 'all');
    if (nextTime && TIME_FILTERS.includes(nextTime)) setTimeFilter(nextTime);
    if (nextSort && SORT_FILTERS.includes(nextSort)) setSort(nextSort);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (assetFilter !== 'all') params.set('asset', assetFilter);
    if (category !== 'all') params.set('category', category);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (timeFilter !== 'all') params.set('time', timeFilter);
    if (sort !== 'latest') params.set('sort', sort);
    const next = params.toString() ? `/crypto-news?${params.toString()}` : '/crypto-news';
    window.history.replaceState(null, '', next);
  }, [assetFilter, category, query, sort, sourceFilter, timeFilter, urlReady]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [assetFilter, category, debouncedQuery, sort, sourceFilter, timeFilter]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(items.map(item => item.source).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [items]);

  const filteredItems = useMemo(() => {
    const next = items
      .filter(item => sourceFilter === 'all' || item.source === sourceFilter)
      .filter(item => assetFilter === 'all' || item.symbols.includes(assetFilter))
      .filter(item => category === 'all' || item.categories.includes(category))
      .filter(item => timeMatches(item, timeFilter))
      .filter(item => itemMatchesSearch(item, debouncedQuery));

    return [...next].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (sort === 'relevance') {
        const diff = relevanceScore(b, debouncedQuery, assetFilter) - relevanceScore(a, debouncedQuery, assetFilter);
        if (diff !== 0) return diff;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [assetFilter, category, debouncedQuery, items, sort, sourceFilter, timeFilter]);

  const categoryCounts = useMemo(() => (
    CATEGORY_ORDER.reduce((acc, item) => {
      acc[item] = items
        .filter(newsItem => sourceFilter === 'all' || newsItem.source === sourceFilter)
        .filter(newsItem => assetFilter === 'all' || newsItem.symbols.includes(assetFilter))
        .filter(newsItem => timeMatches(newsItem, timeFilter))
        .filter(newsItem => itemMatchesSearch(newsItem, debouncedQuery))
        .filter(newsItem => item === 'all' || newsItem.categories.includes(item)).length;
      return acc;
    }, {} as Record<CategoryFilter, number>)
  ), [assetFilter, debouncedQuery, items, sourceFilter, timeFilter]);

  const featuredItems = filteredItems.slice(0, FEATURED_NEWS_COUNT);
  const feedItems = filteredItems.slice(FEATURED_NEWS_COUNT);
  const visibleFeedItems = feedItems.slice(0, visibleCount);
  const enhancedFeedItems = visibleFeedItems.slice(0, 4);
  const compactFeedItems = visibleFeedItems.slice(4);
  const hasMoreItems = visibleCount < feedItems.length;
  const shownIds = useMemo(() => new Set([...featuredItems, ...visibleFeedItems].map(item => item.id)), [featuredItems, visibleFeedItems]);
  const sidebarLatest = filteredItems.filter(item => !shownIds.has(item.id)).slice(0, 5);

  const symbolCounts = useMemo(() => {
    const counts = new Map<CryptoNewsSymbol, number>();
    filteredItems.forEach(item => item.symbols.forEach(symbol => counts.set(symbol, (counts.get(symbol) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredItems.forEach(item => {
      if (item.source) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredItems]);

  const activeFilters = [
    query.trim() ? { key: 'q', label: query.trim(), clear: () => setQuery('') } : null,
    assetFilter !== 'all' ? { key: 'asset', label: assetFilter, clear: () => setAssetFilter('all') } : null,
    category !== 'all' ? { key: 'category', label: text.categories[category], clear: () => setCategory('all') } : null,
    sourceFilter !== 'all' ? { key: 'source', label: sourceFilter, clear: () => setSourceFilter('all') } : null,
    timeFilter !== 'all' ? { key: 'time', label: timeLabel(timeFilter, text), clear: () => setTimeFilter('all') } : null,
  ].filter((filter): filter is { key: string; label: string; clear: () => void } => Boolean(filter));

  const resetFilters = () => {
    setQuery('');
    setAssetFilter('all');
    setCategory('all');
    setSourceFilter('all');
    setTimeFilter('all');
    setSort('latest');
  };

  const refreshAll = () => {
    if (refreshing) return;
    void load(false);
    void loadMarket(false);
  };

  const serviceConnected = !error && !marketError;
  const lastUpdateText = relativeUpdate(lastUpdated || marketData?.updatedAt || '', activeLang, locale, text.notUpdated);
  const shownCount = featuredItems.length + visibleFeedItems.length;

  return (
    <div className="crypto-news-shell" dir={dir}>
      <Sidebar />
      <main className="crypto-news-main">
        <header className="crypto-hero">
          <div className="crypto-hero-copy">
            <span className="crypto-kicker"><ShieldCheck size={15} />{text.badge}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
            <div className="crypto-hero-meta">
              <span className={serviceConnected ? 'ok' : 'warn'}><Signal size={14} />{serviceConnected ? text.connected : text.unavailable}</span>
              <span><Clock3 size={14} />{text.lastUpdate}: {lastUpdateText}</span>
              {newStoryCount > 0 ? <span><Sparkles size={14} />{newStoryCount} {text.newStories}</span> : null}
            </div>
          </div>
          <button type="button" className="crypto-refresh-btn" onClick={refreshAll} disabled={refreshing} aria-label={text.refresh}>
            <RefreshCcw size={17} className={refreshing ? 'spinning' : ''} />
            {refreshing ? text.refreshing : text.refresh}
          </button>
        </header>

        <CryptoMarketSnapshot
          data={marketData}
          loading={marketLoading}
          error={marketError}
          text={text}
          locale={locale}
        />

        <FeaturedNewsSection
          items={featuredItems}
          loading={loading}
          text={text}
          locale={locale}
        />

        <CryptoMarketMovers
          data={marketData}
          loading={marketLoading}
          error={marketError}
          text={text}
          locale={locale}
        />

        <NewsFilters
          text={text}
          query={query}
          setQuery={setQuery}
          assetFilter={assetFilter}
          setAssetFilter={setAssetFilter}
          category={category}
          setCategory={setCategory}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          sourceOptions={sourceOptions}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          sort={sort}
          setSort={setSort}
          categoryCounts={categoryCounts}
          activeFilters={activeFilters}
          resetFilters={resetFilters}
        />

        {loading ? (
          <NewsLoadingSkeleton />
        ) : error ? (
          <NewsState
            tone="error"
            icon={AlertTriangle}
            title={text.noProviderTitle}
            body={text.noProviderBody}
            actionLabel={text.refresh}
            onAction={() => void load()}
          />
        ) : filteredItems.length === 0 ? (
          <NewsState
            tone="empty"
            icon={Search}
            title={text.noResultsTitle}
            body={items.length === 0 ? text.noProviderBody : text.noResultsBody}
            actionLabel={items.length === 0 ? text.refresh : text.clearFilters}
            onAction={items.length === 0 ? () => void load() : resetFilters}
          />
        ) : (
          <section className="crypto-content-grid" aria-label={text.results}>
            <div className="crypto-feed-column">
              <NewsResultsToolbar text={text} count={filteredItems.length} shown={shownCount} sort={sort} />
              {enhancedFeedItems.length > 0 ? (
                <section className="crypto-card-grid" aria-label={text.mainFeed}>
                  {enhancedFeedItems.map(item => (
                    <NewsCard key={item.id} item={item} text={text} locale={locale} variant="card" />
                  ))}
                </section>
              ) : null}
              {compactFeedItems.length > 0 ? (
                <section className="crypto-compact-list" aria-label={text.compactFeed}>
                  {compactFeedItems.map(item => (
                    <CompactNewsRow key={item.id} item={item} text={text} locale={locale} />
                  ))}
                </section>
              ) : null}
              <div className="crypto-load-more-wrap">
                {hasMoreItems ? (
                  <button type="button" className="crypto-load-more" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>
                    {text.loadMore}
                  </button>
                ) : (
                  <span>{text.allLoaded}</span>
                )}
              </div>
            </div>
            <NewsSidebar
              latestItems={sidebarLatest}
              symbolCounts={symbolCounts}
              sourceCounts={sourceCounts}
              text={text}
              locale={locale}
            />
          </section>
        )}

        <footer className="crypto-disclaimer">
          <Info size={17} />
          <p>{text.disclaimer}</p>
        </footer>
      </main>

      <style jsx global>{`
        .crypto-news-shell{
          --crypto-bg:#F4F8FC;
          --crypto-surface:#FFFFFF;
          --crypto-soft:#F8FCFF;
          --crypto-border:rgba(29,78,116,.13);
          --crypto-border-strong:rgba(29,78,116,.23);
          --crypto-text:#061A2E;
          --crypto-muted:#5C728A;
          --crypto-primary:#1D8CFF;
          --crypto-accent:#24D5C5;
          --crypto-success:#047857;
          --crypto-danger:#B91C1C;
          --crypto-warning:#B7791F;
          --crypto-shadow:0 18px 44px rgba(6,26,46,.09);
          min-height:100dvh;
          background:radial-gradient(circle at 8% 0%,rgba(36,213,197,.19),transparent 34%),linear-gradient(180deg,var(--crypto-bg),#EEF7FB);
          color:var(--crypto-text);
          font-family:Tajawal,Arial,sans-serif;
          overflow-x:hidden;
        }
        .dark .crypto-news-shell{
          --crypto-bg:#07111F;
          --crypto-surface:#0F1D31;
          --crypto-soft:#0B1829;
          --crypto-border:#1D3050;
          --crypto-border-strong:#2A456C;
          --crypto-text:#E8EEF6;
          --crypto-muted:#8EA6C3;
          --crypto-shadow:0 18px 44px rgba(0,0,0,.22);
        }
        .crypto-news-shell *{box-sizing:border-box}
        .crypto-news-main{
          width:min(1440px,calc(100vw - var(--sidebar-w,230px) - 64px));
          margin-inline-start:calc(var(--sidebar-w,230px) + 32px);
          margin-inline-end:32px;
          padding-block:24px 44px;
          display:grid;
          gap:24px;
          min-width:0;
        }
        [dir="ltr"].crypto-news-shell .crypto-news-main{
          margin-inline-start:calc(var(--sidebar-w,230px) + 32px);
          margin-inline-end:32px;
        }
        .crypto-hero,.crypto-panel,.crypto-featured,.crypto-movers,.crypto-filter-panel,.crypto-results-bar,.crypto-news-card,.crypto-compact-row,.crypto-side-card,.crypto-disclaimer,.crypto-state{
          border:1px solid var(--crypto-border);
          background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,252,255,.94));
          border-radius:22px;
          box-shadow:var(--crypto-shadow);
        }
        .dark .crypto-hero,.dark .crypto-panel,.dark .crypto-featured,.dark .crypto-movers,.dark .crypto-filter-panel,.dark .crypto-results-bar,.dark .crypto-news-card,.dark .crypto-compact-row,.dark .crypto-side-card,.dark .crypto-disclaimer,.dark .crypto-state{
          background:linear-gradient(180deg,rgba(15,29,49,.94),rgba(11,24,41,.94));
        }
        .crypto-hero{
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:22px;
          align-items:center;
          padding:26px;
          background:radial-gradient(circle at 12% 15%,rgba(36,213,197,.25),transparent 32%),linear-gradient(135deg,#061A2E,#0E4A5C);
          color:#fff;
        }
        .crypto-kicker,.crypto-hero-meta span,.crypto-source-pill,.crypto-badge,.crypto-active-chip{
          display:inline-flex;
          align-items:center;
          gap:7px;
          width:max-content;
          max-width:100%;
          border-radius:999px;
          padding:6px 10px;
          font-size:12px;
          font-weight:950;
          line-height:1.25;
        }
        .crypto-kicker{border:1px solid rgba(36,213,197,.28);background:rgba(36,213,197,.13);color:#A7FFF4}
        .crypto-hero h1{margin:12px 0 8px;color:#fff;font-size:clamp(34px,4vw,58px);font-weight:950;line-height:1.08;letter-spacing:0}
        .crypto-hero p{max-width:780px;margin:0;color:#DDF9FF;font-size:16px;font-weight:850;line-height:1.75}
        .crypto-hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px}
        .crypto-hero-meta span{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:#E6FBFF}
        .crypto-hero-meta span.ok{color:#BDFBE8}
        .crypto-hero-meta span.warn{color:#FFE8A3}
        .crypto-refresh-btn,.crypto-load-more,.crypto-state button{
          min-height:44px;
          border:0;
          border-radius:14px;
          background:linear-gradient(135deg,var(--crypto-primary),var(--crypto-accent));
          color:#061A2E;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          padding:0 16px;
          font:950 13px Tajawal,Arial,sans-serif;
          cursor:pointer;
          text-decoration:none;
          box-shadow:0 14px 32px rgba(29,140,255,.18);
        }
        .crypto-refresh-btn:disabled{opacity:.65;cursor:not-allowed}
        .crypto-refresh-btn:hover,.crypto-refresh-btn:focus-visible,.crypto-load-more:hover,.crypto-load-more:focus-visible,.crypto-news-link:hover,.crypto-news-link:focus-visible,.crypto-state button:focus-visible{
          outline:none;
          box-shadow:0 0 0 4px rgba(36,213,197,.16),0 16px 36px rgba(29,140,255,.22);
        }
        .spinning{animation:cryptoSpin 900ms linear infinite}
        @keyframes cryptoSpin{to{transform:rotate(360deg)}}

        .crypto-snapshot-grid{display:grid;grid-template-columns:1.25fr repeat(3,minmax(0,1fr));gap:14px}
        .crypto-panel{padding:18px}
        .crypto-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
        .crypto-section-head h2{margin:0;color:var(--crypto-text);font-size:22px;font-weight:950}
        .crypto-section-head p{margin:5px 0 0;color:var(--crypto-muted);font-size:13px;font-weight:850;line-height:1.65}
        .crypto-section-head span{display:inline-flex;align-items:center;gap:7px;color:#075985;background:#E0F2FE;border:1px solid rgba(14,165,233,.18);border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950}
        .crypto-snapshot-card{min-height:116px;display:grid;gap:8px;align-content:center;border:1px solid var(--crypto-border);border-radius:18px;background:var(--crypto-soft);padding:14px}
        .crypto-snapshot-card small{color:var(--crypto-muted);font-size:12px;font-weight:900}
        .crypto-snapshot-card strong{color:var(--crypto-text);font-size:clamp(20px,2.2vw,28px);font-weight:950;line-height:1.15}
        .crypto-snapshot-card em{font-style:normal;color:var(--crypto-muted);font-size:12px;font-weight:850}
        .crypto-snapshot-card.hero{background:linear-gradient(135deg,#061A2E,#0E4A5C);color:#fff}
        .crypto-snapshot-card.hero small,.crypto-snapshot-card.hero em{color:#BEEBF1}.crypto-snapshot-card.hero strong{color:#fff}

        .crypto-featured{padding:18px;display:grid;gap:14px}
        .crypto-featured-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:14px}
        .crypto-lead-card{display:grid;grid-template-columns:180px minmax(0,1fr);gap:16px;align-items:stretch;padding:18px;border:1px solid var(--crypto-border);border-radius:20px;background:var(--crypto-soft);min-width:0}
        .crypto-lead-art{min-height:210px;border-radius:18px;background:radial-gradient(circle at 25% 20%,rgba(36,213,197,.3),transparent 34%),linear-gradient(135deg,#061A2E,#0B3955);display:grid;place-items:center;color:#A7FFF4}
        .crypto-lead-body,.crypto-mini-list,.crypto-news-card,.crypto-compact-row{min-width:0}
        .crypto-meta-row,.crypto-symbol-row,.crypto-category-row,.crypto-card-actions,.crypto-active-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .crypto-source-pill,.crypto-badge{border:1px solid var(--crypto-border);background:#EFF8FF;color:#075985;text-decoration:none}
        .crypto-source-pill.ai{background:#FFF7ED;color:#9A3412;border-color:#FED7AA}
        .crypto-symbol-badge{direction:ltr;unicode-bidi:isolate}
        .crypto-title-link{color:inherit;text-decoration:none}
        .crypto-title-link:hover,.crypto-title-link:focus-visible{outline:none;color:#075985;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
        .crypto-lead-card h3,.crypto-news-card h3{margin:0;color:var(--crypto-text);font-weight:950;line-height:1.45;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
        .crypto-lead-card h3{font-size:clamp(22px,2.4vw,30px);-webkit-line-clamp:2}
        .crypto-news-card h3{font-size:18px;-webkit-line-clamp:2}
        .crypto-lead-card p,.crypto-news-card p,.crypto-compact-row p{margin:0;color:var(--crypto-muted);font-size:14px;font-weight:820;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .crypto-news-link{min-height:40px;border-radius:999px;background:linear-gradient(135deg,var(--crypto-primary),var(--crypto-accent));color:#061A2E;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;font-size:12px;font-weight:950}
        .crypto-mini-list{display:grid;gap:10px}
        .crypto-mini-story{display:grid;gap:8px;padding:14px;border:1px solid var(--crypto-border);border-radius:18px;background:var(--crypto-soft);text-decoration:none;color:inherit}
        .crypto-mini-story strong{color:var(--crypto-text);font-size:14px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .crypto-mini-story small,.crypto-meta-row span,.crypto-compact-row small{display:inline-flex;align-items:center;gap:5px;color:var(--crypto-muted);font-size:12px;font-weight:850}

        .crypto-movers{padding:18px;display:grid;gap:14px}
        .crypto-movers-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .crypto-mover-card{display:grid;gap:10px;align-content:start;border:1px solid var(--crypto-border);border-radius:18px;background:var(--crypto-soft);padding:13px;min-width:0}
        .crypto-mover-card h3{margin:0;color:var(--crypto-text);font-size:15px;font-weight:950}
        .crypto-coin-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;min-height:58px;border:1px solid rgba(29,78,116,.1);border-radius:15px;background:var(--crypto-surface);padding:8px;text-decoration:none;color:inherit}
        .crypto-coin-logo{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#E0F2FE;color:#075985;font-size:12px;font-weight:950;overflow:hidden}
        .crypto-coin-id{display:grid;gap:2px;min-width:0}
        .crypto-coin-id strong{color:var(--crypto-text);font-size:13px;font-weight:950;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
        .crypto-coin-id small{color:var(--crypto-muted);font-size:11px;font-weight:850}
        .crypto-coin-values{display:grid;gap:3px;justify-items:end;text-align:end}
        .crypto-coin-values b{color:var(--crypto-text);font-size:12px;font-weight:950;white-space:nowrap}
        .crypto-tone{border-radius:999px;padding:4px 7px;font-size:11px;font-weight:950}
        .crypto-tone.up{background:#DCFCE7;color:#166534}.crypto-tone.down{background:#FEE2E2;color:#991B1B}.crypto-tone.neutral{background:#E2E8F0;color:#334155}

        .crypto-filter-panel{padding:16px;display:grid;gap:13px}
        .crypto-filter-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .crypto-filter-title h2{margin:0;color:var(--crypto-text);font-size:20px;font-weight:950}
        .crypto-filter-grid{display:grid;grid-template-columns:minmax(280px,1.3fr) repeat(5,minmax(140px,.6fr));gap:10px;align-items:end}
        .crypto-field{display:grid;gap:6px;min-width:0;color:var(--crypto-muted);font-size:12px;font-weight:900}
        .crypto-search{position:relative}
        .crypto-search svg{position:absolute;inset-inline-start:14px;bottom:13px;color:#7890A7}
        .crypto-field input,.crypto-field select{width:100%;min-height:44px;border:1px solid var(--crypto-border);border-radius:14px;background:var(--crypto-soft);color:var(--crypto-text);padding:0 13px;font:900 13px Tajawal,Arial,sans-serif;outline:none}
        .crypto-search input{padding-inline-start:42px}
        .crypto-field input:focus,.crypto-field select:focus{border-color:var(--crypto-accent);box-shadow:0 0 0 4px rgba(36,213,197,.13)}
        .crypto-category-tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
        .crypto-category-tabs button{flex:0 0 auto;min-height:40px;border:1px solid var(--crypto-border);border-radius:999px;background:var(--crypto-surface);color:var(--crypto-muted);display:inline-flex;align-items:center;gap:7px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .crypto-category-tabs button.active{background:#E0F2FE;color:#075985;border-color:rgba(14,165,233,.24)}
        .crypto-category-tabs b{min-width:22px;height:22px;border-radius:999px;background:rgba(29,140,255,.1);display:grid;place-items:center;padding:0 6px}
        .crypto-active-filters{min-height:32px}
        .crypto-active-chip{border:1px solid var(--crypto-border);background:var(--crypto-soft);color:var(--crypto-text);cursor:pointer}
        .crypto-clear-btn{border:1px solid var(--crypto-border);background:var(--crypto-surface);color:var(--crypto-text);border-radius:999px;min-height:36px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}

        .crypto-content-grid{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(280px,.8fr);gap:24px;align-items:start}
        .crypto-feed-column,.crypto-side-panel{display:grid;gap:14px;min-width:0}
        .crypto-side-panel{position:sticky;top:88px}
        .crypto-results-bar{padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .crypto-results-bar h2{margin:0;color:var(--crypto-text);font-size:20px;font-weight:950}
        .crypto-results-bar span{color:var(--crypto-muted);font-size:13px;font-weight:850}
        .crypto-results-bar b{color:#075985}
        .crypto-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .crypto-news-card{padding:17px;display:grid;gap:12px}
        .crypto-card-actions{justify-content:flex-end;border-top:1px solid var(--crypto-border);padding-top:12px}
        .crypto-compact-list{display:grid;gap:10px}
        .crypto-compact-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;text-decoration:none;color:inherit}
        .crypto-compact-row h3{margin:0;color:var(--crypto-text);font-size:16px;font-weight:950;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .crypto-compact-action{color:#075985;font-weight:950;font-size:12px;display:inline-flex;align-items:center;gap:5px}
        .crypto-load-more-wrap{display:grid;place-items:center;min-height:48px}
        .crypto-load-more-wrap span{color:var(--crypto-muted);font-size:13px;font-weight:850}

        .crypto-side-card{padding:15px;display:grid;gap:12px}
        .crypto-side-card h3{margin:0;color:var(--crypto-text);font-size:15px;font-weight:950;display:flex;align-items:center;gap:8px}
        .crypto-side-card h3 svg{color:#075985}
        .crypto-side-list{display:grid;gap:9px}
        .crypto-side-item,.crypto-side-symbol,.crypto-side-source{border:1px solid var(--crypto-border);border-radius:14px;background:var(--crypto-soft);padding:10px;text-decoration:none;color:inherit}
        .crypto-side-item{display:grid;gap:5px}
        .crypto-side-item strong{color:var(--crypto-text);font-size:12.5px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .crypto-side-symbol,.crypto-side-source{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .crypto-side-symbol b,.crypto-side-source b{color:var(--crypto-text);font-size:12px;font-weight:950}
        .crypto-side-symbol small,.crypto-side-source small{color:var(--crypto-muted);font-size:11px;font-weight:850}

        .crypto-state{min-height:240px;padding:34px;display:grid;place-items:center;gap:10px;text-align:center;color:var(--crypto-muted)}
        .crypto-state svg{color:#075985}
        .crypto-state strong{color:var(--crypto-text);font-size:20px;font-weight:950}
        .crypto-state p{max-width:640px;margin:0;color:var(--crypto-muted);font-size:14px;font-weight:850;line-height:1.75}
        .crypto-skeleton-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .crypto-skeleton{min-height:210px;padding:18px;display:grid;gap:12px}
        .crypto-skeleton span,.crypto-skeleton i,.crypto-skeleton b{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.12),rgba(36,213,197,.2),rgba(142,166,195,.12));background-size:220% 100%;animation:cryptoShimmer 1.2s linear infinite}
        .crypto-skeleton span{height:22px;width:45%}.crypto-skeleton i{height:14px;width:100%}.crypto-skeleton i:nth-child(3){width:78%}.crypto-skeleton b{height:40px;width:62%;border-radius:14px}
        @keyframes cryptoShimmer{to{background-position:-220% 0}}
        .crypto-disclaimer{display:flex;align-items:flex-start;gap:10px;padding:16px}
        .crypto-disclaimer svg{color:var(--crypto-warning)}
        .crypto-disclaimer p{margin:0;color:var(--crypto-muted);font-size:13px;font-weight:850;line-height:1.7}

        @media(max-width:1280px){
          .crypto-news-main{width:calc(100vw - var(--sidebar-w,230px) - 48px);margin-inline-start:calc(var(--sidebar-w,230px) + 24px);margin-inline-end:24px}
          .crypto-snapshot-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
          .crypto-movers-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .crypto-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        }
        @media(max-width:1024px){
          .crypto-news-shell .crypto-news-main{width:calc(100% - 32px);margin-inline-start:auto;margin-inline-end:auto;padding-top:92px}
          .crypto-hero,.crypto-featured-grid,.crypto-content-grid{grid-template-columns:1fr}
          .crypto-side-panel{position:static}
          .crypto-lead-card{grid-template-columns:1fr}
          .crypto-lead-art{min-height:150px}
          .crypto-card-grid{grid-template-columns:1fr}
        }
        @media(max-width:760px){
          .crypto-news-shell .crypto-news-main{width:calc(100% - 24px);gap:18px;padding-top:84px}
          .crypto-hero{grid-template-columns:1fr;padding:20px;border-radius:24px}
          .crypto-refresh-btn{width:100%}
          .crypto-snapshot-grid,.crypto-movers-grid,.crypto-filter-grid,.crypto-skeleton-grid{grid-template-columns:1fr}
          .crypto-section-head,.crypto-filter-title,.crypto-results-bar{display:grid}
          .crypto-compact-row{grid-template-columns:1fr}
          .crypto-compact-action{justify-content:flex-start}
          .crypto-category-tabs{padding-bottom:8px}
          .crypto-field input,.crypto-field select{font-size:16px}
        }
        @media(max-width:460px){
          .crypto-news-shell .crypto-news-main{width:calc(100% - 20px)}
          .crypto-hero h1{font-size:32px}
          .crypto-snapshot-card strong{font-size:21px}
          .crypto-lead-card,.crypto-news-card,.crypto-compact-row{padding:14px}
        }
        @media(prefers-reduced-motion:reduce){
          .spinning,.crypto-skeleton span,.crypto-skeleton i,.crypto-skeleton b{animation:none}
          .crypto-news-link:hover,.crypto-refresh-btn:hover,.crypto-load-more:hover{transform:none}
        }
      `}</style>
    </div>
  );
}

function timeLabel(value: TimeFilter, text: typeof COPY[LangCode]) {
  if (value === 'hour') return text.timeHour;
  if (value === 'day') return text.timeDay;
  if (value === 'week') return text.timeWeek;
  if (value === 'month') return text.timeMonth;
  return text.timeAll;
}

function sortLabel(value: SortFilter, text: typeof COPY[LangCode]) {
  if (value === 'oldest') return text.sortOldest;
  if (value === 'relevance') return text.sortRelevant;
  return text.sortLatest;
}

function MarketValueCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' | 'neutral' }) {
  return (
    <article className={`crypto-snapshot-card ${tone ?? ''}`}>
      <small>{label}</small>
      <strong dir="ltr">{value}</strong>
      {hint ? <em>{hint}</em> : null}
    </article>
  );
}

function CryptoMarketSnapshot({ data, loading, error, text, locale }: {
  data: CryptoMarketPayload | null;
  loading: boolean;
  error: string;
  text: typeof COPY[LangCode];
  locale: string;
}) {
  if (loading) {
    return (
      <section className="crypto-panel" aria-label={text.marketSnapshot}>
        <div className="crypto-section-head">
          <div>
            <h2>{text.marketSnapshot}</h2>
            <p>{text.snapshotHint}</p>
          </div>
        </div>
        <div className="crypto-skeleton-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => <article className="crypto-skeleton crypto-panel" key={index}><span /><i /><b /></article>)}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <NewsState tone="error" icon={AlertTriangle} title={text.unavailable} body={error || text.marketError} />
    );
  }

  const summary = data.summary;
  return (
    <section className="crypto-panel" aria-label={text.marketSnapshot}>
      <div className="crypto-section-head">
        <div>
          <h2>{text.marketSnapshot}</h2>
          <p>{text.snapshotHint}</p>
        </div>
        <span><Coins size={14} />{data.source}</span>
      </div>
      <div className="crypto-snapshot-grid">
        <article className="crypto-snapshot-card hero">
          <small>{text.totalMarketCap}</small>
          <strong dir="ltr">{formatCompactUsd(summary.totalMarketCapUsd, locale)}</strong>
          <em>{text.delayed}</em>
        </article>
        <MarketValueCard label={text.volume24h} value={formatCompactUsd(summary.totalVolume24hUsd, locale)} />
        <MarketValueCard label={text.btcDominance} value={formatPercent(summary.bitcoinDominance, locale)} />
        <MarketValueCard label={text.marketChange} value={formatPercent(summary.marketChange24h, locale)} tone={changeTone(summary.marketChange24h)} />
        <MarketValueCard label={text.risingCoins} value={new Intl.NumberFormat(locale).format(summary.risingCount)} tone="up" />
        <MarketValueCard label={text.fallingCoins} value={new Intl.NumberFormat(locale).format(summary.fallingCount)} tone="down" />
      </div>
    </section>
  );
}

function FeaturedNewsSection({ items, loading, text, locale }: {
  items: CryptoNewsItem[];
  loading: boolean;
  text: typeof COPY[LangCode];
  locale: string;
}) {
  if (loading || items.length === 0) return null;
  const [lead, ...secondary] = items;
  const leadTitle = lead.title || lead.headline;
  const leadSummary = lead.summary || leadTitle;
  const leadUrl = safeExternalUrl(lead.url);

  return (
    <section className="crypto-featured" aria-label={text.featured}>
      <div className="crypto-section-head">
        <div>
          <h2>{text.featured}</h2>
          <p>{text.featuredHint}</p>
        </div>
        <span><Newspaper size={14} />{items.length}</span>
      </div>
      <div className="crypto-featured-grid">
        <article className="crypto-lead-card">
          <div className="crypto-lead-art" aria-hidden="true">
            <LineChart size={48} />
          </div>
          <div className="crypto-lead-body">
            <div className="crypto-meta-row">
              <SourceBadge source={lead.source || text.source} />
              {lead.isTranslated ? <AiBadge label={text.machineTranslated} /> : <span className="crypto-source-pill">{text.originalText}</span>}
              <span className="crypto-source-pill"><Clock3 size={13} />{formatDateTime(lead.publishedAt, locale)}</span>
            </div>
            <CategoryBadges item={lead} text={text} />
            <SymbolBadges symbols={lead.symbols} />
            {leadUrl ? (
              <a className="crypto-title-link" href={leadUrl} target="_blank" rel="noopener noreferrer nofollow" dir="auto">
                <h3>{leadTitle}</h3>
              </a>
            ) : <h3 dir="auto">{leadTitle}</h3>}
            <p dir="auto">{leadSummary}</p>
            <div className="crypto-card-actions">
              {leadUrl ? (
                <a className="crypto-news-link" href={leadUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${text.originalSource}: ${leadTitle}`}>
                  {text.read}
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          </div>
        </article>
        <div className="crypto-mini-list">
          {secondary.slice(0, 3).map(item => {
            const title = item.title || item.headline;
            const url = safeExternalUrl(item.url);
            return url ? (
              <a className="crypto-mini-story" href={url} target="_blank" rel="noopener noreferrer nofollow" key={item.id} aria-label={`${text.originalSource}: ${title}`}>
                <div className="crypto-meta-row">
                  <SourceBadge source={item.source || text.source} />
                  <small><Clock3 size={13} />{formatDateTime(item.publishedAt, locale)}</small>
                </div>
                <strong dir="auto">{title}</strong>
                <SymbolChips symbols={item.symbols} />
              </a>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}

function CoinAvatar({ coin }: { coin: CryptoMarketCoin }) {
  return (
    <AssetIdentity
      symbol={coin.symbol}
      name={coin.name}
      assetType="crypto"
      imageUrl={coin.image}
      size="sm"
    />
  );
}

function CryptoMarketMovers({ data, loading, error, text, locale }: {
  data: CryptoMarketPayload | null;
  loading: boolean;
  error: string;
  text: typeof COPY[LangCode];
  locale: string;
}) {
  if (loading) {
    return (
      <section className="crypto-movers" aria-label={text.marketMovers}>
        <div className="crypto-section-head"><h2>{text.marketMovers}</h2></div>
        <div className="crypto-skeleton-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => <article className="crypto-skeleton crypto-panel" key={index}><span /><i /><i /><b /></article>)}
        </div>
      </section>
    );
  }
  if (!data) {
    return <NewsState tone="error" icon={AlertTriangle} title={text.unavailable} body={error || text.marketError} />;
  }
  const cards = [
    { key: 'gainers', title: text.gainers, items: data.rankings.gainers, showVolume: false },
    { key: 'losers', title: text.losers, items: data.rankings.losers, showVolume: false },
    { key: 'volume', title: text.mostTraded, items: data.rankings.mostTraded, showVolume: true },
    { key: 'trending', title: text.trending, items: data.rankings.trending, showVolume: false },
  ].filter(card => card.items.length > 0);

  return (
    <section className="crypto-movers" aria-label={text.marketMovers}>
      <div className="crypto-section-head">
        <div>
          <h2>{text.marketMovers}</h2>
          <p>{text.delayed} · {data.source}</p>
        </div>
      </div>
      <div className="crypto-movers-grid">
        {cards.map(card => (
          <article className="crypto-mover-card" key={card.key}>
            <h3>{card.title}</h3>
            {card.items.slice(0, 5).map(coin => (
              <Link href={cryptoMarketHref(coin)} className="crypto-coin-row" key={`${card.key}-${coin.id}`} aria-label={`${text.openAnalysis}: ${coin.name} ${coin.symbol}`}>
                <CoinAvatar coin={coin} />
                <span className="crypto-coin-id">
                  <strong>{coin.name}</strong>
                  <small dir="ltr">{coin.symbol}</small>
                </span>
                <span className="crypto-coin-values">
                  <b dir="ltr">{card.showVolume ? formatCompactUsd(coin.volume24h, locale) : formatCryptoPrice(coin.price, locale)}</b>
                  <em className={`crypto-tone ${changeTone(coin.changePercent24h)}`} dir="ltr">{formatPercent(coin.changePercent24h, locale)}</em>
                </span>
              </Link>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsFilters({
  text,
  query,
  setQuery,
  assetFilter,
  setAssetFilter,
  category,
  setCategory,
  sourceFilter,
  setSourceFilter,
  sourceOptions,
  timeFilter,
  setTimeFilter,
  sort,
  setSort,
  categoryCounts,
  activeFilters,
  resetFilters,
}: {
  text: typeof COPY[LangCode];
  query: string;
  setQuery: (value: string) => void;
  assetFilter: AssetFilter;
  setAssetFilter: (value: AssetFilter) => void;
  category: CategoryFilter;
  setCategory: (value: CategoryFilter) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  sourceOptions: string[];
  timeFilter: TimeFilter;
  setTimeFilter: (value: TimeFilter) => void;
  sort: SortFilter;
  setSort: (value: SortFilter) => void;
  categoryCounts: Record<CategoryFilter, number>;
  activeFilters: Array<{ key: string; label: string; clear: () => void }>;
  resetFilters: () => void;
}) {
  return (
    <section className="crypto-filter-panel" aria-label={text.filters}>
      <div className="crypto-filter-title">
        <h2><Filter size={18} /> {text.filters}</h2>
        {activeFilters.length > 0 ? <button type="button" className="crypto-clear-btn" onClick={resetFilters}>{text.clearFilters}</button> : null}
      </div>
      <div className="crypto-filter-grid">
        <label className="crypto-field crypto-search">
          <span>{text.filters}</span>
          <Search size={17} />
          <input type="search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchPlaceholder} />
        </label>
        <label className="crypto-field">
          <span>{text.asset}</span>
          <select value={assetFilter} onChange={event => setAssetFilter(event.target.value as AssetFilter)}>
            {ASSET_ORDER.map(asset => <option value={asset} key={asset}>{asset === 'all' ? text.allAssets : asset}</option>)}
          </select>
        </label>
        <label className="crypto-field">
          <span>{text.sourceFilter}</span>
          <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
            <option value="all">{text.allSources}</option>
            {sourceOptions.map(source => <option value={source} key={source}>{source}</option>)}
          </select>
        </label>
        <label className="crypto-field">
          <span>{text.timeRange}</span>
          <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as TimeFilter)}>
            {TIME_FILTERS.map(time => <option value={time} key={time}>{timeLabel(time, text)}</option>)}
          </select>
        </label>
        <label className="crypto-field">
          <span>{text.sort}</span>
          <select value={sort} onChange={event => setSort(event.target.value as SortFilter)}>
            {SORT_FILTERS.map(item => <option value={item} key={item}>{sortLabel(item, text)}</option>)}
          </select>
        </label>
      </div>
      <div className="crypto-category-tabs" role="tablist" aria-label={text.category}>
        {CATEGORY_ORDER.map(item => (
          <button type="button" role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>
            <span>{text.categories[item]}</span>
            <b>{categoryCounts[item] ?? 0}</b>
          </button>
        ))}
      </div>
      {activeFilters.length > 0 ? (
        <div className="crypto-active-filters" aria-label={text.activeFilters}>
          {activeFilters.map(filter => (
            <button type="button" className="crypto-active-chip" key={filter.key} onClick={filter.clear}>
              {filter.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NewsResultsToolbar({ text, count, shown, sort }: {
  text: typeof COPY[LangCode];
  count: number;
  shown: number;
  sort: SortFilter;
}) {
  return (
    <div className="crypto-results-bar">
      <div>
        <h2>{text.results}</h2>
        <span>{count} {text.resultCount} · {text.showing} <b>{shown}</b> · {sortLabel(sort, text)}</span>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return <span className="crypto-source-pill" dir="auto">{source}</span>;
}

function AiBadge({ label }: { label: string }) {
  return <span className="crypto-source-pill ai" title={label}><Sparkles size={12} />{label}</span>;
}

function CategoryBadges({ item, text }: { item: CryptoNewsItem; text: typeof COPY[LangCode] }) {
  if (item.categories.length === 0) return null;
  return (
    <div className="crypto-category-row">
      {item.categories.slice(0, 3).map(category => (
        <span className="crypto-badge" key={category}>{text.categories[category]}</span>
      ))}
    </div>
  );
}

function SymbolBadges({ symbols }: { symbols: CryptoNewsSymbol[] }) {
  if (symbols.length === 0) return null;
  return (
    <div className="crypto-symbol-row">
      {symbols.slice(0, 5).map(symbol => (
        <Link className="crypto-badge crypto-symbol-badge" href={symbolHref(symbol)} key={symbol}>{symbol}</Link>
      ))}
    </div>
  );
}

function SymbolChips({ symbols }: { symbols: CryptoNewsSymbol[] }) {
  if (symbols.length === 0) return null;
  return (
    <div className="crypto-symbol-row">
      {symbols.slice(0, 5).map(symbol => (
        <span className="crypto-badge crypto-symbol-badge" dir="ltr" key={symbol}>{symbol}</span>
      ))}
    </div>
  );
}

function NewsCard({ item, text, locale, variant }: {
  item: CryptoNewsItem;
  text: typeof COPY[LangCode];
  locale: string;
  variant: 'card';
}) {
  const title = item.title || item.headline;
  const summary = item.summary || title;
  const url = safeExternalUrl(item.url);
  return (
    <article className={`crypto-news-card ${variant}`}>
      <div className="crypto-meta-row">
        <SourceBadge source={item.source || text.source} />
        {item.isTranslated ? <AiBadge label={text.machineTranslated} /> : <span className="crypto-source-pill">{text.originalText}</span>}
        <span><Clock3 size={13} />{formatDateTime(item.publishedAt, locale)}</span>
      </div>
      <CategoryBadges item={item} text={text} />
      <SymbolBadges symbols={item.symbols} />
      {url ? (
        <a className="crypto-title-link" href={url} target="_blank" rel="noopener noreferrer nofollow" dir="auto">
          <h3>{title}</h3>
        </a>
      ) : <h3 dir="auto">{title}</h3>}
      <p dir="auto">{summary}</p>
      <div className="crypto-card-actions">
        {url ? (
          <a className="crypto-news-link" href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${text.originalSource}: ${title}`}>
            {text.read}
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function CompactNewsRow({ item, text, locale }: {
  item: CryptoNewsItem;
  text: typeof COPY[LangCode];
  locale: string;
}) {
  const title = item.title || item.headline;
  const url = safeExternalUrl(item.url);
  const content = (
    <>
      <div>
        <div className="crypto-meta-row">
          <SourceBadge source={item.source || text.source} />
          <small><Clock3 size={13} />{formatDateTime(item.publishedAt, locale)}</small>
        </div>
        <h3 dir="auto">{title}</h3>
        <p dir="auto">{item.summary || title}</p>
      </div>
      <span className="crypto-compact-action">
        {text.read}
        <ArrowUpRight size={14} />
      </span>
    </>
  );
  return url ? (
    <a className="crypto-compact-row" href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${text.originalSource}: ${title}`}>
      {content}
    </a>
  ) : (
    <article className="crypto-compact-row">{content}</article>
  );
}

function NewsSidebar({ latestItems, symbolCounts, sourceCounts, text, locale }: {
  latestItems: CryptoNewsItem[];
  symbolCounts: Array<[CryptoNewsSymbol, number]>;
  sourceCounts: Array<[string, number]>;
  text: typeof COPY[LangCode];
  locale: string;
}) {
  return (
    <aside className="crypto-side-panel">
      {latestItems.length > 0 ? (
        <section className="crypto-side-card">
          <h3><Newspaper size={16} />{text.latestUpdates}</h3>
          <div className="crypto-side-list">
            {latestItems.map(item => {
              const title = item.title || item.headline;
              const url = safeExternalUrl(item.url);
              return url ? (
                <a className="crypto-side-item" href={url} target="_blank" rel="noopener noreferrer nofollow" key={`side-${item.id}`}>
                  <SourceBadge source={item.source || text.source} />
                  <strong dir="auto">{title}</strong>
                  <small><Clock3 size={12} />{formatDateTime(item.publishedAt, locale)}</small>
                </a>
              ) : null;
            })}
          </div>
        </section>
      ) : null}
      {symbolCounts.length > 0 ? (
        <section className="crypto-side-card">
          <h3><Tags size={16} />{text.mentionedAssets}</h3>
          <div className="crypto-side-list">
            {symbolCounts.map(([symbol, count]) => (
              <Link href={symbolHref(symbol)} className="crypto-side-symbol" key={symbol}>
                <b dir="ltr">{symbol}</b>
                <small>{count} {text.mentions}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {sourceCounts.length > 0 ? (
        <section className="crypto-side-card">
          <h3><Layers3 size={16} />{text.sources}</h3>
          <div className="crypto-side-list">
            {sourceCounts.map(([source, count]) => (
              <span className="crypto-side-source" key={source}>
                <b dir="auto">{source}</b>
                <small>{count} {text.articles}</small>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function NewsLoadingSkeleton() {
  return (
    <section className="crypto-skeleton-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="crypto-skeleton crypto-panel" key={index}>
          <span />
          <i />
          <i />
          <b />
        </article>
      ))}
    </section>
  );
}

function NewsState({ tone, icon: Icon, title, body, actionLabel, onAction }: {
  tone: 'error' | 'empty';
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className={`crypto-state ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={28} />
      <strong>{title}</strong>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          <RefreshCcw size={15} />
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

export default CryptoNewsPage;

