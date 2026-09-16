import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  gateway: vi.fn(), openai: vi.fn(), user: vi.fn(), usage: vi.fn(), rate: vi.fn(),
  resolve: vi.fn(), canonical: vi.fn(), grounding: vi.fn(), economicPrompt: vi.fn(),
  clients: [] as Array<Record<string, unknown>>,
}));
vi.mock('openai', () => ({ default: class {
  chat: { completions: { create: typeof mocks.gateway } };
  constructor(options: Record<string, unknown>) {
    mocks.clients.push(options);
    this.chat = { completions: { create: String(options.baseURL).includes('ai-gateway') ? mocks.gateway : mocks.openai } };
  }
} }));
vi.mock('@/domain/economic-intelligence/advisors.server', () => ({ loadAdvisorGrounding: mocks.grounding }));
vi.mock('@/lib/ai-analyst/economicAdvisorPrompt', () => ({ buildEconomicAdvisorPrompt: mocks.economicPrompt }));
vi.mock('@/lib/server/adminAccess', () => ({ getCurrentUserFromRequest: mocks.user }));
vi.mock('@/lib/server/aiUsage', () => ({ consumeAiUsage: mocks.usage, aiUsageLimitResponse: () => Response.json({ ok: false, error: { code: 'AI_DAILY_LIMIT_REACHED' } }, { status: 429 }) }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/market/symbolResolver', () => ({ resolveMarketSymbol: mocks.resolve }));
vi.mock('@/services/intelligence/assetResolver', () => ({ resolveCanonicalIntelligenceAsset: mocks.canonical }));
import { POST, maxDuration } from '@/app/api/intelligence/chat/route';

const ENV_KEYS = ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_ASSISTANT_GATEWAY_MODEL', 'AI_ASSISTANT_OPENAI_MODEL'];
const completion = (text: string) => ({ choices: [{ message: { content: text } }] });
function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://example.test/api/intelligence/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: 'finance', locale: 'en', messages: [{ role: 'user', content: 'Explain diversification' }], ...overrides }),
  });
}
function configureBoth() { vi.stubEnv('AI_GATEWAY_API_KEY', 'test-gateway-key'); vi.stubEnv('OPENAI_API_KEY', 'test-openai-key'); }
beforeEach(() => {
  vi.resetAllMocks(); mocks.clients.length = 0;
  for (const key of ENV_KEYS) vi.stubEnv(key, '');
  mocks.user.mockResolvedValue({ id: 'test-user' }); mocks.usage.mockResolvedValue({ allowed: true });
  mocks.rate.mockReturnValue({ allowed: true }); mocks.resolve.mockResolvedValue({ ok: false });
  mocks.grounding.mockResolvedValue({ advisor: 'finance', facts: [] });
  mocks.economicPrompt.mockReturnValue('Owner-scoped grounding fixture.');
  mocks.gateway.mockResolvedValue(completion('Gateway fixture response'));
  mocks.openai.mockResolvedValue(completion('OpenAI fixture response'));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('intelligence chat without an Anthropic credential', () => {
  it('rejects anonymous requests before private context, quota or provider calls', async () => {
    configureBoth(); mocks.user.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.usage).not.toHaveBeenCalled(); expect(mocks.grounding).not.toHaveBeenCalled(); expect(mocks.clients).toHaveLength(0);
  });
  it('fails closed for projects conversations', async () => {
    configureBoth(); expect((await POST(request({ domain: 'projects' }))).status).toBe(400);
    expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.clients).toHaveLength(0);
  });
  it('preserves rate limits and retry metadata', async () => {
    configureBoth(); mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 17 });
    const response = await POST(request()); expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('17');
    expect(mocks.usage).not.toHaveBeenCalled(); expect(mocks.clients).toHaveLength(0);
  });
  it('does not treat an obsolete Anthropic key as working configuration or charge quota', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'unused-legacy-key');
    const response = await POST(request({ messages: [{ role: 'user', content: 'NVDA' }] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_NOT_CONFIGURED' } });
    expect(mocks.usage).not.toHaveBeenCalled(); expect(mocks.resolve).not.toHaveBeenCalled(); expect(mocks.grounding).not.toHaveBeenCalled();
  });
  it('works with only the existing OpenAI key', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    expect(await (await POST(request())).json()).toMatchObject({ ok: true, provider: 'openai', source: 'ai', text: 'OpenAI fixture response' });
    expect(mocks.clients[0]).toMatchObject({ baseURL: 'https://api.openai.com/v1', maxRetries: 0, timeout: 8500 });
    expect(mocks.gateway).not.toHaveBeenCalled(); expect(mocks.usage).toHaveBeenCalledTimes(1);
  });
  it('uses OpenAI first even when the rejected legacy Gateway model remains configured', async () => {
    configureBoth(); vi.stubEnv('AI_ASSISTANT_GATEWAY_MODEL', 'anthropic/claude-opus-5');
    const response = await POST(request()); expect(response.status).toBe(200);
    expect(mocks.gateway).not.toHaveBeenCalled();
    expect(mocks.openai.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(mocks.openai.mock.calls[0][0]).toMatchObject({ model: 'gpt-4o-mini', max_completion_tokens: 1200 });
    expect(mocks.openai.mock.calls[0][0]).not.toHaveProperty('temperature');
  });
  it('uses Gateway after OpenAI fails and migrates the legacy Anthropic model safely', async () => {
    configureBoth(); vi.stubEnv('AI_ASSISTANT_GATEWAY_MODEL', 'anthropic/claude-opus-5');
    mocks.openai.mockRejectedValue(Object.assign(new Error('upstream private body'), { status: 401 }));
    expect(await (await POST(request())).json()).toMatchObject({ provider: 'vercel-ai-gateway', model: 'openai/gpt-4o-mini' });
    expect(mocks.gateway).toHaveBeenCalledTimes(1); expect(mocks.usage).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('upstream private body');
  });
  it('accepts a legacy Gateway token and copied env outer quotes without changing the secret', async () => {
    vi.stubEnv('AI_GATEWAY_TOKEN', '  "test-legacy-token"  ');
    expect((await POST(request())).status).toBe(200);
    expect(mocks.clients[0].apiKey).toBe('test-legacy-token');
    expect(mocks.gateway.mock.calls[0][0].model).toBe('openai/gpt-4o-mini');
  });
  it('supports a server-selected non-Anthropic Gateway model', async () => {
    vi.stubEnv('AI_GATEWAY_API_KEY', 'test-key'); vi.stubEnv('AI_ASSISTANT_GATEWAY_MODEL', 'openai/gpt-4o');
    expect((await POST(request())).status).toBe(200); expect(mocks.gateway.mock.calls[0][0].model).toBe('openai/gpt-4o');
  });
  it.each(['ar', 'en', 'fr'])('returns an honest localized 503 for %s when both paths fail', async locale => {
    configureBoth(); mocks.openai.mockRejectedValue(new Error('private upstream body')); mocks.gateway.mockRejectedValue(new Error('private upstream body'));
    const response = await POST(request({ locale })); const body = await response.json();
    expect(response.status).toBe(503); expect(body).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_UNAVAILABLE' }, text: expect.any(String) });
    expect(response.headers.get('x-correlation-id')).toBe(body.correlationId);
    expect(body.text).not.toContain('private upstream body'); expect(mocks.usage).toHaveBeenCalledTimes(1);
  });
  it('does not retry a rejected Gateway credential', async () => {
    vi.stubEnv('AI_GATEWAY_API_KEY', 'test-key'); mocks.gateway.mockRejectedValue(Object.assign(new Error('invalid'), { status: 401 }));
    expect((await POST(request())).status).toBe(503); expect(mocks.gateway).toHaveBeenCalledTimes(1);
  });
  it('treats empty text as a provider failure', async () => {
    configureBoth(); mocks.openai.mockResolvedValue(completion('   '));
    expect(await (await POST(request())).json()).toMatchObject({ provider: 'vercel-ai-gateway' });
  });
  it('enforces quota before either external call', async () => {
    configureBoth(); mocks.usage.mockResolvedValue({ allowed: false });
    expect((await POST(request())).status).toBe(429); expect(mocks.clients).toHaveLength(0);
  });
  it('aborts the real timed-out transport before fallback and clears timers', async () => {
    configureBoth(); vi.useFakeTimers(); let providerSignal: AbortSignal | undefined;
    mocks.openai.mockImplementation((_body: unknown, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      providerSignal = options.signal;
      options.signal.addEventListener('abort', () => reject(new Error('transport aborted')), { once: true });
    }));
    const pending = POST(request()); await vi.waitFor(() => expect(mocks.openai).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(8501);
    expect(await (await pending).json()).toMatchObject({ provider: 'vercel-ai-gateway' });
    expect(providerSignal?.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0); expect(maxDuration * 1000).toBeGreaterThan(2 * 8500);
  });
  it('keeps unverified selected assets unresolved', async () => {
    configureBoth(); mocks.canonical.mockRejectedValue(new Error('unknown'));
    expect(await (await POST(request({ asset: { symbol: 'UNKNOWN', assetType: 'STOCK' } }))).json()).toMatchObject({ asset: null, assetResolvedFromMessage: false });
    expect(mocks.openai.mock.calls[0][0].messages[0].content).toContain('ask the user to confirm');
  });
  it('preserves owner-scoped grounding across fallback', async () => {
    configureBoth(); mocks.openai.mockRejectedValue(new Error('unavailable'));
    expect(await (await POST(request())).json()).toMatchObject({ domain: 'finance', advisorGrounded: true, provider: 'vercel-ai-gateway' });
    expect(mocks.grounding).toHaveBeenCalledWith({ userId: 'test-user', advisor: 'finance' });
    expect(mocks.gateway.mock.calls[0][0].messages[0].content).toContain('Owner-scoped grounding fixture.');
  });
  it('keeps honest finance guardrails when private grounding fails', async () => {
    configureBoth(); mocks.grounding.mockRejectedValue(new Error('private database failure'));
    expect(await (await POST(request())).json()).toMatchObject({ advisorGrounded: false });
    expect(mocks.economicPrompt).not.toHaveBeenCalled();
    expect(mocks.openai.mock.calls[0][0].messages[0].content).not.toContain('Owner-scoped grounding fixture.');
  });
  it('does not load personal finance records for explicit market conversations', async () => {
    configureBoth(); expect(await (await POST(request({ domain: 'market' }))).json()).toMatchObject({ advisorGrounded: false, domain: 'market' });
    expect(mocks.grounding).not.toHaveBeenCalled();
  });
  it('does not attach finance records to a ticker resolved from the message', async () => {
    configureBoth(); mocks.resolve.mockResolvedValue({ ok: true, asset: { symbol: 'NVDA', assetType: 'stock' } });
    mocks.canonical.mockResolvedValue({ canonicalSymbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA', assetType: 'STOCK', quoteCurrency: 'USD', exchange: 'NASDAQ', market: 'US' });
    expect(await (await POST(request({ messages: [{ role: 'user', content: 'NVDA' }] }))).json()).toMatchObject({ domain: 'market', assetResolvedFromMessage: true, advisorGrounded: false });
    expect(mocks.grounding).not.toHaveBeenCalled();
  });
  it('rejects multi-line credentials before quota consumption', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'bad-key\nsecond-line');
    expect((await POST(request())).status).toBe(503); expect(mocks.clients).toHaveLength(0); expect(mocks.usage).not.toHaveBeenCalled();
  });
});
