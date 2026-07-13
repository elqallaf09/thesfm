'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Car,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Factory,
  Filter,
  Hotel,
  Info,
  Layers3,
  LineChart,
  Newspaper,
  Plane,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type CyclicalTab = 'overview' | 'stocks' | 'news' | 'sectors' | 'economic-cycle';
type SectorId =
  | 'all'
  | 'autos'
  | 'airlines_travel'
  | 'hotels_entertainment'
  | 'industrials'
  | 'construction_real_estate'
  | 'luxury_goods'
  | 'nonessential_retail'
  | 'basic_materials'
  | 'transport';
type NewsTimeFilter = 'all' | 'day' | 'week' | 'month';
type NewsSort = 'latest' | 'oldest' | 'strongestMove';
type StockSort = 'sensitivity' | 'leastVolatile' | 'momentum' | 'name' | 'sector';
type EducationId = 'what' | 'sectors' | 'defensive' | 'cycle' | 'rates' | 'employment' | 'debt' | 'decline' | 'balance';
type Tone = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';
type EconomicCycleIndicatorId =
  | 'gdp'
  | 'pmi'
  | 'unemployment'
  | 'confidence'
  | 'retail'
  | 'industrial'
  | 'policyRate'
  | 'yieldCurve'
  | 'housing'
  | 'inflation';
type EconomicIndicatorStatus = 'actual' | 'forecast' | 'stale';

type EconomicIndicatorChange = {
  delta: number | null;
  unit: string | null;
  basis: 'previous' | 'forecast';
  basisValue: string;
};

type EconomicCycleIndicator = {
  id: EconomicCycleIndicatorId;
  value: string;
  change: EconomicIndicatorChange | null;
  date: string;
  source: string;
  status: EconomicIndicatorStatus;
};

type EconomicCycleResponse = {
  ok: boolean;
  status: 'available' | 'empty' | 'error';
  source: string | null;
  updated_at: string | null;
  indicators: EconomicCycleIndicator[];
  devHint?: string;
};

type CyclicalTickerItem = {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  currency: string;
  market?: string | null;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
};

type CyclicalTickerResponse =
  | {
      ok: true;
      source: string;
      updated_at: string;
      items: CyclicalTickerItem[];
    }
  | {
      ok: false;
      code?: string;
      source: string | null;
      updated_at: string | null;
      items: CyclicalTickerItem[];
    };

