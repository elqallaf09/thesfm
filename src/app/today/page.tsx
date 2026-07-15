'use client';

import { useMemo } from 'react';
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Landmark,
  Loader2,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotificationEvents } from '@/hooks/useNotificationEvents';
import { useRecentAccountActivity } from '@/hooks/useRecentAccountActivity';
import { useSmartTasks, type SmartTask } from '@/hooks/useSmartTasks';
import { accountActivityLabel, formatAccountActivityTimestamp, type AccountActivityRow } from '@/lib/accountActivity';
import { formatDate } from '@/lib/formatDate';
import {
  prioritizeDailyWorkflow,
  resolveDailySourceStatus,
  type DailyWorkflowItem,
} from '@/lib/daily-workflow/prioritizeDailyItems';
import { summarizeReportReadiness } from '@/lib/reports/reportReadiness';
import type { SmartNotification } from '@/lib/notifications/generateNotifications';

type Lang = 'ar' | 'en' | 'fr';
type DailyPriority = 'urgent' | 'high' | 'medium' | 'low';
type DailyItem = DailyWorkflowItem;
type CategoryId = 'bills' | 'debts' | 'goals' | 'savings' | 'investments' | 'projects';

const TEXT = {
  ar: {
    title: 'مركز اليوم', subtitle: 'مساحة العمل اليومية لكل ما يحتاج إجراءً الآن.', eyebrow: 'مركز التحكم التشغيلي',
    morning: 'صباح الخير', afternoon: 'مساء الخير', evening: 'مساء الخير',
    summary: 'ملخص اليوم', priorities: 'أولويات اليوم', prioritiesBody: 'الأعلى أهمية أولاً وفق منطق الأولوية الحالي.',
    dueToday: 'مستحق اليوم', openActions: 'إجراءات مفتوحة', importantAlerts: 'تنبيهات مهمة', reportsReady: 'تقارير جاهزة',
    focus: 'التركيز الآن', allClear: 'لا توجد إجراءات عاجلة الآن', allClearBody: 'كل ما تم تحميله يبدو مستقراً. يمكنك تسجيل حركة مالية أو مراجعة تقرير.',
    complete: 'إكمال', dismiss: 'تجاهل', open: 'فتح', viewAllTasks: 'إدارة كل المهام', viewNotifications: 'عرض كل الإشعارات',
    financialReminders: 'التذكيرات المالية', bills: 'الفواتير والاشتراكات', debts: 'الديون', goals: 'الأهداف', savings: 'المدخرات', investments: 'الاستثمارات', projects: 'المشاريع',
    categoryClear: 'لا توجد عناصر مفتوحة.', coveredAbove: 'ظهرت العناصر المهمة في الأولويات أعلاه.',
    aiSuggestions: 'اقتراحات تشغيلية بالذكاء الاصطناعي', aiBody: 'اقتراحات من بياناتك باستخدام منطق الأولوية المعتمد.', noSuggestions: 'لا توجد اقتراحات إضافية بعد الأولويات الحالية.',
    recentActivity: 'النشاط المهم الأخير', noActivity: 'لا يوجد نشاط حديث لعرضه.', activityLoading: 'جارٍ تحميل النشاط الأخير...', activityError: 'تعذر تحميل النشاط الأخير.', retry: 'إعادة المحاولة', quickActions: 'إجراءات سريعة',
    addExpense: 'إضافة مصروف', addIncome: 'إضافة دخل', payDebt: 'دفع دين', openInvestment: 'فتح الاستثمارات', viewReport: 'عرض تقرير', openProject: 'فتح مشروع', updateGoal: 'تحديث هدف',
    source: 'المصدر', due: 'الموعد', urgent: 'عاجل', high: 'مهم', medium: 'متوسط', low: 'منخفض',
    partialData: 'بعض المصادر غير متاحة. تظهر النتائج المؤكدة فقط.', failedData: 'تعذر تحميل بيانات اليوم. أعد المحاولة من إدارة المهام.', unavailableData: 'بيانات اليوم غير متاحة حالياً.', unauthorizedData: 'سجّل الدخول لعرض مساحة العمل اليومية.', notificationError: 'تعذر تحميل بعض الإشعارات الحقيقية.',
    sourceTasks: 'المهام', sourceNotifications: 'الإشعارات', sourceReports: 'التقارير', sourceProjects: 'المشاريع', sourceIncome: 'الدخل', sourceExpenses: 'المصروفات', sourceDebt: 'الديون', sourceGoals: 'الأهداف', sourceSavings: 'المدخرات', sourceInvestments: 'الاستثمارات',
    loading: 'جاري تجهيز مساحة عمل اليوم...', accountWarning: 'أكمل إعداد الحساب لتحسين دقة الأولويات.', completeAccount: 'إكمال الحساب',
  },
  en: {
    title: 'Today Center', subtitle: 'Your daily workspace for everything that needs action now.', eyebrow: 'Operational control center',
    morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
    summary: "Today's summary", priorities: "Today's priorities", prioritiesBody: 'Highest importance first, using the existing production priority logic.',
    dueToday: 'Due today', openActions: 'Open actions', importantAlerts: 'Important alerts', reportsReady: 'Reports ready',
    focus: 'Focus now', allClear: 'No urgent actions right now', allClearBody: 'Everything that loaded looks stable. You can record a transaction or review a report.',
    complete: 'Complete', dismiss: 'Dismiss', open: 'Open', viewAllTasks: 'Manage all tasks', viewNotifications: 'View all notifications',
    financialReminders: 'Financial reminders', bills: 'Bills & subscriptions', debts: 'Debts', goals: 'Goals', savings: 'Savings', investments: 'Investments', projects: 'Projects',
    categoryClear: 'No open items.', coveredAbove: 'Important items are already surfaced in priorities above.',
    aiSuggestions: 'AI operational suggestions', aiBody: 'Suggestions from your data using the approved priority rules.', noSuggestions: 'No additional suggestions beyond the current priorities.',
    recentActivity: 'Recent important activity', noActivity: 'No recent activity to show.', activityLoading: 'Loading recent activity...', activityError: 'Recent activity could not be loaded.', retry: 'Retry', quickActions: 'Quick actions',
    addExpense: 'Add expense', addIncome: 'Add income', payDebt: 'Pay debt', openInvestment: 'Open investments', viewReport: 'View report', openProject: 'Open project', updateGoal: 'Update goal',
    source: 'Source', due: 'Due', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
    partialData: 'Some sources are unavailable. Only confirmed results are shown.', failedData: 'Today data could not be loaded. Retry from Task Management.', unavailableData: 'Today data is currently unavailable.', unauthorizedData: 'Sign in to view your daily workspace.', notificationError: 'Some real notifications could not be loaded.',
    sourceTasks: 'Tasks', sourceNotifications: 'Notifications', sourceReports: 'Reports', sourceProjects: 'Projects', sourceIncome: 'Income', sourceExpenses: 'Expenses', sourceDebt: 'Debts', sourceGoals: 'Goals', sourceSavings: 'Savings', sourceInvestments: 'Investments',
    loading: 'Preparing today’s workspace...', accountWarning: 'Complete account setup to improve priority accuracy.', completeAccount: 'Complete account',
  },
  fr: {
    title: 'Centre du jour', subtitle: 'Votre espace quotidien pour tout ce qui demande une action maintenant.', eyebrow: 'Centre de contrôle opérationnel',
    morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir',
    summary: 'Résumé du jour', priorities: 'Priorités du jour', prioritiesBody: 'Les plus importantes d’abord, selon la logique de priorité existante.',
    dueToday: 'À traiter aujourd’hui', openActions: 'Actions ouvertes', importantAlerts: 'Alertes importantes', reportsReady: 'Rapports prêts',
    focus: 'Priorité immédiate', allClear: 'Aucune action urgente maintenant', allClearBody: 'Tout ce qui a été chargé semble stable. Vous pouvez enregistrer une opération ou consulter un rapport.',
    complete: 'Terminer', dismiss: 'Ignorer', open: 'Ouvrir', viewAllTasks: 'Gérer toutes les tâches', viewNotifications: 'Voir les notifications',
    financialReminders: 'Rappels financiers', bills: 'Factures et abonnements', debts: 'Dettes', goals: 'Objectifs', savings: 'Épargne', investments: 'Investissements', projects: 'Projets',
    categoryClear: 'Aucun élément ouvert.', coveredAbove: 'Les éléments importants figurent déjà dans les priorités.',
    aiSuggestions: 'Suggestions opérationnelles IA', aiBody: 'Suggestions issues de vos données avec les règles de priorité validées.', noSuggestions: 'Aucune suggestion supplémentaire au-delà des priorités actuelles.',
    recentActivity: 'Activité importante récente', noActivity: 'Aucune activité récente à afficher.', activityLoading: 'Chargement de l’activité récente...', activityError: 'Impossible de charger l’activité récente.', retry: 'Réessayer', quickActions: 'Actions rapides',
    addExpense: 'Ajouter une dépense', addIncome: 'Ajouter un revenu', payDebt: 'Payer une dette', openInvestment: 'Ouvrir les investissements', viewReport: 'Voir un rapport', openProject: 'Ouvrir un projet', updateGoal: 'Mettre à jour un objectif',
    source: 'Source', due: 'Échéance', urgent: 'Urgent', high: 'Élevé', medium: 'Moyen', low: 'Faible',
    partialData: 'Certaines sources sont indisponibles. Seuls les résultats confirmés sont affichés.', failedData: 'Les données du jour n’ont pas pu être chargées. Réessayez depuis la gestion des tâches.', unavailableData: 'Les données du jour sont indisponibles.', unauthorizedData: 'Connectez-vous pour voir votre espace quotidien.', notificationError: 'Certaines notifications réelles n’ont pas pu être chargées.',
    sourceTasks: 'Tâches', sourceNotifications: 'Notifications', sourceReports: 'Rapports', sourceProjects: 'Projets', sourceIncome: 'Revenus', sourceExpenses: 'Dépenses', sourceDebt: 'Dettes', sourceGoals: 'Objectifs', sourceSavings: 'Épargne', sourceInvestments: 'Investissements',
    loading: 'Préparation de l’espace du jour...', accountWarning: 'Terminez la configuration du compte pour améliorer les priorités.', completeAccount: 'Terminer le compte',
  },
} as const;

