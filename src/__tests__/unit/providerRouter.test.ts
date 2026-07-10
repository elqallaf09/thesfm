/**
 * Unit tests for the market data provider router.
 *
 * Tests provider priority order, asset class detection, data validation,
 * and the guarantee that no provider names ever appear in public output.
 *
 * Run: pnpm test src/__tests__/unit/providerRouter.test.ts
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  detectAssetClass,
  validateQuote,
  unavailableRouterQuote,
  routeQuote,
  routeBatchQuotes,
  __resetRouterCacheForTests,
  type RouterQuote,
  type AssetClass,
} from '@/lib/market/providerRouter';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Silence console output in tests
beforeAll(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  __resetRouterCacheForTests();
  vi.resetModules();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROVIDER_NAMES = [
  'twelvedata', 'twelve data', 'twelve_data',
  'eodhd', 'eod historical',
  'yahoo', 'yahoo finance', 'yahoofinance',
  'fmp', 'financial modeling prep',
  'finnhub',
  'fallback', 'provider', 'source', 'debug',
];

function containsProviderName(val: unknown): boolean {
  const text = String(val ?? '').toLowerCase();
  return PROVIDER_NAMES.some(n => text.includes(n));
}

function assertNoProviderLeakage(q: RouterQuote) {
  for (const [key, val] of Object.entries(q)) {
    if (key === '_diag') continue; // internal field — only on raw provider types
    expect(containsProviderName(val)).toBe(false);
  }
  // source must always be 'THE SFM'
  expect(q.source).toBe('THE SFM');
}

function makeFreshQuote(overrides: Partial<{
  price: number; changePercent: number; lastUpdated: string;
}> = {}): RouterQuote {
  return {
    symbol:         'TEST',
    name:           'Test Corp',
    market:         'NASDAQ',
    price:          overrides.price          ?? 100,
    currency:       'USD',
    change:         1.5,
    changePercent:  overrides.changePercent  ?? 1.5,
    recommendation: null,
    confidence:     null,
    source:         'THE SFM',
    lastUpdated:    overrides.lastUpdated    ?? new Date().toISOString(),
    status:         'live',
  };
}

// ─── detectAssetClass ─────────────────────────────────────────────────────────

describe('detectAssetClass', () => {
  test.each<[string, string | null | undefined, AssetClass]>([
    // Gulf — by exchange code
    ['ZAIN',  'KW',      'gulf'],
    ['ARAMCO', 'TADAWUL', 'gulf'],
    ['EMAAR', 'DFM',     'gulf'],
    ['BATELCO', 'BH',    'gulf'],
    // Gulf — by symbol suffix
    ['ZAIN.KW',  null, 'gulf'],
    ['SABIC.SR', null, 'gulf'],
    ['EMAAR.AE', null, 'gulf'],
    // Crypto
    ['BTC',     null, 'crypto'],
    ['ETH',     null, 'crypto'],
    ['BTCUSDT', null, 'crypto'],
    ['SOLUSDT', null, 'crypto'],
    // Forex
    ['EURUSD',  null, 'forex'],
    ['EUR/USD', null, 'forex'],
    ['GBPJPY',  null, 'forex'],
    // Metals
    ['XAU',    null, 'metal'],
    ['XAG',    null, 'metal'],
    ['GOLD',   null, 'metal'],
    ['WTI',    null, 'metal'],
    ['BRENT',  null, 'metal'],
    // Indices
    ['^GSPC',  null, 'index'],
    ['SPX',    null, 'index'],
    ['DJIA',   null, 'index'],
    ['FTSE',   null, 'index'],
    ['N225',   null, 'index'],
    // US stocks (default)
    ['AAPL',   null, 'us'],
    ['MSFT',   null, 'us'],
    ['TSLA',   null, 'us'],
    ['NVDA',   null, 'us'],
  ])('symbol=%s exchange=%s → %s', (symbol, exchange, expected) => {
    expect(detectAssetClass(symbol, exchange)).toBe(expected);
  });
});

// ─── validateQuote ────────────────────────────────────────────────────────────

describe('validateQuote', () => {
  test('valid quote passes', () => {
    const result = validateQuote({ price: 100, changePercent: 1.5, lastUpdated: new Date().toISOString() });
    expect(result.valid).toBe(true);
  });

  test('price = 0 fails', () => {
    const r = validateQuote({ price: 0, changePercent: 1.5, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_price');
  });

  test('negative price fails', () => {
    const r = validateQuote({ price: -5, changePercent: 0, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_price');
  });

  test('NaN price fails', () => {
    const r = validateQuote({ price: NaN, changePercent: 0, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_price');
  });

  test('|changePercent| = 200 fails', () => {
    const r = validateQuote({ price: 50, changePercent: 200, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_change_percent');
  });

  test('|changePercent| = -250 fails', () => {
    const r = validateQuote({ price: 50, changePercent: -250, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('invalid_change_percent');
  });

  test('null changePercent is allowed', () => {
    const r = validateQuote({ price: 50, changePercent: null, lastUpdated: new Date().toISOString() });
    expect(r.valid).toBe(true);
  });

  test('stale timestamp (>15 min ago) fails', () => {
    const stale = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const r = validateQuote({ price: 50, changePercent: 1, lastUpdated: stale });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('stale_data');
  });

  test('missing timestamp fails', () => {
    const r = validateQuote({ price: 50, changePercent: 1, lastUpdated: null });
    expect(r.valid).toBe(false);
  });
});

// ─── unavailableRouterQuote ───────────────────────────────────────────────────

describe('unavailableRouterQuote', () => {
  test('returns status=unavailable', () => {
    const q = unavailableRouterQuote('META');
    expect(q.status).toBe('unavailable');
    expect(q.symbol).toBe('META');
    expect(q.source).toBe('THE SFM');
  });

  test('has no provider names in public fields', () => {
    const q = unavailableRouterQuote('BTC');
    assertNoProviderLeakage(q);
  });
});

// ─── routeQuote — provider priority ──────────────────────────────────────────

describe('routeQuote — provider priority', () => {
  const freshUpdated = new Date().toISOString();

  // We stub the provider fetchers by mocking the imported modules.
  // The router tries providers in order; tests verify correct fallback behaviour.

  beforeEach(() => {
    __resetRouterCacheForTests();
  });

  test('Twelve Data success → returns TD result without provider name in output', async () => {
    // Mock fetchTwelveDataQuote to return a valid quote
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured:  () => true,
      mapSymbolForTd:          (s: string) => s,
      fetchTwelveDataQuote:    async () => ({
        symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ',
        currency: 'USD', price: 185.5, change: 1.2, changePercent: 0.65,
        lastUpdated: freshUpdated, isMarketOpen: true,
        _diag: { provider: 'twelvedata', keyPresent: true, latencyMs: 120, fallback: false },
      }),
      fetchTwelveDataBatch: async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured:   () => false,
      fetchEodhdQuote:     async () => null,
      fetchEodhdBatch:     async () => new Map(),
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('AAPL');

    expect(q.status).not.toBe('unavailable');
    expect(q.price).toBe(185.5);
    assertNoProviderLeakage(q);
  });

  test('Twelve Data fails → EODHD fallback used', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured:  () => true,
      mapSymbolForTd:          (s: string) => s,
      fetchTwelveDataQuote:    async () => null,   // TD fails
      fetchTwelveDataBatch:    async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured:   () => true,
      fetchEodhdQuote:     async () => ({
        symbol: 'AAPL', name: null, exchange: 'US', currency: 'USD',
        price: 184.9, change: 0.6, changePercent: 0.32,
        lastUpdated: freshUpdated,
        _diag: { provider: 'eodhd', keyPresent: true, latencyMs: 200, fallback: false },
      }),
      fetchEodhdBatch: async () => new Map(),
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('AAPL');

    expect(q.price).toBe(184.9);
    assertNoProviderLeakage(q);
  });

  test('TD + EODHD both fail → Yahoo fallback used', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured:  () => true,
      mapSymbolForTd:          (s: string) => s,
      fetchTwelveDataQuote:    async () => null,
      fetchTwelveDataBatch:    async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured:   () => true,
      fetchEodhdQuote:     async () => null,
      fetchEodhdBatch:     async () => new Map(),
    }));
    // Yahoo is imported dynamically inside the router via `import('yahoo-finance2')`
    vi.doMock('yahoo-finance2', () => ({
      default: {
        quote: async () => ({
          regularMarketPrice: 183.1, regularMarketChange: -0.5,
          regularMarketChangePercent: -0.27, regularMarketTime: Math.floor(Date.now() / 1000),
          currency: 'USD', longName: 'Apple Inc.', fullExchangeName: 'NasdaqGS',
        }),
      },
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('AAPL');

    expect(q.price).toBe(183.1);
    assertNoProviderLeakage(q);
  });

  test('All providers fail → unavailable placeholder returned (no throw)', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured: () => false,
      mapSymbolForTd:         (s: string) => s,
      fetchTwelveDataQuote:   async () => null,
      fetchTwelveDataBatch:   async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured: () => false,
      fetchEodhdQuote:   async () => null,
      fetchEodhdBatch:   async () => new Map(),
    }));
    vi.doMock('yahoo-finance2', () => ({
      default: { quote: async () => { throw new Error('network'); } },
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('ZZZZ');

    expect(q.status).toBe('unavailable');
    expect(q.price).toBe(0);
    expect(q.source).toBe('THE SFM');
    assertNoProviderLeakage(q);
  });
});

// ─── routeQuote — invalid data rejection ─────────────────────────────────────

describe('routeQuote — data validation', () => {
  const freshUpdated = new Date().toISOString();

  test('price = 0 from provider → falls through to next provider', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured: () => true,
      mapSymbolForTd:         (s: string) => s,
      fetchTwelveDataQuote:   async () => ({
        symbol: 'TEST', name: null, exchange: null, currency: 'USD',
        price: 0, change: 0, changePercent: 0, lastUpdated: freshUpdated,
        isMarketOpen: false,
        _diag: { provider: 'twelvedata', keyPresent: true, latencyMs: 50, fallback: false },
      }),
      fetchTwelveDataBatch: async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured: () => true,
      fetchEodhdQuote:   async () => ({
        symbol: 'TEST', name: null, exchange: null, currency: 'USD',
        price: 42, change: 0, changePercent: 0, lastUpdated: freshUpdated,
        _diag: { provider: 'eodhd', keyPresent: true, latencyMs: 80, fallback: false },
      }),
      fetchEodhdBatch: async () => new Map(),
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('TEST');

    // EODHD result with valid price should be used
    expect(q.price).toBe(42);
    expect(q.status).not.toBe('unavailable');
  });

  test('|changePercent| ≥ 200 from provider → falls through', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured: () => true,
      mapSymbolForTd:         (s: string) => s,
      fetchTwelveDataQuote:   async () => ({
        symbol: 'TEST', name: null, exchange: null, currency: 'USD',
        price: 50, change: 99, changePercent: 250, lastUpdated: freshUpdated,
        isMarketOpen: true,
        _diag: { provider: 'twelvedata', keyPresent: true, latencyMs: 50, fallback: false },
      }),
      fetchTwelveDataBatch: async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured: () => false,
      fetchEodhdQuote:   async () => null,
      fetchEodhdBatch:   async () => new Map(),
    }));
    vi.doMock('yahoo-finance2', () => ({
      default: {
        quote: async () => ({
          regularMarketPrice: 55, regularMarketChange: 1,
          regularMarketChangePercent: 1.85,
          regularMarketTime: Math.floor(Date.now() / 1000),
          currency: 'USD', longName: 'Test Corp', fullExchangeName: 'NYSE',
        }),
      },
    }));

    const { routeQuote: rq } = await import('@/lib/market/providerRouter');
    const q = await rq('TEST');

    // Yahoo result (valid changePercent) should be used
    expect(q.price).toBe(55);
    expect(q.changePercent).toBeCloseTo(1.85);
  });
});

// ─── No provider name in public output ───────────────────────────────────────

describe('public output — no provider leakage', () => {
  test('source is always THE SFM', () => {
    const q = unavailableRouterQuote('META');
    expect(q.source).toBe('THE SFM');
  });

  test('unavailable quote contains no provider names', () => {
    const symbols = ['BTC', 'EURUSD', 'XAU', 'ZAIN.KW', 'AAPL'];
    for (const sym of symbols) {
      const q = unavailableRouterQuote(sym);
      assertNoProviderLeakage(q);
    }
  });
});

// ─── routeBatchQuotes ─────────────────────────────────────────────────────────

describe('routeBatchQuotes', () => {
  test('returns unavailable for empty input', async () => {
    const result = await routeBatchQuotes([]);
    expect(result.size).toBe(0);
  });

  test('deduplicates symbols', async () => {
    vi.doMock('@/lib/market/providers/twelveData', () => ({
      isTwelveDataConfigured: () => false,
      mapSymbolForTd:         (s: string) => s,
      fetchTwelveDataQuote:   async () => null,
      fetchTwelveDataBatch:   async () => new Map(),
    }));
    vi.doMock('@/lib/market/providers/eodhd', () => ({
      isEodhdConfigured: () => false,
      fetchEodhdQuote:   async () => null,
      fetchEodhdBatch:   async () => new Map(),
    }));
    vi.doMock('yahoo-finance2', () => ({
      default: { quote: async () => null },
    }));

    const { routeBatchQuotes: rbq } = await import('@/lib/market/providerRouter');
    const result = await rbq(['AAPL', 'AAPL', 'aapl']);
    expect(result.size).toBe(1); // deduplicated
  });
});
