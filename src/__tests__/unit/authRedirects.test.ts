import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loginHrefForDestination,
  mergeClientHash,
  requestDestination,
  resolveInternalDestination,
} from '@/lib/auth/redirects';
import { inspectSessionSecurity } from '@/lib/server/authSession';

vi.mock('@/lib/server/authSession', () => ({
  bearerToken: () => null,
  inspectSessionSecurity: vi.fn(),
}));

import { middleware } from '@/middleware';

const analysisPath = '/market-analysis?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';

const authenticatedSession = {
  status: 'ok' as const,
  token: 'test-token',
  userId: 'test-user',
  email: 'test@example.com',
  sessionId: 'test-session',
  aal: 'aal2' as const,
  mfaRequirement: 'none' as const,
  onboardingComplete: true,
};

describe('authentication deep-link redirects', () => {
  beforeEach(() => {
    vi.mocked(inspectSessionSecurity).mockReset();
  });

  it('preserves the complete request path and nested search parameters for a guest redirect', async () => {
    const response = await middleware(new NextRequest(`https://www.the-sfm.com${analysisPath}`));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe(analysisPath);
    expect(location.search).toBe(`?next=${encodeURIComponent(analysisPath)}`);
    expect(requestDestination('/market-analysis', analysisPath.slice('/market-analysis'.length))).toBe(analysisPath);
  });

  it('returns an authenticated user to the exact query-bearing target', async () => {
    vi.mocked(inspectSessionSecurity).mockResolvedValue(authenticatedSession);
    const response = await middleware(new NextRequest(
      `https://www.the-sfm.com/login?next=${encodeURIComponent(analysisPath)}`,
      { headers: { cookie: 'sfm_access_token=test-token' } },
    ));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(`${location.pathname}${location.search}${location.hash}`).toBe(analysisPath);
  });

  it('preserves the target through post-MFA middleware completion', async () => {
    vi.mocked(inspectSessionSecurity).mockResolvedValue(authenticatedSession);
    const response = await middleware(new NextRequest(
      `https://www.the-sfm.com/mfa/verify?next=${encodeURIComponent(analysisPath)}`,
      { headers: { cookie: 'sfm_access_token=test-token' } },
    ));
    const location = new URL(response.headers.get('location') ?? '');

    expect(`${location.pathname}${location.search}${location.hash}`).toBe(analysisPath);
  });

  it('retains a benign inherited fragment without double-encoding the destination', () => {
    expect(mergeClientHash(analysisPath, '#watchlist')).toBe(`${analysisPath}#watchlist`);
    expect(mergeClientHash(`${analysisPath}#timeline`, '#watchlist')).toBe(`${analysisPath}#timeline`);
    expect(loginHrefForDestination(`${analysisPath}#watchlist`)).toBe(
      `/login?next=${encodeURIComponent(`${analysisPath}#watchlist`)}`,
    );
  });

  it('fails closed for external, protocol-relative, escaped, and credential-bearing destinations', () => {
    for (const unsafe of [
      'https://evil.example/steal',
      '//evil.example/steal',
      '/%2F%2Fevil.example/steal',
      '/%5Cevil.example/steal',
      '/%252F%252Fevil.example/steal',
      '/market-analysis%ZZ',
    ]) {
      expect(resolveInternalDestination(unsafe), unsafe).toBeNull();
    }
    expect(mergeClientHash(analysisPath, '#access_token=secret')).toBe(analysisPath);
    expect(mergeClientHash(analysisPath, '#type=recovery&token=secret')).toBe(analysisPath);
  });
});
