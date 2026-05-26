'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useViewMode } from '@/hooks/useViewMode';
import { supabase } from '@/integrations/supabase/client';
import {
  filterNavigationGroups,
  findActiveNavigationGroup,
  isNavigationItemActive,
  NAV_GROUPS,
  normalizeNavigationSource,
  type NavigationItem,
} from '@/components/navigationConfig';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { t, dir } = useLanguage();
  const { signOut, user } = useAuth();
  const { viewMode, setViewMode } = useViewMode();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [hash, setHash] = useState('');
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateHash = () => setHash(typeof window === 'undefined' ? '' : window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, [pathname]);

  const activeSource = normalizeNavigationSource(pathname, hash);
  const activeGroupId = useMemo(() => findActiveNavigationGroup(activeSource), [activeSource]);
  const navGroups = useMemo(() => filterNavigationGroups(NAV_GROUPS, viewMode), [viewMode]);

  useEffect(() => {
    if (!activeGroupId) return;
    setClosedGroups(prev => ({ ...prev, [activeGroupId]: false }));
  }, [activeGroupId]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      if (!user) {
        setUnreadNotifications(0);
        return;
      }
      const db = supabase as any;
      let result = await db.from('notifications').select('id,read,status').eq('user_id', user.id).limit(500);
      if (result.error) result = await db.from('notifications').select('id,read').eq('user_id', user.id).limit(500);
      if (cancelled) return;
      if (result.error) {
        setUnreadNotifications(0);
        return;
      }
      const count = (result.data ?? []).filter((row: any) => row.status !== 'archived' && (row.status === 'unread' || row.read === false)).length;
      setUnreadNotifications(count);
    }
    loadUnread();
    const id = window.setInterval(loadUnread, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const handleItem = async (item: NavigationItem) => {
    if (item.action === 'logout') {
      await handleLogout();
      return;
    }
    if (item.href) router.push(item.href);
  };

  return (
    <aside className="sfm-shared-sidebar" dir={dir}>
      <style>{`
        .sfm-shared-sidebar{width:var(--sidebar-w,230px);background:var(--sfm-sidebar);position:fixed;right:0;top:0;bottom:0;z-index:50;display:flex;flex-direction:column;overflow-y:auto;border-left:1px solid var(--sidebar-border);box-shadow:-8px 0 32px rgba(3,18,37,.26);font-family:Tajawal,Arial,sans-serif}
        [dir="ltr"].sfm-shared-sidebar{right:auto;left:0;border-left:0;border-right:1px solid rgba(167,243,240,.1)}
        .sfm-shared-brand{padding:20px 16px 14px;border-bottom:1px solid rgba(167,243,240,.08);display:flex;align-items:center;gap:10px;text-decoration:none}
        .sfm-shared-brand img{flex:0 0 auto;object-fit:cover}
        .sfm-shared-brand strong{display:block;font-size:17px;font-weight:900;color:var(--sfm-soft-cyan);letter-spacing:.02em}
        .sfm-shared-brand span{display:block;font-size:11px;color:rgba(167,243,240,.45);margin-top:3px}
        .sfm-shared-lang{padding:12px 16px;border-bottom:1px solid rgba(167,243,240,.08);display:flex;justify-content:center}
        .sfm-shared-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:6px}
        .sfm-shared-group{border-bottom:1px solid rgba(167,243,240,.07);padding-bottom:5px}
        .sfm-shared-group:last-child{border-bottom:0}
        .sfm-shared-group-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;border:0;background:transparent;color:rgba(167,243,240,.66);padding:8px 10px 7px;border-radius:10px;cursor:pointer;font:900 10.5px Tajawal,Arial,sans-serif;letter-spacing:.02em;text-align:start}
        .sfm-shared-group-toggle:hover,.sfm-shared-group-toggle:focus-visible{background:rgba(29,140,255,.09);color:#EAF6FF;outline:0}
        .sfm-shared-group-toggle .sfm-chevron{transition:transform .18s ease;opacity:.75}
        .sfm-shared-group-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(90deg)}
        [dir="ltr"] .sfm-shared-group-toggle[aria-expanded="false"] .sfm-chevron{transform:rotate(-90deg)}
        .sfm-shared-group-items{display:grid;gap:3px}
        .sfm-shared-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;cursor:pointer;transition:all .2s;color:rgba(234,246,255,.68);font-size:12.5px;font-weight:700;border:none;background:transparent;width:100%;text-align:start;font-family:Tajawal,Arial,sans-serif;min-width:0}
        .sfm-shared-item:hover,.sfm-shared-item:focus-visible{background:rgba(29,140,255,.12);color:#EAF6FF;outline:0;box-shadow:0 0 0 2px rgba(24,212,212,.18)}
        .sfm-shared-item.active{background:var(--sfm-sidebar-active);color:#EAF6FF;font-weight:900;box-shadow:inset 0 0 0 1px rgba(167,243,240,.16),0 8px 22px rgba(29,140,255,.14)}
        .sfm-shared-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex:0 0 20px;color:var(--sfm-soft-cyan)}
        .sfm-shared-label{min-width:0;flex:1;overflow-wrap:anywhere}
        .sfm-shared-badge{min-width:22px;height:22px;border-radius:999px;background:var(--sfm-primary);color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;font-size:11px;font-weight:950}
        @media(max-width:1024px){.sfm-shared-sidebar{display:none}}
      `}</style>
      <Link href="/dashboard" className="sfm-shared-brand">
        <Image
          src="/sfm-logo.png"
          alt="THE SFM"
          width={38}
          height={38}
          priority
          className="sfm-brand-mark sfm-brand-mark--sidebar"
        />
        <div>
          <strong>THE SFM</strong>
          <span>{t('ai_manager')}</span>
        </div>
      </Link>
      <div className="sfm-shared-lang">
        <LanguageSwitcher variant="dark" compact />
      </div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(167,243,240,.08)' }}>
        <UserChip />
        <div style={{ marginTop: 10 }}>
          <ViewModeSelector value={viewMode} onChange={setViewMode} variant="dark" compact />
        </div>
      </div>
      <nav className="sfm-shared-nav" aria-label={t('nav_mobile_menu')}>
        {navGroups.map(group => {
          const open = !closedGroups[group.id] && (group.defaultOpen || activeGroupId === group.id || closedGroups[group.id] === false);
          const groupId = `sfm-sidebar-group-${group.id}`;
          return (
            <section className="sfm-shared-group" key={group.id}>
              <button
                type="button"
                className="sfm-shared-group-toggle"
                aria-expanded={open}
                aria-controls={groupId}
                onClick={() => setClosedGroups(prev => ({ ...prev, [group.id]: open }))}
              >
                <span>{t(group.labelKey)}</span>
                <ChevronDown className="sfm-chevron" size={14} />
              </button>
              {open && (
                <div className="sfm-shared-group-items" id={groupId}>
                  {group.items.map(item => {
                    const active = isNavigationItemActive(activeSource, item.href);
                    const NavIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItem(item)}
                        className={`sfm-shared-item${active ? ' active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="sfm-shared-icon"><NavIcon size={17} /></span>
                        <span className="sfm-shared-label">{t(item.labelKey)}</span>
                        {item.id === 'notif' && unreadNotifications > 0 && (
                          <span className="sfm-shared-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
