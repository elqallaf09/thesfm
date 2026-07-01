'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Clock3,
  Cloud,
  Cpu,
  ExternalLink,
  Filter,
  Info,
  Layers3,
  LineChart,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';
import { useLanguage } from '@/hooks/useLanguage';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import { getNewsPageBackground } from '@/lib/news/pageBackground';

type LangCode = 'ar' | 'en' | 'fr';
type GrowthTab = 'overview' | 'stocks' | 'news' | 'sectors';
type SectorId =
  | 'all'
  | 'ai'
  | 'semiconductors'
  | 'cloud'
  | 'cybersecurity'
  | 'ecommerce'
  | 'fintech'
  | 'ev'
  | 'healthcare'
  | 'digital_platforms';
type NewsTimeFilter = 'all' | 'day' | 'week' | 'month';
type NewsSort = 'latest' | 'oldest' | 'strongestMove';
type StockSort = 'momentum' | 'leastVolatile' | 'name' | 'sector';
type DisclosureId =
  | 'what'
  | 'metrics'
  | 'growth-value'
  | 'growth-momentum'
  | 'valuation-risk'
  | 'rates'
  | 'peg';

type GrowthTickerItem = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available?: boolean;
  unavailableReason?: string;
};

type GrowthTickerResponse =
  | {
      ok: true;
      source: string;
      updated_at: string;
      available_count?: number;
      items: GrowthTickerItem[];
    }
  | {
      ok: false;
      code: string;
      source: string | null;
      updated_at: string | null;
      items: GrowthTickerItem[];
    };

type GrowthNewsItem = {
  id: string;
  title: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translatedTo?: string | null;
  companyName?: string | null;
  ticker?: string | null;
  sector?: string | null;
  sectors?: string[] | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  delayed?: boolean;
};

type GrowthNewsResponse =
  | {
      success: true;
      category: string;
      source: string;
      priceSource?: string | null;
      lastUpdated: string;
      language: string;
      translationEnabled: boolean;
      items: GrowthNewsItem[];
      limit: number;
      message?: string;
    }
  | {
      success: false;
      error: string;
      reason?: string;
    };

type GrowthStockRow = GrowthTickerItem & {
  sectorId: Exclude<SectorId, 'all'>;
  sectorLabel: string;
  momentumLabel: string;
  momentumTone: Tone;
  valuationRiskLabel: string;
  qualityLabel: string;
  growthClassification: string;
  dataCompleteness: number;
};

type GrowthAnalysisResponse = {
  ok?: boolean;
  success?: boolean;
  symbol?: string;
  providerSymbol?: string;
  name?: string;
  assetType?: string;
  currency?: string | null;
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
  fundamentals?: Record<string, unknown>;
  fundamentalsAvailable?: boolean;
  fundamentalsUnavailableReason?: string;
  fundamentalsSource?: string;
  technicals?: Record<string, unknown>;
  trend?: string;
  riskLevel?: string;
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
  history?: unknown[];
  summary?: string;
  source?: string;
  provider?: string;
  dataStatus?: string;
  warnings?: string[];
  aiInsight?: {
    status?: string;
    provider?: string;
    summary?: string;
    trendStatus?: string;
    riskNotes?: string;
    watchNext?: string[];
  };
  marketDataService?: string;
  error?: string;
  message?: string;
};

type GrowthAssetProfileResponse = {
  success?: boolean;
  symbol?: string;
  providerSymbol?: string;
  assetType?: string;
  source?: string;
  lastUpdated?: string;
  profileAvailable?: boolean;
  unavailableReason?: string;
  profile?: {
    name?: string;
    ticker?: string;
    exchange?: string;
    category?: string;
    sector?: string;
    industry?: string;
    country?: string;
    website?: string;
    description?: string;
    marketCap?: number | string;
    employees?: number | string;
    currency?: string;
    dataLimitations?: string[];
  } | null;
};

type GrowthStockDetail = {
  analysis: GrowthAnalysisResponse | null;
  profile: GrowthAssetProfileResponse | null;
  error?: string | null;
};

type AnalysisModalState = {
  open: boolean;
  row: GrowthStockRow | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  detail: GrowthStockDetail | null;
  error: string | null;
};

type Tone = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';

const COPY = {
  ar: {
    badge: 'مركز أبحاث النمو',
    title: 'أسهم النمو',
    subtitle: 'اكتشف الشركات التي تحقق نمواً مرتفعاً، وقارن فرصها بمخاطر التقييم والتذبذب اعتماداً على البيانات المتاحة فقط.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    live: 'بيانات مباشرة',
    delayed: 'متأخرة أو مخزنة مؤقتاً',
    cached: 'بيانات مخزنة مؤقتاً',
    connected: 'الخدمة متصلة',
    partial: 'بيانات جزئية',
    unavailable: 'غير متاح',
    missingDataHint: 'لم يوفر مزود البيانات هذه القيمة حالياً.',
    selectedCount: 'عدد الأسهم المحددة',
    startComparison: 'بدء المقارنة',
    clearSelection: 'مسح الاختيار',
    removeFromComparison: 'إزالة من المقارنة',
    comparisonNeedsTwo: 'اختر سهمين على الأقل لبدء المقارنة.',
    comparisonLimit: 'يمكن مقارنة 5 أسهم كحد أقصى.',
    comparisonDetailsTitle: 'مقارنة تفصيلية',
    close: 'إغلاق',
    companyName: 'اسم الشركة',
    industry: 'الصناعة',
    currency: 'العملة',
    riskLevel: 'مستوى المخاطر',
    aiConfidence: 'درجة / ثقة الذكاء الاصطناعي',
    recommendationStatus: 'حالة التوصية',
    dataProvider: 'مزود البيانات',
    availableStocks: 'عدد الأسهم المتاحة',
    missingFields: 'عدد الحقول الناقصة',
    dataCondition: 'حالة البيانات',
    someFieldsUnavailable: 'بعض الحقول غير متاحة',
    delayedData: 'بيانات متأخرة',
    analysisTitle: 'تحليل السهم',
    analysisLoading: 'جاري جلب تحليل السهم...',
    analysisError: 'تعذر جلب تحليل هذا السهم حالياً.',
    growthCategory: 'فئة النمو',
    priceChange: 'تغير السعر',
    keyMetrics: 'المقاييس الرئيسية',
    technicalSummary: 'الملخص الفني',
    aiGrowthThesis: 'أطروحة النمو / الذكاء الاصطناعي',
    strengths: 'نقاط القوة',
    risks: 'المخاطر',
    dataQuality: 'جودة البيانات',
    providerSource: 'المزود / المصدر',
    lowRisk: 'منخفضة',
    mediumRisk: 'متوسطة',
    highRisk: 'مرتفعة',
    bullish: 'إيجابي',
    bearish: 'سلبي',
    neutralTrend: 'محايد',
    lastQuoteUpdate: 'آخر تحديث للأسعار',
    lastNewsUpdate: 'آخر تحديث للأخبار',
    source: 'المصدر',
    quoteSource: 'مصدر الأسعار',
    newsSource: 'مصدر الأخبار',
    marketClosedNote: 'قد تكون الأسعار متأخرة حسب مزود البيانات وحالة السوق.',
    tabs: {
      overview: 'نظرة عامة',
      stocks: 'الأسهم',
      news: 'الأخبار',
      sectors: 'القطاعات',
    },
    summaryTitle: 'ملخص أسهم النمو اليوم',
    risingStocks: 'أسهم مرتفعة',
    fallingStocks: 'أسهم منخفضة',
    bestSector: 'أفضل قطاع نمو',
    strongestStock: 'أقوى أداء',
    calmestStock: 'أقل تذبذب اليوم',
    trackedStocks: 'أسهم مراقبة',
    comparisonTitle: 'مقارنة أسهم النمو',
    comparisonDescription: 'مقارنة الأداء اليومي المتاح من مزود الأسعار. البيانات التاريخية أو الأساسيات تظهر فقط عند توفرها من مصدر حقيقي.',
    chartUnavailable: 'البيانات التاريخية غير متاحة لهذا المسار حالياً، لذلك تظهر المقارنة من الأسعار الحالية فقط.',
    selectForCompare: 'اختر للمقارنة',
    educationTitle: 'دليل أسهم النمو',
    educationDescription: 'بطاقات مختصرة تشرح المنهجية والمخاطر بدون إطالة الصفحة.',
    highlightedTitle: 'أسهم نمو للمتابعة',
    highlightedDescription: 'قائمة مراقبة مبنية على الكون الحالي للصفحة وأسعار حقيقية عند توفرها.',
    stocksTitle: 'مصفاة أسهم النمو',
    stocksDescription: 'ابحث وفرز أسهم النمو حسب القطاع والزخم المتاح. مقاييس الأساسيات غير المتوفرة لا تُستبدل بأرقام وهمية.',
    newsTitle: 'أخبار أسهم النمو',
    newsDescription: 'أخبار مرتبطة بأسهم وقطاعات النمو مع عرض عربي عند توفر الترجمة، والنص الأصلي عند الحاجة.',
    sectorsTitle: 'دليل قطاعات النمو',
    sectorsDescription: 'تنظيم القطاعات حسب محركات النمو والمخاطر والشركات المتاحة داخل الصفحة.',
    searchStocks: 'ابحث عن شركة أو رمز...',
    searchNews: 'ابحث في الأخبار أو الرموز...',
    sector: 'القطاع',
    allSectors: 'كل القطاعات',
    sort: 'الترتيب',
    clearFilters: 'مسح الفلاتر',
    filter: 'تصفية',
    resultCount: 'عدد النتائج',
    latest: 'الأحدث',
    oldest: 'الأقدم',
    strongestMove: 'أقوى حركة مرتبطة',
    momentumSort: 'أقوى زخم',
    leastVolatile: 'الأقل تذبذباً',
    nameSort: 'الاسم',
    sectorSort: 'القطاع',
    timeRange: 'الفترة',
    allTime: 'كل الفترات',
    lastDay: 'آخر 24 ساعة',
    lastWeek: 'آخر 7 أيام',
    lastMonth: 'آخر 30 يوماً',
    sourceFilter: 'المصدر',
    symbolFilter: 'الشركة / الرمز',
    loadMore: 'عرض المزيد',
    noStocks: 'لا توجد أسهم مطابقة للفلاتر الحالية.',
    noNews: 'لا توجد أخبار مطابقة للفلاتر الحالية.',
    retry: 'إعادة المحاولة',
    providerError: 'تعذر تحديث البيانات حالياً. يتم عرض آخر بيانات متاحة إن وجدت.',
    readArticle: 'قراءة الخبر',
    save: 'حفظ',
    share: 'مشاركة',
    originalText: 'عرض النص الأصلي',
    translatedText: 'عرض الترجمة',
    machineTranslation: 'ترجمة آلية',
    originalAvailable: 'النص الأصلي',
    relatedSymbol: 'الرمز المرتبط',
    marketContext: 'حركة السهم المرتبط',
    quoteDelayed: 'سعر متأخر',
    priceUnavailable: 'سعر السهم غير متاح حالياً',
    addWatchlist: 'إضافة للمراقبة',
    compare: 'مقارنة',
    viewAnalysis: 'عرض التحليل',
    currentPrice: 'السعر',
    dailyChange: 'التغير',
    revenueGrowth: 'نمو الإيرادات',
    earningsGrowth: 'نمو الأرباح',
    forwardGrowth: 'النمو المتوقع',
    grossMargin: 'الهامش الإجمالي',
    freeCashFlow: 'التدفق النقدي الحر',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    peg: 'PEG',
    priceSales: 'Price/Sales',
    roic: 'ROIC',
    volatility: 'التذبذب',
    drawdown: 'أعلى هبوط',
    marketCap: 'القيمة السوقية',
    valuationRisk: 'مخاطر التقييم',
    fundamentalsUnavailable: 'البيانات الأساسية غير متاحة',
    notEnoughFundamentals: 'لا تتوفر بيانات أساسية كافية',
    qualityGrowth: 'نمو عالي الجودة',
    profitableGrowth: 'نمو ربحي',
    speculativeGrowth: 'نمو مضاربي',
    matureGrowth: 'نمو ناضج',
    momentumPositive: 'زخم إيجابي',
    momentumNegative: 'زخم سلبي',
    momentumNeutral: 'زخم محايد',
    unknownValuation: 'غير متاح',
    methodology: 'المنهجية',
    howCalculated: 'كيف تم احتساب الدرجة؟',
    insufficientMethodology: 'التصنيف الأساسي يتطلب بيانات نمو الإيرادات والأرباح والهوامش والتدفق النقدي. عند غيابها نعرض حالة عدم كفاية البيانات بدلاً من درجة وهمية.',
    sourceNotice: 'الأخبار والبيانات مجمعة من مصادر مالية خارجية. التصنيفات المعروضة آلية عند توفرها ولأغراض معلوماتية فقط، ولا تُعد نصيحة استثمارية.',
    disclaimer: 'هذه الصفحة لأغراض تعليمية ومعلوماتية فقط، ولا تمثل توصية بشراء أو بيع أي سهم. قرارات الاستثمار تقع على مسؤولية المستخدم.',
    dataStatusTitle: 'شفافية البيانات',
    noPortfolioTab: 'لا تظهر تبويبة المحفظة إلا عند وجود مطابقة حقيقية مع بيانات المستخدم.',
    historicalUnavailable: 'البيانات التاريخية غير متاحة لهذا الأصل حالياً.',
    expanded: 'إخفاء التفاصيل',
    collapsed: 'عرض التفاصيل',
  },
  en: {
    badge: 'Growth research hub',
    title: 'Growth Stocks',
    subtitle: 'Explore high-growth companies and compare opportunity, valuation risk, and volatility using only available market data.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    live: 'Live data',
    delayed: 'Delayed or cached',
    cached: 'Cached data',
    connected: 'Service connected',
    partial: 'Partial data',
    unavailable: 'Unavailable',
    missingDataHint: 'The data provider has not supplied this value right now.',
    selectedCount: 'Selected stocks',
    startComparison: 'Start comparison',
    clearSelection: 'Clear selection',
    removeFromComparison: 'Remove from comparison',
    comparisonNeedsTwo: 'Select at least two stocks to compare.',
    comparisonLimit: 'You can compare up to 5 stocks.',
    comparisonDetailsTitle: 'Detailed comparison',
    close: 'Close',
    companyName: 'Company name',
    industry: 'Industry',
    currency: 'Currency',
    riskLevel: 'Risk level',
    aiConfidence: 'AI score / confidence',
    recommendationStatus: 'Recommendation status',
    dataProvider: 'Data provider',
    availableStocks: 'Available stocks',
    missingFields: 'Missing fields',
    dataCondition: 'Data condition',
    someFieldsUnavailable: 'Some fields unavailable',
    delayedData: 'Delayed data',
    analysisTitle: 'Stock analysis',
    analysisLoading: 'Loading stock analysis...',
    analysisError: 'Unable to fetch this stock analysis right now.',
    growthCategory: 'Growth category',
    priceChange: 'Price change',
    keyMetrics: 'Key metrics',
    technicalSummary: 'Technical summary',
    aiGrowthThesis: 'AI / growth thesis',
    strengths: 'Strengths',
    risks: 'Risks',
    dataQuality: 'Data quality',
    providerSource: 'Provider / source',
    lowRisk: 'Low',
    mediumRisk: 'Medium',
    highRisk: 'High',
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutralTrend: 'Neutral',
    lastQuoteUpdate: 'Quote update',
    lastNewsUpdate: 'News update',
    source: 'Source',
    quoteSource: 'Quote source',
    newsSource: 'News source',
    marketClosedNote: 'Quotes may be delayed depending on provider and market status.',
    tabs: { overview: 'Overview', stocks: 'Stocks', news: 'News', sectors: 'Sectors' },
    summaryTitle: 'Growth stocks today',
    risingStocks: 'Risers',
    fallingStocks: 'Fallers',
    bestSector: 'Best growth sector',
    strongestStock: 'Strongest move',
    calmestStock: 'Lowest volatility today',
    trackedStocks: 'Tracked stocks',
    comparisonTitle: 'Growth comparison',
    comparisonDescription: 'Compares the real daily performance currently available from the quote provider.',
    chartUnavailable: 'Historical data is unavailable in this route, so the chart uses current quotes only.',
    selectForCompare: 'Select for comparison',
    educationTitle: 'Growth stock guide',
    educationDescription: 'Concise methodology and risk cards without making the page long.',
    highlightedTitle: 'Growth watchlist',
    highlightedDescription: 'Companies from the current growth universe with real quotes when available.',
    stocksTitle: 'Growth stock screener',
    stocksDescription: 'Search and sort growth stocks by sector and available momentum. Missing fundamentals are not replaced with fake values.',
    newsTitle: 'Growth stock news',
    newsDescription: 'News tied to growth companies and sectors, with translations when available.',
    sectorsTitle: 'Growth sector guide',
    sectorsDescription: 'Sector drivers, risks, and companies available in the current page.',
    searchStocks: 'Search company or symbol...',
    searchNews: 'Search news or symbols...',
    sector: 'Sector',
    allSectors: 'All sectors',
    sort: 'Sort',
    clearFilters: 'Clear filters',
    filter: 'Filter',
    resultCount: 'Results',
    latest: 'Latest',
    oldest: 'Oldest',
    strongestMove: 'Strongest related move',
    momentumSort: 'Strongest momentum',
    leastVolatile: 'Lowest volatility',
    nameSort: 'Name',
    sectorSort: 'Sector',
    timeRange: 'Time range',
    allTime: 'All time',
    lastDay: 'Last 24 hours',
    lastWeek: 'Last 7 days',
    lastMonth: 'Last 30 days',
    sourceFilter: 'Source',
    symbolFilter: 'Company / symbol',
    loadMore: 'Load more',
    noStocks: 'No stocks match the current filters.',
    noNews: 'No news match the current filters.',
    retry: 'Retry',
    providerError: 'Unable to refresh data right now. Showing the latest available data when present.',
    readArticle: 'Read article',
    save: 'Save',
    share: 'Share',
    originalText: 'Show original',
    translatedText: 'Show translation',
    machineTranslation: 'Machine translation',
    originalAvailable: 'Original text',
    relatedSymbol: 'Related symbol',
    marketContext: 'Related stock move',
    quoteDelayed: 'Delayed quote',
    priceUnavailable: 'Stock quote unavailable',
    addWatchlist: 'Add to watchlist',
    compare: 'Compare',
    viewAnalysis: 'View analysis',
    currentPrice: 'Price',
    dailyChange: 'Change',
    revenueGrowth: 'Revenue growth',
    earningsGrowth: 'Earnings growth',
    forwardGrowth: 'Forward growth',
    grossMargin: 'Gross margin',
    freeCashFlow: 'Free cash flow',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    peg: 'PEG',
    priceSales: 'Price/Sales',
    roic: 'ROIC',
    volatility: 'Volatility',
    drawdown: 'Max drawdown',
    marketCap: 'Market cap',
    valuationRisk: 'Valuation risk',
    fundamentalsUnavailable: 'Fundamentals unavailable',
    notEnoughFundamentals: 'Insufficient fundamentals',
    qualityGrowth: 'Quality growth',
    profitableGrowth: 'Profitable growth',
    speculativeGrowth: 'Speculative growth',
    matureGrowth: 'Mature growth',
    momentumPositive: 'Positive momentum',
    momentumNegative: 'Negative momentum',
    momentumNeutral: 'Neutral momentum',
    unknownValuation: 'Unavailable',
    methodology: 'Methodology',
    howCalculated: 'How is this calculated?',
    insufficientMethodology: 'Fundamental classification needs revenue growth, earnings growth, margins, and cash-flow data. When missing, the UI shows insufficient data instead of a fake score.',
    sourceNotice: 'News and data are aggregated from external financial sources. Automated labels are informational only and are not investment advice.',
    disclaimer: 'This page is for educational and informational purposes only and is not a recommendation to buy or sell securities.',
    dataStatusTitle: 'Data transparency',
    noPortfolioTab: 'Portfolio tab appears only when a real user-data match exists.',
    historicalUnavailable: 'Historical data is currently unavailable for this asset.',
    expanded: 'Hide details',
    collapsed: 'Show details',
  },
  fr: {
    badge: 'Centre croissance',
    title: 'Actions de croissance',
    subtitle: 'Comparez les sociétés de croissance avec les risques de valorisation et de volatilité à partir des données disponibles.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    live: 'Données en direct',
    delayed: 'Retardées ou en cache',
    cached: 'Données en cache',
    connected: 'Service connecté',
    partial: 'Données partielles',
    unavailable: 'Indisponible',
    missingDataHint: 'Le fournisseur de données ne fournit pas cette valeur actuellement.',
    selectedCount: 'Actions sélectionnées',
    startComparison: 'Lancer la comparaison',
    clearSelection: 'Effacer la sélection',
    removeFromComparison: 'Retirer de la comparaison',
    comparisonNeedsTwo: 'Sélectionnez au moins deux actions à comparer.',
    comparisonLimit: 'Vous pouvez comparer jusqu’à 5 actions.',
    comparisonDetailsTitle: 'Comparaison détaillée',
    close: 'Fermer',
    companyName: 'Nom de la société',
    industry: 'Industrie',
    currency: 'Devise',
    riskLevel: 'Niveau de risque',
    aiConfidence: 'Score / confiance IA',
    recommendationStatus: 'Statut de recommandation',
    dataProvider: 'Fournisseur de données',
    availableStocks: 'Actions disponibles',
    missingFields: 'Champs manquants',
    dataCondition: 'État des données',
    someFieldsUnavailable: 'Certains champs sont indisponibles',
    delayedData: 'Données retardées',
    analysisTitle: 'Analyse de l’action',
    analysisLoading: 'Chargement de l’analyse...',
    analysisError: 'Impossible de récupérer l’analyse de cette action pour le moment.',
    growthCategory: 'Catégorie de croissance',
    priceChange: 'Variation du prix',
    keyMetrics: 'Indicateurs clés',
    technicalSummary: 'Résumé technique',
    aiGrowthThesis: 'Thèse IA / croissance',
    strengths: 'Points forts',
    risks: 'Risques',
    dataQuality: 'Qualité des données',
    providerSource: 'Fournisseur / source',
    lowRisk: 'Faible',
    mediumRisk: 'Moyen',
    highRisk: 'Élevé',
    bullish: 'Haussier',
    bearish: 'Baissier',
    neutralTrend: 'Neutre',
    lastQuoteUpdate: 'Mise à jour des cours',
    lastNewsUpdate: 'Mise à jour des actualités',
    source: 'Source',
    quoteSource: 'Source des cours',
    newsSource: 'Source des actualités',
    marketClosedNote: 'Les cours peuvent être retardés selon le fournisseur et l’état du marché.',
    tabs: { overview: 'Vue générale', stocks: 'Actions', news: 'Actualités', sectors: 'Secteurs' },
    summaryTitle: 'Actions de croissance aujourd’hui',
    risingStocks: 'En hausse',
    fallingStocks: 'En baisse',
    bestSector: 'Meilleur secteur',
    strongestStock: 'Plus forte variation',
    calmestStock: 'Moins volatile',
    trackedStocks: 'Actions suivies',
    comparisonTitle: 'Comparaison croissance',
    comparisonDescription: 'Compare la performance quotidienne réelle disponible auprès du fournisseur de cours.',
    chartUnavailable: 'Les données historiques ne sont pas disponibles ici; la comparaison utilise les cours actuels.',
    selectForCompare: 'Sélectionner',
    educationTitle: 'Guide des actions de croissance',
    educationDescription: 'Cartes méthodologiques compactes.',
    highlightedTitle: 'Liste de suivi croissance',
    highlightedDescription: 'Sociétés de l’univers croissance avec cours réels si disponibles.',
    stocksTitle: 'Filtre actions de croissance',
    stocksDescription: 'Recherche et tri par secteur et momentum disponible. Les fondamentaux manquants ne sont pas remplacés par de fausses valeurs.',
    newsTitle: 'Actualités croissance',
    newsDescription: 'Actualités liées aux sociétés et secteurs de croissance.',
    sectorsTitle: 'Guide des secteurs de croissance',
    sectorsDescription: 'Moteurs, risques et sociétés disponibles.',
    searchStocks: 'Rechercher société ou symbole...',
    searchNews: 'Rechercher actualités ou symboles...',
    sector: 'Secteur',
    allSectors: 'Tous les secteurs',
    sort: 'Tri',
    clearFilters: 'Effacer',
    filter: 'Filtrer',
    resultCount: 'Résultats',
    latest: 'Récentes',
    oldest: 'Anciennes',
    strongestMove: 'Plus forte variation liée',
    momentumSort: 'Meilleur momentum',
    leastVolatile: 'Moins volatile',
    nameSort: 'Nom',
    sectorSort: 'Secteur',
    timeRange: 'Période',
    allTime: 'Toutes',
    lastDay: '24 dernières heures',
    lastWeek: '7 derniers jours',
    lastMonth: '30 derniers jours',
    sourceFilter: 'Source',
    symbolFilter: 'Société / symbole',
    loadMore: 'Afficher plus',
    noStocks: 'Aucune action ne correspond aux filtres.',
    noNews: 'Aucune actualité ne correspond aux filtres.',
    retry: 'Réessayer',
    providerError: 'Impossible d’actualiser les données. Les dernières données disponibles restent affichées.',
    readArticle: 'Lire',
    save: 'Enregistrer',
    share: 'Partager',
    originalText: 'Texte original',
    translatedText: 'Traduction',
    machineTranslation: 'Traduction automatique',
    originalAvailable: 'Texte original',
    relatedSymbol: 'Symbole lié',
    marketContext: 'Mouvement lié',
    quoteDelayed: 'Cours retardé',
    priceUnavailable: 'Cours indisponible',
    addWatchlist: 'Ajouter à la liste',
    compare: 'Comparer',
    viewAnalysis: 'Voir analyse',
    currentPrice: 'Prix',
    dailyChange: 'Variation',
    revenueGrowth: 'Croissance CA',
    earningsGrowth: 'Croissance bénéfices',
    forwardGrowth: 'Croissance prévue',
    grossMargin: 'Marge brute',
    freeCashFlow: 'Flux libre',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    peg: 'PEG',
    priceSales: 'Price/Sales',
    roic: 'ROIC',
    volatility: 'Volatilité',
    drawdown: 'Drawdown max',
    marketCap: 'Capitalisation',
    valuationRisk: 'Risque valorisation',
    fundamentalsUnavailable: 'Fondamentaux indisponibles',
    notEnoughFundamentals: 'Données fondamentales insuffisantes',
    qualityGrowth: 'Croissance qualité',
    profitableGrowth: 'Croissance rentable',
    speculativeGrowth: 'Croissance spéculative',
    matureGrowth: 'Croissance mature',
    momentumPositive: 'Momentum positif',
    momentumNegative: 'Momentum négatif',
    momentumNeutral: 'Momentum neutre',
    unknownValuation: 'Indisponible',
    methodology: 'Méthodologie',
    howCalculated: 'Comment est-ce calculé ?',
    insufficientMethodology: 'La classification fondamentale exige croissance du CA, bénéfices, marges et cash-flow. Si absent, on affiche données insuffisantes.',
    sourceNotice: 'Actualités et données proviennent de sources financières externes. Les libellés automatiques sont informatifs uniquement.',
    disclaimer: 'Cette page est informative et éducative, sans recommandation d’achat ou de vente.',
    dataStatusTitle: 'Transparence des données',
    noPortfolioTab: 'L’onglet portefeuille n’apparaît qu’avec une correspondance réelle.',
    historicalUnavailable: 'Données historiques indisponibles.',
    expanded: 'Masquer',
    collapsed: 'Afficher',
  },
} as const;

