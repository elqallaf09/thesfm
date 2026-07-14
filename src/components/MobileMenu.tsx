'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserChip } from '@/components/UserChip';
import { CommandMenuButton } from '@/components/CommandMenuButton';
import { DensityToggle } from '@/components/DensityToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { NavigationQueryObserver } from '@/components/NavigationQueryObserver';
import { filterGroupsForWorkspace } from '@/config/workspaces/workspace-navigation';
import { resolveActiveWorkspace } from '@/config/workspaces/workspace-resolver';
import {
  filterNavigationGroups,
  flattenNavigationItems,
  NAV_GROUPS,
  normalizeNavigationSource,
  SUPPORT_LINKS,
  type NavigationItem,
} from '@/components/navigationConfig';
import {
  findSelectedNavigationItemId,
  getExpandableNavigationItemState,
  getNavigationGroupDisclosureState,
  navigationGroupContainsId,
} from '@/lib/navigation/workspaceNavigationState';

export const NAV_ITEMS = flattenNavigationItems();

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ProtectedBackgroundElement = {
  element: HTMLElement;
  ariaHidden: string | null;
  hadInert: boolean;
};

function getFocusableElements(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisibleFocusable);
}

function isVisibleFocusable(element: HTMLElement | null): element is HTMLElement {
  if (!element?.isConnected || element.closest('[inert]') || element.closest('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { signOut, user } = useAuth();
  const unreadNotifications = useUnreadNotifications(user?.id);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [activeSource, setActiveSource] = useState(pathname);
  const [search, setSearch] = useState('');
  const [openPrimaryGroupIds, setOpenPrimaryGroupIds] = useState<string[]>(() => NAV_GROUPS
    .filter(group => group.defaultOpen)
    .map(group => group.id));
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);
  const [openGlobalGroupIds, setOpenGlobalGroupIds] = useState<string[]>(['account']);
  const [supportOpen, setSupportOpen] = useState(false);
  const previousLang = useRef(lang);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { access: adminAccess } = useAdminAccess(user?.id);
  const activeWorkspace = resolveActiveWorkspace(pathname);
  const navGroups = useMemo(
    () => filterGroupsForWorkspace(filterNavigationGroups(NAV_GROUPS, adminAccess), activeWorkspace.id),
    [adminAccess, activeWorkspace.id],
  );
  const primaryGroups = useMemo(() => navGroups.filter(group => group.id !== 'account'), [navGroups]);
  const globalGroups = useMemo(() => navGroups.filter(group => group.id === 'account'), [navGroups]);
  const selectedItemId = useMemo(
    () => findSelectedNavigationItemId(activeSource, navGroups, SUPPORT_LINKS),
    [activeSource, navGroups],
  );
  const activeSupport = SUPPORT_LINKS.some(item => item.id === selectedItemId);
  const activeParentItemIds = useMemo(
    () => navGroups.flatMap(group => group.items
      .filter(item => item.children?.some(child => child.id === selectedItemId))
      .map(item => item.id)),
    [navGroups, selectedItemId],
  );

  useEffect(() => {
    const updateLocation = () => {
      const browserSearch = search || window.location.search;
      const nextPath = new URLSearchParams(browserSearch).get('next');
      const basePath = pathname === '/login' && nextPath?.startsWith('/') ? nextPath : pathname;
      const routeSearch = basePath === pathname ? browserSearch : '';
      setActiveSource(normalizeNavigationSource(basePath, window.location.hash, routeSearch));
    };
    updateLocation();
    window.addEventListener('hashchange', updateLocation);
    return () => window.removeEventListener('hashchange', updateLocation);
  }, [pathname, search]);

  useEffect(() => {
    if (!open) return;
    setOpenItemIds(current => Array.from(new Set([...current, ...activeParentItemIds])));
    const activeGlobalGroup = globalGroups.find(group => navigationGroupContainsId(group, selectedItemId));
    if (activeGlobalGroup) {
      setOpenGlobalGroupIds(current => current.includes(activeGlobalGroup.id)
        ? current
        : [...current, activeGlobalGroup.id]);
    }
    if (activeSupport) setSupportOpen(true);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sfm-mobile-lock');
    return () => {
      document.body.style.overflow = original;
      document.body.classList.remove('sfm-mobile-lock');
    };
  }, [activeParentItemIds, activeSupport, globalGroups, open, selectedItemId]);

  useEffect(() => {
    if (!open) return;
    const desktopMedia = window.matchMedia('(min-width: 768px)');
    const closeAtDesktopWidth = (event?: MediaQueryListEvent) => {
      if (event?.matches ?? desktopMedia.matches) onCloseRef.current();
    };
    closeAtDesktopWidth();
    desktopMedia.addEventListener('change', closeAtDesktopWidth);
    return () => desktopMedia.removeEventListener('change', closeAtDesktopWidth);
  }, [open]);

  useEffect(() => {
    if (!open || !selectedItemId) return;
    const target = dialogRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, openGlobalGroupIds, openItemIds, openPrimaryGroupIds, selectedItemId, supportOpen]);

  useEffect(() => {
    if (previousLang.current !== lang && open) onClose();
    previousLang.current = lang;
  }, [lang, onClose, open]);

  useEffect(() => {
    if (!open) return;

    const layer = layerRef.current;
    const dialog = dialogRef.current;
    if (!layer || !dialog) return;

    const activeElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const drawerTrigger = document.querySelector<HTMLElement>('[aria-controls="sfm-mobile-menu"]');
    previouslyFocusedRef.current = activeElement && activeElement !== document.body
      ? activeElement
      : drawerTrigger;

    const protectedElements = new Map<HTMLElement, ProtectedBackgroundElement>();

    const getOwnedPortalRoots = () => {
      const portalRoots: HTMLElement[] = [];

      dialog.querySelectorAll<HTMLElement>('[aria-controls]').forEach(control => {
        if (control.getAttribute('aria-expanded') === 'false') return;
        const controlledId = control.getAttribute('aria-controls');
        const controlledElement = controlledId ? document.getElementById(controlledId) : null;
        if (controlledElement && !layer.contains(controlledElement)) portalRoots.push(controlledElement);
      });

      if (dialog.querySelector('.sfm-user-chip[aria-expanded="true"]')) {
        const userMenus = document.querySelectorAll<HTMLElement>('body > .sfm-user-menu');
        const ownedUserMenu = userMenus[userMenus.length - 1];
        if (ownedUserMenu) portalRoots.push(ownedUserMenu);
      }

      return portalRoots;
    };

    const protectElement = (element: HTMLElement) => {
      if (protectedElements.has(element)) return;
      protectedElements.set(element, {
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        hadInert: element.hasAttribute('inert'),
      });
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
    };

    const protectBackground = () => {
      const ownedPortalRoots = getOwnedPortalRoots();
      let modalBranch: HTMLElement | null = layer;

      while (modalBranch && modalBranch !== document.body) {
        const parentElement: HTMLElement | null = modalBranch.parentElement;
        if (!parentElement) break;

        Array.from(parentElement.children).forEach(sibling => {
          if (!(sibling instanceof HTMLElement) || sibling === modalBranch) return;
          const containsOwnedPortal = ownedPortalRoots.some(root => sibling === root || sibling.contains(root));
          if (!containsOwnedPortal) protectElement(sibling);
        });

        modalBranch = parentElement;
      }
    };

    const moveFocusIntoDialog = () => {
      const target = closeButtonRef.current ?? dialog;
      target.focus({ preventScroll: true });
    };

    moveFocusIntoDialog();
    protectBackground();

    const focusFrame = window.requestAnimationFrame(() => {
      const ownedPortalRoots = getOwnedPortalRoots();
      const activeElement = document.activeElement;
      const focusIsInsideModal = activeElement instanceof Node
        && (dialog.contains(activeElement) || ownedPortalRoots.some(root => root.contains(activeElement)));
      if (!focusIsInsideModal) moveFocusIntoDialog();
    });

    const observer = new MutationObserver(protectBackground);
    let observedBranch: HTMLElement | null = layer;
    while (observedBranch && observedBranch !== document.body) {
      const parentElement: HTMLElement | null = observedBranch.parentElement;
      if (!parentElement) break;
      observer.observe(parentElement, { childList: true });
      observedBranch = parentElement;
    }
    observer.observe(dialog, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded'],
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const openDisclosure = dialog.querySelector<HTMLElement>(
          '.sfm-language-trigger[aria-expanded="true"], .sfm-user-chip[aria-expanded="true"]',
        );
        if (openDisclosure) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusRoots: ParentNode[] = [dialog, ...getOwnedPortalRoots()];
      const focusableElements = Array.from(new Set(focusRoots.flatMap(getFocusableElements)));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const activeIndex = activeElement instanceof HTMLElement
        ? focusableElements.indexOf(activeElement)
        : -1;

      if (event.shiftKey && (activeElement === firstElement || activeIndex === -1)) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeElement === lastElement || activeIndex === -1)) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown, true);

      protectedElements.forEach(({ element, ariaHidden, hadInert }) => {
        if (!element.isConnected) return;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
        if (!hadInert) element.removeAttribute('inert');
      });

      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      const fallback = [
        document.querySelector<HTMLElement>('.sfm-global-header .sfm-command-trigger'),
        document.getElementById('main-content'),
      ].find(isVisibleFocusable) ?? null;
      const focusTarget = isVisibleFocusable(previouslyFocused) ? previouslyFocused : fallback;
      focusTarget?.focus({ preventScroll: true });
    };
  }, [open]);

  const handleLogout = async () => {
    await signOut();
    onClose();
    router.push('/login');
    router.refresh();
  };

  const renderDestination = ({
    item,
    className,
    content,
    selected,
    ariaLabel,
  }: {
    item: NavigationItem;
    className: string;
    content: ReactNode;
    selected: boolean;
    ariaLabel: string;
  }) => {
    const sharedProps = {
      className,
      'aria-current': selected ? 'page' as const : undefined,
      'aria-label': ariaLabel,
    };

    if (item.action === 'logout') {
      return (
        <button type="button" {...sharedProps} onClick={() => void handleLogout()}>
          {content}
        </button>
      );
    }

    if (!item.href) return null;

    if (item.external) {
      return (
        <a
          {...sharedProps}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          {content}
        </a>
      );
    }

    return (
      <Link {...sharedProps} href={item.href} onClick={onClose}>
        {content}
      </Link>
    );
  };

  const renderMobileItem = (item: NavigationItem, groupId: string) => {
    const Icon = item.icon;
    const selected = item.id === selectedItemId;
    const hasChildren = Boolean(item.children?.length);
    const accessibleLabel = item.id === 'notif' && unreadNotifications > 0
      ? `${t(item.labelKey)} (${unreadNotifications})`
      : t(item.labelKey);

    if (hasChildren) {
      const state = getExpandableNavigationItemState(item, selectedItemId, openItemIds.includes(item.id));
      const nestedId = `${groupId}-item-${item.id}`;
      return (
        <li key={item.id} className="sfm-mobile-nested">
          <button
            type="button"
            className={`sfm-mobile-parent-item${state.expanded ? ' expanded' : ''}`}
            aria-expanded={state.expanded}
            aria-controls={nestedId}
            aria-label={t(item.labelKey)}
            onClick={() => setOpenItemIds(current => current.includes(item.id)
              ? current.filter(id => id !== item.id)
              : [...current, item.id])}
          >
            <span className="sfm-mobile-nav-icon" aria-hidden="true"><Icon size={18} /></span>
            <span className="sfm-mobile-item-label">{t(item.labelKey)}</span>
            <ChevronDown className="sfm-mobile-nested-chevron" size={15} aria-hidden="true" />
          </button>
          <div
            className={`sfm-mobile-disclosure${state.expanded ? ' expanded' : ''}`}
            id={nestedId}
            aria-hidden={!state.expanded}
            inert={state.expanded ? undefined : true}
          >
            <div>
              <ul className="sfm-mobile-subitems">
                {item.children?.map(child => {
                  const ChildIcon = child.icon;
                  const childSelected = child.id === selectedItemId;
                  return (
                    <li key={child.id}>
                      {renderDestination({
                        item: child,
                        className: `sfm-mobile-subitem${childSelected ? ' active' : ''}`,
                        selected: childSelected,
                        ariaLabel: t(child.labelKey),
                        content: (
                          <>
                            <span className="sfm-mobile-subitem-icon" aria-hidden="true"><ChildIcon size={16} /></span>
                            <span className="sfm-mobile-item-label">{t(child.labelKey)}</span>
                          </>
                        ),
                      })}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </li>
      );
    }

    return (
      <li key={item.id}>
        {renderDestination({
          item,
          className: `sfm-mobile-nav-item${item.action === 'logout' ? ' danger' : ''}${selected ? ' active' : ''}`,
          selected,
          ariaLabel: accessibleLabel,
          content: (
            <>
              <span className="sfm-mobile-nav-icon" aria-hidden="true"><Icon size={18} /></span>
              <span className="sfm-mobile-item-label">{t(item.labelKey)}</span>
              {item.id === 'notif' && unreadNotifications > 0 ? (
                <span className="sfm-mobile-badge" aria-hidden="true">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : null}
            </>
          ),
        })}
      </li>
    );
  };

  const menuLabel = t('nav_mobile_menu');
  const closeLabel = t('nav_close_menu');

  return (
    <div ref={layerRef} className={`sfm-mobile-layer${open ? ' open' : ''}`} aria-hidden={!open} dir={dir}>
      <Suspense fallback={null}>
        <NavigationQueryObserver onQueryChange={setSearch} />
      </Suspense>
      <button type="button" className="sfm-mobile-overlay" aria-label={closeLabel} aria-hidden="true" onClick={onClose} tabIndex={-1} />
      <aside
        ref={dialogRef}
        id="sfm-mobile-menu"
        className="sfm-mobile-panel"
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-labelledby="sfm-mobile-menu-label"
        tabIndex={-1}
      >
        <div className="sfm-mobile-panel-head">
          <div className="sfm-mobile-logo">
            <Image src="/sfm-logo.png" alt="" width={42} height={42} priority className="sfm-brand-mark sfm-brand-mark--mobile" />
            <div>
              <strong>THE SFM</strong>
              <span id="sfm-mobile-menu-label">{menuLabel}</span>
            </div>
          </div>
          <div className="sfm-mobile-head-actions">
            <DensityToggle />
            <ThemeToggle />
            <button ref={closeButtonRef} type="button" className="sfm-mobile-close" aria-label={closeLabel} onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="sfm-mobile-search">
          <CommandMenuButton
            dark={isDark}
            onBeforeOpen={onClose}
            focusReturnTarget={() => document.querySelector<HTMLElement>('[aria-controls="sfm-mobile-menu"]')}
          />
        </div>

        <nav className="sfm-mobile-nav" aria-label={menuLabel}>
          {primaryGroups.map(group => {
            const groupId = `sfm-mobile-group-${group.id}`;
            const headingId = `${groupId}-heading`;
            const disclosureId = `${groupId}-items`;
            const groupState = getNavigationGroupDisclosureState(
              group,
              selectedItemId,
              openPrimaryGroupIds.includes(group.id),
            );
            const items = (
              <ul className="sfm-mobile-group-items">
                {group.items.map(item => renderMobileItem(item, groupId))}
              </ul>
            );
            return (
              <section
                key={group.id}
                className={`sfm-mobile-group${groupState.expanded ? ' expanded' : ''}${groupState.active ? ' has-active' : ''}`}
                aria-labelledby={group.id === 'main' ? undefined : headingId}
              >
                {group.id === 'main' ? null : group.collapsible ? (
                  <button
                    type="button"
                    className="sfm-mobile-group-toggle"
                    id={headingId}
                    aria-expanded={groupState.expanded}
                    aria-controls={disclosureId}
                    onClick={() => setOpenPrimaryGroupIds(current => current.includes(group.id)
                      ? current.filter(id => id !== group.id)
                      : [...current, group.id])}
                  >
                    <span>{t(group.labelKey)}</span>
                    <ChevronDown className="sfm-mobile-group-chevron" size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <h2 className="sfm-mobile-group-label" id={headingId}>{t(group.labelKey)}</h2>
                )}
                {group.collapsible ? (
                  <div
                    className={`sfm-mobile-disclosure${groupState.expanded ? ' expanded' : ''}`}
                    id={disclosureId}
                    aria-hidden={!groupState.expanded}
                    inert={groupState.expanded ? undefined : true}
                  >
                    <div>{items}</div>
                  </div>
                ) : items}
              </section>
            );
          })}
        </nav>

        <div className="sfm-mobile-utilities">
          <nav
            className="sfm-mobile-utility-nav"
            aria-label={`${t('nav_group_account')} / ${t('nav_group_support')}`}
          >
            {globalGroups.map(group => {
              const expanded = openGlobalGroupIds.includes(group.id);
              const groupId = `sfm-mobile-global-${group.id}`;
              return (
                <section key={group.id} className="sfm-mobile-global-group" aria-label={t(group.labelKey)}>
                  <button
                    type="button"
                    className={`sfm-mobile-global-toggle${expanded ? ' expanded' : ''}`}
                    aria-expanded={expanded}
                    aria-controls={groupId}
                    onClick={() => setOpenGlobalGroupIds(current => current.includes(group.id)
                      ? current.filter(id => id !== group.id)
                      : [...current, group.id])}
                  >
                    <span>{t(group.labelKey)}</span>
                    <ChevronDown className="sfm-mobile-global-chevron" size={15} aria-hidden="true" />
                  </button>
                  <div
                    className={`sfm-mobile-disclosure${expanded ? ' expanded' : ''}`}
                    id={groupId}
                    aria-hidden={!expanded}
                    inert={expanded ? undefined : true}
                  >
                    <div>
                      <ul className="sfm-mobile-group-items">
                        {group.items.map(item => renderMobileItem(item, groupId))}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })}

            <section className="sfm-mobile-support" aria-label={t('nav_group_support')}>
              <button
                type="button"
                className={`sfm-mobile-global-toggle${supportOpen ? ' expanded' : ''}`}
                aria-expanded={supportOpen}
                aria-controls="sfm-mobile-group-support"
                onClick={() => setSupportOpen(current => !current)}
              >
                <span>{t('nav_group_support')}</span>
                <ChevronDown className="sfm-mobile-global-chevron" size={15} aria-hidden="true" />
              </button>
              <div
                className={`sfm-mobile-disclosure${supportOpen ? ' expanded' : ''}`}
                id="sfm-mobile-group-support"
                aria-hidden={!supportOpen}
                inert={supportOpen ? undefined : true}
              >
                <div className="sfm-mobile-support-links">
                  {SUPPORT_LINKS.map(item => {
                    const Icon = item.icon;
                    const active = item.id === selectedItemId;
                    return (
                      <div key={item.id} className="sfm-mobile-support-entry">
                        {renderDestination({
                          item,
                          className: `sfm-mobile-support-link${active ? ' active' : ''}`,
                          selected: active,
                          ariaLabel: `${t(item.labelKey)} ${item.caption ?? ''}`.trim(),
                          content: (
                            <>
                              <span className="sfm-mobile-support-icon" aria-hidden="true"><Icon size={16} /></span>
                              <span className="sfm-mobile-support-copy">
                                <span>{t(item.labelKey)}</span>
                                {item.caption ? <small>{item.caption}</small> : null}
                              </span>
                            </>
                          ),
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </nav>

          <div className="sfm-mobile-account-controls">
            <div className="sfm-mobile-user"><UserChip /></div>
            <div className="sfm-mobile-lang">
              <LanguageSwitcher variant={isDark ? 'dark' : 'light'} compact />
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .sfm-mobile-layer{
          position:fixed;inset:0;z-index:9999;max-width:100%;overflow:hidden;isolation:isolate;
          pointer-events:none;visibility:hidden;font-family:var(--font-ui);transition:visibility 0s linear var(--duration)
        }
        .sfm-mobile-layer.open{pointer-events:auto;visibility:visible;transition-delay:0s}
        .sfm-mobile-overlay{position:fixed;inset:0;z-index:9998;border:0;background:var(--background-overlay);opacity:0;cursor:pointer;transition:opacity var(--duration) var(--ease)}
        .sfm-mobile-layer.open .sfm-mobile-overlay{opacity:1}
        .sfm-mobile-panel{position:fixed;inset-block:0;inset-inline-start:0;z-index:9999;width:min(408px,92vw);max-width:100%;height:100vh;height:100dvh;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));background:var(--sidebar-background)!important;border-inline-end:1px solid var(--sidebar-border)!important;border-radius:0 var(--radius-panel) var(--radius-panel) 0;box-shadow:var(--shadow-lg);color:var(--sidebar-foreground)!important;transform:translateX(-102%);transition:transform var(--duration) var(--ease)}
        [dir="rtl"] .sfm-mobile-panel{transform:translateX(102%);border-radius:var(--radius-panel) 0 0 var(--radius-panel)}
        .sfm-mobile-layer.open .sfm-mobile-panel{transform:translateX(0)}
        body.sfm-mobile-lock .sfm-language-dropdown,body.sfm-mobile-lock .sfm-user-chip-wrap{visibility:hidden!important;pointer-events:none!important}
        body.sfm-mobile-lock .sfm-mobile-panel .sfm-language-dropdown,body.sfm-mobile-lock .sfm-mobile-panel .sfm-user-chip-wrap{visibility:visible!important;pointer-events:auto!important}
        body.sfm-mobile-lock .sfm-language-option{min-height:var(--control-h)}
        .sfm-mobile-panel-head,.sfm-mobile-logo,.sfm-mobile-head-actions{display:flex;align-items:center}
        .sfm-mobile-panel-head{min-height:56px;justify-content:space-between;gap:10px;padding:5px 6px 11px;border-bottom:1px solid var(--sidebar-border);flex:0 0 auto;background:color-mix(in srgb,var(--sidebar-expanded) 62%,transparent);border-radius:var(--radius-card) var(--radius-card) 0 0}
        .sfm-mobile-head-actions{gap:6px;flex:0 0 auto}
        .sfm-mobile-logo{min-width:0;gap:10px}.sfm-mobile-logo img{width:36px;height:36px;flex:0 0 36px;object-fit:cover}.sfm-mobile-logo strong{display:block;color:var(--sidebar-foreground);font-size:15px;font-weight:600;line-height:1.45}.sfm-mobile-logo span{display:block;color:var(--sidebar-muted);font-size:var(--type-caption-size);font-weight:var(--type-caption-weight);line-height:var(--type-caption-leading);margin-top:1px;overflow-wrap:anywhere}
        .sfm-mobile-close{width:var(--control-h);height:var(--control-h);min-width:var(--control-h);display:grid;place-items:center;border:1px solid var(--sidebar-border);border-radius:var(--radius-control);background:var(--surface-elevated);color:var(--sidebar-foreground);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
        .sfm-mobile-close:hover{background:var(--sidebar-hover);border-color:color-mix(in srgb,var(--primary) 28%,var(--sidebar-border));color:var(--primary)}
        .sfm-mobile-close:active{transform:scale(.97)}
        .sfm-mobile-close:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
        .sfm-mobile-panel .sfm-command-trigger,.sfm-mobile-panel .sfm-theme-toggle,.sfm-mobile-panel .sfm-language-trigger{min-height:var(--control-h)}
        .sfm-mobile-search{padding:9px 2px;border-bottom:1px solid var(--sidebar-border);flex:0 0 auto}
        .sfm-mobile-search .sfm-command-trigger{width:100%;border-color:color-mix(in srgb,var(--sidebar-foreground) 10%,var(--sidebar-border));background:color-mix(in srgb,var(--surface-elevated) 88%,var(--sidebar-expanded));box-shadow:var(--shadow-xs)}
        .sfm-mobile-search .sfm-command-trigger:hover{border-color:color-mix(in srgb,var(--primary) 30%,var(--sidebar-border));background:var(--sidebar-hover)}
        .sfm-mobile-nav{flex:1 1 8rem;min-height:0;display:grid;align-content:start;gap:10px;margin:0;padding:10px 2px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scroll-padding-block:10px}
        .sfm-mobile-group{display:grid;gap:6px;min-width:0;padding:7px;border:1px solid color-mix(in srgb,var(--sidebar-border) 72%,transparent);border-radius:var(--radius-card);background:color-mix(in srgb,var(--sidebar-expanded) 58%,transparent);box-shadow:var(--shadow-xs)}
        .sfm-mobile-group.has-active{border-color:color-mix(in srgb,var(--primary) 24%,var(--sidebar-border))}
        .sfm-mobile-group-label{display:flex;align-items:center;gap:7px;margin:0;padding:3px 8px;color:var(--sidebar-muted);font-size:var(--type-label-size);font-weight:var(--type-label-weight);line-height:var(--type-label-leading);overflow-wrap:anywhere}
        .sfm-mobile-group-label::before{content:"";width:5px;height:5px;flex:0 0 5px;border-radius:var(--radius-pill);background:color-mix(in srgb,var(--primary) 58%,var(--sidebar-muted))}
        .sfm-mobile-group-toggle,.sfm-mobile-global-toggle{width:100%;min-width:0;min-height:var(--control-h);display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--sidebar-muted);text-align:start;font:var(--type-label-weight) var(--type-label-size)/var(--type-label-leading) var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
        .sfm-mobile-group-toggle>span,.sfm-mobile-global-toggle>span{min-width:0;flex:1;overflow-wrap:anywhere}
        .sfm-mobile-group-toggle:hover,.sfm-mobile-global-toggle:hover{background:var(--sidebar-hover);border-color:color-mix(in srgb,var(--sidebar-foreground) 9%,var(--sidebar-border));color:var(--sidebar-foreground);box-shadow:var(--shadow-xs)}
        .sfm-mobile-group-toggle[aria-expanded="true"],.sfm-mobile-global-toggle.expanded{background:var(--sidebar-expanded);color:var(--sidebar-foreground);border-color:color-mix(in srgb,var(--sidebar-foreground) 8%,var(--sidebar-border))}
        .sfm-mobile-group-toggle:active,.sfm-mobile-global-toggle:active{transform:scale(.99)}
        .sfm-mobile-group-items,.sfm-mobile-subitems{display:grid;gap:4px;margin:0;padding:0;list-style:none}
        .sfm-mobile-group-items li,.sfm-mobile-subitems li{min-width:0;list-style:none}
        .sfm-mobile-nav-item,.sfm-mobile-parent-item,.sfm-mobile-subitem,.sfm-mobile-support-link{position:relative;width:100%;min-width:0;min-height:var(--control-h);display:flex;align-items:center;gap:9px;padding:6px 8px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--foreground-secondary);text-align:start;text-decoration:none;font:var(--type-navigation-weight) var(--type-navigation-size)/var(--type-navigation-leading) var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
        .sfm-mobile-nav-item:hover,.sfm-mobile-parent-item:hover,.sfm-mobile-subitem:hover,.sfm-mobile-support-link:hover{background:var(--sidebar-hover);border-color:color-mix(in srgb,var(--sidebar-foreground) 8%,var(--sidebar-border));color:var(--sidebar-foreground);box-shadow:var(--shadow-xs)}
        .sfm-mobile-nav-item:active,.sfm-mobile-parent-item:active,.sfm-mobile-subitem:active,.sfm-mobile-support-link:active{transform:scale(.99)}
        .sfm-mobile-nav-item:focus-visible,.sfm-mobile-parent-item:focus-visible,.sfm-mobile-subitem:focus-visible,.sfm-mobile-group-toggle:focus-visible,.sfm-mobile-global-toggle:focus-visible,.sfm-mobile-support-link:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
        .sfm-mobile-nav-item.active,.sfm-mobile-subitem.active,.sfm-mobile-support-link.active{background:var(--sidebar-active);border-color:color-mix(in srgb,var(--primary) 22%,var(--sidebar-border));color:var(--sidebar-active-foreground);font-weight:var(--type-navigation-active-weight);box-shadow:var(--shadow-xs)}
        .sfm-mobile-nav-item.active::before,.sfm-mobile-subitem.active::before,.sfm-mobile-support-link.active::before{content:"";position:absolute;inset-inline-start:0;inset-block:8px;width:3px;border-radius:var(--radius-pill);background:var(--primary)}
        .sfm-mobile-parent-item.expanded{background:var(--sidebar-expanded);border-color:color-mix(in srgb,var(--sidebar-foreground) 7%,var(--sidebar-border));color:var(--sidebar-foreground);box-shadow:none}
        .sfm-mobile-nav-item.danger:hover,.sfm-mobile-nav-item.danger:focus-visible{background:var(--danger-soft);color:var(--danger)}
        .sfm-mobile-nav-icon,.sfm-mobile-subitem-icon,.sfm-mobile-support-icon{width:30px;height:30px;display:grid;place-items:center;flex:0 0 30px;border-radius:var(--radius-control);background:color-mix(in srgb,var(--sidebar-muted) 8%,transparent);color:var(--sidebar-muted);transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
        .sfm-mobile-nav-item:hover .sfm-mobile-nav-icon,.sfm-mobile-parent-item:hover .sfm-mobile-nav-icon,.sfm-mobile-subitem:hover .sfm-mobile-subitem-icon,.sfm-mobile-support-link:hover .sfm-mobile-support-icon{background:color-mix(in srgb,var(--primary) 9%,transparent);color:var(--sidebar-foreground)}
        .sfm-mobile-nav-item.active .sfm-mobile-nav-icon,.sfm-mobile-subitem.active .sfm-mobile-subitem-icon,.sfm-mobile-support-link.active .sfm-mobile-support-icon{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary)}
        .sfm-mobile-item-label,.sfm-mobile-support-copy{min-width:0;flex:1;overflow-wrap:anywhere;hyphens:auto}
        .sfm-mobile-badge{min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding-inline:5px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--sidebar-border));border-radius:var(--radius-pill);background:var(--sidebar-active);color:var(--sidebar-active-foreground);font-family:var(--font-data);font-size:12px;font-weight:600;line-height:1;direction:ltr;unicode-bidi:isolate}
        .sfm-mobile-nested{display:grid;gap:3px}
        .sfm-mobile-nested-chevron,.sfm-mobile-group-chevron,.sfm-mobile-global-chevron{margin-inline-start:auto;flex:0 0 auto;color:var(--sidebar-muted);transition:transform var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
        .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron,.sfm-mobile-group-toggle[aria-expanded="false"] .sfm-mobile-group-chevron,.sfm-mobile-global-toggle[aria-expanded="false"] .sfm-mobile-global-chevron{transform:rotate(90deg)}
        [dir="ltr"] .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron,[dir="ltr"] .sfm-mobile-group-toggle[aria-expanded="false"] .sfm-mobile-group-chevron,[dir="ltr"] .sfm-mobile-global-toggle[aria-expanded="false"] .sfm-mobile-global-chevron{transform:rotate(-90deg)}
        .sfm-mobile-disclosure{display:grid;grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows var(--duration-fast) var(--ease),opacity var(--duration-fast) var(--ease),visibility 0s linear var(--duration-fast)}
        .sfm-mobile-disclosure>div{min-height:0;overflow:hidden}
        .sfm-mobile-disclosure.expanded{grid-template-rows:1fr;opacity:1;visibility:visible;transition-delay:0s}
        .sfm-mobile-subitems{padding-inline-start:12px;margin-inline-start:14px;margin-top:3px;border-inline-start:1px solid color-mix(in srgb,var(--sidebar-border) 82%,transparent)}
        .sfm-mobile-subitem{font-size:var(--type-navigation-size)}
        .sfm-mobile-utilities{flex:0 1 auto;min-height:0;max-height:min(43dvh,360px);display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;padding:8px;border:1px solid color-mix(in srgb,var(--sidebar-border) 88%,transparent);border-radius:var(--radius-card);background:color-mix(in srgb,var(--sidebar-expanded) 72%,var(--sidebar-background));box-shadow:var(--shadow-xs)}
        .sfm-mobile-utility-nav{min-height:0;display:grid;align-content:start;gap:6px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}
        .sfm-mobile-global-group,.sfm-mobile-support{display:grid;gap:4px;min-width:0}
        .sfm-mobile-support{padding-top:6px;border-top:1px solid var(--sidebar-border)}
        .sfm-mobile-support-links{display:grid;gap:4px}
        .sfm-mobile-support-entry{min-width:0}
        .sfm-mobile-support-copy{display:grid;gap:1px}.sfm-mobile-support-copy small{display:block;color:var(--sidebar-muted);font-size:var(--type-caption-size);font-weight:var(--type-caption-weight);line-height:var(--type-caption-leading);direction:ltr;unicode-bidi:isolate}
        .sfm-mobile-account-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--sidebar-border)}
        .sfm-mobile-user,.sfm-mobile-lang{display:flex;min-width:0}.sfm-mobile-lang{justify-content:flex-end}
        .sfm-mobile-panel .sfm-user-chip,.sfm-mobile-panel .sfm-language-trigger{min-width:var(--control-h);min-height:var(--control-h);height:var(--control-h)!important;background:var(--surface-elevated)!important;border-color:var(--sidebar-border)!important;color:var(--sidebar-foreground)!important;box-shadow:var(--shadow-xs)!important;font-family:inherit!important;font-weight:500!important}
        .sfm-mobile-panel .sfm-user-name{color:var(--sidebar-foreground)!important}.sfm-mobile-panel .sfm-user-chevron{color:var(--sidebar-muted)!important}
        @media(max-width:430px){.sfm-mobile-panel{width:100%;border-radius:0!important;padding-inline:10px}.sfm-mobile-panel-head{padding-inline:2px}.sfm-mobile-panel .sfm-user-chip-wrap{max-width:100%}}
        @media(max-height:620px){.sfm-mobile-panel{padding-block-start:calc(8px + env(safe-area-inset-top));padding-block-end:calc(8px + env(safe-area-inset-bottom))}.sfm-mobile-panel-head{min-height:48px;padding-block:2px 7px}.sfm-mobile-search{padding-block:6px}.sfm-mobile-nav{padding-block:7px}.sfm-mobile-utilities{max-height:46dvh}}
        @media(prefers-reduced-motion:reduce){.sfm-mobile-layer,.sfm-mobile-overlay,.sfm-mobile-panel,.sfm-mobile-close,.sfm-mobile-nav-item,.sfm-mobile-parent-item,.sfm-mobile-subitem,.sfm-mobile-support-link,.sfm-mobile-group-toggle,.sfm-mobile-global-toggle,.sfm-mobile-global-chevron,.sfm-mobile-group-chevron,.sfm-mobile-nested-chevron,.sfm-mobile-disclosure,.sfm-mobile-nav-icon,.sfm-mobile-subitem-icon,.sfm-mobile-support-icon{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
      `}</style>
    </div>
  );
}

export default MobileMenu;
