import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/trader-app/public/app.js', 'utf8');
const start = source.indexOf('  function symbolPage(symbol)');
const body = source.slice(start, source.indexOf('\n  function ', start + 1));
function page(cache: Map<string, object>, symbol = 'AAPL') {
  const context = vm.createContext({
    state: { cache }, ROOT: '/thesfm-trader-own',
    sym: (value: string) => String(value || '').toUpperCase(),
    h: (value: string) => value, textPair: (_ar: string, en: string) => en,
    terminalText: (key: string) => key, hero: () => '', disclaimer: () => '',
    symbolContent: (detail: { evidence: string }) => `<article>${detail.evidence}</article>`,
  });
  vm.runInContext(body, context);
  return context.symbolPage(symbol) as string;
}

describe('full detail page during background rerenders', () => {
  it('retains loaded evidence when hydration or language preference redraws the page', () => {
    const cache = new Map<string, object>();
    expect(page(cache)).toContain('loading-panel');
    cache.set('AAPL', { drawerOnly: false, evidence: 'RSI 57 · 260 candles · 2026-09-18' });
    for (let render = 0; render < 3; render++) {
      expect(page(cache)).toContain('RSI 57 · 260 candles · 2026-09-18');
      expect(page(cache)).not.toContain('loading-panel');
    }
  });
  it('does not promote a partial drawer cache or another symbol into full details', () => {
    const cache = new Map([['AAPL', { drawerOnly: true, evidence: 'partial drawer' }]]);
    expect(page(cache)).toContain('loading-panel');
    expect(page(cache, 'MSFT')).not.toContain('partial drawer');
  });
});
