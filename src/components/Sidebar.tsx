'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

function CollapsedSidebarTooltip({
  collapsed,
  label,
  side,
  children,
}: {
  collapsed: boolean;
  label: string;
  side: 'left' | 'right';
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!collapsed) setOpen(false);
  }, [collapsed]);

  return (
    <Tooltip open={collapsed && open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {collapsed ? (
        <TooltipContent
          portalled
          className="sfm-sidebar-tooltip"
          side={side}
          sideOffset={10}
        >
          {label}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

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
      <CollapsedSidebarTooltip
        collapsed={collapsed}
        label={label}
        side={dir === 'rtl' ? 'left' : 'right'}
      >
        {element}
      </CollapsedSidebarTooltip>
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
        <Link href="/dashboard" className="sfm-sidebar-brand" aria-label="THE SFM">
          <span className="sfm-sidebar-brand-mark" aria-hidden="true">
            <Image src="/sfm-logo.png" alt="" width={39} height={39} priority />
          </span>
          <span className="sfm-sidebar-brand-copy">
            <strong>THE SFM</strong>
            <small>{lang === 'ar' ? 'إدارة مالية متكاملة' : lang === 'fr' ? 'Gestion financière intégrée' : 'Integrated financial management'}</small>
          </span>
        </Link>
        <style>{`
          .sfm-shared-sidebar{
            width:var(--sidebar-w);height:calc(100dvh - var(--global-header-height) - var(--space-4));max-height:calc(100dvh - var(--global-header-height) - var(--space-4));min-height:0;
            position:sticky;inset-block-start:calc(var(--global-header-height) + var(--space-2));inset-inline-start:0;align-self:start;z-index:50;display:flex;flex-direction:column;
            margin-block:var(--space-2);overflow:visible;isolation:isolate;
            background-color:var(--sidebar-glass-bg-fallback);background-image:var(--sidebar-glass-bg);color:var(--sidebar-item-text);
            border:1px solid var(--sidebar-glass-border);border-radius:var(--radius-panel);box-shadow:var(--sidebar-glass-shadow),var(--sidebar-glass-inner-shadow);
            -webkit-backdrop-filter:var(--sidebar-glass-filter);backdrop-filter:var(--sidebar-glass-filter);
            font-family:var(--font-ui);transition:width var(--duration-fast) var(--ease)
          }
          .sfm-shared-sidebar::before{content:"";position:absolute;z-index:-1;inset-block-start:1px;inset-inline:1px;height:42%;border-radius:calc(var(--radius-panel) - 1px) calc(var(--radius-panel) - 1px) 45% 45%;background:var(--sidebar-glass-reflection);opacity:.82;pointer-events:none}
          .sfm-shared-sidebar::after{content:"";position:absolute;z-index:4;inset:1px;border:1px solid var(--sidebar-glass-border-highlight);border-block-end-color:transparent;border-radius:calc(var(--radius-panel) - 1px);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--sidebar-glass-border-highlight) 55%,transparent);opacity:.58;pointer-events:none}
          .sfm-shared-sidebar[data-collapsed="true"]{width:var(--sidebar-w-collapsed)}
          .sfm-sidebar-brand{position:relative;z-index:1;min-height:62px;display:flex;align-items:center;gap:9px;margin:7px 7px 0;padding:7px 8px;border:1px solid color-mix(in srgb,var(--sidebar-glass-border) 72%,transparent);border-radius:var(--radius-card);background:var(--sidebar-glass-bg-elevated);box-shadow:var(--sidebar-glass-inner-shadow),0 8px 20px color-mix(in srgb,var(--sidebar-active) 7%,transparent);color:var(--sidebar-item-text);text-decoration:none;flex:0 0 auto}
          .sfm-sidebar-brand-mark{width:42px;height:42px;display:grid;place-items:center;flex:0 0 42px;border:1px solid color-mix(in srgb,var(--sidebar-search-border) 74%,transparent);border-radius:var(--radius-control);background:var(--sidebar-search-bg);box-shadow:var(--sidebar-item-shadow)}
          .sfm-sidebar-brand img{width:34px;height:34px}
          .sfm-sidebar-brand-copy{min-width:0;display:grid;gap:2px}
          .sfm-sidebar-brand-copy strong{font-size:15px;font-weight:700;letter-spacing:.035em;direction:ltr;unicode-bidi:isolate}
          .sfm-sidebar-brand-copy small{color:var(--sidebar-item-text-muted);font-size:10px;font-weight:500;line-height:1.4}
          .sfm-shared-tools{position:relative;z-index:3;display:grid;gap:6px;padding:7px 7px 6px;border-bottom:1px solid var(--sidebar-divider);background:transparent;flex:0 0 auto}
          .sfm-shared-quick-row{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px;align-items:center}
          .sfm-sidebar-collapse{width:40px;height:40px;min-width:40px;display:grid;place-items:center;border:1px solid var(--sidebar-search-border);border-radius:var(--radius-control);background:var(--sidebar-search-bg);color:var(--sidebar-icon);box-shadow:var(--sidebar-search-shadow);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
          .sfm-sidebar-collapse:hover{background:var(--sidebar-item-bg-hover);color:var(--sidebar-icon-hover);border-color:var(--sidebar-item-border-hover);transform:translateY(var(--sidebar-item-hover-lift))}
          .sfm-sidebar-collapse:active{box-shadow:none}
          .sfm-sidebar-collapse:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
          .sfm-shared-primary-scroll{position:relative;z-index:1;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding:8px 7px;scroll-padding-block:8px}
          .sfm-shared-nav{display:grid;gap:9px}
          .sfm-shared-group{display:grid;gap:4px}
          .sfm-shared-group+.sfm-shared-group{padding-top:8px;border-top:1px solid var(--sidebar-divider)}
          .sfm-shared-group-label,.sfm-shared-group-toggle{margin:0;padding:0 8px;color:var(--sidebar-section-label);font-size:var(--type-label-size);font-weight:var(--type-label-weight);line-height:var(--type-label-leading);letter-spacing:0;overflow-wrap:anywhere}
          .sfm-shared-group-label{display:flex;align-items:center;gap:7px}
          .sfm-shared-group-label::before,.sfm-shared-group-toggle::before{content:"";width:4px;height:4px;flex:0 0 4px;border-radius:var(--radius-pill);background:var(--primary)}
          .sfm-shared-group-toggle{width:100%;min-height:var(--control-h);display:flex;align-items:center;gap:7px;border:0;border-radius:var(--radius-control);background:transparent;text-align:start;font-family:var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
          .sfm-shared-group-toggle:hover,.sfm-shared-group-toggle.expanded{background:var(--sidebar-item-bg);color:var(--sidebar-item-text)}
          .sfm-shared-group-toggle:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
          .sfm-shared-group-toggle span{min-width:0;flex:1}
          .sfm-shared-group-items,.sfm-shared-subitems{display:grid;gap:2px;margin:0;padding:0;list-style:none}
          .sfm-shared-item-wrap{min-width:0;list-style:none}
          .sfm-shared-item,.sfm-shared-subitem,.sfm-shared-support-item{position:relative;width:100%;min-width:0;min-height:var(--control-h);display:flex;align-items:center;gap:8px;border:1px solid var(--sidebar-item-border);border-radius:var(--radius-control);background:var(--sidebar-item-bg);color:var(--sidebar-item-text);box-shadow:var(--sidebar-item-shadow);text-align:start;text-decoration:none;font:var(--type-navigation-weight) var(--type-navigation-size)/var(--type-navigation-leading) var(--font-ui);cursor:pointer;padding:6px 8px;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease),border-color var(--duration-fast) var(--ease),box-shadow var(--duration-fast) var(--ease),transform var(--duration-fast) var(--ease)}
          .sfm-shared-item:hover,.sfm-shared-subitem:hover,.sfm-shared-support-item:hover{background:var(--sidebar-item-bg-hover);color:var(--sidebar-item-text);border-color:var(--sidebar-item-border-hover);box-shadow:var(--sidebar-item-shadow-hover);transform:translateY(var(--sidebar-item-hover-lift))}
          .sfm-shared-item:hover .sfm-shared-icon,.sfm-shared-subitem:hover .sfm-shared-subitem-icon,.sfm-shared-support-item:hover .sfm-shared-support-icon{color:var(--sidebar-icon-hover)}
          .sfm-shared-item:active,.sfm-shared-subitem:active,.sfm-shared-support-item:active{transform:translateY(0);box-shadow:var(--sidebar-glass-inner-shadow)}
          .sfm-shared-item:focus-visible,.sfm-shared-subitem:focus-visible,.sfm-shared-support-item:focus-visible,.sfm-shared-global-toggle:focus-visible{outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
          .sfm-shared-item:disabled,.sfm-shared-subitem:disabled,.sfm-shared-support-item:disabled{opacity:.5;cursor:not-allowed}
          .sfm-shared-item.active,.sfm-shared-subitem.active,.sfm-shared-support-item.active{background-color:var(--sidebar-active);background-image:var(--sidebar-item-bg-active);color:var(--sidebar-item-text-active);border-color:var(--sidebar-item-border-active);box-shadow:var(--sidebar-item-shadow-active);font-weight:var(--type-navigation-active-weight)}
          .sfm-shared-item.active::before,.sfm-shared-subitem.active::before,.sfm-shared-support-item.active::before{content:"";position:absolute;inset-inline-start:0;inset-block:5px;width:3px;border-radius:var(--radius-pill);background:var(--sidebar-active-indicator);box-shadow:var(--sidebar-glass-glow)}
          .sfm-shared-item-parent.expanded{background:var(--sidebar-item-bg);color:var(--sidebar-item-text);border-color:var(--sidebar-item-border);box-shadow:var(--sidebar-item-shadow);font-weight:var(--type-navigation-weight)}
          .sfm-shared-item.danger:hover,.sfm-shared-item.danger:focus-visible{background:var(--danger-soft);color:var(--danger)}
          .sfm-shared-icon,.sfm-shared-subitem-icon,.sfm-shared-support-icon{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;color:var(--sidebar-icon);transition:color var(--duration-fast) var(--ease)}
          .sfm-shared-item.active .sfm-shared-icon,.sfm-shared-subitem.active .sfm-shared-subitem-icon,.sfm-shared-support-item.active .sfm-shared-support-icon{color:var(--sidebar-icon-active)}
          .sfm-shared-label,.sfm-shared-subitem-label,.sfm-shared-support-label{min-width:0;flex:1;overflow-wrap:anywhere;hyphens:auto}
          .sfm-shared-badge{min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0 5px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--sidebar-border));border-radius:var(--radius-pill);background:var(--sidebar-active);color:var(--sidebar-active-foreground);font-family:var(--font-data);font-size:12px;font-weight:600;line-height:1;direction:ltr;unicode-bidi:isolate}
          .sfm-nested-chevron,.sfm-group-chevron,.sfm-shared-global-toggle .sfm-chevron{margin-inline-start:auto;flex:0 0 auto;color:var(--sidebar-icon);transition:transform var(--duration-fast) var(--ease)}
          .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,.sfm-shared-group-toggle[aria-expanded="false"] .sfm-group-chevron,.sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(90deg)}
          [dir="ltr"] .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,[dir="ltr"] .sfm-shared-group-toggle[aria-expanded="false"] .sfm-group-chevron,[dir="ltr"] .sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(-90deg)}
          .sfm-shared-disclosure{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var(--duration-fast) var(--ease),opacity var(--duration-fast) var(--ease)}
          .sfm-shared-disclosure>div{min-height:0;overflow:hidden}
          .sfm-shared-disclosure[data-expanded="false"]{grid-template-rows:0fr;opacity:0;pointer-events:none}
          .sfm-shared-subitems{margin:3px 0;padding-inline-start:16px;border-inline-start:1px solid color-mix(in srgb,var(--sidebar-divider) 70%,transparent)}
          .sfm-shared-subitem{padding-block:5px;border-color:color-mix(in srgb,var(--sidebar-item-border) 62%,transparent);background:color-mix(in srgb,var(--sidebar-item-bg) 68%,transparent);box-shadow:none;font-size:var(--type-navigation-size)}
          .sfm-shared-utilities{position:relative;z-index:1;flex:0 0 auto;max-height:min(40dvh,340px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;display:grid;gap:5px;margin:0 5px 5px;padding:6px 6px calc(7px + env(safe-area-inset-bottom));border:1px solid color-mix(in srgb,var(--sidebar-glass-border) 70%,transparent);border-radius:var(--radius-card);background:var(--sidebar-footer-bg);box-shadow:var(--sidebar-glass-inner-shadow);scrollbar-width:thin}
          .sfm-shared-global-group,.sfm-shared-support{display:grid;gap:3px;padding:3px;border:1px solid color-mix(in srgb,var(--sidebar-item-border) 62%,transparent);border-radius:var(--radius-card);background:color-mix(in srgb,var(--sidebar-item-bg) 72%,transparent);box-shadow:none}
          .sfm-shared-global-toggle{width:100%;min-height:var(--control-h);display:flex;align-items:center;gap:8px;padding:5px 8px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--sidebar-item-text);text-align:start;font:var(--type-label-weight) var(--type-label-size)/var(--type-label-leading) var(--font-ui);cursor:pointer;transition:background-color var(--duration-fast) var(--ease),color var(--duration-fast) var(--ease)}
          .sfm-shared-global-toggle:hover,.sfm-shared-global-toggle.expanded{background:var(--sidebar-item-bg-hover);color:var(--sidebar-item-text)}
          .sfm-shared-global-icon{width:20px;height:20px;display:grid;place-items:center;flex:0 0 20px;color:var(--sidebar-icon)}
          .sfm-shared-global-toggle>span:not(.sfm-shared-global-icon){min-width:0;flex:1}
          .sfm-shared-support-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}
          .sfm-shared-support-item{padding-block:6px;font-size:var(--type-navigation-size)}
          .sfm-shared-support-label{display:grid;gap:1px}
          .sfm-shared-support-label small{display:block;color:var(--sidebar-item-text-muted);font-size:var(--type-caption-size);font-weight:var(--type-caption-weight);line-height:var(--type-caption-leading);direction:ltr;unicode-bidi:isolate}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-sidebar-brand{justify-content:center;margin-inline:var(--space-1);padding-inline:4px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-sidebar-brand-copy{display:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-sidebar-collapse{position:absolute;inset-block-start:88px;inset-inline-end:-14px;background:var(--sidebar-glass-bg-elevated);z-index:2}
          .sfm-shared-tools .sfm-command-trigger{border-color:var(--sidebar-search-border);background:var(--sidebar-search-bg);color:var(--sidebar-item-text);box-shadow:var(--sidebar-search-shadow)}
          .sfm-shared-tools .sfm-command-trigger:hover{border-color:var(--sidebar-item-border-hover);background:var(--sidebar-item-bg-hover);box-shadow:var(--sidebar-item-shadow-hover)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-tools{padding:8px;background:transparent}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-quick-row{grid-template-columns:44px;justify-content:center}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-primary-scroll{padding-inline:8px;scrollbar-gutter:auto}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-nav{gap:8px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group{gap:3px;padding-block:6px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group+.sfm-shared-group{border-top:1px solid var(--sidebar-divider)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle{height:1px;min-height:1px;margin:2px 6px;padding:0;background:var(--sidebar-divider);overflow:hidden;color:transparent;pointer-events:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-label::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-toggle>*{display:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-nested-chevron{display:none}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-item{width:44px;height:44px;min-height:44px;justify-content:center;margin-inline:auto;padding:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitems{padding:0;margin-block:2px;border-inline-start:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-badge{position:absolute;inset-block-start:-4px;inset-inline-end:-6px;min-width:18px;height:18px;padding-inline:4px;font-size:11px;box-shadow:var(--shadow-xs)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item.active::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem.active::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-item.active::before{inset-block:8px}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-utilities{max-height:42dvh;padding-inline:4px;background:var(--sidebar-footer-bg)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-group,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support{padding:3px;border-radius:var(--radius-control)}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle{width:44px;height:44px;min-height:44px;justify-content:center;margin-inline:auto;padding:0}
          .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle>span:not(.sfm-shared-global-icon),.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle .sfm-chevron{display:none}
          @media(max-width:767px){.sfm-shared-sidebar{display:none}}
          @supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){.sfm-shared-sidebar{background:var(--sidebar-glass-bg-fallback)}}
          @media(prefers-reduced-transparency:reduce){.sfm-shared-sidebar{background:var(--sidebar-glass-bg-fallback);-webkit-backdrop-filter:none;backdrop-filter:none}}
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
