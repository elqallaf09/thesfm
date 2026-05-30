'use client';

import { Filter, Search } from 'lucide-react';
import type { TechNewsSectorFilter } from '@/lib/market/techStocks';

const VISIBLE_TECH_NEWS_SECTORS: TechNewsSectorFilter[] = [
  'all',
  'ai',
  'semiconductors',
  'software',
  'hardware',
  'cloud',
];

const MORE_TECH_NEWS_SECTORS: TechNewsSectorFilter[] = [
  'cybersecurity',
  'ecommerce',
  'ev',
  'social_ads',
  'gaming',
  'infrastructure',
];

type TechNewsFiltersProps = {
  query: string;
  sector: TechNewsSectorFilter;
  sort: 'recent';
  labels: {
    search: string;
    sort: string;
    recent: string;
    more: string;
    sectors: Record<TechNewsSectorFilter, string>;
  };
  onQueryChange: (value: string) => void;
  onSectorChange: (value: TechNewsSectorFilter) => void;
};

export function TechNewsFilters({
  query,
  sector,
  sort,
  labels,
  onQueryChange,
  onSectorChange,
}: TechNewsFiltersProps) {
  return (
    <section className="tech-news-controls" aria-label={labels.search}>
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
      <div className="tech-news-chip-row">
        <button type="button" className="tech-news-filter-icon" aria-label={labels.sort}>
          <Filter size={15} />
        </button>
        {VISIBLE_TECH_NEWS_SECTORS.map(item => (
          <button
            key={item}
            type="button"
            className={sector === item ? 'active' : ''}
            onClick={() => onSectorChange(item)}
          >
            {labels.sectors[item]}
          </button>
        ))}
        <details className="tech-news-more-menu">
          <summary>{labels.more}</summary>
          <div>
            {MORE_TECH_NEWS_SECTORS.map(item => (
              <button
                key={item}
                type="button"
                className={sector === item ? 'active' : ''}
                onClick={event => {
                  onSectorChange(item);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {labels.sectors[item]}
              </button>
            ))}
          </div>
        </details>
      </div>
      <input type="hidden" value={sort} readOnly aria-label={labels.recent} />
    </section>
  );
}

export default TechNewsFilters;
