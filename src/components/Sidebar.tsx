'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  UserRound,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { CommandMenuButton } from '@/components/CommandMenuButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { NavigationQueryObserver } from '@/components/NavigationQueryObserver';
import { filterGroupsForWorkspace } from '@/config/workspaces/workspace-navigation';
import { resolveActiveWorkspace } from '@/config/workspaces/workspace-resolver';
import {
  filterNavigationGroups,
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

const SIDEBAR_COPY = {
  ar: { collapse: 'طي الشريط الجانبي', expand: 'توسيع الشريط الجانبي' },
  en: { collapse: 'Collapse sidebar', expand: 'Expand sidebar' },
  fr: { collapse: 'Réduire la barre latérale', expand: 'Développer la barre latérale' },
} as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { t, dir, lang } = useLanguage();
  const { signOut, user } = useAuth();
  const unreadNotifications = useUnreadNotifications(user?.id);
  const [hash, setHash] = useState('');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);
  const [openGroupIds, setOpenGroupIds] = useState<string[]>(() =>
    NAV_GROUPS.filter(group => group.collapsible && group.defaultOpen).map(group => group.id));
  const [openGlobalGroupIds, setOpenGlobalGroupIds] = useState<string[]>(['account']);
  const [supportOpen, setSupportOpen] = useState(false);
  const previousSidebarWidth = useRef<string | null>(null);
  const navigationScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateHash = () => setHash(typeof window === 'undefined' ? '' : window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, [pathname]);

  const activeSource = normalizeNavigationSource(pathname, hash, search);
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

  useEffect(() => {
    const activeParents = navGroups.flatMap(group => group.items
      .filter(item => item.children?.some(child => child.id === selectedItemId))
      .map(item => item.id));
    if (!activeParents.length) return;
    setOpenItemIds(current => Array.from(new Set([...current, ...activeParents])));
  }, [navGroups, selectedItemId]);

  useEffect(() => {
    const activeGlobalGroup = globalGroups.find(group => navigationGroupContainsId(group, selectedItemId));
    if (!activeGlobalGroup) return;
    setOpenGlobalGroupIds(current => current.includes(activeGlobalGroup.id)
      ? current
      : [...current, activeGlobalGroup.id]);
  }, [globalGroups, selectedItemId]);

  useEffect(() => {
    if (activeSupport) setSupportOpen(true);
  }, [activeSupport]);

  useEffect(() => {
    if (!selectedItemId) return;
    const frame = window.requestAnimationFrame(() => {
      const sidebar = navigationScrollRef.current?.closest<HTMLElement>('.sfm-shared-sidebar');
      const target = sidebar?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!target) return;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, openGlobalGroupIds, openGroupIds, openItemIds, selectedItemId, supportOpen]);

  useEffect(() => {
    const root = document.documentElement;
    previousSidebarWidth.current = root.style.getPropertyValue('--sidebar-w') || null;
    return () => {
      if (previousSidebarWidth.current) root.style.setProperty('--sidebar-w', previousSidebarWidth.current);
      else root.style.removeProperty('--sidebar-w');
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia('(min-width: 768px)');
    const applyWidth = () => {
      if (!desktop.matches) {
        if (previousSidebarWidth.current) root.style.setProperty('--sidebar-w', previousSidebarWidth.current);
        else root.style.removeProperty('--sidebar-w');
        return;
      }
      if (collapsed) root.style.setProperty('--sidebar-w', '72px');
      else if (previousSidebarWidth.current) root.style.setProperty('--sidebar-w', previousSidebarWidth.current);
      else root.style.removeProperty('--sidebar-w');
    };
    applyWidth();
    desktop.addEventListener('change', applyWidth);
    return () => desktop.removeEventListener('change', applyWidth);
  }, [collapsed]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const handleAction = async (item: NavigationItem) => {
    if (item.action === 'logout') await handleLogout();
  };

  const toggleNestedItem = (itemId: string) => {
    setOpenItemIds(current => current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId]);
  };

  const withCollapsedTooltip = (label: string, element: ReactElement) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        {collapsed ? (
          <TooltipContent
            portalled
            className="sfm-sidebar-tooltip"
            side={dir === 'rtl' ? 'left' : 'right'}
            sideOffset={10}
          >
            {label}
          </TooltipContent>
        ) : null}
      </Tooltip>
    );
  };

  const renderNavigationItem = (item: NavigationItem, groupId: string) => {
    const NavIcon = item.icon;
    const selected = item.id === selectedItemId;
    const hasChildren = Boolean(item.children?.length);

    if (hasChildren) {
      const state = getExpandableNavigationItemState(item, selectedItemId, openItemIds.includes(item.id));
      const expanded = collapsed || state.expanded;
      const nestedId = `sfm-sidebar-${groupId}-${item.id}`;
      const parent = (
        <button
          type="button"
          onClick={() => collapsed ? setCollapsed(false) : toggleNestedItem(item.id)}
          className={`sfm-shared-item sfm-shared-item-parent${state.expanded ? ' expanded' : ''}`}
          aria-expanded={expanded}
          aria-controls={nestedId}
          aria-label={t(item.labelKey)}
        >
          <span className="sfm-shared-icon" aria-hidden="true"><NavIcon size={18} /></span>
          <span className="sfm-shared-label">{t(item.labelKey)}</span>
          <ChevronDown className="sfm-nested-chevron" size={15} aria-hidden="true" />
        </button>
      );
      return (
        <li key={item.id} className="sfm-shared-item-wrap">
          {withCollapsedTooltip(t(item.labelKey), parent)}
          <div
            className="sfm-shared-disclosure"
            data-expanded={expanded ? 'true' : 'false'}
            aria-hidden={!expanded}
            inert={!expanded}
          >
            <div>
              <ul className="sfm-shared-subitems" id={nestedId}>
                {item.children?.map(child => {
                  const ChildIcon = child.icon;
                  const childSelected = child.id === selectedItemId;
                  const content = (
                    <>
                      <span className="sfm-shared-subitem-icon" aria-hidden="true"><ChildIcon size={18} /></span>
                      <span className="sfm-shared-subitem-label">{t(child.labelKey)}</span>
                    </>
                  );
                  const childElement = child.href ? (
                    <Link
                      href={child.href}
                      className={`sfm-shared-subitem${childSelected ? ' active' : ''}`}
                      aria-current={childSelected ? 'page' : undefined}
                      aria-label={t(child.labelKey)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`sfm-shared-subitem${childSelected ? ' active' : ''}`}
                      aria-current={childSelected ? 'page' : undefined}
                      aria-label={t(child.labelKey)}
                      onClick={() => handleAction(child)}
                    >
                      {content}
                    </button>
                  );
                  return <li key={child.id}>{withCollapsedTooltip(t(child.labelKey), childElement)}</li>;
                })}
              </ul>
            </div>
          </div>
        </li>
      );
    }

    const content = (
      <>
        <span className="sfm-shared-icon" aria-hidden="true"><NavIcon size={18} /></span>
        <span className="sfm-shared-label">{t(item.labelKey)}</span>
        {item.id === 'notif' && unreadNotifications > 0 ? (
          <span className="sfm-shared-badge" aria-hidden="true">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        ) : null}
      </>
    );
    const className = `sfm-shared-item${item.action === 'logout' ? ' danger' : ''}${selected ? ' active' : ''}`;
    const accessibleLabel = item.id === 'notif' && unreadNotifications > 0
      ? `${t(item.labelKey)} (${unreadNotifications})`
      : t(item.labelKey);
    const element = item.href ? (
      <Link
        href={item.href}
        className={className}
        aria-current={selected ? 'page' : undefined}
        aria-label={accessibleLabel}
      >
        {content}
      </Link>
    ) : (
      <button
        type="button"
        className={className}
        aria-current={selected ? 'page' : undefined}
        aria-label={accessibleLabel}
        onClick={() => handleAction(item)}
      >
        {content}
      </button>
    );

    return (
      <li key={item.id} className="sfm-shared-item-wrap">
        {withCollapsedTooltip(t(item.labelKey), element)}
      </li>
    );
  };

  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const collapseLabel = collapsed ? SIDEBAR_COPY[locale].expand : SIDEBAR_COPY[locale].collapse;
  const CollapseIcon = collapsed
    ? (dir === 'rtl' ? ChevronLeft : ChevronRight)
    : (dir === 'rtl' ? ChevronRight : ChevronLeft);

  return (
    <TooltipProvider delayDuration={260} skipDelayDuration={100}>
      <aside
        className="sfm-shared-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        dir={dir}
        aria-label={t('nav_mobile_menu')}
      >
        <Suspense fallback={null}>
          <NavigationQueryObserver onQueryChange={setSearch} />
        </Suspense>
        <style>{`
          .sfm-shared-sidebar{
            width:var(--sidebar-w,230px);height:calc(100dvh - var(--global-header-height));max-height:calc(100dvh - var(--global-header-height));min-height:0;
            position:sticky;inset-block-start:var(--global-header-height);inset-inline-start:0;align-self:start;z-index:50;display:flex;flex-direction:column;
            overflow:visible;background:var(--sidebar-background);color:var(--sidebar-foreground);
            border-inline-end:1px solid var(--sidebar-border);box-shadow:var(--shadow-sm);
            font-family:var(--font-ui);transition:width var(--duration-fast) var(--ease)
          }
          .sfm-shared-sidebar::after{content:"";position:absolute;inset-block:0;inset-inline-end:0;width:1px;background:color-mix(in srgb,var(--surface-elevated) 70%,transparent);pointer-events:none}
          .sfm-shared-sidebar[data-collapsed="true"]{width:72px}
          .sfm-shared-tools{display:grid;gap:8px;padding:10px;border-bottom:1px solid var(--sidebar-border);background:var(--surface-muted);flex:0 0 auto}
          .sfm-shared-quick-row{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:7px;align-items:center}
          .sfm-sidebar-collapse{width:44px;height:44px;min-width:44px;display:grid;place-items:center;border:1px solid var(--sidebar-border);border-radius:var(--radius-control);background:var(--surface-elevated);color:var(--sidebar-muted);box-shadow:var(--shadow-xs);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease)}
          .sfm-sidebar-collapse:hover{background:var(--sidebar-hover);color:var(--sidebar-foreground);border-color:var(--border-strong)}
          .sfm-sidebar-collapse:active{box-shadow:none}
          .sfm-sidebar-collapse:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
          .sfm-shared-primary-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding:12px 8px;scroll-padding-block:12px}
          .sfm-shared-nav{display:grid;gap:14px}
          .sfm-shared-group{display:grid;gap:5px}
          .sfm-shared-group+.sfm-shared-group{padding-top:12px;border-top:1px solid color-mix(in srgb,var(--sidebar-border) 78%,transparent)}
          .sfm-shared-group-label,.sfm-shared-group-toggle{margin:0;padding:0 8px;color:var(--sidebar-muted);font-size:var(--type-label-size);font-weight:var(--type-label-weight);line-height:var(--type-label-leading);letter-spacing:0;overflow-wrap:anywhere}
          .sfm-shared-group-label{display:flex;align-items:center;gap:7px}
          .sfm-shared-group-label::before,.sfm-shared-group-toggle::before{content:"";width:4px;height:4px;flex:0 0 4px;border-radius:var(--radius-pill);background:var(--primary)}
          .sfm-shared-group-toggle{width:100%;min-height:var(--control-h);display:flex;align-items:center;gap:7px;border:0;border-radius:var(--radius-control);background:transparent;text-align:start;font-family:var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
          .sfm-shared-group-toggle:hover,.sfm-shared-group-toggle.expanded{background:var(--sidebar-expanded);color:var(--sidebar-foreground)}
          .sfm-shared-group-toggle:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
          .sfm-shared-group-toggle span{min-width:0;flex:1}
          .sfm-shared-group-items,.sfm-shared-subitems{display:grid;gap:3px;margin:0;padding:0;list-style:none}
          .sfm-shared-item-wrap{min-width:0;list-style:none}
          .sfm-shared-item,.sfm-shared-subitem,.sfm-shared-support-item{position:relative;width:100%;min-width:0;min-height:var(--control-h);display:flex;align-items:center;gap:9px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--foreground-secondary);text-align:start;text-decoration:none;font:var(--type-navigation-weight) var(--type-navigation-size)/var(--type-navigation-leading) var(--font-ui);cursor:pointer;padding:7px 9px;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
          .sfm-shared-item:hover,.sfm-shared-subitem:hover,.sfm-shared-support-item:hover{background:var(--sidebar-hover);color:var(--sidebar-foreground);border-color:color-mix(in srgb,var(--sidebar-border) 72%,transparent);box-shadow:var(--shadow-xs)}
          .sfm-shared-item:hover .sfm-shared-icon,.sfm-shared-subitem:hover .sfm-shared-subitem-icon,.sfm-shared-support-item:hover .sfm-shared-support-icon{color:var(--sidebar-foreground)}
          .sfm-shared-item:active,.sfm-shared-subitem:active,.sfm-shared-support-item:active{transform:scale(.985);box-shadow:none}
          .sfm-shared-item:focus-visible,.sfm-shared-subitem:focus-visible,.sfm-shared-support-item:focus-visible,.sfm-shared-global-toggle:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
          .sfm-shared-item:disabled,.sfm-shared-subitem:disabled,.sfm-shared-support-item:disabled{opacity:.5;cursor:not-allowed}
          .sfm-shared-item.active,.sfm-shared-subitem.active,.sfm-shared-support-item.active{background:var(--sidebar-active);color:var(--sidebar-active-foreground);border-color:color-mix(in srgb,var(--primary) 22%,var(--sidebar-border));box-shadow:var(--shadow-xs);font-weight:var(--type-navigation-active-weight)}
          .sfm-shared-item.active::before,.sfm-shared-subitem.active::before,.sfm-shared-support-item.active::before{content:"";position:absolute;inset-inline-start:0;inset-block:7px;width:3px;border-radius:var(--radius-pill);background:var(--primary)}
          .sfm-shared-item-parent.expanded{background:var(--sidebar-expanded);color:var(--sidebar-foreground);border-color:transparent;box-shadow:none;font-weight:var(--type-navigation-weight)}
          .sfm-shared-item.danger:hover,.sfm-shared-item.danger:focus-visible{background:var(--danger-soft);color:var(--danger)}
          .sfm-shared-icon,.sfm-shared-subitem-icon,.sfm-shared-support-icon{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;color:var(--sidebar-muted);transition:color var(--duration-fast) var(--ease)}
          .sfm-shared-item.active .sfm-shared-icon,.sfm-shared-subitem.active .sfm-shared-subitem-icon,.sfm-shared-support-item.active .sfm-shared-support-icon{color:var(--primary)}
          .sfm-shared-label,.sfm-shared-subitem-label,.sfm-shared-support-label{min-width:0;flex:1;overflow-wrap:anywhere;hyphens:auto}
          .sfm-shared-badge{min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0 5px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--sidebar-border));border-radius:var(--radius-pill);background:var(--sidebar-active);color:var(--sidebar-active-foreground);font-family:var(--font-data);font-size:12px;font-weight:600;line-height:1;direction:ltr;unicode-bidi:isolate}
          .sfm-nested-chevron,.sfm-group-chevron,.sfm-shared-global-toggle .sfm-chevron{margin-inline-start:auto;flex:0 0 auto;color:var(--sidebar-muted);transition:transform var(--duration-fast) var(--ease)}
          .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,.sfm-shared-group-toggle[aria-expanded="false"] .sfm-group-chevron,.sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(90deg)}
          [dir="ltr"] .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,[dir="ltr"] .sfm-shared-group-toggle[aria-expanded="false"] .sfm-group-chevron,[dir="ltr"] .sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(-90deg)}
          .sfm-shared-disclosure{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var(--duration-fast) var(--ease),opacity var(--duration-fast) var(--ease)}
          .sfm-shared-disclosure>div{min-height:0;overflow:hidden}
          .sfm-shared-disclosure[data-expanded="false"]{grid-template-rows:0fr;opacity:0;pointer-events:none}
          .sfm-shared-subitems{margin:4px 0;padding-inline-start:18px;border-inline-start:1px solid var(--sidebar-border)}
          .sfm-shared-subitem{padding-block:6px;font-size:var(--type-navigation-size)}
          .sfm-shared-utilities{flex:0 0 auto;max-height:min(44dvh,370px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;display:grid;gap:8px;padding:9px 8px calc(10px + env(safe-area-inset-bottom));border-top:1px solid var(--sidebar-border);background:var(--surface-muted);scrollbar-width:thin}
          .sfm-shared-global-group,.sfm-shared-support{display:grid;gap:4px;padding:4px;border:1px solid color-mix(in srgb,var(--sidebar-border) 82%,transparent);border-radius:var(--radius-card);background:var(--sidebar-background);box-shadow:var(--shadow-xs)}
          .sfm-shared-global-toggle{width:100%;min-height:var(--control-h);display:flex;align-items:center;gap:8px;padding:5px 8px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--foreground-secondary);text-align:start;font:var(--type-label-weight) var(--type-label-size)/var(--type-label-leading) var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
          .sfm-shared-global-toggle:hover,.sfm-shared-global-toggle.expanded{background:var(--sidebar-expanded);color:var(--sidebar-foreground)}
          .sfm-shared-global-icon{width:20px;height:20px;display:grid;place-items:center;flex:0 0 20px;color:var(--sidebar-muted)}
          .sfm-shared-global-toggle>span:not(.sfm-shared-global-icon){min-width:0;flex:1}
          .sfm-shared-support-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}
          .sfm-shared-support-item{padding-block:6px;font-size:var(--type-navigation-size)}
          .sfm-shared-support-label{display:grid;gap:1px}
          .sfm-shared-support-label small{display:block;color:var(--sidebar-muted);font-size:var(--type-caption-size);font-weight:var(--type-caption-weight);line-height:var(--type-caption-leading);direction:ltr;unicode-bidi:isolate}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-sidebar-collapse{position:absolute;inset-block-start:20px;inset-inline-end:-14px;background:var(--sidebar-background);z-index:2}
          .sfm-shared-tools .sfm-command-trigger{box-shadow:var(--shadow-xs)}
          .sfm-shared-tools .sfm-command-trigger:hover{box-shadow:var(--shadow-sm)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-tools{padding:8px;background:var(--sidebar-background)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-quick-row{grid-template-columns:44px;justify-content:center}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-primary-scroll{padding-inline:8px;scrollbar-gutter:auto}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-nav{gap:8px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group{gap:3px;padding-block:6px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group+.sfm-shared-group{border-top:1px solid var(--sidebar-border)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle{height:1px;min-height:1px;margin:2px 6px;padding:0;background:var(--sidebar-border);overflow:hidden;color:transparent;pointer-events:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-label::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle>*{display:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-nested-chevron{display:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-item{width:44px;height:44px;min-height:44px;justify-content:center;margin-inline:auto;padding:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitems{padding:0;margin-block:2px;border-inline-start:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-badge{position:absolute;inset-block-start:-4px;inset-inline-end:-6px;min-width:18px;height:18px;padding-inline:4px;font-size:11px;box-shadow:var(--shadow-xs)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item.active::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem.active::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-item.active::before{inset-block:8px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-utilities{max-height:42dvh;padding-inline:8px;background:var(--surface-muted)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-group,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support{padding:3px;border-radius:var(--radius-control)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle{width:44px;height:44px;min-height:44px;justify-content:center;margin-inline:auto;padding:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle>span:not(.sfm-shared-global-icon),.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle .sfm-chevron{display:none}
          @media(max-width:767px){.sfm-shared-sidebar{display:none}}
          @media(prefers-reduced-motion:reduce){.sfm-shared-sidebar,.sfm-sidebar-collapse,.sfm-shared-group-toggle,.sfm-shared-global-toggle,.sfm-shared-item,.sfm-shared-subitem,.sfm-shared-support-item,.sfm-shared-icon,.sfm-shared-subitem-icon,.sfm-shared-support-icon,.sfm-shared-disclosure,.sfm-nested-chevron,.sfm-group-chevron,.sfm-chevron{transition:none!important}}
        `}</style>

        <div className="sfm-shared-tools">
          <div className="sfm-shared-quick-row">
            {withCollapsedTooltip(t('command_open'), <CommandMenuButton compact={collapsed} />)}
            {withCollapsedTooltip(collapseLabel, (
              <button
                type="button"
                className="sfm-sidebar-collapse"
                aria-label={collapseLabel}
                aria-pressed={collapsed}
                onClick={() => setCollapsed(current => !current)}
              >
                <CollapseIcon size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div ref={navigationScrollRef} className="sfm-shared-primary-scroll">
          <nav className="sfm-shared-nav" aria-label={t('nav_mobile_menu')}>
            {primaryGroups.map(group => {
              const groupState = getNavigationGroupDisclosureState(
                group,
                selectedItemId,
                openGroupIds.includes(group.id),
              );
              const expanded = collapsed || groupState.expanded;
              const groupId = `sfm-sidebar-group-${group.id}`;
              const headingId = `sfm-sidebar-heading-${group.id}`;
              return (
                <section
                  className="sfm-shared-group"
                  data-active-group={groupState.active ? 'true' : 'false'}
                  key={group.id}
                  aria-labelledby={group.id === 'main' ? undefined : headingId}
                >
                  {group.id === 'main' ? null : group.collapsible ? (
                    <button
                      type="button"
                    className={`sfm-shared-group-toggle${expanded ? ' expanded' : ''}`}
                    id={headingId}
                    tabIndex={collapsed ? -1 : undefined}
                    aria-hidden={collapsed || undefined}
                    aria-expanded={expanded}
                      aria-controls={groupId}
                      onClick={() => setOpenGroupIds(current => current.includes(group.id)
                        ? current.filter(id => id !== group.id)
                        : [...current, group.id])}
                    >
                      <span>{t(group.labelKey)}</span>
                      <ChevronDown className="sfm-group-chevron" size={15} aria-hidden="true" />
                    </button>
                  ) : (
                    <h2 className="sfm-shared-group-label" id={headingId}>{t(group.labelKey)}</h2>
                  )}
                  <div
                    className="sfm-shared-disclosure"
                    data-expanded={expanded ? 'true' : 'false'}
                    aria-hidden={!expanded}
                    inert={!expanded}
                  >
                    <div>
                      <ul className="sfm-shared-group-items" id={groupId}>
                        {group.items.map(item => renderNavigationItem(item, group.id))}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })}
          </nav>
        </div>

        <nav
          className="sfm-shared-utilities"
          aria-label={`${t('nav_group_account')} / ${t('nav_group_support')}`}
        >
          {globalGroups.map(group => {
            const expanded = collapsed || openGlobalGroupIds.includes(group.id);
            const groupId = `sfm-sidebar-global-${group.id}`;
            return (
              <section className="sfm-shared-global-group" key={group.id} aria-label={t(group.labelKey)}>
                {withCollapsedTooltip(t(group.labelKey), (
                  <button
                    type="button"
                    className={`sfm-shared-global-toggle${expanded ? ' expanded' : ''}`}
                    aria-expanded={expanded}
                    aria-controls={groupId}
                    onClick={() => collapsed
                      ? setCollapsed(false)
                      : setOpenGlobalGroupIds(current => current.includes(group.id)
                        ? current.filter(id => id !== group.id)
                        : [...current, group.id])}
                  >
                    <span className="sfm-shared-global-icon" aria-hidden="true"><UserRound size={18} /></span>
                    <span>{t(group.labelKey)}</span>
                    <ChevronDown className="sfm-chevron" size={15} aria-hidden="true" />
                  </button>
                ))}
                <div className="sfm-shared-disclosure" data-expanded={expanded ? 'true' : 'false'} aria-hidden={!expanded} inert={!expanded}>
                  <div>
                    <ul className="sfm-shared-group-items" id={groupId}>
                      {group.items.map(item => renderNavigationItem(item, group.id))}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}

          <section className="sfm-shared-support" aria-label={t('nav_group_support')}>
            {withCollapsedTooltip(t('nav_group_support'), (
              <button
                type="button"
                className={`sfm-shared-global-toggle${supportOpen || collapsed ? ' expanded' : ''}`}
                aria-expanded={supportOpen || collapsed}
                aria-controls="sfm-sidebar-group-support"
                onClick={() => collapsed ? setCollapsed(false) : setSupportOpen(current => !current)}
              >
                <span className="sfm-shared-global-icon" aria-hidden="true"><CircleHelp size={18} /></span>
                <span>{t('nav_group_support')}</span>
                <ChevronDown className="sfm-chevron" size={15} aria-hidden="true" />
              </button>
            ))}
            <div className="sfm-shared-disclosure" data-expanded={supportOpen || collapsed ? 'true' : 'false'} aria-hidden={!(supportOpen || collapsed)} inert={!(supportOpen || collapsed)}>
              <div>
                <ul className="sfm-shared-support-list" id="sfm-sidebar-group-support">
                  {SUPPORT_LINKS.map(item => {
                    const active = item.id === selectedItemId;
                    const SupportIcon = item.icon;
                    const content = (
                      <>
                        <span className="sfm-shared-support-icon" aria-hidden="true"><SupportIcon size={18} /></span>
                        <span className="sfm-shared-support-label">
                          <span>{t(item.labelKey)}</span>
                          {item.caption ? <small>{item.caption}</small> : null}
                        </span>
                      </>
                    );
                    const supportElement = item.external && item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sfm-shared-support-item"
                        aria-label={`${t(item.labelKey)} ${item.caption ?? ''}`.trim()}
                      >
                        {content}
                      </a>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className={`sfm-shared-support-item${active ? ' active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        aria-label={t(item.labelKey)}
                      >
                        {content}
                      </Link>
                    ) : null;
                    return supportElement ? (
                      <li key={item.id}>{withCollapsedTooltip(t(item.labelKey), supportElement)}</li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
          </section>
        </nav>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
