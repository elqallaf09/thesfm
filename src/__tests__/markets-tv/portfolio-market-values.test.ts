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
const quote = (symbol = 'AMD', changes: Partial<TvQuote> = {}): TvQuote => ({ symbol, name: symbol, nameAr: symbol, price: 200, currency: 'USD',
  source: 'Verified fixture provider', observedAt: OBSERVED, receivedAt: new Date(NOW).toISOString(), status: 'delayed', delayType: 'delayed',
  exchange: 'NASDAQ', country: 'US', changePercent: null, ...changes });
const fx = (changes: Partial<FxRateResult> = {}): FxRateResult => ({ from: 'USD', to: 'KWD', rate: 0.3, available: true,
  stale: false, identityVerified: true, source: 'Verified fixture FX', lastUpdated: '2026-11-19T16:00:00Z', ...changes });
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
  mocks.quotes.mockResolvedValue([quote()]); mocks.fx.mockResolvedValue(fx()); mocks.special.mockResolvedValue(null);
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
    expect(result).toMatchObject({ totalValue: 120, totalCost: null, marketCoverage: 1 });
    expect(result.positions[0]).toMatchObject({ baseValue: 120, valuedAt: OBSERVED, fxAt: '2026-11-19T16:00:00Z', fxSource: 'Verified fixture FX' });
    expect(mocks.fx).toHaveBeenCalledWith('USD', 'KWD');
  });

  it.each<Partial<FxRateResult>>([
    { available: false }, { stale: true }, { identityVerified: false }, { from: 'EUR' }, { to: 'EUR' },
    { lastUpdated: null }, { lastUpdated: '2020-01-01T00:00:00Z' }, { lastUpdated: '2099-01-01T00:00:00Z' }, { rate: 0 },
  ])('does not mix a new market price with invalid FX evidence: %j', async changes => {
    mocks.fx.mockResolvedValue(fx(changes));
    const items = [item({ user_currency: 'KWD', converted_market_value: 36, fx_source: 'old saved FX' })];
    const result = await withPortfolioMarketValues(items, snapshot(items, 'KWD'));
    expect(result.positions[0]).toMatchObject({ valuationKind: 'market', value: { amount: 400, currency: 'USD' }, baseValue: null,
      valuationIssue: 'fx_unavailable', recordedBaseValue: 36 });
    expect(result).toMatchObject({ totalValue: null, valueCoverage: 0, marketCoverage: 0, marketEligible: 1 });
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
