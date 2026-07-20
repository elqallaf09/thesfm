'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Globe2,
  LayoutGrid,
  MapPinned,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';

import { AssetIdentity } from '@/components/asset/AssetIdentity';
import type { ApiListState } from '@/components/market-analysis/types';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY } from './copy';
import {
  aiAnalystMarketAnalysisHref,
  aiAnalystMarketDirectoryUrl,
  aiAnalystMarketSurfaceLocale,
  aiAnalystNewsUrl,
  normalizeAiAnalystMarketDirectoryPayload,
  normalizeAiAnalystNewsPayload,
  type AiAnalystDirectoryAssetType,
  type AiAnalystMarketDirectory,
  type AiAnalystMarketSurfaceLocale,
  type AiAnalystMarketSurfaceStatus,
  type AiAnalystNewsFeed,
} from './aiAnalystMarketSurfaceData';
import styles from './AiAnalystMarketSurfaces.module.css';

const TradingSessionsPanel = dynamic(
  () => import('@/components/market-analysis/TradingSessionsPanel').then(module => module.TradingSessionsPanel),
  {
    ssr: false,
    loading: () => <SurfaceLoading />,
  },
);

const EconomicCalendarPanel = dynamic(
  () => import('@/components/market-analysis/EconomicCalendarPanel').then(module => module.EconomicCalendarPanel),
  {
    ssr: false,
    loading: () => <SurfaceLoading />,
  },
);

type MarketSurfaceCopy = {
  leadership: string;
  leadershipBody: string;
  marketDirectory: string;
  directoryBody: string;
  marketExplorer: string;
  explorerBody: string;
  marketGroups: string;
  visibleSymbols: string;
  sources: string;
  catalogAsOf: string;
  loading: string;
  unavailable: string;
  empty: string;
  partial: string;
  stale: string;
  retry: string;
  search: string;
  searchPlaceholder: string;
  assetType: string;
  allAssets: string;
  results: string;
  next: string;
  previous: string;
  market: string;
  exchange: string;
  currency: string;
  source: string;
  nameUnavailable: string;
  sessions: string;
  sessionsBody: string;
  marketMap: string;
  mapUnavailable: string;
  mapUnavailableBody: string;
  news: string;
  newsBody: string;
  newsUnavailable: string;
  calendar: string;
  calendarBody: string;
  education: string;
  educationBody: string;
  educationBasics: string;
  educationRisk: string;
  educationData: string;
  educationNotice: string;
  official: string;
  noSummary: string;
  signIn: string;
};

