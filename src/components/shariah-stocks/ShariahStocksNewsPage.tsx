'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Filter,
  Gauge,
  Info,
  Landmark,
  ListChecks,
  Newspaper,
  RefreshCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { ShariahAssetType, ShariahScreeningStatus } from '@/lib/market/shariahUniverse';
import base from '@/components/defensive-stocks/DefensiveStocksNews.module.css';
import styles from './ShariahStocksNewsPage.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type ShariahFilter =
  | 'all'
  | 'compliant'
  | 'review'
  | 'non_compliant'
  | 'unknown'
  | 'technology'
  | 'healthcare'
  | 'consumer'
  | 'sharia_etf';
type NewsFilter =
  | 'all'
  | 'compliant'
  | 'review'
  | 'unknown'
  | 'sharia_etf'
  | 'technology'
  | 'healthcare'
  | 'consumer'
  | 'companies'
  | 'earnings'
  | 'analysis'
  | 'screening_updates';

type ShariahQuote = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  screeningSource: string | null;
  screeningMethodology: string;
  lastScreenedAt: string | null;
};

type ShariahTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    screeningSourceConnected: boolean;
    items: ShariahQuote[];
  }
  | {
    ok: false;
    code: string;
    source: string | null;
    updated_at: string | null;
    screeningSourceConnected: boolean;
    items: ShariahQuote[];
  };

type ScreeningItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  reason: string;
  screeningSource: string | null;
  methodology: string;
  lastScreenedAt: string | null;
  notes: string;
};

type ScreeningResponse = {
  ok: boolean;
  updated_at: string;
  sourceConnected: boolean;
  screeningSource: string | null;
  sourceName: string | null;
  methodology: string;
  emptyMessage: string;
  counts: Record<ShariahScreeningStatus, number>;
  items: ScreeningItem[];
};

type ShariahNewsItem = {
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
  shariahStatus?: ShariahScreeningStatus;
  screeningSource?: string | null;
};

type ShariahNewsResponse =
  | {
    success: true;
    category: 'sharia';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    screeningSourceConnected: boolean;
    items: ShariahNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
    screeningSourceConnected?: boolean;
  };

const NEWS_PAGE_SIZE = 9;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const FEATURED_SYMBOLS = ['SPUS', 'HLAL', 'UMMA', 'SPRE', 'SPSK', 'AAPL', 'MSFT', 'NVDA', 'COST', 'JNJ', 'KO', 'PG'] as const;

