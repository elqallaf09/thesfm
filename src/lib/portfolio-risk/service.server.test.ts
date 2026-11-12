import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), cookie: vi.fn(), inspect: vi.fn(), positions: vi.fn(), rate: vi.fn(), build: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/server/authSession', () => ({ inspectSessionSecurity: mocks.inspect }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/investments/canonicalPositions.server', () => ({
  loadCanonicalInvestmentPositions: mocks.positions,
  InvestmentCanonicalNotReadyError: class extends Error {},
}));
vi.mock('./current', () => ({ buildCurrentRisk: mocks.build }));
import { loadCurrentRiskForRequest } from './service.server';

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SFM_PORTFOLIO_RISK_ENABLED', '1');
  mocks.cookies.mockResolvedValue({ get: mocks.cookie });
  mocks.cookie.mockReturnValue({ value: 'cookie-token' });
  mocks.inspect.mockResolvedValue({ status: 'ok', userId: 'verified-owner', mfaRequirement: 'none' });
  mocks.rate.mockReturnValue({ allowed: true, retryAfterSeconds: 60 });
  mocks.positions.mockResolvedValue({ positions: [] });
  mocks.build.mockReturnValue({ ok: false, code: 'NO_POSITIONS' });
});
afterEach(() => vi.unstubAllEnvs());
const request = (headers?: HeadersInit) => new Request('https://app.example/api/portfolio/risk?userId=someone-else', { headers });

describe('portfolio risk authorization boundary', () => {
  it('does not read auth or financial data while disabled', async () => {
    vi.stubEnv('SFM_PORTFOLIO_RISK_ENABLED', '0');
    expect(await loadCurrentRiskForRequest(request())).toMatchObject({ status: 404 });
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.inspect).not.toHaveBeenCalled(); expect(mocks.positions).not.toHaveBeenCalled();
  });
  it('rejects missing authentication', async () => {
    mocks.cookie.mockReturnValue(undefined);
    expect(await loadCurrentRiskForRequest(request())).toMatchObject({ status: 401 });
    expect(mocks.inspect).not.toHaveBeenCalled(); expect(mocks.positions).not.toHaveBeenCalled();
  });
  it.each(['', 'Basic invalid', 'Bearer', 'Bearer  ', 'Bearer one two', 'Bearer one, Bearer two', 'Bearer token=bad', 'Bearer =', 'Bearer token;extra', 'Bearer\ttoken'])(
    'rejects malformed Authorization %j before cookie/provider access', async authorization => {
      mocks.cookies.mockRejectedValue(new Error('cookie service unavailable'));
      expect(await loadCurrentRiskForRequest(request({ authorization }))).toEqual({ ok: false, code: 'UNAUTHENTICATED', status: 401 });
      expect(mocks.cookies).not.toHaveBeenCalled();
      expect(mocks.inspect).not.toHaveBeenCalled(); expect(mocks.positions).not.toHaveBeenCalled();
    },
  );
  it('does not fall back to a valid cookie when an explicit token is expired', async () => {
    mocks.inspect.mockResolvedValue({ status: 'unauthenticated' });
    expect(await loadCurrentRiskForRequest(request({ authorization: 'Bearer expired' }))).toMatchObject({ status: 401 });
    expect(mocks.inspect).toHaveBeenCalledExactlyOnceWith('expired', 'cookie-token');
    expect(mocks.positions).not.toHaveBeenCalled();
  });
  it.each(['totp', 'email'])('rejects incomplete %s MFA before any portfolio access', async mfaRequirement => {
    mocks.inspect.mockResolvedValue({ status: 'ok', userId: 'verified-owner', mfaRequirement });
    expect(await loadCurrentRiskForRequest(request())).toMatchObject({ code: 'MFA_REQUIRED', status: 403 });
    expect(mocks.positions).not.toHaveBeenCalled();
  });
  it('fails closed when the auth provider is unavailable', async () => {
    mocks.inspect.mockResolvedValue({ status: 'unavailable' });
    expect(await loadCurrentRiskForRequest(request())).toMatchObject({ status: 503 });
    expect(mocks.positions).not.toHaveBeenCalled();
  });
  it('rejects cross-site cookie requests before reading cookies', async () => {
    mocks.cookies.mockRejectedValue(new Error('cookie service unavailable'));
    expect(await loadCurrentRiskForRequest(request({ 'sec-fetch-site': 'cross-site' }))).toMatchObject({ status: 403 });
    expect(mocks.cookies).not.toHaveBeenCalled(); expect(mocks.positions).not.toHaveBeenCalled();
  });
  it('uses only the verified owner and ignores a forged query identity', async () => {
    await loadCurrentRiskForRequest(request({ authorization: 'Bearer valid-token' }));
    expect(mocks.positions).toHaveBeenCalledExactlyOnceWith('verified-owner');
    expect(mocks.inspect).toHaveBeenCalledWith('valid-token', 'cookie-token');
  });
  it('accepts case-insensitive bearer schemes and RFC token characters', async () => {
    await loadCurrentRiskForRequest(request({ authorization: 'bEaReR   aB09._~+/-==' }));
    expect(mocks.inspect).toHaveBeenCalledExactlyOnceWith('aB09._~+/-==', 'cookie-token');
  });
  it('does not reuse a previous request owner', async () => {
    await loadCurrentRiskForRequest(request({ authorization: 'Bearer owner-a-token' }));
    mocks.inspect.mockResolvedValue({ status: 'ok', userId: 'second-owner', mfaRequirement: 'none' });
    await loadCurrentRiskForRequest(request({ authorization: 'Bearer owner-b-token' }));
    expect(mocks.positions.mock.calls).toEqual([['verified-owner'], ['second-owner']]);
  });
  it('rate limits before reading positions', async () => {
    mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 12 });
    expect(await loadCurrentRiskForRequest(request())).toMatchObject({ status: 429, retryAfter: 12 });
    expect(mocks.positions).not.toHaveBeenCalled();
  });
  it('never exposes raw storage failures', async () => {
    mocks.positions.mockRejectedValue(new Error('private database details'));
    expect(await loadCurrentRiskForRequest(request())).toEqual({ ok: false, status: 503, code: 'RISK_DATA_UNAVAILABLE' });
  });
});
