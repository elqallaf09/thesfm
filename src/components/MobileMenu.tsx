'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserChip } from '@/components/UserChip';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  filterNavigationGroups,
  findActiveNavigationGroup,
  flattenNavigationItems,
  isNavigationItemActive,
  isNavigationItemOrChildActive,
  NAV_GROUPS,
  normalizeNavigationSource,
  SUPPORT_LINKS,
  type NavigationItem,
} from '@/components/navigationConfig';

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
  const { viewMode, setViewMode } = useViewMode();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const [activeSource, setActiveSource] = useState(pathname);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);
  const previousLang = useRef(lang);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const activeGroupId = useMemo(() => findActiveNavigationGroup(activeSource), [activeSource]);
  const activeSupport = useMemo(
    () => SUPPORT_LINKS.some(item => isNavigationItemActive(activeSource, item.href)),
    [activeSource],
  );
  const activeSidebarGroupId = activeGroupId ?? (activeSupport ? 'support' : null);
  const { access: adminAccess } = useAdminAccess(user?.id);
  const navGroups = useMemo(() => filterNavigationGroups(NAV_GROUPS, viewMode, adminAccess), [viewMode, adminAccess]);
  const activeParentItemIds = useMemo(
    () => navGroups.flatMap(group =>
      group.items
        .filter(item => item.children?.some(child => isNavigationItemOrChildActive(activeSource, child)))
        .map(item => item.id),
    ),
    [activeSource, navGroups],
  );
  const preferredOpenGroupId = useMemo(() => {
    if (activeSidebarGroupId) return activeSidebarGroupId;
    const defaultGroup = navGroups.find(group => group.defaultOpen);
    return defaultGroup?.id ?? navGroups[0]?.id ?? null;
  }, [activeSidebarGroupId, navGroups]);

  useEffect(() => {
    const nextPath = typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('next');
    const basePath = pathname === '/login' && nextPath?.startsWith('/') ? nextPath : pathname;
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    setActiveSource(normalizeNavigationSource(basePath, hash));
  }, [pathname]);

  useEffect(() => {
    const updateHash = () => setActiveSource(normalizeNavigationSource(pathname, window.location.hash));
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    setOpenGroupId(preferredOpenGroupId);
    setOpenItemIds(activeParentItemIds);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sfm-mobile-lock');
    return () => {
      document.body.style.overflow = original;
      document.body.classList.remove('sfm-mobile-lock');
    };
  }, [activeParentItemIds, open, preferredOpenGroupId]);

  useEffect(() => {
    if (!open || !openGroupId) return;
    const target = document.getElementById(`sfm-mobile-section-${openGroupId}`);
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, openGroupId]);

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

  const menuLabel = t('nav_mobile_menu');
  const closeLabel = t('nav_close_menu');

  return (
    <div ref={layerRef} className={`sfm-mobile-layer${open ? ' open' : ''}`} aria-hidden={!open} dir={dir}>
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
            <ThemeToggle />
            <button ref={closeButtonRef} type="button" className="sfm-mobile-close" aria-label={closeLabel} onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="sfm-mobile-user">
          <UserChip />
        </div>

        <div className="sfm-mobile-lang">
          <LanguageSwitcher variant={isDark ? 'dark' : 'light'} compact />
        </div>

        <div className="sfm-mobile-view-mode">
          <ViewModeSelector value={viewMode} onChange={setViewMode} variant={isDark ? 'dark' : 'light'} compact />
        </div>

        <nav className="sfm-mobile-nav" aria-label={menuLabel}>
          {navGroups.map(group => {
            const expanded = openGroupId === group.id;
            const activeGroup = activeSidebarGroupId === group.id;
            const groupId = `sfm-mobile-group-${group.id}`;
            return (
              <section key={group.id} id={`sfm-mobile-section-${group.id}`} className="sfm-mobile-group">
                <button
                  type="button"
                  className={`sfm-mobile-section${activeGroup ? ' active' : ''}`}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => setOpenGroupId(current => current === group.id ? null : group.id)}
                >
                  <span>{t(group.labelKey)}</span>
                  <ChevronDown size={15} />
                </button>
                {expanded && (
                  <div className="sfm-mobile-group-items" id={groupId}>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isNavigationItemActive(activeSource, item.href);
                      const childActive = Boolean(item.children?.some(child => isNavigationItemOrChildActive(activeSource, child)));
                      const hasChildren = Boolean(item.children?.length);
                      const itemOpen = childActive || openItemIds.includes(item.id);
                      if (hasChildren) {
                        const nestedId = `${groupId}-item-${item.id}`;
                        return (
                          <div key={item.id} className="sfm-mobile-nested">
                            <button
                              type="button"
                              className={`sfm-mobile-parent-item${childActive ? ' active' : ''}`}
                              aria-expanded={itemOpen}
                              aria-controls={nestedId}
                              onClick={() => setOpenItemIds(current =>
                                current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id],
                              )}
                            >
                              <span className="sfm-mobile-nav-icon"><Icon size={18} /></span>
                              <span>{t(item.labelKey)}</span>
                              <ChevronDown className="sfm-mobile-nested-chevron" size={15} />
                            </button>
                            {itemOpen && (
                              <div className="sfm-mobile-subitems" id={nestedId}>
                                {item.children?.map(child => {
                                  const ChildIcon = child.icon;
                                  const childItemActive = isNavigationItemActive(activeSource, child.href);
                                  return (
                                    <button
                                      key={child.id}
                                      type="button"
                                      className={`sfm-mobile-subitem${childItemActive ? ' active' : ''}`}
                                      aria-current={childItemActive ? 'page' : undefined}
                                      onClick={() => go(child)}
                                    >
                                      <span className="sfm-mobile-subitem-icon"><ChildIcon size={15} /></span>
                                      <span>{t(child.labelKey)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
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
                          <span className="sfm-mobile-nav-icon"><Icon size={18} /></span>
                          <span>{t(item.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
        <section className="sfm-mobile-support" aria-label={t('nav_group_support')}>
          <button
            type="button"
            className={`sfm-mobile-section${activeSupport ? ' active' : ''}`}
            aria-expanded={openGroupId === 'support'}
            aria-controls="sfm-mobile-group-support"
            onClick={() => setOpenGroupId(current => current === 'support' ? null : 'support')}
          >
            <span>{t('nav_group_support')}</span>
            <ChevronDown size={15} />
          </button>
          {openGroupId === 'support' && (
            <div className="sfm-mobile-support-links" id="sfm-mobile-group-support">
              {SUPPORT_LINKS.map(item => {
                const Icon = item.icon;
                const active = isNavigationItemActive(activeSource, item.href);
                const content = (
                  <>
                    <span className="sfm-mobile-support-icon"><Icon size={15} /></span>
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
          )}
        </section>
      </aside>

      <style jsx global>{`
        .sfm-mobile-layer{position:fixed;inset:0;z-index:9999;pointer-events:none;visibility:hidden;font-family:Tajawal,Arial,sans-serif;max-width:100%;overflow:hidden;isolation:isolate}
        .sfm-mobile-layer.open{pointer-events:auto;visibility:visible}
        .sfm-mobile-overlay{position:fixed;inset:0;z-index:9998;border:0;background:rgba(3,18,37,.68);opacity:0;cursor:pointer;transition:opacity .24s ease;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
        .sfm-mobile-layer.open .sfm-mobile-overlay{opacity:1}
        .sfm-mobile-layer{--mobile-menu-bg:#F8FAFB;--mobile-menu-bg-2:#E8EEF4;--mobile-menu-card:#FAFBFC;--mobile-menu-card-hover:#E0E8F0;--mobile-menu-border:#C5D0DA;--mobile-menu-text:#10243B;--mobile-menu-secondary:#3F5369;--mobile-menu-muted:#566C80;--mobile-menu-accent:#1B5EC8}
        .dark .sfm-mobile-layer,html.dark .sfm-mobile-layer,[data-theme="dark"] .sfm-mobile-layer{--mobile-menu-bg:#061A2E;--mobile-menu-bg-2:#071B2F;--mobile-menu-card:#102F52;--mobile-menu-card-hover:#163C62;--mobile-menu-border:rgba(167,243,240,.18);--mobile-menu-text:#F8FAFC;--mobile-menu-secondary:#D8E8F8;--mobile-menu-muted:#9FB4CC;--mobile-menu-accent:#2FD6C0}
        .sfm-mobile-panel{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:85%;max-width:min(420px,100%);z-index:9999;display:flex;flex-direction:column;min-height:0;padding:calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));overflow:hidden;background:radial-gradient(circle at 16% 10%,rgba(27,94,200,.09),transparent 30%),linear-gradient(180deg,var(--mobile-menu-bg),var(--mobile-menu-bg-2))!important;border-inline-start:1px solid var(--mobile-menu-border)!important;border-radius:var(--r-2xl) 0 0 var(--r-2xl);box-shadow:-24px 0 70px rgba(16,36,59,.18);color:var(--mobile-menu-text)!important;transform:translateX(104%);transition:transform .28s cubic-bezier(.2,.9,.2,1);will-change:transform;color-scheme:light}
        .dark .sfm-mobile-panel,html.dark .sfm-mobile-panel,[data-theme="dark"] .sfm-mobile-panel{background:radial-gradient(circle at 16% 10%,rgba(47,214,192,.20),transparent 30%),linear-gradient(180deg,#061A2E,#071B2F)!important;border-color:rgba(167,243,240,.20)!important;color:#F8FAFC!important;box-shadow:-24px 0 70px rgba(0,0,0,.50)!important;color-scheme:dark}
        [dir="ltr"] .sfm-mobile-panel{right:auto;left:0;border-inline-start:0;border-inline-end:1px solid var(--mobile-menu-border);border-radius:0 var(--r-2xl) var(--r-2xl) 0;box-shadow:24px 0 70px rgba(0,0,0,.42);transform:translateX(-104%)}
        html.dark[dir="ltr"] .sfm-mobile-panel,.dark[dir="ltr"] .sfm-mobile-panel,html.dark [dir="ltr"] .sfm-mobile-panel,.dark [dir="ltr"] .sfm-mobile-panel{box-shadow:24px 0 70px rgba(0,0,0,.50)!important}
        .sfm-mobile-layer.open .sfm-mobile-panel{transform:translateX(0)}
        .sfm-mobile-panel-head,.sfm-mobile-logo,.sfm-mobile-nav button{display:flex;align-items:center}
        body.sfm-mobile-lock .sfm-language-dropdown,
        body.sfm-mobile-lock .sfm-user-chip-wrap{visibility:hidden!important;pointer-events:none!important}
        body.sfm-mobile-lock .sfm-mobile-panel .sfm-language-dropdown,
        body.sfm-mobile-lock .sfm-mobile-panel .sfm-user-chip-wrap{visibility:visible!important;pointer-events:auto!important}
        .sfm-mobile-panel-head{justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--mobile-menu-border);flex:0 0 auto}
        .sfm-mobile-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
        .sfm-mobile-logo{min-width:0;gap:10px}.sfm-mobile-logo img{object-fit:cover}.sfm-mobile-logo strong{display:block;color:var(--mobile-menu-accent);font-size:17px;font-weight:900;letter-spacing:0}.sfm-mobile-logo span{display:block;color:var(--mobile-menu-secondary);font-size:12px;font-weight:800;margin-top:2px}
        .sfm-mobile-close{flex:0 0 auto;width:42px;height:42px;border:1px solid var(--mobile-menu-border);border-radius:var(--r-md);display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--mobile-menu-text);cursor:pointer}
        .sfm-mobile-user{padding:12px 0;border-bottom:1px solid var(--mobile-menu-border);flex:0 0 auto}
        .sfm-mobile-lang{display:flex;justify-content:center;padding:12px 0;border-bottom:1px solid var(--mobile-menu-border);flex:0 0 auto}
        .sfm-mobile-view-mode{padding:12px 0;border-bottom:1px solid var(--mobile-menu-border);flex:0 0 auto}
        .sfm-mobile-nav{flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:8px;margin-inline:-4px;padding:12px 4px 10px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scroll-padding-block:12px}
        .sfm-mobile-group{display:grid;gap:5px;border-bottom:1px solid var(--mobile-menu-border);padding-bottom:7px}
        .sfm-mobile-group:last-child{border-bottom:0}
        .sfm-mobile-section{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;border:1px solid transparent;border-radius:var(--r-md);padding:6px 10px;background:transparent;color:var(--mobile-menu-secondary);cursor:pointer;font:900 11px Tajawal,Arial,sans-serif;text-align:start;transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease}
        .sfm-mobile-section:hover,.sfm-mobile-section:focus-visible{background:var(--mobile-menu-card-hover);border-color:var(--mobile-menu-accent);color:var(--mobile-menu-text);outline:0;box-shadow:0 0 0 2px rgba(34,211,238,.18)}
        .sfm-mobile-section.active{background:rgba(34,211,238,.12);border-color:rgba(34,211,238,.32);color:var(--mobile-menu-text)}
        .sfm-mobile-section svg{transition:transform .18s ease}
        .sfm-mobile-section[aria-expanded="false"] svg{transform:rotate(90deg)}
        [dir="ltr"] .sfm-mobile-section[aria-expanded="false"] svg{transform:rotate(-90deg)}
        .sfm-mobile-group-items{display:grid;gap:5px}
        .sfm-mobile-nav .sfm-mobile-group-items button{position:relative;width:100%;min-height:44px;gap:11px;border:1px solid transparent;border-radius:var(--r-lg);padding:9px 12px;background:transparent;color:var(--mobile-menu-secondary);cursor:pointer;font:850 13.5px Tajawal,Arial,sans-serif;text-align:start;transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease,box-shadow .18s ease;min-width:0}
        .sfm-mobile-nav .sfm-mobile-group-items button span:last-child{min-width:0;overflow-wrap:anywhere;white-space:normal}
        .sfm-mobile-nav .sfm-mobile-group-items button:hover,.sfm-mobile-nav .sfm-mobile-group-items button:focus-visible{border-color:var(--mobile-menu-accent);background:var(--mobile-menu-card-hover);color:var(--mobile-menu-text);outline:0;box-shadow:0 0 0 2px rgba(34,211,238,.18);transform:translateY(-1px)}
        .sfm-mobile-nav .sfm-mobile-group-items button.active{border-color:var(--mobile-menu-accent);background:linear-gradient(135deg,rgba(34,211,238,.22),rgba(56,189,248,.14)),var(--mobile-menu-card);color:var(--mobile-menu-text);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 10px 26px rgba(0,0,0,.20)}
        .sfm-mobile-nav .sfm-mobile-group-items button.active::before{content:"";position:absolute;inset-inline-start:5px;top:50%;width:5px;height:24px;border-radius:999px;background:var(--mobile-menu-accent);box-shadow:0 0 14px rgba(34,211,238,.72);transform:translateY(-50%)}.sfm-mobile-nav button:active{transform:scale(.99)}
        .sfm-mobile-nav-icon{width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:var(--r-sm);background:rgba(255,255,255,.08);color:var(--mobile-menu-secondary);transition:background .18s ease,color .18s ease}.sfm-mobile-nav button:hover .sfm-mobile-nav-icon,.sfm-mobile-nav button.active .sfm-mobile-nav-icon{background:rgba(34,211,238,.18);color:var(--mobile-menu-accent)}
        .sfm-mobile-nested{display:grid;gap:5px}
        .sfm-mobile-parent-item .sfm-mobile-nested-chevron{margin-inline-start:auto;flex:0 0 auto;opacity:.75;transition:transform .18s ease}
        .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron{transform:rotate(90deg)}
        [dir="ltr"] .sfm-mobile-parent-item[aria-expanded="false"] .sfm-mobile-nested-chevron{transform:rotate(-90deg)}
        .sfm-mobile-subitems{display:grid;gap:4px;padding-inline-start:18px}
        .sfm-mobile-nav .sfm-mobile-group-items .sfm-mobile-subitem{min-height:38px;border-radius:var(--r-md);padding:7px 10px;font-size:12px;background:rgba(255,255,255,.035)}
        .sfm-mobile-subitem-icon{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;border-radius:var(--r-sm);background:rgba(255,255,255,.07);color:var(--mobile-menu-secondary)}
        .sfm-mobile-subitem:hover .sfm-mobile-subitem-icon,.sfm-mobile-subitem.active .sfm-mobile-subitem-icon{background:rgba(34,211,238,.16);color:var(--mobile-menu-accent)}
        .sfm-mobile-support{flex:0 0 auto;margin-top:0;padding-top:14px;border-top:1px solid rgba(34,211,238,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);display:grid;gap:8px}
        .sfm-mobile-support-title{color:var(--mobile-menu-muted);font:950 11px Tajawal,Arial,sans-serif;padding-inline:4px}
        .sfm-mobile-support-links{display:grid;gap:5px}
        .sfm-mobile-support-links button,.sfm-mobile-support-links a{position:relative;width:100%;min-height:38px;border:1px solid transparent;border-radius:var(--r-md);background:transparent;color:var(--mobile-menu-secondary);display:flex;align-items:center;gap:9px;padding:7px 10px;text-align:start;text-decoration:none;font:850 12.5px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
        .sfm-mobile-support-links button:hover,.sfm-mobile-support-links button:focus-visible,.sfm-mobile-support-links a:hover,.sfm-mobile-support-links a:focus-visible{background:var(--mobile-menu-card-hover);border-color:var(--mobile-menu-accent);color:var(--mobile-menu-text);outline:0;box-shadow:0 0 0 2px rgba(34,211,238,.16);transform:translateY(-1px)}
        .sfm-mobile-support-links button.active,.sfm-mobile-support-links a.active{background:var(--mobile-menu-card);border-color:var(--mobile-menu-accent);color:var(--mobile-menu-text)}
        .sfm-mobile-support-icon{width:22px;height:22px;display:grid;place-items:center;border-radius:var(--r-sm);background:rgba(255,255,255,.07);color:var(--mobile-menu-accent);flex:0 0 22px}
        .sfm-mobile-support-copy{min-width:0;display:grid;gap:1px;line-height:1.2;overflow-wrap:anywhere}
        .sfm-mobile-support-copy small{display:block;color:var(--mobile-menu-muted);font-size:11px;font-weight:900;direction:ltr;unicode-bidi:isolate}
        .sfm-mobile-support-links button:hover .sfm-mobile-support-copy small,.sfm-mobile-support-links button:focus-visible .sfm-mobile-support-copy small,.sfm-mobile-support-links a:hover .sfm-mobile-support-copy small,.sfm-mobile-support-links a:focus-visible .sfm-mobile-support-copy small{color:var(--mobile-menu-text)}
        .dark .sfm-mobile-panel :is(.sfm-mobile-logo strong,.sfm-mobile-close,.sfm-mobile-section,.sfm-mobile-nav .sfm-mobile-group-items button,.sfm-mobile-support-links button,.sfm-mobile-support-links a),html.dark .sfm-mobile-panel :is(.sfm-mobile-logo strong,.sfm-mobile-close,.sfm-mobile-section,.sfm-mobile-nav .sfm-mobile-group-items button,.sfm-mobile-support-links button,.sfm-mobile-support-links a){color:#F8FAFC!important}
        .dark .sfm-mobile-panel :is(.sfm-mobile-logo span,.sfm-mobile-support-title,.sfm-mobile-support-copy small),html.dark .sfm-mobile-panel :is(.sfm-mobile-logo span,.sfm-mobile-support-title,.sfm-mobile-support-copy small){color:#9FB4CC!important}
        .dark .sfm-mobile-panel :is(.sfm-mobile-section,.sfm-mobile-nav .sfm-mobile-group-items button,.sfm-mobile-support-links button,.sfm-mobile-support-links a),html.dark .sfm-mobile-panel :is(.sfm-mobile-section,.sfm-mobile-nav .sfm-mobile-group-items button,.sfm-mobile-support-links button,.sfm-mobile-support-links a){background:transparent!important;border-color:transparent!important;opacity:1!important;text-shadow:none!important}
        .dark .sfm-mobile-panel :is(.sfm-mobile-section:hover,.sfm-mobile-section:focus-visible,.sfm-mobile-nav .sfm-mobile-group-items button:hover,.sfm-mobile-nav .sfm-mobile-group-items button:focus-visible,.sfm-mobile-support-links button:hover,.sfm-mobile-support-links button:focus-visible,.sfm-mobile-support-links a:hover,.sfm-mobile-support-links a:focus-visible),html.dark .sfm-mobile-panel :is(.sfm-mobile-section:hover,.sfm-mobile-section:focus-visible,.sfm-mobile-nav .sfm-mobile-group-items button:hover,.sfm-mobile-nav .sfm-mobile-group-items button:focus-visible,.sfm-mobile-support-links button:hover,.sfm-mobile-support-links button:focus-visible,.sfm-mobile-support-links a:hover,.sfm-mobile-support-links a:focus-visible){background:#163C62!important;border-color:#2FD6C0!important;color:#FFFFFF!important}
        .dark .sfm-mobile-panel :is(.sfm-mobile-section.active,.sfm-mobile-nav .sfm-mobile-group-items button.active,.sfm-mobile-support-links button.active,.sfm-mobile-support-links a.active),html.dark .sfm-mobile-panel :is(.sfm-mobile-section.active,.sfm-mobile-nav .sfm-mobile-group-items button.active,.sfm-mobile-support-links button.active,.sfm-mobile-support-links a.active){background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(29,140,255,.15)),#102F52!important;border-color:rgba(47,214,192,.48)!important;color:#FFFFFF!important}
        .dark .sfm-mobile-panel :is(.sfm-mobile-nav-icon,.sfm-mobile-subitem-icon,.sfm-mobile-support-icon),html.dark .sfm-mobile-panel :is(.sfm-mobile-nav-icon,.sfm-mobile-subitem-icon,.sfm-mobile-support-icon){background:rgba(248,250,252,.08)!important;color:#D8E8F8!important}
        .dark .sfm-mobile-panel :is(.sfm-theme-toggle,.sfm-language-trigger,.sfm-user-chip),html.dark .sfm-mobile-panel :is(.sfm-theme-toggle,.sfm-language-trigger,.sfm-user-chip){background:#0F1D31!important;border-color:#1D3050!important;color:#E8EEF6!important;box-shadow:0 10px 24px rgba(0,0,0,.18)!important}
        @media(max-width:640px){
          .sfm-mobile-overlay{backdrop-filter:none;-webkit-backdrop-filter:none}
          .sfm-mobile-panel{box-shadow:-14px 0 38px rgba(0,0,0,.34)}
          [dir="ltr"] .sfm-mobile-panel{box-shadow:14px 0 38px rgba(0,0,0,.34)}
        }
      `}</style>
    </div>
  );
}

export default MobileMenu;