const MARKET_SURFACE_COPY: Record<AiAnalystMarketSurfaceLocale, MarketSurfaceCopy> = {
  ar: {
    leadership: 'قيادة الأسواق',
    leadershipBody: 'دليل الأسواق يعرض التغطية المتاحة ومصدرها فقط. لا يتم عرض أي توصية أو سعر غير موثق هنا.',
    marketDirectory: 'دليل الأسواق',
    directoryBody: 'الرموز الوصفية التي يمكن فتحها داخل المحلل الذكي.',
    marketExplorer: 'مستكشف الأسواق',
    explorerBody: 'ابحث في الدليل المتاح. لا تعني نتيجة الدليل أن قراءة الذكاء المالي متاحة أو مكتملة.',
    marketGroups: 'الأسواق المتاحة',
    visibleSymbols: 'الرموز المعروضة',
    sources: 'المصدر',
    catalogAsOf: 'آخر تحديث للدليل',
    loading: 'جارٍ تحميل البيانات المتاحة…',
    unavailable: 'تعذر تحميل بيانات السوق المتاحة. لم يتم عرض بيانات بديلة.',
    empty: 'لا توجد بيانات موثقة متاحة للعرض حالياً.',
    partial: 'التغطية جزئية؛ تظهر البيانات المتاحة فقط.',
    stale: 'بيانات الدليل متأخرة وتظهر بصفتها متأخرة.',
    retry: 'إعادة المحاولة',
    search: 'بحث في الرموز',
    searchPlaceholder: 'مثال: AAPL أو سوق أو شركة',
    assetType: 'نوع الأصل',
    allAssets: 'كل الأصول',
    results: 'النتائج',
    next: 'التالي',
    previous: 'السابق',
    market: 'السوق',
    exchange: 'البورصة',
    currency: 'العملة',
    source: 'المصدر',
    nameUnavailable: 'الاسم غير متاح',
    sessions: 'جلسات السوق والتداخلات',
    sessionsBody: 'تعرض هذه اللوحة أوقات الجلسات المحددة وقابلية السيولة الزمنية، وليست إشارة تداول.',
    marketMap: 'خريطة الأسواق',
    mapUnavailable: 'خريطة الأسواق متاحة للمعاينة الداخلية فقط',
    mapUnavailableBody: 'لا تتوفر خريطة أسواق موثقة لهذا الإصدار. استخدم مستكشف الأسواق لعرض البيانات التي يدعمها المصدر.',
    news: 'أخبار الأسواق',
    newsBody: 'أخبار موثقة من المصادر المتاحة. لا تعرض هذه الصفحة درجة معنويات أو توصية أو توقعاً.',
    newsUnavailable: 'تعذر تحميل الأخبار المتاحة. لم يتم عرض أخبار مخزنة على أنها حالية.',
    calendar: 'التقويم الاقتصادي',
    calendarBody: 'الأحداث تظهر مع المصدر وحالة التحديث عندما تكون بيانات المزود متاحة.',
    education: 'التعليم',
    educationBody: 'مواد توضيحية فقط؛ لا تشكل توصية استثمارية أو توقعاً للسوق.',
    educationBasics: 'فهم بيانات السوق',
    educationRisk: 'فهم المخاطر والقيود',
    educationData: 'قراءة المصدر والحداثة',
    educationNotice: 'استخدم التحليل الذكي المنظم للاطلاع على الأدلة والقيود الخاصة بأصل محدد.',
    official: 'مصدر رسمي',
    noSummary: 'لا يتوفر ملخص المصدر.',
    signIn: 'سجّل الدخول للوصول إلى الميزات الشخصية.',
  },
  en: {
    leadership: 'Market leadership',
    leadershipBody: 'The market directory shows available coverage and its source only. No recommendation or unverified price is shown here.',
    marketDirectory: 'Market directory',
    directoryBody: 'Descriptive symbols that can be opened inside the AI Analyst.',
    marketExplorer: 'Market explorer',
    explorerBody: 'Search the available directory. A directory result does not mean a financial-intelligence reading is available or complete.',
    marketGroups: 'Available markets',
    visibleSymbols: 'Visible symbols',
    sources: 'Source',
    catalogAsOf: 'Catalog updated',
    loading: 'Loading available coverage…',
    unavailable: 'Available market data could not be loaded. No replacement data is being shown.',
    empty: 'No verified coverage is available to show right now.',
    partial: 'Coverage is partial; only available records are shown.',
    stale: 'The directory is delayed and is labeled as delayed.',
    retry: 'Try again',
    search: 'Search symbols',
    searchPlaceholder: 'Example: AAPL, market, or company',
    assetType: 'Asset type',
    allAssets: 'All assets',
    results: 'Results',
    next: 'Next',
    previous: 'Previous',
    market: 'Market',
    exchange: 'Exchange',
    currency: 'Currency',
    source: 'Source',
    nameUnavailable: 'Name unavailable',
    sessions: 'Market sessions and overlaps',
    sessionsBody: 'This panel shows defined session times and time-based liquidity context. It is not a trading signal.',
    marketMap: 'Market map',
    mapUnavailable: 'Market map is internal-preview only',
    mapUnavailableBody: 'This release has no verified market-map data source. Use Market Explorer for supported source data.',
    news: 'Market news',
    newsBody: 'Verified news from available sources. This page does not show a sentiment score, recommendation, or forecast.',
    newsUnavailable: 'Available news could not be loaded. Stored news is not being presented as current.',
    calendar: 'Economic calendar',
    calendarBody: 'Events show their source and update state when provider data is available.',
    education: 'Education',
    educationBody: 'Explanatory material only; it is not investment advice or a market forecast.',
    educationBasics: 'Understand market data',
    educationRisk: 'Understand risk and limitations',
    educationData: 'Read source and freshness',
    educationNotice: 'Use structured AI Analyst research to inspect evidence and limitations for a specific asset.',
    official: 'Official source',
    noSummary: 'No source summary is available.',
    signIn: 'Sign in to access personal capabilities.',
  },
  fr: {
    leadership: 'Leadership des marchés',
    leadershipBody: 'Le répertoire des marchés affiche uniquement la couverture disponible et sa source. Aucune recommandation ni aucun prix non vérifié n’y est affiché.',
    marketDirectory: 'Répertoire des marchés',
    directoryBody: 'Symboles descriptifs pouvant être ouverts dans l’Analyste IA.',
    marketExplorer: 'Explorateur de marchés',
    explorerBody: 'Recherchez dans le répertoire disponible. Un résultat ne signifie pas qu’une analyse d’intelligence financière est disponible ou complète.',
    marketGroups: 'Marchés disponibles',
    visibleSymbols: 'Symboles visibles',
    sources: 'Source',
    catalogAsOf: 'Répertoire mis à jour',
    loading: 'Chargement de la couverture disponible…',
    unavailable: 'Les données de marché disponibles ne peuvent pas être chargées. Aucune donnée de remplacement n’est affichée.',
    empty: 'Aucune couverture vérifiée n’est disponible pour le moment.',
    partial: 'La couverture est partielle ; seuls les enregistrements disponibles sont affichés.',
    stale: 'Le répertoire est retardé et est signalé comme tel.',
    retry: 'Réessayer',
    search: 'Rechercher des symboles',
    searchPlaceholder: 'Exemple : AAPL, marché ou société',
    assetType: 'Type d’actif',
    allAssets: 'Tous les actifs',
    results: 'Résultats',
    next: 'Suivant',
    previous: 'Précédent',
    market: 'Marché',
    exchange: 'Bourse',
    currency: 'Devise',
    source: 'Source',
    nameUnavailable: 'Nom indisponible',
    sessions: 'Sessions et chevauchements de marché',
    sessionsBody: 'Ce panneau affiche les horaires de session définis et le contexte temporel de liquidité. Ce n’est pas un signal de trading.',
    marketMap: 'Carte des marchés',
    mapUnavailable: 'Carte des marchés réservée à la prévisualisation interne',
    mapUnavailableBody: 'Cette version ne propose pas de source de données vérifiée pour une carte des marchés. Utilisez l’explorateur pour les données prises en charge.',
    news: 'Actualités des marchés',
    newsBody: 'Actualités vérifiées provenant des sources disponibles. Cette page n’affiche ni score de sentiment, ni recommandation, ni prévision.',
    newsUnavailable: 'Les actualités disponibles ne peuvent pas être chargées. Les actualités enregistrées ne sont pas présentées comme actuelles.',
    calendar: 'Calendrier économique',
    calendarBody: 'Les événements affichent leur source et leur état de mise à jour lorsque les données du fournisseur sont disponibles.',
    education: 'Éducation',
    educationBody: 'Contenu explicatif uniquement ; il ne constitue ni un conseil en investissement ni une prévision de marché.',
    educationBasics: 'Comprendre les données de marché',
    educationRisk: 'Comprendre le risque et les limites',
    educationData: 'Lire la source et la fraîcheur',
    educationNotice: 'Utilisez la recherche structurée de l’Analyste IA pour examiner les preuves et les limites d’un actif précis.',
    official: 'Source officielle',
    noSummary: 'Aucun résumé de source n’est disponible.',
    signIn: 'Connectez-vous pour accéder aux capacités personnelles.',
  },
};

