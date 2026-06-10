'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  HandHeart,
  LayoutDashboard,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
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
type DailyPriority = 'urgent' | 'high' | 'medium' | 'low';

type DailyItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  source: string;
  priority: DailyPriority;
  dueDate?: string | null;
  actionLabel: string;
  kind: 'task' | 'notification' | 'report' | 'reminder';
};

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
    subtitle: 'ملخص يومي ذكي للعناصر التي تحتاج إلى انتباهك اليوم من مهام، تقارير، إشعارات، وتنبيهات مالية.',
    eyebrow: 'موجز يومي',
    dailyQuestion: 'ما أهم إجراء أحتاج إلى القيام به اليوم؟',
    loading: 'جارٍ تحميل ما يهم اليوم...',
    viewAll: 'عرض الكل',
    tasksCenter: 'مركز المهام',
    dueToday: 'مستحق اليوم',
    highPriority: 'إشعارات عالية الأهمية',
    tasksNeedAction: 'مهام تحتاج إجراء',
    reportsReady: 'تقارير جاهزة',
    topAction: 'أهم إجراء اليوم',
    stableTitle: 'كل شيء مستقر اليوم',
    stableBody: 'لا توجد مهام عاجلة أو إشعارات عالية الأهمية. يمكنك مراجعة التقارير أو تحديث بياناتك المالية.',
    openReports: 'فتح التقارير',
    updateData: 'تحديث بياناتي',
    needsAction: 'يحتاج إجراء',
    importantAlerts: 'تنبيهات مهمة',
    followLater: 'للمتابعة لاحقاً',
    quickLinks: 'روابط سريعة',
    openTasks: 'فتح مركز المهام',
    openNotifications: 'فتح الإشعارات',
    openDashboard: 'لوحة القيادة',
    noSectionItems: 'لا توجد عناصر في هذا القسم.',
    noOpenTasks: 'لا توجد مهام مفتوحة حالياً.',
    source: 'المصدر',
    due: 'الموعد',
    whyItMatters: 'لماذا يهم؟',
    handle: 'معالجة',
    open: 'فتح',
    view: 'عرض',
    viewReport: 'عرض التقرير',
    viewAllReports: 'عرض كل التقارير',
    priorityUrgent: 'عاجل',
    priorityHigh: 'مهم',
    priorityMedium: 'متوسط',
    priorityLow: 'منخفض',
    sourceTasks: 'المهام',
    sourceNotifications: 'الإشعارات',
    sourceReports: 'التقارير',
    sourceProjects: 'المشاريع',
    sourceIncome: 'الدخل',
    sourceExpenses: 'المصروفات',
    sourceZakat: 'الزكاة',
    sourceCharity: 'الخير',
  },
  en: {
    title: 'Financial Today',
    subtitle: 'A smart daily brief for the tasks, reports, notifications, and financial alerts that need attention today.',
    eyebrow: 'Daily brief',
    dailyQuestion: 'What should I handle today?',
    loading: 'Loading what matters today...',
    viewAll: 'View all',
    tasksCenter: 'Tasks Center',
    dueToday: 'Due Today',
    highPriority: 'High Priority Notifications',
    tasksNeedAction: 'Tasks Needing Action',
    reportsReady: 'Reports Ready',
    topAction: 'Top Action Today',
    stableTitle: 'Everything is stable today',
    stableBody: 'There are no urgent tasks or high-priority notifications. You can review reports or update your financial data.',
    openReports: 'Open Reports',
    updateData: 'Update My Data',
    needsAction: 'Needs Action',
    importantAlerts: 'Important Alerts',
    followLater: 'Follow Up Later',
    quickLinks: 'Quick Links',
    openTasks: 'Open Tasks Center',
    openNotifications: 'Open Notifications',
    openDashboard: 'Dashboard',
    noSectionItems: 'No items in this section.',
    noOpenTasks: 'No open tasks right now.',
    source: 'Source',
    due: 'Due',
    whyItMatters: 'Why it matters',
    handle: 'Handle',
    open: 'Open',
    view: 'View',
    viewReport: 'View report',
    viewAllReports: 'View all reports',
    priorityUrgent: 'Urgent',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    sourceTasks: 'Tasks',
    sourceNotifications: 'Notifications',
    sourceReports: 'Reports',
    sourceProjects: 'Projects',
    sourceIncome: 'Income',
    sourceExpenses: 'Expenses',
    sourceZakat: 'Zakat',
    sourceCharity: 'Charity',
  },
  fr: {
    title: 'Aujourd’hui financier',
    subtitle: 'Un brief quotidien intelligent pour les tâches, rapports, notifications et alertes financières à traiter aujourd’hui.',
    eyebrow: 'Brief quotidien',
    dailyQuestion: 'Que dois-je traiter aujourd’hui ?',
    loading: 'Chargement des éléments importants du jour...',
    viewAll: 'Tout afficher',
    tasksCenter: 'Centre des tâches',
    dueToday: 'À traiter aujourd’hui',
    highPriority: 'Notifications haute priorité',
    tasksNeedAction: 'Tâches à traiter',
    reportsReady: 'Rapports prêts',
    topAction: 'Action prioritaire du jour',
    stableTitle: 'Tout est stable aujourd’hui',
    stableBody: 'Il n’y a aucune tâche urgente ni notification haute priorité. Vous pouvez consulter les rapports ou mettre à jour vos données financières.',
    openReports: 'Ouvrir les rapports',
    updateData: 'Mettre à jour mes données',
    needsAction: 'Nécessite une action',
    importantAlerts: 'Alertes importantes',
    followLater: 'À suivre plus tard',
    quickLinks: 'Liens rapides',
    openTasks: 'Ouvrir le centre des tâches',
    openNotifications: 'Ouvrir les notifications',
    openDashboard: 'Tableau de bord',
    noSectionItems: 'Aucun élément dans cette section.',
    noOpenTasks: 'Aucune tâche ouverte pour le moment.',
    source: 'Source',
    due: 'Échéance',
    whyItMatters: 'Pourquoi c’est important',
    handle: 'Traiter',
    open: 'Ouvrir',
    view: 'Voir',
    viewReport: 'Voir le rapport',
    viewAllReports: 'Voir tous les rapports',
    priorityUrgent: 'Urgent',
    priorityHigh: 'Élevé',
    priorityMedium: 'Moyen',
    priorityLow: 'Faible',
    sourceTasks: 'Tâches',
    sourceNotifications: 'Notifications',
    sourceReports: 'Rapports',
    sourceProjects: 'Projets',
    sourceIncome: 'Revenus',
    sourceExpenses: 'Dépenses',
    sourceZakat: 'Zakat',
    sourceCharity: 'Charité',
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

function isOpenTask(task: SmartTask) {
  return task.status === 'open';
}

function isDueOrLate(value: string | null | undefined, todayKey: string) {
  const key = toDateKey(value);
  return Boolean(key && key <= todayKey);
}

function priorityRank(priority: DailyPriority) {
  return {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  }[priority];
}

function uniqueItems(items: DailyItem[]) {
  return Array.from(new Map(items.map(item => [`${item.kind}:${item.id}`, item])).values());
}

function sortDailyItems(items: DailyItem[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return toDateKey(a.dueDate).localeCompare(toDateKey(b.dueDate));
  });
}

