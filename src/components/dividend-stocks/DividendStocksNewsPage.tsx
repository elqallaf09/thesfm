'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Clock3,
  Coins,
  ExternalLink,
  HeartPulse,
  Info,
  Layers3,
  Newspaper,
  PiggyBank,
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
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from '@/components/defensive-stocks/DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type DividendFilterId =
  | 'all'
  | 'energy'
  | 'utilities'
  | 'telecom'
  | 'consumer_staples'
  | 'reits'
  | 'healthcare'
  | 'dividend_increase'
  | 'dividend_cut'
  | 'earnings'
  | 'analysis';

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
  delayed: true;
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

type DividendNewsResponse =
  | {
    success: true;
    category: 'dividend';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: DividendNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
  };

type DividendEvent = {
  id: string;
  symbol: string;
  name: string;
  type: 'ex' | 'payment';
  date: string;
  annualDividend: number | null;
  currency: string;
};

const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const FEATURED_SYMBOLS = ['JNJ', 'PG', 'KO', 'PEP', 'XOM', 'CVX', 'SO', 'DUK', 'NEE', 'VZ', 'T', 'O'] as const;

const TEXT = {
  ar: {
    title: 'أخبار أسهم التوزيعات',
    subtitle: 'تغطية شاملة لأخبار وتحليلات أسهم التوزيعات والشركات المعروفة بتوزيعات الأرباح المستقرة في قطاعات مثل الطاقة، المرافق العامة، الاتصالات، السلع الاستهلاكية الأساسية، والعقارات.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'بيانات سوق مؤجلة أو آخر سعر متاح',
    liveStatus: 'آخر سعر متاح من مزود بيانات حقيقي',
    tickerTitle: 'شريط أسهم التوزيعات المباشر',
    tickerSubtitle: 'أسعار حقيقية لأسهم توزيعات مختارة مع التغير اليومي وعائد التوزيعات عند توفره من المصدر.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حالياً من مصادر السوق الحقيقية.',
    yieldShort: 'العائد',
    payoutShort: 'نسبة الدفع',
    annualDividend: 'التوزيع السنوي',
    exDividendDate: 'تاريخ الاستحقاق',
    paymentDate: 'تاريخ التوزيع',
    dividendYieldBody: 'نسبة التوزيع النقدي السنوي إلى سعر السهم.',
    payoutRatioBody: 'تقيس مقدار ما توزعه الشركة من أرباحها مقارنة بأرباحها.',
    exDividendBody: 'آخر يوم يجب امتلاك السهم قبله لاستحقاق التوزيع القادم.',
    paymentDateBody: 'اليوم المتوقع لدفع التوزيع للمساهمين المؤهلين عند توفره.',
    cashFlowBody: 'التدفق النقدي يساعد على تقييم قدرة الشركة على استمرار التوزيعات.',
    whatTitle: 'ما هي أسهم التوزيعات؟',
    whatBody: 'أسهم التوزيعات هي حصص في شركات توزع جزءاً من أرباحها على المساهمين بشكل دوري، وقد تجمع بين الدخل النقدي والاستقرار النسبي.',
    cashIncome: 'دخل نقدي دوري',
    relativeStability: 'شركات مستقرة نسبياً',
    longTerm: 'مناسبة للمستثمر طويل الأجل',
    incomeGrowth: 'قد تجمع بين الدخل والنمو',
    sectorTitle: 'أبرز قطاعات أسهم التوزيعات',
    metricTitle: 'مؤشرات تقييم أسهم التوزيعات',
    movementTitle: 'حركة أسهم التوزيعات',
    movementSubtitle: 'أبرز التحركات اليومية المتاحة من بيانات السوق الحقيقية.',
    comparisonTitle: 'أسهم التوزيعات مقارنة بأسهم النمو',
    dividendStocks: 'أسهم التوزيعات',
    growthStocks: 'أسهم النمو',
    newsTitle: 'أخبار أسهم التوزيعات',
    newsSubtitle: 'تابع آخر الأخبار المتعلقة بالشركات الموزعة للأرباح وتحديثات التوزيعات والنتائج المالية.',
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
    errorBody: 'تعذر جلب أخبار أسهم التوزيعات من المصادر الحقيقية حالياً.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز أسهم التوزيعات',
    featuredSubtitle: 'بطاقات مختصرة تعرض السعر الحقيقي ومؤشرات التوزيعات المتاحة من المصدر دون بيانات مصطنعة.',
    details: 'عرض التفاصيل',
    unavailable: 'غير متاح',
    priceSource: 'مصدر السعر',
    dividendSource: 'مصدر التوزيعات',
    eventsTitle: 'مواعيد وأحداث التوزيعات',
    eventsSubtitle: 'تواريخ الاستحقاق أو التوزيع عندما يرسلها مزود البيانات الحقيقي.',
    noEvents: 'لا توجد أحداث توزيعات متاحة حالياً',
    sectorGuideTitle: 'دليل قطاعات أسهم التوزيعات',
    viewMore: 'عرض المزيد',
    examples: 'أمثلة',
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست توصية شراء أو بيع. أسهم التوزيعات قد تتأثر بعوامل مثل نتائج الأرباح، التدفقات النقدية، مستويات الدين، أسعار الفائدة، والسياسات النقدية. عائد التوزيعات المرتفع لا يعني دائماً أن السهم أفضل. يرجى إجراء بحثك الخاص أو استشارة مستشار مالي قبل اتخاذ أي قرار استثماري.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    published: 'النشر',
    noMore: 'تم عرض كل الأخبار المتاحة',
  },
  en: {
    title: 'Dividend Stocks News',
    subtitle: 'Comprehensive coverage of dividend stock news and analysis across energy, utilities, telecom, consumer staples, real estate, and healthcare.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Delayed market data or last available price',
    liveStatus: 'Last available price from a real data provider',
    tickerTitle: 'Live dividend stock ticker',
    tickerSubtitle: 'Real prices for selected dividend stocks with daily change and provider-supplied dividend yield when available.',
    tickerEmpty: 'No real market prices are available right now.',
    yieldShort: 'Yield',
    payoutShort: 'Payout',
    annualDividend: 'Annual dividend',
    exDividendDate: 'Ex-dividend date',
    paymentDate: 'Payment date',
    dividendYieldBody: 'Annual cash dividend relative to the share price.',
    payoutRatioBody: 'Measures how much of earnings the company distributes.',
    exDividendBody: 'The cutoff date investors track to qualify for the next payout.',
    paymentDateBody: 'The expected date eligible shareholders receive the payout when available.',
    cashFlowBody: 'Cash flow helps assess whether dividends can be sustained.',
    whatTitle: 'What are dividend stocks?',
    whatBody: 'Dividend stocks are shares of companies that distribute part of their profits to shareholders on a recurring basis.',
    cashIncome: 'Recurring cash income',
    relativeStability: 'Relatively stable companies',
    longTerm: 'Useful for long-term investors',
    incomeGrowth: 'Can combine income and growth',
    sectorTitle: 'Key dividend stock sectors',
    metricTitle: 'Dividend evaluation metrics',
    movementTitle: 'Dividend stock movers',
    movementSubtitle: 'Daily movers from real market data.',
    comparisonTitle: 'Dividend stocks versus growth stocks',
    dividendStocks: 'Dividend stocks',
    growthStocks: 'Growth stocks',
    newsTitle: 'Dividend stocks news',
    newsSubtitle: 'Follow the latest news around dividend-paying companies, payout updates, and earnings.',
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
    errorBody: 'Real dividend stock news could not be loaded right now.',
    retry: 'Retry',
    featuredTitle: 'Featured dividend stocks',
    featuredSubtitle: 'Cards built from currently available real prices and provider-supplied dividend fields.',
    details: 'View details',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    dividendSource: 'Dividend source',
    eventsTitle: 'Dividend dates and events',
    eventsSubtitle: 'Ex-dividend and payment dates only when returned by the real data provider.',
    noEvents: 'No dividend events are available right now',
    sectorGuideTitle: 'Dividend sector guide',
    viewMore: 'View more',
    examples: 'Examples',
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for educational and general information only, not a buy or sell recommendation. Dividend stocks may be affected by earnings, cash flows, debt levels, interest rates, and monetary policy. A high dividend yield does not always mean a better stock. Do your own research or consult a financial advisor before investing.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    published: 'Published',
    noMore: 'All available news is visible',
  },
  fr: {
    title: 'Actualités des actions à dividendes',
    subtitle: 'Couverture des actions à dividendes dans l’énergie, les services publics, les télécoms, la consommation de base, l’immobilier et la santé.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Données différées ou dernier prix disponible',
    liveStatus: 'Dernier prix disponible depuis un fournisseur réel',
    tickerTitle: 'Bandeau actions à dividendes',
    tickerSubtitle: 'Prix réels des actions à dividendes sélectionnées avec rendement fourni par le fournisseur lorsqu’il est disponible.',
    tickerEmpty: 'Aucun prix réel disponible pour le moment.',
    yieldShort: 'Rendement',
    payoutShort: 'Distribution',
    annualDividend: 'Dividende annuel',
    exDividendDate: 'Date ex-dividende',
    paymentDate: 'Date de paiement',
    dividendYieldBody: 'Dividende annuel en numéraire par rapport au prix de l’action.',
    payoutRatioBody: 'Mesure la part des bénéfices distribuée.',
    exDividendBody: 'Date suivie pour être éligible au prochain paiement.',
    paymentDateBody: 'Date prévue du paiement lorsque le fournisseur la fournit.',
    cashFlowBody: 'Les flux de trésorerie aident à juger la durabilité des dividendes.',
    whatTitle: 'Que sont les actions à dividendes ?',
    whatBody: 'Ce sont des actions de sociétés qui reversent régulièrement une partie de leurs bénéfices aux actionnaires.',
    cashIncome: 'Revenu en espèces récurrent',
    relativeStability: 'Sociétés relativement stables',
    longTerm: 'Utile pour le long terme',
    incomeGrowth: 'Peut combiner revenu et croissance',
    sectorTitle: 'Secteurs clés des dividendes',
    metricTitle: 'Indicateurs des dividendes',
    movementTitle: 'Mouvements des actions à dividendes',
    movementSubtitle: 'Mouvements quotidiens issus de données réelles.',
    comparisonTitle: 'Dividendes et croissance',
    dividendStocks: 'Actions à dividendes',
    growthStocks: 'Actions de croissance',
    newsTitle: 'Actualités des actions à dividendes',
    newsSubtitle: 'Suivez les sociétés versant des dividendes, les mises à jour de distributions et les résultats.',
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
    featuredTitle: 'Actions à dividendes en vedette',
    featuredSubtitle: 'Cartes basées sur les prix réels et les champs de dividendes disponibles.',
    details: 'Voir détails',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    dividendSource: 'Source des dividendes',
    eventsTitle: 'Dates et événements des dividendes',
    eventsSubtitle: 'Dates ex-dividende et de paiement uniquement si le fournisseur réel les fournit.',
    noEvents: 'Aucun événement de dividende disponible pour le moment',
    sectorGuideTitle: 'Guide des secteurs à dividendes',
    viewMore: 'Voir plus',
    examples: 'Exemples',
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement, pas une recommandation d’achat ou de vente. Les actions à dividendes peuvent être affectées par les résultats, les flux de trésorerie, la dette, les taux et la politique monétaire.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    published: 'Publié',
    noMore: 'Toutes les actualités disponibles sont visibles',
  },
} satisfies Record<LangCode, Record<string, string>>;