const SECTORS: Record<Exclude<SectorId, 'all'>, {
  icon: LucideIcon;
  labels: Record<LangCode, string>;
  description: Record<LangCode, string>;
  drivers: Record<LangCode, string>;
  risks: Record<LangCode, string>;
  symbols: string[];
}> = {
  ai: {
    icon: BrainCircuit,
    labels: { ar: 'الذكاء الاصطناعي والتقنية', en: 'AI and platforms', fr: 'IA et plateformes' },
    description: {
      ar: 'شركات تستفيد من البنية التحتية للذكاء الاصطناعي ونماذج البرمجيات والمنصات.',
      en: 'Companies exposed to AI infrastructure, software models, and platform economics.',
      fr: 'Sociétés exposées à l’IA, aux logiciels et aux plateformes.',
    },
    drivers: { ar: 'الإنفاق السحابي، الطلب على المسرعات، الاشتراكات المؤسسية.', en: 'Cloud spending, accelerators, enterprise subscriptions.', fr: 'Cloud, accélérateurs, abonnements entreprises.' },
    risks: { ar: 'تقييمات مرتفعة، دورات إنفاق، منافسة تقنية سريعة.', en: 'High valuations, spending cycles, rapid competition.', fr: 'Valorisations élevées, cycles d’investissement, concurrence.' },
    symbols: ['NVDA', 'MSFT', 'GOOGL', 'META', 'PLTR'],
  },
  semiconductors: {
    icon: Cpu,
    labels: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' },
    description: {
      ar: 'مزودو الرقائق والمسرعات والبنية اللازمة للحوسبة المتقدمة.',
      en: 'Chip, accelerator, and infrastructure providers for advanced computing.',
      fr: 'Puce, accélérateurs et infrastructure de calcul avancé.',
    },
    drivers: { ar: 'مراكز البيانات، الذكاء الاصطناعي، السيارات، الهواتف.', en: 'Data centers, AI, autos, devices.', fr: 'Centres de données, IA, autos, appareils.' },
    risks: { ar: 'دورات مخزون، قيود توريد، حساسية جيوسياسية.', en: 'Inventory cycles, supply limits, geopolitics.', fr: 'Cycles de stock, offre, géopolitique.' },
    symbols: ['NVDA', 'AVGO', 'AMD'],
  },
  cloud: {
    icon: Cloud,
    labels: { ar: 'الحوسبة السحابية والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
    description: {
      ar: 'برمجيات اشتراكية وسحابة مؤسسية ذات قابلية توسع عالية.',
      en: 'Subscription software and enterprise cloud with scalable economics.',
      fr: 'Logiciels d’abonnement et cloud d’entreprise.',
    },
    drivers: { ar: 'تحول رقمي، احتفاظ العملاء، توسع هوامش البرمجيات.', en: 'Digital transformation, retention, margin expansion.', fr: 'Transformation numérique, rétention, marges.' },
    risks: { ar: 'تباطؤ عقود المؤسسات، ضغط أسعار، منافسة.', en: 'Enterprise slowdown, pricing pressure, competition.', fr: 'Ralentissement entreprises, prix, concurrence.' },
    symbols: ['CRM', 'NOW', 'SNOW', 'DDOG', 'NET'],
  },
  cybersecurity: {
    icon: ShieldCheck,
    labels: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' },
    description: {
      ar: 'شركات حماية الشبكات والهوية والبنية السحابية.',
      en: 'Network, identity, and cloud security companies.',
      fr: 'Sécurité réseau, identité et cloud.',
    },
    drivers: { ar: 'التهديدات الرقمية، الامتثال، إنفاق الأمن المؤسسي.', en: 'Digital threats, compliance, enterprise security spend.', fr: 'Menaces, conformité, dépenses sécurité.' },
    risks: { ar: 'تنافس حاد، دمج الموردين، تقييمات النمو.', en: 'Competition, vendor consolidation, growth valuations.', fr: 'Concurrence, consolidation, valorisations.' },
    symbols: ['CRWD', 'NET'],
  },
  ecommerce: {
    icon: ShoppingBag,
    labels: { ar: 'التجارة الإلكترونية والاستهلاك الرقمي', en: 'E-commerce and digital consumption', fr: 'E-commerce et consommation numérique' },
    description: {
      ar: 'منصات تجارة وخدمات رقمية تستفيد من توسع الاستهلاك عبر الإنترنت.',
      en: 'Commerce and digital service platforms tied to online consumption growth.',
      fr: 'Plateformes de commerce et services numériques.',
    },
    drivers: { ar: 'نمو المستخدمين، الإعلانات، المدفوعات، السوق العالمي.', en: 'User growth, ads, payments, global marketplaces.', fr: 'Utilisateurs, publicité, paiements, marchés.' },
    risks: { ar: 'هوامش ضغط، دورات المستهلك، منافسة المنصات.', en: 'Margin pressure, consumer cycles, platform competition.', fr: 'Pression marges, cycles consommateurs, concurrence.' },
    symbols: ['AMZN', 'SHOP', 'MELI', 'ABNB', 'RBLX'],
  },
  fintech: {
    icon: Zap,
    labels: { ar: 'التقنية المالية', en: 'Fintech', fr: 'Fintech' },
    description: {
      ar: 'مدفوعات، منصات وساطة وخدمات مالية رقمية ذات نمو هيكلي.',
      en: 'Payments, brokerage platforms, and digital finance with structural growth.',
      fr: 'Paiements, courtage et finance numérique.',
    },
    drivers: { ar: 'تبني المدفوعات الرقمية، التداول، خدمات الشركات الصغيرة.', en: 'Digital payments, trading, SMB services.', fr: 'Paiements numériques, trading, PME.' },
    risks: { ar: 'تنظيم، ائتمان، دورات شهية المخاطرة.', en: 'Regulation, credit, risk appetite cycles.', fr: 'Réglementation, crédit, cycles de risque.' },
    symbols: ['COIN', 'SQ', 'PYPL'],
  },
  ev: {
    icon: LineChart,
    labels: { ar: 'السيارات الكهربائية والطاقة النظيفة', en: 'EV and clean energy', fr: 'VE et énergie propre' },
    description: {
      ar: 'شركات مرتبطة بالتحول الكهربائي والطاقة والبنية النظيفة.',
      en: 'Companies tied to electrification, energy transition, and clean infrastructure.',
      fr: 'Électrification, transition énergétique et infrastructure propre.',
    },
    drivers: { ar: 'دعم حكومي، تصنيع، بطاريات، بنية شحن.', en: 'Policy support, manufacturing, batteries, charging.', fr: 'Soutien public, batteries, recharge.' },
    risks: { ar: 'هوامش سيارات، أسعار فائدة، تأخر الطلب.', en: 'Auto margins, rates, demand delays.', fr: 'Marges auto, taux, demande.' },
    symbols: ['TSLA', 'RIVN', 'ENPH'],
  },
  healthcare: {
    icon: BriefcaseBusiness,
    labels: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' },
    description: {
      ar: 'أجهزة وتقنيات صحية ذات مسارات نمو طويلة عند توفر بياناتها.',
      en: 'Medical devices and health technology with long-duration growth paths.',
      fr: 'Dispositifs médicaux et technologies santé.',
    },
    drivers: { ar: 'ابتكار علاجي، توسع أسواق، تبني تقنيات طبية.', en: 'Therapeutic innovation, market expansion, medical adoption.', fr: 'Innovation thérapeutique, expansion, adoption.' },
    risks: { ar: 'تجارب سريرية، تنظيم، تعويضات التأمين.', en: 'Trials, regulation, reimbursement.', fr: 'Essais, réglementation, remboursement.' },
    symbols: ['ISRG', 'DXCM'],
  },
  digital_platforms: {
    icon: Layers3,
    labels: { ar: 'المنصات الرقمية الكبرى', en: 'Large digital platforms', fr: 'Grandes plateformes numériques' },
    description: {
      ar: 'شركات منصة تجمع بين نمو الإعلانات، الاشتراكات، السحابة، أو السوق الرقمي.',
      en: 'Platform companies combining ads, subscriptions, cloud, or digital marketplaces.',
      fr: 'Plateformes combinant publicité, abonnements, cloud ou marketplaces.',
    },
    drivers: { ar: 'شبكات مستخدمين، بيانات، نظام بيئي، هوامش تشغيل.', en: 'Networks, data, ecosystems, operating leverage.', fr: 'Réseaux, données, écosystèmes, levier opérationnel.' },
    risks: { ar: 'تنظيم، تركّز إيرادات، تباطؤ نمو ناضج.', en: 'Regulation, revenue concentration, mature growth slowdown.', fr: 'Réglementation, concentration, maturité.' },
    symbols: ['AAPL', 'META', 'GOOGL', 'NFLX', 'UBER'],
  },
};

const STOCK_SECTOR: Record<string, Exclude<SectorId, 'all'>> = Object.entries(SECTORS).reduce((acc, [sectorId, sector]) => {
  sector.symbols.forEach(symbol => {
    acc[symbol] = sectorId as Exclude<SectorId, 'all'>;
  });
  return acc;
}, {} as Record<string, Exclude<SectorId, 'all'>>);

const TAB_IDS: GrowthTab[] = ['overview', 'stocks', 'news', 'sectors'];
const INITIAL_NEWS_LIMIT = 9;
const NEWS_PAGE_SIZE = 9;
const MOVER_VISIBLE_LIMIT = 5;
const LOCALE_BY_LANG: Record<LangCode, string> = { ar: 'ar-KW-u-nu-latn', en: 'en-US', fr: 'fr-FR' };

function getLang(lang: string): LangCode {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

function safeUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeTitle(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function dedupeNews(items: GrowthNewsItem[]) {
  const seen = new Set<string>();
  const result: GrowthNewsItem[] = [];
  for (const item of items) {
    const canonical = safeUrl(item.url);
    const titleKey = normalizeTitle(item.titleOriginal || item.title || item.headline);
    const key = canonical ? `url:${canonical}` : item.id ? `id:${item.id}` : `${item.source}:${titleKey}`;
    if (!titleKey && !canonical) continue;
    if (seen.has(key) || seen.has(`title:${titleKey}`)) continue;
    seen.add(key);
    if (titleKey) seen.add(`title:${titleKey}`);
    result.push(item);
  }
  return result;
}

function numberFormatter(lang: LangCode, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LOCALE_BY_LANG[lang], options);
}

function formatNumber(value: number | null | undefined, lang: LangCode, options?: Intl.NumberFormatOptions) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  return numberFormatter(lang, options).format(value);
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined, lang: LangCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  try {
    return numberFormatter(lang, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value < 10 ? 2 : 2,
      maximumFractionDigits: value < 10 ? 3 : 2,
    }).format(value);
  } catch {
    return `${formatNumber(value, lang, { maximumFractionDigits: 2 })} ${currency ?? 'USD'}`;
  }
}

