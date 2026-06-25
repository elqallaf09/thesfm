'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  FileSearch,
  Filter,
  Gauge,
  Info,
  Landmark,
  LineChart,
  ListChecks,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { useLanguage } from '@/hooks/useLanguage';
import type { ShariahAssetType, ShariahScreeningStatus } from '@/lib/market/shariahUniverse';
import styles from './ShariahStocksNewsPage.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type ShariahTab = 'overview' | 'screener' | 'funds' | 'news' | 'methodology';
type DataCompleteness = 'complete' | 'partial' | 'insufficient' | 'not_screened';
type SortKey = 'latest_screening' | 'data_quality' | 'performance' | 'name';
type NewsSortKey = 'latest' | 'source' | 'symbol';
type QuickTimeframe = '15m' | '1h' | '4h' | '1D' | '1W';

type ShariahQuote = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  screeningSource: string | null;
  screeningMethodology: string;
  lastScreenedAt: string | null;
};

type ShariahTickerResponse =
  | {
      ok: true;
      source: string;
      updated_at: string;
      screeningSourceConnected: boolean;
      items: ShariahQuote[];
    }
  | {
      ok: false;
      code: string;
      source: string | null;
      updated_at: string | null;
      screeningSourceConnected: boolean;
      items: ShariahQuote[];
    };

type ScreeningItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  reason: { ar: string; en: string; fr: string };
  screeningSource: string | null;
  methodology: { ar: string; en: string; fr: string };
  lastScreenedAt: string | null;
  notes: { ar: string; en: string; fr: string };
};

type ScreeningResponse = {
  ok: boolean;
  updated_at: string;
  sourceConnected: boolean;
  screeningSource: string | null;
  sourceName: string | null;
  methodology: { ar: string; en: string; fr: string };
  emptyMessage: { ar: string; en: string; fr: string };
  counts: Record<ShariahScreeningStatus, number>;
  items: ScreeningItem[];
};

type ShariahNewsItem = {
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
  shariahStatus?: ShariahScreeningStatus;
  screeningSource?: string | null;
};

type ShariahNewsResponse =
  | {
      success: true;
      category: 'sharia';
      source: string;
      priceSource: string;
      lastUpdated: string;
      language: string;
      translationEnabled: boolean;
      screeningSourceConnected: boolean;
      items: ShariahNewsItem[];
      limit: number;
      message?: string;
    }
  | {
      success: false;
      error?: string;
      reason?: string;
      screeningSourceConnected?: boolean;
    };

type SecurityRow = ScreeningItem & {
  quote?: ShariahQuote;
  dataCompleteness: DataCompleteness;
  stale: boolean;
};

type QuickAnalysisState = {
  symbol: string;
  companyName?: string;
  assetType: 'stock';
  timeframe: QuickTimeframe;
};

type QuickAnalysisResult = {
  ok?: boolean;
  success?: boolean;
  symbol?: string;
  providerSymbol?: string;
  assetType?: string;
  timeframe?: string;
  currentPrice?: number | null;
  currency?: string | null;
  direction?: string;
  suggestedAction?: string;
  confidence?: number | null;
  riskLevel?: string;
  support?: number | number[] | null;
  resistance?: number | number[] | null;
  indicators?: Record<string, unknown>;
  trends?: Record<string, unknown>;
  summaryArabic?: string;
  disclaimerArabic?: string;
  source?: string;
  updatedAt?: string;
  code?: string;
  error?: string;
  message?: string;
};

const PAGE_SIZE = 12;
const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const STATUS_ORDER: ShariahScreeningStatus[] = ['compliant', 'review', 'non_compliant', 'unknown'];
const TABS: ShariahTab[] = ['overview', 'screener', 'funds', 'news', 'methodology'];
const QUICK_TIMEFRAMES: QuickTimeframe[] = ['15m', '1h', '4h', '1D', '1W'];

