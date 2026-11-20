import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { normalizeInvestment, type DbInvestmentRow } from '@/lib/investments/investmentUtils';
import { portfolioNumber, recordedBaseValue, recordedHoldingValue, recordedValue } from '@/lib/investments/recordedPortfolio';
import { tvPortfolioSnapshot } from '@/lib/markets-tv/portfolio';

const mocks = vi.hoisted(() => ({ admin: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: mocks.limit }));
import { GET } from '@/app/api/tv/portfolio/route';

const row = (extra: Partial<DbInvestmentRow> = {}): DbInvestmentRow => ({ id: 'position-a', user_id: 'owner-a', name: 'Recorded position', type: 'stocks', amount: null, current_value: 120, purchase_total: 100, currency: 'USD', created_at: '2026-11-07T08:00:00Z', ...extra });
const secret = 'a'.repeat(64), otherSecret = 'b'.repeat(64);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const req = (token?: string, query = '') => new Request(`https://www.the-sfm.com/api/tv/portfolio${query}`, { headers: token ? { 'x-sfm-tv-token': token } : {} });
const queries: { table: string; filters: [string, unknown][]; range?: [number, number] }[] = [];
function database(rows: DbInvestmentRow[] = [row(), row({ id: 'private-b', user_id: 'owner-b', current_value: 99999 })], fail = false) {
  return { from(table: string) {
    const query: typeof queries[number] = { table, filters: [] }; queries.push(query);
    const source: Record<string, unknown>[] = table === 'investment_items' ? rows : table === 'profiles' ? [{ id: 'owner-a', preferred_currency: 'USD' }, { id: 'owner-b', preferred_currency: 'KWD' }] : [
      { id: 'device-a', user_id: 'owner-a', secret_hash: hash(secret), state: 'active', expires_at: '2099-01-01T00:00:00Z' },
      { id: 'device-b', user_id: 'owner-b', secret_hash: hash(otherSecret), state: 'active', expires_at: '2099-01-01T00:00:00Z' },
    ];
    const filtered = () => source.filter(item => query.filters.every(([key, value]) => item[key] === value));
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { query.filters.push([key, value]); return builder; },
      gt: () => builder,
      order: () => builder,
      maybeSingle: async () => ({ data: filtered()[0] ?? null, error: null }),
      range: async (first: number, last: number) => { query.range = [first, last]; return { data: fail ? null : filtered().slice(first, last + 1), error: fail ? { message: 'unavailable' } : null }; },
    }; return builder;
  } };
}
beforeEach(() => { vi.clearAllMocks(); queries.length = 0; mocks.limit.mockReturnValue(null); mocks.admin.mockReturnValue(database()); });
describe('the website and TV recorded portfolio calculations', () => {
  it('preserves missing values instead of converting null or invalid input to zero', () => {
    for (const value of [null, undefined, '', '  ', NaN, Infinity, true]) expect(portfolioNumber(value)).toBeNull();
    expect(portfolioNumber(0)).toBe(0);
    const unknown = normalizeInvestment(row({ amount: null, current_value: null, purchase_total: null }));
    expect(recordedValue(unknown)).toBeNull();
    const snapshot = tvPortfolioSnapshot([unknown], 'USD');
    expect(snapshot.totalValue).toBeNull();
    expect(snapshot.positions[0]).toMatchObject({ value: null, holdingCurrency: 'USD', holdingValue: null, cost: null });
  });
  it('never relabels native values as the reporting currency or uses stale conversion', () => {
    const item = normalizeInvestment(row({ user_currency: 'KWD', converted_market_value: 36.9, fx_source: 'stale', native_currency: 'USD' }));
    expect(recordedValue(item)).toEqual({ amount: 120, currency: 'USD' });
    expect(recordedBaseValue(item, 'KWD')).toBeNull();
    expect(recordedBaseValue(item, 'USD')).toBe(120);
  });
  it('counts only values in the chosen currency and explicitly reports partial coverage', () => {
    const snapshot = tvPortfolioSnapshot([normalizeInvestment(row()), normalizeInvestment(row({ id: 'kwd', currency: 'KWD', current_value: 30, purchase_total: 20 }))], 'USD');
    expect(snapshot).toMatchObject({ total: 2, totalValue: 120, totalCost: 100, valueCoverage: 1, costCoverage: 1 });
    expect(snapshot.allocation).toEqual([{ assetClass: 'stocks', amount: 120, count: 1 }]);
  });
  it('keeps original holding value and capital beside saved reporting-currency evidence without changing the website helper', () => {
    const item = normalizeInvestment(row({ user_currency: 'KWD', converted_market_value: 36, fx_source: 'recorded provider', native_currency: 'USD' }));
    expect(recordedValue(item)).toEqual({ amount: 36, currency: 'KWD' });
    expect(recordedHoldingValue(item)).toEqual({ amount: 120, currency: 'USD' });
    const snapshot = tvPortfolioSnapshot([item], 'KWD');
    expect(snapshot.positions[0]).toMatchObject({
      value: { amount: 120, currency: 'USD' }, holdingCurrency: 'USD',
      holdingValue: { amount: 120, currency: 'USD' }, cost: { amount: 100, currency: 'USD' },
      baseValue: 36, baseCost: null,
    });
    expect(snapshot).toMatchObject({ totalValue: 36, totalCost: null, valueCoverage: 1, costCoverage: 0 });
  });
  it('keeps native fallback in its own currency and does not reconstruct a missing holding value from saved FX', () => {
    const item = normalizeInvestment(row({
      currency: 'EUR', current_value: null, purchase_total: null,
      native_currency: 'USD', current_market_value: 200, user_currency: 'KWD',
      converted_market_value: 60, fx_rate_to_user_currency: 0.3, fx_source: 'recorded provider',
    }));
    expect(tvPortfolioSnapshot([item], 'KWD').positions[0]).toMatchObject({
      value: { amount: 200, currency: 'USD' }, holdingCurrency: 'EUR', holdingValue: null, cost: null, baseValue: 60,
    });
    const convertedOnly = { ...item, currentMarketValue: undefined, nativeMarketValue: undefined };
    expect(tvPortfolioSnapshot([convertedOnly], 'KWD').positions[0]).toMatchObject({
      value: { amount: 60, currency: 'KWD' }, holdingCurrency: 'EUR', holdingValue: null, cost: null,
    });
    expect(recordedHoldingValue({ ...convertedOnly, fxSource: 'stale cache' })).toBeNull();
  });
  it('retains USDT holdings without treating them as USD or inventing a USD total', () => {
    const item = { ...normalizeInvestment(row()), currency: 'USDT', nativeCurrency: 'USDT', priceCurrency: 'USDT' };
    const snapshot = tvPortfolioSnapshot([item], 'USD');
    expect(snapshot.positions[0]).toMatchObject({
      value: { amount: 120, currency: 'USDT' }, holdingCurrency: 'USDT',
      holdingValue: { amount: 120, currency: 'USDT' }, cost: { amount: 100, currency: 'USDT' },
      baseValue: null, baseCost: null,
    });
    expect(snapshot).toMatchObject({ totalValue: null, totalCost: null, valueCoverage: 0, costCoverage: 0 });
  });
  it('preserves zero amounts while refusing invalid currencies and negative or missing capital', () => {
    const zero = normalizeInvestment(row({ current_value: 0, purchase_total: 0 }));
    expect(tvPortfolioSnapshot([zero], 'USD').positions[0]).toMatchObject({
      value: { amount: 0, currency: 'USD' }, holdingValue: { amount: 0, currency: 'USD' }, cost: { amount: 0, currency: 'USD' },
    });
    const invalid = { ...zero, currency: 'not-a-currency', nativeCurrency: 'not-a-currency', priceCurrency: 'not-a-currency' };
    expect(tvPortfolioSnapshot([invalid], 'USD').positions[0]).toMatchObject({
      value: null, holdingCurrency: null, holdingValue: null, cost: null, baseValue: null, baseCost: null,
    });
    for (const purchaseTotal of [undefined, NaN, Infinity, -1]) {
      expect(tvPortfolioSnapshot([{ ...zero, purchaseTotal }], 'USD').positions[0].cost).toBeNull();
    }
  });
});
describe('private TV portfolio boundary', () => {
  it('keeps a raw USDT holding distinct from its USD reporting currency without a fabricated conversion', async () => {
    mocks.admin.mockReturnValue(database([row({ type: 'cash', currency: 'USDT', current_value: 120,
      purchase_total: 100, user_currency: 'USD', converted_market_value: 119, fx_source: 'Recorded FX',
      native_currency: null, price_currency: null })]));
    const data = await (await GET(req(secret, '?currency=USD'))).json();
    expect(data.positions[0]).toMatchObject({ value: { amount: 120, currency: 'USDT' },
      holdingCurrency: 'USDT', holdingValue: { amount: 120, currency: 'USDT' },
      cost: { amount: 100, currency: 'USDT' }, baseValue: null, baseCost: null, recordedBaseValue: 119 });
    expect(data).toMatchObject({ totalValue: null, totalCost: null, valueCoverage: 0, costCoverage: 0 });
  });
  it('rejects missing, malformed, revoked or unknown tokens before loading investments', async () => {
    for (const token of [undefined, 'not-a-device', 'c'.repeat(64)]) expect((await GET(req(token))).status).toBe(401);
    expect(queries.some(query => query.table === 'investment_items')).toBe(false);
  });
  it('resolves the owner exclusively from the paired device and projects only portfolio fields', async () => {
    const response = await GET(req(secret)); const data = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(data).toMatchObject({ currency: 'USD', total: 1, totalValue: 120 });
    expect(data.positions[0].id).toBe('position-a');
    for (const key of ['user_id', 'notes', 'ai_analysis', 'investment_snapshot', 'secret_hash']) expect(JSON.stringify(data)).not.toContain(key);
    expect(queries.filter(query => query.table === 'investment_items').every(query => query.filters.some(([key, value]) => key === 'user_id' && value === 'owner-a'))).toBe(true);
    const second = await (await GET(req(otherSecret, '?currency=USD'))).json();
    expect(second.totalValue).toBe(99999); expect(second.positions[0].id).toBe('private-b');
  });
  it('rejects owner selectors and malformed currencies without querying portfolio data', async () => {
    for (const query of ['?user_id=owner-b', '?currency=USD&owner=owner-b', '?currency=NaN', '?currency=usd', '?currency=']) expect((await GET(req(secret, query))).status).toBe(400);
    expect(queries.some(query => query.table === 'investment_items')).toBe(false);
  });
  it('keeps the owner constraint on all result pages instead of silently truncating the portfolio', async () => {
    mocks.admin.mockReturnValue(database(Array.from({ length: 501 }, (_, i) => row({ id: `row-${i}` }))));
    const data = await (await GET(req(secret))).json();
    expect(data.total).toBe(501); expect(data.totalValue).toBe(60120);
    expect(queries.filter(query => query.table === 'investment_items').map(query => query.range)).toEqual([[0, 499], [500, 999]]);
    expect(queries.filter(query => query.table === 'investment_items').every(query => query.filters.some(([key, value]) => key === 'user_id' && value === 'owner-a'))).toBe(true);
  });
  it('distinguishes an empty portfolio from a failed private read', async () => {
    mocks.admin.mockReturnValue(database([]));
    expect(await (await GET(req(secret))).json()).toMatchObject({ total: 0, positions: [], totalValue: null });
    mocks.admin.mockReturnValue(database([], true));
    const response = await GET(req(secret)); expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'PORTFOLIO_UNAVAILABLE' });
  });
});
