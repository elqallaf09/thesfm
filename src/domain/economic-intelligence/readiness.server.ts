import 'server-only';
import { loadCrossWorkspaceEvidence } from './crossWorkspaceBrain.server';
import { buildEconomicIntelligenceReadiness } from './readiness';
import { loadReadinessConfirmations } from './readinessConfirmations.server';

export async function loadEconomicIntelligenceReadiness(userId: string) {
  const [evidence, confirmations] = await Promise.all([
    loadCrossWorkspaceEvidence(userId),
    loadReadinessConfirmations(userId),
  ]);
  return buildEconomicIntelligenceReadiness(evidence, confirmations);
}
