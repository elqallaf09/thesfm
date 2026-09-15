import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const START = Date.parse('2026-09-15T14:00:00Z');
function compile(file, mocks, timers = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, module: { exports }, Date, Map, Set, Request, Response, URL,
    setTimeout, clearTimeout, ...timers,
    require(name) { if (name in mocks) return mocks[name]; throw new Error(`Unexpected dependency: ${name}`); },
  });
  return exports;
}
const exports = compile('src/lib/trader/watchlistEngine.ts', {
  'server-only': {}, '@/lib/trader/marketCatalog': { getTraderMarketCatalog: async () => ({ symbols: [] }) },
  '@/lib/trader/marketQuotes': { fetchTraderQuotesDetailed: async () => result([]) },
  '@/lib/trader/persistentCache': { getPersistentCache: async () => null, setPersistentCache: async () => {} },
});
const { createWatchlistEngine, parseWatchlistSymbols, resolveWatchlistSymbols } = exports;
function quote(symbol = 'MSFT', overrides = {}) {
  return { symbol, requestedSymbol: symbol, canonicalSymbol: symbol, providerSymbol: symbol,
    price: 501.25, currency: 'USD', available: true, provider: 'fmp', source: 'test-provider-fixture',
    lastUpdated: new Date(START).toISOString(), updatedAt: new Date(START).toISOString(),
    signalAvailable: true, technicalAvailable: true, dataSufficiency: { sufficient: true },
    confidence: 75, aiConfidence: 75, targetPrice: 520, finalScore: 80, history: [{ close: 1 }],
    ...overrides };
}
function result(quotes) { return { quotes, loaded: [], failed: [], skipped: [], summary: { skippedDueToRateLimit: 0 } }; }
function meta(symbol, currency = 'USD', aliases = []) { return { symbol, providerSymbol: symbol, aliases, currency }; }
function harness(options = {}) {
  let clock = START;
  const calls = [], store = options.store || new Map();
  const deps = {
    now: () => clock, catalog: async () => ({ symbols: [] }),
    read: async key => store.get(key) || null, write: async (key, snapshot) => { store.set(key, structuredClone(snapshot)); },
    ...options,
  };
  deps.load = async (ids, config) => { calls.push({ ids: [...ids], config }); return options.load ? options.load(ids, config) : result(ids.map(id => quote(id))); };
  delete deps.store;
  const engine = createWatchlistEngine(deps);
  return { engine, calls, store, advance: ms => { clock += ms; } };
}

test('symbol parser normalizes and deduplicates without silently truncating', () => {
  assert.equal(JSON.stringify(parseWatchlistSymbols(' msft,MSFT,2222.SR,BRK-B ')), '["MSFT","2222.SR","BRK-B"]');
  assert.equal(parseWatchlistSymbols(null).length, 0);
  for (const bad of ['AAPL,,MSFT', '<script>', 'https://a', 'A'.repeat(41), Array.from({ length: 51 }, (_, i) => `T${i}`).join(',')]) assert.throws(() => parseWatchlistSymbols(bad));
});

test('empty watchlist makes no catalog, cache or provider calls', async () => {
  let calls = 0;
  const engine = createWatchlistEngine({ catalog: async () => { calls++; return { symbols: [] }; }, load: async () => { calls++; return result([]); } });
  assert.equal((await engine.load([])).length, 0); assert.equal(calls, 0);
});

test('mixed-market symbols preserve each security currency and metadata', async () => {
  const catalog = [meta('MSFT'), meta('2222.SR', 'SAR'), meta('KFH.KW', 'KWD')];
  const { engine, calls } = harness({ catalog: async () => ({ symbols: catalog }), load: async ids => result(ids.map(id => quote(id, { currency: catalog.find(row => row.symbol === id).currency }))) });
  const rows = await engine.load(['MSFT', '2222.SR', 'KFH.KW'], 'quotes');
  assert.equal(JSON.stringify(rows.map(row => row.currency)), '["USD","SAR","KWD"]');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].config.symbolMeta.length, 3);
});

