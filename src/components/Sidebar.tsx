'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const NAV_ITEMS = [
  { id: 'home', icon: '⊞', path: '/', labelKey: 'nav_home' },
  { id: 'expenses', icon: '🛒', path: '/expenses', labelKey: 'nav_expenses' },
  { id: 'income', icon: '💵', path: '/income', labelKey: 'nav_income' },
  { id: 'invest', icon: '📈', path: '/invest', labelKey: 'nav_invest' },
  { id: 'goals', icon: '🎯', path: '/goals', labelKey: 'nav_goals' },
  { id: 'projects', icon: '🚀', path: '/projects', labelKey: 'nav_projects' },
  { id: 'charity', icon: '🤲', path: '/charity', labelKey: 'nav_charity' },
  { id: 'reports', icon: '📊', path: '/reports', labelKey: 'nav_reports' },
  { id: 'ai', icon: '🧠', path: '/ai', labelKey: 'nav_ai' },
  { id: 'notif', icon: '🔔', path: '/notifications', labelKey: 'nav_notif' },
  { id: 'settings', icon: '⚙️', path: '/settings', labelKey: 'nav_settings' },
  { id: 'profile', icon: '👤', path: '/profile', labelKey: 'nav_profile' },
] as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="sfm-shared-sidebar" dir={dir}>
      <style>{`
        .sfm-shared-sidebar{width:230px;background:linear-gradient(180deg,#1A0F05 0%,#0D0804 100%);position:fixed;right:0;top:0;bottom:0;z-index:50;display:flex;flex-direction:column;overflow-y:auto;border-left:1px solid rgba(216,174,99,.1);font-family:Tajawal,Arial,sans-serif}
        [dir="ltr"].sfm-shared-sidebar{right:auto;left:0;border-left:0;border-right:1px solid rgba(216,174,99,.1)}
        .sfm-shared-brand{padding:20px 16px 14px;border-bottom:1px solid rgba(216,174,99,.08)}
        .sfm-shared-brand strong{display:block;font-size:17px;font-weight:900;color:#D8AE63;letter-spacing:.02em}
        .sfm-shared-brand span{display:block;font-size:11px;color:rgba(216,174,99,.45);margin-top:3px}
        .sfm-shared-lang{padding:12px 16px;border-bottom:1px solid rgba(216,174,99,.08);display:flex;justify-content:center}
        .sfm-shared-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:4px}
        .sfm-shared-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.58);font-size:13px;font-weight:600;border:none;background:transparent;width:100%;text-align:start;font-family:Tajawal,Arial,sans-serif}
        .sfm-shared-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.9)}
        .sfm-shared-item.active{background:rgba(216,174,99,.18);color:#D8AE63;font-weight:800;box-shadow:inset 0 0 0 1px rgba(216,174,99,.08)}
        .sfm-shared-icon{width:20px;text-align:center;font-size:16px;flex:0 0 20px}
        .sfm-shared-divider{height:1px;background:rgba(216,174,99,.08);margin:8px 6px}
        @media(max-width:1024px){.sfm-shared-sidebar{display:none}}
      `}</style>
      <div className="sfm-shared-brand">
        <strong>THE SFM</strong>
        <span>{t('ai_manager')}</span>
      </div>
      <div className="sfm-shared-lang">
        <LanguageSwitcher variant="dark" compact />
      </div>
      <nav className="sfm-shared-nav">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`sfm-shared-item${active ? ' active' : ''}`}
            >
              <span className="sfm-shared-icon">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
        <div className="sfm-shared-divider" />
        <button type="button" onClick={handleLogout} className="sfm-shared-item">
          <span className="sfm-shared-icon">⤴</span>
          <span>{t('nav_logout')}</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
