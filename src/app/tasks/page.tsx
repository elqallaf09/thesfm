'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  Eye,
  FileText,
  HandHeart,
  Landmark,
  Loader2,
  Search,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useSmartTasks, type SmartTask, type SmartTaskSourceDiagnostic, type SmartTaskSourceId } from '@/hooks/useSmartTasks';
import { compareSmartTasks, isTaskDueThisWeek } from '@/lib/tasks/generateSmartTasks';
import { formatDate } from '@/lib/formatDate';

type Lang = 'ar' | 'en' | 'fr';
type FilterId = 'all' | 'urgent' | 'thisWeek' | 'personal' | 'projects' | 'zakatCharity' | 'reports' | 'market' | 'completed';

const TEXT = {
  ar: {
    title: 'مركز المهام',
    subtitle: 'كل ما تحتاج تنفيذه في THE SFM، مرتب حسب الأولوية ومن بياناتك الفعلية.',
    eyebrow: 'ما المطلوب مني الآن؟',
    loading: 'جاري تحميل المهام...',
    loadWarningSingle: 'تعذر تحميل مصدر المهام:',
    loadWarning: 'تعذر تحميل بعض مصادر المهام:',
    retry: 'إعادة المحاولة',
    urgent: 'عاجلة',
    high: 'عالية الأهمية',
    medium: 'متوسطة',
    low: 'منخفضة',
    thisWeek: 'هذا الأسبوع',
    completed: 'مكتملة',
    all: 'الكل',
    personal: 'المال الشخصي',
    projects: 'المشاريع',
    zakatCharity: 'الزكاة والأعمال الخيرية',
    reports: 'التقارير',
    market: 'السوق',
    search: 'بحث في المهام',
    source: 'المصدر',
    dueDate: 'تاريخ الاستحقاق',
    open: 'فتح',
    viewDetails: 'عرض التفاصيل',
    openUnavailable: 'لا يمكن فتح تفاصيل هذه المهمة حالياً',
    done: 'تم',
    dismiss: 'تجاهل',
    noTasks: 'لا توجد مهام حالياً.',
    noTasksBody: 'كل شيء يبدو منظماً.',
    noFilterTasks: 'لا توجد مهام في هذا القسم.',
    zakatCharityEmpty: 'لا توجد مهام للزكاة أو الأعمال الخيرية حالياً.',
    zakatCharityEmptyShort: 'لا توجد بيانات زكاة أو أعمال خيرية حالياً.',
    zakatCharityEmptyHelper: 'أضف بيانات الزكاة أو الأعمال الخيرية لظهور المهام والتذكيرات هنا.',
    openZakat: 'فتح الزكاة',
    openCharity: 'فتح الأعمال الخيرية',
    today: 'اليوم المالي',
    dashboard: 'لوحة القيادة',
    setup: 'الإعداد',
    income: 'الدخل',
    expense: 'المصروفات',
    goal: 'الأهداف',
    savings: 'المدخرات',
    project: 'المشاريع',
    business: 'مركز الأعمال',
    zakat: 'الزكاة',
    charity: 'الأعمال الخيرية',
    report: 'التقارير',
    notification: 'الإشعارات',
    sourcePersonal: 'المال الشخصي',
    sourceProjects: 'المشاريع',
    sourceZakatCharity: 'الزكاة والأعمال الخيرية',
    sourceMarket: 'السوق',
    sourceNotifications: 'الإشعارات',
  },
  en: {
    title: 'Tasks Center',
    subtitle: 'Everything you need to do in THE SFM, organized by priority and based on your real data.',
    eyebrow: 'What should I do now?',
    loading: 'Loading tasks...',
    loadWarningSingle: 'Could not load task source:',
    loadWarning: 'Some task sources could not be loaded:',
    retry: 'Retry',
    urgent: 'Urgent',
    high: 'High Priority',
    medium: 'Medium',
    low: 'Low',
    thisWeek: 'This Week',
    completed: 'Completed',
    all: 'All',
    personal: 'Personal Finance',
    projects: 'Projects',
    zakatCharity: 'Zakat & Charity',
    reports: 'Reports',
    market: 'Market',
    search: 'Search tasks',
    source: 'Source',
    dueDate: 'Due date',
    open: 'Open',
    viewDetails: 'View details',
    openUnavailable: 'Task details cannot be opened right now',
    done: 'Done',
    dismiss: 'Ignore',
    noTasks: 'No tasks right now.',
    noTasksBody: 'Everything looks organized.',
    noFilterTasks: 'No tasks in this section.',
    zakatCharityEmpty: 'No Zakat or Charity tasks right now.',
    zakatCharityEmptyShort: 'No Zakat or Charity data right now.',
    zakatCharityEmptyHelper: 'Add Zakat or Charity data to show tasks and reminders here.',
    openZakat: 'Open Zakat',
    openCharity: 'Open Charity',
    today: 'Financial Today',
    dashboard: 'Dashboard',
    setup: 'Setup',
    income: 'Income',
    expense: 'Expenses',
    goal: 'Goals',
    savings: 'Savings',
    project: 'Projects',
    business: 'Business Hub',
    zakat: 'Zakat',
    charity: 'Charity',
    report: 'Reports',
    notification: 'Notifications',
    sourcePersonal: 'Personal finance',
    sourceProjects: 'Projects',
    sourceZakatCharity: 'Zakat & charity',
    sourceMarket: 'Market',
    sourceNotifications: 'Notifications',
  },
  fr: {
    title: 'Centre des tâches',
    subtitle: 'Tout ce que vous devez faire dans THE SFM, classé par priorité et basé sur vos données réelles.',
    eyebrow: 'Que dois-je faire maintenant ?',
    loading: 'Chargement des tâches...',
    loadWarningSingle: 'Impossible de charger la source de tâches :',
    loadWarning: 'Certaines sources de tâches n’ont pas pu être chargées :',
    retry: 'Réessayer',
    urgent: 'Urgent',
    high: 'Haute priorité',
    medium: 'Moyenne',
    low: 'Basse',
    thisWeek: 'Cette semaine',
    completed: 'Terminées',
    all: 'Tous',
    personal: 'Finances personnelles',
    projects: 'Projets',
    zakatCharity: 'Zakat et charité',
    reports: 'Rapports',
    market: 'Marché',
    search: 'Rechercher des tâches',
    source: 'Source',
    dueDate: 'Date d’échéance',
    open: 'Ouvrir',
    viewDetails: 'Voir les détails',
    openUnavailable: 'Les détails de cette tâche ne peuvent pas être ouverts pour le moment',
    done: 'Terminé',
    dismiss: 'Ignorer',
    noTasks: 'Aucune tâche pour le moment.',
    noTasksBody: 'Tout semble organisé.',
    noFilterTasks: 'Aucune tâche dans cette section.',
    zakatCharityEmpty: 'Aucune tâche de zakat ou de charité pour le moment.',
    zakatCharityEmptyShort: 'Aucune donnée de zakat ou de charité pour le moment.',
    zakatCharityEmptyHelper: 'Ajoutez des données de zakat ou de charité pour afficher les tâches et rappels ici.',
    openZakat: 'Ouvrir la zakat',
    openCharity: 'Ouvrir la charité',
    today: 'Aujourd’hui financier',
    dashboard: 'Tableau de bord',
    setup: 'Configuration',
    income: 'Revenus',
    expense: 'Dépenses',
    goal: 'Objectifs',
    savings: 'Épargne',
    project: 'Projets',
    business: 'Centre d’affaires',
    zakat: 'Zakat',
    charity: 'Charité',
    report: 'Rapports',
    notification: 'Notifications',
    sourcePersonal: 'Finances personnelles',
    sourceProjects: 'Projets',
    sourceZakatCharity: 'Zakat et charité',
    sourceMarket: 'Marché',
    sourceNotifications: 'Notifications',
  },
} as const;

