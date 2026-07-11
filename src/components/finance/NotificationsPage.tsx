'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Bell,
  CalendarDays,
  CheckCheck,
  Clock3,
  Eye,
  FileText,
  HandHeart,
  LineChart,
  Loader2,
  Search,
  ShieldAlert,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import {
  generateSmartNotifications,
  type NotificationLang,
  type NotificationSourceData,
  type SmartNotification,
  type SmartNotificationSeverity,
  type SmartNotificationType,
} from '@/lib/notifications/generateNotifications';
import { loadUserDataTables } from '@/lib/data/notificationsData';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { formatDate } from '@/lib/formatDate';

type Lang = NotificationLang;
type NotificationFilter =
  | 'all'
  | 'unread'
  | 'high'
  | 'income'
  | 'expense'
  | 'goal'
  | 'market'
  | 'project'
  | 'zakat'
  | 'charity'
  | 'report'
  | 'archived';

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

type LocalDynamicState = {
  read: string[];
  archived: string[];
};

type SourceKey = keyof NotificationSourceData;
type NotificationSourceId = 'stored' | 'income' | 'expense' | 'goal' | 'market' | 'project' | 'zakat' | 'charity';
type SourceStatus = 'ok_with_data' | 'ok_empty' | 'failed';
type SourceConfig = { key: SourceKey; table: string; source: NotificationSourceId };
type SourceDiagnostic = {
  ok: boolean;
  status: SourceStatus;
  count: number;
  tables: string[];
  failedTables: string[];
  errorCodes: string[];
  errorDetails: Partial<Record<string, string>>;
  message?: string;
};
type SourceErrorDetails = Partial<Record<SourceKey, string>>;

const OPTIONAL_EMPTY_SOURCE_KEYS: Partial<Record<NotificationSourceId, SourceKey[]>> = {
  zakat: ['zakatAssets'],
  charity: ['charityProjects', 'charityReminders', 'charityBeneficiaries', 'charityContributors'],
};

const SOURCE_TABLES: SourceConfig[] = [
  { key: 'income', table: 'monthly_income_sources', source: 'income' },
  { key: 'expenses', table: 'expense_items', source: 'expense' },
  { key: 'goals', table: 'financial_goals', source: 'goal' },
  { key: 'marketPriceAlerts', table: 'market_price_alerts', source: 'market' },
  { key: 'projects', table: 'projects', source: 'project' },
  { key: 'feasibilityStudies', table: 'project_feasibility_studies', source: 'project' },
  { key: 'financialModels', table: 'project_financial_models', source: 'project' },
  { key: 'projectTasks', table: 'project_tasks', source: 'project' },
  { key: 'projectMilestones', table: 'project_milestones', source: 'project' },
  { key: 'projectDocuments', table: 'project_documents', source: 'project' },
  { key: 'zakatAssets', table: 'zakat_assets', source: 'zakat' },
  { key: 'charityProjects', table: 'charity_projects', source: 'charity' },
  { key: 'charityReminders', table: 'charity_reminders', source: 'charity' },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries', source: 'charity' },
  { key: 'charityContributors', table: 'charity_project_contributors', source: 'charity' },
];

