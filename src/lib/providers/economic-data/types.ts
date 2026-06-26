export type EconomicDataProviderName = 'tradingeconomics' | 'fred';

export type MacroIndicatorId =
  | 'gdp'
  | 'pmi'
  | 'unemployment'
  | 'confidence'
  | 'retail'
  | 'industrial'
  | 'policyRate'
  | 'yieldCurve'
  | 'housing'
  | 'inflation';

export type EconomicIndicatorStatus = 'actual' | 'forecast' | 'stale';

export type EconomicIndicatorChange = {
  delta: number | null;
  unit: string | null;
  basis: 'previous' | 'forecast';
  basisValue: string;
};

export type EconomicCycleIndicator = {
  id: MacroIndicatorId;
  value: string;
  change: EconomicIndicatorChange | null;
  date: string;
  source: string;
  status: EconomicIndicatorStatus;
};

export type EconomicCycleIndicatorsResponse = {
  ok: boolean;
  status: 'available' | 'empty' | 'error';
  source: string | null;
  updated_at: string | null;
  indicators: EconomicCycleIndicator[];
  devHint?: string;
};

export type MacroIndicator = {
  id: MacroIndicatorId;
  country: string;
  indicator: string;
  value: number | string;
  unit: string | null;
  date: string;
  source: string;
  provider: EconomicDataProviderName;
  previous: number | string | null;
  forecast: number | string | null;
  status: EconomicIndicatorStatus;
};

export type MacroIndicatorQuery = {
  country?: string;
  indicator: MacroIndicatorId;
  force?: boolean;
};

export type EconomicCalendarImpact = 'high' | 'medium' | 'low' | 'unknown';

export type EconomicDataCalendarEvent = {
  id: string;
  title: string;
  country: string | null;
  currency: string | null;
  dateTimeUtc: string;
  impact: EconomicCalendarImpact;
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
  unit: string | null;
  category: string | null;
  source: string | null;
  provider: EconomicDataProviderName;
};

export type EconomicCalendarQuery = {
  from: string;
  to: string;
  country?: string;
  currency?: string;
  impact?: Exclude<EconomicCalendarImpact, 'unknown'>;
  force?: boolean;
};

export type EconomicDataProviderStatus = {
  provider: EconomicDataProviderName | null;
  configured: boolean;
  status: 'available' | 'not_configured' | 'error';
  lastFetchStatus: string | null;
  lastFetchTime: string | null;
};

export interface EconomicDataProvider {
  readonly name: EconomicDataProviderName;
  getMacroIndicator(query: MacroIndicatorQuery): Promise<MacroIndicator | null>;
  getEconomicCalendar(query: EconomicCalendarQuery): Promise<EconomicDataCalendarEvent[]>;
}
