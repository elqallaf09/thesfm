'use client';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  BookmarkPlus,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  Droplets,
  ExternalLink,
  Factory,
  Filter,
  Flame,
  Gauge,
  Info,
  Landmark,
  Layers3,
  Leaf,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { StockTickerStrip } from '@/components/market/StockTickerStrip';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type Tone = 'positive' | 'negative' | 'neutral' | 'warning';
type TabId = 'overview' | 'oil-gas' | 'renewables' | 'nuclear' | 'companies' | 'calendar' | 'news' | 'education';
type EnergyCompanyCategory =
  | 'all'
  | 'integrated_oil_gas'
  | 'exploration_production'
  | 'oil_services'
  | 'pipelines'
  | 'natural_gas'
  | 'renewables'
  | 'solar'
  | 'nuclear';
type NewsCategory =
  | 'all'
  | 'oil'
  | 'natural_gas'
  | 'opec'
  | 'lng'
  | 'renewables'
  | 'solar'
  | 'wind'
  | 'nuclear'
  | 'uranium'
  | 'earnings'
  | 'regulation'
  | 'geopolitics';
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type CompanySort = 'change-desc' | 'change-asc' | 'name' | 'price-desc';
type NewsSort = 'latest' | 'oldest' | 'company-move';

type EnergyTickerItem = {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available?: boolean;
  unavailableReason?: string;
};

type EnergyTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: EnergyTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: EnergyTickerItem[];
  };

type EnergyCommodity = {
  symbol: string;
  displayName: string;
  nameAr: string;
  category: string;
  unit: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  lastUpdated: string;
  source: string | null;
  delayed: true;
  available: boolean;
};

type EnergyCommodityResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: EnergyCommodity[];
  }
  | {
    ok: false;
    source: string | null;
    updated_at: string | null;
    items: EnergyCommodity[];
    error?: string;
  };

type EnergyNewsItem = {
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
};

type EnergyNewsResponse =
  | {
    success: true;
    category: 'energy';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: EnergyNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
  };

type CalendarImpact = 'high' | 'medium' | 'low' | 'unknown';

type EconomicCalendarApiEvent = {
  id?: string;
  title?: string;
  eventName?: string;
  event?: string;
  name?: string;
  country?: string | null;
  currency?: string | null;
  dateTimeUtc?: string;
  dateTime?: string;
  time?: string;
  datetime?: string;
  eventTime?: string;
  impact?: CalendarImpact;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
  unit?: string | null;
  source?: string | null;
  provider?: string | null;
};

type EconomicCalendarApiResponse = {
  status?: string;
  provider?: string | null;
  data?: EconomicCalendarApiEvent[];
  items?: EconomicCalendarApiEvent[];
  events?: EconomicCalendarApiEvent[];
  cached?: boolean;
  stale?: boolean;
  lastSuccessfulUpdate?: string | null;
  messageCode?: string | null;
};

type EnergyCalendarEventCard = {
  id: string;
  title: string;
  category: string;
  dateTime: string;
  impact: CalendarImpact;
  description: string;
  source: string;
  status: 'upcoming' | 'recent';
};

const NEWS_PAGE_SIZE = 12;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const ENERGY_ROUTE = '/energy-stocks';
const REPORTS_ROUTE = '/reports-center';
const ENERGY_CALENDAR_LIMIT = 7;

const PORTAL_LINKS: Record<LangCode, { reports: string }> = {
  ar: {
    reports: 'عرض التقارير',
  },
  en: {
    reports: 'View reports',
  },
  fr: {
    reports: 'Afficher les rapports',
  },
};