const COPY = {
  ar: {
    pageTitle: 'مركز أبحاث الأسهم المتوافقة مع المنهجية الشرعية',
    pageKicker: 'Research Center',
    pageSubtitle: 'استعرض نتائج الفحص وفق المنهجية المعتمدة في النظام، وافهم أسباب النتيجة ومصادر البيانات قبل اتخاذ أي قرار.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث',
    updated: 'آخر تحديث',
    notAvailable: 'غير متاح',
    delayed: 'أسعار متأخرة حسب المزود',
    sourceConnected: 'مصدر الفحص متاح',
    sourceLimited: 'بيانات الفحص محدودة',
    method: 'المنهجية',
    screeningDate: 'تاريخ الفحص',
    quoteDate: 'تاريخ السعر',
    financialPeriod: 'فترة القوائم',
    statementUnavailable: 'غير متاحة من المزود الحالي',
    summaryTitle: 'ملخص نتائج الفحص',
    summaryBody: 'النتائج آلية ومبنية على المنهجية والبيانات المتاحة. نقص البيانات لا يعني الاجتياز أو الإخفاق.',
    totalScreened: 'إجمالي الشركات والأدوات',
    compliant: 'متوافق مع المنهجية',
    review: 'يحتاج مراجعة',
    nonCompliant: 'غير متوافق مع المنهجية',
    unknown: 'بيانات غير كافية',
    notScreened: 'لم يتم الفحص بعد',
    complete: 'بيانات مكتملة',
    partial: 'بيانات جزئية',
    staleWarning: 'نتائج فحص قديمة نسبياً',
    tabs: {
      overview: 'نظرة عامة',
      screener: 'نتائج الفحص',
      funds: 'الصناديق الشرعية',
      news: 'الأخبار',
      methodology: 'المنهجية والمصادر',
    },
    methodologyTitle: 'بطاقة المنهجية والشفافية',
    methodologyBody: 'تعرض هذه البطاقة مصدر المنهجية وحدود البيانات. لا يتم دمج معايير متعددة أو تحويل نقص البيانات إلى نتيجة اجتياز.',
    criteria: 'المعايير المستخدمة',
    dataNeeds: 'البيانات المطلوبة',
    missingPolicy: 'التعامل مع البيانات الناقصة',
    missingPolicyText: 'عند نقص بيانات أساسية تظهر النتيجة كبيانات غير كافية أو تحتاج مراجعة، ولا تصنف تلقائياً كمتوافقة.',
    screeningSnapshot: 'حالة الفحص الحالية',
    recentChanges: 'سجل التغيرات',
    noHistory: 'لا يتوفر سجل تغيرات تاريخي لهذا الأصل في مصدر البيانات الحالي.',
    screenerTitle: 'فاحص الأسهم المتوافقة مع المنهجية',
    screenerBody: 'جدول قابل للبحث والفرز يفصل نتيجة الفحص عن الأداء السوقي والمخاطر الاستثمارية.',
    search: 'البحث',
    searchPlaceholder: 'ابحث باسم الشركة أو الرمز أو القطاع',
    statusFilter: 'حالة الفحص',
    sectorFilter: 'القطاع',
    sortBy: 'الترتيب',
    allStatuses: 'كل الحالات',
    allSectors: 'كل القطاعات',
    allSources: 'كل المصادر',
    all: 'الكل',
    clearFilters: 'مسح الفلاتر',
    resultCount: 'عدد النتائج',
    company: 'الشركة',
    symbol: 'الرمز',
    market: 'السوق',
    sector: 'القطاع',
    industry: 'النشاط',
    assetType: 'نوع الأصل',
    stock: 'سهم',
    etf: 'صندوق',
    price: 'السعر الحالي',
    change: 'التغير',
    dataQuality: 'اكتمال البيانات',
    confidence: 'ثقة البيانات',
    details: 'فحص المنهجية',
    quickAnalyze: 'تحليل سريع',
    fullAnalyze: 'التحليل الكامل',
    loadMore: 'عرض المزيد',
    noStocks: 'لا توجد شركات مطابقة للفلاتر الحالية.',
    noFunds: 'لا توجد صناديق مطابقة للفلاتر الحالية.',
    fundsTitle: 'الصناديق والمؤشرات الشرعية',
    fundsBody: 'الصناديق مفصولة عن الشركات لأن منهجية الصندوق ومراقبته قد تختلف عن فحص الأسهم الفردية.',
    fundWarning: 'قد تختلف منهجية الصندوق عن منهجية الفحص المستخدمة في هذه الصفحة.',
    newsTitle: 'أخبار مرتبطة بالأسهم المفحوصة',
    newsBody: 'أخبار مختصرة من المصادر الحالية مع إظهار حالة الفحص الحالية للشركة المرتبطة عند توفرها.',
    noNews: 'لا توجد أخبار مطابقة للفلاتر الحالية.',
    readArticle: 'قراءة الخبر',
    originalText: 'عرض النص الأصلي',
    translated: 'ترجمة آلية',
    source: 'المصدر',
    published: 'تاريخ النشر',
    relatedSymbol: 'رمز مرتبط',
    openCompanyScreen: 'فحص الشركة',
    analyzeRelated: 'تحليل السهم',
    detailsTitle: 'تفاصيل نتيجة الفحص',
    reason: 'سبب النتيجة',
    ratios: 'النسب والمعايير',
    ratioValue: 'القيمة المحسوبة',
    threshold: 'الحد المستخدم',
    ratioStatus: 'النتيجة',
    unavailableRatio: 'غير متاح في نتيجة الفحص الحالية',
    noThreshold: 'لم يرسل المزود الحد الرقمي لهذه النسبة',
    investmentNote: 'اجتياز الفحص وفق المنهجية لا يعني أن السهم مناسب استثمارياً أو منخفض المخاطر.',
    close: 'إغلاق',
    quickTitle: 'التحليل السريع',
    quickLoading: 'جارٍ تحليل السهم',
    quickError: 'تعذر تحليل السهم حالياً. حاول مرة أخرى.',
    currentReading: 'القراءة الحالية',
    riskLevel: 'المخاطر',
    trend: 'الاتجاه',
    support: 'الدعم',
    resistance: 'المقاومة',
    indicators: 'المؤشرات',
    rsi: 'RSI',
    macd: 'MACD',
    ema: 'المتوسطات',
    openFull: 'فتح التحليل الكامل',
    refreshAnalysis: 'تحديث التحليل',
    educationTitle: 'دليل الفحص الشرعي للأسهم',
    disclaimer: 'نتائج الفحص آلية ومبنية على البيانات والمنهجية الموضحة، ولا تمثل فتوى شرعية شخصية. يُنصح بالرجوع إلى جهة شرعية مختصة عند الحاجة.',
    sourceDisclosure: 'الأخبار والبيانات السوقية مجمعة من مصادر خارجية، وقد تتأخر الأسعار أو تكون البيانات المالية ناقصة.',
    sortLabels: {
      latest_screening: 'أحدث فحص',
      data_quality: 'الأكثر اكتمالاً',
      performance: 'أفضل أداء سوقي',
      name: 'الاسم',
    },
    newsSortLabels: {
      latest: 'الأحدث',
      source: 'المصدر',
      symbol: 'الرمز',
    },
  },
  en: {
    pageTitle: 'Sharia Methodology-Screened Equities Research Center',
    pageKicker: 'Research Center',
    pageSubtitle: 'Review automated screening results, methodology, dates, and data limits before making any decision.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing',
    updated: 'Last update',
    notAvailable: 'Unavailable',
    delayed: 'Delayed by provider',
    sourceConnected: 'Screening source available',
    sourceLimited: 'Limited screening data',
    method: 'Methodology',
    screeningDate: 'Screening date',
    quoteDate: 'Quote date',
    financialPeriod: 'Statement period',
    statementUnavailable: 'Not available from current provider',
    summaryTitle: 'Screening Summary',
    summaryBody: 'Results are automated and depend on the shown methodology and available data. Missing data is not treated as a pass or fail.',
    totalScreened: 'Total instruments',
    compliant: 'Aligned with methodology',
    review: 'Needs review',
    nonCompliant: 'Not aligned with methodology',
    unknown: 'Insufficient data',
    notScreened: 'Not screened yet',
    complete: 'Complete data',
    partial: 'Partial data',
    staleWarning: 'Screening may be stale',
    tabs: {
      overview: 'Overview',
      screener: 'Screening results',
      funds: 'Sharia funds',
      news: 'News',
      methodology: 'Methodology',
    },
    methodologyTitle: 'Methodology Transparency',
    methodologyBody: 'This card shows the screening source and data limits. Missing values are never converted into a passing result.',
    criteria: 'Applied criteria',
    dataNeeds: 'Required data',
    missingPolicy: 'Missing-data policy',
    missingPolicyText: 'If essential fields are missing, the result is marked as insufficient data or needs review.',
    screeningSnapshot: 'Current screening state',
    recentChanges: 'Screening history',
    noHistory: 'No historical status-change log is available for this asset from the current source.',
    screenerTitle: 'Sharia Methodology Screener',
    screenerBody: 'A searchable table that separates screening status from market performance and investment risk.',
    search: 'Search',
    searchPlaceholder: 'Search company, symbol, or sector',
    statusFilter: 'Screening status',
    sectorFilter: 'Sector',
    sortBy: 'Sort by',
    allStatuses: 'All statuses',
    allSectors: 'All sectors',
    allSources: 'All sources',
    all: 'All',
    clearFilters: 'Clear filters',
    resultCount: 'Results',
    company: 'Company',
    symbol: 'Symbol',
    market: 'Market',
    sector: 'Sector',
    industry: 'Activity',
    assetType: 'Asset type',
    stock: 'Stock',
    etf: 'ETF',
    price: 'Current price',
    change: 'Change',
    dataQuality: 'Data completeness',
    confidence: 'Data confidence',
    details: 'Methodology screen',
    quickAnalyze: 'Quick analysis',
    fullAnalyze: 'Full analysis',
    loadMore: 'Load more',
    noStocks: 'No companies match the current filters.',
    noFunds: 'No funds match the current filters.',
    fundsTitle: 'Sharia Funds and ETFs',
    fundsBody: 'Funds are separated from individual equities because each fund may apply its own screening methodology.',
    fundWarning: 'A fund methodology may differ from the screening methodology used on this page.',
    newsTitle: 'Screened-equity News',
    newsBody: 'Current-source news with related screening status when available.',
    noNews: 'No news matches the current filters.',
    readArticle: 'Read source',
    originalText: 'Show original text',
    translated: 'Machine translation',
    source: 'Source',
    published: 'Published',
    relatedSymbol: 'Related symbol',
    openCompanyScreen: 'Screen company',
    analyzeRelated: 'Analyze stock',
    detailsTitle: 'Screening Details',
    reason: 'Result explanation',
    ratios: 'Ratios and thresholds',
    ratioValue: 'Calculated value',
    threshold: 'Threshold',
    ratioStatus: 'Status',
    unavailableRatio: 'Unavailable in the current screening result',
    noThreshold: 'The provider did not return the numeric threshold for this ratio',
    investmentNote: 'Passing the methodology screen does not mean the stock is suitable or low risk as an investment.',
    close: 'Close',
    quickTitle: 'Quick Analysis',
    quickLoading: 'Analyzing stock',
    quickError: 'Unable to analyze this stock right now. Try again.',
    currentReading: 'Current reading',
    riskLevel: 'Risk',
    trend: 'Trend',
    support: 'Support',
    resistance: 'Resistance',
    indicators: 'Indicators',
    rsi: 'RSI',
    macd: 'MACD',
    ema: 'Moving averages',
    openFull: 'Open full analysis',
    refreshAnalysis: 'Refresh analysis',
    educationTitle: 'Sharia Screening Guide',
    disclaimer: 'Screening results are automated and based on the shown data and methodology. They are not a personal religious ruling.',
    sourceDisclosure: 'Market data and news come from external sources and may be delayed or incomplete.',
    sortLabels: {
      latest_screening: 'Latest screening',
      data_quality: 'Data completeness',
      performance: 'Best market performance',
      name: 'Name',
    },
    newsSortLabels: {
      latest: 'Latest',
      source: 'Source',
      symbol: 'Symbol',
    },
  },
  fr: {
    pageTitle: 'Centre de recherche actions filtrées par méthodologie charia',
    pageKicker: 'Centre de recherche',
    pageSubtitle: 'Consultez les résultats automatisés, la méthodologie, les dates et les limites des données avant toute décision.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation',
    updated: 'Dernière mise à jour',
    notAvailable: 'Indisponible',
    delayed: 'Données différées par le fournisseur',
    sourceConnected: 'Source de filtrage disponible',
    sourceLimited: 'Données de filtrage limitées',
    method: 'Méthodologie',
    screeningDate: 'Date du filtrage',
    quoteDate: 'Date du cours',
    financialPeriod: 'Période financière',
    statementUnavailable: 'Non fournie par la source actuelle',
    summaryTitle: 'Résumé du filtrage',
    summaryBody: 'Les résultats sont automatisés et dépendent de la méthodologie et des données disponibles.',
    totalScreened: 'Instruments suivis',
    compliant: 'Aligné avec la méthodologie',
    review: 'À revoir',
    nonCompliant: 'Non aligné',
    unknown: 'Données insuffisantes',
    notScreened: 'Non filtré',
    complete: 'Données complètes',
    partial: 'Données partielles',
    staleWarning: 'Filtrage potentiellement ancien',
    tabs: {
      overview: 'Vue générale',
      screener: 'Résultats',
      funds: 'Fonds charia',
      news: 'Actualités',
      methodology: 'Méthodologie',
    },
    methodologyTitle: 'Transparence de la méthodologie',
    methodologyBody: 'Cette carte indique la source et les limites des données.',
    criteria: 'Critères',
    dataNeeds: 'Données requises',
    missingPolicy: 'Données manquantes',
    missingPolicyText: 'Si des données essentielles manquent, le résultat reste insuffisant ou à revoir.',
    screeningSnapshot: 'État actuel',
    recentChanges: 'Historique',
    noHistory: 'Aucun historique de changement disponible pour cet actif.',
    screenerTitle: 'Filtre actions',
    screenerBody: 'Un tableau filtrable qui sépare filtrage, performance et risque.',
    search: 'Recherche',
    searchPlaceholder: 'Société, symbole ou secteur',
    statusFilter: 'Statut',
    sectorFilter: 'Secteur',
    sortBy: 'Tri',
    allStatuses: 'Tous les statuts',
    allSectors: 'Tous les secteurs',
    allSources: 'Toutes les sources',
    all: 'Tout',
    clearFilters: 'Effacer les filtres',
    resultCount: 'Résultats',
    company: 'Société',
    symbol: 'Symbole',
    market: 'Marché',
    sector: 'Secteur',
    industry: 'Activité',
    assetType: 'Type',
    stock: 'Action',
    etf: 'ETF',
    price: 'Cours',
    change: 'Variation',
    dataQuality: 'Complétude',
    confidence: 'Confiance données',
    details: 'Détails',
    quickAnalyze: 'Analyse rapide',
    fullAnalyze: 'Analyse complète',
    loadMore: 'Afficher plus',
    noStocks: 'Aucune société ne correspond aux filtres.',
    noFunds: 'Aucun fonds ne correspond aux filtres.',
    fundsTitle: 'Fonds et ETF charia',
    fundsBody: 'Les fonds sont séparés car leur méthodologie peut différer.',
    fundWarning: 'La méthodologie du fonds peut différer de celle de cette page.',
    newsTitle: 'Actualités',
    newsBody: 'Actualités associées aux valeurs filtrées.',
    noNews: 'Aucune actualité ne correspond aux filtres.',
    readArticle: 'Lire la source',
    originalText: 'Voir le texte original',
    translated: 'Traduction automatique',
    source: 'Source',
    published: 'Publié',
    relatedSymbol: 'Symbole lié',
    openCompanyScreen: 'Voir le filtrage',
    analyzeRelated: 'Analyser',
    detailsTitle: 'Détails du filtrage',
    reason: 'Explication',
    ratios: 'Ratios et seuils',
    ratioValue: 'Valeur calculée',
    threshold: 'Seuil',
    ratioStatus: 'Statut',
    unavailableRatio: 'Indisponible dans le résultat actuel',
    noThreshold: 'Le fournisseur ne renvoie pas le seuil numérique',
    investmentNote: 'Un filtrage positif ne signifie pas que le titre est adapté ou peu risqué.',
    close: 'Fermer',
    quickTitle: 'Analyse rapide',
    quickLoading: 'Analyse du titre',
    quickError: 'Analyse indisponible pour le moment.',
    currentReading: 'Lecture actuelle',
    riskLevel: 'Risque',
    trend: 'Tendance',
    support: 'Support',
    resistance: 'Résistance',
    indicators: 'Indicateurs',
    rsi: 'RSI',
    macd: 'MACD',
    ema: 'Moyennes',
    openFull: 'Ouvrir l’analyse complète',
    refreshAnalysis: 'Actualiser l’analyse',
    educationTitle: 'Guide du filtrage charia',
    disclaimer: 'Les résultats sont automatisés et ne constituent pas un avis religieux personnel.',
    sourceDisclosure: 'Les données et actualités proviennent de sources externes et peuvent être différées.',
    sortLabels: {
      latest_screening: 'Filtrage récent',
      data_quality: 'Complétude',
      performance: 'Performance',
      name: 'Nom',
    },
    newsSortLabels: {
      latest: 'Récent',
      source: 'Source',
      symbol: 'Symbole',
    },
  },
} as const;

