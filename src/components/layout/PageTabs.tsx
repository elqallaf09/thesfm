'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from 'react';

export type PageTabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

export type PageTabsActivationMode = 'automatic' | 'manual';
export type PageTabsMobileMode = 'scroll' | 'select' | 'auto';

export type PageTabsProps = {
  tabs: PageTabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  idBase?: string;
  sticky?: boolean;
  activationMode?: PageTabsActivationMode;
  mobileMode?: PageTabsMobileMode;
};

function safeIdPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'tab';
}

export function pageTabTriggerId(idBase: string, value: string) {
  return `${safeIdPart(idBase)}-tab-${safeIdPart(value)}`;
}

export function pageTabPanelId(idBase: string, value: string) {
  return `${safeIdPart(idBase)}-panel-${safeIdPart(value)}`;
}

const AUTO_SELECT_TAB_THRESHOLD = 6;

export function PageTabs({
  tabs,
  active,
  onChange,
  ariaLabel,
  className = '',
  idBase,
  sticky = false,
  activationMode = 'automatic',
  mobileMode = 'scroll',
}: PageTabsProps) {
  const generatedId = useId();
  const resolvedIdBase = useMemo(
    () => safeIdPart(idBase || `page-tabs-${generatedId}`),
    [generatedId, idBase],
  );
  const scrollerRef = useRef<HTMLElement | null>(null);
  const leadSentinelRef = useRef<HTMLSpanElement | null>(null);
  const trailSentinelRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [hasHiddenLead, setHasHiddenLead] = useState(false);
  const [hasHiddenTrail, setHasHiddenTrail] = useState(false);
  const [focusedTabId, setFocusedTabId] = useState<string | null>(null);
  const enabledTabs = tabs.filter(tab => !tab.disabled);
  const preferredRovingTabId = activationMode === 'manual' ? focusedTabId : active;
  const rovingTabId = enabledTabs.some(tab => tab.id === preferredRovingTabId)
    ? preferredRovingTabId
    : enabledTabs.some(tab => tab.id === active) ? active : enabledTabs[0]?.id;
  const selectOnMobile = mobileMode === 'select'
    || (mobileMode === 'auto' && tabs.length > AUTO_SELECT_TAB_THRESHOLD);

  useEffect(() => {
    const root = scrollerRef.current;
    const leadEl = leadSentinelRef.current;
    const trailEl = trailSentinelRef.current;
    if (!root || !leadEl || !trailEl || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.target === leadEl) setHasHiddenLead(!entry.isIntersecting);
          if (entry.target === trailEl) setHasHiddenTrail(!entry.isIntersecting);
        });
      },
      { root, threshold: 0 },
    );
    observer.observe(leadEl);
    observer.observe(trailEl);
    return () => observer.disconnect();
  }, [tabs.length]);

  useEffect(() => {
    const activeElement = tabRefs.current.get(active);
    if (!activeElement || activeElement.getClientRects().length === 0) return;
    activeElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [active, tabs.length]);

  const focusTab = (tabId: string) => {
    setFocusedTabId(tabId);
    tabRefs.current.get(tabId)?.focus();
    if (activationMode === 'automatic') onChange(tabId);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.findIndex(tab => tab.id === tabId);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = enabledTabs.length - 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const localDirection = event.currentTarget.closest('[dir]')?.getAttribute('dir');
      const isRtl = localDirection === 'rtl' || (!localDirection && document.documentElement.dir === 'rtl');
      const movesForward = event.key === 'ArrowRight' ? !isRtl : isRtl;
      nextIndex = (currentIndex + (movesForward ? 1 : -1) + enabledTabs.length) % enabledTabs.length;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    focusTab(enabledTabs[nextIndex].id);
  };

  return (
    <div className={`page-section-tabs-shell${sticky ? ' sticky' : ''}${selectOnMobile ? ' mobile-select' : ''}`}>
      <nav
        ref={scrollerRef}
        id={`${resolvedIdBase}-list`}
        className={`page-section-tabs ${className}`}
        aria-label={ariaLabel}
        role="tablist"
        aria-orientation="horizontal"
      >
        <span ref={leadSentinelRef} className="page-section-tabs-sentinel" aria-hidden="true" />
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={pageTabTriggerId(resolvedIdBase, tab.id)}
              aria-controls={pageTabPanelId(resolvedIdBase, tab.id)}
              className={isActive ? 'active' : ''}
              aria-selected={isActive}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              tabIndex={tab.id === rovingTabId ? 0 : -1}
              ref={element => {
                if (element) tabRefs.current.set(tab.id, element);
                else tabRefs.current.delete(tab.id);
              }}
              onClick={() => onChange(tab.id)}
              onFocus={() => setFocusedTabId(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, tab.id)}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && <b>{tab.count}</b>}
            </button>
          );
        })}
        <span ref={trailSentinelRef} className="page-section-tabs-sentinel" aria-hidden="true" />
      </nav>
      <label className="page-section-tabs-select">
        <span className="page-section-tabs-select-label">{ariaLabel}</span>
        <select
          value={active}
          aria-label={ariaLabel}
          onChange={event => onChange(event.target.value)}
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.label}{typeof tab.count === 'number' ? ` (${tab.count})` : ''}
            </option>
          ))}
        </select>
      </label>
      <span className={`page-section-tabs-fade lead ${hasHiddenLead ? 'visible' : ''}`} aria-hidden="true" />
      <span className={`page-section-tabs-fade trail ${hasHiddenTrail ? 'visible' : ''}`} aria-hidden="true" />
      <style jsx>{`
        .page-section-tabs-shell {
          position: relative;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .page-section-tabs-shell.sticky {
          position: sticky;
          inset-block-start: var(--sticky-subnav-offset, calc(var(--global-header-height) + 8px));
          z-index: 30;
          padding-block: 4px;
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .page-section-tabs-select {
          display: none;
        }

        .page-section-tabs-sentinel {
          flex: 0 0 1px;
          align-self: stretch;
        }

        .page-section-tabs.charity-tabs .page-section-tabs-sentinel {
          display: none;
        }

        @media (max-width: 720px) {
          .page-section-tabs.charity-tabs .page-section-tabs-sentinel {
            display: block;
          }
        }

        .page-section-tabs-fade {
          display: none;
        }

        .page-section-tabs-fade.visible {
          display: none;
        }

        .page-section-tabs-shell:has(.page-section-tabs.charity-tabs) .page-section-tabs-fade {
          display: none;
        }

        @media (max-width: 720px) {
          .page-section-tabs-shell:has(.page-section-tabs.charity-tabs) .page-section-tabs-fade {
            display: block;
          }
        }

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
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          box-shadow: var(--shadow-xs);
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
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          background: transparent;
          color: var(--foreground-secondary);
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 500 13px/1.45 var(--font-ui);
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
          white-space: nowrap;
        }
        .page-section-tabs.charity-tabs {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          border-radius: var(--radius-card);
          overflow: visible;
        }
        .page-section-tabs.charity-tabs button {
          width: 100%;
          min-width: 0;
          min-height: 46px;
          padding: 8px 12px;
          font-size: 13.5px;
          line-height: 1.35;
          white-space: normal;
        }
        .page-section-tabs button span {
          min-width: 0;
          overflow: visible;
          text-overflow: clip;
        }
        .page-section-tabs button:hover,
        .page-section-tabs button:focus-visible {
          border-color: var(--border);
          color: var(--foreground);
          outline: none;
          background: var(--surface-hover);
          box-shadow: none;
        }
        .page-section-tabs button:focus-visible,
        .page-section-tabs-select select:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }
        .page-section-tabs button.active {
          background: var(--primary-soft);
          color: var(--primary-hover);
          border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
          box-shadow: var(--active-indicator-shadow);
          font-weight: 600;
        }
        .page-section-tabs b {
          min-width: 24px;
          border-radius: var(--radius-pill);
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          padding: 3px 7px;
          font-size: 12px;
          line-height: 1;
        }
        .page-section-tabs button.active b {
          background: var(--primary);
          color: var(--primary-foreground);
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
            border-radius: var(--radius-control);
          }
          .page-section-tabs button {
            max-width: none;
            white-space: nowrap;
          }
          .page-section-tabs button span {
            overflow: visible;
            text-overflow: clip;
          }
          .page-section-tabs.charity-tabs {
            display: flex;
            grid-template-columns: none;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .page-section-tabs.charity-tabs button {
            flex: 0 0 max(152px, 46vw);
            white-space: normal;
          }

          .page-section-tabs-shell.mobile-select .page-section-tabs,
          .page-section-tabs-shell.mobile-select .page-section-tabs-fade {
            display: none;
          }

          .page-section-tabs-shell.mobile-select .page-section-tabs-select {
            display: grid;
            gap: 6px;
            width: 100%;
          }

          .page-section-tabs-select-label {
            color: var(--foreground-muted);
            font: 500 12px/1.5 var(--font-ui);
          }

          .page-section-tabs-select select {
            width: 100%;
            min-height: 48px;
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-control);
            background: var(--surface);
            color: var(--foreground);
            padding-inline: 14px 40px;
            font: 500 14px/1.5 var(--font-ui);
          }
        }
        @media (max-width: 1180px) and (min-width: 721px) {
          .page-section-tabs.charity-tabs {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        @media (max-width: 440px) {
          .page-section-tabs.charity-tabs {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

export type PageTabPanelProps = Omit<ComponentPropsWithoutRef<'section'>, 'hidden' | 'id'> & {
  idBase: string;
  value: string;
  active: boolean;
  keepMounted?: boolean;
};

export function PageTabPanel({
  idBase,
  value,
  active,
  keepMounted = false,
  className = '',
  children,
  tabIndex = 0,
  ...props
}: PageTabPanelProps) {
  if (!active && !keepMounted) return null;

  return (
    <section
      {...props}
      id={pageTabPanelId(idBase, value)}
      role="tabpanel"
      aria-labelledby={pageTabTriggerId(idBase, value)}
      data-state={active ? 'active' : 'inactive'}
      hidden={!active}
      tabIndex={tabIndex}
      className={`page-tab-panel ${className}`.trim()}
    >
      {children}
    </section>
  );
}
