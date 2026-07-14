'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(element => {
    if (!element.isConnected || element.closest('[inert]') || element.closest('[aria-hidden="true"]')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  });
}

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { signOut, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [activeSource, setActiveSource] = useState(pathname);
  const [search, setSearch] = useState('');
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
    if (!open || !selectedItemId) return;
    const target = dialogRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedItemId]);

  useEffect(() => {
    if (previousLang.current !== lang && open) onClose();
    previousLang.current = lang;
  }, [lang, onClose, open]);

  useEffect(() => {
    if (!open) return;

    const layer = layerRef.current;
    const dialog = dialogRef.current;
    if (!layer || !dialog) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

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
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open]);

  const go = async (item: NavigationItem) => {
    if (item.action === 'logout') {
      await signOut();
      onClose();
      router.push('/login');
      router.refresh();
      return;
    }
    if (!item.href) return;
    onClose();
    if (item.external) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(item.href);
  };

  const renderMobileItem = (item: NavigationItem, groupId: string) => {
    const Icon = item.icon;
    const selected = item.id === selectedItemId;
    const hasChildren = Boolean(item.children?.length);

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
          {state.expanded ? (
            <ul className="sfm-mobile-subitems" id={nestedId}>
              {item.children?.map(child => {
                const ChildIcon = child.icon;
                const childSelected = child.id === selectedItemId;
                return (
                  <li key={child.id}>
                    <button
                      type="button"
                      className={`sfm-mobile-subitem${childSelected ? ' active' : ''}`}
                      aria-current={childSelected ? 'page' : undefined}
                      aria-label={t(child.labelKey)}
                      onClick={() => go(child)}
                    >
                      <span className="sfm-mobile-subitem-icon" aria-hidden="true"><ChildIcon size={16} /></span>
                      <span className="sfm-mobile-item-label">{t(child.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </li>
      );
    }

    return (
      <li key={item.id}>
        <button
          type="button"
          className={`sfm-mobile-nav-item${selected ? ' active' : ''}`}
          aria-current={selected ? 'page' : undefined}
          aria-label={t(item.labelKey)}
          onClick={() => go(item)}
        >
          <span className="sfm-mobile-nav-icon" aria-hidden="true"><Icon size={18} /></span>
          <span className="sfm-mobile-item-label">{t(item.labelKey)}</span>
        </button>
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
            <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} priority className="sfm-brand-mark sfm-brand-mark--mobile" />
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
          <CommandMenuButton dark={isDark} />
        </div>

        <nav className="sfm-mobile-nav" aria-label={menuLabel}>
          {primaryGroups.map(group => {
            const groupId = `sfm-mobile-group-${group.id}`;
            const headingId = `${groupId}-heading`;
            return (
              <section
                key={group.id}
                className="sfm-mobile-group"
                aria-labelledby={group.id === 'main' ? undefined : headingId}
              >
                {group.id === 'main' ? null : (
                  <h2 className="sfm-mobile-group-label" id={headingId}>{t(group.labelKey)}</h2>
                )}
                <ul className="sfm-mobile-group-items" id={groupId}>
                  {group.items.map(item => renderMobileItem(item, groupId))}
                </ul>
              </section>
            );
          })}

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
                {expanded ? (
                  <ul className="sfm-mobile-group-items" id={groupId}>
                    {group.items.map(item => renderMobileItem(item, groupId))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </nav>

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
          {supportOpen ? (
            <div className="sfm-mobile-support-links" id="sfm-mobile-group-support">
              {SUPPORT_LINKS.map(item => {
                const Icon = item.icon;
                const active = item.id === selectedItemId;
                const content = (
                  <>
                    <span className="sfm-mobile-support-icon" aria-hidden="true"><Icon size={16} /></span>
                    <span className="sfm-mobile-support-copy">
                      <span>{t(item.labelKey)}</span>
                      {item.caption ? <small>{item.caption}</small> : null}
                    </span>
                  </>
                );
                if (item.external && item.href) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sfm-mobile-support-link"
                      aria-label={`${t(item.labelKey)} ${item.caption ?? ''}`.trim()}
                      onClick={onClose}
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={active ? 'active' : ''}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => go(item)}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="sfm-mobile-account-controls">
          <div className="sfm-mobile-user"><UserChip /></div>
          <div className="sfm-mobile-lang">
            <LanguageSwitcher variant={isDark ? 'dark' : 'light'} compact />
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .sfm-mobile-layer{
          position:fixed;inset:0;z-index:9999;max-width:100%;overflow:hidden;isolation:isolate;
          pointer-events:none;visibility:hidden;
          font-family:var(--font-ui)
        }
        .sfm-mobile-layer.open{pointer-events:auto;visibility:visible}
        .sfm-mobile-overlay{position:fixed;inset:0;z-index:9998;border:0;background:var(--background-overlay);opacity:0;cursor:pointer;transition:opacity .2s ease}
        .sfm-mobile-layer.open .sfm-mobile-overlay{opacity:1}
        .sfm-mobile-panel{position:fixed;inset-block:0;inset-inline-start:0;z-index:9999;width:min(390px,92vw);height:100vh;height:100dvh;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));background:var(--sidebar-background)!important;border-inline-end:1px solid var(--sidebar-border)!important;border-radius:0 var(--radius-panel) var(--radius-panel) 0;box-shadow:var(--shadow-lg);color:var(--sidebar-foreground)!important;transform:translateX(-102%);transition:transform .22s ease;will-change:transform}
        [dir="rtl"] .sfm-mobile-panel{transform:translateX(102%);border-radius:var(--radius-panel) 0 0 var(--radius-panel)}
        .sfm-mobile-layer.open .sfm-mobile-panel{transform:translateX(0)}
        body.sfm-mobile-lock .sfm-language-dropdown,body.sfm-mobile-lock .sfm-user-chip-wrap{visibility:hidden!important;pointer-events:none!important}
        body.sfm-mobile-lock .sfm-mobile-panel .sfm-language-dropdown,body.sfm-mobile-lock .sfm-mobile-panel .sfm-user-chip-wrap{visibility:visible!important;pointer-events:auto!important}
        .sfm-mobile-panel-head,.sfm-mobile-logo,.sfm-mobile-head-actions{display:flex;align-items:center}
        .sfm-mobile-panel-head{min-height:52px;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--sidebar-border);flex:0 0 auto}
        .sfm-mobile-head-actions{gap:7px;flex:0 0 auto}
        .sfm-mobile-logo{min-width:0;gap:9px}.sfm-mobile-logo img{width:36px;height:36px;flex:0 0 36px;object-fit:cover}.sfm-mobile-logo strong{display:block;color:var(--sidebar-foreground);font-size:15px;font-weight:600;line-height:1.3}.sfm-mobile-logo span{display:block;color:var(--sidebar-muted);font-size:11px;font-weight:400;line-height:1.4;margin-top:1px}
        .sfm-mobile-close{width:44px;height:44px;min-width:44px;display:grid;place-items:center;border:1px solid var(--sidebar-border);border-radius:var(--radius-control);background:var(--surface-elevated);color:var(--sidebar-foreground);cursor:pointer}
        .sfm-mobile-close:hover{background:var(--sidebar-hover)}
        .sfm-mobile-close:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        .sfm-mobile-panel .sfm-command-trigger,.sfm-mobile-panel .sfm-theme-toggle,.sfm-mobile-panel .sfm-language-trigger{min-height:44px}
        .sfm-mobile-search{padding:8px 0;border-bottom:1px solid var(--sidebar-border);flex:0 0 auto}
        .sfm-mobile-nav{flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:12px;margin:0;padding:10px 2px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scroll-padding-block:10px}
        .sfm-mobile-group{display:grid;gap:5px;padding-bottom:11px;border-bottom:1px solid var(--sidebar-border)}
        .sfm-mobile-group-label{margin:0;padding-inline:8px;color:var(--sidebar-muted);font-size:11px;font-weight:500;line-height:1.5;overflow-wrap:anywhere}
        .sfm-mobile-group-items,.sfm-mobile-subitems{display:grid;gap:3px;margin:0;padding:0;list-style:none}
        .sfm-mobile-group-items li,.sfm-mobile-subitems li{min-width:0;list-style:none}
        .sfm-mobile-nav-item,.sfm-mobile-parent-item,.sfm-mobile-subitem,.sfm-mobile-support-links button,.sfm-mobile-support-links a{position:relative;width:100%;min-width:0;min-height:44px;display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--foreground-secondary);text-align:start;text-decoration:none;font:500 13.5px/1.5 var(--font-ui);cursor:pointer;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
        .sfm-mobile-nav-item:hover,.sfm-mobile-parent-item:hover,.sfm-mobile-subitem:hover,.sfm-mobile-support-links button:hover,.sfm-mobile-support-links a:hover{background:var(--sidebar-hover);color:var(--sidebar-foreground)}
        .sfm-mobile-nav-item:focus-visible,.sfm-mobile-parent-item:focus-visible,.sfm-mobile-subitem:focus-visible,.sfm-mobile-global-toggle:focus-visible,.sfm-mobile-support-links button:focus-visible,.sfm-mobile-support-links a:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px}
        .sfm-mobile-nav-item.active,.sfm-mobile-subitem.active,.sfm-mobile-support-links button.active,.sfm-mobile-support-links a.active{background:var(--sidebar-active);color:var(--sidebar-active-foreground);font-weight:600}
        .sfm-mobile-nav-item.active::before,.sfm-mobile-subitem.active::before,.sfm-mobile-support-links button.active::before,.sfm-mobile-support-links a.active::before{content:"";position:absolute;inset-inline-start:0;inset-block:8px;width:3px;border-radius:var(--radius-pill);background:var(--primary)}
        .sfm-mobile-parent-item.expanded{background:var(--sidebar-expanded);color:var(--sidebar-foreground)}
        .sfm-mobile-nav-icon,.sfm-mobile-subitem-icon,.sfm-mobile-support-icon{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;color:var(--sidebar-muted)}
        .active>.sfm-mobile-nav-icon,.sfm-mobile-subitem.active .sfm-mobile-subitem-icon,.sfm-mobile-support-links .active .sfm-mobile-support-icon{color:var(--primary)}
        .sfm-mobile-item-label,.sfm-mobile-support-copy{min-width:0;flex:1;overflow-wrap:anywhere;hyphens:auto}
        .sfm-mobile-nested{display:grid;gap:3px}
        .sfm-mobile-nested-chevron,.sfm-mobile-global-chevron{margin-inline-start:auto;flex:0 0 auto;color:var(--sidebar-muted);transition:transform .15s ease}
        .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron,.sfm-mobile-global-toggle[aria-expanded="false"] .sfm-mobile-global-chevron{transform:rotate(90deg)}
        [dir="ltr"] .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron,[dir="ltr"] .sfm-mobile-global-toggle[aria-expanded="false"] .sfm-mobile-global-chevron{transform:rotate(-90deg)}
        .sfm-mobile-subitems{padding-inline-start:18px;margin-top:2px}.sfm-mobile-subitem{font-size:13px}
        .sfm-mobile-global-group{display:grid;gap:4px;padding-top:2px}
        .sfm-mobile-global-toggle{width:100%;min-height:44px;display:flex;align-items:center;gap:8px;padding:7px 9px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--sidebar-muted);text-align:start;font:500 11.5px/1.5 var(--font-ui);cursor:pointer}
        .sfm-mobile-global-toggle:hover,.sfm-mobile-global-toggle.expanded{background:var(--sidebar-hover);color:var(--sidebar-foreground)}
        .sfm-mobile-support{flex:0 0 auto;display:grid;gap:5px;padding:8px 2px;border-top:1px solid var(--sidebar-border);max-height:38vh;overflow-y:auto;overflow-x:hidden}
        .sfm-mobile-support-links{display:grid;gap:3px}.sfm-mobile-support-links button,.sfm-mobile-support-links a{min-height:44px;font-size:13px}
        .sfm-mobile-support-copy{display:grid;gap:1px}.sfm-mobile-support-copy small{display:block;color:var(--sidebar-muted);font-size:10.5px;font-weight:400;line-height:1.35;direction:ltr;unicode-bidi:isolate}
        .sfm-mobile-account-controls{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--sidebar-border)}
        .sfm-mobile-user,.sfm-mobile-lang{display:flex;min-width:0}.sfm-mobile-lang{justify-content:flex-end}
        .sfm-mobile-panel .sfm-user-chip,.sfm-mobile-panel .sfm-language-trigger{min-width:44px;min-height:44px;height:44px!important;background:var(--surface-elevated)!important;border-color:var(--sidebar-border)!important;color:var(--sidebar-foreground)!important;box-shadow:none!important;font-family:inherit!important;font-weight:500!important}
        .sfm-mobile-panel .sfm-user-name{color:var(--sidebar-foreground)!important}.sfm-mobile-panel .sfm-user-chevron{color:var(--sidebar-muted)!important}
        @media(max-width:430px){.sfm-mobile-panel{width:100%;border-radius:0!important;padding-inline:10px}.sfm-mobile-account-controls{grid-template-columns:1fr}.sfm-mobile-lang{justify-content:flex-start}.sfm-mobile-panel .sfm-user-chip-wrap{max-width:100%}}
        @media(prefers-reduced-motion:reduce){.sfm-mobile-overlay,.sfm-mobile-panel,.sfm-mobile-nav-item,.sfm-mobile-parent-item,.sfm-mobile-subitem,.sfm-mobile-global-toggle,.sfm-mobile-global-chevron,.sfm-mobile-nested-chevron{transition:none}}
      `}</style>
    </div>
  );
}

export default MobileMenu;
