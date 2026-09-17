import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { persistValuationSnapshot } from '@/lib/investments/intelligence/persistence';

const valuation = { status: 'VALUED' as const, currency: 'USD', lowValue: 9000, midpointValue: 10000, highValue: 11000, confidence: 'MEDIUM' as const, reasons: ['test evidence'], evidenceIds: ['e1', 'e2'], methodologyVersion: '2.0.0' };
const evidence = ['e1', 'e2'].map(id => ({ id, type: 'OFFICIAL_TRANSACTION' as const, authority: 'GOVERNMENT' as const, sourceName: 'Test registry', observedOn: '2026-09-01', retrievedAt: '2026-09-15T00:00:00Z', assetMatch: 'EXACT' as const, geographyMatch: 'EXACT' as const, currency: 'USD', unitValue: 20, unitCode: 'M2' }));
const input = { userId: 'u1', positionId: 'p1', valuation, evidence, subjectAsset: { countryCode: 'BA', propertyType: 'LAND', city: 'Sarajevo', landArea: 500, landAreaUnit: 'M2' as const } };

describe('atomic property valuation persistence', () => {
  it('uses one RPC containing the exact used evidence and subject facts', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { snapshotId: 'snapshot-1', evidenceCount: 2 }, error: null });
    const result = await persistValuationSnapshot({ rpc }, input);
    expect(result).toEqual({ snapshotId: 'snapshot-1', evidenceCount: 2 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('persist_investment_valuation_snapshot', {
      p_user_id: 'u1', p_position_id: 'p1', p_valuation: valuation, p_evidence: evidence, p_subject_asset: input.subjectAsset,
    });
  });

  it('refuses incomplete or duplicated lineage before making database calls', async () => {
    const rpc = vi.fn();
    await expect(persistValuationSnapshot({ rpc }, { ...input, evidence: evidence.slice(0, 1) })).rejects.toThrow('lineage is incomplete');
    await expect(persistValuationSnapshot({ rpc }, { ...input, valuation: { ...valuation, evidenceIds: ['e1', 'e1'] } })).rejects.toThrow('lineage is incomplete');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not persist unavailable results or malformed ranges', async () => {
    const rpc = vi.fn();
    await expect(persistValuationSnapshot({ rpc }, { ...input, valuation: { ...valuation, status: 'INSUFFICIENT_EVIDENCE' } })).rejects.toThrow('Only evidence-backed');
    await expect(persistValuationSnapshot({ rpc }, { ...input, valuation: { ...valuation, midpointValue: 1000 } })).rejects.toThrow('Invalid valuation range');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not fall back to partial writes when the transaction fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'private SQL failure' } });
    await expect(persistValuationSnapshot({ rpc }, input)).rejects.toThrow('Atomic snapshot persistence failed');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('declares server-only execution and rechecks ownership in the transaction', () => {
    const sql = readFileSync('supabase/migrations/20260915234500_real_estate_atomic_snapshot.sql', 'utf8');
    expect(sql).toContain('security invoker');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('p.id = p_position_id and p.user_id = p_user_id');
    expect(sql).toContain("p.migration_state = 'VERIFIED'");
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
    for (const table of ['investment_valuation_evidence', 'investment_valuation_snapshots', 'investment_snapshot_evidence']) {
      expect(sql).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated;`);
    }
    expect(sql).not.toContain('exception when');
    expect(sql).toContain("max(nullif(e->>'observedOn', '')::date)");
  });
});
