import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), usage: vi.fn(), rate: vi.fn(), resolve: vi.fn(), canonical: vi.fn(),
  grounding: vi.fn(), economicPrompt: vi.fn(),
  writeUsage: vi.fn(), creditPaused: vi.fn(),
}));

vi.mock('@/domain/economic-intelligence/advisors.server', () => ({ loadAdvisorGrounding: mocks.grounding }));
vi.mock('@/lib/ai-analyst/economicAdvisorPrompt', () => ({ buildEconomicAdvisorPrompt: mocks.economicPrompt }));
vi.mock('@/lib/server/adminAccess', () => ({ getCurrentUserFromRequest: mocks.user }));
vi.mock('@/lib/server/aiUsage', () => ({
  consumeAiUsage: mocks.usage,
  aiUsageLimitResponse: () => Response.json({ ok: false, error: { code: 'AI_DAILY_LIMIT_REACHED' } }, { status: 429 }),
}));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/market/symbolResolver', () => ({ resolveMarketSymbol: mocks.resolve }));
vi.mock('@/services/intelligence/assetResolver', () => ({ resolveCanonicalIntelligenceAsset: mocks.canonical }));
vi.mock('@/lib/server/openAiAdvisorUsage', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/server/openAiAdvisorUsage')>(),
  writeOpenAiAdvisorUsage: mocks.writeUsage,
}));
vi.mock('@/lib/server/openAiAdvisorCircuit', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/server/openAiAdvisorCircuit')>(),
  openAiAdvisorCreditPaused: mocks.creditPaused,
}));

import { POST, maxDuration } from '@/app/api/intelligence/chat/route';

const ENV_KEYS = [
  'SFM_AI_BASE_URL', 'SFM_AI_MODEL', 'SFM_AI_API_KEY', 'SFM_AI_FALLBACK_BASE_URL',
  'SFM_AI_FALLBACK_MODEL', 'SFM_AI_FALLBACK_API_KEY', 'SFM_AI_TIMEOUT_MS',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN',
  'SFM_ADVISOR_PROVIDER', 'SFM_OPENAI_PILOT_USER_IDS', 'SFM_OPENAI_API_KEY',
  'SFM_OPENAI_MODEL', 'SFM_OPENAI_ORGANIZATION', 'SFM_OPENAI_PROJECT',
];

const fetchMock = vi.fn();
const completion = (text: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
  status,
  headers: { 'content-type': 'application/json' },
});

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://example.test/api/intelligence/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: 'finance', locale: 'en', messages: [{ role: 'user', content: 'Explain diversification' }], ...overrides }),
  });
}

function configurePrimary() {
  vi.stubEnv('SFM_AI_BASE_URL', 'https://primary.sfm.test/v1');
  vi.stubEnv('SFM_AI_MODEL', 'sfm-primary');
  vi.stubEnv('SFM_AI_API_KEY', 'private-primary-key');
}