const TEXT = {
  ar: {
    title: 'أخبار الأسهم الشرعية',
    subtitle: 'تغطية شاملة لأخبار الأسهم المتوافقة مع ضوابط الاستثمار الشرعي، مع أسعار محدثة، أخبار مباشرة، وحالة تصنيف مبنية على مصادر أو معايير فحص واضحة.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    liveStatus: 'آخر سعر متاح من مزود بيانات حقيقي',
    refreshCadence: 'تحديث تلقائي كل 5 دقائق',
    fatwaNote: 'التصنيف الشرعي لأغراض معلوماتية فقط وليس فتوى',
    tickerTitle: 'شريط الأسهم الشرعية المباشر',
    tickerSubtitle: 'أسعار حقيقية للرموز ذات الصلة بالاستثمار الشرعي مع حالة تصنيف شفافة وغير مفترضة.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حاليًا',
    snapshotTitle: 'ملخص التصنيف الشرعي',
    snapshotSubtitle: 'ملخص شفاف لحالة الفحص بناءً على مصدر متصل أو حالة عدم توفره.',
    sourceMissingTitle: 'لم يتم ربط مصدر تصنيف شرعي موثوق بعد',
    sourceMissingBody: 'لذلك تظهر الرموز بحالة غير مصنف، ولا يتم الادعاء بالتوافق أو عدم التوافق.',
    compliant: 'متوافق',
    review: 'يحتاج مراجعة',
    nonCompliant: 'غير متوافق',
    unknown: 'غير مصنف',
    source: 'المصدر',
    method: 'المنهجية',
    unavailable: 'غير متاح',
    sector: 'القطاع',
    assetType: 'نوع الأصل',
    stock: 'سهم',
    etf: 'صندوق ETF',
    price: 'السعر',
    change: 'التغير',
    screeningDate: 'آخر تحديث للتصنيف',
    whatTitle: 'ما هي الأسهم الشرعية؟',
    whatBody: 'الأسهم الشرعية هي أسهم شركات تمر عبر فحص نشاط الشركة ونسبها المالية وفق معايير تمويل إسلامي معترف بها. هذه الصفحة تعرض قراءة معلوماتية فقط.',
    whatPoints: ['نشاط الشركة الأساسي', 'مصادر الإيرادات', 'نسب الديون والسيولة', 'تجنب الأنشطة المحظورة', 'الحاجة إلى مراجعة دورية'],
    criteriaTitle: 'معايير الفحص الشرعي',
    criteriaRows: [
      ['نشاط الشركة', 'مراجعة طبيعة الأعمال ومصادر الإيرادات الأساسية.'],
      ['نسبة الديون', 'قياس مستويات الديون مقارنة بالأصول أو القيمة السوقية حسب معيار الفحص.'],
      ['النقد والاستثمارات', 'رصد النقد أو الاستثمارات ذات العوائد غير المتوافقة إن توفرت بياناتها.'],
      ['الإيرادات غير المتوافقة', 'تمييز الإيرادات التي قد تحتاج مراجعة أو تطهيرًا.'],
      ['الحسابات المدينة', 'فحص بنود مالية قد تؤثر على النتيجة حسب المنهجية.'],
      ['التحديث الدوري', 'التصنيف يتغير مع القوائم المالية ومصادر البيانات.'],
    ],
    limitsTitle: 'قراءة أولية وليست فتوى',
    generalReading: 'قراءة عامة',
    generalPoints: ['تساعد على الفرز الأولي', 'تعتمد على البيانات المتاحة', 'تتغير مع القوائم المالية', 'تحتاج مراجعة عند تغير النشاط'],
    limits: 'حدود مهمة',
    limitPoints: ['لا توجد فتوى من مصدر موثوق داخل الموقع', 'لا تغني عن سؤال مختص', 'قد تختلف المعايير بين الجهات', 'التصنيف قد يتغير مع الوقت'],
    movementTitle: 'حركة الأسهم ذات الصلة بالفلترة الشرعية',
    movementSubtitle: 'أعلى التحركات اليومية من الأسعار الحقيقية، مع إبقاء التصنيف غير مفترض.',
    screenerTitle: 'فاحص الأسهم الشرعية',
    screenerSubtitle: 'ابحث في الرموز والأسعار وحالة التصنيف بدون إخفاء عدم اليقين.',
    searchPlaceholder: 'ابحث عن رمز أو شركة أو قطاع...',
    filterLabel: 'الفلاتر',
    details: 'عرض التفاصيل',
    newsTitle: 'أخبار الأسهم الشرعية',
    newsSubtitle: 'تابع أحدث أخبار الشركات والصناديق المرتبطة بالاستثمار المتوافق مع الضوابط الشرعية.',
    showing: 'المعروض',
    results: 'نتيجة',
    showMore: 'تحميل المزيد',
    noMore: 'تم عرض كل الأخبار المتاحة',
    readArticle: 'قراءة الخبر',
    originalLanguage: 'باللغة الأصلية',
    translated: 'مترجم',
    noLink: 'الرابط غير متاح',
    emptyTitle: 'لا توجد بيانات متاحة حاليًا',
    emptyHint: 'جرّب تغيير البحث أو الفلتر، أو أعد تحميل البيانات.',
    newsEmpty: 'لا توجد أخبار متاحة حاليًا لهذا التصنيف',
    errorTitle: 'تعذر تحميل البيانات حاليًا',
    errorBody: 'أعد المحاولة بعد قليل. لا يتم عرض بيانات بديلة وهمية.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز الأسهم والصناديق المرتبطة بالاستثمار الشرعي',
    featuredSubtitle: 'أسعار حقيقية مع حالة تصنيف غير مفترضة عند غياب مصدر فحص موثوق.',
    methodologyTitle: 'منهجية التصنيف',
    methodologySource: 'مصدر التصنيف',
    methodologySourceBody: 'لم يتم ربط مصدر تصنيف شرعي موثوق بعد.',
    methodologyHow: 'طريقة الفحص',
    methodologyHowPoints: ['نشاط الشركة', 'القوائم المالية', 'نسب الديون', 'الإيرادات غير المتوافقة', 'النقد والاستثمارات', 'آخر تحديث للبيانات'],
    methodologyLimits: 'حدود الاستخدام',
    methodologyLimitsPoints: ['الصفحة تعليمية ومعلوماتية', 'ليست فتوى', 'لا تغني عن مراجعة هيئة شرعية أو مختص', 'قد تختلف المعايير بين المصادر'],
    riskTitle: 'متى يحتاج السهم إلى مراجعة؟',
    riskPoints: ['عند تغير نشاط الشركة', 'عند صدور قوائم مالية جديدة', 'عند ارتفاع الديون', 'عند ارتفاع الإيرادات غير المتوافقة', 'عند تغير مصدر التصنيف', 'عند عدم توفر بيانات كافية'],
    warningTitle: 'حدود مهمة',
    warningPoints: ['لا يوجد حكم شرعي نهائي دون مصدر موثوق', 'التصنيف قد يختلف بين الجهات', 'البيانات المالية قد تتأخر', 'الصفحة لا تقدم فتوى', 'القرار النهائي مسؤولية المستخدم'],
    disclaimerTitle: 'تنبيه شرعي واستثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست فتوى شرعية أو توصية شراء أو بيع. تصنيف الأسهم قد يعتمد على مصادر وبيانات مالية متاحة وقد يتغير مع الوقت. يجب الرجوع إلى جهة شرعية موثوقة أو مستشار مختص قبل اتخاذ أي قرار استثماري.',
  },
  en: {
    title: 'Shariah Stocks News',
    subtitle: 'Coverage for stocks related to Shariah-aware investing with updated prices, live news, and transparent classification status.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    liveStatus: 'Last available price from a real data provider',
    refreshCadence: 'Auto refresh every 5 minutes',
    fatwaNote: 'Screening is informational only, not a fatwa',
    tickerTitle: 'Live Shariah Stocks Ticker',
    tickerSubtitle: 'Real prices for Shariah-related symbols with transparent non-assumed screening status.',
    tickerEmpty: 'No price data is available right now',
    snapshotTitle: 'Shariah Screening Snapshot',
    snapshotSubtitle: 'Transparent screening state based on connected source availability.',
    sourceMissingTitle: 'No trusted Shariah screening source is connected yet',
    sourceMissingBody: 'Symbols are shown as unclassified; no compliance claim is made.',
    compliant: 'Compliant',
    review: 'Needs review',
    nonCompliant: 'Non-compliant',
    unknown: 'Unclassified',
    source: 'Source',
    method: 'Methodology',
    unavailable: 'Unavailable',
    sector: 'Sector',
    assetType: 'Asset type',
    stock: 'Stock',
    etf: 'ETF',
    price: 'Price',
    change: 'Change',
    screeningDate: 'Last screening update',
    whatTitle: 'What are Shariah stocks?',
    whatBody: 'Shariah stocks are companies screened by business activity and financial ratios under Islamic finance criteria. This page is informational only.',
    whatPoints: ['Core business activity', 'Revenue sources', 'Debt and liquidity ratios', 'Avoiding prohibited activities', 'Recurring review'],
    criteriaTitle: 'Shariah screening criteria',
    criteriaRows: [['Business activity', 'Review the company activity and revenue sources.'], ['Debt ratio', 'Measure debt levels under the selected screen.'], ['Cash and investments', 'Review interest-bearing cash or investments when available.'], ['Non-compliant revenue', 'Identify revenue that may need review.'], ['Receivables', 'Review financial line items that may affect screens.'], ['Periodic update', 'Screening changes with filings and data sources.']],
    limitsTitle: 'Initial reading, not a fatwa',
    generalReading: 'General reading',
    generalPoints: ['Helps initial filtering', 'Depends on available data', 'Changes with financial statements', 'Needs review when activity changes'],
    limits: 'Important limits',
    limitPoints: ['No qualified fatwa source inside the site', 'Does not replace a specialist', 'Criteria may differ by provider', 'Classification can change'],
    movementTitle: 'Shariah-related movers',
    movementSubtitle: 'Top real daily moves while keeping screening status transparent.',
    screenerTitle: 'Shariah Stock Screener',
    screenerSubtitle: 'Search symbols, prices, and screening state without hiding uncertainty.',
    searchPlaceholder: 'Search by ticker, company, or sector...',
    filterLabel: 'Filters',
    details: 'View details',
    newsTitle: 'Shariah Stocks News',
    newsSubtitle: 'Follow companies and ETFs related to Shariah-aware investing.',
    showing: 'Showing',
    results: 'results',
    showMore: 'Load more',
    noMore: 'All available news is shown',
    readArticle: 'Read news',
    originalLanguage: 'Original language',
    translated: 'Translated',
    noLink: 'No link available',
    emptyTitle: 'No data available right now',
    emptyHint: 'Try changing search or filter, or refresh the data.',
    newsEmpty: 'No news is available for this category right now',
    errorTitle: 'Unable to load data right now',
    errorBody: 'Try again shortly. No fake fallback data is shown.',
    retry: 'Retry',
    featuredTitle: 'Featured Shariah-related stocks and ETFs',
    featuredSubtitle: 'Real prices with non-assumed screening status when no trusted source exists.',
    methodologyTitle: 'Classification methodology',
    methodologySource: 'Classification source',
    methodologySourceBody: 'No trusted Shariah screening source is connected yet.',
    methodologyHow: 'Screening method',
    methodologyHowPoints: ['Business activity', 'Financial statements', 'Debt ratios', 'Non-compliant revenue', 'Cash and investments', 'Data update date'],
    methodologyLimits: 'Usage limits',
    methodologyLimitsPoints: ['Educational and informational', 'Not a fatwa', 'Does not replace a Shariah board or specialist', 'Criteria may differ by source'],
    riskTitle: 'When does a stock need review?',
    riskPoints: ['Business activity changes', 'New financial statements', 'Debt increases', 'Non-compliant revenue increases', 'Screening source changes', 'Insufficient data'],
    warningTitle: 'Important limits',
    warningPoints: ['No final ruling without a trusted source', 'Screening may differ by provider', 'Financial data can be delayed', 'This page does not provide a fatwa', 'The final decision is the user’s responsibility'],
    disclaimerTitle: 'Shariah and Investment Notice',
    disclaimerBody: 'This page is for education and general information only. It is not a Shariah fatwa or a buy/sell recommendation. Stock classifications may depend on available sources and financial data and may change over time.',
  },
  fr: {
    title: 'Actualités des actions charia',
    subtitle: 'Prix, actualités et état de classification transparent pour les actifs liés à l’investissement conforme à la charia.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore mis à jour',
    liveStatus: 'Dernier prix disponible depuis un fournisseur réel',
    refreshCadence: 'Actualisation toutes les 5 minutes',
    fatwaNote: 'Information uniquement, pas une fatwa',
    tickerTitle: 'Ticker actions charia',
    tickerSubtitle: 'Prix réels avec statut de filtrage transparent.',
    tickerEmpty: 'Aucune donnée de prix disponible',
    snapshotTitle: 'Synthèse du filtrage charia',
    snapshotSubtitle: 'État transparent selon la source connectée.',
    sourceMissingTitle: 'Aucune source de filtrage charia fiable n’est connectée',
    sourceMissingBody: 'Les symboles restent non classés sans revendication de conformité.',
    compliant: 'Conforme',
    review: 'À examiner',
    nonCompliant: 'Non conforme',
    unknown: 'Non classé',
    source: 'Source',
    method: 'Méthodologie',
    unavailable: 'Indisponible',
    sector: 'Secteur',
    assetType: 'Type',
    stock: 'Action',
    etf: 'ETF',
    price: 'Prix',
    change: 'Variation',
    screeningDate: 'Dernier filtrage',
    whatTitle: 'Que sont les actions charia ?',
    whatBody: 'Ce sont des sociétés filtrées selon leur activité et leurs ratios financiers. Cette page est informative seulement.',
    whatPoints: ['Activité principale', 'Sources de revenus', 'Dette et liquidité', 'Activités interdites', 'Révision régulière'],
    criteriaTitle: 'Critères de filtrage',
    criteriaRows: [['Activité', 'Analyser l’activité et les revenus.'], ['Dette', 'Mesurer les niveaux de dette.'], ['Trésorerie', 'Examiner les investissements à intérêt si disponibles.'], ['Revenus non conformes', 'Identifier les revenus à revoir.'], ['Créances', 'Examiner certains postes financiers.'], ['Mise à jour', 'La classification change avec les données.']],
    limitsTitle: 'Lecture initiale, pas une fatwa',
    generalReading: 'Lecture générale',
    generalPoints: ['Aide au tri initial', 'Dépend des données disponibles', 'Change avec les états financiers', 'Nécessite une revue en cas de changement'],
    limits: 'Limites importantes',
    limitPoints: ['Aucune fatwa qualifiée dans le site', 'Ne remplace pas un spécialiste', 'Les critères peuvent varier', 'La classification peut changer'],
    movementTitle: 'Mouvements liés au filtrage',
    movementSubtitle: 'Mouvements quotidiens réels avec statut transparent.',
    screenerTitle: 'Filtre actions charia',
    screenerSubtitle: 'Recherche par symbole, prix et statut sans cacher l’incertitude.',
    searchPlaceholder: 'Chercher symbole, société ou secteur...',
    filterLabel: 'Filtres',
    details: 'Voir détails',
    newsTitle: 'Actualités des actions charia',
    newsSubtitle: 'Suivez les sociétés et ETF liés à l’investissement charia.',
    showing: 'Affichage',
    results: 'résultats',
    showMore: 'Charger plus',
    noMore: 'Toutes les actualités sont affichées',
    readArticle: 'Lire',
    originalLanguage: 'Langue originale',
    translated: 'Traduit',
    noLink: 'Lien indisponible',
    emptyTitle: 'Aucune donnée disponible',
    emptyHint: 'Changez la recherche ou actualisez.',
    newsEmpty: 'Aucune actualité disponible pour cette catégorie',
    errorTitle: 'Impossible de charger les données',
    errorBody: 'Réessayez bientôt. Aucune fausse donnée n’est affichée.',
    retry: 'Réessayer',
    featuredTitle: 'Actions et ETF liés à la charia',
    featuredSubtitle: 'Prix réels avec statut non supposé.',
    methodologyTitle: 'Méthodologie',
    methodologySource: 'Source',
    methodologySourceBody: 'Aucune source fiable n’est connectée.',
    methodologyHow: 'Méthode',
    methodologyHowPoints: ['Activité', 'États financiers', 'Ratios de dette', 'Revenus non conformes', 'Trésorerie', 'Mise à jour'],
    methodologyLimits: 'Limites',
    methodologyLimitsPoints: ['Éducatif et informatif', 'Pas une fatwa', 'Ne remplace pas un spécialiste', 'Les critères peuvent varier'],
    riskTitle: 'Quand revoir un titre ?',
    riskPoints: ['Changement d’activité', 'Nouveaux états financiers', 'Dette plus élevée', 'Revenus non conformes plus élevés', 'Source modifiée', 'Données insuffisantes'],
    warningTitle: 'Limites importantes',
    warningPoints: ['Pas de jugement final sans source fiable', 'Les filtres varient', 'Données parfois retardées', 'Pas une fatwa', 'Décision finale à l’utilisateur'],
    disclaimerTitle: 'Avis charia et investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement. Elle ne constitue pas une fatwa ni une recommandation d’achat ou de vente.',
  },
} as const;

