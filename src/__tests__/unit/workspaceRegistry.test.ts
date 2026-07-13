import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filterNavigationGroups, NAV_GROUPS } from '@/components/navigationConfig';
import { SHARED_NAV_GROUP_IDS, WORKSPACES, getWorkspaceById } from '@/config/workspaces/workspace-registry';
import {
  availableWorkspaces,
  getWorkspaceDefaultRoute,
  getWorkspaceEntryRoute,
  getWorkspaceForPathname,
  isAdminWorkspaceRoute,
  isPublicShellRoute,
  isWorkspaceRoute,
  resolveActiveWorkspace,
} from '@/config/workspaces/workspace-resolver';
import { filterGroupsForWorkspace, workspaceOwningNavGroup } from '@/config/workspaces/workspace-navigation';

describe('workspace registry validity', () => {
  it('registers Business & Projects under the final id and trilingual labels', () => {
    const business = getWorkspaceById('business-projects');
    expect(business.labels).toEqual({
      ar: 'الأعمال والمشاريع',
      en: 'Business & Projects',
      fr: 'Affaires et projets',
    });
    expect(WORKSPACES.some(workspace => (workspace.id as string) === 'companies-services')).toBe(false);
  });

  it('has unique workspace ids and every workspace enabled with complete trilingual labels', () => {
    const ids = WORKSPACES.map(workspace => workspace.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const workspace of WORKSPACES) {
      expect(workspace.enabled).toBe(true);
      for (const lang of ['ar', 'en', 'fr'] as const) {
        expect(workspace.labels[lang].trim().length).toBeGreaterThan(0);
        expect(workspace.description[lang].trim().length).toBeGreaterThan(0);
      }
      // English digits only — no Arabic-Indic digits in any label.
      expect(JSON.stringify(workspace.labels) + JSON.stringify(workspace.description)).not.toMatch(/[٠-٩]/);
    }
  });

  it('gives every workspace a default route that resolves back to itself', () => {
    for (const workspace of WORKSPACES) {
      expect(workspace.defaultRoute.startsWith('/')).toBe(true);
      expect(getWorkspaceForPathname(workspace.defaultRoute)?.id).toBe(workspace.id);
      expect(getWorkspaceDefaultRoute(workspace.id)).toBe(workspace.defaultRoute);
      if (workspace.guestDefaultRoute) {
        expect(workspace.access.guestAllowed).toBe(true);
        expect(getWorkspaceForPathname(workspace.guestDefaultRoute)?.id).toBe(workspace.id);
      }
    }
  });

  it('uses the public company directory only for guest Business & Projects entry', () => {
    expect(getWorkspaceEntryRoute('business-projects', { isAuthenticated: true })).toBe('/business-hub');
    expect(getWorkspaceEntryRoute('business-projects', { isAuthenticated: false })).toBe('/investment-companies');
    expect(getWorkspaceEntryRoute('personal-finance', { isAuthenticated: false })).toBe('/dashboard');
    expect(getWorkspaceEntryRoute('markets-trading', { isAuthenticated: false })).toBe('/market-analysis');
  });

  it('never repeats an identical route prefix across workspaces', () => {
    const allPrefixes = WORKSPACES.flatMap(workspace => [...workspace.routePrefixes]);
    expect(new Set(allPrefixes).size).toBe(allPrefixes.length);
  });

  it('marks only Administration as admin-required', () => {
    for (const workspace of WORKSPACES) {
      expect(Boolean(workspace.access.adminRequired)).toBe(workspace.id === 'administration');
    }
    expect(getWorkspaceById('administration').access.authenticationRequired).toBe(true);
  });
});

