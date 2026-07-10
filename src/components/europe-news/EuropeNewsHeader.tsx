'use client';

import { Landmark, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type EuropeNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function EuropeNewsHeader({ title, subtitle, refreshing, onRefresh }: EuropeNewsHeaderProps) {
  const { t } = useLanguage();
  return (
    <section className="europe-news-header">
      <div className="europe-news-title-row">
        <div className="europe-news-title-icon" aria-hidden="true">
          <Landmark size={24} />
        </div>
        <div>
          <h1>{title}</h1>
          <p>
            <span className="europe-news-status-dot" aria-hidden="true" />
            {subtitle}
          </p>
        </div>
      </div>
      <div className="europe-news-header-actions">
        <button type="button" className="europe-news-icon-btn" aria-label={t('accessibility_refresh')} onClick={onRefresh} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default EuropeNewsHeader;
