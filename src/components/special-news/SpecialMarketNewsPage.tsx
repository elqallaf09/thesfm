'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  HeartPulse,
  Landmark,
  Newspaper,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { StockTickerStrip, type StockTickerStripItem } from '@/components/market/StockTickerStrip';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import type { NewsPageBackgroundCategory } from '@/lib/news/pageBackground';
import styles from './SpecialMarketNewsPage.module.css';

export type SpecialNewsTopic =
  | 'federal-reserve'
  | 'healthcare-stocks'
  | 'new-stocks'
  | 'stocks-under-1'
  | 'metals-news'
  | 'earnings-news'
  | 'analyst-ratings-news'
  | 'mergers-acquisitions-news'
  | 'unusual-moves-news';

type Lang = 'ar' | 'en' | 'fr';

type SpecialNewsItem = {
  id: string;
  title?: string | null;
  headline?: string | null;
  summary?: string | null;
  titleOriginal?: string | null;
  source?: string | null;
  sourceName?: string | null;
  isOfficial?: boolean;
  publishedAt?: string | null;
  updatedAt?: string | null;
  url?: string | null;
  symbols?: string[];
  companyNames?: string[];
  sectors?: string[];
  eventType?: string | null;
  verificationStatus?: string | null;
  independentSourceCount?: number | null;
  importanceScore?: number | null;
  whyItMatters?: string | null;
  ticker?: string | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  priceVerified?: boolean;
};

type ApiTickerItem = {
  symbol: string;
  name?: string | null;
  assetType?: 'stock' | 'etf' | 'unknown';
  currency?: string | null;
  price?: number | null;
  changePercent?: number | null;
  source?: string | null;
  available?: boolean;
  meta?: string | null;
};

type SpecialNewsResponse = {
  ok?: boolean;
  success?: boolean;
  code?: string | null;
  topic?: SpecialNewsTopic;
  items?: SpecialNewsItem[];
  tickerItems?: ApiTickerItem[];
  updatedAt?: string | null;
  lastSuccessfulUpdate?: string | null;
  partialFailure?: boolean;
  liveUpdatesAvailable?: boolean;
  storedFallbackUsed?: boolean;
  translationEnabled?: boolean;
  priceRule?: {
    currency?: string;
    operator?: string;
    threshold?: number;
    requiresVerifiedQuote?: boolean;
  } | null;
};

type TopicCopy = {
  title: string;
  subtitle: string;
  badge: string;
  method: string;
  empty: string;
  emptyHint: string;
  search: string;
  tickerLabel: string;
};

type CommonCopy = {
  refresh: string;
  refreshing: string;
  official: string;
  verified: string;
  delayed: string;
  updated: string;
  read: string;
  noSummary: string;
  loadError: string;
  stale: string;
  partial: string;
  results: string;
  priceRule: string;
  unavailable: string;
};