function configureBoth() {
  configurePrimary();
  vi.stubEnv('SFM_AI_FALLBACK_BASE_URL', 'https://fallback.sfm.test/v1');
  vi.stubEnv('SFM_AI_FALLBACK_MODEL', 'sfm-fallback');
  vi.stubEnv('SFM_AI_FALLBACK_API_KEY', 'private-fallback-key');
}

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ENV_KEYS) vi.stubEnv(key, '');
  vi.stubGlobal('fetch', fetchMock);
  mocks.user.mockResolvedValue({ id: 'test-user' });
  mocks.usage.mockResolvedValue({ allowed: true });
  mocks.writeUsage.mockResolvedValue(true);
  mocks.creditPaused.mockResolvedValue(false);
  mocks.rate.mockReturnValue({ allowed: true });
  mocks.resolve.mockResolvedValue({ ok: false });
  mocks.grounding.mockResolvedValue({ advisor: 'finance', facts: [] });
  mocks.economicPrompt.mockReturnValue('Owner-scoped grounding fixture.');
  fetchMock.mockResolvedValue(completion('SFM private fixture response'));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('intelligence chat preserves SFM Private AI by default', () => {
  it('rejects anonymous requests before private context, quota or provider calls', async () => {
    configureBoth(); mocks.user.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.grounding).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed for projects conversations', async () => {
    configureBoth();
    expect((await POST(request({ domain: 'projects' }))).status).toBe(400);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves rate limits and retry metadata', async () => {
    configureBoth(); mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 17 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('17');
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores OpenAI, Anthropic and Gateway credentials as provider configuration', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'unused-openai-key');
    vi.stubEnv('ANTHROPIC_API_KEY', 'unused-anthropic-key');
    vi.stubEnv('AI_GATEWAY_API_KEY', 'unused-gateway-key');
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_NOT_CONFIGURED' } });
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the user-controlled primary model endpoint', async () => {
    configurePrimary();
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, provider: 'sfm-private-primary', model: 'sfm-primary', source: 'ai' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://primary.sfm.test/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer private-primary-key' });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'sfm-primary', max_tokens: 1200, stream: false });
  });

  it('fails over automatically to a second private node', async () => {
    configureBoth();
    fetchMock.mockResolvedValueOnce(completion('unavailable', 503)).mockResolvedValueOnce(completion('Private fallback response'));
    const body = await (await POST(request())).json();
    expect(body).toMatchObject({ ok: true, provider: 'sfm-private-fallback', model: 'sfm-fallback', text: 'Private fallback response' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://fallback.sfm.test/v1/chat/completions');
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('unavailable');
  });

  it('normalizes copied env quotes without changing the private key', async () => {
    vi.stubEnv('SFM_AI_BASE_URL', '  "https://primary.sfm.test/v1"  ');
    vi.stubEnv('SFM_AI_MODEL', '  "sfm-primary"  ');
    vi.stubEnv('SFM_AI_API_KEY', '  "private-key"  ');
    expect((await POST(request())).status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: 'Bearer private-key' });
  });

  it.each(['ar', 'en', 'fr'])('returns an honest localized 503 for %s when both private nodes fail', async locale => {
    configureBoth();
    fetchMock.mockResolvedValue(completion('private body that must not leak', 503));
    const response = await POST(request({ locale }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_UNAVAILABLE' }, text: expect.any(String) });
    expect(response.headers.get('x-correlation-id')).toBe(body.correlationId);
    expect(body.text).not.toContain('private body that must not leak');
    expect(mocks.usage).toHaveBeenCalledTimes(1);
  });

  it('treats empty text as a provider failure and uses the private fallback', async () => {
    configureBoth();
    fetchMock.mockResolvedValueOnce(completion('   ')).mockResolvedValueOnce(completion('fallback text'));
    expect(await (await POST(request())).json()).toMatchObject({ provider: 'sfm-private-fallback', text: 'fallback text' });
  });

  it('enforces quota before any private inference call', async () => {
    configureBoth(); mocks.usage.mockResolvedValue({ allowed: false });
    expect((await POST(request())).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts the timed-out private request before failover and clears timers', async () => {
    configureBoth();
    vi.useFakeTimers();
    let primarySignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      primarySignal = init.signal as AbortSignal;
      primarySignal.addEventListener('abort', () => reject(new Error('transport aborted')), { once: true });
    })).mockResolvedValueOnce(completion('fallback after timeout'));
    const pending = POST(request());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(22_001);
    expect(await (await pending).json()).toMatchObject({ provider: 'sfm-private-fallback' });
    expect(primarySignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(maxDuration * 1000).toBeGreaterThan(2 * 22_000);
  });

  it('does not consume quota for malformed private provider configuration', async () => {
    vi.stubEnv('SFM_AI_BASE_URL', 'javascript:bad');
    vi.stubEnv('SFM_AI_MODEL', 'sfm-primary');
    expect((await POST(request())).status).toBe(503);
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the default deadline through body consumption and fails over if the body stalls', async () => {
    configureBoth(); vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return { ok: true, json: () => new Promise(() => undefined) };
    }).mockResolvedValueOnce(completion('fallback after stalled body'));
    const pending = POST(request());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(6_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(16_001);
    expect(await (await pending).json()).toMatchObject({ provider: 'sfm-private-fallback', text: 'fallback after stalled body' });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps unverified selected assets unresolved', async () => {
    configurePrimary(); mocks.canonical.mockRejectedValue(new Error('unknown'));
    expect(await (await POST(request({ asset: { symbol: 'UNKNOWN', assetType: 'STOCK' } }))).json()).toMatchObject({ asset: null, assetResolvedFromMessage: false });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).messages[0].content).toContain('ask the user to confirm');
  });

  it('preserves owner-scoped grounding across private-node failover', async () => {
    configureBoth();
    fetchMock.mockResolvedValueOnce(completion('down', 503)).mockResolvedValueOnce(completion('grounded fallback'));
    expect(await (await POST(request())).json()).toMatchObject({ domain: 'finance', advisorGrounded: true, provider: 'sfm-private-fallback' });
    expect(mocks.grounding).toHaveBeenCalledWith({ userId: 'test-user', advisor: 'finance' });
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).messages[0].content).toContain('Owner-scoped grounding fixture.');
  });

  it('keeps honest finance guardrails when private grounding fails', async () => {
    configurePrimary(); mocks.grounding.mockRejectedValue(new Error('private database failure'));
    expect(await (await POST(request())).json()).toMatchObject({ advisorGrounded: false });
    expect(mocks.economicPrompt).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).messages[0].content).not.toContain('Owner-scoped grounding fixture.');
  });

  it('does not load personal finance records for explicit market conversations', async () => {
    configurePrimary();
    expect(await (await POST(request({ domain: 'market' }))).json()).toMatchObject({ advisorGrounded: false, domain: 'market' });
    expect(mocks.grounding).not.toHaveBeenCalled();
  });

  it('does not attach finance records to a ticker resolved from the message', async () => {
    configurePrimary();
    mocks.resolve.mockResolvedValue({ ok: true, asset: { symbol: 'NVDA', assetType: 'stock' } });
    mocks.canonical.mockResolvedValue({ canonicalSymbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA', assetType: 'STOCK', quoteCurrency: 'USD', exchange: 'NASDAQ', market: 'US' });
    expect(await (await POST(request({ messages: [{ role: 'user', content: 'NVDA' }] }))).json()).toMatchObject({ domain: 'market', assetResolvedFromMessage: true, advisorGrounded: false });
    expect(mocks.grounding).not.toHaveBeenCalled();
  });
});

