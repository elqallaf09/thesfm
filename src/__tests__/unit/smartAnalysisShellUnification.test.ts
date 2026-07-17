import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NAV_GROUPS,
  TRADER_TERMINAL_ROUTE_SCOPE,
  flattenNavigationItems,
  normalizeNavigationSource,
} from '@/components/navigationConfig';
import {
  filterGroupsForRoute,
  filterGroupsForWorkspace,
  workspaceOwningNavGroup,
} from '@/config/workspaces/workspace-navigation';
import { findSelectedNavigationItemId } from '@/lib/navigation/workspaceNavigationState';
import {
  TRADER_PUBLIC_BASE_PATH,
  TRADER_ROUTE_CHANGE_MESSAGE_TYPE,
  TRADER_ROUTE_MESSAGE_VERSION,
  TRADER_ROUTE_SET_MESSAGE_TYPE,
  createTraderRouteSetMessage,
  isTraderRouteChangeMessage,
  publicPathFromTraderAppRoute,
  traderAppRouteFromPublicPath,
} from '@/lib/trader/routeBridge';
import { TR } from '@/lib/translations';

const root = process.cwd();
const shellPageSource = readFileSync(resolve(root, 'src/app/thesfm-trader-own/TraderShellPage.tsx'), 'utf8');
const traderLayoutSource = readFileSync(resolve(root, 'src/app/thesfm-trader-own/layout.tsx'), 'utf8');
const sidebarSource = readFileSync(resolve(root, 'src/components/Sidebar.tsx'), 'utf8');
const mobileMenuSource = readFileSync(resolve(root, 'src/components/MobileMenu.tsx'), 'utf8');
const terminalHtmlSource = readFileSync(resolve(root, 'src/trader-app/public/index.html'), 'utf8');
const terminalCssSource = readFileSync(resolve(root, 'src/trader-app/public/cinema.css'), 'utf8');
const terminalAppSource = readFileSync(resolve(root, 'src/trader-app/public/app.js'), 'utf8');

const traderGroups = NAV_GROUPS.filter(group => group.routeScope === TRADER_TERMINAL_ROUTE_SCOPE);
const traderItems = traderGroups.flatMap(group => group.items);

// Every terminal view the SPA router knows about must stay reachable from
// the shared sidebar (routes preserved — SPA `routes` map in app.js).
const TERMINAL_ROUTE_IDS = [
  'dashboard', 'markets', 'ai-scanner', 'symbol-details',
  'watchlist', 'portfolio', 'alerts', 'recommendations', 'trade-performance',
  'news', 'calendar', 'education', 'settings',
];

