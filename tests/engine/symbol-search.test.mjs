import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const search = require('../../src/trader-app/public/assets/symbol-search.js');

test('search opens only a canonical resolved identity, never a raw name or a partial suggestion', () => {
  assert.equal(search.canonicalSymbol({ symbol: 'ذهب' }), null);
  assert.equal(search.selection({ resolved: { symbol: 'ذهب' } }), null);
  assert.equal(search.selection({ results: [{ symbol: 'AAPL' }] }), null);
  assert.equal(search.selection({ resolved: { symbol: 'XAUUSD' } }).symbol, 'XAUUSD');
  assert.equal(search.canonicalSymbol({ symbol: 'BTC/USD' }), 'BTC/USD');
  assert.equal(search.canonicalSymbol({ symbol: 'NBK.KW' }), 'NBK.KW');
  assert.equal(search.canonicalSymbol({ symbol: '<script>' }), null);
});
