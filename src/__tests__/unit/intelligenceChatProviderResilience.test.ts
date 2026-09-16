import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  gateway: vi.fn(), openai: vi.fn(), anthropic: vi.fn(), user: vi.fn(), usage: vi.fn(), rate: vi.fn(),
  resolve: vi.fn(), canonical: vi.fn(), grounding: vi.fn(), economicPrompt: vi.fn(),
  clients: [] as Array<Record<string, unknown>>,
}));
vi.mock('openai', () => ({ default: class {
  chat: { completions: { create: typeof mocks.gateway } };
  constructor(options: Record<string, unknown>) {
    mocks.clients.push(options);
    this.chat = { completions: { create: options.baseURL ? mocks.gateway : mocks.openai } };
  }
} }));
vi.mock('ai', () => ({ generateText: mocks.anthropic }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: () => (modelId: string) => ({ modelId }) }));
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

import { POST, maxDuration } from '@/app/api/intelligence/chat/route';

const ENV_KEYS = ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_ASSISTANT_GATEWAY_MODEL', 'AI_ASSISTANT_ANTHROPIC_MODEL', 'AI_ASSISTANT_OPENAI_MODEL'];
const completion = (text: string) => ({ choices: [{ message: { content: text } }] });
function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://example.test/api/intelligence/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: 'finance', locale: 'en', messages: [{ role: 'user', content: 'Explain diversification' }], ...overrides }),
  });
}
function configureAll() {
  vi.stubEnv('AI_GATEWAY_API_KEY', 'test-gateway-key');
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
  vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.clients.length = 0;
  for (const key of ENV_KEYS) vi.stubEnv(key, '');
  mocks.user.mockResolvedValue({ id: 'test-user' });
  mocks.usage.mockResolvedValue({ allowed: true });
  mocks.rate.mockReturnValue({ allowed: true });
  mocks.resolve.mockResolvedValue({ ok: false });
  mocks.grounding.mockResolvedValue({ advisor: 'finance', facts: [] });
  mocks.economicPrompt.mockReturnValue('Owner-scoped grounding fixture.');
  mocks.gateway.mockResolvedValue(completion('Gateway fixture response'));
  mocks.anthropic.mockResolvedValue({ text: 'Anthropic fixture response' });
  mocks.openai.mockResolvedValue(completion('OpenAI fixture response'));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('intelligence chat provider transport and truthful errors', () => {
  it('rejects anonymous requests before quota or provider calls', async () => {
    configureAll();
    mocks.user.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.grounding).not.toHaveBeenCalled();
    expect(mocks.clients).toHaveLength(0);
    expect(mocks.anthropic).not.toHaveBeenCalled();
  });

  it('fails closed on a projects-domain request', async () => {
    configureAll();
    expect((await POST(request({ domain: 'projects' }))).status).toBe(400);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.clients).toHaveLength(0);
  });

  it('keeps the application rate limit and Retry-After header', async () => {
    configureAll();
    mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 17 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('17');
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.clients).toHaveLength(0);
  });

  it('does not charge quota or resolve symbols when no provider is configured', async () => {
    const response = await POST(request({ messages: [{ role: 'user', content: 'NVDA' }] }));
    const payload = await response.json();
    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_NOT_CONFIGURED' } });
    expect(response.headers.get('x-correlation-id')).toBe(payload.correlationId);
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.grounding).not.toHaveBeenCalled();
  });

  it('stops after Gateway succeeds and forwards the cancellation signal', async () => {
    configureAll();
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, source: 'ai', provider: 'vercel-ai-gateway', text: 'Gateway fixture response' });
    expect(mocks.clients[0]).toMatchObject({ baseURL: 'https://ai-gateway.vercel.sh/v1', maxRetries: 0, timeout: 8500 });
    expect(mocks.gateway.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(mocks.gateway.mock.calls[0][0]).not.toHaveProperty('temperature');
    expect(mocks.anthropic).not.toHaveBeenCalled();
    expect(mocks.openai).not.toHaveBeenCalled();
    expect(mocks.usage).toHaveBeenCalledTimes(1);
  });

  it('supports a legacy Gateway token and a server-selected model', async () => {
    vi.stubEnv('AI_GATEWAY_TOKEN', 'test-legacy-token');
    vi.stubEnv('AI_ASSISTANT_GATEWAY_MODEL', 'anthropic/claude-haiku-4.5');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.clients[0].apiKey).toBe('test-legacy-token');
    expect(mocks.gateway.mock.calls[0][0].model).toBe('anthropic/claude-haiku-4.5');
  });

  it('uses independent Anthropic after a Gateway authentication failure', async () => {
    configureAll();
    mocks.gateway.mockRejectedValue(Object.assign(new Error('upstream secret body'), { status: 401 }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'anthropic' });
    expect(mocks.anthropic.mock.calls[0][0]).toMatchObject({ maxRetries: 0, abortSignal: expect.any(AbortSignal) });
    expect(mocks.openai).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('upstream secret body');
  });

  it('uses OpenAI if both earlier providers fail, consuming quota once', async () => {
    configureAll();
    mocks.gateway.mockRejectedValue(new Error('gateway unavailable'));
    mocks.anthropic.mockRejectedValue(new Error('anthropic unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: 'openai', text: 'OpenAI fixture response' });
    expect(mocks.usage).toHaveBeenCalledTimes(1);
    expect(mocks.clients.at(-1)).toMatchObject({ maxRetries: 0, timeout: 8500 });
    expect(mocks.openai.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it.each(['ar', 'en', 'fr'])('returns a real localized 503, not a fake successful reply, for %s', async locale => {
    configureAll();
    mocks.gateway.mockRejectedValue(new Error('private upstream response'));
    mocks.anthropic.mockRejectedValue(new Error('private upstream response'));
    mocks.openai.mockRejectedValue(new Error('private upstream response'));
    const response = await POST(request({ locale }));
    const payload = await response.json();
    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_UNAVAILABLE' }, text: expect.any(String) });
    expect(response.headers.get('x-correlation-id')).toBe(payload.correlationId);
    expect(payload.text).not.toContain('private upstream response');
  });

  it('treats an empty provider response as failure, not successful AI content', async () => {
    configureAll();
    mocks.gateway.mockResolvedValue(completion('   '));
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ provider: 'anthropic' });
  });

  it('enforces the daily quota before making a provider request', async () => {
    configureAll();
    mocks.usage.mockResolvedValue({ allowed: false });
    expect((await POST(request())).status).toBe(429);
    expect(mocks.clients).toHaveLength(0);
    expect(mocks.anthropic).not.toHaveBeenCalled();
  });

  it('aborts the timed-out transport before falling back and clears timers', async () => {
    configureAll();
    vi.useFakeTimers();
    let providerSignal: AbortSignal | undefined;
    mocks.gateway.mockImplementation((_body: unknown, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      providerSignal = options.signal;
      options.signal.addEventListener('abort', () => reject(new Error('transport aborted')), { once: true });
    }));
    const pending = POST(request());
    await vi.waitFor(() => expect(mocks.gateway).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(8501);
    const response = await pending;
    expect(providerSignal?.aborted).toBe(true);
    expect(await response.json()).toMatchObject({ provider: 'anthropic' });
    expect(vi.getTimerCount()).toBe(0);
    expect(maxDuration * 1000).toBeGreaterThan(3 * 8500);
  });

  it('keeps unresolved selected assets unverified instead of inventing identity', async () => {
    configureAll();
    mocks.canonical.mockRejectedValue(new Error('not verified'));
    const response = await POST(request({ asset: { symbol: 'UNKNOWN', assetType: 'STOCK' } }));
    expect(await response.json()).toMatchObject({ asset: null, assetResolvedFromMessage: false });
    expect(mocks.gateway.mock.calls[0][0].messages[0].content).toContain('ask the user to confirm');
  });

  it('preserves owner-scoped finance grounding through provider fallback', async () => {
    configureAll();
    mocks.gateway.mockRejectedValue(new Error('gateway unavailable'));
    const response = await POST(request());
    expect(mocks.grounding).toHaveBeenCalledWith({ userId: 'test-user', advisor: 'finance' });
    expect(mocks.economicPrompt).toHaveBeenCalledWith({ advisor: 'finance', facts: [] }, 'en');
    expect(mocks.anthropic.mock.calls[0][0].system).toContain('Owner-scoped grounding fixture.');
    expect(await response.json()).toMatchObject({ advisorGrounded: true, domain: 'finance', provider: 'anthropic' });
    expect(mocks.usage.mock.calls[0][0].metadata.economicIntelligenceGrounded).toBe(true);
  });

  it('continues with honest ungrounded finance guardrails if the evidence loader fails', async () => {
    configureAll();
    mocks.grounding.mockRejectedValue(new Error('private database failure'));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ advisorGrounded: false });
    expect(mocks.economicPrompt).not.toHaveBeenCalled();
    expect(mocks.gateway.mock.calls[0][0].messages[0].content).not.toContain('Owner-scoped grounding fixture.');
    expect(mocks.usage.mock.calls[0][0].metadata.economicIntelligenceGrounded).toBe(false);
  });

  it('does not fetch personal finance context for the market domain', async () => {
    configureAll();
    const response = await POST(request({ domain: 'market' }));
    expect(await response.json()).toMatchObject({ domain: 'market', advisorGrounded: false });
    expect(mocks.grounding).not.toHaveBeenCalled();
  });

  it('does not attach private finance context to an inferred verified ticker question', async () => {
    configureAll();
    mocks.resolve.mockResolvedValue({ ok: true, asset: { symbol: 'NVDA', assetType: 'stock' } });
    mocks.canonical.mockResolvedValue({ symbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA', assetType: 'STOCK', quoteCurrency: 'USD', exchange: 'NASDAQ', market: 'US' });
    const response = await POST(request({ messages: [{ role: 'user', content: 'NVDA' }] }));
    expect(await response.json()).toMatchObject({ domain: 'market', assetResolvedFromMessage: true, advisorGrounded: false });
    expect(mocks.grounding).not.toHaveBeenCalled();
    expect(mocks.economicPrompt).not.toHaveBeenCalled();
  });
});
