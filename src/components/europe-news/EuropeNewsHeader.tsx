'use client';

import { Landmark, Moon, RefreshCcw, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type EuropeNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function EuropeNewsHeader({ title, subtitle, refreshing, onRefresh }: EuropeNewsHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

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
        <button type="button" className="europe-news-icon-btn" aria-label="Theme" onClick={() => setTheme(nextTheme)}>
          <Sun className="europe-news-sun" size={18} />
          <Moon className="europe-news-moon" size={18} />
        </button>
        <button type="button" className="europe-news-icon-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default EuropeNewsHeader;
