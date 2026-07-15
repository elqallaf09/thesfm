'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  SmartNotification,
  SmartNotificationSeverity,
  SmartNotificationType,
} from '@/lib/notifications/generateNotifications';

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

type NotificationCacheEntry = {
  events: SmartNotification[];
  cachedAt: number;
};

const CACHE_TTL_MS = 30_000;
const notificationCache = new Map<string, NotificationCacheEntry>();

function normalizeSeverity(value: unknown, fallback: SmartNotificationSeverity): SmartNotificationSeverity {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'danger' || normalized === 'warning' || normalized === 'success' || normalized === 'info'
    ? normalized
    : fallback;
}

function normalizeType(value: unknown): SmartNotificationType {
  const normalized = String(value ?? '').toLowerCase();
  if (['income', 'expense', 'goal', 'market', 'project', 'task', 'report', 'charity', 'zakat', 'system', 'general'].includes(normalized)) {
    return normalized as SmartNotificationType;
  }
  if (/security|backup|sync|feature|document|analysis|notification/.test(normalized)) return 'system';
  if (/investment|price|signal/.test(normalized)) return 'market';
  return 'general';
}

function normalizeStored(row: StoredNotificationRow): SmartNotification {
  const status = row.status === 'archived'
    ? 'archived'
    : row.status === 'read' || row.read === true
      ? 'read'
      : 'unread';
  const type = normalizeType(row.source_module ?? row.type);
  const fallbackSeverity: SmartNotificationSeverity = row.type === 'warning'
    ? 'warning'
    : row.type === 'success'
      ? 'success'
      : 'info';
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
  const severity: SmartNotificationSeverity = event.includes('stop_loss') || event.includes('high_risk')
    ? 'danger'
    : action === 'sell'
      ? 'warning'
      : action === 'buy'
        ? 'success'
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

function sortEvents(events: SmartNotification[]) {
  const severityRank: Record<SmartNotificationSeverity, number> = { danger: 0, warning: 1, info: 2, success: 3 };
  return [...events].sort((a, b) => {
    const severityDifference = severityRank[a.severity] - severityRank[b.severity];
    if (severityDifference !== 0) return severityDifference;
    const aDate = new Date(a.createdAt ?? a.dueDate ?? 0).getTime() || 0;
    const bDate = new Date(b.createdAt ?? b.dueDate ?? 0).getTime() || 0;
    return bDate - aDate;
  });
}

async function fetchNotificationEvents(userId: string) {
  const db = supabase as any;
  const storedFields = 'id,type,title,message,read,link,created_at,severity,source_module,source_id,action_url,status,due_date,read_at,metadata';
  const storedPromise = (async () => {
    let result = await db.from('notifications').select(storedFields).eq('user_id', userId).order('created_at', { ascending: false });
    if (result.error) {
      result = await db.from('notifications').select('id,type,title,message,read,link,created_at').eq('user_id', userId).order('created_at', { ascending: false });
    }
    return result;
  })();
  const signalsPromise = fetch('/api/market/signal-alerts?limit=50', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  }).then(async response => {
    if (!response.ok) return [];
    const payload = await response.json();
    const rows = Array.isArray(payload.notifications) ? payload.notifications : Array.isArray(payload.items) ? payload.items : [];
    return rows.map((row: Record<string, any>) => normalizeSignalNotification(row));
  }).catch(() => [] as SmartNotification[]);

  const [storedResult, signals] = await Promise.all([storedPromise, signalsPromise]);
  if (storedResult.error) throw new Error(storedResult.error.message);
  const byId = new Map<string, SmartNotification>();
  ((storedResult.data ?? []) as StoredNotificationRow[]).map(normalizeStored).forEach(event => byId.set(`stored:${event.id}`, event));
  (signals as SmartNotification[]).forEach(event => byId.set(`signal:${event.id}`, event));
  return sortEvents(Array.from(byId.values()));
}

export function useNotificationEvents() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (authLoading) return;
    if (!user) {
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }
    const cached = notificationCache.get(user.id);
    if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      setEvents(cached.events);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextEvents = await fetchNotificationEvents(user.id);
      notificationCache.set(user.id, { events: nextEvents, cachedAt: Date.now() });
      setEvents(nextEvents);
      setError(null);
    } catch (loadError) {
      setEvents(cached?.events ?? []);
      setError(loadError instanceof Error ? loadError.message : 'Notification load failed');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const updateEvents = useCallback((updater: (current: SmartNotification[]) => SmartNotification[]) => {
    setEvents(current => {
      const next = sortEvents(updater(current));
      if (user) notificationCache.set(user.id, { events: next, cachedAt: Date.now() });
      return next;
    });
  }, [user]);

  return {
    events,
    loading: authLoading || loading,
    error,
    reload: () => load(true),
    updateEvents,
  };
}
