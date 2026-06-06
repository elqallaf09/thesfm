'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Clock3,
  Cloud,
  Cpu,
  ExternalLink,
  HeartPulse,
  Info,
  Layers3,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from '@/components/defensive-stocks/DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type GrowthFilterId =
  | 'all'
  | 'ai'
  | 'technology'
  | 'semiconductors'
  | 'ecommerce'
  | 'cloud'
  | 'cybersecurity'
  | 'innovative_healthcare'
  | 'earnings'
  | 'analysis';

type GrowthTickerItem = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
};

type GrowthTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: GrowthTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: GrowthTickerItem[];
  };

type GrowthNewsItem = {
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

type GrowthNewsResponse =
  | {
    success: true;
    category: 'growth';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: GrowthNewsItem[];
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
const FEATURED_SYMBOLS = ['NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'PLTR', 'SNOW', 'NOW'] as const;

const TEXT = {
  ar: {
    title: 'أخبار أسهم النمو',
    subtitle: 'تغطية شاملة لأخبار وتحليلات أسهم النمو في قطاعات التقنية، الذكاء الاصطناعي، التجارة الإلكترونية، الرعاية الصحية المبتكرة، والبرمجيات السحابية.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'بيانات سوق مؤجلة أو آخر سعر متاح',
    liveStatus: 'آخر سعر متاح من مزود بيانات حقيقي',
    tickerTitle: 'شريط أسهم النمو المباشر',
    tickerSubtitle: 'أسعار حقيقية لأسهم النمو الأمريكية المختارة مع التغير اليومي.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حالياً من مصادر السوق الحقيقية.',
    whatTitle: 'ما هي أسهم النمو؟',
    whatBody: 'أسهم النمو هي شركات يتوقع أن تنمو إيراداتها أو أرباحها بوتيرة أسرع من السوق، وغالباً تعيد استثمار أرباحها بدلاً من دفع توزيعات كبيرة.',
    revenueGrowth: 'نمو الإيرادات',
    rapidExpansion: 'توسع سريع',
    higherVolatility: 'تقلب أعلى',
    futureFocus: 'تركيز على المستقبل',
    sectorTitle: 'أبرز قطاعات النمو',
    comparisonTitle: 'أسهم النمو مقارنة بأسهم القيمة',
    growthStocks: 'أسهم النمو',
    valueStocks: 'أسهم القيمة',
    movementTitle: 'حركة أسهم النمو',
    movementSubtitle: 'أبرز التحركات اليومية المتاحة من بيانات السوق الحقيقية.',
    newsTitle: 'أخبار أسهم النمو',
    newsSubtitle: 'تابع أحدث أخبار الشركات عالية النمو والقطاعات المرتبطة بها.',
    searchPlaceholder: 'ابحث عن خبر أو رمز أو تصنيف...',
    filtersLabel: 'التصنيفات',
    showMore: 'تحميل المزيد',
    showing: 'المعروض',
    results: 'خبر',
    readArticle: 'قراءة الخبر',
    source: 'المصدر',
    noLink: 'الرابط غير متاح',
    emptyTitle: 'لا توجد أخبار متاحة حالياً لهذا التصنيف',
    emptyHint: 'جرّب بحثاً آخر أو اختر تصنيفاً مختلفاً.',
    errorTitle: 'تعذر تحميل البيانات حالياً',
    errorBody: 'تعذر جلب أخبار أسهم النمو من المصادر الحقيقية حالياً.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز أسهم النمو',
    featuredSubtitle: 'بطاقات مختصرة مبنية على الأسعار الحقيقية المتاحة حالياً.',
    details: 'عرض التفاصيل',
    unavailable: 'غير متوفر',
    priceSource: 'مصدر السعر',
    sectorGuideTitle: 'دليل قطاعات النمو',
    viewMore: 'عرض المزيد',
    examples: 'أمثلة',
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست توصية شراء أو بيع. أسهم النمو قد تكون أكثر تقلباً من الأسهم الدفاعية، وقد تتأثر بتغير أسعار الفائدة، نتائج الأرباح، والتقييمات السوقية. يرجى إجراء بحثك الخاص أو استشارة مستشار مالي قبل اتخاذ أي قرار استثماري.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    published: 'النشر',
    noMore: 'تم عرض كل الأخبار المتاحة',
  },
  en: {
    title: 'Growth Stocks News',
    subtitle: 'Comprehensive coverage of growth stock news and analysis across technology, AI, e-commerce, innovative healthcare, and cloud software.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Delayed market data or last available price',
    liveStatus: 'Last available price from a real data provider',
    tickerTitle: 'Live growth stock ticker',
    tickerSubtitle: 'Real prices for selected US growth stocks with daily change.',
    tickerEmpty: 'No real market prices are available right now.',
    whatTitle: 'What are growth stocks?',
    whatBody: 'Growth stocks are companies expected to grow revenue or earnings faster than the market, often reinvesting profits instead of paying large dividends.',
    revenueGrowth: 'Revenue growth',
    rapidExpansion: 'Rapid expansion',
    higherVolatility: 'Higher volatility',
    futureFocus: 'Future focus',
    sectorTitle: 'Key growth sectors',
    comparisonTitle: 'Growth stocks versus value stocks',
    growthStocks: 'Growth stocks',
    valueStocks: 'Value stocks',
    movementTitle: 'Growth stock movers',
    movementSubtitle: 'Daily movers from real market data.',
    newsTitle: 'Growth stocks news',
    newsSubtitle: 'Follow the latest news around high-growth companies and related sectors.',
    searchPlaceholder: 'Search news, ticker, or category...',
    filtersLabel: 'Categories',
    showMore: 'Load more',
    showing: 'Showing',
    results: 'news',
    readArticle: 'Read article',
    source: 'Source',
    noLink: 'Link unavailable',
    emptyTitle: 'No news available for this filter',
    emptyHint: 'Try another search or choose a different category.',
    errorTitle: 'Unable to load data right now',
    errorBody: 'Real growth stock news could not be loaded right now.',
    retry: 'Retry',
    featuredTitle: 'Featured growth stocks',
    featuredSubtitle: 'Compact cards built from currently available real prices.',
    details: 'View details',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    sectorGuideTitle: 'Growth sector guide',
    viewMore: 'View more',
    examples: 'Examples',
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for educational and general information only, not a buy or sell recommendation. Growth stocks can be more volatile than defensive stocks and may be affected by interest rates, earnings results, and market valuations. Do your own research or consult a financial advisor before investing.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    published: 'Published',
    noMore: 'All available news is visible',
  },
  fr: {
    title: 'Actualités des actions de croissance',
    subtitle: 'Couverture des actions de croissance dans la technologie, l’IA, l’e-commerce, la santé innovante et les logiciels cloud.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Données différées ou dernier prix disponible',
    liveStatus: 'Dernier prix disponible depuis un fournisseur réel',
    tickerTitle: 'Bandeau actions de croissance',
    tickerSubtitle: 'Prix réels des actions de croissance sélectionnées.',
    tickerEmpty: 'Aucun prix réel disponible pour le moment.',
    whatTitle: 'Que sont les actions de croissance ?',
    whatBody: 'Ce sont des sociétés dont les revenus ou bénéfices devraient croître plus vite que le marché, souvent avec réinvestissement des profits.',
    revenueGrowth: 'Croissance des revenus',
    rapidExpansion: 'Expansion rapide',
    higherVolatility: 'Volatilité plus élevée',
    futureFocus: 'Orientation future',
    sectorTitle: 'Principaux secteurs de croissance',
    comparisonTitle: 'Croissance et valeur',
    growthStocks: 'Croissance',
    valueStocks: 'Valeur',
    movementTitle: 'Mouvements des actions de croissance',
    movementSubtitle: 'Mouvements quotidiens issus de données réelles.',
    newsTitle: 'Actualités des actions de croissance',
    newsSubtitle: 'Suivez les dernières nouvelles des entreprises à forte croissance.',
    searchPlaceholder: 'Rechercher une actualité, un symbole ou une catégorie...',
    filtersLabel: 'Catégories',
    showMore: 'Afficher plus',
    showing: 'Affiché',
    results: 'actualités',
    readArticle: 'Lire l’article',
    source: 'Source',
    noLink: 'Lien indisponible',
    emptyTitle: 'Aucune actualité disponible pour ce filtre',
    emptyHint: 'Essayez une autre recherche ou catégorie.',
    errorTitle: 'Impossible de charger les données',
    errorBody: 'Les actualités réelles ne peuvent pas être chargées pour le moment.',
    retry: 'Réessayer',
    featuredTitle: 'Actions de croissance en vedette',
    featuredSubtitle: 'Cartes basées sur les prix réels disponibles.',
    details: 'Voir détails',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    sectorGuideTitle: 'Guide des secteurs de croissance',
    viewMore: 'Voir plus',
    examples: 'Exemples',
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement, pas une recommandation d’achat ou de vente. Les actions de croissance peuvent être plus volatiles et sensibles aux taux, résultats et valorisations.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    published: 'Publié',
    noMore: 'Toutes les actualités disponibles sont visibles',
  },
} satisfies Record<LangCode, Record<string, string>>;

const FILTERS: Array<{ id: GrowthFilterId; label: Record<LangCode, string>; keywords: string[]; sectors: string[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'ai', label: { ar: 'الذكاء الاصطناعي', en: 'AI', fr: 'IA' }, keywords: ['ai', 'artificial intelligence', 'machine learning', 'generative ai', 'nvidia', 'palantir'], sectors: ['artificial_intelligence'] },
  { id: 'technology', label: { ar: 'التكنولوجيا', en: 'Technology', fr: 'Technologie' }, keywords: ['technology', 'software', 'apple', 'microsoft', 'alphabet', 'meta'], sectors: ['software', 'digital_consumption'] },
  { id: 'semiconductors', label: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' }, keywords: ['semiconductor', 'chip', 'gpu', 'processor', 'nvidia', 'amd', 'broadcom'], sectors: ['semiconductors'] },
  { id: 'ecommerce', label: { ar: 'التجارة الإلكترونية', en: 'E-commerce', fr: 'E-commerce' }, keywords: ['e-commerce', 'ecommerce', 'online retail', 'marketplace', 'amazon', 'shopify', 'mercadolibre'], sectors: ['ecommerce'] },
  { id: 'cloud', label: { ar: 'البرمجيات السحابية', en: 'Cloud software', fr: 'Logiciels cloud' }, keywords: ['cloud', 'saas', 'enterprise software', 'snowflake', 'servicenow', 'datadog', 'cloudflare'], sectors: ['cloud', 'software'] },
  { id: 'cybersecurity', label: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' }, keywords: ['cybersecurity', 'security software', 'zero trust', 'crowdstrike', 'zscaler'], sectors: ['cybersecurity'] },
  { id: 'innovative_healthcare', label: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' }, keywords: ['medical technology', 'robotic surgery', 'dexcom', 'intuitive surgical'], sectors: ['innovative_healthcare'] },
  { id: 'earnings', label: { ar: 'أرباح وتوقعات', en: 'Earnings & outlooks', fr: 'Résultats et perspectives' }, keywords: ['earnings', 'revenue', 'guidance', 'forecast', 'outlook', 'profit'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & reports', fr: 'Analyses et rapports' }, keywords: ['analysis', 'analyst', 'rating', 'report', 'target', 'upgrade', 'downgrade'], sectors: [] },
];

const SECTOR_GUIDES = [
  {
    id: 'ai' as GrowthFilterId,
    icon: BrainCircuit,
    symbols: ['NVDA', 'MSFT', 'GOOGL', 'PLTR'],
    title: { ar: 'التكنولوجيا والذكاء الاصطناعي', en: 'Technology and AI', fr: 'Technologie et IA' },
    body: {
      ar: 'شركات تستفيد من الطلب على نماذج الذكاء الاصطناعي، البنية السحابية، وتحليل البيانات.',
      en: 'Companies tied to AI models, cloud infrastructure, and data analysis demand.',
      fr: 'Sociétés liées à l’IA, au cloud et à l’analyse de données.',
    },
  },
  {
    id: 'platforms',
    icon: Bot,
    symbols: ['AAPL', 'AMZN', 'GOOGL', 'META', 'NFLX'],
    title: { ar: 'التقنية والمنصات الكبرى', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
    body: {
      ar: 'منصات تقنية واسعة تعتمد على الأجهزة، الإعلانات الرقمية، المحتوى، والسحابة لقيادة نمو الإيرادات.',
      en: 'Large technology platforms driven by devices, digital ads, content, and cloud revenue growth.',
      fr: 'Grandes plateformes portées par les appareils, la publicité numérique, le contenu et le cloud.',
    },
  },
  {
    id: 'semiconductors' as GrowthFilterId,
    icon: Cpu,
    symbols: ['NVDA', 'AMD', 'AVGO', 'INTC', 'TSM'],
    title: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' },
    body: {
      ar: 'شركات رقائق ومعالجات تستفيد من دورات الذكاء الاصطناعي ومراكز البيانات.',
      en: 'Chip and processor companies exposed to AI and data-center cycles.',
      fr: 'Puces et processeurs exposés à l’IA et aux centres de données.',
    },
  },
  {
    id: 'future_mobility',
    icon: Zap,
    symbols: ['TSLA', 'RIVN', 'LCID'],
    title: { ar: 'المركبات الكهربائية والتنقل المستقبلي', en: 'EV and future mobility', fr: 'VE et mobilité future' },
    body: {
      ar: 'شركات سيارات كهربائية وتنقل جديد تتأثر بنمو الطلب، سلاسل التوريد، والتمويل طويل الأجل.',
      en: 'Electric vehicle and mobility companies tied to demand growth, supply chains, and long-term funding.',
      fr: 'Entreprises de véhicules électriques et mobilité liées à la demande, aux chaînes d’approvisionnement et au financement.',
    },
  },
  {
    id: 'ecommerce' as GrowthFilterId,
    icon: ShoppingBag,
    symbols: ['AMZN', 'SHOP', 'MELI', 'ABNB'],
    title: { ar: 'التجارة الإلكترونية', en: 'E-commerce', fr: 'E-commerce' },
    body: {
      ar: 'منصات أسواق رقمية وخدمات بيع عبر الإنترنت تعتمد على نمو الإنفاق الرقمي.',
      en: 'Digital marketplace and online commerce platforms tied to digital spending growth.',
      fr: 'Places de marché numériques liées aux dépenses en ligne.',
    },
  },
  {
    id: 'cloud' as GrowthFilterId,
    icon: Cloud,
    symbols: ['MSFT', 'CRM', 'NOW', 'SNOW', 'PLTR'],
    title: { ar: 'البرمجيات السحابية', en: 'Cloud software', fr: 'Logiciels cloud' },
    body: {
      ar: 'برمجيات اشتراكية وبنية سحابية ذات إيرادات متكررة وقابلة للتوسع.',
      en: 'Subscription software and cloud platforms with scalable recurring revenue.',
      fr: 'Logiciels par abonnement et plateformes cloud évolutives.',
    },
  },
  {
    id: 'cybersecurity' as GrowthFilterId,
    icon: ShieldCheck,
    symbols: ['CRWD', 'PANW', 'NET'],
    title: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' },
    body: {
      ar: 'حلول حماية رقمية تتوسع مع زيادة المخاطر والاعتماد على البنية السحابية.',
      en: 'Security platforms expanding with cyber risk and cloud adoption.',
      fr: 'Plateformes de sécurité liées aux risques cyber et au cloud.',
    },
  },
  {
    id: 'innovative_healthcare' as GrowthFilterId,
    icon: HeartPulse,
    symbols: ['ISRG', 'DXCM'],
    title: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' },
    body: {
      ar: 'تقنيات طبية ورعاية رقمية تعتمد على الابتكار والاعتماد السريري.',
      en: 'Medical technology tied to innovation and clinical adoption.',
      fr: 'Technologies médicales portées par l’innovation.',
    },
  },
];

const FEATURED_META: Record<string, { sector: Record<LangCode, string> }> = {
  NVDA: { sector: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' } },
  MSFT: { sector: { ar: 'الذكاء الاصطناعي والسحابة', en: 'AI and cloud', fr: 'IA et cloud' } },
  AAPL: { sector: { ar: 'التقنية والاستهلاك الرقمي', en: 'Technology and digital consumption', fr: 'Technologie et consommation numérique' } },
  AMZN: { sector: { ar: 'التجارة الإلكترونية والسحابة', en: 'E-commerce and cloud', fr: 'E-commerce et cloud' } },
  GOOGL: { sector: { ar: 'الذكاء الاصطناعي والإعلانات الرقمية', en: 'AI and digital ads', fr: 'IA et publicité numérique' } },
  META: { sector: { ar: 'الذكاء الاصطناعي والمنصات الاجتماعية', en: 'AI and social platforms', fr: 'IA et plateformes sociales' } },
  TSLA: { sector: { ar: 'المركبات الكهربائية', en: 'Electric vehicles', fr: 'Véhicules électriques' } },
  AVGO: { sector: { ar: 'أشباه الموصلات والبنية التحتية', en: 'Semiconductors and infrastructure', fr: 'Semi-conducteurs et infrastructure' } },
  AMD: { sector: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' } },
  PLTR: { sector: { ar: 'الذكاء الاصطناعي وتحليل البيانات', en: 'AI and data analytics', fr: 'IA et analyse de données' } },
  SNOW: { sector: { ar: 'البيانات السحابية', en: 'Cloud data', fr: 'Données cloud' } },
  NOW: { sector: { ar: 'برمجيات المؤسسات السحابية', en: 'Enterprise cloud software', fr: 'Logiciels cloud d’entreprise' } },
};

const GROWTH_SYMBOL_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA',
  AMD: 'Advanced Micro Devices',
  AVGO: 'Broadcom',
  INTC: 'Intel',
  TSM: 'Taiwan Semiconductor',
  MSFT: 'Microsoft',
  CRM: 'Salesforce',
  NOW: 'ServiceNow',
  SNOW: 'Snowflake',
  PLTR: 'Palantir',
  AAPL: 'Apple',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet',
  META: 'Meta Platforms',
  NFLX: 'Netflix',
  TSLA: 'Tesla',
  RIVN: 'Rivian',
  LCID: 'Lucid Group',
  CRWD: 'CrowdStrike',
  PANW: 'Palo Alto Networks',
  NET: 'Cloudflare',
  SHOP: 'Shopify',
  MELI: 'MercadoLibre',
  ABNB: 'Airbnb',
  DDOG: 'Datadog',
  UBER: 'Uber',
  RBLX: 'Roblox',
  ISRG: 'Intuitive Surgical',
  DXCM: 'DexCom',
};

const GROWTH_SYMBOL_SECTORS: Record<string, Record<LangCode, string>> = {
  NVDA: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' },
  AMD: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' },
  AVGO: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' },
  INTC: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' },
  TSM: { ar: 'الذكاء الاصطناعي وأشباه الموصلات', en: 'AI and semiconductors', fr: 'IA et semi-conducteurs' },
  MSFT: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  CRM: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  NOW: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  SNOW: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  PLTR: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  AAPL: { ar: 'التقنية والمنصات', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
  AMZN: { ar: 'التقنية والمنصات', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
  GOOGL: { ar: 'التقنية والمنصات', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
  META: { ar: 'التقنية والمنصات', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
  NFLX: { ar: 'التقنية والمنصات', en: 'Big tech and platforms', fr: 'Grandes plateformes tech' },
  TSLA: { ar: 'المركبات الكهربائية والتنقل', en: 'EV and future mobility', fr: 'VE et mobilité future' },
  RIVN: { ar: 'المركبات الكهربائية والتنقل', en: 'EV and future mobility', fr: 'VE et mobilité future' },
  LCID: { ar: 'المركبات الكهربائية والتنقل', en: 'EV and future mobility', fr: 'VE et mobilité future' },
  CRWD: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' },
  PANW: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' },
  NET: { ar: 'الأمن السيبراني', en: 'Cybersecurity', fr: 'Cybersécurité' },
  SHOP: { ar: 'التجارة الرقمية', en: 'E-commerce and digital economy', fr: 'E-commerce et économie numérique' },
  MELI: { ar: 'التجارة الرقمية', en: 'E-commerce and digital economy', fr: 'E-commerce et économie numérique' },
  ABNB: { ar: 'التجارة الرقمية', en: 'E-commerce and digital economy', fr: 'E-commerce et économie numérique' },
  UBER: { ar: 'التجارة الرقمية', en: 'E-commerce and digital economy', fr: 'E-commerce et économie numérique' },
  RBLX: { ar: 'التجارة الرقمية', en: 'E-commerce and digital economy', fr: 'E-commerce et économie numérique' },
  DDOG: { ar: 'السحابة والبرمجيات', en: 'Cloud and software', fr: 'Cloud et logiciels' },
  ISRG: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' },
  DXCM: { ar: 'الرعاية الصحية المبتكرة', en: 'Innovative healthcare', fr: 'Santé innovante' },
};

function growthSymbolName(symbol: string) {
  return GROWTH_SYMBOL_NAMES[symbol] ?? symbol;
}

function growthSymbolSector(symbol: string, lang: LangCode, fallback: string) {
  return GROWTH_SYMBOL_SECTORS[symbol]?.[lang] ?? FEATURED_META[symbol]?.sector[lang] ?? fallback;
}

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.reason || payload?.error || `Request failed with ${response.status}`);
  return payload as T;
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== 'number' || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function formatMoney(value: number | null | undefined, currency = 'USD', locale = 'ar-KW') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: currency === 'KWD' ? 3 : 2,
    maximumFractionDigits: currency === 'KWD' ? 3 : 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined, locale = 'ar-KW') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function relativeTime(value: string, lang: LangCode) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const abs = Math.abs(diffMinutes);
  const locale = localeFor(lang);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return formatter.format(diffMinutes, 'minute');
  const hours = Math.round(diffMinutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function newestTimestamp(values: Array<string | null | undefined>) {
  return values
    .map(value => value ? new Date(value).getTime() : 0)
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0]
    ? new Date(values.map(value => value ? new Date(value).getTime() : 0).sort((a, b) => b - a)[0]).toISOString()
    : '';
}

function displayTitle(item: GrowthNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: GrowthNewsItem) {
  const summary = item.summary || item.summaryOriginal || '';
  if (summary) return summary;
  return displayTitle(item).length > 150 ? `${displayTitle(item).slice(0, 147).trim()}...` : '';
}

function textForSearch(item: GrowthNewsItem) {
  return [
    displayTitle(item),
    displaySummary(item),
    item.source,
    item.ticker,
    item.companyName,
    item.sector,
    ...(item.sectors ?? []),
  ].join(' ').toLowerCase();
}

function itemMatchesSearch(item: GrowthNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return textForSearch(item).includes(needle);
}

function itemMatchesFilter(item: GrowthNewsItem, filterId: GrowthFilterId) {
  if (filterId === 'all') return true;
  const filter = FILTERS.find(candidate => candidate.id === filterId);
  if (!filter) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (filter.sectors.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return filter.keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function categoryLabelForItem(item: GrowthNewsItem, lang: LangCode) {
  const sector = item.sectors?.[0] ?? item.sector ?? '';
  const filter = FILTERS.find(candidate => candidate.sectors.includes(sector) || candidate.id === sector);
  return filter?.label[lang] ?? FILTERS[0].label[lang];
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <span className={`${styles.skeletonLine} ${wide ? styles.skeletonWide : ''}`} />;
}

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Sparkles;
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

function GrowthTicker({
  items,
  loading,
  error,
  lang,
  text,
  locale,
}: {
  items: GrowthTickerItem[];
  loading: boolean;
  error: string;
  lang: LangCode;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  const tickerSet = items.length > 0 ? items : [];

  return (
    <section className={`${styles.tickerPanel} ${styles.compactTickerPanel}`} aria-label={text.tickerTitle}>
      <PanelTitle icon={Zap} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
      {loading ? (
        <div className={styles.tickerSkeletonRow} aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => <span key={index} />)}
        </div>
      ) : error || tickerSet.length === 0 ? (
        <div className={styles.inlineState}>
          <AlertTriangle size={18} />
          <span>{error || text.tickerEmpty}</span>
        </div>
      ) : (
        <div className={styles.tickerStrip}>
          <span className={styles.tickerStatus}>{text.liveStatus}</span>
          <div className={styles.tickerViewport}>
            <div className={styles.tickerTrack}>
              {[0, 1].map(setIndex => (
                <div className={styles.tickerSet} key={setIndex} aria-hidden={setIndex === 1}>
                  {tickerSet.map(item => {
                    const tone = changeTone(item.changePercent);
                    const displayName = growthSymbolName(item.symbol) === item.symbol ? item.name : growthSymbolName(item.symbol);
                    return (
                      <article className={styles.tickerItem} key={`${setIndex}-${item.symbol}`}>
                        <div>
                          <strong dir="ltr">{item.symbol}</strong>
                          <span>{displayName}</span>
                          <span>{growthSymbolSector(item.symbol, lang, text.unavailable)}</span>
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
      )}
    </section>
  );
}

function WhatGrowthCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={`${styles.summaryCard} ${styles.infoCard}`}>
      <PanelTitle icon={Sparkles} title={text.whatTitle} />
      <p>{text.whatBody}</p>
      <ul>
        {[text.revenueGrowth, text.rapidExpansion, text.higherVolatility, text.futureFocus].map(point => (
          <li key={point}><span />{point}</li>
        ))}
      </ul>
    </article>
  );
}

function GrowthSectorsCard({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={BookOpen} title={text.sectorTitle} />
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

function ComparisonCard({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  const growth = {
    ar: ['نمو أسرع', 'تقييمات أعلى', 'تقلب أكبر', 'مناسبة للمستثمر طويل الأجل'],
    en: ['Faster growth', 'Higher valuations', 'Higher volatility', 'Suited to long-term investors'],
    fr: ['Croissance plus rapide', 'Valorisations plus élevées', 'Volatilité plus élevée', 'Adaptées aux investisseurs long terme'],
  };
  const value = {
    ar: ['تقييم أقل', 'أرباح حالية أقوى', 'توزيعات محتملة', 'مناسبة للمستثمر المحافظ'],
    en: ['Lower valuation', 'Stronger current earnings', 'Potential dividends', 'Suited to conservative investors'],
    fr: ['Valorisation plus faible', 'Bénéfices actuels plus solides', 'Dividendes possibles', 'Adaptées aux investisseurs prudents'],
  };
  return (
    <article className={`${styles.summaryCard} ${styles.comparisonCard}`}>
      <PanelTitle icon={Layers3} title={text.comparisonTitle} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.growthStocks}</strong>
          {growth[lang].map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.valueStocks}</strong>
          {value[lang].map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </article>
  );
}

function MovementCard({
  movers,
  tickerItems,
  loading,
  text,
  locale,
}: {
  movers: StockCategoryMoverItem[];
  tickerItems: GrowthTickerItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
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
      <PanelTitle icon={BarChart3} title={text.movementTitle} subtitle={text.movementSubtitle} />
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
            return (
              <div className={styles.topStockRow} key={item.symbol}>
                <div>
                  <strong dir="ltr">#{item.rank} {item.symbol}</strong>
                  <span>{item.name}</span>
                </div>
                <div className={styles.topStockValue}>
                  <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
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

function NewsCard({
  item,
  lang,
  locale,
  text,
}: {
  item: GrowthNewsItem;
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
      {summary ? <p dir={contentDir}>{summary}</p> : null}
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
  items: GrowthNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: GrowthFilterId;
  setActiveFilter: (filter: GrowthFilterId) => void;
  query: string;
  setQuery: (query: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: (count: number) => number) => void;
  counts: Record<GrowthFilterId, number>;
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

function FeaturedStocks({
  items,
  loading,
  lang,
  locale,
  text,
}: {
  items: GrowthTickerItem[];
  loading: boolean;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
  const bySymbol = new Map(items.map(item => [item.symbol, item]));

  return (
    <section className={styles.sectorGuidePanel} aria-label={text.featuredTitle}>
      <PanelTitle icon={BriefcaseBusiness} title={text.featuredTitle} subtitle={text.featuredSubtitle} />
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
          const displayName = growthSymbolName(symbol) === symbol ? quote?.name ?? symbol : growthSymbolName(symbol);
          const marketHref = `/market-analysis?symbol=${encodeURIComponent(symbol)}`;
          return (
            <article className={styles.sectorCard} key={symbol}>
              <span className={styles.sectorIcon}><Sparkles size={21} /></span>
              <h3>{quote?.name ?? symbol}</h3>
              <div className={styles.symbolChips}>
                <a
                  href={marketHref}
                  title={`${displayName} · ${symbol}`}
                  aria-label={`${displayName} ${symbol}`}
                  dir="ltr"
                >
                  <span className={styles.symbolCompany}>{displayName}</span>
                  <span className={styles.symbolDivider} aria-hidden="true">·</span>
                  <strong>{symbol}</strong>
                </a>
                <span>{growthSymbolSector(symbol, lang, text.unavailable)}</span>
              </div>
              {quote ? (
                <>
                  <p dir="ltr">
                    <strong>{formatMoney(quote.price, quote.currency, locale)}</strong>
                    {' '}
                    <em className={styles[tone]}>{formatPercent(quote.changePercent, locale)}</em>
                  </p>
                  <p>{text.priceSource}: {quote.source}</p>
                </>
              ) : (
                <p>{text.unavailable}</p>
              )}
              <a href={marketHref}>
                {text.details}
                <ArrowUpRight size={14} />
              </a>
            </article>
          );
        })}
      </div>
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
      <PanelTitle icon={BookOpen} title={text.sectorGuideTitle} />
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
                  const name = growthSymbolName(symbol);
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

export function GrowthStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<GrowthTickerItem[]>([]);
  const [newsItems, setNewsItems] = useState<GrowthNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<GrowthFilterId>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');

    const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<GrowthTickerResponse>('/api/growth-stocks/ticker'),
      fetchJson<GrowthNewsResponse>(`/api/growth-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/growth-stocks/movers?limit=5'),
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
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      setNewsItems([]);
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
    }, {} as Record<GrowthFilterId, number>);
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
              <span className={styles.eyebrow}><Bot size={15} />{text.delayed}</span>
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

          <GrowthTicker items={tickerItems} loading={loading} error={marketError} lang={activeLang} text={text} locale={locale} />

          <section className={styles.summaryGrid} aria-label={text.sectorTitle}>
            <WhatGrowthCard text={text} />
            <GrowthSectorsCard lang={activeLang} text={text} />
            <ComparisonCard lang={activeLang} text={text} />
            <MovementCard movers={topMoverRows} tickerItems={tickerItems} loading={loading} text={text} locale={locale} />
          </section>

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

export default GrowthStocksNewsPage;
