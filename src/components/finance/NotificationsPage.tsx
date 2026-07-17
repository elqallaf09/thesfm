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
  LineChart,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotificationEvents } from '@/hooks/useNotificationEvents';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/formatDate';
import type {
  SmartNotification,
  SmartNotificationSeverity,
  SmartNotificationType,
} from '@/lib/notifications/generateNotifications';

type Lang = 'ar' | 'en' | 'fr';
type NotificationFilter = 'all' | 'unread' | 'high' | 'market' | 'project' | 'report' | 'system' | 'archived';
type LocalDynamicState = { read: string[]; archived: string[] };

const TEXT = {
  ar: {
    title: 'مركز الإشعارات',
    subtitle: 'إشعارات حقيقية فقط: تنبيهات السوق، اكتمال التقارير والتحليلات، الأمان، النسخ الاحتياطي، والمراجعات المطلوبة.',
    eyebrow: 'إشعارات النظام والأحداث',
    unread: 'غير مقروءة', high: 'عالية الأهمية', today: 'وصلت اليوم', system: 'النظام',
    all: 'الكل', market: 'السوق', project: 'المشاريع والمستندات', report: 'التقارير', archived: 'المؤرشفة',
    search: 'بحث في الإشعارات', loading: 'جاري تحميل الإشعارات...', signIn: 'سجّل الدخول لعرض إشعاراتك.',
    empty: 'لا توجد إشعارات في هذا القسم.', emptyBody: 'ستظهر هنا أحداث النظام والتنبيهات الحقيقية عند وصولها.',
    markAllRead: 'تحديد الكل كمقروء', archiveAll: 'أرشفة الكل', retry: 'إعادة المحاولة', loadError: 'تعذر تحميل الإشعارات.',
    view: 'عرض التفاصيل', done: 'تم', archive: 'أرشفة', delete: 'حذف', confirmDelete: 'هل تريد حذف هذا الإشعار؟',
    actionFailed: 'تعذر تنفيذ الإجراء حالياً.', todayGroup: 'اليوم', earlierGroup: 'سابقاً', archivedGroup: 'المؤرشفة',
    general: 'عام', sourceSystem: 'النظام', sourceMarket: 'السوق', sourceProject: 'المشاريع', sourceReport: 'التقارير',
    danger: 'عاجل', warning: 'تحذير', info: 'معلومة', success: 'مكتمل',
  },
  en: {
    title: 'Notification Center',
    subtitle: 'Real notifications only: market alerts, completed reports and analysis, security, backups, and items requiring review.',
    eyebrow: 'System and event notifications',
    unread: 'Unread', high: 'High importance', today: 'Received today', system: 'System',
    all: 'All', market: 'Market', project: 'Projects & documents', report: 'Reports', archived: 'Archived',
    search: 'Search notifications', loading: 'Loading notifications...', signIn: 'Sign in to view your notifications.',
    empty: 'No notifications in this section.', emptyBody: 'System events and real alerts will appear here when they arrive.',
    markAllRead: 'Mark all as read', archiveAll: 'Archive all', retry: 'Retry', loadError: 'Notifications could not be loaded.',
    view: 'View details', done: 'Done', archive: 'Archive', delete: 'Delete', confirmDelete: 'Delete this notification?',
    actionFailed: 'The action could not be completed right now.', todayGroup: 'Today', earlierGroup: 'Earlier', archivedGroup: 'Archived',
    general: 'General', sourceSystem: 'System', sourceMarket: 'Market', sourceProject: 'Projects', sourceReport: 'Reports',
    danger: 'Urgent', warning: 'Warning', info: 'Info', success: 'Completed',
  },
  fr: {
    title: 'Centre de notifications',
    subtitle: 'Uniquement de vraies notifications : alertes marché, rapports et analyses terminés, sécurité, sauvegardes et éléments à vérifier.',
    eyebrow: 'Notifications système et événements',
    unread: 'Non lues', high: 'Importance élevée', today: 'Reçues aujourd’hui', system: 'Système',
    all: 'Toutes', market: 'Marché', project: 'Projets et documents', report: 'Rapports', archived: 'Archivées',
    search: 'Rechercher', loading: 'Chargement des notifications...', signIn: 'Connectez-vous pour voir vos notifications.',
    empty: 'Aucune notification dans cette section.', emptyBody: 'Les événements système et les vraies alertes apparaîtront ici.',
    markAllRead: 'Tout marquer comme lu', archiveAll: 'Tout archiver', retry: 'Réessayer', loadError: 'Impossible de charger les notifications.',
    view: 'Voir les détails', done: 'Terminé', archive: 'Archiver', delete: 'Supprimer', confirmDelete: 'Supprimer cette notification ?',
    actionFailed: 'Impossible de terminer cette action.', todayGroup: 'Aujourd’hui', earlierGroup: 'Plus tôt', archivedGroup: 'Archivées',
    general: 'Général', sourceSystem: 'Système', sourceMarket: 'Marché', sourceProject: 'Projets', sourceReport: 'Rapports',
    danger: 'Urgent', warning: 'Avertissement', info: 'Info', success: 'Terminé',
  },
} as const;

