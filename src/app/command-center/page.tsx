'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartHandshake,
  Landmark,
  Loader2,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
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
    subtitle: 'بوابتك السريعة للوصول إلى أهم أدوات THE SFM بدون ازدحام.',
    eyebrow: 'بوابة تنفيذية',
    loading: 'جارٍ تحميل مركز القيادة...',
    noData: 'لا توجد بيانات بعد',
    ready: 'متاح',
    open: 'فتح',
    account: 'اكتمال الحساب',
    worlds: 'الوحدات النشطة',
    today: 'إجراءات اليوم',
    tasks: 'مركز المهام',
    openTasks: 'مهام مفتوحة',
    noUrgent: 'لا توجد إجراءات مهمة اليوم.',
    actionHubTitle: 'ماذا تريد أن تفعل الآن؟',
    actionHubSubtitle: 'اختر المجال الذي تريد العمل عليه، وسنوجهك للصفحة المناسبة.',
    topActionToday: 'أهم إجراء اليوم',
    openFinancialToday: 'فتح اليوم المالي',
    quickLinks: 'روابط سريعة',
    personalFinance: 'مالي الشخصي',
    personalFinanceDesc: 'الدخل، المصروفات، الأهداف، والمدخرات في مكان واحد.',
    investments: 'استثماري',
    investmentsDesc: 'تابع محفظتك، السوق، والتنبيهات الاستثمارية.',
    projects: 'مشاريعي',
    projectsDesc: 'إدارة المشاريع، التكاليف، الدخل، والمهام.',
    zakatCharity: 'الزكاة والأعمال الخيرية',
    zakatCharityDesc: 'احسب الزكاة، ونظّم التبرعات، وتابع الأعمال الخيرية.',
    reports: 'تقاريري',
    reportsDesc: 'مركز التقارير يعرض جاهزية وتقارير بياناتك.',
    aiAssistant: 'مساعدي الذكي',
    aiAssistantDesc: 'مساعد ذكي يعمل على بياناتك المتاحة عند توفرها.',
    notifications: 'إشعارات عالية الأهمية',
  },
  en: {
    title: 'Command Center',
    subtitle: 'Your fast gateway to the most important THE SFM tools without clutter.',
    eyebrow: 'Executive gateway',
    loading: 'Loading Command Center...',
    noData: 'No data yet',
    ready: 'Available',
    open: 'Open',
    account: 'Account Completion',
    worlds: 'Active Modules',
    today: 'Today Actions',
    tasks: 'Tasks Center',
    openTasks: 'Open Tasks',
    noUrgent: 'No important actions today.',
    actionHubTitle: 'What do you want to do now?',
    actionHubSubtitle: 'Choose the area you want to work on and we will take you to the right page.',
    topActionToday: 'Top Action Today',
    openFinancialToday: 'Open Financial Today',
    quickLinks: 'Quick Links',
    personalFinance: 'Personal Finance',
    personalFinanceDesc: 'Income, expenses, goals, and savings in one place.',
    investments: 'Investments',
    investmentsDesc: 'Track your portfolio, market, and investment alerts.',
    projects: 'Projects',
    projectsDesc: 'Manage projects, costs, income, and tasks.',
    zakatCharity: 'Zakat & Charity',
    zakatCharityDesc: 'Calculate zakat, organize donations, and track charity work.',
    reports: 'Reports',
    reportsDesc: 'Reports Center shows your data readiness and reports.',
    aiAssistant: 'AI Assistant',
    aiAssistantDesc: 'A smart assistant that works from your available data when it exists.',
    notifications: 'High Priority Notifications',
  },
  fr: {
    title: 'Centre de commande',
    subtitle: 'Votre passerelle rapide vers les outils les plus importants de THE SFM, sans surcharge.',
    eyebrow: 'Passerelle exécutive',
    loading: 'Chargement du centre de commande...',
    noData: 'Aucune donnée pour le moment',
    ready: 'Disponible',
    open: 'Ouvrir',
    account: 'Complétion du compte',
    worlds: 'Modules actifs',
    today: 'Actions du jour',
    tasks: 'Centre des tâches',
    openTasks: 'Tâches ouvertes',
    noUrgent: 'Aucune action importante aujourd’hui.',
    actionHubTitle: 'Que voulez-vous faire maintenant ?',
    actionHubSubtitle: 'Choisissez le domaine sur lequel vous voulez travailler et nous vous dirigerons vers la bonne page.',
    topActionToday: 'Action prioritaire du jour',
    openFinancialToday: 'Ouvrir le jour financier',
    quickLinks: 'Liens rapides',
    personalFinance: 'Finances personnelles',
    personalFinanceDesc: 'Revenus, dépenses, objectifs et épargne au même endroit.',
    investments: 'Investissements',
    investmentsDesc: 'Suivez votre portefeuille, le marché et les alertes d’investissement.',
    projects: 'Projets',
    projectsDesc: 'Gérez les projets, coûts, revenus et tâches.',
    zakatCharity: 'Zakat et charité',
    zakatCharityDesc: 'Calculez la zakat, organisez les dons et suivez les actions caritatives.',
    reports: 'Rapports',
    reportsDesc: 'Le centre des rapports affiche la préparation de vos données et vos rapports.',
    aiAssistant: 'Assistant IA',
    aiAssistantDesc: 'Un assistant intelligent qui travaille avec vos données disponibles lorsqu’elles existent.',
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
  return ['danger', 'warning', 'high', 'urgent'].includes(severity);
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
    const modules = [
      hasAny(records, ['income', 'expenses', 'savings', 'goals']),
      hasAny(records, ['investments', 'marketWatchlist']),
      hasAny(records, ['projects', 'projectTasks']),
      hasAny(records, ['zakatCalculations', 'zakatAssets', 'charityProjects']),
      hasAny(records, ['income', 'expenses', 'projects', 'zakatCalculations', 'charityProjects']),
      hasAny(records, ['income', 'expenses', 'projects', 'goals', 'investments']),
    ];
    const highPriority = records.notifications.filter(isHighPriority).length;
    return {
      activeModules: modules.filter(Boolean).length,
      highPriority,
    };
  }, [records]);

  const openTaskCount = tasksLoading
    ? 0
    : tasks.filter(task => String(task?.status ?? 'open').toLowerCase() === 'open').length;

  const todayPriority = useMemo(() => {
    if (!tasksLoading) {
      const openTasks = tasks.filter(task => String(task?.status ?? 'open').toLowerCase() === 'open');
      const urgentTask = openTasks.find(task => {
        const priority = String(task?.priority ?? '').toLowerCase();
        return ['urgent', 'high', 'danger'].includes(priority);
      }) ?? openTasks[0];

      if (urgentTask) {
        return {
          title: String(urgentTask.title ?? text.openTasks),
          description: String(urgentTask.description ?? ''),
          href: '/tasks',
          cta: text.tasks,
          icon: <ClipboardList size={22} />,
        };
      }
    }

    const urgentNotification = records.notifications.find(isHighPriority);
    if (urgentNotification) {
      return {
        title: String(urgentNotification.title ?? text.notifications),
        description: String(urgentNotification.message ?? urgentNotification.description ?? ''),
        href: '/notifications',
        cta: text.notifications,
        icon: <Bell size={22} />,
      };
    }

    return null;
  }, [records.notifications, tasks, tasksLoading, text.notifications, text.openTasks, text.tasks]);

  const actionCards = [
    {
      title: text.personalFinance,
      description: text.personalFinanceDesc,
      href: '/dashboard',
      icon: Wallet,
      featured: true,
    },
    {
      title: text.investments,
      description: text.investmentsDesc,
      href: '/invest',
      icon: TrendingUp,
    },
    {
      title: text.projects,
      description: text.projectsDesc,
      href: '/projects',
      icon: BriefcaseBusiness,
    },
    {
      title: text.zakatCharity,
      description: text.zakatCharityDesc,
      href: '/zakat',
      icon: HeartHandshake,
    },
    {
      title: text.reports,
      description: text.reportsDesc,
      href: '/reports-center',
      icon: FileText,
    },
    {
      title: text.aiAssistant,
      description: text.aiAssistantDesc,
      href: '/ai',
      icon: Bot,
    },
  ];

  const quickLinks = [
    { label: text.openFinancialToday, href: '/today' },
    { label: text.tasks, href: '/tasks' },
    { label: text.notifications, href: '/notifications' },
  ];

  return (
    <div className="command-center-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} className="command-center-main" contentClassName="command-center-content">
        <section className="command-hero" aria-labelledby="command-center-title">
          <div className="command-hero-copy">
            <span>{text.eyebrow}</span>
            <h1 id="command-center-title">{text.title}</h1>
            <p>{text.subtitle}</p>
            <div className="command-hero-actions">
              <Link className="sfm-secondary-link hero-link" href="/tasks" aria-label={text.tasks}>{text.tasks}</Link>
              <Link className="sfm-primary-link hero-link" href="/today" aria-label={text.today}>{text.today}</Link>
            </div>
          </div>
          <div className="command-hero-mark" aria-hidden="true">
            <Landmark size={44} />
            <Sparkles size={22} className="command-hero-spark" />
          </div>
        </section>

        {loading ? (
          <EmptyState
            icon={<Loader2 className="spin" size={24} />}
            title={text.loading}
          />
        ) : (
          <>
            <StatGrid className="command-summary-grid">
              <AppCard>
                <Metric label={text.worlds} value={`${summary.activeModules}/6`} hint={summary.activeModules > 0 ? text.ready : text.noData} icon={<Landmark size={20} />} />
              </AppCard>
              <AppCard>
                <Metric label={text.notifications} value={`${summary.highPriority}`} hint={summary.highPriority > 0 ? text.ready : text.noUrgent} icon={<Bell size={20} />} />
              </AppCard>
              <AppCard>
                <Metric label={text.openTasks} value={tasksLoading ? '...' : `${openTaskCount}`} hint={openTaskCount > 0 ? text.ready : text.noUrgent} icon={<ClipboardList size={20} />} />
              </AppCard>
            </StatGrid>

            <AccountCompletionCard compact className="command-account-card" />

            <section className="command-section" aria-labelledby="command-action-hub-title">
              <div className="command-section-head">
                <h2 id="command-action-hub-title">{text.actionHubTitle}</h2>
                <p>{text.actionHubSubtitle}</p>
              </div>
              <CardsGrid className="command-action-grid">
                {actionCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <AppCard key={card.title} className={`command-action-card ${card.featured ? 'featured' : ''}`.trim()}>
                      <div className="command-action-icon" aria-hidden="true"><Icon size={24} /></div>
                      <div className="command-action-copy">
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                      </div>
                      <Link className="command-action-link" href={card.href} aria-label={`${text.open} ${card.title}`}>
                        <span>{text.open}</span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </AppCard>
                  );
                })}
              </CardsGrid>
            </section>

            <section className="command-lower-grid" aria-label={text.topActionToday}>
              <AppCard className="command-priority-card">
                <div className="command-priority-head">
                  <span aria-hidden="true">{todayPriority?.icon ?? <ClipboardList size={22} />}</span>
                  <div>
                    <p>{text.topActionToday}</p>
                    <h2>{todayPriority?.title ?? text.noUrgent}</h2>
                  </div>
                </div>
                {todayPriority?.description ? <p className="command-priority-description">{todayPriority.description}</p> : null}
                <Link className="sfm-primary-link" href={todayPriority?.href ?? '/today'}>
                  {todayPriority?.cta ?? text.openFinancialToday}
                </Link>
              </AppCard>

              <AppCard className="command-quick-card">
                <h2>{text.quickLinks}</h2>
                <div className="command-quick-links">
                  {quickLinks.map(link => (
                    <Link key={link.href} href={link.href}>
                      <span>{link.label}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </AppCard>
            </section>
          </>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .command-center-shell {
          min-height: 100vh;
          background: var(--background);
        }
        .command-center-main {
          width: 100%;
          min-width: 0;
        }
        .command-center-content {
          width: 100%;
          max-width: none;
          display: grid;
          gap: 24px;
        }
        .command-hero {
          position: relative;
          overflow: hidden;
          min-height: 236px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
          padding: clamp(24px, 4vw, 40px);
          border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
          border-radius: var(--radius-panel);
          background: var(--hero-gradient);
          box-shadow: var(--shadow-md);
          color: var(--hero-foreground);
        }
        .command-hero::after {
          content: '';
          position: absolute;
          inset: auto -80px -120px auto;
          width: 280px;
          height: 280px;
          border-radius: var(--radius-pill);
          background: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .command-hero-copy {
          position: relative;
          z-index: 1;
          min-width: 0;
          display: grid;
          gap: 12px;
        }
        .command-hero-copy > span {
          width: fit-content;
          border-radius: var(--radius-pill);
          padding: 6px 11px;
          background: color-mix(in srgb, var(--accent) 22%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
          color: var(--hero-foreground);
          font: 600 12px/1.4 var(--font-ui);
        }
        .command-hero h1 {
          margin: 0;
          color: var(--hero-foreground);
          font: 700 clamp(34px, 5vw, 56px)/1.16 var(--font-ui);
          letter-spacing: 0;
        }
        .command-hero p {
          max-width: 680px;
          margin: 0;
          color: var(--hero-foreground-muted);
          font: 400 clamp(15px, 1.7vw, 18px)/1.8 var(--font-ui);
        }
        .command-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 6px;
        }
        .command-hero-mark {
          position: relative;
          z-index: 1;
          width: clamp(112px, 14vw, 150px);
          height: clamp(112px, 14vw, 150px);
          display: grid;
          place-items: center;
          border-radius: var(--radius-panel);
          border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
          background: color-mix(in srgb, var(--surface) 12%, transparent);
          color: var(--hero-foreground);
          box-shadow: var(--shadow-sm);
        }
        .command-hero-spark {
          position: absolute;
          inset-block-start: 22px;
          inset-inline-end: 24px;
          color: var(--accent);
        }
        .sfm-primary-link,
        .sfm-secondary-link,
        .command-action-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: var(--radius-pill);
          padding: 0 16px;
          text-decoration: none;
          font: 600 13px/1.25 var(--font-ui);
          white-space: nowrap;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .sfm-primary-link {
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--shadow-sm);
        }
        .sfm-secondary-link {
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 30%, transparent);
          background: color-mix(in srgb, var(--surface) 12%, transparent);
          color: var(--hero-foreground);
        }
        .sfm-primary-link:hover,
        .sfm-primary-link:focus-visible,
        .sfm-secondary-link:hover,
        .sfm-secondary-link:focus-visible,
        .command-action-link:hover,
        .command-action-link:focus-visible {
          transform: translateY(-1px);
          box-shadow: var(--focus-shadow);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .command-summary-grid {
          grid-template-columns: repeat(3, minmax(220px, 1fr)) !important;
          align-items: stretch;
          gap: 16px !important;
        }
        .command-summary-grid .sfm-app-card {
          min-height: 116px;
          display: grid;
          align-items: center;
        }
        .command-account-card {
          width: 100%;
        }
        .command-section {
          display: grid;
          gap: 16px;
          min-width: 0;
        }
        .command-section-head {
          display: grid;
          gap: 6px;
          min-width: 0;
        }
        .command-section-head h2 {
          margin: 0;
          color: var(--foreground);
          font: 600 clamp(24px, 3vw, 34px)/1.3 var(--font-ui);
        }
        .command-section-head p {
          margin: 0;
          max-width: 720px;
          color: var(--foreground-muted);
          font: 400 15px/1.7 var(--font-ui);
        }
        .command-action-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)) !important;
          align-items: stretch;
          gap: 16px !important;
        }
        .command-action-card {
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 16px;
          min-height: 230px;
          border-color: var(--border) !important;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .command-action-card:hover,
        .command-action-card:focus-within {
          transform: translateY(-2px);
          border-color: var(--accent) !important;
          box-shadow: var(--shadow-md);
        }
        .command-action-card.featured {
          background: var(--primary-soft) !important;
        }
        .command-action-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-card);
          background: var(--primary-soft);
          color: var(--primary);
          box-shadow: none;
        }
        .command-action-card.featured .command-action-icon {
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--shadow-sm);
        }
        .command-action-copy {
          display: grid;
          align-content: start;
          gap: 8px;
          min-width: 0;
        }
        .command-action-copy h3 {
          margin: 0;
          color: var(--foreground);
          font: 600 21px/1.3 var(--font-ui);
        }
        .command-action-copy p {
          margin: 0;
          color: var(--foreground-muted);
          font: 400 14px/1.7 var(--font-ui);
        }
        .command-action-link {
          justify-self: start;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--primary);
        }
        .command-lower-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr);
          gap: 16px;
          align-items: stretch;
          min-width: 0;
        }
        .command-priority-card,
        .command-quick-card {
          min-height: 210px;
          display: grid;
          gap: 16px;
          align-content: start;
        }
        .command-priority-head {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          min-width: 0;
        }
        .command-priority-head > span {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          flex: 0 0 48px;
          border-radius: var(--radius-card);
          background: var(--accent-soft);
          color: var(--primary);
        }
        .command-priority-head div {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .command-priority-head p {
          margin: 0;
          color: var(--primary);
          font: 600 12px/1.4 var(--font-ui);
        }
        .command-priority-head h2,
        .command-quick-card h2 {
          margin: 0;
          color: var(--foreground);
          font: 600 22px/1.35 var(--font-ui);
        }
        .command-priority-description {
          margin: 0;
          color: var(--foreground-muted);
          font: 400 14px/1.7 var(--font-ui);
        }
        .command-priority-card .sfm-primary-link {
          justify-self: start;
          align-self: end;
        }
        .command-quick-links {
          display: grid;
          gap: 9px;
        }
        .command-quick-links a {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 13px;
          border-radius: var(--radius-control);
          border: 1px solid var(--border);
          background: var(--surface-muted);
          color: var(--foreground);
          text-decoration: none;
          font: 500 13px/1.25 var(--font-ui);
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }
        .command-quick-links a:hover,
        .command-quick-links a:focus-visible {
          border-color: var(--accent);
          background: var(--surface-hover);
          transform: translateY(-1px);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .command-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .command-lower-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .command-center-content {
            gap: 18px;
          }
          .command-hero {
            min-height: 0;
            grid-template-columns: 1fr;
            padding: 22px;
            border-radius: var(--radius-panel);
          }
          .command-hero-mark {
            width: 86px;
            height: 86px;
            border-radius: var(--radius-panel);
            order: -1;
          }
          .command-hero-actions,
          .command-hero-actions a,
          .command-priority-card .sfm-primary-link,
          .command-action-link {
            width: 100%;
          }
          .command-summary-grid,
          .command-action-grid {
            grid-template-columns: 1fr !important;
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
          border-radius: var(--radius-control);
          background: var(--primary-soft);
          color: var(--primary);
        }
        .command-metric div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }
        .command-metric p,
        .command-metric em {
          margin: 0;
          color: var(--foreground-muted);
          font-style: normal;
          line-height: 1.45;
        }
        .command-metric p {
          font-size: 12px;
          font-weight: 500;
        }
        .command-metric strong {
          color: var(--foreground);
          font-size: 24px;
          font-family: var(--font-data);
          font-weight: 600;
          line-height: 1.1;
        }
        .command-metric em {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