const TEXT = {
  ar: {
    badge: 'THE SFM · أسواق الطاقة',
    title: 'مركز أسواق الطاقة',
    subtitle: 'تابع أسعار الطاقة العالمية، واستكشف شركات النفط والغاز والطاقة المتجددة والنووية، وراقب أهم الأخبار والأحداث المؤثرة في القطاع.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث',
    watchlist: 'قائمة المراقبة',
    connected: 'البيانات متصلة',
    delayed: 'الأسعار متأخرة حسب مزود البيانات',
    unavailable: 'غير متاح',
    lastUpdated: 'آخر تحديث',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    marketData: 'بيانات السوق',
    newsData: 'الأخبار',
    provider: 'المصدر',
    source: 'المصدر',
    dataDate: 'تاريخ البيانات',
    viewAll: 'عرض الكل',
    readArticle: 'اقرأ المزيد',
    openSource: 'فتح المصدر',
    addWatchlist: 'إضافة للمراقبة',
    details: 'التفاصيل',
    clearFilters: 'مسح عوامل التصفية',
    resultCount: 'عدد النتائج',
    activeFilters: 'الفلاتر النشطة',
    all: 'الكل',
    search: 'البحث',
    searchCompany: 'ابحث عن شركة أو رمز...',
    searchNews: 'ابحث في الأخبار أو الرموز أو السلع...',
    category: 'الفئة',
    sector: 'القطاع',
    sort: 'الترتيب',
    period: 'الفترة',
    latest: 'الأحدث',
    oldest: 'الأقدم',
    strongestMove: 'أقوى حركة',
    highestPrice: 'الأعلى سعراً',
    nameSort: 'الاسم',
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوماً',
    overview: 'نظرة عامة',
    oilGas: 'النفط والغاز',
    renewables: 'الطاقة المتجددة',
    nuclear: 'الطاقة النووية واليورانيوم',
    companies: 'مستكشف الشركات',
    calendar: 'تقويم الطاقة',
    news: 'الأخبار',
    education: 'الدليل التعليمي',
    snapshotTitle: 'ملخص أسواق الطاقة اليوم',
    snapshotSubtitle: 'قراءة مختصرة للسلع الرئيسية وأداء أسهم الطاقة المتاحة من مزودي البيانات الحاليين.',
    commodityStripTitle: 'أسعار سلع الطاقة',
    commodityStripSubtitle: 'السلع والعقود المرجعية منفصلة عن أسهم الشركات حتى لا تختلط حركة الأصل بحركة الشركة.',
    commodityVsEquityTitle: 'سلع الطاقة مقابل شركات الطاقة',
    commodityVsEquityBody: 'أسعار النفط والغاز تمثل عقوداً أو مؤشرات للسلع. أما الأسهم فهي شركات مدرجة قد تتأثر بالسلع وبالهوامش والديون والتوزيعات والإدارة.',
    sectorPerformance: 'أداء قطاعات الطاقة',
    marketMovers: 'محركات السوق',
    topGainers: 'أكبر الأسهم ارتفاعاً',
    topLosers: 'أكبر الأسهم انخفاضاً',
    highestVolume: 'الأعلى تداولاً',
    commodityMoves: 'تحركات سلع الطاقة',
    featuredCompanies: 'شركات طاقة بارزة وفق معايير التحليل',
    featuredMethodology: 'المنهجية',
    methodologyTitle: 'كيف تم اختيار الشركات البارزة؟',
    methodologyBody: 'تظهر الشركات التي تتوفر لها أسعار حقيقية من المزود الحالي، ثم ترتب حسب الحركة اليومية وحجم التغطية داخل القطاع. لا توجد درجة جودة أو توصية شراء، ولا يتم إنشاء أي قيمة غير متوفرة من المزود.',
    companyExplorerTitle: 'مستكشف شركات الطاقة',
    companyExplorerSubtitle: 'قارن الشركات المدرجة حسب الفئة والسعر والحركة اليومية ومصدر البيانات. القيم غير المتاحة لا تتحول إلى صفر.',
    mobileCompanyHint: 'تظهر الجداول كبطاقات مختصرة على الشاشات الصغيرة.',
    oilGasTitle: 'لوحة النفط والغاز',
    oilGasSubtitle: 'نظرة مركزة على خام برنت وWTI والغاز الطبيعي وشركات النفط والخدمات وخطوط الأنابيب.',
    renewablesTitle: 'لوحة الطاقة المتجددة',
    renewablesSubtitle: 'متابعة شركات ومؤشرات الطاقة الشمسية والنظيفة عند توفر الأسعار من المزود الحالي.',
    nuclearTitle: 'لوحة الطاقة النووية واليورانيوم',
    nuclearSubtitle: 'يتم عرض البيانات النووية واليورانيوم فقط عندما تتوفر من مزود حقيقي أو من الأخبار المرتبطة.',
    calendarTitle: 'تقويم الطاقة',
    calendarSubtitle: 'أحداث الطاقة تحتاج إلى مزود تقويم مخصص. عند غياب التكامل لا يتم إنشاء تواريخ أو توقعات افتراضية.',
    newsTitle: 'أخبار الطاقة',
    newsSubtitle: 'أخبار النفط والغاز والطاقة المتجددة والنووية وشركات القطاع مع روابط المصادر الأصلية.',
    educationTitle: 'دليل أسواق الطاقة',
    educationSubtitle: 'دروس مختصرة ومطوية لفهم السلع والطاقة التقليدية والنظيفة ومخاطر القطاع.',
    noCompaniesTitle: 'لم يتم العثور على شركات مطابقة',
    noCompaniesBody: 'جرّب تعديل السوق أو القطاع أو معايير البحث.',
    noNewsTitle: 'لا توجد أخبار طاقة متاحة حالياً',
    noNewsBody: 'جرّب تغيير البحث أو الفترة أو إزالة بعض عوامل التصفية.',
    noMarketTitle: 'بيانات السوق غير متاحة حالياً',
    noMarketBody: 'تعذر الاتصال بمزود البيانات. سنعرض آخر بيانات متاحة عند توفرها.',
    noCalendarTitle: 'لا توجد أحداث طاقة ضمن الفترة المحددة',
    noCalendarBody: 'جرّب تغيير الفترة الزمنية أو نوع الحدث أو إزالة بعض عوامل التصفية.',
    calendarLoadingTitle: 'جاري تحميل تقويم الطاقة',
    calendarLoadingBody: 'نبحث عن أحداث الطاقة من التقويم الاقتصادي والأخبار المتاحة.',
    calendarProviderNotice: 'مصدر التقويم الاقتصادي غير متاح حالياً، لذلك يتم عرض الأحداث المستخلصة من أخبار الطاقة المتاحة.',
    calendarEconomicSource: 'التقويم الاقتصادي',
    calendarRecentNewsSource: 'خبر حديث',
    calendarImpactHigh: 'تأثير مرتفع',
    calendarImpactMedium: 'تأثير متوسط',
    calendarImpactLow: 'تأثير منخفض',
    calendarImpactUnknown: 'تأثير غير محدد',
    calendarUpcoming: 'قادم',
    calendarRecent: 'حديث',
    calendarActual: 'الفعلي',
    calendarForecast: 'المتوقع',
    calendarPrevious: 'السابق',
    loadingMarket: 'جارٍ تحميل بيانات الطاقة...',
    providerError: 'تعذر تحديث جزء من البيانات حالياً. تبقى الأقسام الأخرى متاحة عند توفرها.',
    totalCompanies: 'الشركات المتاحة',
    risingStocks: 'أسهم مرتفعة',
    fallingStocks: 'أسهم منخفضة',
    avgMove: 'متوسط حركة الأسهم',
    brentMove: 'حركة برنت',
    wtiMove: 'حركة WTI',
    gasMove: 'حركة الغاز',
    cleanEnergyProxy: 'مؤشر الطاقة النظيفة',
    unit: 'الوحدة',
    currency: 'العملة',
    market: 'السوق',
    price: 'السعر',
    change: 'التغير',
    volume: 'الحجم',
    company: 'الشركة',
    symbol: 'الرمز',
    risk: 'المخاطر',
    riskUnavailable: 'غير مصنفة',
    delayedData: 'بيانات متأخرة',
    translated: 'ترجمة آلية',
    original: 'النص الأصلي',
    noLink: 'الرابط غير متاح',
    loadMore: 'عرض المزيد',
    showing: 'المعروض',
    sourceNote: 'الأخبار والبيانات مجمعة من مزودي بيانات ومصادر مالية خارجية، ويُنصح بالرجوع إلى المصدر الأصلي.',
    disclaimerTitle: 'تنبيه معلوماتي',
    disclaimerBody: 'البيانات والأسعار والتصنيفات والتحليلات المعروضة لأغراض تعليمية ومعلوماتية فقط، ولا تُعد نصيحة استثمارية أو توصية بشراء أو بيع أي أصل. قد تتأخر بعض بيانات السوق أو تتغير، ويتحمل المستخدم مسؤولية قراراته الاستثمارية.',
    traditional: 'الطاقة التقليدية',
    clean: 'الطاقة النظيفة',
    comparisonTitle: 'الطاقة التقليدية مقابل الطاقة النظيفة',
    comparisonBody: 'لكل جانب محركات ومخاطر مختلفة. أسعار السلع قد تدعم بعض الشركات التقليدية، بينما تعتمد مشاريع الطاقة النظيفة على التمويل والسياسات والتكاليف التقنية.',
    educationPreview: 'مقتطفات تعليمية',
    fullGuide: 'عرض الدليل الكامل',
    eventsPreview: 'أحداث الطاقة القادمة',
    latestNewsPreview: 'أحدث أخبار الطاقة',
    tableCompany: 'الشركة',
    tableCategory: 'الفئة',
    tablePrice: 'السعر',
    tableChange: 'التغير',
    tableCurrency: 'العملة',
    tableSource: 'المصدر',
    tableAction: 'فتح المصدر',
    commodityUnavailable: 'بيانات السلعة غير متاحة حالياً',
    eventProviderMissing: 'لا يوجد تكامل تقويم أحداث الطاقة في هذه الصفحة حالياً.',
    tabsLabel: 'أقسام مركز أسواق الطاقة',
  },
  en: {
    badge: 'THE SFM · Energy markets',
    title: 'Energy Markets Center',
    subtitle: 'Monitor global energy prices, explore oil, gas, renewable and nuclear companies, and track the news and events that move the sector.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing',
    watchlist: 'Watchlist',
    connected: 'Data connected',
    delayed: 'Prices may be delayed by provider',
    unavailable: 'Unavailable',
    lastUpdated: 'Last updated',
    autoRefresh: 'Auto-refresh every 5 minutes',
    marketData: 'Market data',
    newsData: 'News',
    provider: 'Provider',
    source: 'Source',
    dataDate: 'Data date',
    viewAll: 'View all',
    readArticle: 'Read article',
    openSource: 'Open source',
    addWatchlist: 'Add to watchlist',
    details: 'Details',
    clearFilters: 'Clear filters',
    resultCount: 'Results',
    activeFilters: 'Active filters',
    all: 'All',
    search: 'Search',
    searchCompany: 'Search company or symbol...',
    searchNews: 'Search news, symbols, commodities...',
    category: 'Category',
    sector: 'Sector',
    sort: 'Sort',
    period: 'Period',
    latest: 'Latest',
    oldest: 'Oldest',
    strongestMove: 'Strongest move',
    highestPrice: 'Highest price',
    nameSort: 'Name',
    today: 'Today',
    week: 'Last 7 days',
    month: 'Last 30 days',
    overview: 'Overview',
    oilGas: 'Oil & Gas',
    renewables: 'Renewables',
    nuclear: 'Nuclear & Uranium',
    companies: 'Company Explorer',
    calendar: 'Energy Calendar',
    news: 'News',
    education: 'Education',
    snapshotTitle: 'Energy market snapshot',
    snapshotSubtitle: 'A compact read on major commodities and available energy equities from configured providers.',
    commodityStripTitle: 'Energy commodity prices',
    commodityStripSubtitle: 'Commodity benchmarks are separated from company equities so asset moves are not confused with company performance.',
    commodityVsEquityTitle: 'Energy commodities versus energy equities',
    commodityVsEquityBody: 'Oil and gas prices represent commodity contracts or benchmarks. Listed companies also depend on margins, debt, dividends, assets, and management.',
    sectorPerformance: 'Energy sector performance',
    marketMovers: 'Market movers',
    topGainers: 'Top gainers',
    topLosers: 'Top losers',
    highestVolume: 'Most traded',
    commodityMoves: 'Commodity moves',
    featuredCompanies: 'Featured energy companies by analysis criteria',
    featuredMethodology: 'Methodology',
    methodologyTitle: 'How featured companies are selected',
    methodologyBody: 'Companies are selected only when real provider quotes are available, then ranked by daily move and sector coverage. No quality score or buy recommendation is generated.',
    companyExplorerTitle: 'Energy company explorer',
    companyExplorerSubtitle: 'Compare listed companies by category, price, daily move, and data source. Missing values are never converted to zero.',
    mobileCompanyHint: 'Tables become compact cards on smaller screens.',
    oilGasTitle: 'Oil & gas dashboard',
    oilGasSubtitle: 'Focused view of Brent, WTI, natural gas, oil companies, services, and pipelines.',
    renewablesTitle: 'Renewables dashboard',
    renewablesSubtitle: 'Track clean-energy proxies and renewable companies when provider prices are available.',
    nuclearTitle: 'Nuclear & uranium dashboard',
    nuclearSubtitle: 'Nuclear and uranium data is shown only when a real provider or related news is available.',
    calendarTitle: 'Energy calendar',
    calendarSubtitle: 'Energy events require a dedicated calendar provider. Missing integrations are shown honestly.',
    newsTitle: 'Energy news',
    newsSubtitle: 'Oil, gas, renewables, nuclear and sector company news with original-source links.',
    educationTitle: 'Energy markets guide',
    educationSubtitle: 'Collapsed lessons for understanding commodities, traditional energy, clean energy, and sector risk.',
    noCompaniesTitle: 'No matching companies found',
    noCompaniesBody: 'Try changing the market, sector, or search criteria.',
    noNewsTitle: 'No energy news available right now',
    noNewsBody: 'Try changing search, period, or filters.',
    noMarketTitle: 'Market data is unavailable',
    noMarketBody: 'The data provider could not be reached. Latest available data will appear when present.',
    noCalendarTitle: 'No energy events in the selected period',
    noCalendarBody: 'Try changing the period, event type, or filters.',
    calendarLoadingTitle: 'Loading energy calendar',
    calendarLoadingBody: 'Checking the economic calendar and available energy news.',
    calendarProviderNotice: 'The economic-calendar source is unavailable right now, so events are derived from available energy news.',
    calendarEconomicSource: 'Economic calendar',
    calendarRecentNewsSource: 'Recent story',
    calendarImpactHigh: 'High impact',
    calendarImpactMedium: 'Medium impact',
    calendarImpactLow: 'Low impact',
    calendarImpactUnknown: 'Impact unavailable',
    calendarUpcoming: 'Upcoming',
    calendarRecent: 'Recent',
    calendarActual: 'Actual',
    calendarForecast: 'Forecast',
    calendarPrevious: 'Previous',
    loadingMarket: 'Loading energy data...',
    providerError: 'Part of the data could not be refreshed. Other sections remain usable where available.',
    totalCompanies: 'Available companies',
    risingStocks: 'Rising stocks',
    fallingStocks: 'Falling stocks',
    avgMove: 'Average stock move',
    oilPrice: 'Oil price',
    brentMove: 'Brent move',
    wtiMove: 'WTI move',
    gasMove: 'Natural gas move',
    heatingOil: 'Heating oil',
    cleanEnergyProxy: 'Clean-energy proxy',
    energySectorMovement: 'Energy sector movement',
    unit: 'Unit',
    currency: 'Currency',
    market: 'Market',
    price: 'Price',
    change: 'Change',
    volume: 'Volume',
    company: 'Company',
    symbol: 'Symbol',
    risk: 'Risk',
    riskUnavailable: 'Not classified',
    delayedData: 'Delayed data',
    translated: 'Machine translation',
    original: 'Original',
    noLink: 'Link unavailable',
    loadMore: 'Load more',
    showing: 'Showing',
    sourceNote: 'News and market data are aggregated from external financial providers. Refer to the original source for full context.',
    disclaimerTitle: 'Information notice',
    disclaimerBody: 'The displayed data, prices, classifications and analysis are for educational and informational purposes only and are not investment advice or a recommendation to buy or sell any asset. Some market data may be delayed or change quickly.',
    traditional: 'Traditional energy',
    clean: 'Clean energy',
    comparisonTitle: 'Traditional versus clean energy',
    comparisonBody: 'Each side has different drivers and risks. Commodity prices may support traditional producers, while clean-energy projects often depend on financing, policy and technology costs.',
    educationPreview: 'Education preview',
    fullGuide: 'Open full guide',
    eventsPreview: 'Upcoming energy events',
    latestNewsPreview: 'Latest energy news',
    tableCompany: 'Company',
    tableCategory: 'Category',
    tablePrice: 'Price',
    tableChange: 'Change',
    tableCurrency: 'Currency',
    tableSource: 'Source',
    tableAction: 'Action',
    commodityUnavailable: 'Commodity data is unavailable right now',
    eventProviderMissing: 'No dedicated energy-events calendar integration is connected here yet.',
    tabsLabel: 'Energy center sections',
  },
  fr: {
    badge: 'THE SFM · Marchés énergie',
    title: 'Centre des marchés de l’énergie',
    subtitle: 'Suivez les prix mondiaux de l’énergie, explorez les sociétés pétrole, gaz, renouvelables et nucléaire, puis surveillez les actualités et événements du secteur.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation',
    watchlist: 'Liste de suivi',
    connected: 'Données connectées',
    delayed: 'Prix potentiellement différés',
    unavailable: 'Indisponible',
    lastUpdated: 'Dernière mise à jour',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    marketData: 'Données marché',
    newsData: 'Actualités',
    provider: 'Fournisseur',
    source: 'Source',
    dataDate: 'Date des données',
    viewAll: 'Tout afficher',
    readArticle: 'Lire',
    openSource: 'Ouvrir la source',
    addWatchlist: 'Ajouter au suivi',
    details: 'Détails',
    clearFilters: 'Effacer les filtres',
    resultCount: 'Résultats',
    activeFilters: 'Filtres actifs',
    all: 'Tous',
    search: 'Recherche',
    searchCompany: 'Rechercher société ou symbole...',
    searchNews: 'Rechercher actualités, symboles, matières...',
    category: 'Catégorie',
    sector: 'Secteur',
    sort: 'Tri',
    period: 'Période',
    latest: 'Plus récent',
    oldest: 'Plus ancien',
    strongestMove: 'Plus fort mouvement',
    highestPrice: 'Prix le plus élevé',
    nameSort: 'Nom',
    today: 'Aujourd’hui',
    week: '7 derniers jours',
    month: '30 derniers jours',
    overview: 'Vue d’ensemble',
    oilGas: 'Pétrole et gaz',
    renewables: 'Renouvelables',
    nuclear: 'Nucléaire et uranium',
    companies: 'Explorateur sociétés',
    calendar: 'Calendrier énergie',
    news: 'Actualités',
    education: 'Guide',
    snapshotTitle: 'Synthèse des marchés énergie',
    snapshotSubtitle: 'Lecture compacte des principales matières et actions énergie disponibles.',
    commodityStripTitle: 'Prix des matières énergie',
    commodityStripSubtitle: 'Les benchmarks de matières sont séparés des actions pour éviter toute confusion.',
    commodityVsEquityTitle: 'Matières énergie vs actions énergie',
    commodityVsEquityBody: 'Le pétrole et le gaz sont des contrats ou benchmarks. Les sociétés cotées dépendent aussi des marges, dettes, dividendes, actifs et dirigeants.',
    sectorPerformance: 'Performance des segments énergie',
    marketMovers: 'Mouvements du marché',
    topGainers: 'Plus fortes hausses',
    topLosers: 'Plus fortes baisses',
    highestVolume: 'Plus échangées',
    commodityMoves: 'Mouvements des matières',
    featuredCompanies: 'Sociétés énergie mises en avant selon critères',
    featuredMethodology: 'Méthodologie',
    methodologyTitle: 'Méthode de sélection',
    methodologyBody: 'Les sociétés sont affichées seulement avec des cotations réelles disponibles, puis triées par mouvement quotidien et couverture sectorielle. Aucun score qualité ni conseil d’achat n’est généré.',
    companyExplorerTitle: 'Explorateur des sociétés énergie',
    companyExplorerSubtitle: 'Comparez les sociétés par catégorie, prix, mouvement quotidien et source de données. Les valeurs manquantes ne deviennent jamais zéro.',
    mobileCompanyHint: 'Les tableaux deviennent des cartes compactes sur petit écran.',
    oilGasTitle: 'Tableau pétrole et gaz',
    oilGasSubtitle: 'Vue concentrée de Brent, WTI, gaz naturel, sociétés pétrolières, services et pipelines.',
    renewablesTitle: 'Tableau renouvelables',
    renewablesSubtitle: 'Suivez les proxies énergie propre et sociétés renouvelables lorsque les prix sont disponibles.',
    nuclearTitle: 'Tableau nucléaire et uranium',
    nuclearSubtitle: 'Les données nucléaire et uranium sont affichées uniquement quand elles sont disponibles.',
    calendarTitle: 'Calendrier énergie',
    calendarSubtitle: 'Les événements énergie nécessitent un fournisseur calendrier dédié. Les intégrations absentes sont indiquées clairement.',
    newsTitle: 'Actualités énergie',
    newsSubtitle: 'Actualités pétrole, gaz, renouvelables, nucléaire et sociétés du secteur avec liens source.',
    educationTitle: 'Guide des marchés énergie',
    educationSubtitle: 'Leçons repliées pour comprendre matières, énergie traditionnelle, énergie propre et risque sectoriel.',
    noCompaniesTitle: 'Aucune société correspondante',
    noCompaniesBody: 'Essayez de modifier le marché, le secteur ou la recherche.',
    noNewsTitle: 'Aucune actualité énergie disponible',
    noNewsBody: 'Essayez de modifier la recherche, la période ou les filtres.',
    noMarketTitle: 'Données marché indisponibles',
    noMarketBody: 'Le fournisseur de données est inaccessible. Les dernières données disponibles apparaîtront quand présentes.',
    noCalendarTitle: 'Aucun événement énergie sur la période',
    noCalendarBody: 'Essayez de modifier la période, le type d’événement ou les filtres.',
    calendarLoadingTitle: 'Chargement du calendrier énergie',
    calendarLoadingBody: 'Recherche dans le calendrier économique et les actualités énergie disponibles.',
    calendarProviderNotice: 'La source du calendrier économique est indisponible pour le moment ; les événements proviennent donc des actualités énergie disponibles.',
    calendarEconomicSource: 'Calendrier économique',
    calendarRecentNewsSource: 'Actualité récente',
    calendarImpactHigh: 'Impact fort',
    calendarImpactMedium: 'Impact moyen',
    calendarImpactLow: 'Impact faible',
    calendarImpactUnknown: 'Impact indisponible',
    calendarUpcoming: 'À venir',
    calendarRecent: 'Récent',
    calendarActual: 'Réel',
    calendarForecast: 'Prévision',
    calendarPrevious: 'Précédent',
    loadingMarket: 'Chargement des données énergie...',
    providerError: 'Une partie des données n’a pas pu être actualisée. Les autres sections restent disponibles.',
    totalCompanies: 'Sociétés disponibles',
    risingStocks: 'Actions en hausse',
    fallingStocks: 'Actions en baisse',
    avgMove: 'Mouvement moyen',
    oilPrice: 'Prix du pétrole',
    brentMove: 'Mouvement Brent',
    wtiMove: 'Mouvement WTI',
    gasMove: 'Mouvement gaz',
    heatingOil: 'Fuel de chauffage',
    cleanEnergyProxy: 'Proxy énergie propre',
    energySectorMovement: 'Mouvement sectoriel',
    unit: 'Unité',
    currency: 'Devise',
    market: 'Marché',
    price: 'Prix',
    change: 'Variation',
    volume: 'Volume',
    company: 'Société',
    symbol: 'Symbole',
    risk: 'Risque',
    riskUnavailable: 'Non classé',
    delayedData: 'Données différées',
    translated: 'Traduction automatique',
    original: 'Original',
    noLink: 'Lien indisponible',
    loadMore: 'Afficher plus',
    showing: 'Affichage',
    sourceNote: 'Les actualités et données sont agrégées auprès de fournisseurs financiers externes. Consultez la source originale pour le contexte complet.',
    disclaimerTitle: 'Note informative',
    disclaimerBody: 'Les données, prix, classifications et analyses affichés sont fournis à titre éducatif et informatif uniquement. Ils ne constituent pas un conseil en investissement ni une recommandation d’achat ou de vente.',
    traditional: 'Énergie traditionnelle',
    clean: 'Énergie propre',
    comparisonTitle: 'Énergie traditionnelle vs énergie propre',
    comparisonBody: 'Chaque côté possède ses propres moteurs et risques. Les matières premières peuvent soutenir les producteurs traditionnels; les projets propres dépendent souvent du financement, des politiques et des coûts technologiques.',
    educationPreview: 'Aperçu éducatif',
    fullGuide: 'Ouvrir le guide',
    eventsPreview: 'Événements énergie à venir',
    latestNewsPreview: 'Dernières actualités énergie',
    tableCompany: 'Société',
    tableCategory: 'Catégorie',
    tablePrice: 'Prix',
    tableChange: 'Variation',
    tableCurrency: 'Devise',
    tableSource: 'Source',
    tableAction: 'Action',
    commodityUnavailable: 'Données matière indisponibles',
    eventProviderMissing: 'Aucune intégration dédiée au calendrier énergie n’est encore connectée ici.',
    tabsLabel: 'Sections du centre énergie',
  },
} as const;

