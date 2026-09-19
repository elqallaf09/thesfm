import type { ProviderApiResponse } from '../shared';

export type EconomicCalendarProviderName = 'finnhub' | 'tradingeconomics' | 'fmp' | 'bls' | 'bea' | 'ons' | 'boc';

export type EconomicCalendarQuery = {
  from: string;
  to: string;
  country?: string | null;
  currency?: string | null;
  impact?: 'high' | 'medium' | 'low' | null;
  timezone?: string | null;
  force?: boolean;
};

export type EconomicCalendarEvent = {
  id: string;
  title: string;
  country: string | null;
  currency: string | null;
  dateTimeUtc: string;
  impact: 'high' | 'medium' | 'low' | 'unknown';
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
  unit: string | null;
  source: string | null;
  provider: EconomicCalendarProviderName;
  sourceUrl?: string;
  retrievedAt?: string;
  stale?: boolean;
  impactMethod?: 'provider' | 'sfm-title-rule-v1';
  sources?: Array<{ provider: EconomicCalendarProviderName; url: string | null; retrievedAt: string | null }>;
};

export type CalendarSourceReport = {
  provider: EconomicCalendarProviderName;
  status: 'success' | 'stale' | 'failed';
  count: number;
  checkedAt: string;
  lastSuccessfulUpdate: string | null;
  errorCode: string | null;
};

export type EconomicCalendarResponse = Omit<ProviderApiResponse<EconomicCalendarEvent[]>, 'provider'> & {
  provider: EconomicCalendarProviderName | 'sfm' | null;
  partial?: boolean;
  checkedAt?: string;
  sources?: CalendarSourceReport[];
};

export interface EconomicCalendarProvider {
  provider: EconomicCalendarProviderName;
  getEvents(query: EconomicCalendarQuery): Promise<EconomicCalendarEvent[]>;
}
