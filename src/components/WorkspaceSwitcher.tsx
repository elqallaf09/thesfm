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
import { WorkspaceActiveIndicator } from '@/components/header/WorkspaceActiveIndicator';
import { MobileWorkspaceRail } from '@/components/header/MobileWorkspaceRail';

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
    const container = tabsRef.current;
    if (!activeLink || !container) return;
    const frame = window.requestAnimationFrame(() => {
      // Only scroll when the active destination is actually clipped by the
      // rail's current scroll position. An unconditional scrollIntoView
      // call - even with a target that's already fully visible, where the
      // browser itself would no-op the scroll - triggers a WebKit RTL bug
      // where the page's ancestor boxes (body, the sticky header) render
      // shifted a few pixels off the left edge on mobile-webkit. Gating on
      // real necessity avoids ever calling it on the common case (the
      // default-active tab is already visible on first paint) while still
      // guaranteeing both-edge clearance - via 'center' - for the genuine
      // case: navigating to a destination currently scrolled out of view.
      const containerRect = container.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const fullyVisible = linkRect.left >= containerRect.left && linkRect.right <= containerRect.right;
      if (!fullyVisible) {
        activeLink.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active.id, pathname]);

  return (
    <nav
      className={`sfm-workspace-navigation ${className}`.trim()}
      aria-label={WORKSPACE_NAV_COPY[locale].label}
      dir={dir}
    >
      <MobileWorkspaceRail ref={tabsRef}>
        <WorkspaceActiveIndicator ref={indicatorRef} />
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
      </MobileWorkspaceRail>

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
          min-height: 44px;
          display: flex;
          align-items: stretch;
          gap: 4px;
          /* Safe padding so the first/last destination never sits flush
             against the rail edge — this is what was read as "clipped"
             labels on narrow viewports. */
          padding-inline: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-inline: contain;
          /* No track surface in the institutional-dock treatment — items sit
             directly on the header's own navy background. */
          background: var(--workspace-switcher-bg);
          scrollbar-width: none;
          scroll-padding-inline: 16px;
          scroll-snap-type: inline mandatory;
          -webkit-overflow-scrolling: touch;
          /* Edge-fade scroll affordance: symmetric on both ends regardless
             of RTL/LTR, since both rail edges should read as scrollable
             whichever direction the content flows. */
          -webkit-mask-image: var(--workspace-switcher-rail-fade);
          mask-image: var(--workspace-switcher-rail-fade);
        }

        .sfm-workspace-tabs::-webkit-scrollbar {
          display: none;
        }

        .sfm-workspace-indicator {
          /* A slim sliding underline, not a filled surface behind the tab —
             the institutional-dock treatment marks the active destination
             with a compact accent rule, not an elevated chip. */
          position: absolute;
          inset-block-end: 0;
          left: 0;
          height: 2px;
          width: var(--indicator-w, 0px);
          transform: translateX(var(--indicator-x, 0px));
          background: var(--workspace-switcher-active-surface);
          opacity: 0;
          z-index: 0;
          pointer-events: none;
          transition:
            transform var(--duration) var(--ease),
            width var(--duration) var(--ease),
            opacity var(--duration-fast) ease-out;
          will-change: transform, width;
        }

        .sfm-workspace-tab {
          position: relative;
          z-index: 1;
          min-width: max-content;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 16px;
          border-radius: var(--radius-control);
          background: var(--workspace-switcher-item-bg);
          color: var(--workspace-switcher-item-text);
          text-decoration: none;
          white-space: nowrap;
          font-size: var(--type-navigation-size);
          font-weight: var(--type-navigation-weight);
          line-height: var(--type-navigation-leading);
          scroll-snap-align: center;
          touch-action: manipulation;
          cursor: pointer;
          transition:
            color var(--duration-fast) ease-out,
            background-color var(--duration-fast) ease-out;
          -webkit-tap-highlight-color: transparent;
        }

        .sfm-workspace-tab svg {
          flex: 0 0 auto;
          color: var(--workspace-switcher-icon);
          transition: color var(--duration-fast) ease-out;
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

        .sfm-workspace-tab:active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {
          background: var(--workspace-switcher-item-pressed);
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
            min-height: 44px;
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