function formatPercent(value: number | null | undefined, lang: LangCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${numberFormatter(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

function localizeDisplayValue(value: string, lang: LangCode) {
  if (lang !== 'ar') return value;
  return value
    .replace(/\bweeks?\s+(\d+)\s*[-–—]\s*(\d+)\b/i, '$1–$2 أسابيع')
    .replace(/\b(\d+)\s*[-–—]\s*(\d+)\s*weeks?\b/i, '$1–$2 أسابيع')
    .replace(/\b(\d+)\s+to\s+(\d+)\s+weeks?\b/i, '$1–$2 أسابيع');
}

function valueTextDirection(value: string): 'ltr' | 'rtl' | 'auto' {
  return /^[A-Z0-9.^\-/+%$,\s]+$/.test(value.trim()) ? 'ltr' : 'auto';
}

function formatCompact(value: number | null | undefined, lang: LangCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  return numberFormatter(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanDisplayText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 && !/^(undefined|null|nan|n\/?a)$/i.test(text) ? text : null;
}

function formatDateTime(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].unavailable;
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  }).format(date);
}

function formatRelative(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].unavailable;
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_BY_LANG[lang], { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) return rtf.format(diffHours, 'hour');
  return rtf.format(Math.round(diffHours / 24), 'day');
}

function toneForChange(value: number | null | undefined): Tone {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
  if (value > 0.15) return 'positive';
  if (value < -0.15) return 'negative';
  return 'neutral';
}

function sectorLabel(id: SectorId, lang: LangCode) {
  if (id === 'all') return COPY[lang].allSectors;
  return SECTORS[id].labels[lang];
}

function sectorForSymbol(symbol: string): Exclude<SectorId, 'all'> {
  return STOCK_SECTOR[symbol.toUpperCase()] ?? 'digital_platforms';
}

function estimatedValuationRiskLabel(changePercent: number | null, lang: LangCode) {
  if (changePercent === null) return COPY[lang].unknownValuation;
  const absoluteMove = Math.abs(changePercent);
  if (changePercent >= 8) return localized(lang, 'تقديري: مرتفع', 'Estimated: high', 'Estimé : élevé');
  if (absoluteMove >= 4) return localized(lang, 'تقديري: متوسط', 'Estimated: medium', 'Estimé : moyen');
  return localized(lang, 'تقديري: منخفض', 'Estimated: low', 'Estimé : faible');
}

function estimatedGrowthClassification(changePercent: number | null, lang: LangCode) {
  if (changePercent === null) {
    return localized(lang, 'تصنيف سعري مؤقت', 'Price-based provisional class', 'Classe provisoire prix');
  }
  if (changePercent >= 8) {
    return localized(lang, 'نمو بزخم سعري قوي', 'Strong price-momentum growth', 'Croissance à fort momentum');
  }
  if (changePercent >= 2) {
    return localized(lang, 'نمو بزخم إيجابي', 'Positive price-momentum growth', 'Croissance à momentum positif');
  }
  if (changePercent <= -4) {
    return localized(lang, 'نمو تحت ضغط سعري', 'Growth under price pressure', 'Croissance sous pression');
  }
  return localized(lang, 'نمو قيد المراقبة', 'Growth under watch', 'Croissance sous surveillance');
}

function methodologyDescription(row: GrowthStockRow, lang: LangCode) {
  if (row.price !== null && row.changePercent !== null) {
    return localized(
      lang,
      'تصنيف تقديري مبني على السعر الحالي، التغير اليومي والقطاع إلى حين توفر بيانات أساسية كاملة.',
      'Provisional classification based on current price, daily move, and sector until full fundamentals are available.',
      'Classement provisoire fondé sur le prix, la variation quotidienne et le secteur en attendant les fondamentaux complets.',
    );
  }
  return COPY[lang].insufficientMethodology;
}

function cleanTextValue(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text || /^(undefined|null|nan)$/i.test(text)) return '';
  return text;
}

function buildStockRows(items: GrowthTickerItem[], lang: LangCode): GrowthStockRow[] {
  const rows: GrowthStockRow[] = [];
  for (const item of items) {
    const symbol = cleanTextValue(item.symbol).toUpperCase();
    if (!symbol) continue;
    const name = cleanTextValue(item.name) || symbol;
    const currency = cleanTextValue(item.currency) || 'USD';
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null;
    const change = typeof item.change === 'number' && Number.isFinite(item.change) ? item.change : null;
    const changePercent = typeof item.changePercent === 'number' && Number.isFinite(item.changePercent) ? item.changePercent : null;
    const source = cleanTextValue(item.source) || COPY[lang].unavailable;
    const sectorId = sectorForSymbol(symbol);
    const tone = toneForChange(changePercent);
    const momentumLabel = tone === 'positive'
      ? COPY[lang].momentumPositive
      : tone === 'negative'
        ? COPY[lang].momentumNegative
        : COPY[lang].momentumNeutral;
    rows.push({
      ...item,
      symbol,
      name,
      price,
      currency,
      change,
      changePercent,
      source,
      delayed: Boolean(item.delayed),
      available: Boolean(item.available ?? price !== null),
      sectorId,
      sectorLabel: sectorLabel(sectorId, lang),
      momentumLabel,
      momentumTone: tone,
      valuationRiskLabel: estimatedValuationRiskLabel(changePercent, lang),
      qualityLabel: COPY[lang].fundamentalsUnavailable,
      growthClassification: estimatedGrowthClassification(changePercent, lang),
      dataCompleteness: price !== null && changePercent !== null ? 55 : 35,
    });
  }
  return rows;
}

function stockMatchesSearch(row: GrowthStockRow, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return row.symbol.toLowerCase().includes(q)
    || row.name.toLowerCase().includes(q)
    || row.sectorLabel.toLowerCase().includes(q);
}

function newsMatchesSearch(item: GrowthNewsItem, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return [
    item.title,
    item.headline,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    item.source,
    item.companyName,
    item.ticker,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
}

function isWithinTimeFilter(value: string, filter: NewsTimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const ageMs = Date.now() - date.getTime();
  if (filter === 'day') return ageMs <= 24 * 60 * 60 * 1000;
  if (filter === 'week') return ageMs <= 7 * 24 * 60 * 60 * 1000;
  return ageMs <= 30 * 24 * 60 * 60 * 1000;
}

function classifyNewsSector(item: GrowthNewsItem): SectorId {
  const symbol = item.ticker?.toUpperCase();
  if (symbol && STOCK_SECTOR[symbol]) return STOCK_SECTOR[symbol];
  const text = `${item.title} ${item.summary ?? ''} ${item.sector ?? ''} ${(item.sectors ?? []).join(' ')}`.toLowerCase();
  if (/ai|artificial|nvidia|palantir|ذكاء/.test(text)) return 'ai';
  if (/semiconductor|chip|amd|broadcom|رقائق|موصل/.test(text)) return 'semiconductors';
  if (/cloud|software|salesforce|snowflake|datadog|سحابة|برمج/.test(text)) return 'cloud';
  if (/cyber|security|crowdstrike|أمن/.test(text)) return 'cybersecurity';
  if (/commerce|shopify|amazon|mercado|ecommerce|تجارة/.test(text)) return 'ecommerce';
  if (/fintech|coinbase|paypal|block|مدفوعات/.test(text)) return 'fintech';
  if (/tesla|ev|electric|vehicle|طاقة|سيارات/.test(text)) return 'ev';
  if (/health|medical|biotech|صحة/.test(text)) return 'healthcare';
  return 'digital_platforms';
}

function sortStocks(rows: GrowthStockRow[], sort: StockSort) {
  const sorted = rows.slice();
  if (sort === 'momentum') {
    return sorted.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  }
  if (sort === 'leastVolatile') {
    return sorted.sort((a, b) => Math.abs(a.changePercent ?? Infinity) - Math.abs(b.changePercent ?? Infinity));
  }
  if (sort === 'sector') {
    return sorted.sort((a, b) => a.sectorLabel.localeCompare(b.sectorLabel));
  }
  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

function sortNews(items: GrowthNewsItem[], sort: NewsSort) {
  const sorted = items.slice();
  if (sort === 'oldest') {
    return sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  }
  if (sort === 'strongestMove') {
    return sorted.sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));
  }
  return sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function getInitialTab(): GrowthTab {
  if (typeof window === 'undefined') return 'overview';
  const tab = new URLSearchParams(window.location.search).get('tab') as GrowthTab | null;
  return tab && TAB_IDS.includes(tab) ? tab : 'overview';
}

function updateTabParam(tab: GrowthTab) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(null, '', url);
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}

function metricAverage(rows: GrowthStockRow[]) {
  const usable = rows.map(row => row.changePercent).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function buildSectorStats(rows: GrowthStockRow[], lang: LangCode) {
  return Object.entries(SECTORS).map(([id, meta]) => {
    const sectorRows = rows.filter(row => row.sectorId === id);
    const averageChange = metricAverage(sectorRows);
    const top = sectorRows.slice().sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))[0];
    return {
      id: id as Exclude<SectorId, 'all'>,
      label: meta.labels[lang],
      description: meta.description[lang],
      drivers: meta.drivers[lang],
      risks: meta.risks[lang],
      symbols: meta.symbols,
      count: sectorRows.length,
      averageChange,
      top,
      icon: meta.icon,
    };
  });
}

function badgeClass(tone: Tone) {
  return `badge tone-${tone}`;
}

function safeArticleTitle(item: GrowthNewsItem, showOriginal: boolean) {
  if (showOriginal && item.titleOriginal) return item.titleOriginal;
  return item.title || item.headline || item.titleOriginal || '';
}

function safeArticleSummary(item: GrowthNewsItem, showOriginal: boolean) {
  if (showOriginal && item.summaryOriginal) return item.summaryOriginal;
  return item.summary || item.summaryOriginal || '';
}

async function fetchGrowthStockDetail(row: GrowthStockRow): Promise<GrowthStockDetail> {
  const analysisParams = new URLSearchParams({
    symbol: row.symbol,
    displaySymbol: row.symbol,
    assetType: 'stock',
    name: row.name,
  });
  if (row.currency) analysisParams.set('currency', row.currency);

  const profileParams = new URLSearchParams({
    symbol: row.symbol,
    assetType: 'stock',
    name: row.name,
  });

  const [analysisResult, profileResult] = await Promise.allSettled([
    fetch(`/api/market/analyze?${analysisParams.toString()}`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => null) as GrowthAnalysisResponse | null;
        if (!response.ok || !payload?.success) throw new Error(payload?.message || payload?.error || 'analysis_unavailable');
        return payload;
      }),
    fetch(`/api/market/asset-profile?${profileParams.toString()}`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => null) as GrowthAssetProfileResponse | null;
        if (!response.ok || !payload?.success) throw new Error('profile_unavailable');
        return payload;
      }),
  ]);

  const analysis = analysisResult.status === 'fulfilled' ? analysisResult.value : null;
  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const error = analysisResult.status === 'rejected'
    ? analysisResult.reason instanceof Error ? analysisResult.reason.message : 'analysis_unavailable'
    : null;
  return { analysis, profile, error };
}

function profileData(detail: GrowthStockDetail | null | undefined) {
  return detail?.profile?.profile ?? null;
}

function analysisData(detail: GrowthStockDetail | null | undefined) {
  return detail?.analysis?.success ? detail.analysis : null;
}

function fundamentalsData(detail: GrowthStockDetail | null | undefined) {
  const fundamentals = analysisData(detail)?.fundamentals;
  return fundamentals && typeof fundamentals === 'object' ? fundamentals : null;
}

function metricNumber(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function metricText(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = cleanDisplayText(record[key]);
    if (value) return value;
  }
  return null;
}

function getMarketCap(detail: GrowthStockDetail | null | undefined) {
  return finiteNumber(profileData(detail)?.marketCap);
}

function getPeRatio(detail: GrowthStockDetail | null | undefined) {
  return metricNumber(fundamentalsData(detail), ['peRatio', 'pe', 'trailingPE', 'forwardPE']);
}

function getPegRatio(detail: GrowthStockDetail | null | undefined) {
  return metricNumber(fundamentalsData(detail), ['pegRatio', 'peg', 'pegTTM']);
}

function getRevenueGrowth(detail: GrowthStockDetail | null | undefined) {
  return metricNumber(fundamentalsData(detail), ['revenueGrowth', 'revenueGrowthYoY', 'revenueGrowthTTM', 'revenueGrowthQuarterlyYoy']);
}

function getEarningsGrowth(detail: GrowthStockDetail | null | undefined) {
  return metricNumber(fundamentalsData(detail), ['earningsGrowth', 'epsGrowth', 'epsGrowthTTM', 'epsGrowthQuarterlyYoy']);
}

function getAiConfidence(detail: GrowthStockDetail | null | undefined) {
  const analysis = analysisData(detail) as (GrowthAnalysisResponse & Record<string, unknown>) | null;
  return metricNumber(analysis, ['aiScore', 'confidence', 'aiConfidence', 'confidenceScore']);
}

function getRecommendation(detail: GrowthStockDetail | null | undefined) {
  const analysis = analysisData(detail) as (GrowthAnalysisResponse & Record<string, unknown>) | null;
  return metricText(analysis, ['recommendation', 'recommendationStatus', 'rating', 'signal']);
}

function getSource(row: GrowthStockRow, detail: GrowthStockDetail | null | undefined) {
  return cleanDisplayText(detail?.profile?.source) || cleanDisplayText(analysisData(detail)?.source) || cleanDisplayText(row.source);
}

function getLastUpdated(row: GrowthStockRow, detail: GrowthStockDetail | null | undefined) {
  return analysisData(detail)?.lastUpdated || detail?.profile?.lastUpdated || null;
}

function getSector(row: GrowthStockRow, detail: GrowthStockDetail | null | undefined) {
  return cleanDisplayText(profileData(detail)?.sector) || row.sectorLabel;
}

function getIndustry(detail: GrowthStockDetail | null | undefined) {
  return cleanDisplayText(profileData(detail)?.industry);
}

function riskLabel(value: string | null | undefined, text: typeof COPY[LangCode]) {
  if (value === 'low') return text.lowRisk;
  if (value === 'medium') return text.mediumRisk;
  if (value === 'high') return text.highRisk;
  return null;
}

function trendLabel(value: string | null | undefined, text: typeof COPY[LangCode]) {
  if (value === 'bullish') return text.bullish;
  if (value === 'bearish') return text.bearish;
  if (value === 'neutral') return text.neutralTrend;
  return null;
}

function compareAriaLabel(symbol: string, lang: LangCode) {
  return lang === 'ar' ? `مقارنة سهم ${symbol}` : `Compare ${symbol} stock`;
}

function analysisAriaLabel(symbol: string, lang: LangCode) {
  return lang === 'ar' ? `عرض تحليل سهم ${symbol}` : `View ${symbol} stock analysis`;
}

