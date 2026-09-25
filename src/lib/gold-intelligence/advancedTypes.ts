import type { GoldWhatIfResult, GoldWhatIfShocks } from './types';

export type GoldRegimeId =
  | 'risk_off_haven'
  | 'real_yield_tailwind'
  | 'real_yield_pressure'
  | 'dollar_weakness'
  | 'dollar_pressure'
  | 'energy_inflation'
  | 'momentum_trend'
  | 'balanced'
  | 'data_thin';

export type GoldRegimeAnalysis = {
  id: GoldRegimeId;
  label: string;
  labelAr: string;
  confidence: number;
  score: number;
  supportive: boolean | null;
  reasons: string[];
  reasonsAr: string[];
};

export type GoldCausalNode = {
  id: string;
  label: string;
  labelAr: string;
};

export type GoldCausalChain = {
  id: string;
  label: string;
  labelAr: string;
  direction: 'supportive' | 'restrictive' | 'mixed';
  strength: number;
  confidence: number;
  sourceDriver: string;
  nodes: GoldCausalNode[];
  caveat: string;
  caveatAr: string;
};

export type GoldStressCase = {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  shocks: GoldWhatIfShocks;
  result: GoldWhatIfResult;
};

export type GoldModelDiagnostics = {
  observations: number;
  status: 'strong' | 'usable' | 'thin' | 'unavailable';
  volatilityBandCoverage: number | null;
  calibrationScore: number | null;
  recentVolatility: number | null;
  priorVolatility: number | null;
  volatilityShift: number | null;
  trendStrength: number | null;
  note: string;
  noteAr: string;
};

export type GoldHistoricalAnalog = {
  anchorIndex: number;
  similarity: number;
  prior20Return: number;
  prior20Volatility: number;
  forward20Return: number;
};

export type GoldHistoricalAnalogAnalysis = {
  status: 'available' | 'thin' | 'unavailable';
  current20Return: number | null;
  current20Volatility: number | null;
  medianForward20Return: number | null;
  positiveForwardShare: number | null;
  analogs: GoldHistoricalAnalog[];
  note: string;
  noteAr: string;
};

export type GoldAdvancedAnalysis = {
  regime: GoldRegimeAnalysis;
  causalChains: GoldCausalChain[];
  stressTests: GoldStressCase[];
  diagnostics: GoldModelDiagnostics;
  historicalAnalogs: GoldHistoricalAnalogAnalysis;
};
