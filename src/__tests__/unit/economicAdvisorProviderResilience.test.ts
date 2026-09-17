import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), rate: vi.fn(), usage: vi.fn(), grounding: vi.fn(), configured: vi.fn(), reply: vi.fn(),
}));

vi.mock('@/lib/server/aiProvider', () => ({ aiProviderConfigured: mocks.configured, generateAssistantReply: mocks.reply }));
vi.mock('@/lib/server/adminAccess', () => ({ getCurrentUserFromRequest: mocks.user }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/server/aiUsage', () => ({ consumeAiUsage: mocks.usage, aiUsageLimitResponse: () => Response.json({ ok: false }, { status: 429 }) }));
vi.mock('@/domain/economic-intelligence/advisors.server', () => ({ loadAdvisorGrounding: mocks.grounding }));
vi.mock('@/lib/ai-analyst/economicAdvisorPrompt', () => ({ buildEconomicAdvisorPrompt: () => 'Owner-scoped verified financial facts only' }));

import { POST } from '@/app/api/economic-intelligence/advisor-chat/route';

const req = () => new NextRequest('https://example.test/api/economic-intelligence/advisor-chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ advisor: 'finance', currency: 'KWD', locale: 'ar', messages: [{ role: 'user', content: 'اشرح التنويع' }] }),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'owner' });
  mocks.rate.mockReturnValue({ allowed: true });
  mocks.usage.mockResolvedValue({ allowed: true });
  mocks.grounding.mockResolvedValue({ confidence: 0.5, missing: ['income'], warnings: [] });
  mocks.configured.mockReturnValue(true);
  mocks.reply.mockResolvedValue({ text: 'اختبار من SFM Private AI', provider: 'sfm-private-primary', model: 'sfm-primary' });
});

describe('economic advisor shared SFM private transport', () => {
  it('returns a private-model reply while preserving owner-scoped grounding', async () => {
    const response = await POST(req());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, source: 'ai', provider: 'sfm-private-primary', missing: ['income'] });
    expect(mocks.grounding).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner' }));
    expect(mocks.reply).toHaveBeenCalledWith(expect.objectContaining({ system: 'Owner-scoped verified financial facts only' }));
    expect(response.headers.get('cache-control')).toContain('private, no-store');
    expect(response.headers.get('x-correlation-id')).toBe(body.correlationId);
  });

  it('returns truthful 503 when private nodes fail rather than successful unavailability', async () => {
    mocks.reply.mockResolvedValue(null);
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'AI_PROVIDER_UNAVAILABLE' } });
  });

  it('does not consume allowance if private provider configuration is missing', async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(req())).status).toBe(503);
    expect(mocks.usage).not.toHaveBeenCalled();
  });

  it('rejects anonymous requests before grounding and generation', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(req())).status).toBe(401);
    expect(mocks.grounding).not.toHaveBeenCalled();
    expect(mocks.reply).not.toHaveBeenCalled();
  });
});