function removeAriaLabel(symbol: string, lang: LangCode) {
  return lang === 'ar' ? `إزالة سهم ${symbol} من المقارنة` : `Remove ${symbol} from comparison`;
}

function compareActionLabel(selected: boolean | undefined, text: typeof COPY[LangCode], lang: LangCode) {
  if (!selected) return text.compare;
  return localized(lang, 'محدد للمقارنة', 'Selected for comparison', 'Sélectionné');
}

export function GrowthStocksNewsPage() {
  const { lang, dir } = useLanguage();
  const activeLang = getLang(lang);
  const text = COPY[activeLang];
  // Initialize to a deterministic value so the server and the first client render
  // agree. Reading the URL (`?tab=`) inside the useState initializer caused a
  // hydration mismatch on refresh: the server always rendered "overview" while the
  // client hydrated whatever tab the URL carried, so React discarded the server HTML
  // and the page appeared to flash then break. The real URL tab is applied in an
  // effect after mount (see below).
  const [tab, setTab] = useState<GrowthTab>('overview');
  const tabSyncedFromUrl = useRef(false);
  const [ticker, setTicker] = useState<GrowthTickerResponse | null>(null);
  const [news, setNews] = useState<GrowthNewsResponse | null>(null);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [stockSector, setStockSector] = useState<SectorId>('all');
  const [stockSort, setStockSort] = useState<StockSort>('momentum');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsSector, setNewsSector] = useState<SectorId>('all');
  const [newsSource, setNewsSource] = useState('all');
  const [newsSymbol, setNewsSymbol] = useState('all');
  const [newsTime, setNewsTime] = useState<NewsTimeFilter>('all');
  const [newsSort, setNewsSort] = useState<NewsSort>('latest');
  const [visibleNewsCount, setVisibleNewsCount] = useState(INITIAL_NEWS_LIMIT);
  const [comparisonSymbols, setComparisonSymbols] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonAutoOpenRequested, setComparisonAutoOpenRequested] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonDetails, setComparisonDetails] = useState<Record<string, GrowthStockDetail>>({});
  const [analysisModal, setAnalysisModal] = useState<AnalysisModalState>({
    open: false,
    row: null,
    status: 'idle',
    detail: null,
    error: null,
  });
  const [openGuide, setOpenGuide] = useState<DisclosureId | null>('what');
  const [originalVisibleIds, setOriginalVisibleIds] = useState<string[]>([]);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
        fetch('/api/growth-stocks/ticker', { cache: 'no-store' }).then(response => response.json() as Promise<GrowthTickerResponse>),
        fetch(`/api/growth-stocks/news?lang=${activeLang}&limit=48`, { cache: 'no-store' }).then(response => response.json() as Promise<GrowthNewsResponse>),
        fetch('/api/growth-stocks/movers?limit=5', { cache: 'no-store' }).then(response => response.json() as Promise<StockCategoryMoversResponse>),
      ]);

      // Preserve previously valid data: only replace state when the new payload is
      // itself usable, or when we have nothing to fall back to. A failed/degraded
      // refresh must not blank out content that is already on screen.
      if (tickerResult.status === 'fulfilled') {
        const value = tickerResult.value;
        setTicker(prev => (value?.ok || !prev ? value : prev));
      }
      if (newsResult.status === 'fulfilled') {
        const value = newsResult.value;
        setNews(prev => (value?.success || !prev ? value : prev));
      }
      if (moversResult.status === 'fulfilled') {
        const value = moversResult.value;
        setMovers(prev => (value?.ok || !prev ? value : prev));
      }

      if (tickerResult.status === 'rejected' && newsResult.status === 'rejected') {
        setError(text.providerError);
      }
    } catch {
      setError(text.providerError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLang, text.providerError]);

  useEffect(() => {
    void loadData('initial');
  }, [loadData]);

  // After mount, adopt the tab from the URL (deep-link support) without causing a
  // hydration mismatch. Runs once.
  useEffect(() => {
    const urlTab = getInitialTab();
    tabSyncedFromUrl.current = true;
    setTab(current => (urlTab !== current ? urlTab : current));
  }, []);

  // Keep the URL in sync with the active tab, but only after we've read the initial
  // value from it, so the first render never rewrites the URL out from under hydration.
  useEffect(() => {
    if (!tabSyncedFromUrl.current) return;
    updateTabParam(tab);
  }, [tab]);

  const stockRows = useMemo(() => buildStockRows(ticker?.ok ? ticker.items : [], activeLang), [activeLang, ticker]);
  const dedupedNews = useMemo(() => news?.success ? dedupeNews(news.items) : [], [news]);
  const sectorStats = useMemo(() => buildSectorStats(stockRows, activeLang), [activeLang, stockRows]);

  const filteredStocks = useMemo(() => {
    const rows = stockRows.filter(row => {
      const sectorMatch = stockSector === 'all' || row.sectorId === stockSector;
      return sectorMatch && stockMatchesSearch(row, stockSearch);
    });
    return sortStocks(rows, stockSort);
  }, [stockRows, stockSearch, stockSector, stockSort]);

  const newsSources = useMemo(() => uniqueOptions(dedupedNews.map(item => item.source)), [dedupedNews]);
  const newsSymbols = useMemo(() => uniqueOptions(dedupedNews.map(item => item.ticker?.toUpperCase())), [dedupedNews]);

  const filteredNews = useMemo(() => {
    const items = dedupedNews.filter(item => {
      const itemSector = classifyNewsSector(item);
      const sectorMatch = newsSector === 'all' || itemSector === newsSector;
      const sourceMatch = newsSource === 'all' || item.source === newsSource;
      const symbolMatch = newsSymbol === 'all' || item.ticker?.toUpperCase() === newsSymbol;
      return sectorMatch
        && sourceMatch
        && symbolMatch
        && isWithinTimeFilter(item.publishedAt, newsTime)
        && newsMatchesSearch(item, newsSearch);
    });
    return sortNews(items, newsSort);
  }, [dedupedNews, newsSearch, newsSector, newsSort, newsSource, newsSymbol, newsTime]);

  const featuredNews = filteredNews.slice(0, 3);
  const regularNews = filteredNews.slice(3, visibleNewsCount);
  const comparisonRows = useMemo(() => comparisonSymbols
    .map(symbol => stockRows.find(row => row.symbol === symbol))
    .filter((row): row is GrowthStockRow => Boolean(row)), [comparisonSymbols, stockRows]);

  const summary = useMemo(() => {
    const rising = stockRows.filter(row => (row.changePercent ?? 0) > 0).length;
    const falling = stockRows.filter(row => (row.changePercent ?? 0) < 0).length;
    const strongest = stockRows.slice().sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))[0] ?? null;
    const calmest = stockRows
      .filter(row => typeof row.changePercent === 'number')
      .sort((a, b) => Math.abs(a.changePercent ?? Infinity) - Math.abs(b.changePercent ?? Infinity))[0] ?? null;
    const bestSector = sectorStats
      .filter(sector => typeof sector.averageChange === 'number')
      .sort((a, b) => (b.averageChange ?? -Infinity) - (a.averageChange ?? -Infinity))[0] ?? null;
    return { rising, falling, strongest, calmest, bestSector };
  }, [sectorStats, stockRows]);

  // Development-only diagnostics for the refresh/hydration data flow. Never logs
  // secrets — only counts and lightweight status flags.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    console.debug('[GrowthStocks] state', {
      tickerItems: ticker?.ok ? ticker.items.length : 0,
      stockRows: stockRows.length,
      filteredStocks: filteredStocks.length,
      newsItems: news?.success ? news.items.length : 0,
      filteredNews: filteredNews.length,
      moversOk: movers?.ok ?? false,
      selectedTab: tab,
      loading,
      hasError: Boolean(error),
    });
  }, [ticker, news, movers, stockRows.length, filteredStocks.length, filteredNews.length, tab, loading, error]);

  const resetStockFilters = () => {
    setStockSearch('');
    setStockSector('all');
    setStockSort('momentum');
  };

  const resetNewsFilters = () => {
    setNewsSearch('');
    setNewsSector('all');
    setNewsSource('all');
    setNewsSymbol('all');
    setNewsTime('all');
    setNewsSort('latest');
    setVisibleNewsCount(INITIAL_NEWS_LIMIT);
  };

  const toggleComparisonSymbol = (symbol: string) => {
    if (!comparisonSymbols.includes(symbol) && comparisonSymbols.length < 5) {
      setComparisonAutoOpenRequested(true);
    }
    setComparisonSymbols(current => {
      if (current.includes(symbol)) return current.filter(item => item !== symbol);
      if (current.length >= 5) return current;
      return [...current, symbol];
    });
  };

  const removeComparisonSymbol = (symbol: string) => {
    setComparisonSymbols(current => current.filter(item => item !== symbol));
  };

  const clearComparison = () => {
    setComparisonSymbols([]);
    setComparisonOpen(false);
  };

  const loadComparisonDetails = useCallback(async (rows: GrowthStockRow[]) => {
    if (rows.length < 2) return;
    setComparisonLoading(true);
    setComparisonError(null);
    try {
      const missingRows = rows.filter(row => !comparisonDetails[row.symbol]);
      if (missingRows.length > 0) {
        const settled = await Promise.allSettled(missingRows.map(row => fetchGrowthStockDetail(row)));
        setComparisonDetails(current => {
          const next = { ...current };
          settled.forEach((result, index) => {
            const row = missingRows[index];
            if (!row) return;
            next[row.symbol] = result.status === 'fulfilled'
              ? result.value
              : { analysis: null, profile: null, error: result.reason instanceof Error ? result.reason.message : 'detail_unavailable' };
          });
          return next;
        });
      }
    } catch {
      setComparisonError(text.providerError);
    } finally {
      setComparisonLoading(false);
    }
  }, [comparisonDetails, text.providerError]);

  const openComparison = () => {
    if (comparisonRows.length < 2) return;
    setComparisonOpen(true);
    void loadComparisonDetails(comparisonRows);
  };

  useEffect(() => {
    if (!comparisonAutoOpenRequested) return;
    if (comparisonRows.length >= 2) {
      setComparisonOpen(true);
      void loadComparisonDetails(comparisonRows);
    }
    setComparisonAutoOpenRequested(false);
  }, [comparisonAutoOpenRequested, comparisonRows, loadComparisonDetails]);

  const openAnalysis = (row: GrowthStockRow) => {
    setAnalysisModal({ open: true, row, status: 'loading', detail: null, error: null });
    void fetchGrowthStockDetail(row)
      .then(detail => {
        setAnalysisModal(current => {
          if (current.row?.symbol !== row.symbol) return current;
          const hasUsableDetail = Boolean(detail.analysis?.success || detail.profile?.success || row.price !== null);
          return {
            open: true,
            row,
            status: hasUsableDetail ? 'ready' : 'error',
            detail,
            error: hasUsableDetail && detail.error ? text.someFieldsUnavailable : hasUsableDetail ? null : text.analysisError,
          };
        });
      })
      .catch(() => {
        setAnalysisModal(current => current.row?.symbol === row.symbol
          ? { open: true, row, status: 'error', detail: null, error: text.analysisError }
          : current);
      });
  };

  const closeAnalysis = () => {
    setAnalysisModal(current => ({ ...current, open: false }));
  };

  const toggleGuide = (id: DisclosureId) => {
    setOpenGuide(current => current === id ? null : id);
  };

  const toggleOriginal = (id: string) => {
    setOriginalVisibleIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const hasActiveStockFilters = stockSearch.trim() || stockSector !== 'all' || stockSort !== 'momentum';
  const hasActiveNewsFilters = newsSearch.trim() || newsSector !== 'all' || newsSource !== 'all' || newsSymbol !== 'all' || newsTime !== 'all' || newsSort !== 'latest';

  return (
    <div className={`page growth-stocks-page ${getNewsPageBackground('growth')}`} dir={dir}>
      <Sidebar />
      <main className="main">
        <div className="container">
          <header className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={16} />{text.badge}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
              <div className="hero-meta" aria-label={text.dataStatusTitle}>
                <span><Clock3 size={15} />{text.lastQuoteUpdate}: {formatDateTime(ticker?.ok ? ticker.updated_at : null, activeLang)}</span>
                <span><Newspaper size={15} />{text.lastNewsUpdate}: {formatDateTime(news?.success ? news.lastUpdated : null, activeLang)}</span>
                <span className={ticker?.ok ? 'status-dot status-ok' : 'status-dot status-warn'}>
                  {ticker?.ok ? text.connected : text.partial}
                </span>
              </div>
            </div>
            <div className="hero-panel">
              <div>
                <span>{text.methodology}</span>
                <strong>{text.notEnoughFundamentals}</strong>
                <p>{text.insufficientMethodology}</p>
              </div>
              <button className="refresh-button" type="button" onClick={() => void loadData('refresh')} disabled={refreshing}>
                <RefreshCcw size={17} className={refreshing ? 'spin' : undefined} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
            </div>
          </header>

          {error ? (
            <StateBox tone="warning" icon={AlertTriangle} title={text.providerError} actionLabel={text.retry} onAction={() => void loadData('refresh')} />
          ) : null}

          <TickerStrip items={stockRows} loading={loading} lang={activeLang} onRetry={() => void loadData('refresh')} />

          <nav className="tabs" role="tablist" aria-label={text.title}>
            {TAB_IDS.map(item => (
              <button
                key={item}
                type="button"
                role="tab"
                className={tab === item ? 'tab active' : 'tab'}
                aria-selected={tab === item}
                onClick={() => setTab(item)}
              >
                {text.tabs[item]}
              </button>
            ))}
          </nav>

          <ComparisonTray
            text={text}
            lang={activeLang}
            selectedRows={comparisonRows}
            selectedCount={comparisonSymbols.length}
            onRemove={removeComparisonSymbol}
            onClear={clearComparison}
            onStart={openComparison}
          />

          {tab === 'overview' ? (
            <OverviewTab
              text={text}
              lang={activeLang}
              loading={loading}
              stockRows={stockRows}
              summary={summary}
              sectorStats={sectorStats}
              lastUpdated={ticker?.ok ? ticker.updated_at : null}
              comparisonRows={comparisonRows}
              comparisonSymbols={comparisonSymbols}
              toggleComparisonSymbol={toggleComparisonSymbol}
              openAnalysis={openAnalysis}
              guideOpen={openGuide}
              toggleGuide={toggleGuide}
              movers={movers}
              onRetry={() => void loadData('refresh')}
            />
          ) : null}

          {tab === 'stocks' ? (
            <StocksTab
              text={text}
              lang={activeLang}
              rows={filteredStocks}
              allRows={stockRows}
              search={stockSearch}
              sector={stockSector}
              sort={stockSort}
              setSearch={setStockSearch}
              setSector={setStockSector}
              setSort={setStockSort}
              reset={resetStockFilters}
              hasActiveFilters={Boolean(hasActiveStockFilters)}
              loading={loading}
              comparisonSymbols={comparisonSymbols}
              toggleComparisonSymbol={toggleComparisonSymbol}
              openAnalysis={openAnalysis}
            />
          ) : null}

          {tab === 'news' ? (
            <NewsTab
              text={text}
              lang={activeLang}
              loading={loading}
              featured={featuredNews}
              regular={regularNews}
              total={filteredNews.length}
              visibleCount={visibleNewsCount}
              setVisibleCount={setVisibleNewsCount}
              search={newsSearch}
              sector={newsSector}
              source={newsSource}
              symbol={newsSymbol}
              time={newsTime}
              sort={newsSort}
              sources={newsSources}
              symbols={newsSymbols}
              setSearch={setNewsSearch}
              setSector={setNewsSector}
              setSource={setNewsSource}
              setSymbol={setNewsSymbol}
              setTime={setNewsTime}
              setSort={setNewsSort}
              reset={resetNewsFilters}
              hasActiveFilters={Boolean(hasActiveNewsFilters)}
              originalVisibleIds={originalVisibleIds}
              toggleOriginal={toggleOriginal}
            />
          ) : null}

          {tab === 'sectors' ? (
            <SectorsTab text={text} lang={activeLang} stats={sectorStats} loading={loading} />
          ) : null}

          <footer className="footer-note">
            <Info size={18} />
            <div>
              <strong>{text.sourceNotice}</strong>
              <p>{text.disclaimer}</p>
              <p>{text.noPortfolioTab}</p>
            </div>
          </footer>
        </div>
      </main>

      <ComparisonModal
        open={comparisonOpen}
        text={text}
        lang={activeLang}
        rows={comparisonRows}
        details={comparisonDetails}
        loading={comparisonLoading}
        error={comparisonError}
        onClose={() => setComparisonOpen(false)}
        onRemove={removeComparisonSymbol}
      />

      <AnalysisDrawer
        state={analysisModal}
        text={text}
        lang={activeLang}
        onClose={closeAnalysis}
      />

      <style jsx global>{`
        .page {
          min-height: 100dvh;
          width: 100%;
          overflow-x: clip;
          background:
            radial-gradient(circle at top left, rgba(30, 184, 214, 0.14), transparent 34rem),
            linear-gradient(180deg, #f5fbff 0%, #eef7ff 46%, #f8fbff 100%);
          color: #0f1f35;
        }
        .main {
          width: 100%;
          max-width: 100vw;
          box-sizing: border-box;
          min-width: 0;
          overflow-x: clip;
          padding: 24px clamp(16px, 2vw, 32px) 56px;
          padding-inline-start: calc(var(--sidebar-w, 230px) + clamp(16px, 2vw, 32px));
        }
        :global([dir="ltr"]) .main {
          padding-inline-start: calc(var(--sidebar-w, 230px) + clamp(16px, 2vw, 32px));
          padding-inline-end: clamp(16px, 2vw, 32px);
        }
        .container {
          width: min(100%, 1500px);
          max-width: 100%;
          min-width: 0;
          margin-inline: auto;
          display: grid;
          gap: 22px;
        }
        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 22px;
          align-items: stretch;
          padding: 26px;
          border: 1px solid rgba(63, 127, 158, 0.22);
          border-radius: 24px;
          background:
            linear-gradient(135deg, rgba(8, 28, 52, 0.98), rgba(9, 78, 101, 0.9)),
            radial-gradient(circle at 12% 20%, rgba(42, 213, 235, 0.32), transparent 22rem);
          color: #f8fdff;
          box-shadow: 0 24px 60px rgba(10, 42, 75, 0.16);
          overflow: hidden;
        }
        .hero-copy {
          display: grid;
          align-content: center;
          gap: 13px;
          min-width: 0;
        }
        .eyebrow,
        .hero-meta,
        .status-dot,
        .mini-meta,
        .article-meta,
        .metric-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .eyebrow {
          width: fit-content;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(35, 211, 231, 0.14);
          border: 1px solid rgba(141, 242, 255, 0.28);
          color: #b8f6ff;
          font-size: 13px;
          font-weight: 800;
        }
        .hero h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 46px);
          line-height: 1.08;
          letter-spacing: 0;
        }
        .hero p {
          margin: 0;
          max-width: 860px;
          color: rgba(239, 251, 255, 0.82);
          font-size: 15px;
          line-height: 1.85;
        }
        .hero-meta {
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 4px;
        }
        .hero-meta span {
          min-height: 34px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          font-weight: 700;
        }
        .status-dot::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .status-ok::before { background: #2dd4bf; }
        .status-warn::before { background: #f59e0b; }
        .hero-panel {
          display: grid;
          gap: 18px;
          align-content: space-between;
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.11);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
        }
        .hero-panel span {
          color: #a8f3ff;
          font-size: 12px;
          font-weight: 900;
        }
        .hero-panel strong {
          display: block;
          margin-top: 7px;
          font-size: 19px;
        }
        .refresh-button,
        .primary-button,
        .ghost-button,
        .chip,
        .tab,
        .filter-select,
        .filter-input,
        .link-button,
        .icon-button,
        .guide-button {
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(53, 116, 146, 0.18);
          font: inherit;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
        }
        .refresh-button,
        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #1f7eea, #18c4d4);
          color: #fff;
          border: 0;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 26px rgba(24, 139, 202, 0.25);
        }
        .refresh-button:hover,
        .primary-button:hover,
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(20, 78, 118, 0.14);
        }
        .refresh-button:disabled {
          cursor: not-allowed;
          opacity: 0.68;
        }
        .primary-button:disabled,
        .ghost-button:disabled,
        .chip:disabled,
        .icon-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
          box-shadow: none;
        }
        .spin {
          animation: spin 850ms linear infinite;
        }
        .tabs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 8px;
          border: 1px solid rgba(69, 132, 159, 0.16);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 14px 36px rgba(15, 61, 92, 0.08);
        }
        .tab {
          flex: 0 0 auto;
          padding: 0 18px;
          background: #fff;
          color: #456176;
          font-weight: 900;
          cursor: pointer;
        }
        .tab.active {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, #1768d4, #19c7d6);
          box-shadow: 0 12px 24px rgba(25, 138, 204, 0.22);
        }
        .comparison-tray {
          position: sticky;
          top: 12px;
          z-index: 8;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border: 1px solid rgba(58, 124, 154, 0.18);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 36px rgba(15, 61, 92, 0.12);
          backdrop-filter: blur(10px);
        }
        .comparison-tray-main {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        .comparison-tray-title,
        .comparison-tray-actions,
        .selected-stock-list,
        .selected-stock-chip,
        .compare-card-head,
        .analysis-identity,
        .loading-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .comparison-tray-title {
          flex-wrap: wrap;
        }
        .comparison-tray-title strong {
          color: #102742;
          font-size: 15px;
          font-weight: 950;
        }
        .selected-stock-list {
          flex-wrap: wrap;
          min-width: 0;
        }
        .selected-stock-chip {
          min-width: 0;
          min-height: 38px;
          padding: 5px 7px;
          border-radius: 999px;
          border: 1px solid rgba(58, 124, 154, 0.16);
          background: #f8fbff;
        }
        .selected-stock-chip .asset-avatar {
          width: 26px;
          height: 26px;
          flex-basis: 26px;
          border-radius: 10px;
        }
        .comparison-tray-actions {
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .tray-note {
          flex: 1 0 100%;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-align: end;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(6, 18, 32, 0.42);
          backdrop-filter: blur(8px);
        }
        .modal-panel {
          width: min(100%, 1180px);
          max-height: min(88dvh, 940px);
          overflow: auto;
          border: 1px solid rgba(58, 124, 154, 0.18);
          border-radius: 22px;
          background: #f8fbff;
          box-shadow: 0 30px 80px rgba(4, 24, 46, 0.26);
          padding: 20px;
        }
        .analysis-drawer {
          width: min(100%, 880px);
          margin-inline-start: auto;
          margin-inline-end: 0;
        }
        :global([dir="rtl"]) .analysis-drawer {
          margin-inline-start: 0;
          margin-inline-end: auto;
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .modal-header h2 {
          margin: 10px 0 6px;
          color: #102742;
          font-size: clamp(22px, 2.6vw, 30px);
          line-height: 1.2;
        }
        .modal-header p {
          margin: 0;
          color: #5f7388;
          line-height: 1.7;
        }
        .modal-eyebrow {
          color: #0f6f94;
          background: rgba(20, 184, 216, 0.12);
          border-color: rgba(20, 184, 216, 0.22);
        }
        .comparison-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 14px;
        }
        .compare-card {
          display: grid;
          gap: 14px;
          min-width: 0;
          padding: 15px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          border-radius: 18px;
          background: #fff;
        }
        .compare-card-head {
          align-items: flex-start;
        }
        .compare-card-head > div {
          min-width: 0;
          flex: 1;
        }
        .compare-card-head strong {
          display: block;
          overflow: hidden;
          color: #102742;
          font-weight: 950;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .detail-list {
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        .detail-list.two-column {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .detail-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
          padding: 10px 0;
          border-bottom: 1px solid rgba(58, 124, 154, 0.1);
        }
        .detail-line:last-child {
          border-bottom: 0;
        }
        .detail-line span {
          min-width: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
        }
        .detail-line strong {
          min-width: 0;
          color: #102742;
          font-size: 13px;
          font-weight: 950;
          text-align: end;
          overflow-wrap: break-word;
          word-break: normal;
        }
        .missing-value {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: fit-content;
          min-height: 26px;
          padding: 4px 8px;
          border-radius: 999px;
          color: #8a5c00;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.24);
          font-size: 12px;
          font-weight: 900;
        }
        .loading-row {
          min-height: 48px;
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          border-radius: 15px;
          background: #fff;
          color: #1768a8;
          font-weight: 900;
        }
        .analysis-identity {
          margin-bottom: 16px;
          padding: 14px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          border-radius: 18px;
          background: #fff;
        }
        .analysis-identity > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .analysis-identity strong {
          color: #102742;
          font-size: 18px;
          font-weight: 950;
        }
        .analysis-content {
          display: grid;
          gap: 16px;
        }
        .analysis-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .analysis-section,
        .insight-box,
        .analysis-disclaimer {
          padding: 14px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          border-radius: 17px;
          background: #fff;
        }
        .analysis-section .section-header {
          margin-bottom: 10px;
        }
        .insight-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .insight-box h3 {
          margin: 0 0 8px;
          color: #102742;
          font-size: 16px;
          font-weight: 950;
        }
        .insight-box ul {
          display: grid;
          gap: 8px;
          margin: 0;
          padding-inline-start: 20px;
          color: #50677c;
          line-height: 1.7;
        }
        .analysis-disclaimer {
          display: flex;
          gap: 10px;
          color: #50677c;
          line-height: 1.8;
        }
        .analysis-disclaimer p {
          margin: 0;
        }
        .mini-icon {
          width: 30px;
          min-width: 30px;
          height: 30px;
          min-height: 30px;
          padding: 0;
          border-radius: 10px;
        }
        .section,
        .panel,
        .card,
        .footer-note,
        .ticker-panel,
        .state-box {
          border: 1px solid rgba(58, 124, 154, 0.16);
          background: rgba(255, 255, 255, 0.88);
          border-radius: 22px;
          box-shadow: 0 16px 40px rgba(24, 62, 92, 0.08);
        }
        .section,
        .panel {
          padding: 22px;
          min-width: 0;
          max-width: 100%;
        }
        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .section-title {
          display: grid;
          gap: 6px;
          min-width: 0;
        }
        .section-title h2,
        .section-title h3 {
          margin: 0;
          color: #102742;
          font-size: clamp(20px, 2.4vw, 26px);
          line-height: 1.25;
        }
        .section-title p {
          margin: 0;
          color: #5f7388;
          font-size: 14px;
          line-height: 1.8;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
          gap: 14px;
        }
        .metric-card {
          display: grid;
          gap: 10px;
          min-width: 0;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          background: linear-gradient(180deg, #ffffff, #f8fcff);
        }
        .metric-icon {
          display: inline-grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: rgba(25, 190, 213, 0.12);
          color: #138da6;
        }
        .metric-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }
        .metric-value {
          color: #0f253f;
          font-size: 24px;
          font-weight: 950;
          line-height: 1.1;
        }
        .metric-help {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }
        .ticker-panel {
          padding: 10px;
          overflow: hidden;
          max-width: 100%;
        }
        .ticker-marquee,
        .ticker-skeleton-track,
        .chip-scroll,
        .symbol-strip {
          display: flex;
          gap: 10px;
          padding-bottom: 2px;
          min-width: 0;
          max-width: 100%;
        }
        .ticker-marquee {
          overflow: hidden;
          mask-image: linear-gradient(90deg, transparent 0, #000 34px, #000 calc(100% - 34px), transparent 100%);
        }
        .ticker-track {
          display: flex;
          width: max-content;
          gap: 10px;
          direction: ltr;
          animation: growth-ticker-marquee 36s linear infinite;
          will-change: transform;
        }
        .ticker-skeleton-track,
        .chip-scroll,
        .symbol-strip {
          overflow-x: auto;
        }
        .ticker-item {
          flex: 0 0 clamp(178px, 17vw, 218px);
          display: grid;
          gap: 6px;
          padding: 11px 12px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(58, 124, 154, 0.13);
          min-width: 0;
        }
        .ticker-top,
        .stock-head,
        .card-actions,
        .row-between,
        .article-actions,
        .filter-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ticker-identity {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .ticker-identity .asset-avatar {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
        }
        .ticker-symbol,
        .symbol {
          direction: ltr;
          unicode-bidi: isolate;
          color: #0f253f;
          font-weight: 950;
          letter-spacing: 0;
          white-space: nowrap;
          word-break: keep-all;
        }
        .ticker-name,
        .muted {
          color: #64748b;
        }
        .ticker-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 850;
        }
        .ticker-item .numeric {
          font-size: 15px;
          font-weight: 950;
        }
        .ticker-item .mini-meta {
          min-width: 0;
          overflow: hidden;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .numeric {
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          word-break: keep-all;
        }
        .tone-positive { color: #047857; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.22); }
        .tone-negative { color: #b42318; background: rgba(239, 68, 68, 0.09); border-color: rgba(239, 68, 68, 0.2); }
        .tone-warning { color: #a16207; background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.24); }
        .tone-neutral { color: #526579; background: rgba(100, 116, 139, 0.1); border-color: rgba(100, 116, 139, 0.18); }
        .tone-info { color: #075985; background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.22); }
        .badge,
        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: fit-content;
          min-height: 28px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(58, 124, 154, 0.16);
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }
        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
          gap: 18px;
          align-items: start;
        }
        .stack {
          display: grid;
          gap: 18px;
        }
        .compare-list,
        .stock-grid,
        .stock-card-list,
        .news-grid,
        .sector-grid,
        .guide-grid {
          display: grid;
          gap: 14px;
          min-width: 0;
        }
        .stock-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
          align-items: stretch;
        }
        .stock-card-list {
          display: none;
        }
        .news-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
        }
        .sector-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        }
        .guide-grid {
          grid-template-columns: 1fr;
        }
        .compare-row {
          display: grid;
          grid-template-columns: minmax(180px, 1.05fr) 112px minmax(0, 1.4fr) 88px;
          gap: 12px;
          align-items: center;
          min-width: 0;
          padding: 10px 0;
          border-bottom: 1px solid rgba(58, 124, 154, 0.1);
        }
        .compare-row:last-of-type {
          border-bottom: 0;
        }
        .compare-asset,
        .table-asset {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .compare-asset > div,
        .table-asset > div {
          min-width: 0;
        }
        .asset-name {
          display: block;
          overflow: hidden;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .asset-avatar {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 12px;
          color: #0e7490;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.17), rgba(37, 99, 235, 0.12));
          border: 1px solid rgba(14, 165, 233, 0.16);
          font-size: 12px;
          font-weight: 950;
        }
        .bar-shell {
          height: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: #e8f2f8;
        }
        .bar-fill {
          height: 100%;
          min-width: 4px;
          border-radius: inherit;
          background: linear-gradient(90deg, #1768d4, #19c7d6);
        }
        .card {
          display: grid;
          gap: 14px;
          min-width: 0;
          max-width: 100%;
          padding: 18px;
          align-content: start;
        }
        .stock-logo {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          border-radius: 17px;
          color: #0e7490;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.17), rgba(37, 99, 235, 0.12));
          border: 1px solid rgba(14, 165, 233, 0.16);
          font-weight: 950;
        }
        .stock-title {
          min-width: 0;
        }
        .stock-head {
          align-items: flex-start;
          justify-content: flex-start;
        }
        .stock-title h3,
        .article-title,
        .sector-title {
          margin: 0;
          color: #102742;
          font-size: 17px;
          line-height: 1.45;
          font-weight: 950;
        }
        .stock-title h3 {
          display: -webkit-box;
          overflow: hidden;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          min-height: calc(1.45em * 2);
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .stock-title p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .mini-metric {
          min-width: 0;
          padding: 12px;
          border-radius: 14px;
          background: #f7fbff;
          border: 1px solid rgba(58, 124, 154, 0.12);
        }
        .mini-metric span {
          display: block;
          color: #697b8d;
          font-size: 11px;
          font-weight: 850;
        }
        .mini-metric strong {
          display: block;
          margin-top: 5px;
          color: #102742;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.45;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .stock-table-card {
          margin-top: 16px;
          overflow: hidden;
          border: 1px solid rgba(58, 124, 154, 0.14);
          border-radius: 18px;
          background: #fff;
        }
        .stock-table-scroll {
          max-width: 100%;
          overflow-x: auto;
        }
        .stock-table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .stock-table th,
        .stock-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(58, 124, 154, 0.1);
          text-align: start;
          vertical-align: middle;
          color: #102742;
          font-size: 13px;
        }
        .stock-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #f2f8fc;
          color: #50677c;
          font-size: 12px;
          font-weight: 950;
        }
        .stock-table tbody tr:hover {
          background: #f8fbff;
        }
        .stock-table td {
          font-weight: 850;
        }
        .stock-table .table-muted {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .table-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .table-actions .ghost-button,
        .table-actions .primary-button {
          min-height: 36px;
          border-radius: 11px;
          padding: 0 10px;
          font-size: 12px;
          box-shadow: none;
        }
        .filter-panel {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, 220px)) auto;
          gap: 10px;
          align-items: end;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          background: #fff;
        }
        .field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }
        .field label {
          color: #50677c;
          font-size: 12px;
          font-weight: 900;
        }
        .input-wrap {
          position: relative;
          min-width: 0;
        }
        .input-wrap svg {
          position: absolute;
          inset-inline-start: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #7b90a4;
          pointer-events: none;
        }
        .filter-input,
        .filter-select {
          width: 100%;
          background: #f8fbff;
          color: #102742;
          padding: 0 13px;
          outline: none;
        }
        .filter-input {
          padding-inline-start: 40px;
        }
        .filter-input:focus,
        .filter-select:focus,
        .tab:focus-visible,
        .refresh-button:focus-visible,
        .primary-button:focus-visible,
        .ghost-button:focus-visible,
        .guide-button:focus-visible,
        .link-button:focus-visible,
        .icon-button:focus-visible,
        .chip:focus-visible {
          outline: 3px solid rgba(20, 184, 216, 0.24);
          outline-offset: 2px;
          border-color: rgba(20, 184, 216, 0.55);
        }
        .ghost-button,
        .chip,
        .link-button,
        .icon-button,
        .guide-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: #fff;
          color: #1768a8;
          font-weight: 900;
          cursor: pointer;
        }
        .chip {
          min-height: 38px;
          padding: 0 13px;
        }
        .chip.active {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, #1768d4, #19c7d6);
        }
        .article-card {
          min-height: 100%;
          align-content: start;
        }
        .article-title {
          display: -webkit-box;
          overflow: hidden;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .article-summary {
          display: -webkit-box;
          overflow: hidden;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          margin: 0;
          color: #5b7085;
          font-size: 13px;
          line-height: 1.65;
        }
        .article-meta {
          flex-wrap: wrap;
          color: #60758a;
          font-size: 12px;
          font-weight: 750;
        }
        .article-actions {
          margin-top: auto;
          flex-wrap: wrap;
        }
        .featured-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
          gap: 14px;
        }
        .lead-card {
          padding: 18px;
          background:
            linear-gradient(135deg, rgba(15, 42, 73, 0.97), rgba(16, 112, 135, 0.88)),
            radial-gradient(circle at 20% 10%, rgba(34, 211, 238, 0.2), transparent 20rem);
          color: #fff;
        }
        .lead-card .article-title {
          color: #fff;
          font-size: clamp(19px, 1.9vw, 24px);
        }
        .lead-card .article-summary,
        .lead-card .article-meta {
          color: rgba(239, 251, 255, 0.82);
        }
        .side-news {
          display: grid;
          gap: 12px;
        }
        .compact-row {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(58, 124, 154, 0.14);
          background: #fff;
          min-width: 0;
        }
        .movers-section {
          overflow: hidden;
        }
        .movers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 14px;
          align-items: start;
        }
        .mover-list {
          display: grid;
          gap: 9px;
          min-width: 0;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid rgba(58, 124, 154, 0.12);
          background: linear-gradient(180deg, #ffffff, #f8fcff);
        }
        .mover-list-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #102742;
          font-weight: 950;
        }
        .mover-row {
          display: grid;
          grid-template-columns: 30px 38px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 10px;
          border-radius: 14px;
          background: #f8fbff;
          border: 1px solid rgba(58, 124, 154, 0.1);
        }
        .mover-logo {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 13px;
          color: #0e7490;
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(37, 99, 235, 0.11));
          border: 1px solid rgba(14, 165, 233, 0.14);
          font-size: 12px;
          font-weight: 950;
        }
        .mover-info {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .mover-name {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .mover-empty {
          min-height: 56px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px dashed rgba(58, 124, 154, 0.18);
          background: #f8fbff;
          color: #64748b;
          font-size: 13px;
          font-weight: 900;
        }
        .mover-more {
          justify-self: start;
          min-height: 34px;
          padding: 0 10px;
          border-radius: 11px;
        }
        .rank {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: rgba(24, 196, 212, 0.11);
          color: #0e7490;
          font-weight: 950;
          font-size: 12px;
        }
        .guide-section {
          overflow: hidden;
        }
        .guide-item {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(58, 124, 154, 0.12);
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff, #f9fcff);
        }
        .guide-button {
          width: 100%;
          min-height: 52px;
          justify-content: space-between;
          padding: 0 16px;
          border: 0;
          border-radius: 0;
          text-align: start;
          color: #0f3f66;
          background: transparent;
        }
        .guide-button span {
          min-width: 0;
          white-space: normal;
          line-height: 1.45;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .guide-content {
          margin: 0;
          padding: 0 16px 16px;
          color: #5b7085;
          font-size: 14px;
          line-height: 1.8;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .sector-card {
          align-content: start;
        }
        .sector-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: rgba(20, 184, 216, 0.12);
          color: #0e7490;
        }
        .footer-note {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px;
          color: #50677c;
          line-height: 1.8;
        }
        .footer-note strong {
          display: block;
          color: #102742;
          margin-bottom: 2px;
        }
        .footer-note p {
          margin: 0;
        }
        .state-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px;
          min-height: 0;
          border-style: dashed;
        }
        .state-copy {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }
        .state-copy svg {
          flex: 0 0 auto;
          margin-top: 2px;
        }
        .state-copy strong {
          display: block;
          color: #102742;
          line-height: 1.5;
        }
        .state-copy p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }
        .skeleton {
          position: relative;
          overflow: hidden;
          min-height: 120px;
          border-radius: 18px;
          background: #eaf4fb;
        }
        .skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes growth-ticker-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (hover: hover) and (pointer: fine) {
          .ticker-panel:hover .ticker-track {
            animation-play-state: paused;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
          .ticker-track {
            transform: none !important;
          }
        }
        @media (max-width: 1280px) {
          .hero,
          .workspace-grid,
          .featured-layout {
            grid-template-columns: 1fr;
          }
          .filter-panel {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 900px) {
          .main {
            padding-inline: 16px;
            padding-top: 18px;
          }
          :global([dir="ltr"]) .main {
            padding-inline: 16px;
          }
          .hero {
            padding: 20px;
            border-radius: 20px;
          }
          .section,
          .panel {
            padding: 16px;
          }
          .comparison-tray,
          .analysis-summary-grid,
          .detail-list.two-column,
          .insight-grid {
            grid-template-columns: 1fr;
          }
          .comparison-tray {
            bottom: 12px;
            top: auto;
          }
          .comparison-tray-actions {
            justify-content: stretch;
          }
          .tray-note {
            text-align: start;
          }
          .modal-backdrop {
            align-items: end;
            padding: 10px;
          }
          .modal-panel {
            max-height: 92dvh;
            padding: 16px;
            border-radius: 20px;
          }
          .modal-header {
            gap: 10px;
          }
          .comparison-card-grid {
            grid-template-columns: 1fr;
          }
          .filter-panel {
            grid-template-columns: 1fr;
          }
          .section-header,
          .card-actions,
          .row-between,
          .filter-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .primary-button,
          .ghost-button,
          .refresh-button {
            width: 100%;
          }
          .ticker-item {
            flex-basis: 172px;
          }
          .stock-table-card {
            display: none;
          }
          .stock-card-list {
            display: grid;
            margin-top: 16px;
          }
          .compare-row {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .compare-row .bar-shell,
          .compare-row > .numeric:last-child {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 640px) {
          .summary-grid,
          .stock-grid,
          .stock-card-list,
          .news-grid,
          .sector-grid,
          .movers-grid,
          .analysis-summary-grid,
          .comparison-card-grid {
            grid-template-columns: 1fr;
          }
          .state-box {
            align-items: stretch;
            flex-direction: column;
          }
          .mover-list {
            padding: 10px;
          }
          .mover-row {
            grid-template-columns: 28px 36px minmax(0, 1fr);
          }
          .mover-row .badge {
            grid-column: 3;
            justify-self: start;
          }
        }
      `}</style>
    </div>
  );
}

