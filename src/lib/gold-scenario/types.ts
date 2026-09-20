export type GoldScenarioHorizon = '24H' | '7D' | '1M' | '3M' | '6M' | '12M';

export type GoldDriverDirection = 'bullish' | 'bearish' | 'neutral' | 'unknown';

export type GoldScenarioDriver = {
  id: string;
  label: string;
  labelAr: string;
  category: 'gold' | 'currency' | 'rates' | 'inflation' | 'energy' | 'risk' | 'macro' | 'cross_asset' | 'event';
  direction: GoldDriverDirection;
  contribution: number;
  weight: number;
  available: boolean;
  value: number | string | null;
  changePercent?: number | null;
  source: string | null;
  asOf: string | null;
  rationale: string;
  rationaleAr: string;
};

export type GoldScenarioEvent = {
  id: string;
  title: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string | null;
  eventType: string;
  verificationStatus: string;
  expectedImpact: string;
  direction: GoldDriverDirection;
  contribution: number;
  whyItMatters: string;
  whyItMattersAr: string;
};

export type GoldScenarioRange = {
  low: number;
  midpoint: number;
  high: number;
};

export type GoldScenario = {
  id: 'base' | 'bull' | 'bear' | 'tail-risk';
  label: string;
  labelAr: string;
  probability: number;
  thesis: string;
  thesisAr: string;
  invalidation: string[];
  invalidationAr: string[];
  ranges: Record<GoldScenarioHorizon, GoldScenarioRange>;
};

export type GoldScenarioDataQuality = {
  score: number;
  level: 'high' | 'medium' | 'low' | 'insufficient';
  availableDrivers: number;
  totalDrivers: number;
  staleDrivers: number;
  missing: string[];
  sources: string[];
};

export type GoldScenarioSnapshot = {
  generatedAt: string;
  modelVersion: string;
  currentGoldPrice: number | null;
  currency: string;
  unit: 'troy_ounce';
  annualizedVolatility: number | null;
  evidenceScore: number;
  directionalBias: GoldDriverDirection;
  confidence: number;
  drivers: GoldScenarioDriver[];
  events: GoldScenarioEvent[];
  upcomingRiskEvents: Array<{
    id: string;
    title: string;
    dateTimeUtc: string;
    impact: string;
    country: string | null;
    currency: string | null;
    source: string | null;
  }>;
  scenarios: GoldScenario[];
  dataQuality: GoldScenarioDataQuality;
  methodology: {
    approach: string;
    note: string;
    noteAr: string;
  };
};

export type GoldWhatIfInput = {
  dollarIndexPct?: number;
  oilPct?: number;
  policyRateBps?: number;
  inflationSurprisePct?: number;
  geopoliticalRisk?: number;
};

export type GoldScenarioMarketInput = {
  goldPrice: number | null;
  goldHistory: number[];
  quotes: Partial<Record<'gold' | 'dxy' | 'wti' | 'brent' | 'spx' | 'btc', {
    value: number | null;
    changePercent: number | null;
    source: string | null;
    asOf: string | null;
    available: boolean;
  }>>;
  macro: Partial<Record<'policyRate' | 'inflation' | 'yieldCurve' | 'unemployment', {
    value: number | string | null;
    delta: number | null;
    source: string | null;
    asOf: string | null;
    available: boolean;
  }>>;
  events: GoldScenarioEvent[];
  upcomingRiskEvents: GoldScenarioSnapshot['upcomingRiskEvents'];
  sourceHealth?: string[];
};