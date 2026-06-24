import type { MarketTab, TraderToolsSubTab } from './types';

export type AnalysisToolConfig = {
  id: string;
  requiresAsset: boolean;
  requiresMarketData: boolean;
  requiresAccountBalance: boolean;
  requiresMonthlyIncome: boolean;
};

export const TRADER_TOOL_REQUIREMENTS: Record<TraderToolsSubTab, AnalysisToolConfig> = {
  risk: {
    id: 'positionSizeCalculator',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: true,
    requiresMonthlyIncome: false,
  },
  pips: {
    id: 'pipValueCalculator',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: true,
    requiresMonthlyIncome: false,
  },
  lot: {
    id: 'lotSizeByRiskCalculator',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: true,
    requiresMonthlyIncome: false,
  },
  margin: {
    id: 'marginCalculator',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: true,
    requiresMonthlyIncome: false,
  },
  performance: {
    id: 'assetPerformance',
    requiresAsset: false,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
};

export const MARKET_TAB_REQUIREMENTS: Record<MarketTab, AnalysisToolConfig> = {
  analyze: {
    id: 'marketAnalysis',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  traderTools: TRADER_TOOL_REQUIREMENTS.risk,
  economicCalendar: {
    id: 'economicCalendar',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  sessions: {
    id: 'tradingSessions',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  technicalAnalysis: {
    id: 'technicalAnalysis',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  newsSentiment: {
    id: 'newsSentiment',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  watchlist: {
    id: 'watchlist',
    requiresAsset: false,
    requiresMarketData: false,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  alerts: {
    id: 'priceAlerts',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  comparison: {
    id: 'assetComparison',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
  assetReport: {
    id: 'assetReport',
    requiresAsset: true,
    requiresMarketData: true,
    requiresAccountBalance: false,
    requiresMonthlyIncome: false,
  },
};

export function getMarketToolRequirements(tab: MarketTab, traderSubTab: TraderToolsSubTab = 'risk'): AnalysisToolConfig {
  if (tab === 'traderTools') {
    return TRADER_TOOL_REQUIREMENTS[traderSubTab] ?? TRADER_TOOL_REQUIREMENTS.risk;
  }

  return MARKET_TAB_REQUIREMENTS[tab];
}
