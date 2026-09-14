import type { WorkspaceEvidence } from './crossWorkspaceBrain';
import type { EconomicIntelligenceReadiness, ReadinessWorkspace } from './readiness';

export type EvidenceSourceId =
  | 'monthly_income_sources'
  | 'expense_items'
  | 'debts'
  | 'savings_items'
  | 'investment_items'
  | 'market_watchlist'
  | 'market_price_alerts'
  | 'projects'
  | 'project_funding_readiness';

export type EvidenceProvenanceEntry = {
  workspace: ReadinessWorkspace;
  source: EvidenceSourceId;
  recordCount: number | null;
  asOf: string | null;
  ageDays: number | null;
  stale: boolean;
  veryStale: boolean;
  readinessScore: number;
};

export type EvidenceProvenance = {
  generatedAt: string;
  entries: EvidenceProvenanceEntry[];
};

type SourceCounts = Partial<Record<EvidenceSourceId, number>>;

function entry(
  workspace: ReadinessWorkspace,
  source: EvidenceSourceId,
  counts: SourceCounts,
  readiness: EconomicIntelligenceReadiness,
): EvidenceProvenanceEntry {
  const freshness = readiness.freshness[workspace];
  return {
    workspace,
    source,
    recordCount: typeof counts[source] === 'number' ? counts[source]! : null,
    asOf: freshness.asOf,
    ageDays: freshness.ageDays,
    stale: freshness.stale,
    veryStale: freshness.veryStale,
    readinessScore: readiness[workspace].score,
  };
}

export function buildEvidenceProvenance(
  _evidence: WorkspaceEvidence,
  readiness: EconomicIntelligenceReadiness,
  counts: SourceCounts = {},
  generatedAt = new Date(),
): EvidenceProvenance {
  return {
    generatedAt: generatedAt.toISOString(),
    entries: [
      entry('finance', 'monthly_income_sources', counts, readiness),
      entry('finance', 'expense_items', counts, readiness),
      entry('finance', 'debts', counts, readiness),
      entry('finance', 'savings_items', counts, readiness),
      entry('finance', 'investment_items', counts, readiness),
      entry('trader', 'market_watchlist', counts, readiness),
      entry('trader', 'market_price_alerts', counts, readiness),
      entry('business', 'projects', counts, readiness),
      entry('business', 'project_funding_readiness', counts, readiness),
    ],
  };
}