type TextBundle = (typeof TEXT)[LangCode];

const TABS: Array<{ id: TabId; icon: LucideIcon; labelKey: keyof TextBundle }> = [
  { id: 'overview', icon: BarChart3, labelKey: 'overview' },
  { id: 'oil-gas', icon: Droplets, labelKey: 'oilGas' },
  { id: 'renewables', icon: Leaf, labelKey: 'renewables' },
  { id: 'nuclear', icon: Zap, labelKey: 'nuclear' },
  { id: 'companies', icon: Building2, labelKey: 'companies' },
  { id: 'calendar', icon: CalendarDays, labelKey: 'calendar' },
  { id: 'news', icon: Newspaper, labelKey: 'news' },
  { id: 'education', icon: BookOpen, labelKey: 'education' },
];

const COMPANY_CATEGORY_META: Record<EnergyCompanyCategory, {
  label: Record<LangCode, string>;
  group: 'oil-gas' | 'renewables' | 'nuclear' | 'infrastructure';
  icon: LucideIcon;
}> = {
  all: { label: { ar: 'كل الفئات', en: 'All categories', fr: 'Toutes catégories' }, group: 'infrastructure', icon: Layers3 },
  integrated_oil_gas: { label: { ar: 'نفط وغاز متكامل', en: 'Integrated oil & gas', fr: 'Pétrole et gaz intégré' }, group: 'oil-gas', icon: Factory },
  exploration_production: { label: { ar: 'استكشاف وإنتاج', en: 'Exploration & production', fr: 'Exploration et production' }, group: 'oil-gas', icon: Gauge },
  oil_services: { label: { ar: 'خدمات نفطية', en: 'Oilfield services', fr: 'Services pétroliers' }, group: 'oil-gas', icon: Activity },
  pipelines: { label: { ar: 'خطوط أنابيب وبنية تحتية', en: 'Pipelines & midstream', fr: 'Pipelines et midstream' }, group: 'infrastructure', icon: Landmark },
  natural_gas: { label: { ar: 'غاز طبيعي وLNG', en: 'Natural gas & LNG', fr: 'Gaz naturel et LNG' }, group: 'oil-gas', icon: Flame },
  renewables: { label: { ar: 'طاقة متجددة', en: 'Renewables', fr: 'Renouvelables' }, group: 'renewables', icon: Leaf },
  solar: { label: { ar: 'طاقة شمسية', en: 'Solar', fr: 'Solaire' }, group: 'renewables', icon: Sparkles },
  nuclear: { label: { ar: 'نووي ويورانيوم', en: 'Nuclear & uranium', fr: 'Nucléaire et uranium' }, group: 'nuclear', icon: Zap },
};

const NEWS_CATEGORY_META: Record<NewsCategory, { label: Record<LangCode, string>; keywords: string[] }> = {
  all: { label: { ar: 'كل الأخبار', en: 'All news', fr: 'Toutes' }, keywords: [] },
  oil: { label: { ar: 'النفط', en: 'Oil', fr: 'Pétrole' }, keywords: ['oil', 'crude', 'brent', 'wti', 'barrel'] },
  natural_gas: { label: { ar: 'الغاز الطبيعي', en: 'Natural gas', fr: 'Gaz naturel' }, keywords: ['natural gas', 'lng', 'gas'] },
  opec: { label: { ar: 'أوبك', en: 'OPEC', fr: 'OPEP' }, keywords: ['opec', 'opec+'] },
  lng: { label: { ar: 'LNG', en: 'LNG', fr: 'LNG' }, keywords: ['lng', 'liquefied natural gas'] },
  renewables: { label: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, keywords: ['renewable', 'clean energy', 'green energy'] },
  solar: { label: { ar: 'الطاقة الشمسية', en: 'Solar', fr: 'Solaire' }, keywords: ['solar', 'photovoltaic', 'panel'] },
  wind: { label: { ar: 'طاقة الرياح', en: 'Wind', fr: 'Éolien' }, keywords: ['wind', 'turbine'] },
  nuclear: { label: { ar: 'الطاقة النووية', en: 'Nuclear', fr: 'Nucléaire' }, keywords: ['nuclear', 'reactor'] },
  uranium: { label: { ar: 'اليورانيوم', en: 'Uranium', fr: 'Uranium' }, keywords: ['uranium', 'cameco'] },
  earnings: { label: { ar: 'النتائج والأرباح', en: 'Earnings', fr: 'Résultats' }, keywords: ['earnings', 'revenue', 'profit', 'guidance'] },
  regulation: { label: { ar: 'التنظيمات والسياسات', en: 'Regulation', fr: 'Réglementation' }, keywords: ['regulation', 'policy', 'subsidy', 'tax', 'climate'] },
  geopolitics: { label: { ar: 'الجغرافيا السياسية', en: 'Geopolitics', fr: 'Géopolitique' }, keywords: ['sanction', 'war', 'geopolitical', 'russia', 'middle east'] },
};

const EDUCATION_LESSONS: Array<{ id: string; title: Record<LangCode, string>; body: Record<LangCode, string>; category: TabId }> = [
  {
    id: 'brent-wti',
    category: 'oil-gas',
    title: { ar: 'ما الفرق بين Brent وWTI؟', en: 'Brent versus WTI', fr: 'Brent contre WTI' },
    body: {
      ar: 'Brent معيار عالمي مرتبط بأسواق بحر الشمال والتجارة الدولية، بينما WTI معيار أمريكي يتأثر بالمخزون والبنية التحتية في الولايات المتحدة.',
      en: 'Brent is a global seaborne crude benchmark, while WTI is a US benchmark affected by US inventories and infrastructure.',
      fr: 'Brent est un benchmark mondial maritime; WTI est un benchmark américain influencé par stocks et infrastructures US.',
    },
  },
  {
    id: 'inventories',
    category: 'oil-gas',
    title: { ar: 'لماذا تهم مخزونات النفط؟', en: 'Why oil inventories matter', fr: 'Pourquoi les stocks comptent' },
    body: {
      ar: 'المخزون الأسبوعي يعطي إشارة عن توازن العرض والطلب. لكنه تقرير دوري وليس سعراً مباشراً، لذلك يجب عدم خلطه مع حركة العقود.',
      en: 'Weekly inventories indicate supply-demand balance, but they are a periodic report rather than a live price.',
      fr: 'Les stocks hebdomadaires signalent l’équilibre offre-demande, mais ce n’est pas un prix en direct.',
    },
  },
  {
    id: 'midstream',
    category: 'companies',
    title: { ar: 'كيف تختلف شركات خطوط الأنابيب؟', en: 'How midstream companies differ', fr: 'Comment diffèrent les midstream' },
    body: {
      ar: 'شركات النقل وخطوط الأنابيب قد تعتمد على عقود ورسوم نقل أكثر من اعتمادها المباشر على سعر البرميل، لكنها لا تنفصل تماماً عن دورة الطاقة.',
      en: 'Pipeline companies may rely more on contracts and transport fees than the oil price itself, but they are not immune to the energy cycle.',
      fr: 'Les pipelines reposent davantage sur contrats et tarifs de transport, tout en restant exposés au cycle énergie.',
    },
  },
  {
    id: 'clean-energy',
    category: 'renewables',
    title: { ar: 'حساسية الطاقة النظيفة للفائدة', en: 'Clean energy and rates', fr: 'Énergie propre et taux' },
    body: {
      ar: 'مشاريع الطاقة الشمسية والرياح كثيفة رأس المال، لذلك قد تتأثر بتكاليف التمويل وسلاسل الإمداد والسياسات الحكومية.',
      en: 'Solar and wind projects are capital intensive, so financing costs, supply chains and policy support matter.',
      fr: 'Solaire et éolien sont intensifs en capital; coûts de financement, chaînes d’approvisionnement et politiques comptent.',
    },
  },
  {
    id: 'uranium',
    category: 'nuclear',
    title: { ar: 'اليورانيوم لا يساوي كل النووي', en: 'Uranium is not all nuclear', fr: 'L’uranium n’est pas tout le nucléaire' },
    body: {
      ar: 'ارتفاع اليورانيوم قد يفيد المنتجين والمناجم، لكنه قد يكون تكلفة على بعض المرافق النووية. لذلك يجب فصل المعدن عن الشركات المشغلة.',
      en: 'Higher uranium prices may help miners but raise costs for some utilities, so the commodity and operators should be separated.',
      fr: 'Un uranium plus cher peut aider les mineurs mais coûter aux utilities; il faut séparer matière et opérateurs.',
    },
  },
];

const STRATEGY_ROWS = [
  {
    label: { ar: 'مصدر العائد', en: 'Return driver', fr: 'Moteur de rendement' },
    traditional: { ar: 'أسعار السلع، الهوامش، التوزيعات', en: 'Commodity prices, margins, dividends', fr: 'Prix matières, marges, dividendes' },
    clean: { ar: 'النمو، السياسات، تكاليف التقنية', en: 'Growth, policy, technology costs', fr: 'Croissance, politiques, coûts technologiques' },
  },
  {
    label: { ar: 'المخاطر', en: 'Risk', fr: 'Risque' },
    traditional: { ar: 'الجغرافيا السياسية ودورة النفط والغاز', en: 'Geopolitics and oil/gas cycle', fr: 'Géopolitique et cycle pétrole/gaz' },
    clean: { ar: 'الفائدة، التمويل، التنفيذ، الدعم الحكومي', en: 'Rates, financing, execution, subsidies', fr: 'Taux, financement, exécution, subventions' },
  },
  {
    label: { ar: 'أفق الاستثمار', en: 'Investment horizon', fr: 'Horizon' },
    traditional: { ar: 'دوري وقد يدعم الدخل', en: 'Cyclical, often income-oriented', fr: 'Cyclique, souvent orienté revenu' },
    clean: { ar: 'نمو طويل الأجل مع تذبذب', en: 'Long-term growth with volatility', fr: 'Croissance long terme avec volatilité' },
  },
];

function localeFor(lang: LangCode) {
  if (lang === 'ar') return 'ar-KW-u-nu-latn';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function isTabId(value: string | null): value is TabId {
  return Boolean(value && TABS.some(tab => tab.id === value));
}

function isCompanyCategory(value: string | null): value is EnergyCompanyCategory {
  return Boolean(value && value in COMPANY_CATEGORY_META);
}

function isNewsCategory(value: string | null): value is NewsCategory {
  return Boolean(value && value in NEWS_CATEGORY_META);
}

function isTimeFilter(value: string | null): value is TimeFilter {
  return value === 'all' || value === 'today' || value === 'week' || value === 'month';
}

function isCompanySort(value: string | null): value is CompanySort {
  return value === 'change-desc' || value === 'change-asc' || value === 'name' || value === 'price-desc';
}

function isNewsSort(value: string | null): value is NewsSort {
  return value === 'latest' || value === 'oldest' || value === 'company-move';
}

function readUrlState() {
  if (typeof window === 'undefined') {
    return {
      tab: 'overview' as TabId,
      companyQuery: '',
      companyCategory: 'all' as EnergyCompanyCategory,
      companySort: 'change-desc' as CompanySort,
      newsQuery: '',
      newsCategory: 'all' as NewsCategory,
      newsPeriod: 'all' as TimeFilter,
      newsSort: 'latest' as NewsSort,
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    tab: isTabId(params.get('tab')) ? params.get('tab') as TabId : 'overview',
    companyQuery: params.get('companyQuery') ?? '',
    companyCategory: isCompanyCategory(params.get('sector')) ? params.get('sector') as EnergyCompanyCategory : 'all',
    companySort: isCompanySort(params.get('companySort')) ? params.get('companySort') as CompanySort : 'change-desc',
    newsQuery: params.get('q') ?? '',
    newsCategory: isNewsCategory(params.get('category')) ? params.get('category') as NewsCategory : 'all',
    newsPeriod: isTimeFilter(params.get('period')) ? params.get('period') as TimeFilter : 'all',
    newsSort: isNewsSort(params.get('sort')) ? params.get('sort') as NewsSort : 'latest',
  };
}

function updateUrl(values: Record<string, string | null>, mode: 'push' | 'replace' = 'replace') {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (!value || value === 'all' || (key === 'tab' && value === 'overview')) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (mode === 'push') window.history.pushState(null, '', next);
  else window.history.replaceState(null, '', next);
}

function newestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? '';
}

function finite(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toneFor(value: number | null | undefined): Tone {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
  if (value > 0.05) return 'positive';
  if (value < -0.05) return 'negative';
  return 'neutral';
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined, locale: string, fractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  const safeCurrency = currency && /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  const digits = Math.max(0, Math.min(6, fractionDigits));
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${safeCurrency}`;
}

function formatSignedMoney(value: number | null | undefined, currency: string | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(value), currency, locale, 3)}`;
}

function formatNumber(value: number | null | undefined, locale: string, maximumFractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function formatPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function relativeDate(value: string | null | undefined, locale: string) {
  if (!value) return locale.startsWith('ar') ? 'غير متاح' : 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value, locale);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60_000) return formatter.format(Math.round(diffMs / 1000), 'second');
  if (abs < 3_600_000) return formatter.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < 86_400_000) return formatter.format(Math.round(diffMs / 3_600_000), 'hour');
  return formatter.format(Math.round(diffMs / 86_400_000), 'day');
}