type CyclicalNewsItem = {
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

type CyclicalNewsResponse =
  | {
      success: true;
      category: string;
      source: string;
      priceSource?: string | null;
      lastUpdated: string;
      language: string;
      translationEnabled: boolean;
      items: CyclicalNewsItem[];
      limit: number;
      message?: string;
    }
  | {
      success: false;
      error?: string;
      reason?: string;
    };

type CyclicalStockRow = CyclicalTickerItem & {
  sectorId: Exclude<SectorId, 'all'>;
  sectorLabel: string;
  sectorSensitivity: string;
  sensitivityTone: Tone;
  methodologyNote: string;
  qualityLabel: string;
  leverageLabel: string;
  valuationLabel: string;
  dataCompleteness: number;
};
type CyclicalTickerStripItem = Omit<CyclicalTickerItem, 'price' | 'change' | 'changePercent' | 'source'> & {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  source: string | null;
  sectorLabel: string;
};

type SectorDefinition = {
  id: Exclude<SectorId, 'all'>;
  label: Record<LangCode, string>;
  description: Record<LangCode, string>;
  drivers: Record<LangCode, string[]>;
  icon: LucideIcon;
  sensitivity: 'high' | 'medium' | 'mixed';
};

type SectorStat = SectorDefinition & {
  count: number;
  averageChange: number | null;
  rising: number;
  falling: number;
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const INITIAL_NEWS_LIMIT = 12;
const MOVER_LIST_PREVIEW_LIMIT = 3;
const MOVERS_API_LIMIT = 5;

const TAB_IDS: CyclicalTab[] = ['overview', 'stocks', 'news', 'sectors', 'economic-cycle'];
const CYCLICAL_TICKER_SYMBOLS = [
  'TSLA',
  'CAT',
  'NCLH',
  'RCL',
  'CCL',
  'LEN',
  'DE',
  'GM',
  'F',
  'HD',
  'LOW',
  'LVS',
] as const;
const CYCLICAL_TICKER_SYMBOL_NAMES: Record<string, string> = {
  TSLA: 'Tesla',
  CAT: 'Caterpillar',
  NCLH: 'Norwegian Cruise Line',
  RCL: 'Royal Caribbean',
  CCL: 'Carnival',
  LEN: 'Lennar',
  DE: 'Deere',
  GM: 'General Motors',
  F: 'Ford',
  HD: 'Home Depot',
  LOW: "Lowe's",
  LVS: 'Las Vegas Sands',
  WYNN: 'Wynn Resorts',
  DAL: 'Delta Air Lines',
  BA: 'Boeing',
};
type CyclicalTickerDisplaySymbol = (typeof CYCLICAL_TICKER_SYMBOLS)[number];

const SYMBOL_SECTOR: Record<string, Exclude<SectorId, 'all'>> = {
  TSLA: 'autos',
  GM: 'autos',
  F: 'autos',
  RACE: 'luxury_goods',
  NKE: 'luxury_goods',
  SBUX: 'nonessential_retail',
  HD: 'construction_real_estate',
  LOW: 'construction_real_estate',
  MCD: 'nonessential_retail',
  MAR: 'hotels_entertainment',
  HLT: 'hotels_entertainment',
  DAL: 'airlines_travel',
  UAL: 'airlines_travel',
  AAL: 'airlines_travel',
  BA: 'industrials',
  CAT: 'industrials',
  DE: 'industrials',
  DHI: 'construction_real_estate',
  LEN: 'construction_real_estate',
  WYNN: 'hotels_entertainment',
  LVS: 'hotels_entertainment',
  RCL: 'airlines_travel',
  CCL: 'airlines_travel',
  NCLH: 'airlines_travel',
  LVMUY: 'luxury_goods',
};

const COPY = {
  ar: {
    badge: 'مركز أبحاث الدورة الاقتصادية',
    title: 'الأسهم الدورية',
    subtitle: 'تابع الشركات والقطاعات التي تتأثر بالنمو الاقتصادي والإنفاق الاستهلاكي، وقارن فرصها بمخاطر الدورة والتذبذب.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    connected: 'تحديثات السوق متاحة',
    partial: 'تحديثات محدودة',
    delayed: 'قد تتأخر الأسعار أو تُعرض من ذاكرة مؤقتة حسب المصدر.',
    source: 'المصدر',
    unavailable: 'غير متاح',
    lastQuoteUpdate: 'آخر تحديث للأسعار',
    lastNewsUpdate: 'آخر تحديث للأخبار',
    lastMacroUpdate: 'آخر تحديث اقتصادي',
    macroNotConnected: 'سيتم عرض مؤشرات الدورة الاقتصادية عند توفر بيانات موثوقة.',
    insufficientMacro: 'بيانات غير كافية',
    tabs: {
      overview: 'نظرة عامة',
      stocks: 'الأسهم الدورية',
      news: 'الأخبار',
      sectors: 'القطاعات',
      'economic-cycle': 'الدورة الاقتصادية',
    },
    tickerTitle: 'شريط الأسهم الدورية',
    overviewSummary: 'ملخص الأسهم الدورية اليوم',
    economicDashboard: 'مؤشرات الدورة الاقتصادية',
    cyclePhase: 'مرحلة الدورة المحتملة',
    howPhase: 'كيف تم تحديد المرحلة؟',
    macroUnavailableBody: 'سيتم عرض مؤشرات الدورة الاقتصادية عند توفر بيانات موثوقة.',
    macroEducationalOnly: 'بانتظار البيانات',
    macroEmptyTitle: 'مؤشرات الدورة الاقتصادية غير معروضة حالياً',
    macroEmptyBody: 'سيتم عرض مؤشرات الدورة الاقتصادية عند توفر بيانات موثوقة ومحدثة. لا يتم عرض أرقام تقديرية أو تجريبية في هذه الصفحة.',
    macroErrorTitle: 'تعذر تحديث مؤشرات الدورة الاقتصادية الآن',
    macroDevHintLabel: 'ملاحظة للمطور',
    macroRetry: 'إعادة تحديث المؤشرات',
    macroLoading: 'جاري تحميل مؤشرات الدورة الاقتصادية...',
    macroAvailableOnly: 'تظهر المؤشرات المتاحة من مصادر موثوقة فقط.',
    macroDate: 'تاريخ القراءة',
    macroStatus: 'الحالة',
    macroChangePrevious: 'مقارنة بالقراءة السابقة',
    macroChangeForecast: 'مقارنة بالتوقع',
    macroStatusActual: 'قراءة فعلية',
    macroStatusForecast: 'توقع منشور',
    macroStatusStale: 'آخر قراءة محفوظة',
    risingStocks: 'أسهم مرتفعة',
    fallingStocks: 'أسهم منخفضة',
    topGainers: 'الأعلى ارتفاعاً',
    topLosers: 'الأكثر انخفاضاً',
    highestVolume: 'الأعلى تداولاً',
    moversUnavailable: 'لا توجد حركة كافية لعرض الرابحين والخاسرين حالياً.',
    noMoverGroupData: 'لا توجد بيانات كافية لهذا التصنيف.',
    bestSector: 'أفضل قطاع متاح',
    strongestMover: 'أقوى حركة',
    highestVolatility: 'أعلى تذبذب يومي',
    trackedStocks: 'أسهم مراقبة',
    comparisonTitle: 'مقارنة الأداء',
    comparisonDescription: 'مراجعة أبرز الأسهم الدورية حسب قوة الحركة خلال اليوم لقياس الاختلافات النسبية بين القطاعات.',
    historicalUnavailable: 'البيانات التاريخية غير متاحة حالياً.',
    highlightedTitle: 'أسهم دورية بارزة',
    highlightedDescription: 'عرض موجز لأبرز الأسهم الدورية المتاحة. القائمة الكاملة في تبويب الأسهم الدورية مع خيارات الفرز والبحث.',
    viewAllStocks: 'عرض جميع الأسهم',
    educationPreview: 'دليل الأسهم الدورية',
    educationPreviewBody: 'بطاقات تعليمية مختصرة ومغلقة افتراضياً حتى تبقى الصفحة سهلة التصفح.',
    stocksTitle: 'مستكشف الأسهم الدورية',
    stocksDescription: 'بطاقات بحث وفرز للأسهم الدورية المتاحة مع السعر، التغير اليومي، السوق، والعملة.',
    search: 'البحث',
    searchPlaceholder: 'ابحث عن شركة أو رمز أو قطاع...',
    sector: 'القطاع',
    allSectors: 'كل القطاعات',
    sort: 'الترتيب',
    resultCount: 'عدد النتائج',
    clearFilters: 'مسح عوامل التصفية',
    activeFilters: 'الفلاتر النشطة',
    company: 'الشركة',
    symbol: 'الرمز',
    currentPrice: 'السعر الحالي',
    change: 'التغير',
    dailyChange: 'التغير اليومي',
    market: 'السوق',
    currency: 'العملة',
    usMarket: 'السوق الأمريكية',
    beta: 'Beta',
    volatility: 'التذبذب',
    drawdown: 'أعلى هبوط',
    revenueGrowth: 'نمو الإيرادات',
    earningsGrowth: 'نمو الأرباح',
    operatingMargin: 'الهامش التشغيلي',
    netDebt: 'صافي الدين',
    debtToEbitda: 'الدين إلى EBITDA',
    interestCoverage: 'تغطية الفائدة',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    marketCap: 'القيمة السوقية',
    economicSensitivity: 'الحساسية الاقتصادية',
    portfolioStatus: 'المحفظة / المراقبة',
    notEnoughFundamentals: 'لا تتوفر بيانات أساسية كافية',
    sensitivityMethodology: 'التصنيف هنا قطاعي أولي فقط. احتساب حساسية كمية يتطلب Beta، تقلب الإيرادات، تقلب الأرباح، الهبوط الأقصى، والرافعة المالية.',
    highSectorSensitivity: 'قطاع عالي الحساسية',
    mediumSectorSensitivity: 'قطاع متوسط الحساسية',
    mixedSectorSensitivity: 'نشاط مختلط الحساسية',
    qualityUnavailable: 'جودة الأعمال غير متاحة',
    leverageUnavailable: 'المديونية غير متاحة',
    valuationUnavailable: 'التقييم غير متاح',
    compare: 'مقارنة',
    viewAnalysis: 'عرض التحليل',
    addWatchlist: 'إضافة للمراقبة',
    noStockResults: 'لا توجد أسهم مطابقة للفلاتر الحالية.',
    newsTitle: 'أخبار الأسهم الدورية',
    newsDescription: 'أخبار مرتبطة بالسيارات، السفر، الصناعات، العقارات، الإنفاق الاختياري، ونتائج الشركات الدورية.',
    newsSearchPlaceholder: 'ابحث في الأخبار أو الرمز أو الشركة...',
    timeRange: 'الفترة الزمنية',
    sourceFilter: 'المصدر',
    symbolFilter: 'الشركة / الرمز',
    latest: 'الأحدث',
    oldest: 'الأقدم',
    strongestMoveSort: 'أقوى حركة سعرية',
    day: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوماً',
    all: 'الكل',
    featuredNews: 'أخبار مؤثرة',
    translated: 'ترجمة آلية',
    showOriginal: 'عرض النص الأصلي',
    hideOriginal: 'إخفاء النص الأصلي',
    readArticle: 'قراءة الخبر',
    loadMore: 'عرض المزيد',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    noNewsResults: 'لا توجد أخبار مطابقة للفلاتر الحالية.',
    providerError: 'تعذر تحديث البيانات حالياً. يتم عرض آخر بيانات متاحة عند توفرها.',
    retry: 'إعادة المحاولة',
    sectorsTitle: 'دليل القطاعات الدورية',
    sectorsDescription: 'تفصل هذه الصفحة القطاعات الدورية عن التعليم العام، وتعرض فقط المقاييس المحسوبة من الأسعار المتاحة.',
    sectorPerformance: 'أداء القطاع المتاح',
    mainDrivers: 'محركات القطاع',
    economicCycleTitle: 'تحليل الدورة الاقتصادية',
    economicCycleDescription: 'تربط هذه المساحة الأسهم الدورية بالمؤشرات الاقتصادية عند توفر بيانات موثوقة وحديثة.',
    phaseRecovery: 'تعافٍ',
    phaseExpansion: 'توسع',
    phasePeak: 'ذروة',
    phaseSlowdown: 'تباطؤ',
    phaseContraction: 'انكماش',
    phaseInsufficient: 'بيانات غير كافية',
    macroIndicators: {
      gdp: 'نمو الناتج المحلي',
      pmi: 'PMI',
      industrial: 'الإنتاج الصناعي',
      unemployment: 'البطالة',
      confidence: 'ثقة المستهلك',
      retail: 'مبيعات التجزئة',
      policyRate: 'سعر الفائدة',
      yieldCurve: 'منحنى العائد',
      housing: 'نشاط الإسكان',
      inflation: 'التضخم / مؤشر أسعار المستهلك',
    },
    educationCards: {
      what: 'ما هي الأسهم الدورية؟',
      sectors: 'أبرز القطاعات الدورية',
      defensive: 'الفرق بينها وبين الدفاعية',
      cycle: 'مراحل الدورة الاقتصادية',
      rates: 'تأثير أسعار الفائدة',
      employment: 'البطالة وثقة المستهلك',
      debt: 'مخاطر المديونية',
      decline: 'متى تتراجع؟',
      balance: 'كيف توازنها مع الدفاعية؟',
    },
    educationBody: {
      what: 'هي شركات تتحسن عادةً مع قوة النمو والإنفاق، وتتضرر أكثر عندما ينكمش الطلب أو ترتفع تكلفة التمويل.',
      sectors: 'السيارات، السفر، الفنادق، الصناعات، البناء، المواد، النقل، التجزئة غير الأساسية والسلع الفاخرة.',
      defensive: 'الدفاعية ترتبط بطلب أكثر استقراراً، أما الدورية فحساسيتها أكبر للدخل، الائتمان، وثقة المستهلك.',
      cycle: 'التعافي والتوسع قد يدعمان الطلب، بينما التباطؤ والانكماش يضغطان على الأرباح والهوامش.',
      rates: 'ارتفاع الفائدة قد يخفض الإنفاق والتمويل، خاصة في السيارات والعقار والشركات عالية المديونية.',
      employment: 'الوظائف وثقة المستهلك تؤثر في السفر والمطاعم والسلع غير الأساسية.',
      debt: 'الشركات ذات الرافعة العالية قد تتأثر بشدة عند ضعف الإيرادات أو ارتفاع تكلفة الدين.',
      decline: 'تتراجع عادةً مع ضعف الطلب، مفاجآت الأرباح السلبية، ارتفاع الفائدة، أو إشارات ركود واضحة.',
      balance: 'الجمع بين دورية ودفاعية قد يقلل الاعتماد على سيناريو اقتصادي واحد، لكنه لا يلغي المخاطر.',
    },
    disclaimerTitle: 'تنبيه استثماري',
    disclaimer: 'البيانات والتصنيفات المعروضة لأغراض تعليمية ومعلوماتية فقط، ولا تُعد نصيحة استثمارية أو توصية بشراء أو بيع أي سهم. التصنيفات القطاعية أولية ولا تستبدل التحليل المالي الكامل.',
  },
  en: {
    badge: 'Economic-cycle research center',
    title: 'Cyclical Stocks',
    subtitle: 'Track companies and sectors tied to economic growth and consumer spending, while separating opportunity from cycle and volatility risk.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    connected: 'Market updates available',
    partial: 'Limited updates',
    delayed: 'Quotes may be delayed or cached by source.',
    source: 'Source',
    unavailable: 'Unavailable',
    lastQuoteUpdate: 'Last quote update',
    lastNewsUpdate: 'Last news update',
    lastMacroUpdate: 'Last macro update',
    macroNotConnected: 'Economic-cycle indicators will appear when reliable data is available.',
    insufficientMacro: 'Insufficient data',
    tabs: {
      overview: 'Overview',
      stocks: 'Cyclical Stocks',
      news: 'News',
      sectors: 'Sectors',
      'economic-cycle': 'Economic Cycle',
    },
    tickerTitle: 'Cyclical stock ticker',
    overviewSummary: 'Cyclical market summary',
    economicDashboard: 'Economic-cycle indicators',
    cyclePhase: 'Potential cycle phase',
    howPhase: 'How was the phase determined?',
    macroUnavailableBody: 'Economic-cycle indicators will appear when reliable data is available.',
    macroEducationalOnly: 'Awaiting data',
    macroEmptyTitle: 'Economic-cycle indicators are not shown right now',
    macroEmptyBody: 'Economic-cycle indicators will appear when reliable and current data is available. Estimated or demo numbers are not displayed on this page.',
    macroErrorTitle: 'Economic-cycle indicators could not be refreshed',
    macroDevHintLabel: 'Developer note',
    macroRetry: 'Refresh indicators',
    macroLoading: 'Loading economic-cycle indicators...',
    macroAvailableOnly: 'Only indicators available from reliable sources are shown.',
    macroDate: 'Reading date',
    macroStatus: 'Status',
    macroChangePrevious: 'Versus previous reading',
    macroChangeForecast: 'Versus forecast',
    macroStatusActual: 'Actual reading',
    macroStatusForecast: 'Published forecast',
    macroStatusStale: 'Last saved reading',
    risingStocks: 'Rising stocks',
    fallingStocks: 'Falling stocks',
    topGainers: 'Top gainers',
    topLosers: 'Top losers',
    highestVolume: 'Most traded',
    moversUnavailable: 'There is not enough movement data to show gainers and losers right now.',
    noMoverGroupData: 'Not enough data for this ranking.',
    bestSector: 'Best available sector',
    strongestMover: 'Strongest move',
    highestVolatility: 'Highest daily volatility',
    trackedStocks: 'Tracked stocks',
    comparisonTitle: 'Performance comparison',
    comparisonDescription: 'Compare top movers by daily movement and volatility so you can quickly identify which cyclicals are strongest or weakest today.',
    historicalUnavailable: 'Historical data is unavailable right now.',
    highlightedTitle: 'Highlighted cyclical stocks',
    highlightedDescription: 'A concise snapshot of standout cyclical stocks. Use the Stocks tab for the full list, sorting, and filters.',
    viewAllStocks: 'View all stocks',
    educationPreview: 'Cyclical stocks guide',
    educationPreviewBody: 'Short educational cards start collapsed to keep the page compact.',
    stocksTitle: 'Cyclical stock screener',
    stocksDescription: 'Search and sort available cyclical stocks with price, daily change, market, and currency.',
    search: 'Search',
    searchPlaceholder: 'Search company, symbol, or sector...',
    sector: 'Sector',
    allSectors: 'All sectors',
    sort: 'Sort',
    resultCount: 'Results',
    clearFilters: 'Clear filters',
    activeFilters: 'Active filters',
    company: 'Company',
    symbol: 'Symbol',
    currentPrice: 'Current price',
    change: 'Change',
    dailyChange: 'Daily change',
    market: 'Market',
    currency: 'Currency',
    usMarket: 'US market',
    beta: 'Beta',
    volatility: 'Volatility',
    drawdown: 'Max drawdown',
    revenueGrowth: 'Revenue growth',
    earningsGrowth: 'Earnings growth',
    operatingMargin: 'Operating margin',
    netDebt: 'Net debt',
    debtToEbitda: 'Debt / EBITDA',
    interestCoverage: 'Interest coverage',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    marketCap: 'Market cap',
    economicSensitivity: 'Economic sensitivity',
    portfolioStatus: 'Portfolio / watchlist',
    notEnoughFundamentals: 'Not enough fundamentals',
    sensitivityMethodology: 'This is sector context only. Quantitative sensitivity requires beta, revenue volatility, earnings volatility, max drawdown, and leverage.',
    highSectorSensitivity: 'High-sensitivity sector',
    mediumSectorSensitivity: 'Medium-sensitivity sector',
    mixedSectorSensitivity: 'Mixed sensitivity',
    qualityUnavailable: 'Business quality unavailable',
    leverageUnavailable: 'Leverage unavailable',
    valuationUnavailable: 'Valuation unavailable',
    compare: 'Compare',
    viewAnalysis: 'View analysis',
    addWatchlist: 'Add to watchlist',
    noStockResults: 'No stocks match the current filters.',
    newsTitle: 'Cyclical stocks news',
    newsDescription: 'News tied to autos, travel, industrials, property, discretionary spending, and cyclical earnings.',
    newsSearchPlaceholder: 'Search news, symbol, or company...',
    timeRange: 'Time range',
    sourceFilter: 'Source',
    symbolFilter: 'Company / symbol',
    latest: 'Latest',
    oldest: 'Oldest',
    strongestMoveSort: 'Strongest price move',
    day: 'Today',
    week: 'Last 7 days',
    month: 'Last 30 days',
    all: 'All',
    featuredNews: 'Important news',
    translated: 'Machine translation',
    showOriginal: 'Show original',
    hideOriginal: 'Hide original',
    readArticle: 'Read article',
    loadMore: 'Load more',
    showMore: 'Show more',
    showLess: 'Show less',
    noNewsResults: 'No news matches the current filters.',
    providerError: 'Data could not be refreshed right now. Last available data remains visible when present.',
    retry: 'Retry',
    sectorsTitle: 'Cyclical sector guide',
    sectorsDescription: 'Education is separated from market research, with only price-derived metrics shown where available.',
    sectorPerformance: 'Available sector performance',
    mainDrivers: 'Sector drivers',
    economicCycleTitle: 'Economic-cycle analysis',
    economicCycleDescription: 'This area connects cyclical stocks to economic indicators when reliable and current data is available.',
    phaseRecovery: 'Recovery',
    phaseExpansion: 'Expansion',
    phasePeak: 'Peak',
    phaseSlowdown: 'Slowdown',
    phaseContraction: 'Contraction',
    phaseInsufficient: 'Insufficient data',
    macroIndicators: {
      gdp: 'GDP growth',
      pmi: 'PMI',
      industrial: 'Industrial production',
      unemployment: 'Unemployment',
      confidence: 'Consumer confidence',
      retail: 'Retail sales',
      policyRate: 'Policy rate',
      yieldCurve: 'Yield curve',
      housing: 'Housing activity',
      inflation: 'Inflation / CPI',
    },
    educationCards: {
      what: 'What are cyclical stocks?',
      sectors: 'Key cyclical sectors',
      defensive: 'Cyclical vs defensive',
      cycle: 'Economic-cycle phases',
      rates: 'Interest-rate impact',
      employment: 'Jobs and confidence',
      debt: 'Leverage risk',
      decline: 'When cyclicals fall',
      balance: 'Balancing with defensives',
    },
    educationBody: {
      what: 'Companies that often improve with stronger growth and spending, and weaken faster when demand contracts or financing tightens.',
      sectors: 'Autos, travel, hotels, industrials, construction, materials, transport, discretionary retail, and luxury goods.',
      defensive: 'Defensives are linked to steadier demand, while cyclicals are more sensitive to income, credit, and confidence.',
      cycle: 'Recovery and expansion can support demand; slowdown and contraction can pressure margins and earnings.',
      rates: 'Higher rates may reduce spending and financing, especially in autos, housing, and leveraged businesses.',
      employment: 'Jobs and confidence influence travel, restaurants, and discretionary goods.',
      debt: 'Highly levered companies can suffer more when revenue weakens or debt costs rise.',
      decline: 'They often fall with weaker demand, negative earnings surprises, higher rates, or recession signals.',
      balance: 'Combining cyclicals and defensives may reduce reliance on one macro scenario, but does not remove risk.',
    },
    disclaimerTitle: 'Investment notice',
    disclaimer: 'Data and classifications are for educational and informational purposes only and are not investment advice. Sector classifications are preliminary and do not replace full financial analysis.',
  },
  fr: {
    badge: 'Centre de recherche du cycle économique',
    title: 'Actions cycliques',
    subtitle: 'Suivez les sociétés et secteurs liés à la croissance économique et aux dépenses des consommateurs, en séparant opportunité, cycle et volatilité.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    connected: 'Mises à jour de marché disponibles',
    partial: 'Mises à jour limitées',
    delayed: 'Les cours peuvent être retardés ou mis en cache selon la source.',
    source: 'Source',
    unavailable: 'Indisponible',
    lastQuoteUpdate: 'Dernière mise à jour des cours',
    lastNewsUpdate: 'Dernière mise à jour des actualités',
    lastMacroUpdate: 'Dernière mise à jour macro',
    macroNotConnected: 'Les indicateurs du cycle économique apparaîtront lorsque des données fiables seront disponibles.',
    insufficientMacro: 'Données insuffisantes',
    tabs: {
      overview: 'Aperçu',
      stocks: 'Actions cycliques',
      news: 'Actualités',
      sectors: 'Secteurs',
      'economic-cycle': 'Cycle économique',
    },
    tickerTitle: 'Ticker des actions cycliques',
    overviewSummary: 'Résumé des actions cycliques',
    economicDashboard: 'Indicateurs du cycle économique',
    cyclePhase: 'Phase potentielle du cycle',
    howPhase: 'Comment la phase est-elle déterminée ?',
    macroUnavailableBody: 'Les indicateurs du cycle économique apparaîtront lorsque des données fiables seront disponibles.',
    macroEducationalOnly: 'En attente de données',
    macroEmptyTitle: 'Les indicateurs du cycle économique ne sont pas affichés actuellement',
    macroEmptyBody: 'Les indicateurs du cycle économique apparaîtront lorsque des données fiables et récentes seront disponibles. Aucun chiffre estimé ou de démonstration n’est affiché sur cette page.',
    macroErrorTitle: 'Les indicateurs du cycle économique n’ont pas pu être actualisés',
    macroDevHintLabel: 'Note développeur',
    macroRetry: 'Actualiser les indicateurs',
    macroLoading: 'Chargement des indicateurs du cycle économique...',
    macroAvailableOnly: 'Seuls les indicateurs disponibles depuis des sources fiables sont affichés.',
    macroDate: 'Date de lecture',
    macroStatus: 'Statut',
    macroChangePrevious: 'Par rapport à la lecture précédente',
    macroChangeForecast: 'Par rapport à la prévision',
    macroStatusActual: 'Lecture réelle',
    macroStatusForecast: 'Prévision publiée',
    macroStatusStale: 'Dernière lecture enregistrée',
    risingStocks: 'Actions en hausse',
    fallingStocks: 'Actions en baisse',
    topGainers: 'Plus fortes hausses',
    topLosers: 'Plus fortes baisses',
    highestVolume: 'Plus échangées',
    moversUnavailable: 'Les données de mouvement sont insuffisantes pour afficher les hausses et baisses actuellement.',
    noMoverGroupData: 'Données insuffisantes pour ce classement.',
    bestSector: 'Meilleur secteur disponible',
    strongestMover: 'Plus forte variation',
    highestVolatility: 'Plus forte volatilité journalière',
    trackedStocks: 'Actions suivies',
    comparisonTitle: 'Comparaison des performances',
    comparisonDescription: 'Comparez les variations quotidiennes et la volatilité pour repérer rapidement les actions cycliques les plus fortes ou les plus faibles.',
    historicalUnavailable: 'Les données historiques sont indisponibles.',
    highlightedTitle: 'Actions cycliques en évidence',
    highlightedDescription: 'Vue concise des actions cycliques en relief. Pour la liste complète, triez et filtrez depuis l’onglet Actions.',
    viewAllStocks: 'Voir toutes les actions',
    educationPreview: 'Guide des actions cycliques',
    educationPreviewBody: 'Des cartes éducatives courtes sont fermées par défaut pour garder la page compacte.',
    stocksTitle: 'Screener des actions cycliques',
    stocksDescription: 'Recherchez et triez les actions cycliques disponibles avec cours, variation journalière, marché et devise.',
    search: 'Recherche',
    searchPlaceholder: 'Rechercher une société, un symbole ou un secteur...',
    sector: 'Secteur',
    allSectors: 'Tous les secteurs',
    sort: 'Tri',
    resultCount: 'Résultats',
    clearFilters: 'Effacer les filtres',
    activeFilters: 'Filtres actifs',
    company: 'Société',
    symbol: 'Symbole',
    currentPrice: 'Cours actuel',
    change: 'Variation',
    dailyChange: 'Variation journalière',
    market: 'Marché',
    currency: 'Devise',
    usMarket: 'Marché américain',
    beta: 'Beta',
    volatility: 'Volatilité',
    drawdown: 'Drawdown max',
    revenueGrowth: 'Croissance du CA',
    earningsGrowth: 'Croissance des bénéfices',
    operatingMargin: 'Marge opérationnelle',
    netDebt: 'Dette nette',
    debtToEbitda: 'Dette / EBITDA',
    interestCoverage: 'Couverture intérêts',
    pe: 'P/E',
    forwardPe: 'Forward P/E',
    marketCap: 'Capitalisation',
    economicSensitivity: 'Sensibilité économique',
    portfolioStatus: 'Portefeuille / watchlist',
    notEnoughFundamentals: 'Fondamentaux insuffisants',
    sensitivityMethodology: 'Ce contexte est sectoriel uniquement. Une sensibilité quantitative exige beta, volatilité des revenus, volatilité des bénéfices, drawdown et levier.',
    highSectorSensitivity: 'Secteur très sensible',
    mediumSectorSensitivity: 'Secteur moyennement sensible',
    mixedSectorSensitivity: 'Sensibilité mixte',
    qualityUnavailable: 'Qualité indisponible',
    leverageUnavailable: 'Levier indisponible',
    valuationUnavailable: 'Valorisation indisponible',
    compare: 'Comparer',
    viewAnalysis: 'Voir l’analyse',
    addWatchlist: 'Ajouter à la watchlist',
    noStockResults: 'Aucune action ne correspond aux filtres.',
    newsTitle: 'Actualités des actions cycliques',
    newsDescription: 'Actualités liées aux automobiles, voyages, industries, immobilier, consommation discrétionnaire et résultats cycliques.',
    newsSearchPlaceholder: 'Rechercher actualité, symbole ou société...',
    timeRange: 'Période',
    sourceFilter: 'Source',
    symbolFilter: 'Société / symbole',
    latest: 'Plus récent',
    oldest: 'Plus ancien',
    strongestMoveSort: 'Plus forte variation',
    day: 'Aujourd’hui',
    week: '7 derniers jours',
    month: '30 derniers jours',
    all: 'Tout',
    featuredNews: 'Actualités importantes',
    translated: 'Traduction automatique',
    showOriginal: 'Afficher l’original',
    hideOriginal: 'Masquer l’original',
    readArticle: 'Lire l’article',
    loadMore: 'Afficher plus',
    showMore: 'Voir plus',
    showLess: 'Voir moins',
    noNewsResults: 'Aucune actualité ne correspond aux filtres.',
    providerError: 'Impossible d’actualiser les données. Les dernières données disponibles restent visibles.',
    retry: 'Réessayer',
    sectorsTitle: 'Guide des secteurs cycliques',
    sectorsDescription: 'L’éducation est séparée de la recherche de marché et seules les métriques issues des prix disponibles sont affichées.',
    sectorPerformance: 'Performance sectorielle disponible',
    mainDrivers: 'Moteurs du secteur',
    economicCycleTitle: 'Analyse du cycle économique',
    economicCycleDescription: 'Cet espace relie les actions cycliques aux indicateurs économiques lorsque des données fiables et récentes sont disponibles.',
    phaseRecovery: 'Reprise',
    phaseExpansion: 'Expansion',
    phasePeak: 'Pic',
    phaseSlowdown: 'Ralentissement',
    phaseContraction: 'Contraction',
    phaseInsufficient: 'Données insuffisantes',
    macroIndicators: {
      gdp: 'Croissance PIB',
      pmi: 'PMI',
      industrial: 'Production industrielle',
      unemployment: 'Chômage',
      confidence: 'Confiance des consommateurs',
      retail: 'Ventes au détail',
      policyRate: 'Taux directeur',
      yieldCurve: 'Courbe des taux',
      housing: 'Logement',
      inflation: 'Inflation / IPC',
    },
    educationCards: {
      what: 'Que sont les actions cycliques ?',
      sectors: 'Principaux secteurs cycliques',
      defensive: 'Cycliques vs défensives',
      cycle: 'Phases du cycle',
      rates: 'Impact des taux',
      employment: 'Emploi et confiance',
      debt: 'Risque de levier',
      decline: 'Quand elles baissent',
      balance: 'Équilibrer avec les défensives',
    },
    educationBody: {
      what: 'Sociétés souvent favorisées par la croissance et les dépenses, mais plus fragiles quand la demande ou le financement se contractent.',
      sectors: 'Automobile, voyage, hôtels, industrie, construction, matériaux, transport, distribution discrétionnaire et luxe.',
      defensive: 'Les défensives reposent sur une demande plus stable ; les cycliques dépendent davantage du revenu, du crédit et de la confiance.',
      cycle: 'Reprise et expansion peuvent soutenir la demande ; ralentissement et contraction peuvent peser sur les marges.',
      rates: 'Des taux élevés peuvent réduire les dépenses et le financement, surtout dans l’auto, l’immobilier et les sociétés endettées.',
      employment: 'Emploi et confiance influencent les voyages, restaurants et biens discrétionnaires.',
      debt: 'Les entreprises très endettées peuvent souffrir davantage lorsque les revenus baissent ou les coûts de dette montent.',
      decline: 'Elles baissent souvent avec une demande plus faible, des résultats décevants, des taux plus élevés ou des signaux de récession.',
      balance: 'Combiner cycliques et défensives peut réduire la dépendance à un seul scénario macro, sans supprimer le risque.',
    },
    disclaimerTitle: 'Avis investissement',
    disclaimer: 'Les données et classifications sont informatives et éducatives, sans constituer un conseil d’investissement. Les classifications sectorielles sont préliminaires et ne remplacent pas une analyse financière complète.',
  },
} as const;

const SECTORS: SectorDefinition[] = [
  {
    id: 'autos',
    label: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' },
    description: {
      ar: 'حساسة للائتمان وثقة المستهلك والطلب على السلع المعمرة.',
      en: 'Sensitive to credit, confidence, and durable-goods demand.',
      fr: 'Sensible au crédit, à la confiance et aux biens durables.',
    },
    drivers: {
      ar: ['الفائدة على القروض', 'ثقة المستهلك', 'أسعار الوقود', 'سلاسل الإمداد'],
      en: ['Loan rates', 'Consumer confidence', 'Fuel prices', 'Supply chains'],
      fr: ['Taux de crédit', 'Confiance', 'Carburant', 'Chaînes d’approvisionnement'],
    },
    icon: Car,
    sensitivity: 'high',
  },
  {
    id: 'airlines_travel',
    label: { ar: 'السفر والطيران', en: 'Travel and airlines', fr: 'Voyage et compagnies aériennes' },
    description: {
      ar: 'يرتبط بإنفاق المستهلك والشركات وأسعار الوقود والقدرة الاستيعابية.',
      en: 'Tied to consumer/business travel, fuel costs, and capacity.',
      fr: 'Lié aux voyages, au carburant et à la capacité.',
    },
    drivers: {
      ar: ['السفر الترفيهي', 'سفر الأعمال', 'أسعار الوقود', 'السعة التشغيلية'],
      en: ['Leisure travel', 'Business travel', 'Fuel prices', 'Capacity'],
      fr: ['Loisir', 'Affaires', 'Carburant', 'Capacité'],
    },
    icon: Plane,
    sensitivity: 'high',
  },
  {
    id: 'hotels_entertainment',
    label: { ar: 'الفنادق والترفيه', en: 'Hotels and entertainment', fr: 'Hôtels et loisirs' },
    description: {
      ar: 'يتأثر بالطلب السياحي، الفعاليات، والإنفاق الاختياري.',
      en: 'Affected by tourism demand, events, and discretionary spending.',
      fr: 'Affecté par le tourisme, les événements et les dépenses discrétionnaires.',
    },
    drivers: {
      ar: ['الإشغال', 'متوسط سعر الغرفة', 'السياحة', 'الدخل المتاح'],
      en: ['Occupancy', 'Room rates', 'Tourism', 'Disposable income'],
      fr: ['Occupation', 'Prix chambre', 'Tourisme', 'Revenu disponible'],
    },
    icon: Hotel,
    sensitivity: 'high',
  },
  {
    id: 'industrials',
    label: { ar: 'الصناعات', en: 'Industrials', fr: 'Industrie' },
    description: {
      ar: 'تعتمد على الإنفاق الرأسمالي والطلبات الصناعية ومشاريع البنية التحتية.',
      en: 'Driven by capex, industrial orders, and infrastructure projects.',
      fr: 'Dépend des investissements, commandes industrielles et infrastructures.',
    },
    drivers: {
      ar: ['الطلبات الصناعية', 'البنية التحتية', 'الهوامش', 'الدورة الرأسمالية'],
      en: ['Industrial orders', 'Infrastructure', 'Margins', 'Capex cycle'],
      fr: ['Commandes', 'Infrastructure', 'Marges', 'Cycle d’investissement'],
    },
    icon: Factory,
    sensitivity: 'medium',
  },
  {
    id: 'construction_real_estate',
    label: { ar: 'البناء والعقار', en: 'Construction and real estate', fr: 'Construction et immobilier' },
    description: {
      ar: 'حساس للفائدة، الرهن العقاري، الإسكان، والإنفاق على تحسين المنازل.',
      en: 'Sensitive to rates, mortgages, housing, and home-improvement spending.',
      fr: 'Sensible aux taux, hypothèques, logement et rénovation.',
    },
    drivers: {
      ar: ['الفائدة', 'الرهن العقاري', 'تصاريح البناء', 'مبيعات المنازل'],
      en: ['Rates', 'Mortgages', 'Building permits', 'Home sales'],
      fr: ['Taux', 'Hypothèques', 'Permis', 'Ventes de logements'],
    },
    icon: Building2,
    sensitivity: 'high',
  },
  {
    id: 'luxury_goods',
    label: { ar: 'السلع الفاخرة', en: 'Luxury goods', fr: 'Luxe' },
    description: {
      ar: 'يتأثر بثروة المستهلك، السياحة، وقوة الطلب العالمي على المنتجات الممتازة.',
      en: 'Sensitive to wealth effects, tourism, and premium-goods demand.',
      fr: 'Sensible à l’effet richesse, au tourisme et à la demande premium.',
    },
    drivers: {
      ar: ['ثروة المستهلك', 'السياحة', 'الدولار', 'الطلب العالمي'],
      en: ['Wealth effect', 'Tourism', 'USD', 'Global demand'],
      fr: ['Effet richesse', 'Tourisme', 'Dollar', 'Demande mondiale'],
    },
    icon: ShoppingBag,
    sensitivity: 'medium',
  },
  {
    id: 'nonessential_retail',
    label: { ar: 'التجزئة غير الأساسية', en: 'Discretionary retail', fr: 'Distribution discrétionnaire' },
    description: {
      ar: 'يرتبط بالدخل المتاح، الأجور، ثقة المستهلك، والتضخم.',
      en: 'Linked to disposable income, wages, confidence, and inflation.',
      fr: 'Lié au revenu disponible, salaires, confiance et inflation.',
    },
    drivers: {
      ar: ['الدخل المتاح', 'الأجور', 'التضخم', 'ثقة المستهلك'],
      en: ['Disposable income', 'Wages', 'Inflation', 'Confidence'],
      fr: ['Revenu disponible', 'Salaires', 'Inflation', 'Confiance'],
    },
    icon: Utensils,
    sensitivity: 'medium',
  },
  {
    id: 'basic_materials',
    label: { ar: 'المواد الأساسية', en: 'Basic materials', fr: 'Matériaux' },
    description: {
      ar: 'تعتمد على الطلب الصناعي، أسعار السلع، والبناء العالمي.',
      en: 'Driven by industrial demand, commodity prices, and global construction.',
      fr: 'Dépend de la demande industrielle, des matières premières et construction.',
    },
    drivers: {
      ar: ['أسعار السلع', 'الصناعة', 'الصين', 'الدولار'],
      en: ['Commodities', 'Industry', 'China', 'USD'],
      fr: ['Matières premières', 'Industrie', 'Chine', 'Dollar'],
    },
    icon: Layers3,
    sensitivity: 'medium',
  },
  {
    id: 'transport',
    label: { ar: 'النقل والشحن', en: 'Transport and freight', fr: 'Transport et fret' },
    description: {
      ar: 'يرتبط بحركة التجارة، المخزونات، وأسعار الوقود.',
      en: 'Tied to trade activity, inventories, and fuel prices.',
      fr: 'Lié au commerce, stocks et carburant.',
    },
    drivers: {
      ar: ['حركة التجارة', 'المخزونات', 'الوقود', 'الشحن'],
      en: ['Trade activity', 'Inventories', 'Fuel', 'Freight'],
      fr: ['Commerce', 'Stocks', 'Carburant', 'Fret'],
    },
    icon: BriefcaseBusiness,
    sensitivity: 'medium',
  },
];

const EDUCATION_IDS: EducationId[] = ['what', 'sectors', 'defensive', 'cycle', 'rates', 'employment', 'debt', 'decline', 'balance'];

function normalizeSector(value: string | null | undefined, symbol?: string): Exclude<SectorId, 'all'> {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'travel_airlines') return 'airlines_travel';
  if (normalized === 'consumer_goods' || normalized === 'restaurants') return 'nonessential_retail';
  if (normalized === 'materials') return 'basic_materials';
  if (normalized === 'transportation') return 'transport';
  if (SECTORS.some(sector => sector.id === normalized)) return normalized as Exclude<SectorId, 'all'>;
  const bySymbol = symbol ? SYMBOL_SECTOR[symbol.toUpperCase()] : undefined;
  return bySymbol ?? 'industrials';
}

function localeFor(lang: LangCode) {
  if (lang === 'ar') return 'ar-KW-u-nu-latn';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function formatNumber(value: number | null | undefined, lang: LangCode, digits = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined, lang: LangCode) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  const safeCurrency = currency || 'USD';
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: value >= 100 ? 2 : 3,
    maximumFractionDigits: value >= 100 ? 2 : 3,
  }).format(value);
}

