'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { MarketStripItem } from '@/components/market/MarketStripItem';
import { GLOBAL_MARKET_STRIPS, SECTOR_LABEL, type GlobalMarketSector, type GlobalMarketStripKind } from '@/lib/market/globalMarketStrips';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';
import { EMPTY_DIRECTORY_FILTERS, type GlobalDirectoryRow, type GlobalDirectoryFilters } from '@/lib/market/globalMarketDirectoryTypes';
import { useGlobalDirectoryPrices, useGlobalMarketDirectory } from '@/hooks/useGlobalMarketDirectory';
import { deferUntilStreamSettled } from '@/lib/runtime/deferUntilStreamSettled';

export type GlobalExplorerRequest = { id: string; sequence: number };
type GlobalMarketsExplorerProps = { prices: Record<string, TechStockPrice> | null; lang: Lang; dir: 'rtl' | 'ltr'; browseRequest?: GlobalExplorerRequest | null };
const SECTOR_OPTIONS = Object.keys(SECTOR_LABEL) as GlobalMarketSector[];
const ASSET_TYPE_LABEL_KEY: Record<GlobalMarketStripKind, string> = {
  equity: 'global_markets_asset_type_equity', forex: 'global_markets_asset_type_forex', commodity: 'global_markets_asset_type_commodity', crypto: 'global_markets_asset_type_crypto', index: 'global_markets_asset_type_index',
};
const EMPTY_ROWS: GlobalDirectoryRow[] = [];
const COPY = {
  ar: { loading: 'جارٍ تحميل دليل الأسهم…', retry: 'إعادة المحاولة', error: 'تعذّر تحميل الدليل. أعد المحاولة.', partial: 'هذا السوق يعرض قائمة مختصرة؛ لم يُربط دليله الكامل بعد.', unavailable: 'لم يُربط دليل الأسهم والأسعار لهذا السوق بعد.', directory: 'البحث يشمل دليل السوق، وليس الأسهم المختارة للشريط فقط.', snapshot: 'نعرض نسخة محفوظة من دليل الأسهم.', mixed: 'بعض الأسواق ما زالت بقوائم مختصرة. اختر سوقاً لعرض حالة دليله.', quotes: 'جارٍ تحميل أسعار النتائج…', quoteError: 'تعذّر تحديث بعض الأسعار. دليل الأسهم متاح.', quoted: 'الأسعار حسب تغطية المصدر وقد تتأخر؛ غياب السعر لا يعني غياب السهم من البورصة.', source: 'مصدر الدليل', sync: 'تاريخ المزامنة' },
  en: { loading: 'Loading the stock directory…', retry: 'Try again', error: 'The directory could not be loaded. Try again.', partial: 'This market has a selected list; its full directory is not connected yet.', unavailable: 'This market’s stock directory and prices are not connected yet.', directory: 'Search covers the market directory, beyond the ticker selection.', snapshot: 'Showing a saved stock directory.', mixed: 'Some markets still have selected lists. Choose a market to view its directory status.', quotes: 'Loading prices for these results…', quoteError: 'Some prices could not be refreshed. The stock directory is available.', quoted: 'Prices depend on provider coverage and may be delayed; a missing price does not mean a stock is unlisted.', source: 'Directory source', sync: 'Last synced' },
  fr: { loading: 'Chargement du répertoire…', retry: 'Réessayer', error: 'Le répertoire n’a pas pu être chargé.', partial: 'Ce marché présente une sélection ; son répertoire complet n’est pas encore connecté.', unavailable: 'Le répertoire et les cours de ce marché ne sont pas encore connectés.', directory: 'La recherche couvre le répertoire du marché, au-delà de la sélection du bandeau.', snapshot: 'Affichage d’une copie enregistrée du répertoire.', mixed: 'Certains marchés présentent encore une sélection. Choisissez un marché pour voir sa couverture.', quotes: 'Chargement des cours des résultats…', quoteError: 'Certains cours n’ont pas pu être actualisés. Le répertoire reste disponible.', quoted: 'Les cours dépendent de la couverture et peuvent être différés ; un cours absent ne signifie pas une radiation.', source: 'Source du répertoire', sync: 'Dernière synchronisation' },
} as const;
const COUNTRY_LABEL: Record<string, { ar: string; en: string; fr: string }> = {
  EG: { ar: 'مصر', en: 'Egypt', fr: 'Égypte' },
  JO: { ar: 'الأردن', en: 'Jordan', fr: 'Jordanie' },
  MA: { ar: 'المغرب', en: 'Morocco', fr: 'Maroc' },
  KW: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
  SA: { ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' },
  AE: { ar: 'الإمارات', en: 'UAE', fr: 'Émirats arabes unis' },
  QA: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
  BH: { ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' },
  OM: { ar: 'عُمان', en: 'Oman', fr: 'Oman' },
  US: { ar: 'الولايات المتحدة', en: 'United States', fr: 'États-Unis' },
  JP: { ar: 'اليابان', en: 'Japan', fr: 'Japon' },
  CN: { ar: 'الصين', en: 'China', fr: 'Chine' },
  HK: { ar: 'هونغ كونغ', en: 'Hong Kong', fr: 'Hong Kong' },
  IN: { ar: 'الهند', en: 'India', fr: 'Inde' },
  KR: { ar: 'كوريا الجنوبية', en: 'South Korea', fr: 'Corée du Sud' },
  CA: { ar: 'كندا', en: 'Canada', fr: 'Canada' },
  AU: { ar: 'أستراليا', en: 'Australia', fr: 'Australie' },
};

export const GlobalMarketsExplorerItem = memo(function GlobalMarketsExplorerItem({ row, quote, loading, lang }: { row: GlobalDirectoryRow; quote?: TechStockPrice; loading: boolean; lang: Lang }) {
  return <MarketStripItem lang={lang} item={{ symbol: row.symbol, name: lang === 'ar' ? row.nameAr || row.name : row.name, sector: row.sector, assetType: row.kind, price: quote?.available ? quote.price : null, currency: row.currency, priceUnit: row.priceUnit, changePercent: quote?.available ? quote.changePercent : null, available: Boolean(quote?.available), loading }} />;
});

export function GlobalMarketsExplorer({ prices, lang, dir, browseRequest }: GlobalMarketsExplorerProps) {
  const copy = COPY[lang];
  const sectionRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [filters, setFilters] = useState<GlobalDirectoryFilters>({ ...EMPTY_DIRECTORY_FILTERS });
  const [isMobile, setIsMobile] = useState(false);
  const directory = useGlobalMarketDirectory(expanded, filters);
  const rows = directory.page?.items || EMPTY_ROWS;
  const quotes = useGlobalDirectoryPrices(rows, prices);
  const coverage = directory.page?.coverage || [];
  const selectedCoverage = coverage.length === 1 ? coverage[0] : null;
  const feedback = selectedCoverage?.status === 'unavailable' ? copy.unavailable : selectedCoverage?.status === 'selected' ? copy.partial : selectedCoverage?.status === 'snapshot' ? copy.snapshot : copy.directory;
  const countryOptions = useMemo(() => [...new Set(GLOBAL_MARKET_STRIPS.map(strip => strip.countryCode).filter((code): code is string => Boolean(code)))].sort(), []);
  const exchangeOptions = useMemo(() => GLOBAL_MARKET_STRIPS.filter(strip => filters.country === 'all' || strip.countryCode === filters.country), [filters.country]);

  // A visible SSR control must not accept a click before its handlers are live.
  // Wait for this component and its streamed parent, not for remote market data.
  useEffect(() => deferUntilStreamSettled(() => setInteractive(true)), []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!browseRequest) return;
    setFilters({ ...EMPTY_DIRECTORY_FILTERS, exchange: browseRequest.id });
    setExpanded(true);
    sectionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [browseRequest]);
  function updateFilter(key: keyof GlobalDirectoryFilters, value: string) {
    setFilters(current => ({ ...current, [key]: value, ...(key === 'country' ? { exchange: 'all' } : {}) }));
    setExpanded(true);
  }

  return (
    <section className="gm-explorer" aria-labelledby="gm-explorer-heading" dir={dir} ref={sectionRef}>
      <h2 className="gm-explorer-heading" id="gm-explorer-heading">{t('global_markets_explorer_heading', lang)}</h2>
      <div className="gm-explorer-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" disabled={!interactive} value={filters.query} onChange={event => updateFilter('query', event.target.value)} placeholder={t('global_markets_search_placeholder', lang)} aria-label={t('global_markets_search_placeholder', lang)} dir="auto" />
      </div>
      <button type="button" className="gm-explorer-toggle" disabled={!interactive} aria-busy={!interactive} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        {lang === 'ar' ? (expanded ? 'إخفاء مستكشف الأصول' : 'عرض مستكشف الأصول') : lang === 'fr' ? (expanded ? 'Masquer l’explorateur' : 'Afficher l’explorateur') : (expanded ? 'Hide asset explorer' : 'Browse all assets')}
      </button>
      {expanded ? <>
        <div className="gm-explorer-filters">
          <label className="gm-explorer-filter"><span>{t('global_markets_filter_country', lang)}</span>
            <select value={filters.country} onChange={event => updateFilter('country', event.target.value)}>
              <option value="all">{t('global_markets_filter_all', lang)}</option>
              {countryOptions.map(code => <option key={code} value={code}>{COUNTRY_LABEL[code]?.[lang] || code}</option>)}
            </select>
          </label>
          <label className="gm-explorer-filter"><span>{t('global_markets_filter_exchange', lang)}</span>
            <select value={filters.exchange} onChange={event => updateFilter('exchange', event.target.value)}>
              <option value="all">{t('global_markets_filter_all', lang)}</option>
              {exchangeOptions.map(strip => <option key={strip.id} value={strip.id}>{lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn}</option>)}
            </select>
          </label>
          <label className="gm-explorer-filter"><span>{t('global_markets_filter_sector', lang)}</span>
            <select value={filters.sector} onChange={event => updateFilter('sector', event.target.value)}>
              <option value="all">{t('global_markets_filter_all', lang)}</option>
              {SECTOR_OPTIONS.map(option => <option key={option} value={option}>{SECTOR_LABEL[option][lang]}</option>)}
            </select>
          </label>
          <label className="gm-explorer-filter"><span>{t('global_markets_filter_asset_type', lang)}</span>
            <select value={filters.assetType} onChange={event => updateFilter('assetType', event.target.value)}>
              <option value="all">{t('global_markets_filter_all', lang)}</option>
              {(Object.keys(ASSET_TYPE_LABEL_KEY) as GlobalMarketStripKind[]).map(kind => <option key={kind} value={kind}>{t(ASSET_TYPE_LABEL_KEY[kind], lang)}</option>)}
            </select>
          </label>
          <button type="button" className="gm-explorer-reset" onClick={() => setFilters({ ...EMPTY_DIRECTORY_FILTERS })} disabled={Object.entries(filters).every(([key, value]) => value === EMPTY_DIRECTORY_FILTERS[key as keyof GlobalDirectoryFilters])}>{t('global_markets_reset_filters', lang)}</button>
        </div>
        <div className="gm-directory-feedback" aria-live="polite">
          <p className="gm-explorer-count">{directory.loading ? copy.loading : directory.page ? t('global_markets_results_count', lang).replace('{count}', String(directory.page.total)) : ''}</p>
          {directory.page ? <>
            <p>{feedback} {coverage.length > 1 && coverage.some(item => item.status === 'selected' || item.status === 'unavailable') ? copy.mixed : ''}</p>
            {selectedCoverage?.asOf ? <p>{copy.sync}: <time dateTime={selectedCoverage.asOf}>{new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : lang, { dateStyle: 'medium' }).format(new Date(selectedCoverage.asOf))}</time></p> : null}
          </> : null}
          {directory.error ? <p role="alert">{copy.error} <button type="button" className="gm-explorer-reset" onClick={directory.page ? () => void directory.loadMore(isMobile) : directory.retry}>{copy.retry}</button></p> : null}
        </div>
        {directory.loading ? <div className="gm-directory-loading" role="status">{copy.loading}</div> : rows.length ? <>
          <div className="gm-explorer-grid" aria-busy={directory.appending}>
            {rows.map(row => <GlobalMarketsExplorerItem key={row.id} row={row} lang={lang} quote={quotes.prices[row.providerSymbol]} loading={quotes.loading && !quotes.prices[row.providerSymbol]} />)}
          </div>
          <p className="gm-directory-quotes" role="status">{quotes.loading ? copy.quotes : quotes.error ? <>{copy.quoteError} <button className="gm-explorer-reset" type="button" onClick={quotes.retry}>{copy.retry}</button></> : copy.quoted}</p>
          {directory.page?.nextOffset !== null ? <button type="button" className="gm-explorer-load-more" disabled={directory.appending} aria-busy={directory.appending} onClick={() => void directory.loadMore(isMobile)}>
            <span className="gm-explorer-load-label">{t('global_markets_load_more', lang)}</span>
            <span className="gm-explorer-load-status" aria-live="polite">{directory.appending ? copy.loading : ''}</span>
          </button> : <p className="gm-explorer-all-loaded" role="status">{t('global_markets_all_loaded', lang)}</p>}
        </> : !directory.error && !directory.loading ? <div className="gm-explorer-empty" role="status"><strong>{t('global_markets_no_results', lang)}</strong><span>{selectedCoverage?.status === 'unavailable' ? copy.unavailable : t('global_markets_no_results_hint', lang)}</span></div> : null}
      </> : null}
      <style jsx>{`
        .gm-directory-feedback, .gm-directory-quotes { color: var(--foreground-muted); font-size: 13px; line-height: 1.7; }
        .gm-directory-feedback p { margin: 0; }
        .gm-directory-loading { min-block-size: 196px; display: grid; place-items: center; color: var(--foreground-muted); }
        .gm-explorer {
          display: grid;
          gap: 14px;
        }
        .gm-explorer-heading {
          margin: 0;
          color: var(--foreground);
          font-size: 16px;
          font-weight: 700;
        }
        .gm-explorer-search {
          min-block-size: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface);
          color: var(--foreground-muted);
        }
        .gm-explorer-search input {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--foreground);
          font-size: 16px;
          outline: none;
          min-width: 0;
        }
        .gm-explorer-filters {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 10px;
        }
        .gm-explorer-filter {
          flex: 1 1 140px;
          min-inline-size: 0;
          display: grid;
          gap: 4px;
          max-inline-size: 100%;
        }
        .gm-explorer-filter span {
          color: var(--foreground-muted);
          font-size: 11.5px;
          font-weight: 600;
        }
        .gm-explorer-filter select {
          inline-size: 100%;
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface);
          color: var(--foreground);
          font-size: 13px;
        }
        .gm-explorer-reset {
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .gm-explorer-toggle {
          justify-self: start;
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-muted);
          color: var(--foreground);
          font-weight: 650;
          cursor: pointer;
        }
        .gm-explorer-count {
          margin: 0;
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 500;
        }
        .gm-explorer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .gm-explorer-grid :global(.gm-strip-item) {
          inline-size: 100%;
          max-inline-size: 100%;
        }
        .gm-explorer-grid > :global(*) {
          content-visibility: auto;
          contain-intrinsic-size: auto 92px;
        }
        .gm-explorer-load-more {
          justify-self: center;
          min-height: 40px;
          padding: 0 20px;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface);
          color: var(--foreground);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          min-width: 150px;
          position: relative;
        }
        .gm-explorer-load-more:disabled { cursor: wait; opacity: .72; }
        .gm-explorer-load-label { visibility: visible; }
        .gm-explorer-load-status {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          visibility: hidden;
        }
        .gm-explorer-load-more[aria-busy='true'] .gm-explorer-load-label { visibility: hidden; }
        .gm-explorer-load-more[aria-busy='true'] .gm-explorer-load-status { visibility: visible; }
        .gm-explorer-reset:disabled { opacity: .5; cursor: default; }
        @media(max-width:430px) {
          .gm-explorer-grid > :global(*) { contain-intrinsic-size: auto 74px; }
        }
        .gm-explorer-all-loaded {
          text-align: center;
          margin: 0;
          color: var(--foreground-muted);
          font-size: 12.5px;
        }
        .gm-explorer-empty {
          display: grid;
          gap: 4px;
          padding: 20px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius-card);
          background: var(--surface-muted);
          text-align: center;
        }
        .gm-explorer-empty strong {
          color: var(--foreground);
          font-size: 14px;
        }
        .gm-explorer-empty span {
          color: var(--foreground-muted);
          font-size: 12.5px;
        }
      `}</style>
    </section>
  );
}

export default GlobalMarketsExplorer;