describe('Smart Analysis navigation joins the shared shell sidebar', () => {
  it('defines the three terminal groups as route-scoped markets-trading navigation', () => {
    expect(traderGroups.map(group => group.id)).toEqual(['trader-trading', 'trader-follow', 'trader-more']);
    for (const group of traderGroups) {
      expect(workspaceOwningNavGroup(group.id)).toBe('markets-trading');
    }
  });

  it('keeps every terminal route reachable with a unique shared-sidebar item', () => {
    const hrefs = traderItems.map(item => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const routeId of TERMINAL_ROUTE_IDS) {
      expect(hrefs).toContain(`${TRADER_TERMINAL_ROUTE_SCOPE}/${routeId}`);
    }
    for (const item of traderItems) {
      expect(item.icon, item.id).toBeTruthy();
    }
  });

  it('translates every terminal group and item label in ar, en, and fr', () => {
    const labelKeys = [
      ...traderGroups.map(group => group.labelKey),
      ...traderItems.map(item => item.labelKey),
    ];
    for (const key of labelKeys) {
      const entry = TR[key];
      expect(entry, key).toBeTruthy();
      for (const lang of ['ar', 'en', 'fr'] as const) {
        expect(entry[lang], `${key}.${lang}`).toBeTruthy();
      }
    }
  });

  it('shows terminal groups only inside the terminal, replacing sibling groups there', () => {
    const marketsGroups = filterGroupsForWorkspace([...NAV_GROUPS], 'markets-trading');

    const insideTerminal = filterGroupsForRoute(marketsGroups, '/thesfm-trader-own/markets');
    const insideIds = insideTerminal.map(group => group.id);
    expect(insideIds).toEqual(['trader-trading', 'trader-follow', 'trader-more', 'account']);

    const outsideTerminal = filterGroupsForRoute(marketsGroups, '/market-analysis');
    const outsideIds = outsideTerminal.map(group => group.id);
    expect(outsideIds).not.toContain('trader-trading');
    expect(outsideIds).toContain('investment-market');
    expect(outsideIds).toContain('account');
  });

  it('resolves the active sidebar item for terminal routes, including deep links', () => {
    const cases: Array<[string, string]> = [
      ['/thesfm-trader-own/dashboard', 'trader-dashboard'],
      ['/thesfm-trader-own/markets', 'trader-markets'],
      ['/thesfm-trader-own/markets/kuwait', 'trader-markets'],
      ['/thesfm-trader-own/ai-scanner', 'trader-ai-scanner'],
      ['/thesfm-trader-own/symbol-details/AAPL', 'trader-symbol-details'],
      ['/thesfm-trader-own/watchlist', 'trader-watchlist'],
      ['/thesfm-trader-own/portfolio', 'trader-portfolio'],
      ['/thesfm-trader-own/alerts', 'trader-alerts'],
      ['/thesfm-trader-own/recommendations', 'trader-recommendations'],
      ['/thesfm-trader-own/trade-performance', 'trader-trade-performance'],
      ['/thesfm-trader-own/news', 'trader-news'],
      ['/thesfm-trader-own/calendar', 'trader-calendar'],
      ['/thesfm-trader-own/education', 'trader-education'],
      ['/thesfm-trader-own/settings?view=issues', 'trader-settings'],
    ];
    for (const [source, expected] of cases) {
      const [pathname, search = ''] = source.split('?');
      const active = normalizeNavigationSource(pathname, '', search);
      expect(findSelectedNavigationItemId(active, traderGroups), source).toBe(expected);
    }
  });

  it('applies the route scope in both the desktop sidebar and the mobile drawer', () => {
    for (const source of [sidebarSource, mobileMenuSource]) {
      expect(source).toContain('filterGroupsForRoute(');
      expect(source).toContain('pathname,');
    }
  });

  it('keeps terminal routes out of global navigation surfaces', () => {
    const globalIds = new Set(flattenNavigationItems().map(item => item.id));
    for (const item of traderItems) {
      expect(globalIds.has(item.id), item.id).toBe(false);
    }
    expect(flattenNavigationItems({ includeRouteScoped: true }).map(item => item.id))
      .toContain('trader-dashboard');
  });
});

