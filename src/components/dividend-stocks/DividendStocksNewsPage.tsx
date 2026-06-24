'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type DividendTab = 'overview' | 'explorer' | 'featured' | 'calendar' | 'news' | 'education';
type SectorId = 'all' | 'consumer_goods' | 'energy' | 'banks' | 'telecom' | 'utilities' | 'reits' | 'healthcare' | 'industrials' | 'technology';
type NewsTimeFilter = 'all' | 'day' | 'week' | 'month';
type NewsSort = 'latest' | 'oldest' | 'strongestMove';
type StockSort = 'quality' | 'yield' | 'payout' | 'exDate' | 'name' | 'change';
type CalendarRange = '30' | '90' | 'all';
type EducationId = 'basics' | 'yield' | 'payout' | 'dates' | 'growth' | 'safety' | 'reits' | 'tax' | 'mistakes';
type Tone = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';

type DividendTickerItem = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
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
  market: string;
  type: 'ex' | 'payment';
  date: string;
  annualDividend: number | null;
  currency: string;
};

const COPY = {
  ar: {
    badge: 'مركز أبحاث الدخل',
    title: 'مركز أسهم التوزيعات',
    subtitle: 'اكتشف وقارن أسهم الشركات التي توزع أرباحاً دورية، وتابع مواعيد الاستحقاق والدفع وأهم الأخبار المرتبطة بها.',
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
      featured: 'أسهم توزيعات مميزة',
      calendar: 'تقويم التوزيعات',
      news: 'الأخبار',
      education: 'الدليل التعليمي',
    },
    snapshotTitle: 'لمحة سوق التوزيعات',
    trackedCompanies: 'شركات مراقبة',
    averageYield: 'متوسط العائد',
    upcomingEvents: 'أحداث قادمة',
    averagePayout: 'متوسط نسبة الدفع',
    marketsCovered: 'الأسواق المغطاة',
    dataQuality: 'جودة البيانات',
    explorerTitle: 'مستكشف أسهم التوزيعات',
    explorerDescription: 'جدول مقارنة عملي لأسهم التوزيعات المتاحة من مزود البيانات، مع إظهار القيم غير المتوفرة بوضوح.',
    featuredTitle: 'أسهم توزيعات مميزة',
    featuredDescription: 'أسهم بارزة وفق معايير تحليلية تعتمد فقط على العائد ونسبة الدفع والتواريخ المتوفرة من المزود.',
    calendarTitle: 'تقويم التوزيعات',
    calendarDescription: 'تمييز واضح بين تاريخ الاستحقاق وتاريخ الدفع عند توفرهما من المصدر.',
    newsTitle: 'أخبار التوزيعات',
    newsDescription: 'أخبار مرتبطة بتوزيعات الشركات، الأرباح، التدفقات النقدية، وخفض أو رفع التوزيعات.',
    educationTitle: 'الدليل التعليمي للتوزيعات',
    educationDescription: 'تعلم المفاهيم الأساسية في بطاقات مختصرة قابلة للفتح عند الحاجة.',
    strategyTitle: 'نمو التوزيعات مقابل الدخل المرتفع',
    strategyDescription: 'مقارنة تعليمية تساعد على فصل استراتيجية الدخل الحالي عن نمو الدخل المستقبلي.',
    searchPlaceholder: 'ابحث عن شركة أو رمز...',
    newsSearchPlaceholder: 'ابحث في أخبار التوزيعات...',
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
    addWatchlist: 'إضافة للمراقبة',
    notSupportedMetric: 'غير متاح من مزود البيانات الحالي',
    annual: 'سنوي',
    eventEx: 'استحقاق التوزيع',
    eventPayment: 'دفع التوزيع',
    range30: '30 يوماً',
    range90: '90 يوماً',
    rangeAll: 'كل الأحداث',
    noCalendarEvents: 'لا توجد أحداث توزيعات ضمن الفترة المحددة',
    noCalendarText: 'جرّب تغيير الفترة الزمنية أو السوق أو إزالة بعض عوامل التصفية.',
    noStocks: 'لم يتم العثور على أسهم مطابقة',
    noStocksText: 'جرّب تعديل معايير العائد أو السوق أو القطاع.',
    noNews: 'لا توجد أخبار توزيعات متاحة حالياً',
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
    timeRange: 'الفترة',
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
    badge: 'Income research center',
    title: 'Dividend Stocks Center',
    subtitle: 'Discover and compare dividend-paying companies, follow ex-dividend and payment dates, and track related news.',
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
    tabs: { overview: 'Overview', explorer: 'Stock Explorer', featured: 'Featured Dividend Stocks', calendar: 'Dividend Calendar', news: 'News', education: 'Education' },
    snapshotTitle: 'Dividend market snapshot',
    trackedCompanies: 'Tracked companies',
    averageYield: 'Average yield',
    upcomingEvents: 'Upcoming events',
    averagePayout: 'Average payout',
    marketsCovered: 'Markets covered',
    dataQuality: 'Data quality',
    explorerTitle: 'Dividend stock explorer',
    explorerDescription: 'A practical comparison table using real provider fields. Missing metrics remain clearly unavailable.',
    featuredTitle: 'Featured dividend stocks',
    featuredDescription: 'Analytical highlights based only on available yield, payout, and dividend-date fields.',
    calendarTitle: 'Dividend calendar',
    calendarDescription: 'Clearly separates ex-dividend dates from payment dates when provided by the source.',
    newsTitle: 'Dividend news',
    newsDescription: 'News around dividends, earnings, cash flow, increases, cuts, and suspensions.',
    educationTitle: 'Dividend education guide',
    educationDescription: 'Concise lessons that stay collapsed until needed.',
    strategyTitle: 'Dividend growth versus high income',
    strategyDescription: 'Educational comparison between current income and future income growth.',
    searchPlaceholder: 'Search company or symbol...',
    newsSearchPlaceholder: 'Search dividend news...',
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
    addWatchlist: 'Add to watchlist',
    notSupportedMetric: 'Unavailable from current provider',
    annual: 'Annual',
    eventEx: 'Ex-dividend',
    eventPayment: 'Payment',
    range30: '30 days',
    range90: '90 days',
    rangeAll: 'All events',
    noCalendarEvents: 'No dividend events in the selected period',
    noCalendarText: 'Try changing the date range, market, or filters.',
    noStocks: 'No matching dividend stocks',
    noStocksText: 'Adjust yield, market, or sector filters.',
    noNews: 'No dividend news is currently available',
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
    timeRange: 'Time range',
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
    badge: 'Centre revenu',
    title: 'Centre des actions à dividendes',
    subtitle: 'Découvrez et comparez les sociétés versant des dividendes, suivez les dates ex-dividende et les actualités associées.',
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
    tabs: { overview: 'Vue générale', explorer: 'Explorateur', featured: 'Actions en vedette', calendar: 'Calendrier', news: 'Actualités', education: 'Éducation' },
    snapshotTitle: 'Aperçu des dividendes',
    trackedCompanies: 'Sociétés suivies',
    averageYield: 'Rendement moyen',
    upcomingEvents: 'Événements à venir',
    averagePayout: 'Payout moyen',
    marketsCovered: 'Marchés couverts',
    dataQuality: 'Qualité données',
    explorerTitle: 'Explorateur dividendes',
    explorerDescription: 'Table de comparaison avec les champs réels disponibles.',
    featuredTitle: 'Actions à dividendes en vedette',
    featuredDescription: 'Sélection analytique basée sur rendement, payout et dates disponibles.',
    calendarTitle: 'Calendrier des dividendes',
    calendarDescription: 'Sépare clairement date ex-dividende et date de paiement.',
    newsTitle: 'Actualités dividendes',
    newsDescription: 'Actualités sur dividendes, résultats, cash-flow et annonces.',
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
    addWatchlist: 'Ajouter',
    notSupportedMetric: 'Indisponible',
    annual: 'Annuel',
    eventEx: 'Ex-dividende',
    eventPayment: 'Paiement',
    range30: '30 jours',
    range90: '90 jours',
    rangeAll: 'Tous',
    noCalendarEvents: 'Aucun événement dans la période',
    noCalendarText: 'Modifiez la période ou les filtres.',
    noStocks: 'Aucune action correspondante',
    noStocksText: 'Ajustez rendement, marché ou secteur.',
    noNews: 'Aucune actualité disponible',
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
    timeRange: 'Période',
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
    labels: { ar: 'السلع الاستهلاكية', en: 'Consumer staples', fr: 'Consommation de base' },
    symbols: ['KO', 'PEP', 'PG', 'KMB', 'GIS', 'MCD', 'MO', 'PM'],
    description: { ar: 'شركات ذات طلب يومي نسبي وقدرة تاريخية على توزيع أرباح دورية.', en: 'Recurring-demand companies with a history of periodic distributions.', fr: 'Sociétés de demande récurrente avec dividendes.' },
  },
  energy: {
    icon: LineChart,
    labels: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' },
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
    labels: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' },
    symbols: ['VZ', 'T'],
    description: { ar: 'دخل دوري مع إنفاق رأسمالي مرتفع ومراقبة للديون.', en: 'Recurring income with high capex and debt monitoring.', fr: 'Revenu récurrent avec capex et dette.' },
  },
  utilities: {
    icon: ShieldCheck,
    labels: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    symbols: ['NEE', 'DUK', 'SO'],
    description: { ar: 'قطاعات منظمة تميل إلى توزيعات مستقرة نسبياً.', en: 'Regulated sectors that often support steadier payouts.', fr: 'Secteurs régulés et dividendes stables.' },
  },
  reits: {
    icon: Building2,
    labels: { ar: 'العقارات وREIT', en: 'REITs', fr: 'REIT' },
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
const LOCALE_BY_LANG: Record<LangCode, string> = { ar: 'ar-KW', en: 'en-US', fr: 'fr-FR' };
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
  if (row.exDividendDate || row.paymentDate) {
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

function createEvents(items: DividendStockRow[]): DividendEvent[] {
  const rows: DividendEvent[] = [];
  items.forEach(item => {
    if (item.exDividendDate) {
      rows.push({
        id: `${item.symbol}-ex-${item.exDividendDate}`,
        symbol: item.symbol,
        name: item.name,
        market: item.sectorLabel,
        type: 'ex',
        date: item.exDividendDate,
        annualDividend: item.annualDividend,
        currency: item.currency,
      });
    }
    if (item.paymentDate) {
      rows.push({
        id: `${item.symbol}-payment-${item.paymentDate}`,
        symbol: item.symbol,
        name: item.name,
        market: item.sectorLabel,
        type: 'payment',
        date: item.paymentDate,
        annualDividend: item.annualDividend,
        currency: item.currency,
      });
    }
  });
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function filterEvents(events: DividendEvent[], range: CalendarRange) {
  if (range === 'all') return events;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const max = new Date(now);
  max.setDate(max.getDate() + Number(range));
  return events.filter(event => {
    const date = new Date(event.date);
    return !Number.isNaN(date.getTime()) && date >= now && date <= max;
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
    if (value === null || value === '' || value === 'all' || value === 'quality') url.searchParams.delete(key);
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
  const [newsSearch, setNewsSearch] = useState('');
  const [newsSector, setNewsSector] = useState<SectorId>('all');
  const [newsSource, setNewsSource] = useState('all');
  const [newsSymbol, setNewsSymbol] = useState('all');
  const [newsTime, setNewsTime] = useState<NewsTimeFilter>('all');
  const [newsSort, setNewsSort] = useState<NewsSort>('latest');
  const [visibleNews, setVisibleNews] = useState(NEWS_INITIAL_LIMIT);
  const [openEducation, setOpenEducation] = useState<EducationId[]>([]);
  const [originalNewsIds, setOriginalNewsIds] = useState<string[]>([]);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
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
      setRefreshing(false);
    }
  }, [activeLang, text.providerError]);

  useEffect(() => {
    void loadData('initial');
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadData('refresh');
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

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

  const rows = useMemo(() => buildStockRows(ticker?.ok ? ticker.items : [], activeLang), [activeLang, ticker]);
  const events = useMemo(() => createEvents(rows), [rows]);
  const visibleEvents = useMemo(() => filterEvents(events, calendarRange), [calendarRange, events]);
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

  const featuredRows = useMemo(() => rows
    .filter(row => row.qualityScore !== null)
    .sort((a, b) => (b.qualityScore ?? -Infinity) - (a.qualityScore ?? -Infinity))
    .slice(0, 8), [rows]);

  const filteredNews = useMemo(() => {
    const items = dedupedNews.filter(item => {
      const sectorMatch = newsSector === 'all' || newsSector === newsSectorForItem(item);
      const sourceMatch = newsSource === 'all' || item.source === newsSource;
      const symbolMatch = newsSymbol === 'all' || item.ticker?.toUpperCase() === newsSymbol;
      return sectorMatch
        && sourceMatch
        && symbolMatch
        && isWithinTimeFilter(item.publishedAt, newsTime)
        && matchesNewsSearch(item, newsSearch);
    });
    return sortNews(items, newsSort);
  }, [dedupedNews, newsSearch, newsSector, newsSort, newsSource, newsSymbol, newsTime]);

  const snapshot = useMemo(() => {
    const yields = rows.map(row => normalizeRatioToPercent(row.dividendYield)).filter((value): value is number => value !== null);
    const payouts = rows.map(row => normalizeRatioToPercent(row.payoutRatio)).filter((value): value is number => value !== null);
    const avgYield = yields.length ? yields.reduce((sum, value) => sum + value, 0) / yields.length : null;
    const avgPayout = payouts.length ? payouts.reduce((sum, value) => sum + value, 0) / payouts.length : null;
    const markets = new Set(rows.map(row => row.currency || 'USD'));
    const quality = rows.length ? Math.round((rows.filter(row => row.dividendYield !== null || row.payoutRatio !== null || row.exDividendDate || row.paymentDate).length / rows.length) * 100) : null;
    return { avgYield, avgPayout, markets: markets.size, quality };
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
    setNewsTime('all');
    setNewsSort('latest');
    setVisibleNews(NEWS_INITIAL_LIMIT);
  };

  const changeTab = (next: DividendTab) => {
    setTab(next);
    updateUrl({ tab: next }, 'push');
  };

  const toggleEducation = (id: EducationId) => {
    setOpenEducation(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const toggleOriginal = (id: string) => {
    setOriginalNewsIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const hasStockFilters = Boolean(stockSearch.trim() || stockSector !== 'all' || stockSort !== 'quality' || yieldMin || payoutMax);
  const hasNewsFilters = Boolean(newsSearch.trim() || newsSector !== 'all' || newsSource !== 'all' || newsSymbol !== 'all' || newsTime !== 'all' || newsSort !== 'latest');

  return (
    <div className="page" dir={dir}>
      <Sidebar />
      <main className="main">
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
              <button className="refresh-button" type="button" onClick={() => void loadData('refresh')} disabled={refreshing}>
                <RefreshCcw size={17} className={refreshing ? 'spin' : undefined} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
            </div>
          </header>

          {error ? <StateBox tone="warning" icon={AlertTriangle} title={text.providerError} actionLabel={text.retry} onAction={() => void loadData('refresh')} /> : null}

          <TickerStrip rows={rows} loading={loading} text={text} lang={activeLang} />

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
              loading={loading}
              rows={rows}
              events={visibleEvents}
              featuredRows={featuredRows.slice(0, 4)}
              newsItems={filteredNews.slice(0, 4)}
              snapshot={snapshot}
              setTab={changeTab}
              methodologyOpen={methodologyOpen}
              setMethodologyOpen={setMethodologyOpen}
              originalNewsIds={originalNewsIds}
              toggleOriginal={toggleOriginal}
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
            />
          ) : null}

          {tab === 'calendar' ? (
            <CalendarTab
              text={text}
              lang={activeLang}
              events={visibleEvents}
              loading={loading}
              range={calendarRange}
              setRange={setCalendarRange}
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
              time={newsTime}
              sort={newsSort}
              sources={sources}
              symbols={symbols}
              setSearch={setNewsSearch}
              setSector={setNewsSector}
              setSource={setNewsSource}
              setSymbol={setNewsSymbol}
              setTime={setNewsTime}
              setSort={setNewsSort}
              reset={resetNewsFilters}
              hasFilters={hasNewsFilters}
              originalNewsIds={originalNewsIds}
              toggleOriginal={toggleOriginal}
            />
          ) : null}

          {tab === 'education' ? (
            <EducationTab text={text} open={openEducation} toggle={toggleEducation} full />
          ) : null}

          <footer className="footer-note">
            <Info size={18} />
            <div>
              <strong>{text.legal}</strong>
              <p>{text.aiNotice}</p>
            </div>
          </footer>
        </div>
      </main>
      <DividendStyles />
    </div>
  );
}

function newsSectorForItem(item: DividendNewsItem): SectorId {
  return newsSector(item);
}

function TickerStrip({ rows, loading, text, lang }: { rows: DividendStockRow[]; loading: boolean; text: typeof COPY[LangCode]; lang: LangCode }) {
  if (loading) {
    return <section className="ticker-panel"><div className="ticker-scroll">{Array.from({ length: 6 }).map((_, index) => <div className="ticker-item skeleton" key={index} />)}</div></section>;
  }
  return (
    <section className="ticker-panel" aria-label={text.trackedCompanies}>
      <div className="ticker-scroll">
        {rows.map(row => (
          <article className="ticker-item" key={row.symbol}>
            <div className="ticker-top">
              <span className="symbol">{row.symbol}</span>
              <span className={badgeClass(toneForChange(row.changePercent))}>{formatPercent(row.changePercent, lang)}</span>
            </div>
            <strong className="numeric">{formatCurrency(row.price, row.currency, lang)}</strong>
            <span className="ticker-name">{row.name}</span>
            <div className="ticker-metrics">
              <span>{text.dividendYield}: <b>{formatPercent(row.dividendYield, lang, true)}</b></span>
              <span>{text.payoutRatio}: <b>{formatPercent(row.payoutRatio, lang, true)}</b></span>
            </div>
          </article>
        ))}
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
  snapshot,
  setTab,
  methodologyOpen,
  setMethodologyOpen,
  originalNewsIds,
  toggleOriginal,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  loading: boolean;
  rows: DividendStockRow[];
  events: DividendEvent[];
  featuredRows: DividendStockRow[];
  newsItems: DividendNewsItem[];
  snapshot: { avgYield: number | null; avgPayout: number | null; markets: number; quality: number | null };
  setTab: (tab: DividendTab) => void;
  methodologyOpen: boolean;
  setMethodologyOpen: (open: boolean) => void;
  originalNewsIds: string[];
  toggleOriginal: (id: string) => void;
}) {
  return (
    <div className="stack">
      <section className="section">
        <SectionHeader title={text.snapshotTitle} description={text.delayed} />
        <div className="summary-grid">
          <MetricCard icon={Building2} label={text.trackedCompanies} value={String(rows.length)} help={text.marketsCovered} loading={loading} tone="info" />
          <MetricCard icon={Coins} label={text.averageYield} value={formatPercent(snapshot.avgYield, lang)} help={text.dividendYield} loading={loading} tone="positive" />
          <MetricCard icon={CalendarDays} label={text.upcomingEvents} value={String(events.length)} help={text.exDividendDate} loading={loading} tone="warning" />
          <MetricCard icon={ShieldCheck} label={text.dataQuality} value={snapshot.quality === null ? text.unavailable : `${snapshot.quality}%`} help={text.provider} loading={loading} tone="neutral" />
        </div>
      </section>

      <div className="workspace-grid">
        <div className="stack">
          <section className="section">
            <SectionHeader
              title={text.featuredTitle}
              description={text.featuredDescription}
              action={<button className="ghost-button" type="button" onClick={() => setTab('featured')}>{text.methodology}<ArrowUpRight size={15} /></button>}
            />
            <FeaturedGrid rows={featuredRows} text={text} lang={lang} loading={loading} compact />
            <MethodologyBox text={text} open={methodologyOpen} setOpen={setMethodologyOpen} />
          </section>

          <StrategyComparison text={text} lang={lang} />
        </div>

        <aside className="stack">
          <section className="panel">
            <SectionHeader title={text.calendarTitle} description={text.calendarDescription} action={<button className="ghost-button" type="button" onClick={() => setTab('calendar')}>{text.range90}</button>} />
            <EventList events={events.slice(0, 5)} text={text} lang={lang} compact />
          </section>

          <section className="panel">
            <SectionHeader title={text.newsTitle} description={text.newsDescription} action={<button className="ghost-button" type="button" onClick={() => setTab('news')}>{text.showAllNews}</button>} />
            <div className="side-news">
              {newsItems.slice(0, 4).map(item => <CompactNewsRow key={item.id || item.url} item={item} text={text} lang={lang} />)}
            </div>
          </section>

          <EducationTab text={text} open={['yield', 'payout', 'dates']} toggle={() => {}} preview />
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
                  <th>{text.exDividendDate}</th>
                  <th>{text.paymentDate}</th>
                  <th>{text.riskLevel}</th>
                  <th>{text.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => <StockTableRow key={row.symbol} row={row} text={text} lang={lang} />)}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {rows.map(row => <DividendMobileCard key={row.symbol} row={row} text={text} lang={lang} />)}
          </div>
        </>
      )}
    </section>
  );
}

function FeaturedTab({ text, lang, rows, loading, methodologyOpen, setMethodologyOpen }: { text: typeof COPY[LangCode]; lang: LangCode; rows: DividendStockRow[]; loading: boolean; methodologyOpen: boolean; setMethodologyOpen: (open: boolean) => void }) {
  return (
    <section className="section">
      <SectionHeader title={text.featuredTitle} description={text.featuredDescription} action={<button className="ghost-button" type="button" onClick={() => setMethodologyOpen(!methodologyOpen)}>{text.methodology}</button>} />
      <MethodologyBox text={text} open={methodologyOpen} setOpen={setMethodologyOpen} />
      <FeaturedGrid rows={rows} text={text} lang={lang} loading={loading} />
    </section>
  );
}

function CalendarTab({ text, lang, events, loading, range, setRange }: { text: typeof COPY[LangCode]; lang: LangCode; events: DividendEvent[]; loading: boolean; range: CalendarRange; setRange: (range: CalendarRange) => void }) {
  return (
    <section className="section">
      <SectionHeader title={text.calendarTitle} description={text.calendarDescription} action={<span className="pill">{text.resultCount}: {events.length}</span>} />
      <div className="range-tabs" role="group" aria-label={text.calendarTitle}>
        {(['30', '90', 'all'] as CalendarRange[]).map(item => (
          <button key={item} type="button" className={range === item ? 'chip active' : 'chip'} onClick={() => setRange(item)}>
            {item === '30' ? text.range30 : item === '90' ? text.range90 : text.rangeAll}
          </button>
        ))}
      </div>
      {loading ? <SkeletonGrid count={4} /> : events.length === 0 ? (
        <StateBox tone="info" icon={CalendarDays} title={text.noCalendarEvents} body={text.noCalendarText} />
      ) : <EventList events={events} text={text} lang={lang} />}
    </section>
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
  hasFilters: boolean;
  originalNewsIds: string[];
  toggleOriginal: (id: string) => void;
}) {
  const visible = items.slice(0, visibleCount);
  return (
    <section className="section">
      <SectionHeader title={text.newsTitle} description={text.newsDescription} action={<span className="pill">{text.resultCount}: {items.length}</span>} />
      <NewsFilters
        text={text}
        lang={lang}
        search={search}
        sector={sector}
        source={source}
        symbol={symbol}
        time={time}
        sort={sort}
        sources={sources}
        symbols={symbols}
        setSearch={setSearch}
        setSector={setSector}
        setSource={setSource}
        setSymbol={setSymbol}
        setTime={setTime}
        setSort={setSort}
        reset={reset}
        hasFilters={hasFilters}
      />
      {loading ? <SkeletonGrid count={6} /> : items.length === 0 ? (
        <StateBox tone="info" icon={Newspaper} title={text.noNews} actionLabel={text.retry} onAction={reset} />
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
  );
}

function EducationTab({ text, open, toggle, preview, full }: { text: typeof COPY[LangCode]; open: EducationId[]; toggle: (id: EducationId) => void; preview?: boolean; full?: boolean }) {
  const ids = (Object.keys(text.education) as EducationId[]);
  const shown = preview ? ids.slice(0, 3) : ids;
  return (
    <section className={preview ? 'panel' : 'section'}>
      <SectionHeader title={text.educationTitle} description={text.educationDescription} action={preview ? <span className="pill">{text.fullGuide}</span> : undefined} />
      <div className="guide-grid">
        {shown.map(id => {
          const isOpen = full ? open.includes(id) : open.includes(id);
          return (
            <article key={id}>
              <button className="guide-button" type="button" aria-expanded={isOpen} aria-controls={`dividend-guide-${id}`} onClick={() => toggle(id)}>
                <span>{text.education[id]}</span>
                {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {isOpen ? <div id={`dividend-guide-${id}`} className="guide-content">{text.educationBody[id]}</div> : null}
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

function NewsFilters({ text, lang, search, sector, source, symbol, time, sort, sources, symbols, setSearch, setSector, setSource, setSymbol, setTime, setSort, reset, hasFilters }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
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
        <option value="all">{text.allSectors}</option>
        {symbols.map(option => <option key={option} value={option}>{option}</option>)}
      </SelectField>
      <SelectField id="dividend-news-source" label={text.sourceFilter} value={source} onChange={setSource}>
        <option value="all">{text.allSectors}</option>
        {sources.map(option => <option key={option} value={option}>{option}</option>)}
      </SelectField>
      <SelectField id="dividend-news-time" label={text.timeRange} value={time} onChange={value => setTime(value as NewsTimeFilter)}>
        <option value="all">{text.allTime}</option>
        <option value="day">{text.lastDay}</option>
        <option value="week">{text.lastWeek}</option>
        <option value="month">{text.lastMonth}</option>
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

function FeaturedGrid({ rows, text, lang, loading, compact }: { rows: DividendStockRow[]; text: typeof COPY[LangCode]; lang: LangCode; loading: boolean; compact?: boolean }) {
  if (loading) return <SkeletonGrid count={compact ? 4 : 8} />;
  if (rows.length === 0) return <StateBox tone="info" icon={Coins} title={text.noStocks} body={text.noStocksText} />;
  return (
    <div className="featured-grid">
      {rows.map(row => <FeaturedStockCard key={row.symbol} row={row} text={text} lang={lang} compact={compact} />)}
    </div>
  );
}

function FeaturedStockCard({ row, text, lang, compact }: { row: DividendStockRow; text: typeof COPY[LangCode]; lang: LangCode; compact?: boolean }) {
  return (
    <article className="card featured-card">
      <div className="stock-head">
        <div className="stock-logo">{row.symbol.slice(0, 2)}</div>
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
      <div className="metric-grid">
        <MiniMetric label={text.dividendYield} value={formatPercent(row.dividendYield, lang, true)} />
        <MiniMetric label={text.payoutRatio} value={formatPercent(row.payoutRatio, lang, true)} />
        <MiniMetric label={text.exDividendDate} value={formatDate(row.exDividendDate, lang)} />
        <MiniMetric label={text.paymentDate} value={formatDate(row.paymentDate, lang)} />
        {!compact ? (
          <>
            <MiniMetric label={text.dividendPerShare} value={formatCurrency(row.annualDividend, row.currency, lang)} />
            <MiniMetric label={text.dataDate} value={row.dividendMetricSource ?? text.unavailable} />
          </>
        ) : null}
      </div>
      <p className="muted"><strong>{text.reason}:</strong> {row.selectionReason}</p>
      {row.highYieldWarning ? <p className="warning-line"><AlertTriangle size={15} />{text.highYieldWarning}</p> : null}
    </article>
  );
}

function StockTableRow({ row, text, lang }: { row: DividendStockRow; text: typeof COPY[LangCode]; lang: LangCode }) {
  return (
    <tr>
      <td>
        <div className="company-cell">
          <span className="stock-logo small">{row.symbol.slice(0, 2)}</span>
          <div>
            <strong>{row.name}</strong>
            <span className="symbol">{row.symbol}</span>
          </div>
        </div>
      </td>
      <td className="numeric">{formatCurrency(row.price, row.currency, lang)}</td>
      <td className="numeric">{formatPercent(row.dividendYield, lang, true)}</td>
      <td className="numeric">{formatPercent(row.payoutRatio, lang, true)}</td>
      <td>{formatDate(row.exDividendDate, lang)}</td>
      <td>{formatDate(row.paymentDate, lang)}</td>
      <td><span className={badgeClass(row.riskTone)}>{row.riskLabel}</span></td>
      <td><button className="link-button" type="button">{text.viewDetails}<ArrowUpRight size={14} /></button></td>
    </tr>
  );
}

function DividendMobileCard({ row, text, lang }: { row: DividendStockRow; text: typeof COPY[LangCode]; lang: LangCode }) {
  return (
    <article className="card">
      <div className="stock-head">
        <div className="stock-logo">{row.symbol.slice(0, 2)}</div>
        <div className="stock-title">
          <h3>{row.name}</h3>
          <p><span className="symbol">{row.symbol}</span> · {row.sectorLabel}</p>
        </div>
        <span className={badgeClass(row.riskTone)}>{row.riskLabel}</span>
      </div>
      <div className="metric-grid">
        <MiniMetric label={text.currentPrice} value={formatCurrency(row.price, row.currency, lang)} />
        <MiniMetric label={text.dividendYield} value={formatPercent(row.dividendYield, lang, true)} />
        <MiniMetric label={text.payoutRatio} value={formatPercent(row.payoutRatio, lang, true)} />
        <MiniMetric label={text.exDividendDate} value={formatDate(row.exDividendDate, lang)} />
      </div>
      <button className="primary-button" type="button">{text.viewDetails}</button>
    </article>
  );
}

function EventList({ events, text, lang, compact }: { events: DividendEvent[]; text: typeof COPY[LangCode]; lang: LangCode; compact?: boolean }) {
  if (events.length === 0) return <StateBox tone="info" icon={CalendarDays} title={text.noCalendarEvents} body={text.noCalendarText} />;
  return (
    <div className="event-list">
      {events.map(event => (
        <article className="event-row" key={event.id}>
          <div className="event-date">
            <CalendarDays size={18} />
            <strong>{formatDate(event.date, lang)}</strong>
          </div>
          <div>
            <strong>{event.name}</strong>
            <p><span className="symbol">{event.symbol}</span> · {event.market}</p>
          </div>
          <span className={badgeClass(event.type === 'ex' ? 'info' : 'positive')}>{event.type === 'ex' ? text.eventEx : text.eventPayment}</span>
          {!compact ? <span className="numeric">{formatCurrency(event.annualDividend, event.currency, lang)}</span> : null}
        </article>
      ))}
    </div>
  );
}

function NewsCard({ item, text, lang, showOriginal, toggleOriginal }: { item: DividendNewsItem; text: typeof COPY[LangCode]; lang: LangCode; showOriginal: boolean; toggleOriginal: () => void }) {
  const url = safeUrl(item.url);
  const title = safeArticleTitle(item, showOriginal);
  const summary = safeArticleSummary(item, showOriginal);
  return (
    <article className="card article-card">
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
        <span>{sectorLabel(newsSector(item), lang)}</span>
        {item.isTranslated && !showOriginal ? <span className="badge tone-info">{text.machineTranslation}</span> : null}
      </div>
      <h3 className="article-title" dir="auto">{title}</h3>
      {summary ? <p className="article-summary" dir="auto">{summary}</p> : null}
      <div className="metric-grid">
        <MiniMetric label={text.relatedSymbol} value={item.ticker?.toUpperCase() ?? text.unavailable} />
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
  return (
    <article className="compact-row">
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{formatRelative(item.publishedAt, lang)}</span>
      </div>
      <h3 className="article-title" dir="auto">{safeArticleTitle(item, false)}</h3>
      <div className="row-between">
        <span className="badge tone-info">{item.ticker?.toUpperCase() ?? sectorLabel(newsSector(item), lang)}</span>
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
    <style jsx>{`
      .page {
        min-height: 100dvh;
        background:
          radial-gradient(circle at top left, rgba(34, 211, 238, 0.13), transparent 34rem),
          linear-gradient(180deg, #f5fbff 0%, #eef7ff 48%, #f8fbff 100%);
        color: #0f1f35;
      }
      .main {
        min-width: 0;
        padding: 24px clamp(16px, 2vw, 32px) 56px;
        padding-inline-start: calc(var(--sidebar-w, 230px) + clamp(16px, 2vw, 32px));
      }
      :global([dir="ltr"]) .main {
        padding-inline-start: clamp(16px, 2vw, 32px);
        padding-inline-end: calc(var(--sidebar-w, 230px) + clamp(16px, 2vw, 32px));
      }
      .container {
        width: min(100%, 1440px);
        margin-inline: auto;
        display: grid;
        gap: 22px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 22px;
        align-items: stretch;
        padding: 26px;
        border: 1px solid rgba(63, 127, 158, 0.22);
        border-radius: 24px;
        background:
          linear-gradient(135deg, rgba(8, 28, 52, 0.98), rgba(8, 92, 103, 0.9)),
          radial-gradient(circle at 14% 20%, rgba(45, 212, 191, 0.26), transparent 21rem);
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
        border-radius: 999px;
        background: rgba(35, 211, 231, 0.14);
        border: 1px solid rgba(141, 242, 255, 0.28);
        color: #b8f6ff;
        font-size: 13px;
        font-weight: 850;
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
        color: rgba(239, 251, 255, 0.83);
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
        color: rgba(255, 255, 255, 0.9);
        font-size: 12px;
        font-weight: 760;
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
        text-decoration: none;
        box-shadow: 0 14px 26px rgba(24, 139, 202, 0.25);
      }
      .refresh-button:hover,
      .primary-button:hover,
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 34px rgba(20, 78, 118, 0.14);
      }
      .refresh-button:disabled,
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
      .section,
      .panel,
      .card,
      .footer-note,
      .ticker-panel,
      .state-box {
        border: 1px solid rgba(58, 124, 154, 0.16);
        background: rgba(255, 255, 255, 0.9);
        border-radius: 22px;
        box-shadow: 0 16px 40px rgba(24, 62, 92, 0.08);
      }
      .section,
      .panel { padding: 22px; }
      .stack { display: grid; gap: 18px; }
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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
        font-weight: 850;
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
        padding: 12px;
        overflow: hidden;
      }
      .ticker-scroll {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 2px;
      }
      .ticker-item {
        flex: 0 0 232px;
        display: grid;
        gap: 7px;
        padding: 14px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid rgba(58, 124, 154, 0.13);
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
      .ticker-name,
      .muted {
        color: #64748b;
      }
      .ticker-metrics {
        justify-content: space-between;
        color: #526579;
        font-size: 12px;
      }
      .symbol,
      .numeric {
        direction: ltr;
        unicode-bidi: isolate;
        font-variant-numeric: tabular-nums;
      }
      .symbol {
        color: #0f253f;
        font-weight: 950;
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
        grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.75fr);
        gap: 18px;
        align-items: start;
      }
      .featured-grid,
      .news-grid,
      .guide-grid,
      .strategy-grid {
        display: grid;
        gap: 14px;
      }
      .featured-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .news-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 16px;
      }
      .guide-grid,
      .strategy-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .card {
        display: grid;
        gap: 14px;
        min-width: 0;
        padding: 18px;
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
      .stock-logo.small {
        width: 40px;
        height: 40px;
        border-radius: 14px;
      }
      .stock-title {
        min-width: 0;
        flex: 1;
      }
      .stock-title h3,
      .article-title,
      .strategy-card h3 {
        margin: 0;
        color: #102742;
        font-size: 17px;
        line-height: 1.45;
        font-weight: 950;
      }
      .stock-title p,
      .event-row p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 13px;
      }
      .score-band {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-radius: 15px;
        background: linear-gradient(135deg, rgba(6, 78, 59, 0.08), rgba(14, 165, 233, 0.08));
        border: 1px solid rgba(20, 184, 166, 0.14);
      }
      .score-band strong {
        font-size: 24px;
        color: #0f766e;
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
      }
      .warning-line {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
        color: #92400e;
        font-size: 13px;
        line-height: 1.7;
      }
      .filter-panel {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) repeat(4, minmax(130px, 190px)) auto;
        gap: 10px;
        align-items: end;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(58, 124, 154, 0.14);
        background: #fff;
      }
      .news-filter-panel {
        grid-template-columns: minmax(220px, 1fr) repeat(5, minmax(130px, 180px)) auto;
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
        outline: 3px solid rgba(20, 184, 216, 0.24);
        outline-offset: 2px;
        border-color: rgba(20, 184, 216, 0.55);
      }
      .ghost-button,
      .chip,
      .link-button,
      .guide-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        background: #fff;
        color: #1768a8;
        font-weight: 900;
        cursor: pointer;
        text-decoration: none;
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
      .table-wrap {
        margin-top: 16px;
        overflow-x: auto;
        border-radius: 18px;
        border: 1px solid rgba(58, 124, 154, 0.14);
        background: #fff;
      }
      .stock-table {
        width: 100%;
        min-width: 980px;
        border-collapse: separate;
        border-spacing: 0;
      }
      .stock-table th,
      .stock-table td {
        padding: 14px;
        text-align: start;
        border-bottom: 1px solid rgba(58, 124, 154, 0.11);
        font-size: 13px;
        vertical-align: middle;
      }
      .stock-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f1f8fd;
        color: #345169;
        font-weight: 950;
      }
      .company-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 210px;
      }
      .company-cell div {
        display: grid;
        gap: 3px;
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
        grid-template-columns: 180px minmax(0, 1fr) auto auto;
        gap: 12px;
        align-items: center;
        padding: 13px;
        border-radius: 16px;
        border: 1px solid rgba(58, 124, 154, 0.13);
        background: #fff;
      }
      .event-date {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0e7490;
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
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        margin: 0;
        color: #5b7085;
        font-size: 14px;
        line-height: 1.75;
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
      .side-news {
        display: grid;
        gap: 12px;
      }
      .compact-row {
        display: grid;
        gap: 8px;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(58, 124, 154, 0.14);
        background: #fff;
      }
      .strategy-card {
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(58, 124, 154, 0.14);
        background: #fff;
      }
      .strategy-card p {
        margin: 8px 0 0;
        color: #64748b;
        line-height: 1.75;
      }
      .comparison-table {
        display: grid;
        margin-top: 14px;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid rgba(58, 124, 154, 0.12);
      }
      .comparison-row {
        display: grid;
        grid-template-columns: 180px 1fr 1fr;
        gap: 12px;
        padding: 13px 15px;
        background: #fff;
        border-bottom: 1px solid rgba(58, 124, 154, 0.1);
      }
      .comparison-row:nth-child(even) {
        background: #f8fbff;
      }
      .methodology-box {
        margin-bottom: 14px;
      }
      .guide-button {
        width: 100%;
        justify-content: space-between;
        padding: 0 14px;
        text-align: start;
      }
      .guide-button span {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .guide-content {
        margin-top: 10px;
        color: #5b7085;
        font-size: 14px;
        line-height: 1.8;
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
      }
      .state-copy {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .state-copy p {
        margin: 4px 0 0;
        color: #60758a;
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
      @keyframes shimmer { 100% { transform: translateX(100%); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
      }
      @media (max-width: 1280px) {
        .hero,
        .workspace-grid {
          grid-template-columns: 1fr;
        }
        .summary-grid,
        .featured-grid,
        .news-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .filter-panel,
        .news-filter-panel {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 900px) {
        .main,
        :global([dir="ltr"]) .main {
          padding-inline: 16px;
          padding-top: 18px;
        }
        .hero {
          padding: 20px;
          border-radius: 20px;
        }
        .section,
        .panel {
          padding: 16px;
        }
        .summary-grid,
        .featured-grid,
        .news-grid,
        .guide-grid,
        .strategy-grid {
          grid-template-columns: 1fr;
        }
        .filter-panel,
        .news-filter-panel {
          grid-template-columns: 1fr;
        }
        .section-header,
        .ticker-top,
        .stock-head,
        .article-actions,
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
        .table-wrap {
          display: none;
        }
        .mobile-card-list {
          display: grid;
        }
        .event-row {
          grid-template-columns: 1fr;
        }
        .comparison-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}

export default DividendStocksNewsPage;
