import type { SupabaseClient } from '@supabase/supabase-js';

export const ACCOUNT_ACTIVITY_TABLE = 'account_activity';

export const ACCOUNT_ACTIVITY_EVENT_TYPES = [
  'profile_updated',
  'goal_added',
  'investment_added',
  'language_changed',
  'report_exported',
  'account_created',
] as const;

export type AccountActivityEventType = (typeof ACCOUNT_ACTIVITY_EVENT_TYPES)[number];
export type AccountActivityLang = 'ar' | 'en' | 'fr';

export type AccountActivityRow = {
  id: string;
  user_id: string;
  event_type: AccountActivityEventType | string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AccountActivityCreateInput = {
  eventType: AccountActivityEventType;
  userId: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export const ACCOUNT_ACTIVITY_LABELS: Record<AccountActivityEventType, Record<AccountActivityLang, string>> = {
  profile_updated: {
    ar: 'تم تحديث الملف الشخصي',
    en: 'Profile updated',
    fr: 'Profil mis à jour',
  },
  goal_added: {
    ar: 'تم إضافة هدف مالي',
    en: 'Financial goal added',
    fr: 'Objectif financier ajouté',
  },
  investment_added: {
    ar: 'تم إضافة استثمار',
    en: 'Investment added',
    fr: 'Investissement ajouté',
  },
  language_changed: {
    ar: 'تم تغيير اللغة',
    en: 'Language changed',
    fr: 'Langue modifiée',
  },
  report_exported: {
    ar: 'تم تصدير تقرير',
    en: 'Report exported',
    fr: 'Rapport exporté',
  },
  account_created: {
    ar: 'تم إنشاء الحساب',
    en: 'Account created',
    fr: 'Compte créé',
  },
};

export function accountActivityCacheKey(userId: string) {
  return ['account-activity', userId] as const;
}

export function accountActivityLabel(eventType: string, lang: AccountActivityLang, fallbackTitle?: string | null) {
  if (isAccountActivityEventType(eventType)) return ACCOUNT_ACTIVITY_LABELS[eventType][lang];
  return fallbackTitle || eventType;
}

export function isAccountActivityEventType(value: string): value is AccountActivityEventType {
  return ACCOUNT_ACTIVITY_EVENT_TYPES.includes(value as AccountActivityEventType);
}

export function normalizeAccountActivityRows(rows: unknown): AccountActivityRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map(row => ({
      id: String(row.id ?? ''),
      user_id: String(row.user_id ?? ''),
      event_type: String(row.event_type ?? ''),
      title: String(row.title ?? ''),
      description: typeof row.description === 'string' ? row.description : null,
      entity_type: typeof row.entity_type === 'string' ? row.entity_type : null,
      entity_id: typeof row.entity_id === 'string' ? row.entity_id : null,
      metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : null,
      created_at: String(row.created_at ?? ''),
    }))
    .filter(row => row.id && row.user_id && row.event_type && row.created_at);
}

export async function fetchAccountActivities(client: SupabaseClient, limit = 20): Promise<AccountActivityRow[]> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user?.id) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[account-activity] no authenticated user; returning empty activity', {
        hasError: Boolean(userError),
      });
    }
    return [];
  }

  const cacheKey = accountActivityCacheKey(user.id).join(':');
  const { data, error } = await client
    .from(ACCOUNT_ACTIVITY_TABLE)
    .select('id,user_id,event_type,title,description,entity_type,entity_id,metadata,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (process.env.NODE_ENV === 'development') {
    console.info('[account-activity] fetch', {
      userId: user.id,
      count: Array.isArray(data) ? data.length : 0,
      cacheKey,
      source: ACCOUNT_ACTIVITY_TABLE,
    });
  }

  if (error) throw error;
  return normalizeAccountActivityRows(data);
}

export async function recordAccountActivity(client: SupabaseClient, input: AccountActivityCreateInput) {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user?.id || user.id !== input.userId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[account-activity] skipped insert due to user mismatch', {
        authenticatedUserId: user?.id,
        requestedUserId: input.userId,
        eventType: input.eventType,
      });
    }
    return { skipped: true };
  }

  const payload = {
    user_id: user.id,
    event_type: input.eventType,
    title: input.eventType,
    description: input.description ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await client.from(ACCOUNT_ACTIVITY_TABLE).insert(payload);

  if (process.env.NODE_ENV === 'development') {
    console.info('[account-activity] insert', {
      userId: user.id,
      eventType: input.eventType,
      cacheKey: accountActivityCacheKey(user.id).join(':'),
      ok: !error,
    });
  }

  if (error) throw error;
  return { skipped: false };
}

export function formatAccountActivityTimestamp(value: string, lang: AccountActivityLang, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const dateKey = new Intl.DateTimeFormat('en-CA').format(date);
  const todayKey = new Intl.DateTimeFormat('en-CA').format(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = new Intl.DateTimeFormat('en-CA').format(yesterday);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);

  if (dateKey === todayKey) {
    if (lang === 'ar') return `اليوم، ${time}`;
    if (lang === 'fr') return `Aujourd'hui, ${time}`;
    return `Today, ${time}`;
  }

  if (dateKey === yesterdayKey) {
    if (lang === 'ar') return `أمس، ${time}`;
    if (lang === 'fr') return `Hier, ${time}`;
    return `Yesterday, ${time}`;
  }

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  return `${day}${lang === 'ar' ? '،' : ','} ${time}`;
}
