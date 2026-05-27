'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HandHeart,
  Loader2,
  ReceiptText,
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
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSmartTasks, type SmartTask } from '@/hooks/useSmartTasks';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { formatDate } from '@/lib/formatDate';
import {
  generateSmartNotifications,
  type NotificationSourceData,
  type SmartNotification,
  type SmartNotificationSeverity,
} from '@/lib/notifications/generateNotifications';

type Lang = 'ar' | 'en' | 'fr';
type SourceKey = keyof NotificationSourceData;

type StoredNotificationRow = {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean | null;
  link: string | null;
  created_at: string | null;
  severity?: string | null;
  source_module?: string | null;
  source_id?: string | null;
  action_url?: string | null;
  status?: string | null;
  due_date?: string | null;
};

const SOURCE_TABLES: Array<{ key: SourceKey; table: string }> = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'marketPriceAlerts', table: 'market_price_alerts' },
  { key: 'projects', table: 'projects' },
  { key: 'feasibilityStudies', table: 'project_feasibility_studies' },
  { key: 'financialModels', table: 'project_financial_models' },
  { key: 'projectTasks', table: 'project_tasks' },
  { key: 'projectMilestones', table: 'project_milestones' },
  { key: 'projectDocuments', table: 'project_documents' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityProjects', table: 'charity_projects' },
  { key: 'charityReminders', table: 'charity_reminders' },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries' },
  { key: 'charityContributors', table: 'charity_project_contributors' },
];

const TEXT = {
  ar: {
    title: 'اليوم المالي',
    subtitle: 'اعرض فقط ما يحتاج انتباهك اليوم من بياناتك الفعلية وتنبيهاتك المحفوظة.',
    eyebrow: 'تركيز يومي',
    loading: 'جارٍ تحميل ما يهم اليوم...',
    noActions: 'لا توجد إجراءات مهمة اليوم.',
    noActionsBody: 'كل شيء يبدو مستقراً حسب البيانات والتنبيهات المتاحة.',
    topAction: 'أهم إجراء اليوم',
    dueIncome: 'دخل مستحق',
    pendingExpenses: 'مصروفات تحتاج متابعة',
    projectTasks: 'مهام مشاريع متأخرة',
    zakatCharity: 'تذكيرات الزكاة والخير',
    reportsReady: 'تقارير جاهزة',
    highPriority: 'إشعارات عالية الأهمية',
    tasks: 'مهام تحتاج إجراء',
    noTasks: 'لا توجد مهام مهمة اليوم.',
    dueToday: 'مستحق اليوم',
    open: 'عرض',
    viewAll: 'عرض الكل',
  },
  en: {
    title: 'Financial Today',
    subtitle: 'See only what needs attention today from your real data and saved alerts.',
    eyebrow: 'Daily focus',
    loading: 'Loading what matters today...',
    noActions: 'No important actions today.',
    noActionsBody: 'Everything looks stable based on available data and alerts.',
    topAction: 'Top Action Today',
    dueIncome: 'Due income',
    pendingExpenses: 'Expenses to review',
    projectTasks: 'Overdue project tasks',
    zakatCharity: 'Zakat & charity reminders',
    reportsReady: 'Reports ready',
    highPriority: 'High priority notifications',
    tasks: 'Tasks needing action',
    noTasks: 'No important tasks today.',
    dueToday: 'Due today',
    open: 'View',
    viewAll: 'View all',
  },
  fr: {
    title: 'Aujourd’hui financier',
    subtitle: 'Voyez seulement ce qui demande votre attention aujourd’hui à partir de vos données réelles.',
    eyebrow: 'Priorité du jour',
    loading: 'Chargement des éléments importants du jour...',
    noActions: 'Aucune action importante aujourd’hui.',
    noActionsBody: 'Tout semble stable selon les données et alertes disponibles.',
    topAction: 'Action prioritaire du jour',
    dueIncome: 'Revenu dû',
    pendingExpenses: 'Dépenses à vérifier',
    projectTasks: 'Tâches projet en retard',
    zakatCharity: 'Rappels zakat et charité',
    reportsReady: 'Rapports prêts',
    highPriority: 'Notifications haute priorité',
    tasks: 'Tâches nécessitant une action',
    noTasks: 'Aucune tâche importante aujourd’hui.',
    dueToday: 'À échéance aujourd’hui',
    open: 'Voir',
    viewAll: 'Tout afficher',
  },
} as const;

function normalizeSeverity(value: unknown): SmartNotificationSeverity {
  return value === 'danger' || value === 'warning' || value === 'success' ? value : 'info';
}

function normalizeStored(row: StoredNotificationRow): SmartNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message ?? '',
    type: (row.type as SmartNotification['type']) || 'general',
    severity: normalizeSeverity(row.severity ?? row.type),
    sourceModule: row.source_module ?? 'notifications',
    sourceId: row.source_id ?? row.id,
    actionUrl: row.action_url ?? row.link ?? '/notifications',
    status: row.status === 'archived' ? 'archived' : row.status === 'read' || row.read ? 'read' : 'unread',
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    isDynamic: false,
  };
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateKey(value?: string | null) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return formatLocalDateKey(date);
}

