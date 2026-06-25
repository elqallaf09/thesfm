'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  HeartPulse,
  Info,
  LineChart,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Signal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';

type LangCode = 'ar' | 'en' | 'fr';
type HubTab = 'overview' | 'stocks' | 'news' | 'sectors';
type SectorId = 'all' | 'consumer_staples' | 'healthcare' | 'telecom' | 'utilities' | 'dividends' | 'mna' | 'analysis';
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type StockSort = 'stability' | 'performance' | 'name';
type NewsSort = 'recent' | 'oldest' | 'movement';

type DefensiveTickerItem = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
};

type DefensiveTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: DefensiveTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: DefensiveTickerItem[];
  };

type DefensiveNewsItem = {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  image?: string | null;
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

type DefensiveNewsResponse =
  | {
    success: true;
    category: 'defensive';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: DefensiveNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
  };

type DefensiveStockRow = DefensiveTickerItem & {
  sectorId: SectorId;
  sectorLabel: string;
  dailyVolatilityProxy: number | null;
};

const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const MAX_COMPARISON_STOCKS = 5;

const COPY = {
  ar: {
    title: 'الأسهم الدفاعية',
    subtitle: 'اكتشف الأسهم والقطاعات التي تميل إلى الاستقرار النسبي خلال تقلبات السوق، وتابع أخبارها وبياناتها الأساسية.',
    badge: 'مركز أبحاث دفاعي',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    stockUpdated: 'تحديث الأسعار',
    newsUpdated: 'تحديث الأخبار',
    notUpdated: 'غير متاح',
    delayed: 'بيانات سوق متأخرة',
    cached: 'بيانات مخزنة مؤقتاً',
    sourceNote: 'الأخبار مجمعة من مصادر مالية خارجية، ويُنصح بالرجوع إلى المصدر الأصلي.',
    tabs: {
      overview: 'نظرة عامة',
      stocks: 'الأسهم الدفاعية',
      news: 'الأخبار',
      sectors: 'القطاعات',
    },
    tickerTitle: 'شريط الأسهم الدفاعية',
    tickerEmpty: 'لا توجد أسعار سوق متاحة حالياً من المصادر الحقيقية.',
    overviewTitle: 'ملخص الأسهم الدفاعية اليوم',
    rising: 'أسهم مرتفعة',
    falling: 'أسهم منخفضة',
    bestSector: 'أفضل قطاع متاح',
    lowestMove: 'أقل سهم حركة',
    strongestMove: 'أقوى حركة يومية',
    unavailable: 'غير متاح',
    comparisonTitle: 'مقارنة دفاعية سريعة',
    comparisonSubtitle: 'يعرض الرسم حركة اليوم المتاحة فقط من الأسعار الحقيقية. البيانات التاريخية غير متاحة حالياً.',
    historicalUnavailable: 'البيانات التاريخية غير متاحة حالياً.',
    selectedForComparison: 'مختار للمقارنة',
    stockScreener: 'مصفاة الأسهم الدفاعية',
    stockScreenerHint: 'قارن السعر، الحركة اليومية، والقطاع. Beta والتوزيعات لا تظهر إلا إذا توفرت من مصدر حقيقي.',
    searchStocks: 'ابحث عن شركة أو رمز...',
    allSectors: 'كل القطاعات',
    sortBy: 'الترتيب',
    sortStability: 'الأقل حركة يومية',
    sortPerformance: 'أفضل أداء',
    sortName: 'الاسم',
    company: 'الشركة',
    symbol: 'الرمز',
    sector: 'القطاع',
    price: 'السعر',
    change: 'التغير',
    dailyMove: 'الحركة اليومية',
    dividendYield: 'عائد التوزيعات',
    beta: 'Beta',
    volatility: 'التذبذب',
    marketCap: 'القيمة السوقية',
    defensiveScore: 'الدرجة الدفاعية',
    notCalculated: 'غير محسوب',
    missingMetric: 'غير متاح',
    openAnalysis: 'فتح التحليل',
    newsTitle: 'أخبار الأسهم الدفاعية',
    newsHint: 'أخبار محدودة على أول تحميل، مع فلترة حسب المصدر والرمز والقطاع والفترة.',
    featuredNews: 'أحدث خبر دفاعي',
    source: 'المصدر',
    allSources: 'كل المصادر',
    allSymbols: 'كل الرموز',
    timeRange: 'الفترة',
    allTimes: 'كل الفترات',
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوماً',
    sortRecent: 'الأحدث',
    sortOldest: 'الأقدم',
    sortMovement: 'أكبر حركة مرتبطة',
    clearFilters: 'مسح الفلاتر',
    searchNews: 'ابحث عن خبر أو شركة أو رمز...',
    resultCount: 'خبر مطابق',
    readArticle: 'قراءة الخبر',
    originalText: 'عرض النص الأصلي',
    translationText: 'عرض الترجمة',
    autoTranslated: 'ترجمة آلية',
    originalLanguage: 'النص الأصلي',
    stockContext: 'حركة السهم المرتبط',
    delayedQuote: 'سعر متأخر',
    noLink: 'الرابط غير متاح',
    showMore: 'عرض المزيد',
    noMore: 'تم عرض كل الأخبار المتاحة',
    noNews: 'لا توجد أخبار مرتبطة بالفلاتر الحالية.',
    noStocks: 'لا توجد أسهم مطابقة للفلاتر الحالية.',
    loading: 'جارٍ تحميل بيانات الأسهم الدفاعية...',
    errorTitle: 'تعذر تحديث البيانات',
    retry: 'إعادة المحاولة',
    sectorsTitle: 'دليل القطاعات الدفاعية',
    guideTitle: 'دليل الأسهم الدفاعية',
    guideSubtitle: 'محتوى تعليمي مختصر ومطوي افتراضياً حتى تبقى الصفحة قابلة للمسح.',
    showGuide: 'عرض التفاصيل',
    hideGuide: 'إخفاء التفاصيل',
    portfolioUnavailable: 'لا توجد مطابقة محفظة مفعلة لهذه الصفحة حالياً.',
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومتابعة الأخبار فقط، وليست توصية شراء أو بيع أو نصيحة استثمارية. لا يتم استخدام أسعار أو أخبار وهمية، وقد تظهر آخر قيمة متاحة عند إغلاق السوق.',
  },
  en: {
    title: 'Defensive Stocks',
    subtitle: 'Research stocks and sectors that tend to be relatively stable during market volatility, with real quotes and related news.',
    badge: 'Defensive research hub',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    stockUpdated: 'Quote update',
    newsUpdated: 'News update',
    notUpdated: 'Unavailable',
    delayed: 'Delayed market data',
    cached: 'Cached data',
    sourceNote: 'News is aggregated from external financial sources; check the original source before acting.',
    tabs: {
      overview: 'Overview',
      stocks: 'Defensive stocks',
      news: 'News',
      sectors: 'Sectors',
    },
    tickerTitle: 'Defensive stock ticker',
    tickerEmpty: 'No real market prices are available right now.',
    overviewTitle: 'Defensive market summary',
    rising: 'Rising stocks',
    falling: 'Falling stocks',
    bestSector: 'Best available sector',
    lowestMove: 'Lowest daily move',
    strongestMove: 'Strongest daily move',
    unavailable: 'Unavailable',
    comparisonTitle: 'Defensive comparison',
    comparisonSubtitle: 'The chart uses available one-day real market movement only. Historical data is unavailable right now.',
    historicalUnavailable: 'Historical data is unavailable right now.',
    selectedForComparison: 'Selected for comparison',
    stockScreener: 'Defensive stock screener',
    stockScreenerHint: 'Compare price, daily movement, and sector. Beta and dividend yield appear only when a real source provides them.',
    searchStocks: 'Search company or symbol...',
    allSectors: 'All sectors',
    sortBy: 'Sort',
    sortStability: 'Lowest daily move',
    sortPerformance: 'Best performance',
    sortName: 'Name',
    company: 'Company',
    symbol: 'Symbol',
    sector: 'Sector',
    price: 'Price',
    change: 'Change',
    dailyMove: 'Daily move',
    dividendYield: 'Dividend yield',
    beta: 'Beta',
    volatility: 'Volatility',
    marketCap: 'Market cap',
    defensiveScore: 'Defensive score',
    notCalculated: 'Not calculated',
    missingMetric: 'Unavailable',
    openAnalysis: 'Open analysis',
    newsTitle: 'Defensive stock news',
    newsHint: 'Initial news is limited, with filters by source, symbol, sector, and time range.',
    featuredNews: 'Latest defensive story',
    source: 'Source',
    allSources: 'All sources',
    allSymbols: 'All symbols',
    timeRange: 'Time range',
    allTimes: 'All time',
    today: 'Today',
    week: 'Last 7 days',
    month: 'Last 30 days',
    sortRecent: 'Newest',
    sortOldest: 'Oldest',
    sortMovement: 'Largest related move',
    clearFilters: 'Clear filters',
    searchNews: 'Search news, company, or symbol...',
    resultCount: 'matching articles',
    readArticle: 'Read article',
    originalText: 'Show original',
    translationText: 'Show translation',
    autoTranslated: 'Machine translation',
    originalLanguage: 'Original text',
    stockContext: 'Related stock movement',
    delayedQuote: 'Delayed quote',
    noLink: 'Link unavailable',
    showMore: 'Show more',
    noMore: 'All available news is visible',
    noNews: 'No news matches the current filters.',
    noStocks: 'No stocks match the current filters.',
    loading: 'Loading defensive stock data...',
    errorTitle: 'Could not update data',
    retry: 'Retry',
    sectorsTitle: 'Defensive sector guide',
    guideTitle: 'Defensive stock guide',
    guideSubtitle: 'Concise education is collapsed by default so the page remains scannable.',
    showGuide: 'Show details',
    hideGuide: 'Hide details',
    portfolioUnavailable: 'Portfolio matching is not enabled for this page yet.',
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for education and news monitoring only. It is not a buy/sell recommendation or investment advice. No fake prices or news are used, and the last real value may appear when markets are closed.',
  },
  fr: {
    title: 'Actions défensives',
    subtitle: 'Analysez les actions et secteurs relativement stables pendant la volatilité, avec cotations et actualités réelles.',
    badge: 'Centre de recherche défensif',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    stockUpdated: 'Mise à jour des cours',
    newsUpdated: 'Mise à jour des actualités',
    notUpdated: 'Indisponible',
    delayed: 'Données différées',
    cached: 'Données en cache',
    sourceNote: 'Les actualités proviennent de sources financières externes; consultez la source originale.',
    tabs: {
      overview: 'Aperçu',
      stocks: 'Actions défensives',
      news: 'Actualités',
      sectors: 'Secteurs',
    },
    tickerTitle: 'Bandeau actions défensives',
    tickerEmpty: 'Aucun prix réel disponible pour le moment.',
    overviewTitle: 'Résumé défensif du marché',
    rising: 'Actions en hausse',
    falling: 'Actions en baisse',
    bestSector: 'Meilleur secteur disponible',
    lowestMove: 'Plus faible mouvement',
    strongestMove: 'Mouvement le plus fort',
    unavailable: 'Indisponible',
    comparisonTitle: 'Comparaison défensive',
    comparisonSubtitle: 'Le graphique utilise uniquement le mouvement réel disponible sur une journée. Les données historiques ne sont pas disponibles.',
    historicalUnavailable: 'Les données historiques ne sont pas disponibles.',
    selectedForComparison: 'Sélectionné',
    stockScreener: 'Sélecteur d’actions défensives',
    stockScreenerHint: 'Comparez prix, mouvement quotidien et secteur. Beta et rendement ne s’affichent que si une source réelle les fournit.',
    searchStocks: 'Rechercher société ou symbole...',
    allSectors: 'Tous les secteurs',
    sortBy: 'Tri',
    sortStability: 'Plus faible mouvement',
    sortPerformance: 'Meilleure performance',
    sortName: 'Nom',
    company: 'Société',
    symbol: 'Symbole',
    sector: 'Secteur',
    price: 'Prix',
    change: 'Variation',
    dailyMove: 'Mouvement',
    dividendYield: 'Rendement',
    beta: 'Beta',
    volatility: 'Volatilité',
    marketCap: 'Capitalisation',
    defensiveScore: 'Score défensif',
    notCalculated: 'Non calculé',
    missingMetric: 'Indisponible',
    openAnalysis: 'Ouvrir analyse',
    newsTitle: 'Actualités défensives',
    newsHint: 'Actualités limitées au chargement initial avec filtres par source, symbole, secteur et période.',
    featuredNews: 'Dernière actualité défensive',
    source: 'Source',
    allSources: 'Toutes les sources',
    allSymbols: 'Tous les symboles',
    timeRange: 'Période',
    allTimes: 'Toutes',
    today: 'Aujourd’hui',
    week: '7 derniers jours',
    month: '30 derniers jours',
    sortRecent: 'Récentes',
    sortOldest: 'Anciennes',
    sortMovement: 'Plus fort mouvement',
    clearFilters: 'Effacer',
    searchNews: 'Rechercher actualité, société ou symbole...',
    resultCount: 'articles',
    readArticle: 'Lire l’article',
    originalText: 'Voir original',
    translationText: 'Voir traduction',
    autoTranslated: 'Traduction automatique',
    originalLanguage: 'Texte original',
    stockContext: 'Mouvement lié',
    delayedQuote: 'Cours différé',
    noLink: 'Lien indisponible',
    showMore: 'Afficher plus',
    noMore: 'Toutes les actualités sont visibles',
    noNews: 'Aucune actualité ne correspond aux filtres.',
    noStocks: 'Aucune action ne correspond aux filtres.',
    loading: 'Chargement des données défensives...',
    errorTitle: 'Impossible de mettre à jour',
    retry: 'Réessayer',
    sectorsTitle: 'Guide des secteurs défensifs',
    guideTitle: 'Guide des actions défensives',
    guideSubtitle: 'Le contenu pédagogique est fermé par défaut pour garder la page lisible.',
    showGuide: 'Afficher',
    hideGuide: 'Masquer',
    portfolioUnavailable: 'La correspondance portefeuille n’est pas encore activée.',
    disclaimerTitle: 'Avertissement',
    disclaimerBody: 'Cette page est destinée à l’éducation et au suivi de l’actualité uniquement. Elle ne constitue pas une recommandation d’achat ou de vente ni un conseil en investissement.',
  },
} as const;

const SECTOR_LABELS = {
  ar: {
    all: 'الكل',
    consumer_staples: 'السلع الأساسية',
    healthcare: 'الرعاية الصحية',
    telecom: 'الاتصالات',
    utilities: 'المرافق',
    dividends: 'توزيعات وأرباح',
    mna: 'اندماج واستحواذ',
    analysis: 'تحليلات',
  },
  en: {
    all: 'All',
    consumer_staples: 'Consumer staples',
    healthcare: 'Healthcare',
    telecom: 'Telecom',
    utilities: 'Utilities',
    dividends: 'Dividends',
    mna: 'M&A',
    analysis: 'Analysis',
  },
  fr: {
    all: 'Tout',
    consumer_staples: 'Biens essentiels',
    healthcare: 'Santé',
    telecom: 'Télécoms',
    utilities: 'Services publics',
    dividends: 'Dividendes',
    mna: 'Fusions-acquisitions',
    analysis: 'Analyses',
  },
} satisfies Record<LangCode, Record<SectorId, string>>;

const STOCK_SECTORS: Record<string, SectorId> = {
  PG: 'consumer_staples',
  KO: 'consumer_staples',
  PEP: 'consumer_staples',
  WMT: 'consumer_staples',
  COST: 'consumer_staples',
  CL: 'consumer_staples',
  KMB: 'consumer_staples',
  GIS: 'consumer_staples',
  MDLZ: 'consumer_staples',
  HSY: 'consumer_staples',
  JNJ: 'healthcare',
  ABBV: 'healthcare',
  UNH: 'healthcare',
  MRK: 'healthcare',
  PFE: 'healthcare',
  LLY: 'healthcare',
  T: 'telecom',
  VZ: 'telecom',
  TMUS: 'telecom',
  NEE: 'utilities',
  DUK: 'utilities',
  SO: 'utilities',
  AEP: 'utilities',
  XLP: 'consumer_staples',
  XLV: 'healthcare',
  XLU: 'utilities',
};

const SECTOR_GUIDES: Array<{
  id: Exclude<SectorId, 'all' | 'dividends' | 'mna' | 'analysis'>;
  icon: LucideIcon;
  symbols: string[];
  title: Record<LangCode, string>;
  body: Record<LangCode, string>;
  rationale: Record<LangCode, string>;
}> = [
  {
    id: 'consumer_staples',
    icon: ShoppingCart,
    symbols: ['PG', 'KO', 'PEP', 'WMT', 'COST', 'HSY'],
    title: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Biens de consommation essentiels' },
    body: {
      ar: 'شركات الغذاء والمشروبات والمنتجات المنزلية التي يبقى الطلب عليها حاضراً في معظم الظروف.',
      en: 'Food, beverage, and household product companies with demand that stays present in most environments.',
      fr: 'Sociétés alimentaires, boissons et produits ménagers dont la demande reste présente.',
    },
    rationale: {
      ar: 'طلب يومي متكرر، تسعير أكثر استقراراً، وتعرض أقل للدورات الحادة.',
      en: 'Recurring everyday demand, steadier pricing, and less exposure to sharp cycles.',
      fr: 'Demande quotidienne récurrente, prix plus stables et exposition cyclique réduite.',
    },
  },
  {
    id: 'healthcare',
    icon: HeartPulse,
    symbols: ['JNJ', 'ABBV', 'UNH', 'MRK', 'PFE', 'LLY'],
    title: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' },
    body: {
      ar: 'شركات الأدوية والخدمات الصحية والتأمين الصحي المرتبطة باحتياجات أساسية طويلة الأجل.',
      en: 'Pharma, health services, and health insurance companies tied to long-term essential needs.',
      fr: 'Pharmacie, services de santé et assurance santé liés à des besoins essentiels.',
    },
    rationale: {
      ar: 'الطلب الصحي أقل حساسية للدورة الاقتصادية، لكن المخاطر التنظيمية والبراءات مهمة.',
      en: 'Healthcare demand is less cyclical, though regulation and patent risk matter.',
      fr: 'La demande de santé est moins cyclique, avec un risque réglementaire et brevets.',
    },
  },
  {
    id: 'utilities',
    icon: Zap,
    symbols: ['NEE', 'DUK', 'SO', 'AEP'],
    title: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: {
      ar: 'شركات الكهرباء والمياه والطاقة المنظمة غالباً، مع تدفقات إيراد أكثر استقراراً.',
      en: 'Electricity, water, and often regulated energy providers with more stable revenue flows.',
      fr: 'Électricité, eau et énergie souvent réglementées aux revenus plus stables.',
    },
    rationale: {
      ar: 'إيرادات منظمة نسبياً وتوزيعات شائعة، لكنها حساسة للفائدة والديون.',
      en: 'Often regulated revenue and common dividends, but sensitive to rates and debt.',
      fr: 'Revenus souvent réglementés et dividendes fréquents, sensibles aux taux.',
    },
  },
  {
    id: 'telecom',
    icon: Signal,
    symbols: ['T', 'VZ', 'TMUS'],
    title: { ar: 'الاتصالات', en: 'Telecommunications', fr: 'Télécommunications' },
    body: {
      ar: 'مزودو الاتصالات والإنترنت والاشتراكات المتكررة للأفراد والشركات.',
      en: 'Communication and internet service providers with recurring customer subscriptions.',
      fr: 'Fournisseurs de communications et internet avec abonnements récurrents.',
    },
    rationale: {
      ar: 'اشتراكات متكررة وتدفقات نقدية واضحة، مع منافسة وإنفاق رأسمالي مرتفع.',
      en: 'Recurring subscriptions and visible cash flows, with competition and capex risk.',
      fr: 'Abonnements récurrents et flux visibles, avec concurrence et dépenses élevées.',
    },
  },
];

const EDUCATION_GUIDE: Array<{
  id: string;
  icon: LucideIcon;
  title: Record<LangCode, string>;
  body: Record<LangCode, string>;
}> = [
  {
    id: 'what',
    icon: ShieldCheck,
    title: { ar: 'ما هي الأسهم الدفاعية؟', en: 'What are defensive stocks?', fr: 'Que sont les actions défensives ?' },
    body: {
      ar: 'هي شركات تقدم منتجات أو خدمات أساسية يميل الطلب عليها إلى الاستقرار نسبياً حتى أثناء التباطؤ الاقتصادي. هذا لا يعني أنها آمنة أو مضمونة، بل أن سلوكها قد يكون أقل حساسية للدورة الاقتصادية.',
      en: 'They are companies providing essential goods or services whose demand tends to remain relatively stable during slowdowns. That does not make them safe or guaranteed.',
      fr: 'Ce sont des sociétés fournissant des biens ou services essentiels dont la demande reste relativement stable. Cela ne les rend pas garanties.',
    },
  },
  {
    id: 'cyclical',
    icon: Activity,
    title: { ar: 'الفرق بينها وبين الأسهم الدورية', en: 'Defensive vs cyclical', fr: 'Défensives vs cycliques' },
    body: {
      ar: 'الأسهم الدورية تتحسن غالباً مع النمو الاقتصادي وتتضرر في الركود. الأسهم الدفاعية قد تتحرك بهدوء أكثر، لكنها قد تتأثر بالفائدة، التقييمات، والأخبار التنظيمية.',
      en: 'Cyclical stocks often improve with growth and suffer in downturns. Defensive stocks may move more calmly, but rates, valuation, and regulation still matter.',
      fr: 'Les cycliques suivent davantage la croissance. Les défensives peuvent être plus calmes, mais restent exposées aux taux, valorisations et régulation.',
    },
  },
  {
    id: 'risk',
    icon: AlertTriangle,
    title: { ar: 'المخاطر والقيود', en: 'Risks and limits', fr: 'Risques et limites' },
    body: {
      ar: 'انخفاض التذبذب التاريخي أو اليومي لا يضمن حماية رأس المال. بعض القطاعات الدفاعية مثقلة بالديون أو حساسة لتغير الفائدة أو أسعار السلع أو القرارات التنظيمية.',
      en: 'Lower historical or daily volatility does not protect capital. Some defensive sectors carry debt, rate sensitivity, commodity exposure, or regulatory risk.',
      fr: 'Une volatilité plus faible ne protège pas le capital. Certains secteurs restent sensibles à la dette, aux taux, aux matières premières ou à la régulation.',
    },
  },
  {
    id: 'when',
    icon: TrendingDown,
    title: { ar: 'متى قد تتراجع؟', en: 'When can they decline?', fr: 'Quand peuvent-elles baisser ?' },
    body: {
      ar: 'قد تتراجع عند ارتفاع الفائدة، ضغط الهوامش، تغيّر التنظيمات، ضعف الأرباح، أو عندما تصبح تقييماتها مرتفعة مقارنة بنموها.',
      en: 'They can decline when rates rise, margins compress, regulation changes, earnings weaken, or valuations run ahead of growth.',
      fr: 'Elles peuvent baisser avec la hausse des taux, la pression sur les marges, la régulation, les bénéfices faibles ou des valorisations élevées.',
    },
  },
];

const SECTOR_KEYWORDS: Record<SectorId, string[]> = {
  all: [],
  consumer_staples: ['consumer staples', 'staples', 'food', 'beverage', 'grocery', 'retail', 'household', 'walmart', 'costco', 'procter', 'coca-cola', 'pepsico'],
  healthcare: ['healthcare', 'health care', 'pharma', 'drug', 'medicine', 'hospital', 'insurance', 'johnson', 'pfizer', 'merck', 'abbvie', 'unitedhealth'],
  telecom: ['telecom', 'telecommunications', 'wireless', 'broadband', 'verizon', 'at&t', 'internet'],
  utilities: ['utilities', 'utility', 'electricity', 'power', 'grid', 'nextera', 'duke energy', 'southern company'],
  dividends: ['dividend', 'dividends', 'distribution', 'payout', 'yield', 'earnings', 'profit', 'quarter', 'توزيع', 'أرباح'],
  mna: ['merger', 'acquisition', 'acquires', 'buyout', 'deal', 'm&a', 'takeover', 'اندماج', 'استحواذ'],
  analysis: ['analysis', 'analyst', 'rating', 'report', 'outlook', 'target', 'upgrade', 'downgrade', 'forecast', 'تحليل', 'تقرير'],
};

function localeFor(lang: LangCode) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function numberFormatter(locale: string, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, {
    numberingSystem: 'latn',
    ...options,
  });
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined, locale: string) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  const code = (currency || 'USD').toUpperCase();
  const digits = amount >= 100 ? 2 : 3;
  const formatted = numberFormatter(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(amount);
  if (code === 'USD') return `$ ${formatted}`;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      numberingSystem: 'latn',
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${formatted} ${code}`;
  }
}

function formatPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const formatted = numberFormatter(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  }).format(date);
}

function relativeTime(value: string, lang: LangCode) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return lang === 'ar' ? 'الآن' : lang === 'fr' ? 'à l’instant' : 'now';
  if (diffMinutes < 60) return lang === 'ar' ? `منذ ${diffMinutes} دقيقة` : lang === 'fr' ? `il y a ${diffMinutes} min` : `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : lang === 'fr' ? `il y a ${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'ar' ? `منذ ${days} يوم` : lang === 'fr' ? `il y a ${days} j` : `${days}d ago`;
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function normalizeTitle(value = '') {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanUrl(value = '') {
  try {
    const url = new URL(value);
    url.hash = '';
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim();
  }
}

function dedupeNews(items: DefensiveNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const keys = [
      item.id,
      cleanUrl(item.url),
      normalizeTitle(item.title || item.headline || item.titleOriginal || ''),
    ].filter(Boolean);
    const duplicate = keys.some(key => seen.has(key));
    keys.forEach(key => seen.add(key));
    return !duplicate;
  });
}

function itemText(item: DefensiveNewsItem) {
  return [
    item.title,
    item.headline,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    item.companyName,
    item.ticker,
    item.source,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function itemMatchesSearch(item: DefensiveNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemText(item).includes(needle);
}

function sectorForSymbol(symbol: string): SectorId {
  return STOCK_SECTORS[String(symbol).toUpperCase()] ?? 'analysis';
}

function itemSector(item: DefensiveNewsItem): SectorId {
  const tickerSector = item.ticker ? sectorForSymbol(item.ticker) : null;
  if (tickerSector && tickerSector !== 'analysis') return tickerSector;
  const sector = String(item.sector ?? '').toLowerCase();
  if (sector.includes('health')) return 'healthcare';
  if (sector.includes('utility')) return 'utilities';
  if (sector.includes('telecom')) return 'telecom';
  if (sector.includes('staple') || sector.includes('food') || sector.includes('retail')) return 'consumer_staples';
  return 'analysis';
}

function itemMatchesSector(item: DefensiveNewsItem, sector: SectorId) {
  if (sector === 'all') return true;
  if (itemSector(item) === sector) return true;
  const haystack = itemText(item);
  return SECTOR_KEYWORDS[sector].some(keyword => haystack.includes(keyword.toLowerCase()));
}

function timeMatches(item: DefensiveNewsItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffHours = Math.max(0, (Date.now() - date.getTime()) / 36e5);
  if (filter === 'today') return diffHours <= 24;
  if (filter === 'week') return diffHours <= 24 * 7;
  return diffHours <= 24 * 30;
}

function displayTitle(item: DefensiveNewsItem, showOriginal: boolean) {
  if (showOriginal) return item.titleOriginal || item.headline || item.title || '';
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: DefensiveNewsItem, showOriginal: boolean) {
  if (showOriginal) return item.summaryOriginal || item.summary || displayTitle(item, true);
  return item.summary || item.summaryOriginal || displayTitle(item, false);
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const dates = values
    .map(value => (value ? new Date(value) : null))
    .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
  if (dates.length === 0) return '';
  return new Date(Math.max(...dates.map(date => date.getTime()))).toISOString();
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  const json = await response.json().catch(() => null) as T | null;
  if (!response.ok || !json) throw new Error(`Request failed: ${url}`);
  return json;
}

function stockName(symbol: string, fallback?: string) {
  const known = {
    PG: 'Procter & Gamble',
    KO: 'Coca-Cola',
    PEP: 'PepsiCo',
    WMT: 'Walmart',
    COST: 'Costco Wholesale',
    CL: 'Colgate-Palmolive',
    KMB: 'Kimberly-Clark',
    GIS: 'General Mills',
    MDLZ: 'Mondelez International',
    HSY: 'Hershey',
    JNJ: 'Johnson & Johnson',
    ABBV: 'AbbVie',
    UNH: 'UnitedHealth Group',
    MRK: 'Merck',
    PFE: 'Pfizer',
    LLY: 'Eli Lilly',
    T: 'AT&T',
    VZ: 'Verizon',
    TMUS: 'T-Mobile US',
    NEE: 'NextEra Energy',
    DUK: 'Duke Energy',
    SO: 'Southern Company',
    AEP: 'American Electric Power',
  } as Record<string, string>;
  return known[symbol] ?? fallback ?? symbol;
}

function buildStockRows(tickerItems: DefensiveTickerItem[], prices: TechStockPrice[], lang: LangCode): DefensiveStockRow[] {
  const map = new Map<string, DefensiveTickerItem>();
  tickerItems.forEach(item => map.set(item.symbol, item));
  prices.forEach(item => {
    if (!item.available || item.price === null || map.has(item.symbol)) return;
    map.set(item.symbol, {
      symbol: item.symbol,
      name: stockName(item.symbol),
      price: item.price,
      currency: 'USD',
      change: item.change,
      changePercent: item.changePercent,
      source: item.source,
      delayed: item.delayed,
    });
  });
  return Array.from(map.values()).map(item => {
    const sectorId = sectorForSymbol(item.symbol);
    return {
      ...item,
      name: stockName(item.symbol, item.name),
      sectorId,
      sectorLabel: SECTOR_LABELS[lang][sectorId],
      dailyVolatilityProxy: typeof item.changePercent === 'number' ? Math.abs(item.changePercent) : null,
    };
  });
}

function sortStockRows(rows: DefensiveStockRow[], sort: StockSort) {
  return rows.slice().sort((a, b) => {
    if (sort === 'performance') return (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity);
    if (sort === 'name') return a.name.localeCompare(b.name);
    return (a.dailyVolatilityProxy ?? Infinity) - (b.dailyVolatilityProxy ?? Infinity);
  });
}

function useInitialTab() {
  const [tab, setTab] = useState<HubTab>('overview');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('tab');
    if (value === 'stocks' || value === 'news' || value === 'sectors' || value === 'overview') setTab(value);
  }, []);

  const updateTab = useCallback((next: HubTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }, []);

  return [tab, updateTab] as const;
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'neutral' }: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  return (
    <article className={`def-metric-card ${tone}`}>
      <span><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong dir="auto">{value}</strong>
        {hint ? <em>{hint}</em> : null}
      </div>
    </article>
  );
}

function DefensiveTicker({ items, loading, error, lang, locale, text }: {
  items: DefensiveTickerItem[];
  loading: boolean;
  error: string;
  lang: LangCode;
  locale: string;
  text: typeof COPY[LangCode];
}) {
  if (loading) {
    return (
      <section className="def-card def-ticker-panel" aria-label={text.tickerTitle}>
        <div className="def-skeleton-row">{Array.from({ length: 6 }).map((_, index) => <span key={index} />)}</div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="def-card def-state" aria-label={text.tickerTitle}>
        <AlertTriangle size={20} />
        <strong>{error || text.tickerEmpty}</strong>
      </section>
    );
  }

  return (
    <section className="def-card def-ticker-panel" aria-label={text.tickerTitle}>
      <MarketTickerStrip
        ariaLabel={text.tickerTitle}
        className="def-ticker-strip"
        viewportClassName="def-ticker-viewport"
        trackClassName="def-ticker-track"
        setClassName="def-ticker-set"
        status={<span className="def-ticker-status"><Clock3 size={13} />{text.delayed}</span>}
      >
        {items.map(item => {
          const tone = changeTone(item.changePercent);
          const TrendIcon = tone === 'down' ? TrendingDown : TrendingUp;
          return (
            <article className={`def-ticker-item ${tone}`} key={item.symbol} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <div className="def-ticker-copy">
                <strong dir="ltr">{item.symbol}</strong>
                <small>{stockName(item.symbol, item.name)} · {SECTOR_LABELS[lang][sectorForSymbol(item.symbol)]}</small>
              </div>
              <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
              <em dir="ltr">
                <TrendIcon size={13} />
                {formatPercent(item.changePercent, locale)}
              </em>
            </article>
          );
        })}
      </MarketTickerStrip>
    </section>
  );
}

function OverviewTab({ stockRows, loading, locale, lang, text, compareSymbols, setCompareSymbols }: {
  stockRows: DefensiveStockRow[];
  loading: boolean;
  locale: string;
  lang: LangCode;
  text: typeof COPY[LangCode];
  compareSymbols: string[];
  setCompareSymbols: (symbols: string[]) => void;
}) {
  const rising = stockRows.filter(row => (row.changePercent ?? 0) > 0).length;
  const falling = stockRows.filter(row => (row.changePercent ?? 0) < 0).length;
  const strongest = stockRows.filter(row => row.changePercent !== null).sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))[0];
  const lowest = stockRows.filter(row => row.dailyVolatilityProxy !== null).sort((a, b) => (a.dailyVolatilityProxy ?? Infinity) - (b.dailyVolatilityProxy ?? Infinity))[0];
  const sectorPerformance = SECTOR_GUIDES
    .map(sector => {
      const rows = stockRows.filter(row => row.sectorId === sector.id && typeof row.changePercent === 'number');
      const average = rows.length ? rows.reduce((sum, row) => sum + (row.changePercent ?? 0), 0) / rows.length : null;
      return { sector, average };
    })
    .filter(item => item.average !== null)
    .sort((a, b) => (b.average ?? -Infinity) - (a.average ?? -Infinity))[0];
  const comparisonRows = stockRows.filter(row => compareSymbols.includes(row.symbol)).slice(0, MAX_COMPARISON_STOCKS);
  const maxMove = Math.max(1, ...comparisonRows.map(row => Math.abs(row.changePercent ?? 0)));

  const toggleCompare = (symbol: string) => {
    if (compareSymbols.includes(symbol)) {
      setCompareSymbols(compareSymbols.filter(item => item !== symbol));
      return;
    }
    setCompareSymbols([...compareSymbols, symbol].slice(-MAX_COMPARISON_STOCKS));
  };

  return (
    <section className="def-tab-panel">
      <div className="def-section-head">
        <div>
          <span className="def-kicker"><Sparkles size={15} />{text.overviewTitle}</span>
          <h2>{text.overviewTitle}</h2>
        </div>
      </div>

      <div className="def-metric-grid" aria-busy={loading}>
        <MetricCard icon={TrendingUp} label={text.rising} value={loading ? '...' : String(rising)} tone="up" />
        <MetricCard icon={TrendingDown} label={text.falling} value={loading ? '...' : String(falling)} tone="down" />
        <MetricCard
          icon={ShieldCheck}
          label={text.bestSector}
          value={sectorPerformance ? sectorPerformance.sector.title[lang] : text.unavailable}
          hint={sectorPerformance?.average !== null && sectorPerformance ? formatPercent(sectorPerformance.average, locale) : undefined}
          tone={(sectorPerformance?.average ?? 0) >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          icon={Activity}
          label={text.lowestMove}
          value={lowest ? lowest.symbol : text.unavailable}
          hint={lowest?.dailyVolatilityProxy !== null && lowest ? formatPercent(lowest.dailyVolatilityProxy, locale) : undefined}
        />
        <MetricCard
          icon={BarChart3}
          label={text.strongestMove}
          value={strongest ? strongest.symbol : text.unavailable}
          hint={strongest?.changePercent !== null && strongest ? formatPercent(strongest.changePercent, locale) : undefined}
          tone={changeTone(strongest?.changePercent)}
        />
      </div>

      <div className="def-grid-two">
        <article className="def-card def-comparison">
          <div className="def-card-head">
            <div>
              <h3>{text.comparisonTitle}</h3>
              <p>{text.comparisonSubtitle}</p>
            </div>
            <LineChart size={22} />
          </div>
          {comparisonRows.length > 0 ? (
            <div className="def-bars" role="img" aria-label={text.comparisonTitle}>
              {comparisonRows.map(row => {
                const width = Math.max(8, Math.abs(row.changePercent ?? 0) / maxMove * 100);
                return (
                  <div className="def-bar-row" key={row.symbol}>
                    <span dir="ltr">{row.symbol}</span>
                    <div className="def-bar-track"><i className={changeTone(row.changePercent)} style={{ width: `${width}%` }} /></div>
                    <b dir="ltr">{formatPercent(row.changePercent, locale)}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="def-state mini"><LineChart size={20} /><strong>{text.historicalUnavailable}</strong></div>
          )}
          <div className="def-compare-picker">
            {stockRows.slice(0, 12).map(row => (
              <button
                type="button"
                key={row.symbol}
                className={compareSymbols.includes(row.symbol) ? 'active' : ''}
                onClick={() => toggleCompare(row.symbol)}
                aria-pressed={compareSymbols.includes(row.symbol)}
              >
                <span dir="ltr">{row.symbol}</span>
              </button>
            ))}
          </div>
        </article>

        <EducationPreview text={text} lang={lang} />
      </div>
    </section>
  );
}

function EducationPreview({ text, lang }: { text: typeof COPY[LangCode]; lang: LangCode }) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const toggle = (id: string) => setOpenIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);

  return (
    <article className="def-card def-guide-card">
      <div className="def-card-head">
        <div>
          <h3>{text.guideTitle}</h3>
          <p>{text.guideSubtitle}</p>
        </div>
        <BookOpen size={22} />
      </div>
      <div className="def-accordion">
        {EDUCATION_GUIDE.map(item => {
          const Icon = item.icon;
          const open = openIds.includes(item.id);
          return (
            <section key={item.id}>
              <button type="button" onClick={() => toggle(item.id)} aria-expanded={open} aria-controls={`guide-${item.id}`}>
                <span><Icon size={16} />{item.title[lang]}</span>
                {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {open ? <p id={`guide-${item.id}`}>{item.body[lang]}</p> : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}

function StocksTab({ stockRows, loading, locale, lang, text, sectorFilter, setSectorFilter, search, setSearch, sort, setSort }: {
  stockRows: DefensiveStockRow[];
  loading: boolean;
  locale: string;
  lang: LangCode;
  text: typeof COPY[LangCode];
  sectorFilter: SectorId;
  setSectorFilter: (value: SectorId) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: StockSort;
  setSort: (value: StockSort) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = stockRows.filter(row => {
      const sectorOk = sectorFilter === 'all' || row.sectorId === sectorFilter;
      const searchOk = !q || `${row.symbol} ${row.name} ${row.sectorLabel}`.toLowerCase().includes(q);
      return sectorOk && searchOk;
    });
    return sortStockRows(next, sort);
  }, [search, sectorFilter, sort, stockRows]);

  return (
    <section className="def-tab-panel">
      <div className="def-section-head">
        <div>
          <h2>{text.stockScreener}</h2>
          <p>{text.stockScreenerHint}</p>
        </div>
      </div>

      <div className="def-filter-card">
        <label className="def-search">
          <Search size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={text.searchStocks} />
        </label>
        <label>
          <span>{text.sector}</span>
          <select value={sectorFilter} onChange={event => setSectorFilter(event.target.value as SectorId)}>
            {Object.entries(SECTOR_LABELS[lang]).filter(([id]) => ['all', 'consumer_staples', 'healthcare', 'telecom', 'utilities'].includes(id)).map(([id]) => (
              <option key={id} value={id}>{id === 'all' ? text.allSectors : SECTOR_LABELS[lang][id as SectorId]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{text.sortBy}</span>
          <select value={sort} onChange={event => setSort(event.target.value as StockSort)}>
            <option value="stability">{text.sortStability}</option>
            <option value="performance">{text.sortPerformance}</option>
            <option value="name">{text.sortName}</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="def-stock-grid">{Array.from({ length: 6 }).map((_, index) => <article className="def-card def-skeleton" key={index}><span /><i /><i /><b /></article>)}</div>
      ) : filtered.length === 0 ? (
        <div className="def-state"><Search size={24} /><strong>{text.noStocks}</strong></div>
      ) : (
        <div className="def-stock-grid">
          {filtered.map(row => (
            <article className="def-stock-card" key={row.symbol}>
              <header>
                <span dir="ltr">{row.symbol}</span>
                <b className={changeTone(row.changePercent)} dir="ltr">{formatPercent(row.changePercent, locale)}</b>
              </header>
              <h3>{row.name}</h3>
              <small>{row.sectorLabel}</small>
              <div className="def-stock-metrics">
                <span><small>{text.price}</small><strong dir="ltr">{formatMoney(row.price, row.currency, locale)}</strong></span>
                <span><small>{text.volatility}</small><strong dir="ltr">{row.dailyVolatilityProxy === null ? text.missingMetric : formatPercent(row.dailyVolatilityProxy, locale)}</strong></span>
                <span><small>{text.dividendYield}</small><strong>{text.missingMetric}</strong></span>
                <span><small>{text.beta}</small><strong>{text.missingMetric}</strong></span>
                <span><small>{text.defensiveScore}</small><strong>{text.notCalculated}</strong></span>
              </div>
              <a href={`/market-analysis?symbol=${encodeURIComponent(row.symbol)}`} aria-label={`${text.openAnalysis}: ${row.symbol}`}>
                {text.openAnalysis}
                <ArrowUpRight size={15} />
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NewsCard({ item, locale, lang, text, variant = 'standard' }: {
  item: DefensiveNewsItem;
  locale: string;
  lang: LangCode;
  text: typeof COPY[LangCode];
  variant?: 'featured' | 'standard' | 'compact';
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const title = displayTitle(item, showOriginal);
  const summary = displaySummary(item, showOriginal);
  const tone = changeTone(item.changePercent);
  const TrendIcon = tone === 'down' ? TrendingDown : TrendingUp;
  const hasOriginalToggle = Boolean(item.isTranslated && (item.titleOriginal || item.summaryOriginal));
  const hasUrl = Boolean(item.url);
  const contentDir = showOriginal || !item.isTranslated ? 'auto' : lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <article className={`def-news-card ${variant}`}>
      {variant === 'featured' ? <div className="def-news-art" aria-hidden="true"><Newspaper size={28} /></div> : null}
      <div className="def-news-meta">
        <span>{item.source || text.source}</span>
        <span><Clock3 size={13} />{relativeTime(item.publishedAt, lang)}</span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
      </div>
      <h3 dir={contentDir}>{title}</h3>
      <p dir={contentDir}>{summary}</p>
      <div className="def-news-tags">
        <span>{SECTOR_LABELS[lang][itemSector(item)]}</span>
        {item.isTranslated ? <span>{text.autoTranslated}</span> : <span>{text.originalLanguage}</span>}
      </div>
      <div className="def-stock-context">
        <small>{text.stockContext}</small>
        {typeof item.price === 'number' ? (
          <div>
            <b dir="ltr">{item.ticker || '—'}</b>
            <strong dir="ltr">{formatMoney(item.price, 'USD', locale)}</strong>
            {typeof item.changePercent === 'number' ? (
              <em className={tone} dir="ltr"><TrendIcon size={12} />{formatPercent(item.changePercent, locale)}</em>
            ) : null}
            <small>{text.delayedQuote}</small>
          </div>
        ) : (
          <strong>{text.missingMetric}</strong>
        )}
      </div>
      <footer>
        {hasOriginalToggle ? (
          <button type="button" onClick={() => setShowOriginal(value => !value)} aria-expanded={showOriginal}>
            {showOriginal ? text.translationText : text.originalText}
          </button>
        ) : <span />}
        {hasUrl ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${text.readArticle}: ${title}`}>
            {text.readArticle}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="def-disabled-link">{text.noLink}</span>
        )}
      </footer>
    </article>
  );
}