type NotificationText = { [K in keyof typeof TEXT.en]: string };

const FILTERS: Array<{ id: NotificationFilter; label: keyof typeof TEXT.en }> = [
  { id: 'all', label: 'all' }, { id: 'unread', label: 'unread' }, { id: 'high', label: 'high' },
  { id: 'market', label: 'market' }, { id: 'project', label: 'project' }, { id: 'report', label: 'report' },
  { id: 'system', label: 'system' }, { id: 'archived', label: 'archived' },
];

const TYPE_ICON: Partial<Record<SmartNotificationType, ComponentType<{ size?: number }>>> = {
  market: LineChart, project: FileText, task: FileText, report: FileText, system: ShieldAlert,
};

function dynamicStorageKey(userId: string) { return `sfm_dynamic_notifications:${userId}`; }
function readDynamicState(userId: string): LocalDynamicState {
  if (typeof window === 'undefined') return { read: [], archived: [] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(dynamicStorageKey(userId)) || '{}');
    return { read: Array.isArray(parsed.read) ? parsed.read : [], archived: Array.isArray(parsed.archived) ? parsed.archived : [] };
  } catch { return { read: [], archived: [] }; }
}
function writeDynamicState(userId: string, state: LocalDynamicState) {
  if (typeof window !== 'undefined') window.localStorage.setItem(dynamicStorageKey(userId), JSON.stringify(state));
}
function dayKey(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isSystemEvent(notice: SmartNotification) {
  return notice.type === 'system' || /security|backup|sync|feature|analysis|document|system|notification/i.test(notice.sourceModule);
}
function matchesFilter(notice: SmartNotification, filter: NotificationFilter, query: string) {
  if (filter === 'unread' && notice.status !== 'unread') return false;
  if (filter === 'archived' && notice.status !== 'archived') return false;
  if (filter !== 'archived' && notice.status === 'archived') return false;
  if (filter === 'high' && !['danger', 'warning'].includes(notice.severity)) return false;
  if (filter === 'market' && notice.type !== 'market') return false;
  if (filter === 'project' && !['project', 'task'].includes(notice.type) && !/document|project/i.test(notice.sourceModule)) return false;
  if (filter === 'report' && notice.type !== 'report') return false;
  if (filter === 'system' && !isSystemEvent(notice)) return false;
  const needle = query.trim().toLowerCase();
  return !needle || `${notice.title} ${notice.message} ${notice.sourceModule}`.toLowerCase().includes(needle);
}

export function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const text = TEXT[locale];
  const { events, loading, error, reload, updateEvents } = useNotificationEvents();
  const [dynamicState, setDynamicState] = useState<LocalDynamicState>({ read: [], archived: [] });
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { if (user) setDynamicState(readDynamicState(user.id)); }, [user]);
  const updateDynamicState = useCallback((updater: (state: LocalDynamicState) => LocalDynamicState) => {
    if (!user) return;
    setDynamicState(current => { const next = updater(current); writeDynamicState(user.id, next); return next; });
  }, [user]);
  const notifications = useMemo(() => events.map(notice => notice.isDynamic
    ? { ...notice, status: dynamicState.archived.includes(notice.id) ? 'archived' as const : dynamicState.read.includes(notice.id) ? 'read' as const : notice.status }
    : notice), [dynamicState, events]);
  const visible = useMemo(() => notifications.filter(notice => matchesFilter(notice, filter, query)), [filter, notifications, query]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(item => [item.id, notifications.filter(notice => matchesFilter(notice, item.id, '')).length])) as Record<NotificationFilter, number>, [notifications]);
  const summary = useMemo(() => ({
    unread: notifications.filter(item => item.status === 'unread').length,
    high: notifications.filter(item => item.status !== 'archived' && ['danger', 'warning'].includes(item.severity)).length,
    today: notifications.filter(item => item.status !== 'archived' && dayKey(item.createdAt) === dayKey()).length,
    system: notifications.filter(item => item.status !== 'archived' && isSystemEvent(item)).length,
  }), [notifications]);
  const grouped = useMemo(() => {
    const groups = new Map<string, SmartNotification[]>();
    visible.forEach(notice => {
      const label = notice.status === 'archived' ? text.archivedGroup : dayKey(notice.createdAt) === dayKey() ? text.todayGroup : text.earlierGroup;
      groups.set(label, [...(groups.get(label) ?? []), notice]);
    });
    return Array.from(groups.entries());
  }, [text, visible]);

  const mutateStored = useCallback(async (notice: SmartNotification, action: 'read' | 'archive' | 'delete') => {
    if (notice.isDynamic) {
      updateDynamicState(state => action === 'read'
        ? { ...state, read: Array.from(new Set([...state.read, notice.id])) }
        : { read: state.read.filter(id => id !== notice.id), archived: Array.from(new Set([...state.archived, notice.id])) });
      return true;
    }
    if (!user?.id) {
      setMessage(text.actionFailed);
      return false;
    }
    const db = supabase as any;
    const result = action === 'delete'
      ? await db.from('notifications').delete().eq('id', notice.id).eq('user_id', user.id)
      : await db.from('notifications').update(action === 'read'
        ? { read: true, status: 'read', read_at: new Date().toISOString() }
        : { read: true, status: 'archived', read_at: new Date().toISOString() }).eq('id', notice.id).eq('user_id', user.id);
    if (result.error) { setMessage(text.actionFailed); return false; }
    updateEvents(current => action === 'delete' ? current.filter(item => item.id !== notice.id) : current.map(item => item.id === notice.id ? { ...item, status: action === 'read' ? 'read' : 'archived' } : item));
    return true;
  }, [text.actionFailed, updateDynamicState, updateEvents, user?.id]);

  const markAllRead = useCallback(async () => {
    for (const notice of visible.filter(item => item.status === 'unread')) await mutateStored(notice, 'read');
  }, [mutateStored, visible]);
  const archiveAll = useCallback(async () => {
    for (const notice of visible.filter(item => item.status !== 'archived')) await mutateStored(notice, 'archive');
  }, [mutateStored, visible]);

  if (loading) return <main className="notif-shell" dir={dir}><section className="notif-page loading-state"><Loader2 className="spin" size={28} /><span>{text.loading}</span></section><style>{styles}</style></main>;
  if (!user) return <main className="notif-shell" dir={dir}><section className="notif-page"><section className="hero"><div><span className="eyebrow"><Bell size={15} />{text.eyebrow}</span><h1>{text.title}</h1><p>{text.signIn}</p></div></section></section><style>{styles}</style></main>;

  return (
    <main className="notif-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="notif-page">
        <section className="hero" aria-labelledby="notification-center-title">
          <div><span className="eyebrow"><Bell size={15} />{text.eyebrow}</span><h1 id="notification-center-title">{text.title}</h1><p>{text.subtitle}</p></div>
          <div className="hero-actions"><button type="button" onClick={markAllRead}><CheckCheck size={17} />{text.markAllRead}</button><button type="button" onClick={archiveAll}><Archive size={17} />{text.archiveAll}</button></div>
        </section>
        <section className="summary-grid" aria-label={text.title}>
          <SummaryCard label={text.unread} value={summary.unread} icon={<Bell size={18} />} />
          <SummaryCard label={text.high} value={summary.high} icon={<ShieldAlert size={18} />} />
          <SummaryCard label={text.today} value={summary.today} icon={<CalendarDays size={18} />} />
          <SummaryCard label={text.system} value={summary.system} icon={<Sparkles size={18} />} />
        </section>
        {error ? <div className="load-warning" role="alert"><span>{text.loadError}</span><button type="button" onClick={reload}>{text.retry}</button></div> : null}
        {message ? <div className="action-toast" role="status" aria-live="polite">{message}</div> : null}
        <section className="toolbar">
          <label className="search-field"><Search size={17} /><span className="sr-only">{text.search}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} /></label>
          <div className="filters" role="group" aria-label={text.title}>{FILTERS.map(item => <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{text[item.label]}<span>{counts[item.id]}</span></button>)}</div>
        </section>
        <section className="notification-list" aria-live="polite">
          {grouped.length === 0 ? <div className="empty"><Bell size={40} /><strong>{text.empty}</strong><p>{text.emptyBody}</p></div> : grouped.map(([label, items]) => <section className="group" key={label}><h2>{label}</h2><div className="cards">{items.map(notice => <NotificationCard key={`${notice.isDynamic ? 'dynamic' : 'stored'}-${notice.id}`} notice={notice} locale={locale} text={text} onView={() => router.push(notice.actionUrl || '/')} onRead={() => void mutateStored(notice, 'read')} onArchive={() => void mutateStored(notice, 'archive')} onDelete={() => { if (typeof window === 'undefined' || window.confirm(text.confirmDelete)) void mutateStored(notice, 'delete'); }} />)}</div></section>)}
        </section>
      </DashboardPageShell>
      <style>{styles}</style>
    </main>
  );
}

