'use client';

import { Search } from 'lucide-react';
import { CATEGORY_ORDER, type TechNewsDashboardCategory } from '@/lib/tech-news/newsProcessing';

type TechNewsQuickFiltersProps = {
  query: string;
  category: TechNewsDashboardCategory;
  categoryCounts?: Record<TechNewsDashboardCategory, number>;
  labels: {
    search: string;
    categoryNav: string;
    categories: Record<TechNewsDashboardCategory, string>;
  };
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: TechNewsDashboardCategory) => void;
};

export function TechNewsQuickFilters({
  query,
  category,
  categoryCounts,
  labels,
  onQueryChange,
  onCategoryChange,
}: TechNewsQuickFiltersProps) {
  return (
    <section className="tech-news-quick-filters" aria-label={labels.categoryNav}>
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

      <div className="tech-news-chip-row no-scrollbar" role="tablist" aria-label={labels.categoryNav}>
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

export default TechNewsQuickFilters;
