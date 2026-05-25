'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock3,
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
    done: 'تم',
    archive: 'أرشفة',
    delete: 'حذف',
    markAllRead: 'تحديد الكل كمقروء',
    archiveAll: 'أرشفة الكل',
    savedSource: 'محفوظ',
    dynamicSource: 'محسوب',
    loading: 'جاري تحميل الإشعارات...',
    signIn: 'سجّل الدخول لعرض إشعاراتك.',
    loadError: 'تعذر تحميل بعض مصادر الإشعارات حالياً.',
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
    done: 'Done',
    archive: 'Archive',
    delete: 'Delete',
    markAllRead: 'Mark all as read',
    archiveAll: 'Archive all',
    savedSource: 'Stored',
    dynamicSource: 'Computed',
    loading: 'Loading notifications...',
    signIn: 'Sign in to view your notifications.',
    loadError: 'Could not load some notification sources right now.',
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
    done: 'Terminé',
    archive: 'Archiver',
    delete: 'Supprimer',
    markAllRead: 'Tout marquer comme lu',
    archiveAll: 'Tout archiver',
    savedSource: 'Enregistrée',
    dynamicSource: 'Calculée',
    loading: 'Chargement des notifications...',
    signIn: 'Connectez-vous pour voir vos notifications.',
    loadError: 'Impossible de charger certaines sources de notifications pour le moment.',
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
  warning: '#9A5E0D',
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
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
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
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

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
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const db = supabase as any;
      const nextErrors: string[] = [];

      const storedFields = 'id,type,title,message,read,link,created_at,severity,source_module,source_id,action_url,status,due_date,read_at,metadata';
      let storedResult = await db.from('notifications').select(storedFields).eq('user_id', user.id).order('created_at', { ascending: false });
      if (storedResult.error) {
        storedResult = await db.from('notifications').select('id,type,title,message,read,link,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      }
      if (storedResult.error) nextErrors.push(storedResult.error.message);

      const nextSourceData: NotificationSourceData = {};
      await Promise.all(SOURCE_TABLES.map(async item => {
        try {
          const { data, error } = await db.from(item.table).select('*').eq('user_id', user.id).limit(1000);
          if (error) {
            nextSourceData[item.key] = [];
            nextErrors.push(error.message);
          } else {
            nextSourceData[item.key] = data ?? [];
          }
        } catch (error) {
          nextSourceData[item.key] = [];
          nextErrors.push(error instanceof Error ? error.message : 'Load error');
        }
      }));

      if (!cancelled) {
        setStoredNotifications(((storedResult.data ?? []) as StoredNotificationRow[]).map(normalizeStored));
        setSourceData(nextSourceData);
        setLoadErrors(nextErrors);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const dynamicNotifications = useMemo(() => {
    return generateSmartNotifications(sourceData, activeLang)
      .filter(notice => !dynamicState.archived.includes(notice.id))
      .map(notice => dynamicState.read.includes(notice.id) ? { ...notice, status: 'read' as const } : notice);
  }, [activeLang, dynamicState.archived, dynamicState.read, sourceData]);

  const notifications = useMemo(() => {
    const byId = new Map<string, SmartNotification>();
    storedNotifications.forEach(notice => byId.set(`stored:${notice.id}`, notice));
    dynamicNotifications.forEach(notice => byId.set(notice.id, notice));
    return Array.from(byId.values()).sort((a, b) => {
      const severityRank = { danger: 0, warning: 1, info: 2, success: 3 } as Record<SmartNotificationSeverity, number>;
      const dueA = parseDate(a.dueDate ?? a.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const dueB = parseDate(b.dueDate ?? b.createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return severityRank[a.severity] - severityRank[b.severity] || dueA - dueB;
    });
  }, [dynamicNotifications, storedNotifications]);

  const visibleNotifications = useMemo(() => notifications.filter(notice => filterNotification(notice, filter, query)), [filter, notifications, query]);

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

  const updateDynamicState = useCallback((updater: (state: LocalDynamicState) => LocalDynamicState) => {
    if (!user) return;
    setDynamicState(current => {
      const next = updater(current);
      writeDynamicState(user.id, next);
      return next;
    });
  }, [user]);

  const markAsRead = useCallback(async (notice: SmartNotification) => {
    if (notice.isDynamic) {
      updateDynamicState(state => ({ ...state, read: Array.from(new Set([...state.read, notice.id])) }));
      return;
    }
    const db = supabase as any;
    const payload = { read: true, status: 'read', read_at: new Date().toISOString() };
    const { error } = await db.from('notifications').update(payload).eq('id', notice.id);
    if (error) await db.from('notifications').update({ read: true }).eq('id', notice.id);
    setStoredNotifications(current => current.map(item => item.id === notice.id ? { ...item, status: 'read' } : item));
  }, [updateDynamicState]);

  const archiveNotice = useCallback(async (notice: SmartNotification) => {
    if (notice.isDynamic) {
      updateDynamicState(state => ({ read: state.read, archived: Array.from(new Set([...state.archived, notice.id])) }));
      return;
    }
    const db = supabase as any;
    const { error } = await db.from('notifications').update({ status: 'archived', read: true, read_at: new Date().toISOString() }).eq('id', notice.id);
    if (error) await db.from('notifications').update({ read: true }).eq('id', notice.id);
    setStoredNotifications(current => current.map(item => item.id === notice.id ? { ...item, status: 'archived' } : item));
  }, [updateDynamicState]);

  const deleteNotice = useCallback(async (notice: SmartNotification) => {
    if (notice.isDynamic) {
      updateDynamicState(state => ({ read: state.read.filter(id => id !== notice.id), archived: Array.from(new Set([...state.archived, notice.id])) }));
      return;
    }
    const db = supabase as any;
    await db.from('notifications').delete().eq('id', notice.id);
    setStoredNotifications(current => current.filter(item => item.id !== notice.id));
  }, [updateDynamicState]);

  const markAllAsRead = useCallback(async () => {
    const targets = visibleNotifications.filter(notice => notice.status === 'unread');
    const storedIds = targets.filter(notice => !notice.isDynamic).map(notice => notice.id);
    const dynamicIds = targets.filter(notice => notice.isDynamic).map(notice => notice.id);
    if (storedIds.length) {
      const db = supabase as any;
      await db.from('notifications').update({ read: true, status: 'read', read_at: new Date().toISOString() }).in('id', storedIds);
      setStoredNotifications(current => current.map(item => storedIds.includes(item.id) ? { ...item, status: 'read' } : item));
    }
    if (dynamicIds.length) updateDynamicState(state => ({ ...state, read: Array.from(new Set([...state.read, ...dynamicIds])) }));
  }, [updateDynamicState, visibleNotifications]);

  const archiveAll = useCallback(async () => {
    const targets = visibleNotifications.filter(notice => notice.status !== 'archived');
    const storedIds = targets.filter(notice => !notice.isDynamic).map(notice => notice.id);
    const dynamicIds = targets.filter(notice => notice.isDynamic).map(notice => notice.id);
    if (storedIds.length) {
      const db = supabase as any;
      await db.from('notifications').update({ status: 'archived', read: true, read_at: new Date().toISOString() }).in('id', storedIds);
      setStoredNotifications(current => current.map(item => storedIds.includes(item.id) ? { ...item, status: 'archived' } : item));
    }
    if (dynamicIds.length) updateDynamicState(state => ({ ...state, archived: Array.from(new Set([...state.archived, ...dynamicIds])) }));
  }, [updateDynamicState, visibleNotifications]);

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

        {loadErrors.length > 0 && <div className="load-warning">{tr.loadError}</div>}

        <section className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={tr.search} aria-label={tr.search} />
          </label>
          <div className="filters" role="group" aria-label={tr.title}>
            {FILTERS.map(item => (
              <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>
                {tr[item.label]}
              </button>
            ))}
          </div>
        </section>

        <section className="notification-list">
          {grouped.length === 0 ? (
            <div className="empty">
              <Bell size={42} />
              <strong>{tr.noNotifications}</strong>
              <p>{tr.stable}</p>
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
                          <button type="button" onClick={() => router.push(notice.actionUrl || '/')} aria-label={`${tr.view}: ${notice.title}`}>
                            {tr.view} <ChevronRight size={15} />
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
  .notif-shell{min-height:100vh;background:#F5F1E8;color:#2B1A0F;font-family:Tajawal,Arial,sans-serif}
  .notif-page{margin-inline-end:230px;padding:22px;display:grid;gap:18px;min-width:0}
  [dir="ltr"] .notif-page{margin-inline-end:0;margin-inline-start:230px}
  .loading-state{min-height:100vh;place-items:center;color:#BA7517;font-weight:950}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px}.topbar span{display:block;color:#9A6C3C;font-size:12px;font-weight:900}.topbar strong{font-size:24px}
  .hero{background:linear-gradient(135deg,#1A0F05,#2B1A0F 58%,#8A5514 145%);color:#FFFDF8;border-radius:30px;padding:clamp(24px,5vw,44px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:0 24px 80px rgba(43,26,15,.22)}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(250,199,117,.22);background:rgba(250,199,117,.1);border-radius:999px;padding:8px 13px;color:#FAC775;font-size:12px;font-weight:950}
  .hero h1{margin:18px 0 10px;font-size:clamp(34px,7vw,62px);line-height:1;font-weight:950}.hero p{margin:0;max-width:780px;color:rgba(255,253,248,.76);font-size:clamp(15px,2vw,18px);line-height:1.8;font-weight:800}
  .hero-actions{display:flex;gap:8px;flex-wrap:wrap}.hero-actions button,.actions button{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:40px;padding:0 12px}.hero-actions button{background:linear-gradient(135deg,#BA7517,#EF9F27);color:#211207}.hero-actions button+button{background:rgba(255,253,248,.12);color:#FFFDF8;border:1px solid rgba(250,199,117,.18)}
  .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:20px;padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 14px 38px rgba(43,26,15,.06);min-width:0}.summary-card>span{width:42px;height:42px;border-radius:15px;display:grid;place-items:center;background:#FAEEDA;color:#BA7517}.summary-card strong{display:block;font-size:26px;color:#2B1A0F}.summary-card small{color:#7A5A3C;font-weight:900}
  .load-warning{background:#FFF4DE;border:1px solid rgba(154,94,13,.18);color:#7A4B09;border-radius:15px;padding:12px 14px;font-weight:900}
  .toolbar{background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:22px;padding:14px;display:grid;gap:12px;box-shadow:0 14px 38px rgba(43,26,15,.06)}
  .search-field{display:flex;align-items:center;gap:8px;border:1px solid rgba(186,117,23,.18);background:#F7F3EA;border-radius:15px;padding:0 12px;min-height:44px;color:#8A5A20}.search-field input{width:100%;border:0;background:transparent;outline:0;color:#2B1A0F;font:900 13px Tajawal,Arial,sans-serif}
  .filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}.filters button{flex:0 0 auto;border:1px solid rgba(186,117,23,.18);background:#FFF8EA;color:#5B4332;border-radius:999px;min-height:38px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.filters button.active,.filters button:focus-visible{background:#2B1A0F;color:#FAC775;outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.14)}
  .notification-list{display:grid;gap:18px}.group{display:grid;gap:10px}.group h2{margin:0;color:#3D2914;font-size:20px;font-weight:950}.cards{display:grid;gap:10px}
  .notice-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(43,26,15,.06);min-width:0}.notice-card.unread{border-color:rgba(186,117,23,.28);background:#FFF8EA}.notice-card.archived{opacity:.72;background:#F7F3EA}
  .notice-icon{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;flex:0 0 auto}.notice-content{min-width:0;display:grid;gap:10px}.notice-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.notice-head h3{margin:0 0 5px;color:#2B1A0F;font-size:16px;font-weight:950;line-height:1.35}.notice-head p{margin:0;color:#6D5647;font-size:13px;font-weight:800;line-height:1.65}
  .severity{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;white-space:nowrap}.meta-row{display:flex;gap:7px;flex-wrap:wrap}.meta-row span{background:#F7F3EA;border:1px solid rgba(186,117,23,.12);color:#7A5A3C;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}
  .actions{display:flex;gap:7px;flex-wrap:wrap}.actions button{background:#2B1A0F;color:#FFFDF8}.actions button:nth-child(2),.actions button:nth-child(3){background:#FAEEDA;color:#854F0B}.actions .danger-action{background:#FCEBEB;color:#991B1B}
  .empty{text-align:center;padding:54px 20px;color:#9A6C3C;background:#FFFDF8;border:1px dashed rgba(186,117,23,.24);border-radius:22px}.empty svg{color:#BA7517;margin-bottom:12px}.empty strong{display:block;color:#2B1A0F;font-size:19px}.empty p{margin:8px 0 0;color:#7A5A3C;font-weight:900}
  button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.18)}
  @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr}.hero-actions button{flex:1 1 180px}}
  @media(max-width:1024px){.notif-page{margin:0;padding:calc(74px + env(safe-area-inset-top)) 14px 44px}}
  @media(max-width:680px){.summary-grid{grid-template-columns:1fr}.notice-card{grid-template-columns:1fr}.notice-head{grid-template-columns:1fr}.severity{justify-self:start}.hero{border-radius:22px}.hero-actions{display:grid}.hero-actions button{width:100%}.actions button{flex:1 1 130px}.topbar{align-items:flex-start}}
`;
