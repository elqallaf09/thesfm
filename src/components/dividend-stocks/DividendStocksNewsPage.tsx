'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Coins,
  ExternalLink,
  Filter,
  Info,
  Layers3,
  LineChart,
  Newspaper,
  PiggyBank,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type DividendTab = 'overview' | 'explorer' | 'featured' | 'calendar' | 'news' | 'education';
type SectorId = 'all' | 'consumer_goods' | 'energy' | 'banks' | 'telecom' | 'utilities' | 'reits' | 'healthcare' | 'industrials' | 'technology';
type NewsTimeFilter = 'all' | 'day' | 'week' | 'month';
type NewsImpactFilter = 'all' | 'high' | 'medium' | 'low' | 'unavailable';
type NewsTypeFilter = 'all' | 'dividends' | 'high_yield' | 'earnings' | 'fixed_income' | 'defensive' | 'telecom' | 'utilities' | 'energy' | 'reits' | 'consumer_staples';
type NewsSort = 'latest' | 'oldest' | 'strongestMove';
type StockSort = 'quality' | 'yield' | 'payout' | 'exDate' | 'name' | 'change';
type CalendarRange = '30' | '90' | 'all';
type EducationId = 'basics' | 'yield' | 'payout' | 'dates' | 'growth' | 'safety' | 'reits' | 'tax' | 'mistakes';
type Tone = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';

type DividendTickerItem = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  available?: boolean;
  unavailableReason?: string;
  dividendYield: number | null;
  payoutRatio: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  recordDate: string | null;
  declarationDate: string | null;
  dividendDataLabel?: string | null;
  dividendMetricSource: string | null;
  source: string;
  delayed: boolean;
};

type DividendTickerResponse =
  | {
      ok: true;
      source: string;
      updated_at: string;
      items: DividendTickerItem[];
    }
  | {
      ok: false;
      code?: string;
      source: string | null;
      updated_at: string | null;
      items: DividendTickerItem[];
    };

type DividendNewsItem = {
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
  translatedTo?: string | null;
  companyName?: string | null;
  ticker?: string | null;
  sector?: string | null;
  sectors?: string[] | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  provider?: string | null;
  delayed?: boolean;
};

type DividendNewsResponse =
  | {
      success: true;
      category: string;
      source: string;
      priceSource?: string | null;
      lastUpdated: string;
      language: string;
      translationEnabled: boolean;
      items: DividendNewsItem[];
      limit: number;
      message?: string;
    }
  | {
      success: false;
      error?: string;
      reason?: string;
    };

type DividendStockRow = DividendTickerItem & {
  sectorId: Exclude<SectorId, 'all'>;
  sectorLabel: string;
  riskLabel: string;
  riskTone: Tone;
  qualityScore: number | null;
  qualityLabel: string;
  selectionReason: string;
  payoutQuality: string;
  highYieldWarning: boolean;
};

type DividendEvent = {
  id: string;
  symbol: string;
  name: string;
  companyName?: string;
  market: string;
  type: string | null;
  date: string | null;
  annualDividend?: number | null;
  dividendAmount: number | null;
  dividendYield: number | null;
  currency: string;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  declarationDate: string | null;
  source: string;
  provider: 'finnhub' | 'fmp' | null;
  status: 'announced' | 'scheduled' | 'estimated';
};

type DividendCalendarProviderStatus = {
  configured: boolean;
  provider: 'finnhub' | 'fmp' | null;
  status: 'available' | 'not_configured' | 'success' | 'provider_error' | 'rate_limited';
  finnhubConfigured?: boolean;
  fmpConfigured?: boolean;
  lastFetchStatus?: string | null;
  lastFetchTime?: string | null;
  lastSuccessfulUpdate?: string | null;
};

type DividendCalendarResponse = {
  status: 'success' | 'not_configured' | 'not_entitled' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'provider_error' | 'invalid_request';
  provider: 'finnhub' | 'fmp' | null;
  providerStatus?: DividendCalendarProviderStatus;
  configured: boolean;
  items: DividendEvent[];
  events?: DividendEvent[];
  rawEventCount: number;
  filteredEventCount: number;
  cached: boolean;
  stale: boolean;
  messageCode: string | null;
  code: string | null;
  ok: boolean;
  success: boolean;
  lastSuccessfulUpdate?: string | null;
  updated_at?: string | null;
  availableFilters?: {
    markets?: string[];
    symbols?: string[];
    types?: string[];
  };
  request?: {
    from: string;
    to: string;
    range: CalendarRange;
  };
};

