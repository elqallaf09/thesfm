import { after, NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import { processResearchJob } from '@/lib/sharia-research/jobService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ jobId: string }> };

function publicJob(row: Record<string, any>) {
  return {
    id: row.id,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    candidates: row.candidates ?? [],
    partialErrors: row.partial_errors ?? [],
    resultId: row.result_id,
    error: row.error_code ? { code: row.error_code, message: row.error_message } : null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const limited = rateLimitRequest(request, { max: 90, prefix: 'sharia-research-job-status' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  const { jobId } = await context.params;
  if (!z.string().uuid().safeParse(jobId).success) return structuredError('INVALID_JOB_ID', 'The job identifier is invalid.', 400);
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const response = await admin.from('sharia_research_jobs').select('*').eq('id', jobId).eq('user_id', user.id).maybeSingle();
  if (response.error) return structuredError('JOB_STATUS_FAILED', 'The research job could not be loaded.', 500);
  if (!response.data) return structuredError('JOB_NOT_FOUND', 'The research job was not found.', 404);
  const staleRunning = response.data.status === 'running'
    && Date.now() - new Date(response.data.updated_at).getTime() >= 2 * 60 * 1000;
  if (response.data.status === 'queued' || staleRunning) {
    after(async () => {
      try { await processResearchJob(admin, jobId, user.id); }
      catch (error) { console.error('[sharia-research] queued retry failed', { jobId, message: error instanceof Error ? error.message : String(error) }); }
    });
  }
  return privateJson({ ok: true, job: publicJob(response.data) });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = rateLimitRequest(request, { max: 12, prefix: 'sharia-research-job-cancel' });
  if (limited) return limited;
  const user = await getCurrentUserFromRequest(request);
  if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required.', 401);
  const { jobId } = await context.params;
  if (!z.string().uuid().safeParse(jobId).success) return structuredError('INVALID_JOB_ID', 'The job identifier is invalid.', 400);
  const admin = createServerSupabaseAdmin();
  if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);
  const updated = await admin.from('sharia_research_jobs').update({
    status: 'cancelled',
    cancellation_requested_at: new Date().toISOString(),
    error_code: 'JOB_CANCELLED_BY_USER',
  }).eq('id', jobId).eq('user_id', user.id).in('status', ['queued', 'running', 'awaiting_selection']).select('id,status').maybeSingle();
  if (updated.error) return structuredError('JOB_CANCEL_FAILED', 'The research job could not be cancelled.', 500);
  if (!updated.data) return structuredError('JOB_NOT_CANCELLABLE', 'The job is complete, expired, or was not found.', 409);
  return privateJson({ ok: true, job: updated.data });
}
