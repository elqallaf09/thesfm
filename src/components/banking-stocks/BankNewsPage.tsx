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
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  Gauge,
  Info,
  Landmark,
  Layers3,
  LineChart,
  Newspaper,
  Percent,
  RefreshCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import styles from '@/components/defensive-stocks/DefensiveStocksNews.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type BankFilterId =
  | 'all'
  | 'large_banks'
  | 'investment_banks'
  | 'regional_banks'
  | 'asset_management'
  | 'payments'
  | 'rates'
  | 'loans_deposits'
  | 'asset_quality'
  | 'earnings'
  | 'dividends_buybacks'
  | 'analysis';
type WatchlistFilter = 'large_banks' | 'investment_banks' | 'regional_banks' | 'asset_management' | 'payments' | 'movers';

type BankTickerItem = {
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

type BankTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: BankTickerItem[];
  };

type BankingSnapshotItem = {
  symbol: string;
  displayName: string;
  nameAr: string;
  category: string;
  unit: string;
  value: number | null;
  change: number | null;
  changePercent: number | null;
  lastUpdated: string;
  source: string | null;
  delayed: true;
  available: boolean;
};

type BankingSnapshotResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankingSnapshotItem[];
  }
  | {
    ok: false;
    source: string | null;
    updated_at: string | null;
    items: BankingSnapshotItem[];
    error?: string;
  };

