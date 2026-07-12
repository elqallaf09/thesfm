import { describe, expect, it } from 'vitest';
import { NAV_GROUPS } from '@/components/navigationConfig';
import { SHARED_NAV_GROUP_IDS, WORKSPACES, getWorkspaceById } from '@/config/workspaces/workspace-registry';
import {
  availableWorkspaces,
  getWorkspaceDefaultRoute,
  getWorkspaceForPathname,
  isAdminWorkspaceRoute,
  isPublicShellRoute,
  isWorkspaceRoute,
  resolveActiveWorkspace,
} from '@/config/workspaces/workspace-resolver';
import { filterGroupsForWorkspace, workspaceOwningNavGroup } from '@/config/workspaces/workspace-navigation';

describe('workspace registry validity', () => {
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
    }
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
      ['/investment-offers', 'personal-finance'],
      ['/business/subscriptions', 'personal-finance'],
      ['/market-analysis', 'markets-trading'],
      ['/watchlist', 'markets-trading'],
      ['/thesfm-trader-own', 'markets-trading'],
      ['/thesfm-trader-own/dashboard', 'markets-trading'],
      ['/gulf-news', 'markets-trading'],
      ['/invest/add', 'markets-trading'],
      ['/investment-companies', 'companies-services'],
      ['/companies/some-company-id-123', 'companies-services'],
      ['/company-listing/submit', 'companies-services'],
      ['/sfm-admin-control', 'administration'],
      ['/sfm-admin-control/companies', 'administration'],
    ];
    for (const [pathname, workspaceId] of cases) {
      expect(getWorkspaceForPathname(pathname)?.id, pathname).toBe(workspaceId);
    }
  });

  it('uses longest-prefix matching so nested ownership wins', () => {
    // /profile is Personal Finance, but the companies management page under
    // it belongs to Companies & Services.
    expect(getWorkspaceForPathname('/profile')?.id).toBe('personal-finance');
    expect(getWorkspaceForPathname('/profile/companies')?.id).toBe('companies-services');
    // Segment-aware: /business must not claim /business-hub by accident.
    expect(getWorkspaceForPathname('/business-hub')?.id).toBe('personal-finance');
  });

  it('is query, hash, and trailing-slash independent', () => {
    expect(getWorkspaceForPathname('/market-analysis?tab=alerts')?.id).toBe('markets-trading');
    expect(getWorkspaceForPathname('/charity-projects/?tab=reports')?.id).toBe('personal-finance');
    expect(getWorkspaceForPathname('/zakat#calculator')?.id).toBe('personal-finance');
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
    // The super-admin trader shortcut lives in the admin GROUP but its route
    // is owned by Markets & Trading — the one documented cross-listing.
    const allowedCrossListings = new Set(['smart-trading-terminal']);
    for (const group of NAV_GROUPS) {
      const owner = workspaceOwningNavGroup(group.id);
      if (!owner) continue; // shared groups intentionally span workspaces
      const items = group.items.flatMap(item => [item, ...(item.children ?? [])]);
      for (const item of items) {
        if (!item.href || item.external || allowedCrossListings.has(item.id)) continue;
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

  it('hides Administration from non-admins in the switcher list', () => {
    const forUser = availableWorkspaces({ isAdmin: false }).map(workspace => workspace.id);
    expect(forUser).toEqual(['personal-finance', 'markets-trading', 'companies-services']);
    const forAdmin = availableWorkspaces({ isAdmin: true }).map(workspace => workspace.id);
    expect(forAdmin).toContain('administration');
  });
});
