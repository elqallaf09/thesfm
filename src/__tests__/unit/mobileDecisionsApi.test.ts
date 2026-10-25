import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const userId = 'd911b7fc-2042-471c-a8a8-cb3be7755a23';
const decisionId = '8e7780b4-70a1-4ae5-b896-e20e18e6c29f';
const state = vi.hoisted(() => ({
  access: null as unknown, role: 'manager' as string | null, limited: false,
  rows: [] as Array<Record<string, unknown>>, writes: [] as Array<Record<string, unknown>>, calls: [] as Array<{ table: string; filters: Array<[string, unknown]>; op: string }>,
}));

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Cache-Control': 'private, no-store' } }); }
vi.mock('@/lib/server/mobileAccess', () => ({ mobileAccess: vi.fn(async () => state.access), mobileResponse: response }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => state.limited ? response({ ok: false, code: 'RATE_LIMITED' }, 429) : null }));

const sourceTables = new Set(['monthly_income_sources', 'expense_items', 'debts', 'savings_items', 'investment_items', 'financial_goals', 'projects', 'project_financial_models', 'zakat_calculations', 'zakat_assets', 'charity_commitments']);
function client() {
  return { from(table: string) {
    const call = { table, filters: [] as Array<[string, unknown]>, op: 'select' }; state.calls.push(call);
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; }, order: () => query,
      limit: () => query, insert: (values: Record<string, unknown>) => { call.op = 'insert'; state.writes.push(values); return query; }, delete: () => { call.op = 'delete'; return query; },
      maybeSingle: async () => {
        if (table === 'business_user_roles') return { data: state.role ? { role: state.role } : null, error: null };
        if (call.op === 'insert') return { data: { id: decisionId, ...state.writes.at(-1) }, error: null };
        if (call.op === 'delete') return { data: state.rows.some(row => row.id === decisionId && row.user_id === userId) ? { id: decisionId } : null, error: null };
        return { data: null, error: null };
      },
      then: (resolve: (value: unknown) => void) => Promise.resolve({ data: sourceTables.has(table) ? [] : state.rows, error: null }).then(resolve),
    };
    return query;
  } };
}
function request(method = 'GET', body?: unknown) { return new Request('https://sfm.example/api/mobile/business/decisions', { method, headers: { Authorization: 'Bearer verified-token' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }

beforeEach(() => { state.role = 'manager'; state.limited = false; state.rows = [{ id: decisionId, user_id: userId, decision_title: 'Own decision' }]; state.writes = []; state.calls = []; state.access = { userId, client: client() }; });

describe('mobile business decisions', () => {
  it('stops anonymous or MFA-gated requests before role and account tables', async () => {
    const { handleMobileBusinessDecisions } = await import('@/lib/server/mobileDecisions');
    state.access = { response: response({ ok: false, code: 'MFA_REQUIRED' }, 403) };
    expect((await handleMobileBusinessDecisions(request())).status).toBe(403);
    expect(state.calls).toEqual([]);
  });

  it('fails closed when the verified account has no business role', async () => {
    const { handleMobileBusinessDecisions } = await import('@/lib/server/mobileDecisions');
    state.role = null;
    expect((await handleMobileBusinessDecisions(request())).status).toBe(403);
    expect(state.calls.map(call => call.table)).toEqual(['business_user_roles']);
  });

  it('derives analysis from protected account rows and binds the saved decision to the verified user', async () => {
    const { handleMobileBusinessDecisions } = await import('@/lib/server/mobileDecisions');
    const result = await handleMobileBusinessDecisions(request('POST', { title: 'Buy equipment', decisionType: 'purchase', estimatedCost: 500, monthlyImpact: 20, expectedBenefit: 'Capacity', riskLevel: 'medium', currency: 'KWD', locale: 'en' }));
    expect(result.status).toBe(201);
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0]).toEqual(expect.objectContaining({ user_id: userId, decision_title: 'Buy equipment', estimated_cost: 500, currency: 'KWD' }));
    expect(state.writes[0]).not.toHaveProperty('service_role');
    expect(state.calls.filter(call => sourceTables.has(call.table)).every(call => call.filters.some(([key, value]) => key === 'user_id' && value === userId))).toBe(true);
  });

  it('rejects client ownership, invalid fields, employee writes, and non-manager deletes', async () => {
    const { handleMobileBusinessDecisions } = await import('@/lib/server/mobileDecisions');
    expect((await handleMobileBusinessDecisions(request('POST', { title: 'Nope', decisionType: 'purchase', estimatedCost: 1, monthlyImpact: 0, expectedBenefit: '', riskLevel: 'low', currency: 'KWD', user_id: 'other' }))).status).toBe(400);
    state.role = 'employee'; expect((await handleMobileBusinessDecisions(request('POST', { title: 'Nope', decisionType: 'purchase', estimatedCost: 1, monthlyImpact: 0, expectedBenefit: '', riskLevel: 'low', currency: 'KWD' }))).status).toBe(403);
    state.role = 'accountant'; expect((await handleMobileBusinessDecisions(request('DELETE', { id: decisionId }))).status).toBe(403);
  });

  it('scopes deletion to the manager account and uses private no-store responses', async () => {
    const { handleMobileBusinessDecisions } = await import('@/lib/server/mobileDecisions');
    const result = await handleMobileBusinessDecisions(request('DELETE', { id: decisionId }));
    expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toBe('private, no-store');
    const deletion = state.calls.at(-1)!; expect(deletion.filters).toContainEqual(['user_id', userId]); expect(deletion.filters).toContainEqual(['id', decisionId]);
  });

  it('keeps Expo, SwiftUI and Compose on the protected endpoint rather than a WebView', () => {
    expect(readFileSync('apps/expo-go/src/MobileDecisionsScreen.tsx', 'utf8')).toContain("'/api/mobile/business/decisions'");
    expect(readFileSync('ios-native/TheSFM/Core/Networking/MobileDecisionsView.swift', 'utf8')).toContain('"/api/mobile/business/decisions"');
    expect(readFileSync('ios-native/TheSFM.xcodeproj/project.pbxproj', 'utf8')).toContain('MobileDecisionsView.swift in Sources');
    expect(readFileSync('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt', 'utf8')).toContain('"/api/mobile/business/decisions"');
  });
});