function TickerStrip({ items, loading, lang, onRetry }: { items: GrowthStockRow[]; loading: boolean; lang: LangCode; onRetry: () => void }) {
  if (loading) {
    return (
      <section className="ticker-panel" aria-label={COPY[lang].trackedStocks}>
        <div className="ticker-skeleton-track">
          {Array.from({ length: 6 }).map((_, index) => <div className="ticker-item skeleton" key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <StockTickerStrip
      ariaLabel={COPY[lang].trackedStocks}
      items={items.map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        currency: item.currency,
        changePercent: item.changePercent,
        source: item.source,
        available: item.available,
        meta: item.sectorLabel,
      }))}
      locale={LOCALE_BY_LANG[lang]}
      unavailableLabel={COPY[lang].unavailable}
      sourceLabel={COPY[lang].source}
      className="ticker-panel"
      viewportClassName="ticker-marquee"
      trackClassName="ticker-track"
      direction="ltr"
      durationSeconds={36}
      emptyState={(
        <StateBox
          tone="info"
          icon={Info}
          title={COPY[lang].priceUnavailable}
          description={COPY[lang].providerError}
          actionLabel={COPY[lang].retry}
          onAction={onRetry}
        />
      )}
    />
  );
}

function UnavailableValue({ text }: { text: typeof COPY[LangCode] }) {
  return (
    <span className="missing-value" title={text.missingDataHint}>
      <Info size={12} />{text.unavailable}
    </span>
  );
}

