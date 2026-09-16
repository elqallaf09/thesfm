import 'server-only';
import { loadCrossWorkspaceEvidence } from './crossWorkspaceBrain.server';
import { buildEconomicIntelligenceReadiness } from './readiness';
import { loadReadinessConfirmations } from './readinessConfirmations.server';
import { buildEvidenceProvenance } from './evidenceProvenance';

export async function loadEvidenceProvenance(userId: string) {
  const [evidence, confirmations] = await Promise.all([
    loadCrossWorkspaceEvidence(userId),
    loadReadinessConfirmations(userId).catch(() => []),
  ]);
  const readiness = buildEconomicIntelligenceReadiness(evidence, confirmations);
  return buildEvidenceProvenance(evidence, readiness, evidence.recordCounts ?? {});
}
