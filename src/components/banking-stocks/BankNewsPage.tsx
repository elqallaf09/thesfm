'use client';

import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookmarkPlus,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  Landmark,
  LineChart,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode,
} from 'react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type Tone = 'positive' | 'negative' | 'neutral' | 'warning';
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type SortMode = 'latest' | 'oldest' | 'strongestMove';
type BankingCategory =
  | 'all'
  | 'large_banks'
  | 'regional_banks'
  | 'investment_banks'
  | 'payments'
  | 'asset_management'
  | 'rates'
  | 'earnings'
  | 'dividends'
  | 'regulation';
type QuickTimeframe = '1D' | '1W' | '1M';

type BankTickerItem = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
};

type BankTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: BankTickerItem[];
  };

type BankingSnapshotItem = {
  symbol: string;
  displayName: string;
  nameAr: string;
  category: string;
  unit: string;
  value: number | null;
  change: number | null;
  changePercent: number | null;
  lastUpdated: string;
  source: string | null;
  delayed: true;
  available: boolean;
};

type BankingSnapshotResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankingSnapshotItem[];
  }
  | {
    ok: false;
    source: string | null;
    updated_at: string | null;
    items: BankingSnapshotItem[];
    error?: string;
  };

type BankNewsItem = {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translatedTo?: string;
  companyName?: string;
  ticker?: string;
  sector?: string;
  sectors?: string[];
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  delayed?: true;
  sentiment?: string | null;
  impact?: string | null;
};

type BankNewsResponse =
  | {
    success: true;
    category: 'banking';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: BankNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
  };

type QuickAnalysisState = {
  symbol: string;
  providerSymbol: string;
  companyName?: string;
  exchange?: string;
  currency?: string;
  assetType: 'stock';
  timeframe: QuickTimeframe;
};

type QuickAnalysisResult = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  symbol?: string;
  providerSymbol?: string;
  name?: string;
  assetType?: string;
  currency?: string | null;
  exchange?: string;
  lastUpdated?: string;
  latestPrice?: number;
  changePercent?: number;
  quote?: {
    price?: number;
    change?: number;
    changePercent?: number;
    currency?: string | null;
    timestamp?: string;
  };
  trend?: 'bullish' | 'neutral' | 'bearish' | string;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  indicators?: {
    rsi?: number;
    sma20?: number;
    sma50?: number;
    volatility?: number;
  };
  levels?: {
    support?: number;
    resistance?: number;
  };
  technicals?: Record<string, unknown>;
  summary?: string;
  source?: string;
  dataStatus?: string;
  fetchedAt?: string;
};

const NEWS_PAGE_SIZE = 9;
const STOCK_PREVIEW_LIMIT = 8;
const QUICK_ANALYSIS_CACHE_MS = 2 * 60 * 1000;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const BANK_TICKER_ORDER = ['JPM', 'BAC', 'C', 'WFC', 'GS', 'MS', 'USB', 'PNC', 'SCHW', 'BLK', 'V', 'MA', 'PYPL', 'CME', 'ICE'];
const BANK_TICKER_SYMBOLS = new Set(BANK_TICKER_ORDER);

const BANK_EXCHANGES: Record<string, string> = {
  JPM: 'NYSE',
  BAC: 'NYSE',
  C: 'NYSE',
  WFC: 'NYSE',
  GS: 'NYSE',
  MS: 'NYSE',
  USB: 'NYSE',
  PNC: 'NYSE',
  TFC: 'NYSE',
  SCHW: 'NYSE',
  BLK: 'NYSE',
  V: 'NYSE',
  MA: 'NYSE',
  PYPL: 'NASDAQ',
  CME: 'NASDAQ',
  ICE: 'NYSE',
};

