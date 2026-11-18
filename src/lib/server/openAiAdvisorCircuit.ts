import 'server-only';
import { createServerSupabaseAdmin } from './adminAccess';

export const OPENAI_ADVISOR_CREDIT_PAUSE_MS = 5 * 60_000;
const creditReasons = ['CREDIT_BALANCE_EXHAUSTED', 'USAGE_LIMIT_REACHED'] as const;
type CreditReason = typeof creditReasons[number];

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** A throttle, network failure or provider message is not proof of a credit cap. */
export function openAiCreditFailure(status: number, payload: unknown): CreditReason | null {
  if (status !== 429) return null;
  const error = object(object(payload).error);
  if (error.code === 'credit_balance_exhausted') return 'CREDIT_BALANCE_EXHAUSTED';
  if (['insufficient_quota', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'].includes(String(error.code))
    || (!error.code && error.type === 'insufficient_quota')) return 'USAGE_LIMIT_REACHED';
  return null;
}

/** Read existing owner-bound evidence, so a serverless restart cannot erase a
 * credit pause. No balance or secret-derived fingerprint is stored. null means
 * the accounting check failed and no new provider attempt is permitted. */
export async function openAiAdvisorCreditPaused(input: {
  userId: string;
  model: string;
  organizationId: string | null;
  projectId: string | null;
  now?: number;
}): Promise<boolean | null> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin || !input.userId) return null;
    const now = input.now ?? Date.now();
    const scope = {
      version: 1, application: 'sfm', provider: 'openai', requestedModel: input.model,
      organizationId: input.organizationId, projectId: input.projectId,
    };
    const { data, error } = await admin.from('ai_usage_events')
      .select('metadata').eq('user_id', input.userId)
      .contains('metadata', { openaiUsage: scope })
      .eq('metadata->openaiUsage->>outcome', 'failure')
      .eq('metadata->openaiUsage->>httpStatus', '429')
      .in('metadata->openaiUsage->>reasonCode', [...creditReasons])
      // An allowance event can precede the bounded 60-second route execution.
      .gte('created_at', new Date(now - OPENAI_ADVISOR_CREDIT_PAUSE_MS - 60_000).toISOString())
      // Overlapping requests can complete out of creation order. ISO UTC values
      // preserve the latest completion and therefore the full credit pause.
      .order('metadata->openaiUsage->>completedAt', { ascending: false }).limit(1)
      .abortSignal(AbortSignal.timeout(1_500)).maybeSingle();
    if (error) return null;
    if (!data) return false;
    const entry = object(object(data.metadata).openaiUsage);
    if (Object.entries(scope).some(([key, value]) => entry[key] !== value)
      || entry.outcome !== 'failure' || entry.httpStatus !== 429
      || !creditReasons.includes(entry.reasonCode as CreditReason)) return null;
    const completedAt = typeof entry.completedAt === 'string' ? Date.parse(entry.completedAt) : NaN;
    if (!Number.isFinite(completedAt) || completedAt > now + 60_000) return null;
    return now < completedAt + OPENAI_ADVISOR_CREDIT_PAUSE_MS;
  } catch {
    return null;
  }
}
