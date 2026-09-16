import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Row = Record<string, unknown>;
type Entry = { status: string; promise?: Promise<unknown> };

async function loadFixture(tab: string, payload: Row) {
  const context = vm.createContext({ window: {}, AbortController });
  vm.runInContext(readFileSync('src/trader-app/public/assets/drawer-data.js', 'utf8'), context);
  const api = context.window.SFMTraderDrawerData;
  const store = api.createStore() as { read: (key: string) => Entry };
  const cache = new Map<string, Row>();
  const sym = (value: unknown) => String(value ?? '').toUpperCase();
  const identity = (value: Row) => ({ ...value });
  const controller = api.createController({
    state: { drawer: { symbol: 'MSFT' }, cache, marketCache: new Map(), commandCards: {} },
    drawerData: store, sym, currentLanguage: () => 'ar',
    textPair: (_ar: string, en: string) => en, h: (value: string) => value,
    payloadFeatureState: () => ({ key: 'unavailable' }),
    marketForSymbol: () => ({ id: 'us' }), currentMarket: () => ({ id: 'us' }),
    marketApi: (value: string) => value, marketNewsPath: () => '/market/news', get: async () => payload,
    findAssetForSymbol: () => null, legacyRecsFrom: () => [], normalizeQuote: identity, norm: identity,
    symbolAliases: (symbol: string) => [sym(symbol)], signalToRec: identity,
    technicalPayloadFromResponse: identity, isTechnicalUnavailablePayload: () => true,
    technicalUnavailableReason: () => 'fixture', arr: (value: unknown) => Array.isArray(value) ? value : [],
    mergeRecLists: (...lists: Row[][]) => lists.flat(), recs: () => [], marketUniverseRows: () => [], matchRec: () => null,
  });
  controller.loadDrawerData(tab);
  const kinds = controller.drawerResources(tab) as string[];
  await Promise.all(kinds.map(kind => store.read(`MSFT|${kind}|ar`).promise));
  return { store, cache, kinds };
}

describe('valid empty symbol collections are not transport failures', () => {
  it.each(['earnings', 'news'])('accepts an explicit empty %s response', async tab => {
    const payload = { ok: false, success: false, status: 'empty', data: [], failureReason: null, stale: false };
    const fixture = await loadFixture(tab, payload);
    for (const kind of fixture.kinds) {
      expect(fixture.store.read(`MSFT|${kind}|ar`).status).toBe('success');
      expect(fixture.cache.get('MSFT')?.[kind]).toEqual(payload);
    }
  });

  it.each([
    { status: 'rate_limited', failureReason: 'quota' },
    { status: 'provider_error', failureReason: 'network' },
    { status: 'empty', failureReason: 'provider failed' },
    { status: 'empty', stale: true },
  ])('keeps actual provider failures retryable: %j', async failure => {
    const fixture = await loadFixture('earnings', { ok: false, data: [], ...failure });
    for (const kind of fixture.kinds) expect(fixture.store.read(`MSFT|${kind}|ar`).status).toBe('error');
  });

  it('does not treat an empty quote or profile as valid market data', async () => {
    const fixture = await loadFixture('summary', { ok: false, status: 'empty', data: [], failureReason: null });
    for (const kind of fixture.kinds) expect(fixture.store.read(`MSFT|${kind}|ar`).status).toBe('error');
  });
});
