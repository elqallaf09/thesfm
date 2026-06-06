'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Clock3,
  ExternalLink,
  HeartPulse,
  Info,
  Newspaper,
  RefreshCcw,
  Scale,
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
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from './DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type DefensiveFilterId = 'all' | 'consumer_staples' | 'healthcare' | 'telecom' | 'utilities' | 'dividends' | 'mna' | 'analysis';

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

const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const TEXT = {
  ar: {
    title: 'أخبار الأسهم الدفاعية',
    subtitle: 'تغطية شاملة لأخبار وتحليلات الأسهم الدفاعية في قطاعات مثل السلع الاستهلاكية الأساسية، الرعاية الصحية، الاتصالات، والمرافق العامة.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'بيانات سوق مؤجلة أو آخر قيمة متاحة',
    tickerTitle: 'شريط الأسهم الدفاعية',
    tickerSubtitle: 'أسعار حقيقية للأسهم الدفاعية الأمريكية المختارة.',
    tickerEmpty: 'لا توجد أسعار متاحة حاليًا من مصادر السوق الحقيقية.',
    topStocks: 'أبرز الأسهم الدفاعية',
    topStocksSubtitle: 'مرتبة حسب الأداء اليومي المتاح من البيانات الحية.',
    sectorDirectory: 'دليل القطاعات الدفاعية',
    whatTitle: 'ما هي الأسهم الدفاعية؟',
    whatBody: 'الأسهم الدفاعية هي شركات تقدم منتجات أو خدمات أساسية يميل الطلب عليها إلى الاستقرار حتى أثناء الركود أو تقلبات السوق.',
    whatPointOne: 'طلب مستقر نسبيًا عبر الدورات الاقتصادية',
    whatPointTwo: 'تقلبات أقل غالبًا من قطاعات النمو المرتفع',
    whatPointThree: 'قد توفر توزيعات أرباح في بعض الشركات',
    whatPointFour: 'مناسبة للمستثمر المحافظ الباحث عن الاستقرار',
    comparisonTitle: 'الفرق بينها وبين الأسهم الدورية',
    defensiveStocks: 'الأسهم الدفاعية',
    cyclicalStocks: 'الأسهم الدورية',
    cyclicalPointOne: 'تتأثر بقوة بالدورة الاقتصادية',
    cyclicalPointTwo: 'قد ترتفع بقوة وقت الانتعاش',
    cyclicalPointThree: 'قد تنخفض بقوة وقت الركود',
    cyclicalPointFour: 'مناسبة لمن يتحمل مخاطر أعلى',
    newsTitle: 'أخبار الأسهم الدفاعية',
    newsSubtitle: 'ابق على اطلاع بأحدث الأخبار والتحليلات من مصادر مالية حقيقية.',
    searchPlaceholder: 'ابحث عن خبر أو رمز أو تصنيف...',
    filtersLabel: 'التصنيفات',
    showMore: 'عرض المزيد',
    showing: 'المعروض',
    results: 'خبر',
    readArticle: 'قراءة الخبر',
    source: 'المصدر',
    noLink: 'الرابط غير متاح',
    emptyTitle: 'لا توجد أخبار مطابقة',
    emptyHint: 'جرّب بحثًا آخر أو اختر تصنيفًا مختلفًا.',
    errorTitle: 'تعذر تحميل الأخبار',
    errorBody: 'تعذر جلب بيانات الأسهم الدفاعية من المصادر الحقيقية حاليًا.',
    retry: 'إعادة المحاولة',
    sectorGuideTitle: 'دليل القطاعات الدفاعية',
    viewMore: 'عرض المزيد',
    examples: 'أمثلة',
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومتابعة الأخبار فقط، وليست توصية شراء أو بيع أو نصيحة استثمارية. لا يتم استخدام أسعار أو أخبار وهمية، وقد تظهر آخر قيمة متاحة عند إغلاق السوق.',
    marketClosedHint: 'إذا كان السوق مغلقًا، تظهر آخر قيمة حقيقية متاحة من مزود البيانات.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    unavailable: 'غير متوفر',
    priceSource: 'مصدر السعر',
    published: 'النشر',
    noMore: 'تم عرض كل الأخبار المتاحة',
  },
  en: {
    title: 'Defensive Stocks News',
    subtitle: 'Comprehensive coverage of defensive stock news and analysis across consumer staples, healthcare, telecom, and utilities.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Delayed market data or last available value',
    tickerTitle: 'Defensive stock ticker',
    tickerSubtitle: 'Real prices for selected US defensive stocks.',
    tickerEmpty: 'No real market prices are available right now.',
    topStocks: 'Top defensive stocks',
    topStocksSubtitle: 'Ranked by available daily performance.',
    sectorDirectory: 'Defensive sector guide',
    whatTitle: 'What are defensive stocks?',
    whatBody: 'Defensive stocks are companies that provide essential products or services whose demand tends to remain stable during recessions or market volatility.',
    whatPointOne: 'Relatively stable demand across economic cycles',
    whatPointTwo: 'Often lower volatility than high-growth sectors',
    whatPointThree: 'May provide dividends in some companies',
    whatPointFour: 'Useful for conservative investors seeking stability',
    comparisonTitle: 'How they differ from cyclical stocks',
    defensiveStocks: 'Defensive stocks',
    cyclicalStocks: 'Cyclical stocks',
    cyclicalPointOne: 'Strongly affected by economic cycles',
    cyclicalPointTwo: 'May rise strongly during recoveries',
    cyclicalPointThree: 'May fall sharply during recessions',
    cyclicalPointFour: 'Suited to higher risk tolerance',
    newsTitle: 'Defensive stocks news',
    newsSubtitle: 'Stay current with real financial news and analysis sources.',
    searchPlaceholder: 'Search news, ticker, or category...',
    filtersLabel: 'Categories',
    showMore: 'Show more',
    showing: 'Showing',
    results: 'news',
    readArticle: 'Read article',
    source: 'Source',
    noLink: 'Link unavailable',
    emptyTitle: 'No matching news',
    emptyHint: 'Try another search or choose a different category.',
    errorTitle: 'Unable to load news',
    errorBody: 'Real defensive stock data could not be loaded right now.',
    retry: 'Retry',
    sectorGuideTitle: 'Defensive sector guide',
    viewMore: 'View more',
    examples: 'Examples',
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for education and news monitoring only. It is not a buy/sell recommendation or investment advice. No fake prices or news are used, and the last real value may appear when markets are closed.',
    marketClosedHint: 'If the market is closed, the last real value from the data provider is shown.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    published: 'Published',
    noMore: 'All available news is visible',
  },
  fr: {
    title: 'Actualités des actions défensives',
    subtitle: 'Couverture des actualités et analyses des actions défensives dans les biens essentiels, la santé, les télécoms et les services publics.',
    refresh: 'Actualiser les données',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Données de marché différées ou dernière valeur disponible',
    tickerTitle: 'Bandeau actions défensives',
    tickerSubtitle: 'Prix réels pour une sélection d’actions défensives américaines.',
    tickerEmpty: 'Aucun prix de marché réel disponible pour le moment.',
    topStocks: 'Principales actions défensives',
    topStocksSubtitle: 'Classées selon la performance quotidienne disponible.',
    sectorDirectory: 'Guide des secteurs défensifs',
    whatTitle: 'Que sont les actions défensives ?',
    whatBody: 'Les actions défensives sont des sociétés fournissant des produits ou services essentiels dont la demande reste relativement stable pendant les récessions ou la volatilité.',
    whatPointOne: 'Demande relativement stable à travers les cycles',
    whatPointTwo: 'Volatilité souvent inférieure aux secteurs de croissance',
    whatPointThree: 'Dividendes possibles dans certaines sociétés',
    whatPointFour: 'Adaptées aux investisseurs prudents recherchant la stabilité',
    comparisonTitle: 'Différence avec les actions cycliques',
    defensiveStocks: 'Actions défensives',
    cyclicalStocks: 'Actions cycliques',
    cyclicalPointOne: 'Fortement influencées par le cycle économique',
    cyclicalPointTwo: 'Peuvent fortement monter en phase de reprise',
    cyclicalPointThree: 'Peuvent fortement baisser en récession',
    cyclicalPointFour: 'Adaptées à une tolérance au risque plus élevée',
    newsTitle: 'Actualités des actions défensives',
    newsSubtitle: 'Suivez les dernières actualités et analyses financières réelles.',
    searchPlaceholder: 'Rechercher une actualité, un symbole ou une catégorie...',
    filtersLabel: 'Catégories',
    showMore: 'Afficher plus',
    showing: 'Affiché',
    results: 'actualités',
    readArticle: 'Lire l’article',
    source: 'Source',
    noLink: 'Lien indisponible',
    emptyTitle: 'Aucune actualité correspondante',
    emptyHint: 'Essayez une autre recherche ou une autre catégorie.',
    errorTitle: 'Impossible de charger les actualités',
    errorBody: 'Les données réelles des actions défensives ne peuvent pas être chargées pour le moment.',
    retry: 'Réessayer',
    sectorGuideTitle: 'Guide des secteurs défensifs',
    viewMore: 'Voir plus',
    examples: 'Exemples',
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est destinée à l’éducation et au suivi de l’actualité uniquement. Elle ne constitue pas une recommandation d’achat ou de vente ni un conseil en investissement. Aucun prix ou article fictif n’est utilisé.',
    marketClosedHint: 'Si le marché est fermé, la dernière valeur réelle du fournisseur est affichée.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    published: 'Publié',
    noMore: 'Toutes les actualités disponibles sont visibles',
  },
} satisfies Record<LangCode, Record<string, string>>;

