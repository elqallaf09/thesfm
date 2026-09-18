import { expect, it } from 'vitest';
import { aggregateRegionalQuoteHealth } from '@/lib/market/sourceHealth';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
const quote = (symbol: string, overrides: Partial<TechStockPrice> = {}): TechStockPrice => ({ symbol, price: null, change: null, changePercent: null, available: false, delayed: true, source: 'Twelve Data', ...overrides });

it('persists bounded aggregate outcomes without symbols or user identifiers', () => {
  const result = aggregateRegionalQuoteHealth([
    quote('TD:XSAU:1010', { source: 'Yahoo Finance', price: 20, available: true }),
    quote('TD:XSAU:1020', { source: 'Yahoo Finance', price: 21, available: true }),
    quote('TD:XADS:ABNIC', { unavailableReason: 'provider_rate_limited' }),
    quote('TD:XCAI:EGS01041C010', { unavailableReason: 'provider_access_required' }), quote('AAPL'),
  ]);
  expect(result).toEqual([
    { mic: 'XSAU', provider: 'yahoo', outcome: 'available', checks: 2 },
    { mic: 'XADS', provider: 'twelve_data', outcome: 'rate_limited', checks: 1 },
    { mic: 'XCAI', provider: 'twelve_data', outcome: 'access_required', checks: 1 },
  ]);
  expect(JSON.stringify(result)).not.toMatch(/1010|1020|ABNIC|EGS01041C010|AAPL/);
  expect(aggregateRegionalQuoteHealth(Array.from({ length: 100 }, () => quote('TD:XSAU:1010')))[0].checks).toBe(24);
});
