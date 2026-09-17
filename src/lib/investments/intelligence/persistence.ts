import type { SupabaseClient } from '@supabase/supabase-js';
import type { ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';
import type { ValuationRangeResult } from './valuation-range';

type SnapshotDatabase = Pick<SupabaseClient, 'rpc'>;

export interface PersistValuationInput {
  userId: string;
  positionId: string;
  valuation: ValuationRangeResult;
  evidence: ValuationEvidence[];
  subjectAsset?: RealEstateAssetInput;
}

/** The caller must supply server-collected evidence, never a browser's claimed result. */
export async function persistValuationSnapshot(db: SnapshotDatabase, input: PersistValuationInput) {
  if (input.valuation.status !== 'VALUED') throw new Error('Only evidence-backed VALUED results may be persisted as valuation snapshots.');
  const ids = input.valuation.evidenceIds;
  if (ids.length < 2 || ids.length > 500 || new Set(ids).size !== ids.length) throw new Error('Snapshot evidence lineage is incomplete.');
  const evidenceById = new Map(input.evidence.map(item => [item.id, item]));
  if (evidenceById.size !== input.evidence.length) throw new Error('Snapshot evidence lineage contains duplicates.');
  const used = ids.map(id => evidenceById.get(id)).filter((item): item is ValuationEvidence => Boolean(item));
  if (used.length !== ids.length) throw new Error('Snapshot evidence lineage is incomplete.');
  const { lowValue, midpointValue, highValue, currency } = input.valuation;
  if (typeof lowValue !== 'number' || typeof midpointValue !== 'number' || typeof highValue !== 'number'
    || ![lowValue, midpointValue, highValue].every(Number.isFinite)
    || lowValue <= 0 || lowValue > midpointValue || midpointValue > highValue
    || !currency || !/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid valuation range.');

  // The database owns valued_at and verifies user/position ownership again.
  // A failure in any evidence or lineage insert rolls back the entire call.
  const result = await db.rpc('persist_investment_valuation_snapshot', {
    p_user_id: input.userId,
    p_position_id: input.positionId,
    p_valuation: input.valuation,
    p_evidence: used,
    p_subject_asset: input.subjectAsset ?? {},
  });
  if (result.error) throw new Error('Atomic snapshot persistence failed.');
  const payload: unknown = result.data;
  if (!payload || typeof payload !== 'object' || !('snapshotId' in payload) || typeof payload.snapshotId !== 'string'
    || !('evidenceCount' in payload) || payload.evidenceCount !== used.length) throw new Error('Snapshot persistence response is incomplete.');
  return { snapshotId: payload.snapshotId, evidenceCount: used.length };
}