function categoryLabel(category: string | null | undefined, lang: LangCode) {
  const key = (category ?? 'all') as EnergyCompanyCategory;
  return COMPANY_CATEGORY_META[key]?.label[lang] ?? (String(category ?? '').replace(/_/g, ' ') || COMPANY_CATEGORY_META.all.label[lang]);
}

function commodityLabel(item: EnergyCommodity, lang: LangCode) {
  const cleanArabicName = item.nameAr && !/[ØÙÃÂ]/.test(item.nameAr) ? item.nameAr : '';
  const labels: Record<string, Record<LangCode, string>> = {
    brent: { ar: 'خام برنت', en: 'Brent crude', fr: 'Brent' },
    wti: { ar: 'خام غرب تكساس WTI', en: 'WTI crude', fr: 'WTI' },
    natural_gas: { ar: 'الغاز الطبيعي', en: 'Natural gas', fr: 'Gaz naturel' },
    gasoline: { ar: 'بنزين RBOB', en: 'RBOB gasoline', fr: 'Essence RBOB' },
    heating_oil: { ar: 'زيت التدفئة', en: 'Heating oil', fr: 'Fioul domestique' },
    energy_etf: { ar: 'مؤشر قطاع الطاقة XLE', en: 'Energy sector ETF XLE', fr: 'ETF secteur énergie XLE' },
    renewables_etf: { ar: 'مؤشر الطاقة النظيفة ICLN', en: 'Clean energy ETF ICLN', fr: 'ETF énergie propre ICLN' },
    solar_etf: { ar: 'مؤشر الطاقة الشمسية TAN', en: 'Solar ETF TAN', fr: 'ETF solaire TAN' },
  };
  if (labels[item.category]) return labels[item.category][lang];
  if (lang === 'ar' && cleanArabicName) return cleanArabicName;
  return item.displayName;
}

function commodityUnit(item: EnergyCommodity | null | undefined) {
  if (!item) return null;
  if (item.unit && /USD/i.test(item.unit)) return item.unit.replace(/\s+/g, '');
  const currency = item.currency && /^[A-Z]{3}$/.test(item.currency) ? item.currency : 'USD';
  if (item.category === 'brent' || item.category === 'wti') return `${currency}/barrel`;
  if (item.category === 'natural_gas') return `${currency}/MMBtu`;
  if (item.category === 'gasoline' || item.category === 'heating_oil') return `${currency}/gallon`;
  return item.unit || currency;
}

function quoteAvailable(item: EnergyCommodity | null | undefined) {
  return Boolean(item?.available && typeof item.price === 'number' && Number.isFinite(item.price));
}

function moveAvailable(item: EnergyCommodity | null | undefined) {
  return quoteAvailable(item) && typeof item?.changePercent === 'number' && Number.isFinite(item.changePercent);
}

function localizedUnavailable(locale: string) {
  if (locale.startsWith('ar')) {
    return {
      title: 'غير متاح حالياً',
      body: 'تعذر جلب هذه البيانات من المزود.',
      source: 'المزود غير متاح',
      benchmark: 'المؤشر',
      absoluteMove: 'التغير السعري',
    };
  }
  if (locale.startsWith('fr')) {
    return {
      title: 'Indisponible',
      body: 'Le fournisseur ne renvoie pas cette donnée pour le moment.',
      source: 'Fournisseur indisponible',
      benchmark: 'Benchmark',
      absoluteMove: 'Variation',
    };
  }
  return {
    title: 'Unavailable',
    body: 'The provider could not return this data right now.',
    source: 'Provider unavailable',
    benchmark: 'Benchmark',
    absoluteMove: 'Price move',
  };
}

function isCommodityFuture(item: EnergyCommodity) {
  return ['brent', 'wti', 'natural_gas', 'gasoline', 'heating_oil'].includes(item.category);
}

function isCleanEnergyProxy(item: EnergyCommodity) {
  return ['renewables_etf', 'solar_etf'].includes(item.category);
}

function collectMarketSources(tickerItems: EnergyTickerItem[], commodityItems: EnergyCommodity[]) {
  const sourceSet = new Set<string>();
  tickerItems.forEach(item => {
    if (item.source) sourceSet.add(item.source);
  });
  commodityItems.forEach(item => {
    if (item.source) sourceSet.add(item.source);
  });
  return Array.from(sourceSet).sort((a, b) => a.localeCompare(b));
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayTitle(item: EnergyNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: EnergyNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function dedupeNews(items: EnergyNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const url = safeExternalUrl(item.url);
    const titleKey = normalizeTitle(displayTitle(item));
    const key = url ? `url:${url.replace(/\/$/, '')}` : `title:${item.source}:${titleKey}`;
    if (!titleKey && !url) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newsHaystack(item: EnergyNewsItem) {
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

function itemMatchesNewsCategory(item: EnergyNewsItem, category: NewsCategory) {
  if (category === 'all') return true;
  const meta = NEWS_CATEGORY_META[category];
  const haystack = newsHaystack(item);
  return meta.keywords.some(keyword => haystack.includes(keyword.toLowerCase()));
}

function itemMatchesTime(item: EnergyNewsItem, period: TimeFilter) {
  if (period === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const age = Date.now() - date.getTime();
  if (period === 'today') return age <= 24 * 60 * 60 * 1000;
  if (period === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
}

const ENERGY_EVENT_KEYWORDS = [
  'oil',
  'crude',
  'brent',
  'wti',
  'petroleum',
  'gas',
  'natural gas',
  'lng',
  'opec',
  'refinery',
  'refining',
  'energy',
  'power',
  'electricity',
  'solar',
  'wind',
  'renewable',
  'nuclear',
  'uranium',
  'eia',
  'inventory',
  'inventories',
  'مخزون',
  'النفط',
  'الخام',
  'برنت',
  'الغاز',
  'أوبك',
  'الطاقة',
  'الكهرباء',
  'الشمسية',
  'الرياح',
  'المتجددة',
  'النووية',
  'اليورانيوم',
];

const HIGH_IMPACT_EVENT_KEYWORDS = ['opec', 'inventories', 'inventory', 'eia', 'sanction', 'war', 'supply cut', 'rate decision', 'أوبك', 'مخزون', 'عقوبات'];
const MEDIUM_IMPACT_EVENT_KEYWORDS = ['earnings', 'guidance', 'production', 'refinery', 'export', 'import', 'capacity', 'أرباح', 'إنتاج', 'تصدير'];

function isoDateOffset(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isEnergyEventText(value: string) {
  const normalized = value.toLowerCase();
  return ENERGY_EVENT_KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()));
}

function impactFromText(value: string): CalendarImpact {
  const normalized = value.toLowerCase();
  if (HIGH_IMPACT_EVENT_KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()))) return 'high';
  if (MEDIUM_IMPACT_EVENT_KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()))) return 'medium';
  return 'unknown';
}

function normalizeCalendarImpact(value: unknown): CalendarImpact {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  return 'unknown';
}

function energyEventCategoryFromText(value: string, lang: LangCode) {
  const normalized = value.toLowerCase();
  const match = (Object.keys(NEWS_CATEGORY_META) as NewsCategory[])
    .filter(category => category !== 'all')
    .find(category => NEWS_CATEGORY_META[category].keywords.some(keyword => normalized.includes(keyword.toLowerCase())));
  return NEWS_CATEGORY_META[match ?? 'all'].label[lang];
}

function impactLabel(impact: CalendarImpact, text: TextBundle) {
  if (impact === 'high') return text.calendarImpactHigh;
  if (impact === 'medium') return text.calendarImpactMedium;
  if (impact === 'low') return text.calendarImpactLow;
  return text.calendarImpactUnknown;
}

function calendarStatus(dateTime: string): 'upcoming' | 'recent' {
  const date = new Date(dateTime);
  if (!Number.isNaN(date.getTime()) && date.getTime() >= Date.now()) return 'upcoming';
  return 'recent';
}

function normalizeEconomicCalendarEvents(
  records: EconomicCalendarApiEvent[],
  lang: LangCode,
  text: TextBundle,
): EnergyCalendarEventCard[] {
  return records
    .map((record, index) => {
      const title = String(record.title || record.eventName || record.event || record.name || '').trim();
      const dateTime = String(record.dateTimeUtc || record.dateTime || record.time || record.datetime || record.eventTime || '').trim();
      if (!title || !dateTime || Number.isNaN(new Date(dateTime).getTime())) return null;
      const haystack = [
        title,
        record.country,
        record.currency,
        record.source,
        record.provider,
      ].filter(Boolean).join(' ');
      if (!isEnergyEventText(haystack)) return null;
      const impact = normalizeCalendarImpact(record.impact);
      const values = [
        record.actual !== null && record.actual !== undefined ? `${text.calendarActual}: ${record.actual}${record.unit ? ` ${record.unit}` : ''}` : '',
        record.forecast !== null && record.forecast !== undefined ? `${text.calendarForecast}: ${record.forecast}${record.unit ? ` ${record.unit}` : ''}` : '',
        record.previous !== null && record.previous !== undefined ? `${text.calendarPrevious}: ${record.previous}${record.unit ? ` ${record.unit}` : ''}` : '',
      ].filter(Boolean);
      return {
        id: `calendar-${record.id || title}-${dateTime}-${index}`,
        title,
        category: energyEventCategoryFromText(haystack, lang),
        dateTime,
        impact: impact === 'unknown' ? impactFromText(haystack) : impact,
        description: values.join(' · ') || text.calendarEconomicSource,
        source: record.source || record.provider || text.calendarEconomicSource,
        status: calendarStatus(dateTime),
      } satisfies EnergyCalendarEventCard;
    })
    .filter((event): event is EnergyCalendarEventCard => Boolean(event));
}

function newsToCalendarEvents(items: EnergyNewsItem[], lang: LangCode, text: TextBundle): EnergyCalendarEventCard[] {
  return dedupeNews(items)
    .map<EnergyCalendarEventCard | null>((item, index) => {
      const title = displayTitle(item).trim();
      const dateTime = item.publishedAt;
      if (!title || !dateTime || Number.isNaN(new Date(dateTime).getTime())) return null;
      const haystack = newsHaystack(item);
      if (!isEnergyEventText(haystack)) return null;
      return {
        id: `news-event-${item.id || item.url || title}-${index}`,
        title,
        category: energyEventCategoryFromText(haystack, lang),
        dateTime,
        impact: impactFromText(haystack),
        description: displaySummary(item) || text.calendarRecentNewsSource,
        source: item.source || text.calendarRecentNewsSource,
        status: 'recent',
      } satisfies EnergyCalendarEventCard;
    })
    .filter((event): event is EnergyCalendarEventCard => Boolean(event));
}

function sortEnergyCalendarEvents(events: EnergyCalendarEventCard[]) {
  const now = Date.now();
  return events.slice().sort((a, b) => {
    const aTime = new Date(a.dateTime).getTime();
    const bTime = new Date(b.dateTime).getTime();
    const aFuture = aTime >= now;
    const bFuture = bTime >= now;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return aFuture ? aTime - bTime : bTime - aTime;
  });
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

function StatCard({ icon: Icon, label, value, helper, tone = 'neutral' }: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: Tone;
}) {
  return (
    <article className={`energyStat energyTone-${tone}`}>
      <span className="energyStatIcon"><Icon size={18} /></span>
      <div>
        <span>{label}</span>
        <strong dir="auto">{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </article>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="energySectionHeader">
      <div>
        <span className="energySectionIcon"><Icon size={18} /></span>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="energySectionAction">{action}</div> : null}
    </div>
  );
}

function EmptyState({ icon: Icon = Info, title, body, action }: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="energyEmptyState">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="energySkeletonStack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => <span key={index} />)}
    </div>
  );
}

function DataBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`energyBadge energyTone-${tone}`}>{children}</span>;
}