const SCREENER_FILTERS: Array<{ id: ShariahFilter; label: Record<LangCode, string> }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' } },
  { id: 'compliant', label: { ar: 'متوافق', en: 'Compliant', fr: 'Conforme' } },
  { id: 'review', label: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À examiner' } },
  { id: 'non_compliant', label: { ar: 'غير متوافق', en: 'Non-compliant', fr: 'Non conforme' } },
  { id: 'unknown', label: { ar: 'غير مصنف', en: 'Unclassified', fr: 'Non classé' } },
  { id: 'technology', label: { ar: 'التقنية', en: 'Technology', fr: 'Technologie' } },
  { id: 'healthcare', label: { ar: 'الصحة', en: 'Healthcare', fr: 'Santé' } },
  { id: 'consumer', label: { ar: 'السلع الاستهلاكية', en: 'Consumer', fr: 'Consommation' } },
  { id: 'sharia_etf', label: { ar: 'صناديق ETF شرعية', en: 'Shariah ETFs', fr: 'ETF charia' } },
];

const NEWS_FILTERS: Array<{ id: NewsFilter; label: Record<LangCode, string>; keywords: string[]; sectors: string[]; statuses?: ShariahScreeningStatus[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'compliant', label: { ar: 'متوافق', en: 'Compliant', fr: 'Conforme' }, keywords: ['compliant', 'sharia compliant'], sectors: [], statuses: ['compliant'] },
  { id: 'review', label: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À examiner' }, keywords: ['screening', 'review'], sectors: [], statuses: ['review'] },
  { id: 'unknown', label: { ar: 'غير مصنف', en: 'Unclassified', fr: 'Non classé' }, keywords: [], sectors: [], statuses: ['unknown'] },
  { id: 'sharia_etf', label: { ar: 'صناديق شرعية', en: 'Shariah ETFs', fr: 'ETF charia' }, keywords: ['etf', 'spus', 'hlal', 'umma', 'sukuk'], sectors: ['sharia_etf'] },
  { id: 'technology', label: { ar: 'تقنية', en: 'Technology', fr: 'Technologie' }, keywords: ['technology', 'ai', 'software', 'semiconductor'], sectors: ['technology', 'semiconductors'] },
  { id: 'healthcare', label: { ar: 'صحة', en: 'Healthcare', fr: 'Santé' }, keywords: ['healthcare', 'pharma', 'drug'], sectors: ['healthcare'] },
  { id: 'consumer', label: { ar: 'سلع استهلاكية', en: 'Consumer', fr: 'Consommation' }, keywords: ['consumer', 'retail', 'staples'], sectors: ['consumer'] },
  { id: 'companies', label: { ar: 'أخبار الشركات', en: 'Company news', fr: 'Sociétés' }, keywords: ['company', 'stock', 'shares'], sectors: [] },
  { id: 'earnings', label: { ar: 'أرباح وتوقعات', en: 'Earnings', fr: 'Résultats' }, keywords: ['earnings', 'guidance', 'revenue', 'profit'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis', fr: 'Analyses' }, keywords: ['analysis', 'rating', 'report', 'target'], sectors: [] },
  { id: 'screening_updates', label: { ar: 'تحديثات تصنيف شرعي', en: 'Screening updates', fr: 'Mises à jour' }, keywords: ['screening', 'sharia', 'islamic finance'], sectors: [] },
];

const SECTOR_LABELS: Record<string, Record<LangCode, string>> = {
  technology: { ar: 'التقنية', en: 'Technology', fr: 'Technologie' },
  semiconductors: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' },
  healthcare: { ar: 'الصحة', en: 'Healthcare', fr: 'Santé' },
  consumer: { ar: 'السلع الاستهلاكية', en: 'Consumer', fr: 'Consommation' },
  sharia_etf: { ar: 'صناديق مرتبطة بالاستثمار الشرعي', en: 'Shariah-related ETFs', fr: 'ETF liés à la charia' },
};

const STATUS_ICON: Record<ShariahScreeningStatus, typeof ShieldCheck> = {
  compliant: CheckCircle2,
  review: ShieldAlert,
  non_compliant: AlertTriangle,
  unknown: Info,
};

function localeFor(lang: LangCode) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function formatMoney(value: number | null | undefined, currency = 'USD', locale = 'ar-KW') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'KWD' ? 3 : 2,
    maximumFractionDigits: currency === 'KWD' ? 3 : 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined, locale = 'ar-KW') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function relativeTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return formatter.format(diffSeconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86400), 'day');
}

