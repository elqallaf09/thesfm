'use client';

import { Moon, Newspaper, RefreshCcw, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

type TechNewsHeaderProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function TechNewsHeader({ title, subtitle, refreshing, onRefresh }: TechNewsHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <section className="tech-news-header">
      <div className="tech-news-title-row">
        <div className="tech-news-title-icon" aria-hidden="true">
          <Newspaper size={24} />
        </div>
        <div>
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
          aria-label="Theme"
          onClick={() => setTheme(nextTheme)}
        >
          <Sun className="tech-news-sun" size={18} />
          <Moon className="tech-news-moon" size={18} />
        </button>
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