function EnergyCenterHeader({ text, locale, lastUpdated, loading, refreshing, onRefresh, hasMarketData, onViewReports, dataSources }: {
  text: TextBundle;
  locale: string;
  lastUpdated: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  hasMarketData: boolean;
  onViewReports: () => void;
  dataSources: string[];
}) {
  const statusTone: Tone = hasMarketData ? 'positive' : 'neutral';
  const marketStatusText = hasMarketData ? text.connected : loading ? text.loadingMarket : text.unavailable;
  const marketUpdated = lastUpdated ? `${text.lastUpdated}: ${formatDateTime(lastUpdated, locale)} (${relativeDate(lastUpdated, locale)})` : text.unavailable;
  const providersReady = dataSources.length > 0;
  const marketSource = providersReady ? `${text.provider}: ${dataSources.join(' · ')}` : `${text.provider}: ${text.unavailable}`;

  return (
    <header className="energyHero">
      <div className="energyHeroCopy">
        <span className="energyHeroBadge"><Flame size={15} />{text.badge}</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <div className="energyHeroMeta">
          <DataBadge tone={statusTone}>{marketStatusText}</DataBadge>
          <DataBadge tone="neutral">
            <Clock3 size={14} />
            {marketUpdated}
          </DataBadge>
          <DataBadge tone={providersReady ? 'positive' : 'warning'}>{marketSource}</DataBadge>
          <span><Clock3 size={14} />{text.autoRefresh}</span>
        </div>
      </div>
      <div className="energyHeroActions">
        <button className="energyPrimaryButton" type="button" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? <Loader2 size={17} className="energySpin" /> : <RefreshCcw size={17} />}
          {refreshing ? text.refreshing : text.refresh}
        </button>
        <button className="energySecondaryButton" type="button" onClick={onViewReports}>
          <BookmarkPlus size={17} />
          {PORTAL_LINKS[locale.startsWith('ar') ? 'ar' : locale.startsWith('fr') ? 'fr' : 'en'].reports}
        </button>
        {!hasMarketData ? <small className="energyHeroHelp">{text.providerError}</small> : null}
      </div>
    </header>
  );
}

function EnergyCenterTabs({ activeTab, setActiveTab, text }: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  text: TextBundle;
}) {
  return (
    <nav className="energyTabs energyTabsScroller" aria-label={text.tabsLabel} role="tablist">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            type="button"
            className={active ? 'energyTabButton active' : 'energyTabButton'}
            aria-current={active ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={16} />
            {text[tab.labelKey]}
          </button>
        );
      })}
    </nav>
  );
}

