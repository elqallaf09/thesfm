import type { MarketAssetType } from '@/lib/market/marketService';

export const SFM_MARKET_ENGINE_NAME = 'THE SFM Market Data Engine' as const;
export const SFM_MARKET_ENGINE_VERSION = '1.0.0' as const;
export const SFM_MARKET_SCHEMA_VERSION = 'sfm-market.v1' as const;

export type SfmMarketSourceClass =
  | 'primary_exchange'
  | 'regulator'
  | 'issuer'
  | 'licensed_feed'
  | 'aggregator'
  | 'derived';

export type SfmMarketQualityState = 'complete' | 'usable' | 'partial' | 'stale' | 'unavailable';

export type SfmMarketQuality = {
  state: SfmMarketQualityState;
  score: number;
  completenessPercent: number;
  freshnessSeconds: number | null;
  missingFields: string[];
  reasons: string[];
};

export type SfmMarketProvenance = {
  sourceClass: SfmMarketSourceClass;
  upstreamProvider: string | null;
  upstreamProviderName: string | null;
  providerSymbol: string | null;
  observedAt: string | null;
  receivedAt: string;
  delayType: string | null;
  cached: boolean;
  cacheAgeSeconds: number | null;
  attemptCount: number;
  derivedFields: string[];
};

export type SfmMarketQuote = {
  schemaVersion: typeof SFM_MARKET_SCHEMA_VERSION;
  engine: typeof SFM_MARKET_ENGINE_NAME;
  engineVersion: typeof SFM_MARKET_ENGINE_VERSION;
  symbol: string;
  name: string | null;
  assetType: MarketAssetType;
  market: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  quality: SfmMarketQuality;
  provenance: SfmMarketProvenance;
};

export type SfmTechnicalSnapshot = {
  historyPoints: number;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  annualizedVolatilityPercent: number | null;
  averageVolume20: number | null;
  trend: 'bullish' | 'bearish' | 'neutral' | null;
  historyProvider: string | null;
  observedThrough: string | null;
};

export type SfmOfficialFiling = {
  form: string;
  filingDate: string;
  reportDate: string | null;
  accessionNumber: string;
  documentUrl: string;
};

export type SfmRegulatorEvidence = {
  status: 'ready' | 'not_applicable' | 'not_found' | 'unavailable';
  regulator: 'SEC';
  sourceClass: 'regulator';
  sourceUrl: string | null;
  retrievedAt: string | null;
  symbol: string;
  cik: string | null;
  entityName: string | null;
  exchange: string | null;
  latestPeriodicFiling: SfmOfficialFiling | null;
  latestCurrentReport: SfmOfficialFiling | null;
  xbrlConceptCount: number | null;
  reason: string | null;
};

export type SfmAnalystStatus = 'ready' | 'partial' | 'blocked';

export type SfmMarketAnalysis = {
  schemaVersion: typeof SFM_MARKET_SCHEMA_VERSION;
  engine: typeof SFM_MARKET_ENGINE_NAME;
  engineVersion: typeof SFM_MARKET_ENGINE_VERSION;
  analyst: 'SFM Market Analyst';
  generatedAt: string;
  status: SfmAnalystStatus;
  code: string | null;
  quote: SfmMarketQuote | null;
  technical: SfmTechnicalSnapshot;
  officialEvidence: {
    sec: SfmRegulatorEvidence;
  };
  evidence: {
    quoteAvailable: boolean;
    historyAvailable: boolean;
    historyPoints: number;
    officialRegulatorEvidenceAvailable: boolean;
    missing: string[];
    upstreamAttempts: number;
  };
  summary: {
    ar: string;
    en: string;
  };
  guardrails: {
    fabricatedMarketValues: false;
    recommendationGeneratedWithoutEvidence: false;
    upstreamProvenanceVisible: true;
  };
};
