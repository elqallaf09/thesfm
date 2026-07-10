import { after, NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { RefreshRequestSchema, zodErrorDetails } from '@/lib/sharia-research/apiSchemas';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import { processResearchJob, resolveAndCreateJob } from '@/lib/sharia-research/jobService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest, context: { params: Promise<{ resultId: string }> }) {
  const limited = rateLimitRequest(request, { max: 6, windowMs: 60_000, prefix: 'sharia-research-refresh' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  const { resultId } = await context.params;
  if (!z.string().uuid().safeParse(resultId).success) return structuredError('INVALID_RESULT_ID', 'The result identifier is invalid.', 400);
  let body: unknown = {};
  try { body = await request.json(); } catch { body = {}; }
  const parsed = RefreshRequestSchema.safeParse(body);
  if (!parsed.success) return structuredError('VALIDATION_ERROR', 'The refresh request is invalid.', 400, zodErrorDetails(parsed.error));
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const result = await admin
    .from('sharia_screening_results')
    .select('id,job_id,methodology_id')
    .eq('id', resultId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (result.error) return structuredError('RESULT_LOAD_FAILED', 'The result could not be loaded.', 500);
  if (!result.data) return structuredError('RESULT_NOT_FOUND', 'The screening result was not found.', 404);
  const previousJob = await admin
    .from('sharia_research_jobs')
    .select('original_query')
    .eq('id', result.data.job_id)
    .eq('user_id', user.id)
    .single();
  if (previousJob.error || !previousJob.data) return structuredError('SOURCE_JOB_NOT_FOUND', 'The original research query could not be recovered.', 409);
  try {
    const created = await resolveAndCreateJob(admin, {
      userId: user.id,
      query: previousJob.data.original_query,
      methodologyId: result.data.methodology_id,
      forceRefresh: true,
    });
    if (created.kind !== 'job') return structuredError('REFRESH_IDENTITY_UNRESOLVED', 'The security identity must be selected again before refresh.', 409, created.kind === 'ambiguous' ? { candidates: created.resolution.candidates } : undefined);
    after(async () => {
      try { await processResearchJob(admin, created.job.id, user.id); }
      catch (error) { console.error('[sharia-research] refresh failed', { jobId: created.job.id, message: error instanceof Error ? error.message : String(error) }); }
    });
    return privateJson({ ok: true, status: created.job.status, jobId: created.job.id }, { status: 202 });
  } catch (error) {
    console.error('[sharia-research] refresh creation failed', { resultId, message: error instanceof Error ? error.message : String(error) });
    return structuredError('REFRESH_CREATE_FAILED', 'A fresh research job could not be created.', 500);
  }
}