function normalizeLang(lang: string | undefined): LangCode {
  if (lang === 'en' || lang === 'fr') return lang;
  return 'ar';
}

function statusLabel(status: ShariahScreeningStatus, lang: LangCode) {
  const c = COPY[lang];
  if (status === 'compliant') return c.compliant;
  if (status === 'review') return c.review;
  if (status === 'non_compliant') return c.nonCompliant;
  return c.unknown;
}

function statusClass(status: ShariahScreeningStatus) {
  if (status === 'compliant') return styles.statusCompliant;
  if (status === 'review') return styles.statusReview;
  if (status === 'non_compliant') return styles.statusNonCompliant;
  return styles.statusUnknown;
}

function completenessLabel(value: DataCompleteness, lang: LangCode) {
  const c = COPY[lang];
  if (value === 'complete') return c.complete;
  if (value === 'partial') return c.partial;
  if (value === 'not_screened') return c.notScreened;
  return c.unknown;
}

function formatDate(value: string | null | undefined, lang: LangCode, includeTime = false) {
  if (!value) return COPY[lang].notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].notAvailable;
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatRelativeTime(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].notAvailable;
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return formatter.format(Math.round(-diffMs / ms), unit);
  }
  return formatter.format(0, 'minute');
}

function formatPrice(value: number | null | undefined, currency: string | null | undefined, lang: LangCode) {
  if (!Number.isFinite(value)) return COPY[lang].notAvailable;
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const digits = Math.abs(Number(value)) < 10 ? 3 : 2;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))} ${currency || ''}`.trim();
}

function formatPercent(value: number | null | undefined, lang: LangCode) {
  if (!Number.isFinite(value)) return COPY[lang].notAvailable;
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${Number(value) > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))}%`;
}

