import type { TechStockPrice } from './fetchStockPrices';
import { regionalQuoteIdentity } from './regionalDirectory';

export type MarketHealthOutcome = 'available' | 'rate_limited' | 'access_required' | 'stale' | 'invalid' | 'unavailable';
export type MarketHealthCount = { mic: string; provider: 'twelve_data' | 'yahoo'; outcome: MarketHealthOutcome; checks: number };
export type MarketHealthRow = MarketHealthCount & { day: string; updated_at: string };
export type MarketHealthReport = { available: boolean; rows: MarketHealthRow[] };

export function aggregateRegionalQuoteHealth(prices: TechStockPrice[]): MarketHealthCount[] {
  const groups = new Map<string, MarketHealthCount>();
  for (const quote of prices.slice(0, 24)) {
    const identity = regionalQuoteIdentity(quote.symbol);
    if (!identity || !['Twelve Data', 'Yahoo Finance'].includes(quote.source)) continue;
    const reason = quote.unavailableReason ?? '';
    const outcome: MarketHealthOutcome = quote.available ? 'available'
      : /429|rate_limit/.test(reason) ? 'rate_limited'
        : /access_required|not_configured|401|403/.test(reason) ? 'access_required'
          : /stale/.test(reason) ? 'stale'
            : /invalid|mismatch/.test(reason) ? 'invalid' : 'unavailable';
    const provider = quote.source === 'Yahoo Finance' ? 'yahoo' : 'twelve_data';
    const key = `${identity.mic}:${provider}:${outcome}`;
    const group = groups.get(key) ?? { mic: identity.mic, provider, outcome, checks: 0 };
    group.checks++;
    groups.set(key, group);
  }
  return [...groups.values()];
}
