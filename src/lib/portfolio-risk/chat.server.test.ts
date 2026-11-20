import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./service.server', () => ({ loadCurrentRiskForRequest: mocks.load }));
import { portfolioRiskChatResponse } from './chat.server';
import { buildCurrentRisk, type RiskPosition } from './current';

beforeEach(() => vi.resetAllMocks());
describe('portfolio risk chat response', () => {
  it('explains the same authenticated snapshot used by the dashboard', async () => {
    const position: RiskPosition = {
      id: 'test', asset: { type: 'STOCK', identifier: 'test', symbol: 'TEST', exchangeCode: 'TEST' },
      valuation: { valueInBaseCurrency: 100, totalValue: 100, currency: 'KWD', baseCurrency: 'KWD', valuedAt: '2026-11-11T10:00:00Z', source: 'fixture', sourceQuality: 'verified' },
      fx: { rateToBaseCurrency: null, source: null, valuedAt: null }, dataStatus: { migrationState: 'VERIFIED' },
    };
    mocks.load.mockResolvedValue(buildCurrentRisk([position], Date.parse('2026-11-12T10:00:00Z')));
    const request = new Request('https://app.example/api/intelligence/chat');
    const response = await portfolioRiskChatResponse(request, 'ar', 'test');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.load).toHaveBeenCalledExactlyOnceWith(request);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, source: 'portfolio-risk', provider: 'deterministic', model: null, portfolioRisk: { riskScore: null, historicalMetrics: null } });
    expect(body.text).toContain('100%');
    expect(body.text).toContain('ليس تقييماً كاملاً');
  });
  it('preserves MFA denial without returning financial data', async () => {
    mocks.load.mockResolvedValue({ ok: false, code: 'MFA_REQUIRED', status: 403 });
    const response = await portfolioRiskChatResponse(new Request('https://app.example'), 'ar', 'test');
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, portfolioRisk: null, error: { code: 'MFA_REQUIRED' } });
  });
  it('returns a disabled answer instead of inventing a model-generated assessment', async () => {
    mocks.load.mockResolvedValue({ ok: false, code: 'RISK_FEATURE_DISABLED', status: 404 });
    const response = await portfolioRiskChatResponse(new Request('https://app.example'), 'en', 'test');
    expect(response.status).toBe(404);
    expect((await response.json()).text).toContain('not enabled');
  });
});