function EnergyCommodityStrip({ items, loading, text, lang, locale, compact = false }: {
  items: EnergyCommodity[];
  loading: boolean;
  text: TextBundle;
  lang: LangCode;
  locale: string;
  compact?: boolean;
}) {
  const skipped = ['brent', 'wti', 'natural_gas', 'heating_oil'];
  const displayed = compact ? items.filter(item => !skipped.includes(item.category)).slice(0, 5) : items;
  return (
    <section className="energyPanel">
      <SectionHeader
        icon={Droplets}
        title={text.commodityStripTitle}
        subtitle={compact ? text.commodityStripSubtitle : text.commodityStripSubtitle}
      />
      {loading ? (
        <div className="energyCommodityGrid">
          {Array.from({ length: compact ? 4 : 8 }, (_, index) => <div className="energyCommoditySkeleton" key={index} />)}
        </div>
      ) : displayed.length > 0 ? (
        <div className="energyCommodityGrid">
          {displayed.map(item => {
            const tone = toneFor(item.changePercent);
            return (
              <article className={`energyCommodityCard energyTone-${tone}`} key={item.symbol}>
                <header className="energyCommodityCardHeader">
                  <div>
                    <span className="energyCommodityType">{isCommodityFuture(item) ? text.commodityStripTitle : text.marketData}</span>
                    <strong>{commodityLabel(item, lang)}</strong>
                    <small dir="ltr">{item.symbol}</small>
                  </div>
                  <span className="energyCommoditySource" dir={item.source ? 'ltr' : 'auto'}>{item.source || text.unavailable}</span>
                </header>
                {item.available ? (
                  <div className="energyCommodityValueRow">
                    <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                    <em dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                  </div>
                ) : (
                  <div className="energyCommodityUnavailable">
                    <strong>{text.unavailable}</strong>
                    <span>{text.commodityUnavailable}</span>
                  </div>
                )}
                <footer>
                  <span dir="ltr">{commodityUnit(item)}</span>
                  <span>{text.currency}: <i dir="ltr">{item.currency}</i></span>
                  <span>{item.delayed ? text.delayedData : text.connected}</span>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title={text.noMarketTitle} body={text.noMarketBody} icon={AlertTriangle} />
      )}
    </section>
  );
}

function EnergyMarketSnapshot({ tickerItems, commodityItems, loading, text, locale }: {
  tickerItems: EnergyTickerItem[];
  commodityItems: EnergyCommodity[];
  loading: boolean;
  text: TextBundle;
  locale: string;
}) {
  const availableCommodities = commodityItems.filter(item => item.available);
  const oilBenchmark = commodityItems.find(item => item.category === 'brent');
  const wti = commodityItems.find(item => item.category === 'wti');
  const naturalGas = commodityItems.find(item => item.category === 'natural_gas');
  const heatingOil = commodityItems.find(item => item.category === 'heating_oil');
  const sectorProxy = commodityItems.find(item => item.category === 'energy_etf');
  const hasData = tickerItems.length > 0 || availableCommodities.length > 0;
  const avgMove = tickerItems.length
    ? tickerItems.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / tickerItems.length
    : null;
  const cleanProxy = sectorProxy;
  const oilPrice = oilBenchmark?.price ?? wti?.price ?? naturalGas?.price ?? null;
  const oilPriceStatus = [oilBenchmark?.available, wti?.available, naturalGas?.available].some(Boolean) ? text.connected : text.unavailable;
  const oilCardTone = toneFor(oilBenchmark?.changePercent ?? wti?.changePercent ?? naturalGas?.changePercent);
  const unavailable = localizedUnavailable(locale);
  const copy = locale.startsWith('ar')
    ? {
        oilPrice: 'سعر النفط',
        oilMove: 'حركة النفط',
        gasPrice: 'سعر الغاز',
        gasMove: 'حركة الغاز',
        heatingOil: 'زيت التدفئة',
        sectorIndex: 'مؤشر القطاع الطاقي',
        oilPriceDescription: (benchmark: string) => `السعر المرجعي المعروض من ${benchmark} حسب توافر المزود.`,
        oilMoveDescription: (benchmark: string) => `التغير اليومي لمرجع ${benchmark} مع إبقاء السعر والنسبة بصيغة واضحة.`,
        gasPriceDescription: 'سعر الغاز الطبيعي بوحدة USD/MMBtu من المزود المتاح.',
        gasMoveDescription: 'النسبة اليومية لحركة الغاز الطبيعي مع التغير السعري عند توفره.',
        heatingOilDescription: 'عقد زيت التدفئة مع وحدة USD/gallon للقراءة السريعة.',
        sectorDescription: 'مؤشر XLE كبديل سوقي مختصر لأداء قطاع الطاقة.',
      }
    : locale.startsWith('fr')
      ? {
          oilPrice: 'Prix du pétrole',
          oilMove: 'Mouvement pétrole',
          gasPrice: 'Prix du gaz',
          gasMove: 'Mouvement gaz',
          heatingOil: 'Fioul domestique',
          sectorIndex: 'Indice énergie',
          oilPriceDescription: (benchmark: string) => `Prix du benchmark ${benchmark} selon la donnée fournisseur disponible.`,
          oilMoveDescription: (benchmark: string) => `Variation journalière du benchmark ${benchmark}, avec montant et pourcentage lisibles.`,
          gasPriceDescription: 'Prix du gaz naturel en USD/MMBtu depuis le fournisseur disponible.',
          gasMoveDescription: 'Variation journalière du gaz naturel avec le mouvement de prix si disponible.',
          heatingOilDescription: 'Contrat fioul avec unité USD/gallon pour une lecture rapide.',
          sectorDescription: 'ETF XLE comme proxy compact de la performance du secteur énergie.',
        }
      : {
          oilPrice: 'Oil price',
          oilMove: 'Oil move',
          gasPrice: 'Gas price',
          gasMove: 'Gas move',
          heatingOil: 'Heating oil',
          sectorIndex: 'Energy sector index',
          oilPriceDescription: (benchmark: string) => `${benchmark} benchmark price from the available provider feed.`,
          oilMoveDescription: (benchmark: string) => `${benchmark} daily move with the absolute and percentage change kept readable.`,
          gasPriceDescription: 'Natural gas price in USD/MMBtu from the available provider.',
          gasMoveDescription: 'Daily natural gas move with price change when available.',
          heatingOilDescription: 'Heating oil contract shown with the USD/gallon unit.',
          sectorDescription: 'XLE is used as a compact market proxy for energy-sector performance.',
        };
  const oil = quoteAvailable(oilBenchmark) ? oilBenchmark : quoteAvailable(wti) ? wti : oilBenchmark ?? wti ?? null;
  const oilBenchmarkLabel = oil?.category === 'wti' ? 'WTI' : 'Brent';
  const commodityCategoryLabel = (item: EnergyCommodity | null | undefined) => item ? commodityLabel(item, locale.startsWith('ar') ? 'ar' : locale.startsWith('fr') ? 'fr' : 'en') : unavailable.benchmark;
  const moveValue = (item: EnergyCommodity | null | undefined) => {
    if (typeof item?.change === 'number' && Number.isFinite(item.change)) return formatSignedMoney(item.change, item.currency, locale);
    return formatPercent(item?.changePercent, locale);
  };
  const insightCards = [
    {
      key: 'oil-price',
      title: copy.oilPrice,
      icon: Droplets,
      item: oil,
      category: oilBenchmarkLabel,
      value: quoteAvailable(oil) ? formatMoney(oil?.price, oil?.currency, locale) : unavailable.title,
      change: moveAvailable(oil) ? formatPercent(oil?.changePercent, locale) : text.unavailable,
      source: oil?.source ?? null,
      unit: commodityUnit(oil),
      explanation: quoteAvailable(oil) ? copy.oilPriceDescription(oilBenchmarkLabel) : unavailable.body,
      available: quoteAvailable(oil),
      tone: toneFor(oil?.changePercent),
    },
    {
      key: 'oil-move',
      title: copy.oilMove,
      icon: Activity,
      item: oil,
      category: oilBenchmarkLabel,
      value: moveAvailable(oil) ? moveValue(oil) : unavailable.title,
      change: moveAvailable(oil) ? formatPercent(oil?.changePercent, locale) : text.unavailable,
      source: oil?.source ?? null,
      unit: commodityUnit(oil),
      explanation: moveAvailable(oil) ? copy.oilMoveDescription(oilBenchmarkLabel) : unavailable.body,
      available: moveAvailable(oil),
      tone: toneFor(oil?.changePercent),
    },
    {
      key: 'gas-price',
      title: copy.gasPrice,
      icon: Flame,
      item: naturalGas ?? null,
      category: commodityCategoryLabel(naturalGas),
      value: quoteAvailable(naturalGas) ? formatMoney(naturalGas?.price, naturalGas?.currency, locale) : unavailable.title,
      change: moveAvailable(naturalGas) ? formatPercent(naturalGas?.changePercent, locale) : text.unavailable,
      source: naturalGas?.source ?? null,
      unit: commodityUnit(naturalGas),
      explanation: quoteAvailable(naturalGas) ? copy.gasPriceDescription : unavailable.body,
      available: quoteAvailable(naturalGas),
      tone: toneFor(naturalGas?.changePercent),
    },
    {
      key: 'gas-move',
      title: copy.gasMove,
      icon: Gauge,
      item: naturalGas ?? null,
      category: commodityCategoryLabel(naturalGas),
      value: moveAvailable(naturalGas) ? moveValue(naturalGas) : unavailable.title,
      change: moveAvailable(naturalGas) ? formatPercent(naturalGas?.changePercent, locale) : text.unavailable,
      source: naturalGas?.source ?? null,
      unit: commodityUnit(naturalGas),
      explanation: moveAvailable(naturalGas) ? copy.gasMoveDescription : unavailable.body,
      available: moveAvailable(naturalGas),
      tone: toneFor(naturalGas?.changePercent),
    },
    {
      key: 'heating-oil',
      title: copy.heatingOil,
      icon: Factory,
      item: heatingOil ?? null,
      category: commodityCategoryLabel(heatingOil),
      value: quoteAvailable(heatingOil) ? formatMoney(heatingOil?.price, heatingOil?.currency, locale) : unavailable.title,
      change: moveAvailable(heatingOil) ? formatPercent(heatingOil?.changePercent, locale) : text.unavailable,
      source: heatingOil?.source ?? null,
      unit: commodityUnit(heatingOil),
      explanation: quoteAvailable(heatingOil) ? copy.heatingOilDescription : unavailable.body,
      available: quoteAvailable(heatingOil),
      tone: toneFor(heatingOil?.changePercent),
    },
    {
      key: 'sector-index',
      title: copy.sectorIndex,
      icon: BarChart3,
      item: sectorProxy ?? null,
      category: sectorProxy?.symbol ?? 'XLE',
      value: quoteAvailable(sectorProxy) ? formatMoney(sectorProxy?.price, sectorProxy?.currency, locale) : unavailable.title,
      change: moveAvailable(sectorProxy) ? formatPercent(sectorProxy?.changePercent, locale) : text.unavailable,
      source: sectorProxy?.source ?? null,
      unit: commodityUnit(sectorProxy),
      explanation: quoteAvailable(sectorProxy) ? copy.sectorDescription : unavailable.body,
      available: quoteAvailable(sectorProxy),
      tone: toneFor(sectorProxy?.changePercent),
    },
  ];

  if (loading) {
    return (
      <section className="energyPanel">
        <SectionHeader icon={BarChart3} title={text.snapshotTitle} subtitle={text.snapshotSubtitle} />
        <div className="energySummaryGrid">
          {Array.from({ length: 6 }, (_, index) => <div className="energyStatSkeleton" key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="energyPanel">
      <SectionHeader icon={BarChart3} title={text.snapshotTitle} subtitle={text.snapshotSubtitle} />
      <div className="energySummaryGrid">
        {insightCards.map(card => {
          const Icon = card.icon;
          return (
          <article key={card.key} className={`energySummaryCard energyTone-${card.tone}${card.available ? '' : ' energySummaryCardUnavailable'}`}>
            <div className="energySummaryHeader">
              <div className="energySummaryIdentity">
                <span className="energySummaryIcon"><Icon size={18} /></span>
                <div>
                  <strong>{card.title}</strong>
                  <span>{card.category}</span>
                </div>
              </div>
              <span className="energySummarySource" dir={card.source ? 'ltr' : 'auto'}>{card.source || unavailable.source}</span>
            </div>
            <div className="energySummaryValueRow">
              <b className="energySummaryValue" dir={card.available ? 'ltr' : 'auto'}>{card.value}</b>
              <span className="energySummaryChange" dir="ltr">{card.change}</span>
            </div>
            <p>{card.explanation}</p>
            {!card.available ? (
              <div className="energySummaryUnavailable">
                <strong>{unavailable.title}</strong>
                <span>{unavailable.body}</span>
              </div>
            ) : null}
            <div className="energySummaryMeta">
              {card.unit ? <span dir="ltr">{card.unit}</span> : null}
              <span>{unavailable.benchmark}: <i dir="ltr">{card.category}</i></span>
              <span>{text.change}: <i dir="ltr">{card.change}</i></span>
            </div>
          </article>
          );
        })}
      </div>
      {!hasData ? <EmptyState title={text.noMarketTitle} body={text.noMarketBody} icon={AlertTriangle} /> : null}
      <div className="energySummaryFooter">
        <small>{text.provider}: {availableCommodities[0]?.source ?? text.unavailable}</small>
        <small>{text.volume}: {tickerItems.length ? formatNumber(tickerItems.length, locale, 0) : 0}</small>
      </div>
    </section>
  );
}

function EnergyTicker({ items, loading, text, locale, lang }: {
  items: EnergyTickerItem[];
  loading: boolean;
  text: TextBundle;
  locale: string;
  lang: LangCode;
}) {
  return (
    <section className="energyTickerPanel" aria-label={text.marketData} data-direction="ltr">
      {loading ? (
        <div className="energyTickerViewport">
          <div className="energyTickerTrack">
            {Array.from({ length: 8 }, (_, index) => <span className="energyTickerSkeleton" key={index} />)}
          </div>
        </div>
      ) : (
        <StockTickerStrip
          ariaLabel={text.marketData}
          items={items.map(item => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            currency: item.currency,
            changePercent: item.changePercent,
            source: item.source,
            available: item.available,
            meta: categoryLabel(item.sector, lang),
          }))}
          locale={locale}
          unavailableLabel={text.unavailable}
          sourceLabel={text.source}
          className="energyTickerStrip"
          viewportClassName="energyTickerViewport"
          trackClassName="energyTickerTrack energyTickerMarquee"
          setClassName="energyTickerSet"
          direction="ltr"
          durationSeconds={42}
          emptyState={<EmptyState title={text.noMarketTitle} body={text.noMarketBody} icon={AlertTriangle} />}
        />
      )}
    </section>
  );
}

function EnergySectorPerformance({ items, text, lang, locale }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
}) {
  const rows = useMemo(() => {
    const groups = new Map<string, EnergyTickerItem[]>();
    items.forEach(item => {
      const key = item.sector || 'all';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries()).map(([key, stocks]) => {
      const avg = stocks.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / stocks.length;
      return { key, stocks, avg };
    }).sort((a, b) => b.avg - a.avg);
  }, [items]);

  return (
    <section className="energyPanel">
      <SectionHeader icon={Layers3} title={text.sectorPerformance} subtitle={text.snapshotSubtitle} />
      {rows.length > 0 ? (
        <div className="energySectorRows">
          {rows.map(row => {
            const tone = toneFor(row.avg);
            const width = Math.min(100, Math.max(8, Math.abs(row.avg) * 10));
            return (
              <article key={row.key} className={`energySectorRow energyTone-${tone}`}>
                <div>
                  <strong>{categoryLabel(row.key, lang)}</strong>
                  <span>{formatNumber(row.stocks.length, locale, 0)} {text.company}</span>
                </div>
                <div className="energySectorMeter" aria-hidden="true">
                  <span style={{ width: `${width}%` }} />
                </div>
                <b dir="ltr">{formatPercent(row.avg, locale)}</b>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title={text.noCompaniesTitle} body={text.noCompaniesBody} icon={Building2} />
      )}
    </section>
  );
}

function EnergyMarketMovers({ movers, commodities, text, locale }: {
  movers: StockCategoryMoversResponse | null;
  commodities: EnergyCommodity[];
  text: TextBundle;
  locale: string;
}) {
  const gainers = movers?.ok ? movers.data.topGainers.slice(0, 6) : [];
  const losers = movers?.ok ? movers.data.topLosers.slice(0, 6) : [];
  const commodityRows = commodities
    .filter(item => item.available)
    .slice()
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, 4);
  const renderRows = (rows: StockCategoryMoverItem[], _tone: Tone) => (
    rows.length > 0 ? rows.map(row => (
      <div className={`energyMoverRow energyTone-${toneFor(row.changePercent)}`} key={row.symbol}>
        <AssetIdentity symbol={row.symbol} name={row.name} assetType="stock" size="sm" decorative />
        <span dir="ltr">{row.symbol}</span>
        <strong>{row.name}</strong>
        <b dir="ltr">{formatMoney(row.price, row.currency, locale)}</b>
        <em dir="ltr">{formatPercent(row.changePercent, locale)}</em>
      </div>
    )) : <span>{text.unavailable}</span>
  );
  const renderCommodityRows = () => (
    commodityRows.length > 0 ? commodityRows.map(row => (
      <div className={`energyMoverRow energyTone-${toneFor(row.changePercent)}`} key={row.symbol}>
        <AssetIdentity symbol={row.symbol} name={row.displayName} assetType="commodity" size="sm" decorative />
        <span dir="ltr">{row.symbol}</span>
        <strong>{row.displayName}</strong>
        <b dir="ltr">{formatMoney(row.price, row.currency, locale)}</b>
        <em dir="ltr">{formatPercent(row.changePercent, locale)}</em>
      </div>
    )) : <span>{text.commodityUnavailable}</span>
  );

  return (
    <section className="energyPanel">
      <SectionHeader icon={Activity} title={text.marketMovers} subtitle={text.commodityVsEquityBody} />
      <div className="energyMoversGrid">
        <article className="energyMoverList">
          <h3><TrendingUp size={17} />{text.topGainers}</h3>
          {renderRows(gainers, 'positive')}
        </article>
        <article className="energyMoverList">
          <h3><TrendingDown size={17} />{text.topLosers}</h3>
          {renderRows(losers, 'negative')}
        </article>
        <article className="energyMoverList">
          <h3><Droplets size={17} />{text.commodityMoves}</h3>
          {renderCommodityRows()}
        </article>
      </div>
    </section>
  );
}

function MethodologyDetails({ text }: { text: TextBundle }) {
  return (
    <details className="energyMethodology">
      <summary><Info size={16} />{text.featuredMethodology}<ChevronDown size={15} /></summary>
      <div>
        <strong>{text.methodologyTitle}</strong>
        <p>{text.methodologyBody}</p>
      </div>
    </details>
  );
}

function FeaturedEnergyCompanies({ items, text, lang, locale, limit = 6 }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
  limit?: number;
}) {
  const featured = useMemo(() => {
    return items
      .filter(item => Number.isFinite(item.price))
      .slice()
      .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
      .slice(0, limit);
  }, [items, limit]);

  return (
    <section className="energyPanel">
      <SectionHeader
        icon={Sparkles}
        title={text.featuredCompanies}
        subtitle={text.methodologyBody}
        action={<MethodologyDetails text={text} />}
      />
      {featured.length > 0 ? (
        <div className="energyFeaturedGrid">
          {featured.map(item => {
            const tone = toneFor(item.changePercent);
            return (
              <article className={`energyCompanyFeature energyTone-${tone}`} key={item.symbol}>
                <header>
                  <AssetIdentity symbol={item.symbol} name={item.name} assetType="stock" size="md" decorative />
                  <div>
                    <strong>{item.name}</strong>
                    <small dir="ltr">{item.symbol}</small>
                  </div>
                </header>
                <div className="energyCompanyMetrics">
                  <span>{text.price}<b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b></span>
                  <span>{text.change}<b dir="ltr">{formatPercent(item.changePercent, locale)}</b></span>
                </div>
                <p>{categoryLabel(item.sector, lang)}</p>
                <footer>
                  <DataBadge tone="neutral">{item.source}</DataBadge>
                  <DataBadge tone="warning">{text.delayedData}</DataBadge>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title={text.noCompaniesTitle} body={text.noCompaniesBody} icon={Building2} />
      )}
    </section>
  );
}

function ActiveFilterChips({ chips, onClear, text }: {
  chips: Array<{ key: string; label: string; onRemove: () => void }>;
  onClear: () => void;
  text: TextBundle;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="energyActiveFilters" aria-label={text.activeFilters}>
      {chips.map(chip => (
        <button type="button" key={chip.key} onClick={chip.onRemove}>
          {chip.label}
          <X size={14} />
        </button>
      ))}
      <button type="button" className="clear" onClick={onClear}>{text.clearFilters}</button>
    </div>
  );
}

function EnergyCompanyFilters({ query, setQuery, category, setCategory, sort, setSort, text, lang, count, onClear }: {
  query: string;
  setQuery: (value: string) => void;
  category: EnergyCompanyCategory;
  setCategory: (value: EnergyCompanyCategory) => void;
  sort: CompanySort;
  setSort: (value: CompanySort) => void;
  text: TextBundle;
  lang: LangCode;
  count: number;
  onClear: () => void;
}) {
  const chips = [
    query ? { key: 'query', label: query, onRemove: () => setQuery('') } : null,
    category !== 'all' ? { key: 'sector', label: categoryLabel(category, lang), onRemove: () => setCategory('all') } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip));

  return (
    <div className="energyFilterPanel">
      <div className="energyFilterGrid">
        <label>
          <span>{text.search}</span>
          <div className="energySearchField">
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchCompany} />
          </div>
        </label>
        <label>
          <span>{text.sector}</span>
          <select value={category} onChange={event => setCategory(event.target.value as EnergyCompanyCategory)}>
            {Object.entries(COMPANY_CATEGORY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label[lang]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{text.sort}</span>
          <select value={sort} onChange={event => setSort(event.target.value as CompanySort)}>
            <option value="change-desc">{text.strongestMove}</option>
            <option value="change-asc">{text.change}</option>
            <option value="price-desc">{text.highestPrice}</option>
            <option value="name">{text.nameSort}</option>
          </select>
        </label>
        <div className="energyResultPill">
          <SlidersHorizontal size={17} />
          {text.resultCount}: <b dir="ltr">{count}</b>
        </div>
      </div>
      <ActiveFilterChips chips={chips} onClear={onClear} text={text} />
    </div>
  );
}

function EnergyCompanyCards({ items, text, lang, locale, limit }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
  limit?: number;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) {
    return <EmptyState title={text.noCompaniesTitle} body={text.noCompaniesBody} icon={Building2} />;
  }

  return (
    <div className="energyCompanyCards">
      {shown.map(item => (
        <article className={`energyCompanyFeature energyTone-${toneFor(item.changePercent)}`} key={item.symbol}>
          <header>
            <AssetIdentity symbol={item.symbol} name={item.name} assetType="stock" size="md" decorative />
            <div>
              <strong>{item.name}</strong>
              <small dir="ltr">{item.symbol}</small>
              <small>{categoryLabel(item.sector, lang)}</small>
            </div>
          </header>
          <div className="energyCompanyMetrics">
            <span>
              <span>{text.price}</span>
              <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
            </span>
            <span>
              <span>{text.change}</span>
              <b dir="ltr">{formatPercent(item.changePercent, locale)}</b>
            </span>
            <span>
              <span>{text.market}</span>
              <b>{item.source}</b>
            </span>
            <span>
              <span>{text.currency}</span>
              <b dir="ltr">{item.currency}</b>
            </span>
          </div>
          <div className="energyCompanyStatus">
            <DataBadge tone={item.delayed ? 'warning' : toneFor(item.changePercent)}>{item.delayed ? text.delayedData : text.connected}</DataBadge>
            <DataBadge tone="neutral">{item.source}</DataBadge>
          </div>
        </article>
      ))}
    </div>
  );
}

function EnergyCompanyGridFallback({ items, text, lang, locale, count, onClear }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
  count: number;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return <EmptyState title={text.noCompaniesTitle} body={text.noCompaniesBody} icon={Building2} />;
  }

  return (
    <EnergyCompanyCards items={items} text={text} lang={lang} locale={locale} />
  );
}

function EnergyCompanyExplorer({ items, text, lang, locale, query, setQuery, category, setCategory, sort, setSort }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
  query: string;
  setQuery: (value: string) => void;
  category: EnergyCompanyCategory;
  setCategory: (value: EnergyCompanyCategory) => void;
  sort: CompanySort;
  setSort: (value: CompanySort) => void;
}) {
  const debouncedQuery = useDebouncedValue(query, 220);
  const filtered = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    return items
      .filter(item => category === 'all' || item.sector === category || (category === 'solar' && ['FSLR', 'ENPH'].includes(item.symbol)))
      .filter(item => !normalized || [item.name, item.symbol, item.sector].join(' ').toLowerCase().includes(normalized))
      .slice()
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'price-desc') return (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY);
        if (sort === 'change-asc') return (a.changePercent ?? 0) - (b.changePercent ?? 0);
        return Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0);
      });
  }, [category, debouncedQuery, items, sort]);

  useEffect(() => {
    updateUrl({
      companyQuery: query,
      sector: category,
      companySort: sort,
    });
  }, [category, query, sort]);

  return (
    <section className="energyPanel">
      <SectionHeader icon={Building2} title={text.companyExplorerTitle} subtitle={text.companyExplorerSubtitle} />
      <EnergyCompanyFilters
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        sort={sort}
        setSort={setSort}
        text={text}
        lang={lang}
        count={filtered.length}
        onClear={() => {
          setQuery('');
          setCategory('all');
          setSort('change-desc');
        }}
      />
      <p className="energyMobileHint">{text.mobileCompanyHint}</p>
      <EnergyCompanyCards items={filtered} text={text} lang={lang} locale={locale} />
    </section>
  );
}

function EnergyNewsFilters({ query, setQuery, category, setCategory, period, setPeriod, sort, setSort, text, lang, count, onClear }: {
  query: string;
  setQuery: (value: string) => void;
  category: NewsCategory;
  setCategory: (value: NewsCategory) => void;
  period: TimeFilter;
  setPeriod: (value: TimeFilter) => void;
  sort: NewsSort;
  setSort: (value: NewsSort) => void;
  text: TextBundle;
  lang: LangCode;
  count: number;
  onClear: () => void;
}) {
  const chips = [
    query ? { key: 'q', label: query, onRemove: () => setQuery('') } : null,
    category !== 'all' ? { key: 'category', label: NEWS_CATEGORY_META[category].label[lang], onRemove: () => setCategory('all') } : null,
    period !== 'all' ? { key: 'period', label: period === 'today' ? text.today : period === 'week' ? text.week : text.month, onRemove: () => setPeriod('all') } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip));

  return (
    <div className="energyFilterPanel">
      <div className="energyFilterGrid energyFilterGridNews">
        <label>
          <span>{text.search}</span>
          <div className="energySearchField">
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchNews} />
          </div>
        </label>
        <label>
          <span>{text.category}</span>
          <select value={category} onChange={event => setCategory(event.target.value as NewsCategory)}>
            {Object.entries(NEWS_CATEGORY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label[lang]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{text.period}</span>
          <select value={period} onChange={event => setPeriod(event.target.value as TimeFilter)}>
            <option value="all">{text.all}</option>
            <option value="today">{text.today}</option>
            <option value="week">{text.week}</option>
            <option value="month">{text.month}</option>
          </select>
        </label>
        <label>
          <span>{text.sort}</span>
          <select value={sort} onChange={event => setSort(event.target.value as NewsSort)}>
            <option value="latest">{text.latest}</option>
            <option value="oldest">{text.oldest}</option>
            <option value="company-move">{text.strongestMove}</option>
          </select>
        </label>
        <div className="energyResultPill">
          <Filter size={17} />
          {text.resultCount}: <b dir="ltr">{count}</b>
        </div>
      </div>
      <ActiveFilterChips chips={chips} onClear={onClear} text={text} />
    </div>
  );
}

function NewsCard({ item, text, locale, compact = false }: {
  item: EnergyNewsItem;
  text: TextBundle;
  locale: string;
  compact?: boolean;
}) {
  const url = safeExternalUrl(item.url);
  const title = displayTitle(item);
  const summary = displaySummary(item);
  const tone = toneFor(item.changePercent);

  return (
    <article className={`energyNewsCard${compact ? ' compact' : ''}`}>
      <header>
        <div>
          <DataBadge tone="neutral">{item.source}</DataBadge>
          {item.isTranslated ? <DataBadge tone="warning">{text.translated}</DataBadge> : null}
        </div>
        <time dateTime={item.publishedAt}>{relativeDate(item.publishedAt, locale)}</time>
      </header>
      <h3 dir="auto">{title}</h3>
      {summary ? <p dir="auto">{summary}</p> : null}
      <div className="energyNewsMeta">
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {item.companyName ? <span>{item.companyName}</span> : null}
        {typeof item.price === 'number' ? <span dir="ltr">{formatMoney(item.price, 'USD', locale)}</span> : null}
        {typeof item.changePercent === 'number' ? <span className={`energyTone-${tone}`} dir="ltr">{formatPercent(item.changePercent, locale)}</span> : null}
      </div>
      <footer>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow">
            {text.readArticle}
            <ExternalLink size={15} />
          </a>
        ) : (
          <span>{text.noLink}</span>
        )}
      </footer>
    </article>
  );
}

