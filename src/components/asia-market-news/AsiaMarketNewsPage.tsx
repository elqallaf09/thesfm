'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Clock3,
  ExternalLink,
  Globe,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { StockTickerStrip, type StockTickerStripItem } from '@/components/market/StockTickerStrip';
import { NewsPageShell } from '@/components/news/NewsPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import styles from '@/components/special-news/SpecialMarketNewsPage.module.css';

type Lang = 'ar' | 'en' | 'fr';

type AsiaNewsItem = {
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
  countries?: string[];
  marketCodes?: string[];
  exchangeCodes?: string[];
  sectors?: string[];
  verificationStatus?: string | null;
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

type AsiaNewsResponse = {
  ok?: boolean;
  success?: boolean;
  code?: string | null;
  items?: AsiaNewsItem[];
  tickerItems?: ApiTickerItem[];
  updatedAt?: string | null;
  lastSuccessfulUpdate?: string | null;
  partialFailure?: boolean;
  liveUpdatesAvailable?: boolean;
  storedFallbackUsed?: boolean;
};

const COPY = {
  ar: {
    title: 'أخبار السوق الآسيوي',
    subtitle: 'تغطية متجددة لأسواق اليابان والصين وهونغ كونغ وكوريا الجنوبية وتايوان والهند وسنغافورة، مع أهم الأخبار المؤثرة وحركة المؤشرات الرئيسية.',
    badge: 'Asia Market Intelligence',
    method: 'تُجمع الأخبار من مصادر مالية متعددة ثم تُفلتر لتبقى مرتبطة فعليًا بالأسواق الآسيوية. شريط المؤشرات يستخدم أسعارًا سوقية فعلية أو متأخرة من المزود ولا يعرض أرقامًا وهمية.',
    ticker: 'المؤشرات الآسيوية الرئيسية',
    search: 'ابحث عن دولة، سوق، شركة، رمز أو مؤشر...',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث...',
    updated: 'آخر تحديث',
    results: 'نتيجة',
    source: 'المصدر',
    official: 'مصدر رسمي',
    read: 'فتح الخبر الأصلي',
    noSummary: 'لا يتوفر ملخص إضافي لهذا الخبر.',
    unavailable: 'غير متاح',
    loadError: 'تعذر تحميل أخبار السوق الآسيوي حاليًا.',
    stale: 'تعذر التحديث الآن؛ يتم عرض آخر نتائج ناجحة في هذه الجلسة.',
    partial: 'بعض مصادر الأخبار غير متاحة حاليًا؛ المعروض من المصادر التي استجابت.',
    empty: 'لا توجد أخبار آسيوية مطابقة حاليًا.',
    emptyHint: 'حدّث لاحقًا؛ لا يتم إدراج أخبار غير مرتبطة لمجرد ملء الصفحة.',
  },
  en: {
    title: 'Asian Market News',
    subtitle: 'Continuously refreshed coverage of Japan, China, Hong Kong, South Korea, Taiwan, India, and Singapore, with major market-moving stories and index moves.',
    badge: 'Asia Market Intelligence',
    method: 'News is aggregated from multiple financial sources and filtered for a real Asia-market link. The index ticker uses actual or provider-delayed market quotes and never inserts synthetic prices.',
    ticker: 'Major Asian indices',
    search: 'Search country, market, company, ticker, or index...',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    updated: 'Last updated',
    results: 'results',
    source: 'Source',
    official: 'Official source',
    read: 'Open original story',
    noSummary: 'No additional summary is available for this story.',
    unavailable: 'Unavailable',
    loadError: 'Asian market news could not be loaded right now.',
    stale: 'Refresh failed; showing the last successful results from this session.',
    partial: 'Some news providers are unavailable; results are from providers that responded.',
    empty: 'No matching Asian market news is available right now.',
    emptyHint: 'Refresh later; unrelated stories are not inserted just to fill the page.',
  },
  fr: {
    title: 'Actualités des marchés asiatiques',
    subtitle: 'Couverture actualisée du Japon, de la Chine, de Hong Kong, de la Corée du Sud, de Taïwan, de l’Inde et de Singapour, avec les principaux mouvements d’indices.',
    badge: 'Asia Market Intelligence',
    method: 'Les actualités proviennent de plusieurs sources financières et sont filtrées pour conserver un lien réel avec les marchés asiatiques. Le bandeau utilise des cours réels ou différés du fournisseur.',
    ticker: 'Principaux indices asiatiques',
    search: 'Rechercher pays, marché, société, symbole ou indice...',
    refresh: 'Actualiser',
    refreshing: 'Actualisation...',
    updated: 'Dernière mise à jour',
    results: 'résultats',
    source: 'Source',
    official: 'Source officielle',
    read: 'Ouvrir l’article original',
    noSummary: 'Aucun résumé supplémentaire n’est disponible.',
    unavailable: 'Indisponible',
    loadError: 'Impossible de charger les actualités des marchés asiatiques.',
    stale: 'Échec de l’actualisation ; les derniers résultats réussis restent affichés.',
    partial: 'Certaines sources sont indisponibles ; les résultats proviennent des sources ayant répondu.',
    empty: 'Aucune actualité asiatique correspondante actuellement.',
    emptyHint: 'Actualisez plus tard ; aucun article hors sujet ne sera ajouté pour remplir la page.',
  },
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

export function AsiaMarketNewsPage() {
  const { lang: rawLang, dir } = useLanguage();
  const lang = normalizeLang(rawLang);
  const copy = COPY[lang];

  const [items, setItems] = useState<AsiaNewsItem[]>([]);
  const [tickerItems, setTickerItems] = useState<ApiTickerItem[]>([]);
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
      const params = new URLSearchParams({ lang });
      if (forceRefresh) params.set('refresh', '1');
      const response = await fetch(`/api/asia-market-news?${params.toString()}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({})) as AsiaNewsResponse;
      if (!response.ok || payload.success === false) throw new Error(payload.code || `http_${response.status}`);

      setItems(dedupeNewsItems(payload.items ?? []));
      setTickerItems(payload.tickerItems ?? []);
      setPartialFailure(Boolean(payload.partialFailure));
      setLastUpdated(payload.updatedAt ?? payload.lastSuccessfulUpdate ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'asia_news_load_failed');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

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
      ...(item.symbols ?? []),
      ...(item.companyNames ?? []),
      ...(item.countries ?? []),
      ...(item.marketCodes ?? []),
      ...(item.exchangeCodes ?? []),
      ...(item.sectors ?? []),
    ].some(value => String(value ?? '').toLowerCase().includes(normalized)));
  }, [items, query]);

  const tickerStripItems = useMemo<StockTickerStripItem[]>(() => tickerItems.map(item => ({
    symbol: item.symbol,
    name: item.name ?? item.symbol,
    assetType: item.assetType ?? 'unknown',
    currency: item.currency ?? null,
    price: item.price ?? null,
    changePercent: item.changePercent ?? null,
    source: item.source ?? null,
    available: item.available !== false,
    meta: item.meta ?? undefined,
  })), [tickerItems]);

  const showStale = Boolean(error && items.length > 0);
  const showError = Boolean(error && items.length === 0);

  return (
    <NewsPageShell category="europe" dir={dir} wide className={styles.page}>
      <main className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true"><Globe size={25} /></div>
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
            <span>{refreshing ? copy.refreshing : copy.refresh}</span>
          </button>
        </section>

        <section className={styles.methodCard}>
          <ShieldCheck size={19} aria-hidden="true" />
          <div>
            <strong>{copy.badge}</strong>
            <p>{copy.method}</p>
          </div>
        </section>

        <section className={styles.tickerSection} aria-label={copy.ticker}>
          <StockTickerStrip
            ariaLabel={copy.ticker}
            items={tickerStripItems}
            locale={localeFor(lang)}
            unavailableLabel={copy.unavailable}
            direction="ltr"
            durationSeconds={34}
            minimumItems={8}
          />
        </section>

        {partialFailure ? (
          <div className={styles.notice} role="status">
            <AlertTriangle size={17} />
            <span>{copy.partial}</span>
          </div>
        ) : null}
        {showStale ? (
          <div className={styles.notice} role="status">
            <AlertTriangle size={17} />
            <span>{copy.stale}</span>
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
            <span><Newspaper size={15} /> {filteredItems.length} {copy.results}</span>
            <span><Clock3 size={15} /> {copy.updated}: {formattedDate(lastUpdated, lang)}</span>
          </div>
        </section>

        {loading ? (
          <section className={styles.loadingGrid} aria-busy="true" aria-label={copy.refreshing}>
            {Array.from({ length: 6 }, (_, index) => <div className={styles.skeleton} key={index} />)}
          </section>
        ) : showError ? (
          <section className={styles.emptyState} role="alert">
            <AlertTriangle size={24} />
            <h2>{copy.loadError}</h2>
            <p>{copy.emptyHint}</p>
            <button type="button" onClick={() => void load(true)}>{copy.refresh}</button>
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
              const symbols = (item.symbols ?? []).slice(0, 4);
              const countries = (item.countries ?? []).slice(0, 2);

              return (
                <article className={styles.card} key={item.id}>
                  <div className={styles.cardTopline}>
                    <span className={styles.source}><Building2 size={14} /> {source}</span>
                    <span className={styles.date}><Clock3 size={14} /> {formattedDate(item.publishedAt, lang)}</span>
                  </div>

                  <div className={styles.tags}>
                    {item.isOfficial ? <span><ShieldCheck size={13} /> {copy.official}</span> : null}
                    {countries.map(country => <span key={`country-${country}`}>{country}</span>)}
                    {symbols.map(symbol => <span className={styles.ticker} key={symbol}>{symbol}</span>)}
                  </div>

                  <h2>{title}</h2>
                  <p className={styles.summary}>{item.summary || copy.noSummary}</p>

                  {item.companyNames?.length ? (
                    <p className={styles.companies}>{item.companyNames.slice(0, 3).join(' • ')}</p>
                  ) : null}

                  <div className={styles.cardFooter}>
                    {item.verificationStatus ? <span className={styles.verification}>{item.verificationStatus.replaceAll('_', ' ')}</span> : <span />}
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {copy.read} <ExternalLink size={14} />
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

export default AsiaMarketNewsPage;
