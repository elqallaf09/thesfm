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
    <nav className={`page-section-tabs ${className}`} aria-label={ariaLabel} role="tablist">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={isActive ? 'active' : ''}
            aria-selected={isActive}
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
          flex-wrap: nowrap;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 8px;
          border: 1px solid rgba(47, 214, 192, .14);
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(29, 140, 255, .05), rgba(47, 214, 192, .06)), var(--sfm-card);
          box-shadow: 0 10px 28px rgba(3, 18, 37, .05);
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-inline: contain;
        }
        .page-section-tabs::-webkit-scrollbar {
          display: none;
        }
        .page-section-tabs button {
          flex: 0 0 auto;
          max-width: 100%;
          min-height: 44px;
          border: 1px solid rgba(29, 140, 255, .20);
          border-radius: 18px;
          background: var(--sfm-card);
          color: var(--sfm-muted-readable);
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
          white-space: nowrap;
        }
        .page-section-tabs button span {
          min-width: 0;
          overflow: visible;
          text-overflow: clip;
        }
        .page-section-tabs button:hover,
        .page-section-tabs button:focus-visible {
          border-color: rgba(24, 212, 212, .42);
          color: var(--sfm-primary-hover);
          outline: none;
          background: var(--sfm-surface-hover);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .14), 0 10px 24px rgba(3, 18, 37, .08);
          transform: translateY(-1px);
        }
        .page-section-tabs button.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          border-color: rgba(167, 243, 240, .24);
          box-shadow: 0 12px 28px rgba(29, 140, 255, .22), inset 0 -2px 0 rgba(255, 255, 255, .18);
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
          background: rgba(255, 255, 255, .18);
          color: #FFFFFF;
        }
        .page-section-tabs button:disabled {
          opacity: .62;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        @media (max-width: 720px) {
          .page-section-tabs {
            width: 100%;
            flex-wrap: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 8px;
            padding: 8px;
            border-radius: 20px;
          }
          .page-section-tabs button {
            max-width: none;
            white-space: nowrap;
          }
          .page-section-tabs button span {
            overflow: visible;
            text-overflow: clip;
          }
        }
      `}</style>
    </nav>
  );
}