function changeTone(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function statusClass(status: ShariahScreeningStatus) {
  if (status === 'compliant') return styles.statusCompliant;
  if (status === 'review') return styles.statusReview;
  if (status === 'non_compliant') return styles.statusNonCompliant;
  return styles.statusUnknown;
}

function statusLabel(status: ShariahScreeningStatus, lang: LangCode) {
  const text = TEXT[lang];
  if (status === 'compliant') return text.compliant;
  if (status === 'review') return text.review;
  if (status === 'non_compliant') return text.nonCompliant;
  return text.unknown;
}

function sectorLabel(sector: string | undefined, lang: LangCode) {
  if (!sector) return TEXT[lang].unavailable;
  return SECTOR_LABELS[sector]?.[lang] ?? sector;
}

function assetTypeLabel(type: ShariahAssetType | undefined, lang: LangCode) {
  if (type === 'etf') return TEXT[lang].etf;
  return TEXT[lang].stock;
}

function displayTitle(item: ShariahNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: ShariahNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function itemText(item: ShariahNewsItem) {
  return [
    item.title,
    item.headline,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    item.source,
    item.ticker,
    item.companyName,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function newsCategoryLabel(item: ShariahNewsItem, lang: LangCode) {
  const text = itemText(item);
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  const filter = NEWS_FILTERS.find(entry => entry.id !== 'all' && entry.statuses?.includes(item.shariahStatus ?? 'unknown'))
    ?? NEWS_FILTERS.find(entry => entry.id !== 'all' && entry.sectors.some(sector => sectors.includes(sector)))
    ?? NEWS_FILTERS.find(entry => entry.id !== 'all' && entry.keywords.some(keyword => text.includes(keyword)));
  return filter?.label[lang] ?? NEWS_FILTERS[0].label[lang];
}

function matchesNewsFilter(item: ShariahNewsItem, filter: NewsFilter) {
  if (filter === 'all') return true;
  const config = NEWS_FILTERS.find(entry => entry.id === filter);
  if (!config) return true;
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  const text = itemText(item);
  return Boolean(
    config.statuses?.includes(item.shariahStatus ?? 'unknown')
    || config.sectors.some(sector => sectors.includes(sector))
    || config.keywords.some(keyword => text.includes(keyword)),
  );
}

function matchesSearch(values: Array<string | null | undefined>, query: string) {
  if (!query.trim()) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function newestTimestamp(values: string[]) {
  const sorted = values
    .map(value => new Date(value).getTime())
    .filter(value => Number.isFinite(value))
    .sort((a, b) => b - a);
  return sorted[0] ? new Date(sorted[0]).toISOString() : '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.reason || body?.error || `Request failed: ${response.status}`);
  return body as T;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: typeof ShieldCheck; title: string; subtitle?: string }) {
  return (
    <div className={base.panelTitle}>
      <span><Icon size={20} /></span>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return <span className={base.skeletonLine} style={{ width: wide ? '100%' : undefined }} aria-hidden="true" />;
}

function StatusBadge({ status, compact = false }: { status: ShariahScreeningStatus; compact?: boolean }) {
  const { lang: language } = useLanguage();
  const lang = (language === 'en' || language === 'fr' ? language : 'ar') as LangCode;
  const Icon = STATUS_ICON[status];
  return (
    <span className={`${styles.statusBadge} ${compact ? styles.statusBadgeCompact : ''} ${statusClass(status)}`}>
      <Icon size={compact ? 11 : 13} />
      {statusLabel(status, lang)}
    </span>
  );
}

function ShariahTicker({ items, loading, error, retry, text, locale, lang }: {
  items: ShariahQuote[];
  loading: boolean;
  error: string;
  retry: () => void;
  text: typeof TEXT[LangCode];
  locale: string;
  lang: LangCode;
}) {
  return (
    <section className={`${base.tickerPanel} ${base.shariaTickerPanel}`} aria-label={text.tickerTitle}>
      <PanelTitle icon={Landmark} title={text.tickerTitle} subtitle={text.tickerSubtitle} />
      {loading ? (
        <div className={base.tickerSkeletonRow}>
          {Array.from({ length: 7 }).map((_, index) => <span key={index} />)}
        </div>
      ) : error ? (
        <div className={`${base.stateBox} ${base.errorState}`}>
          <AlertTriangle size={24} />
          <strong>{text.errorTitle}</strong>
          <p>{error}</p>
          <button type="button" onClick={retry}><RefreshCcw size={15} />{text.retry}</button>
        </div>
      ) : items.length === 0 ? (
        <div className={base.stateBox}>
          <Info size={24} />
          <strong>{text.tickerEmpty}</strong>
          <p>{text.errorBody}</p>
        </div>
      ) : (
        <div className={base.tickerStrip}>
          <div className={base.tickerViewport} dir="ltr">
            <div className={base.tickerTrack} dir="ltr" style={{ direction: 'ltr' }}>
              {[0, 1, 2, 3].map(setIndex => (
                <div className={base.tickerSet} dir="ltr" key={setIndex} aria-hidden={setIndex > 0}>
                  {items.map(item => {
                    const tone = changeTone(item.changePercent);
                    return (
                      <article className={base.tickerItem} key={`${item.symbol}-${setIndex}`}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{sectorLabel(item.sector, lang)}</span>
                          <span dir="ltr">{item.symbol}</span>
                          <span className={styles.tickerStatusBadge}><StatusBadge status={item.shariahStatus} compact /></span>
                        </div>
                        <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                        <em className={base[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <span className={base.tickerStatus}>{text.liveStatus}</span>
        </div>
      )}
    </section>
  );
}

function ScreeningSnapshot({ response, loading, text, locale }: {
  response: ScreeningResponse | null;
  loading: boolean;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  const counts = response?.counts ?? { compliant: 0, review: 0, non_compliant: 0, unknown: 0 };
  return (
    <section className={base.moversMiniPanel} aria-label={text.snapshotTitle}>
      <PanelTitle icon={Gauge} title={text.snapshotTitle} subtitle={text.snapshotSubtitle} />
      {loading ? (
        <div className={styles.snapshotGrid}>
          {Array.from({ length: 4 }).map((_, index) => <div className={styles.snapshotCard} key={index}><SkeletonLine wide /><SkeletonLine /></div>)}
        </div>
      ) : (
        <>
          {!response?.sourceConnected ? (
            <div className={styles.sourceBox}>
              <ShieldAlert size={22} />
              <div>
                <strong>{text.sourceMissingTitle}</strong>
                <p>{text.sourceMissingBody}</p>
              </div>
            </div>
          ) : null}
          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}><span>{text.compliant}</span><strong>{counts.compliant}</strong></div>
            <div className={styles.snapshotCard}><span>{text.review}</span><strong>{counts.review}</strong></div>
            <div className={styles.snapshotCard}><span>{text.nonCompliant}</span><strong>{counts.non_compliant}</strong></div>
            <div className={styles.snapshotCard}><span>{text.unknown}</span><strong>{counts.unknown}</strong></div>
          </div>
          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}><span>{text.screeningDate}</span><strong>{response?.sourceConnected ? formatDateTime(response.updated_at, locale) : text.unavailable}</strong></div>
            <div className={styles.snapshotCard}><span>{text.source}</span><strong>{response?.sourceName ?? text.unavailable}</strong></div>
          </div>
        </>
      )}
    </section>
  );
}

function WhatCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={base.summaryCard}>
      <PanelTitle icon={ShieldCheck} title={text.whatTitle} />
      <p className={base.cardMuted}>{text.whatBody}</p>
      <div className={styles.insightList}>
        {text.whatPoints.map(point => <span key={point}>{point}</span>)}
      </div>
    </article>
  );
}

function CriteriaCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={base.summaryCard}>
      <PanelTitle icon={ListChecks} title={text.criteriaTitle} />
      <div className={styles.criteriaGrid}>
        {text.criteriaRows.map(([title, body]) => (
          <div className={styles.criteriaRow} key={title}>
            <FileSearch size={17} />
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function LimitsCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={base.summaryCard}>
      <PanelTitle icon={Scale} title={text.limitsTitle} />
      <div className={styles.splitPanel}>
        <div className={styles.generalColumn}>
          <strong>{text.generalReading}</strong>
          {text.generalPoints.map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.limitColumn}>
          <strong>{text.limits}</strong>
          {text.limitPoints.map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </article>
  );
}

function MovementCard({ items, loading, text, locale, lang }: {
  items: ShariahQuote[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  locale: string;
  lang: LangCode;
}) {
  const rows = items
    .filter(item => typeof item.changePercent === 'number')
    .slice()
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, 5);

  return (
    <article className={base.summaryCard}>
      <PanelTitle icon={TrendingUp} title={text.movementTitle} subtitle={text.movementSubtitle} />
      <div className={base.topStocksList}>
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div className={base.topStockRow} key={index}>
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ))
        ) : rows.length > 0 ? rows.map((item, index) => {
          const tone = changeTone(item.changePercent);
          return (
            <div className={base.topStockRow} key={item.symbol}>
              <div>
                <strong dir="ltr">#{index + 1} {item.symbol}</strong>
                <span>{item.name}</span>
                <span>{sectorLabel(item.sector, lang)}</span>
                <StatusBadge status={item.shariahStatus} />
              </div>
              <div className={base.topStockValue}>
                <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                <em className={base[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
              </div>
            </div>
          );
        }) : <p className={base.cardMuted}>{text.tickerEmpty}</p>}
      </div>
    </article>
  );
}

function ScreenerSection({
  rows,
  loading,
  query,
  setQuery,
  filter,
  setFilter,
  counts,
  text,
  lang,
  locale,
}: {
  rows: Array<ScreeningItem & { quote?: ShariahQuote }>;
  loading: boolean;
  query: string;
  setQuery: (value: string) => void;
  filter: ShariahFilter;
  setFilter: (filter: ShariahFilter) => void;
  counts: Record<ShariahFilter, number>;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  return (
    <section className={styles.screenerPanel} aria-label={text.screenerTitle}>
      <div className={base.newsHead}>
        <PanelTitle icon={Filter} title={text.screenerTitle} subtitle={text.screenerSubtitle} />
        <span className={base.resultsCount}><b>{rows.length}</b>{text.results}</span>
      </div>
      <div className={base.newsControls}>
        <label className={base.searchBox}>
          <Search size={17} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchPlaceholder} aria-label={text.searchPlaceholder} />
        </label>
        <div className={base.filterScroller} aria-label={text.filterLabel}>
          {SCREENER_FILTERS.map(entry => (
            <button type="button" className={filter === entry.id ? base.activeFilter : ''} onClick={() => setFilter(entry.id)} key={entry.id}>
              {entry.label[lang]}
              <span>{counts[entry.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className={styles.screenerGrid}>
          {Array.from({ length: 8 }).map((_, index) => <article className={styles.screenerCard} key={index}><SkeletonLine wide /><SkeletonLine /><SkeletonLine /></article>)}
        </div>
      ) : rows.length === 0 ? (
        <div className={base.stateBox}>
          <Info size={26} />
          <strong>{text.emptyTitle}</strong>
          <p>{text.emptyHint}</p>
        </div>
      ) : (
        <div className={styles.screenerGrid}>
          {rows.map(item => {
            const quote = item.quote;
            const tone = changeTone(quote?.changePercent);
            return (
              <article className={styles.screenerCard} key={item.symbol}>
                <header>
                  <div>
                    <h3>{item.name}</h3>
                    <small dir="ltr">{item.symbol}</small>
                  </div>
                  <StatusBadge status={item.shariahStatus} />
                </header>
                <div className={styles.screenerMeta}>
                  <span>{text.price}<b dir="ltr">{quote ? formatMoney(quote.price, quote.currency, locale) : text.unavailable}</b></span>
                  <span>{text.change}<b className={quote ? base[tone] : undefined} dir="ltr">{quote ? formatPercent(quote.changePercent, locale) : '—'}</b></span>
                  <span>{text.sector}<b>{sectorLabel(item.sector, lang)}</b></span>
                  <span>{text.assetType}<b>{assetTypeLabel(item.assetType, lang)}</b></span>
                  <span>{text.source}<b>{item.screeningSource ?? text.unavailable}</b></span>
                  <span>{text.screeningDate}<b>{formatDateTime(item.lastScreenedAt, locale)}</b></span>
                </div>
                <p className={styles.reasonText}>{item.reason}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NewsCard({ item, text, lang, locale }: {
  item: ShariahNewsItem;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const title = displayTitle(item);
  const summary = displaySummary(item);
  const tone = changeTone(item.changePercent);
  const status = item.shariahStatus ?? 'unknown';

  return (
    <article className={base.newsCard}>
      <div className={base.newsCardTop}>
        <span className={base.categoryTag}>{newsCategoryLabel(item, lang)}</span>
        <small className={base.newsTime}><Clock3 size={13} />{relativeTime(item.publishedAt, locale)}</small>
      </div>
      <h3>{title}</h3>
      {summary ? <p>{summary}</p> : null}
      <div className={base.newsMetaGrid}>
        <span>{text.source}: <b>{item.source || text.source}</b></span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {typeof item.price === 'number' ? (
          <span className={base.newsPrice} dir="ltr">{formatMoney(item.price, 'USD', locale)} <em className={base[tone]}>{formatPercent(item.changePercent, locale)}</em></span>
        ) : null}
        <StatusBadge status={status} />
        <span>{item.isTranslated ? text.translated : text.originalLanguage}</span>
      </div>
      <div className={base.newsFooter}>
        <small className={base.newsTime}><Clock3 size={13} />{formatDateTime(item.publishedAt, locale)}</small>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${text.readArticle}: ${title}`}>
            {text.readArticle}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span>{text.noLink}</span>
        )}
      </div>
    </article>
  );
}

function NewsSection({
  items,
  loading,
  error,
  query,
  setQuery,
  activeFilter,
  setActiveFilter,
  visibleCount,
  setVisibleCount,
  counts,
  retry,
  text,
  lang,
  locale,
}: {
  items: ShariahNewsItem[];
  loading: boolean;
  error: string;
  query: string;
  setQuery: (value: string) => void;
  activeFilter: NewsFilter;
  setActiveFilter: (filter: NewsFilter) => void;
  visibleCount: number;
  setVisibleCount: (updater: number | ((value: number) => number)) => void;
  counts: Record<NewsFilter, number>;
  retry: () => void;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const visible = items.slice(0, visibleCount);
  return (
    <section className={base.newsPanel} aria-label={text.newsTitle}>
      <div className={base.newsHead}>
        <PanelTitle icon={Newspaper} title={text.newsTitle} subtitle={text.newsSubtitle} />
        <span className={base.resultsCount}>{text.showing}<b>{items.length}</b>{text.results}</span>
      </div>
      <div className={base.newsControls}>
        <label className={base.searchBox}>
          <Search size={17} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchPlaceholder} aria-label={text.searchPlaceholder} />
        </label>
        <div className={base.filterScroller} aria-label={text.filterLabel}>
          {NEWS_FILTERS.map(entry => (
            <button type="button" className={activeFilter === entry.id ? base.activeFilter : ''} onClick={() => setActiveFilter(entry.id)} key={entry.id}>
              {entry.label[lang]}
              <span>{counts[entry.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className={base.newsGrid}>
          {Array.from({ length: 6 }).map((_, index) => <article className={base.newsSkeleton} key={index}><SkeletonLine wide /><SkeletonLine wide /><SkeletonLine /></article>)}
        </div>
      ) : error ? (
        <div className={`${base.stateBox} ${base.errorState}`}>
          <AlertTriangle size={24} />
          <strong>{text.errorTitle}</strong>
          <p>{error || text.errorBody}</p>
          <button type="button" onClick={retry}><RefreshCcw size={15} />{text.retry}</button>
        </div>
      ) : visible.length === 0 ? (
        <div className={base.stateBox}>
          <Newspaper size={26} />
          <strong>{text.newsEmpty}</strong>
          <p>{text.emptyHint}</p>
        </div>
      ) : (
        <>
          <div className={base.newsGrid}>
            {visible.map(item => <NewsCard item={item} text={text} lang={lang} locale={locale} key={item.id} />)}
          </div>
          <div className={base.loadMoreWrap}>
            {visible.length < items.length ? (
              <button type="button" onClick={() => setVisibleCount(value => value + NEWS_PAGE_SIZE)}>
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

function FeaturedAssets({ items, screening, loading, text, lang, locale }: {
  items: ShariahQuote[];
  screening: ScreeningItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const quotesBySymbol = new Map(items.map(item => [item.symbol, item]));
  const screeningBySymbol = new Map(screening.map(item => [item.symbol, item]));
  return (
    <section className={base.sectorGuidePanel} aria-label={text.featuredTitle}>
      <PanelTitle icon={Sparkles} title={text.featuredTitle} subtitle={text.featuredSubtitle} />
      <div className={styles.screenerGrid}>
        {loading ? Array.from({ length: 8 }).map((_, index) => (
          <article className={styles.screenerCard} key={index}><SkeletonLine wide /><SkeletonLine /><SkeletonLine /></article>
        )) : FEATURED_SYMBOLS.map(symbol => {
          const quote = quotesBySymbol.get(symbol);
          const screen = screeningBySymbol.get(symbol);
          const tone = changeTone(quote?.changePercent);
          return (
            <article className={styles.screenerCard} key={symbol}>
              <header>
                <div>
                  <h3>{quote?.name ?? screen?.name ?? symbol}</h3>
                  <small dir="ltr">{symbol}</small>
                </div>
                <StatusBadge status={screen?.shariahStatus ?? 'unknown'} />
              </header>
              <span className={styles.featuredType}>{assetTypeLabel(quote?.assetType ?? screen?.assetType, lang)} · {sectorLabel(quote?.sector ?? screen?.sector, lang)}</span>
              <div className={styles.screenerMeta}>
                <span>{text.price}<b dir="ltr">{quote ? formatMoney(quote.price, quote.currency, locale) : text.unavailable}</b></span>
                <span>{text.change}<b className={quote ? base[tone] : undefined} dir="ltr">{quote ? formatPercent(quote.changePercent, locale) : '—'}</b></span>
                <span>{text.source}<b>{screen?.screeningSource ?? text.unavailable}</b></span>
                <span>{text.screeningDate}<b>{formatDateTime(screen?.lastScreenedAt, locale)}</b></span>
              </div>
              <p className={styles.reasonText}>{screen?.reason ?? text.sourceMissingBody}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MethodologySection({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <section className={base.sectorGuidePanel} aria-label={text.methodologyTitle}>
      <PanelTitle icon={BookOpen} title={text.methodologyTitle} />
      <div className={styles.methodologyGrid}>
        <article className={styles.methodologyCard}>
          <h3>{text.methodologySource}</h3>
          <p>{text.methodologySourceBody}</p>
        </article>
        <article className={styles.methodologyCard}>
          <h3>{text.methodologyHow}</h3>
          <ul>{text.methodologyHowPoints.map(point => <li key={point}>{point}</li>)}</ul>
        </article>
        <article className={styles.methodologyCard}>
          <h3>{text.methodologyLimits}</h3>
          <ul>{text.methodologyLimitsPoints.map(point => <li key={point}>{point}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}

function RiskSection({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <section className={base.moversMiniPanel} aria-label={text.warningTitle}>
      <PanelTitle icon={ShieldAlert} title={text.warningTitle} />
      <div className={styles.riskGrid}>
        <article className={styles.riskCard}>
          <h3>{text.riskTitle}</h3>
          <ul>{text.riskPoints.map(point => <li key={point}>{point}</li>)}</ul>
        </article>
        <article className={styles.riskCard}>
          <h3>{text.warningTitle}</h3>
          <ul>{text.warningPoints.map(point => <li key={point}>{point}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}

function Disclaimer({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <section className={base.disclaimer} aria-label={text.disclaimerTitle}>
      <AlertTriangle size={22} />
      <div>
        <h2>{text.disclaimerTitle}</h2>
        <p>{text.disclaimerBody}</p>
      </div>
    </section>
  );
}

export function ShariahStocksNewsPage() {
  const { lang: language } = useLanguage();
  const activeLang = (language === 'en' || language === 'fr' ? language : 'ar') as LangCode;
  const dir = activeLang === 'ar' ? 'rtl' : 'ltr';
  const locale = localeFor(activeLang);
  const text = TEXT[activeLang];

  const [quotes, setQuotes] = useState<ShariahQuote[]>([]);
  const [screening, setScreening] = useState<ScreeningResponse | null>(null);
  const [news, setNews] = useState<ShariahNewsItem[]>([]);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [screeningUpdatedAt, setScreeningUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [newsError, setNewsError] = useState('');
  const [screenerQuery, setScreenerQuery] = useState('');
  const [newsQuery, setNewsQuery] = useState('');
  const [screenerFilter, setScreenerFilter] = useState<ShariahFilter>('all');
  const [newsFilter, setNewsFilter] = useState<NewsFilter>('all');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedScreenerQuery = useDebouncedValue(screenerQuery, 180);
  const debouncedNewsQuery = useDebouncedValue(newsQuery, 180);

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setMarketError('');
    setNewsError('');

    const [tickerResult, screeningResult, newsResult] = await Promise.allSettled([
      fetchJson<ShariahTickerResponse>('/api/sharia-stocks/ticker'),
      fetchJson<ScreeningResponse>('/api/sharia-stocks/screening'),
      fetchJson<ShariahNewsResponse>(`/api/sharia-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=60`),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setQuotes(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
    } else {
      setQuotes([]);
      setTickerUpdatedAt('');
      setMarketError(text.tickerEmpty);
    }

    if (screeningResult.status === 'fulfilled' && screeningResult.value.ok) {
      setScreening(screeningResult.value);
      setScreeningUpdatedAt(screeningResult.value.updated_at);
    } else {
      setScreening(null);
      setScreeningUpdatedAt('');
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNews(newsResult.value.items);
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      setNews([]);
      setNewsUpdatedAt('');
      setNewsError(text.errorBody);
    }

    setLoading(false);
    setRefreshing(false);
  }, [activeLang, text.errorBody, text.tickerEmpty]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const id = window.setInterval(() => void loadData(false), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [newsFilter, debouncedNewsQuery]);

  const lastUpdated = useMemo(
    () => newestTimestamp([tickerUpdatedAt, screeningUpdatedAt, newsUpdatedAt]),
    [newsUpdatedAt, screeningUpdatedAt, tickerUpdatedAt],
  );

  const quotesBySymbol = useMemo(() => new Map(quotes.map(item => [item.symbol, item])), [quotes]);

  const screenerRows = useMemo(() => {
    const sourceRows = screening?.items ?? [];
    return sourceRows.map(item => ({ ...item, quote: quotesBySymbol.get(item.symbol) }));
  }, [quotesBySymbol, screening?.items]);

  const filteredScreenerRows = useMemo(() => {
    return screenerRows.filter(item => {
      const byFilter = screenerFilter === 'all'
        || item.shariahStatus === screenerFilter
        || item.sector === screenerFilter;
      const bySearch = matchesSearch([item.symbol, item.name, item.sector, item.industry], debouncedScreenerQuery);
      return byFilter && bySearch;
    });
  }, [debouncedScreenerQuery, screenerFilter, screenerRows]);

  const screenerCounts = useMemo(() => {
    const counts = Object.fromEntries(SCREENER_FILTERS.map(filter => [filter.id, 0])) as Record<ShariahFilter, number>;
    for (const item of screenerRows) {
      counts.all += 1;
      counts[item.shariahStatus] += 1;
      if (item.sector in counts) counts[item.sector as ShariahFilter] += 1;
    }
    return counts;
  }, [screenerRows]);

  const searchableNews = useMemo(
    () => news.filter(item => matchesSearch([displayTitle(item), displaySummary(item), item.source, item.ticker, item.companyName, item.sector], debouncedNewsQuery)),
    [debouncedNewsQuery, news],
  );

  const filteredNews = useMemo(
    () => searchableNews.filter(item => matchesNewsFilter(item, newsFilter)),
    [newsFilter, searchableNews],
  );

  const newsCounts = useMemo(() => {
    const counts = Object.fromEntries(NEWS_FILTERS.map(filter => [filter.id, 0])) as Record<NewsFilter, number>;
    for (const item of searchableNews) {
      for (const filter of NEWS_FILTERS) {
        if (matchesNewsFilter(item, filter.id)) counts[filter.id] += 1;
      }
    }
    return counts;
  }, [searchableNews]);

  return (
    <div className={base.page} dir={dir}>
      <Sidebar />
      <main className={base.main}>
        <div className={base.container}>
          <header className={base.header}>
            <div className={base.headerCopy}>
              <span className={base.eyebrow}><ShieldCheck size={16} />{text.liveStatus}</span>
              <span className={styles.trustNote}><Info size={15} />{text.fatwaNote}</span>
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>
            <div className={base.headerActions}>
              <button type="button" onClick={() => void loadData(false)} disabled={refreshing}>
                <RefreshCcw className={refreshing ? base.spin : ''} size={16} />
                {refreshing ? text.refreshing : text.refresh}
              </button>
              <span><Clock3 size={14} />{text.lastUpdated}: {lastUpdated ? formatDateTime(lastUpdated, locale) : text.notUpdated}</span>
              <small>{text.refreshCadence}</small>
            </div>
          </header>

          <ShariahTicker items={quotes} loading={loading} error={marketError} retry={() => void loadData(false)} text={text} locale={locale} lang={activeLang} />

          <ScreeningSnapshot response={screening} loading={loading} text={text} locale={locale} />

          <section className={base.summaryGrid}>
            <WhatCard text={text} />
            <CriteriaCard text={text} />
            <LimitsCard text={text} />
            <MovementCard items={quotes} loading={loading} text={text} locale={locale} lang={activeLang} />
          </section>

          <ScreenerSection
            rows={filteredScreenerRows}
            loading={loading}
            query={screenerQuery}
            setQuery={setScreenerQuery}
            filter={screenerFilter}
            setFilter={setScreenerFilter}
            counts={screenerCounts}
            text={text}
            lang={activeLang}
            locale={locale}
          />

          <NewsSection
            items={filteredNews}
            loading={loading}
            error={newsError}
            query={newsQuery}
            setQuery={setNewsQuery}
            activeFilter={newsFilter}
            setActiveFilter={setNewsFilter}
            visibleCount={visibleCount}
            setVisibleCount={setVisibleCount}
            counts={newsCounts}
            retry={() => void loadData(false)}
            text={text}
            lang={activeLang}
            locale={locale}
          />

          <FeaturedAssets items={quotes} screening={screening?.items ?? []} loading={loading} text={text} lang={activeLang} locale={locale} />

          <MethodologySection text={text} />
          <RiskSection text={text} />
          <Disclaimer text={text} />
        </div>
      </main>
    </div>
  );
}
