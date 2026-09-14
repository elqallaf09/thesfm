import type { EvidenceProvenance, EvidenceProvenanceEntry, EvidenceSourceId } from './evidenceProvenance';
import type { EvidenceSnapshotTrace, EvidenceSnapshotTraceEntry } from './evidenceSnapshotTrace';
import type { EconomicIntelligenceReadiness, ReadinessWorkspace } from './readiness';

export type EvidenceDriftDirection = 'improved' | 'degraded' | 'unchanged' | 'unavailable';

export type EvidenceReadinessDrift = {
  workspace: 'overall' | ReadinessWorkspace;
  historical: number | null;
  current: number | null;
  delta: number | null;
  direction: EvidenceDriftDirection;
};

export type EvidenceSourceDrift = {
  workspace: ReadinessWorkspace;
  source: EvidenceSourceId;
  historicalRecordCount: number | null;
  currentRecordCount: number | null;
  recordCountDelta: number | null;
  historicalAgeDays: number | null;
  currentAgeDays: number | null;
  historicalStale: boolean;
  currentStale: boolean;
  historicalVeryStale: boolean;
  currentVeryStale: boolean;
  direction: EvidenceDriftDirection;
};

export type HistoricalEvidenceDrift = {
  available: boolean;
  historicalCapturedAt: string | null;
  currentGeneratedAt: string;
  readiness: EvidenceReadinessDrift[];
  sources: EvidenceSourceDrift[];
  summary: {
    improved: number;
    degraded: number;
    unchanged: number;
    unavailable: number;
  };
  causalClaim: false;
};

function directionFromDelta(delta: number | null): EvidenceDriftDirection {
  if (delta === null) return 'unavailable';
  if (delta > 0) return 'improved';
  if (delta < 0) return 'degraded';
  return 'unchanged';
}

function readinessValue(readiness: EconomicIntelligenceReadiness, workspace: 'overall' | ReadinessWorkspace) {
  if (workspace === 'overall') return readiness.overallScore;
  return readiness[workspace].score;
}

function snapshotReadinessValue(snapshot: EvidenceSnapshotTrace, workspace: 'overall' | ReadinessWorkspace) {
  if (workspace === 'overall') return snapshot.readiness.overall;
  return snapshot.readiness[workspace];
}

function freshnessRank(entry: Pick<EvidenceSnapshotTraceEntry | EvidenceProvenanceEntry, 'stale' | 'veryStale'>) {
  if (entry.veryStale) return 0;
  if (entry.stale) return 1;
  return 2;
}

function compareSource(
  historical: EvidenceSnapshotTraceEntry,
  current: EvidenceProvenanceEntry | undefined,
): EvidenceSourceDrift {
  const recordCountDelta = historical.recordCount !== null && current?.recordCount !== null && current?.recordCount !== undefined
    ? current.recordCount - historical.recordCount
    : null;

  let direction: EvidenceDriftDirection = 'unavailable';
  if (current) {
    const historicalFreshness = freshnessRank(historical);
    const currentFreshness = freshnessRank(current);
    if (currentFreshness > historicalFreshness) direction = 'improved';
    else if (currentFreshness < historicalFreshness) direction = 'degraded';
    else if (recordCountDelta !== null && recordCountDelta > 0) direction = 'improved';
    else if (recordCountDelta !== null && recordCountDelta < 0) direction = 'degraded';
    else direction = 'unchanged';
  }

  return {
    workspace: historical.workspace,
    source: historical.source,
    historicalRecordCount: historical.recordCount,
    currentRecordCount: current?.recordCount ?? null,
    recordCountDelta,
    historicalAgeDays: historical.ageDays,
    currentAgeDays: current?.ageDays ?? null,
    historicalStale: historical.stale,
    currentStale: current?.stale ?? false,
    historicalVeryStale: historical.veryStale,
    currentVeryStale: current?.veryStale ?? false,
    direction,
  };
}

export function compareHistoricalEvidence(
  snapshot: EvidenceSnapshotTrace | null,
  currentReadiness: EconomicIntelligenceReadiness,
  currentProvenance: EvidenceProvenance,
): HistoricalEvidenceDrift {
  if (!snapshot) {
    return {
      available: false,
      historicalCapturedAt: null,
      currentGeneratedAt: currentProvenance.generatedAt,
      readiness: [],
      sources: [],
      summary: { improved: 0, degraded: 0, unchanged: 0, unavailable: 0 },
      causalClaim: false,
    };
  }

  const readiness = (['overall', 'finance', 'trader', 'business'] as const).map(workspace => {
    const historical = snapshotReadinessValue(snapshot, workspace);
    const current = readinessValue(currentReadiness, workspace);
    const delta = Number.isFinite(historical) && Number.isFinite(current) ? current - historical : null;
    return { workspace, historical, current, delta, direction: directionFromDelta(delta) };
  });

  const currentBySource = new Map(currentProvenance.entries.map(entry => [entry.source, entry]));
  const sources = snapshot.provenance.map(entry => compareSource(entry, currentBySource.get(entry.source)));
  const summary = { improved: 0, degraded: 0, unchanged: 0, unavailable: 0 };
  for (const source of sources) summary[source.direction] += 1;

  return {
    available: true,
    historicalCapturedAt: snapshot.capturedAt,
    currentGeneratedAt: currentProvenance.generatedAt,
    readiness,
    sources,
    summary,
    causalClaim: false,
  };
}
