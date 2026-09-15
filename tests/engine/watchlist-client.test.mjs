import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync('src/trader-app/public/watchlist-engine.js', 'utf8');
const START = Date.parse('2026-09-15T14:00:00Z');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const quote = (id = 'MSFT', changes = {}) => ({
  symbol: id, requestedSymbol: id, price: 501.25, currency: 'USD', available: true,
  source: 'test-provider-fixture', provider: 'fmp', signalAvailable: true, confidence: 75,
  targetPrice: 520, engine: { version: 1, quoteStatus: 'available', analysisStatus: 'available',
    asOf: new Date(START).toISOString(), fetchedAt: new Date(START).toISOString() }, ...changes,
});
const response = (phase, rows) => Response.json({ ok: true, engineVersion: 1, phase, rows });
function harness(fetcher, storage) {
  let time = START, serial = 0;
  const timers = new Map(), calls = [];
  const setTimer = (fn, ms) => { const id = ++serial; timers.set(id, { fn, at: time + ms }); return id; };
  const clearTimer = id => timers.delete(id);
  const context = { AbortController, URLSearchParams, setTimeout: setTimer, clearTimeout: clearTimer };
  runInNewContext(source, context);
  const engine = context.SFMWatchlistEngine.create({
    now: () => time, random: () => 0, setTimer, clearTimer, storage,
    fetch: (url, options) => { const parsed = new URL(url, 'https://test.invalid'); calls.push({ url: parsed, options }); return fetcher(parsed, options); },
  });
  async function advance(ms) {
    const end = time + ms;
    for (let n = 0; n < 1000; n++) {
      const first = [...timers.entries()].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!first) break;
      time = first[1].at; timers.delete(first[0]); first[1].fn(); await flush();
    }
    time = end; await flush();
  }
  return { engine, calls, advance, timers };
}
function okFetch(url) { return Promise.resolve(response(url.searchParams.get('phase'), url.searchParams.get('symbols').split(',').map(id => quote(id)))); }

test('saved MSFT is requested by symbol, with staged analysis and no market filter', async () => {
  const { engine, calls } = harness(okFetch);
  engine.sync(['MSFT']); await flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.pathname, '/api/watchlist');
  assert.equal(calls[0].url.searchParams.get('symbols'), 'MSFT');
  assert.equal(calls[0].url.searchParams.get('market'), null);
  assert.equal(calls[0].url.searchParams.get('phase'), 'quotes');
  assert.equal(calls[1].url.searchParams.get('phase'), 'analysis');
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(calls[0].options.credentials, 'same-origin'); engine.stop();
});

test('repeat hydration deduplicates requests while an earlier response is in flight', async () => {
  let resolve;
  const { engine, calls } = harness(() => new Promise(done => { resolve = done; }));
  engine.sync(['MSFT']); engine.sync(['MSFT']); engine.sync(['MSFT'], { force: true });
  assert.equal(calls.length, 1);
  resolve(response('quotes', [quote('MSFT', { engine: { ...quote().engine, quoteStatus: 'stale' } })]));
  await flush(); assert.equal(calls.length, 1); engine.stop();
});

test('removing a symbol before its response arrives cannot resurrect it', async () => {
  let resolve;
  const { engine } = harness(() => new Promise(done => { resolve = done; }));
  engine.sync(['MSFT']); engine.sync([]);
  resolve(response('quotes', [quote()])); await flush();
  assert.equal(engine.rows().length, 0); engine.stop();
});

test('new symbols load immediately without changing the active market', async () => {
  const { engine, calls } = harness(okFetch);
  engine.sync(['MSFT']); await flush(); engine.sync(['MSFT', '2222.SR']); await flush();
  assert.ok(calls.some(call => call.url.searchParams.get('symbols') === '2222.SR'));
  assert.equal(engine.rows().length, 2); engine.stop();
});

test('a price is displayed before a slow analysis completes', async () => {
  let analysis;
  const { engine } = harness(url => url.searchParams.get('phase') === 'quotes'
    ? Promise.resolve(response('quotes', [quote('MSFT', { engine: { ...quote().engine, analysisStatus: 'pending' } })]))
    : new Promise(done => { analysis = done; }));
  engine.sync(['MSFT']); await flush();
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(engine.get('MSFT').engine.analysisStatus, 'pending');
  analysis(response('analysis', [quote()])); await flush(); engine.stop();
});

test('transient failures keep the last real price but remove actionable targets and confidence', async () => {
  let fail = false;
  const { engine, advance } = harness(url => fail ? Promise.reject(new Error('network')) : okFetch(url));
  engine.sync(['MSFT']); await flush(); fail = true; engine.sync(['MSFT'], { force: true }); await flush();
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(engine.get('MSFT').engine.quoteStatus, 'last_known');
  assert.equal(engine.get('MSFT').confidence, null);
  assert.equal(engine.get('MSFT').targetPrice, null);
  assert.equal(engine.get('MSFT').engine.asOf, new Date(START).toISOString());
  fail = false; await advance(2000);
  assert.equal(engine.get('MSFT').engine.quoteStatus, 'available'); engine.stop();
});

test('an empty or malformed success envelope is not cached as a successful quote', async () => {
  const { engine } = harness(() => Promise.resolve(Response.json({ ok: true, data: [] })));
  engine.sync(['MSFT']); await flush();
  assert.equal(engine.get('MSFT').available, false);
  assert.equal(engine.get('MSFT').price, null); engine.stop();
});

