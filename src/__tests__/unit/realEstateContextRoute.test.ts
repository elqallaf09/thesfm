import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/investments/real-estate/context/route';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: vi.fn(), getUserFromBearerToken: vi.fn() }));
const userId = '22222222-2222-4222-8222-222222222222';
const investmentId = '11111111-1111-4111-8111-111111111111';
const positionId = '33333333-3333-4333-8333-333333333333';
type Result = { data: Record<string, unknown> | null; error: { message: string } | null };

function storage(results: Record<string, Result>) {
  const queries: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const from = vi.fn((table: string) => {
    const trace = { table, filters: [] as Array<[string, unknown]> };
    queries.push(trace);
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => { trace.filters.push([column, value]); return builder; }),
      maybeSingle: vi.fn(async () => results[table] ?? { data: null, error: null }),
    };
    return builder;
  });
  vi.mocked(createServerSupabaseAdmin).mockReturnValue({ from } as unknown as NonNullable<ReturnType<typeof createServerSupabaseAdmin>>);
  return { queries, from };
}

function request(query: string, authenticated = true) {
  return new NextRequest(`https://sfm.test/api/investments/real-estate/context?${query}`, {
    headers: authenticated ? { Authorization: 'Bearer test-session' } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUserFromBearerToken).mockResolvedValue({ id: userId } as Awaited<ReturnType<typeof getUserFromBearerToken>>);
});

describe('GET property context', () => {
  it('rejects unsigned requests before storage access', async () => {
    const response = await GET(request(`investmentId=${investmentId}`, false));
    expect(response.status).toBe(401);
    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('private, no-store');
  });

  it.each(['positionId=not-a-uuid', `investmentId=${investmentId}&positionId=${positionId}`, ''])('rejects invalid or ambiguous selectors: %s', async query => {
    expect((await GET(request(query))).status).toBe(400);
    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('does not expose a missing or foreign-owned canonical position', async () => {
    const db = storage({ investment_positions: { data: null, error: null } });
    const response = await GET(request(`positionId=${positionId}`));
    expect(response.status).toBe(404);
    expect(db.queries[0].filters).toContainEqual(['user_id', userId]);
    expect(db.queries[0].filters).toContainEqual(['id', positionId]);
  });

  it('keeps legacy-only records distinct from canonical positions', async () => {
    storage({ investment_items: { data: { id: investmentId, type: 'realEstate', name: 'Private plot', currency: 'KWD' }, error: null } });
    const response = await GET(request(`investmentId=${investmentId}`));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.context.positionId).toBeNull();
    expect(payload.context.migrationState).toBe('LEGACY_ONLY');
    expect(payload.context.asset.countryCode).toBe('');
  });

  it('uses owner filters for legacy, canonical and property-detail reads', async () => {
    const db = storage({
      investment_items: { data: { id: investmentId, type: 'realEstate' }, error: null },
      investment_positions: { data: { id: positionId, legacy_investment_item_id: investmentId, asset_type: 'REAL_ESTATE', display_name: 'Owned plot', migration_state: 'VERIFIED', country_code: 'BA', total_cost: '10000', purchase_currency: 'USD' }, error: null },
      investment_property_details: { data: { property_type: 'LAND', city: 'Sarajevo', land_area: '500', land_area_unit: 'M2' }, error: null },
    });
    const response = await GET(request(`investmentId=${investmentId}`));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.context.positionId).toBe(positionId);
    expect(payload.context.asset.landArea).toBe(500);
    for (const query of db.queries) expect(query.filters).toContainEqual(['user_id', userId]);
    expect(db.queries.find(query => query.table === 'investment_positions')?.filters).toContainEqual(['legacy_investment_item_id', investmentId]);
    expect(db.queries.find(query => query.table === 'investment_property_details')?.filters).toContainEqual(['position_id', positionId]);
  });

  it('rejects non-property records instead of routing them to the land analyst', async () => {
    storage({ investment_items: { data: { id: investmentId, type: 'stocks', asset_type: 'STOCK' }, error: null } });
    expect((await GET(request(`investmentId=${investmentId}`))).status).toBe(422);
  });

  it('reports storage failures without replacing them with empty asset facts', async () => {
    storage({ investment_positions: { data: null, error: { message: 'private SQL diagnostic' } } });
    const response = await GET(request(`positionId=${positionId}`));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private SQL diagnostic');
  });

  it('fails closed when authentication throws', async () => {
    vi.mocked(getUserFromBearerToken).mockRejectedValue(new Error('internal auth detail'));
    const response = await GET(request(`positionId=${positionId}`));
    expect(response.status).toBe(503);
    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('internal auth detail');
  });
});
