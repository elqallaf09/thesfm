'use client';

import { useCallback, useState } from 'react';
import { Landmark, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type GulfNewsHeaderProps = {
  title: string;
  subtitle: string;
  onRefresh: () => Promise<void> | void;
};

export function GulfNewsHeader({ title, subtitle, onRefresh }: GulfNewsHeaderProps) {
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

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
        <button type="button" className="gulf-news-icon-btn" aria-label={t('accessibility_refresh')} onClick={() => void handleRefresh()} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default GulfNewsHeader;
