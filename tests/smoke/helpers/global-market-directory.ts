import type { Page } from '@playwright/test';
import snapshot from '../../../src/data/market-symbols/global-directory-snapshot.json';
import usSymbols from '../../../src/data/us-symbols.json';
import { GLOBAL_MARKET_STRIPS, inferStripCurrency } from '../../../src/lib/market/globalMarketStrips';
import type { GlobalDirectoryRow } from '../../../src/lib/market/globalMarketDirectoryTypes';

/** Deterministic UI transport fixtures; full provider/parser coverage lives in unit tests. */
export async function mockMarketDirectory(page: Page) {
  const rows = GLOBAL_MARKET_STRIPS.flatMap((strip): GlobalDirectoryRow[] => {
    const source = strip.id === 'kuwait_boursa' ? snapshot.kuwait.rows : strip.id === 'china_sse' ? snapshot.shanghai.rows : strip.id === 'china_szse' ? snapshot.shenzhen.rows : null;
    if (source) return source.map(row => ({ id: `${strip.id}:${row.providerSymbol}`, symbol: row.providerSymbol, providerSymbol: row.providerSymbol, name: row.name, localName: row.localName, countryCode: strip.countryCode, stripId: strip.id, kind: strip.kind, currency: row.currency }));
    if (strip.countryCode === 'US') return usSymbols.filter(row => row.exchange === strip.exchangeCode && row.assetType === 'stock').map(row => ({ id: `${strip.id}:${row.providerSymbol}`, symbol: row.providerSymbol, providerSymbol: row.providerSymbol, name: row.name, countryCode: 'US', stripId: strip.id, kind: strip.kind, currency: row.currency }));
    return strip.items.map(row => ({ id: `${strip.id}:${row.symbol}`, symbol: row.symbol, providerSymbol: row.symbol, name: row.name, nameAr: row.nameAr, sector: row.sector, countryCode: strip.countryCode, stripId: strip.id, kind: strip.kind, currency: inferStripCurrency(row.symbol) }));
  });
  await page.route('**/api/market-directory?**', async route => {
    const p = new URL(route.request().url()).searchParams;
    const query = (p.get('q') || '').toLowerCase();
    const filtered = rows.filter(row => (!p.get('exchange') || p.get('exchange') === 'all' || row.stripId === p.get('exchange')) && (!p.get('country') || p.get('country') === 'all' || row.countryCode === p.get('country')) && (!p.get('sector') || p.get('sector') === 'all' || row.sector === p.get('sector')) && (!p.get('assetType') || p.get('assetType') === 'all' || row.kind === p.get('assetType')) && `${row.symbol} ${row.name} ${row.nameAr || ''} ${row.localName || ''}`.toLowerCase().includes(query));
    const offset = Number(p.get('offset') || 0), limit = Number(p.get('limit') || 12);
    const items = filtered.slice(offset, offset + limit);
    const strips = GLOBAL_MARKET_STRIPS.filter(strip => p.get('exchange') === 'all' || strip.id === p.get('exchange'));
    await route.fulfill({ json: { success: true, items, total: filtered.length, offset, nextOffset: offset + items.length < filtered.length ? offset + items.length : null, coverage: strips.map(strip => ({ stripId: strip.id, count: rows.filter(row => row.stripId === strip.id).length, status: strip.items.length ? 'directory' : 'unavailable', source: '', asOf: snapshot.asOf })) } });
  });
  await page.route('**/api/market-directory/quotes?**', route => {
    const symbols = (new URL(route.request().url()).searchParams.get('symbols') || '').split(',');
    return route.fulfill({ json: { success: true, prices: Object.fromEntries(symbols.map(symbol => [symbol, { symbol, price: 123.45, change: 1, changePercent: 0.82, available: true, source: 'Yahoo Finance', delayed: true }])) } });
  });
}
