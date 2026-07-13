'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { CommandMenuButton } from '@/components/CommandMenuButton';
import { supabase } from '@/integrations/supabase/client';
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [hash, setHash] = useState('');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);
  const [openGlobalGroupIds, setOpenGlobalGroupIds] = useState<string[]>(['account']);
  const [supportOpen, setSupportOpen] = useState(false);
  const previousSidebarWidth = useRef<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      if (document.visibilityState === 'hidden') return;
      if (!user) {
        setUnreadNotifications(0);
        return;
      }
      const db = supabase as any;
      let result = await db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'unread');
      if (result.error) {
        result = await db
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
      }
      if (cancelled) return;
      if (result.error) {
        setUnreadNotifications(0);
        return;
      }
      setUnreadNotifications(result.count ?? 0);
    }
    loadUnread();
    const id = window.setInterval(loadUnread, 60000);
    document.addEventListener('visibilitychange', loadUnread);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', loadUnread);
    };
  }, [user]);

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

  const renderNavigationItem = (item: NavigationItem, groupId: string) => {
    const NavIcon = item.icon;
    const selected = item.id === selectedItemId;
    const hasChildren = Boolean(item.children?.length);

    if (hasChildren) {
      const state = getExpandableNavigationItemState(item, selectedItemId, openItemIds.includes(item.id));
      const nestedId = `sfm-sidebar-${groupId}-${item.id}`;
      return (
        <li key={item.id} className="sfm-shared-item-wrap">
          <button
            type="button"
            onClick={() => toggleNestedItem(item.id)}
            className={`sfm-shared-item sfm-shared-item-parent${state.expanded ? ' expanded' : ''}`}
            aria-expanded={state.expanded}
            aria-controls={nestedId}
            aria-label={t(item.labelKey)}
            title={t(item.labelKey)}
          >
            <span className="sfm-shared-icon" aria-hidden="true"><NavIcon size={18} /></span>
            <span className="sfm-shared-label">{t(item.labelKey)}</span>
            <ChevronDown className="sfm-nested-chevron" size={15} aria-hidden="true" />
          </button>
          {state.expanded ? (
            <ul className="sfm-shared-subitems" id={nestedId}>
              {item.children?.map(child => {
                const ChildIcon = child.icon;
                const childSelected = child.id === selectedItemId;
                const content = (
                  <>
                    <span className="sfm-shared-subitem-icon" aria-hidden="true"><ChildIcon size={16} /></span>
                    <span className="sfm-shared-subitem-label">{t(child.labelKey)}</span>
                  </>
                );
                return (
                  <li key={child.id}>
                    {child.href ? (
                      <Link
                        href={child.href}
                        className={`sfm-shared-subitem${childSelected ? ' active' : ''}`}
                        aria-current={childSelected ? 'page' : undefined}
                        aria-label={t(child.labelKey)}
                        title={t(child.labelKey)}
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
                        title={t(child.labelKey)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </li>
      );
    }

    const content = (
      <>
        <span className="sfm-shared-icon" aria-hidden="true"><NavIcon size={18} /></span>
        <span className="sfm-shared-label">{t(item.labelKey)}</span>
        {item.id === 'notif' && unreadNotifications > 0 ? (
          <span className="sfm-shared-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
        ) : null}
      </>
    );
    const className = `sfm-shared-item${selected ? ' active' : ''}`;

    return (
      <li key={item.id} className="sfm-shared-item-wrap">
        {item.href ? (
          <Link
            href={item.href}
            className={className}
            aria-current={selected ? 'page' : undefined}
            aria-label={t(item.labelKey)}
            title={t(item.labelKey)}
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            className={className}
            aria-current={selected ? 'page' : undefined}
            aria-label={t(item.labelKey)}
            onClick={() => handleAction(item)}
            title={t(item.labelKey)}
          >
            {content}
          </button>
        )}
      </li>
    );
  };

  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const collapseLabel = collapsed ? SIDEBAR_COPY[locale].expand : SIDEBAR_COPY[locale].collapse;
  const CollapseIcon = collapsed
    ? (dir === 'rtl' ? ChevronLeft : ChevronRight)
    : (dir === 'rtl' ? ChevronRight : ChevronLeft);

  return (
    <aside className="sfm-shared-sidebar" data-collapsed={collapsed ? 'true' : 'false'} dir={dir} aria-label={t('nav_mobile_menu')}>
      <Suspense fallback={null}>
        <NavigationQueryObserver onQueryChange={setSearch} />
      </Suspense>
      <style>{`
        .sfm-shared-sidebar{
          --_sidebar-bg:var(--sidebar-background,var(--sidebar,var(--surface,#fff)));
          --_sidebar-text:var(--sidebar-foreground,var(--foreground,#0f2742));
          --_sidebar-secondary:var(--foreground-secondary,var(--_sidebar-text));
          --_sidebar-muted:var(--foreground-muted,var(--muted-foreground,#64748b));
          --_sidebar-border:var(--sidebar-border,var(--border,#e2e8f0));
          --_sidebar-hover:var(--sidebar-hover,var(--surface-muted,var(--muted,#f8fafc)));
          --_sidebar-expanded:var(--sidebar-expanded,var(--_sidebar-hover));
          --_sidebar-active:var(--sidebar-active,var(--primary-soft,#eaf3ff));
          --_sidebar-active-text:var(--sidebar-active-foreground,var(--_sidebar-text));
          --_sidebar-primary:var(--primary,#1769d2);
          --_sidebar-focus:var(--focus-ring,var(--ring,#2563eb));
          width:var(--sidebar-w,230px);height:calc(100dvh - var(--sfm-global-header-height,64px));max-height:calc(100dvh - var(--sfm-global-header-height,64px));min-height:0;
          position:sticky;inset-block-start:var(--sfm-global-header-height,64px);inset-inline-start:0;align-self:start;z-index:50;display:flex;flex-direction:column;
          overflow:visible;background:var(--_sidebar-bg);color:var(--_sidebar-text);
          border-inline-end:1px solid var(--_sidebar-border);box-shadow:var(--shadow-sm,0 0 24px rgba(15,39,66,.08));
          font-family:var(--font-sans,var(--font-ibm-plex-sans-arabic),'IBM Plex Sans Arabic',sans-serif);
          transition:width .18s ease
        }
        .sfm-shared-sidebar[data-collapsed="true"]{width:72px}
        .sfm-sidebar-collapse{width:34px;height:34px;min-width:34px;display:grid;place-items:center;border:1px solid var(--_sidebar-border);border-radius:var(--radius-control,var(--r-sm,9px));background:transparent;color:var(--_sidebar-muted);cursor:pointer}
        .sfm-sidebar-collapse:hover{background:var(--_sidebar-hover);color:var(--_sidebar-text)}
        .sfm-sidebar-collapse:focus-visible{outline:2px solid var(--_sidebar-focus);outline-offset:2px}
        .sfm-shared-tools{display:grid;gap:8px;padding:10px;border-bottom:1px solid var(--_sidebar-border);flex:0 0 auto}
        .sfm-shared-quick-row{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:7px;align-items:center}
        .sfm-shared-scroll{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding:10px 8px 12px}
        .sfm-shared-nav{display:grid;gap:12px}
        .sfm-shared-group{display:grid;gap:5px;padding-bottom:11px;border-bottom:1px solid var(--_sidebar-border)}
        .sfm-shared-group:last-child{border-bottom:0}
        .sfm-shared-group-label{margin:0;padding:0 8px;color:var(--_sidebar-muted);font-size:11px;font-weight:500;line-height:1.5;letter-spacing:.01em;overflow-wrap:anywhere}
        .sfm-shared-group-items,.sfm-shared-subitems{display:grid;gap:2px;margin:0;padding:0;list-style:none}
        .sfm-shared-item-wrap{min-width:0;list-style:none}
        .sfm-shared-item,.sfm-shared-subitem,.sfm-shared-support-item{position:relative;width:100%;min-width:0;min-height:40px;display:flex;align-items:center;gap:9px;border:1px solid transparent;border-radius:var(--radius-control,var(--r-md,10px));background:transparent;color:var(--_sidebar-secondary);text-align:start;text-decoration:none;font:500 13px/1.45 var(--font-sans,var(--font-ibm-plex-sans-arabic),'IBM Plex Sans Arabic',sans-serif);cursor:pointer;padding:7px 9px;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
        .sfm-shared-item:hover,.sfm-shared-subitem:hover,.sfm-shared-support-item:hover{background:var(--_sidebar-hover);color:var(--_sidebar-text)}
        .sfm-shared-item:focus-visible,.sfm-shared-subitem:focus-visible,.sfm-shared-support-item:focus-visible,.sfm-shared-global-toggle:focus-visible{outline:2px solid var(--_sidebar-focus);outline-offset:1px}
        .sfm-shared-item:disabled,.sfm-shared-subitem:disabled,.sfm-shared-support-item:disabled{opacity:.5;cursor:not-allowed}
        .sfm-shared-item.active,.sfm-shared-subitem.active,.sfm-shared-support-item.active{background:var(--_sidebar-active);color:var(--_sidebar-active-text);font-weight:600}
        .sfm-shared-item.active::before,.sfm-shared-subitem.active::before,.sfm-shared-support-item.active::before{content:"";position:absolute;inset-inline-start:0;inset-block:7px;width:3px;border-radius:999px;background:var(--_sidebar-primary)}
        .sfm-shared-item-parent.expanded{background:var(--_sidebar-expanded);color:var(--_sidebar-text)}
        .sfm-shared-icon,.sfm-shared-subitem-icon,.sfm-shared-support-icon{width:20px;height:20px;display:grid;place-items:center;flex:0 0 20px;color:var(--_sidebar-muted)}
        .sfm-shared-item.active .sfm-shared-icon,.sfm-shared-subitem.active .sfm-shared-subitem-icon,.sfm-shared-support-item.active .sfm-shared-support-icon{color:var(--_sidebar-primary)}
        .sfm-shared-label,.sfm-shared-subitem-label,.sfm-shared-support-label{min-width:0;flex:1;overflow-wrap:anywhere;hyphens:auto}
        .sfm-shared-badge{min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0 5px;border-radius:999px;background:var(--_sidebar-primary);color:var(--primary-foreground,#fff);font-size:10px;font-weight:600;line-height:1;direction:ltr;unicode-bidi:isolate}
        .sfm-nested-chevron,.sfm-shared-global-toggle .sfm-chevron{margin-inline-start:auto;flex:0 0 auto;color:var(--_sidebar-muted);transition:transform .15s ease}
        .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,.sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(90deg)}
        [dir="ltr"] .sfm-shared-item-parent[aria-expanded="false"] .sfm-nested-chevron,[dir="ltr"] .sfm-shared-global-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(-90deg)}
        .sfm-shared-subitems{margin:3px 0 4px;padding-inline-start:17px}
        .sfm-shared-subitem{min-height:38px;padding-block:6px;font-size:12.5px}
        .sfm-shared-utilities{display:grid;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid var(--_sidebar-border)}
        .sfm-shared-global-group,.sfm-shared-support{display:grid;gap:4px}
        .sfm-shared-global-toggle{width:100%;min-height:34px;display:flex;align-items:center;gap:8px;padding:5px 8px;border:0;border-radius:var(--radius-control,var(--r-sm,9px));background:transparent;color:var(--_sidebar-muted);text-align:start;font:500 11px/1.5 var(--font-sans,var(--font-ibm-plex-sans-arabic),'IBM Plex Sans Arabic',sans-serif);cursor:pointer}
        .sfm-shared-global-toggle:hover,.sfm-shared-global-toggle.expanded{background:var(--_sidebar-hover);color:var(--_sidebar-text)}
        .sfm-shared-support-list{display:grid;gap:2px;margin:0;padding:0;list-style:none}
        .sfm-shared-support-item{min-height:38px;padding-block:6px;font-size:12.5px}
        .sfm-shared-support-label{display:grid;gap:1px}
        .sfm-shared-support-label small{display:block;color:var(--_sidebar-muted);font-size:10.5px;font-weight:400;direction:ltr;unicode-bidi:isolate}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-sidebar-collapse{position:absolute;inset-block-start:20px;inset-inline-end:-14px;background:var(--_sidebar-bg);z-index:2}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-tools{padding:8px}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-quick-row{grid-template-columns:40px;justify-content:center}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-scroll{padding-inline:8px;scrollbar-gutter:auto}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-nav{gap:7px}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group{gap:2px;padding-bottom:7px}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-group-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem-label,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-badge,.sfm-shared-sidebar[data-collapsed="true"] .sfm-nested-chevron,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-global-toggle,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support{display:none}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem{width:40px;height:40px;min-height:40px;justify-content:center;margin-inline:auto;padding:0}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitems{padding:0;margin-block:2px}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-item.active::before,.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-subitem.active::before{inset-block:8px}
        @media(max-width:767px){.sfm-shared-sidebar{display:none}}
        @media(prefers-reduced-motion:reduce){.sfm-shared-sidebar,.sfm-shared-item,.sfm-shared-subitem,.sfm-shared-support-item,.sfm-nested-chevron,.sfm-chevron{transition:none}}
      `}</style>

      <div className="sfm-shared-tools">
        <div className="sfm-shared-quick-row">
          <CommandMenuButton />
          <button
            type="button"
            className="sfm-sidebar-collapse"
            aria-label={collapseLabel}
            title={collapseLabel}
            aria-pressed={collapsed}
            onClick={() => setCollapsed(current => !current)}
          >
            <CollapseIcon size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="sfm-shared-scroll">
        <nav className="sfm-shared-nav" aria-label={t('nav_mobile_menu')}>
          {primaryGroups.map(group => {
            const headingId = `sfm-sidebar-heading-${group.id}`;
            return (
              <section
                className="sfm-shared-group"
                key={group.id}
                aria-labelledby={group.id === 'main' ? undefined : headingId}
              >
                {group.id === 'main' ? null : (
                  <h2 className="sfm-shared-group-label" id={headingId}>{t(group.labelKey)}</h2>
                )}
                <ul className="sfm-shared-group-items">
                  {group.items.map(item => renderNavigationItem(item, group.id))}
                </ul>
              </section>
            );
          })}
        </nav>

        <div className="sfm-shared-utilities">
          {globalGroups.map(group => {
            const expanded = collapsed || openGlobalGroupIds.includes(group.id);
            const groupId = `sfm-sidebar-global-${group.id}`;
            return (
              <section className="sfm-shared-global-group" key={group.id} aria-label={t(group.labelKey)}>
                <button
                  type="button"
                  className={`sfm-shared-global-toggle${expanded ? ' expanded' : ''}`}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => setOpenGlobalGroupIds(current => current.includes(group.id)
                    ? current.filter(id => id !== group.id)
                    : [...current, group.id])}
                >
                  <span>{t(group.labelKey)}</span>
                  <ChevronDown className="sfm-chevron" size={15} aria-hidden="true" />
                </button>
                {expanded ? (
                  <ul className="sfm-shared-group-items" id={groupId}>
                    {group.items.map(item => renderNavigationItem(item, group.id))}
                  </ul>
                ) : null}
              </section>
            );
          })}

          <section className="sfm-shared-support" aria-label={t('nav_group_support')}>
            <button
              type="button"
              className={`sfm-shared-global-toggle${supportOpen ? ' expanded' : ''}`}
              aria-expanded={supportOpen}
              aria-controls="sfm-sidebar-group-support"
              onClick={() => setSupportOpen(current => !current)}
            >
              <span>{t('nav_group_support')}</span>
              <ChevronDown className="sfm-chevron" size={15} aria-hidden="true" />
            </button>
            {supportOpen ? (
              <ul className="sfm-shared-support-list" id="sfm-sidebar-group-support">
                {SUPPORT_LINKS.map(item => {
                  const active = item.id === selectedItemId;
                  const SupportIcon = item.icon;
                  const content = (
                    <>
                      <span className="sfm-shared-support-icon" aria-hidden="true"><SupportIcon size={16} /></span>
                      <span className="sfm-shared-support-label">
                        <span>{t(item.labelKey)}</span>
                        {item.caption ? <small>{item.caption}</small> : null}
                      </span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {item.external && item.href ? (
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
                        >
                          {content}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