const CATEGORY_OPTIONS: Array<{ id: BankingCategory; ar: string; en: string; fr: string; sectors?: string[]; keywords?: string[] }> = [
  { id: 'all', ar: 'كل الأخبار', en: 'All news', fr: 'Toutes les actualités' },
  { id: 'large_banks', ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques', sectors: ['large_banks'], keywords: ['bank', 'deposit', 'loan', 'lender'] },
  { id: 'regional_banks', ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales', sectors: ['regional_banks'], keywords: ['regional bank', 'community bank'] },
  { id: 'investment_banks', ar: 'بنوك الاستثمار', en: 'Investment banks', fr: 'Banques d’investissement', sectors: ['investment_banks'], keywords: ['capital markets', 'ipo', 'deal', 'trading revenue'] },
  { id: 'payments', ar: 'المدفوعات', en: 'Payments', fr: 'Paiements', sectors: ['payments'], keywords: ['payment', 'card', 'transaction', 'visa', 'mastercard'] },
  { id: 'asset_management', ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs', sectors: ['asset_management', 'exchanges_services'], keywords: ['asset management', 'wealth management', 'aum', 'exchange', 'ratings'] },
  { id: 'rates', ar: 'الفائدة والسيولة', en: 'Rates and liquidity', fr: 'Taux et liquidité', keywords: ['interest rate', 'rates', 'fed', 'fomc', 'treasury', 'central bank', 'yield'] },
  { id: 'earnings', ar: 'النتائج والأرباح', en: 'Earnings', fr: 'Résultats', keywords: ['earnings', 'revenue', 'profit', 'quarter', 'guidance', 'net income'] },
  { id: 'dividends', ar: 'التوزيعات وإعادة الشراء', en: 'Dividends and buybacks', fr: 'Dividendes et rachats', keywords: ['dividend', 'buyback', 'capital return', 'repurchase'] },
  { id: 'regulation', ar: 'التنظيم والمخاطر', en: 'Regulation and risk', fr: 'Réglementation et risque', keywords: ['regulation', 'regulator', 'basel', 'capital requirement', 'lawsuit', 'compliance', 'fine'] },
];

const COPY = {
  ar: {
    badge: 'أبحاث القطاع البنكي',
    title: 'أخبار البنوك',
    description: 'متابعة مركزة لأسهم البنوك العالمية وأخبار القطاع والنتائج والتوزيعات والتنظيمات المؤثرة.',
    stockUpdate: 'آخر تحديث للأسعار',
    newsUpdate: 'آخر تحديث للأخبار',
    providerConnected: 'الخدمة متصلة',
    providerDelayed: 'بيانات متأخرة حسب مزود السوق',
    providerUnavailable: 'الخدمة غير متاحة',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث',
    marketStatus: 'حالة السوق',
    delayedQuote: 'متأخرة',
    dataSource: 'مزود البيانات',
    newsSource: 'مصادر الأخبار',
    bankingTicker: 'شريط أسهم البنوك',
    marketSummary: 'ملخص القطاع البنكي',
    bestBank: 'أفضل بنك أداءً',
    weakestBank: 'أضعف بنك أداءً',
    sectorAverage: 'متوسط حركة العينة',
    risingStocks: 'أسهم مرتفعة',
    fallingStocks: 'أسهم منخفضة',
    importantStory: 'أبرز خبر',
    bankStocks: 'أسهم بنكية للمتابعة',
    bankStocksDescription: 'بطاقات مختصرة تربط السعر الحالي بالتحليل الفني السريع والتحليل الكامل.',
    showAllStocks: 'عرض كل الأسهم',
    showLessStocks: 'عرض أقل',
    quickAnalysis: 'تحليل سريع',
    fullAnalysis: 'التحليل الكامل',
    addWatchlist: 'إضافة للمراقبة',
    details: 'التفاصيل',
    currentPrice: 'السعر الحالي',
    change: 'التغير',
    market: 'السوق',
    sector: 'الفئة',
    dividendYield: 'عائد التوزيع',
    marketCap: 'القيمة السوقية',
    unavailable: 'غير متاح',
    featuredNews: 'أهم أخبار البنوك',
    readNews: 'قراءة الخبر',
    translated: 'ترجمة آلية',
    originalText: 'عرض النص الأصلي',
    translatedText: 'عرض الترجمة',
    filters: 'البحث والتصفية',
    searchPlaceholder: 'ابحث في أخبار البنوك أو الرمز أو المصدر...',
    bankFilter: 'البنك / الرمز',
    allBanks: 'كل البنوك',
    marketFilter: 'الفئة',
    sourceFilter: 'المصدر',
    allSources: 'كل المصادر',
    periodFilter: 'الفترة',
    allPeriods: 'كل الفترات',
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوماً',
    categoryFilter: 'نوع الخبر',
    sort: 'الترتيب',
    latest: 'الأحدث',
    oldest: 'الأقدم',
    strongestMove: 'أقوى حركة سعرية',
    portfolioRelated: 'مرتبطة بمحفظتي',
    clearFilters: 'مسح الفلاتر',
    resultCount: 'عدد الأخبار',
    activeFilters: 'الفلاتر النشطة',
    bankingNews: 'تدفق الأخبار البنكية',
    bankingNewsDescription: 'أخبار مختصرة مع المصدر والوقت والرمز المرتبط وتحليل سريع عند توفره.',
    analyzeRelatedStock: 'تحليل السهم المرتبط',
    save: 'حفظ',
    share: 'مشاركة',
    loadMore: 'عرض المزيد',
    noResults: 'لا توجد أخبار مطابقة للفلاتر الحالية.',
    noResultsHint: 'جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر.',
    noNewsAvailable: 'لا توجد أخبار بنكية متاحة حالياً.',
    noNewsAvailableHint: 'لم تُرجع المصادر الحالية أخباراً بنكية قابلة للعرض. حاول التحديث لاحقاً.',
    tickerUnavailable: 'بيانات شريط الأسهم غير متاحة حالياً.',
    tickerUnavailableHint: 'سيظهر الشريط عند توفر أسعار البنوك من مزود السوق.',
    noSideData: 'لا توجد بيانات كافية حالياً.',
    providerError: 'تعذر تحديث البيانات حالياً. يتم عرض آخر بيانات متاحة إن وجدت.',
    retry: 'إعادة المحاولة',
    sideRailTitle: 'لوحة متابعة البنوك',
    watchedStocks: 'أكثر الأسهم متابعة',
    topStories: 'أهم الأخبار',
    sources: 'مصادر الأخبار',
    categories: 'فئات الأخبار',
    sourceDisclaimer: 'الأخبار والأسعار مجمعة من مزودين خارجيين وقد تكون متأخرة. هذه الصفحة لأغراض معلوماتية وتعليمية فقط ولا تعد توصية استثمارية.',
    quickTitle: 'معاينة التحليل السريع',
    quickLoading: 'جارٍ تحليل سهم',
    quickError: 'تعذر تحليل السهم حالياً. حاول مرة أخرى.',
    unsupportedSymbol: 'هذا الرمز غير مدعوم من مزود التحليل الحالي.',
    close: 'إغلاق',
    updateAnalysis: 'تحديث التحليل',
    openFullAnalysis: 'فتح التحليل الكامل',
    reading: 'القراءة الحالية',
    confidence: 'الثقة',
    risk: 'المخاطر',
    shortTrend: 'الاتجاه القصير',
    mediumTrend: 'الاتجاه المتوسط',
    rsi: 'RSI',
    macd: 'MACD',
    movingAverages: 'متوسط 20 / 50',
    support: 'الدعم الأقرب',
    resistance: 'المقاومة الأقرب',
    explanation: 'تفسير مختصر',
    buy: 'شراء',
    sell: 'بيع',
    neutral: 'محايد / انتظار',
    bullish: 'صاعد',
    bearish: 'هابط',
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'مرتفعة',
    panelNote: 'التحليل آلي وتعليمي ولا يمثل توصية مالية أو دعوة للشراء أو البيع.',
    escHint: 'اضغط Escape لإغلاق المعاينة.',
    noFeatured: 'لا توجد أخبار بارزة حالياً.',
    latestQuote: 'آخر سعر',
  },
  en: {
    badge: 'Banking sector research',
    title: 'Banking News',
    description: 'Focused coverage of global bank stocks, sector news, earnings, dividends, and regulation.',
    stockUpdate: 'Stock update',
    newsUpdate: 'News update',
    providerConnected: 'Service connected',
    providerDelayed: 'Delayed market data',
    providerUnavailable: 'Service unavailable',
    refresh: 'Refresh',
    refreshing: 'Refreshing',
    marketStatus: 'Market status',
    delayedQuote: 'Delayed',
    dataSource: 'Data provider',
    newsSource: 'News sources',
    bankingTicker: 'Bank ticker',
    marketSummary: 'Banking sector summary',
    bestBank: 'Best performer',
    weakestBank: 'Weakest performer',
    sectorAverage: 'Average move',
    risingStocks: 'Rising stocks',
    fallingStocks: 'Falling stocks',
    importantStory: 'Top story',
    bankStocks: 'Bank stocks to watch',
    bankStocksDescription: 'Compact cards connecting live quotes with quick and full analysis.',
    showAllStocks: 'Show all stocks',
    showLessStocks: 'Show less',
    quickAnalysis: 'Quick analysis',
    fullAnalysis: 'Full analysis',
    addWatchlist: 'Add to watchlist',
    details: 'Details',
    currentPrice: 'Current price',
    change: 'Change',
    market: 'Market',
    sector: 'Category',
    dividendYield: 'Dividend yield',
    marketCap: 'Market cap',
    unavailable: 'Unavailable',
    featuredNews: 'Featured banking news',
    readNews: 'Read story',
    translated: 'Automated translation',
    originalText: 'Show original',
    translatedText: 'Show translation',
    filters: 'Search and filters',
    searchPlaceholder: 'Search banking news, symbol, or source...',
    bankFilter: 'Bank / symbol',
    allBanks: 'All banks',
    marketFilter: 'Category',
    sourceFilter: 'Source',
    allSources: 'All sources',
    periodFilter: 'Period',
    allPeriods: 'All periods',
    today: 'Today',
    week: 'Last 7 days',
    month: 'Last 30 days',
    categoryFilter: 'News type',
    sort: 'Sort',
    latest: 'Latest',
    oldest: 'Oldest',
    strongestMove: 'Strongest price move',
    portfolioRelated: 'Related to portfolio',
    clearFilters: 'Clear filters',
    resultCount: 'Stories',
    activeFilters: 'Active filters',
    bankingNews: 'Banking news feed',
    bankingNewsDescription: 'Compact stories with source, time, related symbol, and quick analysis when available.',
    analyzeRelatedStock: 'Analyze related stock',
    save: 'Save',
    share: 'Share',
    loadMore: 'Load more',
    noResults: 'No news matches the current filters.',
    noResultsHint: 'Try changing the search terms or removing filters.',
    noNewsAvailable: 'No banking news is available right now.',
    noNewsAvailableHint: 'The current sources did not return displayable banking stories. Try refreshing later.',
    tickerUnavailable: 'Ticker data is unavailable right now.',
    tickerUnavailableHint: 'The strip will appear when bank prices are available from the market provider.',
    noSideData: 'Not enough data is available yet.',
    providerError: 'Unable to refresh data now. Showing the last available data where possible.',
    retry: 'Retry',
    sideRailTitle: 'Banking watch panel',
    watchedStocks: 'Most watched stocks',
    topStories: 'Top stories',
    sources: 'News sources',
    categories: 'News categories',
    sourceDisclaimer: 'News and prices are aggregated from external providers and may be delayed. This page is informational and educational only, not investment advice.',
    quickTitle: 'Quick analysis preview',
    quickLoading: 'Analyzing',
    quickError: 'Unable to analyze this stock now. Try again.',
    unsupportedSymbol: 'This symbol is not supported by the current analysis provider.',
    close: 'Close',
    updateAnalysis: 'Refresh analysis',
    openFullAnalysis: 'Open full analysis',
    reading: 'Current reading',
    confidence: 'Confidence',
    risk: 'Risk',
    shortTrend: 'Short trend',
    mediumTrend: 'Medium trend',
    rsi: 'RSI',
    macd: 'MACD',
    movingAverages: 'MA 20 / MA 50',
    support: 'Nearest support',
    resistance: 'Nearest resistance',
    explanation: 'Short explanation',
    buy: 'Buy',
    sell: 'Sell',
    neutral: 'Neutral / wait',
    bullish: 'Bullish',
    bearish: 'Bearish',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    panelNote: 'Automated educational analysis only. Not financial advice or a buy/sell recommendation.',
    escHint: 'Press Escape to close the preview.',
    noFeatured: 'No featured stories available.',
    latestQuote: 'Latest quote',
  },
  fr: {
    badge: 'Recherche secteur bancaire',
    title: 'Actualités bancaires',
    description: 'Couverture ciblée des actions bancaires, résultats, dividendes et réglementation.',
    stockUpdate: 'Mise à jour des cours',
    newsUpdate: 'Mise à jour des actualités',
    providerConnected: 'Service connecté',
    providerDelayed: 'Données de marché différées',
    providerUnavailable: 'Service indisponible',
    refresh: 'Actualiser',
    refreshing: 'Actualisation',
    marketStatus: 'État du marché',
    delayedQuote: 'Différé',
    dataSource: 'Fournisseur',
    newsSource: 'Sources',
    bankingTicker: 'Ticker bancaire',
    marketSummary: 'Synthèse bancaire',
    bestBank: 'Meilleure performance',
    weakestBank: 'Plus faible performance',
    sectorAverage: 'Variation moyenne',
    risingStocks: 'Actions en hausse',
    fallingStocks: 'Actions en baisse',
    importantStory: 'Article principal',
    bankStocks: 'Actions bancaires à suivre',
    bankStocksDescription: 'Cartes compactes reliant les cours à l’analyse rapide et complète.',
    showAllStocks: 'Tout afficher',
    showLessStocks: 'Réduire',
    quickAnalysis: 'Analyse rapide',
    fullAnalysis: 'Analyse complète',
    addWatchlist: 'Ajouter à la liste',
    details: 'Détails',
    currentPrice: 'Prix actuel',
    change: 'Variation',
    market: 'Marché',
    sector: 'Catégorie',
    dividendYield: 'Rendement',
    marketCap: 'Capitalisation',
    unavailable: 'Indisponible',
    featuredNews: 'À la une banques',
    readNews: 'Lire',
    translated: 'Traduction automatique',
    originalText: 'Voir l’original',
    translatedText: 'Voir la traduction',
    filters: 'Recherche et filtres',
    searchPlaceholder: 'Rechercher actualité, symbole ou source...',
    bankFilter: 'Banque / symbole',
    allBanks: 'Toutes les banques',
    marketFilter: 'Catégorie',
    sourceFilter: 'Source',
    allSources: 'Toutes les sources',
    periodFilter: 'Période',
    allPeriods: 'Toutes les périodes',
    today: 'Aujourd’hui',
    week: '7 derniers jours',
    month: '30 derniers jours',
    categoryFilter: 'Type',
    sort: 'Tri',
    latest: 'Plus récent',
    oldest: 'Plus ancien',
    strongestMove: 'Plus forte variation',
    portfolioRelated: 'Lié au portefeuille',
    clearFilters: 'Effacer',
    resultCount: 'Articles',
    activeFilters: 'Filtres actifs',
    bankingNews: 'Flux bancaire',
    bankingNewsDescription: 'Articles compacts avec source, heure, symbole lié et analyse rapide.',
    analyzeRelatedStock: 'Analyser l’action liée',
    save: 'Enregistrer',
    share: 'Partager',
    loadMore: 'Voir plus',
    noResults: 'Aucune actualité ne correspond aux filtres.',
    noResultsHint: 'Essayez de modifier la recherche ou les filtres.',
    noNewsAvailable: 'Aucune actualité bancaire n’est disponible pour le moment.',
    noNewsAvailableHint: 'Les sources actuelles n’ont renvoyé aucun article bancaire exploitable. Réessayez plus tard.',
    tickerUnavailable: 'Les données du ticker sont indisponibles pour le moment.',
    tickerUnavailableHint: 'Le ruban apparaîtra lorsque les cours bancaires seront disponibles.',
    noSideData: 'Données encore insuffisantes.',
    providerError: 'Impossible de mettre à jour les données. Les dernières données disponibles restent affichées.',
    retry: 'Réessayer',
    sideRailTitle: 'Suivi bancaire',
    watchedStocks: 'Actions suivies',
    topStories: 'Articles clés',
    sources: 'Sources',
    categories: 'Catégories',
    sourceDisclaimer: 'Les actualités et cours proviennent de fournisseurs externes et peuvent être différés. Informations éducatives uniquement.',
    quickTitle: 'Aperçu d’analyse rapide',
    quickLoading: 'Analyse de',
    quickError: 'Impossible d’analyser cette action. Réessayez.',
    unsupportedSymbol: 'Ce symbole n’est pas pris en charge par le fournisseur actuel.',
    close: 'Fermer',
    updateAnalysis: 'Actualiser l’analyse',
    openFullAnalysis: 'Ouvrir l’analyse complète',
    reading: 'Lecture actuelle',
    confidence: 'Confiance',
    risk: 'Risque',
    shortTrend: 'Tendance courte',
    mediumTrend: 'Tendance moyenne',
    rsi: 'RSI',
    macd: 'MACD',
    movingAverages: 'MM 20 / 50',
    support: 'Support proche',
    resistance: 'Résistance proche',
    explanation: 'Explication courte',
    buy: 'Achat',
    sell: 'Vente',
    neutral: 'Neutre / attente',
    bullish: 'Haussier',
    bearish: 'Baissier',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    panelNote: 'Analyse automatisée à but éducatif uniquement. Ce n’est pas un conseil financier.',
    escHint: 'Appuyez sur Escape pour fermer.',
    noFeatured: 'Aucun article à la une.',
    latestQuote: 'Dernier cours',
  },
} as const;

type Copy = (typeof COPY)[LangCode];

function localeFor(lang: LangCode) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatMoney(value: number | null | undefined, currency = 'USD', locale = 'ar-KW') {
  if (!isFiniteNumber(value)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 4,
  }).format(value);
}

function formatCompactNumber(value: number | null | undefined, locale = 'ar-KW') {
  if (!isFiniteNumber(value)) return '';
  return new Intl.NumberFormat(locale, {
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined, locale = 'ar-KW') {
  if (!isFiniteNumber(value)) return '';
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value)}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function relativeTime(value: string | null | undefined, locale: string) {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (absSeconds < 60) return formatter.format(diffSeconds, 'second');
  if (absSeconds < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (absSeconds < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86400), 'day');
}

function changeTone(value: number | null | undefined): Tone {
  if (!isFiniteNumber(value) || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function normalizeBankSymbol(input: unknown, fallbackExchange?: string): QuickAnalysisState | null {
  const compact = String(input ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!compact || !/^[A-Z.]{1,12}$/.test(compact)) return null;
  return {
    symbol: compact,
    providerSymbol: compact,
    exchange: fallbackExchange ?? BANK_EXCHANGES[compact] ?? 'NYSE',
    assetType: 'stock',
    timeframe: '1D',
  };
}

function buildAnalysisUrl(input: QuickAnalysisState, autoRun = false) {
  const params = new URLSearchParams({
    symbol: input.providerSymbol || input.symbol,
    assetType: 'stock',
    timeframe: input.timeframe || '1D',
  });
  if (autoRun) params.set('autoRun', '1');
  return `/market-analysis?${params.toString()}`;
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map(value => (value ? new Date(value).getTime() : NaN))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return '';
  return new Date(Math.max(...timestamps)).toISOString();
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

function displayTitle(item: BankNewsItem) {
  return (item.title || item.headline || item.titleOriginal || '').trim();
}

function displaySummary(item: BankNewsItem) {
  return (item.summary || item.summaryOriginal || '').trim();
}

function originalTitle(item: BankNewsItem) {
  return (item.titleOriginal || item.headline || item.title || '').trim();
}

function originalSummary(item: BankNewsItem) {
  return (item.summaryOriginal || item.summary || '').trim();
}

function textForSearch(item: BankNewsItem) {
  return [
    displayTitle(item),
    displaySummary(item),
    item.source,
    item.companyName,
    item.ticker,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function normalizeTitleForKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

function dedupeNews(items: BankNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const urlKey = item.url?.trim().toLowerCase();
    const titleKey = normalizeTitleForKey(displayTitle(item) || originalTitle(item));
    const key = urlKey || `${item.source.toLowerCase()}|${titleKey}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemMatchesCategory(item: BankNewsItem, categoryId: BankingCategory) {
  if (categoryId === 'all') return true;
  const config = CATEGORY_OPTIONS.find(option => option.id === categoryId);
  if (!config) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (config.sectors?.some(sector => sectors.has(sector))) return true;
  const searchable = textForSearch(item);
  return Boolean(config.keywords?.some(keyword => searchable.includes(keyword.toLowerCase())));
}

function itemMatchesDate(item: BankNewsItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const time = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(time)) return false;
  const age = Date.now() - time;
  if (filter === 'today') return new Date(item.publishedAt).toDateString() === new Date().toDateString();
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
}

function sourceCount(items: BankNewsItem[]) {
  const counts = new Map<string, number>();
  items.forEach(item => {
    counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

function categoryName(id: BankingCategory, lang: LangCode) {
  const item = CATEGORY_OPTIONS.find(option => option.id === id);
  if (!item) return id;
  return item[lang] ?? item.ar;
}

function sectorLabel(sector: string | undefined, lang: LangCode, text: Copy) {
  if (!sector) return text.unavailable;
  const match = CATEGORY_OPTIONS.find(option => option.sectors?.includes(sector));
  if (match) return match[lang] ?? match.ar;
  return sector.replace(/_/g, ' ');
}

function safeExternalUrl(url: string | undefined) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function readInitialParam(name: string, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function providerStatusText(hasTicker: boolean, hasNews: boolean, hasError: boolean, text: Copy) {
  if (hasError && !hasTicker && !hasNews) return text.providerUnavailable;
  if (hasTicker || hasNews) return text.providerDelayed;
  return text.providerUnavailable;
}

function analysisSignal(result: QuickAnalysisResult | null, text: Copy) {
  if (!result?.trend) return text.neutral;
  const trend = String(result.trend).toLowerCase();
  if (trend === 'bullish') return text.buy;
  if (trend === 'bearish') return text.sell;
  return text.neutral;
}

function trendText(value: unknown, text: Copy) {
  const trend = String(value ?? '').toLowerCase();
  if (trend === 'bullish') return text.bullish;
  if (trend === 'bearish') return text.bearish;
  if (trend === 'neutral') return text.neutral;
  return text.unavailable;
}

function riskText(value: unknown, text: Copy) {
  const risk = String(value ?? '').toLowerCase();
  if (risk === 'low') return text.low;
  if (risk === 'medium') return text.medium;
  if (risk === 'high') return text.high;
  return text.unavailable;
}

function confidenceFromResult(result: QuickAnalysisResult | null) {
  if (!result) return null;
  const rsi = result.indicators?.rsi;
  const volatility = result.indicators?.volatility;
  const hasLevels = isFiniteNumber(result.levels?.support) && isFiniteNumber(result.levels?.resistance);
  let score = 45;
  if (isFiniteNumber(rsi)) score += 18;
  if (isFiniteNumber(volatility)) score += 12;
  if (hasLevels) score += 14;
  if (result.summary) score += 8;
  return Math.min(85, score);
}

function emaRelationship(result: QuickAnalysisResult | null, text: Copy) {
  const sma20 = result?.indicators?.sma20;
  const sma50 = result?.indicators?.sma50;
  if (!isFiniteNumber(sma20) || !isFiniteNumber(sma50)) return text.unavailable;
  if (sma20 > sma50) return text.bullish;
  if (sma20 < sma50) return text.bearish;
  return text.neutral;
}

function macdFallback(result: QuickAnalysisResult | null, text: Copy) {
  if (!result) return text.unavailable;
  const tech = result.technicals ?? {};
  const value = tech.macd ?? tech.macdTrend ?? tech.macd_status;
  if (typeof value === 'string') return trendText(value, text);
  return text.unavailable;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <article className={`bankMetricCard tone-${tone}`}>
      <span className="bankMetricIcon" aria-hidden="true"><Icon size={19} /></span>
      <span className="bankMetricLabel">{label}</span>
      <strong className="bankMetricValue" dir="auto">{value}</strong>
      {detail ? <span className="bankMetricDetail">{detail}</span> : null}
    </article>
  );
}

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bankSkeletonCard ${compact ? 'compact' : ''}`} aria-hidden="true">
      <span />
      <strong />
      <em />
      <i />
    </div>
  );
}

function HeaderMeta({ icon: Icon, label, value, tone = 'neutral' }: { icon: LucideIcon; label: string; value: string; tone?: Tone }) {
  return (
    <div className={`bankHeaderMeta tone-${tone}`}>
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
      <strong dir="auto">{value}</strong>
    </div>
  );
}

function BankingHeader({
  text,
  locale,
  lastStockUpdate,
  lastNewsUpdate,
  refreshing,
  hasTicker,
  hasNews,
  hasError,
  onRefresh,
}: {
  text: Copy;
  locale: string;
  lastStockUpdate: string;
  lastNewsUpdate: string;
  refreshing: boolean;
  hasTicker: boolean;
  hasNews: boolean;
  hasError: boolean;
  onRefresh: () => void;
}) {
  const status = providerStatusText(hasTicker, hasNews, hasError, text);
  return (
    <section className="bankHero" aria-labelledby="banking-page-title">
      <div className="bankHeroCopy">
        <span className="bankHeroBadge"><Landmark size={15} />{text.badge}</span>
        <h1 id="banking-page-title">{text.title}</h1>
        <p>{text.description}</p>
      </div>
      <div className="bankHeroStatus">
        <HeaderMeta
          icon={Clock3}
          label={text.stockUpdate}
          value={lastStockUpdate ? relativeTime(lastStockUpdate, locale) : text.unavailable}
          tone={hasTicker ? 'warning' : 'neutral'}
        />
        <HeaderMeta
          icon={Newspaper}
          label={text.newsUpdate}
          value={lastNewsUpdate ? relativeTime(lastNewsUpdate, locale) : text.unavailable}
          tone={hasNews ? 'neutral' : 'warning'}
        />
        <HeaderMeta
          icon={hasError && !hasTicker && !hasNews ? AlertTriangle : CheckCircle2}
          label={text.marketStatus}
          value={status}
          tone={hasError && !hasTicker && !hasNews ? 'warning' : 'neutral'}
        />
        <button className="bankPrimaryButton" type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 size={17} className="spin" /> : <RefreshCcw size={17} />}
          {refreshing ? text.refreshing : text.refresh}
        </button>
      </div>
    </section>
  );
}

function BankingTicker({
  items,
  text,
  lang,
  locale,
  loading,
}: {
  items: BankTickerItem[];
  text: Copy;
  lang: LangCode;
  locale: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="bankPanel" aria-label={text.bankingTicker}>
        <div className="bankTickerSkeletons">
          {Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} compact />)}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="bankPanel tickerPanel" aria-labelledby="banking-ticker-title">
        <div className="sectionHead compact">
          <div>
            <h2 id="banking-ticker-title">{text.bankingTicker}</h2>
            <p>{text.providerDelayed}</p>
          </div>
        </div>
        <div className="bankInlineState" role="status">
          <AlertTriangle size={19} />
          <span>
            <strong>{text.tickerUnavailable}</strong>
            <em>{text.tickerUnavailableHint}</em>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="bankPanel tickerPanel" aria-labelledby="banking-ticker-title">
      <div className="sectionHead compact">
        <div>
          <h2 id="banking-ticker-title">{text.bankingTicker}</h2>
          <p>{text.providerDelayed}</p>
        </div>
      </div>
      <div className="bankTickerViewport">
        <div className="bankTickerTrack" role="list" aria-label={text.bankingTicker}>
          {([0, 1] as const).map(loop => items.map(item => (
            <article
              className="bankTickerItem"
              key={`${loop}-${item.symbol}`}
              role={loop === 0 ? 'listitem' : undefined}
              aria-hidden={loop === 1 ? true : undefined}
            >
              <AssetAvatar symbol={item.symbol} name={item.name} assetType="stock" size="sm" decorative />
              <div>
                <strong dir="ltr">{item.symbol}</strong>
                <span>{item.name}</span>
              </div>
              <div className="tickerNumbers">
                <b dir="ltr">{formatMoney(item.price, item.currency, locale) || text.unavailable}</b>
                <em className={`tone-${changeTone(item.changePercent)}`} dir="ltr">
                  {formatPercent(item.changePercent, locale) || text.unavailable}
                </em>
              </div>
              <small>{sectorLabel(item.sector, lang, text)} · {text.delayedQuote}</small>
            </article>
          )))}
        </div>
      </div>
    </section>
  );
}

function BankingMarketSummary({
  text,
  locale,
  stocks,
  featuredStory,
  loading,
}: {
  text: Copy;
  locale: string;
  stocks: BankTickerItem[];
  featuredStory?: BankNewsItem;
  loading: boolean;
}) {
  const validStocks = stocks.filter(item => isFiniteNumber(item.changePercent));
  const best = validStocks.length ? [...validStocks].sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))[0] : null;
  const weakest = validStocks.length ? [...validStocks].sort((a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity))[0] : null;
  const average = validStocks.length
    ? validStocks.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / validStocks.length
    : null;
  const rising = validStocks.filter(item => (item.changePercent ?? 0) > 0).length;
  const falling = validStocks.filter(item => (item.changePercent ?? 0) < 0).length;

  return (
    <section className="bankSection" aria-labelledby="banking-summary-title">
      <div className="sectionHead">
        <div>
          <h2 id="banking-summary-title">{text.marketSummary}</h2>
          <p>{text.providerDelayed}</p>
        </div>
      </div>
      <div className="bankMetricGrid">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
        ) : (
          <>
            <MetricCard
              icon={TrendingUp}
              label={text.bestBank}
              value={best ? `${best.symbol} ${formatPercent(best.changePercent, locale)}` : text.unavailable}
              detail={best?.name}
              tone="positive"
            />
            <MetricCard
              icon={TrendingDown}
              label={text.weakestBank}
              value={weakest ? `${weakest.symbol} ${formatPercent(weakest.changePercent, locale)}` : text.unavailable}
              detail={weakest?.name}
              tone="negative"
            />
            <MetricCard
              icon={Gauge}
              label={text.sectorAverage}
              value={formatPercent(average, locale) || text.unavailable}
              detail={`${validStocks.length} ${text.resultCount}`}
              tone={changeTone(average)}
            />
            <MetricCard icon={ArrowUpRight} label={text.risingStocks} value={formatCompactNumber(rising, locale) || '0'} detail={text.latestQuote} tone="positive" />
            <MetricCard icon={TrendingDown} label={text.fallingStocks} value={formatCompactNumber(falling, locale) || '0'} detail={text.latestQuote} tone="negative" />
            <MetricCard
              icon={Newspaper}
              label={text.importantStory}
              value={featuredStory ? displayTitle(featuredStory) : text.unavailable}
              detail={featuredStory ? `${featuredStory.source} · ${relativeTime(featuredStory.publishedAt, locale)}` : undefined}
            />
          </>
        )}
      </div>
    </section>
  );
}

