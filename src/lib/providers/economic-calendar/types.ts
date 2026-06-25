import type { ProviderApiResponse } from '../shared';

export type EconomicCalendarProviderName = 'fmp' | 'finnhub';

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
};

export type EconomicCalendarResponse = ProviderApiResponse<EconomicCalendarEvent[]>;

export interface EconomicCalendarProvider {
  provider: EconomicCalendarProviderName;
  getEvents(query: EconomicCalendarQuery): Promise<EconomicCalendarEvent[]>;
}
