import { NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import type { ShariaScreeningResult } from '@/lib/sharia-research/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ resultId: string }> }) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'sharia-research-result' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  const { resultId } = await context.params;
  if (!z.string().uuid().safeParse(resultId).success) return structuredError('INVALID_RESULT_ID', 'The result identifier is invalid.', 400);
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const response = await admin
    .from('sharia_screening_results')
    .select('id,result_payload,research_timestamp,cache_state,invalidated_at')
    .eq('id', resultId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (response.error) return structuredError('RESULT_LOAD_FAILED', 'The screening result could not be loaded.', 500);
  if (!response.data) return structuredError('RESULT_NOT_FOUND', 'The screening result was not found.', 404);
  const stored = response.data.result_payload as ShariaScreeningResult;
  const outdated = Boolean(response.data.invalidated_at) || response.data.cache_state === 'outdated';
  return privateJson({
    ok: true,
    result: { ...stored, cacheState: outdated ? 'outdated' : stored.cacheState },
    invalidatedAt: response.data.invalidated_at,
  });
}
