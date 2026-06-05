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
  Car,
  Clock3,
  ExternalLink,
  Factory,
  Gem,
  Hammer,
  Hotel,
  Info,
  Layers3,
  Newspaper,
  Plane,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from '@/components/defensive-stocks/DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type CyclicalFilterId =
  | 'all'
  | 'autos'
  | 'travel_airlines'
  | 'hotels_entertainment'
  | 'industrials'
  | 'construction_real_estate'
  | 'luxury_goods'
  | 'restaurants'
  | 'earnings'
  | 'analysis';

type CyclicalTickerItem = {
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

type CyclicalNewsResponse =
  | {
    success: true;
    category: 'cyclical';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: CyclicalNewsItem[];
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
const FEATURED_SYMBOLS = ['TSLA', 'GM', 'F', 'RACE', 'NKE', 'SBUX', 'HD', 'LOW', 'MCD', 'MAR', 'HLT', 'DAL', 'UAL', 'AAL', 'BA', 'CAT', 'DE'] as const;

const TEXT = {
  ar: {
    title: 'أخبار الأسهم الدورية',
    subtitle: 'تغطية شاملة لأخبار وتحليلات الأسهم الدورية في قطاعات مثل السيارات، السفر والطيران، الفنادق والترفيه، الصناعة، البناء والعقار، والسلع الكمالية.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'آخر سعر متاح من مزود بيانات حقيقي',
    liveStatus: 'آخر سعر متاح',
    tickerTitle: 'شريط الأسهم الدورية المباشر',
    tickerSubtitle: 'أسعار حقيقية لأسهم دورية مختارة مع التغير اليومي والقطاع المرتبط بالدورة الاقتصادية.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حالياً من مصادر السوق الحقيقية.',
    sector: 'القطاع',
    whatTitle: 'ما هي الأسهم الدورية؟',
    whatBody: 'الأسهم الدورية هي أسهم شركات يرتبط أداؤها بقوة بالدورة الاقتصادية، فتتحسن غالباً مع التوسع الاقتصادي وقد تضعف عند التباطؤ أو الركود.',
    growthSensitive: 'حساسة للنمو الاقتصادي',
    spendingBoost: 'ترتفع مع زيادة الإنفاق',
    rateSensitive: 'تتأثر بالركود والفائدة',
    expansionInvestor: 'مناسبة للمستثمر الباحث عن النمو وقت التوسع',
    sectorTitle: 'أبرز قطاعات الأسهم الدورية',
    comparisonTitle: 'الأسهم الدورية مقارنة بالأسهم الدفاعية',
    cyclicalStocks: 'الأسهم الدورية',
    defensiveStocks: 'الأسهم الدفاعية',
    movementTitle: 'حركة الأسهم الدورية',
    movementSubtitle: 'أبرز التحركات اليومية المتاحة من بيانات السوق الحقيقية.',
    driversTitle: 'العوامل التي تحرك الأسهم الدورية',
    driversSubtitle: 'مؤشرات الاقتصاد والإنفاق التي تساعد على فهم تقلبات القطاعات الدورية.',
    newsTitle: 'أخبار الأسهم الدورية',
    newsSubtitle: 'تابع أحدث أخبار الشركات والقطاعات المرتبطة بالدورة الاقتصادية والإنفاق الاستهلاكي.',
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
    errorBody: 'تعذر جلب أخبار الأسهم الدورية من المصادر الحقيقية حالياً.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز الأسهم الدورية',
    featuredSubtitle: 'بطاقات مختصرة مبنية على الأسعار الحقيقية المتاحة حالياً دون مؤشرات مصطنعة.',
    details: 'عرض التفاصيل',
    unavailable: 'غير متاح',
    priceSource: 'مصدر السعر',
    sectorGuideTitle: 'دليل قطاعات الأسهم الدورية',
    viewMore: 'عرض المزيد',
    examples: 'أمثلة',
    cycleTitle: 'متى تكون الأسهم الدورية قوية؟',
    riskTitle: 'متى ترتفع المخاطر؟',
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست توصية شراء أو بيع. الأسهم الدورية قد تكون أكثر حساسية لتغيرات النمو الاقتصادي، أسعار الفائدة، التضخم، وثقة المستهلك. يرجى إجراء بحثك الخاص أو استشارة مستشار مالي قبل اتخاذ أي قرار استثماري.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    noMore: 'تم عرض كل الأخبار المتاحة',
  },
  en: {
    title: 'Cyclical Stocks News',
    subtitle: 'Comprehensive coverage of cyclical stock news and analysis across autos, travel, airlines, hotels, entertainment, industrials, construction, real estate, and luxury goods.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Last available price from a real data provider',
    liveStatus: 'Last available price',
    tickerTitle: 'Live cyclical stock ticker',
    tickerSubtitle: 'Real prices for selected cyclical stocks with daily change and economic-cycle sector context.',
    tickerEmpty: 'No real market prices are available right now.',
    sector: 'Sector',
    whatTitle: 'What are cyclical stocks?',
    whatBody: 'Cyclical stocks are companies whose performance is strongly linked to the economic cycle. They often perform better during expansion and may weaken during slowdowns or recessions.',
    growthSensitive: 'Sensitive to economic growth',
    spendingBoost: 'Rise with higher spending',
    rateSensitive: 'Affected by recessions and rates',
    expansionInvestor: 'Suited to investors seeking growth during expansion',
    sectorTitle: 'Key cyclical sectors',
    comparisonTitle: 'Cyclical stocks versus defensive stocks',
    cyclicalStocks: 'Cyclical stocks',
    defensiveStocks: 'Defensive stocks',
    movementTitle: 'Cyclical stock movers',
    movementSubtitle: 'Daily movers from real market data.',
    driversTitle: 'What moves cyclical stocks',
    driversSubtitle: 'Economic and spending indicators that help explain cyclical sector volatility.',
    newsTitle: 'Cyclical stocks news',
    newsSubtitle: 'Follow the latest news around companies and sectors tied to the economic cycle and consumer spending.',
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
    errorBody: 'Real cyclical stock news could not be loaded right now.',
    retry: 'Retry',
    featuredTitle: 'Featured cyclical stocks',
    featuredSubtitle: 'Compact cards built from currently available real prices without invented metrics.',
    details: 'View details',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    sectorGuideTitle: 'Cyclical sector guide',
    viewMore: 'View more',
    examples: 'Examples',
    cycleTitle: 'When are cyclicals strong?',
    riskTitle: 'When do risks rise?',
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for educational and general information only, not a buy or sell recommendation. Cyclical stocks can be more sensitive to economic growth, interest rates, inflation, and consumer confidence. Do your own research or consult a financial advisor before investing.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    noMore: 'All available news is visible',
  },
  fr: {
    title: 'Actualités des actions cycliques',
    subtitle: 'Couverture des actions cycliques dans l’automobile, le voyage, l’aérien, l’hôtellerie, le divertissement, l’industrie, la construction, l’immobilier et le luxe.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Dernier prix disponible depuis un fournisseur réel',
    liveStatus: 'Dernier prix disponible',
    tickerTitle: 'Bandeau actions cycliques',
    tickerSubtitle: 'Prix réels des actions cycliques sélectionnées avec variation quotidienne.',
    tickerEmpty: 'Aucun prix réel disponible pour le moment.',
    sector: 'Secteur',
    whatTitle: 'Que sont les actions cycliques ?',
    whatBody: 'Ce sont des sociétés dont les résultats sont fortement liés au cycle économique, souvent meilleures en expansion et plus faibles en ralentissement.',
    growthSensitive: 'Sensibles à la croissance',
    spendingBoost: 'Portées par la dépense',
    rateSensitive: 'Sensibles aux récessions et aux taux',
    expansionInvestor: 'Adaptées à la recherche de croissance en expansion',
    sectorTitle: 'Secteurs cycliques clés',
    comparisonTitle: 'Cycliques et défensives',
    cyclicalStocks: 'Actions cycliques',
    defensiveStocks: 'Actions défensives',
    movementTitle: 'Mouvements des cycliques',
    movementSubtitle: 'Mouvements quotidiens issus de données réelles.',
    driversTitle: 'Facteurs des actions cycliques',
    driversSubtitle: 'Indicateurs économiques et de dépenses qui expliquent la volatilité.',
    newsTitle: 'Actualités des actions cycliques',
    newsSubtitle: 'Suivez les entreprises et secteurs liés au cycle économique et à la consommation.',
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
    featuredTitle: 'Actions cycliques en vedette',
    featuredSubtitle: 'Cartes basées sur les prix réels disponibles, sans métriques inventées.',
    details: 'Voir détails',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    sectorGuideTitle: 'Guide des secteurs cycliques',
    viewMore: 'Voir plus',
    examples: 'Exemples',
    cycleTitle: 'Quand les cycliques sont fortes ?',
    riskTitle: 'Quand les risques montent ?',
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement, pas une recommandation. Les actions cycliques peuvent être sensibles à la croissance, aux taux, à l’inflation et à la confiance des consommateurs.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    noMore: 'Toutes les actualités disponibles sont visibles',
  },
} satisfies Record<LangCode, Record<string, string>>;

const FILTERS: Array<{ id: CyclicalFilterId; label: Record<LangCode, string>; keywords: string[]; sectors: string[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'autos', label: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' }, keywords: ['auto', 'automaker', 'vehicle', 'tesla', 'ford', 'gm', 'ferrari'], sectors: ['autos'] },
  { id: 'travel_airlines', label: { ar: 'السفر والطيران', en: 'Travel & airlines', fr: 'Voyage et aérien' }, keywords: ['airline', 'travel', 'cruise', 'delta', 'united airlines', 'american airlines', 'royal caribbean', 'carnival', 'norwegian cruise'], sectors: ['airlines_travel', 'transport'] },
  { id: 'hotels_entertainment', label: { ar: 'الفنادق والترفيه', en: 'Hotels & entertainment', fr: 'Hôtels et loisirs' }, keywords: ['hotel', 'resort', 'casino', 'entertainment', 'marriott', 'hilton', 'wynn', 'las vegas sands'], sectors: ['hotels_entertainment'] },
  { id: 'industrials', label: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' }, keywords: ['industrial', 'machinery', 'aerospace', 'boeing', 'caterpillar', 'deere'], sectors: ['industrials'] },
  { id: 'construction_real_estate', label: { ar: 'البناء والعقار', en: 'Construction & real estate', fr: 'Construction et immobilier' }, keywords: ['housing', 'homebuilder', 'construction', 'real estate', 'home depot', 'lennar', 'd.r. horton'], sectors: ['construction_real_estate'] },
  { id: 'luxury_goods', label: { ar: 'السلع الكمالية', en: 'Luxury goods', fr: 'Luxe' }, keywords: ['luxury', 'premium goods', 'nike', 'ferrari', 'consumer discretionary'], sectors: ['luxury_goods'] },
  { id: 'restaurants', label: { ar: 'المطاعم', en: 'Restaurants', fr: 'Restaurants' }, keywords: ['restaurant', 'coffee', 'mcdonald', 'starbucks', 'dining'], sectors: ['nonessential_retail', 'restaurants'] },
  { id: 'earnings', label: { ar: 'أرباح وتوقعات', en: 'Earnings & outlooks', fr: 'Résultats et perspectives' }, keywords: ['earnings', 'revenue', 'guidance', 'forecast', 'outlook', 'profit'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & reports', fr: 'Analyses et rapports' }, keywords: ['analysis', 'analyst', 'rating', 'report', 'target', 'upgrade', 'downgrade'], sectors: [] },
];

const SECTOR_GUIDES = [
  {
    id: 'autos' as CyclicalFilterId,
    icon: Car,
    symbols: ['TSLA', 'GM', 'F', 'RACE'],
    title: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' },
    body: {
      ar: 'مبيعات السيارات والهوامش تتأثر بثقة المستهلك، الائتمان، الفائدة، وتكاليف المواد.',
      en: 'Vehicle sales and margins react to consumer confidence, credit, rates, and material costs.',
      fr: 'Les ventes et marges réagissent à la confiance, au crédit, aux taux et aux coûts.',
    },
  },
  {
    id: 'travel_airlines' as CyclicalFilterId,
    icon: Plane,
    symbols: ['DAL', 'UAL', 'AAL', 'RCL'],
    title: { ar: 'السفر والطيران', en: 'Travel and airlines', fr: 'Voyage et aérien' },
    body: {
      ar: 'يتحرك الطلب على السفر مع الدخل المتاح، أسعار الوقود، وحالة الاقتصاد والسياحة.',
      en: 'Travel demand moves with disposable income, fuel costs, tourism, and economic activity.',
      fr: 'La demande dépend du revenu disponible, du carburant, du tourisme et de l’activité.',
    },
  },
  {
    id: 'hotels_entertainment' as CyclicalFilterId,
    icon: Hotel,
    symbols: ['MAR', 'HLT', 'WYNN', 'LVS'],
    title: { ar: 'الفنادق والترفيه', en: 'Hotels and entertainment', fr: 'Hôtels et loisirs' },
    body: {
      ar: 'الإشغال والإنفاق الترفيهي يتحسنان غالباً مع قوة المستهلك والسفر.',
      en: 'Occupancy and leisure spending often improve with stronger consumers and travel.',
      fr: 'L’occupation et les loisirs progressent avec la solidité du consommateur.',
    },
  },
  {
    id: 'industrials' as CyclicalFilterId,
    icon: Factory,
    symbols: ['BA', 'CAT', 'DE'],
    title: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' },
    body: {
      ar: 'الشركات الصناعية ترتبط بالإنفاق الرأسمالي، الطلب العالمي، وسلاسل التوريد.',
      en: 'Industrials are tied to capital spending, global demand, and supply chains.',
      fr: 'L’industrie dépend de l’investissement, de la demande mondiale et des chaînes logistiques.',
    },
  },
  {
    id: 'construction_real_estate' as CyclicalFilterId,
    icon: Hammer,
    symbols: ['HD', 'LOW', 'DHI', 'LEN'],
    title: { ar: 'البناء والعقار', en: 'Construction and real estate', fr: 'Construction et immobilier' },
    body: {
      ar: 'البناء والمساكن أكثر حساسية للفائدة، الرهن العقاري، وثقة المشترين.',
      en: 'Construction and housing are sensitive to rates, mortgages, and buyer confidence.',
      fr: 'Le logement est sensible aux taux, au crédit immobilier et à la confiance.',
    },
  },
  {
    id: 'luxury_goods' as CyclicalFilterId,
    icon: Gem,
    symbols: ['NKE', 'RACE'],
    title: { ar: 'السلع الكمالية', en: 'Luxury goods', fr: 'Luxe' },
    body: {
      ar: 'الطلب على السلع الكمالية يتأثر بالثروة، الدخل المتاح، ومعنويات المستهلك.',
      en: 'Luxury demand is influenced by wealth, disposable income, and consumer sentiment.',
      fr: 'La demande de luxe dépend de la richesse, du revenu disponible et du moral.',
    },
  },
  {
    id: 'restaurants' as CyclicalFilterId,
    icon: Utensils,
    symbols: ['MCD', 'SBUX'],
    title: { ar: 'المطاعم والإنفاق الاستهلاكي', en: 'Restaurants and consumer spending', fr: 'Restaurants et consommation' },
    body: {
      ar: 'الإنفاق خارج المنزل وحركة المتاجر يعكسان قدرة المستهلك واستعداده للإنفاق.',
      en: 'Dining traffic and store spending reflect consumer capacity and willingness to spend.',
      fr: 'La fréquentation reflète la capacité et la volonté de dépenser.',
    },
  },
];

const FEATURED_META: Record<string, { sector: Record<LangCode, string>; body: Record<LangCode, string> }> = {
  TSLA: { sector: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' }, body: { ar: 'شركة سيارات كهربائية وتقنيات نقل تتأثر بدورات الطلب والتمويل.', en: 'Electric vehicle and mobility company exposed to demand and financing cycles.', fr: 'Véhicules électriques exposés aux cycles de demande et financement.' } },
  GM: { sector: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' }, body: { ar: 'شركة سيارات تقليدية تتأثر بالمبيعات، الائتمان، وتكاليف الإنتاج.', en: 'Automaker affected by sales, credit, and production costs.', fr: 'Constructeur sensible aux ventes, au crédit et aux coûts.' } },
  F: { sector: { ar: 'السيارات', en: 'Autos', fr: 'Automobile' }, body: { ar: 'شركة سيارات كبيرة مرتبطة بدورة الإنفاق على المركبات.', en: 'Large automaker linked to vehicle spending cycles.', fr: 'Constructeur lié au cycle des dépenses automobiles.' } },
  RACE: { sector: { ar: 'السلع الكمالية', en: 'Luxury goods', fr: 'Luxe' }, body: { ar: 'سيارات فاخرة ذات طلب مرتبط بالثروة والإنفاق الكمالي.', en: 'Luxury automaker linked to wealth and premium spending.', fr: 'Automobile de luxe liée à la richesse et au premium.' } },
  NKE: { sector: { ar: 'السلع الكمالية', en: 'Luxury goods', fr: 'Luxe' }, body: { ar: 'ملابس وأحذية رياضية تتأثر بإنفاق المستهلك العالمي.', en: 'Athletic apparel and footwear tied to global consumer spending.', fr: 'Articles de sport liés à la consommation mondiale.' } },
  SBUX: { sector: { ar: 'المطاعم', en: 'Restaurants', fr: 'Restaurants' }, body: { ar: 'قهوة ومطاعم تعتمد على حركة المتاجر والإنفاق خارج المنزل.', en: 'Coffee and dining traffic tied to discretionary spending.', fr: 'Café et restauration liés aux dépenses discrétionnaires.' } },
  HD: { sector: { ar: 'البناء والعقار', en: 'Construction & real estate', fr: 'Construction' }, body: { ar: 'تحسين المنازل مرتبط بسوق الإسكان وثقة المستهلك.', en: 'Home improvement tied to housing and consumer confidence.', fr: 'Rénovation liée au logement et à la confiance.' } },
  LOW: { sector: { ar: 'البناء والعقار', en: 'Construction & real estate', fr: 'Construction' }, body: { ar: 'تجزئة تحسين المنازل تتأثر بالفائدة ونشاط الإسكان.', en: 'Home improvement retail affected by rates and housing activity.', fr: 'Rénovation affectée par les taux et le logement.' } },
  MCD: { sector: { ar: 'المطاعم', en: 'Restaurants', fr: 'Restaurants' }, body: { ar: 'مطاعم عالمية تراقبها الأسواق كمؤشر على إنفاق المستهلك.', en: 'Global restaurant chain watched as a consumer-spending signal.', fr: 'Restauration mondiale, signal de consommation.' } },
  MAR: { sector: { ar: 'الفنادق والترفيه', en: 'Hotels & entertainment', fr: 'Hôtels' }, body: { ar: 'فنادق وضيافة مرتبطة بالسفر والطلب السياحي.', en: 'Hospitality company tied to travel and tourism demand.', fr: 'Hôtellerie liée au voyage et au tourisme.' } },
  HLT: { sector: { ar: 'الفنادق والترفيه', en: 'Hotels & entertainment', fr: 'Hôtels' }, body: { ar: 'فنادق عالمية تتأثر بالإشغال والإنفاق على السفر.', en: 'Global hotels affected by occupancy and travel spending.', fr: 'Hôtels mondiaux sensibles à l’occupation.' } },
  DAL: { sector: { ar: 'السفر والطيران', en: 'Travel & airlines', fr: 'Aérien' }, body: { ar: 'شركة طيران تتأثر بالطلب على السفر وأسعار الوقود.', en: 'Airline affected by travel demand and fuel prices.', fr: 'Compagnie sensible à la demande et au carburant.' } },
  UAL: { sector: { ar: 'السفر والطيران', en: 'Travel & airlines', fr: 'Aérien' }, body: { ar: 'طيران تجاري مرتبط بحركة المسافرين والطلب العالمي.', en: 'Commercial airline tied to passenger traffic and global demand.', fr: 'Aérien lié au trafic passagers.' } },
  AAL: { sector: { ar: 'السفر والطيران', en: 'Travel & airlines', fr: 'Aérien' }, body: { ar: 'طيران يتأثر بالتذاكر، الوقود، والقدرة الشرائية.', en: 'Airline exposed to fares, fuel, and consumer spending power.', fr: 'Compagnie exposée aux tarifs, carburant et pouvoir d’achat.' } },
  BA: { sector: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' }, body: { ar: 'طيران وصناعة دفاعية تتأثر بدورات الطلب وسلاسل التوريد.', en: 'Aerospace and defense manufacturer affected by demand and supply cycles.', fr: 'Aérospatial sensible à la demande et aux chaînes.' } },
  CAT: { sector: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' }, body: { ar: 'معدات ثقيلة مرتبطة بالبناء والتعدين والإنفاق الرأسمالي.', en: 'Heavy equipment tied to construction, mining, and capital spending.', fr: 'Équipements liés à la construction et au capex.' } },
  DE: { sector: { ar: 'الصناعة', en: 'Industrials', fr: 'Industrie' }, body: { ar: 'معدات زراعية وصناعية تتأثر بالسلع والإنفاق الرأسمالي.', en: 'Agricultural and industrial equipment tied to commodities and capex.', fr: 'Équipements agricoles liés aux matières premières.' } },
};

const DRIVER_GROUPS = [
  {
    icon: Activity,
    title: { ar: 'مؤشرات الاقتصاد', en: 'Economic indicators', fr: 'Indicateurs économiques' },
    points: {
      ar: ['أسعار الفائدة', 'بيانات التضخم', 'ثقة المستهلك', 'مبيعات التجزئة'],
      en: ['Interest rates', 'Inflation data', 'Consumer confidence', 'Retail sales'],
      fr: ['Taux d’intérêt', 'Inflation', 'Confiance du consommateur', 'Ventes au détail'],
    },
  },
  {
    icon: Wallet,
    title: { ar: 'الإنفاق والطلب', en: 'Spending and demand', fr: 'Dépense et demande' },
    points: {
      ar: ['أسعار الطاقة', 'السفر والطلب السياحي', 'الإنفاق الرأسمالي للشركات', 'نتائج الأرباح والتوجيهات المستقبلية'],
      en: ['Energy prices', 'Travel and tourism demand', 'Corporate capital spending', 'Earnings results and guidance'],
      fr: ['Prix de l’énergie', 'Demande touristique', 'Investissement des entreprises', 'Résultats et perspectives'],
    },
  },
];

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

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

function textForSearch(item: CyclicalNewsItem) {
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

function itemMatchesSearch(item: CyclicalNewsItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return textForSearch(item).includes(normalized);
}

function itemMatchesFilter(item: CyclicalNewsItem, filterId: CyclicalFilterId) {
  if (filterId === 'all') return true;
  const filter = FILTERS.find(entry => entry.id === filterId);
  if (!filter) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (filter.sectors.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return filter.keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function displayTitle(item: CyclicalNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: CyclicalNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function categoryLabelForItem(item: CyclicalNewsItem, lang: LangCode) {
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  const filter = FILTERS.find(entry => entry.id !== 'all' && entry.sectors.some(sector => sectors.includes(sector)))
    ?? FILTERS.find(entry => entry.id !== 'all' && entry.keywords.some(keyword => textForSearch(item).includes(keyword.toLowerCase())));
  return filter?.label[lang] ?? FILTERS[0].label[lang];
}

function sectorLabel(sector: string | undefined, lang: LangCode) {
  if (!sector) return '';
  const match = FILTERS.find(filter => filter.sectors.includes(sector) || filter.id === sector);
  return match?.label[lang] ?? sector;
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

function CyclicalTicker({
  items,
  loading,
  error,
  text,
  lang,
  locale,
}: {
  items: CyclicalTickerItem[];
  loading: boolean;
  error: string;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  return (
    <section className={styles.tickerPanel} aria-label={text.tickerTitle}>
      <PanelTitle icon={Activity} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
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
          <span>{error || text.tickerEmpty}</span>
        </div>
      )}
    </section>
  );
}

function WhatCyclicalCard({ text }: { text: typeof TEXT[LangCode] }) {
  const points = [text.growthSensitive, text.spendingBoost, text.rateSensitive, text.expansionInvestor];
  return (
    <article className={`${styles.summaryCard} ${styles.infoCard}`}>
      <PanelTitle icon={TrendingUp} title={text.whatTitle} />
      <p>{text.whatBody}</p>
      <ul>
        {points.map(point => (
          <li key={point}><span />{point}</li>
        ))}
      </ul>
    </article>
  );
}

function SectorMiniCard({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
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
  const cyclical = {
    ar: ['تستفيد من النمو الاقتصادي', 'أكثر تقلبًا وقت الركود', 'ترتبط بإنفاق المستهلك', 'مناسبة للبحث عن النمو'],
    en: ['Benefit from economic growth', 'More volatile in recessions', 'Linked to consumer spending', 'Suited to growth seeking'],
    fr: ['Profitent de la croissance', 'Plus volatiles en récession', 'Liées à la consommation', 'Adaptées à la croissance'],
  };
  const defensive = {
    ar: ['طلب أكثر استقرارًا', 'أقل تأثرًا بالركود', 'مناسبة للمستثمر المحافظ', 'تشمل قطاعات أساسية مثل الغذاء والدواء والمرافق'],
    en: ['Steadier demand', 'Less affected by recessions', 'Suited to conservative investors', 'Include essentials such as food, medicine, and utilities'],
    fr: ['Demande plus stable', 'Moins affectées par les récessions', 'Adaptées aux prudents', 'Secteurs essentiels comme alimentation, santé et services publics'],
  };
  return (
    <article className={`${styles.summaryCard} ${styles.comparisonCard}`}>
      <PanelTitle icon={Layers3} title={text.comparisonTitle} />
      <div className={styles.comparisonGrid}>
        <div className={styles.cyclicalColumn}>
          <strong>{text.cyclicalStocks}</strong>
          {cyclical[lang].map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.defensiveColumn}>
          <strong>{text.defensiveStocks}</strong>
          {defensive[lang].map(point => <span key={point}>{point}</span>)}
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
  lang,
  locale,
}: {
  movers: StockCategoryMoverItem[];
  tickerItems: CyclicalTickerItem[];
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
          <p className={styles.cardMuted}>{text.unavailable}</p>
        )}
      </div>
    </article>
  );
}

function DriversSection({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.driversTitle}>
      <PanelTitle icon={Zap} title={text.driversTitle} subtitle={text.driversSubtitle} />
      <div className={styles.sectorCards}>
        {DRIVER_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <article className={`${styles.sectorCard} ${styles.infoCard}`} key={group.title[lang]}>
              <span className={styles.sectorIcon}><Icon size={21} /></span>
              <h3>{group.title[lang]}</h3>
              <ul>
                {group.points[lang].map(point => <li key={point}><span />{point}</li>)}
              </ul>
            </article>
          );
        })}
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
  item: CyclicalNewsItem;
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
  items: CyclicalNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: CyclicalFilterId;
  setActiveFilter: (filter: CyclicalFilterId) => void;
  query: string;
  setQuery: (query: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: (count: number) => number) => void;
  counts: Record<CyclicalFilterId, number>;
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
  items: CyclicalTickerItem[];
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
          return (
            <article className={styles.sectorCard} key={symbol}>
              <span className={styles.sectorIcon}><Sparkles size={21} /></span>
              <h3>{quote?.name ?? symbol}</h3>
              <div className={styles.symbolChips}>
                <span dir="ltr">{symbol}</span>
                <span>{FEATURED_META[symbol]?.sector[lang] ?? text.unavailable}</span>
              </div>
              <p>{FEATURED_META[symbol]?.body[lang] ?? text.unavailable}</p>
              {quote ? (
                <>
                  <div className={styles.newsMetaGrid}>
                    <span dir="ltr">{formatMoney(quote.price, quote.currency, locale)}</span>
                    <span className={styles[tone]} dir="ltr">{formatPercent(quote.changePercent, locale)}</span>
                    <span>{text.sector}: <b>{sectorLabel(quote.sector, lang)}</b></span>
                  </div>
                  <p>{text.priceSource}: {quote.source}</p>
                </>
              ) : (
                <p>{text.unavailable}</p>
              )}
              <a href={`/market-analysis?symbol=${encodeURIComponent(symbol)}`}>
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
  onSelect,
}: {
  lang: LangCode;
  text: typeof TEXT[LangCode];
  onSelect: (filter: CyclicalFilterId) => void;
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
                {sector.symbols.map(symbol => <span key={symbol} dir="ltr">{symbol}</span>)}
              </div>
              <button type="button" onClick={() => onSelect(sector.id)}>
                {text.viewMore}
                <ArrowUpRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CycleRiskSection({ lang, text }: { lang: LangCode; text: typeof TEXT[LangCode] }) {
  const strong = {
    ar: ['عند تحسن النمو الاقتصادي', 'عند انخفاض أسعار الفائدة أو توقع خفضها', 'عند ارتفاع ثقة المستهلك', 'عند زيادة السفر والإنفاق', 'عند تحسن أرباح الشركات'],
    en: ['Economic growth improves', 'Rates fall or cuts are expected', 'Consumer confidence rises', 'Travel and spending increase', 'Corporate earnings improve'],
    fr: ['Croissance en amélioration', 'Taux en baisse ou anticipations de baisse', 'Confiance en hausse', 'Voyage et dépenses en hausse', 'Bénéfices en amélioration'],
  };
  const risks = {
    ar: ['ارتفاع أسعار الفائدة', 'تباطؤ النمو الاقتصادي', 'تراجع إنفاق المستهلك', 'ضعف نتائج الأرباح', 'مخاوف الركود'],
    en: ['Higher interest rates', 'Slowing economic growth', 'Lower consumer spending', 'Weak earnings results', 'Recession concerns'],
    fr: ['Hausse des taux', 'Ralentissement économique', 'Dépense en baisse', 'Résultats faibles', 'Craintes de récession'],
  };

  return (
    <section className={styles.sectorGuidePanel} aria-label={text.cycleTitle}>
      <PanelTitle icon={ShieldCheck} title={text.cycleTitle} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.cycleTitle}</strong>
          {strong[lang].map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.riskTitle}</strong>
          {risks[lang].map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </section>
  );
}

export function CyclicalStocksNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<CyclicalTickerItem[]>([]);
  const [newsItems, setNewsItems] = useState<CyclicalNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CyclicalFilterId>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');

    const [tickerResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<CyclicalTickerResponse>('/api/cyclical-stocks/ticker'),
      fetchJson<CyclicalNewsResponse>(`/api/cyclical-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/cyclical-stocks/movers?limit=5'),
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
    }, {} as Record<CyclicalFilterId, number>);
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
              <span className={styles.eyebrow}><Activity size={15} />{text.delayed}</span>
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

          <CyclicalTicker items={tickerItems} loading={loading} error={marketError} text={text} lang={activeLang} locale={locale} />

          <section className={styles.summaryGrid} aria-label={text.sectorTitle}>
            <WhatCyclicalCard text={text} />
            <SectorMiniCard lang={activeLang} text={text} />
            <ComparisonCard lang={activeLang} text={text} />
            <MovementCard movers={topMoverRows} tickerItems={tickerItems} loading={loading} text={text} lang={activeLang} locale={locale} />
          </section>

          <DriversSection lang={activeLang} text={text} />

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
            onSelect={filter => {
              setActiveFilter(filter);
              setVisibleCount(NEWS_PAGE_SIZE);
            }}
          />

          <CycleRiskSection lang={activeLang} text={text} />

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

export default CyclicalStocksNewsPage;
