import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/investments/real-estate/snapshots/route';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';
import { persistValuationSnapshot } from '@/lib/investments/intelligence/persistence';
import type { RealEstateAnalystResult } from '@/lib/investments/intelligence/analyst';

vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: vi.fn(), getUserFromBearerToken: vi.fn() }));
vi.mock('@/lib/investments/intelligence/analyst', () => ({ analyzeRealEstateAsset: vi.fn() }));
vi.mock('@/lib/investments/intelligence/persistence', () => ({ persistValuationSnapshot: vi.fn() }));
const id = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const valuation = { status: 'VALUED' as const, currency: 'USD', lowValue: 9000, midpointValue: 10000, highValue: 11000, confidence: 'MEDIUM' as const, reasons: ['server evidence'], evidenceIds: ['server-1', 'server-2'], methodologyVersion: '2.0.0' };
const evidence = valuation.evidenceIds.map(id => ({ id, type: 'OFFICIAL_TRANSACTION' as const, authority: 'GOVERNMENT' as const, sourceName: 'Server test registry', observedOn: '2026-09-01', retrievedAt: '2026-09-15T00:00:00Z', assetMatch: 'EXACT' as const, geographyMatch: 'EXACT' as const, currency: 'USD', unitValue: 20, unitCode: 'M2' }));
const analysis: RealEstateAnalystResult = { status: 'VALUED', valuation, evidence, evidenceCount: 2, sourceFailures: [], message: 'Test-only analysis' };

function storage(position: Record<string, unknown> | null = { id, asset_type: 'REAL_ESTATE', migration_state: 'VERIFIED', country_code: 'BA' }) {
  const from = vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({ error: null, data: table === 'investment_positions' ? position : { property_type: 'LAND', city: 'Sarajevo', land_area: 500, land_area_unit: 'M2' } })),
    };
    return builder;
  });
  vi.mocked(createServerSupabaseAdmin).mockReturnValue({ from } as unknown as NonNullable<ReturnType<typeof createServerSupabaseAdmin>>);
}

function request(body: unknown, signed = true) {
  return new NextRequest('https://sfm.test/api/investments/real-estate/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signed ? { Authorization: 'Bearer test-session' } : {}) }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUserFromBearerToken).mockResolvedValue({ id: userId } as Awaited<ReturnType<typeof getUserFromBearerToken>>);
  vi.mocked(analyzeRealEstateAsset).mockResolvedValue(analysis);
  vi.mocked(persistValuationSnapshot).mockResolvedValue({ snapshotId: 'snapshot-id', evidenceCount: 2 });
  storage();
});

describe('server-authored property snapshots', () => {
  it('rejects unsigned requests', async () => {
    expect((await POST(request({ positionId: id, valuation }, false))).status).toBe(401);
    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('does not save a foreign or missing property', async () => {
    storage(null);
    expect((await POST(request({ positionId: id, valuation }))).status).toBe(404);
    expect(analyzeRealEstateAsset).not.toHaveBeenCalled();
    expect(persistValuationSnapshot).not.toHaveBeenCalled();
  });

  it('blocks a position whose migration has not been verified', async () => {
    storage({ id, asset_type: 'REAL_ESTATE', migration_state: 'PENDING_VERIFICATION' });
    expect((await POST(request({ positionId: id, valuation }))).status).toBe(409);
    expect(analyzeRealEstateAsset).not.toHaveBeenCalled();
  });

  it('never persists browser-supplied evidence, even when it claims to be official', async () => {
    const response = await POST(request({ positionId: id, valuation, evidence: [{ id: 'forged', type: 'OFFICIAL_TRANSACTION', unitValue: 999999 }] }));
    expect(response.status).toBe(201);
    expect(analyzeRealEstateAsset).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'BA', city: 'Sarajevo', landArea: 500 }), 'USD', []);
    const saved = vi.mocked(persistValuationSnapshot).mock.calls[0][1];
    expect(saved.userId).toBe(userId);
    expect(saved.evidence).toEqual(evidence);
    expect(saved.valuation).toEqual(valuation);
    expect(saved.subjectAsset?.countryCode).toBe('BA');
    expect(response.headers.get('cache-control')).toContain('private, no-store');
  });

  it('rejects a tampered or changed range instead of silently saving it', async () => {
    const response = await POST(request({ positionId: id, valuation: { ...valuation, highValue: 999999 } }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'VALUATION_CHANGED_REANALYZE' });
    expect(persistValuationSnapshot).not.toHaveBeenCalled();
  });

  it('refuses saving when trusted sources are unavailable', async () => {
    vi.mocked(analyzeRealEstateAsset).mockResolvedValue({ status: 'SOURCE_COVERAGE_UNAVAILABLE', valuation: null, evidence: [], evidenceCount: 0, sourceFailures: [], message: 'No configured source' });
    expect((await POST(request({ positionId: id, valuation }))).status).toBe(422);
    expect(persistValuationSnapshot).not.toHaveBeenCalled();
  });

  it('returns a private failure when atomic persistence fails', async () => {
    vi.mocked(persistValuationSnapshot).mockRejectedValue(new Error('private SQL error'));
    const response = await POST(request({ positionId: id, valuation }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private SQL error');
  });
});
