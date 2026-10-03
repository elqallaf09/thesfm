import 'server-only';
import { createHash } from 'node:crypto';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseAdmin } from './adminAccess';
import { persistMonotonicOperationalRecords } from './operationalHealthCache';

export const AI_GENERATION_FRESH_MS = 15 * 60_000;
const RETENTION_MS = 24 * 60 * 60_000;
const QUERY_TIMEOUT_MS = 1_200;
const CACHE_PREFIX = 'ops_ai_generation_v1';
const SAFE_FAILURE_CODES = [
  'AI_PROVIDER_TIMEOUT', 'AI_PROVIDER_AUTH_REJECTED', 'AI_PROVIDER_RATE_LIMITED',
  'AI_PROVIDER_HTTP_ERROR', 'AI_PROVIDER_EMPTY_RESPONSE', 'AI_PROVIDER_NETWORK_ERROR',
] as const;

export type AiGenerationFailureCode = typeof SAFE_FAILURE_CODES[number];
export type AiGenerationIdentity = { capability: 'text' | 'vision'; configurationId: string };
export type AiGenerationOutcome = AiGenerationIdentity & {
  provider: 'sfm-private-primary' | 'sfm-private-fallback';
  outcome: 'success' | 'failure';
  checkedAt: string;
  latencyMs: number;
  reasonCode: AiGenerationFailureCode | null;
};

const memory = new Map<string, AiGenerationOutcome>();

/** A change of endpoint, model, or credential invalidates previous readiness evidence.
 * Only this one-way configuration identifier is retained; endpoints and keys never leave here. */
export function aiGenerationIdentity(
  candidates: Array<{ provider: string; baseURL: string; model: string; apiKey: string | null }>,
  capability: AiGenerationIdentity['capability'],
): AiGenerationIdentity {
  const configurationId = createHash('sha256')
    .update(JSON.stringify(candidates.map(({ provider, baseURL, model, apiKey }) => [provider, baseURL, model, apiKey])))
    .digest('hex').slice(0, 32);
  return { capability, configurationId };
}

function keyFor(identity: AiGenerationIdentity, outcome: AiGenerationOutcome['outcome']) {
  return `${CACHE_PREFIX}:${identity.capability}:${identity.configurationId}:${outcome}`;
}

function isOutcome(value: unknown): value is AiGenerationOutcome {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<AiGenerationOutcome>;
  return (row.capability === 'text' || row.capability === 'vision')
    && typeof row.configurationId === 'string' && /^[a-f0-9]{32}$/.test(row.configurationId)
    && (row.provider === 'sfm-private-primary' || row.provider === 'sfm-private-fallback')
    && (row.outcome === 'success' || row.outcome === 'failure')
    && typeof row.checkedAt === 'string' && Number.isFinite(Date.parse(row.checkedAt))
    && typeof row.latencyMs === 'number' && Number.isFinite(row.latencyMs) && row.latencyMs >= 0
    && (row.reasonCode === null || SAFE_FAILURE_CODES.includes(row.reasonCode as AiGenerationFailureCode));
}

export function aiGenerationFailureCode(error: unknown): AiGenerationFailureCode {
  if (!error || typeof error !== 'object') return 'AI_PROVIDER_NETWORK_ERROR';
  const record = error as { status?: unknown; message?: unknown };
  if (record.message === 'AI_PROVIDER_TIMEOUT') return 'AI_PROVIDER_TIMEOUT';
  if (record.message === 'AI_PROVIDER_EMPTY_RESPONSE') return 'AI_PROVIDER_EMPTY_RESPONSE';
  if (record.status === 401 || record.status === 403) return 'AI_PROVIDER_AUTH_REJECTED';
  if (record.status === 429) return 'AI_PROVIDER_RATE_LIMITED';
  if (typeof record.status === 'number') return 'AI_PROVIDER_HTTP_ERROR';
  return 'AI_PROVIDER_NETWORK_ERROR';
}

/** Records only the final outcome of an actual generation request, after fallback attempts.
 * Quota consumption and GET /models never call this. No prompts, answers, user identifiers,
 * correlation identifiers, token counts, URLs, or raw provider error messages are retained. */
export function recordAiGenerationOutcome(input: AiGenerationOutcome): void {
  // Construct an allowlisted record even when a caller passes additional properties at runtime.
  const entry: AiGenerationOutcome = {
    capability: input.capability, configurationId: input.configurationId, provider: input.provider,
    outcome: input.outcome, checkedAt: input.checkedAt, latencyMs: input.latencyMs,
    reasonCode: input.outcome === 'success' ? null : input.reasonCode,
  };
  if (!isOutcome(entry)) return;
  const key = keyFor(entry, entry.outcome);
  const previous = memory.get(key);
  if (previous && Date.parse(previous.checkedAt) > Date.parse(entry.checkedAt)) return;
  memory.set(key, entry);
  // At most two records per active configuration; evict expired or superseded configurations.
  for (const [cacheKey, value] of memory) {
    if (Date.now() - Date.parse(value.checkedAt) > RETENTION_MS || memory.size > 32) memory.delete(cacheKey);
  }

  const persist = async () => {
    try {
      const admin = createServerSupabaseAdmin();
      if (!admin) return;
      // trader_cache is an existing service-role-only table. Success and failure are retained
      // separately, so a failing attempt cannot erase the last known successful completion.
      await persistMonotonicOperationalRecords(admin, [{
        cache_key: key, payload: entry, updated_at: entry.checkedAt,
        expires_at: new Date(Date.parse(entry.checkedAt) + RETENTION_MS).toISOString(),
      }]);
    } catch {
      // Telemetry must not change the response returned by the model transport.
    }
  };
  try {
    // Keeps the bounded write alive on serverless after the user response is sent.
    after(persist);
  } catch {
    // Non-Next callers have no request lifetime hook; local evidence remains available.
    void persist();
  }
}

export async function readAiGenerationOutcomes(
  identities: AiGenerationIdentity[],
  admin: SupabaseClient | null,
): Promise<{ outcomes: AiGenerationOutcome[]; available: boolean }> {
  const keys = identities.flatMap(identity => [keyFor(identity, 'success'), keyFor(identity, 'failure')]);
  const now = Date.now();
  const results = new Map<string, AiGenerationOutcome>();
  const accept = (key: string, value: unknown) => {
    if (!keys.includes(key) || !isOutcome(value) || key !== keyFor(value, value.outcome)) return;
    const age = now - Date.parse(value.checkedAt);
    if (age < -60_000 || age > RETENTION_MS) return;
    const previous = results.get(key);
    if (!previous || Date.parse(previous.checkedAt) < Date.parse(value.checkedAt)) results.set(key, value);
  };
  for (const key of keys) accept(key, memory.get(key));
  if (keys.length === 0) return { outcomes: [], available: true };
  let available = false;
  if (admin) {
    try {
      const { data, error } = await admin.from('trader_cache')
        .select('cache_key,payload,expires_at').in('cache_key', keys)
        .gte('expires_at', new Date(now).toISOString()).limit(8)
        .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS));
      available = !error;
      if (!error) for (const row of data ?? []) accept(String(row.cache_key), row.payload);
    } catch {
      // A telemetry-read failure is an observation gap, not an AI-generation failure.
    }
  }
  return { outcomes: [...results.values()], available: available || results.size > 0 };
}

export function __resetAiGenerationTelemetryForTests() {
  memory.clear();
}
