import 'server-only';
import { createServerSupabaseAdmin } from './adminAccess';
import type { AiUsageTracking } from './aiUsage';

export type OpenAiTokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  reasoningTokens: number | null;
  complete: boolean;
};

export type OpenAiAdvisorUsage = {
  version: 1;
  application: 'sfm';
  provider: 'openai';
  endpoint: 'responses';
  requestedModel: string;
  model: string | null;
  organizationId: string | null;
  projectId: string | null;
  outcome: 'pending' | 'success' | 'failure' | 'incomplete';
  startedAt: string;
  completedAt: string | null;
  latencyMs: number | null;
  httpStatus: number | null;
  reasonCode: string | null;
  clientRequestId: string | null;
  requestId: string | null;
  responseId: string | null;
  usage: OpenAiTokenUsage | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Absence or invalid usage is unknown, never a zero-cost request. */
export function parseOpenAiTokenUsage(value: unknown): OpenAiTokenUsage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = object(value);
  const inputTokens = count(raw.input_tokens);
  const outputTokens = count(raw.output_tokens);
  const totalTokens = count(raw.total_tokens);
  const inputDetails = object(raw.input_tokens_details);
  const outputDetails = object(raw.output_tokens_details);
  const cached = count(inputDetails.cached_tokens);
  const writes = count(inputDetails.cache_write_tokens);
  const reasoning = count(outputDetails.reasoning_tokens);
  return {
    inputTokens, outputTokens, totalTokens,
    cachedInputTokens: cached !== null && inputTokens !== null && cached <= inputTokens ? cached : null,
    cacheWriteTokens: writes !== null && inputTokens !== null && writes <= inputTokens ? writes : null,
    reasoningTokens: reasoning !== null && outputTokens !== null && reasoning <= outputTokens ? reasoning : null,
    complete: inputTokens !== null && outputTokens !== null && totalTokens === inputTokens + outputTokens,
  };
}

/** Only updates the existing authenticated owner's reserved quota event. */
export async function writeOpenAiAdvisorUsage(tracking: AiUsageTracking, entry: OpenAiAdvisorUsage): Promise<boolean> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return false;
    const { data, error } = await admin.from('ai_usage_events')
      .update({ metadata: { ...tracking.metadata, openaiUsage: entry } })
      .eq('id', tracking.eventId).eq('user_id', tracking.userId)
      .select('id').abortSignal(AbortSignal.timeout(1_500)).maybeSingle();
    return !error && data?.id === tracking.eventId;
  } catch {
    return false;
  }
}

/** Observed tokens only. This is neither an invoice nor the remaining promotional balance. */
export function summarizeOpenAiAdvisorUsage(events: Array<{ metadata?: unknown }>) {
  const records = events.map(event => object(object(event.metadata).openaiUsage))
    .filter(entry => entry.version === 1 && entry.application === 'sfm' && entry.provider === 'openai');
  const measured = records.filter(entry => object(entry.usage).complete === true);
  const sum = (key: keyof OpenAiTokenUsage) => {
    const values = records.map(entry => count(object(entry.usage)[key]));
    const known = values.filter((value): value is number => value !== null);
    return { observed: known.length ? known.reduce((total, value) => total + value, 0) : null, measuredRequests: known.length };
  };
  return {
    application: 'sfm', provider: 'openai', requests: records.length,
    successfulRequests: records.filter(entry => entry.outcome === 'success').length,
    pendingRequests: records.filter(entry => entry.outcome === 'pending').length,
    failedRequests: records.filter(entry => entry.outcome === 'failure' || entry.outcome === 'incomplete').length,
    measuredRequests: measured.length, unmeasuredRequests: records.length - measured.length,
    complete: records.length > 0 && measured.length === records.length,
    inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), totalTokens: sum('totalTokens'),
    cachedInputTokens: sum('cachedInputTokens'), cacheWriteTokens: sum('cacheWriteTokens'), reasoningTokens: sum('reasoningTokens'),
    billedUsd: null, remainingCreditUsd: null,
    billingSource: 'OpenAI organization billing and usage dashboard',
  };
}