describe('intelligence chat with explicit OpenAI pilot', () => {
  beforeEach(() => {
    vi.stubEnv('SFM_ADVISOR_PROVIDER', 'openai');
    vi.stubEnv('SFM_OPENAI_PILOT_USER_IDS', 'test-user');
    vi.stubEnv('SFM_OPENAI_API_KEY', 'pilot-key');
    vi.stubEnv('SFM_OPENAI_MODEL', 'gpt-6.1-sol');
    mocks.usage.mockResolvedValue({ allowed: true, tracking: { eventId: 'quota-event', userId: 'test-user', metadata: {} } });
    fetchMock.mockResolvedValue(Response.json({
      id: 'resp_test', status: 'completed', model: 'gpt-6.1-sol',
      usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Measured OpenAI reply' }] }],
    }));
  });

  it('preserves authenticated owner grounding and writes the reserved event for a real provider result', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'openai', source: 'ai', advisorGrounded: true, text: 'Measured OpenAI reply' });
    expect(mocks.grounding).toHaveBeenCalledWith({ userId: 'test-user', advisor: 'finance' });
    expect(mocks.usage).toHaveBeenCalledWith(expect.objectContaining({ userId: 'test-user', feature: 'market_ai_insight' }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(JSON.parse(String(init.body)).instructions).toContain('Owner-scoped grounding fixture.');
    expect(mocks.writeUsage).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'quota-event', userId: 'test-user' }), expect.objectContaining({ outcome: 'success', usage: expect.objectContaining({ totalTokens: 30 }) }));
  });

  it('returns the existing private advisor after a settled credit failure with one allowance and the same owner grounding', async () => {
    configurePrimary();
    fetchMock.mockResolvedValueOnce(Response.json({ error: { code: 'credit_balance_exhausted', message: 'private billing detail' } }, { status: 429 }))
      .mockResolvedValueOnce(completion('Grounded private continuation'));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'ai', provider: 'sfm-private-primary', model: 'sfm-primary', advisorGrounded: true, text: 'Grounded private continuation' });
    expect(mocks.usage).toHaveBeenCalledTimes(1);
    expect(mocks.grounding).toHaveBeenCalledWith({ userId: 'test-user', advisor: 'finance' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual(['https://api.openai.com/v1/responses', 'https://primary.sfm.test/v1/chat/completions']);
    const privateBody = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(privateBody.messages[0].content).toContain('Owner-scoped grounding fixture.');
    expect(privateBody.messages.at(-1)).toEqual({ role: 'user', content: 'Explain diversification' });
    expect(mocks.writeUsage).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'quota-event', userId: 'test-user' }), expect.objectContaining({ outcome: 'failure', httpStatus: 429, reasonCode: 'CREDIT_BALANCE_EXHAUSTED', usage: null }));
    expect(mocks.writeUsage.mock.invocationCallOrder[1]).toBeLessThan(fetchMock.mock.invocationCallOrder[1]);
    expect(maxDuration * 1000).toBeGreaterThan(22_000 + 2 * 7_000);
  });

  it('uses the old provider during a durable pause without inventing an OpenAI attempt', async () => {
    configurePrimary(); mocks.creditPaused.mockResolvedValue(true);
    fetchMock.mockResolvedValue(completion('Private during credit pause'));
    expect(await (await POST(request())).json()).toMatchObject({ provider: 'sfm-private-primary', text: 'Private during credit pause' });
    expect(mocks.usage).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://primary.sfm.test/v1/chat/completions');
    expect(mocks.writeUsage).not.toHaveBeenCalled();
  });

  it('does not reinterpret a generic provider throttle as exhausted credit', async () => {
    configurePrimary();
    fetchMock.mockResolvedValue(Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'AI_PROVIDER_UNAVAILABLE' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cannot bypass authentication or the existing allowance even when a paid provider is configured', async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.grounding).not.toHaveBeenCalled();
    expect(mocks.writeUsage).not.toHaveBeenCalled();
    mocks.usage.mockResolvedValueOnce({ allowed: false });
    expect((await POST(request())).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.writeUsage).not.toHaveBeenCalled();
  });
});
