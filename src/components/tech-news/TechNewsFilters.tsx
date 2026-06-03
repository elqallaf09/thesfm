'use client';

import { Filter, Search } from 'lucide-react';

export type TechNewsDashboardCategory =
  | 'all'
  | 'techStocks'
  | 'ai'
  | 'semiconductors'
  | 'software'
  | 'cloud'
  | 'cybersecurity'
  | 'ecommerce'
  | 'hardware'
  | 'gaming';

export type TechNewsTimeFilter = 'all' | 'today' | 'week' | 'month';
export type TechNewsSort = 'recent' | 'relevance' | 'impact';

type TechNewsFiltersProps = {
  query: string;
  category: TechNewsDashboardCategory;
  source: string;
  timeFilter: TechNewsTimeFilter;
  sort: TechNewsSort;
  sources: string[];
  labels: {
    search: string;
    filter: string;
    source: string;
    allSources: string;
    time: string;
    sort: string;
    categories: Record<TechNewsDashboardCategory, string>;
    times: Record<TechNewsTimeFilter, string>;
    sorts: Record<TechNewsSort, string>;
  };
  categoryCounts?: Record<TechNewsDashboardCategory, number>;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: TechNewsDashboardCategory) => void;
  onSourceChange: (value: string) => void;
  onTimeFilterChange: (value: TechNewsTimeFilter) => void;
  onSortChange: (value: TechNewsSort) => void;
};

const CATEGORY_ORDER: TechNewsDashboardCategory[] = [
  'all',
  'techStocks',
  'ai',
  'semiconductors',
  'software',
  'cloud',
  'cybersecurity',
  'ecommerce',
  'hardware',
  'gaming',
];

const TIME_FILTERS: TechNewsTimeFilter[] = ['all', 'today', 'week', 'month'];
const SORT_OPTIONS: TechNewsSort[] = ['recent', 'relevance', 'impact'];

export function TechNewsFilters({
  query,
  category,
  source,
  timeFilter,
  sort,
  sources,
  labels,
  categoryCounts,
  onQueryChange,
  onCategoryChange,
  onSourceChange,
  onTimeFilterChange,
  onSortChange,
}: TechNewsFiltersProps) {
  return (
    <section className="tech-news-controls" aria-label={labels.filter}>
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

      <div className="tech-news-filter-row">
        <span className="tech-news-filter-label">
          <Filter size={15} />
          {labels.filter}
        </span>
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
