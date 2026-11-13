import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '@/components/AppLayout';
import { isPublicShellRoute } from '@/config/workspaces/public-shell-routes';

const session = vi.hoisted(() => ({ pathname: '/tv/all-stocks', user: null as { id: string } | null, isGuest: false }));
vi.mock('next/navigation', () => ({ usePathname: () => session.pathname }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ...session, loading: false }) }));
vi.mock('next/dynamic', () => ({ default: () => function WorkspaceShell({ children }: { children: React.ReactNode }) { return <aside data-workspace-shell>{children}</aside>; } }));

describe('TV web routes use the independent display shell', () => {
  beforeAll(() => vi.stubGlobal('React', React));
  afterAll(() => vi.unstubAllGlobals());
  it.each(['anonymous', 'guest', 'authenticated'])('omits the workspace header and sidebar for %s visitors', mode => {
    session.user = mode === 'authenticated' ? { id: 'test-user' } : null;
    session.isGuest = mode === 'guest';
    for (const path of ['/tv', '/tv/strips', '/tv/pair', '/tv/all-stocks', '/tv/all-stocks/?q=test#results']) {
      session.pathname = path;
      const html = renderToStaticMarkup(<AppLayout><section data-tv-root>TV</section></AppLayout>);
      expect(html).toContain('sfm-app-layout-public');
      expect(html).not.toContain('data-workspace-shell');
      expect(html).toContain('data-tv-root');
    }
  });
  it('does not treat similarly named or private routes as public TV pages', () => {
    for (const path of ['/tv/all-stocks-private', '/tv/all-stocks/admin', '/dashboard', '/investments']) expect(isPublicShellRoute(path)).toBe(false);
  });
});
