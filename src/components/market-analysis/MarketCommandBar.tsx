'use client';

import type { KeyboardEvent } from 'react';
import { Activity, Search } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import type { useLanguage } from '@/hooks/useLanguage';
import { marketCurrencyLabel } from '@/lib/market/marketCurrency';
import type { MarketAssetFilter, MarketSearchSuggestion, MarketTimeframe } from './types';
import { MARKET_TIMEFRAMES, marketAssetTypeLabel } from './utils';
import styles from './MarketCommandBar.module.css';

type Translate = ReturnType<typeof useLanguage>['t'];

type MarketCommandBarProps = {
  t: Translate;
  lang: 'ar' | 'en' | 'fr';
  dir: 'rtl' | 'ltr';
  query: string;
  assetType: MarketAssetFilter;
  timeframe: MarketTimeframe;
  searchOpen: boolean;
  searchLoading: boolean;
  searchMessage: string;
  searchResults: MarketSearchSuggestion[];
  highlightedIndex: number;
  canSearch: boolean;
  analysisLoading: boolean;
  submitDisabled: boolean;
  loadingLabel: string;
  onQueryChange: (value: string) => void;
  onInputBlur: () => void;
  onInputFocus: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onAssetTypeChange: (value: MarketAssetFilter) => void;
  onTimeframeChange: (value: MarketTimeframe) => void;
  onHighlight: (index: number) => void;
  onSelectResult: (item: MarketSearchSuggestion) => void;
  onSubmit: () => void;
};

const ASSET_TYPE_OPTIONS: MarketAssetFilter[] = ['all', 'stock', 'etf', 'crypto', 'forex', 'commodity', 'gold', 'index'];

const ASSET_TYPE_LABEL_KEYS: Record<MarketAssetFilter, Parameters<Translate>[0]> = {
  all: 'market_asset_all',
  stock: 'market_asset_stocks',
  etf: 'market_asset_etf',
  crypto: 'market_asset_crypto',
  forex: 'market_asset_forex',
  commodity: 'market_asset_commodities',
  gold: 'market_asset_gold',
  index: 'market_asset_index',
};

export function MarketCommandBar({
  t,
  lang,
  dir,
  query,
  assetType,
  timeframe,
  searchOpen,
  searchLoading,
  searchMessage,
  searchResults,
  highlightedIndex,
  canSearch,
  analysisLoading,
  submitDisabled,
  loadingLabel,
  onQueryChange,
  onInputBlur,
  onInputFocus,
  onInputKeyDown,
  onAssetTypeChange,
  onTimeframeChange,
  onHighlight,
  onSelectResult,
  onSubmit,
}: MarketCommandBarProps) {
  const resultsVisible = searchOpen && canSearch;

  return (
    <section className={styles.shell} aria-labelledby="market-command-bar-title">
      <div className={styles.heading}>
        <div>
          <span>{t('market_command_bar_eyebrow')}</span>
          <h2 id="market-command-bar-title">{t('market_command_bar_title')}</h2>
        </div>
        <p>{t('market_command_bar_description')}</p>
      </div>

      <form
        className={styles.form}
        aria-label={t('market_command_bar_title')}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className={styles.searchField}>
          <label htmlFor="market-asset-search">{t('market_asset_symbol')}</label>
          <div className={styles.combobox}>
            <div className={styles.inputShell}>
              <Search size={18} aria-hidden="true" />
              <input
                id="market-asset-search"
                value={query}
                type="search"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={resultsVisible}
                aria-controls="market-search-results"
                aria-activedescendant={resultsVisible && searchResults[highlightedIndex] ? `market-search-option-${highlightedIndex}` : undefined}
                dir="ltr"
                onBlur={onInputBlur}
                onChange={(event) => onQueryChange(event.target.value)}
                onFocus={onInputFocus}
                onKeyDown={onInputKeyDown}
                placeholder={t('market_search_placeholder')}
              />
            </div>

            {resultsVisible ? (
              <div
                id="market-search-results"
                className={styles.results}
                role="listbox"
                aria-label={t('market_search_results')}
                dir={dir}
              >
                {searchLoading ? (
                  <div className={styles.resultState} role="option" aria-disabled="true" aria-selected="false">
                    <span role="status">{t('loading')}</span>
                  </div>
                ) : searchResults.length > 0 ? searchResults.map((item, index) => {
                  const readableMeta = [
                    item.symbol,
                    item.exchange,
                    marketCurrencyLabel(item.currency, lang),
                    marketAssetTypeLabel(item.assetType, t),
                  ].filter(Boolean).join(' · ');

                  return (
                    <button
                      type="button"
                      id={`market-search-option-${index}`}
                      key={`${item.symbol}-${item.assetType}-${item.providerSymbol ?? item.symbol}`}
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onSelectResult(item)}
                      onMouseEnter={() => onHighlight(index)}
                      role="option"
                      aria-selected={highlightedIndex === index}
                    >
                      <span className={styles.resultMain}>
                        <span className={styles.resultIdentity}>
                          <AssetIdentity
                            symbol={item.symbol}
                            name={item.name}
                            assetType={item.assetType}
                            exchange={item.exchange}
                            size="sm"
                            decorative
                          />
                          <b title={item.name}>{item.name || item.symbol}</b>
                        </span>
                        <em dir="ltr">{item.symbol}</em>
                      </span>
                      <small title={readableMeta}>{readableMeta}</small>
                    </button>
                  );
                }) : (
                  <div className={styles.resultState} role="option" aria-disabled="true" aria-selected="false">
                    <span>{searchMessage || t('command_no_results')}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <label className={styles.field}>
          <span>{t('market_asset_type')}</span>
          <select
            value={assetType}
            aria-label={t('market_asset_type')}
            onChange={(event) => onAssetTypeChange(event.target.value as MarketAssetFilter)}
          >
            {ASSET_TYPE_OPTIONS.map((value) => (
              <option value={value} key={value}>{t(ASSET_TYPE_LABEL_KEYS[value])}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>{t('market_timeframe')}</span>
          <select
            value={timeframe}
            aria-label={t('market_timeframe')}
            dir="ltr"
            onChange={(event) => onTimeframeChange(event.target.value as MarketTimeframe)}
          >
            {MARKET_TIMEFRAMES.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>

        <button className={styles.submit} type="submit" disabled={submitDisabled}>
          <Activity size={18} aria-hidden="true" />
          <span>{analysisLoading ? loadingLabel : t('market_analyze_now')}</span>
        </button>
      </form>
    </section>
  );
}
