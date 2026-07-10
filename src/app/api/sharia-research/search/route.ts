import { after, NextRequest } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { SearchRequestSchema, zodErrorDetails } from '@/lib/sharia-research/apiSchemas';
import { privateJson, structuredError } from '@/lib/sharia-research/apiResponse';
import { processResearchJob, resolveAndCreateJob } from '@/lib/sharia-research/jobService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function parseBody(request: Request) {
  try { return await request.json(); } catch { return null; }
}

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  try {
    const limited = rateLimitRequest(request, { max: 8, windowMs: 60_000, prefix: 'sharia-research-search' });
    if (limited) {
      return privateJson(
        { ok: false, success: false, error: { code: 'RATE_LIMITED', message: 'Too many research requests.' } },
        { status: 429, headers: { 'Retry-After': limited.headers.get('retry-after') || '60' } },
      );
    }
    const user = await getCurrentUserFromRequest(request);
    if (!user) return structuredError('AUTH_REQUIRED', 'Authentication is required to keep research private.', 401);
    userId = user.id;
    const parsed = SearchRequestSchema.safeParse(await parseBody(request));
    if (!parsed.success) return structuredError('VALIDATION_ERROR', 'The search request is invalid.', 400, zodErrorDetails(parsed.error));
    const admin = createServerSupabaseAdmin();
    if (!admin) return structuredError('RESEARCH_STORAGE_NOT_CONFIGURED', 'The research database service is not configured.', 503);

    const created = await resolveAndCreateJob(admin, {
      userId: user.id,
      query: parsed.data.query,
      market: parsed.data.market,
      methodologyId: parsed.data.methodologyId,
      selectedCanonicalId: parsed.data.selectedCanonicalId,
      forceRefresh: parsed.data.forceRefresh,
    });
    if (created.kind === 'not_found') {
      return structuredError('SECURITY_NOT_FOUND', 'No supported public source confirmed this security identity.', 404, { reason: created.resolution.reason });
    }
    if (created.kind === 'invalid_selection') {
      return structuredError('SECURITY_SELECTION_INVALID', 'The selected security was not among the confirmed candidates.', 409);
    }
    if (created.kind === 'ambiguous') {
      return privateJson({
        ok: true,
        status: 'awaiting_selection',
        jobId: created.job.id,
        candidates: created.resolution.candidates,
        normalizedQuery: created.resolution.query,
      }, { status: 202 });
    }
    if (created.kind === 'cached') {
      return privateJson({
        ok: true,
        status: 'completed',
        cacheState: 'recently_cached',
        resultId: created.cached.id,
        result: created.cached.result,
      });
    }
    if (created.job.status === 'queued') {
      after(async () => {
        try { await processResearchJob(admin, created.job.id, user.id); }
        catch (error) { console.error('[sharia-research] background job failed', { jobId: created.job.id, message: error instanceof Error ? error.message : String(error) }); }
      });
    }
    return privateJson({
      ok: true,
      status: created.job.status,
      jobId: created.job.id,
      progress: created.job.progress,
      currentStep: created.job.current_step,
      security: created.security,
    }, { status: 202 });
  } catch (error) {
    console.error('[sharia-research] search creation failed', { userId, message: error instanceof Error ? error.message : String(error) });
    return structuredError('RESEARCH_START_FAILED', 'The research job could not be started.', 500);
  }
}
