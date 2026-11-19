import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advisorProviderConfigured, generateAdvisorReply, usesOpenAiAdvisor } from '@/lib/server/advisorProvider';
import { parseOpenAiTokenUsage, summarizeOpenAiAdvisorUsage, writeOpenAiAdvisorUsage, type OpenAiAdvisorUsage } from '@/lib/server/openAiAdvisorUsage';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), update: vi.fn(), eq: vi.fn(), finish: vi.fn(), after: [] as Array<() => Promise<void>>,
  privateReply: vi.fn(), privateConfigured: vi.fn(), read: vi.fn(), readEq: vi.fn(), readScope: vi.fn(),
}));
vi.mock('@/lib/server/aiProvider', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/server/aiProvider')>();
  return { ...original, generateAssistantReply: mocks.privateReply, aiProviderConfigured: mocks.privateConfigured };
});
vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => { mocks.after.push(task); } }));
vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: () => ({ from: () => ({
    select: () => {
      const query = {
        eq: (...args: unknown[]) => { mocks.readEq(...args); return query; },
        contains: (...args: unknown[]) => { mocks.readScope(...args); return query; },
        in: () => query, gte: () => query, order: () => query, limit: () => query,
        abortSignal: () => query, maybeSingle: mocks.read,
      };
      return query;
    },
    update: (value: unknown) => {
      mocks.update(JSON.parse(JSON.stringify(value)));
      const query = {
        eq: (...args: unknown[]) => { mocks.eq(...args); return query; },
        select: () => query,
        maybeSingle: mocks.finish,
        abortSignal: () => query,
      };
      return query;
    },
  }) }),
}));

