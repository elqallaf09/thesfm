'use client';

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BatteryCharging,
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
  Globe2,
  Info,
  Landmark,
  Layers3,
  Leaf,
  LineChart,
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
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
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

const NEWS_PAGE_SIZE = 12;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const ENERGY_ROUTE = '/energy-stocks';

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
    readArticle: 'قراءة الخبر',
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
    tableAction: 'إجراء',
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
    loadingMarket: 'Loading energy data...',
    providerError: 'Part of the data could not be refreshed. Other sections remain usable where available.',
    totalCompanies: 'Available companies',
    risingStocks: 'Rising stocks',
    fallingStocks: 'Falling stocks',
    avgMove: 'Average stock move',
    brentMove: 'Brent move',
    wtiMove: 'WTI move',
    gasMove: 'Natural gas move',
    cleanEnergyProxy: 'Clean-energy proxy',
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
    loadingMarket: 'Chargement des données énergie...',
    providerError: 'Une partie des données n’a pas pu être actualisée. Les autres sections restent disponibles.',
    totalCompanies: 'Sociétés disponibles',
    risingStocks: 'Actions en hausse',
    fallingStocks: 'Actions en baisse',
    avgMove: 'Mouvement moyen',
    brentMove: 'Mouvement Brent',
    wtiMove: 'Mouvement WTI',
    gasMove: 'Mouvement gaz',
    cleanEnergyProxy: 'Proxy énergie propre',
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
  if (lang === 'ar') return 'ar-KW';
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

