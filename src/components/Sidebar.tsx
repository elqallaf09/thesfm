'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChartPie,
  FileSearch,
  FileText,
  FolderKanban,
  HandHeart,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  LogOut,
  PiggyBank,
  ReceiptText,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { supabase } from '@/integrations/supabase/client';

type TranslationKey = keyof typeof import('@/lib/translations').TR;

type NavItem = {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  path: string;
  labelKey: TranslationKey;
};

type NavSection = {
  id: string;
  titleKey?: TranslationKey;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    items: [
      { id: 'home',          icon: LayoutDashboard, path: '/',              labelKey: 'nav_home'     },
      { id: 'expenses',      icon: ReceiptText,     path: '/expenses',      labelKey: 'nav_expenses' },
      { id: 'income',        icon: Wallet,          path: '/income',        labelKey: 'nav_income'   },
      { id: 'invest',        icon: TrendingUp,      path: '/invest',        labelKey: 'nav_invest'   },
      { id: 'market-analysis', icon: LineChart,     path: '/market-analysis', labelKey: 'nav_market_analysis' },
      { id: 'savings',       icon: PiggyBank,       path: '/savings',       labelKey: 'nav_savings'  },
      { id: 'goals',         icon: Target,          path: '/goals',         labelKey: 'nav_goals'    },
      { id: 'projects',      icon: FolderKanban,    path: '/projects',      labelKey: 'nav_projects' },
      { id: 'business-hub',   icon: BriefcaseBusiness, path: '/business-hub', labelKey: 'nav_business_hub' },
      { id: 'charity',       icon: HandHeart,       path: '/charity',       labelKey: 'nav_charity'  },
      { id: 'charity-projects', icon: HeartHandshake, path: '/charity-projects', labelKey: 'nav_charity_projects' },
      { id: 'zakat',         icon: Calculator,      path: '/zakat',         labelKey: 'nav_zakat'    },
      { id: 'reports',       icon: ChartPie,        path: '/reports',       labelKey: 'nav_reports'  },
      { id: 'reports-center', icon: FileText,        path: '/reports-center', labelKey: 'nav_reports_center' },
      { id: 'ai',            icon: Bot,             path: '/ai',            labelKey: 'nav_ai'       },
      { id: 'notif',         icon: Bell,            path: '/notifications', labelKey: 'nav_notif'    },
    ],
  },
  {
    id: 'services',
    titleKey: 'nav_services_section',
    items: [
      { id: 'investment-firms',  icon: Building2,         path: '/services/investment-firms',  labelKey: 'nav_investment_firms'  },
      { id: 'accounting-firms',  icon: Calculator,        path: '/services/accounting-firms',  labelKey: 'nav_accounting_firms'  },
      { id: 'feasibility-firms', icon: FileSearch,        path: '/services/feasibility-firms', labelKey: 'nav_feasibility_firms' },
      { id: 'advisory-firms',    icon: BriefcaseBusiness, path: '/services/advisory-firms',    labelKey: 'nav_advisory_firms'    },
    ],
  },
  {
    id: 'account',
    items: [
      { id: 'profile',  icon: UserRound, path: '/profile',  labelKey: 'nav_profile'  },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, dir } = useLanguage();
  const { signOut, user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  return (
    <aside className="sfm-shared-sidebar" dir={dir}>
      <style>{`
        .sfm-shared-sidebar{width:230px;background:linear-gradient(180deg,#1A0F05 0%,#0D0804 100%);position:fixed;right:0;top:0;bottom:0;z-index:50;display:flex;flex-direction:column;overflow-y:auto;border-left:1px solid rgba(216,174,99,.1);font-family:Tajawal,Arial,sans-serif}
        [dir="ltr"].sfm-shared-sidebar{right:auto;left:0;border-left:0;border-right:1px solid rgba(216,174,99,.1)}
        .sfm-shared-brand{padding:20px 16px 14px;border-bottom:1px solid rgba(216,174,99,.08);display:flex;align-items:center;gap:10px;text-decoration:none}
        .sfm-shared-brand img{flex:0 0 auto;object-fit:cover}
        .sfm-shared-brand strong{display:block;font-size:17px;font-weight:900;color:#D8AE63;letter-spacing:.02em}
        .sfm-shared-brand span{display:block;font-size:11px;color:rgba(216,174,99,.45);margin-top:3px}
        .sfm-shared-lang{padding:12px 16px;border-bottom:1px solid rgba(216,174,99,.08);display:flex;justify-content:center}
        .sfm-shared-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:4px}
        .sfm-shared-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.58);font-size:13px;font-weight:600;border:none;background:transparent;width:100%;text-align:start;font-family:Tajawal,Arial,sans-serif}
        .sfm-shared-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.9)}
        .sfm-shared-item.active{background:rgba(216,174,99,.18);color:#D8AE63;font-weight:800;box-shadow:inset 0 0 0 1px rgba(216,174,99,.08)}
        .sfm-shared-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex:0 0 20px}
        .sfm-shared-label{min-width:0;flex:1}
        .sfm-shared-badge{min-width:22px;height:22px;border-radius:999px;background:#BA7517;color:#fffdfc;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;font-size:11px;font-weight:950}
        .sfm-shared-divider{height:1px;background:rgba(216,174,99,.08);margin:8px 6px}
        .sfm-shared-section-title{padding:5px 12px 7px;color:rgba(216,174,99,.48);font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
        @media(max-width:1024px){.sfm-shared-sidebar{display:none}}
      `}</style>
      <Link href="/" className="sfm-shared-brand">
        <Image
          src="/sfm-logo.png"
          alt="THE SFM"
          width={38}
          height={38}
          priority
          className="rounded-lg"
        />
        <div>
          <strong>THE SFM</strong>
          <span>{t('ai_manager')}</span>
        </div>
      </Link>
      <div className="sfm-shared-lang">
        <LanguageSwitcher variant="dark" compact />
      </div>
      <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(216,174,99,.08)'}}>
        <UserChip />
      </div>
      <nav className="sfm-shared-nav">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.id}>
            {index > 0 && <div className="sfm-shared-divider" />}
            {section.titleKey && <div className="sfm-shared-section-title">{t(section.titleKey)}</div>}
            {section.items.map(item => {
              const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
              const NavIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.path)}
                  className={`sfm-shared-item${active ? ' active' : ''}`}
                >
                  <span className="sfm-shared-icon"><NavIcon size={17} /></span>
                  <span className="sfm-shared-label">{t(item.labelKey)}</span>
                  {item.id === 'notif' && unreadNotifications > 0 && <span className="sfm-shared-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <div className="sfm-shared-divider" />
        <button type="button" onClick={handleLogout} className="sfm-shared-item">
          <span className="sfm-shared-icon"><LogOut size={17} /></span>
          <span>{t('nav_logout')}</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
