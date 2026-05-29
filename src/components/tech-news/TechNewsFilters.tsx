'use client';

import { Search } from 'lucide-react';
import { TECH_NEWS_SECTORS, type TechNewsSectorFilter } from '@/lib/market/techStocks';

type TechNewsFiltersProps = {
  query: string;
  sector: TechNewsSectorFilter;
  sort: 'recent';
  labels: {
    search: string;
    sort: string;
    recent: string;
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
        {TECH_NEWS_SECTORS.map(item => (
          <button
            key={item}
            type="button"
            className={sector === item ? 'active' : ''}
            onClick={() => onSectorChange(item)}
          >
            {labels.sectors[item]}
          </button>
        ))}
      </div>
      <label className="tech-news-sort">
        <span>{labels.sort}</span>
        <select value={sort} disabled>
          <option value="recent">{labels.recent}</option>
        </select>
      </label>
    </section>
  );
}

export default TechNewsFilters;
