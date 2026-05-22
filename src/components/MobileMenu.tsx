'use client';

import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bot,
  Calculator,
  ChartPie,
  FileSearch,
  FolderKanban,
  HandHeart,
  Home,
  PiggyBank,
  ReceiptText,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
  X,
  Building2,
  BriefcaseBusiness,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';

type NavLabel = { ar: string; en: string; fr: string };
type NavItem = {
  href: string;
  label: NavLabel;
  icon: ComponentType<{ size?: number }>;
  section?: 'main' | 'services';
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: { ar: 'الرئيسية', en: 'Dashboard', fr: 'Tableau de bord' }, icon: Home },
  { href: '/expenses', label: { ar: 'المصروفات', en: 'Expenses', fr: 'Depenses' }, icon: ReceiptText },
  { href: '/income', label: { ar: 'الدخل', en: 'Income', fr: 'Revenus' }, icon: Wallet },
  { href: '/invest', label: { ar: 'الاستثمارات', en: 'Investments', fr: 'Investissements' }, icon: TrendingUp },
  { href: '/savings', label: { ar: 'الإدخار', en: 'Savings', fr: 'Epargne' }, icon: PiggyBank },
  { href: '/goals', label: { ar: 'الأهداف', en: 'Goals', fr: 'Objectifs' }, icon: Target },
  { href: '/projects', label: { ar: 'مشاريعي', en: 'My Projects', fr: 'Mes projets' }, icon: FolderKanban },
  { href: '/reports', label: { ar: 'التقارير', en: 'Reports', fr: 'Rapports' }, icon: ChartPie },
  { href: '/ai', label: { ar: 'الذكاء المالي', en: 'Financial AI', fr: 'IA financiere' }, icon: Bot },
  { href: '/charity', label: { ar: 'الأعمال الخيرية', en: 'Charity', fr: 'Charite' }, icon: HandHeart },
  { href: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications', fr: 'Notifications' }, icon: Bell },
  { href: '/profile', label: { ar: 'الملف الشخصي', en: 'Profile', fr: 'Profil' }, icon: UserRound },
  { href: '/services/investment-firms', label: { ar: 'شركات الاستثمار', en: 'Investment Firms', fr: 'Societes d investissement' }, icon: Building2, section: 'services' },
  { href: '/services/accounting-firms', label: { ar: 'شركات المحاسبة', en: 'Accounting Firms', fr: 'Cabinets comptables' }, icon: Calculator, section: 'services' },
  { href: '/services/feasibility-firms', label: { ar: 'دراسة الجدوى', en: 'Feasibility Firms', fr: 'Etudes de faisabilite' }, icon: FileSearch, section: 'services' },
  { href: '/services/advisory-firms', label: { ar: 'الاستشارات المالية', en: 'Advisory Firms', fr: 'Conseil financier' }, icon: BriefcaseBusiness, section: 'services' },
];

function activePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const [activeSource, setActiveSource] = useState(pathname);
  const mainItems = NAV_ITEMS.filter(item => item.section !== 'services');
  const serviceItems = NAV_ITEMS.filter(item => item.section === 'services');

  useEffect(() => {
    const nextPath = typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('next');
    setActiveSource(pathname === '/login' && nextPath?.startsWith('/') ? nextPath : pathname);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className={`sfm-mobile-layer${open ? ' open' : ''}`} aria-hidden={!open} dir={dir}>
      <button type="button" className="sfm-mobile-overlay" aria-label="Close navigation" onClick={onClose} tabIndex={open ? 0 : -1} />
      <aside id="sfm-mobile-menu" className="sfm-mobile-panel" aria-label="Mobile navigation">
        <div className="sfm-mobile-panel-head">
          <div className="sfm-mobile-logo">
            <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} priority />
            <div>
              <strong>THE SFM</strong>
              <span>{lang === 'ar' ? 'القائمة الرئيسية' : lang === 'fr' ? 'Menu principal' : 'Main menu'}</span>
            </div>
          </div>
          <button type="button" className="sfm-mobile-close" aria-label="Close navigation" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="sfm-mobile-lang">
          <LanguageSwitcher variant="dark" compact />
        </div>

        <nav className="sfm-mobile-nav">
          {mainItems.map(item => {
            const Icon = item.icon;
            const active = activePath(activeSource, item.href);
            return (
              <button
                key={item.href}
                type="button"
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(item.href)}
              >
                <span className="sfm-mobile-nav-icon"><Icon size={18} /></span>
                <span>{item.label[lang]}</span>
              </button>
            );
          })}

          <div className="sfm-mobile-section">{lang === 'ar' ? 'الخدمات' : lang === 'fr' ? 'Services' : 'Services'}</div>

          {serviceItems.map(item => {
            const Icon = item.icon;
            const active = activePath(activeSource, item.href);
            return (
              <button
                key={item.href}
                type="button"
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(item.href)}
              >
                <span className="sfm-mobile-nav-icon"><Icon size={18} /></span>
                <span>{item.label[lang]}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <style jsx global>{`
        .sfm-mobile-layer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          visibility: hidden;
          font-family: Tajawal, Arial, sans-serif;
        }

        .sfm-mobile-layer.open {
          pointer-events: auto;
          visibility: visible;
        }

        .sfm-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          border: 0;
          background: rgba(10, 7, 4, 0.62);
          opacity: 0;
          cursor: pointer;
          transition: opacity 0.24s ease;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .sfm-mobile-layer.open .sfm-mobile-overlay {
          opacity: 1;
        }

        .sfm-mobile-panel {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 85%;
          max-width: 420px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          padding: calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
          overflow-y: auto;
          background:
            linear-gradient(160deg, rgba(216, 174, 99, 0.14), transparent 28%),
            linear-gradient(180deg, rgba(31, 18, 8, 0.98), rgba(9, 6, 4, 0.98));
          border-inline-start: 1px solid rgba(216, 174, 99, 0.22);
          border-radius: 24px 0 0 24px;
          box-shadow: -24px 0 70px rgba(0, 0, 0, 0.42);
          color: #fffdfc;
          transform: translateX(104%);
          transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.2, 1);
          will-change: transform;
        }

        [dir="ltr"] .sfm-mobile-panel {
          right: auto;
          left: 0;
          border-inline-start: 0;
          border-inline-end: 1px solid rgba(216, 174, 99, 0.22);
          border-radius: 0 24px 24px 0;
          box-shadow: 24px 0 70px rgba(0, 0, 0, 0.42);
          transform: translateX(-104%);
        }

        .sfm-mobile-layer.open .sfm-mobile-panel {
          transform: translateX(0);
        }

        .sfm-mobile-panel-head,
        .sfm-mobile-logo,
        .sfm-mobile-lang,
        .sfm-mobile-nav button {
          display: flex;
          align-items: center;
        }

        .sfm-mobile-panel-head {
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(216, 174, 99, 0.14);
        }

        .sfm-mobile-logo {
          min-width: 0;
          gap: 10px;
        }

        .sfm-mobile-logo img {
          border-radius: 12px;
          object-fit: cover;
        }

        .sfm-mobile-logo strong {
          display: block;
          color: #d8ae63;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .sfm-mobile-logo span {
          display: block;
          color: rgba(255, 253, 252, 0.56);
          font-size: 12px;
          font-weight: 700;
          margin-top: 2px;
        }

        .sfm-mobile-close {
          flex: 0 0 auto;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(216, 174, 99, 0.24);
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.08);
          color: #fffdfc;
          cursor: pointer;
        }

        .sfm-mobile-lang {
          justify-content: center;
          padding: 14px 0;
          border-bottom: 1px solid rgba(216, 174, 99, 0.1);
        }

        .sfm-mobile-nav {
          display: grid;
          gap: 6px;
          padding: 12px 0 4px;
        }

        .sfm-mobile-nav button {
          width: 100%;
          min-height: 46px;
          gap: 11px;
          border: 1px solid transparent;
          border-radius: 15px;
          padding: 10px 12px;
          background: transparent;
          color: rgba(255, 253, 252, 0.72);
          cursor: pointer;
          font: 800 13.5px Tajawal, Arial, sans-serif;
          text-align: start;
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .sfm-mobile-nav button:hover,
        .sfm-mobile-nav button.active {
          border-color: rgba(216, 174, 99, 0.2);
          background: rgba(216, 174, 99, 0.14);
          color: #d8ae63;
        }

        .sfm-mobile-nav button.active {
          box-shadow: inset 0 0 0 1px rgba(216, 174, 99, 0.08);
        }

        .sfm-mobile-nav button:active {
          transform: scale(0.99);
        }

        .sfm-mobile-nav-icon {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.07);
        }

        .sfm-mobile-nav button.active .sfm-mobile-nav-icon {
          background: rgba(216, 174, 99, 0.2);
        }

        .sfm-mobile-section {
          margin: 12px 6px 4px;
          color: rgba(216, 174, 99, 0.62);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
        }
      `}</style>
    </div>
  );
}

export default MobileMenu;
