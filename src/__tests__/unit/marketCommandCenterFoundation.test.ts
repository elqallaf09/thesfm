import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  MARKET_COMMAND_GROUP_DEFAULTS,
  MARKET_COMMAND_GROUP_IDS,
  MARKET_COMMAND_GROUPS,
  MARKET_COMMAND_TAB_LABEL_KEYS,
  MARKET_TAB_TO_COMMAND_GROUP,
  marketCommandDefaultTab,
  marketCommandGroupConfig,
  marketCommandGroupForTab,
} from '@/components/market-analysis/marketCommandCenter';
import { resolveMarketCommandDataHealth } from '@/components/market-analysis/marketCommandDataHealth';
import type { MarketTab } from '@/components/market-analysis/types';
import type { MarketSystemState } from '@/lib/market-state/types';
import { TR_MARKET } from '@/lib/translations/market';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8').replace(/\r\n?/g, '\n');

const expectedGroups = [
  'overview',
  'analyze',
  'intelligence',
  'calendarSessions',
  'watchlistAlerts',
  'toolsReports',
] as const;

const expectedTabs = [
  'overview',
  'analyze',
  'comparison',
  'technicalAnalysis',
  'newsSentiment',
  'economicCalendar',
  'sessions',
  'watchlist',
  'alerts',
  'traderTools',
  'assetReport',
] as const satisfies readonly MarketTab[];

const expectedDefaults = {
  overview: 'overview',
  analyze: 'analyze',
  intelligence: 'technicalAnalysis',
  calendarSessions: 'economicCalendar',
  watchlistAlerts: 'watchlist',
  toolsReports: 'traderTools',
} as const;

const expectedGroupByTab = {
  overview: 'overview',
  analyze: 'analyze',
  comparison: 'analyze',
  technicalAnalysis: 'intelligence',
  newsSentiment: 'intelligence',
  economicCalendar: 'calendarSessions',
  sessions: 'calendarSessions',
  watchlist: 'watchlistAlerts',
  alerts: 'watchlistAlerts',
  traderTools: 'toolsReports',
  assetReport: 'toolsReports',
} as const;

const synchronizedAt = '2026-07-15T08:00:00.000Z';

function connectedMarketSystem(overrides: Partial<MarketSystemState> = {}): MarketSystemState {
  return {
    generatedAt: synchronizedAt,
    overall: 'connected',
    providers: {
      fmp: {
        status: 'connected',
        configured: true,
        healthy: true,
        latencyMs: 42,
      },
    },
    capabilityMatrix: [],
    providerProfiles: [{
      provider: 'fmp',
      role: 'primary',
      status: 'connected',
      configured: true,
      latencyMs: 42,
      successRatePercent: 100,
      lastSuccessAt: synchronizedAt,
      lastErrorAt: null,
      rateLimitedUntil: null,
    }],
    configuration: null,
    featuresSucceeded: ['quotes'],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: {
      discovered: 0,
      metadataAvailable: 0,
      liveQuoteAvailable: null,
      delayedQuoteAvailable: null,
      staleRecords: 0,
      duplicates: 0,
      malformed: 0,
      failed: 0,
      lastSyncAt: synchronizedAt,
    },
    lastSynchronizedAt: synchronizedAt,
    delivery: {
      source: 'live',
      cached: false,
      delayed: false,
      reason: null,
    },
    ...overrides,
  };
}

describe('market command center navigation foundation', () => {
  it('defines exactly six command groups and assigns every MarketTab exactly once', () => {
    expect(MARKET_COMMAND_GROUP_IDS).toEqual(expectedGroups);
    expect(MARKET_COMMAND_GROUPS).toHaveLength(6);
    expect(MARKET_COMMAND_GROUPS.map(group => group.id)).toEqual(expectedGroups);

    const assignedTabs = MARKET_COMMAND_GROUPS.flatMap(group => [...group.tabs]);
    expect(assignedTabs).toHaveLength(expectedTabs.length);
    expect(new Set(assignedTabs).size).toBe(expectedTabs.length);
    expect([...assignedTabs].sort()).toEqual([...expectedTabs].sort());
    expect(Object.keys(MARKET_COMMAND_TAB_LABEL_KEYS).sort()).toEqual([...expectedTabs].sort());
  });

  it('keeps defaults and tab-to-group mappings complete and internally consistent', () => {
    expect(MARKET_COMMAND_GROUP_DEFAULTS).toEqual(expectedDefaults);
    expect(MARKET_TAB_TO_COMMAND_GROUP).toEqual(expectedGroupByTab);

    for (const group of MARKET_COMMAND_GROUPS) {
      expect(group.tabs).toContain(group.defaultTab);
      expect(marketCommandDefaultTab(group.id)).toBe(expectedDefaults[group.id]);
      expect(marketCommandGroupConfig(group.id)).toBe(group);
    }

    for (const tab of expectedTabs) {
      const expectedGroup = expectedGroupByTab[tab];
      expect(marketCommandGroupForTab(tab)).toBe(expectedGroup);
      expect(marketCommandGroupConfig(expectedGroup).tabs).toContain(tab);
    }
  });
});

