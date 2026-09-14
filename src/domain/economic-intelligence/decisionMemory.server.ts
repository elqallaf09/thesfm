import 'server-only';
import type { EconomicStoredRow } from './storedRowTypes';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildDecisionMemoryInsight, type DecisionMemoryRecord } from './decisionMemory';

async function loadDecisionHistory(userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const decisionsResult = await admin
    .from('user_decisions')
    .select('id,decision_type,estimated_cost,monthly_impact,risk_score,status,currency,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (decisionsResult.error) throw decisionsResult.error;

  const ids = (decisionsResult.data ?? []).map((row: EconomicStoredRow) => row.id).filter(Boolean);
  const notificationsResult = ids.length
    ? await admin.from('notifications')
        .select('source_id,resolved_at,event_key')
        .eq('user_id', userId)
        .eq('source_module', 'economic_intelligence')
        .in('source_id', ids)
    : { data: [] as EconomicStoredRow[], error: null };
  if (notificationsResult.error) throw notificationsResult.error;

  const stats = new Map<string, { resolved: number; families: Set<string> }>();
  for (const row of notificationsResult.data ?? []) {
    const id = String((row as EconomicStoredRow).source_id ?? '');
    if (!id) continue;
    const current = stats.get(id) ?? { resolved: 0, families: new Set<string>() };
    if ((row as EconomicStoredRow).resolved_at) current.resolved += 1;
    const key = String((row as EconomicStoredRow).event_key ?? '');
    if (key) current.families.add(key.split(':').slice(0, 2).join(':'));
    stats.set(id, current);
  }

  return (decisionsResult.data ?? []).map((row: EconomicStoredRow): DecisionMemoryRecord => {
    const stat = stats.get(String(row.id)) ?? { resolved: 0, families: new Set<string>() };
    return {
      id: String(row.id),
      decisionType: String(row.decision_type ?? ''),
      amount: Number.isFinite(Number(row.estimated_cost)) ? Number(row.estimated_cost) : null,
      monthlyImpact: Number.isFinite(Number(row.monthly_impact)) ? Number(row.monthly_impact) : null,
      riskScore: Number.isFinite(Number(row.risk_score)) ? Number(row.risk_score) : null,
      status: row.status ?? null,
      currency: row.currency ?? null,
      createdAt: row.created_at ?? null,
      resolvedEvents: stat.resolved,
      recurringEvents: Math.max(0, stat.families.size - 1),
    };
  });
}

export async function loadDecisionMemoryInsight(options: {
  userId: string;
  decisionType: string;
  amount?: number | null;
  currency?: string | null;
}) {
  const history = await loadDecisionHistory(options.userId);
  return buildDecisionMemoryInsight({ decisionType: options.decisionType, amount: options.amount, currency: options.currency }, history);
}

export async function loadAdvisorDecisionMemoryFacts(userId: string) {
  const history = await loadDecisionHistory(userId);
  const groups = new Map<string, DecisionMemoryRecord[]>();
  for (const record of history) groups.set(record.decisionType, [...(groups.get(record.decisionType) ?? []), record]);

  const facts: Array<{ key: string; value: string | number }> = [];
  for (const [decisionType, records] of groups.entries()) {
    if (records.length < 2) continue;
    const risk = records.map(record => record.riskScore).filter((value): value is number => value !== null);
    facts.push({ key: `decision_memory:${decisionType}:count`, value: records.length });
    if (risk.length >= 2) facts.push({ key: `decision_memory:${decisionType}:avg_risk`, value: Math.round((risk.reduce((sum, value) => sum + value, 0) / risk.length) * 10) / 10 });
    facts.push({ key: `decision_memory:${decisionType}:resolved_cases`, value: records.filter(record => record.resolvedEvents > 0).length });
  }
  return facts;
}
