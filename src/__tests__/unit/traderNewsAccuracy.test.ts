import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

type Row = Record<string, unknown>;
const source = ts.createSourceFile('app.js', readFileSync('src/trader-app/public/app.js', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function functions(names: string[]) {
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) found.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found.join('\n');
}

function fixture() {
  const requests: Array<{ path: string; resolve: (value: Row) => void }> = [];
  const state = {
    route: { id: 'news' }, settings: { defaultMarket: 'us-stocks' },
    newsView: { search: '', source: 'all' }, news: {} as Row,
    rec: {}, commandCards: {}, markets: {}, calendarLoaded: {}, providerStatus: {},
  };
  const markets = [
    { id: 'us-stocks', family: 'Equities', symbols: ['AAPL'] },
    { id: 'kuwait', family: 'Boursa', symbols: ['KFH.KW'] },
    { id: 'technology', family: 'Sector', symbols: ['MSFT'] },
    { id: 'forex', family: 'FX', symbols: ['EURUSD'] },
  ];
  const scope = vm.createContext({
    URLSearchParams, state, MARKETS: markets,
    sym: (value: string) => String(value).toUpperCase(), arr: (value: unknown) => Array.isArray(value) ? value : [],
    unique: (values: string[]) => [...new Set(values)],
    currentMarket: () => markets.find(market => market.id === state.settings.defaultMarket),
    currentLanguage: () => 'en', assetType: () => 'stock', categoryFromSelection: () => 'stock',
    watchlistView: { sync() {} }, dashboardSymbols: () => ['AAPL'], marketApi: (value: string) => value,
    hydrationLoaded: new Set(), hydrationGeneration: new Map(), hydrationExpectedCacheKey: new Map(), hydrationInFlight: new Map(),
    get: (path: string) => path.startsWith('/market-news')
      ? new Promise<Row>(resolve => requests.push({ path, resolve })) : Promise.resolve({ ok: true }),
    settledValue: (result: PromiseSettledResult<Row>) => result.status === 'fulfilled' ? result.value : { ok: false },
    responseFailed: (value: Row) => value.ok === false, renderAfterData() {},
    textPair: (_ar: string, en: string) => en,
    formatProviderError: (value: unknown) => typeof value === 'string' ? value : '', UNAVAILABLE_MESSAGE: 'Unavailable',
  });
  vm.runInContext(functions(['marketForSymbol', 'marketNewsContext', 'marketNewsPath', 'hydrate', 'newsEvidence', 'newsIssueText']), scope);
  return { state, requests, scope, hydrate: scope.hydrate as (force?: boolean) => Promise<void>,
    newsPath: scope.marketNewsPath as (limit?: number, options?: Row) => string,
    evidence: scope.newsEvidence as (item: Row) => { label: string; tone: string },
  };
}

describe('Trader news requests and evidence', () => {
  it('keeps broad market headlines, sends actual search filters, and scopes asset requests', () => {
    const f = fixture();
    let params = new URL(f.newsPath(), 'https://example.test').searchParams;
    expect(params.get('symbols')).toBeNull();
    expect(params.get('markets')).toBe('US');
    f.state.settings.defaultMarket = 'kuwait';
    f.state.newsView = { search: 'dividend', source: 'Reuters' };
    params = new URL(f.newsPath(24), 'https://example.test').searchParams;
    expect(params.get('markets')).toBe('KW');
    expect(params.get('q')).toBe('dividend');
    expect(params.get('source')).toBe('Reuters');
    params = new URL(f.newsPath(6, { symbol: 'AAPL' }), 'https://example.test').searchParams;
    expect(params.get('scope')).toBe('asset');
    expect(params.get('symbol')).toBe('AAPL');
    expect(params.get('q')).toBeNull();
    expect(params.get('markets')).toBeNull();
    f.state.settings.defaultMarket = 'forex';
    expect(new URL(f.newsPath(), 'https://example.test').searchParams.get('assetTypes')).toBe('currency');
  });

  it('discards a slow old-market response after switching markets', async () => {
    const f = fixture();
    const old = f.hydrate(); await Promise.resolve();
    f.state.settings.defaultMarket = 'kuwait';
    const current = f.hydrate(); await Promise.resolve();
    f.requests[1].resolve({ ok: true, items: ['Kuwait news'] }); await current;
    f.requests[0].resolve({ ok: true, items: ['US news'] }); await old;
    expect(f.state.news.items).toEqual(['Kuwait news']);
  });

  it('refresh starts a new generation and cannot be overwritten by an older in-flight request', async () => {
    const f = fixture();
    const old = f.hydrate(); await Promise.resolve();
    const refresh = f.hydrate(true); await Promise.resolve();
    expect(f.requests[1].path).toContain('refresh=1');
    f.requests[1].resolve({ ok: true, items: ['New result'] }); await refresh;
    f.requests[0].resolve({ ok: true, items: ['Old result'] }); await old;
    expect(f.state.news.items).toEqual(['New result']);
  });

  it('deduplicates ordinary loads and retries failures without caching them as success', async () => {
    const f = fixture();
    const first = f.hydrate(), duplicate = f.hydrate(); await Promise.resolve();
    expect(f.requests).toHaveLength(1);
    f.requests[0].resolve({ ok: false }); await Promise.all([first, duplicate]);
    const retry = f.hydrate(); await Promise.resolve();
    expect(f.requests).toHaveLength(2);
    f.requests[1].resolve({ ok: true, items: [] }); await retry;
    await f.hydrate(); expect(f.requests).toHaveLength(2);
  });

  it('requires independent corroboration and exposes stored/stale news', () => {
    const f = fixture();
    expect(f.evidence({ verificationStatus: 'confirmed' }).tone).not.toBe('ok');
    expect(f.evidence({ verificationStatus: 'confirmed', independentSourceCount: 1 }).tone).not.toBe('ok');
    expect(f.evidence({ verificationStatus: 'confirmed', independentSourceCount: 2 }).tone).toBe('ok');
    expect(f.evidence({ verificationStatus: 'conflicting', isOfficial: true }).tone).toBe('warn');
    f.state.news = { stale: true, liveUpdatesAvailable: false };
    expect(f.scope.newsIssueText()).toContain('stale');
  });
});
