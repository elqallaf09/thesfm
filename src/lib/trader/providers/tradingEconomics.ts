import { ProviderError } from '@/lib/providers/shared';
import { createTradingEconomicsCalendarProvider } from '@/lib/providers/economic-calendar/tradingEconomics';
import type { EconomicCalendarEvent } from '@/lib/providers/economic-calendar/types';
import type { TraderCalendarQuery, TraderEconomicEvent } from './types';

function toTraderEconomicEvent(event: EconomicCalendarEvent): TraderEconomicEvent {
  return {
    id: event.id,
    dateTimeUtc: event.dateTimeUtc,
    country: event.country,
    currency: event.currency,
    event: event.title,
    impact: event.impact,
    previous: event.previous,
    forecast: event.forecast,
    actual: event.actual,
    source: event.source,
    provider: 'tradingeconomics',
  };
}

export async function fetchTradingEconomicsCalendar(apiKey: string, query: TraderCalendarQuery) {
  try {
    const provider = createTradingEconomicsCalendarProvider(apiKey);
    const events = await provider.getEvents(query);
    return events.map(toTraderEconomicEvent);
  } catch (error) {
    if (error instanceof ProviderError && error.messageCode === 'calendar_no_events') return [];
    throw error;
  }
}