function sourceLabel(notice: SmartNotification, text: NotificationText) {
  if (notice.type === 'market') return text.sourceMarket;
  if (notice.type === 'report') return text.sourceReport;
  if (notice.type === 'project' || notice.type === 'task' || /document|project/i.test(notice.sourceModule)) return text.sourceProject;
  if (isSystemEvent(notice)) return text.sourceSystem;
  return text.general;
}
function NotificationCard({ notice, locale, text, onView, onRead, onArchive, onDelete }: { notice: SmartNotification; locale: Lang; text: NotificationText; onView: () => void; onRead: () => void; onArchive: () => void; onDelete: () => void }) {
  const Icon = TYPE_ICON[notice.type] ?? Bell;
  return <article className={`notice-card ${notice.status}`}><div className={`notice-icon ${notice.severity}`}><Icon size={20} /></div><div className="notice-content"><div className="notice-head"><div><h3>{notice.title}</h3>{notice.message ? <p>{notice.message}</p> : null}</div><span className={`severity ${notice.severity}`}>{text[notice.severity]}</span></div><div className="meta-row"><span>{sourceLabel(notice, text)}</span>{notice.createdAt ? <span>{formatDate(notice.createdAt, locale)}</span> : null}</div><div className="actions"><button type="button" className="view-action" onClick={onView}><Eye size={15} />{text.view}</button>{notice.status === 'unread' ? <button type="button" onClick={onRead}><CheckCheck size={15} />{text.done}</button> : null}<button type="button" onClick={onArchive}><Archive size={15} />{text.archive}</button><button type="button" className="danger-action" onClick={onDelete}><Trash2 size={15} />{text.delete}</button></div></div></article>;
}
function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) { return <article className="summary-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>; }

const styles = `
  .notif-shell{width:100%;min-width:0;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:clip}.notif-page{width:100%;min-width:0;display:grid;gap:18px}.loading-state{min-height:240px;place-items:center;color:var(--primary);font-weight:600}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .hero{background:var(--hero-gradient);color:var(--hero-foreground);border:1px solid var(--border-strong);border-radius:var(--radius-panel);padding:clamp(24px,5vw,40px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:var(--shadow-md);min-width:0;overflow:hidden}.eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent);background:color-mix(in srgb,var(--surface) 12%,transparent);border-radius:var(--radius-pill);padding:8px 13px;color:var(--hero-foreground);font-size:12px;font-weight:600}.hero h1{margin:18px 0 10px;font-size:clamp(32px,6vw,46px);line-height:1.12;font-weight:600}.hero p{margin:0;max-width:780px;color:var(--hero-foreground-muted);font-size:clamp(15px,2vw,18px);line-height:1.8}.hero-actions,.actions{display:flex;gap:8px;flex-wrap:wrap}.hero-actions button,.actions button,.load-warning button{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 12px;background:var(--surface);color:var(--foreground-secondary);font:600 12px var(--font-ui);cursor:pointer}.hero-actions button{border-color:color-mix(in srgb,var(--hero-foreground) 24%,transparent);background:color-mix(in srgb,var(--surface) 12%,transparent);color:var(--hero-foreground)}
  .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:16px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-card);min-width:0}.summary-card>span{width:42px;height:42px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);flex:0 0 auto}.summary-card strong{display:block;color:var(--foreground);font:600 26px var(--font-data)}.summary-card small{display:block;color:var(--foreground-muted);font-weight:600;overflow-wrap:anywhere}
  .load-warning{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--danger);border-radius:var(--radius-card);background:var(--danger-soft);color:var(--danger);font-weight:600}.action-toast{border:1px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-elevated);padding:12px 14px;color:var(--foreground)}
  .toolbar{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:14px;display:grid;gap:12px;box-shadow:var(--shadow-card);min-width:0;overflow:hidden}.search-field{display:flex;align-items:center;gap:8px;min-height:44px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:0 12px;color:var(--primary)}.search-field:focus-within{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}.search-field input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--foreground);font:500 13px var(--font-ui)}.filters{display:flex;gap:8px;overflow-x:auto;max-width:100%;padding-bottom:2px}.filters button{flex:0 0 auto;min-height:44px;border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground-muted);border-radius:var(--radius-pill);padding:0 12px;font:600 12px var(--font-ui);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:7px}.filters button span{min-width:22px;height:22px;border-radius:var(--radius-pill);display:inline-grid;place-items:center;background:var(--primary-soft);font-family:var(--font-data);padding:0 6px}.filters button.active{border-color:var(--primary);background:var(--primary-soft);color:var(--primary-hover)}
  .notification-list,.group,.cards{display:grid;gap:12px;min-width:0}.group h2{margin:0;color:var(--foreground);font-size:20px}.notice-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:15px;box-shadow:var(--shadow-card);min-width:0;overflow:hidden}.notice-card.unread{border-inline-start:4px solid var(--primary);background:var(--primary-soft)}.notice-card.archived{opacity:.72;background:var(--surface-muted)}.notice-icon{width:44px;height:44px;border:1px solid var(--border);border-radius:var(--radius-card);display:grid;place-items:center}.notice-icon.info,.severity.info{color:var(--info);background:var(--info-soft)}.notice-icon.success,.severity.success{color:var(--success);background:var(--success-soft)}.notice-icon.warning,.severity.warning{color:var(--warning);background:var(--warning-soft)}.notice-icon.danger,.severity.danger{color:var(--danger);background:var(--danger-soft)}.notice-content{min-width:0;display:grid;gap:10px}.notice-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.notice-head h3{margin:0 0 5px;color:var(--foreground);font-size:16px;overflow-wrap:anywhere}.notice-head p{margin:0;color:var(--foreground-muted);font-size:13px;line-height:1.65;overflow-wrap:anywhere}.severity{display:inline-flex;border:1px solid currentColor;border-radius:var(--radius-pill);padding:5px 9px;font-size:12px;font-weight:600;white-space:nowrap}.meta-row{display:flex;gap:7px;flex-wrap:wrap}.meta-row span{background:var(--surface-muted);border:1px solid var(--border);color:var(--foreground-muted);border-radius:var(--radius-pill);padding:5px 8px;font-size:12px;font-weight:600}.actions .view-action{border-color:var(--primary);background:var(--primary);color:var(--primary-foreground)}.actions .danger-action{background:var(--danger-soft);color:var(--danger);border-color:var(--danger)}.empty{text-align:center;padding:54px 20px;color:var(--foreground-muted);background:var(--surface);border:1px dashed var(--border-strong);border-radius:var(--radius-panel)}.empty svg{color:var(--primary);margin-bottom:12px}.empty strong{display:block;color:var(--foreground);font-size:19px}.empty p{margin:8px 0 0}.notif-shell :is(button,input):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
  @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr}}@media(max-width:680px){.summary-grid{grid-template-columns:1fr}.notice-card,.notice-head{grid-template-columns:1fr}.severity{justify-self:start}.hero-actions,.actions{display:grid}.hero-actions button,.actions button{width:100%}.load-warning{display:grid}.load-warning button{width:100%}}@media(prefers-reduced-motion:reduce){.spin{animation:none}.notif-shell *{transition:none!important}}
`;
