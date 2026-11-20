import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { FxRateResult } from '@/lib/market/fxRates';
import { normalizeInvestment, type DbInvestmentRow } from '@/lib/investments/investmentUtils';
import { tvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';
import { portfolioMarketTarget } from '@/lib/server/markets-tv/portfolioAssets';

const mocks = vi.hoisted(() => ({ quotes: vi.fn(), special: vi.fn(), fx: vi.fn(), after: vi.fn() }));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('@/lib/server/markets-tv/quoteLoader', () => ({ resolveTvQuotes: mocks.quotes }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: mocks.special }));
vi.mock('@/lib/market/fxRates', () => ({ getFxRate: mocks.fx }));
import { __resetPortfolioQuoteCacheForTests, usablePortfolioFx, withPortfolioMarketValues } from '@/lib/server/markets-tv/portfolioMarketValues';

const NOW = Date.parse('2026-11-20T00:00:00Z');
const OBSERVED = '2026-11-19T23:58:00Z';
const OLD = '2026-09-01T12:00:00Z';
const item = (extra: Partial<DbInvestmentRow> = {}) => normalizeInvestment({ id: 'fixture-position', name: 'Private fixture title', type: 'stocks',
  symbol: 'AMD', provider_symbol: 'AMD', market: 'الأسواق الأمريكية', quantity: 2,
  amount: null, current_value: 120, purchase_total: 100, currency: 'USD', native_currency: 'USD', price_currency: 'USD',
  valuation_source: 'Recorded source', valuation_last_updated_at: OLD, created_at: OLD, ...extra });
const land = (currency = 'KWD', extra: Partial<DbInvestmentRow> = {}) => item({ id: 'land', type: 'realEstate',
  symbol: null, provider_symbol: null, market: null, quantity: null, currency, native_currency: currency, price_currency: currency,
  current_value: 1000, purchase_total: 900, ...extra });
const quote = (symbol = 'AMD', changes: Partial<TvQuote> = {}): TvQuote => ({ symbol, name: symbol, nameAr: symbol, price: 200, currency: 'USD',
  source: 'Verified fixture provider', observedAt: OBSERVED, receivedAt: new Date(NOW).toISOString(), status: 'delayed', delayType: 'delayed',
  exchange: 'NASDAQ', country: 'US', changePercent: null, ...changes });
const fx = (changes: Partial<FxRateResult> = {}): FxRateResult => ({ from: 'USD', to: 'KWD', rate: 0.3, available: true,
  stale: false, identityVerified: true, source: 'Verified fixture FX', lastUpdated: '2026-11-19T16:00:00Z', ...changes });
function pairFx(from: string, to: string): FxRateResult {
  const rates: Record<string, number> = { 'USD:KWD': 0.3, 'KWD:USD': 10 / 3 };
  const rate = rates[`${from}:${to}`];
  return rate === undefined
    ? fx({ from, to, rate: null, available: false, identityVerified: false, source: null, lastUpdated: null })
    : fx({ from, to, rate });
}
function special(symbol: string, providerSymbol: string, type: 'crypto' | 'commodity', provider = 'fmp'): SfmMarketQuote {
  return { schemaVersion: 'sfm-market.v1', engine: 'THE SFM Market Data Engine', engineVersion: '1.0.0', symbol, name: symbol,
    assetType: type, market: 'Fixture', exchange: type === 'crypto' ? 'Crypto' : 'OTC', country: 'Global', currency: 'USD', price: 100,
    change: null, changePercent: null, open: null, high: null, low: null, previousClose: null, volume: null,
    quality: { state: 'complete', score: 100, completenessPercent: 100, freshnessSeconds: 120, missingFields: [], reasons: [] },
    provenance: { sourceClass: 'aggregator', upstreamProvider: provider, upstreamProviderName: provider, providerSymbol,
      observedAt: OBSERVED, receivedAt: new Date(NOW).toISOString(), delayType: 'realtime', cached: false, cacheAgeSeconds: null, attemptCount: 1,
      derivedFields: [], observation: { precision: 'instant', marketOpen: null } } };
}
const snapshot = (items: ReturnType<typeof item>[], currency = 'USD') => tvPortfolioSnapshot(items, currency, NOW - 5000);

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW); vi.clearAllMocks(); __resetPortfolioQuoteCacheForTests();
  mocks.quotes.mockResolvedValue([quote()]); mocks.fx.mockImplementation(async (from: string, to: string) => pairFx(from, to)); mocks.special.mockResolvedValue(null);
});
afterEach(() => { vi.useRealTimers(); __resetPortfolioQuoteCacheForTests(); });