describe('market command center data-health resolver', () => {
  const resolve = (
    system: MarketSystemState | null,
    options: Partial<{ isLoading: boolean; hasRequestError: boolean; isStale: boolean }> = {},
  ) => resolveMarketCommandDataHealth({
    system,
    isLoading: false,
    hasRequestError: false,
    isStale: false,
    ...options,
  });

  it('prioritizes loading and distinguishes ready from stale data', () => {
    expect(resolve(null, { isLoading: true, hasRequestError: true, isStale: true })).toBe('loading');
    expect(resolve(connectedMarketSystem())).toBe('ready');
    expect(resolve(connectedMarketSystem(), { isStale: true })).toBe('stale');
  });

  it('distinguishes unavailable, provider-error, and configuration-required boundaries', () => {
    expect(resolve(null)).toBe('unavailable');
    expect(resolve(null, { hasRequestError: true })).toBe('providerError');
    expect(resolve(connectedMarketSystem({ overall: 'disconnected' }))).toBe('providerError');
    expect(resolve(connectedMarketSystem({ overall: 'misconfigured' }))).toBe('configurationRequired');
    expect(resolve(connectedMarketSystem({
      providerProfiles: connectedMarketSystem().providerProfiles.map(provider => ({
        ...provider,
        configured: false,
      })),
    }))).toBe('configurationRequired');

    for (const overall of ['disabled', 'unsupported', 'unknown'] as const) {
      expect(resolve(connectedMarketSystem({ overall }))).toBe('unavailable');
    }
    expect(resolve(connectedMarketSystem({ lastSynchronizedAt: null }))).toBe('unavailable');
    expect(resolve(connectedMarketSystem({
      delivery: { source: 'unavailable', cached: false, delayed: false, reason: 'safe reason' },
    }))).toBe('unavailable');
  });

  it('classifies every degraded delivery boundary as partial before considering staleness', () => {
    const partialSystems: MarketSystemState[] = [
      connectedMarketSystem({ overall: 'degraded' }),
      connectedMarketSystem({ overall: 'rate_limited' }),
      connectedMarketSystem({ featuresDegraded: ['news'] }),
      connectedMarketSystem({ featuresFailed: ['technical_data'] }),
      connectedMarketSystem({
        delivery: { source: 'persistent_cache', cached: true, delayed: false, reason: null },
      }),
      connectedMarketSystem({
        delivery: { source: 'live', cached: false, delayed: true, reason: null },
      }),
    ];

    for (const system of partialSystems) {
      expect(resolve(system, { isStale: true })).toBe('partial');
    }
  });
});

