'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  HeartHandshake,
  Landmark,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { AccountCompletionCard } from '@/components/account/AccountCompletionCard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSmartTasks } from '@/hooks/useSmartTasks';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';

type Lang = 'ar' | 'en' | 'fr';
type CommandKey =
  | 'income'
  | 'expenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'marketWatchlist'
  | 'projects'
  | 'projectTasks'
  | 'projectDocuments'
  | 'zakatCalculations'
  | 'zakatAssets'
  | 'charityProjects'
  | 'charityDocuments'
  | 'notifications';

type Records = Record<CommandKey, any[]>;

const COMMAND_TABLES: Array<{ key: CommandKey; table: string; limit?: number }> = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'investments', table: 'investment_items' },
  { key: 'marketWatchlist', table: 'market_watchlist' },
  { key: 'projects', table: 'projects' },
  { key: 'projectTasks', table: 'project_tasks' },
  { key: 'projectDocuments', table: 'project_documents' },
  { key: 'zakatCalculations', table: 'zakat_calculations' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityProjects', table: 'charity_projects' },
  { key: 'charityDocuments', table: 'charity_documents' },
  { key: 'notifications', table: 'notifications' },
];

const EMPTY_RECORDS = COMMAND_TABLES.reduce((acc, item) => {
  acc[item.key] = [];
  return acc;
}, {} as Records);

const TEXT = {
  ar: {
    title: 'مركز القيادة',
    subtitle: 'بوابة هادئة تنقلك إلى العوالم الأساسية داخل THE SFM بدون ازدحام.',
    eyebrow: 'تنظيم المنتج',
    loading: 'جارٍ تحميل مركز القيادة...',
    noData: 'ابدأ بإضافة بياناتك.',
    ready: 'توجد بيانات حقيقية',
    needsData: 'يحتاج بيانات',
    open: 'فتح',
    account: 'اكتمال الحساب',
    worlds: 'العوالم النشطة',
    today: 'إجراءات اليوم',
    tasks: 'مركز المهام',
    openTasks: 'مهام مفتوحة',
    noUrgent: 'لا توجد إجراءات مهمة اليوم.',
    personalFinance: 'مالي الشخصي',
    personalFinanceDesc: 'الدخل، المصروفات، الأهداف، والمدخرات في مساحة واحدة.',
    investments: 'استثماراتي',
    investmentsDesc: 'المحفظة، الأصول، وقائمة المتابعة عند توفر بياناتك.',
    projects: 'مشاريعي',
    projectsDesc: 'إدارة مشاريعك والدخول إلى مساحات العمل التفصيلية.',
    zakatCharity: 'زكاتي وخيري',
    zakatCharityDesc: 'الزكاة، المشاريع الخيرية، والتذكيرات ذات الصلة.',
    reports: 'تقاريري',
    reportsDesc: 'مركز التقارير يعرض الجاهز وما يحتاج بيانات فقط.',
    documents: 'مستنداتي',
    documentsDesc: 'مركز واحد لكل مستندات المشاريع، الإيصالات، العروض، والتقارير المحفوظة.',
    aiAssistant: 'مساعدي الذكي',
    aiAssistantDesc: 'مدخل للمساعد الذكي ليعمل على بياناتك الفعلية عند توفرها.',
    notifications: 'إشعارات عالية الأهمية',
  },
  en: {
    title: 'Command Center',
    subtitle: 'A calm gateway into the core worlds of THE SFM without clutter.',
    eyebrow: 'Product organization',
    loading: 'Loading Command Center...',
    noData: 'Start by adding your data.',
    ready: 'Real data available',
    needsData: 'Needs data',
    open: 'Open',
    account: 'Account completion',
    worlds: 'Active worlds',
    today: 'Today’s actions',
    tasks: 'Tasks Center',
    openTasks: 'Open tasks',
    noUrgent: 'No important actions today.',
    personalFinance: 'Personal Finance',
    personalFinanceDesc: 'Income, expenses, goals, and savings in one clean area.',
    investments: 'Investments',
    investmentsDesc: 'Portfolio, assets, and watchlist when your data exists.',
    projects: 'Projects',
    projectsDesc: 'Manage projects and open detailed workspaces.',
    zakatCharity: 'Zakat & Charity',
    zakatCharityDesc: 'Zakat, charity projects, and related reminders.',
    reports: 'Reports',
    reportsDesc: 'Reports Center shows what is ready and what needs data.',
    documents: 'Documents',
    documentsDesc: 'One center for project documents, receipts, decks, and saved reports.',
    aiAssistant: 'AI Assistant',
    aiAssistantDesc: 'Entry point for the assistant to work from your real data when available.',
    notifications: 'High priority notifications',
  },
  fr: {
    title: 'Centre de commande',
    subtitle: 'Une passerelle claire vers les univers principaux de THE SFM, sans surcharge.',
    eyebrow: 'Organisation produit',
    loading: 'Chargement du centre de commande...',
    noData: 'Commencez par ajouter vos données.',
    ready: 'Données réelles disponibles',
    needsData: 'Données requises',
    open: 'Ouvrir',
    account: 'Complétion du compte',
    worlds: 'Univers actifs',
    today: 'Actions du jour',
    tasks: 'Centre des tâches',
    openTasks: 'Tâches ouvertes',
    noUrgent: 'Aucune action importante aujourd’hui.',
    personalFinance: 'Finances personnelles',
    personalFinanceDesc: 'Revenus, dépenses, objectifs et épargne dans un espace clair.',
    investments: 'Investissements',
    investmentsDesc: 'Portefeuille, actifs et liste de suivi lorsque vos données existent.',
    projects: 'Projets',
    projectsDesc: 'Gérez vos projets et ouvrez les espaces de travail détaillés.',
    zakatCharity: 'Zakat et charité',
    zakatCharityDesc: 'Zakat, projets caritatifs et rappels associés.',
    reports: 'Rapports',
    reportsDesc: 'Le centre des rapports affiche ce qui est prêt et ce qui nécessite des données.',
    documents: 'Documents',
    documentsDesc: 'Un centre pour les documents de projet, reçus, pitch decks et rapports enregistrés.',
    aiAssistant: 'Assistant IA',
    aiAssistantDesc: 'Point d’entrée pour que l’assistant travaille à partir de vos données réelles.',
    notifications: 'Notifications haute priorité',
  },
} as const;