type TodayText = { [K in keyof typeof TEXT.en]: string };

function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateKey(value?: string | null) { if (!value) return ''; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : localDateKey(parsed); }
function priority(task: SmartTask): DailyPriority { return task.priority; }
function notificationPriority(notice: SmartNotification): DailyPriority { return notice.severity === 'danger' ? 'urgent' : notice.severity === 'warning' ? 'high' : notice.severity === 'success' ? 'low' : 'medium'; }
function sourceLabel(module: string | undefined, text: TodayText) {
  const source = String(module ?? '').toLowerCase();
  if (source.includes('report')) return text.sourceReports;
  if (source.includes('project') || source.includes('business')) return text.sourceProjects;
  if (source.includes('income')) return text.sourceIncome;
  if (source.includes('expense') || source.includes('bill') || source.includes('subscription')) return text.sourceExpenses;
  if (source.includes('debt')) return text.sourceDebt;
  if (source.includes('goal')) return text.sourceGoals;
  if (source.includes('saving')) return text.sourceSavings;
  if (source.includes('market') || source.includes('invest') || source.includes('signal')) return text.sourceInvestments;
  return text.sourceNotifications;
}
function taskItem(task: SmartTask, text: TodayText): DailyItem { return { id: task.id, title: task.title, description: task.description ?? '', href: task.actionUrl || '/tasks', source: sourceLabel(task.sourceModule, text), sourceModule: task.sourceModule, sourceId: task.sourceId, priority: priority(task), dueDate: task.dueDate ?? null, actionLabel: task.actionLabel || text.open, kind: task.sourceModule === 'report' ? 'report' : 'task' }; }
function notificationItem(notice: SmartNotification, text: TodayText): DailyItem { return { id: notice.id, title: notice.title, description: notice.message, href: notice.actionUrl || '/notifications', source: sourceLabel(notice.sourceModule, text), sourceModule: notice.sourceModule, sourceId: notice.sourceId, priority: notificationPriority(notice), dueDate: notice.dueDate, createdAt: notice.createdAt, actionLabel: text.open, kind: notice.type === 'report' ? 'report' : 'notification', unread: notice.status === 'unread' }; }
function priorityLabel(value: DailyPriority, text: TodayText) { return text[value]; }
function greeting(text: TodayText) { const hour = new Date().getHours(); return hour < 12 ? text.morning : hour < 18 ? text.afternoon : text.evening; }
function categoryFor(module = ''): CategoryId | null { if (['bill', 'subscription', 'expense', 'income', 'zakat', 'charity'].includes(module)) return 'bills'; if (module === 'debt') return 'debts'; if (module === 'goal') return 'goals'; if (module === 'savings') return 'savings'; if (module === 'market') return 'investments'; if (module === 'project' || module === 'business') return 'projects'; return null; }

