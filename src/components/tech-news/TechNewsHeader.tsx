'use client';

import { Clock3, DatabaseZap, Newspaper, RefreshCcw } from 'lucide-react';

type TechNewsHeaderProps = {
  title: string;
  subtitle: string;
  articleCount: number;
  articleUnitLabel: string;
  lastUpdatedLabel: string;
  marketUpdatedLabel: string;
  sourceNote: string;
  dataStatusLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function TechNewsHeader({
  title,
  subtitle,
  articleCount,
  articleUnitLabel,
  lastUpdatedLabel,
  marketUpdatedLabel,
  sourceNote,
  dataStatusLabel,
  refreshing,
  onRefresh,
}: TechNewsHeaderProps) {
  return (
    <section className="tech-news-header">
      <div className="tech-news-title-row">
        <div className="tech-news-title-icon" aria-hidden="true">
          <Newspaper size={25} />
        </div>
        <div className="tech-news-title-copy">
          <span className="tech-news-eyebrow">
            <DatabaseZap size={14} />
            {dataStatusLabel}
          </span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <small>{sourceNote}</small>
        </div>
      </div>

      <div className="tech-news-header-actions">
        <div className="tech-news-header-stat">
          <span>{articleCount}</span>
          <b>{articleUnitLabel}</b>
        </div>
        <div className="tech-news-header-meta">
          <span>
            <Clock3 size={14} />
            {lastUpdatedLabel}
          </span>
          <span>
            <DatabaseZap size={14} />
            {marketUpdatedLabel}
          </span>
        </div>
        <button
          type="button"
          className="tech-news-refresh-btn"
          aria-label="Refresh technology news"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default TechNewsHeader;
