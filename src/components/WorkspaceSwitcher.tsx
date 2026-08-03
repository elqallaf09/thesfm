'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  availableWorkspaces,
  getWorkspaceEntryRoute,
  resolveActiveWorkspace,
} from '@/config/workspaces/workspace-resolver';
import {
  getFirstAccessibleAdminRoute,
  type NavigationAdminAccess,
} from '@/components/navigationConfig';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

const WORKSPACE_NAV_COPY = {
  ar: { label: 'مساحات العمل' },
  en: { label: 'Workspaces' },
  fr: { label: 'Espaces de travail' },
} as const;

type WorkspaceSwitcherProps = {
  /** Permission-filtered client access curates links; the server still enforces admin routes. */
  adminAccess: NavigationAdminAccess;
  className?: string;
};

/**
 * Route-driven global workspace navigation.
 *
 * This component deliberately stores no selected workspace state. Direct links,
 * refresh, and browser history all derive the selected tab from the pathname.
 *
 * The active item is marked by one sliding indicator surface (a sibling
 * element positioned via the --indicator-x/--indicator-w custom properties,
 * measured off the active tab's own offsetLeft/offsetWidth — physical values
 * the browser reports identically in RTL and LTR) instead of every item
 * carrying its own border/fill. This reads as one segmented control with a
 * moving selection, not four independent outlined buttons.
 */