test('partial results retain healthy symbols and explicitly mark missing rows', async () => {
  const { engine } = harness(url => Promise.resolve(response(url.searchParams.get('phase'), [quote('MSFT')])));
  engine.sync(['MSFT', 'MISSING']); await flush();
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(engine.get('MISSING').available, false); engine.stop();
});

test('older analysis cannot overwrite a newer quote', async () => {
  const older = quote('MSFT', { price: 1, engine: { ...quote().engine, asOf: new Date(START - 60000).toISOString() } });
  const { engine } = harness(url => Promise.resolve(response(url.searchParams.get('phase'), [url.searchParams.get('phase') === 'quotes' ? quote() : older])));
  engine.sync(['MSFT']); await flush();
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(engine.get('MSFT').confidence, null); engine.stop();
});

test('Retry-After applies globally and a refresh click cannot bypass a 429', async () => {
  let failed = true;
  const { engine, calls, advance } = harness(url => failed ? Promise.resolve(new Response('', { status: 429, headers: { 'Retry-After': '120' } })) : okFetch(url));
  engine.sync(['MSFT']); await flush(); engine.sync(['MSFT', 'AAPL'], { force: true });
  await advance(119999); assert.equal(calls.length, 1);
  failed = false; await advance(1); assert.ok(calls.length >= 3); engine.stop();
});

test('401/403 clear cached rows, stop retrying, and require authentication', async () => {
  const storage = { removeItem() {}, getItem: () => null, setItem() {} };
  const { engine, calls, advance } = harness(() => Promise.resolve(new Response('', { status: 401 })), storage);
  engine.sync(['MSFT']); await flush(); await advance(600000);
  assert.equal(calls.length, 1);
  assert.equal(engine.diagnostics().blocked, true);
  assert.equal(engine.get('MSFT').engine.reason, 'authentication_required'); engine.stop();
});

test('offline/hidden routes pause work and resuming reconciles saved symbols', async () => {
  const { engine, calls, advance } = harness(okFetch);
  engine.sync(['MSFT'], { active: false }); await advance(120000); assert.equal(calls.length, 0);
  engine.sync(['MSFT'], { active: true, online: false }); await flush(); assert.equal(calls.length, 0);
  engine.sync(['MSFT'], { active: true, online: true }); await flush(); assert.equal(calls.length, 2);
  engine.sync(['MSFT'], { active: false }); await advance(120000); assert.equal(calls.length, 2); engine.stop();
});

test('requests are bounded to 12 symbols and at most two concurrent batches', async () => {
  const waits = [];
  const { engine, calls } = harness((url, options) => new Promise(resolve => {
    waits.push(() => resolve(response(url.searchParams.get('phase'), url.searchParams.get('symbols').split(',').map(id => quote(id, { engine: { ...quote().engine, quoteStatus: 'stale' } })))));
    options.signal.addEventListener('abort', () => resolve(response('quotes', [])));
  }));
  engine.sync(Array.from({ length: 35 }, (_, index) => `T${index}`));
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.searchParams.get('symbols').split(',').length <= 12));
  waits.shift()(); await flush(); assert.equal(calls.length, 3); engine.stop(); await flush();
});

test('restored snapshots are stale evidence and do not invent a newer timestamp', async () => {
  const storage = { getItem: () => JSON.stringify({ version: 1, rows: [quote()] }), setItem() {}, removeItem() {} };
  const { engine, calls } = harness(okFetch, storage);
  engine.sync(['MSFT'], { online: false }); await flush();
  assert.equal(calls.length, 0);
  assert.equal(engine.get('MSFT').price, 501.25);
  assert.equal(engine.get('MSFT').confidence, null);
  assert.equal(engine.get('MSFT').engine.asOf, new Date(START).toISOString()); engine.stop();
});

test('expired, corrupt, negative, zero and future-dated snapshots are ignored', () => {
  for (const row of [quote('MSFT', { price: 0 }), quote('MSFT', { price: -1 }), quote('MSFT', { engine: { ...quote().engine, asOf: '1900-01-01' } }), quote('MSFT', { engine: { ...quote().engine, asOf: '2999-01-01' } })]) {
    const storage = { getItem: () => JSON.stringify({ version: 1, rows: [row] }), setItem() {} };
    const { engine } = harness(okFetch, storage);
    assert.equal(engine.get('MSFT').price, null); engine.stop();
  }
});

test('hung requests time out and do not leave rows permanently loading', async () => {
  const { engine, advance } = harness((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  engine.sync(['MSFT']); await advance(30000);
  assert.equal(engine.get('MSFT').engine.quoteStatus, 'unavailable');
  assert.equal(engine.diagnostics().inFlight, 0); engine.stop();
});

test('three consecutive failures activate the bounded five-minute backoff', async () => {
  const { engine, calls, advance } = harness(() => Promise.reject(new Error('network')));
  engine.sync(['MSFT']); await flush(); await advance(2000); await advance(4000);
  assert.equal(calls.length, 3); engine.sync(['MSFT'], { force: true });
  await advance(299999); assert.equal(calls.length, 3); engine.stop();
});

test('different quote currencies cannot be blended for the same requested security', async () => {
  const { engine } = harness(url => Promise.resolve(response(url.searchParams.get('phase'), [quote('MSFT', url.searchParams.get('phase') === 'analysis' ? { currency: 'KWD', price: 1 } : {})])));
  engine.sync(['MSFT']); await flush();
  assert.equal(engine.get('MSFT').currency, 'USD'); engine.stop();
});