const TEXT = {
  ar: {
    title: 'الإشعارات الذكية',
    subtitle: 'تابع التنبيهات المهمة من دخلك، مصروفاتك، مشاريعك، زكاتك، واستثماراتك في مكان واحد.',
    realOnly: 'تنبيهات من البيانات الحقيقية فقط',
    unread: 'غير مقروءة',
    today: 'اليوم',
    thisWeek: 'هذا الأسبوع',
    upcoming: 'القادمة',
    archived: 'المؤرشفة',
    highPriority: 'عالية الأهمية',
    dueToday: 'مستحقة اليوم',
    noNotifications: 'لا توجد إشعارات حالياً.',
    stable: 'كل شيء يبدو مستقراً.',
    zakatEmpty: 'لا توجد إشعارات للزكاة حالياً.',
    zakatEmptyHelper: 'عند إضافة أصول أو حسابات زكاة، ستظهر الإشعارات هنا.',
    charityEmpty: 'لا توجد إشعارات للأعمال الخيرية حالياً.',
    charityEmptyHelper: 'عند إضافة مشاريع خيرية أو مستفيدين أو تذكيرات، ستظهر الإشعارات هنا.',
    search: 'بحث في الإشعارات',
    all: 'الكل',
    income: 'الدخل',
    expense: 'المصروفات',
    goal: 'الأهداف',
    market: 'الاستثمارات',
    project: 'المشاريع',
    zakat: 'الزكاة',
    charity: 'الأعمال الخيرية',
    report: 'التقارير',
    system: 'النظام',
    general: 'عام',
    view: 'عرض',
    viewDetails: 'عرض التفاصيل',
    done: 'تم',
    archive: 'أرشفة',
    delete: 'حذف',
    markAllRead: 'تحديد الكل كمقروء',
    archiveAll: 'أرشفة الكل',
    savedSource: 'محفوظ',
    dynamicSource: 'محسوب',
    loading: 'جاري تحميل الإشعارات...',
    signIn: 'سجّل الدخول لعرض إشعاراتك.',
    loadError: 'تعذر تحميل بعض مصادر الإشعارات:',
    retry: 'إعادة المحاولة',
    sourceStored: 'الإشعارات المحفوظة',
    sourceIncome: 'الدخل',
    sourceExpense: 'المصروفات',
    sourceGoal: 'الأهداف',
    sourceMarket: 'السوق',
    sourceProject: 'المشاريع',
    sourceZakat: 'الزكاة',
    sourceCharity: 'الأعمال الخيرية',
    actionFailed: 'تعذر تنفيذ الإجراء حالياً.',
    readFailed: 'تعذر تحديث حالة القراءة.',
    archiveFailed: 'تعذر أرشفة الإشعار.',
    deleteFailed: 'تعذر حذف الإشعار.',
    confirmDelete: 'هل تريد حذف هذا الإشعار؟',
    low: 'منخفض',
    info: 'معلومة',
    success: 'نجاح',
    warning: 'تحذير',
    danger: 'عاجل',
  },
  en: {
    title: 'Smart Notifications',
    subtitle: 'Track important alerts from your income, expenses, projects, zakat, and investments in one place.',
    realOnly: 'Alerts from real data only',
    unread: 'Unread',
    today: 'Today',
    thisWeek: 'This Week',
    upcoming: 'Upcoming',
    archived: 'Archived',
    highPriority: 'High Priority',
    dueToday: 'Due Today',
    noNotifications: 'No notifications right now.',
    stable: 'Everything looks stable.',
    zakatEmpty: 'No Zakat notifications right now.',
    zakatEmptyHelper: 'When you add Zakat assets or calculations, notifications will appear here.',
    charityEmpty: 'No Charity notifications right now.',
    charityEmptyHelper: 'When you add charity projects, beneficiaries, or reminders, notifications will appear here.',
    search: 'Search notifications',
    all: 'All',
    income: 'Income',
    expense: 'Expenses',
    goal: 'Goals',
    market: 'Investments',
    project: 'Projects',
    zakat: 'Zakat',
    charity: 'Charity',
    report: 'Reports',
    system: 'System',
    general: 'General',
    view: 'View',
    viewDetails: 'View details',
    done: 'Done',
    archive: 'Archive',
    delete: 'Delete',
    markAllRead: 'Mark all as read',
    archiveAll: 'Archive all',
    savedSource: 'Stored',
    dynamicSource: 'Computed',
    loading: 'Loading notifications...',
    signIn: 'Sign in to view your notifications.',
    loadError: 'Could not load some notification sources:',
    retry: 'Retry',
    sourceStored: 'Stored notifications',
    sourceIncome: 'Income',
    sourceExpense: 'Expenses',
    sourceGoal: 'Goals',
    sourceMarket: 'Market',
    sourceProject: 'Projects',
    sourceZakat: 'Zakat',
    sourceCharity: 'Charity',
    actionFailed: 'Could not complete the action right now.',
    readFailed: 'Could not update the read status.',
    archiveFailed: 'Could not archive the notification.',
    deleteFailed: 'Could not delete the notification.',
    confirmDelete: 'Delete this notification?',
    low: 'Low',
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    danger: 'Danger',
  },
  fr: {
    title: 'Notifications intelligentes',
    subtitle: 'Suivez les alertes importantes liées à vos revenus, dépenses, projets, zakat et investissements au même endroit.',
    realOnly: 'Alertes à partir de données réelles uniquement',
    unread: 'Non lues',
    today: 'Aujourd’hui',
    thisWeek: 'Cette semaine',
    upcoming: 'À venir',
    archived: 'Archivées',
    highPriority: 'Haute priorité',
    dueToday: 'À échéance aujourd’hui',
    noNotifications: 'Aucune notification pour le moment.',
    stable: 'Tout semble stable.',
    zakatEmpty: 'Aucune notification de zakat pour le moment.',
    zakatEmptyHelper: 'Lorsque vous ajoutez des actifs ou calculs de zakat, les notifications apparaîtront ici.',
    charityEmpty: 'Aucune notification de charité pour le moment.',
    charityEmptyHelper: 'Lorsque vous ajoutez des projets caritatifs, bénéficiaires ou rappels, les notifications apparaîtront ici.',
    search: 'Rechercher des notifications',
    all: 'Tous',
    income: 'Revenus',
    expense: 'Dépenses',
    goal: 'Objectifs',
    market: 'Investissements',
    project: 'Projets',
    zakat: 'Zakat',
    charity: 'Charité',
    report: 'Rapports',
    system: 'Système',
    general: 'Général',
    view: 'Voir',
    viewDetails: 'Voir les détails',
    done: 'Terminé',
    archive: 'Archiver',
    delete: 'Supprimer',
    markAllRead: 'Tout marquer comme lu',
    archiveAll: 'Tout archiver',
    savedSource: 'Enregistrée',
    dynamicSource: 'Calculée',
    loading: 'Chargement des notifications...',
    signIn: 'Connectez-vous pour voir vos notifications.',
    loadError: 'Impossible de charger certaines sources de notifications :',
    retry: 'Réessayer',
    sourceStored: 'Notifications enregistrées',
    sourceIncome: 'Revenus',
    sourceExpense: 'Dépenses',
    sourceGoal: 'Objectifs',
    sourceMarket: 'Marché',
    sourceProject: 'Projets',
    sourceZakat: 'Zakat',
    sourceCharity: 'Charité',
    actionFailed: 'Impossible de terminer cette action pour le moment.',
    readFailed: 'Impossible de mettre à jour le statut de lecture.',
    archiveFailed: 'Impossible d’archiver la notification.',
    deleteFailed: 'Impossible de supprimer la notification.',
    confirmDelete: 'Supprimer cette notification ?',
    low: 'Faible',
    info: 'Info',
    success: 'Succès',
    warning: 'Avertissement',
    danger: 'Urgent',
  },
} as const;

const FILTERS: Array<{ id: NotificationFilter; label: keyof typeof TEXT.ar }> = [
  { id: 'all', label: 'all' },
  { id: 'unread', label: 'unread' },
  { id: 'high', label: 'highPriority' },
  { id: 'income', label: 'income' },
  { id: 'expense', label: 'expense' },
  { id: 'goal', label: 'goal' },
  { id: 'market', label: 'market' },
  { id: 'project', label: 'project' },
  { id: 'zakat', label: 'zakat' },
  { id: 'charity', label: 'charity' },
  { id: 'report', label: 'report' },
  { id: 'archived', label: 'archived' },
];

const SEVERITY_TONE: Record<SmartNotificationSeverity, string> = {
  info: '#2563EB',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
};

