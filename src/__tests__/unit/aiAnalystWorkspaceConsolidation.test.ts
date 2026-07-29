import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_ANALYST_NAVIGATION_GROUPS } from '@/components/ai-analyst/AiAnalystShell';
import { NAV_GROUPS, TRADER_TERMINAL_ROUTE_SCOPE } from '@/components/navigationConfig';
import { TR_NAV } from '@/lib/translations/nav';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8').replace(/\r\n?/g, '\n');

describe('AI Analyst workspace consolidation', () => {
  it('keeps exactly one global AI Analyst entry with the canonical route and localized labels', () => {
    const globalItems = NAV_GROUPS
      .filter(group => !group.routeScope)
      .flatMap(group => group.items);
    const analystEntries = globalItems.filter(item => item.id === 'ai-analyst');

    expect(analystEntries).toHaveLength(1);
    expect(analystEntries[0]).toMatchObject({
      id: 'ai-analyst',
      href: '/ai-analyst/overview',
      labelKey: 'nav_ai_analyst',
    });
    expect(TR_NAV.nav_ai_analyst).toEqual({
      ar: 'إس إف إم المحلل الذكي',
      en: 'SFM AI Analyst',
      fr: 'Analyste IA SFM',
    });
  });

  it('keeps terminal navigation route-scoped rather than as a second global product entry', () => {
    const scopedTerminalGroups = NAV_GROUPS.filter(group => group.routeScope === TRADER_TERMINAL_ROUTE_SCOPE);
    expect(scopedTerminalGroups.length).toBeGreaterThan(0);
    expect(NAV_GROUPS.filter(group => !group.routeScope)
      .flatMap(group => group.items)
      .filter(item => item.href?.startsWith('/thesfm-trader-own'))).toHaveLength(0);
  });

  it('exposes every canonical section through compact grouped workspace navigation', () => {
    expect(AI_ANALYST_NAVIGATION_GROUPS.map(group => group.key)).toEqual([
      'analysis', 'markets', 'monitoring', 'knowledge', 'configuration',
    ]);

    const routes = new Map(AI_ANALYST_NAVIGATION_GROUPS.flatMap(group => group.items.map(item => [item.key, item.href])));
    expect(Object.fromEntries(routes)).toMatchObject({
      overview: '/ai-analyst/overview',
      analysis: '/ai-analyst/analyze',
      compare: '/ai-analyst/compare',
      agent: '/ai-analyst/agent',
      path: '/ai-analyst/path',
      history: '/ai-analyst/history?view=history',
      future: '/ai-analyst/opportunities',
      marketLeadership: '/ai-analyst/market-leadership',
      markets: '/ai-analyst/markets',
      assetDetails: '/ai-analyst/analyze',
      marketSessions: '/ai-analyst/markets/sessions',
      marketMap: '/ai-analyst/markets?view=map',
      watchlist: '/ai-analyst/watchlist',
      portfolio: '/ai-analyst/portfolio',
      alerts: '/ai-analyst/alerts',
      recommendations: '/ai-analyst/recommendations',
      tradePerformance: '/ai-analyst/trade-performance',
      news: '/ai-analyst/news',
      calendar: '/ai-analyst/calendar',
      education: '/ai-analyst/education',
      settings: '/ai-analyst/settings',
    });
  });

  it('keeps public composition free of the terminal iframe and legacy directional engines', () => {
    const publicWorkspace = [
      source('src/components/ai-analyst/AiAnalystOverview.tsx'),
      source('src/components/ai-analyst/AiAnalystMarketSurfaces.tsx'),
      source('src/components/ai-analyst/AiAnalystPersonalSurfaces.tsx'),
    ].join('\n');

    expect(publicWorkspace).not.toMatch(/<iframe\b|TraderShellPage|thesfm-trader-own\/app/);
    expect(publicWorkspace).not.toMatch(/\/api\/recommendations\b|\/api\/market\/signals\b|recommendationEngine|signalEngine|scannerService/);
    expect(source('src/components/ai-analyst/AiAnalystPersonalSurfaces.tsx')).toContain('normalizeAiAnalystSymbol');
    expect(source('src/components/ai-analyst/AiAnalystOverview.tsx')).not.toContain('ProviderHealthPanel');
  });

  it('keeps first-paint provider commits streaming-safe so one workspace tree survives hydration', () => {
    // A synchronous client state update that lands while a route Suspense
    // boundary is still hydrating forces React to abandon hydration for that
    // boundary and client-render it instead; the late-arriving server
    // segment is then orphaned in the DOM, producing two
    // <main data-testid="ai-analyst-workspace"> elements (one per locale
    // direction) simultaneously.
    //
    // All six first-paint provider syncs need the guard, not a subset:
    // gating only locale + auth (on the theory that currency/density/mobile
    // are "lower stakes") measured the SAME reproduction rate as no guard at
    // all — the shared route Suspense boundary bails on whichever provider
    // happens to commit first while it's dehydrated, so any ungated one is
    // a full-strength weak link, not a partial one.
    //
    // Two other approaches did not hold up:
    // - A cookie mirror of the locale, read server-side so <html lang/dir>
    //   and the providers' initial state matched the visitor's actual
    //   preference from the first byte, removed the need for a correction
    //   in the common case — but reading a cookie in the root layout forces
    //   the entire app into dynamic rendering, which broke metadata
    //   streaming (the <meta name="description"> tag started landing in
    //   <body> instead of <head>, failing Lighthouse SEO).
    // - Gating all six independently (six separate DOMContentLoaded
    //   listeners and poll loops, each firing its own startTransition) is
    //   what caused the original Lighthouse TBT regression: six separate
    //   correction commits landing in quick succession is more work than
    //   one. commitWhenStreamSettled now shares a single subscription
    //   across every caller, so all six corrections fire together in one
    //   batch instead of six.
    for (const file of [
      'src/components/LanguageProvider.tsx',
      'src/components/PublicLanguageProvider.tsx',
      'src/lib/useCurrency.tsx',
      'src/hooks/useDensity.tsx',
      'src/hooks/use-mobile.tsx',
      'src/hooks/useAuth.tsx',
    ]) {
      const provider = source(file);
      expect(provider, `${file} must import startTransition`).toMatch(/\bstartTransition\b/);
      expect(provider, `${file} must defer its first-paint commit until the stream settles`)
        .toMatch(/\bcommitWhenStreamSettled\b/);
      expect(provider, `${file} must not set locale/preference state synchronously from its mount sync effect`)
        .not.toMatch(/useEffect\(\(\) => \{\n\s*set[A-Z]\w*State?\(read/);
    }
    const scheduler = source('src/lib/runtime/streamingHydration.ts');
    expect(scheduler, 'the scheduler must share one subscription across every caller instead of one per provider')
      .toMatch(/callbacks/);
    expect(scheduler).toContain('template[id^="B:"]');
    // DOMContentLoaded marks the closed HTML stream; the load event must not
    // be the gate because a slow image or beacon would freeze the commits.
    expect(scheduler).toContain("document.readyState !== 'loading'");
    expect(scheduler).not.toMatch(/addEventListener\('load'/);
    const layout = source('src/app/layout.tsx');
    expect(layout, 'root layout must stay a plain sync function — reading cookies() here forces dynamic rendering app-wide and breaks metadata streaming')
      .toMatch(/export default function RootLayout/);
    const shell = source('src/components/ai-analyst/AiAnalystShell.tsx');
    expect(shell.match(/data-testid="ai-analyst-workspace"/g)).toHaveLength(1);
  });

  it('uses sign-in gates for every personal workspace page instead of protecting the public shell', () => {
    for (const route of [
      'history', 'path', 'watchlist', 'portfolio', 'alerts', 'recommendations', 'trade-performance', 'settings',
    ]) {
      const file = source(`src/app/ai-analyst/${route}/page.tsx`);
      expect(file).toContain('AiAnalystAccessGate');
    }
    expect(source('src/middleware.ts')).not.toMatch(/['"]\/ai-analyst['"]/);
  });
});
