import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Row = Record<string, unknown>;
type Entry = { status: string; promise?: Promise<unknown> };
type Store = { read: (key: string) => Entry };
type Controller = {
  loadDrawerData: (tab: string, force?: boolean) => void;
  drawerResources: (tab: string) => string[];
  drawerLoadedContext: (symbol: string) => { asset: Row; rec: Row; cachedDetail: Row };
};
function harness(watchRow: Row | null = null) {
  const scope = vm.createContext({ window: {}, AbortController });
  vm.runInContext(readFileSync('src/trader-app/public/assets/drawer-data.js', 'utf8'), scope);
  const api = scope.window.SFMTraderDrawerData;
  const drawerData = api.createStore() as Store;
  const stale = { symbol: 'MSFT', price: 100, provider: 'old quote fixture', asOf: '2026-09-01T10:00:00Z', confidence: 72 };
  const fresh = { symbol: 'MSFT', price: 151.23, provider: 'new quote fixture', asOf: '2026-09-02T10:00:00Z' };
  const cache = new Map<string, Row>([['MSFT', { asset: stale, rec: stale, drawerOnly: false }]]);
  let quote: Row = fresh;
  let signal: Row = { ...stale, price: 101 };
  const sym = (value: unknown) => String(value || '').toUpperCase();
  const identity = (value: Row) => ({ ...value });
  const controller = api.createController({
    state: { drawer: { symbol: 'MSFT' }, cache, marketCache: new Map(), commandCards: {} },
    drawerData, sym, currentLanguage: () => 'ar', textPair: (_ar: string, en: string) => en,
    h: (value: string) => value, payloadFeatureState: () => ({ key: 'available' }),
    marketForSymbol: () => ({ id: 'us' }), currentMarket: () => ({ id: 'us' }), marketApi: (value: string) => value,
    marketNewsPath: () => '/market/news',
    get: async (path: string) => {
      if (path.startsWith('/recommendations')) return { ok: true, recommendations: [quote] };
      if (path.startsWith('/market/asset-profile')) return { ok: true, profile: { symbol: 'MSFT', name: 'Fixture Microsoft', price: null, currentPrice: null } };
      if (path.startsWith('/sfm-market/v1/trader/signal/')) return { ok: true, signal };
      return { ok: true, points: [] };
    },
    findAssetForSymbol: (symbol: string, rows: Row[]) => rows.find(row => sym(row.symbol) === sym(symbol)),
    legacyRecsFrom: (payload: Row) => (payload.recommendations || []) as Row[],
    normalizeQuote: identity, norm: identity, symbolAliases: (symbol: string) => [sym(symbol)],
    signalToRec: identity, technicalPayloadFromResponse: identity,
    isTechnicalUnavailablePayload: () => true, technicalUnavailableReason: () => 'Fixture has no technical coverage',
    arr: (value: unknown) => Array.isArray(value) ? value : [],
    mergeRecLists: (...lists: Row[][]) => lists.flat(), recs: () => [stale],
    marketUniverseRows: () => [], matchRec: () => stale, lookupWatchlist: () => watchRow,
  }) as Controller;
  return {
    cache, drawerData, controller, fresh,
    setQuote: (row: Row) => { quote = row; }, setSignal: (row: Row) => { signal = row; },
    async load(tab: string, force = false) {
      controller.loadDrawerData(tab, force);
      await Promise.all(controller.drawerResources(tab).map(kind => drawerData.read(`MSFT|${kind}|ar`).promise));
    },
  };
}

describe('drawer quote and symbol integrity with a warm recommendation cache', () => {
  it('keeps the fetched quote and its evidence ahead of cached list and signal prices', async () => {
    const fixture = harness();
    await fixture.load('summary');
    expect(fixture.controller.drawerLoadedContext('MSFT').asset).toMatchObject(fixture.fresh);
    expect(fixture.controller.drawerLoadedContext('MSFT').rec.price).toBe(100);
    expect(fixture.cache.get('MSFT')?.drawerOnly).toBe(false);
  });
  it('a later signal/history response does not resurrect a stale quote', async () => {
    const fixture = harness();
    await fixture.load('summary');
    await fixture.load('technical');
    const context = fixture.controller.drawerLoadedContext('MSFT');
    expect(context.asset).toMatchObject(fixture.fresh);
    expect(context.rec.price).toBe(101);
    expect(context.asset.history).toEqual([]);
  });
  it('does not substitute a stale recommendation price when the fetched value is null', async () => {
    const fixture = harness();
    fixture.setQuote({ ...fixture.fresh, price: null });
    await fixture.load('summary');
    expect(fixture.controller.drawerLoadedContext('MSFT').asset.price).toBeNull();
  });
  it('rejects a wrong-symbol quote, keeps the last good value and supports explicit retry', async () => {
    const fixture = harness();
    await fixture.load('summary');
    fixture.setQuote({ symbol: 'NVDA', price: 999 });
    await fixture.load('summary', true);
    expect(fixture.drawerData.read('MSFT|quote|ar').status).toBe('error');
    expect(fixture.controller.drawerLoadedContext('MSFT').asset).toMatchObject(fixture.fresh);
    fixture.setQuote({ ...fixture.fresh, price: 152.34 });
    await fixture.load('summary', true);
    expect(fixture.drawerData.read('MSFT|quote|ar').status).toBe('success');
    expect(fixture.controller.drawerLoadedContext('MSFT').asset.price).toBe(152.34);
  });
  it('does not let an empty watchlist observation erase the fetched price or its availability', async () => {
    const fixture = harness({ symbol: 'MSFT', price: null, available: false });
    fixture.setQuote({ ...fixture.fresh, available: true });
    await fixture.load('summary');
    expect(fixture.controller.drawerLoadedContext('MSFT').asset).toMatchObject({ ...fixture.fresh, available: true });
  });
  it('does not silently accept another symbol as a successful signal request', async () => {
    const fixture = harness();
    fixture.setSignal({ symbol: 'NVDA', price: 999 });
    await fixture.load('recommendation');
    expect(fixture.drawerData.read('MSFT|signal|ar').status).toBe('error');
    expect(fixture.controller.drawerLoadedContext('MSFT').rec.symbol).toBe('MSFT');
  });
});
