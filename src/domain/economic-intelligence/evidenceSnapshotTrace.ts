import type { DailyPriorityAction } from './dailyPriority';
import type { EvidenceProvenance, EvidenceSourceId } from './evidenceProvenance';
import type { EconomicIntelligenceReadiness, ReadinessWorkspace } from './readiness';

export type EvidenceSnapshotTraceEntry = {
  workspace: ReadinessWorkspace;
  source: EvidenceSourceId;
  recordCount: number | null;
  asOf: string | null;
  ageDays: number | null;
  stale: boolean;
  veryStale: boolean;
};

export type EvidenceSnapshotTrace = {
  version: 1;
  capturedAt: string;
  priority: {
    code: string;
    severity: DailyPriorityAction['severity'];
    fingerprint: string;
    sources: ReadinessWorkspace[];
  } | null;
  readiness: {
    overall: number;
    finance: number;
    trader: number;
    business: number;
  };
  provenance: EvidenceSnapshotTraceEntry[];
};

export function buildEvidenceSnapshotTrace(
  priority: DailyPriorityAction | null,
  readiness: EconomicIntelligenceReadiness,
  provenance: EvidenceProvenance,
  capturedAt = new Date(),
): EvidenceSnapshotTrace {
  return {
    version: 1,
    capturedAt: capturedAt.toISOString(),
    priority: priority ? {
      code: priority.code,
      severity: priority.severity,
      fingerprint: priority.fingerprint,
      sources: priority.sources.slice() as ReadinessWorkspace[],
    } : null,
    readiness: {
      overall: readiness.overallScore,
      finance: readiness.finance.score,
      trader: readiness.trader.score,
      business: readiness.business.score,
    },
    provenance: provenance.entries.map(entry => ({
      workspace: entry.workspace,
      source: entry.source,
      recordCount: entry.recordCount,
      asOf: entry.asOf,
      ageDays: entry.ageDays,
      stale: entry.stale,
      veryStale: entry.veryStale,
    })),
  };
}

export function parseEvidenceSnapshotTrace(value: unknown): EvidenceSnapshotTrace | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<EvidenceSnapshotTrace>;
  if (candidate.version !== 1 || typeof candidate.capturedAt !== 'string') return null;
  if (!candidate.readiness || typeof candidate.readiness !== 'object') return null;
  if (!Array.isArray(candidate.provenance)) return null;
  return candidate as EvidenceSnapshotTrace;
}