const TOPIC_COPY: Record<SpecialNewsTopic, Record<Lang, TopicCopy>> = {
  'federal-reserve': {
    ar: {
      title: 'أخبار الفيدرالي الأمريكي',
      subtitle: 'قرارات الفائدة واجتماعات FOMC وتصريحات مسؤولي الاحتياطي الفيدرالي والبيانات المؤثرة في السياسة النقدية.',
      badge: 'السياسة النقدية الأمريكية',
      method: 'تُجمع الأخبار من مصادر مالية ورسمية متعددة مع إعطاء أولوية للمصادر الرسمية. شريط السوق يعرض مؤشرات وصناديق مرتبطة بحساسية السوق للفائدة والدولار.',
      empty: 'لا توجد أخبار حديثة مطابقة للفيدرالي الأمريكي حاليًا.',
      emptyHint: 'حدّث الصفحة لاحقًا؛ لا يتم إدراج أخبار غير مرتبطة فقط لملء الصفحة.',
      search: 'ابحث في أخبار الفيدرالي...',
      tickerLabel: 'نبض السوق حول الفيدرالي',
    },
    en: {
      title: 'Federal Reserve News',
      subtitle: 'Rate decisions, FOMC meetings, Fed officials, and macro data tied to US monetary policy.',
      badge: 'US monetary policy',
      method: 'News is aggregated from multiple financial and official sources, prioritizing official coverage. The ticker shows liquid market proxies sensitive to rates and the dollar.',
      empty: 'No recent Federal Reserve news matches are available right now.',
      emptyHint: 'Refresh later; unrelated stories are not inserted just to fill the page.',
      search: 'Search Federal Reserve news...',
      tickerLabel: 'Fed market pulse',
    },
    fr: {
      title: 'Actualités de la Réserve fédérale',
      subtitle: 'Décisions de taux, réunions du FOMC, responsables de la Fed et données macro liées à la politique monétaire américaine.',
      badge: 'Politique monétaire américaine',
      method: 'Les actualités proviennent de plusieurs sources financières et officielles. Le bandeau affiche des instruments liquides sensibles aux taux et au dollar.',
      empty: 'Aucune actualité récente correspondante sur la Réserve fédérale.',
      emptyHint: 'Actualisez plus tard ; aucun article hors sujet ne sera ajouté pour remplir la page.',
      search: 'Rechercher dans les actualités de la Fed...',
      tickerLabel: 'Pouls de marché autour de la Fed',
    },
  },
  'healthcare-stocks': {
    ar: {
      title: 'أخبار الأسهم الطبية',
      subtitle: 'أخبار شركات الرعاية الصحية والأدوية والتقنية الطبية والبايوتكنولوجي، بما فيها FDA والتجارب السريرية.',
      badge: 'الرعاية الصحية والبايوتكنولوجي',
      method: 'يتم ربط الخبر بشركة أو رمز سوقي عندما تتوفر علاقة واضحة، مع تجنب تحويل الأخبار الصحية العامة إلى أخبار أسهم.',
      empty: 'لا توجد أخبار أسهم طبية مطابقة حاليًا.',
      emptyHint: 'جرّب التحديث لاحقًا أو ابحث باسم شركة أو رمز.',
      search: 'ابحث باسم شركة، رمز، دواء أو FDA...',
      tickerLabel: 'أسعار الأسهم الطبية في الأخبار',
    },
    en: {
      title: 'Healthcare Stocks News',
      subtitle: 'Healthcare, pharma, medtech, and biotech company news, including FDA actions and clinical trials.',
      badge: 'Healthcare & biotech',
      method: 'Stories are tied to a company or ticker when a clear market link exists; general health stories are not treated as stock news.',
      empty: 'No matching healthcare-stock news is available right now.',
      emptyHint: 'Refresh later or search by company, ticker, drug, or FDA topic.',
      search: 'Search company, ticker, drug, or FDA...',
      tickerLabel: 'Healthcare stocks in the news',
    },
    fr: {
      title: 'Actualités des actions santé',
      subtitle: 'Actualités santé, pharma, medtech et biotech, y compris décisions FDA et essais cliniques.',
      badge: 'Santé et biotech',
      method: 'Les articles sont reliés à une société ou un symbole lorsqu’un lien de marché clair existe.',
      empty: 'Aucune actualité correspondante sur les actions santé actuellement.',
      emptyHint: 'Actualisez plus tard ou recherchez une société, un symbole, un médicament ou la FDA.',
      search: 'Rechercher société, symbole, médicament ou FDA...',
      tickerLabel: 'Actions santé dans l’actualité',
    },
  },
  'new-stocks': {
    ar: {
      title: 'أخبار الأسهم الجديدة',
      subtitle: 'متابعة الطروحات العامة IPO والإدراجات الجديدة والإدراج المباشر وبدايات التداول في الأسواق الأمريكية.',
      badge: 'IPO والإدراجات الجديدة',
      method: 'المقصود بالأسهم الجديدة الشركات حديثة الإدراج والطروحات الجديدة، وليس قائمة أسهم مقترحة للشراء.',
      empty: 'لا توجد أخبار إدراجات أو طروحات جديدة مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند وجود طرح أو إدراج أو بداية تداول موثقة.',
      search: 'ابحث عن IPO أو شركة حديثة الإدراج...',
      tickerLabel: 'أسعار أحدث الأسهم المذكورة',
    },
    en: {
      title: 'New Stocks News',
      subtitle: 'Track IPOs, newly listed companies, direct listings, and US market trading debuts.',
      badge: 'IPOs & new listings',
      method: '“New stocks” means newly listed companies and IPOs here; it is not a list of stocks suggested for purchase.',
      empty: 'No matching IPO or new-listing news is available right now.',
      emptyHint: 'Stories appear when a documented offering, listing, or trading debut is available.',
      search: 'Search IPOs or newly listed companies...',
      tickerLabel: 'Newest listed stocks in the news',
    },
    fr: {
      title: 'Actualités des nouvelles actions',
      subtitle: 'Suivez les IPO, nouvelles cotations, cotations directes et débuts de négociation aux États-Unis.',
      badge: 'IPO et nouvelles cotations',
      method: '« Nouvelles actions » désigne les sociétés récemment cotées et les IPO, pas une liste de recommandations.',
      empty: 'Aucune actualité correspondante sur une IPO ou une nouvelle cotation.',
      emptyHint: 'Les articles apparaissent lorsqu’une offre ou une cotation documentée est disponible.',
      search: 'Rechercher une IPO ou une société récemment cotée...',
      tickerLabel: 'Nouvelles actions dans l’actualité',
    },
  },
  'stocks-under-1': {
    ar: {
      title: 'أخبار أسهم أقل من 1$',
      subtitle: 'أخبار الأسهم الأمريكية التي يثبت السعر السوقي المتاح أنها أقل من 1 دولار وقت التحديث.',
      badge: 'أسهم أقل من 1$ — تحقق سعري',
      method: 'هذا تصنيف متغير؛ لا يدخل السهم إلا إذا توفر سعر صالح ومتحقق وكان أقل من 1$. السعر غير المتحقق يُستبعد.',
      empty: 'لا توجد أخبار مطابقة لأسهم متحقق من سعرها تحت 1$ حاليًا.',
      emptyHint: 'السعر يتغير وقد يدخل السهم أو يخرج من التصنيف عند كل تحديث.',
      search: 'ابحث باسم الشركة أو الرمز...',
      tickerLabel: 'أسعار الأسهم المتحقق أنها تحت 1$',
    },
    en: {
      title: 'Stocks Under $1 News',
      subtitle: 'News for US stocks whose available verified market quote is below $1 at refresh time.',
      badge: 'Under $1 — price verified',
      method: 'This is a dynamic category: a stock is included only when a valid available quote verifies a price below $1.',
      empty: 'No matching news for price-verified stocks under $1 is available right now.',
      emptyHint: 'Prices move continuously, so symbols can enter or leave this category on each refresh.',
      search: 'Search company or ticker...',
      tickerLabel: 'Verified stocks under $1',
    },
    fr: {
      title: 'Actualités des actions sous 1 $',
      subtitle: 'Actualités des actions américaines dont le cours disponible et vérifié est inférieur à 1 $.',
      badge: 'Sous 1 $ — prix vérifié',
      method: 'Catégorie dynamique : une action n’est incluse que si un cours valide confirme un prix inférieur à 1 $.',
      empty: 'Aucune actualité correspondante pour une action vérifiée sous 1 $ actuellement.',
      emptyHint: 'Les cours évoluent ; les symboles peuvent entrer ou sortir de cette catégorie.',
      search: 'Rechercher société ou symbole...',
      tickerLabel: 'Actions vérifiées sous 1 $',
    },
  },
  'metals-news': {
    ar: {
      title: 'أخبار المعادن',
      subtitle: 'أخبار الذهب والفضة والنحاس والبلاتين والبلاديوم مع أسعار سوقية متاحة في شريط متحرك.',
      badge: 'المعادن الثمينة والصناعية',
      method: 'نربط أخبار المعادن بتحركات الأسعار والعرض والطلب والاقتصاد والجغرافيا السياسية. الأسعار قد تكون متأخرة حسب المزود.',
      empty: 'لا توجد أخبار معادن مطابقة حاليًا.',
      emptyHint: 'حدّث لاحقًا؛ لا يتم إنشاء أخبار أو أسعار وهمية عند غياب البيانات.',
      search: 'ابحث عن الذهب، الفضة، النحاس، البلاتين...',
      tickerLabel: 'أسعار المعادن',
    },
    en: {
      title: 'Metals News',
      subtitle: 'Gold, silver, copper, platinum, and palladium news with an available-market-data ticker.',
      badge: 'Precious & industrial metals',
      method: 'Metal news is connected to price moves, supply, demand, macroeconomics, and geopolitics. Quotes may be delayed by the provider.',
      empty: 'No matching metals news is available right now.',
      emptyHint: 'Refresh later; the page does not invent stories or prices when data is unavailable.',
      search: 'Search gold, silver, copper, platinum...',
      tickerLabel: 'Metals prices',
    },
    fr: {
      title: 'Actualités des métaux',
      subtitle: 'Actualités de l’or, de l’argent, du cuivre, du platine et du palladium avec un bandeau de cours.',
      badge: 'Métaux précieux et industriels',
      method: 'Les actualités sont reliées aux prix, à l’offre, à la demande, à la macroéconomie et à la géopolitique.',
      empty: 'Aucune actualité correspondante sur les métaux actuellement.',
      emptyHint: 'Actualisez plus tard ; aucun article ni cours fictif n’est créé lorsque les données manquent.',
      search: 'Rechercher or, argent, cuivre, platine...',
      tickerLabel: 'Cours des métaux',
    },
  },
  'earnings-news': {
    ar: {
      title: 'أخبار الأرباح والنتائج',
      subtitle: 'نتائج الشركات الفصلية والإيرادات وEPS والتوجيهات المستقبلية وهوامش الربح والمفاجآت مقارنة بالتوقعات.',
      badge: 'Earnings Intelligence',
      method: 'تُجمع أخبار النتائج وتُربط بالشركات والرموز عندما تتوفر بيانات كافية، مع عرض السعر ونسبة التغير من بيانات سوق فعلية.',
      empty: 'لا توجد أخبار أرباح مطابقة حاليًا.',
      emptyHint: 'تظهر النتائج عند نشر تقارير أرباح أو توجيهات جديدة من المصادر المتاحة.',
      search: 'ابحث عن شركة، رمز، أرباح أو EPS...',
      tickerLabel: 'أسعار الشركات في أخبار الأرباح',
    },
    en: {
      title: 'Earnings & Results News',
      subtitle: 'Quarterly results, revenue, EPS, guidance, margins, and reported beats or misses versus expectations.',
      badge: 'Earnings Intelligence',
      method: 'Earnings stories are connected to companies and tickers when evidence is available, with real market quotes and percentage moves shown in the ticker.',
      empty: 'No matching earnings news is available right now.',
      emptyHint: 'Results appear as companies publish earnings or guidance through available sources.',
      search: 'Search company, ticker, earnings, or EPS...',
      tickerLabel: 'Stocks in earnings news',
    },
    fr: {
      title: 'Actualités des résultats',
      subtitle: 'Résultats trimestriels, chiffre d’affaires, BPA, prévisions, marges et écarts par rapport aux attentes.',
      badge: 'Earnings Intelligence',
      method: 'Les résultats sont reliés aux sociétés et symboles lorsque les données le permettent, avec cours et variations réelles.',
      empty: 'Aucune actualité de résultats correspondante actuellement.',
      emptyHint: 'Les résultats apparaissent lors de nouvelles publications ou prévisions.',
      search: 'Rechercher société, symbole, résultats ou BPA...',
      tickerLabel: 'Actions dans les actualités de résultats',
    },
  },
  'analyst-ratings-news': {
    ar: {
      title: 'أخبار المحللين',
      subtitle: 'رفع وخفض التوصيات وتغييرات السعر المستهدف وبدء التغطية وتحديثات تقييمات بيوت الأبحاث.',
      badge: 'Analyst Intelligence',
      method: 'الصفحة تعرض أخبار تغييرات تقييمات المحللين كمعلومة سوقية موثقة، ولا تحول التقييم الخارجي إلى توصية من SFM.',
      empty: 'لا توجد أخبار محللين مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر ترقية أو خفض أو تغيير سعر مستهدف من مصدر متاح.',
      search: 'ابحث عن شركة، رمز، ترقية أو سعر مستهدف...',
      tickerLabel: 'أسعار الأسهم في أخبار المحللين',
    },
    en: {
      title: 'Analyst Ratings News',
      subtitle: 'Upgrades, downgrades, price-target changes, initiated coverage, and research-rating updates.',
      badge: 'Analyst Intelligence',
      method: 'The page reports documented analyst-rating changes as market information; external ratings are not converted into SFM recommendations.',
      empty: 'No matching analyst-rating news is available right now.',
      emptyHint: 'Stories appear when an available source reports a rating or price-target change.',
      search: 'Search company, ticker, upgrade, or price target...',
      tickerLabel: 'Stocks in analyst news',
    },
    fr: {
      title: 'Actualités des analystes',
      subtitle: 'Relèvements, abaissements, objectifs de cours, débuts de couverture et changements de notation.',
      badge: 'Analyst Intelligence',
      method: 'La page rapporte les changements de notation documentés comme information de marché, sans les transformer en recommandations SFM.',
      empty: 'Aucune actualité d’analystes correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lors d’un changement de notation ou d’objectif de cours.',
      search: 'Rechercher société, symbole, relèvement ou objectif...',
      tickerLabel: 'Actions dans les actualités des analystes',
    },
  },
  'mergers-acquisitions-news': {
    ar: {
      title: 'أخبار الاندماجات والاستحواذات',
      subtitle: 'صفقات M&A وعروض الاستحواذ والاندماجات وعمليات الشراء والصفقات الاستراتيجية المؤثرة على الشركات المدرجة.',
      badge: 'M&A Intelligence',
      method: 'تُعرض الصفقات والأطراف المرتبطة بها من الأخبار الموثقة، مع أسعار الرموز المتاحة ونسبة تغيرها من السوق.',
      empty: 'لا توجد أخبار اندماجات أو استحواذات مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عندما تتوفر صفقة أو عرض استحواذ أو اندماج موثق.',
      search: 'ابحث عن شركة، صفقة، اندماج أو استحواذ...',
      tickerLabel: 'أسعار الشركات المرتبطة بصفقات M&A',
    },
    en: {
      title: 'Mergers & Acquisitions News',
      subtitle: 'M&A deals, takeover offers, mergers, buyouts, and strategic transactions affecting listed companies.',
      badge: 'M&A Intelligence',
      method: 'Documented deals and related parties are surfaced with available market quotes and percentage moves for linked tickers.',
      empty: 'No matching merger or acquisition news is available right now.',
      emptyHint: 'Stories appear when a documented merger, acquisition, or takeover offer is available.',
      search: 'Search company, deal, merger, or acquisition...',
      tickerLabel: 'Stocks linked to M&A news',
    },
    fr: {
      title: 'Actualités fusions-acquisitions',
      subtitle: 'Fusions, acquisitions, offres de rachat et transactions stratégiques concernant des sociétés cotées.',
      badge: 'M&A Intelligence',
      method: 'Les transactions documentées sont affichées avec les cours disponibles et leurs variations pour les symboles liés.',
      empty: 'Aucune actualité de fusion-acquisition correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une transaction documentée est disponible.',
      search: 'Rechercher société, opération, fusion ou acquisition...',
      tickerLabel: 'Actions liées aux actualités M&A',
    },
  },
  'unusual-moves-news': {
    ar: {
      title: 'التحركات غير العادية',
      subtitle: 'أخبار القفزات والهبوطات القوية والتذبذب الاستثنائي وأحجام التداول غير المعتادة وإيقافات التداول المرتبطة بخبر.',
      badge: 'Market Move Intelligence',
      method: 'يرتب الشريط الرموز المرتبطة بالأخبار حسب أكبر نسبة تغير يومية متاحة، بدون إنشاء إشارات تداول أو أرقام تقديرية.',
      empty: 'لا توجد تحركات غير عادية مرتبطة بأخبار مطابقة حاليًا.',
      emptyHint: 'تظهر النتائج عند وجود حركة سوقية بارزة مرتبطة بخبر من المصادر المتاحة.',
      search: 'ابحث عن سهم، قفزة، هبوط أو حجم تداول...',
      tickerLabel: 'أقوى التحركات المرتبطة بالأخبار',
    },
    en: {
      title: 'Unusual Market Moves',
      subtitle: 'News-linked surges, plunges, exceptional volatility, unusual volume, gaps, and trading halts.',
      badge: 'Market Move Intelligence',
      method: 'The ticker orders news-linked symbols by the largest available daily percentage move. No synthetic prices or trading signals are created.',
      empty: 'No matching news-linked unusual moves are available right now.',
      emptyHint: 'Results appear when a notable market move is connected to news from available sources.',
      search: 'Search ticker, surge, plunge, or unusual volume...',
      tickerLabel: 'Largest news-linked moves',
    },
    fr: {
      title: 'Mouvements de marché inhabituels',
      subtitle: 'Hausses et baisses marquées, volatilité exceptionnelle, volumes inhabituels, gaps et suspensions liés à l’actualité.',
      badge: 'Market Move Intelligence',
      method: 'Le bandeau classe les symboles liés aux actualités selon la plus forte variation quotidienne disponible, sans prix synthétiques ni signaux de trading.',
      empty: 'Aucun mouvement inhabituel lié à l’actualité n’est disponible actuellement.',
      emptyHint: 'Les résultats apparaissent lorsqu’un mouvement notable est relié à une actualité disponible.',
      search: 'Rechercher symbole, hausse, baisse ou volume inhabituel...',
      tickerLabel: 'Plus forts mouvements liés aux actualités',
    },
  },
};

