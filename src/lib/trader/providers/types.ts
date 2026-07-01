import type { ProviderApiStatus } from '@/lib/providers/shared';

export type TraderCalendarProvider = 'fmp' | 'finnhub' | 'tradingeconomics';
export type TraderProviderName = TraderCalendarProvider | 'yahoo';
export type TraderCalendarFeature = 'earnings' | 'dividends' | 'ipos' | 'economic';
export type TraderProviderFeature = TraderCalendarFeature | 'prices' | 'news';
export type TraderCalendarRange = 'today' | '7' | '30' | '90' | 'all';

export type TraderCalendarQuery = {
  from: string;
  to: string;
  range: TraderCalendarRange;
  force?: boolean;
  symbols?: string[];
  country?: string | null;
  currency?: string | null;
  impact?: 'high' | 'medium' | 'low' | null;
};

export type TraderProviderResult<T> = {
  status: ProviderApiStatus;
  provider: TraderCalendarProvider | null;
  data: T[];
  cached: boolean;
  stale: boolean;
  lastUpdated: string | null;
  lastSuccessfulUpdate: string | null;
  resultCount: number;
  messageCode: string | null;
  failureReason: string | null;
  providerStatusCode: number | null;
  supportedFeatures: TraderProviderFeature[];
  range: {
    key: TraderCalendarRange;
    from: string;
    to: string;
  };
};

export type TraderEarningsEvent = {
  id: string;
  symbol: string;
  companyName: string;
  reportDate: string | null;
  fiscalDateEnding: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  time: string | null;
  source: string;
  provider: 'fmp' | 'finnhub';
};

export type TraderDividendEvent = {
  id: string;
  symbol: string;
  companyName: string;
  declarationDate: string | null;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  dividendAmount: number | null;
  dividendYield: number | null;
  currency: string | null;
  source: string;
  provider: 'fmp' | 'finnhub';
};

export type TraderIpoEvent = {
  id: string;
  companyName: string;
  symbol: string | null;
  exchange: string | null;
  ipoDate: string | null;
  priceRange: string | null;
  shares: number | null;
  marketCap: number | null;
  status: string | null;
  source: string;
  provider: 'fmp';
};

export type TraderEconomicEvent = {
  id: string;
  dateTimeUtc: string;
  country: string | null;
  currency: string | null;
  event: string;
  impact: 'high' | 'medium' | 'low' | 'unknown';
  previous: string | number | null;
  forecast: string | number | null;
  actual: string | number | null;
  source: string | null;
  provider: TraderCalendarProvider;
};

export type TraderCalendarDataMap = {
  earnings: TraderEarningsEvent;
  dividends: TraderDividendEvent;
  ipos: TraderIpoEvent;
  economic: TraderEconomicEvent;
};

export type TraderFeatureStatus = {
  feature: TraderProviderFeature;
  configured: boolean;
  provider: TraderProviderName | null;
  status: ProviderApiStatus | 'available';
  resultCount: number | null;
  lastUpdated: string | null;
  lastSuccessfulUpdate: string | null;
  failureReason: string | null;
  supportedProviders: TraderProviderName[];
  supportedFeatures: TraderProviderFeature[];
};

export type TraderProviderStatusResponse = {
  generatedAt: string;
  providers: {
    fmpConfigured: boolean;
    finnhubConfigured: boolean;
    tradingEconomicsConfigured: boolean;
  };
  features: Record<TraderProviderFeature, TraderFeatureStatus>;
  dataProvider: {
    configured: boolean;
    active: TraderProviderName | null;
    provider: TraderProviderName | null;
    status: ProviderApiStatus | 'available';
    supportedFeatures: TraderProviderFeature[];
    lastUpdated: string | null;
    resultCount: number | null;
    failureReason: string | null;
  };
};