const environment = ['SFM_ADVISOR_PROVIDER', 'SFM_OPENAI_PILOT_USER_IDS', 'SFM_OPENAI_API_KEY', 'OPENAI_API_KEY', 'SFM_OPENAI_MODEL', 'SFM_OPENAI_ORGANIZATION', 'SFM_OPENAI_PROJECT'];
const tracking = { eventId: 'reserved-event', userId: 'pilot-user', metadata: { route: '/api/intelligence/chat' } };
const input = { userId: 'pilot-user', system: 'private financial facts', messages: [{ role: 'user' as const, content: 'private question' }], correlationId: 'correlation-1', tracking };
const tokenUsage = { input_tokens: 100, output_tokens: 40, total_tokens: 140, input_tokens_details: { cached_tokens: 20, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 10 } };
function payload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resp_observed', model: 'gpt-6.1-sol-snapshot', status: 'completed', usage: tokenUsage,
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'private answer' }] }],
    ...overrides,
  };
}
function response(value: unknown = payload(), status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'x-request-id': 'req_observed' } });
}
function enablePilot() {
  vi.stubEnv('SFM_ADVISOR_PROVIDER', 'openai');
  vi.stubEnv('SFM_OPENAI_PILOT_USER_IDS', 'pilot-user');
  vi.stubEnv('SFM_OPENAI_API_KEY', 'sfm-project-secret');
  vi.stubEnv('SFM_OPENAI_MODEL', 'gpt-6.1-sol');
  vi.stubEnv('SFM_OPENAI_ORGANIZATION', 'org_selected');
  vi.stubEnv('SFM_OPENAI_PROJECT', 'proj_sfm');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.after.length = 0;
  for (const key of environment) vi.stubEnv(key, '');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue(response());
  mocks.finish.mockResolvedValue({ data: { id: tracking.eventId }, error: null });
  mocks.read.mockResolvedValue({ data: null, error: null });
  mocks.privateConfigured.mockReturnValue(true);
  mocks.privateReply.mockResolvedValue({ text: 'private reply', provider: 'sfm-private-primary', model: 'sfm-model' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('explicit OpenAI advisor pilot', () => {
  it('preserves private behavior with just a vendor key and for users outside the pilot', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'legacy-key');
    expect(usesOpenAiAdvisor(input.userId)).toBe(false);
    expect((await generateAdvisorReply(input))?.provider).toBe('sfm-private-primary');
    enablePilot();
    expect(usesOpenAiAdvisor('other-user')).toBe(false);
    await generateAdvisorReply({ ...input, userId: 'other-user' });
    expect(mocks.privateReply).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
    vi.stubEnv('SFM_OPENAI_PILOT_USER_IDS', '');
    expect(usesOpenAiAdvisor(input.userId)).toBe(false);
  });

  it('routes only opted-in authenticated owners to the intended project with bounded output', async () => {
    enablePilot();
    vi.stubEnv('OPENAI_API_KEY', 'generic-key-must-not-win');
    expect(advisorProviderConfigured(input.userId)).toBe(true);
    const result = await generateAdvisorReply({ ...input, maxTokens: 99_999 });
    expect(result).toEqual({ text: 'private answer', provider: 'openai', model: 'gpt-6.1-sol-snapshot' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init).toMatchObject({ redirect: 'error', cache: 'no-store', headers: {
      authorization: 'Bearer sfm-project-secret', 'OpenAI-Organization': 'org_selected', 'OpenAI-Project': 'proj_sfm',
    } });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'gpt-6.1-sol', store: false, stream: false, max_output_tokens: 2_000, reasoning: { effort: 'low' } });
    expect(mocks.update.mock.calls[0][0].metadata.openaiUsage).toMatchObject({ outcome: 'pending', usage: null, requestedModel: 'gpt-6.1-sol', model: null });
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ outcome: 'success', model: 'gpt-6.1-sol-snapshot', requestId: 'req_observed', responseId: 'resp_observed', usage: {
      inputTokens: 100, outputTokens: 40, totalTokens: 140, cachedInputTokens: 20, cacheWriteTokens: 0, reasoningTokens: 10, complete: true,
    } });
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.fetch.mock.invocationCallOrder[0]);
    expect(mocks.eq).toHaveBeenCalledWith('id', tracking.eventId);
    expect(mocks.eq).toHaveBeenCalledWith('user_id', input.userId);
    const serialized = JSON.stringify(mocks.update.mock.calls);
    for (const privateValue of ['private financial facts', 'private question', 'private answer', 'sfm-project-secret', 'generic-key-must-not-win']) expect(serialized).not.toContain(privateValue);
  });

  it('uses the existing server key only after opt-in and refuses malformed dedicated configuration', async () => {
    enablePilot();
    vi.stubEnv('SFM_OPENAI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', 'existing-server-key');
    await generateAdvisorReply(input);
    expect(mocks.fetch.mock.calls[0][1].headers.authorization).toBe('Bearer existing-server-key');
    vi.stubEnv('SFM_OPENAI_API_KEY', 'invalid\nkey');
    expect(advisorProviderConfigured(input.userId)).toBe(false);
    expect(await generateAdvisorReply(input)).toBeNull();
    vi.stubEnv('SFM_OPENAI_API_KEY', 'dedicated');
    vi.stubEnv('SFM_OPENAI_PROJECT', 'invalid\nproject');
    expect(advisorProviderConfigured(input.userId)).toBe(false);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('requires owner-bound durable quota evidence and rejects oversized input before paid requests', async () => {
    enablePilot();
    expect(await generateAdvisorReply({ ...input, tracking: undefined })).toBeNull();
    expect(await generateAdvisorReply({ ...input, tracking: { ...tracking, userId: 'other-user' } })).toBeNull();
    expect(await generateAdvisorReply({ ...input, system: 'x'.repeat(48_001) })).toBeNull();
    mocks.finish.mockResolvedValueOnce({ data: null, error: { code: 'unavailable' } });
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('keeps missing usage unknown even on a successful response', async () => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response(payload({ usage: undefined, model: undefined })));
    expect((await generateAdvisorReply(input))?.text).toBe('private answer');
    const entry = mocks.update.mock.calls[1][0].metadata.openaiUsage;
    expect(entry).toMatchObject({ outcome: 'success', usage: null, model: null, requestedModel: 'gpt-6.1-sol' });
    expect(summarizeOpenAiAdvisorUsage([{ metadata: { openaiUsage: entry } }])).toMatchObject({ measuredRequests: 0, unmeasuredRequests: 1, complete: false, totalTokens: { observed: null } });
  });

  it('retains billable token evidence for incomplete output without returning it as success', async () => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response(payload({ status: 'incomplete' })));
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ outcome: 'incomplete', reasonCode: 'RESPONSE_INCOMPLETE', usage: { totalTokens: 140 } });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.privateReply).not.toHaveBeenCalled();
  });

  it('sanitizes an unclassified HTTP throttle without retrying or switching providers', async () => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response({ error: { message: 'private upstream details' } }, 429));
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ outcome: 'failure', httpStatus: 429, reasonCode: 'HTTP_429', model: null, usage: null });
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain('private upstream details');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.privateReply).not.toHaveBeenCalled();
  });

  it.each([
    ['credit_balance_exhausted', 'CREDIT_BALANCE_EXHAUSTED'],
    ['insufficient_quota', 'USAGE_LIMIT_REACHED'],
    ['project_spend_limit_exceeded', 'USAGE_LIMIT_REACHED'],
    ['organization_spend_limit_exceeded', 'USAGE_LIMIT_REACHED'],
    ['organization_usage_limit_exceeded', 'USAGE_LIMIT_REACHED'],
  ])('records %s before falling back once to the old provider', async (code, reasonCode) => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response({ error: { code, message: 'private upstream details' }, usage: tokenUsage }, 429));
    expect(await generateAdvisorReply({ ...input, maxTokens: 99_999 })).toEqual({ text: 'private reply', provider: 'sfm-private-primary', model: 'sfm-model' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.privateReply).toHaveBeenCalledExactlyOnceWith({
      system: input.system, messages: input.messages, correlationId: input.correlationId,
      maxTokens: 2_000, attemptTimeoutMs: 7_000,
    });
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ outcome: 'failure', httpStatus: 429, reasonCode, usage: { totalTokens: 140 } });
    expect(mocks.update.mock.invocationCallOrder[1]).toBeLessThan(mocks.privateReply.mock.invocationCallOrder[0]);
    expect(JSON.stringify(mocks.update.mock.calls)).not.toMatch(/private upstream details|private financial facts|private question|sfm-project-secret/);
  });

  it('uses durable credit evidence on later requests without another OpenAI attempt or fabricated usage', async () => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response({ error: { code: 'credit_balance_exhausted' } }, 429));
    await generateAdvisorReply(input);
    const persistedFailure = mocks.update.mock.calls[1][0].metadata.openaiUsage;
    mocks.read.mockResolvedValue({ data: { metadata: { openaiUsage: persistedFailure } }, error: null });
    expect((await generateAdvisorReply({ ...input, tracking: { ...tracking, eventId: 'next-reserved-event' } }))?.provider).toBe('sfm-private-primary');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.privateReply).toHaveBeenCalledTimes(2);
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.readEq).toHaveBeenCalledWith('user_id', input.userId);
    expect(mocks.readScope).toHaveBeenCalledWith('metadata', { openaiUsage: {
      version: 1, application: 'sfm', provider: 'openai', requestedModel: 'gpt-6.1-sol', organizationId: 'org_selected', projectId: 'proj_sfm',
    } });
  });

  it('does not call either provider when the durable pause check is unavailable', async () => {
    enablePilot();
    mocks.read.mockResolvedValue({ data: null, error: { code: 'ledger-unavailable' } });
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.privateReply).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not hide failed final accounting by continuing to the old provider', async () => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response({ error: { code: 'insufficient_quota' } }, 429));
    mocks.finish.mockResolvedValueOnce({ data: { id: tracking.eventId }, error: null }).mockResolvedValueOnce({ data: null, error: {} });
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.privateReply).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.after).toHaveLength(1);
    await mocks.after[0]();
    expect(mocks.privateReply).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([null, 'throw'])('returns unavailable if the private fallback fails (%s), without another paid attempt', async failure => {
    enablePilot();
    mocks.fetch.mockResolvedValue(response({ error: { code: 'credit_balance_exhausted' } }, 429));
    if (failure === 'throw') mocks.privateReply.mockRejectedValue(new Error('private details'));
    else mocks.privateReply.mockResolvedValue(null);
    expect(await generateAdvisorReply(input)).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.privateReply).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ outcome: 'failure', reasonCode: 'CREDIT_BALANCE_EXHAUSTED' });
  });

  it('times out stalled response bodies and preserves an unknown usage outcome', async () => {
    vi.useFakeTimers(); enablePilot();
    mocks.fetch.mockResolvedValue({ status: 200, headers: new Headers({ 'x-request-id': 'req_stalled' }), json: () => new Promise(() => undefined) });
    const request = generateAdvisorReply(input);
    await vi.advanceTimersByTimeAsync(22_000);
    expect(await request).toBeNull();
    expect(mocks.update.mock.calls[1][0].metadata.openaiUsage).toMatchObject({ reasonCode: 'PROVIDER_TIMEOUT', usage: null, httpStatus: 200, requestId: 'req_stalled', clientRequestId: input.correlationId });
    expect((mocks.fetch.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('retries only final measurement persistence without repeating the paid request', async () => {
    enablePilot();
    mocks.finish.mockResolvedValueOnce({ data: { id: tracking.eventId }, error: null }).mockResolvedValueOnce({ data: null, error: {} });
    expect((await generateAdvisorReply(input))?.provider).toBe('openai');
    expect(mocks.after).toHaveLength(1);
    await mocks.after[0]();
    expect(mocks.update).toHaveBeenCalledTimes(3);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('usage integrity', () => {
  it('distinguishes observed zero from absent, invalid or inconsistent counters', () => {
    expect(parseOpenAiTokenUsage(undefined)).toBeNull();
    expect(parseOpenAiTokenUsage({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })).toMatchObject({ inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: null, complete: true });
    expect(parseOpenAiTokenUsage({ input_tokens: '100', output_tokens: -1, total_tokens: null })).toMatchObject({ inputTokens: null, outputTokens: null, totalTokens: null, complete: false });
    expect(parseOpenAiTokenUsage({ ...tokenUsage, total_tokens: 999, input_tokens_details: { cached_tokens: 101 }, output_tokens_details: { reasoning_tokens: 41 } })).toMatchObject({ cachedInputTokens: null, reasoningTokens: null, complete: false });
  });

  it('does not double-count reasoning/cache tokens or claim a billed dollar balance', () => {
    const events = [
      { metadata: { openaiUsage: { version: 1, application: 'sfm', provider: 'openai', outcome: 'success', usage: parseOpenAiTokenUsage(tokenUsage) } } },
      { metadata: { openaiUsage: { version: 1, application: 'sfm', provider: 'openai', outcome: 'pending', usage: null } } },
      { metadata: { legacyProvider: 'private' } },
    ];
    expect(summarizeOpenAiAdvisorUsage(events)).toMatchObject({ requests: 2, measuredRequests: 1, unmeasuredRequests: 1, complete: false,
      inputTokens: { observed: 100, measuredRequests: 1 }, outputTokens: { observed: 40 }, totalTokens: { observed: 140 }, cachedInputTokens: { observed: 20 }, reasoningTokens: { observed: 10 }, billedUsd: null, remainingCreditUsd: null,
    });
    expect(summarizeOpenAiAdvisorUsage([])).toMatchObject({ requests: 0, complete: false, totalTokens: { observed: null } });
  });

  it('treats a zero-row metadata update as a failed reservation', async () => {
    mocks.finish.mockResolvedValue({ data: null, error: null });
    expect(await writeOpenAiAdvisorUsage(tracking, {} as OpenAiAdvisorUsage)).toBe(false);
  });
});
