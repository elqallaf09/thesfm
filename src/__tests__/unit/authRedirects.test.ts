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

const protectedPath = '/settings?section=security&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';
const legacyAnalysisPath = '/market-analysis?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';

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

  it('preserves the complete request path and nested search parameters for a protected guest redirect', async () => {
    const response = await middleware(new NextRequest(`https://www.the-sfm.com${protectedPath}`));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe(protectedPath);
    expect(location.search).toBe(`?next=${encodeURIComponent(protectedPath)}`);
    expect(requestDestination('/settings', protectedPath.slice('/settings'.length))).toBe(protectedPath);
  });

  it('renders every AI Analyst page route without requiring sfm_guest or a session', async () => {
    for (const path of [
      '/ai-analyst',
      '/ai-analyst/overview',
      '/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING',
      '/ai-analyst/history',
      '/ai-analyst/watchlist',
      '/ai-analyst/alerts',
      '/ai-analyst/settings',
    ]) {
      const response = await middleware(new NextRequest(`https://www.the-sfm.com${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('keeps legacy compatibility aliases public while the terminal remains session-protected', async () => {
    for (const path of [
      '/market-analysis?symbol=AAPL&assetType=STOCK&horizon=SWING',
      '/market-agent?symbol=AAPL',
      '/symbol-details/AAPL',
      '/watchlist',
      '/market-watchlist',
      '/alerts',
      '/market-alerts',
    ]) {
      const response = await middleware(new NextRequest(`https://www.the-sfm.com${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }

    const terminalResponse = await middleware(new NextRequest('https://www.the-sfm.com/thesfm-trader-own/dashboard'));
    expect(terminalResponse.status).toBe(307);
    const terminalLocation = new URL(terminalResponse.headers.get('location') ?? '');
    expect(terminalLocation.pathname).toBe('/login');
    expect(terminalLocation.searchParams.get('next')).toBe('/thesfm-trader-own/dashboard');

    const adminResponse = await middleware(new NextRequest('https://www.the-sfm.com/sfm-admin-control/observability'));
    expect(adminResponse.status).toBe(307);
    const adminLocation = new URL(adminResponse.headers.get('location') ?? '');
    expect(adminLocation.pathname).toBe('/login');
    expect(adminLocation.searchParams.get('next')).toBe('/sfm-admin-control/observability');
  });

  it('does not expose the temporary legacy market adapter through the public AI Analyst shell', async () => {
    const compatibilityPath = '/ai-analyst/overview?legacy=market&tab=traderTools&symbol=AAPL';
    const anonymousResponse = await middleware(new NextRequest(`https://www.the-sfm.com${compatibilityPath}`));
    const anonymousLocation = new URL(anonymousResponse.headers.get('location') ?? '');

    expect(anonymousResponse.status).toBe(307);
    expect(anonymousLocation.pathname).toBe('/login');
    expect(anonymousLocation.searchParams.get('next')).toBe(compatibilityPath);

    const guestResponse = await middleware(new NextRequest(
      `https://www.the-sfm.com${compatibilityPath}`,
      { headers: { cookie: 'sfm_guest=true' } },
    ));
    expect(guestResponse.status).toBe(200);
    expect(guestResponse.headers.get('location')).toBeNull();
  });

  it('returns an authenticated user to the exact query-bearing legacy compatibility target', async () => {
    vi.mocked(inspectSessionSecurity).mockResolvedValue(authenticatedSession);
    const response = await middleware(new NextRequest(
      `https://www.the-sfm.com/login?next=${encodeURIComponent(legacyAnalysisPath)}`,
      { headers: { cookie: 'sfm_access_token=test-token' } },
    ));
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(`${location.pathname}${location.search}${location.hash}`).toBe(legacyAnalysisPath);
  });

  it('preserves the target through post-MFA middleware completion', async () => {
    vi.mocked(inspectSessionSecurity).mockResolvedValue(authenticatedSession);
    const response = await middleware(new NextRequest(
      `https://www.the-sfm.com/mfa/verify?next=${encodeURIComponent(protectedPath)}`,
      { headers: { cookie: 'sfm_access_token=test-token' } },
    ));
    const location = new URL(response.headers.get('location') ?? '');

    expect(`${location.pathname}${location.search}${location.hash}`).toBe(protectedPath);
  });

  it('retains a benign inherited fragment without double-encoding the destination', () => {
    expect(mergeClientHash(protectedPath, '#watchlist')).toBe(`${protectedPath}#watchlist`);
    expect(mergeClientHash(`${protectedPath}#timeline`, '#watchlist')).toBe(`${protectedPath}#timeline`);
    expect(loginHrefForDestination(`${protectedPath}#watchlist`)).toBe(
      `/login?next=${encodeURIComponent(`${protectedPath}#watchlist`)}`,
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
    expect(mergeClientHash(protectedPath, '#access_token=secret')).toBe(protectedPath);
    expect(mergeClientHash(protectedPath, '#type=recovery&token=secret')).toBe(protectedPath);
  });
});
