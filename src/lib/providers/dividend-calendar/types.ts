import type { ProviderApiResponse } from '../shared';

export type DividendCalendarProviderName = 'finnhub' | 'fmp';

export type DividendCalendarStock = {
  symbol: string;
  name: string;
  market?: string | null;
  currency?: string | null;
  dividendYield?: number | null;
};

export type DividendCalendarQuery = {
  from: string;
  to: string;
  symbols?: DividendCalendarStock[];
  force?: boolean;
};

export type DividendCalendarEvent = {
  id: string;
  symbol: string;
  companyName: string;
  market: string;
  currency: string;
  dividendAmount: number | null;
  dividendYield: number | null;
  exDividendDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  declarationDate: string | null;
  type: string | null;
  source: string;
  provider: DividendCalendarProviderName;
  status: 'announced' | 'scheduled' | 'estimated';
};

export type DividendCalendarResponse = ProviderApiResponse<DividendCalendarEvent[]>;

export interface DividendCalendarProvider {
  provider: DividendCalendarProviderName;
  getEvents(query: DividendCalendarQuery): Promise<DividendCalendarEvent[]>;
}