describe('route-to-workspace resolution', () => {
  it('resolves representative real routes to their workspaces', () => {
    const cases: Array<[string, string]> = [
      ['/dashboard', 'personal-finance'],
      ['/income', 'personal-finance'],
      ['/expenses/monthly-subscriptions', 'personal-finance'],
      ['/charity-projects', 'personal-finance'],
      ['/reports-center', 'personal-finance'],
      ['/market-analysis', 'markets-trading'],
      ['/watchlist', 'markets-trading'],
      ['/thesfm-trader-own', 'markets-trading'],
      ['/thesfm-trader-own/dashboard', 'markets-trading'],
      ['/gulf-news', 'markets-trading'],
      ['/invest/add', 'markets-trading'],
      ['/projects/project-id', 'business-projects'],
      ['/business', 'business-projects'],
      ['/business/subscriptions/client-id', 'business-projects'],
      ['/business-hub', 'business-projects'],
      ['/business-operations', 'business-projects'],
      ['/investment-offers', 'business-projects'],
      ['/investor/share-token', 'business-projects'],
      ['/customers', 'business-projects'],
      ['/invoices', 'business-projects'],
      ['/employees', 'business-projects'],
      ['/sales', 'business-projects'],
      ['/suppliers', 'business-projects'],
      ['/operating-expenses', 'business-projects'],
      ['/investment-companies', 'business-projects'],
      ['/services/investment-firms', 'business-projects'],
      ['/companies/some-company-id-123', 'business-projects'],
      ['/company-listing/submit', 'business-projects'],
      ['/sfm-admin-control', 'administration'],
      ['/sfm-admin-control/companies', 'administration'],
    ];
    for (const [pathname, workspaceId] of cases) {
      expect(getWorkspaceForPathname(pathname)?.id, pathname).toBe(workspaceId);
    }
  });

  it('uses longest-prefix matching so nested ownership wins', () => {
    // /profile is global account context with Personal Finance as its primary
    // owner, while the companies management page belongs to Business & Projects.
    expect(getWorkspaceForPathname('/profile')?.id).toBe('personal-finance');
    expect(getWorkspaceForPathname('/profile/companies')?.id).toBe('business-projects');
    // Segment-aware: /business must not claim /business-hub by accident.
    expect(getWorkspaceForPathname('/business-hub')?.id).toBe('business-projects');
  });

  it('is query, hash, and trailing-slash independent', () => {
    expect(getWorkspaceForPathname('/market-analysis?tab=alerts')?.id).toBe('markets-trading');
    expect(getWorkspaceForPathname('/charity-projects/?tab=reports')?.id).toBe('personal-finance');
    expect(getWorkspaceForPathname('/zakat#calculator')?.id).toBe('personal-finance');
  });

  it('keeps shared tools with one clear primary workspace owner', () => {
    for (const pathname of ['/tasks', '/documents', '/reports', '/reports-center', '/expenses/add']) {
      expect(getWorkspaceForPathname(pathname)?.id, pathname).toBe('personal-finance');
    }
    expect(getWorkspaceForPathname('/market-analysis')?.id).toBe('markets-trading');
  });

  it('handles unknown routes safely: strict null, shell fallback to Personal Finance', () => {
    expect(getWorkspaceForPathname('/definitely-not-a-route')).toBeNull();
    expect(getWorkspaceForPathname(null)).toBeNull();
    expect(getWorkspaceForPathname('')).toBeNull();
    expect(isWorkspaceRoute('/definitely-not-a-route')).toBe(false);
    expect(resolveActiveWorkspace('/definitely-not-a-route').id).toBe('personal-finance');
    expect(resolveActiveWorkspace(undefined).id).toBe('personal-finance');
  });

  it('detects public-shell and admin routes without granting anything', () => {
    for (const publicPath of ['/', '/login', '/about', '/investor/some-token']) {
      expect(isPublicShellRoute(publicPath), publicPath).toBe(true);
    }
    expect(isPublicShellRoute('/dashboard')).toBe(false);
    expect(isAdminWorkspaceRoute('/sfm-admin-control/shariah')).toBe(true);
    expect(isAdminWorkspaceRoute('/dashboard')).toBe(false);
  });
});

