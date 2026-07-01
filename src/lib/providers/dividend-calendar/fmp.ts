import { getFmpDividendCalendar, normalizeFmpDividendEvent } from '@/lib/market/fmpDividends';
import { ProviderError } from '../shared';
import type { DividendCalendarProvider } from './types';

export function createFmpDividendCalendarProvider(apiKey: string): DividendCalendarProvider {
  return {
    provider: 'fmp',
    async getEvents(query) {
      if (!apiKey) throw new ProviderError('not_configured', 'provider_not_configured');
      const result = await getFmpDividendCalendar({
        from: query.from,
        to: query.to,
        force: query.force,
      });
      const status = result.diagnostics.status;
      if (status !== 'success' && status !== 'empty') {
        throw new ProviderError(
          status,
          status === 'rate_limited'
            ? 'provider_rate_limited'
            : status === 'unauthorized' || status === 'forbidden' || status === 'not_entitled'
              ? 'provider_access_denied'
              : 'provider_temporarily_unavailable',
          result.diagnostics.responseStatus ?? undefined,
          result.diagnostics.errorMessage ?? undefined,
        );
      }
      return result.events;
    },
  };
}

export { normalizeFmpDividendEvent };
