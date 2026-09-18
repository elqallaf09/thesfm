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
  assert.deepEqual(analyzer.coverage(items), { total: 3, prices: 2, analyses: 1, references: 0, missing: 1, latest: Date.parse(quoted.lastUpdated) });
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
  assert.equal(analyzer.coverage([stale]).analyses, 1);
  assert.doesNotThrow(() => analyzer.render({}, options));
});

test('retains normalized confidence and canonical observation time in the watchlist research drawer', () => {
  const item = { symbol: 'MSFT', price: 501.25, engine: { asOf: '2026-09-17T19:00:00Z' } };
  const options = { h: String, text: (_ar, en) => en, price: String, currency: () => 'USD', status: () => ({}),
    recommendation: () => ({ evidenceReady: true, confidence: 75, targetPrice: 550, stopLoss: 480, riskReward: 2.3 }),
    recommendationLabel: () => 'Buy', date: String, logo: () => '', titleId: 'drawer-analysis-terminal-title', lang: 'en' };
  const html = analyzer.render(item, options);
  assert.match(html, /75%/);
  assert.match(html, /2026-09-17T19:00:00/);
  assert.match(html, /550/);
  assert.doesNotMatch(html, /data-symbol-details/);
  const blocked = analyzer.render({ ...item, explanationEn: 'Unsafe bullish prose' }, { ...options,
    recommendation: () => ({ evidenceReady: false, confidence: null, reason: 'Insufficient data' }) });
  assert.doesNotMatch(blocked, /75%|550|Unsafe bullish prose/);
});

for (const [language, label] of [['ar', 'سعر يومي مرجعي'], ['en', 'Daily reference price'], ['fr', 'Cours journalier indicatif']]) {
  test(`daily reference presentation preserves date precision and analytical evidence in ${language}`, () => {
    const item = { ...quoted, price: null, available: false, lastKnownPrice: 100, samples: 260,
      technicalAsOf: '2026-09-17', lastUpdated: '2026-09-17T00:00:00Z',
      priceReference: { kind: 'daily', precision: 'date', changePercent: 1.75, volume: 1000000 } };
    const html = analyzer.render(item, { h: String, text: (...labels) => labels[['ar', 'en', 'fr'].indexOf(language)],
      price: String, currency: () => 'USD', status: () => ({}), recommendation: () => ({ evidenceReady: false }),
      recommendationLabel: () => 'Insufficient data', date: String, logo: () => '', titleId: 'test', lang: language });
    assert.match(html, new RegExp(label));
    assert.match(html, /2026-09-17/); assert.doesNotMatch(html, /00:00:00/);
    assert.match(html, /1.75%/); assert.match(html, /1,000,000/);
    assert.deepEqual(analyzer.coverage([item]), { total: 1, prices: 0, references: 1, analyses: 1, missing: 0, latest: Date.parse(item.lastUpdated) });
  });
}

const researchPresenter = require('../../src/trader-app/public/assets/research-evidence.js');
for (const [index, language] of ['ar', 'en', 'fr'].entries()) {
  test(`research evidence remains informative without a tradeable quote in ${language}`, () => {
    const research = { basis: 'daily_history', available: true, technicalAvailable: true, samples: 260,
      asOf: '2026-09-18', provider: '<script>bad</script>', freshness: 'recent', confidence: 64,
      technicalSummary: { indicators: { rsi14: 57 } },
      dataSufficiency: { strategyCoverage: { available: 7, total: 9 } },
      risk: { annualizedVolatilityPercent: 23.45, maximumDrawdownPercent: 7.89, drawdownSamples: 120 } };
    const h = value => String(value ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const text = (...values) => values[index];
    const item = { available: false, price: null, research };
    const html = researchPresenter.render(item, { h, text });
    assert.match(html, /64%/); assert.match(html, /23.45%/); assert.match(html, /7.89%/);
    assert.match(html, /2026-09-18/); assert.match(html, /260/); assert.doesNotMatch(html, /<script>/);
    assert.equal(researchPresenter.technical(item).technicalAvailable, true);
    assert.equal(researchPresenter.technical(item).currentPrice, null);
    const missing = researchPresenter.render({ research: { ...research, confidence: null, risk: {} } }, { h, text });
    assert.doesNotMatch(missing, /0%|64%/);
    assert.equal(researchPresenter.render({}, { h, text }), '');
  });
}