describe('workspace navigation ownership', () => {
  it('assigns every NAV_GROUPS group to exactly one workspace or the shared set', () => {
    for (const group of NAV_GROUPS) {
      const owner = workspaceOwningNavGroup(group.id);
      const shared = SHARED_NAV_GROUP_IDS.includes(group.id);
      expect(owner !== null || shared, `group ${group.id} is unowned`).toBe(true);
      expect(owner !== null && shared, `group ${group.id} is both owned and shared`).toBe(false);
    }
  });

  it('references only real NAV_GROUPS ids from the registry', () => {
    const knownGroupIds = new Set(NAV_GROUPS.map(group => group.id));
    for (const workspace of WORKSPACES) {
      for (const groupId of workspace.navGroupIds) {
        expect(knownGroupIds.has(groupId), `${workspace.id} references missing group ${groupId}`).toBe(true);
      }
    }
  });

  it('keeps every owned navigation href inside its owning workspace', () => {
    for (const group of NAV_GROUPS) {
      const owner = workspaceOwningNavGroup(group.id);
      if (!owner) continue; // shared groups intentionally span workspaces
      const items = group.items.flatMap(item => [item, ...(item.children ?? [])]);
      for (const item of items) {
        if (!item.href || item.external) continue;
        expect(getWorkspaceForPathname(item.href)?.id, `${group.id}/${item.id} → ${item.href}`).toBe(owner);
      }
    }
  });

  it('filters groups per workspace while always keeping the shared account group', () => {
    for (const workspace of WORKSPACES) {
      const groups = filterGroupsForWorkspace([...NAV_GROUPS], workspace.id);
      expect(groups.some(group => group.id === 'account')).toBe(true);
      for (const group of groups) {
        if (SHARED_NAV_GROUP_IDS.includes(group.id)) continue;
        expect(workspaceOwningNavGroup(group.id)).toBe(workspace.id);
      }
    }
  });

  it('keeps business-only navigation out of Personal Finance without duplicating URLs', () => {
    const hrefsFor = (workspaceId: 'personal-finance' | 'business-projects') => {
      const groups = filterGroupsForWorkspace(filterNavigationGroups(NAV_GROUPS, false), workspaceId);
      const flatten = (items: (typeof groups)[number]['items']): string[] => items.flatMap(item => [
        ...(item.href ? [item.href] : []),
        ...(item.children ? flatten(item.children) : []),
      ]);
      return groups.flatMap(group => flatten(group.items));
    };

    const personalHrefs = hrefsFor('personal-finance');
    const businessHrefs = hrefsFor('business-projects');
    const businessOnlyHrefs = [
      '/projects',
      '/business-hub',
      '/investment-offers',
      '/business/subscriptions',
      '/business-operations',
      '/profile/companies',
      '/company-listing/submit',
    ];

    for (const href of businessOnlyHrefs) {
      expect(personalHrefs, href).not.toContain(href);
      expect(businessHrefs, href).toContain(href);
    }
    expect(new Set(businessHrefs).size).toBe(businessHrefs.length);
  });

  it('keeps account navigation global without business company management', () => {
    const account = NAV_GROUPS.find(group => group.id === 'account');
    expect(account?.items.map(item => item.id)).toEqual(['profile', 'security', 'logout']);
  });

  it('keeps legacy Personal Finance page menus free of cross-workspace routes', () => {
    const helpers = readFileSync(resolve(process.cwd(), 'src/lib/routeDashboard/helpers.ts'), 'utf8');
    expect(helpers).not.toMatch(/href:\s*['"]\/(?:projects|invest)['"]/);
  });

  it('hides Administration from non-admins in the switcher list', () => {
    const forUser = availableWorkspaces({ isAdmin: false }).map(workspace => workspace.id);
    expect(forUser).toEqual(['personal-finance', 'markets-trading', 'business-projects']);
    const forAdmin = availableWorkspaces({ isAdmin: true }).map(workspace => workspace.id);
    expect(forAdmin).toContain('administration');
  });

  it('filters Administration navigation by actual admin permissions', () => {
    expect(filterNavigationGroups(NAV_GROUPS, false).some(group => group.id === 'admin')).toBe(false);

    const companyReviewerGroups = filterNavigationGroups(NAV_GROUPS, {
      isAdmin: true,
      isSuperAdmin: false,
      permissions: { company_reviews: true },
    });
    expect(companyReviewerGroups.find(group => group.id === 'admin')?.items.map(item => item.id)).toEqual([
      'admin-companies',
    ]);

    const superAdminGroups = filterNavigationGroups(NAV_GROUPS, {
      isAdmin: true,
      isSuperAdmin: true,
      permissions: {},
    });
    expect(superAdminGroups.find(group => group.id === 'admin')?.items).not.toHaveLength(0);
  });
});

describe('retired Basic and Advanced navigation mode', () => {
  it('has no view-mode metadata, hook, selector, or shell dependency', () => {
    const root = process.cwd();
    expect(existsSync(resolve(root, 'src/hooks/useViewMode.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'src/components/ViewModeSelector.tsx'))).toBe(false);

    const activeSources = [
      'src/components/navigationConfig.ts',
      'src/components/Sidebar.tsx',
      'src/components/MobileMenu.tsx',
      'src/hooks/useAuth.tsx',
      'src/app/(auth)/login/page.tsx',
      'src/app/globals.css',
    ].map(file => readFileSync(resolve(root, file), 'utf8')).join('\n');
    expect(activeSources).not.toMatch(/useViewMode|ViewModeSelector|viewModes|view_mode|sfm:view-mode-change|sfm-mobile-view-mode/);
  });
});