type TasksText = (typeof TEXT)[Lang];

const PERSONAL_MODULES = new Set(['setup', 'income', 'expense', 'goal', 'savings']);
const PROJECT_MODULES = new Set(['project', 'business']);
const ZAKAT_CHARITY_MODULES = new Set(['zakat', 'charity']);

function sourceLabel(source: string, text: TasksText) {
  const key = source as keyof typeof text;
  return typeof text[key] === 'string' ? text[key] : source;
}

function taskIcon(source: string) {
  if (source === 'setup') return <Landmark size={20} />;
  if (source === 'income' || source === 'expense' || source === 'savings') return <Wallet size={20} />;
  if (source === 'goal') return <Target size={20} />;
  if (source === 'project' || source === 'business') return <BriefcaseBusiness size={20} />;
  if (source === 'zakat' || source === 'charity') return <HandHeart size={20} />;
  if (source === 'report') return <FileText size={20} />;
  if (source === 'market') return <TrendingUp size={20} />;
  if (source === 'notification') return <Bell size={20} />;
  return <ClipboardList size={20} />;
}

function sourceDiagnosticLabel(source: SmartTaskSourceId, text: TasksText) {
  const labels: Record<SmartTaskSourceId, string> = {
    personal: text.sourcePersonal,
    projects: text.sourceProjects,
    zakatCharity: text.sourceZakatCharity,
    market: text.sourceMarket,
    notifications: text.sourceNotifications,
  };
  return labels[source];
}