const COMMON_COPY: Record<Lang, CommonCopy> = {
  ar: {
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث...',
    official: 'مصدر رسمي',
    verified: 'سعر متحقق',
    delayed: 'السعر قد يكون متأخرًا',
    updated: 'آخر تحديث',
    read: 'فتح الخبر الأصلي',
    noSummary: 'لا يتوفر ملخص إضافي لهذا الخبر.',
    loadError: 'تعذر تحميل الأخبار من المصادر حاليًا.',
    stale: 'تعذر التحديث الآن؛ يتم عرض آخر نتائج ناجحة في هذه الجلسة.',
    partial: 'بعض مصادر الأخبار غير متاحة حاليًا؛ النتائج المعروضة من المصادر التي استجابت.',
    results: 'نتيجة',
    priceRule: 'يظهر فقط السهم الذي تم التحقق من أن سعره الحالي المتاح أقل من 1$.',
    unavailable: 'غير متاح',
  },
  en: {
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    official: 'Official source',
    verified: 'Price verified',
    delayed: 'Quote may be delayed',
    updated: 'Last updated',
    read: 'Open original story',
    noSummary: 'No additional summary is available for this story.',
    loadError: 'News could not be loaded from the providers right now.',
    stale: 'Refresh failed; showing the last successful results from this session.',
    partial: 'Some news providers are unavailable; results are from providers that responded.',
    results: 'results',
    priceRule: 'Only stocks with an available verified current quote below $1 are shown.',
    unavailable: 'Unavailable',
  },
  fr: {
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    official: 'Source officielle',
    verified: 'Prix vérifié',
    delayed: 'Le cours peut être différé',
    updated: 'Dernière mise à jour',
    read: 'Ouvrir l’article original',
    noSummary: 'Aucun résumé supplémentaire n’est disponible.',
    loadError: 'Impossible de charger les actualités depuis les sources actuellement.',
    stale: 'Échec de l’actualisation ; les derniers résultats réussis de cette session restent affichés.',
    partial: 'Certaines sources sont indisponibles ; les résultats proviennent des sources ayant répondu.',
    results: 'résultats',
    priceRule: 'Seules les actions dont le cours disponible et vérifié est inférieur à 1 $ sont affichées.',
    unavailable: 'Indisponible',
  },
};