const COPY = {
  ar: {
    badge: 'أسهم الدخل المرتفع',
    title: 'أخبار أسهم الدخل المرتفع',
    subtitle: 'تابع أخبار وأسعار الشركات ذات التوزيعات والعوائد المرتفعة من مزودي البيانات الحقيقيين، مع عرض واضح عند نقص البيانات.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    connected: 'بيانات السوق متصلة',
    partial: 'بيانات جزئية',
    delayed: 'قد تتأخر الأسعار حسب مزود البيانات',
    lastUpdate: 'آخر تحديث',
    quoteUpdate: 'تحديث الأسعار',
    newsUpdate: 'تحديث الأخبار',
    provider: 'مزود البيانات',
    source: 'المصدر',
    unavailable: 'غير متاح',
    tabs: {
      overview: 'نظرة عامة',
      explorer: 'مستكشف الأسهم',
      featured: 'أسهم دخل مميزة',
      calendar: 'تقويم التوزيعات',
      news: 'الأخبار',
      education: 'الدليل التعليمي',
    },
    tickerTitle: 'شريط أسهم الدخل المرتفع',
    tickerDescription: 'رموز أسهم الدخل المرتفع المطلوبة مع عرض غير متاح عند غياب السعر.',
    snapshotTitle: 'ملخص أسهم الدخل المرتفع',
    snapshotDescription: 'ملخص سريع للتغطية والعائد وجودة البيانات المتاحة من المزود.',
    trackedCompanies: 'شركات مراقبة',
    averageYield: 'متوسط العائد',
    upcomingEvents: 'أحداث قادمة',
    averagePayout: 'متوسط نسبة الدفع',
    marketsCovered: 'الأسواق المغطاة',
    dataQuality: 'جودة البيانات',
    explorerTitle: 'مستكشف أسهم الدخل المرتفع',
    explorerDescription: 'جدول مقارنة عملي لأسهم الدخل المرتفع المتاحة من مزود البيانات، مع إظهار القيم غير المتوفرة بوضوح.',
    featuredTitle: 'أسهم دخل مرتفع مميزة',
    featuredDescription: 'أسهم بارزة وفق معايير تحليلية تعتمد فقط على العائد ونسبة الدفع والتواريخ المتوفرة من المزود.',
    calendarTitle: 'تقويم التوزيعات',
    calendarDescription: 'تمييز واضح بين تاريخ الاستحقاق وتاريخ الدفع عند توفرهما من المصدر.',
    newsTitle: 'أخبار أسهم الدخل المرتفع',
    newsDescription: 'أخبار مرتبطة بالتوزيعات، العوائد المرتفعة، أرباح الشركات، القطاعات الدفاعية، الاتصالات، المرافق، الطاقة، وREITs.',
    newsFiltersTitle: 'البحث والتصفية',
    newsFiltersDescription: 'صفّ الأخبار حسب البحث، الشركة أو الرمز، القطاع، المصدر، التأثير، التاريخ، ونوع الخبر.',
    newsResultsTitle: 'نتائج الأخبار',
    newsResultsDescription: 'بطاقات أخبار مدمجة من مزودي البيانات الحقيقيين فقط.',
    educationTitle: 'الدليل التعليمي للتوزيعات',
    educationDescription: 'تعلم المفاهيم الأساسية في بطاقات مختصرة قابلة للفتح عند الحاجة.',
    strategyTitle: 'نمو التوزيعات مقابل الدخل المرتفع',
    strategyDescription: 'مقارنة تعليمية تساعد على فصل استراتيجية الدخل الحالي عن نمو الدخل المستقبلي.',
    searchPlaceholder: 'ابحث عن شركة أو رمز...',
    newsSearchPlaceholder: 'ابحث في أخبار أسهم الدخل المرتفع...',
    search: 'البحث',
    sector: 'القطاع',
    allSectors: 'كل القطاعات',
    market: 'السوق',
    allMarkets: 'كل الأسواق المدعومة',
    yieldMin: 'أقل عائد',
    payoutMax: 'أقصى نسبة دفع',
    sort: 'الترتيب',
    clearFilters: 'مسح عوامل التصفية',
    resultCount: 'عدد النتائج',
    methodology: 'المنهجية',
    score: 'الدرجة',
    reason: 'سبب الاختيار',
    dataDate: 'تاريخ البيانات',
    highYieldWarning: 'قد يعكس العائد المرتفع انخفاضاً في سعر السهم أو مخاطر تتعلق باستدامة التوزيعات.',
    methodologyBody: 'تستخدم الدرجة حقولاً حقيقية فقط: عائد التوزيعات، نسبة الدفع، توفر تاريخ الاستحقاق/الدفع، والزخم السعري كمؤشر مساعد. عند نقص البيانات لا يتم إنشاء درجة وهمية.',
    lowRisk: 'منخفض',
    mediumRisk: 'متوسط',
    highRisk: 'مرتفع',
    unknownRisk: 'غير محدد',
    sustainablePayout: 'نسبة دفع مريحة',
    elevatedPayout: 'نسبة دفع مرتفعة',
    payoutUnavailable: 'نسبة الدفع غير متاحة',
    yieldAvailable: 'عائد متوفر من المزود',
    datesAvailable: 'تواريخ توزيعات متوفرة',
    balancedMetrics: 'عائد ونسبة دفع متوازنان',
    insufficientMetrics: 'بيانات غير كافية للتقييم',
    insufficientDividendData: 'لا توجد بيانات توزيعات كافية لهذا السهم حالياً',
    company: 'الشركة',
    symbol: 'الرمز',
    exchange: 'السوق / البورصة',
    currentPrice: 'السعر الحالي',
    dividendPerShare: 'التوزيع السنوي',
    dividendYield: 'عائد التوزيعات',
    payoutRatio: 'نسبة الدفع',
    dividendGrowth: 'نمو التوزيعات',
    paymentFrequency: 'تكرار الدفع',
    exDividendDate: 'تاريخ الاستحقاق',
    paymentDate: 'تاريخ الدفع',
    riskLevel: 'مستوى المخاطر',
    action: 'إجراء',
    viewDetails: 'عرض التفاصيل',
    viewDetailsAriaPrefix: 'عرض تفاصيل سهم',
    detailsTitle: 'تفاصيل سهم التوزيعات',
    detailsLoading: 'جاري فتح التفاصيل...',
    detailsUnavailable: 'تعذر جلب تفاصيل هذا السهم حالياً.',
    closeDetails: 'إغلاق التفاصيل',
    currency: 'العملة',
    dividendStatus: 'جودة / حالة التوزيعات',
    disclaimer: 'تنبيه',
    addWatchlist: 'إضافة للمراقبة',
    notSupportedMetric: 'غير متاح من مزود البيانات الحالي',
    annual: 'سنوي',
    eventEx: 'استحقاق التوزيع',
    eventPayment: 'دفع التوزيع',
    eventType: 'نوع التوزيع',
    recordDate: 'تاريخ التسجيل',
    declarationDate: 'تاريخ الإعلان',
    dividendAmount: 'قيمة التوزيع',
    providerStatus: 'حالة المزود',
    dividendProvider: 'مزود التوزيعات',
    connectionStatus: 'حالة الاتصال',
    connectedStatus: 'متصل',
    failedStatus: 'فشل',
    unconfiguredStatus: 'غير مهيأ',
    providerEventsCount: 'عدد الأحداث',
    stocksWithPaymentDate: 'عدد الأسهم التي لديها تاريخ دفع',
    unavailableValuesCount: 'عدد القيم غير المتاحة',
    latestDividendAvailable: 'آخر توزيع متاح',
    providerRateLimited: 'تم تجاوز حد مزود البيانات حالياً.',
    providerAccessDenied: 'تعذر الوصول إلى مزود البيانات. تحقق من صلاحية مفتاح FMP أو الخطة.',
    providerConfigured: 'المزود متصل',
    providerNotConfiguredBadge: 'غير متصل',
    providerErrorBadge: 'خطأ في المزود',
    statusAnnounced: 'معلن',
    statusScheduled: 'مجدول',
    statusEstimated: 'تقديري',
    calendarUnavailableTitle: 'تقويم التوزيعات غير متوفر حالياً',
    calendarUnavailableText: 'لم يتم ربط مزود بيانات يدعم تقويم التوزيعات بعد.',
    calendarErrorTitle: 'تعذر جلب بيانات التوزيعات حالياً',
    calendarErrorText: 'حاول مرة أخرى بعد قليل.',
    noCalendarEventsFiltered: 'لا توجد توزيعات ضمن الفترة المحددة.',
    noCalendarTextFiltered: 'جرّب تغيير الفترة أو إزالة بعض عوامل التصفية.',
    allTypes: 'كل أنواع التوزيعات',
    allSymbols: 'كل الرموز',
    allSources: 'كل المصادر',
    range30: '30 يوماً',
    range90: '90 يوماً',
    rangeAll: 'كل الأحداث',
    noCalendarEvents: 'لا توجد أحداث توزيعات ضمن الفترة المحددة',
    noCalendarText: 'جرّب تغيير الفترة الزمنية أو السوق أو إزالة بعض عوامل التصفية.',
    noStocks: 'لم يتم العثور على أسهم مطابقة',
    noStocksText: 'جرّب تعديل معايير العائد أو السوق أو القطاع.',
    noNews: 'لا توجد أخبار متاحة حالياً لأسهم الدخل المرتفع.',
    noNewsBody: 'سيتم عرض الأخبار عند توفرها من مزود البيانات.',
    retry: 'إعادة المحاولة',
    latest: 'الأحدث',
    oldest: 'الأقدم',
    strongestMove: 'أقوى حركة مرتبطة',
    highestYield: 'أعلى عائد',
    qualitySort: 'أفضل جودة بيانات',
    payoutSort: 'نسبة الدفع الأقل',
    exDateSort: 'أقرب استحقاق',
    nameSort: 'الاسم',
    changeSort: 'أقوى حركة',
    sourceFilter: 'المصدر',
    symbolFilter: 'الشركة / الرمز',
    impactFilter: 'التأثير',
    dateFilter: 'التاريخ',
    timeRange: 'التاريخ',
    newsTypeFilter: 'نوع الخبر',
    allImpacts: 'كل مستويات التأثير',
    highImpact: 'مرتفع',
    mediumImpact: 'متوسط',
    lowImpact: 'منخفض',
    unavailableImpact: 'غير متاح',
    allNewsTypes: 'كل أنواع الأخبار',
    newsTypeDividends: 'توزيعات الأرباح',
    newsTypeHighYield: 'عوائد مرتفعة',
    newsTypeEarnings: 'أرباح الشركات',
    newsTypeFixedIncome: 'دخل ثابت',
    newsTypeDefensive: 'أسهم دفاعية',
    newsTypeTelecom: 'اتصالات',
    newsTypeUtilities: 'مرافق',
    newsTypeEnergy: 'طاقة',
    newsTypeReits: 'عقارات REITs',
    newsTypeConsumerStaples: 'سلع استهلاكية',
    publishedDate: 'تاريخ النشر',
    providerLabel: 'المزود',
    companyName: 'اسم الشركة',
    impactLevel: 'مستوى التأثير',
    allTime: 'كل الفترات',
    lastDay: 'آخر 24 ساعة',
    lastWeek: 'آخر 7 أيام',
    lastMonth: 'آخر 30 يوماً',
    readArticle: 'قراءة الخبر',
    originalText: 'عرض النص الأصلي',
    translatedText: 'عرض الترجمة',
    machineTranslation: 'ترجمة آلية',
    relatedSymbol: 'الرمز المرتبط',
    marketContext: 'حركة السهم المرتبط',
    showAllNews: 'عرض جميع الأخبار',
    fullGuide: 'عرض الدليل الكامل',
    loadMore: 'عرض المزيد',
    incomeGrowth: 'أسهم نمو التوزيعات',
    highIncome: 'أسهم الدخل المرتفع',
    typicalYield: 'العائد المعتاد',
    payoutProfile: 'نسبة الدفع',
    volatility: 'التذبذب',
    horizon: 'الأفق المناسب',
    coreRisk: 'الخطر الرئيسي',
    incomeGrowthBody: 'تركز على الشركات التي ترفع التوزيعات تدريجياً وتوازن بين الدخل والنمو.',
    highIncomeBody: 'تركز على الدخل الحالي المرتفع، لكنها تحتاج مراجعة استدامة العائد ونسبة الدفع.',
    education: {
      basics: 'ما هي أسهم التوزيعات؟',
      yield: 'كيف يُقرأ عائد التوزيعات؟',
      payout: 'ما معنى نسبة الدفع؟',
      dates: 'الاستحقاق، التسجيل، والدفع',
      growth: 'نمو التوزيعات',
      safety: 'استدامة التوزيعات',
      reits: 'توزيعات REIT',
      tax: 'اعتبارات ضريبية',
      mistakes: 'أخطاء شائعة',
    },
    educationBody: {
      basics: 'هي أسهم شركات توزع جزءاً من أرباحها أو تدفقاتها النقدية على المساهمين بصورة دورية، وقد تجمع بين دخل نقدي واستقرار نسبي.',
      yield: 'العائد = التوزيع السنوي مقسوماً على السعر. العائد المرتفع وحده لا يعني جودة السهم.',
      payout: 'نسبة الدفع تقارن التوزيعات بالأرباح. النسبة المرتفعة جداً قد تشير إلى ضغط على الاستدامة.',
      dates: 'تاريخ الاستحقاق يحدد أهلية المستثمر للتوزيع، بينما تاريخ الدفع هو موعد وصول التوزيع النقدي.',
      growth: 'نمو التوزيعات يقيس قدرة الشركة على رفع الدخل للمساهمين بمرور الوقت.',
      safety: 'استدامة التوزيع ترتبط بالأرباح، التدفق النقدي، الدين، ودورات القطاع.',
      reits: 'صناديق العقار قد تقدم عوائد مرتفعة، لكن تتأثر بالفائدة، الإشغال، وهيكل الدين.',
      tax: 'معاملة التوزيعات الضريبية تختلف حسب السوق، نوع الأصل، وموقع المستثمر.',
      mistakes: 'من الأخطاء مطاردة العائد الأعلى فقط أو الخلط بين تاريخ الاستحقاق وتاريخ الدفع.',
    },
    legal: 'البيانات والتصنيفات والمقارنات المعروضة لأغراض تعليمية ومعلوماتية فقط، ولا تُعد نصيحة استثمارية أو توصية بشراء أو بيع أي سهم. قد تتغير التوزيعات أو يتم تخفيضها أو إيقافها، ويتحمل المستخدم مسؤولية قراراته الاستثمارية.',
    aiNotice: 'قد تتضمن بعض التصنيفات والملخصات نتائج تم إنشاؤها آلياً.',
    providerError: 'تعذر تحديث البيانات حالياً. يتم عرض آخر بيانات متاحة إن وجدت.',
  },
  en: {
    badge: 'High income stocks',
    title: 'High Income Stocks News',
    subtitle: 'Track real provider news and quotes for higher-income, dividend-focused companies, with clear unavailable states when data is missing.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    connected: 'Market data connected',
    partial: 'Partial data',
    delayed: 'Quotes may be delayed by provider',
    lastUpdate: 'Last update',
    quoteUpdate: 'Quote update',
    newsUpdate: 'News update',
    provider: 'Provider',
    source: 'Source',
    unavailable: 'Unavailable',
    tabs: { overview: 'Overview', explorer: 'Stock Explorer', featured: 'Featured Income Stocks', calendar: 'Dividend Calendar', news: 'News', education: 'Education' },
    tickerTitle: 'High income stocks ticker',
    tickerDescription: 'Requested high-income symbols remain visible, even when live quotes are unavailable.',
    snapshotTitle: 'High income stocks summary',
    snapshotDescription: 'Quick summary of coverage, yield, and provider data quality.',
    trackedCompanies: 'Tracked companies',
    averageYield: 'Average yield',
    upcomingEvents: 'Upcoming events',
    averagePayout: 'Average payout',
    marketsCovered: 'Markets covered',
    dataQuality: 'Data quality',
    explorerTitle: 'High income stock explorer',
    explorerDescription: 'A practical comparison table using real provider fields. Missing metrics remain clearly unavailable.',
    featuredTitle: 'Featured high income stocks',
    featuredDescription: 'Analytical highlights based only on available yield, payout, and dividend-date fields.',
    calendarTitle: 'Dividend calendar',
    calendarDescription: 'Clearly separates ex-dividend dates from payment dates when provided by the source.',
    newsTitle: 'High Income Stocks News',
    newsDescription: 'News around dividends, high yields, corporate earnings, defensive sectors, telecom, utilities, energy, and REITs.',
    newsFiltersTitle: 'Search and filters',
    newsFiltersDescription: 'Filter news by search, company or symbol, sector, source, impact, date, and news type.',
    newsResultsTitle: 'News results',
    newsResultsDescription: 'Compact cards from real news providers only.',
    educationTitle: 'Dividend education guide',
    educationDescription: 'Concise lessons that stay collapsed until needed.',
    strategyTitle: 'Dividend growth versus high income',
    strategyDescription: 'Educational comparison between current income and future income growth.',
    searchPlaceholder: 'Search company or symbol...',
    newsSearchPlaceholder: 'Search high income stocks news...',
    search: 'Search',
    sector: 'Sector',
    allSectors: 'All sectors',
    market: 'Market',
    allMarkets: 'Supported markets',
    yieldMin: 'Minimum yield',
    payoutMax: 'Maximum payout',
    sort: 'Sort',
    clearFilters: 'Clear filters',
    resultCount: 'Results',
    methodology: 'Methodology',
    score: 'Score',
    reason: 'Selection reason',
    dataDate: 'Data date',
    highYieldWarning: 'A high yield may reflect price declines or dividend sustainability risk.',
    methodologyBody: 'The score uses only real fields: dividend yield, payout ratio, available ex/payment dates, and price momentum as a secondary signal. No score is created when inputs are missing.',
    lowRisk: 'Low',
    mediumRisk: 'Medium',
    highRisk: 'High',
    unknownRisk: 'Unclassified',
    sustainablePayout: 'Comfortable payout',
    elevatedPayout: 'Elevated payout',
    payoutUnavailable: 'Payout unavailable',
    yieldAvailable: 'Provider yield available',
    datesAvailable: 'Dividend dates available',
    balancedMetrics: 'Balanced yield and payout',
    insufficientMetrics: 'Insufficient data',
    insufficientDividendData: 'Not enough dividend data for this stock right now',
    company: 'Company',
    symbol: 'Symbol',
    exchange: 'Market / exchange',
    currentPrice: 'Current price',
    dividendPerShare: 'Annual dividend',
    dividendYield: 'Dividend yield',
    payoutRatio: 'Payout ratio',
    dividendGrowth: 'Dividend growth',
    paymentFrequency: 'Payment frequency',
    exDividendDate: 'Ex-dividend date',
    paymentDate: 'Payment date',
    riskLevel: 'Risk level',
    action: 'Action',
    viewDetails: 'View details',
    viewDetailsAriaPrefix: 'View details for stock',
    detailsTitle: 'Dividend stock details',
    detailsLoading: 'Opening details...',
    detailsUnavailable: 'Unable to fetch this stock details right now.',
    closeDetails: 'Close details',
    currency: 'Currency',
    dividendStatus: 'Dividend quality / status',
    disclaimer: 'Disclaimer',
    addWatchlist: 'Add to watchlist',
    notSupportedMetric: 'Unavailable from current provider',
    annual: 'Annual',
    eventEx: 'Ex-dividend',
    eventPayment: 'Payment',
    eventType: 'Dividend type',
    recordDate: 'Record date',
    declarationDate: 'Declaration date',
    dividendAmount: 'Dividend amount',
    providerStatus: 'Provider status',
    dividendProvider: 'Dividend provider',
    connectionStatus: 'Connection status',
    connectedStatus: 'Connected',
    failedStatus: 'Failed',
    unconfiguredStatus: 'Not configured',
    providerEventsCount: 'Event count',
    stocksWithPaymentDate: 'Stocks with payment date',
    unavailableValuesCount: 'Unavailable values',
    latestDividendAvailable: 'Latest available dividend',
    providerRateLimited: 'The dividend data provider rate limit has been reached.',
    providerAccessDenied: 'The dividend provider could not be accessed. Check the FMP key or plan.',
    providerConfigured: 'Provider configured',
    providerNotConfiguredBadge: 'Not configured',
    providerErrorBadge: 'Provider error',
    statusAnnounced: 'Announced',
    statusScheduled: 'Scheduled',
    statusEstimated: 'Estimated',
    calendarUnavailableTitle: 'Dividend calendar is currently unavailable',
    calendarUnavailableText: 'No data provider that supports the dividends calendar has been connected yet.',
    calendarErrorTitle: 'Unable to fetch dividend data right now',
    calendarErrorText: 'Please try again shortly.',
    noCalendarEventsFiltered: 'No dividends in the selected period.',
    noCalendarTextFiltered: 'Try changing the period or removing some filters.',
    allTypes: 'All dividend types',
    allSymbols: 'All symbols',
    allSources: 'All sources',
    range30: '30 days',
    range90: '90 days',
    rangeAll: 'All events',
    noCalendarEvents: 'No dividend events in the selected period',
    noCalendarText: 'Try changing the date range, market, or filters.',
    noStocks: 'No matching dividend stocks',
    noStocksText: 'Adjust yield, market, or sector filters.',
    noNews: 'No high income stocks news is currently available.',
    noNewsBody: 'News will be shown when it becomes available from the data provider.',
    retry: 'Retry',
    latest: 'Latest',
    oldest: 'Oldest',
    strongestMove: 'Strongest related move',
    highestYield: 'Highest yield',
    qualitySort: 'Best data quality',
    payoutSort: 'Lowest payout',
    exDateSort: 'Nearest ex-date',
    nameSort: 'Name',
    changeSort: 'Strongest move',
    sourceFilter: 'Source',
    symbolFilter: 'Company / symbol',
    impactFilter: 'Impact',
    dateFilter: 'Date',
    timeRange: 'Date',
    newsTypeFilter: 'News type',
    allImpacts: 'All impact levels',
    highImpact: 'High',
    mediumImpact: 'Medium',
    lowImpact: 'Low',
    unavailableImpact: 'Unavailable',
    allNewsTypes: 'All news types',
    newsTypeDividends: 'Dividends',
    newsTypeHighYield: 'High yields',
    newsTypeEarnings: 'Corporate earnings',
    newsTypeFixedIncome: 'Fixed income',
    newsTypeDefensive: 'Defensive stocks',
    newsTypeTelecom: 'Telecom',
    newsTypeUtilities: 'Utilities',
    newsTypeEnergy: 'Energy',
    newsTypeReits: 'Real estate REITs',
    newsTypeConsumerStaples: 'Consumer staples',
    publishedDate: 'Published date',
    providerLabel: 'Provider',
    companyName: 'Company name',
    impactLevel: 'Impact level',
    allTime: 'All time',
    lastDay: 'Last 24 hours',
    lastWeek: 'Last 7 days',
    lastMonth: 'Last 30 days',
    readArticle: 'Read article',
    originalText: 'Show original',
    translatedText: 'Show translation',
    machineTranslation: 'Machine translation',
    relatedSymbol: 'Related symbol',
    marketContext: 'Related stock move',
    showAllNews: 'View all news',
    fullGuide: 'Open full guide',
    loadMore: 'Load more',
    incomeGrowth: 'Dividend growth stocks',
    highIncome: 'High-income stocks',
    typicalYield: 'Typical yield',
    payoutProfile: 'Payout profile',
    volatility: 'Volatility',
    horizon: 'Horizon',
    coreRisk: 'Main risk',
    incomeGrowthBody: 'Focuses on companies gradually raising dividends while balancing income and growth.',
    highIncomeBody: 'Focuses on current income, but requires sustainability checks.',
    education: {
      basics: 'What are dividend stocks?',
      yield: 'How to read dividend yield',
      payout: 'What payout ratio means',
      dates: 'Ex, record, and payment dates',
      growth: 'Dividend growth',
      safety: 'Dividend safety',
      reits: 'REIT distributions',
      tax: 'Tax considerations',
      mistakes: 'Common mistakes',
    },
    educationBody: {
      basics: 'Companies that distribute a portion of earnings or cash flow to shareholders on a recurring basis.',
      yield: 'Yield equals annual dividend divided by price. High yield alone does not mean quality.',
      payout: 'Payout compares dividends with earnings. A very high payout can pressure sustainability.',
      dates: 'The ex-date determines eligibility; the payment date is when cash is paid.',
      growth: 'Dividend growth measures the company’s ability to raise shareholder income over time.',
      safety: 'Safety depends on earnings, cash flow, debt, and sector cycles.',
      reits: 'REITs can offer high income but are sensitive to rates and leverage.',
      tax: 'Dividend taxation varies by market, asset type, and investor location.',
      mistakes: 'Chasing the highest yield and mixing ex-date with payment date are common mistakes.',
    },
    legal: 'Data, classifications, and comparisons are educational only and are not investment advice or a buy/sell recommendation. Dividends may change, be reduced, or suspended.',
    aiNotice: 'Some labels and summaries may be generated automatically.',
    providerError: 'Unable to refresh data right now. Showing latest available data when present.',
  },
  fr: {
    badge: 'Actions à revenu élevé',
    title: 'Actualités des actions à revenu élevé',
    subtitle: 'Suivez les actualités et cours réels des sociétés orientées revenu élevé, avec des états indisponibles clairs si les données manquent.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    connected: 'Données connectées',
    partial: 'Données partielles',
    delayed: 'Les cours peuvent être retardés',
    lastUpdate: 'Dernière mise à jour',
    quoteUpdate: 'Cours',
    newsUpdate: 'Actualités',
    provider: 'Fournisseur',
    source: 'Source',
    unavailable: 'Indisponible',
    tabs: { overview: 'Vue générale', explorer: 'Explorateur', featured: 'Actions revenu', calendar: 'Calendrier', news: 'Actualités', education: 'Éducation' },
    tickerTitle: 'Bandeau actions à revenu élevé',
    tickerDescription: 'Les symboles suivis restent visibles même si les cours sont indisponibles.',
    snapshotTitle: 'Résumé des actions à revenu élevé',
    snapshotDescription: 'Résumé rapide de la couverture, du rendement et de la qualité des données.',
    trackedCompanies: 'Sociétés suivies',
    averageYield: 'Rendement moyen',
    upcomingEvents: 'Événements à venir',
    averagePayout: 'Payout moyen',
    marketsCovered: 'Marchés couverts',
    dataQuality: 'Qualité données',
    explorerTitle: 'Explorateur actions à revenu élevé',
    explorerDescription: 'Table de comparaison avec les champs réels disponibles.',
    featuredTitle: 'Actions à revenu élevé en vedette',
    featuredDescription: 'Sélection analytique basée sur rendement, payout et dates disponibles.',
    calendarTitle: 'Calendrier des dividendes',
    calendarDescription: 'Sépare clairement date ex-dividende et date de paiement.',
    newsTitle: 'Actualités des actions à revenu élevé',
    newsDescription: 'Actualités sur dividendes, rendements élevés, résultats, secteurs défensifs, télécoms, services publics, énergie et REITs.',
    newsFiltersTitle: 'Recherche et filtres',
    newsFiltersDescription: 'Filtrez par recherche, société ou symbole, secteur, source, impact, date et type d’actualité.',
    newsResultsTitle: 'Résultats des actualités',
    newsResultsDescription: 'Cartes compactes issues uniquement de fournisseurs réels.',
    educationTitle: 'Guide des dividendes',
    educationDescription: 'Leçons concises et repliées par défaut.',
    strategyTitle: 'Croissance des dividendes et revenu élevé',
    strategyDescription: 'Comparaison éducative entre revenu actuel et croissance future.',
    searchPlaceholder: 'Rechercher société ou symbole...',
    newsSearchPlaceholder: 'Rechercher actualités...',
    search: 'Recherche',
    sector: 'Secteur',
    allSectors: 'Tous les secteurs',
    market: 'Marché',
    allMarkets: 'Marchés pris en charge',
    yieldMin: 'Rendement min.',
    payoutMax: 'Payout max.',
    sort: 'Tri',
    clearFilters: 'Effacer',
    resultCount: 'Résultats',
    methodology: 'Méthodologie',
    score: 'Score',
    reason: 'Raison',
    dataDate: 'Date des données',
    highYieldWarning: 'Un rendement élevé peut refléter une baisse du prix ou un risque de durabilité.',
    methodologyBody: 'Le score utilise uniquement rendement, payout, dates disponibles et momentum comme signal secondaire.',
    lowRisk: 'Faible',
    mediumRisk: 'Moyen',
    highRisk: 'Élevé',
    unknownRisk: 'Non classé',
    sustainablePayout: 'Payout confortable',
    elevatedPayout: 'Payout élevé',
    payoutUnavailable: 'Payout indisponible',
    yieldAvailable: 'Rendement disponible',
    datesAvailable: 'Dates disponibles',
    balancedMetrics: 'Rendement et payout équilibrés',
    insufficientMetrics: 'Données insuffisantes',
    insufficientDividendData: 'Données de dividende insuffisantes pour cette action',
    company: 'Société',
    symbol: 'Symbole',
    exchange: 'Marché / bourse',
    currentPrice: 'Prix',
    dividendPerShare: 'Dividende annuel',
    dividendYield: 'Rendement',
    payoutRatio: 'Payout',
    dividendGrowth: 'Croissance dividende',
    paymentFrequency: 'Fréquence',
    exDividendDate: 'Date ex-dividende',
    paymentDate: 'Date de paiement',
    riskLevel: 'Risque',
    action: 'Action',
    viewDetails: 'Voir détails',
    viewDetailsAriaPrefix: 'Voir les détails de l’action',
    detailsTitle: 'Détails de l’action à dividende',
    detailsLoading: 'Ouverture des détails...',
    detailsUnavailable: 'Impossible de récupérer les détails de cette action pour le moment.',
    closeDetails: 'Fermer les détails',
    currency: 'Devise',
    dividendStatus: 'Qualité / statut du dividende',
    disclaimer: 'Avertissement',
    addWatchlist: 'Ajouter',
    notSupportedMetric: 'Indisponible',
    annual: 'Annuel',
    eventEx: 'Ex-dividende',
    eventPayment: 'Paiement',
    eventType: 'Type de dividende',
    recordDate: 'Date d’enregistrement',
    declarationDate: 'Date d’annonce',
    dividendAmount: 'Montant du dividende',
    providerStatus: 'Statut du fournisseur',
    dividendProvider: 'Fournisseur dividendes',
    connectionStatus: 'Statut de connexion',
    connectedStatus: 'Connecte',
    failedStatus: 'Echec',
    unconfiguredStatus: 'Non configure',
    providerEventsCount: 'Nombre d evenements',
    stocksWithPaymentDate: 'Actions avec date de paiement',
    unavailableValuesCount: 'Valeurs indisponibles',
    latestDividendAvailable: 'Dernier dividende disponible',
    providerRateLimited: 'La limite du fournisseur de dividendes est atteinte.',
    providerAccessDenied: 'Le fournisseur de dividendes est inaccessible. Verifiez la cle ou le plan FMP.',
    providerConfigured: 'Fournisseur configuré',
    providerNotConfiguredBadge: 'Non configuré',
    providerErrorBadge: 'Erreur fournisseur',
    statusAnnounced: 'Annoncé',
    statusScheduled: 'Planifié',
    statusEstimated: 'Estimé',
    calendarUnavailableTitle: 'Calendrier des dividendes indisponible',
    calendarUnavailableText: 'Aucun fournisseur compatible avec le calendrier des dividendes n’est encore connecté.',
    calendarErrorTitle: 'Impossible de récupérer les dividendes',
    calendarErrorText: 'Réessayez dans quelques instants.',
    noCalendarEventsFiltered: 'Aucun dividende dans la période sélectionnée',
    noCalendarTextFiltered: 'Modifiez la période, le marché ou certains filtres.',
    allTypes: 'Tous les types',
    allSymbols: 'Tous les symboles',
    allSources: 'Toutes les sources',
    range30: '30 jours',
    range90: '90 jours',
    rangeAll: 'Tous',
    noCalendarEvents: 'Aucun événement dans la période',
    noCalendarText: 'Modifiez la période ou les filtres.',
    noStocks: 'Aucune action correspondante',
    noStocksText: 'Ajustez rendement, marché ou secteur.',
    noNews: 'Aucune actualité disponible pour les actions à revenu élevé.',
    noNewsBody: 'Les actualités seront affichées lorsqu’elles seront disponibles auprès du fournisseur de données.',
    retry: 'Réessayer',
    latest: 'Récentes',
    oldest: 'Anciennes',
    strongestMove: 'Plus forte variation',
    highestYield: 'Rendement le plus élevé',
    qualitySort: 'Meilleure qualité',
    payoutSort: 'Payout le plus bas',
    exDateSort: 'Date ex la plus proche',
    nameSort: 'Nom',
    changeSort: 'Variation',
    sourceFilter: 'Source',
    symbolFilter: 'Société / symbole',
    impactFilter: 'Impact',
    dateFilter: 'Date',
    timeRange: 'Date',
    newsTypeFilter: 'Type d’actualité',
    allImpacts: 'Tous les impacts',
    highImpact: 'Élevé',
    mediumImpact: 'Moyen',
    lowImpact: 'Faible',
    unavailableImpact: 'Indisponible',
    allNewsTypes: 'Tous les types',
    newsTypeDividends: 'Dividendes',
    newsTypeHighYield: 'Rendements élevés',
    newsTypeEarnings: 'Résultats',
    newsTypeFixedIncome: 'Revenu fixe',
    newsTypeDefensive: 'Actions défensives',
    newsTypeTelecom: 'Télécoms',
    newsTypeUtilities: 'Services publics',
    newsTypeEnergy: 'Énergie',
    newsTypeReits: 'Immobilier REITs',
    newsTypeConsumerStaples: 'Biens essentiels',
    publishedDate: 'Date de publication',
    providerLabel: 'Fournisseur',
    companyName: 'Société',
    impactLevel: 'Niveau d’impact',
    allTime: 'Toutes',
    lastDay: '24 h',
    lastWeek: '7 jours',
    lastMonth: '30 jours',
    readArticle: 'Lire',
    originalText: 'Texte original',
    translatedText: 'Traduction',
    machineTranslation: 'Traduction automatique',
    relatedSymbol: 'Symbole lié',
    marketContext: 'Mouvement lié',
    showAllNews: 'Toutes les actualités',
    fullGuide: 'Guide complet',
    loadMore: 'Afficher plus',
    incomeGrowth: 'Croissance du dividende',
    highIncome: 'Revenu élevé',
    typicalYield: 'Rendement typique',
    payoutProfile: 'Profil payout',
    volatility: 'Volatilité',
    horizon: 'Horizon',
    coreRisk: 'Risque principal',
    incomeGrowthBody: 'Entreprises augmentant progressivement les dividendes.',
    highIncomeBody: 'Revenu actuel élevé, mais durabilité à vérifier.',
    education: {
      basics: 'Que sont les actions à dividendes ?',
      yield: 'Lire le rendement',
      payout: 'Comprendre le payout',
      dates: 'Dates ex et paiement',
      growth: 'Croissance des dividendes',
      safety: 'Durabilité',
      reits: 'REIT',
      tax: 'Fiscalité',
      mistakes: 'Erreurs fréquentes',
    },
    educationBody: {
      basics: 'Sociétés distribuant périodiquement une partie des bénéfices ou flux de trésorerie.',
      yield: 'Rendement = dividende annuel / prix.',
      payout: 'Compare dividendes et bénéfices.',
      dates: 'La date ex détermine l’éligibilité; la date de paiement verse le cash.',
      growth: 'Mesure la capacité à augmenter le revenu.',
      safety: 'Dépend des bénéfices, flux, dette et cycle sectoriel.',
      reits: 'Les REIT peuvent offrir un revenu élevé mais sont sensibles aux taux.',
      tax: 'La fiscalité dépend du marché et du profil investisseur.',
      mistakes: 'Ne pas confondre rendement élevé et qualité.',
    },
    legal: 'Données et comparaisons à titre éducatif uniquement, sans conseil d’investissement.',
    aiNotice: 'Certains libellés peuvent être générés automatiquement.',
    providerError: 'Impossible d’actualiser les données.',
  },
} as const;

