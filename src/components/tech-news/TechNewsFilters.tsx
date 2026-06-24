'use client';

import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';

export type TechNewsDashboardCategory =
  | 'all'
  | 'techStocks'
  | 'megaCap'
  | 'ai'
  | 'semiconductors'
  | 'software'
  | 'cloud'
  | 'cybersecurity'
  | 'ecommerce'
  | 'hardware'
  | 'gaming'
  | 'startups';

export type TechNewsTimeFilter = 'all' | 'hour' | 'today' | 'week' | 'month';
export type TechNewsSort = 'recent' | 'oldest' | 'relevance' | 'impact';

type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
};

type TechNewsFiltersProps = {
  query: string;
  category: TechNewsDashboardCategory;
  source: string;
  symbol: string;
  timeFilter: TechNewsTimeFilter;
  sort: TechNewsSort;
  sources: string[];
  symbols: string[];
  resultsCount: number;
  labels: {
    search: string;
    filter: string;
    source: string;
    allSources: string;
    symbol: string;
    allSymbols: string;
    time: string;
    sort: string;
    clear: string;
    results: string;
    activeFilters: string;
    categories: Record<TechNewsDashboardCategory, string>;
    times: Record<TechNewsTimeFilter, string>;
    sorts: Record<TechNewsSort, string>;
  };
  categoryCounts?: Record<TechNewsDashboardCategory, number>;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: TechNewsDashboardCategory) => void;
  onSourceChange: (value: string) => void;
  onSymbolChange: (value: string) => void;
  onTimeFilterChange: (value: TechNewsTimeFilter) => void;
  onSortChange: (value: TechNewsSort) => void;
  onClearFilters: () => void;
};

const CATEGORY_ORDER: TechNewsDashboardCategory[] = [
  'all',
  'ai',
  'semiconductors',
  'cloud',
  'cybersecurity',
  'software',
  'hardware',
  'ecommerce',
  'gaming',
  'megaCap',
  'techStocks',
  'startups',
];

const TIME_FILTERS: TechNewsTimeFilter[] = ['all', 'hour', 'today', 'week', 'month'];
const SORT_OPTIONS: TechNewsSort[] = ['recent', 'impact', 'relevance', 'oldest'];

export function TechNewsFilters({
  query,
  category,
  source,
  symbol,
  timeFilter,
  sort,
  sources,
  symbols,
  resultsCount,
  labels,
  categoryCounts,
  onQueryChange,
  onCategoryChange,
  onSourceChange,
  onSymbolChange,
  onTimeFilterChange,
  onSortChange,
  onClearFilters,
}: TechNewsFiltersProps) {
  const activeFilters: ActiveFilter[] = [
    query.trim()
      ? { key: 'query', label: labels.search, value: query.trim(), onClear: () => onQueryChange('') }
      : null,
    category !== 'all'
      ? { key: 'category', label: labels.filter, value: labels.categories[category], onClear: () => onCategoryChange('all') }
      : null,
    source !== 'all'
      ? { key: 'source', label: labels.source, value: source, onClear: () => onSourceChange('all') }
      : null,
    symbol !== 'all'
      ? { key: 'symbol', label: labels.symbol, value: symbol, onClear: () => onSymbolChange('all') }
      : null,
    timeFilter !== 'all'
      ? { key: 'time', label: labels.time, value: labels.times[timeFilter], onClear: () => onTimeFilterChange('all') }
      : null,
    sort !== 'recent'
      ? { key: 'sort', label: labels.sort, value: labels.sorts[sort], onClear: () => onSortChange('recent') }
      : null,
  ].filter((item): item is ActiveFilter => Boolean(item));

  return (
    <section className="tech-news-controls" aria-label={labels.filter}>
      <div className="tech-news-controls-head">
        <div>
          <span>
            <SlidersHorizontal size={16} />
            {labels.filter}
          </span>
          <strong>{labels.results.replace('{count}', String(resultsCount))}</strong>
        </div>
        {activeFilters.length > 0 ? (
          <button type="button" className="tech-news-clear-btn" onClick={onClearFilters}>
            <X size={15} />
            {labels.clear}
          </button>
        ) : null}
      </div>

      <div className="tech-news-filter-grid">
        <label className="tech-news-search">
          <Search size={17} />
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder={labels.search}
            type="search"
            autoComplete="off"
          />
        </label>

        <label className="tech-news-select-control">
          <span>{labels.source}</span>
          <select value={source} onChange={event => onSourceChange(event.target.value)}>
            <option value="all">{labels.allSources}</option>
            {sources.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="tech-news-select-control">
          <span>{labels.symbol}</span>
          <select value={symbol} onChange={event => onSymbolChange(event.target.value)}>
            <option value="all">{labels.allSymbols}</option>
            {symbols.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="tech-news-select-control">
          <span>{labels.time}</span>
          <select value={timeFilter} onChange={event => onTimeFilterChange(event.target.value as TechNewsTimeFilter)}>
            {TIME_FILTERS.map(item => (
              <option key={item} value={item}>{labels.times[item]}</option>
            ))}
          </select>
        </label>

        <label className="tech-news-select-control">
          <span>{labels.sort}</span>
          <select value={sort} onChange={event => onSortChange(event.target.value as TechNewsSort)}>
            {SORT_OPTIONS.map(item => (
              <option key={item} value={item}>{labels.sorts[item]}</option>
            ))}
          </select>
        </label>
      </div>

      {activeFilters.length > 0 ? (
        <div className="tech-news-active-filters" aria-label={labels.activeFilters}>
          {activeFilters.map(item => (
            <button type="button" key={item.key} onClick={item.onClear}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              <X size={13} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="tech-news-chip-row no-scrollbar" role="tablist" aria-label={labels.filter}>
        {CATEGORY_ORDER.map(item => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            className={category === item ? 'active' : ''}
            onClick={() => onCategoryChange(item)}
          >
            <span>{labels.categories[item]}</span>
            {categoryCounts ? <b>{categoryCounts[item] ?? 0}</b> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export default TechNewsFilters;
