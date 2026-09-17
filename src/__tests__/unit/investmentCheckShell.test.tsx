import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { isPublicShellRoute } from '@/config/workspaces/public-shell-routes';
import { AppLayout } from '@/components/AppLayout';
import InvestmentCheckPage from '@/app/investment-check/page';

const navigation = vi.hoisted(() => ({ pathname: '/investment-check', lang: 'en' as 'ar' | 'en' | 'fr' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isGuest: false, loading: false }) }));
vi.mock('next/dynamic', () => ({
  default: () => function WorkspaceShell({ children }: { children: React.ReactNode }) {
    return <div data-workspace-shell="true">{children}</div>;
  },
}));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ lang: navigation.lang }) }));
vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <button data-language-control="true">Language</button>,
}));
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-theme-control="true">Theme</button>,
}));

describe('Investment Check public shell', () => {
  beforeAll(() => { vi.stubGlobal('React', React); });
  afterAll(() => { vi.unstubAllGlobals(); });

  it.each(['ar', 'en', 'fr'] as const)('renders one public controls row without workspace chrome in %s', lang => {
    navigation.pathname = '/investment-check';
    navigation.lang = lang;
    const markup = renderToStaticMarkup(<AppLayout><InvestmentCheckPage /></AppLayout>);
    expect(markup).toContain('sfm-app-layout-public');
    expect(markup).not.toContain('data-workspace-shell');
    expect(markup.match(/data-language-control=/g)).toHaveLength(1);
    expect(markup.match(/data-theme-control=/g)).toHaveLength(1);
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });

  it('normalizes only the exact public entry and does not exempt neighboring routes', () => {
    for (const pathname of ['/investment-check', '/investment-check/', '/investment-check?symbol=AAPL#check']) {
      expect(isPublicShellRoute(pathname)).toBe(true);
    }
    for (const pathname of ['/investment-check/private', '/investment-checking', '/investments', '/dashboard']) {
      expect(isPublicShellRoute(pathname)).toBe(false);
    }
    navigation.pathname = '/investments';
    expect(renderToStaticMarkup(<AppLayout><p>Investments</p></AppLayout>)).toContain('data-workspace-shell');
  });
});
