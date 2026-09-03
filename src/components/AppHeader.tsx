'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { BrandLockup } from '@/components/header/BrandLockup';
import { CommandCluster } from '@/components/header/CommandCluster';
import { flattenNavigationItems, isNavigationItemActive } from '@/components/navigationConfig';

const MobileMenu = dynamic(() => import('@/components/MobileMenu').then(mod => mod.MobileMenu), {
  ssr: false,
});

type GlobalHeaderDockProps = {
  dir: 'ltr' | 'rtl';
  children: React.ReactNode;
};

/**
 * The outer elevated-dock shell: one sticky, capped, centered floating card
 * with a three-zone grid (brand / workspace navigation / command cluster).
 * Owns the header's consolidated stylesheet — the zones it composes
 * (BrandLockup, WorkspaceSwitcher, CommandCluster) are structural, not each
 * carrying their own generation of local overrides.
 */
function GlobalHeaderDock({ dir, children }: GlobalHeaderDockProps) {
  return (
    <header className="sfm-global-header" dir={dir}>
      {children}

      <style jsx global>{`
        :root {
          --global-header-height: 64px;
          /* Institutional dock: the header is a flush, full-width navy bar
             (not an inset floating card), so it needs no reserved gap or
             gutter — reserved band collapses to exactly the content height. */
          --app-header-inset-block: 0px;
          --app-header-inset-inline: 0px;
          --app-header-gap-block: 0px;
        }

        .sfm-global-header {
          position: sticky;
          inset-block-start: 0;
          z-index: var(--z-header, 100);
          grid-area: header;
          min-width: 0;
          min-height: var(--global-header-height);
          display: grid;
          /* Brand and the utility cluster size to their own content instead
             of flex-growing — a fixed grid where the outer zones are 1fr
             stretches empty space around a small logo/icon cluster on wide
             screens while the switcher (the actual signature control) never
             grows. Giving the center column the flexible track means any
             leftover width becomes centered breathing room around the
             switcher, not dead margins flanking unrelated content. */
          grid-template-columns: minmax(240px, max-content) minmax(0, 1fr) minmax(360px, max-content);
          grid-template-areas: 'brand workspaces actions';
          align-items: center;
          gap: 16px;
          width: 100%;
          margin: 0;
          padding-inline: 20px;
          border: 0;
          /* A single accent rule instead of a full border — the dock reads
             as a persistent brand strip, not a floating card. */
          border-block-end: 2px solid var(--accent);
          border-radius: 0;
          background: var(--header-surface);
          color: var(--header-dock-text);
          font-family: var(--font-ui);
        }

        .sfm-global-brand {
          position: relative;
          grid-area: brand;
          justify-self: start;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-inline-end: 18px;
          margin-inline-end: 4px;
          border-radius: var(--radius-control);
          color: var(--header-dock-text);
          text-decoration: none;
        }

        .sfm-global-brand::after {
          content: '';
          position: absolute;
          inset-inline-end: 0;
          inset-block: 8px;
          width: 1px;
          background: var(--header-brand-divider);
        }

        .sfm-global-brand:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .sfm-global-brand img {
          flex: 0 0 auto;
          object-fit: cover;
          border-radius: var(--radius-sm);
        }

        .sfm-global-brand-copy {
          /* Reserves the brand lockup's own footprint at its widest
             plausible rendering (matching the crumb span's own 170px cap
             below) instead of shrinking to whatever the current font/content
             state happens to need. Without this floor, any width delta in
             "THE SFM" + the crumb between an early and a settled render -
             e.g. a webfont swap - ripples through the header's max-content
             grid tracks (actions, workspace nav) and produces a measurable
             layout shift, since nothing else in the row holds them still. */
          min-width: 180px;
          display: grid;
          gap: 1px;
        }

        .sfm-global-brand strong {
          color: var(--header-dock-text);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.03em;
          line-height: 1.35;
          white-space: nowrap;
        }

        .sfm-global-brand-copy > span {
          max-width: 170px;
          overflow: hidden;
          color: var(--header-dock-text-subtle);
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
          gap: 2px;
        }

        .sfm-global-header .sfm-command-trigger {
          width: min(170px, 14vw);
          min-width: 120px;
        }

        /* Ghost command cluster: every control is transparent until
           hovered, sharing no chip/box background — the "clean
           professional" institutional read, not five bordered buttons. */
        .sfm-global-header :is(.sfm-command-trigger, .sfm-language-trigger, .sfm-theme-toggle, .sfm-density-toggle, .sfm-user-chip),
        .sfm-global-notifications {
          border-color: transparent;
          background: transparent;
          color: var(--header-dock-icon);
          box-shadow: none;
        }

        /* Quick search is the one persistent surface in the cluster — a
           slim, low-contrast field, not a filled chip. */
        .sfm-global-header .sfm-command-trigger:not(.compact) {
          background: var(--header-dock-search-bg);
          border-color: var(--header-dock-search-border);
          color: var(--header-dock-text-muted);
        }

        .sfm-global-header .sfm-command-trigger svg {
          color: var(--accent);
        }

        /* No shortcut badge in the header context — it reads as tiny/noisy
           at this density. CommandMenuButton's other call site (the sidebar
           search box) keeps its own kbd hint; this is a header-scoped
           override only. */
        .sfm-global-header .sfm-command-trigger kbd {
          display: none;
        }

        .sfm-global-header :is(.sfm-command-trigger, .sfm-language-trigger, .sfm-theme-toggle, .sfm-density-toggle, .sfm-user-chip):hover,
        .sfm-global-header :is(.sfm-user-chip, .sfm-language-trigger)[aria-expanded='true'],
        .sfm-global-notifications:hover {
          border-color: transparent;
          background: var(--header-dock-hover-bg);
          color: var(--accent);
        }

        .sfm-global-header .sfm-user-chip {
          color: var(--header-dock-text);
          font-family: var(--font-ui);
        }

        .sfm-global-header .sfm-user-name {
          color: var(--header-dock-text);
          font-weight: 500;
        }

        /* Reserves the identity label's own footprint at its shared component's
           existing max-width instead of letting it shrink to whatever the
           current name text needs. UserChip's name switches from a loading
           placeholder to the resolved profile name once the async profile
           fetch settles - without a fixed floor here, that swap changes the
           label's rendered width and ripples through this max-content grid
           (actions, workspace nav) the same way an unbounded brand crumb
           would. UserChip itself stays untouched - this only stabilizes its
           width where it's mounted in the header. */
        .sfm-global-header .sfm-user-identity {
          flex: 0 0 118px;
          min-width: 118px;
          /* Without overflow set here (not just on the nested .sfm-user-name),
             the flex item's automatic minimum size stays content-based per
             spec - flex-shrink: 0 then can't stop a long unbroken name from
             forcing the box wider than the 118px basis above. */
          overflow: hidden;
        }

        .sfm-global-header .sfm-user-chevron {
          color: var(--header-dock-icon);
        }

        /* Consistent optical icon size across every utility control. */
        .sfm-global-header .sfm-language-trigger svg:first-child {
          width: 16px;
          height: 16px;
        }

        .sfm-global-notifications,
        .sfm-global-menu-button {
          position: relative;
          border-radius: var(--radius-control);
          display: grid;
          place-items: center;
          text-decoration: none;
          cursor: pointer;
          transition: background-color var(--duration-fast) ease-out, color var(--duration-fast) ease-out;
        }

        .sfm-global-notifications,
        .sfm-global-menu-button {
          width: 44px;
          height: 44px;
          min-width: 44px;
        }

        .sfm-global-menu-button:hover {
          background: var(--header-dock-hover-bg);
          color: var(--accent);
        }

        .sfm-global-bell-dot {
          position: absolute;
          inset-block-start: 6px;
          inset-inline-end: 6px;
          width: 7px;
          height: 7px;
          border: 2px solid var(--header-dock-bg);
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

        @media (max-width: 1179px) {
          :root {
            /* 48px brand/actions row + 44px workspace-switcher row. */
            --global-header-height: 92px;
          }

          .sfm-global-header {
            grid-template-columns: minmax(150px, 1fr) auto;
            grid-template-areas:
              'brand actions'
              'workspaces workspaces';
            grid-template-rows: 48px 44px;
            row-gap: 0;
            padding-block: 0;
          }

          .sfm-workspace-navigation.sfm-global-workspaces {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            justify-self: stretch;
          }

          .sfm-global-workspaces .sfm-workspace-tabs {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 767px) {
          .sfm-global-header {
            padding-inline: 12px;
          }

          .sfm-global-workspaces {
            width: calc(100vw - 24px);
            max-width: calc(100vw - 24px);
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
            width: 26px !important;
            height: 26px !important;
          }

          .sfm-global-brand strong {
            font-size: 13px;
          }
        }
      `}</style>
    </header>
  );
}

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
      <GlobalHeaderDock dir={dir}>
        <BrandLockup crumb={crumb} />

        <WorkspaceSwitcher adminAccess={adminAccess} className="sfm-global-workspaces" />

        <CommandCluster
          commandLabel={t('command_open')}
          notificationsLabel={unreadNotifications > 0 ? `${t('nav_notif')} (${unreadNotifications})` : t('nav_notif')}
          notificationsHasUnread={unreadNotifications > 0}
          menuOpen={open}
          menuReady={mobileMenuReady}
          menuLabel={t('nav_open_menu')}
          onOpenMenu={openMobileMenu}
        />
      </GlobalHeaderDock>

      {mobileMenuMounted && <MobileMenu open={open} onClose={closeMobileMenu} />}
    </>
  );
}

export default AppHeader;
