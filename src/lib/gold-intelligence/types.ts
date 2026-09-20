export type GoldHorizon = '24h' | '7d' | '1m' | '3m' | '6m' | '12m';
export type GoldScenarioId = 'base' | 'bull' | 'bear' | 'tail';
export type GoldDriverId = 'usd' | 'real_yields' | 'risk_events' | 'momentum' | 'nominal_rates' | 'oil' | 'etf_proxy' | 'macro_policy';
export type GoldDataQuality = 'live' | 'cached' | 'stale' | 'unavailable';

export type GoldDriver = {
  id: GoldDriverId;
  label: string;
  labelAr: string;
  weight: number;
  score: number | null;
  available: boolean;
  value: number | null;
  unit: string | null;
  change: number | null;
  source: string | null;
  asOf: string | null;
  quality: GoldDataQuality;
  explanation: string;
  explanationAr: string;
};

export type GoldEventSignal = {
  id: string;
  title: string;
  source: string;
  url: string | null;
  publishedAt: string;
  eventType: string;
  verificationStatus: string;
  expectedImpact: string;
  bias: number;
  confidence: number;
  rationale: string;
  rationaleAr: string;
};

export type GoldCalendarRisk = {
  id: string;
  title: string;
  dateTimeUtc: string;
  impact: string;
  country: string | null;
  currency: string | null;
  source: string | null;
  stale: boolean;
};

export type GoldScenario = {
  id: GoldScenarioId;
  probability: number;
  low: number | null;
  high: number | null;
  midpoint: number | null;
  thesis: string;
  thesisAr: string;
  invalidation: string;
  invalidationAr: string;
};

export type GoldHorizonForecast = {
  horizon: GoldHorizon;
  days: number;
  scenarios: GoldScenario[];
};

export type GoldSourceStatus = {
  quotes: GoldDataQuality;
  macro: GoldDataQuality;
  realYields: GoldDataQuality;
  news: GoldDataQuality;
  calendar: GoldDataQuality;
};

export type GoldScenarioSnapshot = {
  engine: 'SFM Gold Scenario Engine';
  engineVersion: '1.0.0' | '1.1.0';
  methodology: 'explainable-quant-v1';
  status: 'available' | 'partial';
  generatedAt: string;
  spot: {
    symbol: 'XAUUSD';
    price: number;
    currency: string;
    changePercent: number | null;
    source: string;
    asOf: string | null;
  };
  factorScore: number;
  confidence: number;
  dataCoverage: number;
  annualizedVolatility: number | null;
  drivers: GoldDriver[];
  horizons: GoldHorizonForecast[];
  events: GoldEventSignal[];
  upcomingEvents: GoldCalendarRisk[];
  sourceStatus: GoldSourceStatus;
  warnings: string[];
  advanced?: import('./advancedTypes').GoldAdvancedAnalysis;
};

export type GoldWhatIfShocks = {
  dollarPct: number;
  oilPct: number;
  realYieldBps: number;
  geopoliticalRisk: number;
  centralBankDemand: number;
};

export type GoldWhatIfRequest = {
  horizon?: GoldHorizon;
  shocks?: Partial<GoldWhatIfShocks>;
};

export type GoldWhatIfResult = {
  horizon: GoldHorizon;
  shocks: GoldWhatIfShocks;
  baselineFactorScore: number;
  simulatedFactorScore: number;
  factorDelta: number;
  forecast: GoldHorizonForecast;
};

export type GoldModelInput = {
  price: number;
  annualizedVolatility: number | null;
  drivers: GoldDriver[];
  eventRisk: number;
  upcomingHighImpactCount: number;
};
