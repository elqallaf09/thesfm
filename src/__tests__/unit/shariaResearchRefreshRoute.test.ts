import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createAdmin: vi.fn(),
  resolveAndCreate: vi.fn(),
  processJob: vi.fn(),
  after: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: mocks.after };
});
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: vi.fn(() => null) }));
vi.mock('@/lib/server/adminAccess', () => ({
  getCurrentUserFromRequest: mocks.getUser,
  createServerSupabaseAdmin: mocks.createAdmin,
}));
vi.mock('@/lib/sharia-research/jobService', () => ({
  resolveAndCreateJob: mocks.resolveAndCreate,
  processResearchJob: mocks.processJob,
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/sharia-research/results/[resultId]/refresh/route';

const sourceResultId = '11111111-1111-4111-8111-111111111111';
const refreshedResultId = '22222222-2222-4222-8222-222222222222';

function query(result: { data: Record<string, unknown> | null; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

function request() {
  return new NextRequest(`https://www.the-sfm.com/api/sharia-research/results/${sourceResultId}/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ force: true }),
  });
}

describe('POST /api/sharia-research/results/[resultId]/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'user-1' });

    const resultQuery = query({
      data: { id: sourceResultId, job_id: 'job-original', methodology_id: 'msci-islamic-index-series-assets' },
      error: null,
    });
    const jobQuery = query({
      data: {
        original_query: 'Emirates NBD',
        normalized_query: { exchangeHint: 'DFM' },
        request_payload: { forceRefresh: false, market: 'DFM' },
      },
      error: null,
    });
    mocks.createAdmin.mockReturnValue({
      from: vi.fn((table: string) => table === 'sharia_screening_results' ? resultQuery : jobQuery),
    });
  });

  it('returns the stored result id without rescheduling an already-completed refresh job', async () => {
    mocks.resolveAndCreate.mockResolvedValue({
      kind: 'job',
      job: { id: 'job-refresh', status: 'completed', result_id: refreshedResultId },
    });

    const response = await POST(request(), { params: Promise.resolve({ resultId: sourceResultId }) });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      success: true,
      status: 'completed',
      jobId: 'job-refresh',
      resultId: refreshedResultId,
    });
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.processJob).not.toHaveBeenCalled();
    expect(mocks.resolveAndCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      query: 'Emirates NBD',
      market: 'DFM',
      forceRefresh: true,
    }));
  });
});