function EnergyNewsFeed({ items, loading, error, text, locale, query, setQuery, category, setCategory, period, setPeriod, sort, setSort, full = true }: {
  items: EnergyNewsItem[];
  loading: boolean;
  error: string;
  text: TextBundle;
  locale: string;
  query: string;
  setQuery: (value: string) => void;
  category: NewsCategory;
  setCategory: (value: NewsCategory) => void;
  period: TimeFilter;
  setPeriod: (value: TimeFilter) => void;
  sort: NewsSort;
  setSort: (value: NewsSort) => void;
  full?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 240);

  const filtered = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    return dedupeNews(items)
      .filter(item => !normalized || newsHaystack(item).includes(normalized))
      .filter(item => itemMatchesNewsCategory(item, category))
      .filter(item => itemMatchesTime(item, period))
      .slice()
      .sort((a, b) => {
        if (sort === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        if (sort === 'company-move') return Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0);
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [category, debouncedQuery, items, period, sort]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
    updateUrl({ q: query, category, period, sort });
  }, [category, period, query, sort]);

  const shown = full ? filtered.slice(0, visibleCount) : filtered.slice(0, 6);

  return (
    <section className="energyPanel">
      <SectionHeader icon={Newspaper} title={full ? text.newsTitle : text.latestNewsPreview} subtitle={text.newsSubtitle} />
      {full ? (
        <EnergyNewsFilters
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          period={period}
          setPeriod={setPeriod}
          sort={sort}
          setSort={setSort}
          text={text}
          lang={locale.startsWith('ar') ? 'ar' : locale.startsWith('fr') ? 'fr' : 'en'}
          count={filtered.length}
          onClear={() => {
            setQuery('');
            setCategory('all');
            setPeriod('all');
            setSort('latest');
          }}
        />
      ) : null}
      {loading ? (
        <LoadingSkeleton rows={full ? 6 : 3} />
      ) : error ? (
        <EmptyState title={text.providerError} body={text.noNewsBody} icon={AlertTriangle} />
      ) : shown.length > 0 ? (
        <div className={full ? 'energyNewsGrid' : 'energyNewsPreviewGrid'}>
          {shown.map(item => <NewsCard key={item.id || item.url || displayTitle(item)} item={item} text={text} locale={locale} compact={!full} />)}
        </div>
      ) : (
        <EmptyState title={text.noNewsTitle} body={text.noNewsBody} icon={Newspaper} />
      )}
      {full && filtered.length > visibleCount ? (
        <div className="energyLoadMore">
          <span>{text.showing}: <b dir="ltr">{visibleCount}</b> / <b dir="ltr">{filtered.length}</b></span>
          <button type="button" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>{text.loadMore}</button>
        </div>
      ) : null}
    </section>
  );
}

