'use client';

import Link from 'next/link';
import { LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { TwoColumnGrid } from '@/components/layout/LayoutPrimitives';
import { AppCard } from '@/components/layout/AppCard';
import { ActionRow } from '@/components/layout/ActionRow';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { AccountCompletionCard } from '@/components/account/AccountCompletionCard';
import { useLanguage } from '@/hooks/useLanguage';
import { useViewMode } from '@/hooks/useViewMode';

type Lang = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    title: 'الإعدادات',
    subtitle: 'اضبط تجربة THE SFM بدون تغيير بياناتك أو حساباتك المالية.',
    eyebrow: 'تفضيلات التجربة',
    viewModeTitle: 'وضع العرض',
    viewModeBody: 'اختر الوضع البسيط للصفحات الأساسية فقط، أو الاحترافي لعرض كل أدوات المنصة.',
    simpleList: 'الوضع البسيط: لوحة القيادة، الدخل، المصروفات، الأهداف، التقارير، الإشعارات، الملف الشخصي.',
    professionalList: 'الوضع الاحترافي: كل الصفحات والأدوات المتقدمة.',
    profile: 'الملف الشخصي',
    profileBody: 'غيّر بيانات الحساب والمعلومات الشخصية من صفحة الملف الشخصي.',
    security: 'الأمان والخصوصية',
    securityBody: 'راجع مبادئ الخصوصية وإخلاء المسؤولية المالية.',
    openProfile: 'فتح الملف الشخصي',
    openSecurity: 'فتح الأمان والخصوصية',
  },
  en: {
    title: 'Settings',
    subtitle: 'Tune your THE SFM experience without changing financial records or calculations.',
    eyebrow: 'Experience preferences',
    viewModeTitle: 'View Mode',
    viewModeBody: 'Choose Simple for core pages only, or Professional to show every platform tool.',
    simpleList: 'Simple mode: Dashboard, Income, Expenses, Goals, Reports, Notifications, Profile.',
    professionalList: 'Professional mode: every page and advanced tool.',
    profile: 'Profile',
    profileBody: 'Change account and personal details on the Profile page.',
    security: 'Security & Privacy',
    securityBody: 'Review privacy principles and the financial disclaimer.',
    openProfile: 'Open Profile',
    openSecurity: 'Open Security & Privacy',
  },
  fr: {
    title: 'Paramètres',
    subtitle: 'Ajustez votre expérience THE SFM sans modifier vos données ou calculs financiers.',
    eyebrow: 'Préférences d’expérience',
    viewModeTitle: 'Mode d’affichage',
    viewModeBody: 'Choisissez Simple pour les pages essentielles, ou Professionnel pour tous les outils.',
    simpleList: 'Mode simple : Tableau de bord, revenus, dépenses, objectifs, rapports, notifications, profil.',
    professionalList: 'Mode professionnel : toutes les pages et outils avancés.',
    profile: 'Profil',
    profileBody: 'Modifiez les informations du compte et les détails personnels dans le profil.',
    security: 'Sécurité et confidentialité',
    securityBody: 'Consultez les principes de confidentialité et l’avertissement financier.',
    openProfile: 'Ouvrir le profil',
    openSecurity: 'Ouvrir sécurité et confidentialité',
  },
} as const;

export default function SettingsPage() {
  const { lang, dir } = useLanguage();
  const { viewMode, setViewMode } = useViewMode();
  const text = TEXT[(lang as Lang) || 'ar'];

  return (
    <div className="settings-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="settings-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>
        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<Settings size={28} />}
        />

        <TwoColumnGrid>
          <div className="settings-primary-column">
            <AppCard className="settings-preference-card">
              <div className="settings-card-head">
                <span aria-hidden="true"><LayoutDashboard size={22} /></span>
                <div>
                  <h2>{text.viewModeTitle}</h2>
                  <p>{text.viewModeBody}</p>
                </div>
              </div>
              <ViewModeSelector value={viewMode} onChange={setViewMode} />
              <div className="settings-mode-notes">
                <p>{text.simpleList}</p>
                <p>{text.professionalList}</p>
              </div>
            </AppCard>

            <AppCard className="settings-preference-card">
              <div className="settings-card-head">
                <span aria-hidden="true"><ShieldCheck size={22} /></span>
                <div>
                  <h2>{text.security}</h2>
                  <p>{text.securityBody}</p>
                </div>
              </div>
              <ActionRow>
                <Link className="sfm-secondary-link" href="/security">{text.openSecurity}</Link>
                <Link className="sfm-secondary-link" href="/profile">{text.openProfile}</Link>
              </ActionRow>
            </AppCard>
          </div>

          <div className="settings-side-column">
            <AccountCompletionCard compact />
            <AppCard className="settings-preference-card">
              <h2>{text.profile}</h2>
              <p>{text.profileBody}</p>
              <Link className="sfm-primary-link" href="/profile">{text.openProfile}</Link>
            </AppCard>
          </div>
        </TwoColumnGrid>
      </DashboardPageShell>

      <style jsx global>{`
        .settings-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .settings-content,
        .settings-primary-column,
        .settings-side-column,
        .settings-preference-card {
          display: grid;
          gap: var(--sfm-section-gap);
        }
        .settings-primary-column,
        .settings-side-column,
        .settings-preference-card {
          gap: var(--sfm-card-gap);
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .settings-card-head {
          display: flex;
          gap: 12px;
          min-width: 0;
        }
        .settings-card-head > span {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex: 0 0 46px;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .settings-card-head div,
        .settings-preference-card {
          min-width: 0;
        }
        .settings-preference-card h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 19px;
        }
        .settings-preference-card p,
        .settings-mode-notes p {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.7;
        }
        .settings-mode-notes {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 16px;
          background: #F8FBFF;
          border: 1px solid rgba(29, 140, 255, .12);
        }
        .sfm-primary-link,
        .sfm-secondary-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          text-decoration: none;
          font: 950 13px Tajawal, Arial, sans-serif;
          white-space: normal;
        }
        .sfm-primary-link {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .2);
        }
        .sfm-secondary-link {
          border: 1px solid rgba(29, 140, 255, .18);
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
