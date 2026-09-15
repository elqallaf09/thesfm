import 'server-only';
import type { EconomicStoredRow } from './storedRowTypes';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { NotificationLang, SmartNotification } from '@/lib/notifications/generateNotifications';
import { loadCrossWorkspaceEvidence } from './crossWorkspaceBrain.server';
import { buildCrossWorkspaceBrief } from './crossWorkspaceBrain';
import { buildDailyPriorityActions } from './dailyPriority';
import { buildEconomicIntelligenceReadiness } from './readiness';
import { loadReadinessConfirmations } from './readinessConfirmations.server';
import { buildEvidenceProvenance } from './evidenceProvenance';
import { buildEvidenceSnapshotTrace } from './evidenceSnapshotTrace';

const COPY = {
  ar: {
    title: 'تعارض بين مساحات SFM',
    market_attention_vs_low_liquidity: 'اهتمامك بالسوق يتزامن مع سيولة شخصية منخفضة. راجع قدرة الاستثمار قبل زيادة التعرض.',
    market_attention_vs_debt_pressure: 'اهتمام السوق يتزامن مع ضغط دين مرتفع. قدرة السداد أولوية قبل زيادة المخاطر.',
    business_funding_vs_personal_liquidity: 'المشاريع تحتاج تمويلاً بينما هامش السيولة الشخصية محدود.',
    business_and_market_compete_for_surplus: 'تمويل المشاريع وفرص السوق قد تتنافس على نفس الفائض المالي.',
  },
  en: {
    title: 'SFM cross-workspace conflict',
    market_attention_vs_low_liquidity: 'Market attention coincides with weak personal liquidity. Review investment capacity before increasing exposure.',
    market_attention_vs_debt_pressure: 'Market attention coincides with elevated debt pressure. Debt capacity takes priority before adding risk.',
    business_funding_vs_personal_liquidity: 'Business projects need funding while personal liquidity headroom is limited.',
    business_and_market_compete_for_surplus: 'Business funding and market opportunities may compete for the same financial surplus.',
  },
  fr: {
    title: 'Conflit entre espaces SFM',
    market_attention_vs_low_liquidity: 'L’intérêt marché coïncide avec une liquidité personnelle faible. Vérifiez la capacité d’investissement avant d’augmenter l’exposition.',
    market_attention_vs_debt_pressure: 'L’intérêt marché coïncide avec une pression de dette élevée. La capacité de remboursement est prioritaire.',
    business_funding_vs_personal_liquidity: 'Les projets nécessitent un financement alors que la marge de liquidité personnelle est limitée.',
    business_and_market_compete_for_surplus: 'Le financement des projets et les opportunités de marché peuvent se disputer le même surplus.',
  },
} as const;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeRow(row: EconomicStoredRow, title: string, message: string, severity: 'warning' | 'danger', actionUrl: string): SmartNotification {
  return {
    id: String(row.id),
    title,
    message,
    type: 'general',
    severity,
    sourceModule: 'economic_intelligence',
    sourceId: null,
    actionUrl,
    status: row.status === 'archived' ? 'archived' : row.read === true || row.status === 'read' ? 'read' : 'unread',
    dueDate: null,
    createdAt: row.created_at ?? null,
    isDynamic: false,
  };
}

export async function loadCrossWorkspaceEconomicEvents(userId: string, lang: NotificationLang): Promise<SmartNotification[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const [evidence, confirmations] = await Promise.all([
    loadCrossWorkspaceEvidence(userId),
    loadReadinessConfirmations(userId).catch(() => []),
  ]);
  const brief = buildCrossWorkspaceBrief(evidence);
  const readiness = buildEconomicIntelligenceReadiness(evidence, confirmations);
  const provenance = buildEvidenceProvenance(evidence, readiness, evidence.recordCounts ?? {});
  const copy = COPY[lang];
  const itemByCode = new Map(brief.items.map(item => [item.code, item]));
  const activeActions = buildDailyPriorityActions(brief).filter(action => action.severity === 'warning' || action.severity === 'danger');
  const activeKeys = activeActions.map(action => `priority:${action.fingerprint}`);

  const existingOpen = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at,metadata')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .like('event_key', 'priority:%')
    .is('resolved_at', null);
  if (existingOpen.error) throw existingOpen.error;

  const now = new Date().toISOString();
  const stale = (existingOpen.data ?? []).filter((row: EconomicStoredRow) => row.event_key && !activeKeys.includes(String(row.event_key)));
  for (const row of stale) {
    const previousMetadata = asObject(row.metadata);
    const { error } = await admin.from('notifications').update({
      resolved_at: now,
      resolution_code: 'daily_priority_changed_or_cleared',
      status: 'archived',
      read: true,
      read_at: row.read ? undefined : now,
      metadata: {
        ...previousMetadata,
        economic_intelligence: true,
        event_key: row.event_key,
        daily_priority: true,
        resolution_code: 'daily_priority_changed_or_cleared',
        resolution_observed_at: now,
        causal_claim: false,
      },
    }).eq('id', row.id).eq('user_id', userId).eq('source_module', 'economic_intelligence');
    if (error) throw error;
  }

  if (activeActions.length === 0) return [];
  const existingResult = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .in('event_key', activeKeys);
  if (existingResult.error) throw existingResult.error;

  const existing = new Map((existingResult.data ?? []).filter((row: EconomicStoredRow) => !row.resolved_at).map((row: EconomicStoredRow) => [String(row.event_key), row]));
  const missing = activeActions.filter(action => !existing.has(`priority:${action.fingerprint}`));
  if (missing.length > 0) {
    const insert = await admin.from('notifications').insert(missing.map(action => {
      const item = itemByCode.get(action.code);
      const evidenceSnapshot = buildEvidenceSnapshotTrace(action, readiness, provenance);
      return {
        user_id: userId,
        type: 'warning',
        title: copy.title,
        message: copy[action.code as keyof typeof copy] ?? action.code,
        read: false,
        link: action.actionUrl,
        severity: action.severity,
        source_module: 'economic_intelligence',
        source_id: null,
        action_url: action.actionUrl,
        status: 'unread',
        event_key: `priority:${action.fingerprint}`,
        metadata: {
          economic_intelligence: true,
          daily_priority: true,
          event_key: `priority:${action.fingerprint}`,
          priority_fingerprint: action.fingerprint,
          sources: action.sources,
          evidence: item?.evidence ?? {},
          evidence_snapshot: evidenceSnapshot,
          causal_claim: false,
        },
      };
    })).select('id,event_key,status,read,created_at,resolved_at');
    if (insert.error && insert.error.code !== '23505') throw insert.error;
    for (const row of insert.data ?? []) existing.set(String((row as EconomicStoredRow).event_key), row);
  }

  return activeActions.flatMap(action => {
    const key = `priority:${action.fingerprint}`;
    const row = existing.get(key);
    // A competing insert can win the unique key. Do not fabricate a stored row.
    return row ? [normalizeRow(row, copy.title, copy[action.code as keyof typeof copy] ?? action.code, action.severity as 'warning' | 'danger', action.actionUrl)] : [];
  });
}
