import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), inspect: vi.fn(), cookies: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/server/authSession', () => ({ inspectSessionSecurity: mocks.inspect, bearerToken: (r: Request) => r.headers.get('authorization') }));
import { GET as portfolio } from '@/app/api/tv/portfolio/route';
import { POST as approve, DELETE as revoke } from '@/app/api/tv/account/route';
import { PATCH as settings, GET as device } from '@/app/api/tv/device/route';
import { GET as poll } from '@/app/api/tv/pair/route';

const origin = 'https://www.the-sfm.com';
const token = 'a'.repeat(64), pairSecret = 'b'.repeat(64), code = 'ABCDEF123456';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const id = '00000000-0000-4000-8000-000000000001';
type Row = Record<string, unknown>;
let rows: Record<string, Row[]>;
let reads: string[];
let afterInvestments: (() => void) | undefined;
function request(path: string, method = 'GET', body?: Row, session?: string, secret = token) {
  return new Request(`${origin}/api/tv/${path}`, { method, headers: { origin, 'content-type': 'application/json', 'x-sfm-tv-token': secret, ...(session ? { authorization: session } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
// A mutable store: all predicates affect reads and writes, and select projects
// fields. This catches lifecycle regressions that permissive chained mocks miss.
function database() {
  return { from(table: string) {
    const predicates: ((row: Row) => boolean)[] = [];
    let patch: Row | undefined;
    let columns = '*';
    let bounds: [number, number] | undefined;
    const execute = () => {
      reads.push(table);
      let found = (rows[table] ?? []).filter(row => predicates.every(predicate => predicate(row)));
      if (bounds) found = found.slice(bounds[0], bounds[1] + 1);
      if (patch) found.forEach(row => Object.assign(row, patch));
      const data = found.map(row => columns === '*' ? { ...row } : Object.fromEntries(columns.split(',').map(key => [key, row[key]])));
      if (table === 'investment_items') afterInvestments?.();
      return { data, error: null };
    };
    const builder = {
      select: (value: string) => { columns = value; return builder; },
      update: (value: Row) => { patch = value; return builder; },
      eq: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return builder; },
      is: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return builder; },
      in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return builder; },
      gt: (key: string, value: string) => { predicates.push(row => String(row[key]) > value); return builder; },
      order: () => builder,
      limit: () => builder,
      range: (first: number, last: number) => { bounds = [first, last]; return builder; },
      maybeSingle: async () => { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
      then: <T,>(resolve: (value: ReturnType<typeof execute>) => T) => Promise.resolve(execute()).then(resolve),
    };
    return builder;
  } };
}
function active(consent: string | null = '2026-11-07T00:00:00Z'): Row {
  return { id, user_id: 'owner-a', name: 'TV', secret_hash: hash(token), code_hash: null, state: 'active', expires_at: '2099-01-01T00:00:00Z', portfolio_consent_at: consent, settings: {} };
}
function pending() {
  rows.markets_tv_devices = [{ ...active(null), user_id: null, state: 'pending', secret_hash: hash(pairSecret), code_hash: hash(code) }];
}
const privateReads = () => reads.filter(table => ['investment_items', 'profiles'].includes(table));
beforeEach(() => {
  vi.clearAllMocks(); reads = []; afterInvestments = undefined;
  rows = { markets_tv_devices: [active()], profiles: [{ id: 'owner-a', preferred_currency: 'USD' }], investment_items: [{ id: 'position-a', user_id: 'owner-a', name: 'Synthetic', type: 'stocks', current_value: 120, currency: 'USD' }] };
  mocks.admin.mockImplementation(database);
  mocks.cookies.mockResolvedValue({ get: () => undefined });
  mocks.inspect.mockImplementation(async (session: string) => ({ status: 'ok', userId: session, mfaRequirement: 'none' }));
});
describe('explicit per-device portfolio consent', () => {
  it('denies old tokens before any profile or investment read', async () => {
    rows.markets_tv_devices[0].portfolio_consent_at = null;
    const response = await portfolio(request('portfolio'));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'PORTFOLIO_CONSENT_REQUIRED' });
    expect(privateReads()).toEqual([]);
  });
  it.each(['revoked', 'pending', 'approved', 'expired'])('rejects a real %s credential before private reads', async state => {
    if (state === 'expired') rows.markets_tv_devices[0].expires_at = '2000-01-01T00:00:00Z';
    else rows.markets_tv_devices[0].state = state;
    expect((await portfolio(request('portfolio'))).status).toBe(401);
    expect(privateReads()).toEqual([]);
  });
  it.each([undefined, false, true])('grants only explicit true on fresh owner approval (%s)', async consent => {
    pending();
    const response = await approve(request('account', 'POST', { code, ...(consent === undefined ? {} : { portfolioConsent: consent }) }, 'owner-a'));
    expect(response.status).toBe(200);
    const row = rows.markets_tv_devices[0];
    expect(row.user_id).toBe('owner-a'); expect(row.code_hash).toBeNull();
    expect(Boolean(row.portfolio_consent_at)).toBe(consent === true);
    const activation = await (await poll(request('pair', 'GET', undefined, undefined, pairSecret))).json();
    expect(activation.state).toBe('active');
    expect((await portfolio(request('portfolio', 'GET', undefined, undefined, activation.token))).status).toBe(consent ? 200 : 403);
    expect((await portfolio(request('portfolio', 'GET', undefined, undefined, pairSecret))).status).toBe(401);
  });
  it.each([null, 'true', 1, {}, []])('rejects nonboolean consent %j without writes', async consent => {
    pending();
    expect((await approve(request('account', 'POST', { code, portfolioConsent: consent }, 'owner-a'))).status).toBe(400);
    expect(rows.markets_tv_devices[0].state).toBe('pending'); expect(reads).toEqual([]);
  });
  it('rejects unauthenticated grants and cannot reuse approval to grant an existing device', async () => {
    pending();
    expect((await approve(request('account', 'POST', { code, portfolioConsent: true }))).status).toBe(401);
    expect(rows.markets_tv_devices[0].portfolio_consent_at).toBeNull();
    await approve(request('account', 'POST', { code, portfolioConsent: false }, 'owner-a'));
    expect((await approve(request('account', 'POST', { code, portfolioConsent: true }, 'owner-b'))).status).toBe(400);
    expect(rows.markets_tv_devices[0].user_id).toBe('owner-a');
    expect(rows.markets_tv_devices[0].portfolio_consent_at).toBeNull();
  });
  it('does not let writable settings grant consent or leak credential/owner fields', async () => {
    rows.markets_tv_devices[0].portfolio_consent_at = null;
    expect((await settings(request('device', 'PATCH', { portfolioConsent: true, portfolio_consent_at: '2099-01-01', settings: { portfolioConsent: true, portfolio_consent_at: '2099-01-01' } }))).status).toBe(200);
    expect(rows.markets_tv_devices[0].portfolio_consent_at).toBeNull();
    expect((await portfolio(request('portfolio'))).status).toBe(403);
    const data = JSON.stringify(await (await device(request('device'))).json());
    for (const key of ['secret_hash', 'code_hash', 'user_id', 'portfolio_consent_at']) expect(data).not.toContain(key);
  });
  it('allows only the owner to revoke and immediately denies a revoked token', async () => {
    await revoke(request('account', 'DELETE', { id }, 'owner-b'));
    expect(rows.markets_tv_devices[0].state).toBe('active');
    await revoke(request('account', 'DELETE', { id }, 'owner-a'));
    expect((await portfolio(request('portfolio'))).status).toBe(401);
    expect(privateReads()).toEqual([]);
  });
  it.each(['revoked', 'expired', 'rotated', 'consent', 'owner'])('discards in-flight private results after %s changes', async change => {
    afterInvestments = () => {
      const row = rows.markets_tv_devices[0];
      if (change === 'revoked') row.state = 'revoked';
      if (change === 'expired') row.expires_at = '2000-01-01T00:00:00Z';
      if (change === 'rotated') row.secret_hash = hash(pairSecret);
      if (change === 'consent') row.portfolio_consent_at = null;
      if (change === 'owner') row.user_id = 'owner-b';
    };
    const response = await portfolio(request('portfolio'));
    expect(response.status).toBe(change === 'consent' ? 403 : 401);
    expect(await response.json()).toEqual({ code: change === 'consent' ? 'PORTFOLIO_CONSENT_REQUIRED' : 'UNAUTHORIZED' });
  });
});
