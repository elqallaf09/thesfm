import { collectScreenerPages, assertSameListings } from '../src/lib/market/screenerPagination.ts';
import { syncMarketSymbols } from './lib/market-symbol-sync.mjs';

// Explicit provider exchange codes, never inferred from country or ticker suffix.
const exchanges = (process.env.FMP_SCREENER_EXCHANGES || 'NASDAQ,KUWAIT,SAU,DFM,DOH,LSE,XETRA').split(',').map(x => x.trim()).filter(Boolean);
const apiKey = process.env.FMP_API_KEY?.trim();
if (!apiKey) throw new Error('FMP_API_KEY is required; no live verification was performed');
const write = process.argv.includes('--sync');
const reports = [];
const allRows = [];
for (const exchange of exchanges) {
  async function scan(pageSize) {
    return collectScreenerPages(async paging => {
      const url = new URL('https://financialmodelingprep.com/stable/company-screener');
      for (const [key, value] of Object.entries({ exchange, ...paging, apikey: apiKey })) url.searchParams.set(key, String(value));
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`fmp_http_${response.status}`);
      return response.json();
    }, { exchange, pageSize, maxPages: 100, includeAllShareClasses: true });
  }
  try {
    // Different boundaries detect missing/overlapping symbols; replay detects drift.
    const a = await scan(1000); const b = await scan(800); const replay = await scan(1000);
    assertSameListings(a.rows, b.rows); assertSameListings(a.rows, replay.rows);
    const matching = a.rows.filter(row => row.exchange === row.requestedExchange);
    if (!matching.length) throw new Error('no_verified_listings_for_requested_exchange');
    reports.push({ exchange, status: 'verified', count: matching.length, pageCounts: a.pageCounts,
      primaryExchangeUnknown: matching.filter(row => !row.primaryExchange).length,
      otherListingExchanges: a.rows.length - matching.length });
    allRows.push(...matching.map(row => ({ symbol: row.symbol, exchange: row.exchange,
      primary_exchange: row.primaryExchange, requested_exchange: row.requestedExchange,
      provider_symbol: row.symbol, name: String(row.companyName ?? row.name ?? '').trim(),
      asset_type: row.isEtf === true || row.isFund === true ? 'etf' : 'stock',
      country: typeof row.country === 'string' ? row.country : null,
      currency: typeof row.currency === 'string' ? row.currency : null,
      is_active: row.isActivelyTrading !== false, source: 'FMP company-screener', last_synced_at: new Date().toISOString(),
    })));
  } catch (error) {
    // Do not print URLs/API keys or response bodies.
    reports.push({ exchange, status: 'unverified', reason: error instanceof Error && /^(screener_|fmp_http_|no_verified_)/.test(error.message) ? error.message : 'provider_request_failed' });
  }
}
console.log(JSON.stringify({ mode: write ? 'sync' : 'read-only', reports }, null, 2));
if (reports.some(report => report.status !== 'verified')) process.exitCode = 1;
else if (write) console.log(await syncMarketSymbols(allRows, {
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
}));
