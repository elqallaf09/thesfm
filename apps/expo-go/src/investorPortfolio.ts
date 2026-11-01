import type { MobileRecord } from '../../../src/lib/mobile/resourceContract';

export function portfolioMetrics(holdings: MobileRecord[], watchlist: MobileRecord[]) {
  const valued = holdings.filter(item => typeof item.converted_market_value === 'number');
  return {
    holdingCount: holdings.length,
    watchlistCount: watchlist.length,
    valuedCount: valued.length,
    totalConvertedValue: valued.reduce((sum, item) => sum + Number(item.converted_market_value), 0),
    userCurrencies: [...new Set(valued.map(item => String(item.user_currency ?? '')).filter(Boolean))],
  };
}
