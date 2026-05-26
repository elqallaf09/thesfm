'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import {
  filterNavigationGroups,
  findActiveNavigationGroup,
  flattenNavigationItems,
  isNavigationItemActive,
  NAV_GROUPS,
  normalizeNavigationSource,
  type NavigationItem,
} from '@/components/navigationConfig';

export const NAV_ITEMS = flattenNavigationItems();

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { signOut } = useAuth();
  const { viewMode, setViewMode } = useViewMode();
  const [activeSource, setActiveSource] = useState(pathname);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const previousLang = useRef(lang);

  const activeGroupId = useMemo(() => findActiveNavigationGroup(activeSource), [activeSource]);
  const navGroups = useMemo(() => filterNavigationGroups(NAV_GROUPS, viewMode), [viewMode]);

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
    if (activeGroupId) setClosedGroups(prev => ({ ...prev, [activeGroupId]: false }));
  }, [activeGroupId]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sfm-mobile-lock');
    return () => {
      document.body.style.overflow = original;
      document.body.classList.remove('sfm-mobile-lock');
    };
  }, [open]);

  useEffect(() => {
    if (previousLang.current !== lang && open) onClose();
    previousLang.current = lang;
  }, [lang, onClose, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

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
    router.push(item.href);
  };

  const menuLabel = t('nav_mobile_menu');
  const closeLabel = t('nav_close_menu');

  return (
    <div className={`sfm-mobile-layer${open ? ' open' : ''}`} aria-hidden={!open} dir={dir}>
      <button type="button" className="sfm-mobile-overlay" aria-label={closeLabel} onClick={onClose} tabIndex={open ? 0 : -1} />
      <aside id="sfm-mobile-menu" className="sfm-mobile-panel" aria-label={menuLabel}>
        <div className="sfm-mobile-panel-head">
          <div className="sfm-mobile-logo">
            <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} priority className="sfm-brand-mark sfm-brand-mark--mobile" />
            <div>
              <strong>THE SFM</strong>
              <span>{menuLabel}</span>
            </div>
          </div>
          <button type="button" className="sfm-mobile-close" aria-label={closeLabel} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="sfm-mobile-lang">
          <LanguageSwitcher variant="dark" compact />
        </div>

        <div className="sfm-mobile-view-mode">
          <ViewModeSelector value={viewMode} onChange={setViewMode} variant="dark" compact />
        </div>

        <nav className="sfm-mobile-nav" aria-label={menuLabel}>
          {navGroups.map(group => {
            const expanded = !closedGroups[group.id] && (group.defaultOpen || activeGroupId === group.id || closedGroups[group.id] === false);
            const groupId = `sfm-mobile-group-${group.id}`;
            return (
              <section key={group.id} className="sfm-mobile-group">
                <button
                  type="button"
                  className="sfm-mobile-section"
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => setClosedGroups(prev => ({ ...prev, [group.id]: expanded }))}
                >
                  <span>{t(group.labelKey)}</span>
                  <ChevronDown size={15} />
                </button>
                {expanded && (
                  <div className="sfm-mobile-group-items" id={groupId}>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isNavigationItemActive(activeSource, item.href);
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
      </aside>

      <style jsx global>{`
        .sfm-mobile-layer{position:fixed;inset:0;z-index:9999;pointer-events:none;visibility:hidden;font-family:Tajawal,Arial,sans-serif;max-width:100%;overflow:hidden}
        .sfm-mobile-layer.open{pointer-events:auto;visibility:visible}
        .sfm-mobile-overlay{position:fixed;inset:0;z-index:9998;border:0;background:rgba(3,18,37,.68);opacity:0;cursor:pointer;transition:opacity .24s ease;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
        .sfm-mobile-layer.open .sfm-mobile-overlay{opacity:1}
        .sfm-mobile-panel{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:85%;max-width:min(420px,100%);z-index:9999;display:flex;flex-direction:column;padding:calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;background:linear-gradient(160deg,rgba(167,243,240,.14),transparent 28%),linear-gradient(180deg,rgba(3,18,37,.98),rgba(6,27,51,.98));border-inline-start:1px solid rgba(167,243,240,.22);border-radius:24px 0 0 24px;box-shadow:-24px 0 70px rgba(0,0,0,.42);color:#FFFFFF;transform:translateX(104%);transition:transform .28s cubic-bezier(.2,.9,.2,1);will-change:transform}
        [dir="ltr"] .sfm-mobile-panel{right:auto;left:0;border-inline-start:0;border-inline-end:1px solid rgba(167,243,240,.22);border-radius:0 24px 24px 0;box-shadow:24px 0 70px rgba(0,0,0,.42);transform:translateX(-104%)}
        .sfm-mobile-layer.open .sfm-mobile-panel{transform:translateX(0)}
        .sfm-mobile-panel-head,.sfm-mobile-logo,.sfm-mobile-lang,.sfm-mobile-nav button{display:flex;align-items:center}
        .sfm-mobile-panel-head{justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid rgba(167,243,240,.14)}
        .sfm-mobile-logo{min-width:0;gap:10px}.sfm-mobile-logo img{object-fit:cover}.sfm-mobile-logo strong{display:block;color:var(--sfm-soft-cyan);font-size:17px;font-weight:900;letter-spacing:0}.sfm-mobile-logo span{display:block;color:rgba(248,251,255,.56);font-size:12px;font-weight:700;margin-top:2px}
        .sfm-mobile-close{flex:0 0 auto;width:42px;height:42px;border:1px solid rgba(167,243,240,.24);border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#FFFFFF;cursor:pointer}
        .sfm-mobile-lang{justify-content:center;padding:14px 0;border-bottom:1px solid rgba(167,243,240,.1)}
        .sfm-mobile-view-mode{padding:12px 0;border-bottom:1px solid rgba(167,243,240,.1)}
        .sfm-mobile-nav{display:grid;gap:8px;padding:12px 0 4px}
        .sfm-mobile-group{display:grid;gap:5px;border-bottom:1px solid rgba(167,243,240,.08);padding-bottom:7px}
        .sfm-mobile-group:last-child{border-bottom:0}
        .sfm-mobile-section{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;border:0;border-radius:12px;padding:6px 10px;background:transparent;color:rgba(167,243,240,.72);cursor:pointer;font:900 11px Tajawal,Arial,sans-serif;text-align:start}
        .sfm-mobile-section svg{transition:transform .18s ease}
        .sfm-mobile-section[aria-expanded="false"] svg{transform:rotate(90deg)}
        [dir="ltr"] .sfm-mobile-section[aria-expanded="false"] svg{transform:rotate(-90deg)}
        .sfm-mobile-group-items{display:grid;gap:5px}
        .sfm-mobile-nav .sfm-mobile-group-items button{width:100%;min-height:44px;gap:11px;border:1px solid transparent;border-radius:15px;padding:9px 12px;background:transparent;color:rgba(248,251,255,.72);cursor:pointer;font:800 13.5px Tajawal,Arial,sans-serif;text-align:start;transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease;min-width:0}
        .sfm-mobile-nav .sfm-mobile-group-items button span:last-child{min-width:0;overflow-wrap:anywhere;white-space:normal}
        .sfm-mobile-nav .sfm-mobile-group-items button:hover,.sfm-mobile-nav .sfm-mobile-group-items button.active{border-color:rgba(167,243,240,.2);background:rgba(29,140,255,.18);color:#EAF6FF}.sfm-mobile-nav .sfm-mobile-group-items button.active{box-shadow:inset 0 0 0 1px rgba(167,243,240,.08)}.sfm-mobile-nav button:active{transform:scale(.99)}
        .sfm-mobile-nav-icon{width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.07);color:var(--sfm-soft-cyan)}.sfm-mobile-nav button.active .sfm-mobile-nav-icon{background:rgba(167,243,240,.2)}
      `}</style>
    </div>
  );
}

export default MobileMenu;