function DataValue({ value, text, numeric }: { value: ReactNode | null | undefined; text: typeof COPY[LangCode]; numeric?: boolean }) {
  if (value === null || value === undefined || value === '') return <UnavailableValue text={text} />;
  return <span className={numeric ? 'numeric' : undefined}>{value}</span>;
}

function MetricLine({ label, value, text, numeric }: { label: string; value: ReactNode | null | undefined; text: typeof COPY[LangCode]; numeric?: boolean }) {
  return (
    <div className="detail-line">
      <span>{label}</span>
      <strong><DataValue value={value} text={text} numeric={numeric} /></strong>
    </div>
  );
}

function ComparisonTray({
  text,
  lang,
  selectedRows,
  selectedCount,
  onRemove,
  onClear,
  onStart,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  selectedRows: GrowthStockRow[];
  selectedCount: number;
  onRemove: (symbol: string) => void;
  onClear: () => void;
  onStart: () => void;
}) {
  const canStart = selectedRows.length >= 2;
  return (
    <section className="comparison-tray" aria-label={text.comparisonTitle}>
      <div className="comparison-tray-main">
        <div className="comparison-tray-title">
          <strong>{text.comparisonTitle}</strong>
          <span className="pill">{text.selectedCount}: <span className="numeric">{selectedCount}/5</span></span>
        </div>
        <div className="selected-stock-list">
          {selectedRows.length > 0 ? selectedRows.map(row => (
            <span className="selected-stock-chip" key={row.symbol}>
              <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="sm" className="asset-avatar" />
              <span className="symbol" dir="ltr">{row.symbol}</span>
              <button type="button" className="icon-button mini-icon" onClick={() => onRemove(row.symbol)} aria-label={removeAriaLabel(row.symbol, lang)}>
                <X size={14} />
              </button>
            </span>
          )) : (
            <span className="muted">{text.comparisonNeedsTwo}</span>
          )}
        </div>
      </div>
      <div className="comparison-tray-actions">
        <button className="ghost-button" type="button" onClick={onClear} disabled={selectedRows.length === 0}>
          <X size={16} />{text.clearSelection}
        </button>
        <button className="primary-button" type="button" onClick={onStart} disabled={!canStart} aria-disabled={!canStart}>
          <BarChart3 size={16} />{text.startComparison}
        </button>
        <span className="tray-note">{canStart ? text.comparisonLimit : text.comparisonNeedsTwo}</span>
      </div>
    </section>
  );
}

