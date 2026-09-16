import 'server-only';
import type { EconomicStoredRow } from './storedRowTypes';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { DailyPriorityAction } from './dailyPriority';
import { parseEvidenceSnapshotTrace, type EvidenceSnapshotTrace } from './evidenceSnapshotTrace';

export type DailyBriefHistoryEntry = {
  id: string;
  eventKey: string;
  fingerprint: string | null;
  code: string | null;
  severity: string | null;
  actionUrl: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  sources: string[];
  evidenceSnapshot: EvidenceSnapshotTrace | null;
  historicalEvidenceAvailable: boolean;
};

export type DailyBriefChangeSummary = {
  changed: boolean;
  currentFingerprint: string | null;
  previousFingerprint: string | null;
  previousCode: string | null;
  previousSeverity: string | null;
  previousCreatedAt: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function loadDailyBriefHistory(userId: string, current: DailyPriorityAction | null) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const result = await admin
    .from('notifications')
    .select('id,event_key,severity,action_url,created_at,resolved_at,metadata')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .like('event_key', 'priority:%')
    .order('created_at', { ascending: false })
    .limit(20);
  if (result.error) throw result.error;

  const entries: DailyBriefHistoryEntry[] = (result.data ?? []).map((row: EconomicStoredRow) => {
    const metadata = asObject(row.metadata);
    const fingerprint = typeof metadata.priority_fingerprint === 'string'
      ? metadata.priority_fingerprint
      : typeof row.event_key === 'string' && row.event_key.startsWith('priority:')
        ? row.event_key.slice('priority:'.length)
        : null;
    const code = fingerprint ? fingerprint.split(':', 1)[0] ?? null : null;
    const sources = Array.isArray(metadata.sources) ? metadata.sources.map(String) : [];
    const evidenceSnapshot = parseEvidenceSnapshotTrace(metadata.evidence_snapshot);
    return {
      id: String(row.id),
      eventKey: String(row.event_key ?? ''),
      fingerprint,
      code,
      severity: row.severity ?? null,
      actionUrl: row.action_url ?? null,
      createdAt: row.created_at ?? null,
      resolvedAt: row.resolved_at ?? null,
      sources,
      evidenceSnapshot,
      historicalEvidenceAvailable: evidenceSnapshot !== null,
    };
  });

  const previous = entries.find(entry => entry.fingerprint && entry.fingerprint !== current?.fingerprint) ?? null;
  const change: DailyBriefChangeSummary = {
    changed: Boolean(previous && current?.fingerprint && previous.fingerprint !== current.fingerprint),
    currentFingerprint: current?.fingerprint ?? null,
    previousFingerprint: previous?.fingerprint ?? null,
    previousCode: previous?.code ?? null,
    previousSeverity: previous?.severity ?? null,
    previousCreatedAt: previous?.createdAt ?? null,
  };

  return { entries, change };
}
