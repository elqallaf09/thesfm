'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import type {
  TechNewsImpactFilter,
  TechNewsSort,
  TechNewsTimeFilter,
} from '@/lib/tech-news/newsProcessing';

type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
};

type TechNewsAdvancedFiltersProps = {
  source: string;
  symbol: string;
  impactFilter: TechNewsImpactFilter;
  timeFilter: TechNewsTimeFilter;
  sort: TechNewsSort;
  sources: string[];
  symbols: string[];
  resultsCount: number;
  labels: {
    filter: string;
    close: string;
    source: string;
    allSources: string;
    symbol: string;
    allSymbols: string;
    impact: string;
    time: string;
    sort: string;
    clear: string;
    results: string;
    activeFilters: string;
    impacts: Record<TechNewsImpactFilter, string>;
    times: Record<TechNewsTimeFilter, string>;
    sorts: Record<TechNewsSort, string>;
  };
  onSourceChange: (value: string) => void;
  onSymbolChange: (value: string) => void;
  onImpactFilterChange: (value: TechNewsImpactFilter) => void;
  onTimeFilterChange: (value: TechNewsTimeFilter) => void;
  onSortChange: (value: TechNewsSort) => void;
  onClearFilters: () => void;
};

const IMPACT_FILTERS: TechNewsImpactFilter[] = ['all', 'high', 'medium', 'low'];
const TIME_FILTERS: TechNewsTimeFilter[] = ['today', 'week', 'month', 'all'];
const SORT_OPTIONS: TechNewsSort[] = ['recent', 'oldest', 'impact', 'market', 'company', 'source'];

export function TechNewsAdvancedFilters({
  source,
  symbol,
  impactFilter,
  timeFilter,
  sort,
  sources,
  symbols,
  resultsCount,
  labels,
  onSourceChange,
  onSymbolChange,
  onImpactFilterChange,
  onTimeFilterChange,
  onSortChange,
  onClearFilters,
}: TechNewsAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilters: ActiveFilter[] = [
    source !== 'all' ? { key: 'source', label: labels.source, value: source, onClear: () => onSourceChange('all') } : null,
    symbol !== 'all' ? { key: 'symbol', label: labels.symbol, value: symbol, onClear: () => onSymbolChange('all') } : null,
    impactFilter !== 'all' ? { key: 'impact', label: labels.impact, value: labels.impacts[impactFilter], onClear: () => onImpactFilterChange('all') } : null,
    timeFilter !== 'all' ? { key: 'time', label: labels.time, value: labels.times[timeFilter], onClear: () => onTimeFilterChange('all') } : null,
    sort !== 'recent' ? { key: 'sort', label: labels.sort, value: labels.sorts[sort], onClear: () => onSortChange('recent') } : null,
  ].filter((entry): entry is ActiveFilter => Boolean(entry));

  return (
    <>
      <button
        type="button"
        className="tech-news-advanced-filters-trigger"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <SlidersHorizontal size={15} />
        {labels.filter}
        {activeFilters.length > 0 ? <b>{activeFilters.length}</b> : null}
      </button>

      {activeFilters.length > 0 ? (
        <div className="tech-news-active-filters" aria-label={labels.activeFilters}>
          {activeFilters.map(item => (
            <button type="button" key={item.key} onClick={item.onClear}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              <X size={13} />
            </button>
          ))}
          <button type="button" className="tech-news-clear-btn" onClick={onClearFilters}>
            <X size={13} />
            {labels.clear}
          </button>
        </div>
      ) : null}

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.filter}
        closeLabel={labels.close}
        size="sm"
        className="tech-news-advanced-filters-modal"
        bodyClassName="tech-news-advanced-filters-body"
      >
        <p className="tech-news-advanced-filters-count">{labels.results.replace('{count}', String(resultsCount))}</p>

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
          <span>{labels.impact}</span>
          <select value={impactFilter} onChange={event => onImpactFilterChange(event.target.value as TechNewsImpactFilter)}>
            {IMPACT_FILTERS.map(item => (
              <option key={item} value={item}>{labels.impacts[item]}</option>
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

        {activeFilters.length > 0 ? (
          <button type="button" className="tech-news-clear-btn tech-news-advanced-filters-clear" onClick={onClearFilters}>
            <X size={15} />
            {labels.clear}
          </button>
        ) : null}
      </AppModal>
    </>
  );
}

export default TechNewsAdvancedFilters;
