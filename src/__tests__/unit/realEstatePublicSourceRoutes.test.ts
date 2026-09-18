import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user: vi.fn(), rate: vi.fn(), locations: vi.fn(), analyze: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ getUserFromBearerToken: mocks.user }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/investments/intelligence/adapters/qatar-open-data', () => ({ getQatarPropertyLocations: mocks.locations }));
vi.mock('@/lib/investments/intelligence/analyst', () => ({ analyzeRealEstateAsset: mocks.analyze }));
import { GET } from '@/app/api/investments/real-estate/locations/route';
import { POST } from '@/app/api/investments/real-estate/analyze/route';
const asset = { countryCode: 'QA', city: 'Test', district: 'Test District', propertyType: 'LAND', landArea: 100, landAreaUnit: 'M2' };
const locationRequest = (country = 'QA', authenticated = true) => new NextRequest(`https://example.invalid/api/investments/real-estate/locations?countryCode=${country}`, { headers: authenticated ? { Authorization: 'Bearer synthetic-token' } : {} });
const analysisRequest = (payload: unknown) => new NextRequest('https://example.invalid/api/investments/real-estate/analyze', { method: 'POST', headers: { Authorization: 'Bearer synthetic-token' }, body: JSON.stringify(payload) });
const privateResponse = (response: Response) => {
  expect(response.headers.get('cache-control')).toContain('private, no-store');
  expect(response.headers.get('vary')).toBe('Authorization');
};
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 'synthetic-user' });
  mocks.rate.mockReturnValue({ allowed: true, retryAfterSeconds: 60 });
  mocks.locations.mockResolvedValue([]); mocks.analyze.mockResolvedValue({ status: 'SOURCE_DATA_REVIEW_REQUIRED', valuation: null, evidence: [] });
});
describe('authenticated official source routes', () => {
  it('allows area-free market research without weakening valuation preflight', async () => {
    const researchAsset = { countryCode: 'GB', city: 'London', propertyType: 'HOUSE' };
    const valuation = await POST(analysisRequest({ asset: researchAsset }));
    expect(valuation.status).toBe(422);
    expect(mocks.analyze).not.toHaveBeenCalled();
    const response = await POST(analysisRequest({ asset: researchAsset, purpose: 'market_context' }));
    expect(response.status).toBe(200); privateResponse(response);
    expect(mocks.analyze).toHaveBeenCalledWith(researchAsset, 'USD', [], 'market_context');
    const invalid = await POST(analysisRequest({ asset, purpose: 'unknown' }));
    expect(invalid.status).toBe(400);
  });
  it('does not call the public provider before authentication', async () => {
    const response = await GET(locationRequest('QA', false));
    expect(response.status).toBe(401); privateResponse(response); expect(mocks.locations).not.toHaveBeenCalled();
  });
  it('returns exact directory data with a non-valuation flag', async () => {
    const response = await GET(locationRequest());
    expect(response.status).toBe(200); privateResponse(response);
    expect(await response.json()).toEqual({ ok: true, countryCode: 'QA', locations: [], valuationEligible: false });
  });
  it('does not silently substitute Qatar for unsupported countries', async () => {
    const response = await GET(locationRequest('KW'));
    expect(response.status).toBe(422); expect(mocks.locations).not.toHaveBeenCalled(); privateResponse(response);
  });
  it('bounds directory and analysis calls per authenticated user', async () => {
    mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 35 });
    for (const response of [await GET(locationRequest()), await POST(analysisRequest({ asset }))]) {
      expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('35'); privateResponse(response);
    }
    expect(mocks.locations).not.toHaveBeenCalled(); expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it('sanitizes provider and authentication exceptions', async () => {
    mocks.locations.mockRejectedValue(new Error('secret upstream detail'));
    const response = await GET(locationRequest());
    expect(response.status).toBe(503); privateResponse(response); expect(await response.text()).not.toContain('secret');
    mocks.user.mockRejectedValue(new Error('secret auth detail'));
    const failure = await POST(analysisRequest({ asset }));
    expect(failure.status).toBe(503); privateResponse(failure); expect(await failure.text()).not.toContain('secret');
  });
  it('rejects invalid primitives and never forwards arbitrary body fields', async () => {
    for (const payload of [null, [], { asset: { ...asset, city: [] } }, { asset, outputCurrency: 'invalid' }]) {
      const response = await POST(analysisRequest(payload)); expect(response.status).toBe(400); privateResponse(response);
    }
    expect(mocks.analyze).not.toHaveBeenCalled();
    const response = await POST(analysisRequest({ asset: { ...asset, upstreamUrl: 'https://attacker.invalid' }, outputCurrency: 'USD' }));
    expect(response.status).toBe(200); privateResponse(response);
    expect(mocks.analyze).toHaveBeenCalledWith(asset, 'USD', []);
  });
});
