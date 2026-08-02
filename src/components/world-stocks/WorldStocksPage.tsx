'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock3, Globe, RefreshCcw, Search, X } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { useLanguage } from '@/hooks/useLanguage';
import { WORLD_STOCK_REGIONS } from '@/lib/world-stocks/regions';
import type { WorldStock, WorldStockAssetType, WorldStockSearchResponse } from '@/lib/world-stocks/types';
import styles from './WorldStocksPage.module.css';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

const COPY = {
  ar: {
    title: 'مستكشف الأسهم العالمية',
    subtitle: 'ابحث واستكشف الشركات المدرجة الحقيقية في الأسواق المدعومة دون بيانات وهمية.',
    coverageNote: 'التغطية الحالية: الكويت، سوق دبي المالي، ناسداك دبي، والأسواق الأمريكية.',
    searchPlaceholder: 'ابحث بالاسم أو الرمز أو السوق...',
    searchClear: 'مسح البحث',
    regionAll: 'كل الأسواق',
    resultsCount: '{count} شركة',
    priceUnavailable: 'السعر غير متاح',
    quoteLoading: 'جارٍ التحميل...',
    noResults: 'لا توجد نتائج مطابقة',
    noResultsHint: 'جرّب تغيير البحث أو الفلاتر.',
    error: 'تعذر تحميل بيانات الأسهم العالمية حالياً.',
    retry: 'إعادة المحاولة',
    viewDetails: 'عرض التفاصيل',
    loadMore: 'تحميل المزيد',
    allLoaded: 'تم عرض جميع النتائج المتاحة',
  },
  en: {
    title: 'World Stocks Explorer',
    subtitle: 'Search and explore real listed companies across supported markets -- no fabricated data.',
    coverageNote: 'Current coverage: Kuwait, Dubai Financial Market, Nasdaq Dubai, and US markets.',
    searchPlaceholder: 'Search by name, symbol, or exchange...',
    searchClear: 'Clear search',
    regionAll: 'All markets',
    resultsCount: '{count} companies',
    priceUnavailable: 'Price unavailable',
    quoteLoading: 'Loading...',
    noResults: 'No matching results',
    noResultsHint: 'Try changing the search or filters.',
    error: 'Could not load World Stocks data right now.',
    retry: 'Retry',
    viewDetails: 'View details',
    loadMore: 'Load more',
    allLoaded: 'All available results are shown',
  },
  fr: {
    title: 'Explorateur des actions mondiales',
    subtitle: 'Recherchez et explorez de vraies entreprises cotées sur les marchés pris en charge -- aucune donnée fabriquée.',
    coverageNote: 'Couverture actuelle : Koweït, Dubai Financial Market, Nasdaq Dubaï et marchés américains.',
    searchPlaceholder: 'Rechercher par nom, symbole ou marché...',
    searchClear: 'Effacer la recherche',
    regionAll: 'Tous les marchés',
    resultsCount: '{count} entreprises',
    priceUnavailable: 'Prix indisponible',
    quoteLoading: 'Chargement...',
    noResults: 'Aucun résultat correspondant',
    noResultsHint: 'Essayez de modifier la recherche ou les filtres.',
    error: 'Impossible de charger les données World Stocks pour le moment.',
    retry: 'Réessayer',
    viewDetails: 'Voir les détails',
    loadMore: 'Charger plus',
    allLoaded: 'Tous les résultats disponibles sont affichés',
  },
} as const;

function copyFor(lang: string) {
  if (lang === 'en') return COPY.en;
  if (lang === 'fr') return COPY.fr;
  return COPY.ar;
}

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
}