const SECTORS: Record<Exclude<SectorId, 'all'>, { icon: LucideIcon; labels: Record<LangCode, string>; symbols: string[]; description: Record<LangCode, string> }> = {
  consumer_goods: {
    icon: Coins,
    labels: { ar: 'سلع استهلاكية', en: 'Consumer staples', fr: 'Biens essentiels' },
    symbols: ['KO', 'PEP', 'PG', 'KMB', 'GIS', 'MCD', 'MO', 'PM'],
    description: { ar: 'شركات ذات طلب يومي نسبي وقدرة تاريخية على توزيع أرباح دورية.', en: 'Recurring-demand companies with a history of periodic distributions.', fr: 'Sociétés de demande récurrente avec dividendes.' },
  },
  energy: {
    icon: LineChart,
    labels: { ar: 'طاقة', en: 'Energy', fr: 'Énergie' },
    symbols: ['XOM', 'CVX'],
    description: { ar: 'توزيعات قد تكون قوية لكنها حساسة لدورات النفط والغاز.', en: 'Potentially strong distributions, sensitive to oil and gas cycles.', fr: 'Dividendes potentiels, sensibles aux cycles énergie.' },
  },
  banks: {
    icon: Building2,
    labels: { ar: 'البنوك والمال', en: 'Banks and financials', fr: 'Banques et finance' },
    symbols: [],
    description: { ar: 'تتأثر بجودة الائتمان والفائدة والتنظيم.', en: 'Affected by credit quality, rates, and regulation.', fr: 'Crédit, taux et réglementation.' },
  },
  telecom: {
    icon: WalletCards,
    labels: { ar: 'اتصالات', en: 'Telecom', fr: 'Télécoms' },
    symbols: ['VZ', 'T'],
    description: { ar: 'دخل دوري مع إنفاق رأسمالي مرتفع ومراقبة للديون.', en: 'Recurring income with high capex and debt monitoring.', fr: 'Revenu récurrent avec capex et dette.' },
  },
  utilities: {
    icon: ShieldCheck,
    labels: { ar: 'مرافق', en: 'Utilities', fr: 'Services publics' },
    symbols: ['NEE', 'DUK', 'SO'],
    description: { ar: 'قطاعات منظمة تميل إلى توزيعات مستقرة نسبياً.', en: 'Regulated sectors that often support steadier payouts.', fr: 'Secteurs régulés et dividendes stables.' },
  },
  reits: {
    icon: Building2,
    labels: { ar: 'عقارات REITs', en: 'Real estate REITs', fr: 'Immobilier REITs' },
    symbols: ['O'],
    description: { ar: 'توزيعات عقارية تتأثر بالفائدة والإشغال والرافعة.', en: 'Real-estate income affected by rates, occupancy, and leverage.', fr: 'Revenu immobilier sensible aux taux.' },
  },
  healthcare: {
    icon: BookOpen,
    labels: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' },
    symbols: ['JNJ', 'PFE', 'ABBV'],
    description: { ar: 'تدفقات نقدية صحية مع مخاطر تنظيم وبراءات.', en: 'Healthcare cash flows with regulatory and patent risks.', fr: 'Flux santé avec risques réglementaires.' },
  },
  industrials: {
    icon: Layers3,
    labels: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' },
    symbols: ['MMM'],
    description: { ar: 'شركات دورية جزئياً وقد ترتبط توزيعاتها بدورة الأعمال.', en: 'Partly cyclical companies tied to business cycles.', fr: 'Sociétés partiellement cycliques.' },
  },
  technology: {
    icon: BarChart3,
    labels: { ar: 'تقنية ذات توزيعات', en: 'Dividend technology', fr: 'Technologie à dividendes' },
    symbols: ['IBM'],
    description: { ar: 'شركات تقنية ناضجة تجمع بين النقدية والتوزيعات.', en: 'Mature technology companies with cash flow and dividends.', fr: 'Technologie mature avec dividendes.' },
  },
};

const TAB_IDS: DividendTab[] = ['overview', 'explorer', 'featured', 'calendar', 'news', 'education'];
const LOCALE_BY_LANG: Record<LangCode, string> = { ar: 'ar-KW-u-nu-latn', en: 'en-US', fr: 'fr-FR' };
const NEWS_INITIAL_LIMIT = 6;
const NEWS_PAGE_SIZE = 8;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const STOCK_SECTOR = Object.entries(SECTORS).reduce((acc, [sectorId, sector]) => {
  sector.symbols.forEach(symbol => {
    acc[symbol] = sectorId as Exclude<SectorId, 'all'>;
  });
  return acc;
}, {} as Record<string, Exclude<SectorId, 'all'>>);

