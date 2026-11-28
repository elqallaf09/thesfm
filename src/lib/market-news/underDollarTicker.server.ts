import 'server-only';
import { verifiedUnderOne } from './specialQuotes';

const exchanges = ['NASDAQ', 'NYSE', 'AMEX'];
const columns = ['name', 'description', 'exchange', 'type', 'currency', 'close', 'change', 'update_time', 'typespecs', 'volume'];

export function underDollarQuotes(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return [];
  const seen = new Set<string>();
  return payload.data.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object' || !('s' in row) || !('d' in row) || !Array.isArray(row.d)) return [];
    const [symbol, name, exchange, type, currency, price, changePercent, seconds, specs, volume] = row.d as unknown[];
    if (typeof symbol !== 'string' || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol) || typeof exchange !== 'string'
      || !exchanges.includes(exchange) || row.s !== exchange + ':' + symbol || seen.has(symbol)
      || type !== 'stock' || currency !== 'USD' || !Array.isArray(specs) || !specs.includes('common')
      || typeof price !== 'number' || typeof seconds !== 'number' || !Number.isSafeInteger(seconds)) return [];
    const time = new Date(seconds * 1000);
    if (!Number.isFinite(time.getTime())) return [];
    const asOf = time.toISOString();
    if (!verifiedUnderOne({ available: true, assetType: 'EQUITY', currency, price, asOf })) return [];
    seen.add(symbol);
    return [{ symbol, name: typeof name === 'string' && name.trim() ? name : symbol, exchange,
      price, currency, asOf, changePercent: typeof changePercent === 'number' && Number.isFinite(changePercent) ? changePercent : null,
      volume: typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 ? volume : null,
      assetType: 'stock', source: 'TradingView', available: true, delayed: true }];
  }).slice(0, 12);
}

export async function underDollarTicker() {
  const response = await fetch('https://scanner.tradingview.com/america/scan', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      filter: [
        { left: 'exchange', operation: 'in_range', right: exchanges },
        { left: 'type', operation: 'equal', right: 'stock' },
        { left: 'currency', operation: 'equal', right: 'USD' },
        { left: 'close', operation: 'greater', right: 0 },
        { left: 'close', operation: 'less', right: 1 },
      ], columns, sort: { sortBy: 'volume', sortOrder: 'desc' }, range: [0, 24],
    }),
    next: { revalidate: 60 }, signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error('Under-dollar screener unavailable');
  return underDollarQuotes(await response.json());
}
