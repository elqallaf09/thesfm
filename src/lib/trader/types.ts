export type Signal = 'buy' | 'sell' | 'hold';
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type TimeHorizon = 'intraday' | 'days' | 'weeks' | 'months' | null;
export type AnalysisMethod = 'technical_rules' | 'quantitative_model' | 'ai_enhanced';

export type TradableAsset = {
  symbol: string;
  providerSymbol: string;
  name: string;
  exchange: string | null;
  market: 'US';
  currency: string;
  sector: string | null;
  industry: string | null;
  logoUrl: string | null;
  active: boolean;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  timestamp: string;
  currency: string;
  delayed: boolean;
  provider: string;
};

export type MarketCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type ScanScoreBreakdown = {
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  volatilityScore: number;
  technicalScore: number;
  totalScore: number;
};

export type TechnicalSnapshot = {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  atr14: number | null;
  averageVolume20: number | null;
  volumeRatio: number | null;
  momentum20: number | null;
  momentum50: number | null;
  distanceFromHigh52w: number | null;
  distanceFromLow52w: number | null;
  support: number | null;
  resistance: number | null;
  trend: 'bullish' | 'bearish' | 'mixed' | 'unknown';
};

export type StockAnalysisResult = {
  id: string;
  symbol: string;
  providerSymbol: string;
  name: string;
  market: 'US';
  exchange: string | null;
  sector: string | null;
  generatedAt: string;
  dataTimestamp: string;
  signal: Signal;
  confidence: number;
  currentPrice: number;
  targetPrice: number | null;
  stopLoss: number | null;
  expectedTimeframe: TimeHorizon;
  expectedTimeframeLabel: string | null;
  riskLevel: RiskLevel;
  score: number;
  scoreBreakdown: ScanScoreBreakdown;
  technicals: TechnicalSnapshot;
  reasons: string[];
  reasonsAr: string[];
  warnings: string[];
  analysisMethod: AnalysisMethod;
  provider: string;
  delayed: boolean;
  currency: string;
};

export type ScannerStatus = {
  running: boolean;
  lastScanStartedAt: string | null;
  lastScanCompletedAt: string | null;
  scannedAssets: number;
  generatedSignals: number;
  lastErrorCode: string | null;
};

export type TraderStatus = {
  marketData: {
    configured: boolean;
    connected: boolean;
    provider: string | null;
    delayed: boolean;
    lastSuccessfulUpdate: string | null;
  };
  scanner: ScannerStatus;
};

export type ScannerFilters = {
  market: 'US';
  signalType?: Signal | 'all';
  minimumConfidence?: number;
  riskLevel?: RiskLevel | 'all';
  timeHorizon?: Exclude<TimeHorizon, null> | 'all';
  symbols?: string[];
};