function numeric(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeUrl(url: string | undefined) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function normalizedText(value: string | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function hasMojibake(value: string | undefined) {
  return /[ØÙÃÂ]/.test(String(value ?? ''));
}

function isStaleScreening(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > 365 * 24 * 60 * 60 * 1000;
}

function deriveCompleteness(item: ScreeningItem): DataCompleteness {
  if (!item.lastScreenedAt && item.shariahStatus === 'unknown') return 'not_screened';
  if (item.shariahStatus === 'unknown') return 'insufficient';
  if (item.shariahStatus === 'review') return 'partial';
  return 'complete';
}

function explainReason(item: ScreeningItem, lang: LangCode) {
  const localized = item.reason?.[lang];
  if (localized && !hasMojibake(localized)) return localized;
  if (lang !== 'ar') return item.reason?.en || COPY[lang].notAvailable;
  const activity = item.industry || item.sector || item.name;
  if (item.shariahStatus === 'compliant') {
    return `يعرض السجل الحالي نشاطاً في ${activity} مع نتيجة اجتياز وفق المنهجية المتاحة. لا تتوفر النسب التفصيلية في واجهة المزود الحالية.`;
  }
  if (item.shariahStatus === 'review') {
    return `يحتاج نشاط ${activity} إلى مراجعة دورية وفق المنهجية بسبب طبيعة النشاط أو مزيج الإيرادات. لا تتوفر النسب التفصيلية في واجهة المزود الحالية.`;
  }
  if (item.shariahStatus === 'non_compliant') {
    return `يشير السجل الحالي إلى عدم توافق مع المنهجية المحددة. يجب مراجعة سبب الإخفاق والبيانات المالية قبل الاعتماد على النتيجة.`;
  }
  return 'لا تتوفر بيانات مالية كافية لإكمال الفحص وفق المنهجية الحالية.';
}

function methodologyText(screening: ScreeningResponse | null, lang: LangCode) {
  const value = screening?.methodology?.[lang];
  if (value && !hasMojibake(value)) return value;
  return lang === 'ar'
    ? 'تعتمد القراءة على فحص نشاط الشركة والنسب المالية المتاحة مثل المديونية والإيرادات غير المتوافقة والنقد أو الأدوات ذات العائد. لا تمثل هذه القراءة فتوى شرعية.'
    : COPY[lang].methodologyBody;
}

function dedupeNews(items: ShariahNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const url = safeUrl(item.url);
    const key = url || item.id || `${normalizedText(item.source)}:${normalizedText(item.title || item.headline || item.titleOriginal)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readInitialState() {
  if (typeof window === 'undefined') {
    return {
      tab: 'overview' as ShariahTab,
      search: '',
      status: 'all',
      sector: 'all',
      sort: 'latest_screening' as SortKey,
      newsSearch: '',
      newsStatus: 'all',
      newsSource: 'all',
      newsSort: 'latest' as NewsSortKey,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab') as ShariahTab | null;
  const sortParam = params.get('sort') as SortKey | null;
  const newsSortParam = params.get('newsSort') as NewsSortKey | null;
  return {
    tab: tabParam && TABS.includes(tabParam) ? tabParam : 'overview',
    search: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    sector: params.get('sector') ?? 'all',
    sort: sortParam && ['latest_screening', 'data_quality', 'performance', 'name'].includes(sortParam) ? sortParam : 'latest_screening',
    newsSearch: params.get('newsQ') ?? '',
    newsStatus: params.get('newsStatus') ?? 'all',
    newsSource: params.get('newsSource') ?? 'all',
    newsSort: newsSortParam && ['latest', 'source', 'symbol'].includes(newsSortParam) ? newsSortParam : 'latest',
  };
}

export function ShariahStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const locale = normalizeLang(lang);
  const c = COPY[locale];
  const initialRef = useRef<ReturnType<typeof readInitialState> | null>(null);
  if (initialRef.current === null) initialRef.current = readInitialState();

  const [activeTab, setActiveTab] = useState<ShariahTab>(initialRef.current.tab);
  const [stockSearch, setStockSearch] = useState(initialRef.current.search);
  const [statusFilter, setStatusFilter] = useState(initialRef.current.status);
  const [sectorFilter, setSectorFilter] = useState(initialRef.current.sector);
  const [sortKey, setSortKey] = useState<SortKey>(initialRef.current.sort);
  const [newsSearch, setNewsSearch] = useState(initialRef.current.newsSearch);
  const [newsStatusFilter, setNewsStatusFilter] = useState(initialRef.current.newsStatus);
  const [newsSourceFilter, setNewsSourceFilter] = useState(initialRef.current.newsSource);
  const [newsSortKey, setNewsSortKey] = useState<NewsSortKey>(initialRef.current.newsSort);
  const [tickerResponse, setTickerResponse] = useState<ShariahTickerResponse | null>(null);
  const [screening, setScreening] = useState<ScreeningResponse | null>(null);
  const [newsResponse, setNewsResponse] = useState<ShariahNewsResponse | null>(null);
  const [coreLoading, setCoreLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coreError, setCoreError] = useState('');
  const [newsVisible, setNewsVisible] = useState(NEWS_PAGE_SIZE);
  const [stockVisible, setStockVisible] = useState(PAGE_SIZE);
  const [selectedSecurity, setSelectedSecurity] = useState<SecurityRow | null>(null);
  const [quickAnalysis, setQuickAnalysis] = useState<QuickAnalysisState | null>(null);
  const [quickResult, setQuickResult] = useState<QuickAnalysisResult | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [openEducation, setOpenEducation] = useState<string[]>([]);
  const quickCacheRef = useRef(new Map<string, QuickAnalysisResult>());
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickCloseRef = useRef<HTMLButtonElement | null>(null);

  const loadCoreData = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (background) setRefreshing(true);
    else setCoreLoading(true);
    setCoreError('');
    try {
      const [tickerRaw, screeningRaw] = await Promise.all([
        fetch('/api/sharia-stocks/ticker', { cache: 'no-store' }),
        fetch('/api/sharia-stocks/screening', { cache: 'no-store' }),
      ]);
      const tickerJson = (await tickerRaw.json()) as ShariahTickerResponse;
      const screeningJson = (await screeningRaw.json()) as ScreeningResponse;
      setTickerResponse(tickerJson);
      setScreening(screeningJson);
    } catch {
      setCoreError(locale === 'ar' ? 'تعذر تحديث بيانات الفحص حالياً. يتم عرض آخر نتيجة متاحة إن وجدت.' : 'Unable to refresh screening data right now.');
    } finally {
      setCoreLoading(false);
      setRefreshing(false);
    }
  }, [locale]);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const response = await fetch(`/api/sharia-stocks/news?lang=${locale}&limit=36`, { cache: 'no-store' });
      const json = (await response.json()) as ShariahNewsResponse;
      if (json.success) {
        setNewsResponse({ ...json, items: dedupeNews(json.items ?? []) });
      } else {
        setNewsResponse(json);
      }
    } catch {
      setNewsResponse({ success: false, error: 'news_unavailable' });
    } finally {
      setNewsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadCoreData();
    void loadNews();
  }, [loadCoreData, loadNews]);

  useEffect(() => {
    const id = window.setInterval(() => void loadCoreData({ background: true }), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadCoreData]);

  useEffect(() => {
    const onPop = () => {
      const next = readInitialState();
      setActiveTab(next.tab);
      setStockSearch(next.search);
      setStatusFilter(next.status);
      setSectorFilter(next.sector);
      setSortKey(next.sort);
      setNewsSearch(next.newsSearch);
      setNewsStatusFilter(next.newsStatus);
      setNewsSourceFilter(next.newsSource);
      setNewsSortKey(next.newsSort);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') params.set('tab', activeTab);
    if (stockSearch.trim()) params.set('q', stockSearch.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sectorFilter !== 'all') params.set('sector', sectorFilter);
    if (sortKey !== 'latest_screening') params.set('sort', sortKey);
    if (newsSearch.trim()) params.set('newsQ', newsSearch.trim());
    if (newsStatusFilter !== 'all') params.set('newsStatus', newsStatusFilter);
    if (newsSourceFilter !== 'all') params.set('newsSource', newsSourceFilter);
    if (newsSortKey !== 'latest') params.set('newsSort', newsSortKey);
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, '', next);
  }, [activeTab, newsSearch, newsSortKey, newsSourceFilter, newsStatusFilter, sectorFilter, sortKey, statusFilter, stockSearch]);

  const quoteBySymbol = useMemo(() => {
    const map = new Map<string, ShariahQuote>();
    for (const quote of tickerResponse?.items ?? []) map.set(quote.symbol.toUpperCase(), quote);
    return map;
  }, [tickerResponse]);

  const securities = useMemo<SecurityRow[]>(() => {
    const source = screening?.items ?? [];
    const rows = source.map(item => {
      const quote = quoteBySymbol.get(item.symbol.toUpperCase());
      return {
        ...item,
        quote,
        dataCompleteness: deriveCompleteness(item),
        stale: isStaleScreening(item.lastScreenedAt),
      };
    });
    const symbols = new Set(rows.map(row => row.symbol.toUpperCase()));
    for (const quote of tickerResponse?.items ?? []) {
      if (symbols.has(quote.symbol.toUpperCase())) continue;
      rows.push({
        symbol: quote.symbol,
        name: quote.name,
        sector: quote.sector,
        industry: quote.industry,
        assetType: quote.assetType,
        shariahStatus: quote.shariahStatus,
        statusLabelAr: quote.statusLabelAr,
        reason: { ar: '', en: '', fr: '' },
        screeningSource: quote.screeningSource,
        methodology: {
          ar: quote.screeningMethodology,
          en: quote.screeningMethodology,
          fr: quote.screeningMethodology,
        },
        lastScreenedAt: quote.lastScreenedAt,
        notes: { ar: '', en: '', fr: '' },
        quote,
        dataCompleteness: quote.lastScreenedAt ? 'partial' : 'not_screened',
        stale: isStaleScreening(quote.lastScreenedAt),
      });
    }
    return rows;
  }, [quoteBySymbol, screening?.items, tickerResponse?.items]);

  const sectors = useMemo(() => {
    return Array.from(new Set(securities.map(item => item.sector).filter(Boolean))).sort();
  }, [securities]);

  const stockRows = useMemo(() => securities.filter(item => item.assetType === 'stock'), [securities]);
  const fundRows = useMemo(() => securities.filter(item => item.assetType === 'etf'), [securities]);

  const filteredStocks = useMemo(() => {
    const query = normalizedText(stockSearch);
    const filtered = stockRows.filter(item => {
      const haystack = normalizedText(`${item.name} ${item.symbol} ${item.sector} ${item.industry}`);
      const statusOk = statusFilter === 'all' || item.shariahStatus === statusFilter;
      const sectorOk = sectorFilter === 'all' || item.sector === sectorFilter;
      return (!query || haystack.includes(query)) && statusOk && sectorOk;
    });
    return filtered.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'performance') return (b.quote?.changePercent ?? -999) - (a.quote?.changePercent ?? -999);
      if (sortKey === 'data_quality') return completenessRank(b.dataCompleteness) - completenessRank(a.dataCompleteness);
      return new Date(b.lastScreenedAt ?? 0).getTime() - new Date(a.lastScreenedAt ?? 0).getTime();
    });
  }, [sectorFilter, sortKey, statusFilter, stockRows, stockSearch]);

  const filteredFunds = useMemo(() => {
    const query = normalizedText(stockSearch);
    return fundRows.filter(item => {
      const haystack = normalizedText(`${item.name} ${item.symbol} ${item.sector} ${item.industry}`);
      return !query || haystack.includes(query);
    });
  }, [fundRows, stockSearch]);

  const newsItems = useMemo(() => (newsResponse?.success ? newsResponse.items : []), [newsResponse]);
  const newsSources = useMemo(() => Array.from(new Set(newsItems.map(item => item.source).filter(Boolean))).sort(), [newsItems]);

  const filteredNews = useMemo(() => {
    const query = normalizedText(newsSearch);
    const filtered = newsItems.filter(item => {
      const relatedStatus = item.shariahStatus ?? 'unknown';
      const title = item.title || item.headline || item.titleOriginal || '';
      const haystack = normalizedText(`${title} ${item.summary ?? ''} ${item.source} ${item.companyName ?? ''} ${item.ticker ?? ''}`);
      const sourceOk = newsSourceFilter === 'all' || item.source === newsSourceFilter;
      const statusOk = newsStatusFilter === 'all' || relatedStatus === newsStatusFilter;
      return (!query || haystack.includes(query)) && sourceOk && statusOk;
    });
    return filtered.sort((a, b) => {
      if (newsSortKey === 'source') return a.source.localeCompare(b.source);
      if (newsSortKey === 'symbol') return String(a.ticker ?? '').localeCompare(String(b.ticker ?? ''));
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [newsItems, newsSearch, newsSortKey, newsSourceFilter, newsStatusFilter]);

  const summary = useMemo(() => {
    const counts = { compliant: 0, review: 0, non_compliant: 0, unknown: 0 } as Record<ShariahScreeningStatus, number>;
    for (const item of securities) counts[item.shariahStatus] += 1;
    const staleCount = securities.filter(item => item.stale).length;
    return {
      total: securities.length,
      counts,
      staleCount,
      complete: securities.filter(item => item.dataCompleteness === 'complete').length,
      insufficient: securities.filter(item => item.dataCompleteness === 'insufficient' || item.dataCompleteness === 'not_screened').length,
    };
  }, [securities]);

  const leadingStocks = useMemo(() => {
    return [...stockRows]
      .filter(item => item.quote && item.dataCompleteness !== 'not_screened')
      .sort((a, b) => (b.quote?.changePercent ?? -999) - (a.quote?.changePercent ?? -999))
      .slice(0, 6);
  }, [stockRows]);

  const activeFilters = [
    stockSearch.trim() ? `${c.search}: ${stockSearch.trim()}` : '',
    statusFilter !== 'all' ? statusLabel(statusFilter as ShariahScreeningStatus, locale) : '',
    sectorFilter !== 'all' ? sectorFilter : '',
  ].filter(Boolean);

  const clearFilters = () => {
    setStockSearch('');
    setStatusFilter('all');
    setSectorFilter('all');
    setSortKey('latest_screening');
    setStockVisible(PAGE_SIZE);
  };

  const clearNewsFilters = () => {
    setNewsSearch('');
    setNewsStatusFilter('all');
    setNewsSourceFilter('all');
    setNewsSortKey('latest');
    setNewsVisible(NEWS_PAGE_SIZE);
  };

  const openQuickAnalysis = useCallback((row: Pick<SecurityRow, 'symbol' | 'name'>, timeframe: QuickTimeframe = '1D') => {
    quickAbortRef.current?.abort();
    setQuickAnalysis({ symbol: row.symbol.trim().toUpperCase(), companyName: row.name, assetType: 'stock', timeframe });
    setQuickResult(null);
    setQuickError('');
  }, []);

  const closeQuickAnalysis = useCallback(() => {
    quickAbortRef.current?.abort();
    setQuickAnalysis(null);
    setQuickResult(null);
    setQuickLoading(false);
    setQuickError('');
  }, []);

  useEffect(() => {
    if (!quickAnalysis) return;
    const cacheKey = `${quickAnalysis.symbol}:${quickAnalysis.timeframe}`;
    const cached = quickCacheRef.current.get(cacheKey);
    if (cached) {
      setQuickResult(cached);
      setQuickLoading(false);
      setQuickError('');
      return;
    }
    const controller = new AbortController();
    quickAbortRef.current = controller;
    setQuickLoading(true);
    setQuickError('');
    setQuickResult(null);
    fetch('/api/market-agent/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: quickAnalysis.symbol,
        assetType: quickAnalysis.assetType,
        timeframe: quickAnalysis.timeframe,
      }),
      signal: controller.signal,
    })
      .then(async response => {
        const json = (await response.json()) as QuickAnalysisResult;
        if (!response.ok || json.ok === false) {
          throw new Error(json.message || json.error || json.code || c.quickError);
        }
        quickCacheRef.current.set(cacheKey, json);
        setQuickResult(json);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setQuickError(c.quickError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuickLoading(false);
      });
    return () => controller.abort();
  }, [c.quickError, quickAnalysis]);

  useEffect(() => {
    if (!quickAnalysis) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeQuickAnalysis();
    };
    window.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => quickCloseRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeQuickAnalysis, quickAnalysis]);

  const marketAnalysisHref = (symbol: string, timeframe: QuickTimeframe = '1D') => {
    const params = new URLSearchParams({
      symbol: symbol.trim().toUpperCase(),
      assetType: 'stock',
      timeframe,
      autoRun: '1',
    });
    return `/market-analysis?${params.toString()}`;
  };

  return (
    <div className={styles.page} dir={dir}>
      <Sidebar />
      <main id="main-content" className={styles.main}>
        <div className={styles.container}>
          <ShariaStocksHeader
            c={c}
            locale={locale}
            screening={screening}
            ticker={tickerResponse}
            news={newsResponse}
            refreshing={refreshing}
            loading={coreLoading}
            onRefresh={() => {
              void loadCoreData({ background: true });
              void loadNews();
            }}
          />

          {coreError ? (
            <div className={styles.alertPanel} role="status">
              <AlertTriangle size={18} />
              <span>{coreError}</span>
            </div>
          ) : null}

          <ScreeningSummary c={c} locale={locale} summary={summary} updatedAt={screening?.updated_at ?? tickerResponse?.updated_at ?? null} loading={coreLoading} />

          <ShariaTabs activeTab={activeTab} setActiveTab={setActiveTab} c={c} />

          {activeTab === 'overview' ? (
            <OverviewTab
              c={c}
              locale={locale}
              summary={summary}
              screening={screening}
              loading={coreLoading}
              leadingStocks={leadingStocks}
              newsItems={filteredNews.slice(0, 5)}
              newsLoading={newsLoading}
              onTab={setActiveTab}
              onDetails={setSelectedSecurity}
              onQuick={openQuickAnalysis}
              marketAnalysisHref={marketAnalysisHref}
            />
          ) : null}

          {activeTab === 'screener' ? (
            <ScreenerTab
              c={c}
              locale={locale}
              rows={filteredStocks}
              visible={stockVisible}
              loading={coreLoading}
              search={stockSearch}
              setSearch={setStockSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sectorFilter={sectorFilter}
              setSectorFilter={setSectorFilter}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sectors={sectors}
              activeFilters={activeFilters}
              clearFilters={clearFilters}
              onLoadMore={() => setStockVisible(value => value + PAGE_SIZE)}
              onDetails={setSelectedSecurity}
              onQuick={openQuickAnalysis}
              marketAnalysisHref={marketAnalysisHref}
            />
          ) : null}

          {activeTab === 'funds' ? (
            <FundsTab
              c={c}
              locale={locale}
              rows={filteredFunds}
              loading={coreLoading}
              onDetails={setSelectedSecurity}
              onQuick={openQuickAnalysis}
              marketAnalysisHref={marketAnalysisHref}
            />
          ) : null}

          {activeTab === 'news' ? (
            <NewsTab
              c={c}
              locale={locale}
              items={filteredNews}
              visible={newsVisible}
              loading={newsLoading}
              search={newsSearch}
              setSearch={setNewsSearch}
              statusFilter={newsStatusFilter}
              setStatusFilter={setNewsStatusFilter}
              sourceFilter={newsSourceFilter}
              setSourceFilter={setNewsSourceFilter}
              sortKey={newsSortKey}
              setSortKey={setNewsSortKey}
              sources={newsSources}
              onLoadMore={() => setNewsVisible(value => value + NEWS_PAGE_SIZE)}
              onClear={clearNewsFilters}
              securities={securities}
              onDetails={setSelectedSecurity}
              onQuick={openQuickAnalysis}
            />
          ) : null}

          {activeTab === 'methodology' ? (
            <MethodologyTab
              c={c}
              locale={locale}
              screening={screening}
              openEducation={openEducation}
              setOpenEducation={setOpenEducation}
            />
          ) : null}

          <footer className={styles.disclaimerPanel}>
            <ShieldAlert size={18} />
            <div>
              <strong>{c.disclaimer}</strong>
              <p>{c.sourceDisclosure}</p>
            </div>
          </footer>
        </div>
      </main>

      <ScreeningDetailsDrawer
        c={c}
        locale={locale}
        row={selectedSecurity}
        onClose={() => setSelectedSecurity(null)}
        onQuick={openQuickAnalysis}
        marketAnalysisHref={marketAnalysisHref}
      />

      <QuickAnalysisDrawer
        c={c}
        locale={locale}
        state={quickAnalysis}
        result={quickResult}
        loading={quickLoading}
        error={quickError}
        closeRef={quickCloseRef}
        onClose={closeQuickAnalysis}
        onRefresh={() => {
          if (!quickAnalysis) return;
          quickCacheRef.current.delete(`${quickAnalysis.symbol}:${quickAnalysis.timeframe}`);
          setQuickResult(null);
          setQuickAnalysis({ ...quickAnalysis });
        }}
        onTimeframe={(timeframe) => {
          if (!quickAnalysis) return;
          openQuickAnalysis({ symbol: quickAnalysis.symbol, name: quickAnalysis.companyName ?? quickAnalysis.symbol }, timeframe);
        }}
        marketAnalysisHref={marketAnalysisHref}
      />
    </div>
  );
}

function completenessRank(value: DataCompleteness) {
  if (value === 'complete') return 4;
  if (value === 'partial') return 3;
  if (value === 'insufficient') return 2;
  return 1;
}

function ShariaStocksHeader({
  c,
  locale,
  screening,
  ticker,
  news,
  refreshing,
  loading,
  onRefresh,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  screening: ScreeningResponse | null;
  ticker: ShariahTickerResponse | null;
  news: ShariahNewsResponse | null;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const methodName = screening?.sourceName || screening?.screeningSource || (locale === 'ar' ? 'منهجية THE SFM الداخلية' : 'THE SFM internal methodology');
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>
          <Sparkles size={15} />
          {c.pageKicker}
        </span>
        <h1>{c.pageTitle}</h1>
        <p>{c.pageSubtitle}</p>
        <div className={styles.metaRow}>
          <Pill icon={<FileSearch size={14} />} label={`${c.method}: ${methodName}`} />
          <Pill icon={<Clock3 size={14} />} label={`${c.screeningDate}: ${formatDate(screening?.updated_at, locale, true)}`} />
          <Pill icon={<LineChart size={14} />} label={`${c.quoteDate}: ${formatDate(ticker?.updated_at, locale, true)}`} />
          <Pill icon={<Newspaper size={14} />} label={`${c.newsTitle}: ${news?.success ? formatRelativeTime(news.lastUpdated, locale) : c.notAvailable}`} />
        </div>
      </div>
      <div className={styles.heroActions}>
        <button type="button" onClick={onRefresh} disabled={refreshing || loading}>
          <RefreshCcw size={16} className={refreshing ? styles.spin : undefined} />
          {refreshing ? c.refreshing : c.refresh}
        </button>
        <span className={ticker?.ok ? styles.connectedState : styles.warningState}>
          <Activity size={14} />
          {ticker?.ok ? c.delayed : c.sourceLimited}
        </span>
      </div>
    </header>
  );
}

function ScreeningSummary({
  c,
  locale,
  summary,
  updatedAt,
  loading,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  summary: { total: number; counts: Record<ShariahScreeningStatus, number>; staleCount: number; complete: number; insufficient: number };
  updatedAt: string | null;
  loading: boolean;
}) {
  const cards = [
    { label: c.totalScreened, value: summary.total, icon: Building2 },
    { label: c.compliant, value: summary.counts.compliant, icon: ShieldCheck, status: 'compliant' as ShariahScreeningStatus },
    { label: c.review, value: summary.counts.review, icon: Eye, status: 'review' as ShariahScreeningStatus },
    { label: c.nonCompliant, value: summary.counts.non_compliant, icon: ShieldAlert, status: 'non_compliant' as ShariahScreeningStatus },
    { label: c.unknown, value: summary.insufficient, icon: AlertTriangle, status: 'unknown' as ShariahScreeningStatus },
  ];
  return (
    <section className={styles.summaryPanel} aria-labelledby="screening-summary-title">
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.sectionKicker}><ListChecks size={15} /> {c.screeningSnapshot}</span>
          <h2 id="screening-summary-title">{c.summaryTitle}</h2>
          <p>{c.summaryBody}</p>
        </div>
        <Pill icon={<Clock3 size={14} />} label={`${c.updated}: ${formatDate(updatedAt, locale, true)}`} />
      </div>
      <div className={styles.summaryGrid}>
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div className={`${styles.summaryCard} ${card.status ? statusClass(card.status) : ''}`} key={card.label} aria-busy={loading}>
              <Icon size={18} />
              <span>{card.label}</span>
              <strong>{loading ? '...' : card.value}</strong>
            </div>
          );
        })}
      </div>
      {summary.staleCount ? (
        <div className={styles.inlineWarning}>
          <AlertTriangle size={16} />
          <span>{c.staleWarning}: {summary.staleCount}</span>
        </div>
      ) : null}
    </section>
  );
}

function ShariaTabs({
  activeTab,
  setActiveTab,
  c,
}: {
  activeTab: ShariahTab;
  setActiveTab: (tab: ShariahTab) => void;
  c: typeof COPY[LangCode];
}) {
  return (
    <nav className={styles.tabs} aria-label={c.pageTitle}>
      {TABS.map(tab => (
        <button
          type="button"
          key={tab}
          className={activeTab === tab ? styles.activeTab : undefined}
          onClick={() => setActiveTab(tab)}
          aria-current={activeTab === tab ? 'page' : undefined}
        >
          {tabIcon(tab)}
          <span>{c.tabs[tab]}</span>
        </button>
      ))}
    </nav>
  );
}

function tabIcon(tab: ShariahTab) {
  if (tab === 'overview') return <Gauge size={16} />;
  if (tab === 'screener') return <FileSearch size={16} />;
  if (tab === 'funds') return <WalletCards size={16} />;
  if (tab === 'news') return <Newspaper size={16} />;
  return <BookOpen size={16} />;
}

function OverviewTab({
  c,
  locale,
  summary,
  screening,
  loading,
  leadingStocks,
  newsItems,
  newsLoading,
  onTab,
  onDetails,
  onQuick,
  marketAnalysisHref,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  summary: { total: number; counts: Record<ShariahScreeningStatus, number>; staleCount: number; complete: number; insufficient: number };
  screening: ScreeningResponse | null;
  loading: boolean;
  leadingStocks: SecurityRow[];
  newsItems: ShariahNewsItem[];
  newsLoading: boolean;
  onTab: (tab: ShariahTab) => void;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  return (
    <div className={styles.overviewGrid}>
      <section className={styles.methodologyPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}><Info size={15} /> {c.methodologyTitle}</span>
            <h2>{c.methodologyTitle}</h2>
            <p>{methodologyText(screening, locale)}</p>
          </div>
        </div>
        <div className={styles.methodologyMiniGrid}>
          <MetricTile label={c.method} value={screening?.sourceName || screening?.screeningSource || (locale === 'ar' ? 'منهجية داخلية' : 'Internal methodology')} />
          <MetricTile label={c.dataQuality} value={`${summary.complete}/${summary.total || 0}`} />
          <MetricTile label={c.staleWarning} value={summary.staleCount ? String(summary.staleCount) : '0'} />
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => onTab('methodology')}>
          <BookOpen size={16} />
          {c.tabs.methodology}
        </button>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}><TrendingUp size={15} /> {c.screenerTitle}</span>
            <h2>{locale === 'ar' ? 'أدوات مفحوصة تتحرك اليوم' : 'Screened instruments moving today'}</h2>
            <p>{c.screenerBody}</p>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => onTab('screener')}>{c.tabs.screener}</button>
        </div>
        <div className={styles.compactStockGrid} aria-busy={loading}>
          {leadingStocks.length ? leadingStocks.map(row => (
            <SecurityMiniCard key={row.symbol} row={row} c={c} locale={locale} onDetails={onDetails} onQuick={onQuick} marketAnalysisHref={marketAnalysisHref} />
          )) : <EmptyState text={loading ? `${c.refreshing}...` : c.noStocks} />}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}><Newspaper size={15} /> {c.newsTitle}</span>
            <h2>{c.newsTitle}</h2>
            <p>{c.newsBody}</p>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => onTab('news')}>{c.tabs.news}</button>
        </div>
        <div className={styles.newsPreviewList} aria-busy={newsLoading}>
          {newsItems.length ? newsItems.map(item => <NewsRow key={item.id || item.url} item={item} c={c} locale={locale} compact />) : <EmptyState text={newsLoading ? `${c.refreshing}...` : c.noNews} />}
        </div>
      </section>
    </div>
  );
}

function ScreenerTab(props: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  rows: SecurityRow[];
  visible: number;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sectorFilter: string;
  setSectorFilter: (value: string) => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  sectors: string[];
  activeFilters: string[];
  clearFilters: () => void;
  onLoadMore: () => void;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  const { c, locale, rows, visible, loading } = props;
  const pageRows = rows.slice(0, visible);
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.sectionKicker}><SlidersHorizontal size={15} /> {c.resultCount}: {rows.length}</span>
          <h2>{c.screenerTitle}</h2>
          <p>{c.screenerBody}</p>
        </div>
      </div>
      <ScreeningFilters {...props} />
      <SecurityTable c={c} locale={locale} rows={pageRows} loading={loading} onDetails={props.onDetails} onQuick={props.onQuick} marketAnalysisHref={props.marketAnalysisHref} />
      {visible < rows.length ? (
        <div className={styles.loadMoreWrap}>
          <button type="button" onClick={props.onLoadMore}>{c.loadMore}</button>
        </div>
      ) : null}
    </section>
  );
}

function ScreeningFilters({
  c,
  locale,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sectorFilter,
  setSectorFilter,
  sortKey,
  setSortKey,
  sectors,
  activeFilters,
  clearFilters,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sectorFilter: string;
  setSectorFilter: (value: string) => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  sectors: string[];
  activeFilters: string[];
  clearFilters: () => void;
}) {
  return (
    <div className={styles.filterPanel}>
      <label className={styles.searchField}>
        <span>{c.search}</span>
        <div>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={c.searchPlaceholder} />
        </div>
      </label>
      <SelectField label={c.statusFilter} value={statusFilter} onChange={setStatusFilter}>
        <option value="all">{c.allStatuses}</option>
        {STATUS_ORDER.map(status => <option key={status} value={status}>{statusLabel(status, locale)}</option>)}
      </SelectField>
      <SelectField label={c.sectorFilter} value={sectorFilter} onChange={setSectorFilter}>
        <option value="all">{c.allSectors}</option>
        {sectors.map(sector => <option key={sector} value={sector}>{sector}</option>)}
      </SelectField>
      <SelectField label={c.sortBy} value={sortKey} onChange={(value) => setSortKey(value as SortKey)}>
        {Object.entries(c.sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      {activeFilters.length ? (
        <div className={styles.activeFilters}>
          {activeFilters.map(filter => <span key={filter}>{filter}</span>)}
          <button type="button" onClick={clearFilters}>{c.clearFilters}</button>
        </div>
      ) : null}
    </div>
  );
}

function SecurityTable({
  c,
  locale,
  rows,
  loading,
  onDetails,
  onQuick,
  marketAnalysisHref,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  rows: SecurityRow[];
  loading: boolean;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  if (loading) return <SkeletonRows />;
  if (!rows.length) return <EmptyState text={c.noStocks} />;
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.screenerTable}>
          <thead>
            <tr>
              <th>{c.company}</th>
              <th>{c.statusFilter}</th>
              <th>{c.sector}</th>
              <th>{c.screeningDate}</th>
              <th>{c.dataQuality}</th>
              <th>{c.price}</th>
              <th>{c.change}</th>
              <th>{c.details}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.symbol}>
                <td>
                  <button type="button" className={styles.companyButton} onClick={() => onDetails(row)}>
                    <AssetAvatar symbol={row.symbol} name={row.name} assetType={row.assetType} size="sm" decorative />
                    <span className={styles.companyButtonText}>
                      <strong>{row.name}</strong>
                      <b dir="ltr">{row.symbol}</b>
                    </span>
                  </button>
                </td>
                <td><StatusBadge status={row.shariahStatus} label={statusLabel(row.shariahStatus, locale)} /></td>
                <td>{row.sector}<small>{row.industry}</small></td>
                <td>{formatDate(row.lastScreenedAt, locale)}</td>
                <td><DataQualityBadge value={row.dataCompleteness} stale={row.stale} c={c} locale={locale} /></td>
                <td dir="ltr">{formatPrice(row.quote?.price, row.quote?.currency, locale)}</td>
                <td><ChangeValue value={row.quote?.changePercent} locale={locale} /></td>
                <td>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onDetails(row)}>{c.details}</button>
                    <button type="button" onClick={() => onQuick(row)}>{c.quickAnalyze}</button>
                    <a href={marketAnalysisHref(row.symbol)}>{c.fullAnalyze}</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobileCardList}>
        {rows.map(row => (
          <SecurityMobileCard key={row.symbol} row={row} c={c} locale={locale} onDetails={onDetails} onQuick={onQuick} marketAnalysisHref={marketAnalysisHref} />
        ))}
      </div>
    </>
  );
}

function FundsTab({
  c,
  locale,
  rows,
  loading,
  onDetails,
  onQuick,
  marketAnalysisHref,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  rows: SecurityRow[];
  loading: boolean;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.sectionKicker}><WalletCards size={15} /> {c.fundsTitle}</span>
          <h2>{c.fundsTitle}</h2>
          <p>{c.fundsBody}</p>
        </div>
      </div>
      <div className={styles.inlineWarning}>
        <Info size={16} />
        <span>{c.fundWarning}</span>
      </div>
      {loading ? <SkeletonRows /> : rows.length ? (
        <div className={styles.fundGrid}>
          {rows.map(row => <SecurityMiniCard key={row.symbol} row={row} c={c} locale={locale} onDetails={onDetails} onQuick={onQuick} marketAnalysisHref={marketAnalysisHref} />)}
        </div>
      ) : <EmptyState text={c.noFunds} />}
    </section>
  );
}

function NewsTab({
  c,
  locale,
  items,
  visible,
  loading,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  sortKey,
  setSortKey,
  sources,
  onLoadMore,
  onClear,
  securities,
  onDetails,
  onQuick,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  items: ShariahNewsItem[];
  visible: number;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sourceFilter: string;
  setSourceFilter: (value: string) => void;
  sortKey: NewsSortKey;
  setSortKey: (value: NewsSortKey) => void;
  sources: string[];
  onLoadMore: () => void;
  onClear: () => void;
  securities: SecurityRow[];
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
}) {
  const visibleItems = items.slice(0, visible);
  const bySymbol = useMemo(() => new Map(securities.map(row => [row.symbol.toUpperCase(), row])), [securities]);
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.sectionKicker}><Newspaper size={15} /> {c.resultCount}: {items.length}</span>
          <h2>{c.newsTitle}</h2>
          <p>{c.newsBody}</p>
        </div>
      </div>
      <div className={styles.filterPanel}>
        <label className={styles.searchField}>
          <span>{c.search}</span>
          <div>
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={c.searchPlaceholder} />
          </div>
        </label>
        <SelectField label={c.statusFilter} value={statusFilter} onChange={setStatusFilter}>
          <option value="all">{c.allStatuses}</option>
          {STATUS_ORDER.map(status => <option key={status} value={status}>{statusLabel(status, locale)}</option>)}
        </SelectField>
        <SelectField label={c.source} value={sourceFilter} onChange={setSourceFilter}>
          <option value="all">{c.allSources}</option>
          {sources.map(source => <option key={source} value={source}>{source}</option>)}
        </SelectField>
        <SelectField label={c.sortBy} value={sortKey} onChange={(value) => setSortKey(value as NewsSortKey)}>
          {Object.entries(c.newsSortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
        {(search || statusFilter !== 'all' || sourceFilter !== 'all') ? <button type="button" className={styles.clearButton} onClick={onClear}>{c.clearFilters}</button> : null}
      </div>
      {loading ? <SkeletonRows /> : visibleItems.length ? (
        <div className={styles.newsGrid}>
          {visibleItems.map(item => (
            <NewsCard
              key={item.id || item.url}
              item={item}
              c={c}
              locale={locale}
              related={item.ticker ? bySymbol.get(item.ticker.toUpperCase()) : undefined}
              onDetails={onDetails}
              onQuick={onQuick}
            />
          ))}
        </div>
      ) : <EmptyState text={c.noNews} />}
      {visible < items.length ? (
        <div className={styles.loadMoreWrap}>
          <button type="button" onClick={onLoadMore}>{c.loadMore}</button>
        </div>
      ) : null}
    </section>
  );
}

function MethodologyTab({
  c,
  locale,
  screening,
  openEducation,
  setOpenEducation,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  screening: ScreeningResponse | null;
  openEducation: string[];
  setOpenEducation: (value: string[]) => void;
}) {
  const lessons = [
    ['meaning', locale === 'ar' ? 'ما المقصود بالأسهم المتوافقة؟' : 'What does screened mean?', locale === 'ar' ? 'هي نتيجة فحص آلية وفق منهجية محددة، ولا تعني حكماً عاماً أو مناسبته لكل مستثمر.' : 'It is an automated result under a specific methodology, not a universal religious ruling.'],
    ['activity', locale === 'ar' ? 'كيف يتم فحص نشاط الشركة؟' : 'Business activity screening', locale === 'ar' ? 'يراجع الفحص طبيعة النشاط والإيرادات المرتبطة بأنشطة قد تكون غير متوافقة وفق المنهجية.' : 'The screen reviews the business model and potentially non-compliant revenue sources.'],
    ['ratios', locale === 'ar' ? 'كيف تتم مراجعة النسب المالية؟' : 'Financial ratio review', locale === 'ar' ? 'تحتاج النسب إلى بيانات مالية حديثة مثل المديونية والسيولة والإيرادات. إذا غابت البيانات لا يتم افتراض نتيجة.' : 'Ratios require current financial data. Missing values are not assumed to pass.'],
    ['limits', locale === 'ar' ? 'ما حدود الفحص الآلي؟' : 'Automated screening limits', locale === 'ar' ? 'النتيجة تعتمد على جودة البيانات وتاريخها والمنهجية، ولا تغني عن مراجعة جهة مختصة.' : 'The result depends on data quality, freshness, and methodology.'],
    ['investment', locale === 'ar' ? 'الفرق بين التوافق والمناسبة الاستثمارية' : 'Screening vs suitability', locale === 'ar' ? 'نتيجة الفحص منفصلة عن التقييم، الربحية، الأداء، المخاطر، والتحليل الفني.' : 'Screening is separate from valuation, profitability, risk, and technical analysis.'],
  ];
  const toggle = (id: string) => {
    setOpenEducation(openEducation.includes(id) ? openEducation.filter(item => item !== id) : [...openEducation, id]);
  };
  return (
    <div className={styles.methodologyLayout}>
      <section className={styles.methodologyPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}><Landmark size={15} /> {c.methodologyTitle}</span>
            <h2>{c.methodologyTitle}</h2>
            <p>{methodologyText(screening, locale)}</p>
          </div>
        </div>
        <div className={styles.methodologyMiniGrid}>
          <MetricTile label={c.method} value={screening?.sourceName || screening?.screeningSource || (locale === 'ar' ? 'منهجية THE SFM الداخلية' : 'THE SFM internal methodology')} />
          <MetricTile label={c.screeningDate} value={formatDate(screening?.updated_at, locale, true)} />
          <MetricTile label={c.financialPeriod} value={c.statementUnavailable} />
          <MetricTile label={c.dataNeeds} value={locale === 'ar' ? 'النشاط، المديونية، الإيرادات غير المتوافقة، النقد والأدوات ذات العائد' : 'Activity, debt, non-compliant revenue, cash and yield instruments'} />
        </div>
        <div className={styles.criteriaGrid}>
          {[
            [c.criteria, locale === 'ar' ? 'نشاط الشركة، النسب المالية، الإيرادات غير المتوافقة، اكتمال البيانات.' : 'Business activity, ratios, non-compliant revenue, and data completeness.'],
            [c.missingPolicy, c.missingPolicyText],
            [c.recentChanges, c.noHistory],
          ].map(([title, body]) => (
            <div className={styles.criteriaCard} key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}><BookOpen size={15} /> {c.educationTitle}</span>
            <h2>{c.educationTitle}</h2>
            <p>{locale === 'ar' ? 'بطاقات تعليمية مختصرة ومغلقة افتراضياً للحفاظ على صفحة قابلة للمسح.' : 'Concise education cards, collapsed by default.'}</p>
          </div>
        </div>
        <div className={styles.accordionList}>
          {lessons.map(([id, title, body]) => {
            const open = openEducation.includes(id);
            return (
              <article className={styles.accordionItem} key={id}>
                <button type="button" onClick={() => toggle(id)} aria-expanded={open} aria-controls={`lesson-${id}`}>
                  <span>{title}</span>
                  <ChevronDown size={16} className={open ? styles.chevronOpen : undefined} />
                </button>
                <div id={`lesson-${id}`} hidden={!open}>
                  <p>{body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className={styles.selectField}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status, label }: { status: ShariahScreeningStatus; label: string }) {
  return <span className={`${styles.statusBadge} ${statusClass(status)}`}>{label}</span>;
}

function DataQualityBadge({ value, stale, c, locale }: { value: DataCompleteness; stale: boolean; c: typeof COPY[LangCode]; locale: LangCode }) {
  return (
    <span className={`${styles.qualityBadge} ${stale ? styles.qualityStale : ''}`}>
      {stale ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
      {stale ? c.staleWarning : completenessLabel(value, locale)}
    </span>
  );
}

function ChangeValue({ value, locale }: { value: number | null | undefined; locale: LangCode }) {
  const number = numeric(value);
  if (number === null) return <span className={styles.neutralValue}>{COPY[locale].notAvailable}</span>;
  const positive = number > 0;
  const negative = number < 0;
  return (
    <span className={positive ? styles.positiveValue : negative ? styles.negativeValue : styles.neutralValue} dir="ltr">
      {positive ? <TrendingUp size={14} /> : negative ? <TrendingDown size={14} /> : null}
      {formatPercent(number, locale)}
    </span>
  );
}

function SecurityMiniCard({
  row,
  c,
  locale,
  onDetails,
  onQuick,
  marketAnalysisHref,
}: {
  row: SecurityRow;
  c: typeof COPY[LangCode];
  locale: LangCode;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  return (
    <article className={styles.securityCard}>
      <header>
        <div className={styles.securityCardIdentity}>
          <AssetAvatar symbol={row.symbol} name={row.name} assetType={row.assetType} size="md" decorative />
          <div>
            <strong>{row.name}</strong>
            <span dir="ltr">{row.symbol}</span>
          </div>
        </div>
        <StatusBadge status={row.shariahStatus} label={statusLabel(row.shariahStatus, locale)} />
      </header>
      <div className={styles.cardMetrics}>
        <MetricTile label={c.price} value={formatPrice(row.quote?.price, row.quote?.currency, locale)} ltr />
        <MetricTile label={c.change} value={formatPercent(row.quote?.changePercent, locale)} ltr />
        <MetricTile label={c.screeningDate} value={formatDate(row.lastScreenedAt, locale)} />
      </div>
      <p>{explainReason(row, locale)}</p>
      <div className={styles.cardActions}>
        <button type="button" onClick={() => onDetails(row)}>{c.details}</button>
        <button type="button" onClick={() => onQuick(row)}>{c.quickAnalyze}</button>
        <a href={marketAnalysisHref(row.symbol)}>{c.fullAnalyze}</a>
      </div>
    </article>
  );
}

function SecurityMobileCard(props: {
  row: SecurityRow;
  c: typeof COPY[LangCode];
  locale: LangCode;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  return <SecurityMiniCard {...props} />;
}

function NewsCard({
  item,
  c,
  locale,
  related,
  onDetails,
  onQuick,
}: {
  item: ShariahNewsItem;
  c: typeof COPY[LangCode];
  locale: LangCode;
  related?: SecurityRow;
  onDetails: (row: SecurityRow) => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
}) {
  const title = item.title || item.headline || item.titleOriginal || c.notAvailable;
  const summary = item.summary || item.summaryOriginal || '';
  const href = safeUrl(item.url);
  const status = item.shariahStatus ?? related?.shariahStatus ?? 'unknown';
  return (
    <article className={styles.newsCard}>
      <header>
        <span>{item.source}</span>
        <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt, locale)}</time>
        <StatusBadge status={status} label={statusLabel(status, locale)} />
      </header>
      <h3 dir="auto">{title}</h3>
      {summary ? <p dir="auto">{summary}</p> : null}
      <div className={styles.newsMeta}>
        {item.isTranslated ? <span>{c.translated}</span> : null}
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {item.companyName ? <span>{item.companyName}</span> : null}
      </div>
      <footer>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{c.readArticle}<ExternalLink size={14} /></a> : null}
        {related ? <button type="button" onClick={() => onDetails(related)}>{c.openCompanyScreen}</button> : null}
        {related ? <button type="button" onClick={() => onQuick(related)}>{c.analyzeRelated}</button> : null}
      </footer>
    </article>
  );
}

function NewsRow({ item, c, locale, compact = false }: { item: ShariahNewsItem; c: typeof COPY[LangCode]; locale: LangCode; compact?: boolean }) {
  const href = safeUrl(item.url);
  const title = item.title || item.headline || item.titleOriginal || c.notAvailable;
  return (
    <a className={`${styles.newsRow} ${compact ? styles.newsRowCompact : ''}`} href={href || undefined} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer nofollow' : undefined}>
      <span>{item.source}</span>
      <strong dir="auto">{title}</strong>
      <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt, locale)}</time>
    </a>
  );
}

function MetricTile({ label, value, ltr = false }: { label: string; value: string | number; ltr?: boolean }) {
  return (
    <div className={styles.metricTile}>
      <span>{label}</span>
      <strong dir={ltr ? 'ltr' : undefined}>{value}</strong>
    </div>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className={styles.pill}>
      {icon}
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={styles.emptyState}>
      <Info size={20} />
      <span>{text}</span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className={styles.skeletonRows} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
    </div>
  );
}

function ScreeningDetailsDrawer({
  c,
  locale,
  row,
  onClose,
  onQuick,
  marketAnalysisHref,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  row: SecurityRow | null;
  onClose: () => void;
  onQuick: (row: Pick<SecurityRow, 'symbol' | 'name'>) => void;
  marketAnalysisHref: (symbol: string) => string;
}) {
  if (!row) return null;
  const ratioRows = [
    locale === 'ar' ? 'نسبة الأنشطة غير المتوافقة' : 'Non-compliant activity/revenue ratio',
    locale === 'ar' ? 'نسبة المديونية' : 'Debt ratio',
    locale === 'ar' ? 'النقد أو الأدوات ذات العائد' : 'Cash or yield-bearing instruments',
  ];
  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="screening-drawer-title">
        <header className={styles.drawerHeader}>
          <div>
            <span dir="ltr">{row.symbol}</span>
            <h2 id="screening-drawer-title">{row.name}</h2>
            <StatusBadge status={row.shariahStatus} label={statusLabel(row.shariahStatus, locale)} />
          </div>
          <button type="button" onClick={onClose} aria-label={c.close}>
            <X size={18} />
          </button>
        </header>
        <div className={styles.drawerBody}>
          <section>
            <h3>{c.reason}</h3>
            <p>{explainReason(row, locale)}</p>
            <div className={styles.detailMetaGrid}>
              <MetricTile label={c.method} value={row.screeningSource || (locale === 'ar' ? 'منهجية داخلية' : 'Internal methodology')} />
              <MetricTile label={c.screeningDate} value={formatDate(row.lastScreenedAt, locale)} />
              <MetricTile label={c.financialPeriod} value={c.statementUnavailable} />
              <MetricTile label={c.dataQuality} value={completenessLabel(row.dataCompleteness, locale)} />
            </div>
          </section>
          <section>
            <h3>{c.ratios}</h3>
            <div className={styles.ratioTable}>
              {ratioRows.map(label => (
                <div className={styles.ratioRow} key={label}>
                  <strong>{label}</strong>
                  <span>{c.ratioValue}: {c.unavailableRatio}</span>
                  <span>{c.threshold}: {c.noThreshold}</span>
                  <span>{c.ratioStatus}: {row.dataCompleteness === 'complete' ? statusLabel(row.shariahStatus, locale) : completenessLabel(row.dataCompleteness, locale)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.investmentSeparation}>
            <AlertTriangle size={18} />
            <p>{c.investmentNote}</p>
          </section>
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" onClick={() => onQuick(row)}>{c.quickAnalyze}</button>
          <a href={marketAnalysisHref(row.symbol)}>{c.fullAnalyze}</a>
        </footer>
      </aside>
    </div>
  );
}

function QuickAnalysisDrawer({
  c,
  locale,
  state,
  result,
  loading,
  error,
  closeRef,
  onClose,
  onRefresh,
  onTimeframe,
  marketAnalysisHref,
}: {
  c: typeof COPY[LangCode];
  locale: LangCode;
  state: QuickAnalysisState | null;
  result: QuickAnalysisResult | null;
  loading: boolean;
  error: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRefresh: () => void;
  onTimeframe: (timeframe: QuickTimeframe) => void;
  marketAnalysisHref: (symbol: string, timeframe?: QuickTimeframe) => string;
}) {
  if (!state) return null;
  const indicators = result?.indicators ?? {};
  const rsi = numeric((indicators as Record<string, unknown>).rsi ?? (indicators as Record<string, unknown>).rsi14);
  const macd = numeric((indicators as Record<string, unknown>).macd);
  const sma20 = numeric((indicators as Record<string, unknown>).sma20 ?? (indicators as Record<string, unknown>).ema20);
  const sma50 = numeric((indicators as Record<string, unknown>).sma50 ?? (indicators as Record<string, unknown>).ema50);
  const support = Array.isArray(result?.support) ? result?.support[0] : result?.support;
  const resistance = Array.isArray(result?.resistance) ? result?.resistance[0] : result?.resistance;
  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className={`${styles.drawer} ${styles.quickDrawer}`} role="dialog" aria-modal="true" aria-labelledby="quick-analysis-title" aria-live="polite">
        <header className={styles.drawerHeader}>
          <div>
            <span>{c.quickTitle}</span>
            <h2 id="quick-analysis-title">{state.companyName || state.symbol} <b dir="ltr">{state.symbol}</b></h2>
          </div>
          <button type="button" onClick={onClose} ref={closeRef} aria-label={c.close}>
            <X size={18} />
          </button>
        </header>
        <div className={styles.timeframeBar} aria-label="timeframe">
          {QUICK_TIMEFRAMES.map(timeframe => (
            <button type="button" key={timeframe} className={state.timeframe === timeframe ? styles.activeTimeframe : undefined} onClick={() => onTimeframe(timeframe)}>
              {timeframe}
            </button>
          ))}
        </div>
        <div className={styles.drawerBody}>
          {loading ? (
            <div className={styles.quickLoading}>
              <Loader2 size={20} className={styles.spin} />
              <span>{c.quickLoading} {state.symbol}...</span>
              <SkeletonRows />
            </div>
          ) : error ? (
            <div className={styles.alertPanel}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : result ? (
            <>
              <section className={styles.quickSummaryGrid}>
                <MetricTile label={c.currentReading} value={result.suggestedAction || result.direction || c.notAvailable} />
                <MetricTile label={c.confidence} value={Number.isFinite(result.confidence) ? `${Math.round(Number(result.confidence))}%` : c.notAvailable} ltr />
                <MetricTile label={c.riskLevel} value={result.riskLevel || c.notAvailable} />
                <MetricTile label={c.price} value={formatPrice(result.currentPrice, result.currency, locale)} ltr />
              </section>
              <section>
                <h3>{c.indicators}</h3>
                <div className={styles.detailMetaGrid}>
                  <MetricTile label={c.rsi} value={rsi === null ? c.notAvailable : rsi.toFixed(2)} ltr />
                  <MetricTile label={c.macd} value={macd === null ? c.notAvailable : macd.toFixed(2)} ltr />
                  <MetricTile label={c.ema} value={sma20 !== null && sma50 !== null ? `${sma20.toFixed(2)} / ${sma50.toFixed(2)}` : c.notAvailable} ltr />
                  <MetricTile label={c.support} value={formatPrice(numeric(support), result.currency, locale)} ltr />
                  <MetricTile label={c.resistance} value={formatPrice(numeric(resistance), result.currency, locale)} ltr />
                  <MetricTile label={c.source} value={result.source || c.notAvailable} />
                </div>
              </section>
              {result.summaryArabic ? (
                <section>
                  <h3>{locale === 'ar' ? 'ملخص القراءة' : 'Analysis summary'}</h3>
                  <p>{result.summaryArabic}</p>
                </section>
              ) : null}
              <section className={styles.investmentSeparation}>
                <AlertTriangle size={18} />
                <p>{c.investmentNote}</p>
              </section>
            </>
          ) : null}
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" onClick={onRefresh} disabled={loading}>{c.refreshAnalysis}</button>
          <a href={marketAnalysisHref(state.symbol, state.timeframe)}>{c.openFull}</a>
        </footer>
      </aside>
    </div>
  );
}

export default ShariahStocksNewsPage;
