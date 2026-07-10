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
import { POST } from '@/app/api/sharia-research/search/route';

const security = {
  id: 'security-1', canonicalId: 'sec:nvda', name: 'NVIDIA Corporation', ticker: 'NVDA',
  providerSymbol: 'NVDA', exchange: 'Nasdaq', aliases: [], previousNames: [], identitySources: [],
};

function request(query: string) {
  return new NextRequest('https://www.the-sfm.com/api/sharia-research/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query }),
  });
}

describe('POST /api/sharia-research/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'user-1' });
    mocks.createAdmin.mockReturnValue({ from: vi.fn() });
    mocks.resolveAndCreate.mockResolvedValue({
      kind: 'created', security,
      job: { id: 'job-nvda', status: 'queued', progress: 5, current_step: 'identifying_security' },
    });
  });

  it('starts an NVDA research job and returns JSON success', async () => {
    const response = await POST(request('NVDA'));
    expect(response.status).toBe(202);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: true, success: true, jobId: 'job-nvda', status: 'queued',
    });
    expect(mocks.after).toHaveBeenCalledOnce();
  });

  it('passes an Arabic company name to security resolution', async () => {
    const response = await POST(request('إنفيديا'));
    expect(response.status).toBe(202);
    expect(mocks.resolveAndCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ query: 'إنفيديا' }));
  });

  it('returns a JSON 401 without redirecting API authentication failures', async () => {
    mocks.getUser.mockResolvedValue(null);
    const response = await POST(request('NVDA'));
    expect(response.status).toBe(401);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({ success: false, error: { code: 'AUTH_REQUIRED' } });
  });

  it('returns structured JSON when job creation fails', async () => {
    mocks.resolveAndCreate.mockRejectedValue(new Error('database unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await POST(request('NVDA'));
    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({ success: false, error: { code: 'RESEARCH_START_FAILED' } });
  });
});