const FILTERS: Array<{ id: DefensiveFilterId; label: Record<LangCode, string> }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' } },
  { id: 'consumer_staples', label: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer Staples', fr: 'Biens essentiels' } },
  { id: 'healthcare', label: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' } },
  { id: 'telecom', label: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' } },
  { id: 'utilities', label: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' } },
  { id: 'dividends', label: { ar: 'أرباح وتوزيعات', en: 'Earnings & Dividends', fr: 'Résultats et dividendes' } },
  { id: 'mna', label: { ar: 'اندماج واستحواذ', en: 'M&A', fr: 'Fusions-acquisitions' } },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & Reports', fr: 'Analyses et rapports' } },
];

const SECTOR_GUIDES = [
  {
    id: 'consumer_staples' as DefensiveFilterId,
    icon: ShoppingCart,
    symbols: ['PG', 'KO', 'PEP', 'WMT', 'COST', 'HSY'],
    title: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer Staples', fr: 'Biens essentiels' },
    body: {
      ar: 'شركات الغذاء والمشروبات والمنتجات المنزلية التي يبقى الطلب عليها حاضرًا في أغلب الظروف.',
      en: 'Food, beverage, and household product companies with demand that stays present in most environments.',
      fr: 'Sociétés alimentaires, boissons et produits ménagers dont la demande reste présente.',
    },
  },
  {
    id: 'healthcare' as DefensiveFilterId,
    icon: HeartPulse,
    symbols: ['JNJ', 'ABBV', 'UNH', 'MRK', 'PFE', 'LLY'],
    title: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' },
    body: {
      ar: 'شركات الأدوية والخدمات الصحية والتأمين الصحي المرتبطة باحتياجات أساسية طويلة الأجل.',
      en: 'Pharma, health services, and health insurance companies tied to long-term essential needs.',
      fr: 'Pharmacie, services de santé et assurance santé liés à des besoins essentiels.',
    },
  },
  {
    id: 'telecom' as DefensiveFilterId,
    icon: Signal,
    symbols: ['T', 'VZ', 'TMUS'],
    title: { ar: 'الاتصالات', en: 'Telecommunications', fr: 'Télécommunications' },
    body: {
      ar: 'مزودو خدمات الاتصالات والإنترنت والاشتراكات المتكررة للأفراد والشركات.',
      en: 'Communication and internet service providers with recurring customer subscriptions.',
      fr: 'Fournisseurs de communications et internet avec abonnements récurrents.',
    },
  },
  {
    id: 'utilities' as DefensiveFilterId,
    icon: Zap,
    symbols: ['SO', 'DUK', 'NEE', 'AEP'],
    title: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: {
      ar: 'شركات الكهرباء والمياه والطاقة المنظمة غالبًا، مع تدفقات إيراد أكثر استقرارًا.',
      en: 'Electricity, water, and often regulated energy providers with more stable revenue flows.',
      fr: 'Électricité, eau et énergie souvent réglementées aux revenus plus stables.',
    },
  },
];

const SECTOR_ALIASES: Record<DefensiveFilterId, string[]> = {
  all: [],
  consumer_staples: ['consumer_staples', 'food_beverage', 'essential_retail'],
  healthcare: ['healthcare', 'pharmaceuticals', 'insurance_stable'],
  telecom: ['telecom'],
  utilities: ['utilities'],
  dividends: [],
  mna: [],
  analysis: [],
};

const FILTER_KEYWORDS: Record<DefensiveFilterId, string[]> = {
  all: [],
  consumer_staples: ['consumer staples', 'staples', 'food', 'beverage', 'grocery', 'retail', 'household', 'walmart', 'costco', 'procter', 'coca-cola', 'pepsico'],
  healthcare: ['healthcare', 'health care', 'pharma', 'drug', 'medicine', 'hospital', 'insurance', 'johnson', 'pfizer', 'merck', 'abbvie', 'unitedhealth'],
  telecom: ['telecom', 'telecommunications', 'wireless', 'broadband', 'verizon', 'at&t', 'internet'],
  utilities: ['utilities', 'utility', 'electricity', 'power', 'energy', 'grid', 'nextera', 'duke energy', 'southern company'],
  dividends: ['dividend', 'dividends', 'distribution', 'payout', 'yield', 'earnings', 'profit', 'quarter', 'أرباح', 'توزيعات'],
  mna: ['merger', 'acquisition', 'acquires', 'buyout', 'deal', 'm&a', 'takeover', 'اندماج', 'استحواذ'],
  analysis: ['analysis', 'analyst', 'rating', 'report', 'outlook', 'target', 'upgrade', 'downgrade', 'forecast', 'تحليل', 'تقرير', 'توقعات'],
};

const TICKER_SECTORS: Record<string, DefensiveFilterId> = {
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
};

const DEFENSIVE_SYMBOL_NAMES: Record<string, string> = {
  PG: 'Procter & Gamble',
  KO: 'Coca-Cola',
  PEP: 'PepsiCo',
  WMT: 'Walmart',
  COST: 'Costco',
  HSY: 'Hershey',
  CL: 'Colgate-Palmolive',
  KMB: 'Kimberly-Clark',
  GIS: 'General Mills',
  MDLZ: 'Mondelez International',
  JNJ: 'Johnson & Johnson',
  ABBV: 'AbbVie',
  UNH: 'UnitedHealth Group',
  MRK: 'Merck',
  PFE: 'Pfizer',
  LLY: 'Eli Lilly',
  T: 'AT&T',
  VZ: 'Verizon',
  TMUS: 'T-Mobile US',
  SO: 'Southern Company',
  DUK: 'Duke Energy',
  NEE: 'NextEra Energy',
  AEP: 'American Electric Power',
};

function defensiveSymbolName(symbol: string) {
  return DEFENSIVE_SYMBOL_NAMES[symbol] ?? symbol;
}

function defensiveSymbolSector(symbol: string, lang: LangCode, fallback: string) {
  const sectorId = TICKER_SECTORS[symbol];
  return sectorId ? filterLabel(sectorId, lang) : fallback;
}

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

function numberFormatter(locale: string, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, {
    numberingSystem: 'latn',
    ...options,
  });
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined, locale: string) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '-';
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
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const formatted = numberFormatter(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
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
  if (diffMinutes < 60) {
    if (lang === 'ar') return `منذ ${diffMinutes} دقيقة`;
    if (lang === 'fr') return `il y a ${diffMinutes} min`;
    return `${diffMinutes} min ago`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    if (lang === 'ar') return `منذ ${hours} ساعة`;
    if (lang === 'fr') return `il y a ${hours} h`;
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (lang === 'ar') return `منذ ${days} يوم`;
  if (lang === 'fr') return `il y a ${days} j`;
  return `${days}d ago`;
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function textForItem(item: DefensiveNewsItem) {
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
  return textForItem(item).includes(needle);
}

function itemMatchesFilter(item: DefensiveNewsItem, filter: DefensiveFilterId) {
  if (filter === 'all') return true;

  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean).map(value => String(value).toLowerCase()));
  const symbol = String(item.ticker ?? '').toUpperCase();
  const stockSector = TICKER_SECTORS[symbol];
  const aliases = SECTOR_ALIASES[filter] ?? [];
  if (aliases.some(alias => sectors.has(alias)) || stockSector === filter) return true;

  const haystack = textForItem(item);
  return FILTER_KEYWORDS[filter].some(keyword => haystack.includes(keyword.toLowerCase()));
}

function filterLabel(filter: DefensiveFilterId, lang: LangCode) {
  return FILTERS.find(item => item.id === filter)?.label[lang] ?? filter;
}

function categoryLabelForItem(item: DefensiveNewsItem, lang: LangCode) {
  const ordered: DefensiveFilterId[] = ['consumer_staples', 'healthcare', 'telecom', 'utilities', 'dividends', 'mna', 'analysis'];
  const match = ordered.find(filter => itemMatchesFilter(item, filter));
  return filterLabel(match ?? 'all', lang);
}

function displayTitle(item: DefensiveNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: DefensiveNewsItem) {
  return item.summary || item.summaryOriginal || displayTitle(item);
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
  if (!response.ok || !json) {
    throw new Error(`Request failed: ${url}`);
  }
  return json;
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <span className={`${styles.skeletonLine}${wide ? ` ${styles.skeletonWide}` : ''}`} aria-hidden="true" />;
}

function DefensiveTicker({
  items,
  loading,
  error,
  lang,
  text,
  locale,
}: {
  items: DefensiveTickerItem[];
  loading: boolean;
  error: string;
  lang: LangCode;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  if (loading) {
    return (
      <section className={`${styles.tickerPanel} ${styles.compactTickerPanel}`} aria-label={text.tickerTitle}>
        <PanelTitle icon={Activity} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
        <div className={styles.tickerSkeletonRow}>
          {Array.from({ length: 7 }).map((_, index) => <span key={index} />)}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={`${styles.tickerPanel} ${styles.compactTickerPanel}`} aria-label={text.tickerTitle}>
        <PanelTitle icon={Activity} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
        <div className={styles.inlineState}>
          <AlertTriangle size={18} />
          <span>{error || text.tickerEmpty}</span>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.tickerPanel} ${styles.compactTickerPanel}`} aria-label={text.tickerTitle}>
      <PanelTitle icon={Activity} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
      <MarketTickerStrip
        ariaLabel={text.tickerTitle}
        className={styles.tickerStrip}
        viewportClassName={styles.tickerViewport}
        trackClassName={styles.tickerTrack}
        setClassName={styles.tickerSet}
        status={<span className={styles.tickerStatus}>{text.delayed}</span>}
      >
        {items.map(item => {
          const tone = changeTone(item.changePercent);
          const TrendIcon = tone === 'down' ? TrendingDown : TrendingUp;
          const displayName = defensiveSymbolName(item.symbol) === item.symbol ? item.name : defensiveSymbolName(item.symbol);
          return (
            <article className={styles.tickerItem} key={item.symbol} dir="ltr">
              <div>
                <strong>{item.symbol}</strong>
                <span>{displayName}</span>
                <span>{defensiveSymbolSector(item.symbol, lang, text.unavailable)}</span>
              </div>
              <b>{formatMoney(item.price, item.currency, locale)}</b>
              <em className={styles[tone]}>
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

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.panelTitle}>
      <span><Icon size={18} /></span>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function TopStocksCard({
  stocks,
  loading,
  text,
  locale,
}: {
  stocks: DefensiveTickerItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={Sparkles} title={text.topStocks} subtitle={text.topStocksSubtitle} />
      <div className={styles.topStocksList}>
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div className={styles.topStockRow} key={index}>
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ))
        ) : stocks.length > 0 ? (
          stocks.map(stock => {
            const tone = changeTone(stock.changePercent);
            return (
              <div className={styles.topStockRow} key={stock.symbol}>
                <div>
                  <strong dir="ltr">{stock.symbol}</strong>
                  <span>{stock.name}</span>
                </div>
                <div className={styles.topStockValue}>
                  <b dir="ltr">{formatMoney(stock.price, stock.currency, locale)}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(stock.changePercent, locale)}</em>
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.cardMuted}>{text.unavailable}</p>
        )}
      </div>
    </article>
  );
}

function SectorDirectoryCard({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={BookOpen} title={text.sectorDirectory} />
      <div className={styles.sectorMiniList}>
        {SECTOR_GUIDES.map(sector => {
          const Icon = sector.icon;
          return (
            <div className={styles.sectorMiniRow} key={sector.id}>
              <span><Icon size={17} /></span>
              <div>
                <strong>{sector.title[lang]}</strong>
                <p>{sector.body[lang]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function WhatDefensiveCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={`${styles.summaryCard} ${styles.infoCard}`}>
      <PanelTitle icon={ShieldCheck} title={text.whatTitle} />
      <p>{text.whatBody}</p>
      <ul>
        {[text.whatPointOne, text.whatPointTwo, text.whatPointThree, text.whatPointFour].map(point => (
          <li key={point}><span />{point}</li>
        ))}
      </ul>
    </article>
  );
}

function ComparisonCard({ text }: { text: typeof TEXT[LangCode] }) {
  const defensive = [text.whatPointOne, text.whatPointTwo, text.whatPointThree, text.whatPointFour];
  const cyclical = [text.cyclicalPointOne, text.cyclicalPointTwo, text.cyclicalPointThree, text.cyclicalPointFour];

  return (
    <article className={`${styles.summaryCard} ${styles.comparisonCard}`}>
      <PanelTitle icon={Scale} title={text.comparisonTitle} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.defensiveStocks}</strong>
          {defensive.map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.cyclicalStocks}</strong>
          {cyclical.map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </article>
  );
}

function NewsCard({
  item,
  lang,
  locale,
  text,
}: {
  item: DefensiveNewsItem;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
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
      <p dir={contentDir}>{summary}</p>
      <div className={styles.newsMetaGrid}>
        <span>{text.source}: <b>{item.source || text.source}</b></span>
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
        <span>{item.isTranslated ? text.translated : text.originalLanguage}</span>
      </div>
      <div className={styles.newsFooter}>
        <span title={formatDateTime(item.publishedAt, locale)}>
          <Clock3 size={13} />
          {formatDateTime(item.publishedAt, locale)}
        </span>
        {hasUrl ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${text.readArticle}: ${title}`}>
            {text.readArticle}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className={styles.disabledLink}>
            {text.noLink}
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
  items: DefensiveNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: DefensiveFilterId;
  setActiveFilter: (filter: DefensiveFilterId) => void;
  query: string;
  setQuery: (query: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: (count: number) => number) => void;
  counts: Record<DefensiveFilterId, number>;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
  retry: () => void;
}) {
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <section className={styles.newsPanel} aria-label={text.newsTitle}>
      <div className={styles.newsHead}>
        <PanelTitle icon={Newspaper} title={text.newsTitle} subtitle={text.newsSubtitle} />
        <div className={styles.resultsCount}>
          <span>{text.showing}</span>
          <b>{Math.min(visibleCount, items.length)} / {items.length}</b>
          <span>{text.results}</span>
        </div>
      </div>

      <div className={styles.newsControls}>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
            aria-label={text.searchPlaceholder}
          />
        </label>
        <div className={styles.filterScroller} aria-label={text.filtersLabel}>
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
          <strong>{text.errorTitle}</strong>
          <p>{error || text.errorBody}</p>
          <button type="button" onClick={retry}>
            <RefreshCcw size={15} />
            {text.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.stateBox}>
          <Newspaper size={24} />
          <strong>{text.emptyTitle}</strong>
          <p>{text.emptyHint}</p>
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
                {text.showMore}
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <span>{text.noMore}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SectorGuide({
  lang,
  text,
}: {
  lang: LangCode;
  text: typeof TEXT[LangCode];
}) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.sectorGuideTitle}>
      <div className={styles.sectionTitle}>
        <PanelTitle icon={BookOpen} title={text.sectorGuideTitle} />
      </div>
      <div className={styles.sectorCards}>
        {SECTOR_GUIDES.map(sector => {
          const Icon = sector.icon;
          return (
            <article className={styles.sectorCard} key={sector.id}>
              <span className={styles.sectorIcon}><Icon size={21} /></span>
              <h3>{sector.title[lang]}</h3>
              <p>{sector.body[lang]}</p>
              <div className={styles.symbolChips} aria-label={text.examples}>
                {sector.symbols.map(symbol => {
                  const name = defensiveSymbolName(symbol);
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

function MoversMiniCard({
  movers,
  text,
  locale,
}: {
  movers: StockCategoryMoverItem[];
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  if (movers.length === 0) return null;

  return (
    <section className={styles.moversMiniPanel} aria-label={text.topStocks}>
      <PanelTitle icon={BarChart3} title={text.topStocks} subtitle={text.marketClosedHint} />
      <div className={styles.moversMiniGrid}>
        {movers.slice(0, 4).map(item => {
          const tone = changeTone(item.changePercent);
          return (
            <article key={item.symbol}>
              <span>#{item.rank}</span>
              <strong dir="ltr">{item.symbol}</strong>
              <p>{item.name}</p>
              <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
              <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DefensiveStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
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
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DefensiveFilterId>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

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
    } else {
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(text.tickerEmpty);
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNewsItems(newsResult.value.items);
      setPrices(newsResult.value.prices ?? []);
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      setNewsItems([]);
      setPrices([]);
      setNewsUpdatedAt('');
      const reason = newsResult.status === 'fulfilled'
        ? !newsResult.value.success ? newsResult.value.reason || newsResult.value.error : ''
        : newsResult.reason instanceof Error ? newsResult.reason.message : '';
      setNewsError(reason || text.errorBody);
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
  }, [activeLang, text.errorBody, text.tickerEmpty]);

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
    () => newestTimestamp([tickerUpdatedAt, newsUpdatedAt, moversUpdatedAt]),
    [moversUpdatedAt, newsUpdatedAt, tickerUpdatedAt],
  );

  const searchableItems = useMemo(
    () => newsItems.filter(item => itemMatchesSearch(item, debouncedQuery)),
    [debouncedQuery, newsItems],
  );

  const counts = useMemo(() => {
    return FILTERS.reduce((acc, filter) => {
      acc[filter.id] = searchableItems.filter(item => itemMatchesFilter(item, filter.id)).length;
      return acc;
    }, {} as Record<DefensiveFilterId, number>);
  }, [searchableItems]);

  const filteredNews = useMemo(() => {
    return searchableItems
      .filter(item => itemMatchesFilter(item, activeFilter))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [activeFilter, searchableItems]);

  const topStocks = useMemo(() => {
    const bySymbol = new Map<string, DefensiveTickerItem>();
    tickerItems.forEach(item => bySymbol.set(item.symbol, item));
    prices.forEach(item => {
      if (!item.available || item.price === null || bySymbol.has(item.symbol)) return;
      bySymbol.set(item.symbol, {
        symbol: item.symbol,
        name: item.symbol,
        price: item.price,
        currency: 'USD',
        change: item.change,
        changePercent: item.changePercent,
        source: item.source,
        delayed: item.delayed,
      });
    });
    return Array.from(bySymbol.values())
      .filter(item => typeof item.changePercent === 'number')
      .sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))
      .slice(0, 5);
  }, [prices, tickerItems]);

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
              <span className={styles.eyebrow}><ShieldCheck size={15} />{text.delayed}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" onClick={() => void loadData(false)} disabled={refreshing}>
                <RefreshCcw size={16} className={refreshing ? styles.spin : ''} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
              <span>
                <Clock3 size={14} />
                {text.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated, locale) : text.notUpdated}
              </span>
              <small>{text.autoRefresh}</small>
            </div>
          </header>

          <DefensiveTicker
            items={tickerItems}
            loading={loading}
            error={marketError}
            lang={activeLang}
            text={text}
            locale={locale}
          />

          <section className={styles.summaryGrid} aria-label={text.sectorDirectory}>
            <TopStocksCard stocks={topStocks} loading={loading} text={text} locale={locale} />
            <SectorDirectoryCard lang={activeLang} text={text} />
            <WhatDefensiveCard text={text} />
            <ComparisonCard text={text} />
          </section>

          <MoversMiniCard movers={topMoverRows} text={text} locale={locale} />

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

          <SectorGuide
            lang={activeLang}
            text={text}
          />

          <section className={styles.disclaimer}>
            <span><Info size={20} /></span>
            <div>
              <h2>{text.disclaimerTitle}</h2>
              <p>{text.disclaimerBody}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DefensiveStocksNewsPage;
