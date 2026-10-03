import 'server-only';
import { createHash } from 'node:crypto';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistMonotonicOperationalRecords } from '@/lib/server/operationalHealthCache';
import type { OpsFeatureMeasurement, OpsHealthEvidence } from './types';

type SuccessHistory = Record<string, string>;
const HISTORY_TTL_MS = 24 * 60 * 60_000;
const ALLOWED_SOURCES = ['ops_center_source_ai_models', 'ops_center_source_notification_inbox', 'ops_center_source_storage_buckets'];
const EVIDENCE_KEYS = [
  'ops_center_source_ai_models|sfm-private-primary|ops_center_source_ai_models',
  'ops_center_source_ai_models|sfm-private-fallback|ops_center_source_ai_models',
  'ops_center_source_notification_inbox|supabase|',
  'ops_center_source_storage_buckets|supabase|ops_center_source_storage_buckets',
  'ops_center_source_storage_buckets|supabase|ops_center_storage_required_buckets',
];

export function serviceHistoryKey(identity: string): string {
  return `ops_service_probe_history_v1:${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`;
}

function evidenceKey(item: OpsHealthEvidence) {
  if (!ALLOWED_SOURCES.includes(item.source)) return null;
  const values = [item.source, item.provider ?? '', item.capability ?? ''];
  if (values.some(value => !/^[a-zA-Z0-9_.:-]{0,120}$/.test(value))) return null;
  const key = values.join('|');
  return EVIDENCE_KEYS.includes(key) ? key : null;
}

function recordKey(scope: string, evidence: string) {
  return `${scope}:${createHash('sha256').update(evidence).digest('hex').slice(0, 16)}`;
}

function validSuccessAt(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const age = Date.now() - Date.parse(value);
  return Number.isFinite(age) && age >= -60_000 && age <= HISTORY_TTL_MS;
}

export async function readServiceProbeHistory(admin: SupabaseClient | null, key: string): Promise<SuccessHistory> {
  if (!admin) return {};
  try {
    const { data, error } = await admin.from('trader_cache').select('cache_key,payload,expires_at')
      .in('cache_key', EVIDENCE_KEYS.map(evidence => recordKey(key, evidence)))
      .gte('expires_at', new Date().toISOString()).limit(EVIDENCE_KEYS.length)
      .abortSignal(AbortSignal.timeout(1_200));
    if (error || !data) return {};
    const history: SuccessHistory = {};
    for (const row of data) {
      const payload: unknown = row.payload;
      if (!payload || typeof payload !== 'object' || Date.parse(row.expires_at) <= Date.now()) continue;
      const record = payload as { version?: unknown; evidenceKey?: unknown; checkedAt?: unknown };
      if (record.version === 1 && typeof record.evidenceKey === 'string' && EVIDENCE_KEYS.includes(record.evidenceKey)
        && row.cache_key === recordKey(key, record.evidenceKey) && validSuccessAt(record.checkedAt)) {
        history[record.evidenceKey] = record.checkedAt;
      }
    }
    return history;
  } catch {
    return {};
  }
}

/** Only probe-success timestamps are carried forward. Ledger creation time cannot become
 * recipient delivery time, and a successful /models probe cannot become a generation success. */
export function retainServiceProbeSuccesses(
  measurements: Array<OpsFeatureMeasurement | undefined>,
  previous: Array<OpsFeatureMeasurement | undefined>,
  history: SuccessHistory,
): SuccessHistory {
  const next = { ...history };
  for (const measurement of [...previous, ...measurements]) {
    for (const item of measurement?.evidence ?? []) {
      const key = evidenceKey(item);
      if (!key || !validSuccessAt(item.lastSuccessAt)) continue;
      if (!next[key] || Date.parse(next[key]) < Date.parse(item.lastSuccessAt)) next[key] = item.lastSuccessAt;
    }
  }
  for (const measurement of measurements) {
    for (const item of measurement?.evidence ?? []) {
      const key = evidenceKey(item);
      if (key && !item.lastSuccessAt && next[key]) item.lastSuccessAt = next[key];
    }
  }
  return next;
}

export function persistServiceProbeHistory(admin: SupabaseClient | null, key: string, history: SuccessHistory): void {
  if (!admin || !Object.keys(history).length) return;
  const write = async () => {
    try {
      // Each probe has its own monotonic timestamp. A newer success for the inbox cannot
      // cause a stale storage timestamp in the same snapshot to replace fresh storage evidence.
      const entries = Object.entries(history)
        .filter(([name, checkedAt]) => EVIDENCE_KEYS.includes(name) && validSuccessAt(checkedAt))
        .map(([name, checkedAt]) => ({
          cache_key: recordKey(key, name), payload: { version: 1, evidenceKey: name, checkedAt },
          updated_at: checkedAt, expires_at: new Date(Date.parse(checkedAt) + HISTORY_TTL_MS).toISOString(),
        }));
      await persistMonotonicOperationalRecords(admin, entries);
    } catch {
      // A history write cannot affect the just-completed measurement.
    }
  };
  try { after(write); } catch { void write(); }
}
