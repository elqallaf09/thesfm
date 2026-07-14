import type { MarketTab } from './types';

export const MARKET_COMMAND_GROUP_IDS = [
  'overview',
  'analyze',
  'intelligence',
  'calendarSessions',
  'watchlistAlerts',
  'toolsReports',
] as const;

export type MarketCommandGroupId = (typeof MARKET_COMMAND_GROUP_IDS)[number];

export type MarketCommandGroupConfig = Readonly<{
  id: MarketCommandGroupId;
  labelKey: string;
  tabs: readonly MarketTab[];
  defaultTab: MarketTab;
}>;

export const MARKET_COMMAND_GROUPS = [
  {
    id: 'overview',
    labelKey: 'market_command_group_overview',
    tabs: ['overview'],
    defaultTab: 'overview',
  },
  {
    id: 'analyze',
    labelKey: 'market_command_group_analyze',
    tabs: ['analyze', 'comparison'],
    defaultTab: 'analyze',
  },
  {
    id: 'intelligence',
    labelKey: 'market_command_group_intelligence',
    tabs: ['technicalAnalysis', 'newsSentiment'],
    defaultTab: 'technicalAnalysis',
  },
  {
    id: 'calendarSessions',
    labelKey: 'market_command_group_calendar_sessions',
    tabs: ['economicCalendar', 'sessions'],
    defaultTab: 'economicCalendar',
  },
  {
    id: 'watchlistAlerts',
    labelKey: 'market_command_group_watchlist_alerts',
    tabs: ['watchlist', 'alerts'],
    defaultTab: 'watchlist',
  },
  {
    id: 'toolsReports',
    labelKey: 'market_command_group_tools_reports',
    tabs: ['traderTools', 'assetReport'],
    defaultTab: 'traderTools',
  },
] as const satisfies readonly MarketCommandGroupConfig[];

export const MARKET_COMMAND_TAB_LABEL_KEYS = {
  overview: 'market_command_group_overview',
  analyze: 'market_analysis_tab',
  comparison: 'market_compare_assets',
  technicalAnalysis: 'market_daily_technical_analysis',
  newsSentiment: 'market_news_sentiment',
  economicCalendar: 'market_economic_calendar',
  sessions: 'market_trading_sessions',
  watchlist: 'market_watchlist',
  alerts: 'market_price_alerts',
  traderTools: 'market_trader_tools',
  assetReport: 'market_ai_asset_report',
} as const satisfies Readonly<Record<MarketTab, string>>;

export const MARKET_COMMAND_GROUP_DEFAULTS = {
  overview: 'overview',
  analyze: 'analyze',
  intelligence: 'technicalAnalysis',
  calendarSessions: 'economicCalendar',
  watchlistAlerts: 'watchlist',
  toolsReports: 'traderTools',
} as const satisfies Readonly<Record<MarketCommandGroupId, MarketTab>>;

export const MARKET_TAB_TO_COMMAND_GROUP = {
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
} as const satisfies Readonly<Record<MarketTab, MarketCommandGroupId>>;

export function marketCommandGroupForTab(tab: MarketTab): MarketCommandGroupId {
  return MARKET_TAB_TO_COMMAND_GROUP[tab];
}

export function marketCommandDefaultTab(groupId: MarketCommandGroupId): MarketTab {
  return MARKET_COMMAND_GROUP_DEFAULTS[groupId];
}

export function marketCommandGroupConfig(groupId: MarketCommandGroupId): MarketCommandGroupConfig {
  return MARKET_COMMAND_GROUPS.find(group => group.id === groupId) ?? MARKET_COMMAND_GROUPS[0];
}

export function isMarketCommandGroupId(value: unknown): value is MarketCommandGroupId {
  return typeof value === 'string' && MARKET_COMMAND_GROUP_IDS.includes(value as MarketCommandGroupId);
}

function safeMarketCommandIdPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'market-command';
}

export function marketCommandGroupTriggerId(idBase: string, groupId: MarketCommandGroupId) {
  return `${safeMarketCommandIdPart(idBase)}-group-${groupId}-trigger`;
}

export function marketCommandContentId(idBase: string) {
  return `${safeMarketCommandIdPart(idBase)}-content`;
}
