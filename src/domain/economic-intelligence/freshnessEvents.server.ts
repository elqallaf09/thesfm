import 'server-only';
import type { EconomicStoredRow } from './storedRowTypes';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { NotificationLang, SmartNotification } from '@/lib/notifications/generateNotifications';
import { loadEconomicIntelligenceReadiness } from './readiness.server';
import type { ReadinessWorkspace } from './readiness';

const COPY = {
  ar: {
    title: 'بيانات الذكاء الاقتصادي تحتاج تحديث',
    finance: 'بيانات Finance قديمة وقد تخفض دقة التوأم المالي والقرارات.',
    trader: 'بيانات Trader قديمة وقد تخفض دقة سياق الأسواق والاستثمار.',
    business: 'بيانات Business قديمة وقد تخفض دقة تحليل المشاريع والتمويل.',
  },
  en: {
    title: 'Economic Intelligence data needs refresh',
    finance: 'Finance evidence is stale and may reduce Financial Twin and decision accuracy.',
    trader: 'Trader evidence is stale and may reduce market and investment context accuracy.',
    business: 'Business evidence is stale and may reduce project and funding analysis accuracy.',
  },
  fr: {
    title: 'Les données Economic Intelligence doivent être actualisées',
    finance: 'Les données Finance sont anciennes et peuvent réduire la précision du jumeau financier et des décisions.',
    trader: 'Les données Trader sont anciennes et peuvent réduire la précision du contexte marché et investissement.',
    business: 'Les données Business sont anciennes et peuvent réduire la précision de l’analyse des projets et du financement.',
  },
} as const;

const ACTION_URL: Record<ReadinessWorkspace, string> = {
  finance: '/dashboard',
  trader: '/ai-analyst',
  business: '/business-hub',
};

function normalizeRow(row: EconomicStoredRow, workspace: ReadinessWorkspace, lang: NotificationLang, veryStale: boolean): SmartNotification {
  const copy = COPY[lang];
  return {
    id: String(row.id),
    title: copy.title,
    message: copy[workspace],
    type: 'general',
    severity: veryStale ? 'warning' : 'info',
    sourceModule: 'economic_intelligence',
    sourceId: null,
    actionUrl: ACTION_URL[workspace],
    status: row.status === 'archived' ? 'archived' : row.read === true || row.status === 'read' ? 'read' : 'unread',
    dueDate: null,
    createdAt: row.created_at ?? null,
    isDynamic: false,
  };
}

export async function loadFreshnessEconomicEvents(userId: string, lang: NotificationLang): Promise<SmartNotification[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const readiness = await loadEconomicIntelligenceReadiness(userId);
  const workspaces: ReadinessWorkspace[] = ['finance', 'trader', 'business'];
  const drafts = workspaces
    .map(workspace => ({ workspace, freshness: readiness.freshness[workspace] }))
    .filter(item => item.freshness.available && item.freshness.stale)
    .map(item => ({
      workspace: item.workspace,
      veryStale: item.freshness.veryStale,
      ageDays: item.freshness.ageDays,
      eventKey: `freshness:${item.workspace}:${item.freshness.veryStale ? 'very-stale' : 'stale'}`,
    }));

  const activeKeys = drafts.map(draft => draft.eventKey);
  const openResult = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .like('event_key', 'freshness:%')
    .is('resolved_at', null);
  if (openResult.error) throw openResult.error;

  const now = new Date().toISOString();
  for (const row of (openResult.data ?? []).filter((row: EconomicStoredRow) => row.event_key && !activeKeys.includes(String(row.event_key)))) {
    const { error } = await admin.from('notifications').update({
      resolved_at: now,
      resolution_code: 'source_refreshed_or_freshness_changed',
      status: 'archived',
      read: true,
      read_at: row.read ? undefined : now,
      metadata: { economic_intelligence: true, freshness_event: true, event_key: row.event_key, causal_claim: false },
    }).eq('id', row.id).eq('user_id', userId);
    if (error) throw error;
  }

  if (drafts.length === 0) return [];

  const existingResult = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .in('event_key', activeKeys);
  if (existingResult.error) throw existingResult.error;

  const existing = new Map((existingResult.data ?? []).filter((row: EconomicStoredRow) => !row.resolved_at).map((row: EconomicStoredRow) => [String(row.event_key), row]));
  const missing = drafts.filter(draft => !existing.has(draft.eventKey));
  if (missing.length > 0) {
    const copy = COPY[lang];
    const insert = await admin.from('notifications').insert(missing.map(draft => ({
      user_id: userId,
      type: 'warning',
      title: copy.title,
      message: copy[draft.workspace],
      read: false,
      link: ACTION_URL[draft.workspace],
      severity: draft.veryStale ? 'warning' : 'info',
      source_module: 'economic_intelligence',
      source_id: null,
      action_url: ACTION_URL[draft.workspace],
      status: 'unread',
      event_key: draft.eventKey,
      metadata: {
        economic_intelligence: true,
        freshness_event: true,
        workspace: draft.workspace,
        age_days: draft.ageDays,
        event_key: draft.eventKey,
        causal_claim: false,
      },
    }))).select('id,event_key,status,read,created_at,resolved_at');
    if (insert.error && insert.error.code !== '23505') throw insert.error;
    for (const row of insert.data ?? []) existing.set(String((row as EconomicStoredRow).event_key), row);
  }

  return drafts.flatMap(draft => {
    const row = existing.get(draft.eventKey);
    return row ? [normalizeRow(row, draft.workspace, lang, draft.veryStale)] : [];
  });
}
