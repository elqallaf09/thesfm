import { NextRequest } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { ManualSourceRequestSchema, zodErrorDetails } from '@/lib/sharia-research/apiSchemas';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import { assertSafePublicUrl } from '@/lib/sharia-research/secureFetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 10, windowMs: 60_000, prefix: 'sharia-research-manual-source' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  let body: unknown = null;
  try { body = await request.json(); } catch { body = null; }
  const parsed = ManualSourceRequestSchema.safeParse(body);
  if (!parsed.success) return structuredError('VALIDATION_ERROR', 'The manual source request is invalid.', 400, zodErrorDetails(parsed.error));
  try { await assertSafePublicUrl(parsed.data.url); }
  catch (error) {
    return structuredError('UNSAFE_SOURCE_URL', error instanceof Error ? error.message : 'The source URL is blocked.', 400);
  }
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const job = await admin
    .from('sharia_research_jobs')
    .select('id,status,manual_urls')
    .eq('id', parsed.data.jobId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (job.error) return structuredError('JOB_LOAD_FAILED', 'The research job could not be loaded.', 500);
  if (!job.data) return structuredError('JOB_NOT_FOUND', 'The research job was not found.', 404);
  if (job.data.status !== 'queued') return structuredError('JOB_ALREADY_STARTED', 'Add manual sources before the research job starts, then request a fresh analysis.', 409);
  const urls = Array.from(new Set([...(Array.isArray(job.data.manual_urls) ? job.data.manual_urls.map(String) : []), parsed.data.url])).slice(0, 3);
  const updated = await admin
    .from('sharia_research_jobs')
    .update({ manual_urls: urls })
    .eq('id', parsed.data.jobId)
    .eq('user_id', user.id)
    .eq('status', 'queued')
    .select('id,manual_urls')
    .maybeSingle();
  if (updated.error || !updated.data) return structuredError('MANUAL_SOURCE_SAVE_FAILED', 'The source could not be attached before the job started.', 409);
  return privateJson({ ok: true, jobId: updated.data.id, manualUrls: updated.data.manual_urls });
}
