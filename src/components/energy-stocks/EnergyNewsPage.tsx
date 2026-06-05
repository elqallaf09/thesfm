'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ExternalLink,
  Factory,
  Globe2,
  Info,
  Layers3,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from '@/components/defensive-stocks/DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type EnergyFilterId =
  | 'all'
  | 'oil_gas'
  | 'brent'
  | 'wti'
  | 'natural_gas'
  | 'renewables'
  | 'oil_services'
  | 'opec'
  | 'inventories'
  | 'earnings'
  | 'dividends_buybacks'
  | 'analysis';
type WatchlistFilter = 'oil_gas' | 'oil_services' | 'pipelines' | 'renewables' | 'movers';

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

const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const FEATURED_SYMBOLS = ['XOM', 'CVX', 'SHEL', 'BP', 'TTE', 'COP', 'EOG', 'OXY', 'SLB', 'HAL', 'BKR', 'LNG', 'ENB', 'KMI', 'FSLR', 'ENPH', 'NEE', 'BEP'] as const;

const TEXT = {
  ar: {
    title: 'أخبار الطاقة',
    subtitle: 'تغطية شاملة لأخبار أسواق الطاقة وأسهم النفط والغاز والطاقة المتجددة والخدمات النفطية، مع تحديثات مباشرة للأسعار والأخبار والتحليلات.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'آخر سعر متاح من مزود بيانات حقيقي',
    liveStatus: 'آخر سعر متاح',
    tickerTitle: 'شريط أسهم الطاقة المباشر',
    tickerSubtitle: 'أسعار حقيقية لأسهم الطاقة المختارة مع التغير اليومي والقطاع المرتبط بها.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حالياً',
    snapshotTitle: 'نظرة سريعة على سوق الطاقة',
    snapshotSubtitle: 'أسعار سلع ومؤشرات طاقة من مزودي بيانات حقيقيين عند توفرها.',
    commodityEmpty: 'لا توجد بيانات سلع متاحة حالياً',
    unit: 'الوحدة',
    source: 'المصدر',
    sector: 'القطاع',
    whatTitle: 'ما هي أسهم الطاقة؟',
    whatBody: 'أسهم الطاقة تشمل شركات النفط والغاز والاستكشاف والإنتاج والتكرير وخطوط الأنابيب والخدمات النفطية والطاقة المتجددة.',
    whatPoints: ['مرتبطة بأسعار النفط والغاز', 'تتأثر بالطلب العالمي', 'حساسة للتوترات الجيوسياسية', 'تشمل الطاقة التقليدية والمتجددة'],
    contextTitle: 'سياق السلع والطاقة',
    contextRows: ['سعر خام WTI', 'سعر خام Brent', 'الغاز الطبيعي', 'مخزونات النفط الأمريكية', 'قرارات أوبك+', 'الطلب العالمي', 'قوة الدولار', 'تكاليف الإنتاج والنقل'],
    contextBody: 'هذه العوامل تساعد في تفسير حركة أسعار الطاقة وأسهم القطاع.',
    driversTitle: 'محركات ومخاطر أسهم الطاقة',
    supportTitle: 'عوامل داعمة',
    riskTitle: 'مخاطر القطاع',
    movementTitle: 'حركة أسهم الطاقة',
    movementSubtitle: 'أبرز التحركات اليومية المتاحة من بيانات السوق الحقيقية.',
    sectorGuideTitle: 'قطاعات الطاقة الرئيسية',
    newsTitle: 'أخبار الطاقة',
    newsSubtitle: 'تابع أحدث أخبار النفط والغاز والطاقة المتجددة وشركات القطاع وتحركات الأسعار.',
    searchPlaceholder: 'ابحث عن خبر أو رمز أو سلعة أو تصنيف...',
    filtersLabel: 'التصنيفات',
    showMore: 'تحميل المزيد',
    showing: 'المعروض',
    results: 'خبر',
    readArticle: 'قراءة الخبر',
    noLink: 'الرابط غير متاح',
    emptyTitle: 'لا توجد أخبار متاحة حالياً لهذا التصنيف',
    emptyHint: 'جرّب بحثاً آخر أو اختر تصنيفاً مختلفاً.',
    errorTitle: 'تعذر تحميل البيانات حالياً',
    errorBody: 'تعذر جلب أخبار الطاقة من المصادر الحقيقية حالياً.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز أسهم الطاقة',
    featuredSubtitle: 'بطاقات مختصرة مبنية على الأسعار الحقيقية المتاحة حالياً دون مؤشرات مصطنعة.',
    details: 'عرض التفاصيل',
    unavailable: 'غير متاح',
    priceSource: 'مصدر السعر',
    watchlistTitle: 'قائمة متابعة الطاقة',
    watchlistSubtitle: 'تصفية سريعة للأسهم التي تم جلب أسعارها فعلياً في هذه الصفحة.',
    opportunityTitle: 'متى تكون أسهم الطاقة قوية؟',
    opportunityPoints: ['ارتفاع أسعار النفط والغاز', 'زيادة الطلب العالمي على الطاقة', 'انخفاض المعروض أو توترات جيوسياسية', 'نمو التدفقات النقدية', 'برامج إعادة شراء الأسهم', 'قوة توزيعات الأرباح لبعض الشركات'],
    riskPoints: ['هبوط أسعار السلع', 'قرارات أوبك+ المفاجئة', 'تباطؤ الاقتصاد العالمي', 'ارتفاع تكاليف الإنتاج', 'ضغوط تنظيمية وبيئية', 'قوة الدولار وتأثيرها على السلع'],
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست توصية شراء أو بيع. أسهم الطاقة قد تكون شديدة الحساسية لتغيرات أسعار النفط والغاز، قرارات أوبك+، التوترات الجيوسياسية، أسعار الفائدة، وقوة الدولار. يرجى إجراء بحثك الخاص أو استشارة مستشار مالي قبل اتخاذ أي قرار استثماري.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    noMore: 'تم عرض كل الأخبار المتاحة',
    examples: 'أمثلة',
  },
  en: {
    title: 'Energy News',
    subtitle: 'Comprehensive coverage of energy markets, oil and gas stocks, renewable energy, and oilfield services with live price, news, and analysis updates.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Last available price from a real data provider',
    liveStatus: 'Last available price',
    tickerTitle: 'Live energy stock ticker',
    tickerSubtitle: 'Real prices for selected energy stocks with daily change and sector context.',
    tickerEmpty: 'No price data is available right now',
    snapshotTitle: 'Energy market snapshot',
    snapshotSubtitle: 'Energy commodities and ETFs from real providers when available.',
    commodityEmpty: 'No commodity data is available right now',
    unit: 'Unit',
    source: 'Source',
    sector: 'Sector',
    whatTitle: 'What are energy stocks?',
    whatBody: 'Energy stocks include oil, gas, exploration, production, refining, pipelines, services, and renewable energy companies.',
    whatPoints: ['Linked to oil and gas prices', 'Affected by global demand', 'Sensitive to geopolitics', 'Include traditional and renewable energy'],
    contextTitle: 'Commodity and energy context',
    contextRows: ['WTI crude', 'Brent crude', 'Natural gas', 'US oil inventories', 'OPEC+ decisions', 'Global demand', 'US dollar strength', 'Production and transport costs'],
    contextBody: 'These factors help explain energy commodity and sector moves.',
    driversTitle: 'Energy stock drivers and risks',
    supportTitle: 'Supportive factors',
    riskTitle: 'Sector risks',
    movementTitle: 'Energy stock movers',
    movementSubtitle: 'Daily movers from real market data.',
    sectorGuideTitle: 'Major energy sectors',
    newsTitle: 'Energy news',
    newsSubtitle: 'Follow oil, gas, renewables, sector companies, and price moves.',
    searchPlaceholder: 'Search news, ticker, commodity, or category...',
    filtersLabel: 'Categories',
    showMore: 'Load more',
    showing: 'Showing',
    results: 'news',
    readArticle: 'Read article',
    noLink: 'Link unavailable',
    emptyTitle: 'No news available for this filter',
    emptyHint: 'Try another search or choose a different category.',
    errorTitle: 'Unable to load data right now',
    errorBody: 'Real energy news could not be loaded right now.',
    retry: 'Retry',
    featuredTitle: 'Featured energy stocks',
    featuredSubtitle: 'Compact cards built from currently available real prices without invented metrics.',
    details: 'View details',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    watchlistTitle: 'Energy watchlist',
    watchlistSubtitle: 'Quick filters for stocks with prices loaded on this page.',
    opportunityTitle: 'When are energy stocks strong?',
    opportunityPoints: ['Oil and gas prices rise', 'Global energy demand increases', 'Supply tightens or geopolitics intensify', 'Cash flows grow', 'Buyback programs expand', 'Dividends strengthen at some companies'],
    riskPoints: ['Commodity prices fall', 'Unexpected OPEC+ decisions', 'Global economy slows', 'Production costs rise', 'Regulatory and environmental pressure', 'US dollar strength weighs on commodities'],
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for educational and general information only, not a buy or sell recommendation. Energy stocks can be very sensitive to oil and gas prices, OPEC+ decisions, geopolitics, interest rates, and the US dollar. Do your own research or consult a financial advisor before investing.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    noMore: 'All available news is visible',
    examples: 'Examples',
  },
  fr: {
    title: 'Actualités de l’énergie',
    subtitle: 'Couverture des marchés énergie, pétrole et gaz, renouvelables et services pétroliers avec prix et actualités réels.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Dernier prix disponible depuis un fournisseur réel',
    liveStatus: 'Dernier prix disponible',
    tickerTitle: 'Bandeau actions énergie',
    tickerSubtitle: 'Prix réels des actions énergie sélectionnées.',
    tickerEmpty: 'Aucun prix disponible pour le moment',
    snapshotTitle: 'Aperçu du marché énergie',
    snapshotSubtitle: 'Matières premières et ETF énergie depuis des fournisseurs réels.',
    commodityEmpty: 'Aucune donnée de matière première disponible',
    unit: 'Unité',
    source: 'Source',
    sector: 'Secteur',
    whatTitle: 'Que sont les actions énergie ?',
    whatBody: 'Elles incluent pétrole, gaz, exploration, production, pipelines, services et renouvelables.',
    whatPoints: ['Liées aux prix pétrole/gaz', 'Affectées par la demande mondiale', 'Sensibles à la géopolitique', 'Énergie traditionnelle et renouvelable'],
    contextTitle: 'Contexte énergie',
    contextRows: ['WTI', 'Brent', 'Gaz naturel', 'Stocks pétroliers US', 'Décisions OPEP+', 'Demande mondiale', 'Force du dollar', 'Coûts production/transport'],
    contextBody: 'Ces facteurs expliquent les mouvements du secteur.',
    driversTitle: 'Moteurs et risques énergie',
    supportTitle: 'Facteurs favorables',
    riskTitle: 'Risques du secteur',
    movementTitle: 'Mouvements des actions énergie',
    movementSubtitle: 'Mouvements quotidiens issus de données réelles.',
    sectorGuideTitle: 'Principaux secteurs énergie',
    newsTitle: 'Actualités énergie',
    newsSubtitle: 'Suivez pétrole, gaz, renouvelables, sociétés du secteur et prix.',
    searchPlaceholder: 'Rechercher une actualité, un symbole ou une catégorie...',
    filtersLabel: 'Catégories',
    showMore: 'Afficher plus',
    showing: 'Affiché',
    results: 'actualités',
    readArticle: 'Lire l’article',
    noLink: 'Lien indisponible',
    emptyTitle: 'Aucune actualité disponible pour ce filtre',
    emptyHint: 'Essayez une autre recherche ou catégorie.',
    errorTitle: 'Impossible de charger les données',
    errorBody: 'Les actualités réelles ne peuvent pas être chargées.',
    retry: 'Réessayer',
    featuredTitle: 'Actions énergie en vedette',
    featuredSubtitle: 'Cartes basées sur les prix réels disponibles.',
    details: 'Voir détails',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    watchlistTitle: 'Liste énergie',
    watchlistSubtitle: 'Filtres rapides pour les actions chargées.',
    opportunityTitle: 'Quand les actions énergie sont fortes ?',
    opportunityPoints: ['Prix pétrole/gaz en hausse', 'Demande mondiale en hausse', 'Offre tendue ou géopolitique', 'Flux de trésorerie en hausse', 'Rachats d’actions', 'Dividendes solides'],
    riskPoints: ['Prix des matières premières en baisse', 'Décisions OPEP+ inattendues', 'Ralentissement mondial', 'Coûts de production en hausse', 'Pressions réglementaires', 'Dollar fort'],
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement, pas une recommandation. Les actions énergie sont sensibles aux prix, à l’OPEP+, à la géopolitique, aux taux et au dollar.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    noMore: 'Toutes les actualités disponibles sont visibles',
    examples: 'Exemples',
  },
} satisfies Record<LangCode, Record<string, string | string[]>>;