test('ambiguous aliases are explicit, while exact exchange-qualified symbols win', async () => {
  const catalog = [meta('ABC.NY', 'USD', ['ABC']), meta('ABC.L', 'GBP', ['ABC'])];
  const resolved = resolveWatchlistSymbols(['ABC', 'ABC.L'], catalog);
  assert.equal(resolved[0].ambiguous, true); assert.equal(resolved[1].canonical, 'ABC.L');
  const { engine } = harness({ catalog: async () => ({ symbols: catalog }) });
  const [row] = await engine.load(['ABC']);
  assert.equal(row.available, false); assert.equal(row.engine.reason, 'ambiguous_symbol');
});

test('unique aliases resolve to canonical IDs without relying on display tickers', async () => {
  const { engine } = harness({ catalog: async () => ({ symbols: [meta('MSFT', 'USD', ['MICROSOFT'])] }) });
  const [row] = await engine.load(['MICROSOFT'], 'quotes');
  assert.equal(row.symbol, 'MSFT'); assert.equal(row.requestedSymbol, 'MICROSOFT');
});

test('concurrent identical sets coalesce but each caller retains requested order', async () => {
  const { engine, calls } = harness();
  const [a, b] = await Promise.all([engine.load(['MSFT', 'AAPL']), engine.load(['AAPL', 'MSFT'])]);
  assert.equal(calls.length, 1);
  assert.equal(a[0].requestedSymbol, 'MSFT'); assert.equal(b[0].requestedSymbol, 'AAPL');
});

test('quote phase is independent of analysis and never exposes a fabricated recommendation', async () => {
  const { engine, calls } = harness();
  const [quick] = await engine.load(['MSFT'], 'quotes');
  assert.equal(calls[0].config.includeHistory, false); assert.equal(calls[0].config.includeNews, false);
  assert.equal(quick.price, 501.25); assert.equal(quick.confidence, null); assert.equal(quick.engine.analysisStatus, 'pending');
  const [analysis] = await engine.load(['MSFT'], 'analysis');
  assert.equal(calls[1].config.includeHistory, true); assert.equal(analysis.engine.analysisStatus, 'available');
  assert.equal(analysis.confidence, 75);
});

test('a fresh server snapshot prevents duplicate provider calls', async () => {
  const { engine, calls } = harness();
  await engine.load(['MSFT']); await engine.load(['MSFT']);
  assert.equal(calls.length, 1);
});

test('provider outage preserves last-known prices, source time, and removes target/confidence', async () => {
  let failed = false;
  const { engine, advance } = harness({ load: async ids => { if (failed) throw new Error('provider'); return result(ids.map(id => quote(id))); } });
  await engine.load(['MSFT']); failed = true; advance(181000);
  const [row] = await engine.load(['MSFT']);
  assert.equal(row.price, 501.25); assert.equal(row.engine.quoteStatus, 'last_known');
  assert.equal(row.engine.asOf, new Date(START).toISOString());
  assert.equal(row.confidence, null); assert.equal(row.targetPrice, null); assert.equal(row.signalAvailable, false);
});

test('cold serverless instances reuse the persistent snapshot without mutating observation time', async () => {
  const first = harness(); await first.engine.load(['MSFT']);
  const second = harness({ store: first.store, load: async () => { throw new Error('outage'); } });
  second.advance(181000);
  const [row] = await second.engine.load(['MSFT']);
  assert.equal(row.price, 501.25); assert.equal(row.engine.quoteStatus, 'last_known');
  assert.equal(row.engine.asOf, new Date(START).toISOString());
});

test('stale prices remain visible with their original date, not current recommendations', async () => {
  const { engine } = harness({ load: async () => result([quote('MSFT', { lastUpdated: new Date(START - 86400000).toISOString() })]) });
  const [row] = await engine.load(['MSFT']);
  assert.equal(row.price, 501.25); assert.equal(row.engine.quoteStatus, 'stale'); assert.equal(row.confidence, null);
});

test('unknown timestamps cannot enter persistent cache or authorize analysis', async () => {
  const { engine, store } = harness({ load: async () => result([quote('MSFT', { lastUpdated: null, updatedAt: null })]) });
  const [row] = await engine.load(['MSFT']);
  assert.equal(row.engine.quoteStatus, 'timestamp_unknown'); assert.equal(row.engine.asOf, null); assert.equal(row.confidence, null); assert.equal(store.size, 0);
});