function BankStockCard({
  item,
  text,
  lang,
  locale,
  onQuickAnalysis,
}: {
  item: BankTickerItem;
  text: Copy;
  lang: LangCode;
  locale: string;
  onQuickAnalysis: (item: BankTickerItem, trigger: HTMLButtonElement | null) => void;
}) {
  const normalized = normalizeBankSymbol(item.symbol, BANK_EXCHANGES[item.symbol]);
  const analysisUrl = normalized ? buildAnalysisUrl({ ...normalized, companyName: item.name, currency: item.currency }, true) : '/market-analysis';
  const exchange = BANK_EXCHANGES[item.symbol] ?? text.unavailable;
  const price = formatMoney(item.price, item.currency, locale) || text.unavailable;
  const change = formatPercent(item.changePercent, locale) || text.unavailable;
  return (
    <article className="bankStockCard">
      <div className="bankStockHeader">
        <AssetAvatar className="bankStockLogo" symbol={item.symbol} name={item.name} assetType="stock" size="md" decorative />
        <div>
          <h3>{item.name}</h3>
          <p><span dir="ltr">{item.symbol}</span> · {sectorLabel(item.sector, lang, text)}</p>
        </div>
        <span className={`bankQuoteBadge tone-${changeTone(item.changePercent)}`} dir="ltr">{change}</span>
      </div>

      <div className="bankStockPriceRow">
        <span>
          <small>{text.currentPrice}</small>
          <strong dir="ltr">{price}</strong>
        </span>
        <em className={`tone-${changeTone(item.changePercent)}`} dir="ltr">{change}</em>
      </div>

      <dl className="bankStockMetaGrid">
        <div>
          <dt>{text.market}</dt>
          <dd dir={exchange === text.unavailable ? undefined : 'ltr'}>{exchange}</dd>
        </div>
        <div>
          <dt>{text.marketStatus}</dt>
          <dd>{text.delayedQuote}</dd>
        </div>
      </dl>

      <div className="bankStockActions">
        <button type="button" className="bankPrimaryMini" onClick={event => onQuickAnalysis(item, event.currentTarget)}>
          <LineChart size={16} />
          {text.quickAnalysis}
        </button>
        <a className="bankSecondaryMini" href={analysisUrl}>
          <BarChart3 size={16} />
          {text.fullAnalysis}
        </a>
        <a className="bankIconMini" href={`/market-analysis?tab=watchlist&symbol=${encodeURIComponent(item.symbol)}`} aria-label={`${text.addWatchlist} ${item.symbol}`}>
          <BookmarkPlus size={17} />
        </a>
      </div>
    </article>
  );
}

