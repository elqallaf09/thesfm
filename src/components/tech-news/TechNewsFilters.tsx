'use client';

import { useState } from 'react';
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
  const [showMoreSectors, setShowMoreSectors] = useState(false);
  const moreSectorSelected = MORE_TECH_NEWS_SECTORS.includes(sector);
  const expandedSectors = showMoreSectors || moreSectorSelected;

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
      <div className="tech-news-chip-row no-scrollbar">
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
        <button
          type="button"
          className={expandedSectors ? 'tech-news-more-button active' : 'tech-news-more-button'}
          aria-expanded={expandedSectors}
          onClick={() => setShowMoreSectors(value => !value)}
        >
          {labels.more}
        </button>
        {expandedSectors ? MORE_TECH_NEWS_SECTORS.map(item => (
          <button
            key={item}
            type="button"
            className={sector === item ? 'active' : ''}
            onClick={() => onSectorChange(item)}
          >
            {labels.sectors[item]}
          </button>
        )) : null}
      </div>
      <input type="hidden" value={sort} readOnly aria-label={labels.recent} />
    </section>
  );
}

export default TechNewsFilters;
