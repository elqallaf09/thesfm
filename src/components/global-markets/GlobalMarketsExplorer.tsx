'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { MarketStripItem } from '@/components/market/MarketStripItem';
import {
  GLOBAL_MARKET_STRIPS,
  SECTOR_LABEL,
  inferStripCurrency,
  type GlobalMarketSector,
  type GlobalMarketStripKind,
} from '@/lib/market/globalMarketStrips';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type GlobalMarketsExplorerProps = {
  prices: Record<string, TechStockPrice> | null;
  lang: Lang;
  dir: 'rtl' | 'ltr';
};

type ExplorerRow = {
  symbol: string;
  name: string;
  searchText: string;
  sector?: GlobalMarketSector;
  countryCode: string | null;
  stripId: string;
  stripLabel: string;
  kind: GlobalMarketStripKind;
};

const PAGE_SIZE = 12;
const ASSET_TYPE_LABEL_KEY: Record<GlobalMarketStripKind, string> = {
  equity: 'global_markets_asset_type_equity',
  forex: 'global_markets_asset_type_forex',
  commodity: 'global_markets_asset_type_commodity',
  crypto: 'global_markets_asset_type_crypto',
  index: 'global_markets_asset_type_index',
};

const COUNTRY_LABEL: Record<string, { ar: string; en: string; fr: string }> = {
  US: { ar: 'الولايات المتحدة', en: 'United States', fr: 'États-Unis' },
  JP: { ar: 'اليابان', en: 'Japan', fr: 'Japon' },
  CN: { ar: 'الصين', en: 'China', fr: 'Chine' },
  HK: { ar: 'هونغ كونغ', en: 'Hong Kong', fr: 'Hong Kong' },
  IN: { ar: 'الهند', en: 'India', fr: 'Inde' },
  KR: { ar: 'كوريا الجنوبية', en: 'South Korea', fr: 'Corée du Sud' },
  CA: { ar: 'كندا', en: 'Canada', fr: 'Canada' },
  AU: { ar: 'أستراليا', en: 'Australia', fr: 'Australie' },
};

function buildRows(lang: Lang): ExplorerRow[] {
  return GLOBAL_MARKET_STRIPS.flatMap(strip => {
    const stripLabel = lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
    return strip.items.map(item => {
      const name = lang === 'ar' ? item.nameAr : item.name;
      return {
        symbol: item.symbol,
        name,
        searchText: `${item.symbol} ${item.name} ${item.nameAr}`.toLowerCase(),
        sector: item.sector,
        countryCode: strip.countryCode,
        stripId: strip.id,
        stripLabel,
        kind: strip.kind,
      };
    });
  });
}

