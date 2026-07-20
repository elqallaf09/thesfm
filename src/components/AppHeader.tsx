'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
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
  const unreadNotifications = useUnreadNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuReady, setMobileMenuReady] = useState(false);
  const [effectivePathname, setEffectivePathname] = useState(pathname);
  const openingFrameRef = useRef<number | null>(null);
  const closingTimerRef = useRef<number | null>(null);

  const openMobileMenu = useCallback(() => {
    if (closingTimerRef.current !== null) window.clearTimeout(closingTimerRef.current);
    if (openingFrameRef.current !== null) window.cancelAnimationFrame(openingFrameRef.current);
    setMobileMenuMounted(true);
    openingFrameRef.current = window.requestAnimationFrame(() => {
      openingFrameRef.current = window.requestAnimationFrame(() => setOpen(true));
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    if (openingFrameRef.current !== null) window.cancelAnimationFrame(openingFrameRef.current);
    if (closingTimerRef.current !== null) window.clearTimeout(closingTimerRef.current);
    setOpen(false);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closingTimerRef.current = window.setTimeout(
      () => {
        closingTimerRef.current = null;
        setMobileMenuMounted(false);
      },
      reducedMotion ? 0 : 200,
    );
  }, []);

  useEffect(() => () => {
    if (openingFrameRef.current !== null) window.cancelAnimationFrame(openingFrameRef.current);
    if (closingTimerRef.current !== null) window.clearTimeout(closingTimerRef.current);
  }, []);

  useEffect(() => {
    setMobileMenuReady(true);
  }, []);

  useEffect(() => {
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
        <Link href="/dashboard" prefetch={false} className="sfm-global-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="" width={34} height={34} priority className="sfm-brand-mark sfm-brand-mark--header" />
          <span className="sfm-global-brand-copy">
            <strong>THE SFM</strong>
            <span>{crumb}</span>
          </span>
        </Link>

        <WorkspaceSwitcher adminAccess={adminAccess} className="sfm-global-workspaces" />

        <div className="sfm-global-actions">
          <CommandMenuButton aria-label={t('command_open')} />
          <LanguageSwitcher variant="light" compact />
          <ThemeToggle />
          <DensityToggle />
          <Link
            href="/notifications"
            prefetch={false}
            className="sfm-global-notifications"
            aria-label={unreadNotifications > 0 ? `${t('nav_notif')} (${unreadNotifications})` : t('nav_notif')}
            title={t('nav_notif')}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadNotifications > 0 ? <span className="sfm-global-bell-dot" aria-hidden="true" /> : null}
          </Link>
          <UserChip />
          <button
            type="button"
            className="sfm-global-menu-button"
            aria-label={t('nav_open_menu')}
            aria-expanded={open}
            aria-controls="sfm-mobile-menu"
            disabled={!mobileMenuReady}
            onClick={openMobileMenu}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      {mobileMenuMounted && <MobileMenu open={open} onClose={closeMobileMenu} />}

      <style jsx global>{`
        :root {
          --global-header-height: 64px;
        }

        .sfm-global-header {
          position: sticky;
          inset-block-start: var(--app-header-inset-block);
          z-index: var(--z-header, 100);
          grid-area: header;
          min-width: 0;
          min-height: var(--global-header-height);
          display: grid;
          grid-template-columns: minmax(150px, auto) minmax(0, 1fr) auto;
          grid-template-areas: 'brand workspaces actions';
          align-items: center;
          gap: 14px;
          /* Variant 03: an inset floating panel that stays sticky. */
          margin: var(--app-header-inset-block) var(--app-header-inset-inline) var(--app-header-gap-block);
          padding: 8px clamp(12px, 1.5vw, 22px);
          border: 1px solid var(--header-border);
          border-radius: var(--radius-card);
          background: var(--surface);
          background: var(--header-surface, var(--header-glass-bg));
          -webkit-backdrop-filter: blur(16px) saturate(128%);
          backdrop-filter: blur(16px) saturate(128%);
          color: var(--foreground);
          box-shadow: var(--header-shadow), var(--header-edge-glow);
          font-family: var(--font-ui);
        }

        @supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
          .sfm-global-header {
            background: var(--surface);
          }
        }

        @media (prefers-reduced-transparency: reduce) {
          .sfm-global-header {
            background: var(--surface);
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
          }
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
          border-color: var(--header-control-border, var(--border-strong));
          background: var(--header-control-bg, var(--surface));
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
          position: relative;
          width: 44px;
          height: 44px;
          min-width: 44px;
          /* Variant 03: grouped utilities — subtle idle surface, no heavy per-control border. */
          border: 1px solid var(--header-control-border, transparent);
          border-radius: var(--radius-control);
          display: grid;
          place-items: center;
          background: var(--header-control-bg, var(--surface));
          color: var(--foreground-secondary);
          text-decoration: none;
          cursor: pointer;
          transition: background-color var(--duration-fast) ease-out, border-color var(--duration-fast) ease-out, color var(--duration-fast) ease-out, transform var(--duration-fast) ease-out;
        }

        .sfm-global-notifications:hover,
        .sfm-global-menu-button:hover {
          border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
          background: var(--header-control-hover, var(--primary-soft));
          color: var(--primary);
          transform: translateY(-1px);
        }

        .sfm-global-bell-dot {
          position: absolute;
          inset-block-start: 7px;
          inset-inline-end: 7px;
          width: 10px;
          height: 10px;
          border: 2px solid var(--surface-elevated);
          border-radius: var(--radius-circle);
          background: var(--danger);
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
            width: auto;
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            justify-self: stretch;
          }

          .sfm-global-workspaces .sfm-workspace-tabs {
            justify-content: flex-start;
          }
        }

        @media (max-width: 767px) {
          :root {
            /* Mobile header is edge-to-edge, so the reserved band = content height. */
            --app-header-inset-block: 0px;
            --app-header-inset-inline: 0px;
            --app-header-gap-block: 0px;
          }

          .sfm-global-header {
            inline-size: 100%;
            max-inline-size: 100%;
            grid-template-columns: minmax(0, 1fr) auto;
            overflow-x: clip;
            margin: 0;
            border-inline: 0;
            border-block-start: 0;
            border-radius: 0;
            border-block-end: 1px solid var(--border);
            box-shadow: var(--shadow-xs);
            padding-inline: 12px;
          }

          .sfm-global-workspaces {
            inline-size: calc(100% - 24px);
            max-inline-size: calc(100% - 24px);
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