function formatMoney(value: number | null | undefined, currency: string | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'غير متاح';
  const safeCurrency = currency && /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: Math.abs(value) >= 100 ? 2 : 3,
      maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 3,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(value)} ${safeCurrency}`;
  }
}

function formatNumber(value: number | null | undefined, locale: string, maximumFractionDigits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'غير متاح';
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function formatPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'غير متاح';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متاح';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متاح';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function relativeDate(value: string | null | undefined, locale: string) {
  if (!value) return 'غير متاح';
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
  if (lang === 'ar' && item.nameAr && !/[ØÃ]/.test(item.nameAr)) return item.nameAr;
  return item.displayName;
}

function isCommodityFuture(item: EnergyCommodity) {
  return ['brent', 'wti', 'natural_gas', 'gasoline', 'heating_oil'].includes(item.category);
}

function isCleanEnergyProxy(item: EnergyCommodity) {
  return ['renewables_etf', 'solar_etf'].includes(item.category);
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

function EnergyCenterHeader({ text, locale, lastUpdated, loading, refreshing, onRefresh, hasMarketData }: {
  text: TextBundle;
  locale: string;
  lastUpdated: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  hasMarketData: boolean;
}) {
  return (
    <header className="energyHero">
      <div className="energyHeroCopy">
        <span className="energyHeroBadge"><Flame size={15} />{text.badge}</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <div className="energyHeroMeta">
          <DataBadge tone={hasMarketData ? 'positive' : 'warning'}>{hasMarketData ? text.connected : text.noMarketTitle}</DataBadge>
          <DataBadge tone="warning">{text.delayed}</DataBadge>
          <span><Clock3 size={14} />{text.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated, locale) : text.unavailable}</span>
        </div>
      </div>
      <div className="energyHeroActions">
        <button className="energyPrimaryButton" type="button" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? <Loader2 size={17} className="energySpin" /> : <RefreshCcw size={17} />}
          {refreshing ? text.refreshing : text.refresh}
        </button>
        <button className="energySecondaryButton" type="button">
          <BookmarkPlus size={17} />
          {text.watchlist}
        </button>
        <small>{text.autoRefresh}</small>
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
    <nav className="energyTabs" aria-label={text.tabsLabel}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={active ? 'active' : ''}
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
  const displayed = compact ? items.slice(0, 5) : items;
  return (
    <section className="energyPanel">
      <SectionHeader
        icon={Droplets}
        title={text.commodityStripTitle}
        subtitle={text.commodityStripSubtitle}
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
                <div>
                  <span className="energyCommodityType">{isCommodityFuture(item) ? text.commodityStripTitle : text.marketData}</span>
                  <strong>{commodityLabel(item, lang)}</strong>
                  <small dir="ltr">{item.symbol}</small>
                </div>
                {item.available ? (
                  <>
                    <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                    <em dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                  </>
                ) : (
                  <b>{text.commodityUnavailable}</b>
                )}
                <footer>
                  <span>{text.unit}: <i dir="ltr">{item.unit}</i></span>
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
  const rising = tickerItems.filter(item => (item.changePercent ?? 0) > 0).length;
  const falling = tickerItems.filter(item => (item.changePercent ?? 0) < 0).length;
  const avgMove = tickerItems.length
    ? tickerItems.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / tickerItems.length
    : null;
  const brent = commodityItems.find(item => item.category === 'brent');
  const wti = commodityItems.find(item => item.category === 'wti');
  const gas = commodityItems.find(item => item.category === 'natural_gas');
  const cleanProxy = commodityItems.find(item => isCleanEnergyProxy(item));

  if (loading) {
    return (
      <section className="energyPanel">
        <SectionHeader icon={BarChart3} title={text.snapshotTitle} subtitle={text.snapshotSubtitle} />
        <div className="energyStatsGrid">
          {Array.from({ length: 6 }, (_, index) => <div className="energyStatSkeleton" key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="energyPanel">
      <SectionHeader icon={BarChart3} title={text.snapshotTitle} subtitle={text.snapshotSubtitle} />
      <div className="energyStatsGrid">
        <StatCard icon={Building2} label={text.totalCompanies} value={formatNumber(tickerItems.length, locale, 0)} helper={text.provider} />
        <StatCard icon={TrendingUp} label={text.risingStocks} value={formatNumber(rising, locale, 0)} tone="positive" />
        <StatCard icon={TrendingDown} label={text.fallingStocks} value={formatNumber(falling, locale, 0)} tone="negative" />
        <StatCard icon={Activity} label={text.avgMove} value={formatPercent(avgMove, locale)} tone={toneFor(avgMove)} />
        {brent?.available ? <StatCard icon={Droplets} label={text.brentMove} value={formatPercent(brent.changePercent, locale)} tone={toneFor(brent.changePercent)} /> : null}
        {wti?.available ? <StatCard icon={Droplets} label={text.wtiMove} value={formatPercent(wti.changePercent, locale)} tone={toneFor(wti.changePercent)} /> : null}
        {gas?.available ? <StatCard icon={Flame} label={text.gasMove} value={formatPercent(gas.changePercent, locale)} tone={toneFor(gas.changePercent)} /> : null}
        {cleanProxy?.available ? <StatCard icon={Leaf} label={text.cleanEnergyProxy} value={formatPercent(cleanProxy.changePercent, locale)} tone={toneFor(cleanProxy.changePercent)} /> : null}
        {availableCommodities.length === 0 && tickerItems.length === 0 ? (
          <StatCard icon={AlertTriangle} label={text.noMarketTitle} value={text.unavailable} tone="warning" />
        ) : null}
      </div>
    </section>
  );
}

function EnergyTicker({ items, loading, text, locale }: {
  items: EnergyTickerItem[];
  loading: boolean;
  text: TextBundle;
  locale: string;
}) {
  return (
    <section className="energyTickerPanel" aria-label={text.marketData}>
      {loading ? (
        <div className="energyTickerTrack">
          {Array.from({ length: 8 }, (_, index) => <span className="energyTickerSkeleton" key={index} />)}
        </div>
      ) : items.length > 0 ? (
        <div className="energyTickerTrack">
          {items.map(item => {
            const tone = toneFor(item.changePercent);
            return (
              <article className={`energyTickerItem energyTone-${tone}`} key={item.symbol}>
                <span dir="ltr">{item.symbol}</span>
                <strong>{item.name}</strong>
                <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                <em dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                <small>{categoryLabel(item.sector, 'en')}</small>
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
  const lists: Array<{ title: string; icon: LucideIcon; rows: StockCategoryMoverItem[]; tone: Tone }> = movers?.ok ? [
    { title: text.topGainers, icon: TrendingUp, rows: movers.data.topGainers, tone: 'positive' },
    { title: text.topLosers, icon: TrendingDown, rows: movers.data.topLosers, tone: 'negative' },
    { title: text.highestVolume, icon: BarChart3, rows: movers.data.highestVolume, tone: 'neutral' },
  ] : [];
  const commodityRows = commodities.filter(item => item.available).slice().sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)).slice(0, 5);

  return (
    <section className="energyPanel">
      <SectionHeader icon={Activity} title={text.marketMovers} subtitle={text.commodityVsEquityBody} />
      <div className="energyMoversGrid">
        {lists.map(list => {
          const Icon = list.icon;
          return (
            <article className="energyMoverList" key={list.title}>
              <h3><Icon size={17} />{list.title}</h3>
              {list.rows.length > 0 ? list.rows.slice(0, 5).map(row => (
                <div className={`energyMoverRow energyTone-${toneFor(row.changePercent)}`} key={row.symbol}>
                  <span dir="ltr">{row.symbol}</span>
                  <strong>{row.name}</strong>
                  <b dir="ltr">{formatMoney(row.price, row.currency, locale)}</b>
                  <em dir="ltr">{formatPercent(row.changePercent, locale)}</em>
                </div>
              )) : <small>{text.unavailable}</small>}
            </article>
          );
        })}
        <article className="energyMoverList">
          <h3><Droplets size={17} />{text.commodityMoves}</h3>
          {commodityRows.length > 0 ? commodityRows.map(row => (
            <div className={`energyMoverRow energyTone-${toneFor(row.changePercent)}`} key={row.symbol}>
              <span dir="ltr">{row.symbol}</span>
              <strong>{row.displayName}</strong>
              <b dir="ltr">{formatMoney(row.price, row.currency, locale)}</b>
              <em dir="ltr">{formatPercent(row.changePercent, locale)}</em>
            </div>
          )) : <small>{text.commodityUnavailable}</small>}
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
            const CategoryIcon = COMPANY_CATEGORY_META[item.sector as EnergyCompanyCategory]?.icon ?? Building2;
            return (
              <article className={`energyCompanyFeature energyTone-${tone}`} key={item.symbol}>
                <header>
                  <span><CategoryIcon size={17} /></span>
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

function EnergyCompanyTable({ items, text, lang, locale }: {
  items: EnergyTickerItem[];
  text: TextBundle;
  lang: LangCode;
  locale: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={text.noCompaniesTitle} body={text.noCompaniesBody} icon={Building2} />;
  }

  return (
    <>
      <div className="energyCompanyTableWrap">
        <table className="energyCompanyTable">
          <thead>
            <tr>
              <th>{text.tableCompany}</th>
              <th>{text.tableCategory}</th>
              <th>{text.tablePrice}</th>
              <th>{text.tableChange}</th>
              <th>{text.tableCurrency}</th>
              <th>{text.tableSource}</th>
              <th>{text.risk}</th>
              <th>{text.tableAction}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.symbol}>
                <td>
                  <div className="energyCompanyCell">
                    <span>{item.name.slice(0, 1)}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small dir="ltr">{item.symbol}</small>
                    </div>
                  </div>
                </td>
                <td>{categoryLabel(item.sector, lang)}</td>
                <td dir="ltr">{formatMoney(item.price, item.currency, locale)}</td>
                <td><DataBadge tone={toneFor(item.changePercent)}><span dir="ltr">{formatPercent(item.changePercent, locale)}</span></DataBadge></td>
                <td dir="ltr">{item.currency}</td>
                <td>{item.source}</td>
                <td><DataBadge tone="neutral">{text.riskUnavailable}</DataBadge></td>
                <td><button className="energyTableAction" type="button">{text.details}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="energyMobileCompanyList">
        {items.map(item => (
          <article className="energyMobileCompanyCard" key={item.symbol}>
            <header>
              <div>
                <strong>{item.name}</strong>
                <small dir="ltr">{item.symbol}</small>
              </div>
              <DataBadge tone={toneFor(item.changePercent)}><span dir="ltr">{formatPercent(item.changePercent, locale)}</span></DataBadge>
            </header>
            <dl>
              <div><dt>{text.price}</dt><dd dir="ltr">{formatMoney(item.price, item.currency, locale)}</dd></div>
              <div><dt>{text.sector}</dt><dd>{categoryLabel(item.sector, lang)}</dd></div>
              <div><dt>{text.source}</dt><dd>{item.source}</dd></div>
              <div><dt>{text.risk}</dt><dd>{text.riskUnavailable}</dd></div>
            </dl>
            <button type="button">{text.details}</button>
          </article>
        ))}
      </div>
    </>
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
        if (sort === 'price-desc') return b.price - a.price;
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
      <EnergyCompanyTable items={filtered} text={text} lang={lang} locale={locale} />
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

function EnergyCalendar({ text }: { text: TextBundle }) {
  return (
    <section className="energyPanel">
      <SectionHeader icon={CalendarDays} title={text.calendarTitle} subtitle={text.calendarSubtitle} />
      <div className="energyCalendarShell">
        <EmptyState icon={CalendarDays} title={text.noCalendarTitle} body={`${text.noCalendarBody} ${text.eventProviderMissing}`} />
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
      setMarketError(text.noMarketBody);
    }
    if (commodityResult.status === 'fulfilled' && commodityResult.value.ok) {
      setCommodityItems(commodityResult.value.items);
      setCommodityUpdatedAt(commodityResult.value.updated_at);
    } else {
      setCommodityItems([]);
      setCommodityUpdatedAt('');
      setMarketError(text.noMarketBody);
    }
    setMarketLoaded(true);
    setMarketLoading(false);
  }, [text.noMarketBody]);

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
        setNewsError(result.reason || result.error || text.noNewsTitle);
      }
    } catch {
      setNewsItems([]);
      setNewsUpdatedAt('');
      setNewsError(text.noNewsTitle);
    } finally {
      setNewsLoaded(true);
      setNewsLoading(false);
    }
  }, [activeLang, text.noNewsTitle]);

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
    if (activeTab === 'overview' || activeTab === 'news' || activeTab === 'oil-gas' || activeTab === 'renewables' || activeTab === 'nuclear') {
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
      return <EnergyCalendar text={text} />;
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
          <EnergyCalendar text={text} />
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
          />
          <EnergyTicker items={tickerItems} loading={marketLoading} text={text} locale={locale} />
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