describe('verified TV portfolio market overlay', () => {
  it('values each position separately, recomputes allocation, and never changes cost, saved data or private titles', async () => {
    const items = [item(), item({ id: 'second-platform', quantity: 3, name: 'Another private fixture', purchase_platform_name: 'Another platform' }),
      item({ id: 'land', type: 'realEstate', symbol: 'AMD', current_value: 1000, purchase_total: 900 })];
    const original = JSON.stringify(items), saved = snapshot(items);
    const result = await withPortfolioMarketValues(items, saved);
    expect(result).toMatchObject({ total: 3, totalValue: 2000, totalCost: 1100, valueCoverage: 3, costCoverage: 3, marketCoverage: 2, marketEligible: 2 });
    expect(result.allocation).toEqual([{ assetClass: 'stocks', amount: 1000, count: 2 }, { assetClass: 'real-estate', amount: 1000, count: 1 }]);
    expect(result.positions[0]).toMatchObject({ name: 'Private fixture title', quantity: 2, value: { amount: 400, currency: 'USD' }, baseCost: 100,
      valuationKind: 'market', quoteStatus: 'delayed', valuedAt: OBSERVED, recordedValuedAt: OLD, recordedValue: { amount: 120, currency: 'USD' } });
    expect(result.positions[1]).toMatchObject({ baseValue: 600, platform: 'Another platform' });
    expect(result.positions[2]).toMatchObject({ valuationKind: 'manual', baseValue: 1000, valuedAt: OLD });
    expect(result.generatedAt).toBe(saved.generatedAt);
    expect(JSON.stringify(items)).toBe(original);
    expect(mocks.quotes).toHaveBeenCalledTimes(1);
    const assets = mocks.quotes.mock.calls[0][0]; expect(assets).toHaveLength(1);
    expect(JSON.stringify(assets)).not.toMatch(/Private fixture|Another platform|quantity|owner|purchase/);
    expect(mocks.fx).not.toHaveBeenCalled();
  });

  it('uses an independently dated verified FX rate and keeps quote time separate', async () => {
    const items = [item()]; const result = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(result).toMatchObject({ totalValue: 120, totalCost: 30, valueCoverage: 1, costCoverage: 1, marketCoverage: 1 });
    expect(result.positions[0]).toMatchObject({ value: { amount: 400, currency: 'USD' }, baseValue: 120,
      holdingCurrency: 'USD', holdingValue: { amount: 400, currency: 'USD' }, cost: { amount: 100, currency: 'USD' }, baseCost: 30,
      valuedAt: OBSERVED, fxAt: '2026-11-19T16:00:00Z', fxSource: 'Verified fixture FX' });
    expect(mocks.fx).toHaveBeenCalledWith('USD', 'KWD');
  });

  it.each<Partial<FxRateResult>>([
    { available: false }, { stale: true }, { identityVerified: false }, { from: 'EUR' }, { to: 'EUR' },
    { lastUpdated: null }, { lastUpdated: '2020-01-01T00:00:00Z' }, { lastUpdated: '2099-01-01T00:00:00Z' }, { rate: 0 },
  ])('keeps native amounts and excludes every valuation kind when FX evidence is invalid: %j', async changes => {
    mocks.fx.mockResolvedValue(fx(changes));
    const items = [item({ user_currency: 'KWD', converted_market_value: 36, fx_source: 'old saved FX' }),
      land('USD', { user_currency: 'KWD', converted_market_value: 300, fx_source: 'old saved FX' }),
      item({ id: 'unresolved', quantity: null, user_currency: 'KWD', converted_market_value: 36, fx_source: 'old saved FX' })];
    const result = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', value: { amount: 400, currency: 'USD' }, baseValue: null,
      baseCost: null, cost: { amount: 100, currency: 'USD' }, valuationIssue: 'fx_unavailable', recordedBaseValue: 36 });
    expect(result.positions[1]).toMatchObject({ valuationKind: 'manual', value: { amount: 1000, currency: 'USD' },
      holdingValue: { amount: 1000, currency: 'USD' }, cost: { amount: 900, currency: 'USD' }, baseValue: null, baseCost: null, valuedAt: OLD });
    expect(result.positions[2]).toMatchObject({ valuationKind: 'recorded', value: { amount: 120, currency: 'USD' },
      holdingValue: { amount: 120, currency: 'USD' }, cost: { amount: 100, currency: 'USD' }, baseValue: null, baseCost: null, valuedAt: OLD });
    expect(result).toMatchObject({ total: 3, totalValue: null, totalCost: null, valueCoverage: 0, costCoverage: 0, marketCoverage: 0, marketEligible: 2 });
    expect(result.allocation).toEqual([]);
  });

  it.each<Partial<TvQuote>>([
    { observedAt: null }, { observedAt: '2099-01-01T00:00:00Z' }, { observedAt: OLD }, { price: NaN }, { price: 0 },
    { currency: 'EUR' }, { symbol: 'NVDA' }, { issue: 'identity_mismatch' }, { source: null },
  ])('retains the saved valuation and clock when a quote is unverified: %j', async changes => {
    mocks.quotes.mockResolvedValue([quote('AMD', changes)]);
    const items = [item()]; const result = await withPortfolioMarketValues(items, snapshot(items));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'recorded', baseValue: 120, valuedAt: OLD, source: 'Recorded source', valuationIssue: 'quote_unavailable' });
    expect(result.marketCoverage).toBe(0);
  });

  it('accepts a dated market close while retaining its original close time', async () => {
    const closedAt = '2026-11-18T21:00:00Z';
    mocks.quotes.mockResolvedValue([quote('AMD', { status: 'closed', delayType: 'eod', observedAt: closedAt })]);
    const items = [item()]; const result = await withPortfolioMarketValues(items, snapshot(items));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', quoteStatus: 'closed', valuedAt: closedAt });
  });

  it('never replaces a newer recorded valuation with an older provider observation', async () => {
    const items = [item({ valuation_last_updated_at: '2026-11-19T23:59:00Z' })];
    const result = await withPortfolioMarketValues(items, snapshot(items));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'recorded', baseValue: 120, valuedAt: '2026-11-19T23:59:00Z' });
  });
});

