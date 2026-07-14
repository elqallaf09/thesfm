import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filterNavigationGroups,
  NAV_GROUPS,
  SUPPORT_LINKS,
  type NavigationItem,
} from '@/components/navigationConfig';
import { filterGroupsForWorkspace } from '@/config/workspaces/workspace-navigation';
import { findSelectedNavigationItemId } from '@/lib/navigation/workspaceNavigationState';
import { TR_NAV } from '@/lib/translations/nav';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const sidebar = read('src/components/Sidebar.tsx');
const mobile = read('src/components/MobileMenu.tsx');
const header = read('src/components/AppHeader.tsx');
const appLayout = read('src/components/AppLayout.tsx');
const commandButton = read('src/components/CommandMenuButton.tsx');
const commandMenu = read('src/components/CommandMenu.tsx');
const lazyCommandMenu = read('src/components/LazyCommandMenu.tsx');
const tooltip = read('src/components/ui/tooltip.tsx');
const languageSwitcher = read('src/components/ui/LanguageSwitcher.tsx');

function flatten(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap(item => [item, ...(item.children ? flatten(item.children) : [])]);
}

describe('Phase 3.3 workspace-navigation architecture', () => {
  it('keeps routes unique, workspace-scoped, and header-only', () => {
    const hrefs = NAV_GROUPS.flatMap(group => flatten(group.items))
      .map(item => item.href)
      .filter((href): href is string => Boolean(href));
    expect(new Set(hrefs).size).toBe(hrefs.length);

    const markets = filterGroupsForWorkspace(filterNavigationGroups(NAV_GROUPS, false), 'markets-trading');
    expect(markets.map(group => group.id)).toEqual([
      'investment-market',
      'market-news',
      'stock-categories',
      'account',
    ]);

    expect(header).toContain('<WorkspaceSwitcher adminAccess={adminAccess}');
    expect(sidebar).not.toMatch(/WorkspaceSwitcher|Basic View|Advanced View|useViewMode|view_mode/i);
    expect(mobile).not.toMatch(/WorkspaceSwitcher|Basic View|Advanced View|useViewMode|view_mode/i);
  });

  it('keeps exactly one route-derived page selected for representative destinations', () => {
    for (const [source, expected] of [
      ['/dashboard', 'home'],
      ['/expenses/monthly-subscriptions', 'monthly-subscriptions'],
      ['/market-analysis', 'market-analysis'],
      ['/energy-stocks', 'energy-stocks'],
      ['/security', 'security'],
      ['/#faq', 'support-faq'],
    ] as const) {
      expect(findSelectedNavigationItemId(source, NAV_GROUPS, SUPPORT_LINKS), source).toBe(expected);
    }
    expect(sidebar).toContain('aria-current={selected ? \'page\' : undefined}');
    expect(mobile).toContain("'aria-current': selected ? 'page' as const : undefined");
  });

  it('continues to filter Administration and super-admin-only navigation', () => {
    expect(filterNavigationGroups(NAV_GROUPS, false).some(group => group.id === 'admin')).toBe(false);
    const ordinaryMarkets = filterGroupsForWorkspace(
      filterNavigationGroups(NAV_GROUPS, false),
      'markets-trading',
    );
    expect(ordinaryMarkets.flatMap(group => group.items).some(item => item.id === 'smart-trading-terminal')).toBe(false);
  });
});

describe('Phase 3.3 Markets grouping and disclosure', () => {
  it('groups News and Stock Categories with complete trilingual labels', () => {
    expect(TR_NAV.nav_group_market_news).toEqual({
      ar: 'أخبار الأسواق',
      en: 'Market News',
      fr: 'Actualités des marchés',
    });
    expect(TR_NAV.nav_group_stock_categories).toEqual({
      ar: 'فئات الأسهم',
      en: 'Stock Categories',
      fr: 'Catégories d’actions',
    });
    expect(NAV_GROUPS.find(group => group.id === 'market-news')?.items).toHaveLength(4);
    expect(NAV_GROUPS.find(group => group.id === 'stock-categories')?.items).toHaveLength(7);
  });

  it('uses accessible two-level disclosures and always reveals an active child', () => {
    for (const source of [sidebar, mobile]) {
      expect(source).toContain('getNavigationGroupDisclosureState');
      expect(source).toContain('aria-expanded=');
      expect(source).toContain('aria-controls=');
      expect(source).toContain('inert=');
    }
    expect(sidebar).toContain('data-active-group={groupState.active');
    expect(sidebar).toContain('tabIndex={collapsed ? -1 : undefined}');
    expect(sidebar).toContain('collapsed ? setCollapsed(false) : toggleNestedItem(item.id)');
    expect(sidebar).toContain('.sfm-shared-group-toggle.expanded');
    expect(sidebar).toContain('.sfm-shared-item.active::before');
    expect(sidebar).not.toMatch(/sfm-shared-group-toggle\.expanded[^}]*::before/);
  });
});