const TYPE_ICON: Partial<Record<SmartNotificationType, ComponentType<{ size?: number }>>> = {
  income: Wallet,
  expense: Wallet,
  goal: CheckCheck,
  market: LineChart,
  project: FileText,
  task: Clock3,
  charity: HandHeart,
  zakat: CalendarDays,
  report: FileText,
  system: ShieldAlert,
};

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dueGroup(notice: SmartNotification, lang: Lang) {
  const tr = TEXT[lang];
  if (notice.status === 'archived') return tr.archived;
  if (notice.status === 'unread') return tr.unread;
  const due = parseDate(notice.dueDate ?? notice.createdAt);
  if (!due) return tr.upcoming;
  const today = todayStart().getTime();
  const day = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diff = Math.round((day - today) / 86400000);
  if (diff === 0) return tr.today;
  if (diff > 0 && diff <= 7) return tr.thisWeek;
  return tr.upcoming;
}

function dateLabel(value: string | null | undefined, lang: Lang) {
  return formatDate(value, lang);
}

function sourceLabel(type: SmartNotificationType, lang: Lang) {
  const tr = TEXT[lang];
  if (type === 'task') return tr.project;
  if (type === 'income') return tr.income;
  if (type === 'expense') return tr.expense;
  if (type === 'goal') return tr.goal;
  if (type === 'market') return tr.market;
  if (type === 'project') return tr.project;
  if (type === 'zakat') return tr.zakat;
  if (type === 'charity') return tr.charity;
  if (type === 'report') return tr.report;
  if (type === 'system') return tr.system;
  return tr.general;
}

function sourceDiagnosticLabel(source: NotificationSourceId, lang: Lang) {
  const tr = TEXT[lang];
  const labels: Record<NotificationSourceId, string> = {
    stored: tr.sourceStored,
    income: tr.sourceIncome,
    expense: tr.sourceExpense,
    goal: tr.sourceGoal,
    market: tr.sourceMarket,
    project: tr.sourceProject,
    zakat: tr.sourceZakat,
    charity: tr.sourceCharity,
  };
  return labels[source];
}

function safeErrorCode(message: string | undefined) {
  const text = String(message ?? '').toLowerCase();
  if (text.includes('permission denied') || text.includes('row-level security') || text.includes('rls')) return 'permission_denied';
  if (text.includes('does not exist') || text.includes('relation') || text.includes('not found') || text.includes('not find') || text.includes('could not find') || text.includes('schema cache')) return 'relation_missing';
  if (text.includes('column') || text.includes('schema cache')) return 'column_missing';
  if (text.includes('timeout') || text.includes('timed out')) return 'timeout';
  if (text.includes('invalid')) return 'invalid_filter';
  return 'load_failed';
}

function isOptionalMissingTableError(message: string | undefined) {
  return safeErrorCode(message) === 'relation_missing';
}