function BankStockSection({
  text,
  lang,
  locale,
  stocks,
  loading,
  onQuickAnalysis,
}: {
  text: Copy;
  lang: LangCode;
  locale: string;
  stocks: BankTickerItem[];
  loading: boolean;
  onQuickAnalysis: (item: BankTickerItem, trigger: HTMLButtonElement | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? stocks : stocks.slice(0, STOCK_PREVIEW_LIMIT);

  return (
    <section className="bankSection" aria-labelledby="banking-stocks-title">
      <div className="sectionHead">
        <div>
          <h2 id="banking-stocks-title">{text.bankStocks}</h2>
          <p>{text.bankStocksDescription}</p>
        </div>
        {stocks.length > STOCK_PREVIEW_LIMIT ? (
          <button className="bankSecondaryButton" type="button" onClick={() => setShowAll(current => !current)}>
            {showAll ? text.showLessStocks : text.showAllStocks}
            <ChevronDown size={16} className={showAll ? 'rotate180' : ''} />
          </button>
        ) : null}
      </div>
      <div className="bankStockGrid">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
          : visible.map(item => (
            <BankStockCard
              key={item.symbol}
              item={item}
              text={text}
              lang={lang}
              locale={locale}
              onQuickAnalysis={onQuickAnalysis}
            />
          ))}
      </div>
    </section>
  );
}

function NewsMeta({
  item,
  text,
  locale,
  compact = false,
}: {
  item: BankNewsItem;
  text: Copy;
  locale: string;
  compact?: boolean;
}) {
  return (
    <div className={`newsMeta ${compact ? 'compact' : ''}`}>
      <span><Newspaper size={14} />{item.source}</span>
      <span><Clock3 size={14} />{relativeTime(item.publishedAt, locale) || formatDateTime(item.publishedAt, locale)}</span>
      {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
      {item.isTranslated ? <span className="aiBadge"><Sparkles size={13} />{text.translated}</span> : null}
    </div>
  );
}

function FeaturedNews({
  text,
  locale,
  items,
  loading,
  onQuickAnalysisSymbol,
}: {
  text: Copy;
  locale: string;
  items: BankNewsItem[];
  loading: boolean;
  onQuickAnalysisSymbol: (symbol: string | undefined, name?: string, trigger?: HTMLButtonElement | null) => void;
}) {
  const [lead, ...secondary] = items;
  if (loading) {
    return (
      <section className="bankSection">
        <div className="featuredGrid">
          <SkeletonCard />
          <div className="featuredSecondaryStack">
            <SkeletonCard compact />
            <SkeletonCard compact />
            <SkeletonCard compact />
          </div>
        </div>
      </section>
    );
  }

  if (!lead) {
    return (
      <section className="bankPanel emptyMini">
        <Newspaper size={24} />
        <strong>{text.noFeatured}</strong>
      </section>
    );
  }

  return (
    <section className="bankSection" aria-labelledby="banking-featured-title">
      <div className="sectionHead compact">
        <div>
          <h2 id="banking-featured-title">{text.featuredNews}</h2>
        </div>
      </div>
      <div className="featuredGrid">
        <article className="leadStory">
          <div className="leadVisual" aria-hidden="true">
            <Landmark size={34} />
            <span>{lead.ticker || 'BANK'}</span>
          </div>
          <div className="leadStoryBody">
            <NewsMeta item={lead} text={text} locale={locale} />
            <h3 dir="auto">{displayTitle(lead)}</h3>
            {displaySummary(lead) ? <p dir="auto">{displaySummary(lead)}</p> : null}
            <div className="leadActions">
              {safeExternalUrl(lead.url) ? (
                <a className="bankPrimaryMini" href={safeExternalUrl(lead.url)} target="_blank" rel="noopener noreferrer nofollow">
                  {text.readNews}
                  <ExternalLink size={15} />
                </a>
              ) : null}
              {lead.ticker ? (
                <button type="button" className="bankSecondaryMini" onClick={event => onQuickAnalysisSymbol(lead.ticker, lead.companyName, event.currentTarget)}>
                  <LineChart size={15} />
                  {text.analyzeRelatedStock}
                </button>
              ) : null}
            </div>
          </div>
        </article>
        <div className="featuredSecondaryStack">
          {secondary.slice(0, 3).map(item => (
            <article className="secondaryStory" key={item.id}>
              <NewsMeta item={item} text={text} locale={locale} compact />
              <h3 dir="auto">{displayTitle(item)}</h3>
              <div className="secondaryStoryActions">
                {safeExternalUrl(item.url) ? (
                  <a href={safeExternalUrl(item.url)} target="_blank" rel="noopener noreferrer nofollow">
                    {text.readNews}
                    <ExternalLink size={14} />
                  </a>
                ) : null}
                {item.ticker ? (
                  <button type="button" onClick={event => onQuickAnalysisSymbol(item.ticker, item.companyName, event.currentTarget)}>
                    {text.quickAnalysis}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BankingFilters({
  text,
  lang,
  query,
  setQuery,
  symbol,
  setSymbol,
  category,
  setCategory,
  source,
  setSource,
  period,
  setPeriod,
  sort,
  setSort,
  sources,
  stocks,
  count,
  activeFilters,
  onClear,
  loading,
}: {
  text: Copy;
  lang: LangCode;
  query: string;
  setQuery: (value: string) => void;
  symbol: string;
  setSymbol: (value: string) => void;
  category: BankingCategory;
  setCategory: (value: BankingCategory) => void;
  source: string;
  setSource: (value: string) => void;
  period: TimeFilter;
  setPeriod: (value: TimeFilter) => void;
  sort: SortMode;
  setSort: (value: SortMode) => void;
  sources: string[];
  stocks: BankTickerItem[];
  count: number;
  activeFilters: Array<{ key: string; label: string; onRemove: () => void }>;
  onClear: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="bankFilterPanel" aria-labelledby="banking-filter-title">
      <div className="filterHeader">
        <div>
          <h2 id="banking-filter-title"><Filter size={18} />{text.filters}</h2>
          <p>{text.resultCount}: <strong dir="ltr">{count}</strong></p>
        </div>
        <button className="bankSecondaryButton mobileFilterToggle" type="button" aria-expanded={open} onClick={() => setOpen(current => !current)}>
          <Filter size={16} />
          {text.filters}
        </button>
        {activeFilters.length > 0 ? (
          <button className="bankTextButton" type="button" onClick={onClear}>{text.clearFilters}</button>
        ) : null}
      </div>
      <div className={`filterGrid ${open ? 'open' : ''}`}>
        <label className="filterField searchField">
          <span>{text.filters}</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchPlaceholder} />
          </div>
        </label>
        <label className="filterField">
          <span>{text.bankFilter}</span>
          <select value={symbol} onChange={event => setSymbol(event.target.value)}>
            <option value="all">{text.allBanks}</option>
            {stocks.map(item => (
              <option key={item.symbol} value={item.symbol}>{item.symbol} · {item.name}</option>
            ))}
          </select>
        </label>
        <label className="filterField">
          <span>{text.categoryFilter}</span>
          <select value={category} onChange={event => setCategory(event.target.value as BankingCategory)}>
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>{option[lang] ?? option.ar}</option>
            ))}
          </select>
        </label>
        <label className="filterField">
          <span>{text.sourceFilter}</span>
          <select value={source} onChange={event => setSource(event.target.value)}>
            <option value="all">{text.allSources}</option>
            {sources.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="filterField">
          <span>{text.periodFilter}</span>
          <select value={period} onChange={event => setPeriod(event.target.value as TimeFilter)}>
            <option value="all">{text.allPeriods}</option>
            <option value="today">{text.today}</option>
            <option value="week">{text.week}</option>
            <option value="month">{text.month}</option>
          </select>
        </label>
        <label className="filterField">
          <span>{text.sort}</span>
          <select value={sort} onChange={event => setSort(event.target.value as SortMode)}>
            <option value="latest">{text.latest}</option>
            <option value="oldest">{text.oldest}</option>
            <option value="strongestMove">{text.strongestMove}</option>
          </select>
        </label>
      </div>
      <div className="activeChips" aria-label={text.activeFilters}>
        {loading ? <span className="refreshingChip"><Loader2 size={13} className="spin" />{text.refreshing}</span> : null}
        {activeFilters.map(filter => (
          <button type="button" key={filter.key} onClick={filter.onRemove}>
            {filter.label}
            <X size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}

function BankingNewsCard({
  item,
  text,
  locale,
  onQuickAnalysisSymbol,
}: {
  item: BankNewsItem;
  text: Copy;
  locale: string;
  onQuickAnalysisSymbol: (symbol: string | undefined, name?: string, trigger?: HTMLButtonElement | null) => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const title = showOriginal ? originalTitle(item) : displayTitle(item);
  const summary = showOriginal ? originalSummary(item) : displaySummary(item);
  const link = safeExternalUrl(item.url);
  return (
    <article className="newsCard">
      <div className="newsCardHeader">
        <NewsMeta item={item} text={text} locale={locale} />
        {item.impact ? <span className="impactBadge">{item.impact}</span> : null}
      </div>
      <h3 dir="auto">{title}</h3>
      {summary ? <p dir="auto">{summary}</p> : null}
      <div className="newsStockContext">
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {isFiniteNumber(item.price) ? <strong dir="ltr">{formatMoney(item.price, 'USD', locale)}</strong> : null}
        {isFiniteNumber(item.changePercent) ? <em className={`tone-${changeTone(item.changePercent)}`} dir="ltr">{formatPercent(item.changePercent, locale)}</em> : null}
      </div>
      <div className="newsCardFooter">
        <div className="newsCardActions">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer nofollow">
              {text.readNews}
              <ExternalLink size={15} />
            </a>
          ) : null}
          {item.ticker ? (
            <button type="button" onClick={event => onQuickAnalysisSymbol(item.ticker, item.companyName, event.currentTarget)}>
              <LineChart size={15} />
              {text.analyzeRelatedStock}
            </button>
          ) : null}
          {item.isTranslated ? (
            <button type="button" onClick={() => setShowOriginal(current => !current)}>
              {showOriginal ? text.translatedText : text.originalText}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BankingNewsFeed({
  text,
  locale,
  items,
  loading,
  error,
  hasAnyNews,
  total,
  visibleCount,
  onLoadMore,
  onClear,
  onRetry,
  onQuickAnalysisSymbol,
}: {
  text: Copy;
  locale: string;
  items: BankNewsItem[];
  loading: boolean;
  error?: string;
  hasAnyNews: boolean;
  total: number;
  visibleCount: number;
  onLoadMore: () => void;
  onClear: () => void;
  onRetry: () => void;
  onQuickAnalysisSymbol: (symbol: string | undefined, name?: string, trigger?: HTMLButtonElement | null) => void;
}) {
  const emptyState = error
    ? {
      icon: AlertTriangle,
      title: text.providerError,
      hint: '',
      action: text.retry,
      onAction: onRetry,
    }
    : hasAnyNews
      ? {
        icon: Search,
        title: text.noResults,
        hint: text.noResultsHint,
        action: text.clearFilters,
        onAction: onClear,
      }
      : {
        icon: Newspaper,
        title: text.noNewsAvailable,
        hint: text.noNewsAvailableHint,
        action: text.retry,
        onAction: onRetry,
      };
  const EmptyIcon = emptyState.icon;

  return (
    <section className="bankPanel" aria-labelledby="banking-feed-title">
      <div className="sectionHead">
        <div>
          <h2 id="banking-feed-title">{text.bankingNews}</h2>
          <p>{text.bankingNewsDescription}</p>
        </div>
        <span className="resultsPill">{text.resultCount}: <strong dir="ltr">{total}</strong></span>
      </div>
      <div className="newsFeedList">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
        ) : items.length > 0 ? (
          items.map(item => (
            <BankingNewsCard
              key={item.id}
              item={item}
              text={text}
              locale={locale}
              onQuickAnalysisSymbol={onQuickAnalysisSymbol}
            />
          ))
        ) : (
          <div className="bankEmptyState">
            <EmptyIcon size={26} />
            <strong>{emptyState.title}</strong>
            {emptyState.hint ? <p>{emptyState.hint}</p> : null}
            <button className="bankSecondaryButton" type="button" onClick={emptyState.onAction}>{emptyState.action}</button>
          </div>
        )}
      </div>
      {!loading && visibleCount < total ? (
        <button className="bankLoadMore" type="button" onClick={onLoadMore}>{text.loadMore}</button>
      ) : null}
    </section>
  );
}

function BankingSideRail({
  text,
  lang,
  locale,
  stocks,
  stories,
  sources,
  movers,
  onQuickAnalysis,
}: {
  text: Copy;
  lang: LangCode;
  locale: string;
  stocks: BankTickerItem[];
  stories: BankNewsItem[];
  sources: Array<{ source: string; count: number }>;
  movers: StockCategoryMoverItem[];
  onQuickAnalysis: (item: BankTickerItem, trigger: HTMLButtonElement | null) => void;
}) {
  const watched = movers.length > 0
    ? movers.map(item => ({
      symbol: item.symbol,
      name: item.name,
      sector: '',
      price: item.price,
      currency: item.currency,
      change: null,
      changePercent: item.changePercent,
      source: 'Yahoo Finance',
      delayed: true as const,
    })).slice(0, 5)
    : stocks.slice(0, 5);

  return (
    <aside className="bankSideRail" aria-labelledby="banking-side-title">
      <h2 id="banking-side-title">{text.sideRailTitle}</h2>
      <section className="sideModule">
        <h3>{text.watchedStocks}</h3>
        <div className="sideStockList">
          {watched.length > 0 ? (
            watched.map(item => (
              <button type="button" key={item.symbol} onClick={event => onQuickAnalysis(item, event.currentTarget)}>
                <AssetAvatar symbol={item.symbol} name={item.name} assetType="stock" size="sm" decorative />
                <span>
                  <strong dir="ltr">{item.symbol}</strong>
                  <em>{item.name}</em>
                </span>
                <b className={`tone-${changeTone(item.changePercent)}`} dir="ltr">{formatPercent(item.changePercent, locale) || text.unavailable}</b>
              </button>
            ))
          ) : (
            <div className="sideEmpty">{text.noSideData}</div>
          )}
        </div>
      </section>
      <section className="sideModule">
        <h3>{text.topStories}</h3>
        <div className="sideStoryList">
          {stories.length > 0 ? (
            stories.slice(0, 5).map(item => (
              <a key={item.id} href={safeExternalUrl(item.url) || '#'} target={safeExternalUrl(item.url) ? '_blank' : undefined} rel="noopener noreferrer nofollow">
                <span dir="auto">{displayTitle(item)}</span>
                <em>{item.source} · {relativeTime(item.publishedAt, locale)}</em>
              </a>
            ))
          ) : (
            <div className="sideEmpty">{text.noNewsAvailable}</div>
          )}
        </div>
      </section>
      <section className="sideModule">
        <h3>{text.sources}</h3>
        <div className="sourceList">
          {sources.length > 0 ? (
            sources.slice(0, 6).map(item => (
              <span key={item.source}>
                <b>{item.source}</b>
                <em dir="ltr">{item.count}</em>
              </span>
            ))
          ) : (
            <div className="sideEmpty">{text.noSideData}</div>
          )}
        </div>
      </section>
      <section className="sideModule">
        <h3>{text.categories}</h3>
        <div className="categoryCloud">
          {CATEGORY_OPTIONS.filter(option => option.id !== 'all').slice(0, 7).map(option => (
            <span key={option.id}>{option[lang] ?? option.ar}</span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function FocusTrapPanel({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="quickAnalysisOverlay" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={panelRef} className="quickAnalysisPanel" role="dialog" aria-modal="true" aria-labelledby="quick-analysis-title" onKeyDown={onKeyDown}>
        {children}
      </div>
    </div>
  );
}

function QuickAnalysisPanel({
  text,
  locale,
  state,
  loading,
  result,
  error,
  onRefresh,
  onClose,
  closeButtonRef,
}: {
  text: Copy;
  locale: string;
  state: QuickAnalysisState;
  loading: boolean;
  result: QuickAnalysisResult | null;
  error: string;
  onRefresh: () => void;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const confidence = confidenceFromResult(result);
  const price = result?.quote?.price ?? result?.latestPrice;
  const currency = result?.quote?.currency ?? result?.currency ?? state.currency ?? 'USD';
  const fullUrl = buildAnalysisUrl(state, true);

  return (
    <FocusTrapPanel onClose={onClose}>
      <div className="quickPanelHeader">
        <div>
          <span className="bankHeroBadge"><LineChart size={15} />{text.quickTitle}</span>
          <h2 id="quick-analysis-title">{state.companyName || result?.name || state.symbol}</h2>
          <p><span dir="ltr">{state.symbol}</span> · {state.exchange || result?.exchange || text.unavailable} · {text.panelNote}</p>
        </div>
        <button ref={closeButtonRef} className="bankIconButton" type="button" onClick={onClose} aria-label={text.close}>
          <X size={19} />
        </button>
      </div>

      {loading ? (
        <div className="quickLoading" role="status" aria-live="polite">
          <Loader2 size={22} className="spin" />
          <strong>{text.quickLoading} <span dir="ltr">{state.symbol}</span>...</strong>
          <SkeletonCard />
          <SkeletonCard compact />
        </div>
      ) : error ? (
        <div className="quickError" role="alert">
          <AlertTriangle size={24} />
          <strong>{error}</strong>
          <button className="bankSecondaryButton" type="button" onClick={onRefresh}>{text.retry}</button>
        </div>
      ) : (
        <>
          <div className="quickSummaryGrid">
            <MetricCard icon={LineChart} label={text.reading} value={analysisSignal(result, text)} detail={result?.trend ? trendText(result.trend, text) : text.unavailable} tone={result?.trend === 'bullish' ? 'positive' : result?.trend === 'bearish' ? 'negative' : 'neutral'} />
            <MetricCard icon={Gauge} label={text.confidence} value={confidence !== null ? `${confidence}%` : text.unavailable} detail={result?.source ?? result?.dataStatus ?? text.dataSource} />
            <MetricCard icon={ShieldCheck} label={text.risk} value={riskText(result?.riskLevel, text)} detail={text.panelNote} tone={result?.riskLevel === 'high' ? 'warning' : 'neutral'} />
            <MetricCard icon={Building2} label={text.currentPrice} value={formatMoney(price, currency ?? 'USD', locale) || text.unavailable} detail={result?.quote?.timestamp ? formatDateTime(result.quote.timestamp, locale) : text.delayedQuote} />
          </div>

          <div className="quickTechnicalGrid">
            <div><span>{text.shortTrend}</span><strong>{trendText(result?.trend, text)}</strong></div>
            <div><span>{text.mediumTrend}</span><strong>{trendText(result?.trend, text)}</strong></div>
            <div><span>{text.rsi}</span><strong dir="ltr">{isFiniteNumber(result?.indicators?.rsi) ? result?.indicators?.rsi.toFixed(1) : text.unavailable}</strong></div>
            <div><span>{text.macd}</span><strong>{macdFallback(result, text)}</strong></div>
            <div><span>{text.movingAverages}</span><strong>{emaRelationship(result, text)}</strong></div>
            <div><span>{text.support}</span><strong dir="ltr">{formatMoney(result?.levels?.support, currency ?? 'USD', locale) || text.unavailable}</strong></div>
            <div><span>{text.resistance}</span><strong dir="ltr">{formatMoney(result?.levels?.resistance, currency ?? 'USD', locale) || text.unavailable}</strong></div>
          </div>

          <div className="quickExplanation">
            <h3>{text.explanation}</h3>
            <p dir="auto">{result?.summary || text.unavailable}</p>
          </div>
        </>
      )}

      <div className="quickPanelFooter">
        <span>{text.escHint}</span>
        <div>
          <button className="bankSecondaryButton" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCcw size={16} />}
            {text.updateAnalysis}
          </button>
          <a className="bankPrimaryButton" href={fullUrl}>
            {text.openFullAnalysis}
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </FocusTrapPanel>
  );
}

export function BankNewsPage() {
  const router = useRouter();
  const { dir, lang: rawLang } = useLanguage();
  const lang = (rawLang === 'en' || rawLang === 'fr' ? rawLang : 'ar') as LangCode;
  const text = COPY[lang];
  const locale = localeFor(lang);

  const [tickerItems, setTickerItems] = useState<BankTickerItem[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<BankingSnapshotItem[]>([]);
  const [newsItems, setNewsItems] = useState<BankNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoverItem[]>([]);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [newsError, setNewsError] = useState('');
  const [visibleNews, setVisibleNews] = useState(NEWS_PAGE_SIZE);

  const [query, setQuery] = useState(() => readInitialParam('q'));
  const [symbolFilter, setSymbolFilter] = useState(() => readInitialParam('symbol', 'all').toUpperCase());
  const [categoryFilter, setCategoryFilter] = useState<BankingCategory>(() => {
    const value = readInitialParam('category', 'all') as BankingCategory;
    return CATEGORY_OPTIONS.some(option => option.id === value) ? value : 'all';
  });
  const [sourceFilter, setSourceFilter] = useState(() => readInitialParam('source', 'all'));
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => {
    const value = readInitialParam('period', 'all') as TimeFilter;
    return ['all', 'today', 'week', 'month'].includes(value) ? value : 'all';
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const value = readInitialParam('sort', 'latest') as SortMode;
    return ['latest', 'oldest', 'strongestMove'].includes(value) ? value : 'latest';
  });

  const [quickState, setQuickState] = useState<QuickAnalysisState | null>(null);
  const [quickResult, setQuickResult] = useState<QuickAnalysisResult | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickCacheRef = useRef<Map<string, { expiresAt: number; result: QuickAnalysisResult }>>(new Map());
  const quickTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const debouncedQuery = useDebouncedValue(query, 250);

  const sortedStocks = useMemo(() => {
    const bySymbol = new Map(tickerItems.map(item => [item.symbol.toUpperCase(), item]));
    const configured = BANK_TICKER_ORDER.map(symbol => bySymbol.get(symbol)).filter(Boolean) as BankTickerItem[];
    const remaining = tickerItems
      .filter(item => !BANK_TICKER_SYMBOLS.has(item.symbol.toUpperCase()))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    return [...configured, ...remaining];
  }, [tickerItems]);

  const loadData = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setMarketError('');
    setNewsError('');

    const [tickerResult, snapshotResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<BankTickerResponse>('/api/banking-stocks/ticker'),
      fetchJson<BankingSnapshotResponse>('/api/market/banking/snapshot'),
      fetchJson<BankNewsResponse>(`/api/banking-stocks/news?lang=${encodeURIComponent(lang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/banking-stocks/movers?limit=6'),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setMarketUpdatedAt(tickerResult.value.updated_at);
    } else if (tickerResult.status === 'fulfilled') {
      setTickerItems(tickerResult.value.items ?? []);
      setMarketUpdatedAt(tickerResult.value.updated_at ?? '');
      setMarketError(text.providerError);
    } else {
      setMarketError(text.providerError);
    }

    if (snapshotResult.status === 'fulfilled' && snapshotResult.value.ok) {
      setSnapshotItems(snapshotResult.value.items);
      setMarketUpdatedAt(current => newestTimestamp([current, snapshotResult.value.updated_at]));
    } else if (snapshotResult.status === 'fulfilled') {
      setSnapshotItems(snapshotResult.value.items ?? []);
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNewsItems(dedupeNews(newsResult.value.items));
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      setNewsError(text.providerError);
    }

    if (moversResult.status === 'fulfilled' && moversResult.value.ok) {
      setMovers(moversResult.value.data.topGainers ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [lang, text.providerError]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadData(true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (symbolFilter !== 'all') params.set('symbol', symbolFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (timeFilter !== 'all') params.set('period', timeFilter);
    if (sortMode !== 'latest') params.set('sort', sortMode);
    const next = params.toString() ? `/banking-stocks?${params.toString()}` : '/banking-stocks';
    if (typeof window !== 'undefined' && `${window.location.pathname}${window.location.search}` !== next) {
      router.replace(next, { scroll: false });
    }
  }, [categoryFilter, query, router, sortMode, sourceFilter, symbolFilter, timeFilter]);

  useEffect(() => {
    setVisibleNews(NEWS_PAGE_SIZE);
  }, [debouncedQuery, symbolFilter, categoryFilter, sourceFilter, timeFilter, sortMode]);

  useEffect(() => {
    if (quickState) {
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    }
  }, [quickState]);

  const loadQuickAnalysis = useCallback(async (state: QuickAnalysisState, force = false) => {
    const cacheKey = `${state.providerSymbol}:${state.timeframe}`;
    const cached = quickCacheRef.current.get(cacheKey);
    if (!force && cached && cached.expiresAt > Date.now()) {
      setQuickResult(cached.result);
      setQuickError('');
      setQuickLoading(false);
      return;
    }

    quickAbortRef.current?.abort();
    const controller = new AbortController();
    quickAbortRef.current = controller;
    setQuickLoading(true);
    setQuickError('');
    setQuickResult(null);

    try {
      const params = new URLSearchParams({
        symbol: state.providerSymbol,
        assetType: 'stock',
        displaySymbol: state.symbol,
      });
      if (state.companyName) params.set('name', state.companyName);
      if (state.exchange) params.set('exchange', state.exchange);
      if (state.currency) params.set('currency', state.currency);
      const result = await fetchJson<QuickAnalysisResult>(`/api/market/analyze?${params.toString()}`, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.success) {
        setQuickError(result.code === 'INVALID_SYMBOL' ? text.unsupportedSymbol : text.quickError);
        setQuickResult(null);
        return;
      }
      quickCacheRef.current.set(cacheKey, { result, expiresAt: Date.now() + QUICK_ANALYSIS_CACHE_MS });
      setQuickResult(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      setQuickError(text.quickError);
    } finally {
      if (!controller.signal.aborted) setQuickLoading(false);
    }
  }, [text.quickError, text.unsupportedSymbol]);

  const openQuickAnalysis = useCallback((item: BankTickerItem, trigger: HTMLButtonElement | null) => {
    const normalized = normalizeBankSymbol(item.symbol, BANK_EXCHANGES[item.symbol]);
    if (!normalized) return;
    quickTriggerRef.current = trigger;
    const nextState = {
      ...normalized,
      companyName: item.name,
      currency: item.currency,
      timeframe: '1D' as const,
    };
    setQuickState(nextState);
    void loadQuickAnalysis(nextState);
  }, [loadQuickAnalysis]);

  const openQuickAnalysisSymbol = useCallback((symbol: string | undefined, name?: string, trigger?: HTMLButtonElement | null) => {
    const normalized = normalizeBankSymbol(symbol);
    if (!normalized) return;
    quickTriggerRef.current = trigger ?? null;
    const stock = sortedStocks.find(item => item.symbol.toUpperCase() === normalized.symbol);
    const nextState = {
      ...normalized,
      companyName: name || stock?.name,
      currency: stock?.currency,
      exchange: BANK_EXCHANGES[normalized.symbol] ?? normalized.exchange ?? 'NYSE',
      timeframe: '1D' as const,
    };
    setQuickState(nextState);
    void loadQuickAnalysis(nextState);
  }, [loadQuickAnalysis, sortedStocks]);

  const closeQuickAnalysis = useCallback(() => {
    quickAbortRef.current?.abort();
    setQuickState(null);
    setQuickResult(null);
    setQuickError('');
    setQuickLoading(false);
    window.setTimeout(() => quickTriggerRef.current?.focus(), 0);
  }, []);

  const filteredNews = useMemo(() => {
    const queryText = debouncedQuery.trim().toLowerCase();
    const result = dedupeNews(newsItems)
      .filter(item => !queryText || textForSearch(item).includes(queryText))
      .filter(item => symbolFilter === 'all' || String(item.ticker ?? '').toUpperCase() === symbolFilter)
      .filter(item => itemMatchesCategory(item, categoryFilter))
      .filter(item => sourceFilter === 'all' || item.source === sourceFilter)
      .filter(item => itemMatchesDate(item, timeFilter));

    return result.sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (sortMode === 'strongestMove') return Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0);
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [categoryFilter, debouncedQuery, newsItems, sortMode, sourceFilter, symbolFilter, timeFilter]);

  const featuredCount = filteredNews.length >= 6 ? 4 : filteredNews.length > 0 ? 1 : 0;
  const featured = filteredNews.slice(0, featuredCount);
  const featuredIds = new Set(featured.map(item => item.id));
  const feedItems = filteredNews.filter(item => !featuredIds.has(item.id)).slice(0, visibleNews);
  const sidebarStories = filteredNews.filter(item => !featuredIds.has(item.id) && !feedItems.some(feed => feed.id === item.id)).slice(0, 5);
  const sources = useMemo(() => sourceCount(newsItems), [newsItems]);
  const sourceOptions = sources.map(item => item.source);
  const topMoverItems = movers.length ? movers : [];

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (query.trim()) filters.push({ key: 'q', label: query.trim(), onRemove: () => setQuery('') });
    if (symbolFilter !== 'all') filters.push({ key: 'symbol', label: symbolFilter, onRemove: () => setSymbolFilter('all') });
    if (categoryFilter !== 'all') filters.push({ key: 'category', label: categoryName(categoryFilter, lang), onRemove: () => setCategoryFilter('all') });
    if (sourceFilter !== 'all') filters.push({ key: 'source', label: sourceFilter, onRemove: () => setSourceFilter('all') });
    if (timeFilter !== 'all') filters.push({ key: 'period', label: timeFilter === 'today' ? text.today : timeFilter === 'week' ? text.week : text.month, onRemove: () => setTimeFilter('all') });
    if (sortMode !== 'latest') filters.push({ key: 'sort', label: sortMode === 'oldest' ? text.oldest : text.strongestMove, onRemove: () => setSortMode('latest') });
    return filters;
  }, [categoryFilter, lang, query, sortMode, sourceFilter, symbolFilter, text.month, text.oldest, text.strongestMove, text.today, text.week, timeFilter]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setSymbolFilter('all');
    setCategoryFilter('all');
    setSourceFilter('all');
    setTimeFilter('all');
    setSortMode('latest');
  }, []);

  const hasError = Boolean(marketError || newsError);
  const lastStockUpdate = newestTimestamp([marketUpdatedAt, ...snapshotItems.map(item => item.lastUpdated)]);

  return (
    <div className="bankingShell" dir={dir}>
      <Sidebar />
      <main id="main-content" className="bankingWorkspace">
        <BankingHeader
          text={text}
          locale={locale}
          lastStockUpdate={lastStockUpdate}
          lastNewsUpdate={newsUpdatedAt}
          refreshing={refreshing}
          hasTicker={tickerItems.length > 0}
          hasNews={newsItems.length > 0}
          hasError={hasError}
          onRefresh={() => void loadData(true)}
        />

        {hasError ? (
          <div className="bankWarning" role="status">
            <AlertTriangle size={18} />
            <span>{marketError || newsError}</span>
            <button type="button" onClick={() => void loadData(true)}>{text.retry}</button>
          </div>
        ) : null}

        <BankingTicker items={sortedStocks} text={text} lang={lang} locale={locale} loading={loading && sortedStocks.length === 0} />
        <BankingMarketSummary text={text} locale={locale} stocks={sortedStocks} featuredStory={featured[0]} loading={loading && sortedStocks.length === 0} />
        <BankStockSection
          text={text}
          lang={lang}
          locale={locale}
          stocks={sortedStocks}
          loading={loading && sortedStocks.length === 0}
          onQuickAnalysis={openQuickAnalysis}
        />
        <FeaturedNews
          text={text}
          locale={locale}
          items={featured}
          loading={loading && newsItems.length === 0}
          onQuickAnalysisSymbol={openQuickAnalysisSymbol}
        />

        <BankingFilters
          text={text}
          lang={lang}
          query={query}
          setQuery={setQuery}
          symbol={symbolFilter}
          setSymbol={setSymbolFilter}
          category={categoryFilter}
          setCategory={setCategoryFilter}
          source={sourceFilter}
          setSource={setSourceFilter}
          period={timeFilter}
          setPeriod={setTimeFilter}
          sort={sortMode}
          setSort={setSortMode}
          sources={sourceOptions}
          stocks={sortedStocks}
          count={filteredNews.length}
          activeFilters={activeFilters}
          onClear={clearFilters}
          loading={refreshing}
        />

        <div className="bankContentGrid">
          <BankingNewsFeed
            text={text}
            locale={locale}
            items={feedItems}
            loading={loading && newsItems.length === 0}
            error={newsError}
            hasAnyNews={newsItems.length > 0}
            total={filteredNews.length}
            visibleCount={visibleNews}
            onLoadMore={() => setVisibleNews(count => count + NEWS_PAGE_SIZE)}
            onClear={clearFilters}
            onRetry={() => void loadData(true)}
            onQuickAnalysisSymbol={openQuickAnalysisSymbol}
          />
          <BankingSideRail
            text={text}
            lang={lang}
            locale={locale}
            stocks={sortedStocks}
            stories={sidebarStories.length ? sidebarStories : filteredNews.slice(0, 5)}
            sources={sources}
            movers={topMoverItems}
            onQuickAnalysis={openQuickAnalysis}
          />
        </div>

        <footer className="bankDisclaimer">
          <ShieldCheck size={17} />
          <span>{text.sourceDisclaimer}</span>
          <span>{text.dataSource}: Yahoo Finance · {text.newsSource}: {sources.slice(0, 3).map(item => item.source).join('، ') || text.unavailable}</span>
        </footer>
      </main>

      {quickState ? (
        <QuickAnalysisPanel
          text={text}
          locale={locale}
          state={quickState}
          loading={quickLoading}
          result={quickResult}
          error={quickError}
          onRefresh={() => quickState && void loadQuickAnalysis(quickState, true)}
          onClose={closeQuickAnalysis}
          closeButtonRef={closeButtonRef}
        />
      ) : null}

      <style jsx global>{`
        .bankingShell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20, 184, 166, 0.08), transparent 34rem),
            linear-gradient(180deg, #f4f9fd 0%, #eef6fd 48%, #f7fbff 100%);
          color: #0f243d;
          overflow-x: hidden;
        }

        .bankingShell,
        .bankingShell * {
          box-sizing: border-box;
        }

        .bankingWorkspace {
          width: calc(100% - var(--sidebar-w, 230px));
          max-width: 1500px;
          margin-inline-start: var(--sidebar-w, 230px);
          margin-inline-end: auto;
          padding: clamp(16px, 2vw, 32px);
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
          overflow-x: clip;
        }

        .bankHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.48fr);
          gap: 20px;
          align-items: stretch;
          padding: 24px;
          border: 1px solid rgba(148, 163, 184, 0.26);
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(239, 250, 255, 0.92));
          box-shadow: 0 18px 45px rgba(15, 35, 61, 0.08);
          min-width: 0;
          overflow: hidden;
        }

        .bankHeroCopy,
        .bankHeroStatus {
          min-width: 0;
        }

        .bankHeroBadge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid rgba(20, 184, 166, 0.22);
          border-radius: 999px;
          background: rgba(236, 254, 255, 0.78);
          color: #075985;
          font-weight: 800;
          font-size: 0.78rem;
        }

        .bankHero h1 {
          margin: 12px 0 8px;
          font-size: clamp(2rem, 3vw, 2.8rem);
          line-height: 1.15;
          color: #071b33;
          letter-spacing: 0;
        }

        .bankHero p {
          margin: 0;
          max-width: 760px;
          color: #53677f;
          font-size: 1rem;
          line-height: 1.8;
        }

        .bankHeroStatus {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          align-content: center;
        }

        .bankHeaderMeta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          padding: 12px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(203, 213, 225, 0.8);
          color: #64748b;
        }

        .bankHeaderMeta svg {
          color: #0891b2;
        }

        .bankHeaderMeta strong {
          color: #10243d;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bankPrimaryButton,
        .bankSecondaryButton,
        .bankTextButton,
        .bankPrimaryMini,
        .bankSecondaryMini,
        .bankIconMini,
        .bankIconButton,
        .bankLoadMore,
        .newsCardActions button,
        .secondaryStoryActions button {
          min-height: 44px;
          border: 0;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }

        .bankPrimaryButton,
        .bankPrimaryMini,
        .bankLoadMore {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 13px;
          background: linear-gradient(135deg, #0ea5e9, #14b8a6);
          color: #fff;
          font-weight: 900;
          box-shadow: 0 12px 24px rgba(14, 165, 233, 0.22);
        }

        .bankPrimaryButton {
          grid-column: 1 / -1;
          width: 100%;
          padding-inline: 18px;
        }

        .bankSecondaryButton,
        .bankSecondaryMini,
        .bankTextButton,
        .bankIconMini,
        .bankIconButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: #fff;
          color: #0f365e;
          border-radius: 13px;
          font-weight: 800;
        }

        .bankTextButton {
          border-color: transparent;
          background: rgba(239, 246, 255, 0.9);
          color: #0369a1;
          padding-inline: 14px;
        }

        .bankIconMini,
        .bankIconButton {
          width: 44px;
          padding: 0;
        }

        .bankPrimaryMini,
        .bankSecondaryMini {
          padding-inline: 12px;
          font-size: 0.86rem;
        }

        .bankPrimaryButton:focus-visible,
        .bankSecondaryButton:focus-visible,
        .bankTextButton:focus-visible,
        .bankPrimaryMini:focus-visible,
        .bankSecondaryMini:focus-visible,
        .bankIconMini:focus-visible,
        .bankIconButton:focus-visible,
        .bankLoadMore:focus-visible,
        .newsCardActions button:focus-visible,
        .secondaryStoryActions button:focus-visible,
        .sideStockList button:focus-visible,
        .activeChips button:focus-visible,
        .filterField input:focus,
        .filterField select:focus {
          outline: 3px solid rgba(14, 165, 233, 0.28);
          outline-offset: 2px;
        }

        .bankPrimaryButton:disabled,
        .bankSecondaryButton:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spin {
          animation: bankSpin 0.9s linear infinite;
        }

        @keyframes bankSpin {
          to { transform: rotate(360deg); }
        }

        .bankPanel,
        .bankSection,
        .bankFilterPanel,
        .bankSideRail,
        .bankDisclaimer,
        .bankWarning {
          border: 1px solid rgba(203, 213, 225, 0.82);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 14px 32px rgba(15, 35, 61, 0.07);
        }

        .bankSection,
        .bankPanel,
        .bankFilterPanel,
        .bankSideRail {
          padding: 20px;
        }

        .bankWarning {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          color: #92400e;
          background: #fffbeb;
          border-color: #fde68a;
        }

        .bankWarning button {
          border: 0;
          background: transparent;
          color: #0369a1;
          font-weight: 900;
          cursor: pointer;
        }

        .sectionHead,
        .filterHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .sectionHead.compact {
          margin-bottom: 12px;
        }

        .sectionHead h2,
        .filterHeader h2,
        .bankSideRail h2 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0b213a;
          font-size: clamp(1.18rem, 1.5vw, 1.45rem);
          letter-spacing: 0;
        }

        .sectionHead p,
        .filterHeader p {
          margin: 6px 0 0;
          color: #64748b;
          line-height: 1.7;
        }

        .bankTickerSkeletons {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(210px, 1fr);
          gap: 12px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }

        .bankTickerViewport {
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          direction: ltr;
          mask-image: linear-gradient(90deg, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%);
        }

        .bankTickerTrack {
          display: flex;
          align-items: stretch;
          gap: 12px;
          width: max-content;
          min-width: max-content;
          animation: bankTickerMove 42s linear infinite;
          will-change: transform;
        }

        @media (hover: hover) and (pointer: fine) {
          .bankTickerViewport:hover .bankTickerTrack {
            animation-play-state: paused;
          }
        }

        .bankTickerItem,
        .bankStockCard,
        .newsCard,
        .secondaryStory,
        .sideModule,
        .leadStory,
        .bankMetricCard,
        .bankSkeletonCard {
          border: 1px solid rgba(203, 213, 225, 0.78);
          border-radius: 18px;
          background: #fff;
        }

        .bankTickerItem {
          padding: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          flex: 0 0 clamp(220px, 18vw, 282px);
          min-width: 0;
          direction: rtl;
        }

        .bankTickerItem > div:not(.tickerNumbers) {
          min-width: 0;
        }

        .bankTickerItem .tickerNumbers,
        .bankTickerItem > small {
          grid-column: 1 / -1;
        }

        [dir="ltr"] .bankTickerItem {
          direction: ltr;
        }

        .bankTickerItem strong,
        .bankTickerItem b,
        .bankTickerItem em,
        .bankStockMetrics dd,
        .tickerNumbers,
        .bankQuoteBadge {
          font-variant-numeric: tabular-nums;
        }

        .bankTickerItem strong {
          display: block;
          color: #071b33;
          font-size: 1.05rem;
        }

        .bankTickerItem span,
        .bankTickerItem small {
          color: #64748b;
          font-size: 0.84rem;
        }

        .tickerNumbers {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .tickerNumbers b {
          color: #10243d;
        }

        .tickerNumbers em,
        .bankQuoteBadge,
        .newsStockContext em {
          font-style: normal;
          font-weight: 900;
        }

        .tone-positive { color: #047857 !important; }
        .tone-negative { color: #b91c1c !important; }
        .tone-neutral { color: #475569 !important; }
        .tone-warning { color: #b45309 !important; }

        .bankMetricGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }

        .bankMetricCard {
          padding: 16px;
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .bankMetricIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #eff6ff;
          color: #0284c7;
        }

        .bankMetricLabel,
        .bankStockMetrics dt,
        .bankStockMetaGrid dt,
        .bankStockPriceRow small,
        .filterField span {
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 800;
        }

        .bankMetricValue {
          min-height: 2.7em;
          color: #0b213a;
          font-size: 1.18rem;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bankMetricDetail {
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        .bankStockGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .bankStockCard {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          box-shadow: 0 10px 22px rgba(15, 35, 61, 0.045);
        }

        .bankStockHeader {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .bankStockLogo {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #082f49;
          font-weight: 900;
          background: linear-gradient(135deg, #e0f2fe, #ccfbf1);
          border: 1px solid rgba(14, 165, 233, 0.22);
        }

        .bankStockHeader h3,
        .newsCard h3,
        .leadStory h3,
        .secondaryStory h3 {
          margin: 0;
          color: #071b33;
          letter-spacing: 0;
        }

        .bankStockHeader h3 {
          font-size: 0.98rem;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bankStockHeader p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.84rem;
        }

        .bankQuoteBadge,
        .impactBadge,
        .aiBadge,
        .resultsPill,
        .refreshingChip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          width: fit-content;
          border-radius: 999px;
          padding: 6px 9px;
          background: #f1f5f9;
          color: #334155;
          font-size: 0.76rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .bankStockPriceRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .bankStockPriceRow span {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .bankStockPriceRow strong {
          color: #0b213a;
          font-size: 1.08rem;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
        }

        .bankStockPriceRow em {
          font-style: normal;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .bankStockMetaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }

        .bankStockMetrics div,
        .bankStockMetaGrid div {
          padding: 8px 10px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
          min-width: 0;
        }

        .bankStockMetrics dd,
        .bankStockMetaGrid dd {
          margin: 4px 0 0;
          color: #10243d;
          font-weight: 900;
          font-size: 0.86rem;
          overflow-wrap: anywhere;
        }

        .bankStockActions,
        .leadActions,
        .newsCardActions,
        .quickPanelFooter div {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .featuredGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.95fr);
          gap: 16px;
        }

        .leadStory {
          display: grid;
          grid-template-columns: minmax(190px, 0.52fr) minmax(0, 1fr);
          overflow: hidden;
          min-width: 0;
        }

        .leadVisual {
          min-height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background:
            linear-gradient(135deg, rgba(3, 105, 161, 0.94), rgba(15, 118, 110, 0.9)),
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 18rem);
          color: #fff;
        }

        .leadVisual span {
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .leadStoryBody {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 22px;
          min-width: 0;
        }

        .leadStory h3 {
          font-size: clamp(1.35rem, 2vw, 1.85rem);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .leadStory p,
        .newsCard p {
          color: #52677f;
          line-height: 1.8;
          margin: 0;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .leadStory p {
          -webkit-line-clamp: 3;
        }

        .featuredSecondaryStack {
          display: grid;
          gap: 12px;
          align-content: stretch;
        }

        .secondaryStory {
          padding: 16px;
          display: grid;
          gap: 10px;
        }

        .secondaryStory h3 {
          font-size: 1rem;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .secondaryStoryActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .secondaryStoryActions a,
        .secondaryStoryActions button {
          color: #0369a1;
          font-weight: 900;
          text-decoration: none;
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .newsMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          color: #64748b;
          font-size: 0.82rem;
        }

        .newsMeta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
        }

        .newsMeta.compact {
          font-size: 0.76rem;
        }

        .bankFilterPanel {
          display: grid;
          gap: 14px;
        }

        .filterGrid {
          display: grid;
          grid-template-columns: minmax(260px, 1.4fr) repeat(5, minmax(150px, 1fr));
          gap: 12px;
        }

        .filterField {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .filterField input,
        .filterField select {
          min-height: 44px;
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.42);
          border-radius: 13px;
          background: #f8fbff;
          color: #10243d;
          font: inherit;
          padding: 0 12px;
        }

        .searchField div {
          position: relative;
        }

        .searchField svg {
          position: absolute;
          inset-inline-start: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .searchField input {
          padding-inline-start: 38px;
        }

        .activeChips {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 20px;
        }

        .activeChips button {
          min-height: 34px;
          border: 1px solid rgba(14, 165, 233, 0.22);
          border-radius: 999px;
          color: #075985;
          background: #f0f9ff;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
        }

        .mobileFilterToggle {
          display: none;
        }

        .bankContentGrid {
          display: grid;
          grid-template-columns: minmax(0, 2.15fr) minmax(300px, 0.85fr);
          gap: 20px;
          align-items: start;
        }

        .newsFeedList {
          display: grid;
          gap: 12px;
        }

        .newsCard {
          padding: 18px;
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .newsCardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .newsCard h3 {
          font-size: 1.08rem;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .newsCard p {
          -webkit-line-clamp: 2;
          font-size: 0.95rem;
        }

        .newsStockContext {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .newsStockContext span,
        .newsStockContext strong,
        .newsStockContext em {
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 6px 9px;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .newsCardFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .newsCardActions a,
        .newsCardActions button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 38px;
          padding: 0 10px;
          border-radius: 11px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          background: #fff;
          color: #0f365e;
          font-weight: 900;
          text-decoration: none;
          font: inherit;
          cursor: pointer;
        }

        .bankLoadMore {
          margin: 16px auto 0;
          padding-inline: 22px;
        }

        .bankSideRail {
          position: sticky;
          top: 88px;
          display: grid;
          gap: 14px;
        }

        .bankSideRail h2 {
          margin-bottom: 2px;
        }

        .sideModule {
          padding: 15px;
          display: grid;
          gap: 12px;
        }

        .sideModule h3 {
          margin: 0;
          color: #0b213a;
          font-size: 1rem;
        }

        .sideStockList,
        .sideStoryList,
        .sourceList,
        .categoryCloud {
          display: grid;
          gap: 9px;
        }

        .sideStockList button,
        .sideStoryList a,
        .sourceList span {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 14px;
          background: #f8fafc;
          padding: 10px;
          color: inherit;
          text-decoration: none;
          font: inherit;
        }

        .sideStockList button {
          cursor: pointer;
          min-height: 54px;
        }

        .sideStockList strong,
        .sourceList b {
          display: block;
          color: #0b213a;
          font-weight: 950;
        }

        .sideStockList em,
        .sideStoryList em,
        .sourceList em {
          display: block;
          color: #64748b;
          font-style: normal;
          font-size: 0.78rem;
        }

        .sideStoryList a {
          display: grid;
          justify-items: start;
          line-height: 1.5;
        }

        .sideStoryList span {
          color: #10243d;
          font-weight: 850;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .categoryCloud {
          display: flex;
          flex-wrap: wrap;
        }

        .categoryCloud span {
          border-radius: 999px;
          background: #eff6ff;
          color: #075985;
          padding: 7px 10px;
          font-weight: 850;
          font-size: 0.78rem;
        }

        .bankEmptyState,
        .emptyMini,
        .quickLoading,
        .quickError {
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
          padding: 28px;
          color: #64748b;
        }

        .bankInlineState,
        .sideEmpty {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px dashed rgba(148, 163, 184, 0.72);
          border-radius: 16px;
          background: #f8fafc;
          color: #64748b;
          line-height: 1.65;
        }

        .bankInlineState {
          padding: 14px 16px;
        }

        .bankInlineState svg {
          flex: 0 0 auto;
          color: #b45309;
        }

        .bankInlineState span {
          display: grid;
          gap: 2px;
        }

        .bankInlineState strong {
          color: #0b213a;
        }

        .bankInlineState em,
        .sideEmpty {
          font-style: normal;
          font-size: 0.88rem;
        }

        .sideEmpty {
          padding: 12px;
          justify-content: center;
          text-align: center;
        }

        .bankEmptyState strong,
        .emptyMini strong,
        .quickError strong,
        .quickLoading strong {
          color: #0b213a;
        }

        .bankDisclaimer {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 16px;
          padding: 16px 18px;
          color: #52677f;
          line-height: 1.7;
        }

        .bankDisclaimer svg {
          color: #0e7490;
        }

        .bankSkeletonCard {
          min-height: 128px;
          padding: 16px;
          display: grid;
          gap: 12px;
          overflow: hidden;
        }

        .bankSkeletonCard.compact {
          min-height: 92px;
        }

        .bankSkeletonCard span,
        .bankSkeletonCard strong,
        .bankSkeletonCard em,
        .bankSkeletonCard i {
          display: block;
          height: 13px;
          border-radius: 999px;
          background: linear-gradient(90deg, #eef4fb, #f8fbff, #eef4fb);
          background-size: 240% 100%;
          animation: bankShimmer 1.2s ease-in-out infinite;
        }

        .bankSkeletonCard span { width: 42%; }
        .bankSkeletonCard strong { width: 80%; }
        .bankSkeletonCard em { width: 62%; }
        .bankSkeletonCard i { width: 48%; }

        @keyframes bankShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        @keyframes bankTickerMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 6px)); }
        }

        .quickAnalysisOverlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          justify-content: flex-end;
          background: rgba(8, 22, 38, 0.36);
          backdrop-filter: blur(3px);
        }

        [dir="rtl"] .quickAnalysisOverlay {
          justify-content: flex-start;
        }

        .quickAnalysisPanel {
          width: min(520px, 100%);
          height: 100%;
          overflow-y: auto;
          background: #f8fbff;
          border-inline-start: 1px solid rgba(203, 213, 225, 0.72);
          box-shadow: 0 30px 70px rgba(8, 22, 38, 0.24);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .quickPanelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .quickPanelHeader h2 {
          margin: 12px 0 6px;
          color: #071b33;
          font-size: 1.55rem;
        }

        .quickPanelHeader p {
          margin: 0;
          color: #64748b;
          line-height: 1.7;
        }

        .quickSummaryGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .quickTechnicalGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .quickTechnicalGrid div,
        .quickExplanation {
          border: 1px solid rgba(203, 213, 225, 0.86);
          border-radius: 16px;
          background: #fff;
          padding: 13px;
        }

        .quickTechnicalGrid span {
          display: block;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 850;
          margin-bottom: 5px;
        }

        .quickTechnicalGrid strong {
          color: #10243d;
          font-size: 1rem;
        }

        .quickExplanation h3 {
          margin: 0 0 8px;
          color: #0b213a;
        }

        .quickExplanation p {
          margin: 0;
          color: #52677f;
          line-height: 1.8;
        }

        .quickPanelFooter {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid rgba(203, 213, 225, 0.82);
          color: #64748b;
        }

        .rotate180 {
          transform: rotate(180deg);
        }

        @media (max-width: 1280px) {
          .bankHero,
          .bankContentGrid,
          .featuredGrid {
            grid-template-columns: 1fr;
          }

          .bankMetricGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bankStockGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bankSideRail {
            position: static;
          }

          .filterGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 860px) {
          html,
          body,
          .bankingShell {
            width: 100vw;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .bankingWorkspace {
            width: 100vw;
            max-width: 100vw;
            margin: 0 !important;
            padding: 14px;
          }

          .bankHero {
            padding: 18px;
          }

          .bankHeroStatus,
          .bankMetricGrid,
          .quickSummaryGrid,
          .quickTechnicalGrid {
            grid-template-columns: 1fr;
          }

          .leadStory {
            grid-template-columns: 1fr;
          }

          .leadVisual {
            min-height: 160px;
          }

          .bankStockGrid {
            grid-template-columns: 1fr;
          }

          .filterGrid {
            display: none;
            grid-template-columns: 1fr;
          }

          .filterGrid.open {
            display: grid;
          }

          .mobileFilterToggle {
            display: inline-flex;
          }

          .filterHeader {
            flex-wrap: wrap;
          }

          .bankContentGrid {
            grid-template-columns: 1fr;
          }

          .quickAnalysisOverlay {
            align-items: flex-end;
            justify-content: center;
          }

          .quickAnalysisPanel {
            height: min(88vh, 760px);
            width: 100%;
            border-radius: 24px 24px 0 0;
          }
        }

        @media (max-width: 520px) {
          .bankingWorkspace {
            padding-inline: 10px;
          }

          .bankSection,
          .bankPanel,
          .bankFilterPanel,
          .bankSideRail {
            padding: 14px;
            border-radius: 18px;
          }

          .bankTickerItem {
            flex-basis: min(78vw, 260px);
          }

          .bankStockMetrics,
          .bankStockMetaGrid {
            grid-template-columns: 1fr;
          }

          .bankStockActions,
          .leadActions,
          .newsCardActions,
          .quickPanelFooter div {
            width: 100%;
          }

          .bankPrimaryMini,
          .bankSecondaryMini,
          .newsCardActions a,
          .newsCardActions button,
          .quickPanelFooter .bankPrimaryButton,
          .quickPanelFooter .bankSecondaryButton {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }

          .bankTickerViewport {
            overflow-x: auto;
            mask-image: none;
            scrollbar-width: thin;
          }

          .bankTickerTrack {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BankNewsPage;
