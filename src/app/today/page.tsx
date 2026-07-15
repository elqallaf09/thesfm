'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { StatGrid } from '@/components/layout/LayoutPrimitives';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSmartTasks, type SmartTask } from '@/hooks/useSmartTasks';
import { formatDate } from '@/lib/formatDate';
import {
  prioritizeDailyWorkflow,
  resolveDailySourceStatus,
  type DailyWorkflowItem,
} from '@/lib/daily-workflow/prioritizeDailyItems';
import {
  generateSmartNotifications,
  type NotificationSourceData,
  type SmartNotification,
  type SmartNotificationSeverity,
} from '@/lib/notifications/generateNotifications';
import { summarizeReportReadiness } from '@/lib/reports/reportReadiness';

type Lang = 'ar' | 'en' | 'fr';
type DailyPriority = 'urgent' | 'high' | 'medium' | 'low';
type DailyItem = DailyWorkflowItem;

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

const TEXT = {
  ar: {
    title: 'مركز اليوم',
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
    stableTitle: 'لا توجد إجراءات عاجلة اليوم',
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
    urgentHighTasks: 'المهام العاجلة وعالية الأولوية',
    reportSummary: 'ملخص جاهزية التقارير',
    reportsNeedData: 'تحتاج بيانات',
    partialData: 'بعض المصادر غير متاحة. نعرض النتائج المؤكدة فقط.',
    failedData: 'تعذر تحميل المصادر اليومية. حاول مرة أخرى من مركز المهام.',
    unavailableData: 'المصادر اليومية غير متاحة حالياً. لم يتم عرض أرقام صفرية بديلة.',
    unauthorizedData: 'سجّل الدخول لعرض موجزك اليومي.',
    partialReports: 'افتح مركز التقارير لعرض الحالة الكاملة.',
    accountWarning: 'أكمل إعداد حسابك لتحسين دقة المهام والتنبيهات.',
    completeAccount: 'إكمال الحساب',
  },
  en: {
    title: 'Today Center',
    subtitle: 'A concise daily brief of the real tasks, notifications, and report status that need your attention.',
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
    stableTitle: 'No urgent actions today',
    stableBody: 'No urgent action was found in the sources that loaded successfully. You can review reports or update your financial data.',
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
    urgentHighTasks: 'Urgent and high-priority tasks',
    reportSummary: 'Report readiness summary',
    reportsNeedData: 'Need data',
    partialData: 'Some sources are unavailable. Only confirmed results are shown.',
    failedData: 'Daily sources could not be loaded. Try again from Tasks Center.',
    unavailableData: 'Daily sources are currently unavailable. Placeholder zeroes are not shown.',
    unauthorizedData: 'Sign in to view your daily brief.',
    partialReports: 'Open Reports Center for the complete status.',
    accountWarning: 'Complete your account setup to improve task and alert accuracy.',
    completeAccount: 'Complete account',
  },
  fr: {
    title: 'Centre du jour',
    subtitle: 'Un brief quotidien concis des tâches, notifications et rapports réels qui demandent votre attention.',
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
    stableTitle: 'Aucune action urgente aujourd’hui',
    stableBody: 'Aucune action urgente n’a été trouvée dans les sources chargées. Vous pouvez consulter les rapports ou mettre à jour vos données.',
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
    urgentHighTasks: 'Tâches urgentes et prioritaires',
    reportSummary: 'Résumé de préparation des rapports',
    reportsNeedData: 'Données requises',
    partialData: 'Certaines sources sont indisponibles. Seuls les résultats confirmés sont affichés.',
    failedData: 'Les sources quotidiennes n’ont pas pu être chargées. Réessayez depuis le Centre des tâches.',
    unavailableData: 'Les sources quotidiennes sont indisponibles. Aucun zéro fictif n’est affiché.',
    unauthorizedData: 'Connectez-vous pour afficher votre brief quotidien.',
    partialReports: 'Ouvrez le Centre des rapports pour l’état complet.',
    accountWarning: 'Complétez votre compte pour améliorer la précision des tâches et alertes.',
    completeAccount: 'Compléter le compte',
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
    sourceModule: task.sourceModule,
    sourceId: task.sourceId,
    priority: taskPriority(task),
    dueDate: task.dueDate ?? null,
    actionLabel: task.actionLabel || text.handle,
    kind: task.sourceModule === 'report' ? 'report' : 'task',
  };
}

