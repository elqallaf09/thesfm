import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { normalizeInvestment, type DbInvestmentRow } from '@/lib/investments/investmentUtils';
import { portfolioNumber, recordedBaseValue, recordedValue } from '@/lib/investments/recordedPortfolio';
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
    expect(tvPortfolioSnapshot([unknown], 'USD').totalValue).toBeNull();
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
});
describe('private TV portfolio boundary', () => {
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