const BACKGROUNDS: Record<SpecialNewsTopic, NewsPageBackgroundCategory> = {
  'federal-reserve': 'banking',
  'healthcare-stocks': 'healthcare',
  'new-stocks': 'growth',
  'stocks-under-1': 'cyclical',
  'metals-news': 'high-income',
  'earnings-news': 'dividend',
  'analyst-ratings-news': 'tech',
  'mergers-acquisitions-news': 'growth',
  'unusual-moves-news': 'cyclical',
};

const ICONS = {
  'federal-reserve': Landmark,
  'healthcare-stocks': HeartPulse,
  'new-stocks': Sparkles,
  'stocks-under-1': CircleDollarSign,
  'metals-news': CircleDollarSign,
  'earnings-news': BarChart3,
  'analyst-ratings-news': Radar,
  'mergers-acquisitions-news': BriefcaseBusiness,
  'unusual-moves-news': TrendingUp,
} as const;

function normalizeLang(value: string): Lang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function localeFor(lang: Lang) {
  return lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

function formattedDate(value: string | null | undefined, lang: Lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value < 1 ? value.toFixed(4) : value.toFixed(2);
}

function formatChange(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function SpecialMarketNewsPage({ topic }: { topic: SpecialNewsTopic }) {
  const { lang: rawLang, dir } = useLanguage();
  const lang = normalizeLang(rawLang);
  const copy = TOPIC_COPY[topic][lang];
  const common = COMMON_COPY[lang];
  const TopicIcon = ICONS[topic];

  const [items, setItems] = useState<SpecialNewsItem[]>([]);
  const [tickerItems, setTickerItems] = useState<ApiTickerItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partialFailure, setPartialFailure] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrent = () => activeRequest.current === controller && !controller.signal.aborted;
    const newsSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const loadTicker = async (symbols: string[] = []) => {
      try {
        const params = new URLSearchParams({ topic, lang, part: 'ticker' });
        if (symbols.length) params.set('symbols', symbols.join(','));
        const response = await fetch(`/api/market/special-news?${params}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
          headers: { accept: 'application/json' },
        });
        if (!response.ok) return;
        const payload = await response.json() as SpecialNewsResponse;
        if (isCurrent() && payload.tickerItems?.length) setTickerItems(payload.tickerItems);
      } catch { /* A quote outage must not hide the articles or previous quotes. */ }
    };
    const fixedTicker = ['federal-reserve', 'healthcare-stocks', 'metals-news'].includes(topic);
    if (fixedTicker) void loadTicker();

    try {
      const params = new URLSearchParams({ topic, lang });
      if (forceRefresh) params.set('refresh', '1');
      const response = await fetch(`/api/market/special-news?${params}`, {
        signal: newsSignal, headers: { accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({})) as SpecialNewsResponse;
      if (!response.ok || payload.success === false) throw new Error(payload.code || `http_${response.status}`);
      if (!isCurrent()) return;
      const nextItems = dedupeNewsItems(payload.items ?? []);
      startTransition(() => setItems(nextItems));
      setPartialFailure(Boolean(payload.partialFailure));
      setLastUpdated(payload.updatedAt ?? payload.lastSuccessfulUpdate ?? null);
      if (!fixedTicker) {
        if (payload.tickerItems?.length) setTickerItems(payload.tickerItems);
        const symbols = [...new Set(nextItems.flatMap(item => item.symbols ?? []).map(symbol => symbol.toUpperCase()))]
          .filter(symbol => /^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)).slice(0, 12);
        if (symbols.length) void loadTicker(symbols);
      }
      if (payload.translationEnabled && nextItems.length > 0) {
        const translationParams = new URLSearchParams({ topic, lang, part: 'translation' });
        void fetch(`/api/market/special-news?${translationParams}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45_000)]),
          headers: { accept: 'application/json' },
        }).then(response => response.ok ? response.json() as Promise<SpecialNewsResponse> : null)
          .then(translated => {
            if (!isCurrent() || !translated?.items?.length) return;
            const byId = new Map(translated.items.map(item => [item.id, item]));
            startTransition(() => setItems(current => current.map(item => byId.get(item.id) ?? item)));
          }).catch(() => undefined);
      }
    } catch (loadError) {
      if (isCurrent()) setError(loadError instanceof Error ? loadError.message : 'news_load_failed');
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [lang, topic]);

  useEffect(() => {
    setItems([]);
    setTickerItems([]);
    setQuery('');
    void load(false);
    return () => activeRequest.current?.abort();
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => [
      item.title,
      item.headline,
      item.summary,
      item.source,
      item.sourceName,
      item.ticker,
      ...(item.symbols ?? []),
      ...(item.companyNames ?? []),
      ...(item.sectors ?? []),
    ].some(value => String(value ?? '').toLowerCase().includes(normalized)));
  }, [items, query]);

  const tickerStripItems = useMemo<StockTickerStripItem[]>(() => tickerItems.map(item => ({
    symbol: item.symbol,
    name: item.name ?? item.symbol,
    assetType: item.assetType ?? 'unknown',
    price: item.price ?? null,
    currency: item.currency ?? 'USD',
    changePercent: item.changePercent ?? null,
    source: item.source ?? null,
    available: item.available !== false,
    meta: item.meta ?? undefined,
  })), [tickerItems]);

  const showStale = Boolean(error && items.length > 0);
  const showError = Boolean(error && items.length === 0);

  return (
    <NewsPageShell category={BACKGROUNDS[topic]} dir={dir} wide className={styles.page}>
      <main className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true"><TopicIcon size={25} /></div>
          <div className={styles.heroText}>
            <span className={styles.badge}>{copy.badge}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCcw size={16} className={refreshing ? styles.spin : undefined} />
            <span>{refreshing ? common.refreshing : common.refresh}</span>
          </button>
        </section>

        <section className={styles.methodCard}>
          <ShieldCheck size={19} aria-hidden="true" />
          <div>
            <strong>{copy.badge}</strong>
            <p>{copy.method}</p>
            {topic === 'stocks-under-1' ? <p className={styles.priceRule}>{common.priceRule}</p> : null}
          </div>
        </section>

        <section className={styles.tickerSection} aria-label={copy.tickerLabel}>
          <StockTickerStrip
            ariaLabel={copy.tickerLabel}
            items={tickerStripItems}
            locale={localeFor(lang)}
            unavailableLabel={common.unavailable}
            direction="ltr"
            durationSeconds={34}
            minimumItems={10}
          />
        </section>

        {partialFailure ? (
          <div className={styles.notice} role="status">
            <AlertTriangle size={17} />
            <span>{common.partial}</span>
          </div>
        ) : null}
        {showStale ? (
          <div className={styles.notice} role="status">
            <AlertTriangle size={17} />
            <span>{common.stale}</span>
          </div>
        ) : null}

        <section className={styles.toolbar} aria-label={copy.title}>
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.search}
              type="search"
            />
          </label>
          <div className={styles.statusMeta}>
            <span><Newspaper size={15} /> {filteredItems.length} {common.results}</span>
            <span><Clock3 size={15} /> {common.updated}: {formattedDate(lastUpdated, lang)}</span>
          </div>
        </section>

        {loading ? (
          <section className={styles.loadingGrid} aria-busy="true" aria-label={common.refreshing}>
            {Array.from({ length: 6 }, (_, index) => <div className={styles.skeleton} key={index} />)}
          </section>
        ) : showError ? (
          <section className={styles.emptyState} role="alert">
            <AlertTriangle size={24} />
            <h2>{common.loadError}</h2>
            <p>{copy.emptyHint}</p>
            <button type="button" onClick={() => void load(true)}>{common.refresh}</button>
          </section>
        ) : filteredItems.length === 0 ? (
          <section className={styles.emptyState}>
            <Newspaper size={24} />
            <h2>{copy.empty}</h2>
            <p>{copy.emptyHint}</p>
          </section>
        ) : (
          <section className={styles.grid}>
            {filteredItems.map(item => {
              const title = item.title || item.headline || '—';
              const source = item.sourceName || item.source || '—';
              const url = safeExternalNewsUrl(item.url);
              const price = formatPrice(item.price);
              const change = formatChange(item.changePercent);
              const symbols = (item.symbols ?? []).slice(0, 4);
              const direction = item.changePercent && item.changePercent > 0
                ? 'up'
                : item.changePercent && item.changePercent < 0
                  ? 'down'
                  : 'flat';

              return (
                <article className={styles.card} key={item.id}>
                  <div className={styles.cardTopline}>
                    <span className={styles.source}><Building2 size={14} /> {source}</span>
                    <span className={styles.date}><Clock3 size={14} /> {formattedDate(item.publishedAt, lang)}</span>
                  </div>

                  <div className={styles.tags}>
                    {item.isOfficial ? <span><ShieldCheck size={13} /> {common.official}</span> : null}
                    {item.priceVerified ? <span><CircleDollarSign size={13} /> {common.verified}</span> : null}
                    {item.ticker ? <span className={styles.ticker}>{item.ticker}</span> : null}
                    {!item.ticker ? symbols.map(symbol => <span className={styles.ticker} key={symbol}>{symbol}</span>) : null}
                  </div>

                  {price ? (
                    <div className={styles.quote}>
                      <strong>${price}</strong>
                      {change ? <span data-direction={direction}>{change}</span> : null}
                      <small>{item.priceSource ?? common.delayed}</small>
                    </div>
                  ) : null}

                  <h2>{title}</h2>
                  <p className={styles.summary}>{item.summary || common.noSummary}</p>

                  {item.companyNames?.length ? (
                    <p className={styles.companies}>{item.companyNames.slice(0, 3).join(' • ')}</p>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {item.verificationStatus ? <span className={styles.verification}>{item.verificationStatus.replaceAll('_', ' ')}</span> : <span />}
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {common.read} <ExternalLink size={14} />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </NewsPageShell>
  );
}

export default SpecialMarketNewsPage;
