import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';

const navigationState = vi.hoisted(() => ({
  pathname: '/dashboard',
  lang: 'en' as 'ar' | 'en' | 'fr',
  dir: 'ltr' as 'rtl' | 'ltr',
  authenticated: true,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: navigationState.authenticated ? { id: 'user-1' } : null }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ lang: navigationState.lang, dir: navigationState.dir }),
}));

const noAdminAccess = {
  isAdmin: false,
  isSuperAdmin: false,
  permissions: {},
};

function renderSwitcher(adminAccess = noAdminAccess) {
  return renderToStaticMarkup(<WorkspaceSwitcher adminAccess={adminAccess} />);
}

function workspaceAnchor(markup: string, workspaceId: string) {
  return markup.match(new RegExp(`<a[^>]*data-workspace-id="${workspaceId}"[^>]*>`))?.[0] ?? '';
}

describe('rendered workspace switcher', () => {
  beforeAll(() => {
    // The production Next.js compiler injects the automatic JSX runtime. The
    // Node-only Vitest renderer keeps JSX classic, so expose React for the
    // component under test without adding a browser-like test environment.
    // styled-jsx removes its marker props in Next; strip them here as well so
    // the server renderer exercises the markup without irrelevant warnings.
    vi.stubGlobal('React', {
      ...React,
      createElement(type: React.ElementType, props: Record<string, unknown> | null, ...children: React.ReactNode[]) {
        if (type === 'style' && props) {
          const styleProps = { ...props };
          delete styleProps.jsx;
          delete styleProps.global;
          return React.createElement(type, styleProps, ...children);
        }
        return React.createElement(type, props, ...children);
      },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    navigationState.pathname = '/dashboard';
    navigationState.lang = 'en';
    navigationState.dir = 'ltr';
    navigationState.authenticated = true;
  });

  it('derives exactly one current page from each route render', () => {
    const personalMarkup = renderSwitcher();
    expect(personalMarkup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(workspaceAnchor(personalMarkup, 'personal-finance')).toContain('aria-current="page"');

    navigationState.pathname = '/profile/companies';
    const businessMarkup = renderSwitcher();
    expect(businessMarkup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(workspaceAnchor(businessMarkup, 'business-projects')).toContain('aria-current="page"');
    expect(workspaceAnchor(businessMarkup, 'personal-finance')).not.toContain('aria-current');
  });

  it('filters Administration and uses the first permission-accessible destination', () => {
    expect(renderSwitcher()).not.toContain('data-workspace-id="administration"');

    navigationState.pathname = '/sfm-admin-control/companies';
    const reviewerMarkup = renderSwitcher({
      isAdmin: true,
      isSuperAdmin: false,
      permissions: { company_reviews: true },
    });
    const adminAnchor = workspaceAnchor(reviewerMarkup, 'administration');
    expect(adminAnchor).toContain('href="/sfm-admin-control/companies"');
    expect(adminAnchor).toContain('aria-current="page"');
    expect(reviewerMarkup).toContain('Administration');
  });

  it('renders logical direction and full translated labels without changing route ownership', () => {
    const englishMarkup = renderSwitcher();
    expect(englishMarkup).toContain('dir="ltr"');
    expect(englishMarkup).toContain('Personal Finance');
    expect(englishMarkup).toContain('Markets &amp; Trading');
    expect(englishMarkup).toContain('Business &amp; Projects');

    navigationState.pathname = '/market-analysis';
    navigationState.lang = 'ar';
    navigationState.dir = 'rtl';
    const arabicMarkup = renderSwitcher();
    expect(arabicMarkup).toContain('dir="rtl"');
    expect(arabicMarkup).toContain('الأسواق والتداول');
    expect(arabicMarkup).toContain('data-workspace-id="markets-trading"');
    expect(arabicMarkup).toContain('aria-current="page"');

    navigationState.lang = 'fr';
    navigationState.dir = 'ltr';
    const frenchMarkup = renderSwitcher();
    expect(frenchMarkup).toContain('dir="ltr"');
    expect(frenchMarkup).toContain('Marchés et trading');
    expect(workspaceAnchor(frenchMarkup, 'markets-trading')).toContain('aria-current="page"');
  });
});
