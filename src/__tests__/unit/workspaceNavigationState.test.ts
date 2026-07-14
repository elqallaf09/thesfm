import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getFirstAccessibleAdminRoute,
  isNavigationItemActive,
  NAV_GROUPS,
  normalizeNavigationSource,
} from '@/components/navigationConfig';
import {
  findSelectedNavigationItemId,
  getExpandableNavigationItemState,
  getNavigationGroupDisclosureState,
} from '@/lib/navigation/workspaceNavigationState';

describe('workspace navigation selection state', () => {
  it('selects only the most-specific matching page', () => {
    expect(findSelectedNavigationItemId('/expenses/monthly-subscriptions', NAV_GROUPS)).toBe('monthly-subscriptions');
    expect(findSelectedNavigationItemId('/profile/companies', NAV_GROUPS)).toBe('my-companies');
    expect(findSelectedNavigationItemId('/sfm-admin-control/companies', NAV_GROUPS)).toBe('admin-companies');
  });

  it('selects query-specific charity destinations ahead of the base page', () => {
    expect(findSelectedNavigationItemId('/charity-projects', NAV_GROUPS)).toBe('charity-projects');
    expect(findSelectedNavigationItemId('/charity-projects?tab=beneficiaries', NAV_GROUPS)).toBe('beneficiaries');
    expect(findSelectedNavigationItemId('/charity-projects?tab=reports', NAV_GROUPS)).toBe('charity-reports');
    expect(findSelectedNavigationItemId('/charity-projects?tab=reports&year=2026', NAV_GROUPS)).toBe('charity-reports');
  });

  it('normalizes and matches query and hash navigation state independently', () => {
    const source = normalizeNavigationSource('/charity-projects', '#summary', 'tab=reports');
    expect(source).toBe('/charity-projects?tab=reports#summary');
    expect(isNavigationItemActive(source, '/charity-projects?tab=reports')).toBe(true);
    expect(isNavigationItemActive(source, '/charity-projects?tab=beneficiaries')).toBe(false);
    expect(isNavigationItemActive('/#faq', '/#faq')).toBe(true);
  });

  it('keeps an active child visible while styling its parent as expanded, not selected', () => {
    const expenses = NAV_GROUPS
      .flatMap(group => group.items)
      .find(item => item.id === 'expenses');

    expect(expenses).toBeDefined();
    expect(getExpandableNavigationItemState(expenses!, 'monthly-subscriptions', false)).toEqual({
      selected: false,
      descendantSelected: true,
      expanded: true,
    });
  });

  it('allows a genuine nested group to expand without creating a selected page', () => {
    const expenses = NAV_GROUPS
      .flatMap(group => group.items)
      .find(item => item.id === 'expenses');

    expect(getExpandableNavigationItemState(expenses!, null, true)).toEqual({
      selected: false,
      descendantSelected: false,
      expanded: true,
    });
  });

  it('keeps market-news and stock categories distinct and collapsible', () => {
    const marketNews = NAV_GROUPS.find(group => group.id === 'market-news');
    const stockCategories = NAV_GROUPS.find(group => group.id === 'stock-categories');

    expect(NAV_GROUPS.some(group => group.id === 'stock-news')).toBe(false);
    expect(marketNews).toMatchObject({
      labelKey: 'nav_group_market_news',
      collapsible: true,
      defaultOpen: true,
    });
    expect(marketNews?.items.map(item => item.id)).toEqual([
      'tech-news',
      'europe-news',
      'gulf-news',
      'crypto-news',
    ]);
    expect(stockCategories).toMatchObject({
      labelKey: 'nav_group_stock_categories',
      collapsible: true,
      defaultOpen: false,
    });
    expect(stockCategories?.items.map(item => item.id)).toEqual([
      'energy-stocks',
      'banking-stocks',
      'sharia-stocks',
      'growth-stocks',
      'defensive-stocks',
      'cyclical-stocks',
      'dividend-stocks',
    ]);
  });

  it('automatically reveals a collapsed group containing the active page', () => {
    const marketNews = NAV_GROUPS.find(group => group.id === 'market-news');
    const stockCategories = NAV_GROUPS.find(group => group.id === 'stock-categories');

    expect(getNavigationGroupDisclosureState(marketNews!, 'tech-news')).toEqual({
      active: true,
      expanded: true,
    });
    expect(getNavigationGroupDisclosureState(stockCategories!, 'energy-stocks', false)).toEqual({
      active: true,
      expanded: true,
    });
    expect(getNavigationGroupDisclosureState(stockCategories!, null)).toEqual({
      active: false,
      expanded: false,
    });
    expect(getNavigationGroupDisclosureState(stockCategories!, null, true)).toEqual({
      active: false,
      expanded: true,
    });
  });
});

