'use client';

export type PageTabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

type PageTabsProps = {
  tabs: PageTabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
};

export function PageTabs({ tabs, active, onChange, ariaLabel, className = '' }: PageTabsProps) {
  return (
    <nav className={`page-section-tabs ${className}`} aria-label={ariaLabel}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? 'active' : ''}
            aria-pressed={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && <b>{tab.count}</b>}
          </button>
        );
      })}
      <style jsx>{`
        .page-section-tabs {
          display: flex;
          gap: 8px;
          max-width: 100%;
          overflow-x: auto;
          padding: 2px 2px 10px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .page-section-tabs button {
          flex: 0 0 auto;
          min-height: 42px;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 999px;
          background: var(--sfm-card);
          color: var(--sfm-muted);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease;
          white-space: nowrap;
        }
        .page-section-tabs button:hover,
        .page-section-tabs button:focus-visible {
          border-color: rgba(24, 212, 212, .42);
          color: var(--sfm-primary-hover);
          outline: none;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .12);
        }
        .page-section-tabs button.active {
          background: linear-gradient(135deg, var(--sfm-primary-dark), var(--sfm-midnight));
          color: var(--sfm-soft-cyan);
          border-color: rgba(167, 243, 240, .24);
          box-shadow: 0 10px 24px rgba(3, 18, 37, .12);
        }
        .page-section-tabs b {
          min-width: 24px;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          padding: 3px 7px;
          font-size: 11px;
          line-height: 1;
        }
        .page-section-tabs button.active b {
          background: rgba(167, 243, 240, .16);
          color: var(--sfm-soft-cyan);
        }
        .page-section-tabs button:disabled {
          opacity: .52;
          cursor: not-allowed;
        }
      `}</style>
    </nav>
  );
}