const FILTERS: Array<{ id: EnergyFilterId; label: Record<LangCode, string>; keywords: string[]; sectors: string[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'oil_gas', label: { ar: 'النفط والغاز', en: 'Oil & gas', fr: 'Pétrole et gaz' }, keywords: ['oil', 'gas', 'crude', 'exxon', 'chevron', 'shell', 'bp', 'totalenergies'], sectors: ['oil_gas', 'integrated_oil_gas', 'exploration_production'] },
  { id: 'brent', label: { ar: 'خام برنت', en: 'Brent', fr: 'Brent' }, keywords: ['brent', 'bz=f', 'north sea'], sectors: [] },
  { id: 'wti', label: { ar: 'خام WTI', en: 'WTI', fr: 'WTI' }, keywords: ['wti', 'west texas', 'cl=f', 'us crude'], sectors: [] },
  { id: 'natural_gas', label: { ar: 'الغاز الطبيعي', en: 'Natural gas', fr: 'Gaz naturel' }, keywords: ['natural gas', 'lng', 'henry hub', 'ng=f'], sectors: ['natural_gas'] },
  { id: 'renewables', label: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, keywords: ['renewable', 'solar', 'clean energy', 'first solar', 'enphase', 'plug power'], sectors: ['renewables', 'solar'] },
  { id: 'oil_services', label: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services pétroliers' }, keywords: ['oilfield services', 'drilling', 'services', 'schlumberger', 'halliburton', 'baker hughes'], sectors: ['oil_services'] },
  { id: 'opec', label: { ar: 'أوبك+', en: 'OPEC+', fr: 'OPEP+' }, keywords: ['opec', 'opec+', 'production cut', 'production increase'], sectors: [] },
  { id: 'inventories', label: { ar: 'المخزونات الأمريكية', en: 'US inventories', fr: 'Stocks US' }, keywords: ['inventory', 'inventories', 'eia', 'api report', 'stockpiles'], sectors: [] },
  { id: 'earnings', label: { ar: 'نتائج الشركات', en: 'Company results', fr: 'Résultats' }, keywords: ['earnings', 'revenue', 'guidance', 'cash flow', 'profit'], sectors: [] },
  { id: 'dividends_buybacks', label: { ar: 'توزيعات وإعادة شراء', en: 'Dividends & buybacks', fr: 'Dividendes et rachats' }, keywords: ['dividend', 'buyback', 'share repurchase', 'payout'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & reports', fr: 'Analyses' }, keywords: ['analysis', 'analyst', 'rating', 'report', 'target', 'upgrade', 'downgrade'], sectors: [] },
];

const SECTOR_GUIDES = [
  {
    id: 'oil_gas' as EnergyFilterId,
    watch: 'oil_gas' as WatchlistFilter,
    icon: Globe2,
    symbols: ['XOM', 'CVX', 'SHEL', 'BP', 'TTE'],
    title: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil and gas', fr: 'Pétrole et gaz intégrés' },
    body: { ar: 'شركات كبرى تجمع الإنتاج والتكرير والتسويق وتتحرك مع أسعار الخام والهوامش.', en: 'Majors spanning production, refining, and marketing.', fr: 'Majors intégrées production, raffinage et marketing.' },
  },
  {
    id: 'oil_gas' as EnergyFilterId,
    watch: 'oil_gas' as WatchlistFilter,
    icon: Activity,
    symbols: ['OXY', 'EOG', 'COP'],
    title: { ar: 'الاستكشاف والإنتاج', en: 'Exploration and production', fr: 'Exploration-production' },
    body: { ar: 'شركات أكثر ارتباطاً بسعر النفط والغاز وتكاليف الحفر والإنتاج.', en: 'More directly tied to oil and gas prices and production costs.', fr: 'Plus liées aux prix et aux coûts de production.' },
  },
  {
    id: 'oil_services' as EnergyFilterId,
    watch: 'oil_services' as WatchlistFilter,
    icon: Factory,
    symbols: ['BKR', 'HAL', 'SLB'],
    title: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services pétroliers' },
    body: { ar: 'معدات وخدمات الحفر والإنتاج، وتتأثر بإنفاق شركات الطاقة الرأسمالي.', en: 'Drilling and production services tied to capital spending.', fr: 'Services liés au capex des producteurs.' },
  },
  {
    id: 'natural_gas' as EnergyFilterId,
    watch: 'pipelines' as WatchlistFilter,
    icon: Building2,
    symbols: ['LNG', 'TRP', 'KMI', 'ENB'],
    title: { ar: 'خطوط الأنابيب والبنية التحتية', en: 'Pipelines and infrastructure', fr: 'Pipelines et infrastructure' },
    body: { ar: 'نقل ومعالجة الغاز والنفط، وغالباً ما ترتبط بعقود وتدفقات نقدية طويلة الأجل.', en: 'Transport and processing networks often tied to long-term cash flows.', fr: 'Réseaux avec flux souvent contractuels.' },
  },
  {
    id: 'renewables' as EnergyFilterId,
    watch: 'renewables' as WatchlistFilter,
    icon: Zap,
    symbols: ['BEP', 'NEE', 'ENPH', 'FSLR'],
    title: { ar: 'الطاقة المتجددة', en: 'Renewable energy', fr: 'Énergies renouvelables' },
    body: { ar: 'الطاقة الشمسية والمتجددة تتأثر بالفائدة، السياسات، والطلب على الكهرباء النظيفة.', en: 'Solar and renewables are affected by rates, policy, and clean-power demand.', fr: 'Renouvelables sensibles aux taux, politiques et demande.' },
  },
  {
    id: 'analysis' as EnergyFilterId,
    watch: 'movers' as WatchlistFilter,
    icon: BarChart3,
    symbols: ['TAN', 'ICLN', 'XLE'],
    title: { ar: 'صناديق ومؤشرات الطاقة', en: 'Energy ETFs and benchmarks', fr: 'ETF et indices énergie' },
    body: { ar: 'مؤشرات وصناديق تساعد على قراءة أداء القطاع التقليدي والمتجدد.', en: 'ETFs and benchmarks help read traditional and renewable energy performance.', fr: 'ETF et indices pour lire le secteur.' },
  },
];

const SECTOR_GUIDE_ALIASES: Record<string, number> = {
  integrated_oil_gas: 0,
  exploration_production: 1,
  oil_services: 2,
  pipelines: 3,
  natural_gas: 3,
  renewables: 4,
  solar: 4,
  energy_etf: 5,
  renewables_etf: 5,
  solar_etf: 5,
};

const ENERGY_SYMBOL_NAMES: Record<string, string> = {
  XOM: 'Exxon Mobil',
  CVX: 'Chevron',
  SHEL: 'Shell',
  BP: 'BP',
  TTE: 'TotalEnergies',
  OXY: 'Occidental Petroleum',
  EOG: 'EOG Resources',
  COP: 'ConocoPhillips',
  BKR: 'Baker Hughes',
  HAL: 'Halliburton',
  SLB: 'Schlumberger',
  LNG: 'Cheniere Energy',
  TRP: 'TC Energy',
  KMI: 'Kinder Morgan',
  ENB: 'Enbridge',
  BEP: 'Brookfield Renewable Partners',
  NEE: 'NextEra Energy',
  ENPH: 'Enphase Energy',
  FSLR: 'First Solar',
  TAN: 'Invesco Solar ETF',
  ICLN: 'iShares Global Clean Energy ETF',
  XLE: 'Energy Select Sector SPDR Fund',
};

const FEATURED_META: Record<string, { sector: Record<LangCode, string>; body: Record<LangCode, string> }> = {
  XOM: { sector: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil & gas', fr: 'Intégré' }, body: { ar: 'شركة طاقة كبرى تتحرك مع أسعار النفط والغاز وهوامش التكرير.', en: 'Energy major tied to oil, gas, and refining margins.', fr: 'Major liée aux prix et marges.' } },
  CVX: { sector: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil & gas', fr: 'Intégré' }, body: { ar: 'شركة طاقة متكاملة ضمن أكبر شركات القطاع عالمياً.', en: 'Integrated global energy company.', fr: 'Société énergétique intégrée.' } },
  SHEL: { sector: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil & gas', fr: 'Intégré' }, body: { ar: 'شركة طاقة عالمية تشمل النفط والغاز والغاز الطبيعي المسال.', en: 'Global energy company spanning oil, gas, and LNG.', fr: 'Énergie mondiale pétrole, gaz et GNL.' } },
  BP: { sector: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil & gas', fr: 'Intégré' }, body: { ar: 'شركة طاقة دولية تتأثر بأسعار الخام واستراتيجية التحول.', en: 'International energy company affected by crude prices and transition strategy.', fr: 'Énergie internationale et transition.' } },
  TTE: { sector: { ar: 'النفط والغاز المتكامل', en: 'Integrated oil & gas', fr: 'Intégré' }, body: { ar: 'شركة طاقة عالمية تجمع النفط والغاز والكهرباء منخفضة الكربون.', en: 'Global energy group across oil, gas, and low-carbon power.', fr: 'Groupe énergie mondial diversifié.' } },
  COP: { sector: { ar: 'الاستكشاف والإنتاج', en: 'Exploration & production', fr: 'E&P' }, body: { ar: 'منتج نفط وغاز يرتبط مباشرة بدورة أسعار الطاقة.', en: 'Oil and gas producer directly tied to energy price cycles.', fr: 'Producteur lié aux prix énergie.' } },
  EOG: { sector: { ar: 'الاستكشاف والإنتاج', en: 'Exploration & production', fr: 'E&P' }, body: { ar: 'منتج طاقة أمريكي يتأثر بالإنتاج وتكاليف الحفر.', en: 'US energy producer affected by output and drilling costs.', fr: 'Producteur US sensible aux coûts.' } },
  OXY: { sector: { ar: 'الاستكشاف والإنتاج', en: 'Exploration & production', fr: 'E&P' }, body: { ar: 'شركة إنتاج نفط وغاز مع حساسية واضحة لأسعار الخام.', en: 'Oil and gas producer with clear crude-price sensitivity.', fr: 'Producteur sensible au brut.' } },
  SLB: { sector: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services' }, body: { ar: 'خدمات نفطية عالمية مرتبطة بإنفاق الحفر والإنتاج.', en: 'Global oilfield services tied to drilling and production spend.', fr: 'Services liés au forage.' } },
  HAL: { sector: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services' }, body: { ar: 'خدمات ومعدات حقول نفطية تتأثر بدورات الاستثمار.', en: 'Oilfield equipment and services affected by investment cycles.', fr: 'Services et équipements pétroliers.' } },
  BKR: { sector: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services' }, body: { ar: 'معدات وخدمات طاقة تشمل الغاز الطبيعي والحلول الصناعية.', en: 'Energy technology and services across gas and industrial markets.', fr: 'Technologies et services énergie.' } },
  LNG: { sector: { ar: 'الغاز والبنية التحتية', en: 'Gas infrastructure', fr: 'Infrastructure gaz' }, body: { ar: 'غاز طبيعي مسال وبنية تصدير تتأثر بالطلب العالمي على الغاز.', en: 'LNG export infrastructure tied to global gas demand.', fr: 'GNL lié à la demande mondiale.' } },
  ENB: { sector: { ar: 'خطوط الأنابيب', en: 'Pipelines', fr: 'Pipelines' }, body: { ar: 'شبكات نقل طاقة وبنية تحتية ذات تدفقات تعاقدية.', en: 'Energy transport infrastructure with contracted cash flows.', fr: 'Transport énergie contractuel.' } },
  KMI: { sector: { ar: 'خطوط الأنابيب', en: 'Pipelines', fr: 'Pipelines' }, body: { ar: 'بنية تحتية للغاز والنفط تتحرك مع حجم النقل والعقود.', en: 'Gas and oil infrastructure tied to transport volumes and contracts.', fr: 'Infrastructure gaz et pétrole.' } },
  FSLR: { sector: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, body: { ar: 'طاقة شمسية مرتبطة بالطلب على المشاريع والسياسات.', en: 'Solar manufacturer tied to project demand and policy.', fr: 'Solaire lié à la demande et politiques.' } },
  ENPH: { sector: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, body: { ar: 'حلول طاقة شمسية تتأثر بالفائدة ودورة الإنفاق السكني.', en: 'Solar technology affected by rates and residential spending.', fr: 'Technologie solaire sensible aux taux.' } },
  NEE: { sector: { ar: 'المرافق والطاقة المتجددة', en: 'Utilities & renewables', fr: 'Services et renouvelables' }, body: { ar: 'مرافق وطاقة متجددة ضمن مراقبة قطاع الكهرباء النظيفة.', en: 'Utility and renewable power company watched in clean power.', fr: 'Services publics et renouvelables.' } },
  BEP: { sector: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' }, body: { ar: 'أصول طاقة متجددة عالمية تتأثر بالفائدة وأسعار الكهرباء.', en: 'Global renewable assets affected by rates and power prices.', fr: 'Actifs renouvelables mondiaux.' } },
};

function localeFor(lang: LangCode) {
  if (lang === 'ar') return 'ar-KW';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function arrayText(value: string | string[]) {
  return Array.isArray(value) ? value : [value];
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCommodityPrice(item: EnergyCommodity, locale: string) {
  if (typeof item.price !== 'number' || !Number.isFinite(item.price)) return '—';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: item.unit.includes('MMBtu') || item.unit.includes('gallon') ? 3 : 2,
    minimumFractionDigits: item.unit.includes('MMBtu') || item.unit.includes('gallon') ? 3 : 2,
  }).format(item.price);
}

function formatPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function relativeTime(value: string, lang: LangCode) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (absMs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return rtf.format(Math.round(diffMs / 1000), 'second');
}

function changeTone(value: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function newestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? '';
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.reason === 'string' ? body.reason : `HTTP ${response.status}`);
  return body as T;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

function textForSearch(item: EnergyNewsItem) {
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
  ].filter(Boolean).join(' ').toLowerCase();
}

function itemMatchesSearch(item: EnergyNewsItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return textForSearch(item).includes(normalized);
}

function itemMatchesFilter(item: EnergyNewsItem, filterId: EnergyFilterId) {
  if (filterId === 'all') return true;
  const filter = FILTERS.find(entry => entry.id === filterId);
  if (!filter) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (filter.sectors.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return filter.keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function displayTitle(item: EnergyNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: EnergyNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function categoryLabelForItem(item: EnergyNewsItem, lang: LangCode) {
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  const filter = FILTERS.find(entry => entry.id !== 'all' && entry.sectors.some(sector => sectors.includes(sector)))
    ?? FILTERS.find(entry => entry.id !== 'all' && entry.keywords.some(keyword => textForSearch(item).includes(keyword.toLowerCase())));
  return filter?.label[lang] ?? FILTERS[0].label[lang];
}

function sectorLabel(sector: string | undefined, lang: LangCode) {
  if (!sector) return '';
  const aliasGuide = SECTOR_GUIDES[SECTOR_GUIDE_ALIASES[sector]];
  if (aliasGuide) return aliasGuide.title[lang];
  const guide = SECTOR_GUIDES.find(item => item.watch === sector || item.id === sector || item.symbols.some(symbol => symbol === sector));
  if (guide) return guide.title[lang];
  const filter = FILTERS.find(item => item.sectors.includes(sector) || item.id === sector);
  return filter?.label[lang] ?? sector;
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <span className={`${styles.skeletonLine} ${wide ? styles.skeletonWide : ''}`} />;
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: ComponentType<{ size?: number }>; title: string; subtitle?: string }) {
  return (
    <div className={styles.panelTitle}>
      <span><Icon size={19} /></span>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function EnergyTicker({ items, loading, error, text, lang, locale }: {
  items: EnergyTickerItem[];
  loading: boolean;
  error: string;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  return (
    <section className={styles.tickerPanel} aria-label={text.tickerTitle as string}>
      <PanelTitle icon={Zap} title={text.tickerTitle as string} subtitle={text.tickerSubtitle as string} />
      {loading ? (
        <div className={styles.tickerSkeletonRow} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
        </div>
      ) : items.length > 0 ? (
        <div className={styles.tickerStrip}>
          <span className={styles.tickerStatus}>{text.liveStatus as string}</span>
          <div className={styles.tickerViewport}>
            <div className={styles.tickerTrack}>
              {[0, 1].map(setIndex => (
                <div className={styles.tickerSet} aria-hidden={setIndex === 1} key={setIndex}>
                  {items.map(item => {
                    const tone = changeTone(item.changePercent);
                    return (
                      <article className={styles.tickerItem} key={`${setIndex}-${item.symbol}`}>
                        <div>
                          <strong dir="ltr">{item.symbol}</strong>
                          <span>{item.name}</span>
                          <span>{sectorLabel(item.sector, lang)}</span>
                        </div>
                        <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                        <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.inlineState} role="status">
          <AlertTriangle size={18} />
          <span>{error || text.tickerEmpty as string}</span>
        </div>
      )}
    </section>
  );
}

function MarketSnapshot({ items, loading, error, text, lang, locale }: {
  items: EnergyCommodity[];
  loading: boolean;
  error: string;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const hasAnyAvailable = items.some(item => item.available);
  return (
    <section className={styles.moversMiniPanel} aria-label={text.snapshotTitle as string}>
      <PanelTitle icon={BarChart3} title={text.snapshotTitle as string} subtitle={text.snapshotSubtitle as string} />
      {loading ? (
        <div className={styles.moversMiniGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index}>
              <SkeletonLine />
              <SkeletonLine wide />
              <SkeletonLine />
            </article>
          ))}
        </div>
      ) : error || items.length === 0 ? (
        <div className={styles.inlineState}>
          <AlertTriangle size={18} />
          <span>{error || text.commodityEmpty as string}</span>
        </div>
      ) : (
        <>
          {!hasAnyAvailable ? (
            <div className={styles.inlineState}>
              <AlertTriangle size={18} />
              <span>{text.commodityEmpty as string}</span>
            </div>
          ) : null}
          <div className={styles.moversMiniGrid}>
            {items.map(item => {
              const tone = changeTone(item.changePercent);
              return (
                <article key={item.symbol}>
                  <span dir="ltr">{item.symbol}</span>
                  <strong>{lang === 'ar' ? item.nameAr : item.displayName}</strong>
                  <p>{text.unit as string}: {item.unit}</p>
                  <b dir="ltr">{item.available ? `${formatCommodityPrice(item, locale)} ${item.currency}` : text.unavailable as string}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                  <p>{text.source as string}: {item.source ?? text.unavailable as string}</p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function WhatEnergyCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={`${styles.summaryCard} ${styles.infoCard}`}>
      <PanelTitle icon={Zap} title={text.whatTitle as string} />
      <p>{text.whatBody as string}</p>
      <ul>
        {arrayText(text.whatPoints).map(point => <li key={point}><span />{point}</li>)}
      </ul>
    </article>
  );
}

function EnergyContextCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={Globe2} title={text.contextTitle as string} subtitle={text.contextBody as string} />
      <div className={styles.sectorMiniList}>
        {arrayText(text.contextRows).map((row, index) => (
          <div className={styles.sectorMiniRow} key={row}>
            <span>{index < 3 ? <BarChart3 size={17} /> : <Activity size={17} />}</span>
            <div>
              <strong>{row}</strong>
              <p>{text.contextBody as string}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function DriversRiskCard({ text, lang }: { text: typeof TEXT[LangCode]; lang: LangCode }) {
  const support = {
    ar: ['ارتفاع أسعار النفط أو الغاز', 'طلب عالمي قوي على الطاقة', 'انخفاض أو استقرار المعروض', 'تدفقات نقدية قوية', 'توزيعات أو إعادة شراء أسهم'],
    en: ['Higher oil or gas prices', 'Strong global energy demand', 'Stable or lower supply', 'Strong cash flows', 'Dividends or buybacks'],
    fr: ['Prix pétrole/gaz plus élevés', 'Demande mondiale forte', 'Offre stable ou faible', 'Flux de trésorerie solides', 'Dividendes ou rachats'],
  };
  const risk = {
    ar: ['هبوط أسعار السلع', 'قرارات الإنتاج والسياسة', 'تباطؤ اقتصادي', 'ضغوط تنظيمية وبيئية', 'حساسية للدورة الاقتصادية'],
    en: ['Commodity price declines', 'Production and policy decisions', 'Economic slowdown', 'Regulatory and environmental pressure', 'Economic-cycle sensitivity'],
    fr: ['Baisse des matières premières', 'Décisions de production', 'Ralentissement économique', 'Pressions réglementaires', 'Sensibilité cyclique'],
  };
  return (
    <article className={`${styles.summaryCard} ${styles.comparisonCard}`}>
      <PanelTitle icon={Layers3} title={text.driversTitle as string} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.supportTitle as string}</strong>
          {support[lang].map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.riskTitle as string}</strong>
          {risk[lang].map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </article>
  );
}

function MovementCard({ movers, tickerItems, loading, text, lang, locale }: {
  movers: StockCategoryMoverItem[];
  tickerItems: EnergyTickerItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const tickerBySymbol = new Map(tickerItems.map(item => [item.symbol, item]));
  const rows = movers.length > 0
    ? movers.map(item => ({ ...item, sourceName: item.name }))
    : tickerItems
      .filter(item => typeof item.changePercent === 'number')
      .slice()
      .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
      .slice(0, 5)
      .map((item, index) => ({
        rank: index + 1,
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        currency: item.currency,
        changePercent: item.changePercent,
        volume: null,
        sourceName: item.name,
      }));

  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={TrendingUp} title={text.movementTitle as string} subtitle={text.movementSubtitle as string} />
      <div className={styles.topStocksList}>
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div className={styles.topStockRow} key={index}>
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ))
        ) : rows.length > 0 ? (
          rows.map(item => {
            const tone = changeTone(item.changePercent);
            const quote = tickerBySymbol.get(item.symbol);
            return (
              <div className={styles.topStockRow} key={item.symbol}>
                <div>
                  <strong dir="ltr">#{item.rank} {item.symbol}</strong>
                  <span>{item.name}</span>
                  <span>{sectorLabel(quote?.sector, lang)}</span>
                </div>
                <div className={styles.topStockValue}>
                  <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.cardMuted}>{text.unavailable as string}</p>
        )}
      </div>
    </article>
  );
}

function SectorBreakdown({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.sectorGuideTitle as string}>
      <PanelTitle icon={BookOpen} title={text.sectorGuideTitle as string} />
      <div className={styles.sectorCards}>
        {SECTOR_GUIDES.map(sector => {
          const Icon = sector.icon;
          return (
            <article className={styles.sectorCard} key={`${sector.title.en}-${sector.symbols.join('-')}`}>
              <span className={styles.sectorIcon}><Icon size={21} /></span>
              <h3>{sector.title[lang]}</h3>
              <p>{sector.body[lang]}</p>
              <div className={styles.symbolChips} aria-label={text.examples as string}>
                {sector.symbols.map(symbol => {
                  const name = ENERGY_SYMBOL_NAMES[symbol] ?? symbol;
                  return (
                    <a
                      key={symbol}
                      href={`/market-analysis?symbol=${encodeURIComponent(symbol)}`}
                      title={`${name} · ${symbol}`}
                      aria-label={`${name} ${symbol}`}
                      dir="ltr"
                    >
                      <span className={styles.symbolCompany}>{name}</span>
                      <span className={styles.symbolDivider} aria-hidden="true">·</span>
                      <strong>{symbol}</strong>
                    </a>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NewsCard({ item, lang, locale, text }: { item: EnergyNewsItem; lang: LangCode; locale: string; text: typeof TEXT[LangCode] }) {
  const title = displayTitle(item);
  const summary = displaySummary(item);
  const tone = changeTone(item.changePercent);
  const TrendIcon = tone === 'down' ? TrendingDown : TrendingUp;
  const contentDir = item.isTranslated && item.translatedTo === 'ar' ? 'rtl' : 'auto';
  const hasUrl = Boolean(item.url);

  return (
    <article className={styles.newsCard}>
      <div className={styles.newsCardTop}>
        <span className={styles.categoryTag}>{categoryLabelForItem(item, lang)}</span>
        <span className={styles.newsTime}><Clock3 size={13} />{relativeTime(item.publishedAt, lang)}</span>
      </div>
      <h3 dir={contentDir}>{title}</h3>
      {summary ? <p dir={contentDir}>{summary}</p> : null}
      <div className={styles.newsMetaGrid}>
        <span>{text.source as string}: <b>{item.source || text.source as string}</b></span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {typeof item.price === 'number' ? (
          <span className={styles.newsPrice} dir="ltr">
            {formatMoney(item.price, 'USD', locale)}
            {typeof item.changePercent === 'number' ? (
              <em className={styles[tone]}>
                <TrendIcon size={12} />
                {formatPercent(item.changePercent, locale)}
              </em>
            ) : null}
          </span>
        ) : null}
        <span>{item.isTranslated ? text.translated as string : text.originalLanguage as string}</span>
      </div>
      <div className={styles.newsFooter}>
        <span title={formatDateTime(item.publishedAt, locale)}>
          <Clock3 size={13} />
          {formatDateTime(item.publishedAt, locale)}
        </span>
        {hasUrl ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${text.readArticle as string}: ${title}`}>
            {text.readArticle as string}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className={styles.disabledLink}>
            {text.noLink as string}
            <ExternalLink size={14} />
          </span>
        )}
      </div>
    </article>
  );
}

function NewsSection({
  items,
  loading,
  error,
  activeFilter,
  setActiveFilter,
  query,
  setQuery,
  visibleCount,
  setVisibleCount,
  counts,
  lang,
  locale,
  text,
  retry,
}: {
  items: EnergyNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: EnergyFilterId;
  setActiveFilter: (filter: EnergyFilterId) => void;
  query: string;
  setQuery: (query: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: (count: number) => number) => void;
  counts: Record<EnergyFilterId, number>;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
  retry: () => void;
}) {
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <section className={styles.newsPanel} aria-label={text.newsTitle as string}>
      <div className={styles.newsHead}>
        <PanelTitle icon={Newspaper} title={text.newsTitle as string} subtitle={text.newsSubtitle as string} />
        <div className={styles.resultsCount}>
          <span>{text.showing as string}</span>
          <b>{Math.min(visibleCount, items.length)} / {items.length}</b>
          <span>{text.results as string}</span>
        </div>
      </div>

      <div className={styles.newsControls}>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder as string}
            aria-label={text.searchPlaceholder as string}
          />
        </label>
        <div className={styles.filterScroller} aria-label={text.filtersLabel as string}>
          {FILTERS.map(filter => (
            <button
              type="button"
              key={filter.id}
              className={activeFilter === filter.id ? styles.activeFilter : ''}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label[lang]}
              <span>{counts[filter.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.newsGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <article className={styles.newsSkeleton} key={index}>
              <SkeletonLine />
              <SkeletonLine wide />
              <SkeletonLine wide />
              <SkeletonLine />
            </article>
          ))}
        </div>
      ) : error ? (
        <div className={`${styles.stateBox} ${styles.errorState}`} role="alert">
          <AlertTriangle size={24} />
          <strong>{text.errorTitle as string}</strong>
          <p>{error || text.errorBody as string}</p>
          <button type="button" onClick={retry}>
            <RefreshCcw size={15} />
            {text.retry as string}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.stateBox}>
          <Newspaper size={24} />
          <strong>{text.emptyTitle as string}</strong>
          <p>{text.emptyHint as string}</p>
        </div>
      ) : (
        <>
          <div className={styles.newsGrid}>
            {visibleItems.map(item => (
              <NewsCard key={item.id} item={item} lang={lang} locale={locale} text={text} />
            ))}
          </div>
          <div className={styles.loadMoreWrap}>
            {hasMore ? (
              <button type="button" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>
                {text.showMore as string}
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <span>{text.noMore as string}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function FeaturedStocks({ items, loading, lang, locale, text }: {
  items: EnergyTickerItem[];
  loading: boolean;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
  const bySymbol = new Map(items.map(item => [item.symbol, item]));

  return (
    <section className={styles.sectorGuidePanel} aria-label={text.featuredTitle as string}>
      <PanelTitle icon={BriefcaseBusiness} title={text.featuredTitle as string} subtitle={text.featuredSubtitle as string} />
      <div className={styles.sectorCards}>
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <article className={styles.sectorCard} key={index}>
              <SkeletonLine />
              <SkeletonLine wide />
              <SkeletonLine wide />
            </article>
          ))
        ) : FEATURED_SYMBOLS.map(symbol => {
          const quote = bySymbol.get(symbol);
          const tone = changeTone(quote?.changePercent);
          return (
            <article className={styles.sectorCard} key={symbol}>
              <span className={styles.sectorIcon}><Sparkles size={21} /></span>
              <h3>{quote?.name ?? symbol}</h3>
              <div className={styles.symbolChips}>
                <span dir="ltr">{symbol}</span>
                <span>{FEATURED_META[symbol]?.sector[lang] ?? text.unavailable as string}</span>
              </div>
              <p>{FEATURED_META[symbol]?.body[lang] ?? text.unavailable as string}</p>
              {quote ? (
                <>
                  <div className={styles.newsMetaGrid}>
                    <span dir="ltr">{formatMoney(quote.price, quote.currency, locale)}</span>
                    <span className={styles[tone]} dir="ltr">{formatPercent(quote.changePercent, locale)}</span>
                    <span>{text.sector as string}: <b>{sectorLabel(quote.sector, lang)}</b></span>
                  </div>
                  <p>{text.priceSource as string}: {quote.source}</p>
                </>
              ) : (
                <p>{text.unavailable as string}</p>
              )}
              <a href={`/market-analysis?symbol=${encodeURIComponent(symbol)}`}>
                {text.details as string}
                <ArrowUpRight size={14} />
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EnergyWatchlist({ items, active, setActive, lang, text, locale }: {
  items: EnergyTickerItem[];
  active: WatchlistFilter;
  setActive: (filter: WatchlistFilter) => void;
  lang: LangCode;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  const filters: Array<{ id: WatchlistFilter; label: Record<LangCode, string> }> = [
    { id: 'oil_gas', label: { ar: 'النفط والغاز', en: 'Oil & gas', fr: 'Pétrole et gaz' } },
    { id: 'oil_services', label: { ar: 'الخدمات النفطية', en: 'Oilfield services', fr: 'Services pétroliers' } },
    { id: 'pipelines', label: { ar: 'خطوط الأنابيب', en: 'Pipelines', fr: 'Pipelines' } },
    { id: 'renewables', label: { ar: 'الطاقة المتجددة', en: 'Renewables', fr: 'Renouvelables' } },
    { id: 'movers', label: { ar: 'الأعلى حركة', en: 'Top movers', fr: 'Plus actifs' } },
  ];
  const visible = active === 'movers'
    ? items.slice().sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)).slice(0, 8)
    : items.filter(item => item.sector === active || (active === 'oil_gas' && ['integrated_oil_gas', 'exploration_production'].includes(item.sector))).slice(0, 8);

  return (
    <section className={styles.moversMiniPanel} aria-label={text.watchlistTitle as string}>
      <PanelTitle icon={Wallet} title={text.watchlistTitle as string} subtitle={text.watchlistSubtitle as string} />
      <div className={styles.filterScroller}>
        {filters.map(filter => (
          <button
            type="button"
            key={filter.id}
            className={active === filter.id ? styles.activeFilter : ''}
            onClick={() => setActive(filter.id)}
          >
            {filter.label[lang]}
            <span>{filter.id === 'movers' ? items.length : items.filter(item => item.sector === filter.id || (filter.id === 'oil_gas' && ['integrated_oil_gas', 'exploration_production'].includes(item.sector))).length}</span>
          </button>
        ))}
      </div>
      {visible.length > 0 ? (
        <div className={styles.moversMiniGrid}>
          {visible.map(item => {
            const tone = changeTone(item.changePercent);
            return (
              <article key={item.symbol}>
                <span dir="ltr">{item.symbol}</span>
                <strong>{item.name}</strong>
                <p>{sectorLabel(item.sector, lang)}</p>
                <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.inlineState}>{text.tickerEmpty as string}</div>
      )}
    </section>
  );
}

function OpportunityRisk({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.opportunityTitle as string}>
      <PanelTitle icon={ShieldCheck} title={text.opportunityTitle as string} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.opportunityTitle as string}</strong>
          {arrayText(text.opportunityPoints).map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.riskTitle as string}</strong>
          {arrayText(text.riskPoints).map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </section>
  );
}

export function EnergyNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<EnergyTickerItem[]>([]);
  const [commodityItems, setCommodityItems] = useState<EnergyCommodity[]>([]);
  const [newsItems, setNewsItems] = useState<EnergyNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [commodityUpdatedAt, setCommodityUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [commodityError, setCommodityError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EnergyFilterId>('all');
  const [activeWatchlist, setActiveWatchlist] = useState<WatchlistFilter>('oil_gas');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');
    setCommodityError('');

    const [tickerResult, commodityResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<EnergyTickerResponse>('/api/energy-stocks/ticker'),
      fetchJson<EnergyCommodityResponse>('/api/market/energy/commodities'),
      fetchJson<EnergyNewsResponse>(`/api/energy-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/energy-stocks/movers?limit=5'),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
    } else {
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(text.tickerEmpty as string);
    }

    if (commodityResult.status === 'fulfilled' && commodityResult.value.ok) {
      setCommodityItems(commodityResult.value.items);
      setCommodityUpdatedAt(commodityResult.value.updated_at);
    } else {
      setCommodityItems([]);
      setCommodityUpdatedAt('');
      setCommodityError(text.commodityEmpty as string);
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNewsItems(newsResult.value.items);
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      setNewsItems([]);
      setNewsUpdatedAt('');
      const reason = newsResult.status === 'fulfilled'
        ? !newsResult.value.success ? newsResult.value.reason || newsResult.value.error : ''
        : newsResult.reason instanceof Error ? newsResult.reason.message : '';
      setNewsError(reason || text.errorBody as string);
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
  }, [activeLang, text.commodityEmpty, text.errorBody, text.tickerEmpty]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadData(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [activeFilter, debouncedQuery]);

  const lastUpdated = useMemo(
    () => newestTimestamp([tickerUpdatedAt, commodityUpdatedAt, newsUpdatedAt, moversUpdatedAt]),
    [commodityUpdatedAt, moversUpdatedAt, newsUpdatedAt, tickerUpdatedAt],
  );

  const searchableItems = useMemo(
    () => newsItems.filter(item => itemMatchesSearch(item, debouncedQuery)),
    [debouncedQuery, newsItems],
  );

  const counts = useMemo(() => {
    return FILTERS.reduce((acc, filter) => {
      acc[filter.id] = searchableItems.filter(item => itemMatchesFilter(item, filter.id)).length;
      return acc;
    }, {} as Record<EnergyFilterId, number>);
  }, [searchableItems]);

  const filteredNews = useMemo(() => {
    return searchableItems
      .filter(item => itemMatchesFilter(item, activeFilter))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [activeFilter, searchableItems]);

  const topMoverRows = useMemo(() => {
    if (!movers?.ok) return [];
    return movers.data.topGainers.length > 0 ? movers.data.topGainers : movers.data.highestPrice;
  }, [movers]);

  return (
    <div className={styles.page} dir={dir}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <span className={styles.eyebrow}><Zap size={15} />{text.delayed as string}</span>
              <h1>{text.title as string}</h1>
              <p>{text.subtitle as string}</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" onClick={() => void loadData(false)} disabled={refreshing}>
                <RefreshCcw size={16} className={refreshing ? styles.spin : ''} />
                {refreshing ? text.refreshing as string : text.refresh as string}
              </button>
              <span>
                <Clock3 size={14} />
                {text.lastUpdated as string}: {lastUpdated ? formatDateTime(lastUpdated, locale) : text.notUpdated as string}
              </span>
              <small>{text.autoRefresh as string}</small>
            </div>
          </header>

          <EnergyTicker items={tickerItems} loading={loading} error={marketError} text={text} lang={activeLang} locale={locale} />

          <MarketSnapshot items={commodityItems} loading={loading} error={commodityError} text={text} lang={activeLang} locale={locale} />

          <section className={styles.summaryGrid} aria-label={text.contextTitle as string}>
            <WhatEnergyCard text={text} />
            <EnergyContextCard text={text} />
            <DriversRiskCard text={text} lang={activeLang} />
            <MovementCard movers={topMoverRows} tickerItems={tickerItems} loading={loading} text={text} lang={activeLang} locale={locale} />
          </section>

          <SectorBreakdown
            lang={activeLang}
            text={text}
          />

          <NewsSection
            items={filteredNews}
            loading={loading}
            error={newsError}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            query={query}
            setQuery={setQuery}
            visibleCount={visibleCount}
            setVisibleCount={setVisibleCount}
            counts={counts}
            lang={activeLang}
            locale={locale}
            text={text}
            retry={() => void loadData(true)}
          />

          <FeaturedStocks items={tickerItems} loading={loading} lang={activeLang} locale={locale} text={text} />

          <OpportunityRisk lang={activeLang} text={text} />

          <EnergyWatchlist
            items={tickerItems}
            active={activeWatchlist}
            setActive={setActiveWatchlist}
            lang={activeLang}
            text={text}
            locale={locale}
          />

          <section className={styles.disclaimer}>
            <span><Info size={20} /></span>
            <div>
              <h2>{text.disclaimerTitle as string}</h2>
              <p>{text.disclaimerBody as string}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default EnergyNewsPage;