const CATEGORY_META: Array<{ id: CategoryId; icon: ComponentType<{ size?: number }> }> = [
  { id: 'bills', icon: CreditCard }, { id: 'debts', icon: Landmark }, { id: 'goals', icon: Target },
  { id: 'savings', icon: PiggyBank }, { id: 'investments', icon: TrendingUp }, { id: 'projects', icon: FolderKanban },
];
const QUICK_ACTIONS: Array<{ id: keyof TodayText; href: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'addExpense', href: '/expenses', icon: ReceiptText }, { id: 'addIncome', href: '/income', icon: Wallet },
  { id: 'payDebt', href: '/debts', icon: Landmark }, { id: 'openInvestment', href: '/invest', icon: TrendingUp },
  { id: 'viewReport', href: '/reports-center', icon: FileText }, { id: 'openProject', href: '/projects', icon: FolderKanban },
  { id: 'updateGoal', href: '/goals', icon: Target },
];

export default function TodayCenterPage() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const text = TEXT[locale] as TodayText;
  const { tasks, profile, records, errors, sourceDiagnostics, loading: tasksLoading, setTaskStatus } = useSmartTasks();
  const { events: notificationEvents, loading: notificationsLoading, error: notificationError } = useNotificationEvents();
  const {
    rows: recentActivity,
    loading: recentActivityLoading,
    error: recentActivityError,
    reload: reloadRecentActivity,
  } = useRecentAccountActivity(6);
  const openTasks = useMemo(() => tasks.filter(task => task.status === 'open'), [tasks]);
  const activeNotifications = useMemo(() => notificationEvents.filter(notice => notice.status === 'unread'), [notificationEvents]);
  const items = useMemo(() => {
    const next = [...openTasks.map(task => taskItem(task, text)), ...activeNotifications.map(notice => notificationItem(notice, text))];
    if (profile?.onboarding_completed === false) next.push({ id: 'account:completion', title: text.accountWarning, description: text.accountWarning, href: '/onboarding', source: text.sourceTasks, sourceModule: 'account', priority: 'high', actionLabel: text.completeAccount, kind: 'account' });
    return next;
  }, [activeNotifications, openTasks, profile?.onboarding_completed, text]);
  const prioritized = useMemo(() => prioritizeDailyWorkflow(items), [items]);
  const displayed = useMemo(() => {
    const ids = new Set<string>();
    if (prioritized.topAction) ids.add(prioritized.topAction.id);
    const priorities = prioritized.urgentAndHighTasks.filter(item => !ids.has(item.id)).slice(0, 5); priorities.forEach(item => ids.add(item.id));
    const alerts = prioritized.importantNotifications.filter(item => !ids.has(item.id)).slice(0, 2); alerts.forEach(item => ids.add(item.id));
    const categoryItems = Object.fromEntries(CATEGORY_META.map(meta => [meta.id, [] as DailyItem[]])) as Record<CategoryId, DailyItem[]>;
    prioritized.ordered.forEach(item => { if (ids.has(item.id) || item.kind !== 'task') return; const category = categoryFor(item.sourceModule); if (category && categoryItems[category].length < 2) { categoryItems[category].push(item); ids.add(item.id); } });
    const suggestions = prioritized.ordered.filter(item => item.kind === 'task' && !ids.has(item.id)).slice(0, 3); suggestions.forEach(item => ids.add(item.id));
    return { priorities, alerts, categoryItems, suggestions };
  }, [prioritized]);
  const categoryCounts = useMemo(() => openTasks.reduce((counts, task) => { const category = categoryFor(task.sourceModule); if (category) counts[category] += 1; return counts; }, { bills: 0, debts: 0, goals: 0, savings: 0, investments: 0, projects: 0 } as Record<CategoryId, number>), [openTasks]);
  const reportSummary = useMemo(() => summarizeReportReadiness({ income: records.income, expenses: records.expenses, savings: records.savings, goals: records.goals, investments: records.investments, projects: records.projects, feasibility: records.feasibilityStudies, financialModels: records.financialModels, tasks: records.projectTasks, milestones: records.projectMilestones, documents: records.projectDocuments, pitchDecks: records.pitchDecks, marketWatchlist: records.marketWatchlist, zakatCalculations: records.zakatCalculations, zakatAssets: records.zakatAssets, charityProjects: records.charityProjects, charityBeneficiaries: records.charityBeneficiaries }, { income: errors.income, expenses: errors.expenses, savings: errors.savings, goals: errors.goals, investments: errors.investments, projects: errors.projects, feasibility: errors.feasibilityStudies, financialModels: errors.financialModels, tasks: errors.projectTasks, milestones: errors.projectMilestones, documents: errors.projectDocuments, pitchDecks: errors.pitchDecks, marketWatchlist: errors.marketWatchlist, zakatCalculations: errors.zakatCalculations, zakatAssets: errors.zakatAssets, charityProjects: errors.charityProjects, charityBeneficiaries: errors.charityBeneficiaries }), [errors, records]);
  const hasReportReadinessFailure = reportSummary.failed > 0 || reportSummary.unknown > 0;
  const sourceStatus = resolveDailySourceStatus({ loading: tasksLoading, authenticated: Boolean(user), diagnostics: Object.values(sourceDiagnostics) });
  const sourceMessage = sourceStatus === 'failed' ? text.failedData : sourceStatus === 'unavailable' ? text.unavailableData : sourceStatus === 'unauthorized' ? text.unauthorizedData : text.partialData;
  const dueTodayCount = openTasks.filter(task => dateKey(task.dueDate) === localDateKey()).length;
  const formatLocale = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US';
  const displayName = profile?.display_name?.trim();
  const loading = tasksLoading || notificationsLoading;
  const complete = (item: DailyItem) => { if (item.kind === 'task') setTaskStatus(item.id, 'done'); };
  const dismiss = (item: DailyItem) => { if (item.kind === 'task') setTaskStatus(item.id, 'dismissed'); };

  return <div className="today-shell" dir={dir}><DashboardPageShell ariaLabel={text.title} className="today-main" contentClassName="today-content">
    <header className="today-greeting">
      <div><span className="today-eyebrow"><Sparkles size={14} />{text.eyebrow}</span><h1>{greeting(text)}{displayName ? `, ${displayName}` : ''}</h1><p>{text.subtitle}</p></div>
      <time dateTime={localDateKey()}><CalendarDays size={18} />{new Date().toLocaleDateString(formatLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
    </header>
    {loading ? <EmptyState icon={<Loader2 className="spin" size={26} />} title={text.loading} /> : <>
      {['partial', 'failed', 'unavailable', 'unauthorized'].includes(sourceStatus) ? <div className="today-warning" role="status"><AlertTriangle size={18} />{sourceMessage}</div> : null}
      {notificationError ? <div className="today-warning" role="status"><Bell size={18} />{text.notificationError}</div> : null}
      <section className="today-summary" aria-labelledby="today-summary-title"><div className="today-section-heading"><div><span>{text.summary}</span><h2 id="today-summary-title">{text.title}</h2></div></div><div className="today-summary-grid"><SummaryMetric label={text.openActions} value={openTasks.length} icon={<ClipboardList size={19} />} /><SummaryMetric label={text.dueToday} value={dueTodayCount} icon={<CalendarDays size={19} />} /><SummaryMetric label={text.importantAlerts} value={activeNotifications.filter(item => ['danger', 'warning'].includes(item.severity)).length} icon={<Bell size={19} />} /><SummaryMetric label={text.reportsReady} value={hasReportReadinessFailure ? '—' : reportSummary.ready} icon={<FileText size={19} />} /></div></section>
      <FocusCard item={prioritized.topAction} text={text} locale={locale} onComplete={complete} onDismiss={dismiss} />
      <section className="today-priorities" aria-labelledby="today-priorities-title"><div className="today-section-heading row"><div><span>{text.prioritiesBody}</span><h2 id="today-priorities-title">{text.priorities}</h2></div><Link href="/tasks">{text.viewAllTasks}<ChevronRight size={15} /></Link></div>{displayed.priorities.length ? <div className="priority-list">{displayed.priorities.map(item => <OperationalItem key={item.id} item={item} text={text} locale={locale} onComplete={complete} onDismiss={dismiss} />)}</div> : <p className="today-empty">{text.categoryClear}</p>}</section>
      {displayed.alerts.length ? <section className="today-alerts" aria-labelledby="today-alerts-title"><div className="today-section-heading row"><div><span>{text.sourceNotifications}</span><h2 id="today-alerts-title">{text.importantAlerts}</h2></div><Link href="/notifications">{text.viewNotifications}<ChevronRight size={15} /></Link></div><div className="priority-list">{displayed.alerts.map(item => <OperationalItem key={item.id} item={item} text={text} locale={locale} />)}</div></section> : null}
      <section aria-labelledby="financial-reminders-title"><div className="today-section-heading"><div><span>{text.dueToday}</span><h2 id="financial-reminders-title">{text.financialReminders}</h2></div></div><div className="reminder-grid">{CATEGORY_META.map(({ id, icon: Icon }) => <ReminderCard key={id} title={text[id]} count={categoryCounts[id]} icon={<Icon size={19} />} items={displayed.categoryItems[id]} text={text} locale={locale} onComplete={complete} onDismiss={dismiss} />)}</div></section>
      <section className="today-lower-grid"><AppCard className="today-ai-card"><div className="today-section-heading"><div><span>{text.aiBody}</span><h2><Sparkles size={19} />{text.aiSuggestions}</h2></div></div>{displayed.suggestions.length ? <div className="compact-list">{displayed.suggestions.map(item => <OperationalItem key={item.id} item={item} text={text} locale={locale} compact />)}</div> : <p className="today-empty">{text.noSuggestions}</p>}</AppCard><AppCard className="today-activity-card"><div className="today-section-heading"><div><span>{text.summary}</span><h2><Activity size={19} />{text.recentActivity}</h2></div></div>{recentActivityError ? <div className="today-activity-error" role="alert"><AlertTriangle size={17} /><span>{text.activityError}</span><button type="button" onClick={() => void reloadRecentActivity()}>{text.retry}</button></div> : recentActivityLoading ? <p className="today-empty">{text.activityLoading}</p> : recentActivity.length ? <div className="activity-list">{recentActivity.map(row => <ActivityItem key={row.id} row={row} locale={locale} />)}</div> : <p className="today-empty">{text.noActivity}</p>}</AppCard></section>
      <nav className="quick-actions" aria-label={text.quickActions}><div><span>{text.quickActions}</span><Plus size={18} /></div>{QUICK_ACTIONS.map(({ id, href, icon: Icon }) => <Link key={id} href={href}><Icon size={17} />{text[id]}</Link>)}</nav>
    </>}
  </DashboardPageShell><style jsx global>{styles}</style></div>;
}

function SummaryMetric({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) { return <article><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>; }
function FocusCard({ item, text, locale, onComplete, onDismiss }: { item: DailyItem | null; text: TodayText; locale: Lang; onComplete: (item: DailyItem) => void; onDismiss: (item: DailyItem) => void }) { return <AppCard className="today-focus-card" tone="dark"><div className="focus-copy"><span>{text.focus}</span><h2>{item?.title ?? text.allClear}</h2><p>{item?.description || text.allClearBody}</p>{item ? <div className="item-meta"><span>{item.source}</span><span className={`priority ${item.priority}`}>{priorityLabel(item.priority, text)}</span>{item.dueDate ? <span>{text.due}: {formatDate(item.dueDate, locale)}</span> : null}</div> : null}</div><div className="focus-actions">{item ? <><Link className="primary-action" href={item.href}>{item.actionLabel}<ArrowUpRight size={16} /></Link>{item.kind === 'task' ? <><button type="button" onClick={() => onComplete(item)}><Check size={16} />{text.complete}</button><button type="button" onClick={() => onDismiss(item)}><X size={16} />{text.dismiss}</button></> : null}</> : <><Link className="primary-action" href="/expenses"><Plus size={16} />{text.addExpense}</Link><Link href="/reports-center">{text.viewReport}</Link></>}</div></AppCard>; }
function OperationalItem({ item, text, locale, onComplete, onDismiss, compact = false }: { item: DailyItem; text: TodayText; locale: Lang; onComplete?: (item: DailyItem) => void; onDismiss?: (item: DailyItem) => void; compact?: boolean }) { return <article className={`operational-item ${compact ? 'compact' : ''}`}><div className="item-copy"><div className="item-meta"><span>{item.source}</span><span className={`priority ${item.priority}`}>{priorityLabel(item.priority, text)}</span></div><strong>{item.title}</strong>{!compact && item.description ? <p>{item.description}</p> : null}{item.dueDate ? <time dateTime={dateKey(item.dueDate)}>{text.due}: {formatDate(item.dueDate, locale)}</time> : null}</div><div className="item-actions"><Link href={item.href} aria-label={`${text.open}: ${item.title}`}><ArrowUpRight size={16} /><span>{text.open}</span></Link>{item.kind === 'task' && onComplete ? <button type="button" onClick={() => onComplete(item)} aria-label={`${text.complete}: ${item.title}`}><Check size={16} /><span>{text.complete}</span></button> : null}{item.kind === 'task' && onDismiss ? <button type="button" onClick={() => onDismiss(item)} aria-label={`${text.dismiss}: ${item.title}`}><X size={16} /><span>{text.dismiss}</span></button> : null}</div></article>; }
function ReminderCard({ title, count, icon, items, text, locale, onComplete, onDismiss }: { title: string; count: number; icon: ReactNode; items: DailyItem[]; text: TodayText; locale: Lang; onComplete: (item: DailyItem) => void; onDismiss: (item: DailyItem) => void }) { return <AppCard className="reminder-card"><header><span>{icon}</span><div><h3>{title}</h3><small>{count}</small></div></header>{items.length ? <div className="compact-list">{items.map(item => <OperationalItem key={item.id} item={item} text={text} locale={locale} onComplete={onComplete} onDismiss={onDismiss} compact />)}</div> : <p>{count > 0 ? text.coveredAbove : text.categoryClear}</p>}</AppCard>; }
function activityHref(row: AccountActivityRow) { if (row.event_type === 'goal_added') return '/goals'; if (row.event_type === 'investment_added') return '/invest'; if (row.event_type === 'report_exported') return '/reports-center'; if (row.event_type === 'profile_updated' || row.event_type === 'language_changed') return '/profile'; return null; }
function ActivityItem({ row, locale }: { row: AccountActivityRow; locale: Lang }) { const href = activityHref(row); const content = <><span><Activity size={15} /></span><div><strong>{accountActivityLabel(row.event_type, locale, row.title)}</strong>{row.description ? <p>{row.description}</p> : null}<time dateTime={row.created_at}>{formatAccountActivityTimestamp(row.created_at, locale)}</time></div>{href ? <ChevronRight size={16} /> : null}</>; return href ? <Link href={href} className="activity-item">{content}</Link> : <div className="activity-item">{content}</div>; }

const styles = `
.today-shell{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:clip}.today-main{width:100%!important;max-width:none!important;margin-inline:0!important;padding-inline:24px!important}.today-content{width:100%;max-width:none;margin-inline:0;display:grid;gap:20px;min-width:0}.today-greeting{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:end;padding:clamp(22px,3vw,32px);border:1px solid var(--border-strong);border-radius:var(--radius-panel);background:var(--hero-gradient);color:var(--hero-foreground);box-shadow:var(--shadow-md)}.today-greeting>div{display:grid;gap:9px;min-width:0}.today-eyebrow{width:fit-content;display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border:1px solid color-mix(in srgb,var(--hero-foreground) 22%,transparent);border-radius:var(--radius-pill);background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);color:var(--hero-foreground-muted);font-size:12px;font-weight:600}.today-greeting h1{margin:0;color:var(--hero-foreground);font-size:clamp(30px,4vw,44px);line-height:1.1;font-weight:600}.today-greeting p{margin:0;color:var(--hero-foreground-muted);font-size:clamp(15px,1.7vw,18px);line-height:1.7}.today-greeting>time{display:inline-flex;align-items:center;gap:8px;max-width:320px;padding:9px 12px;border:1px solid color-mix(in srgb,var(--hero-foreground) 20%,transparent);border-radius:var(--radius-pill);background:color-mix(in srgb,var(--hero-foreground) 8%,transparent);color:var(--hero-foreground-muted);font-size:12px;font-weight:600}.today-warning{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--warning) 32%,var(--border));border-radius:var(--radius-card);background:var(--warning-soft);color:var(--warning);font-weight:600}.today-section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.today-section-heading>div{display:grid;gap:4px}.today-section-heading span{color:var(--foreground-muted);font-size:12px;font-weight:600}.today-section-heading h2{display:flex;align-items:center;gap:8px;margin:0;color:var(--foreground);font-size:21px;line-height:1.3}.today-section-heading.row>a{min-height:40px;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0 12px;background:var(--surface);color:var(--primary);text-decoration:none;font-size:12px;font-weight:600}.today-summary{padding:16px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card)}.today-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.today-summary-grid article{display:flex;align-items:center;gap:11px;min-width:0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.today-summary-grid article>span{width:40px;height:40px;display:grid;place-items:center;flex:0 0 40px;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary)}.today-summary-grid strong{display:block;color:var(--foreground);font:600 24px/1 var(--font-data)}.today-summary-grid small{display:block;margin-top:5px;color:var(--foreground-muted);font-size:12px;font-weight:600;overflow-wrap:anywhere}.today-focus-card{position:relative;overflow:hidden;display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;min-height:178px;background:var(--hero-gradient)!important}.focus-copy{position:relative;z-index:1;display:grid;gap:9px;min-width:0}.focus-copy>span{width:fit-content;padding:5px 10px;border:1px solid color-mix(in srgb,var(--hero-foreground) 20%,transparent);border-radius:var(--radius-pill);color:var(--hero-foreground-muted);font-size:12px;font-weight:600}.focus-copy h2{margin:0;color:var(--hero-foreground);font-size:clamp(25px,3.4vw,38px);line-height:1.18}.focus-copy p{max-width:760px;margin:0;color:var(--hero-foreground-muted);line-height:1.65}.focus-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.focus-actions a,.focus-actions button{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent);border-radius:var(--radius-control);padding:0 13px;background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);color:var(--hero-foreground);text-decoration:none;font:600 12px var(--font-ui);cursor:pointer}.focus-actions .primary-action{border-color:var(--primary);background:var(--primary);color:var(--primary-foreground)}.item-meta{display:flex;flex-wrap:wrap;gap:6px}.item-meta span{width:fit-content;display:inline-flex;align-items:center;min-height:26px;padding:0 8px;border:1px solid color-mix(in srgb,var(--hero-foreground) 16%,transparent);border-radius:var(--radius-pill);color:var(--hero-foreground-muted);font-size:11px;font-weight:600}.item-meta .priority.urgent,.item-meta .priority.high{border-color:color-mix(in srgb,var(--warning) 35%,transparent);background:color-mix(in srgb,var(--warning) 13%,transparent);color:var(--warning)}.today-priorities,.today-alerts{padding:16px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card)}.priority-list,.compact-list{display:grid;gap:8px}.operational-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;min-width:0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.operational-item.compact{padding:10px;background:var(--surface)}.item-copy{display:grid;gap:5px;min-width:0}.operational-item .item-meta span{border-color:var(--border);background:var(--surface);color:var(--foreground-muted)}.operational-item .item-meta .priority.urgent{color:var(--danger);background:var(--danger-soft)}.operational-item .item-meta .priority.high{color:var(--warning);background:var(--warning-soft)}.item-copy>strong{color:var(--foreground);font-size:14px;line-height:1.45;overflow-wrap:anywhere}.item-copy>p{margin:0;color:var(--foreground-muted);font-size:12px;line-height:1.55;overflow-wrap:anywhere}.item-copy>time{color:var(--foreground-muted);font-size:11px;font-weight:600}.item-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.item-actions a,.item-actions button{min-width:40px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:var(--radius-control);padding:0 10px;background:var(--surface);color:var(--foreground-secondary);text-decoration:none;font:600 11px var(--font-ui);cursor:pointer}.item-actions a{border-color:var(--primary);color:var(--primary)}.reminder-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.reminder-card{display:grid!important;align-content:start;gap:12px;min-width:0}.reminder-card header{display:flex;align-items:center;gap:10px}.reminder-card header>span{width:40px;height:40px;display:grid;place-items:center;flex:0 0 40px;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary)}.reminder-card header div{display:flex;align-items:center;gap:8px;min-width:0}.reminder-card h3{margin:0;color:var(--foreground);font-size:16px;overflow-wrap:anywhere}.reminder-card header small{min-width:25px;height:25px;display:grid;place-items:center;border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-muted);font-family:var(--font-data);font-weight:600}.reminder-card>p,.today-empty{margin:0;padding:11px;border:1px dashed var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-muted);font-size:12px;line-height:1.55}.reminder-card .operational-item{grid-template-columns:1fr}.reminder-card .item-actions{justify-content:flex-start}.today-lower-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.today-ai-card,.today-activity-card{display:grid!important;align-content:start;min-width:0}.today-activity-error{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:11px;border:1px solid color-mix(in srgb,var(--danger) 30%,var(--border));border-radius:var(--radius-control);background:var(--danger-soft);color:var(--danger);font-size:12px;font-weight:600}.today-activity-error button{min-height:40px;border:1px solid color-mix(in srgb,var(--danger) 38%,var(--border));border-radius:var(--radius-control);padding:0 11px;background:var(--surface);color:var(--danger);font:600 12px var(--font-ui);cursor:pointer}.activity-list{display:grid;gap:8px}.activity-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);text-decoration:none}.activity-item>span{width:34px;height:34px;display:grid;place-items:center;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary)}.activity-item strong{display:block;font-size:13px}.activity-item p{margin:3px 0 0;color:var(--foreground-muted);font-size:12px;line-height:1.45}.activity-item time{display:block;margin-top:4px;color:var(--foreground-muted);font-size:11px;font-weight:600}.quick-actions{display:flex;align-items:center;gap:8px;min-width:0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);overflow-x:auto}.quick-actions>div,.quick-actions a{flex:0 0 auto;min-height:44px;display:inline-flex;align-items:center;gap:7px;border-radius:var(--radius-pill);padding:0 12px}.quick-actions>div{color:var(--foreground);font-weight:600}.quick-actions a{border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground-secondary);text-decoration:none;font-size:12px;font-weight:600}.today-shell :is(a,button):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1180px){.today-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.reminder-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.today-main{padding-inline:16px!important}.today-greeting,.today-focus-card,.today-lower-grid{grid-template-columns:1fr}.today-greeting>time{max-width:none;width:fit-content}.focus-actions{justify-content:flex-start}}@media(max-width:680px){.today-content{gap:16px}.today-main{padding-inline:12px!important}.today-greeting{padding:20px}.today-summary-grid,.reminder-grid{grid-template-columns:1fr}.today-section-heading.row{align-items:start;flex-direction:column}.today-section-heading.row>a{width:100%;justify-content:center}.operational-item{grid-template-columns:1fr}.item-actions{justify-content:flex-start}.item-actions a,.item-actions button{flex:1 1 100px}.focus-actions{display:grid}.focus-actions a,.focus-actions button{width:100%}.quick-actions{margin-inline:-2px}.item-actions span{display:inline}}@media(max-width:360px){.today-main{padding-inline:8px!important}.today-greeting,.today-summary,.today-priorities,.today-alerts{border-radius:var(--radius-card)}.item-actions a,.item-actions button{flex:1 1 100%}}@media(prefers-reduced-motion:reduce){.today-shell *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