function hasAny(records: Records, keys: CommandKey[]) {
  return keys.some(key => (records[key]?.length ?? 0) > 0);
}

function isHighPriority(row: any) {
  const status = String(row?.status ?? '').toLowerCase();
  if (status === 'archived') return false;
  const severity = String(row?.severity ?? row?.priority ?? '').toLowerCase();
  return ['danger', 'warning', 'high'].includes(severity);
}

export default function CommandCenterPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const { tasks, loading: tasksLoading } = useSmartTasks();
  const [records, setRecords] = useState<Records>(EMPTY_RECORDS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setRecords(EMPTY_RECORDS);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await loadUserDataTables(supabase as any, user.id, COMMAND_TABLES);
      if (!cancelled) {
        setRecords({
          ...(result.records as Records),
          income: personalIncomeRows(result.records.income ?? []),
          expenses: personalExpenseRows(result.records.expenses ?? []),
        });
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const summary = useMemo(() => {
    const worlds = [
      hasAny(records, ['income', 'expenses', 'savings', 'goals']),
      hasAny(records, ['investments', 'marketWatchlist']),
      hasAny(records, ['projects', 'projectTasks']),
      hasAny(records, ['zakatCalculations', 'zakatAssets', 'charityProjects']),
      hasAny(records, ['income', 'expenses', 'projects', 'zakatCalculations', 'charityProjects']),
      hasAny(records, ['income', 'expenses', 'projects', 'goals', 'investments']),
    ];
    const highPriority = records.notifications.filter(isHighPriority).length;
    return {
      activeWorlds: worlds.filter(Boolean).length,
      highPriority,
    };
  }, [records]);
  const openTaskCount = tasksLoading ? 0 : tasks.filter(task => task.status === 'open').length;

  const worlds = [
    {
      title: text.personalFinance,
      description: text.personalFinanceDesc,
      href: '/income',
      icon: Wallet,
      ready: hasAny(records, ['income', 'expenses', 'savings', 'goals']),
    },
    {
      title: text.investments,
      description: text.investmentsDesc,
      href: '/invest',
      icon: TrendingUp,
      ready: hasAny(records, ['investments', 'marketWatchlist']),
    },
    {
      title: text.projects,
      description: text.projectsDesc,
      href: '/projects',
      icon: BriefcaseBusiness,
      ready: hasAny(records, ['projects', 'projectTasks']),
    },
    {
      title: text.zakatCharity,
      description: text.zakatCharityDesc,
      href: '/zakat',
      icon: HeartHandshake,
      ready: hasAny(records, ['zakatCalculations', 'zakatAssets', 'charityProjects']),
    },
    {
      title: text.reports,
      description: text.reportsDesc,
      href: '/reports-center',
      icon: FileText,
      ready: hasAny(records, ['income', 'expenses', 'projects', 'zakatCalculations', 'charityProjects']),
    },
    {
      title: text.aiAssistant,
      description: text.aiAssistantDesc,
      href: '/ai',
      icon: Bot,
      ready: hasAny(records, ['income', 'expenses', 'projects', 'goals', 'investments']),
    },
  ];

  return (
    <div className="command-center-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} className="command-center-main" contentClassName="command-center-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<Landmark size={28} />}
          actions={(
            <>
              <Link className="sfm-secondary-link" href="/tasks">{text.tasks}</Link>
              <Link className="sfm-primary-link" href="/today">{text.today}</Link>
            </>
          )}
        />

        {loading ? (
          <EmptyState
            icon={<Loader2 className="spin" size={24} />}
            title={text.loading}
          />
        ) : (
          <>
            <StatGrid className="command-summary-grid">
              <AppCard>
                <Metric label={text.worlds} value={`${summary.activeWorlds}/6`} hint={summary.activeWorlds > 0 ? text.ready : text.noData} icon={<Landmark size={20} />} />
              </AppCard>
              <AppCard>
                <Metric label={text.notifications} value={`${summary.highPriority}`} hint={summary.highPriority > 0 ? text.ready : text.noUrgent} icon={<Bell size={20} />} />
              </AppCard>
              <AppCard>
                <Metric label={text.openTasks} value={tasksLoading ? '...' : `${openTaskCount}`} hint={openTaskCount > 0 ? text.ready : text.noUrgent} icon={<ClipboardList size={20} />} />
              </AppCard>
            </StatGrid>

            <AccountCompletionCard className="command-account-card" />

            <CardsGrid className="command-world-grid">
              {worlds.map(world => {
                const Icon = world.icon;
                return (
                  <AppCard key={world.title} className="command-world-card">
                    <div className="command-world-icon" aria-hidden="true"><Icon size={24} /></div>
                    <div className="command-world-copy">
                      <span className={world.ready ? 'ready' : 'needs-data'}>{world.ready ? text.ready : text.needsData}</span>
                      <h2>{world.title}</h2>
                      <p>{world.description}</p>
                      {!world.ready ? <strong>{text.noData}</strong> : null}
                    </div>
                    <Link className="sfm-secondary-link" href={world.href} aria-label={`${text.open} ${world.title}`}>
                      {text.open}
                    </Link>
                  </AppCard>
                );
              })}
            </CardsGrid>
          </>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .command-center-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .command-center-main {
          width: calc(100% - var(--sidebar-w, 230px)) !important;
          max-width: none !important;
          margin-inline-start: var(--sidebar-w, 230px) !important;
          margin-inline-end: 0 !important;
          padding-inline: 24px !important;
        }
        .command-center-content {
          width: 100%;
          max-width: none;
          display: grid;
          gap: var(--sfm-section-gap);
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
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
        .command-summary-grid {
          grid-template-columns: repeat(3, minmax(240px, 1fr)) !important;
          align-items: stretch;
        }
        .command-summary-grid .sfm-app-card {
          min-height: 132px;
          display: grid;
          align-items: center;
        }
        .command-account-card {
          width: 100%;
        }
        .command-world-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)) !important;
          align-items: stretch;
        }
        .command-world-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-rows: auto 1fr auto;
          gap: 14px;
          align-items: start;
          min-height: 260px;
        }
        .command-world-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .command-world-copy {
          min-width: 0;
          display: grid;
          gap: 7px;
        }
        .command-world-copy span {
          width: fit-content;
          border-radius: 999px;
          padding: 4px 9px;
          font-size: 11px;
          font-weight: 950;
        }
        .command-world-copy span.ready {
          background: rgba(16, 185, 129, .12);
          color: #047857;
        }
        .command-world-copy span.needs-data {
          background: rgba(100, 116, 139, .12);
          color: var(--sfm-muted);
        }
        .command-world-copy h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 20px;
        }
        .command-world-copy p,
        .command-world-copy strong {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.65;
        }
        .command-world-card .sfm-secondary-link {
          grid-column: 1 / -1;
          justify-self: start;
          align-self: end;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .command-center-main {
            width: 100% !important;
            margin-inline: 0 !important;
            padding-inline: 16px !important;
          }
          .command-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .command-summary-grid,
          .command-world-grid {
            grid-template-columns: 1fr !important;
          }
          .command-world-card {
            grid-template-columns: 1fr;
            min-height: 0;
          }
          .command-world-card .sfm-secondary-link {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: ReactNode }) {
  return (
    <div className="command-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <em>{hint}</em>
      </div>
      <style jsx>{`
        .command-metric {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .command-metric > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 14px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .command-metric div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }
        .command-metric p,
        .command-metric em {
          margin: 0;
          color: var(--sfm-muted);
          font-style: normal;
          line-height: 1.45;
        }
        .command-metric p {
          font-size: 12px;
          font-weight: 900;
        }
        .command-metric strong {
          color: var(--sfm-primary-dark);
          font-size: 24px;
          line-height: 1.1;
        }
        .command-metric em {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