describe('market command center translation contract', () => {
  it('keeps the approved command-center titles exact in Arabic, English, and French', () => {
    expect(TR_MARKET.market_command_center_title).toEqual({
      ar: 'مركز قيادة الأسواق',
      en: 'Market Command Center',
      fr: 'Centre de commande des marchés',
    });
    expect(TR_MARKET.market_command_bar_title).toEqual({
      ar: 'حلّل أصلًا',
      en: 'Analyze an asset',
      fr: 'Analyser un actif',
    });
    expect(TR_MARKET.market_command_overview_title).toEqual({
      ar: 'لوحة نظرة عامة',
      en: 'Command overview',
      fr: 'Vue d’ensemble',
    });
  });

  it('provides non-empty Arabic, English, and French text for every command-center key', () => {
    const commandEntries = Object.entries(TR_MARKET).filter(([key]) => key.startsWith('market_command_'));
    expect(commandEntries.length).toBeGreaterThan(30);

    for (const [key, entry] of commandEntries) {
      for (const lang of ['ar', 'en', 'fr'] as const) {
        expect(entry[lang], `${key}.${lang}`).toEqual(expect.any(String));
        expect(entry[lang]?.trim().length, `${key}.${lang}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('market command center presentation and loading contracts', () => {
  const overviewSource = read('src/components/market-analysis/MarketOverviewPanel.tsx');
  const pageSource = read('src/app/market-analysis/page.tsx');

  it('keeps overview data caller-owned and never fabricates or fetches presentation values', () => {
    expect(overviewSource).toMatch(/state:\s*'available';\s*count:\s*number;/);
    expect(overviewSource).toMatch(/state:\s*'not-loaded'\s*\|\s*'unavailable';\s*message:\s*string;/);
    expect(overviewSource).toContain('watchlist: MarketOverviewCountPresentation;');
    expect(overviewSource).toContain('alerts: MarketOverviewCountPresentation;');
    expect(overviewSource).toContain('upcomingEvents: MarketOverviewCountPresentation;');
    expect(overviewSource).toContain('news: MarketOverviewCountPresentation;');
    expect(overviewSource).not.toMatch(/\bfetch\s*\(|\baxios\b|\bsupabase\b|MarketSystemStateProvider/i);
    expect(overviewSource).not.toMatch(/\b(?:demo|example|mock|sample|fixture|fake)(?:Data)?\b/i);
  });

  it('keeps heavy panels dynamically imported and conditionally mounted by active tab', () => {
    const lazyPanels = {
      traderTools: 'TraderToolsDashboard',
      economicCalendar: 'EconomicCalendarPanel',
      sessions: 'TradingSessionsPanel',
      technicalAnalysis: 'TechnicalAnalysisPanel',
      newsSentiment: 'NewsSentimentPanel',
    } as const;

    for (const [tab, component] of Object.entries(lazyPanels)) {
      expect(pageSource).toMatch(new RegExp(`const\\s+${component}\\s*=\\s*dynamic\\s*\\(`));
      expect(pageSource).toMatch(
        new RegExp(`activeTab\\s*===\\s*['\"]${tab}['\"][\\s\\S]{0,300}<${component}\\b`),
      );
    }
  });

  it('does not request comparison data before the comparison tab becomes active', () => {
    const activeTabGate = pageSource.indexOf("if (activeTab !== 'comparison' || comparisonLoadedRef.current) return;");
    const comparisonRequest = pageSource.indexOf("'/api/market/compare?", activeTabGate);

    expect(activeTabGate).toBeGreaterThan(-1);
    expect(comparisonRequest).toBeGreaterThan(activeTabGate);
    expect(comparisonRequest - activeTabGate).toBeLessThan(800);
  });
});

describe('market command center shell and visual-system boundaries', () => {
  const componentFiles = [
    'MarketCommandBar.tsx',
    'MarketCommandCenterHeader.tsx',
    'MarketCommandCenterStatus.tsx',
    'MarketCommandNavigation.tsx',
    'MarketOverviewPanel.tsx',
    'MarketStatusStrip.tsx',
  ];
  const styleFiles = [
    'MarketCommandBar.module.css',
    'MarketCommandCenterHeader.module.css',
    'MarketCommandNavigation.module.css',
    'MarketOverviewPanel.module.css',
    'MarketStatusStrip.module.css',
  ];
  const components = componentFiles
    .map(file => read(`src/components/market-analysis/${file}`))
    .join('\n');
  const styles = styleFiles
    .map(file => read(`src/components/market-analysis/${file}`))
    .join('\n');

  it('does not duplicate global application controls in command-center components', () => {
    expect(components).not.toMatch(
      /\b(?:WorkspaceSwitcher|LanguageSwitcher|ThemeToggle|AppHeader|Sidebar|MobileMenu)\b/,
    );
    expect(components).not.toMatch(/<\s*(?:WorkspaceSwitcher|LanguageSwitcher|ThemeToggle)\b/);
    expect(components).not.toMatch(/\b(?:Basic View|Advanced View)\b|localStorage/);
  });

  it('uses shared semantic color and font tokens without a local palette or font stack', () => {
    expect(styles).toContain('font-family: var(--font-ui)');
    expect(styles).toContain('font-family: var(--font-data)');
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    expect(styles).not.toMatch(/\b(?:Tajawal|Cairo|Inter|Arial|Tahoma|Aptos|monospace)\b/i);

    const fontFamilies = [...styles.matchAll(/font-family:\s*([^;]+);/g)].map(match => match[1].trim());
    expect(fontFamilies.length).toBeGreaterThan(0);
    for (const fontFamily of fontFamilies) {
      expect(['var(--font-ui)', 'var(--font-data)']).toContain(fontFamily);
    }
  });

  it('reserves the data font for symbols, counts, and financial values', () => {
    const dataFontBlocks = [...styles.matchAll(/([^{}]+)\{([^{}]*font-family:\s*var\(--font-data\)[^{}]*)\}/g)];
    expect(dataFontBlocks.length).toBeGreaterThan(0);

    for (const [, selector] of dataFontBlocks) {
      expect(selector).toMatch(
        /resultMain\s+em|ticker|dataValue|countValue/,
      );
    }

    expect(styles).not.toMatch(/(?:sessionTime|timestamp\s+time)[^{]*\{[^}]*font-family:\s*var\(--font-data\)/);
  });
});