type BankNewsItem = {
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

type BankNewsResponse =
  | {
    success: true;
    category: 'banking';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: BankNewsItem[];
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
const FEATURED_SYMBOLS = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'SCHW', 'BLK', 'AXP', 'V', 'MA', 'PYPL', 'ICE', 'CME', 'SPGI', 'MCO'] as const;

const TEXT = {
  ar: {
    title: 'أخبار البنوك',
    subtitle: 'تغطية شاملة لأخبار وتحليلات أسهم البنوك والمؤسسات المالية، مع متابعة تأثير أسعار الفائدة، الائتمان، القروض، الودائع، جودة الأصول، والنتائج الفصلية.',
    refresh: 'تحديث البيانات',
    refreshing: 'جارٍ التحديث...',
    lastUpdated: 'آخر تحديث',
    notUpdated: 'لم يتم التحديث بعد',
    delayed: 'آخر سعر متاح من مزود بيانات حقيقي',
    liveStatus: 'آخر سعر متاح',
    tickerTitle: 'شريط أسهم البنوك المباشر',
    tickerSubtitle: 'أسعار حقيقية للبنوك والمؤسسات المالية المختارة مع التغير اليومي ونوع النشاط.',
    tickerEmpty: 'لا توجد بيانات أسعار متاحة حالياً',
    snapshotTitle: 'نظرة سريعة على القطاع المالي',
    snapshotSubtitle: 'مؤشرات مالية وعوائد سندات من Yahoo Finance وFRED عند توفرها.',
    snapshotEmpty: 'لا توجد بيانات مالية مساندة متاحة حالياً',
    unit: 'الوحدة',
    source: 'المصدر',
    sector: 'التصنيف',
    whatTitle: 'ما الذي يحرك أسهم البنوك؟',
    whatBody: 'أسهم البنوك تتأثر بأسعار الفائدة ونمو القروض والودائع وجودة الأصول وقوة رأس المال والاقتصاد الأوسع.',
    whatPoints: ['أسعار الفائدة وهوامش الربح', 'نمو القروض والودائع', 'جودة الأصول ومخاطر التعثر', 'الرسوم والخدمات المصرفية', 'نتائج الأرباح والتوجيهات المستقبلية'],
    metricsTitle: 'مؤشرات مصرفية مهمة',
    metricsBody: 'هذه المقاييس لا تعرض أرقاماً مصطنعة؛ هي دليل لقراءة نتائج البنوك عند توفر بياناتها الرسمية.',
    metricsRows: ['صافي هامش الفائدة NIM', 'نمو القروض', 'نمو الودائع', 'مخصصات خسائر الائتمان', 'نسبة كفاية رأس المال', 'جودة الأصول', 'العائد على حقوق الملكية ROE', 'نسبة الكفاءة Efficiency Ratio'],
    driversTitle: 'عوامل داعمة ومخاطر القطاع',
    supportTitle: 'عوامل داعمة',
    supportPoints: ['ارتفاع هوامش الفائدة', 'نمو القروض والودائع', 'جودة أصول مستقرة', 'أرباح قوية', 'توزيعات وإعادة شراء أسهم'],
    riskTitle: 'مخاطر مصرفية',
    riskPoints: ['تعثر القروض', 'ضغط الودائع', 'انخفاض هامش الفائدة', 'تقلبات الأسواق', 'تباطؤ النشاط الاقتصادي', 'مخاطر تنظيمية'],
    movementTitle: 'حركة أسهم البنوك',
    movementSubtitle: 'أبرز التحركات اليومية المتاحة من بيانات السوق الحقيقية.',
    sectorGuideTitle: 'قطاعات البنوك والمؤسسات المالية',
    newsTitle: 'أخبار البنوك',
    newsSubtitle: 'تابع أحدث أخبار البنوك والمؤسسات المالية وأسعار الفائدة والائتمان والنتائج الفصلية.',
    searchPlaceholder: 'ابحث عن خبر أو رمز أو بنك أو تصنيف...',
    filtersLabel: 'التصنيفات',
    showMore: 'تحميل المزيد',
    showing: 'المعروض',
    results: 'خبر',
    readArticle: 'قراءة الخبر',
    noLink: 'الرابط غير متاح',
    emptyTitle: 'لا توجد أخبار متاحة حالياً لهذا التصنيف',
    emptyHint: 'جرّب بحثاً آخر أو اختر تصنيفاً مختلفاً.',
    errorTitle: 'تعذر تحميل البيانات حالياً',
    errorBody: 'تعذر جلب أخبار البنوك من المصادر الحقيقية حالياً.',
    retry: 'إعادة المحاولة',
    featuredTitle: 'أبرز أسهم البنوك والمؤسسات المالية',
    featuredSubtitle: 'بطاقات مختصرة مبنية على الأسعار الحقيقية المتاحة حالياً دون مؤشرات مالية مصطنعة.',
    details: 'عرض التفاصيل',
    unavailable: 'غير متاح',
    priceSource: 'مصدر السعر',
    watchlistTitle: 'قائمة متابعة البنوك',
    watchlistSubtitle: 'تصفية سريعة للأسهم المالية التي تم جلب أسعارها فعلياً في هذه الصفحة.',
    opportunityTitle: 'متى تكون أسهم البنوك قوية؟',
    opportunityPoints: ['نمو القروض والودائع', 'ارتفاع صافي هامش الفائدة', 'جودة أصول مستقرة', 'اقتصاد قوي وسوق عمل جيد', 'انخفاض مخصصات خسائر الائتمان', 'أرباح قوية وتوزيعات مستقرة', 'نشاط قوي في أسواق المال للبنوك الاستثمارية'],
    riskCycleTitle: 'متى ترتفع المخاطر؟',
    riskCyclePoints: ['ارتفاع تعثر القروض', 'ضغط على الودائع والسيولة', 'انخفاض منحنى العائد', 'تباطؤ الاقتصاد', 'تراجع نشاط الطروحات والصفقات', 'خسائر استثمارية أو سندات غير محققة', 'مخاطر تنظيمية أو قضايا قانونية'],
    disclaimerTitle: 'تنبيه استثماري',
    disclaimerBody: 'هذه الصفحة لأغراض تعليمية ومعلومات عامة فقط، وليست توصية شراء أو بيع. أسهم البنوك والمؤسسات المالية قد تتأثر بأسعار الفائدة، جودة الأصول، مخاطر الائتمان، السيولة، التنظيمات، والظروف الاقتصادية. يرجى إجراء بحثك الخاص أو استشارة مستشار مالي قبل اتخاذ أي قرار استثماري.',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    translated: 'مترجم',
    originalLanguage: 'باللغة الأصلية',
    noMore: 'تم عرض كل الأخبار المتاحة',
    examples: 'أمثلة',
    viewMore: 'عرض المزيد',
  },
  en: {
    title: 'Bank News',
    subtitle: 'Coverage of bank and financial institution stocks, with interest rates, credit, loans, deposits, asset quality, and earnings context.',
    refresh: 'Refresh data',
    refreshing: 'Refreshing...',
    lastUpdated: 'Last updated',
    notUpdated: 'Not updated yet',
    delayed: 'Last available price from a real data provider',
    liveStatus: 'Last available price',
    tickerTitle: 'Live bank stock ticker',
    tickerSubtitle: 'Real prices for selected banks and financial institutions with daily change and activity type.',
    tickerEmpty: 'No price data is available right now',
    snapshotTitle: 'Financial sector snapshot',
    snapshotSubtitle: 'Financial indicators and Treasury yields from Yahoo Finance and FRED when available.',
    snapshotEmpty: 'No supporting financial data is available right now',
    unit: 'Unit',
    source: 'Source',
    sector: 'Category',
    whatTitle: 'What moves bank stocks?',
    whatBody: 'Bank stocks are affected by rates, loan and deposit growth, asset quality, capital strength, and the broader economy.',
    whatPoints: ['Rates and margins', 'Loan and deposit growth', 'Asset quality and default risk', 'Fees and banking services', 'Earnings and guidance'],
    metricsTitle: 'Important banking metrics',
    metricsBody: 'These are educational metrics, not invented figures.',
    metricsRows: ['Net interest margin', 'Loan growth', 'Deposit growth', 'Credit loss provisions', 'Capital adequacy', 'Asset quality', 'Return on equity', 'Efficiency ratio'],
    driversTitle: 'Sector supports and risks',
    supportTitle: 'Supportive factors',
    supportPoints: ['Wider interest margins', 'Loan and deposit growth', 'Stable asset quality', 'Strong earnings', 'Dividends and buybacks'],
    riskTitle: 'Banking risks',
    riskPoints: ['Loan defaults', 'Deposit pressure', 'Lower net interest margin', 'Market volatility', 'Economic slowdown', 'Regulatory risk'],
    movementTitle: 'Bank stock movers',
    movementSubtitle: 'Daily movers from real market data.',
    sectorGuideTitle: 'Banking and financial institution sectors',
    newsTitle: 'Bank news',
    newsSubtitle: 'Follow banks, financial institutions, rates, credit, and earnings updates.',
    searchPlaceholder: 'Search news, ticker, bank, or category...',
    filtersLabel: 'Categories',
    showMore: 'Load more',
    showing: 'Showing',
    results: 'news',
    readArticle: 'Read article',
    noLink: 'Link unavailable',
    emptyTitle: 'No news available for this filter',
    emptyHint: 'Try another search or category.',
    errorTitle: 'Unable to load data right now',
    errorBody: 'Real bank news could not be loaded right now.',
    retry: 'Retry',
    featuredTitle: 'Featured bank and financial stocks',
    featuredSubtitle: 'Compact cards based on real available prices without invented financial metrics.',
    details: 'View details',
    unavailable: 'Unavailable',
    priceSource: 'Price source',
    watchlistTitle: 'Bank watchlist',
    watchlistSubtitle: 'Quick filters for financial stocks loaded on this page.',
    opportunityTitle: 'When are bank stocks strong?',
    opportunityPoints: ['Loan and deposit growth', 'Higher net interest margin', 'Stable asset quality', 'Strong economy and labor market', 'Lower credit loss provisions', 'Strong earnings and steady dividends', 'Active capital markets for investment banks'],
    riskCycleTitle: 'When do risks rise?',
    riskCyclePoints: ['Loan defaults rise', 'Deposit and liquidity pressure', 'Yield curve flattens', 'Economy slows', 'IPO and deal activity weakens', 'Investment or unrealized bond losses', 'Regulatory or legal risk'],
    disclaimerTitle: 'Investment notice',
    disclaimerBody: 'This page is for educational and general information only, not a buy or sell recommendation. Bank and financial stocks can be affected by interest rates, asset quality, credit risk, liquidity, regulation, and economic conditions. Do your own research or consult a financial advisor before investing.',
    autoRefresh: 'Auto-refreshes every 5 minutes',
    translated: 'Translated',
    originalLanguage: 'Original language',
    noMore: 'All available news is visible',
    examples: 'Examples',
    viewMore: 'View more',
  },
  fr: {
    title: 'Actualités bancaires',
    subtitle: 'Couverture des banques et institutions financières avec contexte taux, crédit, prêts, dépôts, qualité des actifs et résultats.',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    lastUpdated: 'Dernière mise à jour',
    notUpdated: 'Pas encore actualisé',
    delayed: 'Dernier prix disponible depuis un fournisseur réel',
    liveStatus: 'Dernier prix disponible',
    tickerTitle: 'Bandeau actions bancaires',
    tickerSubtitle: 'Prix réels des banques et institutions financières sélectionnées.',
    tickerEmpty: 'Aucun prix disponible pour le moment',
    snapshotTitle: 'Aperçu du secteur financier',
    snapshotSubtitle: 'Indicateurs financiers et rendements depuis Yahoo Finance et FRED.',
    snapshotEmpty: 'Aucune donnée financière de soutien disponible',
    unit: 'Unité',
    source: 'Source',
    sector: 'Catégorie',
    whatTitle: 'Qu’est-ce qui fait bouger les banques ?',
    whatBody: 'Les banques sont sensibles aux taux, aux prêts, aux dépôts, à la qualité des actifs, au capital et à l’économie.',
    whatPoints: ['Taux et marges', 'Croissance prêts/dépôts', 'Qualité des actifs', 'Commissions et services', 'Résultats et prévisions'],
    metricsTitle: 'Indicateurs bancaires importants',
    metricsBody: 'Indicateurs éducatifs, sans chiffres inventés.',
    metricsRows: ['Marge nette d’intérêt', 'Croissance des prêts', 'Croissance des dépôts', 'Provisions crédit', 'Adéquation du capital', 'Qualité des actifs', 'ROE', 'Ratio d’efficacité'],
    driversTitle: 'Facteurs favorables et risques',
    supportTitle: 'Facteurs favorables',
    supportPoints: ['Marges plus élevées', 'Croissance prêts/dépôts', 'Qualité stable', 'Résultats solides', 'Dividendes et rachats'],
    riskTitle: 'Risques bancaires',
    riskPoints: ['Défauts de crédit', 'Pression sur les dépôts', 'Marge en baisse', 'Volatilité', 'Ralentissement économique', 'Risque réglementaire'],
    movementTitle: 'Mouvements des banques',
    movementSubtitle: 'Mouvements quotidiens issus de données réelles.',
    sectorGuideTitle: 'Secteurs banques et institutions financières',
    newsTitle: 'Actualités bancaires',
    newsSubtitle: 'Suivez banques, institutions financières, taux, crédit et résultats.',
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
    errorBody: 'Les actualités bancaires réelles ne peuvent pas être chargées.',
    retry: 'Réessayer',
    featuredTitle: 'Actions bancaires et financières en vedette',
    featuredSubtitle: 'Cartes basées sur les prix réels disponibles.',
    details: 'Voir détails',
    unavailable: 'Indisponible',
    priceSource: 'Source du prix',
    watchlistTitle: 'Liste banques',
    watchlistSubtitle: 'Filtres rapides pour les actions chargées.',
    opportunityTitle: 'Quand les banques sont fortes ?',
    opportunityPoints: ['Croissance prêts/dépôts', 'Marge nette plus élevée', 'Qualité stable', 'Économie solide', 'Provisions plus faibles', 'Résultats et dividendes solides', 'Marchés de capitaux actifs'],
    riskCycleTitle: 'Quand les risques montent ?',
    riskCyclePoints: ['Défauts en hausse', 'Pression liquidité/dépôts', 'Courbe plus plate', 'Ralentissement', 'Moins de transactions', 'Pertes sur investissements', 'Risques réglementaires'],
    disclaimerTitle: 'Avertissement d’investissement',
    disclaimerBody: 'Cette page est éducative et informative uniquement, pas une recommandation. Les banques sont sensibles aux taux, à la qualité des actifs, au crédit, à la liquidité, à la régulation et à l’économie.',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    translated: 'Traduit',
    originalLanguage: 'Langue originale',
    noMore: 'Toutes les actualités disponibles sont visibles',
    examples: 'Exemples',
    viewMore: 'Voir plus',
  },
} satisfies Record<LangCode, Record<string, string | string[]>>;

const FILTERS: Array<{ id: BankFilterId; label: Record<LangCode, string>; keywords: string[]; sectors: string[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, keywords: [], sectors: [] },
  { id: 'large_banks', label: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, keywords: ['large bank', 'money center bank', 'jpmorgan', 'bank of america', 'wells fargo', 'citigroup'], sectors: ['large_banks'] },
  { id: 'investment_banks', label: { ar: 'البنوك الاستثمارية', en: 'Investment banks', fr: 'Banques d’investissement' }, keywords: ['investment bank', 'capital markets', 'goldman', 'morgan stanley', 'trading revenue', 'advisory'], sectors: ['investment_banks'] },
  { id: 'regional_banks', label: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' }, keywords: ['regional bank', 'u.s. bancorp', 'pnc', 'truist'], sectors: ['regional_banks'] },
  { id: 'asset_management', label: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' }, keywords: ['asset management', 'wealth management', 'blackrock', 'schwab', 'bny mellon'], sectors: ['asset_management'] },
  { id: 'payments', label: { ar: 'المدفوعات والتكنولوجيا المالية', en: 'Payments & fintech', fr: 'Paiements et fintech' }, keywords: ['payments', 'cards', 'transactions', 'visa', 'mastercard', 'american express', 'paypal', 'fintech'], sectors: ['payments'] },
  { id: 'rates', label: { ar: 'أسعار الفائدة', en: 'Interest rates', fr: 'Taux d’intérêt' }, keywords: ['interest rate', 'federal reserve', 'fed', 'treasury yield', 'yield curve', 'net interest margin'], sectors: [] },
  { id: 'loans_deposits', label: { ar: 'القروض والودائع', en: 'Loans & deposits', fr: 'Prêts et dépôts' }, keywords: ['loan growth', 'deposits', 'deposit', 'lending', 'liquidity'], sectors: [] },
  { id: 'asset_quality', label: { ar: 'جودة الأصول', en: 'Asset quality', fr: 'Qualité des actifs' }, keywords: ['credit quality', 'provision', 'charge-off', 'defaults', 'nonperforming'], sectors: [] },
  { id: 'earnings', label: { ar: 'أرباح وتوقعات', en: 'Earnings & guidance', fr: 'Résultats' }, keywords: ['earnings', 'revenue', 'profit', 'guidance', 'quarter'], sectors: [] },
  { id: 'dividends_buybacks', label: { ar: 'توزيعات وإعادة شراء', en: 'Dividends & buybacks', fr: 'Dividendes et rachats' }, keywords: ['dividend', 'buyback', 'share repurchase', 'capital return'], sectors: [] },
  { id: 'analysis', label: { ar: 'تحليلات وتقارير', en: 'Analysis & reports', fr: 'Analyses' }, keywords: ['analysis', 'analyst', 'rating', 'report', 'target', 'upgrade', 'downgrade'], sectors: [] },
];

const SECTOR_GUIDES = [
  {
    id: 'large_banks' as BankFilterId,
    watch: 'large_banks' as WatchlistFilter,
    icon: Landmark,
    symbols: ['JPM', 'BAC', 'WFC', 'C'],
    title: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' },
    body: { ar: 'بنوك ضخمة متعددة الأنشطة تشمل الإقراض والودائع والبطاقات وإدارة الثروات وأسواق المال.', en: 'Large diversified banks across lending, deposits, cards, wealth, and markets.', fr: 'Grandes banques diversifiées.' },
  },
  {
    id: 'investment_banks' as BankFilterId,
    watch: 'investment_banks' as WatchlistFilter,
    icon: LineChart,
    symbols: ['GS', 'MS'],
    title: { ar: 'البنوك الاستثمارية', en: 'Investment banks', fr: 'Banques d’investissement' },
    body: { ar: 'تتأثر بنشاط الطروحات والاندماجات والتداول وإدارة الثروات وأسواق رأس المال.', en: 'Driven by capital markets, advisory, trading, and wealth activity.', fr: 'Sensibles aux marchés de capitaux.' },
  },
  {
    id: 'asset_management' as BankFilterId,
    watch: 'asset_management' as WatchlistFilter,
    icon: WalletCards,
    symbols: ['BLK', 'SCHW', 'BK'],
    title: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' },
    body: { ar: 'شركات تعتمد على الأصول المدارة والتدفقات الاستثمارية والخدمات المؤسسية.', en: 'Companies tied to assets under management, flows, and institutional services.', fr: 'Liées aux encours et flux.' },
  },
  {
    id: 'payments' as BankFilterId,
    watch: 'payments' as WatchlistFilter,
    icon: CreditCard,
    symbols: ['V', 'MA', 'AXP', 'PYPL'],
    title: { ar: 'المدفوعات والتكنولوجيا المالية', en: 'Payments and fintech', fr: 'Paiements et fintech' },
    body: { ar: 'شبكات بطاقات ومدفوعات رقمية تستفيد من حجم الإنفاق والانتقال إلى المدفوعات الإلكترونية.', en: 'Card networks and digital payments linked to spending volumes.', fr: 'Réseaux de paiement et fintech.' },
  },
  {
    id: 'regional_banks' as BankFilterId,
    watch: 'regional_banks' as WatchlistFilter,
    icon: Building2,
    symbols: ['PNC', 'USB', 'TFC'],
    title: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' },
    body: { ar: 'أكثر ارتباطاً بالودائع المحلية والقروض التجارية والعقارية والسيولة.', en: 'More tied to local deposits, commercial lending, real estate, and liquidity.', fr: 'Liées aux dépôts et prêts locaux.' },
  },
  {
    id: 'analysis' as BankFilterId,
    watch: 'movers' as WatchlistFilter,
    icon: BarChart3,
    symbols: ['ICE', 'CME', 'SPGI', 'MCO'],
    title: { ar: 'البورصات ومزودو البيانات المالية', en: 'Exchanges and data providers', fr: 'Bourses et données' },
    body: { ar: 'شركات بورصات ومقاصة وتصنيفات وبيانات مالية مرتبطة بالنشاط السوقي والطلب على المعلومات.', en: 'Exchange, clearing, ratings, and data businesses tied to market activity.', fr: 'Bourses, notation et données.' },
  },
];

const SECTOR_GUIDE_ALIASES: Record<string, number> = {
  large_banks: 0,
  investment_banks: 1,
  asset_management: 2,
  payments: 3,
  regional_banks: 4,
  exchanges_services: 5,
};

const FEATURED_META: Record<string, { sector: Record<LangCode, string>; body: Record<LangCode, string> }> = {
  JPM: { sector: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, body: { ar: 'بنك عالمي متنوع يتأثر بالإقراض والودائع والأسواق وإدارة الثروات.', en: 'Diversified global bank exposed to lending, deposits, markets, and wealth.', fr: 'Banque mondiale diversifiée.' } },
  BAC: { sector: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, body: { ar: 'بنك أمريكي كبير حساس للفائدة والاستهلاك والودائع.', en: 'Large US bank sensitive to rates, consumers, and deposits.', fr: 'Grande banque américaine.' } },
  WFC: { sector: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, body: { ar: 'بنك تجزئة وتجاري يتأثر بجودة القروض ونمو الودائع.', en: 'Retail and commercial bank tied to loan quality and deposits.', fr: 'Banque de détail et commerciale.' } },
  C: { sector: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' }, body: { ar: 'بنك عالمي يتابع المستثمرون إعادة هيكلته ونشاطه الدولي.', en: 'Global bank watched for restructuring and international activity.', fr: 'Banque mondiale en transformation.' } },
  GS: { sector: { ar: 'البنوك الاستثمارية', en: 'Investment banks', fr: 'Banques d’investissement' }, body: { ar: 'يتأثر بأسواق رأس المال والتداول والاستشارات وإدارة الأصول.', en: 'Driven by capital markets, trading, advisory, and asset management.', fr: 'Liée aux marchés de capitaux.' } },
  MS: { sector: { ar: 'البنوك الاستثمارية', en: 'Investment banks', fr: 'Banques d’investissement' }, body: { ar: 'يجمع بين الاستثمار المصرفي وإدارة الثروات والأصول.', en: 'Combines investment banking, wealth, and asset management.', fr: 'Banque et gestion de patrimoine.' } },
  USB: { sector: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' }, body: { ar: 'بنك إقليمي كبير يتأثر بالودائع والقروض والخدمات المصرفية.', en: 'Large regional bank tied to deposits, loans, and banking services.', fr: 'Grande banque régionale.' } },
  PNC: { sector: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' }, body: { ar: 'بنك إقليمي متنوع يتأثر بجودة الائتمان ونشاط الشركات.', en: 'Diversified regional bank affected by credit quality and corporate activity.', fr: 'Banque régionale diversifiée.' } },
  SCHW: { sector: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' }, body: { ar: 'وساطة وإدارة أصول تتأثر بالأصول المدارة وأسعار الفائدة.', en: 'Brokerage and asset platform tied to client assets and rates.', fr: 'Courtier et gestion d’actifs.' } },
  BLK: { sector: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' }, body: { ar: 'مدير أصول عالمي يتأثر بالتدفقات وأداء الأسواق.', en: 'Global asset manager tied to flows and market performance.', fr: 'Gestionnaire mondial.' } },
  AXP: { sector: { ar: 'المدفوعات', en: 'Payments', fr: 'Paiements' }, body: { ar: 'بطاقات وخدمات مالية مرتبطة بالإنفاق وجودة الائتمان.', en: 'Cards and financial services linked to spending and credit quality.', fr: 'Cartes et services financiers.' } },
  V: { sector: { ar: 'المدفوعات', en: 'Payments', fr: 'Paiements' }, body: { ar: 'شبكة مدفوعات عالمية تتأثر بحجم المعاملات والإنفاق.', en: 'Global payment network tied to transaction volume and spending.', fr: 'Réseau de paiement mondial.' } },
  MA: { sector: { ar: 'المدفوعات', en: 'Payments', fr: 'Paiements' }, body: { ar: 'شبكة بطاقات عالمية تستفيد من المدفوعات الرقمية.', en: 'Global card network benefiting from digital payments.', fr: 'Réseau de cartes mondial.' } },
  PYPL: { sector: { ar: 'التكنولوجيا المالية', en: 'Fintech', fr: 'Fintech' }, body: { ar: 'مدفوعات رقمية تتأثر بالمنافسة وحجم المعاملات.', en: 'Digital payments company affected by competition and volume.', fr: 'Paiements numériques.' } },
  ICE: { sector: { ar: 'بورصات وبيانات', en: 'Exchanges & data', fr: 'Bourses et données' }, body: { ar: 'بورصات ومقاصة وبيانات مالية ترتبط بنشاط السوق.', en: 'Exchange, clearing, and data business tied to market activity.', fr: 'Bourse, compensation et données.' } },
  CME: { sector: { ar: 'بورصات وبيانات', en: 'Exchanges & data', fr: 'Bourses et données' }, body: { ar: 'بورصة مشتقات تتأثر بالتقلبات والتحوط وإدارة المخاطر.', en: 'Derivatives exchange tied to volatility, hedging, and risk management.', fr: 'Bourse de dérivés.' } },
  SPGI: { sector: { ar: 'بيانات وتصنيفات', en: 'Data & ratings', fr: 'Données et notation' }, body: { ar: 'مزود بيانات وتصنيفات مالية يتأثر بالطلب على المعلومات والإصدارات.', en: 'Financial data and ratings provider tied to information demand and issuance.', fr: 'Données et notation.' } },
  MCO: { sector: { ar: 'تصنيفات وبيانات', en: 'Ratings & data', fr: 'Notation et données' }, body: { ar: 'تصنيفات ائتمانية وتحليلات تتأثر بإصدارات الدين والنشاط الائتماني.', en: 'Credit ratings and analytics tied to debt issuance and credit activity.', fr: 'Notation et analyses.' } },
};

function localeFor(lang: LangCode) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function arrayText(value: string | string[]) {
  return Array.isArray(value) ? value : [value];
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

function formatSnapshotValue(item: BankingSnapshotItem, locale: string) {
  if (!item.available || typeof item.value !== 'number') return '—';
  const digits = item.unit === '%' ? 2 : item.unit === 'USD' ? 2 : 3;
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(item.value)} ${item.unit}`;
}

function formatPercent(value: number | null | undefined, locale = 'ar-KW') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
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

function textForSearch(item: BankNewsItem) {
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

function itemMatchesSearch(item: BankNewsItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return textForSearch(item).includes(normalized);
}

function itemMatchesFilter(item: BankNewsItem, filterId: BankFilterId) {
  if (filterId === 'all') return true;
  const filter = FILTERS.find(entry => entry.id === filterId);
  if (!filter) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (filter.sectors.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return filter.keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function displayTitle(item: BankNewsItem) {
  return item.title || item.headline || item.titleOriginal || '';
}

function displaySummary(item: BankNewsItem) {
  return item.summary || item.summaryOriginal || '';
}

function categoryLabelForItem(item: BankNewsItem, lang: LangCode) {
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

function BankTicker({ items, loading, error, text, lang, locale }: {
  items: BankTickerItem[];
  loading: boolean;
  error: string;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const displayItems = items.length > 0 ? items : [];
  return (
    <section className={styles.tickerPanel} aria-label={text.tickerTitle as string}>
      <PanelTitle icon={Landmark} title={text.tickerTitle as string} subtitle={text.tickerSubtitle as string} />
      {loading ? (
        <div className={styles.tickerSkeleton}>
          {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
        </div>
      ) : displayItems.length > 0 ? (
        <div className={styles.tickerViewport} dir="ltr">
          <div className={styles.tickerTrack} dir="ltr" style={{ direction: 'ltr' }}>
            {[0, 1, 2, 3].map(setIndex => (
              <div className={styles.tickerSet} dir="ltr" key={setIndex} aria-hidden={setIndex > 0}>
                {displayItems.map(item => {
                  const tone = changeTone(item.changePercent);
                  return (
                    <article className={styles.tickerItem} key={`${item.symbol}-${setIndex}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{sectorLabel(item.sector, lang)}</span>
                        <span dir="ltr">{item.symbol}</span>
                      </div>
                      <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
                      <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
          <span className={styles.tickerStatus}>{text.liveStatus as string}</span>
        </div>
      ) : (
        <div className={styles.inlineState}>
          <AlertTriangle size={18} />
          <span>{error || (text.tickerEmpty as string)}</span>
        </div>
      )}
    </section>
  );
}

function BankMarketSnapshot({ items, loading, error, text, locale }: {
  items: BankingSnapshotItem[];
  loading: boolean;
  error: string;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  return (
    <section className={styles.moversMiniPanel} aria-label={text.snapshotTitle as string}>
      <PanelTitle icon={Gauge} title={text.snapshotTitle as string} subtitle={text.snapshotSubtitle as string} />
      {loading ? (
        <div className={styles.moversMiniGrid}>
          {Array.from({ length: 8 }).map((_, index) => <SkeletonLine key={index} wide />)}
        </div>
      ) : error ? (
        <div className={styles.inlineState}>
          <AlertTriangle size={18} />
          <span>{error || (text.snapshotEmpty as string)}</span>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.inlineState}>
          <span>{text.snapshotEmpty as string}</span>
        </div>
      ) : (
        <div className={styles.moversMiniGrid}>
          {items.map(item => {
            const tone = changeTone(item.changePercent ?? item.change);
            return (
              <article className={styles.metricMiniCard} key={item.symbol}>
                <div>
                  <span dir="ltr">{item.symbol}</span>
                  <h3>{item.nameAr || item.displayName}</h3>
                  <p>{text.unit as string}: {item.unit}</p>
                </div>
                <b dir="ltr">{item.available ? formatSnapshotValue(item, locale) : text.unavailable as string}</b>
                {item.changePercent !== null || item.change !== null ? <em className={styles[tone]} dir="ltr">{item.changePercent !== null ? formatPercent(item.changePercent, locale) : item.change}</em> : null}
                <p>{text.source as string}: {item.source ?? text.unavailable as string}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WhatMovesBankCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={Landmark} title={text.whatTitle as string} />
      <p>{text.whatBody as string}</p>
      <ul>
        {arrayText(text.whatPoints).map(point => (
          <li key={point}><ShieldCheck size={15} />{point}</li>
        ))}
      </ul>
    </article>
  );
}

function BankingMetricsCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={Percent} title={text.metricsTitle as string} subtitle={text.metricsBody as string} />
      <div className={styles.sectorMiniList}>
        {arrayText(text.metricsRows).map((row, index) => {
          const Icon = [Percent, Activity, WalletCards, ShieldAlert, Scale, ShieldCheck, CircleDollarSign, Gauge][index] ?? BarChart3;
          return (
            <div className={styles.sectorMiniRow} key={row}>
              <span><Icon size={17} /></span>
              <div>
                <strong>{row}</strong>
                <p>{text.metricsBody as string}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DriverRiskCard({ text }: { text: typeof TEXT[LangCode] }) {
  return (
    <article className={styles.summaryCard}>
      <PanelTitle icon={Layers3} title={text.driversTitle as string} />
      <div className={styles.comparisonGrid}>
        <div className={styles.defensiveColumn}>
          <strong>{text.supportTitle as string}</strong>
          {arrayText(text.supportPoints).map(point => <span key={point}>{point}</span>)}
        </div>
        <div className={styles.cyclicalColumn}>
          <strong>{text.riskTitle as string}</strong>
          {arrayText(text.riskPoints).map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </article>
  );
}

function MovementCard({ movers, tickerItems, loading, text, lang, locale }: {
  movers: StockCategoryMoverItem[];
  tickerItems: BankTickerItem[];
  loading: boolean;
  text: typeof TEXT[LangCode];
  lang: LangCode;
  locale: string;
}) {
  const tickerBySymbol = new Map(tickerItems.map(item => [item.symbol, item]));
  const quoteRows = tickerItems
    .filter(item => typeof item.changePercent === 'number')
    .slice()
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
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
  const moverRows = movers.map(item => ({ ...item, sourceName: item.name }));
  const moverSymbols = new Set(moverRows.map(item => item.symbol));
  const rows = [...moverRows, ...quoteRows.filter(item => !moverSymbols.has(item.symbol))]
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));

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

function SectorBreakdown({ lang, text, onSelect }: {
  lang: LangCode;
  text: typeof TEXT[LangCode];
  onSelect: (filter: BankFilterId) => void;
}) {
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.sectorGuideTitle as string}>
      <PanelTitle icon={BookOpen} title={text.sectorGuideTitle as string} />
      <div className={styles.sectorGuideGrid}>
        {SECTOR_GUIDES.map(sector => {
          const Icon = sector.icon;
          return (
            <article className={styles.sectorGuideCard} key={`${sector.title.en}-${sector.symbols.join('-')}`}>
              <span className={styles.sectorIcon}><Icon size={21} /></span>
              <h3>{sector.title[lang]}</h3>
              <p>{sector.body[lang]}</p>
              <div className={styles.symbolChips} aria-label={text.examples as string}>
                {sector.symbols.map(symbol => <span key={symbol} dir="ltr">{symbol}</span>)}
              </div>
              <button type="button" onClick={() => onSelect(sector.id)}>
                {text.viewMore as string}
                <ArrowUpRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NewsCard({ item, lang, locale, text }: {
  item: BankNewsItem;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
  const title = displayTitle(item);
  const summary = displaySummary(item);
  const tone = changeTone(item.changePercent);
  return (
    <article className={styles.newsCard}>
      <div className={styles.newsCardTop}>
        <span>{categoryLabelForItem(item, lang)}</span>
        <small><Clock3 size={13} />{relativeTime(item.publishedAt, locale)}</small>
      </div>
      <h3>{title}</h3>
      {summary ? <p>{summary}</p> : null}
      <div className={styles.newsMetaGrid}>
        <span>{text.source as string}: <b>{item.source || text.source as string}</b></span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {typeof item.price === 'number' ? (
          <span className={styles.newsPrice} dir="ltr">{formatMoney(item.price, 'USD', locale)} <em className={styles[tone]}>{formatPercent(item.changePercent, locale)}</em></span>
        ) : null}
        <span>{item.isTranslated ? text.translated as string : text.originalLanguage as string}</span>
      </div>
      <div className={styles.newsFooter}>
        <small><Clock3 size={13} />{formatDateTime(item.publishedAt, locale)}</small>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`${text.readArticle as string}: ${title}`}>
            {text.readArticle as string}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span>{text.noLink as string}</span>
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
  items: BankNewsItem[];
  loading: boolean;
  error: string;
  activeFilter: BankFilterId;
  setActiveFilter: (filter: BankFilterId) => void;
  query: string;
  setQuery: (value: string) => void;
  visibleCount: number;
  setVisibleCount: (updater: number | ((value: number) => number)) => void;
  counts: Record<BankFilterId, number>;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
  retry: () => void;
}) {
  const visible = items.slice(0, visibleCount);
  return (
    <section className={styles.newsPanel} aria-label={text.newsTitle as string}>
      <div className={styles.newsHeader}>
        <PanelTitle icon={Newspaper} title={text.newsTitle as string} subtitle={text.newsSubtitle as string} />
        <div className={styles.newsCount}>
          <span>{text.showing as string}</span>
          <b>{items.length}</b>
          <span>{text.results as string}</span>
        </div>
      </div>
      <div className={styles.newsControls}>
        <label className={styles.searchBox}>
          <Search size={17} />
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
              className={activeFilter === filter.id ? styles.activeFilter : ''}
              onClick={() => setActiveFilter(filter.id)}
              key={filter.id}
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
            <article className={styles.newsSkeletonCard} key={index}>
              <SkeletonLine wide />
              <SkeletonLine wide />
              <SkeletonLine />
            </article>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <AlertTriangle size={22} />
          <strong>{text.errorTitle as string}</strong>
          <p>{error || text.errorBody as string}</p>
          <button type="button" onClick={retry}>
            <RefreshCcw size={15} />
            {text.retry as string}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.emptyState}>
          <Newspaper size={26} />
          <strong>{text.emptyTitle as string}</strong>
          <p>{text.emptyHint as string}</p>
        </div>
      ) : (
        <>
          <div className={styles.newsGrid}>
            {visible.map(item => <NewsCard key={item.id} item={item} lang={lang} locale={locale} text={text} />)}
          </div>
          <div className={styles.loadMoreWrap}>
            {visible.length < items.length ? (
              <button type="button" onClick={() => setVisibleCount(value => value + NEWS_PAGE_SIZE)}>
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
  items: BankTickerItem[];
  loading: boolean;
  lang: LangCode;
  locale: string;
  text: typeof TEXT[LangCode];
}) {
  const bySymbol = new Map(items.map(item => [item.symbol, item]));
  return (
    <section className={styles.sectorGuidePanel} aria-label={text.featuredTitle as string}>
      <PanelTitle icon={BriefcaseBusiness} title={text.featuredTitle as string} subtitle={text.featuredSubtitle as string} />
      <div className={styles.featuredGrid}>
        {loading ? Array.from({ length: 8 }).map((_, index) => (
          <article className={styles.featuredCard} key={index}><SkeletonLine wide /><SkeletonLine /><SkeletonLine /></article>
        )) : FEATURED_SYMBOLS.map(symbol => {
          const quote = bySymbol.get(symbol);
          const tone = changeTone(quote?.changePercent);
          return (
            <article className={styles.featuredCard} key={symbol}>
              <span className={styles.sectorIcon}><Sparkles size={19} /></span>
              <h3>{quote?.name ?? FEATURED_META[symbol]?.sector[lang] ?? symbol}</h3>
              <div className={styles.symbolChips}>
                <span dir="ltr">{symbol}</span>
                <span>{FEATURED_META[symbol]?.sector[lang] ?? text.unavailable as string}</span>
              </div>
              <p>{FEATURED_META[symbol]?.body[lang] ?? text.unavailable as string}</p>
              {quote ? (
                <div className={styles.featuredMetrics}>
                  <b dir="ltr">{formatMoney(quote.price, quote.currency, locale)}</b>
                  <em className={styles[tone]} dir="ltr">{formatPercent(quote.changePercent, locale)}</em>
                  <span>{text.sector as string}: <b>{sectorLabel(quote.sector, lang)}</b></span>
                  <p>{text.priceSource as string}: {quote.source}</p>
                </div>
              ) : (
                <p>{text.unavailable as string}</p>
              )}
              <button type="button">
                {text.details as string}
                <ArrowUpRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BankWatchlist({ items, active, setActive, lang, text, locale }: {
  items: BankTickerItem[];
  active: WatchlistFilter;
  setActive: (filter: WatchlistFilter) => void;
  lang: LangCode;
  text: typeof TEXT[LangCode];
  locale: string;
}) {
  const filters: Array<{ id: WatchlistFilter; label: Record<LangCode, string> }> = [
    { id: 'large_banks', label: { ar: 'البنوك الكبرى', en: 'Large banks', fr: 'Grandes banques' } },
    { id: 'investment_banks', label: { ar: 'البنوك الاستثمارية', en: 'Investment banks', fr: 'Banques d’investissement' } },
    { id: 'regional_banks', label: { ar: 'البنوك الإقليمية', en: 'Regional banks', fr: 'Banques régionales' } },
    { id: 'asset_management', label: { ar: 'إدارة الأصول', en: 'Asset management', fr: 'Gestion d’actifs' } },
    { id: 'payments', label: { ar: 'المدفوعات', en: 'Payments', fr: 'Paiements' } },
    { id: 'movers', label: { ar: 'الأعلى حركة', en: 'Top movers', fr: 'Plus actifs' } },
  ];
  const visible = active === 'movers'
    ? items.slice().sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)).slice(0, 6)
    : items.filter(item => item.sector === active);

  return (
    <section className={styles.moversMiniPanel} aria-label={text.watchlistTitle as string}>
      <PanelTitle icon={WalletCards} title={text.watchlistTitle as string} subtitle={text.watchlistSubtitle as string} />
      <div className={styles.filterScroller}>
        {filters.map(filter => (
          <button
            type="button"
            className={active === filter.id ? styles.activeFilter : ''}
            onClick={() => setActive(filter.id)}
            key={filter.id}
          >
            {filter.label[lang]}
            <span>{filter.id === 'movers' ? items.length : items.filter(item => item.sector === filter.id).length}</span>
          </button>
        ))}
      </div>
      {visible.length > 0 ? (
        <div className={styles.moversMiniGrid}>
          {visible.map(item => (
            <article className={styles.metricMiniCard} key={item.symbol}>
              <div>
                <span dir="ltr">{item.symbol}</span>
                <h3>{item.name}</h3>
                <p>{sectorLabel(item.sector, lang)}</p>
              </div>
              <b dir="ltr">{formatMoney(item.price, item.currency, locale)}</b>
              <em className={styles[changeTone(item.changePercent)]} dir="ltr">{formatPercent(item.changePercent, locale)}</em>
            </article>
          ))}
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
          <strong>{text.riskCycleTitle as string}</strong>
          {arrayText(text.riskCyclePoints).map(point => <span key={point}>{point}</span>)}
        </div>
      </div>
    </section>
  );
}

export function BankNewsPage() {
  const { dir, lang } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const text = TEXT[activeLang];
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<BankTickerItem[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<BankingSnapshotItem[]>([]);
  const [newsItems, setNewsItems] = useState<BankNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<BankFilterId>('all');
  const [activeWatchlist, setActiveWatchlist] = useState<WatchlistFilter>('large_banks');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');
    setSnapshotError('');

    const [tickerResult, snapshotResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<BankTickerResponse>('/api/banking-stocks/ticker'),
      fetchJson<BankingSnapshotResponse>('/api/market/banking/snapshot'),
      fetchJson<BankNewsResponse>(`/api/banking-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/banking-stocks/movers?limit=5'),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
    } else {
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(text.tickerEmpty as string);
    }

    if (snapshotResult.status === 'fulfilled' && snapshotResult.value.ok) {
      setSnapshotItems(snapshotResult.value.items);
      setSnapshotUpdatedAt(snapshotResult.value.updated_at);
    } else {
      setSnapshotItems([]);
      setSnapshotUpdatedAt('');
      setSnapshotError(text.snapshotEmpty as string);
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
  }, [activeLang, text.errorBody, text.snapshotEmpty, text.tickerEmpty]);

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
    () => newestTimestamp([tickerUpdatedAt, snapshotUpdatedAt, newsUpdatedAt, moversUpdatedAt]),
    [moversUpdatedAt, newsUpdatedAt, snapshotUpdatedAt, tickerUpdatedAt],
  );

  const searchableItems = useMemo(
    () => newsItems.filter(item => itemMatchesSearch(item, debouncedQuery)),
    [debouncedQuery, newsItems],
  );

  const counts = useMemo(() => {
    return FILTERS.reduce((acc, filter) => {
      acc[filter.id] = searchableItems.filter(item => itemMatchesFilter(item, filter.id)).length;
      return acc;
    }, {} as Record<BankFilterId, number>);
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
              <span className={styles.eyebrow}><Landmark size={15} />{text.delayed as string}</span>
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

          <BankTicker items={tickerItems} loading={loading} error={marketError} text={text} lang={activeLang} locale={locale} />

          <BankMarketSnapshot items={snapshotItems} loading={loading} error={snapshotError} text={text} locale={locale} />

          <section className={styles.summaryGrid} aria-label={text.metricsTitle as string}>
            <WhatMovesBankCard text={text} />
            <BankingMetricsCard text={text} />
            <DriverRiskCard text={text} />
            <MovementCard movers={topMoverRows} tickerItems={tickerItems} loading={loading} text={text} lang={activeLang} locale={locale} />
          </section>

          <SectorBreakdown
            lang={activeLang}
            text={text}
            onSelect={filter => {
              setActiveFilter(filter);
              setVisibleCount(NEWS_PAGE_SIZE);
            }}
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

          <BankWatchlist
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

export default BankNewsPage;
