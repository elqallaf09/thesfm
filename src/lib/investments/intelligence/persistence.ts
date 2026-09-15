import type { ValuationEvidence } from './contracts';
import type { ValuationRangeResult } from './valuation-range';

type SupabaseLike = { from(table: string): any };

export interface PersistValuationInput {
  userId: string;
  positionId: string;
  valuation: ValuationRangeResult;
  evidence: ValuationEvidence[];
  valuedAt?: string;
}

export async function persistValuationSnapshot(db: SupabaseLike, input: PersistValuationInput) {
  if (input.valuation.status !== 'VALUED') throw new Error('Only evidence-backed VALUED results may be persisted as valuation snapshots.');
  const evidenceById = new Map(input.evidence.map((item) => [item.id, item]));
  const used = input.valuation.evidenceIds.map((id) => evidenceById.get(id)).filter((item): item is ValuationEvidence => Boolean(item));
  if (used.length !== input.valuation.evidenceIds.length) throw new Error('Snapshot evidence lineage is incomplete.');

  const evidenceRows = used.map((item) => ({
    user_id: input.userId,
    position_id: input.positionId,
    evidence_type: item.type,
    source_name: item.sourceName,
    source_url: item.sourceUrl ?? null,
    source_authority: item.authority,
    source_record_identifier: item.id,
    observed_on: item.observedOn ?? null,
    retrieved_at: item.retrievedAt,
    asset_match_quality: item.assetMatch,
    geography_match_quality: item.geographyMatch,
    value_amount: item.amount ?? null,
    value_currency: item.currency ?? null,
    unit_value: item.unitValue ?? null,
    unit_code: item.unitCode ?? null,
    limitations: item.limitations ?? null,
  }));

  const evidenceInsert = await db.from('investment_valuation_evidence').insert(evidenceRows).select('id,source_record_identifier');
  if (evidenceInsert.error) throw evidenceInsert.error;
  const persistedEvidence = (evidenceInsert.data ?? []) as Array<{ id: string; source_record_identifier: string }>;
  if (persistedEvidence.length !== used.length) throw new Error('Evidence persistence count mismatch.');

  const officialCount = used.filter((item) => ['GOVERNMENT','REGULATOR','EXCHANGE','OFFICIAL_STATISTICS'].includes(item.authority)).length;
  const freshest = used.map((item) => item.observedOn ?? item.retrievedAt).sort().at(-1) ?? null;
  const snapshotInsert = await db.from('investment_valuation_snapshots').insert({
    user_id: input.userId,
    position_id: input.positionId,
    valuation_kind: 'EVIDENCE_RANGE',
    currency: input.valuation.currency,
    low_value: input.valuation.lowValue,
    midpoint_value: input.valuation.midpointValue,
    high_value: input.valuation.highValue,
    confidence_level: input.valuation.confidence,
    confidence_reasons: input.valuation.reasons,
    evidence_count: used.length,
    official_evidence_count: officialCount,
    freshest_evidence_at: freshest,
    methodology_version: input.valuation.methodologyVersion,
    limitations: [],
    valued_at: input.valuedAt ?? new Date().toISOString(),
  }).select('id').single();
  if (snapshotInsert.error) throw snapshotInsert.error;
  const snapshotId = snapshotInsert.data?.id as string | undefined;
  if (!snapshotId) throw new Error('Snapshot persistence did not return an id.');

  const lineageRows = persistedEvidence.map((row) => ({ snapshot_id: snapshotId, evidence_id: row.id, user_id: input.userId, inclusion_reason: 'Used by deterministic valuation range engine.' }));
  const lineageInsert = await db.from('investment_snapshot_evidence').insert(lineageRows);
  if (lineageInsert.error) throw lineageInsert.error;

  return { snapshotId, evidenceCount: used.length };
}