function ComparisonModal({
  open,
  text,
  lang,
  rows,
  details,
  loading,
  error,
  onClose,
  onRemove,
}: {
  open: boolean;
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: GrowthStockRow[];
  details: Record<string, GrowthStockDetail>;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRemove: (symbol: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel comparison-modal" role="dialog" aria-modal="true" aria-labelledby="growth-comparison-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow modal-eyebrow"><BarChart3 size={15} />{text.startComparison}</span>
            <h2 id="growth-comparison-title">{text.comparisonDetailsTitle}</h2>
            <p>{text.comparisonDescription}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={text.close}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="loading-row" role="status">
            <Loader2 size={18} className="spin" />{text.analysisLoading}
          </div>
        ) : null}
        {error ? <StateBox tone="warning" icon={AlertTriangle} title={error} /> : null}

        <div className="comparison-card-grid">
          {rows.map(row => (
            <ComparisonStockCard
              key={row.symbol}
              row={row}
              detail={details[row.symbol]}
              text={text}
              lang={lang}
              onRemove={() => onRemove(row.symbol)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ComparisonStockCard({
  row,
  detail,
  text,
  lang,
  onRemove,
}: {
  row: GrowthStockRow;
  detail: GrowthStockDetail | undefined;
  text: typeof COPY[LangCode];
  lang: LangCode;
  onRemove: () => void;
}) {
  const analysis = analysisData(detail);
  const marketCap = getMarketCap(detail);
  const pe = getPeRatio(detail);
  const peg = getPegRatio(detail);
  const revenueGrowth = getRevenueGrowth(detail);
  const earningsGrowth = getEarningsGrowth(detail);
  const aiConfidence = getAiConfidence(detail);
  const lastUpdated = getLastUpdated(row, detail);
  return (
    <article className="compare-card">
      <div className="compare-card-head">
        <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="lg" className="stock-logo" />
        <div>
          <strong>{row.name}</strong>
          <span className="symbol" dir="ltr">{row.symbol}</span>
        </div>
        <button className="icon-button mini-icon" type="button" onClick={onRemove} aria-label={removeAriaLabel(row.symbol, lang)}>
          <X size={14} />
        </button>
      </div>
      <div className="detail-list">
        <MetricLine label={text.companyName} value={row.name} text={text} />
        <MetricLine label={text.symbolFilter} value={<span className="symbol" dir="ltr">{row.symbol}</span>} text={text} />
        <MetricLine label={text.currentPrice} value={row.price === null ? null : formatCurrency(row.price, row.currency, lang)} text={text} numeric />
        <MetricLine label={text.currency} value={row.currency} text={text} />
        <MetricLine label={text.dailyChange} value={row.changePercent === null ? null : formatPercent(row.changePercent, lang)} text={text} numeric />
        <MetricLine label={text.sector} value={getSector(row, detail)} text={text} />
        <MetricLine label={text.industry} value={getIndustry(detail)} text={text} />
        <MetricLine label={text.marketCap} value={marketCap === null ? null : formatCompact(marketCap, lang)} text={text} numeric />
        <MetricLine label={text.revenueGrowth} value={revenueGrowth === null ? null : formatPercent(revenueGrowth, lang)} text={text} numeric />
        <MetricLine label={text.earningsGrowth} value={earningsGrowth === null ? null : formatPercent(earningsGrowth, lang)} text={text} numeric />
        <MetricLine label={text.pe} value={pe === null ? null : formatNumber(pe, lang, { maximumFractionDigits: 2 })} text={text} numeric />
        <MetricLine label={text.peg} value={peg === null ? null : formatNumber(peg, lang, { maximumFractionDigits: 2 })} text={text} numeric />
        <MetricLine label={text.riskLevel} value={riskLabel(analysis?.riskLevel, text)} text={text} />
        <MetricLine label={text.aiConfidence} value={aiConfidence === null ? null : formatNumber(aiConfidence, lang, { maximumFractionDigits: 1 })} text={text} numeric />
        <MetricLine label={text.recommendationStatus} value={getRecommendation(detail)} text={text} />
        <MetricLine label={text.providerSource} value={getSource(row, detail)} text={text} />
        <MetricLine label={text.lastQuoteUpdate} value={lastUpdated ? formatDateTime(lastUpdated, lang) : null} text={text} />
      </div>
    </article>
  );
}

function localized(lang: LangCode, ar: string, en: string, fr: string) {
  if (lang === 'ar') return ar;
  if (lang === 'fr') return fr;
  return en;
}

function buildStrengthItems(row: GrowthStockRow, detail: GrowthStockDetail | null, lang: LangCode) {
  const analysis = analysisData(detail);
  const items: string[] = [];
  if (typeof row.changePercent === 'number' && row.changePercent > 0) {
    items.push(localized(lang, 'زخم سعري إيجابي في آخر قراءة متاحة.', 'Positive momentum in the latest available quote.', 'Momentum positif dans le dernier cours disponible.'));
  }
  if (analysis?.trend === 'bullish') {
    items.push(localized(lang, 'الاتجاه الفني الحالي إيجابي حسب البيانات المتاحة.', 'Current technical trend is bullish from available data.', 'La tendance technique disponible est haussière.'));
  }
  if (analysis?.fundamentalsAvailable) {
    items.push(localized(lang, 'تتوفر بعض البيانات الأساسية من المزود.', 'Some fundamentals are available from the provider.', 'Certaines données fondamentales sont disponibles.'));
  }
  if (getSector(row, detail)) {
    items.push(localized(lang, `انكشاف واضح على ${getSector(row, detail)}.`, `Clear exposure to ${getSector(row, detail)}.`, `Exposition claire à ${getSector(row, detail)}.`));
  }
  return items;
}

function buildRiskItems(row: GrowthStockRow, detail: GrowthStockDetail | null, lang: LangCode) {
  const analysis = analysisData(detail);
  const items: string[] = [];
  if (typeof row.changePercent === 'number' && row.changePercent < 0) {
    items.push(localized(lang, 'القراءة اليومية الأخيرة سالبة.', 'Latest daily quote is negative.', 'La dernière variation quotidienne est négative.'));
  }
  if (analysis?.riskLevel === 'high') {
    items.push(localized(lang, 'مستوى المخاطر الفني مرتفع حسب التذبذب المتاح.', 'Technical risk is high based on available volatility.', 'Le risque technique est élevé selon la volatilité disponible.'));
  }
  if (!analysis?.fundamentalsAvailable) {
    items.push(localized(lang, 'البيانات الأساسية غير مكتملة، لذلك لا تظهر نسب النمو أو التقييم كاملة.', 'Fundamentals are incomplete, so growth and valuation metrics are limited.', 'Les fondamentaux sont incomplets, donc les métriques de croissance et de valorisation sont limitées.'));
  }
  if (row.delayed || analysis?.dataStatus === 'delayed') {
    items.push(localized(lang, 'الأسعار قد تكون متأخرة حسب مزود البيانات.', 'Quotes may be delayed by the data provider.', 'Les cours peuvent être retardés par le fournisseur.'));
  }
  return items;
}

function InsightList({ title, items, text }: { title: string; items: string[]; text: typeof COPY[LangCode] }) {
  return (
    <div className="insight-box">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map(item => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <UnavailableValue text={text} />
      )}
    </div>
  );
}

function AnalysisDrawer({
  state,
  text,
  lang,
  onClose,
}: {
  state: AnalysisModalState;
  text: typeof COPY[LangCode];
  lang: LangCode;
  onClose: () => void;
}) {
  const row = state.row;
  if (!state.open || !row) return null;
  const detail = state.detail;
  const analysis = analysisData(detail);
  const profile = profileData(detail);
  const marketCap = getMarketCap(detail);
  const pe = getPeRatio(detail);
  const peg = getPegRatio(detail);
  const revenueGrowth = getRevenueGrowth(detail);
  const earningsGrowth = getEarningsGrowth(detail);
  const latestPrice = finiteNumber(analysis?.latestPrice) ?? row.price;
  const changePercent = finiteNumber(analysis?.changePercent) ?? row.changePercent;
  const lastUpdated = getLastUpdated(row, detail);
  const thesis = cleanDisplayText(analysis?.aiInsight?.summary) || cleanDisplayText(analysis?.summary);
  const technicalSummary = analysis
    ? `${text.technicalSummary}: ${trendLabel(analysis.trend, text) ?? text.unavailable} · RSI ${formatNumber(analysis.indicators?.rsi, lang, { maximumFractionDigits: 1 })} · ${text.volatility} ${formatPercent(analysis.indicators?.volatility, lang)}`
    : null;

  return (
    <div className="modal-backdrop" role="presentation">
      <aside className="modal-panel analysis-drawer" role="dialog" aria-modal="true" aria-labelledby="growth-analysis-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow modal-eyebrow"><BookOpen size={15} />{text.viewAnalysis}</span>
            <h2 id="growth-analysis-title">{text.analysisTitle}</h2>
            <p><span className="symbol" dir="ltr">{row.symbol}</span> · {row.name}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={text.close}>
            <X size={20} />
          </button>
        </div>

        <div className="analysis-identity">
          <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="lg" className="stock-logo" />
          <div>
            <strong>{profile?.name ?? row.name}</strong>
            <span className="symbol" dir="ltr">{row.symbol}</span>
          </div>
        </div>

        {state.status === 'loading' ? (
          <div className="loading-row" role="status">
            <Loader2 size={18} className="spin" />{text.analysisLoading}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <StateBox tone="warning" icon={AlertTriangle} title={state.error || text.analysisError} />
        ) : null}

        {state.status === 'ready' && detail ? (
          <div className="analysis-content">
            {state.error ? (
              <StateBox tone="warning" icon={AlertTriangle} title={state.error} description={text.marketClosedNote} />
            ) : null}

            <div className="analysis-summary-grid">
              <MiniMetric label={text.currentPrice} value={latestPrice === null ? <UnavailableValue text={text} /> : formatCurrency(latestPrice, analysis?.currency ?? row.currency, lang)} />
              <MiniMetric label={text.currency} value={analysis?.currency ?? row.currency ?? <UnavailableValue text={text} />} />
              <MiniMetric label={text.sector} value={getSector(row, detail)} />
              <MiniMetric label={text.industry} value={getIndustry(detail) ?? <UnavailableValue text={text} />} />
              <MiniMetric label={text.growthCategory} value={row.growthClassification} />
              <MiniMetric label={text.riskLevel} value={riskLabel(analysis?.riskLevel, text) ?? <UnavailableValue text={text} />} />
              <MiniMetric label={text.priceChange} value={changePercent === null ? <UnavailableValue text={text} /> : formatPercent(changePercent, lang)} />
              <MiniMetric label={text.dataQuality} value={analysis?.fundamentalsAvailable ? text.connected : text.someFieldsUnavailable} />
            </div>

            <section className="analysis-section">
              <SectionHeader title={text.keyMetrics} />
              <div className="detail-list two-column">
                <MetricLine label={text.marketCap} value={marketCap === null ? null : formatCompact(marketCap, lang)} text={text} numeric />
                <MetricLine label={text.revenueGrowth} value={revenueGrowth === null ? null : formatPercent(revenueGrowth, lang)} text={text} numeric />
                <MetricLine label={text.earningsGrowth} value={earningsGrowth === null ? null : formatPercent(earningsGrowth, lang)} text={text} numeric />
                <MetricLine label={text.pe} value={pe === null ? null : formatNumber(pe, lang, { maximumFractionDigits: 2 })} text={text} numeric />
                <MetricLine label={text.peg} value={peg === null ? null : formatNumber(peg, lang, { maximumFractionDigits: 2 })} text={text} numeric />
                <MetricLine label={text.aiConfidence} value={getAiConfidence(detail) === null ? null : formatNumber(getAiConfidence(detail), lang, { maximumFractionDigits: 1 })} text={text} numeric />
              </div>
            </section>

            <section className="analysis-section">
              <SectionHeader title={text.technicalSummary} />
              <p className="muted">{technicalSummary ?? <UnavailableValue text={text} />}</p>
            </section>

            <section className="analysis-section">
              <SectionHeader title={text.aiGrowthThesis} />
              <p className="muted">{thesis ?? <UnavailableValue text={text} />}</p>
            </section>

            <div className="insight-grid">
              <InsightList title={text.strengths} items={buildStrengthItems(row, detail, lang)} text={text} />
              <InsightList title={text.risks} items={buildRiskItems(row, detail, lang)} text={text} />
            </div>

            <section className="analysis-section">
              <SectionHeader title={text.dataQuality} />
              <div className="detail-list two-column">
                <MetricLine label={text.providerSource} value={getSource(row, detail)} text={text} />
                <MetricLine label={text.lastQuoteUpdate} value={lastUpdated ? formatDateTime(lastUpdated, lang) : null} text={text} />
                <MetricLine label={text.dataCondition} value={analysis?.dataStatus === 'delayed' ? text.delayedData : analysis?.dataStatus ?? text.someFieldsUnavailable} text={text} />
                <MetricLine label={text.fundamentalsUnavailable} value={analysis?.fundamentalsAvailable ? text.connected : text.someFieldsUnavailable} text={text} />
              </div>
            </section>

            <footer className="analysis-disclaimer">
              <Info size={16} />
              <p>{text.disclaimer}</p>
            </footer>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function OverviewTab({
  text,
  lang,
  loading,
  stockRows,
  summary,
  sectorStats,
  lastUpdated,
  comparisonRows,
  comparisonSymbols,
  toggleComparisonSymbol,
  openAnalysis,
  guideOpen,
  toggleGuide,
  movers,
  onRetry,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  stockRows: GrowthStockRow[];
  summary: {
    rising: number;
    falling: number;
    strongest: GrowthStockRow | null;
    calmest: GrowthStockRow | null;
    bestSector: ReturnType<typeof buildSectorStats>[number] | null;
  };
  sectorStats: ReturnType<typeof buildSectorStats>;
  lastUpdated: string | null;
  comparisonRows: GrowthStockRow[];
  comparisonSymbols: string[];
  toggleComparisonSymbol: (symbol: string) => void;
  openAnalysis: (row: GrowthStockRow) => void;
  guideOpen: DisclosureId | null;
  toggleGuide: (id: DisclosureId) => void;
  movers: StockCategoryMoversResponse | null;
  onRetry: () => void;
}) {
  return (
    <div className="stack">
      <section className="section">
        <SectionHeader title={text.summaryTitle} description={text.marketClosedNote} />
        <div className="summary-grid">
          <MetricCard icon={TrendingUp} label={text.risingStocks} value={String(summary.rising)} help={`${text.trackedStocks}: ${stockRows.length}`} loading={loading} tone="positive" />
          <MetricCard icon={TrendingDown} label={text.fallingStocks} value={String(summary.falling)} help={`${text.trackedStocks}: ${stockRows.length}`} loading={loading} tone="negative" />
          <MetricCard icon={BarChart3} label={text.bestSector} value={summary.bestSector?.label ?? text.unavailable} help={summary.bestSector ? formatPercent(summary.bestSector.averageChange, lang) : text.unavailable} loading={loading} tone="info" />
          <MetricCard icon={Zap} label={text.strongestStock} value={summary.strongest?.symbol ?? text.unavailable} help={summary.strongest ? formatPercent(summary.strongest.changePercent, lang) : text.unavailable} loading={loading} tone="warning" />
        </div>
      </section>

      <MoversPanel text={text} lang={lang} movers={movers} onRetry={onRetry} />

      <div className="workspace-grid">
        <section className="section">
          <SectionHeader title={text.comparisonTitle} description={text.comparisonDescription} />
          <div className="filter-actions" style={{ marginBottom: 14 }}>
            <div className="chip-scroll" aria-label={text.selectForCompare}>
              {stockRows.slice(0, 14).map(row => (
                <button
                  key={row.symbol}
                  type="button"
                  className={comparisonSymbols.includes(row.symbol) ? 'chip active' : 'chip'}
                  onClick={() => toggleComparisonSymbol(row.symbol)}
                  disabled={!comparisonSymbols.includes(row.symbol) && comparisonSymbols.length >= 5}
                  aria-label={compareAriaLabel(row.symbol, lang)}
                  aria-pressed={comparisonSymbols.includes(row.symbol)}
                >
                  <span className="symbol" dir="ltr">{row.symbol}</span>
                </button>
              ))}
            </div>
          </div>
          <ComparisonChart rows={comparisonRows} lang={lang} text={text} />
        </section>

        <DataStatusPanel text={text} lang={lang} rows={stockRows} lastUpdated={lastUpdated} />
      </div>

      <section className="section">
        <SectionHeader title={text.highlightedTitle} description={text.highlightedDescription} />
        {loading ? (
          <SkeletonGrid count={6} />
        ) : stockRows.length === 0 ? (
          <StateBox tone="info" icon={LineChart} title={text.priceUnavailable} description={text.providerError} actionLabel={text.retry} onAction={onRetry} />
        ) : (
          <div className="stock-grid">
            {stockRows.slice(0, 6).map(row => (
              <GrowthStockCard key={row.symbol} row={row} text={text} lang={lang} compact onAnalysis={() => openAnalysis(row)} />
            ))}
          </div>
        )}
      </section>

      <EducationGuide text={text} lang={lang} open={guideOpen} toggle={toggleGuide} />

      <section className="section">
        <SectionHeader title={text.sectorsTitle} description={text.sectorsDescription} />
        <div className="sector-grid">
          {sectorStats.slice(0, 4).map(sector => <SectorCard key={sector.id} sector={sector} lang={lang} />)}
        </div>
      </section>
    </div>
  );
}

function StocksTab({
  text,
  lang,
  rows,
  allRows,
  search,
  sector,
  sort,
  setSearch,
  setSector,
  setSort,
  reset,
  hasActiveFilters,
  loading,
  comparisonSymbols,
  toggleComparisonSymbol,
  openAnalysis,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: GrowthStockRow[];
  allRows: GrowthStockRow[];
  search: string;
  sector: SectorId;
  sort: StockSort;
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSort: (value: StockSort) => void;
  reset: () => void;
  hasActiveFilters: boolean;
  loading: boolean;
  comparisonSymbols: string[];
  toggleComparisonSymbol: (symbol: string) => void;
  openAnalysis: (row: GrowthStockRow) => void;
}) {
  return (
    <section className="section">
      <SectionHeader title={text.stocksTitle} description={text.stocksDescription} action={<span className="pill">{text.resultCount}: {rows.length}</span>} />
      <div className="filter-panel">
        <div className="field">
          <label htmlFor="growth-stock-search">{text.filter}</label>
          <div className="input-wrap">
            <Search size={17} />
            <input id="growth-stock-search" className="filter-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={text.searchStocks} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="growth-stock-sector">{text.sector}</label>
          <select id="growth-stock-sector" className="filter-select" value={sector} onChange={event => setSector(event.target.value as SectorId)}>
            <option value="all">{text.allSectors}</option>
            {Object.keys(SECTORS).map(id => <option key={id} value={id}>{sectorLabel(id as SectorId, lang)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="growth-stock-sort">{text.sort}</label>
          <select id="growth-stock-sort" className="filter-select" value={sort} onChange={event => setSort(event.target.value as StockSort)}>
            <option value="momentum">{text.momentumSort}</option>
            <option value="leastVolatile">{text.leastVolatile}</option>
            <option value="name">{text.nameSort}</option>
            <option value="sector">{text.sectorSort}</option>
          </select>
        </div>
        <button className="ghost-button" type="button" onClick={reset} disabled={!hasActiveFilters}>
          <Filter size={16} />{text.clearFilters}
        </button>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : rows.length === 0 ? (
        <StateBox tone="info" icon={Search} title={text.noStocks} actionLabel={hasActiveFilters ? text.clearFilters : undefined} onAction={hasActiveFilters ? reset : undefined} />
      ) : (
        <>
          <GrowthStockTable
            rows={rows}
            text={text}
            lang={lang}
            comparisonSymbols={comparisonSymbols}
            toggleComparisonSymbol={toggleComparisonSymbol}
            openAnalysis={openAnalysis}
          />
          {allRows.length > 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>{text.insufficientMethodology}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function NewsTab({
  text,
  lang,
  loading,
  featured,
  regular,
  total,
  visibleCount,
  setVisibleCount,
  search,
  sector,
  source,
  symbol,
  time,
  sort,
  sources,
  symbols,
  setSearch,
  setSector,
  setSource,
  setSymbol,
  setTime,
  setSort,
  reset,
  hasActiveFilters,
  originalVisibleIds,
  toggleOriginal,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  featured: GrowthNewsItem[];
  regular: GrowthNewsItem[];
  total: number;
  visibleCount: number;
  setVisibleCount: (value: number) => void;
  search: string;
  sector: SectorId;
  source: string;
  symbol: string;
  time: NewsTimeFilter;
  sort: NewsSort;
  sources: string[];
  symbols: string[];
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSource: (value: string) => void;
  setSymbol: (value: string) => void;
  setTime: (value: NewsTimeFilter) => void;
  setSort: (value: NewsSort) => void;
  reset: () => void;
  hasActiveFilters: boolean;
  originalVisibleIds: string[];
  toggleOriginal: (id: string) => void;
}) {
  const regularCards = regular.slice(0, 4);
  const compactRows = regular.slice(4);
  return (
    <section className="section">
      <SectionHeader title={text.newsTitle} description={text.newsDescription} action={<span className="pill">{text.resultCount}: {total}</span>} />
      <div className="filter-panel">
        <div className="field">
          <label htmlFor="growth-news-search">{text.filter}</label>
          <div className="input-wrap">
            <Search size={17} />
            <input id="growth-news-search" className="filter-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={text.searchNews} />
          </div>
        </div>
        <SelectField id="growth-news-sector" label={text.sector} value={sector} onChange={value => setSector(value as SectorId)}>
          <option value="all">{text.allSectors}</option>
          {Object.keys(SECTORS).map(id => <option key={id} value={id}>{sectorLabel(id as SectorId, lang)}</option>)}
        </SelectField>
        <SelectField id="growth-news-symbol" label={text.symbolFilter} value={symbol} onChange={setSymbol}>
          <option value="all">{text.allSectors}</option>
          {symbols.map(option => <option key={option} value={option}>{option}</option>)}
        </SelectField>
        <SelectField id="growth-news-source" label={text.sourceFilter} value={source} onChange={setSource}>
          <option value="all">{text.allSectors}</option>
          {sources.map(option => <option key={option} value={option}>{option}</option>)}
        </SelectField>
        <SelectField id="growth-news-time" label={text.timeRange} value={time} onChange={value => setTime(value as NewsTimeFilter)}>
          <option value="all">{text.allTime}</option>
          <option value="day">{text.lastDay}</option>
          <option value="week">{text.lastWeek}</option>
          <option value="month">{text.lastMonth}</option>
        </SelectField>
        <SelectField id="growth-news-sort" label={text.sort} value={sort} onChange={value => setSort(value as NewsSort)}>
          <option value="latest">{text.latest}</option>
          <option value="oldest">{text.oldest}</option>
          <option value="strongestMove">{text.strongestMove}</option>
        </SelectField>
        <button className="ghost-button" type="button" onClick={reset} disabled={!hasActiveFilters}>
          <Filter size={16} />{text.clearFilters}
        </button>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : total === 0 ? (
        <StateBox tone="info" icon={Search} title={text.noNews} actionLabel={hasActiveFilters ? text.clearFilters : undefined} onAction={hasActiveFilters ? reset : undefined} />
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          <FeaturedNews items={featured} text={text} lang={lang} originalVisibleIds={originalVisibleIds} toggleOriginal={toggleOriginal} />
          {regularCards.length > 0 ? (
            <div className="news-grid">
              {regularCards.map(item => (
                <NewsCard
                  key={item.id || item.url}
                  item={item}
                  text={text}
                  lang={lang}
                  showOriginal={originalVisibleIds.includes(item.id)}
                  toggleOriginal={() => toggleOriginal(item.id)}
                />
              ))}
            </div>
          ) : null}
          {compactRows.length > 0 ? (
            <div className="side-news">
              {compactRows.map(item => (
                <CompactNewsRow key={item.id || item.url} item={item} text={text} lang={lang} />
              ))}
            </div>
          ) : null}
          {visibleCount < total ? (
            <button className="primary-button" type="button" onClick={() => setVisibleCount(visibleCount + NEWS_PAGE_SIZE)}>
              {text.loadMore}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SectorsTab({ text, lang, stats, loading }: { text: typeof COPY[LangCode]; lang: LangCode; stats: ReturnType<typeof buildSectorStats>; loading: boolean }) {
  return (
    <section className="section">
      <SectionHeader title={text.sectorsTitle} description={text.sectorsDescription} />
      {loading ? <SkeletonGrid count={4} /> : (
        <div className="sector-grid">
          {stats.map(sector => <SectorCard key={sector.id} sector={sector} lang={lang} expanded />)}
        </div>
      )}
    </section>
  );
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="section-header">
      <div className="section-title">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, help, loading, tone }: { icon: LucideIcon; label: string; value: string; help?: string; loading?: boolean; tone: Tone }) {
  if (loading) return <div className="metric-card skeleton" />;
  return (
    <article className="metric-card">
      <span className="metric-icon"><Icon size={19} /></span>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {help ? <span className={`metric-help tone-${tone}`}>{help}</span> : null}
    </article>
  );
}

function ComparisonChart({ rows, lang, text }: { rows: GrowthStockRow[]; lang: LangCode; text: typeof COPY[LangCode] }) {
  const maxMove = Math.max(1, ...rows.map(row => Math.abs(row.changePercent ?? 0)));
  if (rows.length === 0) return <StateBox tone="info" icon={LineChart} title={text.chartUnavailable} />;
  return (
    <div className="compare-list" role="img" aria-label={text.comparisonTitle}>
      {rows.map(row => {
        const width = Math.max(4, (Math.abs(row.changePercent ?? 0) / maxMove) * 100);
        return (
          <div className="compare-row" key={row.symbol}>
            <div className="compare-asset">
              <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="sm" className="asset-avatar" />
              <div>
                <strong className="symbol" dir="ltr">{row.symbol}</strong>
                <span className="asset-name" dir="auto">{row.name}</span>
              </div>
            </div>
            <strong className="numeric">{row.price === null ? <UnavailableValue text={text} /> : formatCurrency(row.price, row.currency, lang)}</strong>
            <div className="bar-shell"><div className={`bar-fill tone-${toneForChange(row.changePercent)}`} style={{ width: `${width}%` }} /></div>
            <strong className="numeric">{row.changePercent === null ? <UnavailableValue text={text} /> : formatPercent(row.changePercent, lang)}</strong>
          </div>
        );
      })}
      <p className="muted">{text.chartUnavailable}</p>
    </div>
  );
}

function GrowthStockTable({
  rows,
  text,
  lang,
  comparisonSymbols,
  toggleComparisonSymbol,
  openAnalysis,
}: {
  rows: GrowthStockRow[];
  text: typeof COPY[LangCode];
  lang: LangCode;
  comparisonSymbols: string[];
  toggleComparisonSymbol: (symbol: string) => void;
  openAnalysis: (row: GrowthStockRow) => void;
}) {
  return (
    <>
      <div className="stock-table-card">
        <div className="stock-table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{text.symbolFilter}</th>
                <th>{text.currentPrice}</th>
                <th>{text.dailyChange}</th>
                <th>{text.sector}</th>
                <th>{text.valuationRisk}</th>
                <th>{text.methodology}</th>
                <th>{text.compare}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.symbol}>
                  <td>
                    <div className="table-asset">
                    <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="sm" className="asset-avatar" />
                      <div>
                        <strong dir="auto">{row.name}</strong>
                        <span className="table-muted symbol" dir="ltr">{row.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className="numeric">{row.price === null ? <UnavailableValue text={text} /> : formatCurrency(row.price, row.currency, lang)}</td>
                  <td>{row.changePercent === null ? <UnavailableValue text={text} /> : <span className={badgeClass(row.momentumTone)}>{formatPercent(row.changePercent, lang)}</span>}</td>
                  <td>{row.sectorLabel}</td>
                  <td>{row.valuationRiskLabel === text.unavailable ? <UnavailableValue text={text} /> : row.valuationRiskLabel}</td>
                  <td>{row.growthClassification}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => toggleComparisonSymbol(row.symbol)}
                        disabled={!comparisonSymbols.includes(row.symbol) && comparisonSymbols.length >= 5}
                        aria-label={compareAriaLabel(row.symbol, lang)}
                        aria-pressed={comparisonSymbols.includes(row.symbol)}
                      >
                        <BarChart3 size={15} />{compareActionLabel(comparisonSymbols.includes(row.symbol), text, lang)}
                      </button>
                      <button className="ghost-button" type="button" onClick={() => openAnalysis(row)} aria-label={analysisAriaLabel(row.symbol, lang)}>
                        <BookOpen size={15} />{text.viewAnalysis}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="stock-card-list">
        {rows.map(row => (
          <GrowthStockCard
            key={row.symbol}
            row={row}
            text={text}
            lang={lang}
            selectedForComparison={comparisonSymbols.includes(row.symbol)}
            onCompare={() => toggleComparisonSymbol(row.symbol)}
            compareDisabled={!comparisonSymbols.includes(row.symbol) && comparisonSymbols.length >= 5}
            onAnalysis={() => openAnalysis(row)}
          />
        ))}
      </div>
    </>
  );
}

function GrowthStockCard({
  row,
  text,
  lang,
  compact,
  selectedForComparison,
  onCompare,
  compareDisabled,
  onAnalysis,
}: {
  row: GrowthStockRow;
  text: typeof COPY[LangCode];
  lang: LangCode;
  compact?: boolean;
  selectedForComparison?: boolean;
  onCompare?: () => void;
  compareDisabled?: boolean;
  onAnalysis?: () => void;
}) {
  return (
    <article className="card card-hover">
      <div className="stock-head">
        <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="lg" className="stock-logo" />
        <div className="stock-title">
          <h3 dir="auto">{row.name}</h3>
          <p><span className="symbol" dir="ltr">{row.symbol}</span> · {row.sectorLabel}</p>
        </div>
      </div>
      <div className="row-between">
        <strong className="numeric">{row.price === null ? <UnavailableValue text={text} /> : formatCurrency(row.price, row.currency, lang)}</strong>
        {row.changePercent === null ? <UnavailableValue text={text} /> : <span className={badgeClass(row.momentumTone)}>{formatPercent(row.changePercent, lang)}</span>}
      </div>
      <div className="metric-grid">
        <MiniMetric label={text.methodology} value={row.growthClassification} lang={lang} />
        <MiniMetric label={text.valuationRisk} value={row.valuationRiskLabel === text.unavailable ? <UnavailableValue text={text} /> : row.valuationRiskLabel} lang={lang} />
        <MiniMetric label={text.revenueGrowth} value={<UnavailableValue text={text} />} lang={lang} />
        <MiniMetric label={text.peg} value={<UnavailableValue text={text} />} lang={lang} />
        {!compact ? (
          <>
            <MiniMetric label={text.freeCashFlow} value={<UnavailableValue text={text} />} lang={lang} />
            <MiniMetric label={text.volatility} value={row.momentumLabel} lang={lang} />
          </>
        ) : null}
      </div>
      <p className="muted">{methodologyDescription(row, lang)}</p>
      {!compact ? (
        <div className="card-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onCompare}
            disabled={compareDisabled}
            aria-label={compareAriaLabel(row.symbol, lang)}
            aria-pressed={selectedForComparison}
          >
            <BarChart3 size={16} />{compareActionLabel(selectedForComparison, text, lang)}
          </button>
          <button className="ghost-button" type="button" onClick={onAnalysis} aria-label={analysisAriaLabel(row.symbol, lang)}>
            <BookOpen size={16} />{text.viewAnalysis}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MiniMetric({ label, value, lang, valueDir }: { label: string; value: ReactNode; lang?: LangCode; valueDir?: 'ltr' | 'rtl' | 'auto' }) {
  const displayValue = typeof value === 'string' && lang ? localizeDisplayValue(value, lang) : value;
  const resolvedDir = typeof displayValue === 'string' ? valueTextDirection(displayValue) : undefined;
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong dir={valueDir ?? resolvedDir}>{displayValue}</strong>
    </div>
  );
}

function FeaturedNews({ items, text, lang, originalVisibleIds, toggleOriginal }: { items: GrowthNewsItem[]; text: typeof COPY[LangCode]; lang: LangCode; originalVisibleIds: string[]; toggleOriginal: (id: string) => void }) {
  if (items.length === 0) return null;
  const [lead, ...secondary] = items;
  return (
    <div className="featured-layout">
      <NewsCard item={lead} text={text} lang={lang} showOriginal={originalVisibleIds.includes(lead.id)} toggleOriginal={() => toggleOriginal(lead.id)} lead />
      <div className="side-news">
        {secondary.map(item => (
          <CompactNewsRow key={item.id || item.url} item={item} text={text} lang={lang} />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item, text, lang, showOriginal, toggleOriginal, lead }: { item: GrowthNewsItem; text: typeof COPY[LangCode]; lang: LangCode; showOriginal: boolean; toggleOriginal: () => void; lead?: boolean }) {
  const url = safeUrl(item.url);
  const title = safeArticleTitle(item, showOriginal);
  const summary = safeArticleSummary(item, showOriginal);
  const sector = sectorLabel(classifyNewsSector(item), lang);
  return (
    <article className={`card article-card ${lead ? 'lead-card' : ''}`}>
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
        <span>{sector}</span>
        {item.isTranslated && !showOriginal ? <span className="badge tone-info"><Bot size={13} />{text.machineTranslation}</span> : null}
      </div>
      <h3 className="article-title" dir="auto">{title}</h3>
      {summary ? <p className="article-summary" dir="auto">{summary}</p> : null}
      <div className="metric-grid">
        <MiniMetric label={text.relatedSymbol} value={item.ticker ? item.ticker.toUpperCase() : text.unavailable} lang={lang} valueDir={item.ticker ? 'ltr' : undefined} />
        <MiniMetric label={text.marketContext} value={typeof item.changePercent === 'number' ? formatPercent(item.changePercent, lang) : text.priceUnavailable} lang={lang} />
      </div>
      <div className="article-actions">
        {url ? (
          <a className="primary-button" href={url} target="_blank" rel="noopener noreferrer nofollow">
            {text.readArticle}<ExternalLink size={16} />
          </a>
        ) : null}
        {item.titleOriginal && item.titleOriginal !== item.title ? (
          <button className="ghost-button" type="button" onClick={toggleOriginal}>
            {showOriginal ? text.translatedText : text.originalText}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CompactNewsRow({ item, text, lang }: { item: GrowthNewsItem; text: typeof COPY[LangCode]; lang: LangCode }) {
  const url = safeUrl(item.url);
  return (
    <article className="compact-row">
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
      </div>
      <h3 className="article-title" dir="auto">{safeArticleTitle(item, false)}</h3>
      <div className="row-between">
        <span className="badge tone-info" dir={item.ticker ? 'ltr' : 'auto'}>{item.ticker?.toUpperCase() ?? sectorLabel(classifyNewsSector(item), lang)}</span>
        {url ? <a className="link-button" href={url} target="_blank" rel="noopener noreferrer nofollow">{text.readArticle}<ArrowUpRight size={15} /></a> : null}
      </div>
    </article>
  );
}

function MoversPanel({ text, lang, movers, onRetry }: { text: typeof COPY[LangCode]; lang: LangCode; movers: StockCategoryMoversResponse | null; onRetry: () => void }) {
  const data = movers?.ok ? movers.data : null;
  const hasMoverData = Boolean(data && (data.topGainers.length > 0 || data.topLosers.length > 0));
  return (
    <section className="section movers-section">
      <SectionHeader title={text.strongestMove} description={movers?.ok ? `${text.source}: ${movers.source}` : text.providerError} />
      {data && hasMoverData ? (
        <div className="movers-grid">
          <MoverList title={text.risingStocks} rows={data.topGainers} lang={lang} tone="positive" />
          <MoverList title={text.fallingStocks} rows={data.topLosers} lang={lang} tone="negative" />
        </div>
      ) : (
        <StateBox
          tone="warning"
          icon={AlertTriangle}
          title={text.providerError}
          description={text.marketClosedNote}
          actionLabel={text.retry}
          onAction={onRetry}
        />
      )}
    </section>
  );
}

function MoverList({ title, rows, lang, tone }: { title: string; rows: StockCategoryMoverItem[]; lang: LangCode; tone: Tone }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, MOVER_VISIBLE_LIMIT);
  const hasMore = rows.length > MOVER_VISIBLE_LIMIT;
  return (
    <div className="mover-list">
      <div className="mover-list-title">
        <strong>{title}</strong>
        <span className="pill">{visibleRows.length}</span>
      </div>
      {rows.length === 0 ? <div className="mover-empty">{COPY[lang].unavailable}</div> : visibleRows.map(row => (
        <div className="mover-row" key={row.symbol}>
          <span className="rank">{row.rank}</span>
          <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="sm" className="mover-logo" />
          <div className="mover-info">
            <strong className="symbol" dir="ltr">{row.symbol}</strong>
            <span className="mover-name" dir="auto">{row.name}</span>
          </div>
          <span className={badgeClass(tone)}>{formatPercent(row.changePercent, lang)}</span>
        </div>
      ))}
      {hasMore ? (
        <button className="link-button mover-more" type="button" onClick={() => setExpanded(current => !current)}>
          {expanded ? COPY[lang].expanded : COPY[lang].loadMore}
        </button>
      ) : null}
    </div>
  );
}

function DataStatusPanel({ text, lang, rows, lastUpdated }: { text: typeof COPY[LangCode]; lang: LangCode; rows: GrowthStockRow[]; lastUpdated: string | null }) {
  const sources = uniqueOptions(rows.map(row => row.source));
  const delayedCount = rows.filter(row => row.delayed).length;
  const availableCount = rows.filter(row => row.available && row.price !== null).length;
  const missingFields = rows.reduce((sum, row) => sum
    + (row.price === null ? 1 : 0)
    + (row.changePercent === null ? 1 : 0)
    + (row.currency ? 0 : 1)
    + (row.sectorLabel ? 0 : 1)
    + 9, 0);
  const condition = missingFields > 0 ? text.someFieldsUnavailable : delayedCount > 0 ? text.delayedData : text.connected;
  return (
    <section className="panel">
      <SectionHeader title={text.dataStatusTitle} description={text.marketClosedNote} />
      <div className="metric-grid">
        <MiniMetric label={text.dataProvider} value={sources.join(', ') || <UnavailableValue text={text} />} lang={lang} />
        <MiniMetric label={text.lastQuoteUpdate} value={formatDateTime(lastUpdated, lang)} lang={lang} />
        <MiniMetric label={text.availableStocks} value={`${availableCount}/${rows.length}`} lang={lang} valueDir="ltr" />
        <MiniMetric label={text.missingFields} value={String(missingFields)} lang={lang} valueDir="ltr" />
        <MiniMetric label={text.delayed} value={String(delayedCount)} lang={lang} valueDir="ltr" />
        <MiniMetric label={text.dataCondition} value={condition} lang={lang} />
      </div>
    </section>
  );
}

function EducationGuide({ text, lang, open, toggle }: { text: typeof COPY[LangCode]; lang: LangCode; open: DisclosureId | null; toggle: (id: DisclosureId) => void }) {
  const guideTitles: Record<LangCode, Record<DisclosureId, string>> = {
    ar: {
      what: 'ما هي أسهم النمو؟',
      metrics: 'مقاييس النمو',
      'growth-value': 'النمو مقابل القيمة',
      'growth-momentum': 'الزخم السعري',
      'valuation-risk': 'مخاطر التقييم',
      rates: 'حساسية الفائدة',
      peg: 'نسبة PEG',
    },
    en: {
      what: 'What are growth stocks?',
      metrics: 'Growth metrics',
      'growth-value': 'Growth versus value',
      'growth-momentum': 'Price momentum',
      'valuation-risk': 'Valuation risk',
      rates: 'Rate sensitivity',
      peg: 'PEG ratio',
    },
    fr: {
      what: 'Définition',
      metrics: 'Mesures de croissance',
      'growth-value': 'Croissance et valeur',
      'growth-momentum': 'Momentum',
      'valuation-risk': 'Risque de valorisation',
      rates: 'Sensibilité aux taux',
      peg: 'Ratio PEG',
    },
  };
  const metricSeparator = lang === 'ar' ? '، ' : ', ';
  const metricList = [
    text.revenueGrowth,
    text.earningsGrowth,
    text.forwardGrowth,
    text.grossMargin,
    text.freeCashFlow,
  ].join(metricSeparator);
  const items: Array<{ id: DisclosureId; title: string; body: string }> = [
    { id: 'what', title: guideTitles[lang].what, body: text.subtitle },
    { id: 'metrics', title: guideTitles[lang].metrics, body: `${metricList}. ${text.insufficientMethodology}` },
    { id: 'growth-value', title: guideTitles[lang]['growth-value'], body: text.stocksDescription },
    { id: 'growth-momentum', title: guideTitles[lang]['growth-momentum'], body: text.comparisonDescription },
    { id: 'valuation-risk', title: guideTitles[lang]['valuation-risk'], body: text.insufficientMethodology },
    { id: 'rates', title: guideTitles[lang].rates, body: text.marketClosedNote },
    { id: 'peg', title: guideTitles[lang].peg, body: text.insufficientMethodology },
  ];
  return (
    <section className="section guide-section">
      <SectionHeader title={text.educationTitle} description={text.educationDescription} />
      <div className="guide-grid">
        {items.map(item => {
          const isOpen = open === item.id;
          return (
            <article className="guide-item" key={item.id}>
              <button className="guide-button" type="button" aria-expanded={isOpen} aria-controls={`guide-${item.id}`} onClick={() => toggle(item.id)}>
                <span dir="auto">{item.title}</span>
                {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {isOpen ? <div id={`guide-${item.id}`} className="guide-content" dir="auto">{item.body}</div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SectorCard({ sector, lang, expanded }: { sector: ReturnType<typeof buildSectorStats>[number]; lang: LangCode; expanded?: boolean }) {
  const Icon = sector.icon;
  return (
    <article className="card sector-card">
      <span className="sector-icon"><Icon size={20} /></span>
      <h3 className="sector-title">{sector.label}</h3>
      <p className="muted">{sector.description}</p>
      <div className="metric-grid">
        <MiniMetric label={COPY[lang].trackedStocks} value={String(sector.count || sector.symbols.length)} lang={lang} valueDir="ltr" />
        <MiniMetric label={COPY[lang].dailyChange} value={formatPercent(sector.averageChange, lang)} lang={lang} />
        {expanded ? (
          <>
            <MiniMetric label={COPY[lang].strongestStock} value={sector.top?.symbol ?? COPY[lang].unavailable} lang={lang} valueDir={sector.top?.symbol ? 'ltr' : undefined} />
            <MiniMetric label={COPY[lang].valuationRisk} value={COPY[lang].unavailable} lang={lang} />
          </>
        ) : null}
      </div>
      {expanded ? (
        <>
          <p className="muted"><strong>{COPY[lang].methodology}:</strong> {sector.drivers}</p>
          <p className="muted"><strong>{COPY[lang].valuationRisk}:</strong> {sector.risks}</p>
          <div className="symbol-strip">
            {sector.symbols.map(symbol => <span key={symbol} className="badge tone-info symbol" dir="ltr">{symbol}</span>)}
          </div>
        </>
      ) : null}
    </article>
  );
}

function SelectField({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="filter-select" value={value} onChange={event => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  );
}

function StateBox({
  tone,
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`state-box tone-${tone}`} role={tone === 'warning' || tone === 'negative' ? 'alert' : 'status'}>
      <div className="state-copy">
        <Icon size={20} />
        <div>
          <strong>{title}</strong>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? <button className="ghost-button" type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="stock-grid" style={{ marginTop: 16 }}>
      {Array.from({ length: count }).map((_, index) => <div className="card skeleton" key={index} />)}
    </div>
  );
}
