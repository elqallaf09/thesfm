import { NextRequest } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 30, prefix: 'sharia-research-history' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const response = await admin
    .from('sharia_search_history')
    .select('id,job_id,result_id,original_query,outcome,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (response.error) return structuredError('HISTORY_LOAD_FAILED', 'Search history could not be loaded.', 500);
  return privateJson({ ok: true, items: response.data ?? [] });
}