export function WorkspaceSwitcher({ adminAccess, className = '' }: WorkspaceSwitcherProps) {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const hasPositionedRef = useRef(false);

  const administrationEntryRoute = getFirstAccessibleAdminRoute(adminAccess);
  const active = resolveActiveWorkspace(pathname);
  const workspaces = availableWorkspaces({ isAdmin: Boolean(administrationEntryRoute) });

  const positionIndicator = useCallback((animate: boolean) => {
    const activeEl = activeLinkRef.current;
    const indicator = indicatorRef.current;
    if (!activeEl || !indicator) return;

    if (!animate) indicator.style.transitionDuration = '0s';
    indicator.style.setProperty('--indicator-x', `${activeEl.offsetLeft}px`);
    indicator.style.setProperty('--indicator-w', `${activeEl.offsetWidth}px`);
    indicator.style.opacity = '1';
    if (!animate) {
      // Force layout so the temporary transition override is committed before
      // it's cleared, otherwise the browser can coalesce both writes and the
      // very next (animated) update inherits the disabled transition.
      void indicator.offsetWidth;
      indicator.style.transitionDuration = '';
    }
  }, []);

  useLayoutEffect(() => {
    positionIndicator(hasPositionedRef.current);
    hasPositionedRef.current = true;
  }, [active.id, locale, dir, positionIndicator]);

  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return undefined;
    const handleReflow = () => positionIndicator(true);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleReflow);
      observer.observe(container);
    }
    window.addEventListener('resize', handleReflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleReflow);
    };
  }, [positionIndicator]);

  useEffect(() => {
    const activeLink = activeLinkRef.current;
    if (!activeLink) return;
    const frame = window.requestAnimationFrame(() => {
      activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active.id, pathname]);

  return (
    <nav
      className={`sfm-workspace-navigation ${className}`.trim()}
      aria-label={WORKSPACE_NAV_COPY[locale].label}
      dir={dir}
    >
      <div className="sfm-workspace-tabs" ref={tabsRef}>
        <span className="sfm-workspace-indicator" ref={indicatorRef} aria-hidden="true" />
        {workspaces.map(workspace => {
          const Icon = workspace.icon;
          const current = workspace.id === active.id;
          const destination = workspace.id === 'administration'
            ? administrationEntryRoute!
            : getWorkspaceEntryRoute(workspace.id, { isAuthenticated: Boolean(user) });

          return (
            <Link
              key={workspace.id}
              ref={current ? activeLinkRef : undefined}
              href={destination}
              prefetch={false}
              className="sfm-workspace-tab"
              data-workspace-id={workspace.id}
              data-active={current ? 'true' : 'false'}
              aria-current={current ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="sfm-workspace-label-full">{workspace.labels[locale]}</span>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        .sfm-workspace-navigation {
          width: fit-content;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .sfm-workspace-tabs {
          position: relative;
          width: fit-content;
          min-width: 0;
          max-width: 100%;
          min-height: var(--control-h);
          display: flex;
          align-items: stretch;
          gap: 2px;
          padding: 0;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-inline: contain;
          border-radius: var(--radius-card);
          background: var(--workspace-switcher-bg);
          box-shadow: var(--workspace-switcher-frame-shadow);
          scrollbar-width: none;
          scroll-padding-inline: 10px;
          scroll-snap-type: inline proximity;
          -webkit-overflow-scrolling: touch;
        }

        .sfm-workspace-tabs::-webkit-scrollbar {
          display: none;
        }

        .sfm-workspace-indicator {
          position: absolute;
          inset-block: 2px;
          left: 0;
          width: var(--indicator-w, 0px);
          transform: translateX(var(--indicator-x, 0px)) scale(var(--indicator-scale, 1));
          border-radius: var(--radius-card-inset);
          background: var(--workspace-switcher-active-surface);
          border: 1px solid var(--workspace-switcher-item-border-active);
          box-shadow: var(--workspace-switcher-shadow-active);
          opacity: 0;
          z-index: 0;
          pointer-events: none;
          transition:
            transform var(--duration) var(--ease),
            width var(--duration) var(--ease),
            box-shadow var(--duration-fast) ease-out,
            opacity var(--duration-fast) ease-out;
          will-change: transform, width;
        }

        .sfm-workspace-tab {
          position: relative;
          z-index: 1;
          min-width: max-content;
          min-height: var(--control-h);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          border-radius: var(--radius-card-inset);
          background: var(--workspace-switcher-item-bg);
          color: var(--workspace-switcher-item-text);
          text-decoration: none;
          white-space: nowrap;
          font-size: var(--type-navigation-size);
          font-weight: var(--type-navigation-weight);
          line-height: var(--type-navigation-leading);
          scroll-snap-align: nearest;
          touch-action: manipulation;
          cursor: pointer;
          transition:
            color var(--duration-fast) ease-out,
            background-color var(--duration-fast) ease-out,
            transform var(--duration-fast) ease-out;
          -webkit-tap-highlight-color: transparent;
        }

        .sfm-workspace-tab svg {
          flex: 0 0 auto;
          color: var(--workspace-switcher-icon);
          transition: color var(--duration-fast) ease-out;
        }

        .sfm-workspace-tab:hover:not([aria-disabled='true']):not([data-disabled='true']) {
          transform: translateY(-1px);
        }

        .sfm-workspace-tab:hover:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {
          background: var(--workspace-switcher-item-hover);
        }

        .sfm-workspace-tab:hover:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) svg {
          color: var(--workspace-switcher-icon-hover);
        }

        .sfm-workspace-tab:focus-visible {
          z-index: 2;
          outline: 3px solid var(--workspace-switcher-focus);
          outline-offset: -3px;
          box-shadow: var(--focus-shadow);
        }

        .sfm-workspace-tab[data-active='true'] {
          color: var(--workspace-switcher-item-text-active);
          font-weight: var(--type-navigation-active-weight);
        }

        .sfm-workspace-tab[data-active='true'] svg {
          color: var(--workspace-switcher-icon-active);
        }

        .sfm-workspace-tabs:has(.sfm-workspace-tab[data-active='true']:hover:not([aria-disabled='true']):not([data-disabled='true'])) .sfm-workspace-indicator {
          box-shadow: var(--workspace-switcher-shadow-active-hover);
        }

        .sfm-workspace-tab:active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {
          background: var(--workspace-switcher-item-pressed);
          transform: translateY(0);
        }

        .sfm-workspace-tabs:has(.sfm-workspace-tab[data-active='true']:active:not([aria-disabled='true']):not([data-disabled='true'])) .sfm-workspace-indicator {
          --indicator-scale: 0.97;
          box-shadow: var(--workspace-switcher-shadow-active-pressed);
        }

        .sfm-workspace-tab[aria-disabled='true'],
        .sfm-workspace-tab[data-disabled='true'] {
          color: var(--workspace-switcher-item-text-disabled);
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sfm-workspace-tab[aria-disabled='true'] svg,
        .sfm-workspace-tab[data-disabled='true'] svg {
          color: currentColor;
        }

        @media (max-width: 900px) {
          .sfm-workspace-tab {
            min-height: var(--control-h);
            padding-inline: 13px;
            font-size: var(--type-navigation-size);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfm-workspace-tab,
          .sfm-workspace-tab svg,
          .sfm-workspace-indicator {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}

export default WorkspaceSwitcher;