function getLang(lang: string): LangCode {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

function sectorForSymbol(symbol: string): Exclude<SectorId, 'all'> {
  return STOCK_SECTOR[symbol.toUpperCase()] ?? 'consumer_goods';
}

function sectorLabel(id: SectorId, lang: LangCode) {
  if (id === 'all') return COPY[lang].allSectors;
  return SECTORS[id].labels[lang];
}

function normalizeRatioToPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function hasNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasDate(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function hasDividendData(row: Pick<DividendTickerItem, 'dividendYield' | 'payoutRatio' | 'annualDividend' | 'exDividendDate' | 'paymentDate' | 'recordDate' | 'declarationDate'>) {
  return normalizeRatioToPercent(row.dividendYield) !== null
    || normalizeRatioToPercent(row.payoutRatio) !== null
    || hasNumber(row.annualDividend)
    || hasDate(row.exDividendDate)
    || hasDate(row.paymentDate)
    || hasDate(row.recordDate)
    || hasDate(row.declarationDate);
}

function unavailableDividendFieldCount(row: DividendTickerItem) {
  const fields = [
    normalizeRatioToPercent(row.dividendYield),
    row.annualDividend,
    row.exDividendDate,
    row.recordDate,
    row.paymentDate,
    row.declarationDate,
  ];
  return fields.filter(value => {
    if (typeof value === 'number') return !Number.isFinite(value);
    if (typeof value === 'string') return !hasDate(value);
    return true;
  }).length;
}

function formatNumber(value: number | null | undefined, lang: LangCode, options?: Intl.NumberFormatOptions) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  return new Intl.NumberFormat(LOCALE_BY_LANG[lang], options).format(value);
}

function formatPercent(value: number | null | undefined, lang: LangCode, normalize = false) {
  const normalized = normalize ? normalizeRatioToPercent(value) : value;
  if (typeof normalized !== 'number' || !Number.isFinite(normalized)) return COPY[lang].unavailable;
  const sign = !normalize && normalized > 0 ? '+' : '';
  return `${sign}${formatNumber(normalized, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined, lang: LangCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  try {
    return new Intl.NumberFormat(LOCALE_BY_LANG[lang], {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value < 10 ? 2 : 2,
      maximumFractionDigits: value < 10 ? 3 : 2,
    }).format(value);
  } catch {
    return `${formatNumber(value, lang, { maximumFractionDigits: 2 })} ${currency ?? 'USD'}`;
  }
}

function formatDate(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].unavailable;
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], { dateStyle: 'medium', timeZone: 'Asia/Kuwait' }).format(date);
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
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_BY_LANG[lang], { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) return rtf.format(diffHours, 'hour');
  return rtf.format(Math.round(diffHours / 24), 'day');
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

function dedupeNews(items: DividendNewsItem[]) {
  const seen = new Set<string>();
  const result: DividendNewsItem[] = [];
  for (const item of items) {
    const url = safeUrl(item.url);
    const title = normalizeTitle(item.titleOriginal || item.title || item.headline);
    const key = url ? `url:${url}` : item.id ? `id:${item.id}` : `${item.source}:${title}`;
    if (!url && !title) continue;
    if (seen.has(key) || seen.has(`title:${title}`)) continue;
    seen.add(key);
    if (title) seen.add(`title:${title}`);
    result.push(item);
  }
  return result;
}

function toneForChange(value: number | null | undefined): Tone {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
  if (value > 0.15) return 'positive';
  if (value < -0.15) return 'negative';
  return 'neutral';
}

function riskFor(row: DividendTickerItem, lang: LangCode): { label: string; tone: Tone } {
  const yieldPct = normalizeRatioToPercent(row.dividendYield);
  const payoutPct = normalizeRatioToPercent(row.payoutRatio);
  if (payoutPct === null && yieldPct === null) return { label: COPY[lang].unknownRisk, tone: 'neutral' };
  if ((payoutPct !== null && payoutPct > 100) || (yieldPct !== null && yieldPct >= 8)) return { label: COPY[lang].highRisk, tone: 'negative' };
  if ((payoutPct !== null && payoutPct > 75) || (yieldPct !== null && yieldPct >= 6)) return { label: COPY[lang].mediumRisk, tone: 'warning' };
  return { label: COPY[lang].lowRisk, tone: 'positive' };
}

function qualityFor(row: DividendTickerItem, lang: LangCode): { score: number | null; label: string; reason: string } {
  const yieldPct = normalizeRatioToPercent(row.dividendYield);
  const payoutPct = normalizeRatioToPercent(row.payoutRatio);
  if (yieldPct === null && payoutPct === null) {
    return { score: null, label: COPY[lang].insufficientMetrics, reason: COPY[lang].insufficientMetrics };
  }

  let score = 0;
  const reasons: string[] = [];

  if (yieldPct !== null) {
    const yieldScore = yieldPct >= 2 && yieldPct <= 6 ? 34 : yieldPct > 0 && yieldPct < 8 ? 24 : 12;
    score += yieldScore;
    reasons.push(COPY[lang].yieldAvailable);
  }
  if (payoutPct !== null) {
    const payoutScore = payoutPct <= 65 ? 34 : payoutPct <= 85 ? 22 : 8;
    score += payoutScore;
    reasons.push(payoutPct <= 65 ? COPY[lang].sustainablePayout : COPY[lang].elevatedPayout);
  }
  if (row.exDividendDate || row.paymentDate || row.recordDate || row.declarationDate) {
    score += 18;
    reasons.push(COPY[lang].datesAvailable);
  }
  if (typeof row.changePercent === 'number' && Number.isFinite(row.changePercent) && row.changePercent >= 0) {
    score += 8;
  }
  const cappedScore = Math.min(100, score);
  const label = payoutPct !== null && payoutPct <= 65 && yieldPct !== null && yieldPct >= 2 && yieldPct <= 6
    ? COPY[lang].balancedMetrics
    : reasons[0] ?? COPY[lang].insufficientMetrics;
  return { score: cappedScore, label, reason: reasons.join(' · ') || COPY[lang].insufficientMetrics };
}

function buildStockRows(items: DividendTickerItem[], lang: LangCode): DividendStockRow[] {
  return items.map(item => {
    const sectorId = sectorForSymbol(item.symbol);
    const risk = riskFor(item, lang);
    const quality = qualityFor(item, lang);
    const payoutPct = normalizeRatioToPercent(item.payoutRatio);
    return {
      ...item,
      sectorId,
      sectorLabel: sectorLabel(sectorId, lang),
      riskLabel: risk.label,
      riskTone: risk.tone,
      qualityScore: quality.score,
      qualityLabel: quality.label,
      selectionReason: quality.reason,
      payoutQuality: payoutPct === null ? COPY[lang].payoutUnavailable : payoutPct <= 65 ? COPY[lang].sustainablePayout : COPY[lang].elevatedPayout,
      highYieldWarning: (normalizeRatioToPercent(item.dividendYield) ?? 0) >= 8,
    };
  });
}

function newsSector(item: DividendNewsItem): SectorId {
  const symbol = item.ticker?.toUpperCase();
  if (symbol && STOCK_SECTOR[symbol]) return STOCK_SECTOR[symbol];
  const text = `${item.title ?? ''} ${item.summary ?? ''} ${item.sector ?? ''} ${(item.sectors ?? []).join(' ')}`.toLowerCase();
  if (/energy|oil|gas|exxon|chevron|طاقة/.test(text)) return 'energy';
  if (/utility|utilities|electric|مرافق/.test(text)) return 'utilities';
  if (/telecom|wireless|verizon|at&t|اتصالات/.test(text)) return 'telecom';
  if (/reit|realty|real estate|عقار/.test(text)) return 'reits';
  if (/health|pharma|drug|صحة/.test(text)) return 'healthcare';
  if (/bank|financial|بنك/.test(text)) return 'banks';
  if (/tech|ibm|technology|تقنية/.test(text)) return 'technology';
  if (/industrial|manufacturing|صناعة/.test(text)) return 'industrials';
  return 'consumer_goods';
}

function newsText(item: DividendNewsItem) {
  return [
    item.title,
    item.headline,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    item.companyName,
    item.ticker,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function newsImpact(item: DividendNewsItem): NewsImpactFilter {
  if (typeof item.changePercent !== 'number' || !Number.isFinite(item.changePercent)) return 'unavailable';
  const absoluteMove = Math.abs(item.changePercent);
  if (absoluteMove >= 3) return 'high';
  if (absoluteMove >= 1) return 'medium';
  return 'low';
}

function newsImpactLabel(impact: NewsImpactFilter, text: typeof COPY[LangCode]) {
  if (impact === 'high') return text.highImpact;
  if (impact === 'medium') return text.mediumImpact;
  if (impact === 'low') return text.lowImpact;
  if (impact === 'unavailable') return text.unavailableImpact;
  return text.allImpacts;
}

function newsProvider(item: DividendNewsItem) {
  if (item.provider) return item.provider;
  const source = item.source.toLowerCase();
  if (source.includes('yahoo')) return 'Yahoo Finance';
  if (source.includes('google')) return 'Google News';
  return 'Finnhub';
}

function newsTypes(item: DividendNewsItem): NewsTypeFilter[] {
  const text = newsText(item);
  const symbol = item.ticker?.toUpperCase();
  const sector = newsSector(item);
  const types = new Set<NewsTypeFilter>();
  const hasAny = (keywords: string[]) => keywords.some(keyword => text.includes(keyword));

  if (hasAny(['dividend', 'distribution', 'payout', 'ex-dividend', 'ex dividend', 'توزيع', 'توزيعات'])) types.add('dividends');
  if (hasAny(['high yield', 'high-yield', 'yield', 'income', 'عائد', 'عوائد', 'دخل'])) types.add('high_yield');
  if (hasAny(['earnings', 'profit', 'revenue', 'quarter', 'results', 'أرباح', 'إيرادات', 'نتائج'])) types.add('earnings');
  if (hasAny(['fixed income', 'bond', 'treasury', 'income fund', 'دخل ثابت', 'سندات'])) types.add('fixed_income');
  if (hasAny(['defensive', 'consumer staples', 'healthcare', 'utility', 'utilities', 'دفاعية'])) types.add('defensive');
  if (sector === 'telecom' || symbol === 'T' || symbol === 'VZ' || hasAny(['telecom', 'telecommunications', 'wireless', 'verizon', 'at&t', 'اتصالات'])) types.add('telecom');
  if (sector === 'utilities' || ['SO', 'DUK', 'NEE'].includes(symbol ?? '') || hasAny(['utility', 'utilities', 'electric', 'power', 'مرافق'])) types.add('utilities');
  if (sector === 'energy' || ['XOM', 'CVX'].includes(symbol ?? '') || hasAny(['energy', 'oil', 'gas', 'exxon', 'chevron', 'طاقة', 'نفط'])) types.add('energy');
  if (sector === 'reits' || symbol === 'O' || hasAny(['reit', 'realty income', 'real estate investment trust', 'عقارات'])) types.add('reits');
  if (sector === 'consumer_goods' || ['KO', 'PEP', 'PG', 'MO', 'PM'].includes(symbol ?? '') || hasAny(['consumer staples', 'consumer goods', 'coca-cola', 'pepsico', 'procter', 'سلع استهلاكية'])) types.add('consumer_staples');
  if (['consumer_goods', 'healthcare', 'telecom', 'utilities'].includes(sector)) types.add('defensive');

  return Array.from(types);
}

function newsTypeLabel(type: NewsTypeFilter, text: typeof COPY[LangCode]) {
  const labels: Record<NewsTypeFilter, string> = {
    all: text.allNewsTypes,
    dividends: text.newsTypeDividends,
    high_yield: text.newsTypeHighYield,
    earnings: text.newsTypeEarnings,
    fixed_income: text.newsTypeFixedIncome,
    defensive: text.newsTypeDefensive,
    telecom: text.newsTypeTelecom,
    utilities: text.newsTypeUtilities,
    energy: text.newsTypeEnergy,
    reits: text.newsTypeReits,
    consumer_staples: text.newsTypeConsumerStaples,
  };
  return labels[type];
}

function isWithinTimeFilter(value: string, filter: NewsTimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const age = Date.now() - date.getTime();
  if (filter === 'day') return age <= 24 * 60 * 60 * 1000;
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
}

function matchesStockSearch(row: DividendStockRow, query: string) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return row.symbol.toLowerCase().includes(q) || row.name.toLowerCase().includes(q) || row.sectorLabel.toLowerCase().includes(q);
}

function matchesNewsSearch(item: DividendNewsItem, query: string) {
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

function sortStocks(rows: DividendStockRow[], sort: StockSort) {
  const sorted = rows.slice();
  if (sort === 'yield') return sorted.sort((a, b) => (normalizeRatioToPercent(b.dividendYield) ?? -Infinity) - (normalizeRatioToPercent(a.dividendYield) ?? -Infinity));
  if (sort === 'payout') return sorted.sort((a, b) => (normalizeRatioToPercent(a.payoutRatio) ?? Infinity) - (normalizeRatioToPercent(b.payoutRatio) ?? Infinity));
  if (sort === 'exDate') return sorted.sort((a, b) => (new Date(a.exDividendDate ?? '9999-12-31').getTime()) - (new Date(b.exDividendDate ?? '9999-12-31').getTime()));
  if (sort === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'change') return sorted.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  return sorted.sort((a, b) => (b.qualityScore ?? -Infinity) - (a.qualityScore ?? -Infinity));
}

function sortNews(items: DividendNewsItem[], sort: NewsSort) {
  const sorted = items.slice();
  if (sort === 'oldest') return sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  if (sort === 'strongestMove') return sorted.sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));
  return sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return { tab: 'overview' as DividendTab, stockSearch: '', stockSector: 'all' as SectorId, stockSort: 'quality' as StockSort, yieldMin: '', payoutMax: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') as DividendTab | null;
  const sector = params.get('sector') as SectorId | null;
  const sort = params.get('sort') as StockSort | null;
  return {
    tab: tab && TAB_IDS.includes(tab) ? tab : 'overview',
    stockSearch: params.get('q') ?? '',
    stockSector: sector && (sector === 'all' || sector in SECTORS) ? sector : 'all',
    stockSort: sort && ['quality', 'yield', 'payout', 'exDate', 'name', 'change'].includes(sort) ? sort : 'quality',
    yieldMin: params.get('yieldMin') ?? '',
    payoutMax: params.get('payoutMax') ?? '',
  };
}

function updateUrl(updates: Record<string, string | null>, mode: 'push' | 'replace' = 'replace') {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === '' || value === 'all' || value === 'quality' || (key === 'tab' && value === 'overview')) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

function safeArticleTitle(item: DividendNewsItem, original: boolean) {
  if (original && item.titleOriginal) return item.titleOriginal;
  return item.title || item.headline || item.titleOriginal || '';
}

function safeArticleSummary(item: DividendNewsItem, original: boolean) {
  if (original && item.summaryOriginal) return item.summaryOriginal;
  return item.summary || item.summaryOriginal || '';
}

function badgeClass(tone: Tone) {
  return `badge tone-${tone}`;
}

const UNRELIABLE_DIVIDEND_LOGOS = new Set(['IBM', 'XOM']);

function dividendLogoAssetType(symbol?: string | null): 'stock' | 'unknown' {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  return UNRELIABLE_DIVIDEND_LOGOS.has(cleanSymbol) ? 'unknown' : 'stock';
}

export function DividendStocksNewsPage() {
  const { lang, dir } = useLanguage();
  const activeLang = getLang(lang);
  const text = COPY[activeLang];
  const initial = useMemo(() => getInitialState(), []);
  const [tab, setTab] = useState<DividendTab>(initial.tab);
  const [ticker, setTicker] = useState<DividendTickerResponse | null>(null);
  const [news, setNews] = useState<DividendNewsResponse | null>(null);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState(initial.stockSearch);
  const [stockSector, setStockSector] = useState<SectorId>(initial.stockSector);
  const [stockSort, setStockSort] = useState<StockSort>(initial.stockSort);
  const [yieldMin, setYieldMin] = useState(initial.yieldMin);
  const [payoutMax, setPayoutMax] = useState(initial.payoutMax);
  const [calendarRange, setCalendarRange] = useState<CalendarRange>('90');
  const [calendarMarket, setCalendarMarket] = useState('all');
  const [calendarSymbol, setCalendarSymbol] = useState('all');
  const [calendarType, setCalendarType] = useState('all');
  const [calendar, setCalendar] = useState<DividendCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsSector, setNewsSector] = useState<SectorId>('all');
  const [newsSource, setNewsSource] = useState('all');
  const [newsSymbol, setNewsSymbol] = useState('all');
  const [newsImpactFilter, setNewsImpactFilter] = useState<NewsImpactFilter>('all');
  const [newsTime, setNewsTime] = useState<NewsTimeFilter>('all');
  const [newsTypeFilter, setNewsTypeFilter] = useState<NewsTypeFilter>('all');
  const [newsSort, setNewsSort] = useState<NewsSort>('latest');
  const [visibleNews, setVisibleNews] = useState(NEWS_INITIAL_LIMIT);
  const [openEducation, setOpenEducation] = useState<EducationId | null>(null);
  const [originalNewsIds, setOriginalNewsIds] = useState<string[]>([]);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [selectedDetailsRow, setSelectedDetailsRow] = useState<DividendStockRow | null>(null);
  const [detailsLoadingSymbol, setDetailsLoadingSymbol] = useState<string | null>(null);
  const detailsTimerRef = useRef<number | null>(null);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    setError(null);
    try {
      const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
        fetch('/api/dividend-stocks/ticker', { cache: 'no-store' }).then(response => response.json() as Promise<DividendTickerResponse>),
        fetch(`/api/dividend-stocks/news?lang=${activeLang}&limit=48`, { cache: 'no-store' }).then(response => response.json() as Promise<DividendNewsResponse>),
        fetch('/api/dividend-stocks/movers?limit=5', { cache: 'no-store' }).then(response => response.json() as Promise<StockCategoryMoversResponse>),
      ]);
      if (tickerResult.status === 'fulfilled') setTicker(tickerResult.value);
      if (newsResult.status === 'fulfilled') setNews(newsResult.value);
      if (moversResult.status === 'fulfilled') setMovers(moversResult.value);
      if (tickerResult.status === 'rejected' && newsResult.status === 'rejected') setError(text.providerError);
    } catch {
      setError(text.providerError);
    } finally {
      setLoading(false);
    }
  }, [activeLang, text.providerError]);

  const loadCalendarData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setCalendarLoading(true);
    try {
      const params = new URLSearchParams({ range: calendarRange });
      if (calendarMarket !== 'all') params.set('market', calendarMarket);
      if (calendarSymbol !== 'all') params.set('symbol', calendarSymbol);
      if (calendarType !== 'all') params.set('type', calendarType);
      if (mode === 'refresh') params.set('refresh', '1');
      const response = await fetch(`/api/dividend-stocks/calendar?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as DividendCalendarResponse;
      setCalendar(payload);
    } catch {
      setCalendar({
        status: 'provider_error',
        provider: null,
        configured: true,
        items: [],
        rawEventCount: 0,
        filteredEventCount: 0,
        cached: false,
        stale: false,
        messageCode: 'provider_temporarily_unavailable',
        code: 'PROVIDER_TEMPORARILY_UNAVAILABLE',
        ok: false,
        success: false,
      });
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarMarket, calendarRange, calendarSymbol, calendarType]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadData('refresh'), loadCalendarData('refresh')]);
    } finally {
      setRefreshing(false);
    }
  }, [loadCalendarData, loadData]);

  useEffect(() => {
    void loadData('initial');
  }, [loadData]);

  useEffect(() => {
    void loadCalendarData('initial');
  }, [loadCalendarData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshAll();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshAll]);

  useEffect(() => {
    const onPopState = () => {
      const state = getInitialState();
      setTab(state.tab);
      setStockSearch(state.stockSearch);
      setStockSector(state.stockSector);
      setStockSort(state.stockSort);
      setYieldMin(state.yieldMin);
      setPayoutMax(state.payoutMax);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    updateUrl({
      tab,
      q: stockSearch,
      sector: stockSector,
      sort: stockSort,
      yieldMin,
      payoutMax,
    }, 'replace');
  }, [payoutMax, stockSearch, stockSector, stockSort, tab, yieldMin]);

  const closeStockDetails = useCallback(() => {
    if (detailsTimerRef.current !== null) {
      window.clearTimeout(detailsTimerRef.current);
      detailsTimerRef.current = null;
    }
    setDetailsLoadingSymbol(null);
    setSelectedDetailsRow(null);
  }, []);

  const openStockDetails = useCallback((row: DividendStockRow) => {
    const symbol = row.symbol.toUpperCase();
    if (detailsTimerRef.current !== null) window.clearTimeout(detailsTimerRef.current);
    setSelectedDetailsRow(row);
    setDetailsLoadingSymbol(symbol);
    detailsTimerRef.current = window.setTimeout(() => {
      setDetailsLoadingSymbol(current => current === symbol ? null : current);
      detailsTimerRef.current = null;
    }, 180);
  }, []);

  useEffect(() => {
    return () => {
      if (detailsTimerRef.current !== null) window.clearTimeout(detailsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedDetailsRow && !detailsLoadingSymbol) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeStockDetails();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeStockDetails, detailsLoadingSymbol, selectedDetailsRow]);

  const rows = useMemo(() => buildStockRows(ticker?.ok ? ticker.items : [], activeLang), [activeLang, ticker]);
  const events = useMemo(() => calendar?.items ?? calendar?.events ?? [], [calendar]);
  const calendarMarkets = useMemo(() => calendar?.availableFilters?.markets ?? uniqueOptions(events.map(event => event.market)), [calendar, events]);
  const calendarSymbols = useMemo(() => calendar?.availableFilters?.symbols ?? uniqueOptions(events.map(event => event.symbol)), [calendar, events]);
  const calendarTypes = useMemo(() => calendar?.availableFilters?.types ?? uniqueOptions(events.map(event => event.type)), [calendar, events]);
  const dedupedNews = useMemo(() => news?.success ? dedupeNews(news.items) : [], [news]);
  const sources = useMemo(() => uniqueOptions(dedupedNews.map(item => item.source)), [dedupedNews]);
  const symbols = useMemo(() => uniqueOptions(dedupedNews.map(item => item.ticker?.toUpperCase())), [dedupedNews]);

  const filteredRows = useMemo(() => {
    const minYield = Number(yieldMin);
    const maxPayout = Number(payoutMax);
    const rowsFiltered = rows.filter(row => {
      const sectorMatch = stockSector === 'all' || row.sectorId === stockSector;
      const searchMatch = matchesStockSearch(row, stockSearch);
      const yieldMatch = !yieldMin || ((normalizeRatioToPercent(row.dividendYield) ?? -Infinity) >= minYield);
      const payoutMatch = !payoutMax || ((normalizeRatioToPercent(row.payoutRatio) ?? Infinity) <= maxPayout);
      return sectorMatch && searchMatch && yieldMatch && payoutMatch;
    });
    return sortStocks(rowsFiltered, stockSort);
  }, [payoutMax, rows, stockSearch, stockSector, stockSort, yieldMin]);

  const featuredRows = useMemo(() => {
    const sorted = rows
      .slice()
      .sort((a, b) => (b.qualityScore ?? -Infinity) - (a.qualityScore ?? -Infinity));
    const scored = sorted.filter(row => row.qualityScore !== null);
    return (scored.length >= 6 ? scored : sorted).slice(0, 9);
  }, [rows]);

  const filteredNews = useMemo(() => {
    const items = dedupedNews.filter(item => {
      const sectorMatch = newsSector === 'all' || newsSector === newsSectorForItem(item);
      const sourceMatch = newsSource === 'all' || item.source === newsSource;
      const symbolMatch = newsSymbol === 'all' || item.ticker?.toUpperCase() === newsSymbol;
      const impactMatch = newsImpactFilter === 'all' || newsImpact(item) === newsImpactFilter;
      const typeMatch = newsTypeFilter === 'all' || newsTypes(item).includes(newsTypeFilter);
      return sectorMatch
        && sourceMatch
        && symbolMatch
        && impactMatch
        && typeMatch
        && isWithinTimeFilter(item.publishedAt, newsTime)
        && matchesNewsSearch(item, newsSearch);
    });
    return sortNews(items, newsSort);
  }, [dedupedNews, newsImpactFilter, newsSearch, newsSector, newsSort, newsSource, newsSymbol, newsTime, newsTypeFilter]);

  const snapshot = useMemo(() => {
    const yields = rows.map(row => normalizeRatioToPercent(row.dividendYield)).filter((value): value is number => value !== null);
    const payouts = rows.map(row => normalizeRatioToPercent(row.payoutRatio)).filter((value): value is number => value !== null);
    const avgYield = yields.length ? yields.reduce((sum, value) => sum + value, 0) / yields.length : null;
    const avgPayout = payouts.length ? payouts.reduce((sum, value) => sum + value, 0) / payouts.length : null;
    const markets = new Set(rows.map(row => row.currency || 'USD'));
    const quality = rows.length ? Math.round((rows.filter(row => hasDividendData(row)).length / rows.length) * 100) : null;
    return { avgYield, avgPayout, markets: markets.size, quality };
  }, [rows]);

  useEffect(() => {
    setSelectedDetailsRow(current => {
      if (!current) return current;
      return rows.find(row => row.symbol === current.symbol) ?? current;
    });
  }, [rows]);

  const resetStockFilters = () => {
    setStockSearch('');
    setStockSector('all');
    setStockSort('quality');
    setYieldMin('');
    setPayoutMax('');
  };

  const resetNewsFilters = () => {
    setNewsSearch('');
    setNewsSector('all');
    setNewsSource('all');
    setNewsSymbol('all');
    setNewsImpactFilter('all');
    setNewsTime('all');
    setNewsTypeFilter('all');
    setNewsSort('latest');
    setVisibleNews(NEWS_INITIAL_LIMIT);
  };

  const resetCalendarFilters = () => {
    setCalendarRange('all');
    setCalendarMarket('all');
    setCalendarSymbol('all');
    setCalendarType('all');
  };

  const changeTab = (next: DividendTab) => {
    setTab(next);
    updateUrl({ tab: next }, 'push');
  };

  const toggleEducation = (id: EducationId) => {
    setOpenEducation(current => current === id ? null : id);
  };

  const toggleOriginal = (id: string) => {
    setOriginalNewsIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const hasStockFilters = Boolean(stockSearch.trim() || stockSector !== 'all' || stockSort !== 'quality' || yieldMin || payoutMax);
  const hasNewsFilters = Boolean(newsSearch.trim() || newsSector !== 'all' || newsSource !== 'all' || newsSymbol !== 'all' || newsImpactFilter !== 'all' || newsTime !== 'all' || newsTypeFilter !== 'all' || newsSort !== 'latest');
  const hasCalendarFilters = Boolean(calendarRange !== '90' || calendarMarket !== 'all' || calendarSymbol !== 'all' || calendarType !== 'all');

  return (
    <NewsPageShell category="high-income" className="page" dir={dir} wide>
      <WorkspacePageContainer as="main" variant="wide" className="main">
        <div className="container">
          <header className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={16} />{text.badge}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
              <div className="hero-meta" aria-label={text.provider}>
                <span><Clock3 size={15} />{text.quoteUpdate}: {formatDateTime(ticker?.ok ? ticker.updated_at : null, activeLang)}</span>
                <span><Newspaper size={15} />{text.newsUpdate}: {formatDateTime(news?.success ? news.lastUpdated : null, activeLang)}</span>
                <span className={ticker?.ok ? 'status-dot status-ok' : 'status-dot status-warn'}>{ticker?.ok ? text.connected : text.partial}</span>
              </div>
            </div>
            <div className="hero-panel">
              <div>
                <span>{text.methodology}</span>
                <strong>{text.featuredTitle}</strong>
                <p>{text.methodologyBody}</p>
              </div>
              <button className="refresh-button" type="button" onClick={() => void refreshAll()} disabled={refreshing}>
                <RefreshCcw size={17} className={refreshing ? 'spin' : undefined} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
            </div>
          </header>

          {error ? <StateBox tone="warning" icon={AlertTriangle} title={text.providerError} actionLabel={text.retry} onAction={() => void refreshAll()} /> : null}

          <TickerStrip rows={rows} loading={loading} text={text} lang={activeLang} />
          <SummarySection
            text={text}
            lang={activeLang}
            loading={loading || calendarLoading}
            rows={rows}
            events={events}
            snapshot={snapshot}
          />

          <nav className="tabs" role="tablist" aria-label={text.title}>
            {TAB_IDS.map(item => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'tab active' : 'tab'} onClick={() => changeTab(item)}>
                {text.tabs[item]}
              </button>
            ))}
          </nav>

          {tab === 'overview' ? (
            <OverviewTab
              text={text}
              lang={activeLang}
              loading={loading || calendarLoading}
              rows={rows}
              events={events}
              featuredRows={featuredRows.slice(0, 6)}
              newsItems={filteredNews.slice(0, 4)}
              setTab={changeTab}
              methodologyOpen={methodologyOpen}
              setMethodologyOpen={setMethodologyOpen}
              originalNewsIds={originalNewsIds}
              toggleOriginal={toggleOriginal}
              openEducation={openEducation}
              toggleEducation={toggleEducation}
              onOpenDetails={openStockDetails}
              detailsLoadingSymbol={detailsLoadingSymbol}
            />
          ) : null}

          {tab === 'explorer' ? (
            <ExplorerTab
              text={text}
              lang={activeLang}
              rows={filteredRows}
              loading={loading}
              search={stockSearch}
              sector={stockSector}
              sort={stockSort}
              yieldMin={yieldMin}
              payoutMax={payoutMax}
              setSearch={setStockSearch}
              setSector={setStockSector}
              setSort={setStockSort}
              setYieldMin={setYieldMin}
              setPayoutMax={setPayoutMax}
              reset={resetStockFilters}
              hasFilters={hasStockFilters}
              onOpenDetails={openStockDetails}
              detailsLoadingSymbol={detailsLoadingSymbol}
            />
          ) : null}

          {tab === 'featured' ? (
            <FeaturedTab
              text={text}
              lang={activeLang}
              rows={featuredRows}
              loading={loading}
              methodologyOpen={methodologyOpen}
              setMethodologyOpen={setMethodologyOpen}
              onOpenDetails={openStockDetails}
              detailsLoadingSymbol={detailsLoadingSymbol}
            />
          ) : null}

          {tab === 'calendar' ? (
            <CalendarTab
              text={text}
              lang={activeLang}
              events={events}
              rows={rows}
              loading={calendarLoading}
              range={calendarRange}
              setRange={setCalendarRange}
              market={calendarMarket}
              setMarket={setCalendarMarket}
              symbol={calendarSymbol}
              setSymbol={setCalendarSymbol}
              type={calendarType}
              setType={setCalendarType}
              markets={calendarMarkets}
              symbols={calendarSymbols}
              types={calendarTypes}
              response={calendar}
              reset={resetCalendarFilters}
              retry={() => void loadCalendarData('refresh')}
              hasFilters={hasCalendarFilters}
            />
          ) : null}

          {tab === 'news' ? (
            <NewsTab
              text={text}
              lang={activeLang}
              loading={loading}
              items={filteredNews}
              visibleCount={visibleNews}
              setVisibleCount={setVisibleNews}
              search={newsSearch}
              sector={newsSector}
              source={newsSource}
              symbol={newsSymbol}
              impact={newsImpactFilter}
              time={newsTime}
              newsType={newsTypeFilter}
              sort={newsSort}
              sources={sources}
              symbols={symbols}
              setSearch={setNewsSearch}
              setSector={setNewsSector}
              setSource={setNewsSource}
              setSymbol={setNewsSymbol}
              setImpact={setNewsImpactFilter}
              setTime={setNewsTime}
              setNewsType={setNewsTypeFilter}
              setSort={setNewsSort}
              reset={resetNewsFilters}
              hasFilters={hasNewsFilters}
              originalNewsIds={originalNewsIds}
              toggleOriginal={toggleOriginal}
            />
          ) : null}

          {tab === 'education' ? (
            <EducationTab text={text} open={openEducation} toggle={toggleEducation} idPrefix="dividend-guide-full" />
          ) : null}

          <footer className="footer-note">
            <Info size={18} />
            <div>
              <strong>{text.legal}</strong>
              <p>{text.aiNotice}</p>
            </div>
          </footer>
        </div>
      </WorkspacePageContainer>
      {selectedDetailsRow || detailsLoadingSymbol ? (
        <StockDetailsDrawer
          row={selectedDetailsRow}
          loading={Boolean(detailsLoadingSymbol)}
          loadingSymbol={detailsLoadingSymbol}
          text={text}
          lang={activeLang}
          provider={ticker?.source ?? null}
          lastUpdated={ticker?.ok ? ticker.updated_at : ticker?.updated_at ?? null}
          onClose={closeStockDetails}
        />
      ) : null}
      <DividendStyles />
    </NewsPageShell>
  );
}