describe('permission-aware Administration workspace entry', () => {
  const access = (permissions: Record<string, boolean>) => ({
    isAdmin: true,
    isSuperAdmin: false,
    permissions,
  });

  it('lands limited admins on their first permitted admin destination', () => {
    expect(getFirstAccessibleAdminRoute(access({ company_reviews: true }))).toBe('/sfm-admin-control/companies');
    expect(getFirstAccessibleAdminRoute(access({ admin_dashboard: true }))).toBe('/sfm-admin-control');
    expect(getFirstAccessibleAdminRoute(access({ instagram_automation: true }))).toBe('/sfm-admin-control/instagram-automation');
  });

  it('hides Administration when no admin navigation item is permitted', () => {
    expect(getFirstAccessibleAdminRoute(access({}))).toBeNull();
    expect(getFirstAccessibleAdminRoute(false)).toBeNull();
  });

  it('prioritizes the Administration dashboard for super administrators', () => {
    expect(getFirstAccessibleAdminRoute({
      isAdmin: true,
      isSuperAdmin: true,
      permissions: {},
    })).toBe('/sfm-admin-control');
  });
});

describe('workspace navigation direction and presentation contract', () => {
  const sidebar = readFileSync(join(process.cwd(), 'src/components/Sidebar.tsx'), 'utf8');
  const mobile = readFileSync(join(process.cwd(), 'src/components/MobileMenu.tsx'), 'utf8');
  const switcher = readFileSync(join(process.cwd(), 'src/components/WorkspaceSwitcher.tsx'), 'utf8');
  const header = readFileSync(join(process.cwd(), 'src/components/AppHeader.tsx'), 'utf8');
  const appLayout = readFileSync(join(process.cwd(), 'src/components/AppLayout.tsx'), 'utf8');
  const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

  it('binds both navigation surfaces to the active language direction', () => {
    expect(sidebar).toContain('dir={dir}');
    expect(mobile).toContain('dir={dir}');
    expect(sidebar).toContain('inset-inline-start');
    expect(sidebar).toContain('border-inline-end');
    expect(mobile).toContain('inset-inline-start');
    expect(mobile).toContain('border-inline-end');
  });

  it('mirrors collapsed chevrons for LTR while preserving RTL defaults', () => {
    expect(sidebar).toContain('[dir="ltr"] .sfm-shared-item-parent[aria-expanded="false"]');
    expect(mobile).toContain('[dir="ltr"] .sfm-mobile-parent-item[aria-expanded="false"]');
    expect(mobile).toContain('[dir="rtl"] .sfm-mobile-panel');
  });

  it('uses semantic flat states and keeps Main from repeating above Home', () => {
    for (const source of [sidebar, mobile]) {
      expect(source).toContain("group.id === 'main' ? null");
      expect(source).not.toMatch(/Tajawal|--mobile-menu-bg|linear-gradient\(/);
    }
    expect(sidebar).toContain("item.id === selectedItemId");
    expect(sidebar).toContain("state.expanded ? ' expanded' : ''");
    expect(mobile).toContain("state.expanded ? ' expanded' : ''");
  });

  it('propagates query changes and keeps collapsed Account actions accessible', () => {
    expect(sidebar).toContain('<NavigationQueryObserver onQueryChange={setSearch} />');
    expect(mobile).toContain('<NavigationQueryObserver onQueryChange={setSearch} />');
    expect(sidebar).toContain('const expanded = collapsed || openGlobalGroupIds.includes(group.id)');
    expect(sidebar).toContain('aria-label={t(item.labelKey)}');
  });

  it('keeps tablet navigation persistent and uses the drawer only on phones', () => {
    expect(sidebar).toContain("window.matchMedia('(min-width: 768px)')");
    expect(sidebar).toContain('@media(max-width:767px){.sfm-shared-sidebar{display:none}}');
    expect(header).toContain('@media (max-width: 767px)');
    expect(appLayout).toContain('@media (max-width: 767px)');
    expect(appLayout).not.toContain('@media (max-width: 1024px)');
    expect(globals).toContain('@media (min-width:768px) and (max-width:1024px)');
    expect(globals).toContain(':root{--sidebar-w:220px}');
    expect(globals).toContain('@media (min-width: 768px) and (max-width: 1024px)');
  });

  it('keeps global controls in the header and removes workspace controls from both sidebars', () => {
    expect(sidebar).not.toContain('WorkspaceSwitcher');
    expect(sidebar).not.toContain('sfm-workspace');
    expect(mobile).not.toContain('WorkspaceSwitcher');
    expect(mobile).not.toContain('sfm-mobile-workspace');
    expect(header).toContain('<WorkspaceSwitcher adminAccess={adminAccess}');
    expect(header).toContain('<DensityToggle />');
    expect(header).toContain('<ThemeToggle />');
    expect(header).toContain('<UserChip />');
    expect(header).toContain('.sfm-global-actions > .sfm-language-dropdown');
    expect(header).toContain('max-width: 44px');
    expect(mobile).toContain('<DensityToggle />');
  });

  it('does not expose an unauthorized Administration workspace as active', () => {
    expect(switcher).toContain('const active = resolveActiveWorkspace(pathname)');
    expect(switcher).not.toContain("resolveActiveWorkspace('/dashboard')");
    expect(switcher).toContain('availableWorkspaces({ isAdmin: Boolean(administrationEntryRoute) })');
  });
});