function NewsTab({ newsItems, loading, error, locale, lang, text, retry, newsSearch, setNewsSearch, newsSector, setNewsSector, newsSource, setNewsSource, newsSymbol, setNewsSymbol, newsTime, setNewsTime, newsSort, setNewsSort, visibleCount, setVisibleCount }: {
  newsItems: DefensiveNewsItem[];
  loading: boolean;
  error: string;
  locale: string;
  lang: LangCode;
  text: typeof COPY[LangCode];
  retry: () => void;
  newsSearch: string;
  setNewsSearch: (value: string) => void;
  newsSector: SectorId;
  setNewsSector: (value: SectorId) => void;
  newsSource: string;
  setNewsSource: (value: string) => void;
  newsSymbol: string;
  setNewsSymbol: (value: string) => void;
  newsTime: TimeFilter;
  setNewsTime: (value: TimeFilter) => void;
  newsSort: NewsSort;
  setNewsSort: (value: NewsSort) => void;
  visibleCount: number;
  setVisibleCount: (updater: (value: number) => number) => void;
}) {
  const sources = useMemo(() => Array.from(new Set(newsItems.map(item => item.source).filter(Boolean))).sort(), [newsItems]);
  const symbols = useMemo(() => Array.from(new Set(newsItems.map(item => item.ticker).filter(Boolean))).sort(), [newsItems]);
  const filtered = useMemo(() => {
    const items = newsItems
      .filter(item => itemMatchesSearch(item, newsSearch))
      .filter(item => itemMatchesSector(item, newsSector))
      .filter(item => newsSource === 'all' || item.source === newsSource)
      .filter(item => newsSymbol === 'all' || item.ticker === newsSymbol)
      .filter(item => timeMatches(item, newsTime));
    return items.sort((a, b) => {
      if (newsSort === 'oldest') return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      if (newsSort === 'movement') return Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0);
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [newsItems, newsSearch, newsSector, newsSource, newsSort, newsSymbol, newsTime]);
  const lead = filtered[0];
  const rest = filtered.slice(lead ? 1 : 0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section className="def-tab-panel">
      <div className="def-section-head">
        <div>
          <h2>{text.newsTitle}</h2>
          <p>{text.newsHint}</p>
        </div>
        <strong>{filtered.length} {text.resultCount}</strong>
      </div>

      <div className="def-filter-card news">
        <label className="def-search">
          <Search size={17} />
          <input value={newsSearch} onChange={event => setNewsSearch(event.target.value)} placeholder={text.searchNews} />
        </label>
        <label><span>{text.source}</span><select value={newsSource} onChange={event => setNewsSource(event.target.value)}><option value="all">{text.allSources}</option>{sources.map(source => <option key={source} value={source}>{source}</option>)}</select></label>
        <label><span>{text.symbol}</span><select value={newsSymbol} onChange={event => setNewsSymbol(event.target.value)}><option value="all">{text.allSymbols}</option>{symbols.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}</select></label>
        <label><span>{text.sector}</span><select value={newsSector} onChange={event => setNewsSector(event.target.value as SectorId)}>{(['all', 'consumer_staples', 'healthcare', 'telecom', 'utilities', 'dividends', 'mna', 'analysis'] as SectorId[]).map(id => <option key={id} value={id}>{id === 'all' ? text.allSectors : SECTOR_LABELS[lang][id]}</option>)}</select></label>
        <label><span>{text.timeRange}</span><select value={newsTime} onChange={event => setNewsTime(event.target.value as TimeFilter)}><option value="all">{text.allTimes}</option><option value="today">{text.today}</option><option value="week">{text.week}</option><option value="month">{text.month}</option></select></label>
        <label><span>{text.sortBy}</span><select value={newsSort} onChange={event => setNewsSort(event.target.value as NewsSort)}><option value="recent">{text.sortRecent}</option><option value="movement">{text.sortMovement}</option><option value="oldest">{text.sortOldest}</option></select></label>
        <button type="button" onClick={() => { setNewsSearch(''); setNewsSector('all'); setNewsSource('all'); setNewsSymbol('all'); setNewsTime('all'); setNewsSort('recent'); }}>{text.clearFilters}</button>
      </div>

      {loading ? (
        <div className="def-news-grid">{Array.from({ length: 6 }).map((_, index) => <article className="def-news-card def-skeleton" key={index}><span /><i /><i /><b /></article>)}</div>
      ) : error ? (
        <div className="def-state" role="alert"><AlertTriangle size={24} /><strong>{text.errorTitle}</strong><p>{error}</p><button type="button" onClick={retry}>{text.retry}</button></div>
      ) : filtered.length === 0 ? (
        <div className="def-state"><Newspaper size={24} /><strong>{text.noNews}</strong></div>
      ) : (
        <>
          {lead ? (
            <section className="def-featured-news" aria-label={text.featuredNews}>
              <span className="def-kicker"><Sparkles size={14} />{text.featuredNews}</span>
              <NewsCard item={lead} locale={locale} lang={lang} text={text} variant="featured" />
            </section>
          ) : null}
          <div className="def-news-grid">
            {rest.map(item => <NewsCard key={item.id} item={item} locale={locale} lang={lang} text={text} />)}
          </div>
          <div className="def-load-more">
            {hasMore ? <button type="button" onClick={() => setVisibleCount(value => value + NEWS_PAGE_SIZE)}>{text.showMore}</button> : <span>{text.noMore}</span>}
          </div>
        </>
      )}
    </section>
  );
}

function SectorsTab({ lang, text, locale, stockRows }: {
  lang: LangCode;
  text: typeof COPY[LangCode];
  locale: string;
  stockRows: DefensiveStockRow[];
}) {
  return (
    <section className="def-tab-panel">
      <div className="def-section-head">
        <div>
          <h2>{text.sectorsTitle}</h2>
          <p>{text.guideSubtitle}</p>
        </div>
      </div>
      <div className="def-sector-grid">
        {SECTOR_GUIDES.map(sector => {
          const Icon = sector.icon;
          const rows = stockRows.filter(row => row.sectorId === sector.id);
          const avg = rows.length ? rows.reduce((sum, row) => sum + (row.changePercent ?? 0), 0) / rows.length : null;
          const lowest = rows.filter(row => row.dailyVolatilityProxy !== null).sort((a, b) => (a.dailyVolatilityProxy ?? Infinity) - (b.dailyVolatilityProxy ?? Infinity))[0];
          return (
            <article className="def-sector-card" key={sector.id}>
              <span><Icon size={20} /></span>
              <h3>{sector.title[lang]}</h3>
              <p>{sector.body[lang]}</p>
              <small>{sector.rationale[lang]}</small>
              <div>
                <b>{text.change}: <span dir="ltr">{avg === null ? text.missingMetric : formatPercent(avg, locale)}</span></b>
                <b>{text.lowestMove}: <span dir="ltr">{lowest ? lowest.symbol : text.missingMetric}</span></b>
              </div>
              <footer>{sector.symbols.map(symbol => <a key={symbol} href={`/market-analysis?symbol=${symbol}`} dir="ltr">{symbol}</a>)}</footer>
            </article>
          );
        })}
      </div>
      <EducationPreview text={text} lang={lang} />
    </section>
  );
}

function DataStatusCard({ text, locale, tickerUpdatedAt, newsUpdatedAt, source }: {
  text: typeof COPY[LangCode];
  locale: string;
  tickerUpdatedAt: string;
  newsUpdatedAt: string;
  source: string;
}) {
  return (
    <aside className="def-data-status">
      <span><Info size={18} />{text.cached}</span>
      <b>{text.stockUpdated}: {tickerUpdatedAt ? formatDateTime(tickerUpdatedAt, locale) : text.notUpdated}</b>
      <b>{text.newsUpdated}: {newsUpdatedAt ? formatDateTime(newsUpdatedAt, locale) : text.notUpdated}</b>
      <small>{source}</small>
    </aside>
  );
}

export function DefensiveStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = COPY[activeLang];
  const locale = localeFor(activeLang);
  const [activeTab, setActiveTab] = useInitialTab();
  const [tickerItems, setTickerItems] = useState<DefensiveTickerItem[]>([]);
  const [newsItems, setNewsItems] = useState<DefensiveNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [stockSector, setStockSector] = useState<SectorId>('all');
  const [stockSort, setStockSort] = useState<StockSort>('stability');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsSector, setNewsSector] = useState<SectorId>('all');
  const [newsSource, setNewsSource] = useState('all');
  const [newsSymbol, setNewsSymbol] = useState('all');
  const [newsTime, setNewsTime] = useState<TimeFilter>('all');
  const [newsSort, setNewsSort] = useState<NewsSort>('recent');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');

    const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<DefensiveTickerResponse>('/api/defensive-stocks/ticker'),
      fetchJson<DefensiveNewsResponse>(`/api/defensive-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=60`),
      fetchJson<StockCategoryMoversResponse>('/api/defensive-stocks/movers?limit=5'),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
      setMarketError('');
    } else {
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(text.tickerEmpty);
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNewsItems(dedupeNews(newsResult.value.items));
      setPrices(newsResult.value.prices ?? []);
      setNewsUpdatedAt(newsResult.value.lastUpdated);
      setNewsError('');
    } else {
      setNewsItems([]);
      setPrices([]);
      setNewsUpdatedAt('');
      const reason = newsResult.status === 'fulfilled'
        ? !newsResult.value.success ? newsResult.value.reason || newsResult.value.error : ''
        : newsResult.reason instanceof Error ? newsResult.reason.message : '';
      setNewsError(reason || text.errorTitle);
    }

    if (moversResult.status === 'fulfilled') {
      setMovers(moversResult.value);
      setMoversUpdatedAt(moversResult.value.ok ? moversResult.value.updated_at : '');
    } else {
      setMovers(null);
      setMoversUpdatedAt('');
    }

    setLoading(false);
    setRefreshing(false);
  }, [activeLang, text.errorTitle, text.tickerEmpty]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadData(false), AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [newsSearch, newsSector, newsSource, newsSymbol, newsTime, newsSort]);

  const stockRows = useMemo(() => buildStockRows(tickerItems, prices, activeLang), [activeLang, prices, tickerItems]);

  useEffect(() => {
    if (compareSymbols.length > 0 || stockRows.length === 0) return;
    setCompareSymbols(stockRows.slice(0, 4).map(row => row.symbol));
  }, [compareSymbols.length, stockRows]);

  const lastUpdated = useMemo(() => newestTimestamp([tickerUpdatedAt, newsUpdatedAt, moversUpdatedAt]), [moversUpdatedAt, newsUpdatedAt, tickerUpdatedAt]);
  const moversSource = movers?.ok ? `${movers.source} · ${formatDateTime(movers.updated_at, locale)}` : text.delayed;

  return (
    <div className="defensive-hub" dir={dir}>
      <Sidebar />
      <main className="def-main">
        <div className="def-container">
          <DefensiveTicker items={tickerItems} loading={loading} error={marketError} lang={activeLang} locale={locale} text={text} />

          <header className="def-hero">
            <div className="def-hero-copy">
              <span className="def-badge"><ShieldCheck size={15} />{text.badge}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
              <small>{text.sourceNote}</small>
            </div>
            <div className="def-hero-side">
              <button type="button" onClick={() => void loadData(false)} disabled={refreshing}>
                <RefreshCcw size={16} className={refreshing ? 'spinning' : ''} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
              <span>{text.stockUpdated}: {tickerUpdatedAt ? formatDateTime(tickerUpdatedAt, locale) : text.notUpdated}</span>
              <span>{text.newsUpdated}: {newsUpdatedAt ? formatDateTime(newsUpdatedAt, locale) : text.notUpdated}</span>
            </div>
          </header>

          <nav className="def-tabs" aria-label={text.title} role="tablist">
            {(['overview', 'stocks', 'news', 'sectors'] as HubTab[]).map(tab => (
              <button type="button" role="tab" key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} aria-selected={activeTab === tab}>
                {text.tabs[tab]}
              </button>
            ))}
          </nav>

          <DataStatusCard text={text} locale={locale} tickerUpdatedAt={tickerUpdatedAt} newsUpdatedAt={newsUpdatedAt} source={moversSource} />

          {loading ? <div className="def-state loading"><Activity size={26} /><strong>{text.loading}</strong></div> : null}

          {activeTab === 'overview' ? (
            <OverviewTab stockRows={stockRows} loading={loading} locale={locale} lang={activeLang} text={text} compareSymbols={compareSymbols} setCompareSymbols={setCompareSymbols} />
          ) : null}

          {activeTab === 'stocks' ? (
            <StocksTab stockRows={stockRows} loading={loading} locale={locale} lang={activeLang} text={text} sectorFilter={stockSector} setSectorFilter={setStockSector} search={stockSearch} setSearch={setStockSearch} sort={stockSort} setSort={setStockSort} />
          ) : null}

          {activeTab === 'news' ? (
            <NewsTab newsItems={newsItems} loading={loading} error={newsError} locale={locale} lang={activeLang} text={text} retry={() => void loadData(true)} newsSearch={newsSearch} setNewsSearch={setNewsSearch} newsSector={newsSector} setNewsSector={setNewsSector} newsSource={newsSource} setNewsSource={setNewsSource} newsSymbol={newsSymbol} setNewsSymbol={setNewsSymbol} newsTime={newsTime} setNewsTime={setNewsTime} newsSort={newsSort} setNewsSort={setNewsSort} visibleCount={visibleCount} setVisibleCount={setVisibleCount} />
          ) : null}

          {activeTab === 'sectors' ? (
            <SectorsTab lang={activeLang} text={text} locale={locale} stockRows={stockRows} />
          ) : null}

          <section className="def-disclaimer">
            <Info size={20} />
            <div>
              <h2>{text.disclaimerTitle}</h2>
              <p>{text.disclaimerBody}</p>
            </div>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .defensive-hub{
          --def-bg:#EAF7FA;
          --def-bg-soft:#F6FBFF;
          --def-panel:#FFFFFF;
          --def-panel-soft:#F8FCFF;
          --def-text:#071C34;
          --def-muted:#61738A;
          --def-border:#D5E8F0;
          --def-border-strong:#A9DDE7;
          --def-primary:#1595F2;
          --def-accent:#24D5C5;
          --def-success:#16A34A;
          --def-warning:#B7791F;
          --def-danger:#DC2626;
          --def-shadow:0 22px 52px rgba(15,118,110,.12);
          min-height:100vh;
          background:
            radial-gradient(circle at 10% 0%,rgba(36,213,197,.22),transparent 34%),
            linear-gradient(180deg,var(--def-bg),var(--def-bg-soft));
          color:var(--def-text);
          direction:inherit;
        }
        .defensive-hub *{box-sizing:border-box}
        .def-main{
          min-width:0;
          padding-block:24px 56px;
        }
        .def-container{
          width:min(1500px,calc(100vw - var(--sidebar-width,280px) - 56px));
          margin-inline-start:calc(var(--sidebar-width,280px) + 24px);
          margin-inline-end:24px;
          display:grid;
          gap:20px;
        }
        [dir="ltr"].defensive-hub .def-container{
          margin-inline-start:calc(var(--sidebar-width,280px) + 24px);
          margin-inline-end:24px;
        }
        .def-card,.def-hero,.def-tabs,.def-data-status,.def-disclaimer,.def-filter-card,.def-stock-card,.def-news-card,.def-sector-card{
          border:1px solid var(--def-border);
          background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,252,255,.94));
          border-radius:24px;
          box-shadow:var(--def-shadow);
        }
        .def-ticker-panel{padding:8px 10px;overflow:hidden}
        .def-ticker-strip{display:flex;align-items:center;gap:9px;overflow:hidden;min-width:0}
        .def-ticker-viewport{
          flex:1;
          min-width:0;
          overflow:hidden;
          mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
        }
        .def-ticker-track{display:flex;align-items:center;gap:9px;width:max-content;animation:defTicker 48s linear infinite;will-change:transform}
        .def-ticker-strip:focus-within .def-ticker-track,.def-ticker-strip.is-paused .def-ticker-track{animation-play-state:paused}
        .def-ticker-set{display:flex;align-items:center;gap:9px;flex:none}
        .def-ticker-status{display:inline-flex;align-items:center;gap:6px;padding:0 10px;min-height:28px;border-radius:999px;background:#E0F2FE;color:#075985;font-size:11px;font-weight:900;white-space:nowrap}
        .def-ticker-item{width:178px;max-width:178px;min-width:178px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 9px;align-items:center;padding:8px 10px;border:1px solid var(--def-border);border-radius:14px;background:#fff}
        .def-ticker-copy{display:grid;gap:1px;min-width:0}
        .def-ticker-item strong{font-size:13px;font-weight:950;color:var(--def-text);line-height:1.15}
        .def-ticker-item small{font-size:10px;font-weight:850;color:var(--def-muted);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .def-ticker-item b{font-size:12px;font-weight:950;color:var(--def-text);line-height:1.15}
        .def-ticker-item em{grid-column:2;display:inline-flex;align-items:center;gap:4px;justify-self:end;border-radius:999px;padding:4px 7px;font-style:normal;font-size:10px;font-weight:950;line-height:1}
        .def-ticker-item.up em,.up{background:#DCFCE7;color:#166534}
        .def-ticker-item.down em,.down{background:#FEE2E2;color:#991B1B}
        .def-ticker-item.neutral em,.neutral{background:#E2E8F0;color:#334155}
        @keyframes defTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media(hover:hover) and (pointer:fine){
          .def-ticker-strip:hover .def-ticker-track{animation-play-state:paused}
        }

        .def-hero{
          position:relative;
          overflow:hidden;
          min-height:220px;
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(280px,380px);
          gap:24px;
          align-items:center;
          padding:28px;
          background:
            radial-gradient(circle at 8% 15%,rgba(36,213,197,.24),transparent 30%),
            linear-gradient(135deg,#061A2E,#0E4A5C 88%);
          color:white;
        }
        .def-hero:after{content:"";position:absolute;inset:18px;pointer-events:none;border:1px solid rgba(255,255,255,.08);border-radius:20px}
        .def-badge,.def-kicker{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:7px 12px;background:rgba(36,213,197,.14);border:1px solid rgba(36,213,197,.26);color:#9FF7EF;font-size:12px;font-weight:950}
        .def-hero h1{margin:14px 0 10px;font-size:clamp(34px,4vw,58px);line-height:1.05;font-weight:950;letter-spacing:0;color:#fff}
        .def-hero p{max-width:760px;margin:0;color:#DDF9FF;font-size:16px;font-weight:850;line-height:1.8}
        .def-hero small{display:block;margin-top:12px;color:#AFD8E4;font-size:12px;font-weight:850;line-height:1.7}
        .def-hero-side{position:relative;z-index:1;display:grid;gap:10px;justify-items:stretch}
        .def-hero-side button{min-height:48px;border:0;border-radius:16px;background:linear-gradient(135deg,var(--def-primary),var(--def-accent));color:#061A2E;font:950 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
        .def-hero-side span{min-height:40px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(255,255,255,.10);color:#E6FBFF;font-size:12px;font-weight:900}
        .spinning{animation:defSpin 1s linear infinite}
        @keyframes defSpin{to{transform:rotate(360deg)}}

        .def-tabs{display:flex;gap:8px;overflow-x:auto;padding:8px;background:rgba(255,255,255,.82);box-shadow:0 12px 30px rgba(10,43,74,.07)}
        .def-tabs button{flex:0 0 auto;min-height:44px;border:1px solid transparent;border-radius:16px;background:transparent;color:var(--def-muted);padding:0 18px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .def-tabs button.active{background:linear-gradient(135deg,var(--def-primary),var(--def-accent));color:#061A2E;box-shadow:0 12px 26px rgba(21,149,242,.18)}
        .def-tabs button:hover,.def-tabs button:focus-visible{outline:none;border-color:var(--def-accent)}
        .def-data-status{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;color:var(--def-muted);font-size:12px;font-weight:850}
        .def-data-status span{display:inline-flex;align-items:center;gap:7px;color:#075985}
        .def-data-status b{font-weight:900;color:var(--def-text)}
        .def-data-status small{margin-inline-start:auto;color:var(--def-muted);font-weight:850}

        .def-tab-panel{display:grid;gap:18px}
        .def-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
        .def-section-head h2{margin:0;color:var(--def-text);font-size:25px;font-weight:950}
        .def-section-head p{margin:6px 0 0;color:var(--def-muted);font-size:14px;font-weight:850;line-height:1.65}
        .def-section-head strong{display:inline-flex;align-items:center;min-height:36px;padding:0 13px;border-radius:999px;background:#E0F2FE;color:#075985;font-size:13px}

        .def-metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
        .def-metric-card{display:flex;gap:12px;align-items:flex-start;padding:16px;border:1px solid var(--def-border);border-radius:20px;background:#fff;box-shadow:0 12px 28px rgba(10,43,74,.06)}
        .def-metric-card > span{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:#E0F2FE;color:#075985}
        .def-metric-card small{display:block;color:var(--def-muted);font-size:12px;font-weight:850}
        .def-metric-card strong{display:block;margin-top:4px;color:var(--def-text);font-size:20px;font-weight:950}
        .def-metric-card em{display:block;margin-top:2px;color:var(--def-muted);font-style:normal;font-size:12px;font-weight:850}
        .def-grid-two{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,.75fr);gap:18px;align-items:start}
        .def-card{padding:20px}
        .def-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
        .def-card-head h3{margin:0;color:var(--def-text);font-size:19px;font-weight:950}
        .def-card-head p{margin:5px 0 0;color:var(--def-muted);font-size:13px;font-weight:850;line-height:1.65}
        .def-card-head > svg{color:var(--def-accent)}
        .def-bars{display:grid;gap:12px;margin:14px 0}
        .def-bar-row{display:grid;grid-template-columns:54px minmax(0,1fr) 72px;gap:10px;align-items:center}
        .def-bar-row > span,.def-bar-row b{font-size:12px;font-weight:950;color:var(--def-text)}
        .def-bar-track{height:12px;background:#E6F2F7;border-radius:999px;overflow:hidden}
        .def-bar-track i{display:block;height:100%;border-radius:999px}
        .def-bar-track i.up{background:linear-gradient(90deg,#16A34A,#86EFAC)}
        .def-bar-track i.down{background:linear-gradient(90deg,#DC2626,#FCA5A5)}
        .def-bar-track i.neutral{background:#CBD5E1}
        .def-compare-picker{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
        .def-compare-picker button{min-height:36px;border:1px solid var(--def-border);border-radius:12px;background:#fff;color:var(--def-text);padding:0 11px;font-weight:950;cursor:pointer}
        .def-compare-picker button.active{border-color:transparent;background:#CCFBF1;color:#0F766E}

        .def-accordion{display:grid;gap:8px}
        .def-accordion section{border:1px solid var(--def-border);border-radius:16px;background:#fff;overflow:hidden}
        .def-accordion button{width:100%;min-height:48px;border:0;background:transparent;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px;color:var(--def-text);font:950 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .def-accordion button span{display:inline-flex;align-items:center;gap:8px}
        .def-accordion p{margin:0;padding:0 14px 14px;color:var(--def-muted);line-height:1.8;font-size:13px;font-weight:850}
        .def-filter-card{display:grid;grid-template-columns:minmax(260px,1.4fr) minmax(180px,.6fr) minmax(180px,.6fr);gap:12px;padding:14px}
        .def-filter-card.news{grid-template-columns:minmax(280px,1.4fr) repeat(5,minmax(145px,.55fr)) auto}
        .def-filter-card label{display:grid;gap:7px;color:var(--def-muted);font-size:12px;font-weight:900}
        .def-search{position:relative}
        .def-search svg{position:absolute;inset-inline-start:14px;bottom:14px;color:#7890A7}
        .def-filter-card input,.def-filter-card select{width:100%;min-height:46px;border:1px solid var(--def-border);border-radius:15px;background:#F8FCFF;color:var(--def-text);padding:0 14px;font:900 13px Tajawal,Arial,sans-serif}
        .def-search input{padding-inline-start:42px}
        .def-filter-card button{min-height:46px;align-self:end;border:1px solid var(--def-border);border-radius:15px;background:#fff;color:var(--def-text);font-weight:950;cursor:pointer}
        .def-stock-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .def-stock-card{padding:18px;display:grid;gap:12px}
        .def-stock-card header{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .def-stock-card header span{width:52px;height:52px;border-radius:18px;background:#E0F2FE;color:#075985;display:grid;place-items:center;font-size:15px;font-weight:950}
        .def-stock-card header b{border-radius:999px;padding:5px 9px;font-size:12px}
        .def-stock-card h3{margin:0;color:var(--def-text);font-size:17px;font-weight:950}
        .def-stock-card > small{color:var(--def-muted);font-size:12px;font-weight:900}
        .def-stock-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .def-stock-metrics span{padding:10px;border:1px solid var(--def-border);border-radius:14px;background:#F8FCFF;display:grid;gap:4px}
        .def-stock-metrics small{color:var(--def-muted);font-size:11px;font-weight:850}
        .def-stock-metrics strong{color:var(--def-text);font-size:12px;font-weight:950}
        .def-stock-card a,.def-news-card footer a,.def-load-more button,.def-state button{min-height:42px;border-radius:14px;background:linear-gradient(135deg,var(--def-primary),var(--def-accent));color:#061A2E;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 13px;text-decoration:none;font-size:12px;font-weight:950;border:0;cursor:pointer}
        .def-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .def-featured-news{display:grid;gap:10px}
        .def-news-card{padding:16px;display:grid;gap:11px;align-content:start;box-shadow:0 12px 30px rgba(10,43,74,.07)}
        .def-news-card.featured{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:stretch;padding:18px}
        .def-news-art{min-height:210px;border-radius:18px;background:radial-gradient(circle at 20% 20%,rgba(36,213,197,.28),transparent 34%),linear-gradient(135deg,#061A2E,#0E4A5C);display:grid;place-items:center;color:#B9FFF7}
        .def-news-meta,.def-news-tags{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .def-news-meta span,.def-news-tags span{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#EFF8FF;color:#075985;padding:5px 9px;font-size:11px;font-weight:900}
        .def-news-card h3{margin:0;color:var(--def-text);font-size:18px;font-weight:950;line-height:1.55}
        .def-news-card p{margin:0;color:#4A5F78;font-size:13px;font-weight:820;line-height:1.75;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .def-stock-context{border:1px solid var(--def-border);border-radius:16px;background:#F8FCFF;padding:11px;display:grid;gap:7px}
        .def-stock-context small{color:var(--def-muted);font-size:11px;font-weight:850}
        .def-stock-context div{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .def-stock-context b,.def-stock-context strong{color:var(--def-text);font-weight:950;font-size:12px}
        .def-stock-context em{border-radius:999px;padding:4px 8px;font-style:normal;font-size:11px;font-weight:950}
        .def-news-card footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto}
        .def-news-card footer button{min-height:38px;border:1px solid var(--def-border);border-radius:13px;background:#fff;color:var(--def-text);font-size:12px;font-weight:950;cursor:pointer}
        .def-disabled-link{color:var(--def-muted);font-size:12px;font-weight:850}
        .def-load-more{display:grid;place-items:center;margin-top:4px}
        .def-load-more span{color:var(--def-muted);font-size:13px;font-weight:850}
        .def-sector-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .def-sector-card{padding:20px;display:grid;gap:10px}
        .def-sector-card > span{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:#E0F2FE;color:#075985}
        .def-sector-card h3{margin:0;color:var(--def-text);font-size:20px;font-weight:950}
        .def-sector-card p,.def-sector-card small{margin:0;color:var(--def-muted);font-size:13px;font-weight:850;line-height:1.7}
        .def-sector-card div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .def-sector-card div b{padding:9px;border-radius:13px;background:#F8FCFF;border:1px solid var(--def-border);font-size:12px}
        .def-sector-card footer{display:flex;flex-wrap:wrap;gap:8px}
        .def-sector-card footer a{border:1px solid var(--def-border);border-radius:999px;background:#fff;color:#075985;text-decoration:none;padding:6px 10px;font-size:12px;font-weight:950}
        .def-state{min-height:180px;display:grid;place-items:center;gap:10px;text-align:center;padding:28px;border:1px dashed var(--def-border-strong);border-radius:24px;background:rgba(255,255,255,.72);color:var(--def-muted)}
        .def-state strong{color:var(--def-text);font-size:17px;font-weight:950}
        .def-state p{margin:0;color:var(--def-muted);font-size:13px;font-weight:850}
        .def-state.mini{min-height:120px}
        .def-disclaimer{display:flex;gap:12px;align-items:flex-start;padding:18px}
        .def-disclaimer svg{color:var(--def-warning)}
        .def-disclaimer h2{margin:0;color:var(--def-text);font-size:16px;font-weight:950}
        .def-disclaimer p{margin:5px 0 0;color:var(--def-muted);font-size:13px;font-weight:850;line-height:1.7}
        .def-skeleton span,.def-skeleton i,.def-skeleton b,.def-skeleton-row span{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.12),rgba(36,213,197,.18),rgba(142,166,195,.12));background-size:220% 100%;animation:defShimmer 1.2s linear infinite}
        .def-skeleton{min-height:220px}.def-skeleton span{height:24px;width:45%}.def-skeleton i{height:14px;width:100%}.def-skeleton b{height:40px;width:60%}.def-skeleton-row{display:flex;gap:9px}.def-skeleton-row span{height:54px;min-width:178px}
        @keyframes defShimmer{to{background-position:-220% 0}}

        @media(max-width:1280px){
          .def-container{width:calc(100vw - var(--sidebar-width,280px) - 56px)}
          .def-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
          .def-grid-two,.def-news-card.featured{grid-template-columns:1fr}
          .def-stock-grid,.def-news-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .def-filter-card.news{grid-template-columns:1fr 1fr 1fr}
        }
        @media(max-width:1024px){
          .defensive-hub .def-container{width:calc(100% - 28px);margin-inline-start:auto;margin-inline-end:auto}
          .def-main{padding-top:94px}
          .def-hero{grid-template-columns:1fr}
          .def-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .def-filter-card,.def-filter-card.news{grid-template-columns:1fr 1fr}
        }
        @media(max-width:720px){
          .defensive-hub .def-container{width:calc(100% - 24px);margin-inline-start:auto;margin-inline-end:auto;gap:16px}
          .def-hero{padding:20px;border-radius:24px}
          .def-hero h1{font-size:34px}
          .def-hero-side span{justify-content:flex-start;padding-inline:12px;text-align:start}
          .def-data-status{display:grid}
          .def-data-status small{margin-inline-start:0}
          .def-section-head{display:grid}
          .def-metric-grid,.def-stock-grid,.def-news-grid,.def-sector-grid,.def-filter-card,.def-filter-card.news{grid-template-columns:1fr}
          .def-stock-metrics,.def-sector-card div{grid-template-columns:1fr}
          .def-ticker-panel{padding:7px 8px}
          .def-ticker-strip{gap:7px}
          .def-ticker-status{min-height:26px;padding:0 8px;font-size:10px}
          .def-ticker-viewport{overflow:hidden}
          .def-ticker-track{gap:8px;animation-duration:42s}
          .def-ticker-set{gap:8px}
          .def-ticker-item{width:160px;max-width:160px;min-width:160px;padding:7px 9px;border-radius:13px}
          .def-ticker-item strong{font-size:12px}
          .def-ticker-item small{font-size:9.5px}
          .def-ticker-item b{font-size:11px}
          .def-ticker-item em{font-size:9.5px;padding:3px 6px}
          .def-tabs{overflow-x:auto}
        }
        @media(prefers-reduced-motion:reduce){
          .def-ticker-track,.def-skeleton span,.def-skeleton i,.def-skeleton b,.def-skeleton-row span{animation:none}
          .spinning{animation:none}
        }
      `}</style>
    </div>
  );
}

export default DefensiveStocksNewsPage;
