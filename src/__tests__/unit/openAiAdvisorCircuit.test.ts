import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openAiAdvisorCreditPaused, openAiCreditFailure, OPENAI_ADVISOR_CREDIT_PAUSE_MS } from '@/lib/server/openAiAdvisorCircuit';

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), contains: vi.fn(), in: vi.fn(), gte: vi.fn(), order: vi.fn(), limit: vi.fn(), finish: vi.fn(), adminAvailable: true }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => {
  if (!mocks.adminAvailable) return null;
  const query = {
    select: (...args: unknown[]) => { mocks.select(...args); return query; },
    eq: (...args: unknown[]) => { mocks.eq(...args); return query; },
    contains: (...args: unknown[]) => { mocks.contains(...args); return query; },
    in: (...args: unknown[]) => { mocks.in(...args); return query; },
    gte: (...args: unknown[]) => { mocks.gte(...args); return query; },
    order: (...args: unknown[]) => { mocks.order(...args); return query; },
    limit: (...args: unknown[]) => { mocks.limit(...args); return query; },
    abortSignal: () => query, maybeSingle: mocks.finish,
  };
  return { from: (...args: unknown[]) => { mocks.from(...args); return query; } };
} }));

const now = Date.parse('2026-11-19T12:00:00Z');
const input = { userId: 'owner-a', model: 'configured-model', organizationId: 'org-owner', projectId: 'proj-advisor', now };
const entry = {
  version: 1, application: 'sfm', provider: 'openai', requestedModel: input.model,
  organizationId: input.organizationId, projectId: input.projectId,
  outcome: 'failure', httpStatus: 429, reasonCode: 'CREDIT_BALANCE_EXHAUSTED', completedAt: new Date(now - 1_000).toISOString(),
};
const record = (changes: Record<string, unknown> = {}) => ({ data: { metadata: { openaiUsage: { ...entry, ...changes } } }, error: null });
beforeEach(() => { vi.clearAllMocks(); mocks.adminAvailable = true; mocks.finish.mockResolvedValue(record()); });
afterEach(() => vi.restoreAllMocks());

describe('explicit OpenAI credit failure classification', () => {
  it.each([
    [429, { error: { code: 'credit_balance_exhausted' } }, 'CREDIT_BALANCE_EXHAUSTED'],
    [429, { error: { code: 'insufficient_quota' } }, 'USAGE_LIMIT_REACHED'],
    [429, { error: { type: 'insufficient_quota' } }, 'USAGE_LIMIT_REACHED'],
    [429, { error: { code: 'project_spend_limit_exceeded' } }, 'USAGE_LIMIT_REACHED'],
    [429, { error: { code: 'organization_spend_limit_exceeded' } }, 'USAGE_LIMIT_REACHED'],
    [429, { error: { code: 'organization_usage_limit_exceeded' } }, 'USAGE_LIMIT_REACHED'],
    [429, { error: { code: 'rate_limit_exceeded', type: 'insufficient_quota' } }, null],
    [429, { error: { message: 'credit_balance_exhausted' } }, null],
    [401, { error: { code: 'credit_balance_exhausted' } }, null],
    [503, { error: { code: 'insufficient_quota' } }, null],
    [429, null, null],
  ])('classifies HTTP%s with structured body %j', (status, payload, expected) => {
    expect(openAiCreditFailure(status, payload)).toBe(expected);
  });
});

describe('durable owner-scoped credit pause', () => {
  it('reads only recent matching owner and provider evidence without storing key material', async () => {
    expect(await openAiAdvisorCreditPaused(input)).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('ai_usage_events');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', input.userId);
    expect(mocks.contains).toHaveBeenCalledWith('metadata', { openaiUsage: {
      version: 1, application: 'sfm', provider: 'openai', requestedModel: input.model,
      organizationId: input.organizationId, projectId: input.projectId,
    } });
    expect(mocks.in).toHaveBeenCalledWith('metadata->openaiUsage->>reasonCode', ['CREDIT_BALANCE_EXHAUSTED', 'USAGE_LIMIT_REACHED']);
    expect(mocks.gte).toHaveBeenCalledWith('created_at', new Date(now - OPENAI_ADVISOR_CREDIT_PAUSE_MS - 60_000).toISOString());
    expect(mocks.order).toHaveBeenCalledWith('metadata->openaiUsage->>completedAt', { ascending: false });
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it('expires exactly five minutes after the recorded failure without background model calls', async () => {
    mocks.finish.mockResolvedValue(record({ completedAt: new Date(now - OPENAI_ADVISOR_CREDIT_PAUSE_MS).toISOString() }));
    expect(await openAiAdvisorCreditPaused(input)).toBe(false);
    mocks.finish.mockResolvedValue(record({ completedAt: new Date(now - OPENAI_ADVISOR_CREDIT_PAUSE_MS + 1).toISOString() }));
    expect(await openAiAdvisorCreditPaused(input)).toBe(true);
  });

  it('permits an owner/configuration with no matching failure to try OpenAI normally', async () => {
    mocks.finish.mockResolvedValue({ data: null, error: null });
    expect(await openAiAdvisorCreditPaused({ ...input, userId: 'owner-b', model: 'new-model', projectId: 'proj-new' })).toBe(false);
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner-b');
    expect(mocks.contains).toHaveBeenCalledWith('metadata', { openaiUsage: expect.objectContaining({ requestedModel: 'new-model', projectId: 'proj-new' }) });
  });

  it.each([
    { requestedModel: 'different-model' }, { organizationId: 'other-org' }, { projectId: 'other-project' },
    { provider: 'private' }, { reasonCode: 'HTTP_429' }, { outcome: 'success' }, { httpStatus: 503 },
    { completedAt: null }, { completedAt: 'invalid' }, { completedAt: new Date(now + 60_001).toISOString() },
  ])('fails closed on unexpected or malformed ledger evidence %j', async changes => {
    mocks.finish.mockResolvedValue(record(changes));
    expect(await openAiAdvisorCreditPaused(input)).toBeNull();
  });

  it('fails closed when accounting is unavailable or the read throws', async () => {
    mocks.finish.mockResolvedValue({ data: null, error: { code: 'unavailable' } });
    expect(await openAiAdvisorCreditPaused(input)).toBeNull();
    mocks.finish.mockRejectedValue(new Error('private database detail'));
    expect(await openAiAdvisorCreditPaused(input)).toBeNull();
    mocks.adminAvailable = false;
    expect(await openAiAdvisorCreditPaused(input)).toBeNull();
  });
});
