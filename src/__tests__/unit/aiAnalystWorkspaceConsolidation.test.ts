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
