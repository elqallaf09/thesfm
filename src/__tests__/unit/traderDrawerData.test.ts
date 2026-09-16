import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Entry = { status: string; value?: unknown };
type Store = { read: (key: string) => Entry; load: (key: string, loader: (signal: AbortSignal) => unknown, options?: { force: boolean }) => Promise<Entry>; cancelPending: () => void };
function store(options = {}) {
  const context = vm.createContext({ window: {}, AbortController });
  vm.runInContext(readFileSync('src/trader-app/public/assets/drawer-data.js', 'utf8'), context);
  return context.window.SFMTraderDrawerData.createStore(options) as Store;
}
describe('on-demand symbol drawer request lifecycle', () => {
  it('coalesces concurrent requests and respects TTL', async () => {
    let now = 0, calls = 0;
    const s = store({ now: () => now, ttlMs: 10 }); const load = () => ++calls;
    await Promise.all([s.load('MSFT|news|ar', load), s.load('MSFT|news|ar', load)]);
    await s.load('MSFT|news|ar', load); expect(calls).toBe(1);
    now = 11; await s.load('MSFT|news|ar', load); expect(calls).toBe(2);
  });
  it('distinguishes provider failure from an empty successful result and retries explicitly', async () => {
    const s = store(); await s.load('MSFT', () => { throw new Error('429'); });
    expect(s.read('MSFT').status).toBe('error');
    await s.load('MSFT', () => [], { force: true }); expect(s.read('MSFT').status).toBe('success');
    expect(s.read('MSFT').value).toEqual([]);
  });
  it('cancels on close or symbol change without resurrecting late data', async () => {
    let release: (value: unknown) => void = () => {}; let signal: AbortSignal | undefined; let changes = 0;
    const s = store({ onChange: () => changes++ });
    const pending = s.load('MSFT', arg => { signal = arg; return new Promise(resolve => { release = resolve; }); });
    await Promise.resolve(); s.cancelPending(); expect(signal?.aborted).toBe(true);
    release({ symbol: 'MSFT' }); await pending;
    expect(s.read('MSFT').status).toBe('idle'); expect(changes).toBe(0);
  });
  it('bounds cache growth across symbols and languages', async () => {
    const s = store({ maxEntries: 2 });
    for (const key of ['MSFT|ar', 'MSFT|en', 'AAPL|ar']) await s.load(key, () => key);
    expect(s.read('MSFT|ar').status).toBe('idle'); expect(s.read('AAPL|ar').status).toBe('success');
  });
  it('ships ordered data/focus dependencies and isolated mobile CSS', () => {
    const html = readFileSync('src/trader-app/public/index.html', 'utf8');
    expect(html.indexOf('drawer-data.js')).toBeLessThan(html.indexOf('/app.js'));
    expect(html).toContain('drawer-mobile.css');
    const app = readFileSync('src/trader-app/public/app.js', 'utf8');
    const resources = readFileSync('src/trader-app/public/assets/drawer-data.js', 'utf8');
    expect(resources).toContain('symbols=${encoded}&range=90'); expect(app).toContain('data-drawer-retry');
    expect(resources).toContain('newsForSymbol = symbol'); expect(app).toContain('!state.cache.get(key).drawerOnly');
  });
  it('technical completeness never treats null, blank, boolean or array as a valid zero', () => {
    const source = readFileSync('src/app/api/market/technical-analysis/route.ts', 'utf8');
    const body = source.slice(source.indexOf('function finiteTechnicalNumber'), source.indexOf('function missingTechnicalFields'));
    const normalize = vm.runInNewContext(`(${body.replace(': unknown', '')})`) as (value: unknown) => unknown;
    for (const value of [null, undefined, '', ' ', false, [], {}, NaN]) expect(normalize(value)).toBeNull();
    expect(normalize(0)).toBe(0); expect(normalize('43.5')).toBe(43.5);
  });
});
