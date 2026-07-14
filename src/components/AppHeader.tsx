'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { CommandMenuButton } from '@/components/CommandMenuButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DensityToggle } from '@/components/DensityToggle';
import { UserChip } from '@/components/UserChip';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { flattenNavigationItems, isNavigationItemActive } from '@/components/navigationConfig';

const MobileMenu = dynamic(() => import('@/components/MobileMenu').then(mod => mod.MobileMenu), {
  ssr: false,
});

export function AppHeader() {
  const pathname = usePathname() || '/';
  const { dir, t } = useLanguage();
  const { user } = useAuth();
  const { access: adminAccess } = useAdminAccess(user?.id);
  const [open, setOpen] = useState(false);
  const [effectivePathname, setEffectivePathname] = useState(pathname);

  useEffect(() => {
    setOpen(false);
    const nextPath = typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('next');
    setEffectivePathname(pathname === '/login' && nextPath?.startsWith('/') ? nextPath : pathname);
  }, [pathname]);

  const activeItem = useMemo(
    () => flattenNavigationItems()
      .filter(item => item.href && !item.href.includes('#'))
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
      .find(item => isNavigationItemActive(effectivePathname, item.href)),
    [effectivePathname],
  );

  const title = activeItem ? t(activeItem.labelKey) : 'THE SFM';
  const crumb = effectivePathname === '/dashboard' ? t('ai_manager') : title;

  return (
    <>
      <header className="sfm-global-header" dir={dir}>
        <Link href="/dashboard" className="sfm-global-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="" width={34} height={34} priority className="sfm-brand-mark sfm-brand-mark--header" />
          <span className="sfm-global-brand-copy">
            <strong>THE SFM</strong>
            <span>{crumb}</span>
          </span>
        </Link>

        <WorkspaceSwitcher adminAccess={adminAccess} className="sfm-global-workspaces" />

        <div className="sfm-global-actions">
          <CommandMenuButton />
          <LanguageSwitcher variant="light" compact />
          <ThemeToggle />
          <DensityToggle />
          <Link
            href="/notifications"
            className="sfm-global-notifications"
            aria-label={t('nav_notif')}
            title={t('nav_notif')}
          >
            <Bell size={18} aria-hidden="true" />
          </Link>
          <UserChip />
          <button
            type="button"
            className="sfm-global-menu-button"
            aria-label={t('nav_open_menu')}
            aria-expanded={open}
            aria-controls="sfm-mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      {open && <MobileMenu open={open} onClose={() => setOpen(false)} />}

      <style jsx global>{`
        :root {
          --global-header-height: 64px;
        }

        .sfm-global-header {
          position: sticky;
          inset-block-start: 0;
          z-index: 100;
          grid-area: header;
          min-width: 0;
          min-height: var(--global-header-height);
          display: grid;
          grid-template-columns: minmax(150px, auto) minmax(0, 1fr) auto;
          grid-template-areas: 'brand workspaces actions';
          align-items: center;
          gap: 14px;
          padding: 8px clamp(12px, 1.5vw, 24px);
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          color: var(--foreground);
          box-shadow: var(--shadow-xs);
          font-family: var(--font-ui);
        }

        .sfm-global-brand {
          grid-area: brand;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: var(--radius-control);
          color: var(--foreground);
          text-decoration: none;
        }

        .sfm-global-brand:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .sfm-global-brand img {
          flex: 0 0 auto;
          object-fit: cover;
        }

        .sfm-global-brand-copy {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .sfm-global-brand strong {
          color: var(--foreground);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.35;
          white-space: nowrap;
        }

        .sfm-global-brand-copy > span {
          max-width: 170px;
          overflow: hidden;
          color: var(--foreground-muted);
          font-size: var(--type-caption-size);
          font-weight: 400;
          line-height: var(--type-caption-leading);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sfm-global-workspaces {
          grid-area: workspaces;
          justify-self: center;
        }

        .sfm-global-actions {
          grid-area: actions;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
        }

        .sfm-global-header .sfm-command-trigger {
          width: min(190px, 14vw);
          min-width: 132px;
          min-height: var(--control-h);
        }

        .sfm-global-header .sfm-language-trigger,
        .sfm-global-header .sfm-theme-toggle,
        .sfm-global-header .sfm-density-toggle,
        .sfm-global-header .sfm-user-chip {
          min-height: var(--control-h);
          box-shadow: none;
        }

        .sfm-global-header .sfm-user-chip {
          min-height: var(--control-h);
          border-color: var(--border-strong);
          background: var(--surface);
          color: var(--foreground);
          font-family: var(--font-ui);
        }

        .sfm-global-header .sfm-user-name {
          color: var(--foreground);
          font-weight: 500;
        }

        .sfm-global-header .sfm-user-chevron {
          color: var(--foreground-muted);
        }

        .sfm-global-notifications,
        .sfm-global-menu-button {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-control);
          display: grid;
          place-items: center;
          background: var(--surface);
          color: var(--foreground-secondary);
          text-decoration: none;
          cursor: pointer;
          transition: background-color var(--duration-fast) ease-out, border-color var(--duration-fast) ease-out, color var(--duration-fast) ease-out;
        }

        .sfm-global-notifications:hover,
        .sfm-global-menu-button:hover {
          border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
          background: var(--sidebar-hover);
          color: var(--primary);
        }

        .sfm-global-notifications:focus-visible,
        .sfm-global-menu-button:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .sfm-global-menu-button {
          display: none;
        }

        @media (max-width: 1499px) {
          .sfm-global-header .sfm-command-trigger {
            width: 44px;
            min-width: 44px;
            padding: 0;
            justify-content: center;
          }

          .sfm-global-header .sfm-command-trigger span,
          .sfm-global-header .sfm-command-trigger kbd {
            display: none;
          }
        }

        @media (max-width: 1179px) {
          :root {
            --global-header-height: 108px;
          }

          .sfm-global-header {
            grid-template-columns: minmax(150px, 1fr) auto;
            grid-template-areas:
              'brand actions'
              'workspaces workspaces';
            grid-template-rows: 48px 44px;
            row-gap: 0;
            padding-block: 8px;
          }

          .sfm-global-workspaces {
            width: 100%;
            justify-self: stretch;
          }

          .sfm-global-workspaces .sfm-workspace-tabs {
            justify-content: flex-start;
          }
        }

        @media (max-width: 767px) {
          .sfm-global-header {
            padding-inline: 12px;
          }

          .sfm-global-actions {
            max-width: 44px;
          }

          .sfm-global-actions > .sfm-command-trigger,
          .sfm-global-actions > .sfm-density-toggle,
          .sfm-global-actions > .sfm-theme-toggle,
          .sfm-global-actions > .sfm-language-dropdown,
          .sfm-global-actions > .sfm-global-notifications,
          .sfm-global-actions > .sfm-user-chip-wrap {
            display: none;
          }

          .sfm-global-menu-button {
            display: grid;
          }

          .sfm-global-brand-copy > span {
            max-width: min(42vw, 160px);
          }
        }

        @media (max-width: 430px) {
          .sfm-global-header {
            padding-inline: 10px;
          }

          .sfm-global-brand {
            gap: 7px;
          }

          .sfm-brand-mark--header {
            width: 30px !important;
            height: 30px !important;
          }

          .sfm-global-brand strong {
            font-size: 14px;
          }

          .sfm-global-menu-button {
            width: 44px;
            min-width: 44px;
            height: 44px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfm-global-notifications,
          .sfm-global-menu-button {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

export default AppHeader;
