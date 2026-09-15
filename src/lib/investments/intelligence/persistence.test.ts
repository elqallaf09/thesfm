import { describe, expect, it, vi } from 'vitest';
import { persistValuationSnapshot } from './persistence';

const valuation = { status: 'VALUED' as const, currency: 'KWD', lowValue: 90000, midpointValue: 100000, highValue: 110000, lowPerM2: 900, midpointPerM2: 1000, highPerM2: 1100, confidence: 'HIGH' as const, reasons: ['official evidence'], evidenceIds: ['e1', 'e2'], methodologyVersion: '2.0.0' };
const evidence = ['e1', 'e2'].map((id, index) => ({ id, type: 'OFFICIAL_TRANSACTION' as const, authority: 'GOVERNMENT' as const, sourceName: `source-${id}`, retrievedAt: '2026-09-15T00:00:00Z', assetMatch: 'EXACT' as const, geographyMatch: 'EXACT' as const, currency: 'KWD', unitValue: 900 + index * 200, unitCode: 'M2' }));

describe('valuation snapshot persistence', () => {
  it('refuses incomplete evidence lineage before touching the database', async () => {
    const rpc = vi.fn();
    await expect(persistValuationSnapshot({ rpc }, { userId: 'u1', positionId: 'p1', valuation, evidence: evidence.slice(0, 1) })).rejects.toThrow('lineage is incomplete');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses non-valued results', async () => {
    const rpc = vi.fn();
    await expect(persistValuationSnapshot({ rpc }, { userId: 'u1', positionId: 'p1', valuation: { ...valuation, status: 'INSUFFICIENT_EVIDENCE' }, evidence })).rejects.toThrow('Only evidence-backed');
    expect(rpc).not.toHaveBeenCalled();
  });
});