function EnergyCalendar({ text, locale, lang, newsItems, newsLoading, newsError }: {
  text: TextBundle;
  locale: string;
  lang: LangCode;
  newsItems: EnergyNewsItem[];
  newsLoading: boolean;
  newsError: string;
}) {
  const [calendarEvents, setCalendarEvents] = useState<EnergyCalendarEventCard[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [calendarStatus, setCalendarStatus] = useState('');
  const [calendarProvider, setCalendarProvider] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCalendar = async () => {
      setCalendarLoading(true);
      setCalendarError('');
      try {
        const params = new URLSearchParams({
          from: isoDateOffset(-7),
          to: isoDateOffset(21),
        });
        const result = await fetchJson<EconomicCalendarApiResponse>(`/api/economic-calendar?${params.toString()}`);
        if (cancelled) return;
        const records = result.data ?? result.items ?? result.events ?? [];
        setCalendarEvents(normalizeEconomicCalendarEvents(records, lang, text));
        setCalendarProvider(result.provider ?? null);
        setCalendarStatus(result.status ?? '');
        if (result.status && result.status !== 'success') {
          setCalendarError(result.messageCode || result.status);
        }
      } catch {
        if (!cancelled) {
          setCalendarEvents([]);
          setCalendarProvider(null);
          setCalendarStatus('provider_error');
          setCalendarError('provider_error');
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    };

    void loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [lang, text]);

  const newsEvents = useMemo(
    () => newsToCalendarEvents(newsItems, lang, text),
    [lang, newsItems, text],
  );
  const events = useMemo(
    () => sortEnergyCalendarEvents([...calendarEvents, ...newsEvents]).slice(0, ENERGY_CALENDAR_LIMIT),
    [calendarEvents, newsEvents],
  );
  const isLoading = calendarLoading || (newsLoading && newsItems.length === 0);
  const hasProviderIssue = Boolean(calendarError && calendarStatus !== 'success');
  const showProviderNotice = hasProviderIssue && newsEvents.length > 0;

  return (
    <section className="energyPanel">
      <SectionHeader icon={CalendarDays} title={text.calendarTitle} subtitle={text.calendarSubtitle} />
      <div className="energyCalendarShell">
        {showProviderNotice ? (
          <div className="energyCalendarNotice">
            <AlertTriangle size={17} />
            <span>{text.calendarProviderNotice}</span>
          </div>
        ) : null}
        {isLoading ? (
          <div className="energyCalendarList" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }, (_, index) => <span className="energyCalendarSkeleton" key={index} />)}
          </div>
        ) : events.length > 0 ? (
          <div className="energyCalendarList">
            {events.map(event => (
              <article className={`energyCalendarEvent energyTone-${event.impact === 'high' ? 'warning' : 'neutral'}`} key={event.id}>
                <div className="energyCalendarDate">
                  <strong>{relativeDate(event.dateTime, locale)}</strong>
                  <span>{formatDateTime(event.dateTime, locale)}</span>
                </div>
                <div className="energyCalendarBody">
                  <div>
                    <DataBadge tone={event.status === 'upcoming' ? 'positive' : 'neutral'}>
                      {event.status === 'upcoming' ? text.calendarUpcoming : text.calendarRecent}
                    </DataBadge>
                    <DataBadge tone={event.impact === 'high' ? 'warning' : 'neutral'}>
                      {impactLabel(event.impact, text)}
                    </DataBadge>
                    <DataBadge>{event.category}</DataBadge>
                  </div>
                  <h3 dir="auto">{event.title}</h3>
                  <p dir="auto">{event.description}</p>
                </div>
                <footer>
                  <span>{text.source}: <b>{event.source}</b></span>
                  {calendarProvider ? <span>{text.provider}: <b dir="ltr">{calendarProvider}</b></span> : null}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={hasProviderIssue || newsError ? text.providerError : text.noCalendarTitle}
            body={hasProviderIssue || newsError ? `${text.noCalendarBody} ${text.eventProviderMissing}` : text.noCalendarBody}
          />
        )}
      </div>
    </section>
  );
}

function EnergyStrategyComparison({ text, lang, preview = false }: { text: TextBundle; lang: LangCode; preview?: boolean }) {
  return (
    <section className="energyPanel">
      <SectionHeader icon={ShieldCheck} title={text.comparisonTitle} subtitle={text.comparisonBody} />
      <div className="energyComparison">
        <div className="energyComparisonHead">
          <strong>{text.traditional}</strong>
          <strong>{text.clean}</strong>
        </div>
        {STRATEGY_ROWS.slice(0, preview ? 2 : STRATEGY_ROWS.length).map(row => (
          <div className="energyComparisonRow" key={row.label.en}>
            <span>{row.label[lang]}</span>
            <p>{row.traditional[lang]}</p>
            <p>{row.clean[lang]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EnergyEducationGuide({ text, lang, preview = false }: {
  text: TextBundle;
  lang: LangCode;
  preview?: boolean;
}) {
  const lessons = preview ? EDUCATION_LESSONS.slice(0, 3) : EDUCATION_LESSONS;
  return (
    <section className="energyPanel">
      <SectionHeader icon={BookOpen} title={preview ? text.educationPreview : text.educationTitle} subtitle={text.educationSubtitle} />
      <div className="energyLessons">
        {lessons.map(lesson => (
          <details key={lesson.id}>
            <summary>
              <span>{lesson.title[lang]}</span>
              <ChevronDown size={16} />
            </summary>
            <p>{lesson.body[lang]}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CommodityEquityExplainer({ text }: { text: TextBundle }) {
  return (
    <section className="energyPanel energyExplainer">
      <SectionHeader icon={Info} title={text.commodityVsEquityTitle} subtitle={text.commodityVsEquityBody} />
      <div className="energyExplainerGrid">
        <article>
          <span><Droplets size={18} /></span>
          <strong>{text.commodityStripTitle}</strong>
          <p>{text.unit} · {text.currency} · {text.delayedData}</p>
        </article>
        <article>
          <span><Building2 size={18} /></span>
          <strong>{text.companyExplorerTitle}</strong>
          <p>{text.price} · {text.change} · {text.source}</p>
        </article>
      </div>
    </section>
  );
}

function ThematicTab({ type, tickerItems, commodityItems, newsItems, newsLoading, newsError, text, lang, locale, setActiveTab }: {
  type: 'oil-gas' | 'renewables' | 'nuclear';
  tickerItems: EnergyTickerItem[];
  commodityItems: EnergyCommodity[];
  newsItems: EnergyNewsItem[];
  newsLoading: boolean;
  newsError: string;
  text: TextBundle;
  lang: LangCode;
  locale: string;
  setActiveTab: (tab: TabId) => void;
}) {
  const config = {
    'oil-gas': {
      title: text.oilGasTitle,
      subtitle: text.oilGasSubtitle,
      icon: Droplets,
      categories: ['integrated_oil_gas', 'exploration_production', 'oil_services', 'pipelines', 'natural_gas'],
      commodityFilter: (item: EnergyCommodity) => ['brent', 'wti', 'natural_gas', 'gasoline', 'heating_oil'].includes(item.category),
      newsCategory: 'oil' as NewsCategory,
    },
    renewables: {
      title: text.renewablesTitle,
      subtitle: text.renewablesSubtitle,
      icon: Leaf,
      categories: ['renewables', 'solar'],
      commodityFilter: (item: EnergyCommodity) => ['renewables_etf', 'solar_etf'].includes(item.category),
      newsCategory: 'renewables' as NewsCategory,
    },
    nuclear: {
      title: text.nuclearTitle,
      subtitle: text.nuclearSubtitle,
      icon: Zap,
      categories: ['nuclear'],
      commodityFilter: (item: EnergyCommodity) => item.category === 'uranium',
      newsCategory: 'nuclear' as NewsCategory,
    },
  }[type];
  const tabCompanies = tickerItems.filter(item => config.categories.includes(item.sector) || (type === 'renewables' && ['FSLR', 'ENPH', 'NEE', 'BEP', 'PLUG'].includes(item.symbol)));
  const tabCommodities = commodityItems.filter(config.commodityFilter);
  const tabNews = dedupeNews(newsItems).filter(item => itemMatchesNewsCategory(item, config.newsCategory)).slice(0, 6);

  return (
    <div className="energyTabStack">
      <section className="energyPanel">
        <SectionHeader icon={config.icon} title={config.title} subtitle={config.subtitle} />
        {tabCommodities.length > 0 ? (
          <div className="energyCommodityGrid compact">
            {tabCommodities.map(item => (
              <article className={`energyCommodityCard energyTone-${toneFor(item.changePercent)}`} key={item.symbol}>
                <div>
                  <strong>{commodityLabel(item, lang)}</strong>
                  <small dir="ltr">{item.symbol}</small>
                </div>
                {item.available ? <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b> : <b>{text.unavailable}</b>}
                <em dir="ltr">{formatPercent(item.changePercent, locale)}</em>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title={type === 'nuclear' ? text.commodityUnavailable : text.noMarketTitle} body={type === 'nuclear' ? text.nuclearSubtitle : text.noMarketBody} icon={AlertTriangle} />
        )}
      </section>
      <FeaturedEnergyCompanies items={tabCompanies} text={text} lang={lang} locale={locale} limit={4} />
      <EnergyNewsFeed
        items={tabNews}
        loading={newsLoading}
        error={newsError}
        text={text}
        locale={locale}
        query=""
        setQuery={() => undefined}
        category="all"
        setCategory={() => undefined}
        period="all"
        setPeriod={() => undefined}
        sort="latest"
        setSort={() => undefined}
        full={false}
      />
      <button className="energyPrimaryButton energyStandaloneAction" type="button" onClick={() => setActiveTab('companies')}>{text.viewAll}</button>
    </div>
  );
}

export function EnergyNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const initialUrlState = readUrlState();

  const [activeTab, setActiveTabState] = useState<TabId>(initialUrlState.tab);
  const [tickerItems, setTickerItems] = useState<EnergyTickerItem[]>([]);
  const [commodityItems, setCommodityItems] = useState<EnergyCommodity[]>([]);
  const [newsItems, setNewsItems] = useState<EnergyNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [commodityUpdatedAt, setCommodityUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [marketLoaded, setMarketLoaded] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [moversLoaded, setMoversLoaded] = useState(false);
  const [marketLoading, setMarketLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [moversLoading, setMoversLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [newsError, setNewsError] = useState('');
  const [companyQuery, setCompanyQuery] = useState(initialUrlState.companyQuery);
  const [companyCategory, setCompanyCategory] = useState<EnergyCompanyCategory>(initialUrlState.companyCategory);
  const [companySort, setCompanySort] = useState<CompanySort>(initialUrlState.companySort);
  const [newsQuery, setNewsQuery] = useState(initialUrlState.newsQuery);
  const [newsCategory, setNewsCategory] = useState<NewsCategory>(initialUrlState.newsCategory);
  const [newsPeriod, setNewsPeriod] = useState<TimeFilter>(initialUrlState.newsPeriod);
  const [newsSort, setNewsSort] = useState<NewsSort>(initialUrlState.newsSort);

  useEffect(() => {
    document.body.classList.add('energy-route-active');
    return () => document.body.classList.remove('energy-route-active');
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    updateUrl({ tab }, 'push');
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const state = readUrlState();
      setActiveTabState(state.tab);
      setCompanyQuery(state.companyQuery);
      setCompanyCategory(state.companyCategory);
      setCompanySort(state.companySort);
      setNewsQuery(state.newsQuery);
      setNewsCategory(state.newsCategory);
      setNewsPeriod(state.newsPeriod);
      setNewsSort(state.newsSort);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    window.scrollTo({ left: 0, top: window.scrollY });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [activeTab]);

  const loadMarket = useCallback(async (showLoader = true) => {
    if (showLoader) setMarketLoading(true);
    setMarketError('');
    const [tickerResult, commodityResult] = await Promise.allSettled([
      fetchJson<EnergyTickerResponse>('/api/energy-stocks/ticker'),
      fetchJson<EnergyCommodityResponse>('/api/market/energy/commodities'),
    ]);
    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
    } else {
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(text.providerError);
    }
    if (commodityResult.status === 'fulfilled' && commodityResult.value.ok) {
      setCommodityItems(commodityResult.value.items);
      setCommodityUpdatedAt(commodityResult.value.updated_at);
    } else {
      setCommodityItems([]);
      setCommodityUpdatedAt('');
      setMarketError(text.providerError);
    }
    setMarketLoaded(true);
    setMarketLoading(false);
  }, [text.providerError]);

  const loadNews = useCallback(async (showLoader = true) => {
    if (showLoader) setNewsLoading(true);
    setNewsError('');
    try {
      const result = await fetchJson<EnergyNewsResponse>(`/api/energy-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=96`);
      if (result.success) {
        setNewsItems(dedupeNews(result.items));
        setNewsUpdatedAt(result.lastUpdated);
      } else {
        setNewsItems([]);
        setNewsUpdatedAt('');
        setNewsError(text.providerError);
      }
    } catch {
      setNewsItems([]);
      setNewsUpdatedAt('');
      setNewsError(text.providerError);
    } finally {
      setNewsLoaded(true);
      setNewsLoading(false);
    }
  }, [activeLang, text.providerError]);

  const loadMovers = useCallback(async (showLoader = true) => {
    if (showLoader) setMoversLoading(true);
    try {
      const result = await fetchJson<StockCategoryMoversResponse>('/api/energy-stocks/movers?limit=5');
      setMovers(result);
      setMoversUpdatedAt(result.ok ? result.updated_at : '');
    } catch {
      setMovers(null);
      setMoversUpdatedAt('');
    } finally {
      setMoversLoaded(true);
      setMoversLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarket(true);
  }, [loadMarket]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'news' || activeTab === 'calendar' || activeTab === 'oil-gas' || activeTab === 'renewables' || activeTab === 'nuclear') {
      if (!newsLoaded) void loadNews(true);
    }
    if (activeTab === 'overview' || activeTab === 'companies') {
      if (!moversLoaded) void loadMovers(true);
    }
  }, [activeTab, loadMovers, loadNews, moversLoaded, newsLoaded]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadMarket(false);
      if (newsLoaded) void loadNews(false);
      if (moversLoaded) void loadMovers(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadMarket, loadMovers, loadNews, moversLoaded, newsLoaded]);

  const refreshCurrent = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadMarket(false);
    if (activeTab === 'overview' || activeTab === 'news' || activeTab === 'oil-gas' || activeTab === 'renewables' || activeTab === 'nuclear') await loadNews(false);
    if (activeTab === 'overview' || activeTab === 'companies') await loadMovers(false);
    setRefreshing(false);
  }, [activeTab, loadMarket, loadMovers, loadNews, refreshing]);

  const lastUpdated = useMemo(
    () => newestTimestamp([tickerUpdatedAt, commodityUpdatedAt, newsUpdatedAt, moversUpdatedAt]),
    [commodityUpdatedAt, moversUpdatedAt, newsUpdatedAt, tickerUpdatedAt],
  );
  const dataSources = useMemo<string[]>(() => {
    const sources = new Set<string>();
    tickerItems.forEach(item => {
      if (item.source) sources.add(item.source);
    });
    commodityItems.forEach(item => {
      if (item.source) sources.add(item.source);
    });
    return Array.from(sources).slice(0, 3);
  }, [commodityItems, tickerItems]);

  const renderTab = () => {
    if (activeTab === 'oil-gas' || activeTab === 'renewables' || activeTab === 'nuclear') {
      return (
        <ThematicTab
          type={activeTab}
          tickerItems={tickerItems}
          commodityItems={commodityItems}
          newsItems={newsItems}
          newsLoading={newsLoading}
          newsError={newsError}
          text={text}
          lang={activeLang}
          locale={locale}
          setActiveTab={setActiveTab}
        />
      );
    }
    if (activeTab === 'companies') {
      return (
        <div className="energyTabStack">
          {moversLoading ? <LoadingSkeleton rows={3} /> : <EnergyMarketMovers movers={movers} commodities={commodityItems} text={text} locale={locale} />}
          <EnergyCompanyExplorer
            items={tickerItems}
            text={text}
            lang={activeLang}
            locale={locale}
            query={companyQuery}
            setQuery={setCompanyQuery}
            category={companyCategory}
            setCategory={setCompanyCategory}
            sort={companySort}
            setSort={setCompanySort}
          />
        </div>
      );
    }
    if (activeTab === 'calendar') {
      return (
        <EnergyCalendar
          text={text}
          locale={locale}
          lang={activeLang}
          newsItems={newsItems}
          newsLoading={newsLoading}
          newsError={newsError}
        />
      );
    }
    if (activeTab === 'news') {
      return (
        <EnergyNewsFeed
          items={newsItems}
          loading={newsLoading}
          error={newsError}
          text={text}
          locale={locale}
          query={newsQuery}
          setQuery={setNewsQuery}
          category={newsCategory}
          setCategory={setNewsCategory}
          period={newsPeriod}
          setPeriod={setNewsPeriod}
          sort={newsSort}
          setSort={setNewsSort}
        />
      );
    }
    if (activeTab === 'education') {
      return (
        <div className="energyTabStack">
          <EnergyStrategyComparison text={text} lang={activeLang} />
          <EnergyEducationGuide text={text} lang={activeLang} />
        </div>
      );
    }

    return (
      <div className="energyTabStack">
        <EnergyMarketSnapshot tickerItems={tickerItems} commodityItems={commodityItems} loading={marketLoading} text={text} locale={locale} />
        <EnergyCommodityStrip items={commodityItems} loading={marketLoading} text={text} lang={activeLang} locale={locale} compact />
        <CommodityEquityExplainer text={text} />
        <div className="energyOverviewGrid">
          <EnergySectorPerformance items={tickerItems} text={text} lang={activeLang} locale={locale} />
          {moversLoading ? <section className="energyPanel"><LoadingSkeleton rows={4} /></section> : <EnergyMarketMovers movers={movers} commodities={commodityItems} text={text} locale={locale} />}
        </div>
        <FeaturedEnergyCompanies items={tickerItems} text={text} lang={activeLang} locale={locale} />
        <div className="energyOverviewGrid">
          <EnergyCalendar
            text={text}
            locale={locale}
            lang={activeLang}
            newsItems={newsItems}
            newsLoading={newsLoading}
            newsError={newsError}
          />
          <EnergyStrategyComparison text={text} lang={activeLang} preview />
        </div>
        <EnergyNewsFeed
          items={newsItems}
          loading={newsLoading}
          error={newsError}
          text={text}
          locale={locale}
          query=""
          setQuery={() => undefined}
          category="all"
          setCategory={() => undefined}
          period="all"
          setPeriod={() => undefined}
          sort="latest"
          setSort={() => undefined}
          full={false}
        />
        <EnergyEducationGuide text={text} lang={activeLang} preview />
      </div>
    );
  };

  return (
    <div className="energyShell" data-dir={dir} dir={dir}>
      <Sidebar />
      <main className="energyWorkspace" dir={dir}>
        <div className="energyContainer">
          <EnergyCenterHeader
            text={text}
            locale={locale}
            lastUpdated={lastUpdated}
            loading={marketLoading}
            refreshing={refreshing}
            onRefresh={() => void refreshCurrent()}
            hasMarketData={marketLoaded && (tickerItems.length > 0 || commodityItems.some(item => item.available))}
            onViewReports={() => setActiveTab('news')}
            dataSources={dataSources}
          />
          <EnergyTicker items={tickerItems} loading={marketLoading} text={text} locale={locale} lang={activeLang} />
          {marketError ? <div className="energyInlineWarning"><AlertTriangle size={17} />{marketError}</div> : null}
          <EnergyCenterTabs activeTab={activeTab} setActiveTab={setActiveTab} text={text} />
          {renderTab()}
          <section className="energyDisclaimer">
            <Info size={20} />
            <div>
              <h2>{text.disclaimerTitle}</h2>
              <p>{text.disclaimerBody}</p>
              <p>{text.sourceNote}</p>
            </div>
          </section>
        </div>
      </main>


    </div>
  );
}

export default EnergyNewsPage;

