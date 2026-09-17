type DashboardSymbol = { symbol: string; assetType?: string; name?: string };
const US_RESEARCH_SAMPLE = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'WMT', 'XOM', 'JNJ', 'AVGO', 'AMD', 'COST', 'UNH', 'PG', 'KO', 'HD', 'BAC'];

/** A labelled, bounded research sample; the full directory remains searchable. */
export function prioritizeDashboardUniverse<T extends DashboardSymbol>(items: T[], market: string, seeds: string[] = []): T[] {
  const preferred = market === 'us-stocks' ? US_RESEARCH_SAMPLE : seeds;
  const order = new Map(preferred.map((symbol, index) => [symbol.toUpperCase(), index]));
  const ordinary = (item: T) => !/\b(warrant|rights?|units?|acquisition)\b/i.test(item.name || '');
  return [...items].sort((a, b) => (order.get(a.symbol.toUpperCase()) ?? 10_000) - (order.get(b.symbol.toUpperCase()) ?? 10_000)
    || Number(ordinary(b)) - Number(ordinary(a)) || a.symbol.localeCompare(b.symbol));
}
