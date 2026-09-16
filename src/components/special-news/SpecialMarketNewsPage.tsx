'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  HeartPulse,
  Landmark,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import type { NewsPageBackgroundCategory } from '@/lib/news/pageBackground';
import styles from './SpecialMarketNewsPage.module.css';

export type SpecialNewsTopic = 'federal-reserve' | 'healthcare-stocks' | 'new-stocks' | 'stocks-under-1' | 'metals-news';

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

type MetalTickerItem = {
  id: 'gold' | 'silver' | 'copper' | 'platinum' | 'palladium';
  symbol: string;
  unit: 'USD/oz' | 'USD/lb';
  price: number | null;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available: boolean;
  unavailableReason?: string | null;
};

type SpecialNewsResponse = {
  ok?: boolean;
  success?: boolean;
  code?: string | null;
  topic?: SpecialNewsTopic;
  items?: SpecialNewsItem[];
  metalTicker?: MetalTickerItem[];
  updatedAt?: string | null;
  lastSuccessfulUpdate?: string | null;
  partialFailure?: boolean;
  liveUpdatesAvailable?: boolean;
  storedFallbackUsed?: boolean;
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
  metalsTicker: string;
  unavailable: string;
};

const TOPIC_COPY: Record<SpecialNewsTopic, Record<Lang, TopicCopy>> = {
  'federal-reserve': {
    ar: {
      title: 'أخبار الفيدرالي الأمريكي',
      subtitle: 'قرارات الفائدة، اجتماعات FOMC، تصريحات مسؤولي الاحتياطي الفيدرالي، والتضخم والتوظيف المرتبطان بالسياسة النقدية.',
      badge: 'السياسة النقدية الأمريكية',
      method: 'تُجمع الأخبار من مصادر مالية ورسمية متعددة، مع إعطاء أولوية للمصادر الرسمية وأخبار الاحتياطي الفيدرالي الموثوقة.',
      empty: 'لا توجد أخبار حديثة مطابقة للفيدرالي الأمريكي حاليًا.',
      emptyHint: 'حدّث الصفحة لاحقًا؛ لن نعرض خبرًا غير مطابق فقط لملء الصفحة.',
      search: 'ابحث في أخبار الفيدرالي...',
    },
    en: {
      title: 'Federal Reserve News',
      subtitle: 'Interest-rate decisions, FOMC meetings, Fed officials, inflation, and employment developments tied to monetary policy.',
      badge: 'US monetary policy',
      method: 'News is aggregated from multiple financial and official sources, with priority given to reliable Federal Reserve and official coverage.',
      empty: 'No recent Federal Reserve news matches are available right now.',
      emptyHint: 'Refresh later; unrelated stories are not inserted just to fill the page.',
      search: 'Search Federal Reserve news...',
    },
    fr: {
      title: 'Actualités de la Réserve fédérale',
      subtitle: 'Décisions de taux, réunions du FOMC, responsables de la Fed, inflation et emploi liés à la politique monétaire.',
      badge: 'Politique monétaire américaine',
      method: 'Les actualités proviennent de plusieurs sources financières et officielles, avec priorité aux sources fiables et officielles.',
      empty: 'Aucune actualité récente correspondante sur la Réserve fédérale.',
      emptyHint: 'Actualisez plus tard ; aucun article hors sujet ne sera ajouté pour remplir la page.',
      search: 'Rechercher dans les actualités de la Fed...',
    },
  },
  'healthcare-stocks': {
    ar: {
      title: 'أخبار الأسهم الطبية',
      subtitle: 'أخبار شركات الرعاية الصحية والأدوية والتقنية الطبية والبايوتكنولوجي، بما فيها قرارات FDA والتجارب السريرية والأحداث المؤثرة.',
      badge: 'الرعاية الصحية والبايوتكنولوجي',
      method: 'يتم ربط الخبر بشركة أو رمز سوقي كلما توفرت بيانات كافية، مع تجنب تحويل الأخبار الصحية العامة إلى أخبار أسهم من دون صلة واضحة.',
      empty: 'لا توجد أخبار أسهم طبية مطابقة حاليًا.',
      emptyHint: 'جرّب التحديث لاحقًا أو استخدم البحث باسم شركة أو رمز.',
      search: 'ابحث باسم شركة، رمز، دواء أو FDA...',
    },
    en: {
      title: 'Healthcare Stocks News',
      subtitle: 'Healthcare, pharma, medtech, and biotech company news, including FDA decisions, clinical trials, and material company events.',
      badge: 'Healthcare & biotech',
      method: 'Stories are tied to a company or market symbol when evidence allows; general health stories are not treated as stock news without a clear market link.',
      empty: 'No matching healthcare-stock news is available right now.',
      emptyHint: 'Refresh later or search by company, ticker, drug, or FDA topic.',
      search: 'Search company, ticker, drug, or FDA...',
    },
    fr: {
      title: 'Actualités des actions santé',
      subtitle: 'Actualités santé, pharma, medtech et biotech, y compris décisions FDA, essais cliniques et événements importants.',
      badge: 'Santé et biotech',
      method: 'Les articles sont reliés à une société ou un symbole lorsqu’une relation de marché claire existe.',
      empty: 'Aucune actualité correspondante sur les actions santé actuellement.',
      emptyHint: 'Actualisez plus tard ou recherchez une société, un symbole, un médicament ou la FDA.',
      search: 'Rechercher société, symbole, médicament ou FDA...',
    },
  },
  'new-stocks': {
    ar: {
      title: 'أخبار الأسهم الجديدة',
      subtitle: 'متابعة الطروحات العامة IPO، الإدراجات الجديدة، الإدراج المباشر، وبدايات التداول في الأسواق الأمريكية.',
      badge: 'IPO والإدراجات الجديدة',
      method: 'المقصود بالأسهم الجديدة هنا الشركات حديثة الإدراج والطروحات الجديدة، وليس قائمة أسهم مقترحة للشراء.',
      empty: 'لا توجد أخبار إدراجات أو طروحات جديدة مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند وجود طرح، إدراج، أو بداية تداول موثقة من المصادر المتاحة.',
      search: 'ابحث عن IPO أو شركة حديثة الإدراج...',
    },
    en: {
      title: 'New Stocks News',
      subtitle: 'Track IPOs, newly listed companies, direct listings, and US market trading debuts.',
      badge: 'IPOs & new listings',
      method: '“New stocks” means newly listed companies and IPOs here; it is not a list of stocks suggested for purchase.',
      empty: 'No matching IPO or new-listing news is available right now.',
      emptyHint: 'Stories appear when a documented offering, listing, or trading debut is available.',
      search: 'Search IPOs or newly listed companies...',
    },
    fr: {
      title: 'Actualités des nouvelles actions',
      subtitle: 'Suivez les IPO, nouvelles cotations, cotations directes et débuts de négociation sur les marchés américains.',
      badge: 'IPO et nouvelles cotations',
      method: '« Nouvelles actions » désigne ici les sociétés récemment cotées et les IPO, pas une liste de titres recommandés.',
      empty: 'Aucune actualité correspondante sur une IPO ou une nouvelle cotation.',
      emptyHint: 'Les articles apparaissent lorsqu’une offre ou une cotation documentée est disponible.',
      search: 'Rechercher une IPO ou une société récemment cotée...',
    },
  },
  'stocks-under-1': {
    ar: {
      title: 'أخبار أسهم أقل من 1$',
      subtitle: 'أخبار الأسهم الأمريكية منخفضة السعر التي يثبت سعرها الحالي المتاح أنها أقل من 1 دولار وقت التحديث.',
      badge: 'أسهم أقل من 1$ — تحقق سعري',
      method: 'هذا تصنيف متغير: لا يدخل السهم إلا إذا توفر سعر سوقي صالح ومتحقق وكان أقل من 1$. إذا لم يتوفر سعر موثوق لا نضعه في القائمة.',
      empty: 'لا توجد أخبار مطابقة لأسهم متحقق من سعرها تحت 1$ حاليًا.',
      emptyHint: 'السعر يتغير باستمرار وقد يدخل السهم أو يخرج من هذا التصنيف عند كل تحديث.',
      search: 'ابحث باسم الشركة أو الرمز...',
    },
    en: {
      title: 'Stocks Under $1 News',
      subtitle: 'News for US stocks whose currently available verified market quote is below $1 at refresh time.',
      badge: 'Under $1 — price verified',
      method: 'This is a dynamic category: a stock is included only when a valid available market quote verifies a price below $1. Unverified prices are excluded.',
      empty: 'No matching news for price-verified stocks under $1 is available right now.',
      emptyHint: 'Prices move continuously, so symbols can enter or leave this category on each refresh.',
      search: 'Search company or ticker...',
    },
    fr: {
      title: 'Actualités des actions sous 1 $',
      subtitle: 'Actualités des actions américaines dont le cours de marché disponible et vérifié est inférieur à 1 $ au moment de l’actualisation.',
      badge: 'Sous 1 $ — prix vérifié',
      method: 'Catégorie dynamique : une action est incluse uniquement si un cours valide et disponible confirme un prix inférieur à 1 $.',
      empty: 'Aucune actualité correspondante pour une action vérifiée sous 1 $ actuellement.',
      emptyHint: 'Les cours évoluent ; les symboles peuvent entrer ou sortir de cette catégorie à chaque actualisation.',
      search: 'Rechercher société ou symbole...',
    },
  },
  'metals-news': {
    ar: {
      title: 'أخبار المعادن',
      subtitle: 'أخبار الذهب والفضة والنحاس والبلاتين والبلاديوم، مع شريط أسعار متحرك مبني على أسعار سوقية متاحة وليست أرقامًا ثابتة.',
      badge: 'المعادن الثمينة والصناعية',
      method: 'نربط أخبار المعادن بتحركات الأسعار والعرض والطلب والاقتصاد والجغرافيا السياسية. شريط الأسعار يستخدم بيانات مزود سوق خارجي وقد تكون متأخرة.',
      empty: 'لا توجد أخبار معادن مطابقة حاليًا.',
      emptyHint: 'حدّث لاحقًا؛ الصفحة لا تنشئ أخبارًا أو أسعارًا وهمية عند غياب البيانات.',
      search: 'ابحث عن الذهب، الفضة، النحاس، البلاتين...',
    },
    en: {
      title: 'Metals News',
      subtitle: 'Gold, silver, copper, platinum, and palladium news with a moving ticker backed by available market quotes rather than fixed placeholder values.',
      badge: 'Precious & industrial metals',
      method: 'Metal news is connected to price moves, supply, demand, macroeconomics, and geopolitics. Ticker quotes come from an external market-data source and may be delayed.',
      empty: 'No matching metals news is available right now.',
      emptyHint: 'Refresh later; the page does not invent stories or prices when live data is unavailable.',
      search: 'Search gold, silver, copper, platinum...',
    },
    fr: {
      title: 'Actualités des métaux',
      subtitle: 'Actualités de l’or, de l’argent, du cuivre, du platine et du palladium avec un bandeau de cours alimenté par des données de marché disponibles.',
      badge: 'Métaux précieux et industriels',
      method: 'Les actualités sont reliées aux prix, à l’offre, à la demande, à la macroéconomie et à la géopolitique. Les cours peuvent être différés.',
      empty: 'Aucune actualité correspondante sur les métaux actuellement.',
      emptyHint: 'Actualisez plus tard ; aucun article ni cours fictif n’est créé lorsque les données manquent.',
      search: 'Rechercher or, argent, cuivre, platine...',
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
    metalsTicker: 'أسعار المعادن',
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
    partial: 'Some news providers are currently unavailable; results are from providers that responded.',
    results: 'results',
    priceRule: 'Only stocks with an available verified current quote below $1 are shown.',
    metalsTicker: 'Metals prices',
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
    metalsTicker: 'Cours des métaux',
    unavailable: 'Indisponible',
  },
};

const METAL_NAMES: Record<MetalTickerItem['id'], Record<Lang, string>> = {
  gold: { ar: 'الذهب', en: 'Gold', fr: 'Or' },
  silver: { ar: 'الفضة', en: 'Silver', fr: 'Argent' },
  copper: { ar: 'النحاس', en: 'Copper', fr: 'Cuivre' },
  platinum: { ar: 'البلاتين', en: 'Platinum', fr: 'Platine' },
  palladium: { ar: 'البلاديوم', en: 'Palladium', fr: 'Palladium' },
};

const BACKGROUNDS: Record<SpecialNewsTopic, NewsPageBackgroundCategory> = {
  'federal-reserve': 'banking',
  'healthcare-stocks': 'healthcare',
  'new-stocks': 'growth',
  'stocks-under-1': 'cyclical',
  'metals-news': 'high-income',
};

const ICONS = {
  'federal-reserve': Landmark,
  'healthcare-stocks': HeartPulse,
  'new-stocks': Sparkles,
  'stocks-under-1': CircleDollarSign,
  'metals-news': CircleDollarSign,
} as const;

function normalizeLang(value: string): Lang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function formattedDate(value: string | null | undefined, lang: Lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
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

function MetalPriceTicker({ items, lang, label, unavailable }: {
  items: MetalTickerItem[];
  lang: Lang;
  label: string;
  unavailable: string;
}) {
  if (items.length === 0) return null;

  const tickerSet = (duplicate = false) => (
    <div className={styles.tickerSet} aria-hidden={duplicate || undefined}>
      {items.map(item => {
        const price = formatPrice(item.price);
        const change = formatChange(item.changePercent);
        const direction = item.changePercent && item.changePercent > 0
          ? 'up'
          : item.changePercent && item.changePercent < 0
            ? 'down'
            : 'flat';
        return (
          <div className={styles.metalTickerItem} key={`${duplicate ? 'dup-' : ''}${item.id}`}>
            <span className={styles.metalName}>{METAL_NAMES[item.id][lang]}</span>
            <span className={styles.metalSymbol}>{item.symbol}</span>
            <strong>{item.available && price ? price : unavailable}</strong>
            {item.available ? <small>{item.unit}</small> : null}
            {item.available && change ? <span className={styles.metalChange} data-direction={direction}>{change}</span> : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className={styles.metalTicker} aria-label={label}>
      <div className={styles.tickerLabel}>{label}</div>
      <div className={styles.tickerViewport}>
        <div className={styles.tickerTrack}>
          {tickerSet(false)}
          {tickerSet(true)}
        </div>
      </div>
    </section>
  );
}

export function SpecialMarketNewsPage({ topic }: { topic: SpecialNewsTopic }) {
  const { lang: rawLang, dir } = useLanguage();
  const lang = normalizeLang(rawLang);
  const copy = TOPIC_COPY[topic][lang];
  const common = COMMON_COPY[lang];
  const TopicIcon = ICONS[topic];

  const [items, setItems] = useState<SpecialNewsItem[]>([]);
  const [metalTicker, setMetalTicker] = useState<MetalTickerItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partialFailure, setPartialFailure] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ topic, lang });
      if (forceRefresh) params.set('refresh', '1');
      const response = await fetch(`/api/market/special-news?${params.toString()}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({})) as SpecialNewsResponse;
      if (!response.ok || payload.success === false) {
        throw new Error(payload.code || `http_${response.status}`);
      }

      setItems(dedupeNewsItems(payload.items ?? []));
      setMetalTicker(payload.metalTicker ?? []);
      setPartialFailure(Boolean(payload.partialFailure));
      setLastUpdated(payload.updatedAt ?? payload.lastSuccessfulUpdate ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'news_load_failed');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, topic]);

  useEffect(() => {
    void load(false);
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

        {topic === 'metals-news' ? (
          <MetalPriceTicker items={metalTicker} lang={lang} label={common.metalsTicker} unavailable={common.unavailable} />
        ) : null}

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
                      {change ? <span data-direction={item.changePercent && item.changePercent > 0 ? 'up' : item.changePercent && item.changePercent < 0 ? 'down' : 'flat'}>{change}</span> : null}
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