function newsSectorForItem(item: DividendNewsItem): SectorId {
  return newsSector(item);
}

function TickerStrip({ rows, loading, text, lang }: { rows: DividendStockRow[]; loading: boolean; text: typeof COPY[LangCode]; lang: LangCode }) {
  if (loading) {
    return (
      <section className="section" aria-label={text.tickerTitle}>
        <SectionHeader title={text.tickerTitle} description={text.tickerDescription} />
        <div className="ticker-panel">
          <div className="ticker-viewport">
            <div className="ticker-track ticker-skeleton-track">
              {Array.from({ length: 6 }).map((_, index) => <div className="ticker-item skeleton" key={index} />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section" aria-label={text.tickerTitle}>
      <SectionHeader title={text.tickerTitle} description={text.tickerDescription} />
      <StockTickerStrip
        ariaLabel={text.tickerTitle}
        items={rows.map(row => ({
          symbol: row.symbol,
          name: row.name,
          assetType: dividendLogoAssetType(row.symbol),
          price: row.price,
          currency: row.currency,
          changePercent: row.changePercent,
          source: row.source,
          available: row.price !== null,
          meta: hasDividendData(row) ? text.dividendYield + ': ' + formatPercent(row.dividendYield, lang, true) : text.insufficientMetrics,
        }))}
        locale={LOCALE_BY_LANG[lang]}
        unavailableLabel={text.unavailable}
        sourceLabel={text.source}
        className="ticker-panel"
        viewportClassName="ticker-viewport"
        trackClassName="ticker-track"
        setClassName="ticker-set"
        direction="ltr"
        durationSeconds={52}
      />
    </section>
  );
}

function SummarySection({
  text,
  lang,
  loading,
  rows,
  events,
  snapshot,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  rows: DividendStockRow[];
  events: DividendEvent[];
  snapshot: { avgYield: number | null; avgPayout: number | null; markets: number; quality: number | null };
}) {
  return (
    <section className="section">
      <SectionHeader title={text.snapshotTitle} description={text.snapshotDescription} />
      <div className="summary-grid">
        <MetricCard icon={Building2} label={text.trackedCompanies} value={String(rows.length)} help={text.marketsCovered} loading={loading} tone="info" />
        <MetricCard icon={Coins} label={text.averageYield} value={formatPercent(snapshot.avgYield, lang)} help={text.dividendYield} loading={loading} tone="positive" />
        <MetricCard icon={CalendarDays} label={text.upcomingEvents} value={String(events.length)} help={text.exDividendDate} loading={loading} tone="warning" />
        <MetricCard icon={ShieldCheck} label={text.dataQuality} value={snapshot.quality === null ? text.unavailable : `${snapshot.quality}%`} help={text.provider} loading={loading} tone="neutral" />
      </div>
    </section>
  );
}

function OverviewTab({
  text,
  lang,
  loading,
  rows,
  events,
  featuredRows,
  newsItems,
  setTab,
  methodologyOpen,
  setMethodologyOpen,
  originalNewsIds,
  toggleOriginal,
  openEducation,
  toggleEducation,
  onOpenDetails,
  detailsLoadingSymbol,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  rows: DividendStockRow[];
  events: DividendEvent[];
  featuredRows: DividendStockRow[];
  newsItems: DividendNewsItem[];
  setTab: (tab: DividendTab) => void;
  methodologyOpen: boolean;
  setMethodologyOpen: (open: boolean) => void;
  originalNewsIds: string[];
  toggleOriginal: (id: string) => void;
  openEducation: EducationId | null;
  toggleEducation: (id: EducationId) => void;
  onOpenDetails: (row: DividendStockRow) => void;
  detailsLoadingSymbol: string | null;
}) {
  return (
    <div className="stack">
      <div className="workspace-grid">
        <div className="stack">
          <section className="section">
            <SectionHeader
              title={text.featuredTitle}
              description={text.featuredDescription}
              action={<button className="ghost-button" type="button" onClick={() => setTab('featured')}>{text.methodology}<ArrowUpRight size={15} /></button>}
            />
            <FeaturedGrid
              rows={featuredRows}
              text={text}
              lang={lang}
              loading={loading}
              compact
              onOpenDetails={onOpenDetails}
              detailsLoadingSymbol={detailsLoadingSymbol}
            />
            <MethodologyBox text={text} open={methodologyOpen} setOpen={setMethodologyOpen} />
          </section>

          <StrategyComparison text={text} lang={lang} />
        </div>

        <aside className="stack side-column">
          <section className="panel">
            <SectionHeader title={text.calendarTitle} description={text.calendarDescription} action={<button className="ghost-button" type="button" onClick={() => setTab('calendar')}>{text.range90}</button>} />
            <EventList events={events.slice(0, 5)} text={text} lang={lang} compact />
          </section>

          <section className="panel">
            <SectionHeader title={text.newsTitle} description={text.newsDescription} action={<button className="ghost-button" type="button" onClick={() => setTab('news')}>{text.showAllNews}</button>} />
            <div className="side-news">
              {newsItems.length > 0
                ? newsItems.slice(0, 4).map(item => <CompactNewsRow key={item.id || item.url} item={item} text={text} lang={lang} />)
                : <StateBox tone="info" icon={Newspaper} title={text.noNews} body={text.noNewsBody} />}
            </div>
          </section>

          <EducationTab text={text} open={openEducation} toggle={toggleEducation} idPrefix="dividend-guide-preview" preview />
        </aside>
      </div>
    </div>
  );
}

function ExplorerTab({
  text,
  lang,
  rows,
  loading,
  search,
  sector,
  sort,
  yieldMin,
  payoutMax,
  setSearch,
  setSector,
  setSort,
  setYieldMin,
  setPayoutMax,
  reset,
  hasFilters,
  onOpenDetails,
  detailsLoadingSymbol,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: DividendStockRow[];
  loading: boolean;
  search: string;
  sector: SectorId;
  sort: StockSort;
  yieldMin: string;
  payoutMax: string;
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSort: (value: StockSort) => void;
  setYieldMin: (value: string) => void;
  setPayoutMax: (value: string) => void;
  reset: () => void;
  hasFilters: boolean;
  onOpenDetails: (row: DividendStockRow) => void;
  detailsLoadingSymbol: string | null;
}) {
  return (
    <section className="section">
      <SectionHeader title={text.explorerTitle} description={text.explorerDescription} action={<span className="pill">{text.resultCount}: {rows.length}</span>} />
      <DividendFilters
        text={text}
        lang={lang}
        search={search}
        sector={sector}
        sort={sort}
        yieldMin={yieldMin}
        payoutMax={payoutMax}
        setSearch={setSearch}
        setSector={setSector}
        setSort={setSort}
        setYieldMin={setYieldMin}
        setPayoutMax={setPayoutMax}
        reset={reset}
        hasFilters={hasFilters}
      />
      {loading ? <SkeletonGrid count={6} /> : rows.length === 0 ? (
        <StateBox tone="info" icon={Search} title={text.noStocks} body={text.noStocksText} actionLabel={hasFilters ? text.clearFilters : undefined} onAction={hasFilters ? reset : undefined} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{text.company}</th>
                  <th>{text.currentPrice}</th>
                  <th>{text.dividendYield}</th>
                  <th>{text.payoutRatio}</th>
                  <th>{text.declarationDate}</th>
                  <th>{text.exDividendDate}</th>
                  <th>{text.recordDate}</th>
                  <th>{text.paymentDate}</th>
                  <th>{text.riskLevel}</th>
                  <th>{text.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <StockTableRow
                    key={row.symbol}
                    row={row}
                    text={text}
                    lang={lang}
                    onOpenDetails={onOpenDetails}
                    isOpening={detailsLoadingSymbol === row.symbol.toUpperCase()}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {rows.map(row => (
              <DividendMobileCard
                key={row.symbol}
                row={row}
                text={text}
                lang={lang}
                onOpenDetails={onOpenDetails}
                isOpening={detailsLoadingSymbol === row.symbol.toUpperCase()}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FeaturedTab({
  text,
  lang,
  rows,
  loading,
  methodologyOpen,
  setMethodologyOpen,
  onOpenDetails,
  detailsLoadingSymbol,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: DividendStockRow[];
  loading: boolean;
  methodologyOpen: boolean;
  setMethodologyOpen: (open: boolean) => void;
  onOpenDetails: (row: DividendStockRow) => void;
  detailsLoadingSymbol: string | null;
}) {
  return (
    <section className="section">
      <SectionHeader title={text.featuredTitle} description={text.featuredDescription} action={<button className="ghost-button" type="button" onClick={() => setMethodologyOpen(!methodologyOpen)}>{text.methodology}</button>} />
      <MethodologyBox text={text} open={methodologyOpen} setOpen={setMethodologyOpen} />
      <FeaturedGrid
        rows={rows}
        text={text}
        lang={lang}
        loading={loading}
        onOpenDetails={onOpenDetails}
        detailsLoadingSymbol={detailsLoadingSymbol}
      />
    </section>
  );
}

function CalendarTab({
  text,
  lang,
  events,
  rows,
  loading,
  range,
  setRange,
  market,
  setMarket,
  symbol,
  setSymbol,
  type,
  setType,
  markets,
  symbols,
  types,
  response,
  reset,
  retry,
  hasFilters,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  events: DividendEvent[];
  rows: DividendStockRow[];
  loading: boolean;
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  market: string;
  setMarket: (market: string) => void;
  symbol: string;
  setSymbol: (symbol: string) => void;
  type: string;
  setType: (type: string) => void;
  markets: string[];
  symbols: string[];
  types: string[];
  response: DividendCalendarResponse | null;
  reset: () => void;
  retry: () => void;
  hasFilters: boolean;
}) {
  const status = response?.status ?? 'success';
  const providerTone: Tone = status === 'success'
    ? 'positive'
    : status === 'not_configured'
      ? 'warning'
      : 'negative';
  const providerLabel = status === 'not_configured'
    ? text.providerNotConfiguredBadge
    : status === 'success'
      ? `${text.providerConfigured}: FMP`
      : text.providerErrorBadge;
  const emptyTitle = status === 'not_configured'
    ? text.calendarUnavailableTitle
    : status === 'success'
      ? text.noCalendarEventsFiltered
      : text.calendarErrorTitle;
  let emptyBody: string = text.calendarErrorText;
  if (status === 'not_configured') emptyBody = text.calendarUnavailableText;
  else if (status === 'success') emptyBody = text.noCalendarTextFiltered;
  else if (status === 'rate_limited') emptyBody = text.providerRateLimited;
  else if ((['unauthorized', 'forbidden', 'not_entitled'] as string[]).includes(status)) emptyBody = text.providerAccessDenied;
  const marketOptions = uniqueOptions([...markets, market !== 'all' ? market : null]);
  const symbolOptions = uniqueOptions([...symbols, symbol !== 'all' ? symbol : null]);
  const typeOptions = uniqueOptions([...types, type !== 'all' ? type : null]);

  return (
    <section className="section">
      <SectionHeader
        title={text.calendarTitle}
        description={text.calendarDescription}
        action={<span className="pill">{text.resultCount}: {events.length}</span>}
      />
      <div className="range-tabs" role="group" aria-label={text.calendarTitle}>
        {(['30', '90', 'all'] as CalendarRange[]).map(item => (
          <button key={item} type="button" className={range === item ? 'chip active' : 'chip'} onClick={() => setRange(item)}>
            {item === '30' ? text.range30 : item === '90' ? text.range90 : text.rangeAll}
          </button>
        ))}
      </div>
      <div className="filter-panel calendar-filter-panel">
        <SelectField id="dividend-calendar-market" label={text.market} value={market} onChange={setMarket}>
          <option value="all">{text.allMarkets}</option>
          {marketOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <SelectField id="dividend-calendar-symbol" label={text.symbolFilter} value={symbol} onChange={setSymbol}>
          <option value="all">{text.allSymbols}</option>
          {symbolOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <SelectField id="dividend-calendar-type" label={text.eventType} value={type} onChange={setType}>
          <option value="all">{text.allTypes}</option>
          {typeOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <div className="calendar-filter-actions">
          <span className={badgeClass(providerTone)}>{providerLabel}</span>
          <button className="ghost-button" type="button" onClick={reset} disabled={!hasFilters}>
            <Filter size={16} />
            {text.clearFilters}
          </button>
        </div>
      </div>
      <DividendProviderStatusCard
        text={text}
        lang={lang}
        response={response}
        rows={rows}
        events={events}
      />
      {loading ? <SkeletonGrid count={4} /> : events.length === 0 ? (
        <DividendEventEmptyState
          text={text}
          title={emptyTitle}
          body={emptyBody}
          providerLabel={providerLabel}
          providerTone={providerTone}
          onRetry={retry}
          onReset={reset}
          canReset={hasFilters}
        />
      ) : <EventList events={events} text={text} lang={lang} />}
    </section>
  );
}

function DividendProviderStatusCard({
  text,
  lang,
  response,
  rows,
  events,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  response: DividendCalendarResponse | null;
  rows: DividendStockRow[];
  events: DividendEvent[];
}) {
  const status = response?.status ?? 'provider_error';
  const connectionLabel = status === 'success'
    ? text.connectedStatus
    : status === 'not_configured'
      ? text.unconfiguredStatus
      : text.failedStatus;
  const paymentDateCount = rows.filter(row => hasDate(row.paymentDate)).length;
  const unavailableCount = rows.reduce((sum, row) => sum + unavailableDividendFieldCount(row), 0);
  const updatedAt = response?.lastSuccessfulUpdate
    ?? response?.updated_at
    ?? response?.providerStatus?.lastSuccessfulUpdate
    ?? response?.providerStatus?.lastFetchTime
    ?? null;
  const tone: Tone = status === 'success' ? 'positive' : status === 'not_configured' ? 'warning' : 'negative';

  return (
    <div className="provider-status-card">
      <div className="provider-status-head">
        <span className="eyebrow">{text.providerStatus}</span>
        <span className={badgeClass(tone)}>{connectionLabel}</span>
      </div>
      <div className="metric-grid provider-status-grid">
        <MiniMetric label={text.dividendProvider} value="FMP" />
        <MiniMetric label={text.connectionStatus} value={connectionLabel} />
        <MiniMetric label={text.providerEventsCount} value={String(response?.rawEventCount ?? events.length)} />
        <MiniMetric label={text.stocksWithPaymentDate} value={String(paymentDateCount)} />
        <MiniMetric label={text.unavailableValuesCount} value={String(unavailableCount)} />
        <MiniMetric label={text.lastUpdate} value={formatDateTime(updatedAt, lang)} />
      </div>
    </div>
  );
}

function NewsTab({
  text,
  lang,
  loading,
  items,
  visibleCount,
  setVisibleCount,
  search,
  sector,
  source,
  symbol,
  impact,
  time,
  newsType,
  sort,
  sources,
  symbols,
  setSearch,
  setSector,
  setSource,
  setSymbol,
  setImpact,
  setTime,
  setNewsType,
  setSort,
  reset,
  hasFilters,
  originalNewsIds,
  toggleOriginal,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  items: DividendNewsItem[];
  visibleCount: number;
  setVisibleCount: (count: number) => void;
  search: string;
  sector: SectorId;
  source: string;
  symbol: string;
  impact: NewsImpactFilter;
  time: NewsTimeFilter;
  newsType: NewsTypeFilter;
  sort: NewsSort;
  sources: string[];
  symbols: string[];
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSource: (value: string) => void;
  setSymbol: (value: string) => void;
  setImpact: (value: NewsImpactFilter) => void;
  setTime: (value: NewsTimeFilter) => void;
  setNewsType: (value: NewsTypeFilter) => void;
  setSort: (value: NewsSort) => void;
  reset: () => void;
  hasFilters: boolean;
  originalNewsIds: string[];
  toggleOriginal: (id: string) => void;
}) {
  const visible = items.slice(0, visibleCount);
  return (
    <div className="stack">
      <section className="section" aria-label={text.newsTitle}>
        <SectionHeader title={text.newsTitle} description={text.newsDescription} action={<span className="pill">{text.resultCount}: {items.length}</span>} />
      </section>
      <section className="section news-subsection" aria-label={text.newsFiltersTitle}>
        <SectionHeader title={text.newsFiltersTitle} description={text.newsFiltersDescription} />
        <NewsFilters
          text={text}
          lang={lang}
          search={search}
          sector={sector}
          source={source}
          symbol={symbol}
          impact={impact}
          time={time}
          newsType={newsType}
          sort={sort}
          sources={sources}
          symbols={symbols}
          setSearch={setSearch}
          setSector={setSector}
          setSource={setSource}
          setSymbol={setSymbol}
          setImpact={setImpact}
          setTime={setTime}
          setNewsType={setNewsType}
          setSort={setSort}
          reset={reset}
          hasFilters={hasFilters}
        />
      </section>
      <section className="section news-subsection" aria-label={text.newsResultsTitle}>
        <SectionHeader title={text.newsResultsTitle} description={text.newsResultsDescription} action={<span className="pill">{text.resultCount}: {items.length}</span>} />
        {loading ? <SkeletonGrid count={6} /> : items.length === 0 ? (
          <StateBox tone="info" icon={Newspaper} title={text.noNews} body={text.noNewsBody} actionLabel={hasFilters ? text.clearFilters : undefined} onAction={hasFilters ? reset : undefined} />
        ) : (
          <>
          <div className="news-grid">
            {visible.map(item => (
              <NewsCard
                key={item.id || item.url}
                item={item}
                text={text}
                lang={lang}
                showOriginal={originalNewsIds.includes(item.id)}
                toggleOriginal={() => toggleOriginal(item.id)}
              />
            ))}
          </div>
          {visibleCount < items.length ? <button className="primary-button" type="button" onClick={() => setVisibleCount(visibleCount + NEWS_PAGE_SIZE)}>{text.loadMore}</button> : null}
          </>
        )}
      </section>
    </div>
  );
}

function EducationTab({
  text,
  open,
  toggle,
  idPrefix,
  preview,
}: {
  text: typeof COPY[LangCode];
  open: EducationId | null;
  toggle: (id: EducationId) => void;
  idPrefix: string;
  preview?: boolean;
}) {
  const ids = (Object.keys(text.education) as EducationId[]);
  const shown = preview ? ids.slice(0, 3) : ids;
  return (
    <section className={preview ? 'panel' : 'section'}>
      <SectionHeader title={text.educationTitle} description={text.educationDescription} action={preview ? <span className="pill">{text.fullGuide}</span> : undefined} />
      <div className="guide-grid">
        {shown.map(id => {
          const isOpen = open === id;
          const panelId = `${idPrefix}-panel-${id}`;
          const buttonId = `${idPrefix}-button-${id}`;
          return (
            <article key={id}>
              <button id={buttonId} className="guide-button" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(id)}>
                <span>{text.education[id]}</span>
                {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {isOpen ? <div id={panelId} className="guide-content" role="region" aria-labelledby={buttonId}>{text.educationBody[id]}</div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DividendFilters({ text, lang, search, sector, sort, yieldMin, payoutMax, setSearch, setSector, setSort, setYieldMin, setPayoutMax, reset, hasFilters }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  search: string;
  sector: SectorId;
  sort: StockSort;
  yieldMin: string;
  payoutMax: string;
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSort: (value: StockSort) => void;
  setYieldMin: (value: string) => void;
  setPayoutMax: (value: string) => void;
  reset: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="filter-panel">
      <div className="field">
        <label htmlFor="dividend-stock-search">{text.search}</label>
        <div className="input-wrap">
          <Search size={17} />
          <input id="dividend-stock-search" className="filter-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={text.searchPlaceholder} />
        </div>
      </div>
      <SelectField id="dividend-sector" label={text.sector} value={sector} onChange={value => setSector(value as SectorId)}>
        <option value="all">{text.allSectors}</option>
        {Object.keys(SECTORS).map(id => <option key={id} value={id}>{SECTORS[id as Exclude<SectorId, 'all'>].labels[lang]}</option>)}
      </SelectField>
      <div className="field">
        <label htmlFor="dividend-yield-min">{text.yieldMin}</label>
        <input id="dividend-yield-min" className="filter-input no-icon" inputMode="decimal" value={yieldMin} onChange={event => setYieldMin(event.target.value)} placeholder="3" />
      </div>
      <div className="field">
        <label htmlFor="dividend-payout-max">{text.payoutMax}</label>
        <input id="dividend-payout-max" className="filter-input no-icon" inputMode="decimal" value={payoutMax} onChange={event => setPayoutMax(event.target.value)} placeholder="75" />
      </div>
      <SelectField id="dividend-sort" label={text.sort} value={sort} onChange={value => setSort(value as StockSort)}>
        <option value="quality">{text.qualitySort}</option>
        <option value="yield">{text.highestYield}</option>
        <option value="payout">{text.payoutSort}</option>
        <option value="exDate">{text.exDateSort}</option>
        <option value="change">{text.changeSort}</option>
        <option value="name">{text.nameSort}</option>
      </SelectField>
      <button className="ghost-button" type="button" onClick={reset} disabled={!hasFilters}><Filter size={16} />{text.clearFilters}</button>
    </div>
  );
}

function NewsFilters({ text, lang, search, sector, source, symbol, impact, time, newsType, sort, sources, symbols, setSearch, setSector, setSource, setSymbol, setImpact, setTime, setNewsType, setSort, reset, hasFilters }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  search: string;
  sector: SectorId;
  source: string;
  symbol: string;
  impact: NewsImpactFilter;
  time: NewsTimeFilter;
  newsType: NewsTypeFilter;
  sort: NewsSort;
  sources: string[];
  symbols: string[];
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSource: (value: string) => void;
  setSymbol: (value: string) => void;
  setImpact: (value: NewsImpactFilter) => void;
  setTime: (value: NewsTimeFilter) => void;
  setNewsType: (value: NewsTypeFilter) => void;
  setSort: (value: NewsSort) => void;
  reset: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="filter-panel news-filter-panel">
      <div className="field">
        <label htmlFor="dividend-news-search">{text.search}</label>
        <div className="input-wrap">
          <Search size={17} />
          <input id="dividend-news-search" className="filter-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={text.newsSearchPlaceholder} />
        </div>
      </div>
      <SelectField id="dividend-news-sector" label={text.sector} value={sector} onChange={value => setSector(value as SectorId)}>
        <option value="all">{text.allSectors}</option>
        {Object.keys(SECTORS).map(id => <option key={id} value={id}>{SECTORS[id as Exclude<SectorId, 'all'>].labels[lang]}</option>)}
      </SelectField>
      <SelectField id="dividend-news-symbol" label={text.symbolFilter} value={symbol} onChange={setSymbol}>
        <option value="all">{text.allSymbols}</option>
        {symbols.map(option => <option key={option} value={option}>{option}</option>)}
      </SelectField>
      <SelectField id="dividend-news-source" label={text.sourceFilter} value={source} onChange={setSource}>
        <option value="all">{text.allSources}</option>
        {sources.map(option => <option key={option} value={option}>{option}</option>)}
      </SelectField>
      <SelectField id="dividend-news-impact" label={text.impactFilter} value={impact} onChange={value => setImpact(value as NewsImpactFilter)}>
        <option value="all">{text.allImpacts}</option>
        <option value="high">{text.highImpact}</option>
        <option value="medium">{text.mediumImpact}</option>
        <option value="low">{text.lowImpact}</option>
        <option value="unavailable">{text.unavailableImpact}</option>
      </SelectField>
      <SelectField id="dividend-news-time" label={text.dateFilter} value={time} onChange={value => setTime(value as NewsTimeFilter)}>
        <option value="all">{text.allTime}</option>
        <option value="day">{text.lastDay}</option>
        <option value="week">{text.lastWeek}</option>
        <option value="month">{text.lastMonth}</option>
      </SelectField>
      <SelectField id="dividend-news-type" label={text.newsTypeFilter} value={newsType} onChange={value => setNewsType(value as NewsTypeFilter)}>
        <option value="all">{text.allNewsTypes}</option>
        <option value="dividends">{text.newsTypeDividends}</option>
        <option value="high_yield">{text.newsTypeHighYield}</option>
        <option value="earnings">{text.newsTypeEarnings}</option>
        <option value="fixed_income">{text.newsTypeFixedIncome}</option>
        <option value="defensive">{text.newsTypeDefensive}</option>
        <option value="telecom">{text.newsTypeTelecom}</option>
        <option value="utilities">{text.newsTypeUtilities}</option>
        <option value="energy">{text.newsTypeEnergy}</option>
        <option value="reits">{text.newsTypeReits}</option>
        <option value="consumer_staples">{text.newsTypeConsumerStaples}</option>
      </SelectField>
      <SelectField id="dividend-news-sort" label={text.sort} value={sort} onChange={value => setSort(value as NewsSort)}>
        <option value="latest">{text.latest}</option>
        <option value="oldest">{text.oldest}</option>
        <option value="strongestMove">{text.strongestMove}</option>
      </SelectField>
      <button className="ghost-button" type="button" onClick={reset} disabled={!hasFilters}><Filter size={16} />{text.clearFilters}</button>
    </div>
  );
}

function FeaturedGrid({
  rows,
  text,
  lang,
  loading,
  compact,
  onOpenDetails,
  detailsLoadingSymbol,
}: {
  rows: DividendStockRow[];
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  compact?: boolean;
  onOpenDetails: (row: DividendStockRow) => void;
  detailsLoadingSymbol: string | null;
}) {
  if (loading) return <SkeletonGrid count={compact ? 6 : 9} />;
  if (rows.length === 0) return <StateBox tone="info" icon={Coins} title={text.noStocks} body={text.noStocksText} />;
  return (
    <div className="featured-grid">
      {rows.map(row => (
        <FeaturedStockCard
          key={row.symbol}
          row={row}
          text={text}
          lang={lang}
          compact={compact}
          onOpenDetails={onOpenDetails}
          isOpening={detailsLoadingSymbol === row.symbol}
        />
      ))}
    </div>
  );
}

function FeaturedStockCard({
  row,
  text,
  lang,
  compact,
  onOpenDetails,
  isOpening,
}: {
  row: DividendStockRow;
  text: typeof COPY[LangCode];
  lang: LangCode;
  compact?: boolean;
  onOpenDetails: (row: DividendStockRow) => void;
  isOpening: boolean;
}) {
  const ariaLabel = `${text.viewDetailsAriaPrefix} ${row.symbol}`;
  return (
    <article className="card featured-card">
      <div className="stock-head">
        <AssetIdentity className="stock-logo" symbol={row.symbol} name={row.name} assetType={dividendLogoAssetType(row.symbol)} size="md" decorative />
        <div className="stock-title">
          <h3>{row.name}</h3>
          <p><span className="symbol">{row.symbol}</span> · {row.sectorLabel}</p>
        </div>
        <span className={badgeClass(row.riskTone)}>{row.riskLabel}</span>
      </div>
      <div className="score-band">
        <span>{text.score}</span>
        <strong>{row.qualityScore === null ? text.unavailable : row.qualityScore}</strong>
      </div>
      <DividendMetricGrid row={row} text={text} lang={lang} compact={compact} />
      <p className="muted"><strong>{text.reason}:</strong> {row.selectionReason}</p>
      {row.highYieldWarning ? <p className="warning-line"><AlertTriangle size={15} />{text.highYieldWarning}</p> : null}
      <div className="featured-actions">
        <button
          className="primary-button"
          type="button"
          data-symbol={row.symbol}
          aria-label={ariaLabel}
          aria-busy={isOpening}
          disabled={isOpening}
          onClick={() => onOpenDetails(row)}
        >
          {isOpening ? <RefreshCcw size={15} className="spin" aria-hidden="true" /> : null}
          {text.viewDetails}
          {!isOpening ? <ArrowUpRight size={15} aria-hidden="true" /> : null}
        </button>
      </div>
    </article>
  );
}

function StockTableRow({
  row,
  text,
  lang,
  onOpenDetails,
  isOpening,
}: {
  row: DividendStockRow;
  text: typeof COPY[LangCode];
  lang: LangCode;
  onOpenDetails: (row: DividendStockRow) => void;
  isOpening: boolean;
}) {
  const ariaLabel = `${text.viewDetailsAriaPrefix} ${row.symbol}`;
  return (
    <tr>
      <td>
        <div className="company-cell">
          <AssetIdentity className="stock-logo small" symbol={row.symbol} name={row.name} assetType={dividendLogoAssetType(row.symbol)} size="sm" decorative />
          <div>
            <strong>{row.name}</strong>
            <span className="symbol">{row.symbol}</span>
          </div>
        </div>
      </td>
      <td className="numeric">{formatCurrency(row.price, row.currency, lang)}</td>
      <td className="numeric">{normalizeRatioToPercent(row.dividendYield) === null ? text.unavailable : formatPercent(row.dividendYield, lang, true)}</td>
      <td className="numeric">{normalizeRatioToPercent(row.payoutRatio) === null ? text.unavailable : formatPercent(row.payoutRatio, lang, true)}</td>
      <td>{hasDate(row.declarationDate) ? formatDate(row.declarationDate, lang) : text.unavailable}</td>
      <td>{hasDate(row.exDividendDate) ? formatDate(row.exDividendDate, lang) : text.unavailable}</td>
      <td>{hasDate(row.recordDate) ? formatDate(row.recordDate, lang) : text.unavailable}</td>
      <td>{hasDate(row.paymentDate) ? formatDate(row.paymentDate, lang) : text.unavailable}</td>
      <td>
        <div className="risk-cell">
          <span className={badgeClass(row.riskTone)}>{row.riskLabel}</span>
          {row.dividendDataLabel === 'latestHistorical' ? <span className="badge tone-info">{text.latestDividendAvailable}</span> : null}
        </div>
      </td>
      <td>
        <button
          className="link-button"
          type="button"
          data-symbol={row.symbol}
          aria-label={ariaLabel}
          aria-busy={isOpening}
          disabled={isOpening}
          onClick={() => onOpenDetails(row)}
        >
          {isOpening ? <RefreshCcw size={14} className="spin" aria-hidden="true" /> : null}
          {text.viewDetails}
          {!isOpening ? <ArrowUpRight size={14} aria-hidden="true" /> : null}
        </button>
      </td>
    </tr>
  );
}

function DividendMobileCard({
  row,
  text,
  lang,
  onOpenDetails,
  isOpening,
}: {
  row: DividendStockRow;
  text: typeof COPY[LangCode];
  lang: LangCode;
  onOpenDetails: (row: DividendStockRow) => void;
  isOpening: boolean;
}) {
  const ariaLabel = `${text.viewDetailsAriaPrefix} ${row.symbol}`;
  return (
    <article className="card">
      <div className="stock-head">
        <AssetIdentity className="stock-logo" symbol={row.symbol} name={row.name} assetType={dividendLogoAssetType(row.symbol)} size="md" decorative />
        <div className="stock-title">
          <h3>{row.name}</h3>
          <p><span className="symbol">{row.symbol}</span> · {row.sectorLabel}</p>
        </div>
        <span className={badgeClass(row.riskTone)}>{row.riskLabel}</span>
      </div>
      <div className="metric-grid">
        <MiniMetric label={text.currentPrice} value={formatCurrency(row.price, row.currency, lang)} />
        <MiniMetric label={text.dividendYield} value={formatPercent(row.dividendYield, lang, true)} />
        <MiniMetric label={text.dividendAmount} value={formatCurrency(row.annualDividend, row.currency, lang)} />
        <MiniMetric label={text.declarationDate} value={formatDate(row.declarationDate, lang)} />
        <MiniMetric label={text.exDividendDate} value={formatDate(row.exDividendDate, lang)} />
        <MiniMetric label={text.recordDate} value={formatDate(row.recordDate, lang)} />
        <MiniMetric label={text.paymentDate} value={formatDate(row.paymentDate, lang)} />
        {row.dividendDataLabel === 'latestHistorical' ? <MiniMetric label={text.dataDate} value={text.latestDividendAvailable} /> : null}
      </div>
      <button
        className="primary-button"
        type="button"
        data-symbol={row.symbol}
        aria-label={ariaLabel}
        aria-busy={isOpening}
        disabled={isOpening}
        onClick={() => onOpenDetails(row)}
      >
        {isOpening ? <RefreshCcw size={15} className="spin" aria-hidden="true" /> : null}
        {text.viewDetails}
        {!isOpening ? <ArrowUpRight size={15} aria-hidden="true" /> : null}
      </button>
    </article>
  );
}

function StockDetailsDrawer({
  row,
  loading,
  loadingSymbol,
  text,
  lang,
  provider,
  lastUpdated,
  onClose,
}: {
  row: DividendStockRow | null;
  loading: boolean;
  loadingSymbol: string | null;
  text: typeof COPY[LangCode];
  lang: LangCode;
  provider: string | null;
  lastUpdated: string | null;
  onClose: () => void;
}) {
  const symbol = (row?.symbol ?? loadingSymbol ?? '').toUpperCase();
  const providerValue = Array.from(new Set([row?.source, row?.dividendMetricSource, provider].filter(Boolean))).join(' / ') || null;
  const dividendStatus = row ? [row.qualityLabel, row.payoutQuality].filter(Boolean).join(' / ') : text.unavailable;
  const showUnavailable = !loading && !row;

  return (
    <div className="details-overlay" onMouseDown={onClose}>
      <aside
        className="details-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dividend-stock-details-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="details-head">
          <div className="details-identity">
            {row ? <AssetIdentity className="stock-logo" symbol={row.symbol} name={row.name} assetType={dividendLogoAssetType(row.symbol)} size="md" decorative /> : null}
            <div>
              <span className="eyebrow">{text.detailsTitle}</span>
              <h2 id="dividend-stock-details-title">{row?.name ?? symbol}</h2>
              {symbol ? <p><span className="symbol">{symbol}</span></p> : null}
            </div>
          </div>
          <button className="details-close" type="button" aria-label={text.closeDetails} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="details-loading" role="status">
            <RefreshCcw size={18} className="spin" aria-hidden="true" />
            <span>{text.detailsLoading}</span>
          </div>
        ) : null}

        {showUnavailable ? (
          <div className="details-alert" role="status">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{text.detailsUnavailable}</span>
            {symbol ? <strong className="symbol">{symbol}</strong> : null}
          </div>
        ) : null}

        {!loading && row ? (
          <>
            <div className="details-grid">
              <DetailItem label={text.company}>{row.name}</DetailItem>
              <DetailItem label={text.symbol}><span className="symbol">{row.symbol}</span></DetailItem>
              <DetailItem label={text.currentPrice}><span className="numeric">{formatCurrency(row.price, row.currency, lang)}</span></DetailItem>
              <DetailItem label={text.currency}><span className="symbol">{row.currency || text.unavailable}</span></DetailItem>
              <DetailItem label={text.dividendYield}><span className="numeric">{formatPercent(row.dividendYield, lang, true)}</span></DetailItem>
              <DetailItem label={text.dividendAmount}><span className="numeric">{formatCurrency(row.annualDividend, row.currency, lang)}</span></DetailItem>
              <DetailItem label={text.payoutRatio}><span className="numeric">{formatPercent(row.payoutRatio, lang, true)}</span></DetailItem>
              <DetailItem label={text.declarationDate}>{formatDate(row.declarationDate, lang)}</DetailItem>
              <DetailItem label={text.exDividendDate}>{formatDate(row.exDividendDate, lang)}</DetailItem>
              <DetailItem label={text.recordDate}>{formatDate(row.recordDate, lang)}</DetailItem>
              <DetailItem label={text.paymentDate}>{formatDate(row.paymentDate, lang)}</DetailItem>
              {row.dividendDataLabel === 'latestHistorical' ? <DetailItem label={text.dataDate}>{text.latestDividendAvailable}</DetailItem> : null}
              <DetailItem label={text.sector}>{row.sectorLabel}</DetailItem>
              <DetailItem label={text.riskLevel}><span className={badgeClass(row.riskTone)}>{row.riskLabel}</span></DetailItem>
              <DetailItem label={text.dividendStatus}>{dividendStatus}</DetailItem>
              <DetailItem label={text.provider}>{providerValue ?? text.unavailable}</DetailItem>
              <DetailItem label={text.lastUpdate}>{formatDateTime(lastUpdated, lang)}</DetailItem>
            </div>

            <div className="details-disclaimer">
              <strong>{text.disclaimer}</strong>
              <p>{text.legal}</p>
              <p>{text.aiNotice}</p>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="details-item">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function DividendMetricGrid({ row, text, lang, compact }: { row: DividendStockRow; text: typeof COPY[LangCode]; lang: LangCode; compact?: boolean }) {
  return (
    <div className="metric-grid">
      <MiniMetric label={text.dividendYield} value={formatPercent(row.dividendYield, lang, true)} />
      <MiniMetric label={text.dividendAmount} value={formatCurrency(row.annualDividend, row.currency, lang)} />
      <MiniMetric label={text.exDividendDate} value={formatDate(row.exDividendDate, lang)} />
      <MiniMetric label={text.paymentDate} value={formatDate(row.paymentDate, lang)} />
      {!compact ? <MiniMetric label={text.payoutRatio} value={formatPercent(row.payoutRatio, lang, true)} /> : null}
      {!compact ? <MiniMetric label={text.declarationDate} value={formatDate(row.declarationDate, lang)} /> : null}
      {!compact ? <MiniMetric label={text.recordDate} value={formatDate(row.recordDate, lang)} /> : null}
      {row.dividendDataLabel === 'latestHistorical' ? <MiniMetric label={text.dataDate} value={text.latestDividendAvailable} /> : null}
      {!compact && row.dividendMetricSource ? <MiniMetric label={text.source} value={row.dividendMetricSource} /> : null}
    </div>
  );
}

function EventList({ events, text, lang, compact }: { events: DividendEvent[]; text: typeof COPY[LangCode]; lang: LangCode; compact?: boolean }) {
  if (events.length === 0) {
    return (
      <DividendEventEmptyState
        text={text}
        title={text.noCalendarEventsFiltered}
        body={text.noCalendarTextFiltered}
        providerLabel={text.providerStatus}
        providerTone="neutral"
        compact={compact}
      />
    );
  }
  return (
    <div className="event-list">
      {events.map(event => {
        const companyName = event.companyName ?? event.name;
        const primaryDate = event.exDividendDate ?? event.paymentDate ?? event.recordDate ?? event.declarationDate ?? event.date;
        const statusLabel = event.status === 'announced'
          ? text.statusAnnounced
          : event.status === 'estimated'
            ? text.statusEstimated
            : text.statusScheduled;
        const amount = event.dividendAmount ?? event.annualDividend ?? null;
        return (
          <article className={`event-row dividend-calendar-row ${compact ? 'compact' : ''}`} key={event.id}>
            <div className="event-date">
              <CalendarDays size={18} />
              <div>
                <strong>{formatDate(primaryDate, lang)}</strong>
                <span>{event.type || text.eventType}</span>
              </div>
            </div>
            <div className="event-identity">
              <AssetIdentity symbol={event.symbol} name={companyName} assetType={dividendLogoAssetType(event.symbol)} size="sm" decorative />
              <div>
                <strong>{companyName}</strong>
                <p><span className="symbol">{event.symbol}</span> · {event.market} · {event.currency}</p>
              </div>
            </div>
            <div className="event-badges">
              <span className={badgeClass(event.status === 'announced' ? 'positive' : 'info')}>{statusLabel}</span>
              <span className="badge tone-neutral">{event.source || event.provider || text.provider}</span>
            </div>
            {!compact ? (
              <div className="event-detail-grid">
                <MiniMetric label={text.dividendAmount} value={formatCurrency(amount, event.currency, lang)} />
                <MiniMetric label={text.dividendYield} value={formatPercent(event.dividendYield, lang, true)} />
                <MiniMetric label={text.exDividendDate} value={formatDate(event.exDividendDate, lang)} />
                <MiniMetric label={text.recordDate} value={formatDate(event.recordDate, lang)} />
                <MiniMetric label={text.paymentDate} value={formatDate(event.paymentDate, lang)} />
                <MiniMetric label={text.declarationDate} value={formatDate(event.declarationDate, lang)} />
              </div>
            ) : (
              <span className="numeric">{formatCurrency(amount, event.currency, lang)}</span>
            )}
          </article>
        );
      })}
    </div>
  );
}

function DividendEventEmptyState({
  text,
  title,
  body,
  providerLabel,
  providerTone,
  onRetry,
  onReset,
  canReset = false,
  compact = false,
}: {
  text: typeof COPY[LangCode];
  title: string;
  body: string;
  providerLabel: string;
  providerTone: Tone;
  onRetry?: () => void;
  onReset?: () => void;
  canReset?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`dividend-event-empty ${compact ? 'compact' : ''}`} role="status">
      <div className="event-empty-icon">
        <CalendarDays size={20} />
      </div>
      <div className="event-empty-copy">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <div className="event-empty-actions">
        <span className={badgeClass(providerTone)}>{providerLabel}</span>
        {onRetry ? (
          <button className="ghost-button" type="button" onClick={onRetry}>
            <RefreshCcw size={16} />
            {text.retry}
          </button>
        ) : null}
        {onReset ? (
          <button className="ghost-button" type="button" onClick={onReset} disabled={!canReset}>
            <Filter size={16} />
            {text.clearFilters}
          </button>
        ) : null}
      </div>
    </div>
  );
}
function NewsCard({ item, text, lang, showOriginal, toggleOriginal }: { item: DividendNewsItem; text: typeof COPY[LangCode]; lang: LangCode; showOriginal: boolean; toggleOriginal: () => void }) {
  const url = safeUrl(item.url);
  const title = safeArticleTitle(item, showOriginal);
  const summary = safeArticleSummary(item, showOriginal);
  const impact = newsImpact(item);
  const type = newsTypes(item)[0] ?? null;
  return (
    <article className="card article-card">
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
        <span>{sectorLabel(newsSector(item), lang)}</span>
        {type ? <span>{newsTypeLabel(type, text)}</span> : null}
        {item.isTranslated && !showOriginal ? <span className="badge tone-info">{text.machineTranslation}</span> : null}
      </div>
      <h3 className="article-title" dir="auto">{title}</h3>
      {summary ? <p className="article-summary" dir="auto">{summary}</p> : null}
      <div className="metric-grid">
        <MiniMetric label={text.source} value={item.source || text.unavailable} />
        <MiniMetric label={text.publishedDate} value={formatDateTime(item.publishedAt, lang)} />
        <div className="mini-metric asset-mini-metric">
          <span>{text.relatedSymbol}</span>
          {item.ticker ? (
            <AssetIdentity
              symbol={item.ticker}
              name={item.companyName ?? item.ticker}
              assetType={dividendLogoAssetType(item.ticker)}
              size="sm"
              variant="badge"
              labelClassName="asset-mini-name"
              symbolClassName="asset-mini-symbol"
            />
          ) : <strong>{text.unavailable}</strong>}
        </div>
        <MiniMetric label={text.companyName} value={item.companyName ?? text.unavailable} />
        <MiniMetric label={text.impactLevel} value={newsImpactLabel(impact, text)} />
        <MiniMetric label={text.providerLabel} value={newsProvider(item)} />
        <MiniMetric label={text.marketContext} value={typeof item.changePercent === 'number' ? formatPercent(item.changePercent, lang) : text.unavailable} />
      </div>
      <div className="article-actions">
        {url ? <a className="primary-button" href={url} target="_blank" rel="noopener noreferrer nofollow">{text.readArticle}<ExternalLink size={16} /></a> : null}
        {item.titleOriginal && item.titleOriginal !== item.title ? <button className="ghost-button" type="button" onClick={toggleOriginal}>{showOriginal ? text.translatedText : text.originalText}</button> : null}
      </div>
    </article>
  );
}

function CompactNewsRow({ item, text, lang }: { item: DividendNewsItem; text: typeof COPY[LangCode]; lang: LangCode }) {
  const url = safeUrl(item.url);
  const summary = safeArticleSummary(item, false);
  return (
    <article className="compact-row">
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
      </div>
      <h3 className="article-title" dir="auto">{safeArticleTitle(item, false)}</h3>
      {summary ? <p className="compact-summary" dir="auto">{summary}</p> : null}
      <div className="row-between">
        {item.ticker ? (
          <AssetIdentity
            symbol={item.ticker}
            name={item.companyName ?? item.ticker}
            assetType={dividendLogoAssetType(item.ticker)}
            size="xs"
            variant="badge"
            className="compact-asset-badge"
            showName={false}
            symbolClassName="compact-asset-symbol"
          />
        ) : <span className="badge tone-info">{sectorLabel(newsSector(item), lang)}</span>}
        {url ? <a className="link-button" href={url} target="_blank" rel="noopener noreferrer nofollow">{text.readArticle}<ArrowUpRight size={15} /></a> : null}
      </div>
    </article>
  );
}

function StrategyComparison({ text, lang }: { text: typeof COPY[LangCode]; lang: LangCode }) {
  const rows: Record<LangCode, Array<[string, string, string]>> = {
    ar: [
      [text.typicalYield, 'متوسط إلى منخفض', 'مرتفع نسبياً'],
      [text.payoutProfile, 'أكثر تحفظاً غالباً', 'قد يكون أعلى'],
      [text.volatility, 'أقل تركيزاً على العائد الحالي', 'حساس لاستدامة التوزيع'],
      [text.horizon, 'طويل الأجل', 'دخل حالي'],
      [text.coreRisk, 'تباطؤ نمو التوزيعات', 'خفض أو إيقاف التوزيعات'],
    ],
    en: [
      [text.typicalYield, 'Moderate to lower', 'Relatively high'],
      [text.payoutProfile, 'Usually more conservative', 'May be higher'],
      [text.volatility, 'Less focused on current yield', 'Sensitive to dividend sustainability'],
      [text.horizon, 'Long term', 'Current income'],
      [text.coreRisk, 'Dividend growth slowdown', 'Dividend cut or suspension'],
    ],
    fr: [
      [text.typicalYield, 'Modéré à faible', 'Relativement élevé'],
      [text.payoutProfile, 'Souvent plus conservateur', 'Peut être plus élevé'],
      [text.volatility, 'Moins centré sur le rendement actuel', 'Sensible à la durabilité'],
      [text.horizon, 'Long terme', 'Revenu actuel'],
      [text.coreRisk, 'Ralentissement de croissance', 'Réduction ou suspension'],
    ],
  };
  return (
    <section className="section">
      <SectionHeader title={text.strategyTitle} description={text.strategyDescription} />
      <div className="strategy-grid">
        <article className="strategy-card">
          <h3>{text.incomeGrowth}</h3>
          <p>{text.incomeGrowthBody}</p>
        </article>
        <article className="strategy-card">
          <h3>{text.highIncome}</h3>
          <p>{text.highIncomeBody}</p>
        </article>
      </div>
      <div className="comparison-table">
        {rows[lang].map(([label, left, right]) => (
          <div className="comparison-row" key={label}>
            <strong>{label}</strong>
            <span>{left}</span>
            <span>{right}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodologyBox({ text, open, setOpen }: { text: typeof COPY[LangCode]; open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <div className="methodology-box">
      <button className="guide-button" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span><Info size={16} />{text.methodology}</span>
        {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {open ? <p className="guide-content">{text.methodologyBody}</p> : null}
    </div>
  );
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function StateBox({ tone, icon: Icon, title, body, actionLabel, onAction }: { tone: Tone; icon: LucideIcon; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className={`state-box tone-${tone}`} role={tone === 'warning' || tone === 'negative' ? 'alert' : 'status'}>
      <div className="state-copy">
        <Icon size={21} />
        <div>
          <strong>{title}</strong>
          {body ? <p>{body}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? <button className="ghost-button" type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return <div className="featured-grid">{Array.from({ length: count }).map((_, index) => <div className="card skeleton" key={index} />)}</div>;
}

function DividendStyles() {
  return (
    <style jsx global>{`
      .page {
        min-height: 100dvh;
        background: var(--background);
        color: var(--foreground);
      }
      .main {
        min-width: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: clip;
      }
      .container {
        width: 100%;
        min-width: 0;
        display: grid;
        gap: 22px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 22px;
        align-items: stretch;
        padding: clamp(20px, 2.4vw, 26px);
        border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
        border-radius: var(--radius-panel);
        background: var(--hero-gradient);
        color: var(--hero-foreground);
        box-shadow: var(--shadow-card);
        overflow: hidden;
        min-width: 0;
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
      .article-meta,
      .metric-label,
      .ticker-metrics {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .eyebrow {
        width: fit-content;
        padding: 7px 12px;
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(32px, 4vw, 46px);
        line-height: 1.08;
        letter-spacing: 0;
      }
      .hero p {
        margin: 0;
        max-width: 850px;
        color: color-mix(in srgb, var(--hero-foreground) 83%, transparent);
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
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--hero-foreground) 9%, transparent);
        border: 1px solid color-mix(in srgb, var(--hero-foreground) 14%, transparent);
        color: color-mix(in srgb, var(--hero-foreground) 90%, transparent);
        font-size: 12px;
        font-weight: 400;
      }
      .status-dot::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: var(--radius-pill);
        background: var(--primary);
      }
      .status-ok::before { background: var(--success); }
      .status-warn::before { background: var(--danger); }
      .hero-panel {
        display: grid;
        gap: 18px;
        align-content: space-between;
        padding: 20px;
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--hero-foreground) 11%, transparent);
        border: 1px solid color-mix(in srgb, var(--hero-foreground) 20%, transparent);
        backdrop-filter: blur(8px);
        min-width: 0;
      }
      .hero-panel span {
        color: var(--hero-foreground);
        font-size: 12px;
        font-weight: 600;
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
      .guide-button {
        min-height: 44px;
        border-radius: var(--radius-control);
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        font: inherit;
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
      }
      .refresh-button,
      .primary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: var(--primary);
        color: var(--foreground);
        border: 0;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        box-shadow: var(--shadow-card);
      }
      .refresh-button:hover:not(:disabled),
      .primary-button:hover:not(:disabled),
      .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .refresh-button:disabled,
      .primary-button:disabled,
      .link-button:disabled,
      .ghost-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }
      .spin { animation: spin 850ms linear infinite; }
      .tabs {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding: 8px;
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        border-radius: var(--radius-card);
        background: color-mix(in srgb, var(--surface) 78%, transparent);
        box-shadow: var(--shadow-card);
      }
      .tab {
        flex: 0 0 auto;
        padding: 0 18px;
        background: var(--surface);
        color: var(--foreground-secondary);
        font-weight: 600;
        cursor: pointer;
      }
      .tab.active {
        color: var(--foreground);
        border-color: transparent;
        background: var(--primary);
        box-shadow: var(--shadow-card);
      }
      .section,
      .panel,
      .card,
      .footer-note,
      .ticker-panel,
      .state-box {
        max-width: 100%;
        min-width: 0;
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        background: color-mix(in srgb, var(--surface) 90%, transparent);
        border-radius: var(--radius-panel);
        box-shadow: var(--shadow-card);
      }
      .section,
      .panel { padding: 22px; min-width: 0; }
      .stack { display: grid; gap: 18px; min-width: 0; }
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
      }
      .section-title h2,
      .section-title h3 {
        margin: 0;
        color: var(--foreground);
        font-size: clamp(20px, 2.4vw, 26px);
        line-height: 1.25;
      }
      .section-title p {
        margin: 0;
        color: var(--foreground-secondary);
        font-size: 14px;
        line-height: 1.8;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 14px;
      }
      .metric-card {
        display: grid;
        gap: 10px;
        min-width: 0;
        padding: 18px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface-muted);
      }
      .metric-icon {
        display: inline-grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: var(--radius-control);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--primary);
      }
      .metric-label {
        color: var(--foreground-secondary);
        font-size: 12px;
        font-weight: 600;
      }
      .metric-value {
        color: var(--foreground);
        font-size: 24px;
        font-weight: 600;
        line-height: 1.1;
      }
      .metric-help {
        color: var(--foreground-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .ticker-panel {
        padding: 10px;
        overflow: hidden;
        min-width: 0;
      }
      .ticker-viewport {
        width: 100%;
        min-width: 0;
        overflow: hidden;
        mask-image: none;
      }
      .ticker-track,
      .ticker-set {
        display: flex;
        gap: 10px;
        align-items: stretch;
        width: max-content;
      }
      .ticker-track {
        animation: dividendTickerMarquee 52s linear infinite;
        will-change: transform;
      }
      .ticker-set {
        flex: none;
      }
      .ticker-item {
        flex: 0 0 206px;
        width: 206px;
        max-width: 206px;
        display: grid;
        gap: 5px;
        padding: 9px 10px;
        border-radius: var(--radius-card);
        background: var(--surface);
        border: 1px solid color-mix(in srgb, var(--accent) 13%, transparent);
        min-width: 0;
      }
      .ticker-skeleton-track {
        animation: none;
        width: 100%;
      }
      .ticker-empty {
        min-height: 62px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--foreground-muted);
        font-size: 13px;
        font-weight: 600;
        text-align: center;
      }
      .ticker-top,
      .stock-head,
      .article-actions,
      .row-between,
      .filter-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ticker-identity {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .ticker-logo {
        flex: 0 0 auto;
      }
      .ticker-name,
      .muted {
        color: var(--foreground-muted);
      }
      .ticker-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        font-weight:500;
      }
      .ticker-metrics {
        justify-content: space-between;
        color: var(--foreground-secondary);
        font-size: 10.5px;
        gap: 6px;
        min-width: 0;
      }
      .ticker-metrics span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .symbol,
      .numeric {
        direction: ltr;
        unicode-bidi: isolate;
        font-variant-numeric: tabular-nums;
      }
      .symbol {
        color: var(--foreground);
        font-weight: 600;
      }
      .ticker-item .symbol {
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }
      .ticker-item .numeric {
        font-size: 12px;
        font-weight: 600;
      }
      .ticker-item .badge {
        min-height: 22px;
        padding: 3px 7px;
        font-size: 10px;
      }
      .tone-positive { color: var(--success); background: color-mix(in srgb, var(--success) 10%, transparent); border-color: color-mix(in srgb, var(--success) 22%, transparent); }
      .tone-negative { color: var(--danger); background: color-mix(in srgb, var(--danger) 9%, transparent); border-color: color-mix(in srgb, var(--danger) 20%, transparent); }
      .tone-warning { color: var(--warning); background: var(--warning-soft); border-color: color-mix(in srgb, var(--warning) 24%, var(--border)); }
      .tone-neutral { color: var(--foreground-muted); background: var(--surface-muted); border-color: var(--border); }
      .tone-info { color: var(--info); background: var(--info-soft); border-color: color-mix(in srgb, var(--info) 22%, var(--border)); }
      .badge,
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: fit-content;
        min-height: 28px;
        padding: 5px 10px;
        border-radius: var(--radius-pill);
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .workspace-grid {
        display: grid;
        grid-template-columns: minmax(0, 2.35fr) minmax(340px, 0.95fr);
        gap: 22px;
        align-items: start;
        min-width: 0;
      }
      .featured-grid,
      .news-grid,
      .guide-grid,
      .strategy-grid {
        display: grid;
        gap: 14px;
      }
      .featured-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: stretch;
        gap: 16px;
      }
      .news-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        margin-top: 16px;
      }
      .guide-grid,
      .strategy-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      }
      .card {
        display: grid;
        gap: 14px;
        min-width: 0;
        padding: 18px;
      }
      .featured-card {
        height: 100%;
        grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
        gap: 15px;
        padding: 20px;
        border-radius: var(--radius-card);
        background: var(--surface-muted);
      }
      .featured-card .stock-head {
        align-items: flex-start;
      }
      .featured-card .stock-title h3 {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        min-height: 2.9em;
      }
      .featured-card .muted {
        margin: 0;
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        line-height: 1.7;
      }
      .featured-actions {
        display: flex;
        align-items: flex-end;
        margin-top: auto;
      }
      .featured-actions .primary-button {
        width: 100%;
      }
      .stock-logo {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        flex: 0 0 52px;
        border-radius: var(--radius-card);
        color: var(--primary);
        background: var(--surface-muted);
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        font-weight: 600;
      }
      .stock-logo.asset-avatar,
      .event-identity .asset-avatar,
      .asset-mini-metric .asset-avatar,
      .compact-asset-badge .asset-avatar,
      .sfm-stock-ticker-logo .asset-avatar {
        background: var(--surface);
        border-color: color-mix(in srgb, var(--primary) 24%, transparent);
        color: var(--primary);
        box-shadow: var(--shadow-card);
      }
      .stock-logo img,
      .event-identity .asset-avatar img,
      .asset-mini-metric .asset-avatar img,
      .compact-asset-badge .asset-avatar img,
      .sfm-stock-ticker-logo .asset-avatar img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        padding: 7px;
        opacity: 1;
        filter: none;
      }
      .stock-logo > span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-inline: 2px;
      }
      .stock-logo.small {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-control);
      }
      .stock-title {
        min-width: 0;
        flex: 1;
      }
      .stock-title h3,
      .article-title,
      .strategy-card h3 {
        margin: 0;
        color: var(--foreground);
        font-size: 17px;
        line-height: 1.45;
        font-weight: 600;
      }
      .stock-title p,
      .event-row p {
        margin: 4px 0 0;
        color: var(--foreground-secondary);
        font-size: 13px;
      }
      .score-band {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        border: 1px solid color-mix(in srgb, var(--success) 14%, transparent);
      }
      .score-band strong {
        font-size: 24px;
        color: var(--success);
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .mini-metric {
        min-width: 0;
        padding: 12px;
        border-radius: var(--radius-control);
        background: var(--surface);
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
      }
      .mini-metric span {
        display: block;
        color: var(--foreground-secondary);
        font-size: 11px;
        font-weight: 600;
      }
      .mini-metric strong {
        display: block;
        margin-top: 5px;
        color: var(--foreground);
        font-size: 14px;
        font-weight: 600;
      }
      .asset-mini-metric {
        display: grid;
        align-content: start;
        gap: 8px;
      }
      .asset-mini-metric strong {
        margin: 0;
      }
      .asset-mini-name {
        color: var(--foreground);
        font-size: 13px;
      }
      .asset-mini-symbol,
      .compact-asset-symbol {
        color: var(--foreground-secondary);
      }
      .compact-asset-badge {
        max-width: 160px;
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        padding: 4px 8px;
        color: var(--primary);
      }
      .dividend-data-notice,
      .dividend-empty-inline {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        color: var(--info);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.55;
      }
      .dividend-data-notice {
        padding: 12px 13px;
        border-radius: var(--radius-control);
      }
      .dividend-empty-inline {
        width: fit-content;
        max-width: 100%;
        padding: 6px 9px;
        border-radius: var(--radius-pill);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .warning-line {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
        color: var(--danger);
        font-size: 13px;
        line-height: 1.7;
      }
      .details-overlay {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: flex;
        justify-content: flex-end;
        padding: 18px;
        background: color-mix(in srgb, var(--accent) 46%, transparent);
        backdrop-filter: blur(5px);
      }
      .page[dir="rtl"] .details-overlay {
        justify-content: flex-start;
      }
      .details-drawer {
        width: min(560px, 100%);
        max-height: 100%;
        overflow: auto;
        display: grid;
        align-content: start;
        gap: 16px;
        padding: 20px;
        border-radius: var(--radius-panel);
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        background: var(--surface);
        box-shadow: var(--shadow-card);
      }
      .details-head,
      .details-identity {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }
      .details-head {
        justify-content: space-between;
      }
      .details-identity {
        flex: 1;
      }
      .details-identity > div {
        min-width: 0;
      }
      .details-identity h2 {
        margin: 5px 0 0;
        color: var(--foreground);
        font-size: clamp(21px, 2.8vw, 30px);
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .details-identity p {
        margin: 5px 0 0;
      }
      .details-close {
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        display: inline-grid;
        place-items: center;
        border-radius: var(--radius-control);
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        background: var(--surface);
        color: var(--primary);
        cursor: pointer;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }
      .details-close:hover,
      .details-close:focus-visible {
        outline: none;
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--accent) 50%, transparent);
        background: color-mix(in srgb, var(--accent) 10%, transparent);
      }
      .details-loading,
      .details-alert {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px 13px;
        border-radius: var(--radius-card);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.6;
      }
      .details-loading {
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        color: var(--info);
      }
      .details-alert {
        flex-wrap: wrap;
        border: 1px solid color-mix(in srgb, var(--danger) 24%, transparent);
        background: color-mix(in srgb, var(--danger) 11%, transparent);
        color: var(--danger);
      }
      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .details-item {
        min-width: 0;
        display: grid;
        gap: 6px;
        padding: 12px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        background: var(--surface);
      }
      .details-item span {
        color: var(--foreground-secondary);
        font-size: 11px;
        font-weight: 600;
      }
      .details-item strong {
        min-width: 0;
        color: var(--foreground);
        font-size: 14px;
        line-height: 1.55;
        overflow-wrap: anywhere;
      }
      .details-disclaimer {
        display: grid;
        gap: 7px;
        padding: 14px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface-muted);
      }
      .details-disclaimer strong {
        color: var(--foreground);
      }
      .details-disclaimer p {
        margin: 0;
        color: var(--foreground-secondary);
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.8;
      }
      .filter-panel {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
        align-items: end;
        padding: 16px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface);
      }
      .news-filter-panel {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }
      .calendar-filter-panel {
        margin: 12px 0 16px;
      }
      .provider-status-card {
        display: grid;
        gap: 12px;
        margin-bottom: 16px;
        padding: 14px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface);
        box-shadow: var(--shadow-card);
      }
      .provider-status-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .provider-status-grid {
        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      }
      .calendar-filter-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .field {
        display: grid;
        gap: 7px;
        min-width: 0;
      }
      .field label {
        color: var(--foreground-secondary);
        font-size: 12px;
        font-weight: 600;
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
        color: var(--foreground-muted);
        pointer-events: none;
      }
      .filter-input,
      .filter-select {
        width: 100%;
        background: var(--surface);
        color: var(--foreground);
        padding: 0 13px;
        outline: none;
      }
      .filter-input {
        padding-inline-start: 40px;
      }
      .filter-input.no-icon {
        padding-inline-start: 13px;
      }
      .filter-input:focus,
      .filter-select:focus,
      .tab:focus-visible,
      .refresh-button:focus-visible,
      .primary-button:focus-visible,
      .ghost-button:focus-visible,
      .guide-button:focus-visible,
      .link-button:focus-visible,
      .chip:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent) 24%, transparent);
        outline-offset: 2px;
        border-color: color-mix(in srgb, var(--accent) 55%, transparent);
      }
      .ghost-button,
      .chip,
      .link-button,
      .guide-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        background: var(--surface);
        color: var(--primary);
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .ghost-button:hover:not(:disabled),
      .link-button:hover:not(:disabled),
      .guide-button:hover:not(:disabled),
      .chip:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--accent) 42%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
        box-shadow: var(--shadow-md);
      }
      .chip {
        min-height: 38px;
        padding: 0 13px;
      }
      .chip.active {
        color: var(--foreground);
        border-color: transparent;
        background: var(--primary);
      }
      .table-wrap {
        margin-top: 16px;
        overflow-x: auto;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface);
      }
      .stock-table {
        width: 100%;
        min-width: 1120px;
        border-collapse: separate;
        border-spacing: 0;
      }
      .stock-table th,
      .stock-table td {
        padding: 14px;
        text-align: start;
        border-bottom: 1px solid color-mix(in srgb, var(--accent) 11%, transparent);
        font-size: 13px;
        vertical-align: middle;
      }
      .stock-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--surface);
        color: var(--foreground-secondary);
        font-weight: 600;
      }
      .company-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 210px;
        max-width: 320px;
      }
      .company-cell div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      .company-cell strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .risk-cell {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
      }
      .mobile-card-list {
        display: none;
        margin-top: 16px;
        gap: 14px;
      }
      .event-list {
        display: grid;
        gap: 10px;
      }
      .event-row {
        display: grid;
        grid-template-columns: minmax(140px, 170px) minmax(0, 1fr) auto auto;
        gap: 12px;
        align-items: center;
        padding: 13px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 13%, transparent);
        background: var(--surface);
      }
      .dividend-calendar-row {
        grid-template-columns: minmax(150px, 190px) minmax(220px, 1fr) auto;
        align-items: start;
      }
      .dividend-calendar-row.compact {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 14px;
        background: var(--surface-muted);
      }
      .dividend-calendar-row.compact .event-date {
        justify-content: space-between;
        padding-bottom: 10px;
        border-bottom: 1px solid color-mix(in srgb, var(--accent) 10%, transparent);
      }
      .dividend-calendar-row.compact .event-date strong {
        font-size: 14px;
      }
      .dividend-calendar-row.compact .event-identity strong {
        font-size: 14px;
      }
      .dividend-calendar-row.compact .event-badges {
        justify-content: flex-start;
      }
      .dividend-calendar-row.compact > .numeric {
        justify-self: start;
        color: var(--success);
        font-weight: 600;
      }
      .event-date {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--foreground);
      }
      .event-date > div {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      .event-date span {
        color: var(--primary);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .event-identity {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .event-identity > div {
        min-width: 0;
      }
      .event-identity strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .event-badges {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }
      .event-detail-grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
        gap: 10px;
      }
      .article-title {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        word-break: break-word;
      }
      .article-summary {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        margin: 0;
        color: var(--foreground-secondary);
        font-size: 14px;
        line-height: 1.75;
      }
      .article-meta {
        flex-wrap: wrap;
        color: var(--foreground-muted);
        font-size: 12px;
        font-weight: 400;
      }
      .article-actions {
        margin-top: auto;
        flex-wrap: wrap;
      }
      .side-news {
        display: grid;
        gap: 12px;
      }
      .side-column {
        gap: 16px;
      }
      .side-column .panel {
        padding: 20px;
      }
      .side-column .section-header {
        margin-bottom: 14px;
        gap: 11px;
      }
      .side-column .section-title h2,
      .side-column .section-title h3 {
        font-size: 19px;
      }
      .side-column .section-title p {
        font-size: 13px;
        line-height: 1.7;
      }
      .side-column .guide-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .compact-row {
        display: grid;
        gap: 10px;
        padding: 15px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface-muted);
      }
      .compact-row .article-title {
        font-size: 14.5px;
        line-height: 1.55;
      }
      .compact-summary {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        margin: 0;
        color: var(--foreground-secondary);
        font-size: 12.5px;
        line-height: 1.65;
      }
      .compact-row .link-button {
        min-height: 36px;
        padding-inline: 10px;
      }
      .strategy-card {
        padding: 18px;
        border-radius: var(--radius-card);
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        background: var(--surface-muted);
      }
      .strategy-card p {
        margin: 8px 0 0;
        color: var(--foreground-secondary);
        line-height: 1.75;
      }
      .comparison-table {
        display: grid;
        margin-top: 14px;
        border-radius: var(--radius-card);
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
        background: var(--surface);
        box-shadow: var(--shadow-card);
      }
      .comparison-row {
        display: grid;
        grid-template-columns: minmax(160px, 220px) minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 15px;
        background: var(--surface);
        border-bottom: 1px solid color-mix(in srgb, var(--accent) 10%, transparent);
      }
      .comparison-row:nth-child(even) {
        background: var(--surface);
      }
      .comparison-row strong {
        color: var(--foreground);
        font-size: 13px;
        font-weight: 600;
      }
      .comparison-row span {
        min-width: 0;
        padding: 10px 12px;
        border: 1px solid color-mix(in srgb, var(--accent) 10%, transparent);
        border-radius: var(--radius-control);
        background: color-mix(in srgb, var(--surface) 72%, transparent);
        color: var(--foreground-secondary);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.55;
      }
      .methodology-box {
        margin-bottom: 14px;
      }
      .guide-button {
        width: 100%;
        justify-content: space-between;
        padding: 0 14px;
        text-align: start;
        min-width: 0;
      }
      .guide-button span {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
        line-height: 1.45;
        overflow-wrap: anywhere;
        white-space: normal;
      }
      .guide-button svg {
        flex: 0 0 auto;
      }
      .guide-content {
        margin-top: 10px;
        color: var(--foreground-secondary);
        font-size: 14px;
        line-height: 1.8;
        overflow-wrap: anywhere;
        animation: dividendGuideOpen 180ms ease-out;
      }
      @keyframes dividendGuideOpen {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .footer-note {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 18px;
        color: var(--foreground-muted);
        line-height: 1.8;
      }
      .footer-note strong {
        display: block;
        color: var(--foreground);
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
      }
      .dividend-event-empty {
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 16px;
        border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
        border-radius: var(--radius-card);
        background: var(--surface);
        text-align: start;
        box-shadow: var(--shadow-card);
      }
      .dividend-event-empty.compact {
        padding: 14px;
      }
      .event-empty-icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        border-radius: var(--radius-control);
        background: color-mix(in srgb, var(--accent) 10%, transparent);
        color: var(--primary);
      }
      .event-empty-copy {
        flex: 1;
        min-width: 0;
      }
      .event-empty-copy strong {
        display: block;
        color: var(--foreground);
        font-size: 15px;
        font-weight: 600;
        line-height: 1.35;
      }
      .event-empty-copy p {
        margin: 4px 0 0;
        color: var(--foreground-secondary);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.8;
      }
      .event-empty-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
      }
      .event-empty-hints {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .event-empty-hints span {
        border: 1px solid color-mix(in srgb, var(--accent) 14%, transparent);
        border-radius: var(--radius-pill);
        background: color-mix(in srgb, var(--surface) 90%, transparent);
        color: var(--info);
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
      }










      .state-copy {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .state-copy p {
        margin: 4px 0 0;
        color: var(--foreground-secondary);
      }
      .skeleton {
        position: relative;
        overflow: hidden;
        min-height: 120px;
        border-radius: var(--radius-card);
        background: var(--surface);
      }
      .skeleton::after {
        content: '';
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: transparent;
        animation: shimmer 1.4s infinite;
      }
      @keyframes dividendTickerMarquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @keyframes shimmer { 100% { transform: translateX(100%); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (hover: hover) and (pointer: fine) {
        .ticker-panel:hover .ticker-track {
          animation-play-state: paused;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
      }
      @media (max-width: 1080px) {
        .hero,
        .workspace-grid {
          grid-template-columns: 1fr;
        }
        .filter-panel,
        .news-filter-panel {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 900px) {
        .page[dir="rtl"] .main,
        .page[dir="ltr"] .main {
          padding-inline: 16px;
          padding-top: 18px;
        }
        .hero {
          padding: 20px;
          border-radius: var(--radius-card);
        }
        .section,
        .panel {
          padding: 16px;
        }
        .summary-grid,
        .news-grid,
        .guide-grid,
        .strategy-grid {
          grid-template-columns: 1fr;
        }
        .featured-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .filter-panel,
        .news-filter-panel {
          grid-template-columns: 1fr;
        }
        .section-header,
        .stock-head,
        .article-actions,
        .row-between,
        .filter-actions {
          align-items: stretch;
          flex-direction: column;
        }
        .featured-card .stock-head {
          align-items: flex-start;
          flex-direction: row;
        }
        .primary-button,
        .ghost-button,
        .refresh-button {
          width: 100%;
        }
        .table-wrap {
          display: none;
        }
        .mobile-card-list {
          display: grid;
        }
        .details-overlay,
        .page[dir="rtl"] .details-overlay {
          align-items: flex-end;
          justify-content: center;
          padding: 10px;
        }
        .details-drawer {
          width: 100%;
          max-height: 90vh;
          border-radius: var(--radius-panel) var(--radius-panel) 0 0;
        }
        .details-head {
          gap: 10px;
        }
        .details-grid {
          grid-template-columns: 1fr;
        }
        .event-row {
          grid-template-columns: 1fr;
        }
        .dividend-calendar-row {
          grid-template-columns: 1fr;
        }
        .event-badges,
        .calendar-filter-actions,
        .event-empty-actions {
          justify-content: flex-start;
        }
        .dividend-event-empty {
          align-items: flex-start;
          flex-direction: column;
          text-align: start;
        }
        .event-empty-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-card);
        }
        .event-empty-hints {
          justify-content: flex-start;
        }
        .comparison-row {
          grid-template-columns: 1fr;
        }
        .ticker-panel {
          padding: 8px;
        }
        .ticker-viewport {
          mask-image: none;
        }
        .ticker-track,
        .ticker-set {
          gap: 8px;
        }
        .ticker-track {
          animation-duration: 42s;
        }
        .ticker-item {
          flex-basis: 180px;
          width: 180px;
          max-width: 180px;
          padding: 8px 9px;
        }
        .ticker-metrics {
          display: grid;
          gap: 3px;
        }
      }
      .page { color: var(--foreground); font-family: var(--font-ui); }
      .hero { color: var(--hero-foreground); box-shadow: var(--shadow-md); }
      .hero h1 { color: var(--hero-foreground); font-weight: 600; }
      .hero .eyebrow { color: var(--hero-foreground-muted); }
      .section,
      .panel,
      .card,
      .stock-card,
      .news-card,
      .filter-panel,
      .details-panel {
        background: var(--surface);
        border-color: var(--border);
        color: var(--foreground);
        box-shadow: var(--shadow-card);
      }
      .page :is(h2, h3) { color: var(--foreground); font-weight: 600; }
      .page :is(button, input, select) { font-family: var(--font-ui); }
      .page :is(button, a, input, select):focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        box-shadow: var(--focus-shadow);
      }
      .numeric,
      .metric-value,
      .ticker-metrics,
      .stock-metrics strong,
      .details-grid dd { font-family: var(--font-data); }
      @media (min-width: 1500px) {
        .news-grid,
        .stock-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }

      @media (max-width: 640px) {
        .featured-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}

export default DividendStocksNewsPage;
