'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock3,
  Database,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { StockTickerStrip, type StockTickerStripItem } from '@/components/market/StockTickerStrip';
import { useLanguage } from '@/hooks/useLanguage';
import type { StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import styles from './StockCategoryScannerPanel.module.css';

type Lang = 'ar' | 'en' | 'fr';
type SortKey = 'marketCap' | 'change' | 'volume' | 'yield' | 'name';

type ScannerItem = {
  symbol: string;
  name: string;
  category: StockCategoryId;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: boolean;
  available: boolean;
  unavailableReason?: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  marketCap: number | null;
  volume: number | null;
  beta: number | null;
  lastAnnualDividend: number | null;
  dividendYieldPercent: number | null;
  revenueGrowthPercent: number | null;
  earningsGrowthPercent: number | null;
  operatingIncomeGrowthPercent: number | null;
  netIncomeGrowthPercent: number | null;
  growthPeriod: string | null;
  shariahStatus: string | null;
  shariahSource: string | null;
  shariahLastReviewedAt: string | null;
  classificationReason: string;
  screenBasis: string;
};

type ScannerResponse = {
  ok: boolean;
  status?: 'success' | 'degraded';
  code?: string | null;
  category?: StockCategoryId;
  source?: string;
  updated_at?: string;
  screening_mode?: string;
  universe_count?: number;
  matched_count?: number;
  returned_count?: number;
  available_count?: number;
  quote_enriched_count?: number;
  degraded_reason?: string | null;
  items?: ScannerItem[];
};

const PAGE_SIZE = 24;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const CATEGORY_LABELS: Record<StockCategoryId, Record<Lang, string>> = {
  energy: { ar: 'الطاقة', en: 'Energy', fr: 'Énergie' },
  banking: { ar: 'البنوك', en: 'Banking', fr: 'Banques' },
  sharia: { ar: 'الأسهم الشرعية', en: 'Sharia stocks', fr: 'Actions charia' },
  growth: { ar: 'أسهم النمو', en: 'Growth stocks', fr: 'Actions de croissance' },
  defensive: { ar: 'الأسهم الدفاعية', en: 'Defensive stocks', fr: 'Actions défensives' },
  cyclical: { ar: 'الأسهم الدورية', en: 'Cyclical stocks', fr: 'Actions cycliques' },
  dividend: { ar: 'أسهم الدخل المرتفع', en: 'High-income stocks', fr: 'Actions à revenu élevé' },
};

const COPY: Record<Lang, Record<string, string>> = {
  ar: {
    title: 'ماسح السوق الكامل',
    subtitle: 'فحص ديناميكي للسوق بدل قائمة ثابتة صغيرة، مع بيانات الشركات والأسعار ومصدر البيانات وحالة التغطية.',
    search: 'ابحث باسم الشركة أو الرمز أو القطاع...',
    allSectors: 'كل القطاعات',
    refresh: 'تحديث السكانر',
    refreshing: 'جارٍ التحديث...',
    autoRefresh: 'تحديث تلقائي كل 5 دقائق',
    universe: 'إجمالي السوق المفحوص',
    matches: 'الأسهم المطابقة',
    returned: 'المعروضة في السكانر',
    quotes: 'أسعار محدثة',
    source: 'المصدر',
    updated: 'آخر تحديث',
    degraded: 'السكانر يعمل بوضع احتياطي بسبب محدودية مزود البيانات؛ لا يتم إنشاء أسهم أو أرقام وهمية.',
    noData: 'لا توجد نتائج متاحة حاليًا لهذا التصنيف.',
    unavailable: 'غير متاح',
    marketCap: 'القيمة السوقية',
    volume: 'حجم التداول',
    beta: 'بيتا',
    dividendYield: 'عائد التوزيع',
    sector: 'القطاع',
    industry: 'النشاط',
    exchange: 'السوق',
    growth: 'نمو الإيرادات',
    earningsGrowth: 'نمو الأرباح',
    shariaStatus: 'الحالة الشرعية',
    loadMore: 'عرض المزيد',
    results: 'نتيجة',
    sortMarketCap: 'القيمة السوقية',
    sortChange: 'أقوى حركة',
    sortVolume: 'حجم التداول',
    sortYield: 'عائد التوزيع',
    sortName: 'الاسم',
    liveTicker: 'نبض أسعار الأسهم المطابقة',
  },
  en: {
    title: 'Full market scanner',
    subtitle: 'A dynamic market-wide scan instead of a small fixed list, with company data, quotes, provenance, and coverage status.',
    search: 'Search company, ticker, or sector...',
    allSectors: 'All sectors',
    refresh: 'Refresh scanner',
    refreshing: 'Refreshing...',
    autoRefresh: 'Auto-refresh every 5 minutes',
    universe: 'Market universe scanned',
    matches: 'Matching stocks',
    returned: 'Stocks in scanner',
    quotes: 'Updated quotes',
    source: 'Source',
    updated: 'Last updated',
    degraded: 'The scanner is using a degraded fallback because a provider is limited. No stocks or values are fabricated.',
    noData: 'No scanner results are available for this category right now.',
    unavailable: 'Unavailable',
    marketCap: 'Market cap',
    volume: 'Volume',
    beta: 'Beta',
    dividendYield: 'Dividend yield',
    sector: 'Sector',
    industry: 'Industry',
    exchange: 'Exchange',
    growth: 'Revenue growth',
    earningsGrowth: 'Earnings growth',
    shariaStatus: 'Sharia status',
    loadMore: 'Load more',
    results: 'results',
    sortMarketCap: 'Market cap',
    sortChange: 'Strongest move',
    sortVolume: 'Volume',
    sortYield: 'Dividend yield',
    sortName: 'Name',
    liveTicker: 'Matching-stock price pulse',
  },
  fr: {
    title: 'Scanner complet du marché',
    subtitle: 'Un scan dynamique du marché au lieu d’une petite liste fixe, avec données société, cours, provenance et couverture.',
    search: 'Rechercher société, symbole ou secteur...',
    allSectors: 'Tous les secteurs',
    refresh: 'Actualiser le scanner',
    refreshing: 'Actualisation...',
    autoRefresh: 'Actualisation automatique toutes les 5 minutes',
    universe: 'Univers analysé',
    matches: 'Actions correspondantes',
    returned: 'Actions dans le scanner',
    quotes: 'Cours actualisés',
    source: 'Source',
    updated: 'Dernière mise à jour',
    degraded: 'Le scanner utilise un mode de secours à cause d’une limite fournisseur. Aucune valeur fictive n’est créée.',
    noData: 'Aucun résultat de scanner disponible pour cette catégorie actuellement.',
    unavailable: 'Indisponible',
    marketCap: 'Capitalisation',
    volume: 'Volume',
    beta: 'Bêta',
    dividendYield: 'Rendement',
    sector: 'Secteur',
    industry: 'Activité',
    exchange: 'Marché',
    growth: 'Croissance CA',
    earningsGrowth: 'Croissance bénéfices',
    shariaStatus: 'Statut charia',
    loadMore: 'Afficher plus',
    results: 'résultats',
    sortMarketCap: 'Capitalisation',
    sortChange: 'Variation',
    sortVolume: 'Volume',
    sortYield: 'Rendement',
    sortName: 'Nom',
    liveTicker: 'Pouls des cours correspondants',
  },
};

function langCode(value: string): Lang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function localeFor(lang: Lang) {
  return lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(value: number | null, locale: string, maximumFractionDigits = 2) {
  if (!finite(value)) return null;
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits, notation: 'compact' }).format(value);
}