function notificationPriority(notice: SmartNotification): DailyPriority {
  if (notice.severity === 'danger') return 'urgent';
  if (notice.severity === 'warning') return 'high';
  if (notice.severity === 'success') return 'low';
  return 'medium';
}

function taskPriority(task: SmartTask): DailyPriority {
  if (task.priority === 'urgent') return 'urgent';
  if (task.priority === 'high') return 'high';
  if (task.priority === 'medium') return 'medium';
  return 'low';
}

function sourceLabel(source: string | undefined, type: string | undefined, text: typeof TEXT.ar) {
  const value = `${source ?? ''} ${type ?? ''}`.toLowerCase();
  if (value.includes('report')) return text.sourceReports;
  if (value.includes('project') || value.includes('model') || value.includes('feasibility')) return text.sourceProjects;
  if (value.includes('income')) return text.sourceIncome;
  if (value.includes('expense')) return text.sourceExpenses;
  if (value.includes('zakat')) return text.sourceZakat;
  if (value.includes('charity')) return text.sourceCharity;
  if (value.includes('task')) return text.sourceTasks;
  return text.sourceNotifications;
}

function priorityLabel(priority: DailyPriority, text: typeof TEXT.ar) {
  if (priority === 'urgent') return text.priorityUrgent;
  if (priority === 'high') return text.priorityHigh;
  if (priority === 'medium') return text.priorityMedium;
  return text.priorityLow;
}

