'use client';

import { Newspaper, RefreshCcw } from 'lucide-react';

type TechNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function TechNewsHeader({ title, subtitle, refreshing, onRefresh }: TechNewsHeaderProps) {
  return (
    <section className="tech-news-header">
      <div className="tech-news-title-row">
        <div className="tech-news-title-icon" aria-hidden="true">
          <Newspaper size={24} />
        </div>
        <div className="tech-news-title-copy">
          <h1>{title}</h1>
          <p>
            <span className="tech-news-status-dot" aria-hidden="true" />
            {subtitle}
          </p>
        </div>
      </div>
      <div className="tech-news-header-actions">
        <button
          type="button"
          className="tech-news-icon-btn"
          aria-label="Refresh"
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