function emptySourceDiagnostics(): Record<NotificationSourceId, SourceDiagnostic> {
  return {
    stored: { ok: true, status: 'ok_empty', count: 0, tables: ['notifications'], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    income: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    expense: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    goal: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    market: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    project: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No data yet' },
    zakat: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No zakat data yet' },
    charity: { ok: true, status: 'ok_empty', count: 0, tables: [], failedTables: [], errorCodes: [], errorDetails: {}, message: 'No charity data yet' },
  };
}

function buildSourceDiagnostics(
  records: Partial<Record<SourceKey, any[]>>,
  sourceErrors: SourceErrorDetails,
  storedCount: number,
  storedError?: string,
) {
  const diagnostics = emptySourceDiagnostics();
  diagnostics.stored.count = storedCount;
  if (storedError) {
    diagnostics.stored.ok = false;
    diagnostics.stored.failedTables = ['notifications'];
    diagnostics.stored.errorCodes = [safeErrorCode(storedError)];
    diagnostics.stored.errorDetails = { notifications: storedError };
  }

  SOURCE_TABLES.forEach(item => {
    const diagnostic = diagnostics[item.source];
    diagnostic.tables.push(item.table);
    diagnostic.count += records[item.key]?.length ?? 0;
    const error = sourceErrors[item.key];
    if (error) {
      diagnostic.ok = false;
      diagnostic.failedTables.push(item.table);
      diagnostic.errorDetails[item.table] = error;
      const code = safeErrorCode(error);
      if (!diagnostic.errorCodes.includes(code)) diagnostic.errorCodes.push(code);
    }
  });

  (['zakat', 'charity'] as NotificationSourceId[]).forEach(source => {
    const keys = OPTIONAL_EMPTY_SOURCE_KEYS[source] ?? [];
    const dataCount = keys.reduce((sum, key) => sum + (records[key]?.length ?? 0), 0);
    const errorEntries = keys
      .map(key => [key, sourceErrors[key]] as const)
      .filter((entry): entry is readonly [SourceKey, string] => Boolean(entry[1]));
    const onlyOptionalMissingTables = errorEntries.length > 0 && errorEntries.every(([, error]) => isOptionalMissingTableError(error));

    if (dataCount === 0 && onlyOptionalMissingTables) {
      const diagnostic = diagnostics[source];
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Optional source table missing: ${source}`, {
          page: 'notifications',
          source,
          tables: errorEntries.map(([key]) => SOURCE_TABLES.find(item => item.key === key)?.table ?? key),
        });
      }
      diagnostic.ok = true;
      diagnostic.status = 'ok_empty';
      diagnostic.failedTables = [];
      diagnostic.errorCodes = [];
      diagnostic.errorDetails = {};
      diagnostic.message = source === 'zakat' ? 'No zakat data yet' : 'No charity data yet';
    }
  });

  (Object.keys(diagnostics) as NotificationSourceId[]).forEach(source => {
    const diagnostic = diagnostics[source];
    if (!diagnostic.ok) {
      diagnostic.status = 'failed';
      diagnostic.message = `${source} source failed to load`;
    } else if (diagnostic.count > 0) {
      diagnostic.status = 'ok_with_data';
      diagnostic.message = undefined;
    } else {
      diagnostic.status = 'ok_empty';
      diagnostic.message = source === 'zakat'
        ? 'No zakat data yet'
        : source === 'charity'
          ? 'No charity data yet'
          : 'No data yet';
    }
  });

  return diagnostics;
}

function severityLabel(severity: SmartNotificationSeverity, lang: Lang) {
  const tr = TEXT[lang];
  return tr[severity] ?? tr.info;
}

function normalizeSeverity(value: unknown, fallback: SmartNotificationSeverity): SmartNotificationSeverity {
  const text = String(value ?? '').toLowerCase();
  if (text === 'danger' || text === 'warning' || text === 'success' || text === 'info') return text;
  return fallback;
}

function normalizeType(value: unknown): SmartNotificationType {
  const text = String(value ?? '').toLowerCase();
  if (['income', 'expense', 'goal', 'market', 'project', 'task', 'report', 'charity', 'zakat', 'system', 'general'].includes(text)) {
    return text as SmartNotificationType;
  }
  if (text === 'warning') return 'system';
  return 'general';
}

function normalizeStored(row: StoredNotificationRow): SmartNotification {
  const read = row.read === true;
  const status = row.status === 'archived' ? 'archived' : row.status === 'read' || read ? 'read' : 'unread';
  const type = normalizeType(row.source_module ?? row.type);
  const fallbackSeverity: SmartNotificationSeverity = row.type === 'warning' ? 'warning' : row.type === 'success' ? 'success' : 'info';
  return {
    id: row.id,
    title: row.title,
    message: row.message ?? '',
    type,
    severity: normalizeSeverity(row.severity, fallbackSeverity),
    sourceModule: row.source_module ?? row.type ?? 'general',
    sourceId: row.source_id ?? null,
    actionUrl: row.action_url ?? row.link ?? '/',
    status,
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    isDynamic: false,
  };
}

function normalizeSignalNotification(row: Record<string, any>): SmartNotification {
  const action = String(row.action ?? '').toLowerCase();
  const event = String(row.event ?? '').toLowerCase();
  const severity: SmartNotificationSeverity =
    event.includes('stop_loss') || event.includes('high_risk') ? 'danger'
      : action === 'sell' ? 'warning'
        : action === 'buy' ? 'success'
          : 'info';
  const symbol = String(row.symbol ?? '').trim().toUpperCase();
  return {
    id: `signal:${row.id}`,
    title: String(row.title ?? (symbol || 'Market signal')),
    message: String(row.message ?? ''),
    type: 'market',
    severity,
    sourceModule: 'signal',
    sourceId: String(row.signal_id ?? row.id ?? ''),
    actionUrl: symbol ? `/market-analysis?symbol=${encodeURIComponent(symbol)}` : '/market-analysis',
    status: row.read_at ? 'read' : 'unread',
    dueDate: null,
    createdAt: row.created_at ?? row.sent_at ?? null,
    isDynamic: true,
  };
}

function dynamicStorageKey(userId: string) {
  return `sfm_dynamic_notifications:${userId}`;
}

function readDynamicState(userId: string): LocalDynamicState {
  if (typeof window === 'undefined') return { read: [], archived: [] };
  try {
    const raw = window.localStorage.getItem(dynamicStorageKey(userId));
    if (!raw) return { read: [], archived: [] };
    const parsed = JSON.parse(raw) as Partial<LocalDynamicState>;
    return { read: Array.isArray(parsed.read) ? parsed.read : [], archived: Array.isArray(parsed.archived) ? parsed.archived : [] };
  } catch {
    return { read: [], archived: [] };
  }
}

function writeDynamicState(userId: string, state: LocalDynamicState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(dynamicStorageKey(userId), JSON.stringify(state));
}

function filterNotification(notice: SmartNotification, filter: NotificationFilter, query: string) {
  if (filter === 'unread' && notice.status !== 'unread') return false;
  if (filter === 'archived' && notice.status !== 'archived') return false;
  if (filter !== 'archived' && notice.status === 'archived') return false;
  if (filter === 'high' && notice.severity !== 'danger') return false;
  if (['income', 'expense', 'goal', 'market', 'project', 'zakat', 'charity', 'report'].includes(filter) && notice.type !== filter && !(filter === 'project' && notice.type === 'task')) return false;
  if (!query.trim()) return true;
  const haystack = `${notice.title} ${notice.message} ${notice.sourceModule}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const activeLang = (lang || 'ar') as Lang;
  const tr = TEXT[activeLang];
  const [storedNotifications, setStoredNotifications] = useState<SmartNotification[]>([]);
  const [sourceData, setSourceData] = useState<NotificationSourceData>({});
  const [dynamicState, setDynamicState] = useState<LocalDynamicState>({ read: [], archived: [] });
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceDiagnostics, setSourceDiagnostics] = useState<Record<NotificationSourceId, SourceDiagnostic>>(emptySourceDiagnostics);
  const [reloadToken, setReloadToken] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    setDynamicState(readDynamicState(user.id));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (authLoading) return;
      if (!user) {
        setStoredNotifications([]);
        setSourceData({});
        setSourceDiagnostics(emptySourceDiagnostics());
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const db = supabase as any;

      const storedFields = 'id,type,title,message,read,link,created_at,severity,source_module,source_id,action_url,status,due_date,read_at,metadata';
      let storedResult = await db.from('notifications').select(storedFields).eq('user_id', user.id).order('created_at', { ascending: false });
      if (storedResult.error) {
        storedResult = await db.from('notifications').select('id,type,title,message,read,link,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      }
      const storedError = storedResult.error?.message;

      const sourceResult = await loadUserDataTables(db, user.id, SOURCE_TABLES);
      let signalNotifications: SmartNotification[] = [];
      try {
        const response = await fetch('/api/market/signal-alerts?limit=50', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const payload = await response.json();
          const rows = Array.isArray(payload.notifications) ? payload.notifications : Array.isArray(payload.items) ? payload.items : [];
          signalNotifications = rows.map((row: Record<string, any>) => normalizeSignalNotification(row));
        }
      } catch {
        signalNotifications = [];
      }
      const nextSourceData = {
        ...(sourceResult.records as NotificationSourceData),
        income: personalIncomeRows(sourceResult.records.income ?? []),
        expenses: personalExpenseRows(sourceResult.records.expenses ?? []),
      };
      const nextDiagnostics = buildSourceDiagnostics(
        sourceResult.records as Partial<Record<SourceKey, any[]>>,
        sourceResult.errors as Partial<Record<SourceKey, string>>,
        storedResult.data?.length ?? 0,
        storedError,
      );

      if (process.env.NODE_ENV !== 'production') {
        (['zakat', 'charity'] as NotificationSourceId[]).forEach(source => {
          const diagnostic = nextDiagnostics[source];
          console.log('source status', {
            page: 'notifications',
            source,
            status: diagnostic.status,
            count: diagnostic.count,
            hasError: Object.keys(diagnostic.errorDetails).length > 0,
            errorCode: diagnostic.errorCodes[0],
            errorMessage: Object.values(diagnostic.errorDetails)[0],
          });
        });
        const failed = Object.entries(nextDiagnostics)
          .filter(([, diagnostic]) => !diagnostic.ok)
          .map(([source, diagnostic]) => ({
            source,
            failedTables: diagnostic.failedTables,
            errorCodes: diagnostic.errorCodes,
            errorDetails: diagnostic.errorDetails,
          }));
        if (failed.length > 0) console.warn('Smart Notifications source load errors', failed);
      }

      if (!cancelled) {
        setStoredNotifications([
          ...((storedResult.data ?? []) as StoredNotificationRow[]).map(normalizeStored),
          ...signalNotifications,
        ]);
        setSourceData(nextSourceData);
        setSourceDiagnostics(nextDiagnostics);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, reloadToken, user]);

  const dynamicNotifications = useMemo(() => {
    return generateSmartNotifications(sourceData, activeLang)
      .filter(notice => !dynamicState.archived.includes(notice.id))
      .map(notice => dynamicState.read.includes(notice.id) ? { ...notice, status: 'read' as const } : notice);
  }, [activeLang, dynamicState.archived, dynamicState.read, sourceData]);

  const notifications = useMemo(() => {
    const byId = new Map<string, SmartNotification>();
    storedNotifications.forEach(notice => {
      if (notice.isDynamic && dynamicState.archived.includes(notice.id)) return;
      const normalized = notice.isDynamic && dynamicState.read.includes(notice.id)
        ? { ...notice, status: 'read' as const }
        : notice;
      byId.set(`stored:${notice.id}`, normalized);
    });
    dynamicNotifications.forEach(notice => byId.set(notice.id, notice));
    return Array.from(byId.values()).sort((a, b) => {
      const severityRank = { danger: 0, warning: 1, info: 2, success: 3 } as Record<SmartNotificationSeverity, number>;
      const dueA = parseDate(a.dueDate ?? a.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const dueB = parseDate(b.dueDate ?? b.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return severityRank[a.severity] - severityRank[b.severity] || dueA - dueB;
    });
  }, [dynamicNotifications, dynamicState.archived, dynamicState.read, storedNotifications]);

  const visibleNotifications = useMemo(() => notifications.filter(notice => filterNotification(notice, filter, query)), [filter, notifications, query]);
  const failedSourceEntries = useMemo(() => {
    return (Object.entries(sourceDiagnostics) as Array<[NotificationSourceId, SourceDiagnostic]>)
      .filter(([, diagnostic]) => diagnostic.status === 'failed');
  }, [sourceDiagnostics]);
  const failedSourceNames = useMemo(
    () => failedSourceEntries.map(([source]) => sourceDiagnosticLabel(source, activeLang)),
    [activeLang, failedSourceEntries],
  );
  const filterCounts = useMemo(() => {
    return FILTERS.reduce<Record<NotificationFilter, number>>((acc, item) => {
      acc[item.id] = notifications.filter(notice => filterNotification(notice, item.id, '')).length;
      return acc;
    }, {} as Record<NotificationFilter, number>);
  }, [notifications]);
  const activeEmptySource = filter === 'zakat' || filter === 'charity' ? sourceDiagnostics[filter] : null;

  const grouped = useMemo(() => {
    const order = [tr.unread, tr.today, tr.thisWeek, tr.upcoming, tr.archived];
    const groups = visibleNotifications.reduce<Record<string, SmartNotification[]>>((acc, notice) => {
      const label = dueGroup(notice, activeLang);
      acc[label] = [...(acc[label] ?? []), notice];
      return acc;
    }, {});
    return order.filter(label => groups[label]?.length).map(label => [label, groups[label]] as const);
  }, [activeLang, tr.archived, tr.thisWeek, tr.today, tr.unread, tr.upcoming, visibleNotifications]);

  const summary = useMemo(() => {
    const active = notifications.filter(notice => notice.status !== 'archived');
    const today = dateOnly(todayStart());
    return {
      unread: active.filter(notice => notice.status === 'unread').length,
      high: active.filter(notice => notice.severity === 'danger').length,
      dueToday: active.filter(notice => notice.dueDate === today).length,
      thisWeek: active.filter(notice => {
        const due = parseDate(notice.dueDate ?? '');
        if (!due) return false;
        const diff = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - todayStart().getTime()) / 86400000);
        return diff >= 0 && diff <= 7;
      }).length,
    };
  }, [notifications]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2600);
  }, []);

  const updateDynamicState = useCallback((updater: (state: LocalDynamicState) => LocalDynamicState) => {
    if (!user) return;
    setDynamicState(current => {
      const next = updater(current);
      writeDynamicState(user.id, next);
      return next;
    });
  }, [user]);

  const markAsRead = useCallback(async (notice: SmartNotification) => {
    if (notice.sourceModule === 'signal') {
      updateDynamicState(state => ({ ...state, read: Array.from(new Set([...state.read, notice.id])) }));
      const rawId = notice.id.startsWith('signal:') ? notice.id.slice('signal:'.length) : notice.id;
      await fetch('/api/market/signal-alerts/read', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [rawId] }),
      }).catch(() => undefined);
      return;
    }
    if (notice.isDynamic) {
      updateDynamicState(state => ({ ...state, read: Array.from(new Set([...state.read, notice.id])) }));
      return;
    }
    const db = supabase as any;
    const payload = { read: true, status: 'read', read_at: new Date().toISOString() };
    const { error } = await db.from('notifications').update(payload).eq('id', notice.id);
    if (error) {
      const fallback = await db.from('notifications').update({ read: true }).eq('id', notice.id);
      if (fallback.error) {
        console.warn('Smart Notifications action failed', { action: 'markAsRead', notificationId: notice.id, errorCode: safeErrorCode(fallback.error.message) });
        showToast(`${tr.readFailed} ${fallback.error.message}`);
        return;
      }
    }
    setStoredNotifications(current => current.map(item => item.id === notice.id ? { ...item, status: 'read' } : item));
  }, [showToast, tr.readFailed, updateDynamicState]);

  const archiveNotice = useCallback(async (notice: SmartNotification) => {
    if (notice.isDynamic) {
      updateDynamicState(state => ({ read: state.read, archived: Array.from(new Set([...state.archived, notice.id])) }));
      return;
    }
    const db = supabase as any;
    const { error } = await db.from('notifications').update({ status: 'archived', read: true, read_at: new Date().toISOString() }).eq('id', notice.id);
    if (error) {
      console.warn('Smart Notifications action failed', { action: 'archive', notificationId: notice.id, errorCode: safeErrorCode(error.message) });
      showToast(`${tr.archiveFailed} ${error.message}`);
      return;
    }
    setStoredNotifications(current => current.map(item => item.id === notice.id ? { ...item, status: 'archived' } : item));
  }, [showToast, tr.archiveFailed, updateDynamicState]);

  const deleteNotice = useCallback(async (notice: SmartNotification) => {
    if (typeof window !== 'undefined' && !window.confirm(tr.confirmDelete)) return;
    if (notice.isDynamic) {
      updateDynamicState(state => ({ read: state.read.filter(id => id !== notice.id), archived: Array.from(new Set([...state.archived, notice.id])) }));
      return;
    }
    const db = supabase as any;
    const { error } = await db.from('notifications').delete().eq('id', notice.id);
    if (error) {
      console.warn('Smart Notifications action failed', { action: 'delete', notificationId: notice.id, errorCode: safeErrorCode(error.message) });
      showToast(`${tr.deleteFailed} ${error.message}`);
      return;
    }
    setStoredNotifications(current => current.filter(item => item.id !== notice.id));
  }, [showToast, tr.confirmDelete, tr.deleteFailed, updateDynamicState]);

  const markAllAsRead = useCallback(async () => {
    const targets = visibleNotifications.filter(notice => notice.status === 'unread');
    const storedIds = targets.filter(notice => !notice.isDynamic).map(notice => notice.id);
    const dynamicIds = targets.filter(notice => notice.isDynamic).map(notice => notice.id);
    if (storedIds.length) {
      const db = supabase as any;
      const { error } = await db.from('notifications').update({ read: true, status: 'read', read_at: new Date().toISOString() }).in('id', storedIds);
      if (error) {
        console.warn('Smart Notifications action failed', { action: 'markAllAsRead', count: storedIds.length, errorCode: safeErrorCode(error.message) });
        showToast(`${tr.readFailed} ${error.message}`);
        return;
      }
      setStoredNotifications(current => current.map(item => storedIds.includes(item.id) ? { ...item, status: 'read' } : item));
    }
    if (dynamicIds.length) updateDynamicState(state => ({ ...state, read: Array.from(new Set([...state.read, ...dynamicIds])) }));
  }, [showToast, tr.readFailed, updateDynamicState, visibleNotifications]);

  const archiveAll = useCallback(async () => {
    const targets = visibleNotifications.filter(notice => notice.status !== 'archived');
    const storedIds = targets.filter(notice => !notice.isDynamic).map(notice => notice.id);
    const dynamicIds = targets.filter(notice => notice.isDynamic).map(notice => notice.id);
    if (storedIds.length) {
      const db = supabase as any;
      const { error } = await db.from('notifications').update({ status: 'archived', read: true, read_at: new Date().toISOString() }).in('id', storedIds);
      if (error) {
        console.warn('Smart Notifications action failed', { action: 'archiveAll', count: storedIds.length, errorCode: safeErrorCode(error.message) });
        showToast(`${tr.archiveFailed} ${error.message}`);
        return;
      }
      setStoredNotifications(current => current.map(item => storedIds.includes(item.id) ? { ...item, status: 'archived' } : item));
    }
    if (dynamicIds.length) updateDynamicState(state => ({ ...state, archived: Array.from(new Set([...state.archived, ...dynamicIds])) }));
  }, [showToast, tr.archiveFailed, updateDynamicState, visibleNotifications]);

  if (authLoading || isLoading) {
    return (
      <main className="notif-shell" dir={dir}>
        <Sidebar />
        <section className="notif-page loading-state">
          <Loader2 className="spin" size={30} />
          <span>{tr.loading}</span>
        </section>
        <style>{styles}</style>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="notif-shell" dir={dir}>
        <Sidebar />
        <section className="notif-page">
          <section className="hero">
            <div>
              <span className="eyebrow">{tr.realOnly}</span>
              <h1>{tr.title}</h1>
              <p>{tr.signIn}</p>
            </div>
          </section>
        </section>
        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="notif-shell" dir={dir}>
      <Sidebar />
      <section className="notif-page">
        <header className="topbar">
          <div>
            <span>THE SFM</span>
            <strong>{tr.title}</strong>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow"><Bell size={15} /> {tr.realOnly}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={markAllAsRead} aria-label={tr.markAllRead}><CheckCheck size={17} /> {tr.markAllRead}</button>
            <button type="button" onClick={archiveAll} aria-label={tr.archiveAll}><Archive size={17} /> {tr.archiveAll}</button>
          </div>
        </section>

        <section className="summary-grid" aria-label={tr.title}>
          <SummaryCard label={tr.unread} value={summary.unread} icon={<Bell size={18} />} />
          <SummaryCard label={tr.highPriority} value={summary.high} icon={<ShieldAlert size={18} />} />
          <SummaryCard label={tr.dueToday} value={summary.dueToday} icon={<CalendarDays size={18} />} />
          <SummaryCard label={tr.thisWeek} value={summary.thisWeek} icon={<Clock3 size={18} />} />
        </section>

        {failedSourceEntries.length > 0 && (
          <div className="load-warning" role="status">
            <div>
              <strong>{tr.loadError}</strong>
              <span>{failedSourceNames.join('، ')}</span>
              {process.env.NODE_ENV !== 'production' && (
                <small>
                  {failedSourceEntries.map(([source, diagnostic]) => `${source}: ${diagnostic.errorCodes.join('|') || 'load_failed'} (${diagnostic.failedTables.join(', ')})`).join(' / ')}
                </small>
              )}
            </div>
            <button type="button" onClick={() => setReloadToken(token => token + 1)}>{tr.retry}</button>
          </div>
        )}

        {toastMessage && <div className="action-toast" role="alert">{toastMessage}</div>}

        <section className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr.search} aria-label={tr.search} />
          </label>
          <div className="filters" role="group" aria-label={tr.title}>
            {FILTERS.map(item => (
              <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>
                {tr[item.label]} <span>{filterCounts[item.id]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="notification-list">
          {grouped.length === 0 ? (
            <div className="empty">
              <Bell size={42} />
              <strong>{activeEmptySource?.status === 'ok_empty' && filter === 'zakat' ? tr.zakatEmpty : activeEmptySource?.status === 'ok_empty' && filter === 'charity' ? tr.charityEmpty : tr.noNotifications}</strong>
              <p>{activeEmptySource?.status === 'ok_empty' && filter === 'zakat' ? tr.zakatEmptyHelper : activeEmptySource?.status === 'ok_empty' && filter === 'charity' ? tr.charityEmptyHelper : tr.stable}</p>
            </div>
          ) : grouped.map(([label, items]) => (
            <div key={label} className="group">
              <h2>{label}</h2>
              <div className="cards">
                {items.map(notice => {
                  const Icon = TYPE_ICON[notice.type] ?? Bell;
                  return (
                    <article key={`${notice.isDynamic ? 'd' : 's'}-${notice.id}`} className={`notice-card ${notice.status}`}>
                      <div className="notice-icon" style={{ color: SEVERITY_TONE[notice.severity], background: `${SEVERITY_TONE[notice.severity]}12` }}>
                        <Icon size={20} />
                      </div>
                      <div className="notice-content">
                        <div className="notice-head">
                          <div>
                            <h3>{notice.title}</h3>
                            <p>{notice.message}</p>
                          </div>
                          <span className="severity" style={{ color: SEVERITY_TONE[notice.severity], background: `${SEVERITY_TONE[notice.severity]}12`, borderColor: `${SEVERITY_TONE[notice.severity]}30` }}>
                            {severityLabel(notice.severity, activeLang)}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span>{sourceLabel(notice.type, activeLang)}</span>
                          {notice.dueDate && <span>{dateLabel(notice.dueDate, activeLang)}</span>}
                          <span>{notice.isDynamic ? tr.dynamicSource : tr.savedSource}</span>
                        </div>
                        <div className="actions">
                          <button type="button" className="view-action" onClick={() => router.push(notice.actionUrl || '/')} aria-label={`${tr.viewDetails}: ${notice.title}`}>
                            <Eye size={15} /> {tr.viewDetails}
                          </button>
                          {notice.status === 'unread' && (
                            <button type="button" onClick={() => markAsRead(notice)} aria-label={`${tr.done}: ${notice.title}`}>
                              <CheckCheck size={15} /> {tr.done}
                            </button>
                          )}
                          <button type="button" onClick={() => archiveNotice(notice)} aria-label={`${tr.archive}: ${notice.title}`}>
                            <Archive size={15} /> {tr.archive}
                          </button>
                          <button type="button" className="danger-action" onClick={() => deleteNotice(notice)} aria-label={`${tr.delete}: ${notice.title}`}>
                            <Trash2 size={15} /> {tr.delete}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </section>
      <style>{styles}</style>
    </main>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <article className="summary-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

const styles = `
  .notif-shell{min-height:100vh;background:var(--sfm-background);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
  .notif-page{width:calc(100% - 230px);max-width:1320px;margin:0 auto;margin-inline-start:230px;margin-inline-end:auto;padding:22px 24px 60px;display:grid;gap:18px;min-width:0;overflow-x:hidden}
  [dir="ltr"] .notif-page{margin-inline-start:230px;margin-inline-end:auto}
  .loading-state{min-height:100vh;place-items:center;color:var(--sfm-primary);font-weight:950}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px}.topbar span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900}.topbar strong{font-size:24px}
  .hero{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:30px;padding:clamp(24px,5vw,44px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:0 24px 80px rgba(3,18,37,.22);min-width:0;overflow:hidden}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.22);background:rgba(167,243,240,.1);border-radius:999px;padding:8px 13px;color:var(--sfm-soft-cyan);font-size:12px;font-weight:950}
  .hero h1{margin:18px 0 10px;font-size:clamp(34px,7vw,62px);line-height:1;font-weight:950}.hero p{margin:0;max-width:780px;color:rgba(234,246,255,.76);font-size:clamp(15px,2vw,18px);line-height:1.8;font-weight:800}
  .hero-actions{display:flex;gap:8px;flex-wrap:wrap}.hero-actions button,.actions button{border:0;border-radius:var(--r-md);display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:40px;padding:0 12px}.hero-actions button{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.hero-actions button+button{background:rgba(234,246,255,.12);color:var(--sfm-card);border:1px solid rgba(167,243,240,.18)}
  .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;min-width:0}.summary-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:var(--r-xl);padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}.summary-card>span{width:42px;height:42px;border-radius:var(--r-lg);display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);flex:0 0 auto}.summary-card strong{display:block;font-size:26px;color:var(--sfm-primary-dark)}.summary-card small{display:block;color:var(--sfm-muted);font-weight:900;line-height:1.45;overflow-wrap:anywhere}
  .load-warning{background:#FFF7ED;border:1px solid rgba(154,94,13,.18);color:#7A4B09;border-radius:var(--r-lg);padding:12px 14px;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}.load-warning div{display:grid;gap:4px;min-width:0}.load-warning strong,.load-warning span,.load-warning small{overflow-wrap:anywhere}.load-warning small{font-size:11px;color:#9A5E0D;font-weight:800}.load-warning button{border:1px solid rgba(154,94,13,.24);background:#FFFFFF;color:#7A4B09;border-radius:var(--r-md);min-height:36px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}
  .action-toast{position:fixed;inset:auto 24px 24px auto;z-index:60;max-width:min(420px,calc(100vw - 32px));background:#111827;color:#FFFFFF;border:1px solid rgba(255,255,255,.12);border-radius:var(--r-lg);padding:12px 14px;box-shadow:0 18px 50px rgba(3,18,37,.24);font-weight:900;line-height:1.5}
  .toolbar{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:var(--r-2xl);padding:14px;display:grid;gap:12px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0;overflow:hidden}
  .search-field{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);border-radius:var(--r-lg);padding:0 12px;min-height:44px;color:var(--sfm-primary);min-width:0}.search-field input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--sfm-primary-dark);font:900 13px Tajawal,Arial,sans-serif}
  .filters{display:flex;gap:8px;overflow-x:auto;max-width:100%;padding-bottom:2px;scrollbar-width:thin;overscroll-behavior-inline:contain}.filters button{flex:0 0 auto;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:999px;min-height:38px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:7px}.filters button span{min-width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;background:rgba(29,140,255,.10);color:inherit;font-size:11px;padding:0 6px}.filters button.active,.filters button:focus-visible{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.14)}
  .notification-list{display:grid;gap:18px;min-width:0}.group{display:grid;gap:10px;min-width:0}.group h2{margin:0;color:var(--sfm-midnight);font-size:20px;font-weight:950}.cards{display:grid;gap:10px;min-width:0}
  .notice-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:var(--r-xl);padding:15px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0;max-width:100%;overflow:hidden}.notice-card.unread{border-color:rgba(29,140,255,.28);background:var(--sfm-light-card)}.notice-card.archived{opacity:.72;background:var(--sfm-light-card)}
  .notice-icon{width:44px;height:44px;border-radius:var(--r-lg);display:grid;place-items:center;flex:0 0 auto}.notice-content{min-width:0;display:grid;gap:10px}.notice-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start;min-width:0}.notice-head h3{margin:0 0 5px;color:var(--sfm-primary-dark);font-size:16px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.notice-head p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.65;overflow-wrap:anywhere;text-align:start}
  .severity{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;white-space:nowrap}.meta-row{display:flex;gap:7px;flex-wrap:wrap}.meta-row span{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);color:var(--sfm-muted);border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}
  .actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.actions button{border:1px solid rgba(29,140,255,.18);background:#FFFFFF;color:var(--sfm-primary-dark);box-shadow:0 8px 18px rgba(3,18,37,.05);transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}.actions button:hover{transform:translateY(-1px);border-color:rgba(24,212,212,.34);background:rgba(24,212,212,.08);box-shadow:0 12px 24px rgba(3,18,37,.08)}.actions .view-action{border-color:rgba(24,212,212,.26);background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-card-dark));color:#EAF6FF}.actions .view-action:hover{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-card-dark));color:#FFFFFF}.actions .danger-action{background:#FEF2F2;color:#B91C1C;border-color:rgba(185,28,28,.18)}
  .empty{text-align:center;padding:54px 20px;color:var(--sfm-muted);background:var(--sfm-card);border:1px dashed rgba(29,140,255,.24);border-radius:var(--r-2xl)}.empty svg{color:var(--sfm-primary);margin-bottom:12px}.empty strong{display:block;color:var(--sfm-primary-dark);font-size:19px}.empty p{margin:8px 0 0;color:var(--sfm-muted);font-weight:900}
  button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}
  @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr}.hero-actions button{flex:1 1 180px}}
  @media(max-width:1024px){.notif-page{width:100%;max-width:100%;margin:0;padding:calc(74px + env(safe-area-inset-top)) 16px 44px}}
  @media(max-width:680px){.summary-grid{grid-template-columns:1fr}.notice-card{grid-template-columns:1fr}.notice-head{grid-template-columns:1fr}.severity{justify-self:start}.hero{border-radius:var(--r-2xl)}.hero-actions{display:grid}.hero-actions button{width:100%}.actions button{flex:1 1 130px}.topbar{align-items:flex-start}.load-warning{display:grid}.load-warning button{width:100%}.action-toast{inset:auto 16px 16px 16px}}
`;