test('partial provider results do not erase healthy symbols or create zero prices', async () => {
  const { engine } = harness({ load: async () => result([quote('MSFT')]) });
  const rows = await engine.load(['MSFT', 'UNSUPPORTED']);
  assert.equal(rows[0].price, 501.25); assert.equal(rows[1].price, null); assert.equal(rows[1].available, false);
});

test('invalid, future or retention-expired quotes never become good snapshots', async () => {
  for (const bad of [quote('MSFT', { price: 0 }), quote('MSFT', { price: -1 }), quote('MSFT', { lastUpdated: '2999-01-01' }), quote('MSFT', { lastUpdated: '1900-01-01' })]) {
    const { engine, store } = harness({ load: async () => result([bad]) });
    const [row] = await engine.load(['MSFT']);
    assert.equal(row.available, false); assert.equal(store.size, 0);
  }
});

test('older quotes cannot replace the last-known newer snapshot', async () => {
  let old = false;
  const { engine, advance } = harness({ load: async () => result([old ? quote('MSFT', { price: 1, lastUpdated: new Date(START - 60000).toISOString() }) : quote()]) });
  await engine.load(['MSFT']); advance(181000); old = true;
  const [row] = await engine.load(['MSFT']);
  assert.equal(row.price, 501.25); assert.equal(row.engine.reason, 'older_quote_rejected');
});

test('catalog currency mismatch fails closed instead of showing a wrong-currency price', async () => {
  const { engine } = harness({ catalog: async () => ({ symbols: [meta('MSFT')] }), load: async () => result([quote('MSFT', { currency: 'KWD' })]) });
  const [row] = await engine.load(['MSFT']); assert.equal(row.available, false);
});

test('cache exceptions cannot prevent valid provider quotes from returning', async () => {
  const { engine } = harness({ read: async () => { throw new Error('cache down'); }, write: async () => { throw new Error('cache down'); } });
  const [row] = await engine.load(['MSFT']); assert.equal(row.price, 501.25);
});

test('provider retries are cooled down after a complete miss', async () => {
  let calls = 0;
  const { engine, advance } = harness({ load: async () => { calls++; return result([]); } });
  await engine.load(['MSFT']); await engine.load(['MSFT']); assert.equal(calls, 1);
  advance(30001); await engine.load(['MSFT']); assert.equal(calls, 2);
});

test('snapshots contain no price history arrays', async () => {
  const { engine, store } = harness(); await engine.load(['MSFT']);
  const stored = [...store.values()][0]; assert.equal(stored.quote.history.length, 0); assert.equal(stored.quote.sparkline.length, 0);
});

class NextResponse extends Response { static json(body, init) { return new NextResponse(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }); } }
function routeHarness(access, load = async () => []) {
  return compile('src/app/api/watchlist/route.ts', {
    'next/server': { NextResponse }, '@/lib/server/traderAccess': { getTraderAccess: async () => access },
    '@/lib/server/rateLimiter': { rateLimitRequest: () => null },
    '@/lib/trader/watchlistEngine': { parseWatchlistSymbols, watchlistEngine: { load }, WATCHLIST_ENGINE_VERSION: 1 },
  });
}
for (const [reason, status] of [['unauthenticated', 401], ['not_approved', 403], ['database_unavailable', 503]]) {
  test(`route rejects ${reason} without fetching market data`, async () => {
    let loads = 0;
    const route = routeHarness({ allowed: false, reason }, async () => { loads++; return []; });
    const response = await route.GET(new Request('https://test.invalid/api/watchlist?symbols=MSFT'));
    assert.equal(response.status, status); assert.equal(loads, 0); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
}
test('route validates symbols before provider access and does not cache the response publicly', async () => {
  let loads = 0;
  const route = routeHarness({ allowed: true }, async () => { loads++; return []; });
  const invalid = await route.GET(new Request('https://test.invalid/api/watchlist?symbols=%3Cscript%3E'));
  assert.equal(invalid.status, 400); assert.equal(loads, 0);
  const empty = await route.GET(new Request('https://test.invalid/api/watchlist'));
  assert.equal(empty.status, 200); assert.equal((await empty.json()).status, 'empty');
});
