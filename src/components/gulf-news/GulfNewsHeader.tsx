'use client';

import { Landmark, RefreshCcw } from 'lucide-react';

type GulfNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function GulfNewsHeader({ title, subtitle, refreshing, onRefresh }: GulfNewsHeaderProps) {
  return (
    <section className="gulf-news-header">
      <div className="gulf-news-title-row">
        <div className="gulf-news-title-icon" aria-hidden="true">
          <Landmark size={24} />
        </div>
        <div>
          <h1>{title}</h1>
          <p>
            <span className="gulf-news-status-dot" aria-hidden="true" />
            {subtitle}
          </p>
        </div>
      </div>
      <div className="gulf-news-header-actions">
        <button type="button" className="gulf-news-icon-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default GulfNewsHeader;