function taskToItem(task: SmartTask, text: typeof TEXT.ar): DailyItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    href: task.actionUrl || '/tasks',
    source: sourceLabel(task.sourceModule, 'task', text),
    priority: taskPriority(task),
    dueDate: task.dueDate ?? null,
    actionLabel: task.actionLabel || text.handle,
    kind: 'task',
  };
}

function notificationToItem(notice: SmartNotification, text: typeof TEXT.ar): DailyItem {
  const kind = notice.type === 'report' ? 'report' : isHigh(notice) ? 'notification' : 'reminder';
  return {
    id: notice.id,
    title: notice.title,
    description: notice.message,
    href: notice.actionUrl || '/notifications',
    source: sourceLabel(notice.sourceModule, notice.type, text),
    priority: notificationPriority(notice),
    dueDate: notice.dueDate,
    actionLabel: notice.type === 'report' ? text.viewReport : text.open,
    kind,
  };
}

export default function FinancialTodayPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'] as typeof TEXT.ar;
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const { tasks, loading: tasksLoading } = useSmartTasks();
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
  const dailyBrief = useMemo(() => {
    const openTasks = tasks.filter(isOpenTask);
    const dueTasks = openTasks.filter(task => isDueOrLate(task.dueDate, todayKey));
    const urgentTasks = openTasks.filter(task => task.priority === 'urgent' || task.priority === 'high' || isDueOrLate(task.dueDate, todayKey));
    const highPriorityNotices = notifications.filter(isHigh);
    const dueNotices = notifications.filter(notice => toDateKey(notice.dueDate) === todayKey);
    const dueOrLateNotices = notifications.filter(notice => isDueOrLate(notice.dueDate, todayKey));
    const reportsReady = notifications.filter(notice => notice.type === 'report' && notice.severity !== 'danger');
    const reminders = notifications.filter(notice => !isHigh(notice) && notice.type !== 'report' && !isDueOrLate(notice.dueDate, todayKey));

    const taskItems = urgentTasks.map(task => taskToItem(task, text));
    const alertItems = highPriorityNotices.map(notice => notificationToItem(notice, text));
    const dueNoticeItems = dueOrLateNotices
      .filter(notice => notice.type !== 'report')
      .map(notice => notificationToItem(notice, text));
    const reportItems = reportsReady.map(notice => notificationToItem(notice, text));
    const followLaterItems = reminders.map(notice => notificationToItem(notice, text));
    const actionItems = sortDailyItems(uniqueItems([...taskItems, ...dueNoticeItems])).slice(0, 3);
    const topAction = sortDailyItems(uniqueItems([...taskItems, ...alertItems.filter(item => isDueOrLate(item.dueDate, todayKey)), ...alertItems, ...dueNoticeItems]))[0] ?? null;

    return {
      dueTodayCount: dueTasks.length + dueNotices.length,
      highPriorityCount: highPriorityNotices.length,
      taskActionCount: urgentTasks.length,
      reportsReadyCount: reportsReady.length,
      actionItems,
      alertItems: sortDailyItems(alertItems).slice(0, 3),
      reportItems: sortDailyItems(reportItems).slice(0, 3),
      followLaterItems: sortDailyItems(followLaterItems).slice(0, 3),
      topAction,
      openTaskCount: openTasks.length,
    };
  }, [notifications, tasks, text, todayKey]);

  return (
    <div className="today-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} className="today-main" contentClassName="today-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <section className="today-hero" aria-labelledby="financial-today-title">
          <div className="today-hero-copy">
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'6px',borderRadius:'999px',padding:'6px 12px',background:'rgba(24,212,212,.14)',border:'1px solid rgba(167,243,240,.22)',color:'#A7F3F0',fontSize:'12px',fontWeight:950}}>
                <Sparkles size={13} aria-hidden="true" />{text.eyebrow}
              </span>
              <span style={{borderRadius:'999px',padding:'6px 12px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(167,243,240,.14)',color:'#C7DBF5',fontSize:'12px',fontWeight:900}} dir="ltr">
                {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale === 'fr' ? 'fr-FR' : 'en-US', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
              </span>
            </div>
            <h1 id="financial-today-title">{text.title}</h1>
            <p>{text.subtitle}</p>
            <div className="today-hero-actions">
              <Link className="sfm-secondary-link" href="/notifications" aria-label={text.viewAll}>{text.viewAll}</Link>
              <Link className="sfm-primary-link" href="/tasks" aria-label={text.tasksCenter}>{text.tasksCenter}</Link>
            </div>
          </div>
          <div className="today-hero-mark" aria-hidden="true">
            <CalendarDays size={48} />
            <Sparkles size={22} className="today-hero-spark" />
          </div>
        </section>

        {loading || tasksLoading ? (
          <EmptyState icon={<Loader2 className="spin" size={24} />} title={text.loading} />
        ) : (
          <>
            <StatGrid className="today-summary-grid">
              <AppCard><TodayMetric label={text.dueToday} value={`${dailyBrief.dueTodayCount}`} icon={<ClockIcon />} tone="blue" /></AppCard>
              <AppCard><TodayMetric label={text.highPriority} value={`${dailyBrief.highPriorityCount}`} icon={<AlertTriangle size={20} />} tone={dailyBrief.highPriorityCount > 0 ? 'danger' : 'blue'} /></AppCard>
              <AppCard><TodayMetric label={text.tasksNeedAction} value={`${dailyBrief.taskActionCount}`} icon={<ClipboardList size={20} />} tone={dailyBrief.taskActionCount > 0 ? 'warning' : 'blue'} /></AppCard>
              <AppCard><TodayMetric label={text.reportsReady} value={`${dailyBrief.reportsReadyCount}`} icon={<FileText size={20} />} tone="teal" /></AppCard>
            </StatGrid>

            <FeaturedAction item={dailyBrief.topAction} text={text} locale={locale} />

            <section className="today-lanes" aria-label={text.dailyQuestion}>
              <PriorityLane
                title={text.needsAction}
                count={dailyBrief.actionItems.length}
                icon={<ClipboardList size={20} />}
                items={dailyBrief.actionItems}
                empty={dailyBrief.openTaskCount > 0 ? text.noSectionItems : text.noOpenTasks}
                locale={locale}
                text={text}
                accent="warning"
              />
              <PriorityLane
                title={text.importantAlerts}
                count={dailyBrief.alertItems.length}
                icon={<Bell size={20} />}
                items={dailyBrief.alertItems}
                empty={text.noSectionItems}
                locale={locale}
                text={text}
                accent="danger"
              />
              <PriorityLane
                title={text.reportsReady}
                count={dailyBrief.reportItems.length}
                icon={<FileText size={20} />}
                items={dailyBrief.reportItems}
                empty={text.noSectionItems}
                locale={locale}
                text={text}
                footerHref="/reports-center"
                footerLabel={text.viewAllReports}
                accent="teal"
              />
              <PriorityLane
                title={text.followLater}
                count={dailyBrief.followLaterItems.length}
                icon={<HandHeart size={20} />}
                items={dailyBrief.followLaterItems}
                empty={text.noSectionItems}
                locale={locale}
                text={text}
                accent="blue"
              />
            </section>

            <nav className="today-quick-links" aria-label={text.quickLinks}>
              <span>{text.quickLinks}</span>
              <Link href="/tasks"><ClipboardList size={16} aria-hidden="true" />{text.openTasks}</Link>
              <Link href="/reports-center"><FileText size={16} aria-hidden="true" />{text.openReports}</Link>
              <Link href="/notifications"><Bell size={16} aria-hidden="true" />{text.openNotifications}</Link>
              <Link href="/dashboard"><LayoutDashboard size={16} aria-hidden="true" />{text.openDashboard}</Link>
            </nav>
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
        .dark .today-shell {
          background:
            radial-gradient(circle at 18% 12%, rgba(24, 212, 212, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #061B33 62%, #031225 100%);
        }
        .today-main {
          width: calc(100% - var(--sidebar-w, 230px)) !important;
          max-width: none !important;
          margin-inline-start: var(--sidebar-w, 230px) !important;
          margin-inline-end: 0 !important;
          padding-inline: 24px !important;
        }
        .today-content {
          width: 100%;
          max-width: 1180px;
          margin-inline: auto;
          display: grid;
          gap: 24px;
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .today-hero {
          position: relative;
          overflow: hidden;
          min-height: 230px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
          padding: clamp(24px, 4vw, 40px);
          border: 1px solid rgba(167, 243, 240, .18);
          border-radius: 28px;
          background:
            radial-gradient(circle at 18% 18%, rgba(24, 212, 212, .20), transparent 30%),
            linear-gradient(135deg, #031225 0%, #061B33 52%, #0B3A66 100%);
          box-shadow: 0 24px 60px rgba(3, 18, 37, .18);
          color: #EAF6FF;
        }
        .today-hero::after {
          content: '';
          position: absolute;
          inset: auto -80px -120px auto;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          background: rgba(24, 212, 212, .12);
          filter: blur(8px);
        }
        .today-hero-copy {
          position: relative;
          z-index: 1;
          min-width: 0;
          display: grid;
          gap: 12px;
        }
        .today-hero-copy > span {
          width: fit-content;
          border-radius: 999px;
          padding: 6px 11px;
          background: rgba(24, 212, 212, .14);
          border: 1px solid rgba(167, 243, 240, .22);
          color: #A7F3F0;
          font: 950 12px Tajawal, Arial, sans-serif;
        }
        .today-hero h1 {
          margin: 0;
          color: #FFFFFF;
          font: 950 clamp(34px, 5vw, 56px)/1.05 Tajawal, Arial, sans-serif;
          letter-spacing: 0;
        }
        .today-hero p {
          max-width: 720px;
          margin: 0;
          color: #C7DBF5;
          font: 800 clamp(15px, 1.7vw, 18px)/1.8 Tajawal, Arial, sans-serif;
        }
        .today-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 6px;
        }
        .today-hero-mark {
          position: relative;
          z-index: 1;
          width: clamp(112px, 14vw, 150px);
          height: clamp(112px, 14vw, 150px);
          display: grid;
          place-items: center;
          border-radius: 32px;
          border: 1px solid rgba(167, 243, 240, .22);
          background: rgba(255, 255, 255, .08);
          color: #A7F3F0;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12), 0 20px 44px rgba(0, 0, 0, .16);
        }
        .today-hero-spark {
          position: absolute;
          inset-block-start: 22px;
          inset-inline-end: 24px;
          color: #18D4D4;
        }
        .sfm-primary-link,
        .sfm-secondary-link {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          padding: 0 16px;
          text-decoration: none;
          font: 950 13px Tajawal, Arial, sans-serif;
          white-space: nowrap;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .sfm-primary-link {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .22);
        }
        .sfm-secondary-link {
          border: 1px solid rgba(167, 243, 240, .24);
          background: rgba(255, 255, 255, .10);
          color: #EAF6FF;
        }
        .sfm-primary-link:hover,
        .sfm-primary-link:focus-visible,
        .sfm-secondary-link:hover,
        .sfm-secondary-link:focus-visible {
          transform: translateY(-1px);
          box-shadow: 0 0 0 4px rgba(24, 212, 212, .12), 0 16px 28px rgba(29, 140, 255, .16);
          outline: none;
        }
        .today-summary-grid {
          grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
          align-items: stretch;
          gap: 16px !important;
        }
        .today-summary-grid .sfm-app-card {
          min-height: 112px;
          display: grid;
          align-items: center;
        }
        .today-lanes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          min-width: 0;
        }
        .today-quick-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 20px;
          background: var(--sfm-card);
          box-shadow: 0 12px 28px rgba(3, 18, 37, .06);
        }
        .today-quick-links > span {
          color: var(--sfm-muted);
          font: 950 12px Tajawal, Arial, sans-serif;
          padding-inline: 4px;
        }
        .today-quick-links a {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .16);
          background: rgba(29, 140, 255, .06);
          color: var(--sfm-foreground);
          padding: 0 12px;
          text-decoration: none;
          font: 900 12px Tajawal, Arial, sans-serif;
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }
        .today-quick-links a:hover,
        .today-quick-links a:focus-visible {
          border-color: rgba(24, 212, 212, .34);
          background: rgba(24, 212, 212, .10);
          transform: translateY(-1px);
          outline: none;
        }
        .dark .today-summary-grid .sfm-app-card,
        .dark .today-quick-links {
          border-color: rgba(167, 243, 240, .16) !important;
        }
        .dark .today-quick-links a {
          background: rgba(15, 51, 92, .72);
          border-color: rgba(167, 243, 240, .16);
          color: #EAF6FF;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1100px) {
          .today-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 1024px) {
          .today-main {
            width: 100% !important;
            margin-inline: 0 !important;
            padding-inline: 16px !important;
          }
          .today-lanes {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .today-content {
            gap: 18px;
          }
          .today-hero {
            min-height: 0;
            grid-template-columns: 1fr;
            padding: 22px;
            border-radius: 22px;
          }
          .today-hero-mark {
            width: 86px;
            height: 86px;
            border-radius: 24px;
            order: -1;
          }
          .today-hero-actions,
          .today-hero-actions a,
          .today-summary-grid,
          .today-quick-links a {
            width: 100%;
          }
          .today-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function ClockIcon() {
  return <CalendarDays size={20} />;
}

function TodayMetric({ label, value, icon, tone = 'blue' }: { label: string; value: string; icon: ReactNode; tone?: 'blue' | 'teal' | 'danger' | 'warning' }) {
  const toneMap = {
    blue:    { bg: 'rgba(29,140,255,.12)',   color: '#1D8CE0', valColor: 'var(--sfm-foreground)' },
    teal:    { bg: 'rgba(24,212,212,.12)',   color: '#0f766e', valColor: 'var(--sfm-foreground)' },
    danger:  { bg: 'rgba(239,68,68,.10)',    color: '#B91C1C', valColor: '#B91C1C' },
    warning: { bg: 'rgba(245,158,11,.10)',   color: '#B45309', valColor: '#B45309' },
  };
  const t = toneMap[tone];
  return (
    <div style={{display:'flex',alignItems:'center',gap:'14px',minWidth:0,padding:'4px 0'}}>
      <span aria-hidden="true" style={{width:'46px',height:'46px',display:'grid',placeItems:'center',flex:'0 0 46px',borderRadius:'16px',background:t.bg,color:t.color,boxShadow:`0 4px 14px ${t.bg}`}}>
        {icon}
      </span>
      <div style={{minWidth:0,display:'grid',gap:'4px'}}>
        <p style={{margin:0,color:'var(--sfm-muted)',fontSize:'12px',fontWeight:900,lineHeight:1.45}}>{label}</p>
        <strong style={{color:t.valColor,fontSize:'26px',fontWeight:950,lineHeight:1.05,fontVariantNumeric:'tabular-nums'}}>{value}</strong>
      </div>
    </div>
  );
}

function FeaturedAction({ item, text, locale }: { item: DailyItem | null; text: typeof TEXT.ar; locale: Lang }) {
  return (
    <AppCard className={`today-featured-action ${item ? 'attention' : 'stable'}`.trim()} tone="dark">
      <div className="today-featured-copy">
        <span className="today-featured-eyebrow">{text.dailyQuestion}</span>
        <h2>{item?.title ?? text.stableTitle}</h2>
        <p>{item?.description || text.stableBody}</p>
        {item ? (
          <div className="today-featured-meta">
            <span>{text.source}: {item.source}</span>
            <span className={`priority ${item.priority}`}>{priorityLabel(item.priority, text)}</span>
            {item.dueDate ? <span>{text.due}: {formatDate(item.dueDate, locale)}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="today-featured-actions">
        {item ? (
          <Link className="sfm-primary-link" href={item.href} aria-label={`${item.actionLabel} ${item.title}`}>
            {item.actionLabel}
          </Link>
        ) : (
          <>
            <Link className="sfm-primary-link" href="/reports-center">{text.openReports}</Link>
            <Link className="sfm-secondary-link" href="/dashboard">{text.updateData}</Link>
          </>
        )}
      </div>
      <style jsx>{`
        :global(.today-featured-action) {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 18px;
          min-height: 220px;
          background:
            radial-gradient(circle at 12% 12%, rgba(24, 212, 212, .20), transparent 32%),
            linear-gradient(135deg, #031225 0%, #061B33 48%, #0B3A66 100%) !important;
        }
        :global(.today-featured-action.stable) {
          background:
            radial-gradient(circle at 12% 12%, rgba(16, 185, 129, .18), transparent 32%),
            linear-gradient(135deg, #031225 0%, #061B33 48%, #0B3A66 100%) !important;
        }
        :global(.today-featured-action)::after {
          content: '';
          position: absolute;
          inset: auto -90px -120px auto;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          background: rgba(24, 212, 212, .12);
        }
        .today-featured-copy,
        .today-featured-actions {
          position: relative;
          z-index: 1;
        }
        .today-featured-copy {
          min-width: 0;
          display: grid;
          gap: 10px;
        }
        .today-featured-eyebrow {
          width: fit-content;
          border-radius: 999px;
          padding: 6px 11px;
          border: 1px solid rgba(167, 243, 240, .22);
          background: rgba(24, 212, 212, .14);
          color: #A7F3F0;
          font-size: 12px;
          font-weight: 950;
        }
        h2 {
          margin: 0;
          color: #FFFFFF;
          font-size: clamp(26px, 3.8vw, 42px);
          line-height: 1.15;
        }
        p {
          max-width: 780px;
          margin: 0;
          color: #C7DBF5;
          font-weight: 800;
          line-height: 1.75;
        }
        .today-featured-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 4px;
        }
        .today-featured-meta span {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          border: 1px solid rgba(167, 243, 240, .18);
          background: rgba(255, 255, 255, .08);
          color: #EAF6FF;
          font-size: 12px;
          font-weight: 900;
        }
        .today-featured-meta .priority.urgent {
          border-color: rgba(239, 68, 68, .34);
          background: rgba(239, 68, 68, .16);
          color: #FCA5A5;
        }
        .today-featured-meta .priority.high {
          border-color: rgba(245, 158, 11, .34);
          background: rgba(245, 158, 11, .16);
          color: #FCD34D;
        }
        .today-featured-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }
        @media (max-width: 780px) {
          :global(.today-featured-action) {
            grid-template-columns: 1fr;
            min-height: 0;
          }
          .today-featured-actions,
          .today-featured-actions :global(a) {
            width: 100%;
          }
        }
      `}</style>
    </AppCard>
  );
}

function PriorityLane({
  title,
  count,
  icon,
  items,
  empty,
  locale,
  text,
  footerHref,
  footerLabel,
  accent = 'blue',
}: {
  title: string;
  count: number;
  icon: ReactNode;
  items: DailyItem[];
  empty: string;
  locale: Lang;
  text: typeof TEXT.ar;
  footerHref?: string;
  footerLabel?: string;
  accent?: 'blue' | 'teal' | 'danger' | 'warning';
}) {
  const accentMap = {
    blue:    { iconBg: 'rgba(29,140,255,.12)',  iconColor: '#1D8CE0', countBg: 'rgba(29,140,255,.1)',  countColor: '#1D8CE0', borderTop: 'rgba(29,140,255,.5)' },
    teal:    { iconBg: 'rgba(24,212,212,.12)',  iconColor: '#0f766e', countBg: 'rgba(24,212,212,.1)',  countColor: '#0f766e', borderTop: 'rgba(24,212,212,.6)' },
    danger:  { iconBg: 'rgba(239,68,68,.10)',   iconColor: '#B91C1C', countBg: 'rgba(239,68,68,.1)',   countColor: '#B91C1C', borderTop: 'rgba(239,68,68,.6)' },
    warning: { iconBg: 'rgba(245,158,11,.10)',  iconColor: '#B45309', countBg: 'rgba(245,158,11,.1)',  countColor: '#B45309', borderTop: 'rgba(245,158,11,.6)' },
  };
  const ac = accentMap[accent];
  return (
    <AppCard className="today-lane-card" style={{ borderTopColor: ac.borderTop, borderTopWidth: '3px' } as React.CSSProperties}>
      <header className="today-lane-head">
        <span aria-hidden="true" style={{ background: ac.iconBg, color: ac.iconColor }}>{icon}</span>
        <div>
          <h2>{title}</h2>
          <small style={{ background: ac.countBg, color: ac.countColor }}>{count}</small>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="today-lane-empty">{empty}</p>
      ) : (
        <div className="today-lane-list">
          {items.map(item => (
            <Link key={`${item.kind}-${item.id}`} href={item.href} className="today-lane-item">
              <div className="today-lane-item-copy">
                <div className="today-lane-badges">
                  <span>{item.source}</span>
                  <span className={`priority ${item.priority}`}>{priorityLabel(item.priority, text)}</span>
                </div>
                <strong>{item.title}</strong>
                {item.description ? <p>{item.description}</p> : null}
                {item.dueDate ? <em>{formatDate(item.dueDate, locale)}</em> : null}
              </div>
              <span className="today-lane-action">
                {item.actionLabel}
                <ChevronRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}

      {footerHref && footerLabel ? (
        <Link className="today-lane-footer" href={footerHref}>
          {footerLabel}
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      ) : null}

      <style jsx>{`
        :global(.today-lane-card) {
          display: grid;
          align-content: start;
          gap: 14px;
          min-height: 0;
        }
        .today-lane-head {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }
        .today-lane-head > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          border-radius: 14px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .today-lane-head div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .today-lane-head h2 {
          margin: 0;
          color: var(--sfm-foreground);
          font-size: 19px;
          line-height: 1.35;
        }
        .today-lane-head small {
          min-width: 28px;
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(24, 212, 212, .12);
          color: var(--sfm-primary);
          font-weight: 950;
          font-size: 12px;
        }
        .today-lane-empty {
          margin: 0;
          border: 1px dashed rgba(29, 140, 255, .20);
          border-radius: 16px;
          background: rgba(29, 140, 255, .04);
          color: var(--sfm-muted);
          padding: 13px;
          font-weight: 850;
          line-height: 1.6;
        }
        .today-lane-list {
          display: grid;
          gap: 9px;
        }
        .today-lane-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          min-width: 0;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(29, 140, 255, .13);
          background: rgba(248, 251, 255, .78);
          color: var(--sfm-foreground);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .today-lane-item:hover,
        .today-lane-item:focus-visible {
          border-color: rgba(24, 212, 212, .36);
          background: rgba(24, 212, 212, .08);
          box-shadow: 0 14px 28px rgba(29, 140, 255, .10);
          transform: translateY(-1px);
          outline: none;
        }
        .today-lane-item-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .today-lane-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .today-lane-badges span {
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          padding: 4px 8px;
          background: rgba(29, 140, 255, .08);
          color: var(--sfm-primary);
          font-size: 11px;
          font-weight: 950;
        }
        .today-lane-badges .priority.urgent {
          background: rgba(239, 68, 68, .14);
          color: #DC2626;
        }
        .today-lane-badges .priority.high {
          background: rgba(245, 158, 11, .14);
          color: #B45309;
        }
        .today-lane-badges .priority.low {
          background: rgba(16, 185, 129, .12);
          color: #047857;
        }
        .today-lane-item strong,
        .today-lane-item p,
        .today-lane-item em {
          display: block;
          margin: 0;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .today-lane-item strong {
          color: var(--sfm-foreground);
          font-size: 14px;
          line-height: 1.45;
        }
        .today-lane-item p,
        .today-lane-item em {
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.55;
          font-style: normal;
          font-weight: 800;
        }
        .today-lane-action,
        .today-lane-footer {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }
        .today-lane-action {
          color: var(--sfm-primary);
          background: rgba(29, 140, 255, .08);
          border: 1px solid rgba(29, 140, 255, .22);
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 950;
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .today-lane-action:hover,
        .today-lane-action:focus-visible {
          background: rgba(29, 140, 255, .15);
          border-color: rgba(24, 212, 212, .38);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 140, 255, .14);
          outline: none;
        }
        .today-lane-footer {
          width: fit-content;
          min-height: 36px;
          padding: 0 16px;
          border: 1px solid rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .06);
          color: var(--sfm-primary);
          text-decoration: none;
          font-weight: 950;
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .today-lane-footer:hover,
        .today-lane-footer:focus-visible {
          background: rgba(29, 140, 255, .13);
          border-color: rgba(24, 212, 212, .38);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 140, 255, .14);
          outline: none;
        }
        :global(.dark) .today-lane-item {
          background: rgba(15, 51, 92, .72);
          border-color: rgba(167, 243, 240, .16);
        }
        :global(.dark) .today-lane-empty {
          background: rgba(15, 51, 92, .45);
          border-color: rgba(167, 243, 240, .16);
        }
        :global(.dark) .today-lane-action {
          background: rgba(29, 140, 255, .12);
          border-color: rgba(29, 140, 255, .26);
        }
        :global(.dark) .today-lane-action:hover {
          background: rgba(29, 140, 255, .22);
          border-color: rgba(24, 212, 212, .40);
        }
        :global(.dark) .today-lane-footer {
          background: rgba(29, 140, 255, .10);
          border-color: rgba(29, 140, 255, .26);
        }
        :global(.dark) .today-lane-footer:hover {
          background: rgba(29, 140, 255, .20);
          border-color: rgba(24, 212, 212, .40);
        }
        :global(.dark) .today-lane-badges .priority.urgent {
          color: #FCA5A5;
        }
        :global(.dark) .today-lane-badges .priority.high {
          color: #FCD34D;
        }
        :global(.dark) .today-lane-badges .priority.low {
          color: #86EFAC;
        }
        @media (max-width: 640px) {
          .today-lane-item {
            grid-template-columns: 1fr;
          }
          .today-lane-action {
            justify-self: start;
          }
        }
      `}</style>
    </AppCard>
  );
}