type SurfaceRequest<T> = Readonly<{
  status: 'loading' | 'ready' | 'error';
  data: T | null;
}>;

function useSurfaceRequest<T>(url: string, normalize: (payload: unknown) => T) {
  const [state, setState] = useState<SurfaceRequest<T>>({ status: 'loading', data: null });

  const reload = useCallback(async () => {
    setState(previous => ({ status: 'loading', data: previous.data }));
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = normalize(payload);
      setState({ status: response.ok ? 'ready' : 'error', data });
    } catch {
      setState(previous => ({ status: 'error', data: previous.data }));
    }
  }, [normalize, url]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState(previous => ({ status: 'loading', data: previous.data }));
    void fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async response => ({ response, payload: await response.json().catch(() => null) }))
      .then(({ response, payload }) => {
        if (!active) return;
        setState({ status: response.ok ? 'ready' : 'error', data: normalize(payload) });
      })
      .catch(() => {
        if (active) setState(previous => ({ status: 'error', data: previous.data }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [normalize, url]);

  return { ...state, reload };
}

function surfaceClassName(base: string, className?: string) {
  return className ? `${base} ${className}` : base;
}

function localizedDate(locale: AiAnalystMarketSurfaceLocale, value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const localeTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date(value));
}

function StatusNotice({
  status,
  copy,
  onRetry,
}: {
  status: AiAnalystMarketSurfaceStatus | 'error';
  copy: MarketSurfaceCopy;
  onRetry?: () => void;
}) {
  if (status === 'available') return null;
  const message = status === 'loading'
    ? copy.loading
    : status === 'partial'
      ? copy.partial
      : status === 'stale'
        ? copy.stale
        : copy.unavailable;
  return (
    <div className={styles.statusNotice} data-status={status} role={status === 'loading' ? 'status' : undefined} aria-live="polite">
      <ShieldAlert aria-hidden="true" size={17} />
      <span>{message}</span>
      {onRetry && status !== 'loading' ? (
        <button type="button" className={styles.inlineAction} onClick={onRetry}>
          <RefreshCw aria-hidden="true" size={15} />
          {copy.retry}
        </button>
      ) : null}
    </div>
  );
}

function SurfaceLoading() {
  return (
    <div className={styles.loadingCard} role="status" aria-live="polite">
      <span className={styles.loadingDot} aria-hidden="true" />
    </div>
  );
}

function SurfaceHeader({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <header className={styles.surfaceHeader}>
      <span className={styles.surfaceIcon} aria-hidden="true">{icon}</span>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p className={styles.description}>{body}</p>
      </div>
    </header>
  );
}

function MarketGroupList({
  groups,
  locale,
  copy,
}: {
  groups: AiAnalystMarketDirectory['groups'];
  locale: AiAnalystMarketSurfaceLocale;
  copy: MarketSurfaceCopy;
}) {
  if (groups.length === 0) return null;
  return (
    <section className={styles.groupSection} aria-labelledby="ai-analyst-market-groups">
      <h3 id="ai-analyst-market-groups">{copy.marketGroups}</h3>
      <ul className={styles.groupGrid}>
        {groups.map(group => {
          const label = locale === 'ar' ? group.arabicName ?? group.englishName ?? group.id : group.englishName ?? group.arabicName ?? group.id;
          const href = `/ai-analyst/markets?market=${encodeURIComponent(group.id)}`;
          return (
            <li key={group.id}>
              <Link className={styles.groupLink} href={href}>
                <span>
                  <strong>{label}</strong>
                  {group.family ? <small>{group.family}</small> : null}
                </span>
                <span className={styles.groupFacts}>
                  {group.currency ? <em dir="ltr">{group.currency}</em> : null}
                  {group.totalSymbols !== null ? <b dir="ltr">{group.totalSymbols}</b> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MarketAssetList({
  assets,
  copy,
  heading,
}: {
  assets: AiAnalystMarketDirectory['assets'];
  copy: MarketSurfaceCopy;
  heading: string;
}) {
  if (assets.length === 0) return null;
  return (
    <section className={styles.assetSection} aria-labelledby="ai-analyst-market-assets">
      <h3 id="ai-analyst-market-assets">{heading}</h3>
      <ul className={styles.assetGrid}>
        {assets.map(asset => {
          const href = aiAnalystMarketAnalysisHref(asset.symbol, asset.assetType);
          const meta = [
            asset.market ? `${copy.market}: ${asset.market}` : null,
            asset.exchange ? `${copy.exchange}: ${asset.exchange}` : null,
            asset.currency ? `${copy.currency}: ${asset.currency}` : null,
            asset.source ? `${copy.source}: ${asset.source}` : null,
          ].filter((value): value is string => Boolean(value));
          const content = (
            <>
              <AssetIdentity
                symbol={asset.symbol}
                name={asset.name}
                assetType={asset.assetType.toLowerCase()}
                exchange={asset.exchange}
                size="sm"
                variant="badge"
              />
              {!asset.name ? <span className={styles.missingName}>{copy.nameUnavailable}</span> : null}
              {meta.length > 0 ? <small className={styles.assetMeta}>{meta.join(' · ')}</small> : null}
            </>
          );
          return <li className={styles.assetCard} key={`${asset.symbol}-${asset.exchange ?? asset.market ?? 'unknown'}`}>
            {href ? <Link href={href} className={styles.assetLink}>{content}</Link> : <div className={styles.assetLink}>{content}</div>}
          </li>;
        })}
      </ul>
    </section>
  );
}

export function AiAnalystMarketLeadership({ className }: { className?: string }) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;
  const { status, data, reload } = useSurfaceRequest('/api/markets?limit=8&quality=complete', normalizeAiAnalystMarketDirectoryPayload);
  const surfaceStatus = status === 'loading' ? 'loading' : status === 'error' ? 'unavailable' : data?.status ?? 'unavailable';
  const visibleData = status === 'ready' ? data : null;

  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="market-leadership">
      <SurfaceHeader icon={<Globe2 size={21} />} eyebrow={workspaceTitle} title={copy.leadership} body={copy.leadershipBody} />
      <StatusNotice status={surfaceStatus} copy={copy} onRetry={() => void reload()} />
      {visibleData?.dataAsOf ? <p className={styles.asOf}>{copy.catalogAsOf}: <time dir="ltr" dateTime={visibleData.dataAsOf}>{localizedDate(locale, visibleData.dataAsOf)}</time></p> : null}
      <MarketGroupList groups={visibleData?.groups ?? []} locale={locale} copy={copy} />
      <MarketAssetList assets={visibleData?.assets ?? []} copy={copy} heading={copy.marketDirectory} />
      {surfaceStatus !== 'loading' && !visibleData?.groups.length && !visibleData?.assets.length ? <p className={styles.emptyState}>{copy.empty}</p> : null}
    </section>
  );
}

const EXPLORER_ASSET_TYPES: ReadonlyArray<readonly [string, AiAnalystDirectoryAssetType | 'ALL']> = [
  ['all', 'ALL'],
  ['stock', 'STOCK'],
  ['crypto', 'CRYPTO'],
  ['forex', 'FOREX'],
  ['index', 'INDEX'],
  ['commodity', 'COMMODITY'],
  ['fund', 'FUND'],
];

function assetTypeLabel(locale: AiAnalystMarketSurfaceLocale, value: AiAnalystDirectoryAssetType | 'ALL', copy: MarketSurfaceCopy) {
  if (value === 'ALL') return copy.allAssets;
  const labels: Record<AiAnalystMarketSurfaceLocale, Record<AiAnalystDirectoryAssetType, string>> = {
    ar: { STOCK: 'أسهم', CRYPTO: 'عملات رقمية', FOREX: 'فوركس', INDEX: 'مؤشرات', COMMODITY: 'سلع', FUND: 'صناديق' },
    en: { STOCK: 'Stocks', CRYPTO: 'Crypto', FOREX: 'Forex', INDEX: 'Indices', COMMODITY: 'Commodities', FUND: 'Funds' },
    fr: { STOCK: 'Actions', CRYPTO: 'Crypto', FOREX: 'Forex', INDEX: 'Indices', COMMODITY: 'Matières premières', FUND: 'Fonds' },
  };
  return labels[locale][value];
}

export function AiAnalystMarketExplorer({
  className,
  initialQuery = '',
  initialAssetType = 'ALL',
}: {
  className?: string;
  initialQuery?: string;
  initialAssetType?: AiAnalystDirectoryAssetType | 'ALL';
}) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [assetType, setAssetType] = useState<AiAnalystDirectoryAssetType | 'ALL'>(initialAssetType);
  const [page, setPage] = useState(1);
  const url = useMemo(() => aiAnalystMarketDirectoryUrl({
    query,
    assetType: assetType === 'ALL' ? undefined : assetType,
    page,
  }), [assetType, page, query]);
  const { status, data, reload } = useSurfaceRequest(url, normalizeAiAnalystMarketDirectoryPayload);
  const surfaceStatus = status === 'loading' ? 'loading' : status === 'error' ? 'unavailable' : data?.status ?? 'unavailable';
  const visibleData = status === 'ready' ? data : null;
  const canMovePrevious = page > 1;
  const canMoveNext = visibleData?.assets.length === 24;

  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="market-explorer">
      <SurfaceHeader icon={<LayoutGrid size={21} />} eyebrow={workspaceTitle} title={copy.marketExplorer} body={copy.explorerBody} />
      <form
        className={styles.explorerForm}
        onSubmit={event => {
          event.preventDefault();
          setPage(1);
          setQuery(queryInput.trim());
        }}
      >
        <label className={styles.field}>
          <span>{copy.search}</span>
          <span className={styles.inputWithIcon}>
            <Search aria-hidden="true" size={17} />
            <input
              value={queryInput}
              onChange={event => setQueryInput(event.target.value.slice(0, 64))}
              placeholder={copy.searchPlaceholder}
              maxLength={64}
              autoComplete="off"
            />
          </span>
        </label>
        <label className={styles.field}>
          <span>{copy.assetType}</span>
          <select
            value={assetType}
            onChange={event => {
              setAssetType(event.target.value as AiAnalystDirectoryAssetType | 'ALL');
              setPage(1);
            }}
          >
            {EXPLORER_ASSET_TYPES.map(([, value]) => <option key={value} value={value}>{assetTypeLabel(locale, value, copy)}</option>)}
          </select>
        </label>
        <button type="submit" className={styles.primaryAction}>{copy.search}</button>
      </form>
      <StatusNotice status={surfaceStatus} copy={copy} onRetry={() => void reload()} />
      {visibleData?.dataAsOf ? <p className={styles.asOf}>{copy.catalogAsOf}: <time dir="ltr" dateTime={visibleData.dataAsOf}>{localizedDate(locale, visibleData.dataAsOf)}</time></p> : null}
      <MarketAssetList assets={visibleData?.assets ?? []} copy={copy} heading={copy.results} />
      {surfaceStatus !== 'loading' && !visibleData?.assets.length ? <p className={styles.emptyState}>{copy.empty}</p> : null}
      <nav className={styles.pagination} aria-label={copy.results}>
        <button type="button" className={styles.secondaryAction} disabled={!canMovePrevious || surfaceStatus === 'loading'} onClick={() => setPage(current => Math.max(1, current - 1))}>{copy.previous}</button>
        <button type="button" className={styles.secondaryAction} disabled={!canMoveNext || surfaceStatus === 'loading'} onClick={() => setPage(current => current + 1)}>{copy.next}</button>
      </nav>
    </section>
  );
}

export function AiAnalystMarketSessions({
  className,
  view = 'sessions',
}: {
  className?: string;
  view?: 'sessions' | 'map';
}) {
  const { lang, dir, t } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;

  if (view === 'map') {
    return (
      <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="market-map">
        <SurfaceHeader icon={<MapPinned size={21} />} eyebrow={workspaceTitle} title={copy.marketMap} body={copy.mapUnavailableBody} />
        <div className={styles.emptyPanel} role="status">
          <MapPinned aria-hidden="true" size={21} />
          <div>
            <strong>{copy.mapUnavailable}</strong>
            <p>{copy.mapUnavailableBody}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="market-sessions">
      <SurfaceHeader icon={<CalendarDays size={21} />} eyebrow={workspaceTitle} title={copy.sessions} body={copy.sessionsBody} />
      <TradingSessionsPanel t={t} locale={lang} />
    </section>
  );
}

function AiAnalystNewsSurface({ className }: { className?: string }) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;
  const url = useMemo(() => aiAnalystNewsUrl(locale), [locale]);
  const { status, data, reload } = useSurfaceRequest<AiAnalystNewsFeed>(url, normalizeAiAnalystNewsPayload);
  const surfaceStatus = status === 'loading' ? 'loading' : status === 'error' ? 'unavailable' : data?.status ?? 'unavailable';
  const visibleData = status === 'ready' ? data : null;

  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="market-news">
      <SurfaceHeader icon={<Newspaper size={21} />} eyebrow={workspaceTitle} title={copy.news} body={copy.newsBody} />
      <StatusNotice status={surfaceStatus} copy={copy} onRetry={() => void reload()} />
      {visibleData?.dataAsOf ? <p className={styles.asOf}>{copy.catalogAsOf}: <time dir="ltr" dateTime={visibleData.dataAsOf}>{localizedDate(locale, visibleData.dataAsOf)}</time></p> : null}
      {visibleData?.stories.length ? (
        <ol className={styles.newsList}>
          {visibleData.stories.map(story => (
            <li className={styles.newsCard} key={story.id}>
              <div className={styles.newsMeta}>
                {story.sourceName ? <span>{story.sourceName}</span> : null}
                {story.official ? <span data-official="true">{copy.official}</span> : null}
                {story.publishedAt ? <time dir="ltr" dateTime={story.publishedAt}>{localizedDate(locale, story.publishedAt)}</time> : null}
              </div>
              <h3>{story.title}</h3>
              <p>{story.summary ?? copy.noSummary}</p>
              {story.url ? <a className={styles.newsLink} href={story.url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={15} />{copy.source}</a> : null}
            </li>
          ))}
        </ol>
      ) : surfaceStatus !== 'loading' ? <p className={styles.emptyState}>{surfaceStatus === 'unavailable' ? copy.newsUnavailable : copy.empty}</p> : null}
    </section>
  );
}

function AiAnalystCalendarSurface({ className }: { className?: string }) {
  const { lang, dir, t } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;
  const [state, setState] = useState<ApiListState<Record<string, unknown>>>({ loading: true, items: [], message: '' });
  const load = useCallback(async () => {
    setState({ loading: true, items: [], message: '' });
    try {
      const response = await fetch('/api/economic-calendar', { headers: { Accept: 'application/json' } });
      const payload: unknown = await response.json().catch(() => null);
      const root = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
      const items = Array.isArray(root.items) ? root.items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
      setState({
        loading: false,
        items,
        message: response.ok ? '' : copy.unavailable,
        updatedAt: typeof root.updated_at === 'string' ? root.updated_at : undefined,
        code: typeof root.code === 'string' ? root.code : undefined,
        source: typeof root.source === 'string' ? root.source : null,
        provider: typeof root.providerId === 'string' ? root.providerId : null,
        stale: root.stale === true,
        cached: root.cached === true,
        providerStatus: typeof root.providerStatus === 'string' ? root.providerStatus : null,
      });
    } catch {
      setState({ loading: false, items: [], message: copy.unavailable, code: 'CALENDAR_UNAVAILABLE' });
    }
  }, [copy.unavailable]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="economic-calendar">
      <SurfaceHeader icon={<CalendarDays size={21} />} eyebrow={workspaceTitle} title={copy.calendar} body={copy.calendarBody} />
      <EconomicCalendarPanel t={t} locale={lang} state={state} onRefresh={() => void load()} canViewDiagnostics={false} />
    </section>
  );
}

function AiAnalystEducationSurface({ className }: { className?: string }) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystMarketSurfaceLocale(lang);
  const copy = MARKET_SURFACE_COPY[locale];
  const workspaceTitle = AI_ANALYST_COPY[locale].title;
  const topics = [copy.educationBasics, copy.educationRisk, copy.educationData];
  return (
    <section className={surfaceClassName(styles.surface, className)} dir={dir} data-ai-analyst-surface="education">
      <SurfaceHeader icon={<BookOpen size={21} />} eyebrow={workspaceTitle} title={copy.education} body={copy.educationBody} />
      <div className={styles.educationGrid}>
        {topics.map(topic => <article className={styles.educationCard} key={topic}><BookOpen aria-hidden="true" size={18} /><h3>{topic}</h3></article>)}
      </div>
      <p className={styles.educationNotice}>{copy.educationNotice}</p>
    </section>
  );
}

export function AiAnalystKnowledgeSurface({
  kind,
  className,
}: {
  kind: 'news' | 'calendar' | 'education';
  className?: string;
}) {
  if (kind === 'calendar') return <AiAnalystCalendarSurface className={className} />;
  if (kind === 'education') return <AiAnalystEducationSurface className={className} />;
  return <AiAnalystNewsSurface className={className} />;
}