export function GlobalMarketsExplorer({ prices, lang, dir }: GlobalMarketsExplorerProps) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('all');
  const [exchange, setExchange] = useState('all');
  const [sector, setSector] = useState('all');
  const [assetType, setAssetType] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const rows = useMemo(() => buildRows(lang), [lang]);

  const countryOptions = useMemo(() => (
    Array.from(new Set(rows.map(row => row.countryCode).filter((code): code is string => Boolean(code))))
      .sort((a, b) => a.localeCompare(b))
  ), [rows]);

  const exchangeOptions = useMemo(() => (
    GLOBAL_MARKET_STRIPS.map(strip => ({
      id: strip.id,
      label: lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn,
    }))
  ), [lang]);

  const sectorOptions = Object.keys(SECTOR_LABEL) as GlobalMarketSector[];

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter(row => {
      if (country !== 'all' && row.countryCode !== country) return false;
      if (exchange !== 'all' && row.stripId !== exchange) return false;
      if (sector !== 'all' && row.sector !== sector) return false;
      if (assetType !== 'all' && row.kind !== assetType) return false;
      if (normalizedQuery && !row.searchText.includes(normalizedQuery)) return false;
      return true;
    });
  }, [rows, query, country, exchange, sector, assetType]);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRows.length;

  function resetFilters() {
    setQuery('');
    setCountry('all');
    setExchange('all');
    setSector('all');
    setAssetType('all');
    setVisibleCount(PAGE_SIZE);
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="gm-explorer" aria-labelledby="gm-explorer-heading" dir={dir}>
      <h2 className="gm-explorer-heading" id="gm-explorer-heading">{t('global_markets_explorer_heading', lang)}</h2>

      <div className="gm-explorer-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={event => updateFilter(setQuery, event.target.value)}
          placeholder={t('global_markets_search_placeholder', lang)}
          dir="auto"
        />
      </div>

      <div className="gm-explorer-filters">
        <label className="gm-explorer-filter">
          <span>{t('global_markets_filter_country', lang)}</span>
          <select value={country} onChange={event => updateFilter(setCountry, event.target.value)}>
            <option value="all">{t('global_markets_filter_all', lang)}</option>
            {countryOptions.map(code => (
              <option key={code} value={code}>{COUNTRY_LABEL[code]?.[lang] ?? code}</option>
            ))}
          </select>
        </label>

        <label className="gm-explorer-filter">
          <span>{t('global_markets_filter_exchange', lang)}</span>
          <select value={exchange} onChange={event => updateFilter(setExchange, event.target.value)}>
            <option value="all">{t('global_markets_filter_all', lang)}</option>
            {exchangeOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="gm-explorer-filter">
          <span>{t('global_markets_filter_sector', lang)}</span>
          <select value={sector} onChange={event => updateFilter(setSector, event.target.value)}>
            <option value="all">{t('global_markets_filter_all', lang)}</option>
            {sectorOptions.map(option => (
              <option key={option} value={option}>{SECTOR_LABEL[option][lang]}</option>
            ))}
          </select>
        </label>

        <label className="gm-explorer-filter">
          <span>{t('global_markets_filter_asset_type', lang)}</span>
          <select value={assetType} onChange={event => updateFilter(setAssetType, event.target.value)}>
            <option value="all">{t('global_markets_filter_all', lang)}</option>
            {(Object.keys(ASSET_TYPE_LABEL_KEY) as GlobalMarketStripKind[]).map(kind => (
              <option key={kind} value={kind}>{t(ASSET_TYPE_LABEL_KEY[kind], lang)}</option>
            ))}
          </select>
        </label>

        {(query || country !== 'all' || exchange !== 'all' || sector !== 'all' || assetType !== 'all') ? (
          <button type="button" className="gm-explorer-reset" onClick={resetFilters}>
            {t('global_markets_reset_filters', lang)}
          </button>
        ) : null}
      </div>

      <p className="gm-explorer-count" dir="auto">
        {t('global_markets_results_count', lang).replace('{count}', String(filteredRows.length))}
      </p>

      {filteredRows.length === 0 ? (
        <div className="gm-explorer-empty" role="status">
          <strong>{t('global_markets_no_results', lang)}</strong>
          <span>{t('global_markets_no_results_hint', lang)}</span>
        </div>
      ) : (
        <>
          <div className="gm-explorer-grid">
            {visibleRows.map(row => {
              const quote = prices?.[row.symbol] ?? null;
              return (
                <MarketStripItem
                  key={`${row.stripId}-${row.symbol}`}
                  lang={lang}
                  item={{
                    symbol: row.symbol,
                    name: row.name,
                    sector: row.sector,
                    price: quote?.available ? quote.price : null,
                    currency: inferStripCurrency(row.symbol),
                    changePercent: quote?.available ? quote.changePercent : null,
                    available: Boolean(quote?.available),
                  }}
                />
              );
            })}
          </div>

          {hasMore ? (
            <button
              type="button"
              className="gm-explorer-load-more"
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
            >
              {t('global_markets_load_more', lang)}
            </button>
          ) : (
            <p className="gm-explorer-all-loaded" role="status">{t('global_markets_all_loaded', lang)}</p>
          )}
        </>
      )}

      <style jsx>{`
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
          font-size: 13.5px;
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
          display: grid;
          gap: 4px;
          min-width: 140px;
        }

        .gm-explorer-filter span {
          color: var(--foreground-muted);
          font-size: 11.5px;
          font-weight: 600;
        }

        .gm-explorer-filter select {
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