function formatPrice(value: number | null, currency: string, locale: string) {
  if (!finite(value)) return null;
  try {
    return new Intl.NumberFormat(`${locale}-u-nu-latn`, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value.toFixed(value < 1 ? 4 : 2)}`;
  }
}

function formatPercent(value: number | null, locale: string) {
  if (!finite(value)) return null;
  const body = new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
  return `${value > 0 ? '+' : ''}${body}%`;
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function statusLabel(status: string | null, lang: Lang) {
  if (!status) return null;
  const labels: Record<string, Record<Lang, string>> = {
    compliant: { ar: 'متوافق', en: 'Compliant', fr: 'Conforme' },
    needs_review: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À réviser' },
    non_compliant: { ar: 'غير متوافق', en: 'Non-compliant', fr: 'Non conforme' },
    unclassified: { ar: 'غير مصنف', en: 'Unclassified', fr: 'Non classé' },
  };
  return labels[status]?.[lang] ?? status.replaceAll('_', ' ');
}

export function StockCategoryScannerPanel({ category }: { category: StockCategoryId }) {
  const { lang: rawLang, dir } = useLanguage();
  const lang = langCode(rawLang);
  const copy = COPY[lang];
  const locale = localeFor(lang);
  const categoryLabel = CATEGORY_LABELS[category][lang];

  const [data, setData] = useState<ScannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('all');
  const [sort, setSort] = useState<SortKey>(category === 'dividend' ? 'yield' : 'marketCap');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async (force = false) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    if (force) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ category, limit: '500' });
      if (force) params.set('refresh', '1');
      const response = await fetch(`/api/stock-categories/scanner?${params.toString()}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
        cache: force ? 'no-store' : 'default',
      });
      const payload = await response.json().catch(() => ({})) as ScannerResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.code || `scanner_http_${response.status}`);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'scanner_load_failed');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => void load(false), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, sector, sort]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const sectors = useMemo(() => [...new Set(items.map(item => item.sector).filter((value): value is string => Boolean(value)))].sort(), [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = items.filter(item => {
      if (sector !== 'all' && item.sector !== sector) return false;
      if (!needle) return true;
      return [item.symbol, item.name, item.sector, item.industry, item.exchange, item.classificationReason]
        .some(value => String(value ?? '').toLowerCase().includes(needle));
    });

    return rows.sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name);
      if (sort === 'change') return Math.abs(right.changePercent ?? -Infinity) - Math.abs(left.changePercent ?? -Infinity);
      if (sort === 'volume') return (right.volume ?? -1) - (left.volume ?? -1);
      if (sort === 'yield') return (right.dividendYieldPercent ?? -1) - (left.dividendYieldPercent ?? -1);
      return (right.marketCap ?? -1) - (left.marketCap ?? -1);
    });
  }, [items, query, sector, sort]);

  const tickerItems = useMemo<StockTickerStripItem[]>(() => items.slice(0, 60).map(item => ({
    symbol: item.symbol,
    name: item.name,
    assetType: 'stock',
    price: item.price,
    currency: item.currency,
    changePercent: item.changePercent,
    source: item.source,
    available: item.available,
    meta: item.sector ?? undefined,
  })), [items]);

  const pageRows = filtered.slice(0, visible);

  return (
    <section className={styles.shell} dir={dir} data-category={category}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.icon}><Database size={22} /></span>
            <div>
              <p className={styles.kicker}>{categoryLabel}</p>
              <h2>{copy.title}</h2>
              <p>{copy.subtitle}</p>
            </div>
          </div>
          <button className={styles.refresh} type="button" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCcw size={16} className={refreshing ? styles.spin : undefined} />
            {refreshing ? copy.refreshing : copy.refresh}
          </button>
        </header>

        <div className={styles.metaRow}>
          <span><Clock3 size={14} /> {copy.autoRefresh}</span>
          <span>{copy.updated}: {formatDate(data?.updated_at, locale)}</span>
          <span>{copy.source}: {data?.source ?? '—'}</span>
        </div>

        {data?.status === 'degraded' ? (
          <div className={styles.warning}><AlertTriangle size={17} /><span>{copy.degraded}</span></div>
        ) : null}
        {error && !data ? (
          <div className={styles.warning}><AlertTriangle size={17} /><span>{copy.noData}</span></div>
        ) : null}

        <div className={styles.stats}>
          <Stat label={copy.universe} value={data?.universe_count} />
          <Stat label={copy.matches} value={data?.matched_count} />
          <Stat label={copy.returned} value={data?.returned_count} />
          <Stat label={copy.quotes} value={data?.quote_enriched_count} />
        </div>

        {tickerItems.length > 0 ? (
          <div className={styles.ticker}>
            <StockTickerStrip
              ariaLabel={copy.liveTicker}
              items={tickerItems}
              locale={locale}
              unavailableLabel={copy.unavailable}
              direction="ltr"
              durationSeconds={38}
              minimumItems={12}
            />
          </div>
        ) : null}

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} type="search" />
          </label>
          <label className={styles.selectWrap}>
            <Filter size={16} />
            <select value={sector} onChange={event => setSector(event.target.value)}>
              <option value="all">{copy.allSectors}</option>
              {sectors.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <select className={styles.sort} value={sort} onChange={event => setSort(event.target.value as SortKey)} aria-label="sort">
            <option value="marketCap">{copy.sortMarketCap}</option>
            <option value="change">{copy.sortChange}</option>
            <option value="volume">{copy.sortVolume}</option>
            <option value="yield">{copy.sortYield}</option>
            <option value="name">{copy.sortName}</option>
          </select>
        </div>

        <div className={styles.resultMeta}>
          <strong>{filtered.length}</strong> {copy.results}
          {data?.screening_mode ? <span>{data.screening_mode.replaceAll('_', ' ')}</span> : null}
        </div>

        {loading && !data ? (
          <div className={styles.skeletonGrid}>{Array.from({ length: 8 }, (_, index) => <div key={index} className={styles.skeleton} />)}</div>
        ) : pageRows.length === 0 ? (
          <div className={styles.empty}>{copy.noData}</div>
        ) : (
          <div className={styles.grid}>
            {pageRows.map(item => <ScannerCard key={item.symbol} item={item} copy={copy} lang={lang} locale={locale} />)}
          </div>
        )}

        {visible < filtered.length ? (
          <button className={styles.loadMore} type="button" onClick={() => setVisible(value => value + PAGE_SIZE)}>
            {copy.loadMore} ({Math.min(PAGE_SIZE, filtered.length - visible)})
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return <div className={styles.stat}><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString('en-US') : '—'}</strong></div>;
}

function ScannerCard({ item, copy, lang, locale }: { item: ScannerItem; copy: Record<string, string>; lang: Lang; locale: string }) {
  const direction = finite(item.changePercent) ? (item.changePercent > 0 ? 'up' : item.changePercent < 0 ? 'down' : 'flat') : 'flat';
  const price = formatPrice(item.price, item.currency, locale);
  const change = formatPercent(item.changePercent, locale);
  const cap = formatNumber(item.marketCap, locale, 1);
  const volume = formatNumber(item.volume, locale, 1);
  const beta = finite(item.beta) ? item.beta.toFixed(2) : null;
  const yieldText = formatPercent(item.dividendYieldPercent, locale);
  const revenueGrowth = formatPercent(item.revenueGrowthPercent, locale);
  const earningsGrowth = formatPercent(item.earningsGrowthPercent, locale);
  const sharia = statusLabel(item.shariahStatus, lang);
  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Activity;

  return (
    <article className={styles.card} data-direction={direction}>
      <div className={styles.cardHead}>
        <AssetIdentity symbol={item.symbol} name={item.name} assetType="stock" variant="badge" size="sm" showName={false} />
        <div className={styles.identity}>
          <strong dir="ltr">{item.symbol}</strong>
          <span>{item.name}</span>
        </div>
        <span className={styles.move} data-direction={direction}><TrendIcon size={14} /> {change ?? copy.unavailable}</span>
      </div>

      <div className={styles.priceRow}>
        <strong dir="ltr">{price ?? copy.unavailable}</strong>
        <small>{item.source}</small>
      </div>

      <dl className={styles.metrics}>
        <Metric label={copy.marketCap} value={cap} />
        <Metric label={copy.volume} value={volume} />
        <Metric label={copy.beta} value={beta} />
        <Metric label={copy.dividendYield} value={yieldText} />
        {revenueGrowth ? <Metric label={copy.growth} value={revenueGrowth} /> : null}
        {earningsGrowth ? <Metric label={copy.earningsGrowth} value={earningsGrowth} /> : null}
        {sharia ? <Metric label={copy.shariaStatus} value={sharia} /> : null}
      </dl>

      <div className={styles.tags}>
        {item.exchange ? <span><Building2 size={12} /> {item.exchange}</span> : null}
        {item.sector ? <span>{item.sector}</span> : null}
        {item.industry ? <span>{item.industry}</span> : null}
        {item.shariahStatus === 'compliant' ? <span className={styles.compliant}><ShieldCheck size={12} /> {sharia}</span> : null}
      </div>

      <p className={styles.reason}>{item.classificationReason}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | null }) {
  return <div><dt>{label}</dt><dd dir="ltr">{value ?? '—'}</dd></div>;
}

export default StockCategoryScannerPanel;