describe('selected portfolio currency and original amounts', () => {
  it('converts manual KWD land and its original purchase cost when USD is selected', async () => {
    const items = [land()], original = JSON.stringify(items);
    const result = await withPortfolioMarketValues(items, snapshot(items, 'USD'));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'manual', value: { amount: 1000, currency: 'KWD' },
      holdingCurrency: 'KWD', holdingValue: { amount: 1000, currency: 'KWD' }, cost: { amount: 900, currency: 'KWD' }, baseCost: 3000,
      valuedAt: OLD, freshness: 'stale', source: 'Recorded source', fxAt: '2026-11-19T16:00:00Z', fxSource: 'Verified fixture FX' });
    expect(result.positions[0].baseValue).toBeCloseTo(10000 / 3, 8);
    expect(result.totalValue).toBeCloseTo(10000 / 3, 8);
    expect(result).toMatchObject({ totalCost: 3000, valueCoverage: 1, costCoverage: 1, marketCoverage: 0, marketEligible: 0 });
    expect(result.allocation).toHaveLength(1);
    expect(result.allocation[0]).toMatchObject({ assetClass: 'real-estate', count: 1 });
    expect(result.allocation[0].amount).toBeCloseTo(10000 / 3, 8);
    expect(mocks.fx).toHaveBeenCalledExactlyOnceWith('KWD', 'USD');
    expect(mocks.quotes).not.toHaveBeenCalled(); expect(mocks.special).not.toHaveBeenCalled();
    expect(JSON.stringify(items)).toBe(original);
  });

  it('converts the recorded USD valuation and cost when its market quote is unavailable', async () => {
    mocks.quotes.mockResolvedValue([]);
    const items = [item()];
    const result = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'recorded', valuationIssue: 'quote_unavailable',
      value: { amount: 120, currency: 'USD' }, holdingCurrency: 'USD', holdingValue: { amount: 120, currency: 'USD' },
      cost: { amount: 100, currency: 'USD' }, baseValue: 36, baseCost: 30, valuedAt: OLD, source: 'Recorded source',
      fxAt: '2026-11-19T16:00:00Z', fxSource: 'Verified fixture FX' });
    expect(result).toMatchObject({ totalValue: 36, totalCost: 30, valueCoverage: 1, costCoverage: 1, marketCoverage: 0, marketEligible: 1 });
    expect(mocks.fx).toHaveBeenCalledExactlyOnceWith('USD', 'KWD');
  });

  it('switches display currencies from original USD values without reusing or converting the saved KWD amount twice', async () => {
    mocks.quotes.mockResolvedValue([]);
    mocks.fx.mockImplementation(async (from: string, to: string) => fx({ from, to, rate: 0.25 }));
    const items = [item({ current_market_value: 120, native_market_value: 120, user_currency: 'KWD',
      converted_market_value: 36, fx_source: 'Saved historical FX', fx_last_updated_at: OLD })];
    const original = JSON.stringify(items);
    const kwd = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(kwd.positions[0]).toMatchObject({ value: { amount: 120, currency: 'USD' }, holdingCurrency: 'USD',
      holdingValue: { amount: 120, currency: 'USD' }, cost: { amount: 100, currency: 'USD' },
      baseValue: 30, baseCost: 25, recordedBaseValue: 36, valuedAt: OLD });
    expect(kwd).toMatchObject({ totalValue: 30, totalCost: 25 });
    const usd = await withPortfolioMarketValues(items, snapshot(items, 'USD'));
    expect(usd.positions[0]).toMatchObject({ value: { amount: 120, currency: 'USD' }, baseValue: 120, baseCost: 100 });
    expect(usd).toMatchObject({ totalValue: 120, totalCost: 100 });
    const kwdAgain = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(kwdAgain.positions[0]).toMatchObject({ value: { amount: 120, currency: 'USD' }, baseValue: 30, baseCost: 25, recordedBaseValue: 36 });
    expect(JSON.stringify(items)).toBe(original);
  });

  it('keeps a KWD holding value and native purchase cost when the quote and selected display are USD', async () => {
    const items = [item({ currency: 'KWD', current_value: 36, purchase_total: 90, current_market_value: 120,
      native_market_value: 120, user_currency: 'KWD', converted_market_value: 36, fx_source: 'Saved historical FX' })];
    const result = await withPortfolioMarketValues(items, snapshot(items, 'USD'));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', value: { amount: 400, currency: 'USD' }, baseValue: 400,
      holdingCurrency: 'KWD', holdingValue: { amount: 120, currency: 'KWD' }, cost: { amount: 90, currency: 'KWD' }, baseCost: 300,
      holdingFxSource: 'Verified fixture FX', holdingFxAt: '2026-11-19T16:00:00Z',
      costFxSource: 'Verified fixture FX', costFxAt: '2026-11-19T16:00:00Z', valuedAt: OBSERVED });
    expect(result).toMatchObject({ totalValue: 400, totalCost: 300, valueCoverage: 1, costCoverage: 1, marketCoverage: 1 });
    expect(mocks.fx).toHaveBeenCalledTimes(2);
    expect(mocks.fx.mock.calls).toEqual(expect.arrayContaining([['USD', 'KWD'], ['KWD', 'USD']]));
  });

  it('does not invent a previous valuation or original denomination from a newly available quote', async () => {
    const items = [item({ currency: null, current_value: null, purchase_total: null,
      valuation_last_updated_at: null, valuation_source: null })];
    const saved = snapshot(items, 'USD');
    expect(saved.positions[0]).toMatchObject({ value: null, baseValue: null, holdingCurrency: null, holdingValue: null, cost: null });
    const result = await withPortfolioMarketValues(items, saved);
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', value: { amount: 400, currency: 'USD' }, baseValue: 400,
      holdingCurrency: null, holdingValue: null, cost: null, baseCost: null,
      recordedValue: null, recordedBaseValue: null, recordedValuedAt: null, valuedAt: OBSERVED });
    expect(result).toMatchObject({ totalValue: 400, totalCost: null, valueCoverage: 1, costCoverage: 0, marketCoverage: 1 });
    expect(mocks.fx).not.toHaveBeenCalled();
  });

  it.each([
    { currency: 'KWD', values: [120, 180, 300, 36], costs: [30, 45, 270, 30], totalValue: 636, totalCost: 375, fxCalls: 1 },
    { currency: 'USD', values: [400, 600, 1000, 120], costs: [100, 150, 900, 100], totalValue: 2120, totalCost: 1250, fxCalls: 0 },
  ])('shares each required FX pair across valuation kinds and needs no FX for the same currency: $currency', async expected => {
    const items = [item(), item({ id: 'second-platform', quantity: 3, purchase_total: 150 }), land('USD'), item({ id: 'unresolved', quantity: null })];
    const result = await withPortfolioMarketValues(items, snapshot(items, expected.currency));
    expect(result.positions.map(position => position.baseValue)).toEqual(expected.values);
    expect(result.positions.map(position => position.baseCost)).toEqual(expected.costs);
    expect(result.positions.map(position => position.valuationKind)).toEqual(['market', 'market', 'manual', 'recorded']);
    expect(result).toMatchObject({ totalValue: expected.totalValue, totalCost: expected.totalCost,
      valueCoverage: 4, costCoverage: 4, marketCoverage: 2, marketEligible: 3 });
    expect(mocks.fx).toHaveBeenCalledTimes(expected.fxCalls);
    if (expected.fxCalls) expect(mocks.fx).toHaveBeenCalledWith('USD', 'KWD');
  });
});

