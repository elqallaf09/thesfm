import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const analyzer = require('../../src/trader-app/public/smart-analyzer.js');
const quoted = { symbol: 'AAPL', price: 100, available: true, technicalAvailable: true, lastUpdated: '2026-09-17T18:00:00Z', targetPrice: 110, dataQuality: 'delayed', technicalSummary: { indicators: { rsi14: 52, ema50: 95, atr: 2 } } };

test('failed signal cannot erase valid quote or mix unrelated analysis fields', () => {
  const unavailable = { symbol: 'AAPL', price: null, available: false, targetPrice: null };
  assert.deepEqual(analyzer.merge([unavailable], [quoted]), [quoted]);
  const newer = { symbol: 'AAPL', price: 105, lastUpdated: '2026-09-17T19:00:00Z' };
  assert.deepEqual(analyzer.merge([newer], [quoted]), [newer]);
  assert.equal(analyzer.merge([newer], [quoted])[0].targetPrice, undefined);
});
test('counts evidence rather than symbol-directory rows and selects a useful primary stock', () => {
  const unavailable = { symbol: 'A', price: null, available: false };
  const items = [unavailable, quoted, { symbol: 'MSFT', price: 200 }];
  assert.deepEqual(analyzer.coverage(items), { total: 3, prices: 2, analyses: 1, missing: 1, latest: Date.parse(quoted.lastUpdated) });
  assert.equal(analyzer.rank(items)[0].symbol, 'AAPL');
  assert.equal(analyzer.indicators(quoted).rsi, 52);
  assert.equal(analyzer.indicators(quoted).ema50, 95);
  assert.equal(analyzer.indicators({ rsi: null, volumeRatio: false }).volumeRatio, null);
});
test('renders technical evidence on delayed feeds, retains status, and escapes provider strings', () => {
  const h = value => String(value ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const html = analyzer.render({ ...quoted, name: '<script>test</script>' }, { h, text: (_ar, en) => en, price: String, currency: () => 'USD', status: () => ({ label: 'Delayed', body: 'Delayed evidence' }), recommendation: () => ({}), recommendationLabel: () => 'Watch', date: String, logo: () => '', titleId: 'test', lang: 'en' });
  assert.match(html, /52/); assert.match(html, /Delayed/); assert.match(html, /Not supplied/);
  assert.doesNotMatch(html, /<script>/); assert.match(html, /2026-09-17/);
});

test('shows a stale last-known price with its original timestamp without counting it as a current quote', () => {
  const stale = { ...quoted, price: null, lastKnownPrice: 100, available: false, explanation: null };
  const options = { h: String, text: (_ar, en) => en, price: String, currency: () => 'USD', status: () => ({}),
    recommendation: () => ({}), recommendationLabel: () => 'Insufficient data', date: String, logo: () => '', titleId: 'test', lang: 'en' };
  const html = analyzer.render(stale, options);
  assert.match(html, /Last known price — stale/);
  assert.match(html, /100/);
  assert.match(html, /2026-09-17T18:00:00/);
  assert.equal(analyzer.coverage([stale]).prices, 0);
  assert.equal(analyzer.coverage([stale]).analyses, 0);
  assert.doesNotThrow(() => analyzer.render({}, options));
});