function notificationToItem(notice: SmartNotification, text: typeof TEXT.ar): DailyItem {
  const kind = notice.type === 'report' ? 'report' : 'notification';
  return {
    id: notice.id,
    title: notice.title,
    description: notice.message,
    href: notice.actionUrl || '/notifications',
    source: sourceLabel(notice.sourceModule, notice.type, text),
    sourceModule: notice.sourceModule,
    sourceId: notice.sourceId,
    priority: notificationPriority(notice),
    dueDate: notice.dueDate,
    createdAt: notice.createdAt,
    actionLabel: notice.type === 'report' ? text.viewReport : text.open,
    kind,
    unread: notice.status === 'unread',
  };
}

export default function FinancialTodayPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const text = TEXT[(lang as Lang) || 'ar'] as typeof TEXT.ar;
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const { tasks, profile, records, errors, sourceDiagnostics, loading: tasksLoading } = useSmartTasks();

  const notifications = useMemo(() => {
    if (!user) return [];
    const dynamic = generateSmartNotifications(records as NotificationSourceData, locale);
    const merged = new Map<string, SmartNotification>();
    (records.notifications ?? []).map(row => normalizeStored(row as StoredNotificationRow))
      .forEach(notice => merged.set(`stored:${notice.id}`, notice));
    dynamic.forEach(notice => merged.set(`dynamic:${notice.id}`, notice));
    return Array.from(merged.values()).filter(notice => isActive(notice) && notice.status === 'unread');
  }, [locale, records, user]);

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const dailyBrief = useMemo(() => {
    const openTasks = tasks.filter(isOpenTask);
    const dueTasks = openTasks.filter(task => toDateKey(task.dueDate) === todayKey);
    const urgentTasks = openTasks.filter(task => task.priority === 'urgent' || task.priority === 'high');
    const highPriorityNotices = notifications.filter(isHigh);
    const items: DailyItem[] = [
      ...openTasks.map(task => taskToItem(task, text)),
      ...notifications.map(notice => notificationToItem(notice, text)),
    ];
    if (profile?.onboarding_completed === false) {
      items.push({
        id: 'account:completion',
        title: text.accountWarning,
        description: text.accountWarning,
        href: '/onboarding',
        source: text.sourceTasks,
        sourceModule: 'account',
        priority: 'high',
        actionLabel: text.completeAccount,
        kind: 'account',
      });
    }
    const prioritized = prioritizeDailyWorkflow(items);

    return {
      dueTodayCount: dueTasks.length,
      highPriorityCount: highPriorityNotices.length,
      taskActionCount: urgentTasks.length,
      urgentAndHighTasks: prioritized.urgentAndHighTasks,
      dueTodayItems: prioritized.dueToday,
      alertItems: prioritized.importantNotifications,
      topAction: prioritized.topAction,
      openTaskCount: openTasks.length,
    };
  }, [notifications, profile?.onboarding_completed, tasks, text, todayKey]);

  const reportSummary = useMemo(() => summarizeReportReadiness({
    income: records.income,
    expenses: records.expenses,
    savings: records.savings,
    goals: records.goals,
    investments: records.investments,
    projects: records.projects,
    feasibility: records.feasibilityStudies,
    financialModels: records.financialModels,
    tasks: records.projectTasks,
    milestones: records.projectMilestones,
    documents: records.projectDocuments,
    pitchDecks: records.pitchDecks,
    marketWatchlist: records.marketWatchlist,
    zakatCalculations: records.zakatCalculations,
    zakatAssets: records.zakatAssets,
    charityProjects: records.charityProjects,
    charityBeneficiaries: records.charityBeneficiaries,
  }, {
    income: errors.income,
    expenses: errors.expenses,
    savings: errors.savings,
    goals: errors.goals,
    investments: errors.investments,
    projects: errors.projects,
    feasibility: errors.feasibilityStudies,
    financialModels: errors.financialModels,
    tasks: errors.projectTasks,
    milestones: errors.projectMilestones,
    documents: errors.projectDocuments,
    pitchDecks: errors.pitchDecks,
    marketWatchlist: errors.marketWatchlist,
    zakatCalculations: errors.zakatCalculations,
    zakatAssets: errors.zakatAssets,
    charityProjects: errors.charityProjects,
    charityBeneficiaries: errors.charityBeneficiaries,
  }), [errors, records]);

  const dailySourceStatus = resolveDailySourceStatus({
    loading: tasksLoading,
    authenticated: Boolean(user),
    diagnostics: Object.values(sourceDiagnostics),
  });
  const hasSourceFailure = ['partial', 'failed', 'unavailable'].includes(dailySourceStatus);
  const sourceStatusMessage = dailySourceStatus === 'failed'
    ? text.failedData
    : dailySourceStatus === 'unavailable'
      ? text.unavailableData
      : dailySourceStatus === 'unauthorized'
        ? text.unauthorizedData
        : text.partialData;

  return (
    <div className="today-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} className="today-main" contentClassName="today-content">
        <section className="today-hero" aria-labelledby="financial-today-title">
          <div className="today-hero-copy">
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'6px',borderRadius:'var(--radius-pill)',padding:'6px 12px',background:'color-mix(in srgb, var(--hero-foreground) 12%, transparent)',border:'1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent)',color:'var(--hero-foreground)',fontSize:'12px',fontWeight:600}}>
                <Sparkles size={13} aria-hidden="true" />{text.eyebrow}
              </span>
              <span style={{borderRadius:'var(--radius-pill)',padding:'6px 12px',background:'color-mix(in srgb, var(--hero-foreground) 8%, transparent)',border:'1px solid color-mix(in srgb, var(--hero-foreground) 16%, transparent)',color:'var(--hero-foreground-muted)',fontSize:'12px',fontWeight:600}} dir="ltr">
                {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
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

        {tasksLoading ? (
          <EmptyState icon={<Loader2 className="spin" size={24} />} title={text.loading} />
        ) : (
          <>
            {hasSourceFailure ? <div className="today-partial-state" role="status">{sourceStatusMessage}</div> : null}
            <StatGrid className="today-summary-grid">
              <AppCard><TodayMetric label={text.dueToday} value={hasSourceFailure ? '—' : `${dailyBrief.dueTodayCount}`} icon={<ClockIcon />} tone="blue" /></AppCard>
              <AppCard><TodayMetric label={text.highPriority} value={hasSourceFailure ? '—' : `${dailyBrief.highPriorityCount}`} icon={<AlertTriangle size={20} />} tone={dailyBrief.highPriorityCount > 0 ? 'danger' : 'blue'} /></AppCard>
              <AppCard><TodayMetric label={text.tasksNeedAction} value={hasSourceFailure ? '—' : `${dailyBrief.taskActionCount}`} icon={<ClipboardList size={20} />} tone={dailyBrief.taskActionCount > 0 ? 'warning' : 'blue'} /></AppCard>
              <AppCard><TodayMetric label={text.reportsReady} value={`${reportSummary.ready}`} icon={<FileText size={20} />} tone="teal" /></AppCard>
            </StatGrid>

            <FeaturedAction item={dailyBrief.topAction} text={text} locale={locale} />

            {profile?.onboarding_completed === false && dailyBrief.topAction?.kind !== 'account' ? (
              <AppCard className="today-account-warning">
                <AlertTriangle size={20} aria-hidden="true" />
                <p>{text.accountWarning}</p>
                <Link className="sfm-primary-link" href="/onboarding">{text.completeAccount}</Link>
              </AppCard>
            ) : null}

            <section className="today-lanes" aria-label={text.dailyQuestion}>
              <PriorityLane
                title={text.urgentHighTasks}
                count={dailyBrief.urgentAndHighTasks.length}
                icon={<ClipboardList size={20} />}
                items={dailyBrief.urgentAndHighTasks}
                empty={dailyBrief.openTaskCount > 0 ? text.noSectionItems : text.noOpenTasks}
                locale={locale}
                text={text}
                footerHref="/tasks"
                footerLabel={text.openTasks}
                accent="warning"
              />
              <PriorityLane
                title={text.dueToday}
                count={dailyBrief.dueTodayItems.length}
                icon={<CalendarDays size={20} />}
                items={dailyBrief.dueTodayItems}
                empty={text.noSectionItems}
                locale={locale}
                text={text}
                accent="blue"
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
              <ReportReadinessSummary
                ready={reportSummary.ready}
                needsData={reportSummary.needsData}
                partial={reportSummary.unknown > 0 || reportSummary.failed > 0}
                text={text}
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
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
        }

        .today-main {
          width: 100% !important;
          max-width: none !important;
          margin-inline-start: 0 !important;
          margin-inline-end: 0 !important;
          padding-inline: 24px !important;
        }
        .today-content {
          width: 100%;
          max-width: none;
          margin-inline: 0;
          display: grid;
          gap: 24px;
        }
        .today-hero {
          position: relative;
          overflow: hidden;
          min-height: 176px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
          padding: clamp(20px, 3vw, 30px);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          border-radius: var(--radius-panel);
          background: var(--hero-gradient);
          box-shadow:var(--shadow-card);
          color: var(--hero-foreground);
        }
        .today-hero::after {
          content: '';
          position: absolute;
          inset: auto -80px -120px auto;
          width: 280px;
          height: 280px;
          border-radius:var(--radius-pill);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
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
          border-radius:var(--radius-pill);
          padding: 6px 11px;
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          color: var(--hero-foreground-muted);
          font:600 12px var(--font-ui);
        }
        .today-hero h1 {
          margin: 0;
          color: var(--hero-foreground);
          font:600 clamp(30px, 4vw, 42px)/1.1 var(--font-ui);
          letter-spacing: 0;
        }
        .today-hero p {
          max-width: 720px;
          margin: 0;
          color: var(--hero-foreground-muted);
          font:400 clamp(15px, 1.7vw, 18px)/1.8 var(--font-ui);
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
          width: clamp(92px, 10vw, 112px);
          height: clamp(92px, 10vw, 112px);
          display: grid;
          place-items: center;
          border-radius:var(--radius-panel);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
          color: var(--hero-foreground-muted);
          box-shadow:var(--shadow-card);
        }
        .today-hero-spark {
          position: absolute;
          inset-block-start: 22px;
          inset-inline-end: 24px;
          color: var(--info);
        }
        .sfm-primary-link,
        .sfm-secondary-link {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius:var(--radius-pill);
          padding: 0 16px;
          text-decoration: none;
          font:600 13px var(--font-ui);
          white-space: nowrap;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .sfm-primary-link {
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow:var(--shadow-card);
        }
        .sfm-secondary-link {
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
          color: var(--hero-foreground);
        }
        .sfm-primary-link:hover,
        .sfm-primary-link:focus-visible,
        .sfm-secondary-link:hover,
        .sfm-secondary-link:focus-visible {
          transform: translateY(-1px);
          box-shadow:var(--focus-shadow);
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
        .today-partial-state {
          border: 1px solid color-mix(in srgb, var(--warning) 32%, var(--border));
          border-radius: var(--radius-card);
          background: var(--warning-soft);
          color: var(--warning);
          padding: 12px 14px;
          font-weight: 600;
        }
        .today-account-warning {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border-color: color-mix(in srgb, var(--warning) 30%, var(--border)) !important;
        }
        .today-account-warning > p { margin: 0; color: var(--foreground); line-height: 1.6; }
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
          border: 1px solid color-mix(in srgb, var(--info) 14%, transparent);
          border-radius: var(--radius-card);
          background: var(--surface);
          box-shadow:var(--shadow-card);
        }
        .today-quick-links > span {
          color: var(--foreground-muted);
          font:600 12px var(--font-ui);
          padding-inline: 4px;
        }
        .today-quick-links a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius:var(--radius-pill);
          border: 1px solid color-mix(in srgb, var(--info) 16%, transparent);
          background: color-mix(in srgb, var(--info) 6%, transparent);
          color: var(--foreground);
          padding: 0 12px;
          text-decoration: none;
          font:600 12px var(--font-ui);
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }
        .today-quick-links a:hover,
        .today-quick-links a:focus-visible {
          border-color: color-mix(in srgb, var(--info) 34%, transparent);
          background: color-mix(in srgb, var(--info) 10%, transparent);
          transform: translateY(-1px);
          outline: none;
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
          .today-content {
            gap: 18px;
          }
          .today-hero {
            min-height: 0;
            grid-template-columns: 1fr;
            padding: 22px;
            border-radius: var(--radius-panel);
          }
          .today-hero-mark {
            width: 86px;
            height: 86px;
            border-radius: var(--radius-panel);
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
          .today-account-warning { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .today-shell *,
          .today-shell *::before,
          .today-shell *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
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
    blue:    { bg: 'color-mix(in srgb, var(--info) 12%, transparent)',   color: 'var(--info)', valColor: 'var(--foreground)' },
    teal:    { bg: 'color-mix(in srgb, var(--info) 12%, transparent)',   color: 'var(--accent)', valColor: 'var(--foreground)' },
    danger:  { bg: 'color-mix(in srgb, var(--danger) 10%, transparent)',    color: 'var(--danger)', valColor: 'var(--danger)' },
    warning: { bg: 'color-mix(in srgb, var(--warning) 10%, transparent)',   color: 'var(--danger)', valColor: 'var(--danger)' },
  };
  const t = toneMap[tone];
  return (
    <div style={{display:'flex',alignItems:'center',gap:'14px',minWidth:0,padding:'4px 0'}}>
      <span aria-hidden="true" style={{width:'46px',height:'46px',display:'grid',placeItems:'center',flex:'0 0 46px',borderRadius:'var(--radius-card)',background:t.bg,color:t.color,boxShadow:'var(--shadow-card)'}}>
        {icon}
      </span>
      <div style={{minWidth:0,display:'grid',gap:'4px'}}>
        <p style={{margin:0,color:'var(--foreground-muted)',fontSize:'12px',fontWeight:600,lineHeight:1.45}}>{label}</p>
        <strong style={{color:t.valColor,fontSize:'26px',fontWeight:600,lineHeight:1.05,fontFamily:'var(--font-data)',fontVariantNumeric:'tabular-nums'}}>{value}</strong>
      </div>
    </div>
  );
}

function ReportReadinessSummary({
  ready,
  needsData,
  partial,
  text,
}: {
  ready: number;
  needsData: number;
  partial: boolean;
  text: typeof TEXT.ar;
}) {
  return (
    <AppCard className="today-report-summary">
      <header>
        <span aria-hidden="true"><FileText size={20} /></span>
        <h2>{text.reportSummary}</h2>
      </header>
      <div className="today-report-counts">
        <div><strong>{ready}</strong><span>{text.reportsReady}</span></div>
        <div><strong>{needsData}</strong><span>{text.reportsNeedData}</span></div>
      </div>
      {partial ? <p role="status">{text.partialReports}</p> : null}
      <Link className="today-lane-footer" href="/reports-center">
        {text.viewAllReports}
        <ChevronRight size={15} aria-hidden="true" />
      </Link>
      <style jsx>{`
        :global(.today-report-summary) { display: grid; align-content: start; gap: 14px; }
        header { display: flex; align-items: center; gap: 10px; }
        header > span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: var(--radius-control); background: var(--primary-soft); color: var(--primary); }
        h2, p { margin: 0; }
        h2 { color: var(--foreground); font-size: 19px; }
        p { color: var(--foreground-muted); font-size: 13px; line-height: 1.6; }
        .today-report-counts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .today-report-counts div { display: grid; gap: 4px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface-muted); }
        .today-report-counts strong { color: var(--foreground); font: 600 24px/1 var(--font-data); }
        .today-report-counts span { color: var(--foreground-muted); font-size: 12px; font-weight: 600; }
        :global(.today-report-summary .today-lane-footer) { width: fit-content; min-height: 38px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border-strong); border-radius: var(--radius-pill); padding: 0 14px; background: var(--surface); color: var(--primary); text-decoration: none; font-size: 12px; font-weight: 600; }
        :global(.today-report-summary .today-lane-footer) { min-height: 44px; }
      `}</style>
    </AppCard>
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
            <Link className="sfm-secondary-link" href="/dashboard">{text.openDashboard}</Link>
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
          min-height: 164px;
          background: var(--hero-gradient) !important;
        }
        :global(.today-featured-action.stable) {
          background: var(--hero-gradient) !important;
        }
        :global(.today-featured-action)::after {
          content: '';
          position: absolute;
          inset: auto -90px -120px auto;
          width: 260px;
          height: 260px;
          border-radius:var(--radius-pill);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
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
          border-radius:var(--radius-pill);
          padding: 6px 11px;
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
          color: var(--hero-foreground-muted);
          font-size: 12px;
          font-weight:600;
        }
        h2 {
          margin: 0;
          color: var(--hero-foreground);
          font-size: clamp(26px, 3.8vw, 42px);
          line-height: 1.15;
        }
        p {
          max-width: 780px;
          margin: 0;
          color: var(--hero-foreground-muted);
          font-weight:400;
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
          border-radius:var(--radius-pill);
          padding: 0 10px;
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
          color: var(--hero-foreground-muted);
          font-size: 12px;
          font-weight:600;
        }
        .today-featured-meta .priority.urgent {
          border-color: color-mix(in srgb, var(--danger) 34%, transparent);
          background: color-mix(in srgb, var(--danger) 16%, transparent);
          color: var(--warning);
        }
        .today-featured-meta .priority.high {
          border-color: color-mix(in srgb, var(--warning) 34%, transparent);
          background: color-mix(in srgb, var(--warning) 16%, transparent);
          color: var(--warning);
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
    blue:    { iconBg: 'color-mix(in srgb, var(--info) 12%, transparent)',  iconColor: 'var(--info)', countBg: 'color-mix(in srgb, var(--info) 10%, transparent)',  countColor: 'var(--info)', borderTop: 'color-mix(in srgb, var(--info) 50%, transparent)' },
    teal:    { iconBg: 'color-mix(in srgb, var(--info) 12%, transparent)',  iconColor: 'var(--accent)', countBg: 'color-mix(in srgb, var(--info) 10%, transparent)',  countColor: 'var(--accent)', borderTop: 'color-mix(in srgb, var(--info) 60%, transparent)' },
    danger:  { iconBg: 'color-mix(in srgb, var(--danger) 10%, transparent)',   iconColor: 'var(--danger)', countBg: 'color-mix(in srgb, var(--danger) 10%, transparent)',   countColor: 'var(--danger)', borderTop: 'color-mix(in srgb, var(--danger) 60%, transparent)' },
    warning: { iconBg: 'color-mix(in srgb, var(--warning) 10%, transparent)',  iconColor: 'var(--danger)', countBg: 'color-mix(in srgb, var(--warning) 10%, transparent)',  countColor: 'var(--danger)', borderTop: 'color-mix(in srgb, var(--warning) 60%, transparent)' },
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
          border-radius: var(--radius-control);
          background: color-mix(in srgb, var(--info) 10%, transparent);
          color: var(--primary);
        }
        .today-lane-head div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .today-lane-head h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 19px;
          line-height: 1.35;
        }
        .today-lane-head small {
          min-width: 28px;
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius:var(--radius-pill);
          background: color-mix(in srgb, var(--info) 12%, transparent);
          color: var(--primary);
          font-weight:600;
          font-size: 12px;
        }
        .today-lane-empty {
          margin: 0;
          border: 1px dashed color-mix(in srgb, var(--info) 20%, transparent);
          border-radius: var(--radius-card);
          background: color-mix(in srgb, var(--info) 4%, transparent);
          color: var(--foreground-muted);
          padding: 13px;
          font-weight:600;
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
          border-radius: var(--radius-card);
          border: 1px solid color-mix(in srgb, var(--info) 13%, transparent);
          background: color-mix(in srgb, var(--surface) 78%, transparent);
          color: var(--foreground);
          text-decoration: none;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .today-lane-item:hover,
        .today-lane-item:focus-visible {
          border-color: color-mix(in srgb, var(--info) 36%, transparent);
          background: color-mix(in srgb, var(--info) 8%, transparent);
          box-shadow:var(--shadow-card);
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
          border-radius:var(--radius-pill);
          padding: 4px 8px;
          background: color-mix(in srgb, var(--info) 8%, transparent);
          color: var(--primary);
          font-size: 12px;
          font-weight:600;
        }
        .today-lane-badges .priority.urgent {
          background: color-mix(in srgb, var(--danger) 14%, transparent);
          color: var(--danger);
        }
        .today-lane-badges .priority.high {
          background: color-mix(in srgb, var(--warning) 14%, transparent);
          color: var(--danger);
        }
        .today-lane-badges .priority.low {
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--accent);
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
          color: var(--foreground);
          font-size: 14px;
          line-height: 1.45;
        }
        .today-lane-item p,
        .today-lane-item em {
          color: var(--foreground-muted);
          font-size: 12px;
          line-height: 1.55;
          font-style: normal;
          font-weight:600;
        }
        .today-lane-action,
        .today-lane-footer {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius:var(--radius-pill);
          font-size: 12px;
          font-weight:600;
          white-space: nowrap;
        }
        .today-lane-action {
          color: var(--primary);
          background: color-mix(in srgb, var(--info) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--info) 22%, transparent);
          min-height: 34px;
          padding: 0 14px;
          border-radius:var(--radius-pill);
          text-decoration: none;
          font-size: 12px;
          font-weight:600;
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .today-lane-action:hover,
        .today-lane-action:focus-visible {
          background: color-mix(in srgb, var(--info) 15%, transparent);
          border-color: color-mix(in srgb, var(--info) 38%, transparent);
          transform: translateY(-1px);
          box-shadow:var(--shadow-card);
          outline: none;
        }
        .today-lane-footer {
          width: fit-content;
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid color-mix(in srgb, var(--info) 22%, transparent);
          background: color-mix(in srgb, var(--info) 6%, transparent);
          color: var(--primary);
          text-decoration: none;
          font-weight:600;
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .today-lane-footer:hover,
        .today-lane-footer:focus-visible {
          background: color-mix(in srgb, var(--info) 13%, transparent);
          border-color: color-mix(in srgb, var(--info) 38%, transparent);
          transform: translateY(-1px);
          box-shadow:var(--shadow-card);
          outline: none;
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