function isActive(notice: SmartNotification) {
  return notice.status !== 'archived';
}

function isHigh(notice: SmartNotification) {
  return notice.severity === 'danger' || notice.severity === 'warning';
}

export default function FinancialTodayPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'];
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const { tasks } = useSmartTasks();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = supabase as any;
      const sourceResult = await loadUserDataTables(db, user.id, SOURCE_TABLES);
      let stored: StoredNotificationRow[] = [];

      try {
        const { data, error } = await db
          .from('notifications')
          .select('id,type,title,message,read,link,created_at,severity,source_module,source_id,action_url,status,due_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error) stored = data ?? [];
      } catch {
        stored = [];
      }

      const notificationRecords = {
        ...sourceResult.records,
        income: personalIncomeRows(sourceResult.records.income ?? []),
        expenses: personalExpenseRows(sourceResult.records.expenses ?? []),
      } as NotificationSourceData;
      const dynamic = generateSmartNotifications(notificationRecords, lang as Lang);
      const merged = new Map<string, SmartNotification>();
      stored.map(normalizeStored).forEach(notice => merged.set(`stored:${notice.id}`, notice));
      dynamic.forEach(notice => merged.set(`dynamic:${notice.id}`, notice));

      if (!cancelled) {
        setNotifications(Array.from(merged.values()).filter(isActive));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang, user]);

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const groups = useMemo(() => {
    const dueOrLate = (notice: SmartNotification) => notice.dueDate && toDateKey(notice.dueDate) <= todayKey;
    const dueToday = notifications.filter(notice => toDateKey(notice.dueDate) === todayKey);
    const highPriority = notifications.filter(isHigh);
    const dueIncome = notifications.filter(notice => notice.type === 'income' && dueOrLate(notice));
    const pendingExpenses = notifications.filter(notice => notice.type === 'expense' && isHigh(notice));
    const projectTasks = notifications.filter(notice => (notice.type === 'task' || notice.type === 'project') && dueOrLate(notice));
    const zakatCharity = notifications.filter(notice => (notice.type === 'zakat' || notice.type === 'charity') && dueOrLate(notice));
    const reportsReady = notifications.filter(notice => notice.type === 'report' && notice.severity !== 'danger');
    const topAction = [...highPriority.filter(dueOrLate), ...highPriority, ...dueToday][0] ?? null;

    return {
      dueToday,
      highPriority,
      dueIncome,
      pendingExpenses,
      projectTasks,
      zakatCharity,
      reportsReady,
      topAction,
    };
  }, [notifications, todayKey]);
  const taskFocus = useMemo(() => tasks.filter(task => task.status === 'open' && (task.priority === 'urgent' || (task.dueDate && toDateKey(task.dueDate) <= todayKey))).slice(0, 5), [tasks, todayKey]);

  const hasAnyAction = Boolean(
    groups.topAction
      || taskFocus.length
      || groups.dueIncome.length
      || groups.pendingExpenses.length
      || groups.projectTasks.length
      || groups.zakatCharity.length
      || groups.reportsReady.length
      || groups.highPriority.length
  );

  return (
    <div className="today-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="today-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<CalendarDays size={28} />}
          actions={(
            <>
              <Link className="sfm-secondary-link" href="/tasks">{text.tasks}</Link>
              <Link className="sfm-primary-link" href="/notifications">{text.viewAll}</Link>
            </>
          )}
        />

        {loading ? (
          <EmptyState icon={<Loader2 className="spin" size={24} />} title={text.loading} />
        ) : !hasAnyAction ? (
          <EmptyState
            icon={<CheckCircle2 size={28} />}
            title={text.noActions}
            description={text.noActionsBody}
          />
        ) : (
          <>
            <StatGrid>
              <AppCard><TodayMetric label={text.dueToday} value={`${groups.dueToday.length}`} icon={<Clock3 size={20} />} /></AppCard>
              <AppCard><TodayMetric label={text.highPriority} value={`${groups.highPriority.length}`} icon={<AlertTriangle size={20} />} /></AppCard>
              <AppCard><TodayMetric label={text.tasks} value={`${taskFocus.length}`} icon={<ClipboardList size={20} />} /></AppCard>
              <AppCard><TodayMetric label={text.reportsReady} value={`${groups.reportsReady.length}`} icon={<FileText size={20} />} /></AppCard>
            </StatGrid>

            {groups.topAction ? (
              <AppCard className="today-top-action" tone="dark">
                <div>
                  <span>{text.topAction}</span>
                  <h2>{groups.topAction.title}</h2>
                  <p>{groups.topAction.message}</p>
                  {groups.topAction.dueDate ? <em>{formatDate(groups.topAction.dueDate, locale)}</em> : null}
                </div>
                <Link className="sfm-primary-link" href={groups.topAction.actionUrl}>{text.open}</Link>
              </AppCard>
            ) : null}

            <CardsGrid>
              <TodayTaskSection title={text.tasks} icon={<ClipboardList size={20} />} items={taskFocus} empty={text.noTasks} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.dueIncome} icon={<Wallet size={20} />} items={groups.dueIncome} empty={text.noActions} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.pendingExpenses} icon={<ReceiptText size={20} />} items={groups.pendingExpenses} empty={text.noActions} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.projectTasks} icon={<BriefcaseIcon />} items={groups.projectTasks} empty={text.noActions} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.zakatCharity} icon={<HandHeart size={20} />} items={groups.zakatCharity} empty={text.noActions} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.reportsReady} icon={<FileText size={20} />} items={groups.reportsReady} empty={text.noActions} actionLabel={text.open} locale={locale} />
              <TodaySection title={text.highPriority} icon={<Bell size={20} />} items={groups.highPriority} empty={text.noActions} actionLabel={text.open} locale={locale} />
            </CardsGrid>
          </>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .today-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .today-content {
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
        .today-top-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .today-top-action div {
          min-width: 0;
        }
        .today-top-action span {
          color: var(--sfm-soft-cyan);
          font-size: 12px;
          font-weight: 950;
        }
        .today-top-action h2 {
          margin: 6px 0;
          color: #FFFFFF;
        }
        .today-top-action p,
        .today-top-action em {
          margin: 0;
          color: rgba(234, 246, 255, .72);
          line-height: 1.65;
          font-style: normal;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .today-top-action {
            display: grid;
          }
          .today-top-action .sfm-primary-link {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function BriefcaseIcon() {
  return <CalendarDays size={20} />;
}

function TodayMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="today-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <style jsx>{`
        .today-metric {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .today-metric > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 14px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .today-metric p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
        }
        .today-metric strong {
          color: var(--sfm-primary-dark);
          font-size: 24px;
          line-height: 1.1;
        }
      `}</style>
    </div>
  );
}

function TodayTaskSection({
  title,
  icon,
  items,
  empty,
  actionLabel,
  locale,
}: {
  title: string;
  icon: ReactNode;
  items: SmartTask[];
  empty: string;
  actionLabel: string;
  locale: Lang;
}) {
  return (
    <AppCard className="today-section-card">
      <header>
        <span aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="today-section-empty">{empty}</p>
      ) : (
        <div className="today-section-list">
          {items.map(item => (
            <Link key={item.id} href={item.actionUrl || '/tasks'}>
              <div>
                <strong>{item.title}</strong>
                {item.description ? <p>{item.description}</p> : null}
                {item.dueDate ? <em>{formatDate(item.dueDate, locale)}</em> : null}
              </div>
              <span>{actionLabel}</span>
            </Link>
          ))}
        </div>
      )}
      <style jsx>{`
        :global(.today-section-card) {
          display: grid;
          gap: 14px;
        }
        header {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        header span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 38px;
          border-radius: 13px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        header h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 18px;
          min-width: 0;
        }
        .today-section-empty {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.65;
        }
        .today-section-list {
          display: grid;
          gap: 8px;
        }
        .today-section-list a {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: #F8FBFF;
          color: var(--sfm-foreground);
          text-decoration: none;
        }
        .today-section-list strong,
        .today-section-list p,
        .today-section-list em {
          display: block;
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .today-section-list strong {
          color: var(--sfm-primary-dark);
          font-size: 13px;
        }
        .today-section-list p,
        .today-section-list em {
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.5;
          font-style: normal;
        }
        .today-section-list a > span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        @media (max-width: 640px) {
          .today-section-list a {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppCard>
  );
}

function TodaySection({
  title,
  icon,
  items,
  empty,
  actionLabel,
  locale,
}: {
  title: string;
  icon: ReactNode;
  items: SmartNotification[];
  empty: string;
  actionLabel: string;
  locale: Lang;
}) {
  const visible = items.slice(0, 5);
  return (
    <AppCard className="today-section-card">
      <header>
        <span aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </header>
      {visible.length === 0 ? (
        <p className="today-section-empty">{empty}</p>
      ) : (
        <div className="today-section-list">
          {visible.map(item => (
            <Link key={`${item.id}-${item.sourceModule}`} href={item.actionUrl}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                {item.dueDate ? <em>{formatDate(item.dueDate, locale)}</em> : null}
              </div>
              <span>{actionLabel}</span>
            </Link>
          ))}
        </div>
      )}
      <style jsx>{`
        :global(.today-section-card) {
          display: grid;
          gap: 14px;
        }
        header {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        header span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 38px;
          border-radius: 13px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        header h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 18px;
          min-width: 0;
        }
        .today-section-empty {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.65;
        }
        .today-section-list {
          display: grid;
          gap: 8px;
        }
        .today-section-list a {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: #F8FBFF;
          color: var(--sfm-foreground);
          text-decoration: none;
        }
        .today-section-list strong,
        .today-section-list p,
        .today-section-list em {
          display: block;
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .today-section-list strong {
          color: var(--sfm-primary-dark);
          font-size: 13px;
        }
        .today-section-list p,
        .today-section-list em {
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.5;
          font-style: normal;
        }
        .today-section-list a > span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        @media (max-width: 640px) {
          .today-section-list a {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppCard>
  );
}