function failedSourceEntries(sourceDiagnostics: Record<SmartTaskSourceId, SmartTaskSourceDiagnostic>) {
  return (Object.entries(sourceDiagnostics) as Array<[SmartTaskSourceId, SmartTaskSourceDiagnostic]>)
    .filter(([, diagnostic]) => diagnostic.status === 'failed');
}

function sourceNameSeparator(locale: Lang) {
  return locale === 'ar' ? '، ' : ', ';
}

function filterTask(task: SmartTask, filter: FilterId, query: string) {
  if (filter !== 'completed' && task.status !== 'open') return false;
  if (filter === 'completed' && task.status !== 'done') return false;
  if (filter === 'urgent' && task.priority !== 'urgent') return false;
  if (filter === 'thisWeek' && !isTaskDueThisWeek(task)) return false;
  if (filter === 'personal' && !PERSONAL_MODULES.has(task.sourceModule)) return false;
  if (filter === 'projects' && !PROJECT_MODULES.has(task.sourceModule)) return false;
  if (filter === 'zakatCharity' && !ZAKAT_CHARITY_MODULES.has(task.sourceModule)) return false;
  if (filter === 'reports' && task.sourceModule !== 'report') return false;
  if (filter === 'market' && task.sourceModule !== 'market') return false;
  if (query.trim()) {
    const haystack = `${task.title} ${task.description ?? ''} ${task.sourceModule}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
  }
  return true;
}

export default function TasksCenterPage() {
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const text = TEXT[locale];
  const { tasks, loading, sourceDiagnostics, reload, setTaskStatus } = useSmartTasks();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const zakatCharityStatus = sourceDiagnostics.zakatCharity?.status ?? 'ok_empty';

  const openTasks = useMemo(() => tasks.filter(task => task.status === 'open'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(task => task.status === 'done'), [tasks]);
  const summary = useMemo(() => ({
    urgent: openTasks.filter(task => task.priority === 'urgent').length,
    high: openTasks.filter(task => task.priority === 'high').length,
    thisWeek: openTasks.filter(task => isTaskDueThisWeek(task)).length,
    completed: completedTasks.length,
  }), [completedTasks.length, openTasks]);

  const tabs: PageTabItem[] = useMemo(() => [
    { id: 'all', label: text.all, count: openTasks.length },
    { id: 'urgent', label: text.urgent, count: summary.urgent },
    { id: 'thisWeek', label: text.thisWeek, count: summary.thisWeek },
    { id: 'personal', label: text.personal, count: openTasks.filter(task => PERSONAL_MODULES.has(task.sourceModule)).length },
    { id: 'projects', label: text.projects, count: openTasks.filter(task => PROJECT_MODULES.has(task.sourceModule)).length },
    { id: 'zakatCharity', label: text.zakatCharity, count: openTasks.filter(task => ZAKAT_CHARITY_MODULES.has(task.sourceModule)).length },
    { id: 'reports', label: text.reports, count: openTasks.filter(task => task.sourceModule === 'report').length },
    { id: 'market', label: text.market, count: openTasks.filter(task => task.sourceModule === 'market').length },
    { id: 'completed', label: text.completed, count: summary.completed },
  ], [openTasks, summary.completed, summary.thisWeek, summary.urgent, text]);

  const visibleTasks = useMemo(
    () => tasks.filter(task => filterTask(task, activeFilter, query)).sort(compareSmartTasks),
    [activeFilter, query, tasks],
  );

  const failedSources = useMemo(() => failedSourceEntries(sourceDiagnostics), [sourceDiagnostics]);
  const hasLoadWarning = failedSources.length > 0;
  const failedSourceNames = useMemo(
    () => failedSources.map(([source]) => sourceDiagnosticLabel(source, text)),
    [failedSources, text],
  );

  return (
    <div className="tasks-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="tasks-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<ClipboardList size={28} />}
          actions={(
            <>
              <Link className="sfm-secondary-link" href="/today">{text.today}</Link>
              <Link className="sfm-primary-link" href="/dashboard">{text.dashboard}</Link>
            </>
          )}
        />

        {hasLoadWarning ? (
          <div className="tasks-warning" role="status">
            <div className="tasks-warning-main">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{failedSourceNames.length === 1 ? text.loadWarningSingle : text.loadWarning} {failedSourceNames.join(sourceNameSeparator(locale))}</span>
            </div>
            {process.env.NODE_ENV === 'development' ? (
              <small>
                {failedSources.map(([source, diagnostic]) => `${source}: ${diagnostic.errorCodes.join(', ') || 'load_failed'} (${diagnostic.failedTables.join(', ')})`).join(' | ')}
              </small>
            ) : null}
            <button type="button" onClick={() => void reload()}>{text.retry}</button>
          </div>
        ) : null}

        {loading ? (
          <EmptyState icon={<Loader2 className="spin" size={26} />} title={text.loading} />
        ) : (
          <>
            <StatGrid>
              <TaskMetric label={text.urgent} value={summary.urgent} tone="urgent" icon={<AlertTriangle size={20} />} />
              <TaskMetric label={text.high} value={summary.high} tone="high" icon={<CalendarClock size={20} />} />
              <TaskMetric label={text.thisWeek} value={summary.thisWeek} tone="week" icon={<ClipboardList size={20} />} />
              <TaskMetric label={text.completed} value={summary.completed} tone="done" icon={<CheckCircle2 size={20} />} />
            </StatGrid>

            <div className="tasks-toolbar">
              <PageTabs
                tabs={tabs}
                active={activeFilter}
                onChange={(id) => setActiveFilter(id as FilterId)}
                ariaLabel={text.title}
              />
              <label className="tasks-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">{text.search}</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} />
              </label>
            </div>

            {openTasks.length === 0 && completedTasks.length === 0 ? (
              <EmptyState icon={<CircleCheck size={28} />} title={text.noTasks} description={text.noTasksBody} />
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={28} />}
                title={text.noFilterTasks}
                description={activeFilter === 'zakatCharity' && zakatCharityStatus === 'ok_empty'
                  ? `${text.zakatCharityEmpty} ${text.zakatCharityEmptyHelper}`
                  : undefined}
                actions={activeFilter === 'zakatCharity' && zakatCharityStatus === 'ok_empty' ? (
                  <>
                    <Link className="sfm-secondary-link" href="/zakat">{text.openZakat}</Link>
                    <Link className="sfm-secondary-link" href="/charity-projects">{text.openCharity}</Link>
                  </>
                ) : undefined}
              />
            ) : (
              <div className="tasks-list">
                {visibleTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    text={text}
                    locale={locale}
                    onDone={() => setTaskStatus(task.id, 'done')}
                    onDismiss={() => setTaskStatus(task.id, 'dismissed')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .tasks-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
        }
        .tasks-content {
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
        .tasks-warning {
          display: grid;
          gap: 10px;
          min-width: 0;
          padding: 12px 14px;
          border-radius: var(--r-lg);
          border: 1px solid rgba(245, 158, 11, .25);
          background: rgba(245, 158, 11, .10);
          color: #92400E;
          font-weight: 850;
        }
        .tasks-warning-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tasks-warning span,
        .tasks-warning small {
          overflow-wrap: anywhere;
        }
        .tasks-warning small {
          color: #B45309;
          font-size: 11px;
          line-height: 1.6;
        }
        .tasks-warning button {
          width: fit-content;
          min-height: 34px;
          border: 1px solid rgba(245, 158, 11, .28);
          border-radius: var(--r-md);
          background: #FFFFFF;
          color: #92400E;
          padding: 0 12px;
          cursor: pointer;
          font: 900 12px Tajawal, Arial, sans-serif;
        }
        .tasks-toolbar {
          display: grid;
          gap: 12px;
          min-width: 0;
        }
        .tasks-search {
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: var(--r-lg);
          background: #FFFFFF;
          color: var(--sfm-primary);
          padding: 0 14px;
        }
        .tasks-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sfm-foreground);
          font: 850 14px Tajawal, Arial, sans-serif;
        }
        .tasks-search input::placeholder {
          color: var(--sfm-muted);
        }
        .tasks-list {
          display: grid;
          gap: 12px;
          min-width: 0;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .sfm-page-hero-actions {
            width: 100%;
          }
          .sfm-page-hero-actions > * {
            width: 100%;
          }
          .tasks-warning button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function TaskMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'urgent' | 'high' | 'week' | 'done';
}) {
  return (
    <AppCard className={`task-metric task-metric-${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <style jsx>{`
        :global(.task-metric) {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        :global(.task-metric > span) {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: var(--r-md);
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        :global(.task-metric-urgent > span) {
          background: rgba(239, 68, 68, .12);
          color: #DC2626;
        }
        :global(.task-metric-high > span) {
          background: rgba(245, 158, 11, .14);
          color: #B45309;
        }
        :global(.task-metric-done > span) {
          background: rgba(16, 185, 129, .12);
          color: #047857;
        }
        p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
        }
        strong {
          display: block;
          color: var(--sfm-primary-dark);
          font-size: 26px;
          line-height: 1.1;
        }
      `}</style>
    </AppCard>
  );
}

function TaskCard({
  task,
  text,
  locale,
  onDone,
  onDismiss,
}: {
  task: SmartTask;
  text: TasksText;
  locale: Lang;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const priorityLabel = task.priority === 'urgent' ? text.urgent : task.priority === 'high' ? text.high : task.priority === 'medium' ? text.medium : text.low;
  return (
    <article className={`smart-task-card priority-${task.priority}`}>
      <div className="smart-task-icon" aria-hidden="true">{taskIcon(task.sourceModule)}</div>
      <div className="smart-task-main">
        <div className="smart-task-meta">
          <span className="priority-badge">{priorityLabel}</span>
          <span>{text.source}: {sourceLabel(task.sourceModule, text)}</span>
          {task.dueDate ? <span>{text.dueDate}: {formatDate(task.dueDate, locale)}</span> : null}
          {task.status === 'done' ? <span className="done-badge">{text.completed}</span> : null}
        </div>
        <h2>{task.title}</h2>
        {task.description ? <p>{task.description}</p> : null}
      </div>
      <div className="smart-task-actions">
        {task.actionUrl ? (
          <Link className="view-action" href={task.actionUrl} aria-label={`${text.viewDetails}: ${task.title}`}>
            <Eye size={16} aria-hidden="true" />
            {text.viewDetails}
          </Link>
        ) : (
          <button type="button" className="view-action" disabled title={text.openUnavailable} aria-label={`${text.viewDetails}: ${task.title}`}>
            <Eye size={16} aria-hidden="true" />
            {text.viewDetails}
          </button>
        )}
        {task.status === 'open' ? (
          <>
            <button type="button" onClick={onDone} aria-label={`${text.done}: ${task.title}`}>
              <CheckCircle2 size={16} aria-hidden="true" />
              {text.done}
            </button>
            <button type="button" onClick={onDismiss} aria-label={`${text.dismiss}: ${task.title}`}>
              <XCircle size={16} aria-hidden="true" />
              {text.dismiss}
            </button>
          </>
        ) : null}
      </div>
      <style jsx>{`
        .smart-task-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: start;
          min-width: 0;
          padding: 16px;
          border-radius: var(--sfm-card-radius);
          border: 1px solid rgba(29, 140, 255, .14);
          background: rgba(255, 255, 255, .94);
          box-shadow: 0 12px 32px rgba(3, 18, 37, .07);
        }
        .smart-task-card.priority-urgent {
          border-color: rgba(239, 68, 68, .24);
        }
        .smart-task-card.priority-high {
          border-color: rgba(245, 158, 11, .28);
        }
        .smart-task-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: var(--r-lg);
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .smart-task-main {
          min-width: 0;
          display: grid;
          gap: 8px;
        }
        .smart-task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          align-items: center;
          min-width: 0;
        }
        .smart-task-meta span {
          border-radius: 999px;
          background: #F8FBFF;
          border: 1px solid rgba(29, 140, 255, .12);
          color: var(--sfm-muted);
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
        .smart-task-meta .priority-badge {
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
        }
        .priority-urgent .priority-badge {
          background: rgba(239, 68, 68, .12);
          color: #B91C1C;
        }
        .priority-high .priority-badge {
          background: rgba(245, 158, 11, .14);
          color: #92400E;
        }
        .smart-task-meta .done-badge {
          background: rgba(16, 185, 129, .12);
          color: #047857;
        }
        h2 {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-size: 18px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        p {
          margin: 0;
          color: var(--sfm-muted);
          line-height: 1.65;
          overflow-wrap: anywhere;
        }
        .smart-task-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          align-items: center;
        }
        .smart-task-actions a,
        .smart-task-actions button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: var(--r-md);
          border: 1px solid rgba(29, 140, 255, .18);
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          padding: 0 13px;
          font: 950 12px Tajawal, Arial, sans-serif;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(3, 18, 37, .05);
          transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .smart-task-actions a:hover,
        .smart-task-actions button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .34);
          background: rgba(24, 212, 212, .08);
          box-shadow: 0 12px 24px rgba(3, 18, 37, .08);
        }
        .smart-task-actions .view-action {
          border: 1px solid rgba(24, 212, 212, .26);
          background: linear-gradient(135deg, var(--sfm-primary-dark), var(--sfm-card-dark));
          color: #EAF6FF;
        }
        .smart-task-actions .view-action:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-card-dark));
          color: #FFFFFF;
        }
        .smart-task-actions button:disabled {
          opacity: .62;
          cursor: not-allowed;
          box-shadow: none;
        }
        .smart-task-actions a:focus-visible,
        .smart-task-actions button:focus-visible {
          outline: 3px solid rgba(24, 212, 212, .22);
          outline-offset: 2px;
        }
        @media (max-width: 860px) {
          .smart-task-card {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .smart-task-actions {
            grid-column: 1 / -1;
            justify-content: stretch;
          }
          .smart-task-actions a,
          .smart-task-actions button {
            flex: 1 1 140px;
          }
        }
        @media (max-width: 560px) {
          .smart-task-card {
            grid-template-columns: 1fr;
          }
          .smart-task-actions {
            display: grid;
          }
        }
      `}</style>
    </article>
  );
}