function replaceCount(template: string, count: number) {
  return template.replace('{count}', String(count));
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function WorldStocksPage() {
  const { dir, lang } = useLanguage();
  const ui = copyFor(lang);
  const locale = localeFor(lang);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [region, setRegion] = useState<string | null>(null);
  const [assetType] = useState<WorldStockAssetType | null>(null);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<WorldStock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (targetPage: number, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        query: debouncedQuery,
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
        lang,
      });
      if (region) params.set('region', region);
      if (assetType) params.set('assetType', assetType);

      const response = await fetch(`/api/world-stocks/search?${params.toString()}`, { signal: controller.signal });
      const json = await response.json().catch(() => ({})) as WorldStockSearchResponse;
      if (!response.ok || !json.success) {
        throw new Error(!json.success ? json.message : ui.error);
      }
      setResults(previous => (append ? [...previous, ...json.results] : json.results));
      setTotalCount(json.totalCount);
      setHasMore(json.hasMore);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      if (!append) setResults([]);
      setError(loadError instanceof Error ? loadError.message : ui.error);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [assetType, debouncedQuery, lang, region, ui.error]);

  useEffect(() => {
    setPage(1);
    void load(1, false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, region, assetType, lang]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void load(nextPage, true);
  };

  const formatPrice = useMemo(() => (value: number | null, currency: string | null) => {
    if (value === null || !currency) return ui.priceUnavailable;
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, numberingSystem: 'latn', maximumFractionDigits: value >= 100 ? 2 : 3 }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }, [locale, ui.priceUnavailable]);

  return (
    <DashboardPageShell ariaLabel={ui.title} className={styles.shell} dir={dir}>
      <header className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true"><Globe size={22} /></div>
        <div className={styles.headerCopy}>
          <h1>{ui.title}</h1>
          <p>{ui.subtitle}</p>
          <small>{ui.coverageNote}</small>
        </div>
      </header>

      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={ui.searchPlaceholder}
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')} aria-label={ui.searchClear}>
            <X size={15} />
          </button>
        ) : null}
      </label>

      <div className={`${styles.regionTabs} no-scrollbar`} role="tablist" aria-label={ui.title}>
        <button type="button" role="tab" aria-selected={region === null} className={region === null ? styles.active : ''} onClick={() => setRegion(null)}>
          {ui.regionAll}
        </button>
        {WORLD_STOCK_REGIONS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={region === item.id}
            className={region === item.id ? styles.active : ''}
            onClick={() => setRegion(item.id)}
          >
            {lang === 'ar' ? item.labelAr : lang === 'fr' ? item.labelFr : item.labelEn}
          </button>
        ))}
      </div>

      {error ? (
        <section className={styles.state} role="alert">
          <AlertTriangle size={22} />
          <p>{error}</p>
          <button type="button" onClick={() => void load(1, false)}>
            <RefreshCcw size={15} />
            {ui.retry}
          </button>
        </section>
      ) : loading && results.length === 0 ? (
        <section className={styles.resultsBar}>
          <span className={styles.skeletonLine} />
        </section>
      ) : results.length === 0 ? (
        <section className={styles.state}>
          <p>{ui.noResults}</p>
          <small>{ui.noResultsHint}</small>
        </section>
      ) : (
        <>
          <div className={styles.resultsBar}>
            <span>{replaceCount(ui.resultsCount, totalCount)}</span>
          </div>

          <ul className={styles.resultsGrid}>
            {results.map(stock => (
              <li key={`${stock.region}:${stock.canonicalSymbol}`} className={styles.resultCard}>
                <AssetIdentity
                  variant="badge"
                  symbol={stock.canonicalSymbol}
                  name={stock.displayName}
                  assetType={stock.assetType}
                  exchange={stock.exchangeName}
                  size="md"
                  className={styles.resultIdentity}
                />
                <div className={styles.resultMeta}>
                  <span>{stock.exchangeName}</span>
                  {stock.countryName ? <span>{stock.countryName}</span> : null}
                </div>
                <div className={styles.resultPrice}>
                  {stock.quoteStatus === 'available' ? (
                    <strong dir="ltr">{formatPrice(stock.price, stock.currency)}</strong>
                  ) : (
                    <span className={styles.priceUnavailable}>{ui.priceUnavailable}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.loadMoreWrap}>
            {hasMore ? (
              <button type="button" className={styles.loadMore} onClick={loadMore} disabled={loading}>
                {loading ? <Clock3 size={15} className={styles.spinning} /> : null}
                {ui.loadMore}
              </button>
            ) : (
              <span>{ui.allLoaded}</span>
            )}
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}

export default WorldStocksPage;