describe('Phase 3.3 premium sidebar interaction contract', () => {
  it('keeps primary navigation scrollable while Account and Support remain separately reachable', () => {
    expect(sidebar).toContain('ref={navigationScrollRef} className="sfm-shared-primary-scroll"');
    expect(sidebar).toContain('className="sfm-shared-utilities"');
    expect(sidebar).toContain('<nav\n          className="sfm-shared-utilities"');
    expect(sidebar).toContain('max-height:min(44dvh,370px)');
    expect(sidebar).toContain('target.scrollIntoView');
    expect(mobile).toContain('className="sfm-mobile-utilities"');
    expect(mobile).toContain('className="sfm-mobile-utility-nav"');
    expect(mobile).toContain('@media(max-height:620px)');
  });

  it('provides accessible collapsed tooltips, visible badges, and Support access', () => {
    expect(sidebar).toContain('<TooltipProvider');
    expect(sidebar).toContain('<TooltipTrigger asChild>');
    expect(sidebar).toContain('side={dir === \'rtl\' ? \'left\' : \'right\'}');
    expect(tooltip).toContain('<TooltipPrimitive.Portal>');
    expect(tooltip).toContain('portalled = false');
    expect(sidebar).toContain('portalled');
    expect(commandButton).toContain('forwardRef<HTMLButtonElement');
    expect(sidebar).toContain('.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-badge{position:absolute');
    expect(sidebar).toContain('aria-hidden="true"');
    expect(mobile).toContain('className="sfm-mobile-badge" aria-hidden="true"');
    expect(sidebar).toContain('.sfm-shared-sidebar[data-collapsed="true"] .sfm-shared-support-label');
    expect(sidebar).toContain('supportOpen || collapsed');
    expect(sidebar).not.toMatch(/data-collapsed="true"[\s\S]*?\.sfm-shared-badge[^}]*display\s*:\s*none/);
  });

  it('uses semantic premium surfaces and distinct hover, focus, active, and expanded states', () => {
    for (const source of [sidebar, mobile, commandButton]) {
      expect(source).toContain('var(--sidebar-hover)');
      expect(source).toContain('var(--focus-ring)');
      expect(source).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|linear-gradient\(|radial-gradient\(/i);
    }
    expect(sidebar).toContain('var(--sidebar-active)');
    expect(sidebar).toContain('var(--sidebar-expanded)');
    expect(sidebar).toContain('var(--duration-fast) var(--ease)');
    expect(sidebar).toContain('font-weight:var(--type-navigation-active-weight)');
  });

  it('preserves logical RTL/LTR geometry and removes continuous motion', () => {
    for (const source of [sidebar, mobile]) {
      expect(source).toContain('dir={dir}');
      expect(source).toContain('inset-inline-start');
      expect(source).toContain('border-inline-start');
      expect(source).toContain('@media(prefers-reduced-motion:reduce)');
      expect(source).not.toMatch(/animation[^;}]*infinite|\b(?:pulse|blink|shimmer)\b/i);
    }
    expect(sidebar).toContain('[dir="ltr"] .sfm-shared-group-toggle[aria-expanded="false"]');
    expect(mobile).toContain('[dir="ltr"] .sfm-mobile-group-toggle[aria-expanded="false"]');
  });
});

describe('Phase 3.3 mobile drawer semantics and performance', () => {
  it('uses links for destinations and buttons only for actions and disclosures', () => {
    expect(mobile).toContain('<Link {...sharedProps} href={item.href} onClick={onClose}>');
    expect(mobile).toContain('<a');
    expect(mobile).toContain("if (item.action === 'logout')");
    expect(mobile).not.toContain('router.push(item.href)');
  });

  it('retains focus trapping, Escape, body lock, route close, and close-before-command behavior', () => {
    expect(mobile).toContain("if (event.key === 'Escape')");
    expect(mobile).toContain("if (event.key !== 'Tab') return");
    expect(mobile).toContain("document.body.style.overflow = 'hidden'");
    expect(mobile).toContain('isVisibleFocusable(previouslyFocused)');
    expect(mobile).toContain('focusReturnTarget={() => document.querySelector<HTMLElement>');
    expect(commandMenu).toContain('isVisibleFocusTarget(focusOrigin)');
    expect(lazyCommandMenu).toContain('setRequest(current => current ??');
    expect(mobile).toContain("window.matchMedia('(min-width: 768px)')");
    expect(mobile).toContain('transition:visibility 0s linear var(--duration)');
  });

  it('keeps all drawer navigation targets at 44px and avoids duplicate mounted trees after hydration', () => {
    expect(mobile).toContain('min-height:var(--control-h)');
    expect(mobile).toContain('body.sfm-mobile-lock .sfm-language-option{min-height:var(--control-h)}');
    expect(appLayout).toContain('{!isMobile && (');
    expect(appLayout).toContain('<Sidebar />');
    expect(header).toContain('{mobileMenuMounted && <MobileMenu open={open}');
  });

  it('keeps reduced-motion and restrained destructive-state contracts', () => {
    expect(languageSwitcher).toContain('@media (prefers-reduced-motion: reduce)');
    expect(languageSwitcher).toContain('animation: none !important');
    expect(sidebar).toContain('.sfm-shared-item.danger:hover');
    expect(mobile).toContain('.sfm-mobile-nav-item.danger:hover');
  });
});