describe('holding identity and units', () => {
  it('resolves Kuwait listings and the Arabic US-market label from public listing evidence', async () => {
    for (const symbol of ['KFH', 'IFA', 'BOUBYAN']) {
      const result = await portfolioMarketTarget(item({ symbol, provider_symbol: `${symbol}.KW`, market: 'بورصة الكويت', currency: 'KWD', native_currency: 'KWD', price_currency: 'KWD' }));
      expect(result.target?.asset).toMatchObject({ symbol: `${symbol}.KW`, mic: 'XKUW', providerSymbol: symbol, currency: 'KWD' });
      if (symbol === 'BOUBYAN') expect(result.target?.asset.name).toBe('Boubyan Bank');
    }
    expect((await portfolioMarketTarget(item())).target?.asset).toMatchObject({ symbol: 'AMD', region: 'US', currency: 'USD' });
  });

  it('does not guess an exchange, conflicting symbol, unknown quantity, or legacy LUNA chain', async () => {
    const bad = [item({ market: 'بورصة الكويت' }), item({ symbol: 'AMD', provider_symbol: 'NVDA' }), item({ quantity: null }),
      item({ type: 'crypto', symbol: 'LUNA', provider_symbol: 'LUNA', market: 'CCC' })];
    for (const holding of bad) expect((await portfolioMarketTarget(holding)).target).toBeUndefined();
    const result = await withPortfolioMarketValues(bad, snapshot(bad));
    expect(result.marketCoverage).toBe(0); expect(result.marketEligible).toBe(4);
    expect(mocks.quotes).not.toHaveBeenCalled(); expect(mocks.special).not.toHaveBeenCalled();
  });

  it('uses BTC/USD evidence, shares only its public quote, and recomputes each account quantity', async () => {
    mocks.special.mockResolvedValue(special('BTC/USD', 'BTCUSD', 'crypto'));
    const first = [item({ type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD', quantity: 2 })];
    const second = [item({ id: 'other-account-position', type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD', quantity: 5 })];
    const a = await withPortfolioMarketValues(first, snapshot(first));
    const b = await withPortfolioMarketValues(second, snapshot(second));
    expect(a.positions[0].baseValue).toBe(200); expect(b.positions[0].baseValue).toBe(500);
    expect(b.positions[0].id).toBe('other-account-position'); expect(mocks.special).toHaveBeenCalledTimes(1);
    expect(mocks.special.mock.calls[0][1].excludeProviders).toContain('finnhub');
    expect(mocks.quotes).not.toHaveBeenCalled();
  });

  it('rejects a USDT response for a saved USD crypto holding', async () => {
    mocks.special.mockResolvedValue(special('BTC/USD', 'BINANCE:BTCUSDT', 'crypto', 'finnhub'));
    const items = [item({ type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD' })];
    const result = await withPortfolioMarketValues(items, snapshot(items));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'recorded', baseValue: 120, valuedAt: OLD });
  });

  it('uses saved pure metal weight, never a coin count or a futures substitute', async () => {
    const holding = item({ type: 'silver', symbol: undefined, provider_symbol: undefined, metal_type: 'silver', quantity: 2,
      unit: 'lira', pure_metal_grams: 31.1034768 });
    mocks.special.mockResolvedValue(special('XAGUSD', 'XAG', 'commodity', 'gold_api'));
    const result = await withPortfolioMarketValues([holding], snapshot([holding]));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', baseValue: 100, quantity: 2 });
    const noWeight = item({ type: 'silver', metal_type: 'silver', quantity: 2, pure_metal_grams: null, grams: null });
    expect(await portfolioMarketTarget(noWeight)).toMatchObject({ eligible: true, issue: 'units_unverified' });
    __resetPortfolioQuoteCacheForTests();
    mocks.special.mockResolvedValue(special('XAGUSD', 'SI=F', 'commodity', 'fmp'));
    const future = await withPortfolioMarketValues([holding], snapshot([holding]));
    expect(future.positions[0]).toMatchObject({ valuationKind: 'recorded', baseValue: 120 });
  });

  it('bounds a slow provider and preserves the recorded portfolio', async () => {
    mocks.special.mockReturnValue(new Promise(() => {})); mocks.fx.mockReturnValue(new Promise(() => {}));
    const items = [item({ type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD' })];
    const pending = withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    await vi.advanceTimersByTimeAsync(9001);
    const result = await pending;
    expect(result.positions[0]).toMatchObject({ valuationKind: 'recorded', valuedAt: OLD });
    expect(result.marketCoverage).toBe(0);
    const background = mocks.after.mock.calls[0][0]();
    await vi.advanceTimersByTimeAsync(21000);
    await expect(background).resolves.toBeUndefined();
  });

  it('warms a late public quote after the response and reuses it without sharing holdings', async () => {
    let finishQuote!: (value: SfmMarketQuote) => void;
    mocks.special.mockReturnValue(new Promise<SfmMarketQuote>(resolve => { finishQuote = resolve; }));
    const first = [item({ type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD', quantity: 2 })];
    const response = withPortfolioMarketValues(first, snapshot(first));
    await vi.advanceTimersByTimeAsync(9001);
    expect((await response).positions[0]).toMatchObject({ valuationKind: 'recorded', baseValue: 120, valuedAt: OLD });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    const background = mocks.after.mock.calls[0][0]();
    finishQuote(special('BTC/USD', 'BTCUSD', 'crypto'));
    await background;
    const next = [item({ id: 'later-account', type: 'crypto', symbol: 'BTC', provider_symbol: 'BTC-USD', quantity: 5 })];
    const refreshed = await withPortfolioMarketValues(next, snapshot(next));
    expect(refreshed.positions[0]).toMatchObject({ id: 'later-account', valuationKind: 'market', baseValue: 500, quantity: 5, valuedAt: OBSERVED });
    expect(mocks.special).toHaveBeenCalledTimes(1);
  });

  it('requires exact FX pair evidence even when the rate and timestamp look valid', () => {
    expect(usablePortfolioFx(fx(), 'USD', 'KWD', NOW)).toBe(true);
    expect(usablePortfolioFx(fx({ identityVerified: false }), 'USD', 'KWD', NOW)).toBe(false);
    expect(usablePortfolioFx(fx(), 'USDT', 'KWD', NOW)).toBe(false);
  });
});
