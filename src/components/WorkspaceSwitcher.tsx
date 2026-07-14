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
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .sfm-workspace-tabs {
          min-width: 0;
          display: flex;
          align-items: stretch;
          gap: 4px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-inline: contain;
          scrollbar-width: none;
          scroll-padding-inline: 10px;
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
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          background: transparent;
          color: var(--foreground-secondary);
          text-decoration: none;
          white-space: nowrap;
          font-size: var(--type-navigation-size);
          font-weight: var(--type-navigation-weight);
          line-height: var(--type-navigation-leading);
          transition: background-color var(--duration-fast) ease-out, color var(--duration-fast) ease-out, border-color var(--duration-fast) ease-out;
          -webkit-tap-highlight-color: transparent;
        }

        .sfm-workspace-tab svg {
          flex: 0 0 auto;
          color: var(--foreground-muted);
        }

        .sfm-workspace-tab:hover {
          background: var(--sidebar-hover);
          color: var(--foreground);
        }

        .sfm-workspace-tab:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: -2px;
        }

        .sfm-workspace-tab[data-active='true'] {
          border-color: color-mix(in srgb, var(--primary) 24%, var(--border));
          background: var(--sidebar-active);
          color: var(--sidebar-active-foreground);
          font-weight: var(--type-navigation-active-weight);
        }

        .sfm-workspace-tab[data-active='true']::after {
          content: '';
          position: absolute;
          inset-inline: 10px;
          inset-block-end: 0;
          height: 3px;
          border-radius: var(--radius-pill) var(--radius-pill) 0 0;
          background: var(--primary);
        }

        .sfm-workspace-tab[data-active='true'] svg {
          color: var(--primary);
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
        }
      `}</style>
    </nav>
  );
}

export default WorkspaceSwitcher;