function formatPercent(value: number | null | undefined, lang: LangCode, digits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return COPY[lang].unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

function formatSignedValue(value: number | null, unit: string | null, lang: LangCode, digits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  const normalizedUnit = unit?.trim();
  const suffix = !normalizedUnit ? '' : normalizedUnit === '%' ? '%' : ` ${normalizedUnit}`;
  return `${sign}${formatted}${suffix}`;
}

function formatIndicatorChange(change: EconomicIndicatorChange | null, text: typeof COPY[LangCode], lang: LangCode) {
  if (!change) return '';
  const basis = change.basis === 'previous' ? text.macroChangePrevious : text.macroChangeForecast;
  const delta = formatSignedValue(change.delta, change.unit, lang);
  return delta ? `${delta} · ${basis}` : `${basis}: ${change.basisValue}`;
}

function macroStatusLabel(status: EconomicIndicatorStatus, text: typeof COPY[LangCode]) {
  if (status === 'stale') return text.macroStatusStale;
  if (status === 'forecast') return text.macroStatusForecast;
  return text.macroStatusActual;
}

function macroStatusTone(status: EconomicIndicatorStatus): Tone {
  if (status === 'forecast') return 'warning';
  if (status === 'stale') return 'info';
  return 'positive';
}

function stockMarketLabel(row: CyclicalStockRow, text: typeof COPY[LangCode]) {
  return row.market?.trim() || text.usMarket;
}

function analysisHref(symbol: string) {
  return `/market-analysis?symbol=${encodeURIComponent(symbol)}`;
}

function formatDateTime(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return COPY[lang].unavailable;
  return new Intl.DateTimeFormat(localeFor(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function relativeTime(value: string | null | undefined, lang: LangCode) {
  if (!value) return COPY[lang].unavailable;
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  if (Number.isNaN(diff)) return COPY[lang].unavailable;
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
  if (abs < 60_000) return formatter.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return formatter.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return formatter.format(Math.round(diff / 3_600_000), 'hour');
  return formatter.format(Math.round(diff / 86_400_000), 'day');
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const dates = values
    .map(value => value ? new Date(value).getTime() : NaN)
    .filter(value => Number.isFinite(value));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function textValue(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function articleTitle(item: CyclicalNewsItem) {
  return textValue(item.title) || textValue(item.headline) || textValue(item.titleOriginal);
}

function articleSummary(item: CyclicalNewsItem) {
  return textValue(item.summary) || textValue(item.summaryOriginal);
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeNews(items: CyclicalNewsItem[]) {
  const seen = new Set<string>();
  const deduped: CyclicalNewsItem[] = [];
  for (const item of items) {
    const url = safeExternalUrl(item.url);
    const title = normalizeTitle(articleTitle(item));
    const key = url || `${item.source}-${title}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
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

function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(value => textValue(value)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return payload as T;
}

function sectorDefinition(id: Exclude<SectorId, 'all'>) {
  return SECTORS.find(sector => sector.id === id) ?? SECTORS[3];
}

function toStockRow(item: CyclicalTickerItem, lang: LangCode): CyclicalStockRow {
  const sectorId = normalizeSector(item.sector, item.symbol);
  const sector = sectorDefinition(sectorId);
  const sensitivityTone: Tone = sector.sensitivity === 'high' ? 'warning' : sector.sensitivity === 'medium' ? 'info' : 'neutral';
  const sectorSensitivity = sector.sensitivity === 'high'
    ? COPY[lang].highSectorSensitivity
    : sector.sensitivity === 'medium'
      ? COPY[lang].mediumSectorSensitivity
      : COPY[lang].mixedSectorSensitivity;
  const availableFields = [
    item.price,
    item.changePercent,
    item.change,
    item.source,
    item.sector,
  ].filter(value => value !== null && value !== undefined && value !== '').length;
  return {
    ...item,
    sectorId,
    sectorLabel: sector.label[lang],
    sectorSensitivity,
    sensitivityTone,
    methodologyNote: COPY[lang].sensitivityMethodology,
    qualityLabel: COPY[lang].qualityUnavailable,
    leverageLabel: COPY[lang].leverageUnavailable,
    valuationLabel: COPY[lang].valuationUnavailable,
    dataCompleteness: Math.round((availableFields / 5) * 100),
  };
}

function normalizeTickerNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toTickerStripRow(item: CyclicalStockRow): CyclicalTickerStripItem {
  return {
    ...item,
    price: normalizeTickerNumber(item.price),
    change: normalizeTickerNumber(item.change),
    changePercent: normalizeTickerNumber(item.changePercent),
    source: item.source?.trim() ? item.source : null,
  };
}

function buildFallbackTickerRow(symbol: string, lang: LangCode): CyclicalTickerStripItem {
  const sectorId = normalizeSector(SYMBOL_SECTOR[symbol], symbol);
  const sector = sectorDefinition(sectorId);
  const sensitivityTone: Tone = sector.sensitivity === 'high' ? 'warning' : sector.sensitivity === 'medium' ? 'info' : 'neutral';
  const sectorSensitivity = sector.sensitivity === 'high'
    ? COPY[lang].highSectorSensitivity
    : sector.sensitivity === 'medium'
      ? COPY[lang].mediumSectorSensitivity
      : COPY[lang].mixedSectorSensitivity;

  const row: CyclicalStockRow = {
    symbol,
    name: CYCLICAL_TICKER_SYMBOL_NAMES[symbol] ?? symbol,
    sector: SYMBOL_SECTOR[symbol] ?? 'industrials',
    price: null,
    currency: 'USD',
    market: 'US',
    change: null,
    changePercent: null,
    source: '',
    delayed: false,
    sectorId,
    sectorLabel: sector.label[lang],
    sectorSensitivity,
    sensitivityTone,
    methodologyNote: COPY[lang].sensitivityMethodology,
    qualityLabel: COPY[lang].qualityUnavailable,
    leverageLabel: COPY[lang].leverageUnavailable,
    valuationLabel: COPY[lang].valuationUnavailable,
    dataCompleteness: 0,
  };
  return toTickerStripRow(row);
}

function buildTickerRows(rows: CyclicalStockRow[], lang: LangCode): CyclicalTickerStripItem[] {
  const rowBySymbol = new Map<string, CyclicalTickerStripItem>();
  rows.forEach(row => {
    rowBySymbol.set(row.symbol.toUpperCase(), toTickerStripRow(row));
  });

  const used = new Set<CyclicalTickerDisplaySymbol>();
  const orderedRows: CyclicalTickerStripItem[] = [];

  CYCLICAL_TICKER_SYMBOLS.forEach(symbol => {
    used.add(symbol);
    const fromApi = rowBySymbol.get(symbol);
    orderedRows.push(fromApi ?? buildFallbackTickerRow(symbol, lang));
  });

  rows.forEach(row => {
    const symbol = row.symbol.toUpperCase() as CyclicalTickerDisplaySymbol | string;
    if (!used.has(symbol as CyclicalTickerDisplaySymbol)) {
      used.add(symbol as CyclicalTickerDisplaySymbol);
      orderedRows.push(toTickerStripRow(row));
    }
  });

  return orderedRows;
}

function stockMatchesSearch(row: CyclicalStockRow, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [row.name, row.symbol, row.sectorLabel, row.sectorId]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function newsMatchesSearch(item: CyclicalNewsItem, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    articleTitle(item),
    articleSummary(item),
    item.source,
    item.companyName,
    item.ticker,
    item.sector,
    ...(item.sectors ?? []),
  ].join(' ').toLowerCase().includes(query);
}

function newsSector(item: CyclicalNewsItem): Exclude<SectorId, 'all'> {
  return normalizeSector(item.sector ?? item.sectors?.[0], item.ticker ?? undefined);
}

function sortStocks(rows: CyclicalStockRow[], sort: StockSort) {
  const list = [...rows];
  if (sort === 'leastVolatile') return list.sort((a, b) => Math.abs(a.changePercent ?? Infinity) - Math.abs(b.changePercent ?? Infinity));
  if (sort === 'momentum') return list.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'sector') return list.sort((a, b) => a.sectorLabel.localeCompare(b.sectorLabel) || a.name.localeCompare(b.name));
  return list.sort((a, b) => {
    const order = { high: 3, medium: 2, mixed: 1 } as const;
    return order[sectorDefinition(b.sectorId).sensitivity] - order[sectorDefinition(a.sectorId).sensitivity] || a.name.localeCompare(b.name);
  });
}

function sortNews(items: CyclicalNewsItem[], sort: NewsSort) {
  const list = [...items];
  if (sort === 'oldest') return list.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  if (sort === 'strongestMove') return list.sort((a, b) => Math.abs(b.changePercent ?? -Infinity) - Math.abs(a.changePercent ?? -Infinity));
  return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function readInitialUrlState() {
  if (typeof window === 'undefined') {
    return {
      tab: 'overview' as CyclicalTab,
      stockSearch: '',
      stockSector: 'all' as SectorId,
      stockSort: 'sensitivity' as StockSort,
      newsSearch: '',
      newsSectorValue: 'all' as SectorId,
      newsSourceValue: 'all',
      newsSymbolValue: 'all',
      newsTimeValue: 'all' as NewsTimeFilter,
      newsSortValue: 'latest' as NewsSort,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const tab = TAB_IDS.includes(params.get('tab') as CyclicalTab) ? params.get('tab') as CyclicalTab : 'overview';
  const stockSector = ['all', ...SECTORS.map(item => item.id)].includes(params.get('sector') ?? '')
    ? params.get('sector') as SectorId
    : 'all';
  const stockSort = ['sensitivity', 'leastVolatile', 'momentum', 'name', 'sector'].includes(params.get('sort') ?? '')
    ? params.get('sort') as StockSort
    : 'sensitivity';
  const newsSectorValue = ['all', ...SECTORS.map(item => item.id)].includes(params.get('nsector') ?? '')
    ? params.get('nsector') as SectorId
    : 'all';
  const newsTimeValue = ['all', 'day', 'week', 'month'].includes(params.get('time') ?? '')
    ? params.get('time') as NewsTimeFilter
    : 'all';
  const newsSortValue = ['latest', 'oldest', 'strongestMove'].includes(params.get('nsort') ?? '')
    ? params.get('nsort') as NewsSort
    : 'latest';
  return {
    tab,
    stockSearch: params.get('q') ?? '',
    stockSector,
    stockSort,
    newsSearch: params.get('nq') ?? '',
    newsSectorValue,
    newsSourceValue: params.get('source') ?? 'all',
    newsSymbolValue: params.get('symbol') ?? 'all',
    newsTimeValue,
    newsSortValue,
  };
}

function ToneBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

function SectionHeader({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <span className="section-icon"><Icon size={18} /></span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

function StateBox({ icon: Icon, title, body, actionLabel, onAction, tone = 'info' }: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: Tone;
}) {
  return (
    <div className={`state-box state-${tone}`}>
      <span><Icon size={22} /></span>
      <div>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
      {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone = 'info' }: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: Tone;
}) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {helper ? <em>{helper}</em> : null}
      </div>
    </div>
  );
}

function TickerStrip({ rows, loading, lang }: { rows: CyclicalTickerStripItem[]; loading: boolean; lang: LangCode }) {
  if (loading) {
    return (
      <section className="ticker-strip" aria-label={COPY[lang].tickerTitle}>
        <div className="ticker-track ticker-loading">
          {Array.from({ length: 6 }).map((_, index) => <div className="ticker-skeleton" key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <StockTickerStrip
      ariaLabel={COPY[lang].tickerTitle}
      items={rows.map(row => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        currency: row.currency,
        changePercent: row.changePercent,
        source: row.source,
        available: row.price !== null,
        meta: 'sectorLabel' in row ? row.sectorLabel : undefined,
      }))}
      locale={localeFor(lang)}
      unavailableLabel={COPY[lang].unavailable}
      sourceLabel={COPY[lang].source}
      className="ticker-strip"
      trackClassName="ticker-track"
      direction="ltr"
      durationSeconds={46}
    />
  );
}

function MacroEmptyState({ text, macro, onRefresh }: {
  text: typeof COPY[LangCode];
  macro: EconomicCycleResponse | null;
  onRefresh: () => void;
}) {
  const isError = macro?.status === 'error';
  return (
    <div className="macro-empty">
      <StateBox
        icon={isError ? AlertTriangle : BarChart3}
        title={isError ? text.macroErrorTitle : text.macroEmptyTitle}
        body={text.macroEmptyBody}
        actionLabel={text.macroRetry}
        onAction={onRefresh}
        tone={isError ? 'warning' : 'info'}
      />
      {process.env.NODE_ENV !== 'production' && macro?.devHint ? (
        <p className="dev-hint">
          <strong>{text.macroDevHintLabel}: </strong>
          {macro.devHint}
        </p>
      ) : null}
    </div>
  );
}

function EconomicCycleDashboard({
  text,
  lang,
  macro,
  loading,
  compact = false,
  onRefresh,
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  macro: EconomicCycleResponse | null;
  loading: boolean;
  compact?: boolean;
  onRefresh: () => void;
}) {
  const indicators = macro?.indicators ?? [];
  return (
    <section className="panel macro-panel">
      <SectionHeader
        icon={BarChart3}
        title={text.economicDashboard}
        description={indicators.length ? text.macroAvailableOnly : compact ? text.macroNotConnected : text.economicCycleDescription}
      />
      {loading ? (
        <StateBox icon={BarChart3} title={text.macroLoading} body={text.macroUnavailableBody} tone="info" />
      ) : indicators.length ? (
        <div className="macro-grid">
          {indicators.map(indicator => {
            const change = formatIndicatorChange(indicator.change, text, lang);
            return (
              <article className="macro-item" key={indicator.id}>
                <div className="macro-item-head">
                  <span>{text.macroIndicators[indicator.id]}</span>
                  <ToneBadge tone={macroStatusTone(indicator.status)}>{macroStatusLabel(indicator.status, text)}</ToneBadge>
                </div>
                <strong dir="ltr">{indicator.value}</strong>
                {change ? <small>{change}</small> : null}
                <div className="macro-detail-row">
                  <span>{text.macroDate}</span>
                  <b>{formatDateTime(indicator.date, lang)}</b>
                </div>
                <div className="macro-detail-row">
                  <span>{text.source}</span>
                  <b>{indicator.source}</b>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <MacroEmptyState text={text} macro={macro} onRefresh={onRefresh} />
      )}
    </section>
  );
}

function SummaryCards({ text, lang, rows, stats }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: CyclicalStockRow[];
  stats: SectorStat[];
}) {
  const rising = rows.filter(row => (row.changePercent ?? 0) > 0).length;
  const falling = rows.filter(row => (row.changePercent ?? 0) < 0).length;
  const strongest = rows.slice().sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))[0];
  const bestSector = stats
    .filter(stat => typeof stat.averageChange === 'number')
    .sort((a, b) => (b.averageChange ?? -Infinity) - (a.averageChange ?? -Infinity))[0];
  const volatile = rows
    .filter(row => typeof row.changePercent === 'number')
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))[0];

  return (
    <section className="metrics-grid" aria-label={text.overviewSummary}>
      <MetricCard icon={TrendingUp} label={text.risingStocks} value={formatNumber(rising, lang)} helper={text.trackedStocks} tone="positive" />
      <MetricCard icon={TrendingDown} label={text.fallingStocks} value={formatNumber(falling, lang)} helper={text.trackedStocks} tone="negative" />
      <MetricCard icon={Layers3} label={text.bestSector} value={bestSector ? bestSector.label[lang] : text.unavailable} helper={bestSector ? formatPercent(bestSector.averageChange, lang) : undefined} />
      <MetricCard icon={LineChart} label={text.strongestMover} value={strongest ? strongest.symbol : text.unavailable} helper={strongest ? formatPercent(strongest.changePercent, lang) : undefined} tone={(strongest?.changePercent ?? 0) >= 0 ? 'positive' : 'negative'} />
      <MetricCard icon={AlertTriangle} label={text.highestVolatility} value={volatile ? volatile.symbol : text.unavailable} helper={volatile ? formatPercent(volatile.changePercent, lang) : undefined} tone="warning" />
    </section>
  );
}

function ComparisonChart({ rows, text, lang }: { rows: CyclicalStockRow[]; text: typeof COPY[LangCode]; lang: LangCode }) {
  const comparison = rows
    .filter(row => typeof row.changePercent === 'number')
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, 5);
  const max = Math.max(1, ...comparison.map(row => Math.abs(row.changePercent ?? 0)));
  return (
    <section className="panel comparison-panel">
      <SectionHeader icon={BarChart3} title={text.comparisonTitle} description={text.comparisonDescription} />
      {comparison.length ? (
        <div className="bar-chart" role="img" aria-label={text.comparisonDescription}>
          {comparison.map(row => {
            const value = row.changePercent ?? 0;
            const width = Math.max(8, (Math.abs(value) / max) * 100);
            return (
              <div className="bar-row" key={row.symbol}>
                <div className="bar-label">
                  <strong dir="ltr">{row.symbol}</strong>
                  <span>{row.name}</span>
                </div>
                <div className="bar-track">
                  <span
                    className={value >= 0 ? 'bar positive' : 'bar negative'}
                    style={{ inlineSize: `${width}%` }}
                  />
                </div>
                <b dir="ltr">{formatPercent(value, lang)}</b>
              </div>
            );
          })}
        </div>
      ) : (
        <StateBox icon={Info} title={text.historicalUnavailable} tone="info" />
      )}
    </section>
  );
}

function HighlightedStocks({ rows, text, lang, onViewAll }: {
  rows: CyclicalStockRow[];
  text: typeof COPY[LangCode];
  lang: LangCode;
  onViewAll: () => void;
}) {
  const highlighted = rows
    .slice()
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, 8);
  return (
    <section className="panel highlighted-panel">
      <SectionHeader
        icon={BriefcaseBusiness}
        title={text.highlightedTitle}
        description={text.highlightedDescription}
        action={<button className="ghost-action" type="button" onClick={onViewAll}>{text.viewAllStocks}</button>}
      />
      {highlighted.length ? (
        <div className="stock-card-grid">
          {highlighted.map(row => <StockCard key={row.symbol} row={row} text={text} lang={lang} compact />)}
        </div>
      ) : (
        <StateBox icon={Search} title={text.noStockResults} tone="info" />
      )}
    </section>
  );
}

function EducationGuide({ text, open, toggle, preview = false }: {
  text: typeof COPY[LangCode];
  open: EducationId[];
  toggle: (id: EducationId) => void;
  preview?: boolean;
}) {
  const ids = preview ? EDUCATION_IDS.slice(0, 4) : EDUCATION_IDS;
  return (
    <section className="panel">
      <SectionHeader icon={BookOpen} title={text.educationPreview} description={text.educationPreviewBody} />
      <div className="accordion-list">
        {ids.map(id => {
          const expanded = open.includes(id);
          return (
            <article className="accordion-card" key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-expanded={expanded}
                aria-controls={`cyclical-guide-${id}`}
              >
                <span>{text.educationCards[id]}</span>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expanded ? <p id={`cyclical-guide-${id}`}>{text.educationBody[id]}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OverviewTab({ text, lang, rows, stats, movers, macro, macroLoading, refreshMacro, openGuide, toggleGuide, onViewAllStocks }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: CyclicalStockRow[];
  stats: SectorStat[];
  movers: StockCategoryMoversResponse | null;
  macro: EconomicCycleResponse | null;
  macroLoading: boolean;
  refreshMacro: () => void;
  openGuide: EducationId[];
  toggleGuide: (id: EducationId) => void;
  onViewAllStocks: () => void;
}) {
  return (
    <div className="tab-stack">
      <EconomicCycleDashboard text={text} lang={lang} macro={macro} loading={macroLoading} compact onRefresh={refreshMacro} />
      <SummaryCards text={text} lang={lang} rows={rows} stats={stats} />
      <div className="overview-grid">
        <MoversPanel movers={movers} text={text} lang={lang} />
        <ComparisonChart rows={rows} text={text} lang={lang} />
      </div>
      <HighlightedStocks rows={rows} text={text} lang={lang} onViewAll={onViewAllStocks} />
      <EducationGuide text={text} open={openGuide} toggle={toggleGuide} preview />
    </div>
  );
}

function MoversPanel({ movers, text, lang }: {
  movers: StockCategoryMoversResponse | null;
  text: typeof COPY[LangCode];
  lang: LangCode;
}) {
  const gainers = movers?.ok ? movers.data.topGainers : [];
  const losers = movers?.ok ? movers.data.topLosers : [];
  const volume = movers?.ok ? movers.data.highestVolume : [];
  const hasRows = gainers.length > 0 || losers.length > 0 || volume.length > 0;
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(current => ({ ...current, [key]: !current[key] }));
  };
  return (
    <section className="panel movers-panel">
      <SectionHeader icon={TrendingUp} title={text.strongestMover} description={movers?.ok ? `${text.source}: ${movers.source}` : text.moversUnavailable} />
      {hasRows ? (
        <div className="mover-tabs">
          <MoverList
            title={text.topGainers}
            items={gainers}
            text={text}
            lang={lang}
            tone="positive"
            expanded={expandedGroups.topGainers}
            onToggle={() => toggleGroup('topGainers')}
          />
          <MoverList
            title={text.topLosers}
            items={losers}
            text={text}
            lang={lang}
            tone="negative"
            expanded={expandedGroups.topLosers}
            onToggle={() => toggleGroup('topLosers')}
          />
          <MoverList
            title={text.highestVolume}
            items={volume}
            text={text}
            lang={lang}
            tone="info"
            expanded={expandedGroups.highestVolume}
            onToggle={() => toggleGroup('highestVolume')}
          />
        </div>
      ) : (
        <StateBox icon={Info} title={text.moversUnavailable} tone="info" />
      )}
    </section>
  );
}

function MoverList({
  title,
  items,
  text,
  lang,
  tone,
  expanded = false,
  onToggle,
  previewCount = MOVER_LIST_PREVIEW_LIMIT,
}: {
  title: string;
  items: StockCategoryMoverItem[];
  text: typeof COPY[LangCode];
  lang: LangCode;
  tone: Tone;
  expanded?: boolean;
  onToggle?: () => void;
  previewCount?: number;
}) {
  const hasMore = items.length > previewCount;
  const visibleItems = hasMore && !expanded ? items.slice(0, previewCount) : items;
  return (
    <div className="mover-list">
      <h3>{title}</h3>
      <div className="mover-list-grid">
        {items.length ? visibleItems.map(item => (
          <div className="mover-row" key={`${title}-${item.symbol}`}>
            <span>{item.rank}</span>
            <AssetIdentity symbol={item.symbol} name={item.name} assetType="stock" size="sm" decorative />
            <div>
              <strong dir="ltr">{item.symbol}</strong>
              <small>{item.name}</small>
            </div>
            <div className="mover-values">
              <b dir="ltr">{formatCurrency(item.price, item.currency, lang)}</b>
              <ToneBadge tone={tone}>{formatPercent(item.changePercent, lang)}</ToneBadge>
            </div>
          </div>
        )) : <p className="muted">{text.noMoverGroupData}</p>}
      </div>
      {hasMore ? (
        <button type="button" className="mover-list-toggle" onClick={() => onToggle?.()}>
          {expanded ? text.showLess : text.showMore}
        </button>
      ) : null}
    </div>
  );
}

function StockCard({ row, text, lang, compact = false }: {
  row: CyclicalStockRow;
  text: typeof COPY[LangCode];
  lang: LangCode;
  compact?: boolean;
}) {
  const changeTone = (row.changePercent ?? 0) > 0 ? 'positive' : (row.changePercent ?? 0) < 0 ? 'negative' : 'neutral';
  return (
    <article className={compact ? 'stock-card compact' : 'stock-card'}>
      <div className="stock-card-head">
        <AssetIdentity className="stock-logo" symbol={row.symbol} name={row.name} assetType="stock" size="md" decorative />
        <div>
          <strong>{row.name}</strong>
          <span dir="ltr">{row.symbol}</span>
        </div>
        <ToneBadge tone={row.sensitivityTone}>{row.sectorSensitivity}</ToneBadge>
      </div>
      <div className="stock-metrics">
        <div>
          <small>{text.currentPrice}</small>
          <b dir="ltr">{formatCurrency(row.price, row.currency, lang)}</b>
        </div>
        <div>
          <small>{text.dailyChange}</small>
          <b dir="ltr" className={`num-${changeTone}`}>{formatPercent(row.changePercent, lang)}</b>
        </div>
        <div>
          <small>{text.sector}</small>
          <b>{row.sectorLabel}</b>
        </div>
        <div>
          <small>{text.market}</small>
          <b>{stockMarketLabel(row, text)}</b>
        </div>
        <div>
          <small>{text.currency}</small>
          <b dir="ltr">{row.currency}</b>
        </div>
        <div>
          <small>{text.source}</small>
          <b>{row.source}</b>
        </div>
      </div>
      {!compact ? (
        <div className="stock-note">
          <Info size={15} />
          <span>{row.methodologyNote}</span>
        </div>
      ) : null}
      <div className="stock-actions">
        <a href={analysisHref(row.symbol)}>
          <ArrowUpRight size={16} />
          {text.viewAnalysis}
        </a>
      </div>
    </article>
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
}: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  rows: CyclicalStockRow[];
  allRows: CyclicalStockRow[];
  search: string;
  sector: SectorId;
  sort: StockSort;
  setSearch: (value: string) => void;
  setSector: (value: SectorId) => void;
  setSort: (value: StockSort) => void;
  reset: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="tab-stack">
      <section className="panel">
        <SectionHeader icon={Filter} title={text.stocksTitle} description={text.stocksDescription} />
        <FilterBar
          text={text}
          search={search}
          setSearch={setSearch}
          searchPlaceholder={text.searchPlaceholder}
          sector={sector}
          setSector={setSector}
          sort={sort}
          setSort={setSort}
          sortOptions={[
            ['sensitivity', text.economicSensitivity],
            ['leastVolatile', text.volatility],
            ['momentum', text.strongestMover],
            ['name', text.company],
            ['sector', text.sector],
          ]}
          hasActiveFilters={hasActiveFilters}
          reset={reset}
        />
        <div className="results-toolbar">
          <strong>{text.resultCount}: {formatNumber(rows.length, lang)}</strong>
          {hasActiveFilters ? <button type="button" onClick={reset}>{text.clearFilters}</button> : null}
        </div>
        {rows.length ? (
          <div className="stock-card-grid stock-results-grid">
            {rows.map(row => <StockCard key={row.symbol} row={row} text={text} lang={lang} />)}
          </div>
        ) : (
          <StateBox icon={Search} title={text.noStockResults} actionLabel={text.clearFilters} onAction={reset} />
        )}
      </section>
      <section className="panel">
        <SectionHeader icon={Info} title={text.howPhase} description={text.sensitivityMethodology} />
        <p className="muted paragraph">{allRows.length ? text.sensitivityMethodology : text.providerError}</p>
      </section>
    </div>
  );
}

function FilterBar({ text, search, setSearch, searchPlaceholder, sector, setSector, sort, setSort, sortOptions, hasActiveFilters, reset }: {
  text: typeof COPY[LangCode];
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  sector: SectorId;
  setSector: (value: SectorId) => void;
  sort: string;
  setSort: (value: never) => void;
  sortOptions: Array<[string, string]>;
  hasActiveFilters: boolean;
  reset: () => void;
}) {
  return (
    <div className="filter-bar">
      <label className="search-field">
        <span>{text.search}</span>
        <div>
          <Search size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={searchPlaceholder} />
        </div>
      </label>
      <label>
        <span>{text.sector}</span>
        <select value={sector} onChange={event => setSector(event.target.value as SectorId)}>
          <option value="all">{text.allSectors}</option>
          {SECTORS.map(item => <option value={item.id} key={item.id}>{item.label.ar}</option>)}
        </select>
      </label>
      <label>
        <span>{text.sort}</span>
        <select value={sort} onChange={event => setSort(event.target.value as never)}>
          {sortOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      {hasActiveFilters ? <button type="button" className="clear-button" onClick={reset}>{text.clearFilters}</button> : null}
    </div>
  );
}

function NewsTab({
  text,
  lang,
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
  featured: CyclicalNewsItem[];
  regular: CyclicalNewsItem[];
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
  return (
    <div className="tab-stack">
      <section className="panel">
        <SectionHeader icon={Newspaper} title={text.newsTitle} description={text.newsDescription} />
        <div className="filter-bar news-filter-bar">
          <label className="search-field wide">
            <span>{text.search}</span>
            <div>
              <Search size={17} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder={text.newsSearchPlaceholder} />
            </div>
          </label>
          <label>
            <span>{text.sector}</span>
            <select value={sector} onChange={event => setSector(event.target.value as SectorId)}>
              <option value="all">{text.allSectors}</option>
              {SECTORS.map(item => <option value={item.id} key={item.id}>{item.label[lang]}</option>)}
            </select>
          </label>
          <label>
            <span>{text.sourceFilter}</span>
            <select value={source} onChange={event => setSource(event.target.value)}>
              <option value="all">{text.all}</option>
              {sources.map(item => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>{text.symbolFilter}</span>
            <select value={symbol} onChange={event => setSymbol(event.target.value)}>
              <option value="all">{text.all}</option>
              {symbols.map(item => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>{text.timeRange}</span>
            <select value={time} onChange={event => setTime(event.target.value as NewsTimeFilter)}>
              <option value="all">{text.all}</option>
              <option value="day">{text.day}</option>
              <option value="week">{text.week}</option>
              <option value="month">{text.month}</option>
            </select>
          </label>
          <label>
            <span>{text.sort}</span>
            <select value={sort} onChange={event => setSort(event.target.value as NewsSort)}>
              <option value="latest">{text.latest}</option>
              <option value="oldest">{text.oldest}</option>
              <option value="strongestMove">{text.strongestMoveSort}</option>
            </select>
          </label>
          {hasActiveFilters ? <button type="button" className="clear-button" onClick={reset}>{text.clearFilters}</button> : null}
        </div>
        <div className="results-toolbar">
          <strong>{text.resultCount}: {formatNumber(total, lang)}</strong>
          {hasActiveFilters ? <span>{text.activeFilters}</span> : null}
        </div>
      </section>

      {total === 0 ? (
        <StateBox icon={Search} title={text.noNewsResults} actionLabel={text.clearFilters} onAction={reset} />
      ) : (
        <>
          <section className="featured-news">
            <SectionHeader icon={Newspaper} title={text.featuredNews} />
            <div className="featured-news-grid">
              {featured.map((item, index) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  text={text}
                  lang={lang}
                  featured={index === 0}
                  showOriginal={originalVisibleIds.includes(item.id)}
                  toggleOriginal={() => toggleOriginal(item.id)}
                />
              ))}
            </div>
          </section>
          {regular.length || visibleCount < total ? (
            <section className="news-list">
              {regular.map(item => (
                <NewsRow
                  key={item.id}
                  item={item}
                  text={text}
                  lang={lang}
                  showOriginal={originalVisibleIds.includes(item.id)}
                  toggleOriginal={() => toggleOriginal(item.id)}
                />
              ))}
              {visibleCount < total ? (
                <button className="load-more" type="button" onClick={() => setVisibleCount(visibleCount + INITIAL_NEWS_LIMIT)}>
                  {text.loadMore}
                </button>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function NewsCard({ item, text, lang, featured = false, showOriginal, toggleOriginal }: {
  item: CyclicalNewsItem;
  text: typeof COPY[LangCode];
  lang: LangCode;
  featured?: boolean;
  showOriginal: boolean;
  toggleOriginal: () => void;
}) {
  const title = articleTitle(item);
  const summary = articleSummary(item);
  const url = safeExternalUrl(item.url);
  return (
    <article className={featured ? 'news-card featured' : 'news-card'}>
      <div className="article-meta">
        <span>{item.source}</span>
        <span>{relativeTime(item.publishedAt, lang)}</span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {item.isTranslated ? <ToneBadge tone="info">{text.translated}</ToneBadge> : null}
      </div>
      <h3 dir="auto">{title}</h3>
      {summary ? <p dir="auto">{summary}</p> : null}
      {showOriginal && item.titleOriginal ? (
        <blockquote dir="auto">{item.titleOriginal}</blockquote>
      ) : null}
      <div className="article-footer">
        {item.titleOriginal && item.titleOriginal !== title ? (
          <button type="button" onClick={toggleOriginal}>{showOriginal ? text.hideOriginal : text.showOriginal}</button>
        ) : <span />}
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow">
            {text.readArticle}
            <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function NewsRow(props: Parameters<typeof NewsCard>[0]) {
  return <NewsCard {...props} />;
}

function SectorsTab({ text, lang, stats }: { text: typeof COPY[LangCode]; lang: LangCode; stats: SectorStat[] }) {
  return (
    <section className="panel">
      <SectionHeader icon={Layers3} title={text.sectorsTitle} description={text.sectorsDescription} />
      <div className="sector-grid">
        {stats.map(stat => {
          const Icon = stat.icon;
          const performanceTone = (stat.averageChange ?? 0) > 0 ? 'positive' : (stat.averageChange ?? 0) < 0 ? 'negative' : 'neutral';
          return (
            <article className="sector-card" key={stat.id}>
              <div className="sector-head">
                <span className="sector-icon"><Icon size={19} /></span>
                <div>
                  <h3>{stat.label[lang]}</h3>
                  <p>{stat.description[lang]}</p>
                </div>
                <ToneBadge tone={performanceTone}>{formatPercent(stat.averageChange, lang)}</ToneBadge>
              </div>
              <div className="sector-stat-grid">
                <div className="sector-stat-row">
                  <span>{text.trackedStocks}</span>
                  <strong>{formatNumber(stat.count, lang)}</strong>
                </div>
                <div className="sector-stat-row">
                  <span>{text.risingStocks}</span>
                  <strong>{formatNumber(stat.rising, lang)}</strong>
                </div>
                <div className="sector-stat-row">
                  <span>{text.fallingStocks}</span>
                  <strong>{formatNumber(stat.falling, lang)}</strong>
                </div>
              </div>
              <div className="sector-drivers">
                <strong>{text.mainDrivers}</strong>
                {stat.drivers[lang].map(driver => <span key={driver}>{driver}</span>)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EconomicCycleTab({ text, lang, macro, macroLoading, refreshMacro, openGuide, toggleGuide }: {
  text: typeof COPY[LangCode];
  lang: LangCode;
  macro: EconomicCycleResponse | null;
  macroLoading: boolean;
  refreshMacro: () => void;
  openGuide: EducationId[];
  toggleGuide: (id: EducationId) => void;
}) {
  return (
    <div className="tab-stack">
      <EconomicCycleDashboard text={text} lang={lang} macro={macro} loading={macroLoading} onRefresh={refreshMacro} />
      <EducationGuide text={text} open={openGuide} toggle={toggleGuide} />
    </div>
  );
}

export function CyclicalStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = COPY[activeLang];
  const initialState = useMemo(readInitialUrlState, []);

  const [tab, setTab] = useState<CyclicalTab>(initialState.tab);
  const [ticker, setTicker] = useState<CyclicalTickerResponse | null>(null);
  const [news, setNews] = useState<CyclicalNewsResponse | null>(null);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [macro, setMacro] = useState<EconomicCycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [macroLoading, setMacroLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stockSearch, setStockSearch] = useState(initialState.stockSearch);
  const [stockSector, setStockSector] = useState<SectorId>(initialState.stockSector);
  const [stockSort, setStockSort] = useState<StockSort>(initialState.stockSort);
  const [newsSearch, setNewsSearch] = useState(initialState.newsSearch);
  const [newsSectorValue, setNewsSectorValue] = useState<SectorId>(initialState.newsSectorValue);
  const [newsSourceValue, setNewsSourceValue] = useState(initialState.newsSourceValue);
  const [newsSymbolValue, setNewsSymbolValue] = useState(initialState.newsSymbolValue);
  const [newsTimeValue, setNewsTimeValue] = useState<NewsTimeFilter>(initialState.newsTimeValue);
  const [newsSortValue, setNewsSortValue] = useState<NewsSort>(initialState.newsSortValue);
  const [visibleNewsCount, setVisibleNewsCount] = useState(INITIAL_NEWS_LIMIT);
  const [openGuide, setOpenGuide] = useState<EducationId[]>([]);
  const [originalVisibleIds, setOriginalVisibleIds] = useState<string[]>([]);

  const debouncedStockSearch = useDebouncedValue(stockSearch);
  const debouncedNewsSearch = useDebouncedValue(newsSearch);

  const writeUrl = useCallback((overrides: Partial<ReturnType<typeof readInitialUrlState>> = {}, mode: 'replace' | 'push' = 'replace') => {
    if (typeof window === 'undefined') return;
    const state = {
      tab,
      stockSearch,
      stockSector,
      stockSort,
      newsSearch,
      newsSectorValue,
      newsSourceValue,
      newsSymbolValue,
      newsTimeValue,
      newsSortValue,
      ...overrides,
    };
    const url = new URL(window.location.href);
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (!value || value === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    };
    setOrDelete('tab', state.tab, 'overview');
    setOrDelete('q', state.stockSearch, '');
    setOrDelete('sector', state.stockSector, 'all');
    setOrDelete('sort', state.stockSort, 'sensitivity');
    setOrDelete('nq', state.newsSearch, '');
    setOrDelete('nsector', state.newsSectorValue, 'all');
    setOrDelete('source', state.newsSourceValue, 'all');
    setOrDelete('symbol', state.newsSymbolValue, 'all');
    setOrDelete('time', state.newsTimeValue, 'all');
    setOrDelete('nsort', state.newsSortValue, 'latest');
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }, [newsSearch, newsSectorValue, newsSortValue, newsSourceValue, newsSymbolValue, newsTimeValue, stockSearch, stockSector, stockSort, tab]);

  useEffect(() => {
    const handler = () => {
      const next = readInitialUrlState();
      setTab(next.tab);
      setStockSearch(next.stockSearch);
      setStockSector(next.stockSector);
      setStockSort(next.stockSort);
      setNewsSearch(next.newsSearch);
      setNewsSectorValue(next.newsSectorValue);
      setNewsSourceValue(next.newsSourceValue);
      setNewsSymbolValue(next.newsSymbolValue);
      setNewsTimeValue(next.newsTimeValue);
      setNewsSortValue(next.newsSortValue);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    writeUrl();
  }, [writeUrl]);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setMacroLoading(true);
    setError('');

    const macroUrl = `/api/cyclical-stocks/economic-cycle${mode === 'refresh' ? '?refresh=1' : ''}`;
    const [tickerResult, newsResult, moversResult, macroResult] = await Promise.allSettled([
      fetchJson<CyclicalTickerResponse>('/api/cyclical-stocks/ticker'),
      fetchJson<CyclicalNewsResponse>(`/api/cyclical-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>(`/api/cyclical-stocks/movers?limit=${MOVERS_API_LIMIT}`),
      fetchJson<EconomicCycleResponse>(macroUrl),
    ]);

    if (tickerResult.status === 'fulfilled') setTicker(tickerResult.value);
    else setTicker({ ok: false, code: 'CYCLICAL_TICKER_UNAVAILABLE', source: null, updated_at: null, items: [] });

    if (newsResult.status === 'fulfilled') setNews(newsResult.value);
    else setNews({ success: false, error: 'news_unavailable', reason: newsResult.reason instanceof Error ? newsResult.reason.message : 'unknown' });

    if (moversResult.status === 'fulfilled') setMovers(moversResult.value);
    else setMovers(null);

    if (macroResult.status === 'fulfilled') {
      setMacro(macroResult.value);
    } else {
      setMacro({
        ok: false,
        status: 'error',
        source: null,
        updated_at: null,
        indicators: [],
      });
    }

    if (tickerResult.status === 'rejected' || newsResult.status === 'rejected') setError(text.providerError);
    setLoading(false);
    setMacroLoading(false);
    setRefreshing(false);
  }, [activeLang, text.providerError]);

  useEffect(() => {
    void loadData('initial');
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadData('refresh'), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    setVisibleNewsCount(INITIAL_NEWS_LIMIT);
  }, [debouncedNewsSearch, newsSectorValue, newsSortValue, newsSourceValue, newsSymbolValue, newsTimeValue]);

  const stockRows = useMemo(
    () => (ticker?.ok ? ticker.items.map(item => toStockRow(item, activeLang)) : []),
    [activeLang, ticker],
  );
  const tickerRows = useMemo(() => buildTickerRows(stockRows, activeLang), [stockRows, activeLang]);

  const sectorStats = useMemo<SectorStat[]>(() => {
    return SECTORS.map(sector => {
      const rows = stockRows.filter(row => row.sectorId === sector.id);
      const changes = rows.map(row => row.changePercent).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      return {
        ...sector,
        count: rows.length,
        averageChange: changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null,
        rising: rows.filter(row => (row.changePercent ?? 0) > 0).length,
        falling: rows.filter(row => (row.changePercent ?? 0) < 0).length,
      };
    });
  }, [stockRows]);

  const filteredStocks = useMemo(() => {
    const rows = stockRows.filter(row => {
      const sectorMatch = stockSector === 'all' || row.sectorId === stockSector;
      return sectorMatch && stockMatchesSearch(row, debouncedStockSearch);
    });
    return sortStocks(rows, stockSort);
  }, [debouncedStockSearch, stockRows, stockSector, stockSort]);

  const dedupedNews = useMemo(() => news?.success ? dedupeNews(news.items) : [], [news]);
  const newsSources = useMemo(() => uniqueOptions(dedupedNews.map(item => item.source)), [dedupedNews]);
  const newsSymbols = useMemo(() => uniqueOptions(dedupedNews.map(item => item.ticker?.toUpperCase())), [dedupedNews]);

  const filteredNews = useMemo(() => {
    const items = dedupedNews.filter(item => {
      const sectorMatch = newsSectorValue === 'all' || newsSector(item) === newsSectorValue;
      const sourceMatch = newsSourceValue === 'all' || item.source === newsSourceValue;
      const symbolMatch = newsSymbolValue === 'all' || item.ticker?.toUpperCase() === newsSymbolValue;
      return sectorMatch
        && sourceMatch
        && symbolMatch
        && isWithinTimeFilter(item.publishedAt, newsTimeValue)
        && newsMatchesSearch(item, debouncedNewsSearch);
    });
    return sortNews(items, newsSortValue);
  }, [debouncedNewsSearch, dedupedNews, newsSectorValue, newsSortValue, newsSourceValue, newsSymbolValue, newsTimeValue]);

  const featuredNews = filteredNews.slice(0, 3);
  const regularNews = filteredNews.slice(3, visibleNewsCount);

  const lastQuoteUpdate = ticker?.ok ? ticker.updated_at : null;
  const lastNewsUpdate = news?.success ? news.lastUpdated : null;
  const lastMacroUpdate = macro?.updated_at ?? null;
  const lastUpdate = newestTimestamp([lastQuoteUpdate, lastNewsUpdate, lastMacroUpdate, movers?.ok ? movers.updated_at : null]);

  const resetStockFilters = () => {
    setStockSearch('');
    setStockSector('all');
    setStockSort('sensitivity');
  };

  const resetNewsFilters = () => {
    setNewsSearch('');
    setNewsSectorValue('all');
    setNewsSourceValue('all');
    setNewsSymbolValue('all');
    setNewsTimeValue('all');
    setNewsSortValue('latest');
  };

  const toggleGuide = (id: EducationId) => {
    setOpenGuide(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const toggleOriginal = (id: string) => {
    setOriginalVisibleIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const selectTab = (next: CyclicalTab) => {
    setTab(next);
    writeUrl({ tab: next }, 'push');
  };

  const hasActiveStockFilters = stockSearch.trim() || stockSector !== 'all' || stockSort !== 'sensitivity';
  const hasActiveNewsFilters = newsSearch.trim() || newsSectorValue !== 'all' || newsSourceValue !== 'all' || newsSymbolValue !== 'all' || newsTimeValue !== 'all' || newsSortValue !== 'latest';

  return (
    <NewsPageShell category="cyclical" className="page" dir={dir} wide>
      <WorkspacePageContainer as="main" variant="wide" className="main">
        <div className="container">
          <header className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><LineChart size={16} />{text.badge}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
              <div className="hero-meta">
                <span><Clock3 size={15} />{text.lastQuoteUpdate}: {formatDateTime(lastQuoteUpdate, activeLang)}</span>
                <span><Newspaper size={15} />{text.lastNewsUpdate}: {formatDateTime(lastNewsUpdate, activeLang)}</span>
                <span><BarChart3 size={15} />{text.lastMacroUpdate}: {lastMacroUpdate ? formatDateTime(lastMacroUpdate, activeLang) : text.macroEducationalOnly}</span>
              </div>
            </div>
            <div className="hero-panel">
              <div>
                <ToneBadge tone={ticker?.ok ? 'positive' : 'warning'}>{ticker?.ok ? text.connected : text.partial}</ToneBadge>
                <strong>{lastUpdate ? relativeTime(lastUpdate, activeLang) : text.unavailable}</strong>
                <p>{text.delayed}</p>
              </div>
              <button className="refresh-button" type="button" onClick={() => void loadData('refresh')} disabled={refreshing}>
                <RefreshCcw size={17} className={refreshing ? 'spin' : undefined} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
            </div>
          </header>

          {error ? <StateBox icon={AlertTriangle} title={error} tone="warning" actionLabel={text.retry} onAction={() => void loadData('refresh')} /> : null}

          <TickerStrip rows={tickerRows} loading={loading} lang={activeLang} />

          <nav className="tabs" role="tablist" aria-label={text.title}>
            {TAB_IDS.map(item => (
              <button
                key={item}
                type="button"
                role="tab"
                className={tab === item ? 'tab active' : 'tab'}
                aria-selected={tab === item}
                onClick={() => selectTab(item)}
              >
                {text.tabs[item]}
              </button>
            ))}
          </nav>

          {loading ? (
            <section className="loading-grid loading-grid-compact" aria-live="polite">
              {Array.from({ length: 3 }).map((_, index) => <div className="skeleton-card" key={index} />)}
            </section>
          ) : null}

          {!loading && tab === 'overview' ? (
            <OverviewTab
              text={text}
              lang={activeLang}
              rows={stockRows}
              stats={sectorStats}
              movers={movers}
              macro={macro}
              macroLoading={macroLoading}
              refreshMacro={() => void loadData('refresh')}
              openGuide={openGuide}
              toggleGuide={toggleGuide}
              onViewAllStocks={() => selectTab('stocks')}
            />
          ) : null}

          {!loading && tab === 'stocks' ? (
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
            />
          ) : null}

          {!loading && tab === 'news' ? (
            <NewsTab
              text={text}
              lang={activeLang}
              featured={featuredNews}
              regular={regularNews}
              total={filteredNews.length}
              visibleCount={visibleNewsCount}
              setVisibleCount={setVisibleNewsCount}
              search={newsSearch}
              sector={newsSectorValue}
              source={newsSourceValue}
              symbol={newsSymbolValue}
              time={newsTimeValue}
              sort={newsSortValue}
              sources={newsSources}
              symbols={newsSymbols}
              setSearch={setNewsSearch}
              setSector={setNewsSectorValue}
              setSource={setNewsSourceValue}
              setSymbol={setNewsSymbolValue}
              setTime={setNewsTimeValue}
              setSort={setNewsSortValue}
              reset={resetNewsFilters}
              hasActiveFilters={Boolean(hasActiveNewsFilters)}
              originalVisibleIds={originalVisibleIds}
              toggleOriginal={toggleOriginal}
            />
          ) : null}

          {!loading && tab === 'sectors' ? <SectorsTab text={text} lang={activeLang} stats={sectorStats} /> : null}

          {!loading && tab === 'economic-cycle' ? (
            <EconomicCycleTab
              text={text}
              lang={activeLang}
              macro={macro}
              macroLoading={macroLoading}
              refreshMacro={() => void loadData('refresh')}
              openGuide={openGuide}
              toggleGuide={toggleGuide}
            />
          ) : null}

          <footer className="footer-note">
            <Info size={18} />
            <div>
              <strong>{text.disclaimerTitle}</strong>
              <p>{text.disclaimer}</p>
            </div>
          </footer>
        </div>
      </WorkspacePageContainer>

      <style jsx global>{`
        .page {
          --cyc-ink: #122033;
          --cyc-muted: #587084;
          --cyc-line: rgba(29, 64, 95, 0.13);
          --cyc-panel: rgba(255, 255, 255, 0.9);
          --cyc-panel-strong: #ffffff;
          --cyc-soft: #f4f9fd;
          --cyc-blue: #1669b2;
          --cyc-cyan: #19b8c9;
          --cyc-gold: #c9953f;
          --cyc-shadow: 0 18px 42px rgba(18, 48, 78, 0.09);
          --cyc-card-ring: rgba(41, 104, 139, 0.13);
          --cyc-card-glow: 0 22px 54px rgba(18, 48, 78, 0.11);
          min-height: 100dvh;
          width: 100%;
          overflow-x: clip;
          background:
            linear-gradient(135deg, rgba(22, 105, 178, 0.1), transparent 32rem),
            linear-gradient(180deg, #f8fbfd 0%, #eef6fb 45%, #fbfdff 100%);
          color: var(--cyc-ink);
        }
        .main {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }
        .container {
          width: 100%;
          display: grid;
          gap: 16px;
          min-width: 0;
        }
        .hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          gap: 20px;
          align-items: stretch;
          padding: clamp(20px, 3vw, 30px);
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: var(--r-2xl);
          background:
            linear-gradient(135deg, rgba(10, 29, 48, 0.98), rgba(11, 74, 89, 0.92) 58%, rgba(57, 85, 57, 0.88)),
            linear-gradient(90deg, rgba(201, 149, 63, 0.24), transparent 44%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0));
          color: #f8fdff;
          box-shadow: 0 28px 70px rgba(18, 48, 78, 0.18);
          overflow: hidden;
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.42), transparent 72%);
        }
        .hero::after {
          content: "";
          position: absolute;
          inset-block-end: -42%;
          inset-inline-start: 42%;
          width: min(560px, 60vw);
          aspect-ratio: 1;
          pointer-events: none;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(25, 184, 201, 0.34), transparent 58%),
            radial-gradient(circle at 34% 28%, rgba(201, 149, 63, 0.32), transparent 44%);
          filter: blur(4px);
          opacity: 0.82;
        }
        .hero > * {
          position: relative;
          z-index: 1;
        }
        .hero-copy,
        .hero-panel,
        .tab-stack,
        .panel,
        .metric-card,
        .macro-item,
        .mover-list,
        .mover-row,
        .stock-card,
        .news-card,
        .sector-card,
        .accordion-card {
          min-width: 0;
        }
        .page :where(h1, h2, h3, p, span, strong, small, b, em, button, a, label, input, select, blockquote) {
          word-break: normal;
          overflow-wrap: normal;
          writing-mode: horizontal-tb;
          text-orientation: mixed;
        }
        .hero-copy {
          display: grid;
          align-content: center;
          gap: 14px;
        }
        .eyebrow,
        .hero-meta,
        .article-meta,
        .section-icon,
        .badge,
        .footer-note,
        .stock-note,
        .results-toolbar {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .eyebrow {
          width: max-content;
          max-width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.12);
          color: #d7fbff;
          font-weight: 900;
          font-size: 13px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }
        .hero h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 50px);
          line-height: 1.08;
          letter-spacing: 0;
          font-weight: 950;
          text-wrap: balance;
          text-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
        }
        .hero p {
          margin: 0;
          max-width: 820px;
          color: rgba(238, 250, 252, 0.88);
          font-size: 16px;
          line-height: 1.85;
          font-weight: 750;
        }
        .hero-meta {
          display: flex;
          flex-wrap: wrap;
          color: rgba(235, 250, 255, 0.82);
          font-size: 13px;
          font-weight: 800;
        }
        .hero-meta span {
          min-height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.08);
        }
        .hero-panel {
          position: relative;
          display: grid;
          align-content: space-between;
          gap: 18px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: var(--r-xl);
          padding: 18px;
          background: rgba(255, 255, 255, 0.11);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 18px 38px rgba(0, 0, 0, 0.11);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }
        .hero-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 36%),
            radial-gradient(circle at 16% 0%, rgba(25, 184, 201, 0.18), transparent 38%);
        }
        .hero-panel > * {
          position: relative;
          z-index: 1;
        }
        .hero-panel strong {
          display: block;
          margin-top: 12px;
          color: #ffffff;
          font-size: 20px;
          line-height: 1.35;
        }
        .refresh-button,
        .ghost-action,
        .clear-button,
        .load-more,
        .stock-actions button,
        .stock-actions a,
        .article-footer button,
        .article-footer a,
        .state-box button {
          min-height: 44px;
          border-radius: var(--r-md);
          border: 1px solid rgba(29, 140, 255, 0.18);
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 900 14px Tajawal, Arial, sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .refresh-button {
          background: linear-gradient(135deg, var(--cyc-blue), var(--cyc-cyan));
          border: 0;
          color: #ffffff;
          box-shadow: 0 16px 34px rgba(22, 105, 178, 0.28);
        }
        .refresh-button:disabled {
          cursor: progress;
          opacity: 0.78;
        }
        .refresh-button:hover,
        .ghost-action:hover,
        .clear-button:hover,
        .load-more:hover,
        .stock-actions button:hover,
        .stock-actions a:hover,
        .article-footer a:hover,
        .article-footer button:hover,
        .state-box button:hover {
          transform: translateY(-1px);
        }
        .refresh-button:focus-visible,
        .ghost-action:focus-visible,
        .clear-button:focus-visible,
        .load-more:focus-visible,
        .stock-actions button:focus-visible,
        .stock-actions a:focus-visible,
        .article-footer a:focus-visible,
        .article-footer button:focus-visible,
        .tabs button:focus-visible,
        .accordion-card button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 3px solid rgba(24, 212, 212, 0.35);
          outline-offset: 3px;
        }
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .ticker-strip {
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--cyc-line);
          border-radius: var(--r-lg);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 12px 30px rgba(18, 48, 78, 0.07);
          padding: 8px;
          backdrop-filter: blur(10px);
        }
        .ticker-track {
          width: max-content;
          min-width: max-content;
          display: flex;
          gap: 10px;
          direction: ltr;
          animation: cyclicalTickerScroll 46s linear infinite;
          will-change: transform;
        }
        .ticker-track.ticker-loading {
          animation: none;
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        .ticker-item,
        .ticker-skeleton {
          flex: 0 0 214px;
          min-height: 68px;
          border: 1px solid rgba(29, 64, 95, 0.12);
          border-radius: var(--r-md);
          background: linear-gradient(180deg, #ffffff, #f8fbfd);
          box-shadow: 0 8px 18px rgba(18, 48, 78, 0.055);
        }
        .ticker-item {
          padding: 10px 12px;
          display: grid;
          gap: 7px;
          align-content: center;
        }
        .ticker-identity {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }
        .ticker-identity > div {
          min-width: 0;
        }
        .ticker-item .ticker-logo {
          display: inline-grid;
          flex: 0 0 32px;
          width: 32px;
          height: 32px;
          overflow: hidden;
          color: #0e7490;
          font-size: 10px;
        }
        .ticker-item .ticker-logo span {
          display: inline-flex;
          overflow: visible;
          color: inherit;
          font-size: inherit;
          font-weight: inherit;
        }
        .ticker-item strong {
          color: var(--cyc-ink);
          font-size: 14px;
          font-weight: 950;
        }
        .ticker-item span {
          display: block;
          overflow: hidden;
          color: var(--cyc-muted);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 800;
        }
        .ticker-values {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .ticker-source {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color: #64748b;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 850;
        }
        .ticker-values b,
        .metric-card strong,
        .stock-metrics b,
        .bar-row b {
          font-variant-numeric: tabular-nums;
        }
        .tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          max-width: 100%;
          padding: 7px;
          border: 1px solid var(--cyc-line);
          border-radius: var(--r-lg);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 12px 30px rgba(18, 48, 78, 0.07);
          backdrop-filter: blur(10px);
          scrollbar-width: thin;
          overscroll-behavior-inline: contain;
        }
        .tab {
          position: relative;
          flex: 0 0 auto;
          min-height: 44px;
          white-space: nowrap;
          border: 1px solid transparent;
          border-radius: var(--r-md);
          background: transparent;
          color: #415b73;
          padding: 0 16px;
          font: 900 14px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
        }
        .tab:hover {
          background: rgba(22, 105, 178, 0.08);
          color: #123555;
        }
        .tab.active {
          color: #ffffff;
          background: linear-gradient(135deg, var(--cyc-ink), var(--cyc-blue));
          box-shadow: 0 12px 24px rgba(18, 48, 78, 0.18);
        }
        .tab.active::after {
          content: "";
          position: absolute;
          inset-inline: 18px;
          inset-block-end: 5px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.82), transparent);
        }
        .tab-stack {
          display: grid;
          gap: 14px;
          min-width: 0;
        }
        .panel,
        .featured-news,
        .news-list,
        .state-box,
        .footer-note {
          border: 1px solid rgba(41, 104, 139, 0.15);
          border-radius: var(--r-xl);
          background: var(--cyc-panel);
          box-shadow: var(--cyc-shadow);
          backdrop-filter: blur(10px);
        }
        .panel,
        .featured-news,
        .news-list {
          padding: 16px;
        }
        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }
        .section-header > div:first-child {
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        .section-icon {
          width: 40px;
          height: 40px;
          justify-content: center;
          border: 1px solid rgba(22, 105, 178, 0.12);
          border-radius: var(--r-md);
          background: linear-gradient(135deg, rgba(22, 105, 178, 0.11), rgba(25, 184, 201, 0.08));
          color: var(--cyc-blue);
        }
        .section-header h2 {
          margin: 0;
          color: var(--cyc-ink);
          font-size: clamp(20px, 2vw, 25px);
          font-weight: 950;
          line-height: 1.25;
        }
        .section-header p,
        .paragraph,
        .sector-card p,
        .news-card p,
        .accordion-card p {
          margin: 0;
          color: var(--cyc-muted);
          font-size: 14px;
          line-height: 1.85;
          font-weight: 750;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
          gap: 12px;
          min-width: 0;
        }
        .metric-card {
          border: 1px solid var(--cyc-line);
          border-radius: var(--r-md);
          background: linear-gradient(180deg, #ffffff, #f8fbfd);
          padding: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 88px;
          box-shadow: 0 10px 24px rgba(18, 48, 78, 0.055);
        }
        .metric-card > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: var(--r-md);
          background: linear-gradient(135deg, rgba(22, 105, 178, 0.11), rgba(25, 184, 201, 0.08));
          color: var(--cyc-blue);
        }
        .metric-card small {
          display: block;
          color: var(--cyc-muted);
          font-size: 12px;
          font-weight: 850;
        }
        .metric-card strong {
          display: block;
          margin-top: 4px;
          color: var(--cyc-ink);
          font-size: 19px;
          line-height: 1.2;
          font-weight: 950;
        }
        .metric-card em {
          display: block;
          margin-top: 5px;
          color: #6f8498;
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }
        .overview-grid {
          display: grid;
          grid-template-columns: minmax(560px, 1.25fr) minmax(320px, 0.75fr) !important;
          grid-auto-columns: minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          min-width: 0;
        }
        .overview-grid-single {
          grid-template-columns: 1fr !important;
        }
        .overview-grid > .panel {
          display: grid;
          align-content: start;
          min-height: 0;
        }
        .movers-panel,
        .comparison-panel {
          align-self: start;
        }
        .macro-panel {
          overflow: hidden;
        }
        .macro-empty {
          display: grid;
          gap: 10px;
        }
        .dev-hint {
          margin: 0;
          border: 1px solid rgba(201, 149, 63, 0.28);
          border-radius: var(--r-md);
          background: rgba(255, 251, 235, 0.72);
          color: #7c520b;
          padding: 10px 12px;
          font-size: 12px;
          line-height: 1.7;
          font-weight: 800;
        }
        .dev-hint strong {
          color: #694509;
          font-weight: 950;
        }
        .macro-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
          gap: 12px;
          min-width: 0;
        }
        .macro-item,
        .sector-stat-row,
        .method-grid span {
          border: 1px solid rgba(29, 64, 95, 0.11);
          border-radius: var(--r-md);
          background: var(--cyc-soft);
          padding: 14px;
        }
        .macro-item {
          display: grid;
          gap: 10px;
          align-content: start;
        }
        .macro-item-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }
        .macro-item-head > span,
        .sector-stat-row span {
          display: block;
          color: var(--cyc-muted);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
        }
        .macro-item strong,
        .sector-stat-row strong {
          display: block;
          color: var(--cyc-ink);
          font-size: 22px;
          line-height: 1.2;
          font-weight: 950;
        }
        .macro-item small {
          display: block;
          color: #6f8498;
          font-size: 12px;
          line-height: 1.6;
          font-weight: 850;
        }
        .macro-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: var(--r-md);
          background: rgba(255, 255, 255, 0.78);
          padding: 9px 10px;
        }
        .macro-detail-row span {
          color: var(--cyc-muted);
          font-size: 12px;
          font-weight: 900;
        }
        .macro-detail-row b {
          color: var(--cyc-ink);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 950;
          text-align: end;
        }
        .bar-chart {
          display: grid;
          gap: 9px;
        }
        .bar-row {
          display: grid;
          grid-template-columns: minmax(120px, 0.48fr) minmax(150px, 1fr) minmax(74px, max-content);
          gap: 10px;
          align-items: center;
          min-height: 38px;
        }
        .bar-label {
          display: grid;
          min-width: 0;
        }
        .bar-label strong {
          color: #0b2442;
          font-weight: 950;
        }
        .bar-label span {
          overflow: hidden;
          color: #60778e;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 800;
        }
        .bar-track {
          block-size: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: #e6f0f8;
        }
        .bar {
          display: block;
          block-size: 100%;
          border-radius: inherit;
        }
        .bar.positive {
          background: linear-gradient(90deg, #14b87a, #7de3ba);
        }
        .bar.negative {
          background: linear-gradient(90deg, #ef4444, #fca5a5);
        }
        .mover-tabs {
          display: grid;
          grid-template-columns: 1fr;
          align-items: start;
          gap: 10px;
        }
        .mover-list {
          display: grid;
          gap: 10px;
          min-height: 0;
          border: 1px solid rgba(29, 64, 95, 0.1);
          border-radius: var(--r-md);
          background: rgba(248, 251, 253, 0.76);
          padding: 10px;
        }
        .mover-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 9px;
          min-width: 0;
        }
        .mover-list h3 {
          margin: 0;
          color: #0b2442;
          font-size: 15px;
          font-weight: 950;
        }
        .mover-row {
          display: grid;
          grid-template-columns: 30px 34px minmax(120px, 1fr) minmax(96px, max-content);
          gap: 9px;
          align-items: center;
          min-height: 54px;
          transition: transform 0.18s ease, border-color 0.18s ease;
          border: 1px solid rgba(29, 64, 95, 0.1);
          border-radius: var(--r-md);
          background: linear-gradient(180deg, #ffffff, #f8fbfd);
          padding: 10px;
        }
        .mover-row > * {
          min-width: 0;
        }
        .mover-row:hover {
          transform: translateY(-1px);
          border-color: rgba(22, 105, 178, 0.24);
        }
        .mover-row > span:first-child {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: var(--r-sm);
          background: #eaf6ff;
          color: var(--cyc-blue);
          font-weight: 950;
        }
        .mover-row strong {
          display: block;
          color: var(--cyc-ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 950;
        }
        .mover-row small,
        .muted {
          color: var(--cyc-muted);
          font-size: 13px;
          font-weight: 800;
        }
        .mover-row small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mover-values {
          display: grid;
          justify-items: end;
          gap: 5px;
          min-width: 96px;
        }
        .mover-values b {
          color: var(--cyc-ink);
          font-size: 13px;
          font-weight: 950;
        }
        .mover-list-toggle {
          justify-self: start;
          min-width: 122px;
          margin-top: 2px;
          min-height: 36px;
        }
        .stock-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          grid-auto-rows: 1fr;
          gap: 14px;
          align-items: stretch;
          min-width: 0;
        }
        .highlighted-panel .stock-card-grid {
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .stock-results-grid {
          margin-top: 16px;
        }
        .stock-card {
          min-height: 0;
          height: 100%;
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          gap: 14px;
          border: 1px solid var(--cyc-line);
          border-radius: var(--r-md);
          background:
            linear-gradient(180deg, #ffffff, #f8fbfd),
            linear-gradient(135deg, rgba(22, 105, 178, 0.08), transparent 46%);
          padding: 16px;
          box-shadow: 0 12px 26px rgba(18, 48, 78, 0.065);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .stock-card:hover {
          transform: translateY(-2px);
          border-color: rgba(22, 105, 178, 0.24);
          box-shadow: 0 18px 34px rgba(18, 48, 78, 0.1);
        }
        .stock-card.compact {
          min-height: 0;
          grid-template-rows: auto minmax(0, 1fr) auto;
        }
        .stock-card-head,
        .company-cell,
        .sector-head {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .stock-card-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: flex-start;
          gap: 10px;
        }
        .stock-card-head > div,
        .company-cell > div {
          min-width: 0;
          max-width: none;
          display: grid;
          gap: 3px;
        }
        .stock-card-head .badge {
          justify-self: end;
          max-width: 150px;
          white-space: normal;
          text-align: center;
          line-height: 1.35;
        }
        .stock-card-head strong,
        .company-cell strong {
          overflow: hidden;
          color: #0b2442;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          font-weight: 950;
        }
        .stock-card-head > div span,
        .company-cell > div span {
          color: #62778d;
          font-size: 12px;
          font-weight: 850;
        }
        .stock-logo {
          flex: 0 0 auto;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(22, 105, 178, 0.12);
          border-radius: var(--r-md);
          background: linear-gradient(135deg, #eff8ff, #e4faf4);
          color: var(--cyc-blue);
          font-weight: 950;
        }
        .stock-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
          gap: 10px;
          grid-auto-rows: 1fr;
          align-items: stretch;
        }
        .stock-metrics div {
          border: 1px solid rgba(29, 64, 95, 0.08);
          border-radius: var(--r-md);
          background: rgba(244, 249, 253, 0.9);
          min-height: 76px;
          padding: 10px;
          min-width: 0;
          display: grid;
          align-content: start;
        }
        .stock-metrics small {
          display: block;
          color: #637991;
          font-size: 12px;
          font-weight: 850;
        }
        .stock-metrics b {
          display: block;
          margin-top: 4px;
          overflow-wrap: break-word;
          color: #0b2442;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 950;
        }
        .stock-note {
          max-height: 90px;
          overflow: hidden;
          align-items: flex-start;
          color: var(--cyc-muted);
          border: 1px solid rgba(29, 64, 95, 0.08);
          border-radius: var(--r-md);
          background: rgba(244, 249, 253, 0.9);
          padding: 10px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.65;
        }
        .stock-actions,
        .article-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
        }
        .stock-actions button,
        .stock-actions a {
          flex: 1;
          background: linear-gradient(135deg, var(--cyc-blue), var(--cyc-cyan));
          color: #ffffff;
          border: 0;
        }
        .stock-actions button.secondary,
        .article-footer button,
        .ghost-action,
        .clear-button,
        .load-more,
        .state-box button {
          background: #ffffff;
          color: #1477d4;
        }
        .filter-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
          gap: 12px;
          align-items: end;
          border: 1px solid rgba(29, 64, 95, 0.1);
          border-radius: var(--r-md);
          background: linear-gradient(180deg, rgba(248, 251, 253, 0.95), rgba(255, 255, 255, 0.82));
          padding: 14px;
          min-width: 0;
        }
        .news-filter-bar {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
        }
        .filter-bar .search-field.wide {
          grid-column: span 2;
        }
        .filter-bar label {
          display: grid;
          gap: 7px;
          min-width: 0;
        }
        .filter-bar label > span {
          color: var(--cyc-muted);
          font-size: 12px;
          font-weight: 900;
        }
        .search-field div {
          position: relative;
        }
        .search-field svg {
          position: absolute;
          inset-inline-start: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #7c95aa;
        }
        input,
        select {
          min-height: 44px;
          width: 100%;
          border: 1px solid rgba(29, 64, 95, 0.16);
          border-radius: var(--r-md);
          background: #ffffff;
          color: var(--cyc-ink);
          padding: 0 12px;
          font: 850 14px Tajawal, Arial, sans-serif;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82);
        }
        .search-field input {
          padding-inline-start: 38px;
        }
        .results-toolbar {
          justify-content: space-between;
          margin-top: 14px;
          color: var(--cyc-muted);
          font-weight: 900;
        }
        .stock-table-wrap {
          margin-top: 16px;
          overflow-x: auto;
          border: 1px solid var(--cyc-line);
          border-radius: var(--r-md);
          box-shadow: 0 10px 24px rgba(18, 48, 78, 0.055);
        }
        .stock-table {
          width: 100%;
          min-width: 980px;
          border-collapse: separate;
          border-spacing: 0;
          background: #ffffff;
        }
        .stock-table th,
        .stock-table td {
          padding: 14px;
          border-bottom: 1px solid rgba(41, 104, 139, 0.10);
          text-align: start;
          vertical-align: middle;
          font-size: 13px;
        }
        .stock-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #eef6fb;
          color: #28465f;
          font-weight: 950;
        }
        .stock-table td {
          color: #263f58;
          font-weight: 800;
        }
        .stock-mobile-grid {
          display: none;
        }
        .method-grid,
        .sector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 12px;
          min-width: 0;
        }
        .method-grid span {
          color: #506982;
          font-weight: 850;
        }
        .featured-news-grid {
          display: grid;
          grid-template-columns: minmax(min(100%, 360px), 1.15fr) minmax(min(100%, 280px), 0.9fr) minmax(min(100%, 280px), 0.9fr);
          gap: 14px;
          min-width: 0;
        }
        .news-card {
          display: grid;
          gap: 10px;
          padding: 15px;
          min-width: 0;
          align-content: start;
        }
        .news-card.featured {
          background:
            linear-gradient(135deg, rgba(15, 39, 66, 0.97), rgba(14, 92, 112, 0.88)),
            radial-gradient(circle at 12% 20%, rgba(42, 213, 235, 0.24), transparent 18rem);
          color: #ffffff;
        }
        .article-meta {
          flex-wrap: wrap;
          color: #6c8297;
          font-size: 12px;
          font-weight: 850;
        }
        .news-card.featured .article-meta,
        .news-card.featured p {
          color: rgba(235, 250, 255, 0.82);
        }
        .news-card h3 {
          margin: 0;
          color: #0b2442;
          font-size: 18px;
          line-height: 1.55;
          font-weight: 950;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .news-card.featured h3 {
          color: #ffffff;
          font-size: clamp(20px, 2vw, 25px);
        }
        .news-card p {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        blockquote {
          margin: 0;
          border-inline-start: 3px solid #18d4d4;
          border-radius: var(--r-sm);
          background: rgba(29, 140, 255, 0.08);
          padding: 10px 12px;
          color: #38566e;
          font-size: 13px;
          line-height: 1.7;
        }
        .news-card.featured blockquote {
          color: #ecfbff;
          background: rgba(255, 255, 255, 0.09);
        }
        .article-footer a {
          background: linear-gradient(135deg, var(--cyc-blue), var(--cyc-cyan));
          color: #ffffff;
          border: 0;
        }
        .news-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
          gap: 14px;
        }
        .news-list .news-card {
          grid-template-columns: 1fr;
        }
        .load-more {
          justify-self: center;
          min-width: 190px;
        }
        .sector-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: 16px;
          min-width: 0;
          border: 1px solid var(--cyc-card-ring);
          border-radius: var(--r-md);
          background:
            radial-gradient(circle at top right, rgba(25, 184, 201, 0.12), transparent 38%),
            radial-gradient(circle at bottom left, rgba(201, 149, 63, 0.12), transparent 40%),
            linear-gradient(180deg, #ffffff, #f8fbfd),
            linear-gradient(135deg, rgba(201, 149, 63, 0.08), transparent 48%);
          box-shadow: 0 12px 26px rgba(18, 48, 78, 0.065);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .sector-card::before {
          content: "";
          position: absolute;
          inset-block: 0;
          inset-inline-start: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--cyc-gold), var(--cyc-cyan));
          opacity: 0.85;
        }
        .sector-card::after {
          content: "";
          position: absolute;
          inset: 1px;
          pointer-events: none;
          border-radius: var(--r-md);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), transparent 42%);
          z-index: -1;
        }
        .sector-card > * {
          position: relative;
          z-index: 1;
        }
        .sector-card:hover {
          transform: translateY(-2px);
          border-color: rgba(201, 149, 63, 0.28);
          box-shadow: var(--cyc-card-glow);
        }
        .sector-head {
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .sector-head > div {
          min-width: 0;
          flex: 1 1 auto;
        }
        .sector-icon {
          flex: 0 0 auto;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(22, 105, 178, 0.12);
          border-radius: var(--r-md);
          background: linear-gradient(135deg, rgba(22, 105, 178, 0.11), rgba(201, 149, 63, 0.1));
          color: var(--cyc-blue);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 10px 22px rgba(22, 105, 178, 0.08);
          transition: transform 0.18s ease, color 0.18s ease, background 0.18s ease;
        }
        .sector-card:hover .sector-icon {
          transform: translateY(-1px) scale(1.03);
          background: linear-gradient(135deg, rgba(22, 105, 178, 0.16), rgba(201, 149, 63, 0.16));
          color: #0f5f9f;
        }
        .sector-card h3 {
          margin: 0 0 6px;
          color: var(--cyc-ink);
          font-size: 17px;
          font-weight: 950;
        }
        .sector-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
          gap: 10px;
        }
        .sector-stat-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 82px;
          text-align: center;
        }
        .sector-drivers {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }
        .sector-drivers strong {
          width: 100%;
          color: var(--cyc-ink);
          font-size: 13px;
          font-weight: 950;
        }
        .sector-drivers span {
          border: 1px solid rgba(22, 105, 178, 0.1);
          border-radius: 999px;
          background: rgba(237, 247, 255, 0.86);
          color: #365a74;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 850;
        }
        .accordion-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 12px;
          min-width: 0;
        }
        .accordion-card {
          border: 1px solid rgba(41, 104, 139, 0.13);
          border-radius: var(--r-lg);
          background: #ffffff;
          overflow: hidden;
        }
        .accordion-card button {
          width: 100%;
          min-height: 52px;
          border: 0;
          background: transparent;
          color: #0b2442;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font: 950 14px Tajawal, Arial, sans-serif;
          cursor: pointer;
          text-align: start;
        }
        .accordion-card p {
          padding: 0 14px 14px;
        }
        .footer-note,
        .state-box {
          padding: 16px;
          align-items: flex-start;
        }
        .footer-note strong,
        .state-box strong {
          display: block;
          color: var(--cyc-ink);
          font-size: 15px;
          font-weight: 950;
        }
        .footer-note p,
        .state-box p {
          margin: 4px 0 0;
          color: var(--cyc-muted);
          font-size: 13px;
          line-height: 1.75;
          font-weight: 750;
        }
        .state-box {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 13px;
        }
        .state-box > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(22, 105, 178, 0.12);
          border-radius: var(--r-md);
          background: rgba(22, 105, 178, 0.09);
          color: var(--cyc-blue);
        }
        .state-warning > span {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }
        .badge {
          width: max-content;
          max-width: 100%;
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }
        .tone-positive {
          background: rgba(20, 184, 122, 0.12);
          border-color: rgba(20, 184, 122, 0.18);
          color: #0f8b5b;
        }
        .tone-negative {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.18);
          color: #c23131;
        }
        .tone-warning {
          background: rgba(201, 149, 63, 0.15);
          border-color: rgba(201, 149, 63, 0.2);
          color: #a76405;
        }
        .tone-neutral,
        .tone-info {
          background: rgba(22, 105, 178, 0.10);
          border-color: rgba(22, 105, 178, 0.16);
          color: var(--cyc-blue);
        }
        .num-positive {
          color: #0f8b5b !important;
        }
        .num-negative {
          color: #c23131 !important;
        }
        .dark .page,
        body.dark .page {
          background:
            radial-gradient(circle at top left, rgba(47, 214, 192, 0.13), transparent 34rem),
            linear-gradient(180deg, #061a2e 0%, #071b2f 52%, #061a2e 100%);
          color: #f8fafc;
        }
        .dark .ticker-strip,
        .dark .tabs,
        .dark .panel,
        .dark .featured-news,
        .dark .news-list,
        .dark .state-box,
        .dark .footer-note,
        body.dark .ticker-strip,
        body.dark .tabs,
        body.dark .panel,
        body.dark .featured-news,
        body.dark .news-list,
        body.dark .state-box,
        body.dark .footer-note {
          border-color: rgba(167, 243, 240, 0.14);
          background: rgba(16, 47, 82, 0.94);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.28);
        }
        .dark .ticker-item,
        .dark .metric-card,
        .dark .macro-item,
        .dark .sector-card,
        .dark .accordion-card,
        .dark .stock-card,
        .dark .news-card,
        body.dark .ticker-item,
        body.dark .metric-card,
        body.dark .macro-item,
        body.dark .sector-card,
        body.dark .accordion-card,
        body.dark .stock-card,
        body.dark .news-card {
          border-color: rgba(167, 243, 240, 0.12);
          background: #0b2a4a;
        }
        .dark .section-header h2,
        .dark .metric-card strong,
        .dark .macro-item strong,
        .dark .macro-detail-row b,
        .dark .bar-label strong,
        .dark .mover-row strong,
        .dark .mover-values b,
        .dark .stock-card-head strong,
        .dark .company-cell strong,
        .dark .sector-card h3,
        .dark .sector-drivers strong,
        .dark .accordion-card button,
        .dark .footer-note strong,
        .dark .state-box strong,
        .dark .dev-hint strong,
        body.dark .section-header h2,
        body.dark .metric-card strong,
        body.dark .macro-item strong,
        body.dark .macro-detail-row b,
        body.dark .bar-label strong,
        body.dark .mover-row strong,
        body.dark .mover-values b,
        body.dark .stock-card-head strong,
        body.dark .company-cell strong,
        body.dark .sector-card h3,
        body.dark .sector-drivers strong,
        body.dark .accordion-card button,
        body.dark .footer-note strong,
        body.dark .state-box strong,
        body.dark .dev-hint strong {
          color: #f8fafc;
        }
        .dark .section-header p,
        .dark .paragraph,
        .dark .macro-item small,
        .dark .macro-item-head > span,
        .dark .macro-detail-row span,
        .dark .metric-card small,
        .dark .metric-card em,
        .dark .ticker-item span,
        .dark .stock-card-head > div span,
        .dark .company-cell > div span,
        .dark .stock-metrics small,
        .dark .stock-note,
        .dark .mover-row small,
        .dark .muted,
        .dark .footer-note p,
        .dark .state-box p,
        .dark .dev-hint,
        body.dark .section-header p,
        body.dark .paragraph,
        body.dark .macro-item small,
        body.dark .macro-item-head > span,
        body.dark .macro-detail-row span,
        body.dark .metric-card small,
        body.dark .metric-card em,
        body.dark .ticker-item span,
        body.dark .stock-card-head > div span,
        body.dark .company-cell > div span,
        body.dark .stock-metrics small,
        body.dark .stock-note,
        body.dark .mover-row small,
        body.dark .muted,
        body.dark .footer-note p,
        body.dark .state-box p,
        body.dark .dev-hint {
          color: #cbd5e1;
        }
        .dark .ticker-item .ticker-logo,
        body.dark .ticker-item .ticker-logo {
          color: #67e8f9;
        }
        .dark .ticker-item .ticker-logo span,
        body.dark .ticker-item .ticker-logo span {
          color: inherit;
        }
        .dark .stock-metrics div,
        .dark .mover-row,
        .dark .macro-detail-row,
        .dark .sector-stat-row,
        .dark .method-grid span,
        .dark .filter-bar,
        .dark input,
        .dark select,
        body.dark .stock-metrics div,
        body.dark .mover-row,
        body.dark .macro-detail-row,
        body.dark .sector-stat-row,
        body.dark .method-grid span,
        body.dark .filter-bar,
        body.dark input,
        body.dark select {
          border-color: rgba(167, 243, 240, 0.12);
          background: #071b2f;
          color: #f8fafc;
        }
        .dark .dev-hint,
        body.dark .dev-hint {
          border-color: rgba(47, 214, 192, 0.24);
          background: rgba(47, 214, 192, 0.08);
        }
        .dark .ghost-action,
        .dark .clear-button,
        .dark .load-more,
        .dark .stock-actions button.secondary,
        .dark .article-footer button,
        .dark .state-box button,
        body.dark .ghost-action,
        body.dark .clear-button,
        body.dark .load-more,
        body.dark .stock-actions button.secondary,
        body.dark .article-footer button,
        body.dark .state-box button {
          background: #0b2a4a;
          color: #7dd3fc;
          border-color: rgba(125, 211, 252, 0.22);
        }
        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
          gap: 14px;
        }
        .loading-grid-compact {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .skeleton-card,
        .ticker-skeleton {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #eef6fc, #ffffff, #eef6fc);
          background-size: 220% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        .skeleton-card {
          min-height: 82px;
          border-radius: var(--r-lg);
          border: 1px solid rgba(41, 104, 139, 0.12);
        }
        .loading-grid-compact .skeleton-card {
          min-height: 62px;
        }
        @media (min-width: 1180px) {
          .highlighted-panel .stock-card-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes cyclicalTickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (hover: hover) and (pointer: fine) {
          .ticker-strip:hover .ticker-track {
            animation-play-state: paused;
          }
        }
        @media (max-width: 1280px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .overview-grid {
            grid-template-columns: minmax(460px, 1.15fr) minmax(320px, 0.85fr) !important;
          }
          .overview-grid.overview-grid-single {
            grid-template-columns: 1fr !important;
            gap: 14px;
          }
          .featured-news-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          }
          .featured-news-grid,
          .method-grid,
          .sector-grid,
          .accordion-list,
          .macro-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
          }
          .mover-tabs {
            grid-template-columns: 1fr;
          }
          .stock-card-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));
          }
          .sector-stat-grid {
            grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
          }
          .filter-bar,
          .news-filter-bar {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
          }
          .filter-bar .search-field.wide {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 1100px) {
          .overview-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 780px) {
          .container {
            gap: 16px;
          }
          .hero,
          .panel,
          .featured-news,
          .news-list {
            border-radius: var(--r-xl);
            padding: 16px;
          }
          .hero {
            gap: 16px;
          }
          .hero h1 {
            font-size: 30px;
          }
          .hero-panel {
            border-radius: var(--r-md);
          }
          .hero-meta span {
            width: 100%;
            justify-content: flex-start;
          }
          .hero-meta,
          .section-header,
          .stock-actions,
          .article-footer,
          .cycle-phase {
            display: grid;
            justify-items: stretch;
          }
          .metrics-grid,
          .mover-list-grid,
          .mover-tabs,
          .stock-card-grid,
          .featured-news-grid,
          .method-grid,
          .sector-grid,
          .accordion-list,
          .macro-grid,
          .filter-bar,
          .news-filter-bar,
          .loading-grid,
          .sector-stat-grid {
            grid-template-columns: 1fr;
          }
          .filter-bar .search-field.wide {
            grid-column: auto;
          }
          .mover-list {
            padding: 10px;
          }
          .mover-row {
            grid-template-columns: 30px minmax(0, 1fr);
            gap: 9px;
          }
          .mover-row > :nth-child(2) {
            display: none;
          }
          .mover-row > div:not(.mover-values) {
            grid-column: 2;
          }
          .mover-values {
            grid-column: 2;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: flex-start;
            min-width: 0;
          }
          :global([dir="rtl"]) .mover-values {
            justify-content: flex-end;
          }
          .stock-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .stock-card-head .badge {
            grid-column: 1 / -1;
            justify-self: start;
            max-width: 100%;
          }
          :global([dir="rtl"]) .stock-card-head .badge {
            justify-self: end;
          }
          .stock-metrics {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
          }
          .sector-head {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
          }
          .sector-head .badge {
            grid-column: 1 / -1;
            justify-self: start;
          }
          :global([dir="rtl"]) .sector-head .badge {
            justify-self: end;
          }
          .stock-table-wrap {
            display: none;
          }
          .stock-mobile-grid {
            display: grid;
            gap: 14px;
            margin-top: 16px;
          }
          .bar-row {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px 10px;
          }
          .bar-track {
            grid-column: 1 / -1;
          }
          .comparison-panel .section-header p {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .state-box {
            grid-template-columns: 1fr;
          }
          .ticker-strip {
            padding: 7px;
            scrollbar-width: none;
          }
          .ticker-strip::-webkit-scrollbar {
            display: none;
          }
          .ticker-track {
            animation-duration: 58s;
          }
          .ticker-item,
          .ticker-skeleton {
            flex-basis: 178px;
            min-height: 66px;
          }
          .ticker-item {
            padding: 9px 10px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </NewsPageShell>
  );
}

export default CyclicalStocksNewsPage;