const FILTERS: Array<{ id: DividendFilterId; label: Record<LangCode, string>; keywords: string[]; sectors: string[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'energy', label: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' }, keywords: ['energy', 'oil', 'gas', 'exxon', 'chevron', 'dividend energy'], sectors: ['energy'] },
  { id: 'utilities', label: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' }, keywords: ['utility', 'utilities', 'power', 'electricity', 'nextera', 'duke', 'southern company'], sectors: ['utilities'] },
  { id: 'telecom', label: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' }, keywords: ['telecom', 'wireless', 'verizon', 'at&t', 'broadband'], sectors: ['telecom'] },
  { id: 'consumer_staples', label: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Consommation de base' }, keywords: ['consumer staples', 'staples', 'coca-cola', 'pepsico', 'procter', 'kimberly', 'general mills'], sectors: ['consumer_goods'] },
  { id: 'reits', label: { ar: 'العقارات REITs', en: 'REITs', fr: 'REITs' }, keywords: ['reit', 'real estate investment trust', 'realty income'], sectors: ['reits'] },
  { id: 'healthcare', label: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' }, keywords: ['healthcare', 'pharma', 'drug', 'johnson', 'pfizer', 'abbvie'], sectors: ['healthcare'] },
  { id: 'dividend_increase', label: { ar: 'رفع التوزيعات', en: 'Dividend increases', fr: 'Hausse des dividendes' }, keywords: ['raises dividend', 'hikes dividend', 'boosts dividend', 'dividend increase', 'increases payout', 'dividend growth', 'رفع التوزيعات', 'زيادة التوزيعات'], sectors: [] },
  { id: 'dividend_cut', label: { ar: 'خفض التوزيعات', en: 'Dividend cuts', fr: 'Baisse des dividendes' }, keywords: ['cuts dividend', 'dividend cut', 'suspends dividend', 'reduces payout', 'خفض التوزيعات', 'إيقاف التوزيعات'], sectors: [] },
  { id: 'earnings', label: { ar: 'أرباح وتوقعات', en: 'Earnings & outlooks', fr: 'Résultats et perspectives' }, keywords: ['earnings', 'profit', 'revenue', 'guidance', 'outlook', 'cash flow'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & reports', fr: 'Analyses et rapports' }, keywords: ['analysis', 'analyst', 'rating', 'report', 'target', 'upgrade', 'downgrade'], sectors: [] },
];

const SECTOR_GUIDES = [
  {
    id: 'energy' as DividendFilterId,
    icon: Zap,
    symbols: ['XOM', 'CVX'],
    title: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' },
    body: {
      ar: 'شركات النفط والغاز قد تدفع توزيعات قوية، لكنها تتأثر بأسعار السلع ودورات الطاقة.',
      en: 'Oil and gas companies may pay meaningful dividends, but are sensitive to commodity cycles.',
      fr: 'Les sociétés pétrolières et gazières peuvent verser des dividendes élevés, mais restent cycliques.',
    },
  },
  {
    id: 'utilities' as DividendFilterId,
    icon: ShieldCheck,
    symbols: ['NEE', 'DUK', 'SO'],
    title: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: {
      ar: 'تدفقات نقدية منظمة نسبياً من الكهرباء والمياه والخدمات الأساسية، مع حساسية لأسعار الفائدة.',
      en: 'Regulated cash flows from essential services, with sensitivity to interest rates.',
      fr: 'Flux réglementés liés aux services essentiels, sensibles aux taux.',
    },
  },
  {
    id: 'telecom' as DividendFilterId,
    icon: Signal,
    symbols: ['VZ', 'T'],
    title: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' },
    body: {
      ar: 'شبكات اتصالات كبيرة قد تولد تدفقات نقدية متكررة، لكنها تحتاج إنفاقاً رأسمالياً مرتفعاً.',
      en: 'Large networks can generate recurring cash flow, but capital spending can be high.',
      fr: 'Réseaux générant des flux récurrents, avec dépenses d’investissement élevées.',
    },
  },
  {
    id: 'consumer_staples' as DividendFilterId,
    icon: ShoppingCart,
    symbols: ['PG', 'KO', 'PEP', 'KMB'],
    title: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Consommation de base' },
    body: {
      ar: 'منتجات يومية وطلب أكثر استقراراً، ما يجعلها محوراً شائعاً لدى مستثمري الدخل.',
      en: 'Everyday products with steadier demand, often followed by income investors.',
      fr: 'Produits du quotidien à demande plus stable, suivis par les investisseurs de revenu.',
    },
  },
  {
    id: 'reits' as DividendFilterId,
    icon: Building2,
    symbols: ['O'],
    title: { ar: 'العقارات REITs', en: 'REITs', fr: 'REITs' },
    body: {
      ar: 'صناديق عقارية توزع جزءاً كبيراً من دخلها، وتتأثر بتكاليف التمويل ونسب الإشغال.',
      en: 'Real estate trusts distribute income and are affected by financing costs and occupancy.',
      fr: 'Fonds immobiliers distribuant des revenus, sensibles au financement et à l’occupation.',
    },
  },
  {
    id: 'healthcare' as DividendFilterId,
    icon: HeartPulse,
    symbols: ['JNJ', 'PFE', 'ABBV'],
    title: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' },
    body: {
      ar: 'شركات أدوية وخدمات صحية قد تجمع بين تدفقات نقدية وتوزيعات، مع مخاطر تنظيمية وبحثية.',
      en: 'Drug and healthcare companies may combine cash flow and dividends with regulatory risk.',
      fr: 'Santé et pharmacie peuvent combiner flux et dividendes, avec risque réglementaire.',
    },
  },
];

const DIVIDEND_SYMBOL_NAMES: Record<string, string> = {
  KO: 'Coca-Cola',
  PEP: 'PepsiCo',
  PG: 'Procter & Gamble',
  KMB: 'Kimberly-Clark',
  T: 'AT&T',
  VZ: 'Verizon',
  SO: 'Southern Company',
  DUK: 'Duke Energy',
  NEE: 'NextEra Energy',
  XOM: 'Exxon Mobil',
  CVX: 'Chevron',
  JNJ: 'Johnson & Johnson',
  PFE: 'Pfizer',
  ABBV: 'AbbVie',
  O: 'Realty Income',
};

const FEATURED_META: Record<string, { sector: Record<LangCode, string>; body: Record<LangCode, string> }> = {
  JNJ: {
    sector: { ar: 'الرعاية الصحية', en: 'Healthcare', fr: 'Santé' },
    body: { ar: 'شركة رعاية صحية عالمية ضمن قائمة المتابعة لمستثمري التوزيعات.', en: 'Global healthcare company followed by dividend investors.', fr: 'Société mondiale de santé suivie pour ses dividendes.' },
  },
  PG: {
    sector: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Consommation de base' },
    body: { ar: 'منتجات استهلاكية يومية وعلامات تجارية واسعة الانتشار.', en: 'Everyday consumer products and broad household brands.', fr: 'Produits du quotidien et marques grand public.' },
  },
  KO: {
    sector: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Consommation de base' },
    body: { ar: 'مشروبات عالمية وتدفقات نقدية يراقبها مستثمرو الدخل.', en: 'Global beverages with cash flows watched by income investors.', fr: 'Boissons mondiales suivies par les investisseurs de revenu.' },
  },
  PEP: {
    sector: { ar: 'السلع الاستهلاكية الأساسية', en: 'Consumer staples', fr: 'Consommation de base' },
    body: { ar: 'مشروبات ووجبات خفيفة ضمن قطاع الطلب الاستهلاكي الأساسي.', en: 'Beverages and snacks in the consumer staples segment.', fr: 'Boissons et snacks de consommation de base.' },
  },
  XOM: {
    sector: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' },
    body: { ar: 'شركة طاقة كبرى تتأثر بتغير أسعار النفط والغاز.', en: 'Major energy company exposed to oil and gas price cycles.', fr: 'Grande société énergétique exposée aux cycles pétroliers.' },
  },
  CVX: {
    sector: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' },
    body: { ar: 'شركة طاقة متكاملة ضمن قوائم متابعة الدخل.', en: 'Integrated energy company watched by income investors.', fr: 'Société énergétique intégrée suivie pour le revenu.' },
  },
  SO: {
    sector: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: { ar: 'شركة مرافق كهربائية ضمن قطاع دفاعي ذي تدفقات منظمة.', en: 'Electric utility in a regulated, defensive sector.', fr: 'Service public électrique dans un secteur réglementé.' },
  },
  DUK: {
    sector: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: { ar: 'مرافق كهرباء وغاز تتأثر بأسعار الفائدة والاستثمارات الرأسمالية.', en: 'Electric and gas utility affected by rates and capital spending.', fr: 'Service public affecté par les taux et l’investissement.' },
  },
  NEE: {
    sector: { ar: 'المرافق العامة', en: 'Utilities', fr: 'Services publics' },
    body: { ar: 'مرافق وطاقة متجددة ضمن قوائم الدخل والنمو المحافظ.', en: 'Utility and renewable power business followed for income and growth.', fr: 'Services publics et renouvelables suivis pour revenu et croissance.' },
  },
  VZ: {
    sector: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' },
    body: { ar: 'شبكات اتصالات لاسلكية وتدفقات اشتراكات متكررة.', en: 'Wireless network operator with recurring subscription cash flows.', fr: 'Opérateur sans fil avec flux d’abonnements récurrents.' },
  },
  T: {
    sector: { ar: 'الاتصالات', en: 'Telecom', fr: 'Télécoms' },
    body: { ar: 'شركة اتصالات كبيرة ذات إنفاق رأسمالي ومراقبة عالية للتوزيعات.', en: 'Large telecom company with capital spending and dividend focus.', fr: 'Grand télécom avec dépenses d’investissement et dividendes.' },
  },
  O: {
    sector: { ar: 'العقارات REITs', en: 'REITs', fr: 'REITs' },
    body: { ar: 'صندوق عقاري يتابعه مستثمرو الدخل ضمن قطاع REITs.', en: 'Real estate trust followed by income investors.', fr: 'REIT suivi par les investisseurs de revenu.' },
  },
};

function localeFor(lang: LangCode) {
  if (lang === 'ar') return 'ar-KW';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
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

function formatPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function normalizeRatioToPercent(value: number) {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function formatDividendPercent(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizeRatioToPercent(value))}%`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDateOnly(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
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

function textForSearch(item: DividendNewsItem) {
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

function itemMatchesSearch(item: DividendNewsItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return textForSearch(item).includes(normalized);
}

function itemMatchesFilter(item: DividendNewsItem, filterId: DividendFilterId) {
  if (filterId === 'all') return true;
  const filter = FILTERS.find(entry => entry.id === filterId);
  if (!filter) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (filter.sectors.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return filter.keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function displayTitle(item: DividendNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: DividendNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function categoryLabelForItem(item: DividendNewsItem, lang: LangCode) {
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  const filter = FILTERS.find(entry => entry.id !== 'all' && entry.sectors.some(sector => sectors.includes(sector)))
    ?? FILTERS.find(entry => entry.id !== 'all' && entry.keywords.some(keyword => textForSearch(item).includes(keyword.toLowerCase())));
  return filter?.label[lang] ?? FILTERS[0].label[lang];
}

function dividendEventsFromItems(items: DividendTickerItem[]) {
  return items.flatMap(item => {
    const rows: DividendEvent[] = [];
    if (item.exDividendDate) {
      rows.push({
        id: `${item.symbol}-ex-${item.exDividendDate}`,
        symbol: item.symbol,
        name: item.name,
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
        type: 'payment',
        date: item.paymentDate,
        annualDividend: item.annualDividend,
        currency: item.currency,
      });
    }
    return rows;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8);
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <span className={`${styles.skeletonLine} ${wide ? styles.skeletonWide : ''}`} />;
}

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  subtitle?: string;
}) {
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

function DividendTicker({
  items,
  loading,
  error,
  lang,
  text,
  locale,
}: {
  items: DividendTickerItem[];
  loading: boolean;
  error: string;
  lang: LangCode;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  return (
    <section className={`${styles.tickerPanel} ${styles.compactTickerPanel}`} aria-label={text.tickerTitle}>
      <PanelTitle icon={Coins} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
      {loading ? (
        <div className={styles.tickerSkeletonRow} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
        </div>
      ) : items.length > 0 ? (
        <div className={styles.tickerStrip}>
          <span className={styles.tickerStatus}>{text.liveStatus}</span>
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
                          <span>{FEATURED_META[item.symbol]?.sector[lang] ?? text.unavailable}</span>
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
          <span>{error || text.tickerEmpty}</span>
        </div>
      )}
    </section>
  );
}

function WhatDividendCard({ text }: { text: typeof TEXT[LangCode] }) {
  const points = [text.cashIncome, text.relativeStability, text.longTerm, text.incomeGrowth];
  return (
    <article className={`${styles.summaryCard} ${styles.infoCard}`}>
      <PanelTitle icon={PiggyBank} title={text.whatTitle} />
      <p>{text.whatBody}</p>
      <ul>
        {points.map(point => (
          <li key={point}><span />{point}</li>
        ))}
      </ul>
    </article>
  );
}

function DividendSectorsCard({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={BookOpen} title={text.sectorTitle} />
      <div className={styles.sectorMiniList}>
        {SECTOR_GUIDES.slice(0, 6).map(sector => {
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

function DividendMetricsCard({ text }: { text: typeof TEXT[LangCode] }) {
  const rows = [
    { label: text.yieldShort, body: text.dividendYieldBody, icon: Coins },
    { label: text.payoutShort, body: text.payoutRatioBody, icon: BarChart3 },
    { label: text.exDividendDate, body: text.exDividendBody, icon: CalendarDays },
    { label: text.paymentDate, body: text.paymentDateBody, icon: CalendarDays },
    { label: text.annualDividend, body: text.cashFlowBody, icon: PiggyBank },
  ];
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={BarChart3} title={text.metricTitle} />
      <div className={styles.sectorMiniList}>
        {rows.map(row => {
          const Icon = row.icon;
          return (
          <div className={styles.sectorMiniRow} key={row.label}>
            <span><Icon size={17} /></span>
            <div>
              <strong>{row.label}</strong>
              <p>{row.body}</p>
            </div>
          </div>
          );
        })}
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
  tickerItems: DividendTickerItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
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
      <PanelTitle icon={TrendingUp} title={text.movementTitle} subtitle={text.movementSubtitle} />
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
                </div>
                <div className={styles.topStockValue}>
                  <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                  <span dir="ltr">{text.yieldShort}: {formatDividendPercent(quote?.dividendYield, locale)}</span>
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

function DividendComparison({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  const dividend = {
    ar: ['دخل دوري', 'استقرار أعلى نسبياً', 'مناسبة للباحث عن دخل', 'حساسة لأسعار الفائدة أحياناً'],
    en: ['Recurring income', 'Relatively higher stability', 'Suited to income seekers', 'Can be rate-sensitive'],
    fr: ['Revenu récurrent', 'Stabilité relativement supérieure', 'Adaptées au revenu', 'Sensibles aux taux'],
  };
  const growth = {
    ar: ['نمو أسرع', 'تقلب أعلى', 'تركيز أقل على التوزيعات', 'مناسبة للباحث عن التوسع الرأسمالي'],
    en: ['Faster growth', 'Higher volatility', 'Lower dividend focus', 'Suited to capital expansion'],
    fr: ['Croissance plus rapide', 'Volatilité plus élevée', 'Moins axées dividendes', 'Adaptées à la croissance du capital'],
  };
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.comparisonTitle}>
      <PanelTitle icon={Layers3} title={text.comparisonTitle} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.dividendStocks}</strong>
          {dividend[lang].map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.growthStocks}</strong>
          {growth[lang].map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </section>
  );
}

function NewsCard({
  item,
  lang,
  locale,
  text,
}: {
  item: DividendNewsItem;
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
  items: DividendNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: DividendFilterId;
  setActiveFilter: (filter: DividendFilterId) => void;
  query: string;
  setQuery: (query: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: (count: number) => number) => void;
  counts: Record<DividendFilterId, number>;
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
  items: DividendTickerItem[];
  loading: boolean;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
  const bySymbol = new Map(items.map(item => [item.symbol, item]));

  return (
    <section className={styles.sectorGuidePanel} aria-label={text.featuredTitle}>
      <PanelTitle icon={Sparkles} title={text.featuredTitle} subtitle={text.featuredSubtitle} />
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
          const fallbackName = DIVIDEND_SYMBOL_NAMES[symbol] ?? symbol;
          const displayName = quote?.name ?? fallbackName;
          const marketHref = `/market-analysis?symbol=${encodeURIComponent(symbol)}`;
          return (
            <article className={styles.sectorCard} key={symbol}>
              <span className={styles.sectorIcon}><PiggyBank size={21} /></span>
              <h3>
                <a className={styles.cardTitleLink} href={marketHref} title={`${displayName} · ${symbol}`}>
                  {displayName}
                </a>
              </h3>
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
                <span>{FEATURED_META[symbol]?.sector[lang] ?? text.unavailable}</span>
              </div>
              <p>{FEATURED_META[symbol]?.body[lang] ?? text.unavailable}</p>
              {quote ? (
                <>
                  <div className={styles.newsMetaGrid}>
                    <span dir="ltr">{formatMoney(quote.price, quote.currency, locale)}</span>
                    <span className={styles[tone]} dir="ltr">{formatPercent(quote.changePercent, locale)}</span>
                    <span>{text.yieldShort}: <b dir="ltr">{formatDividendPercent(quote.dividendYield, locale)}</b></span>
                    <span>{text.payoutShort}: <b dir="ltr">{formatDividendPercent(quote.payoutRatio, locale)}</b></span>
                    <span>{text.annualDividend}: <b dir="ltr">{formatMoney(quote.annualDividend, quote.currency, locale)}</b></span>
                    <span>{text.exDividendDate}: <b>{quote.exDividendDate ? formatDateOnly(quote.exDividendDate, locale) : text.unavailable}</b></span>
                  </div>
                  <p>{text.priceSource}: {quote.source}</p>
                  <p>{text.dividendSource}: {quote.dividendMetricSource ?? text.unavailable}</p>
                </>
              ) : (
                <p>{text.unavailable}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DividendEventsWidget({
  events,
  loading,
  text,
  locale,
}: {
  events: DividendEvent[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.eventsTitle}>
      <PanelTitle icon={CalendarDays} title={text.eventsTitle} subtitle={text.eventsSubtitle} />
      {loading ? (
        <div className={styles.moversMiniGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index}>
              <SkeletonLine />
              <SkeletonLine wide />
            </article>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className={styles.moversMiniGrid}>
          {events.map(event => (
            <article key={event.id}>
              <span>{event.type === 'ex' ? text.exDividendDate : text.paymentDate}</span>
              <strong dir="ltr">{event.symbol}</strong>
              <p>{event.name}</p>
              <b>{formatDateOnly(event.date, locale)}</b>
              <p>{text.annualDividend}: {formatMoney(event.annualDividend, event.currency, locale)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.stateBox}>
          <CalendarDays size={24} />
          <strong>{text.noEvents}</strong>
          <p>{text.eventsSubtitle}</p>
        </div>
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
                  const name = DIVIDEND_SYMBOL_NAMES[symbol] ?? symbol;
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

export function DividendStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<DividendTickerItem[]>([]);
  const [newsItems, setNewsItems] = useState<DividendNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DividendFilterId>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');

    const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<DividendTickerResponse>('/api/dividend-stocks/ticker'),
      fetchJson<DividendNewsResponse>(`/api/dividend-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/dividend-stocks/movers?limit=5'),
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
    }, {} as Record<DividendFilterId, number>);
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

  const dividendEvents = useMemo(() => dividendEventsFromItems(tickerItems), [tickerItems]);

  return (
    <div className={styles.page} dir={dir}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <span className={styles.eyebrow}><Coins size={15} />{text.delayed}</span>
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

          <DividendTicker items={tickerItems} loading={loading} error={marketError} lang={activeLang} text={text} locale={locale} />

          <section className={styles.summaryGrid} aria-label={text.sectorTitle}>
            <WhatDividendCard text={text} />
            <DividendSectorsCard lang={activeLang} text={text} />
            <DividendMetricsCard text={text} />
            <MovementCard movers={topMoverRows} tickerItems={tickerItems} loading={loading} text={text} locale={locale} />
          </section>

          <DividendComparison lang={activeLang} text={text} />

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

          <DividendEventsWidget events={dividendEvents} loading={loading} text={text} locale={locale} />

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

export default DividendStocksNewsPage;
