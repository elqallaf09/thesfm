'use client';

import { Landmark, Moon, RefreshCcw, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type GulfNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function GulfNewsHeader({ title, subtitle, refreshing, onRefresh }: GulfNewsHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

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
        <button type="button" className="gulf-news-icon-btn" aria-label="Theme" onClick={() => setTheme(nextTheme)}>
          <Sun className="gulf-news-sun" size={18} />
          <Moon className="gulf-news-moon" size={18} />
        </button>
        <button type="button" className="gulf-news-icon-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
          <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
    </section>
  );
}

export default GulfNewsHeader;

