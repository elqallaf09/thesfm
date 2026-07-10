'use client';

import { Landmark, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type GulfNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function GulfNewsHeader({ title, subtitle, refreshing, onRefresh }: GulfNewsHeaderProps) {
  const { t } = useLanguage();
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
        <button type="button" className="gulf-news-icon-btn" aria-label={t('accessibility_refresh')} onClick={onRefresh} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default GulfNewsHeader;