describe('Embedded terminal removes its duplicate navigation column', () => {
  it('stamps data-embedded before paint so there is no sidebar flash', () => {
    expect(terminalHtmlSource).toContain('document.documentElement.dataset.embedded');
    const stampIndex = terminalHtmlSource.indexOf('dataset.embedded');
    const cssIndex = terminalHtmlSource.indexOf('href="/cinema.css');
    expect(stampIndex).toBeGreaterThan(-1);
    expect(cssIndex).toBeGreaterThan(-1);
    expect(stampIndex).toBeLessThan(cssIndex);
  });

  it('hides only the terminal sidebar in embedded mode and keeps the mobile tab bar', () => {
    const layerIndex = terminalCssSource.indexOf('sfm-embedded-shell-layer');
    expect(layerIndex).toBeGreaterThan(-1);
    const layer = terminalCssSource.slice(layerIndex);
    expect(layer).toContain('html[data-embedded="true"] .terminal-sidebar');
    expect(layer).toContain('display: none');
    expect(layer).toContain('html[data-embedded="true"] .terminal-app');
    expect(layer).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(layer).not.toContain('.mobile-nav');
    // The layer must stay color-free: theme parity comes from semantic tokens.
    expect(layer).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  });

  it('keeps the standalone terminal sidebar untouched outside the shell', () => {
    // The only rules that hide the terminal sidebar are the embedded ones.
    const hideRules = terminalCssSource.match(/[^\n{}]*\.terminal-sidebar[^\n{}]*\{\s*display:\s*none/g) ?? [];
    expect(hideRules.length).toBeGreaterThan(0);
    for (const rule of hideRules) {
      expect(rule).toContain('html[data-embedded="true"]');
    }
    expect(terminalHtmlSource).toContain('class="terminal-sidebar"');
    expect(terminalHtmlSource).toContain('class="mobile-nav"');
  });
});

describe('Route bridge keeps the shell URL and the terminal in lock-step', () => {
  it('maps public paths to app routes and back', () => {
    expect(traderAppRouteFromPublicPath('/thesfm-trader-own')).toBe('home');
    expect(traderAppRouteFromPublicPath('/thesfm-trader-own/markets/kuwait')).toBe('markets/kuwait');
    expect(traderAppRouteFromPublicPath('/thesfm-trader-own/symbol-details/EURUSD%3DX')).toBe('symbol-details/EURUSD%3DX');
    expect(traderAppRouteFromPublicPath('/dashboard')).toBe('home');
    expect(publicPathFromTraderAppRoute('home')).toBe('/thesfm-trader-own/dashboard');
    expect(publicPathFromTraderAppRoute('markets/kuwait')).toBe('/thesfm-trader-own/markets/kuwait');
  });

  it('rejects unsafe route-change messages', () => {
    const valid = {
      type: TRADER_ROUTE_CHANGE_MESSAGE_TYPE,
      version: TRADER_ROUTE_MESSAGE_VERSION,
      path: '/thesfm-trader-own/markets/kuwait',
    };
    expect(isTraderRouteChangeMessage(valid)).toBe(true);
    expect(isTraderRouteChangeMessage({ ...valid, path: '/thesfm-trader-own/settings?view=issues' })).toBe(true);
    for (const value of [
      null,
      { ...valid, version: 2 },
      { ...valid, path: '/dashboard' },
      { ...valid, path: 'https://evil.example/thesfm-trader-own' },
      { ...valid, path: '/thesfm-trader-own/../profile' },
      { ...valid, extra: true },
      { type: TRADER_ROUTE_SET_MESSAGE_TYPE, version: 1, route: 'markets' },
    ]) {
      expect(isTraderRouteChangeMessage(value)).toBe(false);
    }
  });

  it('shares one versioned message contract between the shell and the terminal', () => {
    expect(createTraderRouteSetMessage('markets')).toEqual({
      type: 'SFM_TRADER_ROUTE_SET',
      version: 1,
      route: 'markets',
    });
    expect(terminalAppSource).toContain('const ROUTE_SET_MESSAGE_TYPE = "SFM_TRADER_ROUTE_SET"');
    expect(terminalAppSource).toContain('const ROUTE_CHANGE_MESSAGE_TYPE = "SFM_TRADER_ROUTE_CHANGE"');
    expect(terminalAppSource).toContain('const ROUTE_MESSAGE_VERSION = 1');
  });

  it('validates origin and source on both sides and never broadcasts', () => {
    expect(shellPageSource).toContain('event.origin !== window.location.origin || event.source !== traderWindow');
    expect(terminalAppSource).toContain('event.origin !== window.location.origin || event.source !== window.parent');
    for (const source of [shellPageSource, terminalAppSource]) {
      expect(source).not.toMatch(/postMessage\([^)]*,\s*['"]\*['"]\s*\)/);
    }
  });

  it('keeps the iframe persistent in the segment layout with URL-anchor pages', () => {
    expect(traderLayoutSource).toContain('<TraderShellPage />');
    expect(traderLayoutSource).toContain('{children}');
    expect(traderLayoutSource).toContain('const access = await getTraderAccess()');
    expect(shellPageSource).toContain('const [initialSrc] = useState');
    // Internal navigation must not reload the frame: the parent pushes the
    // route as a message, never as a new src.
    expect(shellPageSource).not.toMatch(/src=\{`[^`]*\$\{pathname/);
    expect(terminalAppSource).toContain('postRouteChangeToHost(href)');

    const dashboardPage = readFileSync(resolve(root, 'src/app/thesfm-trader-own/dashboard/page.tsx'), 'utf8');
    expect(dashboardPage).toContain('return null');
    expect(dashboardPage).not.toContain('TraderOwnFrame');
  });
});

describe('Smart Analysis stage matches the shell in both themes and all widths', () => {
  it('sizes the stage from shared shell tokens with no hardcoded colors', () => {
    expect(shellPageSource).toContain('var(--app-header-height)');
    expect(shellPageSource).toContain('var(--workspace-page-padding-block');
    expect(shellPageSource).toContain('var(--border)');
    expect(shellPageSource).toContain('var(--background)');
    expect(shellPageSource).toContain('var(--radius-panel)');
    const styleBlock = shellPageSource.slice(shellPageSource.indexOf('<style>'));
    expect(styleBlock).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(styleBlock).not.toMatch(/position:\s*fixed|100vw/);
  });

  it('keeps the shared sidebar sticky below the global header with internal scrolling', () => {
    expect(sidebarSource).toContain('position:sticky');
    expect(sidebarSource).toContain('var(--app-header-height)');
    expect(sidebarSource).toContain('overflow-y:auto');
  });

  it('loads the shared semantic tokens inside the terminal for theme parity', () => {
    expect(terminalHtmlSource).toContain('semantic-tokens.css');
    expect(terminalHtmlSource).toContain('dataset.embedded');
  });
});
