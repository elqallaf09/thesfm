'use client';

import { useEffect, useRef } from 'react';
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
 */
export function WorkspaceSwitcher({ adminAccess, className = '' }: WorkspaceSwitcherProps) {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  const administrationEntryRoute = getFirstAccessibleAdminRoute(adminAccess);
  const active = resolveActiveWorkspace(pathname);
  const workspaces = availableWorkspaces({ isAdmin: Boolean(administrationEntryRoute) });

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
      <div className="sfm-workspace-tabs">
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
              <Icon size={17} aria-hidden="true" />
              <span className="sfm-workspace-label-full">{workspace.labels[locale]}</span>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        .sfm-workspace-navigation {
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .sfm-workspace-tabs {
          min-width: 0;
          min-height: var(--control-h);
          display: flex;
          align-items: stretch;
          gap: 5px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-inline: contain;
          border-radius: var(--radius-control);
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

        .sfm-workspace-tab {
          position: relative;
          min-width: max-content;
          min-height: var(--control-h);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          border: 1px solid var(--workspace-switcher-item-border);
          border-radius: var(--radius-control);
          background: var(--workspace-switcher-item-bg);
          color: var(--workspace-switcher-item-text);
          box-shadow: var(--workspace-switcher-shadow);
          text-decoration: none;
          white-space: nowrap;
          font-size: var(--type-navigation-size);
          font-weight: var(--type-navigation-weight);
          line-height: var(--type-navigation-leading);
          scroll-snap-align: nearest;
          touch-action: manipulation;
          cursor: pointer;
          transition:
            background-color var(--duration-fast) ease-out,
            color var(--duration-fast) ease-out,
            border-color var(--duration-fast) ease-out,
            box-shadow var(--duration-fast) ease-out,
            transform var(--duration-fast) ease-out;
          -webkit-tap-highlight-color: transparent;
        }

        .sfm-workspace-tab svg {
          flex: 0 0 auto;
          color: var(--workspace-switcher-icon);
          transition: color var(--duration-fast) ease-out;
        }

        .sfm-workspace-tab:hover:not([aria-disabled='true']):not([data-disabled='true']) {
          border-color: var(--workspace-switcher-item-border-hover);
          background: var(--workspace-switcher-item-hover);
          color: var(--workspace-switcher-item-text);
          box-shadow: var(--workspace-switcher-shadow-hover);
        }

        .sfm-workspace-tab:hover:not([aria-disabled='true']):not([data-disabled='true']) svg {
          color: var(--workspace-switcher-icon-hover);
        }

        .sfm-workspace-tab:focus-visible {
          z-index: 1;
          outline: 3px solid var(--workspace-switcher-focus);
          outline-offset: -3px;
          box-shadow: var(--focus-shadow), var(--workspace-switcher-shadow-hover);
        }

        .sfm-workspace-tab[data-active='true'] {
          border-color: var(--workspace-switcher-item-border-active);
          background: var(--workspace-switcher-item-active);
          color: var(--workspace-switcher-item-text-active);
          box-shadow: var(--workspace-switcher-shadow-active);
          font-weight: var(--type-navigation-active-weight);
        }

        .sfm-workspace-tab[data-active='true']::after {
          content: '';
          position: absolute;
          inset-inline: 9px;
          inset-block-end: 3px;
          height: 3px;
          border-radius: var(--radius-pill);
          background: var(--workspace-switcher-indicator);
        }

        .sfm-workspace-tab[data-active='true'] svg {
          color: var(--workspace-switcher-icon-active);
        }

        .sfm-workspace-tab[data-active='true']:hover:not([aria-disabled='true']):not([data-disabled='true']) {
          box-shadow: var(--workspace-switcher-shadow-active-hover);
        }

        .sfm-workspace-tab[data-active='true']:focus-visible {
          box-shadow: var(--focus-shadow), var(--workspace-switcher-shadow-active);
        }

        .sfm-workspace-tab:active:not([aria-disabled='true']):not([data-disabled='true']) {
          border-color: var(--workspace-switcher-item-border-hover);
          background: var(--workspace-switcher-item-pressed);
          box-shadow: var(--workspace-switcher-shadow-pressed);
          transform: translateY(1px);
        }

        .sfm-workspace-tab[data-active='true']:active:not([aria-disabled='true']):not([data-disabled='true']) {
          border-color: var(--workspace-switcher-item-border-active);
          background: var(--workspace-switcher-item-active);
          box-shadow: var(--workspace-switcher-shadow-active-pressed);
        }

        .sfm-workspace-tab[aria-disabled='true'],
        .sfm-workspace-tab[data-disabled='true'] {
          border-color: var(--workspace-switcher-border);
          background: var(--workspace-switcher-item-disabled);
          color: var(--workspace-switcher-item-text-disabled);
          box-shadow: none;
          opacity: 0.72;
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
          .sfm-workspace-tab {
            transition: none;
          }

          .sfm-workspace-tab svg {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}

export default WorkspaceSwitcher;
